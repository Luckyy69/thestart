// OWNER: props/fx agent. 3D props (fx.ts holds the effect CARDS):
//   shot 2  the giant DOOR-FRAME edge that slams down on the skin roof from OUTSIDE the arm: a huge white-painted
//           wooden jamb (chunky architrave steps, giant wood grain, chipped paint showing the wood, a pencil
//           height-chart on its face: "BEAN age 6 / 7 / 8"), long axis ACROSS the arm (z), hovering above the roof
//           until armAt.whack, then riding the roof dent (frameY). Its underside is a rounded BULLNOSE whose profile
//           follows the dent's gaussian, so it never cuts through the dented roof.
//   shot 5  the brass HUMERUS plaque on a little brass stand beside SKELLY's upper arm: engraved serif lettering, a
//           bevelled rim, four screws. museumAt.glint = a glint sweep (and a second one as the flip settles).
//           The flip is a real SPLIT-FLAP: the top half-flap falls forward over the pivot (gravity), lands, bounces
//           (overshoot + settle) revealing HUMOROUS; then a tiny rimshot wobble of the whole plaque on its stand.
// Everything is a pure function of (id, t). Built from twoTone materials (lit by the shared world rig).
import * as THREE from "three";
import { ctex } from "../bridge/paint";
import { twoTone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { SHOTS, ARM, MUSEUM, V3, W, BEAT, FPS, armAt, smooth, LOOK_RAMPS } from "./story";
import { ROOF_Y, roofDent } from "./arm";

// ---------------- CONTRACTS (world metres) ----------------
/** the brass plaque's pivot (centre), museum: it hangs on a little brass stand beside SKELLY's upper arm */
export const PLAQUE_AT: V3 = [MUSEUM[0] - 0.6, MUSEUM[1] + 1.2, MUSEUM[2] + 0.3];
export const PLAQUE_SIZE: [number, number] = [0.5, 0.14];
/** the door-frame beam's underside height above the arm's skin roof centre (local y) for (id,t): it rides the dent */
export const frameY = (id: number, t: number) => ROOF_Y + 0.04 + (1 - armAt(id, t).whack) * 2.2 - roofDent(id, t, 0);

// ---------------- door frame ----------------
/** bullnose: the underside rises with |x| at least as fast as the dent falls off (dent = D exp(-x^2/0.5), D <= 1) */
const NOSE = (x: number) => 1.06 * (1 - Math.exp(-(x * x) / 0.5));
const FR = { half: 0.78, len: 3.5, step1: [0.95, 1.12] as [number, number], step2: [1.35, 1.38] as [number, number], top: 3.2 };
const jambTex = () => ctex("fnJamb", 1024, 1024, (g, r) => {
  g.fillStyle = "#f6f1e6"; g.fillRect(0, 0, 1024, 1024);
  // giant brush strokes + faint grain ghosting through the paint
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${200 + r() * 30},${190 + r() * 30},${170 + r() * 30},0.22)`; g.lineWidth = 2 + r() * 6; g.beginPath(); const y = r() * 1024; g.moveTo(0, y); g.bezierCurveTo(300, y + (r() - 0.5) * 40, 700, y + (r() - 0.5) * 40, 1024, y + (r() - 0.5) * 20); g.stroke(); }
  // chipped paint: wood shows through (with an ink edge)
  for (let i = 0; i < 9; i++) {
    const cx = 60 + r() * 900, cy = 60 + r() * 900, rr = 20 + r() * 55;
    g.beginPath(); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, d = rr * (0.6 + 0.6 * r()); const x = cx + Math.cos(a) * d * 1.6, y = cy + Math.sin(a) * d; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath();
    g.fillStyle = "#d8a466"; g.fill(); g.lineWidth = 5; g.strokeStyle = "#5a3a2a"; g.stroke();
    g.strokeStyle = "rgba(140,80,40,0.6)"; g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx - rr * 1.3, cy + k * rr * 0.25); g.lineTo(cx + rr * 1.3, cy + k * rr * 0.25 + 6); g.stroke(); }
  }
  // the pencil height chart (giant)
  g.strokeStyle = "#3a3a4a"; g.fillStyle = "#3a3a4a"; g.lineWidth = 7; g.font = "bold 46px 'DejaVu Sans', sans-serif";
  ["BEAN age 6", "BEAN age 7", "BEAN age 8 (ouch)"].forEach((s, i) => { const y = 300 + i * 180; g.beginPath(); g.moveTo(120, y); g.lineTo(420, y); g.stroke(); g.fillText(s, 440, y + 16); });
});
const doorFrameGeo = () => {
  const n = 24, [y1, x1] = FR.step1, [y2, x2] = FR.step2, pts: THREE.Vector2[] = [];
  for (let i = -n; i <= n; i++) { const x = (i / n) * FR.half; pts.push(new THREE.Vector2(x, NOSE(x))); }
  // up the right side, the architrave steps out, across the top, back down the left side (counter-clockwise)
  for (const [x, y] of [[FR.half, y1], [x1, y1], [x1, y2], [x2, y2], [x2, FR.top], [-x2, FR.top], [-x2, y2], [-x1, y2], [-x1, y1], [-FR.half, y1]]) pts.push(new THREE.Vector2(x, y));
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: FR.len, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 1 });
  g.translate(0, 0.045, -FR.len / 2); // the bevel grows the outline by 0.04: keep the nose at y >= 0
  g.computeVertexNormals();
  return g;
};

// ---------------- plaque ----------------
const PW = PLAQUE_SIZE[0], PH = PLAQUE_SIZE[1];
/** engraved brass face: 1024 x 288 (two halves: the top half = v 0.5..1) */
const plaqueTex = (key: string, word: string, sub: string) => ctex(key, 1024, 288, (g) => {
  const gr = g.createLinearGradient(0, 0, 1024, 288);
  gr.addColorStop(0, "#f0cf72"); gr.addColorStop(0.45, "#d4a640"); gr.addColorStop(0.55, "#e8c460"); gr.addColorStop(1, "#a8782a");
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 288);
  // brushed lines
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(255,240,190,${0.05 + 0.08 * ((i * 37) % 7) / 7})`; g.lineWidth = 2; g.beginPath(); g.moveTo(0, i * 3.2); g.lineTo(1024, i * 3.2 + 2); g.stroke(); }
  // bevel rim + inner engraved line
  g.lineWidth = 14; g.strokeStyle = "#7a5418"; g.strokeRect(7, 7, 1010, 274);
  g.lineWidth = 4; g.strokeStyle = "rgba(255,244,200,0.8)"; g.strokeRect(18, 18, 988, 252);
  g.lineWidth = 3; g.strokeStyle = "#7a5418"; g.strokeRect(30, 30, 964, 228);
  // screws
  for (const [x, y] of [[52, 52], [972, 52], [52, 236], [972, 236]]) { g.fillStyle = "#b8903a"; g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#5a3a10"; g.lineWidth = 3; g.stroke(); g.beginPath(); g.moveTo(x - 9, y - 4); g.lineTo(x + 9, y + 4); g.stroke(); }
  // engraved serif word: dark cut + a light lower lip (engraving)
  g.textAlign = "center"; g.textBaseline = "middle"; g.font = `bold ${word.length > 7 ? 118 : 128}px Georgia, 'DejaVu Serif', serif`;
  g.fillStyle = "rgba(255,240,190,0.85)"; g.fillText(word, 514, 128);
  g.fillStyle = "#3a2408"; g.fillText(word, 512, 124);
  g.font = "italic 34px Georgia, 'DejaVu Serif', serif"; g.fillStyle = "#4a3010"; g.fillText(sub, 512, 222);
});
const halfGeo = (top: boolean) => {
  const g = new THREE.PlaneGeometry(PW, PH / 2);
  g.translate(0, top ? PH / 4 : -PH / 4, 0);
  const uv = g.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setY(i, top ? 0.5 + uv.getY(i) * 0.5 : uv.getY(i) * 0.5);
  return g;
};
const glintTex = () => ctex("fnGlint2", 512, 128, (g) => {
  // a diagonal streak in the middle third (the texture slides across the plaque via offset.x, clamped)
  for (const [w, a] of [[70, 0.25], [34, 0.55], [12, 0.95]] as const) {
    g.strokeStyle = `rgba(255,250,225,${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(286, -10); g.lineTo(226, 138); g.stroke();
  }
  g.strokeStyle = "rgba(255,250,225,0.5)"; g.lineWidth = 8; g.beginPath(); g.moveTo(330, -10); g.lineTo(270, 138); g.stroke();
});
/** split-flap angle (rad, 0 = up, PI = landed) for s seconds after the flip trigger: gravity fall, then a damped bounce */
const flapAngle = (s: number) => {
  if (s <= 0) return 0;
  const tf = 0.16; // fall time
  if (s < tf) { const u = s / tf; return Math.PI * (0.15 * u + 0.85 * u * u); }
  const b = s - tf;
  return Math.PI - 0.42 * Math.abs(Math.sin(b * 22)) * Math.exp(-b * 13);
};

export class Props {
  root = new THREE.Group();
  private frame: THREE.Mesh;
  private plaque = new THREE.Group(); private flap = new THREE.Group();
  private glint: THREE.Mesh; private glintMat: THREE.MeshBasicMaterial; private gtex: THREE.Texture;
  
  constructor() {
    // ---- the giant door frame (shot 2) ----
    const jt = jambTex(); jt.repeat.set(0.22, 0.22);
    const fm = twoTone(new THREE.MeshLambertMaterial({ color: "#ffffff", map: jt }));
    this.frame = new THREE.Mesh(doorFrameGeo(), fm);
    this.frame.castShadow = true; this.frame.receiveShadow = true; this.frame.frustumCulled = false;
    this.root.add(this.frame);
    // ---- the plaque (shot 5) ----
    const P = this.plaque;
    const brass = twoTone(new THREE.MeshPhongMaterial({ color: "#d8a848", specular: "#fff0c0", shininess: 60 }));
    const dark = twoTone(new THREE.MeshPhongMaterial({ color: "#8a6020", specular: "#ffe0a0", shininess: 40 }));
    const add = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; return m; };
    // the slab (the faces sit 3 mm proud of it), tilted back a touch on its bracket
    const slab = add(new THREE.Mesh(new THREE.BoxGeometry(PW + 0.03, PH + 0.03, 0.02), dark)); slab.position.z = -0.012; P.add(slab);
    const A = plaqueTex("fnPlaqueA", "HUMERUS", "upper arm bone · os humeri"), B = plaqueTex("fnPlaqueB", "HUMOROUS", "adj. funny (allegedly)");
    // (qa2) emissiveMap = the face itself: lit from "inside" by the stage spotlight in the pun look (the 3D sun drops to
    // ~20 % there and the plaque went murky brown, HUMOROUS barely readable at 882-935)
    const face = (tex: THREE.Texture) => twoTone(new THREE.MeshPhongMaterial({ map: tex, emissiveMap: tex, emissive: "#000000", specular: "#fff4d0", shininess: 50 }));
    const fa = face(A), fb = face(B); this.faceMats = [fa, fb];
    const topNew = add(new THREE.Mesh(halfGeo(true), fb)); topNew.position.z = 0.0;            // revealed behind the falling flap
    const botOld = add(new THREE.Mesh(halfGeo(false), fa)); botOld.position.z = 0.0;           // covered when the flap lands
    // the flap: front = OLD top half, back = NEW bottom half (reads upright once the flap has turned through PI)
    const fFront = add(new THREE.Mesh(halfGeo(true), fa)); fFront.position.z = 0.0012;
    const fBack = add(new THREE.Mesh(halfGeo(false), fb)); fBack.rotation.x = Math.PI; fBack.position.z = -0.0012;
    // the back half-plane is built in the BOTTOM half then turned by PI about x: it sits in the top half, facing -z
    this.flap.add(fFront, fBack); this.flap.position.z = 0.006; P.add(topNew, botOld, this.flap);
    // hinge pins at the flap's pivot
    for (const sd of [-1, 1]) { const pin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 10), brass)); pin.rotation.z = Math.PI / 2; pin.position.set(sd * (PW / 2 + 0.012), 0, 0.004); P.add(pin); }
    // the glint (additive, NOINK)
    this.gtex = glintTex(); this.gtex.wrapS = THREE.ClampToEdgeWrapping; this.gtex.needsUpdate = true;
    this.glintMat = new THREE.MeshBasicMaterial({ map: this.gtex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.glint = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), this.glintMat);
    this.glint.position.z = 0.01; this.glint.layers.set(NOINK); this.glint.renderOrder = 2; P.add(this.glint);
    // the stand: a brass post + a weighted round foot + a bracket under the plaque
    const stand = new THREE.Group();
    const postH = PLAQUE_AT[1] - MUSEUM[1] - PH / 2 - 0.03;
    const post = add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, postH, 14), brass)); post.position.y = postH / 2; stand.add(post);
    const foot = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.03, 28), dark)); foot.position.y = 0.015; stand.add(foot);
    const knob = add(new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 10), brass)); knob.position.y = postH * 0.55; stand.add(knob);
    const brk = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.05), brass)); brk.position.set(0, postH + 0.006, -0.012); stand.add(brk);
    stand.position.set(PLAQUE_AT[0], MUSEUM[1], PLAQUE_AT[2] - 0.02);
    P.position.set(...PLAQUE_AT);
    this.root.add(P, stand);
    this.plaqueRoot = [P, stand];
  }
  private plaqueRoot: THREE.Object3D[];
  private faceMats: THREE.MeshPhongMaterial[] = [];
  update(id: number, t: number, _f: number, _cam: THREE.PerspectiveCamera) {
    const place = SHOTS[id - 1].place;
    // ---- door frame: only in shot 2 (it stays above the roof in shot 4: hidden there) ----
    this.frame.visible = id === 2;
    if (this.frame.visible) {
      // a hair of anticipation sway while its shadow looms, then the slam (frameY); a tiny rebound shudder after
      const a = armAt(id, t), s = t - BEAT.whack2 / FPS, loom = a.shadow * (1 - a.whack);
      const shud = s > 0 ? 0.03 * Math.sin(s * 40) * Math.exp(-s * 9) : 0;
      this.frame.position.set(ARM[0] + 0.05 * Math.sin(t * 2.1) * loom, ARM[1] + frameY(id, t) + Math.abs(shud), ARM[2]);
      this.frame.rotation.set(0, 0, 0.02 * Math.sin(t * 1.7) * loom);
    }
    // ---- plaque ----
    const mu = place === "museum";
    for (const o of this.plaqueRoot) o.visible = mu;
    if (!mu) return;
    const sF = t - BEAT.flip / FPS, th = flapAngle(sF);
    this.flap.rotation.x = th;
    // (qa2) the spotlight on the plaque: follows the museum <-> pun look ramps exactly (no pop)
    const pr = LOOK_RAMPS.filter((r) => r[4] === "museum"), fr = t * FPS;
    let spot = 0;
    for (const [a, b, f0, f1] of pr) { const u = smooth((fr - f0) / Math.max(1, f1 - f0)); if (b === "pun") spot = Math.max(spot, u); else if (a === "pun") spot *= 1 - u; }
    for (const m of this.faceMats) m.emissive.setRGB(0.62 * spot, 0.5 * spot, 0.34 * spot);
    // (the flap sits 6 mm proud: before the flip its front covers the NEW top, once landed its back covers the OLD bottom)
    // the rimshot wobble of the whole plaque on its bracket (886 -> settles)
    const sR = t - BEAT.rimshot / FPS;
    this.plaque.rotation.set(-0.12, 0, sR > 0 ? 0.05 * Math.sin(sR * 26) * Math.exp(-sR * 5) : 0);
    // glint sweeps: on "humerus" (807) and once the flip settles
    const g1 = (t - (W.humerus - 0.1)) / 0.55, g2 = (sF - 0.35) / 0.55;
    const gu = g1 > 0 && g1 < 1 ? g1 : g2 > 0 && g2 < 1 ? g2 : -1;
    this.glint.visible = gu >= 0;
    if (gu >= 0) { this.gtex.offset.x = 0.6 - 1.2 * gu; this.glintMat.opacity = 0.7 * Math.sin(Math.PI * gu); }
  }
}
