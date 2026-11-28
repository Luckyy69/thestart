// OWNER: looks agent (with looks.ts). Light you can SEE: haze shafts through the hallway END window and the museum's
// right windows (aligned with the frozen world sun), dust motes drifting in the beams, the warm glow pool where the sun
// shines THROUGH the arm's skin roof (shot 2, "just skin"), lamp halos in Pinky Town, the museum's stage SPOTLIGHT cone
// on the plaque (look "pun"), the cold electric glow in the peak. All on NOINK (no ink lines on light), transparent,
// depthWrite false, deterministic. Read WINDOWS (sets.ts), ROOF_* / LAMPS (arm.ts), PLAQUE_AT (props.ts).
// Every strength follows the LOOK weights (the same chained LOOK_RAMPS logic as world.ts lookAt), so a light turn in
// looks.ts and the visible light here always move together; the shaft colour is the look's own sun colour.
// Backgrounds stay SHARP: the shafts are thin, capped, additive glow (never a fog over detail), and they stop at the
// characters (vertical keep-out cylinders), so a face is never washed out by a beam behind it.
import * as THREE from "three";
import { LookDef } from "./looks";
import { SHOTS, XFADE, LOOK_RAMPS, Look, HALL, ARM, MUSEUM, V3, armAt, peakAt, surgeAt, endAt, clamp01, smooth } from "./story";
import { WINDOWS } from "./sets";
import { ROOF_Y, ROOF_SPAN, LAMPS, ELBOW_U, cablePt, surgeSpan } from "./arm";
import { PLAQUE_AT } from "./props";
import { BEAN_HALL, BEAN_MU, SKELLY_AT, beanHallAt } from "./cast";
import { Beam, Cone, Motes, Glows, GlowItem, Pool } from "./lightfx_kit";

// ---------------- per-look strengths of the visible light (mixed exactly like the looks) ----------------
type FK = { hall: number; mu: number; motes: number; skin: number; town: number; spot: number; peak: number; spark: number };
const Z: FK = { hall: 0, mu: 0, motes: 0, skin: 0, town: 0, spot: 0, peak: 0, spark: 0 };
const FXK: Record<Look, FK> = {
  hall: { ...Z, hall: 1, motes: 0.7 },                       // honey shaft down the hall, a few motes
  peak: { ...Z, hall: 0.8, motes: 0.25, peak: 1 },           // the shaft goes electric blue (sun colour), cold rim glow
  hallend: { ...Z, hall: 0.55, motes: 0.3 },                 // flatter, weaker: deadpan
  arm: { ...Z, skin: 0.22, town: 0.45 },                     // a faint glow under the roof, Pinky Town twinkling far off
  skin: { ...Z, skin: 1, town: 0.45 },                       // "just skin": the sun pours through the roof
  zap: { ...Z, skin: 0.3, town: 0.25, spark: 1 },            // cold, dark: the sparks + the surge own the frame
  town: { ...Z, skin: 0.2, town: 1 },                        // cosy lamp-lit dusk
  museum: { ...Z, mu: 1, motes: 1 },                         // amber beams full of dust
  pun: { ...Z, mu: 0.08, motes: 0.12, spot: 1 },           // (cam) haze down: the HUMOROUS plaque reads crisp             // the room dims, the stage spotlight pops on
};
const mixK = (a: FK, b: FK, k: number): FK => { const o = { ...a }; for (const key of Object.keys(a) as (keyof FK)[]) o[key] = a[key] + (b[key] - a[key]) * k; return o; };
/** the same chained ramp logic as world.ts lookAt(id, f) */
const fkAt = (id: number, f: number): FK => {
  const s = SHOTS[id - 1], x = XFADE[id + 1] ?? 0;
  let K = FXK[s.look];
  for (const r of LOOK_RAMPS) {
    if (r[4] !== s.place || f < r[2]) continue;
    const g0 = clamp01((f - r[2]) / Math.max(1, r[3] - r[2])), g = g0 * g0 * (3 - 2 * g0);
    if (r[2] >= s.a && r[2] < s.b + x / 2) K = mixK(K, FXK[r[1]], g);
    else if (s.look === r[1] && s.a > r[2] && s.a <= r[3]) K = mixK(FXK[r[0]], K, g);
  }
  return K;
};

const v = (p: V3) => new THREE.Vector3(...p);
const o3 = (o: V3, x: number, y: number, z: number) => new THREE.Vector3(o[0] + x, o[1] + y, o[2] + z);
const UP = new THREE.Vector3(0, 1, 0);
const tint = (hex: string, m: [number, number, number], out = new THREE.Color()) => { out.set(hex); return out.setRGB(out.r * m[0], out.g * m[1], out.b * m[2]); };

// glow indices
const G_LAMP = 0, NL = LAMPS.length, G_TOWN = NL, G_SPARK = NL + 1, G_PEAK = NL + 2, G_PLAQ = NL + 5;
const TOWN_X = ARM[0] + 13.5; // lamps beyond this are Pinky Town's streetlamps

export class LightFx {
  root = new THREE.Group();
  private hallBeam: Beam; private hallMotes: Motes;
  private muBeams: Beam[] = []; private muMotes: Motes[] = [];
  private skinBeam: Beam; private skinPool: Pool;
  private spot: Cone; private spotPool: Pool; private spotFloor: THREE.Vector3;
  private glows: Glows;
  private sunKey = "";
  private c = new THREE.Color(); private c2 = new THREE.Color();

  constructor() {
    const R = this.root;
    this.hallBeam = new Beam(R, 1, 22);
    this.hallBeam.room([HALL[0] - 4, HALL[1], HALL[2] - 1.34], [HALL[0] + 4.9, HALL[1] + 2.7, HALL[2] + 3]);
    this.hallMotes = new Motes(R, this.hallBeam, 70, 11);
    for (let i = 0; i < 3; i++) {
      const b = new Beam(R, 2, 20);
      b.room([MUSEUM[0] - 3.4, MUSEUM[1], MUSEUM[2] - 7], [MUSEUM[0] + 3.5, MUSEUM[1] + 4.5, MUSEUM[2] + 6]);
      b.cyl([[SKELLY_AT[0], SKELLY_AT[2], 0.34, SKELLY_AT[1] + 1.75], [BEAN_MU[0], BEAN_MU[2], 0.3, 1.36], [0, 0, 0, 0]]);
      this.muBeams.push(b); this.muMotes.push(new Motes(R, b, 110, 31 + i * 7));
    }
    this.skinBeam = new Beam(R, 3, 18);
    this.skinBeam.room([ARM[0] - 2.4, ARM[1] + 0.0, ARM[2] - 1.5], [ARM[0] + 2.4, ARM[1] + ROOF_Y, ARM[2] + 1.5]);
    this.skinBeam.mat.uniforms.uFall.value.set(0.7, 1.0);
    this.skinBeam.set(o3(ARM, 0, ROOF_Y - 0.02, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), ROOF_SPAN[1] - ROOF_SPAN[0] - 0.2, 2.6,
      new THREE.Vector3(0.12, -1, 0.05).normalize(), ROOF_Y + 0.2);
    this.skinPool = new Pool(R);
    // the stage spotlight: from the ceiling in front of SKELLY (above the plaque camera), down onto the plaque, on to the floor
    this.spot = new Cone(R);
    const apex = o3(MUSEUM, -0.42, 3.7, 1.05), aim = v(PLAQUE_AT);
    const ext = (apex.y - MUSEUM[1]) / (apex.y - aim.y);
    this.spot.aim(apex, aim, 0.36, ext);
    this.spotFloor = apex.clone().lerp(aim, ext).setY(MUSEUM[1] + 0.012);
    this.spotPool = new Pool(R);
    const items: GlowItem[] = [];
    for (const L of LAMPS) items.push({ p: v(L.p), s: 0.85, bias: 0.3 });
    items.push({ p: o3(ARM, 19.6, 2.6, 0.2), s: 9, bias: 0 });                               // Pinky Town's warm air glow
    items.push({ p: new THREE.Vector3(...cablePt(ELBOW_U)).add(new THREE.Vector3(0, 0.15, 0)), s: 1.8, bias: 0.25 }); // the dent's spark glow
    items.push({ p: o3(BEAN_HALL, 0, 1.12, -0.2), s: 2.6, bias: 0 });                       // peak: cold rim glow behind BEAN
    items.push({ p: o3(BEAN_HALL, -0.55, 0.75, -0.17), s: 1.3, bias: 0 });
    items.push({ p: o3(BEAN_HALL, 0.6, 0.85, -0.17), s: 1.3, bias: 0 });
    items.push({ p: new THREE.Vector3(PLAQUE_AT[0], PLAQUE_AT[1], PLAQUE_AT[2] - 0.06), s: 1.0, bias: -0.02 }); // spotlit plaque halo
    this.glows = new Glows(R, items, 0.9); // glows fade out within ~2 m of the lens (no glare blobs on the RIDE)
  }

  /** (re)aim the window shafts along the frozen world sun (once per sun) */
  private aimSun(sunDir: THREE.Vector3) {
    const key = sunDir.toArray().map((x) => x.toFixed(4)).join(",");
    if (key === this.sunKey) return;
    this.sunKey = key;
    const d = sunDir.clone().negate().normalize(); // light TRAVEL direction
    const hall = WINDOWS.find((w) => w.place === "hall");
    if (hall) {
      const U = new THREE.Vector3().crossVectors(UP, v(hall.n)).normalize();
      this.hallBeam.set(v(hall.c), U, UP, hall.w, hall.h, d, 13); this.hallMotes.follow(this.hallBeam);
    }
    WINDOWS.filter((w) => w.place === "museum").forEach((w, i) => {
      if (i >= this.muBeams.length) return;
      const U = new THREE.Vector3().crossVectors(UP, v(w.n)).normalize();
      this.muBeams[i].set(v(w.c), U, UP, w.w, w.h, d, 11); this.muMotes[i].follow(this.muBeams[i]);
    });
  }

  update(id: number, t: number, f: number, _cam: THREE.PerspectiveCamera, sunDir: THREE.Vector3, look: LookDef) {
    const place = SHOTS[id - 1].place;
    const K = fkAt(id, f), sun = look.light.sunCol;
    const inHall = place === "hall", inMu = place === "museum", inArm = place === "arm";
    if (inHall || inMu) this.aimSun(sunDir);
    // ---- hallway shaft + motes ----
    if (inHall) {
      const p = id === 1 ? beanHallAt(t) : ([BEAN_HALL[0] + 1.6 * endAt(id, t).exit, 0, BEAN_HALL[2]] as V3);
      this.hallBeam.cyl([[p[0], p[2], 0.27, id === 3 ? 1.62 : 1.36], [0, 0, 0, 0], [0, 0, 0, 0]]);
    }
    this.hallBeam.look(tint(sun, [1.0, 0.86, 0.62], this.c), inHall ? 0.7 * K.hall : 0, t);
    this.hallMotes.look(tint(sun, [1, 0.9, 0.7], this.c), inHall ? 1.0 * K.motes : 0, t);
    // ---- museum shafts + motes ----
    this.muBeams.forEach((b, i) => b.look(tint(sun, [1.0, 0.82, 0.55], this.c), inMu ? 0.75 * K.mu : 0, t + i * 3.1));
    this.muMotes.forEach((m) => m.look(tint(sun, [1, 0.88, 0.62], this.c), inMu ? 1.2 * K.motes : 0, t));
    // ---- the stage spotlight (pun) ----
    const spotK = inMu ? K.spot : 0;
    this.spot.look(this.c.setRGB(1.0, 0.86, 0.6), 0.3 * spotK); // (cam) 0.9 -> 0.3: the plaque camera looks THROUGH the cone (885 washed out to beige)
    this.spotPool.set(this.spotFloor, 0.62, 0.62, this.c2.setRGB(1.0, 0.82, 0.55), 0.5 * spotK);
    // ---- the arm: light through the skin roof ----
    const a = armAt(id, t);
    const skinK = !inArm ? 0 : id === 2 ? 0.8 * K.skin * (0.35 + 0.65 * a.skin) * (1 - 0.92 * a.shadow) : K.skin * 0.6; // (qa1) shot 2: less wash, the door-frame shadow kills the haze
    this.skinBeam.look(tint(sun, [1.0, 0.72, 0.56], this.c), 1.0 * skinK, t);
    this.skinPool.set(o3(ARM, 0.15, 0.03, 0.05), 1.7, 1.3, tint(sun, [1.0, 0.7, 0.52], this.c2), 0.55 * skinK);
    // ---- glows ----
    const sp = surgeSpan(id, t), su = surgeAt(id, t);
    let anyG = false;
    const warm = this.c.setRGB(1.0, 0.72, 0.38);
    for (let i = 0; i < NL; i++) {
      const L = LAMPS[i]; let k = 0;
      if (inArm) {
        // shot 2: Pinky Town's streetlamps twinkle far off; shot 4: every lamp the surge front has passed blazes, then settles
        const town = L.p[0] > TOWN_X ? 1 : 0, tw = 0.85 + 0.15 * Math.sin(t * 2.3 + i * 1.7);
        if (id === 2) k = town * 0.5 * K.town * tw;
        else if (id === 4) {
          const on = smooth((sp.hi - L.u) / 0.04) * smooth((L.u - sp.lo) / 0.04);
          k = on * (0.7 + 0.8 * su.allOn) * (1 - 0.35 * su.calm) + town * 0.6 * K.town * tw * (1 - on * 0.5);
        }
      }
      this.glows.col(G_LAMP + i, warm, 0.55 * k); anyG ||= k > 0.003;
    }
    const townK = inArm ? (id === 2 ? 0.25 : 1) * K.town : 0;
    this.glows.col(G_TOWN, this.c2.setRGB(1.0, 0.62, 0.36), 0.18 * townK); anyG ||= townK > 0.01;
    // the dent's cold spark glow (shot 2 "live"): two levels alternating every 2 frames, never a strobe
    const flick = Math.floor(f / 2) % 2 === 0 ? 1 : 0.82;
    const sparkK = inArm && id === 2 ? K.spark * a.spark * flick : 0;
    this.glows.col(G_SPARK, this.c2.setRGB(0.55, 0.85, 1.25), 0.9 * sparkK); anyG ||= sparkK > 0.003;
    // the PEAK: a cold electric rim glow behind BEAN (buzzing between two levels)
    const pk = peakAt(id, t), peakK = inHall ? K.peak * pk.zap * (pk.buzz > 0.25 ? 1 : 0.86) * (1 - 0.3 * pk.settle) : 0;
    this.glows.col(G_PEAK, this.c2.setRGB(0.35, 0.7, 1.3), 0.75 * peakK);
    this.glows.col(G_PEAK + 1, this.c2.setRGB(0.4, 0.8, 1.3), 0.45 * peakK);
    this.glows.col(G_PEAK + 2, this.c2.setRGB(0.4, 0.8, 1.3), 0.45 * peakK); anyG ||= peakK > 0.003;
    this.glows.col(G_PLAQ, this.c2.setRGB(1.0, 0.85, 0.55), 0.12 * spotK); // (cam) 0.35 -> 0.12 anyG ||= spotK > 0.003;
    this.glows.commit(anyG);
  }
}
