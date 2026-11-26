// OWNER: pond. The PREHISTORIC POND, half underwater (shot 3, the story TURN). Everything here is new.
//
// UNDERWATER (the camera's home, ~POND+(0,1.2,3)): green-teal water, a pebbly golden floor with animated CAUSTICS
// (injected into the world's two-tone materials, masked by the real sun shadow, so reeds / lily pads throw shadows
// that break the light web), GOD RAYS slanting down from the surface along the (camera-relative) sun, the SURFACE seen
// from below (Snell's window: bright sky ring with tree-fern silhouettes; outside it the silvery-teal mirror), LILY PADS
// as inked silhouettes with trailing stems, swaying REEDS / cattails, prehistoric water ferns, horsetails, fiddleheads,
// club-moss tufts, mossy boulders, a sunken log, rising BUBBLE streams and drifting motes.
// ABOVE WATER (if a camera ever surfaces / dives in): banks with tree ferns, cycads, horsetails, a far volcano, its own
// hazy sky dome, the surface becomes a transparent sky-tinted film; fog switches from water to air automatically.
//
// CONTRACTS (LOCAL to POND = (3000,0,0), metres):
//   Water SURFACE y 2.2 (plane, NOINK). Floor ~y 0 (-0.1..0.05) everywhere within ~6 m of the origin; banks rise from
//   ellipse e = hypot(x/10, (z+3)/12.5) = 1 and break the surface at e ~1.5 (x ~ +-15, z ~ -22 / +16).
//   TADPOLE zone kept clear: sphere r 1.0 around (0,1.2,0); camera corridor x +-0.9, z 0..6, y 0.4..2.0 is clear.
//   Reed clusters (x,z): (-1.25,-1.8) (-1.75,-4.3) (-2.5,-0.7) (-1.15,-7.6) (1.35,-2.6) (2.15,-0.9) (1.7,-6.1) (0.5,-10.5)
//     (-3.6,-9.5) (3.2,-11) (-2.9,2.2) (2.8,2.8). Bubble vents (x,z): (-0.6,-1.6) (0.85,-3.2) (-1.4,-5.0) (1.9,-1.8).
//   Sunken log from (-2.6,0.12,-3.9) to (1.2,0.16,-5.2) (r 0.2). Lily pads: top y 2.206 over x -3.7..3.7, z 1.5..-13
//     (none over |x| < 0.75, z > -1.2). Tall things (reeds, lily stems) keep a backdrop LANE |x| < 1.05, z > -9.5 clear.
//   Camera vantages (tested): default POND+(0,1.3..1.4,2.6..4.0) -> look (0,1.2,0): surface net + pads + rays on top,
//     caustic floor below, clean teal lane behind the tadpole. Low hero POND+(0.3,0.55,3.2) -> (0,1.5,0): the surface
//     and pads fill the frame. Dive / surface POND+(0,2.9,5) -> (0,1.4,0) or (1.2,3.4,6) -> (0,2,-4): air world works
//     (sky, shore ferns, see-through water). Keep the camera >= 0.15 m off the surface plane (no edge-on frame).
// Visible only while shot 3 is on screen (root.visible = id === 3; the dissolves render shot 3's own layer).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone, untone, TONE, CHAR } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { POND, SHOTS, camAt, V3 as T3 } from "./story";
import { LOOKS } from "./looks";

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
export const SURF = 2.2;
const add = (x: number, y: number, z: number): T3 => [POND[0] + x, POND[1] + y, POND[2] + z];
/** exported contract points (world coordinates) */
export const POND_TADPOLE = add(0, 1.2, 0);
export const POND_SURFACE_Y = POND[1] + SURF;
export const POND_CAM = add(0, 1.3, 3.2);

// ============================================================ noise + floor height
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const ell = (x: number, z: number) => Math.hypot(x / 10, (z + 3) / 12.5);
/** pond floor height (local) */
export const floorY = (x: number, z: number) => {
  const e = ell(x, z);
  let h = -0.08 * sm(1 - e) + 3.1 * sm((e - 1) / 0.95) + Math.max(0, e - 1.95) * 1.6;
  h += 0.05 * vn(x * 0.7, z * 0.7) + 0.022 * vn(x * 2.1 + 7, z * 2.1);
  h += 0.55 * vn(x * 0.18 + 3, z * 0.18) * sm((e - 0.85) * 2);
  return h;
};

// ============================================================ materials: two-tone + golden caustics
export const CAUS = { uCT: { value: 0 }, uCCol: { value: new THREE.Vector3(1.0, 0.86, 0.5) }, uCK: { value: 1.9 }, uSurf: { value: SURF }, uOrg: { value: new THREE.Vector3(...POND) } };
const CAUS_GLSL = /* glsl */ `
uniform float uCT; uniform vec3 uCCol; uniform float uCK; uniform float uSurf; uniform vec3 uOrg; varying vec3 vCW;
vec2 cH2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// animated Voronoi cell borders (F2 - F1): crisp cartoon caustic lines
float cVor(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), o = cH2(i + g);
    o = 0.5 + 0.42 * sin(t * (0.6 + 0.5 * o.yx) + 6.2831 * o);
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return sqrt(d2) - sqrt(d1);
}
float causWeb(vec2 p, float t) {
  p += 0.18 * vec2(sin(p.y * 1.7 + t * 0.7), cos(p.x * 1.5 - t * 0.6));
  float a = cVor(p, t), b = cVor(p * 1.37 + 3.7, t * 1.2);
  float wa = max(0.07, fwidth(a) * 1.2), wb = max(0.07, fwidth(b) * 1.2);
  float la = 1.0 - smoothstep(wa * 0.4, wa * 1.6, a), lb = 1.0 - smoothstep(wb * 0.4, wb * 1.6, b);
  return max(la, lb * 0.65) + 0.25 * la * lb;
}`;
const matCache = new Map<string, THREE.MeshLambertMaterial>();
/** world two-tone Lambert with caustics below the surface (k = caustic strength, 0 = plain two-tone) */
const pmat = (key: string, p: THREE.MeshLambertMaterialParameters, k = 1) => {
  let m = matCache.get(key);
  if (m) return m;
  m = twoTone(new THREE.MeshLambertMaterial(p));
  if (k > 0) {
    const mm = m, base = m.onBeforeCompile;
    mm.onBeforeCompile = (sh, r) => {
      base.call(mm, sh, r);
      Object.assign(sh.uniforms, CAUS);
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vCW;")
        .replace("#include <project_vertex>", "#include <project_vertex>\n{ vec4 cw = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\ncw = instanceMatrix * cw;\n#endif\nvCW = (modelMatrix * cw).xyz; }");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + CAUS_GLSL)
        .replace("#include <opaque_fragment>", `{
          vec3 upC = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
          float upK = smoothstep(0.05, 0.75, dot(normal, upC));
          float dep = uSurf - vCW.y;
          float dk = smoothstep(0.0, 0.25, dep) * (1.0 - 0.45 * smoothstep(0.5, 3.0, dep));
          vec2 cuv = (vCW.xz - uOrg.xz) / 0.42;
          float c = causWeb(cuv, uCT * 0.9);
          outgoingLight += diffuseColor.rgb * uCCol * (c * uCK * ${k.toFixed(2)} * upK * dk * sunVis);
        }
        #include <opaque_fragment>`);
    };
    mm.customProgramCacheKey = () => "pondCaus2_" + k.toFixed(2) + (p.vertexColors ? "v" : "") + (p.map ? "m" : "");
  }
  matCache.set(key, m);
  return m;
};

// ============================================================ painted textures
const pebbleTex = () => ctex("pondPebbles", 1024, 1024, (g, r) => {
  g.fillStyle = "#c9a877"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 2600; i++) { // sand speckle
    g.fillStyle = ["#b89567", "#d8bd8c", "#bfa274", "#a88a60"][i % 4]; g.globalAlpha = 0.5;
    g.fillRect(r() * 1024, r() * 1024, 2 + r() * 3, 2 + r() * 3);
  }
  g.globalAlpha = 1;
  const cols = ["#a8865f", "#dcc59a", "#8e7860", "#b8987a", "#cdb488", "#7f8a62", "#c08a62", "#9a9a86", "#e2cfa6"];
  const peb = (x: number, y: number, rx: number, ry: number, a: number, col: string) => {
    for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) {
      const cx = x + dx, cy = y + dy;
      if (cx < -rx - 4 || cx > 1024 + rx + 4 || cy < -rx - 4 || cy > 1024 + rx + 4) continue;
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.fillStyle = "rgba(70,50,35,0.35)"; g.beginPath(); g.ellipse(2, 3, rx + 1.5, ry + 1.5, 0, 0, 7); g.fill();
      g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill();
      g.strokeStyle = "rgba(50,34,30,0.55)"; g.lineWidth = Math.max(1.2, rx * 0.12); g.stroke();
      g.fillStyle = "rgba(255,248,225,0.45)"; g.beginPath(); g.ellipse(-rx * 0.3, -ry * 0.35, rx * 0.42, ry * 0.25, -0.3, 0, 7); g.fill();
      g.restore();
    }
  };
  for (let i = 0; i < 520; i++) { const s = 5 + 22 * r() * r(); peb(r() * 1024, r() * 1024, s, s * (0.6 + 0.35 * r()), r() * 3.14, cols[Math.floor(r() * cols.length)]); }
  for (let i = 0; i < 60; i++) { // moss / algae patches
    g.fillStyle = "rgba(110,140,70,0.22)"; g.beginPath(); g.ellipse(r() * 1024, r() * 1024, 20 + 50 * r(), 12 + 30 * r(), r() * 3, 0, 7); g.fill();
  }
});
const padTex = () => ctex("pondPad", 512, 512, (g, r) => {
  const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256);
  gr.addColorStop(0, "#7fbf4a"); gr.addColorStop(0.7, "#5ea63c"); gr.addColorStop(1, "#3f7f30");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(200,235,140,0.55)"; g.lineWidth = 4;
  for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2; g.beginPath(); g.moveTo(256, 256); g.quadraticCurveTo(256 + Math.cos(a + 0.1) * 130, 256 + Math.sin(a + 0.1) * 130, 256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250); g.stroke(); }
  for (let i = 0; i < 70; i++) { g.fillStyle = "rgba(40,90,30,0.25)"; g.beginPath(); g.arc(r() * 512, r() * 512, 3 + 8 * r(), 0, 7); g.fill(); }
  g.strokeStyle = "rgba(60,40,30,0.6)"; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.stroke();
});
const barkTex = () => ctex("pondBark", 256, 512, (g, r) => {
  g.fillStyle = "#7a5636"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 60; i++) { g.fillStyle = r() < 0.5 ? "rgba(50,32,20,0.5)" : "rgba(160,120,80,0.4)"; g.fillRect(r() * 256, r() * 512, 3 + 5 * r(), 30 + 90 * r()); }
  for (let i = 0; i < 26; i++) { g.fillStyle = "rgba(100,150,60,0.55)"; g.beginPath(); g.ellipse(r() * 256, r() * 512, 10 + 30 * r(), 6 + 14 * r(), 0, 0, 7); g.fill(); }
});

// ============================================================ geometry helpers (vertex colours, merged)
const clean = (g0: THREE.BufferGeometry, col: THREE.ColorRepresentation | ((p: THREE.Vector3) => THREE.Color) = "#ffffff") => {
  const s = g0.index ? g0.toNonIndexed() : g0;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  const n = out.getAttribute("position").count;
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  const ca = new Float32Array(n * 3), pa = out.getAttribute("position"), v = new THREE.Vector3(), fixed = typeof col === "function" ? null : new THREE.Color(col);
  for (let i = 0; i < n; i++) { const c = fixed ?? (col as (p: THREE.Vector3) => THREE.Color)(v.fromBufferAttribute(pa, i)); ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b; }
  out.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
  return out;
};
const M = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | [number, number, number] = 1) =>
  new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), typeof s === "number" ? V3(s, s, s) : V3(...s));
const tf = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { g.applyMatrix4(m); return g; };
const merge = (l: THREE.BufferGeometry[]) => mergeGeometries(l, false)!;
/** tapered tube along points (radius r0 -> r1), smooth, open */
const tubeAlong = (pts: THREE.Vector3[], r0: number, r1: number, seg = 12, rad = 6) => {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, r = r0 + (r1 - r0) * u, c = curve.getPointAt(u);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      p.setXYZ(k, c.x + n.getX(k) * r, c.y + n.getY(k) * r, c.z + n.getZ(k) * r);
    }
  }
  return g;
};
/** a curved, tapered leaf blade with a V crease: base at origin, rises along +y, bends toward +z by `bend` */
const blade = (h: number, w: number, bend: number, seg = 8, tipW = 0.05) => {
  const pos: number[] = [];
  const P = (u: number, s: number) => {
    const y = h * Math.sin((u * Math.PI) / 2 * (1 - bend * 0.4)) / Math.sin((Math.PI / 2) * (1 - bend * 0.4));
    const z = bend * h * u * u, ww = w * (1 - u * (1 - tipW)) * (u < 0.08 ? 0.6 + 5 * u : 1);
    return [s * ww, y, z + (s === 0 ? -w * 0.18 : 0)];
  };
  for (let i = 0; i < seg; i++) {
    const a = i / seg, b = (i + 1) / seg;
    for (const [s0, s1] of [[-1, 0], [0, 1]]) {
      const p00 = P(a, s0), p01 = P(a, s1), p10 = P(b, s0), p11 = P(b, s1);
      pos.push(...p00, ...p01, ...p11, ...p00, ...p11, ...p10);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
};
const lerpC = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t)));

// ---------------- plant variants (local, base at origin) ----------------
/** cattail / bulrush: a stem through the surface, a brown head above, 2-3 blades */
const cattail = (h: number, seed: number, head: boolean) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  const lean = (r() - 0.5) * 0.12;
  L.push(clean(tubeAlong([V3(0, 0, 0), V3(lean * 0.3, h * 0.5, 0), V3(lean, h, 0)], 0.032, 0.016, 8, 7), (p) => lerpC("#5d8f3a", "#9dcb5e", p.y / h)));
  if (head) {
    L.push(clean(tf(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), M(lean * 0.95, h - 0.3, 0)), "#7a4a2a"));
    L.push(clean(tf(new THREE.CylinderGeometry(0.004, 0.006, 0.16, 4), M(lean, h - 0.08, 0)), "#7a6a3a"));
  }
  for (let i = 0; i < 2 + Math.floor(r() * 2); i++) {
    const bh = h * (0.45 + 0.45 * r());
    L.push(clean(tf(blade(bh, 0.045, 0.08 + 0.18 * r(), 10), M(0, 0, 0, r() * 6.28, 0, 0)), (p) => lerpC("#4f7d34", "#9cc95a", p.y / bh)));
  }
  return merge(L);
};
/** prehistoric water fern: a curved rachis with paired leaflets (underwater bed) */
const waterFern = (h: number, seed: number, pal: [string, string, string] = ["#4a7a30", "#3f8a3c", "#8fcf5a"]) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  const fronds = 4 + Math.floor(r() * 3);
  for (let f = 0; f < fronds; f++) {
    const yaw = (f / fronds) * 6.28 + r() * 0.6, hh = h * (0.7 + 0.4 * r()), bend = 0.25 + 0.35 * r();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 5; i++) { const u = i / 5; pts.push(V3(0, hh * Math.sin(u * 1.3) / Math.sin(1.3), bend * hh * u * u)); }
    const fr: THREE.BufferGeometry[] = [clean(tubeAlong(pts, 0.008, 0.003, 8, 4), pal[0])];
    const curve = new THREE.CatmullRomCurve3(pts);
    for (let i = 2; i < 14; i += 2) {
      const u = i / 14, c = curve.getPointAt(u), tg = curve.getTangentAt(u), ls = 0.095 * (1 - u * 0.7) * (h / 0.5);
      for (const s of [-1, 1]) {
        const leaf = new THREE.SphereGeometry(1, 6, 4); leaf.scale(ls, 0.008, ls * 0.38);
        const m = new THREE.Matrix4().lookAt(V3(0, 0, 0), tg, V3(0, 1, 0));
        const q = new THREE.Quaternion().setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s * 1.2, s * 0.25)));
        leaf.translate(ls * 0.9, 0, 0); leaf.applyQuaternion(q); leaf.translate(c.x, c.y, c.z);
        fr.push(clean(leaf, lerpC(pal[1], pal[2], u + 0.2 * r())));
      }
    }
    L.push(tf(merge(fr), M(0, 0, 0, yaw)));
  }
  return merge(L);
};
/** horsetail (Equisetum): a segmented stem with dark node bands and whorls of needles */
const horsetail = (h: number, seed: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  const nodes = Math.max(4, Math.round(h / 0.16));
  for (let i = 0; i < nodes; i++) {
    const y0 = (i / nodes) * h, y1 = ((i + 1) / nodes) * h, rr = 0.022 * (1 - (i / nodes) * 0.55);
    L.push(clean(tf(new THREE.CylinderGeometry(rr * 0.92, rr, y1 - y0 - 0.012, 7, 1, true), M(0, (y0 + y1) / 2 - 0.006, 0)), lerpC("#6aa244", "#a6d460", i / nodes)));
    L.push(clean(tf(new THREE.CylinderGeometry(rr * 1.12, rr * 1.12, 0.014, 7, 1, false), M(0, y1 - 0.007, 0)), "#2f3a22"));
    if (i > 0 && i < nodes - 1) {
      const nN = 7, len = 0.16 * (1 - i / nodes) + 0.05;
      for (let k = 0; k < nN; k++) {
        const nd = new THREE.CylinderGeometry(0.003, 0.0045, len, 3, 1, true);
        nd.translate(0, len / 2, 0);
        L.push(clean(tf(nd, M(0, y1, 0, (k / nN) * 6.28 + r(), 0, 1.05)), "#5f9a3a"));
      }
    }
  }
  L.push(clean(tf(new THREE.ConeGeometry(0.026, 0.09, 7), M(0, h + 0.04, 0)), "#6a5a3a"));
  return merge(L);
};
/** fiddlehead: an uncurling fern crozier (spiral tip) */
const fiddle = (h: number, seed: number) => {
  const r = rng(seed), pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(V3(0.02 * Math.sin(u * 3 + r()), u * h, 0)); }
  const top = pts[pts.length - 1], R0 = 0.06 * (h / 0.35), C = V3(top.x + R0, top.y, 0);
  for (let i = 1; i <= 26; i++) { const sa = (i / 26) * Math.PI * 3.2, rr = R0 * Math.exp(-0.28 * sa), a = Math.PI - sa; pts.push(V3(C.x + rr * Math.cos(a), C.y + rr * Math.sin(a), 0)); }
  return clean(tubeAlong(pts, 0.02, 0.008, 60, 7), (p) => lerpC("#5c8f36", "#b4dc6a", p.y / (h + 0.1)));
};
/** club-moss tuft: little spiky upright stems with cones */
const clubmoss = (seed: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = r() * 6.28, d = 0.02 + 0.05 * r(), h = 0.06 + 0.07 * r(), tx = (r() - 0.5) * 0.4, tz = (r() - 0.5) * 0.4;
    const m = M(Math.cos(a) * d, 0, Math.sin(a) * d, 0, tx, tz);
    L.push(clean(tf(new THREE.CylinderGeometry(0.008, 0.011, h, 6).translate(0, h / 2, 0), m), "#4f8a3a"));
    L.push(clean(tf(new THREE.SphereGeometry(1, 10, 8).scale(0.022, 0.045, 0.022).translate(0, h + 0.03, 0), m), (q) => lerpC("#7fb84a", "#e2d060", (q.y - h) / 0.07)));
  }
  return merge(L);
};
/** tree fern: a shaggy trunk and arching fronds (shore) */
const treeFern = (h: number, seed: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  L.push(clean(tubeAlong([V3(0, 0, 0), V3(0.1, h * 0.5, 0.05), V3(0.05, h, 0)], 0.16, 0.11, 6, 9), "#6e4b30"));
  const top = V3(0.05, h, 0), n = 9;
  for (let f = 0; f < n; f++) {
    const yaw = (f / n) * 6.28 + r() * 0.4, len = 1.6 + 0.6 * r();
    const pts = [V3(0, 0, 0), V3(0, 0.45, len * 0.35), V3(0, 0.35, len * 0.7), V3(0, -0.15, len)];
    const fr: THREE.BufferGeometry[] = [clean(tubeAlong(pts, 0.03, 0.01, 10, 5), "#4f7a2e")];
    const curve = new THREE.CatmullRomCurve3(pts);
    for (let i = 1; i < 16; i++) {
      const u = i / 16, c = curve.getPointAt(u), ls = 0.32 * Math.sin(u * Math.PI) + 0.06;
      for (const s of [-1, 1]) {
        const lf = new THREE.BufferGeometry();
        lf.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.05, 0, 0, 0.05, s * ls, -0.08, 0.02], 3));
        lf.computeVertexNormals();
        fr.push(clean(tf(lf, M(c.x, c.y, c.z)), lerpC("#3f7e2c", "#86c04a", r())));
      }
    }
    L.push(tf(merge(fr), M(top.x, top.y, top.z, yaw)));
  }
  return merge(L);
};
/** cycad: a stubby barrel trunk with a crown of stiff fronds */
const cycad = (seed: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  L.push(clean(new THREE.CylinderGeometry(0.22, 0.3, 0.7, 10).translate(0, 0.35, 0), "#8a6a3c"));
  for (let f = 0; f < 11; f++) {
    const yaw = (f / 11) * 6.28 + r() * 0.3, bh = 1.1 + 0.4 * r();
    L.push(clean(tf(blade(bh, 0.12, 0.7, 8, 0.15), M(0, 0.66, 0, yaw, 0.35)), (p) => lerpC("#4e8a2e", "#9ccd52", p.y)));
  }
  return merge(L);
};

// ============================================================ the water surface (both sides)
const surfMat = () => new THREE.ShaderMaterial({
  uniforms: {
    uT: { value: 0 }, uSun: { value: V3(0, 1, 0) }, uBelow: { value: 1 },
    uFog: { value: new THREE.Color() }, uFogN: { value: 3 }, uFogF: { value: 30 },
    uWin: { value: new THREE.Color() }, uMir: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uSil: { value: new THREE.Color() },
    uAirTop: { value: new THREE.Color() }, uAirHor: { value: new THREE.Color() }, uOrg: { value: new THREE.Vector3(...POND) },
  },
  vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
  fragmentShader: /* glsl */ `
    uniform float uT; uniform vec3 uSun; uniform float uBelow; uniform vec3 uFog; uniform float uFogN; uniform float uFogF;
    uniform vec3 uWin; uniform vec3 uMir; uniform vec3 uRim; uniform vec3 uSil; uniform vec3 uAirTop; uniform vec3 uAirHor;
    varying vec3 vW; uniform vec3 uOrg;
    vec2 sH2(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
    float sVor(vec2 p, float t) {
      vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 g = vec2(float(x), float(y)), o = sH2(i + g);
        o = 0.5 + 0.42 * sin(t * (0.6 + 0.5 * o.yx) + 6.2831 * o);
        vec2 r = g + o - f; float d = dot(r, r);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
      return sqrt(d2) - sqrt(d1);
    }
    float h1(float x){ return fract(sin(x * 127.1) * 43758.5453); }
    float n1(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h1(i), h1(i + 1.0), f); }
    vec2 rip(vec2 p, float t){
      return vec2(sin(p.x * 2.1 + t * 1.3 + sin(p.y * 1.7 + t * 0.8)) + 0.6 * sin(p.y * 3.3 - t * 1.7 + p.x * 0.8),
                  cos(p.y * 2.3 - t * 1.1 + sin(p.x * 1.4 - t * 0.6)) + 0.6 * cos(p.x * 3.1 + t * 1.5 - p.y * 0.7));
    }
    void main(){
      vec3 d = vW - cameraPosition; float dist = length(d); vec3 v = d / dist;
      vec2 lp = vW.xz - uOrg.xz;
      vec2 rp = rip(lp, uT);
      float fogK = smoothstep(uFogN, uFogF, dist);
      if (uBelow > 0.5) {
        // seen from below: Snell's window (|angle| < 48.6 deg from vertical) shows the air world, outside = mirror
        vec3 vv = normalize(v + vec3(rp.x, 0.0, rp.y) * 0.035);
        float cw = vv.y;                                         // cos of the angle from straight up
        float win = smoothstep(0.62, 0.70, cw);
        float sw = sqrt(max(0.0, 1.0 - cw * cw));               // sin(theta water)
        float sa = clamp(sw * 1.333, 0.0, 1.0);                 // sin(theta air)
        float elA = asin(sqrt(max(0.0, 1.0 - sa * sa)));        // air elevation of what we see (rad)
        float az = atan(vv.z, vv.x);
        float tree = 0.10 + 0.07 * n1(az * 5.0 + 3.0) + 0.09 * pow(abs(sin(az * 9.0 + n1(az * 3.0) * 4.0)), 6.0) + 0.05 * n1(az * 23.0);
        vec3 air = mix(uRim, uWin, smoothstep(0.0, 0.9, elA));
        air = mix(air, uSil, smoothstep(tree + 0.015, tree - 0.015, elA));
        float sunA = max(dot(vv, normalize(uSun)), 0.0);
        air += vec3(1.6, 1.45, 1.0) * (pow(sunA, 600.0) * 3.0 + pow(sunA, 40.0) * 0.5);
        // the mirror: silvery teal, brighter toward the window, with a wobbly cartoon light-net (cell borders)
        vec2 wp = lp / 0.38 + 0.3 * rp;
        float vo = sVor(wp, uT * 1.1);
        float wv = max(0.06, fwidth(vo) * 1.3);
        float net = 1.0 - smoothstep(wv * 0.3, wv * 1.5, vo);
        float near = 1.0 - smoothstep(4.0, 16.0, dist);
        vec3 mir = uMir * (0.8 + 0.45 * smoothstep(0.1, 0.66, cw));
        mir += uRim * 0.38 * net * (0.3 + 0.7 * near);
        mir += uRim * 0.35 * smoothstep(0.5, 0.66, cw);
        vec3 c = mix(mir, air, win);
        c = mix(c, uFog, fogK * (1.0 - 0.55 * win));
        gl_FragColor = vec4(c, 1.0);
      } else {
        // seen from above: a sky-tinted film you can look through
        vec3 n = normalize(vec3(rp.x * 0.04, 1.0, rp.y * 0.04));
        vec3 r = reflect(v, n);
        float fres = 0.12 + 0.88 * pow(1.0 - max(dot(-v, n), 0.0), 4.0);
        vec3 sky = mix(uAirHor, uAirTop, smoothstep(0.0, 0.5, r.y));
        float spec = pow(max(dot(r, normalize(uSun)), 0.0), 300.0) * 4.0;
        vec3 c = mix(uMir * 0.55, sky, fres) + spec;
        float a = clamp(0.3 + 0.7 * fres, 0.0, 1.0);
        c = mix(c, uFog, fogK);
        gl_FragColor = vec4(c, a);
      }
    }`,
  side: THREE.DoubleSide, transparent: true, depthWrite: true, fog: false,
});

// ============================================================ god rays (instanced billboard ribbons, additive)
const raysMesh = (n: number, seed: number) => {
  const r = rng(seed), q = new THREE.PlaneGeometry(1, 1, 1, 12);
  q.translate(0, -0.5, 0); // y 0 (top) .. -1 (bottom)
  const g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const T = new Float32Array(n * 3), S = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    // tops on the surface, mostly in front of the default camera (looking -z), a few behind it
    const x = (r() - 0.5) * 8, z = 3.0 - Math.pow(r(), 0.9) * 16;
    T[i * 3] = x; T[i * 3 + 1] = SURF - 0.02; T[i * 3 + 2] = z;
    S[i * 4] = 0.1 + 0.45 * r() * r(); S[i * 4 + 1] = r(); S[i * 4 + 2] = 0.5 + 0.5 * r(); S[i * 4 + 3] = r();
  }
  g.setAttribute("iTop", new THREE.InstancedBufferAttribute(T, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(S, 4));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uDir: { value: V3(0, -1, 0) }, uCol: { value: V3(1, 1, 1) }, uK: { value: 1 }, uFogN: { value: 3 }, uFogF: { value: 30 } },
    vertexShader: /* glsl */ `attribute vec3 iTop; attribute vec4 iS; uniform float uT; uniform vec3 uDir; uniform float uFogN; uniform float uFogF;
      varying vec2 vQ; varying float vA; varying float vSeed;
      void main(){
        float along = -position.y;
        float len = (iTop.y - 0.0) / max(0.2, -uDir.y) * (0.75 + 0.35 * iS.z);
        vec3 drift = vec3(sin(uT * 0.21 + iS.y * 6.28), 0.0, cos(uT * 0.17 + iS.y * 4.0)) * 0.12;
        vec3 p = (modelMatrix * vec4(iTop + drift, 1.0)).xyz + uDir * len * along;
        vec3 view = normalize(cameraPosition - p);
        vec3 side = normalize(cross(uDir, view));
        float w = iS.x * (1.0 + 0.9 * along);
        p += side * position.x * w * 2.0;
        float dist = length(cameraPosition - p);
        vQ = vec2(position.x * 2.0, along); vSeed = iS.y;
        float flick = 0.55 + 0.45 * sin(uT * (0.5 + 0.6 * iS.w) + iS.y * 40.0);
        float face = 1.0 - 0.6 * abs(dot(view, uDir));
        vA = flick * face * smoothstep(0.7, 2.6, dist) * (1.0 - smoothstep(uFogN, uFogF * 0.9, dist));
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uK; uniform float uT; varying vec2 vQ; varying float vA; varying float vSeed;
      void main(){
        float x = vQ.x, u = vQ.y;
        float core = exp(-x * x * 3.2);
        float streak = 0.65 + 0.35 * sin(x * 7.0 + vSeed * 20.0 + sin(u * 3.0 + uT * 0.3));
        float a = core * streak * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.45, 1.0, u)) * (1.15 - 0.6 * u) * vA * uK;
        gl_FragColor = vec4(uCol * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 6;
  return m;
};

// ============================================================ bubbles + motes (instanced, shader-animated, deterministic)
const bubblesMesh = (vents: [number, number][], seed: number) => {
  const r = rng(seed), list: number[][] = [];
  for (const [vx, vz] of vents) for (let i = 0; i < 16; i++) list.push([vx + (r() - 0.5) * 0.06, floorY(vx, vz) + 0.05, vz + (r() - 0.5) * 0.06, 0.008 + 0.018 * r() * r(), 0.28 + 0.2 * r(), r(), 0.5 + r()]);
  for (let i = 0; i < 60; i++) { const x = (r() - 0.5) * 8, z = 2 - r() * 13; list.push([x, floorY(x, z) + 0.05, z, 0.006 + 0.012 * r(), 0.2 + 0.25 * r(), r(), 0.3 + r()]); }
  const n = list.length, q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const A = new Float32Array(n * 4), B = new Float32Array(n * 4);
  list.forEach((b, i) => { A.set([b[0], b[1], b[2], b[3]], i * 4); B.set([b[4], b[5], b[6], 0], i * 4); });
  g.setAttribute("iA", new THREE.InstancedBufferAttribute(A, 4)); g.setAttribute("iB", new THREE.InstancedBufferAttribute(B, 4));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uSurf: { value: SURF }, uFogN: { value: 3 }, uFogF: { value: 30 }, uRim: { value: new THREE.Color(1, 1, 1) }, uFog: { value: new THREE.Color() } },
    vertexShader: /* glsl */ `attribute vec4 iA; attribute vec4 iB; uniform float uT; uniform float uSurf; uniform float uFogN; uniform float uFogF;
      varying vec2 vQ; varying float vA; varying float vF;
      void main(){
        float H = uSurf - 0.04 - iA.y;
        float y = mod(iB.y * H + uT * iB.x, H);
        float u = y / H;
        vec3 p = vec3(iA.x + sin(uT * 3.1 * iB.z + iB.y * 30.0) * 0.025 * (0.3 + u), iA.y + y, iA.z + cos(uT * 2.3 * iB.z + iB.y * 17.0) * 0.02 * u);
        p = (modelMatrix * vec4(p, 1.0)).xyz;
        float s = iA.w * (1.0 + 0.5 * u);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float dist = length(cameraPosition - p);
        vQ = position.xy * 2.0;
        vA = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.9, 1.0, u)) * smoothstep(0.35, 0.8, dist);
        vF = smoothstep(uFogN, uFogF, dist);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x * (1.0 + 0.08 * sin(uT * 9.0 + iB.y * 9.0)) + up * position.y) * s * 2.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uRim; uniform vec3 uFog; varying vec2 vQ; varying float vA; varying float vF;
      void main(){
        float r = length(vQ);
        if (r > 1.0) discard;
        float rim = smoothstep(0.62, 0.86, r) * (1.0 - smoothstep(0.9, 1.0, r));
        float ink = smoothstep(0.86, 0.93, r) * (1.0 - smoothstep(0.96, 1.0, r));
        float hi = 1.0 - smoothstep(0.12, 0.2, length(vQ - vec2(-0.33, 0.36)));
        vec3 c = mix(uRim, vec3(0.06, 0.2, 0.22), ink * 0.7);
        c = c + vec3(1.2) * hi;
        float a = max(max(rim * 0.9, ink * 0.75), hi) + 0.14;
        c = mix(c, uFog, vF);
        gl_FragColor = vec4(c, a * vA * (1.0 - vF)); }`,
    transparent: true, depthWrite: false,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 7;
  return m;
};
const motesMesh = (n: number, seed: number) => {
  const r = rng(seed), q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const A = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) A.set([(r() - 0.5) * 7, 0.15 + r() * 2.0, 4 - r() * 12, r()], i * 4);
  g.setAttribute("iA", new THREE.InstancedBufferAttribute(A, 4));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCol: { value: V3(1, 1, 1) }, uFogF: { value: 30 } },
    vertexShader: /* glsl */ `attribute vec4 iA; uniform float uT; uniform float uFogF; varying vec2 vQ; varying float vA;
      void main(){
        float ph = iA.w * 6.2832;
        vec3 p = (modelMatrix * vec4(iA.xyz, 1.0)).xyz + vec3(sin(uT * 0.21 + ph) * 0.15 + uT * 0.03, sin(uT * 0.17 + ph * 2.0) * 0.1, cos(uT * 0.19 + ph * 1.3) * 0.15);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float dist = length(cameraPosition - p);
        float s = (0.006 + 0.008 * iA.w) * max(1.0, dist * 0.2);
        vQ = position.xy * 2.0;
        vA = (0.5 + 0.5 * sin(uT * (0.8 + iA.w * 2.0) + ph * 5.0)) * smoothstep(0.5, 1.4, dist) * (1.0 - smoothstep(uFogF * 0.3, uFogF * 0.6, dist)) / max(1.0, dist * 0.2);
        gl_Position = projectionMatrix * viewMatrix * vec4(p + (right * position.x + up * position.y) * s, 1.0); }`,
    fragmentShader: "uniform vec3 uCol; varying vec2 vQ; varying float vA; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(uCol * a * vA, 1.0); }",
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 6;
  return m;
};

// ============================================================ air sky (only when the camera is above the water)
const airSky = () => {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uHor: { value: new THREE.Color() } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHor; varying vec3 vP; void main(){ float e = max(vP.y, 0.0); vec3 c = mix(uHor, uMid, smoothstep(0.0, 0.18, e)); c = mix(c, uTop, smoothstep(0.18, 0.8, e)); gl_FragColor = vec4(c, 1.0); }",
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = -0.9;
  return m;
};

// ============================================================ swaying instanced plants
type Inst = { x: number; y: number; z: number; yaw: number; s: number; ph: number; amp: number };
type Sway = { mesh: THREE.InstancedMesh; inst: Inst[] };

const AIR_FOG = "#d9e6c8";
export class Pond {
  root = new THREE.Group();
  private surf: THREE.Mesh; private surfM: THREE.ShaderMaterial;
  private rays: THREE.Mesh; private bubbles: THREE.Mesh; private motes: THREE.Mesh; private sky: THREE.Mesh;
  private sway: Sway[] = [];
  private sunDir: THREE.Vector3 | null = null;
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private e = new THREE.Euler(); private vs = new THREE.Vector3(); private vp = new THREE.Vector3();
  private fogC = new THREE.Color(); private airBelow = true; private airTop = new THREE.Color(); private airHor = new THREE.Color(); private airMid = new THREE.Color();

  constructor() {
    const R = this.root;
    R.position.set(...POND);
    R.visible = false;
    const r = rng(4242);
    // ---------------- floor + banks ----------------
    const fg = new THREE.PlaneGeometry(90, 90, 120, 120); fg.rotateX(-Math.PI / 2);
    { // denser near the action: warp the grid toward the origin
      const p = fg.getAttribute("position") as THREE.BufferAttribute, uv = fg.getAttribute("uv") as THREE.BufferAttribute;
      const w = (a: number) => Math.sign(a) * Math.pow(Math.abs(a) / 45, 1.6) * 45;
      for (let i = 0; i < p.count; i++) {
        const x = w(p.getX(i)), z = w(p.getZ(i)) - 6;
        p.setXYZ(i, x, floorY(x, z), z); uv.setXY(i, x / 2.4, z / 2.4);
      }
      fg.computeVertexNormals();
    }
    const floorG = clean(fg, (p) => {
      const ab = sm((p.y - SURF + 0.15) / 0.5), deep = sm((ell(p.x, p.z) - 0.6) / 0.6);
      return new THREE.Color("#ffffff").lerp(new THREE.Color("#cfd8b0"), deep * 0.5).lerp(lerpC("#7cbf4a", "#a8b85a", 0.5 + 0.5 * vn(p.x * 0.3, p.z * 0.3)), ab);
    });
    const floorMat = pmat("pondFloor", { map: pebbleTex(), vertexColors: true }, 1.15);
    const floor = new THREE.Mesh(floorG, floorMat); floor.receiveShadow = true; floor.castShadow = false; floor.frustumCulled = false; R.add(floor);

    // ---------------- static batch: rocks, log, fiddleheads, club moss, lily stems, shore plants ----------------
    const plantMat = pmat("pondPlant", { vertexColors: true }, 0.8);
    const rockMat = pmat("pondRock", { vertexColors: true }, 1.0);
    const bt = barkTex(); bt.repeat.set(6, 1);
    const barkMat = pmat("pondBark", { map: bt, vertexColors: true }, 0.9);
    const SP: THREE.BufferGeometry[] = [], SR: THREE.BufferGeometry[] = [], SB: THREE.BufferGeometry[] = [];
    const clearZone = (x: number, z: number, rad: number) => Math.hypot(x, z) < 1.1 + rad || (Math.abs(x) < 0.9 + rad && z > -0.2 && z < 6.5);
    // tall things (reeds, lily stems) also keep a backdrop lane behind the tadpole free, so the card reads clean
    const lane = (x: number, z: number) => clearZone(x, z, 0.15) || (Math.abs(x) < 1.05 && z > -9.5);
    // pebbles + boulders
    const rockCols = ["#b9a184", "#9e8f7c", "#c8b59a", "#8c8a78", "#a7967e", "#d2c2a2"];
    const rock = (x: number, z: number, s: number, seed: number, mossy: boolean) => {
      const rr = rng(seed), g = new THREE.IcosahedronGeometry(1, s > 0.25 ? 3 : 2);
      const p = g.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) { const k = 1 + 0.16 * vn(p.getX(i) * 2 + seed, p.getZ(i) * 2 + p.getY(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
      g.computeVertexNormals();
      const col = rockCols[Math.floor(rr() * rockCols.length)], fy = s * (0.45 + 0.2 * rr());
      const y0 = floorY(x, z);
      return clean(tf(g, M(x, y0 + fy * 0.35, z, rr() * 6, 0, 0, [s * (1 + 0.3 * rr()), fy, s])), (q) => mossy && q.y > y0 + fy * 0.5 ? lerpC(col, "#7f9a5a", 0.45) : new THREE.Color(col));
    };
    for (let i = 0; i < 70; i++) { const a = r() * 6.28, d = 0.9 + 5.5 * Math.sqrt(r()), x = Math.cos(a) * d, z = -1.5 + Math.sin(a) * d * 1.3; if (clearZone(x, z, 0.1) && r() < 0.6) continue; SR.push(rock(x, z, 0.05 + 0.08 * r(), 100 + i, false)); }
    const boulders: [number, number, number][] = [[-1.9, -2.6, 0.42], [2.4, -3.8, 0.55], [-3.2, -6.5, 0.8], [0.9, -8.2, 0.6], [3.6, -1.2, 0.5], [-2.2, 1.0, 0.35], [-4.6, -2.0, 0.9], [4.4, -7.4, 1.0], [-0.6, -12.5, 1.1], [1.6, 1.6, 0.3], [-1.3, -9.8, 0.5]];
    boulders.forEach(([x, z, s], i) => SR.push(rock(x, z, s, 300 + i, true)));
    // the sunken log (mossy, two snapped branches)
    SB.push(clean(tubeAlong([V3(-2.6, 0.12, -3.9), V3(-0.8, 0.2, -4.5), V3(1.2, 0.16, -5.2)], 0.2, 0.16, 10, 10), (p) => p.y > 0.3 ? lerpC("#ffffff", "#9ac070", 0.5) : new THREE.Color("#ffffff")));
    SB.push(clean(tubeAlong([V3(-1.4, 0.28, -4.3), V3(-1.2, 0.62, -4.0), V3(-1.25, 0.9, -3.95)], 0.06, 0.035, 5, 6), "#ffffff"));
    SB.push(clean(tubeAlong([V3(0.4, 0.25, -4.95), V3(0.75, 0.5, -5.3), V3(0.85, 0.62, -5.6)], 0.05, 0.03, 5, 6), "#ffffff"));
    // fiddleheads + club moss + little fern sprouts on the floor (in frame below the tadpole)
    const sprouts: [number, number][] = [[-0.75, -1.3], [0.7, -0.9], [-0.35, -2.6], [0.45, -2.3], [-1.05, -0.4], [1.1, -1.9], [0.15, -3.4], [-0.9, -3.6], [1.25, 0.4], [-1.3, 0.9], [0.95, -4.3], [-0.2, -5.4]];
    sprouts.forEach(([x, z], i) => {
      const y = floorY(x, z), k = rng(500 + i);
      if (i % 6 === 0) SP.push(tf(clubmoss(600 + i), M(x, y, z, k() * 6, 0, 0, 1.3)));
      else if (i % 3 === 0) SP.push(tf(waterFern(0.22, 650 + i, i % 2 ? ["#8a3a3a", "#b8443e", "#f08a5a"] : undefined), M(x, y - 0.01, z, k() * 6)));
      else for (let j = 0; j < 2; j++) SP.push(tf(fiddle(0.3 + 0.2 * k(), 700 + i * 5 + j), M(x + (k() - 0.5) * 0.18, y, z + (k() - 0.5) * 0.18, k() * 6.28, (k() - 0.5) * 0.3, (k() - 0.5) * 0.3)));
    });
    // lily pads: instanced discs (one notch) + trailing stems to the floor
    const padShape = new THREE.Shape();
    padShape.moveTo(0, 0); padShape.absarc(0, 0, 1, 0.22, Math.PI * 2 - 0.02, false); padShape.lineTo(0, 0);
    const padG = new THREE.ExtrudeGeometry(padShape, { depth: 0.022, bevelEnabled: false, curveSegments: 28 });
    padG.rotateX(-Math.PI / 2); padG.translate(0, -0.016, 0);
    { const p = padG.getAttribute("position") as THREE.BufferAttribute, uv = padG.getAttribute("uv") as THREE.BufferAttribute; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getZ(i) * 0.5 + 0.5); }
    const pads: [number, number, number][] = [];
    for (let i = 0; i < 200 && pads.length < 46; i++) {
      const x = (r() - 0.5) * 7.5, z = 1.5 - Math.pow(r(), 0.85) * 15, s = 0.22 + 0.22 * r();
      if (Math.abs(x) < 0.75 && z > -1.2) continue;
      if (ell(x, z) > 1.35) continue;
      if (pads.some(([a, b, c]) => Math.hypot(a - x, b - z) < (c + s) * 1.05)) continue;
      pads.push([x, z, s]);
    }
    const padMat = pmat("pondPad", { map: padTex() }, 0);
    const padI = new THREE.InstancedMesh(padG, padMat, pads.length);
    const padCols = ["#ffffff", "#e6f3d0", "#f5ffe0", "#d6e8b8"];
    pads.forEach(([x, z, s], i) => {
      padI.setMatrixAt(i, M(x, SURF, z, r() * 6.28, 0, 0, [s, 1, s]));
      padI.setColorAt(i, new THREE.Color(padCols[i % 4]));
      const fy = floorY(x, z), ax = x * 0.15 + (r() - 0.5) * 0.4, az2 = (r() - 0.5) * 0.4;
      if (i % 2 === 0 && !lane(x, z)) SP.push(clean(tubeAlong([V3(x, SURF - 0.02, z), V3(x + ax * 0.4 + 0.06, SURF - 0.7, z + az2 * 0.4), V3(x + ax, (SURF + fy) / 2 - 0.2, z + az2), V3(x + ax * 1.2, fy, z + az2 * 1.3)], 0.009, 0.011, 12, 5), "#6c9a48"));
    });
    padI.castShadow = true; padI.receiveShadow = true; padI.frustumCulled = false; R.add(padI);
    // a few water-lily flowers on the pads (above water; seen when surfacing)
    pads.filter((_, i) => i % 5 === 1).forEach(([x, z, s], i) => {
      const L: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 10; k++) { const pg = new THREE.SphereGeometry(1, 6, 4); pg.scale(0.035, 0.012, 0.1); pg.translate(0, 0, 0.08); L.push(clean(tf(pg, M(0, 0.03 + (k > 4 ? 0.02 : 0), 0, (k / 5) * 6.28 + (k > 4 ? 0.6 : 0), k > 4 ? -0.9 : -0.45)), k > 4 ? "#ffd6e6" : "#ff9fc4")); }
      L.push(clean(new THREE.SphereGeometry(0.03, 8, 6).translate(0, 0.05, 0), "#ffd24a"));
      SP.push(tf(merge(L), M(x + s * 0.2, SURF + 0.005, z - s * 0.15, i * 1.3, 0, 0, 1.3)));
    });
    // shore: tree ferns, cycads, horsetails on the banks (above the surface)
    for (let i = 0, nTF = 0, nC = 0; i < 1500 && (nTF < 34 || nC < 26); i++) {
      const a = r() * 6.28, d = 1.42 + 0.45 * r(), x = Math.cos(a) * d * 10, z = -3 + Math.sin(a) * d * 12.5, y = floorY(x, z);
      if (y < SURF + 0.2) continue;
      if (nTF < 34 && r() < 0.55) { SB.push(tf(treeFern(2.2 + 2.2 * r(), 800 + i), M(x, y - 0.1, z, r() * 6.28))); nTF++; }
      else if (nC < 26) { SP.push(tf(cycad(900 + i), M(x, y - 0.05, z, r() * 6.28, 0, 0, 0.8 + 0.6 * r()))); nC++; }
    }
    for (let i = 0, n = 0; i < 900 && n < 70; i++) {
      const a = r() * 6.28, d = 1.28 + 0.4 * r(), x = Math.cos(a) * d * 10, z = -3 + Math.sin(a) * d * 12.5, y = floorY(x, z);
      if (y < SURF + 0.05 || y > SURF + 1.2) continue;
      for (let k = 0; k < 4; k++) SP.push(tf(horsetail(0.9 + 1.2 * r(), 1000 + n * 4 + k), M(x + (r() - 0.5) * 0.5, y - 0.03, z + (r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.15, (r() - 0.5) * 0.15)));
      n++;
    }
    // far volcano (air world)
    SR.push(clean(tf(new THREE.CylinderGeometry(9, 75, 60, 24, 4, true), M(-140, 26, -460)), (p) => lerpC("#7a6a74", "#5a4a58", (p.y - 26) / 60 + 0.5)));
    const bake = (list: THREE.BufferGeometry[], mat: THREE.Material) => { const m = new THREE.Mesh(merge(list), mat); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.matrixAutoUpdate = false; R.add(m); return m; };
    bake(SP, plantMat); bake(SR, rockMat); bake(SB, barkMat);

    // ---------------- swaying reeds + water ferns (instanced) ----------------
    const clusters: [number, number, number][] = [[-1.25, -1.8, 5], [-1.75, -4.3, 6], [-2.5, -0.7, 5], [-1.15, -7.6, 6], [1.35, -2.6, 5], [2.15, -0.9, 5], [1.7, -6.1, 6], [0.5, -10.5, 7], [-3.6, -9.5, 8], [3.2, -11, 8], [-2.9, 2.2, 5], [2.8, 2.8, 5], [-5.5, -4.5, 7], [5.2, -5.0, 7]];
    const REEDH = [2.6, 2.95, 3.3, 3.7];
    const reedVar = REEDH.map((h, k) => cattail(h, 2000 + k, k % 2 === 0));
    const fernVar = [0, 1, 2, 3].map((k) => waterFern(0.5, 2100 + k, k === 3 ? ["#8a3a3a", "#b8443e", "#f08a5a"] : undefined));
    const reedI: Inst[][] = reedVar.map(() => []), fernI: Inst[][] = fernVar.map(() => []);
    clusters.forEach(([cx, cz, n], ci) => {
      for (let k = 0; k < n; k++) {
        const x = cx + (r() - 0.5) * 0.7, z = cz + (r() - 0.5) * 0.7;
        if (lane(x, z)) continue;
        const y = floorY(x, z), h = SURF - y + 0.35 + 1.1 * r();
        let vi = 0; for (let j = 1; j < 4; j++) if (Math.abs(REEDH[j] - h) < Math.abs(REEDH[vi] - h)) vi = j;
        reedI[vi].push({ x, y: y - 0.02, z, yaw: r() * 6.28, s: h / REEDH[vi], ph: r() * 6.28, amp: 0.012 + 0.01 * r() });
      }
      for (let k = 0; k < 3; k++) {
        const x = cx + (r() - 0.5) * 1.2, z = cz + (r() - 0.5) * 1.2;
        if (clearZone(x, z, 0.3)) continue;
        fernI[(ci + k) % 4].push({ x, y: floorY(x, z) - 0.02, z, yaw: r() * 6.28, s: 0.7 + 0.9 * r(), ph: r() * 6.28, amp: 0.05 + 0.03 * r() });
      }
    });
    for (let k = 0; k < 18; k++) { const x = (r() - 0.5) * 7, z = -2 - r() * 10; if (clearZone(x, z, 0.3)) continue; fernI[k % 4].push({ x, y: floorY(x, z) - 0.02, z, yaw: r() * 6.28, s: 0.5 + 0.8 * r(), ph: r() * 6.28, amp: 0.05 + 0.03 * r() }); }
    const mkSway = (geos: THREE.BufferGeometry[], insts: Inst[][]) => geos.forEach((g, i) => {
      if (!insts[i].length) return;
      const m = new THREE.InstancedMesh(g, plantMat, insts[i].length);
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; R.add(m);
      this.sway.push({ mesh: m, inst: insts[i] });
    });
    mkSway(reedVar, reedI); mkSway(fernVar, fernI);
    this.animate(0);

    // ---------------- water surface, rays, bubbles, motes, air sky ----------------
    this.surfM = surfMat();
    const sg = new THREE.PlaneGeometry(160, 160, 1, 1); sg.rotateX(-Math.PI / 2); sg.translate(0, SURF, -10);
    this.surf = new THREE.Mesh(sg, this.surfM); this.surf.layers.set(NOINK); this.surf.frustumCulled = false; this.surf.renderOrder = 2; R.add(this.surf);
    this.rays = raysMesh(34, 77); R.add(this.rays);
    this.bubbles = bubblesMesh([[-0.6, -1.6], [0.85, -3.2], [-1.4, -5.0], [1.9, -1.8]], 91); R.add(this.bubbles);
    this.motes = motesMesh(260, 55); R.add(this.motes);
    this.sky = airSky(); R.add(this.sky);
    // fog hook: drawn first (renderOrder), invisible; above the water it turns the scene fog into a light air haze
    const hook = new THREE.Mesh(new THREE.PlaneGeometry(0.001, 0.001), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }));
    hook.frustumCulled = false; hook.renderOrder = -1e6; hook.layers.set(NOINK);
    hook.onBeforeRender = (_r, scene) => {
      const fog = scene.fog as THREE.Fog | null;
      if (!fog || this.airBelow || !this.root.visible) return;
      fog.color.copy(this.fogC); fog.near = 40; fog.far = 520;
    };
    R.add(hook);
  }

  /** the world's camera-relative sun for shot 3 (same formula as world.shotSun) */
  private sun(): THREE.Vector3 {
    if (this.sunDir) return this.sunDir;
    const s = SHOTS[2], L = LOOKS.pond;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(3, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    this.sunDir = V3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    return this.sunDir;
  }
  /** swaying plants: a rigid lean about the base (the ink pass sees the same instance matrices) */
  private animate(t: number) {
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
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    const R = this.root;
    R.visible = id === 3;
    if (!R.visible) return;
    const sun = this.sun(), below = cam.position.y < POND[1] + SURF;
    // scene fog: water (the look's fog) below the surface, a light warm haze above it
    // (the scene's fog is switched by the fogHook just before the first draw: robust on the very first frame too)
    const LF = LOOKS.pond.fog;
    this.airBelow = below;
    if (below) untone(LF[0], this.fogC); else untone(AIR_FOG, this.fogC);
    const fogC = this.fogC, fogN = below ? LF[1] : 40, fogF = below ? LF[2] : 520;
    if (!below) { // the air world: warm late-morning sun, blue shade (the look's rig is the underwater one)
      TONE.uLitCol.value.set(1.85, 1.6, 1.25); TONE.uShadeCol.value.set(0.3, 0.34, 0.52); TONE.uShadeLift.value.set(0.03, 0.03, 0.05);
      CHAR.uCharTint.value.set(1.0, 0.95, 0.88); CHAR.uSideTint.value.set(0.88, 0.9, 0.98);
    }
    CAUS.uCT.value = t;
    // surface
    const su = this.surfM.uniforms;
    su.uT.value = t; su.uSun.value.copy(sun); su.uBelow.value = below ? 1 : 0;
    su.uFog.value.copy(fogC); su.uFogN.value = fogN; su.uFogF.value = fogF;
    untone("#f2fff4", su.uWin.value).multiplyScalar(1.25); untone("#bfeedd", su.uRim.value); untone("#2e6a4a", su.uSil.value); untone("#6fc3ad", su.uMir.value);
    untone("#5a9ad6", this.airTop); untone("#e9e4c8", this.airHor); untone("#a8cce0", this.airMid);
    su.uAirTop.value.copy(this.airTop); su.uAirHor.value.copy(this.airHor);
    this.surfM.transparent = !below;
    // rays follow the sun down into the water
    const ru = (this.rays.material as THREE.ShaderMaterial).uniforms;
    ru.uT.value = t; ru.uDir.value.copy(sun).negate(); ru.uCol.value.set(1.0, 1.08, 0.72); ru.uK.value = below ? 1 : 0.35;
    ru.uFogN.value = fogN; ru.uFogF.value = below ? fogF : 30;
    const bu = (this.bubbles.material as THREE.ShaderMaterial).uniforms;
    bu.uT.value = t; bu.uFogN.value = below ? fogN : 3; bu.uFogF.value = below ? fogF : 30; bu.uFog.value.copy(fogC); untone("#e8fff6", bu.uRim.value);
    const mu = (this.motes.material as THREE.ShaderMaterial).uniforms;
    mu.uT.value = t; mu.uCol.value.set(0.5, 0.55, 0.38); mu.uFogF.value = below ? fogF : 30;
    this.motes.visible = below;
    // air sky
    this.sky.visible = !below;
    if (!below) {
      const ku = (this.sky.material as THREE.ShaderMaterial).uniforms;
      ku.uTop.value.copy(this.airTop); ku.uMid.value.copy(this.airMid); ku.uHor.value.copy(this.airHor);
      this.sky.position.copy(cam.position).sub(R.position);
    }
    this.animate(t);
  }
}
