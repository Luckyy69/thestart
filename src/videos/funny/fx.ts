// OWNER: props/fx agent. Every EFFECT card (unlit Canvas2D cards, camera-facing): the hallway BONK + splinters + the
// flying sock + pinky zing squiggles + the X-RAY window (shot 1), sweat + "WHAM!" + dust + crackle arcs at the dent
// (shot 2), the PEAK's bolts / "ZZZAP!" / laundry blast / smoke (shot 3), the lightning FRONTS racing along the cable +
// lamp twinkles + "AAAAA!" / "aa" + the "fine." sparkle (shot 4), "BA-DUM-TSS" + laughing "HA" puffs + dust (shot 5),
// the offscreen BONK + "zzt" (shot 6). world.ts appends fxAt() to the cast's fx list. Drawings: fx_draw.ts.
// RULES: no pops (every card scales or fades in/out with env / spring), everything a pure function of (id, t) (seeded;
// redraw variants on frame PAIRS: a two-drawing buzz, never a strobe), every effect is GONE before its shot's outgoing
// dissolve (shot 2's crackle runs into the ONE hard cut on purpose), cards stay >= 0.6 m off the lens. Lettering that
// could hit walls sits on the view ray (toward / scr / pull), so it never clips into geometry.
import * as THREE from "three";
import { Pen } from "../bridge/toon";
import { CamInfo, FxPlace } from "../bridge/cast";
import { V3, ARM, BEAT, FPS, W, SHOTS, camAt, clamp01, smooth, hookAt, armAt, peakAt, surgeAt, museumAt, endAt } from "./story";
import { JAMB_HIT, PORTRAITS } from "./sets";
import { cablePt, surgeSpan, ELBOW_U, ROOF_Y, roofDent, LAMPS } from "./arm";
import { headAt, beanHallAt, ELBOW_HALL, PINKY_AT, RING_AT } from "./cast";
import { PLAQUE_AT, PLAQUE_SIZE } from "./props";
import * as D from "./fx_draw";

const T = (f: number) => f / FPS;
const q = (v: number, n = 120) => Math.round(v * n) / n;
/** in/out envelope with a little overshoot on the way in (0 outside [t0, t1 + dout]) */
const env = (t: number, t0: number, t1: number, din = 0.15, dout = 0.2) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.22 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};
/** underdamped spring 0 -> 1 (s = seconds since the trigger) */
const spring = (s: number, w = 16, d = 6) => (s <= 0 ? 0 : 1 - Math.exp(-d * s) * Math.cos(w * s));
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

// ---------------- view (the shot's camera at this frame) ----------------
type View = { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; th: number };
let VIEW: View = { pos: new THREE.Vector3(), fwd: new THREE.Vector3(0, 0, -1), right: new THREE.Vector3(1, 0, 0), up: new THREE.Vector3(0, 1, 0), th: 0.4 };
const setView = (id: number, t: number, cam: CamInfo) => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, Math.round(t * FPS))));
  const fwd = new THREE.Vector3(c.look[0] - cam.pos.x, c.look[1] - cam.pos.y, c.look[2] - cam.pos.z).normalize();
  const right = cam.right.clone().normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  VIEW = { pos: cam.pos.clone(), fwd, right, up, th: Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) };
};
const v3 = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];
/** a world point at screen fraction (sx 0 = left .. 1 = right, sy 0 = top .. 1 = bottom), depth d along the view */
const scr = (sx: number, sy: number, d: number): V3 => {
  const hy = VIEW.th * d, hx = hy * (9 / 16);
  return v3(VIEW.pos.clone().addScaledVector(VIEW.fwd, d).addScaledVector(VIEW.right, (sx * 2 - 1) * hx).addScaledVector(VIEW.up, (1 - sy * 2) * hy));
};
/** the frame width (m) at depth d */
const fw = (d: number) => 2 * Math.max(0.05, d) * VIEW.th * (9 / 16);
const depthOf = (P: V3) => new THREE.Vector3(...P).sub(VIEW.pos).dot(VIEW.fwd);
/** P moved along its view ray to depth d (same screen position, clear of the walls behind it) */
const toward = (P: V3, d: number): V3 => {
  const v = new THREE.Vector3(...P).sub(VIEW.pos), z = v.dot(VIEW.fwd);
  return z > 0.05 ? v3(VIEW.pos.clone().addScaledVector(v, d / z)) : P;
};
/** P pulled k metres toward the lens (never closer than ~0.65 m) */
const pull = (P: V3, k: number): V3 => {
  const v = new THREE.Vector3(...P).sub(VIEW.pos), l = v.length(), nl = Math.max(Math.min(l, 0.65), l - k);
  return v3(VIEW.pos.clone().addScaledVector(v, nl / Math.max(1e-6, l)));
};
/** offset P in screen axes (metres) */
const sh = (P: V3, x: number, y: number): V3 => v3(new THREE.Vector3(...P).addScaledVector(VIEW.right, x).addScaledVector(VIEW.up, y));
/** keep a card (centre P, w x h) inside the frame, clear of the edges, the watermark row and the captions band */
const fit = (P: V3, w: number, h: number): V3 => {
  const v = new THREE.Vector3(...P).sub(VIEW.pos), z = v.dot(VIEW.fwd);
  if (z < 0.3) return P;
  const hy = VIEW.th * z, hx = hy * (9 / 16), x = v.dot(VIEW.right), y = v.dot(VIEW.up);
  const mx = hx * 0.94 - w / 2, top = hy * 0.76 - h / 2, bot = -hy * 0.12 + h / 2;
  const nx = mx > 0 ? Math.max(-mx, Math.min(mx, x)) : 0, ny = top > bot ? Math.max(bot, Math.min(top, y)) : y;
  // the further off frame the true spot is (the camera moved on), the less we pull it in: continuous, never a jump
  const k = (1 - smooth((Math.abs(x) - hx * 0.8) / (hx * 0.2 + w))) * (1 - smooth((Math.abs(y) - hy * 0.8) / (hy * 0.2 + h)));
  return sh(P, (nx - x) * k, (ny - y) * k);
};

// ---------------- emit ----------------
let OUT: FxPlace[] = [];
const card = (key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, h: number, o: { rot?: number; soft?: boolean } = {}) => {
  if (Math.abs(w) < 0.004 || Math.abs(h) < 0.004) return;
  if (new THREE.Vector3(...P).distanceTo(VIEW.pos) < 0.6) return; // never a card in the lens
  OUT.push({ key, cw, ch, draw, x: P[0], y: P[1], z: P[2], w, h, ...o });
};
const SPARK_COLS = ["#fff6a8", "#ffffff", "#9af0ff"];
const spark = (col: string, P: V3, s: number, rot: number) => card(`fx|spark|${col}`, 256, 256, (p) => D.fxSpark(p, col), P, s, s, { rot });
/** twinkles round C (screen axes), living over [t0, t1] */
const twinkles = (t: number, t0: number, t1: number, C: V3, spread: number, n: number, seed: number, size: number, cols = SPARK_COLS) => {
  const g = env(t, t0, t1, 0.12, 0.2);
  if (g < 0.02) return;
  for (let j = 0; j < n; j++) {
    const ph = ((t - t0) * 1.6 + D.rnd(seed, j)) % 1, s = size * g * Math.pow(Math.sin(Math.PI * ph), 2) * (0.7 + 0.6 * D.rnd(seed, j + 20));
    spark(cols[j % cols.length], sh(C, (D.rnd(seed, j + 40) - 0.5) * 2 * spread, (D.rnd(seed, j + 60) - 0.5) * 1.6 * spread), s, t * 0.8 + j);
  }
};
const pair = (t: number) => Math.floor(Math.round(t * FPS) / 2); // a new drawing every 2 frames (buzz, not strobe)

// ======================================================================================================== shot 1
const hookFx = (t: number) => {
  const h = hookAt(1, t), s0 = t - T(BEAT.whack1);
  // BONK! at the jamb: springs in on the hit, holds, shrinks out (gone by ~f 33)
  const bk = env(t, T(BEAT.whack1) - 0.05, T(BEAT.whack1) + 0.45, 0.05, 0.2) * (s0 > -0.01 ? Math.min(1.12, spring(s0 + 0.04, 22, 7)) : 0);
  if (bk > 0.02) {
    const d = depthOf(JAMB_HIT), w = Math.min(0.5, fw(d) * 0.36), P = fit(sh(toward(JAMB_HIT, d - 0.25), w * 0.22, w * 0.25), w, w);
    card("fx|lines|bonk", 512, 512, (p) => D.fxLines(p, 3), toward(P, d - 0.2), w * 1.5 * bk, w * 1.5 * bk, { rot: 0.2 });
    card("fx|bonk", 512, 512, (p) => D.fxImpact(p, "#ffe14a", "#fff8c8", "BONK!", "#ff3a4a", 2), P, w * bk, w * bk, { rot: -0.12 + 0.05 * Math.sin(t * 30) });
  }
  // splinters + white paint chips fly off the jamb (ballistic, spinning, shrinking away)
  if (s0 > 0 && s0 < 0.75) {
    const k = Math.sin(Math.PI * Math.min(1, s0 / 0.75)) ** 0.5;
    for (let j = 0; j < 6; j++) {
      const a = 0.3 + 0.9 * D.rnd(4, j), v = 1.2 + 0.8 * D.rnd(5, j), dir = j % 2 ? -1 : 1;
      const P = add(JAMB_HIT, [dir * Math.cos(a) * v * s0 * 0.45 - 0.04, Math.sin(a) * v * s0 * 0.8 - 2.6 * s0 * s0, 0.1 + 0.3 * s0]);
      if (j < 3) card(`fx|splinter|${j}`, 128, 256, (p) => D.fxSplinter(p, j), P, 0.035 * k, 0.07 * k, { rot: s0 * 14 * dir + j });
      else card(`fx|chip|${j}`, 128, 128, (p) => D.fxChip(p, j), P, 0.03 * k, 0.03 * k, { rot: s0 * 9 * dir + j });
    }
  }
  // the SOCK: off the top of the basket, up, tumbling, lands on his head (the cast shows it there from f 40)
  if (h.sock > 0 && h.sock < 1) {
    const u = h.sock, B = beanHallAt(t), A: V3 = [B[0] + 0.12, 0.95, B[2] + 0.22], Hd = add(headAt(1, t), [0.0, 0.2, 0.03]);
    const P: V3 = [A[0] + (Hd[0] - A[0]) * u + 0.22 * Math.sin(Math.PI * u), A[1] + (Hd[1] - A[1]) * u + 0.6 * Math.sin(Math.PI * u), A[2] + (Hd[2] - A[2]) * u];
    const k = smooth(u / 0.12);
    card("fx|sock", 256, 256, D.fxSock, P, 0.17 * k, 0.17 * k, { rot: (1 - u) * 9.5 + 0.15 });
  }
  // pinky zing squiggles by his hand (below the elbow)
  if (h.zing > 0.02) {
    const z = Math.min(1, h.zing), d = depthOf(ELBOW_HALL), E = toward(sh(ELBOW_HALL, -0.1, -0.2), d - 0.1), v = pair(t) % 2;
    card(`fx|zing|${v}`, 256, 256, (p) => D.fxZing(p, v), E, -0.16 * z, 0.16 * z, { rot: 0.9 });
  }
  // the X-RAY window over his elbow: springs open (102), the cable pulses on "nerve" (113); stays on as the DIVE portal
  if (h.xray > 0.005) {
    const s1 = t - T(BEAT.xray), k = Math.min(1.08, spring(s1 + 0.01, 14, 6)), d = depthOf(ELBOW_HALL);
    const pulse = q(h.pulse * (0.75 + 0.25 * Math.sin(t * 14)), 8), ph = h.pulse > 0 ? q(((t - W.nerve + 0.1) * 0.9) % 1, 20) : 0;
    card(`fx|xray|${pulse}|${ph}`, 1024, 1024, (p) => D.fxXray(p, pulse, ph), toward(ELBOW_HALL, d - 0.02), 0.34 * k, 0.34 * k);
    twinkles(t, T(BEAT.xray) + 0.05, T(BEAT.xray) + 0.3, toward(sh(ELBOW_HALL, 0.15, 0.14), d - 0.05), 0.05, 3, 11, 0.06);
  }
};

// ======================================================================================================== shot 2
const armFx = (t: number) => {
  const a = armAt(2, t), f = t * FPS, gap = cablePt(ELBOW_U);
  // the cable squeezes into the gap: it SWEATS (drops spring off both sides, fall, shrink)
  for (let j = 0; j < 6; j++) {
    const t0 = W.squeezes + 0.05 + j * 0.2, s = t - t0;
    if (s <= 0 || s > 0.6) continue;
    const k = Math.sin(Math.PI * s / 0.6) ** 0.6, sd = j % 2 ? 1 : -1, x0 = (j - 2.5) * 0.3;
    const P = pull([gap[0] + x0, gap[1] + 0.22 + 1.1 * s - 2.8 * s * s, gap[2] + 0.1], 0.3);
    card("fx|sweat", 200, 260, D.fxSweat, sh(P, sd * 0.35 * s, 0), 0.13 * k, 0.169 * k, { rot: sd * (0.3 + s) }); // (cam) 0.08 -> 0.13: readable from the +z gap camera
  }
  // the SLAM (378): WHAM! + action lines + skin-dust puffs squirting out from under the roof
  const s2 = t - T(BEAT.whack2);
  if (s2 > -0.02 && f < BEAT.whack2 + 26) {
    const k = env(t, T(BEAT.whack2) - 0.06, T(BEAT.whack2) + 0.45, 0.05, 0.3) * Math.min(1.12, spring(s2 + 0.07, 20, 6));
    const roof: V3 = [ARM[0], ARM[1] + ROOF_Y - roofDent(2, t, 0) - 0.1, ARM[2] + 0.4];
    const d = Math.min(1.8, depthOf(roof) * 0.5), w = fw(d) * 0.62;
    const WP = fit(sh(toward(roof, d), w * 0.6, w * 0.85), w, w); // (qa1) up-RIGHT: with the 3/4 whack camera the impact sits screen-left // (cam) up-left + smaller: the dented roof landing ON the cable stays visible
    card("fx|lines|wham", 512, 512, (p) => D.fxLines(p, 9), toward(WP, d + 0.2), w * 1.6 * k, w * 1.6 * k, { rot: 0.3 });
    card("fx|wham", 512, 512, (p) => D.fxImpact(p, "#ffffff", "#ffe14a", "WHAM!", "#ff3a4a", 5, 132), WP, w * k, w * k, { rot: 0.1 - 0.06 * Math.sin(t * 25) });
    if (s2 > 0 && s2 < 0.8) for (let j = 0; j < 6; j++) {
      const sd = j % 2 ? 1 : -1, u = s2 / 0.8, pk = Math.sin(Math.PI * u) ** 0.7;
      const P = pull([ARM[0] + sd * (0.8 + 0.9 * u + 0.1 * (j >> 1)), ARM[1] + ROOF_Y - 0.3 - 0.5 * u * u - 0.1 * (j >> 1), ARM[2] + 0.6 + 0.3 * (j >> 1)], 0.25);
      card(`fx|puff|skin|${j % 3}`, 256, 256, (p) => D.fxPuff(p, "#ffe2d0", "#f0b8a8", 20 + (j % 3)), P, 0.42 * pk, 0.42 * pk, { rot: u * 2 * sd });
    }
  }
  // the SPARKS build at the dent (405 -> the hard cut): arcs between the dented roof and the bare cable, twinkles, a
  // cyan glow and a little "zzt!" (all on frame pairs)
  if (a.spark > 0.01) {
    const sp = a.spark, v = pair(t), roofY = ARM[1] + ROOF_Y - roofDent(2, t, 0), n = Math.round(1 + 3 * sp);
    const gk = q(sp, 10);
    card(`fx|glow|cy|${gk}`, 256, 256, (p) => D.fxGlow(p, "#7ae8ff", 0.55 * gk), pull([gap[0], (gap[1] + roofY) / 2, gap[2]], 0.6), 1.5 * sp + 0.3, 1.5 * sp + 0.3, { soft: true });
    for (let j = 0; j < n; j++) {
      const r = (k: number) => D.rnd(v * 13 + j, k), x = (r(1) - 0.5) * 1.3 * (0.4 + sp);
      const y0 = gap[1] + 0.12, y1 = roofY - 0.05 - 0.4 * r(3) * (1 - sp), len = Math.max(0.2, y1 - y0);
      const P = pull([gap[0] + x, (y0 + y1) / 2, gap[2] + 0.12], 0.35), seed = (v * 3 + j) % 7;
      card(`fx|bolt|${seed}`, 512, 256, (p) => D.fxBolt(p, seed), P, len * (0.85 + 0.3 * r(4)), 0.1 + 0.07 * sp, { rot: Math.PI / 2 + (r(5) - 0.5) * 0.7 });
    }
    for (let j = 0; j < 2 + Math.round(5 * sp); j++) {
      const r = (k: number) => D.rnd(v * 7 + j + 100, k);
      spark(SPARK_COLS[j % 3], pull([gap[0] + (r(1) - 0.5) * 1.5, gap[1] + 0.1 + r(2) * 0.9, gap[2] + 0.2], 0.4), (0.05 + 0.08 * r(3)) * (0.5 + sp), r(4) * 3);
    }
    const zk = env(t, W.basically + 0.2, 99, 0.12, 0.2);
    if (zk > 0.02) {
      const d = Math.min(1.6, depthOf(gap) * 0.6), w = fw(d) * 0.3, zs = zk * (0.85 + 0.3 * sp);
      card(`fx|zzt|${v % 2}`, 512, 256, (p) => D.fxWordSm(p, "zzt!", "zzt", v % 2), fit(sh(toward(gap, d), w * 0.8, w * 0.5), w, w / 2), w * zs, w * 0.5 * zs, { rot: -0.1 });
    }
  }
};

// ======================================================================================================== shot 3
const LAUNDRY: [string, (p: Pen) => void][] = [["sock", D.fxSock], ["shirt", D.fxShirt], ["pants", D.fxPants], ["duck", D.fxDuck], ["sock", D.fxSock], ["shirt", D.fxShirt]];
const peakFx = (t: number) => {
  const pk = peakAt(3, t), s0 = t - T(BEAT.peak), v = pair(t) % 2, f = t * FPS;
  if (pk.zap < 0.01 || f >= 458) return;
  // everything is gone by 458 (the dissolve out): out-ramp 451 -> 457
  const out = 1 - smooth((f - 451) / 6), kin = Math.min(1.1, spring(s0 + 0.03, 22, 6)) * out;
  const head = headAt(3, t), dh = depthOf(head);
  // electric rays behind him (soft, behind the card)
  const ra = q(out, 10);
  card(`fx|rays|${ra}`, 1024, 1024, (p) => D.fxRays(p, "#7ae8ff", "#2a6aff", 0.3 * ra), toward(sh(head, 0, -0.05), dh + 0.14), fw(dh + 0.14) * 1.7 * kin, fw(dh + 0.14) * 1.7 * kin, { rot: t * 0.6, soft: true });
  // bolts crackling OUT of his silhouette (behind the card: it hides their roots), two drawings alternating
  for (let j = 0; j < 7; j++) {
    const a = (j / 7) * Math.PI * 2 + 0.35 + (v ? 0.22 : -0.1) + 0.15 * D.rnd(v + 3, j), r = 0.2 + 0.05 * D.rnd(v + 5, j), seed = (j + v * 7) % 9;
    const P = toward(sh(head, Math.cos(a) * r * 0.85, Math.sin(a) * r - 0.05), dh + 0.1), L = 0.22 + 0.06 * D.rnd(v, j);
    card(`fx|bolt|${seed}`, 512, 256, (p) => D.fxBolt(p, seed), P, L * kin, 0.1 * kin, { rot: a + (v ? 0.12 : -0.12) });
  }
  // ZZZAP! across the top (below the watermark row), springs in on the cut
  const zw = fw(1.0) * 0.86;
  card(`fx|zap|${v}`, 1600, 560, (p) => D.fxZap(p, v * 1.7 + 0.4), scr(0.55, 0.205, 1.0), zw * kin, zw * 0.35 * kin, { rot: -0.06 + (v ? 0.015 : -0.015) });
  // the laundry blasts out of the basket and off frame (tumbling)
  LAUNDRY.forEach(([nm, dr], j) => {
    const s = s0 - 0.025 * j;
    if (s <= 0 || s > 0.8) return;
    const sd = j % 2 ? 1 : -1, x = 0.5 + sd * (0.22 + 0.04 * j) + sd * (0.7 + 0.25 * D.rnd(8, j)) * s, y = 0.86 - (1.9 + 0.4 * D.rnd(9, j)) * s + 1.2 * s * s;
    const k = smooth(s / 0.06) * out, sz = fw(1.05) * (0.2 + 0.04 * (j % 3));
    card(`fx|${nm}`, 256, 256, dr, scr(x, y, 1.05 - 0.02 * j), sz * k, sz * k, { rot: sd * s * 11 + j });
  });
  // smoke curls off his blasted hair (soft), from 442
  for (let j = 0; j < 4; j++) {
    const s = t - T(442) - j * 0.06;
    if (s <= 0) continue;
    const u = clamp01(s / 0.5), a = q(Math.sin(Math.PI * u) * 0.85 * out, 10);
    if (a < 0.03) continue;
    card(`fx|smoke|${j % 2}|${a}`, 256, 256, (p) => D.fxSmoke(p, j % 2, a), toward(sh(head, (j - 1.5) * 0.09, 0.22 + 0.22 * u), dh - 0.08), 0.1 + 0.12 * u, 0.1 + 0.12 * u, { rot: u + j, soft: true });
  }
};

// ======================================================================================================== shot 4
/** when the surge front reaches each lamp (s), sampled once */
let HIT: number[] | null = null;
const hitTimes = () => {
  if (HIT) return HIT;
  const H = LAMPS.map(() => 99);
  for (let f = SHOTS[3].a - 10; f < SHOTS[3].b; f += 0.25) {
    const sp = surgeSpan(4, T(f));
    LAMPS.forEach((L, i) => { if (H[i] > 90 && L.u >= sp.lo && L.u <= sp.hi) H[i] = T(f); });
  }
  return (HIT = H);
};
const surgeFx = (t: number) => {
  const s = surgeAt(4, t), sp = surgeSpan(4, t), v = pair(t) % 2;
  // the lightning FRONTS racing both ways along the cable (glow + crackle ball + trailing twinkles)
  const fk = smooth(s.line * 12) * (1 - smooth((s.line - 0.9) / 0.1));
  if (fk > 0.02) for (const [u, sd] of [[sp.lo, 1], [sp.hi, -1]] as const) {
    const P = cablePt(u), d = depthOf(P);
    if (d < 0.8) continue;
    const sz = Math.min(1.1, fw(d) * 0.2) * fk;
    card("fx|glow|front", 256, 256, (p) => D.fxGlow(p, "#bff6ff", 0.95), pull(P, 0.25), sz * 2.4, sz * 2.4, { soft: true });
    card(`fx|front|${v}`, 512, 512, (p) => D.fxFront(p, v), pull(P, 0.35), sz, sz, { rot: v * 0.7 });
    for (let j = 1; j <= 3; j++) {
      const P2 = cablePt(Math.max(0, Math.min(1, u + sd * 0.012 * j))), k = sz * (0.55 - 0.13 * j) * (0.8 + 0.4 * D.rnd(pair(t), j));
      spark(SPARK_COLS[j % 3], pull(sh(P2, 0, (D.rnd(pair(t) + 9, j) - 0.5) * 0.3), 0.3), k, t * 4 + j);
    }
  }
  // the fronts arrive: a pop at the neck end and at Pinky Town's pole
  const ends = env(t, W.up - 0.25, W.up - 0.05, 0.08, 0.3);
  if (ends > 0.02) for (const u of [0, 1]) {
    const P = cablePt(u), d = depthOf(P);
    if (d < 0.8) continue;
    const w = Math.min(0.9, fw(d) * 0.16) * ends;
    card("fx|pop", 512, 512, (p) => D.fxImpact(p, "#bff6ff", "#ffffff", "", "", 8), pull(P, 0.3), w, w, { rot: t * 2 });
  }
  // every lamp twinkles as the front passes it
  const H = hitTimes();
  LAMPS.forEach((L, i) => {
    const s1 = t - H[i];
    if (s1 <= 0 || s1 > 0.45) return;
    const d = depthOf(L.p);
    if (d < 0.8) return;
    const k = Math.sin(Math.PI * s1 / 0.45) ** 0.7, w = Math.min(0.55, fw(d) * 0.07) * k;
    spark(i % 2 ? "#fff6a8" : "#ffffff", pull(L.p, 0.3), w, s1 * 6 + i);
  });
  // PINKY screams: AAAAA! (shaking) + zap squiggles round him; RING half-screams a small "aa"
  const pH = add(PINKY_AT, [0, 0.95, 0]), rH = add(RING_AT, [0, 0.95, 0]);
  const sk = env(t, W.pinky2 - 0.15, W.totally - 0.3, 0.1, 0.2);
  if (sk > 0.02) {
    const d = depthOf(pH), w = Math.min(1.3, fw(d) * 0.62), ph = pair(t) % 3;
    card(`fx|aaaa|${ph}`, 1400, 500, (p) => D.fxScream(p, "AAAAA!", ph * 1.3), fit(sh(pull(pH, 0.3), 0.05, 0.55 + w * 0.12), w, w * 0.36), w * sk, w * 0.36 * sk, { rot: -0.05 + 0.03 * Math.sin(t * 40) });
    for (const sd of [-1, 1]) card(`fx|zing|${v}`, 256, 256, (p) => D.fxZing(p, v), pull(sh(pH, sd * 0.3, 0.05), 0.2), sd * 0.28 * sk, 0.28 * sk, { rot: sd > 0 ? 0 : 0.3 });
  }
  const rk = env(t, W.pinky2 + 0.05, W.totally - 0.25, 0.12, 0.2) * Math.min(1, s.ring * 1.2 + 0.001);
  if (rk > 0.02) {
    const w = Math.min(0.8, fw(depthOf(rH)) * 0.34);
    card(`fx|aa|${pair(t) % 2}`, 1400, 500, (p) => D.fxScream(p, "aa", pair(t) % 2, true), pull(sh(rH, -0.12, 0.42), 0.3), w * rk, w * 0.36 * rk, { rot: 0.08 });
  }
  // "totally fine": the band-aid goes on (587): a calm twinkle + a tiny "fine." (gone by 600, before the rise)
  const bk = env(t, T(BEAT.bandaid) + 0.05, T(594), 0.12, 0.12);
  if (bk > 0.02) {
    const B = pull(add(PINKY_AT, [0.06, 0.6, 0.05]), 0.25), d = depthOf(B), w = fw(d) * 0.22;
    twinkles(t, T(BEAT.bandaid) + 0.05, T(593), B, 0.12, 3, 31, w * 0.5, ["#ffffff", "#fff6a8"]);
    card("fx|fine", 512, 256, (p) => D.fxWordSm(p, "fine.", "fine"), fit(sh(B, w * 1.3, w * 0.5), w * 2, w), w * 2 * bk, w * bk, { rot: -0.08 });
  }
};

// ======================================================================================================== shot 5
const HA: [string, string][] = [["HAW HAW!", "#6a2a1a"], ["TEE HEE!", "#7a2a5a"], ["HA HA HA!", "#1a3a6a"]];
const museumFx = (t: number) => {
  const m = museumAt(5, t);
  // the flip lands: a few gold twinkles round the plaque
  if (m.flip > 0) twinkles(t, T(BEAT.flip) + 0.15, T(BEAT.flip) + 0.4, pull(PLAQUE_AT, 0.1), PLAQUE_SIZE[0] * 0.6, 4, 41, 0.1, ["#fff6a8", "#ffffff", "#ffd23a"]);
  // BA-DUM-TSS: the kit pops in, the three beats land in rhythm (886 / +0.17 / +0.4 s), gone by ~922
  const rk = env(t, T(BEAT.rimshot) - 0.15, T(BEAT.rimshot) + 0.9, 0.12, 0.25); // (qa2) the kit is fully in BEFORE "ba" (886): it was ~10 % at 886
  if (rk > 0.02) {
    const s = t - T(BEAT.rimshot) + 0.07, stage = q(clamp01(s / 0.08) + clamp01((s - 0.17) / 0.08) + clamp01((s - 0.4) / 0.08), 4), crash = s > 0.4 ? q(Math.min(1, (s - 0.4) / 0.6), 12) : 0;
    const w = 0.46, P = add(PLAQUE_AT, [-0.04, 0.48, -0.015]); // (qa2) upper-left of the 3/4 plaque camera: it covered SKELLY's face; s +0.07: "BA" lands ON 886
    card(`fx|rim|${stage}|${crash}`, 1280, 520, (p) => D.fxRimshot(p, stage, crash), P, w * rk, w * 0.406 * rk, { rot: crash > 0 ? 0.04 * Math.sin(crash * 20) * (1 - crash) : 0 });
  }
  // the portraits LAUGH in turn: speech puffs + dust bursting out of the frames (all gone by 982, before the portal)
  const laughs = [m.laugh0, m.laugh1, m.laugh2];
  const starts = [T(BEAT.laugh), T(BEAT.laugh2) - 0.1, T(BEAT.laugh3) - 0.1];
  PORTRAITS.slice(0, 3).forEach((pt, i) => {
    if (laughs[i] <= 0) return;
    const s = t - starts[i], end = Math.min(starts[i] + 0.8, T(978)), k = env(t, starts[i], end, 0.12, 0.1);
    if (k < 0.02) return;
    // two puffs bob up beside the frame's top corner (screen-right = -z)
    for (let j = 0; j < 2; j++) {
      const sj = s - j * 0.28;
      if (sj <= 0) continue;
      const kj = Math.min(k, smooth(sj / 0.12) * (1 + 0.2 * Math.sin(Math.min(1, sj / 0.12) * Math.PI))), sc = j ? 0.8 : 1;
      const P = fit([pt.c[0] + 0.14 + 0.05 * j, (j ? pt.c[1] - 0.12 : pt.c[1] + pt.h / 2 - 0.05) + 0.1 * sj, pt.c[2] - (j ? 0.56 : 0.32)], 0.5 * sc, 0.3 * sc);
      const ph = q((t * 6 + j) % 6.283, 4);
      card(`fx|ha|${i}|${ph}`, 800, 480, (p) => D.fxHa(p, HA[i][0], HA[i][1], ph, 3 + i), P, 0.5 * kj * sc, 0.3 * kj * sc, { rot: (j ? 0.1 : -0.08) + 0.04 * Math.sin(t * 9 + j) });
    }
    // dust bursts out of the frame edges (soft)
    const u = clamp01(s / 0.9), a = q(Math.sin(Math.PI * u) * 0.65 * Math.min(1, k), 10);
    if (a >= 0.03) for (let j = 0; j < 5; j++) {
      const an = (j / 5) * Math.PI * 2 + 0.5, P: V3 = [pt.c[0] + 0.1 + 0.03 * j, pt.c[1] + Math.sin(an) * (pt.h / 2 + 0.05) * (1 + 0.4 * u), pt.c[2] + Math.cos(an) * (pt.w / 2 + 0.05) * (1 + 0.5 * u)];
      card(`fx|dust|${j % 3}|${a}`, 256, 256, (p) => D.fxDust(p, j % 3, a), P, 0.22 + 0.3 * u, 0.22 + 0.3 * u, { soft: true, rot: j });
    }
  });
};

// ======================================================================================================== shot 6
const endFx = (t: number) => {
  const e = endAt(6, t), s0 = t - T(BEAT.bonk), f = t * FPS;
  if (e.bonk <= 0 || f > 1070) return;
  // the offscreen BONK at the right frame edge (half cut off by the frame), then a tiny "zzt"; gone by 1070
  const k = env(t, T(BEAT.bonk) - 0.01, T(1063), 0.05, 0.18) * Math.min(1.12, spring(s0 + 0.01, 22, 7));
  const d = 1.7, w = fw(d) * 0.34;
  card("fx|lines|bonk", 512, 512, (p) => D.fxLines(p, 3), scr(1.0, 0.5, d + 0.1), w * 1.2 * k, w * 1.2 * k, { rot: 0.2 });
  card("fx|bonk", 512, 512, (p) => D.fxImpact(p, "#ffe14a", "#fff8c8", "BONK!", "#ff3a4a", 2), scr(0.95, 0.5, d), w * k, w * k, { rot: 0.15 });
  const zk = env(t, T(BEAT.bonk) + 0.12, T(1065), 0.1, 0.12);
  if (zk > 0.02) card(`fx|zzt|${pair(t) % 2}`, 512, 256, (p) => D.fxWordSm(p, "zzt", "zzt", pair(t) % 2), scr(0.8, 0.38, d - 0.1), w * 0.7 * zk, w * 0.35 * zk, { rot: -0.15 });
};

export const fxAt = (id: number, t: number, cam: CamInfo): FxPlace[] => {
  OUT = [];
  setView(id, t, cam);
  if (id === 1) hookFx(t);
  else if (id === 2) armFx(t);
  else if (id === 3) peakFx(t);
  else if (id === 4) surgeFx(t);
  else if (id === 5) museumFx(t);
  else if (id === 6) endFx(t);
  return OUT;
};
