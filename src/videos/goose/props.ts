// OWNER: sets. Props for "Bald Fur", lit by the sets' own shader rigs (sets.ts streetRig / roomRig).
//   ROOM: BEAN's PHONE propped against a little yellow DUCK plush on the bed (front right of BEAN). The screen is dim
//     (asleep) until roomAt.reveal, then it lights up (with a soft boop + halo) showing the cute song screen
//     "♪ Little Duckling Lullaby"; it stays lit through shot 6 (continuous camera, no pop at the 5 -> 6 switch).
//     HEADPHONES lie on the pillow before shot 5 (BEAN wears the cast's pair in shots 5 + 6).
//     A mug of cocoa + a comic on the nightstand-side of the bed.
//
// CONTRACTS (world coordinates):
//   PHONE: centre c of the screen, unit normal n (toward the lens), w x h (screen), lean (rad back from vertical).
//   phoneAt(id, t) -> { glow 0..1 } (the screen light: use it for a warm/blue glow on BEAN's face if wanted).
//   HEADPHONES_AT: the headphones' resting point on the pillow; shown while headphonesShown(id, t).
import * as THREE from "three";
import { ROOM, roomAt, smooth, W } from "./story";
import { roomRig, imat, Bat, TRS, V3, C3, Glows, lump, otxt, rrect } from "./sets";
import { ctex } from "../bridge/paint";
import { NOINK } from "../bridge/ink";

const add = (o: number[], x: number, y: number, z: number): C3 => [o[0] + x, o[1] + y, o[2] + z];
const PH = { x: 0.5, z: -0.47, lean: 0.42, yaw: -0.22, w: 0.11, h: 0.2, d: 0.012 };
const PH_BASE = add(ROOM, PH.x, 0.47, PH.z);
const PH_N: C3 = [Math.sin(PH.yaw) * Math.cos(PH.lean), Math.sin(PH.lean), Math.cos(PH.yaw) * Math.cos(PH.lean)];
/** the phone screen (world): centre, unit normal toward the lens, size, lean */
export const PHONE = {
  c: [PH_BASE[0] - Math.sin(PH.yaw) * Math.sin(PH.lean) * PH.h * 0.5 + PH_N[0] * 0.007, PH_BASE[1] + Math.cos(PH.lean) * PH.h * 0.5 + PH_N[1] * 0.007, PH_BASE[2] - Math.cos(PH.yaw) * Math.sin(PH.lean) * PH.h * 0.5 + PH_N[2] * 0.007] as C3,
  n: PH_N, w: PH.w - 0.012, h: PH.h - 0.02, lean: PH.lean,
};
export const phoneAt = (id: number, t: number) => ({ glow: id === 6 ? 1 : id === 5 ? roomAt(id, t).reveal : 0 });
export const HEADPHONES_AT = add(ROOM, -0.72, 0.6, -1.0);
export const headphonesShown = (id: number, _t: number) => id < 5;

// ---------------- textures
/** the song screen: pastel sky, a cartoon duckling in a nest of notes, title, progress bar, play controls */
const songTex = () => ctex("goPhoneSong", 384, 704, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 704); gr.addColorStop(0, "#bfe6ff"); gr.addColorStop(0.55, "#ffe0f0"); gr.addColorStop(1, "#fff4c8");
  g.fillStyle = gr; g.fillRect(0, 0, 384, 704);
  g.fillStyle = "rgba(40,40,60,0.55)"; g.font = "bold 22px 'DejaVu Sans', sans-serif"; g.textAlign = "left"; g.fillText("9:41", 20, 34);
  g.textAlign = "right"; g.fillText("100%", 364, 34);
  // album art: a duckling with a bow in a soft circle + floating notes
  g.fillStyle = "#ffffff"; rrect(g, 42, 70, 300, 300, 40); g.fill();
  g.fillStyle = "#fff0a8"; g.beginPath(); g.arc(192, 220, 128, 0, 7); g.fill();
  g.save(); g.translate(192, 236); g.strokeStyle = "#5a3a10"; g.lineWidth = 7;
  g.fillStyle = "#ffd23a"; g.beginPath(); g.ellipse(10, 36, 78, 56, 0, 0, 7); g.fill(); g.stroke();
  g.beginPath(); g.arc(-22, -38, 50, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#ff8a2a"; g.beginPath(); g.ellipse(-70, -28, 26, 12, 0.1, 0, 7); g.fill(); g.stroke();
  g.fillStyle = "#1c1c28"; g.beginPath(); g.arc(-36, -48, 8, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(-38, -51, 3, 0, 7); g.fill();
  g.fillStyle = "#ff8ab4"; g.beginPath(); g.ellipse(-12, -28, 11, 7, 0, 0, 7); g.fill();
  g.fillStyle = "#ff6aa0"; g.beginPath(); g.moveTo(-10, -86); g.lineTo(-40, -104); g.lineTo(-38, -72); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-10, -86); g.lineTo(20, -106); g.lineTo(18, -72); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(-10, -86, 9, 0, 7); g.fill(); g.stroke();
  g.restore();
  for (const [x, y, s] of [[80, 110, 34], [300, 130, 40], [290, 320, 30], [86, 320, 28]] as [number, number, number][]) otxt(g, "♪", x, y, s * 1.6, "#ff6aa0", "#ffffff", 5);
  otxt(g, "♪ Little Duckling", 192, 418, 34, "#3a2a5a", "#ffffff", 6);
  otxt(g, "Lullaby", 192, 460, 38, "#3a2a5a", "#ffffff", 6);
  g.fillStyle = "rgba(60,50,90,0.6)"; g.font = "22px 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("Baby Songs for Sleepy Ducks", 192, 496);
  g.fillStyle = "rgba(60,50,90,0.25)"; rrect(g, 40, 528, 304, 10, 5); g.fill();
  g.fillStyle = "#ff6aa0"; rrect(g, 40, 528, 120, 10, 5); g.fill(); g.beginPath(); g.arc(160, 533, 11, 0, 7); g.fill();
  g.fillStyle = "#3a2a5a";
  g.beginPath(); g.moveTo(110, 600); g.lineTo(80, 620); g.lineTo(110, 640); g.fill(); g.fillRect(74, 600, 6, 40);
  g.beginPath(); g.moveTo(274, 600); g.lineTo(304, 620); g.lineTo(274, 640); g.fill(); g.fillRect(304, 600, 6, 40);
  g.beginPath(); g.arc(192, 620, 34, 0, 7); g.fill(); g.fillStyle = "#ffffff"; g.fillRect(178, 604, 9, 32); g.fillRect(197, 604, 9, 32);
  g.fillStyle = "#ff6aa0"; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(150 + k * 42, 680, 6, 0, 7); g.fill(); }
});
/** the asleep screen: dark glass with a faint reflection streak */
const darkTex = () => ctex("goPhoneDark", 64, 128, (g) => {
  const gr = g.createLinearGradient(0, 0, 64, 128); gr.addColorStop(0, "#2a2a44"); gr.addColorStop(0.45, "#141424"); gr.addColorStop(1, "#1c1c30"); g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(10, 0); g.lineTo(30, 0); g.lineTo(0, 60); g.lineTo(0, 20); g.fill();
});

export class Props {
  root = new THREE.Group();
  private phone = new THREE.Group(); private screen: THREE.ShaderMaterial; private dark: THREE.Mesh; private halo: Glows;
  private headphones = new THREE.Group(); private room = new THREE.Group();
  constructor() {
    const S = roomRig();
    const R = this.room; R.position.set(...ROOM); this.root.add(R);
    const gloss = imat(S, { spec: 60, specK: 0.5 }), plain = imat(S, {}), soft = imat(S, { rim: 0.3 }), metal = imat(S, { spec: 90, specK: 0.9 });
    // ---- the DUCK plush (the phone leans on it) ----
    {
      const b = new Bat(), x = PH.x + 0.03, z = PH.z - 0.16, y = 0.47;
      b.sph(soft, TRS(x, y + 0.1, z, 0, 0, 0, [0.13, 0.11, 0.11]), 18, "#ffd23a");
      b.sph(soft, TRS(x - 0.04, y + 0.25, z + 0.02, 0, 0, 0, 0.085), 16, "#ffd23a");
      b.sph(gloss, TRS(x - 0.06, y + 0.24, z + 0.1, -0.3, 0, 0, [0.05, 0.022, 0.04]), 12, "#ff8a2a");
      for (const s of [-1, 1]) b.sph(gloss, TRS(x - 0.04 + s * 0.035, y + 0.275, z + 0.08, 0, 0, 0, 0.012), 8, "#1c1c28");
      for (const s of [-1, 1]) b.sph(soft, TRS(x + s * 0.12, y + 0.1, z + 0.01, 0, 0, s * 0.6, [0.03, 0.07, 0.06]), 10, "#ffc21a");
      b.add(lump(0.05, 0.04, 0.03, 33, 0.1, 10), soft, TRS(x + 0.12, y + 0.06, z - 0.08, 0.6), "#ffc21a");
      b.build(R, true);
    }
    // ---- the PHONE: rounded slab leaning back, a pink case, the screen (asleep -> song) ----
    {
      const p = this.phone; p.position.set(PH.x, 0.47, PH.z); p.rotation.set(-PH.lean, PH.yaw, 0, "YXZ"); R.add(p);
      const b = new Bat();
      b.rbox(gloss, PH.w, PH.h, PH.d, 0.012, TRS(0, PH.h / 2, -PH.d / 2), "#ff8ab4", 3);
      b.cyl(metal, 0.008, 0.008, 0.004, 12, TRS(-0.03, PH.h - 0.03, -PH.d - 0.001, 0, Math.PI / 2), "#2a2a36");
      b.build(p, true);
      this.screen = imat(S, { map: songTex(), emap: true, em: [0, 0, 0] });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.012, PH.h - 0.02), this.screen);
      sg.geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(sg.geometry.getAttribute("position").count * 3).fill(1), 3));
      sg.position.set(0, PH.h / 2, 0.0012); sg.frustumCulled = false; p.add(sg);
      const dm = new THREE.MeshBasicMaterial({ map: darkTex(), transparent: true, depthWrite: false, fog: false });
      this.dark = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.012, PH.h - 0.02), dm);
      this.dark.position.set(0, PH.h / 2, 0.0024); this.dark.layers.set(NOINK); this.dark.renderOrder = 2; this.dark.frustumCulled = false; p.add(this.dark);
      this.halo = new Glows(p, [{ p: V3(0, PH.h / 2, 0.05), c: [0.55, 0.45, 0.6], s: 0.55, g: 0 }, { p: V3(0, PH.h / 2, 0.02), c: [0.3, 0.25, 0.32], s: 0.22, g: 0 }], 0.3);
    }
    // ---- HEADPHONES on the pillow (before shot 5): band + two big cups, lying on their side ----
    {
      const h = this.headphones; h.position.set(HEADPHONES_AT[0] - ROOM[0], HEADPHONES_AT[1] - ROOM[1], HEADPHONES_AT[2] - ROOM[2]); h.rotation.set(-Math.PI / 2 + 0.25, 0.4, 0); R.add(h);
      const b = new Bat();
      b.torus(gloss, 0.11, 0.014, TRS(0, 0.02, 0, 0, 0, 0), "#e8343c", Math.PI, 10);
      for (const s of [-1, 1]) { b.cyl(gloss, 0.05, 0.05, 0.045, 24, TRS(s * 0.115, 0.0, 0, 0, 0, Math.PI / 2), "#e8343c"); b.cyl(plain, 0.042, 0.042, 0.02, 24, TRS(s * 0.09, 0.0, 0, 0, 0, Math.PI / 2), "#2a2a36"); }
      b.build(h, true);
    }
    // ---- a comic + mug of cocoa on the bed's left end by the pillow ----
    {
      const b = new Bat();
      b.rbox(plain, 0.2, 0.008, 0.27, 0.003, TRS(-0.3, 0.485, -0.6, 0.35), "#4ab0ff");
      b.rbox(plain, 0.18, 0.009, 0.25, 0.003, TRS(-0.3, 0.488, -0.6, 0.35), "#ffd23a");
      b.build(R, true);
    }
    this.root.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, _f: number, _cam: THREE.PerspectiveCamera) {
    this.room.visible = id === 5 || id === 6;
    if (!this.room.visible) return;
    const g = phoneAt(id, t).glow;
    // the reveal boop: a soft swell + settle (no pop) as the screen wakes
    const tb = t - (W.for - 0.2), boop = id === 5 ? Math.sin(Math.max(0, Math.min(1, tb / 0.45)) * Math.PI) * 0.14 : 0;
    this.phone.scale.setScalar(1 + boop);
    (this.screen.uniforms.uEm.value as THREE.Vector3).set(0.8 * g, 0.78 * g, 0.78 * g); // QA2: was 1.45 (the song title washed out)
    (this.dark.material as THREE.MeshBasicMaterial).opacity = 1 - smooth(g);
    this.dark.visible = g < 0.999;
    this.halo.gk.set(0.4 * g * (1 + 0.25 * Math.sin(t * 5)), 0, 0, 0); // QA2: softer halo over the screen this.halo.mesh.visible = g > 0.001;
    this.headphones.visible = headphonesShown(id, t);
  }
}
