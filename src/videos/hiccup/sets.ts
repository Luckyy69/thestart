// OWNER: sets. "Hiccups Come From Tadpoles": BEAN's golden-morning KITCHEN and the 1922 Iowa hog FARM. All new.
//
// KITCHEN lights itself with its OWN small shader rig (the world's lights never touch these materials, technique from
// tickle/sets.ts): a cool-blue-from-above / warm-from-below ambient, painted room AO, up to 10 soft point lights and a
// LOW SUN THROUGH THE LEFT SIDE WINDOW: per pixel a point is sunlit only if the ray toward the sun passes the window
// aperture minus its 3 x 2 glazing bars (+ a soft leaf dapple), so the sun lays one big golden window-shaped patch with
// bar stripes across the plain back wall behind BEAN. Inside that patch:
//   - the TADPOLE SHADOW (shot 1, story.shadowAt): an analytic tadpole silhouette (wiggling tail) that removes the sun;
//   - the light that passes through the FISH TANK is tinted aqua with moving caustics (the band behind BEAN's waist).
// The world's sun shadow map still darkens the rig (cast cards keep their shadows). A ray-marched haze shaft (NOINK,
// additive) shows the bars in the air, dust motes glow only in the sun. The rig follows SHOTS (kitchen / xray).
// FARM is outdoors and uses the world's two-tone materials (shade.ts twoTone) so it follows the farm / peak looks and
// takes the cards' long shadows; the far skyline, the sun glow and dust are self-lit and tinted per look here.
// Time-lapse (osborneAt): the calendar pages tear off and fly per year, the pad gets thinner, the barn + fence weather,
// a sapling grows into a big tree, the windmill spins up.
//
// CONTRACTS (LOCAL to the place anchor, metres; world = anchor + local):
//   KITCHEN = (0,0,0). Floor y 0, back wall z -0.95, side walls x +-2.8, ceiling 2.7, open toward +z (floor to z 4.6).
//     COUNTER along the back wall x -2.8..1.95, top y 0.92, z -0.95..-0.30 (centre line z -0.62), cabinet fronts z -0.33.
//     BEAN stands at (0,0,0): floor clear x -1.0..1.2, z -0.28..2.0. The counter top x -0.25..0.25 is kept free (can).
//     FISH TANK on the counter: glass x -0.95..-0.35, y 0.94..1.34, z -0.78..-0.46 (front glass z -0.46), water to
//       y 1.30; a goldfish + a little tadpole swim inside. Centre TANK = (-0.65, 1.14, -0.62).
//     PLAIN WALL behind BEAN: x -1.25..1.25, y 1.40..2.40 (cream plaster; backsplash tiles below 1.40). The sun patch
//       covers x ~-1.0..1.2, y ~1.0..2.35. TADPOLE SHADOW: head centre (-1.25 + 2.6 * shadowAt.x, 1.92), head radius
//       0.2, ~0.85 m long, swims toward +x, drawn ON the wall (z -0.95), only inside the sun patch.
//     Kettle (0.98, 0.92, -0.70), fruit bowl (0.45, 0.92, -0.76), toaster (1.6, 0.92, -0.72), sink x -2.2..-1.62,
//     FRIDGE (pale yellow, magnets) x 1.98..2.76, z -0.95..-0.24, top 1.78. Upper cabinet x 1.3..1.95, y 1.5..2.4.
//     SIDE WINDOW in the left wall x -2.8: z 0.2..1.6, y 1.05..2.45. Breakfast table (-1.85, 0, 1.15) r 0.42.
//   FARM = (-3000,0,0). Ground y 0 (dusty yard disc r ~10 round (-0.5, 0, 0.5) on dry pasture).
//     Osborne stands at (0,0,0). RED BARN (gambrel) front wall z -2.2, x -4.4..1.0, eaves 3.5, ridge 6.5, depth to
//       z -11.5; door opening x -3.6..-1.6 (one leaf half-closed over x -2.6..-1.6). Hayloft door x -2.2..-1.2.
//     CALENDAR on the barn wall: page centre (-0.55, 1.745, -2.15), page 0.54 x 0.55 (year number ~0.2 m tall),
//       board x -0.86..-0.24, y 1.42..2.28, header y 2.04..2.24. Page shows osborneAt.year; pages fly off per year.
//     HOG SCALE platform x 0.15..1.45, z -0.75..0.15, deck top y 0.18 (the hog card stands at (0.8, 0.18, -0.3));
//       low rails along the back (z -0.72, posts at x 0.15 and 1.42) and the right side (x 1.42). The props scale
//       column (foot (0.95, 0, -0.98), dial (0.95, 1.27, -0.94)) stands just behind the back rail: kept clear.
//     Kept clear for props: corn sacks x -2.0..-0.7, z -1.25..-0.78; open sack (-0.8, 0, 0.22).
//     White fences: z -2.4 from x 1.0 to 14, and x 3.6 from z -2.4 to 2.5 (pen). Feed trough (2.6, 0, -1.5).
//     Windmill (8.5, 0, -11), silo (-6.4, 0, -8.2), growing tree (3.4, 0, -4.4), corn fields x>4.5 z<-3.2, x<-9.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { KITCHEN, FARM, SHOTS, LOOK_RAMPS, Look, W, smooth, clamp01, camAt, shadowAt, osborneAt } from "./story";
import { LOOKS } from "./looks";

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type C3 = [number, number, number];
const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];

/** exported contract points (world coordinates) */
export const BEAN_SPOT = add(KITCHEN, 0, 0, 0);
export const COUNTER_TOP = add(KITCHEN, 0, 0.92, -0.62);
export const TANK = add(KITCHEN, -0.65, 1.14, -0.62);
export const TANK_BOX = { min: add(KITCHEN, -0.95, 0.94, -0.78), max: add(KITCHEN, -0.35, 1.34, -0.46) };
export const TADPOLE_SHADOW_Y = 1.92;
export const OSBORNE_SPOT = add(FARM, 0, 0, 0);
export const HOG_SPOT = add(FARM, 0.8, 0.18, -0.3);
export const SCALE_DECK = { min: add(FARM, 0.15, 0.18, -0.75), max: add(FARM, 1.45, 0.18, 0.15) };
export const CALENDAR = add(FARM, -0.55, 1.745, -2.15);

// ============================================================ geometry helpers (vertex colours, merged batches)
const WHITE = new THREE.Color(1, 1, 1);
const clean = (g: THREE.BufferGeometry, col?: THREE.Color) => {
  const s = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  const n = out.getAttribute("position").count;
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  const c = col ?? WHITE, ca = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
  out.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
  return out;
};
const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | C3 = 1) => {
  const sc = typeof s === "number" ? V3(s, s, s) : V3(...s);
  return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), sc);
};
const C = (h?: string) => (h ? new THREE.Color(h) : undefined);
/** box with uvs in metres per face */
const boxM = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < p.count; i++) {
    const X = p.getX(i) + cx, Y = p.getY(i) + cy, Z = p.getZ(i) + cz, ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > 0.5) uv.setXY(i, X, -Z); else if (ax > 0.5) uv.setXY(i, Z, Y); else uv.setXY(i, X, Y);
  }
  g.translate(cx, cy, cz);
  return g;
};
class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4, col?: string) {
    const c = clean(g, C(col)); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, col?: string, mx?: THREE.Matrix4) {
    this.add(boxM(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1), Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), mat, mx, col);
  }
  rbox(mat: THREE.Material, w: number, h: number, d: number, rad: number, mx: THREE.Matrix4, col?: string, seg = 2) { this.add(new RoundedBoxGeometry(w, h, d, seg, Math.min(rad, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat, mx, col); }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, col?: string, open = false) { this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx, col); }
  lathe(mat: THREE.Material, pts: [number, number][], mx: THREE.Matrix4, seg = 24, col?: string) { this.add(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat, mx, col); }
  sph(mat: THREE.Material, mx: THREE.Matrix4, seg = 12, col?: string) { this.add(new THREE.SphereGeometry(1, seg, Math.max(6, seg >> 1)), mat, mx, col); }
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 8, col?: string) {
    const d = b.clone().sub(a), L = d.length();
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(new THREE.CylinderGeometry(r, r, L, seg, 1, false), mat, m, col);
  }
  /** a flat board (w wide, t thick) from a to b, its face turned toward `face` */
  board(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, w: number, t: number, face: THREE.Vector3, col?: string) {
    const d = b.clone().sub(a), L = d.length(), x = d.clone().normalize(), z = face.clone().sub(x.clone().multiplyScalar(face.dot(x))).normalize(), y = z.clone().cross(x);
    const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(a.clone().add(b).multiplyScalar(0.5));
    this.add(boxM(-L / 2, -w / 2, -t / 2, L / 2, w / 2, t / 2), mat, m, col);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, arc = Math.PI * 2) { this.add(new THREE.TorusGeometry(R, r, 8, 36, arc), mat, mx, col); }
  build(parent: THREE.Object3D, cast = false) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = cast;
      parent.add(mesh);
    }
    this.m.clear();
  }
}
/** a vertical wall at z = z0 from x0..x1, y0..y1 minus rect holes [xa, xb, ya, yb]; uv in metres */
const wallZ = (x0: number, x1: number, y0: number, y1: number, z0: number, holes: number[][] = []) => {
  const xs = [x0, x1, ...holes.flatMap((h) => [h[0], h[1]])].filter((x) => x >= x0 && x <= x1).sort((a, b) => a - b);
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1]; if (b - a < 1e-4) continue;
    const mid = (a + b) / 2, cut = holes.filter((h) => mid > h[0] && mid < h[1]).map((h) => [h[2], h[3]]).sort((p, q) => p[0] - q[0]);
    let y = y0;
    const seg = (ya: number, yb: number) => { if (yb - ya < 1e-4) return; for (const [x, yy] of [[a, ya], [b, ya], [b, yb], [a, ya], [b, yb], [a, yb]]) { pos.push(x, yy, z0); uv.push(x, yy); } };
    for (const [ha, hb] of cut) { seg(y, Math.min(y1, Math.max(y, ha))); y = Math.max(y, hb); }
    seg(y, y1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
};
/** same on a side wall at x = xw (u = z, holes in z) */
const wallX = (xw: number, z0: number, z1: number, y0: number, y1: number, holes: number[][] = []) => {
  const g = wallZ(z0, z1, y0, y1, 0, holes);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const u = p.getX(i); p.setXYZ(i, xw, p.getY(i), u); }
  g.computeVertexNormals();
  return g;
};
const flat = (x0: number, z0: number, x1: number, z1: number, y: number) => {
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i), -p.getZ(i));
  return g;
};
/** quad through 4 points (a b c d counter-clockwise from the front) */
const quad4 = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, uvs = [0, 0, 1, 0, 1, 1, 0, 1]) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((v) => [v.x, v.y, v.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap((i) => [uvs[i * 2], uvs[i * 2 + 1]]), 2));
  g.computeVertexNormals();
  return g;
};

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
const SERIF = "'DejaVu Serif', 'Liberation Serif', serif";
const txt = (g: G, s: string, x: number, y: number, px: number, col = "#2a2a2a", align: CanvasTextAlign = "center", font = FONT, weight = "bold") => {
  g.font = `${weight} ${Math.max(6, Math.round(px))}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const noise = (g: G, x0: number, y0: number, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const hsl = (h: number, s: number, l: number) => `hsl(${h},${s}%,${l}%)`;
const tiled = (t: THREE.Texture, m: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(1 / m, 1 / m); c.anisotropy = 8; c.needsUpdate = true; return c; };
const blot = (g: G, x: number, y: number, s: number, rgb: string, a: number, W2: number, H: number) => {
  for (const ox of [-W2, 0, W2]) for (const oy of [-H, 0, H]) {
    if (x + ox + s < 0 || x + ox - s > W2 || y + oy + s < 0 || y + oy - s > H) continue;
    const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
  }
};
const glowTex = () => ctex("hiGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.12, "rgba(255,255,255,0.55)"); gr.addColorStop(0.35, "rgba(255,255,255,0.16)"); gr.addColorStop(0.7, "rgba(255,255,255,0.04)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- KITCHEN textures
/** cream + tomato checker lino, 2 x 2 squares of 0.3 m per 0.6 m tile */
const checkTex = () => ctex("hiCheck", 1024, 1024, (g, r) => {
  const s = 512;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const red = (i + j) % 2 === 1, x = i * s, y = j * s;
    g.fillStyle = red ? "#d8573f" : "#f6ead2"; g.fillRect(x, y, s, s);
    for (let k = 0; k < 30; k++) blot(g, x + 30 + r() * (s - 60), y + 30 + r() * (s - 60), 30 + r() * 90, red ? "120,30,20" : "200,170,130", 0.06, 1e6, 1e6);
    if (!red) for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(150,120,90,${0.08 + r() * 0.1})`; g.fillRect(x + r() * s, y + r() * s, 2 + r() * 4, 2 + r() * 3); }
    g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(x + 4, y + 4, s - 8, 5); g.fillRect(x + 4, y + 4, 5, s - 8);
    g.fillStyle = "rgba(60,30,20,0.25)"; g.fillRect(x + 4, y + s - 9, s - 8, 5); g.fillRect(x + s - 9, y + 4, 5, s - 8);
  }
  g.strokeStyle = "rgba(70,50,40,0.5)"; g.lineWidth = 3; for (const k of [0, 512, 1024]) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 1024); g.moveTo(0, k); g.lineTo(1024, k); g.stroke(); }
  noise(g, 0, 0, 1024, 1024, r, 18000, 0.03);
});
/** warm cream plaster, 1.2 m tile */
const plasterTex = () => ctex("hiPlaster", 1024, 1024, (g, r) => {
  g.fillStyle = "#f8e6bc"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 240; i++) blot(g, r() * 1024, r() * 1024, 40 + r() * 140, r() < 0.5 ? "255,246,220" : "222,186,140", 0.09, 1024, 1024);
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.025);
});
/** white glossy subway tiles, 4 courses x 2 bricks per 0.3 m tile */
const subwayTex = () => ctex("hiSubway", 512, 512, (g, r) => {
  g.fillStyle = "#b8b4aa"; g.fillRect(0, 0, 512, 512);
  const rows = 4, h = 512 / rows, w = 256;
  for (let j = 0; j < rows; j++) for (let i = -1; i < 3; i++) {
    const x = i * w + (j % 2 ? w / 2 : 0), y = j * h, l = 93 + r() * 4;
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, hsl(180, 30, l)); gr.addColorStop(1, hsl(190, 22, l - 7));
    g.fillStyle = gr; g.beginPath(); g.roundRect(x + 4, y + 4, w - 8, h - 8, 10); g.fill();
    g.fillStyle = "rgba(255,255,255,0.7)"; g.fillRect(x + 14, y + 10, w * 0.4, 5);
  }
  noise(g, 0, 0, 512, 512, r, 3000, 0.02);
});
/** maple butcher block, strips along x, 1 m tile */
const butcherTex = () => ctex("hiButcher", 1024, 1024, (g, r) => {
  const n = 16, h = 1024 / n;
  for (let j = 0; j < n; j++) {
    let x = -r() * 400;
    while (x < 1024) {
      const len = 250 + r() * 500, l = 60 + r() * 12, hu = 32 + r() * 8;
      const gr = g.createLinearGradient(0, j * h, 0, j * h + h); gr.addColorStop(0, hsl(hu, 55, l + 4)); gr.addColorStop(1, hsl(hu - 4, 58, l - 6));
      g.fillStyle = gr; g.fillRect(x, j * h, len, h);
      for (let k = 0; k < 3; k++) { g.strokeStyle = `rgba(120,70,30,${0.15 + r() * 0.15})`; g.lineWidth = 1.5; g.beginPath(); const yy = j * h + 6 + r() * (h - 12); g.moveTo(x, yy); g.bezierCurveTo(x + len * 0.3, yy + 4, x + len * 0.6, yy - 4, x + len, yy); g.stroke(); }
      g.fillStyle = "rgba(90,50,20,0.5)"; g.fillRect(x, j * h, 2, h);
      x += len;
    }
    g.fillStyle = "rgba(90,50,20,0.45)"; g.fillRect(0, j * h, 1024, 2);
  }
  noise(g, 0, 0, 1024, 1024, r, 9000, 0.03);
});
/** aquarium gravel (pastel pebbles), 0.3 m tile */
const pebbleTex = () => ctex("hiPebbles", 512, 512, (g, r) => {
  g.fillStyle = "#3a3440"; g.fillRect(0, 0, 512, 512);
  const cols = ["#f2c5a0", "#e8e0d0", "#88c4d8", "#f0a0a8", "#c8b890", "#fff0d8", "#90c8a0"];
  for (let i = 0; i < 1500; i++) {
    const x = r() * 512, y = r() * 512, s = 6 + r() * 10, c = cols[Math.floor(r() * cols.length)], rot = r() * 3;
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      if (x + ox + s < 0 || x + ox - s > 512 || y + oy + s < 0 || y + oy - s > 512) continue;
      g.fillStyle = c; g.beginPath(); g.ellipse(x + ox, y + oy, s, s * 0.75, rot, 0, 7); g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.ellipse(x + ox - s * 0.3, y + oy - s * 0.3, s * 0.35, s * 0.2, 0, 0, 7); g.fill();
    }
  }
});
/** the tank's back poster: deep blue water, light rays, kelp */
const tankBackTex = () => ctex("hiTankBack", 512, 384, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, "#7ee0ea"); gr.addColorStop(0.5, "#2a9cc0"); gr.addColorStop(1, "#14507a");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 384);
  for (let k = 0; k < 6; k++) { const x = 40 + k * 90 + r() * 30; g.fillStyle = "rgba(255,255,255,0.09)"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x + 110, 384); g.lineTo(x + 50, 384); g.fill(); }
  for (let k = 0; k < 14; k++) {
    const x = r() * 512, h = 160 + r() * 200;
    g.strokeStyle = k % 2 ? "rgba(20,90,70,0.7)" : "rgba(30,120,80,0.6)"; g.lineWidth = 10 + r() * 8; g.lineCap = "round";
    g.beginPath(); g.moveTo(x, 384); for (let s = 1; s <= 8; s++) g.lineTo(x + Math.sin(s * 0.9 + k) * 14, 384 - (h * s) / 8); g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,0.5)"; for (let k = 0; k < 30; k++) { g.beginPath(); g.arc(r() * 512, r() * 384, 2 + r() * 4, 0, 7); g.fill(); }
});
/** the morning garden seen through the side window (self-lit) */
const gardenTex = () => ctex("hiGarden", 1024, 768, (g, r) => {
  const sky = g.createLinearGradient(0, 0, 0, 520); sky.addColorStop(0, "#f8c890"); sky.addColorStop(0.55, "#ffe2b0"); sky.addColorStop(1, "#fff2d0");
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 768);
  const sun = g.createRadialGradient(200, 300, 0, 200, 300, 420); sun.addColorStop(0, "rgba(255,255,235,1)"); sun.addColorStop(0.15, "rgba(255,240,190,0.8)"); sun.addColorStop(1, "rgba(255,220,160,0)");
  g.fillStyle = sun; g.fillRect(0, 0, 1024, 768);
  g.fillStyle = "#c89a8a"; for (let k = 0; k < 6; k++) { const x = 380 + k * 120, h = 360 + (k % 3) * 20; g.fillRect(x, h, 110, 400); g.beginPath(); g.moveTo(x - 8, h); g.lineTo(x + 55, h - 50); g.lineTo(x + 118, h); g.fill(); }
  g.fillStyle = "#e8b8a0"; for (let k = 0; k < 6; k++) for (let q = 0; q < 2; q++) g.fillRect(400 + k * 120 + q * 50, 400, 24, 30);
  for (let i = 0; i < 26; i++) { const cx = 560 + r() * 460, cy = 300 + r() * 120; g.fillStyle = i % 2 ? "#6aa05a" : "#7fb466"; g.beginPath(); g.arc(cx, cy, 40 + r() * 40, 0, 7); g.fill(); }
  g.fillStyle = "#5a3a2a"; g.fillRect(720, 300, 22, 300);
  g.fillStyle = "#4f9a46"; g.fillRect(0, 520, 1024, 248);
  for (let i = 0; i < 40; i++) { g.fillStyle = i % 2 ? "#3f8a3c" : "#5aa64c"; g.beginPath(); g.arc(r() * 1024, 520 + r() * 30, 30 + r() * 30, 0, 7); g.fill(); }
  g.fillStyle = "#fbf6ea"; for (let x = 0; x < 1024; x += 46) { g.fillRect(x, 560, 28, 150); g.beginPath(); g.moveTo(x, 560); g.lineTo(x + 14, 538); g.lineTo(x + 28, 560); g.fill(); }
  g.fillRect(0, 590, 1024, 16); g.fillRect(0, 670, 1024, 16);
  g.fillStyle = "#e04a5a"; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r() * 1024, 715 + r() * 50, 8, 0, 7); g.fill(); }
});
const clockTex = () => ctex("hiClock", 256, 256, (g) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle = "#2a2a2a"; g.beginPath(); g.arc(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100, k % 3 ? 5 : 9, 0, 7); g.fill(); }
  g.strokeStyle = "#2a2a2a"; g.lineCap = "round"; g.lineWidth = 10; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(7.25 / 6 * Math.PI) * 55, 128 - Math.cos(7.25 / 6 * Math.PI) * 55); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(1.5 * Math.PI) * 85, 128 - Math.cos(1.5 * Math.PI) * 85); g.stroke();
  g.fillStyle = "#e04a3a"; g.beginPath(); g.arc(128, 128, 9, 0, 7); g.fill();
});
/** fridge magnets atlas 512 x 256: left = kid's crayon drawing (a tadpole + sun), right = a beach postcard */
const fridgeArtTex = () => ctex("hiFridgeArt", 512, 256, (g) => {
  g.fillStyle = "#fffdf5"; g.fillRect(0, 0, 200, 256);
  g.strokeStyle = "#f0b020"; g.lineWidth = 8; g.beginPath(); g.arc(160, 44, 22, 0, 7); g.stroke();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.28; g.beginPath(); g.moveTo(160 + Math.cos(a) * 30, 44 + Math.sin(a) * 30); g.lineTo(160 + Math.cos(a) * 42, 44 + Math.sin(a) * 42); g.stroke(); }
  g.strokeStyle = "#3a8ad8"; g.lineWidth = 6; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(10, 190 + k * 18); for (let x = 10; x < 195; x += 15) g.lineTo(x, 190 + k * 18 + Math.sin(x * 0.15 + k) * 6); g.stroke(); }
  g.fillStyle = "#3a5a2a"; g.beginPath(); g.ellipse(80, 130, 34, 26, 0, 0, 7); g.fill();
  g.strokeStyle = "#3a5a2a"; g.lineWidth = 10; g.lineCap = "round"; g.beginPath(); g.moveTo(50, 132); g.quadraticCurveTo(30, 150, 14, 120); g.stroke();
  g.fillStyle = "#fff"; g.beginPath(); g.arc(94, 122, 8, 0, 7); g.fill(); g.fillStyle = "#111"; g.beginPath(); g.arc(96, 122, 4, 0, 7); g.fill();
  txt(g, "BEAN", 70, 30, 30, "#e04a3a");
  const sky = g.createLinearGradient(0, 0, 0, 256); sky.addColorStop(0, "#5ab8f0"); sky.addColorStop(0.6, "#bfe8ff"); sky.addColorStop(0.61, "#2a90c8"); sky.addColorStop(0.8, "#40b0d8"); sky.addColorStop(0.81, "#f6dca0"); sky.addColorStop(1, "#f0cc88");
  g.fillStyle = "#ffffff"; g.fillRect(232, 0, 280, 256); g.fillStyle = sky; g.fillRect(244, 12, 256, 232);
  g.fillStyle = "#ffe060"; g.beginPath(); g.arc(440, 60, 24, 0, 7); g.fill();
  g.strokeStyle = "#5a3a1a"; g.lineWidth = 8; g.beginPath(); g.moveTo(300, 210); g.quadraticCurveTo(290, 130, 320, 90); g.stroke();
  g.fillStyle = "#3f9a46"; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(320 + Math.cos(k * 1.25) * 26, 90 + Math.sin(k * 1.25) * 12, 30, 9, k * 1.25, 0, 7); g.fill(); }
  txt(g, "HELLO!", 400, 228, 26, "#ffffff");
});
const ginghamTex = () => ctex("hiGingham", 256, 256, (g) => {
  g.fillStyle = "#fbf4ea"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(214,60,60,0.55)"; for (let k = 0; k < 8; k += 2) { g.fillRect(k * 32, 0, 32, 256); g.fillRect(0, k * 32, 256, 32); }
});
const cerealTex = () => ctex("hiCereal", 256, 384, (g) => {
  g.fillStyle = "#2a78d0"; g.fillRect(0, 0, 256, 384); g.fillStyle = "#ffd23a"; g.fillRect(0, 0, 256, 90);
  txt(g, "CRUNCHY", 128, 36, 36, "#e0302a"); txt(g, "O's", 128, 72, 34, "#e0302a");
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(128, 260, 92, 60, 0, 0, 7); g.fill();
  g.fillStyle = "#f0a830"; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(80 + (k % 3) * 46, 236 + Math.floor(k / 3) * 22, 14, 0, 7); g.fill(); }
  g.fillStyle = "#2a78d0"; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(80 + (k % 3) * 46, 236 + Math.floor(k / 3) * 22, 5, 0, 7); g.fill(); }
});

// ---------------- FARM textures
/** red vertical barn boards + battens, 1.6 m tile (8 boards) */
const barnTex = () => ctex("hiBarn", 1024, 1024, (g, r) => {
  const n = 8, w = 1024 / n;
  for (let i = 0; i < n; i++) {
    const l = 38 + r() * 7, h = 3 + r() * 5;
    const gr = g.createLinearGradient(i * w, 0, i * w + w, 0); gr.addColorStop(0, hsl(h, 62, l + 5)); gr.addColorStop(0.7, hsl(h, 64, l)); gr.addColorStop(1, hsl(h - 2, 66, l - 7));
    g.fillStyle = gr; g.fillRect(i * w, 0, w, 1024);
    for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(90,20,15,${0.1 + r() * 0.14})`; g.lineWidth = 1.5 + r() * 2; g.beginPath(); const xx = i * w + 8 + r() * (w - 16); g.moveTo(xx, 0); g.bezierCurveTo(xx + 6, 340, xx - 6, 680, xx + 2, 1024); g.stroke(); }
    for (let k = 0; k < 3; k++) {
      const y = r() * 1024, hh = 80 + r() * 260;
      const sg = g.createLinearGradient(0, y, 0, y + hh); sg.addColorStop(0, "rgba(200,180,170,0)"); sg.addColorStop(0.5, `rgba(205,185,175,${0.18 + r() * 0.2})`); sg.addColorStop(1, "rgba(200,180,170,0)");
      g.fillStyle = sg; g.fillRect(i * w + r() * w * 0.6, y, 10 + r() * 30, hh);
    }
    if (r() < 0.5) { g.fillStyle = "rgba(70,20,15,0.6)"; g.beginPath(); g.ellipse(i * w + r() * w, r() * 1024, 7, 12, 0, 0, 7); g.fill(); }
    for (const y of [60, 560]) { g.fillStyle = "#3a1a14"; g.beginPath(); g.arc(i * w + w / 2, y + r() * 30, 4, 0, 7); g.fill(); }
  }
  for (let i = 0; i < n; i++) { g.fillStyle = "rgba(40,10,8,0.8)"; g.fillRect(i * w - 3, 0, 6, 1024); g.fillStyle = "rgba(255,190,170,0.2)"; g.fillRect(i * w + 3, 0, 3, 1024); }
  noise(g, 0, 0, 1024, 1024, r, 16000, 0.04);
});
/** weathered cedar shingles, 1.2 m tile */
const shingleTex = () => ctex("hiShingle", 1024, 1024, (g, r) => {
  g.fillStyle = "#2a2226"; g.fillRect(0, 0, 1024, 1024);
  const rows = 10, rh = 1024 / rows;
  for (let j = 0; j < rows; j++) {
    let x = -r() * 60;
    while (x < 1024) {
      const w = 50 + r() * 70, l = 34 + r() * 14, h = 18 + r() * 20;
      const gr = g.createLinearGradient(0, j * rh, 0, j * rh + rh); gr.addColorStop(0, hsl(h, 14, l - 8)); gr.addColorStop(1, hsl(h, 16, l + 6));
      g.fillStyle = gr; g.fillRect(x + 2, j * rh, w - 4, rh - 4);
      g.fillStyle = "rgba(255,240,220,0.18)"; g.fillRect(x + 2, j * rh + rh - 10, w - 4, 4);
      if (r() < 0.12) { g.fillStyle = "rgba(120,140,60,0.35)"; g.beginPath(); g.arc(x + r() * w, j * rh + r() * rh, 6 + r() * 14, 0, 7); g.fill(); }
      x += w;
    }
  }
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.04);
});
/** dusty farmyard: ochre dirt, pebbles, straw, hoof prints, 3 m tile */
const dirtTex = () => ctex("hiDirt", 1024, 1024, (g, r) => {
  g.fillStyle = "#c79e6c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 160; i++) blot(g, r() * 1024, r() * 1024, 40 + r() * 160, r() < 0.5 ? "236,206,160" : "140,100,70", 0.12, 1024, 1024);
  for (let i = 0; i < 2600; i++) { const x = r() * 1024, y = r() * 1024, s = 1.5 + r() * 4; g.fillStyle = r() < 0.5 ? "rgba(120,90,70,0.6)" : "rgba(240,225,200,0.6)"; g.beginPath(); g.ellipse(x, y, s, s * 0.7, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 260; i++) { const x = r() * 1024, y = r() * 1024, a = r() * 6.28, L = 10 + r() * 22; g.strokeStyle = `rgba(${230 + r() * 25},${190 + r() * 30},90,0.75)`; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
  for (let i = 0; i < 40; i++) { const x = r() * 1024, y = r() * 1024, a = r() * 6.28; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = "rgba(90,60,40,0.35)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 5, 0, 4, 8, 0, 0, 7); g.fill(); } g.restore(); }
  noise(g, 0, 0, 1024, 1024, r, 20000, 0.05);
});
/** dry golden-green pasture, 2.5 m tile */
const grassTex = () => ctex("hiGrass", 1024, 1024, (g, r) => {
  g.fillStyle = "#8fa04a"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 120; i++) blot(g, r() * 1024, r() * 1024, 60 + r() * 160, r() < 0.5 ? "214,196,110" : "80,110,50", 0.16, 1024, 1024);
  for (let i = 0; i < 9000; i++) { const x = r() * 1024, y = r() * 1024, L = 6 + r() * 14; g.strokeStyle = r() < 0.5 ? `rgba(${200 + r() * 40},${190 + r() * 30},100,0.5)` : `rgba(70,${100 + r() * 30},45,0.45)`; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 6, y - L); g.stroke(); }
});
const stoneTex = () => ctex("hiStone", 512, 512, (g, r) => {
  g.fillStyle = "#6a625c"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 60; i++) {
    const x = r() * 512, y = r() * 512, s = 30 + r() * 40, l = 55 + r() * 15, hu = 25 + r() * 20, rot = r();
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) { g.fillStyle = hsl(hu, 10, l); g.beginPath(); g.ellipse(x + ox, y + oy, s, s * 0.6, rot, 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,0.15)"; g.beginPath(); g.ellipse(x + ox - s * 0.2, y + oy - s * 0.25, s * 0.5, s * 0.2, 0, 0, 7); g.fill(); }
  }
  noise(g, 0, 0, 512, 512, r, 5000, 0.05);
});
const hayTex = () => ctex("hiHay", 512, 512, (g, r) => {
  g.fillStyle = "#d8b050"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4000; i++) { const x = r() * 512, y = r() * 512, L = 10 + r() * 30, a = (r() - 0.5) * 0.8; g.strokeStyle = r() < 0.5 ? "rgba(250,220,120,0.7)" : "rgba(150,110,40,0.5)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke(); }
});
/** weathered grey-brown planks (scale deck, trough), 1 m tile */
const plankTex = () => ctex("hiPlank", 1024, 1024, (g, r) => {
  const n = 7, h = 1024 / n;
  for (let j = 0; j < n; j++) {
    const l = 50 + r() * 10; const gr = g.createLinearGradient(0, j * h, 0, j * h + h); gr.addColorStop(0, hsl(30, 22, l + 6)); gr.addColorStop(1, hsl(28, 24, l - 6));
    g.fillStyle = gr; g.fillRect(0, j * h, 1024, h);
    for (let k = 0; k < 8; k++) { g.strokeStyle = `rgba(60,40,25,${0.15 + r() * 0.15})`; g.lineWidth = 2; g.beginPath(); const yy = j * h + 6 + r() * (h - 12); g.moveTo(0, yy); g.bezierCurveTo(340, yy + 6, 680, yy - 6, 1024, yy); g.stroke(); }
    g.fillStyle = "rgba(40,25,15,0.7)"; g.fillRect(0, j * h, 1024, 4);
    for (const x of [80, 600]) { g.fillStyle = "#2a2a2a"; g.beginPath(); g.arc(x, j * h + h / 2, 5, 0, 7); g.fill(); }
  }
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.04);
});
/** one corn plant (alpha), 256 x 512 */
const cornTex = () => ctex("hiCorn", 256, 512, (g, r) => {
  g.clearRect(0, 0, 256, 512); g.lineCap = "round";
  g.strokeStyle = "#5a7a2a"; g.lineWidth = 9; g.beginPath(); g.moveTo(128, 512); g.lineTo(126, 70); g.stroke();
  g.strokeStyle = "#7a9a3a"; g.lineWidth = 3; g.beginPath(); g.moveTo(130, 512); g.lineTo(128, 70); g.stroke();
  for (let k = 0; k < 9; k++) {
    const y = 470 - k * 44, s = k % 2 ? 1 : -1, L = 90 + r() * 30, droop = 40 + r() * 40;
    const ex = 128 + s * L, ey = y - 30 + droop * 0.8;
    g.fillStyle = k % 3 === 0 ? "#6f9a36" : k % 3 === 1 ? "#80aa40" : "#5f8a30";
    g.beginPath(); g.moveTo(128, y); g.quadraticCurveTo(128 + s * L * 0.5, y - 50, ex, ey); g.quadraticCurveTo(128 + s * L * 0.45, y - 30, 128, y + 14); g.fill();
    g.strokeStyle = "rgba(220,230,150,0.6)"; g.lineWidth = 2; g.beginPath(); g.moveTo(128, y + 4); g.quadraticCurveTo(128 + s * L * 0.5, y - 42, ex, ey); g.stroke();
  }
  g.fillStyle = "#b8b060"; g.beginPath(); g.ellipse(140, 300, 12, 40, 0.3, 0, 7); g.fill();
  g.strokeStyle = "#c09040"; g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(148, 262); g.lineTo(150 + k * 4, 245 - k * 2); g.stroke(); }
  g.strokeStyle = "#c8a048"; g.lineWidth = 4; for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.3; g.beginPath(); g.moveTo(126, 72); g.lineTo(126 + Math.cos(a) * 55, 72 + Math.sin(a) * 55 + Math.abs(k - 3) * 8); g.stroke(); }
});
/** distant layers: 0 shelterbelt tree line, 1 farmsteads (barn, silo, windmill, trees), 2 low rolling fields */
const farSkyTex = (k: number) => ctex("hiFar" + k, 2048, 512, (g, r) => {
  g.clearRect(0, 0, 2048, 512); g.fillStyle = "#ffffff";
  if (k === 0) {
    for (let i = 0; i < 70; i++) { const cx = (i / 70) * 2048 + r() * 20, cy = 380 + r() * 30, s = 26 + r() * 40; for (let q = 0; q < 6; q++) { g.beginPath(); g.arc(cx + (r() - 0.5) * s * 1.4, cy - r() * s * 0.9, s * (0.4 + r() * 0.35), 0, 7); g.fill(); } }
    g.fillRect(0, 400, 2048, 112);
  } else if (k === 1) {
    g.fillRect(0, 440, 2048, 72);
    let x = 60;
    while (x < 1950) {
      const w = 60 + r() * 50, h = 50 + r() * 30, y = 440;
      g.fillRect(x, y - h, w, h); g.beginPath(); g.moveTo(x - 6, y - h); g.lineTo(x + w * 0.2, y - h - 22); g.lineTo(x + w * 0.5, y - h - 32); g.lineTo(x + w * 0.8, y - h - 22); g.lineTo(x + w + 6, y - h); g.fill();
      if (r() < 0.7) { g.fillRect(x + w + 10, y - h - 50, 26, h + 50); g.beginPath(); g.arc(x + w + 23, y - h - 50, 13, Math.PI, 0); g.fill(); }
      if (r() < 0.5) { const wx = x - 40; g.fillRect(wx, y - 120, 4, 120); g.fillRect(wx - 10, y - 30, 24, 4); g.beginPath(); g.arc(wx + 2, y - 124, 16, 0, 7); g.lineWidth = 3; g.strokeStyle = "#fff"; g.stroke(); }
      for (let q = 0; q < 3; q++) { const cx = x + w + 60 + r() * 60, s = 20 + r() * 18; for (let p = 0; p < 4; p++) { g.beginPath(); g.arc(cx + (r() - 0.5) * s, y - s - r() * s, s * 0.6, 0, 7); g.fill(); } }
      x += 260 + r() * 300;
    }
  } else {
    g.beginPath(); g.moveTo(0, 512);
    for (let x = 0; x <= 2048; x += 16) g.lineTo(x, 420 - Math.sin(x * 0.0019 + 1) * 26 - Math.sin(x * 0.0063) * 10);
    g.lineTo(2048, 512); g.fill();
  }
});
/** the calendar header (feed store) */
const calHeadTex = () => ctex("hiCalHead", 512, 192, (g) => {
  g.fillStyle = "#b8282a"; g.fillRect(0, 0, 512, 192);
  g.strokeStyle = "#f6e6c0"; g.lineWidth = 6; g.strokeRect(10, 10, 492, 172);
  g.fillStyle = "#f3a6a0"; g.strokeStyle = "#5a1a1a"; g.lineWidth = 4;
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(84 + s * 30, 66); g.lineTo(84 + s * 48, 40); g.lineTo(84 + s * 50, 74); g.closePath(); g.fill(); g.stroke(); }
  g.beginPath(); g.ellipse(84, 98, 52, 44, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#e07a80"; g.beginPath(); g.ellipse(84, 112, 20, 14, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#5a1a1a"; for (const s of [-1, 1]) { g.beginPath(); g.arc(84 + s * 7, 112, 3.5, 0, 7); g.fill(); g.beginPath(); g.arc(84 + s * 20, 88, 5, 0, 7); g.fill(); }
  txt(g, "FARM & FEED", 312, 70, 50, "#f6e6c0", "center", SERIF);
  txt(g, "SEED · HOGS · HARDWARE", 312, 130, 26, "#f6e6c0", "center", FONT);
});
/** a calendar page (the year big + 12 little months) */
const drawPage = (g: G, S: number, year: number) => {
  const r = rng(year * 7 + 3);
  g.fillStyle = "#f6eed8"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 6; i++) blot(g, r() * S, r() * S, S * (0.1 + r() * 0.25), "200,170,110", 0.08, 1e6, 1e6);
  g.fillStyle = "#c9b48a"; for (let k = 0; k < 14; k++) { g.beginPath(); g.arc(S * (0.06 + k * 0.067), S * 0.035, S * 0.012, 0, 7); g.fill(); }
  txt(g, String(year), S / 2, S * 0.27, S * 0.36, "#1e1616", "center", SERIF);
  g.fillStyle = "#b8282a"; g.fillRect(S * 0.12, S * 0.46, S * 0.76, S * 0.012);
  const M = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  for (let i = 0; i < 12; i++) {
    const cx = S * (0.08 + (i % 4) * 0.225), cy = S * (0.52 + Math.floor(i / 4) * 0.155), w = S * 0.19, h = S * 0.13;
    g.fillStyle = i % 2 ? "#3a3030" : "#b8282a"; g.font = `bold ${Math.round(S * 0.032)}px ${FONT}`; g.textAlign = "left"; g.textBaseline = "top"; g.fillText(M[i], cx, cy);
    g.fillStyle = "rgba(40,30,30,0.55)";
    for (let q = 0; q < 30; q++) g.fillRect(cx + (q % 7) * (w / 7), cy + h * 0.32 + Math.floor(q / 7) * (h * 0.14), w / 11, h * 0.07);
  }
  noise(g, 0, 0, S, S, r, Math.round(S * 6), 0.03);
};
/** a canvas texture redrawn only when its year changes (deterministic: content depends on the year only) */
class PageTex {
  cv: HTMLCanvasElement; tex: THREE.CanvasTexture; year = -1; S: number;
  constructor(S: number) {
    this.S = S;
    this.cv = document.createElement("canvas"); this.cv.width = this.cv.height = S;
    this.tex = new THREE.CanvasTexture(this.cv); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
  }
  set(year: number) { if (year === this.year) return; this.year = year; drawPage(this.cv.getContext("2d")!, this.S, year); this.tex.needsUpdate = true; }
}

// ============================================================ look weights (same rule as world.ts)
const lookW = (id: number, f: number): Partial<Record<Look, number>> => {
  const s = SHOTS[id - 1];
  const rp = LOOK_RAMPS.find((r) => s.place === r[4] && f >= r[2] && (
    (s.look === r[0] && r[2] >= s.b - 30 && r[2] <= s.b) || (s.look === r[1] && s.a >= r[2] && s.a <= r[3] && f <= r[3])));
  if (!rp) return { [s.look]: 1 };
  const g = smooth((f - rp[2]) / Math.max(1, rp[3] - rp[2]));
  return { [rp[0]]: 1 - g, [rp[1]]: g };
};
type Rig = Record<string, number | C3>;
const mixRig = <T extends Rig>(w: Partial<Record<Look, number>>, rigs: Partial<Record<Look, T>>, fallback: Look): T => {
  const out: Rig = {};
  for (const [k, wt] of Object.entries(w) as [Look, number][]) {
    const R = rigs[k] ?? rigs[fallback]!;
    for (const key of Object.keys(R)) {
      const v = R[key];
      if (typeof v === "number") out[key] = ((out[key] as number) ?? 0) + v * wt;
      else { const o = (out[key] as C3) ?? [0, 0, 0]; out[key] = [o[0] + v[0] * wt, o[1] + v[1] * wt, o[2] + v[2] * wt]; }
    }
  }
  return out as T;
};
const mixW = (w: Partial<Record<Look, number>>, tab: Partial<Record<Look, number[]>>, fb: number[]) => {
  const out = fb.map(() => 0);
  for (const [k, wt] of Object.entries(w) as [Look, number][]) { const v = tab[k] ?? fb; v.forEach((x, i) => (out[i] += x * wt)); }
  return out;
};
const sc3 = (a: C3, k: number): C3 => [a[0] * k, a[1] * k, a[2] * k];
/** the world's camera-relative sun for a shot (same formula as world.shotSun) */
const sunCache = new Map<number, THREE.Vector3>();
const worldSun = (id: number) => {
  let v = sunCache.get(id);
  if (v) return v;
  const s = SHOTS[id - 1], L = LOOKS[s.look];
  let fx = 0, fz = 0;
  for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
  const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  sunCache.set(id, v);
  return v;
};

// ============================================================ the KITCHEN light shader (own rig)
const NL = 10;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uWC; uniform vec3 uWN; uniform vec3 uWU; uniform vec3 uWV; uniform vec2 uWH; uniform vec4 uWM;
uniform float uTT; uniform vec3 uO; uniform vec4 uBox; uniform float uAO;
uniform vec4 uTad; uniform float uWallZ; uniform vec3 uTkMin; uniform vec3 uTkMax; uniform vec3 uTkCol; uniform float uCau;
float th2(vec2 p){ return fract(sin(dot(p, vec2(41.37, 289.13))) * 24634.6345); }
float tn2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(th2(i), th2(i + vec2(1, 0)), f.x), mix(th2(i + vec2(0, 1)), th2(i + vec2(1, 1)), f.x), f.y); }
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
// sun through the window aperture (glazing bars + a soft leaf dapple), 0..1
float sunK(vec3 p, float leaf){
  float den = dot(uSD, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  vec3 q = p + uSD * t - uWC; vec2 a = vec2(dot(q, uWU), dot(q, uWV));
  float pen = 0.003 + 0.008 * t;
  float k = (1.0 - smoothstep(uWH.x - pen, uWH.x + pen, abs(a.x))) * (1.0 - smoothstep(uWH.y - pen, uWH.y + pen, abs(a.y)));
  if (k <= 0.0) return 0.0;
  if (uWM.x > 1.5) { float cw = 2.0 * uWH.x / uWM.x; float d = abs(fract((a.x + uWH.x) / cw + 0.5) - 0.5) * cw; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (uWM.y > 1.5) { float ch = 2.0 * uWH.y / uWM.y; float d = abs(fract((a.y + uWH.y) / ch + 0.5) - 0.5) * ch; k *= smoothstep(uWM.z - pen, uWM.z + pen, d); }
  if (leaf > 0.0 && uWM.w > 0.0) {
    vec2 s = a * 2.4 + vec2(sin(uTT * 0.31), cos(uTT * 0.23)) * 0.08;
    float nz = tn2(s + 7.0) * 0.62 + tn2(s * 2.9 + 3.0) * 0.38;
    k *= 1.0 - uWM.w * smoothstep(0.55, 0.76 + pen * 2.0, nz) * smoothstep(0.1, -0.5, a.y);
  }
  return k;
}
// the sun that passed through the fish tank: aqua tint + moving caustics
vec3 tankT(vec3 p){
  vec3 inv = 1.0 / uSD;
  vec3 t0 = (uTkMin - p) * inv, t1 = (uTkMax - p) * inv;
  vec3 a = min(t0, t1), b = max(t0, t1);
  float tn = max(max(a.x, a.y), a.z), tf = min(min(b.x, b.y), b.z);
  if (tf < max(tn, 0.0)) return vec3(1.0);
  vec2 c = vec2(p.x * 13.0 + p.z * 9.0, p.y * 13.0);
  float w = sin(c.x + 1.7 * sin(c.y * 0.8 + uTT * 1.4)) * sin(c.y + 1.4 * sin(c.x * 0.9 - uTT * 1.1));
  float cs = pow(1.0 - abs(w), 7.0);
  return uTkCol * (0.6 + 1.5 * cs * uCau);
}
// the TADPOLE silhouette on the back wall (in head radii), 0..1 occlusion
float tadOcc(vec3 p, vec3 n){
  if (uTad.w < 0.002 || n.z < 0.5 || abs(p.z - uWallZ) > 0.06) return 0.0;
  vec2 q = (p.xy - uTad.xy) / uTad.z;
  float ph = uTT * 8.0;
  q.y -= 0.07 * sin(ph * 0.5);
  float dh = length(q / vec2(1.2, 0.95)) - 1.0;
  float gill = length((q - vec2(-0.35, -0.72)) / vec2(0.34, 0.2)) - 1.0;
  float u = clamp((-q.x - 0.5) / 2.75, 0.0, 1.0);
  float yc = 0.55 * pow(u, 1.3) * sin(u * 5.2 - ph) - 0.04;
  float wd = 0.6 * pow(1.0 - u, 0.85) * (0.8 + 0.35 * sin(3.1416 * min(1.0, u * 1.5))) + 0.035;
  float dt = abs(q.y - yc) - wd;
  dt = max(dt, -q.x - 3.25); dt = max(dt, q.x + 0.2);
  float d = min(min(dh, dt * 0.85), gill * 0.3);
  float eye = length(q - vec2(0.52, 0.22)) - 0.17; // a pin of light through the eye: it reads as a creature
  d = max(d, -eye * 0.9);
  return uTad.w * (1.0 - smoothstep(-0.07, 0.07, d));
}
float roomAO(vec3 p){
  vec3 l = p - uO;
  float dw = min(min(uBox.x - abs(l.x), l.z - uBox.y), uBox.z - l.y);
  float a = smoothstep(0.0, 0.55, dw) * 0.45 + 0.55;
  float b = smoothstep(0.0, 0.3, l.y) * 0.3 + 0.7;
  float k = min(a, 1.0) * (l.y > 0.004 ? b : 1.0);
  return mix(1.0, k, uAO);
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  float ao = roomAO(p);
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y) * (0.68 + 0.32 * sh) * ao;
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2) * (0.75 + 0.25 * sh) * (0.5 + 0.5 * ao);
  }
  float ndl = dot(n, uSD);
  if (ndl > 0.0) { float k = sunK(p, 1.0); if (k > 0.0) L += uSC * smoothstep(0.0, 0.2, ndl) * k * tankT(p) * (1.0 - tadOcc(p, n)) * (0.4 + 0.6 * sh); }
  return L;
}`;
const VS = /* glsl */ `#include <common>
#include <shadowmap_pars_vertex>
attribute vec3 color;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
void main(){
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv; vC = color;
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep;
#if defined(HAS_MAP) || defined(EMAP)
uniform sampler2D uMap;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vC;
#include <common>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
${CORE}
void main(){
  vec3 n = normalize(vN); if (dot(n, cameraPosition - vW) < 0.0) n = -n;
  float sh = getShadowMask();
  vec2 uv = vUv * uRep;
  vec4 tx = vec4(1.0);
#ifdef HAS_MAP
  tx = texture2D(uMap, uv);
#endif
  vec3 c = uCol * vC * tx.rgb * lightAt(vW, n, sh) + uEm * vC;
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm;
#endif
#ifdef SPEC
  vec3 v = normalize(cameraPosition - vW);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * sunK(vW, 0.0) * uSpecK * 1.4 * sh;
#endif
  gl_FragColor = vec4(c, 1.0);
}`;
type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0)), lc = Array.from({ length: NL }, () => V3(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) },
      uSD: { value: V3(0, 1, 0) }, uSC: { value: V3(0, 0, 0) }, uWC: { value: V3(0, 0, 0) }, uWN: { value: V3(0, 0, 1) },
      uWU: { value: V3(1, 0, 0) }, uWV: { value: V3(0, 1, 0) }, uWH: { value: new THREE.Vector2(0.5, 0.5) }, uWM: { value: new THREE.Vector4(1, 1, 0.02, 0) },
      uTT: { value: 0 }, uO: { value: V3(0, 0, 0) }, uBox: { value: new THREE.Vector4(3, -1, 3, 0) }, uAO: { value: 1 },
      uTad: { value: new THREE.Vector4(0, 0, 1, 0) }, uWallZ: { value: 0 }, uTkMin: { value: V3(0, -99, 0) }, uTkMax: { value: V3(0, -98, 0) },
      uTkCol: { value: V3(1, 1, 1) }, uCau: { value: 1 },
    },
  };
};
type LDef = { p: THREE.Vector3; c: C3; r: number };
const setLights = (S: LSet, L: LDef[], au: C3, ad: C3) => {
  for (let i = 0; i < NL; i++) {
    const l = L[i];
    if (l) { S.lp[i].copy(l.p); S.lc[i].set(...l.c); S.lr[i] = l.r; } else { S.lp[i].set(0, -999, 0); S.lc[i].set(0, 0, 0); }
  }
  (S.u.uAU.value as THREE.Vector3).set(...au); (S.u.uAD.value as THREE.Vector3).set(...ad);
};
type MOpt = { col?: string; map?: THREE.Texture; em?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number] };
const imat = (S: LSet, o: MOpt = {}) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.spec) defines.SPEC = "1";
  if (o.map) { o.map.wrapS = o.map.wrapT = THREE.RepeatWrapping; }
  return new THREE.ShaderMaterial({
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights), ...S.u,
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSpec: { value: o.spec ?? 30 },
      uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true,
  });
};
/** a single (non-batched) mesh with the colour attribute the shader needs */
const solo = (g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4) => {
  const c = clean(g); if (mx) c.applyMatrix4(mx);
  const m = new THREE.Mesh(c, mat); m.frustumCulled = false; m.receiveShadow = true; return m;
};

/** ray-marched haze inside the window prism: the bars show in the air (NOINK, additive) */
class Haze {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uInv: { value: new THREE.Matrix3() }, uCen: { value: V3(0, 0, 0) }, uHC: { value: V3(1, 1, 1) }, uK: { value: 0 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform mat3 uInv; uniform vec3 uCen; uniform vec3 uHC; uniform float uK; varying vec3 vW;
        ${CORE}
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          vec3 rl = uInv * rd + vec3(1e-6); vec3 cl = uInv * (cameraPosition - uCen); vec3 pl = uInv * (vW - uCen);
          bool inside = all(lessThan(abs(cl), vec3(0.5)));
          if (gl_FrontFacing == inside) { gl_FragColor = vec4(0.0); return; }
          vec3 te = (sign(rl) * 0.5 - pl) / rl; float tB = max(min(min(te.x, te.y), te.z), 0.0);
          vec3 p0 = vW;
          if (inside) { p0 = cameraPosition; tB = length(vW - cameraPosition); }
          float acc = 0.0; float dt = tB / 22.0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < 22; i++) {
            vec3 p = p0 + rd * ((float(i) + jit) * dt);
            vec3 lp = uInv * (p - uCen);
            float along = clamp(lp.z + 0.5, 0.0, 1.0);
            float fall = smoothstep(0.0, 0.06, along) * (1.0 - smoothstep(0.55, 1.0, along));
            float nz = 0.6 + 0.4 * tn2(p.xz * 2.1 + vec2(p.y * 1.9, uTT * 0.07));
            acc += sunK(p, 0.0) * fall * nz * smoothstep(0.4, 1.3, length(p - cameraPosition));
          }
          acc *= dt * uK;
          gl_FragColor = vec4(uHC * acc, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
  set(c: THREE.Vector3, U: THREE.Vector3, Vv: THREE.Vector3, hx: number, hy: number, d: THREE.Vector3, len: number, col: C3, k: number, O: THREE.Vector3) {
    const a = U.clone().multiplyScalar(2 * hx + 0.06), b = Vv.clone().multiplyScalar(2 * hy + 0.06), e = d.clone().multiplyScalar(len);
    const cen = c.clone().addScaledVector(d, len / 2);
    const m = new THREE.Matrix4().makeBasis(a, b, e).setPosition(cen);
    this.mesh.matrix.copy(m); this.mesh.matrixWorldNeedsUpdate = true;
    (this.mat.uniforms.uInv.value as THREE.Matrix3).setFromMatrix4(m).invert();
    (this.mat.uniforms.uCen.value as THREE.Vector3).copy(cen).add(O);
    (this.mat.uniforms.uHC.value as THREE.Vector3).set(...col); this.mat.uniforms.uK.value = k;
    this.mesh.visible = k > 0.002;
  }
}
/** dust motes: glow only inside the sun (kitchen) */
class SunMotes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: number[]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P[i * 3] = box[0] + r() * (box[3] - box[0]); P[i * 3 + 1] = box[1] + r() * (box[4] - box[1]); P[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
      D[i * 4] = r(); D[i * 4 + 1] = 0.0035 + 0.007 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r();
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK; varying vec3 vC; varying vec2 vQ;
        ${CORE}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.21 * sp + ph) * 0.15 + sin(uT * 0.09 + ph * 3.0) * 0.06,
            sin(uT * 0.15 * sp + ph * 2.0) * 0.12, cos(uT * 0.19 * sp + ph * 1.3) * 0.15);
          vec3 L = uSC * sunK(p, 0.0) * 0.8 + (uAU + uAD) * 0.04;
          float tw = 0.6 + 0.4 * sin(uT * (1.3 + 2.2 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.2);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = L * uK * tw * smoothstep(0.7, 1.5, dist) / max(1.0, dist * 0.2);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
}

// ============================================================ the KITCHEN
const KX = 2.8, KZ = -0.95, KY = 2.7, KZF = 4.6, CT = 0.92;
const KWIN = { z0: 0.2, z1: 1.6, y0: 1.05, y1: 2.45 };
const TK = { x0: -0.95, x1: -0.35, y0: 0.94, y1: 1.34, z0: -0.78, z1: -0.46, wy: 1.3 };
type KRig = { au: C3; ad: C3; sun: C3; winB: C3; patchB: C3; fill: C3; pend: C3; pendEm: C3; under: C3; tank: C3; tankEm: number; view: number; haze: number; hazeC: C3; motes: number; tkCol: C3; water: C3 };
const K_RIGS: Partial<Record<Look, KRig>> = {
  kitchen: { au: [0.44, 0.47, 0.62], ad: [0.42, 0.32, 0.24], sun: [3.1, 2.05, 0.95], winB: [0.55, 0.42, 0.28], patchB: [0.55, 0.33, 0.13], fill: [0.3, 0.32, 0.45], pend: [0.22, 0.15, 0.07], pendEm: [1.4, 1.05, 0.62], under: [0.4, 0.28, 0.13], tank: [0.18, 0.55, 0.6], tankEm: 1.0, view: 1.05, haze: 0.32, hazeC: [1.0, 0.72, 0.4], motes: 1.2, tkCol: [0.55, 1.0, 0.95], water: [0.25, 0.75, 0.8] },
  xray: { au: [0.05, 0.09, 0.2], ad: [0.02, 0.035, 0.08], sun: [0.12, 0.22, 0.5], winB: [0.05, 0.1, 0.25], patchB: [0.04, 0.08, 0.2], fill: [0.05, 0.09, 0.22], pend: [0, 0, 0], pendEm: [0.1, 0.16, 0.3], under: [0.02, 0.05, 0.12], tank: [0.05, 0.25, 0.5], tankEm: 0.45, view: 0.2, haze: 0.12, hazeC: [0.3, 0.6, 1.2], motes: 0.8, tkCol: [0.3, 0.5, 0.7], water: [0.1, 0.35, 0.6] },
};
class Kitchen {
  root = new THREE.Group(); S = lset();
  negX = new THREE.Group(); posX = new THREE.Group(); ceil = new THREE.Group();
  viewMat!: THREE.ShaderMaterial; backMat!: THREE.ShaderMaterial; pendMat!: THREE.ShaderMaterial; waterMat!: THREE.ShaderMaterial; bubbleMat!: THREE.MeshBasicMaterial;
  fish = new THREE.Group(); fishTail = new THREE.Group(); tad = new THREE.Group(); tadTail = new THREE.Group(); bubbles: THREE.Mesh[] = [];
  haze: Haze; motes: SunMotes;
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...KITCHEN);
    R.add(this.negX, this.posX, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat(), fu = new Bat(); // fu = furniture (casts world shadows)
    const floor = imat(S, { map: checkTex(), rep: [1 / 0.6, 1 / 0.6], spec: 40, specK: 0.22 });
    const plaster = imat(S, { map: plasterTex(), rep: [1 / 1.2, 1 / 1.2] });
    const tile = imat(S, { map: subwayTex(), rep: [1 / 0.3, 1 / 0.3], spec: 60, specK: 0.35 });
    const wood = imat(S, { map: butcherTex(), rep: [1, 1], spec: 30, specK: 0.2 });
    const paint = imat(S, { spec: 30, specK: 0.15 }), plain = imat(S, {}), gloss = imat(S, { spec: 60, specK: 0.5 }), metal = imat(S, { spec: 90, specK: 1.0 });
    const pebble = imat(S, { map: pebbleTex(), rep: [1 / 0.3, 1 / 0.3] });
    const ceilM = imat(S, { col: "#fbf2e0" });
    const MINT = "#8fd4bc", MINTD = "#6ab89e", TRIM = "#fbf6ea", BRASS = "#d9a640", CHROME = "#d8dde4", TEAL = "#2f9a94";
    // ---- floor, walls, ceiling ----
    b.add(flat(-KX, KZ, KX, KZF, 0), floor);
    b.add(wallZ(-KX, KX, 0, KY, KZ), plaster);
    bn.add(wallX(-KX, KZ, KZF, 0, KY, [[KWIN.z0, KWIN.z1, KWIN.y0, KWIN.y1]]), plaster);
    bp.add(wallX(KX, KZ, KZF, 0, KY, [[0.5, 1.45, 0, 2.1]]), plaster);
    bc.add(flat(-KX, KZ, KX, KZF, KY), ceilM);
    b.box(paint, -KX, KY - 0.09, KZ, KX, KY, KZ + 0.06, TRIM);
    for (const [bb, x, s] of [[bn, -KX, 1], [bp, KX, -1]] as [Bat, number, number][]) {
      bb.box(paint, x, 0, KZ, x + s * 0.025, 0.12, KZF, TEAL); bb.box(paint, x, KY - 0.09, KZ, x + s * 0.06, KY, KZF, TRIM);
    }
    // ---- backsplash: white subway tiles + a teal band, up to y 1.40 ----
    b.box(tile, -KX, CT, KZ, 1.98, 1.36, KZ + 0.012, "#ffffff");
    b.box(gloss, -KX, 1.36, KZ, 1.98, 1.40, KZ + 0.02, TEAL);
    // ---- base cabinets (mint, 8 bays), butcher-block top ----
    const CX0 = -KX, CX1 = 1.95, bay = (CX1 - CX0) / 8;
    fu.box(paint, CX0, 0.1, KZ, CX1, 0.885, -0.36, MINT);
    b.box(plain, CX0, 0, KZ, CX1, 0.1, -0.42, "#2a4a44");
    for (let i = 0; i < 8; i++) {
      const xa = CX0 + i * bay + 0.012, xb = xa + bay - 0.024, xm = (xa + xb) / 2;
      fu.box(paint, xa, 0.74, -0.36, xb, 0.865, -0.338, MINT); fu.box(paint, xa + 0.03, 0.765, -0.338, xb - 0.03, 0.84, -0.332, MINTD);
      fu.box(paint, xa, 0.12, -0.36, xb, 0.72, -0.338, MINT); fu.box(paint, xa + 0.05, 0.17, -0.338, xb - 0.05, 0.67, -0.33, MINTD);
      fu.box(paint, xa + 0.07, 0.19, -0.33, xb - 0.07, 0.65, -0.326, MINT);
      fu.sph(gloss, TRS(xm, 0.8, -0.32, 0, 0, 0, [0.045, 0.014, 0.014]), 10, BRASS);
      fu.sph(gloss, TRS(i % 2 ? xa + 0.06 : xb - 0.06, 0.6, -0.315, 0, 0, 0, 0.018), 10, BRASS);
    }
    fu.box(wood, CX0, 0.885, KZ, CX1 + 0.02, CT, -0.3, "#ffffff");
    // ---- sink (steel) + gooseneck tap, a dish rack ----
    {
      const x0 = -2.2, x1 = -1.62, z0 = -0.85, z1 = -0.42;
      for (const [a, c, d, e] of [[x0, x1, z0, z0 + 0.04], [x0, x1, z1 - 0.04, z1], [x0, x0 + 0.04, z0, z1], [x1 - 0.04, x1, z0, z1]]) fu.box(metal, a, CT, d, c, CT + 0.012, e, CHROME);
      fu.box(gloss, x0 + 0.04, CT + 0.001, z0 + 0.04, x1 - 0.04, CT + 0.005, z1 - 0.04, "#7a8a96");
      fu.cyl(metal, 0.022, 0.022, 0.003, 16, TRS((x0 + x1) / 2, CT + 0.0065, (z0 + z1) / 2), "#3a3a44");
      const tx = (x0 + x1) / 2;
      fu.cyl(metal, 0.03, 0.035, 0.05, 16, TRS(tx, CT + 0.025, -0.88), CHROME);
      fu.tube(metal, [V3(tx, CT + 0.04, -0.88), V3(tx, CT + 0.28, -0.88), V3(tx, CT + 0.36, -0.8), V3(tx, CT + 0.3, -0.7), V3(tx, CT + 0.22, -0.68)], 0.014, 30, CHROME, 10);
      for (const s of [-1, 1]) { fu.cyl(metal, 0.012, 0.012, 0.06, 10, TRS(tx + s * 0.11, CT + 0.03, -0.88), CHROME); fu.sph(gloss, TRS(tx + s * 0.11, CT + 0.07, -0.88, 0, 0, 0, [0.03, 0.018, 0.03]), 12, s < 0 ? "#e04a3a" : "#3a8ad8"); }
      fu.box(metal, -2.72, CT, -0.86, -2.3, CT + 0.012, -0.5, CHROME);
      for (let k = 0; k < 5; k++) fu.cyl(gloss, 0.11, 0.11, 0.012, 24, TRS(-2.62 + k * 0.05, CT + 0.12, -0.68, 0, 0, Math.PI / 2), ["#fbf6ea", "#f6d365", "#fbf6ea", "#8fd4bc", "#fbf6ea"][k]);
      for (const z of [-0.84, -0.52]) for (const x of [-2.7, -2.32]) fu.rod(metal, V3(x, CT, z), V3(x, CT + 0.14, z), 0.004, 6, CHROME);
    }
    // ---- herb pots (left of the tank) ----
    {
      const pot = (x: number, z: number, h: number, r0: number) => fu.lathe(gloss, [[0.001, 0], [r0 * 0.75, 0], [r0, h * 0.85], [r0 * 1.12, h * 0.86], [r0 * 1.12, h], [r0 * 0.95, h], [0.001, h * 0.92]], TRS(x, CT, z), 20, "#cf6a3e");
      pot(-1.42, -0.8, 0.12, 0.065); pot(-1.22, -0.84, 0.1, 0.055); pot(-1.07, -0.7, 0.09, 0.05);
      const r = rng(41);
      for (let k = 0; k < 16; k++) { const a = r() * 6.28, rr = r() * 0.05; fu.sph(plain, TRS(-1.42 + Math.cos(a) * rr, CT + 0.15 + r() * 0.1, -0.8 + Math.sin(a) * rr, a, 0.3, 0.2, [0.035, 0.018, 0.026]), 8, k % 2 ? "#4f9a42" : "#6ab454"); }
      for (let k = 0; k < 12; k++) fu.rod(plain, V3(-1.22, CT + 0.08, -0.84), V3(-1.22 + (r() - 0.5) * 0.08, CT + 0.2 + r() * 0.1, -0.84 + (r() - 0.5) * 0.08), 0.004, 5, "#3f8a3a");
      for (let k = 0; k < 9; k++) { const a = r() * 6.28; fu.sph(plain, TRS(-1.07 + Math.cos(a) * 0.03, CT + 0.11 + r() * 0.08, -0.7 + Math.sin(a) * 0.03, a, 0.4, 0, [0.025, 0.012, 0.03]), 8, "#3f8a3a"); }
    }
    // ---- fruit bowl, kettle, toaster ----
    {
      fu.lathe(gloss, [[0.001, 0], [0.06, 0], [0.12, 0.05], [0.14, 0.085], [0.135, 0.09], [0.11, 0.055], [0.001, 0.012]], TRS(0.45, CT, -0.76), 28, "#3a8ad8");
      for (const [x, z, c, s] of [[0.4, -0.78, "#ffd23a", [0.045, 0.034, 0.034]], [0.5, -0.74, "#ffd23a", [0.042, 0.034, 0.034]], [0.46, -0.8, "#f08a2a", 0.04], [0.42, -0.71, "#e0302a", 0.038]] as [number, number, string, number | C3][]) fu.sph(gloss, TRS(x, CT + 0.085, z, 0.5, 0, 0, s), 14, c);
      fu.tube(plain, [V3(0.36, CT + 0.11, -0.8), V3(0.45, CT + 0.14, -0.79), V3(0.54, CT + 0.12, -0.76)], 0.018, 12, "#f6d84a", 8);
      const kx = 0.98, kz = -0.7;
      fu.lathe(gloss, [[0.001, 0], [0.09, 0], [0.11, 0.03], [0.115, 0.1], [0.095, 0.17], [0.05, 0.2], [0.001, 0.2]], TRS(kx, CT, kz), 32, "#e0402e");
      fu.sph(gloss, TRS(kx, CT + 0.215, kz, 0, 0, 0, [0.022, 0.018, 0.022]), 12, "#1a1a1a");
      fu.tube(gloss, [V3(kx + 0.09, CT + 0.06, kz), V3(kx + 0.15, CT + 0.11, kz), V3(kx + 0.19, CT + 0.17, kz)], 0.016, 12, "#e0402e", 8);
      fu.torus(gloss, 0.085, 0.012, TRS(kx, CT + 0.2, kz, 0, 0, 0), "#1a1a1a", Math.PI);
      fu.rbox(metal, 0.26, 0.17, 0.15, 0.04, TRS(1.6, CT + 0.085, -0.72), CHROME, 3);
      for (const s of [-1, 1]) fu.box(plain, 1.6 + s * 0.05 - 0.015, CT + 0.168, -0.77, 1.6 + s * 0.05 + 0.015, CT + 0.172, -0.67, "#1a1a1a");
      fu.box(gloss, 1.73, CT + 0.1, -0.73, 1.75, CT + 0.12, -0.7, "#1a1a1a");
    }
    // ---- upper cabinet (right), mugs hanging under it ----
    {
      const x0 = 1.3, x1 = 1.95, y0 = 1.5, y1 = 2.4, z1 = -0.6;
      fu.box(paint, x0, y0, KZ, x1, y1, z1, MINT);
      for (const [a, c] of [[x0 + 0.015, (x0 + x1) / 2 - 0.006], [(x0 + x1) / 2 + 0.006, x1 - 0.015]]) {
        fu.box(paint, a, y0 + 0.02, z1, c, y1 - 0.02, z1 + 0.02, MINT); fu.box(paint, a + 0.05, y0 + 0.07, z1 + 0.02, c - 0.05, y1 - 0.07, z1 + 0.028, MINTD);
      }
      for (const x of [(x0 + x1) / 2 - 0.05, (x0 + x1) / 2 + 0.05]) fu.sph(gloss, TRS(x, y0 + 0.12, z1 + 0.04, 0, 0, 0, 0.016), 10, BRASS);
      fu.box(paint, x0 - 0.02, y1, KZ, x1 + 0.02, y1 + 0.04, z1 + 0.04, TRIM);
      ["#e0402e", "#f6d365", "#3a8ad8"].forEach((c, k) => {
        const x = 1.45 + k * 0.17;
        fu.rod(metal, V3(x, y0, -0.75), V3(x, y0 - 0.035, -0.75), 0.004, 6, BRASS);
        fu.lathe(gloss, [[0.001, 0], [0.038, 0], [0.042, 0.095], [0.038, 0.095], [0.034, 0.008], [0.001, 0.008]], TRS(x, y0 - 0.14, -0.75, 0, Math.PI, 0), 18, c);
        fu.torus(gloss, 0.024, 0.006, TRS(x + 0.045, y0 - 0.09, -0.75), c);
      });
      fu.lathe(gloss, [[0.001, 0], [0.12, 0], [0.13, 0.09], [0.001, 0.09]], TRS(1.5, y1 + 0.04, -0.78), 24, "#c2563a");
      fu.cyl(plain, 0.09, 0.08, 0.14, 18, TRS(1.78, y1 + 0.11, -0.78), "#d8b070");
    }
    // ---- the retro FRIDGE (pale yellow, chrome, magnets) ----
    {
      const fx = 2.37, fz = -0.595, fw = 0.76, fh = 1.72, fd = 0.7;
      fu.rbox(gloss, fw, fh, fd, 0.1, TRS(fx, 0.06 + fh / 2, fz), "#f6dc8a", 4);
      b.box(plain, fx - fw / 2 + 0.04, 0, fz - fd / 2 + 0.04, fx + fw / 2 - 0.04, 0.06, fz + fd / 2 - 0.05, "#2a2a2a");
      const zf = fz + fd / 2;
      fu.box(plain, fx - fw / 2 + 0.03, 1.27, zf - 0.03, fx + fw / 2 - 0.03, 1.285, zf + 0.002, "#7a6a4a");
      for (const [y0, y1] of [[1.36, 1.62], [0.5, 1.15]]) { fu.rod(metal, V3(fx - 0.28, y0, zf + 0.035), V3(fx - 0.28, y1, zf + 0.035), 0.016, 10, CHROME); for (const y of [y0, y1]) fu.box(metal, fx - 0.3, y - 0.015, zf - 0.01, fx - 0.26, y + 0.015, zf + 0.04, CHROME); }
      fu.rbox(metal, 0.3, 0.05, 0.02, 0.02, TRS(fx + 0.06, 1.68, zf), CHROME);
      const art = imat(S, { map: fridgeArtTex() });
      const pa = new THREE.PlaneGeometry(0.2, 0.256); const ua = pa.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < ua.count; i++) ua.setX(i, ua.getX(i) * (200 / 512));
      fu.add(pa, art, TRS(fx + 0.12, 0.95, zf + 0.004, 0, 0, 0.06));
      const pb = new THREE.PlaneGeometry(0.16, 0.146); const ub = pb.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < ub.count; i++) ub.setX(i, 232 / 512 + ub.getX(i) * (280 / 512));
      fu.add(pb, art, TRS(fx - 0.06, 1.48, zf + 0.004, 0, 0, -0.08));
      fu.cyl(gloss, 0.02, 0.02, 0.012, 14, TRS(fx + 0.12, 1.07, zf + 0.008, 0, Math.PI / 2), "#e0402e");
      fu.cyl(gloss, 0.018, 0.018, 0.012, 14, TRS(fx - 0.06, 1.55, zf + 0.008, 0, Math.PI / 2), "#3a8ad8");
      ["#e0402e", "#3a8ad8", "#4fae4a", "#f08a2a", "#9a5ac8"].forEach((c, k) => fu.rbox(gloss, 0.04, 0.05, 0.012, 0.008, TRS(fx - 0.04 + k * 0.055, 0.66 + (k % 2) * 0.03, zf + 0.006, 0, 0, (k - 2) * 0.12), c));
      fu.sph(gloss, TRS(fx + 0.22, 1.2, zf + 0.012, 0, 0, 0, [0.025, 0.025, 0.012]), 12, "#e0302a");
      fu.sph(gloss, TRS(fx + 0.17, 0.78, zf + 0.012, 0, 0, 0, [0.03, 0.022, 0.012]), 12, "#ffd23a");
    }
    // ---- open shelf (left) with jars, bowls, a vine; a clock ----
    {
      fu.box(wood, -2.78, 1.62, KZ, -1.38, 1.65, -0.73, "#ffffff");
      for (const x of [-2.55, -1.6]) fu.box(paint, x - 0.012, 1.5, KZ, x + 0.012, 1.62, -0.8, TRIM);
      const jar = (x: number, h: number, c: string, lid: string) => { fu.lathe(gloss, [[0.001, 0], [0.055, 0], [0.058, h * 0.9], [0.045, h], [0.001, h]], TRS(x, 1.65, -0.84), 20, c); fu.cyl(gloss, 0.05, 0.05, 0.03, 18, TRS(x, 1.65 + h + 0.012, -0.84), lid); };
      jar(-2.6, 0.18, "#f2d68a", "#a06a3a"); jar(-2.45, 0.14, "#c86a3a", "#a06a3a"); jar(-2.31, 0.2, "#f6f0e0", "#a06a3a");
      for (let k = 0; k < 3; k++) fu.lathe(gloss, [[0.001, 0], [0.05, 0], [0.09, 0.045], [0.085, 0.048], [0.045, 0.006], [0.001, 0.006]], TRS(-2.05, 1.65 + k * 0.035, -0.84), 22, ["#3a8ad8", "#f6d365", "#e0402e"][k]);
      fu.lathe(gloss, [[0.001, 0], [0.06, 0], [0.07, 0.11], [0.001, 0.11]], TRS(-1.65, 1.65, -0.84), 18, "#f2ece0");
      const r = rng(9);
      for (let k = 0; k < 6; k++) {
        const L = 0.25 + r() * 0.45, p0 = V3(-1.65, 1.75, -0.84);
        const pts = [p0, V3(p0.x + (r() - 0.5) * 0.18, 1.68, -0.72), V3(p0.x + (r() - 0.5) * 0.26, 1.75 - L, -0.7)];
        fu.tube(plain, pts, 0.004, 12, "#3f7a3a", 5);
        const cv = new THREE.CatmullRomCurve3(pts);
        for (let q = 1; q < 6; q++) { const P = cv.getPoint(q / 6); fu.sph(gloss, TRS(P.x, P.y, P.z + 0.01, k + q, 0.5, 0.5, [0.032, 0.006, 0.025]), 8, q % 2 ? "#5aa04a" : "#79b858"); }
      }
      fu.torus(gloss, 0.16, 0.022, TRS(-2.05, 2.18, KZ + 0.02), "#e0402e");
      fu.add(new THREE.CircleGeometry(0.155, 32), imat(S, { map: clockTex() }), TRS(-2.05, 2.18, KZ + 0.012));
    }
    // ---- the FISH TANK ----
    {
      const { x0, x1, y0, y1, z0, z1, wy } = TK, K = "#1d1d24";
      fu.box(gloss, x0 - 0.02, CT, z0 - 0.02, x1 + 0.02, y0, z1 + 0.02, K);
      for (const y of [y0, y1 - 0.02]) { fu.box(gloss, x0 - 0.012, y, z0 - 0.012, x1 + 0.012, y + 0.02, z0, K); fu.box(gloss, x0 - 0.012, y, z1, x1 + 0.012, y + 0.02, z1 + 0.012, K); fu.box(gloss, x0 - 0.012, y, z0, x0, y + 0.02, z1, K); fu.box(gloss, x1, y, z0, x1 + 0.012, y + 0.02, z1, K); }
      for (const x of [x0 - 0.006, x1 + 0.006]) for (const z of [z0 - 0.006, z1 + 0.006]) fu.box(gloss, x - 0.006, y0, z - 0.006, x + 0.006, y1, z + 0.006, K);
      fu.box(gloss, x0 - 0.015, y1, z0 - 0.015, x1 + 0.015, y1 + 0.03, (z0 + z1) / 2, K);
      this.backMat = imat(S, { map: tankBackTex(), emap: true, em: [1, 1, 1] });
      fu.add(new THREE.PlaneGeometry(x1 - x0 - 0.01, y1 - y0 - 0.01), this.backMat, TRS((x0 + x1) / 2, (y0 + y1) / 2, z0 + 0.002));
      fu.box(pebble, x0 + 0.003, y0, z0 + 0.004, x1 - 0.003, y0 + 0.05, z1 - 0.003, "#ffffff");
      const r = rng(5);
      for (let k = 0; k < 6; k++) fu.sph(gloss, TRS(x0 + 0.05 + r() * 0.5, y0 + 0.05, z0 + 0.05 + r() * 0.15, r() * 3, 0, 0, [0.03 + r() * 0.03, 0.02 + r() * 0.025, 0.03]), 10, ["#9a9aa6", "#c8b8a0", "#7a8a96"][k % 3]);
      // little castle
      const cx = x0 + 0.14, cz = z0 + 0.1;
      fu.cyl(plain, 0.045, 0.05, 0.14, 16, TRS(cx, y0 + 0.12, cz), "#e8d8c0");
      for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; fu.box(plain, cx + Math.cos(a) * 0.04 - 0.01, y0 + 0.19, cz + Math.sin(a) * 0.04 - 0.01, cx + Math.cos(a) * 0.04 + 0.01, y0 + 0.21, cz + Math.sin(a) * 0.04 + 0.01, "#e8d8c0"); }
      fu.box(plain, cx - 0.018, y0 + 0.05, cz + 0.04, cx + 0.018, y0 + 0.1, cz + 0.052, "#3a2a2a");
      fu.rod(plain, V3(cx, y0 + 0.19, cz), V3(cx, y0 + 0.27, cz), 0.003, 5, "#3a2a2a");
      fu.add(new THREE.PlaneGeometry(0.05, 0.03).translate(0.025, 0, 0), plain, TRS(cx, y0 + 0.255, cz), "#e0402e");
      // plants
      for (let k = 0; k < 9; k++) {
        const px2 = x0 + 0.28 + (k % 3) * 0.1 + r() * 0.06, pz = z0 + 0.05 + r() * 0.08, h = 0.14 + r() * 0.16;
        const pts = [V3(px2, y0 + 0.05, pz), V3(px2 + (r() - 0.5) * 0.04, y0 + 0.05 + h * 0.5, pz), V3(px2 + (r() - 0.5) * 0.06, y0 + 0.05 + h, pz + 0.01)];
        fu.tube(plain, pts, 0.004, 10, "#3f8a3a", 5);
        const cv = new THREE.CatmullRomCurve3(pts);
        for (let q = 1; q <= 5; q++) { const P = cv.getPoint(q / 5); fu.sph(plain, TRS(P.x, P.y, P.z, k + q, 0, q % 2 ? 0.7 : -0.7, [0.03, 0.008, 0.012]), 8, k % 2 ? "#4fae4a" : "#2f8a46"); }
      }
      fu.cyl(plain, 0.012, 0.012, 0.02, 10, TRS(x1 - 0.06, y0 + 0.06, z0 + 0.05), "#8a8a96");
      fu.rod(plain, V3(x1 - 0.06, y0 + 0.07, z0 + 0.05), V3(x1 - 0.04, y1, z0 + 0.03), 0.003, 5, "#c8e0e0");
      // the water: a soft aqua volume (NOINK, no depth write) + a glass glint
      this.waterMat = new THREE.ShaderMaterial({
        uniforms: { uCol: { value: V3(0.25, 0.75, 0.8) }, uA: { value: 0.22 } },
        vertexShader: `varying vec3 vW; varying vec3 vN; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
        fragmentShader: `uniform vec3 uCol; uniform float uA; varying vec3 vW; varying vec3 vN;
          void main(){ vec3 v = normalize(cameraPosition - vW); float fr = pow(1.0 - abs(dot(normalize(vN), v)), 2.0);
            gl_FragColor = vec4(uCol * (0.9 + 0.8 * fr), uA + 0.35 * fr); }`,
        transparent: true, depthWrite: false, side: THREE.FrontSide,
      });
      const wg = new THREE.BoxGeometry(x1 - x0 - 0.006, wy - y0 - 0.002, z1 - z0 - 0.006); wg.translate((x0 + x1) / 2, (y0 + wy) / 2, (z0 + z1) / 2);
      const wm = new THREE.Mesh(wg, this.waterMat); wm.layers.set(NOINK); wm.renderOrder = 3; wm.frustumCulled = false; R.add(wm);
      const glint = ctex("hiGlint", 256, 128, (g) => { g.clearRect(0, 0, 256, 128); g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(30, 128); g.lineTo(70, 128); g.lineTo(130, 0); g.lineTo(90, 0); g.fill(); g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.moveTo(90, 128); g.lineTo(100, 128); g.lineTo(160, 0); g.lineTo(150, 0); g.fill(); });
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), new THREE.MeshBasicMaterial({ map: glint, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 }));
      gl.position.set((x0 + x1) / 2, (y0 + y1) / 2, z1 + 0.002); gl.layers.set(NOINK); gl.renderOrder = 4; gl.frustumCulled = false; R.add(gl);
      // goldfish (+x is its nose) and a little tadpole
      {
        const fb = new Bat(), tb = new Bat();
        fb.sph(gloss, TRS(0, 0, 0, 0, 0, 0, [0.045, 0.03, 0.022]), 16, "#ff8a2a");
        fb.sph(gloss, TRS(0.005, -0.008, 0, 0, 0, 0, [0.035, 0.02, 0.019]), 12, "#ffc070");
        fb.add(new THREE.PlaneGeometry(0.04, 0.02).translate(0, 0.01, 0), gloss, TRS(0, 0.025, 0, 0, 0, -0.2), "#ff6a20");
        for (const s of [-1, 1]) { fb.sph(gloss, TRS(0.03, 0.008, s * 0.016, 0, 0, 0, 0.008), 10, "#ffffff"); fb.sph(gloss, TRS(0.034, 0.008, s * 0.02, 0, 0, 0, 0.0045), 8, "#111111"); }
        fb.build(this.fish);
        tb.sph(gloss, TRS(-0.03, 0, 0, 0, 0, 0, [0.035, 0.02, 0.003]), 12, "#ff6a20"); tb.build(this.fishTail);
        this.fishTail.position.set(-0.035, 0, 0); this.fish.add(this.fishTail);
        const ab = new Bat(), at = new Bat();
        ab.sph(gloss, TRS(0, 0, 0, 0, 0, 0, [0.022, 0.017, 0.016]), 14, "#4a5a3a");
        for (const s of [-1, 1]) { ab.sph(gloss, TRS(0.014, 0.006, s * 0.01, 0, 0, 0, 0.006), 8, "#ffffff"); ab.sph(gloss, TRS(0.017, 0.006, s * 0.012, 0, 0, 0, 0.003), 6, "#111111"); }
        ab.build(this.tad);
        at.sph(gloss, TRS(-0.03, 0, 0, 0, 0, 0, [0.032, 0.011, 0.003]), 12, "#5a6a48"); at.build(this.tadTail);
        this.tadTail.position.set(-0.012, 0, 0); this.tad.add(this.tadTail);
        R.add(this.fish, this.tad);
      }
      this.bubbleMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.85, 1.0, 1.0) });
      const sg = new THREE.SphereGeometry(1, 10, 6);
      for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(sg, this.bubbleMat); m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = 4; R.add(m); this.bubbles.push(m); }
    }
    // ---- the SIDE WINDOW (left wall): reveal, sash bars (= the sun aperture), sill + geranium, gingham valance ----
    {
      const { z0, z1, y0, y1 } = KWIN, D = 0.2, xb = -KX - 0.12;
      bn.box(plaster, -KX - D, y0, z0 - 0.002, -KX, y1, z0); bn.box(plaster, -KX - D, y0, z1, -KX, y1, z1 + 0.002); bn.box(plaster, -KX - D, y1, z0, -KX, y1 + 0.002, z1);
      for (const [a, c, d, e] of [[z0 - 0.07, z0, y0 - 0.02, y1 + 0.07], [z1, z1 + 0.07, y0 - 0.02, y1 + 0.07], [z0 - 0.07, z1 + 0.07, y1, y1 + 0.07]]) bn.box(paint, -KX, d, a, -KX + 0.03, e, c, TRIM);
      for (const [a, c, d, e] of [[z0, z0 + 0.04, y0, y1], [z1 - 0.04, z1, y0, y1], [z0, z1, y1 - 0.04, y1], [z0, z1, y0, y0 + 0.04]]) bn.box(paint, xb - 0.025, d, a, xb + 0.025, e, c, TRIM);
      for (const k of [1, 2]) { const z = z0 + ((z1 - z0) * k) / 3; bn.box(paint, xb - 0.02, y0 + 0.04, z - 0.02, xb + 0.02, y1 - 0.04, z + 0.02, TRIM); }
      bn.box(paint, xb - 0.02, (y0 + y1) / 2 - 0.02, z0 + 0.04, xb + 0.02, (y0 + y1) / 2 + 0.02, z1 - 0.04, TRIM);
      bn.box(paint, -KX - D, y0 - 0.05, z0 - 0.12, -KX + 0.14, y0, z1 + 0.12, TRIM);
      bn.lathe(gloss, [[0.001, 0], [0.06, 0], [0.075, 0.11], [0.082, 0.12], [0.001, 0.115]], TRS(-KX + 0.02, y0, 0.55), 20, "#cf6a3e");
      const r = rng(3);
      for (let k = 0; k < 12; k++) { const a = r() * 6.28; bn.sph(plain, TRS(-KX + 0.02 + Math.cos(a) * 0.06, y0 + 0.16 + r() * 0.06, 0.55 + Math.sin(a) * 0.06, a, 0, 0, [0.04, 0.02, 0.04]), 8, "#4f9a42"); }
      for (let k = 0; k < 5; k++) { const a = r() * 6.28; bn.sph(gloss, TRS(-KX + 0.02 + Math.cos(a) * 0.04, y0 + 0.25 + r() * 0.05, 0.55 + Math.sin(a) * 0.04, 0, 0, 0, 0.03), 8, "#e8343e"); }
      bn.lathe(gloss, [[0.001, 0], [0.04, 0], [0.045, 0.07], [0.001, 0.07]], TRS(-KX + 0.02, y0, 1.3), 16, "#3a8ad8");
      bn.cyl(plain, 0.025, 0.03, 0.12, 12, TRS(-KX + 0.02, y0 + 0.13, 1.3), "#5aa04a");
      const ging = imat(S, { map: ginghamTex(), rep: [6, 6] });
      bn.box(ging, -KX, y1 + 0.03, z0 - 0.14, -KX + 0.08, y1 + 0.22, z1 + 0.14, "#ffffff");
      for (let k = 0; k < 10; k++) { const z = z0 - 0.1 + ((z1 - z0 + 0.2) * (k + 0.5)) / 10; bn.sph(ging, TRS(-KX + 0.08, y1 + 0.04, z, 0, 0, 0, [0.02, 0.03, 0.06]), 10, "#ffffff"); }
      this.viewMat = imat(S, { map: gardenTex(), emap: true, em: [1, 1, 1] });
      const card = solo(new THREE.PlaneGeometry(7, 5.25).rotateY(Math.PI / 2), this.viewMat); card.position.set(-KX - 2.8, 1.9, 0.9); card.layers.set(NOINK); R.add(card);
    }
    // ---- right wall: a door (mint), a shelf with an apron ----
    {
      bp.box(paint, KX - 0.02, 0, 0.5, KX - 0.06, 2.1, 1.45, MINT);
      bp.box(paint, KX - 0.06, 0.15, 0.6, KX - 0.07, 0.95, 1.35, MINTD); bp.box(paint, KX - 0.06, 1.1, 0.6, KX - 0.07, 1.95, 1.35, MINTD);
      bp.sph(gloss, TRS(KX - 0.1, 1.0, 1.32, 0, 0, 0, 0.03), 12, BRASS);
      for (const [a, c] of [[0.42, 0.5], [1.45, 1.53]]) bp.box(paint, KX - 0.04, 0, a, KX, 2.18, c, TRIM);
      bp.box(paint, KX - 0.04, 2.1, 0.42, KX, 2.18, 1.53, TRIM);
      bp.box(wood, KX - 0.03, 1.6, -0.3, KX, 1.66, 0.25, "#ffffff");
      bp.rbox(plain, 0.04, 0.6, 0.36, 0.02, TRS(KX - 0.06, 1.3, -0.1, 0, 0, 0.04), "#e04a5a");
    }
    // ---- breakfast table under the window + 2 chairs, cereal + milk ----
    {
      const tx = -1.85, tz = 1.15;
      fu.cyl(gloss, 0.42, 0.42, 0.03, 40, TRS(tx, 0.74, tz), "#f6d365");
      fu.torus(metal, 0.42, 0.012, TRS(tx, 0.74, tz, 0, Math.PI / 2), CHROME);
      fu.cyl(metal, 0.035, 0.05, 0.72, 16, TRS(tx, 0.37, tz), CHROME); fu.cyl(metal, 0.25, 0.27, 0.025, 30, TRS(tx, 0.012, tz), CHROME);
      for (const [cx, cz, yaw] of [[-2.3, 1.55, -0.7], [-1.35, 1.6, 0.6]] as [number, number, number][]) {
        const M = (x: number, y: number, z: number) => TRS(x, y, z).premultiply(TRS(cx, 0, cz, yaw));
        fu.rbox(gloss, 0.4, 0.07, 0.4, 0.03, M(0, 0.46, 0), "#e04a3a");
        fu.rbox(gloss, 0.38, 0.22, 0.05, 0.025, M(0, 0.78, 0.18), "#e04a3a");
        for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) fu.add(new THREE.CylinderGeometry(0.012, 0.012, 0.43, 8), metal, M(x, 0.215, z), CHROME);
        for (const s of [-1, 1]) fu.add(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 8), metal, M(s * 0.16, 0.68, 0.19), CHROME);
      }
      const cer = imat(S, { map: cerealTex() });
      fu.box(plain, tx - 0.1, 0.755, tz - 0.12, tx + 0.1, 1.06, tz - 0.05, "#2a78d0");
      fu.add(new THREE.PlaneGeometry(0.2, 0.3), cer, TRS(tx, 0.905, tz - 0.049));
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.075, 0.05], [0.072, 0.052], [0.037, 0.004], [0.001, 0.004]], TRS(tx + 0.12, 0.755, tz + 0.1), 22, "#f6f0e2");
      fu.lathe(gloss, [[0.001, 0], [0.04, 0], [0.042, 0.13], [0.03, 0.18], [0.022, 0.22], [0.001, 0.22]], TRS(tx - 0.16, 0.755, tz + 0.12), 18, "#fbfbf6");
      fu.cyl(metal, 0.024, 0.024, 0.012, 12, TRS(tx - 0.16, 0.98, tz + 0.12), "#3a8ad8");
    }
    // ---- ceiling pendant ----
    {
      bc.rod(plain, V3(0.2, KY, 0.5), V3(0.2, 2.36, 0.5), 0.006, 6, "#1a1a1a");
      bc.lathe(gloss, [[0.001, 0.12], [0.04, 0.12], [0.08, 0.08], [0.18, 0.0], [0.175, -0.005], [0.075, 0.07], [0.001, 0.105]], TRS(0.2, 2.24, 0.5), 32, TEAL);
      this.pendMat = imat(S, { col: "#000000", em: [1.4, 1.05, 0.62] });
      bc.sph(this.pendMat, TRS(0.2, 2.28, 0.5, 0, 0, 0, 0.05), 16, "#ffffff");
    }
    b.build(R); fu.build(R, true); bn.build(this.negX); bp.build(this.posX); bc.build(this.ceil);
    this.haze = new Haze(R, S);
    this.motes = new SunMotes(R, S, 900, 31, [-2.7, 0.9, -0.9, 1.4, 2.5, 1.7]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const rg = mixRig(lookW(id, f), K_RIGS, "kitchen");
    // the low sun through the left window: one golden patch with bar stripes over the plain wall behind BEAN
    const wc = V3(-KX - 0.12, (KWIN.y0 + KWIN.y1) / 2, (KWIN.z0 + KWIN.z1) / 2);
    const sd = V3(wc.x - 0.1, wc.y - 1.66, wc.z - KZ).normalize(); // toward the sun (patch centre (0.1, 1.66) on the wall)
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...rg.sun);
    (S.u.uWC.value as THREE.Vector3).copy(wc).add(O); (S.u.uWN.value as THREE.Vector3).set(1, 0, 0);
    (S.u.uWU.value as THREE.Vector3).set(0, 0, 1); (S.u.uWV.value as THREE.Vector3).set(0, 1, 0);
    (S.u.uWH.value as THREE.Vector2).set((KWIN.z1 - KWIN.z0) / 2 - 0.04, (KWIN.y1 - KWIN.y0) / 2 - 0.04);
    (S.u.uWM.value as THREE.Vector4).set(3, 2, 0.02, 0.35);
    (S.u.uO.value as THREE.Vector3).copy(O); (S.u.uBox.value as THREE.Vector4).set(KX, KZ, KY, 0); S.u.uAO.value = 1;
    S.u.uTT.value = t; S.u.uWallZ.value = O.z + KZ;
    (S.u.uTkMin.value as THREE.Vector3).copy(W2(TK.x0, TK.y0, TK.z0)); (S.u.uTkMax.value as THREE.Vector3).copy(W2(TK.x1, TK.wy, TK.z1));
    (S.u.uTkCol.value as THREE.Vector3).set(...rg.tkCol); S.u.uCau.value = rg.tankEm;
    const shd = shadowAt(id, t);
    (S.u.uTad.value as THREE.Vector4).set(O.x - 1.25 + 2.6 * shd.x, O.y + TADPOLE_SHADOW_Y, 0.2, clamp01(shd.show));
    const dn = sd.clone().negate();
    setLights(S, [
      { p: W2(-2.2, 1.75, 0.9), c: rg.winB, r: 1.5 },
      { p: W2(0.1, 1.55, -0.45), c: rg.patchB, r: 1.5 },
      { p: W2(0.3, 1.7, 3.6), c: rg.fill, r: 3.4 },
      { p: W2(0.2, 2.15, 0.5), c: rg.pend, r: 1.3 },
      { p: W2(1.62, 1.42, -0.72), c: rg.under, r: 0.55 },
      { p: W2(-0.65, 1.3, -0.62), c: rg.tank, r: 0.45 },
      { p: W2(-1.85, 0.4, 1.15), c: sc3(rg.winB, 0.3), r: 1.0 },
      { p: W2(2.3, 1.3, 0.6), c: sc3(rg.fill, 0.6), r: 1.4 },
    ], rg.au, rg.ad);
    (this.viewMat.uniforms.uEm.value as THREE.Vector3).set(rg.view, rg.view, rg.view * (1 + (1.05 - rg.view) * 0.5));
    (this.backMat.uniforms.uEm.value as THREE.Vector3).set(rg.tankEm, rg.tankEm, rg.tankEm);
    (this.pendMat.uniforms.uEm.value as THREE.Vector3).set(...rg.pendEm);
    (this.waterMat.uniforms.uCol.value as THREE.Vector3).set(...rg.water);
    this.bubbleMat.color.setRGB(0.85 * rg.tankEm, 1.0 * rg.tankEm, 1.0 * rg.tankEm);
    this.haze.set(wc, V3(0, 0, 1), V3(0, 1, 0), (KWIN.z1 - KWIN.z0) / 2, (KWIN.y1 - KWIN.y0) / 2, dn, 3.8, rg.hazeC, rg.haze, O);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = rg.motes;
    // tank life: the goldfish loops, the tadpole wiggles, bubbles rise (scaled in/out: no pops)
    const cxT = (TK.x0 + TK.x1) / 2, czT = (TK.z0 + TK.z1) / 2;
    const fa = t * 0.9, fp = (a: number) => V3(cxT + Math.cos(a) * 0.17, 1.15 + Math.sin(a * 2.0) * 0.03, czT + Math.sin(a) * 0.06);
    const p0 = fp(fa), p1 = fp(fa + 0.05);
    this.fish.position.copy(p0); this.fish.rotation.set(0, -Math.atan2(p1.z - p0.z, p1.x - p0.x), Math.sin(fa * 2.0) * 0.1);
    this.fishTail.rotation.y = Math.sin(t * 11) * 0.45;
    const ta = -t * 0.6 + 2.0, tp = (a: number) => V3(cxT + Math.cos(a) * 0.12, 1.07 + Math.sin(a * 3.0) * 0.025, czT + Math.sin(a) * 0.045);
    const q0 = tp(ta), q1 = tp(ta - 0.05);
    this.tad.position.copy(q0); this.tad.rotation.set(0, -Math.atan2(q1.z - q0.z, q1.x - q0.x), 0);
    this.tadTail.rotation.y = Math.sin(t * 16) * 0.6;
    this.bubbles.forEach((m, k) => {
      const u = (t * 0.32 + k / this.bubbles.length) % 1, s = 0.004 + 0.0015 * (k % 3);
      m.position.set(TK.x1 - 0.045 + Math.sin(t * 3 + k * 2.1) * 0.006, TK.y0 + 0.07 + u * (TK.wy - TK.y0 - 0.08), TK.z0 + 0.04 + Math.cos(t * 2.3 + k) * 0.005);
      m.scale.setScalar(s * smooth(u / 0.08) * (1 - smooth((u - 0.9) / 0.1)) + 1e-5);
    });
    const c = cam.position.clone().sub(O);
    this.negX.visible = c.x > -KX + 0.1; this.posX.visible = c.x < KX - 0.1; this.ceil.visible = c.y < KY - 0.1;
  }
}

// ============================================================ the FARM (1922 Iowa), world two-tone materials
/** per-look tints for the self-lit parts: [far layers, sun glow, dust r g b] */
const FARM_TINT: Partial<Record<Look, number[]>> = {
  farm: [1.0, 1.0, 1.0, 0.82, 0.55],
  peak: [1.1, 1.3, 1.1, 0.7, 0.6],
};
const BZ = -2.2, BX0 = -4.4, BX1 = 1.0, BZB = -11.5, EAVE = 3.5, RIDGE = 6.5, KNY = 5.3, KNX = 1.75;
const BXC = (BX0 + BX1) / 2, BHW = (BX1 - BX0) / 2;
const DX0 = -3.6, DX1 = -1.6, DH = 2.9;
const CAL = { x: -0.55, y0: 1.42, y1: 2.28, pw: 0.54, ph: 0.55, py: 1.745 };
const PAGES = 16, LIFE = 0.45;
class Farm {
  root = new THREE.Group();
  m: Record<string, THREE.MeshLambertMaterial>;
  layers: { mat: THREE.MeshBasicMaterial; col: THREE.Color }[] = [];
  sunGlow: THREE.Sprite; sunHalo: THREE.Sprite;
  wheel = new THREE.Group(); tree = new THREE.Group();
  calPage!: THREE.Mesh; calStrip!: THREE.Mesh; pad!: THREE.Mesh; calTex = new PageTex(512);
  pages: { g: THREE.Group; tex: PageTex }[] = [];
  trans: number[] = [];
  dust!: THREE.Mesh; dustMat!: THREE.ShaderMaterial;
  constructor() {
    const R = this.root;
    R.position.set(...FARM);
    const L = (o: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, ...o }));
    const m = this.m = {
      barn: L({ map: tiled(barnTex(), 1.6) }), shingle: L({ map: tiled(shingleTex(), 1.2), side: THREE.DoubleSide }),
      dirt: L({ map: tiled(dirtTex(), 3) }), grass: L({ map: tiled(grassTex(), 2.5) }), stone: L({ map: tiled(stoneTex(), 1) }),
      hay: L({ map: tiled(hayTex(), 0.6) }), plank: L({ map: tiled(plankTex(), 1) }), paint: L({}), fence: L({}), metal: L({}),
      leaf: L({ side: THREE.DoubleSide }), head: L({ map: calHeadTex() }),
    };
    const b = new Bat(), bb = new Bat(); // b casts shadows, bb (ground) does not
    const TRIM = "#f4ede0", IRON = "#3a3436";
    // ---- ground: pasture + the dusty yard ----
    bb.add(flat(-300, -300, 300, 300, 0), m.grass);
    {
      const r = rng(17), n = 72, pos: number[] = [], uv: number[] = [];
      const pt = (a: number) => { const rr = 10 + Math.sin(a * 3 + 1) * 1.6 + Math.sin(a * 7) * 0.8 + (r() - 0.5) * 0.3; return [-0.5 + Math.cos(a) * rr * 1.2, 0.5 + Math.sin(a) * rr]; };
      const ring = Array.from({ length: n }, (_, i) => pt((i / n) * Math.PI * 2));
      for (let i = 0; i < n; i++) { const [ax, az] = ring[i], [cx2, cz2] = ring[(i + 1) % n]; for (const [x, z] of [[-0.5, 0.5], [cx2, cz2], [ax, az]]) { pos.push(x, 0.006, z); uv.push(x, -z); } }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
      bb.add(g, m.dirt);
      bb.add(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), m.paint, TRS(2.4, 0.01, -0.9, 0, 0, 0, [1.1, 1, 0.7]), "#6a4a34");
    }
    // ---- the RED BARN (gambrel) ----
    {
      const s = new THREE.Shape();
      s.moveTo(BX0, 0); s.lineTo(DX0, 0); s.lineTo(DX0, DH); s.lineTo(DX1, DH); s.lineTo(DX1, 0); s.lineTo(BX1, 0); s.lineTo(BX1, EAVE);
      s.lineTo(BXC + KNX, KNY); s.lineTo(BXC, RIDGE); s.lineTo(BXC - KNX, KNY); s.lineTo(BX0, EAVE); s.closePath();
      const hole = new THREE.Path(); hole.moveTo(BXC - 0.5, 3.85); hole.lineTo(BXC - 0.5, 5.0); hole.lineTo(BXC + 0.5, 5.0); hole.lineTo(BXC + 0.5, 3.85); hole.closePath(); s.holes.push(hole);
      b.add(new THREE.ShapeGeometry(s).translate(0, 0, BZ), m.barn);
      const sb = new THREE.Shape(); sb.moveTo(BX0, 0); sb.lineTo(BX1, 0); sb.lineTo(BX1, EAVE); sb.lineTo(BXC + KNX, KNY); sb.lineTo(BXC, RIDGE); sb.lineTo(BXC - KNX, KNY); sb.lineTo(BX0, EAVE); sb.closePath();
      b.add(new THREE.ShapeGeometry(sb).translate(0, 0, BZB), m.barn);
      b.add(wallX(BX0, BZB, BZ, 0, EAVE), m.barn); b.add(wallX(BX1, BZB, BZ, 0, EAVE), m.barn);
      // roof: 4 gambrel slopes with overhang
      const oz0 = BZ + 0.35, oz1 = BZB - 0.3;
      for (const sd of [-1, 1]) {
        const e = [BXC + sd * (BHW + 0.28), EAVE - 0.17], k = [BXC + sd * KNX, KNY], rd = [BXC, RIDGE + 0.02];
        for (const [a, c] of [[e, k], [k, rd]]) {
          const A = V3(a[0], a[1], oz0), B = V3(c[0], c[1], oz0), Cc = V3(c[0], c[1], oz1), D = V3(a[0], a[1], oz1);
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
          b.add(sd > 0 ? quad4(A, D, Cc, B, [0, 0, oz0 - oz1, 0, oz0 - oz1, len, 0, len]) : quad4(A, B, Cc, D, [0, 0, 0, len, oz0 - oz1, len, oz0 - oz1, 0]), m.shingle);
          b.board(m.paint, V3(a[0], a[1] - 0.03, oz0 + 0.02), V3(c[0], c[1] - 0.03, oz0 + 0.02), 0.2, 0.05, V3(0, 0, 1), TRIM);
        }
      }
      b.rod(m.paint, V3(BXC, RIDGE + 0.05, oz0), V3(BXC, RIDGE + 0.05, oz1), 0.07, 8, "#4a3a34");
      // corner + eave trims, a white door surround, foundation stones, a door sill
      for (const x of [BX0, BX1]) for (const z of [BZ, BZB]) b.box(m.paint, x - 0.09, 0.32, z - 0.09, x + 0.09, EAVE, z + 0.09, TRIM);
      for (const x of [BX0, BX1]) b.box(m.paint, x - 0.06, EAVE - 0.22, BZB + 0.09, x + 0.06, EAVE - 0.02, BZ - 0.09, TRIM);
      for (const [a, c, d, e] of [[DX0 - 0.14, DX0, 0.32, DH + 0.14], [DX1, DX1 + 0.14, 0.32, DH + 0.14], [DX0 - 0.14, DX1 + 0.14, DH, DH + 0.14]]) b.box(m.paint, a, d, BZ, c, e, BZ + 0.06, TRIM);
      for (const [x0, x1] of [[BX0 - 0.06, DX0], [DX1, BX1 + 0.06]]) b.box(m.stone, x0, 0, BZ - 0.3, x1, 0.32, BZ + 0.07, "#ffffff");
      b.box(m.stone, BX0 - 0.06, 0, BZB - 0.07, BX0 + 0.3, 0.32, BZ - 0.3, "#ffffff"); b.box(m.stone, BX1 - 0.3, 0, BZB - 0.07, BX1 + 0.06, 0.32, BZ - 0.3, "#ffffff");
      b.box(m.plank, DX0, 0, BZ - 0.1, DX1, 0.08, BZ + 0.45, "#c0b0a0");
      // the dark interior behind the door (hay, a ladder)
      const IZ = BZ - 3.2;
      b.add(wallZ(DX0 - 0.6, DX1 + 0.6, 0, 3.0, IZ), m.plank, undefined, "#5a3a2a");
      b.add(wallX(DX0 - 0.6, IZ, BZ - 0.01, 0, 3.0), m.plank, undefined, "#4a3022"); b.add(wallX(DX1 + 0.6, IZ, BZ - 0.01, 0, 3.0), m.plank, undefined, "#4a3022");
      b.box(m.plank, DX0 - 0.6, 3.0, IZ, DX1 + 0.6, 3.08, BZ - 0.01, "#3a2418");
      bb.add(flat(DX0 - 0.6, IZ, DX1 + 0.6, BZ - 0.1, 0.004), m.hay, undefined, "#a88a4a");
      b.sph(m.hay, TRS(-3.1, 0, -4.5, 0, 0, 0, [0.9, 0.7, 0.8]), 14, "#e0c060");
      for (let k = 0; k < 2; k++) b.rod(m.plank, V3(-2.1 + k * 0.45, 0, -4.9), V3(-2.1 + k * 0.45, 3.0, -5.2), 0.03, 6, "#8a6a4a");
      for (let k = 0; k < 8; k++) b.rod(m.plank, V3(-2.1, 0.35 + k * 0.33, -4.9 - k * 0.033), V3(-1.65, 0.35 + k * 0.33, -4.9 - k * 0.033), 0.02, 6, "#8a6a4a");
      // sliding door leaves: white X-braced, one slid left, one half-closed; rail above
      b.box(m.metal, DX0 - 1.2, DH + 0.18, BZ + 0.06, DX1 + 0.2, DH + 0.26, BZ + 0.11, IRON);
      for (const [x0, x1] of [[DX0 - 1.05, DX0 - 0.02], [DX1 - 1.0, DX1 + 0.02]]) {
        const zf = BZ + 0.13;
        b.box(m.barn, x0, 0.04, zf - 0.05, x1, DH + 0.15, zf, "#ffffff");
        for (const [a, c] of [[x0, x0 + 0.12], [x1 - 0.12, x1]]) b.box(m.paint, a, 0.04, zf, c, DH + 0.15, zf + 0.03, TRIM);
        for (const y of [0.04, DH / 2 + 0.02, DH + 0.03]) b.box(m.paint, x0 + 0.12, y, zf, x1 - 0.12, y + 0.12, zf + 0.03, TRIM);
        for (const [ya, yb] of [[0.16, DH / 2 + 0.02], [DH / 2 + 0.14, DH + 0.03]]) { b.board(m.paint, V3(x0 + 0.12, ya, zf + 0.015), V3(x1 - 0.12, yb, zf + 0.015), 0.1, 0.025, V3(0, 0, 1), TRIM); b.board(m.paint, V3(x1 - 0.12, ya, zf + 0.018), V3(x0 + 0.12, yb, zf + 0.018), 0.1, 0.025, V3(0, 0, 1), TRIM); }
        for (const x of [x0 + 0.15, x1 - 0.15]) b.cyl(m.metal, 0.05, 0.05, 0.03, 12, TRS(x, DH + 0.22, BZ + 0.13, 0, Math.PI / 2), IRON);
      }
      // hayloft: opening, dark loft, hay spilling, an open leaf; hay hood beam + pulley + rope
      b.box(m.plank, BXC - 0.5, 3.84, BZ - 1.2, BXC + 0.5, 3.85, BZ - 0.01, "#3a2418");
      b.add(wallZ(BXC - 0.5, BXC + 0.5, 3.85, 5.0, BZ - 1.2), m.plank, undefined, "#2a1a12");
      b.sph(m.hay, TRS(BXC, 3.86, BZ - 0.4, 0, 0, 0, [0.45, 0.33, 0.38]), 14, "#e8c860");
      for (const [a, c, d, e] of [[BXC - 0.62, BXC - 0.5, 3.73, 5.12], [BXC + 0.5, BXC + 0.62, 3.73, 5.12], [BXC - 0.5, BXC + 0.5, 5.0, 5.12], [BXC - 0.5, BXC + 0.5, 3.73, 3.85]]) b.box(m.paint, a, d, BZ, c, e, BZ + 0.06, TRIM);
      b.box(m.barn, BXC - 1.52, 3.86, BZ + 0.08, BXC - 0.64, 5.0, BZ + 0.13, "#ffffff");
      b.board(m.paint, V3(BXC - 1.45, 3.95, BZ + 0.14), V3(BXC - 0.7, 4.9, BZ + 0.14), 0.09, 0.02, V3(0, 0, 1), TRIM);
      b.box(m.plank, BXC - 0.09, 5.75, BZ - 0.3, BXC + 0.09, 5.93, BZ + 1.0, "#6a5040");
      b.cyl(m.metal, 0.09, 0.09, 0.05, 16, TRS(BXC, 5.65, BZ + 0.85, 0, 0, Math.PI / 2), IRON);
      b.rod(m.leaf, V3(BXC - 0.09, 5.62, BZ + 0.85), V3(BXC - 0.09, 4.2, BZ + 0.85), 0.012, 6, "#c8a870");
      b.rod(m.leaf, V3(BXC + 0.09, 5.62, BZ + 0.85), V3(BXC + 0.15, 4.6, BZ + 0.9), 0.012, 6, "#c8a870");
      b.torus(m.metal, 0.07, 0.014, TRS(BXC - 0.09, 4.14, BZ + 0.85, Math.PI / 2), IRON, Math.PI * 1.5);
      // a little 4-pane window right of the calendar, a horseshoe, an oil lantern
      b.box(m.paint, 0.05, 2.5, BZ, 0.65, 3.12, BZ + 0.05, TRIM);
      b.box(m.paint, 0.1, 2.55, BZ + 0.05, 0.6, 3.07, BZ + 0.055, "#3a4a60");
      b.box(m.paint, 0.33, 2.55, BZ + 0.055, 0.37, 3.07, BZ + 0.07, TRIM); b.box(m.paint, 0.1, 2.79, BZ + 0.055, 0.6, 2.83, BZ + 0.07, TRIM);
      b.box(m.paint, 0.0, 2.44, BZ, 0.7, 2.5, BZ + 0.1, TRIM);
      b.torus(m.metal, 0.11, 0.022, TRS((DX0 + DX1) / 2, 3.28, BZ + 0.08, 0, 0, Math.PI), "#8a8a90", Math.PI * 1.3);
      b.lathe(m.metal, [[0.001, 0], [0.07, 0], [0.07, 0.04], [0.05, 0.05], [0.055, 0.2], [0.03, 0.23], [0.001, 0.24]], TRS(0.45, 1.9, BZ + 0.1), 14, "#c84a2a");
      b.torus(m.metal, 0.06, 0.006, TRS(0.45, 2.17, BZ + 0.1, Math.PI / 2), IRON, Math.PI);
      b.rod(m.metal, V3(0.45, 2.22, BZ), V3(0.45, 2.22, BZ + 0.1), 0.006, 6, IRON);
      // cupola + weathervane on the ridge
      const cz = (BZ + BZB) / 2;
      b.box(m.paint, BXC - 0.45, RIDGE - 0.2, cz - 0.45, BXC + 0.45, RIDGE + 0.6, cz + 0.45, TRIM);
      for (let k = 0; k < 4; k++) b.box(m.paint, BXC - 0.35 + k * 0.07, RIDGE + 0.1, cz + 0.45, BXC - 0.31 + k * 0.07, RIDGE + 0.5, cz + 0.47, "#8a8070");
      b.add(new THREE.ConeGeometry(0.72, 0.5, 4).rotateY(Math.PI / 4), m.shingle, TRS(BXC, RIDGE + 0.85, cz), "#ffffff");
      b.rod(m.metal, V3(BXC, RIDGE + 1.1, cz), V3(BXC, RIDGE + 1.7, cz), 0.015, 6, IRON);
      const rooster = new THREE.Shape(); rooster.moveTo(-0.25, 0); rooster.lineTo(0.15, 0); rooster.quadraticCurveTo(0.28, 0.08, 0.2, 0.2); rooster.lineTo(0.26, 0.3); rooster.lineTo(0.16, 0.28); rooster.lineTo(0.1, 0.16); rooster.quadraticCurveTo(-0.05, 0.12, -0.15, 0.1); rooster.lineTo(-0.3, 0.32); rooster.lineTo(-0.22, 0.05); rooster.closePath();
      b.add(new THREE.ExtrudeGeometry(rooster, { depth: 0.015, bevelEnabled: false }), m.metal, TRS(BXC, RIDGE + 1.55, cz, 0.5), IRON);
      for (const a of [0, Math.PI / 2]) b.rod(m.metal, V3(BXC - Math.cos(a) * 0.3, RIDGE + 1.35, cz - Math.sin(a) * 0.3), V3(BXC + Math.cos(a) * 0.3, RIDGE + 1.35, cz + Math.sin(a) * 0.3), 0.008, 5, IRON);
    }
    // ---- the CALENDAR on the barn wall (board, header, pad; the page + flying pages are dynamic) ----
    {
      const z = BZ;
      b.box(m.plank, CAL.x - 0.31, CAL.y0, z, CAL.x + 0.31, CAL.y1, z + 0.025, "#a07a52");
      b.cyl(m.metal, 0.012, 0.012, 0.04, 8, TRS(CAL.x, CAL.y1 + 0.03, z + 0.03, 0, Math.PI / 2), IRON);
      b.rod(m.leaf, V3(CAL.x - 0.2, CAL.y1 - 0.02, z + 0.026), V3(CAL.x, CAL.y1 + 0.03, z + 0.05), 0.004, 5, "#5a3a2a");
      b.rod(m.leaf, V3(CAL.x + 0.2, CAL.y1 - 0.02, z + 0.026), V3(CAL.x, CAL.y1 + 0.03, z + 0.05), 0.004, 5, "#5a3a2a");
      b.add(new THREE.PlaneGeometry(0.54, 0.2), m.head, TRS(CAL.x, 2.14, z + 0.028));
      const pg = new THREE.BoxGeometry(CAL.pw, CAL.ph, 1); pg.translate(0, 0, 0.5);
      this.pad = new THREE.Mesh(clean(pg, new THREE.Color("#e8dcc0")), m.paint); this.pad.position.set(CAL.x, CAL.py, z + 0.025); this.pad.castShadow = true; this.pad.receiveShadow = true; R.add(this.pad);
      const pageMat = twoTone(new THREE.MeshLambertMaterial({ map: this.calTex.tex, emissive: new THREE.Color(1, 1, 1), emissiveMap: this.calTex.tex, emissiveIntensity: 0.22 }));
      this.calPage = new THREE.Mesh(new THREE.PlaneGeometry(CAL.pw, CAL.ph), pageMat); this.calPage.receiveShadow = true; R.add(this.calPage);
      const back = twoTone(new THREE.MeshLambertMaterial({ color: "#efe4cc", emissive: new THREE.Color(0.38, 0.34, 0.27) })); // QA2: flying page backs read cream, not grey
      for (let k = 0; k < PAGES; k++) {
        const tex = new PageTex(256), g = new THREE.Group();
        const mat = twoTone(new THREE.MeshLambertMaterial({ map: tex.tex, emissive: new THREE.Color(1, 1, 1), emissiveMap: tex.tex, emissiveIntensity: 0.22 }));
        const front = new THREE.Mesh(new THREE.PlaneGeometry(CAL.pw, CAL.ph).translate(0, -CAL.ph / 2, 0.0006), mat);
        const bk = new THREE.Mesh(new THREE.PlaneGeometry(CAL.pw, CAL.ph).rotateY(Math.PI).translate(0, -CAL.ph / 2, -0.0006), back);
        for (const ms of [front, bk]) { ms.castShadow = true; ms.receiveShadow = true; ms.frustumCulled = false; g.add(ms); }
        g.visible = false; R.add(g); this.pages.push({ g, tex });
      }
      // the binding strip over the top of the pad
      this.calStrip = new THREE.Mesh(clean(boxM(-CAL.pw / 2 - 0.01, -0.02, 0, CAL.pw / 2 + 0.01, 0.015, 0.006), new THREE.Color("#5a4a40")), m.metal); this.calStrip.castShadow = true; this.calStrip.receiveShadow = true; R.add(this.calStrip);
      // year transitions (times at which the page of year 1922 + k flies off)
      let prev = 1922;
      for (let t = W.kept - 0.6; t < W.million + 1.5; t += 1 / 600) { const y = osborneAt(5, t).year; while (y > prev) { this.trans.push(t); prev++; } }
    }
    // ---- the HOG SCALE platform (props builds the column + dial just behind it at (0.95, 0, -0.98)) ----
    {
      const x0 = 0.15, x1 = 1.45, z0 = -0.75, z1 = 0.15, top = 0.18;
      b.box(m.plank, x0, 0.02, z0, x1, top, z1, "#d8c8b0");
      b.box(m.metal, x0 - 0.03, 0, z0 - 0.03, x1 + 0.03, 0.06, z1 + 0.03, IRON);
      for (const x of [x0, x1]) for (const z of [z0, z1]) b.box(m.metal, x - 0.04, 0, z - 0.04, x + 0.04, top + 0.012, z + 0.04, IRON);
      for (const [x, z] of [[x0, z0 + 0.03], [x1 - 0.03, z0 + 0.03], [x1 - 0.03, z1]]) b.box(m.plank, x, top, z - 0.03, x + 0.06, top + 0.78, z + 0.03, "#b8a088");
      for (const y of [top + 0.32, top + 0.66]) { b.box(m.plank, x0, y, z0 + 0.01, x1, y + 0.12, z0 + 0.04, "#c8b098"); b.box(m.plank, x1 - 0.05, y, z0 + 0.06, x1 - 0.02, y + 0.12, z1, "#c8b098"); }
      b.box(m.metal, x0 + 0.1, top, z1 - 0.06, x1 - 0.1, top + 0.006, z1 - 0.03, "#5a5456");
    }
    // ---- fences (white boards), a pen trough, a pump + water trough, milk cans, a pitchfork, hay bales ----
    {
      const fence = (a: number[], c: number[]) => {
        const A = V3(a[0], 0, a[1]), Cc = V3(c[0], 0, c[1]), d = Cc.clone().sub(A), L2 = d.length(), n = Math.max(1, Math.ceil(L2 / 2.4)), face = V3(-d.z, 0, d.x).normalize();
        if (face.z < -0.1 || (Math.abs(face.z) <= 0.1 && face.x < 0)) face.negate();
        for (let i = 0; i <= n; i++) { const P = A.clone().addScaledVector(d, i / n); b.box(m.fence, P.x - 0.055, 0, P.z - 0.055, P.x + 0.055, 1.2, P.z + 0.055, TRIM); b.add(new THREE.ConeGeometry(0.08, 0.08, 4).rotateY(Math.PI / 4), m.fence, TRS(P.x, 1.24, P.z), TRIM); }
        for (const y of [0.32, 0.68, 1.04]) b.board(m.fence, A.clone().add(V3(0, y, 0)).addScaledVector(face, 0.07), Cc.clone().add(V3(0, y, 0)).addScaledVector(face, 0.07), 0.15, 0.025, face, TRIM);
      };
      fence([BX1 + 0.12, -2.4], [14, -2.4]); fence([3.6, -2.4], [3.6, 2.5]); fence([BX0 - 0.12, -1.0], [-14, -1.0]);
      b.box(m.plank, 2.1, 0, -1.65, 3.1, 0.3, -1.35, "#8a7058"); b.box(m.plank, 2.15, 0.08, -1.6, 3.05, 0.302, -1.4, "#4a3020");
      // pump + trough (left front of the barn)
      b.box(m.plank, -4.6, 0, -0.55, -3.4, 0.45, -0.05, "#8a7058"); b.box(m.paint, -4.55, 0.3, -0.5, -3.45, 0.42, -0.1, "#4a6a80");
      b.box(m.plank, -4.9, 0, -0.4, -4.7, 0.3, -0.2, "#7a6048");
      b.cyl(m.metal, 0.06, 0.07, 1.05, 12, TRS(-4.8, 0.82, -0.3), "#2e5a3a");
      b.cyl(m.metal, 0.08, 0.08, 0.12, 12, TRS(-4.8, 1.4, -0.3), "#2e5a3a");
      b.tube(m.metal, [V3(-4.8, 1.2, -0.3), V3(-4.62, 1.18, -0.3), V3(-4.56, 1.05, -0.3)], 0.025, 10, "#2e5a3a", 8);
      b.rod(m.metal, V3(-4.8, 1.46, -0.3), V3(-5.15, 1.68, -0.3), 0.018, 6, "#2e5a3a");
      // milk cans by the barn wall (behind the props' corn sacks)
      for (const [x, z] of [[-1.32, -1.92], [-1.0, -1.95]]) { b.lathe(m.metal, [[0.001, 0], [0.15, 0], [0.15, 0.42], [0.1, 0.52], [0.075, 0.55], [0.075, 0.62], [0.09, 0.64], [0.001, 0.65]], TRS(x, 0, z), 20, "#c8ccd0"); for (const s of [-1, 1]) b.torus(m.metal, 0.04, 0.008, TRS(x + s * 0.09, 0.56, z, Math.PI / 2, 0, s * 0.5), "#8a8e94", Math.PI); }
      // pitchfork leaning by the door
      b.rod(m.plank, V3(-1.48, 0.0, -1.82), V3(-1.48, 1.65, -2.1), 0.016, 6, "#c8a878");
      for (let k = -1; k <= 1; k++) b.rod(m.metal, V3(-1.48 + k * 0.05, 1.62, -2.1), V3(-1.48 + k * 0.06, 1.98, -2.15), 0.006, 5, "#5a5456");
      b.box(m.metal, -1.56, 1.6, -2.115, -1.4, 1.63, -2.085, "#5a5456");
      // square hay bales left of the barn
      for (const [x, y, z, ry] of [[-5.25, 0, -1.6, 0.1], [-5.3, 0, -2.1, -0.05], [-5.25, 0.38, -1.85, 0.3], [-4.95, 0, -1.0, 0.6]]) { b.rbox(m.hay, 0.85, 0.38, 0.45, 0.04, TRS(x, y + 0.19, z, ry), "#ffffff"); for (const s of [-0.22, 0.22]) b.rbox(m.paint, 0.012, 0.39, 0.46, 0.005, TRS(x + Math.cos(ry) * s, y + 0.19, z - Math.sin(ry) * s, ry), "#8a6a30"); }
      const hr = rng(400);
      for (let k = 0; k < 40; k++) { const x = -6 + hr() * 4.2, z = -1.9 + hr() * 1.6, a = hr() * 3; bb.board(m.hay, V3(x, 0.012, z), V3(x + Math.cos(a) * 0.2, 0.012, z + Math.sin(a) * 0.2), 0.012, 0.006, V3(0, 1, 0), "#f0d070"); }
    }
    // ---- silo (concrete staves, steel dome) ----
    {
      const sx = -6.4, sz = -8.2;
      b.cyl(m.stone, 1.7, 1.7, 10.5, 40, TRS(sx, 5.25, sz), "#e8e0d8");
      for (let k = 1; k < 14; k++) b.torus(m.metal, 1.71, 0.025, TRS(sx, k * 0.75, sz, 0, Math.PI / 2), "#5a5456");
      b.add(new THREE.SphereGeometry(1.75, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), m.metal, TRS(sx, 10.5, sz), "#b8bcc0");
      b.box(m.metal, sx + 1.66, 0, sz - 0.3, sx + 1.86, 10.2, sz + 0.3, "#8a8e94");
    }
    // ---- WINDMILL (steel lattice tower, 18-blade wheel, tail vane) ----
    {
      const wx = 8.5, wz = -11, H = 9.5, bw = 1.1, tw = 0.22, GR = "#8a9096";
      const leg = (sx: number, sz: number, y: number) => V3(wx + sx * (bw + (tw - bw) * (y / H)), y, wz + sz * (bw + (tw - bw) * (y / H)));
      const C4 = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (const [sx, sz] of C4) b.rod(m.metal, leg(sx, sz, 0), leg(sx, sz, H), 0.035, 6, GR);
      for (let k = 1; k <= 6; k++) {
        const y0 = ((k - 1) * H) / 6, y1 = (k * H) / 6;
        for (let i = 0; i < 4; i++) {
          const [ax, az] = C4[i], [cx2, cz2] = C4[(i + 1) % 4];
          b.rod(m.metal, leg(ax, az, y1), leg(cx2, cz2, y1), 0.02, 5, GR);
          b.rod(m.metal, leg(ax, az, y0), leg(cx2, cz2, y1), 0.012, 4, GR); b.rod(m.metal, leg(cx2, cz2, y0), leg(ax, az, y1), 0.012, 4, GR);
        }
      }
      b.box(m.plank, wx - 0.5, H, wz - 0.5, wx + 0.5, H + 0.05, wz + 0.5, "#7a6a5a");
      b.box(m.metal, wx - 0.18, H + 0.05, wz - 0.25, wx + 0.18, H + 0.4, wz + 0.25, GR);
      b.rod(m.metal, V3(wx, H + 0.25, wz - 0.2), V3(wx, H + 0.3, wz - 2.0), 0.03, 6, GR);
      b.box(m.metal, wx - 0.012, H + 0.0, wz - 2.9, wx + 0.012, H + 0.95, wz - 1.6, "#c8442a");
      this.wheel.position.set(wx, H + 0.25, wz + 0.4); this.wheel.rotation.y = 0.35;
      const spin = new THREE.Group(); this.wheel.add(spin);
      const wb = new Bat();
      wb.cyl(m.metal, 0.12, 0.12, 0.2, 14, TRS(0, 0, 0, 0, Math.PI / 2), GR);
      for (const R2 of [0.55, 1.5]) wb.torus(m.metal, R2, 0.018, TRS(0, 0, 0), GR);
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        wb.rod(m.metal, V3(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0), V3(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0), 0.01, 4, GR);
        const M = new THREE.Matrix4().makeRotationZ(a).multiply(new THREE.Matrix4().makeTranslation(1.02, 0, 0)).multiply(new THREE.Matrix4().makeRotationX(0.45));
        wb.add(boxM(-0.5, -0.07, -0.006, 0.5, 0.07, 0.006), m.metal, M, "#b8bcc0");
      }
      wb.build(spin, true); R.add(this.wheel);
    }
    // ---- the growing TREE (a sapling in 1922, a big tree by 1990) + an old cottonwood behind the silo ----
    {
      const tb = new Bat(), r = rng(88);
      tb.cyl(m.paint, 0.12, 0.24, 3.2, 12, TRS(0, 1.6, 0), "#6a4a3a");
      for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28 + r(); tb.rod(m.paint, V3(0, 2.4 + k * 0.2, 0), V3(Math.cos(a) * 1.4, 3.6 + r() * 1.2, Math.sin(a) * 1.0), 0.07, 6, "#6a4a3a"); }
      for (let k = 0; k < 16; k++) { const a = r() * 6.28, rr = r() * 1.6; tb.sph(m.leaf, TRS(Math.cos(a) * rr, 3.8 + r() * 2.2, Math.sin(a) * rr * 0.8, r() * 3, 0, 0, 0.8 + r() * 0.6), 12, ["#5a9a3a", "#6aaa44", "#4a8a34", "#7ab84a"][k % 4]); }
      tb.build(this.tree, true); this.tree.position.set(3.4, 0, -4.4); R.add(this.tree);
      b.rod(m.plank, V3(3.75, 0, -4.4), V3(3.75, 1.3, -4.4), 0.02, 5, "#b89868");
      const cr = rng(12), ox = -10.5, oz = -5.5;
      b.cyl(m.paint, 0.35, 0.6, 5, 12, TRS(ox, 2.5, oz), "#5a4436");
      for (let k = 0; k < 6; k++) { const a = (k / 6) * 6.28; b.rod(m.paint, V3(ox, 4, oz), V3(ox + Math.cos(a) * 2.6, 6.5 + cr() * 1.5, oz + Math.sin(a) * 2.2), 0.14, 6, "#5a4436"); }
      for (let k = 0; k < 22; k++) { const a = cr() * 6.28, rr = cr() * 3; b.sph(m.leaf, TRS(ox + Math.cos(a) * rr, 6.5 + cr() * 3.5, oz + Math.sin(a) * rr * 0.8, cr() * 3, 0, 0, 1.4 + cr() * 0.9), 12, ["#5a8a3a", "#6a9a44", "#4a7a34"][k % 3]); }
    }
    bb.build(R, false); b.build(R, true);
    // ---- CORN fields (instanced crossed cards) ----
    {
      const mat = twoTone(new THREE.MeshLambertMaterial({ map: cornTex(), alphaTest: 0.5, side: THREE.DoubleSide }));
      const g1 = new THREE.PlaneGeometry(1.0, 2.2).translate(0, 1.1, 0), g2 = g1.clone().rotateY(Math.PI / 2);
      const geo = mergeGeometries([g1, g2], false);
      const spots: [number, number][] = [];
      for (let x = 4.6; x < 40; x += 0.9) for (let z = -3.3; z > -40; z -= 0.45) spots.push([x, z]);
      for (let x = -9.2; x > -40; x -= 0.9) for (let z = -4.5; z > -40; z -= 0.45) { if (Math.hypot(x + 10.5, z + 5.5) > 2.5) spots.push([x, z]); }
      const im = new THREE.InstancedMesh(geo, mat, spots.length), r = rng(55), M = new THREE.Matrix4(), col = new THREE.Color();
      spots.forEach(([x, z], i) => {
        const s = 0.85 + r() * 0.3;
        M.compose(V3(x + (r() - 0.5) * 0.2, 0, z + (r() - 0.5) * 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * Math.PI, 0)), V3(s, s * (0.9 + r() * 0.2), s));
        im.setMatrixAt(i, M); im.setColorAt(i, col.setHSL(0.2 + (r() - 0.5) * 0.04, 0.3 + r() * 0.2, 0.62 + r() * 0.12));
      });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; R.add(im);
    }
    // ---- far silhouettes (self-lit, fogged): [texture, centre x, z, width, height, colour, facing] ----
    const FL: [number, number, number, number, number, string, number][] = [
      [2, 0, -320, 1600, 34, "#a89a80", 0], [0, 0, -230, 1200, 26, "#7a8466", 0], [1, 40, -150, 700, 18, "#6a6a5a", 0],
      [0, -240, 0, 900, 24, "#8a9070", Math.PI / 2], [0, 240, 0, 900, 24, "#8a9070", -Math.PI / 2],
    ];
    for (const [k, x, z, w, h, col, ry] of FL) {
      const mat = new THREE.MeshBasicMaterial({ map: farSkyTex(k), transparent: true, alphaTest: 0.04, fog: true, depthWrite: true, color: new THREE.Color(col) });
      const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2 - 2, 0); g.rotateY(ry); g.translate(x, 0, z);
      const ms = new THREE.Mesh(g, mat); ms.layers.set(NOINK); ms.frustumCulled = false; R.add(ms);
      this.layers.push({ mat, col: new THREE.Color(col) });
    }
    // sun glow + halo (follow the world's sun)
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(2.0, 1.35, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(0.5, 0.3, 0.16), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    for (const s of [this.sunGlow, this.sunHalo]) { s.layers.set(NOINK); s.frustumCulled = false; R.add(s); }
    // dusty air: warm specks drifting in the low sun
    {
      const n = 700, q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
      g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
      const r = rng(71), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { P[i * 3] = -4 + r() * 9; P[i * 3 + 1] = 0.1 + r() * 3.2; P[i * 3 + 2] = -2 + r() * 6.5; D[i * 4] = r(); D[i * 4 + 1] = 0.004 + 0.008 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r(); }
      g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4)); g.instanceCount = n;
      this.dustMat = new THREE.ShaderMaterial({
        uniforms: { uT: { value: 0 }, uC: { value: V3(1, 0.8, 0.5) } },
        vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform vec3 uC; varying vec3 vC; varying vec2 vQ;
          void main(){
            float ph = iS.x * 6.2832, sp = iS.z;
            vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.25 * sp + ph) * 0.25, sin(uT * 0.17 * sp + ph * 2.0) * 0.15, cos(uT * 0.21 * sp + ph * 1.3) * 0.2);
            float tw = 0.55 + 0.45 * sin(uT * (1.1 + 2.0 * iS.w) + ph * 5.0);
            vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
            float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.18);
            vQ = position.xy * 2.0; vC = uC * tw * smoothstep(0.7, 1.6, dist) / max(1.0, dist * 0.18);
            gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x + up * position.y) * s, 1.0); }`,
        fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      this.dust = new THREE.Mesh(g, this.dustMat); this.dust.layers.set(NOINK); this.dust.frustumCulled = false; this.dust.renderOrder = 6; R.add(this.dust);
    }
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const T = mixW(lookW(id, f), FARM_TINT, FARM_TINT.farm!);
    const os = osborneAt(id, t), age = os.age;
    for (const Ly of this.layers) Ly.mat.color.copy(Ly.col).multiplyScalar(T[0]);
    const sd = worldSun(id), cp = cam.position, R0 = this.root.position;
    this.sunGlow.visible = this.sunHalo.visible = sd.y > -0.05;
    this.sunGlow.position.copy(cp).addScaledVector(sd, 600).sub(R0); this.sunGlow.scale.setScalar(600 * 0.4);
    this.sunHalo.position.copy(cp).addScaledVector(sd, 610).sub(R0); this.sunHalo.scale.setScalar(610 * 1.5);
    (this.sunGlow.material as THREE.SpriteMaterial).color.setRGB(2.0 * T[1], 1.35 * T[1], 0.7 * T[1]);
    (this.sunHalo.material as THREE.SpriteMaterial).color.setRGB(0.5 * T[1], 0.3 * T[1], 0.16 * T[1]);
    this.dustMat.uniforms.uT.value = t; (this.dustMat.uniforms.uC.value as THREE.Vector3).set(T[2] * 0.9, T[3] * 0.9, T[4] * 0.9);
    // the 68-year time-lapse: weathering, a growing tree, the windmill spins up
    const wk = smooth(age);
    this.m.barn.color.setRGB(1 - 0.16 * wk, 1 - 0.05 * wk, 1 - 0.02 * wk);
    this.m.fence.color.setRGB(1 - 0.12 * wk, 1 - 0.13 * wk, 1 - 0.1 * wk);
    this.tree.scale.setScalar(0.16 + 0.84 * wk);
    this.wheel.children[0].rotation.z = -(t * 1.3 + age * 55);
    // the calendar: current page + pages tearing off per year
    const z0 = BZ + 0.025, pt = 0.004 + 0.016 * (1 - age);
    this.pad.scale.set(1, 1, pt); this.pad.position.z = z0;
    this.calTex.set(os.year);
    const pz = z0 + pt + 0.0015;
    this.calPage.position.set(CAL.x, CAL.py, pz);
    this.calStrip.position.set(CAL.x, CAL.py + CAL.ph / 2, pz + 0.002);
    for (const p of this.pages) p.g.visible = false;
    if (id === 5) for (let k = 0; k < this.trans.length; k++) {
      const u = (t - this.trans[k]) / LIFE;
      if (u < 0 || u >= 1) continue;
      const P = this.pages[k % PAGES], r = rng(k * 13 + 5), side = r() < 0.5 ? -1 : 1, spin = (r() - 0.5) * 2, up = r(), out = r();
      P.tex.set(1922 + k);
      const flip = smooth(u / 0.2), fly = smooth((u - 0.04) / 0.7), ex = 1 - smooth((u - 0.4) / 0.6);
      P.g.visible = ex > 0.002;
      P.g.position.set(CAL.x + side * (0.9 + 0.7 * out) * fly + 0.05 * Math.sin(u * 9) * fly, CAL.py + CAL.ph / 2 + (0.6 + 0.4 * up) * fly - 0.3 * fly * fly, pz + 0.002 + 0.7 * fly);
      P.g.rotation.set(-1.25 * flip - 1.5 * fly * spin, side * 0.9 * fly, spin * 2.2 * fly);
      P.g.scale.setScalar(Math.max(1e-4, ex * (1 - 0.25 * fly)));
    }
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_VIEW: Record<string, number[]> = { kitchen: [0.3, 1.45, 3.4, -0.1, 1.45, -0.8, 50], farm: [1.6, 1.7, 6.0, -0.6, 1.9, -2.0, 46] };
export class Sets {
  root = new THREE.Group();
  private kitchen = new Kitchen();
  private farm = new Farm();
  constructor() { this.root.add(this.kitchen.root, this.farm.root); }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[place]) {
      const pc = cam as THREE.PerspectiveCamera, o = place === "farm" ? FARM : KITCHEN, d = DEBUG_VIEW[place];
      pc.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); pc.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); pc.fov = d[6]; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
    }
    this.kitchen.root.visible = place === "kitchen";
    this.farm.root.visible = place === "farm";
    if (this.kitchen.root.visible) this.kitchen.update(id, t, f, cam);
    if (this.farm.root.visible) this.farm.update(id, t, f, cam);
  }
}
