// OWNER: ext agent. The two outdoor sets of the burp short (one Group per place, only the shot's place is shown):
//   EARTH : a backyard at golden hour: lawn, cedar board fence, deck chair (BEAN sits in it at EARTH), side table for
//           the soda, kettle grill with a smoke wisp, the back wall of the house (lit kitchen window, door, lamp),
//           string lights, trees, a neighbour's roof and hazy hills behind, low golden clouds.
//   ORBIT : black space, instanced stars, the curved Earth (an analytic ray-traced sphere on a camera shell: crisp
//           coastlines, cartoon clouds, city lights on the night side, a glowing blue atmosphere rim with a warm
//           band toward the sun), a low HDR sun with glare on the limb, the 1985 orbiter (open payload bay, Spacelab
//           pallets, a raised arm) at ORBIT+(100,0,0), and a space station (modules, cupola with a lit window, truss,
//           golden solar arrays, radiators) at ORBIT+(-200,0,0).
// The Earth shell + stars also run in the STATION / MIDDECK places (seen only through their windows).
// Everything is a pure function of (id, t): seeded hashes only.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, V, lam, boxGeo, addVeg } from "../bridge/build";
import { ctex, rng, grassHD, cloudHD, CLOUD_GOLD } from "../bridge/paint";
import { twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { SHOTS, camAt, EARTH, ORBIT, smooth, clamp01, V3, FPS } from "./story";
import { LOOKS } from "./looks";

// ======================================================================================================
// contracts for other owners (world coordinates)
// ======================================================================================================
const add3 = (a: V3, x: number, y: number, z: number): V3 => [a[0] + x, a[1] + y, a[2] + z];
/** deck chair at EARTH (faces +z). Sling front bar top y 0.47 at z +0.36, seat low point y 0.24 at z -0.12,
 *  back rail top y 1.06 at z -0.62. Put BEAN's card at CHAIR_SEAT (bottom of the card ~ on the seat). */
export const CHAIR: V3 = add3(EARTH, 0, 0, 0);
export const CHAIR_SEAT: V3 = add3(EARTH, 0, 0.22, 0.02);
/** little round side table right of the chair: top centre (radius 0.26 m, left rim at x +0.36) for the soda can */
export const TABLE_TOP: V3 = add3(EARTH, 0.62, 0.42, 0.2);
/** Earth below ORBIT: radius EARTH_R, ORBIT is EARTH_ALT above the surface -> horizon dip 15 deg near ORBIT */
export const EARTH_R = 9000, EARTH_ALT = EARTH_R * (1 / Math.cos((15 * Math.PI) / 180) - 1); // ~317.6 m
/** orbiter: centre ORBIT+(100,0,0), nose along local +x, bay opening local +y; yaw 0.3 (nose turned away from +z),
 *  roll 0.42 (bay tipped toward +z = toward the shot-5 camera). Length 40 m (x -20.7..+19 incl. engines), span 24 m. */
export const SHUTTLE: V3 = add3(ORBIT, 100, 0, 0);
export const SHUTTLE_YAW = 0.3, SHUTTLE_ROLL = 0.42;
/** station: centre ORBIT+(-200,0,0); modules along x (r 2.1), cupola on the +z side at local x 0. The cupola window
 *  (round, r 1.0, centre y 0.3) faces +z; its glass centre is STATION_WINDOW. The shot-9 card stands at STATION_CARD
 *  = ORBIT+(-200,0,2) (cast contract), 0.96 m behind the glass, 0.45 m in front of the lit back wall; the window
 *  spans y -0.7..1.3, so a card ~1.2 m tall based at y -0.4 fits; the cupola glows warm from inside. */
export const STATION_EXT: V3 = add3(ORBIT, -200, 0, 0);
export const STATION_WINDOW: V3 = add3(ORBIT, -200, 0.3, 2.96);
export const STATION_CARD: V3 = add3(ORBIT, -200, 0, 2);

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const TAU = Math.PI * 2;
const lamC = (key: string, color: string) => lam("bx_" + key, () => ({ color }));
const lamT = (key: string, map: THREE.Texture, extra: THREE.MeshLambertMaterialParameters = {}) => lam("bx_" + key, () => ({ map, ...extra }));
const M4 = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: V3 = [1, 1, 1]) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), V(...s));
const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number, n = 8, r2 = r) => {
  const d = b.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r2, r, L, n, 1, false).translate(0, L / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
  return g;
};
/** position + normal only, non-indexed (so differently built pieces merge) */
const pn = (g: THREE.BufferGeometry) => {
  const x = g.index ? g.toNonIndexed() : g;
  if (!x.attributes.normal) x.computeVertexNormals();
  for (const k of Object.keys(x.attributes)) if (k !== "position" && k !== "normal") x.deleteAttribute(k);
  return x;
};
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, cast = true) => {
  const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; o.frustumCulled = false; parent.add(o); return o;
};
/** matrix: translate(x,y,z) * rotY(yaw) * translate(lx,ly,lz) */
const MT = (x: number, y: number, z: number, yaw: number, lx: number, ly: number, lz: number) =>
  new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationY(yaw)).multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz));

// ---------------- paint materials (white stays white; soft rim) ----------------
const PAINT_GLSL = /* glsl */ `
vec3 pLit( vec3 c ) { float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); return mix( vec3( l ) * vec3( 1.04, 1.0, 0.95 ), c, 0.5 ) * 1.04; }
vec3 pShade( vec3 c ) { float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); return mix( vec3( l ) * vec3( 0.95, 0.98, 1.06 ), c, 0.45 ) * max( 1.0, 0.4 / max( l, 1e-3 ) ); }
`;
const mats = new Map<string, THREE.Material>();
/** two-tone tuned for white paint in space + optional local-position painter (glsl: vec3 painter(vec3 p)) */
const paint = (key: string, p: THREE.MeshPhongMaterialParameters, painter = "", rim = 0.18) => {
  let m = mats.get(key) as THREE.MeshPhongMaterial | undefined;
  if (m) return m;
  const mm = twoTone(new THREE.MeshPhongMaterial({ specular: "#262626", shininess: 26, ...p }), 0.2);
  const base = mm.onBeforeCompile;
  mm.onBeforeCompile = (sh, r) => {
    base.call(mm, sh, r);
    if (painter) {
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vLp;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvLp = position;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vLp;\n" + painter)
        .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= painter( vLp );");
    }
    sh.fragmentShader = sh.fragmentShader
      .replace("uniform float uSat;", "uniform float uSat;\n" + PAINT_GLSL)
      .replace("vec3 lit = uLitCol *", "vec3 lit = pLit( uLitCol ) *")
      .replace("albSh * uShadeCol * skyK", "albSh * pShade( uShadeCol ) * skyK")
      .replace("reflectedLight.indirectDiffuse = vec3( 0.0 );", `reflectedLight.indirectDiffuse = alb * pShade( uShadeCol ) * pow( 1.0 - facing, 3.0 ) * ${rim.toFixed(3)} * 3.0;`);
  };
  mm.customProgramCacheKey = () => "bxPaint_" + key;
  mats.set(key, mm);
  return mm;
};
const glow = (key: string, c: [number, number, number], extra: THREE.MeshBasicMaterialParameters = {}) => {
  let m = mats.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color: new THREE.Color(...c), fog: false, ...extra }); mats.set(key, m); }
  return m;
};

// ---------------- textures ----------------
const softDot = (key: string, k = 1) => ctex(key, 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18 * k, "rgba(255,255,255,0.75)"); gr.addColorStop(0.5, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const sunTex = () => ctex("bx_sun", 256, 256, (g) => {
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.42, "rgba(255,255,255,1)"); gr.addColorStop(0.5, "rgba(255,255,255,0.55)"); gr.addColorStop(0.62, "rgba(255,255,255,0.12)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
});
const streakTex = () => ctex("bx_streak", 512, 64, (g) => {
  for (let x = 0; x < 512; x++) {
    const u = Math.abs(x - 256) / 256, a = Math.pow(1 - u, 3);
    const gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x, 0, 1, 64);
  }
});
/** one soft blur pass over a finished canvas (a single filter op: cheap, unlike per-draw filters) */
const soften = (g: CanvasRenderingContext2D, px: number) => {
  const c = g.canvas, tmp = document.createElement("canvas"); tmp.width = c.width; tmp.height = c.height;
  const t2 = tmp.getContext("2d")!; t2.drawImage(c, 0, 0);
  g.save(); g.filter = `blur(${px}px)`; for (const ox of [-c.width, 0, c.width]) for (const oy of [-c.height, 0, c.height]) g.drawImage(tmp, ox, oy); g.restore();
};
const dataTex = (t: THREE.CanvasTexture) => { t.colorSpace = THREE.NoColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; };
/** tileable soft field (thresholded in the Earth shader, so edges stay crisp at any magnification) */
const fieldTex = (key: string, n: number, r0: number, r1: number, seed: number) => dataTex(ctex(key, 1024, 1024, (g) => {
  const r = rng(seed);
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < n; i++) {
    const x = r() * 1024, y = r() * 1024, rad = r0 + (r1 - r0) * r() ** 2, a = 0.25 + r() * 0.5, sx = 0.6 + r() * 1.2, rot = r() * TAU;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.save(); g.translate(x + ox, y + oy); g.rotate(rot); g.scale(sx, 1 / sx); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill(); g.restore();
    }
  }
  soften(g, 8);
}));
/** cloud streets: curled strokes + puffs */
const cloudTex = () => dataTex(ctex("bx_cloudField", 1024, 1024, (g) => {
  const r = rng(9091);
  g.fillStyle = "#000"; g.fillRect(0, 0, 1024, 1024);
  g.lineCap = "round";
  for (let i = 0; i < 170; i++) {
    const x = r() * 1024, y = r() * 1024, w = 10 + r() * 46, L = 60 + r() * 240, a = r() * 0.6 - 0.3, curl = (r() - 0.5) * 2.2, al = 0.35 + r() * 0.45;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) {
      g.strokeStyle = `rgba(255,255,255,${al})`; g.lineWidth = w;
      g.beginPath(); g.moveTo(x + ox, y + oy);
      g.bezierCurveTo(x + ox + Math.cos(a) * L * 0.4, y + oy + Math.sin(a) * L * 0.4 + curl * 30, x + ox + Math.cos(a) * L * 0.7, y + oy + Math.sin(a) * L * 0.7 - curl * 40, x + ox + Math.cos(a + curl * 0.6) * L, y + oy + Math.sin(a + curl * 0.6) * L);
      g.stroke();
    }
  }
  for (let i = 0; i < 300; i++) {
    const x = r() * 1024, y = r() * 1024, rad = 6 + r() * 22, al = 0.3 + r() * 0.5;
    for (const ox of [-1024, 0, 1024]) for (const oy of [-1024, 0, 1024]) { g.fillStyle = `rgba(255,255,255,${al})`; g.beginPath(); g.arc(x + ox, y + oy, rad, 0, TAU); g.fill(); }
  }
  soften(g, 5);
}));
const cityTex = () => dataTex(ctex("bx_city", 512, 512, (g) => {
  const r = rng(5151);
  g.fillStyle = "#000"; g.fillRect(0, 0, 512, 512);
  for (let c = 0; c < 26; c++) {
    const cx = r() * 512, cy = r() * 512, n = 10 + Math.floor(r() * 50), sp = 4 + r() * 16;
    for (let i = 0; i < n; i++) {
      const x = (cx + (r() - 0.5) * sp * 2 + 512) % 512, y = (cy + (r() - 0.5) * sp * 2 + 512) % 512;
      g.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; g.fillRect(x, y, 1 + r() * 2, 1 + r() * 2);
    }
  }
}));
const goldFoil = () => ctex("bx_goldFoil", 512, 512, (g, r) => {
  g.fillStyle = "#d9a441"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const x = r() * 512, y = r() * 512, w = 20 + r() * 70, h = 10 + r() * 40, lit = r() < 0.5;
    g.fillStyle = lit ? `rgba(255,236,160,${0.25 + r() * 0.3})` : `rgba(140,84,20,${0.2 + r() * 0.3})`;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + (r() - 0.5) * h); g.lineTo(x + w * 0.6, y + h); g.closePath(); g.fill();
  }
});
const quiltTex = (key: string, base: string, line: string, cell = 64) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += cell) for (let x = 0; x < 512; x += cell) {
    const gr = g.createRadialGradient(x + cell / 2, y + cell / 2, 2, x + cell / 2, y + cell / 2, cell * 0.7);
    gr.addColorStop(0, "rgba(255,255,255,0.18)"); gr.addColorStop(1, "rgba(90,96,110,0.16)");
    g.fillStyle = gr; g.fillRect(x, y, cell, cell);
    g.fillStyle = `rgba(120,120,130,${r() * 0.06})`; g.fillRect(x, y, cell, cell);
  }
  g.strokeStyle = line; g.lineWidth = 3;
  for (let i = 0; i <= 512; i += cell) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
});
const arrayTex = () => ctex("bx_array", 512, 1024, (g, r) => {
  g.fillStyle = "#4a3418"; g.fillRect(0, 0, 512, 1024);
  const cw = 512 / 8, chh = 1024 / 32;
  for (let j = 0; j < 32; j++) for (let i = 0; i < 8; i++) {
    const l = 0.85 + r() * 0.3;
    const gr = g.createLinearGradient(i * cw, j * chh, (i + 1) * cw, (j + 1) * chh);
    gr.addColorStop(0, `rgb(${Math.round(250 * l)},${Math.round(196 * l)},${Math.round(88 * l)})`);
    gr.addColorStop(1, `rgb(${Math.round(228 * l)},${Math.round(160 * l)},${Math.round(58 * l)})`);
    g.fillStyle = gr; g.fillRect(i * cw + 3, j * chh + 3, cw - 6, chh - 6);
  }
  g.fillStyle = "rgba(255,240,200,0.18)"; for (let j = 0; j < 1024; j += 128) g.fillRect(0, j, 512, 6);
});
const radiatorTex = () => ctex("bx_rad", 512, 512, (g) => {
  g.fillStyle = "#e9ecef"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "rgba(120,130,150,0.35)"; for (let x = 0; x < 512; x += 32) g.fillRect(x, 0, 4, 512);
  g.fillStyle = "rgba(120,130,150,0.5)"; for (let y = 0; y < 512; y += 128) g.fillRect(0, y, 512, 6);
});
const textTex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => ctex(key, w, h, (g) => { g.clearRect(0, 0, w, h); draw(g); });

// ---------------- geometry helpers ----------------
type St = { x: number; w: number; yb: number; yt: number; p?: number };
/** lofted superellipse body along x (stations sorted by x), capped ends, smooth normals */
const loft = (sts: St[], N = 56, caps = true) => {
  const pos: number[] = [], idx: number[] = [];
  const ring = (s: St) => {
    const out: number[][] = [], e = 2 / (s.p ?? 2.5), ym = (s.yb + s.yt) / 2, hy = (s.yt - s.yb) / 2;
    for (let i = 0; i < N; i++) { const a = (i / N) * TAU, c = Math.cos(a), sn = Math.sin(a); out.push([s.x, ym + hy * Math.sign(sn) * Math.abs(sn) ** e, s.w * Math.sign(c) * Math.abs(c) ** e]); }
    return out;
  };
  const rings = sts.map(ring);
  for (const rg of rings) for (const p of rg) pos.push(...p);
  for (let j = 0; j < sts.length - 1; j++) for (let i = 0; i < N; i++) {
    const a = j * N + i, b = j * N + ((i + 1) % N), c = a + N, d = b + N;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const parts = [pn(g)];
  if (caps) for (const [k, sgn] of [[0, -1], [sts.length - 1, 1]] as [number, number][]) {
    const s = sts[k], rg = rings[k], cp: number[] = [], C = [s.x, (s.yb + s.yt) / 2, 0];
    for (let i = 0; i < N; i++) { const a = rg[i], b = rg[(i + 1) % N]; if (sgn < 0) cp.push(...C, ...a, ...b); else cp.push(...C, ...b, ...a); }
    const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(cp, 3)); cg.computeVertexNormals(); parts.push(cg);
  }
  return mergeGeometries(parts, false);
};
/** profile (z,y)[] swept along x from x0 to x1 (open surface, uv); wantUp = mean normal should point +y */
const sweep = (prof: [number, number][], x0: number, x1: number, wantUp: boolean) => {
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i < prof.length - 1; i++) {
    const [za, ya] = prof[i], [zb, yb] = prof[i + 1], u0 = i / (prof.length - 1), u1 = (i + 1) / (prof.length - 1);
    pos.push(x0, ya, za, x0, yb, zb, x1, yb, zb, x0, ya, za, x1, yb, zb, x1, ya, za);
    uv.push(0, u0, 0, u1, 1, u1, 0, u0, 1, u1, 1, u0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  const n = g.attributes.normal as THREE.BufferAttribute;
  let sy = 0; for (let i = 0; i < n.count; i++) sy += n.getY(i);
  if ((sy > 0) !== wantUp) {
    const p = g.attributes.position as THREE.BufferAttribute, u = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i += 3) for (const at of [p, u]) for (let c = 0; c < at.itemSize; c++) { const t = at.getComponent(i + 1, c); at.setComponent(i + 1, c, at.getComponent(i + 2, c)); at.setComponent(i + 2, c, t); }
    g.computeVertexNormals();
  }
  return g;
};

// ======================================================================================================
// Earth shell shader (analytic sphere, camera-centred shell; numerically stable near the limb)
// ======================================================================================================
const EARTH_VS = /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH_FS = /* glsl */ `
uniform vec3 uC; uniform float uR; uniform vec3 uSun; uniform vec2 uDrift; uniform float uNight; uniform float uRimK;
uniform sampler2D uLand; uniform sampler2D uCloud; uniform sampler2D uCity;
uniform vec3 uOcean; uniform vec3 uShallow; uniform vec3 uGreen; uniform vec3 uDesert; uniform vec3 uAtm; uniform vec3 uWarm;
varying vec3 vW;
float landAt(vec2 q){ return texture2D(uLand, q / 5200.0 + vec2(0.37, 0.11)).r * 0.8 + texture2D(uLand, q / 1300.0 + vec2(0.61, 0.23)).r * 0.35; }
float cloudAt(vec2 q){ return texture2D(uCloud, q / 2600.0 + uDrift).r * 0.85 + texture2D(uCloud, q.yx / 760.0 + uDrift * 2.3 + vec2(0.3, 0.7)).r * 0.4; }
void main(){
  vec3 d = normalize(vW - cameraPosition);
  vec3 oc = cameraPosition - uC;
  float H = oc.y - uR;
  float c = dot(oc.xz, oc.xz) + H * (2.0 * uR + H);
  float b = dot(oc, d);
  float disc = b * b - c;
  float alt = b > 0.0 ? H : -disc / (sqrt(max(uR * uR - disc, 1.0)) + uR);   // rays pointing away: nearest point is the lens
  float sunAl = max(dot(d, uSun), 0.0);
  vec4 outc = vec4(0.0);
  if (disc > 0.0 && -b - sqrt(disc) > 0.0) {
    float t = -b - sqrt(disc);
    vec3 p = oc + t * d, n = p / uR;
    vec2 q = p.xz;
    float ndl = dot(n, uSun);
    float day = smoothstep(-0.16, 0.28, ndl);
    float L = landAt(q), land = smoothstep(0.3, 0.325, L), shallow = smoothstep(0.2, 0.3, L) * (1.0 - land);
    float des = texture2D(uLand, q / 3100.0 + vec2(0.2, 0.5)).r;
    vec3 col = mix(uOcean, uShallow, shallow * 0.8);
    vec3 lc = mix(uGreen, uDesert, smoothstep(0.3, 0.5, des));
    lc *= 0.9 + 0.2 * texture2D(uLand, q / 420.0).r;
    col = mix(col, lc, land);
    float cd = cloudAt(q), cl = smoothstep(0.74, 0.79, cd);
    float cs = smoothstep(0.74, 0.79, cloudAt(q - uSun.xz * 60.0)) * (1.0 - cl);
    col *= 1.0 - 0.35 * cs * day;
    col = mix(col, vec3(0.97, 0.98, 1.0) * mix(0.84, 1.0, smoothstep(0.79, 0.95, cd)), cl);
    vec3 term = mix(uWarm, vec3(1.0), smoothstep(0.0, 0.3, ndl));
    vec3 lit = col * term * mix(0.92, 1.12, smoothstep(0.0, 0.8, ndl));
    vec3 night = col * vec3(0.05, 0.075, 0.16) * uNight;
    float city = texture2D(uCity, q / 260.0).r * land * (1.0 - cl) * (1.0 - day);
    col = mix(night, lit, day) + vec3(1.6, 1.05, 0.5) * city * 0.9;
    float mu = clamp(dot(n, -d), 0.0, 1.0);
    float haze = pow(1.0 - mu, 4.0);
    vec3 atm = uAtm * mix(0.12, 1.0, day) + uWarm * 0.8 * pow(sunAl, 6.0) * smoothstep(-0.2, 0.1, ndl);
    col = mix(col, atm, haze * 0.85);
    col += uAtm * 0.9 * pow(1.0 - mu, 14.0) * mix(0.25, 1.2, day);
    outc = vec4(col, 1.0);
  } else {
    vec3 tp = normalize(oc + max(-b, 0.0) * d);
    float dayT = smoothstep(-0.25, 0.2, dot(tp, uSun));
    float a = max(alt, 0.0) / uR;
    float g = exp(-a / 0.0042) * uRimK;
    float g2 = exp(-a / 0.0016);
    vec3 col = uAtm * g * mix(0.18, 1.25, dayT) + vec3(0.75, 0.9, 1.0) * g2 * 0.55 * mix(0.2, 1.0, dayT);
    col += uWarm * 1.6 * g2 * pow(sunAl, 3.0) + uWarm * 0.9 * g * pow(sunAl, 10.0);
    float al = clamp(max(max(col.r, col.g), col.b), 0.0, 1.0);
    outc = vec4(col, al);
  }
  gl_FragColor = outc;
}`;

type SunCfg = { az: number; el: number; show: boolean; size: number };

// ======================================================================================================
export class Exterior {
  root = new THREE.Group();
  private earth = new THREE.Group();
  private orbit = new THREE.Group();
  private space = new THREE.Group();      // stars + Earth shell + sun: ride with the camera
  private shuttle = new THREE.Group();
  private station = new THREE.Group();
  private stars!: THREE.Points;
  private shell!: THREE.Mesh; private shellMat!: THREE.ShaderMaterial;
  private sun!: THREE.Sprite; private sunGlow!: THREE.Sprite; private sunStreak!: THREE.Sprite;
  private smoke: THREE.Sprite[] = [];
  private winGlow!: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();

  constructor() {
    this.root.add(this.earth, this.orbit, this.space);
    this.orbit.add(this.shuttle, this.station);
    this.buildBackyard();
    this.buildSpace();
    this.buildShuttle();
    this.buildStation();
  }

  // =============================== EARTH: backyard ===============================
  private buildBackyard() {
    const G = this.earth, b = new Batch(), [ex, , ez] = EARTH;
    G.position.set(ex, 0, ez);
    // ---- lawn: big disc, grass map + painted variation (mown stripes, sun-dried patches), rising far out ----
    {
      const seg = 140, g = new THREE.PlaneGeometry(2, 2, seg, seg).rotateX(-Math.PI / 2);
      const p = g.attributes.position as THREE.BufferAttribute, uv = g.attributes.uv as THREE.BufferAttribute, col: number[] = [];
      const c = new THREE.Color(), lawn = new THREE.Color("#f4f8e6"), dry = new THREE.Color("#fff2b8"), deep = new THREE.Color("#ccdcb4"), far = new THREE.Color("#e6ecc4");
      const mx = (u: number) => Math.sign(u) * Math.abs(u) ** 2.2 * 420;
      for (let i = 0; i < p.count; i++) {
        const x = mx(p.getX(i)), z = mx(p.getZ(i)), d = Math.hypot(x, z);
        const hgt = d > 60 ? smooth((d - 60) / 300) * (6 + 10 * Math.sin(x * 0.012 + 1) * Math.sin(z * 0.015)) : 0;
        p.setXYZ(i, x, hgt, z); uv.setXY(i, x / 3.2, z / 3.2);
        const stripe = 0.5 + 0.5 * Math.sign(Math.sin(x * 1.05));
        const n1 = 0.5 + 0.5 * Math.sin(x * 0.7 + Math.sin(z * 0.5) * 2) * Math.sin(z * 0.63 + 1);
        c.copy(lawn).lerp(deep, 0.18 * stripe * (1 - smooth((d - 14) / 6))).lerp(dry, 0.22 * n1 * smooth((d - 2) / 5)).lerp(far, smooth((d - 20) / 80) * 0.6);
        col.push(c.r, c.g, c.b);
      }
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
      const gt = grassHD();
      mesh(g, lam("bx_lawn", () => ({ map: gt, vertexColors: true })), G, false);
    }
    // ---- flagstone path from the back door ----
    { const st = lamC("flag", "#c9b79a");
      for (let i = 0; i < 7; i++) { const x = -8.8 + i * 0.95 + hh(i, 2) * 0.2, z = -4.4 + i * 0.75 + hh(i, 3) * 0.2, r = 0.32 + hh(i, 4) * 0.08;
        b.add(new THREE.CylinderGeometry(r, r, 0.04, 9).scale(1.2, 1, 0.9), st, M4(x, 0.02, z, hh(i, 5) * 3)); } }
    // ---- deck chair (classic folding beach chair, teal/cream/orange canvas) at the origin facing +z ----
    {
      const wood = lamC("chairWood", "#c58a52"), woodD = lamC("chairWoodD", "#9c6538");
      const sx = 0.31;
      for (const s of [-1, 1]) {
        b.add(strut(V(s * sx, 0, 0.5), V(s * sx, 0.48, 0.36), 0.025), wood);
        b.add(strut(V(s * sx, 0, -0.42), V(s * sx, 1.06, -0.64), 0.027), wood);
        b.add(strut(V(s * (sx - 0.045), 0, -0.12), V(s * (sx - 0.045), 0.46, 0.34), 0.02), woodD);
        b.add(strut(V(s * (sx + 0.035), 0.02, -0.86), V(s * (sx + 0.035), 0.62, -0.44), 0.02), woodD);
      }
      b.add(strut(V(-sx - 0.03, 0.46, 0.36), V(sx + 0.03, 0.46, 0.36), 0.03), wood);
      b.add(strut(V(-sx - 0.03, 1.05, -0.63), V(sx + 0.03, 1.05, -0.63), 0.03), wood);
      b.add(strut(V(-sx - 0.05, 0.05, -0.86), V(sx + 0.05, 0.05, -0.86), 0.02), woodD);
      const canvas = ctex("bx_canvas", 256, 256, (g) => {
        const cols = ["#1f9a8a", "#f6ecd2", "#f2b134", "#f6ecd2", "#1f9a8a", "#f6ecd2", "#f2b134", "#f6ecd2", "#1f9a8a"];
        const w = 256 / cols.length; cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * w, 0, w + 1, 256); });
        g.fillStyle = "rgba(60,40,30,0.08)"; for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 256, 1);
      });
      const pts: [number, number][] = []; // (z, y)
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const z = u < 0.4 ? 0.34 - (u / 0.4) * 0.48 : -0.14 - ((u - 0.4) / 0.6) * 0.46;
        const y = u < 0.4 ? 0.47 - Math.sin(((u / 0.4) * Math.PI) / 2) * 0.23 : 0.24 + (1 - Math.cos((((u - 0.4) / 0.6) * Math.PI) / 2)) * 0.78;
        pts.push([z, y]);
      }
      const nx = 10, pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let j = 0; j < pts.length; j++) for (let i = 0; i <= nx; i++) {
        const x = -sx + 0.02 + ((2 * sx - 0.04) * i) / nx, sag = 0.035 * (1 - ((2 * i) / nx - 1) ** 2) * Math.sin((j / (pts.length - 1)) * Math.PI);
        pos.push(x, pts[j][1] - sag, pts[j][0] - sag * 0.6); uv.push(i / nx, j / (pts.length - 1));
      }
      for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i; idx.push(a, a + 1, a + nx + 2, a, a + nx + 2, a + nx + 1); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); sg.setIndex(idx); sg.computeVertexNormals();
      b.add(sg, lamT("canvas", canvas, { side: THREE.DoubleSide }));
    }
    // ---- side table (round, painted cream metal) ----
    { const [tx, ty, tz] = [TABLE_TOP[0] - ex, TABLE_TOP[1], TABLE_TOP[2] - ez], tw = lamC("table", "#eee6d6"), tl = lamC("tableLeg", "#3e4a52");
      b.add(new THREE.CylinderGeometry(0.26, 0.26, 0.035, 28).translate(tx, ty - 0.0175, tz), tw);
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.4; b.add(strut(V(tx + Math.cos(a) * 0.2, 0, tz + Math.sin(a) * 0.2), V(tx + Math.cos(a) * 0.12, ty - 0.03, tz + Math.sin(a) * 0.12), 0.013), tl); }
      b.add(new THREE.TorusGeometry(0.15, 0.008, 6, 24).rotateX(Math.PI / 2).translate(tx, 0.16, tz), tl); }
    // ---- kettle grill + smoke wisp ----
    { const gx = 2.5, gz = -2.6, enamel = paint("grill", { color: "#1d2024", specular: "#9aa0a8", shininess: 60 }), steel = lamC("steel", "#9aa2a8");
      b.add(new THREE.SphereGeometry(0.33, 28, 14, 0, TAU, Math.PI / 2, Math.PI / 2).translate(gx, 0.78, gz), enamel);
      b.add(new THREE.SphereGeometry(0.335, 28, 12, 0, TAU, 0, Math.PI * 0.42).scale(1, 0.8, 1).translate(gx, 0.8, gz), enamel);
      b.add(new THREE.TorusGeometry(0.33, 0.012, 6, 32).rotateX(Math.PI / 2).translate(gx, 0.79, gz), steel);
      b.add(strut(V(gx - 0.06, 1.07, gz), V(gx + 0.06, 1.07, gz), 0.02), lamC("woodH", "#6a4630"));
      for (let k = 0; k < 3; k++) { const a = (k / 3) * TAU + 0.3; b.add(strut(V(gx + Math.cos(a) * 0.36, 0, gz + Math.sin(a) * 0.36), V(gx + Math.cos(a) * 0.2, 0.62, gz + Math.sin(a) * 0.2), 0.016), steel); }
      b.add(new THREE.TorusGeometry(0.06, 0.02, 6, 14).translate(gx + Math.cos(0.3) * 0.36, 0.06, gz + Math.sin(0.3) * 0.36), lamC("tyre", "#2a2a2a"));
      for (let k = 0; k < 7; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot("bx_smoke"), color: new THREE.Color(0.95, 0.88, 0.82), transparent: true, depthWrite: false, opacity: 0 })); s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 3; G.add(s); this.smoke.push(s); }
    }
    // ---- house back wall (left, behind): clapboard, lit kitchen window, door, lamp, downpipe, eaves ----
    {
      const x0 = -16, x1 = -2.6, z = -5.6, hgt = 3.1;
      const sid = ctex("bx_siding", 512, 512, (g, r) => {
        g.fillStyle = "#a9bfd0"; g.fillRect(0, 0, 512, 512);
        for (let y = 0; y < 512; y += 32) { g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, y, 512, 10); g.fillStyle = "rgba(40,50,70,0.35)"; g.fillRect(0, y + 29, 512, 3); }
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(80,90,110,${r() * 0.06})`; g.fillRect(r() * 512, r() * 512, 60 + r() * 120, 30); }
      });
      b.add(boxGeo(V(x0, -0.1, z - 0.3), V(x1, hgt, z), 2.4), lamT("siding", sid));
      b.add(boxGeo(V(x0, -0.1, z - 0.02), V(x1 + 0.02, 0.45, z + 0.06)), lamC("found", "#9a948a"));
      const white = lamC("trimW", "#f4efe4");
      b.add(boxGeo(V(x1 - 0.12, -0.1, z - 0.32), V(x1 + 0.03, hgt, z + 0.04)), white);
      b.add(boxGeo(V(x0, hgt, z - 0.3), V(x1 + 0.45, hgt + 0.18, z + 0.55)), white);
      const roofM = lamC("roofShingle", "#6e5a63");
      { const g = new THREE.BufferGeometry(), A = V(x0, hgt + 0.18, z + 0.6), B2 = V(x1 + 0.5, hgt + 0.18, z + 0.6), C = V(x1 + 0.5, hgt + 2.6, z - 4), D = V(x0, hgt + 2.6, z - 4);
        g.setAttribute("position", new THREE.Float32BufferAttribute([A, B2, C, A, C, D].flatMap((v) => [v.x, v.y, v.z]), 3)); g.computeVertexNormals(); b.add(g, roofM);
        const g2 = new THREE.BufferGeometry(), E = V(x1 + 0.5, hgt + 0.18, z - 4); // gable-end triangle closing the roof side
        g2.setAttribute("position", new THREE.Float32BufferAttribute([B2, E, C].flatMap((v) => [v.x, v.y, v.z]), 3)); g2.computeVertexNormals(); b.add(g2, white); }
      b.add(boxGeo(V(x0, hgt + 0.02, z + 0.55), V(x1 + 0.45, hgt + 0.16, z + 0.68)), white);
      b.add(strut(V(x1 + 0.25, 0.05, z + 0.14), V(x1 + 0.25, hgt + 0.08, z + 0.6), 0.045), white);
      // kitchen window: frame, mullions, warm lit glass with curtains
      { const wx = -5.0, wy = 1.0, ww = 1.6, wh = 1.25, wz = z + 0.02;
        const winT = ctex("bx_kitchen", 256, 256, (g) => {
          const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#ffe6a8"); gr.addColorStop(1, "#ffb860"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
          g.fillStyle = "rgba(120,60,40,0.35)"; g.fillRect(0, 150, 256, 106);
          g.fillStyle = "rgba(90,40,30,0.5)"; g.fillRect(40, 60, 50, 90); g.fillRect(150, 90, 70, 40);
          g.fillStyle = "#e9785a"; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(40, 120, 18, 256); g.lineTo(0, 256); g.fill();
          g.beginPath(); g.moveTo(256, 0); g.quadraticCurveTo(216, 120, 238, 256); g.lineTo(256, 256); g.fill();
        });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh).translate(wx, wy + wh / 2, wz + 0.01), glow("kitchen", [1.05, 1.0, 0.95], { map: winT })); m.frustumCulled = false; G.add(m);
        const fr = (a: THREE.Vector3, c: THREE.Vector3) => b.add(boxGeo(a, c), white);
        fr(V(wx - ww / 2 - 0.1, wy - 0.12, wz), V(wx + ww / 2 + 0.1, wy, wz + 0.12));
        fr(V(wx - ww / 2 - 0.1, wy + wh, wz), V(wx + ww / 2 + 0.1, wy + wh + 0.12, wz + 0.08));
        fr(V(wx - ww / 2 - 0.1, wy, wz), V(wx - ww / 2, wy + wh, wz + 0.08)); fr(V(wx + ww / 2, wy, wz), V(wx + ww / 2 + 0.1, wy + wh, wz + 0.08));
        fr(V(wx - 0.03, wy, wz), V(wx + 0.03, wy + wh, wz + 0.06)); fr(V(wx - ww / 2, wy + wh / 2 - 0.03, wz), V(wx + ww / 2, wy + wh / 2 + 0.03, wz + 0.06));
        b.add(boxGeo(V(wx - 0.8, wy - 0.42, wz), V(wx + 0.8, wy - 0.14, wz + 0.26)), lamC("box", "#b0583c"));
        for (let k = 0; k < 9; k++) b.add(new THREE.SphereGeometry(0.08 + hh(k, 7) * 0.04, 10, 7).translate(wx - 0.7 + k * 0.175, wy - 0.1 + hh(k, 8) * 0.05, wz + 0.13), [lamC("fl0", "#f2c94c"), lamC("fl1", "#e8606a"), lamC("leafy", "#4e9a3e")][k % 3]);
      }
      // back door with two steps + glowing wall lamp
      { const dx = -9.2, dz = z + 0.02;
        b.add(boxGeo(V(dx - 0.5, 0.45, dz), V(dx + 0.5, 2.55, dz + 0.05)), lamC("door", "#3f6b6a"));
        b.add(boxGeo(V(dx - 0.6, 0.45, dz), V(dx - 0.5, 2.65, dz + 0.1)), white); b.add(boxGeo(V(dx + 0.5, 0.45, dz), V(dx + 0.6, 2.65, dz + 0.1)), white); b.add(boxGeo(V(dx - 0.6, 2.55, dz), V(dx + 0.6, 2.65, dz + 0.1)), white);
        b.add(boxGeo(V(dx - 0.3, 1.9, dz + 0.05), V(dx + 0.3, 2.35, dz + 0.07)), lamC("doorGlass", "#ffd690"));
        for (let s = 0; s < 2; s++) b.add(boxGeo(V(dx - 0.7, 0, dz + 0.1 + s * 0.32), V(dx + 0.7, 0.45 - s * 0.22, dz + 0.42 + s * 0.32)), lamC("step", "#b8ab98"));
        b.add(new THREE.SphereGeometry(0.03, 8, 6).translate(dx + 0.35, 1.45, dz + 0.08), lamC("brass", "#d8b04a"));
        const lm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10).translate(dx + 0.85, 2.15, dz + 0.16), glow("lamp", [2.6, 1.7, 0.8])); lm.frustumCulled = false; G.add(lm);
        b.add(boxGeo(V(dx + 0.78, 2.22, dz), V(dx + 0.92, 2.3, dz + 0.22)), lamC("lampCap", "#2c2c30"));
      }
      b.add(boxGeo(V(-12.6, 0, z + 0.05), V(-11.6, 0.8, z + 0.65)), lamC("bin", "#4f6f58"));
    }
    // ---- cedar board fence (back + sides) ----
    {
      const cedar = [lamC("ced0", "#b97f52"), lamC("ced1", "#a8704a"), lamC("ced2", "#c48d5e")], post = lamC("cedPost", "#8c5a3a");
      const run = (xa: number, za: number, xb: number, zb: number, seed: number) => {
        const L = Math.hypot(xb - xa, zb - za), ux = (xb - xa) / L, uz = (zb - za) / L, yaw = Math.atan2(-uz, ux), bw = 0.145;
        for (let s = 0; (s + 1) * bw <= L + 1e-6; s++) {
          const x = xa + ux * (s + 0.5) * bw, zz = za + uz * (s + 0.5) * bw, h = 1.72 + (hh(s, seed) - 0.5) * 0.03, m = cedar[Math.floor(hh(s, seed + 1) * 3)];
          b.add(new THREE.BoxGeometry(bw - 0.012, h, 0.022).translate(0, h / 2, 0), m, M4(x, 0, zz, yaw));
          b.add(new THREE.CylinderGeometry(0, 0.073, 0.05, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.3).translate(0, h + 0.025, 0), m, M4(x, 0, zz, yaw));
        }
        const nx = -uz, nz = ux;
        for (let s = 0; s * 2.4 <= L + 0.01; s++) { const x = xa + ux * s * 2.4 + nx * 0.07, zz = za + uz * s * 2.4 + nz * 0.07; b.add(new THREE.BoxGeometry(0.1, 1.95, 0.1).translate(0, 0.97, 0), post, M4(x, 0, zz, yaw)); }
        for (const ry of [0.32, 1.42]) b.add(new THREE.BoxGeometry(L, 0.09, 0.045).translate(L / 2, ry, 0), post, M4(xa + nx * 0.036, 0, za + nz * 0.036, yaw));
      };
      run(-2.6, -16, 18, -16, 11);
      run(18, -16, 18, 12, 12);
      run(-16, -5.9, -16, 12, 13);
      run(-2.6, -16, -2.6, -5.9, 14);
    }
    // ---- garden: shrubs + flower bed along the fence, trees beyond (kept off the sun line behind the chair) ----
    {
      for (let i = 0; i < 12; i++) { const x = -1.6 + i * 1.6 + hh(i, 21) * 0.6; if (x > 17) break; addVeg(b, "bush", x, 0, -15.1 + hh(i, 22) * 0.3, 0.7 + hh(i, 23) * 0.5, 300 + i, 1); }
      const fl = [lamC("flA", "#f3c34a"), lamC("flB", "#e45d6a"), lamC("flC", "#f6efe2"), lamC("flD", "#b07ad8")];
      for (let i = 0; i < 70; i++) { const x = -1.8 + hh(i, 31) * 19, zz = -14.4 + hh(i, 32) * 0.8; b.add(new THREE.SphereGeometry(0.06, 8, 6).translate(x, 0.35 + hh(i, 33) * 0.4, zz), fl[i % 4]); }
      const trees: [number, number, number, "round" | "fat" | "tall" | "cone"][] = [
        [-8, -21, 11, "fat"], [-13, -26, 13, "round"], [-4.5, -29, 9, "tall"], [-19, -17, 10, "round"], [-22, -2, 12, "fat"],
        [16, -21, 10, "round"], [24, -10, 12, "fat"], [27, -26, 14, "round"], [-28, -30, 15, "round"], [20, 8, 9, "round"], [-21, 10, 9, "cone"],
      ];
      trees.forEach(([x, zz, h, k], i) => addVeg(b, k, x, 0, zz, h, 500 + i, i < 6 ? 0 : 1));
      // neighbour's house behind the fence (right, off the sun line) + a power pole with sagging lines
      b.add(boxGeo(V(14, 0, -35), V(23, 3.2, -28)), lamC("nWall", "#d8c7b0"));
      { const g = new THREE.BufferGeometry(), y0 = 3.2, y1 = 6.2, A = V(13.6, y0, -27.6), B2 = V(23.4, y0, -27.6), C = V(23.4, y1, -31.5), D = V(13.6, y1, -31.5);
        g.setAttribute("position", new THREE.Float32BufferAttribute([A, B2, C, A, C, D].flatMap((v) => [v.x, v.y, v.z]), 3)); g.computeVertexNormals(); b.add(g, lamC("nRoof", "#8a5a4e"));
        b.add(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 10).translate(20.5, 6.2, -30.5), lamC("nChim", "#9a5a44")); }
      b.add(strut(V(-1, 0, -19), V(-1, 9, -19), 0.13, 8, 0.1), lamC("pole", "#6a5444"));
      b.add(new THREE.BoxGeometry(2.0, 0.12, 0.12).translate(-1, 8.5, -19), lamC("pole", "#6a5444"));
      for (const dx of [-0.8, 0.8]) for (const [ex2, ez2, sagK] of [[40, -25, 1.6], [-45, -17, 1.4]] as [number, number, number][]) {
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push(V(-1 + dx + (ex2 - (-1 + dx)) * u, 8.6 - sagK * Math.sin(Math.PI * u), -19 + (ez2 + 19) * u)); }
        for (let i = 0; i < 24; i++) b.add(strut(pts[i], pts[i + 1], 0.012, 4), lamC("wire", "#2a2a2e"));
      }
      // far hills: a low ring (hazed by the fog)
      { const n = 160, pos: number[] = [], idx: number[] = [];
        for (let i = 0; i <= n; i++) { const a = (i / n) * TAU, r0 = 330, hgt = 22 + 16 * Math.sin(a * 3 + 1) + 9 * Math.sin(a * 7 + 2) + 5 * Math.sin(a * 13);
          pos.push(Math.cos(a) * r0, -2, Math.sin(a) * r0, Math.cos(a) * r0, hgt, Math.sin(a) * r0); }
        for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        mesh(g, lam("bx_hills", () => ({ color: "#7d8a64", side: THREE.DoubleSide })), G, false); }
    }
    // ---- string lights: house eaves -> back fence (warm bulbs) ----
    {
      const runs: [THREE.Vector3, THREE.Vector3, number][] = [[V(-2.7, 3.05, -5.2), V(9.6, 2.1, -15.85), 0.6], [V(-6.5, 3.05, -5.2), V(-2.55, 1.95, -15.85), 0.4]];
      const wire = lamC("bulbWire", "#25221f"), bulbM = glow("bulb", [3.2, 2.0, 0.9]);
      const gm = new THREE.SpriteMaterial({ map: softDot("bx_bulbGlow", 0.6), color: new THREE.Color(1.6, 1.0, 0.45), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const bulbs: THREE.BufferGeometry[] = [];
      for (const [A, B2, sag] of runs) {
        const pts: THREE.Vector3[] = [], n = 28;
        for (let i = 0; i <= n; i++) { const u = i / n; pts.push(A.clone().lerp(B2, u).add(V(0, -4 * sag * u * (1 - u), 0))); }
        for (let i = 0; i < n; i++) b.add(strut(pts[i], pts[i + 1], 0.006, 4), wire);
        for (let i = 2; i < n; i += 2) {
          const p = pts[i];
          bulbs.push(pn(new THREE.SphereGeometry(0.045, 10, 8).scale(1, 1.3, 1).translate(p.x, p.y - 0.08, p.z)));
          const s = new THREE.Sprite(gm); s.position.set(p.x, p.y - 0.08, p.z); s.scale.setScalar(0.42); s.layers.set(NOINK); s.renderOrder = 2; s.frustumCulled = false; G.add(s);
        }
      }
      const bm = new THREE.Mesh(mergeGeometries(bulbs, false), bulbM); bm.frustumCulled = false; G.add(bm);
    }
    b.build(G);
    // ---- low golden clouds on the horizon (sprites, no ink) ----
    const cl: [number, number, number, number, number][] = [[-0.55, 7, 260, 0, 1], [0.35, 4, 220, 1, 0.9], [0.9, 9, 320, 2, 1.1], [-1.4, 5, 200, 3, 0.8], [2.6, 6, 240, 4, 1]];
    for (const [a, el, w, seed, k] of cl) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudHD(40 + seed, CLOUD_GOLD), transparent: true, depthWrite: false, fog: false, color: new THREE.Color(k, k, k) }));
      const d = 820, dir = V(Math.sin(a), 0, -Math.cos(a));
      s.position.set(dir.x * d, Math.tan((el * Math.PI) / 180) * d, dir.z * d); s.scale.set(w, w / 2, 1); s.layers.set(NOINK); s.renderOrder = -0.5; s.frustumCulled = false; G.add(s);
    }
  }

  // =============================== SPACE: stars, Earth shell, sun ===============================
  private buildSpace() {
    const S = this.space;
    const N = 2400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), r = rng(4242);
    for (let i = 0; i < N; i++) {
      const u = r() * 2 - 1, a = r() * TAU, s = Math.sqrt(1 - u * u), big = r() < 0.05, k = big ? 2.2 + r() * 1.4 : 0.3 + r() * r() * 1.1;
      pos.set([Math.cos(a) * s * 1000, u * 1000, Math.sin(a) * s * 1000], i * 3);
      const warm = r(); col.set([k * (0.85 + 0.2 * warm), k * 0.95, k * (1.1 - 0.25 * warm)], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: true, map: softDot("bx_star", 0.7), vertexColors: true, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    this.stars.frustumCulled = false; this.stars.layers.set(NOINK); this.stars.renderOrder = -0.9; S.add(this.stars);
    const land = fieldTex("bx_landField", 70, 40, 230, 777), clouds = cloudTex(), city = cityTex();
    this.shellMat = new THREE.ShaderMaterial({
      uniforms: {
        uC: { value: V(ORBIT[0], ORBIT[1] - EARTH_R - EARTH_ALT, ORBIT[2]) }, uR: { value: EARTH_R }, uSun: { value: V(0, 1, 0) }, uDrift: { value: new THREE.Vector2() },
        uNight: { value: 1 }, uRimK: { value: 1 },
        uLand: { value: land }, uCloud: { value: clouds }, uCity: { value: city },
        uOcean: { value: untone("#2458a8") }, uShallow: { value: untone("#2fa6c8") }, uGreen: { value: untone("#5f9a48") }, uDesert: { value: untone("#c9a66a") },
        uAtm: { value: untone("#7fb8ff") }, uWarm: { value: new THREE.Color(1.0, 0.55, 0.22) },
      },
      vertexShader: EARTH_VS, fragmentShader: EARTH_FS, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    });
    this.shell = new THREE.Mesh(new THREE.SphereGeometry(5000, 64, 32), this.shellMat);
    this.shell.frustumCulled = false; this.shell.layers.set(NOINK); this.shell.renderOrder = -0.85; S.add(this.shell);
    const sp = (map: THREE.Texture, c: THREE.Color, ro: number, add = false) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: c, transparent: true, depthWrite: false, fog: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending }));
      s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = ro; S.add(s); return s;
    };
    this.sun = sp(sunTex(), new THREE.Color(7, 5.4, 3.4), -0.87);
    this.sunGlow = sp(softDot("bx_sunGlow", 0.4), new THREE.Color(1.5, 0.95, 0.5), -0.8, true);
    this.sunStreak = sp(streakTex(), new THREE.Color(1.4, 1.0, 0.65), -0.79, true);
  }

  // =============================== the 1985 orbiter ===============================
  private buildShuttle() {
    const Sh = this.shuttle;
    Sh.position.set(...SHUTTLE);
    Sh.rotation.set(SHUTTLE_ROLL, SHUTTLE_YAW, 0, "YXZ");
    const PAINTER = /* glsl */ `
float segD(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 painter(vec3 p){
  vec3 Wc = vec3(0.95, 0.95, 0.93), Bc = vec3(0.075, 0.08, 0.09), Gl = vec3(0.04, 0.05, 0.07);
  vec3 c = Wc;
  float px = abs(fract(p.x / 1.62) - 0.5);
  c *= 1.0 - 0.07 * smoothstep(0.465, 0.49, px);
  float belt = -1.74 + 0.95 * smoothstep(14.5, 19.2, p.x);
  if (p.y < belt) {
    vec2 tq = vec2(p.x, p.z) / 0.4; vec2 g = abs(fract(tq) - 0.5);
    float l = max(smoothstep(0.43, 0.48, g.x), smoothstep(0.43, 0.48, g.y));
    c = Bc * (0.85 + 0.35 * hsh(floor(tq))) + vec3(0.07) * l;
  }
  float az = abs(p.z);
  if (az > 2.7 && p.y < -1.2) {
    vec2 w = vec2(p.x, az);
    float d = min(segD(w, vec2(9.0, 2.4), vec2(-3.6, 4.7)), segD(w, vec2(-3.6, 4.7), vec2(-13.2, 11.6)));
    if (d < 0.32) c = vec3(0.2, 0.21, 0.23);
    if (p.x < -14.9 && p.x > -15.05) c *= 0.6;
  }
  if (p.x > 18.5) c = vec3(0.2, 0.2, 0.22);
  if (p.x > 14.3 && p.x < 15.9 && p.y > 0.75 && az < 2.0) {
    c = Gl;
    if (abs(fract((p.z + 2.0) / 0.66) - 0.5) > 0.44) c = Wc;
  }
  if (p.x > 12.6 && p.x < 13.8 && p.y > 2.3 && az < 0.85 && az > 0.1) c = Gl;
  if (p.x > 12.9 && p.x < 14.1 && p.y > 1.0 && p.y < 1.9 && az > 1.9) c = Gl;
  float hd = length(vec2(p.x - 12.2, p.y + 1.0));
  if (az > 2.2 && hd < 0.5) c = hd > 0.43 ? vec3(0.3) : Wc * 0.9;
  if (az < 2.47 && p.x > -11.2 && p.x < 9.7 && p.y > -1.35 && p.y < 1.6) {
    vec2 g = abs(fract(vec2(p.x, p.y + p.z) / 0.55) - 0.5);
    c = vec3(0.86, 0.86, 0.83) * (1.0 - 0.1 * max(smoothstep(0.42, 0.48, g.x), smoothstep(0.42, 0.48, g.y)));
  }
  return c;
}`;
    const hull = paint("orbiter", { color: "#ffffff" }, PAINTER);
    const parts: THREE.BufferGeometry[] = [];
    const fwd: St[] = [
      { x: 9.6, w: 2.65, yb: -2.2, yt: 1.62, p: 5 }, { x: 10.5, w: 2.66, yb: -2.2, yt: 2.2, p: 4 }, { x: 11.6, w: 2.66, yb: -2.2, yt: 2.58, p: 3.4 },
      { x: 12.8, w: 2.62, yb: -2.18, yt: 2.66, p: 3.1 }, { x: 13.9, w: 2.5, yb: -2.14, yt: 2.5, p: 3.0 }, { x: 14.9, w: 2.32, yb: -2.08, yt: 2.0, p: 2.9 },
      { x: 15.8, w: 2.1, yb: -2.0, yt: 1.38, p: 2.8 }, { x: 16.8, w: 1.78, yb: -1.88, yt: 0.86, p: 2.6 }, { x: 17.7, w: 1.36, yb: -1.7, yt: 0.4, p: 2.4 },
      { x: 18.4, w: 0.9, yb: -1.48, yt: 0.02, p: 2.2 }, { x: 18.85, w: 0.48, yb: -1.22, yt: -0.3, p: 2.1 }, { x: 19.05, w: 0.08, yb: -0.86, yt: -0.68, p: 2 },
    ];
    parts.push(pn(loft(fwd, 64)));
    const aft: St[] = [{ x: -17.6, w: 2.55, yb: -2.0, yt: 1.75, p: 5 }, { x: -16.2, w: 2.65, yb: -2.18, yt: 1.66, p: 5.5 }, { x: -11.2, w: 2.65, yb: -2.2, yt: 1.62, p: 5.5 }];
    parts.push(pn(loft(aft, 64)));
    // mid fuselage: U-section (open payload bay)
    {
      const sh = new THREE.Shape(), R = 0.5, w = 2.65, t = 0.2, yb = -2.2, yt = 1.62, fl = -1.3;
      sh.moveTo(-w, yt); sh.lineTo(-w, yb + R); sh.quadraticCurveTo(-w, yb, -w + R, yb); sh.lineTo(w - R, yb); sh.quadraticCurveTo(w, yb, w, yb + R); sh.lineTo(w, yt);
      sh.lineTo(w - t, yt); sh.lineTo(w - t, fl); sh.lineTo(-w + t, fl); sh.lineTo(-w + t, yt); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 21.2, bevelEnabled: false, curveSegments: 8 });
      g.rotateY(-Math.PI / 2); g.translate(9.8, 0, 0);
      parts.push(pn(g));
    }
    // wings (double delta), one plate through the fuselage
    {
      const P: [number, number][] = [[9.0, 2.4], [-3.6, 4.7], [-13.2, 11.6], [-14.3, 11.9], [-16.1, 11.9], [-16.1, 2.4]];
      const sh = new THREE.Shape(); sh.moveTo(P[0][0], -P[0][1]);
      for (let i = 1; i < P.length; i++) sh.lineTo(P[i][0], -P[i][1]);
      for (let i = P.length - 1; i >= 0; i--) sh.lineTo(P[i][0], P[i][1]);
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.12, bevelSegments: 2, curveSegments: 4 });
      g.rotateX(Math.PI / 2); g.translate(0, -1.62, 0);
      parts.push(pn(g));
      parts.push(pn(new THREE.BoxGeometry(2.0, 0.24, 5.6).translate(-18.5, -1.95, 0))); // body flap
    }
    // vertical tail
    {
      const sh = new THREE.Shape(); sh.moveTo(-9.8, 1.6); sh.lineTo(-15.4, 9.9); sh.lineTo(-17.5, 9.9); sh.lineTo(-18.7, 1.6); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 2 });
      g.translate(0, 0, -0.08); parts.push(pn(g));
    }
    // OMS pods
    for (const s of [-1, 1]) {
      const pod = loft([{ x: -17.7, w: 0.95, yb: 1.2, yt: 2.75, p: 2.4 }, { x: -15.5, w: 1.0, yb: 1.25, yt: 2.85, p: 2.4 }, { x: -13.0, w: 0.82, yb: 1.4, yt: 2.5, p: 2.4 }, { x: -11.4, w: 0.3, yb: 1.55, yt: 1.95, p: 2 }], 40);
      pod.translate(0, 0, s * 1.75); parts.push(pn(pod));
    }
    mesh(mergeGeometries(parts, false), hull, Sh);
    // engines: 3 main bells + 2 OMS nozzles, pointing -x
    {
      const prof: THREE.Vector2[] = []; for (let i = 0; i <= 14; i++) { const u = i / 14; prof.push(new THREE.Vector2(0.38 + 0.78 * Math.pow(u, 0.75), -u * 3.1)); }
      const bell = new THREE.LatheGeometry(prof, 40), ox = new THREE.LatheGeometry(prof.map((v) => v.clone().multiplyScalar(0.42)), 24);
      const metal = paint("bell", { color: "#5a5d63", specular: "#c0c4cc", shininess: 50, side: THREE.DoubleSide });
      const es: THREE.BufferGeometry[] = [];
      for (const [y, z] of [[0.75, 0], [-0.75, 1.32], [-0.75, -1.32]]) es.push(pn(bell.clone().rotateZ(-Math.PI / 2).translate(-17.6, y, z)));
      for (const z of [-1.75, 1.75]) es.push(pn(ox.clone().rotateZ(-Math.PI / 2).translate(-17.7, 2.0, z)));
      mesh(mergeGeometries(es, false), metal, Sh);
    }
    // payload bay doors (open ~166 deg): outer white + inner radiators facing up
    {
      const rad = lamT("radiator", radiatorTex()), outer = paint("doorOuter", { color: "#eeeeea" });
      for (const s of [-1, 1]) {
        const hz = 2.62, hy = 1.62, th = ((-166 * Math.PI) / 180) * s;
        const prof: [number, number][] = [];
        for (let i = 0; i <= 12; i++) {
          const u = i / 12, cz = (hz * Math.cos((u * Math.PI) / 2) - hz) * s, cy = 0.95 * Math.sin((u * Math.PI) / 2);
          prof.push([s * hz + cz * Math.cos(th) - cy * Math.sin(th), hy + cz * Math.sin(th) + cy * Math.cos(th)]);
        }
        mesh(sweep(prof, -11.2, 9.6, true), rad, Sh);
        mesh(sweep(prof.map(([z, y]) => [z, y - 0.07] as [number, number]), -11.2, 9.6, false), outer, Sh);
        mesh(new THREE.CylinderGeometry(0.07, 0.07, 20.8, 10).rotateZ(Math.PI / 2).translate(-0.8, hy - 0.02, s * hz), outer, Sh);
      }
    }
    // payload: Spacelab-2-like pallets, pointing telescope, gold boxes, igloo, dish antenna, the raised arm
    {
      const b = new Batch(), white = paint("palletW", { color: "#f2f1ec" }), gold = lamT("gold", goldFoil()), grey = paint("palletG", { color: "#9aa0a8", shininess: 40 });
      for (const [x0, x1] of [[-10.2, -6.2], [-5.6, -1.6], [-1.0, 3.0]]) {
        b.add(boxGeo(V(x0, -1.3, -2.1), V(x1, -0.7, 2.1)), white);
        for (const s of [-1, 1]) b.add(boxGeo(V(x0, -0.7, s > 0 ? 1.9 : -2.1), V(x1, 0.2, s > 0 ? 2.1 : -1.9)), white);
      }
      b.add(boxGeo(V(-9.8, -0.7, -1.5), V(-7.0, 0.5, 0.2)), gold); b.add(boxGeo(V(-9.6, -0.7, 0.6), V(-8.2, 1.0, 1.6)), gold);
      b.add(new THREE.CylinderGeometry(0.45, 0.45, 1.6, 20).translate(-7.4, 0.1, 1.2), white);
      b.add(boxGeo(V(-4.4, -0.7, -0.6), V(-2.8, 0.0, 0.6)), grey);
      b.add(strut(V(-3.6, 0.0, 0), V(-3.6, 1.0, 0), 0.22), grey);
      { const tq = new THREE.Matrix4().compose(V(-3.6, 1.15, 0.2), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.75, 0, 0.35)), V(1, 1, 1));
        b.add(new THREE.CylinderGeometry(0.72, 0.72, 3.4, 28).translate(0, 1.2, 0), white, tq);
        b.add(new THREE.CylinderGeometry(0.76, 0.76, 0.5, 28), gold, tq);
        b.add(new THREE.CylinderGeometry(0.6, 0.6, 0.06, 28).translate(0, 2.92, 0), lamC("lens", "#1c2430"), tq); }
      b.add(boxGeo(V(0.0, -0.7, -1.7), V(2.4, 0.6, -0.3)), gold); b.add(boxGeo(V(0.2, -0.7, 0.3), V(2.2, 0.2, 1.6)), white);
      for (let k = 0; k < 4; k++) b.add(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 14).translate(0.5 + (k % 2) * 0.55, 0.75, 0.6 + Math.floor(k / 2) * 0.5), gold);
      b.add(new THREE.CylinderGeometry(0.6, 0.6, 1.3, 24).translate(5.6, -0.6, 0), white); b.add(new THREE.SphereGeometry(0.6, 24, 10, 0, TAU, 0, Math.PI / 2).translate(5.6, 0.05, 0), white);
      b.add(strut(V(8.6, 1.6, 2.3), V(8.6, 3.6, 2.6), 0.07), grey);
      b.add(new THREE.SphereGeometry(0.62, 22, 8, 0, TAU, 0, 0.75).scale(1, 0.45, 1).rotateX(-0.9).translate(8.6, 3.75, 2.75), white);
      const sh = V(9.0, 1.85, -2.35), el = V(2.4, 4.6, -2.6), wr = V(-3.4, 2.6, -2.1), ee = V(-4.4, 2.0, -1.8);
      b.add(strut(sh, el, 0.19), white); b.add(strut(el, wr, 0.18), white); b.add(strut(wr, ee, 0.15), grey);
      for (const j of [sh, el, wr]) b.add(new THREE.SphereGeometry(0.27, 14, 10).translate(j.x, j.y, j.z), grey);
      b.add(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 14).rotateZ(Math.PI / 2).translate(ee.x - 0.2, ee.y, ee.z), white);
      for (const u of [0.25, 0.5, 0.75]) { const p = sh.clone().lerp(el, u); b.add(new THREE.CylinderGeometry(0.205, 0.205, 0.12, 14).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), el.clone().sub(sh).normalize())).translate(p.x, p.y, p.z), gold); }
      b.build(Sh);
    }
    // decals: "Challenger" on the +z bay wall, flag + "USA" on the +z wing
    {
      const nameT = textTex("bx_name", 1024, 160, (g) => { g.fillStyle = "#15161a"; g.font = "italic bold 118px Georgia, 'Times New Roman', serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Challenger", 512, 86); });
      const usaT = textTex("bx_usa", 512, 512, (g) => {
        const fx = 56, fy = 30, fw = 400, fh = 210;
        for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f4f2ec" : "#c3343a"; g.fillRect(fx, fy + (i * fh) / 13, fw, fh / 13 + 0.5); }
        g.fillStyle = "#2b3d7a"; g.fillRect(fx, fy, fw * 0.4, (fh * 7) / 13);
        g.fillStyle = "#f4f2ec"; for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(fx + 14 + i * 26, fy + 14 + j * 23, 4, 0, TAU); g.fill(); }
        g.fillStyle = "#15161a"; g.font = "bold 190px Helvetica, Arial, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("USA", 256, 395);
      });
      const dm = (map: THREE.Texture, key: string) => lam("bx_" + key, () => ({ map, alphaTest: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
      const n = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 0.47).translate(11.35, 0.5, 2.69), dm(nameT, "name")); n.receiveShadow = true; Sh.add(n);
      const u = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2).rotateY(-Math.PI / 2).translate(-11.5, -1.495, 6.6), dm(usaT, "usa")); u.receiveShadow = true; Sh.add(u);
    }
  }

  // =============================== the station exterior ===============================
  private buildStation() {
    const St2 = this.station, b = new Batch();
    St2.position.set(...STATION_EXT);
    const mli = paint("mli", { map: quiltTex("bx_mliW", "#f1efe8", "rgba(120,122,130,0.45)"), shininess: 12 });
    const MZ = -0.6;
    const ring = paint("stRing", { color: "#b9bec6", shininess: 40 }), dark = lamC("stDark", "#3a3f48"), rail = lamC("stRail", "#e2b23a");
    const metal = paint("stTruss", { color: "#c9ccd2", shininess: 30 });
    const cyl = (x0: number, x1: number, r: number, m: THREE.Material) => b.add(new THREE.CylinderGeometry(r, r, x1 - x0, 48, 1, false).rotateZ(Math.PI / 2).translate((x0 + x1) / 2, 0, MZ), m);
    cyl(-11, -6, 2.0, mli); cyl(-6, -3.6, 2.3, mli); cyl(-3.6, 3.6, 2.1, mli); cyl(3.6, 6, 2.3, mli); cyl(6, 12, 2.0, mli);
    for (const x of [-11, -6, -3.6, 3.6, 6, 12]) b.add(new THREE.CylinderGeometry(2.38, 2.38, 0.22, 48).rotateZ(Math.PI / 2).translate(x, 0, MZ), ring);
    for (const x of [-11.6, 12.6]) { b.add(new THREE.CylinderGeometry(1.1, 2.0, 0.9, 40).rotateZ(((x < 0 ? 1 : -1) * Math.PI) / 2).translate(x - Math.sign(x) * 0.15, 0, MZ), ring); b.add(new THREE.CylinderGeometry(0.9, 0.9, 0.5, 30).rotateZ(Math.PI / 2).translate(x + Math.sign(x) * 0.45, 0, MZ), dark); }
    for (const [x0, x1] of [[-10.5, -6.4], [-3.2, -1.7], [1.7, 3.2], [6.4, 11.5]]) for (const a of [0.5, 2.6, -0.6]) {
      const y = Math.sin(a) * 2.28, z = Math.cos(a) * 2.28 + MZ;
      b.add(strut(V(x0, y, z), V(x1, y, z), 0.04), rail);
      for (const x of [x0, x1]) b.add(strut(V(x, Math.sin(a) * 1.95, Math.cos(a) * 1.95 + MZ), V(x, y, z), 0.03), rail);
    }
    // cupola on +z at x 0: octagonal frustum, round top window (glass), warm lit inside
    {
      const cz0 = 1.35, cz1 = 2.95, cy = 0.3;
      b.add(new THREE.CylinderGeometry(1.15, 1.55, cz1 - cz0, 8, 1, true).rotateX(Math.PI / 2).translate(0, cy, (cz0 + cz1) / 2), paint("cupola", { color: "#e6e4dc", shininess: 30 }));
      b.add(new THREE.TorusGeometry(1.0, 0.13, 10, 40).translate(0, cy, cz1), ring);
      b.add(new THREE.RingGeometry(1.0, 1.2, 8, 1).translate(0, cy, cz1 - 0.03), paint("cupolaTop", { color: "#dcdad2" }));
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + Math.PI / 8, rr = 1.37; b.add(new THREE.BoxGeometry(0.62, 0.42, 0.05).rotateX(-0.29).rotateZ(a - Math.PI / 2).translate(Math.cos(a) * rr, cy + Math.sin(a) * rr, (cz0 + cz1) / 2 + 0.05), lamC("sideWin", "#ffcf8a")); }
      const im = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.44, cz1 - cz0 - 0.06, 8, 1, true).rotateX(Math.PI / 2).translate(0, cy, (cz0 + cz1) / 2), glow("cupolaIn", [1.3, 0.95, 0.6], { side: THREE.BackSide }));
      im.frustumCulled = false; St2.add(im);
      const back = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24).translate(0, cy, cz0 + 0.2), glow("cupolaBack", [1.05, 0.74, 0.48])); back.frustumCulled = false; St2.add(back);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(1.0, 40).translate(0, cy, cz1 + 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.7, 0.9), transparent: true, opacity: 0.14, depthWrite: false, fog: false }));
      glass.layers.set(NOINK); glass.renderOrder = 4; glass.frustumCulled = false; St2.add(glass);
      this.winGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot("bx_winGlow", 0.5), color: new THREE.Color(1.0, 0.62, 0.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.3 }));
      this.winGlow.position.set(0, cy, cz1 + 0.2); this.winGlow.scale.setScalar(3.2); this.winGlow.layers.set(NOINK); this.winGlow.renderOrder = 5; this.winGlow.frustumCulled = false; St2.add(this.winGlow);
    }
    // truss behind (z -3.6, y 4.6): square lattice, radiators, four solar array wings
    {
      const ty = 4.6, tz = -3.6, h = 1.1, x0 = -26, x1 = 26;
      const L = [V(0, -h, -h), V(0, h, -h), V(0, h, h), V(0, -h, h)];
      for (const l of L) b.add(new THREE.BoxGeometry(x1 - x0, 0.16, 0.16).translate(0, ty + l.y, tz + l.z), metal);
      for (let x = x0; x <= x1 + 0.01; x += 2.6) {
        for (let k = 0; k < 4; k++) { const a = L[k], c = L[(k + 1) % 4]; b.add(strut(V(x, ty + a.y, tz + a.z), V(x, ty + c.y, tz + c.z), 0.05, 5), metal);
          if (x + 2.6 <= x1 + 0.01) b.add(strut(V(x, ty + a.y, tz + a.z), V(x + 2.6, ty + c.y, tz + c.z), 0.035, 4), metal); }
      }
      b.add(boxGeo(V(-1.2, 1.4, -2.7), V(1.2, ty - h - 0.05, -1.7)), metal);
      const radM = lamT("radPanel", radiatorTex());
      for (const x of [-4.5, 4.5]) { for (let k = 0; k < 3; k++) b.add(new THREE.BoxGeometry(3.0, 0.08, 3.4).translate(x, ty - 0.25, tz - h - 2.0 - k * 3.6), radM); b.add(strut(V(x, ty - 0.2, tz - h), V(x, ty - 0.2, tz - 12.4), 0.06), metal); }
      const gold = paint("array", { map: arrayTex(), shininess: 40, specular: "#5a4020" }), back = lamT("arrayBack", quiltTex("bx_arrBack", "#d8dbe2", "rgba(90,96,110,0.6)", 32));
      for (const x of [-17.5, -9.5, 9.5, 17.5]) {
        b.add(boxGeo(V(x - 0.55, ty - h - 0.1, tz - h - 0.1), V(x + 0.55, ty + h + 0.1, tz + h + 0.1)), metal);
        for (const s of [1, -1]) {
          const y0 = ty + s * 1.6, y1 = ty + s * 17.0, ym = (y0 + y1) / 2, len = Math.abs(y1 - y0), yaw = 0.42;
          b.add(strut(V(x, y0, tz), V(x, y1, tz), 0.09, 6), metal);
          for (const side of [-1, 1]) {
            const Mx = MT(x, 0, tz, yaw, side * 1.38, ym, 0);
            b.add(new THREE.PlaneGeometry(2.5, len), gold, Mx);
            b.add(new THREE.PlaneGeometry(2.5, len).rotateY(Math.PI).translate(0, 0, -0.03), back, Mx);
          }
          b.add(new THREE.BoxGeometry(5.6, 0.22, 0.2), metal, MT(x, 0, tz, yaw, 0, y1 + s * 0.12, -0.015));
        }
      }
    }
    b.add(strut(V(-8, 1.9, -0.2), V(-8, 4.0, 0.6), 0.05), metal); b.add(new THREE.SphereGeometry(0.7, 18, 8, 0, TAU, 0, 0.8).scale(1, 0.4, 1).rotateX(0.5).translate(-8, 4.2, 0.7), paint("dish", { color: "#f0efe8" }));
    b.add(strut(V(8, -1.9, -0.2), V(8.3, -4.5, 0.3), 0.05), metal);
    b.build(St2);
  }

  // =============================== per frame ===============================
  /** visible sun per shot: az from the shot's mean view direction, el in world degrees (the limb is at -15) */
  private sunCfg(id: number, t: number): SunCfg | null {
    const s = SHOTS[id - 1];
    if (id === 4) return { az: 4, el: -16.5, show: true, size: 1.4 };          // just under the limb: a backlit rim only
    if (id === 5) return { az: LOOKS.orbit.sunAz, el: LOOKS.orbit.sunEl, show: true, size: 1.3 };
    if (id === 9) { const u = smooth((t - s.a / FPS - 0.2) / 3.6); return { az: 4, el: -15.9 + 3.4 * u, show: true, size: 1.5 }; } // sunrise over the limb
    if (s.place === "station" || s.place === "middeck") return { az: LOOKS[s.look].sunAz, el: LOOKS[s.look].sunEl, show: false, size: 1 };
    return null;
  }
  private fwdCache = new Map<number, [number, number]>();
  private sunDir(id: number, cfg: SunCfg) {
    let fw = this.fwdCache.get(id);
    if (!fw) {
      const s = SHOTS[id - 1];
      let fx = 0, fz = 0;
      for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
      const n = Math.hypot(fx, fz) || 1; fw = [fx / n, fz / n]; this.fwdCache.set(id, fw);
    }
    const [fx, fz] = fw, az = THREE.MathUtils.degToRad(cfg.az), el = THREE.MathUtils.degToRad(cfg.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    return new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
  }

  update(id: number, t: number, f: number, cam: THREE.Camera) {
    const s = SHOTS[id - 1], cp = cam.position;
    this.earth.visible = s.place === "earth";
    this.orbit.visible = s.place === "orbit";
    this.shuttle.visible = id === 5;
    this.station.visible = id === 9;
    const cfg = this.sunCfg(id, t);
    this.space.visible = !!cfg;
    if (this.earth.visible) {
      this.smoke.forEach((sp, k) => {
        const per = 3.2, u = ((t + (k * per) / this.smoke.length) % per) / per;
        sp.position.set(2.5 + 0.25 * u + 0.06 * Math.sin(t * 1.3 + k), 1.12 + u * 1.6, -2.6 - 0.1 * u);
        sp.scale.setScalar(0.25 + u * 0.7);
        (sp.material as THREE.SpriteMaterial).opacity = 0.22 * smooth(u / 0.15) * (1 - smooth((u - 0.5) / 0.5));
      });
    }
    if (cfg) {
      this.space.position.copy(cp);
      const sd = this.sunDir(id, cfg), u = this.shellMat.uniforms;
      (u.uSun.value as THREE.Vector3).copy(sd);
      (u.uDrift.value as THREE.Vector2).set(t * 0.0016, t * 0.0007);
      // in orbit the Earth is fixed below ORBIT (parallax); inside the modules it rides with the camera
      if (s.place === "orbit") (u.uC.value as THREE.Vector3).set(ORBIT[0], ORBIT[1] - EARTH_R - EARTH_ALT, ORBIT[2]);
      else (u.uC.value as THREE.Vector3).set(cp.x, cp.y - EARTH_R - EARTH_ALT, cp.z);
      u.uNight.value = s.look === "commercial" ? 1.3 : 1.0;
      u.uRimK.value = s.look === "commercial" ? 1.25 : 1.0;
      const tn = (a: number) => Math.tan(THREE.MathUtils.degToRad(a)), d = 900;
      this.sun.visible = this.sunGlow.visible = this.sunStreak.visible = cfg.show;
      if (cfg.show) {
        this.sun.position.copy(sd).multiplyScalar(d); this.sun.scale.setScalar(2 * d * tn(cfg.size));
        const clear = clamp01((cfg.el + 15 + cfg.size * 0.6) / (cfg.size * 1.6)), gk = 0.25 + 0.75 * clear; // glare grows as the disc clears the limb
        this.sunGlow.position.copy(sd).multiplyScalar(d * 0.99); this.sunGlow.scale.setScalar(2 * d * tn(cfg.size * 9) * (0.6 + 0.4 * gk));
        (this.sunGlow.material as THREE.SpriteMaterial).opacity = 0.75 * gk;
        this.sunStreak.position.copy(sd).multiplyScalar(d * 0.98); this.sunStreak.scale.set(2 * d * tn(cfg.size * 22), 2 * d * tn(cfg.size * 1.1), 1);
        (this.sunStreak.material as THREE.SpriteMaterial).opacity = 0.6 * gk;
      }
    }
    if (this.station.visible) (this.winGlow.material as THREE.SpriteMaterial).opacity = 0.28 + 0.04 * Math.sin(t * 2.1);
    void f;
  }
}
