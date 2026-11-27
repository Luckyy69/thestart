// OWNER: micro agent. MICRO (shot 3): INSIDE a fingertip at giant scale, a cutaway diorama that reads at phone size.
//
//   TOP     : a peach-pink skin landscape (rest surface y 4) with fingerprint ridge arcs (shader lines, whorl far back),
//             a waxy sheen + a warm pink rim; it domes away into a pink haze beyond z -12 (the fingertip's curve).
//   FRONT   : the CUT FACE (plane z 0, facing +z = the camera), layers top -> down: the skin line, cream EPIDERMIS
//             with a wavy papillae border, pink DERMIS with collagen squiggles, yellow bubbly FAT below.
//   IN FRONT of the cut face (axes z 0.75, run along x, x -16..16):
//             VESSEL A (upper, y 2.1, R 0.55, blood flows +x) and VESSEL B (lower, y -0.3, R 0.5, flows -x): glowing
//             glass tubes (fresnel rim + gloss streak, black hull outline) with a dark-red lumen and inked red blood
//             cells tumbling through; the glowing yellow NERVE (y 0.9, z 0.85, r 0.2) runs between them, and its little
//             WHITE-GLOVED HANDS (yellow arms) hug the vessels every 1.5 m (A at x = -7.5,-4.5,-1.5,1.5,4.5,7.5;
//             B at -6,-3,0,3,6).
// microAt(3,t):
//   wet     : 16 glossy blue drops fall from the sky and bead on the skin (x -3.2..4.2, z -4.5..-0.5), shine goes up.
//   squeeze : 3 bright pulses race along the nerve (+x, "SQUEEZE!" label pops); every hand clamps as a pulse passes;
//             both vessels narrow to 64 % and darken (red -> maroon), the cells slow down.
//   shrink  : the whole skin sinks 0.4 m (the face's top edge drops with it).
//   fold    : it FOLDS into deep grooves running along z (period GROOVE_P 1.5 m, valleys at x = k*1.5, depth 0.85),
//             spreading out from x 1.5; valleys go rosy-dark, hills stay peach; the water beads slide into the valleys
//             and stretch into streaks (the "rain tread" channels). The cut face's top edge shows the same wavy profile.
//   tire    : a giant cartoon "RAIN TIRE" (8 lugs, lug pitch = GROOVE_P) rolls in from the right ON the skin with
//             no slip, and its lugs MESH into the grooves like a gear on a rack; it lands at TIRE_REST on "tread"
//             with a lug in the valley at x 1.5 (slight overshoot + settle).
// Visible only in shot 3 (root.visible = id === 3).
//
// ===== CONTRACTS for the camera owner (LOCAL to MICRO = (1000,0,0); world = MICRO + local) =====
//   Solid: the skin block fills z <= 0, y <= ~4 (x -16..16); the vessels/nerve/hands occupy x -16..16, y -0.9..2.85,
//   z 0..1.5; the TIRE (from frame ~632) occupies x -1..4 (rolling in from x 15), y 3.6..8.1, z -2.2..-0.1; falling
//   drops come down from y ~20 over x -3.2..4.2, z -4.5..-0.5 (frames ~430-462).
//   CLEARANCE: keep cameras at z >= 6 (or y >= 10 over the block). The keys below stay >= 10 m from everything.
//   Recommended keys (MICRO_CAM_KEYS, tested in stills; fov 45; LOCAL pos -> LOCAL look):
//     398 (0,15,17)     -> (0,4,-3)     high + wide: diving down over the fingertip as the drops start
//     450 (0.4,6.4,13)  -> (0.4,2.4,0)  LAND: cut face + skin; drops bead (437-460), hold for "nerves squeeze" (472)
//     545 (0.6,6.2,12.4)-> (0.4,2.4,0)  (slow drift while the vessels squeeze)
//     585 (1.0,8.2,13.6)-> (1.0,3.1,-1) rise to see the grooves AND the tire landing zone; LAND before "fold" (598)
//     707 (1.0,8.0,13.0)-> (1.0,3.1,-1) hold (tiny push): the tire rolls into the still frame, lands on "tread" (662)
//   Focus distance ~13-15 m; nothing here is farther than ~45 m, so keep cInf small (<= 0.3) for a sharp backdrop.
//   MICRO_FOCUS = the cut-face centre (0.5, 2.4, 0) local.
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { ctex } from "../bridge/paint";
import { MICRO, V3, W, microAt, shotStart, smooth, clamp01, glide } from "./story";

const DEBUG = false; // TEMP: fly the recommended MICRO_CAM_KEYS for stills (must be false when reporting)
const TAU = Math.PI * 2;

// ============================== public contracts ==============================
/** rest skin surface height (local y) */
export const SKIN_Y = 4;
/** groove period along x (m); valleys at x = k * GROOVE_P (near the front, z > -3) */
export const GROOVE_P = 1.2;
export const GROOVE_D = 0.8;
export const SHRINK_D = 0.4;
/** the tire: 8 lugs, rolling radius = 8 * GROOVE_P / 2pi (so it meshes with the grooves), final axle (local) */
export const TIRE_N = 10;
export const TIRE_R = (TIRE_N * GROOVE_P) / TAU;
export const TIRE_X = 1.2, TIRE_Z = -1.15;
export const TIRE_REST: V3 = [MICRO[0] + TIRE_X, MICRO[1] + SKIN_Y - SHRINK_D + TIRE_R + 0.01, MICRO[2] + TIRE_Z];
export const VESSEL_A = { y: 2.1, z: 0.75, r: 0.55 }, VESSEL_B = { y: -0.3, z: 0.75, r: 0.5 }, NERVE = { y: 0.9, z: 0.85, r: 0.2 };
export const MICRO_FOCUS: V3 = [MICRO[0] + 0.5, MICRO[1] + 2.4, MICRO[2]];
type CamKey = { f: number; pos: V3; look: V3; fov: number };
const mi = (x: number, y: number, z: number): V3 => [MICRO[0] + x, MICRO[1] + y, MICRO[2] + z];
/** recommended shot-3 camera keys (WORLD coordinates), see the header */
export const MICRO_CAM_KEYS: CamKey[] = [
  { f: 398, pos: mi(0, 15, 17), look: mi(0, 4, -3), fov: 45 },
  { f: 450, pos: mi(0.4, 7.2, 13.2), look: mi(0.4, 2.3, 0), fov: 45 },
  { f: 545, pos: mi(0.6, 7.0, 12.6), look: mi(0.4, 2.3, 0), fov: 45 },
  { f: 585, pos: mi(1.0, 8.2, 13.6), look: mi(1.0, 3.1, -1), fov: 45 },
  { f: 707, pos: mi(1.0, 8.0, 13.0), look: mi(1.0, 3.1, -1), fov: 45 },
];

// ============================== helpers ==============================
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const h1 = (n: number) => hash(n, n * 0.37 + 1.3);
const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const bump = (x: number, w: number) => (x <= 0 || x >= w ? 0 : Math.sin((Math.PI * x) / w));
const C = (h: string) => new THREE.Color(h);
const backOut = (u: number, c = 0.9) => { const x = clamp01(u) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

// ============================== skin height field ==============================
const XB = 16, YBOT = -14;
/** grooves meander a little far back, straight near the front (the tire meshes there) */
const meander = (z: number) => 0.35 * Math.sin(z * 0.21 + 0.7) * smooth(-z / 7 - 0.4);
const baseH = (x: number, z: number) => {
  const und = (0.14 * vn(x * 0.18 + 3, z * 0.18) + 0.05 * vn(x * 0.5, z * 0.5 + 7)) * smooth((-z - 3) / 6);
  const dz = Math.max(0, -z - 12), dx = Math.max(0, Math.abs(x) - 9);
  return SKIN_Y + und - 0.011 * dz * dz - 0.03 * dx * dx;
};
const grooveG = (u: number) => { const c = 0.5 + 0.5 * Math.cos((TAU * u) / GROOVE_P); return c * Math.sqrt(c); };
const zFade = (z: number) => 1 - 0.4 * smooth((-z - 12) / 20);
type St = { wet: number; squeeze: number; shrink: number; fold: number; tire: number };
/** fold envelope: the folding spreads out from the tire's landing valley */
const foldEnv = (x: number, fold: number) => smooth(fold * 1.8 - (0.8 * Math.abs(x - TIRE_X)) / XB);
/** local skin height at (x,z) for a microAt state */
export const skinHeight = (x: number, z: number, s: St) =>
  baseH(x, z) - SHRINK_D * s.shrink - GROOVE_D * foldEnv(x, s.fold) * zFade(z) * grooveG(x - meander(z));

// ============================== shader patches ==============================
const U = {
  uRim: { value: new THREE.Vector3(0.34, 0.13, 0.12) },
  uSurf: { value: C("#ff9c8a") }, uEpi: { value: C("#ffe2cc") }, uEpi2: { value: C("#ffd0b4") }, uBasal: { value: C("#e2607a") },
  uDerm1: { value: C("#ffa2ac") }, uDerm2: { value: C("#f3849a") }, uFat: { value: C("#ffdc8c") }, uFatEdge: { value: C("#eaa95a") },
};
const GLSL_HELP = `
varying vec3 vLp;
uniform vec3 uRim;
float stE(float e, float x) { float w = fwidth(x) * 0.8 + 1e-4; return smoothstep(e - w, e + w, x); }
vec2 h2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
`;
const RIDGES = `
{
  float ph = length(vLp.xz - vec2(0.6, -27.0)) / 0.42;
  float c = 0.5 + 0.5 * cos(6.2832 * ph);
  float aa = fwidth(ph);
  float k = 1.0 - smoothstep(0.2, 0.5, aa);
  float line = smoothstep(0.6, 0.92, c) * k;
  diffuseColor.rgb *= (1.0 - 0.24 * line) * (1.0 + 0.06 * (1.0 - c) * k);
}
`;
const FACE = `
{
  float d0 = vD;
  float d = d0 + 0.09 * sin(vLp.x * 4.1) + 0.04 * sin(vLp.x * 9.3 + 1.0);
  float dh = d0 - 3.9 - 0.28 * sin(vLp.x * 1.3 + 0.4);
  vec3 epi = mix(uEpi, uEpi2, clamp(d / 0.62, 0.0, 1.0)) * (1.0 - 0.05 * smoothstep(0.75, 1.0, sin(d * 38.0 + sin(vLp.x * 3.0))));
  vec3 derm = mix(uDerm1, uDerm2, clamp((d - 0.68) / 3.2, 0.0, 1.0));
  derm *= 1.0 - 0.07 * smoothstep(0.82, 1.0, sin(vLp.x * 2.6 + 2.8 * sin(vLp.y * 1.9 + vLp.x * 0.4)));
  vec2 p = vLp.xy / 0.62; vec2 ip = floor(p), fp = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int k = -1; k <= 1; k++) {
    vec2 o = vec2(float(j), float(k)); vec2 r = o + 0.5 + 0.6 * (h2(ip + o) - 0.5) - fp; float dd = dot(r, r);
    if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) { d2 = dd; }
  }
  float edge = sqrt(d2) - sqrt(d1);
  vec3 fat = mix(uFatEdge, uFat, smoothstep(0.03, 0.13, edge)) * (1.0 + 0.14 * (1.0 - sqrt(d1)));
  vec3 col = uSurf;
  col = mix(col, epi, stE(0.07, d0));
  col = mix(col, uBasal, stE(0.6, d));
  col = mix(col, derm, stE(0.68, d));
  col = mix(col, uFatEdge, stE(-0.06, dh));
  col = mix(col, fat, stE(0.0, dh));
  diffuseColor.rgb = col;
}
`;
const patch = <T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, kind: "skin" | "face"): T => {
  twoTone(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    Object.assign(sh.uniforms, U);
    const face = kind === "face";
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vLp;" + (face ? "\nattribute float aD; varying float vD;" : ""))
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLp = position;" + (face ? " vD = aD;" : ""));
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + GLSL_HELP + (face ? "varying float vD;\nuniform vec3 uSurf, uEpi, uEpi2, uBasal, uDerm1, uDerm2, uFat, uFatEdge;\n" : ""))
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + (face ? FACE : RIDGES))
      .replace("reflectedLight.indirectDiffuse = vec3( 0.0 );",
        "reflectedLight.indirectDiffuse = vec3( 0.0 );\n  reflectedLight.directDiffuse += uRim * diffuseColor.rgb * 2.2 * pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 3.0);");
  };
  m.customProgramCacheKey = () => "wrMicro1_" + kind;
  return m;
};

// ============================== vessel shell (glass) ==============================
const shellMat = () => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: new THREE.Color(4.2, 0.55, 0.62) }, uK: { value: 1 } },
  vertexShader: `varying vec3 vN; varying vec3 vV;
    void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uCol; uniform float uK; varying vec3 vN; varying vec3 vV;
    void main(){ vec3 n = normalize(vN), v = normalize(vV); float f = 1.0 - abs(dot(n, v));
      vec3 L = normalize(vec3(0.35, 0.75, 0.55)); float hl = pow(max(dot(reflect(-v, n), L), 0.0), 36.0);
      float hl2 = pow(max(dot(reflect(-v, n), normalize(vec3(-0.5, 0.3, 0.8))), 0.0), 60.0);
      vec3 c = uCol * uK * (0.12 + 0.9 * pow(f, 2.2)) + vec3(2.2, 2.0, 1.9) * (hl + 0.5 * hl2);
      float a = clamp(0.16 + 0.75 * pow(f, 1.6) + hl + 0.5 * hl2, 0.0, 1.0);
      gl_FragColor = vec4(c, a); }`,
  transparent: true, depthWrite: false,
});

// ============================== textures ==============================
const FONT = "'Inter Display', 'Inter', 'Liberation Sans', Arial, sans-serif";
const labelTex = (key: string, text: string, fill: string, w = 1024, h = 320, rot = -0.08) => ctex("wrMicroLbl_" + key, w, h, (g) => {
  g.clearRect(0, 0, w, h);
  g.translate(w / 2, h / 2); g.rotate(rot);
  g.font = `900 ${Math.round(h * 0.56)}px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.lineWidth = h * 0.16; g.strokeStyle = "#140a1e"; g.strokeText(text, 0, 0);
  g.fillStyle = fill; g.fillText(text, 0, 0);
});
const sidewallTex = () => ctex("wrMicroSidewall", 1024, 1024, (g) => {
  g.clearRect(0, 0, 1024, 1024);
  g.translate(512, 512);
  g.font = `900 78px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffffff";
  const chars = "RAIN TIRE • ".split("");
  const n = chars.length * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    g.save(); g.rotate(a); g.translate(0, -372); g.fillText(chars[i % chars.length], 0, 0); g.restore();
  }
});

/** a giant bath-foam bubble drifting in the pink sky beyond the fingertip: inked rim, iridescent film, a highlight */
const bubbleTex = () => ctex("wrMicroBubble", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  const c = 256, r = 236;
  const film = g.createRadialGradient(c, c, r * 0.55, c, c, r);
  film.addColorStop(0, "rgba(255,240,250,0.05)"); film.addColorStop(0.7, "rgba(255,215,240,0.22)"); film.addColorStop(1, "rgba(255,255,255,0.65)");
  g.fillStyle = film; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
  const iri = g.createLinearGradient(0, 0, 512, 512);
  iri.addColorStop(0, "rgba(120,220,255,0.75)"); iri.addColorStop(0.35, "rgba(255,170,230,0.7)"); iri.addColorStop(0.65, "rgba(255,236,140,0.7)"); iri.addColorStop(1, "rgba(150,140,255,0.75)");
  g.strokeStyle = iri; g.lineWidth = 22; g.beginPath(); g.arc(c, c, r - 16, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(40,18,48,0.9)"; g.lineWidth = 9; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 22; g.lineCap = "round";
  g.beginPath(); g.arc(c, c, r * 0.72, Math.PI * 1.08, Math.PI * 1.42); g.stroke();
  g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath(); g.arc(c - r * 0.2, c - r * 0.62, 12, 0, TAU); g.fill();
});
const BUBBLES = Array.from({ length: 11 }, (_, i) => ({
  x: -11 + 24 * ((i * 0.618) % 1), y: 3.2 + 6 * h1(i * 11 + 3), z: -26 - 28 * h1(i * 7 + 1), r: 0.9 + 2.0 * h1(i * 5 + 9), ph: TAU * h1(i * 3),
}));

/** merge non-indexed geometries (position + normal, zero uv) */
const mergeList = (list: THREE.BufferGeometry[]) => {
  const ls = list.map((p) => (p.index ? p.toNonIndexed() : p));
  let total = 0; for (const p of ls) total += p.getAttribute("position").count;
  const P = new Float32Array(total * 3), N = new Float32Array(total * 3);
  let o = 0;
  for (const p of ls) {
    const pa = p.getAttribute("position"), na = p.getAttribute("normal");
    for (let i = 0; i < pa.count; i++) { P[(o + i) * 3] = pa.getX(i); P[(o + i) * 3 + 1] = pa.getY(i); P[(o + i) * 3 + 2] = pa.getZ(i); N[(o + i) * 3] = na.getX(i); N[(o + i) * 3 + 1] = na.getY(i); N[(o + i) * 3 + 2] = na.getZ(i); }
    o += pa.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(total * 2), 2));
  return g;
};

// ============================== Micro ==============================
type Hand = { x: number; up: boolean };
const HANDS: Hand[] = [
  ...[-7.5, -4.5, -1.5, 1.5, 4.5, 7.5].map((x) => ({ x, up: true })),
  ...[-6, -3, 0, 3, 6].map((x) => ({ x, up: false })),
];
const PALM_A = 0.95; // palm angle (rad) off the front, toward the nerve
const PULSES = [0, 1, 2].map((k) => W.squeeze - 0.28 + 0.55 * k);
const PULSE_X0 = -9, PULSE_X1 = 9, PULSE_V = 24;
const NCELL = 64, NDROP = 16;
type Vessel = typeof VESSEL_A;
type TubeG = { g: THREE.BufferGeometry; pos: THREE.BufferAttribute };

export class Micro {
  root = new THREE.Group();
  private surf: THREE.Mesh; private sPos: THREE.BufferAttribute; private sCol: THREE.BufferAttribute;
  private sX: Float32Array; private sZ: Float32Array; private sB: Float32Array; private sU: Float32Array; private nCols: number;
  private skinMat: THREE.MeshPhongMaterial;
  private fPos: THREE.BufferAttribute; private fD: THREE.BufferAttribute;
  private tubes: { inner: TubeG; hull: TubeG; innerMat: THREE.MeshBasicMaterial; shell: THREE.ShaderMaterial; v: Vessel; dir: number }[] = [];
  private cells: THREE.InstancedMesh; private cellMat: THREE.MeshLambertMaterial;
  private nerveMat: THREE.MeshLambertMaterial; private pulse: THREE.InstancedMesh;
  private handsUp: THREE.InstancedMesh; private handsDn: THREE.InstancedMesh; private arms: THREE.InstancedMesh;
  private drops: THREE.InstancedMesh;
  private tire: THREE.Group;
  private squeezeLbl: THREE.Sprite;
  private bubbles: THREE.Sprite[] = [];
  private last = "";
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3(); private e = new THREE.Euler();

  constructor() {
    const R = this.root;
    R.position.set(...MICRO);
    R.visible = false;

    // ---------------- skin surface (indexed grid; CPU-deformed so the ink pass + shadows see the folds) ----------------
    const xs: number[] = []; for (let i = 0; i <= 320; i++) xs.push(-XB + (i * 2 * XB) / 320);
    const zs: number[] = []; let z = 0, dz = 0.1;
    while (z > -48) { zs.push(z); if (z < -9) dz *= 1.06; z -= dz; }
    zs.push(-48);
    const nc = xs.length, nr = zs.length, n = nc * nr;
    this.nCols = nc;
    this.sX = new Float32Array(n); this.sZ = new Float32Array(n); this.sB = new Float32Array(n); this.sU = new Float32Array(n);
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
      const i = r * nc + c, x = xs[c], zz = zs[r];
      this.sX[i] = x; this.sZ[i] = zz; this.sB[i] = baseH(x, zz); this.sU[i] = x - meander(zz);
      pos[i * 3] = x; pos[i * 3 + 1] = this.sB[i]; pos[i * 3 + 2] = zz;
    }
    const idx: number[] = [];
    for (let r = 0; r < nr - 1; r++) for (let c = 0; c < nc - 1; c++) {
      const a = r * nc + c, b = a + 1, d = a + nc, e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
    const sg = new THREE.BufferGeometry();
    this.sPos = new THREE.BufferAttribute(pos, 3); this.sCol = new THREE.BufferAttribute(col, 3);
    sg.setAttribute("position", this.sPos); sg.setAttribute("color", this.sCol); sg.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    sg.setIndex(idx);
    this.skinMat = patch(new THREE.MeshPhongMaterial({ color: "#ffffff", vertexColors: true, specular: new THREE.Color(0.22, 0.17, 0.15), shininess: 34 }), "skin");
    this.surf = new THREE.Mesh(sg, this.skinMat);
    this.surf.receiveShadow = true; this.surf.castShadow = true; this.surf.frustumCulled = false;
    R.add(this.surf);

    // ---------------- cut face (2 rows: the top edge = the surface's front row; the layers are drawn in the shader) ----------------
    const fpos = new Float32Array(nc * 2 * 3), fnrm = new Float32Array(nc * 2 * 3), fd = new Float32Array(nc * 2);
    for (let c = 0; c < nc; c++) for (let r = 0; r < 2; r++) {
      const i = r * nc + c;
      fpos[i * 3] = xs[c]; fpos[i * 3 + 1] = r ? YBOT : SKIN_Y; fnrm[i * 3 + 2] = 1;
    }
    const fidx: number[] = [];
    for (let c = 0; c < nc - 1; c++) { const a = c, b = c + 1, d = nc + c, e = nc + c + 1; fidx.push(d, e, a, e, b, a); }
    const fg = new THREE.BufferGeometry();
    this.fPos = new THREE.BufferAttribute(fpos, 3); this.fD = new THREE.BufferAttribute(fd, 1);
    fg.setAttribute("position", this.fPos); fg.setAttribute("normal", new THREE.BufferAttribute(fnrm, 3)); fg.setAttribute("aD", this.fD);
    fg.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(nc * 4), 2));
    fg.setIndex(fidx);
    const face = new THREE.Mesh(fg, patch(new THREE.MeshLambertMaterial({ color: "#ffffff" }), "face"));
    face.receiveShadow = true; face.castShadow = true; face.frustumCulled = false;
    R.add(face);

    // ---------------- vessels: inner lumen (back faces), black hull outline, glass shell ----------------
    for (const [v, dir] of [[VESSEL_A, 1], [VESSEL_B, -1]] as [Vessel, number][]) {
      const inner = this.tubeGeo(), hull = this.tubeGeo();
      const innerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.035, 0.06), side: THREE.BackSide, fog: false });
      const mIn = new THREE.Mesh(inner.g, innerMat); mIn.layers.set(NOINK); mIn.frustumCulled = false;
      const mHull = new THREE.Mesh(hull.g, new THREE.MeshBasicMaterial({ color: "#12060c", side: THREE.BackSide, fog: false }));
      mHull.layers.set(NOINK); mHull.frustumCulled = false; mHull.castShadow = true;
      const shell = shellMat();
      const mSh = new THREE.Mesh(inner.g, shell); mSh.layers.set(NOINK); mSh.frustumCulled = false; mSh.renderOrder = 3;
      R.add(mIn, mHull, mSh);
      this.tubes.push({ inner, hull, innerMat, shell, v, dir });
    }
    // blood cells: biconcave discs (lathe), inked, tumbling
    const prof = [[0, -0.032], [0.06, -0.045], [0.11, -0.062], [0.15, -0.055], [0.172, -0.02], [0.172, 0.02], [0.15, 0.055], [0.11, 0.062], [0.06, 0.045], [0, 0.032]]
      .map(([a, b]) => new THREE.Vector2(a, b));
    const cg = new THREE.LatheGeometry(prof, 20);
    this.cellMat = twoTone(new THREE.MeshLambertMaterial({ color: "#ff3346", emissive: new THREE.Color(0.35, 0.02, 0.04), side: THREE.DoubleSide }));
    this.cells = new THREE.InstancedMesh(cg, this.cellMat, NCELL * 2);
    this.cells.frustumCulled = false; this.cells.castShadow = false; this.cells.receiveShadow = false;
    R.add(this.cells);

    // ---------------- nerve + pulses + hands ----------------
    this.nerveMat = twoTone(new THREE.MeshLambertMaterial({ color: "#ffd23a", emissive: new THREE.Color(1.0, 0.62, 0.05) }));
    const ng = new THREE.CylinderGeometry(NERVE.r, NERVE.r, 2 * XB, 20, 1, true).rotateZ(Math.PI / 2);
    const nerve = new THREE.Mesh(ng, this.nerveMat); nerve.position.set(0, NERVE.y, NERVE.z); nerve.castShadow = true; nerve.frustumCulled = false;
    R.add(nerve);
    this.pulse = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 3.6, 1.2), fog: false }), PULSES.length);
    this.pulse.frustumCulled = false; R.add(this.pulse);
    const glove = twoTone(new THREE.MeshLambertMaterial({ color: "#fffaf0" }));
    this.handsUp = new THREE.InstancedMesh(this.handGeo(VESSEL_A.r, true), glove, HANDS.filter((h) => h.up).length);
    this.handsDn = new THREE.InstancedMesh(this.handGeo(VESSEL_B.r, false), glove, HANDS.filter((h) => !h.up).length);
    this.arms = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085, 0.1, 1, 12, 1, true), this.nerveMat, HANDS.length);
    for (const m of [this.handsUp, this.handsDn, this.arms]) { m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; R.add(m); }

    // ---------------- water drops ----------------
    const dropMat = twoTone(new THREE.MeshPhongMaterial({ color: "#9ee2ff", emissive: new THREE.Color(0.08, 0.2, 0.32), specular: new THREE.Color(1.4, 1.4, 1.4), shininess: 70 }));
    this.drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), dropMat, NDROP);
    this.drops.frustumCulled = false; this.drops.castShadow = true; R.add(this.drops);

    // ---------------- the RAIN TIRE ----------------
    this.tire = this.buildTire(); R.add(this.tire);

    // ---------------- bath-foam bubbles in the sky (sharp, NOINK) ----------------
    const bm = new THREE.SpriteMaterial({ map: bubbleTex(), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(1.15, 1.05, 1.1) });
    for (let i = 0; i < BUBBLES.length; i++) { const b = new THREE.Sprite(bm); b.layers.set(NOINK); b.frustumCulled = false; b.renderOrder = 1; this.bubbles.push(b); R.add(b); }

    // ---------------- label ----------------
    this.squeezeLbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex("squeeze", "SQUEEZE!", "#ffe14a"), transparent: true, depthWrite: false, depthTest: false, fog: false }));
    this.squeezeLbl.layers.set(NOINK); this.squeezeLbl.frustumCulled = false; this.squeezeLbl.renderOrder = 20; this.squeezeLbl.visible = false;
    R.add(this.squeezeLbl);
  }

  // ---------------- geometry builders ----------------
  private tubeGeo(): TubeG {
    const NX = 200, NA = 32, g = new THREE.BufferGeometry();
    const pos = new Float32Array((NX + 1) * (NA + 1) * 3), nrm = new Float32Array(pos.length);
    for (let i = 0; i <= NX; i++) for (let j = 0; j <= NA; j++) {
      const k = i * (NA + 1) + j, a = (j / NA) * TAU;
      nrm[k * 3 + 1] = Math.sin(a); nrm[k * 3 + 2] = Math.cos(a);
    }
    const idx: number[] = [];
    for (let i = 0; i < NX; i++) for (let j = 0; j < NA; j++) {
      const a = i * (NA + 1) + j, b = a + 1, c = a + NA + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const pa = new THREE.BufferAttribute(pos, 3);
    g.setAttribute("position", pa); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array((NX + 1) * (NA + 1) * 2), 2));
    g.setIndex(idx);
    return { g, pos: pa };
  }
  /** one white-gloved hand hugging a vessel of radius vr (origin = vessel axis, x along it). up: the nerve is BELOW the
   *  vessel (palm at the bottom-front, fingers wrap over the top); else the nerve is above (fingers wrap down the front).
   *  Angles in the y-z plane: 0 = front (+z), +pi/2 = top. */
  private handGeo(vr: number, up: boolean) {
    const parts: THREE.BufferGeometry[] = [];
    const sgn = up ? 1 : -1, pa = -sgn * PALM_A;
    // 3 fat fingers + a short thumb (a classic cartoon glove)
    ([[-0.2, 2.3, 0.1], [0.0, 2.45, 0.1], [0.2, 2.3, 0.1], [0.4, 1.25, 0.09]] as [number, number, number][]).forEach(([dx, len, tr]) => {
      const rg = vr + tr - 0.01, a1 = pa + sgn * len, lo = Math.min(pa, a1);
      parts.push(new THREE.TorusGeometry(rg, tr, 10, 30, len).rotateY(-Math.PI / 2).rotateX(-lo).translate(dx, 0, 0));
      parts.push(new THREE.SphereGeometry(tr * 1.12, 14, 10).translate(dx, Math.sin(a1) * rg, Math.cos(a1) * rg));
    });
    const pr = vr + 0.12;
    parts.push(new THREE.SphereGeometry(1, 18, 12).scale(0.4, 0.24, 0.14).rotateX(-pa).translate(0, Math.sin(pa) * pr, Math.cos(pa) * pr));
    const cr = vr + 0.33;
    parts.push(new THREE.TorusGeometry(0.15, 0.06, 10, 20).rotateX(Math.PI / 2).rotateX(Math.PI / 2 - pa).translate(0, Math.sin(pa) * (cr - 0.04), Math.cos(pa) * (cr - 0.04)));
    parts.push(new THREE.CylinderGeometry(0.15, 0.13, 0.13, 14).rotateX(Math.PI / 2 - pa).translate(0, Math.sin(pa) * cr, Math.cos(pa) * cr));
    return mergeList(parts);
  }
  private buildTire() {
    const g = new THREE.Group();
    const rub = twoTone(new THREE.MeshPhongMaterial({ color: "#45475a", specular: new THREE.Color(0.55, 0.58, 0.75), shininess: 28, side: THREE.DoubleSide }));
    const rubLug = twoTone(new THREE.MeshPhongMaterial({ color: "#45475a", specular: new THREE.Color(0.6, 0.62, 0.8), shininess: 28 }));
    const hubM = twoTone(new THREE.MeshPhongMaterial({ color: "#ffc634", specular: new THREE.Color(0.7, 0.6, 0.4), shininess: 40 }));
    const capM = twoTone(new THREE.MeshPhongMaterial({ color: "#e8ecf4", specular: new THREE.Color(0.9, 0.9, 0.9), shininess: 60 }));
    const W2 = 1.0, Rr = TIRE_R - 0.03, Rin = 1.08, sh = 0.32;
    // carcass profile (radius, axial) with rounded shoulders -> lathe about y, turned so the axle is z
    const prof: THREE.Vector2[] = [new THREE.Vector2(Rin, -W2)];
    for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(Rr - sh + Math.cos(a) * sh, -W2 + sh + Math.sin(a) * sh)); }
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); prof.push(new THREE.Vector2(Rr - sh + Math.cos(a) * sh, W2 - sh + Math.sin(a) * sh)); }
    prof.push(new THREE.Vector2(Rin, W2));
    const carcass = new THREE.Mesh(new THREE.LatheGeometry(prof, 72).rotateX(Math.PI / 2), rub);
    // lugs: two tapered bevelled blocks per pitch (a centre channel between them); lug 4 points straight down at rotation 0
    const shp = new THREE.Shape();
    shp.moveTo(-0.33, 0); shp.lineTo(0.33, 0); shp.lineTo(0.2, 0.3); shp.lineTo(-0.2, 0.3); shp.closePath();
    const half = new THREE.ExtrudeGeometry(shp, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3 });
    const lugs: THREE.BufferGeometry[] = [];
    for (let k = 0; k < TIRE_N; k++) for (const z0 of [0.15, -0.15 - 0.7]) lugs.push(half.clone().translate(0, Rr - 0.04, z0).rotateZ((k * TAU) / TIRE_N));
    const lugM = new THREE.Mesh(mergeList(lugs), rubLug);
    // hub (yellow rim), silver dish, 5 bolts
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(Rin + 0.02, Rin + 0.02, 1.7, 40).rotateX(Math.PI / 2), hubM);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.8, 0.14, 32).rotateX(Math.PI / 2).translate(0, 0, 0.9), capM);
    const bolts: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; bolts.push(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10).rotateX(Math.PI / 2).translate(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 1.0)); }
    const boltM = new THREE.Mesh(mergeList(bolts), hubM);
    // "RAIN TIRE" lettering on the flat sidewall (Rin..Rr-sh), 1.2 cm proud of it
    const Ro = Rr - sh - 0.01;
    const ringG = new THREE.RingGeometry(Rin + 0.04, Ro, 72, 1);
    const ru = ringG.getAttribute("uv") as THREE.BufferAttribute, rp = ringG.getAttribute("position") as THREE.BufferAttribute, S = Ro / 0.94;
    for (let i = 0; i < ru.count; i++) ru.setXY(i, 0.5 + rp.getX(i) / (2 * S), 0.5 + rp.getY(i) / (2 * S));
    const word = new THREE.Mesh(ringG, new THREE.MeshBasicMaterial({ map: sidewallTex(), alphaTest: 0.4, color: new THREE.Color(0.92, 0.9, 0.88) }));
    word.position.z = W2 + 0.012; word.layers.set(NOINK); word.frustumCulled = false;
    for (const m of [carcass, lugM, hub, dish, boltM]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
    g.add(carcass, lugM, hub, dish, boltM, word);
    g.visible = false;
    return g;
  }

  // ---------------- per-frame ----------------
  /** vessel radius at x (global squeeze + pinches under the hands) */
  private vr(v: Vessel, x: number, sq: number, pinch: number[], up: boolean) {
    let k = 1 - 0.36 * sq;
    HANDS.forEach((h, i) => { if (h.up === up && pinch[i] > 0) { const d = (x - h.x) / 0.42; k -= 0.13 * pinch[i] * Math.exp(-d * d); } });
    return v.r * k;
  }

  update(id: number, t: number, f: number, cam: THREE.PerspectiveCamera) {
    const R = this.root;
    R.visible = id === 3;
    if (!R.visible) return;
    if (DEBUG) this.debugCam(f, cam);
    const st = microAt(3, t);

    // ---------- skin surface + cut face ----------
    const key = `${st.shrink.toFixed(4)}_${st.fold.toFixed(4)}`;
    if (key !== this.last) {
      this.last = key;
      const p = this.sPos.array as Float32Array, c = this.sCol.array as Float32Array, n = this.sX.length;
      const hill = C("#ffb69c"), val = C("#d9566e"), tmp = new THREE.Color();
      const env = new Float32Array(this.nCols);
      for (let k = 0; k < this.nCols; k++) env[k] = foldEnv(this.sX[k], st.fold);
      for (let i = 0; i < n; i++) {
        const g = grooveG(this.sU[i]) * env[i % this.nCols] * zFade(this.sZ[i]);
        p[i * 3 + 1] = this.sB[i] - SHRINK_D * st.shrink - GROOVE_D * g;
        tmp.copy(hill).lerp(val, Math.min(1, g * 1.15) * 0.85);
        const bl = 0.06 * vn(this.sX[i] * 0.3 + 5, this.sZ[i] * 0.3);
        c[i * 3] = tmp.r * (1 + bl); c[i * 3 + 1] = tmp.g * (1 + bl * 0.5); c[i * 3 + 2] = tmp.b;
      }
      this.sPos.needsUpdate = true; this.sCol.needsUpdate = true;
      this.surf.geometry.computeVertexNormals();
      const fp = this.fPos.array as Float32Array, fd = this.fD.array as Float32Array;
      for (let k = 0; k < this.nCols; k++) { const top = p[k * 3 + 1]; fp[k * 3 + 1] = top; fd[k] = 0; fd[this.nCols + k] = top - YBOT; }
      this.fPos.needsUpdate = true; this.fD.needsUpdate = true;
    }
    // wet: the waxy skin gets glossier
    const sp = 0.22 + 0.55 * st.wet;
    this.skinMat.specular.setRGB(sp, sp * 0.86, sp * 0.8); this.skinMat.shininess = 34 + 30 * st.wet;

    // ---------- squeeze: pulses + hand pinches ----------
    const pinch = HANDS.map((h) => {
      let m = 0;
      for (const tp of PULSES) m = Math.max(m, bump(t - (tp + (h.x - PULSE_X0) / PULSE_V), 0.4));
      return m;
    });
    PULSES.forEach((tp, k) => {
      const x = PULSE_X0 + (t - tp) * PULSE_V, on = x > PULSE_X0 - 1 && x < PULSE_X1 + 1;
      const s = on ? smooth((x - PULSE_X0 + 1) / 1.5) * smooth((PULSE_X1 + 1 - x) / 1.5) : 0;
      this.m4.compose(this.v1.set(on ? x : 0, NERVE.y, NERVE.z), this.q.identity(), this.v2.set(0.55 * s + 1e-4, 0.3 * s + 1e-4, 0.3 * s + 1e-4));
      this.pulse.setMatrixAt(k, this.m4);
    });
    this.pulse.instanceMatrix.needsUpdate = true;
    const sq = st.squeeze;
    const glowN = 1 + 0.5 * Math.max(...pinch);
    this.nerveMat.emissive.setRGB(1.0 * glowN, 0.62 * glowN, 0.05);

    // ---------- vessels ----------
    this.tubes.forEach((T, vi) => {
      const up = vi === 0, NX = 200, NA = 32;
      const ip = T.inner.pos.array as Float32Array, hp = T.hull.pos.array as Float32Array;
      for (let i = 0; i <= NX; i++) {
        const x = -XB + (i / NX) * 2 * XB, r = this.vr(T.v, x, sq, pinch, up);
        for (let j = 0; j <= NA; j++) {
          const k = (i * (NA + 1) + j) * 3, a = (j / NA) * TAU, sa = Math.sin(a), ca = Math.cos(a);
          ip[k] = x; ip[k + 1] = T.v.y + sa * r; ip[k + 2] = T.v.z + ca * r;
          hp[k] = x; hp[k + 1] = T.v.y + sa * (r + 0.045); hp[k + 2] = T.v.z + ca * (r + 0.045);
        }
      }
      T.inner.pos.needsUpdate = true; T.hull.pos.needsUpdate = true;
      T.innerMat.color.setRGB(lerp(0.55, 0.2, sq), lerp(0.035, 0.012, sq), lerp(0.06, 0.03, sq));
      T.shell.uniforms.uK.value = lerp(1, 0.55, sq);
      (T.shell.uniforms.uCol.value as THREE.Color).setRGB(lerp(4.2, 3.0, sq), lerp(0.55, 0.25, sq), lerp(0.62, 0.42, sq));
    });
    this.cellMat.color.set(C("#ff3346").lerp(C("#7c0f22"), sq));
    this.cellMat.emissive.setRGB(lerp(0.35, 0.06, sq), 0.02, 0.04);
    // blood flow: distance = v0 * (t - 0.65 * integral of squeeze), integrated from before the shot (pure in t)
    const t0 = shotStart(3) - 0.5, dt = 1 / 60;
    let I = 0; for (let s = t0; s < t; s += dt) I += microAt(3, s).squeeze * dt;
    const dist = 1.35 * (t - t0 - 0.65 * I);
    for (let vi = 0; vi < 2; vi++) {
      const T = this.tubes[vi], up = vi === 0, span = 2 * XB;
      for (let i = 0; i < NCELL; i++) {
        const x0 = -XB + (i / NCELL) * span + 0.3 * h1(i * 7 + vi);
        let x = x0 + T.dir * dist * (0.9 + 0.2 * h1(i + 31 * vi));
        x = ((((x + XB) % span) + span) % span) - XB;
        const r = this.vr(T.v, x, sq, pinch, up), rho = (0.1 + 0.32 * h1(i * 3 + 11 * vi)) * r, a = TAU * h1(i * 5 + 3 + vi);
        const sc = (0.78 + 0.22 * (r / T.v.r)) * (T.v.r / 0.55) * (Math.abs(x) > XB - 0.4 ? 0.001 : 1);
        this.e.set(t * (1.3 + h1(i)) + i, t * 0.7 + i * 2.1, 0.3 * i);
        this.m4.compose(this.v1.set(x, T.v.y + Math.sin(a) * rho, T.v.z + Math.cos(a) * rho), this.q.setFromEuler(this.e), this.v2.set(sc, sc, sc));
        this.cells.setMatrixAt(vi * NCELL + i, this.m4);
      }
    }
    this.cells.instanceMatrix.needsUpdate = true;

    // ---------- hands + arms ----------
    let iu = 0, idn = 0;
    HANDS.forEach((h, i) => {
      const v = h.up ? VESSEL_A : VESSEL_B, r = this.vr(v, h.x, sq, pinch, h.up), s = r / v.r;
      this.m4.compose(this.v1.set(h.x, v.y, v.z), this.q.identity(), this.v2.set(1 - 0.05 * pinch[i], s, s));
      if (h.up) this.handsUp.setMatrixAt(iu++, this.m4); else this.handsDn.setMatrixAt(idn++, this.m4);
      // arm: from the nerve axis to the cuff
      const pa = (h.up ? -1 : 1) * PALM_A, cr = (v.r + 0.33) * s;
      const cy = v.y + Math.sin(pa) * cr, cz = v.z + Math.cos(pa) * cr;
      const dy = cy - NERVE.y, dz = cz - NERVE.z, L = Math.hypot(dy, dz);
      this.q.setFromUnitVectors(this.v2.set(0, 1, 0), this.v1.set(0, dy / L, dz / L));
      this.m4.compose(this.v1.set(h.x, (cy + NERVE.y) / 2, (cz + NERVE.z) / 2), this.q, this.v2.set(1, L, 1));
      this.arms.setMatrixAt(i, this.m4);
    });
    this.handsUp.instanceMatrix.needsUpdate = true; this.handsDn.instanceMatrix.needsUpdate = true; this.arms.instanceMatrix.needsUpdate = true;

    // ---------- "SQUEEZE!" label (pops on the first pulse, rides up a little, fades) ----------
    const la = smooth((t - (W.squeeze - 0.12)) / 0.18) * (1 - smooth((t - (W.vessels + 0.75)) / 0.35));
    this.squeezeLbl.visible = la > 0.002;
    if (this.squeezeLbl.visible) {
      const w = 3.1 * backOut(clamp01((t - (W.squeeze - 0.12)) / 0.28), 2.2);
      this.squeezeLbl.position.set(0.45, 3.35 + 0.25 * clamp01(t - W.squeeze), 1.9);
      this.squeezeLbl.scale.set(w, w * 0.3125, 1);
      (this.squeezeLbl.material as THREE.SpriteMaterial).opacity = la;
    }

    // ---------- water drops ----------
    for (let i = 0; i < NDROP; i++) {
      const x0 = -3.2 + 7.4 * h1(i * 13 + 1), z0 = -0.55 - 4.0 * h1(i * 17 + 5), size = 0.75 + 0.5 * h1(i * 3 + 2);
      const tl = W.hands - 0.05 + 0.85 * h1(i * 29 + 7), tf = 0.5;
      // after the fold: slide into the nearest valley and stretch along it (water channels away like a tread)
      const mz = meander(z0), xv = Math.round((x0 - mz) / GROOVE_P) * GROOVE_P + mz;
      const slide = smooth((st.fold - 0.25) / 0.6) * foldEnv(xv, st.fold);
      const x = lerp(x0, xv, slide), hy = skinHeight(x, z0, st);
      let y: number, sx: number, sy: number, sz: number;
      if (t < tl - tf) { y = hy + 30; sx = sy = sz = 0.0001; }
      else if (t < tl) { const u = (t - (tl - tf)) / tf; y = hy + 0.12 + 16 * (1 - u * u); sx = sz = 0.13 * size; sy = 0.24 * size; }
      else {
        const d = t - tl, w = Math.exp(-d * 7) * Math.cos(d * 26);
        sx = sz = 0.16 * size * (1 + 0.35 * w); sy = 0.1 * size * (1 - 0.4 * w);
        sz *= 1 + 2.4 * slide; sy *= 1 - 0.35 * slide;
        y = hy + sy * 0.62;
      }
      this.m4.compose(this.v1.set(x, y, z0), this.q.identity(), this.v2.set(sx, sy, sz));
      this.drops.setMatrixAt(i, this.m4);
    }
    this.drops.instanceMatrix.needsUpdate = true;

    // ---------- bubbles drift up and wobble ----------
    BUBBLES.forEach((b, i) => {
      const s = this.bubbles[i], w = 1 + 0.04 * Math.sin(t * 2.1 + b.ph);
      s.position.set(b.x + 0.4 * Math.sin(t * 0.5 + b.ph), b.y + 0.18 * (t - shotStart(3)) + 0.2 * Math.sin(t * 0.8 + b.ph), b.z);
      s.scale.set(2 * b.r * w, 2 * b.r / w, 1);
    });

    // ---------- the RAIN TIRE: rolls in without slipping, lugs mesh into the grooves ----------
    const tu = st.tire;
    this.tire.visible = tu > 0.0005;
    if (this.tire.visible) {
      const x = TIRE_X + 13 * (1 - backOut(tu, 0.9));
      this.tire.position.set(x, SKIN_Y - SHRINK_D * st.shrink + TIRE_R + 0.01, TIRE_Z);
      this.tire.rotation.set(0, 0, -(x - TIRE_X) / TIRE_R);
    }
  }

  private debugCam(f: number, cam: THREE.PerspectiveCamera) {
    const K = MICRO_CAM_KEYS;
    let i = 0;
    while (i < K.length - 2 && f >= K[i + 1].f) i++;
    const A = K[i], B = K[i + 1], u = glide((f - A.f) / (B.f - A.f));
    cam.position.set(lerp(A.pos[0], B.pos[0], u), lerp(A.pos[1], B.pos[1], u), lerp(A.pos[2], B.pos[2], u));
    cam.up.set(0, 1, 0); cam.lookAt(lerp(A.look[0], B.look[0], u), lerp(A.look[1], B.look[1], u), lerp(A.look[2], B.look[2], u));
    cam.fov = lerp(A.fov, B.fov, u); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
}
