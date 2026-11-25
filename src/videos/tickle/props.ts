// OWNER: props agent. See /home/user/lookmatch/TICKLE_BRIEF.md
// Hard props of "Why You Can't Tickle Yourself" (deterministic in (id, t); never frustum culled; glows on NOINK):
//   1. The 1990s TICKLE ROBOT rig on the lab table at RIG (shots 3-6), all driven by robotAt():
//      - HANDLE robot (screen right = BEAN's LEFT hand): a stubby 2-link grey arm on a plinth ending in a black rubber
//        joystick grip with a red ball top. BEAN moves it side to side: grip x = 0.045 sin(phase) * run.
//      - TICKLE robot (screen left = over BEAN's RIGHT palm): a tall 2-link grey arm (orange joints, cable conduits,
//        caution stripes) whose wrist carries a soft yellow FOAM TIP that strokes the palm, copying the handle
//        motion LATE by robotAt.delay (phase - 3.2 * delay): the delay is visible as a lag between the two arms.
//      - CONSOLE (screen right, behind): a putty-beige 1990s control box with a big chunky DELAY dial (knurled knob +
//        red needle over a 0 -> 0.3 s scale), RUN / TICKLE LEDs, a GO button, and a CRT on top showing
//        "DELAY: 0.20 s", live HAND vs TIP traces (the lag) and a TICKLE meter (robotAt.tickle); an orange beacon.
//      - coiled cords + cables between them; a "TOP SECRET" SHEET draped over everything that whips off (robotAt.sheet).
//   2. The little SLOW wind-up robot at HOME (shot 7, slowBotAt): a tin toy with googly eyes, a turning brass key and
//      a pink feather that creeps up to the armchair and tickles BEAN from "slow".
// Contracts for the cast are the exported functions below (world coordinates).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { HOME, RIG, V3, W, robotAt, slowBotAt, smooth, clamp01, glide } from "./story";

const TAU = Math.PI * 2;
const DEBUG_CAM = false; // TEMP: props-only framing for stills (must be false when reporting)
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
const MONO = "'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', monospace";
const add = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const R = (x: number, y: number, z: number): V3 => add(RIG, x, y, z); // rig-local -> world (RIG = table top centre)

// ============================== public contracts ==============================
/** The lab table top (sets) must cover at least this rig-local footprint (x0..x1, z0..z1 m around RIG, top y 0.78). */
export const RIG_TABLE = { x0: -0.9, x1: 0.86, z0: -0.45, z1: 0.44 };
/** BEAN seated on the stool at LAB+(0,0,0.55); his card plane is z = RIG.z + 0.55. Hands sit at table height. */
const PALM_L: V3 = [-0.36, 0.07, 0.55];   // right palm centre (palm up), rig-local -> world y 0.85
const GRIP_L: V3 = [0.34, 0.11, 0.5];     // joystick grip centre at rest, rig-local -> world y 0.89
const TB: V3 = [-0.7, 0, 0.3], HB: V3 = [0.6, 0, 0.34]; // tickle robot / handle robot plinth centres (rig-local)
const TL1 = 0.33, TL2 = 0.31, HL1 = 0.2, HL2 = 0.2;   // arm link lengths
const HAND_AMP = 0.045, TIP_AMP = 0.042, OMEGA = 3.2; // OMEGA = d(robotAt.phase)/dt
const handleDX = (id: number, t: number) => { const r = robotAt(id, t); return HAND_AMP * Math.sin(r.phase) * r.run; };
/** BEAN's LEFT hand: the joystick grip centre (world). Moves side to side with robotAt.run/phase (shots 3-6). */
export const handlePos = (id: number, t: number): V3 => { const r = robotAt(id, t); return R(GRIP_L[0] + handleDX(id, t), GRIP_L[1], GRIP_L[2] + 0.008 * Math.sin(2 * r.phase) * r.run); };
/** BEAN's RIGHT palm centre (world, palm up, static). The foam tip strokes along x on top of it. */
export const palmPos = (_id = 4, _t = 0): V3 => R(PALM_L[0], PALM_L[1], PALM_L[2]);
/** foam tip centre (world): rides 0.032 m above the palm, 0.03 m in front of BEAN's card plane, lagging the handle by
 *  robotAt.delay; lifted 0.07 m while the robot is idle. contact 0..1 = touching the palm. */
export const foamTipAt = (id: number, t: number): { pos: V3; contact: number; dx: number } => {
  const r = robotAt(id, t), ph = r.phase - OMEGA * r.delay;
  const dx = TIP_AMP * Math.sin(ph) * r.run, lift = 0.07 * (1 - r.run);
  return { pos: R(PALM_L[0] + dx, PALM_L[1] + 0.032 + lift, PALM_L[2] + 0.03 + (id === 4 ? 0.14 : 0)), contact: r.run, dx }; // QA2: shot 4 +0.14 (BEAN's card came forward)
};
export const foamTipPos = (id: number, t: number): V3 => foamTipAt(id, t).pos;
/** CONSOLE (rig-local origin on the table, yaw) and the DELAY dial: knob front centre (world), its facing normal,
 *  and the needle angle (rad clockwise from up; -120 deg = 0 s, +120 deg = 0.3 s). A scientist's hand goes at pos. */
const CON_L: V3 = [0.58, 0.2, -0.22], CON_YAW = -0.24; // the console stands on a 0.2 m beige PC case
const DIAL_C: [number, number] = [-0.035, 0.135]; // dial centre on the console face (x, y), face at z = 0.15
const conToRig = (x: number, y: number, z: number): V3 => [CON_L[0] + Math.cos(CON_YAW) * x + Math.sin(CON_YAW) * z, CON_L[1] + y, CON_L[2] - Math.sin(CON_YAW) * x + Math.cos(CON_YAW) * z];
export const dialAngle = (delay: number) => THREE.MathUtils.degToRad(-120 + 240 * clamp01(delay / 0.3));
export const dialPos = (id = 4, t = 0): { pos: V3; normal: V3; angle: number } => {
  const p = conToRig(DIAL_C[0], DIAL_C[1], 0.205);
  return { pos: R(p[0], p[1], p[2]), normal: [Math.sin(CON_YAW), 0, Math.cos(CON_YAW)], angle: dialAngle(robotAt(id, t).delay) };
};
/** CRT screen centre (world) */
export const crtPos = (): V3 => { const p = conToRig(0, 0.452, 0.14); return R(p[0], p[1], p[2]); };

// ---------------- the sheet ----------------
const SX0 = -0.88, SX1 = 0.84, SZ0 = -0.42, SZ1 = 0.64, SNX = 56, SNZ = 40;
// QA2: a readable flutter-off: yanked up + whipped off screen-LEFT over ~772-788 (robot clear by "robot" 783); the sheet
// folds into the gap between the scientists (z -0.5) and BEAN (z 0.55) so it never cuts through a card
const sheetS = (id: number, t: number) => (id === 3 ? clamp01((t - (W.robot - 0.37)) / 0.58) : id > 3 ? 1 : 0);
const sheetLift = (s: number, v: number) => { const e = smooth(clamp01((s - 0.2 * v) / (1 - 0.2 * v))); return { e, dy: 1.25 * (1 - (1 - e) ** 2), dz: 0, dx: -0.1 * e - 2.2 * e * e * e }; };
/** the two BACK corners of the sheet (world): scientists standing behind the table grab these (shot 3) */
export const sheetCorners = (id: number, t: number): [V3, V3] => {
  const s = sheetS(id, t), L = sheetLift(s, 0);
  return [R(SX0 + L.dx, 0.01 + L.dy, SZ0 + 0.335 * L.e), R(SX1 + L.dx, 0.01 + L.dy, SZ0 + 0.335 * L.e)];
};

// ---------------- the little slow robot (HOME, shot 7) ----------------
const BOT_S = 1.3; // toy scale: ~0.33 m to the antenna tip
const BOT_A = add(HOME, -0.66, 0, 0.44), BOT_B = add(HOME, -1.12, 0, 0.4);
const botPose = (id: number, t: number) => {
  const s = slowBotAt(id, t);
  const walkPh = t * 7.0;
  const c = s.creep;
  const pos: V3 = [lerp(BOT_A[0], BOT_B[0], c), 0, lerp(BOT_A[2], BOT_B[2], c)];
  const walking = (1 - smooth((s.creep - 0.9) / 0.1)) * (id === 7 ? 1 : 0);
  const yaw = lerp(-Math.PI / 2 - 0.08, -1.22, smooth(s.tickle));
  const arm = lerp(0.12, 2.05, glide(s.tickle)), wig = s.tickle * (0.32 * Math.sin(t * 26) + 0.12 * Math.sin(t * 41 + 1));
  return { show: id === 7, pos, yaw, walkPh, walking, arm, wig, tickle: s.tickle };
};
const _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _v = new THREE.Vector3();
const FEATHER_LEN = 0.2, ARM_LEN = 0.062, SHOULDER: V3 = [0.068, 0.135, 0];
const featherTipOf = (P: ReturnType<typeof botPose>): V3 => {
  _m.makeTranslation(P.pos[0], P.pos[1], P.pos[2]).multiply(_m2.makeRotationY(P.yaw)).multiply(_m2.makeScale(BOT_S, BOT_S, BOT_S))
    .multiply(_m2.makeTranslation(SHOULDER[0], SHOULDER[1], SHOULDER[2])).multiply(_m2.makeRotationX(-P.arm))
    .multiply(_m2.makeTranslation(0, -ARM_LEN, 0)).multiply(_m2.makeRotationFromEuler(new THREE.Euler(-0.55 + P.wig * 0.5, 0, P.wig)));
  _v.set(0, -FEATHER_LEN, 0).applyMatrix4(_m);
  return [_v.x, _v.y, _v.z];
};
/** the little slow robot (world): feet position, yaw (its forward = (sin yaw, 0, cos yaw)), feather tip; tickle 0..1.
 *  It walks HOME+(-0.66,0,0.44) -> HOME+(-1.12,0,0.40) toward the armchair, then raises the feather to ~SLOW_TARGET. */
export const slowBotPos = (id: number, t: number): { show: boolean; pos: V3; yaw: number; featherTip: V3; tickle: number } => {
  const P = botPose(id, t);
  return { show: P.show, pos: P.pos, yaw: P.yaw, featherTip: featherTipOf(P), tickle: P.tickle };
};
/** where the feather ends up tickling (world, BEAN's dangling foot/shin in the armchair should be here) */
export const SLOW_TARGET: V3 = (() => { const P = botPose(7, 100); P.wig = 0; return featherTipOf(P); })();

// ============================== materials + textures ==============================
const lamb = (col: THREE.ColorRepresentation, map: THREE.Texture | null = null) => twoTone(new THREE.MeshLambertMaterial({ color: col, map }));
const phong = (col: THREE.ColorRepresentation, map: THREE.Texture | null, spec: THREE.ColorRepresentation, sh: number) => twoTone(new THREE.MeshPhongMaterial({ color: col, map, specular: spec, shininess: sh }));
const strip = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k); return n; };
const rbox = (w: number, h: number, d: number, r: number, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
const cylY = (r: number, h: number, n = 24, rTop = r) => new THREE.CylinderGeometry(rTop, r, h, n);
const cylX = (r: number, h: number, n = 24) => new THREE.CylinderGeometry(r, r, h, n).rotateZ(Math.PI / 2);
const cylZ = (r: number, h: number, n = 24) => new THREE.CylinderGeometry(r, r, h, n).rotateX(Math.PI / 2);
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number) => g.translate(x, y, z);
const glowTex = () => ctex("tiGlow", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const stripeTex = () => ctex("tiStripe", 512, 128, (g) => {
  g.fillStyle = "#ffc42a"; g.fillRect(0, 0, 512, 128);
  g.fillStyle = "#1c1a20";
  for (let x = -128; x < 640; x += 64) { g.beginPath(); g.moveTo(x, 128); g.lineTo(x + 32, 128); g.lineTo(x + 160, 0); g.lineTo(x + 128, 0); g.fill(); }
});
const labelTex = () => ctex("tiBotLabel", 1024, 176, (g) => {
  g.fillStyle = "#ffc42a"; g.fillRect(0, 0, 1024, 176);
  g.fillStyle = "#1c1a20";
  for (let x = -176; x < 1100; x += 88) { if (x > 150 && x < 790) continue; g.beginPath(); g.moveTo(x, 176); g.lineTo(x + 44, 176); g.lineTo(x + 220, 0); g.lineTo(x + 176, 0); g.fill(); }
  g.fillStyle = "#1c1a20"; g.beginPath(); g.roundRect(196, 18, 632, 140, 18); g.fill();
  g.fillStyle = "#ffe9a8"; g.font = `900 92px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TICKLE ROBOT", 512, 92);
});
const beigeTex = () => ctex("tiBeige", 512, 512, (g, r) => {
  g.fillStyle = "#ece0c2"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,100,70,0.07)" : "rgba(255,255,255,0.12)"; g.fillRect(r() * 512, r() * 512, 2, 2); }
});
const foamTex = () => ctex("tiFoam", 512, 256, (g, r) => {
  g.fillStyle = "#ffd94a"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 256, s = 2 + r() * 5; g.fillStyle = r() < 0.6 ? "rgba(200,140,20,0.35)" : "rgba(255,250,200,0.6)"; g.beginPath(); g.ellipse(x, y, s, s * 0.8, 0, 0, TAU); g.fill(); }
});
const metalTex = () => ctex("tiMetal", 256, 512, (g, r) => {
  g.fillStyle = "#a9b2bd"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 260; i++) { g.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.12)" : "rgba(40,50,60,0.08)"; g.lineWidth = 1 + r() * 2; const x = r() * 256; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, 512); g.stroke(); }
  g.fillStyle = "#6f7782"; for (const y of [26, 486]) for (const x of [40, 216]) { g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
  g.fillStyle = "rgba(255,255,255,0.5)"; for (const y of [24, 484]) for (const x of [38, 214]) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
});
const sheetTex = () => ctex("tiSheet", 1024, 768, (g, r) => {
  g.fillStyle = "#f3efe6"; g.fillRect(0, 0, 1024, 768);
  for (let y = 0; y < 768; y += 3) { g.fillStyle = `rgba(150,140,130,${0.03 + r() * 0.03})`; g.fillRect(0, y, 1024, 1); }
  g.fillStyle = "#9fc0e0"; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 742, 1024, 26); g.fillRect(0, 0, 26, 768); g.fillRect(998, 0, 26, 768);
  g.save(); g.translate(512, 400); g.rotate(-0.12);
  g.strokeStyle = "#d8352c"; g.lineWidth = 16; g.beginPath(); g.roundRect(-330, -110, 660, 220, 22); g.stroke();
  g.fillStyle = "#d8352c"; g.font = `900 132px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TOP SECRET", 0, -14);
  g.font = `800 40px ${FONT}`; g.fillText("PROJECT: TICKLE", 0, 74);
  g.restore();
  g.fillStyle = "#f3efe6"; // worn stamp
  for (let i = 0; i < 500; i++) { g.globalAlpha = r() * 0.5; g.fillRect(180 + r() * 680, 240 + r() * 320, 3 + r() * 6, 2 + r() * 4); }
  g.globalAlpha = 1;
});
/** the DELAY dial faceplate: 0.36 x 0.26 m, dial centre at DIAL_C */
const FP_W = 0.36, FP_H = 0.26, FP_Y = 0.15, FPX = 1024, FPY = 740;
const fpPx = (x: number, y: number): [number, number] => [((x + FP_W / 2) / FP_W) * FPX, ((FP_Y + FP_H / 2 - y) / FP_H) * FPY];
const faceTex = () => ctex("tiFace", FPX, FPY, (g) => {
  const k = FPX / FP_W;
  g.fillStyle = "#2c3038"; g.beginPath(); g.roundRect(0, 0, FPX, FPY, 40); g.fill();
  g.strokeStyle = "#5c6370"; g.lineWidth = 10; g.beginPath(); g.roundRect(14, 14, FPX - 28, FPY - 28, 30); g.stroke();
  for (const [x, y] of [[44, 44], [FPX - 44, 44], [44, FPY - 44], [FPX - 44, FPY - 44]]) { g.fillStyle = "#9aa2ae"; g.beginPath(); g.arc(x, y, 13, 0, TAU); g.fill(); g.strokeStyle = "#454b56"; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.stroke(); }
  const [cx, cy] = fpPx(DIAL_C[0], DIAL_C[1]);
  const ang = (d: number) => dialAngle(d); // clockwise from up
  const P = (a: number, r: number): [number, number] => [cx + Math.sin(a) * r * k, cy - Math.cos(a) * r * k];
  // coloured band: calm green -> sunny yellow -> hot pink (more delay = more tickle)
  const N = 60;
  for (let i = 0; i < N; i++) {
    const u0 = i / N, u1 = (i + 1.2) / N, col = new THREE.Color("#3ed17a").lerp(new THREE.Color("#ffd23a"), clamp01(u0 * 2)).lerp(new THREE.Color("#ff3d7a"), clamp01(u0 * 2 - 1));
    g.strokeStyle = "#" + col.getHexString(); g.lineWidth = 0.014 * k;
    g.beginPath(); g.arc(cx, cy, 0.108 * k, ang(u0 * 0.3) - Math.PI / 2, ang(Math.min(1, u1) * 0.3) - Math.PI / 2); g.stroke();
  }
  g.strokeStyle = "#f4f1ea"; g.lineCap = "round";
  for (let i = 0; i <= 12; i++) {
    const d = i * 0.025, big = i % 4 === 0, a = ang(d), [x0, y0] = P(a, big ? 0.088 : 0.094), [x1, y1] = P(a, 0.1);
    g.lineWidth = big ? 12 : 6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.fillStyle = "#f4f1ea"; g.font = `900 50px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  ["0", "0.1", "0.2", "0.3"].forEach((s, i) => { const [x, y] = P(ang(i * 0.1), 0.0735); g.fillText(s, x, y); });
  g.font = `900 66px ${FONT}`; g.fillStyle = "#ffd23a"; g.fillText("DELAY", cx, cy + 0.085 * k);
  g.font = `800 30px ${FONT}`; g.fillStyle = "#c9ced6"; g.fillText("SECONDS", cx, cy + 0.111 * k);
  // right column labels
  g.textAlign = "left"; g.font = `800 34px ${FONT}`; g.fillStyle = "#e9edf2";
  const [lx, ly1] = fpPx(0.145, 0.222), [, ly2] = fpPx(0.145, 0.172), [bx, by] = fpPx(0.128, 0.075);
  g.fillText("RUN", lx, ly1); g.fillText("TICKLE", lx - 4, ly2 + 4);
  g.textAlign = "center"; g.font = `900 36px ${FONT}`; g.fillStyle = "#ffffff"; g.fillText("GO", bx, by + 0.042 * k);
  g.strokeStyle = "#e9edf2"; g.lineWidth = 4; g.beginPath(); g.arc(bx, by, 0.033 * k, 0, TAU); g.stroke();
});
const noteTex = () => ctex("tiNote", 256, 256, (g) => {
  g.fillStyle = "#ffe866"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(0,0,0,0.06)"; g.fillRect(0, 0, 256, 40);
  g.strokeStyle = "#2a3a8a"; g.lineWidth = 9; g.lineCap = "round";
  g.beginPath(); g.arc(128, 118, 62, 0, TAU); g.stroke();
  g.fillStyle = "#2a3a8a"; g.beginPath(); g.arc(106, 104, 9, 0, TAU); g.arc(150, 104, 9, 0, TAU); g.fill();
  g.beginPath(); g.arc(128, 122, 36, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.font = `italic 800 40px ${FONT}`; g.textAlign = "center"; g.fillText("0.2 s!", 128, 222);
});
const brandTex = () => ctex("tiBrand", 512, 64, (g) => {
  g.fillStyle = "#d9cdb0"; g.fillRect(0, 0, 512, 64);
  g.fillStyle = "#5a5040"; g.font = `900 38px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TICKLE-TRON  90", 256, 34);
});
/** 1990s beige PC case front: 0.42 x 0.16 m */
const pcTex = () => ctex("tiPC", 1024, 390, (g, r) => {
  g.fillStyle = "#e6d9b9"; g.fillRect(0, 0, 1024, 390);
  for (let i = 0; i < 1500; i++) { g.fillStyle = r() < 0.5 ? "rgba(120,100,70,0.06)" : "rgba(255,255,255,0.1)"; g.fillRect(r() * 1024, r() * 390, 2, 2); }
  const bay = (x: number, y: number, w: number, h: number) => { g.fillStyle = "#d4c6a4"; g.fillRect(x, y, w, h); g.strokeStyle = "#a8997a"; g.lineWidth = 4; g.strokeRect(x, y, w, h); };
  bay(60, 50, 420, 110); g.fillStyle = "#2a2620"; g.fillRect(110, 96, 300, 16); g.fillStyle = "#8a7c60"; g.fillRect(420, 120, 40, 22);
  bay(60, 200, 420, 130); g.fillStyle = "#3a352c"; g.fillRect(90, 255, 360, 22);
  g.fillStyle = "#2a2620"; g.beginPath(); g.roundRect(600, 60, 220, 90, 10); g.fill();
  g.fillStyle = "#ff4a2a"; g.font = "800 66px " + MONO; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("66", 710, 108);
  g.fillStyle = "#4a4436"; g.font = "800 30px " + FONT; g.fillText("TURBO", 710, 185);
  g.fillStyle = "#3be36a"; g.beginPath(); g.arc(880, 108, 12, 0, TAU); g.fill();
  g.fillStyle = "#cbbd9a"; g.beginPath(); g.roundRect(600, 230, 130, 90, 14); g.fill(); g.strokeStyle = "#a8997a"; g.lineWidth = 5; g.stroke();
  g.fillStyle = "#4a4436"; g.font = "800 26px " + FONT; g.fillText("POWER", 665, 345);
  for (let i = 0; i < 6; i++) { g.fillStyle = "#c2b392"; g.fillRect(780, 230 + i * 16, 190, 8); }
});
// ---- slow bot textures ----
const chestTex = () => ctex("tiChest", 256, 256, (g) => {
  g.fillStyle = "#fff1d6"; g.beginPath(); g.roundRect(0, 0, 256, 256, 40); g.fill();
  g.strokeStyle = "#b8322a"; g.lineWidth = 10; g.beginPath(); g.roundRect(10, 10, 236, 236, 34); g.stroke();
  g.fillStyle = "#ff5a8a"; g.beginPath(); g.moveTo(128, 178); g.bezierCurveTo(40, 120, 70, 50, 128, 92); g.bezierCurveTo(186, 50, 216, 120, 128, 178); g.fill();
  g.fillStyle = "#3a2a2a"; g.font = `900 40px ${FONT}`; g.textAlign = "center"; g.fillText("SLOW", 128, 232);
  for (const [x, y] of [[34, 34], [222, 34]]) { g.fillStyle = "#c9a24a"; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); }
});
const mouthTex = () => ctex("tiBotMouth", 256, 128, (g) => {
  g.fillStyle = "#fde3c8"; g.fillRect(0, 0, 256, 128);
  g.fillStyle = "#2a2230"; g.beginPath(); g.moveTo(30, 30); g.quadraticCurveTo(128, 150, 226, 30); g.quadraticCurveTo(128, 80, 30, 30); g.fill();
  g.fillStyle = "#ff7aa0"; g.beginPath(); g.ellipse(128, 76, 30, 12, 0, 0, TAU); g.fill();
});
const tinTex = () => ctex("tiTin", 256, 256, (g, r) => {
  g.fillStyle = "#e8452f"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#ffcf3a"; g.fillRect(0, 0, 256, 18); g.fillRect(0, 238, 256, 18);
  for (let i = 0; i < 14; i++) { g.fillStyle = "#ffe8a0"; g.beginPath(); g.arc(9 + i * 18.3, 9, 4, 0, TAU); g.arc(9 + i * 18.3, 247, 4, 0, TAU); g.fill(); }
  for (let i = 0; i < 400; i++) { g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(r() * 256, r() * 256, 3, 3); }
});

// ============================== geometry helpers ==============================
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
const solid = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; parent.add(m); return m;
};
const glowSprite = (col: THREE.Color, parent: THREE.Object3D) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 12; parent.add(s); return s;
};
/** coiled telephone cord along a curve (rig-local points) */
const coil = (pts: V3[], r: number, tube: number, turnsPerM: number) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const L = curve.getLength(), turns = Math.round(L * turnsPerM), N = turns * 12;
  const fr = curve.computeFrenetFrames(N, false), out: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const p = curve.getPointAt(i / N), a = (i / N) * turns * TAU;
    out.push(p.clone().addScaledVector(fr.normals[i], Math.cos(a) * r).addScaledVector(fr.binormals[i], Math.sin(a) * r));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(out), N * 2, tube, 6, false);
};
const cable = (pts: V3[], tube: number) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), 64, tube, 8, false);
/** a knurled knob body (y axis) */
const knurl = (r: number, h: number, flutes: number) => {
  const g = new THREE.CylinderGeometry(r, r * 1.04, h, flutes * 4, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), d = Math.hypot(x, z);
    if (d < r * 0.9) continue;
    const a = Math.atan2(z, x), k = 1 - 0.07 * (0.5 + 0.5 * Math.cos(a * flutes));
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals(); return g;
};

// ============================== 2-link arms ==============================
const UP = new THREE.Vector3(0, 1, 0);
const ik = (S: THREE.Vector3, Wt: THREE.Vector3, L1: number, L2: number) => {
  const d = Wt.clone().sub(S), dist = THREE.MathUtils.clamp(d.length(), 0.02, L1 + L2 - 1e-4), dir = d.normalize();
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const perp = UP.clone().addScaledVector(dir, -UP.dot(dir)).normalize();
  const E = S.clone().addScaledVector(dir, a).addScaledVector(perp, h);
  const n = dir.clone().cross(perp).normalize();
  return { E, n };
};
const _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _b = new THREE.Matrix4();
/** orient group: origin A, local +y toward B, local +x along the joint axis n */
const orient = (g: THREE.Object3D, A: THREE.Vector3, B: THREE.Vector3, n: THREE.Vector3) => {
  _y.copy(B).sub(A).normalize(); _x.copy(n).addScaledVector(_y, -n.dot(_y)).normalize(); _z.crossVectors(_x, _y);
  _b.makeBasis(_x, _y, _z); g.position.copy(A); g.quaternion.setFromRotationMatrix(_b);
};
type ArmMats = { metal: THREE.Material; dark: THREE.Material; orange: THREE.Material; stripe: THREE.Material; black: THREE.Material };
class Arm {
  yoke = new THREE.Group(); l1 = new THREE.Group(); l2 = new THREE.Group();
  constructor(parent: THREE.Object3D, M: ArmMats, public L1: number, public L2: number, w: number, yokeH: number) {
    parent.add(this.yoke, this.l1, this.l2);
    const b = new Bag();
    // yoke (on the turret, turns with the arm plane): two side plates, joint axis = local x at height yokeH
    for (const s of [-1, 1]) b.add(M.metal, at(rbox(0.014, yokeH + 0.035, w * 1.5, 0.005), s * (w * 0.85 + 0.012), (yokeH + 0.035) / 2, 0));
    b.add(M.dark, at(cylY(w * 1.3, 0.02, 28), 0, 0.01, 0));
    b.add(M.orange, at(cylX(w * 0.45, w * 2.05, 20), 0, yokeH, 0)); // axle caps through both plates
    b.build(this.yoke);
    // link 1 (from the shoulder, +y)
    const b1 = new Bag(), jr = w * 0.78;
    b1.add(M.metal, at(rbox(w, L1, w * 0.95, w * 0.22), 0, L1 / 2, 0));
    b1.add(M.dark, cylX(jr, w * 1.6, 28));
    b1.add(M.orange, cylX(jr * 0.62, w * 1.75, 24));
    b1.add(M.stripe, at(new THREE.BoxGeometry(w * 1.06, 0.045, w * 1.01), 0, L1 * 0.34, 0));
    b1.add(M.black, at(cylY(w * 0.16, L1 * 0.8, 10), 0, L1 * 0.5, -w * 0.62)); // cable conduit
    for (const y of [0.25, 0.5, 0.75]) b1.add(M.dark, at(new THREE.BoxGeometry(w * 0.5, 0.012, w * 0.3), 0, L1 * y, -w * 0.56));
    b1.build(this.l1);
    // link 2 (from the elbow)
    const b2 = new Bag(), w2 = w * 0.84;
    b2.add(M.metal, at(rbox(w2, L2, w2 * 0.95, w2 * 0.22), 0, L2 / 2, 0));
    b2.add(M.dark, cylX(jr * 0.92, w * 1.5, 28));
    b2.add(M.orange, cylX(jr * 0.58, w * 1.65, 24));
    b2.add(M.black, at(cylY(w * 0.14, L2 * 0.75, 10), 0, L2 * 0.45, -w2 * 0.62));
    b2.build(this.l2);
  }
  /** S = shoulder (rig-local), Wt = wrist target; returns the elbow */
  set(S: THREE.Vector3, Wt: THREE.Vector3, yokeBase: THREE.Vector3) {
    const { E, n } = ik(S, Wt, this.L1, this.L2);
    this.yoke.position.copy(yokeBase); this.yoke.rotation.set(0, Math.atan2(-n.z, n.x), 0);
    orient(this.l1, S, E, n); orient(this.l2, E, Wt, n);
    return E;
  }
}

// ============================== the sheet (rest drape) ==============================
type Bump = { x: number; y: number; z: number; r: number };
const restDrape = (bumps: Bump[]) => {
  const NX = SNX + 1, NZ = SNZ + 1, n = NX * NZ;
  const floor = new Float32Array(n), sup = new Float32Array(n), h = new Float32Array(n);
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = lerp(SX0, SX1, i / SNX), z = lerp(SZ0, SZ1, j / SNZ), k = j * NX + i;
    floor[k] = 0.004 - Math.min(0.36, Math.max(0, z - 0.47) * 2.4);
    let v = -1;
    for (const b of bumps) { const d = Math.hypot(x - b.x, z - b.z), R2 = b.r * 1.9; if (d < R2) v = Math.max(v, b.y + b.r * Math.sqrt(1 - (d / R2) * (d / R2))); }
    sup[k] = v; h[k] = Math.max(floor[k], v);
  }
  // relax a sagging membrane over the supports (a cloth draped over the robots), never below the table/supports
  const tmp = new Float32Array(n);
  for (let it = 0; it < 420; it++) {
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const a = h[j * NX + Math.max(0, i - 1)] + h[j * NX + Math.min(SNX, i + 1)] + h[Math.max(0, j - 1) * NX + i] + h[Math.min(SNZ, j + 1) * NX + i];
      tmp[k] = Math.max(floor[k], sup[k], a / 4 - 0.0016);
    }
    h.set(tmp);
  }
  // soft folds where the cloth hangs free
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i, x = lerp(SX0, SX1, i / SNX), z = lerp(SZ0, SZ1, j / SNZ);
    const free = clamp01((h[k] - floor[k]) / 0.05) * (sup[k] < 0 ? 1 : 0);
    h[k] = Math.max(floor[k], h[k] + free * (0.012 * Math.sin(x * 38 + Math.sin(z * 9) * 2) + 0.006 * Math.sin(x * 71 + z * 23)));
  }
  return h;
};

// ============================== CRT ==============================
const CRW = 768, CRH = 576;
const drawCRT = (g: CanvasRenderingContext2D, delay: number, tickle: number, run: number, phase: number, t: number) => {
  g.setTransform(1, 0, 0, 1, 0, 0);
  const bg = g.createRadialGradient(CRW / 2, CRH / 2, 40, CRW / 2, CRH / 2, CRW * 0.62);
  bg.addColorStop(0, "#0d2a1a"); bg.addColorStop(1, "#030a06");
  g.fillStyle = bg; g.fillRect(0, 0, CRW, CRH);
  const G = "#8dffae", A = "#ffcf5a";
  g.shadowColor = "rgba(120,255,160,0.9)"; g.shadowBlur = 14; g.fillStyle = G; g.textBaseline = "alphabetic";
  g.font = `700 30px ${MONO}`; g.textAlign = "left"; g.fillText("TICKLE ROBOT v1.0", 40, 58);
  g.textAlign = "right"; if (Math.floor(t * 2) % 2 === 0) { g.fillStyle = "#ff6a5a"; g.shadowColor = "rgba(255,90,70,0.9)"; g.fillText("● REC", CRW - 40, 58); }
  g.fillStyle = G; g.shadowColor = "rgba(120,255,160,0.9)";
  g.fillRect(40, 74, CRW - 80, 4);
  // the big readout
  g.textAlign = "center"; g.font = `800 92px ${MONO}`; g.shadowBlur = 22;
  g.fillText(`DELAY: ${delay.toFixed(2)} s`, CRW / 2, 178);
  g.shadowBlur = 10;
  // traces: HAND (green) vs TIP (amber): the lag is the delay
  const tx = 150, tw = CRW - 190, ty = 288, th = 130;
  g.strokeStyle = "rgba(141,255,174,0.25)"; g.lineWidth = 2; g.strokeRect(tx, ty - th / 2, tw, th);
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(tx + (tw * i) / 6, ty - th / 2); g.lineTo(tx + (tw * i) / 6, ty + th / 2); g.stroke(); }
  g.font = `700 28px ${MONO}`; g.textAlign = "left"; g.fillStyle = G; g.fillText("HAND", 36, ty - 14); g.fillStyle = A; g.fillText("TIP", 36, ty + 34);
  const trace = (col: string, lag: number, amp: number) => {
    g.strokeStyle = col; g.shadowColor = col; g.lineWidth = 6; g.beginPath();
    for (let k = 0; k <= 120; k++) { const u = k / 120, y = ty - Math.sin(phase - OMEGA * lag - (1 - u) * 7) * amp * (th * 0.38); if (k) g.lineTo(tx + u * tw, y); else g.moveTo(tx + u * tw, y); }
    g.stroke();
  };
  trace(G, 0, run); trace(A, delay, run);
  // tickle meter
  g.shadowColor = "rgba(120,255,160,0.9)"; g.fillStyle = G; g.font = `800 40px ${MONO}`; g.textAlign = "left"; g.fillText("TICKLE", 40, 470);
  const nb = 10, lit = Math.round(tickle * nb), hot = tickle > 0.6 && Math.floor(t * 6) % 2 === 0;
  for (let i = 0; i < nb; i++) {
    const on = i < lit, col = i < 4 ? G : i < 7 ? A : "#ff5a7a";
    g.fillStyle = on ? col : "rgba(141,255,174,0.12)"; g.shadowColor = col; g.shadowBlur = on ? 16 : 0;
    g.fillRect(232 + i * 46, 436, 36, 44);
  }
  g.shadowBlur = 18; g.font = `800 34px ${MONO}`; g.textAlign = "center";
  if (tickle > 0.6) { g.fillStyle = hot ? "#ff7a9a" : "#ffd0dc"; g.shadowColor = "#ff5a7a"; g.fillText("!!! MAX TICKLE !!!", CRW / 2, 532); }
  else if (tickle > 0.02) { g.fillStyle = G; g.fillText("tickle: barely...", CRW / 2, 532); }
  else { g.fillStyle = G; g.fillText(run > 0.5 ? "READY_" : Math.floor(t * 2) % 2 ? "STANDBY" : "STANDBY_", CRW / 2, 532); }
  // scanlines + glass vignette
  g.shadowBlur = 0;
  g.fillStyle = "rgba(0,0,0,0.22)"; for (let y = 0; y < CRH; y += 4) g.fillRect(0, y, CRW, 2);
  const vg = g.createRadialGradient(CRW / 2, CRH / 2, CRW * 0.3, CRW / 2, CRH / 2, CRW * 0.66);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.65)"); g.fillStyle = vg; g.fillRect(0, 0, CRW, CRH);
  g.fillStyle = "rgba(255,255,255,0.07)"; g.beginPath(); g.ellipse(CRW * 0.3, CRH * 0.18, CRW * 0.3, CRH * 0.09, -0.2, 0, TAU); g.fill();
};

// ============================== Props ==============================
export class Props {
  root = new THREE.Group();
  private rig = new THREE.Group();
  private tArm: Arm; private hArm: Arm;
  private wrist = new THREE.Group(); private foam: THREE.Mesh; private grip = new THREE.Group();
  private knob = new THREE.Group(); private leds: { mesh: THREE.Mesh; glow: THREE.Sprite; col: THREE.Color }[] = [];
  private beacon: { mesh: THREE.Mesh; glow: THREE.Sprite };
  private crt: { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; key: string; glow: THREE.Sprite };
  private sheet: THREE.Mesh; private sheetRest: Float32Array; private sheetTmp: Float32Array;
  private bot = new THREE.Group(); private botBody = new THREE.Group(); private botArm = new THREE.Group(); private feather = new THREE.Group();
  private botKey = new THREE.Group(); private head = new THREE.Group(); private botFeet: THREE.Mesh[] = []; private antenna = new THREE.Group();

  constructor() {
    this.root.add(this.rig, this.bot);
    this.rig.position.set(...RIG);
    const M: ArmMats = {
      metal: phong("#ffffff", metalTex(), "#ffffff", 70), dark: phong("#3a404c", null, "#9aa4b4", 40),
      orange: phong("#ff7f1e", null, "#ffffff", 60), stripe: lamb("#ffffff", stripeTex()), black: lamb("#25232a"),
    };
    const beige = lamb("#ffffff", beigeTex()), beigeDk = lamb("#c9bb98"), chrome = phong("#e4e8ee", null, "#ffffff", 120);
    const red = phong("#e8302e", null, "#ffffff", 80), rubber = lamb("#2a2830"), darkGrey = lamb("#3a404c");
    // ---------------- TICKLE robot base (screen left) ----------------
    const sb = new Bag();
    sb.add(M.dark, at(rbox(0.3, 0.06, 0.3, 0.014), TB[0], 0.03, TB[2]));
    sb.add(M.metal, at(cylY(0.085, 0.16, 32), TB[0], 0.14, TB[2]));
    for (let i = 0; i < 6; i++) sb.add(M.dark, at(cylY(0.094, 0.007, 32), TB[0], 0.085 + i * 0.022, TB[2]));
    sb.add(M.orange, at(cylY(0.095, 0.014, 32), TB[0], 0.067, TB[2]));
    for (const [x, z] of [[-0.12, -0.11], [0.12, -0.11], [-0.12, 0.11], [0.12, 0.11]]) sb.add(chrome, at(cylY(0.011, 0.012, 12), TB[0] + x, 0.064, TB[2] + z));
    sb.add(M.metal, at(rbox(0.12, 0.09, 0.07, 0.012), TB[0], 0.105, TB[2] - 0.11)); // motor pack behind the turret
    sb.add(M.dark, at(cylZ(0.03, 0.03, 20), TB[0] + 0.03, 0.11, TB[2] - 0.155));
    // ---------------- HANDLE robot base (screen right) ----------------
    sb.add(M.dark, at(rbox(0.21, 0.05, 0.2, 0.012), HB[0], 0.025, HB[2]));
    sb.add(M.metal, at(cylY(0.056, 0.06, 28), HB[0], 0.08, HB[2]));
    for (let i = 0; i < 3; i++) sb.add(M.dark, at(cylY(0.062, 0.006, 28), HB[0], 0.062 + i * 0.016, HB[2]));
    for (const [x, z] of [[-0.085, -0.08], [0.085, -0.08], [-0.085, 0.08], [0.085, 0.08]]) sb.add(chrome, at(cylY(0.009, 0.01, 12), HB[0] + x, 0.052, HB[2] + z));
    // ---------------- cables ----------------
    sb.add(lamb("#d83a3a"), coil([[TB[0] + 0.1, 0.03, TB[2] - 0.15], [-0.62, 0.014, -0.08], [-0.3, 0.014, -0.3], [0.05, 0.014, -0.37], [0.3, 0.03, -0.38], [0.4, 0.06, -0.33]], 0.011, 0.0042, 70));
    sb.add(lamb("#2f6fd8"), cable([[HB[0] - 0.04, 0.03, HB[2] - 0.1], [0.6, 0.009, 0.12], [0.56, 0.01, 0.02], [0.55, 0.05, -0.04]], 0.008));
    sb.add(rubber, cable([[TB[0] - 0.13, 0.03, TB[2] - 0.1], [-0.82, 0.009, 0.05], [-0.8, 0.009, -0.3], [-0.79, 0.006, -0.44], [-0.78, -0.06, -0.48]], 0.009));
    sb.add(rubber, cable([[0.72, 0.05, -0.3], [0.76, 0.009, -0.38], [0.78, 0.006, -0.44], [0.79, -0.08, -0.48]], 0.011));
    sb.build(this.rig);
    // label plate on the tickle robot plinth (just proud of the front face)
    const plate = solid(new THREE.PlaneGeometry(0.25, 0.043), lamb("#ffffff", labelTex()), this.rig);
    plate.position.set(TB[0], 0.03, TB[2] + 0.1505); plate.castShadow = false;
    this.tArm = new Arm(this.rig, M, TL1, TL2, 0.05, 0.08);
    this.hArm = new Arm(this.rig, M, HL1, HL2, 0.034, 0.05);
    // wrist + foam tip
    const wb = new Bag();
    wb.add(M.dark, cylY(0.026, 0.05, 24));
    wb.add(M.orange, at(cylY(0.028, 0.012, 24), 0, -0.018, 0));
    wb.add(chrome, at(cylY(0.0075, 0.075, 12), 0, -0.06, 0));
    wb.add(M.dark, at(cylY(0.013, 0.014, 16), 0, -0.093, 0));
    wb.build(this.wrist);
    this.foam = solid(new THREE.SphereGeometry(0.033, 28, 18), lamb("#ffffff", foamTex()), this.wrist);
    this.rig.add(this.wrist);
    // joystick grip
    const gb = new Bag();
    gb.add(M.dark, at(cylY(0.025, 0.016, 20), 0, -0.058, 0));
    gb.add(rubber, cylY(0.019, 0.1, 20, 0.021));
    for (const y of [-0.032, -0.012, 0.008, 0.028]) gb.add(rubber, at(new THREE.TorusGeometry(0.0205, 0.0035, 8, 24).rotateX(Math.PI / 2), 0, y, 0));
    gb.add(red, at(new THREE.SphereGeometry(0.028, 24, 16), 0, 0.068, 0));
    gb.add(lamb("#ffd23a"), at(cylY(0.009, 0.012, 14), 0, 0.094, 0.004));
    gb.build(this.grip);
    this.rig.add(this.grip);
    // ---------------- CONSOLE + CRT ----------------
    const con = new THREE.Group(); con.position.set(...CON_L); con.rotation.y = CON_YAW; this.rig.add(con);
    const cb = new Bag();
    cb.add(beige, at(rbox(0.42, 0.3, 0.3, 0.025), 0, 0.15, 0));
    cb.add(beigeDk, at(rbox(0.44, 0.018, 0.32, 0.008), 0, 0.009, 0));
    cb.add(beige, at(rbox(0.46, 0.19, 0.34, 0.02), 0, -0.105, 0)); // the PC case it stands on
    cb.add(beigeDk, at(rbox(0.47, 0.012, 0.35, 0.005), 0, -0.194, 0));
    for (let i = 0; i < 6; i++) cb.add(beigeDk, at(new THREE.BoxGeometry(0.008, 0.14, 0.012), 0.21, 0.15, -0.09 + i * 0.036), at(new THREE.BoxGeometry(0.008, 0.11, 0.012), 0.23, -0.1, -0.09 + i * 0.036));
    // CRT monitor on top
    cb.add(beige, at(rbox(0.35, 0.29, 0.27, 0.03), 0, 0.3 + 0.145, -0.005));
    cb.add(beige, at(rbox(0.25, 0.21, 0.14, 0.04), 0, 0.43, -0.17));
    cb.add(beigeDk, at(rbox(0.2, 0.02, 0.17, 0.008), 0, 0.302, -0.01));
    cb.add(lamb("#3a3a40"), at(new THREE.BoxGeometry(0.29, 0.225, 0.01), 0, 0.452, 0.128)); // dark inner bezel
    cb.add(beigeDk, at(cylZ(0.008, 0.01, 12), 0.13, 0.33, 0.134), at(cylZ(0.008, 0.01, 12), 0.105, 0.33, 0.134));
    // dial skirt + front hardware (console face z = 0.15)
    cb.add(chrome, at(cylZ(0.058, 0.012, 48), DIAL_C[0], DIAL_C[1], 0.156));
    const lx = 0.128;
    cb.add(chrome, at(cylZ(0.016, 0.01, 20), lx, 0.222, 0.155), at(cylZ(0.016, 0.01, 20), lx, 0.172, 0.155));
    cb.add(chrome, at(cylZ(0.033, 0.012, 32), lx, 0.075, 0.156));
    cb.add(red, at(cylZ(0.026, 0.026, 32), lx, 0.075, 0.172));
    cb.add(chrome, at(cylZ(0.006, 0.05, 10).rotateX(-0.5), 0.168, 0.125, 0.172)); // toggle switch
    cb.add(darkGrey, at(cylY(0.028, 0.016, 20), 0.12, 0.598, -0.02)); // beacon base
    cb.build(con);
    const face = solid(new THREE.PlaneGeometry(FP_W, FP_H), lamb("#ffffff", faceTex()), con); face.position.set(0, FP_Y, 0.1505); face.castShadow = false;
    const pc = solid(new THREE.PlaneGeometry(0.42, 0.16), lamb("#ffffff", pcTex()), con); pc.position.set(0, -0.105, 0.1705); pc.castShadow = false;
    const brand = solid(new THREE.PlaneGeometry(0.17, 0.0213), lamb("#ffffff", brandTex()), con); brand.position.set(-0.04, 0.33, 0.1355); brand.castShadow = false;
    const note = solid(new THREE.PlaneGeometry(0.07, 0.07), lamb("#ffffff", noteTex()), con); note.position.set(0.178, 0.405, 0.1358); note.rotation.z = -0.14; note.castShadow = false;
    // knob + needle (rotates)
    this.knob.position.set(DIAL_C[0], DIAL_C[1], 0.162); con.add(this.knob);
    const kb = new Bag();
    kb.add(lamb("#26242c"), knurl(0.047, 0.05, 20).rotateX(Math.PI / 2).translate(0, 0, 0.025));
    kb.add(chrome, at(cylZ(0.034, 0.008, 40), 0, 0, 0.052));
    kb.add(red, at(new THREE.BoxGeometry(0.008, 0.034, 0.006), 0, 0.018, 0.057));
    const needle = new THREE.Shape(); needle.moveTo(-0.006, 0.044); needle.lineTo(0, 0.104); needle.lineTo(0.006, 0.044); needle.lineTo(-0.006, 0.044);
    kb.add(red, new THREE.ExtrudeGeometry(needle, { depth: 0.004, bevelEnabled: false }).translate(0, 0, -0.0035));
    kb.build(this.knob);
    // LEDs (RUN green, TICKLE red)
    ([["#3dff7a", 0.222], ["#ff3a4a", 0.172]] as [string, number][]).forEach(([c, y]) => {
      const col = new THREE.Color(c);
      const mesh = solid(new THREE.SphereGeometry(0.011, 16, 12), new THREE.MeshBasicMaterial({ color: col.clone() }), con); mesh.position.set(lx, y, 0.161); mesh.castShadow = false;
      const glow = glowSprite(col, con); glow.position.set(lx, y, 0.175); glow.scale.setScalar(0.07);
      this.leds.push({ mesh, glow, col });
    });
    // beacon dome on top of the CRT
    const bm = solid(new THREE.SphereGeometry(0.024, 20, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff8a2a") }), con);
    bm.position.set(0.12, 0.606, -0.02); bm.castShadow = false;
    const bg = glowSprite(new THREE.Color("#ff9a3a"), con); bg.position.set(0.12, 0.625, -0.02);
    this.beacon = { mesh: bm, glow: bg };
    // CRT screen (self-lit canvas)
    const cv = document.createElement("canvas"); cv.width = CRW; cv.height = CRH;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.195), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.15, 1.15, 1.15) }));
    scr.position.set(0, 0.452, 0.1355); scr.frustumCulled = false; con.add(scr);
    const sg = glowSprite(new THREE.Color(0.25, 0.9, 0.45), con); sg.position.set(0, 0.452, 0.2); sg.scale.set(0.42, 0.34, 1);
    this.crt = { cv, tex, key: "", glow: sg };
    // ---------------- the SHEET ----------------
    const bumps: Bump[] = [];
    { // rest pose of the arms under the sheet (shot 3, robot idle)
      const tip = foamTipAt(3, 0).pos, Wt = new THREE.Vector3(tip[0] - RIG[0], tip[1] - RIG[1] + 0.115, tip[2] - RIG[2]);
      const S = new THREE.Vector3(TB[0], 0.3, TB[2]), E = ik(S, Wt, TL1, TL2).E;
      const seg = (A: THREE.Vector3, B: THREE.Vector3, r: number, n: number) => { for (let i = 0; i <= n; i++) { const p = A.clone().lerp(B, i / n); bumps.push({ x: p.x, y: p.y, z: p.z, r }); } };
      seg(S, E, 0.06, 6); seg(E, Wt, 0.055, 6); seg(Wt, Wt.clone().add(new THREE.Vector3(0, -0.12, 0)), 0.06, 3);
      bumps.push({ x: TB[0], y: 0.2, z: TB[2], r: 0.12 });
      for (const [dx, dz] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) bumps.push({ x: TB[0] + dx, y: 0.04, z: TB[2] + dz, r: 0.05 });
      const H = new THREE.Vector3(GRIP_L[0], GRIP_L[1], GRIP_L[2]), S2 = new THREE.Vector3(HB[0], 0.16, HB[2]);
      const E2 = ik(S2, H.clone().add(new THREE.Vector3(0, -0.062, 0)), HL1, HL2).E;
      seg(S2, E2, 0.06, 3); seg(E2, H, 0.06, 3); bumps.push({ x: H.x, y: H.y + 0.06, z: H.z, r: 0.05 });
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 3; j++) { const p = conToRig(-0.19 + i * 0.095, 0.56, -0.15 + j * 0.1); bumps.push({ x: p[0], y: p[1], z: p[2], r: 0.07 }); }
    }
    this.sheetRest = restDrape(bumps);
    const sgeo = new THREE.PlaneGeometry(1, 1, SNX, SNZ);
    this.sheetTmp = new Float32Array(sgeo.attributes.position.count * 3);
    this.sheet = new THREE.Mesh(sgeo, twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", map: sheetTex(), side: THREE.DoubleSide })));
    this.sheet.castShadow = true; this.sheet.receiveShadow = true; this.sheet.frustumCulled = false; this.rig.add(this.sheet);
    // ---------------- the little SLOW robot ----------------
    this.buildBot(chrome);
    this.rig.visible = false; this.bot.visible = false;
  }

  private buildBot(chrome: THREE.Material) {
    const tin = phong("#ffffff", tinTex(), "#ffffff", 90), blue = phong("#8fc3e8", null, "#ffffff", 90), dark = lamb("#2e2a36");
    const brass = phong("#e8b440", null, "#fff2c0", 90), white = phong("#ffffff", null, "#ffffff", 60);
    this.bot.add(this.botBody); this.botBody.scale.setScalar(BOT_S);
    const B = this.botBody, b = new Bag();
    for (const s of [-1, 1]) b.add(chrome, at(cylY(0.011, 0.03, 12), s * 0.028, 0.04, 0));
    b.add(tin, at(rbox(0.115, 0.105, 0.088, 0.022), 0, 0.1, 0));
    b.add(chrome, at(cylY(0.022, 0.016, 16), 0, 0.158, 0));
    const H = this.head, hb = new Bag(); H.position.set(0, 0.2, 0); B.add(H);
    hb.add(blue, at(rbox(0.1, 0.078, 0.084, 0.026), 0, 0, 0));
    for (const s of [-1, 1]) hb.add(lamb("#ff9a3a"), at(cylX(0.016, 0.014, 16), s * 0.055, 0, 0));
    for (const s of [-1, 1]) {
      hb.add(white, at(new THREE.SphereGeometry(0.019, 18, 12), s * 0.023, 0.007, 0.036));
      hb.add(dark, at(new THREE.SphereGeometry(0.0095, 12, 8), s * 0.025, 0.005, 0.052));
    }
    hb.build(H);
    // left (stubby) arm, static
    b.add(chrome, at(cylY(0.009, 0.05, 10), -0.068, 0.11, 0));
    b.add(tin, at(new THREE.SphereGeometry(0.014, 14, 10), -0.068, 0.082, 0));
    b.build(B);
    const shine = solid(new THREE.SphereGeometry(0.0034, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }), H); shine.position.set(0.02, 0.011, 0.0605); shine.castShadow = false;
    const shine2 = solid(new THREE.SphereGeometry(0.0034, 8, 6), shine.material as THREE.Material, H); shine2.position.set(-0.026, 0.011, 0.0605); shine2.castShadow = false;
    const chest = solid(new THREE.PlaneGeometry(0.07, 0.07), lamb("#ffffff", chestTex()), B); chest.position.set(0, 0.098, 0.0445); chest.castShadow = false;
    const mouth = solid(new THREE.PlaneGeometry(0.05, 0.025), lamb("#ffffff", mouthTex()), H); mouth.position.set(0, -0.022, 0.0425); mouth.castShadow = false;
    for (const s of [-1, 1]) { const ck = solid(new THREE.CircleGeometry(0.009, 16), lamb("#ff8aa8"), H); ck.position.set(s * 0.037, -0.016, 0.0424); ck.castShadow = false; }
    // feet (shuffle)
    for (const s of [-1, 1]) { const f = solid(rbox(0.038, 0.026, 0.062, 0.01), dark, B); f.position.set(s * 0.028, 0.013, 0.006); this.botFeet.push(f); }
    // antenna (springy)
    this.antenna.position.set(0, 0.039, 0); H.add(this.antenna);
    solid(at(cylY(0.0028, 0.05, 8), 0, 0.025, 0), chrome, this.antenna);
    solid(at(new THREE.SphereGeometry(0.011, 14, 10), 0, 0.054, 0), lamb("#ffd23a"), this.antenna);
    // wind-up key on the back
    this.botKey.position.set(0, 0.105, -0.044); B.add(this.botKey);
    const kb = new Bag();
    kb.add(brass, at(cylZ(0.005, 0.026, 10), 0, 0, -0.013));
    for (const s of [-1, 1]) kb.add(brass, at(new THREE.TorusGeometry(0.016, 0.0052, 8, 20), s * 0.019, 0, -0.028));
    kb.add(brass, at(new THREE.SphereGeometry(0.007, 10, 8), 0, 0, -0.028));
    kb.build(this.botKey);
    // feather arm
    this.botArm.position.set(...SHOULDER); B.add(this.botArm);
    solid(at(cylY(0.009, ARM_LEN, 10), 0, -ARM_LEN / 2, 0), chrome, this.botArm);
    solid(at(new THREE.SphereGeometry(0.014, 14, 10), 0, -ARM_LEN, 0), tin, this.botArm);
    solid(cylX(0.014, 0.012, 16), lamb("#ff9a3a"), this.botArm);
    this.feather.position.set(0, -ARM_LEN, 0); this.botArm.add(this.feather);
    const vaneG = new THREE.Group(); vaneG.rotation.y = Math.PI / 2; this.feather.add(vaneG);
    // the feather: a curved notched vane + white quill, pointing down -y (FEATHER_LEN)
    const fs = new THREE.Shape(), L = FEATHER_LEN, Wd = 0.032, N = 18;
    const side = (sg: number) => { const pts: [number, number][] = []; for (let i = 0; i <= N; i++) { const u = i / N, y = -0.03 - u * (L - 0.03), w = Wd * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.62)), 0.7) * (1 - 0.25 * u) + 0.0015, notch = i % 3 === 1 && i < N - 2 ? 0.7 : 1; pts.push([sg * w * notch, y]); } return pts; };
    fs.moveTo(0, -0.028);
    side(1).forEach(([x, y]) => fs.lineTo(x, y));
    side(-1).reverse().forEach(([x, y]) => fs.lineTo(x, y));
    const fg = new THREE.ShapeGeometry(fs, 4), fp = fg.attributes.position;
    for (let i = 0; i < fp.count; i++) { const y = fp.getY(i), x = fp.getX(i); fp.setZ(i, 0.35 * y * y + 4 * x * x); }
    fg.computeVertexNormals();
    solid(fg, twoTone(new THREE.MeshLambertMaterial({ color: "#ff86c4", side: THREE.DoubleSide })), vaneG);
    const quill = new THREE.CatmullRomCurve3([0, 0.2, 0.4, 0.6, 0.8, 1].map((u) => new THREE.Vector3(0, -u * (L - 0.01), 0.35 * Math.pow(u * (L - 0.01), 2) + 0.0012)));
    solid(new THREE.TubeGeometry(quill, 20, 0.0022, 6, false), white, vaneG);
  }

  private debugCam(id: number, t: number, cam: THREE.PerspectiveCamera) {
    const o = (globalThis as { __PROPCAM?: number }).__PROPCAM ?? Math.round(t * 30) % 4;
    let p: V3, l: V3, fov = 40;
    if (id >= 3 && id <= 6) {
      if (o === 1) { p = R(-0.35, 0.45, 1.5); l = R(-0.5, 0.2, 0.3); fov = 40; }      // tickle tip close
      else if (o === 2) { p = R(0.35, 0.45, 1.25); l = R(0.55, 0.3, -0.05); fov = 34; } // console close
      else if (o === 3) { p = R(0.9, 0.9, 1.6); l = R(0, 0.2, 0.1); fov = 50; }
      else { p = R(0.0, 0.62, 2.7); l = R(0.0, 0.25, 0.1); fov = 62; }
    } else if (id === 7) { p = o === 3 ? add(HOME, -0.9, 0.45, 1.25) : add(HOME, -0.55, 0.55, 1.75); l = add(slowBotPos(id, t).pos, -0.05, 0.16, 0); fov = 36; }
    else return;
    cam.position.set(...p); cam.up.set(0, 1, 0); cam.lookAt(...l); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    if (DEBUG_CAM) this.debugCam(id, t, cam as THREE.PerspectiveCamera);
    const lab = id >= 3 && id <= 6;
    this.rig.visible = lab;
    if (lab) this.updateRig(id, t);
    this.bot.visible = id === 7;
    if (id === 7) this.updateBot(id, t);
  }

  private updateRig(id: number, t: number) {
    const r = robotAt(id, t);
    // ---- tickle arm + foam ----
    const ft = foamTipAt(id, t), tip = new THREE.Vector3(ft.pos[0] - RIG[0], ft.pos[1] - RIG[1], ft.pos[2] - RIG[2]);
    const Wt = tip.clone().add(new THREE.Vector3(0, 0.115, 0));
    this.tArm.set(new THREE.Vector3(TB[0], 0.3, TB[2]), Wt, new THREE.Vector3(TB[0], 0.22, TB[2]));
    this.wrist.position.copy(Wt);
    const ph = r.phase - OMEGA * r.delay, vx = Math.cos(ph) * r.run; // the foam leans into the stroke
    this.wrist.rotation.set(0, 0, -0.12 * vx);
    const sq = lerp(1, 0.84 + 0.05 * Math.sin(2 * ph), r.run);
    this.foam.scale.set(1 + 0.12 * r.run, sq, 1 + 0.1 * r.run);
    this.foam.position.set(0, -0.115 + 0.033 * (1 - sq) * 0.5, 0);
    // ---- handle arm ----
    const hp = handlePos(id, t), G = new THREE.Vector3(hp[0] - RIG[0], hp[1] - RIG[1], hp[2] - RIG[2]);
    this.grip.position.copy(G); this.grip.rotation.set(0.06, 0, -3 * handleDX(id, t));
    this.hArm.set(new THREE.Vector3(HB[0], 0.16, HB[2]), G.clone().add(new THREE.Vector3(0, -0.062, 0)), new THREE.Vector3(HB[0], 0.11, HB[2]));
    // ---- dial ----
    this.knob.rotation.z = -dialAngle(r.delay);
    // ---- LEDs + beacon ----
    const blink = (hz: number) => 0.5 + 0.5 * Math.sin(t * TAU * hz);
    const tk = smooth(r.tickle / 0.5);
    const ledK = [r.run * (0.75 + 0.25 * blink(1.3)), (0.12 + 0.88 * tk) * (r.tickle > 0.5 ? 0.6 + 0.4 * blink(5) : 1) * smooth(r.tickle / 0.03)];
    this.leds.forEach((L, i) => {
      const k = ledK[i];
      (L.mesh.material as THREE.MeshBasicMaterial).color.copy(L.col).multiplyScalar(0.25 + 1.1 * k);
      (L.glow.material as THREE.SpriteMaterial).opacity = 0.9 * k; L.glow.visible = k > 0.02;
    });
    const hot = smooth((r.tickle - 0.5) / 0.3);
    (this.beacon.mesh.material as THREE.MeshBasicMaterial).color.set("#ff8a2a").multiplyScalar(0.35 + 1.0 * hot * (0.6 + 0.4 * blink(3)));
    (this.beacon.glow.material as THREE.SpriteMaterial).opacity = hot * (0.55 + 0.45 * blink(3)); this.beacon.glow.visible = hot > 0.01;
    this.beacon.glow.scale.setScalar(0.12 + 0.05 * hot);
    // ---- CRT ----
    const key = `${r.delay.toFixed(3)}|${r.tickle.toFixed(2)}|${r.run.toFixed(2)}|${t.toFixed(3)}`;
    if (key !== this.crt.key) { this.crt.key = key; drawCRT(this.crt.cv.getContext("2d")!, r.delay, r.tickle, r.run, r.phase, t); this.crt.tex.needsUpdate = true; }
    (this.crt.glow.material as THREE.SpriteMaterial).opacity = 0.16 + 0.1 * hot;
    // ---- sheet ----
    this.updateSheet(sheetS(id, t));
  }

  private updateSheet(s: number) {
    this.sheet.visible = s < 0.999;
    if (!this.sheet.visible) return;
    const p = this.sheet.geometry.attributes.position as THREE.BufferAttribute, tmp = this.sheetTmp;
    const crumple = smooth((s - 0.72) / 0.28);
    let cx = 0, cy = 0, cz = 0;
    // PlaneGeometry rows run top (v = 1) -> bottom: row j = back (z0) -> front (z1), so the stamp reads upright
    for (let j = 0; j <= SNZ; j++) for (let i = 0; i <= SNX; i++) {
      const k = j * (SNX + 1) + i, v = j / SNZ, u = i / SNX;
      const x = lerp(SX0, SX1, u), z = lerp(SZ0, SZ1, v), y0 = this.sheetRest[k];
      const L = sheetLift(s, v), fl = Math.sin(Math.PI * L.e), wave = 0.11 * Math.sin(10 * v - 26 * s + u * 4) * fl + 0.12 * Math.sin(Math.PI * u) * fl;
      tmp[k * 3] = x + L.dx + 0.07 * Math.sin(u * 5 + s * 11) * L.e;
      tmp[k * 3 + 1] = y0 * (1 - L.e) + L.dy + wave;
      tmp[k * 3 + 2] = z + (0.12 - z) * 0.62 * L.e + 0.05 * Math.sin(u * 7 - 20 * s) * fl;
      cx += tmp[k * 3]; cy += tmp[k * 3 + 1]; cz += tmp[k * 3 + 2];
    }
    cx /= p.count; cy /= p.count; cz /= p.count;
    const sc = 1 - 0.6 * crumple;
    for (let k = 0; k < p.count; k++) p.setXYZ(k, cx + (tmp[k * 3] - cx) * sc, cy + (tmp[k * 3 + 1] - cy) * sc, cz + (tmp[k * 3 + 2] - cz) * sc);
    p.needsUpdate = true; this.sheet.geometry.computeVertexNormals();
  }

  private updateBot(id: number, t: number) {
    const P = botPose(id, t);
    const wk = P.walking, ph = P.walkPh;
    this.bot.position.set(P.pos[0], P.pos[1] + 0.005 * wk * Math.abs(Math.sin(ph)) * BOT_S, P.pos[2]);
    this.bot.rotation.set(0, P.yaw + 0.06 * wk * Math.sin(ph), 0);
    this.botBody.rotation.set(0, 0, 0.07 * wk * Math.sin(ph) + 0.03 * P.tickle * Math.sin(t * 13));
    this.botFeet.forEach((f, i) => { const s = i ? 1 : -1, a = ph + (i ? Math.PI : 0); f.position.set(s * 0.028, 0.013 + 0.007 * wk * Math.max(0, Math.sin(a)), 0.006 + 0.011 * wk * Math.cos(a)); });
    this.botKey.rotation.z = -t * 1.1 * (0.4 + 0.6 * wk); // slooow
    this.antenna.rotation.set(0.15 * wk * Math.sin(ph * 2 + 0.6), 0, 0.18 * Math.sin(t * 5.3) * (0.4 + wk * 0.6) + 0.2 * P.tickle * Math.sin(t * 19));
    this.head.rotation.set(0.05 * Math.sin(t * 2.1), lerp(0.55, 1.0, smooth(P.tickle)) + 0.06 * Math.sin(t * 1.7), 0.12 * P.tickle * Math.sin(t * 9));
    this.botArm.rotation.set(-P.arm, 0, 0.08 * Math.sin(t * 3) * (1 - P.tickle));
    this.feather.rotation.set(-0.55 + P.wig * 0.5, 0, P.wig);
    // NB: featherTipOf() mirrors this chain (bot -> body scale -> shoulder -> arm -> feather); the sways are tiny
  }
}
