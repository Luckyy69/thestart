// OWNER: sets. Small props for the exam HALL, lit by the hall's own shader rig (sets_kit.ts hallRig):
//   on every desk an EXAM PAPER ("MATHS EXAM", the top edge away from the pupil), a yellow PENCIL and a pink eraser.
//   shot 1: BEAN's pencil RATTLES on hookAt.rumble (tiny hops + yaw jitter on his desk).
//   shot 5: on the peak growl (endAt.peak start = W.growls - 0.08) a shockwave runs out from BEAN at ~9 m/s: every exam
//     paper FLUTTERS (corners curl up, a ripple runs across it, it slides a little away from BEAN, settles over ~1.5 s)
//     and the pencils hop + roll. All pure functions of (id, t).
// CONTRACTS (world): PAPERS[i] = centre of desk i's paper (on the desk top, y 0.753); PENCILS[i] = its pencil's centre;
//   BEAN_PAPER = PAPERS[BEAN_DESK]. T_PEAK = the shockwave start (s).
import * as THREE from "three";
import { SHOTS, W, hookAt, clamp01 } from "./story";
import { rng } from "../bridge/paint";
import { C3, Bat, TRS, imat, hallRig, clean } from "./sets_kit";
import { DESKS, BEAN_DESK, DESK_TOP_Y } from "./sets";
import { examTex } from "./sets_tex";

const PW = 0.21, PH = 0.297, PY = DESK_TOP_Y + 0.003;
type PaperDef = { x: number; z: number; yaw: number; d: number; dir: [number, number] };
type PencilDef = { x: number; z: number; yaw: number; d: number };
const PDEF: PaperDef[] = [], NDEF: PencilDef[] = [];
DESKS.forEach((p, i) => {
  const r = rng(700 + i), bx = DESKS[BEAN_DESK][0], bz = DESKS[BEAN_DESK][2];
  const x = p[0] + (r() - 0.5) * 0.12 - 0.04, z = p[2] - 0.36 + (r() - 0.5) * 0.06, yaw = (r() - 0.5) * 0.35;
  const dx = x - bx, dz = z - bz, d = Math.hypot(dx, dz);
  PDEF.push({ x, z, yaw, d, dir: d > 1e-3 ? [dx / d, dz / d] : [0, -1] });
  const nx = p[0] + 0.2 + (r() - 0.5) * 0.03, nz = p[2] - 0.33 + (r() - 0.5) * 0.08;
  NDEF.push({ x: nx, z: nz, yaw: Math.PI / 2 + (r() - 0.5) * 0.5, d: Math.hypot(nx - bx, nz - bz) });
});
export const PAPERS: C3[] = PDEF.map((p) => [p.x, PY, p.z]);
export const PENCILS: C3[] = NDEF.map((p) => [p.x, PY + 0.0045, p.z]);
export const BEAN_PAPER = PAPERS[BEAN_DESK];
export const T_PEAK = W.growls - 0.08;
/** the shockwave envelope for something at distance d from BEAN (0..1, rises fast, settles over ~1.5 s) */
const shock = (id: number, t: number, d: number) => {
  if (id !== 5) return { e: 0, s: 0 };
  const s = t - T_PEAK - d / 9;
  if (s <= 0) return { e: 0, s };
  return { e: (1 - Math.exp(-s * 26)) * Math.exp(-s * 1.7), s };
};

export class Props {
  root = new THREE.Group();
  private papers: { mesh: THREE.Mesh; base: Float32Array; key: string }[] = [];
  private pencils: THREE.Group[] = [];
  constructor() {
    const S = hallRig(), R = this.root;
    const paperMat = imat(S, { map: examTex(), spec: 20, specK: 0.08, self: [0.06, 0.06, 0.06] });
    const gloss = imat(S, { spec: 60, specK: 0.5 }), plain = imat(S, { spec: 20, specK: 0.1 });
    const st = new Bat();
    PDEF.forEach((p) => {
      const g = new THREE.PlaneGeometry(PW, PH, 8, 10); g.rotateX(-Math.PI / 2);
      const c = clean(g); c.deleteAttribute("normal"); c.computeVertexNormals();
      const ng = new THREE.BufferGeometry();
      for (const k of ["position", "normal", "uv", "color"]) ng.setAttribute(k, c.getAttribute(k));
      const m = new THREE.Mesh(ng, paperMat);
      m.position.set(p.x, PY, p.z); m.rotation.y = p.yaw; m.frustumCulled = false; m.receiveShadow = true; m.castShadow = true;
      R.add(m);
      this.papers.push({ mesh: m, base: Float32Array.from((ng.getAttribute("position") as THREE.BufferAttribute).array as ArrayLike<number>), key: "" });
    });
    // pencils: one merged mesh each (yellow hex body, wood cone, graphite tip, ferrule, pink eraser)
    NDEF.forEach((p, i) => {
      const b = new Bat(), L = 0.17, r = 0.0045;
      b.cyl(gloss, r, r, L, 6, TRS(0, 0, 0, 0, 0, Math.PI / 2), ["#ffc81e", "#ffc81e", "#3a8ae8", "#ffc81e"][i % 4]);
      b.add(new THREE.ConeGeometry(r, 0.018, 6), plain, TRS(L / 2 + 0.009, 0, 0, 0, 0, -Math.PI / 2), "#f0c890");
      b.add(new THREE.ConeGeometry(r * 0.35, 0.006, 6), plain, TRS(L / 2 + 0.0155, 0, 0, 0, 0, -Math.PI / 2), "#2a2a30");
      b.cyl(gloss, r * 1.05, r * 1.05, 0.012, 10, TRS(-L / 2 - 0.006, 0, 0, 0, 0, Math.PI / 2), "#c8ccd4");
      b.cyl(plain, r, r, 0.012, 10, TRS(-L / 2 - 0.018, 0, 0, 0, 0, Math.PI / 2), "#ff8aa8");
      const g = new THREE.Group(); b.build(g, true);
      g.position.set(p.x, PY + r, p.z); g.rotation.y = p.yaw;
      R.add(g); this.pencils.push(g);
      // a pink eraser + (some desks) a ruler, (BEAN's) a pencil sharpener
      const er = rng(900 + i);
      st.rbox(gloss, 0.05, 0.014, 0.025, 0.005, TRS(p.x - 0.42 + er() * 0.03, DESK_TOP_Y + 0.007, p.z + 0.12 - er() * 0.05, er() * 0.6), "#ff8aa8", 2);
      if (i % 3 === 1) st.box(plain, -0.15, DESK_TOP_Y, -0.014, 0.15, DESK_TOP_Y + 0.003, 0.014, "#bfe8ff", TRS(DESKS[i][0] + 0.02, 0, DESKS[i][2] - 0.13, 0.04));
      if (i === BEAN_DESK) st.rbox(gloss, 0.025, 0.02, 0.018, 0.004, TRS(p.x - 0.03, DESK_TOP_Y + 0.01, p.z + 0.13, 0.4), "#e8343c", 2);
    });
    st.build(R, true);
    R.traverse((o) => { o.frustumCulled = false; });
  }
  update(id: number, t: number, _f: number, _cam: THREE.PerspectiveCamera) {
    this.root.visible = SHOTS[id - 1].place === "hall";
    if (!this.root.visible) return;
    // ---- papers ----
    this.papers.forEach((P, i) => {
      const p = PDEF[i], { e, s } = shock(id, t, p.d), A = (i === BEAN_DESK ? 0.085 : 0.06 * (1.25 - Math.min(p.d, 2.8) * 0.25));
      const key = e < 1e-4 ? "flat" : s.toFixed(4);
      if (key === P.key) return;
      P.key = key;
      const pos = P.mesh.geometry.getAttribute("position") as THREE.BufferAttribute, b = P.base;
      // the direction away from BEAN in the paper's local frame
      const cy = Math.cos(-p.yaw), sy = Math.sin(-p.yaw), lx = p.dir[0] * cy - p.dir[1] * sy, lz = p.dir[0] * sy + p.dir[1] * cy;
      for (let k = 0; k < pos.count; k++) {
        const x = b[k * 3], z = b[k * 3 + 2];
        if (e < 1e-4) { pos.setXYZ(k, x, 0, z); continue; }
        const u = x / PW, v = z / PH, r2 = clamp01((u * u + v * v) * 2.2), along = u * lx + v * lz;
        const w = Math.sin(s * 19 - along * 7 + i);
        const y = e * A * (0.12 + 0.88 * r2) * (0.55 + 0.45 * w) * (0.7 + 0.6 * clamp01(along + 0.5));
        pos.setXYZ(k, x, Math.max(0, y), z);
      }
      pos.needsUpdate = true; P.mesh.geometry.computeVertexNormals();
      // slide a little away from BEAN (continuous, settles)
      const slide = id === 5 && s > 0 ? 0.035 * (1 - Math.exp(-s * 5)) * (i === BEAN_DESK ? 0.4 : 1) : 0;
      P.mesh.position.set(p.x + p.dir[0] * slide, PY, p.z + p.dir[1] * slide);
      P.mesh.rotation.y = p.yaw + (id === 5 && s > 0 ? 0.08 * (1 - Math.exp(-s * 5)) * ((i % 2) * 2 - 1) : 0);
    });
    // ---- pencils ----
    const hk = hookAt(id, t);
    this.pencils.forEach((g, i) => {
      const p = NDEF[i];
      let hop = 0, yaw = 0, roll = 0, dx = 0;
      if (i === BEAN_DESK && hk.rumble > 0) {
        const r = hk.rumble;
        hop = r * 0.006 * Math.abs(Math.sin(t * 43)); yaw = r * 0.09 * Math.sin(t * 57) * Math.sin(t * 13); dx = r * 0.004 * Math.sin(t * 31);
      }
      const { e, s } = shock(id, t, p.d);
      if (e > 1e-4) { hop += e * (i === BEAN_DESK ? 0.035 : 0.018) * Math.abs(Math.sin(s * 22)); roll += 0.9 * (1 - Math.exp(-s * 4)); yaw += e * 0.25 * Math.sin(s * 15 + i); }
      g.position.set(p.x + dx, PY + 0.0045 + hop, p.z); g.rotation.set(roll, p.yaw + yaw, 0, "YXZ");
    });
  }
}
