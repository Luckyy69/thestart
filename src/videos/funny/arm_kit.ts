// OWNER: arm agent. Kit for arm.ts: helpers, the ARM material patch (two-tone + 4 fake point lights + the CABLE LIGHT
// (per-vertex distance to the nerve cable + its arc length: the walls glow where the cable runs, the surge front sweeps
// over them) + the SKIN membrane glow (translucent sunlit roof, pores, hair silhouettes, door-frame shadow) + muscle
// striations), and canvas textures (signs, plates, dials, the knob stencil). Coordinates in shaders are ARM-LOCAL.
import * as THREE from "three";
import { twoTone } from "../bridge/shade";
import { ctex } from "../bridge/paint";
import { ARM, V3 } from "./story";

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
export const cl01 = (x: number) => Math.max(0, Math.min(1, x));
export const sm = (x: number) => { const u = cl01(x); return u * u * (3 - 2 * u); };
/** damped spring step (0 -> 1 with overshoot) */
export const spr = (tau: number, z = 5.5, w = 16) => (tau <= 0 ? 0 : 1 - Math.exp(-z * tau) * (Math.cos(w * tau) + (z / w) * Math.sin(w * tau)));
export const C = (h: string) => new THREE.Color(h);
const AX = ARM[0].toFixed(1);

// ============================== shared uniforms (ARM-LOCAL coordinates) ==============================
export const AU = {
  uT: { value: 0 },
  /** cable light: base, span lo, span hi, span gain */
  uCab: { value: new THREE.Vector4(1, 0, 0, 0) },
  /** front gain, spark gain, pulse u, pulse gain */
  uFront: { value: new THREE.Vector4(0, 0, -1, 0) },
  /** elbow u, hot mix (0 warm .. 1 cyan-white), wall glow gain, flicker */
  uCabX: { value: new THREE.Vector4(0.5, 0, 1, 1) },
  /** skin glow, door-frame shadow, dent, town sky glow */
  uSkin: { value: new THREE.Vector4(0.4, 0, 0, 1) },
  /** (qa1) the door-frame shadow's x offset (m, local): it slides in from +x as it looms, 0 = over the gap */
  uShX: { value: 0 },
  uPLp: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  uPLc: { value: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()] },
  uPLr: { value: [1, 1, 1, 1] },
};
export const GLSL_NOISE = `
float aH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 aH2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
float aN(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(aH(i), aH(i + vec2(1.0, 0.0)), u.x), mix(aH(i + vec2(0.0, 1.0)), aH(i + vec2(1.0, 1.0)), u.x), u.y); }
float aFbm(vec2 p) { return 0.55 * aN(p) + 0.3 * aN(p * 2.1 + 3.1) + 0.15 * aN(p * 4.3 + 7.7); }
`;
/** the cable light at arc length u (shared by the cable, its glow sheath, the padding and the walls) */
export const GLSL_CAB = `
uniform vec4 uCab; uniform vec4 uFront; uniform vec4 uCabX;
float cabL(float u) {
  float L = uCab.x;
  float inS = smoothstep(uCab.y - 0.006, uCab.y + 0.002, u) * (1.0 - smoothstep(uCab.z - 0.002, uCab.z + 0.006, u));
  L += inS * uCab.w;
  L += uFront.x * (exp(-pow((u - uCab.y) / 0.014, 2.0)) + exp(-pow((u - uCab.z) / 0.014, 2.0)));
  L += uFront.y * exp(-pow((u - uCabX.x) / 0.016, 2.0)) * uCabX.w;
  L += uFront.w * exp(-pow((u - uFront.z) / 0.035, 2.0));
  return L;
}
/** colour of the cable light: warm yellow-orange -> white-hot / electric cyan */
vec3 cabC(float u, float L) {
  float hot = clamp(uCabX.y + 0.5 * uFront.x * (exp(-pow((u - uCab.y) / 0.02, 2.0)) + exp(-pow((u - uCab.z) / 0.02, 2.0))) + 0.6 * uFront.y * exp(-pow((u - uCabX.x) / 0.02, 2.0)), 0.0, 1.0);
  vec3 warm = mix(vec3(1.0, 0.62, 0.16), vec3(1.0, 0.86, 0.45), clamp((L - 1.0) * 0.5, 0.0, 1.0));
  return mix(warm, vec3(0.72, 0.95, 1.25), hot);
}
`;
const GLSL_COMMON = `
varying vec3 vMW;
uniform float uT; uniform vec4 uSkin; uniform float uShX;
uniform vec3 uPLp[4]; uniform vec3 uPLc[4]; uniform float uPLr[4];
` + GLSL_NOISE + GLSL_CAB;

export type Kind = "flesh" | "plain" | "bone" | "pad" | "cable" | "wood" | "skinsky";
export type AO = { spec?: number; shin?: number; rim?: [number, number, number]; vc?: boolean; color?: string; emissive?: THREE.Color; flat?: boolean; side?: THREE.Side; map?: THREE.Texture; glow?: number };
const MATS = new Map<string, THREE.MeshPhongMaterial>();
/** two-tone Phong + the arm's fake lights. flesh: needs attributes aCab (vec2 dist, u) + aSkin; pad / cable: aU. */
export const amat = (kind: Kind, o: AO = {}) => {
  const key = kind + JSON.stringify({ ...o, map: o.map ? o.map.uuid : 0, emissive: o.emissive ? o.emissive.getHexString() : 0 });
  const hit = MATS.get(key);
  if (hit) return hit;
  const spec = o.spec ?? 0.3, shin = o.shin ?? 40, rim = o.rim ?? [0.3, 0.12, 0.1], glow = o.glow ?? 1;
  const m = new THREE.MeshPhongMaterial({
    color: o.color ?? "#ffffff", vertexColors: o.vc ?? false, specular: new THREE.Color(spec, spec * 0.92, spec * 0.88), shininess: shin,
    emissive: o.emissive ?? new THREE.Color(0, 0, 0), flatShading: o.flat ?? false, side: o.side ?? THREE.FrontSide, map: o.map ?? null,
  });
  twoTone(m);
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    Object.assign(sh.uniforms, AU);
    let vdecl = "varying vec3 vMW;", vbody = "";
    if (kind === "flesh") { vdecl += "\nattribute vec2 aCab; attribute float aSkin; varying vec2 vCab; varying float vSkin;"; vbody = "vCab = aCab; vSkin = aSkin;"; }
    if (kind === "pad" || kind === "cable") { vdecl += "\nattribute float aU; varying float vU;"; vbody = "vU = aU;"; }
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\n" + vdecl)
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        { vec4 mw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mw = instanceMatrix * mw;
        #endif
          vMW = (modelMatrix * mw).xyz - vec3(${AX}, 0.0, 0.0); ${vbody} }`);
    let fdecl = "";
    if (kind === "flesh") fdecl = "varying vec2 vCab; varying float vSkin;";
    if (kind === "pad" || kind === "cable") fdecl = "varying float vU;";
    let col = "", emit = "";
    if (kind === "flesh") {
      col = `{
        // muscle striations across the ropes + a faint vein net; skin pores on the membrane
        float fib = 0.5 + 0.5 * sin(vMW.x * 8.0 + 1.2 * sin(vMW.y * 0.9 + vMW.z * 0.7));
        float fw = fwidth(vMW.x * 8.0);
        diffuseColor.rgb *= mix(1.0, 0.88 + 0.16 * fib, (1.0 - vSkin) * (1.0 - smoothstep(0.8, 2.5, fw)));
        float vv = abs(aFbm(vMW.xz * 0.28 + vec2(vMW.y * 0.35, 1.7)) - 0.5);
        float vein = 1.0 - smoothstep(0.008, 0.008 + fwidth(vv) * 1.5 + 0.004, vv);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.4, 0.5), 0.28 * vein * (1.0 - vSkin));
        vec2 sp = vMW.xz * 2.4; vec2 h = aH2(floor(sp));
        float pore = (1.0 - smoothstep(0.08, 0.14, length(fract(sp) - 0.5 - 0.3 * (h - 0.5)))) * step(0.45, h.x);
        diffuseColor.rgb *= 1.0 - 0.25 * pore * vSkin * (1.0 - smoothstep(0.15, 0.4, fwidth(sp.x)));
      }`;
      emit = `{
        // cable light on the walls / floor around the line
        float L = cabL(vCab.y);
        float near = exp(-vCab.x / 1.25) + 0.35 * exp(-vCab.x / 4.0);
        totalEmissiveRadiance += diffuseColor.rgb * cabC(vCab.y, L) * L * near * 0.55 * uCabX.z;
        // the skin: sun glowing THROUGH the membrane (fbm mottling, pores, hair silhouettes, the door-frame shadow)
        if (vSkin > 0.001) {
          float town = smoothstep(9.0, 13.0, vMW.x);
          float mott = 0.75 + 0.35 * aFbm(vMW.xz * 0.45 + 2.0);
          vec2 sp = vMW.xz * 2.4; vec2 h = aH2(floor(sp));
          float pore = (1.0 - smoothstep(0.06, 0.13, length(fract(sp) - 0.5 - 0.3 * (h - 0.5)))) * step(0.45, h.x);
          // giant hair stalks outside: soft dark strokes (one per 3 m cell)
          vec2 hc = vMW.xz / 1.6; vec2 hi = floor(hc); vec2 hr = aH2(hi + 17.0);
          vec2 hp = (fract(hc) - 0.5) * 1.6; float ha = hr.x * 6.2831; vec2 hd = vec2(cos(ha), sin(ha));
          float along = dot(hp, hd), across = abs(dot(hp, vec2(-hd.y, hd.x)));
          float hair = (1.0 - smoothstep(0.04, 0.12, across)) * smoothstep(-0.8, -0.55, along) * (1.0 - smoothstep(0.6, 0.8, along)) * step(0.25, hr.y);
          float sv = abs(aFbm(vMW.xz * 0.9 + 4.0) - 0.5); float svein = 1.0 - smoothstep(0.01, 0.035, sv);
          // the door frame OUTSIDE, seen through the thin membrane: a soft shadow while it looms (uSkin.z = its height
          // above the roof), sharpening into a backlit silhouette of its stepped profile as it lands
          float fh = clamp(uSkin.z / 2.2, 0.0, 1.0), soft = 0.06 + 0.5 * fh, ax = abs(vMW.x - uShX);
          float foot = (1.0 - smoothstep(1.38 - soft, 1.38 + soft, ax)) * (1.0 - smoothstep(1.75 - soft, 1.75 + soft, abs(vMW.z)));
          float core = (1.0 - smoothstep(0.78 - soft, 0.78 + soft, ax)) * (1.0 - smoothstep(1.75 - soft, 1.75 + soft, abs(vMW.z)));
          float shadowBand = uSkin.y * (1.0 - town) * mix(foot * 0.85, max(foot * 0.8, core), 1.0 - fh);
          float g = mix(uSkin.x, uSkin.w, town) * mott * (1.0 - 0.55 * pore) * (1.0 - 0.88 * hair) * (1.0 - 0.35 * svein) * (1.0 - 0.9 * shadowBand);
          vec3 sk = mix(vec3(1.0, 0.55, 0.38), vec3(1.0, 0.82, 0.58), clamp((mott - 0.6) * 1.6, 0.0, 1.0)); sk = mix(sk, vec3(0.9, 0.3, 0.32), 0.5 * svein);
          totalEmissiveRadiance += sk * g * vSkin * 1.25;
          // (qa1) the shadow also blocks the light that LIT the membrane (it only dimmed the emission: unreadable)
          float shK = 1.0 - 0.72 * shadowBand * vSkin;
          reflectedLight.directDiffuse *= shK; reflectedLight.directSpecular *= shK; reflectedLight.indirectDiffuse *= mix(1.0, shK, 0.7);
        }
      }`;
    }
    if (kind === "bone") col = `{
      float g = aFbm(vMW.xz * 1.7 + vMW.y * 1.3);
      vec2 sp = vec2(vMW.x + vMW.z, vMW.y) * 5.0; vec2 h = aH2(floor(sp));
      float pit = (1.0 - smoothstep(0.06, 0.12, length(fract(sp) - 0.5))) * step(0.7, h.x);
      diffuseColor.rgb *= (0.9 + 0.14 * g) * (1.0 - 0.18 * pit);
    }`;
    if (kind === "wood") col = `{
      float g = sin((vMW.x * 0.6 + vMW.z * 0.6 + vMW.y * 3.0) * 9.0 + 3.0 * aN(vMW.xz * 1.3 + vMW.y));
      diffuseColor.rgb *= 0.88 + 0.12 * smoothstep(-0.2, 0.9, g);
    }`;
    if (kind === "pad") emit = `{
      float L = cabL(vU);
      totalEmissiveRadiance += diffuseColor.rgb * cabC(vU, L) * L * 0.22 * ${glow.toFixed(2)};
    }`;
    if (kind === "cable") emit = `{
      float L = cabL(vU);
      vec3 cc = cabC(vU, L);
      float rub = 0.5 + 0.5 * sin(vU * 900.0);
      // (qa1) round it: the emission falls off toward the silhouette (it read as a flat tan plank in close-ups)
      float face = pow(saturate(dot(Nv, Vv)), 0.7);
      totalEmissiveRadiance += cc * L * (0.78 + 0.12 * rub) * (0.42 + 0.58 * face);
    }`;
    if (kind === "skinsky") emit = `{
      float mott = 0.75 + 0.35 * aFbm(vMW.xz * 0.45 + 2.0);
      totalEmissiveRadiance += vec3(1.0, 0.7, 0.48) * uSkin.w * mott;
    }`;
    const lights = `
    {
      vec3 Nv = normalize(normal); vec3 Vv = normalize(vViewPosition); vec3 Pv = -vViewPosition;
      vec3 acc = vec3(0.0);
      for (int k = 0; k < 4; k++) {
        vec3 Lp = (viewMatrix * vec4(uPLp[k] + vec3(${AX}, 0.0, 0.0), 1.0)).xyz - Pv; float d = length(Lp); vec3 L = Lp / max(d, 1e-3);
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
      .replace("#include <common>", "#include <common>\n" + GLSL_COMMON + fdecl)
      .replace("#include <color_fragment>", "#include <color_fragment>\n" + col)
      .replace("#include <lights_fragment_end>", "#include <lights_fragment_end>\n" + lights);
  };
  m.customProgramCacheKey = () => "fnArm1_" + key;
  MATS.set(key, m);
  return m;
};

// ============================== geometry helpers ==============================
/** a tube through points with radius(u) and per-vertex colour(u, angle); optional per-vertex extra float (aU) */
export const tubeGeo = (pts: V3[], rad: (u: number, a: number) => number, na: number, col?: (u: number, a: number) => THREE.Color, closeEnds = false, aU?: (u: number) => number) => {
  const ns = pts.length - 1, P: number[] = [], Cc: number[] = [], Uu: number[] = [], idx: number[] = [];
  const T: THREE.Vector3[] = pts.map((_, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(ns, i + 1)]; return new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize(); });
  const N = new THREE.Vector3(0, 1, 0); if (Math.abs(T[0].y) > 0.9) N.set(1, 0, 0);
  N.addScaledVector(T[0], -N.dot(T[0])).normalize();
  const B = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i <= ns; i++) {
    const t = T[i];
    if (i) N.addScaledVector(t, -N.dot(t)).normalize();
    B.crossVectors(t, N);
    const u = i / ns;
    for (let j = 0; j <= na; j++) {
      const a = (j / na) * TAU, r = rad(u, a);
      q.set(0, 0, 0).addScaledVector(N, Math.cos(a)).addScaledVector(B, Math.sin(a));
      P.push(pts[i][0] + q.x * r, pts[i][1] + q.y * r, pts[i][2] + q.z * r);
      const c = col ? col(u, a) : C("#ffffff"); Cc.push(c.r, c.g, c.b);
      if (aU) Uu.push(aU(u));
    }
  }
  for (let i = 0; i < ns; i++) for (let j = 0; j < na; j++) { const a = i * (na + 1) + j, b = a + 1, c = a + na + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  if (closeEnds) {
    for (const [i, s] of [[0, -1], [ns, 1]] as [number, number][]) {
      const ci = P.length / 3; P.push(...pts[i]); const c = col ? col(i / ns, 0) : C("#ffffff"); Cc.push(c.r, c.g, c.b); if (aU) Uu.push(aU(i / ns));
      for (let j = 0; j < na; j++) { const a = i * (na + 1) + j; if (s < 0) idx.push(ci, a, a + 1); else idx.push(ci, a + 1, a); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Cc, 3));
  if (aU) g.setAttribute("aU", new THREE.Float32BufferAttribute(Uu, 1));
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
/** a plump tufted cushion (unit: x/z half size 1, y half height ~0.5; the puffed face is +y, a button dimple on top) */
export const pillowGeo = () => {
  const g = new THREE.SphereGeometry(1, 36, 24);
  const p = g.getAttribute("position") as THREE.BufferAttribute, cc = new Float32Array(p.count * 3);
  const a = C("#fff0b8"), b = C("#f4c870"), w = C("#fffbe6");
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const sx = Math.sign(x) * Math.abs(x) ** 0.55, sz = Math.sign(z) * Math.abs(z) ** 0.55;
    const r2 = sx * sx + sz * sz;
    y = y * 0.5 * (1 - 0.18 * Math.min(1, r2));
    if (y > 0) y -= 0.16 * Math.exp(-r2 / 0.02);
    // four seams from the button to the corners
    const seam = Math.exp(-((Math.abs(sx) - Math.abs(sz)) ** 2) / 0.004) * Math.min(1, r2 * 3);
    if (y > 0) y -= 0.05 * seam;
    x = sx; z = sz;
    p.setXYZ(i, x, y, z);
    const c = a.clone().lerp(b, Math.min(1, 0.35 * r2 + 0.6 * seam)).lerp(w, Math.max(0, y) * 0.8);
    cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cc, 3));
  g.computeVertexNormals();
  return g;
};

// ============================== textures ==============================
const FONT = "'DejaVu Sans', 'Liberation Sans', sans-serif";
export const softTex = () => ctex("fnArmSoft", 256, 256, (g) => {
  g.clearRect(0, 0, 256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.3, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const bolt = (g: CanvasRenderingContext2D, x: number, y: number, s: number) => {
  g.beginPath(); g.moveTo(x + 0.1 * s, y - 0.5 * s); g.lineTo(x - 0.22 * s, y + 0.06 * s); g.lineTo(x - 0.02 * s, y + 0.06 * s);
  g.lineTo(x - 0.12 * s, y + 0.5 * s); g.lineTo(x + 0.24 * s, y - 0.08 * s); g.lineTo(x + 0.03 * s, y - 0.08 * s); g.closePath(); g.fill();
};
/** NECK substation plate */
export const plateTex = () => ctex("fnArmPlate", 1024, 512, (g) => {
  g.fillStyle = "#f4efe0"; g.fillRect(0, 0, 1024, 512);
  g.lineWidth = 22; g.strokeStyle = "#1c1420"; g.strokeRect(11, 11, 1002, 490);
  g.fillStyle = "#1c1420"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `bold 200px ${FONT}`; g.fillText("NECK", 600, 190, 760);
  g.font = `bold 92px ${FONT}`; g.fillText("C8 / T1", 600, 380, 700);
  g.fillStyle = "#ffcf2a"; g.beginPath(); g.moveTo(130, 70); g.lineTo(240, 260); g.lineTo(20, 260); g.closePath(); g.fill();
  g.lineWidth = 12; g.strokeStyle = "#1c1420"; g.stroke();
  g.fillStyle = "#1c1420"; bolt(g, 130, 190, 110);
  g.font = `bold 46px ${FONT}`; g.fillText("SUBSTATION", 130, 420, 230);
});
/** dial face (white, red zone) */
export const dialTex = () => ctex("fnArmDial", 256, 256, (g) => {
  g.fillStyle = "#fffaf0"; g.beginPath(); g.arc(128, 128, 124, 0, TAU); g.fill();
  g.lineWidth = 16; g.strokeStyle = "#ff3a3a"; g.beginPath(); g.arc(128, 128, 92, -0.35, 0.6); g.stroke();
  g.strokeStyle = "#1c1420"; g.lineCap = "round";
  for (let k = 0; k <= 8; k++) { const a = Math.PI * (1.15 + 0.7 * k / 8) ; g.lineWidth = k % 2 ? 6 : 10; g.beginPath(); g.moveTo(128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76); g.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); g.stroke(); }
  for (let k = 0; k <= 8; k++) { const a = -0.35 + (0.95 * k) / 8; g.lineWidth = 6; g.beginPath(); g.moveTo(128 + Math.cos(a) * 76, 128 + Math.sin(a) * 76); g.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104); g.stroke(); }
  g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 122, 0, TAU); g.stroke();
});
/** arrow board (fingerpost): yellow road sign with text, pointing right (+u) */
export const arrowTex = (key: string, text: string, sub: string, bg = "#ffd23a") => ctex("fnArmArrow" + key, 1024, 256, (g) => {
  g.clearRect(0, 0, 1024, 256);
  const path = () => { g.beginPath(); g.moveTo(14, 20); g.lineTo(860, 20); g.lineTo(1010, 128); g.lineTo(860, 236); g.lineTo(14, 236); g.closePath(); };
  path(); g.fillStyle = bg; g.fill(); g.lineWidth = 18; g.strokeStyle = "#1c1420"; g.stroke();
  g.fillStyle = "#1c1420"; g.textAlign = "left"; g.textBaseline = "middle";
  g.font = `bold 118px ${FONT}`; g.fillText(text, 54, 132, 600);
  g.textAlign = "right"; g.font = `bold 84px ${FONT}`; g.fillText(sub, 880, 136, 260);
});
/** CAUTION: LIVE (yellow triangle + text) */
export const cautionTex = () => ctex("fnArmCaution", 512, 640, (g) => {
  g.fillStyle = "#ffd23a"; g.fillRect(0, 0, 512, 640);
  g.lineWidth = 18; g.strokeStyle = "#1c1420"; g.strokeRect(9, 9, 494, 622);
  g.fillStyle = "#1c1420"; g.beginPath(); g.moveTo(256, 50); g.lineTo(460, 400); g.lineTo(52, 400); g.closePath(); g.fill();
  g.fillStyle = "#ffd23a"; g.beginPath(); g.moveTo(256, 104); g.lineTo(412, 372); g.lineTo(100, 372); g.closePath(); g.fill();
  g.fillStyle = "#1c1420"; bolt(g, 256, 280, 190);
  g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `bold 96px ${FONT}`; g.fillText("CAUTION", 256, 478, 460);
  g.font = `bold 104px ${FONT}`; g.fillText("LIVE!", 256, 578, 460);
});
/** PINKY TOWN - POP. 1 1/2 */
export const townSignTex = () => ctex("fnArmTown", 1024, 512, (g) => {
  g.fillStyle = "#3a8a4a"; g.fillRect(0, 0, 1024, 512);
  g.lineWidth = 16; g.strokeStyle = "#fff6e0"; g.strokeRect(26, 26, 972, 460);
  g.lineWidth = 14; g.strokeStyle = "#1c1420"; g.strokeRect(7, 7, 1010, 498);
  g.fillStyle = "#fff6e0"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `bold 176px ${FONT}`; g.fillText("PINKY TOWN", 512, 200, 900);
  g.font = `bold 96px ${FONT}`; g.fillText("POP. 1½", 512, 380, 700);
});
export const medianTex = () => ctex("fnArmMedian", 512, 160, (g) => {
  g.fillStyle = "#6a7a8a"; g.fillRect(0, 0, 512, 160); g.lineWidth = 10; g.strokeStyle = "#1c1420"; g.strokeRect(5, 5, 502, 150);
  g.fillStyle = "#f4f0e8"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = `bold 58px ${FONT}`; g.fillText("MEDIAN NERVE CO.", 256, 82, 470);
});
/** ivory bone with a faint stencil "HUMERUS" centred at u 0.5 (equirect for a SphereGeometry) */
export const knobTex = () => ctex("fnArmKnob", 1024, 512, (g, r) => {
  g.fillStyle = "#f6ecd4"; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(150,120,80,${0.05 + 0.08 * r()})`; g.beginPath(); g.arc(r() * 1024, r() * 512, 2 + 6 * r(), 0, TAU); g.fill(); }
  g.save(); g.translate(512, 250); g.scale(0.5, 0.8);
  g.font = `bold 120px ${FONT}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "rgba(130,90,50,0.26)"; g.fillText("HUMERUS", 0, 0);
  // stencil bridges: thin gaps through the letters
  g.fillStyle = "#f6ecd4"; for (let x = -320; x <= 320; x += 46) g.fillRect(x, -6, 7, 12);
  g.restore();
});
/** pavement for Pinky Town */
export const paveTex = () => ctex("fnArmPave", 1024, 1024, (g, r) => {
  g.fillStyle = "#c89a78"; g.fillRect(0, 0, 1024, 1024);
  const s = 64;
  for (let y = 0; y < 1024; y += s) for (let x = (y / s) % 2 ? -s / 2 : 0; x < 1024; x += s) {
    const l = 0.85 + 0.25 * r();
    g.fillStyle = `rgb(${Math.round(222 * l)},${Math.round(172 * l)},${Math.round(138 * l)})`;
    g.beginPath(); g.roundRect(x + 4, y + 4, s - 8, s - 8, 14); g.fill();
  }
});
