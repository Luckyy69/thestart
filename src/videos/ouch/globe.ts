// OWNER: globe agent. The TINY PLANET of shot 3 (place "globe"): a cute toy world of radius PLANET_R centred at
// PLANET_C = GLOBE+(0,-6,0). Its top (north pole) is GLOBE itself.
//   - ground: one smooth sphere painted analytically in the shader (crisp at 2K at any distance): a land cap with a
//     wavy coast, sandy beaches, cartoon contour ripples in the turquoise shallows, deep-blue ocean, little islands,
//     patchwork fields tinted per country, flower dots and a winding ring PATH at lat ~42 deg where the people stand.
//   - four country quarters (lon 0 UK/US, 90 France, 180 Spain, 270 Denmark: lon 0 faces +z, 90 faces +x):
//       UK: brick terrace house + red phone box + lamp post + flag;  FR: mini Eiffel tower + cafe with striped awning;
//       ES: white house with terracotta roof + orange trees;         DK: Nyhavn-style coloured gabled row + windmill.
//     each with a small STUB obstacle (kerb / cobble / rock / mooring bollard) right next to the standing point.
//   - a signpost on the north pole, clouds on sticks, trees, little sailboats on the sea.
//   - a planet-relative low sun (fixed relative to the camera: the planet seems to turn under it), so the country
//     facing the lens is always in low raking golden light, with the terminator + night side (blue shade) on screen
//     left, a warm band along the terminator, aerial haze toward the limb and a ray-traced atmosphere rim.
//   - sky: stars above, a sea of golden clouds far below.
//   - planetAt.many: ~44 speech bubbles in many languages pop up all over the planet; planetAt.ah: a big "AH!" with
//     cartoon sound-wave rings pulsing out from the planet.
// Everything is a pure function of (id, t): seeded hashes only.
import * as THREE from "three";
import { Batch, V, addVeg, VegKind } from "../bridge/build";
import { ctex, rng, cloudHD, CLOUD_GOLD } from "../bridge/paint";
import { twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { GLOBE, COUNTRIES, planetAt, SHOTS, W, V3, clamp01, smooth } from "./story";
import { LOOKS } from "./looks";

// ======================================================================================================
// contracts (world coordinates)
// ======================================================================================================
export const PLANET_R = 6;
export const PLANET_C: V3 = [GLOBE[0], GLOBE[1] - PLANET_R, GLOBE[2]];
const D2R = Math.PI / 180;
/** outward unit normal at (lon, lat) in degrees. lon 0 = +z, lon 90 = +x, lon 180 = -z, lon 270 = -x */
export const nrm = (lon: number, lat: number): V3 => {
  const a = lon * D2R, b = lat * D2R;
  return [Math.cos(b) * Math.sin(a), Math.sin(b), Math.cos(b) * Math.cos(a)];
};
/** point h metres above the surface at (lon, lat) */
export const surf = (lon: number, lat: number, h = 0): V3 => {
  const n = nrm(lon, lat), r = PLANET_R + h;
  return [PLANET_C[0] + n[0] * r, PLANET_C[1] + n[1] * r, PLANET_C[2] + n[2] * r];
};
/** local "east" (screen right when you look at that spot from outside, planet north up) */
export const eastAt = (lon: number): V3 => [Math.cos(lon * D2R), 0, -Math.sin(lon * D2R)];
/** where each country's person stands: on the ring path at lat STAND_LAT. up = outward normal (the card's up).
 *  stub = the obstacle's base centre, 0.28 m to the person's east (screen right); stubTop = its top. */
export const STAND_LAT = 42;
const STUB_DLON = 0.28 / (PLANET_R * Math.cos(STAND_LAT * D2R)) / D2R; // ~3.6 deg
type Stand = { lon: number; lat: number; pos: V3; up: V3; east: V3; stub: V3; stubTop: V3; stubKind: string };
export const STAND: Record<string, Stand> = {};
const STUB_KIND: Record<string, [string, number]> = { uk: ["kerb stone", 0.15], fr: ["cobble rock", 0.17], es: ["rock", 0.17], dk: ["mooring bollard", 0.26] };
for (const c of COUNTRIES) {
  const [kind, h] = STUB_KIND[c.key] ?? ["rock", 0.18];
  STAND[c.key] = { lon: c.lon, lat: STAND_LAT, pos: surf(c.lon, STAND_LAT), up: nrm(c.lon, STAND_LAT), east: eastAt(c.lon),
    stub: surf(c.lon + STUB_DLON, STAND_LAT), stubTop: surf(c.lon + STUB_DLON, STAND_LAT, h), stubKind: kind };
}
/** suggested close-up camera for a country: on the equator side and above, looking at the person's chest.
 *  dist = metres from the planet centre (11.5 -> ~5.7 m from the person). */
export const countryCam = (lon: number, camLat = 30, dist = 11.5): { pos: V3; look: V3 } => {
  const p = nrm(lon, camLat);
  return { pos: [PLANET_C[0] + p[0] * dist, PLANET_C[1] + p[1] * dist, PLANET_C[2] + p[2] * dist], look: surf(lon, STAND_LAT + 4, 0.7) };
};
/** the planet's sun: fixed RELATIVE TO THE CAMERA (az from the camera->planet direction, 0 = backlight, +90 = screen
 *  right, el above the world horizontal). The cast should use this for card shading in shot 3. */
export const globeSun = (camPos: THREE.Vector3, out = new THREE.Vector3()) => {
  const L = LOOKS.planet;
  let fx = PLANET_C[0] - camPos.x, fz = PLANET_C[2] - camPos.z;
  const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
  const az = L.sunAz * D2R, el = L.sunEl * D2R;
  const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
  return out.set(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
};

// ======================================================================================================
// materials: two-tone house lighting + planet haze (aerial perspective toward the limb, warm terminator band)
// ======================================================================================================
const C0 = V(...PLANET_C);
const lin = (h: string) => { const c = new THREE.Color(h); return `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`; };
const HZ = {
  uPC: { value: C0.clone() }, uPSun: { value: V(0, 1, 0) }, uHazeK: { value: 0.8 },
  uHazeDay: { value: untone("#a8c4f0") }, uHazeNight: { value: untone("#34437e") }, uHazeWarm: { value: untone("#ff9a62") },
  uTermWarm: { value: V(1.32, 1.0, 0.72) },
};
const HAZE_DECL = `varying vec3 vWp; varying vec3 vLp; uniform vec3 uPC; uniform vec3 uPSun; uniform float uHazeK; uniform vec3 uHazeDay; uniform vec3 uHazeNight; uniform vec3 uHazeWarm; uniform vec3 uTermWarm;`;
const HAZE_FS = /* glsl */ `
{
  vec3 hn = normalize(vWp - uPC), hv = normalize(cameraPosition - vWp);
  float mu = clamp(dot(hn, hv), 0.0, 1.0), sk = dot(hn, uPSun);
  float day = smoothstep(-0.2, 0.12, sk);
  float band = exp(-pow((sk - 0.13) / 0.13, 2.0)) * smoothstep(-0.02, 0.06, sk);
  outgoingLight *= mix(vec3(0.74, 0.8, 1.06), vec3(1.0), day);              // the night side sinks into deep blue
  outgoingLight *= mix(vec3(1.0), uTermWarm, band * 0.8);                    // golden-hour band along the terminator
  float hz = pow(1.0 - mu, 2.4) * uHazeK;
  vec3 hc = mix(uHazeNight, uHazeDay, day) + uHazeWarm * band * 0.5;
  outgoingLight = mix(outgoingLight, hc, clamp(hz, 0.0, 0.9));
}`;
const mats = new Map<string, THREE.MeshLambertMaterial>();
const wrap = (m: THREE.MeshLambertMaterial, painter = "") => {
  twoTone(m);
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    Object.assign(sh.uniforms, HZ);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; varying vec3 vLp;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz; vLp = transformed;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + HAZE_DECL + "\n" + painter)
      .replace("#include <opaque_fragment>", HAZE_FS + "\n#include <opaque_fragment>");
    if (painter) sh.fragmentShader = sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb = painter(normalize(vLp));");
  };
  m.customProgramCacheKey = () => "ouGlobe2_" + (painter ? "planet" : "obj");
  return m;
};
const gm = (col: string, extra: THREE.MeshLambertMaterialParameters = {}, key = "") => {
  const k = col + key + (extra.side === THREE.DoubleSide ? "|2" : "") + (extra.emissive ? "|e" + String(extra.emissive) : "");
  let m = mats.get(k);
  if (!m) { m = wrap(new THREE.MeshLambertMaterial({ color: col, ...extra })); mats.set(k, m); }
  return m;
};
const tm = (key: string, map: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => gm("#ffffff", { map, ...extra }, "|" + key);

// ---------------- the planet painter ----------------
const PLANET_PAINT = /* glsl */ `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ return 0.5 * n3(p) + 0.25 * n3(p * 2.03 + 3.1) + 0.125 * n3(p * 4.01 + 7.7); }
float ring(float d, float w, float aa){ return 1.0 - smoothstep(w, w + aa, abs(d)); }
vec3 painter(vec3 p){
  float lat = asin(clamp(p.y, -1.0, 1.0)), lon = atan(p.x, p.z);
  // land: a cap above a wavy coast + small southern islands
  float m = p.y + 0.15 * (fbm(p * 2.6) - 0.44) - 0.03;
  float isl = (fbm(p * 3.4 + vec3(5.1, 2.3, 7.7)) - 0.63) * 0.9 * smoothstep(0.1, -0.2, p.y);
  float lf = max(m, isl);
  // ---- ocean ----
  float dep = -lf;
  vec3 col = mix(${lin("#3fc4d0")}, ${lin("#2a83c4")}, smoothstep(0.0, 0.07, dep));
  col = mix(col, ${lin("#1d5aa8")}, smoothstep(0.08, 0.3, dep));
  float rip = ring(dep - 0.016, 0.0025, 0.002) + 0.7 * ring(dep - 0.036, 0.002, 0.002) + 0.35 * ring(dep - 0.06, 0.0018, 0.002);
  col = mix(col, ${lin("#e8fbff")}, clamp(rip, 0.0, 1.0) * 0.85);
  float dash = smoothstep(0.8, 0.84, n3(p * vec3(26.0, 70.0, 26.0))) * smoothstep(0.08, 0.14, dep);
  col = mix(col, ${lin("#bfe6ff")}, dash * 0.55);
  // ---- land ----
  vec4 w = vec4(pow(max(cos(lon), 0.0), 2.0), pow(max(sin(lon), 0.0), 2.0), pow(max(-cos(lon), 0.0), 2.0), pow(max(-sin(lon), 0.0), 2.0));
  w /= (w.x + w.y + w.z + w.w + 1e-4);
  vec3 lc = ${lin("#69b04e")} * w.x + ${lin("#8fc25a")} * w.y + ${lin("#93b056")} * w.z + ${lin("#4fa95c")} * w.w;
  lc = mix(lc, ${lin("#78ba55")}, smoothstep(1.2, 1.45, lat));
  vec3 cell = floor(p * 7.0 + 0.5 * fbm(p * 3.0));
  lc *= 0.95 + 0.1 * h3(cell);                       // patchwork fields
  lc *= 0.94 + 0.12 * n3(p * 55.0);                  // grass mottling
  float stripes = smoothstep(0.35, 0.5, abs(fract(dot(p, vec3(13.0, 4.0, 9.0)) + h3(cell) * 3.0) - 0.5));
  lc *= mix(1.0, 0.92 + 0.08 * stripes, step(0.55, h3(cell + 9.0)));  // ploughed rows on some fields
  // flowers
  vec3 q = p * 75.0, qc = floor(q), qf = fract(q) - 0.5;
  float fr = h3(qc + 3.3);
  if (fr > 0.9 && length(qf) < 0.16) lc = fr > 0.97 ? ${lin("#ff6b6b")} : fr > 0.935 ? ${lin("#fff3a0")} : ${lin("#ffffff")};
  // the winding ring path (the people stand on it at lon 0/90/180/270)
  float latD = degrees(lat) - (${STAND_LAT.toFixed(1)} + 2.5 * sin(2.0 * lon));
  float pathD = abs(latD);
  vec3 pc = ${lin("#e6cfa0")} * (0.93 + 0.1 * n3(p * 90.0));
  float pb = 1.0 - smoothstep(3.3, 3.5, pathD);
  lc = mix(lc, ${lin("#8f6f4a")}, ring(pathD - 3.6, 0.25, 0.15) * 0.85);
  lc = mix(lc, pc, pb);
  // beach
  float sand = 1.0 - smoothstep(0.016, 0.022, lf);
  lc = mix(lc, ${lin("#f1dca0")} * (0.95 + 0.08 * n3(p * 80.0)), sand);
  float landK = smoothstep(-0.0015, 0.0015, lf);
  col = mix(col, lc, landK);
  col = mix(col, ${lin("#5a4a3a")}, ring(lf, 0.0012, 0.0015) * 0.6); // inked coastline
  return col;
}`;

// ======================================================================================================
// geometry helpers (local frame: x = east, y = up (outward normal), z = south (toward the equator / the viewer))
// ======================================================================================================
const frameAt = (lon: number, lat: number, yawDeg = 0, sink = 0.08) => {
  const n = V(...nrm(lon, lat)), e = V(...eastAt(lon)), s = new THREE.Vector3().crossVectors(e, n);
  const p = V(...surf(lon, lat, -sink));
  return new THREE.Matrix4().makeBasis(e, n, s).setPosition(p).multiply(new THREE.Matrix4().makeRotationY(yawDeg * D2R));
};
/** a Batch whose adds are pre-multiplied by a frame (so bridge addVeg works on the sphere) */
class FB extends Batch {
  M = new THREE.Matrix4();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) { super.add(geo, mat, m ? this.M.clone().multiply(m) : this.M.clone()); }
}
const T = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: V3 = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(...s));
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
const cyl = (r0: number, r1: number, h: number, n = 16) => new THREE.CylinderGeometry(r1, r0, h, n).translate(0, h / 2, 0);
const sph = (r: number, a = 18, b = 12) => new THREE.SphereGeometry(r, a, b);
/** gable roof prism along x: eaves at y 0, ridge at y rh, depth d (+ overhang o) */
const gable = (L: number, d: number, rh: number, o = 0.08) => {
  const s = new THREE.Shape();
  s.moveTo(-d / 2 - o, 0); s.lineTo(d / 2 + o, 0); s.lineTo(0, rh); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-L / 2, 0, 0);
};
const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number, n = 6) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, n, 1).translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
};
/** a framed window on a +z facing wall at z = zf: frame, glass, cross mullion (each layer proud of the last) */
const windowAt = (b: Batch, M: THREE.Matrix4, x: number, y: number, zf: number, w: number, h: number, frame: string, glass = "#3b5c86", cross = true) => {
  const F = gm(frame), G = gm(glass);
  b.add(new THREE.BoxGeometry(w + 0.07, h + 0.07, 0.03), F, M.clone().multiply(T(x, y, zf + 0.015)));
  b.add(new THREE.BoxGeometry(w, h, 0.03), G, M.clone().multiply(T(x, y, zf + 0.025)));
  if (cross) {
    b.add(new THREE.BoxGeometry(0.03, h, 0.03), F, M.clone().multiply(T(x, y, zf + 0.035)));
    b.add(new THREE.BoxGeometry(w, 0.03, 0.03), F, M.clone().multiply(T(x, y + h * 0.1, zf + 0.036)));
  }
};
const textTex = (key: string, w: number, h: number, txt: string, bg: string, fg: string, font: string) => ctex("glb_txt_" + key, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, w / 2, h / 2 + 2, w * 0.9);
});
const flagTex = (key: string) => ctex("glb_flag_" + key, 256, 160, (g) => {
  const W2 = 256, H = 160;
  if (key === "uk") {
    g.fillStyle = "#1f3f8f"; g.fillRect(0, 0, W2, H);
    for (const [c, lw] of [["#ffffff", 30], ["#d22a36", 10]] as [string, number][]) { g.strokeStyle = c; g.lineWidth = lw; g.beginPath(); g.moveTo(0, 0); g.lineTo(W2, H); g.moveTo(W2, 0); g.lineTo(0, H); g.stroke(); }
    g.fillStyle = "#ffffff"; g.fillRect(W2 / 2 - 24, 0, 48, H); g.fillRect(0, H / 2 - 24, W2, 48);
    g.fillStyle = "#d22a36"; g.fillRect(W2 / 2 - 14, 0, 28, H); g.fillRect(0, H / 2 - 14, W2, 28);
  } else if (key === "fr") {
    ["#2546a0", "#ffffff", "#e03a3e"].forEach((c, i) => { g.fillStyle = c; g.fillRect((i * W2) / 3, 0, W2 / 3 + 1, H); });
  } else if (key === "es") {
    g.fillStyle = "#c8202c"; g.fillRect(0, 0, W2, H); g.fillStyle = "#ffc72c"; g.fillRect(0, H / 4, W2, H / 2);
  } else {
    g.fillStyle = "#d0203a"; g.fillRect(0, 0, W2, H); g.fillStyle = "#ffffff"; g.fillRect(76, 0, 26, H); g.fillRect(0, H / 2 - 13, W2, 26);
  }
  g.strokeStyle = "rgba(30,20,30,0.6)"; g.lineWidth = 6; g.strokeRect(3, 3, W2 - 6, H - 6);
});
const flag = (b: Batch, M: THREE.Matrix4, key: string, h = 1.6) => {
  b.add(cyl(0.025, 0.02, h, 8), gm("#e9e4da"), M);
  b.add(sph(0.045, 10, 8), gm("#e0b84a"), M.clone().multiply(T(0, h + 0.03, 0)));
  const g = new THREE.PlaneGeometry(0.62, 0.39, 10, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.31; p.setZ(i, 0.05 * Math.sin(x * 9) * (x / 0.62)); }
  g.computeVertexNormals();
  b.add(g, tm("flag" + key, flagTex(key), { side: THREE.DoubleSide }), M.clone().multiply(T(0.34, h - 0.22, 0)));
};

// ======================================================================================================
// the per-country builders (local coordinates)
// ======================================================================================================
const ukHouse = (b: Batch, M: THREE.Matrix4) => {
  const brickT = ctex("glb_brick", 512, 512, (g, r) => {
    g.fillStyle = "#8a3f30"; g.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 32) for (let x = -64; x < 512; x += 64) {
      const ox = (y / 32) % 2 ? 32 : 0, l = 0.85 + r() * 0.3;
      g.fillStyle = `rgb(${Math.min(255, 182 * l)},${88 * l},${66 * l})`; g.fillRect(x + ox + 3, y + 3, 58, 26);
    }
  });
  const W2 = 2.0, H = 1.9, D = 1.3;
  b.add(box(W2, H, D), tm("brick", brickT), M);
  b.add(box(W2 + 0.06, 0.12, D + 0.06), gm("#efe8dc"), M.clone().multiply(T(0, H - 0.04, 0)));
  b.add(gable(W2 + 0.16, D, 0.85, 0.12), gm("#4b5068"), M.clone().multiply(T(0, H + 0.08, 0)));
  for (const x of [-0.55, 0.62]) {
    b.add(box(0.28, 0.6, 0.28), tm("brick", brickT), M.clone().multiply(T(x, H + 0.5, -0.15)));
    for (const dx of [-0.07, 0.07]) b.add(cyl(0.04, 0.05, 0.14, 10), gm("#c9714a"), M.clone().multiply(T(x + dx, H + 1.1, -0.15)));
  }
  const zf = D / 2;
  b.add(new THREE.BoxGeometry(0.56, 1.05, 0.04), gm("#f2ede4"), M.clone().multiply(T(-0.45, 0.6, zf + 0.02)));
  b.add(new THREE.BoxGeometry(0.44, 0.92, 0.05), gm("#1c1c26"), M.clone().multiply(T(-0.45, 0.55, zf + 0.03)));
  b.add(sph(0.025, 8, 6), gm("#e0b84a"), M.clone().multiply(T(-0.33, 0.55, zf + 0.07)));
  b.add(box(0.7, 0.1, 0.24), gm("#d8d2c6"), M.clone().multiply(T(-0.45, 0, zf + 0.12)));
  windowAt(b, M, 0.45, 0.68, zf, 0.62, 0.62, "#f6f2ea");
  windowAt(b, M, -0.45, 1.45, zf, 0.5, 0.46, "#f6f2ea");
  windowAt(b, M, 0.45, 1.45, zf, 0.5, 0.46, "#f6f2ea");
  b.add(box(0.66, 0.1, 0.12), gm("#3f6e3c"), M.clone().multiply(T(0.45, 0.28, zf + 0.08)));
  for (let i = 0; i < 5; i++) b.add(sph(0.05, 8, 6), gm("#e8434a"), M.clone().multiply(T(0.2 + i * 0.125, 0.4, zf + 0.09)));
};
const phoneBox = (b: Batch, M: THREE.Matrix4) => {
  const red = gm("#d42a30"), W2 = 0.5, H = 1.32;
  b.add(box(W2 + 0.08, 0.1, W2 + 0.08), red, M);
  b.add(box(W2, H, W2), red, M.clone().multiply(T(0, 0.1, 0)));
  for (const s of [-1, 1]) for (const s2 of [-1, 1]) b.add(box(0.06, H + 0.04, 0.06), red, M.clone().multiply(T(s * (W2 / 2 + 0.01), 0.1, s2 * (W2 / 2 + 0.01))));
  b.add(box(W2 + 0.1, 0.1, W2 + 0.1), red, M.clone().multiply(T(0, H + 0.1, 0)));
  b.add(new THREE.SphereGeometry(0.36, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 1), red, M.clone().multiply(T(0, H + 0.2, 0)));
  const sign = tm("tel", textTex("tel", 256, 48, "TELEPHONE", "#18161c", "#f4f0e6", "bold 34px Arial, sans-serif"));
  const glass = gm("#9fc4d8");
  for (let k = 0; k < 4; k++) {
    const MM = M.clone().multiply(T(0, 0, 0, (k * Math.PI) / 2));
    b.add(new THREE.PlaneGeometry(0.4, 0.075), sign, MM.clone().multiply(T(0, H, W2 / 2 + 0.061)));
    b.add(new THREE.BoxGeometry(0.38, 0.8, 0.02), glass, MM.clone().multiply(T(0, 0.77, W2 / 2 + 0.005)));
    for (let j = 1; j < 6; j++) b.add(new THREE.BoxGeometry(0.38, 0.025, 0.03), red, MM.clone().multiply(T(0, 0.37 + (j * 0.8) / 6, W2 / 2 + 0.01)));
    for (const x of [-0.065, 0.065]) b.add(new THREE.BoxGeometry(0.025, 0.8, 0.03), red, MM.clone().multiply(T(x, 0.77, W2 / 2 + 0.012)));
  }
  b.add(sph(0.05, 10, 8), gm("#f6e8b0", { emissive: "#f6d070", emissiveIntensity: 0.35 }), M.clone().multiply(T(0, H + 0.32, 0)));
};
const lampPost = (b: Batch, M: THREE.Matrix4) => {
  const k = gm("#2b2d3a");
  b.add(cyl(0.07, 0.04, 0.2, 10), k, M);
  b.add(cyl(0.035, 0.03, 1.7, 8), k, M);
  b.add(cyl(0.06, 0.09, 0.2, 6), gm("#ffe7a0", { emissive: "#ffcf70", emissiveIntensity: 0.5 }), M.clone().multiply(T(0, 1.7, 0)));
  b.add(new THREE.ConeGeometry(0.13, 0.12, 6).translate(0, 0.06, 0), k, M.clone().multiply(T(0, 1.9, 0)));
};
const eiffel = (b: Batch, M: THREE.Matrix4) => {
  const m = gm("#9a6440"), m2 = gm("#7d4f33");
  const lv = [[0, 0.62], [1.05, 0.33], [2.05, 0.16], [3.2, 0.05]] as [number, number][];
  for (let i = 0; i < 3; i++) {
    const [y0, a0] = lv[i], [y1, a1] = lv[i + 1];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.add(strut(V(sx * a0, y0, sz * a0), V(sx * a1, y1, sz * a1), 0.06 - i * 0.015, 6), m, M);
    for (let f = 0; f < 4; f++) {
      const R = M.clone().multiply(new THREE.Matrix4().makeRotationY((f * Math.PI) / 2)), n = i === 0 ? 2 : 3;
      for (let k = 0; k < n; k++) {
        const u0 = k / n, u1 = (k + 1) / n, yA = y0 + (y1 - y0) * u0, yB = y0 + (y1 - y0) * u1, aA = a0 + (a1 - a0) * u0, aB = a0 + (a1 - a0) * u1;
        b.add(strut(V(-aA, yA, aA), V(aB, yB, aB), 0.014, 4), m2, R);
        b.add(strut(V(aA, yA, aA), V(-aB, yB, aB), 0.014, 4), m2, R);
      }
    }
  }
  for (let f = 0; f < 4; f++) b.add(new THREE.TorusGeometry(0.4, 0.035, 6, 20, Math.PI).translate(0, 0.42, 0.5), m, M.clone().multiply(new THREE.Matrix4().makeRotationY((f * Math.PI) / 2)));
  b.add(box(0.9, 0.09, 0.9), m2, M.clone().multiply(T(0, 1.0, 0)));
  b.add(box(0.98, 0.04, 0.98), m, M.clone().multiply(T(0, 1.09, 0)));
  b.add(box(0.46, 0.07, 0.46), m2, M.clone().multiply(T(0, 2.03, 0)));
  b.add(cyl(0.07, 0.03, 0.3, 4).rotateY(Math.PI / 4), m, M.clone().multiply(T(0, 3.15, 0)));
  b.add(cyl(0.012, 0.01, 0.35, 6), m2, M.clone().multiply(T(0, 3.42, 0)));
};
const cafe = (b: Batch, M: THREE.Matrix4) => {
  const W2 = 1.8, H = 1.6, D = 1.2, zf = D / 2;
  b.add(box(W2, H, D), gm("#f1e2c6"), M);
  b.add(box(W2 + 0.06, 0.3, D + 0.06), gm("#5a6a8a"), M.clone().multiply(T(0, H, 0)));
  b.add(gable(W2 + 0.1, D * 0.8, 0.45, 0.02), gm("#56667f"), M.clone().multiply(T(0, H + 0.3, 0)));
  windowAt(b, M, -0.3, 1.3, zf, 0.3, 0.32, "#ffffff", "#3b5c86", false);
  windowAt(b, M, 0.45, 1.3, zf, 0.3, 0.32, "#ffffff", "#3b5c86", false);
  b.add(new THREE.BoxGeometry(1.6, 0.92, 0.04), gm("#2f5a46"), M.clone().multiply(T(0, 0.5, zf + 0.02)));
  b.add(new THREE.BoxGeometry(0.72, 0.7, 0.05), gm("#ffd890", { emissive: "#ffb850", emissiveIntensity: 0.25 }), M.clone().multiply(T(-0.35, 0.48, zf + 0.03)));
  b.add(new THREE.BoxGeometry(0.4, 0.82, 0.05), gm("#24342c"), M.clone().multiply(T(0.5, 0.45, zf + 0.03)));
  const sign = tm("cafe", textTex("cafe", 256, 56, "CAFÉ", "#2f5a46", "#f6e6b8", "italic bold 40px Georgia, serif"));
  b.add(new THREE.PlaneGeometry(0.9, 0.2), sign, M.clone().multiply(T(0, 1.06, zf + 0.045)));
  const aw = ctex("glb_awning", 256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#ffffff" : "#d8333c"; g.fillRect(i * 32, 0, 32, 64); } });
  const awM = tm("awning", aw, { side: THREE.DoubleSide });
  b.add(new THREE.PlaneGeometry(1.7, 0.6).rotateX(-Math.PI / 2 + 0.5), awM, M.clone().multiply(T(0, 0.98, zf + 0.27)));
  b.add(new THREE.PlaneGeometry(1.7, 0.12), awM, M.clone().multiply(T(0, 0.79, zf + 0.535)));
  for (const [x, z] of [[-0.55, 0.95], [0.4, 1.05]] as [number, number][]) {
    b.add(cyl(0.02, 0.02, 0.48, 6), gm("#2b2d3a"), M.clone().multiply(T(x, 0, z)));
    b.add(cyl(0.17, 0.17, 0.03, 16), gm("#f4f1ea"), M.clone().multiply(T(x, 0.48, z)));
    b.add(cyl(0.03, 0.03, 0.08, 8), gm("#ffffff"), M.clone().multiply(T(x + 0.05, 0.51, z)));
    for (const s of [-1, 1]) {
      const cx = x + s * 0.28;
      b.add(box(0.2, 0.03, 0.2), gm("#c94a3a"), M.clone().multiply(T(cx, 0.3, z)));
      for (const lx of [-0.08, 0.08]) for (const lz of [-0.08, 0.08]) b.add(cyl(0.012, 0.012, 0.3, 5), gm("#2b2d3a"), M.clone().multiply(T(cx + lx, 0, z + lz)));
      b.add(box(0.03, 0.28, 0.2), gm("#c94a3a"), M.clone().multiply(T(cx + s * 0.1, 0.33, z)));
    }
  }
};
const whiteHouse = (b: Batch, M: THREE.Matrix4) => {
  const W2 = 1.9, H = 1.5, D = 1.4, zf = D / 2;
  b.add(box(W2, H, D), gm("#f6f1e6"), M);
  const tiles = ctex("glb_tiles", 256, 256, (g, r) => {
    g.fillStyle = "#b54f2c"; g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 32) {
      const l = 0.88 + r() * 0.24; g.fillStyle = `rgb(${215 * l},${108 * l},${62 * l})`;
      g.beginPath(); g.ellipse(x + 16, y + 18, 14, 16, 0, 0, Math.PI); g.fill();
      g.strokeStyle = "rgba(90,30,20,0.5)"; g.lineWidth = 2; g.stroke();
    }
  });
  tiles.repeat.set(3, 2);
  b.add(gable(W2 + 0.2, D, 0.55, 0.16), tm("tiles", tiles), M.clone().multiply(T(0, H, 0)));
  b.add(new THREE.BoxGeometry(0.46, 0.75, 0.04), gm("#6a3f26"), M.clone().multiply(T(0.1, 0.38, zf + 0.02)));
  b.add(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), gm("#6a3f26"), M.clone().multiply(T(0.1, 0.75, zf + 0.02)));
  for (const [x, y] of [[-0.6, 0.55], [0.72, 0.55], [-0.6, 1.15], [0.72, 1.15]] as [number, number][]) {
    windowAt(b, M, x, y, zf, 0.28, 0.34, "#f6f1e6", "#2d4f7a", false);
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.15, 0.36, 0.03), gm("#2f7fb8"), M.clone().multiply(T(x + s * 0.23, y, zf + 0.02)));
  }
  b.add(box(0.7, 0.05, 0.22), gm("#f6f1e6"), M.clone().multiply(T(0.1, 1.0, zf + 0.11)));
  for (let i = 0; i < 6; i++) b.add(cyl(0.008, 0.008, 0.22, 4), gm("#2b2d3a"), M.clone().multiply(T(-0.22 + i * 0.13, 1.05, zf + 0.21)));
  b.add(box(0.7, 0.02, 0.02), gm("#2b2d3a"), M.clone().multiply(T(0.1, 1.26, zf + 0.21)));
  for (let i = 0; i < 3; i++) {
    b.add(cyl(0.04, 0.06, 0.08, 10), gm("#c86a3c"), M.clone().multiply(T(-0.12 + i * 0.22, 1.05, zf + 0.12)));
    b.add(sph(0.06, 8, 6), gm(i === 1 ? "#ff5a8a" : "#e8343e"), M.clone().multiply(T(-0.12 + i * 0.22, 1.17, zf + 0.12)));
  }
  for (const x of [-0.28, 0.48]) { b.add(cyl(0.07, 0.11, 0.2, 12), gm("#c86a3c"), M.clone().multiply(T(x, 0, zf + 0.15))); b.add(sph(0.13, 10, 8), gm("#4f9a3c"), M.clone().multiply(T(x, 0.27, zf + 0.15))); }
};
const orangeTree = (b: Batch, M: THREE.Matrix4, seed: number) => {
  const r = rng(seed), leaf = gm("#3f8f3a"), leaf2 = gm("#4fa043"), fruit = gm("#ff9418");
  b.add(cyl(0.08, 0.05, 0.85, 8), gm("#8a5a3a"), M);
  const lobes: [number, number, number, number][] = [[0, 1.2, 0, 0.5], [0.32, 1.1, 0.1, 0.36], [-0.3, 1.12, -0.05, 0.38], [0.05, 1.45, 0.05, 0.36], [0, 1.05, 0.3, 0.34], [0.05, 1.08, -0.3, 0.34]];
  lobes.forEach(([x, y, z, rad], i) => b.add(sph(rad, 18, 12), i % 2 ? leaf2 : leaf, M.clone().multiply(T(x, y, z))));
  for (let i = 0; i < 26; i++) {
    const L = lobes[Math.floor(r() * lobes.length)], a = r() * Math.PI * 2, e = (r() - 0.25) * 1.3;
    const d = V(Math.cos(a) * Math.cos(e), Math.sin(e), Math.sin(a) * Math.cos(e)).multiplyScalar(L[3] * 0.97);
    b.add(sph(0.055, 10, 8), fruit, M.clone().multiply(T(L[0] + d.x, L[1] + d.y, L[2] + d.z)));
  }
  b.add(cyl(0.2, 0.2, 0.1, 18), gm("#e9dcc0"), M);
};
const NYHAVN = ["#f2c33c", "#d8473a", "#4f8fd0", "#ef8a34", "#7cc08a"];
const nyhavn = (b: Batch, M: THREE.Matrix4) => {
  const ws = [0.72, 0.8, 0.7, 0.78, 0.72], hs = [2.1, 2.5, 2.25, 2.6, 2.0];
  const tot = ws.reduce((a, c) => a + c, 0);
  let x = -tot / 2;
  ws.forEach((w, i) => {
    const cx = x + w / 2, H = hs[i], D = 1.0 + (i % 2) * 0.06, zf = D / 2, roof = i % 2 ? "#5a3a3a" : "#3e4a5e";
    b.add(box(w - 0.01, H + 0.25, D), gm(NYHAVN[i]), M.clone().multiply(T(cx, -0.25, 0)));
    b.add(gable(D + 0.06, w - 0.01, 0.5, 0.02).rotateY(Math.PI / 2), gm(roof), M.clone().multiply(T(cx, H, 0)));
    b.add(new THREE.BoxGeometry(w + 0.02, 0.06, 0.05), gm("#f4efe4"), M.clone().multiply(T(cx, H - 0.03, zf + 0.025)));
    const floors = Math.floor((H - 0.4) / 0.55);
    for (let f = 0; f < floors; f++) for (const wx of [-0.17, 0.17]) {
      if (f === 0 && wx < 0) continue;
      windowAt(b, M, cx + wx, 0.45 + f * 0.55, zf, 0.2, 0.3, "#f6f2ea", "#2d4166", false);
    }
    b.add(new THREE.BoxGeometry(0.22, 0.42, 0.04), gm("#3a2a2a"), M.clone().multiply(T(cx - 0.17, 0.21, zf + 0.02)));
    x += w;
  });
};
const windmill = (b: Batch, M: THREE.Matrix4) => {
  b.add(cyl(0.48, 0.3, 1.9, 8), gm("#f2eee6"), M);
  b.add(cyl(0.52, 0.52, 0.12, 8), gm("#7a4f36"), M.clone().multiply(T(0, 0.75, 0)));
  b.add(new THREE.SphereGeometry(0.36, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1.15), gm("#5b3c34"), M.clone().multiply(T(0, 1.88, 0)));
  b.add(new THREE.BoxGeometry(0.26, 0.42, 0.04), gm("#4a3226"), M.clone().multiply(T(0, 0.21, 0.46)));
  windowAt(b, M, 0, 1.25, 0.34, 0.16, 0.2, "#ffffff", "#2d4166", false);
  b.add(cyl(0.05, 0.05, 0.3, 8).rotateX(Math.PI / 2), gm("#4a3226"), M.clone().multiply(T(0, 2.0, 0.25)));
};
/** sails in their own local frame (hub at origin, sails in the xy plane, facing +z) */
const sailGeo = () => {
  const b = new Batch(), wood = gm("#7a5036"), cloth = gm("#f8f3ea", { side: THREE.DoubleSide });
  for (let k = 0; k < 4; k++) {
    const R = new THREE.Matrix4().makeRotationZ((k * Math.PI) / 2);
    b.add(new THREE.BoxGeometry(0.05, 1.25, 0.04).translate(0, 0.66, 0), wood, R);
    b.add(new THREE.PlaneGeometry(0.28, 0.95).translate(0.17, 0.78, -0.012), cloth, R);
    for (let j = 0; j < 5; j++) b.add(new THREE.BoxGeometry(0.3, 0.02, 0.03).translate(0.15, 0.34 + j * 0.22, 0.01), wood, R);
    b.add(new THREE.BoxGeometry(0.03, 0.95, 0.03).translate(0.31, 0.78, 0.01), wood, R);
  }
  b.add(sph(0.08, 12, 8), wood);
  const g = new THREE.Group(); b.build(g); return g;
};
const bollard = (b: Batch, M: THREE.Matrix4) => {
  const k = gm("#2c2e3a");
  b.add(cyl(0.09, 0.08, 0.24, 14), k, M);
  b.add(new THREE.SphereGeometry(0.1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), k, M.clone().multiply(T(0, 0.24, 0)));
  b.add(new THREE.TorusGeometry(0.095, 0.018, 6, 18).rotateX(Math.PI / 2), gm("#b89a6a"), M.clone().multiply(T(0, 0.14, 0)));
};
const rock = (b: Batch, M: THREE.Matrix4, s: number, col: string, seed: number) => {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = V(p.getX(i), p.getY(i), p.getZ(i)); const k = 0.88 + 0.12 * Math.sin(v.x * 4 + seed) * Math.cos(v.z * 3 + v.y * 2);
    p.setXYZ(i, v.x * k * 1.25, Math.max(v.y * k, -0.3) * 0.8, v.z * k);
  }
  g.computeVertexNormals();
  b.add(g, gm(col), M.clone().multiply(T(0, s * 0.2, 0, seed, 0, 0, [s * 0.8, s, s * 0.8])));
};
const kerb = (b: Batch, M: THREE.Matrix4) => { b.add(box(0.5, 0.16, 0.22), gm("#b9b4aa"), M.clone().multiply(T(0, -0.01, 0))); b.add(box(0.52, 0.02, 0.24), gm("#cfcac0"), M.clone().multiply(T(0, 0.15, 0))); };
const cobble = (b: Batch, M: THREE.Matrix4) => {
  b.add(new THREE.SphereGeometry(0.15, 14, 10).scale(1.2, 0.85, 1.0).translate(0, 0.1, 0), gm("#9c9890"), M);
  b.add(new THREE.SphereGeometry(0.07, 10, 8).scale(1.2, 0.8, 1).translate(0.2, 0.04, 0.05), gm("#8e8a82"), M);
};
const cloudOnStick = (b: Batch, M: THREE.Matrix4, h: number, seed: number) => {
  const r = rng(seed);
  b.add(cyl(0.022, 0.018, h, 6), gm("#8a6a4c"), M);
  const Wc = gm("#fbf6f0"), puffs: [number, number, number, number][] = [[0, 0.05, 0, 0.36], [-0.38, -0.04, 0.02, 0.27], [0.4, -0.03, -0.02, 0.29], [-0.14, 0.24, 0, 0.25], [0.2, 0.2, 0.03, 0.24], [0.66, -0.1, 0, 0.17], [-0.65, -0.12, 0, 0.16]];
  const sc = 0.85 + r() * 0.35, yaw = r() * 0.6 - 0.3;
  for (const [x, y, z, rad] of puffs) b.add(sph(rad * sc, 18, 12).scale(1, 0.86, 0.9), Wc, M.clone().multiply(T(0, h + 0.2, 0, yaw)).multiply(T(x * sc, y * sc, z)));
};
const sailboat = (b: Batch, M: THREE.Matrix4, col: string) => {
  const hull = new THREE.SphereGeometry(0.5, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.45, 0.32);
  b.add(hull, gm(col), M.clone().multiply(T(0, 0.12, 0)));
  b.add(new THREE.CircleGeometry(0.5, 18).rotateX(-Math.PI / 2).scale(1, 1, 0.32), gm("#d9b88a"), M.clone().multiply(T(0, 0.125, 0)));
  b.add(cyl(0.015, 0.012, 0.9, 6), gm("#6a4a36"), M.clone().multiply(T(0, 0.12, 0)));
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.38, 0); s.lineTo(0, 0.75); s.closePath();
  b.add(new THREE.ShapeGeometry(s), gm("#fffaf0", { side: THREE.DoubleSide }), M.clone().multiply(T(0.02, 0.24, 0)));
  const s2 = new THREE.Shape(); s2.moveTo(0, 0); s2.lineTo(-0.28, 0); s2.lineTo(0, 0.6); s2.closePath();
  b.add(new THREE.ShapeGeometry(s2), gm("#ff8a5a", { side: THREE.DoubleSide }), M.clone().multiply(T(-0.02, 0.24, 0)));
};
const signpost = (b: Batch, M: THREE.Matrix4) => {
  const wood = gm("#8a5a3a");
  b.add(cyl(0.06, 0.05, 1.9, 8), wood, M);
  b.add(new THREE.ConeGeometry(0.09, 0.14, 8).translate(0, 0.07, 0), gm("#c94a3a"), M.clone().multiply(T(0, 1.9, 0)));
  const names: [string, number, string][] = [["LONDON", 0, "#c94a3a"], ["PARIS", 90, "#3a5fb0"], ["MADRID", 180, "#e0a030"], ["KØBENHAVN", 270, "#c0303a"]];
  names.forEach(([nm, lon, col], i) => {
    const tex = ctex("glb_sign_" + nm, 512, 96, (g) => {
      g.fillStyle = "#f4e6c4"; g.fillRect(0, 0, 512, 96);
      g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(5, 5, 502, 86);
      g.fillStyle = "#2a2230"; g.font = "900 58px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(nm, 256, 50, 470);
    });
    // frame at the pole (lon 0): local x = world +x, z = world +z -> direction to lon L = (sin L, 0, cos L)
    const ang = Math.atan2(-Math.cos(lon * D2R), Math.sin(lon * D2R)); // rotation about y taking local +x onto it
    const bm = M.clone().multiply(new THREE.Matrix4().makeTranslation(0, 1.62 - i * 0.24, 0)).multiply(new THREE.Matrix4().makeRotationY(ang));
    const sh = new THREE.Shape(); sh.moveTo(0.06, -0.09); sh.lineTo(0.78, -0.09); sh.lineTo(0.9, 0); sh.lineTo(0.78, 0.09); sh.lineTo(0.06, 0.09); sh.closePath();
    b.add(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02), wood, bm);
    const tm2 = tm("sign" + nm, tex);
    b.add(new THREE.PlaneGeometry(0.7, 0.13).translate(0.43, 0, 0.026), tm2, bm);
    b.add(new THREE.PlaneGeometry(0.7, 0.13).rotateY(Math.PI).translate(0.43, 0, -0.026), tm2, bm);
  });
};

// ======================================================================================================
// sky + atmosphere + effects
// ======================================================================================================
const RIM_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RIM_FS = /* glsl */ `
uniform vec3 uC; uniform float uR; uniform vec3 uSun; uniform vec3 uAtm; uniform vec3 uNightA; uniform vec3 uWarm; uniform float uK;
varying vec3 vW;
void main(){
  vec3 d = normalize(vW - cameraPosition), oc = cameraPosition - uC;
  float b = dot(oc, d);
  float h = b < 0.0 ? sqrt(max(dot(oc, oc) - b * b, 0.0)) : length(oc);
  float a = max(h - uR, 0.0);
  vec3 tp = normalize(oc + max(-b, 0.0) * d);
  float sd = dot(tp, uSun);
  float day = smoothstep(-0.35, 0.3, sd);
  float sunAl = max(dot(d, uSun), 0.0);
  float g = exp(-a / 0.75), g2 = exp(-a / 0.2);
  float band = exp(-pow(sd / 0.3, 2.0));
  vec3 col = mix(uNightA, uAtm, day) * (g * 0.75 + g2 * 0.7) + uWarm * (band * (g * 0.9 + g2 * 0.6) + pow(sunAl, 6.0) * g * 0.6);
  float al = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0) * uK;
  gl_FragColor = vec4(col * uK, al);
}`;
const RINGS_FS = /* glsl */ `
uniform vec4 uRad; uniform vec4 uAl; uniform float uS; uniform vec3 uFill; uniform vec3 uInk; varying vec2 vUv;
void main(){
  float r = length(vUv - 0.5) * 2.0 * uS;
  vec4 c = vec4(0.0);
  for (int i = 0; i < 4; i++) {
    float d = abs(r - uRad[i]), w = 0.17;
    float core = 1.0 - smoothstep(w - 0.025, w + 0.005, d), ink = 1.0 - smoothstep(w + 0.05, w + 0.08, d);
    float glow = exp(-d / 0.9) * 0.16 * step(r, uRad[i]);
    vec3 col = ink > glow ? mix(uInk, uFill, core) : uFill;
    float a = max(ink, glow) * uAl[i];
    c.rgb = mix(c.rgb, col, a); c.a = max(c.a, a);
  }
  gl_FragColor = c;
}`;
const BUBBLE_WORDS = ["AU!", "ITAI!", "AIYO!", "OY!", "AJ!", "AHI!", "AI!", "JAJ!", "AŁA!", "AYA!", "AUA!", "AH!", "UFF!", "AAH!", "AUTS!", "OUCH!", "AÏ!", "ÁI!"];
const BUBBLE_FILL = ["#ffffff", "#fff4c2", "#ffe0ea", "#dff0ff", "#e4ffd8"];
const bubbleTex = (word: string, fill: string, flip: boolean) => ctex(`glb_bub_${word}_${fill}_${flip ? 1 : 0}`, 320, 220, (g) => {
  const cx = 160, cy = 92, rx = 140, ry = 74, tx = flip ? 1 : -1;
  g.lineJoin = "round"; g.lineCap = "round";
  g.fillStyle = "#241726"; g.strokeStyle = "#241726"; g.lineWidth = 16;
  g.beginPath(); g.ellipse(cx, cy, rx - 8, ry - 8, 0, 0, Math.PI * 2); g.stroke(); g.fill();
  g.beginPath(); g.moveTo(cx + tx * 30, cy + ry - 20); g.lineTo(cx + tx * 64, cy + ry + 50); g.lineTo(cx + tx * 72, cy + ry - 28); g.closePath(); g.stroke(); g.fill();
  g.fillStyle = fill;
  g.beginPath(); g.ellipse(cx, cy, rx - 9, ry - 9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx + tx * 34, cy + ry - 22); g.lineTo(cx + tx * 62, cy + ry + 38); g.lineTo(cx + tx * 66, cy + ry - 28); g.closePath(); g.fill();
  g.fillStyle = "#241726"; g.font = "900 64px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(word, cx, cy + 4, rx * 1.5);
});
const ahTex = () => ctex("glb_AH", 1024, 512, (g) => {
  g.font = "900 330px Arial Black, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.save(); g.translate(512, 262); g.rotate(-0.06);
  g.lineWidth = 46; g.strokeStyle = "#241726"; g.strokeText("AH!", 0, 0);
  const gr = g.createLinearGradient(0, -140, 0, 140); gr.addColorStop(0, "#fff7b8"); gr.addColorStop(0.55, "#ffd04a"); gr.addColorStop(1, "#ff8a2a");
  g.fillStyle = gr; g.fillText("AH!", 0, 0);
  g.restore();
});
const softDot = () => ctex("glb_dot", 64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,0.7)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const backOut = (u: number) => { const x = clamp01(u), s = 2.2; return 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2); };

// ======================================================================================================
type Bub = { sp: THREE.Sprite; pos: THREE.Vector3; d: number; w: number; ph: number };
// DEBUG camera override (null = off)
export const DBG = (lon: number) => { const c = countryCam(lon); return { pos: c.pos, look: c.look, fov: 40 }; };
const DEBUGS: Record<number, { pos: V3; look: V3; fov: number }> = {}; // e.g. { 700: DBG(90) } (keep empty when done)

export class Globe {
  root = new THREE.Group();
  private planet = new THREE.Group();
  private sails!: THREE.Group; private sailBase = new THREE.Matrix4();
  private rimMat!: THREE.ShaderMaterial; private rim!: THREE.Mesh; private domeMat!: THREE.ShaderMaterial; private dome!: THREE.Mesh;
  private stars!: THREE.Points; private skyGroup = new THREE.Group();
  private bubbles: Bub[] = [];
  private rings!: THREE.Mesh; private ringMat!: THREE.ShaderMaterial; private ah!: THREE.Sprite;
  private sunV = new THREE.Vector3();

  constructor() {
    this.root.add(this.planet, this.skyGroup);
    this.root.visible = false;
    this.buildPlanet();
    this.buildSky();
    this.buildFx();
  }

  private buildPlanet() {
    const P = this.planet;
    const ground = new THREE.Mesh(new THREE.SphereGeometry(PLANET_R, 224, 160), wrap(new THREE.MeshLambertMaterial({ color: "#ffffff" }), PLANET_PAINT));
    ground.position.copy(C0); ground.castShadow = false; ground.receiveShadow = true; ground.frustumCulled = false; P.add(ground);
    const b = new FB();
    const I = () => new THREE.Matrix4();
    const at = (lon: number, lat: number, yaw = 0, sink = 0.08) => { b.M = frameAt(lon, lat, yaw, sink); };
    const veg = (k: VegKind, h: number, seed: number, q = 0) => addVeg(b, k, 0, 0, 0, h, seed, q);
    // ---- UK / US (lon 0) ----
    at(-17, 57, 12, 0.12); ukHouse(b, I());
    at(16, 52, -18, 0.06); phoneBox(b, I());
    at(-6, 50, 0, 0.04); lampPost(b, I());
    at(7, 64, 0, 0.04); flag(b, I(), "uk", 1.5);
    at(31, 58, 0, 0.1); veg("round", 1.7, 101);
    at(-31, 49, 0, 0.1); veg("bush", 0.6, 102);
    // ---- France (lon 90) ----
    at(106, 61, -12, 0.08); eiffel(b, I());
    at(73, 56, 14, 0.12); cafe(b, I());
    at(95, 69, 0, 0.04); flag(b, I(), "fr", 1.5);
    at(124, 54, 0, 0.1); veg("tall", 2.0, 201);
    at(58, 63, 0, 0.1); veg("tall", 1.9, 202);
    at(118, 47, 0, 0.1); veg("bush", 0.55, 203);
    // ---- Spain (lon 180) ----
    at(197, 56, -14, 0.12); whiteHouse(b, I());
    at(164, 53, 0, 0.06); orangeTree(b, I(), 301);
    at(182, 67, 0, 0.04); flag(b, I(), "es", 1.5);
    at(148, 61, 0, 0.06); orangeTree(b, I(), 302);
    at(214, 48, 0, 0.1); veg("bush", 0.5, 303);
    // ---- Denmark (lon 270) ----
    at(289, 61, -6, 0.3); nyhavn(b, I());
    at(250, 53, 10, 0.08); windmill(b, I());
    this.sailBase = frameAt(250, 53, 10, 0.08).multiply(T(0, 2.0, 0.42));
    at(268, 69, 0, 0.04); flag(b, I(), "dk", 1.5);
    at(236, 60, 0, 0.1); veg("cone", 1.8, 401);
    at(306, 48, 0, 0.1); veg("bush", 0.5, 402);
    // ---- stub obstacles (exactly at STAND[*].stub) ----
    for (const c of COUNTRIES) {
      const s = STAND[c.key];
      at(s.lon + STUB_DLON, s.lat, 0, 0.03);
      if (c.key === "uk") kerb(b, I()); else if (c.key === "fr") cobble(b, I()); else if (c.key === "es") rock(b, I(), 0.2, "#b8a68a", 7); else bollard(b, I());
    }
    // ---- north pole signpost ----
    b.M = frameAt(0, 90, 0, 0.04); signpost(b, I());
    // ---- clouds on sticks, trees between the quarters, boats ----
    const sticks: [number, number, number][] = [[45, 30, 2.6], [135, 27, 2.3], [225, 31, 2.8], [315, 28, 2.4], [24, 76, 2.1], [160, 74, 2.4], [252, 75, 1.9], [338, 73, 2.6]];
    sticks.forEach(([lon, lat, h], i) => { at(lon, lat, 0, 0.05); cloudOnStick(b, I(), h, 50 + i); });
    const trees: [number, number, VegKind, number][] = [[50, 52, "round", 1.5], [40, 40, "cone", 1.3], [140, 48, "round", 1.6], [130, 38, "bush", 0.6], [222, 50, "round", 1.5], [232, 40, "cone", 1.4],
      [318, 50, "round", 1.6], [326, 38, "fat", 1.3], [10, 24, "cone", 1.0], [80, 25, "round", 1.2], [190, 24, "fat", 1.0], [282, 25, "cone", 1.2], [60, 80, "bush", 0.5], [205, 80, "bush", 0.5]];
    trees.forEach(([lon, lat, k, h], i) => { at(lon, lat, 0, 0.1); veg(k, h, 600 + i * 7, 1); });
    const boats: [number, number, string][] = [[28, -14, "#e8e2d6"], [205, -12, "#d8473a"], [300, -16, "#4f8fd0"], [118, -18, "#f2c33c"]];
    boats.forEach(([lon, lat, col], i) => { at(lon, lat, 20 + i * 70, 0.12); sailboat(b, I(), col); });
    b.build(P);
    P.traverse((o) => { o.frustumCulled = false; });
    this.sails = sailGeo(); this.sails.matrixAutoUpdate = false; P.add(this.sails);
    this.sails.traverse((o) => { o.frustumCulled = false; o.castShadow = true; o.receiveShadow = true; });
  }

  private buildSky() {
    const S = this.skyGroup;
    // twilight dome that also continues BELOW the horizon (the planet floats in space): indigo under, rose-peach band
    // at the horizon, indigo above
    const st = ["#232658", "#4a3f7c", "#9a6c98", "#e9a487", "#f7c095", "#e79a8a", "#7e5f99", "#262a62"], se = [-75, -38, -16, -5, 1, 9, 26, 60];
    const cols = st.map((h) => untone(h)), els = se.map((d) => Math.sin(d * D2R));
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: cols }, uE: { value: els } },
      vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 uC[8]; uniform float uE[8]; varying vec3 vP;
        void main(){ float y = normalize(vP).y; vec3 c = uC[0];
          for (int i = 1; i < 8; i++) c = mix(c, uC[i], smoothstep(uE[i - 1], uE[i], y));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(700, 48, 32), this.domeMat);
    this.dome.frustumCulled = false; this.dome.layers.set(NOINK); this.dome.renderOrder = -0.95; S.add(this.dome);
    this.rimMat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: C0.clone() }, uR: { value: PLANET_R }, uSun: { value: V(0, 1, 0) }, uAtm: { value: untone("#8fc0ff") }, uNightA: { value: untone("#3a4ab0") },
        uWarm: { value: new THREE.Color(1.0, 0.5, 0.22) }, uK: { value: 1 } },
      vertexShader: RIM_VS, fragmentShader: RIM_FS, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    });
    this.rim = new THREE.Mesh(new THREE.SphereGeometry(600, 64, 32), this.rimMat);
    this.rim.frustumCulled = false; this.rim.layers.set(NOINK); this.rim.renderOrder = -0.8; S.add(this.rim);
    const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), r = rng(4243);
    for (let i = 0; i < N; i++) {
      const u0 = r() * 2 - 1, u = Math.sign(u0) * (0.1 + Math.abs(u0) * 0.9), a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), k = r() < 0.06 ? 1.6 + r() : 0.25 + r() * r() * 0.9;
      pos.set([Math.cos(a) * s * 650, u * 650, Math.sin(a) * s * 650], i * 3);
      const fade = smooth((Math.abs(u) - 0.12) / 0.3) * (u < 0 ? 0.7 : 1);
      col.set([k * fade, k * 0.95 * fade, k * 1.1 * fade], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: true, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.stars.frustumCulled = false; this.stars.layers.set(NOINK); this.stars.renderOrder = -0.9; S.add(this.stars);
    // a sea of golden clouds far below the floating planet (fixed in the world)
    const rc = rng(919);
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rc() * 0.2, d = 26 + rc() * 22, w = 12 + rc() * 10;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(30 + (i % 7), CLOUD_GOLD), transparent: true, depthWrite: false, fog: false, opacity: 0.95 }));
      sp.position.set(PLANET_C[0] + Math.sin(a) * d, PLANET_C[1] - 8 - rc() * 6, PLANET_C[2] + Math.cos(a) * d);
      sp.scale.set(w, w / 2, 1); sp.layers.set(NOINK); sp.frustumCulled = false; sp.renderOrder = -0.7;
      S.add(sp);
    }
  }

  private buildFx() {
    const r = rng(1313);
    let tries = 0;
    while (this.bubbles.length < 44 && tries++ < 600) {
      const lon = r() * 360, lat = -12 + r() * 92;
      const nn = V(...nrm(lon, lat));
      if (COUNTRIES.some((c) => V(...nrm(c.lon, STAND_LAT)).dot(nn) > Math.cos(16 * D2R))) continue;
      if (this.bubbles.some((o) => o.pos.clone().sub(C0).normalize().dot(nn) > Math.cos(17 * D2R))) continue;
      const i = this.bubbles.length, word = BUBBLE_WORDS[i % BUBBLE_WORDS.length];
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex(word, BUBBLE_FILL[i % BUBBLE_FILL.length], r() < 0.5), transparent: true, depthWrite: false, fog: false }));
      sp.layers.set(NOINK); sp.frustumCulled = false; sp.visible = false; sp.renderOrder = 2;
      const h = 1.8 + r() * 0.8;
      this.bubbles.push({ sp, pos: V(...surf(lon, lat, h)), d: r() * 0.72, w: 1.25 + r() * 0.4, ph: r() * 6.28 });
      this.root.add(sp);
    }
    this.ringMat = new THREE.ShaderMaterial({
      uniforms: { uRad: { value: new THREE.Vector4() }, uAl: { value: new THREE.Vector4() }, uS: { value: 20 }, uFill: { value: untone("#fff0a0") }, uInk: { value: new THREE.Color("#241726") } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: RINGS_FS, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
    });
    this.rings = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), this.ringMat);
    this.rings.layers.set(NOINK); this.rings.frustumCulled = false; this.rings.renderOrder = 1; this.rings.visible = false; this.root.add(this.rings);
    this.ah = new THREE.Sprite(new THREE.SpriteMaterial({ map: ahTex(), transparent: true, depthWrite: false, depthTest: false, fog: false }));
    this.ah.layers.set(NOINK); this.ah.frustumCulled = false; this.ah.renderOrder = 3; this.ah.visible = false; this.root.add(this.ah);
  }

  update(id: number, t: number, _f: number, cam: THREE.Camera) {
    const on = SHOTS[id - 1].place === "globe";
    this.root.visible = on;
    if (!on) return;
    const DEBUG = DEBUGS[_f];
    if (DEBUG) {
      const pc = cam as THREE.PerspectiveCamera;
      pc.position.set(...DEBUG.pos); pc.up.set(0, 1, 0); pc.lookAt(...DEBUG.look); pc.fov = DEBUG.fov; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
    }
    const cp = cam.position;
    // ---- planet sun: fixed relative to the camera; re-aim the world's shadow-casting sun ----
    const sd = globeSun(cp, this.sunV);
    const sun = this.root.parent?.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight) as THREE.DirectionalLight | undefined;
    if (sun) { sun.position.copy(sun.target.position).addScaledVector(sd, 500); sun.updateMatrixWorld(); }
    (HZ.uPSun.value as THREE.Vector3).copy(sd);
    (this.rimMat.uniforms.uSun.value as THREE.Vector3).copy(sd);
    this.rim.position.copy(cp); this.stars.position.copy(cp); this.dome.position.copy(cp);
    // ---- windmill ----
    this.sails.matrix.copy(this.sailBase).multiply(new THREE.Matrix4().makeRotationZ(-t * 0.9));
    this.sails.matrixWorldNeedsUpdate = true;
    // ---- many bubbles (planetAt.many) ----
    const pa = planetAt(id, t);
    const camUp = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1);
    for (const bb of this.bubbles) {
      const k = clamp01((pa.many - bb.d) / 0.28);
      bb.sp.visible = k > 0.001;
      if (!bb.sp.visible) continue;
      const sc = backOut(k) * bb.w * (1 - 0.15 * pa.ah);
      bb.sp.position.copy(bb.pos).addScaledVector(camUp, 0.06 * Math.sin(t * 2.2 + bb.ph));
      bb.sp.scale.set(sc, sc * 0.69, 1);
      (bb.sp.material as THREE.SpriteMaterial).opacity = smooth(k * 3);
    }
    // ---- the AH ring (planetAt.ah) ----
    const ah = pa.ah;
    this.rings.visible = this.ah.visible = ah > 0.001;
    if (ah > 0.001) {
      this.rings.position.copy(C0); this.rings.quaternion.copy(cam.quaternion);
      const per = 0.55, t0 = W.ah - 0.1, n = Math.floor((t - t0) / per);
      const rad = this.ringMat.uniforms.uRad.value as THREE.Vector4, al = this.ringMat.uniforms.uAl.value as THREE.Vector4;
      for (let i = 0; i < 4; i++) {
        const k = n - i, age = t - (t0 + k * per);
        if (k < 0 || age < 0) { rad.setComponent(i, 0); al.setComponent(i, 0); continue; }
        rad.setComponent(i, PLANET_R + 0.35 + 10 * (1 - Math.exp(-age * 0.9)));
        al.setComponent(i, ah * smooth(age / 0.12) * (1 - smooth((age - per * 1.6) / (per * 2.2))));
      }
      const fwd = new THREE.Vector3().subVectors(C0, cp).normalize();
      this.ah.position.copy(C0).addScaledVector(camUp, PLANET_R + 2.3).addScaledVector(fwd, -PLANET_R * 0.6);
      const s2 = backOut(ah) * 5.2;
      this.ah.scale.set(s2, s2 / 2, 1);
      (this.ah.material as THREE.SpriteMaterial).opacity = smooth(ah * 2);
    }
  }
}
