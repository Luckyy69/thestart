// OWNER: props agent. See /home/user/lookmatch/MINERS_BRIEF.md
// 1. CUT: the cutaway diagram (a vertical cross-section slab of the mountain in CUT-local metres: x right, y up,
//    surface at y = 0, front face at z = 0 facing +z). Rock strata are procedural in the fragment shader (sharp at any
//    distance, octaves faded by fwidth so nothing shimmers). Every cutaway material carries its OWN fixed diagram light
//    (independent of the shot's sun, so the shot 9 insert lit by the desert look reads exactly like shots 5/13/14) and
//    has fog off. Layers in front of the face are >= 3 m apart (no z-fighting even with near = 0.1 at 1.4 km).
//      ramp zigzag x -5..+250 (legs every 85 m), refuge glow at (-60, -700), megablock between legs 2 and 3
//      (x 40..215, y -247..-178, drops 22 m onto leg 3), two Empire State silhouettes at x -175..-74 (base y -270),
//      probes from rigs on the surface (all miss; the 8th, from id >= 11, hits the refuge), rescue shaft at x = -60
//      (12.4 m drawn width), car tire (12.4 m) standing on the shaft mouth.
// 2. SHAFT: the Fénix capsule (0.54 m wide, ~4.1 m incl. cage), base at SHAFT.y + capsuleAt.y, door toward +x+z,
//    opaque shell; the door faces +x+z (world dir (0.6, 0, 0.8)) and opens over W.light-0.4 .. W.light-0.02 in shot 16
//    (the cast's miner card rides inside at scale 0.8 and steps out toward SHAFT+(0.45, 0, 0.6)); hoist cable to y = 22.
// 3. DRILL: the rod string end at DRILL x/z: bit tip at y = rodAt.up - 5 (in the hole until up > 5; tip 1.0 m above
//    ground at up = 6), DTH hammer with the taped plastic bag + folded note centred 0.42 m above the tip (y 1.42 at
//    up = 6, behind the cast's NOTE card at DRILL+(0.5, 1.2, 1.0)), pipe string to tip + 10.3 m (surface owns the
//    hole, casing and the string above that).
import * as THREE from "three";
import { ctex, rng } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { CUT, SHAFT, DRILL, W, megablockAt, empireAt, probesAt, shaftAt, tireAt, capsuleAt, rodAt, smooth, clamp01 } from "./story";

const TAU = Math.PI * 2;
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
type P2 = [number, number];

// ======================= diagram material (own light, procedural strata) =======================
const D_VERT = /* glsl */ `
varying vec3 vN; varying vec3 vLP; varying vec2 vUv;
void main(){ vN = normalize(mat3(modelMatrix) * normal); vLP = position; vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const D_FRAG = /* glsl */ `
uniform vec3 uCol; uniform float uProc; uniform vec3 uTint; uniform vec3 uOrigin; uniform vec3 uEmis; uniform float uRot;
uniform sampler2D uMap; uniform float uHasMap; uniform vec3 uLit; uniform vec3 uShade; uniform vec3 uL;
varying vec3 vN; varying vec3 vLP; varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
// band-limited fbm: octaves finer than ~1 px fade out (no shimmer at 1.4 km, full grain at 100 m)
float fbm(vec2 p, float px){ float a = 0.5, s = 0.0, fr = 1.0;
  for (int i = 0; i < 6; i++){ float k = 1.0 - smoothstep(0.25, 0.7, px * fr); s += a * k * (vn(p * fr + float(i) * 17.3) - 0.5); fr *= 2.07; a *= 0.52; }
  return s; }
vec3 hexc(float r, float g, float b){ return pow(vec3(r, g, b) / 255.0, vec3(2.2)); }
vec3 bandCol(float id){
  float h = h21(vec2(id * 0.137, 3.1));
  vec3 c = h < 0.17 ? hexc(196., 138., 82.) : h < 0.34 ? hexc(168., 90., 64.) : h < 0.5 ? hexc(210., 164., 108.)
         : h < 0.66 ? hexc(150., 100., 72.) : h < 0.8 ? hexc(184., 116., 78.) : h < 0.9 ? hexc(128., 80., 70.) : hexc(220., 184., 128.);
  return c * (0.9 + 0.2 * h21(vec2(id, 9.7)));
}
vec3 strata(vec2 p){
  float px = length(vec2(fwidth(p.x), fwidth(p.y)));           // metres per pixel
  float d = -p.y + 14.0 * fbm(p * 0.006, px * 0.006) + 7.0 * sin(p.x * 0.0051 + 1.3) + 4.0 * sin(p.x * 0.013 - p.y * 0.002);
  if (d < 7.0) {                                                // surface crust (desert sand) + grit
    vec3 c = hexc(226., 186., 128.) * (1.0 + 0.5 * fbm(p * 0.5, px * 0.5));
    float l = smoothstep(7.0 - 1.4 * px, 7.0, d);               // dark seam under the crust
    return c * (1.0 - 0.45 * l);
  }
  float k = d / 41.0 + 0.33 * sin(d * 0.019 + 0.7);             // monotone: variable band thickness
  float id = floor(k), fr = fract(k), fk = fwidth(k);
  vec3 c = bandCol(id);
  vec3 c2 = bandCol(id + 1.0);
  c = mix(c, c2, smoothstep(0.55, 1.0, fr) * 0.35);             // soft gradient into the next band
  c *= 1.0 - 0.18 * smoothstep(0.0, 0.25, fr) * (1.0 - smoothstep(0.25, 1.0, fr)); // lit top lip of each bed
  float seam = 1.0 - smoothstep(0.0, max(fk * 1.6, 0.012), min(fr, 1.0 - fr) - 0.006); // thin dark bedding line
  c = mix(c, c * 0.5, seam * 0.55);
  // depth: warm sand -> rust -> deep plum-brown
  float dz = clamp(d / 900.0, 0.0, 1.0);
  c = mix(c, c * vec3(0.66, 0.52, 0.6), dz * 0.85);
  // grain, mottling, pebbles
  c *= 1.0 + 0.55 * fbm(p * 0.035, px * 0.035) + 0.35 * fbm(vec2(p.x * 0.4, p.y * 1.1), px * 1.1);
  vec2 q = p * 0.32; vec2 qi = floor(q); vec2 qf = fract(q) - 0.5;
  vec2 o = vec2(h21(qi), h21(qi + 7.7)) - 0.5;
  float pr = 0.1 + 0.2 * h21(qi + 3.3), pd = length(qf - o * 0.5), pa = fwidth(pd) + 0.01;
  float vis = 1.0 - smoothstep(0.15, 0.45, px * 0.32);
  float peb = (1.0 - smoothstep(pr - pa, pr, pd)) * step(0.55, h21(qi + 1.9)) * vis;
  float rimL = (smoothstep(pr - 3.0 * pa, pr - pa, pd) - smoothstep(pr - pa, pr, pd)) * step(0.55, h21(qi + 1.9)) * vis;
  c = mix(c, c * (h21(qi + 5.1) > 0.5 ? 1.22 : 0.74), peb * 0.55);
  c = mix(c, c * 0.45, rimL * 0.5);
  c *= 1.0 + 0.3 * (vn(p * 2.2) - 0.5) * (1.0 - smoothstep(0.2, 0.5, px * 2.2)); // fine sand grain
  // copper veins (turquoise) in the deeper rock, a few, thin
  float vline = abs(p.y + 380.0 + 60.0 * sin(p.x * 0.011) + 30.0 * fbm(p * 0.01, px * 0.01) * 4.0);
  float vw = max(px * 0.9, 1.2);
  c = mix(c, hexc(84., 168., 150.), (1.0 - smoothstep(vw * 0.5, vw, vline)) * 0.55 * step(-0.15, sin(p.x * 0.004)));
  return max(c, vec3(0.0));
}
void main(){
  vec3 lp = vLP;
  if (uRot != 0.0) { float c = cos(uRot), s = sin(uRot); lp.xy = vec2(c * lp.x - s * lp.y, s * lp.x + c * lp.y); }
  vec3 alb = uProc > 0.5 ? strata(lp.xy + uOrigin.xy) * uTint : uCol;
  if (uHasMap > 0.5) alb *= texture2D(uMap, vUv).rgb;
  vec3 n = normalize(vN);
  float ndl = dot(n, uL);
  float term = smoothstep(-0.05, 0.3, ndl);
  float sky = 0.88 + 0.12 * n.y;
  vec3 light = mix(uShade, uLit * (0.82 + 0.18 * max(ndl, 0.0)), term) * sky;
  gl_FragColor = vec4(alb * light + uEmis, 1.0);
}`;
const DLIGHT = new THREE.Vector3(-0.42, 0.62, 0.66).normalize();
const dMat = (o: { col?: string; proc?: boolean; tint?: [number, number, number]; emis?: [number, number, number]; map?: THREE.Texture } = {}) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uProc: { value: o.proc ? 1 : 0 }, uTint: { value: new THREE.Vector3(...(o.tint ?? [1, 1, 1])) },
      uOrigin: { value: new THREE.Vector3() }, uEmis: { value: new THREE.Vector3(...(o.emis ?? [0, 0, 0])) }, uRot: { value: 0 },
      uMap: { value: o.map ?? null }, uHasMap: { value: o.map ? 1 : 0 },
      uLit: { value: new THREE.Vector3(1.42, 1.36, 1.26) }, uShade: { value: new THREE.Vector3(0.5, 0.46, 0.6) }, uL: { value: DLIGHT },
    },
    vertexShader: D_VERT, fragmentShader: D_FRAG, fog: false,
  });

// flat graphic line (probe / shaft / dashes): grows along u, NOINK
const L_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const L_FRAG = /* glsl */ `uniform vec3 uCol; uniform float uProg; uniform float uOp; uniform float uDash; uniform float uLen; uniform float uEdge; uniform vec3 uEdgeCol;
varying vec2 vUv;
void main(){ if (vUv.x > uProg) discard;
  if (uDash > 0.0 && fract(vUv.x * uLen / uDash) > 0.55) discard;
  float e = abs(vUv.y - 0.5) * 2.0; float aa = fwidth(e);
  vec3 c = mix(uCol, uEdgeCol, smoothstep(1.0 - uEdge - aa, 1.0 - uEdge + aa, e));
  float a = uOp * (1.0 - smoothstep(1.0 - 1.5 * aa, 1.0, e));
  gl_FragColor = vec4(c, a); }`;
const lMat = (col: THREE.ColorRepresentation, edgeCol: THREE.ColorRepresentation, edge: number, len = 1, dash = 0) =>
  new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(col) }, uEdgeCol: { value: new THREE.Color(edgeCol) }, uEdge: { value: edge }, uProg: { value: 1 }, uOp: { value: 1 }, uDash: { value: dash }, uLen: { value: len } },
    vertexShader: L_VERT, fragmentShader: L_FRAG, transparent: true, depthWrite: false, fog: false,
  });

/** ribbon along a polyline (u = arc length 0..1, v across), flat at z */
const ribbon = (pts: P2[], w: number, z: number) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const n = Math.hypot(tx, ty) || 1; tx /= n; ty /= n;
    const nx = -ty * w / 2, ny = tx * w / 2;
    pos.push(pts[i][0] + nx, pts[i][1] + ny, z, pts[i][0] - nx, pts[i][1] - ny, z);
    uv.push(L[i] / tot, 1, L[i] / tot, 0);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setIndex(idx);
  return { g, len: tot };
};
/** point + tangent at arc fraction u of a polyline */
const along = (pts: P2[], u: number): { p: P2; a: number } => {
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const s = clamp01(u) * L[L.length - 1];
  for (let i = 1; i < pts.length; i++) if (s <= L[i] || i === pts.length - 1) {
    const k = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), a = pts[i - 1], b = pts[i];
    return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  return { p: pts[0], a: 0 };
};
/** quadratic bezier sampled */
const bez = (a: P2, c: P2, b: P2, n = 40): P2[] => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as P2;
});
/** polyline with rounded corners */
const rounded = (pts: P2[], r: number, n = 8): P2[] => {
  const out: P2[] = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const la = Math.hypot(b[0] - a[0], b[1] - a[1]), lc = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const ra = Math.min(r, la / 2), rc = Math.min(r, lc / 2);
    const p0: P2 = [b[0] + (a[0] - b[0]) * ra / la, b[1] + (a[1] - b[1]) * ra / la];
    const p1: P2 = [b[0] + (c[0] - b[0]) * rc / lc, b[1] + (c[1] - b[1]) * rc / lc];
    out.push(...bez(p0, b, p1, n));
  }
  out.push(pts[pts.length - 1]);
  return out;
};
const shapeOf = (pts: P2[]) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); s.closePath(); return s; };

// ======================= cutaway layout (CUT-local metres) =======================
const RAMP_X0 = -5, RAMP_X1 = 250, LEG = 85;
const rampPts = (): P2[] => {
  const p: P2[] = [[268, 0], [RAMP_X1, -6]];
  for (let k = 1; k <= 8; k++) {
    const y = -k * LEG, xa = k % 2 ? RAMP_X1 : RAMP_X0, xb = k % 2 ? RAMP_X0 : RAMP_X1;
    p.push([xa, y + 14], [xb, y - 2]);   // each leg slopes down ~16 m across
  }
  p[p.length - 1] = [-26, -700];        // last leg ends in the refuge
  return rounded(p, 22, 8);
};
const REF: P2 = [-60, -700];
const BLOCK: P2[] = [[46, -184], [92, -176], [150, -179], [212, -186], [216, -214], [208, -246], [140, -250], [70, -247], [40, -238], [38, -206]];
const BLOCK_C: P2 = [127, -213];
const BLOCK_DROP = 26;
type Probe = { a: P2; c: P2; b: P2; s0: number; hit?: boolean };
const PROBES: Probe[] = [
  { a: [-250, 0], c: [-235, -330], b: [-178, -640], s0: 0.0 },
  { a: [40, 0], c: [36, -300], b: [6, -600], s0: 0.1 },
  { a: [-205, 0], c: [-190, -380], b: [-138, -742], s0: 0.2 },
  { a: [-120, 0], c: [-95, -300], b: [-12, -628], s0: 0.3 },
  { a: [90, 0], c: [80, -360], b: [24, -745], s0: 0.42 },
  { a: [-20, 0], c: [-24, -260], b: [-112, -585], s0: 0.52 },
  { a: [-180, 0], c: [-178, -360], b: [-150, -715], s0: 0.62 },
  { a: [-150, 0], c: [-140, -360], b: [-86, -697], s0: 0, hit: true },
];
const SHAFT_X = -60, SHAFT_W = 12.4, TIRE_R = 6.2;
// z layers in front of the face (>= 3 m apart)
const Z = { rampRim: 3, ramp: 6, cavity: 9, block: 15, refuge: 6, probe: 19, shaft: 22, esb: 26, dash: 29 };

// ======================= textures =======================
const refugeTex = () => ctex("mn_refuge", 512, 192, (g, r) => {
  g.fillStyle = "#2a140c"; g.fillRect(0, 0, 512, 192);
  const gr = g.createRadialGradient(256, 120, 10, 256, 110, 260);
  gr.addColorStop(0, "#fff2c0"); gr.addColorStop(0.35, "#ffc566"); gr.addColorStop(0.75, "#d9772f"); gr.addColorStop(1, "#7a3216");
  g.fillStyle = gr;
  g.beginPath(); g.roundRect(14, 14, 484, 164, 60); g.fill();
  g.fillStyle = "#8a4a26"; g.fillRect(14, 160, 484, 18); // floor
  // 33 tiny miners: helmet dots with lamps
  for (let i = 0; i < 33; i++) {
    const x = 40 + (i % 17) * 26 + (i >= 17 ? 13 : 0) + (r() - 0.5) * 6, y = i >= 17 ? 148 : 128;
    g.fillStyle = "rgba(60,30,20,0.85)"; g.beginPath(); g.ellipse(x, y + 10, 7, 13, 0, 0, TAU); g.fill();
    g.fillStyle = i % 3 ? "#ffffff" : "#ffe27a"; g.beginPath(); g.arc(x, y - 5, 5.5, 0, TAU); g.fill();
    g.fillStyle = "#fffbe0"; g.beginPath(); g.arc(x + 3, y - 6, 2.2, 0, TAU); g.fill();
  }
});
const esbTex = () => ctex("mn_esb2", 256, 1024, (g) => {
  g.clearRect(0, 0, 256, 1024);
  // half-profile [halfWidth px, y px] from the ground up (1024 px = 443 m): podium, setbacks, shaft, crown, mast, antenna
  const hp: [number, number][] = [[120, 1020], [120, 962], [98, 962], [98, 826], [86, 826], [86, 768], [72, 768], [72, 336], [63, 336],
    [63, 306], [53, 306], [53, 280], [41, 280], [41, 250], [26, 250], [26, 182], [18, 168], [11, 168], [11, 132], [5, 120], [2, 6], [0, 2]];
  const path = new Path2D();
  hp.forEach(([w, y], i) => (i ? path.lineTo(128 - w, y) : path.moveTo(128 - w, y)));
  for (let i = hp.length - 1; i >= 0; i--) path.lineTo(128 + hp[i][0], hp[i][1]);
  path.closePath();
  g.save(); g.clip(path);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, "#fbf7ec"); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(0.52, "#dfe7f2"); gr.addColorStop(1, "#c6d3e6");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 1024);
  g.fillStyle = "rgba(70,90,130,0.38)";
  for (let y = 260; y < 1010; y += 15) for (let x = 40; x < 220; x += 11) g.fillRect(x, y, 4, 7);
  g.fillStyle = "rgba(70,90,130,0.25)"; for (const x of [96, 160]) g.fillRect(x, 340, 3, 620); // vertical piers
  g.restore();
  g.lineWidth = 6; g.strokeStyle = "#1c2236"; g.lineJoin = "round"; g.stroke(path);
});
const capsuleTex = () => ctex("mn_capsule", 1024, 512, (g, r) => {
  // u 0..1 around the body (u = 0.5 faces the door direction), v bottom (512) -> top (0) over the 2.6 m body
  g.fillStyle = "#f4f3ee"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(120,110,100,${0.03 + r() * 0.05})`; g.fillRect(r() * 1024, r() * 512, 2 + r() * 8, 1 + r() * 3); }
  g.fillStyle = "#1f4fb4"; g.fillRect(0, 70, 1024, 34);   // blue band (upper)
  g.fillStyle = "#d72a22"; g.fillRect(0, 410, 1024, 40);  // red band (lower)
  g.fillStyle = "#d72a22"; g.fillRect(0, 112, 1024, 10);
  g.fillStyle = "#1f4fb4"; g.fillRect(0, 398, 1024, 8);
  // panel seams + rivets
  g.strokeStyle = "rgba(60,60,70,0.55)"; g.lineWidth = 3;
  for (const y of [140, 270, 380]) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.fillStyle = "rgba(70,70,80,0.6)";
  for (const y of [146, 264, 386]) for (let x = 6; x < 1024; x += 32) { g.beginPath(); g.arc(x, y, 3, 0, TAU); g.fill(); }
  // dark doorway (covered by the door mesh when closed): u 0.5 +- 0.095, v 150..392
  g.fillStyle = "#1b1d22"; g.fillRect(512 - 97, 150, 194, 242);
  g.fillStyle = "#30333a"; g.fillRect(512 - 70, 200, 140, 18);
  // small Chilean flag at the back
  g.fillStyle = "#ffffff"; g.fillRect(40, 168, 120, 70); g.fillStyle = "#d72a22"; g.fillRect(40, 203, 120, 35);
  g.fillStyle = "#1f4fb4"; g.fillRect(40, 168, 40, 35); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(60, 185, 7, 0, TAU); g.fill();
  g.strokeStyle = "#333"; g.lineWidth = 2; g.strokeRect(40, 168, 120, 70);
  // streaks of dust near the bottom
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(150,100,70,${0.05 + r() * 0.1})`; g.fillRect(r() * 1024, 440 + r() * 72, 2 + r() * 4, 10 + r() * 50); }
});
const doorTex = () => ctex("mn_door", 256, 512, (g, r) => {
  g.fillStyle = "#f1f0ea"; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 200; i++) { g.fillStyle = `rgba(120,110,100,${0.03 + r() * 0.05})`; g.fillRect(r() * 256, r() * 512, 2 + r() * 6, 1 + r() * 3); }
  g.strokeStyle = "#3a3d45"; g.lineWidth = 8; g.strokeRect(6, 6, 244, 500);
  g.fillStyle = "#d72a22"; g.fillRect(10, 455, 236, 20);
  g.fillStyle = "#1f4fb4"; g.fillRect(10, 40, 236, 16);
  // mesh window
  g.fillStyle = "#2b2e35"; g.fillRect(70, 110, 116, 150);
  g.strokeStyle = "#9aa0aa"; g.lineWidth = 3;
  for (let x = 74; x < 186; x += 12) { g.beginPath(); g.moveTo(x, 110); g.lineTo(x, 260); g.stroke(); }
  for (let y = 114; y < 260; y += 12) { g.beginPath(); g.moveTo(70, y); g.lineTo(186, y); g.stroke(); }
  // latch + hinges
  g.fillStyle = "#555a63"; g.fillRect(212, 280, 26, 60); g.fillRect(4, 80, 16, 40); g.fillRect(4, 380, 16, 40);
});
const mudTex = () => ctex("mn_mud", 128, 512, (g, r) => {
  // v 0 (top) -> 512 (bottom of the lower rod): clean grey steel above, caked rust-red rock dust and drips below
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#9aa0a8"); gr.addColorStop(0.45, "#8a8580"); gr.addColorStop(0.7, "#8a5a40"); gr.addColorStop(1, "#7a4630");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 90; i++) { const x = r() * 128, y = 200 + r() * 300, l = 10 + r() * 60; g.fillStyle = `rgba(${110 + r() * 40},${60 + r() * 20},${40},${0.3 + r() * 0.4})`; g.fillRect(x, y, 2 + r() * 4, l); }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${150 + r() * 60},${100 + r() * 40},${70},${0.15 + r() * 0.3})`; g.fillRect(r() * 128, 250 + r() * 262, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 12; i++) { g.fillStyle = "rgba(230,235,240,0.35)"; g.fillRect(40 + r() * 10, r() * 200, 3, 20 + r() * 60); }
});
const bagTex = () => ctex("mn_bag", 512, 512, (g, r) => {
  // milky plastic bag over a folded paper note; the red handwriting shows through as soft lines
  g.fillStyle = "#c9cbc6"; g.fillRect(0, 0, 512, 512);
  g.save(); g.translate(256, 266); g.rotate(-0.06);
  g.fillStyle = "#f6f1e2"; g.fillRect(-170, -150, 340, 300);
  g.strokeStyle = "rgba(150,140,120,0.7)"; g.lineWidth = 3; g.beginPath(); g.moveTo(-170, 0); g.lineTo(170, 0); g.moveTo(0, -150); g.lineTo(0, 150); g.stroke();
  g.strokeStyle = "rgba(205,30,30,0.75)"; g.lineWidth = 7; g.lineCap = "round";
  for (let l = 0; l < 5; l++) {
    const y = -110 + l * 52; g.beginPath(); g.moveTo(-145, y);
    for (let x = -145; x < 140; x += 14) g.lineTo(x, y + Math.sin(x * 0.21 + l) * 7 + (r() - 0.5) * 6);
    g.stroke();
  }
  g.restore();
  // plastic: milky veil, crinkle highlights, folds
  g.fillStyle = "rgba(235,238,240,0.38)"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.25 + r() * 0.45})`; g.lineWidth = 2 + r() * 6; g.beginPath();
    const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.quadraticCurveTo(x + (r() - 0.5) * 120, y + (r() - 0.5) * 80, x + (r() - 0.5) * 200, y + (r() - 0.5) * 160); g.stroke();
  }
  for (let i = 0; i < 10; i++) { g.strokeStyle = "rgba(90,95,100,0.25)"; g.lineWidth = 2; g.beginPath(); const x = r() * 512; g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 80, 512); g.stroke(); }
  // a smear of red rock dust
  for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(150,80,50,${0.1 + r() * 0.2})`; g.fillRect(r() * 512, 380 + r() * 132, 2 + r() * 6, 2 + r() * 6); }
});
const tapeTex = () => ctex("mn_tape", 256, 32, (g, r) => {
  g.fillStyle = "#b9bcc0"; g.fillRect(0, 0, 256, 32);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.4})`; g.fillRect(r() * 256, 0, 2 + r() * 10, 32); }
  g.fillStyle = "rgba(60,60,60,0.35)"; g.fillRect(0, 0, 256, 3); g.fillRect(0, 29, 256, 3);
});
const tireTex = () => ctex("mn_rim", 512, 512, (g) => {
  g.fillStyle = "#c9ced6"; g.fillRect(0, 0, 512, 512);
  const c = 256;
  const gr = g.createRadialGradient(c - 60, c - 60, 20, c, c, 260); gr.addColorStop(0, "#f2f4f7"); gr.addColorStop(1, "#9aa1ab");
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, 256, 0, TAU); g.fill();
  g.fillStyle = "#3b3f46";
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.beginPath(); g.ellipse(c + Math.cos(a) * 150, c + Math.sin(a) * 150, 54, 80, a + Math.PI / 2, 0, TAU); g.fill(); }
  g.fillStyle = "#8a9099"; g.beginPath(); g.arc(c, c, 62, 0, TAU); g.fill();
  g.fillStyle = "#2c3036"; for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; g.beginPath(); g.arc(c + Math.cos(a) * 36, c + Math.sin(a) * 36, 9, 0, TAU); g.fill(); }
  g.strokeStyle = "#555b63"; g.lineWidth = 10; g.beginPath(); g.arc(c, c, 246, 0, TAU); g.stroke();
});
const softTex = () => ctex("mn_soft", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});

// ======================= the props =======================
export class Props {
  root = new THREE.Group();
  private cut = new THREE.Group();
  private block!: THREE.Mesh; private blockMat!: THREE.ShaderMaterial;
  private cavity!: THREE.Mesh;
  private esb: THREE.Mesh[] = [];
  private probes: { m: THREE.ShaderMaterial; rim: THREE.ShaderMaterial; tip: THREE.Mesh; pts: P2[]; p: Probe }[] = [];
  private shaft!: { core: THREE.ShaderMaterial; bit: THREE.Mesh; pts: P2[] };
  private tire = new THREE.Group(); private dashes: THREE.ShaderMaterial[] = [];
  private dust: THREE.Sprite[] = [];
  private halo!: THREE.Sprite; private refMat!: THREE.MeshBasicMaterial;
  private capsule = new THREE.Group(); private door = new THREE.Group(); private cable!: THREE.Mesh;
  private rod = new THREE.Group();

  constructor() {
    this.cut.position.set(...CUT);
    this.root.add(this.cut);
    this.buildCut();
    this.buildCapsule();
    this.buildRod();
  }

  // ---------------------------------- cutaway ----------------------------------
  private buildCut() {
    const C = this.cut;
    const add = (g: THREE.BufferGeometry, m: THREE.Material, noink = false) => {
      const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.matrixAutoUpdate = true; if (noink) mesh.layers.set(NOINK); C.add(mesh); return mesh;
    };
    // the slab: face outline with the surface profile (flat desert, a hill on the right), 70 m deep
    const top: P2[] = [];
    for (let x = -700; x <= 700; x += 10) {
      const hill = x > 290 ? 95 * smooth((x - 290) / 160) - 40 * smooth((x - 520) / 160) : 0;
      top.push([x, hill + (x > 290 ? 3 * Math.sin(x * 0.09) : 0)]);
    }
    const face: P2[] = [[-700, -1300], [700, -1300], ...top.reverse()];
    const slabG = new THREE.ExtrudeGeometry(shapeOf(face), { depth: 70, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -70);
    const rock = dMat({ proc: true });
    add(slabG, rock);
    // far ridges behind (hazy Atacama mountains), no ink needed but fine
    const ridge = (z: number, h: number, col: string, seed: number) => {
      const pts: P2[] = [[-2600, -60]];
      for (let x = -2600; x <= 2600; x += 40) pts.push([x, h * (0.35 + 0.65 * Math.abs(Math.sin(x * 0.0013 + seed) * Math.sin(x * 0.0031 + seed * 2))) + 18 * hh(x, seed)]);
      pts.push([2600, -60]);
      const m = new THREE.MeshBasicMaterial({ color: col, fog: false });
      const mesh = add(new THREE.ShapeGeometry(shapeOf(pts)).translate(0, 0, z), m);
      return mesh;
    };
    ridge(-1500, 240, "#c49a8e", 1.3);
    ridge(-900, 150, "#b98266", 4.1);
    // ramp tunnel: dark passage + darker rim
    const rp = rampPts();
    add(ribbon(rp, 15, Z.rampRim).g, dMat({ col: "#6b3424" }));
    add(ribbon(rp, 9.5, Z.ramp).g, dMat({ col: "#1e110c", emis: [0.012, 0.006, 0.003] }));
    // lamp dots along the ramp (tiny warm glows), below the block only a few
    const dotG = new THREE.CircleGeometry(1.9, 10);
    const dotM = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.5, 0.7), fog: false });
    for (let i = 3; i < 40; i++) {
      const { p } = along(rp, i / 40);
      if (p[1] < -170 && p[1] > -260 && p[0] > 30 && p[0] < 225) continue;
      const d = add(dotG, dotM); d.position.set(p[0], p[1], Z.ramp + 0.8);
    }
    // mine mouth portal on the surface at the ramp head
    const portal = dMat({ col: "#7a5034" });
    for (const [x0, x1, y0, y1] of [[258, 261, 0, 16], [276, 279, 0, 16], [256, 281, 14, 18]]) add(new THREE.BoxGeometry(x1 - x0, y1 - y0, 6).translate((x0 + x1) / 2, (y0 + y1) / 2, -8), portal);
    add(new THREE.PlaneGeometry(15, 14).translate(268.5, 7, -9.5), dMat({ col: "#1a0f0a" }));
    // refuge glow
    const rs = new THREE.Shape(); rs.moveTo(REF[0] - 36, REF[1] - 10); rs.lineTo(REF[0] + 36, REF[1] - 10);
    rs.quadraticCurveTo(REF[0] + 40, REF[1] + 14, REF[0] + 22, REF[1] + 16); rs.lineTo(REF[0] - 24, REF[1] + 16); rs.quadraticCurveTo(REF[0] - 40, REF[1] + 14, REF[0] - 36, REF[1] - 10);
    const rg = new THREE.ShapeGeometry(rs, 8);
    rg.translate(-REF[0], -REF[1], 0).scale(1.3, 1.4, 1).translate(REF[0], REF[1], 0);
    const pa = rg.attributes.position as THREE.BufferAttribute, uva = rg.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) uva.setXY(i, (pa.getX(i) - (REF[0] - 52)) / 104, (pa.getY(i) - (REF[1] - 15)) / 38);
    rg.translate(0, 0, Z.refuge + 1);
    add(new THREE.ShapeGeometry(rs, 8).translate(-REF[0], -REF[1], 0).scale(1.5, 1.85, 1).translate(REF[0], REF[1] + 2, Z.refuge - 2.5), dMat({ col: "#4a2416" }));
    this.refMat = new THREE.MeshBasicMaterial({ map: refugeTex(), color: new THREE.Color(1.5, 1.35, 1.2), fog: false });
    add(rg, this.refMat);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.0, 0.62, 0.25), transparent: true, opacity: 0.5, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.halo.position.set(REF[0], REF[1] + 3, Z.dash + 4); this.halo.scale.set(220, 130, 1); this.halo.layers.set(NOINK); this.halo.frustumCulled = false; C.add(this.halo);
    // megablock: dark cavity (grows a crack outline, then shows as the gap) + the block itself (own strata, darker)
    const bs = shapeOf(BLOCK.map(([x, y]) => [x - BLOCK_C[0], y - BLOCK_C[1]] as P2));
    this.cavity = add(new THREE.ShapeGeometry(bs), dMat({ col: "#160b08" }));
    this.cavity.position.set(BLOCK_C[0], BLOCK_C[1], Z.cavity);
    this.blockMat = dMat({ proc: true, tint: [0.86, 0.72, 0.68] });
    this.blockMat.uniforms.uOrigin.value.set(BLOCK_C[0], BLOCK_C[1], 0);
    this.block = add(new THREE.ExtrudeGeometry(bs, { depth: Z.block, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 1, curveSegments: 1 }), this.blockMat);
    this.block.position.set(BLOCK_C[0], BLOCK_C[1], 0);
    // Empire State silhouettes (x2: "twice as heavy"), on their own ground tick
    for (let i = 0; i < 2; i++) {
      const m = new THREE.MeshBasicMaterial({ map: esbTex(), transparent: true, opacity: 0, depthWrite: false, fog: false, color: new THREE.Color(1.12, 1.12, 1.12) });
      const g = new THREE.PlaneGeometry(52, 208).translate(0, 104, 0);
      const e = add(g, m, true); e.position.set(-152 + i * 56, -272, Z.esb + i * 0.5); e.renderOrder = 3;
      this.esb.push(e);
    }
    const tick = lMat("#fff7e6", "#1c2236", 0.25);
    const tk = add(ribbon([[-186, -272.5], [-62, -272.5]], 3, Z.esb - 1).g, tick, true); tk.renderOrder = 2; this.esb.push(tk);
    // probes: rig + thin line (pale steel core with a dark edge) + drill tip
    const rigM = dMat({ col: "#d8473a" }), rigW = dMat({ col: "#eeeeea" }), truck = dMat({ col: "#e9b13a" });
    for (const p of PROBES) {
      const pts = bez(p.a, p.c, p.b, 48);
      const { g, len } = ribbon(pts, p.hit ? 6.4 : 5.2, Z.probe + (p.hit ? 1 : 0));
      const m = lMat(p.hit ? "#ffe680" : "#eef4fa", "#1a1d28", 0.42, len); const mesh = add(g, m, true); mesh.renderOrder = 4;
      const tip = add(new THREE.ConeGeometry(4, 9, 4).rotateZ(Math.PI), dMat({ col: "#59606b" }), true); tip.renderOrder = 5;
      this.probes.push({ m, rim: m, tip, pts, p });
      // tiny surface rig
      const x = p.a[0], zr = -14 - hh(x, 3) * 20;
      add(new THREE.BoxGeometry(2, 28, 2).translate(x, 14, zr), p.hit ? rigW : rigM);
      add(new THREE.BoxGeometry(14, 5, 6).translate(x + 6, 2.5, zr - 1), truck);
      add(new THREE.BoxGeometry(1, 20, 1).rotateZ(0.42).translate(x + 4, 10, zr), rigW);
    }
    // Camp Hope in miniature: tents + flag poles on the surface, left
    const tentCols = ["#e0483a", "#2f6fd0", "#f2c230", "#3aa35a", "#f08a2a", "#8a4fc0", "#f4f1e6"];
    for (let i = 0; i < 26; i++) {
      const x = -330 + hh(i, 51) * 220, z = -6 - hh(i, 52) * 50, h = 5 + hh(i, 53) * 4;
      if (Math.abs(x - SHAFT_X) < 22) continue;
      const tg = new THREE.ConeGeometry(h * 0.85, h, 4, 1).rotateY(Math.PI / 4 + hh(i, 54)).translate(x, h / 2, z);
      add(tg, dMat({ col: tentCols[i % tentCols.length] }));
    }
    const pole = dMat({ col: "#e8e8e8" }), fw = dMat({ col: "#ffffff" }), fr = dMat({ col: "#d52b1e" }), fb = dMat({ col: "#1f4fb4" });
    for (let i = 0; i < 7; i++) {
      const x = -320 + i * 34 + hh(i, 61) * 10, z = -4 - hh(i, 62) * 30;
      add(new THREE.BoxGeometry(0.8, 18, 0.8).translate(x, 9, z), pole);
      add(new THREE.BoxGeometry(9, 2.6, 0.4).translate(x + 4.5, 16.2, z), fw);
      add(new THREE.BoxGeometry(9, 2.6, 0.4).translate(x + 4.5, 13.6, z), fr);
      add(new THREE.BoxGeometry(3, 2.6, 0.5).translate(x + 1.5, 16.2, z), fb);
    }
    // rescue shaft: wide dark core with a cream rim, drawn top-down + the reamer head
    const sp: P2[] = [[SHAFT_X, 0.5], [SHAFT_X, REF[1] + 14]];
    const sr = ribbon(sp, SHAFT_W, Z.shaft);
    const core = lMat("#2a1912", "#fbf1d8", 0.3, sr.len);
    const sm = add(sr.g, core, true); sm.renderOrder = 6;
    const bit = add(new THREE.CylinderGeometry(SHAFT_W / 2, SHAFT_W * 0.3, 10, 8).translate(0, -5, 0), dMat({ col: "#8a929e" }), true);
    bit.renderOrder = 7;
    this.shaft = { core, bit, pts: sp };
    // tire (12.4 m: the same width as the shaft) standing on the shaft mouth + dashed guides down the shaft walls
    const rub = dMat({ col: "#2c2c31" });
    const T = this.tire;
    const tor = new THREE.Mesh(new THREE.TorusGeometry(TIRE_R - 1.55, 1.55, 16, 72), rub); T.add(tor);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 2.2, 48).rotateX(Math.PI / 2), dMat({ col: "#ffffff", map: tireTex() }));
    T.add(rim);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU, tb = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 2.9), rub);
      tb.position.set(Math.cos(a) * (TIRE_R - 0.12), Math.sin(a) * (TIRE_R - 0.12), 0); tb.rotation.z = a + (i % 2 ? 0.25 : -0.25); T.add(tb);
    }
    T.traverse((o) => { o.frustumCulled = false; });
    T.position.set(SHAFT_X, TIRE_R, -6); C.add(T);
    for (const sx of [-1, 1]) {
      const d = ribbon([[SHAFT_X + sx * TIRE_R, TIRE_R], [SHAFT_X + sx * TIRE_R, -46]], 0.9, Z.dash);
      const m = lMat("#ffffff", "#ffffff", 0, d.len, 2.6); const dm = add(d.g, m, true); dm.renderOrder = 8; this.dashes.push(m);
    }
    // dust puffs where the block lands
    const st = softTex();
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: st, color: new THREE.Color("#e0b48a"), transparent: true, opacity: 0, depthWrite: false, fog: false }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 9; C.add(s); this.dust.push(s);
    }
  }

  // ---------------------------------- Fénix capsule ----------------------------------
  private buildCapsule() {
    const G = this.capsule;
    const white = twoTone(new THREE.MeshPhongMaterial({ map: capsuleTex(), specular: "#4a4a4a", shininess: 40 }));
    const steel = twoTone(new THREE.MeshPhongMaterial({ color: "#6c737d", specular: "#555", shininess: 50 }));
    const dark = twoTone(new THREE.MeshLambertMaterial({ color: "#2a2d33" }));
    const rubber = twoTone(new THREE.MeshLambertMaterial({ color: "#1d1d20" }));
    const red = twoTone(new THREE.MeshLambertMaterial({ color: "#c8281f" }));
    const add = (g: THREE.BufferGeometry, m: THREE.Material, p?: THREE.Object3D) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; (p ?? G).add(mesh); return mesh; };
    const R = 0.27, B0 = 0.55, B1 = 3.15;
    // body: u = 0.5 at theta = pi -> faces -z in capsule space; the group yaw turns it toward the cameras
    add(new THREE.CylinderGeometry(R, R, B1 - B0, 40, 1, true).translate(0, (B0 + B1) / 2, 0), white);
    add(new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.02, 32).translate(0, B0 + 0.9, 0), dark); // interior floor (seen when open)
    add(new THREE.CylinderGeometry(R * 0.98, R * 0.98, B1 - B0 - 0.02, 24, 1, true).translate(0, (B0 + B1) / 2, 0), new THREE.MeshLambertMaterial({ color: "#202228", side: THREE.BackSide }));
    // bottom section: tapered steel skirt + base plate
    add(new THREE.CylinderGeometry(R, R * 0.78, 0.4, 32).translate(0, B0 - 0.2, 0), steel);
    add(new THREE.CylinderGeometry(R * 0.78, R * 0.6, 0.15, 32).translate(0, 0.075, 0), dark);
    // top: dome cap + red collar
    add(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.08, 40).translate(0, B1 + 0.04, 0), red);
    add(new THREE.CylinderGeometry(R * 0.6, R, 0.14, 40).translate(0, B1 + 0.15, 0), steel);
    // cage: 6 bars + 2 rings + top plate + shackle
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; add(new THREE.CylinderGeometry(0.014, 0.014, 0.66, 6).translate(Math.cos(a) * 0.19, B1 + 0.55, Math.sin(a) * 0.19), steel); }
    for (const y of [B1 + 0.42, B1 + 0.86]) add(new THREE.TorusGeometry(0.19, 0.016, 6, 32).rotateX(Math.PI / 2).translate(0, y, 0), steel);
    add(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 24).translate(0, B1 + 0.88, 0), steel);
    add(new THREE.TorusGeometry(0.05, 0.015, 8, 16).translate(0, B1 + 0.96, 0), steel);
    // guide wheels: 4 at the bottom, 4 at the top, on spring arms (the outer wheel edge at r ~0.34)
    for (const [y, off] of [[0.32, 0], [B1 + 0.55, Math.PI / 4]] as [number, number][]) for (let i = 0; i < 4; i++) {
      const a = off + (i / 4) * TAU, ca = Math.cos(a), sa = Math.sin(a);
      const arm = add(new THREE.BoxGeometry(0.11, 0.03, 0.035), steel); arm.position.set(ca * (R + 0.01), y, sa * (R + 0.01)); arm.rotation.y = -a;
      const wh = add(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 16).rotateX(Math.PI / 2), rubber); wh.position.set(ca * (R + 0.075), y, sa * (R + 0.075)); wh.rotation.y = -a;
      const hub = add(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8).rotateX(Math.PI / 2), steel); hub.position.copy(wh.position); hub.rotation.y = -a;
    }
    // door: curved panel u 0.5 +- 0.1 (theta pi +- 0.63), hinged at its left edge, slightly proud of the body
    const th = 0.63, Rd = R + 0.006;
    const dg = new THREE.CylinderGeometry(Rd, Rd, 2.0, 16, 1, true, Math.PI - th, 2 * th).translate(0, 0, 0);
    const hx = Rd * Math.sin(Math.PI - th), hz = Rd * Math.cos(Math.PI - th);
    dg.translate(-hx, 0, -hz);
    const dm = twoTone(new THREE.MeshPhongMaterial({ map: doorTex(), specular: "#444", shininess: 40, side: THREE.DoubleSide }));
    add(dg, dm, this.door);
    this.door.position.set(hx, B0 + 0.1 + 1.0, hz);
    G.add(this.door);
    // hoist cable up to the winch pulley
    this.cable = add(new THREE.CylinderGeometry(0.012, 0.012, 1, 6).translate(0, 0.5, 0), dark);
    G.traverse((o) => { o.frustumCulled = false; });
    G.position.set(...SHAFT);
    G.rotation.y = Math.atan2(6, 8) + Math.PI; // door toward the shot 15/16 cameras (+x+z of SHAFT)
    this.root.add(G);
  }

  // ---------------------------------- drill rod end + the note ----------------------------------
  private buildRod() {
    const G = this.rod;
    const steel = twoTone(new THREE.MeshPhongMaterial({ color: "#8d949d", specular: "#777", shininess: 60 }));
    const mud = twoTone(new THREE.MeshPhongMaterial({ map: mudTex(), specular: "#333", shininess: 25 }));
    const carb = twoTone(new THREE.MeshPhongMaterial({ color: "#3d4046", specular: "#999", shininess: 80 }));
    const add = (g: THREE.BufferGeometry, m: THREE.Material) => { const mesh = new THREE.Mesh(g, m); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; G.add(mesh); return mesh; };
    // local y = 0 at the bit tip
    add(new THREE.CylinderGeometry(0.068, 0.072, 0.16, 24).translate(0, 0.08, 0), carb);           // bit
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU, b = add(new THREE.SphereGeometry(0.014, 8, 6), carb); b.position.set(Math.cos(a) * 0.045, 0.002, Math.sin(a) * 0.045); }
    add(new THREE.SphereGeometry(0.014, 8, 6), carb).position.set(0, 0.0, 0);
    add(new THREE.CylinderGeometry(0.068, 0.068, 1.1, 28).translate(0, 0.16 + 0.55, 0), mud);       // DTH hammer (dusty)
    add(new THREE.CylinderGeometry(0.06, 0.068, 0.08, 24).translate(0, 1.3, 0), steel);
    for (let k = 0; k < 3; k++) {                                                                    // pipes + tool joints
      const y0 = 1.34 + k * 3;
      add(new THREE.CylinderGeometry(0.05, 0.05, 2.75, 20).translate(0, y0 + 1.375, 0), k === 0 ? mud : steel);
      add(new THREE.CylinderGeometry(0.064, 0.064, 0.25, 24).translate(0, y0 + 2.75 + 0.125, 0), steel);
    }
    // the plastic bag with the note, wrapped round the hammer, and three bands of tape
    const yaw = Math.atan2(1.6, 2.4), Rb = 0.082, arc = 2.0;
    const bag = new THREE.CylinderGeometry(Rb, Rb, 0.3, 24, 6, true, yaw - arc / 2, arc);
    const bp = bag.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bp.count; i++) {      // pillow bulge in the middle, pinched at the tape
      const y = bp.getY(i), x = bp.getX(i), z = bp.getZ(i), a = Math.atan2(x, z) - yaw;
      const k = 1 + 0.32 * Math.cos((y / 0.15) * Math.PI / 2) * Math.cos(a * 0.75) + 0.04 * Math.sin(y * 70 + a * 9);
      bp.setXYZ(i, x * k, y, z * k);
    }
    bag.computeVertexNormals(); bag.translate(0, 0.42, 0);
    add(bag, twoTone(new THREE.MeshPhongMaterial({ map: bagTex(), specular: "#cfd4d8", shininess: 70, side: THREE.DoubleSide })));
    const tape = twoTone(new THREE.MeshPhongMaterial({ map: tapeTex(), specular: "#aaa", shininess: 60 }));
    for (const y of [0.29, 0.555]) add(new THREE.CylinderGeometry(0.086, 0.086, 0.034, 32, 1, true).translate(0, y, 0), tape);
    add(new THREE.CylinderGeometry(0.103, 0.103, 0.03, 32, 1, true, yaw - 1.3, 2.6).translate(0, 0.42, 0), tape);
    this.root.add(G);
  }

  // ---------------------------------- per frame ----------------------------------
  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    // ---- cutaway ----
    const atCut = cam.position.z < CUT[2] + 4000;
    this.cut.visible = atCut;
    if (atCut) {
      const m = megablockAt(id, t);
      const fall = smooth(m) ** 1.6, crack = smooth(m / 0.35);
      const land = clamp01((m - 0.72) / 0.28);
      const bounce = land > 0 && id === 5 ? Math.sin(clamp01((t - (W.sealed + 0.45)) / 0.5) * Math.PI) * 1.6 * (1 - clamp01((t - (W.sealed + 0.45)) / 0.5)) : 0;
      this.block.position.set(BLOCK_C[0] + 3 * fall, BLOCK_C[1] - BLOCK_DROP * fall + bounce, 0);
      this.block.rotation.z = -0.045 * fall;
      this.blockMat.uniforms.uTint.value.set(0.97 - 0.13 * crack, 0.95 - 0.25 * crack, 0.94 - 0.28 * crack);
      this.cavity.scale.setScalar(1 + 0.045 * crack);
      this.cavity.visible = m > 0;
      // dust: rises after the landing (t of the landing ~ W.sealed + 0.45), gone 2.5 s later
      const tl = id === 5 ? t - (W.sealed + 0.35) : -1;
      this.dust.forEach((s, i) => {
        const u = clamp01(tl / 2.6), a = tl > 0 ? smooth(tl / 0.35) * (1 - smooth((tl - 0.6) / 1.9)) : 0;
        const side = i % 2 ? 1 : -1, sp = 0.3 + hh(i, 41) * 0.8;
        s.visible = a > 0.002;
        s.position.set(BLOCK_C[0] + side * (70 + 35 * sp * u) + (hh(i, 42) - 0.5) * 60, BLOCK_C[1] - 45 + 25 * hh(i, 43) + 30 * u * sp, Z.dash + 6 + i * 0.3);
        const sc = (24 + 30 * hh(i, 44)) * (0.6 + 0.9 * u);
        s.scale.set(sc * 1.4, sc, 1);
        (s.material as THREE.SpriteMaterial).opacity = a * (0.32 + 0.2 * hh(i, 45));
      });
      // Empire State silhouettes
      const e = empireAt(id, t);
      this.esb.forEach((mesh, i) => {
        const k = i < 2 ? smooth((e - i * 0.3) / 0.7) : e;
        (mesh.material as THREE.MeshBasicMaterial | THREE.ShaderMaterial).visible = k > 0.001;
        if (i < 2) { (mesh.material as THREE.MeshBasicMaterial).opacity = k; mesh.scale.set(1, 0.88 + 0.12 * k, 1); }
        else (mesh.material as THREE.ShaderMaterial).uniforms.uOp.value = k;
      });
      // probes
      const pr = probesAt(id, t);
      for (const q of this.probes) {
        let g = q.p.hit ? (id >= 11 ? 1 : 0) : smooth((pr - q.p.s0) / 0.36);
        if (q.p.hit && id >= 11 && id <= 12) g = 1;
        q.m.uniforms.uProg.value = g;
        q.m.visible = g > 0.001; q.tip.visible = g > 0.001;
        const { p, a } = along(q.pts, g);
        q.tip.position.set(p[0], p[1], Z.probe + 2); q.tip.rotation.z = a + Math.PI / 2; q.tip.scale.setScalar(Math.min(1, g * 8));
      }
      // refuge: a gentle breathing glow; brighter once found (id >= 11)
      const found = id >= 11 ? 1 : 0;
      (this.halo.material as THREE.SpriteMaterial).opacity = 0.42 + 0.08 * Math.sin(t * 2.2) + 0.2 * found;
      // rescue shaft
      const s = shaftAt(id, t);
      this.shaft.core.uniforms.uProg.value = s; this.shaft.core.visible = s > 0.001;
      const sp = along(this.shaft.pts, s).p;
      this.shaft.bit.visible = s > 0.001 && s < 0.999; this.shaft.bit.position.set(sp[0], sp[1] + 1, Z.shaft + 1);
      this.shaft.bit.scale.setScalar(Math.min(1, s * 10) * Math.min(1, (1 - s) * 20));
      this.shaft.bit.rotation.y = t * 6;
      // tire: rolls in from the right onto the shaft mouth and settles (scale from 0, no pop)
      const tr = tireAt(id, t);
      this.tire.visible = tr > 0.001;
      const off = 26 * (1 - tr);
      this.tire.position.set(SHAFT_X + off, TIRE_R * tr, -6);
      this.tire.rotation.z = off / TIRE_R;
      this.tire.scale.setScalar(tr);
      const dk = id === 14 ? smooth((t - (W.tire + 0.1)) / 0.4) : 0;
      for (const d of this.dashes) { d.uniforms.uOp.value = dk * 0.95; d.uniforms.uProg.value = dk; d.visible = dk > 0.001; }
    }
    // ---- capsule ----
    const c = capsuleAt(id, t);
    this.capsule.visible = c.show;
    if (c.show) {
      this.capsule.position.set(SHAFT[0], SHAFT[1] + c.y, SHAFT[2]);
      const open = id === 16 ? smooth((t - (W.light - 0.4)) / 0.38) : 0; // open just before W.light (cast card steps out at W.light)
      this.door.rotation.y = -1.9 * open;
      const top = this.capsule.position.y + 3.15 + 0.97, L = 22 - top;
      this.cable.position.set(0, 3.15 + 0.97, 0); this.cable.scale.set(1, Math.max(0.01, L), 1);
      this.cable.visible = false; // the hoist cable is surface.ts's (capsule top -> sheave wheel); a second coaxial one poked through the wheel
    }
    // ---- drill rod end + note ----
    const r = rodAt(id, t);
    this.rod.visible = r.note;
    if (r.note) this.rod.position.set(DRILL[0], DRILL[1] + r.up - 5, DRILL[2]);
  }
}
