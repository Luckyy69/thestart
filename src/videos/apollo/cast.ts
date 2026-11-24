// OWNER: cast agent. Every character (astronauts, flight controllers, John Aaron, spectators) and effect card per shot.
// Characters are bridge cards (person/bodyFront) with accessories painted onto the SAME canvas (fx.ts: glasses, headset,
// narrow tie, pocket protector, vest, pressure suit + snoopy cap + bubble helmet, PLSS, umbrella), so nothing drifts.
// Layout contract (report to the set owners):
//   CABIN  seated card bases at CABIN + (0, 0.30, -0.75 / 0 / +0.75) (heads ~1.15 m), facing +x (cards face the camera)
//   MCC    seated cards on interiors.ts MCC_SEATS chairs (card base = floor + seat top 0.48 - 0.09, at the chair centre
//          z + 0.12); Aaron on "EECOM"; the flight director stands beside the "FLIGHT" chair (+0.5 x, +0.25 z)
//   PAD    spectators on the ground (y 0) in x -123..-59, z 232..253 (20 people, 15 with umbrellas)
//   MOON   two astronauts on the ground (y 0) at MOON + (-6.0, 0, 10.5) (waving) and (-3.2, 0, 6.5)
import { Stage, CamInfo, Who, Place, person, blob, prepStage, lidAt, hh, q } from "../bridge/cast";
import { Pen, SKINS, INK, Outfit, Expr, FrontOpts, KID } from "../bridge/toon";
import { W, LEAD, CABIN, MCC, MOON, SEATS, smooth, clamp01, V3 } from "./story";
import { CAUSEWAY, SPECTATOR_SPOTS } from "./outdoor";
import { MCC_SEATS, CABIN_COUCH } from "./interiors";
import { Acc, accKey, accBehind, accFront, geoOf, fxQuestion, fxThoughtScreen, fxSparkle } from "./fx";

/** extra word cues not in story.W (voice/words.json) */
const FINDS = 42.75, IT = 44.08, SAYS = 31.21;
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1; // same head-shape seed as bridge/cast person()
type Mode = "stand" | "sit";

/** one character with painted accessories; returns its place (already pushed) */
const dude = (out: Stage, cam: CamInfo, t: number, i: number, o: Outfit, okey: string, acc: Acc, x: number, y: number, z: number,
  mode: Mode, expr: Expr, extra: Partial<FrontOpts> = {}, swaps: number[] = [], sc = 1, shadow = mode === "stand"): Place => {
  const who: Who = { i, o, okey };
  const fo: FrontOpts = { mode, expr, blink: lidAt(t, i, swaps), ...extra };
  const pl = person(cam, who, x, y, z, { side: false, mirror: false }, fo, {}, sc);
  const g = geoOf(seedOf(i), mode, fo.facing ?? 0), tilt = fo.tilt ?? 0, inner = pl.draw;
  const hipY = g.torsoBot - 0.12 * g.HH;
  pl.key += `|${accKey(acc)}`;
  pl.draw = (p: Pen) => {
    p.rot = tilt ? [(tilt * Math.PI) / 180, 300, hipY] : null;
    accBehind(p, g, acc);
    p.rot = null;
    inner(p);
    p.rot = tilt ? [(tilt * Math.PI) / 180, 300, hipY] : null;
    accFront(p, g, acc);
    p.rot = null;
  };
  out.places.push(pl);
  if (shadow) blob(out, x, y, z, sc);
  return pl;
};
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, extra: { flat?: boolean; rot?: number; soft?: boolean } = {}) =>
  out.fx.push({ key, cw, ch, draw, x, y, z, w, h, ...extra });
/** eye direction (-1 / 0 / 1) toward a world point, as the camera sees it */
const lookAt = (cam: CamInfo, from: V3, to: V3) => {
  const d = (to[0] - from[0]) * cam.right.x + (to[2] - from[2]) * cam.right.z;
  return Math.abs(d) < 0.25 ? 0 : d > 0 ? 1 : -1;
};
/** time switch: true from `word` minus the reaction lead (2 frames) */
const on = (t: number, word: number) => t >= word - LEAD;
/** 0..1 scale-in from the cue over `dur` s (nothing pops) */
const grow = (t: number, word: number, dur = 0.22) => smooth((t - (word - LEAD)) / dur);
/** overshooting scale-in (springy cartoon pop-in that still starts from 0) */
const spring = (t: number, word: number, dur = 0.3) => {
  const u = clamp01((t - (word - LEAD)) / dur);
  return smooth(u) * (1 + 0.16 * Math.sin(u * Math.PI));
};

// ---------------- outfits ----------------
const SUIT: Outfit = { jacket: "#f3f2ee", pants: "#eceae4", boots: "#8e949c", hat: null, skin: SKINS[0] };
const ASTRO: Outfit[] = [{ ...SUIT, skin: SKINS[1] }, { ...SUIT, skin: SKINS[0] }, { ...SUIT, skin: SKINS[2] }]; // Conrad, Gordon, Bean
const HAIR = ["#3a2a20", "#7a5a3a", "#1d1a1a", "#c9a46a", "#5a3b2a"];
const CTL = (v: number): Outfit => ({ jacket: "#f7f6f1", pants: ["#3b3f52", "#2b2f3a", "#4a4a52"][v % 3], boots: INK, hat: "hair", hair: HAIR[v % 5], skin: SKINS[v % 3] });
const TIES = ["#1f2433", "#2c2230", "#24324a", "#3a2626"];
const AARON: Outfit = { jacket: "#f7f6f1", pants: "#33384a", boots: INK, hat: "hair", hair: "#6b4a2e", skin: SKINS[0] };
const FLIGHT: Outfit = { jacket: "#f7f6f1", pants: "#3b3f52", boots: INK, hat: "hair", hair: "#2a2220", skin: SKINS[2] };
const FOLK = (v: number): Outfit => {
  const coats = ["#3f6fb5", "#e0b43a", "#8c3b4a", "#2f5f6a", "#5d7a3a", "#b5653f", "#7b5ac9"];
  const o: Outfit = { jacket: coats[v % 7], pants: ["#3b3f52", "#2b2f3a", "#5a6a8a"][v % 3], boots: ["#4a3426", "#1d1a1a"][v % 2], hat: "hair", hair: HAIR[(v + 2) % 5], skin: SKINS[v % 4] };
  if (v % 4 === 1) return { ...o, dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] };
  if (v % 5 === 3) return { ...o, hat: "cap", cap: ["#e2453c", "#2f6a43"][v % 2] };
  return o;
};
const UMB = ["#e2453c", "#f2c84b", "#2f6fd0", "#2a2a33", "#3fa060", "#e07a2c", "#c25a9a"];

// ---------------- cabin ----------------
const CREW: { i: number; z: number; key: string }[] = [{ i: 1, z: -0.75, key: "conrad" }, { i: 2, z: 0, key: "gordon" }, { i: 3, z: 0.75, key: "bean" }];
/** couch seat top minus the sit card's torso-bottom height (0.09 m); card x just in front of the backrest */
const CAB_Y = CABIN_COUCH.seatY - 0.09, CAB_X = 0.1;
const cabin = (id: number, t: number, cam: CamInfo, out: Stage) => {
  // cards face the camera: when the camera is behind the couches (over-the-shoulder), paint the back of the helmet instead
  const acc: Acc = { suit: true, helmet: true, back: cam.pos.x < CABIN[0] + CAB_X };
  CREW.forEach((c, k) => {
    let expr: Expr = "neutral", tilt = 0, look = 0;
    let swaps: number[] = [];
    if (id === 4) expr = (["grin", "smile", "smile_closed"] as Expr[])[k];
    else if (id === 7) { expr = on(t, W.warning) ? "shock" : "nervous"; swaps = [W.warning]; }
    else if (id === 14) {
      swaps = [FINDS, W.flips, IT];
      if (k === 2) {
        // Bean leans toward the SCE switch on his right (+z) on "finds", flips it, smiles
        const lean = smooth((t - (FINDS - LEAD)) / 0.35) * (1 - 0.35 * smooth((t - (IT - LEAD)) / 0.5));
        const sx = cam.right.z >= 0 ? 1 : -1; // +z on screen
        tilt = q(15 * lean * sx, 30);
        look = lean > 0.2 ? sx : 0;
        expr = on(t, W.flips) ? "smile_closed" : on(t, FINDS) ? "stern" : "nervous";
      } else {
        expr = on(t, IT) ? "relief" : "nervous";
        look = on(t, FINDS) && !on(t, IT) ? lookAt(cam, [0, 0, c.z], [0, 0, 0.75]) : 0;
      }
    }
    dude(out, cam, t, 10 + c.i, ASTRO[k], c.key, acc, CABIN[0] + CAB_X, CABIN[1] + CAB_Y, CABIN[2] + CABIN_COUCH.z[k], "sit", expr, { look, tilt }, swaps, 1, false);
  });
};

// ---------------- Mission Control ----------------
/** seated card base above the chair's floor: seat top 0.48 minus the sit card's torso-bottom height 0.09 */
const SEAT_UP = 0.39, SEAT_Y = SEAT_UP;
const seat = (name: string) => MCC_SEATS.find((s) => s.name === name)!;
/** the ten controllers (interiors.ts console names); chairs sit 0.12 m behind the seat mark (+z) */
const CTL_NAMES = ["BOOSTER", "RETRO", "FIDO", "GUIDO", "GNC", "TELMU", "INCO", "O&P", "FAO", "CAPCOM"];
const CTLS: [number, number, number][] = CTL_NAMES.map((n) => { const s = seat(n); return [s.x, s.z + 0.12, s.y]; });
const at = (o: V3, x: number, z: number): V3 => [o[0] + x, 0, o[2] + z];
const qmark = (out: Stage, t: number, i: number, x: number, y: number, z: number, word: number) => {
  const k = spring(t, word);
  if (k <= 0.01) return;
  const bob = 0.02 * Math.sin(t * 5 + i);
  fxCard(out, "qmark", 300, 400, fxQuestion, x, y + bob + 0.06 * k, z, 0.21 * k, 0.28 * k, { rot: 0.12 * Math.sin(t * 3 + i * 1.7) });
};
const mcc = (id: number, t: number, cam: CamInfo, out: Stage) => {
  const fs = seat("FLIGHT"), es = seat("EECOM");
  const fd = at(MCC, fs.x + 0.5, fs.z + 0.25), aa = at(MCC, es.x, es.z + 0.12);
  const cheer = id === 15 && on(t, W.life);
  // ---- controllers ----
  CTLS.forEach(([cx, cz, fy], k) => {
    const i = 30 + k, pos = at(MCC, cx, cz);
    let expr: Expr = k % 3 === 0 ? "stern" : "neutral", look = 0, swaps: number[] = [];
    if (id === 9) { swaps = [W.garbage]; expr = on(t, W.garbage) ? (k % 2 ? "shock" : "nervous") : k % 3 === 0 ? "stern" : "neutral"; }
    if (id === 10) { swaps = [W.abort]; expr = on(t, W.abort) ? (k % 3 === 1 ? "stern" : "nervous") : "nervous"; look = on(t, W.abort) ? lookAt(cam, pos, fd) : 0; }
    if (id === 11) { swaps = [W.aaron, W.nobody1]; expr = on(t, W.nobody1) ? (k % 2 ? "dazed" : "nervous") : "nervous"; look = on(t, W.aaron) ? lookAt(cam, pos, aa) : 0; }
    if (id === 12 || id === 13) { swaps = [W.tryWord, W.sce, W.aux]; expr = k % 2 ? "dazed" : "nervous"; look = lookAt(cam, pos, aa); }
    if (id === 15) { swaps = [W.life]; expr = cheer ? (["laugh", "grin", "relief_open"] as Expr[])[k % 3] : "nervous"; }
    const acc: Acc = { headset: true, glasses: k % 3 === 0 || k === 5, tie: TIES[k % 4], pens: k % 2 === 0 };
    if (cheer) {
      const tl = t - (W.life - LEAD), hop = 0.1 * Math.max(0, Math.sin(tl * 8 + k)) * Math.exp(-tl * 0.8);
      dude(out, cam, t, i, CTL(k), `c${k}`, acc, pos[0], fy + hop, pos[2] + 0.4, "stand", expr, { wave: q(0.55 + 0.45 * Math.sin(t * 9 + k * 1.3), 20) }, swaps, 1, true);
    } else dude(out, cam, t, i, CTL(k), `c${k}`, acc, pos[0], fy + SEAT_UP, pos[2], "sit", expr, { look }, swaps);
    if (id === 12 || id === 13) qmark(out, t, i, pos[0] + 0.05, fy + SEAT_UP + 1.42, pos[2], [W.tryWord, W.sce, W.aux][k % 3] + 0.06 * (k % 2));
  });
  // ---- John Aaron ----
  {
    let expr: Expr = "neutral", swaps: number[] = [];
    if (id === 9) { swaps = [W.garbage]; expr = on(t, W.garbage) ? "stern" : "neutral"; }
    if (id === 10) { expr = "stern"; }
    if (id === 11) { swaps = [SAYS]; expr = on(t, SAYS) ? "smile" : "stern"; }
    if (id === 12) { swaps = [W.tryWord, W.aux]; expr = on(t, W.aux) ? "smile_closed" : on(t, W.tryWord) ? "relief_open" : "smile"; }
    if (id === 13) { swaps = [W.year, W.test]; expr = on(t, W.test) ? "smile_closed" : on(t, W.year) ? "neutral" : "smile"; }
    if (id === 15) { swaps = [W.life]; expr = on(t, W.life) ? "relief_open" : "smile"; }
    const acc: Acc = { headset: true, glasses: true, tie: "#1f2433", pens: true };
    dude(out, cam, t, 20, AARON, "aaron", acc, aa[0], SEAT_Y, aa[2], "sit", expr, {}, swaps);
    if (id === 13) {
      // the memory: a thought bubble with the scrambled test screen grows out of his head on "year"
      const k = grow(t, W.year, 0.32), flick = Math.floor(t * 6) % 4;
      if (k > 0.01) {
        const ox = 0.34 * k, oy = 0.42 + 0.28 * k;
        fxCard(out, `thought${flick}`, 560, 440, (p) => fxThoughtScreen(p, flick), aa[0] + cam.right.x * ox, SEAT_Y + 1.25 + oy, aa[2] + cam.right.z * ox + 0.05, 0.84 * k, 0.66 * k);
      }
    }
  }
  // ---- the flight director (standing, vest) ----
  {
    let expr: Expr = "stern", look = 0, swaps: number[] = [], wave: number | undefined;
    if (id === 9) { swaps = [W.garbage]; expr = on(t, W.garbage) ? "shock" : "stern"; }
    if (id === 10) { swaps = [W.abort]; expr = on(t, W.abort) ? "nervous" : "stern"; }
    if (id === 11) { swaps = [W.aaron]; expr = "nervous"; look = on(t, W.aaron) ? lookAt(cam, fd, aa) : 0; }
    if (id === 12 || id === 13) { expr = "nervous"; look = lookAt(cam, fd, aa); }
    if (id === 15) { swaps = [W.life]; expr = cheer ? "relief_open" : "nervous"; wave = cheer ? q(0.5 + 0.5 * Math.sin(t * 8), 20) : undefined; }
    dude(out, cam, t, 21, FLIGHT, "flight", { headset: true, tie: "#2a3a6a", vest: "#9a3a3a" }, fd[0], 0, fd[2], "stand", expr, { look, wave }, swaps);
    if (id === 12 || id === 13) qmark(out, t, 21, fd[0] + 0.08, 1.98, fd[2], W.sce + 0.1);
  }
  if (cheer) for (let k = 0; k < 5; k++) { // little sparkles over the room as the screens come back
    const u = q(((t - W.life) * 1.3 + k * 0.23) % 1, 24), g = grow(t, W.life, 0.25);
    const [sx, sz] = CTLS[(k * 3) % CTLS.length];
    fxCard(out, `spark${u}`, 240, 240, (p) => fxSparkle(p, u), MCC[0] + sx + 0.3, 1.85 + 0.12 * (k % 3), MCC[2] + sz, 0.26 * g, 0.26 * g);
  }
};

// ---------------- the pad: spectators in the rain ----------------
// small groups (2-3 people, a car's worth) around every SPECTATOR_SPOTS mark on the causeway's camera-side shoulder;
// feet on the road top (CAUSEWAY.y), z kept inside the road edge (z1 = 183)
const SPEC = SPECTATOR_SPOTS.flatMap(([sx, , sz], g) => Array.from({ length: 2 + (g % 2) }, (_, k) => {
  const i = g * 3 + k;
  return { x: sx + (k - 0.5 - 0.5 * (g % 2)) * 1.15 + (hh(i, 21) - 0.5) * 0.3, z: Math.min(CAUSEWAY.z1 - 0.5, sz - (k % 2) * 0.8 + (hh(i, 22) - 0.5) * 0.3) };
}));
const spectators = (id: number, t: number, cam: CamInfo, out: Stage) => {
  SPEC.forEach(({ x, z }, i) => {
    const kid = i % 7 === 4, umb = i % 4 !== 2 && !kid, o = kid ? KID : FOLK(i);
    let expr: Expr = (["neutral", "smile", "smile_closed", "neutral"] as Expr[])[i % 4], wave: number | undefined, look = 0;
    const swaps = [W.liftoff];
    if (id === 4) expr = i % 2 ? "smile" : "neutral";
    if (id === 5 && on(t, W.liftoff)) { expr = (["grin", "shock", "laugh", "relief_open"] as Expr[])[i % 4]; if (!umb) wave = q(0.6 + 0.4 * Math.sin(t * 9 + i), 20); }
    if (id === 16) { expr = (["neutral", "smile_closed", "smile"] as Expr[])[i % 3]; look = Math.round(Math.sin(t * 0.7 + i)); }
    dude(out, cam, t, 60 + i, o, kid ? "kid" : `f${i % 14}`, umb ? { umbrella: UMB[i % UMB.length] } : {}, x, CAUSEWAY.y, z, "stand", expr, { wave, look }, swaps, kid ? 0.72 : 1);
  });
};

// ---------------- the Moon ----------------
const moon = (t: number, cam: CamInfo, out: Stage) => {
  const acc: Acc = { suit: true, helmet: true, plss: true };
  const a: V3 = [MOON[0] - 6.0, 0, MOON[2] + 10.5], b: V3 = [MOON[0] - 3.2, 0, MOON[2] + 6.5];
  const hop = 0.18 * Math.max(0, Math.sin((t - W.five) * 2.4)); // slow low-gravity bounce
  dude(out, cam, t, 13, ASTRO[0], "conrad", acc, a[0], hop, a[2], "stand", on(t, W.landed) ? "grin" : "relief_open", { wave: q(0.5 + 0.5 * Math.sin(t * 6), 20) }, [W.landed], 1.05, false);
  blob(out, a[0], 0, a[2], 1.05, 1 - Math.min(0.6, hop * 3));
  dude(out, cam, t, 11, ASTRO[2], "bean", acc, b[0], 0, b[2], "stand", on(t, W.moon) ? "relief" : "smile", { look: on(t, W.moon) ? 0 : -1 }, [W.moon], 1.05);
};

export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  if (id === 3 || id === 5 || id === 16 || (id === 4 && t < 12)) spectators(id, t, cam, out);
  if ((id === 4 && t >= 11.9) || id === 7 || id === 14) cabin(id, t, cam, out);
  if (id >= 9 && id <= 15 && id !== 14) mcc(id, t, cam, out);
  if (id === 19) moon(t, cam, out);
  return out;
};
