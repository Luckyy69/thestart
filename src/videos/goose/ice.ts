// OWNER: ice agent. ICE (shot 4): an ICE-AGE tundra in a BLIZZARD at a pale low sun.
//
// The stage is a flat, wind-packed snow pan (y 0) where the furry ANCESTOR (-0.6,0,0) and modern BEAN (0.65,0,0.1)
// stand. Around it: sculpted snowdrifts with wind-cut crests, frozen tundra grass tufts poking through, snow-capped
// erratic boulders, tall snow-laden PINES framing both sides (they lean and shudder in the gusts) and pine belts on the
// horizon, a family of WOOLLY MAMMOTHS plodding across the middle distance (a big one, a calf trailing it, a far one
// grazing), and a towering blue GLACIER wall (fluted ice, serac towers, a snow cap, calved ice blocks at its foot) that
// closes the view, with a low saddle where the pale SUN DISC glows through the snow (a 22 deg halo hint). Far icy ridges
// ring the rest. The storm: a streaming overcast deck, a white-out band on the horizon, three NOINK blowing-snow layers
// (round flakes near, wind streaks, fast far streaks), ground drift (snow snakes) racing over the snow, drifting snow
// veils, and snow glitter on the sunlit snow. Every effect is a pure function of t.
// The wind has a STORY: a heroic GUST on "full coat" (the ancestor's floof), then the blizzard dies to a hush on
// "lost the coat" for the sad tiny "boing" (the calf turns to look), then picks up again (iceGust / ICE_WIND below; the
// cast can sync the fur). The shot opens inside a white-out that clears in ~0.7 s (helps the 3 -> 4 snow whoosh).
// Placement is VIEW-RELATIVE: everything is laid out from shot 4's mean camera (camAt), so a re-cut camera keeps the
// composition (sun saddle + mammoths behind the gap between the two characters, framing pines just off the edges) and
// nothing solid is placed within ~3 m of any shot-4 camera position.
// Everything sun-dependent reads LOOKS.ice at runtime (same camera-relative formula as world.ts shotSun).
//
// CONTRACTS (LOCAL to ICE = (3000,0,0), metres; exports are WORLD):
//   ICE_ANCESTOR (-0.6,0,0), ICE_BEAN (0.65,0,0.1): ground y = 0 exactly in the stage pan x -2.6..2.6, z -2.2..2.2 and
//     within 1.5 m of every shot-4 camera position (terrain rises gently from ~4 m beyond).
//   ICE_WIND: unit world direction the snow blows toward (+x = screen right for the first-pass camera, a little toward
//     the lens). iceGust(t): wind strength (1 = blizzard, ~1.75 at the "full coat" gust, ~0.3 hush around "lost"/
//     "boing"); iceWindS(t): integrated wind displacement (m) for anything that must flow with the snow without jumps.
//   CAMERA: keep y 0.4..6 within 12 m of the stage; nothing solid there except the characters.
//   Tested vantages (local; pos -> look, fov): first-pass (0,1.6,4.4) -> (0,1.0,0) 45; wide (0,2.0,6.5) -> (0,1.1,0) 45.
// Visible only while shot 4 is on screen (root.visible = id === 4). DEBUG flags at the top are OFF for delivery.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex, rng } from "../bridge/paint";
import { twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { ICE, SHOTS, W, camAt, shotStart, V3 as T3 } from "./story";
import { LOOKS } from "./looks";

// ---------------- DEBUG (all OFF for delivery) ----------------
const DEBUG_CAM: { pos: T3; look: T3; fov: number } | null = null;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const Iw = (x: number, y: number, z: number): T3 => [ICE[0] + x, ICE[1] + y, ICE[2] + z];
const TAU = Math.PI * 2, D2R = Math.PI / 180;
export const ICE_ANCESTOR: T3 = Iw(-0.6, 0, 0);
export const ICE_BEAN: T3 = Iw(0.65, 0, 0.1);

// ============================================================ noise + helpers
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
};
const sm = (x: number) => { const u = Math.max(0, Math.min(1, x)); return u * u * (3 - 2 * u); };
const C = (h: THREE.ColorRepresentation) => new THREE.Color(h);
const lerpC = (a: string, b: string, t: number) => C(a).lerp(C(b), Math.max(0, Math.min(1, t)));
const M = (x: number, y: number, z: number, ry = 0, rx = 0, rz = 0, s: number | [number, number, number] = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), typeof s === "number" ? V(s, s, s) : V(...s));
const tf = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { g.applyMatrix4(m); return g; };
const merge = (l: THREE.BufferGeometry[]) => mergeGeometries(l, false)!;
/** canonical non-indexed attribute set (position, normal, uv, color) */
const clean = (g0: THREE.BufferGeometry, col: THREE.ColorRepresentation | ((p: THREE.Vector3, n: THREE.Vector3) => THREE.Color) = "#ffffff") => {
  if (!g0.getAttribute("normal")) g0.computeVertexNormals();
  const s = g0.index ? g0.toNonIndexed() : g0;
  const out = new THREE.BufferGeometry();
  for (const k of ["position", "normal", "uv"]) {
    const a = s.getAttribute(k);
    if (a) out.setAttribute(k, new THREE.Float32BufferAttribute(Array.from(a.array as ArrayLike<number>).slice(0, a.count * a.itemSize), a.itemSize));
  }
  if (!out.getAttribute("normal")) out.computeVertexNormals();
  const n = out.getAttribute("position").count;
  if (!out.getAttribute("uv")) out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  const ca = new Float32Array(n * 3), pa = out.getAttribute("position"), na = out.getAttribute("normal"), v = V(0, 0, 0), nn = V(0, 0, 0), fixed = typeof col === "function" ? null : C(col);
  for (let i = 0; i < n; i++) {
    const c = fixed ?? (col as (p: THREE.Vector3, n: THREE.Vector3) => THREE.Color)(v.fromBufferAttribute(pa, i), nn.fromBufferAttribute(na, i));
    ca[i * 3] = c.r; ca[i * 3 + 1] = c.g; ca[i * 3 + 2] = c.b;
  }
  out.setAttribute("color", new THREE.Float32BufferAttribute(ca, 3));
  return out;
};
const tube = (pts: THREE.Vector3[], r: (u: number) => number, seg = 12, rad = 8, wob = 0, seed = 0) => {
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
  const p = g.getAttribute("position") as THREE.BufferAttribute, n = g.getAttribute("normal") as THREE.BufferAttribute;
  const len = curve.getLength();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, c = curve.getPointAt(u);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j, a = (j / rad) * TAU;
      const rr = r(u) * (1 + wob * vn(Math.cos(a) * 1.5 + seed, u * len * 0.9 + Math.sin(a) * 1.5));
      p.setXYZ(k, c.x + n.getX(k) * rr, c.y + n.getY(k) * rr, c.z + n.getZ(k) * rr);
    }
  }
  g.computeVertexNormals();
  return g;
};
const blob = (sx: number, sy: number, sz: number, x: number, y: number, z: number, ws = 24, hs = 16) => new THREE.SphereGeometry(1, ws, hs).scale(sx, sy, sz).translate(x, y, z);

// ============================================================ the wind (story-driven)
const T_GUST = W.full - 0.35, T_HUSH = W.lost - 0.1;
/** wind strength: 1 = blizzard; a heroic gust on "full coat", a hush for the tiny "boing", then it picks up again */
export const iceGust = (t: number) => {
  const gust = sm((t - T_GUST) / 0.45) * (1 - sm((t - T_GUST - 1.35) / 0.9));
  const hush = sm((t - T_HUSH) / 0.35) * (1 - sm((t - T_HUSH - 1.0) / 0.6));
  return (1 + 0.75 * gust) * (1 - 0.72 * hush);
};
const WS_T0 = shotStart(4) - 2, WS_DT = 1 / 120;
const WS_TAB: number[] = [0];
for (let i = 1, s = 0; i <= Math.ceil(((SHOTS[3].b + 30) / 30 - WS_T0) / WS_DT); i++) { s += 0.5 * (iceGust(WS_T0 + (i - 1) * WS_DT) + iceGust(WS_T0 + i * WS_DT)) * WS_DT; WS_TAB.push(s); }
/** integrated wind displacement (m at unit speed): flowing things never jump when the gust changes */
export const iceWindS = (t: number) => {
  const k = (t - WS_T0) / WS_DT;
  if (k <= 0) return t - WS_T0;
  const n = WS_TAB.length - 1;
  if (k >= n) return WS_TAB[n] + (k - n) * WS_DT;
  const i = Math.floor(k), f = k - i;
  return WS_TAB[i] + (WS_TAB[i + 1] - WS_TAB[i]) * f;
};
const WIND_L = V(1, 0, 0.28).normalize(); // local == world direction
export const ICE_WIND: T3 = [+WIND_L.x.toFixed(3), 0, +WIND_L.z.toFixed(3)];

// ============================================================ view frame (shot 4 cameras, local)
const CAMS: THREE.Vector3[] = [];
for (let f = SHOTS[3].a - 8; f <= SHOTS[3].b + 8; f += 2) { const c = camAt(4, f); CAMS.push(V(c.pos[0] - ICE[0], c.pos[1] - ICE[1], c.pos[2] - ICE[2])); }
const FWD = (() => {
  let fx = 0, fz = 0;
  for (let f = SHOTS[3].a; f < SHOTS[3].b; f += 3) { const c = camAt(4, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
  const n = Math.hypot(fx, fz) || 1; return V(fx / n, 0, fz / n);
})();
const RT = V(-FWD.z, 0, FWD.x);
const O = (() => { const o = V(0, 0, 0); for (const p of CAMS) o.add(p); o.multiplyScalar(1 / CAMS.length); o.y = 0; return o; })();
const CAMXZ = CAMS.filter((_, i) => i % 4 === 0).map((p) => [p.x, p.z]);
const camDist = (x: number, z: number) => { let d = 1e9; for (const [cx, cz] of CAMXZ) d = Math.min(d, Math.hypot(x - cx, z - cz)); return d; };
/** point at bearing b (deg, + = right of the mean view) and distance d from the mean camera */
const at = (b: number, d: number) => O.clone().addScaledVector(FWD, Math.cos(b * D2R) * d).addScaledVector(RT, Math.sin(b * D2R) * d);
const bearing = (x: number, z: number) => { const dx = x - O.x, dz = z - O.z; return Math.atan2(dx * RT.x + dz * RT.z, dx * FWD.x + dz * FWD.z) / D2R; };

// ============================================================ terrain
const stageD = (x: number, z: number) => Math.hypot(Math.max(0, Math.abs(x) - 2.6), Math.max(0, Math.abs(z) - 2.2));
/** ground height (local). Flat 0 on the stage + around the cameras, drifts and rolling snowfields beyond. */
const H = (x: number, z: number) => {
  const dc = Math.min(stageD(x, z), camDist(x, z));
  const free = sm((dc - 1.5) / 5);
  if (free <= 0) return 0;
  const d = Math.hypot(x - O.x, z - O.z);
  // wind drifts: gentle windward ramps, steep lee faces, crests curving across the wind
  const s = (x * 0.9 - z * 0.42) / 6.5 + 0.55 * vn(x * 0.045, z * 0.08) + 0.25 * vn(x * 0.13, z * 0.1);
  const f = s - Math.floor(s), prof = f < 0.8 ? Math.pow(f / 0.8, 1.7) : Math.pow((1 - f) / 0.2, 0.7);
  const da = (0.25 + 0.5 * (0.5 + 0.5 * vn(x * 0.05 + 3, z * 0.05 - 1))) * sm((d - 4) / 10) * (1 - 0.6 * sm((d - 60) / 50));
  const hum = 0.12 * vn(x * 0.5, z * 0.5) + 0.25 * vn(x * 0.18 + 5, z * 0.18);
  const roll = 1.2 * vn(x * 0.025, z * 0.025) * sm((d - 10) / 30) + 4.5 * (0.5 + 0.5 * vn(x * 0.008 + 7, z * 0.008)) * sm((d - 70) / 90);
  return free * (da * prof + hum * sm((d - 3) / 6) + roll);
};
const axis = (A: number, B: number, c0: number, sp: (d: number) => number) => {
  const xs: number[] = [c0];
  for (let x = c0; x > A; ) { x -= sp(c0 - x); xs.unshift(Math.max(A, x)); }
  for (let x = c0; x < B; ) { x += sp(x - c0); xs.push(Math.min(B, x)); }
  return xs;
};

// ============================================================ painted textures
const snowTex = () => ctex("icSnow", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#f6f8fc"; g.fillRect(0, 0, S, S);
  const wrap = (f: (dx: number, dy: number) => void) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) f(dx, dy); };
  for (let i = 0; i < 70; i++) { // soft cool mottling
    const x = r() * S, y = r() * S, rr = 40 + r() * 140, cool = r() < 0.5;
    wrap((dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rr); gr.addColorStop(0, cool ? "rgba(196,214,240,0.35)" : "rgba(255,255,255,0.5)"); gr.addColorStop(1, "rgba(220,230,246,0)"); g.fillStyle = gr; g.fillRect(x + dx - rr, y + dy - rr, rr * 2, rr * 2); });
  }
  for (let i = 0; i < 320; i++) { // wind ripples (sastrugi): wavy cool lines with a bright lip
    const y0 = r() * S, x0 = r() * S, L = 60 + r() * 260, a = 0.35 + r() * 0.5;
    g.strokeStyle = `rgba(120,150,206,${a * 0.6})`; g.lineWidth = 1.5 + r() * 2.5;
    wrap((dx, dy) => { g.beginPath(); for (let k = 0; k <= 10; k++) { const xx = x0 + dx + (L * k) / 10, yy = y0 + dy + 5 * Math.sin(k * 0.9 + x0); if (k) g.lineTo(xx, yy); else g.moveTo(xx, yy); } g.stroke(); });
  }
  for (let i = 0; i < 2600; i++) { // sparkle grain
    const x = r() * S, y = r() * S, rr = 0.5 + r() * 1.4;
    g.fillStyle = r() < 0.55 ? "rgba(255,255,255,0.9)" : "rgba(170,192,226,0.45)";
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
});
const iceTex = () => ctex("icGlacier", 1024, 1024, (g, r) => {
  const S = 1024;
  g.fillStyle = "#e6f6fa"; g.fillRect(0, 0, S, S);
  const wrap = (f: (dx: number, dy: number) => void) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) f(dx, dy); };
  for (let i = 0; i < 22; i++) { // annual layers (horizontal bands)
    const y = r() * S, h = 6 + r() * 40, c = ["rgba(120,190,220,0.28)", "rgba(255,255,255,0.4)", "rgba(90,150,200,0.22)", "rgba(150,160,170,0.18)"][Math.floor(r() * 4)];
    wrap((dx, dy) => { g.fillStyle = c; g.fillRect(dx, y + dy, S, h); });
  }
  for (let i = 0; i < 180; i++) { // vertical melt streaks / flute shading
    const x = r() * S, y0 = r() * S, L = 120 + r() * 500, w = 4 + r() * 22, dark = r() < 0.6;
    wrap((dx, dy) => {
      const gr = g.createLinearGradient(0, y0 + dy, 0, y0 + dy + L);
      gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.3, dark ? "rgba(40,120,180,0.24)" : "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x + dx - w / 2, y0 + dy, w, L);
    });
  }
  for (let i = 0; i < 50; i++) { // cracks
    let x = r() * S, y = r() * S;
    g.strokeStyle = `rgba(20,70,120,${0.3 + r() * 0.3})`; g.lineWidth = 1 + r() * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 50; y += 10 + r() * 40; g.lineTo(x, y); }
    g.stroke();
  }
});
const furTex = () => ctex("icFur", 512, 512, (g, r) => {
  const S = 512;
  g.fillStyle = "#c8c0b8"; g.fillRect(0, 0, S, S);
  const wrap = (f: (dx: number, dy: number) => void) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) f(dx, dy); };
  for (let i = 0; i < 1400; i++) { // shaggy strands hanging down
    const x = r() * S, y = r() * S, L = 14 + r() * 40, cv = (r() - 0.5) * 10, k = r();
    g.strokeStyle = k < 0.5 ? `rgba(60,36,28,${0.35 + r() * 0.3})` : k < 0.85 ? `rgba(255,236,210,${0.25 + r() * 0.3})` : "rgba(30,18,16,0.5)";
    g.lineWidth = 1.5 + r() * 2.5; g.lineCap = "round";
    wrap((dx, dy) => { g.beginPath(); g.moveTo(x + dx, y + dy); g.quadraticCurveTo(x + dx + cv, y + dy + L * 0.5, x + dx + cv * 0.4, y + dy + L); g.stroke(); });
  }
});
const veilTex = () => ctex("icVeil", 512, 256, (g, r) => {
  g.clearRect(0, 0, 512, 256);
  for (let i = 0; i < 40; i++) {
    const x = 60 + r() * 392, y = 70 + r() * 116, rx = 50 + r() * 110, ry = 20 + r() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, rx);
    gr.addColorStop(0, "rgba(255,255,255,0.22)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y); g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill(); g.restore();
  }
});

// ============================================================ materials
// SNOW: two-tone + a snow layer: glitter sparkles where the sun hits (view-dependent twinkle), a cool sky sheen on
// faces turned up, a pale ice-blue rim on shaded edges, turquoise light "through" shaded ice (o.ice).
const SNOW = {
  uT: { value: 0 }, uGlint: { value: new THREE.Color(1, 0.95, 0.85) }, uSheen: { value: new THREE.Color(0.2, 0.25, 0.35) },
  uRim: { value: new THREE.Color(0.5, 0.7, 1.0) }, uIce: { value: new THREE.Color(0.1, 0.5, 0.7) },
};
const matCache = new Map<string, THREE.Material>();
const snowMat = (key: string, p: THREE.MeshLambertMaterialParameters, o: { glit: number; sheen: number; rim: number; ice: number; halo?: number }) => {
  let m = matCache.get(key) as THREE.MeshLambertMaterial | undefined;
  if (m) return m;
  const mm = twoTone(new THREE.MeshLambertMaterial(p));
  const base = mm.onBeforeCompile;
  mm.onBeforeCompile = (sh, rr) => {
    base.call(mm, sh, rr);
    Object.assign(sh.uniforms, SNOW);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;")
      .replace("#include <project_vertex>", `#include <project_vertex>
        { vec4 wp4 = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
          vWp = ( modelMatrix * wp4 ).xyz; }`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp; uniform float uT; uniform vec3 uGlint; uniform vec3 uSheen; uniform vec3 uRim; uniform vec3 uIce;\nfloat ich(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }")
      .replace("#include <aomap_fragment>", `
        #if NUM_DIR_LIGHTS > 0
        {
          vec3 sV = directionalLights[ 0 ].direction;
          vec3 Nn = geometryNormal, Vd = geometryViewDir;
          vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
          float upk = dot( Nn, upV ), ndv = max( dot( Nn, Vd ), 0.0 );
          float lit = sunVis * smoothstep( 0.0, 0.08, dot( Nn, sV ) );
          // glitter: a few ice crystals per cell flash toward the eye (twinkle with the view + a slow shimmer)
          vec2 gp = vWp.xz * 22.0 + vWp.y * 7.0; vec2 gc = floor( gp ), gf = fract( gp ) - 0.5;
          float gh = ich( gc ), gk = step( 0.93, gh );
          vec2 go = vec2( ich( gc + 3.1 ), ich( gc + 7.7 ) ) - 0.5;
          float gd = length( gf - go * 0.6 );
          float tw = smoothstep( 0.78, 1.0, fract( gh * 53.0 + dot( Vd, vec3( 2.1, 3.7, 1.3 ) ) * 4.0 + uT * 0.35 ) );
          float aa = 1.0 - smoothstep( 0.08, 0.3, fwidth( gp.x ) );
          float glit = gk * tw * exp( -gd * gd / 0.004 ) * aa * lit * smoothstep( -0.2, 0.5, upk ) * ${o.glit.toFixed(3)};
          float fres = pow( 1.0 - ndv, 3.0 );
          float rim = pow( 1.0 - ndv, 2.2 ) * ( 1.0 - lit );
          vec3 sH = normalize( sV - upV * dot( sV, upV ) );
          float halo = pow( 1.0 - ndv, 5.0 ) * smoothstep( -0.1, 0.5, dot( Nn, sH ) ) * 0.45 * ${(o.halo ?? 0).toFixed(3)};
          reflectedLight.directSpecular += uGlint * glit * 3.0 + uSheen * fres * smoothstep( 0.0, 0.8, upk ) * ${o.sheen.toFixed(3)}
            + diffuseColor.rgb * uRim * rim * ${o.rim.toFixed(3)}
            + diffuseColor.rgb * uIce * ( 1.0 - lit ) * ( 0.35 + 0.65 * fres ) * ${o.ice.toFixed(3)}
            + uGlint * diffuseColor.rgb * pow( max( dot( reflect( -Vd, Nn ), sV ), 0.0 ), 24.0 ) * lit * ${(o.ice * 0.6).toFixed(3)}
            + uGlint * mix( diffuseColor.rgb, vec3( 1.0 ), 0.5 ) * halo;
        }
        #endif
        #include <aomap_fragment>`);
  };
  mm.customProgramCacheKey = () => "icSnow3_" + key;
  matCache.set(key, mm);
  return mm;
};
/** far silhouettes fogged ~100 % read as pale ghosts under the ink: cap their haze so they stay painted */
const hazeCap = <T extends THREE.Material>(base: T, key: string, cap: number): T => {
  let m = matCache.get(key) as T | undefined;
  if (m) return m;
  m = base.clone() as T;
  const prev = base.onBeforeCompile, mm = m;
  mm.onBeforeCompile = (sh, rr) => {
    prev.call(mm, sh, rr);
    sh.fragmentShader = sh.fragmentShader.replace("#include <fog_fragment>", `#ifdef USE_FOG
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( smoothstep( fogNear, fogFar, vFogDepth ), ${cap.toFixed(3)} ) );
      #endif`);
  };
  const pk = base.customProgramCacheKey.bind(base);
  mm.customProgramCacheKey = () => pk() + "_haze" + cap.toFixed(3);
  matCache.set(key, mm);
  return mm;
};
const lamb = (key: string, p: THREE.MeshLambertMaterialParameters) => {
  let m = matCache.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(p)); matCache.set(key, m); }
  return m;
};

// ============================================================ props: pines, boulders, grass, ice blocks
/** a snow-laden pine: a trunk + jagged droopy tiers, the upper part of every tier under snow, dark green underneath */
const pineGeo = (seed: number, h: number) => {
  const r = rng(seed), L: THREE.BufferGeometry[] = [];
  L.push(clean(tube([V(0, -0.4, 0), V(0, h * 0.5, 0), V(0, h * 0.92, 0)], (u) => h * 0.03 * (1 - 0.7 * u) + 0.04, 6, 7), "#6a4a3a"));
  const nT = 6 + Math.floor(r() * 2);
  for (let k = 0; k < nT; k++) {
    const u = k / (nT - 1), y = h * (0.16 + 0.74 * u), rad = h * (0.27 * (1 - u) + 0.06) * (0.9 + 0.2 * r()), th = h * (0.2 - 0.06 * u);
    const seg = 13 + Math.floor(r() * 4), g = new THREE.ConeGeometry(rad, th, seg, 3, false);
    const p = g.getAttribute("position") as THREE.BufferAttribute, ph = r() * 6;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), yy = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), q = (yy + th / 2) / th; // q 0 = rim, 1 = tip
      const jag = 1 + 0.2 * Math.cos(a * seg) * (1 - q) + 0.08 * Math.sin(a * 3 + ph);
      const droop = -0.16 * th * (1 - q) * (0.6 + 0.4 * Math.cos(a * seg));
      p.setXYZ(i, x * jag, yy + droop, z * jag);
    }
    g.computeVertexNormals();
    const snowLine = 0.6 + 0.12 * r();
    L.push(clean(g.translate(0, y, 0), (pp, n) => {
      const q = (pp.y - (y - th / 2)) / th, a = Math.atan2(pp.z, pp.x), sl = snowLine + 0.12 * Math.sin(a * 5 + ph) + 0.08 * Math.sin(a * 11 + ph * 2);
      if (n.y < -0.2) return C("#16302e");
      return q > sl ? lerpC("#e6eef8", "#ffffff", q) : lerpC("#163a30", "#2f6a4a", q / sl);
    }));
  }
  return merge(L);
};
const rockGeo = (s: number, seed: number) => {
  const rr = rng(seed), g = new THREE.IcosahedronGeometry(1, s > 0.8 ? 3 : 2);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const k = 1 + 0.22 * vn(p.getX(i) * 2 + seed, p.getZ(i) * 2 + p.getY(i)) + 0.07 * vn(p.getX(i) * 5, p.getY(i) * 5 + seed); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
  g.computeVertexNormals();
  const col = ["#8a8494", "#7e7a8a", "#968e98"][Math.floor(rr() * 3)];
  return clean(tf(g, M(0, 0, 0, rr() * 6, 0, 0, [s * (1 + 0.3 * rr()), s * (0.6 + 0.2 * rr()), s])), (q, n) => (n.y > 0.42 + 0.1 * vn(q.x * 3, q.z * 3) ? C("#f4f8fc") : C(col)));
};
const iceBlockGeo = (s: number, seed: number) => {
  const rr = rng(seed), g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) { const k = 1 + 0.3 * vn(p.getX(i) * 1.7 + seed, p.getZ(i) * 1.7 + p.getY(i)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 1.2, p.getZ(i) * k); }
  const out = clean(tf(g, M(0, 0, 0, rr() * 6, (rr() - 0.5) * 0.4, (rr() - 0.5) * 0.4, s)), (q, n) => (n.y > 0.6 ? C("#f2f8fc") : lerpC("#7cc4e0", "#bfe8f4", 0.5 + 0.5 * vn(q.x, q.y))));
  out.computeVertexNormals(); // faceted (non-indexed): crisp facets read as ice
  return out;
};
/** a tuft of frozen tundra grass (straw blades, frosted tips) */
const tuftGeo = (seed: number) => {
  const r = rng(seed), pos: number[] = [], col: number[] = [];
  for (let k = 0; k < 14; k++) {
    const a = r() * TAU, lean = 0.15 + 0.35 * r(), h = 0.18 + 0.28 * r(), w = 0.012 + 0.01 * r(), ox = (r() - 0.5) * 0.12, oz = (r() - 0.5) * 0.12;
    const tx = ox + Math.cos(a) * lean * h + 0.05 * h, tz = oz + Math.sin(a) * lean * h, px = -Math.sin(a) * w, pz = Math.cos(a) * w;
    const cb = C(r() < 0.5 ? "#8a6c44" : "#a07c4c"), ct = C("#efe6d2");
    pos.push(ox - px, -0.02, oz - pz, ox + px, -0.02, oz + pz, tx, h, tz);
    col.push(cb.r, cb.g, cb.b, cb.r, cb.g, cb.b, ct.r, ct.g, ct.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2)); g.computeVertexNormals();
  return g;
};

// ============================================================ the woolly mammoth (facing +x, feet at y 0, ~3.6 m tall)
type Mammoth = { g: THREE.Group; body: THREE.Group; head: THREE.Group; trunk: THREE.Group; legs: THREE.Group[]; tail: THREE.Group };
const mammoth = (mat: THREE.Material, calf: boolean, seed: number): Mammoth => {
  const r = rng(seed);
  const fur = (p: THREE.Vector3, n: THREE.Vector3) => {
    const top = sm((n.y - 0.55) / 0.3) * sm((p.y - 2.6) / 0.4);
    const c = lerpC("#7a3a1e", "#c07a3e", sm((p.y - 1.4) / 2.0) + 0.15 * vn(p.x * 3, p.z * 3));
    return c.lerp(C("#eef4fa"), top * (calf ? 0.4 : 0.6) * sm((1.2 - p.x) / 0.4)); // snow dusting on the back (not the head)
  };
  const g = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group(), trunk = new THREE.Group(), tail = new THREE.Group();
  g.add(body);
  const B: THREE.BufferGeometry[] = [];
  B.push(clean(blob(1.75, 1.25, 1.12, -0.15, 2.25, 0), fur));
  B.push(clean(blob(1.05, 1.05, 1.0, 0.75, 2.75, 0), fur)); // shoulder hump (the back slopes down to the rear)
  for (let k = 0; k < 72; k++) { // shaggy skirt: hanging fur locks all around the belly (varied, splayed, wind-tossed)
    const a = (k / 72) * TAU + r() * 0.06, x = Math.cos(a) * (1.55 + 0.08 * r()) - 0.1, z = Math.sin(a) * (0.98 + 0.06 * r()), L = 0.4 + 0.6 * r() * r() + 0.2 * r();
    const y0 = 1.5 + 0.18 * (r() - 0.5);
    B.push(clean(new THREE.ConeGeometry(0.13 + 0.07 * r(), L, 6).rotateX(Math.PI).translate(0, -L / 2, 0).applyMatrix4(M(x, y0 + 0.05, z, -a, 0, (r() - 0.5) * 0.4 + 0.15)), (p) => lerpC("#3e2216", "#7a4a30", sm((p.y - 0.9) / 0.7))));
  }
  for (let k = 0; k < 9; k++) { // throat / chest locks
    const z = (k / 8 - 0.5) * 1.2, L = 0.7 + 0.3 * r();
    B.push(clean(new THREE.ConeGeometry(0.22, L, 7).rotateX(Math.PI).translate(1.45, 1.85 - L * 0.3, z), (p) => lerpC("#4a2a1e", "#7a4a30", sm((p.y - 1.0) / 0.8))));
  }
  body.add(new THREE.Mesh(merge(B), mat));
  head.position.set(1.55, 2.95, 0); body.add(head);
  const Hd: THREE.BufferGeometry[] = [];
  Hd.push(clean(blob(0.82, 0.92, 0.72, 0.25, 0.05, 0), fur), clean(blob(0.5, 0.55, 0.5, 0.15, 0.75, 0), fur));
  for (const s of [-1, 1]) {
    Hd.push(clean(blob(0.12, 0.32, 0.3, -0.2, 0.15, 0.62 * s, 10, 8), "#5a3424"));
    Hd.push(clean(blob(0.06, 0.1, 0.08, 0.9, 0.17, 0.4 * s, 10, 8), "#141014"));
    Hd.push(clean(blob(0.03, 0.035, 0.03, 0.95, 0.22, 0.42 * s, 6, 5), "#ffffff"));
    if (!calf) Hd.push(clean(tube([V(0.72, -0.45, 0.3 * s), V(1.2, -1.15, 0.5 * s), V(1.85, -1.2, 0.72 * s), V(2.25, -0.75, 0.62 * s), V(2.25, -0.25, 0.35 * s)], (u) => 0.13 * (1 - 0.75 * u) + 0.02, 24, 9), (p) => lerpC("#f6ecd2", "#d8c8a0", sm(-p.y))));
    else Hd.push(clean(tube([V(0.75, -0.4, 0.2 * s), V(0.95, -0.55, 0.26 * s), V(1.1, -0.5, 0.28 * s)], (u) => 0.06 * (1 - 0.6 * u) + 0.015, 8, 6), "#f6ecd2"));
  }
  head.add(new THREE.Mesh(merge(Hd), mat));
  trunk.position.set(0.85, -0.25, 0); head.add(trunk);
  trunk.add(new THREE.Mesh(clean(tube([V(0, 0, 0), V(0.35, -0.7, 0), V(0.4, -1.5, 0), V(0.3, -2.1, 0), V(0.5, -2.45, 0), V(0.72, -2.3, 0)], (u) => 0.3 * (1 - 0.72 * u) + 0.05, 30, 10, 0.06, seed), (p) => lerpC("#5e3424", "#8a5232", sm((p.y + 2.2) / 2.2))), mat));
  const legs: THREE.Group[] = [];
  for (const [x, z] of [[1.0, 0.55], [1.0, -0.55], [-1.1, 0.55], [-1.1, -0.55]]) {
    const L = new THREE.Group(); L.position.set(x, 1.75, z); body.add(L);
    L.add(new THREE.Mesh(merge([clean(new THREE.CylinderGeometry(0.36, 0.33, 1.6, 12).translate(0, -0.9, 0), "#5a3222"), clean(new THREE.CylinderGeometry(0.4, 0.42, 0.22, 12).translate(0, -1.66, 0), "#3a2620")]), mat));
    legs.push(L);
  }
  tail.position.set(-1.85, 2.5, 0); body.add(tail);
  tail.add(new THREE.Mesh(merge([clean(tube([V(0, 0, 0), V(-0.3, -0.4, 0), V(-0.35, -0.9, 0)], (u) => 0.08 * (1 - 0.5 * u) + 0.02, 8, 6), "#5a3222"), clean(blob(0.13, 0.22, 0.13, -0.35, -1.0, 0, 10, 8), "#3a2018")]), mat));
  g.traverse((o) => { o.frustumCulled = false; if ((o as THREE.Mesh).isMesh) { (o as THREE.Mesh).castShadow = true; (o as THREE.Mesh).receiveShadow = true; } });
  return { g, body, head, trunk, legs, tail };
};

// ============================================================ NOINK effect shaders
const HASHGL = /* glsl */ `
  float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n2(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), u.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), u.x), u.y); }
  float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * n2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }`;

/** blowing snow: a world-fixed lattice carried by the wind (integrated uS), falling + tumbling, wrapped in a box around
 *  the camera (no swimming, no pops). kind 0 = round flakes (camera-facing), 1 = streaks along the motion */
const snowMesh = (n: number, seed: number, box: THREE.Vector3, o: { kind: number; size: number; len: number; speed: number; fall: number; turb: number }) => {
  const r = rng(seed), q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const A = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) A.set([r(), r(), r(), r()], i * 4);
  g.setAttribute("iA", new THREE.InstancedBufferAttribute(A, 4)); g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uS: { value: 0 }, uG: { value: 1 }, uBox: { value: box }, uWind: { value: WIND_L.clone() }, uSun: { value: V(0, 0.1, -1) },
      uCol: { value: new THREE.Color(0.8, 0.85, 0.95) }, uGold: { value: new THREE.Color(1.2, 1.0, 0.7) }, uK: { value: 1 } },
    vertexShader: /* glsl */ `attribute vec4 iA; uniform float uT; uniform float uS; uniform float uG; uniform vec3 uBox; uniform vec3 uWind; uniform vec3 uSun;
      varying vec2 vQ; varying float vA; varying float vG;
      void main(){
        float sp = ${o.speed.toFixed(3)} * (0.7 + 0.6 * iA.w), ph = iA.w * 61.0;
        float fall = ${o.fall.toFixed(3)} * (0.6 + 0.8 * fract(iA.w * 7.31));
        vec3 turb = vec3(sin(uT * 1.9 + ph) + 0.5 * sin(uT * 4.3 + ph * 2.1), 0.8 * sin(uT * 2.6 + ph * 1.3), cos(uT * 1.5 + ph * 0.7)) * ${o.turb.toFixed(3)};
        vec3 p0 = iA.xyz * uBox + uWind * uS * sp + vec3(0.0, -fall * uT, 0.0) + turb;
        vec3 rel = mod(p0 - cameraPosition + 0.5 * uBox, uBox) - 0.5 * uBox;
        vec3 c = cameraPosition + rel;
        float dist = max(length(rel), 1e-3);
        vec3 view = -rel / dist;
        vec3 e = abs(rel) / (0.5 * uBox);
        float edge = (1.0 - smoothstep(0.7, 1.0, e.x)) * (1.0 - smoothstep(0.7, 1.0, e.y)) * (1.0 - smoothstep(0.7, 1.0, e.z));
        vA = edge * smoothstep(0.55, 1.4, dist) * (0.45 + 0.55 * fract(iA.w * 13.7));
        vG = pow(max(dot(-view, uSun), 0.0), 6.0);
        vec3 p;
        if (${o.kind} == 0) {
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float s = ${o.size.toFixed(4)} * (0.55 + 0.9 * fract(iA.w * 3.7)) * max(1.0, dist * 0.1);
          p = c + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0;
        } else {
          vec3 vel = uWind * sp * uG + vec3(0.0, -fall, 0.0);
          vec3 dir = normalize(vel);
          float along = position.y + 0.5;
          vec3 sx = cross(dir, view); vec3 side = sx / max(length(sx), 1e-4);
          p = c - dir * ${o.len.toFixed(3)} * (0.5 + 0.5 * uG) * (0.6 + 0.8 * iA.w) * along + side * position.x * ${o.size.toFixed(4)} * max(1.0, dist * 0.35);
          vQ = vec2(position.x * 2.0, along);
        }
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; uniform vec3 uGold; uniform float uK; varying vec2 vQ; varying float vA; varying float vG;
      void main(){
        float a;
        if (${o.kind} == 0) { float d = dot(vQ, vQ); a = exp(-d * 3.2) * (1.0 - smoothstep(0.7, 1.0, d)); }
        else a = (1.0 - vQ.x * vQ.x) * smoothstep(0.0, 0.3, vQ.y) * (1.0 - smoothstep(0.55, 1.0, vQ.y));
        a *= vA * uK;
        gl_FragColor = vec4((uCol + uGold * vG) * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 8;
  return m;
};
/** ground drift ("snow snakes"): low wispy sheets standing on the snow along the wind, streaming with uS */
const driftMesh = (spots: number[][]) => {
  const n = spots.length, q = new THREE.PlaneGeometry(1, 1, 8, 1), g = new THREE.InstancedBufferGeometry();
  g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
  const P = new Float32Array(n * 4), S = new Float32Array(n * 4), Y = new Float32Array(n * 3);
  spots.forEach(([x, y0, z, L, h, seed, y1, y2], i) => { P.set([x, 0, z, seed], i * 4); S.set([L, h, 0, 0], i * 4); Y.set([y0, y1, y2], i * 3); });
  g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 4)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(S, 4)); g.setAttribute("iY", new THREE.InstancedBufferAttribute(Y, 3));
  g.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uS: { value: 0 }, uG: { value: 1 }, uWind: { value: WIND_L.clone() }, uCol: { value: new THREE.Color(1, 1, 1) }, uK: { value: 1 }, uSun: { value: V(0, 0.1, -1) }, uGold: { value: new THREE.Color() },
      uCh0: { value: V(ICE[0] - 0.6, 0, ICE[2]) }, uCh1: { value: V(ICE[0] + 0.65, 0, ICE[2] + 0.1) } },
    vertexShader: /* glsl */ `attribute vec4 iP; attribute vec4 iS; attribute vec3 iY; uniform vec3 uWind; uniform vec3 uSun; uniform vec3 uCh0; uniform vec3 uCh1; varying vec2 vQ; varying float vA; varying float vSeed; varying float vL; varying float vG;
      void main(){
        float u = position.x + 0.5;
        float yb = u < 0.5 ? mix(iY.x, iY.y, u * 2.0) : mix(iY.y, iY.z, u * 2.0 - 1.0); // follow the ground
        vec3 p = (modelMatrix * vec4(iP.x, 0.0, iP.z, 1.0)).xyz + uWind * position.x * iS.x + vec3(0.0, yb - 0.06 + (position.y + 0.5) * iS.y, 0.0);
        vec3 nrm = normalize(cross(uWind, vec3(0.0, 1.0, 0.0)));
        vec3 view = normalize(cameraPosition - p);
        float dist = length(cameraPosition - p);
        // keep the legs readable: thin out near the lens and around the two characters (ICE+(-0.6,0,0), ICE+(0.65,0,0.1))
        float dCh = min(length(p.xz - uCh0.xz), length(p.xz - uCh1.xz));
        vA = smoothstep(0.1, 0.45, abs(dot(view, nrm))) * smoothstep(2.6, 7.0, dist) * (1.0 - smoothstep(45.0, 70.0, dist)) * mix(0.1, 1.0, smoothstep(1.0, 4.0, dCh));
        vG = pow(max(dot(-view, uSun), 0.0), 5.0);
        vQ = vec2(u, position.y + 0.5); vSeed = iP.w; vL = iS.x;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
    fragmentShader: /* glsl */ `uniform float uS; uniform float uG; uniform vec3 uCol; uniform float uK; uniform vec3 uGold; varying vec2 vQ; varying float vA; varying float vSeed; varying float vL; varying float vG;
      ${HASHGL}
      void main(){
        float x = vQ.x * vL, y = vQ.y;
        vec2 q = vec2(x * 0.45 - uS * 1.9 + vSeed * 40.0, y * 3.0 + vSeed * 9.0);
        float n = n2(q) * 0.6 + n2(q * vec2(2.3, 2.7) + 5.0) * 0.4;
        float str = n2(vec2(x * 0.12 - uS * 0.48 + vSeed * 7.0, y * 9.0 + vSeed));
        float hgt = 0.25 + 0.75 * n2(vec2(x * 0.18 - uS * 0.6 + vSeed * 3.0, vSeed * 5.0));
        float a = smoothstep(0.35, 0.85, n * 0.7 + str * 0.5) * (1.0 - smoothstep(hgt * 0.4, hgt, y)) * smoothstep(0.0, 0.18, vQ.x) * (1.0 - smoothstep(0.82, 1.0, vQ.x));
        a *= vA * uK * clamp(uG, 0.0, 1.6) * 0.55;
        gl_FragColor = vec4((uCol + uGold * vG) * a, 1.0); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(g, mat);
  m.frustumCulled = false; m.layers.set(NOINK); m.renderOrder = 6;
  return m;
};
/** the sky dome: the looks' gradient + a streaming storm deck, a white-out band on the horizon, the pale sun disc
 *  glowing through the snow, a faint 22 deg halo */
const domeMat = () => new THREE.ShaderMaterial({
  uniforms: {
    c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() },
    uSun: { value: V(0, 0.1, -1) }, uT: { value: 0 }, uS: { value: 0 }, uWind: { value: new THREE.Vector2(1, 0) },
    uCloudL: { value: new THREE.Color() }, uCloudD: { value: new THREE.Color() }, uHaze: { value: new THREE.Color() }, uDisc: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() },
    uWhite: { value: 0 },
  },
  vertexShader: "varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: /* glsl */ `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; uniform vec3 uSun; uniform float uT; uniform float uS; uniform vec2 uWind;
    uniform vec3 uCloudL; uniform vec3 uCloudD; uniform vec3 uHaze; uniform vec3 uDisc; uniform vec3 uGlow; uniform float uWhite; varying vec3 vD;
    ${HASHGL}
    void main(){
      vec3 d = normalize(vD);
      float el = asin(clamp(d.y, -1.0, 1.0));
      vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el)); c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el));
      float sd = dot(d, uSun), ang = acos(clamp(sd, -1.0, 1.0));
      // storm deck: a flat layer in perspective, stretched + streaming along the wind
      float hy = max(d.y, 0.0) + 0.045;
      vec2 cp = d.xz / hy * 0.5;
      vec2 wp = vec2(-uWind.y, uWind.x);
      vec2 q = vec2(dot(cp, uWind) * 0.55 - uS * 0.03, dot(cp, wp) * 1.5);
      float f = fbm(q * 1.3 + 3.0);
      float g2 = n2(q * 4.1 + 11.0) * 0.6 + n2(q * 8.3 + 2.0) * 0.4;
      float cov = smoothstep(0.38, 0.62, f + 0.08 * g2) * 0.92;
      float th = smoothstep(0.5, 0.85, f + 0.1 * g2);
      vec3 cc = mix(uCloudL, uCloudD, th);
      float glow = pow(max(sd, 0.0), 600.0) + 0.12 * pow(max(sd, 0.0), 60.0);
      cc += uGlow * glow * (0.5 + 1.2 * (1.0 - th)) * 0.6;
      c = mix(c, cc, cov * smoothstep(0.0, 0.05, el));
      // blowing-snow sheets in the far air (fast horizontal streaks near the horizon)
      float az = atan(d.x, -d.z);
      float st = n2(vec2(az * 9.0 - uS * 0.045, el * 70.0)) * 0.6 + n2(vec2(az * 23.0 - uS * 0.09, el * 160.0 + 4.0)) * 0.4;
      float band = 1.0 - smoothstep(0.0, 0.2, el);
      c = mix(c, uHaze, band * smoothstep(0.4, 0.8, st) * 0.45);
      // white-out band on the horizon
      c = mix(c, uHaze, (1.0 - smoothstep(-0.02, 0.08, el)) * 0.6);
      // the pale sun disc through the snow + its glow + a faint 22 deg halo
      float thin = 1.0 - 0.45 * cov * th;
      float disc = 1.0 - smoothstep(0.019, 0.0225, ang);
      c = mix(c, uDisc, disc * thin);
      c += uGlow * (0.3 * exp(-ang * ang / 0.0009) + 0.14 * exp(-ang / 0.06) + 0.05 * exp(-ang / 0.3)) * (0.7 + 0.3 * thin);
      float hx = (ang - 0.384) / 0.016;
      c += uGlow * vec3(1.1, 0.95, 0.85) * 0.07 * exp(-hx * hx) * smoothstep(-0.02, 0.06, el);
      c = mix(c, uHaze, uWhite);
      gl_FragColor = vec4(c, 1.0); }`,
  side: THREE.BackSide, depthWrite: false, fog: false, transparent: true,
});
/** far icy ridges (rings around the camera), sunward glow, snow-white tops */
const ridgeMat = () => new THREE.ShaderMaterial({
  uniforms: { uCol: { value: new THREE.Color() }, uTop: { value: new THREE.Color() }, uFog: { value: new THREE.Color() }, uGlow: { value: new THREE.Color() }, uSun: { value: V(0, 0, -1) }, uMist: { value: 0.8 } },
  vertexShader: "attribute float k; varying float vK; varying vec3 vW; void main(){ vK = k; vW = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }",
  fragmentShader: /* glsl */ `uniform vec3 uCol; uniform vec3 uTop; uniform vec3 uFog; uniform vec3 uGlow; uniform vec3 uSun; uniform float uMist; varying float vK; varying vec3 vW;
    void main(){
      vec3 d = normalize(vec3(vW.x - cameraPosition.x, 0.0, vW.z - cameraPosition.z));
      float toSun = max(0.0, dot(d, normalize(vec3(uSun.x, 0.0, uSun.z))));
      vec3 c = mix(uCol, uTop, smoothstep(0.06, 0.0, vK));
      c = mix(c, uGlow, pow(toSun, 8.0) * 0.5);
      c = mix(c, uFog, smoothstep(0.0, 0.5, vK) * uMist);
      gl_FragColor = vec4(c, 1.0); }`,
  fog: false, side: THREE.DoubleSide,
});

// ============================================================ the Ice
type Inst = { x: number; y: number; z: number; yaw: number; s: number; ph: number; amp: number };
type Sway = { mesh: THREE.InstancedMesh; inst: Inst[] };
type Herd = { m: Mammoth; path: (t: number) => { x: number; z: number; yaw: number; walk: number }; graze: boolean; calf: boolean; s: number };

export class Ice {
  root = new THREE.Group();
  private dome: THREE.Mesh; private domeM: THREE.ShaderMaterial;
  private flakes: THREE.Mesh; private streaks: THREE.Mesh; private farStreaks: THREE.Mesh; private drift: THREE.Mesh;
  private veils: { s: THREE.Mesh; p: THREE.Vector3; w: number; h: number; ph: number; o: number }[] = [];
  private ridges: { m: THREE.Mesh; base: string; f: number }[] = [];
  private sway: Sway[] = [];
  private herd: Herd[] = [];
  private sunDir: THREE.Vector3 | null = null; private printMat!: THREE.ShaderMaterial;
  private m4 = new THREE.Matrix4(); private q = new THREE.Quaternion(); private qy = new THREE.Quaternion(); private vs = V(1, 1, 1); private vp = V(0, 0, 0);
  private leanAxis = V(WIND_L.z, 0, -WIND_L.x).normalize(); private yAxis = V(0, 1, 0);
  private fogC = new THREE.Color(); private tmpC = new THREE.Color(); private tv = V(0, 0, 0);

  constructor() {
    const R = this.root;
    R.position.set(...ICE);
    R.visible = false;
    const r = rng(4242);
    const sun = this.sun();
    const sunB = bearing(O.x + sun.x, O.z + sun.z);
    const snowM = snowMat("snow", { map: snowTex(), vertexColors: true }, { glit: 1, sheen: 0.5, rim: 0.35, ice: 0.12 });
    const glacierM = hazeCap(snowMat("glacier", { map: iceTex(), vertexColors: true }, { glit: 0.4, sheen: 0.6, rim: 0.5, ice: 0.9, halo: 0.3 }), "glacierHaze", 0.36);
    const iceM = snowMat("iceblk", { vertexColors: true }, { glit: 0.6, sheen: 0.8, rim: 0.6, ice: 1.0 });
    const iceFar = hazeCap(iceM, "iceFar", 0.38);
    const rockM = snowMat("rock", { vertexColors: true }, { glit: 0.5, sheen: 0.3, rim: 0.2, ice: 0.05 });
    const pineM = snowMat("pinev", { vertexColors: true }, { glit: 0.5, sheen: 0.3, rim: 0.2, ice: 0.05, halo: 0.25 });
    const pineFar = hazeCap(pineM, "pineFar", 0.6);
    const furM = hazeCap(snowMat("icFur", { vertexColors: true, map: furTex() }, { glit: 0.0, sheen: 0.15, rim: 0.12, ice: 0.0, halo: 0.8 }), "furHaze", 0.4);
    const grassM = lamb("icGrass", { vertexColors: true, side: THREE.DoubleSide });
    const bake = (l: THREE.BufferGeometry[], mt: THREE.Material, cast: boolean) => { if (!l.length) return; const mm = new THREE.Mesh(merge(l), mt); mm.castShadow = cast; mm.receiveShadow = true; mm.frustumCulled = false; mm.matrixAutoUpdate = false; R.add(mm); };

    // ---------------- terrain ----------------
    {
      const xs = axis(-300, 300, 0, (d) => 0.16 + 0.05 * d), zs = axis(-300, 120, 0, (d) => 0.16 + 0.05 * d);
      const NX = xs.length, NZ = zs.length, pos = new Float32Array(NX * NZ * 3), col = new Float32Array(NX * NZ * 3), uv = new Float32Array(NX * NZ * 2);
      const c = new THREE.Color();
      for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i, x = xs[i], z = zs[j], y = H(x, z);
        pos.set([x, y, z], k * 3); uv.set([x / 5, z / 5], k * 2);
        // hollows a touch bluer, crests whiter
        const hv = H(x + 0.6, z) + H(x - 0.6, z) + H(x, z + 0.6) + H(x, z - 0.6) - 4 * y;
        c.set("#eef3fb").lerp(C("#c8d8f0"), Math.max(0, Math.min(1, hv * 3 + 0.3 * (0.5 + 0.5 * vn(x * 0.2, z * 0.2)))));
        col.set([c.r, c.g, c.b], k * 3);
      }
      const idx: number[] = [];
      for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NX - 1; i++) { const a = j * NX + i, b = a + 1, cc = a + NX, d = cc + 1; idx.push(a, cc, d, a, d, b); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, snowM); m.receiveShadow = true; m.castShadow = false; m.frustumCulled = false; m.matrixAutoUpdate = false; R.add(m);
    }

    // ---------------- the glacier wall (an arc closing the view, a low saddle under the sun) ----------------
    {
      const Rb = (b: number) => 150 + 22 * vn(b * 0.05, 1.3) + 0.002 * b * b;
      const elT = (b: number) => { // top elevation (deg) seen from the mean camera
        const ds = Math.abs(b - sunB);
        return 3.4 + 5.2 * sm((ds - 1.6) / 6.5) + 1.8 * vn(b * 0.11, 4) * sm((ds - 3) / 5) + 2.5 * sm((Math.abs(b) - 45) / 50);
      };
      const B0 = -125, B1 = 125, NB = 1000, NV = 46;
      const LIP: [number, number][] = [[-1.2, 0.1], [-2.4, 0.5], [-2.9, 1.3], [-2.4, 2.1], [-1.0, 2.7], [1.5, 3.1], [6, 3.4], [16, 3.8], [40, 5], [110, 9]];
      const nRow = NV + LIP.length;
      const pos: number[] = [], uv: number[] = [], cols: number[] = [], idx: number[] = [];
      const c = new THREE.Color();
      for (let i = 0; i <= NB; i++) {
        const b = B0 + ((B1 - B0) * i) / NB, R0 = Rb(b), k = b * D2R * R0;
        const dir = V(0, 0, 0).addScaledVector(FWD, Math.cos(b * D2R)).addScaledVector(RT, Math.sin(b * D2R));
        // serac blocks: the top line steps in ~9 m blocks with small random heights
        const blk = Math.floor(k / 9 + 0.3 * vn(b * 0.2, 2)), bh = (hash(blk, 5.1) - 0.5) * 3.2;
        const top = 1.6 + R0 * Math.tan(elT(b) * D2R) + bh;
        const gx = H(O.x + dir.x * R0, O.z + dir.z * R0) - 8;
        for (let j = 0; j < NV; j++) {
          const y = gx + (top - gx) * Math.pow(j / (NV - 1), 0.9);
          const yr = (y - gx) / (top - gx);
          // flutes (vertical grooves), facets, an outward-flaring snow apron at the foot
          const gq = k / 7 + 0.25 * vn(y * 0.06, b * 0.1), gf = gq - Math.floor(gq);
          const groove = Math.exp(-(((gf - 0.5) / 0.11) ** 2));
          let dd = -2.2 * groove + 1.4 * vn(k * 0.07, y * 0.09) + 0.5 * vn(k * 0.25, y * 0.2);
          dd += 9 * sm((5 - (y - gx)) / 9);                      // apron (toward the camera)
          dd += -1.5 * sm((yr - 0.85) / 0.15) * hash(blk, 2.2);  // some tops lean back
          const rr = R0 - dd;
          pos.push(O.x + dir.x * rr, y, O.z + dir.z * rr); uv.push(k / 14, y / 14);
          c.set("#a8def0").lerp(C("#2a74b8"), groove * 0.9 * (1 - sm((yr - 0.9) / 0.1)));
          c.lerp(C("#9aa4b0"), 0.55 * Math.exp(-(((yr - 0.3 - 0.05 * vn(k * 0.05, 1)) / 0.025) ** 2)));     // a dirty moraine stripe
          c.lerp(C("#7ab8dc"), 0.35 * Math.exp(-(((yr - 0.55) / 0.04) ** 2)));
          c.lerp(C("#f4f8fc"), sm((10 - (y - gx)) / 5) * 0.9);                                         // snow apron
          cols.push(c.r, c.g, c.b);
        }
        for (const [dn, dy] of LIP) { // snow cap: a rounded lip and the ice sheet going back
          const rr = R0 + dn + (dn > 2 ? 2.5 * vn(k * 0.05, dn) : 0);
          pos.push(O.x + dir.x * rr, top + dy + (dn > 2 ? 0.8 * vn(k * 0.1, dn * 0.2) : 0), O.z + dir.z * rr); uv.push(k / 14, (top + dy) / 14);
          c.set(dn < -2 ? "#e4f0fa" : "#f6f9fd"); cols.push(c.r, c.g, c.b);
        }
      }
      for (let i = 0; i < NB; i++) for (let j = 0; j < nRow - 1; j++) { const a = i * nRow + j, bq = a + 1, d = a + nRow, e2 = d + 1; idx.push(a, d, e2, a, e2, bq); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
      g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, glacierM); m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; m.matrixAutoUpdate = false; R.add(m);
      // calved ice blocks at the foot + a few in the mid-ground
      const IB: THREE.BufferGeometry[] = [], IN: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 60; i++) {
        const b = B0 + (B1 - B0) * r(), d = Rb(b) - 12 - 22 * r(), p = at(b, d), s = 2 + 4 * r();
        IB.push(tf(iceBlockGeo(s, 300 + i), M(p.x, H(p.x, p.z) + s * 0.3, p.z)));
      }
      for (let i = 0, got = 0; i < 200 && got < 7; i++) {
        const b = (r() - 0.5) * 80, d = 14 + 40 * r(), p = at(b, d);
        if (camDist(p.x, p.z) < 5 || Math.abs(b - sunB) < 4) continue;
        const s = 0.5 + 1.0 * r(); IN.push(tf(iceBlockGeo(s, 400 + i), M(p.x, H(p.x, p.z) + s * 0.25, p.z))); got++;
      }
      bake(IB, iceFar, false); bake(IN, iceM, true);
    }

    // ---------------- boulders (snow-capped erratics) ----------------
    {
      const BS: THREE.BufferGeometry[] = [];
      for (let i = 0, got = 0; i < 400 && got < 22; i++) {
        const b = (r() - 0.5) * 150, d = 5 + 70 * Math.pow(r(), 1.4), p = at(b, d), s = 0.3 + 0.9 * r() * (d / 30 + 0.4);
        if (camDist(p.x, p.z) < 3 + s || stageD(p.x, p.z) < 1.5 + s || Math.abs(b - sunB) < 3) continue;
        BS.push(tf(rockGeo(s, 700 + i), M(p.x, H(p.x, p.z) - s * 0.18, p.z))); got++;
      }
      bake(BS, rockM, true);
    }

    // ---------------- pines: framing trees just off the frame edges, clumps + far belts (never in the sun lane) ----------------
    {
      const variants = [pineGeo(11, 8), pineGeo(12, 10), pineGeo(13, 6.5)];
      const near: Inst[][] = [[], [], []], far: Inst[][] = [[], [], []];
      const add = (list: Inst[][], vi: number, p: THREE.Vector3, s: number, amp: number) => list[vi].push({ x: p.x, y: H(p.x, p.z) - 0.25, z: p.z, yaw: r() * TAU, s, ph: r() * TAU, amp });
      const ok = (p: THREE.Vector3, b: number, rad: number) => camDist(p.x, p.z) > 3 + rad && stageD(p.x, p.z) > 2 + rad && Math.abs(b - sunB) > 5;
      for (const [b, d, vi, s] of [[-13.5, 40, 1, 1.0], [-17, 48, 0, 1.05], [12.5, 44, 1, 1.05], [15.5, 38, 2, 1.2], [-21, 34, 2, 0.95], [21, 36, 0, 0.95], [18, 55, 0, 1.1], [-15, 60, 2, 1.0]] as [number, number, number, number][]) {
        const p = at(b, d); if (ok(p, b, 2)) add(near, vi, p, s, 0.03);
      }
      for (let i = 0; i < 160; i++) {
        const side = r() < 0.5 ? -1 : 1, b = side * (14 + 70 * r()), d = 45 + 50 * r(), p = at(b, d);
        if (ok(p, b, 2)) add(d < 60 ? near : far, Math.floor(r() * 3), p, 0.8 + 0.5 * r(), 0.02);
      }
      for (let c = 0; c < 14; c++) {
        const cb = (r() - 0.5) * 200, cd = 70 + 50 * r();
        for (let k = 0; k < 9; k++) { const b = cb + (r() - 0.5) * 6, d = cd + (r() - 0.5) * 10, p = at(b, d); if (ok(p, b, 2)) add(far, Math.floor(r() * 3), p, 0.9 + 0.5 * r(), 0.012); }
      }
      for (const [lists, mt] of [[near, pineM], [far, pineFar]] as [Inst[][], THREE.Material][]) {
        lists.forEach((inst, vi) => {
          if (!inst.length) return;
          const m = new THREE.InstancedMesh(variants[vi], mt, inst.length);
          m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; R.add(m);
          this.sway.push({ mesh: m, inst });
        });
      }
    }

    // ---------------- frozen tundra grass tufts ----------------
    {
      const variants = [tuftGeo(21), tuftGeo(22)], lists: Inst[][] = [[], []];
      for (let i = 0, got = 0; i < 500 && got < 46; i++) {
        const b = (r() - 0.5) * 50, d = 6.5 + 30 * Math.pow(r(), 1.3), p = at(b, d);
        if (camDist(p.x, p.z) < 1.6 || (Math.abs(p.x + 0.6) < 0.9 && Math.abs(p.z) < 0.7) || (Math.abs(p.x - 0.65) < 0.7 && Math.abs(p.z - 0.1) < 0.6)) continue;
        lists[got % 2].push({ x: p.x, y: H(p.x, p.z), z: p.z, yaw: r() * TAU, s: 0.8 + 0.8 * r(), ph: r() * TAU, amp: 0.12 }); got++;
      }
      lists.forEach((inst, vi) => { if (!inst.length) return; const m = new THREE.InstancedMesh(variants[vi], grassM, inst.length); m.castShadow = false; m.receiveShadow = true; m.frustumCulled = false; R.add(m); this.sway.push({ mesh: m, inst }); });
    }

    // ---------------- the ancestor's footprints: a trail out of the storm to where he stands (BEAN has none: he just
    // appeared). Soft blue dimples just above the snow (NOINK, polygon offset), older prints filled in by the wind ----------------
    {
      const tex = ctex("icPrint", 128, 256, (g) => {
        g.clearRect(0, 0, 128, 256); g.fillStyle = "#ffffff"; g.shadowColor = "#ffffff"; g.shadowBlur = 14;
        g.beginPath(); g.ellipse(64, 150, 34, 70, 0, 0, TAU); g.fill();
        for (const [x, y, rr] of [[36, 62, 12], [54, 48, 13], [74, 46, 13], [92, 58, 12]]) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
      });
      const curve = new THREE.CatmullRomCurve3([V(-0.62, 0, -0.32), V(-1.0, 0, -2.2), V(-2.2, 0, -5.2), V(-3.4, 0, -9.5), V(-5.6, 0, -15.5), V(-9.5, 0, -24)]);
      const len = curve.getLength(), pos: number[] = [], uvs: number[] = [], al: number[] = [], idx: number[] = [];
      let n = 0;
      for (let d = 0.25, k = 0; d < len; d += 0.43, k++) {
        const u = d / len, c = curve.getPointAt(u), tg = curve.getTangentAt(u), sd = V(-tg.z, 0, tg.x).normalize(), side = k % 2 ? 1 : -1;
        const cx = c.x + sd.x * 0.13 * side, cz = c.z + sd.z * 0.13 * side, fw = V(-tg.x, 0, -tg.z).normalize(); // toes point toward the stage
        if (camDist(cx, cz) < 1.2) continue;
        const L = 0.38, Wd = 0.22, a = (1 - 0.75 * sm(d / 18)) * (0.85 + 0.15 * hash(k, 3));
        for (const [qx, qy, uu, vv] of [[-1, -1, 0, 1], [1, -1, 1, 1], [1, 1, 1, 0], [-1, 1, 0, 0]]) {
          const x = cx + sd.x * qx * Wd * 0.5 + fw.x * qy * L * 0.5, z = cz + sd.z * qx * Wd * 0.5 + fw.z * qy * L * 0.5;
          pos.push(x, H(x, z) + 0.012, z); uvs.push(side > 0 ? 1 - uu : uu, vv); al.push(a);
        }
        idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setAttribute("aA", new THREE.Float32BufferAttribute(al, 1)); g.setIndex(idx);
      this.printMat = new THREE.ShaderMaterial({
        uniforms: { map: { value: tex }, uCol: { value: new THREE.Color() } },
        vertexShader: "attribute float aA; varying vec2 vUv; varying float vA; void main(){ vUv = uv; vA = aA; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
        fragmentShader: "uniform sampler2D map; uniform vec3 uCol; varying vec2 vUv; varying float vA; void main(){ float a = texture2D(map, vUv).r * vA * 0.85; gl_FragColor = vec4(uCol, a); }",
        transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      const m = new THREE.Mesh(g, this.printMat); m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = 1; R.add(m);
    }

    // ---------------- the mammoths: a big one + its calf plodding across behind the gap, a far one grazing ----------------
    {
      const T0 = shotStart(4) - 0.3, T = (SHOTS[3].b - SHOTS[3].a) / 30 + 0.8;
      const mk = (b0: number, d0: number, b1: number, d1: number, calf: boolean, s: number, graze: boolean, seed: number) => {
        const m = mammoth(furM, calf, seed);
        m.g.scale.setScalar(s); R.add(m.g);
        const A = at(b0, d0), Bp = at(b1, d1), dir = Bp.clone().sub(A), len = dir.length();
        const yaw = graze ? Math.atan2(-(O.z - A.z), O.x - A.x) + 0.9 : Math.atan2(-dir.z, dir.x);
        this.herd.push({ m, calf, s, graze, path: (t) => { const u = graze ? 0 : Math.max(0, Math.min(1.1, (t - T0) / T)); return { x: A.x + dir.x * u, z: A.z + dir.z * u, yaw, walk: (u * len) / (s * (calf ? 1.9 : 2.4)) }; } });
      };
      const sideB = sunB < 0 ? 1 : -1; // walk away from the sun side, so the sun saddle stays clear
      mk(-4.5 * sideB, 35, 3.0 * sideB, 34, false, 1.0, false, 51);
      mk(-10.5 * sideB, 36, -3.0 * sideB, 35, true, 0.55, false, 52);
      mk(10 * sideB, 66, 10 * sideB, 66, false, 1.05, true, 53);
    }

    // ---------------- far vista: icy ridges around the camera ----------------
    {
      const ridge = (Rr: number, y0: number, amp: number, bump: number, seed: number, base: string, fk: number) => {
        const n = 360, pos: number[] = [], ks: number[] = [], idx: number[] = [];
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
          let top = y0 + amp * (0.6 * vn(c * 2 + seed, s * 2) + 0.4 * vn(c * 5 + seed, s * 5 + 3));
          top += bump * Math.pow(Math.abs(Math.sin(a * Rr / 14 + vn(c * 9, s * 9) * 2)), 1.5);
          pos.push(c * Rr, top, s * Rr, c * Rr, top - 160, s * Rr); ks.push(0, 1);
        }
        for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("k", new THREE.Float32BufferAttribute(ks, 1)); g.setIndex(idx);
        const m = new THREE.Mesh(g, ridgeMat()); m.layers.set(NOINK); m.frustumCulled = false; m.renderOrder = -0.8;
        R.add(m); this.ridges.push({ m, base, f: fk });
      };
      ridge(420, 10, 26, 14, 1, "#8ea2c4", 0.35);
      ridge(650, 30, 60, 22, 7, "#a4b2d0", 0.55);
    }

    // ---------------- dome, blowing snow, ground drift, veils ----------------
    this.domeM = domeMat();
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1000, 64, 32), this.domeM);
    this.dome.layers.set(NOINK); this.dome.frustumCulled = false; this.dome.renderOrder = -0.5; R.add(this.dome);
    this.flakes = snowMesh(5200, 11, V(14, 9, 14), { kind: 0, size: 0.016, len: 0, speed: 6.5, fall: 1.1, turb: 0.35 }); R.add(this.flakes);
    this.streaks = snowMesh(2600, 23, V(18, 10, 18), { kind: 1, size: 0.0035, len: 0.55, speed: 9, fall: 0.9, turb: 0.15 }); R.add(this.streaks);
    this.farStreaks = snowMesh(3600, 37, V(70, 26, 70), { kind: 1, size: 0.003, len: 1.6, speed: 11, fall: 0.8, turb: 0.1 }); R.add(this.farStreaks);
    {
      const spots: number[][] = [];
      for (let i = 0, got = 0; i < 600 && got < 90; i++) {
        const b = (r() - 0.5) * 80, d = 2.5 + 40 * Math.pow(r(), 1.3), p = at(b, d), L = 5 + 9 * r();
        if (camDist(p.x, p.z) < 1.5) continue;
        const e0 = p.clone().addScaledVector(WIND_L, -L / 2), e1 = p.clone().addScaledVector(WIND_L, L / 2);
        spots.push([p.x, H(e0.x, e0.z), p.z, L, 0.35 + 0.6 * r(), r(), H(p.x, p.z), H(e1.x, e1.z)]); got++;
      }
      this.drift = driftMesh(spots); R.add(this.drift);
    }
    {
      const vt = veilTex(), vg = new THREE.PlaneGeometry(1, 1);
      for (let i = 0; i < 16; i++) {
        const b = (r() - 0.5) * 60, d = 28 + 70 * Math.pow(r(), 1.2), p = at(b, d);
        const s = new THREE.Mesh(vg, new THREE.MeshBasicMaterial({ map: vt, transparent: true, depthWrite: false, fog: false, opacity: 0.5, side: THREE.DoubleSide }));
        s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 3; R.add(s);
        this.veils.push({ s, p: V(p.x, H(p.x, p.z) + 1 + 4 * r(), p.z), w: 14 + d * 0.5, h: 5 + d * 0.12, ph: r() * TAU, o: 0.3 + 0.35 * r() });
      }
    }
    this.animate(shotStart(4));
  }

  /** the world's camera-relative sun for shot 4 (same formula as world.shotSun) */
  private sun(): THREE.Vector3 {
    if (this.sunDir) return this.sunDir;
    const L = LOOKS.ice, az = THREE.MathUtils.degToRad(L.sunAz), el = THREE.MathUtils.degToRad(L.sunEl), fx = FWD.x, fz = FWD.z;
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    this.sunDir = V(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    return this.sunDir;
  }

  private animate(t: number) {
    const g = iceGust(t);
    // pines + grass lean downwind and shudder in the gusts
    for (const s of this.sway) {
      s.inst.forEach((p, i) => {
        const fl = Math.sin(t * 1.3 + p.ph) + 0.5 * Math.sin(t * 3.1 + p.ph * 1.7) + 0.3 * Math.sin(t * 7.7 + p.ph * 2.9);
        const lean = p.amp * (0.6 * g + 0.4 * g * fl);
        this.q.setFromAxisAngle(this.leanAxis, lean).multiply(this.qy.setFromAxisAngle(this.yAxis, p.yaw));
        this.m4.compose(this.vp.set(p.x, p.y, p.z), this.q, this.vs.set(p.s, p.s, p.s));
        s.mesh.setMatrixAt(i, this.m4);
      });
      s.mesh.instanceMatrix.needsUpdate = true;
    }
    // mammoths: plod, sway the trunk, swish the tail; the calf turns to look on the "boing"
    const look = sm((t - W.lost - 0.1) / 0.5);
    for (const h of this.herd) {
      const p = h.path(t), m = h.m, w = h.graze ? 0 : p.walk * TAU;
      m.g.position.set(p.x, H(p.x, p.z) - 0.05 * h.s, p.z); m.g.rotation.set(0, p.yaw, 0);
      m.legs.forEach((L, i) => { L.rotation.set(0, 0, 0.32 * Math.sin(w + (i === 0 || i === 3 ? 0 : Math.PI))); });
      m.body.position.y = 0.06 * Math.abs(Math.cos(w)); m.body.rotation.set(0.025 * Math.sin(w), 0, 0);
      if (h.graze) {
        m.head.rotation.set(0, 0, -0.32 + 0.05 * Math.sin(t * 1.3)); m.trunk.rotation.set(0, 0, 0.25 + 0.15 * Math.sin(t * 1.7));
      } else {
        let turn = 0;
        if (h.calf) { // head yaw toward the camera, clamped
          const a = Math.atan2(-(O.z - p.z), O.x - p.x) - p.yaw, d = Math.atan2(Math.sin(a), Math.cos(a));
          turn = Math.max(-0.75, Math.min(0.75, d)) * look;
        }
        m.head.rotation.set(0, turn, 0.04 * Math.sin(w) - 0.05 + 0.1 * look * (h.calf ? 1 : 0));
        m.trunk.rotation.set(0.1 * Math.sin(t * 1.1 + h.s), 0, 0.18 * Math.sin(t * 1.4 + h.s * 3) + 0.1 * Math.sin(w));
      }
      m.tail.rotation.set(0.3 * Math.sin(t * 2.3 + h.s), 0, 0.15 * Math.sin(t * 1.6));
    }
  }

  update(id: number, t: number, _f: number, cam: THREE.PerspectiveCamera) {
    const R = this.root;
    R.visible = id === 4;
    if (!R.visible) return;
    if (DEBUG_CAM) {
      cam.position.set(...Iw(...DEBUG_CAM.pos)); cam.up.set(0, 1, 0); cam.lookAt(...Iw(...DEBUG_CAM.look));
      cam.fov = DEBUG_CAM.fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    }
    const L = LOOKS.ice, sun = this.sun(), S = iceWindS(t), g = iceGust(t);
    const whoosh = 1 - sm((t - shotStart(4) + 0.15) / 0.7); // the white-out we arrive through clears
    untone(L.fog[0], this.fogC);
    SNOW.uT.value = t;
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#ffffff"), 0.3), SNOW.uGlint.value).multiplyScalar(1.4);
    untone(this.tmpC.set(L.sky.c[3]).lerp(C("#ffffff"), 0.3), SNOW.uSheen.value).multiplyScalar(0.25);
    untone(this.tmpC.set(L.sky.c[2]).lerp(C("#9cc8ff"), 0.5), SNOW.uRim.value).multiplyScalar(0.5);
    untone("#4aa8d8", SNOW.uIce.value).multiplyScalar(0.35);
    untone(this.tmpC.set("#6c86c4").lerp(C(L.sky.c[3]), 0.3), this.printMat.uniforms.uCol.value);
    // dome
    const du = this.domeM.uniforms;
    L.sky.c.forEach((h, i) => untone(h, du["c" + i].value));
    const ee = L.sky.e.map((d) => THREE.MathUtils.degToRad(d)); du.e.value.set(ee[1], ee[2], ee[3], ee[4]);
    du.uSun.value.copy(sun); du.uT.value = t; du.uS.value = S; du.uWind.value.set(WIND_L.x, WIND_L.z).normalize();
    untone(this.tmpC.set(L.sky.c[2]).lerp(C("#ffffff"), 0.2), du.uCloudL.value);
    untone(this.tmpC.set(L.sky.c[3]).lerp(C("#6c7898"), 0.4), du.uCloudD.value);
    untone(this.tmpC.set(L.fog[0]).lerp(C("#ffffff"), 0.2), du.uHaze.value);
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#fff6d8"), 0.3), du.uDisc.value).multiplyScalar(1.25);
    untone(this.tmpC.set(L.light.sunCol).lerp(C("#fff4dc"), 0.4), du.uGlow.value).multiplyScalar(0.5);
    du.uWhite.value = 0.6 * whoosh;
    this.dome.position.copy(cam.position).sub(R.position);
    // ridges
    const cl = R.worldToLocal(this.tv.copy(cam.position));
    for (const { m, base, f: fk } of this.ridges) {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      m.position.set(cl.x, 0, cl.z);
      untone(this.tmpC.set(base).lerp(C(L.fog[0]), fk), u.uCol.value);
      untone(this.tmpC.set("#f4f8ff").lerp(C(L.fog[0]), fk * 0.6), u.uTop.value);
      u.uFog.value.copy(this.fogC); untone(this.tmpC.set(L.light.sunCol).lerp(C(L.fog[0]), 0.4), u.uGlow.value); u.uSun.value.copy(sun); u.uMist.value = 0.8;
    }
    // blowing snow
    const snowCol = untone(this.tmpC.set(L.fog[0]).lerp(C("#ffffff"), 0.7)).clone();
    const gold = untone(this.tmpC.set(L.light.sunCol).lerp(C("#fff2d0"), 0.4)).clone();
    for (const [m, k] of [[this.flakes, 0.75], [this.streaks, 0.5], [this.farStreaks, 0.34]] as [THREE.Mesh, number][]) {
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      u.uT.value = t; u.uS.value = S; u.uG.value = g; u.uSun.value.copy(sun);
      u.uK.value = k * (0.55 + 0.45 * Math.min(g, 1.6)) * (1 + 0.8 * whoosh);
      u.uCol.value.copy(snowCol).multiplyScalar(0.8); u.uGold.value.copy(gold).multiplyScalar(1.6);
    }
    {
      const u = (this.drift.material as THREE.ShaderMaterial).uniforms;
      u.uS.value = S; u.uG.value = g; u.uSun.value.copy(sun); u.uCol.value.copy(snowCol).multiplyScalar(0.75); u.uGold.value.copy(gold).multiplyScalar(1.2);
    }
    // veils: drifting snow sheets (camera-facing), thicker in the gust + the arrival white-out
    for (const v of this.veils) {
      const dr = (((S * 0.35 + v.ph * 7) % 30) + 30) % 30 - 15;
      v.s.position.set(v.p.x + WIND_L.x * dr, v.p.y + 0.6 * Math.sin(t * 0.4 + v.ph), v.p.z + WIND_L.z * dr);
      v.s.quaternion.copy(cam.quaternion);
      v.s.scale.set(v.w, v.h, 1);
      const mm = v.s.material as THREE.MeshBasicMaterial;
      mm.opacity = 0.22 * v.o * sm((15 - Math.abs(dr)) / 5) * (0.45 + 0.4 * Math.min(g, 1.7)) * (1 + 0.6 * whoosh); mm.color.copy(this.fogC).multiplyScalar(1.05);
    }
    this.animate(t);
  }
}
