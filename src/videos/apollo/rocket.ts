// OWNER: rocket agent. Saturn V (base = bottom of the F-1 bells at the group origin, axis +y, ~111 m), engine fire +
// exhaust plume (NOINK, additive, HDR), launch smoke/steam (NOINK, shot 5), the red launch umbilical tower with swing
// arms at PAD z=-20, and the lunar module at MOON. The group holds the rocket (posed by rocketAt); tower, smoke and LM
// are world-anchored and added to the group's parent on the first pose (they manage their own visibility):
//   tower: rocket group visible and pos.y < 300 near PAD  (pad shots 3, 4, 5, 16)
//   smoke: same and engines > 0                         (liftoff, shot 5)
//   LM   : rocket group hidden (cabin / mcc / moon places; it sits 3000+ m away from the other sets)
// Everything is a pure function of (state, t): flicker = fixed sums of sines, puffs = closed-form trajectories.
import * as THREE from "three";
import { V, Batch } from "../bridge/build";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ctex } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { RocketState, W, MOON, PAD, smooth, clamp01 } from "./story";

export type Rocket = {
  group: THREE.Group;
  tower: THREE.Group; smoke: THREE.InstancedMesh; lm: THREE.Group;
  arms: { g: THREE.Group; a0: number; a1: number; crew: boolean }[];
  fire: THREE.Group; bellMat: THREE.MeshBasicMaterial; glows: THREE.ShaderMaterial[];
  attached: boolean;
};

const H = 111.2; // overall height (bell exits .. LES tip)
/** DIAGRAM place only: the rocket is drawn DIAG.s times bigger with its base DIAG.dy lower than rocketAt() says, so it
 *  reads clearly in the wide explanation shots (outdoor.ts builds the wire bolt from rocketPlaced()). */
export const DIAG = { s: 2.5, dy: -180 };
export const isDiagram = (s: RocketState) => s.pos[2] < -3000;
/** where the rocket is actually drawn: base, uniform scale */
export const rocketPlaced = (s: RocketState) => {
  const d = isDiagram(s);
  return { base: V(s.pos[0], s.pos[1] + (d ? DIAG.dy : 0), s.pos[2]), scale: d ? DIAG.s : 1 };
};

// ---------------- materials ----------------
const PAINT_GLSL = /* glsl */ `
vec3 pLit( vec3 c ) { float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); return mix( vec3( l ) * vec3( 1.04, 1.0, 0.95 ), c, 0.45 ) * 1.04; }
vec3 pShade( vec3 c ) { float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); return mix( vec3( l ) * vec3( 0.96, 0.98, 1.05 ), c, 0.3 ) * max( 1.0, 0.36 / max( l, 1e-3 ) ); }
`;
/** world two-tone tuned for paint (as gimli/plane.ts): neutral-ish lit/shade colours so white stays white, sky rim */
const paintTone = <T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, liftK = 0.15, rim = 0.16): T => {
  twoTone(m, liftK);
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader
      .replace("uniform float uSat;", "uniform float uSat;\n" + PAINT_GLSL)
      .replace("vec3 lit = uLitCol *", "vec3 lit = pLit( uLitCol ) *")
      .replace("albSh * uShadeCol * skyK", "albSh * pShade( uShadeCol ) * skyK")
      .replace("reflectedLight.indirectDiffuse = vec3( 0.0 );",
        `reflectedLight.indirectDiffuse = alb * pShade( uShadeCol ) * pow( 1.0 - facing, 3.0 ) * ${rim.toFixed(3)} * 3.0;`);
    if (!sh.fragmentShader.includes("pShade( uShadeCol ) * skyK")) throw new Error("rocket.ts: shade.ts TWO_TONE changed");
  };
  m.customProgramCacheKey = () => `rocketPaint1_${liftK.toFixed(3)}_${rim.toFixed(3)}`;
  return m;
};
const mats = new Map<string, THREE.Material>();
const pm = (key: string, p: THREE.MeshPhongMaterialParameters, liftK = 0.15) => {
  let m = mats.get(key);
  if (!m) { m = paintTone(new THREE.MeshPhongMaterial({ specular: "#2e2e2e", shininess: 30, ...p }), liftK); mats.set(key, m); }
  return m;
};
const lm = (key: string, p: THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(p)); mats.set(key, m); }
  return m;
};

/** billow material: paint two-tone, shade pulled to a soft neutral (no lavender), lit tops white, plus a warm
 *  orange underlight on down-facing sides scaled by SMOKE_U.uUnder (engines on) */
const SMOKE_U = { uUnder: { value: 0 } };
const smokeMat = () => {
  const m = paintTone(new THREE.MeshPhongMaterial({ color: "#f4f2ee", specular: "#000000", shininess: 1 }), 0.4, 0.1);
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    sh.uniforms.uUnder = SMOKE_U.uUnder;
    sh.fragmentShader = sh.fragmentShader.replace("uniform float uSat;", "uniform float uSat; uniform float uUnder;")
      .replace("#include <aomap_fragment>", `{
  vec3 dd = reflectedLight.directDiffuse;
  float l = dot( dd, vec3( 0.2126, 0.7152, 0.0722 ) );
  dd = mix( vec3( l ) * vec3( 1.0, 0.985, 0.97 ), dd, 0.4 );                  // soft neutral shade, no purple
  vec3 upV2 = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  float down = clamp( -dot( normal, upV2 ) * 0.8 + 0.25, 0.0, 1.0 );
  dd += diffuseColor.rgb * vec3( 1.0, 0.48, 0.16 ) * uUnder * down * down;   // flame underlight
  reflectedLight.directDiffuse = dd;
}
#include <aomap_fragment>`);
    if (!sh.fragmentShader.includes("flame underlight")) throw new Error("rocket.ts: smoke shader patch failed");
  };
  m.customProgramCacheKey = () => "rocketSmoke2";
  return m;
};

// ---------------- textures ----------------
const TW = 1024, TH = 2048;
/** hull: u = azimuth (lathe phi / 2pi, phi 0 = +z, increasing toward +x), v = y / H */
const hullTex = () => ctex("saturnHull1", TW, TH, (g) => {
  const Y = (y: number) => TH - (y / H) * TH;          // metres -> canvas y
  const U = (deg: number) => (deg / 360) * TW;
  const white = "#f3f1ec", black = "#1c1e23", seam = "rgba(70,76,90,0.55)";
  g.fillStyle = white; g.fillRect(0, 0, TW, TH);
  // faint cool shading toward the base so the long white body never reads flat
  const sh = g.createLinearGradient(0, Y(6), 0, Y(42));
  sh.addColorStop(0, "rgba(150,160,180,0.10)"); sh.addColorStop(1, "rgba(150,160,180,0)");
  g.fillStyle = sh; g.fillRect(0, Y(42), TW, Y(6) - Y(42));
  /** fill sectors of width w (deg) centred on the given azimuths, between heights y0..y1 */
  const sectors = (cs: number[], w: number, y0: number, y1: number, col: string) => {
    g.fillStyle = col;
    for (const c of cs) for (const k of [-360, 0, 360]) g.fillRect(U(c - w / 2 + k), Y(y1), U(w), Y(y0) - Y(y1));
  };
  const S4 = [0, 90, 180, 270], X4 = [45, 135, 225, 315];
  // S-IC roll pattern: aft skirt + forward skirt checkers, four long stripes, black intertank with white windows
  sectors(S4, 45, 5.8, 9.6, black);
  sectors(S4, 45, 9.6, 27.2, black);
  sectors(X4, 45, 27.2, 32.2, black);
  sectors(S4, 45, 32.2, 40.4, black);
  sectors(X4, 45, 40.4, 42.0, black);
  // S-II: white, thin black ring at the interstage top; S-IVB aft roll quadrants; IU light grey
  g.fillStyle = black; g.fillRect(0, Y(47.8), TW, Y(47.3) - Y(47.8));
  sectors([45, 225], 90, 71.0, 75.2, black);
  g.fillStyle = "#d9dbdf"; g.fillRect(0, Y(85.5), TW, Y(84.6) - Y(85.5));
  g.fillStyle = "#2b2e35"; for (let a = 0; a < 360; a += 22.5) g.fillRect(U(a), Y(85.5), 3, Y(84.6) - Y(85.5));
  // seams: stage joints (dark) and soft panel lines
  g.fillStyle = seam;
  for (const y of [5.9, 9.6, 27.2, 32.2, 40.4, 42.0, 47.5, 52.5, 57.5, 62.5, 66.0, 71.0, 75.2, 80.0, 84.6, 85.5, 90, 94]) g.fillRect(0, Y(y) - 2, TW, 4);
  g.fillStyle = "rgba(90,96,110,0.14)";
  for (let a = 0; a < 360; a += 7.5) { g.fillRect(U(a), Y(47.3), 2, Y(42) - Y(47.3)); g.fillRect(U(a), Y(71), 2, Y(66) - Y(71)); }
  g.fillStyle = "rgba(90,96,110,0.3)"; for (const a of [0, 90, 180, 270]) g.fillRect(U(a + 45), Y(94), 3, Y(85.5) - Y(94)); // SLA panels
  // flag + vertical "USA" in the white columns facing the usual cameras (az 315 and 45)
  const flag = (az: number, y0: number) => {
    const fw = 3.6, fh = 2.4, sx = TW / 31.4, sy = TH / H, x0 = U(az) - (fw * sx) / 2, yt = Y(y0 + fh);
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? "#f4f2ee" : "#c4282f"; g.fillRect(x0, yt + (i * fh * sy) / 7, fw * sx, (fh * sy) / 7 + 0.5); }
    g.fillStyle = "#23397a"; g.fillRect(x0, yt, fw * sx * 0.44, ((fh * sy) * 4) / 7);
    g.fillStyle = "#ffffff"; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) g.fillRect(x0 + 5 + j * 9, yt + 4 + i * 7, 3, 3);
  };
  const usa = (az: number) => {
    const sx = TW / 31.4, sy = TH / H; // px per metre across / along
    g.save(); g.fillStyle = black; g.textAlign = "center"; g.textBaseline = "middle";
    ["U", "S", "A"].forEach((c, i) => {
      g.save(); g.translate(U(az), Y(22.6 - i * 4.1)); g.scale(sx / 100, sy / 100);
      g.font = "bold 340px 'Liberation Sans', Arial, Helvetica, sans-serif"; g.fillText(c, 0, 0); g.restore();
    });
    g.restore();
    flag(az, 34.6);
  };
  usa(315); usa(45);
});
/** crinkled gold foil (LM descent stage) */
const foilTex = (key: string, base: [number, number, number]) => ctex(key, 512, 512, (g, r) => {
  g.fillStyle = `rgb(${base.join(",")})`; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const x = r() * 512, y = r() * 512, s = 18 + r() * 46, k = 0.72 + r() * 0.5;
    g.fillStyle = `rgb(${base.map((c) => Math.min(255, Math.round(c * k))).join(",")})`;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 4; j++) g.lineTo(x + (r() - 0.3) * s, y + (r() - 0.3) * s);
    g.closePath(); g.fill();
  }
  g.strokeStyle = "rgba(255,245,200,0.55)"; g.lineWidth = 2;
  for (let i = 0; i < 60; i++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 60); g.stroke(); }
  g.strokeStyle = "rgba(80,45,10,0.45)";
  for (let i = 0; i < 50; i++) { const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 70, y + (r() - 0.5) * 70); g.stroke(); }
});

// ---------------- geometry helpers ----------------
/** lathe from (r, y) points walked bottom -> top on the outside (outward normals); uv.v = y / H for the hull map */
const lathe = (pts: [number, number][], segs = 64, hullUV = true) => {
  const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  if (hullUV) {
    const uv = g.attributes.uv as THREE.BufferAttribute, p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setY(i, p.getY(i) / H);
  }
  return g;
};
const M = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s: number | THREE.Vector3 = 1) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), typeof s === "number" ? V(s, s, s) : s);
/** a box beam from a to b (square section w) */
const beam = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, w: number, d = w) => {
  const len = a.distanceTo(c), mid = a.clone().add(c).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize());
  b.add(new THREE.BoxGeometry(w, len, d), mat, new THREE.Matrix4().compose(mid, q, V(1, 1, 1)));
};
const rod = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, r: number, seg = 8) => {
  const len = a.distanceTo(c), mid = a.clone().add(c).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), c.clone().sub(a).normalize());
  b.add(new THREE.CylinderGeometry(r, r, len, seg, 1, false), mat, new THREE.Matrix4().compose(mid, q, V(1, 1, 1)));
};
/** radial direction for lathe azimuth deg (phi 0 = +z, toward +x) */
const rad = (deg: number) => { const p = THREE.MathUtils.degToRad(deg); return V(Math.sin(p), 0, Math.cos(p)); };

// ---------------- glow shader (flames + plume): additive, HDR, soft radial falloff, deterministic flicker ----------------
const GLOW_VS = /* glsl */ `
uniform float uLen, uR0, uR1, uGrow, uSlope, uT, uSeed;
varying float vD; varying vec3 vN; varying vec3 vV;
void main() {
  float d = ( 0.5 - position.y ) * uLen;              // unit cylinder y 0.5 (nozzle) .. -0.5 (tail)
  float r = mix( uR0, uR1, smoothstep( 0.0, uGrow, d ) ) + uSlope * d;
  r *= 1.0 + 0.05 * sin( d * 0.21 - uT * 31.0 + uSeed ) + 0.03 * sin( d * 0.53 + uT * 17.0 + uSeed * 2.0 );
  vec3 p = vec3( normalize( position.xz + 1e-6 ).x * r, -d, normalize( position.xz + 1e-6 ).y * r );
  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  vD = d; vN = normalize( normalMatrix * vec3( position.x, 0.0, position.z ) ); vV = normalize( -mv.xyz );
  gl_Position = projectionMatrix * mv;
}`;
const GLOW_FS = /* glsl */ `
uniform float uLen, uT, uSeed, uE, uA, uHot, uPow;
uniform vec3 uColA, uColB;
varying float vD; varying vec3 vN; varying vec3 vV;
void main() {
  float u = vD / max( uLen, 1e-3 );
  float f = abs( dot( normalize( vN ), normalize( vV ) ) );
  float rim = pow( f, uPow );
  float along = exp( -u * 2.2 ) * ( 1.0 - smoothstep( 0.72, 1.0, u ) ) * smoothstep( 0.0, 0.015, u + 0.004 );
  float fl = 0.78 + 0.14 * sin( vD * 0.16 - uT * 43.0 + uSeed ) + 0.08 * sin( vD * 0.41 - uT * 71.0 + uSeed * 3.1 );
  vec3 col = mix( uColA, uColB, smoothstep( 0.0, uHot, vD ) );
  float a = clamp( uA * uE * rim * along * fl, 0.0, 1.0 );
  gl_FragColor = vec4( col * a, a );
}`;
const glowMat = (o: { r0: number; r1: number; grow: number; slope: number; a: number; hot: number; pow: number; colA: THREE.Color; colB: THREE.Color; seed: number }) =>
  new THREE.ShaderMaterial({
    uniforms: {
      uLen: { value: 10 }, uR0: { value: o.r0 }, uR1: { value: o.r1 }, uGrow: { value: o.grow }, uSlope: { value: o.slope },
      uT: { value: 0 }, uSeed: { value: o.seed }, uE: { value: 0 }, uA: { value: o.a }, uHot: { value: o.hot }, uPow: { value: o.pow },
      uColA: { value: o.colA }, uColB: { value: o.colB },
    },
    vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, side: THREE.DoubleSide, fog: false,
  });
const glowGeo = new THREE.CylinderGeometry(1, 1, 1, 40, 96, true);

// ---------------- the Saturn V ----------------
export const R_AT = (y: number) => (y < 66 ? 5 : y < 71 ? 5 - ((y - 66) / 5) * 1.7 : y < 85.5 ? 3.3 : y < 94 ? 3.3 - ((y - 85.5) / 8.5) * 1.35 : y < 99.4 ? 1.95 : 1.6);
const ENG = [V(0, 0, 0), ...[45, 135, 225, 315].map((a) => rad(a).multiplyScalar(3.55))];

const buildSaturn = (group: THREE.Group) => {
  const b = new Batch();
  const hull = pm("hull", { map: hullTex() });
  const metal = pm("metal", { color: "#c7cbd2", specular: "#5a5e66", shininess: 50 });
  const dark = pm("darkMetal", { color: "#4a4d55", specular: "#3a3c42", shininess: 40 });
  const white = pm("white", { color: "#f1efea" });
  const black = pm("black", { color: "#23252b" });
  const les = pm("lesRed", { color: "#d9542f" });
  // hull pieces (separate lathes -> crisp creases at every stage joint)
  b.add(lathe([[0, 5.8], [4.85, 5.8]]), hull);                                 // heat shield (faces down)
  b.add(lathe([[4.85, 5.8], [5, 6.05]]), hull);
  b.add(lathe([[5, 6.05], [5, 66]], 72), hull);                                 // S-IC + interstage + S-II
  b.add(lathe([[5, 66], [3.3, 71]], 72), hull);                                 // S-II / S-IVB adapter
  b.add(lathe([[3.3, 71], [3.3, 84.6]], 64), hull);                             // S-IVB
  b.add(lathe([[3.36, 84.6], [3.36, 85.5]], 64), hull);                         // instrument unit ring (slightly proud)
  b.add(lathe([[3.3, 84.6], [3.36, 84.6]], 64), hull); b.add(lathe([[3.36, 85.5], [3.3, 85.5]], 64), hull);
  b.add(lathe([[3.3, 85.5], [1.95, 94]], 64), hull);                            // SLA (holds the LM)
  b.add(lathe([[1.95, 94], [1.95, 99.4]], 48, false), metal);                   // service module
  b.add(lathe([[1.95, 99.4], [1.98, 99.55]], 48, false), white);
  b.add(lathe([[1.98, 99.55], [1.4, 100.6], [0.9, 101.6], [0.52, 102.35], [0.38, 102.6]], 48, false), white); // CM boost cover
  // SM radiator stripes + SM top ring
  for (let a = 0; a < 360; a += 30) b.add(new THREE.BoxGeometry(0.55, 4.2, 0.08), metal, M(rad(a).x * 1.97, 96.6, rad(a).z * 1.97, 0, THREE.MathUtils.degToRad(a), 0));
  b.add(new THREE.TorusGeometry(1.96, 0.07, 6, 48), dark, M(0, 99.35, 0, Math.PI / 2));
  // launch escape system: lattice tower, motor, nozzles, canards, Q-ball
  const sq = (h: number, s: number, k: number) => V(k & 1 ? s : -s, h, k & 2 ? s : -s);
  const lb = new Batch();
  for (let k = 0; k < 4; k++) rod(lb, les, sq(102.55, 0.62, k), sq(106.7, 0.36, k), 0.09, 6);
  for (const [h0, h1] of [[102.6, 104.0], [104.0, 105.4], [105.4, 106.7]]) {
    const s0 = 0.62 + (0.36 - 0.62) * ((h0 - 102.55) / 4.15), s1 = 0.62 + (0.36 - 0.62) * ((h1 - 102.55) / 4.15);
    for (const [k0, k1] of [[0, 1], [1, 3], [3, 2], [2, 0]]) { rod(lb, les, sq(h0, s0, k0), sq(h1, s1, k1), 0.05, 5); rod(lb, les, sq(h1, s1, k0), sq(h1, s1, k1), 0.05, 5); }
  }
  lb.build(group);
  b.add(lathe([[0, 106.7], [0.34, 106.7]], 32, false), black);
  b.add(lathe([[0.34, 106.7], [0.34, 109.7]], 32, false), white);
  b.add(lathe([[0.34, 109.7], [0.3, 110.4], [0.16, 110.85], [0.06, 111.05], [0, 111.2]], 32, false), black);
  for (let k = 0; k < 4; k++) {
    const d = rad(45 + 90 * k);
    b.add(lathe([[0.16, 0], [0.09, 0.42], [0.07, 0.5], [0, 0.52]], 12, false), dark, new THREE.Matrix4().compose(V(d.x * 0.24, 106.35, d.z * 0.24), new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), V(-d.x * 0.5, 1, -d.z * 0.5).normalize()), V(1, 1, 1)));
  }
  for (const a of [0, 180]) b.add(new THREE.BoxGeometry(0.05, 0.5, 0.42), black, M(rad(a).x * 0.42, 110.1, rad(a).z * 0.42, 0, THREE.MathUtils.degToRad(a), 0));
  // S-IVB auxiliary propulsion modules + ullage pods
  for (const a of [90, 270]) b.add(new THREE.CapsuleGeometry(0.55, 1.6, 6, 16), black, M(rad(a).x * 3.35, 72.6, rad(a).z * 3.35));
  // engine fairings + fins (fins on the 45-degree columns, under the white stripes)
  for (let k = 0; k < 4; k++) {
    const az = 45 + 90 * k, d = rad(az), c = d.clone().multiplyScalar(4.95);
    b.add(lathe([[0, 4.3], [1.45, 4.3]], 32, false), white, M(c.x, 0, c.z)); // bottom cap (faces down)
    b.add(lathe([[1.45, 4.3], [1.5, 9.2], [1.32, 11.4], [0.95, 13.2], [0.45, 14.6], [0, 15.1]], 32, false), white, M(c.x, 0, c.z));
    const sh = new THREE.Shape([new THREE.Vector2(0, 5.2), new THREE.Vector2(0, 11.8), new THREE.Vector2(3.3, 6.2), new THREE.Vector2(3.4, 3.7), new THREE.Vector2(3.0, 3.6)]);
    const fin = new THREE.ExtrudeGeometry(sh, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 4 });
    fin.translate(0, 0, -0.16);
    const th = THREE.MathUtils.degToRad(az) - Math.PI / 2;
    const p = d.clone().multiplyScalar(6.2);
    b.add(fin, white, M(p.x, 0, p.z, 0, th, 0));
  }
  // F-1 engines: outer wall + lip + inner (glowing) wall, manifold torus, turbopump block
  const bellMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.06, 0.055, 0.05), fog: false });
  const ib = new Batch();
  for (const e of ENG) {
    b.add(lathe([[1.78, 0.25], [1.62, 1.4], [1.34, 2.8], [1.08, 4.0], [0.92, 4.9], [0.86, 5.4], [0.9, 5.85]], 40, false), dark, M(e.x, 0, e.z));
    b.add(lathe([[1.7, 0.25], [1.78, 0.25]], 40, false), dark, M(e.x, 0, e.z));
    b.add(new THREE.TorusGeometry(1.2, 0.13, 8, 40), metal, M(e.x, 3.0, e.z, Math.PI / 2));
    b.add(new THREE.TorusGeometry(1.74, 0.07, 6, 40), metal, M(e.x, 0.42, e.z, Math.PI / 2));
    ib.add(lathe([[0.5, 4.9], [0.85, 4.4], [1.05, 3.4], [1.3, 2.2], [1.52, 1.1], [1.7, 0.25]], 40, false), bellMat, M(e.x, 0, e.z));
    ib.add(lathe([[0, 4.9], [0.5, 4.9]], 20, false), bellMat, M(e.x, 0, e.z));
  }
  b.build(group); ib.build(group, false);
  return bellMat;
};

const buildFire = (fire: THREE.Group, glows: THREE.ShaderMaterial[]) => {
  const C = (r: number, g: number, b: number) => new THREE.Color(r, g, b);
  const add = (m: THREE.ShaderMaterial, x: number, z: number, y = 0.3) => {
    const mesh = new THREE.Mesh(glowGeo, m); mesh.position.set(x, y, z); mesh.layers.set(NOINK); mesh.frustumCulled = false; mesh.renderOrder = 5;
    fire.add(mesh); glows.push(m);
  };
  ENG.forEach((e, i) => {
    // white-hot core pinching below each bell, then a fatter orange flame
    add(glowMat({ r0: 1.55, r1: 0.7, grow: 9, slope: 0, a: 0.8, hot: 6, pow: 1.3, colA: C(4.2, 3.0, 1.5), colB: C(3.4, 1.6, 0.55), seed: i * 1.7 }), e.x, e.z);
    add(glowMat({ r0: 1.85, r1: 2.6, grow: 6, slope: 0.02, a: 0.75, hot: 10, pow: 1.4, colA: C(3.6, 2.0, 0.75), colB: C(2.4, 0.9, 0.26), seed: 3 + i * 2.3 }), e.x, e.z);
  });
  // the long plume: glowing core + a softer, wider outer envelope
  add(glowMat({ r0: 5.6, r1: 8.2, grow: 26, slope: 0.012, a: 0.95, hot: 70, pow: 1.1, colA: C(4.0, 2.7, 1.25), colB: C(2.2, 0.85, 0.26), seed: 11 }), 0, 0);
  add(glowMat({ r0: 7.2, r1: 13, grow: 40, slope: 0.03, a: 0.45, hot: 90, pow: 2.0, colA: C(3.6, 1.9, 0.7), colB: C(1.2, 0.45, 0.16), seed: 17 }), 0, 0);
};

// ---------------- launch umbilical tower (world-anchored at PAD, centre z = -20) ----------------
const ARM_Y = [18.5, 40.5, 52, 63, 77, 85, 100.2]; // last = crew access arm at the CM hatch
const buildTower = (r: Rocket) => {
  const T = r.tower; T.position.set(PAD[0], PAD[1], PAD[2] - 20);
  const b = new Batch();
  const red = lm("towerRed", { color: "#c93a2c" }), grey = lm("towerGrey", { color: "#8c9198" }), dk = lm("towerDark", { color: "#4b4f57" });
  const w = 6, Ht = 122, dy = 6.1;
  for (const [x, z] of [[-w, -w], [w, -w], [w, w], [-w, w]]) b.add(new THREE.BoxGeometry(0.95, Ht, 0.95), red, M(x, Ht / 2, z));
  for (let i = 0, y = 0; y <= Ht + 0.01; i++, y += dy) {
    const yy = Math.min(y, Ht);
    b.add(new THREE.BoxGeometry(2 * w, 0.5, 0.5), red, M(0, yy, -w)); b.add(new THREE.BoxGeometry(2 * w, 0.5, 0.5), red, M(0, yy, w));
    b.add(new THREE.BoxGeometry(0.5, 0.5, 2 * w), red, M(-w, yy, 0)); b.add(new THREE.BoxGeometry(0.5, 0.5, 2 * w), red, M(w, yy, 0));
    if (yy + dy > Ht + 0.01) break;
    const s = i % 2 ? 1 : -1, y1 = yy + dy;
    beam(b, red, V(-w, yy, w * s), V(w, y1, w * s), 0.32); beam(b, red, V(w, yy, -w * s), V(-w, y1, -w * s), 0.32);
    beam(b, red, V(w * s, yy, -w), V(w * s, y1, w), 0.32); beam(b, red, V(-w * s, yy, w), V(-w * s, y1, -w), 0.32);
  }
  // service decks at the arm levels, elevator shaft
  for (const y of ARM_Y) b.add(new THREE.BoxGeometry(2 * w - 1, 0.35, 2 * w - 1), grey, M(0, y - 1.0, 0));
  b.add(new THREE.BoxGeometry(3, Ht, 3), dk, M(-2.2, Ht / 2, -2.2));
  // hammerhead crane + lightning mast on top
  b.add(new THREE.BoxGeometry(4, 4, 4), red, M(0, Ht + 2, 0));
  b.add(new THREE.BoxGeometry(1.6, 1.8, 26), red, M(0, Ht + 4.9, 3));
  b.add(new THREE.BoxGeometry(2.2, 2.2, 3), dk, M(0, Ht + 4.9, -11));
  b.add(new THREE.CylinderGeometry(0.18, 0.45, 18, 10), lm("mastWhite", { color: "#e9e7e2" }), M(0, Ht + 15, -3));
  b.build(T);
  // swing arms: pivot on the tower's rocket-facing face (local z = +w + 0.6), at x = -4, reaching the hull
  ARM_Y.forEach((y, i) => {
    const crew = i === ARM_Y.length - 1;
    const pz = w + 0.6, px = -4, tz = 20 - R_AT(y) - (crew ? 2.3 : 0.35); // tower-local z of the hull face
    const dx = 0 - px, dz = tz - pz, L = Math.hypot(dx, dz), a0 = Math.atan2(dx, dz);
    const g = new THREE.Group(); g.position.set(px, y, pz); T.add(g);
    const ab = new Batch();
    if (crew) {
      ab.add(new THREE.BoxGeometry(2.0, 2.4, L), grey, M(0, 0, L / 2));
      ab.add(new THREE.BoxGeometry(2.6, 2.8, 2.4), lm("whiteRoom", { color: "#eeece6" }), M(0, 0.1, L + 1.1));
    } else {
      for (const [sx, sy] of [[-0.55, -0.7], [0.55, -0.7], [-0.55, 0.7], [0.55, 0.7]]) ab.add(new THREE.BoxGeometry(0.28, 0.28, L), red, M(sx, sy, L / 2));
      for (let z = 0.4; z < L - 0.2; z += 1.6) { ab.add(new THREE.BoxGeometry(0.2, 1.4, 0.2), red, M(-0.55, 0, z)); ab.add(new THREE.BoxGeometry(0.2, 1.4, 0.2), red, M(0.55, 0, z)); ab.add(new THREE.BoxGeometry(1.1, 0.2, 0.2), red, M(0, 0.7, z)); }
      ab.add(new THREE.BoxGeometry(1.5, 1.7, 0.7), grey, M(0, 0, L - 0.35));
      ab.add(new THREE.CylinderGeometry(0.22, 0.22, L * 0.9, 8), dk, M(0, -0.95, L * 0.5, Math.PI / 2));
    }
    ab.build(g);
    g.rotation.y = a0;
    r.arms.push({ g, a0, a1: 1.52, crew });
  });
};

// ---------------- launch smoke / steam (closed-form puffs, NOINK) ----------------
const NJ = 44, NS = 36, NP = 2 * NJ + NS;
const hh = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
const puffGeo = () => {
  // a cauliflower billow: five merged, slightly lumpy spheres (smooth normals -> soft cartoon shading)
  const parts: THREE.BufferGeometry[] = [];
  const lobes: [number, number, number, number][] = [[0, 0, 0, 1], [0.55, 0.25, 0.2, 0.7], [-0.5, 0.3, -0.15, 0.68], [0.1, 0.55, -0.45, 0.6], [-0.15, 0.45, 0.5, 0.62]];
  for (const [x, y, z, r] of lobes) {
    const g = new THREE.IcosahedronGeometry(1, 4);
    const p = g.attributes.position as THREE.BufferAttribute, nm = g.attributes.normal as THREE.BufferAttribute, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const n = 1 + 0.06 * Math.sin(v.x * 5.1 + v.y * 2.3 + x * 7) * Math.cos(v.z * 4.7 - v.y * 1.9);
      p.setXYZ(i, x + v.x * n * r, y + v.y * n * r, z + v.z * n * r);
      nm.setXYZ(i, v.x, v.y, v.z); // smooth sphere normals (the polyhedron is non-indexed: computeVertexNormals would facet)
    }
    g.deleteAttribute("uv");
    parts.push(g);
  }
  const m = mergeGeometries(parts, false)!;
  m.translate(0, -0.15, 0);
  return m;
};
const T0 = W.liftoff - 0.5; // ignition (engines ramp from here, story.rocketAt)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const poseSmoke = (sm: THREE.InstancedMesh, t: number, on: boolean) => {
  sm.visible = on;
  if (!on) return;
  const age = t - T0;
  const hot = new THREE.Color(2.4, 1.35, 0.55), warm = new THREE.Color(1.15, 0.98, 0.86), cool = new THREE.Color(0.93, 0.93, 0.95);
  for (let i = 0; i < NP; i++) {
    let a: number, R: number, x: number, y: number, z: number, roll: number, heat: number;
    if (i < 2 * NJ) {
      // exhaust thrown out of both ends of the flame trench (+-x), rolling along the ground
      const k = i % NJ, sg = i < NJ ? 1 : -1;
      a = age - k * 0.042 - 0.02 * hh(i, 1);
      const D = 55 + 55 * hh(i, 2);
      const tr = 1 - Math.exp(-Math.max(a, 0) / 0.85);
      R = (4 + 10 * hh(i, 3)) * (1 - Math.exp(-Math.max(a, 0) / 0.42)) * (1 + 0.35 * Math.max(a, 0)) * (0.55 + 0.45 * tr + 0.25 * (D / 110));
      x = sg * (10 + D * tr); z = (hh(i, 4) - 0.5) * 10 + (hh(i, 5) - 0.5) * 34 * tr;
      y = 0.55 * R + 1 + (3 + 7 * hh(i, 6)) * Math.max(a, 0);
      roll = -sg * 1.6 * Math.max(a, 0) + hh(i, 7) * 6;
      heat = 1 - smooth(Math.max(a, 0) / 0.55);
    } else {
      // steam boiling up around the base and the launch mount
      const k = i - 2 * NJ;
      a = age - k * 0.04;
      const ang = k * 2.39996 + 0.3, r0 = 7 + 4 * hh(i, 1), tr = 1 - Math.exp(-Math.max(a, 0) / 1.1);
      R = (3.5 + 6 * hh(i, 2)) * (1 - Math.exp(-Math.max(a, 0) / 0.55)) * (1 + 0.3 * Math.max(a, 0));
      x = Math.sin(ang) * (r0 + 16 * tr); z = Math.cos(ang) * (r0 + 16 * tr);
      y = 0.6 * R + 0.5 + (6 + 16 * hh(i, 3)) * tr;
      roll = Math.max(a, 0) * (hh(i, 4) - 0.5) * 2 + k;
      heat = 0.45 * (1 - smooth(Math.max(a, 0) / 0.8));
    }
    if (a <= 0 || R < 0.01) { _m.makeScale(0, 0, 0); sm.setMatrixAt(i, _m); _c.setRGB(1, 1, 1); sm.setColorAt(i, _c); continue; }
    _e.set(hh(i, 8) * 6, hh(i, 9) * 6, roll); _q.setFromEuler(_e);
    _p.set(PAD[0] + x, PAD[1] + y, PAD[2] + z); _s.set(R * (1.1 + 0.2 * hh(i, 10)), R * (0.85 + 0.15 * hh(i, 11)), R);
    _m.compose(_p, _q, _s); sm.setMatrixAt(i, _m);
    const shade = 0.86 + 0.14 * hh(i, 12);
    _c.copy(cool).multiplyScalar(shade).lerp(warm, 0.35 * clamp01(heat * 2)).lerp(hot, heat * heat); sm.setColorAt(i, _c);
  }
  sm.instanceMatrix.needsUpdate = true; if (sm.instanceColor) sm.instanceColor.needsUpdate = true;
};

// ---------------- lunar module (at MOON, ground y = 0) ----------------
const buildLM = (g: THREE.Group) => {
  g.position.set(MOON[0], MOON[1], MOON[2]);
  g.rotation.y = -2.138 + 0.55; // front (+x local) turned ~3/4 toward the shot-19 camera
  const b = new Batch();
  const gold = pm("lmGold", { map: foilTex("lmFoilGold", [236, 188, 70]), specular: "#b08a3a", shininess: 70 }, 0.25);
  const amber = pm("lmAmber", { map: foilTex("lmFoilAmber", [176, 104, 40]), specular: "#6a4a20", shininess: 60 }, 0.25);
  const grey = pm("lmGrey", { color: "#a9adb3", specular: "#55585e", shininess: 40 });
  const dkg = pm("lmDark", { color: "#3a3c42" });
  const blk = pm("lmBlack", { color: "#1f2025" });
  const silver = pm("lmSilver", { color: "#d6d8dc", specular: "#7a7d84", shininess: 60 });
  const glass = new THREE.MeshPhongMaterial({ color: "#1a2238", specular: "#9fb4d8", shininess: 90 }); twoTone(glass);
  // descent stage: octagonal foil-wrapped body, cross-shaped look via darker amber quads on the diagonals
  b.add(new THREE.CylinderGeometry(2.15, 2.15, 1.7, 8, 1), gold, M(0, 2.35, 0, 0, Math.PI / 8));
  for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + (k * Math.PI) / 2; b.add(new THREE.BoxGeometry(0.06, 1.5, 1.4), amber, M(Math.cos(a) * 1.99, 2.35, -Math.sin(a) * 1.99, 0, a, 0)); }
  b.add(new THREE.CylinderGeometry(2.0, 2.0, 0.12, 8), blk, M(0, 3.25, 0, 0, Math.PI / 8));
  b.add(lathe([[0.75, 0.75], [0.6, 1.15], [0.45, 1.45]], 24, false), dkg);                // descent engine bell
  b.add(lathe([[0, 0.76], [0.75, 0.76]], 24, false), blk);
  // porch + ladder on the front leg
  b.add(new THREE.BoxGeometry(1.0, 0.08, 1.1), silver, M(2.55, 2.95, 0));
  // legs: primary strut, two side braces, footpad; leg k points along local +x rotated by 90k
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2, d = V(Math.cos(a), 0, -Math.sin(a)), s = V(Math.sin(a), 0, Math.cos(a));
    const top = d.clone().multiplyScalar(2.0).setY(3.0), foot = d.clone().multiplyScalar(4.15).setY(0.42), knee = d.clone().multiplyScalar(3.35).setY(1.55);
    rod(b, gold, top, foot, 0.13, 10);
    rod(b, silver, knee, d.clone().multiplyScalar(1.95).add(s.clone().multiplyScalar(1.0)).setY(1.6), 0.06, 6);
    rod(b, silver, knee, d.clone().multiplyScalar(1.95).add(s.clone().multiplyScalar(-1.0)).setY(1.6), 0.06, 6);
    rod(b, silver, foot, foot.clone().setY(-0.55), 0.04, 5); // contact probe (into the dust)
    b.add(lathe([[0, -0.06], [0.48, -0.06], [0.5, 0.06], [0.38, 0.22], [0, 0.26]], 24, false), silver, M(foot.x, 0.02, foot.z));
    if (k === 0) {
      for (const sd of [-0.3, 0.3]) rod(b, silver, top.clone().add(s.clone().multiplyScalar(sd)).setY(2.9), foot.clone().add(s.clone().multiplyScalar(sd)).setY(0.6), 0.035, 5);
      for (let j = 1; j < 9; j++) { const u = j / 9, p = top.clone().setY(2.9).lerp(foot.clone().setY(0.6), u); rod(b, silver, p.clone().add(s.clone().multiplyScalar(-0.3)), p.clone().add(s.clone().multiplyScalar(0.3)), 0.03, 5); }
    }
  }
  // ascent stage: faceted crew cabin (cylinder across), flat front with triangular windows, aft equipment bay, tunnel
  b.add(new THREE.CylinderGeometry(1.25, 1.25, 2.4, 12, 1), grey, M(0.2, 4.55, 0, Math.PI / 2, 0, 0));
  b.add(new THREE.BoxGeometry(0.4, 2.0, 2.3), grey, M(1.35, 4.45, 0));
  for (const sd of [-1, 1]) {
    const tri = new THREE.Shape([new THREE.Vector2(sd * 0.85, 5.3), new THREE.Vector2(sd * 0.25, 5.3), new THREE.Vector2(sd * 0.3, 4.8)]);
    const wg = new THREE.ExtrudeGeometry(tri, { depth: 0.08, bevelEnabled: false }); // shape (z, y) after the turn below
    b.add(wg, glass, M(1.52, 0, 0, 0, Math.PI / 2, 0));
  }
  b.add(new THREE.BoxGeometry(0.1, 0.9, 0.85), grey, M(1.6, 3.95, 0)); b.add(new THREE.BoxGeometry(0.06, 0.12, 0.3), dkg, M(1.66, 4.2, 0.2));                  // forward hatch
  b.add(new THREE.BoxGeometry(1.6, 1.4, 2.6), blk, M(-1.25, 4.5, 0));                    // aft equipment bay
  b.add(new THREE.BoxGeometry(1.2, 0.5, 3.0), dkg, M(-0.2, 3.55, 0));
  b.add(new THREE.CylinderGeometry(0.55, 0.6, 0.6, 20), silver, M(0.1, 6.0, 0));
  b.add(new THREE.TorusGeometry(0.56, 0.06, 6, 20), dkg, M(0.1, 6.3, 0, Math.PI / 2));
  for (const sz of [-1.45, 1.45]) b.add(new THREE.BoxGeometry(0.7, 0.9, 0.08), blk, M(0.2, 4.6, sz)); // side panels (black foil)
  // RCS quads at the four corners
  for (const [x, z] of [[0.95, 1.45], [0.95, -1.45], [-0.6, 1.45], [-0.6, -1.45]]) {
    b.add(new THREE.BoxGeometry(0.38, 0.38, 0.38), silver, M(x, 5.25, z * 1.08));
    for (const [dx, dy] of [[0, 0.32], [0, -0.32], [0.32, 0], [-0.32, 0]]) b.add(new THREE.ConeGeometry(0.1, 0.26, 10), dkg, M(x + dx, 5.25 + dy, z * 1.08, dx ? 0 : dy > 0 ? 0 : Math.PI, 0, dx > 0 ? -Math.PI / 2 : dx < 0 ? Math.PI / 2 : 0));
  }
  // antennas: rendezvous radar dish (front top), steerable S-band dish on a boom, VHF whips
  rod(b, silver, V(1.0, 5.6, 0.5), V(1.15, 6.35, 0.5), 0.05, 6);
  b.add(lathe([[0, 0], [0.32, 0.08], [0.4, 0.16], [0.38, 0.17], [0, 0.04]], 20, false), silver, M(1.2, 6.45, 0.5, 0, 0, -1.1));
  rod(b, silver, V(-0.6, 5.4, -1.0), V(-0.9, 6.5, -1.45), 0.04, 6);
  b.add(lathe([[0, 0], [0.42, 0.1], [0.5, 0.2], [0.48, 0.21], [0, 0.05]], 20, false), silver, M(-0.95, 6.6, -1.5, 0.5, 0, 0.6));
  for (const sz of [-1, 1]) rod(b, silver, V(-0.3, 5.4, sz * 1.1), V(-0.6, 6.8, sz * 1.6), 0.02, 4);
  b.build(g);
};

// ---------------- public API ----------------
export const buildRocket = (): Rocket => {
  const group = new THREE.Group();
  const r: Rocket = {
    group, tower: new THREE.Group(), lm: new THREE.Group(), arms: [], fire: new THREE.Group(), glows: [], attached: false,
    bellMat: null as unknown as THREE.MeshBasicMaterial,
    smoke: new THREE.InstancedMesh(puffGeo(), smokeMat(), NP),
  };
  r.bellMat = buildSaturn(group);
  buildFire(r.fire, r.glows); group.add(r.fire);
  buildTower(r);
  buildLM(r.lm);
  r.smoke.layers.set(NOINK); r.smoke.frustumCulled = false; r.smoke.castShadow = false; r.smoke.receiveShadow = false;
  for (let i = 0; i < NP; i++) { r.smoke.setMatrixAt(i, _m.makeScale(0, 0, 0)); r.smoke.setColorAt(i, _c.setRGB(1, 1, 1)); }
  r.smoke.visible = false;
  return r;
};

const hot = new THREE.Color();
export const poseRocket = (r: Rocket, s: RocketState, t: number, _cam: THREE.Camera) => {
  if (!r.attached && r.group.parent) { r.group.parent.add(r.tower, r.smoke, r.lm); r.attached = true; }
  const pl = rocketPlaced(s);
  r.group.position.copy(pl.base); r.group.rotation.set(0, 0, -s.tilt); r.group.scale.setScalar(pl.scale);
  const shown = r.group.visible;
  const atPad = shown && s.pos[1] < 300 && Math.abs(s.pos[0] - PAD[0]) < 200 && Math.abs(s.pos[2] - PAD[2]) < 200;
  r.tower.visible = atPad;
  r.lm.visible = !shown;
  // swing arms: crew arm already away at ignition, the others swing back in sequence from just before liftoff
  for (let i = 0; i < r.arms.length; i++) {
    const a = r.arms[i];
    const k = s.engines > 0 ? (a.crew ? 1 : smooth((t - (W.liftoff - 0.35) - 0.07 * (r.arms.length - 1 - i)) / 1.1)) : 0;
    a.g.rotation.y = a.a0 + (a.a1 - a.a0) * k;
  }
  // engine fire
  const e = s.engines;
  r.fire.visible = e > 0.001;
  const fl = 0.86 + 0.08 * Math.sin(t * 47.3) + 0.06 * Math.sin(t * 83.1 + 1.3);
  hot.setRGB(4.2 * fl, 2.1 * fl, 0.7 * fl);
  r.bellMat.color.setRGB(0.06, 0.055, 0.05).lerp(hot, e);
  const n = r.glows.length;
  r.glows.forEach((m, i) => {
    const u = m.uniforms;
    u.uT.value = t; u.uE.value = e;
    if (i >= n - 2) u.uLen.value = Math.max(1, isDiagram(s) ? (pl.base.y * 1.08) / pl.scale : s.plume); // diagram: to the ground
    else {
      const j = Math.floor(i / 2), core = i % 2 === 0;
      const f2 = 1 + 0.12 * Math.sin(t * 39.0 + j * 2.1) + 0.07 * Math.sin(t * 91.0 + j * 4.7);
      u.uLen.value = (core ? 10 : 22) * f2 * (0.4 + 0.6 * e);
    }
  });
  SMOKE_U.uUnder.value = 1.3 * e * (0.9 + 0.1 * fl);
  poseSmoke(r.smoke, t, atPad && e > 0);
};
