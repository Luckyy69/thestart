// OWNER: sets. Props for "Wrong Address", lit by the sets' own shader rigs (sets_kit.ts parkRig / gymRig).
//   GYM: the BAR CHART board on an easel at GYM+(2.1,0,-1.0), facing the lens (+z, turned toward the centre): title
//     "BRAIN FREEZE!", two 3D bars FAST (red, left) and SLOW (blue, right). The FAST bar starts level with SLOW and
//     on "Twice" (from W.twice - 0.05, the same moment as gymAt.chart) SPRINGS up to 2x with an overshoot; a "2x"
//     starburst badge scales in on top of it (from 0, a little later, no pop).
//   PARK: a bunch of 3 balloons tied to the cart's cone-sign pole (gentle sway), a few birds gliding over the skyline
//     (wing flaps), both deterministic in t. (BEAN's cone is a cast card; the mouth slab is mouth's.)
//
// CONTRACTS (world coordinates):
//   CHART: { base (easel foot centre), yaw (rad, 0 = facing +z), board centre c, unit normal n, w, h }.
//   chartAt(id, t) -> { fast (bar height factor 1..2, springy), badge (0..1 scale) } (pure in t).
//   BALLOONS_AT: the knot point on the pole.
import * as THREE from "three";
import { PARK, GYM, SHOTS, W, clamp01, smooth } from "./story";
import { ctex } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { V3, C3, Bat, TRS, MM, imat, parkRig, gymRig, otxt, rrect, star } from "./sets_kit";
import { CART_SIGN_POLE } from "./sets";

const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

// ============================================================ contracts
const CH = { x: 2.1, z: -1.0, yaw: -0.38, w: 1.0, h: 1.2, y0: 0.95, lean: 0.1 };
const CH_M = TRS(CH.x, 0, CH.z, CH.yaw);
const chN = V3(0, Math.sin(CH.lean), Math.cos(CH.lean)).applyAxisAngle(V3(0, 1, 0), CH.yaw);
const chC = V3(0, CH.y0 + CH.h / 2, -Math.sin(CH.lean) * (CH.y0 + CH.h / 2)).applyMatrix4(CH_M);
export const CHART = {
  base: add(GYM, CH.x, 0, CH.z), yaw: CH.yaw, c: add(GYM, chC.x, chC.y, chC.z), n: [chN.x, chN.y, chN.z] as C3, w: CH.w, h: CH.h,
};
/** a damped spring 0 -> 1 (zero start velocity, ~23 % overshoot) */
const spring = (s: number) => (s <= 0 ? 0 : 1 - Math.exp(-7 * s) * (Math.cos(15 * s) + (7 / 15) * Math.sin(15 * s)));
export const T_CHART = W.twice - 0.05;
export const chartAt = (id: number, t: number) => {
  if (id !== 4) return { fast: 1, badge: 0 };
  const s = t - T_CHART;
  return { fast: 1 + spring(s), badge: clamp01(spring(s - 0.18) * 1.0) };
};
export const BALLOONS_AT = CART_SIGN_POLE;

// ============================================================ textures
const boardTex = () => ctex("fzChartBoard", 1024, 1228, (g, r) => {
  g.fillStyle = "#fffdf6"; g.fillRect(0, 0, 1024, 1228);
  g.strokeStyle = "rgba(120,170,220,0.35)"; g.lineWidth = 3;
  for (let y = 60; y < 1228; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  for (let x = 60; x < 1024; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1228); g.stroke(); }
  g.fillStyle = "#3aaee0"; rrect(g, 60, 36, 904, 170, 30); g.fill(); g.lineWidth = 10; g.strokeStyle = "#1a2a4a"; g.stroke();
  otxt(g, "BRAIN FREEZE!", 512, 124, 104, "#ffffff", "#1a2a4a", 16);
  for (const [x, y] of [[110, 300], [920, 330]] as [number, number][]) { g.strokeStyle = "#7ad0ff"; g.lineWidth = 9; g.lineCap = "round"; for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; g.beginPath(); g.moveTo(x - Math.cos(a) * 34, y - Math.sin(a) * 34); g.lineTo(x + Math.cos(a) * 34, y + Math.sin(a) * 34); g.stroke(); } }
  // axes (the bars stand on the baseline at v = 0.82)
  g.strokeStyle = "#1a2a4a"; g.lineWidth = 12; g.lineCap = "round";
  g.beginPath(); g.moveTo(150, 260); g.lineTo(150, 1007); g.lineTo(930, 1007); g.stroke();
  for (let k = 1; k <= 4; k++) { const y = 1007 - k * 160; g.lineWidth = 6; g.beginPath(); g.moveTo(135, y); g.lineTo(165, y); g.stroke(); g.strokeStyle = "rgba(26,42,74,0.18)"; g.setLineDash([16, 14]); g.beginPath(); g.moveTo(170, y); g.lineTo(920, y); g.stroke(); g.setLineDash([]); g.strokeStyle = "#1a2a4a"; }
  otxt(g, "FAST", 360, 1090, 92, "#ff4a3a", "#1a2a4a", 12);
  otxt(g, "SLOW", 715, 1090, 92, "#3a8ae8", "#1a2a4a", 12);
  g.fillStyle = "rgba(26,42,74,0.55)"; g.font = "bold 34px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("kids with brain freeze", 512, 1180);
  void r;
});
const badgeTex = () => ctex("fzBadge2x", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = "#1a2a4a"; star(g, 256, 256, 250, 175, 12, 0); g.fill();
  g.fillStyle = "#ffd23a"; star(g, 256, 256, 228, 158, 12, 0); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(256, 256, 140, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = "#1a2a4a"; g.stroke();
  otxt(g, "2x", 256, 262, 190, "#ff3a4a", "#1a2a4a", 18);
});

// ============================================================ the chart (gym)
class Chart {
  root = new THREE.Group(); fast = new THREE.Group(); badge: THREE.Mesh;
  constructor() {
    const S = gymRig(), R = this.root;
    R.position.set(...GYM);
    const b = new Bat(), cast = new Bat();
    const wood = imat(S, { spec: 30, specK: 0.2 }), gloss = imat(S, { spec: 60, specK: 0.5, rim: 0.2 });
    const Bm = MM(CH_M, TRS(0, 0, 0, 0, -CH.lean)); // the board frame (leaning back about its foot line)
    // easel: two front legs, a back leg, a tray
    const at = (x: number, y: number, z: number) => V3(x, y, z).applyMatrix4(CH_M);
    // (qa2) the legs stand OUTSIDE the board's edges and the back leg meets it BEHIND the board (the chart is now a hero
    // close-up on "Twice": the old legs crossed in front of the board and the back leg cut through the title)
    for (const s of [-1, 1]) cast.rod(wood, at(s * 0.66, 0, 0.1), at(s * 0.6, 2.25, -0.2), 0.025, 6, "#c88a4a");
    cast.rod(wood, at(0, 0, -0.75), at(0, 2.0, -0.32), 0.025, 6, "#c88a4a");
    cast.box(wood, -0.65, CH.y0 - 0.06, -0.02, 0.65, CH.y0, 0.1, "#c88a4a", Bm);
    // board + frame (the canvas face sits 1 cm in front of the board)
    cast.rbox(gloss, CH.w + 0.06, CH.h + 0.06, 0.03, 0.012, MM(Bm, TRS(0, CH.y0 + CH.h / 2, -0.02)), "#ffd23a");
    b.plane(imat(S, { map: boardTex(), self: [0.12, 0.12, 0.12], spec: 30, specK: 0.1 }), CH.w, CH.h, MM(Bm, TRS(0, CH.y0 + CH.h / 2, -0.004)));
    // bars: base on the painted baseline (v 0.82 of the canvas from the top), SLOW fixed, FAST animated (scale y)
    const base = CH.y0 + CH.h * (1 - 1007 / 1228), unit = 0.28, bw = 0.2;
    const xs = (u: number) => (u / 1024 - 0.5) * CH.w;
    cast.rbox(gloss, bw, unit, 0.05, 0.02, MM(Bm, TRS(xs(715), base + unit / 2, 0.025)), "#4a92ec");
    const fb = new Bat();
    fb.rbox(gloss, bw, 1, 0.05, 0.004, TRS(0, 0.5, 0), "#ff5a4a");
    for (const m of fb.build(this.fast, true)) m.matrixAutoUpdate = true;
    this.fast.matrixAutoUpdate = false;
    this.fast.userData = { base: MM(Bm, TRS(xs(360), base, 0.025)), unit };
    R.add(this.fast);
    // the "2x" badge: NOINK, painted outline, scales in
    this.badge = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), new THREE.MeshBasicMaterial({ map: badgeTex(), transparent: true, depthWrite: false, toneMapped: true }));
    this.badge.layers.set(NOINK); this.badge.renderOrder = 4; this.badge.matrixAutoUpdate = false; R.add(this.badge);
    b.build(R); cast.build(R, true);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number) {
    const c = chartAt(id, t), u = this.fast.userData as { base: THREE.Matrix4; unit: number };
    const h = u.unit * c.fast;
    this.fast.matrix.copy(u.base).multiply(new THREE.Matrix4().makeScale(1, h, 1)); this.fast.matrixWorldNeedsUpdate = true;
    // the badge rides the bar top, a little in front of the board, with a slight wobble as it lands
    const k = c.badge, wob = Math.sin((t - T_CHART) * 18) * Math.exp(-(t - T_CHART) * 4) * 0.25 * k;
    this.badge.visible = k > 0.001;
    this.badge.matrix.copy(u.base).multiply(TRS(0.17, h + 0.08, 0.06, 0, 0, wob - 0.12, Math.max(0.001, k)));
    this.badge.matrixWorldNeedsUpdate = true;
  }
}

// ============================================================ park: balloons + birds
class Balloons {
  root = new THREE.Group(); items: { g: THREE.Group; str: THREE.Mesh; off: THREE.Vector3; ph: number }[] = [];
  constructor() {
    const S = parkRig(), R = this.root;
    const gloss = imat(S, { spec: 90, specK: 1.0, rim: 0.35 }), str = imat(S, {});
    const cols = ["#ff5a8a", "#5ac8ff", "#ffd23a"], offs = [V3(-0.2, 0.75, 0.05), V3(0.08, 0.95, -0.05), V3(0.28, 0.7, 0.08)];
    cols.forEach((col, i) => {
      const g = new THREE.Group(), bb = new Bat();
      bb.sph(gloss, TRS(0, 0.17, 0, 0, 0, 0, [0.15, 0.18, 0.15]), 20, col);
      bb.add(new THREE.ConeGeometry(0.025, 0.04, 8), gloss, TRS(0, -0.01, 0), col);
      for (const m of bb.build(g, true)) m.matrixAutoUpdate = true;
      R.add(g);
      const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4), str);
      (sm.geometry as THREE.BufferGeometry).setAttribute("color", new THREE.Float32BufferAttribute(new Array((sm.geometry as THREE.BufferGeometry).getAttribute("position").count * 3).fill(0.95), 3));
      R.add(sm);
      this.items.push({ g, str: sm, off: offs[i], ph: i * 1.7 });
    });
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(t: number) {
    const k = V3(...BALLOONS_AT);
    for (const it of this.items) {
      const sx = Math.sin(t * 1.1 + it.ph) * 0.06, sz = Math.cos(t * 0.8 + it.ph * 1.3) * 0.04;
      const p = k.clone().add(V3(it.off.x + sx, it.off.y, it.off.z + sz));
      it.g.position.copy(p); it.g.rotation.set(sz * 1.5, 0, -sx * 1.5);
      const d = p.clone().sub(k), L = d.length();
      it.str.position.copy(k).addScaledVector(d, 0.5); it.str.scale.set(1, L, 1);
      it.str.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
    }
  }
}
class Birds {
  mesh: THREE.InstancedMesh; n = 7;
  constructor(parent: THREE.Object3D) {
    // one bird = two wing quads hinged at the body (flap by scaling the y of the instance)
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -1, 0.35, 0.1, -0.45, 0.15, -0.2, 0, 0, 0, 1, 0.35, 0.1, 0.45, 0.15, -0.2], 3));
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: "#3a2a3a", side: THREE.DoubleSide, fog: false }), this.n);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; parent.add(this.mesh);
  }
  update(t: number) {
    const m = new THREE.Matrix4();
    for (let i = 0; i < this.n; i++) {
      const ph = i * 0.9, x = -40 + ((t * 2.2 + i * 3.1) % 80) - (i % 3) * 2, y = 24 + (i % 3) * 2 + Math.sin(t * 0.7 + ph) * 0.8, z = -60 - (i % 4) * 3;
      const flap = 0.35 + 0.65 * Math.abs(Math.sin(t * 6 + ph)), s = 0.8 + (i % 2) * 0.2;
      m.compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, 0.2, 0)), V3(s, s * (flap * 2 - 0.6), s));
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ============================================================ Props (the world calls update(id, t, f, cam))
export class Props {
  root = new THREE.Group();
  private chart = new Chart();
  private balloons = new Balloons();
  private park = new THREE.Group();
  private birds: Birds;
  constructor() {
    this.park.position.set(...PARK);
    this.birds = new Birds(this.park);
    this.root.add(this.chart.root, this.balloons.root, this.park);
  }
  update(id: number, t: number, _f: number, _cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    this.chart.root.visible = place === "gym";
    this.balloons.root.visible = this.park.visible = place === "park";
    if (place === "gym") this.chart.update(id, t);
    if (place === "park") { this.balloons.update(t); this.birds.update(t); }
    void smooth;
  }
}
