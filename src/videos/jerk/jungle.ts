// OWNER: jungle. The PREHISTORIC JUNGLE at a low golden SUNSET (shot 4, the story TURN). Everything here is new.
//
// A giant ancient tree stands on a mossy jungle PROMONTORY. Its thick, mossy, horizontal BRANCH (where the ancestor ape
// sleeps) reaches out over open ground 6 m below. Beyond the promontory rim the land drops ~30 m into a misty valley
// carpeted with rounded jungle canopies, emergent umbrella trees, layered hazy ridges and, far away, smoking
// VOLCANOES under a blazing sunset (sun halo, golden clouds). Pterosaurs glide across the sky, god rays slant through the
// air, lianas sway, giant ferns / tree ferns / cycads / elephant-ear leaves / horsetails fill the floor.
// The far vista (ridges, volcanoes, clouds, pterosaurs, sun halo) is placed RELATIVE TO THE SHOT'S MEAN VIEW DIRECTION
// (like world.ts's camera-relative sun), so whatever the cam owner does, the volcanoes stand behind the subject.
//
// CONTRACTS (LOCAL to JUNGLE = (3000,0,0), metres; +z = toward the first-pass cameras):
//   BRANCH: moss top surface at (0, 6.0, 0) exactly (JUNGLE_BRANCH, world). It runs along x: top y = branchTopY(x)
//     (~6.0 for x -1.5..1.5, rising toward the trunk at x<-2 and toward the tip at x>3), branch radius ~0.33 at x 0,
//     axis z ~0 there. The top is kept smooth and clear for x -1.1..1.1 (the ape lies there).
//     branchAt(id,t).dy: the branch's small dip + wobble when the ape catches it (W.jolt2), at x = 0 (<= 4 cm).
//   GROUND: groundY(x,z). Exactly y 0 within 1.8 m of the CAT spot (0.4, 0, 1.0); bumps <= 0.4 m elsewhere on the
//     promontory (rim ~13-17 m from (1,0,0)). Nothing taller than 0.08 m within 1.7 m of the cat.
//   FALL COLUMN x -1.6..1.6, z -1.2..1.4, y 0..6 is EMPTY (no vines, moss strands, leaves) so the falling / dangling ape
//     never intersects anything; no vine hangs in x -2..2 for z > -1.5 (nothing between the lens and the ape).
//   TRUNK centre (-3.7, 0, -1.9), radius ~1.25 at y 6 (buttress roots to ~3.5 m at the base), rises out of frame.
//   CAMERA CORRIDOR x -2.5..5.5, z 2.5..14: only ground cover < 0.9 m tall; keep cameras >= 1.6 m above the ground in
//     it. Tested vantages (look at the branch (0,5.8..6,0) unless noted): first-pass (3,7,8) and (1.5,5.6,4);
//     wide hero (2.2,4.2,11) fov 42 -> (0,4.2,0) (ape + 6 m drop + cat + volcano); low worm's-eye (1.6,1.7,5.5) ->
//     (0.2,5.2,0); top-down over the ape (0.9,8.6,3.2) -> (0.3,1.0,0.6) (ape over the cat); side (6.5,6.2,4.5) -> (0,5.6,0).
// Visible only while shot 4 is on screen (root.visible = id === 4; the dissolves render shot 4's own layer).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng, cloudHD, CLOUD_GOLD } from "../bridge/paint";
import { twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { JUNGLE, SHOTS, LOOK_RAMPS, W, camAt, V3 as T3 } from "./story";
import { LOOKS } from "./looks";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const J = (x: number, y: number, z: number): T3 => [JUNGLE[0] + x, JUNGLE[1] + y, JUNGLE[2] + z];
export const JUNGLE_BRANCH = J(0, 6, 0);
export const JUNGLE_CAT = J(0.4, 0, 1.0);
export const JUNGLE_TRUNK = J(-3.7, 0, -1.9);
const CAT = [0.4, 1.0];
const TAU = Math.PI * 2;

// ============================================================ noise + terrain
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const PC = [1, 0]; // promontory centre
/** promontory rim radius around PC (periodic in the angle) */
const rimR = (x: number, z: number) => {
  const a = Math.atan2(z - PC[1], x - PC[0]), c = Math.cos(a), s = Math.sin(a);
  return 14.5 + 2.6 * vn(c * 1.4 + 11, s * 1.4 + 3) + 1.3 * vn(c * 3.1 + 2, s * 3.1 + 7);
};
const catD = (x: number, z: number) => Math.hypot(x - CAT[0], z - CAT[1]);
/** ground height (local) */
export const groundY = (x: number, z: number) => {
  const r = Math.hypot(x - PC[0], z - PC[1]), k = r - rimR(x, z);
  const quiet = sm((catD(x, z) - 1.8) / 3.2);
  let h = (0.3 * vn(x * 0.22 + 2, z * 0.22) + 0.1 * vn(x * 0.7, z * 0.7 + 4)) * quiet;
  h += 0.25 * sm((r - 9) / 5) * quiet; // a soft lip before the rim
  if (k > 0) h -= 31 * sm(k / 14) + 0.07 * Math.max(0, k - 14) + 5 * vn(x * 0.025 + 9, z * 0.025) * sm((k - 10) / 20);
  return h;
};

// ============================================================ geometry helpers
const M = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | [number, number, number] = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), typeof s === "number" ? V(s, s, s) : V(...s));
const tf = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { g.applyMatrix4(m); return g; };
const merge = (l: THREE.BufferGeometry[]) => mergeGeometries(l, false)!;
const C = (h: THREE.ColorRepresentation) => new THREE.Color(h);
const lerpC = (a: string, b: string, t: number) => C(a).lerp(C(b), Math.max(0, Math.min(1, t)));
/** canonical attribute set (position, normal, uv, color), non-indexed; colour fixed or per vertex position */
const clean = (g0: THREE.BufferGeometry, col: THREE.ColorRepresentation | ((p: THREE.Vector3, i: number) => THREE.Color) = "#ffffff", smoothN = true) => {
  if (smoothN && !g0.getAttribute("normal")) g0.computeVertexNormals();
  const s = g0.index ? g0.toNonIndexed() : g0;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  const n = out.getAttribute("position").count;
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  const ca = new Float32Array(n * 3), pa = out.getAttribute("position"), v = V(0, 0, 0), fixed = typeof col === "function" ? null : C(col);
  for (let i = 0; i < n; i++) { const c = fixed ?? (col as (p: THREE.Vector3, i: number) => THREE.Color)(v.fromBufferAttribute(pa, i), i); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
  out.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
  return out;
};
/** triangle soup with per-vertex colours (flat normals) */
class Soup {
  p: number[] = []; c: number[] = [];
  tri(a: THREE.Vector3, b: THREE.Vector3, d: THREE.Vector3, ca: THREE.Color, cb: THREE.Color, cd: THREE.Color) {
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z);
    this.c.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cd.r, cd.g, cd.b);
  }
  geo() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.c, 3));
    g.computeVertexNormals();
    g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((this.p.length / 3) * 2), 2));
    return g;
  }
}
/** tapered tube along points with radius r(u) (smooth); uv u = around, v = along (metres / vTile) */
const tube = (pts: THREE.Vector3[], r: (u: number) => number, seg = 12, rad = 8, vTile = 1, wob = 0, seed = 0) => {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
  const len = curve.getLength();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, c = curve.getPointAt(u);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j, a = (j / rad) * TAU;
      const rr = r(u) * (1 + wob * vn(Math.cos(a) * 1.5 + seed, u * len * 0.9 + Math.sin(a) * 1.5));
      p.setXYZ(k, c.x + n.getX(k) * rr, c.y + n.getY(k) * rr, c.z + n.getZ(k) * rr);
      uv.setXY(k, j / rad, (u * len) / vTile);
    }
  }
  g.computeVertexNormals();
  return g;
};

// ============================================================ painted textures
const barkTex = () => ctex("jgBark", 512, 1024, (g, r) => {
  const W = 512, H = 1024;
  g.fillStyle = "#86603f"; g.fillRect(0, 0, W, H);
  const wrap = (f: (dx: number, dy: number) => void) => { for (const dx of [-W, 0, W]) for (const dy of [-H, 0, H]) f(dx, dy); };
  for (let i = 0; i < 140; i++) { // vertical fissures + ridges
    const x0 = r() * W, y0 = r() * H, len = 120 + r() * 380, w = 2 + r() * 7, dark = r() < 0.62;
    g.strokeStyle = dark ? `rgba(52,32,24,${0.35 + r() * 0.35})` : `rgba(196,150,104,${0.25 + r() * 0.3})`;
    g.lineWidth = dark ? w : w * 0.6; g.lineCap = "round";
    const ph = r() * 6;
    wrap((dx, dy) => { g.beginPath(); for (let k = 0; k <= 12; k++) { const yy = y0 + (len * k) / 12, xx = x0 + 6 * Math.sin(k * 0.8 + ph); if (k) g.lineTo(xx + dx, yy + dy); else g.moveTo(xx + dx, yy + dy); } g.stroke(); });
  }
  for (let i = 0; i < 30; i++) { // lichen + moss patches (vertical streaks)
    const x = r() * W, y = r() * H, rx = 8 + r() * 18, ry = 26 + r() * 60, moss = r() < 0.85;
    wrap((dx, dy) => {
      g.fillStyle = moss ? `rgba(104,150,52,${0.55 + r() * 0.3})` : "rgba(150,140,110,0.4)";
      g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, (r() - 0.5) * 0.3, 0, TAU); g.fill();
      if (moss) { g.fillStyle = "rgba(176,210,92,0.55)"; g.beginPath(); g.ellipse(x + dx - rx * 0.2, y + dy - ry * 0.25, rx * 0.5, ry * 0.4, 0, 0, TAU); g.fill(); }
    });
  }
});
const mossTex = () => ctex("jgMoss", 512, 512, (g, r) => {
  g.fillStyle = "#7fae3e"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, rad = 3 + r() * 11, k = r();
    g.fillStyle = k < 0.45 ? "rgba(70,120,40,0.45)" : k < 0.85 ? "rgba(178,214,90,0.45)" : "rgba(226,236,130,0.5)";
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) { g.beginPath(); g.arc(x + dx, y + dy, rad, 0, TAU); g.fill(); }
  }
});
const groundTex = () => ctex("jgGround", 1024, 1024, (g, r) => {
  g.fillStyle = "#8a7048"; g.fillRect(0, 0, 1024, 1024);
  const wrap = (x: number, y: number, rr: number, f: (x: number, y: number) => void) => { for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) { const a = x + dx, b = y + dy; if (a > -rr && a < 1024 + rr && b > -rr && b < 1024 + rr) f(a, b); } };
  for (let i = 0; i < 70; i++) { // moss carpets
    const x = r() * 1024, y = r() * 1024, rx = 40 + r() * 120, ry = 30 + r() * 90, a = r() * 3;
    wrap(x, y, rx, (a2, b2) => { g.fillStyle = "rgba(112,150,58,0.55)"; g.beginPath(); g.ellipse(a2, b2, rx, ry, a, 0, TAU); g.fill(); });
  }
  const leafCols = ["#b86a34", "#9a5a30", "#d08a44", "#c4a052", "#7a8a3a", "#a04a2a", "#e0b060"];
  for (let i = 0; i < 1500; i++) { // leaf litter: little pointed leaves with a midrib
    const x = r() * 1024, y = r() * 1024, L = 7 + r() * 15, a = r() * TAU, col = leafCols[Math.floor(r() * leafCols.length)];
    wrap(x, y, L, (a2, b2) => {
      g.save(); g.translate(a2, b2); g.rotate(a);
      g.fillStyle = "rgba(50,34,22,0.35)"; g.beginPath(); g.ellipse(1.5, 2, L, L * 0.42, 0, 0, TAU); g.fill();
      g.fillStyle = col; g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.5, L, 0); g.quadraticCurveTo(0, L * 0.5, -L, 0); g.fill();
      g.strokeStyle = "rgba(60,36,20,0.55)"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L, 0); g.stroke();
      g.restore();
    });
  }
  for (let i = 0; i < 90; i++) { // twigs
    const x = r() * 1024, y = r() * 1024, L = 14 + r() * 30, a = r() * TAU;
    wrap(x, y, L, (a2, b2) => { g.strokeStyle = "rgba(70,46,30,0.75)"; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(a2, b2); g.lineTo(a2 + Math.cos(a) * L, b2 + Math.sin(a) * L); g.stroke(); });
  }
});
/** canopy paint for the round lobes (256 around x 128 pole to pole): sunny crown, cooler belly, leaf-shaped dabs */
const lobeTex = () => ctex("jgLobe", 512, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#d8f0a0"); gr.addColorStop(0.45, "#ffffff"); gr.addColorStop(1, "#b8c8c0");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 420; i++) {
    const x = r() * 512, y = 8 + r() * 240, L = 7 + r() * 10, a = -0.6 + r() * 1.2 + (r() < 0.5 ? Math.PI : 0), light = y < 120 ? r() < 0.6 : r() < 0.2;
    for (const dx of [-512, 0, 512]) {
      g.save(); g.translate(x + dx, y); g.rotate(a);
      g.fillStyle = light ? "rgba(255,255,200,0.28)" : "rgba(10,50,40,0.18)";
      g.beginPath(); g.moveTo(-L, 0); g.quadraticCurveTo(0, -L * 0.55, L, 0); g.quadraticCurveTo(0, L * 0.55, -L, 0); g.fill();
      g.restore();
    }
  }
});
const softTex = (key: string, stops: [number, string][]) => ctex(key, 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const mistTex = () => ctex("jgMist", 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 26; i++) {
    const x = 90 + r() * 332, y = 110 + r() * 50, rx = 60 + r() * 90, ry = 26 + r() * 28;
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
  }
});
/** volcano smoke puff: a rounded cumulus ball, light top, darker belly (tinted per look) */
const puffTex = () => ctex("jgPuff", 256, 256, (g, r) => {
  g.clearRect(0, 0, 256, 256);
  const lobes: [number, number, number][] = [[128, 140, 70]];
  for (let i = 0; i < 7; i++) { const a = r() * TAU, d = 30 + r() * 30; lobes.push([128 + Math.cos(a) * d, 136 + Math.sin(a) * d * 0.7, 34 + r() * 26]); }
  for (const [x, y, rr] of lobes) {
    const gr = g.createRadialGradient(x - rr * 0.3, y - rr * 0.35, rr * 0.1, x, y, rr);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.7, "rgba(200,200,214,1)"); gr.addColorStop(1, "rgba(160,160,184,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
});

// ============================================================ materials (two-tone world lighting)
const matCache = new Map<string, THREE.Material>();
const tmat = (key: string, p: THREE.MeshLambertMaterialParameters) => {
  let m = matCache.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(p)); matCache.set(key, m); }
  return m;
};

// ============================================================ plants (local, base at origin, +y up)
/** a serrated fern frond: a ribbon along an arching rachis (tilt th0 -> th1 from vertical toward +z), V-folded,
 *  alternating edge widths make the teeth; one clean inked silhouette instead of a mush of tiny leaflets */
const frond = (len: number, w: number, th0: number, th1: number, n: number, serr: number, cBase: string, cTip: string, fold = 0.24, soup = new Soup()) => {
  const P: THREE.Vector3[] = [], D: THREE.Vector3[] = [];
  let y = 0, z = 0;
  for (let i = 0; i <= n; i++) {
    const u = i / n, th = th0 + (th1 - th0) * Math.pow(u, 1.5);
    P.push(V(0, y, z)); D.push(V(0, Math.cos(th), Math.sin(th)));
    y += (Math.cos(th) * len) / n; z += (Math.sin(th) * len) / n;
  }
  const side = V(1, 0, 0), cb = C(cBase), ct = C(cTip);
  const Ls: THREE.Vector3[] = [], Cs: THREE.Vector3[] = [], Rs: THREE.Vector3[] = [], cols: THREE.Color[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, nrm = V(0, 0, 0).crossVectors(D[i], side).normalize();
    const hw = i === n ? 0 : w * Math.pow(Math.sin(Math.PI * (0.08 + 0.92 * u)), 0.7) * (1 - 0.3 * u) * (i % 2 ? 1 : 1 - serr) * (i === 0 ? 0.3 : 1);
    Cs.push(P[i].clone().addScaledVector(nrm, hw * fold * 0.5));
    Ls.push(P[i].clone().addScaledVector(side, -hw).addScaledVector(nrm, -hw * fold * 0.5).addScaledVector(D[i], hw * 0.25));
    Rs.push(P[i].clone().addScaledVector(side, hw).addScaledVector(nrm, -hw * fold * 0.5).addScaledVector(D[i], hw * 0.25));
    cols.push(cb.clone().lerp(ct, Math.pow(u, 0.8)));
  }
  for (let i = 0; i < n; i++) {
    const c0 = cols[i], c1 = cols[i + 1], e0 = c0.clone().multiplyScalar(0.82), e1 = c1.clone().multiplyScalar(0.82), m0 = c0.clone().multiplyScalar(1.12), m1 = c1.clone().multiplyScalar(1.12);
    soup.tri(Ls[i], Cs[i + 1], Cs[i], e0, m1, m0); soup.tri(Ls[i], Ls[i + 1], Cs[i + 1], e0, e1, m1);
    soup.tri(Cs[i], Cs[i + 1], Rs[i + 1], m0, m1, e1); soup.tri(Cs[i], Rs[i + 1], Rs[i], m0, e1, e0);
  }
  return soup;
};
const soupGeo = (s: Soup, m?: THREE.Matrix4) => { const g = s.geo(); if (m) g.applyMatrix4(m); return g; };
const fernPlant = (seed: number, h: number, pal: [string, string]) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  const nF = 9 + Math.floor(r() * 4);
  for (let f = 0; f < nF; f++) {
    const yaw = (f / nF) * TAU + r() * 0.4, len = h * (0.75 + 0.4 * r());
    L.push(soupGeo(frond(len, len * 0.15, 0.2 + 0.4 * r(), 1.7 + 0.6 * r(), 26, 0.45, pal[0], pal[1]), M(0, 0, 0, yaw)));
  }
  for (let k = 0; k < 2; k++) { // fiddleheads
    const a = r() * TAU, pts = [V(0, 0, 0), V(0.02, 0.25, 0.03), V(0.08, 0.42, 0.04), V(0.13, 0.42, 0.02), V(0.11, 0.36, 0.0)];
    L.push(tf(clean(tube(pts, (u) => 0.022 * (1 - 0.4 * u), 10, 5), pal[0]), M(0, 0, 0, a)));
  }
  return merge(L);
};
const bigLeaf = (len: number, w: number, droop: number, cA: string, cB: string, vein: string, soup: Soup) => {
  const nu = 12, ns = 6, S: THREE.Vector3[] = [], T: THREE.Vector3[] = [];
  let y = 0, z = 0;
  for (let i = 0; i <= nu; i++) { const u = i / nu, a = -0.15 + droop * u * u; S.push(V(0, y, z)); T.push(V(0, Math.sin(-a), Math.cos(a))); y -= (Math.sin(a) * len) / nu; z += (Math.cos(a) * len) / nu; }
  const grid: THREE.Vector3[][] = [], cg: THREE.Color[][] = [];
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, wid = i === nu ? 0 : w * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * u)), 0.75) * (1 + 0.5 * Math.pow(1 - u, 3));
    const nrm = V(0, 0, 0).crossVectors(T[i], V(1, 0, 0)).normalize(), row: THREE.Vector3[] = [], cr: THREE.Color[] = [];
    for (let j = -ns; j <= ns; j++) {
      const s = j / ns;
      row.push(S[i].clone().addScaledVector(V(1, 0, 0), s * wid).addScaledVector(nrm, -s * s * wid * 0.32).addScaledVector(T[i], -(1 - u) * Math.abs(s) * wid * 0.25));
      cr.push(j === 0 ? C(vein) : lerpC(cA, cB, 0.25 + 0.6 * u + 0.15 * Math.abs(s)));
    }
    grid.push(row); cg.push(cr);
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < 2 * ns; j++) {
    const a = grid[i][j], b = grid[i][j + 1], c = grid[i + 1][j + 1], d = grid[i + 1][j];
    soup.tri(a, c, b, cg[i][j], cg[i + 1][j + 1], cg[i][j + 1]); soup.tri(a, d, c, cg[i][j], cg[i + 1][j], cg[i + 1][j + 1]);
  }
  return soup;
};
/** elephant-ear plant: 4-6 huge drooping heart leaves on petioles */
const earPlant = (seed: number, h: number, red: boolean) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [], n = 4 + Math.floor(r() * 3);
  const pet = red ? "#8a4a3a" : "#5e8a36", cA = red ? "#2f6a3a" : "#2f7a34", cB = red ? "#4e9a4a" : "#6cb24a", vein = red ? "#d0584a" : "#b4dc78";
  for (let k = 0; k < n; k++) {
    const yaw = (k / n) * TAU + r() * 0.6, ph = h * (0.55 + 0.45 * r()), lean = 0.25 + 0.3 * r();
    const top = V(0, ph, lean * ph * 0.6);
    L.push(tf(clean(tube([V(0, 0, 0), V(0, ph * 0.5, lean * ph * 0.15), top], (u) => 0.035 * (1 - 0.4 * u), 8, 5), pet), M(0, 0, 0, yaw)));
    const s = new Soup();
    bigLeaf(h * (0.55 + 0.25 * r()), h * (0.24 + 0.08 * r()), 0.9 + 0.5 * r(), cA, cB, vein, s);
    L.push(soupGeo(s, M(top.x, top.y, top.z, 0, 0, 0).premultiply(M(0, 0, 0, yaw))));
  }
  return merge(L);
};
const cycad = (seed: number, h: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [], th = h * 0.35;
  L.push(clean(tube([V(0, -0.1, 0), V(0, th * 0.5, 0), V(0, th, 0)], (u) => 0.26 * (1 - 0.25 * u), 6, 10, 1, 0.12, seed), (p) => (Math.floor(p.y * 9) % 2 ? C("#7a5a3a") : C("#94704a"))));
  const n = 14;
  for (let k = 0; k < n; k++) {
    const yaw = (k / n) * TAU + r() * 0.3, len = h * (0.6 + 0.25 * r());
    L.push(soupGeo(frond(len, 0.14, 0.45 + 0.35 * r(), 1.5 + 0.4 * r(), 22, 0.85, "#3e6e2c", "#9cc458", 0.3), M(0, th, 0, yaw)));
  }
  return merge(L);
};
const treeFern = (seed: number, h: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [], lean = V((r() - 0.5) * 0.5, h, (r() - 0.5) * 0.5);
  L.push(clean(tube([V(0, -0.1, 0), V(lean.x * 0.3, h * 0.5, lean.z * 0.2), lean], (u) => 0.19 * (1 - 0.3 * u), 10, 8, 1, 0.15, seed), (p) => lerpC("#4a3020", "#6a4a2c", 0.5 + 0.5 * vn(p.y * 4, seed))));
  L.push(clean(new THREE.SphereGeometry(0.2, 10, 8).translate(lean.x, h, lean.z), "#5a3c22"));
  const n = 11;
  for (let k = 0; k < n; k++) {
    const yaw = (k / n) * TAU + r() * 0.3, len = 2.0 + 0.9 * r();
    L.push(soupGeo(frond(len, len * 0.17, 0.35 + 0.5 * r(), 2.1 + 0.4 * r(), 30, 0.4, "#2f6e30", "#a4d45a"), M(lean.x, h, lean.z, yaw)));
  }
  return merge(L);
};
const horsetails = (seed: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const x = (r() - 0.5) * 0.5, z = (r() - 0.5) * 0.5, h = 0.9 + 0.9 * r(), lx = (r() - 0.5) * 0.15;
    L.push(clean(tube([V(x, -0.05, z), V(x + lx * 0.5, h * 0.5, z), V(x + lx, h, z)], () => 0.028, 8, 6), (p) => ((p.y + 0.05 + 10) % 0.24 < 0.035 ? C("#3a4a24") : C("#8cb84e"))));
    L.push(clean(new THREE.ConeGeometry(0.04, 0.14, 8).translate(x + lx, h + 0.06, z), "#a06a3a"));
  }
  return merge(L);
};
const rockGeo = (s: number, seed: number, mossy: boolean, cols = ["#a8927a", "#9a8a7a", "#b8a488", "#8e8676"]) => {
  const rr = rng(seed), g = new THREE.IcosahedronGeometry(1, s > 0.6 ? 3 : 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const k = 1 + 0.18 * vn(p.getX(i) * 2 + seed, p.getZ(i) * 2 + p.getY(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals();
  const col = cols[Math.floor(rr() * cols.length)];
  return clean(tf(g, M(0, 0, 0, rr() * 6, 0, 0, [s * (1 + 0.3 * rr()), s * (0.6 + 0.2 * rr()), s])), (q) => (mossy && q.y > s * 0.15 ? lerpC(col, "#7fae3e", 0.75) : C(col)));
};
const mushrooms = (seed: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 4; k++) {
    const x = (r() - 0.5) * 0.4, z = (r() - 0.5) * 0.4, h = 0.08 + 0.12 * r(), cr = 0.06 + 0.06 * r();
    L.push(clean(new THREE.CylinderGeometry(cr * 0.25, cr * 0.32, h, 8).translate(x, h / 2, z), "#f4e6c8"));
    L.push(clean(new THREE.SphereGeometry(cr, 12, 6, 0, TAU, 0, Math.PI / 2).scale(1, 0.7, 1).translate(x, h - 0.01, z), (p) => (p.y > h + cr * 0.45 ? C("#ff8a3a") : C("#e8562a"))));
  }
  return merge(L);
};
/** a 'prehistoric magnolia' shrub: leafy lobes + cream-pink cup blossoms */
const magnolia = (seed: number, h: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  const lobes: THREE.Vector3[] = [V(0, h * 0.5, 0)];
  for (let k = 0; k < 4; k++) { const a = r() * TAU; lobes.push(V(Math.cos(a) * h * 0.35, h * (0.35 + 0.25 * r()), Math.sin(a) * h * 0.35)); }
  for (const c of lobes) L.push(clean(new THREE.SphereGeometry(h * (0.3 + 0.08 * r()), 16, 10).translate(c.x, c.y, c.z), (p) => lerpC("#2e6a34", "#5e9a42", (p.y - c.y) / h + 0.5)));
  for (let k = 0; k < 7; k++) {
    const c = lobes[k % lobes.length], a = r() * TAU, e = 0.2 + r() * 0.9, rad = h * 0.36;
    const pos = V(c.x + Math.cos(a) * Math.cos(e) * rad, c.y + Math.sin(e) * rad, c.z + Math.sin(a) * Math.cos(e) * rad);
    const B: THREE.BufferGeometry[] = [];
    for (let q = 0; q < 6; q++) B.push(clean(new THREE.SphereGeometry(1, 8, 6).scale(0.05, 0.02, 0.12).translate(0, 0, 0.09).rotateX(-0.75).rotateY((q / 6) * TAU + (q > 2 ? 0.5 : 0)), (p) => lerpC("#fff2ea", "#ff7aa8", 0.3 + p.y * 6)));
    B.push(clean(new THREE.SphereGeometry(0.035, 8, 6), "#ffd24a"));
    L.push(tf(merge(B), M(pos.x, pos.y, pos.z, r() * 6, -0.3 + r() * 0.3, 0, 1.6)));
  }
  return merge(L);
};

// ============================================================ the giant tree
const TRUNK = V(-3.7, 0, -1.9);
const trunkGeo = (base: THREE.Vector3, H: number, R0: number, seed: number) => {
  const NY = 80, NA = 72, r = rng(seed), but: number[] = [];
  for (let k = 0; k < 7; k++) but.push((k / 7) * TAU + (r() - 0.5) * 0.5);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NY; j++) {
    const y = -1 + (H + 1) * Math.pow(j / NY, 1.35);
    const cx = base.x + 0.35 * Math.sin(y * 0.11 + seed), cz = base.z + 0.28 * Math.sin(y * 0.08 + seed * 2);
    const R = R0 * (1 - (0.4 * Math.max(0, y)) / H), flare = 1.5 * Math.exp(-Math.max(0, y) / 1.5);
    for (let i = 0; i <= NA; i++) {
      const a = (i / NA) * TAU;
      let fin = 0;
      for (const b of but) { const d = Math.atan2(Math.sin(a - b), Math.cos(a - b)); fin += Math.exp(-(d * d) / 0.09); }
      const rr = R * (1 + flare * (0.25 + 1.1 * fin)) * (1 + 0.06 * Math.sin(9 * a + y * 0.35) + 0.05 * vn(Math.cos(a) * 2 + seed, y * 0.45 + Math.sin(a) * 2));
      pos.push(cx + Math.cos(a) * rr, base.y + y, cz + Math.sin(a) * rr);
      uv.push((i / NA) * 3, y / 4);
    }
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) {
    const a = j * (NA + 1) + i, b = a + 1, c = a + NA + 2, d = a + NA + 1;
    idx.push(a, d, c, a, c, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return clean(g, (p) => lerpC("#ffffff", "#c8e09a", sm((1.2 - p.y) / 1.2) * 0.6));
};
// the branch axis (before the vertical fit): from inside the trunk out over the clearing
const BR_PTS = [V(-3.2, 7.25, -1.6), V(-2.2, 6.3, -0.75), V(-1.0, 5.86, -0.18), V(0, 5.74, 0), V(1.3, 5.76, 0.1), V(2.6, 5.95, 0.05), V(3.8, 6.3, -0.2), V(4.9, 6.85, -0.55)];
const BR_R = (u: number) => 0.13 + 0.55 * Math.pow(1 - u, 1.5);
const MOSS_T = (u: number, phi: number, x: number) => {
  const top = Math.max(0, Math.cos(phi * 1.15));
  const clear = Math.abs(x) < 1.2 ? 0.25 : 1; // smooth where the ape lies
  return -0.02 + (0.085 + 0.05 * clear * vn(u * 22, phi * 3)) * Math.pow(top, 0.5) + 0.06 * clear * Math.max(0, vn(u * 9 + 3, phi * 2)) * top;
};
const branchCurve = new THREE.CatmullRomCurve3(BR_PTS);
const BR_LEN = branchCurve.getLength();
/** the curve parameter where the axis crosses local x */
const uAtX = (x: number) => { let lo = 0, hi = 1; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (branchCurve.getPointAt(m).x < x) lo = m; else hi = m; } return (lo + hi) / 2; };
const BR_DY = (() => { const u = uAtX(0); return 6.0 - (branchCurve.getPointAt(u).y + BR_R(u) + MOSS_T(u, 0, 0)); })();
/** world y of the branch's mossy top at local x (-2.5 .. 4.5), at rest */
export const branchTopY = (x: number) => { const u = uAtX(x); return JUNGLE[1] + branchCurve.getPointAt(u).y + BR_DY + BR_R(u) + MOSS_T(u, 0, x); };
const BR_PIVOT = V(-3.0, 6.9 + BR_DY, -1.5);
/** the branch dips and wobbles when the ape catches it (dy at x = 0, metres) */
export const branchAt = (id: number, t: number) => {
  if (id !== 4) return { dy: 0, rot: 0 };
  const d = t - (W.jolt2 - 0.02);
  if (d < 0) return { dy: 0, rot: 0 };
  const k = Math.min(1, d / 0.05);
  const rot = -(0.0095 * Math.exp(-d * 2.6) * Math.cos(d * 13) * k + 0.003 * Math.min(1, d / 0.3));
  return { dy: rot * 3.0, rot };
};
const branchGeo = () => {
  const seg = 70, rad = 22, L: THREE.BufferGeometry[] = [];
  const pts = BR_PTS.map((p) => p.clone().setY(p.y + BR_DY));
  const bark = tube(pts, BR_R, seg, rad, 4, 0.05, 3);
  const moss: number[] = [], muv: number[] = [], idx: number[] = [];
  const curve = new THREE.CatmullRomCurve3(pts), NPh = 16, U0 = 0.08;
  for (let i = 0; i <= seg; i++) {
    const u = U0 + ((1 - U0 - 0.03) * i) / seg, c = curve.getPointAt(u), T = curve.getTangentAt(u);
    const up = V(0, 1, 0).addScaledVector(T, -T.y).normalize(), S = V(0, 0, 0).crossVectors(T, up).normalize();
    for (let j = 0; j <= NPh; j++) {
      const phi = -1.3 + (2.6 * j) / NPh, rr = BR_R(u) + MOSS_T(u, phi, c.x);
      const d = up.clone().multiplyScalar(Math.cos(phi)).addScaledVector(S, Math.sin(phi));
      moss.push(c.x + d.x * rr, c.y + d.y * rr, c.z + d.z * rr);
      muv.push(j / NPh, (u * BR_LEN) / 1.2);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < NPh; j++) { const a = i * (NPh + 1) + j, b = a + 1, c = a + NPh + 2, d = a + NPh + 1; idx.push(a, b, c, a, c, d); }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute("position", new THREE.Float32BufferAttribute(moss, 3)); mg.setAttribute("uv", new THREE.Float32BufferAttribute(muv, 2));
  mg.setIndex(idx); mg.computeVertexNormals();
  L.push(clean(bark, "#ffffff"));
  return { bark: L, moss: clean(mg, "#ffffff"), curve };
};

// ============================================================ shaders: god rays, motes, far vista
const raysMesh = (n: number, seed: number) => {
  const r = rng(seed), q = new THREE.PlaneGeometry(1, 1, 1, 10);
  const g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const T = new Float32Array(n * 3), S = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    T.set([-7 + r() * 15, 3 + r() * 9, -9 + r() * 11], i * 3);
    S.set([0.25 + 0.9 * r() * r(), r(), 14 + 14 * r(), r()], i * 4);
  }
  g.setAttribute("iC", new THREE.InstancedBufferAttribute(T, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(S, 4));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uDir: { value: V(0, -1, 0) }, uCol: { value: V(1, 1, 1) }, uK: { value: 1 } },
    vertexShader: /* glsl */ `attribute vec3 iC; attribute vec4 iS; uniform float uT; uniform vec3 uDir;
      varying vec2 vQ; varying float vA; varying float vSeed;
      void main(){
        float along = position.y;                       // -0.5 .. 0.5
        vec3 c = (modelMatrix * vec4(iC, 1.0)).xyz + vec3(sin(uT * 0.13 + iS.y * 6.28), 0.0, cos(uT * 0.11 + iS.y * 4.0)) * 0.25;
        vec3 p = c + uDir * iS.z * along;
        vec3 view = normalize(cameraPosition - p);
        vec3 side = normalize(cross(uDir, view));
        float w = iS.x * (0.7 + 0.6 * (along + 0.5));
        p += side * position.x * w * 2.0;
        float dist = length(cameraPosition - p);
        vQ = vec2(position.x * 2.0, along + 0.5); vSeed = iS.y;
        float flick = 0.6 + 0.4 * sin(uT * (0.35 + 0.4 * iS.w) + iS.y * 40.0);
        float face = 1.0 - 0.7 * abs(dot(view, uDir));
        vA = flick * face * smoothstep(2.0, 6.0, dist);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uK; uniform float uT; varying vec2 vQ; varying float vA; varying float vSeed;
      void main(){
        float x = vQ.x, u = vQ.y;
        float core = exp(-x * x * 3.0);
        float streak = 0.7 + 0.3 * sin(x * 6.0 + vSeed * 20.0 + sin(u * 3.0 + uT * 0.2));
        float a = core * streak * smoothstep(0.0, 0.3, u) * (1.0 - smoothstep(0.55, 1.0, u)) * vA * uK;
        gl_FragColor = vec4(uCol * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 6;
  return m;
};
const motesMesh = (n: number, seed: number) => {
  const r = rng(seed), q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const A = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) A.set([-6 + r() * 13, 0.4 + r() * 10, -5 + r() * 12, r()], i * 4);
  g.setAttribute("iA", new THREE.InstancedBufferAttribute(A, 4));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCol: { value: V(1, 1, 1) } },
    vertexShader: /* glsl */ `attribute vec4 iA; uniform float uT; varying vec2 vQ; varying float vA;
      void main(){
        float ph = iA.w * 6.2832;
        vec3 p = (modelMatrix * vec4(iA.xyz, 1.0)).xyz + vec3(sin(uT * 0.21 + ph) * 0.3 + uT * 0.04, sin(uT * 0.17 + ph * 2.0) * 0.2, cos(uT * 0.19 + ph * 1.3) * 0.3);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float dist = length(cameraPosition - p);
        float s = (0.012 + 0.012 * iA.w) * max(1.0, dist * 0.12);
        vQ = position.xy * 2.0;
        vA = (0.45 + 0.55 * sin(uT * (0.8 + iA.w * 2.0) + ph * 5.0)) * smoothstep(0.8, 2.0, dist) / max(1.0, dist * 0.12);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x + up * position.y) * s, 1.0); }`,
    fragmentShader: "uniform vec3 uCol; varying vec2 vQ; varying float vA; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(uCol * a * vA, 1.0); }",
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 6;
  return m;
};
/** flat painted silhouettes (ridges): colour per vertex attribute k (0 top .. 1 bottom), aerial haze glow toward the sun */
const ridgeMat = () => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSun: { value: V(0, 0, -1) }, uMist: { value: 0.8 } },
  vertexShader: "attribute float k; varying float vK; varying vec3 vW; void main(){ vK = k; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }",
  fragmentShader: /* glsl */ `uniform vec3 uCol; uniform vec3 uFog; uniform vec3 uGlow; uniform vec3 uSun; uniform float uMist; varying float vK; varying vec3 vW;
    void main(){
      vec3 d = normalize(vec3(vW.x - cameraPosition.x, 0.0, vW.z - cameraPosition.z));
      float toSun = max(0.0, dot(d, normalize(vec3(uSun.x, 0.0, uSun.z))));
      vec3 c = mix(uCol, uGlow, pow(toSun, 6.0) * 0.55);
      c = mix(c, uFog, smoothstep(0.0, 1.0, vK) * uMist);
      gl_FragColor = vec4(c, 1.0); }`,
  fog: false,
});
const volcanoMat = () => new THREE.ShaderMaterial({
  uniforms: { uSun: { value: V(0, 0.2, -1) }, uFog: { value: new THREE.Color() }, uHaze: { value: 0.5 }, uLit: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uT: { value: 0 }, uLava: { value: 1 } },
  vertexShader: "attribute float k; varying float vK; varying vec3 vN; varying vec3 vL; void main(){ vK = k; vL = position; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: /* glsl */ `uniform vec3 uSun; uniform vec3 uFog; uniform float uHaze; uniform vec3 uLit; uniform vec3 uShade; uniform float uT; uniform float uLava; varying float vK; varying vec3 vN; varying vec3 vL;
    void main(){
      float ndl = dot(normalize(vN), normalize(uSun));
      vec3 c = mix(uShade, uLit, smoothstep(-0.05, 0.25, ndl));
      float a = atan(vL.z, vL.x);
      float gully = sin(a * 11.0 + sin(a * 3.0) * 1.6 + vK * 2.0);
      c *= 0.9 + 0.1 * gully;
      c = mix(c, uFog, uHaze * (1.0 - 0.35 * vK));
      float riv = sin(a * 4.0 + 1.3 + sin(vK * 7.0 + a * 2.0) * 0.5);
      float w = fwidth(riv) * 1.5;
      float lava = smoothstep(0.975 - w, 0.99, riv) * smoothstep(0.58, 0.85, vK) * (0.75 + 0.25 * sin(uT * 2.0 + a * 7.0 - vK * 20.0));
      float rim = smoothstep(0.95, 0.99, vK);
      c = mix(c, vec3(2.4, 0.55, 0.08), clamp(lava + rim, 0.0, 1.0) * uLava);
      gl_FragColor = vec4(c, 1.0); }`,
  fog: false,
});

// ============================================================ pterosaurs
type Ptero = { g: THREE.Group; wl: THREE.Group; wr: THREE.Group; p0: THREE.Vector3; v: THREE.Vector3; ph: number; flap: number; mat: THREE.MeshBasicMaterial; d: number };
const pteroParts = () => {
  const body = new THREE.SphereGeometry(1, 12, 8).scale(0.22, 0.2, 0.85);
  const beak = new THREE.ConeGeometry(0.1, 1.1, 8).rotateX(Math.PI / 2).translate(0, 0.05, 1.35);
  const head = new THREE.SphereGeometry(0.17, 10, 8).translate(0, 0.08, 0.85);
  const cs = new THREE.Shape(); cs.moveTo(0, 0); cs.lineTo(-0.9, 0.42); cs.lineTo(-0.15, 0.12); cs.lineTo(0, 0);
  const crest = new THREE.ShapeGeometry(cs).rotateY(-Math.PI / 2).translate(0, 0.12, 0.85);
  const tail = new THREE.ConeGeometry(0.05, 0.5, 6).rotateX(-Math.PI / 2).translate(0, 0, -0.95);
  const ws = new THREE.Shape(); // right wing in its own XZ plane (x outward, z forward)
  ws.moveTo(0.1, 0.35); ws.quadraticCurveTo(1.0, 0.55, 1.7, 0.42); ws.lineTo(3.6, -0.25); ws.quadraticCurveTo(2.2, -0.15, 1.5, -0.45); ws.quadraticCurveTo(0.7, -0.75, 0.1, -0.45);
  const wing = new THREE.ShapeGeometry(ws, 10).rotateX(Math.PI / 2);
  return { core: mergeGeometries([body, beak, head, crest, tail].map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute("uv"); return g; }), false)!, wing };
};

// ============================================================ the Jungle
type Inst = { x: number; y: number; z: number; yaw: number; s: number; ph: number; amp: number };
type Sway = { mesh: THREE.InstancedMesh; inst: Inst[] };
type Vine = { g: THREE.Group; ph: number; amp: number };
type Puff = { s: THREE.Sprite; ph: number; sp: number; dx: number; base: number };
type Mist = { s: THREE.Mesh; x: number; y: number; z: number; w: number; ph: number; sp: number; o: number };

export class Jungle {
  root = new THREE.Group();
  private vista = new THREE.Group();       // view-relative far world (rotated to the shot's mean view direction)
  private branch = new THREE.Group();
  private sway: Sway[] = []; private vines: Vine[] = [];
  private rays: THREE.Mesh; private motes: THREE.Mesh;
  private ridges: { m: THREE.Mesh; base: string; f: number }[] = [];
  private volc: THREE.ShaderMaterial; private puffs: Puff[] = []; private mists: Mist[] = [];
  private halo: THREE.Sprite; private halo2: THREE.Sprite; private clouds: THREE.Sprite[] = [];
  private pteros: Ptero[] = [];
  private leaves: THREE.InstancedMesh; private leafP: number[][] = [];
  private sunDir: THREE.Vector3 | null = null; private fwd = V(0, 0, -1);
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private vs = V(1, 1, 1); private vp = V(0, 0, 0);
  private fogC = new THREE.Color(); private tmpC = new THREE.Color();

  constructor() {
    const R = this.root;
    R.position.set(...JUNGLE);
    R.visible = false;
    const r = rng(9157);
    // SUN LANES: the shot's camera-relative sun is known now (camAt is pure), so nothing tall stands between the sun and
    // the cat, the sleeping ape and the dangling ape (cards receive the sun shadow: they must read in golden light)
    const sun = this.sun(), sh = V(sun.x, 0, sun.z).normalize(), tanEl = sun.y / Math.max(0.05, Math.hypot(sun.x, sun.z));
    const shades = (x: number, z: number, rad: number, top: number) => {
      for (const [ox, oz, oy] of [[CAT[0], CAT[1], 0.7], [0, 0, 5.6], [0.3, 0.2, 4.3]]) {
        const dx = x - ox, dz = z - oz, k = dx * sh.x + dz * sh.z;
        if (k <= 0) continue;
        if (Math.abs(dx * sh.z - dz * sh.x) < rad + 1.4 && top > oy + k * tanEl) return true;
      }
      return false;
    };
    this.shades = shades;
    const plantMat = tmat("jgPlant", { vertexColors: true, side: THREE.DoubleSide });
    const solidMat = tmat("jgSolid", { vertexColors: true });
    const bt = barkTex();
    const barkMat = tmat("jgBark", { map: bt, vertexColors: true });
    const mossMat = tmat("jgMoss", { map: mossTex(), vertexColors: true });
    const gtex = groundTex();
    const groundMat = tmat("jgGround", { map: gtex, vertexColors: true });
    const lobeMat = tmat("jgLobe", { map: lobeTex() });
    const bake = (list: THREE.BufferGeometry[], mat: THREE.Material, cast = true, parent: THREE.Object3D = R) => {
      if (!list.length) return null;
      const m = new THREE.Mesh(merge(list), mat); m.castShadow = cast; m.receiveShadow = true; m.frustumCulled = false; m.matrixAutoUpdate = false; parent.add(m); return m;
    };

    // ---------------- ground: polar grid around the promontory centre, dense near the action ----------------
    {
      const NR = 92, NA = 176, pos: number[] = [], uv: number[] = [], col: number[] = [], idx: number[] = [];
      const cMoss = C("#a8c870"), cSoil = C("#e0c8a0"), cRock = C("#b89878"), cDeep = C("#4a6a3a"), c = new THREE.Color();
      for (let i = 0; i <= NR; i++) {
        const rr = 330 * Math.pow(i / NR, 2.15);
        for (let j = 0; j <= NA; j++) {
          const a = (j / NA) * TAU, x = PC[0] + Math.cos(a) * rr, z = PC[1] + Math.sin(a) * rr, y = groundY(x, z);
          pos.push(x, y, z); uv.push(x / 2.6, z / 2.6);
          const k = rr - rimR(x, z), n = vn(x * 0.3 + 5, z * 0.3);
          c.copy(cSoil).lerp(cMoss, sm(0.55 + n * 0.9)).lerp(cRock, sm(k / 2) * (1 - sm((k - 12) / 6))).lerp(cDeep, sm((k - 10) / 8));
          col.push(c.r, c.g, c.b);
        }
      }
      for (let i = 0; i < NR; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + 1, cc = a + NA + 2, d = a + NA + 1; idx.push(a, cc, d, a, b, cc); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, groundMat); m.receiveShadow = true; m.castShadow = false; m.frustumCulled = false; R.add(m);
    }

    // ---------------- the giant tree ----------------
    const BK: THREE.BufferGeometry[] = [], MS: THREE.BufferGeometry[] = [], SP: THREE.BufferGeometry[] = [], SS: THREE.BufferGeometry[] = [];
    BK.push(trunkGeo(TRUNK, 24, 1.25, 1.7));
    // surface roots snaking out from the buttresses (half buried)
    const rootAng = [0.15, 0.9, 1.7, 2.5, 3.3, 4.2, 5.0, 5.8];
    rootAng.forEach((a, i) => {
      const toCat = Math.atan2(CAT[1] - TRUNK.z, CAT[0] - TRUNK.x), dA = Math.abs(Math.atan2(Math.sin(a - toCat), Math.cos(a - toCat)));
      const len = (dA < 0.5 ? 1.9 : 3.2 + 2.2 * r()), pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 5; k++) {
        const u = k / 5, d = 0.9 + len * u, aa = a + 0.25 * Math.sin(u * 3 + i);
        const x = TRUNK.x + Math.cos(aa) * d, z = TRUNK.z + Math.sin(aa) * d;
        pts.push(V(x, groundY(x, z) + 0.55 * (1 - u) * (1 - u) + 0.02, z));
      }
      BK.push(clean(tube(pts, (u) => 0.42 * (1 - u) * (1 - u * 0.3) + 0.05, 24, 14, 3, 0.06, i), (p) => (p.y > 0.25 ? C("#ffffff") : C("#d8e8b0"))));
    });
    // upper limbs + their leaf clusters (frame the top of the shot)
    const limbs: [THREE.Vector3[], number][] = [
      [[V(-3.4, 11, -1.7), V(-1.0, 12.2, -1.0), V(2.4, 13.6, -0.8), V(5.6, 14.4, -1.5)], 0.42],
      [[V(-4.0, 13.5, -2.0), V(-6.5, 15.2, -1.2), V(-9.5, 16.4, 0.4)], 0.45],
      [[V(-3.6, 17, -2.2), V(-2.2, 19.5, -4.2), V(0.5, 21.5, -6.5)], 0.4],
      [[V(-3.2, 9.4, -1.6), V(-4.6, 10.4, 0.8), V(-5.6, 11.2, 2.6)], 0.28],
    ];
    const lobes: [number, number, number, number, string][] = []; // x,y,z,radius,colour
    const leafCols = ["#3f9a3e", "#4aa640", "#5cb444", "#358c48", "#62b04a", "#2f8452"];
    for (const [pts, r0] of limbs) {
      BK.push(clean(tube(pts, (u) => r0 * (1 - 0.6 * u) + 0.05, 24, 12, 4, 0.06, r0 * 10), "#ffffff"));
      const end = pts[pts.length - 1], mid = pts[Math.floor(pts.length / 2)];
      for (const [c, n, s] of [[end, 5, 1.0], [mid, 3, 0.75]] as [THREE.Vector3, number, number][]) for (let k = 0; k < n; k++)
        lobes.push([c.x + (r() - 0.5) * 3.2 * s, c.y + 0.4 + r() * 1.6 * s, c.z + (r() - 0.5) * 2.6 * s, (1.3 + r() * 1.0) * s, leafCols[Math.floor(r() * leafCols.length)]]);
    }
    for (let k = 0; k < 26; k++) { // the crown
      const a = r() * TAU, d = Math.sqrt(r()) * 10;
      lobes.push([TRUNK.x + Math.cos(a) * d, 20 + r() * 9 - d * 0.35, TRUNK.z + Math.sin(a) * d * 0.8, 2.6 + r() * 2.2, leafCols[Math.floor(r() * leafCols.length)]]);
    }
    // shelf fungi on the trunk
    for (let k = 0; k < 6; k++) {
      const a = 0.45 + k * 0.9 + r() * 0.2, y = 2.6 + k * 1.15 + r() * 0.5, cx = TRUNK.x + 0.35 * Math.sin(y * 0.11 + 1.7), cz = TRUNK.z + 0.28 * Math.sin(y * 0.08 + 3.4);
      const rr = 1.25 * (1 - (0.4 * y) / 24) * (1 + 1.5 * Math.exp(-y / 1.5) * 0.25) * 0.97;
      SS.push(clean(new THREE.SphereGeometry(0.32, 16, 8, 0, TAU, 0, Math.PI / 2).scale(1, 0.5, 0.85).rotateY(-a).translate(cx + Math.cos(a) * (rr + 0.12), y, cz + Math.sin(a) * (rr + 0.12)), (p) => (p.y > y + 0.06 ? C("#f8dcaa") : p.y > y + 0.02 ? C("#e8a860") : C("#a8643a"))));
    }

    // the mossy branch (its own group: dips when the ape catches it)
    {
      const B = this.branch;
      B.position.copy(BR_PIVOT);
      const off = new THREE.Group(); off.position.copy(BR_PIVOT).negate(); B.add(off); R.add(B);
      const bg = branchGeo();
      bake(bg.bark, barkMat, true, off);
      bake([bg.moss], mossMat, true, off);
      const BS: THREE.BufferGeometry[] = [], BP: THREE.BufferGeometry[] = [];
      // moss cushions + epiphytes along the top, away from the ape (|x| > 1.25)
      for (const x of [-2.3, -1.6, 1.6, 2.3, 3.1, 3.9]) {
        const u = uAtX(x), c = bg.curve.getPointAt(u), top = c.y + BR_R(u);
        for (let k = 0; k < 2; k++) BS.push(clean(new THREE.SphereGeometry(0.16 + 0.08 * r(), 12, 8).scale(1.3, 0.55, 1).translate(c.x + (r() - 0.5) * 0.3, top + 0.03, c.z + (r() - 0.5) * 0.25), (p) => lerpC("#6a9a34", "#b8d860", (p.y - top) * 5)));
      }
      { // a fern on the branch (x -2.0) and a red bromeliad (x 2.7)
        const u1 = uAtX(-2.0), c1 = bg.curve.getPointAt(u1);
        BP.push(tf(fernPlant(77, 0.75, ["#2f7a3a", "#a8d85a"]), M(c1.x, c1.y + BR_R(u1) + 0.02, c1.z, 0.5)));
        const u2 = uAtX(2.7), c2 = bg.curve.getPointAt(u2), top = c2.y + BR_R(u2) + 0.02;
        const brom: THREE.BufferGeometry[] = [];
        for (let k = 0; k < 9; k++) brom.push(soupGeo(frond(0.5 + 0.15 * (k % 3), 0.07, 0.35 + 0.1 * (k % 3), 1.4, 10, 0.0, "#c83a3a", "#ff8a4a", 0.4), M(0, 0, 0, (k / 9) * TAU)));
        brom.push(clean(new THREE.ConeGeometry(0.06, 0.3, 8).translate(0, 0.18, 0), "#ffd040"));
        BP.push(tf(merge(brom), M(c2.x, top, c2.z, 0.3)));
      }
      // hanging moss beards under the branch (only beyond |x| 1.7)
      for (const x of [-2.6, -2.0, 1.9, 2.5, 3.2, 4.0]) {
        const u = uAtX(x), c = bg.curve.getPointAt(u), y0 = c.y - BR_R(u) * 0.6, L = 0.3 + 0.5 * r();
        BS.push(clean(tube([V(c.x, y0 + 0.1, c.z), V(c.x + 0.02, y0 - L * 0.5, c.z + 0.03), V(c.x - 0.02, y0 - L, c.z)], (q) => 0.05 * (1 - q) + 0.008, 6, 5), "#8aaa58"));
      }
      // little twig + knot
      { const u = uAtX(3.4), c = bg.curve.getPointAt(u); BS.push(clean(tube([c.clone(), V(c.x + 0.4, c.y + 0.6, c.z - 0.3), V(c.x + 0.7, c.y + 1.1, c.z - 0.4)], (q) => 0.08 * (1 - q) + 0.02, 8, 6), "#7a5a3c")); }
      bake(BS, solidMat, true, off); bake(BP, plantMat, true, off);
    }

    // ---------------- plateau trees (background giants) ----------------
    const giants = ([[-12.5, -7, 0.95, 30], [11, -10, 1.05, 32], [14, 3, 0.85, 26], [-11.5, 6.5, 0.9, 28], [-6.5, -12.5, 0.8, 24], [8.5, 11.5, 0.75, 24], [-15, -1, 0.7, 22], [4.5, -13, 0.8, 26]] as [number, number, number, number][])
      .filter(([x, z, rad, h]) => !shades(x, z, rad * 2.2 + 3, h));
    giants.forEach(([x, z, rad, h], i) => {
      BK.push(trunkGeo(V(x, groundY(x, z), z), h * 0.78, rad, 4 + i * 1.3));
      lobes.push([x, h * 0.8, z, 3.2, leafCols[i % leafCols.length]]);
      for (let k = 0; k < 9; k++) { const a = r() * TAU, d = Math.sqrt(r()) * 6; lobes.push([x + Math.cos(a) * d, h * 0.75 + r() * 6 - d * 0.3, z + Math.sin(a) * d, 2.4 + r() * 1.8, leafCols[Math.floor(r() * leafCols.length)]]); }
      for (let k = 0; k < 2; k++) { const a = r() * TAU; lobes.push([x + Math.cos(a) * 2.5, h * 0.45 + r() * 3, z + Math.sin(a) * 2.5, 1.5 + r(), leafCols[Math.floor(r() * leafCols.length)]]); }
    });
    // lianas: sagging catenaries between the trunks
    const liana = (a: THREE.Vector3, b: THREE.Vector3, sag: number, rad: number, seed: number) => {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) { const u = k / 10; pts.push(a.clone().lerp(b, u).add(V(0, -sag * 4 * u * (1 - u), 0))); }
      BK.push(clean(tube(pts, () => rad, 30, 6, 2, 0.15, seed), "#c8b090"));
    };
    liana(V(-4.6, 12.5, -2.6), V(-12, 11, -6.6), 3.2, 0.08, 2);
    liana(V(-2.4, 15.5, -1.6), V(13.5, 17, 2.6), 3.0, 0.06, 3);

    // ---------------- hanging vines (each its own pendulum) ----------------
    const vineSpots: [number, number, number, number][] = [ // x, z, top y, length
      [3.4, 1.2, 13.8, 9.2], [5.8, 0.4, 14.3, 10.2], [4.8, -1.8, 14.2, 7.4],
      [-1.0, -2.6, 12.3, 4.4], [0.8, -3.6, 12.8, 4.8], [-2.8, -5.0, 12.6, 8.4],
      [-5.6, 1.8, 11.0, 6.4], [-7.2, 2.4, 14.6, 11.0], [-4.2, 1.0, 10.6, 4.6],
      [7.4, -3.4, 14.4, 11.6], [-8.8, -3.0, 15.4, 9.6], [9.6, 2.0, 16.0, 12.4],
    ];
    vineSpots.forEach(([x, z, top, len], i) => {
      if (Math.abs(x) < 2 && z > -1.5) return; // contract: nothing between the lens and the ape
      if (shades(x, z, 0.3, top)) return; // keep the sun lanes clean
      const rr = rng(300 + i), pts: THREE.Vector3[] = [];
      const vx = (u: number) => 0.22 * Math.sin(u * 4.2 + i) * u + 0.1 * Math.sin(u * 9 + i * 2), vz = (u: number) => 0.18 * Math.cos(u * 3.4 + i) * u;
      for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push(V(vx(u), -len * u, vz(u))); }
      const L: THREE.BufferGeometry[] = [clean(tube(pts, (u) => 0.05 * (1 - 0.75 * u * u) + 0.008, 32, 6, 1, 0.1, i), (p) => lerpC("#6a8a3a", "#8a6a42", vn(p.y * 0.7, i) * 0.5 + 0.5))];
      const S = new Soup();
      for (let k = 0; k < len / 0.8; k++) { // rounded heart leaves in little clusters along the vine
        const u = Math.min(1, (0.5 + k * 0.8 + rr() * 0.2) / len);
        if (u > 0.995) break;
        const b = V(vx(u), -len * u, vz(u));
        for (let q = 0; q < (u > 0.85 ? 3 : 2); q++) {
          const a = rr() * TAU, s2 = 0.13 + 0.07 * rr();
          const dir = V(Math.cos(a), -0.55 - 0.3 * rr(), Math.sin(a)).normalize(), perp = V(-dir.z, 0, dir.x).normalize(), up = V(0, 0, 0).crossVectors(perp, dir).normalize();
          const ca = C(rr() < 0.15 ? "#d8d860" : "#4ea23a"), cb = C("#8ed056"), cm = C("#b8e878");
          const c0 = b.clone().addScaledVector(dir, s2 * 0.25);
          const P = (t: number, w: number) => b.clone().addScaledVector(dir, s2 * 0.25 + t * s2 * 2.0).addScaledVector(perp, w * s2).addScaledVector(up, -Math.abs(w) * s2 * 0.35);
          const NN = 8, out: THREE.Vector3[] = [];
          for (let j = 0; j <= NN; j++) { const t = j / NN; out.push(P(t, Math.sin(Math.PI * Math.pow(t, 0.8)) * (1.1 - 0.5 * t) + (j === 0 ? 0.35 : 0))); }
          for (let j = NN; j >= 0; j--) { const t = j / NN; out.push(P(t, -(Math.sin(Math.PI * Math.pow(t, 0.8)) * (1.1 - 0.5 * t) + (j === 0 ? 0.35 : 0)))); }
          const mid = c0.clone().lerp(P(1, 0), 0.4).addScaledVector(up, s2 * 0.1);
          for (let j = 0; j < out.length - 1; j++) S.tri(mid, out[j], out[j + 1], cm, j < NN ? ca : cb, j < NN ? cb : ca);
        }
      }
      L.push(S.geo());
      lobes.push([x, top + 0.5, z, 1.1 + 0.5 * rr(), leafCols[i % leafCols.length]]);
      const g = new THREE.Group(); g.position.set(x, top, z);
      const m = new THREE.Mesh(merge(L), plantMat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; g.add(m); R.add(g);
      this.vines.push({ g, ph: rr() * TAU, amp: 0.012 + 0.012 * rr() });
    });

    // canopy lobes (instanced): main tree crown, limb clusters, plateau giants
    {
      const lg = new THREE.SphereGeometry(1, 20, 14);
      const im = new THREE.InstancedMesh(lg, lobeMat, lobes.length);
      lobes.forEach(([x, y, z, s, c], i) => { im.setMatrixAt(i, M(x, y, z, r() * 6, 0, 0, [s, s * 0.82, s])); im.setColorAt(i, C(c)); });
      im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; R.add(im);
    }

    // ---------------- floor plants ----------------
    /** contract zones: cat clearing, fall column, camera corridor (low plants only) */
    const blocked = (x: number, z: number, rad: number, h: number) => {
      if (catD(x, z) < 1.7 + rad) return true;
      if (Math.abs(x) < 1.6 + rad && z > -1.2 - rad && z < 1.4 + rad) return true;
      if (x > -2.5 - rad && x < 5.5 + rad && z > 2.5 - rad && z < 14 + rad && h > 0.9) return true;
      if (x > -2.6 - rad && x < 2.8 + rad && z > -9 && z < -1.0 && h > 2.2) return true; // backdrop lane behind the ape: nothing tall
      if (Math.hypot(x - TRUNK.x, z - TRUNK.z) < 1.9 + rad) return true;
      for (const [gx, gz, gr] of giants) if (Math.hypot(x - gx, z - gz) < gr * 1.6 + rad) return true;
      return Math.hypot(x - PC[0], z - PC[1]) > rimR(x, z) - 0.8 - rad;
    };
    const FERN_H = [1.5, 1.9, 2.4], FERN_PAL: [string, string][] = [["#2a6e34", "#8ccc52"], ["#337a2e", "#b2d85a"], ["#6a3a2a", "#e08a4a"]];
    const variants: { geo: THREE.BufferGeometry; h: number; rad: number; inst: Inst[]; amp: number }[] = [
      ...FERN_H.map((h, k) => ({ geo: fernPlant(500 + k, h, FERN_PAL[k === 2 ? (r() < 0.5 ? 0 : 1) : k]), h: h * 0.7, rad: h * 0.8, inst: [] as Inst[], amp: 0.035 })),
      { geo: fernPlant(520, 1.6, FERN_PAL[2]), h: 1.1, rad: 1.2, inst: [], amp: 0.035 },
      { geo: earPlant(530, 1.6, false), h: 1.6, rad: 1.0, inst: [], amp: 0.03 },
      { geo: earPlant(531, 1.9, true), h: 1.9, rad: 1.2, inst: [], amp: 0.03 },
      { geo: cycad(540, 2.0), h: 1.6, rad: 1.1, inst: [], amp: 0.015 },
      { geo: treeFern(550, 3.4), h: 4.6, rad: 1.6, inst: [], amp: 0.012 },
      { geo: treeFern(551, 4.4), h: 5.6, rad: 1.8, inst: [], amp: 0.01 },
      { geo: horsetails(560), h: 1.7, rad: 0.4, inst: [], amp: 0.03 },
      { geo: fernPlant(570, 0.7, FERN_PAL[1]), h: 0.5, rad: 0.5, inst: [], amp: 0.04 }, // low fern (allowed in the corridor)
    ];
    const placed: [number, number, number][] = [];
    const tryPlace = (vi: number, x: number, z: number, s: number) => {
      const v = variants[vi], rad = v.rad * s;
      if (blocked(x, z, rad * 0.6, v.h * s) || shades(x, z, rad * 0.5, v.h * s)) return false;
      if (placed.some(([a, b, c]) => Math.hypot(a - x, b - z) < (c + rad) * 0.62)) return false;
      placed.push([x, z, rad]);
      v.inst.push({ x, y: groundY(x, z) - 0.03, z, yaw: r() * TAU, s, ph: r() * TAU, amp: v.amp * (0.7 + 0.6 * r()) });
      return true;
    };
    // hand-placed framing plants first (left and right of the clearing, behind the fall column)
    const hand: [number, number, number, number][] = [[7, -3.4, -5.6, 1.0], [8, 5.6, -4.2, 1.0], [7, -6.2, 2.8, 1.0], [4, 2.8, -1.8, 1.1], [5, -2.0, 0.9, 1.0],
      [0, 2.4, 0.2, 1.1], [1, -2.8, 2.6, 1.0], [2, 3.4, -4.6, 1.0], [6, 6.4, 1.6, 1.0], [3, -0.6, -2.6, 0.9], [4, 6.6, -2.2, 1.0], [9, 2.2, 3.6, 1.0], [9, -1.2, 4.4, 1.1], [9, 3.4, 6.2, 1.2], [9, -0.8, 7.2, 1.0]];
    for (const [vi, x, z, s] of hand) tryPlace(vi, x, z, s);
    for (let i = 0; i < 2600; i++) {
      const a = r() * TAU, d = 2 + Math.sqrt(r()) * 15, x = PC[0] + Math.cos(a) * d, z = PC[1] + Math.sin(a) * d;
      const pick = r(), vi = pick < 0.42 ? Math.floor(r() * 3) : pick < 0.5 ? 3 : pick < 0.6 ? 4 + Math.floor(r() * 2) : pick < 0.67 ? 6 : pick < 0.76 ? 7 + Math.floor(r() * 2) : pick < 0.84 ? 9 : 10;
      tryPlace(vi, x, z, 0.8 + 0.45 * r());
    }
    for (const v of variants) {
      if (!v.inst.length) continue;
      const m = new THREE.InstancedMesh(v.geo, plantMat, v.inst.length);
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; R.add(m);
      this.sway.push({ mesh: m, inst: v.inst });
    }
    // static floor dressing: rocks, mushrooms, magnolias, a fallen log
    const rocks: [number, number, number][] = [[-1.6, 3.2, 0.35], [2.9, 2.0, 0.28], [-5.2, -4.4, 0.8], [6.8, -5.6, 1.0], [-8.4, 3.6, 0.7], [4.4, 7.8, 0.5], [-3.8, 7.4, 0.6]];
    for (const [x, z, s] of rocks) if (catD(x, z) > 1.8 + s) SS.push(tf(rockGeo(s, Math.floor(x * 31 + z * 17), true), M(x, groundY(x, z) - s * 0.15, z)));
    for (let i = 0; i < 40; i++) { // rim outcrops
      const a = r() * TAU, rr = rimR(PC[0] + Math.cos(a), PC[1] + Math.sin(a)) + 0.5 + r() * 4, x = PC[0] + Math.cos(a) * rr, z = PC[1] + Math.sin(a) * rr, s = 1 + 2.2 * r();
      SS.push(tf(rockGeo(s, 700 + i, r() < 0.7), M(x, groundY(x, z) - s * 0.3, z)));
    }
    for (const [x, z] of [[-2.4, -0.6], [2.6, 2.6], [-4.8, 2.4], [5.2, -2.8], [-1.8, -3.4]]) if (!blocked(x, z, 0.2, 0.1)) SS.push(tf(mushrooms(Math.floor(x * 13 + z * 7 + 100)), M(x, groundY(x, z), z)));
    for (const [x, z, h] of [[6.2, -0.4, 1.5], [-7.4, -2.0, 1.7], [-3.6, 4.8, 1.2]]) if (!blocked(x, z, h * 0.5, h)) SP.push(tf(magnolia(Math.floor(x * 7 + z * 3 + 50), h), M(x, groundY(x, z), z)));
    { // the fallen log (left, behind)
      const a = V(-9.5, 0, -4.2), b = V(-5.6, 0, -6.6);
      a.y = groundY(a.x, a.z) + 0.4; b.y = groundY(b.x, b.z) + 0.35;
      SS.push(clean(tube([a, a.clone().lerp(b, 0.5).add(V(0, 0.05, 0)), b], () => 0.45, 16, 14, 2, 0.08, 9), (p) => (p.y > (a.y + b.y) / 2 + 0.2 ? C("#8ab04a") : C("#7a5a3c"))));
    }
    bake(BK, barkMat); bake(MS, mossMat); bake(SP, plantMat); bake(SS, solidMat);

    // ---------------- the valley below the rim: canopy carpet + emergent umbrella trees ----------------
    {
      const near: [number, number, number, number, string][] = [], far: [number, number, number, number, string][] = [];
      const valCols = ["#3e8e44", "#4c9c3e", "#2f7e4c", "#5aa846", "#3a8656", "#6aac44", "#2c7444"];
      const bloom = ["#e86a6a", "#f0a040", "#e85a8a"];
      const EM: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 430; i++) {
        const a = r() * TAU, rim = rimR(PC[0] + Math.cos(a), PC[1] + Math.sin(a)), d = rim + 5 + 280 * Math.pow(r(), 1.5);
        const x = PC[0] + Math.cos(a) * d, z = PC[1] + Math.sin(a) * d, y0 = groundY(x, z), h = 20 + 10 * r() + Math.min(8, d * 0.03);
        if (y0 > -12) continue;
        const list = d < 75 ? near : far, s = (d < 75 ? 1 : 1 + (d - 75) / 140) * (0.9 + 0.3 * r());
        const col = r() < 0.06 ? bloom[Math.floor(r() * 3)] : valCols[Math.floor(r() * valCols.length)];
        const n = 3 + Math.floor(r() * 2);
        for (let k = 0; k < n; k++) { const b = r() * TAU, dd = (k ? 2.6 : 0) * s; list.push([x + Math.cos(b) * dd, Math.min(y0 + h * 0.82, -5 - 5 * r() - 0.03 * (d - rim)) + (k ? -1 : 0.8) * s, z + Math.sin(b) * dd, (3.6 + 1.6 * r()) * s, col]); }
      }
      for (let i = 0; i < 16; i++) { // emergent umbrella trees rising above the carpet
        const a = r() * TAU, rim = rimR(PC[0] + Math.cos(a), PC[1] + Math.sin(a)), d = rim + 26 + 110 * r();
        const x = PC[0] + Math.cos(a) * d, z = PC[1] + Math.sin(a) * d, y0 = groundY(x, z), h = -y0 - 2 + 8 * r();
        if (shades(x, z, 6, y0 + h + 6)) continue;
        EM.push(clean(tube([V(x, y0, z), V(x + 0.6, y0 + h * 0.5, z + 0.3), V(x + 0.2, y0 + h, z)], (u) => 1.0 - 0.45 * u, 10, 8, 4, 0.05, i), "#ffffff"));
        for (let k = 0; k < 4; k++) { const b = (k / 4) * TAU + r(); near.push([x + Math.cos(b) * 3.6, y0 + h + 0.6, z + Math.sin(b) * 3.6, 4.2 + r() * 1.4, valCols[Math.floor(r() * valCols.length)]]); }
        near.push([x, y0 + h + 1.8, z, 4.6, valCols[0]]);
      }
      const mk = (list: typeof near, seg: [number, number], cast: boolean) => {
        const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, seg[0], seg[1]), lobeMat, list.length);
        list.forEach(([x, y, z, s, c], i) => { im.setMatrixAt(i, M(x, y, z, (i * 2.4) % TAU, 0, 0, [s, s * 0.72, s])); im.setColorAt(i, C(c)); });
        im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; R.add(im);
        return im;
      };
      mk(near, [16, 10], false); mk(far, [10, 6], false).layers.set(NOINK);
      const em = bake(EM, barkMat, false); if (em) em.castShadow = false;
    }

    // ---------------- view-relative far vista: ridges, volcanoes, clouds, sun halo, pterosaurs ----------------
    const VG = this.vista; R.add(VG);
    const ridge = (Rr: number, y0: number, amp: number, bump: number, seed: number, base: string, f: number) => {
      const n = 360, pos: number[] = [], ks: number[] = [], idx: number[] = [];
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
        let top = y0 + amp * (0.6 * vn(c * 2 + seed, s * 2) + 0.4 * vn(c * 5 + seed, s * 5 + 3));
        top += bump * Math.sqrt(Math.abs(Math.sin(a * Rr / 10 + vn(c * 9, s * 9) * 2)));
        pos.push(c * Rr, top, s * Rr, c * Rr, top - 160, s * Rr); ks.push(0, 1);
      }
      for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("k", new THREE.Float32BufferAttribute(ks, 1)); g.setIndex(idx);
      const m = new THREE.Mesh(g, ridgeMat()); m.material.side = THREE.DoubleSide; m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = -0.8;
      R.add(m); this.ridges.push({ m, base, f });
    };
    ridge(360, -14, 26, 5, 1, "#3c6a5a", 0.42);
    ridge(500, 2, 40, 4, 7, "#5a6680", 0.6);
    ridge(680, 16, 60, 0, 13, "#7a7096", 0.74);
    // volcanoes (view-relative: a = right of the view axis, d = ahead)
    this.volc = volcanoMat();
    const volcano = (a: number, d: number, H: number, Rb: number, seed: number) => {
      const NY = 40, NA = 72, pos: number[] = [], ks: number[] = [], idx: number[] = [];
      const crater = Rb * 0.09;
      for (let j = 0; j <= NY; j++) {
        const k = j / NY;
        for (let i = 0; i <= NA; i++) {
          const an = (i / NA) * TAU, rr = (crater + (Rb - crater) * Math.pow(1 - k, 1.7)) * (1 + 0.08 * vn(Math.cos(an) * 3 + seed, Math.sin(an) * 3 + k * 4) + 0.04 * Math.sin(an * 11 + k * 3));
          const y = k < 1 ? H * k : H - crater * 0.3;
          pos.push(Math.cos(an) * rr, y, Math.sin(an) * rr); ks.push(k);
        }
      }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) { const p = j * (NA + 1) + i; idx.push(p, p + NA + 1, p + NA + 2, p, p + NA + 2, p + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("k", new THREE.Float32BufferAttribute(ks, 1)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, this.volc); m.position.set(a, -70, -d); m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = -0.7; VG.add(m);
      return V(a, -70 + H, -d);
    };
    const vtop = volcano(80, 820, 270, 360, 3);
    volcano(-260, 700, 170, 260, 8);
    volcano(330, 960, 120, 200, 11);
    // the smoke plume of the big one (rising, drifting left)
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), transparent: true, depthWrite: false, fog: false }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = -0.6; s.material.rotation = r() * TAU;
      VG.add(s); this.puffs.push({ s, ph: i / 12, sp: 0.01 + 0.004 * r(), dx: -0.55 - 0.25 * r(), base: 40 + 30 * r() });
      s.position.copy(vtop);
    }
    this.puffBase = vtop;
    // sun halo (additive) + golden clouds
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex("jgHalo", [[0, "rgba(255,255,255,1)"], [0.25, "rgba(255,255,255,0.45)"], [0.6, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.halo2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex("jgHalo2", [[0, "rgba(255,255,255,1)"], [0.4, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    for (const h of [this.halo, this.halo2]) { h.layers.set(NOINK); h.frustumCulled = false; h.renderOrder = -0.5; R.add(h); }
    const cl: [number, number, number, number][] = [[-14, 7, 340, 0.9], [9, 4, 300, 0.85], [24, 11, 420, 0.8], [-4, 16, 380, 0.75], [38, 6, 360, 0.8], [-30, 12, 330, 0.7], [16, 21, 300, 0.6]];
    cl.forEach(([az, el, w, o], i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(140 + i, CLOUD_GOLD), transparent: true, depthWrite: false, fog: false, opacity: o }));
      const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el), d = 980;
      s.position.set(Math.sin(a) * Math.cos(e) * d, Math.sin(e) * d, -Math.cos(a) * Math.cos(e) * d); s.scale.set(w * 1.5, w * 0.42, 1);
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = -0.65; VG.add(s); this.clouds.push(s);
    });
    // pterosaurs gliding across the view
    const pp = pteroParts();
    // [crossing time after the shot start (s), vx (m/s, + = to the right), y, z (view-relative), vz, scale, flap rate]
    const flock: [number, number, number, number, number, number, number][] = [
      [3.2, 5.5, 9, -40, 0.4, 1.0, 1.0], [4.4, 5.0, 13, -58, 0.3, 1.0, 0.85], [8.6, -6.0, 11, -52, 0.5, 1.1, 0.95],
      [9.8, -5.5, 18, -85, 0.2, 1.3, 1.1], [6.0, 7.0, 26, -150, -0.4, 1.6, 0.7],
    ];
    flock.forEach(([tc, vx, y, z, vz, s, fl], i) => {
      const x = -vx * tc;
      const mat = new THREE.MeshBasicMaterial({ color: "#3a2438", fog: false, side: THREE.DoubleSide });
      const g = new THREE.Group(), core = new THREE.Mesh(pp.core, mat), wl = new THREE.Group(), wr = new THREE.Group();
      const mr = new THREE.Mesh(pp.wing, mat), ml = new THREE.Mesh(pp.wing, mat); ml.scale.x = -1;
      wr.add(mr); wl.add(ml); g.add(core, wl, wr); g.scale.setScalar(s);
      g.traverse((o) => { o.layers.set(NOINK); o.frustumCulled = false; });
      VG.add(g);
      this.pteros.push({ g, wl, wr, p0: V(x, y, z), v: V(vx, 0, vz), ph: i * 1.7, flap: fl, mat, d: Math.hypot(x, z) });
    });
    // valley mist banks (the misty canopy)
    {
      const mt = mistTex(), mistGeo = new THREE.PlaneGeometry(1, 1);
      for (let i = 0; i < 26; i++) {
        const a = r() * TAU, d = 30 + 170 * r(), x = PC[0] + Math.cos(a) * d, z = PC[1] + Math.sin(a) * d, w = 40 + d * 0.5;
        const s = new THREE.Mesh(mistGeo, new THREE.MeshBasicMaterial({ map: mt, transparent: true, depthWrite: false, fog: false, opacity: 0.6, side: THREE.DoubleSide }));
        s.rotation.set(-Math.PI / 2, 0, r() * TAU);
        s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 2; R.add(s);
        this.mists.push({ s, x, y: -6 - 8 * r() + d * 0.02, z, w, ph: r() * TAU, sp: 0.2 + 0.3 * r(), o: 0.45 + 0.35 * r() });
      }
    }

    // ---------------- god rays + motes ----------------
    this.rays = raysMesh(34, 77); R.add(this.rays);
    this.motes = motesMesh(180, 31); R.add(this.motes);

    // ---------------- leaves shaken off the branch at the catch ----------------
    {
      const s = new Soup(), c1 = C("#ffffff"), c2 = C("#e8f0d0"), mid = V(0.1, 0.012, 0), out: THREE.Vector3[] = [];
      for (let j = 0; j <= 12; j++) { const th = (j / 12) * TAU, x = 0.1 - 0.1 * Math.cos(th); out.push(V(x, -0.01 * Math.abs(Math.sin(th)), 0.055 * Math.sin(th) * Math.pow(Math.sin(Math.PI * x / 0.2), 0.6))); }
      for (let j = 0; j < 12; j++) s.tri(mid, out[j + 1], out[j], c2, c1, c1);
      this.leaves = new THREE.InstancedMesh(s.geo(), plantMat, 14);
      this.leaves.castShadow = true; this.leaves.receiveShadow = true; this.leaves.frustumCulled = false; R.add(this.leaves);
      const cols = ["#8ad050", "#ffc840", "#b4e060", "#ff9040"];
      for (let i = 0; i < 14; i++) { this.leafP.push([-1.3 + 2.6 * r(), 6.05 + 0.35 * r(), -0.25 + 0.5 * r(), r() * TAU, 0.7 + 0.5 * r(), 1.4 + 1.6 * r(), 0.9 + 0.7 * r()]); this.leaves.setColorAt(i, C(cols[i % 4])); }
    }
    this.animate(0, 0);
  }
  private puffBase = V(0, 0, 0);
  private shades: (x: number, z: number, rad: number, top: number) => boolean = () => false;

  /** the world's camera-relative sun for shot 4 (same formula as world.shotSun) + the shot's mean view direction */
  private sun(): THREE.Vector3 {
    if (this.sunDir) return this.sunDir;
    const s = SHOTS[3], L = LOOKS.jungle;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(4, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    this.fwd.set(fx, 0, fz);
    const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    this.sunDir = V(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    // the vista group faces the mean view direction (its local -z = forward)
    this.vista.rotation.set(0, Math.atan2(-fx, -fz), 0);
    return this.sunDir;
  }

  private animate(t: number, catchD: number) {
    for (const s of this.sway) {
      s.inst.forEach((p, i) => {
        const a = p.amp * (Math.sin(t * 0.9 + p.ph) + 0.45 * Math.sin(t * 2.1 + p.ph * 1.7));
        const b = p.amp * 0.7 * Math.sin(t * 0.7 + p.ph * 2.3);
        this.q.setFromEuler(this.e.set(a, p.yaw, b, "YXZ"));
        this.m4.compose(this.vp.set(p.x, p.y, p.z), this.q, this.vs.set(p.s, p.s, p.s));
        s.mesh.setMatrixAt(i, this.m4);
      });
      s.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const v of this.vines) v.g.rotation.set(v.amp * Math.sin(t * 0.55 + v.ph), 0, v.amp * 0.8 * Math.sin(t * 0.43 + v.ph * 1.9));
    // leaves: born at the catch, flutter down (scale in, no pop)
    this.leafP.forEach(([x, y, z, ph, sp, sw, rs], i) => {
      const d = catchD - i * 0.03;
      if (d <= 0) { this.m4.makeScale(0, 0, 0); this.leaves.setMatrixAt(i, this.m4); return; }
      const fall = Math.min(y - 0.05, sp * d + 0.25 * d * d * (d < 0.6 ? 1 : 0.6 / d));
      const px = x + 0.25 * Math.sin(d * sw + ph) + 0.15 * d * Math.sign(x), pz = z + 0.2 * Math.cos(d * sw * 0.8 + ph) + 0.12 * d;
      this.q.setFromEuler(this.e.set(0.8 * Math.sin(d * rs * 3 + ph), ph + d * rs, 0.6 * Math.cos(d * rs * 2.4 + ph)));
      const s = Math.min(1, d / 0.12) * 1.3;
      this.m4.compose(this.vp.set(px, y - fall, pz), this.q, this.vs.set(s, s, s));
      this.leaves.setMatrixAt(i, this.m4);
    });
    this.leaves.instanceMatrix.needsUpdate = true;
  }

  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const R = this.root;
    R.visible = id === 4;
    if (!R.visible) return;
    const sun = this.sun();
    // the jungle -> peak light punch (same ramp world.ts applies)
    const rp = LOOK_RAMPS.find((x) => x[4] === "jungle");
    const pk = rp ? Math.max(0, Math.min(1, (f - rp[2]) / Math.max(1, rp[3] - rp[2]))) : 0, pks = pk * pk * (3 - 2 * pk);
    const LJ = LOOKS.jungle, LP = LOOKS.peak;
    const fogS = C(LJ.fog[0]).lerp(C(LP.fog[0]), pks);
    untone(fogS, this.fogC);
    // vista sits around the camera horizontally (the valley is far below; ridges/volcanoes keep their angles)
    const cl = R.worldToLocal(cam.position.clone());
    this.vista.position.set(cl.x, 0, cl.z);
    for (const { m, base, f: fk } of this.ridges) {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      m.position.set(cl.x, 0, cl.z);
      untone(this.tmpC.set(base).lerp(fogS, fk), u.uCol.value);
      u.uFog.value.copy(this.fogC); untone("#ffe0a0", u.uGlow.value); u.uSun.value.copy(sun); u.uMist.value = 0.85;
    }
    const vu = this.volc.uniforms;
    vu.uSun.value.copy(sun); vu.uFog.value.copy(this.fogC); vu.uHaze.value = 0.3; vu.uT.value = t;
    untone(this.tmpC.set("#c07868").lerp(C("#d06a80"), pks), vu.uLit.value); untone(this.tmpC.set("#46365e").lerp(C("#5a3466"), pks), vu.uShade.value);
    // smoke puffs
    const smoke = this.tmpC.set("#d0a8b0").lerp(C("#e0a0b0"), pks).clone();
    for (const p of this.puffs) {
      const u = (p.ph + t * p.sp) % 1, a = sm(u / 0.12) * (1 - sm((u - 0.55) / 0.45));
      p.s.position.set(this.puffBase.x + p.dx * u * 220, this.puffBase.y + 10 + u * 260, this.puffBase.z - 20 * u);
      p.s.scale.setScalar(p.base + u * 170);
      p.s.material.opacity = a * 0.9; p.s.material.color.copy(smoke);
    }
    // sun halo
    const sd = 1040;
    this.halo.position.copy(cl).addScaledVector(sun, sd); this.halo.scale.setScalar(2 * sd * Math.tan(THREE.MathUtils.degToRad(26)));
    this.halo2.position.copy(cl).addScaledVector(sun, sd * 0.99); this.halo2.scale.setScalar(2 * sd * Math.tan(THREE.MathUtils.degToRad(7)));
    this.halo.material.color.setRGB(0.55, 0.3, 0.12).lerp(this.tmpC.setRGB(0.6, 0.25, 0.22), pks);
    this.halo2.material.color.setRGB(1.1, 0.7, 0.32).lerp(this.tmpC.setRGB(1.2, 0.6, 0.45), pks);
    for (const c of this.clouds) c.material.color.setRGB(1, 1, 1).lerp(this.tmpC.setRGB(1.05, 0.85, 0.95), pks);
    // pterosaurs
    const t4 = t - SHOTS[3].a / 30;
    for (const p of this.pteros) {
      const tt = t4;
      p.g.position.copy(p.p0).addScaledVector(p.v, tt); p.g.position.y += 0.8 * Math.sin(tt * 0.9 + p.ph);
      p.g.rotation.set(0.05 * Math.sin(tt * 0.9 + p.ph), Math.atan2(p.v.x, p.v.z), 0.12 * Math.sin(tt * 0.5 + p.ph));
      const env = Math.max(0, Math.sin(tt * 0.6 + p.ph)), fl = 0.12 + 0.55 * env * Math.sin(tt * 7.5 * p.flap + p.ph);
      p.wr.rotation.z = fl; p.wl.rotation.z = -fl;
      p.mat.color.set("#3a2438").lerp(this.tmpC.copy(this.fogC), Math.min(0.75, p.d / 320));
    }
    // mist
    for (const m of this.mists) {
      m.s.position.set(m.x + Math.sin(t * 0.05 * m.sp + m.ph) * 6, m.y, m.z + Math.cos(t * 0.04 * m.sp + m.ph) * 4);
      m.s.scale.set(m.w * 1.6, m.w * 0.8, 1); const mm = m.s.material as THREE.MeshBasicMaterial; mm.opacity = m.o; mm.color.copy(this.fogC).multiplyScalar(1.05);
    }
    // god rays: slant down along the sun's azimuth, steeper than the sun itself (readable shafts)
    const ru = (this.rays.material as THREE.ShaderMaterial).uniforms, hs = V(sun.x, 0, sun.z).normalize(), el = THREE.MathUtils.degToRad(30);
    ru.uT.value = t; ru.uDir.value.set(-hs.x * Math.cos(el), -Math.sin(el), -hs.z * Math.cos(el)); ru.uCol.value.set(1.0, 0.62, 0.26).lerp(V(1.0, 0.5, 0.4), pks); ru.uK.value = 0.5 + 0.15 * pks;
    const mu = (this.motes.material as THREE.ShaderMaterial).uniforms;
    mu.uT.value = t; mu.uCol.value.set(1.4, 0.95, 0.45);
    // the branch reacts to the catch
    const br = branchAt(id, t);
    this.branch.rotation.set(0, 0, br.rot);
    this.animate(t, t - (W.jolt2 - 0.02));
  }
}
