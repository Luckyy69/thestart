// OWNER: cast agent. Every human character and effect card per shot.
// Characters are bridge cards (person/bodyFront) with accessories painted onto the SAME canvas (fx.ts: slouch hats,
// the major's peaked cap + handlebar moustache (tips follow his mood), Sam Browne belt, braces + rolled sleeves,
// pitchfork / white flag / thumbs-up, telephone earpiece, binoculars). Effect cards: "?" "!" pops, sweat, poof clouds,
// dust, speed lines, the RING RING burst, sparkles, the major's thought bubble and the NEWSPAPER.
// Layout contract (anchors in story.ts; ground y = 0; every standing card has its soles on y = 0):
//   shot 1  soldier (rifle, pinned slouch hat) at FARM+(-1.0,0,0.2); the emu should stand at FARM+(1.0,0,-0.2)
//   shot 2  the hatless soldier at FARM+(-0.45,0,0.15); the hatted emu at FARM+(0.45,0,-0.1)
//   shot 3  four soldiers -> (poof on "farmers") -> farmers at FARM+(-19.4,0,-24.4) (-18.2,0,-23.5) (-16.9,0,-24.6) (-15.7,0,-23.7)
//   shot 4  three farmers at FARM+(17.0,0,32.5) (19.2,0,33.4) (18.1,0,31.2) (the wave beyond them, toward -z)
//   shot 5  OFFICE: the major behind the desk at OFFICE+(-0.1,0,-0.8); RING burst over the phone at PHONE (below)
//   shot 6  line-up: major FARM+(0,0,0.3), soldiers FARM+(-1.05,0,0) (1.05,0,0); keep guns/crates clear of x -1.5..1.5, z -0.4..0.8
//   shot 7  the major's close-up at FARM+(0,0,0): head centre 1.39 m, crown 1.63, cap top ~1.72
//   shots 8-9  the ambush team behind the bush at HIDE (bush radius <= 1.0 m): gunner HIDE+(-0.9,0,1.35),
//           major HIDE+(-1.85,0,1.0), soldier HIDE+(-1.4,0,1.9); the Lewis gun expected at HIDE+(-0.45,0,1.0) on a
//           tripod, barrel ~1.0 m up, pointing at DAM
//   shots 10-11  truck riders in the truck frame (x = ROAD.x + chaseAt().truckX, z = ROAD.z, front +x, y + truckBump(t)):
//           driver seat base (0.45, 0.90, -0.38), major seat base (0.45, 0.90, 0.38) (seat top 0.99), gunner standing on
//           the tray deck at (-1.4, 1.05, 0); Lewis gun pivot expected at (-0.85, 2.0, 0)
//   shot 13 the soldier with binoculars at FARM+(-0.55,0,0.1); the camouflaged emu at FARM+(0.3,0,-0.2)
//   shot 14 the army trudges home from ROAD+(0,0,0) along (0.82,0,0.57) at 0.75 m/s (major centre, soldiers +-0.85 m
//           sideways, 0.4 m behind); the waving emus belong behind them (ROAD x < -3)
//   shot 15 OFFICE: the major at OFFICE+(-0.1,0,-0.8) (thought bubble above his head, screen right)
//   shot 16 the NEWSPAPER card spins in at FARM+(0,1.22,0.45) (0.6 x 0.8 m)
//   shot 17 the beaten army at SCORE+(-1.2,0,3.0) (major, white flag) (-1.75,0,2.3) (-0.65,0,2.2)
import { Stage, CamInfo, Who, Place, person, blob, prepStage, lidAt, hh, q, SU } from "../bridge/cast";
import { Pen, SKINS, Outfit, Expr, FrontOpts } from "../bridge/toon";
import { truckToWorld } from "./props";
import { W, LEAD, FARM, DAM, HIDE, ROAD, OFFICE, SCORE, smooth, clamp01, V3, chaseAt, jamAt } from "./story";
import { Acc, accKey, accFront, geoOf, Geo, CardMode, mouthPt, KHAKI, KHAKI_D, FELT,
  fxQuestion, fxBang, fxSweat, fxDust, fxPoof, fxSpeed, fxSparkle, fxRing, fxThought, fxNews, NEWS_CW, NEWS_CH } from "./fx";

/** where the candlestick telephone stands on the office desk (props): the RING burst floats 0.38 m above it */
export const PHONE: V3 = [OFFICE[0] + 0.42, 0.76, OFFICE[2] + 0.12];
/** truck body bounce on the ruts (m), shots 10-11: props should add this to the truck's y so the riders stay seated */
void DAM;

const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1; // same head-shape seed as bridge/cast person()
const on = (t: number, word: number) => t >= word - LEAD;
const spring = (t: number, word: number, dur = 0.3) => { const u = clamp01((t - (word - LEAD)) / dur); return smooth(u) * (1 + 0.18 * Math.sin(u * Math.PI)); };
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: { flat?: boolean; rot?: number; soft?: boolean } = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
/** screen-sideways sign of (x,z) -> (tx,tz) for pupils */
const lookTo = (cam: CamInfo, x: number, z: number, tx: number, tz: number) => Math.sign((tx - x) * cam.right.x + (tz - z) * cam.right.z);

type Look = { expr: Expr; look?: number; tilt?: number; wave?: number; swaps?: number[]; blink?: number; phase?: number };
/** one character with painted accessories; mode stroll = walking toward the camera at `phase` */
const dude = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, acc: Acc, x: number, y: number, z: number,
  mode: CardMode, L: Look, sc = 1, shadow = mode !== "sit"): Place => {
  const who: Who = { i, o, okey };
  const phase = mode === "stroll" ? q(L.phase ?? 0, 12) : 0;
  const a2: Acc = { ...acc, wave: L.wave, rifle: o.rifle };
  const fo: FrontOpts = { mode, phase, expr: L.expr, blink: L.blink ?? lidAt(t, i, L.swaps ?? []), look: L.look ?? 0, tilt: L.tilt ?? 0, wave: L.wave };
  const g = geoOf(seedOf(i), mode, 0, o.build ?? "adult", phase);
  const pl = person(cam, who, x, y, z, { side: false, mirror: false }, fo, {}, sc);
  const rotA = (((L.tilt ?? 0) + g.sway) * Math.PI) / 180, inner = pl.draw, hipY = g.hipY;
  const colors = { jacket: o.jacket, pants: o.pants, boots: o.boots, skin: o.skin ?? SKINS[0] };
  pl.key += `|${okey}|${accKey(a2)}`;
  pl.draw = (p: Pen) => {
    inner(p);
    p.rot = rotA ? [rotA, 300, hipY] : null;
    accFront(p, g, a2, colors);
    p.rot = null;
  };
  out.places.push(pl);
  if (shadow) blob(out, x, y, z, sc);
  return pl;
};
const G0 = geoOf(1, "stand"), GS = geoOf(1, "stand", 0, "stout");
/** height (m) of the crown above the soles */
const crownY = (g: Geo = G0, sc = 1) => (975 - g.crown) * SU * sc;
/** a pop card ("?" / "!") over a head: springs in on `word`, optional fade-out at `until` */
const pop = (out: Stage, t: number, i: number, x: number, y: number, z: number, word: number, bang = false, size = 1, until = 99) => {
  const k = spring(t, word) * (1 - smooth((t - until) / 0.2));
  if (k <= 0.01) return;
  const bob = 0.02 * Math.sin(t * 5 + i);
  fxCard(out, bang ? "bang" : "qmark", 300, 400, bang ? fxBang : fxQuestion, x, y + bob + 0.06 * k, z, 0.21 * k * size, 0.28 * k * size, { rot: 0.14 * Math.sin(t * 3 + i * 1.7) });
};
const sweat = (out: Stage, t: number, i: number, x: number, y: number, z: number, cam: CamInfo, from = -99) => {
  if (t < from) return;
  const ph = (((t - from) * 0.9 + hh(i, 4)) % 1), k = smooth(ph / 0.15) * (1 - smooth((ph - 0.75) / 0.25)) * smooth((t - from) / 0.15);
  if (k < 0.02) return;
  const s = hh(i, 5) < 0.5 ? -1 : 1, ox = 0.2 * s;
  fxCard(out, "sweat", 200, 260, fxSweat, x + cam.right.x * ox, y - 0.12 * ph, z + cam.right.z * ox, 0.07 * k, 0.09 * k);
};
const sparkles = (out: Stage, t: number, t0: number, x: number, y: number, z: number, cam: CamInfo, n = 3, size = 0.16, spread = 0.25) => {
  if (t < t0 - LEAD) return;
  const k = smooth((t - (t0 - LEAD)) / 0.2);
  for (let j = 0; j < n; j++) {
    const u = q(((t - t0) * 1.4 + j * 0.31) % 1, 24), s = (j % 2 ? 1 : -1) * spread * (0.6 + 0.4 * hh(j, 71));
    fxCard(out, `spark${u}`, 240, 240, (p) => fxSparkle(p, u), x + cam.right.x * s, y + 0.1 * j, z + cam.right.z * s, size * k, size * k);
  }
};
/** soft dust puff at the feet (t0 = when, life ~0.7 s) */
const dustAt = (out: Stage, t: number, t0: number, x: number, z: number, j: number, size = 0.8, col = "#c99a6a") => {
  const u = (t - t0) / 0.7;
  if (u <= 0 || u >= 1) return;
  const k = smooth(u / 0.25), fade = 1 - smooth((u - 0.35) / 0.65), a = q(0.5 * fade, 10);
  if (a <= 0.02) return;
  fxCard(out, `dust${j % 4}|${a}|${col}`, 256, 256, (p) => fxDust(p, j % 4, col, a), x, 0.25 + 0.25 * u, z, size * (0.6 + 0.5 * k), size * 0.75 * (0.6 + 0.5 * k), { soft: true, rot: hh(j, 44) * 3 });
};

// ---------------- outfits ----------------
const HAIR = ["#3a2a20", "#1d1a1a", "#5a3b2a", "#7a5a3a", "#2a2220"];
/** a soldier (khaki, slouch hat with the side brim pinned up) */
const SOLDIER = (v: number, rifle = false): Outfit => ({ jacket: KHAKI, pants: KHAKI_D, boots: "#4a3020", hat: "slouch", skin: SKINS[(v * 3 + 1) % 4], belt: null, rifle, moustache: v % 3 === 2 ? "#3a2a20" : undefined });
const SOLDIER_ACC: Acc = { slouch: FELT, pinned: true, webbing: true };
const HATLESS = (v: number): Outfit => ({ ...SOLDIER(v), hat: "hair", hair: HAIR[v % 5] });
const MAJOR: Outfit = { jacket: "#b89c62", pants: "#9a8458", boots: "#3a2216", hat: "peaked", skin: "#f6c6a6", belt: null, build: "stout" };
const majorAcc = (mood: number, extra: Acc = {}): Acc => ({ cap: true, officer: true, tache: q(mood, 4), ...extra });
const SHIRTS = ["#eee6d2", "#6f93c4", "#c46a52", "#d9c27a"];
const FARMER = (v: number): Outfit => ({ jacket: SHIRTS[v % 4], pants: ["#7a6a4a", "#3f5a7a", "#6a5a44"][v % 3], boots: "#4a3020", hat: "slouch", skin: SKINS[(v * 3 + 2) % 4], belt: null, moustache: v % 4 === 1 ? "#5a3b2a" : undefined });
const farmerAcc = (v: number, extra: Acc = {}): Acc => ({ slouch: ["#8e7250", "#a88a5c", "#6e5a44", "#9c7a4a"][v % 4], braces: ["#5a3b2a", "#2f3a5a", "#7a2a2a", "#3a3a3a"][v % 4], rolled: FARMER(v).skin, ...extra });

// ---------------- shot 1-2: the standoff, then the hat ----------------
const standoff = (id: number, t: number, cam: CamInfo, out: Stage) => {
  if (id === 1) {
    const x = FARM[0] - 1.0, z = FARM[2] + 0.2;
    const lk = lookTo(cam, x, z, FARM[0] + 1.0, FARM[2] - 0.2);
    const twitch = on(t, W.birds) ? 0 : q(0.6 * Math.max(0, Math.sin(t * 13)) * smooth((t - 1.2) / 0.4) * (1 - smooth((t - 1.9) / 0.2)), 4);
    dude(out, cam, t, 1, SOLDIER(0, true), "s0r", SOLDIER_ACC, x, 0, z, "stand",
      { expr: on(t, W.birds) ? "shock" : on(t, W.war) ? "stern" : "neutral", look: lk, tilt: twitch, swaps: [W.war, W.birds] });
    sweat(out, t, 1, x, 1.5, z, cam, W.war);
    pop(out, t, 1, x + 0.05, crownY() + 0.42, z, W.birds, true);
  } else {
    const x = FARM[0] - 0.45, z = FARM[2] + 0.15;
    const lk = on(t, W.lost) ? 0 : lookTo(cam, x, z, FARM[0] + 0.45, FARM[2] - 0.1);
    dude(out, cam, t, 1, HATLESS(0), "s0h", { webbing: true }, x, 0, z, "stand", { expr: on(t, W.lost + 0.5) ? "neutral" : on(t, W.lost) ? "nervous" : "neutral", look: lk, swaps: [W.lost, W.lost + 0.5] });
    pop(out, t, 1, x + 0.04, crownY() + 0.28, z, W.lost);
    sweat(out, t, 1, x, 1.42, z, cam, W.lost + 0.3);
  }
};

// ---------------- shot 3: soldiers -> farmers (poof!) ----------------
const F3: [number, number][] = [[-19.4, -24.4], [-18.2, -23.5], [-16.9, -24.6], [-15.7, -23.7]];
const farmers3 = (t: number, cam: CamInfo, out: Stage) => {
  F3.forEach(([px, pz], k) => {
    const x = FARM[0] + px, z = FARM[2] + pz, i = 20 + k, tw = W.farmers - 0.12 + 0.07 * k; // poof peak
    const farmer = t >= tw;
    if (!farmer) {
      dude(out, cam, t, i, SOLDIER(k + 1), `s${k + 1}`, SOLDIER_ACC, x, 0, z, "stand",
        { expr: on(t, W.soldiers) ? (k % 2 ? "stern" : "smile") : "neutral", wave: on(t, W.soldiers) ? 0 : undefined, swaps: [W.soldiers] });
    } else {
      const tl = t - tw, hop = 0.07 * Math.max(0, Math.sin(tl * 9 + k)) * Math.exp(-tl * 1.5);
      dude(out, cam, t, i, FARMER(k), `f${k}`, farmerAcc(k, k === 1 ? { straw: true } : k % 2 === 0 ? { fork: true } : {}), x, hop, z, "stand",
        { expr: (["grin", "smile_closed", "laugh", "grin"] as Expr[])[k], wave: k % 2 === 0 ? q(0.3 + 0.2 * Math.sin(t * 4 + k), 10) : undefined, swaps: [tw + 0.02] });
    }
    // the poof: springs to cover the whole body, holds the swap, shrinks away
    const u = (t - (tw - 0.12)) / 0.62;
    if (u > 0 && u < 1) {
      const k1 = u < 0.2 ? smooth(u / 0.2) * (1 + 0.15 * Math.sin((u / 0.2) * Math.PI)) : 1 - smooth((u - 0.45) / 0.55);
      if (k1 > 0.02) fxCard(out, `poof${k % 3}`, 512, 400, (p) => fxPoof(p, k % 3), x, 0.85, z, 1.55 * k1, 1.75 * k1, { rot: 0.2 * (k % 2 ? 1 : -1) * u });
    }
  });
};

// ---------------- shot 4: the farmers watch their wheat vanish ----------------
const F4: [number, number][] = [[17.0, 32.5], [19.2, 33.4], [18.1, 31.2]];
const farmers4 = (t: number, cam: CamInfo, out: Stage) => {
  F4.forEach(([px, pz], k) => {
    const x = FARM[0] + px, z = FARM[2] + pz, i = 30 + k, w = W.emus + 0.08 * k;
    const jump = on(t, w) ? 0.1 * Math.max(0, Math.sin((t - w + LEAD) * 11)) * Math.exp(-(t - w) * 4) : 0;
    const expr: Expr = on(t, W.everything) ? (["pained", "dazed", "shock"] as Expr[])[k] : on(t, w) ? "shock" : (["smile_closed", "grin", "smile"] as Expr[])[k];
    const acc = farmerAcc(k, k === 1 ? { straw: !on(t, w) } : k === 0 ? { fork: true } : {});
    dude(out, cam, t, i, FARMER(k), `f${k}`, acc, x, jump, z, "stand",
      { expr, look: on(t, w) ? (k === 2 ? 1 : -1) : 0, wave: k === 0 ? (on(t, w) ? 0.9 : 0.2) : undefined, tilt: on(t, W.everything) ? (k - 1) * 6 : 0, swaps: [w, W.everything] });
    pop(out, t, i, x + 0.05, crownY() + 0.42, z, w, true);
    if (on(t, W.ate)) sweat(out, t, i, x, 1.5, z, cam, W.ate + 0.1 * k);
  });
};

// ---------------- shot 5: the farmers called the army (the office phone) ----------------
const OFFICE_SPOT: [number, number] = [OFFICE[0] - 0.1, OFFICE[2] - 0.8];
const phoneCall = (t: number, cam: CamInfo, out: Stage) => {
  const [x, z] = OFFICE_SPOT, t0 = SHOT_T[5][0];
  const ringEnd = W.called - 0.3;
  const picked = t >= ringEnd;
  const jolt = t > t0 + 0.12 && t < ringEnd ? 0.06 * Math.max(0, Math.sin((t - t0 - 0.12) * 12)) * Math.exp(-(t - t0 - 0.12) * 3) : 0;
  const expr: Expr = on(t, W.army) ? "grin" : picked ? "stern" : t > t0 + 0.12 ? "shock" : "neutral";
  dude(out, cam, t, 40, MAJOR, "maj", majorAcc(on(t, W.army) ? 1 : picked ? 0.3 : -0.2, { phone: picked }), x, jolt, z, "stand",
    { expr, swaps: [t0 + 0.12, ringEnd, W.army] }, 1, false);
  // RING RING: pops over the phone, rattles, vanishes as he grabs the receiver
  const k = spring(t, t0 + 0.1, 0.22) * (1 - smooth((t - (ringEnd - 0.12)) / 0.14));
  if (k > 0.01) {
    const v = Math.floor(t * 14) % 2;
    fxCard(out, `ring${v}`, 1024, 800, (p) => fxRing(p, v), PHONE[0], PHONE[1] + 0.38 + 0.01 * v, PHONE[2], 0.56 * k, 0.44 * k, { rot: v ? 0.05 : -0.05 });
  }
  pop(out, t, 40, x + 0.05, crownY(GS) + 0.5, z, t0 + 0.12, true, 1, ringEnd - 0.1);
  if (on(t, W.army)) sparkles(out, t, W.army, x, crownY(GS) + 0.25, z, cam, 3, 0.14, 0.32);
};
/** shot time ranges (s) */
const SHOT_T: Record<number, [number, number]> = {
  1: [0, 119 / 30], 2: [119 / 30, 161 / 30], 3: [161 / 30, 320 / 30], 4: [320 / 30, 411 / 30], 5: [411 / 30, 487 / 30], 6: [487 / 30, 643 / 30], 7: [643 / 30, 683 / 30],
  8: [683 / 30, 790 / 30], 9: [790 / 30, 848 / 30], 10: [848 / 30, 937 / 30], 11: [937 / 30, 1076 / 30], 13: [1205 / 30, 1271 / 30], 14: [1271 / 30, 1351 / 30],
  15: [1351 / 30, 1549 / 30], 16: [1549 / 30, 1621 / 30], 17: [1621 / 30, 60],
};

// ---------------- shot 6: the line-up ----------------
const lineup = (t: number, cam: CamInfo, out: Stage) => {
  const L6: [number, number, number, number][] = [[0, 0.3, W.major, 0], [-1.05, 0, W.soldiers2 - 0.06, 1], [1.05, 0, W.soldiers2 + 0.06, 2]];
  for (const [px, pz, word, k] of L6) {
    const s = spring(t, word, 0.26);
    const x = FARM[0] + px, z = FARM[2] + pz;
    if (s > 0.02) {
      if (k === 0) {
        const expr: Expr = on(t, W.bullets) ? "laugh" : on(t, W.guns) ? "grin" : "smile";
        dude(out, cam, t, 40, MAJOR, "maj", majorAcc(on(t, W.guns) ? 1 : 0.6, { thumb: on(t, W.bullets) }), x, 0, z, "stand",
          { expr, wave: on(t, W.bullets) ? 0.3 : undefined, swaps: [W.guns, W.bullets] }, s);
        if (on(t, W.bullets)) sparkles(out, t, W.bullets, x, crownY(GS) + 0.2, z, cam, 3, 0.14, 0.35);
      } else {
        // deadpan salute; eyes slide to the ammo crates on "bullets"
        const lk = on(t, W.bullets) ? (k === 1 ? 1 : -1) : 0;
        dude(out, cam, t, 40 + k, SOLDIER(k), `s${k}`, SOLDIER_ACC, x, 0, z, "stand",
          { expr: "neutral", look: lk, wave: on(t, word + 0.25) ? 0 : undefined, swaps: [word + 0.25, W.bullets] }, s);
      }
    }
    dustAt(out, t, word - LEAD + 0.12, x, z + 0.1, k, 1.0);
  }
};

// ---------------- shot 7: "Easy, right?" ----------------
const smug = (t: number, cam: CamInfo, out: Stage) => {
  const x = FARM[0], z = FARM[2];
  const r = on(t, W.right);
  dude(out, cam, t, 40, MAJOR, "maj", majorAcc(r ? 1 : 0.7, { thumb: r }), x, 0, z, "stand",
    { expr: r ? "grin" : "smile", wave: r ? 0.25 : undefined, tilt: r ? -3 : -1, look: r ? 0 : 1, swaps: [W.right] });
  // the tooth glint on "right"
  if (r) {
    const [mx, my] = mouthPt(GS), k = spring(t, W.right, 0.2) * (1 - smooth((t - W.right - 0.6) / 0.2));
    const dx = (mx - 300) * SU, y = (975 - my) * SU;
    if (k > 0.01) fxCard(out, "spark0.5", 240, 240, (p) => fxSparkle(p, 0.5), x + cam.right.x * (dx + 0.07), y + 0.02, z + cam.right.z * (dx + 0.07) + 0.05, 0.12 * k, 0.12 * k, { rot: t * 2 });
  }
};

// ---------------- shots 8-9: the ambush at the dam ----------------
const HT = { gun: [-0.9, 1.35], maj: [-1.85, 1.0], sol: [-1.4, 1.9] } as const;
const ambush = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const P = (k: keyof typeof HT): [number, number] => [HIDE[0] + HT[k][0], HIDE[2] + HT[k][1]];
  const [gx, gz] = P("gun"), [mx, mz] = P("maj"), [sx, sz] = P("sol");
  const dam = (x: number, z: number) => lookTo(cam, x, z, DAM[0], DAM[2]);
  if (id === 8) {
    const th = on(t, W.thousand);
    dude(out, cam, t, 40, MAJOR, "maj", majorAcc(th ? 1 : 0.6, { binocs: !th, thumb: th && on(t, W.watering) }), mx, 0, mz, "stand",
      { expr: th ? "grin" : "smile", look: dam(mx, mz), wave: th && on(t, W.watering) ? 0.3 : undefined, swaps: [W.thousand, W.watering] });
    dude(out, cam, t, 41, SOLDIER(1), "s1", SOLDIER_ACC, gx, 0, gz, "stand", { expr: "stern", look: dam(gx, gz) });
    dude(out, cam, t, 42, SOLDIER(2), "s2", SOLDIER_ACC, sx, 0, sz, "stand", { expr: "neutral", look: th ? dam(sx, sz) : 0, swaps: [W.thousand] });
    pop(out, t, 42, sx + 0.05, crownY() + 0.42, sz, W.thousand, true, 0.9, W.thousand + 1.2);
    if (th) sparkles(out, t, W.thousand, mx, crownY(GS) + 0.25, mz, cam, 2, 0.14, 0.3);
    return;
  }
  const j = jamAt(9, t), firing = j.firing > 0;
  const jitter = firing ? q(2.2 * Math.sin(t * 61), 4) : 0;
  const jam = on(t, W.jams), tw = on(t, W.twelve);
  dude(out, cam, t, 41, SOLDIER(1), "s1", SOLDIER_ACC, gx, firing ? 0.008 * Math.abs(Math.sin(t * 47)) : 0, gz, "stand",
    { expr: tw ? "neutral" : jam ? "shock" : "stern", tilt: jitter, look: tw ? 0 : dam(gx, gz), swaps: [W.jams, W.twelve] });
  const mood = tw ? -1 : jam ? 0 : 1;
  dude(out, cam, t, 40, MAJOR, "maj", majorAcc(mood), mx, 0, mz, "stand",
    { expr: tw ? "nervous" : jam ? "shock" : "grin", look: tw ? lookTo(cam, mx, mz, gx, gz) : dam(mx, mz), swaps: [W.jams, W.twelve] });
  dude(out, cam, t, 42, SOLDIER(2), "s2", SOLDIER_ACC, sx, 0, sz, "stand",
    { expr: "neutral", look: tw ? lookTo(cam, sx, sz, mx, mz) : 0, swaps: [W.twelve] });
  pop(out, t, 41, gx + 0.05, crownY() + 0.42, gz, W.jams, true, 1, W.twelve + 0.2);
  pop(out, t, 40, mx + 0.05, crownY(GS) + 0.5, mz, W.twelve);
  if (tw) sweat(out, t, 40, mx, 1.48, mz, cam, W.twelve + 0.2);
};

// ---------------- shots 10-11: the truck ----------------
const truck = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const c = chaseAt(id, t), tx = ROAD[0] + c.truckX, tz = ROAD[2];
  const run = id === 11 && on(t, W.fifty), cant = id === 11 && on(t, W.cant);
  // riders ride the sprung truck body (props.truckToWorld): seats at truck-local (-0.12, 0.90, +-0.38), gunner on the tray
  const DRV = truckToWorld(id, t, [-0.12, 0.9, -0.38]), MAJ = truckToWorld(id, t, [-0.12, 0.9, 0.38]), GUN = truckToWorld(id, t, [-1.4, 1.05, 0]);
  dude(out, cam, t, 42, SOLDIER(2), "s2", SOLDIER_ACC, DRV[0], DRV[1], DRV[2], "sit", { expr: cant ? "nervous" : "neutral", swaps: [W.cant] }, 1, false);
  const mood = cant ? -1 : run ? 0 : 1;
  const mexpr: Expr = cant ? "nervous" : run ? "shock" : id === 10 && on(t, W.truck) ? "laugh" : "grin";
  dude(out, cam, t, 40, MAJOR, "maj", majorAcc(mood), MAJ[0], MAJ[1], MAJ[2], "sit",
    { expr: mexpr, wave: !run && !cant ? q(0.7 + 0.3 * Math.sin(t * 6), 6) : undefined, swaps: [W.truck, W.fifty, W.cant] }, 1, false);
  const firing = id === 11 && !cant && t > SHOT_T[11][0] + 0.2;
  dude(out, cam, t, 41, SOLDIER(1), "s1", SOLDIER_ACC, GUN[0], GUN[1], GUN[2], "stand",
    { expr: cant ? "dazed" : firing ? "stern" : "neutral", tilt: firing ? q(2 * Math.sin(t * 57), 4) : 0, swaps: [W.cant] }, 1, false);
  const sy = MAJ[1] + crownY(geoOf(seedOf(40), "sit", 0, "stout"));
  if (id === 10) pop(out, t, 40, MAJ[0], sy + 0.45, MAJ[2], W.truck, true, 0.9, W.truck + 1.0);
  if (id === 11) {
    pop(out, t, 40, MAJ[0], sy + 0.45, MAJ[2], W.fifty, true, 1, W.cant - 0.1);
    pop(out, t, 40, MAJ[0], sy + 0.45, MAJ[2], W.keepup);
    if (cant) { sweat(out, t, 40, MAJ[0], sy - 0.2, MAJ[2], cam, W.cant); sweat(out, t, 42, DRV[0], sy - 0.2, DRV[2], cam, W.cant + 0.3); }
    // speed lines trailing the leading emus (flock: the pack runs at x = truckX + lead, |z| < 1.5)
    const ex = tx + c.lead, k = smooth((t - (W.run - LEAD)) / 0.3);
    if (k > 0.02) for (let j2 = 0; j2 < 3; j2++) {
      const v = Math.floor(t * 10 + j2) % 3;
      fxCard(out, `speed${v}`, 768, 256, (p) => fxSpeed(p, v), ex - 2.2 - 0.4 * j2, 0.9 + 0.35 * j2, tz + 1.6 - 0.9 * j2, 2.4 * k, 0.8 * k);
    }
  }
};

// ---------------- shot 13: guerrilla warfare ----------------
const guerrilla = (t: number, cam: CamInfo, out: Stage) => {
  const x = FARM[0] - 0.55, z = FARM[2] + 0.1, lowered = on(t, W.warfare);
  const sweep = lowered ? 0 : q(4 * Math.sin((t - W.basically) * 2.4), 4);
  dude(out, cam, t, 41, SOLDIER(1), "s1", { ...SOLDIER_ACC, binocs: !lowered }, x, 0, z, "stand",
    { expr: "neutral", tilt: sweep, look: lowered ? lookTo(cam, x, z, FARM[0] + 0.3, FARM[2] - 0.2) : 0, swaps: [W.warfare] });
  pop(out, t, 41, x + 0.04, crownY() + 0.42, z, W.warfare + 0.15);
};

// ---------------- shot 14: the army goes home ----------------
const goHome = (t: number, cam: CamInfo, out: Stage) => {
  const t0 = SHOT_T[14][0], d = 0.75 * (t - t0), D = [0.82, 0.57], S = [-0.57, 0.82];
  const team: [number, number, number][] = [[0, 0, 40], [0.85, -0.4, 41], [-0.85, -0.4, 42]];
  for (const [side, back, i] of team) {
    const x = ROAD[0] + D[0] * (d + back) + S[0] * side, z = ROAD[2] + D[1] * (d + back) + S[1] * side;
    const phase = (t * 1.5 + i * 0.37) % 1;
    if (i === 40) dude(out, cam, t, i, MAJOR, "maj", majorAcc(-1, { flag: q((t * 0.8) % 1, 8), plaster: true, askew: 10, feather: true }), x, 0, z, "stroll",
      { expr: on(t, W.home) ? "pained" : "nervous", wave: 0, phase, tilt: -3, swaps: [W.home] });
    else dude(out, cam, t, i, SOLDIER(i - 40), `s${i - 40}`, SOLDIER_ACC, x, 0, z, "stroll", { expr: "neutral", phase, tilt: side > 0 ? 2 : -2 });
    // a puff of dust on every footfall
    const step = Math.floor(t * 3 + i * 0.37);
    dustAt(out, t, (step) / 3 - i * 0.37 / 3, x + 0.1, z + 0.1, step + i, 0.55, "#d9a070");
  }
  sweat(out, t, 40, ROAD[0] + D[0] * d, 1.5, ROAD[2] + D[1] * d, cam, W.home);
};

// ---------------- shot 15: the major's quote ----------------
const quote = (t: number, cam: CamInfo, out: Stage) => {
  const [x, z] = OFFICE_SPOT;
  const said = on(t, W.majorSaid), bul = on(t, W.bullets2), bir = on(t, W.birds2), beat = on(t, W.beat), wor = on(t, W.world);
  const expr: Expr = wor ? "laugh" : beat ? "smile_closed" : bir ? "nervous" : bul ? "shock" : said ? "stern" : "dazed";
  const mood = wor ? 1 : beat ? 0.6 : bul ? -0.8 : said ? 0 : -1;
  dude(out, cam, t, 40, MAJOR, "maj", majorAcc(mood, { askew: 10, feather: true, plaster: true, thumb: wor }), x, 0, z, "stand",
    { expr, wave: wor ? 0.3 : said && !bul ? 0.05 : undefined, tilt: beat ? -4 : 0, look: beat && !wor ? -1 : 0, swaps: [W.majorSaid, W.bullets2, W.birds2, W.beat, W.world] }, 1, false);
  const hy = crownY(GS);
  pop(out, t, 40, x + 0.05, hy + 0.48, z, W.bullets2, true, 1, W.beat - 0.2);
  if (bir && !beat) sweat(out, t, 40, x, 1.46, z, cam, W.birds2);
  // the dream: a thought bubble rises up beside his head (screen right)
  const k = spring(t, W.beat, 0.35);
  if (k > 0.01) {
    const s = 0.62 + 0.05 * Math.sin(t * 2);
    fxCard(out, "thought", 1024, 900, fxThought, x + cam.right.x * 0.62, hy + 0.42 + 0.05 * k, z + cam.right.z * 0.62 + 0.05, 0.95 * k * s / 0.62, 0.84 * k * s / 0.62);
  }
  if (wor) sparkles(out, t, W.world, x, hy + 0.15, z, cam, 3, 0.13, 0.32);
};

// ---------------- shot 16: the newspaper ----------------
export const NEWS_AT: V3 = [FARM[0], 1.22, FARM[2] + 0.45];
const paper = (t: number, out: Stage) => {
  const t0 = SHOT_T[16][0] + 0.03, u = clamp01((t - t0) / 0.75), e = smooth(u);
  const sc = e * (1 + 0.06 * Math.sin(u * Math.PI)), rot = (1 - e) * Math.PI * 4 + 0.03 * Math.sin(t * 1.3);
  if (sc < 0.01) return;
  fxCard(out, "news", NEWS_CW, NEWS_CH, fxNews, NEWS_AT[0], NEWS_AT[1] + 0.005 * Math.sin(t * 1.7), NEWS_AT[2], 0.6 * sc, 0.8 * sc, { rot });
};

// ---------------- shot 17: final score ----------------
const finale = (t: number, cam: CamInfo, out: Stage) => {
  const team: [number, number, number][] = [[-1.2, 3.0, 40], [-1.75, 2.3, 41], [-0.65, 2.2, 42]];
  const one = on(t, W.one), zero = on(t, W.zero);
  for (const [px, pz, i] of team) {
    const x = SCORE[0] + px, z = SCORE[2] + pz, board = lookTo(cam, x, z, SCORE[0], SCORE[2]);
    if (i === 40) {
      const flinch = one ? 0.08 * Math.max(0, Math.sin((t - W.one + LEAD) * 12)) * Math.exp(-(t - W.one) * 5) : 0;
      dude(out, cam, t, i, MAJOR, "maj", majorAcc(zero ? -1 : -0.5, { flag: q((t * 0.8) % 1, 8), plaster: true, askew: 10, feather: true }), x, flinch, z, "stand",
        { expr: zero ? "dazed" : one ? "shock" : "nervous", wave: zero ? 0 : 0.15, look: zero ? 0 : board, tilt: zero ? -5 : 0, swaps: [W.score, W.one, W.zero] });
      pop(out, t, i, x + 0.05, crownY(GS) + 0.52, z, W.one, true, 1, W.zero - 0.1);
      if (zero) sweat(out, t, i, x, 1.48, z, cam, W.zero);
    } else {
      dude(out, cam, t, i, SOLDIER(i - 40), `s${i - 40}`, SOLDIER_ACC, x, 0, z, "stand",
        { expr: "neutral", look: zero ? 0 : on(t, W.score) ? board : 0, swaps: [W.score, W.zero] });
    }
  }
  pop(out, t, 41, SCORE[0] - 1.75 + 0.05, crownY() + 0.42, SCORE[2] + 2.3, W.zero + 0.25);
};

export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  if (id === 1 || id === 2) standoff(id, t, cam, out);
  else if (id === 3) farmers3(t, cam, out);
  else if (id === 4) farmers4(t, cam, out);
  else if (id === 5) phoneCall(t, cam, out);
  else if (id === 6) lineup(t, cam, out);
  else if (id === 7) smug(t, cam, out);
  else if (id === 8 || id === 9) ambush(id, t, cam, out);
  else if (id === 10 || id === 11) truck(id, t, cam, out);
  else if (id === 13) guerrilla(t, cam, out);
  else if (id === 14) goHome(t, cam, out);
  else if (id === 15) quote(t, cam, out);
  else if (id === 16) paper(t, out);
  else if (id === 17) finale(t, cam, out);
  return out;
};
