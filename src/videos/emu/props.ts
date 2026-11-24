// OWNER: props agent. See /home/user/lookmatch/EMU_BRIEF.md
// Every hard prop of the Emu War short, as real lit + inked 3D meshes (merged per material, never frustum culled):
//   1. LINE-UP (shot 6, FARM-local): two Lewis guns resting on bipods + a tower of four "10,000 RDS" ammo crates; each
//      falls in from above the frame on its word (lineupAt) with a squash + a dust puff. Shot 6 only.
//   2. AMBUSH (shots 8-9): a Lewis gun on a low tripod at HIDE, aimed at the dam (+ one crate beside it). Shot 9: muzzle
//      flashes + ejected brass + drum ticking round while jamAt.firing, then on "jams" a smoke puff, a sad spring
//      boinging out of the receiver and drooping, and the gun sagging muzzle-down.
//   3. TRUCK (shots 10, 11, 14 on ROAD): 1930s open-cab flatbed, olive drab, round headlights, spoked artillery wheels,
//      a Lewis gun on a pedestal on the tray (clunks down on "bolt" in shot 10), bouncing on the ruts, red dust trail.
//      Shot 11 the gun fires short hopeless bursts. Shot 14 the truck drives slowly home along -x.
//   4. PHONE (shots 5, 15, OFFICE-local): a candlestick telephone on the desk; rattles while ringing in shot 5.
//   5. SCOREBOARD (shot 17 at SCORE): a hand-painted green wooden cricket-style board on its own two posts, "FINAL
//      SCORE / EMUS / ARMY"; black tin number plates spin in on "one" and "zero"; the "0" then slips off one hook.
// Exported helpers below give the cast / flock / camera owners exact positions (truckPose, truckToWorld, ...).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { getInputProps } from "remotion";
import { ctex } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { FARM, DAM, HIDE, ROAD, OFFICE, SCORE, W, LEAD, V3, SHOTS, FPS, chaseAt, lineupAt, jamAt, smooth, clamp01 } from "./story";

const TAU = Math.PI * 2;
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const shotStart = (id: number) => SHOTS[id - 1].a / FPS;

// ============================== public contracts ==============================
/** Lewis gun cartoon scale (real ~1.28 m gun drawn ~1.55 m long) */
export const GUN_SCALE = 1.2;
/** line-up (shot 6), world positions (FARM + local). People are the cast's: suggested row z = FARM.z + 0 */
export const LINEUP = {
  gunA: [FARM[0] - 0.95, 0, FARM[2] + 1.6] as V3, gunB: [FARM[0] + 0.35, 0, FARM[2] + 1.6] as V3, gunYaw: -0.9,
  crates: [FARM[0] + 1.9, 0, FARM[2] + 0.3] as V3, crateYaw: -0.25,
};
/** ambush gun (shots 8-9): tripod at HIDE, receiver (pivot) at y 0.95, aimed at DAM */
const HG: V3 = [HIDE[0] - 0.45, 0, HIDE[2] + 1.0];
export const HIDE_GUN = { pos: HG, pivotY: 0.95, yaw: Math.atan2(-(DAM[2] - HG[2]), DAM[0] - HG[0]) };
/** muzzle tip of the ambush gun (world), for effect cards */
export const HIDE_MUZZLE: V3 = (() => { const L = 0.98 * GUN_SCALE, y = HIDE_GUN.yaw; return [HG[0] + Math.cos(y) * L, 0.95, HG[2] - Math.sin(y) * L]; })();
/** candlestick phone on the desk (OFFICE-local x 0.42, desk top y 0.76, z 0.12); ~0.38 m tall */
export const PHONE: V3 = [OFFICE[0] + 0.42, 0.76, OFFICE[2] + 0.12];
/** phone rings (shot 5) in these windows (s) */
export const PHONE_RINGS: [number, number][] = [[13.75, 14.25], [14.45, 14.95], [15.15, 15.55]];
/** scoreboard: board face plane z = SCORE.z + 0.04 facing +z, board x SCORE.x +-1.6, y 1.55..3.65 (raised: the army stands beneath it), posts at x +-1.45 */
export const SCOREBOARD = { center: [SCORE[0], 2.6, SCORE[2]] as V3, w: 3.2, h: 2.1, footprint: { x0: SCORE[0] - 1.65, x1: SCORE[0] + 1.65, z0: SCORE[2] - 0.2, z1: SCORE[2] + 0.2 } };

// truck: local frame +x forward, +y up, +z = truck's right (driver side, RHD). Ground under the wheels y = 0.
export const TRUCK = {
  len: 5.1, front: 2.5, rear: -2.65, halfW: 0.95, wheelR: 0.46, axles: [1.55, -1.45], track: 0.78,
  deckY: 1.05,                      // tray floor top (local)
  driver: [-0.12, 0.9, 0.38] as V3,  // seat cushion top under the driver (RHD, steering wheel at z +0.38)
  passenger: [-0.12, 0.9, -0.38] as V3,
  gunner: [-1.4, 1.05, 0.0] as V3,   // standing spot behind the pedestal gun, on the tray
  gun: [-0.85, 2.0, 0.0] as V3,       // gun pivot (receiver) on the pedestal
  crate: [-2.2, 1.05, 0.62] as V3,
};
export type TruckPose = { show: boolean; x: number; y: number; z: number; yaw: number; s: number; speed: number; bob: number; pitch: number; roll: number };
/** truck pose: shots 10/11 at ROAD + chaseAt.truckX heading +x; shot 14 driving home along -x at 2.2 m/s from ROAD */
export const truckPose = (id: number, t: number): TruckPose => {
  let x = 0, yaw = 0, s = 0, speed = 0, show = true;
  if (id === 10 || id === 11) { const c = chaseAt(id, t), c2 = chaseAt(id, t + 0.02); x = ROAD[0] + c.truckX; s = c.truckX; speed = (c2.truckX - c.truckX) / 0.02; }
  else if (id === 14) show = false; // QA3: shot 14 = the army trudges home on foot (the truck cut through the walkers)
  else show = false;
  const a = Math.min(1, speed / 8) * (id === 11 ? 1.25 : 1);
  const hop = a * 0.07 * Math.pow(Math.max(0, Math.sin(s * 0.83 + 0.4)), 8);               // every rut throws it up a bit
  const bob = a * (0.03 * Math.sin(s * 2.3) + 0.018 * Math.sin(s * 5.1 + 1.2));             // body on its springs
  const pitch = a * (0.018 * Math.sin(s * 1.7 + 0.5) + 0.08 * hop);
  const roll = a * 0.016 * Math.sin(s * 1.1 + 2.0);
  return { show, x, y: hop, z: ROAD[2], yaw, s, speed, bob, pitch, roll };
};
/** vertical bump of the sprung truck body at time t (s), for the shot playing at t (0 when no truck) */
export const truckBump = (t: number) => { const id = (SHOTS.find((x) => t * FPS >= x.a && t * FPS < x.b) ?? SHOTS[SHOTS.length - 1]).id; const q = truckPose(id, t); return q.show ? q.y + q.bob : 0; };
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _te = new THREE.Euler(), _tv = new THREE.Vector3(), _ts = new THREE.Vector3(1, 1, 1);
/** world position of a truck-local point riding on the sprung body (cards on the tray / in the cab follow this) */
export const truckToWorld = (id: number, t: number, p: V3): V3 => {
  const q = truckPose(id, t);
  _te.set(q.roll, q.yaw, q.pitch, "YXZ"); _tq.setFromEuler(_te);
  _tm.compose(_tv.set(q.x, q.y + q.bob, q.z), _tq, _ts);
  const v = new THREE.Vector3(...p).applyMatrix4(_tm);
  return [v.x, v.y, v.z];
};

// ============================== geometry helpers ==============================
const _M = new THREE.Matrix4(), _Q = new THREE.Quaternion(), _E = new THREE.Euler(), _S = new THREE.Vector3(), _P = new THREE.Vector3();
const xf = <G extends THREE.BufferGeometry>(g: G, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s: number | [number, number, number] = 1): G => {
  _E.set(rx, ry, rz); _Q.setFromEuler(_E); const sc = typeof s === "number" ? [s, s, s] : s;
  _M.compose(_P.set(x, y, z), _Q, _S.set(sc[0], sc[1], sc[2])); g.applyMatrix4(_M); return g;
};
const clean = (g: THREE.BufferGeometry) => {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") n.deleteAttribute(k);
  if (!n.attributes.uv) n.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
  n.clearGroups();
  return n;
};
class Batch {
  private m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(mat: THREE.Material, g: THREE.BufferGeometry) { let l = this.m.get(mat); if (!l) this.m.set(mat, (l = [])); l.push(clean(g)); return g; }
  into(parent: THREE.Object3D, shadow = true) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.frustumCulled = false; parent.add(mesh);
    }
    this.m.clear();
  }
}
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
/** cylinder along x */
const cylX = (r0: number, r1: number, len: number, seg = 24) => new THREE.CylinderGeometry(r1, r0, len, seg).rotateZ(-Math.PI / 2);
/** cylinder along z */
const cylZ = (r: number, len: number, seg = 24) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
/** rod between two points */
const rod = (a: V3, b: V3, r: number, seg = 8) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  return g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
};
const lam = (col: THREE.ColorRepresentation, map?: THREE.Texture, side: THREE.Side = THREE.FrontSide) => twoTone(new THREE.MeshLambertMaterial({ color: col, map: map ?? null, side }));
const pho = (col: THREE.ColorRepresentation, spec: THREE.ColorRepresentation, sh: number, map?: THREE.Texture) => twoTone(new THREE.MeshPhongMaterial({ color: col, specular: spec, shininess: sh, map: map ?? null }));

// ============================== textures ==============================
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
const grainTex = (key: string, base: string, n = 900, a = 0.06) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < n; i++) { const k = r(); g.fillStyle = k > 0.5 ? `rgba(255,255,240,${a * r()})` : `rgba(30,25,10,${a * 1.4 * r()})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 3 + r() * 26, 2 + r() * 12, r() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(170,110,70,${0.05 + r() * 0.08})`; g.fillRect(r() * 512, r() * 512, 1 + r() * 3, 1 + r() * 3); }
});
/** wood planks (horizontal boards along u), natural or painted */
const woodTex = (key: string, cols: string[], boards: number, w = 1024, h = 512) => ctex(key, w, h, (g, r) => {
  const bh = h / boards;
  for (let b = 0; b < boards; b++) {
    g.fillStyle = cols[b % cols.length]; g.fillRect(0, b * bh, w, bh);
    for (let i = 0; i < 26; i++) {           // grain
      g.strokeStyle = `rgba(80,45,20,${0.08 + r() * 0.14})`; g.lineWidth = 1 + r() * 2.5; g.beginPath();
      const y0 = b * bh + r() * bh; g.moveTo(0, y0);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, y0 + Math.sin(x * 0.01 + i) * bh * 0.06 + (r() - 0.5) * 2);
      g.stroke();
    }
    if (r() > 0.4) { const kx = r() * w, ky = b * bh + bh * (0.3 + r() * 0.4); g.fillStyle = "rgba(90,50,25,0.45)"; g.beginPath(); g.ellipse(kx, ky, 9 + r() * 8, 5 + r() * 4, 0, 0, TAU); g.fill(); }
    g.fillStyle = "rgba(40,22,10,0.75)"; g.fillRect(0, b * bh, w, 3);                         // board gap
    g.fillStyle = "rgba(255,240,210,0.18)"; g.fillRect(0, b * bh + 3, w, 2);
  }
});
/** stencilled text: letters with cut bridges (the classic army-stencil look) and a little worn paint */
const stencil = (g: CanvasRenderingContext2D, r: () => number, text: string, cx: number, cy: number, size: number, col: string, track = 0.06) => {
  const cv = document.createElement("canvas"); cv.width = Math.ceil(size * text.length * 0.9 + size); cv.height = Math.ceil(size * 1.4);
  const s = cv.getContext("2d")!;
  s.font = `900 ${size}px ${FONT}`; s.textBaseline = "middle"; s.fillStyle = col;
  const ws = [...text].map((c) => s.measureText(c).width);
  const tot = ws.reduce((a, b) => a + b, 0) + track * size * (text.length - 1);
  let x = (cv.width - tot) / 2; const y = cv.height / 2;
  [...text].forEach((c, i) => {
    s.globalCompositeOperation = "source-over"; s.fillText(c, x, y);
    if (!" ,.1:-".includes(c)) {                // bridges through the bowls (top + bottom)
      s.globalCompositeOperation = "destination-out";
      const mx = x + ws[i] / 2, bw = size * 0.075;
      if ("OD0RBPQSC8963GU".includes(c)) { s.fillRect(mx - bw / 2, y - size * 0.5, bw, size * 0.26); s.fillRect(mx - bw / 2, y + size * 0.24, bw, size * 0.26); }
      else if ("AMNWVHE".includes(c)) s.fillRect(mx - bw / 2, y - size * 0.06, bw * 0.9, size * 0.12);
    }
    x += ws[i] + track * size;
  });
  s.globalCompositeOperation = "destination-out";
  for (let i = 0; i < text.length * 40; i++) { s.fillStyle = `rgba(0,0,0,${0.3 + r() * 0.6})`; s.beginPath(); s.arc(r() * cv.width, r() * cv.height, 0.5 + r() * size * 0.03, 0, TAU); s.fill(); }
  g.drawImage(cv, cx - cv.width / 2, cy - cv.height / 2);
};
const crateFront = () => ctex("emu_crateF", 1024, 512, (g, r) => {
  const t = woodTex("emu_crateW", ["#c99b5f", "#bf9056", "#d0a466"], 3, 1024, 512);
  g.drawImage(t.image as HTMLCanvasElement, 0, 0);
  g.fillStyle = "rgba(60,35,15,0.15)"; g.fillRect(0, 0, 1024, 512);
  stencil(g, r, "10,000 RDS", 512, 230, 150, "#1d1a17", 0.04);
  stencil(g, r, ".303 BALL  MK VII", 512, 375, 58, "#1d1a17", 0.1);
  // broad arrow (government property mark)
  g.save(); g.translate(512, 95); g.fillStyle = "#1d1a17";
  g.fillRect(-7, -38, 14, 58); g.beginPath(); g.moveTo(0, -48); g.lineTo(-40, 6); g.lineTo(-28, 12); g.lineTo(0, -26); g.lineTo(28, 12); g.lineTo(40, 6); g.closePath(); g.fill(); g.restore();
  g.strokeStyle = "rgba(40,25,10,0.6)"; g.lineWidth = 10; g.strokeRect(5, 5, 1014, 502);
});
const crateSide = () => ctex("emu_crateS", 512, 512, (g, r) => {
  const t = woodTex("emu_crateW2", ["#c4955a", "#cfa265", "#b98c52"], 3, 512, 512);
  g.drawImage(t.image as HTMLCanvasElement, 0, 0);
  stencil(g, r, "WA", 256, 360, 120, "#1d1a17", 0.08);
  g.strokeStyle = "rgba(40,25,10,0.6)"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 502);
});
const crateTop = () => ctex("emu_crateT", 1024, 512, (g, r) => {
  const t = woodTex("emu_crateW3", ["#cfa165", "#c39457", "#d5aa6d", "#c8995c"], 4, 1024, 512);
  g.drawImage(t.image as HTMLCanvasElement, 0, 0);
  stencil(g, r, "AMMUNITION", 512, 256, 96, "rgba(29,26,23,0.85)", 0.08);
  g.fillStyle = "#3a3632"; for (const x of [40, 984]) for (const y of [60, 190, 320, 450]) { g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
});
const tireTex = () => ctex("emu_tire", 1024, 128, (g, r) => {
  g.fillStyle = "#2b2a2c"; g.fillRect(0, 0, 1024, 128);
  for (let i = 0; i < 32; i++) { const x = i * 32; g.fillStyle = "#1c1b1d"; g.fillRect(x + 4, 30, 10, 68); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(150,90,60,${0.05 + r() * 0.12})`; g.fillRect(r() * 1024, r() * 128, 2 + r() * 6, 1 + r() * 3); }
});
const hoodTex = () => ctex("emu_hood", 1024, 512, (g, r) => {
  const t = grainTex("emu_od2", "#5f6b33", 500, 0.035);
  for (let x = 0; x < 1024; x += 512) g.drawImage(t.image as HTMLCanvasElement, x, 0);
  // louvres (front half), stencil (rear half)
  for (let i = 0; i < 9; i++) { const x = 560 + i * 46; g.fillStyle = "#3e4720"; g.fillRect(x, 120, 22, 230); g.fillStyle = "rgba(220,230,170,0.35)"; g.fillRect(x + 22, 120, 5, 230); }
  stencil(g, r, "ARMY", 260, 210, 118, "#f1eedd", 0.1);
  stencil(g, r, "No. 17", 260, 335, 62, "#f1eedd", 0.12);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(185,110,70,${0.06 + r() * 0.14})`; g.fillRect(r() * 1024, 380 + r() * 132, 2 + r() * 8, 2 + r() * 10); } // red dust at the bottom
});
const grilleTex = () => ctex("emu_grille", 256, 256, (g) => {
  g.fillStyle = "#1b1d17"; g.fillRect(0, 0, 256, 256);
  for (let x = 6; x < 256; x += 16) { g.fillStyle = "#4a5330"; g.fillRect(x, 0, 6, 256); g.fillStyle = "rgba(200,210,160,0.25)"; g.fillRect(x, 0, 2, 256); }
});
const shroudTex = () => ctex("emu_shroud", 512, 256, (g, r) => {
  g.fillStyle = "#34383e"; g.fillRect(0, 0, 512, 256);
  for (let x = 0; x < 512; x += 16) { g.fillStyle = "#23262b"; g.fillRect(x, 0, 6, 256); g.fillStyle = "rgba(170,180,195,0.22)"; g.fillRect(x + 6, 0, 2, 256); }
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(160,120,90,${r() * 0.08})`; g.fillRect(r() * 512, r() * 256, 2 + r() * 5, 2 + r() * 12); }
});
const drumTop = () => ctex("emu_drumT", 512, 512, (g) => {
  g.fillStyle = "#3b4046"; g.fillRect(0, 0, 512, 512);
  g.translate(256, 256);
  for (let i = 0; i < 25; i++) { g.save(); g.rotate((i / 25) * TAU); g.fillStyle = "#2a2e33"; g.fillRect(70, -7, 170, 14); g.fillStyle = "rgba(190,200,215,0.3)"; g.fillRect(70, -9, 170, 3); g.restore(); }
  g.fillStyle = "#4b5158"; g.beginPath(); g.arc(0, 0, 64, 0, TAU); g.fill();
  g.strokeStyle = "#202327"; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, 64, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, 248, 0, TAU); g.stroke();
  g.fillStyle = "#c79a3e"; g.beginPath(); g.arc(150, 0, 12, 0, TAU); g.fill();   // a brass round showing in the feed: shows rotation
});
const woodGunTex = () => ctex("emu_wood", 512, 256, (g, r) => {
  g.fillStyle = "#9a5c32"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(60,28,12,${0.12 + r() * 0.2})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y0 = r() * 256; g.moveTo(0, y0); for (let x = 0; x <= 512; x += 32) g.lineTo(x, y0 + Math.sin(x * 0.012 + i) * 8); g.stroke(); }
  for (let i = 0; i < 20; i++) { g.fillStyle = `rgba(255,220,170,${r() * 0.12})`; g.fillRect(r() * 512, r() * 256, 40 + r() * 80, 3); }
});
const boardTex = () => ctex("emu_board", 2048, 1344, (g, r) => {
  // 6 painted planks, cricket-scoreboard green, weathered, nails
  const bh = 1344 / 6, greens = ["#1f5c3c", "#235f3e", "#1d5638", "#22603f", "#1e5a3b", "#245f40"];
  for (let b = 0; b < 6; b++) {
    g.fillStyle = greens[b]; g.fillRect(0, b * bh, 2048, bh);
    for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(10,30,18,${0.1 + r() * 0.15})`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y0 = b * bh + r() * bh; g.moveTo(0, y0); for (let x = 0; x <= 2048; x += 48) g.lineTo(x, y0 + Math.sin(x * 0.006 + i) * 7); g.stroke(); }
    for (let i = 0; i < 18; i++) { g.strokeStyle = `rgba(160,210,170,${0.05 + r() * 0.06})`; g.lineWidth = 2; g.beginPath(); const y0 = b * bh + r() * bh, x0 = r() * 2048; g.moveTo(x0, y0); g.lineTo(x0 + 80 + r() * 300, y0 + (r() - 0.5) * 6); g.stroke(); }
    g.fillStyle = "rgba(5,15,8,0.8)"; g.fillRect(0, b * bh - 3, 2048, 6);
    g.fillStyle = "rgba(170,220,180,0.16)"; g.fillRect(0, b * bh + 3, 2048, 3);
    for (const x of [70, 1024, 1978]) for (const k of [0.3, 0.7]) { g.fillStyle = "#14201a"; g.beginPath(); g.arc(x + (r() - 0.5) * 10, b * bh + bh * k, 7, 0, TAU); g.fill(); g.fillStyle = "rgba(150,90,50,0.5)"; g.beginPath(); g.arc(x + 3, b * bh + bh * k + 10, 4, 0, TAU); g.fill(); }
  }
  // chipped paint showing bare grey-brown wood
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${150 + r() * 30},${125 + r() * 20},${90},${0.5 + r() * 0.4})`; const x = r() * 2048, y = r() * 1344; g.beginPath(); g.ellipse(x, y, 4 + r() * 20, 2 + r() * 7, r() * 0.4, 0, TAU); g.fill(); }
  const paint = (txt: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = "left", tr = 0.04) => {
    g.save(); g.font = `900 ${size}px ${FONT}`; g.textBaseline = "middle"; g.textAlign = "left";
    const ws = [...txt].map((c) => g.measureText(c).width), tot = ws.reduce((a, b) => a + b, 0) + tr * size * (txt.length - 1);
    let cx = align === "center" ? x - tot / 2 : x;
    [...txt].forEach((c, i) => {
      g.save(); g.translate(cx + ws[i] / 2, y + (r() - 0.5) * size * 0.04); g.rotate((r() - 0.5) * 0.05);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillText(c, -ws[i] / 2 + size * 0.03, size * 0.035);  // painted shadow
      g.fillStyle = col; g.fillText(c, -ws[i] / 2, 0);
      // brush streaks
      g.globalCompositeOperation = "source-atop"; g.fillStyle = "rgba(120,100,60,0.12)";
      for (let k = 0; k < 6; k++) g.fillRect(-ws[i] / 2, -size * 0.5 + r() * size, ws[i], 2 + r() * 3);
      g.restore(); cx += ws[i] + tr * size;
    });
    g.restore();
  };
  // header: hand-painted cream + red
  paint("FINAL SCORE", 1024, 168, 200, "#f5e6b4", "center", 0.05);
  g.fillStyle = "#d84a2c"; g.fillRect(320, 286, 1408, 14);
  paint("CAMPION  W.A.  NOV 1932", 1024, 345, 56, "#f5e6b4", "center", 0.12);
  // rows (centres: emus y 576, army y 1056)
  paint("EMUS", 120, 600, 290, "#ffffff");
  paint("ARMY", 120, 1080, 290, "#ffffff");
  // a little painted emu footprint after EMUS, a little slouch hat after ARMY
  g.save(); g.translate(1080, 650); g.strokeStyle = "#f5e6b4"; g.lineWidth = 18; g.lineCap = "round";
  g.beginPath(); g.moveTo(0, 50); g.lineTo(0, -40); g.moveTo(0, 50); g.lineTo(-42, -22); g.moveTo(0, 50); g.lineTo(42, -22); g.stroke(); g.restore();
  g.save(); g.translate(1080, 1110); g.fillStyle = "#f5e6b4";
  g.beginPath(); g.ellipse(0, 22, 70, 16, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-8, -6, 40, 34, 0, Math.PI, TAU); g.fill();
  g.fillRect(-48, -4, 80, 22); g.fillStyle = "#23603f"; g.fillRect(-48, 4, 80, 6); g.restore();
  // number slots: dark recess with a white painted border + two hooks (plates hang on them)
  for (const cy of [576, 1056]) {
    const cx = 1632, w = 420, h = 446;
    g.fillStyle = "#0e2418"; g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.strokeStyle = "#f5e6b4"; g.lineWidth = 10; g.strokeRect(cx - w / 2 - 14, cy - h / 2 - 14, w + 28, h + 28);
  }
  g.fillStyle = "rgba(0,0,0,0.25)"; for (let y = 0; y < 1344; y += 2) if (r() > 0.97) g.fillRect(0, y, 2048, 1);
});
const plateTex = (n: string) => ctex("emu_plate" + n, 512, 512, (g, r) => {
  g.fillStyle = "#151617"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${90 + r() * 60},${70 + r() * 30},${50},${r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 2 + r() * 8, 2 + r() * 8); }
  g.font = `900 430px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#fbf8ee"; g.fillText(n, 256, 284);
  g.globalCompositeOperation = "source-atop"; for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(110,100,80,${0.06 + r() * 0.1})`; g.fillRect(0, r() * 512, 512, 2 + r() * 4); }
  g.globalCompositeOperation = "source-over";
  g.strokeStyle = "#5d5f60"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 500);
  g.fillStyle = "#9a9c9e"; for (const x of [70, 442]) { g.beginPath(); g.arc(x, 44, 14, 0, TAU); g.fill(); g.fillStyle = "#0a0a0a"; g.beginPath(); g.arc(x, 44, 7, 0, TAU); g.fill(); g.fillStyle = "#9a9c9e"; }
  for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(150,80,40,${0.2 + r() * 0.3})`; const x = r() < 0.5 ? r() * 40 : 472 + r() * 40; g.fillRect(x, r() * 512, 6 + r() * 20, 6 + r() * 30); }
});
const softTex = () => ctex("emu_soft", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const puffTex = () => ctex("emu_puff", 256, 256, (g, r) => {
  // a cartoon cloud puff: a few overlapping soft lobes with a darker underside
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU, x = 128 + Math.cos(a) * 48, y = 128 + Math.sin(a) * 40, R = 48 + r() * 20;
    const gr = g.createRadialGradient(x, y - 10, 0, x, y, R);
    gr.addColorStop(0, "rgba(255,255,255,0.95)"); gr.addColorStop(0.7, "rgba(235,235,235,0.75)"); gr.addColorStop(1, "rgba(220,220,220,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
  }
  const gr = g.createRadialGradient(128, 120, 0, 128, 128, 80); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 80, 0, TAU); g.fill();
});
const flashTex = () => ctex("emu_flash", 256, 256, (g) => {
  g.translate(128, 128);
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, 128); gl.addColorStop(0, "rgba(255,200,90,0.9)"); gl.addColorStop(0.35, "rgba(255,140,40,0.35)"); gl.addColorStop(1, "rgba(255,90,20,0)");
  g.fillStyle = gl; g.fillRect(-128, -128, 256, 256);
  g.fillStyle = "#ffb43a";
  g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU, R = i % 2 ? 34 : i % 4 ? 92 : 124; g.lineTo(Math.cos(a) * R, Math.sin(a) * R); } g.closePath(); g.fill();
  g.fillStyle = "#fff6c8";
  g.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + 0.2, R = i % 2 ? 22 : 62; g.lineTo(Math.cos(a) * R, Math.sin(a) * R); } g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(0, 0, 20, 0, TAU); g.fill();
});

// ============================== Lewis gun ==============================
type Gun = { g: THREE.Group; body: THREE.Group; drum: THREE.Mesh; spring: THREE.Group; springMesh: THREE.Mesh; muzzle: THREE.Object3D; port: THREE.Object3D };
type GunMats = { metal: THREE.Material; dark: THREE.Material; shroud: THREE.Material; wood: THREE.Material; drum: THREE.Material[]; spring: THREE.Material };
class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private r: number, private turns: number) { super(); }
  getPoint(t: number, o = new THREE.Vector3()) { const a = t * this.turns * TAU; return o.set(Math.cos(a) * this.r, t, Math.sin(a) * this.r); }
}
/** Lewis gun, local +x forward (muzzle), origin at the receiver centre; scaled by GUN_SCALE. footY: bipod foot height (local, unscaled) or null = folded */
const buildLewis = (M: GunMats, footY: number | null): Gun => {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const B = new Batch();
  // receiver: round body + lower trigger housing + rear cap
  B.add(M.metal, cylX(0.047, 0.047, 0.30, 28).translate(0.03, 0.005, 0));
  B.add(M.metal, box(0.27, 0.05, 0.07).translate(0.0, -0.035, 0));
  B.add(M.dark, cylX(0.05, 0.05, 0.025, 28).translate(-0.12, 0.005, 0));
  B.add(M.dark, box(0.12, 0.012, 0.03).translate(0.02, 0.053, 0));                     // feed post base under the drum
  // barrel shroud with fins, collars, front taper, barrel + muzzle
  B.add(M.shroud, cylX(0.06, 0.06, 0.62, 36).translate(0.49, 0, 0));
  B.add(M.dark, cylX(0.067, 0.067, 0.03, 36).translate(0.195, 0, 0));
  B.add(M.dark, cylX(0.065, 0.065, 0.025, 36).translate(0.79, 0, 0));
  B.add(M.metal, cylX(0.06, 0.032, 0.09, 32).translate(0.845, 0, 0));
  B.add(M.dark, cylX(0.014, 0.014, 0.09, 16).translate(0.93, 0, 0));
  B.add(M.metal, cylX(0.02, 0.02, 0.02, 16).translate(0.97, 0, 0));
  B.add(M.dark, box(0.012, 0.04, 0.008).translate(0.80, 0.08, 0));                     // front sight
  B.add(M.dark, box(0.03, 0.03, 0.02).translate(-0.085, 0.06, 0));                     // rear sight
  // cocking handle (right side, +z)
  B.add(M.metal, cylZ(0.008, 0.05, 10).translate(0.06, 0.0, 0.065));
  B.add(M.dark, new THREE.SphereGeometry(0.014, 12, 8).translate(0.06, 0.0, 0.094));
  // stock (side profile extruded) + butt plate, pistol grip, trigger guard + trigger
  const st = new THREE.Shape();
  st.moveTo(-0.12, 0.035); st.lineTo(-0.56, 0.008); st.lineTo(-0.585, -0.002); st.lineTo(-0.585, -0.125); st.lineTo(-0.565, -0.135);
  st.quadraticCurveTo(-0.4, -0.09, -0.26, -0.07); st.lineTo(-0.12, -0.05); st.closePath();
  B.add(M.wood, new THREE.ExtrudeGeometry(st, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 6 }).translate(0, 0, -0.025));
  B.add(M.dark, box(0.012, 0.15, 0.064).translate(-0.594, -0.063, 0));
  B.add(M.wood, box(0.045, 0.12, 0.042).translate(0, -0.06, 0).rotateZ(0.32).translate(-0.085, -0.06, 0));
  B.add(M.dark, new THREE.TorusGeometry(0.032, 0.0055, 6, 18, Math.PI).rotateZ(Math.PI).translate(-0.02, -0.062, 0));
  B.add(M.dark, box(0.008, 0.03, 0.006).rotateZ(-0.3).translate(-0.02, -0.07, 0));
  // bipod: clamp ring on the shroud + two legs (down to footY, or folded back under the shroud)
  B.add(M.dark, new THREE.TorusGeometry(0.064, 0.011, 8, 28).rotateY(Math.PI / 2).translate(0.70, 0, 0));
  for (const sz of [-1, 1]) {
    if (footY !== null) {
      const a: V3 = [0.70, -0.06, sz * 0.03], b: V3 = [0.80, footY + 0.01, sz * 0.17];
      B.add(M.dark, rod(a, b, 0.0095));
      B.add(M.dark, box(0.05, 0.012, 0.03).translate(b[0], b[1], b[2]));
    } else B.add(M.dark, rod([0.70, -0.06, sz * 0.03], [0.32, -0.075, sz * 0.04], 0.0095));
  }
  B.into(body);
  // drum (pan) magazine: rotates about y
  const dg = new THREE.CylinderGeometry(0.135, 0.135, 0.045, 48);
  const drum = new THREE.Mesh(dg, M.drum); drum.position.set(0.02, 0.085, 0); drum.castShadow = true; drum.receiveShadow = true; drum.frustumCulled = false;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.03, 24).translate(0, 0.03, 0), M.dark); hub.castShadow = true; hub.frustumCulled = false; drum.add(hub);
  body.add(drum);
  // the jam spring (hidden until it pops)
  const spring = new THREE.Group(); spring.position.set(-0.155, 0.035, 0); body.add(spring);
  const springMesh = new THREE.Mesh(new THREE.TubeGeometry(new Helix(0.026, 9), 240, 0.0042, 6), M.spring);
  springMesh.scale.set(1, 0.3, 1); springMesh.castShadow = true; springMesh.frustumCulled = false; springMesh.visible = false; spring.add(springMesh);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0.985, 0, 0); body.add(muzzle);
  const port = new THREE.Object3D(); port.position.set(-0.02, 0.01, 0.05); body.add(port);
  body.scale.setScalar(GUN_SCALE);
  g.traverse((o) => { o.frustumCulled = false; });
  return { g, body, drum, spring, springMesh, muzzle, port };
};
/** gun resting on bipod + butt on flat ground with the receiver at height H: returns [pitch, footY(local)] */
const restPose = (H: number): [number, number] => {
  let lo = 0, hi = 0.6;
  for (let i = 0; i < 40; i++) { const p = (lo + hi) / 2, yb = H + GUN_SCALE * (-0.565 * Math.sin(p) - 0.135 * Math.cos(p)); if (yb > 0) lo = p; else hi = p; }
  const p = (lo + hi) / 2;
  return [p, -(H + GUN_SCALE * 0.80 * Math.sin(p)) / (GUN_SCALE * Math.cos(p))];
};

// ============================== the props ==============================
type DebugIn = { propsCam?: { pos: V3; look: V3; fov?: number }; propsGround?: boolean };
export class Props {
  root = new THREE.Group();
  private farm = new THREE.Group(); private dam = new THREE.Group(); private office = new THREE.Group(); private board = new THREE.Group();
  private truck = new THREE.Group(); private truckBody = new THREE.Group(); private wheels: THREE.Group[] = [];
  private lineGuns: Gun[] = []; private lineGunG: THREE.Group[] = []; private crates: THREE.Group[] = [];
  private hideGun!: Gun; private hideMount = new THREE.Group();
  private truckGun!: Gun; private truckGunG = new THREE.Group();
  private phone = new THREE.Group(); private receiver = new THREE.Group();
  private plates: { pivot: THREE.Group; spin: THREE.Group }[] = [];
  private flashes: THREE.Sprite[] = []; private puffs: THREE.Sprite[] = []; private dust: THREE.Sprite[] = []; private casings: THREE.Mesh[] = [];
  private dbg: DebugIn = {}; private ground: THREE.Mesh | null = null;
  private gm: GunMats;
  private v = new THREE.Vector3(); private v2 = new THREE.Vector3();

  constructor() {
    const R = this.root;
    try { this.dbg = (getInputProps() as DebugIn) ?? {}; } catch { this.dbg = {}; }
    this.gm = {
      metal: pho("#454b54", "#6a717c", 45), dark: pho("#2c3036", "#555b64", 40), shroud: pho("#ffffff", "#505862", 35, shroudTex()),
      wood: lam("#ffffff", woodGunTex()), spring: pho("#cfd4da", "#ffffff", 90),
      drum: [pho("#3d4248", "#5b626c", 40), pho("#ffffff", "#666d77", 40, drumTop()), pho("#2e3237", "#444", 30)],
    };
    for (const grp of [this.farm, this.dam, this.office, this.board, this.truck]) { grp.visible = false; R.add(grp); }
    this.buildLineup(); this.buildHide(); this.buildTruck(); this.buildPhone(); this.buildBoard(); this.buildFx();
    if (this.dbg.propsGround) {
      this.ground = new THREE.Mesh(new THREE.PlaneGeometry(20000, 20000).rotateX(-Math.PI / 2), lam("#c8733f"));
      this.ground.receiveShadow = true; this.ground.frustumCulled = false; this.ground.position.y = -0.002; R.add(this.ground);
    }
    R.traverse((o) => { o.frustumCulled = false; });
  }

  // ---------------------------------- crates ----------------------------------
  private crateMats?: THREE.Material[]; private crateTrim?: THREE.Material;
  private crate() {
    if (!this.crateMats) {
      const f = lam("#ffffff", crateFront()), s = lam("#ffffff", crateSide()), t = lam("#ffffff", crateTop()), b = lam("#a07440");
      this.crateMats = [s, s, t, b, f, f]; this.crateTrim = lam("#9b6f3d");
    }
    const G = new THREE.Group();
    const W = 0.62, H = 0.32, D = 0.36;
    const m = new THREE.Mesh(new THREE.BoxGeometry(W, H, D).translate(0, H / 2, 0), this.crateMats); m.castShadow = true; m.receiveShadow = true; G.add(m);
    const B = new Batch(), tr = this.crateTrim!;
    for (const sz of [-1, 1]) {        // end cleats on the long faces + rope handles on the ends
      for (const sx of [-1, 1]) B.add(tr, box(0.045, H + 0.012, 0.02).translate(sx * (W / 2 - 0.0225), H / 2, sz * (D / 2 + 0.008)));
      B.add(lam("#cdb68a"), new THREE.TorusGeometry(0.05, 0.011, 6, 14, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2).translate(sz * (W / 2 + 0.012), H * 0.72, 0));
      B.add(tr, box(0.022, 0.05, 0.16).translate(sz * (W / 2 + 0.009), H * 0.72, 0));
    }
    B.add(tr, box(W + 0.01, 0.025, D + 0.01).translate(0, H - 0.008, 0));                  // lid rim
    B.into(G);
    return G;
  }

  // ---------------------------------- line-up (shot 6) ----------------------------------
  private buildLineup() {
    const [p, fy] = restPose(0.3);
    for (const pos of [LINEUP.gunA, LINEUP.gunB]) {
      const gun = buildLewis(this.gm, fy);
      const G = new THREE.Group(); G.position.set(...pos); G.rotation.y = LINEUP.gunYaw;
      gun.g.position.y = 0.3; gun.g.rotation.z = p; G.add(gun.g);
      this.farm.add(G); this.lineGuns.push(gun); this.lineGunG.push(G);
    }
    for (let i = 0; i < 4; i++) { const c = this.crate(); this.farm.add(c); this.crates.push(c); }
  }

  // ---------------------------------- ambush gun at HIDE ----------------------------------
  private buildHide() {
    const M = this.hideMount; M.position.set(...HIDE_GUN.pos); M.rotation.y = HIDE_GUN.yaw;
    const B = new Batch(), od = pho("#5d6838", "#3a3f2a", 20), dk = this.gm.dark;
    const headY = HIDE_GUN.pivotY - 0.072;
    B.add(dk, new THREE.CylinderGeometry(0.045, 0.05, 0.05, 20).translate(0, headY - 0.025, 0));
    B.add(od, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 14).translate(0, headY - 0.2, 0));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU, fx = Math.cos(a) * 0.62, fz = Math.sin(a) * 0.62;
      B.add(od, rod([0, headY - 0.32, 0], [fx, 0.02, fz], 0.022));
      B.add(dk, box(0.09, 0.02, 0.07).rotateY(-a).translate(fx, 0.01, fz));
    }
    B.into(M);
    this.hideGun = buildLewis(this.gm, null); this.hideGun.g.position.y = HIDE_GUN.pivotY; M.add(this.hideGun.g);
    const c = this.crate(); c.position.set(-0.5, 0, -0.75); c.rotation.y = 0.5; M.add(c);
    const c2 = this.crate(); c2.position.set(-0.9, 0, -0.2); c2.rotation.y = 1.4; M.add(c2);
    this.dam.add(M);
  }

  // ---------------------------------- truck ----------------------------------
  private buildTruck() {
    const T = this.truck, Bd = this.truckBody; T.add(Bd);
    const odTex = grainTex("emu_od2", "#5f6b33", 500, 0.035);
    const od = pho("#ffffff", "#3c4230", 18, odTex), odD = lam("#4d5729"), odDD = lam("#363d1f");
    const black = pho("#26272a", "#555", 30), chrome = pho("#c9ccd0", "#ffffff", 80), seat = pho("#6a4128", "#4a3020", 25);
    const deckW = lam("#ffffff", woodTex("emu_deck", ["#b08454", "#a57a4b", "#ba8d5c", "#a87d4e"], 4, 1024, 512));
    const sideW = lam("#ffffff", woodTex("emu_tside", ["#6c7a3c", "#677538", "#71803f"], 3, 1024, 256));
    const lens = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.2) });
    const B = new Batch();
    // chassis rails + cross members + bumper
    for (const sz of [-1, 1]) B.add(odDD, box(4.95, 0.13, 0.08).translate(-0.1, 0.62, sz * 0.38));
    for (const x of [2.1, 0.6, -0.9, -2.4]) B.add(odDD, box(0.08, 0.1, 0.76).translate(x, 0.62, 0));
    B.add(odD, box(0.09, 0.12, 1.74).translate(TRUCK.front - 0.03, 0.6, 0));
    for (const sz of [-1, 1]) B.add(odDD, box(0.24, 0.05, 0.05).translate(2.34, 0.6, sz * 0.38));
    // engine sump / gearbox block below the hood, exhaust
    B.add(black, box(1.1, 0.2, 0.5).translate(1.4, 0.55, 0));
    B.add(black, rod([0.8, 0.5, -0.3], [-2.4, 0.45, -0.3], 0.03));
    // hood: inner core, side panels (louvres + stencil, own uv), rounded top edges, centre hinge
    const hx0 = 0.6, hx1 = 2.16, hl = hx1 - hx0, hc = (hx0 + hx1) / 2;
    B.add(od, box(hl, 0.5, 0.74).translate(hc, 0.96, 0));
    const hoodM = [od, od, od, od, lam("#ffffff", hoodTex()), lam("#ffffff", hoodTex())];
    for (const sz of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(hl, 0.5, 0.024).translate(hc, 0.95, sz * 0.385), hoodM); m.castShadow = true; m.receiveShadow = true; Bd.add(m);
      B.add(od, cylX(0.075, 0.075, hl, 16).translate(hc, 1.21, sz * 0.32));
    }
    B.add(od, box(hl, 0.06, 0.64).translate(hc, 1.255, 0));
    B.add(odD, cylX(0.016, 0.016, hl + 0.02, 10).translate(hc, 1.29, 0));
    // radiator: shell frame around a recessed grille, filler cap, emblem
    const rx = 2.24;
    B.add(od, box(0.1, 0.08, 0.86).translate(rx, 1.39, 0));
    B.add(od, cylX(0.04, 0.04, 0.1, 16).rotateX(0).translate(rx, 1.42, 0));
    for (const sz of [-1, 1]) B.add(od, box(0.1, 0.76, 0.07).translate(rx, 1.0, sz * 0.395));
    B.add(od, box(0.1, 0.07, 0.86).translate(rx, 0.62, 0));
    const gr = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.7).rotateY(Math.PI / 2).translate(rx + 0.01, 1.0, 0), lam("#ffffff", grilleTex())); gr.receiveShadow = true; Bd.add(gr);
    B.add(chrome, cylX(0.028, 0.028, 0.05, 16).translate(rx, 1.46, 0));
    B.add(chrome, cylZ(0.045, 0.012, 20).rotateY(Math.PI / 2).translate(rx + 0.06, 1.31, 0));
    // headlights on a bar between the front fenders + side lamps
    B.add(odDD, cylZ(0.022, 1.3, 10).translate(2.3, 0.98, 0));
    for (const sz of [-1, 1]) {
      const hz = sz * 0.6;
      B.add(black, new THREE.SphereGeometry(0.13, 24, 14, 0, TAU, 0, Math.PI / 2).rotateZ(Math.PI / 2).translate(2.38, 1.08, hz));
      B.add(chrome, new THREE.TorusGeometry(0.128, 0.016, 8, 32).rotateY(Math.PI / 2).translate(2.38, 1.08, hz));
      B.add(lens, new THREE.CircleGeometry(0.118, 32).rotateY(Math.PI / 2).translate(2.385, 1.08, hz));
      B.add(odDD, rod([2.3, 0.98, hz], [2.3, 1.0, hz], 0.03));
      B.add(odDD, box(0.06, 0.1, 0.03).translate(2.3, 1.02, hz));
    }
    // fenders: arcs over the wheels (front ones sweep down into the running boards)
    const arc = (cx: number, cz: number, a0: number, a1: number, Rr: number, w: number) => {
      const s = new THREE.Shape(), n = 18;
      for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); const p = [Math.cos(a) * (Rr + 0.03), Math.sin(a) * (Rr + 0.03)]; i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]); }
      for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * (i / n); s.lineTo(Math.cos(a) * Rr, Math.sin(a) * Rr); }
      s.closePath();
      return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 4 }).translate(cx, TRUCK.wheelR, cz - w / 2);
    };
    const [ax0, ax1] = TRUCK.axles;
    for (const sz of [-1, 1]) {
      const z = sz * TRUCK.track;
      B.add(od, arc(ax0, z, 0.05, 2.75, 0.56, 0.28));
      B.add(od, box(0.5, 0.03, 0.28).rotateZ(-0.36).translate(ax0 - 0.68, 0.53, z));    // sweep down to the running board
      B.add(od, box(1.25, 0.035, 0.46).translate(0.25, 0.57, sz * 0.67));               // running board
      B.add(black, box(1.15, 0.008, 0.4).translate(0.25, 0.592, sz * 0.67));            // rubber tread on it
      B.add(od, box(0.22, 0.03, 0.42).translate(ax0 + 0.5, 0.67 + 0.005, sz * 0.62).rotateZ(0));
    }
    // cab: cowl + dash, open sides, seat, floor, bulkhead, windscreen, steering
    B.add(od, box(0.22, 0.72, 0.98).translate(0.5, 1.06, 0));
    B.add(od, box(0.26, 0.05, 1.0).translate(0.5, 1.43, 0));
    B.add(odD, box(0.02, 0.18, 0.7).translate(0.385, 1.28, 0));                            // dash panel
    for (const [z, k] of [[0.18, 0], [0.3, 1], [-0.1, 2]] as [number, number][]) B.add(k ? chrome : black, cylX(0.028, 0.028, 0.012, 16).translate(0.373, 1.29 + (k === 2 ? 0.02 : 0), z));
    B.add(odD, box(0.85, 0.03, 0.96).translate(0.0, 0.7, 0));                               // floor
    for (const sz of [-1, 1]) {
      B.add(od, box(0.85, 0.5, 0.035).translate(-0.02, 0.96, sz * 0.48));                   // low cab side
      B.add(odD, cylX(0.02, 0.02, 0.85, 8).translate(-0.02, 1.215, sz * 0.48));
    }
    B.add(od, box(0.06, 0.92, 1.0).translate(-0.42, 1.16, 0));                              // bulkhead behind the seat
    B.add(seat, box(0.42, 0.13, 0.9).translate(-0.12, 0.835, 0));                           // cushion top y 0.9
    B.add(seat, box(0.1, 0.5, 0.9).translate(-0.34, 1.16, 0));
    B.add(odD, box(0.36, 0.06, 0.8).translate(-0.12, 0.745, 0));                              // seat box
    for (const sz of [-1, 1]) { B.add(odDD, box(0.035, 0.56, 0.035).translate(0.6, 1.73, sz * 0.47)); B.add(chrome, new THREE.SphereGeometry(0.022, 10, 8).translate(0.6, 2.02, sz * 0.47)); }
    B.add(odDD, box(0.035, 0.035, 0.97).translate(0.6, 2.0, 0)); B.add(odDD, box(0.03, 0.03, 0.97).translate(0.6, 1.47, 0));
    const sw: V3 = [0.2, 1.33, 0.38];
    B.add(black, new THREE.TorusGeometry(0.17, 0.014, 8, 36).rotateY(Math.PI / 2).rotateZ(0.55).translate(...sw));
    B.add(black, rod([0.42, 1.05, 0.38], sw, 0.02));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.5; B.add(black, rod(sw, [sw[0] - Math.sin(a) * 0.15 * Math.sin(0.55), sw[1] + Math.cos(a) * 0.16, sw[2] + Math.sin(a) * 0.16], 0.008, 6)); }
    // tray: deck, bearers, dropsides, tailgate, headboard
    const tx0 = TRUCK.rear, tx1 = -0.48, tl = tx1 - tx0, tcx = (tx0 + tx1) / 2, dy = TRUCK.deckY;
    B.add(deckW, box(tl, 0.06, 1.9).translate(tcx, dy - 0.03, 0));
    for (let i = 0; i < 5; i++) B.add(odDD, box(0.07, 0.1, 1.86).translate(tx0 + 0.15 + i * (tl - 0.3) / 4, dy - 0.11, 0));
    for (const sz of [-1, 1]) {
      B.add(sideW, box(tl, 0.34, 0.04).translate(tcx, dy + 0.17, sz * 0.93));
      B.add(odDD, box(tl + 0.02, 0.04, 0.06).translate(tcx, dy + 0.35, sz * 0.93));
      for (let i = 0; i < 4; i++) B.add(odDD, box(0.05, 0.36, 0.06).translate(tx0 + 0.05 + i * (tl - 0.1) / 3, dy + 0.17, sz * 0.93));
    }
    B.add(sideW, box(0.04, 0.34, 1.82).translate(tx0 + 0.02, dy + 0.17, 0));
    B.add(odDD, box(0.06, 0.04, 1.9).translate(tx0 + 0.02, dy + 0.35, 0));
    B.add(od, box(0.05, 0.62, 1.86).translate(tx1 - 0.02, dy + 0.31, 0));
    B.add(odDD, box(0.07, 0.04, 1.9).translate(tx1 - 0.02, dy + 0.64, 0));
    // rear mudguards (flat, under the tray edge) + tail lamp
    for (const sz of [-1, 1]) B.add(odD, box(0.95, 0.025, 0.3).translate(ax1, dy - 0.17, sz * TRUCK.track));
    B.add(pho("#c8241c", "#fff", 60), box(0.03, 0.06, 0.08).translate(tx0 - 0.01, dy - 0.05, 0.75));
    // pedestal gun mount on the tray
    const gp = TRUCK.gun;
    B.add(odDD, new THREE.CylinderGeometry(0.16, 0.2, 0.05, 20).translate(gp[0], dy + 0.025, gp[2]));
    B.add(od, new THREE.CylinderGeometry(0.045, 0.055, gp[1] - dy - 0.12, 16).translate(gp[0], (gp[1] + dy) / 2 - 0.06, gp[2]));
    B.add(this.gm.dark, new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16).translate(gp[0], gp[1] - 0.097, gp[2]));
    for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; B.add(odDD, rod([gp[0], dy + 0.35, gp[2]], [gp[0] + Math.cos(a) * 0.3, dy + 0.02, gp[2] + Math.sin(a) * 0.3], 0.014)); }
    B.into(Bd);
    // tray load: one crate, a canvas kit bag
    const c = this.crate(); c.position.set(...TRUCK.crate); c.rotation.y = 0.1; Bd.add(c);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10).scale(1.6, 0.7, 1).translate(-2.25, dy + 0.13, -0.6), lam("#a89a6a")); bag.castShadow = true; Bd.add(bag);
    // pedestal Lewis gun (bipod folded) in its own group (clunks in on "bolt")
    this.truckGun = buildLewis(this.gm, null);
    this.truckGunG.position.set(...gp); this.truckGunG.add(this.truckGun.g); Bd.add(this.truckGunG);
    // spoked artillery wheels: tyre, steel band, felloe, 10 spokes, hub, cap
    const tyre = pho("#ffffff", "#333", 12, tireTex());
    for (const ax of TRUCK.axles) for (const sz of [-1, 1]) {
      const wg = new THREE.Group(), WB = new Batch(), Rr = TRUCK.wheelR;
      WB.add(tyre, new THREE.TorusGeometry(Rr - 0.075, 0.075, 14, 48));
      WB.add(odDD, new THREE.TorusGeometry(Rr - 0.15, 0.022, 8, 48));
      WB.add(od, cylZ(Rr - 0.17, 0.09, 40).translate(0, 0, 0).scale(1, 1, 1));
      WB.add(odDD, cylZ(0.09, 0.16, 20));
      WB.add(chrome, cylZ(0.055, 0.05, 16).translate(0, 0, sz * 0.09));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; WB.add(black, cylZ(0.012, 0.02, 6).translate(Math.cos(a) * 0.07, Math.sin(a) * 0.07, sz * 0.085)); }
      WB.into(wg);
      // spokes in front of the inner disc: separate batch so the disc stays flat
      const SB = new Batch();
      for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; SB.add(od, box(0.05, Rr - 0.25, 0.05).translate(0, 0.08 + (Rr - 0.25) / 2, 0).rotateZ(a).translate(0, 0, sz * 0.065)); }
      SB.into(wg);
      wg.position.set(ax, Rr, sz * TRUCK.track); T.add(wg); this.wheels.push(wg);
    }
    this.root.add(T);
  }

  // ---------------------------------- candlestick phone ----------------------------------
  private buildPhone() {
    const P = this.phone, B = new Batch();
    const bake = pho("#25252a", "#9a9aa8", 80), nickel = pho("#c8c2b4", "#ffffff", 90), brass = pho("#c79a44", "#fff1c0", 70), cord = lam("#4a3426");
    const S = 1.25; // cartoon scale (real ~0.3 m)
    const prof: [number, number][] = [[0.0005, 0], [0.066, 0], [0.068, 0.008], [0.062, 0.018], [0.045, 0.032], [0.028, 0.05], [0.019, 0.075], [0.016, 0.1], [0.015, 0.26], [0.02, 0.268], [0.021, 0.28], [0.0005, 0.284]];
    B.add(bake, new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40));
    B.add(nickel, new THREE.TorusGeometry(0.0185, 0.004, 8, 24).rotateX(Math.PI / 2).translate(0, 0.1, 0));
    B.add(nickel, new THREE.TorusGeometry(0.062, 0.004, 8, 40).rotateX(Math.PI / 2).translate(0, 0.016, 0));
    // mouthpiece: neck forward-up + flared horn (faces +x = toward the person / camera side)
    B.add(bake, rod([0, 0.28, 0], [0.04, 0.3, 0], 0.012, 12));
    const horn = new THREE.LatheGeometry([[0.0005, 0], [0.014, 0.0], [0.018, 0.02], [0.03, 0.045], [0.04, 0.055], [0.038, 0.058], [0.012, 0.05]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
    B.add(bake, horn.rotateZ(-Math.PI / 2 + 0.25).translate(0.035, 0.298, 0));
    B.add(nickel, new THREE.TorusGeometry(0.039, 0.0035, 8, 32).rotateY(Math.PI / 2).rotateZ(0.25).translate(0.094, 0.312, 0));
    // switch hook fork on the right side (+z)
    B.add(nickel, rod([0, 0.235, 0.012], [0, 0.24, 0.055], 0.0045, 8));
    B.add(nickel, rod([0, 0.24, 0.055], [0.012, 0.255, 0.062], 0.0035, 6)); B.add(nickel, rod([0, 0.24, 0.055], [-0.012, 0.255, 0.062], 0.0035, 6));
    // cord from the base to the receiver + off the back edge of the desk
    const cp = new THREE.CatmullRomCurve3([[0.0, 0.01, -0.06], [-0.05, 0.005, -0.12], [-0.12, 0.003, -0.2], [-0.25, 0.003, -0.24]].map((p) => new THREE.Vector3(...p)));
    B.add(cord, new THREE.TubeGeometry(cp, 30, 0.004, 6));
    B.into(P);
    // receiver hanging on the hook: earpiece cup up, cord out of the bottom
    const R = this.receiver, RB = new Batch();
    const rprof: [number, number][] = [[0.0005, -0.11], [0.012, -0.11], [0.014, -0.1], [0.013, -0.02], [0.02, -0.005], [0.03, 0.01], [0.032, 0.02], [0.0005, 0.022]];
    RB.add(bake, new THREE.LatheGeometry(rprof.map(([r, y]) => new THREE.Vector2(r, y)), 28));
    RB.add(brass, new THREE.TorusGeometry(0.014, 0.003, 6, 18).rotateX(Math.PI / 2).translate(0, -0.09, 0));
    const rc = new THREE.CatmullRomCurve3([[0, -0.11, 0], [0, -0.16, 0.01], [-0.01, -0.21, -0.02], [0, -0.235, -0.07]].map((p) => new THREE.Vector3(...p)));
    RB.add(cord, new THREE.TubeGeometry(rc, 20, 0.004, 6));
    RB.into(R);
    R.position.set(0, 0.255, 0.068); P.add(R);
    P.scale.setScalar(S);
    P.position.set(...PHONE); P.rotation.y = 0.35;
    P.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.office.add(P);
  }

  // ---------------------------------- scoreboard ----------------------------------
  private buildBoard() {
    const G = this.board, B = new Batch();
    G.position.set(SCORE[0], 0, SCORE[2]);
    const W = SCOREBOARD.w, H = SCOREBOARD.h, cy = SCOREBOARD.center[1];
    const post = lam("#ffffff", woodTex("emu_post", ["#8a6a48", "#7f6040"], 1, 256, 256)), trim = lam("#f0e4c0"), back = lam("#6b5a44");
    const face = lam("#ffffff", boardTex());
    const fm = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.06).translate(0, cy, 0.01), [back, back, back, back, face, back]);
    fm.castShadow = true; fm.receiveShadow = true; G.add(fm);
    // cream trim frame, proud of the face
    B.add(trim, box(W + 0.12, 0.08, 0.05).translate(0, cy + H / 2 + 0.02, 0.04)); B.add(trim, box(W + 0.12, 0.08, 0.05).translate(0, cy - H / 2 - 0.02, 0.04));
    for (const sx of [-1, 1]) B.add(trim, box(0.08, H + 0.12, 0.05).translate(sx * (W / 2 + 0.02), cy, 0.04));
    // little gable roof cap
    B.add(lam("#b8452e"), box(W + 0.4, 0.06, 0.34).rotateX(0.0).translate(0, cy + H / 2 + 0.1, 0.0));
    // posts (behind the board) + braces + cross rails
    for (const sx of [-1, 1]) {
      B.add(post, box(0.13, cy + H / 2 + 0.25, 0.13).translate(sx * 1.45, (cy + H / 2 + 0.25) / 2, -0.1));
      B.add(post, rod([sx * 1.45, 0.05, -0.7], [sx * 1.45, 1.4, -0.14], 0.04));
    }
    B.add(post, box(W - 0.3, 0.1, 0.06).translate(0, cy - 0.5, -0.06)); B.add(post, box(W - 0.3, 0.1, 0.06).translate(0, cy + 0.6, -0.06));
    // hooks for the number plates
    const hook = pho("#9a9c9e", "#fff", 60);
    const rowY = [cy + 1.05 - 576 / 640, cy + 1.05 - 1056 / 640], px = -W / 2 + 1632 / 640, ph = 0.66;
    for (const ry of rowY) for (const sx of [-1, 1]) B.add(hook, rod([px + sx * 0.2, ry + ph / 2 - 0.05, 0.04], [px + sx * 0.2, ry + ph / 2 - 0.02, 0.1], 0.008, 6));
    B.into(G);
    // number plates: pivot at the RIGHT hook (so "0" can slip off its left hook), spin group at the plate centre
    const plateM = (n: string) => { const f = lam("#ffffff", plateTex(n)), b = lam("#1b1c1d"); return [b, b, b, b, f, b]; };
    ["1", "0"].forEach((n, i) => {
      const pivot = new THREE.Group(); pivot.position.set(px + 0.2, rowY[i] + ph / 2 - 0.05, 0.085);
      const spin = new THREE.Group(); spin.position.set(-0.2, 0, 0); pivot.add(spin);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.62, ph, 0.016).translate(0, -ph / 2 + 0.06, 0), plateM(n)); m.castShadow = true; m.receiveShadow = true; spin.add(m);
      G.add(pivot); this.plates.push({ pivot, spin });
    });
    this.root.add(G);
  }

  // ---------------------------------- fx pools ----------------------------------
  private buildFx() {
    const sprite = (map: THREE.Texture, col: THREE.ColorRepresentation | THREE.Color, add: boolean, fog: boolean) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: col instanceof THREE.Color ? col : new THREE.Color(col), transparent: true, depthWrite: false, fog, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      s.layers.set(NOINK); s.frustumCulled = false; s.visible = false; this.root.add(s); return s;
    };
    for (let i = 0; i < 4; i++) { const s = sprite(i % 2 ? softTex() : flashTex(), i % 2 ? new THREE.Color(2.2, 1.3, 0.5) : new THREE.Color(2.6, 2.0, 1.2), true, false); s.renderOrder = 12; this.flashes.push(s); }
    for (let i = 0; i < 40; i++) { const s = sprite(puffTex(), "#ffffff", false, true); s.renderOrder = 10; this.puffs.push(s); }
    for (let i = 0; i < 70; i++) { const s = sprite(puffTex(), "#d39a6c", false, true); s.renderOrder = 9; this.dust.push(s); }
    const brass = pho("#d8a640", "#fff3c0", 80), cg = new THREE.CylinderGeometry(0.0075, 0.0075, 0.065, 8).rotateZ(Math.PI / 2);
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(cg, brass); m.visible = false; m.frustumCulled = false; m.castShadow = true; this.root.add(m); this.casings.push(m); }
  }

  // ---------------------------------- per frame ----------------------------------
  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    const dc = this.dbg.propsCam;
    if (dc) { cam.position.set(...dc.pos); cam.up.set(0, 1, 0); cam.lookAt(...dc.look); if (dc.fov) cam.fov = dc.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
    const f = Math.round(t * FPS);
    for (const s of this.flashes) s.visible = false;
    let nPuff = 0, nDust = 0;
    const puff = (x: number, y: number, z: number, size: number, op: number, col: string, dust = false) => {
      const pool = dust ? this.dust : this.puffs, i = dust ? nDust++ : nPuff++;
      if (i >= pool.length || op <= 0.003) return;
      const s = pool[i]; s.visible = true; s.position.set(x, y, z); s.scale.set(size, size * 0.85, 1);
      const m = s.material as THREE.SpriteMaterial; m.opacity = op; m.color.set(col); m.rotation = hh(i, 7) * TAU;
    };
    let nFlash = 0;
    const flash = (p: THREE.Vector3, size: number, seed: number) => {
      for (let k = 0; k < 2 && nFlash < this.flashes.length; k++) {
        const s = this.flashes[nFlash++]; s.visible = true; s.position.copy(p); s.scale.setScalar(size * (k ? 2.2 : 1) * (0.8 + 0.4 * hh(seed, k)));
        (s.material as THREE.SpriteMaterial).rotation = hh(seed, 3 + k) * TAU; (s.material as THREE.SpriteMaterial).opacity = k ? 0.55 : 1;
      }
    };
    for (const c of this.casings) c.visible = false;

    // ---- line-up (shot 6) ----
    this.farm.visible = id === 6;
    if (id === 6) {
      const L = lineupAt(id, t);
      const drop = (G: THREE.Object3D, base: V3, k: number, tl: number, H: number, sq = 0.14) => {
        G.visible = k > 0.001;
        const a = t - tl, sqz = a > 0 ? sq * Math.exp(-a * 9) * Math.cos(a * 26) : 0;
        G.position.set(base[0], base[1] + H * (1 - k) * (1 - k) * 1.0 + (k < 1 ? 0 : 0), base[2]);
        G.scale.set(1 + sqz * 0.5, Math.min(1, k * 5) * (1 - sqz), 1 + sqz * 0.5);
        if (a > 0 && a < 1.2) for (let j = 0; j < 4; j++) {                                 // dust puff on landing
          const u = a / 1.2, ang = hh(j, tl * 10) * TAU, d = 0.25 + 0.6 * Math.sqrt(u);
          puff(base[0] + Math.cos(ang) * d, base[1] + 0.08 + 0.25 * u, base[2] + Math.sin(ang) * d * 0.6 + 0.1, 0.35 + 0.6 * u, 0.55 * (1 - u) * smooth(a / 0.05), "#d9a77a", true);
        }
      };
      const kGun = (dly: number) => smooth((t - (W.guns - LEAD - 0.08 + dly)) / 0.18);
      [0, 0.16].forEach((dly, i) => drop(this.lineGunG[i], i ? LINEUP.gunB : LINEUP.gunA, kGun(dly), W.guns - LEAD - 0.08 + dly + 0.18, 5.5, 0.1));
      void L;
      const cb = LINEUP.crates, cyw = LINEUP.crateYaw;
      this.crates.forEach((c, i) => {
        const dly = i * 0.14, tl = W.bullets - LEAD - 0.08 + dly;
        const k = smooth((t - tl) / 0.18);
        c.rotation.y = cyw + (i % 2 ? 0.07 : -0.05) + (i === 3 ? 0.12 : 0);
        drop(c, [cb[0] + (i % 2 ? 0.03 : -0.02), cb[1] + i * 0.345, cb[2] + (i === 3 ? 0.03 : 0)], k, tl + 0.18, 5.5, 0.12);
      });
    }

    // ---- ambush gun (shots 8, 9) ----
    this.dam.visible = id === 8 || id === 9;
    if (this.dam.visible) {
      const G = this.hideGun, j = jamAt(id, t), t0 = shotStart(9), tj = W.jams - LEAD, a = t - tj;
      const firing = id === 9 && j.firing > 0;
      // drum ticks one notch per round while firing, gun shakes, recoils
      const rounds = id === 9 ? Math.max(0, (Math.min(t, tj) - t0) * 10) : 0;
      G.drum.rotation.y = -rounds * (TAU / 47);
      G.body.position.set(firing ? -0.012 * (f % 2) : 0, firing ? 0.004 * (hh(f, 1) - 0.5) : 0, firing ? 0.006 * (hh(f, 2) - 0.5) : 0);
      // jam: small clunk, then a sad sag muzzle-down
      const sag = id === 9 ? 0.16 * smooth((a - 0.45) / 0.55) + (a > 0 && a < 0.3 ? 0.03 * Math.sin(a * 40) * (1 - a / 0.3) : 0) : 0;
      G.g.rotation.z = -sag + 0.02;
      if (firing && f % 2 === 0) { G.muzzle.getWorldPosition(this.v); this.v2.set(Math.cos(HIDE_GUN.yaw), 0, -Math.sin(HIDE_GUN.yaw)); this.v.addScaledVector(this.v2, 0.12); flash(this.v, 0.42, f); }
      // spring: pops straight up on "jams", boings, then droops back over the stock
      const sp = G.springMesh;
      sp.visible = id === 9 && a > 0;
      if (sp.visible) {
        const out = smooth(a / 0.07);
        const L = (0.1 + 0.24 * out) * (1 + 0.45 * Math.exp(-a * 3.2) * Math.sin(a * 24));
        sp.scale.set(1, Math.max(0.02, L), 1);
        G.spring.rotation.z = 1.35 * smooth((a - 0.5) / 0.7) + 0.35 * Math.exp(-a * 2.5) * Math.sin(a * 13) * smooth(a / 0.15);
        G.spring.rotation.x = 0.15 * Math.sin(a * 7) * Math.exp(-a * 2);
      }
      // smoke: a grey puff out of the breech + a wisp from the muzzle on the jam; light muzzle smoke while firing
      if (id === 9) {
        G.port.getWorldPosition(this.v);
        if (a > 0) for (let k = 0; k < 9; k++) {
          const u = clamp01(a / 1.6), ang = hh(k, 11) * TAU;
          const px = this.v.x + Math.cos(ang) * 0.18 * u * (0.5 + hh(k, 12)), pz = this.v.z + Math.sin(ang) * 0.18 * u * (0.5 + hh(k, 12));
          puff(px - 0.15 * u, this.v.y + 0.05 + 0.6 * u * (0.6 + 0.6 * hh(k, 13)), pz, (0.18 + 0.5 * Math.sqrt(u)) * (0.7 + 0.5 * hh(k, 14)), 0.85 * (1 - u) ** 1.3 * smooth(a / 0.06), k % 3 ? "#8e8a92" : "#5e5a63");
        }
        G.muzzle.getWorldPosition(this.v2);
        for (let k = 0; k < 8; k++) {                                                        // muzzle smoke from each shot
          const te = t0 + k * 0.067; if (te > Math.min(t, tj)) break;
          const age = t - te, u = clamp01(age / 1.4);
          puff(this.v2.x + Math.cos(HIDE_GUN.yaw) * (0.15 + 0.25 * u), this.v2.y + 0.1 * u + 0.3 * u * u, this.v2.z - Math.sin(HIDE_GUN.yaw) * (0.15 + 0.25 * u), 0.12 + 0.35 * u, 0.45 * (1 - u) ** 1.5 * smooth(age / 0.05), "#d8d4dc");
        }
        // brass ejected to the right side, arcing and bouncing to the ground
        G.port.getWorldPosition(this.v);
        const yw = HIDE_GUN.yaw, rx = Math.sin(yw), rz = Math.cos(yw), fx = Math.cos(yw), fz = -Math.sin(yw);
        for (let k = 0; k < this.casings.length; k++) {
          const te = t0 + k * 0.1; if (te > Math.min(t, tj)) break;
          const age = t - te, c = this.casings[k];
          const vs = 1.4 + hh(k, 21) * 0.6, vu = 1.6 + hh(k, 22) * 0.8, vb = -0.4 + hh(k, 23) * 0.3;
          const tLand = (vu + Math.sqrt(vu * vu + 2 * 9.8 * this.v.y)) / 9.8, tt = Math.min(age, tLand);
          const y = Math.max(0.008, this.v.y + vu * tt - 4.9 * tt * tt);
          c.visible = true;
          c.position.set(this.v.x + rx * vs * tt + fx * vb * tt, y, this.v.z + rz * vs * tt + fz * vb * tt);
          c.rotation.set(tt * 25 * (1 + hh(k, 24)), yw + hh(k, 25), age < tLand ? tt * 30 : 0);
        }
      }
    }

    // ---- truck (shots 10, 11, 14) ----
    const q = truckPose(id, t);
    this.truck.visible = q.show;
    if (q.show) {
      const T = this.truck;
      T.position.set(q.x, q.y, q.z); T.rotation.set(0, q.yaw, 0);
      this.truckBody.position.y = q.bob; this.truckBody.rotation.set(q.roll, 0, q.pitch, "YXZ");
      for (const w of this.wheels) w.rotation.z = -q.s / TRUCK.wheelR;
      // gun: clunks onto its pedestal on "bolt" (shot 10), wobbles on the bumps, fires short bursts in shot 11
      const G = this.truckGun;
      if (id === 10) {
        const tb = W.bolt - LEAD - 0.22, k = smooth((t - tb) / 0.22), a = t - (tb + 0.22);
        this.truckGunG.visible = k > 0.001;
        this.truckGunG.position.set(TRUCK.gun[0], TRUCK.gun[1] + 1.4 * (1 - k) ** 2, TRUCK.gun[2]);
        this.truckGunG.scale.setScalar(Math.min(1, 0.2 + k * 2));
        G.g.rotation.z = a > 0 ? 0.08 * Math.exp(-a * 6) * Math.sin(a * 30) : 0;
      } else { this.truckGunG.visible = true; this.truckGunG.position.set(...TRUCK.gun); this.truckGunG.scale.setScalar(1); }
      if (id !== 10) G.g.rotation.z = 0.05 + 3 * q.pitch + 0.04 * Math.sin(q.s * 3.1);
      G.g.rotation.y = id === 11 ? 0.12 * Math.sin(t * 2.3) : 0;
      const burst = id === 11 && ((f >= 962 && f < 974) || (f >= 1003 && f < 1013) || (f >= 1040 && f < 1046));
      G.body.position.set(burst ? -0.012 * (f % 2) : 0, 0, 0);
      G.drum.rotation.y = -(id === 11 ? Math.max(0, Math.min(f, 974) - 962) + Math.max(0, Math.min(f, 1013) - 1003) + Math.max(0, Math.min(f, 1046) - 1040) : 0) * (TAU / 47) * 0.5;
      if (burst && f % 2 === 0) { T.updateMatrixWorld(true); G.muzzle.getWorldPosition(this.v); G.g.getWorldDirection(this.v2); flash(this.v, 0.4, f); }
      // dust trail from the rear wheels: particles emitted along the path (pure function of t)
      if (q.speed > 0.5) {
        const dt = 0.05, life = id === 11 ? 2.2 : 1.8, n = Math.min(this.dust.length - nDust, Math.floor(life / dt) * 2), now = Math.floor(t / dt);
        const amt = Math.min(1, q.speed / 8) * (id === 14 ? 0.55 : 1);
        for (let i = 0; i < n; i++) {
          const kk = now - (i >> 1), side = i & 1 ? 1 : -1, te = kk * dt, age = t - te;
          if (age < 0 || age > life) continue;
          const pe = truckPose(id, te), u = age / life;
          const lx = TRUCK.axles[1] - 0.35 - 0.6 * age, lz = side * (TRUCK.track + 0.15 + 0.5 * age * hh(kk, side + 3));
          const cs = Math.cos(pe.yaw), sn = Math.sin(pe.yaw);
          const wx = pe.x + lx * cs + lz * sn, wz = pe.z - lx * sn + lz * cs;
          const sz = (0.5 + 2.4 * Math.sqrt(u)) * (0.8 + 0.4 * hh(kk, side + 5)) * (0.6 + 0.4 * amt);
          puff(wx, 0.2 + 0.9 * u * (0.6 + 0.6 * hh(kk, side + 7)) + sz * 0.25, wz, sz, amt * 0.7 * (1 - u) ** 1.4 * smooth(age / 0.12), hh(kk, side + 9) > 0.5 ? "#d49565" : "#c47f55", true);
        }
      }
    }

    // ---- phone (shots 5, 15) ----
    this.office.visible = id === 5 || id === 15;
    if (this.office.visible) {
      let ring = 0;
      if (id === 5) for (const [a0, a1] of PHONE_RINGS) if (t >= a0 && t < a1) ring = Math.sin(Math.PI * (t - a0) / (a1 - a0)) ** 0.5;
      const P = this.phone, rt = t * 52;
      P.position.set(PHONE[0], PHONE[1] + ring * 0.014 * Math.abs(Math.sin(rt)), PHONE[2]);
      P.rotation.set(ring * 0.07 * Math.sin(rt * 1.07), 0.35 + ring * 0.05 * Math.sin(rt * 0.61), ring * 0.08 * Math.sin(rt * 0.93 + 1));
      this.receiver.rotation.set(ring * 0.25 * Math.sin(rt * 1.3), 0, ring * 0.2 * Math.sin(rt * 1.7 + 2));
      this.receiver.position.y = 0.255 + ring * 0.008 * Math.abs(Math.sin(rt * 1.9));
    }

    // ---- scoreboard (shot 17) ----
    this.board.visible = id === 17;
    if (id === 17) {
      const cues = [W.one, W.zero];
      this.plates.forEach((p, i) => {
        const t0 = cues[i] - 0.14, u = clamp01((t - t0) / 0.3), a = t - (t0 + 0.3);
        const e = u >= 1 ? 1 : 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;                // ease-out-back
        p.spin.visible = u > 0;
        p.spin.rotation.y = -2.5 * Math.PI * (1 - e);
        p.spin.scale.setScalar(smooth(u / 0.3));
        let rz = a > 0 ? 0.1 * Math.exp(-a * 3) * Math.sin(a * 10) : 0;
        if (i === 1) {                                                                       // the "0" slips off its left hook
          const ad = t - (W.zero + 0.55);
          if (ad > 0) rz += 0.42 * (1 - Math.exp(-ad * 7) * Math.cos(ad * 11));
        }
        p.pivot.rotation.z = -rz * (i === 1 ? -1 : 1);
      });
    }

    for (let i = nPuff; i < this.puffs.length; i++) this.puffs[i].visible = false;
    for (let i = nDust; i < this.dust.length; i++) this.dust[i].visible = false;
  }
}
