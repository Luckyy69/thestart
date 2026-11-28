// OWNER: belly. Kit for belly.ts: helpers, the organic material patch (two-tone + 4 fake point lights + the squeeze
// glow + echo rings + juice caustics), canvas textures, and the food / crew-corner prop builders (unit: metres, giant
// BELLY scale: a crew member is ~1.2 m tall).
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { ctex } from "../bridge/paint";
import { V3, smooth, clamp01 } from "./story";

export const TAU = Math.PI * 2;
export const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export const h1 = (n: number) => hash(n, n * 0.37 + 1.3);
export const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** damped spring step response (0 -> 1 with overshoot), zero start velocity */
export const spr = (tau: number, z = 5.5, w = 13) => (tau <= 0 ? 0 : 1 - Math.exp(-z * tau) * (Math.cos(w * tau) + (z / w) * Math.sin(w * tau)));
/** damped wobble impulse (0 at tau 0, decays) */
export const wob = (tau: number, z = 4, w = 14) => (tau <= 0 ? 0 : Math.exp(-z * tau) * Math.sin(w * tau));
export const C = (h: string) => new THREE.Color(h);
export const catmull3 = (P: V3[], step: number): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) / step));
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), f(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  out.push(P[P.length - 1].slice() as V3);
  return out;
};
export { smooth, clamp01 };

// ============================== shader patch ==============================
/** shared uniforms (WORLD coordinates) */
export const BU = {
  uT: { value: 0 },
  uSq: { value: new THREE.Vector3(-99, 0, 1) },        // x, strength, glow gain
  uEc: { value: new THREE.Vector4(0, -99, 0, 0) },     // echo centre xyz, strength
  uEcR: { value: new THREE.Vector4(-9, -9, -9, -9) },  // echo ring radii
  uPool: { value: new THREE.Vector4(0, 0, 0, 1) },     // pool centre xyz, caustic gain
  uPLp: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  uPLc: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  uPLr: { value: [1, 1, 1, 1] },
};
export const GLSL_NOISE = `
float bH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 bH2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float bN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(bH(i), bH(i + vec2(1.0, 0.0)), u.x), mix(bH(i + vec2(0.0, 1.0)), bH(i + vec2(1.0, 1.0)), u.x), u.y); }
float bFbm(vec2 p) { return 0.55 * bN(p) + 0.3 * bN(p * 2.1 + 3.1) + 0.15 * bN(p * 4.3 + 7.7); }
/** animated voronoi edge network (caustics): 1 on the cell borders */
float bCaus(vec2 q, float t) {
  vec2 ip = floor(q), fp = fract(q); float d1 = 8.0, d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int k = -1; k <= 1; k++) {
    vec2 o = vec2(float(j), float(k)); vec2 h = bH2(ip + o);
    vec2 r = o + 0.5 + 0.42 * sin(t * (0.6 + 0.5 * h) + 6.2831 * h) - fp; float dd = dot(r, r);
    if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) { d2 = dd; }
  }
  float e = sqrt(d2) - sqrt(d1);
  return 1.0 - smoothstep(0.02, 0.16, e);
}
`;
const GLSL_COMMON = `
varying vec3 vMW;
uniform float uT; uniform vec3 uSq; uniform vec4 uEc; uniform vec4 uEcR; uniform vec4 uPool;
uniform vec3 uPLp[4]; uniform vec3 uPLc[4]; uniform float uPLr[4];
` + GLSL_NOISE;

export type Kind = "shell" | "plain" | "food" | "wood" | "glow";
export type BO = { spec?: number; shin?: number; rim?: [number, number, number]; vc?: boolean; color?: string; emissive?: THREE.Color; flat?: boolean; side?: THREE.Side; map?: THREE.Texture; caus?: number };
const MATS = new Map<string, THREE.MeshPhongMaterial>();
/** two-tone Phong + the cavern's fake lights (juice pool from below, oesophagus spill, squeeze glow, echo/alarm) */
export const bmat = (kind: Kind, o: BO = {}) => {
  const key = kind + JSON.stringify({ ...o, map: o.map ? o.map.uuid : 0, emissive: o.emissive ? o.emissive.getHexString() : 0 });
  const hit = MATS.get(key);
  if (hit) return hit;
  const spec = o.spec ?? 0.3, shin = o.shin ?? 40, rim = o.rim ?? [0.34, 0.14, 0.12], caus = o.caus ?? (kind === "shell" ? 1 : 0.6);
  const m = new THREE.MeshPhongMaterial({
    color: o.color ?? "#ffffff", vertexColors: o.vc ?? false, specular: new THREE.Color(spec, spec * 0.92, spec * 0.88), shininess: shin,
    emissive: o.emissive ?? new THREE.Color(0, 0, 0), flatShading: o.flat ?? false, side: o.side ?? THREE.FrontSide, map: o.map ?? null,
  });
  twoTone(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    Object.assign(sh.uniforms, BU);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vMW;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec4 mw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mw = instanceMatrix * mw;
        #endif
          vMW = (modelMatrix * mw).xyz; }`);
    let col = "";
    if (kind === "shell") col = `{
      float vv = abs(bFbm(vMW.xz * 0.32 + vec2(vMW.y * 0.45, 1.7)) - 0.5);
      float vw = fwidth(vv) + 0.004;
      float vein = 1.0 - smoothstep(0.006, 0.006 + vw * 1.5, vv);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.78, 0.42, 0.5), 0.5 * vein);
      float sq = uSq.y * exp(-pow((vMW.x - uSq.x) / 1.5, 2.0));
      float fib = 0.5 + 0.5 * sin(vMW.x * 7.0 + 0.8 * sin(vMW.y * 1.1 + vMW.z * 0.7));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.0, 0.55, 0.55) * (0.8 + 0.25 * fib), 0.55 * sq);
      vec2 sp = vMW.xz * 3.2; vec2 sh2 = bH2(floor(sp));
      float spot = (1.0 - smoothstep(0.12, 0.2, length(fract(sp) - 0.5 - 0.3 * (sh2 - 0.5)))) * step(0.72, sh2.x);
      diffuseColor.rgb *= 1.0 + 0.1 * spot * (1.0 - smoothstep(0.15, 0.4, fwidth(sp.x)));
    }`;
    if (kind === "wood") col = `{
      float g = sin((vMW.x * 0.6 + vMW.z * 0.6 + vMW.y * 3.0) * 9.0 + 3.0 * bN(vMW.xz * 1.3 + vMW.y));
      diffuseColor.rgb *= 0.9 + 0.1 * smoothstep(-0.2, 0.9, g);
    }`;
    let emit = "";
    if (kind === "shell") emit += `{
      float sq = uSq.y * exp(-pow((vMW.x - uSq.x) / 1.1, 2.0));
      float fib = 0.5 + 0.5 * sin(vMW.x * 7.0 + 0.8 * sin(vMW.y * 1.1 + vMW.z * 0.7));
      totalEmissiveRadiance += vec3(1.0, 0.36, 0.22) * sq * (0.25 + 0.4 * fib) * uSq.z;
      totalEmissiveRadiance += vec3(1.0, 0.72, 0.4) * sq * pow(fib, 6.0) * 0.35 * uSq.z;
    }\n`;
    if (kind === "shell" || kind === "food" || kind === "plain" || kind === "wood") emit += `{
      if (uEc.w > 0.001) {
        float d = length(vMW - uEc.xyz);
        float rr = exp(-pow((d - uEcR.x) / 0.32, 2.0)) + 0.8 * exp(-pow((d - uEcR.y) / 0.32, 2.0)) + 0.6 * exp(-pow((d - uEcR.z) / 0.32, 2.0)) + 0.45 * exp(-pow((d - uEcR.w) / 0.32, 2.0));
        totalEmissiveRadiance += vec3(1.0, 0.85, 0.55) * rr * uEc.w * ${kind === "shell" ? "0.9" : "0.35"};
      }
      vec3 pd = vMW - uPool.xyz; float pr = length(pd.xz * vec2(1.0, 1.25));
      float near = (1.0 - smoothstep(2.6, 6.5, pr)) * (1.0 - smoothstep(0.2, 3.6, pd.y));
      if (near > 0.001) {
        float c = bCaus(vMW.xz * 0.9 + vec2(vMW.y * 0.6, 0.0), uT * 1.3);
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.75, 1.15, 0.25) * c * near * uPool.w * ${(0.5 * caus).toFixed(3)};
      }
    }\n`;
    const lights = `
    {
      vec3 Nv = normalize(normal); vec3 Vv = normalize(vViewPosition); vec3 Pv = -vViewPosition;
      vec3 acc = vec3(0.0);
      for (int k = 0; k < 4; k++) {
        vec3 Lp = (viewMatrix * vec4(uPLp[k], 1.0)).xyz - Pv; float d = length(Lp); vec3 L = Lp / max(d, 1e-3);
        float a = 1.0 / (1.0 + d * d / (uPLr[k] * uPLr[k])); a *= a;
        float wr = max(dot(Nv, L) * 0.65 + 0.35, 0.0);
        float sp = pow(max(dot(Nv, normalize(L + Vv)), 0.0), ${shin.toFixed(1)}) * ${(spec * 2.4).toFixed(3)};
        acc += uPLc[k] * a * (diffuseColor.rgb * wr + sp);
      }
      float fr = pow(1.0 - saturate(dot(Nv, Vv)), 2.6);
      acc += vec3(${rim.map((v) => v.toFixed(3)).join(", ")}) * diffuseColor.rgb * 2.0 * fr;
      totalEmissiveRadiance += acc;
      ${emit}
    }`;
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\n" + GLSL_COMMON)
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + col)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + lights);
  };
  m.customProgramCacheKey = () => "grBelly2_" + key;
  MATS.set(key, m);
  return m;
};

// ============================== textures ==============================
export const softTex = () => ctex("grBellySoft", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
/** inked sound ring (cartoon): dark outline + warm white core */
export const ringTex = () => ctex("grBellyRing", 512, 512, (g) => {
  g.clearRect(0, 0, 512, 512);
  g.lineWidth = 34; g.strokeStyle = "rgba(255,200,120,0.28)"; g.beginPath(); g.arc(256, 256, 210, 0, TAU); g.stroke();
  g.lineWidth = 20; g.strokeStyle = "rgba(40,8,20,0.9)"; g.beginPath(); g.arc(256, 256, 210, 0, TAU); g.stroke();
  g.lineWidth = 10; g.strokeStyle = "rgba(255,246,220,1)"; g.beginPath(); g.arc(256, 256, 210, 0, TAU); g.stroke();
});
export const signTex = () => ctex("grBellySign", 1024, 320, (g) => {
  const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
  g.fillStyle = "#ffcf3a"; g.fillRect(0, 0, 1024, 320);
  // hazard stripes top + bottom
  for (const y0 of [0, 268]) {
    g.save(); g.beginPath(); g.rect(0, y0, 1024, 52); g.clip();
    for (let x = -80; x < 1100; x += 70) { g.fillStyle = "#1c1420"; g.beginPath(); g.moveTo(x, y0 + 52); g.lineTo(x + 35, y0 + 52); g.lineTo(x + 70, y0); g.lineTo(x + 35, y0); g.fill(); }
    g.restore();
  }
  g.fillStyle = "#1c1420"; g.font = `bold 104px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; // (qa1) was 118px: the C / W touched the frame edges
  g.fillText("CLEANING CREW", 512, 162, 900);
  g.lineWidth = 14; g.strokeStyle = "#1c1420"; g.strokeRect(7, 7, 1010, 306);
});
export const exitTex = () => ctex("grBellyExit", 512, 256, (g) => {
  const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
  g.fillStyle = "#18a84a"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#f4fff4"; g.lineWidth = 12; g.strokeRect(14, 14, 484, 228);
  g.fillStyle = "#f4fff4"; g.font = `bold 92px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("EXIT", 210, 104);
  g.font = `bold 34px ${FONT}`; g.fillText("TO INTESTINES", 256, 196);
  // arrow
  g.beginPath(); g.moveTo(352, 78); g.lineTo(420, 78); g.lineTo(420, 52); g.lineTo(474, 104); g.lineTo(420, 156); g.lineTo(420, 130); g.lineTo(352, 130); g.closePath(); g.fill();
});
export const clockFaceTex = () => ctex("grBellyClock", 256, 256, (g) => {
  g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(128, 128, 124, 0, TAU); g.fill();
  g.strokeStyle = "#1c1420"; g.lineCap = "round";
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU, r0 = k % 3 ? 100 : 88;
    g.lineWidth = k % 3 ? 6 : 11; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); g.stroke();
  }
});
export const juiceLabelTex = () => ctex("grBellyJuice", 512, 512, (g) => {
  const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
  g.fillStyle = "#ff9a1e"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#ffd23a"; g.fillRect(0, 330, 512, 182);
  g.fillStyle = "#ff7a10"; g.beginPath(); g.arc(256, 200, 104, 0, TAU); g.fill();
  g.strokeStyle = "#1c1420"; g.lineWidth = 10; g.stroke();
  g.fillStyle = "#3aa83a"; g.beginPath(); g.ellipse(296, 92, 46, 22, -0.5, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(222, 160, 26, 16, -0.6, 0, TAU); g.fill();
  g.fillStyle = "#1c1420"; g.font = `bold 92px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("JUICE", 256, 420);
});
export const hammockTex = () => ctex("grBellyHammock", 512, 256, (g) => {
  const cols = ["#3a8ee8", "#ffffff", "#ff6a4a", "#ffffff", "#ffcf3a", "#ffffff"];
  for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(0, i * (256 / 12), 512, 256 / 12 + 1); }
  g.globalAlpha = 0.12; g.fillStyle = "#000";
  for (let x = 0; x < 512; x += 8) g.fillRect(x, 0, 2, 256);
  g.globalAlpha = 1;
});

// ============================== geometry helpers ==============================
/** a tube through points with radius(u) and per-vertex colour(u, angle) */
export const tubeGeo = (pts: V3[], rad: (u: number) => number, na: number, col?: (u: number, a: number) => THREE.Color, closeEnds = false) => {
  const ns = pts.length - 1, P: number[] = [], Cc: number[] = [], idx: number[] = [];
  const T: THREE.Vector3[] = pts.map((_, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(ns, i + 1)]; return new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); });
  const N = new THREE.Vector3(0, 1, 0); if (Math.abs(T[0].y) > 0.9) N.set(1, 0, 0);
  N.addScaledVector(T[0], -N.dot(T[0])).normalize();
  const B = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i <= ns; i++) {
    const t = T[i];
    if (i) N.addScaledVector(t, -N.dot(t)).normalize();
    B.crossVectors(t, N);
    const u = i / ns, r = rad(u);
    for (let j = 0; j <= na; j++) {
      const a = (j / na) * TAU;
      q.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(B, Math.sin(a));
      P.push(pts[i][0] + q.x * r, pts[i][1] + q.y * r, pts[i][2] + q.z * r);
      const c = col ? col(u, a) : C("#ffffff"); Cc.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j, b = a + 1, c = a + na + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  if (closeEnds) {
    for (const [i, s] of [[0, -1], [ns, 1]] as [number, number][]) {
      const ci = P.length / 3; P.push(...pts[i]); const c = col ? col(i / ns, 0) : C("#ffffff"); Cc.push(c.r, c.g, c.b);
      for (let j = 0; j < na; j++) { const a = i * (na + 1) + j; if (s < 0) idx.push(ci, a, a + 1); else idx.push(ci, a + 1, a); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** sphere displaced by noise, with vertex colours */
export const blobGeo = (r: number, seg: number, bump: number, freq: number, seed: number, col: (p: THREE.Vector3, n: number) => THREE.Color, sy = 1) => {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7));
  const p = g.getAttribute("position") as THREE.BufferAttribute, cc = new Float32Array(p.count * 3), v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i), p.getZ(i));
    const n = vn(v.x * freq + seed, v.y * freq + v.z * freq * 0.7 + seed * 1.3) * 0.6 + vn(v.z * freq * 2 + seed, v.x * freq * 2 - v.y) * 0.4;
    const rr = r * (1 + bump * n);
    p.setXYZ(i, v.x * rr, v.y * rr * sy, v.z * rr);
    const c = col(v, n); cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cc, 3));
  g.computeVertexNormals();
  return g;
};
const lathe = (pts: [number, number][], seg = 48) => { const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(Math.max(0.001, x), y)), seg); g.computeVertexNormals(); return g; };
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; return o; };

// ============================== FOOD (giant scale; origin = bottom centre) ==============================
export type FoodKind = "burger" | "pizza" | "broc" | "spag" | "straw" | "box";
/** footprint radius + height per kind (for stacking) */
export const FOOD_DIM: Record<FoodKind, [number, number]> = { burger: [1.55, 2.2], pizza: [1.5, 0.45], broc: [1.2, 2.6], spag: [1.35, 1.25], straw: [1.2, 0.35], box: [0.8, 1.6] };
const FOOD_SPEC = { spec: 0.38, shin: 46, caus: 0.4 } as const;
export const burger = () => {
  const G = new THREE.Group();
  const bun = bmat("food", { color: "#f2a44a", ...FOOD_SPEC, rim: [0.36, 0.2, 0.08] });
  G.add(mesh(lathe([[0, 0], [1.25, 0], [1.42, 0.12], [1.45, 0.3], [1.38, 0.42], [0, 0.44]]), bun));
  G.add(mesh(lathe([[0, 0], [1.5, 0], [1.56, 0.1], [1.52, 0.3], [1.4, 0.38], [0, 0.4]]), bmat("food", { color: "#7a3e22", spec: 0.25, shin: 30, rim: [0.25, 0.12, 0.06] }), 0, 0.44, 0));
  { // lettuce: ruffled ring
    const g = new THREE.CircleGeometry(1.72, 72, 0, TAU); const p = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x); p.setZ(i, 0.14 * smooth((r - 1.2) / 0.5) * Math.sin(a * 13) - 0.08 * smooth((r - 1.3) / 0.4)); }
    g.rotateX(-Math.PI / 2); g.computeVertexNormals();
    G.add(mesh(g, bmat("food", { color: "#5cc63c", spec: 0.45, shin: 50, side: THREE.DoubleSide, rim: [0.2, 0.32, 0.08] }), 0, 0.86, 0));
  }
  { // cheese: drooping square
    const g = new THREE.BoxGeometry(2.7, 0.09, 2.7, 16, 1, 16); const p = g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); p.setY(i, p.getY(i) - 0.38 * smooth((r - 1.35) / 0.55)); }
    g.computeVertexNormals(); const m = mesh(g, bmat("food", { color: "#ffc21c", spec: 0.5, shin: 60, rim: [0.36, 0.26, 0.04] }), 0, 0.98, 0); m.rotation.y = 0.5; G.add(m);
  }
  for (const [x, z] of [[-0.55, 0.3], [0.6, -0.25]]) { const m = mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.14, 32), bmat("food", { color: "#ec3a2a", spec: 0.5, shin: 60, rim: [0.36, 0.1, 0.06] }), x, 1.1, z); G.add(m); }
  G.add(mesh(lathe([[0, 0], [1.48, 0], [1.52, 0.14], [1.42, 0.52], [1.1, 0.82], [0.6, 0.98], [0, 1.02]]), bun, 0, 1.18, 0));
  // sesame seeds
  const seed = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), bmat("food", { color: "#fff4d8", spec: 0.3, shin: 30 }), 16);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 0.55, 1.9);
  for (let i = 0; i < 16; i++) {
    const a = h1(i * 3 + 1) * TAU, r = 0.25 + 0.95 * Math.sqrt(h1(i * 5 + 2)), yy = 1.18 + 1.02 * Math.sqrt(Math.max(0, 1 - (r / 1.5) ** 2)) - 0.02;
    q.setFromEuler(new THREE.Euler(0.4 * (h1(i) - 0.5), a, 0)); m4.compose(new THREE.Vector3(Math.cos(a) * r, yy, Math.sin(a) * r), q, s); seed.setMatrixAt(i, m4);
  }
  seed.castShadow = true; seed.frustumCulled = false; G.add(seed);
  return G;
};
export const pizza = () => {
  const G = new THREE.Group();
  const L = 3.2, Wd = 2.7;
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(Wd / 2, L); sh.quadraticCurveTo(0, L + 0.35, -Wd / 2, L); sh.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, curveSegments: 20 });
  g.rotateX(Math.PI / 2); g.translate(0, 0.2, -L * 0.5); // lies flat: tip at -z, crust at +z; top at y ~0.25
  g.computeVertexNormals();
  G.add(mesh(g, bmat("food", { color: "#ffcc3a", spec: 0.55, shin: 60, rim: [0.36, 0.24, 0.05] })));
  const crust: V3[] = []; for (let k = 0; k <= 24; k++) { const u = k / 24, x = lerp(-Wd / 2, Wd / 2, u); crust.push([x * 1.02, 0.22, L * 0.5 + 0.35 * (1 - (2 * u - 1) ** 2) * 0.5 + 0.02]); }
  G.add(mesh(tubeGeo(crust, (u) => 0.26 * (0.75 + 0.25 * Math.sin(Math.PI * u)) + 0.02, 18, () => C("#e08a3a"), true), bmat("food", { vc: true, spec: 0.3, shin: 30, rim: [0.34, 0.18, 0.06] })));
  const pep = bmat("food", { color: "#d8282a", spec: 0.55, shin: 60, rim: [0.36, 0.08, 0.06] });
  for (const [x, z] of [[0, -0.55], [-0.45, 0.45], [0.48, 0.35], [-0.05, 1.05], [0.75, 1.1], [-0.72, 1.12]] as [number, number][]) G.add(mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.07, 24), pep, x, 0.29, z));
  // cheese drip at the tip
  G.add(mesh(new THREE.SphereGeometry(0.16, 16, 12).scale(1, 1.6, 1), bmat("food", { color: "#ffcc3a", spec: 0.55, shin: 60 }), 0, 0.05, -L * 0.5 + 0.25));
  return G;
};
export const broccoli = (seed: number) => {
  const G = new THREE.Group();
  const stem = bmat("food", { color: "#a6dc5c", spec: 0.3, shin: 34, rim: [0.22, 0.3, 0.08] });
  G.add(mesh(new THREE.CylinderGeometry(0.42, 0.55, 1.5, 20), stem, 0, 0.75, 0));
  for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + seed; const b = mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.9, 12), stem, Math.cos(a) * 0.35, 1.55, Math.sin(a) * 0.35); b.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); G.add(b); }
  const fl = bmat("food", { vc: true, spec: 0.22, shin: 24, rim: [0.16, 0.3, 0.1] });
  const dark = C("#1f7a2a"), light = C("#46b83a");
  const pts: [number, number, number, number][] = [[0, 2.15, 0, 0.75]];
  for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + seed * 1.7; pts.push([Math.cos(a) * 0.72, 1.85 + 0.2 * h1(k + seed), Math.sin(a) * 0.72, 0.5 + 0.12 * h1(k * 3 + seed)]); }
  pts.forEach(([x, y, z, r], i) => G.add(mesh(blobGeo(r, 28, 0.13, 3.2, seed * 7 + i, (_p, n) => dark.clone().lerp(light, clamp01(0.45 + n)), 0.85), fl, x, y, z)));
  return G;
};
export const spaghetti = (seed: number) => {
  const G = new THREE.Group();
  const noodle = bmat("food", { vc: true, spec: 0.55, shin: 60, rim: [0.36, 0.26, 0.06] });
  const yc = C("#ffd46a");
  for (let k = 0; k < 11; k++) {
    const pts: V3[] = []; const a0 = h1(seed * 11 + k) * TAU, r0 = 0.5 + 0.7 * h1(seed * 13 + k), turns = 1.4 + h1(k + seed);
    for (let i = 0; i <= 60; i++) {
      const u = i / 60, a = a0 + u * turns * TAU, r = r0 * (1 - 0.4 * u) + 0.2 * Math.sin(u * 17 + k);
      const y = 0.12 + (1 - Math.min(1, r / 1.3)) * 0.85 + 0.12 * Math.sin(u * 23 + k * 2);
      pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    G.add(mesh(tubeGeo(pts, () => 0.075, 8, () => yc, true), noodle));
  }
  const sauce = bmat("food", { vc: true, spec: 0.6, shin: 70, rim: [0.36, 0.08, 0.06] });
  G.add(mesh(blobGeo(0.8, 32, 0.12, 2.2, seed, (_p, n) => C("#d8341e").lerp(C("#ff5a2a"), clamp01(0.5 + n)), 0.42), sauce, 0, 0.95, 0));
  const mb = bmat("food", { vc: true, spec: 0.25, shin: 30, rim: [0.25, 0.1, 0.05] });
  for (const [x, z] of [[0.35, 0.2], [-0.35, -0.25]]) G.add(mesh(blobGeo(0.4, 22, 0.14, 4, seed + x, (_p, n) => C("#6a321a").lerp(C("#8a4a26"), clamp01(0.5 + n))), mb, x, 1.18, z));
  return G;
};
export const straw = () => {
  const pts: V3[] = [];
  for (let i = 0; i <= 40; i++) pts.push([-1.3 + (2.4 * i) / 40, 0.16, 0]);
  for (let i = 1; i <= 16; i++) { const a = (i / 16) * (Math.PI / 2); pts.push([1.1 + 0.35 * Math.sin(a), 0.16, -0.35 + 0.35 * Math.cos(a) - 0.35]); }
  const last = pts[pts.length - 1]; for (let i = 1; i <= 12; i++) pts.push([last[0], 0.16, last[2] - (0.8 * i) / 12]);
  const n = pts.length - 1, bendA = 40 / n, bendB = 56 / n;
  const g = tubeGeo(pts, (u) => 0.14 * (u > bendA - 0.02 && u < bendB + 0.02 ? 1 + 0.12 * Math.sin(u * n * 3.1) : 1), 16, (u, a) => (Math.sin(u * n * 0.42 + a) > 0.1 ? C("#ff3a4a") : C("#fff6f0")), true);
  const G = new THREE.Group(); G.add(mesh(g, bmat("food", { vc: true, spec: 0.7, shin: 80, rim: [0.3, 0.2, 0.2] }))); return G;
};
export const juiceBox = () => {
  const G = new THREE.Group();
  const lab = bmat("food", { map: juiceLabelTex(), spec: 0.4, shin: 50 });
  const top = bmat("food", { color: "#ff9a1e", spec: 0.4, shin: 50 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.62), [lab, lab, top, top, lab, lab]);
  b.position.y = 0.75; b.castShadow = true; b.receiveShadow = true; b.frustumCulled = false; G.add(b);
  G.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 10), bmat("food", { color: "#c0c0c8" }), 0.3, 1.52, 0));
  return G;
};
export const FOOD_MAKERS: Record<FoodKind, (seed: number) => THREE.Group> = { burger, pizza, broc: broccoli, spag: spaghetti, straw, box: juiceBox };

// ============================== crew corner props ==============================
export const woodMat = () => bmat("wood", { color: "#c8854a", spec: 0.18, shin: 20, rim: [0.3, 0.16, 0.08] });
export const post = (h: number) => { const G = new THREE.Group(); G.add(mesh(new THREE.CylinderGeometry(0.09, 0.11, h, 12), woodMat(), 0, h / 2, 0)); G.add(mesh(new THREE.SphereGeometry(0.13, 12, 10), woodMat(), 0, h, 0)); return G; };
export const crate = () => {
  const G = new THREE.Group(); const w = woodMat();
  const W0 = 1.0, H0 = 0.72, D0 = 0.8;
  G.add(mesh(new THREE.BoxGeometry(W0 - 0.06, H0 - 0.06, D0 - 0.06), bmat("wood", { color: "#b06c38", spec: 0.15, shin: 18 }), 0, H0 / 2, 0));
  for (const y of [0.06, H0 / 2, H0 - 0.06]) for (const s of [-1, 1]) { G.add(mesh(new THREE.BoxGeometry(W0, 0.12, 0.04), w, 0, y, s * D0 / 2)); G.add(mesh(new THREE.BoxGeometry(0.04, 0.12, D0), w, s * W0 / 2, y, 0)); }
  G.add(mesh(new THREE.BoxGeometry(W0 + 0.04, 0.05, D0 + 0.04), w, 0, H0 + 0.02, 0));
  return G;
};
export const bucket = (col: string) => {
  const G = new THREE.Group();
  const g = new THREE.CylinderGeometry(0.36, 0.28, 0.58, 28, 1, true);
  G.add(mesh(g, bmat("plain", { color: col, spec: 0.6, shin: 70, side: THREE.DoubleSide }), 0, 0.29, 0));
  G.add(mesh(new THREE.CircleGeometry(0.28, 28).rotateX(-Math.PI / 2), bmat("plain", { color: col }), 0, 0.02, 0));
  G.add(mesh(new THREE.CircleGeometry(0.33, 28).rotateX(-Math.PI / 2), bmat("glow", { color: "#9ae0ff", spec: 0.8, shin: 90 }), 0, 0.42, 0));
  const hp: V3[] = []; for (let k = 0; k <= 20; k++) { const a = (k / 20) * Math.PI; hp.push([Math.cos(a) * 0.37, 0.58 + Math.sin(a) * 0.3, 0]); }
  G.add(mesh(tubeGeo(hp, () => 0.025, 6), bmat("plain", { color: "#8a8a96", spec: 0.7, shin: 80 })));
  return G;
};
export const mop = (lean: number) => {
  const G = new THREE.Group();
  G.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.3, 10), bmat("wood", { color: "#4a8ae8", spec: 0.4, shin: 50 }), 0, 1.35, 0));
  const sm = bmat("plain", { vc: true, spec: 0.1, shin: 10, rim: [0.3, 0.28, 0.26] }), wc = C("#f4efe6");
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * TAU, pts: V3[] = [];
    for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([Math.cos(a) * (0.06 + 0.32 * u) + 0.05 * Math.sin(u * 7 + k), 0.24 - 0.22 * u * u, Math.sin(a) * (0.06 + 0.32 * u)]); }
    G.add(mesh(tubeGeo(pts, () => 0.045, 6, () => wc, true), sm));
  }
  G.rotation.z = lean;
  return G;
};
/** hammock cloth between two hooks a, b (local), sag below the line; returns geometry (striped, double sided) */
export const hammockGeo = (a: V3, b: V3, sag: number, w: number) => {
  const NU = 28, NV = 8, P: number[] = [], U: number[] = [], idx: number[] = [];
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz), px = -dz / L, pz = dx / L;
  for (let i = 0; i <= NU; i++) for (let j = 0; j <= NV; j++) {
    const u = i / NU, v = j / NV - 0.5, ww = w * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - 0.04) / 0.92))) ** 0.6;
    const y = lerp(a[1], b[1], u) - sag * (1 - (2 * u - 1) ** 2) + 0.35 * sag * (v * v * 4) * Math.sin(Math.PI * u);
    P.push(a[0] + dx * u + px * v * ww, y, a[2] + dz * u + pz * v * ww); U.push(u * 2, j / NV);
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const k = i * (NV + 1) + j; idx.push(k, k + NV + 1, k + 1, k + 1, k + NV + 1, k + NV + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
/** twin-bell alarm clock (origin = feet); returns the group + its hammer pivot */
export const alarmClock = () => {
  const G = new THREE.Group(), body = new THREE.Group();
  const red = bmat("plain", { color: "#f0303a", spec: 0.8, shin: 90, rim: [0.34, 0.08, 0.08] });
  const chrome = bmat("plain", { color: "#e8e4ec", spec: 0.9, shin: 110 });
  const face = bmat("plain", { map: clockFaceTex(), spec: 0.4, shin: 60 });
  const cyl = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 36), red); cyl.rotation.x = Math.PI / 2; body.add(cyl);
  const fc = mesh(new THREE.CircleGeometry(0.29, 36), face, 0, 0, 0.115); body.add(fc);
  for (const s of [-1, 1]) {
    const bl = mesh(new THREE.SphereGeometry(0.17, 20, 12, 0, TAU, 0, Math.PI / 2), chrome, s * 0.22, 0.36, 0); bl.rotation.z = -s * 0.5; body.add(bl);
    const leg = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 8), chrome, s * 0.22, -0.36, 0); leg.rotation.z = s * 0.35; body.add(leg);
  }
  body.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), chrome, 0, 0.42, 0));
  const hands = new THREE.Group(); hands.position.z = 0.125;
  const hm = bmat("plain", { color: "#1c1420" });
  const hh = mesh(new THREE.BoxGeometry(0.035, 0.16, 0.01), hm, 0, 0.07, 0); hands.add(hh);
  const mh = mesh(new THREE.BoxGeometry(0.025, 0.23, 0.01), hm, 0, 0.1, 0.012); mh.rotation.z = -2.1; hands.add(mh);
  body.add(hands);
  const hammer = new THREE.Group(); hammer.position.set(0, 0.42, 0);
  hammer.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), chrome, 0, 0.09, 0));
  body.add(hammer);
  body.position.y = 0.44;
  G.add(body);
  return { G, body, hammer };
};
/** wall clock: face + two hands (group faces +z) */
export const wallClock = () => {
  const G = new THREE.Group();
  const rim = mesh(new THREE.TorusGeometry(0.46, 0.08, 12, 40), bmat("plain", { color: "#3a8ee8", spec: 0.7, shin: 80 })); G.add(rim);
  G.add(mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 40).rotateX(Math.PI / 2), bmat("plain", { map: clockFaceTex(), spec: 0.3, shin: 40 }), 0, 0, 0));
  const hm = bmat("plain", { color: "#1c1420" });
  const hour = new THREE.Group(), min = new THREE.Group();
  hour.add(mesh(new THREE.BoxGeometry(0.06, 0.24, 0.02), hm, 0, 0.1, 0)); min.add(mesh(new THREE.BoxGeometry(0.04, 0.36, 0.02), hm, 0, 0.15, 0));
  hour.position.z = 0.05; min.position.z = 0.07; G.add(hour, min);
  G.add(mesh(new THREE.SphereGeometry(0.05, 10, 8), hm, 0, 0, 0.08));
  return { G, hour, min };
};
/** giant push broom: origin = head bottom centre, head across z, handle socket on top; returns group + handle pivot */
export const pushBroom = () => {
  const G = new THREE.Group();
  const red = bmat("wood", { color: "#e8443a", spec: 0.35, shin: 40, rim: [0.34, 0.1, 0.08] });
  G.add(mesh(new THREE.BoxGeometry(0.62, 0.36, 3.6), red, 0, 0.62, 0));
  // bristles: a block of thin bristle tufts (instanced)
  const N = 120, im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 6), bmat("plain", { color: "#ffc93a", spec: 0.2, shin: 20, rim: [0.3, 0.24, 0.05] }), N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < N; i++) {
    const x = ((i % 4) - 1.5) * 0.13, z = -1.72 + (Math.floor(i / 4) / 29) * 3.44;
    q.setFromEuler(new THREE.Euler(0.12 * (h1(i) - 0.5), 0, 0.18 * (h1(i + 3) - 0.5) + 0.1));
    m4.compose(new THREE.Vector3(x, 0.25, z), q, new THREE.Vector3(1, 1 + 0.08 * h1(i + 7), 1)); im.setMatrixAt(i, m4);
  }
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; G.add(im);
  const handle = new THREE.Group(); handle.position.set(-0.1, 0.8, 0);
  const hl = mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.6, 14), bmat("wood", { color: "#d89a58", spec: 0.25, shin: 30 }), 0, 2.3, 0); handle.add(hl);
  handle.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 14), red, 0, 0.12, 0));
  handle.add(mesh(new THREE.SphereGeometry(0.14, 12, 10), red, 0, 4.62, 0));
  G.add(handle);
  return { G, handle };
};
/** crumb geometries (bread chunk, cookie bit, cereal loop) */
export const crumbGeos = () => [
  blobGeo(0.36, 14, 0.25, 2.2, 3, (_p, n) => C("#f2c27a").lerp(C("#c98a42"), clamp01(0.5 - n))),
  blobGeo(0.3, 12, 0.3, 2.6, 9, (p, n) => (vn(p.x * 6, p.y * 6 + p.z * 5) > 0.45 ? C("#3a1a10") : C("#b06a34").lerp(C("#8a4a22"), clamp01(0.5 + n)))),
  (() => { const g = new THREE.TorusGeometry(0.26, 0.12, 10, 22); const n = g.getAttribute("position").count, c = new Float32Array(n * 3); const o = C("#ff8a2a"); for (let i = 0; i < n; i++) { c[i * 3] = o.r; c[i * 3 + 1] = o.g; c[i * 3 + 2] = o.b; } g.setAttribute("color", new THREE.BufferAttribute(c, 3)); return g; })(),
];
