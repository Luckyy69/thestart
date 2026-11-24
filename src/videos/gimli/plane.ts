// A cartoon twin-engine widebody (767-like proportions, generic livery: white body, red cheatline and tail, no
// logos). Nose points +x, right wing +z, origin on the ground under the main gear. Parts that animate: fans
// (spin), nose gear (collapses), flaps, the ram-air turbine, slides.
// PROPS pass: lofted airfoil wings/tail (closed, smooth silhouettes for the ink pass), closed lathe nacelles with
// a chrome lip, real fan blades + swirl spinner, belly fairing, flap-track fairings, winglets, door outlines,
// readable windows, landing/nav lights. Plane materials use a "paint" variant of the world two-tone that keeps the
// white body white in golden light (lit colour partly neutralised, shadow colour less violet and lifted).
import * as THREE from "three";
import { V } from "../bridge/build";
import { ctex } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";

export const FUSE_Y = 4.6;     // fuselage axis height above the ground with the gear down
export const NOSE_X = 26;      // nose tip x
export const NOSEGEAR_X = 18.5;

// ---------------- materials ----------------
const PAINT_GLSL = /* glsl */ `
vec3 pLit( vec3 c ) { float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); return mix( vec3( l ) * vec3( 1.04, 1.0, 0.93 ), c, 0.42 ) * 1.06; }
vec3 pShade( vec3 c ) { float l = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) ); return mix( vec3( l ) * vec3( 0.97, 0.98, 1.04 ), c, 0.25 ) * max( 1.0, 0.38 / max( l, 1e-3 ) ); }
`;
/** world two-tone, but tuned for car-paint: lit/shade colours pulled toward neutral, a soft sky rim */
const paintTone = <T extends THREE.MeshLambertMaterial | THREE.MeshPhongMaterial>(m: T, liftK = 0.15, rim = 0.14): T => {
  twoTone(m, liftK);
  const base = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    base.call(m, sh, r);
    const f0 = sh.fragmentShader;
    sh.fragmentShader = f0
      .replace("uniform float uSat;", "uniform float uSat;\n" + PAINT_GLSL)
      .replace("vec3 lit = uLitCol *", "vec3 lit = pLit( uLitCol ) *")
      .replace("albSh * uShadeCol * skyK", "albSh * pShade( uShadeCol ) * skyK")
      .replace("reflectedLight.indirectDiffuse = vec3( 0.0 );",
        `reflectedLight.indirectDiffuse = alb * pShade( uShadeCol ) * pow( 1.0 - facing, 3.0 ) * ${rim.toFixed(3)} * 3.0;`);
    if (!sh.fragmentShader.includes("albSh * pShade( uShadeCol ) * skyK") || !sh.fragmentShader.includes("pLit( uLitCol )")) throw new Error("plane.ts: shade.ts TWO_TONE changed");
  };
  m.customProgramCacheKey = () => `planePaint3_${liftK.toFixed(3)}_${rim.toFixed(3)}`;
  return m;
};
const mats = new Map<string, THREE.Material>();
const pmat = (key: string, p: THREE.MeshPhongMaterialParameters, liftK = 0.15) => {
  let m = mats.get(key);
  if (!m) { m = paintTone(new THREE.MeshPhongMaterial({ specular: "#3a3a3a", shininess: 40, ...p }), liftK); mats.set(key, m); }
  return m;
};

// ---------------- textures ----------------
const BW = 4096, BH = 1024;
const bx = (x: number) => ((x + 24.3) / 50.4) * BW;           // fuselage x -> canvas px (u)
const UX = (x: number) => (x + 24.3) / 50.4;
/** draw at a girth angle (0 = belly, 180 = crown) on BOTH sides (texture v is mirrored about the crown) */
const both = (deg: number, fn: (y: number, s: number) => void) => { fn(BH - (deg / 360) * BH, 1); fn((deg / 360) * BH, -1); };
const ay = (deg: number) => (deg / 360) * BH;
const bodyTex = () => ctex("planeBody2", BW, BH, (g) => {
  g.fillStyle = "#f8f7f3"; g.fillRect(0, 0, BW, BH);
  // soft painted shading bands so the cylinder reads even in flat light: slightly cooler toward the belly
  const gr = g.createLinearGradient(0, 0, 0, BH);
  gr.addColorStop(0, "rgba(150,160,185,0.20)"); gr.addColorStop(0.22, "rgba(150,160,185,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0)");
  gr.addColorStop(0.78, "rgba(150,160,185,0)"); gr.addColorStop(1, "rgba(150,160,185,0.20)");
  g.fillStyle = gr; g.fillRect(0, 0, BW, BH);
  // grey belly with a clean border
  g.fillStyle = "#c4c9d3"; g.fillRect(0, 0, BW, ay(52)); g.fillRect(0, BH - ay(52), BW, ay(52));
  g.fillStyle = "#9aa1ae"; g.fillRect(0, ay(52) - 3, BW, 3); g.fillRect(0, BH - ay(52), BW, 3);
  // faint panel seams
  g.fillStyle = "rgba(120,128,145,0.16)";
  for (let x = -22; x < 24; x += 2.4) g.fillRect(bx(x), 0, 2, BH);
  for (const d of [72, 140, 165]) both(d, (y) => g.fillRect(0, y, BW, 2));
  // cheatline: thick red under the windows + thin dark-red pinstripe, tapering up toward the nose
  const cheat = (d0: number, d1: number, col: string, xs: number, xe: number) => both(0, (_, s) => {
    g.fillStyle = col; g.beginPath();
    const Y = (d: number) => (s > 0 ? BH - ay(d) : ay(d));
    g.moveTo(bx(xs), Y(d0)); g.lineTo(bx(xe - 2.5), Y(d0)); g.quadraticCurveTo(bx(xe - 0.6), Y(d0 + 2), bx(xe), Y(d1 + 14));
    g.lineTo(bx(xe - 0.7), Y(d1 + 14)); g.quadraticCurveTo(bx(xe - 1.6), Y(d1), bx(xe - 2.8), Y(d1)); g.lineTo(bx(xs + 1.6), Y(d1));
    g.closePath(); g.fill();
  });
  cheat(84, 94, "#cf2b2b", -20.5, 23.6);
  cheat(78.5, 81, "#8e1d24", -19.5, 22.6);
  // doors (outlined, with a small window) and overwing exits
  const door = (x: number, w: number, d0: number, d1: number) => both(0, (_, s) => {
    const y0 = s > 0 ? BH - ay(d1) : ay(d0), h = ay(d1) - ay(d0);
    g.strokeStyle = "#7d8494"; g.lineWidth = 4; g.beginPath(); g.roundRect(bx(x) - (w * BW) / 100.8, y0, (w * BW) / 50.4, h, 14); g.stroke();
    g.fillStyle = "#5d6576"; g.fillRect(bx(x) + (w * BW) / 100.8 - 16, y0 + h * 0.55, 8, 18); // handle
  });
  for (const x of [19.6, 9.2, -16.8]) door(x, 1.05, 80, 124);
  door(-1.2, 0.6, 92, 118);
  // cabin windows: navy glass, sky glint, darker frame
  const isDoor = (x: number) => [19.6, 9.2, -16.8, -1.2].some((d) => Math.abs(x - d) < 0.75);
  for (let x = -15.6; x < 18.6; x += 0.53) {
    if (isDoor(x)) continue;
    both(104, (y) => {
      const w = 22, h = 28, px = bx(x) - w / 2, py = y - h / 2;
      g.fillStyle = "#3b4253"; g.beginPath(); g.roundRect(px - 3, py - 3, w + 6, h + 6, 10); g.fill();
      const wg = g.createLinearGradient(px, py, px + w, py + h);
      wg.addColorStop(0, "#6f94c8"); wg.addColorStop(0.45, "#2c4370"); wg.addColorStop(1, "#1b2747");
      g.fillStyle = wg; g.beginPath(); g.roundRect(px, py, w, h, 8); g.fill();
      g.fillStyle = "rgba(255,255,255,0.75)"; g.fillRect(px + 4, py + 5, 4, 12);
    });
  }
  // door windows
  for (const x of [19.6, 9.2, -16.8]) both(110, (y) => { g.fillStyle = "#2c4370"; g.beginPath(); g.roundRect(bx(x) - 10, y - 14, 20, 28, 8); g.fill(); });
  // cockpit glazing: a tapered dark band per side (lower edge level, upper edge sloping down to the nose), white pillars
  both(0, (_, s) => {
    const Y = (d: number) => (s > 0 ? BH - ay(d) : ay(d));
    const band: [number, number][] = [[23.05, 117], [24.72, 121], [24.72, 141], [23.05, 136]];
    g.fillStyle = "#3a4254"; g.beginPath(); band.forEach(([x, d], i) => { const X = bx(x) + (x > 24 ? 6 : -6), Yd = Y(d + (d > 128 ? 1.5 : -1.5) * 1); if (i) g.lineTo(X, Yd); else g.moveTo(X, Yd); }); g.closePath(); g.fill();
    const wg = g.createLinearGradient(bx(23.05), Y(117), bx(24.72), Y(141));
    wg.addColorStop(0, "#1a2542"); wg.addColorStop(0.55, "#2f4775"); wg.addColorStop(1, "#86aee0");
    g.fillStyle = wg; g.beginPath(); band.forEach(([x, d], i) => { if (i) g.lineTo(bx(x), Y(d)); else g.moveTo(bx(x), Y(d)); }); g.closePath(); g.fill();
    g.fillStyle = "#eef0f3"; for (const x of [23.55, 24.1]) g.fillRect(bx(x) - 4, Math.min(Y(116), Y(142)), 8, Math.abs(Y(142) - Y(116)));
    g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(bx(23.15), Y(132) - 3, bx(23.45) - bx(23.15), 6);
  });
  // nose tip: grey radome ring line + tail cone grey
  g.fillStyle = "#9aa1ae"; g.fillRect(bx(25.15), 0, 4, BH);
  g.fillStyle = "#c4c9d3"; g.fillRect(0, 0, bx(-23.4), BH);
  // small red registration-free "flag" block near the tail (no text)
  both(128, (y) => { g.fillStyle = "#cf2b2b"; g.fillRect(bx(-19.2), y - 16, 54, 32); g.fillStyle = "#ffffff"; g.fillRect(bx(-19.2) + 18, y - 16, 18, 32); });
});
const wingTex = () => ctex("planeWing2", 512, 512, (g) => {
  // u = around the airfoil (0 TE upper .. 0.5 LE .. 1 TE lower), v = span (canvas y flipped)
  g.fillStyle = "#e4e7ec"; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#cdd2da"; g.fillRect(0, 0, 70, 512); g.fillRect(442, 0, 70, 512);       // flaps / ailerons
  g.fillStyle = "#b6bcc7"; for (let y = 0; y < 512; y += 128) { g.fillRect(0, y, 70, 4); g.fillRect(442, y, 70, 4); }
  g.fillStyle = "#8f96a3"; g.fillRect(68, 0, 4, 512); g.fillRect(440, 0, 4, 512);       // hinge lines
  g.fillStyle = "#c9ced6"; g.fillRect(240, 0, 32, 512);                                   // metal leading edge / slats
  g.fillStyle = "#9aa1ae"; g.fillRect(232, 0, 3, 512); g.fillRect(277, 0, 3, 512);
  g.fillStyle = "rgba(120,128,145,0.25)"; for (let x = 90; x < 230; x += 46) g.fillRect(x, 0, 2, 512); // panels
  g.fillStyle = "#b9bfc9"; g.fillRect(300, 0, 140, 512);                                  // underside a touch darker
});
const finTex = () => ctex("planeFin2", 512, 512, (g) => {
  // u around (0 TE .. 0.5 LE .. 1 TE), v = height
  g.fillStyle = "#d22d2a"; g.fillRect(0, 0, 512, 512);
  const gr = g.createLinearGradient(0, 512, 0, 0); gr.addColorStop(0, "rgba(80,0,10,0.28)"); gr.addColorStop(0.5, "rgba(80,0,10,0)"); gr.addColorStop(1, "rgba(255,120,90,0.15)");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#a81f25"; g.fillRect(0, 0, 90, 512); g.fillRect(422, 0, 90, 512);        // rudder
  g.fillStyle = "#7a1219"; g.fillRect(88, 0, 4, 512); g.fillRect(420, 0, 4, 512);
  // generic white swoosh across both faces, near the root
  g.fillStyle = "#ffffff";
  for (const s of [1, -1]) { g.save(); if (s < 0) { g.translate(512, 0); g.scale(-1, 1); }
    g.beginPath(); g.moveTo(256, 430); g.bezierCurveTo(180, 400, 80, 330, 0, 300); g.lineTo(0, 335); g.bezierCurveTo(90, 370, 190, 440, 256, 470); g.closePath(); g.fill(); g.restore(); }
  g.fillStyle = "#e9ebef"; g.fillRect(244, 0, 24, 512);                                   // leading-edge strip
});
/** nacelle: rows per lathe segment (filled by the caller), columns around: fake sky/ground reflection */
const nacTex = (rows: string[]) => ctex("planeNac2_" + rows.length, 512, rows.length * 16, (g) => {
  const H = rows.length * 16;
  rows.forEach((c, j) => { g.fillStyle = c; g.fillRect(0, H - (j + 1) * 16, 512, 16); });
  // reflection: u 0.75 = up (sky band), 0.25 = down (ground)
  const gr = g.createLinearGradient(0, 0, 512, 0);
  const st: [number, string][] = [[0, "rgba(255,240,220,0.25)"], [0.12, "rgba(70,55,45,0.35)"], [0.25, "rgba(90,70,55,0.45)"], [0.38, "rgba(70,55,45,0.35)"],
    [0.5, "rgba(40,45,60,0.45)"], [0.56, "rgba(255,255,255,0.55)"], [0.66, "rgba(255,255,255,0.15)"], [0.75, "rgba(255,255,255,0.65)"], [0.84, "rgba(255,255,255,0.15)"],
    [0.94, "rgba(255,255,255,0.55)"], [1, "rgba(255,240,220,0.25)"]];
  for (const [o, c] of st) gr.addColorStop(o, c);
  g.fillStyle = gr; g.fillRect(0, 0, 512, H);
});
const fanTex = () => ctex("fanBlades2", 512, 512, (g) => {
  g.fillStyle = "#151920"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 22; i++) {
    g.save(); g.translate(256, 256); g.rotate((i / 22) * Math.PI * 2);
    const bg = g.createLinearGradient(0, -24, 0, 24); bg.addColorStop(0, "#c3cad5"); bg.addColorStop(1, "#59606d");
    g.fillStyle = bg; g.beginPath(); g.moveTo(40, -6); g.quadraticCurveTo(150, -40, 250, -30); g.lineTo(250, 4); g.quadraticCurveTo(150, 4, 40, 10); g.closePath(); g.fill();
    g.restore();
  }
  g.strokeStyle = "#0d1015"; g.lineWidth = 10; g.beginPath(); g.arc(256, 256, 250, 0, Math.PI * 2); g.stroke();
});
const spinTex = () => ctex("spinner2", 128, 128, (g) => {
  g.fillStyle = "#eef0f3"; g.fillRect(0, 0, 128, 128);
  g.fillStyle = "#1d222b"; g.beginPath(); g.moveTo(0, 128); g.lineTo(26, 128); g.bezierCurveTo(50, 80, 80, 40, 128, 0); g.lineTo(100, 0); g.bezierCurveTo(60, 40, 30, 80, 0, 128); g.fill();
});

// ---------------- geometry helpers ----------------
type Sec = { le: THREE.Vector3; chord: number; t: number; n: THREE.Vector3; cam?: number };
/** closed lofted airfoil surface through sections (linear between them), capped both ends; chord runs along -x */
const loft = (secs: Sec[], steps = 4, N = 18): THREE.BufferGeometry => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const ring: [number, number][] = [];
  for (let i = N; i >= 0; i--) ring.push([0.5 * (1 - Math.cos((Math.PI * i) / N)), 1]);
  for (let i = 1; i <= N; i++) ring.push([0.5 * (1 - Math.cos((Math.PI * i) / N)), -1]);
  const R = ring.length;
  const yt = (c: number) => 5 * (0.2969 * Math.sqrt(c) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1036 * c ** 4);
  const rows: Sec[] = [];
  for (let k = 0; k < secs.length - 1; k++) for (let j = 0; j < steps; j++) {
    const u = j / steps, a = secs[k], b = secs[k + 1];
    rows.push({ le: a.le.clone().lerp(b.le, u), chord: a.chord + (b.chord - a.chord) * u, t: a.t + (b.t - a.t) * u, n: a.n.clone().lerp(b.n, u).normalize(), cam: (a.cam ?? 0) + ((b.cam ?? 0) - (a.cam ?? 0)) * u });
  }
  rows.push(secs[secs.length - 1]);
  rows.forEach((s, k) => {
    ring.forEach(([c, sg], i) => {
      const off = (sg * yt(c) * s.t + (s.cam ?? 0) * 4 * c * (1 - c)) * s.chord;
      pos.push(s.le.x - c * s.chord + s.n.x * off, s.le.y + s.n.y * off, s.le.z + s.n.z * off);
      uv.push(i / (R - 1), k / (rows.length - 1));
    });
  });
  for (let k = 0; k < rows.length - 1; k++) for (let i = 0; i < R - 1; i++) { const a = k * R + i, b = a + 1, c = a + R, d = c + 1; idx.push(a, b, c, b, d, c); }
  // caps (fan around the mid-chord point)
  const capAt = (k: number) => {
    const s = rows[k], ci = pos.length / 3;
    pos.push(s.le.x - 0.45 * s.chord, s.le.y, s.le.z); uv.push(0.3, k / (rows.length - 1));
    const tri: number[] = [];
    for (let i = 0; i < R - 1; i++) tri.push(ci, k * R + i, k * R + i + 1);
    return tri;
  };
  const P = (i: number) => V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  const nrm = (a: number, b: number, c: number) => P(b).sub(P(a)).cross(P(c).sub(P(a)));
  // orient the side wall outward: upper-surface mid triangle must face along +n
  const s0 = rows[0], mid = Math.floor(N / 2);
  if (nrm(mid, mid + 1, mid + R).dot(s0.n) < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const span = rows[rows.length - 1].le.clone().sub(rows[0].le);
  for (const [k, sgn] of [[0, -1], [rows.length - 1, 1]] as const) {
    const tri = capAt(k);
    let area = V(0, 0, 0); for (let i = 0; i < tri.length; i += 3) area.add(nrm(tri[i], tri[i + 1], tri[i + 2]));
    if (area.dot(span) * sgn < 0) for (let i = 0; i < tri.length; i += 3) { const t = tri[i + 1]; tri[i + 1] = tri[i + 2]; tri[i + 2] = t; }
    idx.push(...tri);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const mirrorZ = (g: THREE.BufferGeometry) => { const m = g.clone().scale(1, 1, -1); const ix = m.index!.array as Uint32Array | Uint16Array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } m.index!.needsUpdate = true; m.computeVertexNormals(); return m; };

export type Plane = {
  group: THREE.Group; body: THREE.Group; fans: THREE.Mesh[]; noseGear: THREE.Group; mainGear: THREE.Group[];
  rat: THREE.Object3D; slides: THREE.Object3D[];
};

/** lathe profile along the fuselage: [x, radius, centre-y offset] from tail to nose (closed at both ends) */
const PROFILE: [number, number, number][] = [
  [-24.3, 0.02, 1.86], [-24.15, 0.28, 1.82], [-23.2, 0.62, 1.55], [-21.5, 1.15, 1.1], [-19, 1.72, 0.72], [-16.5, 2.15, 0.4],
  [-13.5, 2.45, 0.15], [-10.5, 2.58, 0.03], [-8, 2.6, 0], [18, 2.6, 0], [20.4, 2.53, -0.05], [22.2, 2.3, -0.16],
  [23.6, 1.95, -0.3], [24.6, 1.55, -0.42], [25.3, 1.1, -0.52], [25.75, 0.66, -0.58], [25.96, 0.3, -0.61], [26.02, 0.0, -0.62],
];
/** catmull-rom through the profile so the silhouette has no kinks */
const sampleProfile = () => {
  const out: [number, number, number][] = [], P = PROFILE;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    const n = Math.max(2, Math.round((p2[0] - p1[0]) / 0.45));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([p1[0] + (p2[0] - p1[0]) * t, Math.max(0.0, cr(p0[1], p1[1], p2[1], p3[1])), cr(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  out.push(P[P.length - 1]);
  return out;
};

export const buildPlane = (): Plane => {
  const group = new THREE.Group(), body = new THREE.Group();
  group.add(body);
  const white = pmat("pBody", { map: bodyTex(), specular: "#555555", shininess: 60 });
  const wingM = pmat("pWing", { map: wingTex(), specular: "#444444", shininess: 50 });
  const finM = pmat("pFin", { map: finTex(), specular: "#553333", shininess: 55 });
  const paint = pmat("pWhite", { color: "#f4f3ef", specular: "#4a4a4a", shininess: 55 });
  const red = pmat("pRed", { color: "#cf2b2b", specular: "#553333", shininess: 55 });
  const belly = pmat("pBelly", { color: "#d9dde4", specular: "#333333", shininess: 40 });
  const steel = pmat("pSteel", { color: "#9ea6b3", specular: "#cfd6e0", shininess: 80 });
  const gun = pmat("pGun", { color: "#575e6b", specular: "#8a929f", shininess: 60 });
  const tyre = pmat("pTyre", { color: "#24232a", specular: "#222222", shininess: 12 });
  const hub = pmat("pHub", { color: "#c6ccd5", specular: "#bbbbbb", shininess: 70 });
  const add = (g: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D = body) => { const me = new THREE.Mesh(g, m); parent.add(me); return me; };

  // fuselage: catmull-rom lathe, 56 sides
  const NS = 56, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const xs = sampleProfile();
  xs.forEach(([x, r, c], j) => {
    for (let i = 0; i <= NS; i++) {
      const a = (i / NS) * Math.PI * 2; // a = 0 at the bottom
      pos.push(x, FUSE_Y + c - r * Math.cos(a), r * Math.sin(a));
      uv.push(Math.min(0.999, Math.max(0.001, UX(x))), i / NS);
    }
    if (j > 0) for (let i = 0; i < NS; i++) { const a = (j - 1) * (NS + 1) + i, b = a + 1, cc = a + NS + 1, d = cc + 1; idx.push(a, d, b, a, cc, d); }
  });
  const fg = new THREE.BufferGeometry();
  fg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); fg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  fg.setIndex(idx); fg.computeVertexNormals();
  add(fg, white);

  // belly fairing (wing-to-body), blends the wing root
  const bf = new THREE.SphereGeometry(1, 40, 20); bf.scale(8.2, 1.15, 2.78); bf.translate(0.4, FUSE_Y - 1.75, 0); add(bf, belly);

  // wings: swept airfoil loft with dihedral + a kink at the trailing edge, red raked winglets
  const WY = FUSE_Y - 1.05, DI = 0.09;
  const wy = (z: number) => WY + (z - 2.0) * DI;
  const wingSecs: Sec[] = [
    { le: V(5.4, WY, 1.6), chord: 9.6, t: 0.14, n: V(0, 1, 0), cam: 0.02 },
    { le: V(1.6, wy(8.2), 8.2), chord: 6.4, t: 0.12, n: V(0, 1, 0), cam: 0.02 },
    { le: V(-11.4, wy(23.4), 23.4), chord: 2.5, t: 0.1, n: V(0, 1, 0), cam: 0.015 },
  ];
  const wingG = loft(wingSecs, 6);
  const tipY = wy(23.4);
  const wlG = loft([
    { le: V(-11.5, tipY - 0.05, 23.35), chord: 2.4, t: 0.1, n: V(0, -0.35, 1).normalize() },
    { le: V(-12.6, tipY + 0.55, 23.75), chord: 1.9, t: 0.1, n: V(0, -0.3, 1).normalize() },
    { le: V(-14.4, tipY + 2.4, 24.35), chord: 0.9, t: 0.1, n: V(0, -0.25, 1).normalize() },
  ], 3);
  // flap-track fairings under the trailing edge
  const ftf = new THREE.SphereGeometry(1, 16, 10);
  for (const s of [1, -1]) {
    add(s > 0 ? wingG : mirrorZ(wingG), wingM);
    add(s > 0 ? wlG : mirrorZ(wlG), red);
    for (const z of [11.5, 15.5, 19.5]) {
      const f = (z - 8.2) / 15.2, le = 1.6 + (-11.4 - 1.6) * f, ch = 6.4 + (2.5 - 6.4) * f;
      const m = add(ftf.clone().scale(1.7, 0.32, 0.26), steel); m.position.set(le - ch * 0.82, wy(z) - 0.28, s * z);
    }
    // nav light on the tip: right (+z) green, left red; landing light at the wing root
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: s > 0 ? "#5cff8a" : "#ff4a4a" }));
    nav.position.set(-11.6, tipY, s * 23.55); body.add(nav);
    const ll = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: "#fff6d8" }));
    ll.position.set(4.6, WY + 0.05, s * 3.0); body.add(ll);
  }

  // horizontal stabilisers
  const stabG = loft([
    { le: V(-16.6, FUSE_Y + 1.05, 0.4), chord: 4.8, t: 0.1, n: V(0, 1, 0) },
    { le: V(-23.4, FUSE_Y + 1.05 + 8.6 * 0.12, 9.0), chord: 1.8, t: 0.09, n: V(0, 1, 0) },
  ], 5);
  add(stabG, wingM); add(mirrorZ(stabG), wingM);
  // fin + dorsal fillet
  add(loft([
    { le: V(-13.6, FUSE_Y + 1.7, 0), chord: 9.6, t: 0.1, n: V(0, 0, 1) },
    { le: V(-17.2, FUSE_Y + 4.5, 0), chord: 7.0, t: 0.1, n: V(0, 0, 1) },
    { le: V(-22.4, FUSE_Y + 11.0, 0), chord: 3.4, t: 0.1, n: V(0, 0, 1) },
  ], 5), finM);
  add(loft([
    { le: V(-10.5, FUSE_Y + 2.2, 0), chord: 4.6, t: 0.12, n: V(0, 0, 1) },
    { le: V(-13.9, FUSE_Y + 3.0, 0), chord: 1.6, t: 0.12, n: V(0, 0, 1) },
  ], 3), finM);
  // beacons + tail strobe
  for (const [x, y] of [[2, FUSE_Y + 2.62], [2, FUSE_Y - 2.95]]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: "#ff3b30" })); b.position.set(x, y, 0); body.add(b); }

  // engines: closed lathe nacelle (outer cowl, chrome lip, inlet duct, fan face, fan exhaust, core, plug)
  const fans: THREE.Mesh[] = [];
  const prof: [number, number, string][] = [ // [radius, axial (+ = forward), colour of the segment starting here]
    [0.0, -4.35, "#6b7280"], [0.3, -4.0, "#6b7280"], [0.5, -3.45, "#2c3038"], [0.66, -3.3, "#8e96a3"], [0.82, -2.4, "#8e96a3"],
    [0.98, -1.55, "#22262e"], [1.2, -1.55, "#d3d4d6"], [1.33, -0.6, "#d3d4d6"], [1.41, 0.5, "#d3d4d6"], [1.4, 1.5, "#d3d4d6"],
    [1.33, 2.2, "#eef1f5"], [1.26, 2.5, "#eef1f5"], [1.15, 2.64, "#eef1f5"], [1.06, 2.58, "#3a404b"], [1.03, 2.3, "#2a2f38"], [1.02, 1.75, "#151920"], [0.0, 1.75, "#151920"],
  ];
  const nacG = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40).rotateZ(-Math.PI / 2);
  const nacM = pmat("pNac", { map: nacTex(prof.slice(0, -1).map((p) => p[2])), specular: "#d8dde6", shininess: 90 }, 0.2);
  const fanM = pmat("pFan", { map: fanTex(), specular: "#333333", shininess: 30 }, 0.4);
  const bladeM = pmat("pBlade", { color: "#aab2be", specular: "#e0e4ea", shininess: 90 }, 0.4);
  const bladeG = new THREE.BoxGeometry(0.05, 0.74, 0.26);
  const spinG = new THREE.ConeGeometry(0.34, 0.7, 24).rotateZ(-Math.PI / 2);
  const spinM = pmat("pSpin", { map: spinTex(), specular: "#888888", shininess: 70 });
  const pylonG = loft([
    { le: V(7.4, 1.2, 0), chord: 6.2, t: 0.12, n: V(0, 0, 1) },
    { le: V(1.8, 2.15, 0), chord: 6.0, t: 0.12, n: V(0, 0, 1) },
  ], 2);
  for (const s of [-1, 1]) {
    const z = s * 7.9, x = 5.6, y = FUSE_Y - 2.55;
    const nac = add(nacG, nacM); nac.position.set(x, y, z);
    const fan = new THREE.Mesh(new THREE.CircleGeometry(1.025, 40).rotateY(Math.PI / 2), fanM); fan.position.set(x + 1.76, y, z);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2, b = new THREE.Mesh(bladeG, bladeM);
      b.position.set(0.12, 0.6 * Math.cos(a), 0.6 * Math.sin(a)); b.rotation.set(a, 0, 0); b.rotateY(0.6); b.layers.set(NOINK); fan.add(b);
    }
    const sp = new THREE.Mesh(spinG, spinM); sp.position.x = 0.36; fan.add(sp);
    body.add(fan); fans.push(fan);
    const py = add(pylonG, paint); py.position.set(x - 5.6, y, z);
  }

  // gear: two main bogies (4 wheels with hubs, bogie beam, strut, side brace), nose gear on a pivot
  const wheelG = new THREE.CylinderGeometry(0.62, 0.62, 0.42, 24).rotateX(Math.PI / 2), hubG = new THREE.CylinderGeometry(0.34, 0.34, 0.46, 16).rotateX(Math.PI / 2);
  const wheel = (parent: THREE.Object3D, x: number, y: number, z: number, sc = 1) => {
    const w = new THREE.Mesh(wheelG, tyre); w.position.set(x, y, z); w.scale.setScalar(sc); parent.add(w);
    const h = new THREE.Mesh(hubG, hub); h.position.set(x, y, z); h.scale.setScalar(sc); parent.add(h);
  };
  const mainGear: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const gg = new THREE.Group(), z0 = s * 4.7;
    for (const dx of [-0.75, 0.75]) for (const dz of [-0.45, 0.45]) wheel(gg, dx, 0.62, z0 + dz);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.26), steel); beam.position.set(0, 0.66, z0); gg.add(beam);
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, FUSE_Y - 1.4, 12), steel); strut.position.set(0, (FUSE_Y - 1.4) / 2 + 0.7, z0); gg.add(strut);
    const chrome = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.1, 10), hub); chrome.position.set(0, 1.25, z0); gg.add(chrome);
    const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), gun); brace.position.set(0, 2.9, z0 - s * 0.6); brace.rotation.x = s * 0.5; gg.add(brace);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 0.08), paint); door.position.set(0.2, 3.0, z0 + s * 0.42); gg.add(door);
    body.add(gg); mainGear.push(gg);
  }
  const noseGear = new THREE.Group(); noseGear.position.set(NOSEGEAR_X, FUSE_Y - 2.2, 0);
  const ns = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, FUSE_Y - 2.6, 10), steel); ns.position.y = -(FUSE_Y - 2.6) / 2;
  noseGear.add(ns);
  const nlamp = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), new THREE.MeshBasicMaterial({ color: "#fff6d8" })); nlamp.position.set(0.18, -0.7, 0); noseGear.add(nlamp);
  for (const dz of [-0.32, 0.32]) wheel(noseGear, 0, -(FUSE_Y - 2.7), dz * 1.05, 0.8);
  const ndoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.06), paint); ndoor.position.set(0.1, -0.35, 0.36); noseGear.add(ndoor);
  body.add(noseGear);
  // ram-air turbine (small prop under the belly, drops out when power is lost)
  const rat = new THREE.Group();
  const ratArm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), steel); ratArm.position.y = -0.6;
  const ratHub = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 10).rotateZ(-Math.PI / 2), red); ratHub.position.set(0.2, -1.2, 0);
  const ratProp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.14), gun); ratProp.position.set(0.12, -1.2, 0);
  rat.add(ratArm, ratHub, ratProp); rat.position.set(-2, FUSE_Y - 2.2, 1.6); rat.visible = false; body.add(rat);
  // evacuation slides at the rear doors (yellow, puffy rails), hidden until the end
  const slides: THREE.Object3D[] = [];
  const slideM = pmat("pSlide", { color: "#f6c431", specular: "#665522", shininess: 40 }, 0.4);
  for (const s of [-1, 1]) {
    const sl = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 9), slideM); sl.add(bed);
    for (const dx of [-0.7, 0.7]) { const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 9, 12).rotateX(Math.PI / 2), slideM); rail.position.set(dx, 0.15, 0); sl.add(rail); }
    sl.position.set(-15.5, 3.6, s * 6.4); sl.rotation.x = s * 0.42; sl.visible = false; body.add(sl); slides.push(sl);
  }
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  for (const f of fans) f.traverse((o) => (o.castShadow = false));
  return { group, body, fans, noseGear, mainGear, rat, slides };
};

/** pose: gear up/down, nose gear collapse (0..1 -> nose on the ground), fan spin angle, RAT out, slides out */
export const posePlane = (p: Plane, o: { gear: boolean; collapse: number; fan: number; rat: boolean; slides: boolean }) => {
  p.mainGear.forEach((g) => (g.visible = o.gear));
  p.noseGear.visible = o.gear;
  p.noseGear.rotation.z = o.collapse * 1.35; // folds backwards
  p.noseGear.scale.y = 1 - 0.5 * o.collapse;
  // pitch the whole body nose-down about the main gear contact so the nose rests on the runway
  p.body.rotation.z = -o.collapse * 0.112;
  p.fans.forEach((f, i) => (f.rotation.x = o.fan + i * 0.7));
  p.rat.visible = o.rat;
  p.slides.forEach((s) => (s.visible = o.slides));
};
export const noseTipWorld = (p: Plane, out = V(0, 0, 0)) => { p.group.updateMatrixWorld(true); return out.set(NOSE_X - 0.4, FUSE_Y - 2.3, 0).applyMatrix4(p.body.matrixWorld); };
