// The Gimli world as one three.js scene: sky + light rig (as the bridge short), an airport with a fuel truck, a
// kitchen, a cruise set over a sea of clouds, a cockpit set, and Gimli's old runway turned racetrack by the lake,
// with families, campers and go-karts. One jet is posed per shot (parked, taking off, cruising, gliding, landing).
import * as THREE from "three";
import { Batch, boxGeo, V, lam, addVeg, house, Kit } from "../bridge/build";
import { ctex, rep, stoneHD, grassHD, cloudHD } from "../bridge/paint";
import { Pen, KID, SKINS, INK, Outfit, Expr, FrontOpts, fxPuff } from "../bridge/toon";
import { fxBang } from "../scorchie/fx";
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { TONE, CHAR, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { Pool, Actor, Fx, Stage, Who, person, blob, prepStage, viewOf, lidAt, hh, q, CamInfo } from "../bridge/cast";
import { glassTex, repeatTex } from "../scorchie/fx";
import { buildPlane, posePlane, Plane, noseTipWorld } from "./plane";
import {
  FPS, SHOTS, ShotDef, ALT, CK, GIMLI, KITCHEN, STOP_X, W, LEAD, V3, smooth, clamp01,
  camAt, engines, screens, gimliPlane, sparksAt,
} from "./story";
import { fxGauge, fxScale, fxCup, fxSpoon, fxThought, fxSparks, fxSpray, screenTex, runwayTex, startLineTex, cloudSeaTex, tileTex } from "./fx";

export { type Kit };
export const loadKit = async (): Promise<Kit> => ({});

const discTex = () => ctex("sunDisc", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(255,255,255,1)"); gr.addColorStop(0.8, "rgba(255,255,255,0.4)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
const flagTex = () => ctex("flagCanada", 320, 160, (g) => {
  g.fillStyle = "#d52b1e"; g.fillRect(0, 0, 320, 160); g.fillStyle = "#ffffff"; g.fillRect(80, 0, 160, 160);
  g.fillStyle = "#d52b1e"; g.beginPath(); // simple maple leaf
  const P: [number, number][] = [[160, 22], [172, 48], [190, 40], [184, 76], [208, 62], [204, 78], [226, 74], [214, 98], [222, 104], [188, 122], [192, 136], [164, 132], [164, 150], [156, 150], [156, 132], [128, 136], [132, 122], [98, 104], [106, 98], [94, 74], [116, 78], [112, 62], [136, 76], [130, 40], [148, 48]];
  P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
});
const quadUp = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([x0, y, z1, x1, y, z1, x1, y, z0, x0, y, z1, x1, y, z0, x0, y, z0], 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, u, 0, u, v, 0, 0, u, v, 0, v], 2));
  return g;
};

// ---------------- painted set dressing textures (look-match pass) ----------------
const CROPS = [["#e0b452", "#c99a3e", "#efcb72"], ["#4f8f36", "#3e7a2c", "#68a644"], ["#b4cf5e", "#9cbc4c", "#c8e070"],
  ["#9a6e48", "#7e5838", "#b0845a"], ["#ecd23e", "#d6b82e", "#f6e06a"], ["#c9a05a", "#b08848", "#dcb66e"]];
/** a crop field: base colour, soft blotches, painted furrow rows, speckle (512 px = 48 m) */
const cropTex = (k: number) => ctex("cropHD" + k, 512, 512, (g, r) => {
  const P = CROPS[k];
  g.fillStyle = P[0]; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12; i++) {
    const x = r() * 512, y = r() * 512, rad = 60 + r() * 150, c = new THREE.Color(P[r() < 0.5 ? 1 : 2]);
    for (const ox of [-512, 0, 512]) for (const oy of [-512, 0, 512]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},0.55)`); gr.addColorStop(1, `rgba(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0},0)`);
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
  g.lineCap = "round";
  for (let y = 4; y < 512; y += 16) { // furrow rows (light crest + dark trough)
    g.strokeStyle = "rgba(40,30,20,0.16)"; g.lineWidth = 5; g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke();
    g.strokeStyle = "rgba(255,250,220,0.14)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, y + 6); g.lineTo(512, y + 6); g.stroke();
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? "rgba(255,250,220,0.22)" : "rgba(40,40,20,0.18)"; g.fillRect(r() * 512, r() * 512, 2 + r() * 3, 2); }
});
const panelTex = () => ctex("cockpitPanelHD", 512, 256, (g, r) => {
  g.fillStyle = "#3b3e46"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "rgba(0,0,0,0.45)"; g.lineWidth = 3;
  for (let x = 0; x < 512; x += 128) g.strokeRect(x + 4, 4, 120, 248); // sub-panels
  for (let i = 0; i < 40; i++) { // knobs and gauges (no labels)
    const x = 14 + r() * 484, y = 14 + r() * 228, rad = 4 + r() * 9;
    g.fillStyle = r() < 0.5 ? "#1c1e24" : "#5a5e68"; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
    g.strokeStyle = "rgba(220,225,235,0.55)"; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, rad, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rad * 0.8, y - rad * 0.5); g.stroke();
  }
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.7 ? "#cfd3da" : "#e8c45a"; g.fillRect(10 + r() * 490, 10 + r() * 236, 3, 8); } // toggles
});
const awningTex = (c: string) => ctex("awning" + c, 128, 128, (g) => {
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 128, 128); g.fillStyle = c;
  for (let x = 0; x < 128; x += 32) g.fillRect(x, 0, 16, 128);
  g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 112, 128, 16);
});
const corrugTex = (c: string) => ctex("corrug" + c, 256, 256, (g) => {
  g.fillStyle = c; g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) { g.fillStyle = "rgba(255,255,255,0.14)"; g.fillRect(x, 0, 5, 256); g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(x + 9, 0, 4, 256); }
  for (let i = 0; i < 10; i++) { g.fillStyle = "rgba(90,60,40,0.08)"; g.fillRect(i * 25, 200 + (i % 3) * 10, 30, 56); }
});
const curtainTex = () => ctex("curtainCheck", 128, 128, (g) => {
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 128, 128); g.fillStyle = "rgba(210,69,58,0.75)";
  for (let i = 0; i < 128; i += 32) { g.fillRect(i, 0, 16, 128); g.fillRect(0, i, 128, 16); }
});
const TM = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) =>
  new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const glowMat = (hex: string, k: number) => new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), fog: true });

// ---------------- cast ----------------
const MOD = (v: number): Outfit => {
  const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#d9a441"];
  const hair = ["#3a2a20", "#c9862f", "#1d1a1a", "#7a4a2a", "#d8c08a"];
  const o: Outfit = { jacket: coats[v % 7], pants: ["#3b3f52", "#2b2f3a", "#5a6a8a"][v % 3], boots: ["#4a3426", "#1d1a1a", "#f4f1ea"][v % 3], skin: SKINS[v % 4], hat: "hair", hair: hair[v % 5] };
  if (v % 5 === 3) return { ...o, hat: "cap", cap: ["#e2453c", "#2f6a43"][v % 2] };
  if (v % 4 === 1) return { ...o, dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] };
  return o;
};
const FOLKS = Array.from({ length: 14 }, (_, v) => MOD(v));
const CAPTAIN: Outfit = { jacket: "#22324f", pants: "#22324f", boots: INK, hat: "hair", hair: "#9a9aa2", skin: SKINS[1], buttons: "#e8c45a", moustache: "#8a8a92" };
const FIRST: Outfit = { jacket: "#22324f", pants: "#22324f", boots: INK, hat: "hair", hair: "#3a2a20", skin: SKINS[2], buttons: "#e8c45a" };
const FUELER: Outfit = { jacket: "#e07a2c", pants: "#e07a2c", boots: "#3a2a20", hat: "cap", cap: "#2f5f6a", skin: SKINS[3] };
const CHECKER: Outfit = { jacket: "#2f5f6a", pants: "#2b2f3a", boots: INK, hat: "cap", cap: "#f3d35a", skin: SKINS[0] };
const BAKER: Outfit = { jacket: "#f4f1ea", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#c9862f", skin: SKINS[0], dress: "#f4f1ea" };
const RACER: Outfit = { jacket: "#e2453c", pants: "#e2453c", boots: INK, hat: "cap", cap: "#f4f1ea", skin: SKINS[1] };

const who = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const stand = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, key: string, x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}, sc = 1, y = 0) => {
  out.places.push(person(cam, who(i, o, key), x, y, z, { side: false, mirror: false }, { mode: "stand", expr, blink: lidAt(t, i), ...extra }, {}, sc));
  if (extra.mode !== "sit") blob(out, x, y, z, sc);
};
const walk = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, key: string, x: number, z: number, dx: number, dz: number, expr: Expr, phase: number, sc = 1) => {
  const view = viewOf(cam, x, z, dx, dz);
  out.places.push(person(cam, who(i, o, key), x, 0, z, view, { mode: "stroll", phase, expr, blink: lidAt(t, i) }, { mode: "march", phase, expr, stomp: 0.5, stride: 0.875 * view.fs }, sc));
  blob(out, x, 0, z, sc);
};
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: { flat?: boolean; rot?: number; soft?: boolean } = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });

/** go-kart loop on the racetrack half of the runway */
const KART_N = 6;
export const kartAt = (i: number, t: number): [number, number, number] => {
  const L = (t * 0.16 + i / KART_N) % 1, a = L * Math.PI * 2, cx = GIMLI[0] + 370, rx = 95, rz = 13;
  return [cx + rx * Math.cos(a), cx === 0 ? 0 : rz * Math.sin(a), Math.atan2(rz * Math.cos(a), -rx * Math.sin(a))];
};

const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden", plane: Plane): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  const ph = (i: number, sp = 0.9) => q(((t * sp) / 1.4 + hh(i, 5)) % 1, 120);
  if (id === 2) {
    stand(out, cam, t, 1, FUELER, "fuel", -4.6, 12.2, "smile");
    stand(out, cam, t, 2, CHECKER, "chk", 6, 13, "neutral");
    for (let i = 0; i < 4; i++) walk(out, cam, t, 10 + i, FOLKS[i], `m${i}`, -40 + i * 7 + 1.2 * (t - 5), 34 + i * 0.8, 1, 0, "smile", ph(10 + i));
  }
  if (id === 3) {
    stand(out, cam, t, 2, CHECKER, "chk", 3.2, 10.6, t > W.kilograms - LEAD ? "smile_closed" : "neutral", { look: -1 });
    fxCard(out, "gauge1", 320, 320, (p) => fxGauge(p, 0.95), 1.0, 3.9, 9.4, 1.1, 1.1);
  }
  if (id === 4) {
    stand(out, cam, t, 1, FUELER, "fuel", -3.6, 9.6, t > W.pounds - LEAD ? "grin" : "smile");
    const tilt = smooth((t - (W.pounds - 0.2)) / 0.5);
    fxCard(out, `scale${q(tilt, 20)}`, 520, 360, (p) => fxScale(p, q(tilt, 20)), -2.4, 2.2, 9.9, 1.3, 0.9);
  }
  if (id === 5) {
    const [kx, , kz] = KITCHEN;
    const ex: Expr = t < W.spoons - LEAD ? "smile" : t < W.little - LEAD ? "smile_closed" : "nervous";
    stand(out, cam, t, 3, BAKER, "baker", kx - 0.1, kz - 0.75, ex);
    const cupIn = smooth((t - (W.cups - 0.2)) / 0.25), spoonIn = smooth((t - (W.spoons - 0.2)) / 0.25);
    if (cupIn > 0) fxCard(out, "cup", 300, 300, fxCup, kx - 0.55, 1.28 + 0.05 * (1 - cupIn), kz + 0.1, 0.34 * cupIn, 0.34 * cupIn);
    if (spoonIn > 0) fxCard(out, "spoon", 300, 120, fxSpoon, kx + 0.45, 1.16, kz + 0.15, 0.22 * spoonIn, 0.088 * spoonIn, { rot: -0.25 });
    if (t > W.spoons && t < W.spoons + 0.8) { const u = q((t - W.spoons) / 0.8, 24); fxCard(out, `puff${u}`, 300, 300, (p) => fxPuff(p, u), kx + 0.2, 1.1, kz + 0.1, 0.2, 0.2, { soft: true }); }
  }
  if (id === 6) {
    fxCard(out, `gauge${0.42}`, 320, 320, (p) => fxGauge(p, 0.42), cam.pos.x + 0, 0, 0, 0, 0); // (kept out of frame; gauge reads in shot 3)
    out.fx.pop();
  }
  if (id === 8 || id === 9) {
    const [cx, cy, cz] = CK;
    const capEx: Expr = id === 8 ? (t < W.dark - LEAD ? "nervous" : "shock") : (t < W.gliders - LEAD ? "stern" : "smile");
    stand(out, cam, t, 5, CAPTAIN, "cap", cx, cz - 0.55, capEx, { mode: "sit" }, 1, cy + 0.22);
    stand(out, cam, t, 6, FIRST, "fo", cx, cz + 0.55, id === 8 && t > W.dark - LEAD ? "shock" : "nervous", { mode: "sit", look: -1 }, 1, cy + 0.22);
    if (id === 8 && t < W.dark) { // master warning light blinking on the glareshield
      if (Math.floor(t * 4) % 2 === 0) fxCard(out, "warn", 200, 300, fxBang, cx + 1.25, cy + 1.32, cz - 0.15, 0.08, 0.12);
    }
    if (id === 9) { const k = smooth((t - (W.gliders - 0.3)) / 0.35); if (k > 0) fxCard(out, "thought", 420, 360, fxThought, cx + 0.1, cy + 1.75 + 0.05 * (1 - k), cz - 0.95, 0.7 * k, 0.6 * k); }
  }
  if (id >= 10 && id <= 15) { // Gimli: families, campers, karts' drivers
    const [gx] = GIMLI;
    const look = id >= 11 && t > W.karts ? 1 : 0;
    const scared = id === 12 || (id === 11 && t > W.karts + 0.3);
    if (id <= 13) for (let i = 0; i < 14; i++) {
      const x = gx + 326 + i * 2.6 + hh(i) * 1.2, z = 27.5 + (i % 3) * 1.6 + hh(i, 2) * 0.8, kid = i % 4 === 2;
      const ex: Expr = scared ? (["shock", "nervous"] as Expr[])[i % 2] : (["smile", "grin", "laugh", "smile_closed"] as Expr[])[i % 4];
      stand(out, cam, t, 40 + i, kid ? KID : FOLKS[i % 14], kid ? "kid" : `m${i % 14}`, x, z, ex, { wave: !scared && i % 3 === 0 ? q(Math.sin(t * 8 + i), 30) : undefined, look }, kid ? 0.72 : 1);
    }
    if (id <= 12) for (let i = 0; i < KART_N; i++) { // kart drivers (sitting cards) ride the karts
      const [x, z] = kartAt(i, t);
      stand(out, cam, t, 60 + i, RACER, "racer", x, z, "grin", { mode: "sit" }, 0.8, 0.18);
    }
    if (id === 13) {
      const s = sparksAt(id, t);
      if (s > 0.01) {
        const n = noseTipWorld(plane), sd = Math.floor(t * 15) % 6;
        fxCard(out, `sparks${sd}`, 500, 300, (p) => fxSparks(p, sd), n.x - 4.0, n.y + 1.6, n.z + 3.4, 9 * s, 5.4 * s);
        const u = q((t * 1.7) % 1, 24); fxCard(out, `puff${u}`, 300, 300, (p) => fxPuff(p, u), n.x - 5, n.y + 1.4, n.z + 3.0, 4, 4, { soft: true });
      }
    }
    if (id === 14) { // racers run to the nose with fire extinguishers
      const nose = STOP_X + 25;
      for (let i = 0; i < 6; i++) {
        const t0 = 57.0 + i * 0.12, k = smooth((t - t0) / 1.4), x = nose + 34 - 26 * k + i * 1.6, z = 3 + (i % 3) * 2.2 - 1.5;
        if (k < 0.98) walk(out, cam, t, 70 + i, RACER, "racer", x, z, -1, 0, "shock", ph(70 + i, 2.2));
        else stand(out, cam, t, 70 + i, RACER, "racer", x, z, "stern");
        if (t > W.extinguishers - 0.1 && i < 4) { const u = q(((t - W.extinguishers) * 1.6 + i * 0.25) % 1, 24); fxCard(out, `spray${u}`, 400, 260, (p) => fxSpray(p, u), x - 2.2, 1.1, z, 3.2, 2.1, { soft: true }); }
      }
      const u = q((t * 0.8) % 1, 24); fxCard(out, `puff${u}`, 300, 300, (p) => fxPuff(p, u), nose - 1, 1.8, 0, 3.5, 3.5, { soft: true });
    }
    if (id === 15) { // everybody walks away
      for (let i = 0; i < 12; i++) {
        const t0 = 59.4 + hh(i) * 0.6, k = Math.max(0, t - t0), x = STOP_X - 12 + i * 2.6 + hh(i, 3) * 1.5, z = 8 + k * 1.3 + (i % 3) * 1.4;
        walk(out, cam, t, 80 + i, i % 5 === 2 ? KID : FOLKS[(i + 4) % 14], i % 5 === 2 ? "kid" : `m${(i + 4) % 14}`, x, z, 0, 1, (["relief", "smile", "relief_open", "dazed"] as Expr[])[i % 4], ph(80 + i), i % 5 === 2 ? 0.72 : 1);
      }
      stand(out, cam, t, 5, CAPTAIN, "cap", STOP_X - 4, 12.5, "relief");
    }
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
  private skyClouds: { m: THREE.Mesh; site: number }[] = [];
  private puffs: { m: THREE.Mesh; x0: number; z: number; o: number }[] = [];
  private sea: THREE.Mesh; private seaMat: THREE.MeshBasicMaterial;
  private plane: Plane;
  private trails: THREE.Mesh[] = [];
  private screens: { m: THREE.MeshBasicMaterial; lit: THREE.Color }[] = [];
  private buttons: { m: THREE.MeshBasicMaterial; lit: THREE.Color }[] = [];
  private karts: THREE.Group[] = [];
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

    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: grassHD() }));
    const conc = lam("apron", () => ({ map: stoneHD("apronHD", ["#cfcbc2", "#c6c1b7", "#d6d2c9", "#bfbab0"], "#a39d92") }));
    const asph = lam("asphalt", () => ({ color: "#5d6068" }));
    const white = lam("whiteStripe", () => ({ color: "#f2f0ea" }));
    // ground layers stack a few cm apart: polygon offsets keep them from depth-fighting at distance (QA pops)
    const pOff = (m: THREE.Material, k: number) => { m.polygonOffset = true; m.polygonOffsetFactor = k; m.polygonOffsetUnits = k; return m; };
    pOff(grass, 6); pOff(conc, 1.5); pOff(asph, 1.5);
    for (let gi = -5; gi < 5; gi++) for (let gj = -5; gj < 5; gj++) b.add(quadUp(gi * 1200, gi * 1200 + 1200, gj * 1200, gj * 1200 + 1200, 0, 240, 240), grass);
    // ---- airport ----
    b.add(quadUp(-700, 700, -100, -56, 0.05, 1, 1), asph);
    for (let x = -680; x < 680; x += 30) b.add(quadUp(x, x + 14, -78.6, -77.4, 0.07, 1, 1), white);
    b.add(quadUp(-140, 140, -56, 40, 0.06, 40, 14), conc);
    const term = lam("terminalGlass", () => ({ map: repeatTex(glassTex("terminal", "#6f9fd0", "#cfe4f6")) }));
    const tg = new THREE.PlaneGeometry(150, 14).translate(0, 7, 40); const tuv = tg.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < tuv.count; i++) tuv.setXY(i, tuv.getX(i) * 150 / 4.5, tuv.getY(i) * 14 / 3.4);
    tg.rotateY(0); b.add(tg, term);
    b.add(boxGeo(V(-75, 0, 40.05), V(75, 14, 64)), lam("termBack", () => ({ color: "#d8d2c4" })));
    b.add(boxGeo(V(-76, 14, 39), V(76, 15.2, 65)), lam("termRoof", () => ({ color: "#ece6d8" })));
    b.add(new THREE.CylinderGeometry(3, 3.6, 30, 16).translate(98, 15, 58), lam("towerStem", () => ({ color: "#ece6d8" })));
    b.add(new THREE.CylinderGeometry(6, 5, 5, 16).translate(98, 32.5, 58), lam("towerCab", () => ({ color: "#3b5a7a" })));
    b.add(new THREE.CylinderGeometry(6.6, 6.6, 0.8, 16).translate(98, 35.4, 58), lam("termRoof", () => ({ color: "#ece6d8" })));
    for (const x of [-30, 0, 30]) b.add(new THREE.CylinderGeometry(0.12, 0.12, 12, 8).translate(x, 6, 34), lam("pole", () => ({ color: "#d9dde3" })));
    for (let i = 0; i < 12; i++) addVeg(b, "round", -140 + i * 25, 0, 80 + hh(i) * 10, 7, i * 3 + 1, 1);
    // fuel truck by the right wing
    const truck = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 6.2, 20).rotateZ(Math.PI / 2), lam("tankW", () => ({ color: "#f4f1ea" }))); tank.position.set(-1.5, 2.0, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.4), lam("truckRed", () => ({ color: "#d2453a" }))); cab.position.set(2.9, 1.65, 0);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 2.0), lam("carGlass", () => ({ color: "#304a6e" }))); win.position.set(4.02, 2.3, 0);
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(9, 0.5, 2.3), lam("chassis", () => ({ color: "#3b3f52" }))); chassis.position.set(-0.3, 0.75, 0);
    truck.add(tank, cab, win, chassis);
    for (const x of [-3.4, -1.6, 2.9]) for (const z of [-1.1, 1.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16).rotateX(Math.PI / 2), lam("tyre", () => ({ color: "#26252b" }))); w.position.set(x, 0.5, z); truck.add(w); }
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.5, 8), lam("hose", () => ({ color: "#26252b" }))); hose.position.set(-1.2, 3.4, -1.4); hose.rotation.set(0.9, 0, 0.3); truck.add(hose);
    truck.position.set(-3.0, 0.06, 13.8); truck.rotation.y = 0.15;
    truck.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    R.add(truck);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), lam("flagCa", () => ({ map: flagTex(), side: THREE.DoubleSide })));
    flag.position.set(1.7, 11, 34); R.add(flag);

    // ---- kitchen ----
    const [kx, , kz] = KITCHEN;
    b.add(quadUp(kx - 6, kx + 6, kz - 4, kz + 6, 0.08, 6, 5), lam("kFloor", () => ({ color: "#c9a57a" })));
    const tiles = lam("kTiles", () => ({ map: rep(tileTex(), 8, 4) }));
    b.add(new THREE.PlaneGeometry(12, 3.2).translate(kx, 1.6, kz - 1.6), tiles);
    b.add(boxGeo(V(kx - 2.5, 0, kz - 0.4), V(kx + 2.5, 0.92, kz + 0.45)), lam("kCab", () => ({ color: "#5a8fc2" })));
    b.add(boxGeo(V(kx - 2.6, 0.92, kz - 0.45), V(kx + 2.6, 0.98, kz + 0.5)), lam("kTop", () => ({ color: "#d9b98a" })));
    b.add(new THREE.SphereGeometry(0.26, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).translate(kx + 0.15, 1.24, kz + 0.1), lam("bowl", () => ({ color: "#e8c45a", side: THREE.DoubleSide })));
    b.add(boxGeo(V(kx - 1.2, 0.98, kz - 0.2), V(kx - 0.9, 1.4, kz + 0.05)), lam("flourBag", () => ({ color: "#efe3c8" })));
    b.add(boxGeo(V(kx + 0.9, 1.7, kz - 1.58), V(kx + 2.3, 2.7, kz - 1.55)), lam("kWindow", () => ({ color: "#a8d0f0" })));

    // ---- cruise: sea of clouds ----
    this.seaMat = new THREE.MeshBasicMaterial({ map: repeatTex(rep(cloudSeaTex(), 10, 10)), fog: true });
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2), this.seaMat);
    this.sea.position.set(ALT[0], ALT[1] - 170, ALT[2]); this.sea.layers.set(NOINK); R.add(this.sea);
    // puffs: a low layer on the sea + a few towering heads far out; they scroll with x and fade out well before
    // they wrap (span 4000 m, fade over the outer 600 m each side), so nothing pops in the visible area
    for (let i = 0; i < 150; i++) {
      const tall = i % 6 === 0;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], transparent: true, depthWrite: false, fog: true }));
      const w = tall ? 260 + hh(i) * 260 : 70 + hh(i) * 170; m.scale.set(w, w * (tall ? 0.62 : 0.5), 1); m.layers.set(NOINK);
      let z = (hh(i, 2) - 0.5) * 3200; if (tall && Math.abs(z) < 600) z = Math.sign(z || 1) * (600 + Math.abs(z));
      this.puffs.push({ m, x0: (hh(i, 3) - 0.5) * 4000, z, o: 0.85 + 0.15 * hh(i, 4) });
      m.position.y = ALT[1] - 168 + w * (tall ? 0.28 : 0.2) + hh(i, 5) * 12; m.renderOrder = -0.5; R.add(m);
    }
    // painted clouds in the sky ring around the two ground sites (were: empty gradient skies)
    for (let i = 0; i < 40; i++) {
      const site = i % 2 ? GIMLI[0] : 0, a = hh(i, 41) * Math.PI * 2, rad = 700 + hh(i, 42) * 400, w = 160 + hh(i, 43) * 220;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], transparent: true, depthWrite: false, fog: false }));
      m.scale.set(w, w * 0.45, 1); m.position.set(site + Math.cos(a) * rad, 90 + hh(i, 44) * 160, Math.sin(a) * rad); m.layers.set(NOINK); m.renderOrder = -0.8;
      this.skyClouds.push({ m, site }); R.add(m);
    }
    // contrails (two soft white tubes behind the engines)
    const trailM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.05, 1.05, 1.08), transparent: true, opacity: 0.75, depthWrite: false, fog: true });
    for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.6, 1, 12, 1, true).rotateZ(Math.PI / 2).translate(-0.5, 0, 0), trailM); m.layers.set(NOINK); m.frustumCulled = false; this.trails.push(m); R.add(m); }

    // ---- cockpit set ----
    const [cx, cy, cz] = CK;
    const cab2 = lam("cockpitWall", () => ({ color: "#8a8680" })), panelM = lam("cockpitPanelHD", () => ({ map: panelTex() })), seatM = lam("seat", () => ({ color: "#2b2f38" }));
    b.add(boxGeo(V(cx - 2.5, cy - 0.05, cz - 1.5), V(cx + 1.8, cy, cz + 1.5)), lam("cockpitFloor", () => ({ color: "#3b3f52" })));
    b.add(boxGeo(V(cx - 2.5, cy + 2.2, cz - 1.5), V(cx + 1.8, cy + 2.3, cz + 1.5)), cab2);
    for (const s of [-1, 1]) {
      b.add(boxGeo(V(cx - 2.5, cy, s < 0 ? cz - 1.55 : cz + 1.45), V(cx + 0.6, cy + 2.2, s < 0 ? cz - 1.45 : cz + 1.55)), cab2);
      b.add(boxGeo(V(cx + 0.6, cy, s < 0 ? cz - 1.55 : cz + 1.45), V(cx + 1.8, cy + 1.05, s < 0 ? cz - 1.45 : cz + 1.55)), cab2);
      b.add(boxGeo(V(cx - 0.45, cy, cz + s * 0.55 - 0.32), V(cx - 0.1, cy + 1.05, cz + s * 0.55 + 0.32)), seatM);
    }
    // windscreen frame: sill, header, centre post, side posts (openings left open)
    b.add(boxGeo(V(cx + 1.55, cy + 1.05, cz - 1.5), V(cx + 1.8, cy + 1.12, cz + 1.5)), cab2);
    b.add(boxGeo(V(cx + 1.3, cy + 1.85, cz - 1.5), V(cx + 1.8, cy + 2.2, cz + 1.5)), cab2);
    b.add(boxGeo(V(cx + 1.55, cy + 1.05, cz - 0.09), V(cx + 1.7, cy + 1.9, cz + 0.09)), cab2);
    for (const s of [-1, 1]) b.add(boxGeo(V(cx + 1.4, cy + 1.05, s < 0 ? cz - 1.5 : cz + 1.25), V(cx + 1.7, cy + 1.9, s < 0 ? cz - 1.25 : cz + 1.5)), cab2);
    // instrument panel + glareshield
    b.add(boxGeo(V(cx + 0.95, cy, cz - 1.3), V(cx + 1.55, cy + 1.0, cz + 1.3)), panelM);
    b.add(boxGeo(V(cx + 0.95, cy + 1.0, cz - 1.3), V(cx + 1.35, cy + 1.08, cz + 1.3)), lam("glare", () => ({ color: "#1d2028" })));
    b.add(boxGeo(V(cx + 0.2, cy, cz - 0.22), V(cx + 0.95, cy + 0.72, cz + 0.22)), panelM); // centre pedestal
    const scrPos: [number, number][] = [[-0.95, 0], [-0.6, 1], [0.6, 0], [0.95, 1], [-0.12, 1], [0.12, 0]];
    scrPos.forEach(([z, k]) => {
      const m = new THREE.MeshBasicMaterial({ map: screenTex(k), color: new THREE.Color(1.6, 1.6, 1.6) });
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28).rotateY(-Math.PI / 2), m); p.position.set(cx + 0.94, cy + 0.72, cz + z); p.layers.set(NOINK); R.add(p);
      this.screens.push({ m, lit: new THREE.Color(1.6, 1.6, 1.6) });
    });

    // ---- Gimli: old runway turned racetrack, campers, lake ----
    const [gx] = GIMLI;
    b.add(quadUp(gx - 700, gx + 700, -22, 22, 0.06, 1400 / 120, 1), pOff(lam("gimliRunway", () => ({ map: repeatTex(runwayTex()) })), 1.5));
    b.add(quadUp(gx + 300, gx + 304, -22, 22, 0.08, 1, 6), lam("chequer", () => ({ map: rep(startLineTex(), 1, 1) })));
    b.add(quadUp(gx - 6000, gx + 6000, -6000, -320, 0.1, 1, 1), lam("lake", () => ({ color: "#3f86c4" })));
    const tyreM = lam("tyreStack", () => ({ color: "#26252b" })), coneM = lam("cone", () => ({ color: "#f07a2c" }));
    for (let x = gx + 240, n = 0; x < gx + 520; x += 2.2, n++) for (const z of [-24.5, 24.5]) { // red/white tyre wall; gap in front of the shot-11 camera
      if (z > 0 && x > gx + 326 && x < gx + 348) continue;
      b.add(new THREE.CylinderGeometry(0.5, 0.5, 0.9, 12).translate(x, 0.45, z), n % 2 ? tyreM : lam("tyreWhite", () => ({ color: "#f1ede4" })));
    }
    for (let i = 0; i < 16; i++) b.add(new THREE.ConeGeometry(0.25, 0.7, 10).translate(gx + 280 + i * 12, 0.4, (i % 2 ? 1 : -1) * 2), coneM);
    const tentCols = ["#d2453a", "#3f6fb5", "#f3c63a", "#5d7a3a", "#f07a2c"];
    for (let i = 0; i < 12; i++) b.add(new THREE.ConeGeometry(2.0, 2.4, 4).rotateY(Math.PI / 4).translate(gx + 250 + i * 18 + hh(i) * 6, 1.2, 44 + hh(i, 4) * 14), lam("tent" + (i % 5), () => ({ color: tentCols[i % 5] })));
    for (let i = 0; i < 7; i++) {
      const x = gx + 260 + i * 30, z = 64 + hh(i, 6) * 8;
      b.add(boxGeo(V(x - 3.5, 0.5, z - 1.2), V(x + 3.5, 3.1, z + 1.2)), lam("camper", () => ({ color: "#f4f1ea" })));
      b.add(boxGeo(V(x - 3.52, 1.5, z - 1.22), V(x + 3.52, 1.9, z + 1.22)), lam("camperStripe", () => ({ color: tentCols[(i + 2) % 5] })));
    }
    for (let i = 0; i < 10; i++) { const x = gx + 230 + i * 24, z = 36 + (i % 2) * 2; b.add(boxGeo(V(x - 2, 0.3, z - 0.9), V(x + 2, 1.2, z + 0.9)), lam("car" + (i % 4), () => ({ color: ["#3f6fb5", "#d2453a", "#e8c45a", "#2f6a43"][i % 4] }))); b.add(boxGeo(V(x - 1.1, 1.2, z - 0.8), V(x + 0.9, 1.75, z + 0.8)), lam("carGlass", () => ({ color: "#304a6e" }))); }
    b.add(boxGeo(V(gx + 120, 0, 60), V(gx + 180, 14, 90)), lam("hangar", () => ({ color: "#9aa3ae" })));
    for (let i = 0; i < 30; i++) addVeg(b, i % 3 ? "round" : "tall", gx - 400 + i * 40 + hh(i) * 10, 0, 110 + hh(i, 9) * 60, 7 + hh(i, 3) * 5, i * 11 + 3, 2);
    for (let i = 0; i < 20; i++) addVeg(b, "round", gx - 600 + i * 60, 0, -120 - hh(i, 5) * 80, 8, i * 17 + 2, 2);
    this.dressing(b);
    b.build(R);

    // go-karts
    for (let i = 0; i < KART_N; i++) {
      const kg = new THREE.Group();
      const ch = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 1.1), lam("kart" + (i % 3), () => ({ color: ["#e2453c", "#3f6fb5", "#f3c63a"][i % 3] }))); ch.position.y = 0.25;
      const nose2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.0), lam("kart" + (i % 3), () => ({ color: ["#e2453c", "#3f6fb5", "#f3c63a"][i % 3] }))); nose2.position.set(0.95, 0.3, 0);
      kg.add(ch, nose2);
      for (const [x, z] of [[0.7, 0.6], [0.7, -0.6], [-0.7, 0.62], [-0.7, -0.62]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 12).rotateX(Math.PI / 2), lam("tyre", () => ({ color: "#26252b" }))); w.position.set(x, 0.17, z); kg.add(w); }
      kg.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.karts.push(kg); R.add(kg);
    }
    this.plane = buildPlane(); R.add(this.plane.group);
  }

  private glowIM(geo: THREE.BufferGeometry, mat: THREE.Material, ms: THREE.Matrix4[]) {
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, ms.length));
    ms.forEach((m, i) => im.setMatrixAt(i, m));
    im.count = ms.length; im.layers.set(NOINK); im.frustumCulled = false; this.root.add(im);
    return im;
  }

  /** look-match pass: painted fields, roads, villages, apron clutter, campsite dressing, kitchen clutter, lit cockpit */
  private dressing(b: Batch) {
    const [gx] = GIMLI, [kx, , kz] = KITCHEN, [cx, cy, cz] = CK;
    const bulbs: THREE.Matrix4[] = [], lamps: THREE.Matrix4[] = [], wins: THREE.Matrix4[] = [];
    // ---- patchwork fields with hedgerows (both sites), roads ----
    const cropM = CROPS.map((_, k) => { const m = lam("cropHD" + k, () => ({ map: cropTex(k) })); m.polygonOffset = true; m.polygonOffsetFactor = 3; m.polygonOffsetUnits = 3; return m; });
    const fields = (cx0: number, keep: [number, number, number, number][], lakeZ: number, seed: number) => {
      let i = 0;
      for (let x = cx0 - 1500; x < cx0 + 1500; i++) {
        const w = 90 + hh(i, seed) * 70; let j = 0;
        for (let z = -1500; z < 1500; j++) {
          const d = 70 + hh(i * 31 + j, seed + 1) * 60, x0 = x + 2.5, x1 = x + w - 2.5;
          let z0 = z + 2.5, z1 = z + d - 2.5, skip = z0 < lakeZ;
          z += d;
          for (const [a, b2, c, e] of keep) { // clip the field against keep-out rects (cut its z range when the rect spans it)
            if (skip || !(x1 > a && x0 < b2 && z1 > c && z0 < e)) continue;
            if (a <= x0 && b2 >= x1 && c <= z0) z0 = e + 2.5; else if (a <= x0 && b2 >= x1 && e >= z1) z1 = c - 2.5; else skip = true;
          }
          if (skip || z1 - z0 < 15) continue;
          const k = hh(i * 17 + j * 5, seed + 2);
          if (k < 0.12) continue; // plain meadow
          b.add(quadUp(x0, x1, z0, z1, 0.03, (x1 - x0) / 48, (z1 - z0) / 48), cropM[Math.floor(k * 6.99) % 6]);
          const near = Math.abs(x0 - cx0) < 800 && Math.abs(z0) < 700;
          if (near && hh(i * 7 + j, seed + 3) < 0.28) for (let tx = x0 + 4; tx < x1; tx += 11 + hh(tx | 0, 4) * 8) // hedgerow trees
            addVeg(b, hh(tx | 0, 6) < 0.7 ? "round" : "tall", tx, 0, z1 + 2.5, 6 + hh(tx | 0, 5) * 5, (tx | 0) + seed, 2);
        }
        x += w;
      }
    };
    fields(0, [[-1040, -960, -40, 40], [-1600, 1600, -140, -40], [-180, 180, -60, 112]], -9999, 3);
    fields(gx, [[gx - 1600, gx + 1600, -40, 40], [gx + 90, gx + 660, 22, 165], [gx - 380, gx + 200, -160, -22]], -320, 9);
    const road = lam("roadAsph", () => ({ color: "#6e6c72", polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 1.5 })), dash = lam("whiteStripe", () => ({ color: "#f2f0ea" }));
    const roadX = (x0: number, x1: number, z: number, wd: number) => {
      b.add(quadUp(x0, x1, z - wd / 2, z + wd / 2, 0.045, 1, 1), road);
      for (let x = x0; x < x1; x += 12) b.add(quadUp(x, x + 5, z - 0.12, z + 0.12, 0.05, 1, 1), dash);
    };
    roadX(-1600, 1600, -132, 7); roadX(-1600, 1600, 118, 7); roadX(gx - 1600, gx + 1600, 172, 7); roadX(gx - 1600, gx + 1600, -170, 7);

    // ---- airport: apron markings, terminal detail, light masts, baggage train, stairs, vans, hangars ----
    const yel = lam("taxiYellow", () => ({ color: "#f3c63a" }));
    for (const z of [-30, 31]) b.add(quadUp(-140, 140, z - 0.25, z + 0.25, 0.065, 1, 1), yel);
    for (let x = -120; x <= 120; x += 40) b.add(quadUp(x - 0.25, x + 0.25, -30, 31, 0.064, 1, 1), yel);
    const termM = lam("termTrim", () => ({ color: "#ece6d8" })), band = lam("termBand", () => ({ color: "#2f6a8a" }));
    b.add(boxGeo(V(-77, 13.4, 33), V(77, 14.2, 40)), termM);                     // canopy
    b.add(boxGeo(V(-75, 11.6, 39.6), V(75, 13.4, 40.2)), band);                  // fascia band
    for (let x = -72; x <= 72; x += 7.5) b.add(new THREE.CylinderGeometry(0.35, 0.35, 13.4, 10).translate(x, 6.7, 34.2), termM);
    for (let x = -74; x <= 74; x += 4.5) b.add(boxGeo(V(x - 0.08, 0, 39.85), V(x + 0.08, 11.6, 40.0)), lam("mullion", () => ({ color: "#d9dde3" })));
    for (const x of [-120, -60, 60, 120]) for (const z of [-50, 30]) {
      b.add(new THREE.CylinderGeometry(0.25, 0.35, 18, 8).translate(x, 9, z), lam("pole", () => ({ color: "#d9dde3" })));
      b.add(boxGeo(V(x - 1.4, 18, z - 0.5), V(x + 1.4, 18.8, z + 0.5)), lam("glare", () => ({ color: "#1d2028" })));
      lamps.push(TM(x, 17.95, z, 2.6, 0.1, 0.9));
    }
    const cartCols = ["#3f6fb5", "#d2453a", "#5d7a3a", "#e8c45a", "#7b5ac9", "#b5653f"];
    for (let i = 0; i < 4; i++) { // baggage train
      const x = 26 + i * 3.2, z = 22;
      b.add(boxGeo(V(x - 1.3, 0.35, z - 0.8), V(x + 1.3, 0.55, z + 0.8)), lam("chassis", () => ({ color: "#3b3f52" })));
      for (let k = 0; k < 4; k++) b.add(boxGeo(V(x - 1.1 + (k % 2) * 1.15, 0.55, z - 0.6 + (k >> 1) * 0.65), V(x - 0.15 + (k % 2) * 1.15, 1.0 + hh(i * 4 + k) * 0.35, z - 0.05 + (k >> 1) * 0.65)), lam("bag" + ((i + k) % 6), () => ({ color: cartCols[(i + k) % 6] })));
      for (const [wx, wz] of [[-0.9, -0.8], [0.9, -0.8], [-0.9, 0.8], [0.9, 0.8]]) b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 10).rotateX(Math.PI / 2).translate(x + wx, 0.22, z + wz), lam("tyre", () => ({ color: "#26252b" })));
    }
    b.add(boxGeo(V(21, 0.2, 21.2), V(24, 1.4, 22.8)), lam("tugYellow", () => ({ color: "#f3c63a" })));
    b.add(boxGeo(V(21.3, 1.4, 21.4), V(22.4, 2.2, 22.6)), lam("carGlass", () => ({ color: "#304a6e" })));
    // stairs truck
    b.add(boxGeo(V(28, 0.4, -16), V(36, 1.2, -13.6)), lam("chassis", () => ({ color: "#3b3f52" })));
    b.add(boxGeo(V(34, 1.2, -16), V(36.5, 3.2, -13.6)), lam("truckRed", () => ({ color: "#d2453a" })));
    for (let k = 0; k < 10; k++) b.add(boxGeo(V(28 + k * 0.6, 1.2 + k * 0.45, -15.8), V(28.6 + k * 0.6, 1.35 + k * 0.45, -13.8)), lam("stairs", () => ({ color: "#e8e4da" })));
    for (const [x, z] of [[18, 10], [18, -8], [-22, 10], [-22, -8], [45, 4], [-45, 4]]) b.add(new THREE.ConeGeometry(0.25, 0.7, 10).translate(x, 0.4, z), lam("cone", () => ({ color: "#f07a2c" })));
    for (let i = 0; i < 4; i++) { const x = 52 + i * 7; // service vans by the terminal
      b.add(boxGeo(V(x - 2.4, 0.4, 31), V(x + 2.4, 2.6, 33.2)), lam("van" + (i % 3), () => ({ color: ["#f4f1ea", "#f3c63a", "#3f6fb5"][i % 3] })));
      b.add(boxGeo(V(x + 1.6, 1.5, 30.95), V(x + 2.3, 2.3, 33.25)), lam("carGlass", () => ({ color: "#304a6e" })));
    }
    const corr = lam("hangarCorr", () => ({ map: corrugTex("#a9b2bc") }));
    for (const [x, z, w] of [[-300, 70, 60], [-220, 75, 50], [220, 70, 55]] as const) {
      const g2 = boxGeo(V(x - w / 2, 0, z), V(x + w / 2, 16, z + 36), 8); b.add(g2, corr);
      b.add(boxGeo(V(x - w / 2 - 0.5, 16, z - 0.5), V(x + w / 2 + 0.5, 17.2, z + 36.5)), lam("hangarRoof", () => ({ color: "#7a5a4a" })));
      b.add(boxGeo(V(x - w / 2 + 4, 0, z - 0.1), V(x + w / 2 - 4, 12, z + 0.05)), lam("hangarDoor", () => ({ color: "#5d6474" })));
    }

    // ---- kitchen clutter (all within the narrow 9:16 view of the back wall) ----
    const zW = kz - 1.6, blue = lam("kCab", () => ({ color: "#5a8fc2" })), blueL = lam("kCabL", () => ({ color: "#78a8d6" })), knob = lam("brass", () => ({ color: "#d9a441" }));
    b.add(boxGeo(V(kx - 2.4, 2.25, zW), V(kx + 0.6, 3.1, zW + 0.36)), blue);                                       // wall cabinet
    for (let x = kx - 2.35; x < kx + 0.5; x += 0.73) { b.add(boxGeo(V(x + 0.03, 2.3, zW + 0.36), V(x + 0.68, 3.05, zW + 0.39)), blueL); b.add(boxGeo(V(x + 0.55, 2.35, zW + 0.39), V(x + 0.6, 2.45, zW + 0.42)), knob); }
    b.add(boxGeo(V(kx - 1.5, 1.82, zW), V(kx + 0.55, 1.86, zW + 0.24)), lam("shelfWood", () => ({ color: "#b07a4a" })));      // open shelf
    const jarC = ["#e8c45a", "#d2453a", "#f4f1ea", "#7fb069", "#c9862f", "#f3a9bb", "#3f6fb5"];
    for (let i = 0; i < 8; i++) {
      const x = kx - 1.38 + i * 0.25, h = 0.14 + hh(i, 8) * 0.12, r0 = 0.06 + hh(i, 9) * 0.03;
      b.add(new THREE.CylinderGeometry(r0, r0, h, 14).translate(x, 1.86 + h / 2, zW + 0.12), lam("jar" + (i % 7), () => ({ color: jarC[i % 7] })));
      b.add(new THREE.CylinderGeometry(r0 * 0.9, r0 * 0.9, 0.03, 14).translate(x, 1.86 + h + 0.015, zW + 0.12), lam("jarLid", () => ({ color: "#5a3b2a" })));
    }
    b.add(new THREE.CylinderGeometry(0.012, 0.012, 1.3, 6).rotateZ(Math.PI / 2).translate(kx - 0.75, 1.6, zW + 0.05), knob);      // utensil rail
    for (let i = 0; i < 4; i++) { const x = kx - 1.25 + i * 0.32; // hanging pans / ladles
      b.add(new THREE.CylinderGeometry(0.11 - (i % 2) * 0.04, 0.11 - (i % 2) * 0.04, 0.025, 18).rotateX(Math.PI / 2).translate(x, 1.36, zW + 0.06), lam("pan" + (i % 2), () => ({ color: i % 2 ? "#c9cdd4" : "#b8684a" })));
      b.add(boxGeo(V(x - 0.012, 1.46, zW + 0.04), V(x + 0.012, 1.6, zW + 0.07)), lam("pan1", () => ({ color: "#c9cdd4" })));
    }
    // window: frame, glowing sky glass, checked curtains, pot plant on the sill
    const frm = lam("winFrame", () => ({ color: "#f4f1ea" })), curt = lam("curtain", () => ({ map: curtainTex(), side: THREE.DoubleSide }));
    for (const [x0, x1, y0, y1] of [[0.85, 2.35, 1.65, 1.72], [0.85, 2.35, 2.68, 2.75], [0.85, 0.92, 1.65, 2.75], [2.28, 2.35, 1.65, 2.75], [1.57, 1.63, 1.65, 2.75]])
      b.add(boxGeo(V(kx + x0, y0, zW + 0.03), V(kx + x1, y1, zW + 0.08)), frm);
    b.add(boxGeo(V(kx + 0.8, 1.6, zW), V(kx + 2.4, 1.66, zW + 0.2)), frm);
    for (const x of [0.62, 2.4]) b.add(new THREE.PlaneGeometry(0.42, 1.25).translate(kx + x, 2.15, zW + 0.12), curt);
    b.add(new THREE.CylinderGeometry(0.09, 0.07, 0.16, 12).translate(kx + 1.2, 1.74, zW + 0.1), lam("terracotta", () => ({ color: "#c2663f" })));
    addVeg(b, "bush", kx + 1.2, 1.8, zW + 0.1, 0.3, 77, 0);
    const winGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), glowMat("#cfe6ff", 1.35)); winGlow.position.set(kx + 1.6, 2.2, zW + 0.035); winGlow.layers.set(NOINK); this.root.add(winGlow);
    // counter: drawer fronts + handles, back-row clutter
    for (let x = kx - 2.4; x < kx + 2.4; x += 0.8) { b.add(boxGeo(V(x + 0.04, 0.1, kz + 0.45), V(x + 0.76, 0.86, kz + 0.48)), blueL); b.add(boxGeo(V(x + 0.3, 0.74, kz + 0.48), V(x + 0.5, 0.77, kz + 0.51)), knob); }
    const top = 0.98, back = kz - 0.28;
    for (let i = 0; i < 3; i++) b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.3 - i * 0.06, 16).translate(kx - 1.7 + i * 0.22, top + (0.3 - i * 0.06) / 2, back), lam("canister", () => ({ color: "#e2453c" })));
    b.add(new THREE.SphereGeometry(0.13, 18, 12).scale(1, 0.85, 1).translate(kx + 1.0, top + 0.11, back), lam("kettle", () => ({ color: "#7fb069" })));
    b.add(boxGeo(V(kx + 1.3, top, back - 0.12), V(kx + 1.75, top + 0.03, back + 0.12)), lam("shelfWood", () => ({ color: "#b07a4a" })));          // chopping board
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10).rotateZ(Math.PI / 2).translate(kx - 0.5, top + 0.035, kz + 0.32), lam("rollingPin", () => ({ color: "#e2c49a" })));
    for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.035, 10, 8).scale(1, 1.3, 1).translate(kx + 0.7 + (i % 3) * 0.08, top + 0.045, kz + 0.25 + (i >> 1 & 1) * 0.07), lam("egg", () => ({ color: "#f4ead8" })));
    for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.13, 0.12, 0.02, 20).translate(kx - 1.15, top + 0.01 + i * 0.022, back + 0.05), lam("plate", () => ({ color: "#f4f1ea" })));
    // pendant lamp over the counter (glows, blooms)
    b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.8, 6).translate(kx + 0.2, 3.1, kz + 0.2), lam("glare", () => ({ color: "#1d2028" })));
    b.add(new THREE.ConeGeometry(0.2, 0.18, 20, 1, true).translate(kx + 0.2, 2.65, kz + 0.2), lam("lampShade", () => ({ color: "#e2453c", side: THREE.DoubleSide })));
    const bulbK = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glowMat("#ffd9a0", 3)); bulbK.position.set(kx + 0.2, 2.57, kz + 0.2); bulbK.layers.set(NOINK); this.root.add(bulbK);

    // ---- cockpit: painted panels + lit buttons (dim with the screens) ----
    const btnCols = ["#7dff9a", "#ffc24a", "#ffffff", "#6fd8ff", "#7dff9a", "#ff5a4a"];
    const btn: THREE.Matrix4[][] = btnCols.map(() => []);
    for (let z = -1.2; z <= 1.2; z += 0.075) btn[Math.floor(hh(z * 100 | 0, 3) * 6)].push(TM(cx + 0.948, cy + 1.04, cz + z, 0.006, 0.025, 0.045));                           // glareshield
    for (let row = 0; row < 4; row++) for (let z = -1.2; z <= 1.2; z += 0.09) { if (Math.abs(z) < 0.25 && row > 1) continue;
      btn[Math.floor(hh((z * 100 | 0) + row * 97, 5) * 6)].push(TM(cx + 0.948, cy + 0.3 + row * 0.08, cz + z, 0.006, 0.03, 0.04)); }                                       // panel rows
    for (let i = 0; i < 18; i++) btn[i % 6].push(TM(cx + 0.3 + (i % 6) * 0.11, cy + 0.725, cz - 0.15 + Math.floor(i / 6) * 0.15, 0.05, 0.008, 0.035));                          // pedestal
    const bg = new THREE.BoxGeometry(1, 1, 1);
    btnCols.forEach((c, i) => { const m = glowMat(c, 2.2); this.buttons.push({ m, lit: m.color.clone() }); this.glowIM(bg, m, btn[i]); });

    // ---- Gimli: town rows, lakeside village, more campers + awnings, bunting with bulbs, flags, lamp posts ----
    for (let i = 0, x = gx + 110; x < gx + 640; i++) { // town facing the racetrack (front to -z)
      const w = 9, h = i % 3 === 1 ? 8.4 : 5.6; house(b, x, 140 + hh(i, 12) * 6, Math.PI, w, 8, h, [0, 1, 4][i % 3], 0); x += w + 4 + hh(i, 13) * 4;
      if (i % 2) addVeg(b, "round", x - 2, 0, 128 + hh(i, 14) * 4, 6 + hh(i, 15) * 3, i * 13 + 5, 1);
    }
    for (let i = 0, x = gx - 370; x < gx + 190; i++) { // lakeside village (front to +z, seen behind the landing)
      const w = 9, h = i % 3 === 2 ? 8.4 : 5.6; house(b, x, -112 - hh(i, 16) * 8, 0, w, 8, h, [1, 4, 0][i % 3], 0); x += w + 5 + hh(i, 17) * 5;
      if (i % 2 === 0) addVeg(b, i % 4 ? "round" : "tall", x - 2.5, 0, -100 - hh(i, 18) * 4, 6 + hh(i, 19) * 4, i * 7 + 9, 1);
    }
    const tentCols = ["#d2453a", "#3f6fb5", "#f3c63a", "#5d7a3a", "#f07a2c"];
    const camper = (x: number, z: number, i: number, face: 1 | -1) => {
      b.add(boxGeo(V(x - 3.5, 0.5, z - 1.2), V(x + 3.5, 3.1, z + 1.2)), lam("camper", () => ({ color: "#f4f1ea" })));
      b.add(boxGeo(V(x - 3.52, 1.5, z - 1.22), V(x + 3.52, 1.9, z + 1.22)), lam("camperStripe", () => ({ color: tentCols[(i + 2) % 5] })));
      b.add(boxGeo(V(x - 3.3, 3.1, z - 1.0), V(x + 3.3, 3.35, z + 1.0)), lam("camperRoof", () => ({ color: "#d9d4c8" })));
      for (const wx of [-2.2, 1.6]) wins.push(TM(x + wx, 2.35, z + face * 1.23, 1.1, 0.6, 1, 0));
      const aw = lam("awning" + (i % 5), () => ({ map: awningTex(tentCols[i % 5]), side: THREE.DoubleSide }));
      const zf = z + face * 1.2, zo = z + face * 3.4;
      b.add(quadUp(x - 2.8, x + 1.0, Math.min(zf, zo), Math.max(zf, zo), 0, 3, 1).translate(0, 3.0, 0).applyMatrix4(new THREE.Matrix4()), aw);
      for (const px of [-2.7, 0.9]) b.add(new THREE.CylinderGeometry(0.04, 0.04, 3.0, 6).translate(x + px, 1.5, zo), lam("pole", () => ({ color: "#d9dde3" })));
      for (const [wx, wz] of [[-2.2, -1.1], [-2.2, 1.1], [2.2, -1.1], [2.2, 1.1]]) b.add(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 14).rotateX(Math.PI / 2).translate(x + wx, 0.45, z + wz), lam("tyre", () => ({ color: "#26252b" })));
    };
    for (let i = 0; i < 9; i++) camper(gx + 235 + i * 36 + hh(i, 21) * 8, 84 + hh(i, 22) * 6, i + 3, -1);
    for (let i = 0; i < 8; i++) camper(gx - 330 + i * 52 + hh(i, 23) * 10, -52 - hh(i, 24) * 8, i, 1);
    for (let i = 0; i < 14; i++) b.add(new THREE.ConeGeometry(2.0, 2.4, 4).rotateY(Math.PI / 4).translate(gx - 340 + i * 33 + hh(i, 25) * 10, 1.2, -36 - hh(i, 26) * 6), lam("tent" + (i % 5), () => ({ color: tentCols[i % 5] })));
    for (let i = 0; i < 10; i++) { const x = gx - 320 + i * 44, z = -66 - (i % 2) * 2; b.add(boxGeo(V(x - 2, 0.3, z - 0.9), V(x + 2, 1.2, z + 0.9)), lam("car" + (i % 4), () => ({ color: ["#3f6fb5", "#d2453a", "#e8c45a", "#2f6a43"][i % 4] }))); b.add(boxGeo(V(x - 1.1, 1.2, z - 0.8), V(x + 0.9, 1.75, z + 0.8)), lam("carGlass", () => ({ color: "#304a6e" }))); }
    // bunting: poles + sagging lines of pennants + warm bulbs
    const penGeo = new THREE.BufferGeometry(); penGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.45, 0], 3)); penGeo.computeVertexNormals();
    penGeo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2));
    const penM = tentCols.map((c) => lam("pennant" + c, () => ({ color: c, side: THREE.DoubleSide })));
    const bunting = (x0: number, x1: number, z: number, step: number) => {
      for (let x = x0; x <= x1; x += step) b.add(new THREE.CylinderGeometry(0.06, 0.08, 4.6, 8).translate(x, 2.3, z), lam("bannerPole", () => ({ color: "#6e4b33" })));
      let k = 0;
      for (let x = x0; x < x1; x += step) for (let u = 0.05; u < 1; u += 0.06) {
        const y = 4.4 - 0.9 * Math.sin(Math.PI * u), px = x + u * step;
        b.add(penGeo, penM[k++ % 5], TM(px, y, z));
        if (k % 2) bulbs.push(TM(px + 0.2, y + 0.05, z, 0.09, 0.09, 0.09));
      }
    };
    bunting(gx + 290, gx + 440, 34, 10); bunting(gx - 350, gx + 130, -30, 12);
    const flagM = lam("flagCa", () => ({ map: flagTex(), side: THREE.DoubleSide }));
    for (const [x, z] of [[gx + 300, 42], [gx + 380, 42], [gx + 450, 42], [gx - 200, -42], [gx - 60, -42], [gx + 60, -42]]) {
      b.add(new THREE.CylinderGeometry(0.08, 0.1, 9, 8).translate(x, 4.5, z), lam("pole", () => ({ color: "#d9dde3" })));
      b.add(new THREE.PlaneGeometry(2.4, 1.2).translate(x + 1.25, 8.2, z), flagM);
    }
    for (let x = gx - 360; x < gx + 560; x += 26) for (const z of x < gx + 200 ? [-27] : [33]) { // lamp posts along the crowd lines
      b.add(new THREE.CylinderGeometry(0.07, 0.1, 5.5, 8).translate(x, 2.75, z), lam("lampPost", () => ({ color: "#2b2f38" })));
      lamps.push(TM(x, 5.6, z, 0.35, 0.35, 0.35));
    }
    // picnic tables, coolers, BBQs by the families
    for (let i = 0; i < 6; i++) { const x = gx + 300 + i * 22 + hh(i, 31) * 6, z = 38 + hh(i, 32) * 3;
      b.add(boxGeo(V(x - 1, 0.7, z - 0.45), V(x + 1, 0.78, z + 0.45)), lam("shelfWood", () => ({ color: "#b07a4a" })));
      for (const s of [-1, 1]) b.add(boxGeo(V(x - 1, 0.4, z + s * 0.7 - 0.13), V(x + 1, 0.46, z + s * 0.7 + 0.13)), lam("shelfWood", () => ({ color: "#b07a4a" })));
      for (const s of [-0.8, 0.8]) b.add(boxGeo(V(x + s - 0.05, 0, z - 0.6), V(x + s + 0.05, 0.7, z + 0.6)), lam("shelfWood", () => ({ color: "#b07a4a" })));
      b.add(boxGeo(V(x + 1.6, 0, z - 0.25), V(x + 2.2, 0.45, z + 0.25)), lam("cooler" + (i % 2), () => ({ color: i % 2 ? "#3f6fb5" : "#d2453a" })));
    }
    // glowing bits (NOINK, HDR so the bloom picks them up)
    this.glowIM(new THREE.SphereGeometry(1, 10, 8), glowMat("#ffcf7a", 3.2), bulbs);
    this.glowIM(new THREE.SphereGeometry(1, 12, 8), glowMat("#ffe2a8", 3.0), lamps);
    this.glowIM(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffc97a").multiplyScalar(2.2), side: THREE.DoubleSide, fog: true }), wins);
  }

  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const SUN_SHOT: Record<number, { az?: number; el?: number }> = { 1: { az: 30, el: 10 }, 7: { az: 60, el: 14 }, 8: { az: 40, el: 12 }, 9: { az: 20, el: 10 }, 16: { az: 25, el: 8 }, 10: { az: 50 }, 13: { az: 60 } };
    const az = THREE.MathUtils.degToRad(SUN_SHOT[id]?.az ?? L.az), el = THREE.MathUtils.degToRad(SUN_SHOT[id]?.el ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** where the jet is in this shot */
  private posePlaneFor(id: number, t: number, place: string) {
    const P = this.plane, g = P.group;
    g.visible = place !== "kitchen" && place !== "cockpit";
    g.rotation.set(0, 0, 0);
    const [eL, eR] = engines(id, t);
    let fan = 0;
    if (place === "cruise") {
      g.position.set(ALT[0], ALT[1] - 4.6 + 0.4 * Math.sin(t * 0.9), ALT[2]);
      g.rotation.set(0.01 * Math.sin(t * 0.7), 0, 0.02 * Math.sin(t * 0.6) - (id === 1 ? 0.03 : 0));
      fan = t * 40;
      posePlane(P, { gear: false, collapse: 0, fan, rat: id === 1 || (id === 7 && t > W.right + 0.6), slides: false });
      P.fans[0].rotation.x = t * 40 * (0.15 + 0.85 * eL) ; P.fans[1].rotation.x = t * 40 * (0.15 + 0.85 * eR) + 0.7;
      if (id === 1) { P.fans[0].rotation.x = t * 3; P.fans[1].rotation.x = t * 3 + 0.7; }
      return;
    }
    if (place === "airport") {
      if (id === 6) {
        const u = Math.max(0, t - 23.4), x = -330 + 18 * u * u, lift = Math.max(0, u - 2.3);
        g.position.set(x, lift * lift * 9, -78); g.rotation.z = Math.min(0.17, lift * 0.25);
        posePlane(P, { gear: lift < 1.2, collapse: 0, fan: t * 40, rat: false, slides: false });
      } else { g.position.set(0, 0.06, 0); posePlane(P, { gear: true, collapse: 0, fan: 0.3, rat: false, slides: false }); }
      return;
    }
    if (place === "gimli") {
      const s = gimliPlane(id, t);
      g.position.set(...s.pos);
      g.rotation.order = "YXZ"; g.rotation.set(s.roll, s.yaw, s.pitch);
      posePlane(P, { gear: s.gear, collapse: s.collapse, fan: t * 2, rat: true, slides: id === 15 });
    }
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    this.posePlaneFor(id, t, s.place);
    let c = camAt(id, f);
    // chase cameras that ride along with the jet
    const pp = this.plane.group.position;
    // shots 12-13 ride with the jet through jet-relative keys in story.ts (camAt)
    void pp;
    if (id === 11 && f >= 1290 && f < 1312) { // ride along with a go-kart
      const [kx, kz] = kartAt(1, t), [nx, nz] = kartAt(1, t + 0.1), fl = Math.hypot(nx - kx, nz - kz) || 1, fx = (nx - kx) / fl, fz = (nz - kz) / fl;
      c = { ...c, pos: [kx - fx * 7 - fz * 3, 1.7, kz - fz * 7 + fx * 3], look: [kx + fx * 2, 0.5, kz + fz * 2], fov: 40 };
    }
    if (id === 6) c = { ...c, look: [pp.x + 8, pp.y + 4, pp.z] };
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 9000; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 12, 160);
    if (s.light === "golden") Rr = Math.max(Rr, 30);
    if (s.place === "cruise" || id === 12 || id === 13) Rr = Math.max(Rr, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 400); this.sun.target.position.copy(focus);
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
    untone(L.fog, this.fog.color);
    if (s.place === "cruise") { this.fog.near = 400; this.fog.far = 3600; }
    else if (s.place === "cockpit") { this.fog.near = 2000; this.fog.far = 6000; }
    else if (id === 10 || id === 12) { this.fog.near = L.fogNear * 3; this.fog.far = L.fogFar * 4; } // aerial: the subject is 150-300 m off
    else { this.fog.near = L.fogNear; this.fog.far = L.fogFar * 1.2; } // ground shots: near the reference depth values
    scene.fog = this.fog; scene.background = null;
    this.sunDisc.visible = s.light === "golden";
    if (this.sunDisc.visible) { this.sunDisc.position.copy(cam.position).addScaledVector(sunDir, 900); this.sunDisc.scale.setScalar(2 * 900 * Math.tan(THREE.MathUtils.degToRad(1.7))); }

    // ---- cruise set: scrolling cloud sea + puffs, contrails ----
    const cruise = s.place === "cruise" || s.place === "cockpit";
    this.sea.visible = cruise;
    this.seaMat.color.set(s.light === "golden" ? "#ffd9b8" : "#ffffff");
    if (this.seaMat.map) this.seaMat.map.offset.set(-(t * 60) / 900, 0);
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.puffs[i], mat = p.m.material as THREE.MeshBasicMaterial;
      p.m.visible = cruise; if (!cruise) continue;
      mat.map = this.cloudMaps[s.light][i % 4];
      const span = 4000; const x = ((((p.x0 - t * 60) % span) + span * 1.5) % span) - span / 2;
      mat.opacity = p.o * THREE.MathUtils.smoothstep(span / 2 - Math.abs(x), 0, 600);
      p.m.position.set(ALT[0] + x, p.m.position.y, ALT[2] + p.z);
      p.m.lookAt(cam.position.x, p.m.position.y, cam.position.z);
    }
    for (const c2 of this.skyClouds) {
      c2.m.visible = (s.place === "airport" && c2.site === 0) || (s.place === "gimli" && c2.site !== 0);
      if (!c2.m.visible) continue;
      (c2.m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][this.skyClouds.indexOf(c2) % 4];
      c2.m.lookAt(cam.position);
    }
    const [eL, eR] = engines(id, t);
    const stopT: [number, number] = [W.left + 0.4, W.right + 0.4];
    this.trails.forEach((m, i) => {
      const on = s.place === "cruise" && id !== 1;
      m.visible = on; if (!on) return;
      const ez = (i ? 1 : -1) * 7.9, gap = id === 7 && t > stopT[i] ? (t - stopT[i]) * 60 : 0, len = 900;
      const ex = this.plane.group.position.x + 2, ey = this.plane.group.position.y + 2.0;
      m.position.set(ex - gap - 25, ey, ALT[2] + ez); m.scale.set(len, 1, 1);
      void eL; void eR;
    });
    // ---- cockpit screens ----
    const sk = screens(id, t);
    for (const sc2 of this.screens) sc2.m.color.copy(sc2.lit).multiplyScalar(sk);
    for (const b2 of this.buttons) b2.m.color.copy(b2.lit).multiplyScalar(0.12 + 0.88 * sk);
    // ---- karts ----
    this.karts.forEach((k, i) => {
      k.visible = s.place === "gimli";
      if (!k.visible) return;
      if (id <= 12) { const [x, z, yaw] = kartAt(i, t); k.position.set(x, 0.07, z); k.rotation.y = yaw; }
      else { k.position.set(GIMLI[0] + 330 + i * 9, 0.07, 30 + (i % 2) * 2); k.rotation.y = 0.4; }
    });

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = castAt(id, t, { pos: cam.position, right, sun: sunDir }, s.light, this.plane);
    // engine stop puffs (shot 7)
    if (id === 7) for (const [i, ts] of [[0, W.left], [1, W.right]] as const) {
      const u = (t - ts) / 1.2;
      if (u > 0 && u < 1) { const uq = q(u, 24); st.fx.push({ key: `puff${uq}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, uq), x: ALT[0] + 1.5, y: ALT[1] - 2.2, z: ALT[2] + (i ? 7.9 : -7.9), w: 5, h: 5, soft: true }); }
    }
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
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
