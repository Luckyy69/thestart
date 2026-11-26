// OWNER: sets. Bed props for "The Falling Jolt Before Sleep", lit by the BEDROOM's own shader rig (sets.ts roomRig):
//   - the LEAF (shot 5, leafAt): a big glossy jungle leaf appears near the ceiling (scales in), see-saws down like a
//     real falling leaf (pendulum sway + roll, slowing as it lands) and settles on the pillow beside BEAN's head by
//     "in" with a tiny rock. A faint warm golden glow (NOINK) rides with it: a breath of jungle sunset in the blue room.
//   - a PLUSH MONKEY sitting at the bed's foot corner against the wall (it hops on every BEAN jolt: duvetAt).
//   - a glass of water on the nightstand (its water sloshes on jolts).
// CONTRACTS (world): LEAF_REST = BEDROOM + (-1.0, 0.705, -0.13) (on the pillow, left of / in front of BEAN's head);
//   the leaf starts at BEDROOM + (-0.45, 2.45, -0.25) and is ~0.3 m long. Plush monkey at BEDROOM + (0.78, 0.6, -1.12).
import * as THREE from "three";
import { BEDROOM, SHOTS, W, leafAt, clamp01 } from "./story";
import { roomRig, imat, Bat, TRS, V3, Glows, duvetAt, C3 } from "./sets";
import { ctex } from "../bridge/paint";

const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];
export const LEAF_REST = add(BEDROOM, -1.04, 0.73, 0.2);
export const LEAF_START = add(BEDROOM, -0.45, 2.45, -0.25);
export const PLUSH = add(BEDROOM, 0.78, 0.6, -1.12);

/** the leaf painting: rich green, lighter midrib + side veins, a sun-gold edge */
const leafTex = () => ctex("jeLeafJungle", 512, 512, (g) => {
  const gr = g.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, "#2f9a3a"); gr.addColorStop(0.6, "#4cc04a"); gr.addColorStop(1, "#8ade5a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  const rg = g.createRadialGradient(256, 256, 120, 256, 256, 300); rg.addColorStop(0, "rgba(255,230,120,0)"); rg.addColorStop(1, "rgba(255,210,90,0.55)");
  g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#d8f5a0"; g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(256, 512); g.lineTo(256, 20); g.stroke();
  g.lineWidth = 6;
  for (let k = 0; k < 7; k++) {
    const y = 440 - k * 58;
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(256, y); g.quadraticCurveTo(256 + s * 90, y - 40, 256 + s * 200, y - 110 + k * 6); g.stroke(); }
  }
  g.fillStyle = "rgba(255,255,255,0.14)"; g.beginPath(); g.ellipse(200, 250, 40, 150, 0.2, 0, 7); g.fill();
});
/** a pointed leaf blade (XY plane, stem at origin, tip +y), cupped a little along the midrib, with a short stem */
const leafGeo = () => {
  const L = 0.22, w = 0.075, sh = new THREE.Shape();
  sh.moveTo(0, 0); sh.bezierCurveTo(w * 1.3, L * 0.2, w * 1.1, L * 0.75, 0, L); sh.bezierCurveTo(-w * 1.1, L * 0.75, -w * 1.3, L * 0.2, 0, 0);
  const g = new THREE.ShapeGeometry(sh, 20);
  const p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    uv.setXY(i, 0.5 + x / (2.6 * w), y / L);
    p.setZ(i, 0.35 * x * x / w + 0.03 * Math.sin((y / L) * Math.PI));   // cupped + arched
  }
  g.computeVertexNormals();
  return g;
};
export class Props {
  root = new THREE.Group();
  private leaf = new THREE.Group(); private leafGlow: Glows;
  private plush = new THREE.Group(); private water: THREE.Mesh;
  constructor() {
    const S = roomRig(), R = this.root;
    R.position.set(...BEDROOM);
    const plain = imat(S, {}), gloss = imat(S, { spec: 60, specK: 0.45 }), glass = imat(S, { col: "#cfe6ff", spec: 90, specK: 1.2 });
    // ---- the leaf ----
    {
      const lb = new Bat();
      lb.add(leafGeo(), imat(S, { map: leafTex(), spec: 50, specK: 0.5, self: [0.1, 0.13, 0.06] }));
      lb.rod(plain, V3(0, -0.045, 0.004), V3(0, 0.005, 0.004), 0.004, 5, "#5a8a2a");
      lb.build(this.leaf);
      this.leafGlow = new Glows(this.leaf, [{ p: V3(0, 0.1, 0.02), c: [0.3, 0.22, 0.07], s: 0.55, g: 0 }], 0.3);
      this.leaf.visible = false; R.add(this.leaf);
    }
    // ---- plush monkey (brown, tan face + belly, big ears, long arms hugging its knees) ----
    {
      const pb = new Bat(), BR = "#8a5428", TAN = "#f0c89a";
      pb.sph(plain, TRS(0, 0.11, 0, 0, 0, 0, [0.1, 0.11, 0.085]), 16, BR);
      pb.sph(plain, TRS(0, 0.1, 0.06, 0, 0, 0, [0.065, 0.07, 0.035]), 14, TAN);
      pb.sph(plain, TRS(0, 0.27, 0.01, 0, 0, 0, [0.09, 0.085, 0.08]), 16, BR);
      pb.sph(plain, TRS(0, 0.255, 0.065, 0, 0, 0, [0.065, 0.05, 0.035]), 14, TAN);
      for (const s of [-1, 1]) {
        pb.sph(plain, TRS(s * 0.095, 0.29, 0.0, 0, 0, 0, [0.038, 0.042, 0.02]), 12, BR);
        pb.sph(plain, TRS(s * 0.098, 0.29, 0.012, 0, 0, 0, [0.024, 0.027, 0.012]), 10, TAN);
        pb.sph(gloss, TRS(s * 0.03, 0.29, 0.082, 0, 0, 0, 0.013), 8, "#1a1210");
        pb.tube(plain, [V3(s * 0.08, 0.17, 0.02), V3(s * 0.1, 0.09, 0.09), V3(s * 0.03, 0.06, 0.13)], 0.022, 10, BR, 6);
        pb.sph(plain, TRS(s * 0.05, 0.03, 0.1, 0, 0, 0, [0.04, 0.03, 0.05]), 10, BR);
      }
      pb.tube(plain, [V3(0, 0.05, -0.08), V3(0.1, 0.03, -0.14), V3(0.17, 0.1, -0.12), V3(0.16, 0.18, -0.06)], 0.014, 16, BR, 6);
      pb.tube(plain, [V3(-0.02, 0.24, 0.083), V3(0, 0.233, 0.09), V3(0.02, 0.24, 0.083)], 0.004, 6, "#3a1a10", 4);
      pb.build(this.plush);
      this.plush.position.set(PLUSH[0] - BEDROOM[0], PLUSH[1] - BEDROOM[1], PLUSH[2] - BEDROOM[2]);
      this.plush.rotation.y = -0.35; R.add(this.plush);
    }
    // ---- glass of water on the nightstand ----
    {
      const gb = new Bat(), gx = -1.45, gz = -1.0, top = 0.6;
      gb.lathe(glass, [[0.001, 0], [0.032, 0], [0.036, 0.11], [0.034, 0.11], [0.03, 0.006], [0.001, 0.006]], TRS(gx, top, gz), 20);
      gb.build(R);
      this.water = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.029, 0.07, 20), imat(S, { col: "#7ab8ff", spec: 80, specK: 1.0, self: [0.04, 0.06, 0.1] }));
      const wg = this.water.geometry; wg.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(wg.getAttribute("position").count * 3).fill(1), 3));
      this.water.position.set(gx, top + 0.042, gz); R.add(this.water);
    }
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, _f: number, _cam: THREE.Camera) {
    const inRoom = SHOTS[id - 1].place === "bedroom";
    this.root.visible = inRoom;
    if (!inRoom) return;
    // jolt reactions: plush hops + tilts, water sloshes
    const dv = duvetAt(id, t), hop = Math.max(0, dv.lift) / 0.3;
    this.plush.position.y = PLUSH[1] - BEDROOM[1] + 0.22 * hop + Math.min(0, dv.lift) * 0.15;
    this.plush.rotation.set(-0.25 * hop, -0.35 + 0.4 * hop, 0.3 * hop * Math.sin(t * 20));
    this.water.rotation.set(0.12 * dv.flap * Math.sin(t * 23), 0, 0.12 * dv.flap * Math.cos(t * 19));
    // the leaf
    const la = leafAt(id, t);
    this.leaf.visible = la.show > 0.001;
    if (!this.leaf.visible) return;
    const u = la.fall, S0 = V3(LEAF_START[0] - BEDROOM[0], LEAF_START[1] - BEDROOM[1], LEAF_START[2] - BEDROOM[2]);
    const E = V3(LEAF_REST[0] - BEDROOM[0], LEAF_REST[1] - BEDROOM[1], LEAF_REST[2] - BEDROOM[2]);
    const damp = Math.pow(1 - u, 0.8), ph = u * Math.PI * 3.4;
    const p = S0.clone().lerp(E, u);
    p.x += 0.26 * Math.sin(ph) * damp;
    p.y += 0.06 * Math.abs(Math.sin(ph)) * damp;              // each swing ends with a little lift (see-saw glide)
    p.z += 0.05 * Math.cos(ph * 0.5) * damp;
    // orientation: tilted to face the camera while gliding, rolling with the swing; at rest it leans on the pillow
    const tLand = W.saved - 0.2 + (W.in - W.saved + 0.15), dl = Math.max(0, t - tLand);
    const rock = u >= 1 ? 0.07 * Math.sin(dl * 9) * Math.exp(-dl * 3.5) : 0;
    const rx = -0.35 + (-0.5 + 0.35) * u, rz = 0.75 * Math.cos(ph) * damp + 0.8 * u + rock, ry = 0.6 * damp + 0.25 * u;
    this.leaf.position.copy(p);
    this.leaf.rotation.set(rx, ry, rz, "YXZ");
    const sc = Math.max(0.001, la.show) * 1.55;
    this.leaf.scale.setScalar(sc);
    this.leafGlow.gk.set(0.35 + 0.65 * clamp01(1 - u * 0.75), 1, 1, 1);
  }
}
