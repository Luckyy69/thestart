// OWNER: in (interiors). The STATION module (ISS-like, at STATION) and the 1985 shuttle MIDDECK (at MIDDECK).
// Both sets use their OWN light rig (point lights + one "sun through a window" term evaluated per pixel in a small
// shader, like apollo/interiors.ts and miners/underground.ts), so the camera-relative outdoor sun never touches them.
// The sun term is an aperture test: a surface point is sunlit only if the ray toward the sun passes through the window
// disc, so the round window throws a crisp raking sun pool onto the deck. A soft additive shaft (NOINK) + dust motes lit
// only inside the shaft give the haze. Window views are a ray-traced Earth (ocean, land, clouds, glint, blue/golden
// atmosphere rim, stars, sun) on a NOINK card behind each window, so every camera sees correct parallax.
// Looks: "station" = cool white LED panels + a cool low raking sun shaft; "sunrise" (shot 8, the twist) = LEDs dim,
// a golden flooding shaft rakes down the module toward the push wall, gold fill; "middeck" = 80s fluorescents + one low
// sun shaft through the side-hatch window; "gross" (shot 7) = the middeck turns sickly green.
// Each set group is visible only in shots whose place is that set. Faces between the camera and the room (cutaway)
// hide automatically (a camera at +z outside the tube sees straight in).
// Contracts (all LOCAL to the set anchor, metres):
//   STATION: tube x -5.6 (push wall) .. +6 (open hatch), deck y 0, ceiling 2.3, walls z +-1.15 (chamfered corners
//     0.35). Clear crew space: x -5.1..4.0, y 0.4..2.0, z -0.75..0.75 (only the catch bar intrudes).
//     PUSH WALL face x = -5.6 (padded push plate x -5.6..-5.54, y 0.55..1.9, z -0.55..0.55) + vertical gold handrails
//     at z = +-0.72. CATCH BAR (Newman grabs it): gold bar across the module at x = 4.05, y = 1.45, z -0.45..0.45, hung
//     from the ceiling on two struts at z = +-0.45. WINDOW: -z wall, centre (1.5, 1.25, -1.15), clear radius 0.5.
//   MIDDECK: floor y 0, ceiling 2.2, back wall (lockers) z = -1.3 (locker faces z -1.23, x -1.95..0.75, y 0.2..2.0),
//     sleep bag x 1.0..1.9, side walls x = +-2.2, open toward +z. Crew at (-0.9|0|0.9, 1.1, 0).
//     Side hatch window on the -x wall at (-2.2, 1.3, -0.2) r 0.25.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ctex, rng } from "../bridge/paint";
import { NOINK } from "../bridge/ink";
import { STATION, MIDDECK, SHOTS, FPS, smooth } from "./story";

const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
type C3 = [number, number, number];

// ============================================================ light shader (own rig)
const NL = 12;
const VS = /* glsl */ `varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * w; }`;
const LIGHT = /* glsl */ `uniform vec3 uLP[${NL}]; uniform vec3 uLC[${NL}]; uniform float uLR[${NL}]; uniform vec3 uAU; uniform vec3 uAD;
uniform vec3 uSD; uniform vec3 uSC; uniform vec3 uWC; uniform vec3 uWN; uniform float uWR;
float attK(float R, float r2){ float a = R * R / (R * R + r2); return a * a; }
float sunK(vec3 p){
  float den = dot(uSD, uWN); if (den > -0.01) return 0.0;
  float t = dot(uWC - p, uWN) / den; if (t < 0.0) return 0.0;
  float d = length(p + uSD * t - uWC);
  return 1.0 - smoothstep(uWR * 0.92, uWR * 1.02, d);
}
vec3 lightAt(vec3 p, vec3 n){
  vec3 L = mix(uAD, uAU, 0.5 + 0.5 * n.y);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - p; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    L += uLC[i] * smoothstep(-0.25, 0.6, dot(n, l)) * attK(uLR[i], r2);
  }
  float ndl = dot(n, uSD);
  if (ndl > 0.0) L += uSC * smoothstep(0.0, 0.25, ndl) * sunK(p);
  return L;
}`;
const FS = /* glsl */ `uniform vec3 uCol; uniform vec3 uEm; uniform float uSpec; uniform float uSpecK;
#if defined(HAS_MAP) || defined(EMAP)
uniform sampler2D uMap;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
${LIGHT}
void main(){
  vec3 n = normalize(vN); if (dot(n, cameraPosition - vW) < 0.0) n = -n;
  vec4 tx = vec4(1.0);
#ifdef HAS_MAP
  tx = texture2D(uMap, vUv);
#endif
  vec3 c = uCol * tx.rgb * lightAt(vW, n) + uEm;
#ifdef EMAP
  c = texture2D(uMap, vUv).rgb * uEm;
#endif
#ifdef SPEC
  vec3 v = normalize(cameraPosition - vW);
  for (int i = 0; i < ${NL}; i++) {
    vec3 d = uLP[i] - vW; float r2 = dot(d, d); vec3 l = d * inversesqrt(max(r2, 1e-6));
    c += uLC[i] * pow(max(dot(n, normalize(l + v)), 0.0), uSpec) * attK(uLR[i] * 1.5, r2) * uSpecK;
  }
  c += uSC * pow(max(dot(n, normalize(uSD + v)), 0.0), uSpec) * sunK(vW) * uSpecK * 1.5;
#endif
  gl_FragColor = vec4(c, 1.0);
}`;

type LSet = { u: Record<string, { value: unknown }>; lp: THREE.Vector3[]; lc: THREE.Vector3[]; lr: number[] };
const lset = (): LSet => {
  const lp = Array.from({ length: NL }, () => V3(0, -999, 0));
  const lc = Array.from({ length: NL }, () => V3(0, 0, 0));
  const lr = Array.from({ length: NL }, () => 1);
  return {
    lp, lc, lr,
    u: {
      uLP: { value: lp }, uLC: { value: lc }, uLR: { value: lr }, uAU: { value: V3(0, 0, 0) }, uAD: { value: V3(0, 0, 0) },
      uSD: { value: V3(0, 1, 0) }, uSC: { value: V3(0, 0, 0) }, uWC: { value: V3(0, 0, 0) }, uWN: { value: V3(0, 0, 1) }, uWR: { value: 0.5 },
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
type MOpt = { col?: string; map?: THREE.Texture; em?: C3; spec?: number; specK?: number; emap?: boolean };
const imat = (S: LSet, o: MOpt) => {
  const defines: Record<string, string> = {};
  if (o.map && !o.emap) defines.HAS_MAP = "1";
  if (o.emap) defines.EMAP = "1";
  if (o.spec) defines.SPEC = "1";
  return new THREE.ShaderMaterial({
    uniforms: { ...S.u, uCol: { value: new THREE.Color(o.col ?? "#ffffff") }, uEm: { value: V3(...(o.em ?? [0, 0, 0])) }, uSpec: { value: o.spec ?? 30 }, uSpecK: { value: o.specK ?? 1 }, uMap: { value: o.map ?? null } },
    defines, vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide,
  });
};

// ============================================================ Earth through the window (ray traced, NOINK)
const EARTH_FS = /* glsl */ `uniform vec3 uED; uniform vec3 uSV; uniform vec3 uSunC; uniform float uT; uniform float uGold; uniform float uK;
varying vec3 vW;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float fbm(vec3 p, int oct){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * vn3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
void main(){
  vec3 d = normalize(vW - cameraPosition);
  const float R = 6371.0, H = 420.0;
  vec3 C = uED * (R + H);
  float b = dot(d, C), c = dot(C, C) - R * R, disc = b * b - c;
  float sd = max(dot(d, uSV), 0.0);
  vec3 col = vec3(0.004, 0.006, 0.018);
  // stars (fixed in direction space: no flicker)
  vec3 q = d * 260.0; vec3 ci = floor(q); float hs = h3(ci);
  if (hs > 0.965) { vec3 sp = ci + 0.5 + (vec3(h3(ci + 3.1), h3(ci + 7.7), h3(ci + 1.3)) - 0.5) * 0.5;
    col += vec3(0.75, 0.82, 1.0) * exp(-dot(q - sp, q - sp) * 14.0) * (hs - 0.965) * 70.0 * (1.0 - uGold * 0.6); }
  float gw = clamp(uGold * (0.35 + 1.2 * pow(sd, 3.0)), 0.0, 1.0);
  vec3 atmo = mix(vec3(0.28, 0.56, 1.3), vec3(1.7, 0.72, 0.26), gw);
  bool hit = disc > 0.0 && b > 0.0;
  if (!hit) {
    vec3 pc = d * max(b, 0.0) - C; float alt = length(pc) - R; vec3 up = normalize(pc);
    float lit = smoothstep(-0.45, 0.2, dot(up, uSV));
    col += atmo * (exp(-max(alt, 0.0) / 18.0) * 1.6 + exp(-max(alt, 0.0) / 70.0) * 0.35) * lit;
    col += uSunC * pow(sd, 4000.0) * 40.0; // the sun disc (hidden behind Earth)
  } else {
    float t = b - sqrt(disc); vec3 P = d * t; vec3 N = normalize(P - C);
    vec3 Nn = N + vec3(uT * 0.0012, 0.0, uT * 0.0006);
    float mu = clamp(dot(N, -d), 0.0, 1.0), hz = pow(1.0 - mu, 3.2);
    float fade = smoothstep(0.0, 0.12, mu); // fine detail fades toward the limb (no shimmer)
    float land = fbm(Nn * 26.0 + 2.0, 5);
    float lm = smoothstep(0.5, 0.53, land);
    vec3 ocean = mix(vec3(0.012, 0.07, 0.26), vec3(0.02, 0.17, 0.42), fbm(Nn * 70.0, 3));
    ocean = mix(ocean, vec3(0.06, 0.38, 0.5), smoothstep(0.44, 0.5, land) * (1.0 - lm));
    vec3 lc = mix(vec3(0.2, 0.34, 0.1), vec3(0.62, 0.46, 0.24), smoothstep(0.35, 0.65, fbm(Nn * 60.0 + 5.0, 4)));
    vec3 s = mix(ocean, lc, lm);
    float cw = fbm(Nn * 35.0 + 11.0, 3);
    float cl = fbm(Nn * vec3(90.0, 140.0, 90.0) + cw * 2.6, 5);
    cl = mix(0.47, cl, fade);
    float cm = smoothstep(0.46, 0.62, cl);
    s = mix(s, vec3(0.96, 0.98, 1.0), cm);
    float ndl = dot(N, uSV);
    float li = smoothstep(-0.12, 0.3, ndl);
    vec3 term = vec3(1.0, 0.42, 0.14) * exp(-pow((ndl - 0.02) / 0.09, 2.0)) * (0.6 + uGold);
    vec3 sc = s * (uSunC * li * 0.6 + term * 0.8 + vec3(0.01, 0.015, 0.03));
    vec3 rf = reflect(d, N);
    sc += uSunC * pow(max(dot(rf, uSV), 0.0), 300.0) * (1.0 - lm) * (1.0 - cm) * 5.0 * li;
    float alit = smoothstep(-0.3, 0.25, ndl);
    col = mix(sc, atmo * alit * 0.9, hz * 0.75) + atmo * alit * pow(1.0 - mu, 10.0) * 1.1;
  }
  col += uSunC * (pow(sd, 160.0) * 0.9 + pow(sd, 14.0) * 0.12 + pow(sd, 3.0) * 0.04);
  gl_FragColor = vec4(col * uK, 1.0);
}`;
/** the Earth-view sun: low above the station's local horizon (up = -earthDir), toward `toward`, elevation sin `e` */
const viewSun = (ed: THREE.Vector3, toward: THREE.Vector3, e: number) => {
  const up = ed.clone().negate(), h = toward.clone().addScaledVector(up, -toward.dot(up)).normalize();
  return h.multiplyScalar(Math.sqrt(1 - e * e)).addScaledVector(up, e).normalize();
};
const earthMat = () => new THREE.ShaderMaterial({
  uniforms: { uED: { value: V3(0, -1, 0) }, uSV: { value: V3(1, 0, 0) }, uSunC: { value: V3(1, 1, 1) }, uT: { value: 0 }, uGold: { value: 0 }, uK: { value: 1 } },
  vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: EARTH_FS, side: THREE.DoubleSide,
});

// ============================================================ volumetric bits (NOINK)
/** a soft additive parallel shaft from a window disc along `dir` */
const shaftMat = (k: number) => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: V3(1, 1, 1) }, uK: { value: k }, uT: { value: 0 } },
  vertexShader: /* glsl */ `varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
    void main(){ vAl = clamp(-position.y, 0.0, 1.0); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
      vN = normalize(mat3(modelMatrix) * normal); vAng = uv.x; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: /* glsl */ `uniform vec3 uCol; uniform float uK; uniform float uT; varying float vAl; varying vec3 vW; varying vec3 vN; varying float vAng;
    void main(){ vec3 v = normalize(cameraPosition - vW); float e = abs(dot(normalize(vN), v));
      float streak = 0.7 + 0.3 * sin(vAng * 6.2832 * 7.0 + sin(vAng * 6.2832 * 3.0 + uT * 0.35) * 1.6 + vAl * 2.0);
      float a = uK * (0.45 + 0.55 * pow(1.0 - vAl, 1.3)) * smoothstep(0.0, 0.08, vAl) * e * e * streak;
      a *= smoothstep(0.4, 1.4, length(cameraPosition - vW));
      gl_FragColor = vec4(uCol * a, 1.0); }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
class Shaft {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, rad: number, k: number) {
    this.mat = shaftMat(k);
    const g = new THREE.CylinderGeometry(rad, rad * 1.08, 1, 48, 8, true); // unit length along -y, scaled to length
    g.translate(0, -0.5, 0);
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; parent.add(this.mesh);
  }
  set(start: THREE.Vector3, dir: THREE.Vector3, len: number, col: C3, k: number, t: number) {
    this.mesh.position.copy(start);
    this.mesh.quaternion.setFromUnitVectors(V3(0, -1, 0), dir.clone().normalize());
    this.mesh.scale.set(1, len, 1);
    (this.mat.uniforms.uCol.value as THREE.Vector3).set(...col);
    this.mat.uniforms.uK.value = k; this.mat.uniforms.uT.value = t;
    this.mesh.visible = k > 0.002;
  }
}
/** dust motes: glow only inside the sun shaft (same aperture test) + a faint ambient sparkle */
class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, S: LSet, n: number, seed: number, box: [number, number, number, number, number, number]) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P[i * 3] = box[0] + r() * (box[3] - box[0]); P[i * 3 + 1] = box[1] + r() * (box[4] - box[1]); P[i * 3 + 2] = box[2] + r() * (box[5] - box[2]);
      D[i * 4] = r(); D[i * 4 + 1] = 0.005 + 0.01 * r() * r(); D[i * 4 + 2] = 0.6 + 0.8 * r(); D[i * 4 + 3] = r();
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { ...S.u, uT: { value: 0 }, uK: { value: 1 } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform float uT; uniform float uK;
        varying vec3 vC; varying vec2 vQ; ${LIGHT}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (modelMatrix * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.23 * sp + ph) * 0.18 + sin(uT * 0.11 + ph * 3.0) * 0.08,
            sin(uT * 0.17 * sp + ph * 2.0) * 0.16, cos(uT * 0.21 * sp + ph * 1.3) * 0.18);
          vec3 L = uSC * sunK(p) * 0.9 + (uAU + uAD) * 0.06;
          float tw = 0.6 + 0.4 * sin(uT * (1.5 + 2.5 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p);
          float s = iS.y * max(1.0, dist * 0.2);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = L * uK * tw * smoothstep(0.6, 1.4, dist) / max(1.0, dist * 0.2);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: /* glsl */ `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
}

// ============================================================ geometry helpers
const clean = (g: THREE.BufferGeometry) => {
  const s = g.index ? g.toNonIndexed() : g;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(out.getAttribute("position").count * 2), 2));
  return out;
};
const TRS = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V3(s, s, s));
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
  rbox(mat: THREE.Material, w: number, h: number, d: number, rad: number, mx: THREE.Matrix4) { this.add(new RoundedBoxGeometry(w, h, d, 2, rad), mat, mx); }
  cyl(mat: THREE.Material, r0: number, r1: number, h: number, seg: number, mx: THREE.Matrix4, open = false) { this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1, open), mat, mx); }
  /** a rod between two points */
  rod(mat: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, r: number, seg = 10) {
    const d = b.clone().sub(a), L = d.length();
    const g = new THREE.CylinderGeometry(r, r, L, seg, 1, false);
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1));
    this.add(g, mat, m);
  }
  tube(mat: THREE.Material, pts: THREE.Vector3[], r: number, seg = 40) { this.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8, false), mat); }
  build(parent: THREE.Object3D) {
    for (const [mat, list] of this.m) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix(); mesh.frustumCulled = false;
      parent.add(mesh);
    }
    this.m.clear();
  }
}
/** rewrite uvs from positions */
const uvFrom = (g: THREE.BufferGeometry, f: (p: THREE.Vector3) => [number, number]) => {
  const p = g.getAttribute("position"), uv = new Float32Array(p.count * 2), v = V3(0, 0, 0);
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const [a, b] = f(v); uv[i * 2] = a; uv[i * 2 + 1] = b; }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
};
/** a flat quad from 4 corners */
const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([a, b, c, a, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
  g.computeVertexNormals();
  return g;
};
/** a thick ring (bezel) around the z axis: inner r0, outer r1, depth d (from z=0 toward +z) */
const ringGeo = (r0: number, r1: number, d: number, seg = 64) => {
  const pts = [new THREE.Vector2(r0, 0), new THREE.Vector2(r1, 0), new THREE.Vector2(r1, d * 0.75), new THREE.Vector2(r1 - 0.02, d), new THREE.Vector2(r0 + 0.01, d), new THREE.Vector2(r0, 0)];
  const g = new THREE.LatheGeometry(pts, seg);
  g.rotateX(Math.PI / 2); // lathe height y -> +z
  return g;
};
const repeatTex = (t: THREE.Texture) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };

// ============================================================ canvas painting
type G = CanvasRenderingContext2D;
const txt = (g: G, s: string, x: number, y: number, px: number, col = "#2a2a2a", align: CanvasTextAlign = "center", font = "sans-serif") => {
  g.font = `bold ${Math.max(6, Math.round(px))}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const noise = (g: G, x0: number, y0: number, w: number, h: number, r: () => number, n: number, a: number) => {
  for (let i = 0; i < n; i++) { g.fillStyle = r() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; g.fillRect(x0 + r() * w, y0 + r() * h, 1 + r() * 2.5, 1 + r() * 2.5); }
};
const rr = (g: G, x: number, y: number, w: number, h: number, rad: number) => { g.beginPath(); g.roundRect(x, y, w, h, rad); };
const CODES = ["LAB1O3", "LAB1S2", "NOD1D4", "ER-2", "ER-5", "MSG", "WORK SITE", "O2 MASK", "PBA", "CHeCS", "WHC", "TeSS", "AVIONICS", "ZSR", "LAB1P4", "CREW QTRS", "STOW 12", "SPARES", "EXP 7", "FILTERS"];
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length) % a.length];
const velcro = (g: G, x: number, y: number, w: number, h: number, r: () => number) => {
  g.fillStyle = "#d8d3c4"; rr(g, x, y, w, h, 3); g.fill();
  noise(g, x, y, w, h, r, Math.floor((w * h) / 20), 0.12);
  g.strokeStyle = "rgba(60,50,30,0.35)"; g.lineWidth = 1.5; rr(g, x, y, w, h, 3); g.stroke();
};
const label = (g: G, s: string, x: number, y: number, w: number, h: number, bg = "#ffffff", fg = "#1d2a44") => {
  g.fillStyle = bg; g.fillRect(x - w / 2, y - h / 2, w, h); g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 1.5; g.strokeRect(x - w / 2, y - h / 2, w, h);
  txt(g, s, x, y + 1, h * 0.62, fg);
};
/** one ISS-style rack face (padded / equipment / stowage / blue cover) */
const paintRack = (g: G, x: number, y: number, w: number, h: number, r: () => number, kind: number) => {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (kind === 0) { // quilted cream padding
    g.fillStyle = "#e9e2cf"; g.fillRect(x, y, w, h);
    const cols = 2 + Math.floor(r() * 2), rows = 3 + Math.floor(r() * 2), pw = w / cols, ph = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = x + i * pw + 6, py = y + j * ph + 6, ww = pw - 12, hh = ph - 12;
      const gr = g.createLinearGradient(px, py, px, py + hh);
      gr.addColorStop(0, "#fbf8ef"); gr.addColorStop(0.5, "#f1ebdc"); gr.addColorStop(1, "#d6cdb6");
      g.fillStyle = gr; rr(g, px, py, ww, hh, 18); g.fill();
      g.setLineDash([7, 6]); g.strokeStyle = "rgba(120,104,76,0.45)"; g.lineWidth = 2; rr(g, px + 9, py + 9, ww - 18, hh - 18, 12); g.stroke(); g.setLineDash([]);
      g.strokeStyle = "rgba(70,60,40,0.55)"; g.lineWidth = 2.5; rr(g, px, py, ww, hh, 18); g.stroke();
    }
    for (let k = 0; k < 3; k++) velcro(g, x + 20 + r() * (w - 90), y + 20 + r() * (h - 70), 34 + r() * 30, 22 + r() * 16, r);
    label(g, pick(r, CODES), x + w * (0.3 + 0.4 * r()), y + h * (0.1 + 0.8 * r()), 110, 24);
  } else if (kind === 1) { // equipment rack
    g.fillStyle = "#c3c8cc"; g.fillRect(x, y, w, h); noise(g, x, y, w, h, r, 2200, 0.05);
    let yy = y + 10;
    while (yy < y + h - 40) {
      const bh = 50 + r() * 110, inset = 10;
      g.fillStyle = pick(r, ["#a4abb2", "#8e979f", "#b7bcc0", "#d9d9d4"]); rr(g, x + inset, yy, w - 2 * inset, bh, 6); g.fill();
      g.strokeStyle = "rgba(20,24,30,0.7)"; g.lineWidth = 2.5; g.stroke();
      const n = 2 + Math.floor(r() * 5);
      for (let k = 0; k < n; k++) {
        const cx = x + inset + 24 + (k + 0.5) * ((w - 2 * inset - 48) / n), cy = yy + bh / 2;
        const t = r();
        if (t < 0.3) { g.fillStyle = "#2a2e33"; g.beginPath(); g.arc(cx, cy, 11, 0, 7); g.fill(); g.fillStyle = "#8a9096"; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); }
        else if (t < 0.5) { g.fillStyle = "#1f2a24"; g.fillRect(cx - 26, cy - 13, 52, 26); txt(g, (100 + Math.floor(r() * 899)).toString(), cx, cy, 16, "#7dff9a", "center", "monospace"); }
        else if (t < 0.7) { g.fillStyle = "#e8e8e4"; g.fillRect(cx - 4, cy - 14, 8, 20); g.fillStyle = "#33373c"; g.fillRect(cx - 6, cy + 4, 12, 8); }
        else if (t < 0.85) { g.fillStyle = pick(r, ["#d43b2f", "#2f7bd4", "#f0c020"]); g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); g.strokeStyle = "#222"; g.lineWidth = 1.5; g.stroke(); }
        else { g.strokeStyle = "#2a2e33"; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 13, 0, 7); g.stroke(); g.fillStyle = "#555b61"; g.beginPath(); g.arc(cx, cy, 8, 0, 7); g.fill(); }
      }
      if (r() < 0.35) txt(g, pick(r, CODES), x + inset + 10, yy + 12, 13, "#1d2a44", "left");
      yy += bh + 8;
    }
    if (r() < 0.6) { // hazard stripe
      const sy = y + h * (0.15 + 0.7 * r());
      g.save(); g.beginPath(); g.rect(x + 10, sy, w - 20, 16); g.clip(); g.fillStyle = "#f1c21b"; g.fillRect(x, sy, w, 16);
      g.fillStyle = "#1a1a1a"; for (let k = -20; k < w; k += 24) { g.beginPath(); g.moveTo(x + k, sy + 16); g.lineTo(x + k + 12, sy); g.lineTo(x + k + 22, sy); g.lineTo(x + k + 10, sy + 16); g.fill(); }
      g.restore();
    }
  } else if (kind === 2) { // stowage: bags strapped down
    g.fillStyle = "#e4ddc9"; g.fillRect(x, y, w, h);
    let yy = y + 12;
    while (yy < y + h - 60) {
      const bh = 90 + r() * 120, bc = pick(r, ["#f3efe4", "#ece5d2", "#c9d3df", "#dfe3e6"]);
      const gr = g.createLinearGradient(x, yy, x, yy + bh); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.2, bc); gr.addColorStop(1, "#b9b09a");
      g.fillStyle = gr; rr(g, x + 14, yy, w - 28, bh, 22); g.fill(); g.strokeStyle = "rgba(50,44,32,0.7)"; g.lineWidth = 3; g.stroke();
      g.strokeStyle = "#7a7366"; g.lineWidth = 3; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x + 34, yy + 16); g.lineTo(x + w - 34, yy + 16); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#3b4f6e"; g.fillRect(x + w * 0.3, yy - 4, 14, bh + 8); g.fillRect(x + w * 0.65, yy - 4, 14, bh + 8);
      label(g, pick(r, ["CTB 1.0", "CTB 0.5", "M-01", "FOOD", "HYGIENE", "CLOTHING", "TOOLS"]), x + w * 0.48, yy + bh * 0.55, 90, 22, "#fffdf2");
      yy += bh + 14;
    }
  } else { // blue-grey closeout cover
    g.fillStyle = "#8ba2bf"; g.fillRect(x, y, w, h); noise(g, x, y, w, h, r, 2500, 0.05);
    g.setLineDash([8, 6]); g.strokeStyle = "rgba(30,40,60,0.55)"; g.lineWidth = 2.5; rr(g, x + 16, y + 16, w - 32, h - 32, 14); g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 2; k++) velcro(g, x + 30 + r() * (w - 100), y + 30 + r() * (h - 80), 40, 26, r);
    label(g, pick(r, CODES), x + w / 2, y + h * 0.22, 120, 26);
    if (r() < 0.5) { // fire port
      const fx = x + w * 0.5, fy = y + h * 0.7; g.fillStyle = "#e8d23a"; g.beginPath(); g.arc(fx, fy, 22, 0, 7); g.fill();
      g.fillStyle = "#1a1a1a"; g.beginPath(); g.arc(fx, fy, 11, 0, 7); g.fill(); txt(g, "FIRE PORT", fx, fy + 36, 14, "#a41f17");
    }
  }
  g.restore();
  g.strokeStyle = "#3d3a33"; g.lineWidth = 5; g.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
  g.fillStyle = "#6e6a60"; for (const [bx, by] of [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]]) { g.beginPath(); g.arc(bx, by, 5, 0, 7); g.fill(); }
};
/** a face texture: 3 racks across (3.15 m), the full flat face height */
const rackTex = (key: string, seed: number, kinds: number[]) => repeatTex(ctex(key, 2048, 1024, (g) => {
  const r = rng(seed); const w = 2048 / 3;
  g.fillStyle = "#2b2a26"; g.fillRect(0, 0, 2048, 1024);
  for (let i = 0; i < 3; i++) paintRack(g, i * w + 3, 3, w - 6, 1018, r, kinds[i]);
}));
const chamferTex = () => repeatTex(ctex("buChamfer", 1024, 256, (g, r) => {
  g.fillStyle = "#bfc6cc"; g.fillRect(0, 0, 1024, 256); noise(g, 0, 0, 1024, 256, r, 3000, 0.05);
  for (let x = 0; x < 1024; x += 256) { g.fillStyle = "#4a525b"; g.fillRect(x, 0, 4, 256); }
  for (let k = 0; k < 6; k++) { const x = 40 + r() * 940; for (let s = 0; s < 6; s++) { g.fillStyle = "#59626c"; rr(g, x + s * 10, 60, 5, 60, 2); g.fill(); } }
  for (let k = 0; k < 4; k++) label(g, pick(r, ["DUCT", "SMOKE DET", "PWR 28V", "DATA", "AIR IN", "J-12"]), 110 + k * 250 + r() * 140, 190, 90, 20); // spaced: no overlapping plates
  g.fillStyle = "#3e4650"; g.fillRect(0, 0, 1024, 6); g.fillRect(0, 250, 1024, 6);
}));
const screenTex = (key: string, kind: number) => ctex(key, 512, 320, (g, r) => {
  g.fillStyle = "#0b1a33"; g.fillRect(0, 0, 512, 320);
  if (kind === 0) { // orbit map with sine ground track
    g.fillStyle = "#16345c"; g.fillRect(16, 40, 480, 240);
    g.fillStyle = "#3f8f5a";
    for (let k = 0; k < 7; k++) { const cx = 40 + r() * 430, cy = 70 + r() * 180; g.beginPath(); g.ellipse(cx, cy, 25 + r() * 50, 15 + r() * 35, r() * 3, 0, 7); g.fill(); }
    g.strokeStyle = "#ffd23a"; g.lineWidth = 4; g.beginPath();
    for (let x = 16; x <= 496; x += 4) { const y = 160 - 80 * Math.sin(((x - 16) / 480) * Math.PI * 2 + 0.6); if (x === 16) g.moveTo(x, y); else g.lineTo(x, y); }
    g.stroke(); g.fillStyle = "#ffffff"; g.beginPath(); g.arc(250, 160 - 80 * Math.sin((234 / 480) * Math.PI * 2 + 0.6), 8, 0, 7); g.fill();
    txt(g, "GMT 112/14:37", 256, 20, 20, "#bfe1ff", "center", "monospace");
  } else { // procedure viewer
    g.fillStyle = "#e9eef5"; g.fillRect(16, 16, 480, 288); txt(g, "PROCEDURE 2.104", 256, 38, 22, "#14284a");
    for (let k = 0; k < 9; k++) { g.fillStyle = k === 3 ? "#ffe066" : "#9fb0c8"; g.fillRect(40, 66 + k * 25, 160 + r() * 260, 10); }
  }
});
const checklistTex = () => ctex("buChecklist", 256, 340, (g, r) => {
  g.fillStyle = "#fbf7e8"; g.fillRect(0, 0, 256, 340); g.fillStyle = "#2f62b0"; g.fillRect(0, 0, 256, 44);
  txt(g, "CHECKLIST", 128, 23, 24, "#ffffff");
  for (let k = 0; k < 9; k++) { g.strokeStyle = "#333"; g.lineWidth = 2; g.strokeRect(18, 62 + k * 30, 14, 14); g.fillStyle = "#8d96a6"; g.fillRect(42, 66 + k * 30, 80 + r() * 110, 7); }
  g.strokeStyle = "#1a7a34"; g.lineWidth = 4; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(19, 69 + k * 30); g.lineTo(25, 75 + k * 30); g.lineTo(34, 60 + k * 30); g.stroke(); }
});
const glassTex = () => ctex("buGlass", 256, 256, (g) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, 256, 256);
  const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.35, "rgba(255,255,255,0.15)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(255,255,255,0.8)"; g.save(); g.translate(128, 128); g.rotate(-0.7); g.fillRect(-120, -60, 240, 10); g.fillRect(-120, -38, 240, 4); g.restore();
});

// ============================================================ the STATION module
const ZW = 1.15, YC = 2.3, CH = 0.35, X0 = -5.6, X1 = 6.0;
const WIN = { x: 1.5, y: 1.25, r: 0.5 };
const PERIOD = 3.15;
/** a small stencilled label plate */
const label3 = (b: Bat, S: LSet, s: string, x: number, y: number, z: number, ry: number) => {
  const tex = ctex(`buLbl_${s}`, 256, 64, (g) => { g.fillStyle = "#f2c21e"; g.fillRect(0, 0, 256, 64); g.strokeStyle = "#1a1a1a"; g.lineWidth = 6; g.strokeRect(3, 3, 250, 58); txt(g, s, 128, 34, 40, "#1a1a1a"); });
  b.add(new THREE.PlaneGeometry(0.3, 0.075), imat(S, { map: tex }), TRS(x, y, z, ry));
};
class Station {
  root = new THREE.Group();
  S = lset();
  posZ = new THREE.Group(); ceil = new THREE.Group(); deck = new THREE.Group();
  ledMat: THREE.ShaderMaterial; earth: THREE.ShaderMaterial; glass: THREE.MeshBasicMaterial;
  shaft: Shaft; flood: Shaft; motes: Motes;
  floaters: { m: THREE.Object3D; p: THREE.Vector3; ph: number }[] = [];
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...STATION);
    R.add(this.posZ, this.ceil, this.deck);
    const mk = (key: string, seed: number, kinds: number[]) => imat(S, { col: "#ffffff", map: rackTex(key, seed, kinds) });
    const wallA = mk("buRackA", 11, [0, 1, 2]), wallB = mk("buRackB", 23, [2, 0, 3]), ceilT = mk("buRackC", 37, [0, 2, 0]), deckT = mk("buRackD", 41, [1, 0, 2]);
    const cham = imat(S, { col: "#ffffff", map: chamferTex() });
    const uvW = (off: number) => (p: THREE.Vector3): [number, number] => [(p.x + off) / PERIOD, (p.y - CH) / (YC - 2 * CH)];
    // ---- shell ----
    { // -z wall with the window hole
      const sh = new THREE.Shape(); sh.moveTo(X0, CH); sh.lineTo(X1, CH); sh.lineTo(X1, YC - CH); sh.lineTo(X0, YC - CH); sh.lineTo(X0, CH);
      const hole = new THREE.Path(); hole.absarc(WIN.x, WIN.y, WIN.r, 0, Math.PI * 2, true); sh.holes.push(hole);
      const g = new THREE.ShapeGeometry(sh, 48); g.translate(0, 0, -ZW); uvFrom(g, uvW(0.4));
      const m = new THREE.Mesh(g, wallA); R.add(m);
    }
    { const g = uvFrom(quad(V3(X1, CH, ZW), V3(X0, CH, ZW), V3(X0, YC - CH, ZW), V3(X1, YC - CH, ZW)), (p) => [-(p.x + 1.3) / PERIOD, (p.y - CH) / (YC - 2 * CH)]); this.posZ.add(new THREE.Mesh(g, wallB)); }
    { const g = uvFrom(quad(V3(X0, YC, -ZW + CH), V3(X1, YC, -ZW + CH), V3(X1, YC, ZW - CH), V3(X0, YC, ZW - CH)), (p) => [(p.x + 2.1) / PERIOD, (ZW - CH - p.z) / (2 * (ZW - CH))]); this.ceil.add(new THREE.Mesh(g, ceilT)); }
    { const g = uvFrom(quad(V3(X0, 0, ZW - CH), V3(X1, 0, ZW - CH), V3(X1, 0, -ZW + CH), V3(X0, 0, -ZW + CH)), (p) => [(p.x + 0.9) / PERIOD, (ZW - CH - p.z) / (2 * (ZW - CH))]); this.deck.add(new THREE.Mesh(g, deckT)); }
    const chamUV = (p: THREE.Vector3): [number, number] => [(p.z > 0 ? -p.x : p.x) / 3, (p.y < 1 ? p.y : p.y - (YC - CH)) / CH]; // text upright + unmirrored from inside
    const chams: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Object3D][] = [
      [V3(X0, CH, -ZW), V3(X1, CH, -ZW), V3(X1, 0, -ZW + CH), V3(X0, 0, -ZW + CH), R],
      [V3(X0, YC - CH, -ZW), V3(X1, YC - CH, -ZW), V3(X1, YC, -ZW + CH), V3(X0, YC, -ZW + CH), R],
      [V3(X0, CH, ZW), V3(X1, CH, ZW), V3(X1, 0, ZW - CH), V3(X0, 0, ZW - CH), this.posZ],
      [V3(X0, YC - CH, ZW), V3(X1, YC - CH, ZW), V3(X1, YC, ZW - CH), V3(X0, YC, ZW - CH), this.posZ],
    ];
    for (const [a, b2, c, d, par] of chams) par.add(new THREE.Mesh(uvFrom(quad(a, b2, c, d), chamUV), cham));
    const b = new Bat(), bz = new Bat(), bc = new Bat();
    const dark = imat(S, { col: "#3a3f46" }), grey = imat(S, { col: "#b4bcc4", spec: 40, specK: 0.35 });
    const gold = imat(S, { col: "#e2b23a", spec: 30, specK: 0.7 });
    const pad = imat(S, { col: "#e8e1cd" }), padDark = imat(S, { col: "#cfc5ab" });
    const octa = () => {
      const pts = [[-ZW + CH, 0], [ZW - CH, 0], [ZW, CH], [ZW, YC - CH], [ZW - CH, YC], [-ZW + CH, YC], [-ZW, YC - CH], [-ZW, CH]];
      const sh = new THREE.Shape(); pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
      return sh;
    };
    { // the -x PUSH WALL (flat, padded) with a closed hatch, push plate, two vertical handrails
      const g = new THREE.ShapeGeometry(octa()); g.rotateY(Math.PI / 2); g.translate(X0, 0, 0);
      b.add(g, imat(S, { col: "#dcd5c2" }));
      const ring = ringGeo(0.5, 0.64, 0.07); ring.rotateY(Math.PI / 2); b.add(ring, grey, TRS(X0, 1.2, 0));
      b.cyl(imat(S, { col: "#c9ced2" }), 0.5, 0.5, 0.03, 48, TRS(X0 + 0.015, 1.2, 0, 0, 0, Math.PI / 2));
      b.rbox(pad, 0.06, 1.35, 1.1, 0.025, TRS(X0 + 0.06, 1.22, 0));
      for (let k = 0; k < 4; k++) b.box(padDark, X0 + 0.085, 0.62 + k * 0.33, -0.5, X0 + 0.1, 0.64 + k * 0.33, 0.5);
      for (const z of [-0.72, 0.72]) {
        b.rod(gold, V3(X0 + 0.12, 0.55, z), V3(X0 + 0.12, 1.85, z), 0.022);
        for (const y of [0.55, 1.85]) b.rod(gold, V3(X0, y, z), V3(X0 + 0.13, y, z), 0.022);
      }
      label3(b, S, "PUSH", X0 + 0.096, 1.98, 0, Math.PI / 2);
    }
    { // +x end: bulkhead with an OPEN hatch into the next (dimmer) module
      const sh = octa();
      const hole = new THREE.Path(); hole.absarc(0, 1.15, 0.55, 0, Math.PI * 2, true); sh.holes.push(hole);
      const g = new THREE.ShapeGeometry(sh, 40); g.rotateY(-Math.PI / 2); g.translate(X1, 0, 0);
      b.add(g, imat(S, { col: "#dcd5c2" }));
      const ring = ringGeo(0.55, 0.72, 0.09); ring.rotateY(-Math.PI / 2); b.add(ring, grey, TRS(X1, 1.15, 0));
      const tun = new THREE.CylinderGeometry(0.55, 0.55, 1.6, 40, 1, true); tun.rotateZ(Math.PI / 2); b.add(tun, imat(S, { col: "#b9b3a2" }), TRS(X1 + 0.8, 1.15, 0));
      const far = imat(S, { col: "#9aa0a6", map: rackTex("buRackE", 53, [0, 3, 1]) });
      b.add(uvFrom(quad(V3(X1 + 1.6, 0.0, 1.2), V3(X1 + 1.6, 0.0, -1.2), V3(X1 + 1.6, 2.3, -1.2), V3(X1 + 1.6, 2.3, 1.2)), (p) => [(p.z + 1.2) / PERIOD, p.y / 2.3]), far);
      b.cyl(imat(S, { col: "#c9ced2" }), 0.53, 0.53, 0.05, 40, TRS(X1 - 0.35, 1.15, 0.72, 0, Math.PI / 2, 0));
    }
    // ---- the window: bezel, tunnel, Earth card, glass ----
    {
      const wz = -ZW;
      b.add(ringGeo(WIN.r, WIN.r + 0.2, 0.09), imat(S, { col: "#d8dde2", spec: 50, specK: 0.5 }), TRS(WIN.x, WIN.y, wz));
      b.add(ringGeo(WIN.r + 0.2, WIN.r + 0.26, 0.04), dark, TRS(WIN.x, WIN.y, wz));
      const tun = new THREE.CylinderGeometry(WIN.r, WIN.r * 0.96, 0.32, 56, 1, true); tun.rotateX(Math.PI / 2);
      b.add(tun, imat(S, { col: "#8d949b" }), TRS(WIN.x, WIN.y, wz - 0.16));
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; b.cyl(dark, 0.018, 0.018, 0.03, 8, TRS(WIN.x + Math.cos(a) * (WIN.r + 0.12), WIN.y + Math.sin(a) * (WIN.r + 0.12), wz + 0.1, 0, Math.PI / 2)); }
      for (const x of [WIN.x - 0.85, WIN.x + 0.85]) {
        b.rod(gold, V3(x, WIN.y - 0.55, wz + 0.08), V3(x, WIN.y + 0.55, wz + 0.08), 0.02);
        for (const y of [WIN.y - 0.55, WIN.y + 0.55]) b.rod(gold, V3(x, y, wz), V3(x, y, wz + 0.09), 0.02);
      }
      this.earth = earthMat();
      const card = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), this.earth);
      card.position.set(WIN.x, WIN.y, wz - 0.42); card.layers.set(NOINK); R.add(card);
      this.glass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.09, 0.13), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, map: glassTex() });
      const gl = new THREE.Mesh(new THREE.CircleGeometry(WIN.r, 56), this.glass);
      gl.position.set(WIN.x, WIN.y, wz - 0.05); gl.layers.set(NOINK); gl.renderOrder = 4; R.add(gl);
    }
    // ---- LED light panels on the ceiling chamfers (emissive) ----
    this.ledMat = imat(S, { col: "#ffffff", em: [2.4, 2.5, 2.6] });
    for (const x of [-4.4, -1.8, 0.8, 3.4]) for (const s of [-1, 1]) {
      const zc = s * (ZW - CH / 2), yc = YC - CH / 2;
      const m = TRS(x, yc, zc).multiply(new THREE.Matrix4().makeRotationX(s > 0 ? (3 * Math.PI) / 4 : Math.PI / 4));
      (s > 0 ? bz : b).box(dark, -0.42, -0.06, -0.01, 0.42, 0.06, 0.012, m);
      (s > 0 ? bz : b).box(this.ledMat, -0.38, -0.04, 0.012, 0.38, 0.04, 0.022, m);
    }
    // ---- handrails (gold) on the rack faces ----
    const rail = (bb: Bat, a: THREE.Vector3, c: THREE.Vector3, n: THREE.Vector3) => {
      const o = n.clone().multiplyScalar(0.08);
      bb.rod(gold, a.clone().add(o), c.clone().add(o), 0.019);
      bb.rod(gold, a, a.clone().add(o), 0.017); bb.rod(gold, c, c.clone().add(o), 0.017);
    };
    for (const x of [-4.9, -3.2, -1.6, 0.0, 3.0, 4.6]) {
      if (Math.abs(x - WIN.x) < 1.1) continue;
      rail(b, V3(x - 0.25, 1.87, -ZW), V3(x + 0.25, 1.87, -ZW), V3(0, 0, 1));
      rail(b, V3(x - 0.2, 0.5, -ZW), V3(x + 0.2, 0.5, -ZW), V3(0, 0, 1));
    }
    for (const x of [-4.2, -2.4, -0.8, 1.2, 2.8, 4.9]) rail(bz, V3(x - 0.25, 1.85, ZW), V3(x + 0.25, 1.85, ZW), V3(0, 0, -1));
    for (const x of [-3.9, -1.0, 2.2]) rail(bc, V3(x - 0.3, YC, 0.55), V3(x + 0.3, YC, 0.55), V3(0, -1, 0));
    // the CATCH BAR (Newman, shot 8): across the module at x 4.05, y 1.45, hung from the ceiling
    b.rod(gold, V3(4.05, 1.45, -0.45), V3(4.05, 1.45, 0.45), 0.024, 14);
    for (const z of [-0.45, 0.45]) { b.rod(grey, V3(4.05, 1.45, z), V3(4.05, YC, z), 0.022); b.cyl(dark, 0.045, 0.045, 0.05, 12, TRS(4.05, YC - 0.025, z)); }
    for (const z of [-0.3, 0.3]) b.cyl(imat(S, { col: "#3a5c9a" }), 0.032, 0.032, 0.1, 12, TRS(4.05, 1.45, z, 0, Math.PI / 2));
    // foot-restraint bars on the deck
    const footPad = imat(S, { col: "#4a5a74" });
    for (const [x0, x1] of [[-2.9, -2.1], [2.3, 3.1]]) {
      b.rod(gold, V3(x0, 0.14, -0.35), V3(x1, 0.14, -0.35), 0.022);
      for (const x of [x0, x1]) b.rod(gold, V3(x, 0.0, -0.35), V3(x, 0.14, -0.35), 0.02);
      b.box(footPad, x0 + 0.1, 0.005, -0.5, x1 - 0.1, 0.02, -0.2);
    }
    // ---- laptops on arms ----
    const lapBody = imat(S, { col: "#2c2f34", spec: 40, specK: 0.3 }), lapKeys = imat(S, { col: "#55595f" });
    const laptop = (bb: Bat, x: number, y: number, side: number, k: number) => {
      const z0 = side * ZW, inn = -side;
      const elbow = V3(x + 0.15 * inn, y - 0.05, z0 + inn * 0.28), hand = V3(x + 0.05 * inn, y - 0.1, z0 + inn * 0.45);
      bb.cyl(dark, 0.05, 0.05, 0.05, 12, TRS(x, y, z0 + inn * 0.02, 0, Math.PI / 2));
      bb.rod(grey, V3(x, y, z0), elbow, 0.022); bb.rod(grey, elbow, hand, 0.02);
      bb.cyl(dark, 0.03, 0.03, 0.05, 10, TRS(elbow.x, elbow.y, elbow.z));
      const M = TRS(hand.x, hand.y, hand.z, (side < 0 ? 0 : Math.PI) + 0.15 * (k ? -1 : 1));
      bb.box(lapBody, -0.2, -0.015, -0.14, 0.2, 0.0, 0.14, M);
      const lid = M.clone().multiply(TRS(0, 0, -0.14, 0, -0.3));
      bb.box(lapBody, -0.2, 0, -0.012, 0.2, 0.27, 0.0, lid);
      bb.add(new THREE.PlaneGeometry(0.36, 0.23).translate(0, 0.135, 0.004), imat(S, { map: screenTex(`buScr${k}`, k % 2), emap: true, em: [1.25, 1.3, 1.4] }), lid);
      bb.box(lapKeys, -0.17, 0.0, -0.08, 0.17, 0.004, 0.1, M);
    };
    laptop(b, -2.6, 1.55, -1, 0); laptop(b, 3.0, 1.5, -1, 1); laptop(bz, -1.4, 1.5, 1, 2);
    // ---- cables: loose floating loops along the corners ----
    const cabMats = [imat(S, { col: "#1e2024" }), imat(S, { col: "#e06a25" }), imat(S, { col: "#59616b" }), imat(S, { col: "#2f6fb8" })];
    const r = rng(77);
    const cableRun = (bb: Bat, zSide: number, yc: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const xa = X0 + 0.6 + r() * (X1 - X0 - 2), xb = xa + 0.9 + r() * 1.4, sag = 0.12 + r() * 0.15, rad = 0.011 + 0.006 * r();
        if (Math.abs(xa - WIN.x) < 0.9 || Math.abs(xb - WIN.x) < 0.9 || (xa < WIN.x && xb > WIN.x && zSide < 0)) continue;
        const zc = zSide * (ZW - 0.12), sy = -Math.sign(yc - 1.15);
        const pts = [V3(xa, yc, zc), V3(xa + (xb - xa) * 0.3, yc + sy * sag, zc - zSide * sag * 0.8), V3(xa + (xb - xa) * 0.7, yc + sy * sag * 0.8, zc - zSide * sag), V3(xb, yc, zc)];
        bb.tube(cabMats[i % 4], pts, rad);
      }
    };
    cableRun(b, -1, 2.0, 7); cableRun(b, -1, 0.3, 5); cableRun(bz, 1, 2.0, 5);
    // ---- stowage bags strapped to the walls (rounded) ----
    const bagMats = [imat(S, { col: "#f1ece0" }), imat(S, { col: "#cdd6e0" }), imat(S, { col: "#e6dcc4" })];
    const strap = imat(S, { col: "#38507a" });
    const bag = (bb: Bat, x: number, y: number, zFace: number, w: number, h: number, d: number, k: number) => {
      const zc = zFace - Math.sign(zFace) * (d / 2 + 0.005);
      bb.rbox(bagMats[k % 3], w, h, d, 0.05, TRS(x, y, zc, 0, 0, k % 2 ? 0.04 : -0.03));
      for (const sx of [-w * 0.28, w * 0.28]) bb.box(strap, x + sx - 0.025, y - h / 2 - 0.02, zc - d / 2 - 0.01, x + sx + 0.025, y + h / 2 + 0.02, zc + d / 2 + 0.01);
    };
    bag(b, -4.0, 0.75, -ZW, 0.55, 0.42, 0.28, 0); bag(b, -3.55, 1.25, -ZW, 0.45, 0.36, 0.24, 1); bag(b, 4.3, 0.8, -ZW, 0.6, 0.45, 0.3, 2);
    bag(b, -0.9, 0.62, -ZW, 0.5, 0.36, 0.22, 1);
    bag(bz, -3.4, 0.9, ZW, 0.55, 0.45, 0.3, 2); bag(bz, 3.9, 1.0, ZW, 0.5, 0.4, 0.26, 0);
    bc.rbox(bagMats[0], 0.6, 0.22, 0.5, 0.05, TRS(-3.0, YC - 0.115, -0.1)); bc.rbox(bagMats[1], 0.5, 0.2, 0.45, 0.05, TRS(1.9, YC - 0.105, 0.2));
    // ---- a crew work site: checklist on a bungee, extinguisher + PBA by the push wall
    b.rod(dark, V3(-4.8, 1.1, -ZW + 0.02), V3(-3.0, 1.1, -ZW + 0.02), 0.007, 6);
    b.add(new THREE.PlaneGeometry(0.2, 0.27), imat(S, { map: checklistTex() }), TRS(-4.3, 1.14, -ZW + 0.03));
    b.cyl(imat(S, { col: "#c9302a", spec: 50, specK: 0.6 }), 0.07, 0.07, 0.42, 16, TRS(-5.1, 0.62, -ZW + 0.12));
    b.cyl(dark, 0.025, 0.025, 0.08, 10, TRS(-5.1, 0.87, -ZW + 0.12));
    b.rbox(imat(S, { col: "#f08a24" }), 0.24, 0.32, 0.14, 0.04, TRS(-5.15, 1.6, -ZW + 0.08));
    b.build(R); bz.build(this.posZ); bc.build(this.ceil);
    // ---- floating items (bobbing, deterministic) ----
    const pen = new THREE.Group();
    { const bb = new Bat(); bb.cyl(imat(S, { col: "#2f6fd0", spec: 40, specK: 0.5 }), 0.008, 0.008, 0.14, 10, TRS(0, 0, 0, 0, 0, Math.PI / 2)); bb.cyl(dark, 0.008, 0.002, 0.02, 10, TRS(0.08, 0, 0, 0, 0, -Math.PI / 2)); bb.build(pen); }
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.27, 0.004), imat(S, { map: checklistTex() }));
    const pouch = new THREE.Group();
    { const bb = new Bat(); bb.rbox(imat(S, { col: "#c8b48a" }), 0.12, 0.16, 0.04, 0.015, TRS(0, 0, 0)); bb.box(imat(S, { col: "#d24a2a" }), -0.061, 0.02, -0.021, 0.061, 0.05, 0.021); bb.build(pouch); }
    const wrench = new THREE.Group();
    { const bb = new Bat(); bb.box(grey, -0.09, -0.008, -0.004, 0.09, 0.008, 0.004); bb.cyl(grey, 0.022, 0.022, 0.008, 6, TRS(0.1, 0, 0, 0, Math.PI / 2)); bb.build(wrench); }
    for (const [m, p, ph] of [[pen, V3(-1.7, 1.75, -0.55), 0.3], [card, V3(2.55, 1.85, -0.6), 1.7], [pouch, V3(-3.6, 0.6, -0.5), 3.1], [wrench, V3(0.9, 2.0, 0.45), 4.2]] as [THREE.Object3D, THREE.Vector3, number][]) {
      R.add(m); this.floaters.push({ m, p, ph });
    }
    // ---- shaft + flood + motes ----
    this.shaft = new Shaft(R, WIN.r * 0.97, 0.3);
    this.flood = new Shaft(R, WIN.r * 1.6, 0.1);
    this.motes = new Motes(R, S, 900, 19, [-5.2, 0.1, -1.0, 3.5, 2.2, 1.0]);
    R.traverse((o) => { o.frustumCulled = false; });
  }

  update(id: number, t: number, cam: THREE.Camera) {
    const S = this.S, sh = SHOTS[id - 1];
    // the sunrise swells in over the first 2 s of shot 8 (the light changes as the story turns)
    const gold = sh.look === "sunrise" ? 0.35 + 0.65 * smooth((t - sh.a / FPS + 0.2) / 2.2) : 0;
    const lerp = (a: number, b: number) => a + (b - a) * gold;
    const L3 = (a: C3, b: C3): C3 => [lerp(a[0], b[0]), lerp(a[1], b[1]), lerp(a[2], b[2])];
    const O = this.root.position, W2 = (p: THREE.Vector3) => p.clone().add(O);
    // sun direction (toward the sun, local): station = cool, low, raking toward -x; sunrise = lower, longer, golden
    const sd = V3(lerp(0.78, 0.9), lerp(0.42, 0.22), lerp(-0.46, -0.38)).normalize();
    const sunC = L3([2.3, 2.35, 2.45], [5.2, 3.0, 1.25]);
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...sunC);
    (S.u.uWC.value as THREE.Vector3).set(WIN.x, WIN.y, -ZW).add(O); (S.u.uWN.value as THREE.Vector3).set(0, 0, 1); S.u.uWR.value = WIN.r;
    const wc = V3(WIN.x, WIN.y, -ZW), dn = sd.clone().negate();
    const tDeck = WIN.y / -dn.y, patch = wc.clone().addScaledVector(dn, tDeck);
    const led = lerp(1, 0.3);
    const ledC: C3 = [0.9 * led, 0.92 * led, 0.97 * led];
    const Ls: LDef[] = [];
    for (const x of [-4.4, -1.8, 0.8, 3.4]) for (const s of [-1, 1]) Ls.push({ p: W2(V3(x, YC - 0.3, s * 0.75)), c: ledC, r: 1.9 });
    Ls.push({ p: W2(V3(WIN.x, WIN.y, -ZW + 0.5)), c: L3([0.22, 0.34, 0.6], [1.5, 0.85, 0.35]), r: lerp(1.6, 3.2) }); // earthshine / sunrise glow
    Ls.push({ p: W2(V3(patch.x, 0.35, Math.min(patch.z, 0.7))), c: L3([0.5, 0.48, 0.44], [1.5, 0.85, 0.4]), r: lerp(1.3, 2.4) }); // bounce from the sun pool
    Ls.push({ p: W2(V3(X1 + 1.0, 1.2, 0)), c: [0.35, 0.42, 0.5], r: 1.8 }); // next module
    Ls.push({ p: W2(V3(-4.8, 1.3, 0.3)), c: L3([0.15, 0.17, 0.22], [0.75, 0.42, 0.22]), r: 2.2 }); // push-wall fill
    setLights(S, Ls, L3([0.19, 0.205, 0.25], [0.32, 0.22, 0.17]), L3([0.1, 0.105, 0.135], [0.17, 0.12, 0.1]));
    (this.ledMat.uniforms.uEm.value as THREE.Vector3).set(2.4 * led, 2.5 * led, 2.6 * led);
    // window view
    const E = this.earth.uniforms;
    (E.uED.value as THREE.Vector3).set(0.1, -0.85, -0.52).normalize();
    (E.uSV.value as THREE.Vector3).copy(viewSun(E.uED.value as THREE.Vector3, V3(1, 0, -0.3), lerp(0.42, 0.06)));
    (E.uSunC.value as THREE.Vector3).set(...L3([2.6, 2.55, 2.45], [3.6, 2.1, 1.0]));
    E.uT.value = t; E.uGold.value = gold; E.uK.value = 1;
    // shafts + motes
    const len = Math.min(tDeck + 0.2, 7);
    this.shaft.set(wc, dn, len, L3([0.75, 0.82, 0.95], [1.0, 0.62, 0.28]), lerp(0.22, 0.42), t);
    this.flood.set(wc, dn, len, [1.0, 0.6, 0.28], gold * 0.12, t);
    this.motes.mat.uniforms.uT.value = t; this.motes.mat.uniforms.uK.value = lerp(1.0, 1.4);
    for (const fl of this.floaters) {
      const ph = fl.ph;
      fl.m.position.set(fl.p.x + 0.05 * Math.sin(t * 0.37 + ph), fl.p.y + 0.06 * Math.sin(t * 0.53 + ph * 2), fl.p.z + 0.04 * Math.sin(t * 0.41 + ph * 3));
      fl.m.rotation.set(0.3 * Math.sin(t * 0.21 + ph) + ph, t * 0.18 + ph, 0.4 * Math.sin(t * 0.17 + ph * 1.7));
    }
    // cutaway: hide faces between the camera and the room
    const c = cam.position.clone().sub(O);
    this.posZ.visible = c.z < ZW - 0.12;
    this.ceil.visible = c.y < YC - 0.1;
    this.deck.visible = c.y > 0.1;
  }
}

// ============================================================ the 1985 MIDDECK
const MZ = -1.3, MX = 2.2, MY = 2.2, MZF = 7.0; // QA2: open side extended so the shot-6 wide never sees past the set
const HW = { x: -MX, y: 1.3, z: -0.2, r: 0.25 };
const lockerTex = () => ctex("buLockers", 1536, 1024, (g, r) => {
  const cw = 256, ch = 1024 / 7;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) {
    const x = i * cw, y = j * ch;
    const gr = g.createLinearGradient(x, y, x, y + ch); gr.addColorStop(0, "#efeeea"); gr.addColorStop(1, "#cfcfca");
    g.fillStyle = gr; g.fillRect(x, y, cw, ch); noise(g, x, y, cw, ch, r, 400, 0.04);
    g.strokeStyle = "#5c5d5a"; g.lineWidth = 6; g.strokeRect(x + 3, y + 3, cw - 6, ch - 6);
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2; g.strokeRect(x + 10, y + 10, cw - 20, ch - 20);
    txt(g, `M${pick(r, ["F", "A"])}${14 + i * 7 + j}${"ABCDEFGHJK"[(i * 3 + j) % 10]}`, x + cw / 2, y + 26, 22, "#24324f", "center", "monospace");
    if (r() < 0.5) velcro(g, x + 30 + r() * 150, y + 56 + r() * 40, 40, 24, r);
    if (r() < 0.35) label(g, pick(r, ["FOOD", "FOOD", "CAMERA", "FILM", "CLOTHES", "TOOLS", "MEDS", "TAPES", "SNACKS"]), x + cw / 2 + (r() - 0.5) * 60, y + ch - 30, 100, 22, "#fffbe6");
  }
});
const floorTex = () => repeatTex(ctex("buMdFloor", 512, 512, (g, r) => {
  g.fillStyle = "#9a9da1"; g.fillRect(0, 0, 512, 512); noise(g, 0, 0, 512, 512, r, 3000, 0.06);
  g.strokeStyle = "#4b4e52"; g.lineWidth = 6; g.strokeRect(3, 3, 506, 506);
  g.fillStyle = "#5b5e62"; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.beginPath(); g.arc(32 + i * 64, 32 + j * 64, 4, 0, 7); g.fill(); }
}));
const checklist85 = () => ctex("buCk85", 256, 350, (g, r) => {
  g.fillStyle = "#f6efd2"; g.fillRect(0, 0, 256, 350); g.fillStyle = "#b8322a"; g.fillRect(0, 0, 256, 40);
  txt(g, "MIDDECK", 128, 21, 24, "#fff8e0", "center", "monospace");
  for (let k = 0; k < 10; k++) { g.fillStyle = "#555"; g.fillRect(20, 58 + k * 28, 100 + r() * 110, 6); }
  g.fillStyle = "rgba(230,220,170,0.8)"; g.fillRect(90, 0, 80, 16);
});
const metTex = () => ctex("buMET", 512, 96, (g) => { g.fillStyle = "#120806"; g.fillRect(0, 0, 512, 96); txt(g, "MET 02:14:37", 256, 50, 58, "#ff9a3a", "center", "monospace"); });
const patchTex = () => ctex("buPatch", 256, 256, (g) => {
  g.fillStyle = "#e9c445"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#1c2f6e"; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill();
  g.fillStyle = "#3a7bd5"; g.beginPath(); g.arc(128, 220, 90, Math.PI, 0); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(70, 150); g.lineTo(170, 96); g.lineTo(190, 106); g.lineTo(90, 160); g.fill();
  for (let k = 0; k < 9; k++) g.fillRect(50 + k * 18, 56 + (k % 3) * 12, 4, 4);
  txt(g, "STS", 128, 206, 30, "#e9c445");
});
class Middeck {
  root = new THREE.Group();
  S = lset();
  sideNeg = new THREE.Group(); sidePos = new THREE.Group(); ceil = new THREE.Group();
  earth: THREE.ShaderMaterial; tubeMat: THREE.ShaderMaterial;
  shaft: Shaft; motes: Motes; pencil = new THREE.Group();
  constructor() {
    const R = this.root, S = this.S;
    R.position.set(...MIDDECK);
    R.add(this.sideNeg, this.sidePos, this.ceil);
    const b = new Bat(), bn = new Bat(), bp = new Bat(), bc = new Bat();
    const wall = imat(S, { col: "#cfc8b6" }), floor = imat(S, { col: "#ffffff", map: floorTex() }), dark = imat(S, { col: "#2e3034" });
    const frame = imat(S, { col: "#9a9c9c" }), metal = imat(S, { col: "#b8bcc0", spec: 40, specK: 0.4 });
    // shell
    b.add(uvFrom(quad(V3(-MX, 0, MZF), V3(MX, 0, MZF), V3(MX, 0, MZ), V3(-MX, 0, MZ)), (p) => [p.x / 0.9, p.z / 0.9]), floor);
    b.add(quad(V3(-MX, 0, MZ), V3(MX, 0, MZ), V3(MX, MY, MZ), V3(-MX, MY, MZ)), wall);
    { // ceiling with the ladder hole (x -1.9..-1.15, z -1.22..-0.45)
      const sh = new THREE.Shape(); sh.moveTo(-MX, MZ); sh.lineTo(MX, MZ); sh.lineTo(MX, MZF); sh.lineTo(-MX, MZF); sh.lineTo(-MX, MZ);
      const h = new THREE.Path(); h.moveTo(-1.9, -1.22); h.lineTo(-1.9, -0.45); h.lineTo(-1.15, -0.45); h.lineTo(-1.15, -1.22); h.lineTo(-1.9, -1.22); sh.holes.push(h);
      const g = new THREE.ShapeGeometry(sh); g.rotateX(Math.PI / 2); g.translate(0, MY, 0);
      bc.add(g, imat(S, { col: "#c4beac" }));
      const up = imat(S, { col: "#8f8a80" });
      bc.box(up, -1.95, MY, -1.27, -1.9, MY + 1.0, -0.4); bc.box(up, -1.15, MY, -1.27, -1.1, MY + 1.0, -0.4);
      bc.box(up, -1.9, MY, -1.27, -1.15, MY + 1.0, -1.22); bc.box(up, -1.9, MY, -0.45, -1.15, MY + 1.0, -0.4);
      bc.box(imat(S, { col: "#4a4d52" }), -1.95, MY + 1.0, -1.27, -1.1, MY + 1.04, -0.4);
      const tube = imat(S, { col: "#ffffff", em: [2.3, 2.35, 2.2] }); this.tubeMat = tube;
      for (const x of [-0.4, 1.2]) { bc.box(frame, x - 0.5, MY - 0.04, -0.2, x + 0.5, MY - 0.005, 0.2); bc.box(tube, x - 0.45, MY - 0.06, -0.12, x + 0.45, MY - 0.04, 0.12); }
    }
    { // -x wall with the side hatch (round) + small window
      const sh = new THREE.Shape(); sh.moveTo(MZ, 0); sh.lineTo(MZF, 0); sh.lineTo(MZF, MY); sh.lineTo(MZ, MY); sh.lineTo(MZ, 0);
      const h = new THREE.Path(); h.absarc(HW.z, HW.y, HW.r, 0, Math.PI * 2, true); sh.holes.push(h);
      const g = new THREE.ShapeGeometry(sh, 40); g.rotateY(-Math.PI / 2); g.translate(-MX, 0, 0);
      bn.add(g, wall);
      const door = ringGeo(HW.r, 0.5, 0.06); door.rotateY(Math.PI / 2); bn.add(door, imat(S, { col: "#dcdcd6" }), TRS(-MX, HW.y, HW.z));
      const rim = ringGeo(0.5, 0.6, 0.04); rim.rotateY(Math.PI / 2); bn.add(rim, frame, TRS(-MX, HW.y, HW.z));
      const tun = new THREE.CylinderGeometry(HW.r, HW.r, 0.25, 40, 1, true); tun.rotateZ(Math.PI / 2); bn.add(tun, imat(S, { col: "#7c8086" }), TRS(-MX - 0.125, HW.y, HW.z));
      bn.rod(metal, V3(-MX + 0.1, HW.y - 0.35, HW.z + 0.3), V3(-MX + 0.1, HW.y - 0.35, HW.z - 0.3), 0.02);
      for (const dz of [0.3, -0.3]) bn.rod(metal, V3(-MX + 0.04, HW.y - 0.35, HW.z + dz), V3(-MX + 0.1, HW.y - 0.35, HW.z + dz), 0.02);
      this.earth = earthMat();
      const card = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.earth); card.rotation.y = Math.PI / 2;
      card.position.set(-MX - 0.4, HW.y, HW.z); card.layers.set(NOINK); this.sideNeg.add(card);
    }
    bp.add(quad(V3(MX, 0, MZF), V3(MX, 0, MZ), V3(MX, MY, MZ), V3(MX, MY, MZF)), wall);
    // ---- the locker wall (6 x 7 doors), proud of the back wall ----
    const lmat = imat(S, { col: "#ffffff", map: lockerTex() });
    const LX0 = -1.95, LW = 0.45, LY0 = 0.2, LH = 0.257;
    b.box(imat(S, { col: "#6d6f6e" }), LX0 - 0.03, LY0 - 0.03, MZ, LX0 + 6 * LW + 0.03, LY0 + 7 * LH + 0.03, MZ + 0.03);
    const latch = imat(S, { col: "#1f2124", spec: 50, specK: 0.5 });
    for (let i = 0; i < 6; i++) for (let j = 0; j < 7; j++) {
      const x = LX0 + i * LW, y = LY0 + (6 - j) * LH;
      const g = new THREE.BoxGeometry(LW - 0.012, LH - 0.012, 0.03);
      const uv = g.getAttribute("uv") as THREE.BufferAttribute;
      for (let v = 0; v < 24; v++) {
        if (v >= 16 && v < 20) uv.setXY(v, (i + uv.getX(v)) / 6, 1 - (j + 1 - uv.getY(v)) / 7);
        else uv.setXY(v, (i + 0.5) / 6, 1 - (j + 0.9) / 7);
      }
      g.translate(x + LW / 2, y + LH / 2, MZ + 0.045);
      b.add(g, lmat);
      for (const s of [-1, 1]) b.box(latch, x + LW / 2 + s * 0.15 - 0.025, y + LH / 2 - 0.035, MZ + 0.06, x + LW / 2 + s * 0.15 + 0.025, y + LH / 2 + 0.005, MZ + 0.078);
    }
    // bungee cords across a few lockers + a food tray velcroed on
    const bung = imat(S, { col: "#20232a" });
    for (const y of [1.05, 1.62]) b.rod(bung, V3(-1.9, y, MZ + 0.09), V3(0.7, y, MZ + 0.09), 0.008, 6);
    b.rbox(imat(S, { col: "#d8cfb0" }), 0.34, 0.24, 0.035, 0.012, TRS(0.38, 1.36, MZ + 0.11));
    const foods = ["#c24a2a", "#e0a63a", "#7a9a3a", "#a05a2a", "#d07a3a", "#8a6a3a"].map((c) => imat(S, { col: c }));
    for (let k = 0; k < 6; k++) b.cyl(foods[k], 0.04, 0.04, 0.025, 14, TRS(0.27 + (k % 3) * 0.11, 1.31 + Math.floor(k / 3) * 0.1, MZ + 0.14, 0, Math.PI / 2));
    b.add(new THREE.PlaneGeometry(0.22, 0.3), imat(S, { map: checklist85() }), TRS(-0.55, 1.62, MZ + 0.096, 0, 0, 0.05));
    b.box(dark, -0.65, 2.03, MZ, -0.05, 2.15, MZ + 0.06);
    b.add(new THREE.PlaneGeometry(0.54, 0.09), imat(S, { map: metTex(), emap: true, em: [1.6, 1.2, 0.8] }), TRS(-0.35, 2.09, MZ + 0.065));
    // ---- the sleep bag on the back wall (right of the lockers) ----
    const sbag = imat(S, { col: "#4c7aa6" }), sbag2 = imat(S, { col: "#35587c" });
    b.rbox(sbag, 0.85, 1.65, 0.16, 0.07, TRS(1.45, 1.13, MZ + 0.09, 0, 0, 0.015));
    for (const y of [0.55, 1.05, 1.55]) b.box(sbag2, 1.0, y - 0.03, MZ + 0.08, 1.9, y + 0.03, MZ + 0.185);
    b.rbox(imat(S, { col: "#e9e4d4" }), 0.5, 0.26, 0.1, 0.05, TRS(1.45, 1.78, MZ + 0.2));
    b.rod(imat(S, { col: "#c6402c" }), V3(1.12, 1.2, MZ + 0.18), V3(1.12, 0.45, MZ + 0.18), 0.01, 6);
    // ---- the ladder through the ceiling hole ----
    for (const x of [-1.75, -1.3]) b.rod(metal, V3(x, 1.0, -0.85), V3(x, MY + 0.9, -0.85), 0.022);
    for (let k = 0; k < 7; k++) b.rod(metal, V3(-1.75, 1.15 + k * 0.28, -0.85), V3(-1.3, 1.15 + k * 0.28, -0.85), 0.016);
    // ---- 80s camera on a bracket (upper right) ----
    {
      const M = TRS(1.75, 1.95, -0.85, -0.6, 0.25);
      b.rod(metal, V3(MX, 1.95, -0.85), V3(1.8, 1.95, -0.85), 0.02);
      b.box(dark, -0.11, -0.08, -0.09, 0.11, 0.08, 0.09, M);
      b.box(metal, -0.11, 0.08, -0.06, 0.11, 0.1, 0.06, M);
      b.cyl(imat(S, { col: "#141518", spec: 60, specK: 0.8 }), 0.055, 0.06, 0.12, 18, M.clone().multiply(TRS(0, 0, 0.15, 0, Math.PI / 2)));
      b.cyl(metal, 0.062, 0.062, 0.02, 18, M.clone().multiply(TRS(0, 0, 0.1, 0, Math.PI / 2)));
    }
    // ---- floor foot loops, a mission patch, hoses ----
    const loop = imat(S, { col: "#4b5a78" });
    for (const x of [-1.2, -0.6, 0.6, 1.2]) { b.box(loop, x - 0.12, 0.004, -0.1, x + 0.12, 0.02, -0.06); b.box(loop, x - 0.12, 0.004, 0.06, x + 0.12, 0.02, 0.1); }
    b.cyl(imat(S, { map: patchTex() }), 0.17, 0.17, 0.01, 32, TRS(0.95, 2.02, MZ + 0.006, 0, Math.PI / 2));
    b.tube(imat(S, { col: "#2f3236" }), [V3(-2.1, 0.12, MZ + 0.05), V3(-1.2, 0.08, MZ + 0.12), V3(0.2, 0.14, MZ + 0.08), V3(1.0, 0.1, MZ + 0.1)], 0.02);
    b.tube(imat(S, { col: "#7a8b4a" }), [V3(1.95, 0.05, MZ + 0.1), V3(2.05, 0.6, MZ + 0.25), V3(2.1, 1.0, MZ + 0.12)], 0.025);
    b.build(R); bn.build(this.sideNeg); bp.build(this.sidePos); bc.build(this.ceil);
    { const pb = new Bat(); pb.cyl(imat(S, { col: "#f0c22a" }), 0.007, 0.007, 0.16, 6, TRS(0, 0, 0, 0, 0, Math.PI / 2)); pb.cyl(imat(S, { col: "#e88888" }), 0.007, 0.007, 0.02, 6, TRS(-0.09, 0, 0, 0, 0, Math.PI / 2)); pb.build(this.pencil); R.add(this.pencil); }
    this.shaft = new Shaft(R, HW.r * 0.97, 0.3);
    this.motes = new Motes(R, S, 600, 29, [-2.1, 0.2, -1.2, 1.5, 2.1, 1.0]);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const S = this.S, s = SHOTS[id - 1];
    const gk = s.place === "middeck" ? smooth((f - 998) / 18) : 0; // the peak turns the room sickly green (QA2: same 998..1016 ramp as world.ts, lands on "Wet.")
    const L3 = (a: C3, b: C3): C3 => [a[0] + (b[0] - a[0]) * gk, a[1] + (b[1] - a[1]) * gk, a[2] + (b[2] - a[2]) * gk];
    const O = this.root.position, W2 = (p: THREE.Vector3) => p.clone().add(O);
    const sd = V3(-0.86, 0.26, 0.44).normalize();
    (S.u.uSD.value as THREE.Vector3).copy(sd); (S.u.uSC.value as THREE.Vector3).set(...L3([3.2, 2.85, 2.3], [2.4, 3.0, 1.0]));
    (S.u.uWC.value as THREE.Vector3).set(HW.x, HW.y, HW.z).add(O); (S.u.uWN.value as THREE.Vector3).set(1, 0, 0); S.u.uWR.value = HW.r;
    const tube = L3([0.95, 0.97, 0.9], [0.65, 0.95, 0.4]);
    const wc = V3(HW.x, HW.y, HW.z), dn = sd.clone().negate(), tBack = (MZ + 0.05 - HW.z) / dn.z, hitP = wc.clone().addScaledVector(dn, tBack);
    setLights(S, [
      { p: W2(V3(-0.4, MY - 0.25, 0)), c: tube, r: 1.9 }, { p: W2(V3(1.2, MY - 0.25, 0)), c: tube, r: 1.9 },
      { p: W2(V3(-1.5, MY + 0.6, -0.85)), c: L3([0.9, 0.7, 0.45], [0.6, 0.8, 0.3]), r: 1.2 }, // flight deck glow above the ladder
      { p: W2(V3(hitP.x, hitP.y, MZ + 0.4)), c: L3([0.5, 0.45, 0.36], [0.4, 0.5, 0.2]), r: 1.4 }, // bounce from the sun pool
      { p: W2(V3(0, 1.2, 1.8)), c: L3([0.32, 0.36, 0.45], [0.25, 0.4, 0.15]), r: 2.6 }, // fill from the open side
    ], L3([0.17, 0.19, 0.25], [0.15, 0.24, 0.08]), L3([0.1, 0.11, 0.15], [0.09, 0.14, 0.05]));
    (this.tubeMat.uniforms.uEm.value as THREE.Vector3).set(...L3([2.3, 2.35, 2.2], [1.7, 2.5, 1.0]));
    const E = this.earth.uniforms;
    (E.uED.value as THREE.Vector3).set(-0.5, -0.85, 0.1).normalize(); (E.uSV.value as THREE.Vector3).copy(viewSun(E.uED.value as THREE.Vector3, V3(0.2, 0, 1), 0.4));
    (E.uSunC.value as THREE.Vector3).set(2.6, 2.5, 2.3); E.uT.value = t; E.uGold.value = 0; E.uK.value = 1;
    this.shaft.set(wc, dn, tBack + 0.1, L3([1.0, 0.92, 0.76], [0.75, 1.0, 0.35]), 0.3, t);
    this.motes.mat.uniforms.uT.value = t;
    this.pencil.position.set(1.65 + 0.05 * Math.sin(t * 0.4), 1.75 + 0.06 * Math.sin(t * 0.55 + 1), 0.2 + 0.04 * Math.sin(t * 0.33));
    this.pencil.rotation.set(0.4, t * 0.25, 0.3 * Math.sin(t * 0.2));
    const c = cam.position.clone().sub(O);
    this.sideNeg.visible = c.x > -MX + 0.1; this.sidePos.visible = c.x < MX - 0.1; this.ceil.visible = c.y < MY - 0.1;
  }
}

// ============================================================ public class
export class Interiors {
  root = new THREE.Group();
  private station = new Station();
  private middeck = new Middeck();
  constructor() { this.root.add(this.station.root, this.middeck.root); }
  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const place = SHOTS[id - 1].place;
    this.station.root.visible = place === "station";
    this.middeck.root.visible = place === "middeck";
    if (this.station.root.visible) this.station.update(id, t, cam);
    if (this.middeck.root.visible) this.middeck.update(id, t, f, cam);
  }
}
