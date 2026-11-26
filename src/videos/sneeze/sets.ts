// OWNER: sets. "The Sun Sneeze": the sunrise STREET (BEAN's red door, a pastel terrace, the low sun at the end of the
// street) and the 1978 conference STAGE. Everything here is new: geometry, paintings, colours.
//
// STREET uses the world's two-tone materials (shade.ts twoTone), so it follows the shot looks + LOOK_RAMPS by itself
// (dawn -> xray -> flash) and receives the cast cards' long shadows. Painted-glass windows, the far town / hills
// silhouettes, the cat card and the sun glow are self-lit and tinted per look here. The sun glow follows the world's
// own camera-relative sun (same formula as world.shotSun), so glow, disc and shadows always agree.
// STAGE is an interior with its OWN light rig (like tickle/sets.ts): a small shader with ambient up/down, 8 soft point
// lights and 4 theatrical spots (cone, soft edge); spot 0 (the podium key) is masked by the world's sun shadow map so
// the cards' shadows land where the key throws them. Additive haze shafts (the three FOH spots) and dust motes
// live on NOINK. The rig follows bannerAt (reveal -> initials -> achoo).
//
// CONTRACTS (LOCAL to the place anchor, metres):
//   STREET = (0,0,0). The street runs along X; the sunrise end is +X (open view over the town beyond x 41).
//     Facades of BEAN's side: plane z -0.9 (facing +z). BEAN's house x -1.0..3.8 (mint), RED DOOR centre x 0:
//       leaf hinge (-0.475, 0.30, -1.45), opens inward (to -z) by doorAt.open; porch (recess) x +-0.475, z -1.45..-0.9;
//       THRESHOLD top y 0.30 (z -1.5..-0.9); STEP top y 0.15 (x +-0.6, z -0.9..-0.6); PAVEMENT y 0 from the step /
//       garden walls (z -0.32..-0.12) to the KERB z 2.45; road y -0.12 from z 2.62 to 7.48; facades opposite z 11.0.
//       Dark hallway behind the door: x -0.62..0.95, z -1.5..-5.0, floor y 0.30.
//     Neighbour's door x -2.0. Low garden wall + railings x 0.75..3.8; gate pier top (0.75, 0.84, -0.22) = the CAT.
//     Milk bottles on the step at x 0.38..0.47. Lamp post (-3.2, 0, 2.2). Red pillar box (6.3, 0, 2.0).
//     FAMILY (shot 6) pavement spots below (all y 0, clear of props).
//   STAGE = (0,0,-3000). Hall floor y 0; stage DECK top y 0.60, front edge z 0.9, x -6.2..6.2, back curtain z -3.3.
//     Proscenium wall z 0.3, opening x +-5.2, y 0.6..5.6 (red mains tied back at x +-(4.7..5.2), valance y 5.05..5.6).
//     BANNER zone (props): centre (0, 2.6, -2.2), 6 m wide, kept clear (x +-3.3, y 1.6..3.8, z -2.9..-1.5).
//     PODIUM (2.7, 0.6, -0.4), lectern top y ~1.72; SCIENTIST stands at (2.7, 0.6, -0.8); mic head (2.52, 1.95, -0.52).
//     FRONT ROW seat centres z 2.5 (x 0, +-0.62 .. +-3.72; side blocks x +-4.75..5.99); rows every 0.95 m to z 9.15.
//     BEAN's seat (0, 0, 2.5), cushion top y 0.46. Seats removed at x 0.9..2.0 in rows 2-3 (z 3.45, 4.4): floor kept
//     clear for the props projector cart at (1.3, 0, 4.1) (props draws the projector + its beam). An easel screen with a
//     printed 1978 figure stands on the apron at (-3.95, 1.95, 0.64), 1.3 x 1.0 (set dressing).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { STREET, STAGE, SHOTS, LOOK_RAMPS, Look, W, SNEEZES, smooth, camAt, doorAt, bannerAt } from "./story";
import { LOOKS } from "./looks";

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type C3 = [number, number, number];

/** exported contract points (world coordinates) */
const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];
export const DOOR = add(STREET, 0, 0.3, -1.2);
export const STEP = add(STREET, 0, 0.15, -0.75);
export const FAMILY: C3[] = [add(STREET, -0.95, 0, 0.3), add(STREET, 0.95, 0, 0.3), add(STREET, -1.65, 0, 1.25), add(STREET, -0.55, 0, 1.45), add(STREET, 0.55, 0, 1.45), add(STREET, 1.65, 0, 1.25)];
export const CAT = add(STREET, 0.75, 0.84, -0.22);
export const PODIUM = add(STAGE, 2.7, 0.6, -0.4);
export const SCIENTIST = add(STAGE, 2.7, 0.6, -0.8);
export const BEAN_SEAT = add(STAGE, 0, 0, 2.5);
export const PROJECTOR_LENS = add(STAGE, -3.9, 1.75, 10.4);

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
/** plane w x h with uv in metres (or remapped into an atlas rect u0,v0,u1,v1) */
const planeM = (w: number, h: number, atlas?: number[]) => {
  const g = new THREE.PlaneGeometry(w, h), uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    if (atlas) uv.setXY(i, atlas[0] + (atlas[2] - atlas[0]) * u, atlas[1] + (atlas[3] - atlas[1]) * v); else uv.setXY(i, u * w, v * h);
  }
  return g;
};
/** canvas-pixel rect -> uv rect (canvas W x H, flipY) */
const px = (W2: number, H: number, x0: number, y0: number, x1: number, y1: number) => [x0 / W2, 1 - y1 / H, x1 / W2, 1 - y0 / H];
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
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40, col?: string, rs = 8) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rs, false), mat, undefined, col); }
  torus(mat: THREE.Material, R: number, r: number, mx: THREE.Matrix4, col?: string, arc = Math.PI * 2) { this.add(new THREE.TorusGeometry(R, r, 8, 32, arc), mat, mx, col); }
  build(parent: THREE.Object3D, cast = true) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = cast;
      parent.add(mesh);
    }
    this.m.clear();
  }
}
/** a vertical wall at z = z0 from x0..x1, y0..y1 minus rect holes [xa, xb, ya, yb]; uv in metres; faces +z */
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
/** horizontal quad (faces +y), uv in metres */
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
/** pleated drape surface: fn(u, v) -> point; uv = (u * uRep, 1 - v) */
const drape = (cols: number, rows: number, fn: (u: number, v: number) => THREE.Vector3, uRep = 1) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) { const u = i / cols, v = j / rows, p = fn(u, v); pos.push(p.x, p.y, p.z); uv.push(u * uRep, 1 - v); }
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
const SERIF = "'DejaVu Serif', 'Liberation Serif', serif";
const INKC = "#1c1420";
const txt = (g: G, s: string, x: number, y: number, px2: number, col = "#2a2a2a", align: CanvasTextAlign = "center", font = FONT, weight = "bold") => {
  g.font = `${weight} ${Math.max(6, Math.round(px2))}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const noise = (g: G, x0: number, y0: number, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const hsl = (h: number, s: number, l: number) => `hsl(${h},${s}%,${l}%)`;
/** repeat-tiled clone of a cached canvas texture: `m` metres per tile */
const tiled = (t: THREE.Texture, m: number) => { const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(1 / m, 1 / m); c.anisotropy = 8; c.needsUpdate = true; return c; };
const blot = (g: G, x: number, y: number, s: number, rgb: string, a: number, W2: number, H: number) => {
  for (const ox of [-W2, 0, W2]) for (const oy of [-H, 0, H]) {
    if (x + ox + s < 0 || x + ox - s > W2 || y + oy + s < 0 || y + oy - s > H) continue;
    const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, s);
    gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(x + ox - s, y + oy - s, 2 * s, 2 * s);
  }
};

// ---------------- STREET textures
/** smooth painted render (stucco), near-white so the vertex colour tints it; 2 m tile */
const stuccoTex = () => ctex("snStucco", 1024, 1024, (g, r) => {
  g.fillStyle = "#f4f1ec"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) blot(g, r() * 1024, r() * 1024, 30 + r() * 120, r() < 0.5 ? "255,255,255" : "150,135,130", r() < 0.5 ? 0.12 : 0.07, 1024, 1024);
  for (let i = 0; i < 26; i++) {
    const x = r() * 1024, y = r() * 1024, h = 60 + r() * 180, gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, "rgba(110,100,110,0.06)"); gr.addColorStop(1, "rgba(110,100,110,0)"); g.fillStyle = gr; g.fillRect(x, y, 3 + r() * 6, h);
  }
  for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(90,80,90,0.06)"; g.fillRect(0, k * 256, 1024, 3); g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, k * 256 + 3, 1024, 2); }
  noise(g, 0, 0, 1024, 1024, r, 22000, 0.025);
});
/** London brick, stretcher bond, 12 courses per 0.9 m tile */
const brickTex = (key: string, base: number[], mortar: string) => ctex(key, 1024, 1024, (g, r) => {
  g.fillStyle = mortar; g.fillRect(0, 0, 1024, 1024);
  const rows = 12, ch = 1024 / rows, bw = 1024 / 4;
  for (let j = 0; j < rows; j++) {
    const off = j % 2 ? bw / 2 : 0;
    for (let i = -1; i < 5; i++) {
      const x = i * bw + off, y = j * ch, l = base[2] + (r() - 0.5) * 14, h = base[0] + (r() - 0.5) * 10, s = base[1] + (r() - 0.5) * 14;
      const gr = g.createLinearGradient(x, y, x, y + ch);
      gr.addColorStop(0, hsl(h, s, l + 6)); gr.addColorStop(1, hsl(h - 2, s, l - 5));
      g.fillStyle = gr; g.beginPath(); g.roundRect(x + 5, y + 5, bw - 10, ch - 10, 6); g.fill();
      g.fillStyle = "rgba(255,240,220,0.18)"; g.fillRect(x + 8, y + 6, bw - 16, 3);
      if (r() < 0.3) { g.fillStyle = `rgba(40,20,20,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(x + r() * bw, y + ch / 2, 10 + r() * 30, 5 + r() * 7, 0, 0, 7); g.fill(); }
    }
  }
  noise(g, 0, 0, 1024, 1024, r, 20000, 0.04);
});
/** blue-purple slates, 1.2 m tile */
const slateTex = () => ctex("snSlate", 1024, 1024, (g, r) => {
  g.fillStyle = "#2c2c40"; g.fillRect(0, 0, 1024, 1024);
  const rows = 6, rh = 1024 / rows, sw = 1024 / 4;
  for (let j = 0; j < rows; j++) for (let i = -1; i < 5; i++) {
    const x = i * sw + (j % 2 ? sw / 2 : 0), y = j * rh, l = 36 + r() * 10, h = 235 + r() * 25;
    const gr = g.createLinearGradient(0, y, 0, y + rh); gr.addColorStop(0, hsl(h, 14, l - 6)); gr.addColorStop(1, hsl(h, 16, l + 4));
    g.fillStyle = gr; g.fillRect(x + 4, y, sw - 8, rh - 6);
    g.fillStyle = "rgba(220,210,240,0.25)"; g.fillRect(x + 4, y + rh - 12, sw - 8, 5);
    g.fillStyle = "rgba(10,8,20,0.55)"; g.fillRect(x + 4, y + rh - 7, sw - 8, 7);
    if (r() < 0.18) { g.fillStyle = "rgba(170,190,90,0.35)"; g.beginPath(); g.arc(x + r() * sw, y + r() * rh, 6 + r() * 12, 0, 7); g.fill(); }
  }
  noise(g, 0, 0, 1024, 1024, r, 12000, 0.04);
});
/** warm grey paving slabs, 2 x 2 slabs of 0.6 m per 1.2 m tile */
const paveTex = () => ctex("snPave", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c6672"; g.fillRect(0, 0, 1024, 1024);
  const s = 512;
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    const x = i * s, y = j * s, l = 70 + r() * 8, h = 30 + r() * 30;
    g.fillStyle = hsl(h, 10, l); g.fillRect(x + 6, y + 6, s - 12, s - 12);
    g.save(); g.beginPath(); g.rect(x + 6, y + 6, s - 12, s - 12); g.clip();
    for (let k = 0; k < 40; k++) blot(g, x + r() * s, y + r() * s, 20 + r() * 70, r() < 0.5 ? "255,250,240" : "80,70,80", r() < 0.5 ? 0.1 : 0.07, 1e6, 1e6);
    if (r() < 0.5) { g.strokeStyle = "rgba(50,40,55,0.45)"; g.lineWidth = 2.5; g.beginPath(); let px2 = x + 20 + r() * (s - 40), py = y + 10; g.moveTo(px2, py); for (let q = 0; q < 6; q++) { px2 += (r() - 0.5) * 70; py += 40 + r() * 40; g.lineTo(px2, py); } g.stroke(); }
    for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(120,150,70,${0.15 + r() * 0.2})`; g.beginPath(); g.arc(x + r() * s, y + r() * s, 4 + r() * 10, 0, 7); g.fill(); }
    g.restore();
    g.fillStyle = "rgba(255,248,235,0.4)"; g.fillRect(x + 6, y + 6, s - 12, 4); g.fillRect(x + 6, y + 6, 4, s - 12);
    g.fillStyle = "rgba(40,34,48,0.35)"; g.fillRect(x + 6, y + s - 10, s - 12, 4); g.fillRect(x + s - 10, y + 6, 4, s - 12);
  }
  g.fillStyle = "rgba(90,120,60,0.3)"; for (let k = 0; k < 40; k++) g.fillRect(r() * 1024, (r() < 0.5 ? 0 : 509) + r() * 6, 3 + r() * 6, 3);
  noise(g, 0, 0, 1024, 1024, r, 24000, 0.05);
});
const tarmacTex = () => ctex("snTarmac", 1024, 1024, (g, r) => {
  g.fillStyle = "#4b4c5c"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70; i++) blot(g, r() * 1024, r() * 1024, 40 + r() * 140, r() < 0.5 ? "120,120,140" : "20,20,30", 0.11, 1024, 1024);
  for (let i = 0; i < 3; i++) { g.fillStyle = "rgba(30,30,40,0.25)"; g.fillRect(r() * 800, r() * 800, 120 + r() * 160, 90 + r() * 120); }
  for (let i = 0; i < 50000; i++) { const v = r(); g.fillStyle = v < 0.5 ? "rgba(20,18,26,0.35)" : `rgba(${200 + r() * 40},${190 + r() * 40},${190 + r() * 40},0.22)`; g.fillRect(r() * 1024, r() * 1024, 1.5 + r() * 2, 1.5 + r() * 2); }
});
const graniteTex = () => ctex("snGranite", 512, 512, (g, r) => {
  g.fillStyle = "#a9a4ad"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i++) { g.fillStyle = r() < 0.5 ? "rgba(40,35,50,0.25)" : "rgba(255,250,245,0.3)"; g.fillRect(r() * 512, r() * 512, 1.5 + r() * 2, 1.5 + r() * 2); }
  g.fillStyle = "rgba(40,35,50,0.6)"; g.fillRect(0, 0, 4, 512); g.fillRect(256, 0, 3, 512);
});
/** Victorian encaustic porch + hall tiles, 0.6 m tile */
const hallTileTex = () => ctex("snHallTile", 512, 512, (g, r) => {
  const n = 6, s = 512 / n;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    g.fillStyle = (i + j) % 2 ? "#2a2230" : "#e9dcc6"; g.fillRect(i * s, j * s, s, s);
    if ((i + j) % 2 === 0) { g.fillStyle = "#b0452e"; g.beginPath(); g.moveTo(i * s + s / 2, j * s + 14); g.lineTo(i * s + s - 14, j * s + s / 2); g.lineTo(i * s + s / 2, j * s + s - 14); g.lineTo(i * s + 14, j * s + s / 2); g.fill(); }
  }
  g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2; for (let k = 0; k <= n; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, 512); g.moveTo(0, k * s); g.lineTo(512, k * s); g.stroke(); }
  noise(g, 0, 0, 512, 512, r, 4000, 0.05);
});
/** dark hall wallpaper (deep teal with gold sprigs) */
const paperTex = () => ctex("snWallpaper", 512, 512, (g, r) => {
  g.fillStyle = "#2c4a52"; g.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
    const x = i * 85 + (j % 2 ? 42 : 0), y = j * 85;
    g.strokeStyle = "rgba(220,180,100,0.5)"; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y + 30); g.quadraticCurveTo(x + 8, y, x, y - 30); g.stroke();
    g.fillStyle = "rgba(220,180,100,0.5)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * 10, y - 4, 10, 5, s * 0.6, 0, 7); g.fill(); }
  }
  noise(g, 0, 0, 512, 512, r, 3000, 0.04);
});
/** window glass atlas 2 x 2 (uv quadrants): 0 red curtains (u0 v0), 1 lace nets (u.5 v0), 2 half blind (u0 v.5), 3 lamp-lit room (u.5 v.5) */
const glassTex = () => ctex("snGlass", 1024, 1024, (g, r) => {
  for (let q = 0; q < 4; q++) {
    const ox = (q % 2) * 512, oy = (q < 2 ? 1 : 0) * 512;
    g.save(); g.beginPath(); g.rect(ox, oy, 512, 512); g.clip();
    const sky = g.createLinearGradient(0, oy, 0, oy + 512);
    if (q === 3) { sky.addColorStop(0, "#7a5444"); sky.addColorStop(1, "#2a1a1a"); }
    else { sky.addColorStop(0, "#f6c8b0"); sky.addColorStop(0.35, "#9ab4dc"); sky.addColorStop(0.7, "#3e4a78"); sky.addColorStop(1, "#262840"); }
    g.fillStyle = sky; g.fillRect(ox, oy, 512, 512);
    if (q === 3) {
      const L = g.createRadialGradient(ox + 330, oy + 230, 0, ox + 330, oy + 230, 260); L.addColorStop(0, "rgba(255,214,140,0.95)"); L.addColorStop(0.3, "rgba(255,170,90,0.6)"); L.addColorStop(1, "rgba(255,150,80,0)");
      g.fillStyle = L; g.fillRect(ox, oy, 512, 512);
      g.fillStyle = "#ffe0a0"; g.beginPath(); g.moveTo(ox + 290, oy + 200); g.lineTo(ox + 370, oy + 200); g.lineTo(ox + 350, oy + 150); g.lineTo(ox + 310, oy + 150); g.fill();
      g.fillStyle = "#3a2420"; g.fillRect(ox + 327, oy + 200, 6, 120); g.fillStyle = "#2a3a24"; for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(ox + 120 + r() * 60, oy + 300 + r() * 80, 30, 12, r() * 3, 0, 7); g.fill(); }
    } else {
      g.fillStyle = "rgba(60,60,100,0.55)"; for (let k = 0; k < 6; k++) { const x = ox + k * 100 - 20, h = oy + 210 + (k % 2) * 20; g.fillRect(x, h, 102, 400); g.fillRect(x + 60, h - 40, 22, 40); }
    }
    g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(ox + 80, oy + 512); g.lineTo(ox + 200, oy + 512); g.lineTo(ox + 400, oy); g.lineTo(ox + 280, oy); g.fill();
    g.fillStyle = "rgba(255,255,255,0.14)"; g.beginPath(); g.moveTo(ox + 230, oy + 512); g.lineTo(ox + 260, oy + 512); g.lineTo(ox + 460, oy); g.lineTo(ox + 430, oy); g.fill();
    if (q === 0) for (const s of [0, 1]) {
      const x = s ? ox + 512 : ox, d = s ? -1 : 1;
      const cg = g.createLinearGradient(x, 0, x + d * 150, 0); cg.addColorStop(0, "#7a1a26"); cg.addColorStop(1, "#c03a3a");
      g.fillStyle = cg; g.beginPath(); g.moveTo(x, oy); g.lineTo(x + d * 170, oy); g.quadraticCurveTo(x + d * 60, oy + 300, x + d * 110, oy + 512); g.lineTo(x, oy + 512); g.fill();
      g.strokeStyle = "rgba(60,10,20,0.6)"; g.lineWidth = 4; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + d * k * 38, oy); g.quadraticCurveTo(x + d * k * 14, oy + 300, x + d * k * 26, oy + 512); g.stroke(); }
    }
    if (q === 1) {
      g.fillStyle = "rgba(250,248,240,0.82)"; g.fillRect(ox, oy + 250, 512, 262);
      g.strokeStyle = "rgba(190,180,170,0.8)"; g.lineWidth = 2;
      for (let k = 0; k < 16; k++) { g.beginPath(); g.moveTo(ox + k * 34, oy + 250); g.lineTo(ox + k * 34, oy + 512); g.stroke(); }
      for (let k = 0; k < 15; k++) { g.beginPath(); g.arc(ox + 17 + k * 34, oy + 250, 15, 0, Math.PI); g.stroke(); }
    }
    if (q === 2) {
      g.fillStyle = "#e8b04a"; g.fillRect(ox, oy, 512, 210); g.fillStyle = "rgba(120,70,20,0.35)"; for (let k = 0; k < 8; k++) g.fillRect(ox, oy + k * 26, 512, 2);
      g.fillStyle = "#8a5a20"; g.fillRect(ox, oy + 204, 512, 12); g.fillStyle = "#f5f0e0"; g.beginPath(); g.arc(ox + 256, oy + 232, 10, 0, 7); g.fill();
    }
    g.restore();
  }
});
/** distant layers: 0 town roofs + spires, 1 hills, 2 tree crowns (white silhouettes, tinted by colour) */
const skylineTex = (k: number) => ctex("snSkyline" + k, 2048, 512, (g, r) => {
  g.clearRect(0, 0, 2048, 512); g.fillStyle = "#ffffff";
  if (k === 1) {
    g.beginPath(); g.moveTo(0, 512);
    for (let x = 0; x <= 2048; x += 16) g.lineTo(x, 300 - Math.sin(x * 0.0021 + 1) * 90 - Math.sin(x * 0.0071) * 30 - Math.sin(x * 0.019) * 8);
    g.lineTo(2048, 512); g.fill();
  } else if (k === 0) {
    let x = 0;
    while (x < 2048) {
      const w = 40 + r() * 80, h = 260 + r() * 90;
      g.fillRect(x, h, w + 2, 512 - h);
      g.beginPath(); g.moveTo(x - 4, h + 2); g.lineTo(x + w / 2, h - 30 - r() * 20); g.lineTo(x + w + 6, h + 2); g.fill();
      if (r() < 0.6) { g.fillRect(x + w * 0.7, h - 50, 10, 40); g.fillRect(x + w * 0.7 - 3, h - 54, 16, 6); }
      if (r() < 0.06) { g.fillRect(x + w / 2 - 14, h - 120, 28, 120); g.beginPath(); g.moveTo(x + w / 2 - 16, h - 118); g.lineTo(x + w / 2, h - 240); g.lineTo(x + w / 2 + 16, h - 118); g.fill(); }
      if (r() < 0.05) { g.beginPath(); g.arc(x + w / 2, h - 30, 46, Math.PI, 0); g.fill(); g.fillRect(x + w / 2 - 3, h - 100, 6, 30); }
      x += w + r() * 6;
    }
    for (let i = 0; i < 30; i++) { const cx = r() * 2048, cy = 330 + r() * 80; for (let q = 0; q < 5; q++) { g.beginPath(); g.arc(cx + (r() - 0.5) * 50, cy + (r() - 0.5) * 30, 20 + r() * 18, 0, 7); g.fill(); } }
  } else {
    for (let i = 0; i < 46; i++) { const cx = (i / 46) * 2048 + r() * 30, cy = 380 + r() * 40, s = 40 + r() * 50; for (let q = 0; q < 7; q++) { g.beginPath(); g.arc(cx + (r() - 0.5) * s * 1.4, cy - r() * s * 0.9, s * (0.4 + r() * 0.35), 0, 7); g.fill(); } }
    g.fillRect(0, 420, 2048, 92);
  }
});
/** sign atlas (1024 x 512): top = street name plate, bottom-left = brass "7", bottom-right = "HELLO" mat */
const signTex = () => ctex("snSigns", 1024, 512, (g) => {
  g.fillStyle = "#f8f6ee"; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "#141414"; g.lineWidth = 10; g.strokeRect(14, 14, 996, 228);
  txt(g, "SUNRISE TERRACE", 512, 104, 96, "#141414");
  g.fillStyle = "#c8302c"; g.fillRect(40, 178, 944, 40); txt(g, "BOROUGH OF BEANFORD", 512, 199, 28, "#ffffff");
  g.fillStyle = "#3a2a20"; g.fillRect(0, 256, 512, 256);
  const gr = g.createLinearGradient(0, 270, 0, 500); gr.addColorStop(0, "#ffe08a"); gr.addColorStop(0.5, "#d89a2a"); gr.addColorStop(1, "#8a5a10");
  g.fillStyle = gr; g.beginPath(); g.ellipse(256, 384, 236, 120, 0, 0, 7); g.fill();
  g.strokeStyle = "#5a3a08"; g.lineWidth = 8; g.stroke();
  txt(g, "7", 256, 392, 200, "#3a2406", "center", SERIF);
  g.fillStyle = "#b07a3a"; g.fillRect(512, 256, 512, 256); g.strokeStyle = "#6a4418"; g.lineWidth = 14; g.strokeRect(530, 274, 476, 220);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(60,30,10,${Math.random() * 0 + 0.12})`; g.fillRect(530 + ((i * 37) % 476), 274 + ((i * 91) % 220), 2, 3); }
  txt(g, "HELLO", 768, 384, 110, "#5a3410");
});
/** the cat (sitting, 3/4): 0 = basking (eyes squeezed happy), 1 = startled (puffed fur, wide eyes) */
const catTex = (k: number) => ctex("snCat" + k, 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512); g.lineJoin = "round"; g.lineCap = "round";
  const O = "#f08a32", D = "#c45a18", L = "#ffd2a0", lw = 13;
  const puff = k === 1;
  const fur = (pts: number[][], spike: number) => {
    g.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i], [nx, ny] = pts[(i + 1) % pts.length];
      if (i === 0) g.moveTo(x, y);
      if (spike > 0) { const mx = (x + nx) / 2, my = (y + ny) / 2, dx = ny - y, dy = -(nx - x), dl = Math.hypot(dx, dy) || 1; g.lineTo(mx - (dx / dl) * spike, my - (dy / dl) * spike); }
      g.lineTo(nx, ny);
    }
    g.closePath();
  };
  g.strokeStyle = INKC; g.lineWidth = puff ? 62 : 44;
  g.beginPath(); if (puff) { g.moveTo(330, 440); g.quadraticCurveTo(430, 420, 420, 300); g.quadraticCurveTo(415, 220, 440, 170); } else { g.moveTo(320, 450); g.quadraticCurveTo(450, 470, 430, 390); g.quadraticCurveTo(420, 350, 455, 330); } g.stroke();
  g.strokeStyle = O; g.lineWidth = puff ? 40 : 22; g.stroke();
  g.strokeStyle = D; g.lineWidth = 8; g.setLineDash([14, 22]); g.stroke(); g.setLineDash([]);
  const body = puff ? [[170, 470], [140, 380], [160, 290], [215, 240], [300, 240], [350, 300], [370, 390], [345, 470]] : [[180, 470], [165, 390], [185, 300], [225, 255], [290, 255], [330, 310], [345, 400], [330, 470]];
  fur(body, puff ? 14 : 0); g.fillStyle = O; g.fill(); g.strokeStyle = INKC; g.lineWidth = lw; g.stroke();
  g.fillStyle = L; g.beginPath(); g.ellipse(255, 380, puff ? 52 : 42, 70, 0, 0, 7); g.fill();
  g.strokeStyle = D; g.lineWidth = 9; for (const y of [300, 330]) { g.beginPath(); g.moveTo(puff ? 165 : 185, y); g.quadraticCurveTo(195, y + 8, 205, y + 2); g.stroke(); g.beginPath(); g.moveTo(puff ? 355 : 335, y + 6); g.quadraticCurveTo(320, y + 12, 310, y + 4); g.stroke(); }
  for (const x of [215, 290]) { g.fillStyle = L; g.beginPath(); g.ellipse(x, 468, 30, 18, 0, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 10; g.stroke(); }
  const hy = puff ? 175 : 190;
  g.save(); g.translate(255, hy);
  const ear = (s: number) => { g.beginPath(); if (puff) { g.moveTo(s * 40, -40); g.lineTo(s * 118, -48); g.lineTo(s * 78, -2); } else { g.moveTo(s * 30, -52); g.lineTo(s * 80, -112); g.lineTo(s * 92, -30); } g.closePath(); g.fillStyle = O; g.fill(); g.strokeStyle = INKC; g.lineWidth = lw; g.stroke(); };
  ear(-1); ear(1);
  const head: number[][] = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; head.push([Math.cos(a) * 98, Math.sin(a) * 78 + (Math.sin(a) > 0 ? 6 : 0)]); }
  fur(head, puff ? 12 : 0); g.fillStyle = O; g.fill(); g.strokeStyle = INKC; g.lineWidth = lw; g.stroke();
  g.strokeStyle = D; g.lineWidth = 9; for (const x of [-22, 0, 22]) { g.beginPath(); g.moveTo(x, -76); g.lineTo(x * 0.8, -50); g.stroke(); }
  g.fillStyle = L; g.beginPath(); g.ellipse(0, 34, 54, 32, 0, 0, 7); g.fill();
  if (puff) {
    for (const s of [-1, 1]) { g.fillStyle = "#fff"; g.beginPath(); g.arc(s * 40, -6, 26, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 8; g.stroke(); g.fillStyle = INKC; g.beginPath(); g.arc(s * 40, -6, 9, 0, 7); g.fill(); }
    g.fillStyle = "#e86a7a"; g.beginPath(); g.ellipse(0, 26, 10, 7, 0, 0, 7); g.fill();
    g.fillStyle = INKC; g.beginPath(); g.ellipse(0, 52, 14, 16, 0, 0, 7); g.fill();
  } else {
    g.strokeStyle = INKC; g.lineWidth = 9; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 58, -2); g.quadraticCurveTo(s * 40, -24, s * 22, -2); g.stroke(); }
    g.fillStyle = "#e86a7a"; g.beginPath(); g.ellipse(0, 24, 10, 7, 0, 0, 7); g.fill();
    g.strokeStyle = INKC; g.lineWidth = 7; g.beginPath(); g.moveTo(-16, 40); g.quadraticCurveTo(-8, 48, 0, 36); g.quadraticCurveTo(8, 48, 16, 40); g.stroke();
    g.fillStyle = "rgba(255,120,120,0.45)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * 62, 24, 16, 9, 0, 0, 7); g.fill(); }
  }
  g.strokeStyle = INKC; g.lineWidth = 4; for (const s of [-1, 1]) for (const k2 of [-1, 0, 1]) { g.beginPath(); g.moveTo(s * 50, 34 + k2 * 8); g.lineTo(s * (puff ? 150 : 128), 30 + k2 * (puff ? 26 : 16)); g.stroke(); }
  g.restore();
});
/** the kitchen seen at the end of the hall: morning window light, cupboards, a kettle */
const kitchenTex = () => ctex("snKitchen", 256, 512, (g) => {
  const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, "#c88a5a"); bg.addColorStop(1, "#6a3a2a"); g.fillStyle = bg; g.fillRect(0, 0, 256, 512);
  const L = g.createRadialGradient(150, 170, 0, 150, 170, 220); L.addColorStop(0, "rgba(255,236,190,1)"); L.addColorStop(0.4, "rgba(255,200,130,0.6)"); L.addColorStop(1, "rgba(255,180,110,0)");
  g.fillStyle = L; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#fff4d8"; g.fillRect(90, 90, 130, 150); g.fillStyle = "#c89a6a"; g.fillRect(150, 90, 8, 150); g.fillRect(90, 160, 130, 8);
  g.fillStyle = "#4a6a5a"; g.fillRect(0, 300, 256, 212); g.fillStyle = "#e8d8b8"; g.fillRect(0, 292, 256, 14);
  g.strokeStyle = "#2a3a30"; g.lineWidth = 4; for (const x of [10, 128]) g.strokeRect(x, 330, 110, 160);
  g.fillStyle = "#e84a3a"; g.beginPath(); g.arc(60, 270, 24, Math.PI, 0); g.fill(); g.fillRect(36, 270, 48, 22);
  g.fillStyle = "#4a3a2a"; g.fillRect(0, 0, 256, 30);
});
const glowTex = () => ctex("snGlow", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.12, "rgba(255,255,255,0.55)"); gr.addColorStop(0.35, "rgba(255,255,255,0.16)"); gr.addColorStop(0.7, "rgba(255,255,255,0.04)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});

// ---------------- STAGE textures
const deckTex = () => ctex("snDeck", 1024, 1024, (g, r) => {
  const n = 10, w = 1024 / n;
  for (let i = 0; i < n; i++) {
    let y = -r() * 600;
    while (y < 1024) {
      const len = 300 + r() * 500, l = 44 + r() * 10, h = 28 + r() * 8;
      const gr = g.createLinearGradient(i * w, 0, i * w + w, 0); gr.addColorStop(0, hsl(h, 50, l + 5)); gr.addColorStop(1, hsl(h - 3, 52, l - 5));
      g.fillStyle = gr; g.fillRect(i * w + 2, y + 2, w - 4, len - 4);
      for (let k = 0; k < 5; k++) { g.strokeStyle = `rgba(90,45,15,${0.12 + r() * 0.12})`; g.lineWidth = 1.5; g.beginPath(); const xx = i * w + 6 + r() * (w - 12); g.moveTo(xx, y); g.bezierCurveTo(xx + 6, y + len * 0.3, xx - 6, y + len * 0.6, xx + 2, y + len); g.stroke(); }
      g.fillStyle = "rgba(40,20,8,0.7)"; g.fillRect(i * w, y, w, 3);
      y += len;
    }
    g.fillStyle = "rgba(40,20,8,0.6)"; g.fillRect(i * w, 0, 3, 1024);
  }
  g.fillStyle = "rgba(240,240,230,0.7)"; g.fillRect(400, 500, 70, 12); g.fillRect(429, 470, 12, 70);
  noise(g, 0, 0, 1024, 1024, r, 14000, 0.04);
});
const slatTex = () => ctex("snSlats", 1024, 1024, (g, r) => {
  g.fillStyle = "#24140e"; g.fillRect(0, 0, 1024, 1024);
  const n = 12, w = 1024 / n;
  for (let i = 0; i < n; i++) {
    const l = 26 + r() * 6;
    const gr = g.createLinearGradient(i * w, 0, i * w + w, 0); gr.addColorStop(0, hsl(22, 45, l + 8)); gr.addColorStop(0.6, hsl(20, 48, l)); gr.addColorStop(1, hsl(18, 50, l - 8));
    g.fillStyle = gr; g.fillRect(i * w + 10, 0, w - 20, 1024);
    for (let k = 0; k < 8; k++) { g.strokeStyle = `rgba(20,8,4,${0.15 + r() * 0.15})`; g.lineWidth = 2; g.beginPath(); const xx = i * w + 14 + r() * (w - 28); g.moveTo(xx, 0); g.bezierCurveTo(xx + 8, 300, xx - 8, 700, xx, 1024); g.stroke(); }
    g.fillStyle = "rgba(255,200,150,0.12)"; g.fillRect(i * w + 10, 0, 3, 1024);
  }
  noise(g, 0, 0, 1024, 1024, r, 8000, 0.04);
});
const carpetTex = () => ctex("snCarpet", 1024, 1024, (g, r) => {
  g.fillStyle = "#7a3a1a"; g.fillRect(0, 0, 1024, 1024);
  const s = 256;
  for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
    const x = i * s, y = j * s;
    g.fillStyle = "#c8682a"; g.beginPath(); g.arc(x, y, 112, 0, 7); g.fill();
    g.fillStyle = "#e8a83a"; g.beginPath(); g.arc(x, y, 80, 0, 7); g.fill();
    g.fillStyle = "#7a3a1a"; g.beginPath(); g.arc(x, y, 52, 0, 7); g.fill();
    g.fillStyle = "#4a2410"; g.beginPath(); g.arc(x + s / 2, y + s / 2, 36, 0, 7); g.fill();
  }
  for (let i = 0; i < 60000; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.12)" : "rgba(255,220,180,0.08)"; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
});
const velvetTex = () => ctex("snVelvet", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 512, 0);
  for (let k = 0; k <= 8; k++) gr.addColorStop(k / 8, k % 2 ? "#ffffff" : "#c8c0c8");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) { g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)"; g.fillRect(r() * 512, r() * 512, 1.5, 4 + r() * 8); }
});
const tileCeilTex = () => ctex("snCeil", 512, 512, (g, r) => {
  g.fillStyle = "#3a3038"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#d8ccbc"; g.fillRect(6, 6, 500, 500);
  for (let i = 0; i < 900; i++) { g.fillStyle = "rgba(70,60,60,0.35)"; g.beginPath(); g.arc(10 + r() * 492, 10 + r() * 492, 1.5 + r() * 2.5, 0, 7); g.fill(); }
});
/** stage atlas 2048 x 1024: header lettering, lectern emblem, EXIT, clock, speaker grille, name plate */
const stageSignTex = () => ctex("snStageSigns", 2048, 1024, (g) => {
  const wg = g.createLinearGradient(0, 0, 0, 300); wg.addColorStop(0, "#4a2a1a"); wg.addColorStop(1, "#2a160c"); g.fillStyle = wg; g.fillRect(0, 0, 2048, 300);
  g.strokeStyle = "#d8a84a"; g.lineWidth = 8; g.strokeRect(20, 20, 2008, 260);
  txt(g, "INTERNATIONAL SYMPOSIUM ON REFLEXES  ·  1978", 1024, 155, 88, "#f0c060", "center", SERIF);
  g.fillStyle = "#2a5a7a"; g.fillRect(0, 320, 700, 700);
  g.strokeStyle = "#f0c060"; g.lineWidth = 14; g.strokeRect(24, 344, 652, 652);
  g.fillStyle = "#ffc840"; g.beginPath(); g.arc(350, 600, 120, 0, 7); g.fill();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.save(); g.translate(350, 600); g.rotate(a); g.beginPath(); g.moveTo(140, -18); g.lineTo(210, 0); g.lineTo(140, 18); g.fill(); g.restore(); }
  g.strokeStyle = "#7a3a10"; g.lineWidth = 12; g.beginPath(); g.moveTo(350, 560); g.quadraticCurveTo(330, 640, 372, 640); g.stroke();
  txt(g, "ISR '78", 350, 900, 96, "#f0c060", "center", SERIF);
  g.fillStyle = "#1a7a3a"; g.fillRect(720, 320, 600, 240); txt(g, "EXIT", 1020, 442, 150, "#e8ffe8");
  g.fillStyle = "#f4ecd8"; g.beginPath(); g.arc(1600, 560, 230, 0, 7); g.fill(); g.strokeStyle = "#2a2a2a"; g.lineWidth = 16; g.stroke();
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle = "#2a2a2a"; g.fillRect(1600 + Math.sin(a) * 190 - 6, 560 - Math.cos(a) * 190 - 18, 12, 36); }
  g.lineWidth = 14; g.lineCap = "round"; g.beginPath(); g.moveTo(1600, 560); g.lineTo(1690, 490); g.moveTo(1600, 560); g.lineTo(1580, 390); g.stroke();
  g.fillStyle = "#2a2422"; g.fillRect(720, 600, 600, 420);
  for (let y = 0; y < 29; y++) for (let x = 0; x < 42; x++) { g.fillStyle = "rgba(120,100,90,0.5)"; g.fillRect(730 + x * 14, 610 + y * 14, 6, 6); }
  g.fillStyle = "#f4ecd8"; g.fillRect(1360, 840, 680, 170); g.strokeStyle = "#2a2a2a"; g.lineWidth = 6; g.strokeRect(1370, 850, 660, 150);
  txt(g, "PANEL", 1700, 925, 90, "#2a2a2a", "center", SERIF);
});
const slideTex = () => ctex("snSlide", 1024, 788, (g) => {
  g.fillStyle = "#f6f2e4"; g.fillRect(0, 0, 1024, 788);
  const v = g.createRadialGradient(512, 394, 200, 512, 394, 640); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(60,40,20,0.45)"); g.fillStyle = v; g.fillRect(0, 0, 1024, 788);
  txt(g, "FIG. 1", 512, 90, 64, "#2a2a6a", "center", SERIF);
  g.fillStyle = "#f0a020"; g.beginPath(); g.arc(200, 380, 90, 0, 7); g.fill();
  g.strokeStyle = "#f0a020"; g.lineWidth = 10; for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.beginPath(); g.moveTo(200 + Math.cos(a) * 110, 380 + Math.sin(a) * 110); g.lineTo(200 + Math.cos(a) * 150, 380 + Math.sin(a) * 150); g.stroke(); }
  g.strokeStyle = "#2a2a2a"; g.lineWidth = 10; g.beginPath(); g.ellipse(560, 380, 90, 50, 0, 0, 7); g.stroke(); g.fillStyle = "#2a6a9a"; g.beginPath(); g.arc(560, 380, 32, 0, 7); g.fill();
  g.strokeStyle = "#c03030"; g.lineWidth = 12; g.beginPath(); g.moveTo(320, 380); g.lineTo(450, 380); g.stroke(); g.beginPath(); g.moveTo(430, 360); g.lineTo(456, 380); g.lineTo(430, 400); g.stroke();
  g.beginPath(); g.moveTo(660, 380); g.quadraticCurveTo(760, 380, 790, 470); g.stroke();
  g.strokeStyle = "#2a2a2a"; g.lineWidth = 10; g.beginPath(); g.moveTo(820, 400); g.quadraticCurveTo(800, 560, 880, 560); g.stroke();
  txt(g, "?", 900, 450, 120, "#c03030", "center", SERIF);
  txt(g, "PHOTIC  SNEEZE  REFLEX", 512, 680, 58, "#2a2a2a", "center", SERIF);
});

// ============================================================ the world's sun (same formula as world.shotSun)
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
/** look weights for a frame (follows LOOK_RAMPS like world.ts) */
const lookW = (id: number, f: number): Partial<Record<Look, number>> => {
  const s = SHOTS[id - 1];
  const rp = LOOK_RAMPS.find((r) => s.place === r[4] && f >= r[2] && (
    (s.look === r[0] && r[2] >= s.b - 30 && r[2] <= s.b) || (s.look === r[1] && s.a >= r[2] && s.a <= r[3] && f <= r[3])));
  if (!rp) return { [s.look]: 1 };
  const g = smooth((f - rp[2]) / Math.max(1, rp[3] - rp[2]));
  return { [rp[0]]: 1 - g, [rp[1]]: g };
};
const mixW = (w: Partial<Record<Look, number>>, tab: Partial<Record<Look, number[]>>, fb: number[]) => {
  const out = fb.map(() => 0);
  for (const [k, wt] of Object.entries(w) as [Look, number][]) { const v = tab[k] ?? fb; v.forEach((x, i) => (out[i] += x * wt)); }
  return out;
};

// ============================================================ the STREET
/** per-look tints for the self-lit parts: [glass r g b, distant layers, sun glow, lamps, card r g b] */
const STREET_TINT: Partial<Record<Look, number[]>> = {
  dawn: [1.0, 0.95, 0.92, 1.0, 1.0, 1.0, 1.0, 0.86, 0.74],
  xray: [0.2, 0.3, 0.55, 0.35, 0.15, 0.25, 0.22, 0.32, 0.6],
  flash: [1.25, 1.2, 1.12, 1.25, 1.6, 1.0, 1.25, 1.2, 1.12],
};
type HouseOpt = { x0: number; w: number; mir: boolean; col: string; door: string; brick: number; seed: number; near: boolean; bean?: boolean };
class Street {
  root = new THREE.Group();
  north = new THREE.Group(); south = new THREE.Group();
  doorPivot = new THREE.Group();
  glassMat: THREE.MeshBasicMaterial; lampMat: THREE.MeshBasicMaterial; hallGlow: THREE.MeshBasicMaterial; kitchenMat: THREE.MeshBasicMaterial;
  layers: { mat: THREE.MeshBasicMaterial; col: THREE.Color }[] = [];
  sunGlow: THREE.Sprite; sunHalo: THREE.Sprite;
  cat: THREE.Mesh[] = []; catMat: THREE.MeshBasicMaterial[] = [];
  bunting: THREE.Group[] = [];
  m: Record<string, THREE.Material>;
  constructor() {
    const R = this.root;
    R.position.set(...STREET);
    this.south.position.set(0, 0, 10.1); this.south.rotation.y = Math.PI;
    R.add(this.north, this.south);
    const L = (o: THREE.MeshLambertMaterialParameters) => twoTone(new THREE.MeshLambertMaterial({ vertexColors: true, ...o }));
    const P = (o: THREE.MeshPhongMaterialParameters) => twoTone(new THREE.MeshPhongMaterial({ vertexColors: true, ...o }));
    const m = this.m = {
      stucco: L({ map: tiled(stuccoTex(), 2) }),
      brick: L({ map: tiled(brickTex("snBrickRed", [12, 52, 44], "#cfc0ae"), 0.9) }),
      brickY: L({ map: tiled(brickTex("snBrickYel", [36, 48, 66], "#e8dcc8"), 0.9) }),
      slate: L({ map: tiled(slateTex(), 1.2) }),
      pave: L({ map: tiled(paveTex(), 1.2) }),
      tarmac: L({ map: tiled(tarmacTex(), 2.2) }),
      granite: L({ map: tiled(graniteTex(), 0.9) }),
      tile: L({ map: tiled(hallTileTex(), 0.6) }),
      paper: L({ map: tiled(paperTex(), 0.8) }),
      paint: L({}),
      gloss: P({ shininess: 60, specular: new THREE.Color("#7a6a60") }),
      metal: P({ shininess: 40, specular: new THREE.Color("#a09080") }),
      signs: L({ map: signTex() }),
      leaf: L({ side: THREE.DoubleSide }),
    };
    this.glassMat = new THREE.MeshBasicMaterial({ map: glassTex(), fog: true });
    this.lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.1, 0.6), fog: true, side: THREE.DoubleSide });
    this.hallGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.9, 0.5), fog: true, side: THREE.DoubleSide });
    this.kitchenMat = new THREE.MeshBasicMaterial({ map: kitchenTex(), fog: true });
    // ---- the two terraces ----
    const COLS = ["#f6b0bc", "#f8dc84", "#a8cdf0", "#cdb4ea", "#f8c094", "#f2ede2", "#b8e0a0", "#f4a890", "#9ad8d0"];
    const DOORS = ["#2e7a4a", "#2a4a8a", "#f2c230", "#1e1e2a", "#6a3a8a", "#2a8a8a", "#e0602a"];
    const HW = 4.8;
    for (const side of [0, 1]) {
      const b = new Bat(), grp = side ? this.south : this.north;
      for (let i = -7; i <= 7; i++) {
        const x0 = -1.0 + HW * i, r = rng(100 + i * 7 + side * 300);
        const bean = side === 0 && i === 0;
        this.house(b, {
          x0, w: HW, mir: Math.abs(i) % 2 === 1, col: bean ? "#a8dcc4" : COLS[(((i + 21 + side * 4) * 5) % COLS.length + COLS.length) % COLS.length],
          door: bean ? "#d42a2a" : DOORS[(i + 14 + side * 3) % DOORS.length],
          brick: bean ? 0 : r() < 0.28 ? (r() < 0.5 ? 1 : 2) : 0, seed: 1000 + i * 31 + side * 977, near: side === 0 && Math.abs(i) <= 2, bean,
        });
      }
      // end gables (brick) at both ends of the terrace
      for (const x of [-1.0 - HW * 7, -1.0 + HW * 8]) {
        const s = x < 0 ? -1 : 1, xx = x + s * 0.35;
        b.box(m.brick, Math.min(x, xx), 0, -9, Math.max(x, xx), 6.3, -0.9);
        const gab = new THREE.BufferGeometry();
        gab.setAttribute("position", new THREE.Float32BufferAttribute(s > 0 ? [xx, 6.3, -0.9, xx, 6.3, -9, xx, 8.5, -4.8] : [xx, 6.3, -9, xx, 6.3, -0.9, xx, 8.5, -4.8], 3));
        gab.setAttribute("uv", new THREE.Float32BufferAttribute([0.9, 6.3, -9, 6.3, -4.8, 8.5], 2)); gab.computeVertexNormals();
        b.add(gab, m.brick);
      }
      const xa = -1.0 - HW * 7 - 0.35, xb = -1.0 + HW * 8 + 0.35;
      b.add(flat(xa, -0.9, xb, 2.45, 0), m.pave);
      b.box(m.granite, xa, -0.12, 2.45, xb, 0.006, 2.62);
      for (const x of [-9, 4.2, 17, 29]) { b.box(m.metal, x - 0.25, -0.12, 2.64, x + 0.25, -0.1, 2.98, "#2a2a32"); for (let k = 0; k < 6; k++) b.box(m.metal, x - 0.22 + k * 0.088, -0.1, 2.66, x - 0.19 + k * 0.088, -0.094, 2.96, "#4a4a56"); }
      for (const x of side ? [4.5, 19.5, -11] : [-3.2, 12.6, 27.4, -18]) this.lamp(b, x, 2.2);
      if (side === 0) this.pillarBox(b, 6.3, 2.0);
      if (side === 1) for (const x of [-5.5, 9.2, 24.5]) this.tree(b, x, 1.6, 77 + Math.round(x * 3));
      b.build(grp, true);
    }
    {
      const b = new Bat();
      b.add(flat(-36, 2.62, 40, 7.48, -0.12), m.tarmac);
      for (let x = -34; x < 38; x += 4.5) b.box(m.paint, x, -0.12, 5.0, x + 2.2, -0.112, 5.1, "#e8e2d0");
      b.build(this.root, false);
    }
    this.beanHouse();
    this.sunriseEnd();
    this.buntings();
    // the cat on the gate pier (two cards: basking / startled)
    for (const k of [0, 1]) {
      const mat = new THREE.MeshBasicMaterial({ map: catTex(k), transparent: true, alphaTest: 0.02, depthWrite: true, fog: true, opacity: k ? 0 : 1 });
      const g = new THREE.PlaneGeometry(0.46, 0.46); g.translate(0, 0.23 - 0.025, 0);
      const ms = new THREE.Mesh(g, mat); ms.layers.set(NOINK); ms.frustumCulled = false; ms.renderOrder = 2 + k;
      ms.position.set(CAT[0] - STREET[0], CAT[1] - STREET[1], CAT[2] - STREET[2]);
      this.root.add(ms); this.cat.push(ms); this.catMat.push(mat);
    }
    // the sun glow (follows the world's sun direction) + a wide halo
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(2.0, 1.35, 0.7), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    this.sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(0.5, 0.3, 0.16), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    for (const s of [this.sunGlow, this.sunHalo]) { s.layers.set(NOINK); s.frustumCulled = false; this.root.add(s); }
    this.root.traverse((o) => { o.frustumCulled = false; });
  }

  /** one terraced house: facade at z -0.9 (local), door at 1.0 from its door-side edge */
  house(b: Bat, o: HouseOpt) {
    const m = this.m, r = rng(o.seed);
    const X = (u: number) => (o.mir ? o.x0 + o.w - u : o.x0 + u);
    const dx = X(1.0), gx = X(3.2), FZ = -0.9;
    const TRIM = "#fbf6ea", wallM = o.brick === 1 ? m.brick : o.brick === 2 ? m.brickY : m.stucco, wcol = o.brick ? "#ffffff" : o.col;
    const holes = [[dx - 0.475, dx + 0.475, 0.3, 2.9], [gx - 0.7, gx + 0.7, 0.95, 2.45], [dx - 0.42, dx + 0.42, 3.55, 5.0], [gx - 0.6, gx + 0.6, 3.4, 5.15]];
    b.add(wallZ(o.x0, o.x0 + o.w, 0, 6.25, FZ, holes), wallM, undefined, wcol);
    if (o.brick) b.add(wallZ(o.x0, o.x0 + o.w, 0, 3.15, FZ + 0.012, holes.slice(0, 2)), m.stucco, undefined, o.col); // painted ground floor
    const pc = "#" + new THREE.Color(o.col).multiplyScalar(0.7).getHexString();
    b.box(m.paint, o.x0, 0, FZ, dx - 0.62, 0.42, FZ + 0.035, pc); b.box(m.paint, dx + 0.62, 0, FZ, o.x0 + o.w, 0.42, FZ + 0.035, pc);
    if (o.mir) b.box(m.paint, o.x0, 0, FZ, dx - 0.62, 0.42, FZ + 0.035, pc);
    b.box(m.paint, o.x0, 3.15, FZ, o.x0 + o.w, 3.25, FZ + 0.06, TRIM);
    b.box(m.paint, o.x0, 5.92, FZ, o.x0 + o.w, 6.06, FZ + 0.1, TRIM); b.box(m.paint, o.x0, 6.06, FZ, o.x0 + o.w, 6.25, FZ + 0.22, TRIM);
    for (let k = 0; k < Math.round(o.w / 0.4); k++) b.box(m.paint, o.x0 + 0.12 + k * 0.4, 5.84, FZ, o.x0 + 0.24 + k * 0.4, 5.92, FZ + 0.07, TRIM);
    b.box(m.metal, o.x0, 6.25, FZ + 0.1, o.x0 + o.w, 6.36, FZ + 0.3, "#2a2a34");
    b.box(m.paint, o.x0 - 0.07, 0, FZ, o.x0 + 0.07, 5.92, FZ + 0.055, TRIM);
    if (o.near) b.rod(m.metal, V3(X(o.w - 0.25), 6.3, FZ + 0.12), V3(X(o.w - 0.25), 0.02, FZ + 0.12), 0.035, 8, "#2a2a34");
    // ---- windows ----
    const win = (xa: number, xb: number, ya: number, yb: number, variant: number, box: boolean) => {
      const D = 0.16, zf = FZ - D;
      for (const [a, c] of [[xa - 0.004, xa], [xb, xb + 0.004]]) b.box(m.paint, a, ya, zf, c, yb, FZ, "#e8e2d4");
      b.box(m.paint, xa, yb, zf, xb, yb + 0.004, FZ, "#e8e2d4");
      b.box(m.paint, xa - 0.09, ya - 0.07, FZ - 0.02, xb + 0.09, ya, FZ + 0.09, TRIM);
      b.box(m.paint, xa - 0.07, yb, FZ, xb + 0.07, yb + 0.16, FZ + 0.035, TRIM);
      b.box(m.paint, (xa + xb) / 2 - 0.07, yb - 0.02, FZ, (xa + xb) / 2 + 0.07, yb + 0.2, FZ + 0.06, TRIM);
      const fz = zf + 0.03, fw = 0.055, my = (ya + yb) / 2;
      for (const [a, c, d, e] of [[xa, xa + fw, ya, yb], [xb - fw, xb, ya, yb], [xa, xb, yb - fw, yb], [xa, xb, ya, ya + fw * 1.4]]) b.box(m.paint, a, d, fz - 0.03, c, e, fz + 0.03, "#ffffff");
      b.box(m.paint, xa, my - 0.03, fz - 0.02, xb, my + 0.03, fz + 0.045, "#ffffff");
      b.box(m.paint, (xa + xb) / 2 - 0.015, ya + fw, fz - 0.01, (xa + xb) / 2 + 0.015, yb - fw, fz + 0.025, "#ffffff");
      const u0 = (variant % 2) * 0.5, v0 = variant < 2 ? 0 : 0.5;
      b.add(quad4(V3(xa, ya, zf + 0.005), V3(xb, ya, zf + 0.005), V3(xb, yb, zf + 0.005), V3(xa, yb, zf + 0.005), [u0, v0, u0 + 0.5, v0, u0 + 0.5, v0 + 0.5, u0, v0 + 0.5]), this.glassMat);
      if (box) this.windowBox(b, xa, xb, ya, r, o.near);
    };
    const vr = () => Math.floor(r() * 4);
    win(gx - 0.7, gx + 0.7, 0.95, 2.45, o.bean ? 1 : vr(), true);
    win(dx - 0.42, dx + 0.42, 3.55, 5.0, o.bean ? 2 : vr(), r() < 0.6 || !!o.bean);
    win(gx - 0.6, gx + 0.6, 3.4, 5.15, o.bean ? 0 : vr(), r() < 0.7 || !!o.bean);
    // ---- door surround, porch, transom, steps (BEAN's leaf is animated: beanHouse) ----
    const pz = FZ - 0.55, lin = o.brick ? "#efe6d8" : o.col;
    for (const s of [-1, 1]) {
      b.box(m.paint, dx + s * 0.475, 0.3, FZ - 0.08, dx + s * 0.62, 2.9, FZ + 0.06, TRIM);
      b.box(m.paint, dx + s * 0.46, 0.3, FZ - 0.09, dx + s * 0.64, 0.5, FZ + 0.08, TRIM);
      b.box(m.paint, dx + s * 0.475, 0.3, pz, dx + s * 0.479, 2.9, FZ - 0.08, lin);
      b.box(m.paint, dx + s * 0.52, 2.62, FZ + 0.06, dx + s * 0.6, 2.9, FZ + 0.24, TRIM);
    }
    b.box(m.paint, dx - 0.475, 2.9, pz, dx + 0.475, 2.904, FZ, "#efe6d8");
    b.box(m.paint, dx - 0.7, 2.9, FZ - 0.02, dx + 0.7, 3.0, FZ + 0.26, TRIM); b.box(m.paint, dx - 0.74, 3.0, FZ - 0.02, dx + 0.74, 3.06, FZ + 0.3, TRIM);
    b.box(m.paint, dx - 0.475, 2.35, pz - 0.02, dx + 0.475, 2.42, pz + 0.05, "#ffffff");
    b.add(quad4(V3(dx - 0.475, 2.42, pz - 0.01), V3(dx + 0.475, 2.42, pz - 0.01), V3(dx + 0.475, 2.9, pz - 0.01), V3(dx - 0.475, 2.9, pz - 0.01), [0.5, 0.38, 1, 0.38, 1, 0.5, 0.5, 0.5]), this.glassMat);
    for (let k = 1; k < 6; k++) { const a = Math.PI * (k / 6), L = Math.min(0.47 / Math.max(0.01, Math.abs(Math.cos(a))), 0.46 / Math.sin(a)); b.rod(m.paint, V3(dx, 2.43, pz + 0.01), V3(dx + Math.cos(a) * L, 2.43 + Math.sin(a) * L, pz + 0.01), 0.012, 5, "#ffffff"); }
    b.torus(m.paint, 0.16, 0.014, TRS(dx, 2.43, pz + 0.01), "#ffffff", Math.PI);
    if (!o.bean) this.doorLeaf(b, TRS(dx - 0.475, 0, pz), o.door);
    b.box(m.tile, dx - 0.475, 0, pz - 0.05, dx + 0.475, 0.3, FZ, "#ffffff");
    b.box(m.granite, dx - 0.6, 0, FZ, dx + 0.6, 0.15, FZ + 0.3, "#f0ece4");
    b.box(m.granite, dx - 0.62, 0.13, FZ + 0.27, dx + 0.62, 0.155, FZ + 0.32, "#f6f2ea");
    b.box(m.granite, dx - 0.5, 0.28, FZ - 0.02, dx + 0.5, 0.305, FZ + 0.03, "#f6f2ea");
    // ---- front garden: low brick wall with coping + railings, gate pier at the step ----
    const wa = o.mir ? o.x0 + 0.02 : dx + 0.75, wb = o.mir ? dx - 0.75 : o.x0 + o.w - 0.02, pier = o.mir ? wb : wa;
    b.box(m.brick, wa, 0, -0.32, wb, 0.5, -0.12);
    b.box(m.granite, wa - 0.02, 0.5, -0.35, wb + 0.02, 0.58, -0.09, "#eee8de");
    b.box(m.brick, pier - 0.15, 0, -0.37, pier + 0.15, 0.78, -0.07);
    b.box(m.granite, pier - 0.18, 0.78, -0.4, pier + 0.18, 0.84, -0.04, "#eee8de");
    {
      const xs0 = o.mir ? wa + 0.08 : pier + 0.25, xs1 = o.mir ? pier - 0.25 : wb - 0.08;
      b.box(m.metal, xs0, 1.02, -0.235, xs1, 1.05, -0.205, "#1e1e26"); b.box(m.metal, xs0, 0.64, -0.235, xs1, 0.665, -0.205, "#1e1e26");
      for (let x = xs0; x <= xs1 + 1e-3; x += 0.13) {
        b.box(m.metal, x - 0.011, 0.58, -0.231, x + 0.011, 1.1, -0.209, "#1e1e26");
        b.add(new THREE.ConeGeometry(0.026, 0.07, 4), m.metal, TRS(x, 1.13, -0.22, Math.PI / 4), "#1e1e26");
      }
    }
    const ga = Math.min(wa, wb), gb = Math.max(wa, wb);
    b.box(m.paint, ga, 0, -0.9, gb, 0.12, -0.32, "#4a3226");
    const nS = o.near ? 9 : 4;
    for (let k = 0; k < nS; k++) {
      const x = ga + 0.2 + ((gb - ga - 0.4) * (k + r() * 0.4)) / nS, z = -0.6 + (r() - 0.5) * 0.2, h = 0.25 + r() * 0.35, lav = r() < 0.4;
      b.sph(m.leaf, TRS(x, 0.12 + h * 0.5, z, r() * 3, 0, 0, [0.2 + r() * 0.1, h * 0.55, 0.18]), o.near ? 10 : 6, lav ? "#7a6ab0" : ["#4f9a46", "#3d8a44", "#6ab04e"][k % 3]);
      if (lav && o.near) for (let q = 0; q < 6; q++) b.sph(m.leaf, TRS(x + (r() - 0.5) * 0.3, 0.14 + h + r() * 0.12, z + (r() - 0.5) * 0.2, 0, 0, 0, [0.02, 0.06, 0.02]), 6, "#a088e0");
    }
    // ---- roof, chimney, back ----
    const ra = V3(o.x0, 6.3, -0.62), rb = V3(o.x0 + o.w, 6.3, -0.62), rc = V3(o.x0 + o.w, 8.5, -4.8), rd = V3(o.x0, 8.5, -4.8);
    const slope = ra.distanceTo(rd);
    b.add(quad4(ra, rb, rc, rd, [o.x0, 0, o.x0 + o.w, 0, o.x0 + o.w, slope, o.x0, slope]), m.slate);
    b.add(new THREE.CylinderGeometry(0.1, 0.1, o.w, 8, 1), m.paint, TRS(o.x0 + o.w / 2, 8.52, -4.8, 0, 0, Math.PI / 2), "#8a4a3a");
    const cx = o.x0;
    b.box(m.brick, cx - 0.42, 7.0, -3.5, cx + 0.42, 9.0, -2.7);
    b.box(m.paint, cx - 0.48, 9.0, -3.56, cx + 0.48, 9.12, -2.64, "#efe6d8");
    for (let k = 0; k < 3; k++) b.lathe(m.paint, [[0.001, 0], [0.09, 0], [0.08, 0.16], [0.065, 0.3], [0.085, 0.34], [0.001, 0.34]], TRS(cx - 0.26 + k * 0.26, 9.12, -3.1), 12, ["#c8683a", "#b85a30", "#d07a48"][k]);
    b.add(wallZ(o.x0, o.x0 + o.w, 0, 6.3, -9.0), m.brick);
    b.add(quad4(V3(o.x0 + o.w, 6.3, -9.0), V3(o.x0, 6.3, -9.0), V3(o.x0, 8.5, -4.8), V3(o.x0 + o.w, 8.5, -4.8), [0, 0, o.w, 0, o.w, 4.7, 0, 4.7]), m.slate);
  }
  /** a panelled front door leaf: hinge at local (0,0,0), width 0.95, closed along +x; placed by matrix t */
  doorLeaf(b: Bat, t: THREE.Matrix4, col: string) {
    const m = this.m, T = (mx: THREE.Matrix4) => new THREE.Matrix4().multiplyMatrices(t, mx);
    const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, c: string, mat = m.gloss) => b.add(boxM(x0, y0, z0, x1, y1, z1), mat, t, c);
    B(0.01, 0.3, -0.03, 0.94, 2.35, 0.02, col);
    const dk = "#" + new THREE.Color(col).multiplyScalar(0.78).getHexString();
    for (const [x0, y0, x1, y1] of [[0.1, 0.45, 0.43, 1.2], [0.52, 0.45, 0.85, 1.2], [0.1, 1.4, 0.43, 2.22], [0.52, 1.4, 0.85, 2.22]]) {
      B(x0, y0, 0.02, x1, y1, 0.032, dk); B(x0 + 0.05, y0 + 0.05, 0.032, x1 - 0.05, y1 - 0.05, 0.045, col);
    }
    B(0.27, 1.27, 0.02, 0.68, 1.33, 0.05, "#e0b040", m.metal);
    b.sph(m.metal, T(TRS(0.8, 1.1, 0.07, 0, 0, 0, 0.04)), 12, "#e8b840");
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), m.metal, T(TRS(0.8, 1.1, 0.04, 0, Math.PI / 2)), "#e8b840");
    b.torus(m.metal, 0.07, 0.014, T(TRS(0.475, 1.62, 0.07)), "#e8b840");
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 12), m.metal, T(TRS(0.475, 1.7, 0.05, 0, Math.PI / 2)), "#e8b840");
  }
  windowBox(b: Bat, xa: number, xb: number, ya: number, r: () => number, near: boolean) {
    const m = this.m, z0 = -0.88, z1 = -0.68, h = 0.2, col = ["#3a6a4a", "#c86a3a", "#f2ede2", "#3a4a7a"][Math.floor(r() * 4)];
    b.box(m.paint, xa + 0.02, ya, z0, xb - 0.02, ya + h, z1, col);
    b.box(m.paint, xa + 0.04, ya + h - 0.02, z0 + 0.02, xb - 0.04, ya + h + 0.01, z1 - 0.02, "#3a2a20");
    const n = Math.round((xb - xa) / (near ? 0.07 : 0.16)), FL = ["#e02a3a", "#ff5a6a", "#ffffff", "#ffd23a", "#c050c0", "#ff8a2a"];
    const fc = FL[Math.floor(r() * FL.length)], fc2 = FL[Math.floor(r() * FL.length)];
    for (let k = 0; k < n; k++) {
      const x = xa + 0.07 + ((xb - xa - 0.14) * (k + 0.5)) / n, z = (z0 + z1) / 2 + (r() - 0.5) * 0.1;
      b.sph(m.leaf, TRS(x, ya + h + 0.05, z, r() * 3, 0, 0, [0.07, 0.06, 0.07]), near ? 8 : 5, r() < 0.5 ? "#3f8a3a" : "#5aa44a");
      if (r() < 0.7) b.sph(m.gloss, TRS(x + (r() - 0.5) * 0.04, ya + h + 0.1 + r() * 0.08, z + (r() - 0.5) * 0.06, 0, 0, 0, [0.04, 0.035, 0.04]), near ? 8 : 5, r() < 0.6 ? fc : fc2);
    }
    if (near) for (let k = 0; k < 3; k++) {
      const x = xa + 0.15 + r() * (xb - xa - 0.3), L2 = 0.2 + r() * 0.35;
      const pts = [V3(x, ya + h, z1 - 0.02), V3(x + 0.03, ya + h - 0.05, z1 + 0.03), V3(x - 0.02, ya + h - L2 * 0.6, z1 + 0.04), V3(x + 0.02, ya + h - L2, z1 + 0.03)];
      b.tube(m.leaf, pts, 0.006, 10, "#3f7a3a", 4);
      const cv = new THREE.CatmullRomCurve3(pts);
      for (let q = 1; q < 5; q++) { const P2 = cv.getPoint(q / 5); b.sph(m.leaf, TRS(P2.x + (q % 2 ? 0.02 : -0.02), P2.y, P2.z + 0.01, 0, 0.3, q % 2 ? 0.6 : -0.6, [0.03, 0.006, 0.025]), 6, "#4f9a42"); }
    }
  }
  lamp(b: Bat, x: number, z: number) {
    const m = this.m, K = "#1e2028";
    b.lathe(m.metal, [[0.001, 0], [0.16, 0], [0.16, 0.08], [0.12, 0.12], [0.11, 0.42], [0.085, 0.5], [0.07, 0.55], [0.001, 0.55]], TRS(x, 0, z), 16, K);
    b.cyl(m.metal, 0.06, 0.07, 3.0, 12, TRS(x, 2.0, z), K);
    for (let k = 0; k < 4; k++) b.torus(m.metal, 0.07, 0.012, TRS(x, 0.8 + k * 0.9, z, 0, Math.PI / 2), K);
    b.box(m.metal, x - 0.32, 3.1, z - 0.025, x + 0.32, 3.15, z + 0.025, K);
    for (const s of [-1, 1]) b.sph(m.metal, TRS(x + s * 0.33, 3.125, z, 0, 0, 0, 0.035), 8, K);
    b.lathe(m.metal, [[0.001, 0], [0.09, 0], [0.12, 0.06], [0.001, 0.1]], TRS(x, 3.5, z), 4, K);
    const yb = 3.58, yt = 4.05;
    b.lathe(m.metal, [[0.001, 0], [0.1, 0], [0.1, 0.03], [0.001, 0.03]], TRS(x, yb - 0.03, z, Math.PI / 4), 4, K);
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; b.rod(m.metal, V3(x + Math.cos(a) * 0.1, yb, z + Math.sin(a) * 0.1), V3(x + Math.cos(a) * 0.19, yt, z + Math.sin(a) * 0.19), 0.012, 5, K); }
    const lg = new THREE.CylinderGeometry(0.17, 0.09, yt - yb, 4, 1, true); lg.rotateY(Math.PI / 4);
    b.add(lg, this.lampMat, TRS(x, (yb + yt) / 2, z));
    b.lathe(m.metal, [[0.001, 0], [0.24, 0], [0.2, 0.06], [0.06, 0.2], [0.03, 0.26], [0.05, 0.3], [0.001, 0.36]], TRS(x, yt, z, Math.PI / 4), 4, K);
  }
  pillarBox(b: Bat, x: number, z: number) {
    const m = this.m, RED = "#d0242a";
    b.lathe(m.gloss, [[0.001, 0], [0.27, 0], [0.27, 0.1], [0.23, 0.14], [0.23, 1.12], [0.27, 1.16], [0.27, 1.24], [0.2, 1.36], [0.1, 1.42], [0.001, 1.44]], TRS(x, 0, z), 32, RED);
    b.box(m.metal, x - 0.12, 1.0, z + 0.2, x + 0.12, 1.04, z + 0.245, "#1a1a1a");
    b.box(m.gloss, x - 0.1, 0.62, z + 0.215, x + 0.1, 0.8, z + 0.24, "#f2ede2");
    b.box(m.gloss, x - 0.07, 1.2, z + 0.225, x + 0.07, 1.26, z + 0.275, "#e8c040");
  }
  tree(b: Bat, x: number, z: number, seed: number) {
    const m = this.m, r = rng(seed);
    b.cyl(m.paint, 0.09, 0.14, 2.6, 10, TRS(x, 1.3, z), "#6a4a3a");
    for (const [a, c] of [[0.4, 1.0], [-0.5, 0.8]]) b.rod(m.paint, V3(x, 2.2, z), V3(x + Math.cos(a * 4) * c, 3.2, z + Math.sin(a * 4) * c), 0.05, 6, "#6a4a3a");
    for (let k = 0; k < 9; k++) b.sph(m.leaf, TRS(x + (r() - 0.5) * 1.8, 3.4 + r() * 1.4, z + (r() - 0.5) * 1.6, r() * 3, 0, 0, 0.7 + r() * 0.4), 14, ["#5aa64a", "#4a9a44", "#6ab454", "#78bc58"][k % 4]);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; b.rod(m.metal, V3(x + Math.cos(a) * 0.4, 0, z + Math.sin(a) * 0.4), V3(x + Math.cos(a) * 0.4, 1.0, z + Math.sin(a) * 0.4), 0.018, 6, "#1e1e26"); }
    b.torus(m.metal, 0.4, 0.018, TRS(x, 1.0, z, 0, Math.PI / 2), "#1e1e26"); b.torus(m.metal, 0.4, 0.015, TRS(x, 0.5, z, 0, Math.PI / 2), "#1e1e26");
    b.box(m.paint, x - 0.45, 0, z - 0.45, x + 0.45, 0.02, z + 0.45, "#5a4030");
  }
  /** BEAN's door (animated), hallway, number, mat, milk, street sign */
  beanHouse() {
    const m = this.m, R = this.north;
    this.doorPivot.position.set(-0.475, 0, -1.45);
    R.add(this.doorPivot);
    { const b = new Bat(); this.doorLeaf(b, new THREE.Matrix4(), "#d42a2a"); b.build(this.doorPivot, true); }
    const b = new Bat();
    for (const s of [-1, 1]) b.box(m.paint, s * 0.475, 0.3, -1.5, s * 0.435, 2.35, -1.44, "#ffffff");
    // the hallway (dark, deep)
    const HX0 = -0.62, HX1 = 0.95, HZ0 = -1.5, HZ1 = -5.0, HY = 3.0;
    b.add(flat(HX0, HZ1, HX1, HZ0, 0.3), m.tile);
    const wl = planeM(HZ0 - HZ1, HY - 0.3); wl.rotateY(Math.PI / 2); wl.translate(HX0, (HY + 0.3) / 2, (HZ0 + HZ1) / 2); b.add(wl, m.paper);
    const wr = planeM(HZ0 - HZ1, HY - 0.3); wr.rotateY(-Math.PI / 2); wr.translate(HX1, (HY + 0.3) / 2, (HZ0 + HZ1) / 2); b.add(wr, m.paper);
    b.box(m.paint, HX0, 0.3, HZ1, HX0 + 0.02, 1.25, HZ0, "#3a2a24"); b.box(m.paint, HX0, 1.25, HZ1, HX0 + 0.04, 1.3, HZ0, "#d8c8a8");
    b.box(m.paint, HX0, HY, HZ1, HX1, HY + 0.02, HZ0, "#2a2830");
    b.add(wallZ(HX0, HX1, 0.3, HY, HZ1 + 0.001, [[-0.2, 0.55, 0.3, 2.3]]), m.paper);
    b.box(m.paint, -0.25, 0.3, HZ1, -0.2, 2.35, HZ1 + 0.05, "#e8dcc8"); b.box(m.paint, 0.55, 0.3, HZ1, 0.6, 2.35, HZ1 + 0.05, "#e8dcc8"); b.box(m.paint, -0.25, 2.3, HZ1, 0.6, 2.36, HZ1 + 0.05, "#e8dcc8");
    b.add(quad4(V3(-0.2, 0.3, HZ1 - 0.3), V3(0.55, 0.3, HZ1 - 0.3), V3(0.55, 2.3, HZ1 - 0.3), V3(-0.2, 2.3, HZ1 - 0.3)), this.kitchenMat);
    for (const a of [-0.2, 0.55]) b.box(m.paint, a - 0.002, 0.3, HZ1 - 0.3, a + 0.002, 2.3, HZ1, "#5a3a20");
    b.add(flat(-0.2, HZ1 - 0.3, 0.55, HZ1, 0.3), m.tile);
    for (let k = 0; k < 10; k++) {
      const za = -2.4 - k * 0.24, zb = za - 0.24, y = 0.3 + 0.19 * (k + 1);
      b.box(m.paint, 0.3, 0.3, za, HX1, y - 0.03, zb, "#e8dcc8");
      b.box(m.paint, 0.28, y - 0.03, za + 0.025, HX1, y, zb, "#7a4a2a");
      b.box(m.paint, 0.45, y, za + 0.02, 0.85, y + 0.012, zb, "#b02a3a");
      b.box(m.paint, 0.45, y - 0.19, za + 0.002, 0.85, y - 0.03, za + 0.012, "#b02a3a");
    }
    b.rod(m.paint, V3(0.3, 1.2, -2.4), V3(0.3, 2.95, -4.75), 0.03, 8, "#4a2a1a");
    for (let k = 0; k < 9; k++) { const z = -2.5 - k * 0.26, y = 0.3 + 0.19 * Math.ceil((-2.4 - z) / 0.24); b.rod(m.paint, V3(0.3, y, z), V3(0.3, Math.min(2.9, y + 0.85), z), 0.014, 6, "#f0e6d0"); }
    b.cyl(m.paint, 0.05, 0.05, 1.2, 8, TRS(0.3, 0.9, -2.4), "#4a2a1a"); b.sph(m.paint, TRS(0.3, 1.55, -2.4, 0, 0, 0, 0.07), 10, "#4a2a1a");
    b.box(m.paint, HX0, 1.75, -2.9, HX0 + 0.03, 1.85, -2.0, "#5a3a20");
    b.add(new THREE.CapsuleGeometry(0.17, 0.6, 4, 10), m.paint, TRS(HX0 + 0.16, 1.35, -2.3, 0, 0, 0, [1, 1, 0.7]), "#f2c030");
    b.add(new THREE.CapsuleGeometry(0.15, 0.5, 4, 10), m.paint, TRS(HX0 + 0.15, 1.35, -2.7, 0, 0, 0, [1, 1, 0.7]), "#3a6aa8");
    b.rod(m.paint, V3(HX0 + 0.12, 0.3, -1.85), V3(HX0 + 0.08, 1.2, -1.82), 0.02, 6, "#2a2a3a");
    b.torus(m.gloss, 0.22, 0.03, TRS(HX0 + 0.01, 1.8, -3.6, Math.PI / 2), "#d8a840");
    b.add(new THREE.CircleGeometry(0.21, 24), m.gloss, TRS(HX0 + 0.012, 1.8, -3.6, Math.PI / 2), "#7a8aa0");
    b.box(m.paint, HX0 + 0.02, 0.95, -3.5, HX0 + 0.34, 1.0, -3.0, "#6a4430");
    for (const z of [-3.04, -3.46]) b.box(m.paint, HX0 + 0.28, 0.3, z - 0.02, HX0 + 0.32, 0.95, z + 0.02, "#6a4430");
    b.cyl(m.paint, 0.02, 0.05, 0.3, 10, TRS(HX0 + 0.18, 1.15, -3.25), "#2a2a3a");
    b.add(new THREE.CylinderGeometry(0.08, 0.13, 0.16, 16, 1, true), this.hallGlow, TRS(HX0 + 0.18, 1.35, -3.25));
    // number "7", the mat, milk bottles, the street sign
    b.add(planeM(0.22, 0.12, [0, 0, 0.5, 0.5]), m.signs, TRS(0.95, 1.75, -0.885));
    const mg = planeM(0.8, 0.45, [0.5, 0, 1, 0.5]); mg.rotateX(-Math.PI / 2); b.add(mg, m.signs, TRS(0, 0.311, -1.2));
    b.box(m.paint, -0.4, 0.3, -1.42, 0.4, 0.31, -0.98, "#8a5a28");
    b.box(m.paint, -3.2, 2.48, -0.9, -1.95, 2.84, -0.87, "#141414");
    b.add(planeM(1.21, 0.3, [0, 0.5, 1, 1]), m.signs, TRS(-2.575, 2.66, -0.865));
    for (const [x, z, cap] of [[0.38, -0.75, "#d8d8e0"], [0.47, -0.7, "#e0b030"]] as [number, number, string][]) {
      b.lathe(m.gloss, [[0.001, 0], [0.04, 0], [0.042, 0.02], [0.042, 0.13], [0.03, 0.18], [0.022, 0.22], [0.024, 0.235], [0.001, 0.235]], TRS(x, 0.15, z), 16, "#fbfbf6");
      b.cyl(m.metal, 0.025, 0.025, 0.012, 12, TRS(x, 0.15 + 0.241, z), cap);
    }
    b.build(R, true);
  }
  /** beyond the +x end: railings at the drop, the town below, hills, and trees (distant silhouettes) */
  sunriseEnd() {
    const m = this.m, b = new Bat(), xE = -1.0 + 4.8 * 8 + 0.35;
    b.add(flat(xE, -9, xE + 3.2, 11.5, 0), m.pave);
    for (let z = -8.5; z <= 11; z += 0.14) b.box(m.metal, xE + 3.0, 0.06, z - 0.012, xE + 3.024, 1.05, z + 0.012, "#1e1e26");
    b.box(m.metal, xE + 2.98, 1.02, -8.6, xE + 3.05, 1.06, 11.1, "#1e1e26"); b.box(m.metal, xE + 2.98, 0.2, -8.6, xE + 3.05, 0.23, 11.1, "#1e1e26");
    b.box(m.granite, xE + 2.85, -2.5, -9, xE + 3.2, 0.06, 11.5, "#d8d0c8");
    const xW = -1.0 - 4.8 * 7 - 0.35;
    b.box(m.brick, xW - 4, 0, -0.9, xW - 3.6, 2.2, 11.0);
    this.tree(b, xW - 2.0, 4.6, 444);
    b.add(flat(xW - 4, -0.9, xW, 11.0, 0), m.pave);
    b.build(this.root, true);
    // silhouette layers (self-lit, fogged): [texture, x, width, y0, height, colour, facing +x?]
    const L: [number, number, number, number, number, string, boolean][] = [
      [2, 70, 260, -9, 22, "#5e5a8e", false], [0, 130, 520, -22, 58, "#80649a", false], [1, 330, 1400, -25, 100, "#b084aa", false],
      [0, -140, 520, -6, 46, "#8a90b8", true], [1, -320, 1400, -30, 120, "#a8acd0", true],
    ];
    for (const [k, x, w, y0, h, col, pos] of L) {
      const mat = new THREE.MeshBasicMaterial({ map: skylineTex(k), transparent: true, alphaTest: 0.04, fog: true, depthWrite: true, color: new THREE.Color(col) });
      const g = new THREE.PlaneGeometry(w, h); g.rotateY(pos ? Math.PI / 2 : -Math.PI / 2); g.translate(x, y0 + h / 2, 3);
      const ms = new THREE.Mesh(g, mat); ms.layers.set(NOINK); ms.frustumCulled = false; this.root.add(ms);
      this.layers.push({ mat, col: new THREE.Color(col) });
    }
  }
  /** bunting strings across the street (facade to facade) */
  buntings() {
    const m = this.m, FL = ["#e83a3a", "#ffd23a", "#3a8ae8", "#ffffff", "#3ab85a", "#ff8ac0"];
    for (const [x, seed] of [[-6.2, 1], [3.6, 2], [13.4, 3], [24.0, 4]] as [number, number][]) {
      const g = new THREE.Group(), b = new Bat(), r = rng(seed * 17);
      const z0 = -0.84, z1 = 10.94, y0 = 4.55, sag = 0.75, dx = 0.5;
      const P = (u: number) => V3(x + dx * (u - 0.5), y0 - sag * 4 * u * (1 - u), z0 + (z1 - z0) * u);
      const pts: THREE.Vector3[] = []; for (let k = 0; k <= 24; k++) pts.push(P(k / 24));
      b.tube(m.paint, pts, 0.008, 60, "#f2ede2", 5);
      const n = 34;
      for (let k = 1; k < n; k++) {
        const u = k / n, a = P(u - 0.012), c = P(u + 0.012), mid = P(u), tip = V3(mid.x + (r() - 0.5) * 0.03, mid.y - 0.3, mid.z + (r() - 0.5) * 0.04);
        const tg = new THREE.BufferGeometry(); tg.setAttribute("position", new THREE.Float32BufferAttribute([a.x, a.y, a.z, c.x, c.y, c.z, tip.x, tip.y, tip.z], 3)); tg.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2)); tg.computeVertexNormals();
        b.add(tg, m.leaf, undefined, FL[(k + seed) % FL.length]);
      }
      for (const z of [z0 - 0.02, z1 + 0.02]) b.sph(m.metal, TRS(x, y0, z, 0, 0, 0, 0.04), 8, "#2a2a30");
      b.build(g, true); this.root.add(g); this.bunting.push(g);
    }
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const T = mixW(lookW(id, f), STREET_TINT, STREET_TINT.dawn!);
    this.doorPivot.rotation.y = 1.42 * (id === 4 || id === 5 ? 1 : doorAt(id, t).open); // left open after shot 1 (continuity into shot 6)
    this.glassMat.color.setRGB(T[0], T[1], T[2]);
    for (const L of this.layers) L.mat.color.copy(L.col).multiplyScalar(T[3]);
    this.lampMat.color.setRGB(1.6 * T[5], 1.1 * T[5], 0.6 * T[5]);
    this.hallGlow.color.setRGB(1.4 * T[5], 0.9 * T[5], 0.5 * T[5]);
    this.kitchenMat.color.setRGB(T[0], T[1], T[2]);
    // the sun glow: along the world's sun direction from the camera
    const sd = worldSun(id), cp = cam.position, R0 = this.root.position;
    this.sunGlow.visible = this.sunHalo.visible = sd.y > -0.05 && T[4] > 0.02;
    this.sunGlow.position.copy(cp).addScaledVector(sd, 600).sub(R0); this.sunGlow.scale.setScalar(600 * 0.42);
    this.sunHalo.position.copy(cp).addScaledVector(sd, 610).sub(R0); this.sunHalo.scale.setScalar(610 * 1.5);
    (this.sunGlow.material as THREE.SpriteMaterial).color.setRGB(2.0 * T[4], 1.35 * T[4], 0.7 * T[4]);
    (this.sunHalo.material as THREE.SpriteMaterial).color.setRGB(0.5 * T[4], 0.3 * T[4], 0.16 * T[4]);
    // bunting: a slow breeze, and a gust from every sneeze
    let gust = 0;
    for (const [ts, , sz] of SNEEZES) if (t >= ts - 0.05) gust = Math.max(gust, sz * Math.exp(-(t - ts) * 2.2) * smooth((t - ts + 0.05) / 0.12));
    this.bunting.forEach((g, i) => { g.rotation.x = Math.sin(t * 1.3 + i * 1.7) * 0.006 + gust * 0.035 * Math.sin(t * 9 + i); });
    // the cat: basks; puffs up at every sneeze on the street (a 3-frame crossfade), calms down after ~1.2 s
    let st = 0;
    if (id === 1 || id === 5 || id === 6) for (const [ts, , sz] of SNEEZES) if (sz > 0.3) st = Math.max(st, smooth((t - ts) / 0.1) * (1 - smooth((t - ts - 1.1) / 0.35)));
    const card = new THREE.Color(T[6], T[7], T[8]);
    this.catMat[0].opacity = 1 - st; this.catMat[1].opacity = st;
    this.catMat[0].color.copy(card); this.catMat[1].color.copy(card);
    this.cat[0].visible = st < 0.999; this.cat[1].visible = st > 0.001;
    const yaw = Math.atan2(cp.x - (R0.x + CAT[0] - STREET[0]), cp.z - (R0.z + CAT[2] - STREET[2]));
    this.cat.forEach((c, i) => { c.rotation.set(0, yaw, 0); c.scale.setScalar(1 + 0.06 * st * i); });
    this.catMat[0].depthWrite = st < 0.5; this.catMat[1].depthWrite = st >= 0.5;
  }
}

// ============================================================ the STAGE light shader (own rig)
const NL = 8, NS = 4;
const CORE = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSP[${NS}]; uniform vec3 uSDr[${NS}]; uniform vec3 uSC[${NS}]; uniform vec2 uSK[${NS}]; uniform float uKeySh;
float fallK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
vec3 spotsAt(vec3 p, vec3 n, float sh){
  vec3 L = vec3(0.0);
  for (int i = 0; i < ${NS}; i++) {
    vec3 d = uSP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    float k = smoothstep(uSK[i].x, uSK[i].y, dot(-l, uSDr[i])) * smoothstep(-0.15, 0.5, dot(n, l)) * 60.0 / (30.0 + r2);
    if (i == 0) k *= mix(1.0, sh, uKeySh);
    L += uSC[i] * k;
  }
  return L;
}
vec3 lightAt(vec3 p, vec3 n, float sh){
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.3, 0.6, dot(n, l)) * fallK(uLR[i], r2);
  }
  return L + spotsAt(p, n, sh);
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
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform float uSpec; uniform float uSpecK; uniform vec2 uRep; uniform float uSheen;
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
  vec3 n = normalize(vN); vec3 v = normalize(cameraPosition - vW); if (dot(n, v) < 0.0) n = -n;
  float sh = getShadowMask();
  vec2 uv = vUv * uRep;
  vec4 tx = vec4(1.0);
#ifdef HAS_MAP
  tx = texture2D(uMap, uv);
#endif
  vec3 alb = uCol * vC * tx.rgb;
  vec3 Lt = lightAt(vW, n, sh);
  vec3 c = alb * Lt + uEm * vC;
  if (uSheen > 0.0) { float fr = pow(1.0 - max(dot(n, v), 0.0), 2.5); c += alb * Lt * fr * uSheen; }
#ifdef EMAP
  c = texture2D(uMap, uv).rgb * uEm;
#endif
#ifdef SPEC
  for (int i = 0; i < ${NS}; i++) { vec3 l = normalize(uSP[i] - vW); float k = smoothstep(uSK[i].x, uSK[i].y, dot(-l, uSDr[i]));
    c += uSC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * k * uSpecK * 0.4; }
  for (int i = 0; i < ${NL}; i++) { vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * fallK(uLR[i] * 1.5, r2) * uSpecK; }
#endif
  gl_FragColor = vec4(c, 1.0);
}`;
type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[]; sp: THREE.Vector3[]; sd: THREE.Vector3[]; sc: THREE.Vector3[]; sk: THREE.Vector2[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0)), lc = Array.from({ length: NL }, () => V3(0, 0, 0)), lr = Array.from({ length: NL }, () => 1);
  const sp = Array.from({ length: NS }, () => V3(0, -999, 0)), sd = Array.from({ length: NS }, () => V3(0, -1, 0)), sc = Array.from({ length: NS }, () => V3(0, 0, 0)), sk = Array.from({ length: NS }, () => new THREE.Vector2(0.9, 0.95));
  return { lp, lc, lr, sp, sd, sc, sk, u: { uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) }, uSP: { value: sp }, uSDr: { value: sd }, uSC: { value: sc }, uSK: { value: sk }, uKeySh: { value: 0 } } };
};
type MOpt = { col?: string; map?: THREE.Texture; em?: C3; spec?: number; specK?: number; emap?: boolean; rep?: [number, number]; sheen?: number };
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
      uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null }, uRep: { value: new THREE.Vector2(...(o.rep ?? [1, 1])) }, uSheen: { value: o.sheen ?? 0 },
    },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, lights: true,
  });
};
/** a soft additive light shaft; uv.y 0 at the lamp, 1 at the target; uv.x around */
class Beam {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: V3(1, 0.8, 0.5) }, uK: { value: 0 }, uT: { value: 0 } },
      vertexShader: `varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
        void main(){ vAl = uv.y; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vAng = uv.x; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform vec3 uCol; uniform float uK; uniform float uT; varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
        void main(){ vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v));
          float streak = 0.75 + 0.25 * sin(vAng * 6.2832 * 6.0 + sin(vAng * 6.2832 * 2.0 + uT * 0.35) * 1.8 + vAl * 3.0);
          float a = uK * pow(e, 1.6) * streak * smoothstep(0.0, 0.1, 1.0 - vAl) * smoothstep(0.0, 0.04, vAl) * (0.4 + 0.6 * (1.0 - vAl));
          a *= smoothstep(0.6, 1.8, length(cameraPosition - vW));
          gl_FragColor = vec4(uCol * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
}
/** cone shaft from lamp p to target q (local coords), half-angle a, radius r0 at the lamp */
const coneGeo = (p: THREE.Vector3, q: THREE.Vector3, a: number, r0: number) => {
  const L = p.distanceTo(q), g = new THREE.CylinderGeometry(r0, r0 + Math.tan(a) * L, L, 48, 8, true);
  g.translate(0, -L / 2, 0);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), q.clone().sub(p).normalize()));
  g.translate(p.x, p.y, p.z);
  return g;
};
/** dust motes inside the given beams (seeded), additive; col = index into uC */
class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, beams: { p: THREE.Vector3; q: THREE.Vector3; r: number; col: number }[], n: number, seed: number) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const bm = beams[i % beams.length], u = 0.12 + 0.86 * Math.sqrt(r()), a = r() * Math.PI * 2, rr = bm.r * u * Math.sqrt(r());
      const d = bm.q.clone().sub(bm.p), ax = d.clone().normalize(), t1 = V3(0, 1, 0).cross(ax).normalize(), t2 = ax.clone().cross(t1);
      const p = bm.p.clone().addScaledVector(d, u).addScaledVector(t1, Math.cos(a) * rr).addScaledVector(t2, Math.sin(a) * rr);
      P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = p.z;
      D[i * 4] = r(); D[i * 4 + 1] = 0.004 + 0.008 * r() * r(); D[i * 4 + 2] = bm.col; D[i * 4 + 3] = r();
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uC0: { value: V3(1, 1, 1) }, uC1: { value: V3(1, 1, 1) }, uC2: { value: V3(1, 1, 1) } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; varying vec3 vC; varying vec2 vQ;
        void main(){
          float ph = iS.x * 6.2832;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.17 + ph) * 0.1, sin(uT * 0.13 + ph * 2.0) * 0.08, cos(uT * 0.15 + ph * 1.3) * 0.1);
          vec3 col = iS.z < 0.5 ? uC0 : iS.z < 1.5 ? uC1 : uC2;
          float tw = 0.55 + 0.45 * sin(uT * (1.1 + 2.0 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.18);
          vQ = position.xy * 2.0; vC = col * tw * smoothstep(0.7, 1.6, dist) / max(1.0, dist * 0.18);
          gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x + up * position.y) * s, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
}

// ============================================================ the STAGE (1978 conference)
const DECK = 0.6;
type SpotDef = { p: THREE.Vector3; q: THREE.Vector3; a: number[] };
const SPOTS: Record<"key" | "banL" | "banR" | "wash", SpotDef> = {
  key: { p: V3(4.6, 6.45, 7.8), q: V3(2.7, 1.5, -0.7), a: [0.12, 0.085] },
  banL: { p: V3(-2.4, 6.6, 7.8), q: V3(-1.3, 2.5, -2.25), a: [0.19, 0.14] },
  banR: { p: V3(2.0, 6.6, 7.8), q: V3(1.3, 2.5, -2.25), a: [0.19, 0.14] },
  wash: { p: V3(0, 6.9, 0.6), q: V3(0, 1.4, -3.2), a: [0.6, 0.38] },
};
const PROJ = { p: V3(-3.9, 1.75, 10.4), c: V3(-3.95, 1.95, 0.64), w: 1.3, h: 1.0 };
type StageRig = { au: C3; ad: C3; key: C3; ban: C3; wash: C3; house: C3; foot: C3; cone: number; banCone: number; proj: number; em: number };
const RIG_PRE: StageRig = { au: [0.13, 0.1, 0.18], ad: [0.16, 0.1, 0.08], key: [5.0, 3.9, 2.7], ban: [0.9, 0.75, 0.6], wash: [0.35, 0.2, 0.2], house: [0.45, 0.28, 0.13], foot: [0.45, 0.27, 0.12], cone: 0.16, banCone: 0.04, proj: 1.0, em: 1.0 };
const RIG_REV: StageRig = { au: [0.1, 0.08, 0.15], ad: [0.13, 0.08, 0.07], key: [3.8, 3.0, 2.1], ban: [5.6, 4.6, 3.4], wash: [0.4, 0.24, 0.22], house: [0.26, 0.16, 0.08], foot: [0.6, 0.36, 0.16], cone: 0.12, banCone: 0.14, proj: 0.8, em: 0.8 };
const RIG_GOLD: StageRig = { au: [0.12, 0.09, 0.12], ad: [0.18, 0.11, 0.06], key: [4.2, 3.0, 1.7], ban: [7.0, 4.6, 1.9], wash: [1.0, 0.55, 0.3], house: [0.36, 0.2, 0.08], foot: [0.9, 0.5, 0.2], cone: 0.14, banCone: 0.2, proj: 0.7, em: 0.9 };
const mixRig = (a: StageRig, b: StageRig, k: number): StageRig => {
  const o: Record<string, number | C3> = {};
  for (const key of Object.keys(a) as (keyof StageRig)[]) {
    const x = a[key], y = b[key];
    o[key] = typeof x === "number" ? x + ((y as number) - x) * k : ((x as C3).map((v, i) => v + ((y as C3)[i] - v) * k) as C3);
  }
  return o as StageRig;
};
const sc3 = (a: C3, k: number): C3 => [a[0] * k, a[1] * k, a[2] * k];
class Stage {
  root = new THREE.Group(); S = lset();
  emMats: { m: THREE.ShaderMaterial; base: C3 }[] = [];
  key: Beam; banL: Beam; banR: Beam; motes: Motes; ceil = new THREE.Group();
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...STAGE);
    R.add(this.ceil);
    const b = new Bat(), bc = new Bat();
    const plain = imat(S, {}), gloss = imat(S, { spec: 40, specK: 0.5 }), metal = imat(S, { spec: 60, specK: 0.9 });
    const deck = imat(S, { map: tiled(deckTex(), 1.2), rep: [1 / 1.2, 1 / 1.2], spec: 30, specK: 0.25 });
    const slats = imat(S, { map: slatTex(), rep: [1 / 1.2, 1 / 1.2] });
    const carpet = imat(S, { map: carpetTex(), rep: [1, 1] });
    const velRed = imat(S, { map: velvetTex(), col: "#b01826", sheen: 0.9 });
    const velBlue = imat(S, { map: velvetTex(), col: "#1c3468", sheen: 0.7 });
    const velSeat = imat(S, { col: "#d86a24", sheen: 0.6 });
    const ceilM = imat(S, { map: tileCeilTex(), rep: [1 / 0.6, 1 / 0.6] });
    const atlas = stageSignTex();
    const signs = imat(S, { map: atlas });
    const glowM = (em: C3, map?: THREE.Texture) => { const mm = imat(S, map ? { map, emap: true, em } : { em, col: "#000000" }); this.emMats.push({ m: mm, base: em }); return mm; };
    const bulb = glowM([3.2, 2.2, 1.2]), sconce = glowM([2.0, 1.3, 0.7]), exitM = glowM([1.0, 1.0, 1.0], atlas), canM = glowM([2.4, 2.0, 1.6]);
    const slideM = imat(S, { map: slideTex() });
    const GOLD = "#d8a848", WAL = "#5a3420";
    const A = (x0: number, y0: number, x1: number, y1: number) => px(2048, 1024, x0, y0, x1, y1);
    // ---- hall: carpet, walls, ceiling ----
    const HX = 7.5, HZB = 12.5, HY = 7.5;
    b.add(flat(-HX, 0.9, HX, HZB, 0), carpet);
    for (const s of [-1, 1]) {
      const wg = planeM(HZB - 0.3, HY); wg.rotateY(s < 0 ? Math.PI / 2 : -Math.PI / 2); wg.translate(s * HX, HY / 2, (HZB + 0.3) / 2);
      b.add(wg, slats);
      b.box(plain, s * HX, 0, 0.3, s * (HX - 0.03), 0.15, HZB, "#2a1a12");
      b.box(gloss, s * HX, 2.2, 0.3, s * (HX - 0.05), 2.26, HZB, GOLD);
      for (const z of [2.5, 6.0, 9.5]) {
        b.box(plain, s * (HX - 0.02), 3.0, z - 0.12, s * (HX - 0.06), 3.5, z + 0.12, "#3a2a20");
        b.add(new THREE.CylinderGeometry(0.2, 0.1, 0.22, 16, 1, false, s < 0 ? 0 : Math.PI, Math.PI), sconce, TRS(s * (HX - 0.04), 3.45, z));
      }
    }
    b.add(wallZ(-HX, HX, 0, HY, 0), slats, TRS(0, 0, HZB, Math.PI));
    { const g = planeM(0.7, 0.28, A(720, 320, 1320, 560)); g.rotateY(Math.PI / 2); b.add(g, exitM, TRS(-HX + 0.06, 2.75, 10.5)); b.box(plain, -HX + 0.01, 2.58, 10.1, -HX + 0.05, 2.92, 10.9, "#1a1a1a"); }
    { const g = planeM(0.64, 0.64, A(1370, 330, 1830, 790)); g.rotateY(Math.PI / 2); b.add(g, signs, TRS(-HX + 0.07, 4.2, 5.0)); b.torus(gloss, 0.33, 0.03, TRS(-HX + 0.07, 4.2, 5.0, Math.PI / 2), "#2a2a2a"); }
    for (const s of [-1, 1]) {
      b.rbox(gloss, 0.9, 1.3, 0.6, 0.04, TRS(s * 6.35, 4.3, 0.75), "#3a2418");
      b.add(planeM(0.78, 1.14, A(720, 600, 1320, 1020)), signs, TRS(s * 6.35, 4.3, 1.065));
      b.box(metal, s * 6.35 - 0.04, 4.95, 0.5, s * 6.35 + 0.04, 7.5, 0.58, "#2a2a2a");
    }
    bc.add(flat(-HX, 0.3, HX, HZB, HY), ceilM);
    for (let z = 2.0; z < HZB; z += 2.4) for (const x of [-4.8, -1.6, 1.6, 4.8]) { const cg = new THREE.CircleGeometry(0.16, 20); cg.rotateX(Math.PI / 2); bc.add(cg, canM, TRS(x, HY - 0.005, z)); bc.torus(metal, 0.17, 0.02, TRS(x, HY - 0.01, z, 0, Math.PI / 2), "#d8d0c0"); }
    // FOH lighting bar with cans (the spots' sources)
    bc.rod(metal, V3(-5, 6.6, 7.8), V3(5, 6.6, 7.8), 0.03, 10, "#1a1a1a");
    for (const s of [SPOTS.key, SPOTS.banL, SPOTS.banR]) {
      const d = s.q.clone().sub(s.p).normalize(), mm = new THREE.Matrix4().compose(s.p, new THREE.Quaternion().setFromUnitVectors(V3(0, -1, 0), d), V3(1, 1, 1));
      const cg = new THREE.CylinderGeometry(0.12, 0.15, 0.45, 16); cg.translate(0, 0.22, 0); bc.add(cg, metal, mm, "#1e1e1e");
      const lg = new THREE.CircleGeometry(0.13, 20); lg.rotateX(Math.PI / 2); lg.translate(0, -0.005, 0); bc.add(lg, canM, mm);
      if (Math.abs(s.p.y - 6.6) > 0.05) bc.rod(metal, V3(s.p.x, 6.6, 7.8), s.p, 0.015, 6, "#1a1a1a");
    }
    // ---- the stage: deck, apron, footlights, steps ----
    const ZF = 0.9, ZB = -3.6, XS = 6.2;
    b.add(flat(-XS, ZB, XS, ZF, DECK), deck);
    b.add(quad4(V3(-XS, 0, ZF), V3(XS, 0, ZF), V3(XS, DECK - 0.06, ZF), V3(-XS, DECK - 0.06, ZF), [0, 0, 12.4, 0, 12.4, 0.54, 0, 0.54]), slats);
    b.box(gloss, -XS, DECK - 0.06, ZF - 0.03, XS, DECK + 0.012, ZF + 0.03, GOLD);
    for (const s of [-1, 1]) b.add(quad4(V3(s * XS, 0, s > 0 ? ZF : ZB), V3(s * XS, 0, s > 0 ? ZB : ZF), V3(s * XS, DECK, s > 0 ? ZB : ZF), V3(s * XS, DECK, s > 0 ? ZF : ZB)), plain, undefined, "#2a1a12");
    b.box(plain, -4.6, DECK, ZF - 0.22, 4.6, DECK + 0.07, ZF - 0.08, "#1a1410");
    for (let k = 0; k < 24; k++) b.sph(bulb, TRS(-4.4 + k * (8.8 / 23), DECK + 0.075, ZF - 0.15, 0, 0, 0, 0.032), 8);
    for (let k = 0; k < 3; k++) b.box(deck, 5.1, 0, ZF + 0.22 * (3 - k), 6.1, 0.2 * (k + 1), ZF, "#ffffff");
    // ---- proscenium wall + frame + header lettering ----
    const PZ = 0.3, PX = 5.2, PY = 5.6;
    b.add(wallZ(-HX, HX, 0, HY, PZ, [[-PX, PX, DECK, PY]]), slats);
    for (const [a, c, d, e] of [[-PX - 0.3, -PX, DECK, PY + 0.3], [PX, PX + 0.3, DECK, PY + 0.3], [-PX - 0.3, PX + 0.3, PY, PY + 0.3]]) b.box(gloss, a, d, PZ, c, e, PZ + 0.12, WAL);
    for (const [a, c, d, e] of [[-PX - 0.06, -PX, DECK, PY + 0.06], [PX, PX + 0.06, DECK, PY + 0.06], [-PX - 0.06, PX + 0.06, PY, PY + 0.06]]) b.box(gloss, a, d, PZ + 0.12, c, e, PZ + 0.15, GOLD);
    b.add(planeM(6.4, 0.94, A(0, 0, 2048, 300)), signs, TRS(0, 6.45, PZ + 0.012)); b.box(gloss, -3.25, 5.94, PZ, 3.25, 5.98, PZ + 0.06, GOLD); b.box(gloss, -3.25, 6.92, PZ, 3.25, 6.96, PZ + 0.06, GOLD);
    for (const s of [-1, 1]) b.add(quad4(V3(s * XS, DECK, s > 0 ? PZ : ZB), V3(s * XS, DECK, s > 0 ? ZB : PZ), V3(s * XS, HY, s > 0 ? ZB : PZ), V3(s * XS, HY, s > 0 ? PZ : ZB)), plain, undefined, "#1a1218");
    b.add(flat(-XS, ZB, XS, PZ, HY - 0.5), plain, undefined, "#120c10");
    b.add(wallZ(-XS, XS, DECK, HY, ZB), plain, undefined, "#120c10");
    // ---- curtains: blue velvet back curtain, red mains tied back, red valance with gold fringe ----
    const pleat = (u: number, n: number, Am: number) => Am * Math.sin(u * Math.PI * 2 * n);
    b.add(drape(170, 6, (u, v) => V3(-XS + 0.1 + u * (2 * XS - 0.2), HY - 0.5 - v * (HY - 0.5 - DECK - 0.01), -3.3 + pleat(u, 34, 0.07)), 12), velBlue);
    for (const s of [-1, 1]) {
      const W0 = 1.6, tieV = 0.72;
      b.add(drape(54, 36, (u, v) => {
        const y = PY - 0.05 - v * (PY - 0.05 - DECK - 0.005);
        const wv = v < tieV ? W0 - (W0 - 0.5) * Math.pow(v / tieV, 1.4) : 0.5 + (0.78 - 0.5) * smooth((v - tieV) / (1 - tieV));
        const x = s * (PX + 0.05) - s * u * wv;
        const amp = 0.06 + 0.05 * (1 - wv / W0);
        return V3(x, y, 0.12 + pleat(u, 9, amp) + 0.08 * u * Math.sin(Math.PI * Math.min(1, v / tieV)) * (v < tieV ? 1 : 0.5));
      }, 4), velRed);
      const ty = PY - 0.05 - tieV * (PY - 0.05 - DECK);
      b.add(new THREE.TorusGeometry(0.3, 0.035, 8, 24), gloss, TRS(s * (PX - 0.2), ty, 0.16, 0, 0.3, 0, [1.1, 0.45, 1]), GOLD);
      b.tube(gloss, [V3(s * (PX - 0.22), ty - 0.05, 0.25), V3(s * (PX - 0.2), ty - 0.35, 0.27), V3(s * (PX - 0.18), ty - 0.6, 0.26)], 0.02, 12, GOLD, 6);
      b.lathe(gloss, [[0.001, 0], [0.06, 0.02], [0.08, 0.14], [0.03, 0.2], [0.001, 0.22]], TRS(s * (PX - 0.18), ty - 0.82, 0.26), 12, GOLD);
    }
    const swg = (u: number) => Math.sin(Math.PI * ((u * 5) % 1));
    const valP = (u: number, v: number) => V3(-PX - 0.1 + u * (2 * PX + 0.2), PY + 0.05 - v * (0.55 - 0.32 * swg(u)), 0.22 + pleat(u, 50, 0.035) + 0.06 * swg(u) * v);
    b.add(drape(250, 8, valP, 20), velRed);
    { const pts: THREE.Vector3[] = []; for (let k = 0; k <= 250; k++) pts.push(valP(k / 250, 1).add(V3(0, 0, 0.015))); b.tube(gloss, pts, 0.03, 500, GOLD, 6); }
    // ---- the podium (lectern) with an emblem, a chrome 1950s-style mic, a water glass ----
    {
      const pxx = 2.7, pz = -0.4, y0 = DECK;
      b.rbox(gloss, 0.78, 0.08, 0.6, 0.02, TRS(pxx, y0 + 0.04, pz), "#4a2a18");
      const v = (x: number, y: number, z: number) => [pxx + x, y0 + y, pz + z];
      const Pp = [v(-0.33, 0.08, 0.24), v(0.33, 0.08, 0.24), v(0.36, 1.05, 0.3), v(-0.36, 1.05, 0.3), v(-0.33, 0.08, -0.24), v(0.33, 0.08, -0.24), v(0.36, 1.05, -0.26), v(-0.36, 1.05, -0.26)];
      const pos: number[] = []; for (const [a, c, d, e] of [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2]]) for (const i of [a, c, d, a, d, e]) pos.push(...Pp[i]);
      const body = new THREE.BufferGeometry(); body.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); body.computeVertexNormals();
      b.add(body, gloss, undefined, "#6a3a20");
      const topM = TRS(pxx, y0 + 1.12, pz + 0.02, 0, -0.22);
      b.add(boxM(-0.42, -0.03, -0.32, 0.42, 0.03, 0.36), gloss, topM, "#4a2a18");
      b.add(boxM(-0.18, 0.03, -0.14, 0.12, 0.036, 0.12), plain, topM, "#fbf8ee");
      b.box(gloss, pxx - 0.4, y0 + 1.0, pz + 0.3, pxx + 0.4, y0 + 1.05, pz + 0.36, GOLD);
      const eg = planeM(0.42, 0.42, A(0, 320, 700, 1020)); eg.rotateX(Math.atan2(0.06, 0.97));
      b.add(eg, signs, TRS(pxx, y0 + 0.62, pz + 0.29));
      const mb = V3(pxx - 0.1, y0 + 1.19, pz + 0.12), mh = V3(2.52, 1.95, -0.52);
      b.cyl(metal, 0.05, 0.06, 0.03, 16, TRS(mb.x, mb.y, mb.z), "#c8c8d0");
      b.tube(metal, [mb, V3(mb.x, mb.y + 0.15, mb.z - 0.02), V3((mb.x + mh.x) / 2, mh.y - 0.12, (mb.z + mh.z) / 2), V3(mh.x, mh.y - 0.07, mh.z + 0.02)], 0.009, 20, "#c8c8d0", 6);
      b.rbox(metal, 0.09, 0.13, 0.08, 0.035, TRS(mh.x, mh.y, mh.z, 0.4, -0.25), "#e0e0e8", 3);
      for (let k = 0; k < 5; k++) b.add(boxM(-0.047, -0.05 + k * 0.025, -0.035, 0.047, -0.043 + k * 0.025, 0.045), metal, TRS(mh.x, mh.y, mh.z, 0.4, -0.25), "#7a7a86");
      b.tube(plain, [mb, V3(pxx - 0.05, y0 + 1.1, pz + 0.25), V3(pxx + 0.1, y0 + 0.4, pz + 0.33), V3(pxx + 0.3, y0 + 0.01, pz + 0.42), V3(pxx + 0.9, y0 + 0.01, pz + 0.5)], 0.008, 30, "#1a1a1a", 5);
      b.lathe(gloss, [[0.001, 0], [0.03, 0], [0.036, 0.11], [0.033, 0.11], [0.027, 0.004], [0.001, 0.004]], TRS(pxx + 0.3, y0 + 1.185, pz + 0.12), 16, "#c8e0f0");
    }
    // ---- an easel screen (apron, stage left) with the printed 1978 figure ----
    {
      const { c, w, h } = PROJ;
      b.box(plain, c.x - w / 2 - 0.04, c.y - h / 2 - 0.04, c.z - 0.03, c.x + w / 2 + 0.04, c.y + h / 2 + 0.04, c.z - 0.005, "#1a1a1a");
      b.add(quad4(V3(c.x - w / 2, c.y - h / 2, c.z), V3(c.x + w / 2, c.y - h / 2, c.z), V3(c.x + w / 2, c.y + h / 2, c.z), V3(c.x - w / 2, c.y + h / 2, c.z)), slideM);
      b.cyl(metal, 0.03, 0.03, w + 0.2, 10, TRS(c.x, c.y + h / 2 + 0.06, c.z - 0.02, 0, 0, Math.PI / 2), "#2a2a2a");
      b.rod(metal, V3(c.x, DECK + 0.3, c.z - 0.06), V3(c.x, c.y + h / 2 + 0.06, c.z - 0.06), 0.018, 8, "#2a2a2a");
      for (let k = 0; k < 3; k++) { const a = Math.PI / 2 + (k * Math.PI * 2) / 3; b.rod(metal, V3(c.x, DECK + 0.32, c.z - 0.06), V3(c.x + Math.cos(a) * 0.3, DECK, c.z - 0.06 + Math.sin(a) * 0.18), 0.012, 6, "#2a2a2a"); }
    }
    // ---- the audience seats: 8 rows, BEAN's seat front-row centre ----
    for (let row = 0; row < 8; row++) {
      const z = 2.5 + row * 0.95;
      const xs: number[] = []; for (let k = -6; k <= 6; k++) xs.push(k * 0.62); for (const s of [-1, 1]) for (let k = 0; k < 3; k++) xs.push(s * (4.75 + k * 0.62));
      for (const x of xs) {
        if ((row === 1 || row === 2) && x > 0.9 && x < 2.0) continue; // props: projector cart at (1.3, 0, 4.1)
        b.rbox(velSeat, 0.5, 0.1, 0.46, 0.04, TRS(x, 0.41, z - 0.02), "#ffffff");
        b.rbox(velSeat, 0.5, 0.56, 0.1, 0.05, TRS(x, 0.72, z + 0.27, 0, 0.12), "#ffffff");
        b.rbox(gloss, 0.52, 0.6, 0.04, 0.02, TRS(x, 0.7, z + 0.335, 0, 0.12), "#4a2a18");
        for (const s of [-1, 1]) { b.box(gloss, x + s * 0.27, 0.6, z - 0.22, x + s * 0.31, 0.64, z + 0.24, "#6a3a20"); b.box(metal, x + s * 0.28, 0, z - 0.05, x + s * 0.3, 0.6, z + 0.25, "#3a3a3a"); }
      }
    }
    b.build(R, true); bc.build(this.ceil, false);
    // ---- haze shafts + motes ----
    this.key = new Beam(R, coneGeo(SPOTS.key.p, SPOTS.key.q, SPOTS.key.a[0] * 0.85, 0.12));
    this.banL = new Beam(R, coneGeo(SPOTS.banL.p, SPOTS.banL.q, SPOTS.banL.a[0] * 0.85, 0.12));
    this.banR = new Beam(R, coneGeo(SPOTS.banR.p, SPOTS.banR.q, SPOTS.banR.a[0] * 0.85, 0.12));
    const rad = (s: SpotDef) => Math.tan(s.a[0]) * s.q.distanceTo(s.p) * 0.75;
    this.motes = new Motes(R, [
      { p: SPOTS.key.p, q: SPOTS.key.q, r: rad(SPOTS.key), col: 0 }, { p: SPOTS.banL.p, q: SPOTS.banL.q, r: rad(SPOTS.banL), col: 1 },
      { p: SPOTS.banR.p, q: SPOTS.banR.q, r: rad(SPOTS.banR), col: 1 }
    ], 700, 77);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    const S = this.S, O = this.root.position, W2 = (x: number, y: number, z: number) => V3(x + O.x, y + O.y, z + O.z);
    const bn = bannerAt(id, t);
    let rg = mixRig(RIG_PRE, RIG_REV, bn.reveal);
    rg = mixRig(rg, RIG_GOLD, bn.initials);
    const pk = t >= W.achoo2 - 0.15 ? Math.exp(-(t - (W.achoo2 - 0.15)) * 2.0) * smooth((t - (W.achoo2 - 0.15)) / 0.1) : 0;
    if (pk > 0) rg = { ...rg, ban: sc3(rg.ban, 1 + 0.5 * pk), wash: sc3(rg.wash, 1 + 2.0 * pk), house: sc3(rg.house, 1 + 1.2 * pk), banCone: rg.banCone * (1 + 0.6 * pk) };
    const defs: [SpotDef, C3][] = [[SPOTS.key, rg.key], [SPOTS.banL, rg.ban], [SPOTS.banR, rg.ban], [SPOTS.wash, rg.wash]];
    defs.forEach(([s, c], i) => { S.sp[i].copy(W2(s.p.x, s.p.y, s.p.z)); S.sd[i].copy(s.q.clone().sub(s.p).normalize()); S.sc[i].set(...c); S.sk[i].set(Math.cos(s.a[0]), Math.cos(s.a[1])); });
    // the key spot carries the cards' shadows only when the world's sun comes from the audience side
    S.u.uKeySh.value = worldSun(id).z > 0.2 ? 0.85 : 0;
    const H = rg.house, Ft = rg.foot;
    const L: { p: THREE.Vector3; c: C3; r: number }[] = [
      { p: W2(-7.1, 3.6, 4.2), c: sc3(H, 1.3), r: 3.2 }, { p: W2(7.1, 3.6, 4.2), c: sc3(H, 1.3), r: 3.2 },
      { p: W2(-2.8, DECK + 0.3, -2.9), c: [0.35 * rg.em, 0.3 * rg.em, 0.9 * rg.em], r: 1.8 }, { p: W2(2.8, DECK + 0.3, -2.9), c: [0.35 * rg.em, 0.3 * rg.em, 0.9 * rg.em], r: 1.8 },
      { p: W2(-2.5, DECK + 0.15, 0.6), c: Ft, r: 1.6 }, { p: W2(2.5, DECK + 0.15, 0.6), c: Ft, r: 1.6 },
      { p: W2(PROJ.c.x, PROJ.c.y, PROJ.c.z + 0.6), c: [0.25 * rg.proj, 0.24 * rg.proj, 0.22 * rg.proj], r: 1.0 },
      { p: W2(0, 4.8, 8.5), c: sc3(H, 2.0), r: 6.0 },
    ];
    for (let i = 0; i < NL; i++) { const l = L[i]; if (l) { S.lp[i].copy(l.p); S.lc[i].set(...l.c); S.lr[i] = l.r; } else { S.lp[i].set(0, -999, 0); S.lc[i].set(0, 0, 0); } }
    (S.u.uAU.value as THREE.Vector3).set(...rg.au); (S.u.uAD.value as THREE.Vector3).set(...rg.ad);
    for (const e of this.emMats) (e.m.uniforms.uEm.value as THREE.Vector3).set(...sc3(e.base, rg.em * (1 + 0.4 * pk)));
    this.key.mat.uniforms.uK.value = rg.cone; (this.key.mat.uniforms.uCol.value as THREE.Vector3).set(...sc3(rg.key, 0.08));
    for (const bm of [this.banL, this.banR]) { bm.mat.uniforms.uK.value = rg.banCone; (bm.mat.uniforms.uCol.value as THREE.Vector3).set(...sc3(rg.ban, 0.08)); }
    for (const bm of [this.key, this.banL, this.banR]) bm.mat.uniforms.uT.value = t;
    const mu = this.motes.mat.uniforms;
    (mu.uC0.value as THREE.Vector3).set(...sc3(rg.key, 0.12)); (mu.uC1.value as THREE.Vector3).set(...sc3(rg.ban, 0.06)); (mu.uC2.value as THREE.Vector3).set(0.4 * rg.proj, 0.38 * rg.proj, 0.34 * rg.proj);
    mu.uT.value = t;
    this.ceil.visible = cam.position.y - O.y < 7.4;
  }
}

// ============================================================ Sets (the world calls update(id, t, f, cam))
const DEBUG_CAM = false as boolean; // sets-only framing check (OFF for the real render)
const DEBUG_SUN = null as C3 | null; // test only (null for the real render): sun from the +x end of the street
const DEBUG_VIEW: Record<string, number[]> = { street: [-2, 1.6, 4.5, 40, 3.5, 4.0, 50], stage: [0, 1.8, 10.5, 0, 2.4, -1.5, 50] };
export class Sets {
  root = new THREE.Group();
  private street = new Street();
  private stage = new Stage();
  constructor() { this.root.add(this.street.root, this.stage.root); }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const place = SHOTS[id - 1].place;
    if (DEBUG_CAM && DEBUG_VIEW[place]) {
      const pc = cam as THREE.PerspectiveCamera, o = place === "stage" ? STAGE : STREET, d = DEBUG_VIEW[place];
      pc.position.set(o[0] + d[0], o[1] + d[1], o[2] + d[2]); pc.lookAt(o[0] + d[3], o[1] + d[4], o[2] + d[5]); pc.fov = d[6]; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
    }
    if (DEBUG_SUN) { // test only: re-aim the world's sun (it is placed before this update; the shadow map renders after)
      const sun = this.root.parent?.children.find((c) => (c as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight | undefined;
      if (sun) { sun.position.copy(sun.target.position).addScaledVector(V3(...DEBUG_SUN).normalize(), 500); sunCache.set(id, V3(...DEBUG_SUN).normalize()); }
    }
    this.street.root.visible = place === "street";
    this.stage.root.visible = place === "stage";
    if (this.street.root.visible) this.street.update(id, t, f, cam);
    if (this.stage.root.visible) this.stage.update(id, t, f, cam);
  }
}
