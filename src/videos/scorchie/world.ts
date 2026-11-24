// The scorchie world as one three.js scene: sky + light rig (as the bridge short), a London street with the curved
// glass tower, a parked Jaguar that melts, the hot spot and its light cone, explanation rays, fins, a park (the
// magnifying-glass kid) and a Las Vegas pool deck under a curved golden hotel. update(id, f, cam) poses everything.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Batch, boxGeo, V, lam, house, addVeg, Kit } from "../bridge/build";
import { ctex, rep, stoneHD, grassHD, cloudHD, facadeHD } from "../bridge/paint";
import { Pen, bodyFront, KID, SKINS, INK, Outfit, Expr, FrontOpts, SideOpts, fxPuff, fxBurst } from "../bridge/toon";
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { TONE, CHAR, twoTone, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { Pool, Actor, Fx, Stage, Who, person, blob, prepStage, viewOf, lidAt, hh, q, CamInfo } from "../bridge/cast";
import {
  FPS, SHOTS, ShotDef, SPOT, CAR, PARK_AT, VEGAS, VSPOT, CLOCK_AT, W, LEAD, V3, smooth, clamp01,
  camAt, carX, melt, spotAt, finsAt, raysAt, shotLook0,
} from "./story";
import { fxPan, fxClock, fxMagnifier, fxLeaf, fxBag, fxHeat, fxBang, spotTex, glassTex, repeatTex, fxSteam, shopTex, awningTex, busWinTex, roadHD, poolTex, haloTex, shaftTex } from "./fx";

export { type Kit };
export const loadKit = async (): Promise<Kit> => ({});

// ---------------- the tower (20 Fenchurch-like: flares out and curves toward the street as it rises) ----------------
export const TH = 116;
const tu = (y: number) => clamp01(y / TH);
export const hwAt = (y: number) => 17 + 8 * tu(y) ** 1.5;
/** south face z: leans out toward the street with height (vertical concave) and its edges come forward (plan concave) */
export const zsAt = (y: number, x: number) => -24 + 11 * tu(y) ** 2 + 2.6 * (x / hwAt(y)) ** 2;
const znAt = (y: number) => -46 - 3 * tu(y) ** 2;
const NX = 24, NY = 40;

const grid = (nx: number, ny: number, at: (i: number, j: number) => [THREE.Vector3, number, number]) => {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const [p, u, v] = at(i, j); pos.push(p.x, p.y, p.z); uv.push(u, v); }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
};
const towerGeos = () => {
  const south = grid(NX, NY, (i, j) => { const y = (j / NY) * TH, x = (i / NX * 2 - 1) * hwAt(y); return [V(x, y, zsAt(y, x)), x / 4.5, y / 3.4]; });
  const north = grid(NX, NY, (i, j) => { const y = (j / NY) * TH, x = (1 - i / NX * 2) * hwAt(y); return [V(x, y, znAt(y)), x / 4.5, y / 3.4]; });
  const sides = [-1, 1].map((s) => grid(10, NY, (i, j) => {
    const y = (j / NY) * TH, x = s * hwAt(y), z0 = zsAt(y, x), z1 = znAt(y), z = s > 0 ? z0 + (z1 - z0) * (i / 10) : z1 + (z0 - z1) * (i / 10);
    return [V(x, y, z), z / 4.5, y / 3.4];
  }));
  // roof: slopes up toward the north (the crown), with a planted strip (sky garden)
  const roof = grid(NX, 6, (i, j) => {
    const x = (i / NX * 2 - 1) * hwAt(TH), u = j / 6, z0 = zsAt(TH, x), z1 = znAt(TH);
    return [V(x, TH + 7 * u, z0 + (z1 - z0) * u), x / 4.5, u * 6];
  });
  return { south, north, sides, roof };
};

// ---------------- the car ----------------
// look-match: a rounded, glossy classic sports coupe (long bonnet, wheel arches cut into the body, glass house, chrome
// bumpers/grille/wire wheels) built from extruded side profiles with bevelled edges instead of boxes.
type CarParts = { group: THREE.Group; body: THREE.Mesh; base: Float32Array; mirrors: THREE.Object3D[]; badge: THREE.Object3D };
const WHEELS: [number, number][] = [[1.48, 0.84], [1.48, -0.84], [-1.5, 0.84], [-1.5, -0.84]];
/** side profile with arches; x along the car, y up. len scales x, h scales the roof line */
const carProfile = (arch: number[], r = 0.46, nose = 2.42, tail = -2.42, deck = 0.95, hood = 0.74) => {
  const sh = new THREE.Shape();
  sh.moveTo(tail + 0.12, 0.25);
  for (const cx of arch) { sh.lineTo(cx - r, 0.25); sh.lineTo(cx - r, 0.36); sh.absarc(cx, 0.36, r, Math.PI, 0, true); sh.lineTo(cx + r, 0.25); }
  sh.lineTo(nose - 0.17, 0.25);
  sh.quadraticCurveTo(nose, 0.29, nose, 0.5);
  sh.quadraticCurveTo(nose, 0.68, nose - 0.22, hood);
  sh.quadraticCurveTo(nose * 0.55, deck - 0.02, nose * 0.25, deck);
  sh.lineTo(tail + 0.9, deck);
  sh.quadraticCurveTo(tail + 0.08, deck, tail, 0.68);
  sh.quadraticCurveTo(tail - 0.04, 0.33, tail + 0.12, 0.25);
  return sh;
};
const extr = (sh: THREE.Shape, depth: number, bevel: number, curve = 18) => {
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: curve, steps: 6 });
  g.translate(0, 0, -depth / 2);
  return g;
};
const carMats = (col: string) => ({
  paint: twoTone(new THREE.MeshPhongMaterial({ color: col, specular: "#f4fbff", shininess: 140 }), 0.15),
  chrome: twoTone(new THREE.MeshPhongMaterial({ color: "#dfe4ea", specular: "#ffffff", shininess: 200 }), 0.1),
  glass: twoTone(new THREE.MeshPhongMaterial({ color: "#2a3e5c", specular: "#e8f4ff", shininess: 160 }), 0.15),
  tyre: lam("tyre", () => ({ color: "#232228" })),
});
const wheel = (chrome: THREE.Material, tyre: THREE.Material, x: number, z: number) => {
  const w = new THREE.Group(); w.position.set(x, 0.36, z);
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.105, 12, 32), tyre); w.add(t);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 28).rotateX(Math.PI / 2), chrome); w.add(rim);
  for (let k = 0; k < 8; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.36, 0.02), chrome); sp.rotation.z = (k / 8) * Math.PI; sp.position.z = Math.sign(z) * 0.105; w.add(sp); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.08, 6).rotateX(Math.PI / 2), chrome); hub.position.z = Math.sign(z) * 0.13; w.add(hub);
  return w;
};
const buildCar = (): CarParts => {
  const group = new THREE.Group();
  const { paint, chrome, glass, tyre } = carMats("#17583a");
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.55, 1.35) });
  const tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 0.15, 0.12) });
  const bg = extr(carProfile([-1.5, 1.48]), 1.56, 0.14);
  const p = bg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i); let z = p.getZ(i);
    const top = clamp01((y - 0.55) / 0.4), ex = Math.max(0, Math.abs(x) - 1.7) / 0.75;
    z *= 1 - 0.16 * ex * ex - 0.1 * top;                                        // rounded nose/tail in plan, tumblehome
    p.setXYZ(i, x, y, z);
  }
  bg.computeVertexNormals();
  const body = new THREE.Mesh(bg, paint);
  const base = new Float32Array(p.array as Float32Array);
  // glass house + painted roof
  const gh = new THREE.Shape();
  gh.moveTo(-1.45, 0.9); gh.lineTo(0.7, 0.9); gh.quadraticCurveTo(0.25, 1.36, -0.15, 1.4); gh.lineTo(-0.7, 1.4); gh.quadraticCurveTo(-1.25, 1.38, -1.45, 0.9);
  const cabG = extr(gh, 1.12, 0.07, 12);
  const cp = cabG.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < cp.count; i++) cp.setZ(i, cp.getZ(i) * (1 - 0.18 * clamp01((cp.getY(i) - 0.9) / 0.5)));
  cabG.computeVertexNormals();
  const cabin = new THREE.Mesh(cabG, glass);
  const rf = new THREE.Shape();
  rf.moveTo(-0.95, 1.36); rf.lineTo(-0.05, 1.36); rf.quadraticCurveTo(-0.1, 1.44, -0.2, 1.45); rf.lineTo(-0.75, 1.45); rf.quadraticCurveTo(-0.95, 1.44, -0.95, 1.36);
  const roof = new THREE.Mesh(extr(rf, 0.86, 0.06, 8), paint);
  // chrome belt line + window frame strips
  const belt = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 2.2, 4, 8).rotateZ(Math.PI / 2), chrome);
  for (const zs of [-1, 1]) { const bl = belt.clone(); bl.position.set(-0.35, 0.92, zs * 0.66); group.add(bl); }
  group.add(body, cabin, roof);
  for (const [x, z] of WHEELS) group.add(wheel(chrome, tyre, x, z));
  // oval grille mouth + bumpers + lamps
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 24).scale(1, 0.55, 1).rotateY(Math.PI / 2), chrome); mouth.position.set(2.5, 0.44, 0);
  const mouthIn = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24).scale(1, 0.55, 1).rotateY(Math.PI / 2), lam("grilleDark", () => ({ color: "#1b1d24" }))); mouthIn.position.set(2.49, 0.44, 0);
  group.add(mouth, mouthIn);
  for (const [x, zz] of [[2.42, 0.62], [-2.48, 0.62]] as const) for (const s2 of [-1, 1]) {
    const bar = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.48, 4, 10).rotateX(Math.PI / 2), chrome);
    bar.position.set(x, 0.38, s2 * zz * 0.85); bar.rotation.y = s2 * (x > 0 ? 0.35 : -0.35); group.add(bar);
  }
  for (const z of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), lamp); l.position.set(2.3, 0.63, z); l.layers.set(NOINK); group.add(l);
    const bez = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.022, 8, 20).rotateY(Math.PI / 2), chrome); bez.position.set(2.33, 0.63, z); group.add(bez);
    const tl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), tail); tl.position.set(-2.46, 0.6, z * 1.05); tl.layers.set(NOINK); group.add(tl);
  }
  // badge: a chrome disc on the nose + a leaping ornament on the bonnet
  const badge = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 18).rotateZ(Math.PI / 2), chrome); disc.position.set(0.02, 0, 0);
  const orn = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.3, 4, 8).rotateZ(Math.PI / 2), chrome); orn.position.set(-0.12, 0.2, 0); orn.rotation.z = 0.35;
  const ornB = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.12, 4, 8), chrome); ornB.position.set(-0.2, 0.1, 0);
  badge.add(disc, orn, ornB); badge.position.set(2.2, 0.8, 0);
  group.add(badge);
  const mirrors: THREE.Object3D[] = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); piv.position.set(0.85, 0.96, s * 0.74);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.12, 4, 8).rotateX(Math.PI / 2), chrome); arm.position.set(0, 0, s * 0.08);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10).scale(0.6, 0.75, 1.1), chrome); head.position.set(0, 0.04, s * 0.22);
    piv.add(arm, head); group.add(piv); mirrors.push(piv);
  }
  group.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { group, body, base, mirrors, badge };
};
/** static street vehicles (merged into the batch): a generic saloon, a black cab-like hatch, a red double-deck bus */
const parkedCar = (b: Batch, x: number, z: number, yaw: number, col: string, kind: "saloon" | "cab") => {
  const { paint, chrome, glass, tyre } = carMats(col);
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0.012, z);
  const sc = kind === "cab" ? 0.9 : 0.92;
  const body = extr(carProfile([-1.45, 1.45], 0.44, 2.2, -2.2, kind === "cab" ? 0.98 : 0.9, kind === "cab" ? 0.86 : 0.8), 1.5, 0.14);
  body.scale(sc, 1, 1);
  b.add(body, paint, m);
  const gh = new THREE.Shape();
  const top = kind === "cab" ? 1.62 : 1.36;
  gh.moveTo(-1.5, 0.88); gh.lineTo(0.75, 0.88); gh.quadraticCurveTo(0.45, top, 0.1, top); gh.lineTo(-1.2, top); gh.quadraticCurveTo(-1.5, top - 0.05, -1.5, 0.88);
  b.add(extr(gh, 1.12, 0.07, 8).scale(sc, 1, 1), glass, m);
  b.add(new THREE.BoxGeometry(1.1 * sc, 0.06, 1.14).translate(-0.55 * sc, top + 0.04, 0), paint, m);
  for (const [wx, wz] of WHEELS) {
    b.add(new THREE.TorusGeometry(0.25, 0.1, 10, 24).translate(wx * sc, 0.35, wz), tyre, m);
    b.add(new THREE.CylinderGeometry(0.17, 0.17, 0.18, 18).rotateX(Math.PI / 2).translate(wx * sc, 0.35, wz), chrome, m);
  }
  for (const s2 of [-1, 1]) b.add(new THREE.CapsuleGeometry(0.04, 1.3, 4, 8).rotateX(Math.PI / 2).translate(s2 * 2.28 * sc, 0.36, 0), chrome, m);
};
const bus = (b: Batch, x: number, z: number, yaw: number) => {
  const red = twoTone(new THREE.MeshPhongMaterial({ color: "#c8262e", specular: "#ffe0e0", shininess: 90 }), 0.15);
  const win = lam("busWin", () => ({ map: rep(busWinTex(), 2, 1) }));
  const tyre = lam("tyre", () => ({ color: "#232228" }));
  const m = new THREE.Matrix4().makeRotationY(yaw).setPosition(x, 0.012, z);
  const sh = new THREE.Shape();
  sh.moveTo(-5.4, 0.35); sh.lineTo(5.4, 0.35); sh.quadraticCurveTo(5.6, 0.35, 5.6, 0.7); sh.lineTo(5.6, 4.0); sh.quadraticCurveTo(5.6, 4.35, 5.2, 4.35);
  sh.lineTo(-5.2, 4.35); sh.quadraticCurveTo(-5.6, 4.35, -5.6, 4.0); sh.lineTo(-5.6, 0.7); sh.quadraticCurveTo(-5.6, 0.35, -5.4, 0.35);
  b.add(extr(sh, 2.3, 0.12, 10), red, m);
  for (const yy of [1.45, 3.25]) for (const s2 of [-1, 1]) b.add(new THREE.PlaneGeometry(10.4, 0.95).translate(0, yy, 0).rotateY(s2 < 0 ? Math.PI : 0).translate(0, 0, s2 * 1.285), win, m);
  b.add(new THREE.PlaneGeometry(2.1, 1.0).rotateY(Math.PI / 2).translate(5.73, 1.6, 0), win, m);
  b.add(new THREE.PlaneGeometry(2.1, 0.95).rotateY(Math.PI / 2).translate(5.73, 3.25, 0), win, m);
  b.add(new THREE.BoxGeometry(11.0, 0.12, 2.56).translate(0, 2.35, 0), lam("busBand", () => ({ color: "#f2e9d6" })), m);
  for (const wx of [-3.6, 3.7]) for (const s2 of [-1, 1]) b.add(new THREE.TorusGeometry(0.42, 0.16, 10, 24).translate(wx, 0.55, s2 * 1.1), tyre, m);
};

// ---------------- sun disc / clouds (as the bridge) ----------------
const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,1)"); gr.addColorStop(0.8, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const roadTex = () => ctex("road", 512, 512, (g, r) => {
  g.fillStyle = "#5f6270"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${r() < 0.5 ? "255,255,255" : "20,20,30"},${0.04 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 3 + r() * 6, 2 + r() * 4); }
  g.fillStyle = "#f2efe4"; g.fillRect(0, 250, 300, 12);                 // centre dash along x
  g.fillStyle = "#e7c64a"; g.fillRect(0, 470, 512, 8); g.fillRect(0, 484, 512, 8); // double yellow at the kerb
});
const quadUp = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};
const UNIT_RAY = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true).translate(0, 0.5, 0);

// ---------------- cast ----------------
const MOD = (v: number): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#d9a441"];
  const hair = ["#3a2a20", "#c9862f", "#1d1a1a", "#7a4a2a", "#d8c08a"];
  const o: Outfit = { jacket: coats[v % 7], pants: ["#3b3f52", "#2b2f3a", "#5a6a8a"][v % 3], boots: ["#4a3426", "#1d1a1a", "#f4f1ea"][v % 3], skin: SKINS[v % 4], hat: "hair", hair: hair[v % 5] };
  if (v % 5 === 3) return { ...o, hat: "cap", cap: ["#e2453c", "#2f6a43"][v % 2] };
  if (v % 4 === 1) return { ...o, dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] };
  return o;
};
const BIZ: Outfit = { jacket: "#2d3e66", pants: "#2b2f3a", boots: "#1d1a1a", hat: "hair", hair: "#3a2a20", skin: SKINS[1], buttons: "#d9dde0", moustache: "#3a2a20" };
const REPORTER: Outfit = { jacket: "#b5653f", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#c9862f", skin: SKINS[0] };
const WAITER: Outfit = { jacket: "#f4f1ea", pants: "#1d1d22", boots: INK, hat: "hair", hair: "#2a201a", skin: SKINS[3], buttons: "#c9a43a" };
const GUEST: Outfit = { jacket: "#e2453c", pants: "#3b5b9a", boots: "#f4f1ea", hat: "cap", cap: "#f3d35a", skin: SKINS[2] };
const FOLKS = Array.from({ length: 14 }, (_, v) => MOD(v));

const who = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const stand = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, key: string, x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}, sc = 1, y = 0) => {
  out.places.push(person(cam, who(i, o, key), x, y, z, { side: false, mirror: false }, { mode: "stand", expr, blink: lidAt(t, i), ...extra }, {}, sc));
  if (extra.mode !== "sit") blob(out, x, y, z, sc);
};
const walk = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, key: string, x: number, z: number, dx: number, dz: number, expr: Expr, phase: number) => {
  const view = viewOf(cam, x, z, dx, dz);
  const fo: FrontOpts = { mode: "stroll", phase, expr, blink: lidAt(t, i) };
  const so: SideOpts = { mode: "march", phase, expr, stomp: 0.5, stride: 0.875 * view.fs };
  out.places.push(person(cam, who(i, o, key), x, 0, z, view, fo, so));
  blob(out, x, 0, z);
};
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: { flat?: boolean; rot?: number; soft?: boolean } = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });

const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  const ph = (i: number, sp = 0.9) => q(((t * sp) / 1.4 + hh(i, 5)) % 1, 120);
  const heat = (x: number, y: number, z: number, i = 0, s = 1) => {
    const u = q((t * 0.9 + i * 0.31) % 1, 24);
    fxCard(out, `heat${u}`, 300, 400, (p) => fxHeat(p, u), x, y, z, 0.9 * s, 1.2 * s, { soft: true });
  };
  if (id === 2) { // passers-by on both pavements
    for (let i = 0; i < 8; i++) {
      const dir = i % 2 ? 1 : -1, z = i % 2 ? 8.6 + hh(i) * 0.8 : -8.5 - hh(i) * 0.8, x = -16 + i * 4.6 + dir * 1.2 * (t - 4);
      walk(out, cam, t, i, FOLKS[i], `m${i}`, x, z, dir, 0, (["smile", "neutral", "smile_closed"] as Expr[])[i % 3], ph(i));
    }
  }
  if (id === 3 && t > 11.6) { // he gets out and strolls off to work
    const k = Math.max(0, t - 12.15), x = carX(3, t) + 0.6 + 1.25 * k, z = 6.0 + Math.min(0.9, k * 0.9);
    if (k <= 0) stand(out, cam, t, 1, BIZ, "biz", x, z, "smile_closed");
    else walk(out, cam, t, 1, BIZ, "biz", x, z, 1, 0.3, "smile_closed", ph(1, 1.0));
  }
  if (id === 4) {
    const ex: Expr = t < W.mirror - LEAD ? "neutral" : t < W.panels - LEAD ? "shock" : t < W.wax - LEAD ? "pained" : "dazed";
    stand(out, cam, t, 1, BIZ, "biz", 3.0, 7.3, ex, { look: t > W.badge && t < W.panels ? -1 : 0 });
    heat(0.2, 1.7, 4.4, 0); heat(-1.4, 1.5, 4.6, 1, 0.8);
    if (t > W.panels - 0.1 && t < W.panels + 1.2) {
      const u = q(clamp01((t - W.panels + 0.1) / 1.3), 24);
      fxCard(out, `puff${u}`, 300, 300, (p) => fxPuff(p, u), 0.4, 1.1, 5.6, 1.6, 1.6, { soft: true });
    }
  }
  if (id === 1) {
    heat(0.3, 1.8, 4.4, 0, 1.2); heat(-1.5, 1.6, 4.7, 1, 1.0);
    for (let k = 0; k < 2; k++) { // two offset steam loops, born transparent (fxPuff restarted at full opacity: pop)
      const u = q((t * 0.6 + k * 0.5) % 1, 24);
      fxCard(out, `steam${u}`, 300, 300, (p) => fxSteam(p, u), 0.6 + k * 0.9, 1.55, 4.6, 1.0, 1.0, { soft: true });
    }
  }
  if ((id === 1 || id === 4 || id === 7 || id === 13) && spotAt(id, t).k > 0.3 && Math.hypot(cam.pos.x - SPOT[0], cam.pos.z - SPOT[2]) > 7) { // heat haze (wide shots only) over the hot spot (look-match: more dramatic beam)
    for (let k = 0; k < 3; k++) heat(SPOT[0] - 2.2 + k * 2.2, 1.3, SPOT[2] + 0.3, 5 + k, 1.3);
  }
  if (id === 5) { // word gets around: people pop in on the far pavement, pointing
    for (let i = 0; i < 5; i++) {
      // first two already there at the cut; the rest scale in over 0.35 s (no one-frame appearance)
      const tin = i < 2 ? 0 : 20.05 + (i - 2) * 0.22, pop = i < 2 ? 1 : smooth((t - tin) / 0.35);
      if (pop <= 0) continue;
      stand(out, cam, t, 10 + i, FOLKS[i + 3], `m${i + 3}`, -2.2 + i * 1.25, 9.2 + hh(i, 3) * 0.9, i % 2 ? "shock" : "grin", { wave: i % 2 ? undefined : q(Math.sin(t * 8 + i), 30), lift: (1 - pop) * 0.2 }, q(0.4 + 0.6 * pop, 30));
    }
    stand(out, cam, t, 1, BIZ, "biz", 3.4, 7.6, "dazed");
  }
  if (id === 6) { // the reporter walks into the beam with a frying pan and fries an egg
    const t0 = W.reporter - 0.2, arrive = W.beam + 0.25, x = -6.2 + 4.6 * smooth((t - t0) / (arrive - t0)), z = 8.0;
    const ex: Expr = t < W.cracks - LEAD ? "smile" : t < W.fries - LEAD ? "grin" : "laugh";
    if (t < arrive - 0.1) walk(out, cam, t, 20, REPORTER, "rep", x, z, 1, 0, "smile", ph(20, 1.1));
    else stand(out, cam, t, 20, REPORTER, "rep", x, z, ex);
    const egg = t < W.cracks - LEAD ? 0 : t < W.fries - LEAD ? 1 : 2, sz = q((t * 2) % 1, 12);
    fxCard(out, `pan${egg}_${egg === 2 ? sz : 0}`, 500, 260, (p) => fxPan(p, egg, sz), x + 0.5, 0.98, z + 0.25, 0.7, 0.36);
    if (t > W.cracks - LEAD && t < W.cracks + 0.35) {
      const u = q((t - W.cracks + LEAD) / 0.37, 30);
      fxCard(out, `burst${u}`, 500, 500, (p) => fxBurst(p, u), x + 0.45, 1.05, z + 0.3, 0.6, 0.6);
    }
    if (t > W.fries - LEAD) heat(x + 0.45, 1.5, z + 0.3, 2, 0.7);
    for (let i = 0; i < 3; i++) stand(out, cam, t, 30 + i, FOLKS[i + 6], `m${i + 6}`, -5.4 + i * 1.2, 10.8 + hh(i, 6), t > W.fries ? "laugh" : "shock");
  }
  if (id === 7 || id === 12 || id === 10) { // crowds standing in the hot spot
    const n = id === 7 ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, r = 0.8 + (i % 4) * 0.75, x = SPOT[0] + Math.cos(a) * r * 1.4, z = SPOT[2] + 1.6 + Math.sin(a) * r * 0.7;
      const ex = (["grin", "laugh", "smile_closed", "smile", "grin"] as Expr[])[i % 5];
      stand(out, cam, t, 40 + i, FOLKS[i % 14], `m${i % 14}`, x, z, ex, { wave: i % 3 === 0 ? q(Math.sin(t * 7 + i), 30) : undefined });
    }
  }
  if (id === 8) { // they follow the moving spot; the clock says two hours, then every day
    const s = spotAt(8, t);
    for (let i = 0; i < 4; i++) {
      const x = (t < W.unluckily - LEAD ? s.at[0] : SPOT[0]) - 1.6 + i * 1.1, z = SPOT[2] + 1.8 + (i % 2) * 0.8; // no skating with the repeating sweep
      const ex: Expr = t < W.unluckily - LEAD ? (["smile_closed", "grin"] as Expr[])[i % 2] : (["nervous", "dazed"] as Expr[])[i % 2];
      stand(out, cam, t, 60 + i, FOLKS[(i + 2) % 14], `m${(i + 2) % 14}`, x, z, ex);
    }
    const hour = t < W.unluckily - LEAD ? 12 + 2 * clamp01((t - 30.2) / 2.8) : 14 + (t - W.unluckily) * 9;
    const hq = Math.round(hour * 48) / 48;
    fxCard(out, `clock${hq}`, 320, 320, (p) => fxClock(p, hq), CLOCK_AT[0], 3.45, CLOCK_AT[2] + 0.2, 1.0, 1.0);
  }
  if (id === 11) { // the kid, the magnifying glass and the leaf
    const [px, , pz] = PARK_AT;
    stand(out, cam, t, 70, KID, "kid", px - 0.55, pz - 0.1, t > 43.9 ? "grin" : "smile", { look: 1 }, 0.72);
    fxCard(out, "magnifier", 420, 420, fxMagnifier, px - 0.02, 0.48, pz + 0.12, 0.42, 0.42, { rot: 0.4 });
    const burn = clamp01((t - 43.0) / 1.6);
    fxCard(out, `leaf${q(burn, 20)}`, 260, 160, (p) => fxLeaf(p, q(burn, 20)), px + 0.05, 0.18, pz + 0.25, 0.44, 0.27, { flat: true, rot: 0.3 });
    fxCard(out, "beamdot", 64, 64, (p) => p.dot(32, 32, 30, "rgba(255,250,210,1)"), px + 0.08, 0.19, pz + 0.24, 0.06, 0.06, { flat: true });
    if (burn > 0.2) { // smoke fades/grows in (was full size in one frame)
      const u = q((t * 0.9) % 1, 24), g2 = q(smooth((burn - 0.2) / 0.2), 12);
      fxCard(out, `smoke${u}_${g2}`, 300, 300, (p) => fxSteam(p, u, g2), px + 0.08, 0.3, pz + 0.25, 0.5 * (0.4 + 0.6 * g2), 0.5 * (0.4 + 0.6 * g2), { soft: true });
    }
  }
  if (id === 13) { // fins go on: the fun is over
    for (let i = 0; i < 5; i++) {
      const ex: Expr = t < W.fins ? "grin" : (["stern", "neutral", "nervous"] as Expr[])[i % 3];
      stand(out, cam, t, 80 + i, FOLKS[(i + 5) % 14], `m${(i + 5) % 14}`, SPOT[0] - 2.4 + i * 1.2, SPOT[2] + 2 + (i % 2) * 0.7, ex);
    }
  }
  if (id === 15 || id === 16) { // Las Vegas: guest on a lounger, bag by his side, then the waiter
    const [gx, , gz] = VSPOT;
    const shocked = t > W.melted2 - LEAD;
    if (id === 15) stand(out, cam, t, 90, GUEST, "guest", gx, gz + 0.15, shocked ? "shock" : "smile_closed", { mode: "sit" }, 1, 0.34);
    else stand(out, cam, t, 90, GUEST, "guest", gx + 0.6, gz + 0.5, "nervous", { wave: q(Math.sin(t * 9), 30) });
    const droop = clamp01((t - (W.melted2 - 0.3)) / 1.4);
    fxCard(out, `bag${q(droop, 24)}`, 260, 260, (p) => fxBag(p, q(droop, 24)), gx + 0.75, 0.62, gz + 0.35, 0.5, 0.5);
    heat(gx + 0.1, 1.6, gz + 0.2, 3, 1.1);
    if (id === 15 && shocked && t < W.melted2 + 0.8) fxCard(out, "bang", 200, 300, fxBang, gx - 0.45, 1.55, gz + 0.3, 0.26, 0.39);
    if (id === 16) stand(out, cam, t, 91, WAITER, "waiter", 600.4, 9.2, t > W.death - LEAD ? "stern" : "neutral", { look: t < 61.2 ? 1 : 0 });
  }
  return out;
};

// ---------------- world ----------------
export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = []; private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunDisc: THREE.Sprite;
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  private car: CarParts;
  private spot: THREE.Mesh; private spotMat: THREE.MeshBasicMaterial; private halo: THREE.Mesh; private haloMat: THREE.MeshBasicMaterial;
  private shafts: THREE.Mesh[] = []; private shaftMat: THREE.MeshBasicMaterial;
  private cone: THREE.Mesh; private coneMat: THREE.MeshBasicMaterial; private coneGeo: THREE.BufferGeometry;
  private rays: THREE.Mesh[] = []; private rayMat: THREE.MeshBasicMaterial;
  private fins: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum(); private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(_kit: Kit) {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() }, c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK); R.add(this.sky);
    this.sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTex(), color: new THREE.Color(6.0, 4.4, 2.4), fog: false, depthWrite: false }));
    this.sunDisc.frustumCulled = false; this.sunDisc.layers.set(NOINK); R.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30; m.position.set(Math.cos(a) * d, 140 + (i % 4) * 40, Math.sin(a) * d); m.scale.set(w, w / 2, 1);
      m.layers.set(NOINK); this.clouds.push(m); R.add(m);
    }

    const b = new Batch();
    const pave = lam("paveHD", () => ({ map: stoneHD("paveHD", ["#d9d3c8", "#cfc8bc", "#e0dacf", "#c8c1b4"], "#a8a092") }));
    const road = lam("roadHD", () => ({ map: roadHD() }));
    const kerb = lam("kerb", () => ({ color: "#bdb6aa" }));
    // ground: paving everywhere, the road along x, kerbs
    b.add(quadUp(-500, 500, -500, 500, 0, 250, 250), pave);
    b.add(quadUp(-400, 400, -6, 6, 0.012, 800 / 12, 1), road); void roadTex;
    for (const s of [-1, 1]) b.add(boxGeo(V(-400, 0, s < 0 ? -6.25 : 6), V(400, 0.14, s < 0 ? -6 : 6.25), 2), kerb);
    b.add(quadUp(-400, 400, -500, -6.25, 0.14, 200, 120), pave);
    b.add(quadUp(-400, 400, 6.25, 500, 0.14, 200, 120), pave);
    // the tower
    const tg = towerGeos();
    const glassS = lam("towerGlass", () => ({ map: repeatTex(glassTex("tower", "#6f9fd0", "#cfe4f6")) }));
    const glassN = lam("towerGlassN", () => ({ map: repeatTex(glassTex("towerN", "#5a83b0", "#a9c6e4")) }));
    for (const g of [tg.south]) b.add(g, glassS);
    for (const g of [tg.north, ...tg.sides]) b.add(g, glassN);
    b.add(tg.roof, lam("crown", () => ({ color: "#8fbf6a" })));
    b.add(boxGeo(V(-hwAt(0) - 1, 0, -47), V(hwAt(0) + 1, 0.6, -22), 2), kerb); // plinth
    // a slim crown fin along the top edge so the sloping roof reads
    // south side of the street: London terraces facing the tower (front faces -z)
    for (let i = 0; i < 14; i++) house(b, -62 + i * 9.4, 26, Math.PI, 8.6, 12, 8 + (i % 3) * 1.6, i + 1, 0.14); // fronts at z 20 (cams up to 17.5)
    // shop fronts on their ground floors (painted HD, abstract signs, no text) + striped awnings
    const AWN: [string, string][] = [["#2f6a43", "#f4f1ea"], ["#c8323a", "#f4f1ea"], ["#1d2a4a", "#e9d9b0"], ["#e7a93a", "#f7f3ea"], ["#7a1f2b", "#f0e2c8"]];
    for (let i = 0; i < 14; i++) {
      const x = -62 + i * 9.4, k = (i * 3 + 1) % 5;
      b.add(new THREE.PlaneGeometry(8.2, 3.1).rotateY(Math.PI).translate(x, 0.14 + 1.55 + 0.25, 19.93), lam(`shop${k}`, () => ({ map: shopTex(k) })));
      b.add(new THREE.PlaneGeometry(7.6, 1.5).rotateX(-Math.PI / 2 - 0.5).rotateY(Math.PI).translate(x, 3.3, 19.3), lam(`awn${k}`, () => ({ map: awningTex(...AWN[k]), side: THREE.DoubleSide })));
    }
    // north side flanking the tower: stone office blocks with windows, then a skyline further back
    const office = (x0: number, x1: number, z0: number, z1: number, h: number, k: number) => {
      const w = x1 - x0, d = z1 - z0;
      const f = lam(`off${k}`, () => ({ map: facadeHD(`off${k}`, w, h, { wall: ["#e2d6bf", "#cdb593", "#d8c7a8"][k % 3], shutter: "#38424f" }) }));
      const s = lam(`offs${k}`, () => ({ map: facadeHD(`offs${k}`, d, h, { wall: ["#e2d6bf", "#cdb593", "#d8c7a8"][k % 3], shutter: "#38424f" }) }));
      b.add(new THREE.PlaneGeometry(w, h).translate((x0 + x1) / 2, h / 2, z1), f);
      b.add(new THREE.PlaneGeometry(d, h).rotateY(Math.PI / 2).translate(x1, h / 2, (z0 + z1) / 2), s);
      b.add(new THREE.PlaneGeometry(d, h).rotateY(-Math.PI / 2).translate(x0, h / 2, (z0 + z1) / 2), s);
      b.add(boxGeo(V(x0 - 0.3, h, z0 - 0.3), V(x1 + 0.3, h + 0.8, z1 + 0.3), 2), kerb);
    };
    office(-78, -44, -40, -14, 28, 0); office(44, 58, -40, -14, 34, 1); office(-120, -84, -40, -14, 22, 2);
    office(92, 120, -40, -14, 26, 0);
    for (const [x0, x1, k] of [[-78, -44, 0], [44, 58, 2], [-120, -84, 3], [92, 120, 4]] as const) // office shop fronts
      for (let x = x0 + 0.4; x + 8.2 <= x1; x += 8.6) b.add(new THREE.PlaneGeometry(8.2, 3.1).translate(x + 4.1, 0.14 + 1.8, -13.95), lam(`shop${k}`, () => ({ map: shopTex(k) })));
    // street furniture: lamp posts, bollards, bins, a red phone box, a bus stop canopy, parked cars, buses
    const green = lam("streetGreen", () => ({ color: "#24402f" })), lampGlass = lam("lampGlass", () => ({ color: "#fff3cf" }));
    const lampPost = (x: number, z: number) => {
      b.add(new THREE.CylinderGeometry(0.2, 0.26, 0.5, 12).translate(x, 0.39, z), green);
      b.add(new THREE.CylinderGeometry(0.07, 0.11, 4.6, 10).translate(x, 2.6, z), green);
      b.add(new THREE.TorusGeometry(0.12, 0.03, 6, 12).translate(x, 3.6, z), green);
      b.add(new THREE.CylinderGeometry(0.26, 0.16, 0.6, 6).translate(x, 5.25, z), lampGlass);
      b.add(new THREE.ConeGeometry(0.34, 0.32, 6).translate(x, 5.71, z), green);
      b.add(new THREE.SphereGeometry(0.06, 8, 6).translate(x, 5.92, z), green);
    };
    for (const x of [-52, -40, -22, 17, 40, 52]) lampPost(x, 6.9);
    for (const x of [-50, -32, -14, 14, 32, 50]) lampPost(x, -6.9);
    const bollard = (x: number, z: number) => { b.add(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 10).translate(x, 0.59, z), green); b.add(new THREE.SphereGeometry(0.11, 10, 6).translate(x, 1.04, z), green); };
    for (const x0 of [-16, 9.5]) for (let k = 0; k < 4; k++) bollard(x0 + k * 1.5, 6.6);
    for (let k = 0; k < 6; k++) bollard(-6 + k * 2.4, -6.6);
    const bin = (x: number, z: number) => {
      b.add(new THREE.CylinderGeometry(0.3, 0.26, 0.85, 14).translate(x, 0.57, z), lam("bin", () => ({ color: "#2a2a30" })));
      b.add(new THREE.CylinderGeometry(0.33, 0.33, 0.08, 14).translate(x, 1.02, z), lam("binLid", () => ({ color: "#c9a43a" })));
    };
    for (const [x, z] of [[-12, 7.2], [12.5, 7.2], [-27, -7.2], [22, -7.2], [-36, 7.2]]) bin(x, z);
    const boxRed = lam("phoneRed", () => ({ color: "#c8262e" })), pane = lam("phonePane", () => ({ color: "#bfe0f0" }));
    for (const [x, z] of [[-18.5, 8.0], [26, -8.0]]) {
      b.add(boxGeo(V(x - 0.5, 0.14, z - 0.5), V(x + 0.5, 2.6, z + 0.5)), boxRed);
      for (const s2 of [-1, 1]) b.add(new THREE.PlaneGeometry(0.7, 1.4).translate(0, 1.55, 0).rotateY(s2 < 0 ? Math.PI : 0).translate(x, 0, z + s2 * 0.505), pane);
      b.add(new THREE.CylinderGeometry(0.62, 0.62, 0.22, 4, 1).rotateY(Math.PI / 4).scale(1.15, 1, 1.15).translate(x, 2.71, z), boxRed);
      b.add(new THREE.SphereGeometry(0.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 2.8, z), boxRed);
    }
    // bus shelter on the north pavement
    b.add(boxGeo(V(-24, 2.5, -9.2), V(-19, 2.62, -7.6)), green);
    for (const x of [-23.8, -19.2]) b.add(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8).translate(x, 1.34, -7.8), green);
    b.add(new THREE.PlaneGeometry(4.6, 2.0).translate(-21.5, 1.2, -9.1), lam("shelterGlass", () => ({ color: "#cfe6f2" })));
    // parked + waiting vehicles (static: nothing pops). South lane stays clear from x -30 to 7 for the Jaguar's arrival.
    parkedCar(b, 9.2, 4.4, 0, "#2f5f9a", "saloon"); parkedCar(b, 15.0, 4.4, 0, "#1d1d22", "cab"); parkedCar(b, 21.0, 4.4, 0, "#d9d2c2", "saloon");
    parkedCar(b, -34, 4.4, 0, "#8c3b4a", "saloon"); parkedCar(b, -40, 4.4, 0, "#1d1d22", "cab");
    parkedCar(b, -9, -4.4, Math.PI, "#d9a441", "saloon"); parkedCar(b, 6, -4.4, Math.PI, "#1d1d22", "cab"); parkedCar(b, 30, -4.4, Math.PI, "#5a7a3a", "saloon");
    bus(b, -20, -3.2, Math.PI); bus(b, -60, 3.2, 0);
    // the flat-glass office (explanation shot 9)
    const flat = lam("flatGlass", () => ({ map: repeatTex(rep(glassTex("flat", "#7aa6d6", "#d8ebfa"), 1, 1)) }));
    const fg = new THREE.PlaneGeometry(24, 30).translate(72, 15, -18);
    const fuv = fg.attributes.uv as THREE.BufferAttribute; for (let i = 0; i < fuv.count; i++) fuv.setXY(i, fuv.getX(i) * 24 / 4.5, fuv.getY(i) * 30 / 3.4);
    b.add(fg, flat); b.add(boxGeo(V(60, 0, -40), V(84, 30, -18.05)), lam("flatSide", () => ({ color: "#9fb3c8" })));
    b.add(boxGeo(V(59.6, 30, -40.4), V(84.4, 30.8, -17.6)), kerb);
    // distant skyline
    for (let i = 0; i < 26; i++) {
      const x = -260 + i * 21 + hh(i) * 8, z = -110 - hh(i, 2) * 120, h = 25 + hh(i, 3) * 55, w = 14 + hh(i, 4) * 10;
      if (Math.abs(x) < 34 && z > -140) continue;
      b.add(boxGeo(V(x - w / 2, 0, z - w / 2), V(x + w / 2, h, z + w / 2)), lam(`sky${i % 4}`, () => ({ color: ["#c8cfd8", "#d6c9b4", "#aab8c8", "#e0d8c8"][i % 4] })));
    }
    // street trees + a lamp post + the clock post
    for (let i = 0; i < 10; i++) { const x = -48 + i * 10.5; if (Math.abs(x - SPOT[0]) < 14) continue; addVeg(b, "round", x, 0.14, 13.2, 6.5, i * 13 + 5, 1); }
    b.add(new THREE.CylinderGeometry(0.11, 0.14, 3.0, 10).translate(CLOCK_AT[0], 1.5 + 0.14, CLOCK_AT[2]), lam("post", () => ({ color: "#2f4a3a" })));
    // park (x = -300): grass, trees, a bench
    const [px, , pz] = PARK_AT;
    b.add(quadUp(px - 60, px + 60, pz - 60, pz + 60, 0.16, 30, 30), lam("grassHD", () => ({ map: grassHD() })));
    for (let i = 0; i < 9; i++) addVeg(b, i % 3 ? "round" : "fat", px - 18 + i * 4.5, 0.16, pz - 9 - hh(i, 7) * 6, 5 + hh(i) * 3, i * 7 + 1, 1);
    addVeg(b, "bush", px - 2.4, 0.16, pz - 1.6, 1.2, 99, 0);
    // Las Vegas: pale deck, turquoise pool, loungers, palms, the curved golden hotel
    const [vx, , vz] = VEGAS;
    b.add(quadUp(vx - 120, vx + 120, vz - 120, vz + 120, 0.17, 60, 60), lam("deck", () => ({ map: stoneHD("deckHD", ["#f0e2c8", "#ead9bc", "#f4e8d2", "#e4d2b2"], "#cdb894") })));
    b.add(quadUp(vx - 10, vx + 8, vz - 4, vz + 3.5, 0.19, 2, 1), lam("poolHD", () => ({ map: poolTex() })));
    b.add(boxGeo(V(vx - 10.4, 0.17, vz - 4.4), V(vx + 8.4, 0.26, vz - 4)), lam("coping", () => ({ color: "#f7f1e3" })));
    b.add(boxGeo(V(vx - 10.4, 0.17, vz + 3.5), V(vx + 8.4, 0.26, vz + 3.9)), lam("coping", () => ({ color: "#f7f1e3" })));
    for (let i = 0; i < 4; i++) { // parasols between the loungers
      const ux = vx - 4.5 + i * 3, uz = vz + 4.5;
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8).translate(ux, 1.32, uz), lam("chromePole", () => ({ color: "#e6e2da" })));
      b.add(new THREE.ConeGeometry(1.3, 0.5, 8, 1, true).translate(ux, 2.6, uz), lam(`para${i % 2}`, () => ({ map: awningTex(i % 2 ? "#e2453c" : "#f3b23a", "#f7f3ea"), side: THREE.DoubleSide })));
    }
    for (let i = 0; i < 5; i++) {
      const lx = vx - 6 + i * 3, lz = vz + 6;
      b.add(boxGeo(V(lx - 0.35, 0.17, lz - 0.9), V(lx + 0.35, 0.34, lz + 0.9)), lam("lounger", () => ({ color: "#f7f3ea" })));
      b.add(new THREE.BoxGeometry(0.7, 0.08, 0.7).rotateX(-0.6).translate(lx, 0.55, lz - 0.85), lam("lounger", () => ({ color: "#f7f3ea" })));
    }
    for (const [x, z] of [[vx - 13, vz + 2], [vx + 11, vz + 1], [vx - 15, vz + 10], [vx + 14, vz + 9]]) {
      b.add(new THREE.CylinderGeometry(0.18, 0.28, 7, 10).translate(x, 3.5, z), lam("palmTrunk", () => ({ color: "#a27a52" })));
      for (let k = 0; k < 7; k++) b.add(new THREE.BoxGeometry(3.2, 0.06, 0.6).translate(1.5, 0, 0).rotateZ(-0.35).rotateY((k / 7) * Math.PI * 2).translate(x, 7, z), lam("palmLeaf", () => ({ color: "#4f9a3f", side: THREE.DoubleSide })));
    }
    const hotel = grid(30, 30, (i, j) => {
      const a = THREE.MathUtils.degToRad(-42 + (84 * i) / 30), y = (j / 30) * 150, r = 60;
      return [V(vx + r * Math.sin(a), y, vz - 6 + 52 - r * Math.cos(a) - 52), (a * r) / 4.5, y / 3.4];
    });
    b.add(hotel, lam("vegasGlass", () => ({ map: repeatTex(glassTex("vegas", "#a7896c", "#ffd6a8", "#f3e6cf")) })));
    const back = grid(30, 30, (i, j) => {
      const a = THREE.MathUtils.degToRad(42 - (84 * i) / 30), y = (j / 30) * 150, r = 76;
      return [V(vx + r * Math.sin(a), y, vz - 6 - r * Math.cos(a)), (a * r) / 4.5, y / 3.4];
    });
    b.add(back, lam("vegasBack", () => ({ color: "#d8c2a2" })));
    b.build(R);

    // dynamic: car, fins, hot spot, cone, rays
    this.car = buildCar(); this.car.group.position.set(...CAR); R.add(this.car.group);
    const finM = lam("fin", () => ({ color: "#d9dde3" }));
    for (let k = 0; k < 31; k++) {
      const y = 3 * 3.4 + k * 3.4, hw = hwAt(y), parts: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 14; i++) {
        const x0 = -hw + (2 * hw * i) / 14, x1 = -hw + (2 * hw * (i + 1)) / 14, xm = (x0 + x1) / 2, z = zsAt(y, xm) + 0.55;
        const ang = Math.atan2(zsAt(y, x1) - zsAt(y, x0), x1 - x0);
        parts.push(new THREE.BoxGeometry(x1 - x0 + 0.05, 0.16, 1.1).rotateY(-ang).translate(xm, y, z));
      }
      const m = new THREE.Mesh(mergeGeometries(parts), finM); m.castShadow = true; m.receiveShadow = true; m.visible = false;
      this.fins.push(m); R.add(m);
    }
    this.spotMat = new THREE.MeshBasicMaterial({ map: spotTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, color: new THREE.Color(2, 1.6, 0.9) });
    this.spot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.spotMat);
    this.spot.layers.set(NOINK); this.spot.renderOrder = 2; R.add(this.spot);
    this.haloMat = new THREE.MeshBasicMaterial({ map: haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    this.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), this.haloMat);
    this.halo.layers.set(NOINK); this.halo.renderOrder = 2; R.add(this.halo);
    // light shafts: crossed vertical planes along the beam axis, bright at the ground (god-ray streaks)
    this.shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), this.shaftMat); m.layers.set(NOINK); m.renderOrder = 3; m.frustumCulled = false; this.shafts.push(m); R.add(m); }
    this.coneGeo = new THREE.BufferGeometry();
    this.coneGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 3 * 3), 3));
    this.coneMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.85, 0.55), transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    this.cone = new THREE.Mesh(this.coneGeo, this.coneMat); this.cone.frustumCulled = false; this.cone.layers.set(NOINK); this.cone.renderOrder = 3; R.add(this.cone);
    this.rayMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.3, 0.7), fog: false });
    for (let i = 0; i < 24; i++) { const r = new THREE.Mesh(UNIT_RAY, this.rayMat); r.layers.set(NOINK); r.visible = false; r.frustumCulled = false; this.rays.push(r); R.add(r); }
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 2: { az: 120, el: 40 }, 10: { az: 110, el: 50 }, 12: { az: 120 }, 13: { az: 120 }, 14: { az: 120 }, 15: { az: 20, el: 9 }, 16: { az: -30, el: 9 } };
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private ray(i: number, a: THREE.Vector3, b: THREE.Vector3, w: number) {
    const r = this.rays[i], d = b.clone().sub(a), len = d.length();
    if (len < 1e-3) { r.visible = false; return; }
    r.visible = true; r.position.copy(a);
    r.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    r.scale.set(w, len, w);
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    // shadow box fixed per shot (centre = first key's look, size from its distance): a box that follows the drifting
    // look point clipped the houses' shadows on and off (QA pops out 26, 34-37)
    const c0 = camAt(id, s.a), l0 = V(...shotLook0(id)), d0 = V(...c0.pos).distanceTo(l0);
    let Rr = THREE.MathUtils.clamp(d0 * 1.15 + 7, 12, 160);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    if (s.place === "street" || s.place === "vegas") Rr = Math.max(Rr, 40);
    this.sun.position.copy(l0).addScaledVector(sunDir, 400); this.sun.target.position.copy(l0);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 900; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    // fog: the reference values (25 -> 300 m day); far aerial cameras shift it out by their distance to the subject so
    // the haze still starts behind what they look at (was x2 / x1.8 everywhere: no depth cue)
    const fogOff = Math.max(0, dist - 40);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear + fogOff; this.fog.far = L.fogFar + fogOff;
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i]; m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
      m.position.x = Math.cos((i / 9) * Math.PI * 2 + 0.3) * (620 + (i % 3) * 60) + (s.place === "vegas" ? 600 : s.place === "park" ? -300 : 0);
    }

    // ---- car: position + melt ----
    const mt = melt(id, t), car = this.car;
    car.group.position.x = carX(id, t);
    car.group.visible = s.place === "street" || s.place === "aerial" || s.place === "side";
    const pa = car.body.geometry.attributes.position as THREE.BufferAttribute, bs = car.base;
    for (let i = 0; i < pa.count; i++) {
      const x = bs[i * 3], y = bs[i * 3 + 1], z = bs[i * 3 + 2], up = clamp01((y - 0.32) / 0.7);
      const wob = (0.5 + 0.5 * Math.sin(x * 4.1 + z * 2.0)) * (0.6 + 0.4 * Math.cos(x * 2.3 - 1));
      pa.setXYZ(i, x, y - mt.panels * 0.13 * up * wob - mt.panels * 0.05 * up, z * (1 + mt.panels * 0.05 * Math.sin(x * 5.3) * up));
    }
    pa.needsUpdate = true; car.body.geometry.computeVertexNormals();
    car.mirrors.forEach((m, i) => { const sgn = i ? 1 : -1; m.rotation.set(sgn * 1.15 * mt.mirror, 0, -0.25 * mt.mirror); m.scale.set(1, 1 + 0.6 * mt.mirror, 1); });
    car.badge.rotation.set(0, 0, -1.0 * mt.badge); car.badge.scale.set(1 + 0.3 * mt.badge, 1 - 0.55 * mt.badge, 1 + 0.4 * mt.badge);
    car.badge.position.y = 0.8 - 0.12 * mt.badge;

    // ---- hot spot + cone ----
    const sp = spotAt(id, t), vegas = s.place === "vegas";
    this.spot.visible = sp.k > 0.01 && s.place !== "flat" && s.place !== "park";
    this.cone.visible = this.spot.visible && s.place !== "side" && s.place !== "aerial";
    if (this.spot.visible) {
      this.spot.position.set(sp.at[0], 0.2, sp.at[2]);
      this.spot.scale.set(sp.r * 2.4, 1, sp.r * 1.6);
      this.spotMat.color.setRGB(3.6 * sp.k, 2.5 * sp.k, 1.0 * sp.k);
      const top = vegas ? [V(VEGAS[0] - 16, 30, -63), V(VEGAS[0] + 16, 30, -63), V(VEGAS[0] + 16, 90, -63), V(VEGAS[0] - 16, 90, -63)]
        : [V(-14, 18, zsAt(18, 0) + 1), V(14, 18, zsAt(18, 0) + 1), V(14, 80, zsAt(80, 0) + 1), V(-14, 80, zsAt(80, 0) + 1)];
      const r = sp.r * 0.6, ax = sp.at[0], az = sp.at[2];
      const bot = [V(ax - r, 0.2, az - r * 0.5), V(ax + r, 0.2, az - r * 0.5), V(ax + r, 0.2, az + r * 0.5), V(ax - r, 0.2, az + r * 0.5)];
      const arr = this.coneGeo.attributes.position.array as Float32Array;
      let k = 0;
      for (let i = 0; i < 4; i++) {
        const a = top[i], b2 = top[(i + 1) % 4], c2 = bot[(i + 1) % 4], d = bot[i];
        for (const p of [a, b2, c2, a, c2, d]) { arr[k++] = p.x; arr[k++] = p.y; arr[k++] = p.z; }
      }
      this.coneGeo.attributes.position.needsUpdate = true; this.coneGeo.computeBoundingSphere();
      this.coneMat.opacity = 0.16 * Math.min(1, sp.k);
      // halo (wide warm bloom on the ground) and shafts (streaks from the glass down to the spot)
      this.halo.position.set(sp.at[0], 0.21, sp.at[2]); this.halo.scale.set(sp.r * 5.2, 1, sp.r * 3.6);
      this.haloMat.color.setRGB(1.25 * sp.k, 0.8 * sp.k, 0.4 * sp.k);
      const src = vegas ? V(VEGAS[0], 60, -63) : V(0, 48, zsAt(48, 0) + 1), dst = V(sp.at[0], 0.2, sp.at[2]);
      const dir = src.clone().sub(dst), len = dir.length(); dir.normalize();
      const camFar = cam.position.distanceTo(dst) > 22; // shafts only read from afar; up close they wash the whole frame
      this.shafts.forEach((m, i) => {
        m.visible = this.cone.visible && camFar; m.position.copy(dst).add(V((i - 1) * sp.r * 0.35, 0, 0));
        m.quaternion.setFromUnitVectors(V(0, 1, 0), dir); m.rotateY((i * Math.PI) / 3);
        m.scale.set(sp.r * (1.6 - 0.35 * i), len, 1);
      });
      this.shaftMat.color.setRGB(0.3 * Math.min(1.2, sp.k), 0.22 * Math.min(1.2, sp.k), 0.1 * Math.min(1.2, sp.k));
    } else this.shafts.forEach((m) => { m.visible = false; });
    this.halo.visible = this.spot.visible;

    // ---- fins ----
    const fk = finsAt(id, t);
    this.fins.forEach((m, k) => { m.visible = fk * 31 > k + 0.5; });

    // ---- explanation rays ----
    const g = raysAt(id, t);
    for (const r of this.rays) r.visible = false;
    if (g > 0 && id === 9) { // flat glass: in and straight back out, still spread apart
      const din = V(0, -0.55, -1).normalize(), dout = V(0, -0.55, 1).normalize();
      for (let i = 0; i < 5; i++) {
        const P = V(64 + i * 4, 10 + i * 3.5, -17.9), S = P.clone().addScaledVector(din, -40);
        const gi = clamp01(g * 2), go = clamp01(g * 2 - 1);
        this.ray(i, S, S.clone().lerp(P, gi), 0.12);
        if (go > 0) this.ray(5 + i, P, P.clone().addScaledVector(dout, 40 * go), 0.12);
      }
    }
    if (g > 0 && (id === 10 || id === 12)) { // curved wall: parallel in, all meeting at the spot
      const din = V(0, -0.8, -0.6).normalize(), n = 8;
      for (let i = 0; i < n; i++) {
        const y = 22 + i * 10, x = (i % 3 - 1) * 8, P = V(x, y, zsAt(y, x) + 0.2), S = P.clone().addScaledVector(din, -90);
        const gi = clamp01(g * 2 - i * 0.04), go = clamp01(g * 2 - 1 - i * 0.04);
        this.ray(i, S, S.clone().lerp(P, gi), 0.45);
        if (go > 0) this.ray(n + i, P, P.clone().lerp(V(SPOT[0], 0.3, SPOT[2]), go), 0.45);
      }
    }

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = castAt(id, t, { pos: cam.position, right, sun: sunDir }, s.light);
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      if (Math.hypot(p.x - cam.position.x, p.z - cam.position.z) < 1.6) continue; // never a giant face against the lens
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft); e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e2 of fused) e2.bind();
    return focus;
  }
}
