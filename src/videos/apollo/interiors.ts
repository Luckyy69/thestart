// OWNER: interiors agent. Command-module cabin at CABIN + 1969 Mission Control at MCC.
// Both sets use their OWN light rig (interior point lights evaluated per pixel in a small shader, `IMat`), so they look
// the same whatever the outdoor sun / look does: the cabin is lit by warm floods (dimmed by cabinAt().power), cool storm
// light from its windows, panel lamp glow and a pulsing red alarm light (cabinAt().warn); Mission Control is a dim
// blue-violet room lit by its ceiling panels, the big wall screens and the rows of CRTs. Every screen / lamp / matrix
// tile is an HDR emissive (> 1) so the bloom picks it up. Nothing here casts sun shadows (the cast cards stay lit).
// All animation is a pure function of (id, t): CRT glyphs are hashed per cell and per frame in the shader.
// Contracts for other owners (exported below):
//   CABIN_COUCH  : couch seat front edge x / seat top y / z of each crew couch (local to CABIN)
//   MCC_SEATS    : every console seat in Mission Control (local to MCC: x, floor y, z; the console is at -z of the seat,
//                  its CRTs face +z, i.e. the seated controller). Aaron = MCC_SEATS.find(s => s.name === "EECOM")
//                  = SEATS.aaron; FLIGHT = SEATS.flight. Row D (z = 5.2) stands on a 0.35 m riser.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { CABIN, MCC, SEATS, FPS, cabinAt, switchAt, screensAt, strikeNow } from "./story";

// ============================================================ shared shader bits
const NL = 14;
const VS = /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIGHT = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
vec3 lightAt(vec3 p, vec3 n){
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); float r = sqrt(r2);
    float ndl = dot(n, d / max(r, 1e-4));
    float w = smoothstep(-0.2, 0.55, ndl);
    L += uLC[i] * w / (1.0 + r2 / (uLR[i] * uLR[i]));
  }
  return L;
}
vec3 faceN(){ vec3 n = normalize(vN); return dot(n, cameraPosition - vW) < 0.0 ? -n : n; }`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEmCol; uniform float uGain; uniform float uEmK;
#ifdef HAS_MAP
uniform sampler2D uMap;
#endif
#ifdef HAS_EM
uniform sampler2D uEm;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
${LIGHT}
void main(){
  vec3 n = faceN(); vec3 a = uCol;
#ifdef HAS_MAP
  a *= texture2D(uMap, vUv).rgb;
#endif
  vec3 c = a * lightAt(vW, n) + uEmCol * uEmK;
#ifdef HAS_EM
  c += texture2D(uEm, vUv).rgb * uGain * uEmK;
#endif
  gl_FragColor = vec4(c, 1.0);
}`;
const HASH = /* glsl */ `float h2(vec2 p){ p = fract(p * vec2(0.1031, 0.1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }`;
/** glyph atlas: 16 x 4 cells, index 63 = blank */
const CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.:-+/*#=<>()%$&?!";
const atlas = () => {
  const t = ctex("apGlyphs", 1024, 256, (g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 256);
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 54px monospace";
    for (let i = 0; i < CHARS.length; i++) g.fillText(CHARS[i], (i % 16) * 64 + 32, Math.floor(i / 16) * 64 + 34, 52);
  });
  t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4;
  return t;
};
const GLYPH = /* glsl */ `uniform sampler2D uAtlas;
float glyph(float gi, vec2 p){ // p = continuous cell coordinate (x right, y down)
  if (gi > 62.5) return 0.0;
  vec2 f = fract(p); f = (f - 0.5) * vec2(1.0, 1.12) + 0.5;
  if (f.y < 0.0 || f.y > 1.0) return 0.0;
  vec2 a = vec2(mod(gi, 16.0), floor(gi / 16.0));
  vec2 auv = vec2((a.x + f.x) / 16.0, 1.0 - (a.y + f.y) / 4.0);
  vec2 dx = dFdx(p) / vec2(16.0, -4.0), dy = dFdy(p) / vec2(16.0, -4.0);
  return textureGrad(uAtlas, auv, dx, dy).r;
}`;

type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => new THREE.Vector3(0, -999, 0));
  const lc = Array.from({ length: NL }, () => new THREE.Vector3());
  const lr = Array.from({ length: NL }, () => 1);
  return { lp, lc, lr, u: { uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: new THREE.Vector3() }, uAD: { value: new THREE.Vector3() }, uEmK: { value: 1 } } };
};
const lin = (hex: string) => new THREE.Color(hex);
type MOpt = { col?: string; map?: THREE.Texture; em?: THREE.Texture; emCol?: [number, number, number]; gain?: number };
const imat = (S: LSet, o: MOpt) => {
  const defines: Record<string, string> = {};
  if (o.map) defines.HAS_MAP = "1";
  if (o.em) defines.HAS_EM = "1";
  return new THREE.ShaderMaterial({
    uniforms: { ...S.u, uCol: { value: lin(o.col ?? "#ffffff") }, uEmCol: { value: new THREE.Vector3(...(o.emCol ?? [0, 0, 0])) }, uGain: { value: o.gain ?? 1 }, uMap: { value: o.map ?? null }, uEm: { value: o.em ?? null } },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide,
  });
};

// ============================================================ geometry helpers
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const clean = (g: THREE.BufferGeometry, extra: string[] = []) => {
  const s = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv", ...extra]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(out.getAttribute("position").count * 2), 2));
  return out;
};
class Bat {
  m = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(g: THREE.BufferGeometry, mat: THREE.Material, mx?: THREE.Matrix4) {
    const c = clean(g); if (mx) c.applyMatrix4(mx);
    const l = this.m.get(mat); if (l) l.push(c); else this.m.set(mat, [c]);
  }
  box(mat: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, mx?: THREE.Matrix4) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(g, mat, mx);
  }
  build(parent: THREE.Object3D) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = false; mesh.receiveShadow = false; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      parent.add(mesh);
    }
    this.m.clear();
  }
}
/** matrix from position + local axes (x = u, y = v, z = n) */
const basis = (p: THREE.Vector3, u: THREE.Vector3, v: THREE.Vector3, n: THREE.Vector3) => new THREE.Matrix4().makeBasis(u, v, n).setPosition(p);
const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V3(1, 1, 1));
/** grid surface; fn(u,v) -> point; normals from finite differences, oriented toward `inside(p)` */
const surfGeo = (nu: number, nv: number, fn: (u: number, v: number) => THREE.Vector3, toward: (p: THREE.Vector3) => THREE.Vector3, uv = (u: number, v: number) => [u, v]) => {
  const pos: number[] = [], nor: number[] = [], uvs: number[] = [];
  const P = (u: number, v: number) => fn(u, v);
  const N = (u: number, v: number) => {
    const e = 1e-3, p = P(u, v);
    const du = P(Math.min(1, u + e), v).sub(P(Math.max(0, u - e), v)), dv = P(u, Math.min(1, v + e)).sub(P(u, Math.max(0, v - e)));
    const n = du.cross(dv).normalize();
    if (n.dot(toward(p)) < 0) n.negate();
    return n;
  };
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const q = [[i / nu, j / nv], [(i + 1) / nu, j / nv], [(i + 1) / nu, (j + 1) / nv], [i / nu, (j + 1) / nv]];
    const pts = q.map(([u, v]) => P(u, v)), ns = q.map(([u, v]) => N(u, v));
    let tri = [0, 1, 2, 0, 2, 3];
    const fn0 = pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0]));
    if (fn0.dot(ns[0]) < 0) tri = [0, 2, 1, 0, 3, 2];
    for (const k of tri) { pos.push(pts[k].x, pts[k].y, pts[k].z); nor.push(ns[k].x, ns[k].y, ns[k].z); const t = uv(q[k][0], q[k][1]); uvs.push(t[0], t[1]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return g;
};
const plane = (w: number, h: number) => new THREE.PlaneGeometry(w, h);
const off = (o: THREE.Object3D) => { o.traverse((c) => { c.castShadow = false; c.receiveShadow = false; }); };

// ============================================================ canvas painting helpers
type G = CanvasRenderingContext2D;
const LABELS = ["NORM", "AUX", "OFF", "ON", "SPS", "RCS", "CM", "SM", "PITCH", "YAW", "ROLL", "AUTO", "MAN", "ARM", "SAFE", "PRIM", "SEC", "FUEL", "OXID",
  "PRESS", "TEMP", "QTY", "O2", "H2", "N2", "BUS A", "BUS B", "AC 1", "AC 2", "FC 1", "FC 2", "FC 3", "CRYO", "GLY", "EVAP", "ELS", "EDS", "LV", "TVC",
  "GMBL", "SCS", "BMAG", "EMS", "DELTA V", "TEST", "RESET", "CLOSE", "OPEN", "START", "STOP", "ENTRY", "LOGIC", "PYRO", "BAT A", "BAT B", "BAT C", "S-BAND", "VHF", "UPLINK", "TLM"];
const SECT = ["SERVICE PROPULSION", "ENTRY MONITOR", "STABILIZATION & CONTROL", "CAUTION & WARNING", "ELECTRICAL POWER", "ENVIRONMENT", "CRYOGENICS", "SEQUENTIAL EVENTS", "COMMUNICATIONS", "FUEL CELLS", "LAUNCH VEHICLE", "CM RCS"];
const txt = (g: G, s: string, x: number, y: number, px: number, col = "#f4f1e6", align: CanvasTextAlign = "center") => {
  g.font = `bold ${Math.max(6, Math.round(px))}px sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const noise = (g: G, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
};
const LAMPC = ["#7dff9a", "#ffbf3a", "#f4f4ff", "#5ec8ff", "#ff4a3a", "#9dff5a"];

// ============================================================ the CABIN
// cone shell around a vertical axis at x = AX: radius R(y); main display console = band on the cone toward +x
const AX = 0.35, R = (y: number) => 2.75 - 0.62 * y, TOP = 2.9;
const TH0 = -1.1, TH1 = 1.1, PY0 = 0.72, PY1 = 2.06, PIN = 0.1; // main panel: angle range (rad), heights, inset
const PANEL_W = 2.2 * 1.85, PANEL_H = (PY1 - PY0) * Math.hypot(1, 0.62);
const PPX = 2048 / PANEL_W, PPY = 1024 / PANEL_H; // canvas px per metre
/** point + local frame on the main panel at (u,v), lifted `o` metres off the face toward the crew */
const pSurf = (u: number, v: number, o = 0) => {
  const th = TH0 + u * (TH1 - TH0), y = PY0 + v * (PY1 - PY0), r = R(y) - PIN;
  const tu = V3(-Math.sin(th), 0, Math.cos(th));
  const tv = V3(-0.62 * Math.cos(th), 1, -0.62 * Math.sin(th)).normalize();
  const n = tu.clone().cross(tv).normalize(); // toward the axis (and a little down)
  const p = V3(AX + r * Math.cos(th), y, r * Math.sin(th)).addScaledVector(n, o);
  return { p, tu, tv, n };
};
type Tog = { u: number; v: number; up: boolean };
type Gau = { u: number; v: number; r: number };
const CW = { u0: 0.405, u1: 0.6, v0: 0.69, v1: 0.93 }; // caution & warning matrix on the main panel
const FDAI = [{ u: 0.215, v: 0.5 }, { u: 0.79, v: 0.5 }];
const DSKY = { u0: 0.43, u1: 0.575, v0: 0.08, v1: 0.6 };
const MA = [{ u: 0.375, v: 0.84 }, { u: 0.63, v: 0.84 }]; // master alarm push-lights

const paintPanel = (g: G, e: G, r: () => number, W: number, H: number, ppx: number, ppy: number, zones: { u0: number; u1: number; v0: number; v1: number }[], togs: Tog[], gaus: Gau[], title: boolean) => {
  // background: CM grey-green with brushed noise
  g.fillStyle = "#93a09a"; g.fillRect(0, 0, W, H);
  noise(g, W, H, r, 9000, 0.05);
  e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
  const X = (u: number) => u * W, Y = (v: number) => (1 - v) * H;
  for (const z of zones) {
    const x0 = X(z.u0) + 4, x1 = X(z.u1) - 4, y0 = Y(z.v1) + 4, y1 = Y(z.v0) - 4;
    // sub-panel plate with seam + screws
    g.fillStyle = "#a3aea8"; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = "#3b4440"; g.lineWidth = 4; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    g.fillStyle = "#5d6762";
    for (const [sx, sy] of [[x0 + 9, y0 + 9], [x1 - 9, y0 + 9], [x0 + 9, y1 - 9], [x1 - 9, y1 - 9]]) { g.beginPath(); g.arc(sx, sy, 4, 0, 7); g.fill(); }
    // section title placard
    let yy = y0 + 12;
    if (title) {
      g.fillStyle = "#1e2422"; g.fillRect(x0 + 20, yy, x1 - x0 - 40, 0.026 * ppy);
      txt(g, SECT[Math.floor(r() * SECT.length)], (x0 + x1) / 2, yy + 0.013 * ppy, 0.016 * ppy, "#e9e4d2");
      yy += 0.04 * ppy;
    }
    // rows of instruments
    while (yy < y1 - 0.07 * ppy) {
      const k = r(), rowH = k < 0.3 ? 0.11 : k < 0.55 ? 0.1 : k < 0.75 ? 0.06 : k < 0.9 ? 0.07 : 0.05;
      if (yy + rowH * ppy > y1 - 8) break;
      const cy = yy + rowH * ppy * 0.5;
      const span = x1 - x0 - 30;
      if (k < 0.3) { // toggle switches with labels
        const n = Math.max(2, Math.floor(span / (0.055 * ppx)));
        for (let i = 0; i < n; i++) {
          const cx = x0 + 15 + (i + 0.5) * (span / n);
          txt(g, LABELS[Math.floor(r() * LABELS.length)], cx, cy - 0.036 * ppy, 0.0125 * ppy, "#1c201e");
          g.fillStyle = "#2a2f2d"; g.beginPath(); g.ellipse(cx, cy, 0.011 * ppx, 0.011 * ppy, 0, 0, 7); g.fill();
          g.fillStyle = "#c9cfcc"; g.beginPath(); g.ellipse(cx, cy, 0.006 * ppx, 0.006 * ppy, 0, 0, 7); g.fill();
          togs.push({ u: cx / W, v: 1 - cy / H, up: r() < 0.55 });
          if (r() < 0.35) { g.fillStyle = "#e8e2c9"; g.fillRect(cx - 0.016 * ppx, cy + 0.024 * ppy, 0.032 * ppx, 0.012 * ppy); }
        }
      } else if (k < 0.55) { // round gauges
        const rad = 0.034 + r() * 0.012;
        const n = Math.max(1, Math.floor(span / ((2 * rad + 0.03) * ppx)));
        for (let i = 0; i < n; i++) {
          const cx = x0 + 15 + (i + 0.5) * (span / n);
          g.fillStyle = "#111"; g.beginPath(); g.ellipse(cx, cy, (rad + 0.004) * ppx, (rad + 0.004) * ppy, 0, 0, 7); g.fill();
          g.fillStyle = "#f2efe4"; g.beginPath(); g.ellipse(cx, cy, rad * ppx, rad * ppy, 0, 0, 7); g.fill();
          e.fillStyle = "rgba(255,240,210,0.18)"; e.beginPath(); e.ellipse(cx, cy, rad * ppx, rad * ppy, 0, 0, 7); e.fill();
          g.strokeStyle = "#111"; g.lineWidth = 2;
          for (let a = -2.4; a <= 2.41; a += 0.4) { g.beginPath(); g.moveTo(cx + Math.sin(a) * rad * 0.8 * ppx, cy - Math.cos(a) * rad * 0.8 * ppy); g.lineTo(cx + Math.sin(a) * rad * 0.95 * ppx, cy - Math.cos(a) * rad * 0.95 * ppy); g.stroke(); }
          g.fillStyle = "#d33"; g.beginPath(); g.moveTo(cx + Math.sin(1.6) * rad * 0.8 * ppx, cy - Math.cos(1.6) * rad * 0.8 * ppy); g.arc(cx, cy, rad * 0.9 * ppx, 1.6 - Math.PI / 2, 2.4 - Math.PI / 2); g.closePath(); g.fill();
          const a = -2 + r() * 3.6; g.strokeStyle = "#111"; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * rad * 0.85 * ppx, cy - Math.cos(a) * rad * 0.85 * ppy); g.stroke();
          txt(g, LABELS[Math.floor(r() * LABELS.length)], cx, cy + rad * 0.45 * ppy, 0.009 * ppy, "#222");
          gaus.push({ u: cx / W, v: 1 - cy / H, r: rad });
        }
      } else if (k < 0.75) { // annunciator / push-light row (lit)
        const n = Math.max(3, Math.floor(span / (0.045 * ppx)));
        for (let i = 0; i < n; i++) {
          const cx = x0 + 15 + (i + 0.5) * (span / n), w = 0.034 * ppx, h = 0.026 * ppy;
          g.fillStyle = "#1a1d1c"; g.fillRect(cx - w / 2 - 3, cy - h / 2 - 3, w + 6, h + 6);
          const c = LAMPC[Math.floor(r() * LAMPC.length)], lit = r() < 0.6;
          g.fillStyle = lit ? c : "#4b514e"; g.fillRect(cx - w / 2, cy - h / 2, w, h);
          if (lit) { e.fillStyle = c; e.fillRect(cx - w / 2, cy - h / 2, w, h); }
          txt(g, LABELS[Math.floor(r() * LABELS.length)], cx, cy, 0.009 * ppy, "#151515");
        }
      } else if (k < 0.9) { // vertical tape meters / breakers
        const n = Math.max(3, Math.floor(span / (0.03 * ppx)));
        const tape = r() < 0.5;
        for (let i = 0; i < n; i++) {
          const cx = x0 + 15 + (i + 0.5) * (span / n);
          if (tape) {
            const w = 0.014 * ppx, h = rowH * 0.8 * ppy, f = 0.3 + r() * 0.6;
            g.fillStyle = "#111"; g.fillRect(cx - w / 2, cy - h / 2, w, h);
            g.fillStyle = "#ffffff"; g.fillRect(cx - w / 2 + 2, cy + h / 2 - h * f, w - 4, h * f - 2);
            e.fillStyle = "rgba(255,200,120,0.55)"; e.fillRect(cx - w / 2 + 2, cy + h / 2 - h * f, w - 4, h * f - 2);
          } else {
            g.fillStyle = "#151515"; g.beginPath(); g.ellipse(cx, cy, 0.008 * ppx, 0.008 * ppy, 0, 0, 7); g.fill();
            g.fillStyle = "#eeeeee"; g.beginPath(); g.ellipse(cx, cy, 0.004 * ppx, 0.004 * ppy, 0, 0, 7); g.fill();
          }
        }
      } else { // label strip
        g.fillStyle = "#e9e4d2"; g.fillRect(x0 + 20, cy - 0.012 * ppy, span - 10, 0.024 * ppy);
        txt(g, SECT[Math.floor(r() * SECT.length)], (x0 + x1) / 2, cy, 0.015 * ppy, "#1b1f1d");
      }
      yy += rowH * ppy + 0.008 * ppy;
    }
  }
};
/** main display console albedo + emissive (shared layout lists the 3D toggles / gauges) */
const MDC: { tog: Tog[]; gau: Gau[]; alb?: THREE.Texture; em?: THREE.Texture } = { tog: [], gau: [] };
const buildMDCTex = () => {
  if (MDC.alb) return MDC;
  const W = 2048, H = 1024, r = rng(1969);
  const cv = document.createElement("canvas"), ce = document.createElement("canvas");
  cv.width = ce.width = W; cv.height = ce.height = H;
  const g = cv.getContext("2d")!, e = ce.getContext("2d")!;
  const zones = [
    { u0: 0.0, u1: 0.12, v0: 0.04, v1: 0.97 }, { u0: 0.12, u1: 0.31, v0: 0.66, v1: 0.97 }, { u0: 0.12, u1: 0.31, v0: 0.04, v1: 0.36 },
    { u0: 0.31, u1: 0.4, v0: 0.04, v1: 0.97 }, { u0: 0.6, u1: 0.69, v0: 0.04, v1: 0.97 },
    { u0: 0.69, u1: 0.88, v0: 0.66, v1: 0.97 }, { u0: 0.69, u1: 0.88, v0: 0.04, v1: 0.36 }, { u0: 0.88, u1: 1.0, v0: 0.04, v1: 0.97 },
  ];
  paintPanel(g, e, r, W, H, PPX, PPY, zones, MDC.tog, MDC.gau, true);
  const X = (u: number) => u * W, Y = (v: number) => (1 - v) * H;
  // FDAI wells
  for (const f of FDAI) {
    g.fillStyle = "#2b302e"; g.fillRect(X(f.u - 0.09), Y(f.v + 0.15), 0.18 * W, 0.3 * H);
    g.strokeStyle = "#111"; g.lineWidth = 5; g.strokeRect(X(f.u - 0.09), Y(f.v + 0.15), 0.18 * W, 0.3 * H);
    txt(g, "ATTITUDE", X(f.u), Y(f.v + 0.125), 0.016 * PPY, "#e9e4d2");
    g.fillStyle = "#121514"; g.beginPath(); g.ellipse(X(f.u), Y(f.v), 0.12 * PPX, 0.12 * PPY, 0, 0, 7); g.fill();
    // roll scale ticks
    g.strokeStyle = "#f0f0f0"; g.lineWidth = 3;
    for (let a = 0; a < 6.28; a += 0.26) { g.beginPath(); g.moveTo(X(f.u) + Math.sin(a) * 0.105 * PPX, Y(f.v) - Math.cos(a) * 0.105 * PPY); g.lineTo(X(f.u) + Math.sin(a) * 0.118 * PPX, Y(f.v) - Math.cos(a) * 0.118 * PPY); g.stroke(); }
    // rate needles (lit orange)
    e.fillStyle = "#ff9a2a"; e.fillRect(X(f.u) - 3, Y(f.v + 0.135), 6, 18); e.fillRect(X(f.u + 0.075), Y(f.v) - 3, 18, 6);
  }
  // DSKY: green EL display + keys
  {
    const d = DSKY, x0 = X(d.u0), x1 = X(d.u1), y0 = Y(d.v1), y1 = Y(d.v0), mid = y0 + (y1 - y0) * 0.5;
    g.fillStyle = "#3a403e"; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.strokeStyle = "#111"; g.lineWidth = 6; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    // indicator lamps (left top) + display (right top)
    const lx = x0 + 12, lw = (x1 - x0) * 0.42, dx = x0 + lw + 24, dw = x1 - dx - 12;
    const LAB = ["UPLINK ACTY", "TEMP", "NO ATT", "GIMBAL LOCK", "STBY", "PROG", "KEY REL", "RESTART", "OPR ERR", "TRACKER"];
    for (let i = 0; i < 10; i++) {
      const cx = lx + (i % 2) * (lw / 2), cy = y0 + 12 + Math.floor(i / 2) * ((mid - y0 - 24) / 5);
      const lit = i === 1 || i === 6 || i === 8;
      g.fillStyle = lit ? "#ffd38a" : "#c8c6bc"; g.fillRect(cx, cy, lw / 2 - 8, (mid - y0 - 24) / 5 - 8);
      if (lit) { e.fillStyle = "#ffb84a"; e.fillRect(cx, cy, lw / 2 - 8, (mid - y0 - 24) / 5 - 8); }
      txt(g, LAB[i], cx + (lw / 2 - 8) / 2, cy + ((mid - y0 - 24) / 5 - 8) / 2, 13, "#222");
    }
    g.fillStyle = "#0b140e"; g.fillRect(dx, y0 + 12, dw, mid - y0 - 24);
    const rows = ["PROG  11", "VERB 16  NOUN 62", "+04732", "+00418", "-00127"];
    rows.forEach((s, i) => {
      const yy = y0 + 30 + i * ((mid - y0 - 50) / 5);
      txt(g, s, dx + dw / 2, yy, 22, "#3a6a48");
      e.font = "bold 22px monospace"; e.fillStyle = "#58ff8a"; e.textAlign = "center"; e.textBaseline = "middle"; e.fillText(s, dx + dw / 2, yy);
    });
    const KEYS = ["VERB", "+", "7", "8", "9", "CLR", "NOUN", "-", "4", "5", "6", "PRO", "", "0", "1", "2", "3", "KEY REL", "", "", "ENTR", "", "RSET", ""];
    const kw = (x1 - x0 - 24) / 6, kh = (y1 - mid - 24) / 4;
    KEYS.forEach((k, i) => {
      if (!k) return;
      const cx = x0 + 12 + (i % 6) * kw, cy = mid + 12 + Math.floor(i / 6) * kh;
      g.fillStyle = "#1a1d1c"; g.fillRect(cx + 3, cy + 3, kw - 6, kh - 6);
      g.fillStyle = "#d8d6cc"; g.fillRect(cx + 6, cy + 6, kw - 12, kh - 12);
      txt(g, k, cx + kw / 2, cy + kh / 2, k.length > 3 ? 14 : 24, "#1b1b1b");
      e.fillStyle = "rgba(255,230,190,0.25)"; e.fillRect(cx + 6, cy + 6, kw - 12, kh - 12);
    });
  }
  // C&W recess + master alarm surround
  g.fillStyle = "#151817"; g.fillRect(X(CW.u0) - 8, Y(CW.v1) - 8, X(CW.u1) - X(CW.u0) + 16, Y(CW.v0) - Y(CW.v1) + 16);
  for (const m of MA) { g.fillStyle = "#151817"; g.fillRect(X(m.u) - 0.04 * PPX, Y(m.v) - 0.05 * PPY, 0.08 * PPX, 0.1 * PPY); }
  // ABORT placard + red handle surround on the commander's side
  g.fillStyle = "#c21d12"; g.fillRect(X(0.02), Y(0.3), 0.075 * W, 0.06 * H); txt(g, "ABORT", X(0.0575), Y(0.27), 0.028 * PPY, "#fff");
  e.fillStyle = "#601008"; e.fillRect(X(0.02), Y(0.3), 0.075 * W, 0.06 * H);
  // event timer (amber digits)
  g.fillStyle = "#101211"; g.fillRect(X(0.318), Y(0.62), 0.07 * W, 0.05 * H);
  e.font = "bold 34px monospace"; e.fillStyle = "#ffb03a"; e.textAlign = "center"; e.textBaseline = "middle"; e.fillText("00:52", X(0.353), Y(0.595));
  txt(g, "EVENT TIMER", X(0.353), Y(0.64), 0.012 * PPY, "#1b1f1d");
  // panel edge shading (top darker)
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "rgba(0,0,0,0.25)"); gr.addColorStop(0.15, "rgba(0,0,0,0)"); gr.addColorStop(0.9, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,0.3)");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const mk = (c: HTMLCanvasElement, srgb: boolean) => { const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  MDC.alb = mk(cv, true); MDC.em = mk(ce, true);
  return MDC;
};
/** side / aft wall panels: generic panel texture (lockers when `locker`) */
const sideTex = (key: string, seed: number, locker: boolean) => {
  const W = 1024, H = 512;
  const togs: Tog[] = [], gaus: Gau[] = [];
  const alb = ctex(key + "A", W, H, (g, r0) => {
    void r0;
    const r = rng(seed);
    if (locker) {
      g.fillStyle = "#8f9b96"; g.fillRect(0, 0, W, H); noise(g, W, H, r, 5000, 0.05);
      const cols = 6, rows = 3;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = 10 + i * ((W - 20) / cols), y = 10 + j * ((H - 20) / rows), w = (W - 20) / cols - 10, h = (H - 20) / rows - 10;
        const bag = r() < 0.35;
        g.fillStyle = bag ? "#e9e6dc" : "#a9b4ae"; g.fillRect(x, y, w, h);
        g.strokeStyle = "#39413d"; g.lineWidth = 4; g.strokeRect(x, y, w, h);
        if (bag) { g.strokeStyle = "rgba(90,90,80,0.5)"; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(x + 6, y + (h * k) / 4); g.quadraticCurveTo(x + w / 2, y + (h * k) / 4 + 8, x + w - 6, y + (h * k) / 4); g.stroke(); } }
        g.fillStyle = "#262b29"; g.fillRect(x + w / 2 - 22, y + h - 26, 44, 12); // latch
        g.fillStyle = "#f2ede0"; g.fillRect(x + 8, y + 8, 46, 20); txt(g, String.fromCharCode(65 + j) + (i + 1), x + 31, y + 18, 15, "#1b1b1b");
        if (r() < 0.3) { g.fillStyle = "#f0c01e"; g.fillRect(x + w - 40, y + 8, 30, 14); }
      }
    } else {
      const e2 = document.createElement("canvas").getContext("2d")!;
      paintPanel(g, e2, r, W, H, 1024 / 1.6, 512 / 1.1, [{ u0: 0, u1: 0.5, v0: 0, v1: 1 }, { u0: 0.5, u1: 1, v0: 0, v1: 1 }], togs, gaus, true);
    }
  });
  const em = ctex(key + "E", W, H, (e) => {
    const r = rng(seed); e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
    if (locker) return;
    const g2 = document.createElement("canvas"); g2.width = W; g2.height = H;
    paintPanel(g2.getContext("2d")!, e, r, W, H, 1024 / 1.6, 512 / 1.1, [{ u0: 0, u1: 0.5, v0: 0, v1: 1 }, { u0: 0.5, u1: 1, v0: 0, v1: 1 }], [], [], true);
  });
  return { alb, em };
};
const wallTex = () => ctex("apCabWall", 1024, 1024, (g, r) => {
  g.fillStyle = "#7f8f8a"; g.fillRect(0, 0, 1024, 1024); noise(g, 1024, 1024, r, 12000, 0.05);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = i * 256, y = j * 256;
    g.fillStyle = (i + j) % 2 ? "#869690" : "#7a8a85"; g.fillRect(x + 6, y + 6, 244, 244);
    g.strokeStyle = "#3d4743"; g.lineWidth = 6; g.strokeRect(x + 3, y + 3, 250, 250);
    g.fillStyle = "#4d5753"; for (const [a, b] of [[16, 16], [240, 16], [16, 240], [240, 240], [128, 16], [128, 240]]) { g.beginPath(); g.arc(x + a, y + b, 4, 0, 7); g.fill(); }
    if (r() < 0.25) { g.fillStyle = "#f1ecdd"; g.fillRect(x + 40, y + 40, 120, 30); g.fillStyle = "#333"; g.fillRect(x + 50, y + 50, 90, 4); g.fillRect(x + 50, y + 58, 60, 4); }
    if (r() < 0.2) { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? "#151515" : "#f2c21b"; g.fillRect(x + 30 + k * 24, y + 200, 24, 18); } }
    if (r() < 0.3) { g.fillStyle = "#3b3f3d"; g.fillRect(x + 150, y + 110, 70, 70); } // velcro patch
  }
});
const floorTex = () => ctex("apCabFloor", 512, 512, (g, r) => {
  g.fillStyle = "#59615e"; g.fillRect(0, 0, 512, 512); noise(g, 512, 512, r, 6000, 0.06);
  g.strokeStyle = "#2e3432"; g.lineWidth = 4; for (let i = 0; i <= 512; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
  g.fillStyle = "#3f4644"; for (let i = 0; i < 512; i += 32) for (let j = 0; j < 512; j += 32) g.fillRect(i + 14, j + 14, 4, 4);
});
const cwLabTex = () => {
  const t = ctex("apCWlab", 1024, 512, (g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 512);
    const L = ["SM RCS A", "SM RCS B", "SM RCS C", "SM RCS D", "CRYO PRESS", "GLYCOL", "SPS PRESS", "MAIN BUS A", "MAIN BUS B", "AC BUS 1",
      "AC BUS 2", "FC 1", "FC 2", "FC 3", "O2 FLOW HI", "SUIT COMP", "CM RCS 1", "CM RCS 2", "ISS", "CMC", "C/W", "BUS OVLD", "AC OVLD", "FC BUS DISC",
      "H2 PRESS", "O2 PRESS", "SPS ROUGH", "PITCH GMBL", "YAW GMBL", "CO2 PP HI", "SUIT", "MN BUS UV", "CREW ALERT", "GLY TEMP", "ED BUS", "UPTLM", "FDAI", "LV GUID", "LV RATE", "GMBL"];
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    for (let i = 0; i < 40; i++) {
      const cx = (i % 8) * 128 + 64, cy = Math.floor(i / 8) * 102.4 + 51;
      const words = L[i].split(" ");
      g.font = "bold 26px sans-serif";
      if (words.length > 1 && L[i].length > 8) { g.fillText(words.slice(0, Math.ceil(words.length / 2)).join(" "), cx, cy - 15, 112); g.fillText(words.slice(Math.ceil(words.length / 2)).join(" "), cx, cy + 15, 112); }
      else g.fillText(L[i], cx, cy, 112);
    }
  });
  t.colorSpace = THREE.NoColorSpace; return t;
};
const sceTex = () => ctex("apSCEplate", 512, 512, (g) => {
  // 0.24 x 0.24 m plate, the SCE switch at the centre: SCE title, AUX above, NORM below
  g.fillStyle = "#3a403e"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#111"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 502);
  g.fillStyle = "#242827"; for (const [a, b] of [[24, 24], [488, 24], [24, 488], [488, 488]]) { g.beginPath(); g.arc(a, b, 9, 0, 7); g.fill(); }
  // white guard outline + title block
  g.fillStyle = "#f4f0e2"; g.fillRect(156, 30, 200, 62); txt(g, "SCE", 256, 62, 54, "#121212");
  txt(g, "AUX", 256, 140, 46, "#f4f0e2");
  txt(g, "NORM", 256, 402, 46, "#f4f0e2");
  g.strokeStyle = "#f4f0e2"; g.lineWidth = 6; g.beginPath(); g.moveTo(256, 172); g.lineTo(256, 200); g.moveTo(256, 340); g.lineTo(256, 368); g.stroke();
  // switch well
  g.fillStyle = "#181b1a"; g.beginPath(); g.arc(256, 270, 34, 0, 7); g.fill();
  g.fillStyle = "#b9bfbc"; g.beginPath(); g.arc(256, 270, 20, 0, 7); g.fill();
  // neighbour switches (out of the close-up)
  for (const x of [70, 442]) {
    g.fillStyle = "#181b1a"; g.beginPath(); g.arc(x, 270, 22, 0, 7); g.fill();
    txt(g, x < 256 ? "PCM" : "PWR", x, 200, 30, "#f4f0e2"); txt(g, "OFF", x, 345, 28, "#f4f0e2");
  }
  g.fillStyle = "#e9e3cf"; g.fillRect(60, 430, 392, 46); txt(g, "SIGNAL CONDITIONER", 256, 453, 30, "#151515");
});
const sceEm = () => ctex("apSCEem", 512, 512, (g) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(255,255,240,0.3)"; g.font = "bold 46px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("AUX", 256, 140); g.fillText("NORM", 256, 402);
});
const fdaiTex = () => ctex("apFDAI", 512, 256, (g) => {
  g.fillStyle = "#f3f1ea"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#1c1c1c"; g.fillRect(0, 128, 512, 128);
  g.strokeStyle = "#888"; g.lineWidth = 3;
  for (let i = 0; i < 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); }
  for (let j = 32; j < 256; j += 32) { g.beginPath(); g.moveTo(0, j); g.lineTo(512, j); g.stroke(); }
  g.fillStyle = "#f2a02a"; g.fillRect(0, 124, 512, 8);
});
const maTex = () => ctex("apMA", 256, 256, (g) => {
  g.fillStyle = "#e0372a"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "bold 58px sans-serif"; g.fillText("MASTER", 128, 96); g.fillText("ALARM", 128, 164);
});
const fabricTex = () => ctex("apCouch", 256, 256, (g, r) => {
  g.fillStyle = "#3d5f8f"; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, r, 3000, 0.06);
  g.strokeStyle = "rgba(20,30,50,0.5)"; g.lineWidth = 3; for (let i = 0; i < 256; i += 64) { g.beginPath(); g.moveTo(0, i + 32); g.lineTo(256, i + 32); g.stroke(); }
  g.fillStyle = "#e57b1e"; g.fillRect(56, 0, 26, 256); g.fillRect(174, 0, 26, 256);
});

/** the caution & warning matrix: 8 x 5 tiles, red/amber when warn, about half of them blinking */
const cwMat = () => new THREE.ShaderMaterial({
  uniforms: { uLab: { value: cwLabTex() }, uW: { value: 0 }, uT: { value: 0 }, uPow: { value: 1 } },
  vertexShader: VS,
  fragmentShader: /* glsl */ `uniform sampler2D uLab; uniform float uW, uT, uPow; varying vec2 vUv; varying vec3 vW; varying vec3 vN; ${HASH}
  void main(){
    vec2 g = vUv * vec2(8.0, 5.0); vec2 c = floor(g); vec2 f = fract(g);
    float edge = step(0.06, f.x) * step(f.x, 0.94) * step(0.08, f.y) * step(f.y, 0.92);
    float lab = texture2D(uLab, vUv).r;
    float hh = h2(c + 7.3), red = step(hh, 0.4);
    vec3 col = mix(vec3(1.0, 0.5, 0.04), vec3(1.0, 0.07, 0.04), red);
    float on = step(h2(c * 1.7 + 2.1) * 0.9, uW * 1.02 - 0.02);
    float bl = h2(c + 11.0) < 0.55 ? step(0.42, fract(uT * 2.2 + h2(c + 3.0) * 0.5)) : 1.0;
    float lit = on * bl;
    vec3 off = vec3(0.075, 0.075, 0.07) * (0.4 + 0.6 * uPow) + lab * vec3(0.16, 0.16, 0.15) * (0.4 + 0.6 * uPow);
    vec3 onc = col * (3.6 - 2.8 * lab);
    vec3 o = mix(off, onc, lit) * edge + (1.0 - edge) * vec3(0.02);
    gl_FragColor = vec4(o, 1.0);
  }`,
});
/** storm window: grey moving cloud, rain streaks running down the glass, lightning flash */
const windowMat = () => new THREE.ShaderMaterial({
  uniforms: { uT: { value: 0 }, uFlash: { value: 0 }, uSeed: { value: 0 } },
  vertexShader: VS,
  fragmentShader: /* glsl */ `uniform float uT, uFlash, uSeed; varying vec2 vUv; varying vec3 vW; varying vec3 vN; ${HASH}
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec2 uv = vUv;
    float cl = vn(uv * vec2(3.0, 2.0) + vec2(uT * 0.25 + uSeed, 0.0)) * 0.6 + vn(uv * 7.0 + vec2(uT * 0.6, uSeed)) * 0.4;
    vec3 c = mix(vec3(0.16, 0.19, 0.25), vec3(0.42, 0.47, 0.55), uv.y * 0.6 + cl * 0.5);
    float x = uv.x * 26.0; float lane = floor(x); float fx = fract(x) - 0.5;
    float sp = 0.6 + h2(vec2(lane, uSeed)) * 0.8;
    float y = fract(uv.y * 1.3 + uT * sp + h2(vec2(lane, 3.0)));
    float streak = smoothstep(0.08, 0.0, abs(fx)) * smoothstep(0.55, 1.0, y) * step(0.35, h2(vec2(lane, 9.0 + uSeed)));
    vec2 dp = uv * vec2(18.0, 14.0); float drop = smoothstep(0.22, 0.12, length(fract(dp) - 0.5)) * step(0.82, h2(floor(dp) + uSeed));
    c += vec3(0.55, 0.6, 0.7) * (streak * 0.5 + drop * 0.25);
    c *= 1.0 + 0.5 * smoothstep(0.0, 0.6, uv.y);
    c += vec3(2.6, 2.7, 3.2) * uFlash;
    gl_FragColor = vec4(c, 1.0);
  }`,
});

class Cabin {
  root = new THREE.Group();
  S = lset();
  cw = cwMat();
  wins: THREE.ShaderMaterial[] = [];
  lever = new THREE.Group();
  ma: THREE.ShaderMaterial[] = [];
  mdcEm!: THREE.ShaderMaterial;
  auxLamp!: THREE.ShaderMaterial;
  constructor() {
    const S = this.S, b = new Bat();
    this.root.position.set(...CABIN);
    const tex = buildMDCTex();
    const wall = wallTex(); wall.repeat.set(1, 1);
    const mWall = imat(S, { map: wall }), mDark = imat(S, { col: "#30363a" }), mFrame = imat(S, { col: "#3e4547" }), mMetal = imat(S, { col: "#b8c0c2" });
    const mFloor = imat(S, { map: floorTex() }), mFab = imat(S, { map: fabricTex() }), mOrange = imat(S, { col: "#e37a1c" });
    const mRed = imat(S, { col: "#d0281c", emCol: [0.25, 0.02, 0.01] }), mYel = imat(S, { col: "#f0c21c" });
    const mMDC = imat(S, { map: tex.alb, em: tex.em, gain: 2.2 }); this.mdcEm = mMDC;
    const mLamp = imat(S, { col: "#fff4dc", emCol: [3.2, 2.7, 2.0] });
    // ---- shell: cone wall, floor, ceiling + tunnel hatch
    const coneP = (u: number, v: number, inset = 0) => { const th = u * Math.PI * 2, y = v * TOP, r = R(y) - inset; return V3(AX + r * Math.cos(th), y, r * Math.sin(th)); };
    const toAxis = (p: THREE.Vector3) => V3(AX - p.x, 0, -p.z);
    b.add(surfGeo(40, 6, (u, v) => coneP(u, v), toAxis, (u, v) => [u * 9, v * 2.2]), mWall);
    b.add(surfGeo(40, 3, (u, v) => { const th = u * Math.PI * 2, r = 0.01 + v * R(0.0); return V3(AX + r * Math.cos(th), 0.0, r * Math.sin(th)); }, () => V3(0, 1, 0), (u, v) => [u * 6, v * 2]), mFloor);
    b.add(surfGeo(40, 2, (u, v) => { const th = u * Math.PI * 2, r = 0.3 + v * (R(TOP) - 0.3); return V3(AX + r * Math.cos(th), TOP, r * Math.sin(th)); }, () => V3(0, -1, 0)), mFrame);
    b.add(surfGeo(24, 2, (u, v) => { const th = u * Math.PI * 2; return V3(AX + 0.32 * Math.cos(th), TOP + v * 0.25, 0.32 * Math.sin(th)); }, toAxis), mDark);
    b.add(surfGeo(24, 1, (u, v) => { const th = u * Math.PI * 2, r = 0.01 + v * 0.31; return V3(AX + r * Math.cos(th), TOP + 0.25, r * Math.sin(th)); }, () => V3(0, -1, 0)), mMetal);
    // hatch handle bars on the tunnel hatch
    b.box(mYel, AX - 0.2, TOP + 0.2, -0.02, AX + 0.2, TOP + 0.24, 0.02);
    // ---- main display console (curved band), its rim, caps
    b.add(surfGeo(28, 4, (u, v) => pSurf(u, v).p, (p) => toAxis(p)), mMDC);
    const rim = (v: number, h: number, o0: number) => surfGeo(28, 1, (u, w) => { const a = pSurf(u, v, 0).p, c = pSurf(u, v, o0).p; return a.lerp(c, w).add(V3(0, h, 0)); }, () => V3(0, v > 0.5 ? -1 : 1, 0));
    b.add(rim(1, 0, -PIN), mFrame); b.add(rim(0, 0, -PIN), mFrame);
    for (const u of [0, 1]) b.add(surfGeo(1, 6, (w, v) => pSurf(u, v, -PIN * w).p, () => V3(0, 0, u ? -1 : 1)), mFrame);
    // a hood lip over the top of the console (with a light strip under it)
    b.add(surfGeo(28, 1, (u, w) => pSurf(u, 1.0, 0.0).p.lerp(pSurf(u, 1.0, 0.12).p, w).add(V3(0, 0.02, 0)), () => V3(0, -1, 0)), mFrame);
    b.add(surfGeo(28, 1, (u, w) => pSurf(u, 1.0, 0.12).p.add(V3(0, 0.02 - 0.05 * w, 0)), (p) => toAxis(p)), mDark);
    // toggles (3D levers) + gauge bezels
    const cyl = new THREE.CylinderGeometry(0.0045, 0.006, 0.04, 6); cyl.rotateX(Math.PI / 2); cyl.translate(0, 0, 0.02);
    const tip = new THREE.SphereGeometry(0.008, 6, 4); tip.translate(0, 0, 0.04);
    const nut = new THREE.CylinderGeometry(0.011, 0.011, 0.008, 6); nut.rotateX(Math.PI / 2); nut.translate(0, 0, 0.004);
    for (const t of tex.tog) {
      const f = pSurf(t.u, t.v, 0.002);
      const m = basis(f.p, f.tu, f.tv, f.n);
      b.add(nut, mDark, m);
      const lm = m.clone().multiply(new THREE.Matrix4().makeRotationX(t.up ? -0.5 : 0.5));
      b.add(cyl, mMetal, lm); b.add(tip, mMetal, lm);
    }
    for (const gg of tex.gau) {
      const f = pSurf(gg.u, gg.v, 0.004);
      const tor = new THREE.TorusGeometry(gg.r + 0.003, 0.0055, 5, 20);
      b.add(tor, mDark, basis(f.p, f.tu, f.tv, f.n));
    }
    // FDAI balls in bezels
    for (const fd of FDAI) {
      const f = pSurf(fd.u, fd.v, 0.0);
      const ball = new THREE.SphereGeometry(0.095, 20, 12); ball.rotateZ(0.25);
      const m = basis(f.p.clone().addScaledVector(f.n, 0.0), f.tu, f.tv, f.n);
      b.add(ball, imat(S, { map: fdaiTex() }), m);
      b.add(new THREE.TorusGeometry(0.12, 0.016, 6, 28), mDark, basis(f.p.clone().addScaledVector(f.n, 0.012), f.tu, f.tv, f.n));
    }
    // ABORT T-handle (red) on the commander side
    { const f = pSurf(0.06, 0.24, 0.0); const m = basis(f.p, f.tu, f.tv, f.n);
      const st = new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6); st.rotateX(Math.PI / 2); st.translate(0, 0, 0.03); b.add(st, mMetal, m);
      const hb = new THREE.BoxGeometry(0.12, 0.025, 0.025); hb.translate(0, 0, 0.065); b.add(hb, mRed, m); }
    // ---- caution & warning matrix: raised box + lit face
    {
      const pad = 0.012;
      b.add(surfGeo(8, 5, (u, v) => pSurf(CW.u0 - pad + u * (CW.u1 - CW.u0 + 2 * pad), CW.v0 - pad * 2 + v * (CW.v1 - CW.v0 + 4 * pad), 0.035).p, toAxis), mDark);
      for (const s of [0, 1]) b.add(surfGeo(6, 1, (u, w) => pSurf(CW.u0 - pad + u * (CW.u1 - CW.u0 + 2 * pad), s ? CW.v1 + pad * 2 : CW.v0 - pad * 2, 0.035 * w).p, () => V3(0, s ? 1 : -1, 0)), mDark);
      for (const s of [0, 1]) b.add(surfGeo(1, 4, (w, v) => pSurf(s ? CW.u1 + pad : CW.u0 - pad, CW.v0 - pad * 2 + v * (CW.v1 - CW.v0 + 4 * pad), 0.035 * w).p, () => V3(0, 0, s ? 1 : -1)), mDark);
      const face = new THREE.Mesh(surfGeo(8, 5, (u, v) => pSurf(CW.u0 + u * (CW.u1 - CW.u0), CW.v0 + v * (CW.v1 - CW.v0), 0.042).p, toAxis), this.cw);
      off(face); this.root.add(face);
    }
    // master alarm push-lights
    for (const m of MA) {
      const f = pSurf(m.u, m.v, 0.0);
      const bm = basis(f.p, f.tu, f.tv, f.n);
      b.box(mDark, -0.045, -0.045, 0, 0.045, 0.045, 0.03, bm);
      const mat = imat(S, { map: maTex(), em: maTex(), gain: 0 }); this.ma.push(mat);
      const q = new THREE.Mesh(plane(0.075, 0.075), mat); q.applyMatrix4(bm.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.032))); off(q); this.root.add(q);
    }
    // ---- side panels (circuit breakers / switches) and the aft lockers on the cone wall
    const band = (t0: number, t1: number, y0: number, y1: number, inset: number, mat: THREE.Material, nu = 8) => {
      const P = (u: number, v: number, o = 0) => { const th = t0 + u * (t1 - t0), y = y0 + v * (y1 - y0), r = R(y) - inset + o; return V3(AX + r * Math.cos(th), y, r * Math.sin(th)); };
      b.add(surfGeo(nu, 3, (u, v) => P(u, v), toAxis), mat);
      for (const v of [0, 1]) b.add(surfGeo(nu, 1, (u, w) => P(u, v, inset * w), () => V3(0, v ? 1 : -1, 0)), mFrame);
      for (const u of [0, 1]) b.add(surfGeo(1, 3, (w, v) => P(u, v, inset * w), (p) => toAxis(p)), mFrame);
    };
    const sL = sideTex("apSideL", 11, false), sR = sideTex("apSideR", 23, false), lk = sideTex("apLock", 37, true);
    band(-1.95, -1.17, 0.55, 1.85, 0.08, imat(S, { map: sL.alb, em: sL.em, gain: 1.8 }));
    band(1.17, 1.95, 0.55, 1.85, 0.08, imat(S, { map: sR.alb, em: sR.em, gain: 1.8 }));
    band(2.2, 2.75, 0.12, 1.15, 0.07, imat(S, { map: lk.alb }), 6);
    band(3.53, 4.08, 0.12, 1.15, 0.07, imat(S, { map: lk.alb }), 6);
    band(2.85, 3.43, 0.12, 0.95, 0.07, imat(S, { map: lk.alb }), 6);
    // ---- windows (storm), aft hatch outline
    const win = (th: number, y0: number, y1: number, hw: number, seed: number) => {
      const mat = windowMat(); mat.uniforms.uSeed.value = seed; this.wins.push(mat);
      const P = (u: number, v: number, o: number) => { const t = th + (u - 0.5) * hw * 2, y = y0 + v * (y1 - y0), r = R(y) - o; return V3(AX + r * Math.cos(t), y, r * Math.sin(t)); };
      const q = new THREE.Mesh(surfGeo(4, 2, (u, v) => P(u, v, 0.015), toAxis), mat); off(q); this.root.add(q);
      // thick bezel frame
      const fw = 0.045;
      const fr = (ua: number, ub: number, va: number, vb: number) => {
        b.add(surfGeo(3, 1, (u, v) => P(ua + u * (ub - ua), va + v * (vb - va), 0.06), toAxis), mFrame);
      };
      const du = fw / (R((y0 + y1) / 2) * hw * 2), dv = fw / (y1 - y0);
      fr(-du, 1 + du, 1, 1 + dv); fr(-du, 1 + du, -dv, 0); fr(-du, 0, 0, 1); fr(1, 1 + du, 0, 1);
      for (const [ua, ub, va, vb] of [[-du, 1 + du, 1, 1], [-du, 1 + du, 0, 0], [0, 0, 0, 1], [1, 1, 0, 1]]) {
        b.add(surfGeo(3, 1, (u, w) => { const uu = ua + u * (ub - ua), vv = va + u * (vb - va); const a = P(uu, vv, 0.06), c = P(uu, vv, 0.0); return a.lerp(c, w); }, toAxis), mDark);
      }
      return P;
    };
    win(-0.62, 2.12, 2.42, 0.13, 1.3); win(0.62, 2.12, 2.42, 0.13, 2.7);
    win(Math.PI - 0.62, 1.32, 1.78, 0.12, 4.1); win(Math.PI + 0.62, 1.32, 1.78, 0.12, 5.9);
    win(Math.PI, 1.62, 1.98, 0.1, 7.7);
    // hatch ring around the centre aft window
    { const th = Math.PI, P = (a: number, o: number) => { const y = 1.75 + Math.sin(a) * 0.52, t = th + Math.cos(a) * 0.36, r = R(y) - o; return V3(AX + r * Math.cos(t), y, r * Math.sin(t)); };
      b.add(surfGeo(32, 1, (u, w) => P(u * Math.PI * 2, 0.025 + 0.03 * w), toAxis), mYel); }
    // ---- flood lights (fixtures with glowing faces)
    for (const [th, y] of [[-0.55, 2.5], [0.55, 2.5], [Math.PI - 0.5, 2.3], [Math.PI + 0.5, 2.3]] as [number, number][]) {
      const r = R(y) - 0.06, p = V3(AX + r * Math.cos(th), y, r * Math.sin(th));
      const n = V3(AX - p.x, -0.6, -p.z).normalize(), u = V3(-Math.sin(th), 0, Math.cos(th)), v = n.clone().cross(u).normalize();
      const m = basis(p, u, v, n);
      b.box(mDark, -0.1, -0.05, -0.03, 0.1, 0.05, 0.04, m);
      b.box(mLamp, -0.085, -0.035, 0.04, 0.085, 0.035, 0.05, m);
    }
    // ---- three couches (blue fabric + orange straps), struts, headrests
    for (const z of [-0.75, 0, 0.75]) {
      const hw = 0.29;
      b.box(mFab, -0.2, 0.36, z - hw, 0.36, 0.48, z + hw);
      b.box(mFrame, -0.22, 0.3, z - hw - 0.03, 0.38, 0.36, z + hw + 0.03);
      const back = TRS(-0.2, 0.42, z, 0, 0, 0.45);
      b.box(mFab, -0.1, 0, -hw, 0.02, 0.95, hw, back);
      b.box(mFab, -0.12, 0.97, -0.16, 0.04, 1.2, 0.16, back);
      b.box(mOrange, 0.02, 0.15, -0.12, 0.035, 0.85, -0.08, back); b.box(mOrange, 0.02, 0.15, 0.08, 0.035, 0.85, 0.12, back);
      for (const s of [-1, 1]) { b.box(mFrame, -0.18, 0.5, z + s * (hw + 0.01) - 0.02, 0.3, 0.56, z + s * (hw + 0.01) + 0.02); }
      for (const [x, s] of [[-0.15, -1], [0.3, -1], [-0.15, 1], [0.3, 1]] as [number, number][]) b.box(mMetal, x - 0.02, 0, z + s * 0.22 - 0.02, x + 0.02, 0.32, z + s * 0.22 + 0.02);
      b.box(mFab, 0.36, 0.3, z - 0.2, 0.62, 0.38, z + 0.2); // leg rest
    }
    // oxygen hoses from the floor to each couch (blue)
    for (const z of [-0.75, 0, 0.75]) {
      const c = new THREE.CatmullRomCurve3([V3(-0.9, 0.02, z * 1.4 - 0.15), V3(-0.55, 0.18, z * 1.1 - 0.35), V3(-0.25, 0.3, z - 0.34)]);
      b.add(new THREE.TubeGeometry(c, 12, 0.025, 6, false), imat(S, { col: "#2f6fd0" }));
    }
    // checklists + binders velcroed on the side panels
    const mBind = [imat(S, { col: "#f2efe4" }), imat(S, { col: "#e0b82a" }), imat(S, { col: "#c9472a" })];
    for (const [th, y, k] of [[-1.3, 1.95, 0], [-1.55, 1.95, 1], [1.4, 1.95, 2], [1.7, 1.95, 0], [2.4, 1.3, 0], [3.9, 1.3, 1]] as [number, number, number][]) {
      const r = R(y) - 0.08, p = V3(AX + r * Math.cos(th), y, r * Math.sin(th));
      const n = V3(AX - p.x, 0, -p.z).normalize(), u = V3(-Math.sin(th), 0, Math.cos(th));
      b.box(mBind[k], -0.09, -0.12, 0, 0.09, 0.12, 0.035, basis(p, u, V3(0, 1, 0), n));
    }
    // ---- the SCE switch module on a pedestal by Bean (switch pivot at (1.25, 1.05, 0.45))
    {
      // plate faces the crew (normal (-cos, sin, 0)); its right = +z (the crew looks +x), up tilted back
      const tilt = 0.44, up = V3(Math.sin(tilt), Math.cos(tilt), 0), u = V3(0, 0, 1);
      const piv = V3(1.25, 1.05, 0.45);
      const m = basis(piv, u, up, u.clone().cross(up).normalize());
      b.box(imat(S, { col: "#75857f" }), -0.14, -0.15, -0.16, 0.14, 0.15, -0.002, m); // head box behind the plate
      const mPed = imat(S, { col: "#75857f" });
      b.box(mPed, 1.33, 0, 0.33, 1.5, 0.98, 0.57); // pedestal
      b.box(mDark, 1.31, 0.6, 0.31, 1.52, 0.66, 0.59);
      const plate = new THREE.Mesh(plane(0.26, 0.26), imat(S, { map: sceTex(), em: sceEm(), gain: 1 }));
      plate.applyMatrix4(m); off(plate); this.root.add(plate);
      // guard: two side bars + top bar (yellow-black), around the lever
      const mG = imat(S, { col: "#ece9de" });
      b.box(mG, -0.05, -0.065, 0, -0.038, 0.065, 0.055, m); b.box(mG, 0.038, -0.065, 0, 0.05, 0.065, 0.055, m);
      // the lever (pivot group, rotates about the plate x axis)
      const L = this.lever; L.matrixAutoUpdate = false;
      const lev = new THREE.CylinderGeometry(0.007, 0.0095, 0.055, 10); lev.rotateX(Math.PI / 2); lev.translate(0, 0, 0.028);
      const knob = new THREE.SphereGeometry(0.0125, 12, 8); knob.translate(0, 0, 0.058);
      const ring = new THREE.CylinderGeometry(0.02, 0.02, 0.012, 12); ring.rotateX(Math.PI / 2); ring.translate(0, 0, 0.006);
      const mL = imat(S, { col: "#e9eef0" });
      b.add(ring, mDark, m);
      const lm = new THREE.Mesh(mergeGeometries([clean(lev), clean(knob)]), mL); off(lm);
      L.add(lm); this.root.add(L);
      L.userData.base = m.clone().multiply(new THREE.Matrix4().makeTranslation(0, 0, 0.004));
      // little lamp that comes on green when the switch is on AUX
      this.auxLamp = imat(S, { col: "#203a26", emCol: [0, 0, 0] });
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.011, 14), this.auxLamp); lamp.applyMatrix4(m.clone().multiply(new THREE.Matrix4().makeTranslation(0.085, 0.07, 0.003))); off(lamp); this.root.add(lamp);
    }
    b.build(this.root);
    off(this.root);
  }
  update(id: number, t: number, f: number) {
    const c = cabinAt(id, t), sw = switchAt(id, t), fl = strikeNow(t);
    const S = this.S, o = this.root.position, P = (x: number, y: number, z: number) => V3(o.x + x, o.y + y, o.z + z);
    const pw = c.power, warn = c.warn;
    const pulse = warn > 0 ? 0.55 + 0.45 * Math.max(0, Math.sin(t * Math.PI * 2 * 1.6)) : 0;
    const L: [THREE.Vector3, [number, number, number], number][] = [
      [P(0.6, 2.55, 0), [1.35 * pw, 1.12 * pw, 0.82 * pw], 1.6],            // overhead warm flood
      [P(1.55, 2.3, -0.95), [0.9 * pw, 0.8 * pw, 0.62 * pw], 1.3],          // panel floods
      [P(1.55, 2.3, 0.95), [0.9 * pw, 0.8 * pw, 0.62 * pw], 1.3],
      [P(1.75, 1.75, 0.05), [2.2 * warn * pulse, 0.25 * warn * pulse, 0.12 * warn * pulse], 1.25], // red alarm glow from the matrix
      [P(-0.2, 1.6, 0), [1.0 * warn * pulse, 0.1 * warn * pulse, 0.06 * warn * pulse], 1.4],
      [P(1.3, 2.25, -0.75), [0.18 + 2.5 * fl, 0.22 + 2.6 * fl, 0.3 + 3.0 * fl], 1.2], // storm light through the windows (+ lightning)
      [P(1.3, 2.25, 0.75), [0.18 + 2.5 * fl, 0.22 + 2.6 * fl, 0.3 + 3.0 * fl], 1.2],
      [P(-1.2, 1.55, 0.75), [0.2 + 2.0 * fl, 0.24 + 2.1 * fl, 0.32 + 2.5 * fl], 1.4],
      [P(-1.2, 1.55, -0.75), [0.2 + 2.0 * fl, 0.24 + 2.1 * fl, 0.32 + 2.5 * fl], 1.4],
      [P(1.7, 1.0, 0), [0.25 * (0.5 + 0.5 * pw), 0.4 * (0.5 + 0.5 * pw), 0.3 * (0.5 + 0.5 * pw)], 1.0], // panel lamp glow (green-white)
      [P(-1.4, 2.2, 0), [0.35 * pw, 0.3 * pw, 0.26 * pw], 1.3],              // aft floods
      [P(0.9, 1.35, 0.95), [0.35 * pw, 0.3 * pw, 0.24 * pw], 0.8],           // Bean's side (switch close-up key)
    ];
    for (let i = 0; i < NL; i++) {
      const l = L[i];
      if (l) { S.lp[i].copy(l[0]); S.lc[i].set(...l[1]); S.lr[i] = l[2]; } else { S.lp[i].set(0, -999, 0); S.lc[i].set(0, 0, 0); }
    }
    (S.u.uAU.value as THREE.Vector3).set(0.16, 0.17, 0.2).multiplyScalar(0.5 + 0.5 * pw).add(V3(0.12 * warn * pulse, 0, 0));
    (S.u.uAD.value as THREE.Vector3).set(0.07, 0.07, 0.08).multiplyScalar(0.5 + 0.5 * pw);
    S.u.uEmK.value = 0.45 + 0.55 * pw;
    this.cw.uniforms.uW.value = warn; this.cw.uniforms.uT.value = t; this.cw.uniforms.uPow.value = pw;
    for (const w of this.wins) { w.uniforms.uT.value = t; w.uniforms.uFlash.value = fl; }
    const maOn = warn > 0.5 ? (Math.sin(t * Math.PI * 2 * 1.6) > -0.2 ? 1 : 0.15) : 0;
    for (const m of this.ma) m.uniforms.uGain.value = 2.8 * maOn;
    (this.auxLamp.uniforms.uEmCol.value as THREE.Vector3).set(0.3 * sw, 2.6 * sw, 0.6 * sw);
    // lever: NORM = tipped down, AUX = tipped up
    const ang = -0.62 + 1.24 * sw;
    this.lever.matrix.copy(this.lever.userData.base as THREE.Matrix4).multiply(new THREE.Matrix4().makeRotationX(-ang));
    this.lever.matrixWorldNeedsUpdate = true;
    void f;
  }
}

// ============================================================ MISSION CONTROL
type Seat = { name: string; x: number; y: number; z: number };
const ROWS: { z: number; y: number; xs: number[]; names: string[] }[] = [
  { z: -4.0, y: 0, xs: [-4.8, -3.3, -1.8, -0.3, 1.2, 2.7, 4.2], names: ["BOOSTER", "RETRO", "FIDO", "GUIDO", "EECOM", "GNC", "TELMU"] },
  { z: 0.9, y: 0, xs: [-5.4, -3.9, 0.3, 1.8, 3.3, 4.8], names: ["CONTROL", "INCO", "O&P", "AFLIGHT", "FAO", "NETWORK"] },
  { z: 2.5, y: 0, xs: [-4.5, -3.0, -1.5, 0, 1.5, 3.0, 4.5], names: ["SURGEON", "CAPCOM", "DYNAMICS", "FLIGHT", "FD ASST", "PAO", "RECOVERY"] },
  { z: 5.2, y: 0.35, xs: [-4.5, -3.0, -1.5, 0, 1.5, 3.0, 4.5], names: ["DOD", "MOD", "DIRECTOR", "PROGRAM", "NASA HQ", "SPAN", "MOCR"] },
];
// Aaron + Flight exactly where story.ts puts them
ROWS[0].xs[4] = SEATS.aaron[0]; ROWS[0].z = SEATS.aaron[2];
ROWS[2].xs[3] = SEATS.flight[0]; ROWS[2].z = SEATS.flight[2];
export const MCC_SEATS: Seat[] = ROWS.flatMap((r) => r.xs.map((x, i) => ({ name: r.names[i], x, y: r.y, z: r.z })));
/** couches in the cabin (local to CABIN): seat top y, seat front edge x, couch centre z */
export const CABIN_COUCH = { seatY: 0.48, frontX: 0.36, z: [-0.75, 0, 0.75] };

const crtMat = (at: THREE.Texture) => new THREE.ShaderMaterial({
  uniforms: { uAtlas: { value: at }, uG: { value: 0 }, uF: { value: 0 } },
  vertexShader: /* glsl */ `attribute vec4 aS; varying vec2 vUv; varying vec4 vS; void main(){ vUv = uv; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `uniform float uG, uF; varying vec2 vUv; varying vec4 vS; ${HASH} ${GLYPH}
  float clean(vec2 cell, float seed, float fr, float cols, float rows){
    float row = cell.y, col = cell.x;
    if (col < 1.0 || col > cols - 2.0 || row < 1.0 || row > rows - 2.0) return 63.0;
    if (row < 1.5) return col < 4.0 + floor(h2(vec2(seed, 1.0)) * 8.0) ? 10.0 + floor(h2(vec2(col, seed)) * 26.0) : (col > cols - 7.0 ? floor(h2(vec2(col, seed + floor(fr / 30.0))) * 10.0) : 63.0);
    if (row < 2.5) return 38.0;
    if (h2(vec2(row, seed * 1.7)) < 0.16) return 63.0;
    float c = col - 1.0, grp = floor(c / 7.0), pos = c - grp * 7.0;
    if (grp < 0.5) { if (pos < 3.0) return 10.0 + floor(h2(vec2(row * 3.0 + pos, seed)) * 26.0); if (pos < 4.0) return 63.0; }
    if (pos < 0.5) return 63.0;
    if (pos < 1.5) return h2(vec2(row, grp + seed)) < 0.3 ? 38.0 : (grp < 0.5 ? 63.0 : 39.0);
    if (pos > 3.5 && pos < 4.5) return 36.0;
    float tick = pos > 4.5 ? floor(fr / 7.0 + h2(vec2(row, grp)) * 7.0) : 0.0;
    return floor(h2(vec2(row * 7.0 + pos + tick * 13.1, grp + seed * 3.0)) * 10.0);
  }
  void main(){
    float seed = vS.x * 17.0, fr = floor(uF);
    float gS = clamp((uG - vS.y * 0.5) / 0.5, 0.0, 1.0);
    float garb = step(h2(vec2(fr * 0.37, seed)), gS * 1.02 - 0.01);
    float tint = vS.z;
    vec3 ph = tint < 0.5 ? vec3(0.55, 1.0, 0.72) : tint < 1.5 ? vec3(0.6, 0.88, 1.0) : tint < 2.5 ? vec3(0.95, 0.97, 1.0) : vec3(1.0, 0.72, 0.32);
    vec2 uv = vUv;
    // garbage: rolling picture, torn lines, snow
    float band = floor(uv.y * 26.0);
    uv.y = fract(uv.y + garb * (h2(vec2(fr, seed + 5.0)) * 0.2 + fr * 0.031));
    uv.x += garb * (h2(vec2(band, fr + seed)) - 0.5) * 0.3 * step(0.55, h2(vec2(band * 3.1, fr * 0.7 + seed)));
    float cols = floor(24.0 * vS.w), rows = floor(15.0 * vS.w);
    vec2 p = vec2(uv.x * cols, (1.0 - uv.y) * rows);
    vec2 cell = floor(p);
    float gi;
    if (garb > 0.5) { float r = h2(cell + vec2(fr * 1.37, fr * 0.91) + seed); gi = r < 0.2 ? 63.0 : floor(h2(cell * 1.31 + vec2(seed, fr * 2.1)) * 54.0); }
    else gi = clean(cell, seed, fr, cols, rows);
    float ink = glyph(gi, p);
    float blk = garb * step(0.965, h2(cell + vec2(fr * 0.53, seed)));
    vec2 q = vUv - 0.5; float vig = smoothstep(0.75, 0.25, length(q * vec2(1.1, 1.25)));
    float scan = 0.82 + 0.18 * sin(vUv.y * rows * 6.2832 * 3.0);
    float snow = garb * h2(floor(vUv * vec2(220.0, 160.0)) + fr * 1.7) * 0.9;
    float bar = garb * smoothstep(0.08, 0.0, abs(fract(vUv.y - fr * 0.045 + seed) - 0.5)) * 0.8;
    vec3 c = ph * (0.035 + 0.05 * vig);
    c += ph * ink * (2.5 + garb * 0.6) * scan;
    c += ph * (snow * 0.55 + bar + blk * 2.2);
    // the cursor
    c += (1.0 - garb) * ph * 2.0 * step(abs(cell.x - 2.0 - mod(floor(fr / 20.0), 9.0)), 0.1) * step(abs(cell.y - rows + 3.0), 0.1) * step(0.5, fract(fr / 16.0));
    c *= 0.65 + 0.35 * vig;
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const clockMat = (at: THREE.Texture) => new THREE.ShaderMaterial({
  uniforms: { uAtlas: { value: at }, uT: { value: 0 } },
  vertexShader: /* glsl */ `attribute vec4 aS; varying vec2 vUv; varying vec4 vS; void main(){ vUv = uv; vS = aS; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `uniform float uT; varying vec2 vUv; varying vec4 vS; ${GLYPH}
  void main(){
    float T = floor(vS.x + uT); // seconds
    vec2 p = vec2(vUv.x * 9.0 - 0.5, (1.0 - vUv.y) * 1.0);
    float i = floor(p.x);
    float h = floor(T / 3600.0), m = floor(mod(T, 3600.0) / 60.0), s = mod(T, 60.0);
    float v = i < 0.5 ? floor(mod(h, 100.0) / 10.0) : i < 1.5 ? mod(h, 10.0) : i < 2.5 ? 37.0 : i < 3.5 ? floor(m / 10.0) : i < 4.5 ? mod(m, 10.0) : i < 5.5 ? 37.0 : i < 6.5 ? floor(s / 10.0) : i < 7.5 ? mod(s, 10.0) : 63.0;
    if (p.x < 0.0) v = 63.0;
    float ink = glyph(v, p);
    vec3 c = vec3(0.04, 0.02, 0.01) + vec3(1.0, 0.55, 0.12) * ink * 3.0;
    gl_FragColor = vec4(c, 1.0);
  }`,
});
const consoleBtnTex = () => {
  const W = 1024, H = 256, r = rng(77);
  const cv = document.createElement("canvas"), ce = document.createElement("canvas"); cv.width = ce.width = W; cv.height = ce.height = H;
  const g = cv.getContext("2d")!, e = ce.getContext("2d")!;
  g.fillStyle = "#6e7f8c"; g.fillRect(0, 0, W, H); noise(g, W, H, r, 4000, 0.05); e.fillStyle = "#000"; e.fillRect(0, 0, W, H);
  for (let half = 0; half < 2; half++) {
    const x0 = half * 512;
    // modules of square push-buttons (Philco modules)
    for (let mdl = 0; mdl < 4; mdl++) {
      const mx = x0 + 14 + mdl * 124, my = 18;
      g.fillStyle = "#2a3036"; g.fillRect(mx, my, 112, 220);
      const nx = 4, ny = 6;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const bx = mx + 6 + i * 26.5, by = my + 8 + j * 35;
        const c = LAMPC[Math.floor(r() * LAMPC.length)], lit = r() < 0.45;
        g.fillStyle = lit ? c : "#c9cfd2"; g.fillRect(bx, by, 22, 28);
        if (lit) { e.fillStyle = c; e.fillRect(bx, by, 22, 28); }
        g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(bx + 3, by + 11, 16, 3);
      }
    }
  }
  const a = new THREE.CanvasTexture(cv), b = new THREE.CanvasTexture(ce); a.colorSpace = b.colorSpace = THREE.SRGBColorSpace; a.anisotropy = b.anisotropy = 8;
  return { a, b };
};
const placardTex = () => ctex("apPlacards", 1024, 1024, (g) => {
  g.fillStyle = "#14181c"; g.fillRect(0, 0, 1024, 1024);
  const names = ROWS.flatMap((r) => r.names);
  names.forEach((n, i) => {
    const x = (i % 4) * 256, y = Math.floor(i / 4) * 128;
    g.fillStyle = "#e9e5d6"; g.fillRect(x + 10, y + 22, 236, 84);
    txt(g, n, x + 128, y + 64, 48, "#15191d");
  });
});
const carpetTex = () => ctex("apCarpet", 1024, 1024, (g, r) => {
  g.fillStyle = "#3b4f86"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 26000; i++) { const k = r(); g.fillStyle = k < 0.4 ? "#2e3f70" : k < 0.75 ? "#4a60a0" : k < 0.95 ? "#5e72b4" : "#8a98d0"; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
});
const ceilTex = () => ctex("apCeil", 512, 512, (g, r) => {
  g.fillStyle = "#4a3f7c"; g.fillRect(0, 0, 512, 512); noise(g, 512, 512, r, 4000, 0.05);
  g.strokeStyle = "#cfc8f0"; g.lineWidth = 5; g.strokeRect(2, 2, 508, 508); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
});
const acousticTex = () => ctex("apAcoustic", 512, 512, (g, r) => {
  g.fillStyle = "#3c4876"; g.fillRect(0, 0, 512, 512); noise(g, 512, 512, r, 5000, 0.05);
  for (let i = 0; i < 512; i += 64) { g.fillStyle = "#2b3560"; g.fillRect(i, 0, 8, 512); g.fillStyle = "#56639a"; g.fillRect(i + 8, 0, 3, 512); }
});
const mapTex = () => ctex("apWorldMap", 2048, 1024, (g) => {
  const W = 2048, H = 1024, X = (lon: number) => ((lon + 180) / 360) * W, Y = (lat: number) => ((90 - lat) / 180) * H;
  g.fillStyle = "#081634"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#1d3a78"; g.lineWidth = 2;
  for (let lon = -180; lon <= 180; lon += 15) { g.beginPath(); g.moveTo(X(lon), 0); g.lineTo(X(lon), H); g.stroke(); }
  for (let lat = -75; lat <= 75; lat += 15) { g.beginPath(); g.moveTo(0, Y(lat)); g.lineTo(W, Y(lat)); g.stroke(); }
  const land: number[][][] = [
    [[-168, 66], [-160, 71], [-130, 70], [-95, 73], [-80, 70], [-62, 60], [-55, 50], [-66, 44], [-76, 35], [-81, 25], [-97, 26], [-97, 19], [-87, 15], [-83, 9], [-79, 8], [-92, 15], [-106, 23], [-115, 31], [-124, 40], [-125, 49], [-135, 57], [-152, 59], [-165, 60]],
    [[-55, 60], [-45, 60], [-20, 70], [-20, 80], [-60, 82], [-70, 77]],
    [[-80, 8], [-62, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -27], [-58, -38], [-66, -55], [-73, -50], [-72, -30], [-70, -18], [-81, -5]],
    [[-10, 36], [-9, 44], [0, 49], [5, 53], [10, 57], [5, 62], [20, 70], [40, 68], [60, 70], [80, 73], [100, 77], [140, 72], [170, 68], [180, 66], [160, 60], [140, 55], [135, 45], [122, 40], [122, 30], [110, 20], [105, 10], [100, 2], [98, 15], [92, 22], [80, 8], [72, 20], [58, 25], [50, 30], [35, 35], [28, 41], [24, 37], [15, 40], [10, 44], [3, 43]],
    [[-17, 21], [-10, 33], [10, 37], [32, 31], [43, 12], [51, 12], [40, -15], [35, -25], [20, -35], [12, -17], [9, 4], [-8, 5], [-15, 10]],
    [[114, -22], [130, -12], [142, -11], [153, -27], [146, -39], [135, -35], [115, -34]],
    [...Array.from({ length: 25 }, (_, i) => [-180 + i * 15, -70 - 6 * Math.abs(Math.sin(i * 1.7))]), [180, -90], [-180, -90]],
    [[-6, 50], [2, 51], [-2, 58], [-6, 57]], [[130, 31], [140, 35], [142, 43], [137, 38]], [[95, 5], [120, 0], [140, -5], [118, -8], [100, -4]],
  ];
  for (const poly of land) {
    g.beginPath(); poly.forEach(([lo, la], i) => (i ? g.lineTo(X(lo), Y(la)) : g.moveTo(X(lo), Y(la)))); g.closePath();
    g.fillStyle = "#2c8a6a"; g.fill(); g.strokeStyle = "#8ff0c0"; g.lineWidth = 4; g.stroke();
  }
  // orbit ground tracks (sine waves), the current one bright
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = k === 2 ? "#ffe060" : "rgba(255,255,255,0.75)"; g.lineWidth = k === 2 ? 7 : 4; g.setLineDash(k === 2 ? [] : [18, 12]);
    g.beginPath();
    for (let lon = -180; lon <= 180; lon += 2) { const la = 32.5 * Math.sin(((lon + 80 - k * 23) * Math.PI) / 180); const x = X(lon), y = Y(la); if (lon === -180) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke();
  }
  g.setLineDash([]);
  // tracking stations
  for (const [lo, la] of [[-80.6, 28.5], [-64.6, 32.3], [-15.6, 27.7], [149, -35.4], [-155.6, 19.7], [-117, 35.4], [-4.2, 40.4], [-77, -12], [132, 33]]) {
    g.strokeStyle = "#ff6a4a"; g.lineWidth = 5; g.beginPath(); g.arc(X(lo), Y(la), 16, 0, 7); g.stroke();
  }
  // spacecraft marker on the bright track
  const lon0 = -40, la0 = 32.5 * Math.sin(((lon0 + 80 - 46) * Math.PI) / 180);
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(X(lon0), Y(la0), 14, 0, 7); g.fill();
});

class Mission {
  root = new THREE.Group();
  S = lset();
  crt: THREE.ShaderMaterial; clock: THREE.ShaderMaterial;
  constructor() {
    const S = this.S, b = new Bat();
    this.root.position.set(...MCC);
    const at = atlas();
    this.crt = crtMat(at); this.clock = clockMat(at);
    const mCab = imat(S, { col: "#56708a" }), mTur = imat(S, { col: "#647f96" }), mDesk = imat(S, { col: "#ddd6c2" }), mKick = imat(S, { col: "#22282f" });
    const mBez = imat(S, { col: "#262c33" }), mDiv = imat(S, { col: "#3a4550" }), mChair = imat(S, { col: "#2e3a55" }), mChairF = imat(S, { col: "#1c2026" });
    const mMetal = imat(S, { col: "#aab3bb" }), mWhite = imat(S, { col: "#efece2" });
    const bt = consoleBtnTex();
    const mBtn = imat(S, { map: bt.a, em: bt.b, gain: 2.0 });
    const mPlac = imat(S, { map: placardTex(), emCol: [0.12, 0.12, 0.12] });
    const mCarpet = imat(S, { map: carpetTex() }), mCeil = imat(S, { map: ceilTex() }), mWallA = imat(S, { map: acousticTex() });
    const mStrip = imat(S, { col: "#ffcf6a", emCol: [1.6, 1.0, 0.3] });
    const mPanelLight = imat(S, { col: "#ffffff", emCol: [0.8, 0.85, 1.0] });
    const mLit = [imat(S, { col: "#7dff9a", emCol: [0.5, 2.2, 0.8] }), imat(S, { col: "#ffbf3a", emCol: [2.2, 1.4, 0.3] }), imat(S, { col: "#f4f4ff", emCol: [1.8, 1.8, 2.0] })];
    const mBinder = [imat(S, { col: "#d23a2a" }), imat(S, { col: "#2f6fd0" }), imat(S, { col: "#f2c21c" }), imat(S, { col: "#f1eee4" })];
    const crtG: THREE.BufferGeometry[] = [], clkG: THREE.BufferGeometry[] = [];
    const addScreen = (list: THREE.BufferGeometry[], w: number, h: number, m: THREE.Matrix4, s: [number, number, number, number]) => {
      const g = clean(plane(w, h)); g.applyMatrix4(m);
      const n = g.getAttribute("position").count, a = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) a.set(s, i * 4);
      g.setAttribute("aS", new THREE.Float32BufferAttribute(a, 4));
      list.push(g);
    };
    // ---- room: floor (carpet), riser, walls, ceiling with light panels
    const X0 = -9.5, X1 = 9.5, Z0 = -14, Z1 = 7.6, HT = 7.2;
    b.add(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0).rotateX(-Math.PI / 2).translate(0, 0, (Z0 + Z1) / 2).setAttribute("uv", new THREE.Float32BufferAttribute([0, 6, 5, 6, 0, 0, 5, 0], 2)), mCarpet);
    b.box(mCab, X0, 0, 3.4, X1, 0.35, Z1);                                 // riser for the back row
    b.add(new THREE.PlaneGeometry(X1 - X0, Z1 - 3.4).rotateX(-Math.PI / 2).translate(0, 0.352, (3.4 + Z1) / 2).setAttribute("uv", new THREE.Float32BufferAttribute([0, 2, 5, 2, 0, 0, 5, 0], 2)), mCarpet);
    b.box(mStrip, X0, 0.3, 3.38, X1, 0.33, 3.405);                         // lit nosing on the step
    b.add(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0).rotateX(Math.PI / 2).translate(0, HT, (Z0 + Z1) / 2).setAttribute("uv", new THREE.Float32BufferAttribute([0, 11, 10, 11, 0, 0, 10, 0], 2)), mCeil);
    for (const s of [-1, 1]) b.add(new THREE.PlaneGeometry(Z1 - Z0, HT).rotateY(-s * Math.PI / 2).translate(s * X1, HT / 2, (Z0 + Z1) / 2).setAttribute("uv", new THREE.Float32BufferAttribute([0, 4, 12, 4, 0, 0, 12, 0], 2)), mWallA);
    b.add(new THREE.PlaneGeometry(X1 - X0, HT).rotateY(Math.PI).translate(0, HT / 2, Z1).setAttribute("uv", new THREE.Float32BufferAttribute([0, 4, 10, 4, 0, 0, 10, 0], 2)), mWallA);
    b.add(new THREE.PlaneGeometry(X1 - X0, HT).translate(0, HT / 2, Z0), imat(S, { col: "#1e2236" }));
    for (let i = -3; i <= 3; i++) for (const z of [-10, -6, -2, 2, 6]) {
      b.box(mPanelLight, i * 2.6 - 0.35, HT - 0.06, z - 1.1, i * 2.6 + 0.35, HT - 0.02, z + 1.1);
      b.box(mBez, i * 2.6 - 0.42, HT - 0.03, z - 1.17, i * 2.6 + 0.42, HT, z + 1.17);
    }
    // side wall details: vertical light coves + wainscot
    for (const s of [-1, 1]) {
      b.box(mKick, s * X1 - 0.15, 0, Z0, s * X1, 1.0, Z1);
      for (let z = -12; z <= 6; z += 3.6) b.box(mStrip, s * X1 - 0.08, 1.2, z - 0.06, s * X1 - 0.02, 5.6, z + 0.06);
    }
    // back wall: viewing room windows (dark glass with faint figures-free glow) above the riser
    b.box(mBez, -7.5, 2.4, Z1 - 0.12, 7.5, 4.6, Z1);
    b.add(new THREE.PlaneGeometry(14.6, 1.9).rotateY(Math.PI).translate(0, 3.5, Z1 - 0.13), imat(S, { col: "#0d1428", emCol: [0.05, 0.08, 0.16] }));
    for (let x = -7.5; x <= 7.51; x += 2.5) b.box(mBez, x - 0.06, 2.4, Z1 - 0.2, x + 0.06, 4.6, Z1 - 0.1);
    // ---- front wall: big screens + world map + clock boards
    const wz = Z0 + 0.02;
    b.box(mBez, -9.3, 1.6, wz, 9.3, 7.0, wz + 0.35);                       // screen wall frame
    const mMap = imat(S, { map: mapTex(), em: mapTex(), gain: 1.35, col: "#000000" });
    const map = new THREE.Mesh(plane(8.6, 4.2), mMap); map.position.set(0, 4.1, wz + 0.37); off(map); this.root.add(map);
    b.box(mDiv, -4.5, 1.9, wz + 0.3, 4.5, 2.0, wz + 0.5); b.box(mDiv, -4.5, 6.2, wz + 0.3, 4.5, 6.3, wz + 0.5);
    b.box(mDiv, -4.5, 1.9, wz + 0.3, -4.4, 6.3, wz + 0.5); b.box(mDiv, 4.4, 1.9, wz + 0.3, 4.5, 6.3, wz + 0.5);
    for (const s of [-1, 1]) {
      addScreen(crtG, 3.7, 2.7, TRS(s * 6.85, 4.1, wz + 0.37), [0.31 + s * 0.2 + 1, 0.25, 1, 1.6]);
      b.box(mDiv, s * 6.85 - 1.95, 2.65, wz + 0.3, s * 6.85 + 1.95, 2.75, wz + 0.5); b.box(mDiv, s * 6.85 - 1.95, 5.45, wz + 0.3, s * 6.85 + 1.95, 5.55, wz + 0.5);
      b.box(mDiv, s * 6.85 - 1.95, 2.65, wz + 0.3, s * 6.85 - 1.85, 5.55, wz + 0.5); b.box(mDiv, s * 6.85 + 1.85, 2.65, wz + 0.3, s * 6.85 + 1.95, 5.55, wz + 0.5);
      addScreen(crtG, 1.75, 0.75, TRS(s * 7.8, 2.15, wz + 0.37), [0.7 + s * 0.13 + 2, 0.6, 3, 0.7]);
      addScreen(crtG, 1.75, 0.75, TRS(s * 5.9, 2.15, wz + 0.37), [0.9 + s * 0.11 + 3, 0.45, 2, 0.7]);
    }
    // clocks row (amber digits) + labels
    for (let i = 0; i < 5; i++) {
      const x = -6.4 + i * 3.2;
      b.box(mBez, x - 1.4, 6.35, wz + 0.3, x + 1.4, 7.0, wz + 0.55);
      addScreen(clkG, 2.3, 0.42, TRS(x + 0.15, 6.62, wz + 0.56), [[52, 61200 + 43, 33, 7 * 86400 + 3, 360][i], 0, 0, 0]);
    }
    // ---- console rows
    const profile = new THREE.Shape([[0.62, 0], [0.62, 0.7], [0.4, 0.7], [0.4, 0.74], [0.58, 0.74], [0.78, 0.94], [0.8, 0.95], [0.9, 1.62], [1.3, 1.57], [1.3, 0]].map(([d, y]) => new THREE.Vector2(d, y)));
    const PW = 1.5;
    const ext = new THREE.ExtrudeGeometry(profile, { depth: PW, bevelEnabled: false });
    const toWorld = new THREE.Matrix4().makeBasis(V3(0, 0, -1), V3(0, 1, 0), V3(1, 0, 0)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -PW / 2));
    ext.applyMatrix4(toWorld);
    const btnU = V3(1, 0, 0), btnV = V3(0, 0.2, -0.2).normalize(), btnN = btnU.clone().cross(btnV);
    const crtV = V3(0, 0.67, -0.1).normalize(), crtN = btnU.clone().cross(crtV);
    let si = 0;
    ROWS.forEach((row, ri) => {
      row.xs.forEach((x, pi) => {
        const base = new THREE.Matrix4().makeTranslation(x, row.y, row.z);
        const W = (m: THREE.Matrix4) => base.clone().multiply(m);
        b.add(ext, ri === 0 ? mCab : mTur, base);
        b.box(mKick, -PW / 2 + 0.01, 0, -0.66, PW / 2 - 0.01, 0.1, -0.6, base);
        b.box(mDesk, -PW / 2, 0.735, -0.6, PW / 2, 0.775, -0.36, base);   // writing ledge
        b.box(mDiv, PW / 2 - 0.03, 0.0, -1.32, PW / 2 + 0.03, 1.56, -0.36, base); // divider fin between positions
        if (pi === 0) b.box(mDiv, -PW / 2 - 0.03, 0.0, -1.32, -PW / 2 + 0.03, 1.56, -0.36, base);
        // button panel (slanted) overlay: alternate halves of the button atlas
        const bp = clean(plane(PW - 0.08, 0.27));
        const uvs = bp.getAttribute("uv") as THREE.BufferAttribute;
        for (let k = 0; k < uvs.count; k++) uvs.setX(k, uvs.getX(k) * 0.5 + (pi % 2) * 0.5);
        b.add(bp, mBtn, W(basis(V3(0, 0.845, -0.68).addScaledVector(btnN, 0.006), btnU, btnV, btnN)));
        // CRT face: two screens in bezels
        const faceAt = (y: number) => V3(0, y, -(0.8 + ((y - 0.95) * 0.1) / 0.67));
        const fc = faceAt(1.2);
        b.add(plane(PW - 0.04, 0.5), mDiv, W(basis(fc.clone().addScaledVector(crtN, 0.004), btnU, crtV, crtN)));
        for (const sx of [-0.36, 0.36]) {
          const c = fc.clone().add(V3(sx, 0, 0));
          const bm = W(basis(c, btnU, crtV, crtN));
          b.box(mBez, -0.31, -0.24, 0, 0.31, 0.24, 0.035, bm);
          b.box(mBez, -0.31, 0.2, 0.035, 0.31, 0.24, 0.09, bm);            // little hood
          const seed = (si * 0.137) % 1, delay = ((si * 0.61803) % 1);
          addScreen(crtG, 0.5, 0.36, W(basis(c.clone().addScaledVector(crtN, 0.037), btnU, crtV, crtN)), [seed, delay, (si * 7) % 5 === 0 ? 3 : (si % 3 === 0 ? 1 : si % 4 === 0 ? 2 : 0), 1]);
          si++;
          // channel knobs beside the screen
          const kn = new THREE.CylinderGeometry(0.018, 0.02, 0.025, 10); kn.rotateX(Math.PI / 2); kn.translate(sx > 0 ? 0.33 : -0.33, -0.15, 0.012);
          b.add(kn, mKick, bm);
        }
        // placard + status lamp strip on the hood
        const nameIdx = ROWS.slice(0, ri).reduce((a, r) => a + r.names.length, 0) + pi;
        const pg = clean(plane(0.5, 0.11)); const pu = pg.getAttribute("uv") as THREE.BufferAttribute;
        for (let k = 0; k < pu.count; k++) { pu.setX(k, ((nameIdx % 4) + 0.04 + pu.getX(k) * 0.92) / 4); pu.setY(k, 1 - (Math.floor(nameIdx / 4) + 0.17 + (1 - pu.getY(k)) * 0.66) / 8); }
        b.add(pg, mPlac, W(basis(faceAt(1.535).addScaledVector(crtN, 0.006), btnU, crtV, crtN)));
        for (let k = 0; k < 6; k++) {
          const lit = ((si + k * 3) % 5) !== 0;
          b.box(lit ? mLit[k % 3] : mKick, -0.025, -0.015, 0, 0.025, 0.015, 0.02, W(basis(faceAt(1.535).add(V3(k < 3 ? -0.6 + k * 0.07 : 0.32 + (k - 3) * 0.07, 0, 0)), btnU, crtV, crtN)));
        }
        // desk clutter: binders, coffee cup, ashtray (deterministic per position)
        const rr = rng(ri * 31 + pi * 7 + 3);
        if (rr() < 0.6) { const bx = -0.6 + rr() * 0.3; b.box(mBinder[Math.floor(rr() * 4)], bx, 0.775, -0.56, bx + 0.24, 0.81, -0.4, base); }
        if (rr() < 0.5) { const c = new THREE.CylinderGeometry(0.035, 0.03, 0.09, 10); c.translate(0.45 + rr() * 0.15, 0.82, -0.47); b.add(c, mWhite, base); }
        if (rr() < 0.4) { const c = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10); c.translate(-0.15 + rr() * 0.2, 0.785, -0.45); b.add(c, mMetal, base); }
        // headset hanging off the hood (dark loop)
        if (rr() < 0.6) { const t = new THREE.TorusGeometry(0.07, 0.01, 5, 14, Math.PI); t.translate(-0.55, 1.0, -0.6); b.add(t, mKick, base); }
        // chair (swivelled a little; Aaron's turned toward the room)
        const sw = row.names[pi] === "EECOM" ? 1.25 : row.names[pi] === "FLIGHT" ? -0.35 : (rr() - 0.5) * 0.8;
        const cm = new THREE.Matrix4().makeTranslation(x, row.y, row.z + 0.12).multiply(new THREE.Matrix4().makeRotationY(sw));
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const leg = new THREE.BoxGeometry(0.04, 0.03, 0.3); leg.translate(0, 0.04, 0.15); leg.applyMatrix4(new THREE.Matrix4().makeRotationY(a)); b.add(leg, mChairF, cm); }
        const post = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8); post.translate(0, 0.22, 0); b.add(post, mMetal, cm);
        b.box(mChair, -0.25, 0.4, -0.23, 0.25, 0.48, 0.23, cm);
        b.box(mChair, -0.23, 0.55, 0.2, 0.23, 0.92, 0.27, cm);
        b.box(mChairF, -0.03, 0.42, 0.22, 0.03, 0.6, 0.26, cm);
        for (const s of [-1, 1]) { b.box(mChairF, s * 0.25 - 0.02, 0.48, -0.15, s * 0.25 + 0.02, 0.64, -0.11, cm); b.box(mChairF, s * 0.25 - 0.03, 0.64, -0.2, s * 0.25 + 0.03, 0.67, 0.12, cm); }
      });
    });
    // the CRT + clock meshes (one draw each)
    const crt = new THREE.Mesh(mergeGeometries(crtG.map((g) => g), false), this.crt); off(crt); crt.matrixAutoUpdate = false; crt.updateMatrix(); this.root.add(crt);
    const clk = new THREE.Mesh(mergeGeometries(clkG, false), this.clock); off(clk); this.root.add(clk);
    // a lectern-style flight director plaque + coffee pot cart at the side
    b.box(mCab, 7.6, 0, -2.5, 8.6, 0.9, -1.7); b.box(mWhite, 7.9, 0.9, -2.25, 8.1, 1.15, -2.05);
    b.build(this.root);
    off(this.root);
  }
  update(id: number, t: number, f: number) {
    const g = screensAt(id, t), S = this.S, o = this.root.position, P = (x: number, y: number, z: number) => V3(o.x + x, o.y + y, o.z + z);
    this.crt.uniforms.uG.value = g; this.crt.uniforms.uF.value = f;
    this.clock.uniforms.uT.value = t;
    // screen-glow flicker with the garbage (deterministic per frame)
    const fl = 1 + g * 0.35 * Math.sin(f * 2.7) * Math.sin(f * 1.3 + 1);
    const crtC: [number, number, number] = [0.32 * fl, 0.62 * fl, 0.5 * fl];
    const L: [THREE.Vector3, [number, number, number], number][] = [
      [P(-4, 6.6, -3), [0.35, 0.36, 0.5], 5.5], [P(4, 6.6, -3), [0.35, 0.36, 0.5], 5.5],
      [P(-4, 6.6, 4), [0.32, 0.33, 0.46], 5.5], [P(4, 6.6, 4), [0.32, 0.33, 0.46], 5.5],
      [P(0, 4.2, -12.6), [0.5, 0.9, 1.1], 5.5],                   // map glow
      [P(-6.8, 4, -12.8), [0.35, 0.7, 0.75], 3.5], [P(6.8, 4, -12.8), [0.35, 0.7, 0.75], 3.5],
      [P(-2.8, 1.3, -4.2), crtC, 1.6], [P(2.4, 1.3, -4.2), crtC, 1.6], // CRT glow toward the controllers, per row
      [P(-4.6, 1.3, 0.7), crtC, 1.6], [P(2.6, 1.3, 0.7), crtC, 1.6],
      [P(-2.2, 1.3, 2.3), crtC, 1.6], [P(2.2, 1.3, 2.3), crtC, 1.6],
      [P(0, 1.65, 5.0), crtC, 2.2],
    ];
    for (let i = 0; i < NL; i++) { const l = L[i]; if (l) { S.lp[i].copy(l[0]); S.lc[i].set(...l[1]); S.lr[i] = l[2]; } }
    (S.u.uAU.value as THREE.Vector3).set(0.13, 0.12, 0.24);
    (S.u.uAD.value as THREE.Vector3).set(0.08, 0.07, 0.13);
  }
}

// ============================================================ public class
export class Interiors {
  root = new THREE.Group();
  private cabin = new Cabin();
  private mcc = new Mission();
  constructor() {
    this.root.add(this.cabin.root, this.mcc.root);
    // some merged/offset panels had bounding spheres that culled them at certain camera angles (screens blinking dark): never cull
    this.root.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    // a set is drawn only when the camera is inside / near it (each set is far away from everything else)
    const near = (o: readonly number[], r: number) => Math.hypot(cam.position.x - o[0], cam.position.y - o[1], cam.position.z - o[2]) < r;
    this.cabin.root.visible = near(CABIN, 40);
    this.mcc.root.visible = near(MCC, 60);
    if (this.cabin.root.visible) this.cabin.update(id, t, f);
    if (this.mcc.root.visible) this.mcc.update(id, t, f);
  }
}
void FPS;
