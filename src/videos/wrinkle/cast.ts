// OWNER: cast agent. Every character card + effect card for "Rain Tires". All drawings are NEW (fx.ts).
// Everything is a pure function of (id, t), keyed off story.ts (W cues, hookAt, holoAt, labAt, cliffAt, endAt).
// CONTRACTS (world metres; Ba = BATH, La = LAB, Cl = CLIFF). Cards are yaw-billboards (face the camera about y).
//   BEAN in the tub (shots 1, 2, 6): body card anchored (soles) at BEAN_A = Ba+(0, 0.35, 0), scale 1, facing +z.
//             Head centre ~Ba+(0, 1.16, 0) (head half-width 0.2 m); chest drawn down to the foam line y 0.75 with an
//             in-card foam band below it (so he reads chest-deep even where the 3D foam is thin). Lean (hookAt.lean)
//             moves the card +0.1 z. Shot 6 "bored" sinks the card 0.22 m (chin in the foam) until "hands".
//             HANDS are separate lit cards (palm-facing camera, z in front of the body):
//               shot 1+2: side 1 (screen-right) raised: palm PALM_UP = Ba+(0.35, 1.25, 0.15), hand 0.36 m tip-heel.
//               shot 6: both hands up from the foam on "hands": side 0 Ba+(-0.24, 1.0, 0.22), side 1 Ba+(0.24, 1.0,
//               0.22); on endAt.grab side 1 shoots to SOAP_AT = Ba+(0.5, 0.8, 0.35) and closes on it, then lifts to
//               SOAP_SHOW = Ba+(0.3, 1.08, 0.28). The bar IN the fist is drawn by cast (colour SOAP / SOAP_DK in fx.ts)
//               from soapHeld(t) > 0 (grab >= 0.6): props, hide your soap from then on and steer it into SOAP_AT by then.
//             holo: HOLO_HOOKS.hand = handAt(id, t, "bean", 1) (= PALM_UP in shot 2). In shot 2 the X-ray hand IS his
//             hand: cast draws NO skin hand card there and his arm ends at the holo wrist (palm - 0.22 m).
//   LAB (shot 4): SMOOTH at LAB_SEATS.smooth = La+(-0.55, 0, -0.3), WRINKLY at La+(0.55, 0, -0.3), seated (seat
//             0.5 m, head ~1.18 m), scale 0.95. REFEREE stands at REF_AT = La+(0, 0, -0.85) (head ~1.45 m; keep the
//             stopwatch clear of x -0.3..0.3 behind the table). Bowls (sets: please match or forward yours):
//             LAB_BOWLS[who] = { water, empty } on the table top y 0.8: SMOOTH water La+(-0.66,0.8,0.05) empty
//             La+(-0.24,0.8,0.05); WRINKLY mirrored. carryAt(id, t, who) = { P: fingertip world, holding } (props
//             draws the marble at P while holding). From labAt.fumble SMOOTH's hands flail up (THE MEME FACE) and cast
//             squirts 6 marble cards out of his hands; sets squirts the table marbles. WRINKLY raises the trophy
//             (cast draws it, fx card on handAt(4, t, "wrinkly", 1)) on labAt.win, confetti; the other hand thumbs-up.
//   ANCESTOR (shot 5, cliff.ts anchors): soles climb CLIFF_START -> HOLD_B (his left foot lands on it), raised hands
//             1.4 m above the soles (ANC_SC 0.75, 1.3 m tall); on slip the foot slips off HOLD_B (drops 0.22 m, legs
//             kick, hands scrabble); on grip the PRUNEY fists clamp HOLD_A +-0.2 x (SCREECH + "GRIP!"), he hangs and
//             bounces; on swing he arcs up onto branchTopY(BRANCH_POS.x) + branchAt.dy (lands at swing 0.72), relief,
//             a cheeky thumbs-up on "rain". Card plane CLIFF_CARD_Z on the face -> BRANCH_CARD_Z on the branch, hand
//             cards +0.06 in front.
//   Exports: headAt / handAt (id, t, who = "bean" | "smooth" | "wrinkly" | "ref" | "anc", side 0 = screen-left,
//            1 = screen-right), carryAt, soapHeld, BEAN_A, PALM_UP, SOAP_AT, SOAP_SHOW, LAB_SEATS, LAB_BOWLS, REF_AT,
//            HOLD_A, HOLD_B, BRANCH_POS, ancBodyAt.
// Expressions land 0-3 frames before their word (LEAD = 2 f).
import * as THREE from "three";
import { Stage, CamInfo, lidAt, hh, q, SU, blob, prepStage } from "../bridge/cast";
import { Pen } from "../bridge/toon";
import * as HoloMod from "./holo";
import { HOLD_A, HOLD_B, CLIFF_START, BRANCH_POS, CLIFF_CARD_Z, BRANCH_CARD_Z, branchAt, branchTopY } from "./cliff";
import { W, LEAD, FPS, BATH, LAB, CLIFF, SHOTS, V3, smooth, clamp01, camAt, hookAt, labAt, cliffAt, endAt, MARBLES, shotStart } from "./story";
import {
  P2, Kit, FigS, ArmS, HandS, HandK, Expr, drawFig, drawHandCard, HAND_K, rotP, BEAN_KIT, SMOOTH_KIT, WRINKLY_KIT, REF_KIT, ANC_KIT, MARBLE,
  fxDrop, fxSplash, fxMark, fxSweat, fxSparkle, fxSpeed, fxConfetti, fxScreech, fxPow, fxBadge, fxTrophy, fxMarble, fxRays, fxBubble,
} from "./fx";

// ---------------- places ----------------
const at = (o: V3, x: number, y: number, z: number): V3 => [o[0] + x, o[1] + y, o[2] + z];
export const BEAN_A: V3 = at(BATH, 0, 0.35, 0);
export const PALM_UP: V3 = at(BATH, 0.35, 1.25, 0.15);
export const SOAP_AT: V3 = at(BATH, 0.36, 0.82, 0.32); // = props SOAP_AT (QA: in frame)
export const SOAP_SHOW: V3 = at(BATH, 0.3, 1.08, 0.28);
const FOAM_Y = BATH[1] + 0.75;
export const LAB_SEATS = { smooth: at(LAB, -0.55, 0, -0.3), wrinkly: at(LAB, 0.55, 0, -0.3) };
export const LAB_BOWLS = {
  smooth: { water: at(LAB, -0.66, 0.8, 0.05), empty: at(LAB, -0.24, 0.8, 0.05) },
  wrinkly: { water: at(LAB, 0.66, 0.8, 0.05), empty: at(LAB, 0.24, 0.8, 0.05) },
};
export const REF_AT: V3 = at(LAB, 0, 0, -0.85);
const LAB_SC = 0.95, REF_SC = 0.9;
export { HOLD_A, HOLD_B, BRANCH_POS };
const ANC_SC = 0.75;

// ---------------- helpers ----------------
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v, 100) : v));
const frameNo = (t: number) => Math.round(t * FPS);
const ramp = (t: number, t0: number, d: number) => smooth((t - t0) / d);
/** scale envelope: springs in at t0, shrinks away over dout after t1 (scale only: cut-out cards never pop) */
const env = (t: number, t0: number, t1: number, din = 0.2, dout = 0.25) => {
  if (t < t0 || t > t1 + dout) return 0;
  const u = clamp01((t - t0) / din);
  return Math.max(0, smooth(u) * (1 + 0.22 * Math.sin(u * Math.PI)) * (1 - smooth((t - t1) / dout)));
};
const camPosAt = (id: number, t: number) => { const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t)))).pos; return new THREE.Vector3(c[0], c[1], c[2]); };
const yawOf = (A: V3, cp: THREE.Vector3) => Math.atan2(cp.x - A[0], cp.z - A[2]);
/** canvas point on a camera-facing card standing at A -> world (fwd = metres toward the camera) */
const cardW = (A: V3, P: P2, sc: number, cp: THREE.Vector3, fwd = 0): V3 => {
  const yaw = yawOf(A, cp), c = Math.cos(yaw), s = Math.sin(yaw);
  const lx = (P[0] - 300) * SU * sc, ly = (975 - P[1]) * SU * sc;
  return [A[0] + c * lx + s * fwd, A[1] + ly, A[2] - s * lx + c * fwd];
};
/** camera-ray projection of world point P onto the card standing at A (canvas units) */
const projC = (A: V3, P: V3, sc: number, cp: THREE.Vector3): P2 => {
  const yaw = yawOf(A, cp), nx = Math.sin(yaw), nz = Math.cos(yaw);
  const dx = P[0] - cp.x, dy = P[1] - cp.y, dz = P[2] - cp.z, den = dx * nx + dz * nz;
  const k = Math.abs(den) < 1e-6 ? 1 : ((A[0] - cp.x) * nx + (A[2] - cp.z) * nz) / den;
  const Qx = cp.x + dx * k, Qy = cp.y + dy * k, Qz = cp.z + dz * k;
  const lx = (Qx - A[0]) * Math.cos(yaw) - (Qz - A[2]) * Math.sin(yaw), ly = Qy - A[1];
  return [q(300 + lx / (SU * sc), 2), q(975 - ly / (SU * sc), 2)];
};
const rightOf = (cp: THREE.Vector3, P: V3): V3 => { const dx = P[0] - cp.x, dz = P[2] - cp.z, n = Math.hypot(dx, dz) || 1; return [-dz / n, 0, dx / n]; };

// ---------------- hand cards ----------------
/** design tip-to-heel of a hand card (canvas units, HAND_K included) */
const HAND_DESIGN = 220 * HAND_K;
type HandCard = { P: V3; H: number; s: HandS; hide?: boolean };
const handSc = (h: HandCard) => h.H / (HAND_DESIGN * SU);
const handA = (h: HandCard): V3 => [h.P[0], h.P[1] - 475 * SU * handSc(h), h.P[2]];
/** a point in the hand's local frame (drawHand units) -> world */
const handLocalW = (h: HandCard, L: P2, cp: THREE.Vector3): V3 => {
  const m: P2 = [(h.s.mirror ? -L[0] : L[0]) * HAND_K, L[1] * HAND_K], r = rotP(m, h.s.ang);
  return cardW(handA(h), [300 + r[0], 500 + r[1]], handSc(h), cp, 0.01);
};
/** fingers point along the arm (shoulder -> palm), in the camera's picture plane */
const armAng = (S: V3, P: V3, cp: THREE.Vector3, off = 0) => { const R = rightOf(cp, P), dx = (P[0] - S[0]) * R[0] + (P[2] - S[2]) * R[2], dy = P[1] - S[1]; return Math.atan2(dx, dy) + off; };
const mkHand = (P: V3, H: number, kind: HandK, kit: Kit, prune: number, shine: number, side: 0 | 1, S: V3, cp: THREE.Vector3, off = 0, extra: Partial<HandS> = {}): HandCard =>
  ({ P, H, s: { kind, ang: q(armAng(S, P, cp, side ? off : -off), 50), prune, shine, skin: kit.skin, mirror: side === 1, ...extra } });
/** same, with a fixed picture-plane angle (0 = fingers up) */
const fixHand = (h: HandCard, ang: number): HandCard => ({ ...h, s: { ...h.s, ang: q(ang, 50) } });
/** connect a body-card arm (shoulder canvas S) to a hand card */
const armTo = (A: V3, sc: number, S: P2, h: HandCard, cp: THREE.Vector3, bend: number, back = false): ArmS =>
  ({ sh: S, w: projC(A, h.hide ? add(h.P, [0, -0.24, 0]) : handLocalW(h, [0, 150], cp), sc, cp), bend, back });

// ---------------- rigs ----------------
type Fig = { who: string; A: V3; sc: number; kit: Kit; s: FigS; blob?: boolean; tt?: number };
type Rig = { figs: Fig[]; hands: Record<string, [HandCard | null, HandCard | null]>; heads: Record<string, V3> };
const BEAN_HEAD: P2 = [300, 600], BEAN_SH: [P2, P2] = [[205, 690], [395, 690]];
const sh = (t: number) => frameNo(t);
const blink = (t: number, i: number, swaps: number[] = []) => q(lidAt(t, i, swaps), 2);
/** BEAN in the bath (shots 1, 2, 6) */
const beanRig = (id: number, t: number, cp: THREE.Vector3): Rig => {
  const H = hookAt(id, t), E = endAt(id, t), L = LEAD;
  let A: V3 = [...BEAN_A] as V3;
  let e: Expr = "calm", look: P2 = [0, 0], tilt = 0, hy = 0;
  const swaps: number[] = [];
  const hands: [HandCard | null, HandCard | null] = [null, null];
  const S0 = (A0: V3) => cardW(A0, BEAN_SH[0], 1, cp), S1 = (A0: V3) => cardW(A0, BEAN_SH[1], 1, cp);
  if (id === 1 || id === 2) {
    const lean = id === 2 ? 1 : H.lean; // shot 2 keeps shot 1's end pose (no jump across the cut)
    A = add(A, [0, 0, 0.1 * lean]);
    if (id === 1) {
      swaps.push(W.not - L, W.brain - 0.3 - L, W.weird - 0.2 - L);
      if (t < W.not - L) { e = "horror"; look = [0.8, -0.6]; }
      else if (t < W.brain - 0.3 - L) { e = "puzzled"; look = [0.6, -0.9]; tilt = 0.12; }
      else if (t < W.weird - 0.2 - L) { e = "wonder"; look = [-0.8, -0.8]; tilt = -0.08; }
      else { e = "curious"; look = [0.2, 0.1]; tilt = 0.06 * H.lean; hy = 14 * H.lean; }
    } else {
      swaps.push(W.purpose - 0.1 - L);
      e = t < W.purpose - 0.1 - L ? "curious" : "shock"; look = t < W.purpose - 0.1 - L ? [0.9, -0.3] : [0.6, -0.3];
      tilt = e === "shock" ? -0.05 : 0.06; hy = 14;
    }
    // the raised pruney hand (horror: a tiny tremble; the drop's impact: a little recoil)
    const trem = id === 1 && t < W.not - L ? 0.012 * Math.sin(t * 38) : 0;
    const hit = id === 1 ? Math.max(0, Math.sin(Math.PI * clamp01((H.drop - 0.48) / 0.2))) : 0;
    // holo contract: palm centre = PALM_UP (= holo HAND) in shot 2, thumb toward his face, ~0.5 m wrist -> tip
    const P = add(PALM_UP, [trem, -0.03 * hit, 0]);
    hands[1] = mkHand(P, 0.46, "open", BEAN_KIT, 1, 0, 1, S1(A), cp, -0.12, { wet: 1, mirror: false, thumbA: -0.5 });
    // shot 2: the X-ray hologram IS his hand (no doubled hand): no skin hand card, the arm ends at the holo wrist
    // (palm - 0.22 m); the 8-frame crossfade dissolves skin -> X-ray, so nothing pops
    if (id === 2) hands[1].hide = true;
  } else if (id === 6) {
    const up = ramp(t, W.hands2 - 0.35, 0.4);
    A = add(A, [0, -0.22 * (1 - up), 0]);
    swaps.push(W.hands2 - 0.3 - L, W.switched - 0.2 - L, W.mode - L);
    if (t < W.hands2 - 0.3 - L) { e = "bored"; look = [-0.6, 0.2]; tilt = -0.1; }
    else if (t < W.switched - 0.2 - L) { e = "worried"; look = [0.1, 1]; tilt = 0.05; }
    else if (t < W.mode - L) { e = "realize"; look = [0.7, -0.2]; }
    else { e = "smug"; look = [-0.9, 0.2]; tilt = -0.1; }
    if (up > 0.001) {
      const rise = (y: number) => lerp(FOAM_Y - 0.25, y, up);
      const P0: V3 = at(BATH, -0.24, rise(1.0) - 0.08 * E.smug, 0.22);
      const g = E.grab, show = ramp(t, W.rainmode + 0.08, 0.35);
      let P1: V3 = at(BATH, 0.24, rise(1.0), 0.22);
      if (g > 0) P1 = mix3(mix3(P1, SOAP_AT, smooth(g / 0.6)), SOAP_SHOW, show); // reaches the bar exactly as props hands it over (g 0.6)
      const kind1: HandK = soapHeld(t) > 0 ? "soap" : g > 0.2 ? "splay" : "open";
      const H6 = 0.26 * (0.6 + 0.4 * up);
      // fingers up, palms to camera: he stares at his pruney fingertips; the soap fist tilts in toward his face
      hands[0] = fixHand(mkHand(P0, H6, E.smug > 0.5 ? "rest" : "open", BEAN_KIT, 1, 0, 0, S0(A), cp, 0, { wet: 1 }), -0.22 - 0.1 * E.smug);
      hands[1] = fixHand(mkHand(P1, H6, kind1, BEAN_KIT, 1, 0, 1, S1(A), cp, 0, { wet: kind1 === "soap" ? 0 : 1 }), lerp(0.22, -0.3, show) + 0.9 * g * (1 - show));
    }
  }
  const foamY = q(975 - (FOAM_Y - A[1]) / SU, 1);
  const s: FigS = {
    // shots 1-2: the head is nudged away from the raised hand so the face reads at the left edge of the X-ray framing
    head: [id === 6 ? 300 : 286, BEAN_HEAD[1] + hy], a: 92, tilt: q(tilt, 50), face: { e, look, shake: sh(t) }, lid: blink(t, 7, swaps),
    body: [300, 760], rx: 118, ry: 105, rot: 0, arms: [], legs: [], foamY, foamHat: id === 6 ? 1 : 0,
  };
  if (["shock", "wonder", "smug"].includes(e)) s.lid = 0;
  if (hands[0]) s.arms.push(armTo(A, 1, BEAN_SH[0], hands[0], cp, -30));
  if (hands[1]) s.arms.push(armTo(A, 1, BEAN_SH[1], hands[1], cp, 30));
  for (const a of s.arms) a.thick = 62;
  return { figs: [{ who: "bean", A, sc: 1, kit: BEAN_KIT, s, tt: q(t, 10) }], hands: { bean: hands }, heads: { bean: cardW(A, s.head, 1, cp, 0.03) } };
};
/** the soap bar is in BEAN's fist (shot 6) */
export const soapHeld = (t: number) => (endAt(6, t).grab >= 0.6 ? 1 : 0);

// ---- lab ----
type Who4 = "smooth" | "wrinkly";
const LAB_HEAD: P2 = [300, 400], LAB_SH: [P2, P2] = [[210, 548], [390, 548]];
/** carry cycle: 0-.15 grab at the water bowl, .15-.5 carry, .5-.6 release, .6-1 back */
const cyclePos = (who: Who4, ph: number): { P: V3; hold: boolean } => {
  const B = LAB_BOWLS[who], wP = add(B.water, [0, 0.14, 0]), eP = add(B.empty, [0, 0.14, 0]);
  if (ph < 0.15) return { P: add(wP, [0, -0.04 * Math.sin((Math.PI * ph) / 0.15), 0]), hold: ph > 0.1 };
  if (ph < 0.5) { const u = smooth((ph - 0.15) / 0.35); return { P: add(mix3(wP, eP, u), [0, 0.14 * Math.sin(Math.PI * u), 0]), hold: true }; }
  if (ph < 0.6) return { P: eP, hold: ph < 0.53 };
  const u = smooth((ph - 0.6) / 0.4); return { P: add(mix3(eP, wP, u), [0, 0.08 * Math.sin(Math.PI * u), 0]), hold: false };
};
const labState = (who: Who4, t: number) => {
  const Lb = labAt(4, t), n = who === "wrinkly" ? Lb.wrinkly : Lb.smooth;
  const racing = Lb.go > 0.5 && t > W.people, ph = racing ? n % 1 : 0.62;
  return { Lb, n, racing, ph };
};
/** world fingertip of the carrying hand + whether a marble is pinched */
export const carryAt = (id: number, t: number, who: Who4): { P: V3; holding: boolean } => {
  if (id !== 4) return { P: [0, -100, 0], holding: false };
  const r = labRig(t, camPosAt(4, t)), h = r.hands[who][who === "smooth" ? 0 : 1];
  if (!h) return { P: [0, -100, 0], holding: false };
  return { P: handLocalW(h, [-54, -156], camPosAt(4, t)), holding: h.s.kind === "pinch" };
};
const MEME0 = W.faster - LEAD - 0.07, MEME1 = W.wrinkly2 + 0.35;
const labRig = (t: number, cp: THREE.Vector3): Rig => {
  const figs: Fig[] = [], hands: Rig["hands"] = {}, heads: Rig["heads"] = {};
  for (const who of ["smooth", "wrinkly"] as Who4[]) {
    const kit = who === "smooth" ? SMOOTH_KIT : WRINKLY_KIT, A = LAB_SEATS[who], sc = LAB_SC;
    const st = labState(who, t), carry: 0 | 1 = who === "smooth" ? 0 : 1, other: 0 | 1 = carry ? 0 : 1, sgn = who === "smooth" ? -1 : 1;
    const S = [cardW(A, LAB_SH[0], sc, cp), cardW(A, LAB_SH[1], sc, cp)];
    const prune = who === "wrinkly" ? 1 : 0, shine = who === "smooth" ? 1 : 0;
    const B = LAB_BOWLS[who];
    let e: Expr = "ready", look: P2 = [0, 0.6], tilt = 0, hy = 0, k = 1;
    const swaps: number[] = [];
    let Pc: V3, kc: HandK, Po: V3 = add(B.empty, [-sgn * 0.02, 0.12, 0.08]), ko: HandK = "rest";
    const cyc = cyclePos(who, st.ph);
    Pc = cyc.P; kc = cyc.hold ? "pinch" : "open";
    if (who === "smooth") {
      swaps.push(W.people - L2, MEME0, MEME1);
      const fum = st.Lb.fumble;
      e = t < W.people - L2 ? "nervous" : t < MEME0 ? "strain" : t < MEME1 ? "meme" : "defeat";
      look = e === "defeat" ? [0.2, 0.9] : e === "nervous" ? [0.5, 0.5] : [0, 0.6];
      if (e === "meme") { const s0 = t - MEME0; k = q(Math.min(1.15, smooth(s0 / 0.08) * (1 + 0.15 * Math.sin(s0 * 28) * Math.exp(-s0 * 4))), 20); tilt = 0.08 * Math.sin(t * 21); hy = -10; }
      if (fum > 0) { // flailing: both hands fly up beside his head, fingers splayed, marbles squirting out
        const fl = Math.sin(t * 26), dn = ramp(t, MEME1, 0.4);
        const up0 = at(LAB, -0.55 - 0.42, 1.32 + 0.05 * fl, -0.1), up1 = at(LAB, -0.55 + 0.42, 1.32 - 0.05 * fl, -0.1);
        const rest0 = add(B.water, [0.05, 0.1, 0.05]), rest1 = add(B.empty, [-0.05, 0.1, 0.05]);
        Pc = mix3(mix3(Pc, up0, fum), rest0, dn); Po = mix3(mix3(Po, up1, fum), rest1, dn);
        kc = fum > 0.3 && dn < 0.5 ? "splay" : dn >= 0.5 ? "rest" : kc; ko = fum > 0.3 && dn < 0.5 ? "splay" : "rest";
      }
    } else {
      swaps.push(W.people - L2, W.wrinkly2 - 0.1 - LEAD);
      e = t < W.wrinkly2 - 0.1 - LEAD ? (st.racing ? "focus" : "ready") : "triumph";
      look = e === "triumph" ? [0, 0] : [-0.4, 0.8];
      const win = st.Lb.win;
      if (win > 0) {
        Pc = mix3(Pc, at(LAB, 0.55 + 0.04, 1.68, -0.1), win); kc = win > 0.5 ? "grip" : kc;
        Po = mix3(Po, at(LAB, 0.55 - 0.38, 1.18, -0.05), win); ko = win > 0.5 ? "thumb" : ko;
        hy = -12 * win; tilt = -0.06 * win;
      }
    }
    const hc = mkHand(Pc, 0.2, kc, kit, prune, shine, carry, S[carry], cp, 0, { sleeve: kit.topCol });
    const ho = mkHand(Po, 0.2, ko, kit, prune, shine, other, S[other], cp, ko === "thumb" ? 0.6 : 0, { sleeve: kit.topCol });
    const hs: [HandCard | null, HandCard | null] = carry ? [ho, hc] : [hc, ho];
    const s: FigS = {
      head: [300, LAB_HEAD[1] + hy], a: 90, tilt: q(tilt, 50), face: { e, look, k, shake: sh(t) }, lid: e === "meme" ? 0 : blink(t, who === "smooth" ? 11 : 13, swaps),
      body: [300, 640], rx: 108, ry: 118, rot: 0,
      arms: [armTo(A, sc, LAB_SH[0], hs[0]!, cp, -20), armTo(A, sc, LAB_SH[1], hs[1]!, cp, 20)],
      legs: [{ hip: [255, 745], foot: [240, 960], bend: -20 }, { hip: [345, 745], foot: [360, 960], bend: 20 }],
    };
    figs.push({ who, A, sc, kit, s, blob: true });
    hands[who] = hs; heads[who] = cardW(A, s.head, sc, cp, 0.03);
  }
  { // the referee
    const A = REF_AT, sc = REF_SC, Lb = labAt(4, t);
    const e: Expr = t < W.faster - LEAD ? "watch" : t < W.wrinkly2 - 0.1 - LEAD ? "wow" : "cheer";
    const pt = Lb.win;
    const s: FigS = {
      head: [300, 235], a: 88, tilt: q(e === "wow" ? -0.06 : 0.03 * Math.sin(t * 2), 50), face: { e, look: e === "watch" ? [Math.sin(t * 3.1) > 0 ? 0.8 : -0.8, 0.5] : [0.8, 0.3], shake: sh(t) },
      lid: e === "cheer" ? 0 : blink(t, 17, [W.faster - LEAD, W.wrinkly2 - 0.1 - LEAD]),
      body: [300, 470], rx: 112, ry: 165, rot: 0, clip: [250, 470],
      arms: [
        { sh: [210, 350], w: [235, 500], bend: -40, hand: { kind: "grip", ang: 0, prune: 0, shine: 0, skin: REF_KIT.skin }, handK: 0.32 },
        { sh: [390, 350], w: [lerp(330, 520, pt), lerp(460, 300, pt)], bend: lerp(30, 10, pt), hand: { kind: pt > 0.5 ? "open" : "pinch", ang: 0, prune: 0, shine: 0, skin: REF_KIT.skin }, handK: 0.32 },
      ],
      legs: [{ hip: [255, 620], foot: [245, 960], bend: 0 }, { hip: [345, 620], foot: [355, 960], bend: 0 }],
    };
    figs.push({ who: "ref", A, sc, kit: REF_KIT, s, blob: true });
    heads.ref = cardW(A, s.head, sc, cp, 0.03);
    hands.ref = [null, null];
  }
  return { figs, hands, heads };
};
const L2 = LEAD + 0.2;

// ---- the cliff (cliff.ts: CLIFF_START feet, HOLD_B foot hold that slips, HOLD_A hand grip, branch top) ----
const ANC_HEAD: P2 = [300, 300], ANC_SH: [P2, P2] = [[212, 430], [388, 430]];
const T_SLIDE0 = W.grip - 0.45, T_GRIP = W.grip - 0.08;
/** soles -> raised hands (m) at ANC_SC */
const REACH = 1.4;
const ancRig = (t: number, cp: THREE.Vector3): Rig => {
  const C = cliffAt(5, t), sc = ANC_SC, cx = CLIFF[0];
  const c = C.climb, sw = C.swing, L = LEAD;
  const zF = CLIFF_CARD_Z, zB = BRANCH_CARD_Z;
  // 1) climb: soles CLIFF_START -> HOLD_B (left foot on it), hands walking up the face above him
  const sx = lerp(CLIFF_START[0], HOLD_B[0] + 0.15, smooth(c)), step = Math.sin(c * Math.PI * 5);
  let sy = lerp(CLIFF_START[1], HOLD_B[1], c) + 0.04 * Math.abs(step) * (1 - c);
  let H0: V3 = [sx - 0.2, sy + REACH + 0.08 * Math.max(0, step) * (1 - c), zF + 0.06];
  let H1: V3 = [lerp(sx + 0.2, HOLD_A[0] + 0.2, smooth((c - 0.6) / 0.4)), sy + REACH + 0.08 * Math.max(0, -step) * (1 - c), zF + 0.06];
  // 2) the foot slips off HOLD_B: he drops + slides, hands scrabble; 3) GRIP: the fists clamp HOLD_A, he bounces
  const slide = ramp(t, T_SLIDE0, T_GRIP - T_SLIDE0), g = C.grip;
  sy -= 0.22 * slide; H0 = add(H0, [0, -0.14 * slide, 0]); H1 = add(H1, [0, -0.14 * slide, 0]);
  if (g > 0) {
    const gs = t - T_GRIP, bounce = 0.05 * Math.exp(-gs * 6) * Math.cos(gs * 22);
    const G0: V3 = [HOLD_A[0] - 0.2, HOLD_A[1], zF + 0.06], G1: V3 = [HOLD_A[0] + 0.2, HOLD_A[1], zF + 0.06];
    H0 = mix3(H0, G0, g); H1 = mix3(H1, G1, g);
    sy = lerp(sy, HOLD_A[1] - REACH - 0.06 + bounce, g);
  }
  let A: V3 = [lerp(sx, HOLD_A[0], g), sy, zF];
  // 4) swing up onto the branch top (lands ~swing 0.72, then rides the branch dip)
  if (sw > 0) {
    const u = smooth(sw / 0.72), land = sw >= 0.72, bx = BRANCH_POS[0];
    const top = branchTopY(bx) + branchAt(5, t).dy;
    // the card stands at BRANCH_CARD_Z (in front of the branch): put the soles where the branch top PROJECTS from
    // this camera, so the feet sit on the branch in picture
    const A1: V3 = [bx, top, zB], pc = projC(A1, [bx, top, BRANCH_POS[2]], sc, cp), R1 = rightOf(cp, A1);
    const P0 = A, P1: V3 = add([bx, top + (975 - pc[1]) * SU * sc - 0.15, zB], R1, (pc[0] - 300) * SU * sc); // -0.1: feet sink into the moss
    A = [lerp(P0[0], P1[0], u), lerp(P0[1], P1[1], u) + 0.5 * Math.sin(Math.PI * u) * (land ? 0 : 1), lerp(P0[2], P1[2], u)];
    if (land) A = add(P1, [0, -0.04 * Math.exp(-(t - (W.branches - 0.4 + 0.58)) * 5), 0]);
    const body = (dx: number, dy: number): V3 => cardW(A, [300 + dx, 975 - dy], sc, cp, 0.06);
    const lead0 = add(A, [-0.1, REACH, 0.06]), lead1 = add(A, [0.18, REACH, 0.06]);
    const bal0 = body(-200, 690), bal1 = t >= W.rain2 - L - 0.2 ? body(170, 870) : body(200, 680);
    const k1 = smooth(sw / 0.3), k2 = smooth((sw - 0.55) / 0.45);
    H0 = mix3(mix3(H0, lead0, k1), bal0, k2); H1 = mix3(mix3(H1, lead1, k1), bal1, k2);
  }
  const swaps = [T_SLIDE0 - L, T_GRIP - L, W.branches - L, W.rain2 - L];
  const e: Expr = t < T_SLIDE0 - L ? "effort" : t < T_GRIP - L ? "scared" : t < W.branches - L ? "grit" : t < W.rain2 - L ? "relief" : "cheeky";
  const onRock = sw < 0.3;
  const gripK: HandK = onRock ? (t >= T_GRIP - L ? "grip" : t >= T_SLIDE0 ? "splay" : "open") : t >= W.rain2 - L - 0.2 ? "thumb" : "open";
  const S = [cardW(A, ANC_SH[0], sc, cp), cardW(A, ANC_SH[1], sc, cp)];
  const hc0 = fixHand(mkHand(H0, 0.2, onRock ? gripK : "open", ANC_KIT, 1, 0, 0, S[0], cp, 0, { wet: 1 }), onRock ? -0.1 : armAng(S[0], H0, cp));
  const hc1 = fixHand(mkHand(H1, 0.2, gripK, ANC_KIT, 1, 0, 1, S[1], cp, 0, { wet: 1 }), onRock ? 0.1 : gripK === "thumb" ? 0.15 : armAng(S[1], H1, cp));
  // legs: scrabbling on the climb (left foot on HOLD_B at the top), kicking on the slip, standing on the branch
  const kick = t > T_SLIDE0 && t < T_GRIP + 0.3 ? Math.sin(t * 30) : 0, stance = smooth((sw - 0.6) / 0.4);
  const scr = (1 - c) * Math.sin(t * 7), hang = g * (1 - smooth(sw / 0.3));
  const foot = (i: 0 | 1): P2 => {
    const base: P2 = i ? [385, 940 - 60 * Math.max(0, -scr)] : [207, 965 - 60 * Math.max(0, scr)];
    const k: P2 = i ? [450 * Math.max(0, -kick) + 385 * (1 - Math.max(0, -kick)), base[1] - 90 * Math.max(0, -kick)] : [150 * Math.max(0, kick) + 207 * (1 - Math.max(0, kick)), base[1] - 90 * Math.max(0, kick)];
    const hg: P2 = [i ? 345 : 255, 975 + 10 * Math.sin(t * 5 + i)];
    const st: P2 = [i ? 365 : 235, 965];
    const m = (a: P2, b: P2, w: number): P2 => [lerp(a[0], b[0], w), lerp(a[1], b[1], w)];
    const f = m(m(k, hg, hang), st, stance);
    return [q(f[0], 1), q(f[1], 1)];
  };
  const s: FigS = {
    head: [300, ANC_HEAD[1]], a: 92, tilt: q(e === "scared" ? 0.1 * Math.sin(t * 20) : e === "cheeky" ? -0.12 : 0, 50), face: { e, look: e === "scared" ? [0, 1] : e === "effort" ? [0.3, -1] : [0.3, 0], shake: sh(t) },
    lid: ["effort", "relief", "cheeky", "grit"].includes(e) ? 0 : blink(t, 19, swaps), wet: 1,
    body: [300, 540], rx: 112, ry: 130, rot: 0,
    arms: [armTo(A, sc, ANC_SH[0], hc0, cp, -30), armTo(A, sc, ANC_SH[1], hc1, cp, 30)],
    legs: [{ hip: [255, 650], foot: foot(0), bend: -40 }, { hip: [345, 650], foot: foot(1), bend: 40 }],
  };
  void cx;
  return { figs: [{ who: "anc", A, sc, kit: ANC_KIT, s }], hands: { anc: [hc0, hc1] }, heads: { anc: cardW(A, s.head, sc, cp, 0.03) } };
};

const rigAt = (id: number, t: number, cp: THREE.Vector3): Rig | null =>
  id === 1 || id === 2 || id === 6 ? beanRig(id, t, cp) : id === 4 ? labRig(t, cp) : id === 5 ? ancRig(t, cp) : null;

// ---------------- exported contracts ----------------
const NOWHERE: V3 = [0, -100, 0];
/** world head centre */
export const headAt = (id: number, t: number, who = "bean"): V3 => rigAt(id, t, camPosAt(id, t))?.heads[who] ?? NOWHERE;
/** world palm centre: side 0 = screen-left, 1 = screen-right (NOWHERE while that hand is under the foam) */
export const handAt = (id: number, t: number, who: string, side: 0 | 1): V3 => rigAt(id, t, camPosAt(id, t))?.hands[who]?.[side]?.P ?? NOWHERE;
// holo: the X-ray hand rides BEAN's real raised palm (merged holo.ts exports HOLO_HOOKS; the sandbox stub may not)
{ const hk = (HoloMod as unknown as { HOLO_HOOKS?: { hand?: (id: number, t: number) => V3 | undefined } }).HOLO_HOOKS; if (hk) hk.hand = (id, t) => (id === 1 || id === 2 ? handAt(id, t, "bean", 1) : undefined); }
/** the ancestor's card anchor (soles) */
export const ancBodyAt = (t: number): V3 => ancRig(t, camPosAt(5, t)).figs[0].A;

// ---------------- drawing ----------------
const lightOf = (cam: CamInfo) => {
  const sun = cam.sun ?? new THREE.Vector3(0.5, 0.75, -0.4).normalize();
  const sx = sun.x * cam.right.x + sun.z * cam.right.z, sy = -sun.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const V = new THREE.Vector3();
let VIEW: { pos: THREE.Vector3; fwd: THREE.Vector3; right: THREE.Vector3; up: THREE.Vector3; th: number } | null = null;
const setView = (id: number, t: number, cam: CamInfo) => {
  const s = SHOTS[id - 1], c = camAt(id, Math.max(s.a, Math.min(s.b, frameNo(t))));
  const fwd = new THREE.Vector3(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
  const right = cam.right.clone().normalize(), up = new THREE.Vector3().crossVectors(right, fwd).normalize();
  VIEW = { pos: cam.pos.clone(), fwd, right, up, th: Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) };
};
/** canvas tier from the card's projected height on the 2560-px final (textures <= 2048) */
const tierOf = (P: V3, cardH: number): [number, number, number] => {
  const d = VIEW ? Math.max(0.3, V.set(P[0], P[1], P[2]).distanceTo(VIEW.pos)) : 5, th = VIEW?.th ?? 0.414;
  const px = (cardH / (2 * d * th)) * 2560;
  const h = px < 330 ? 400 : px < 700 ? 800 : px < 1150 ? 1280 : 2048;
  return [Math.round(h * 0.6), h, h / 1000];
};
const figCard = (out: Stage, f: Fig, light: number) => {
  const mid: V3 = [f.A[0], f.A[1] + 1.0 * f.sc, f.A[2]];
  const [w, h, k] = tierOf(mid, 2.16 * f.sc);
  const s = f.s, kit = f.kit, tt = f.tt ?? 0;
  out.places.push({ key: `wr|${f.who}|${fkey(s)}|${tt}|${q(light, 10)}`, draw: (p: Pen) => drawFig(p, kit, s, light, tt), x: f.A[0], y: f.A[1], z: f.A[2], scale: f.sc, size: [w, h, k] });
};
const handCard = (out: Stage, who: string, side: number, h: HandCard) => {
  const sc = handSc(h), A = handA(h), [w, hh2, k] = tierOf(h.P, 2.16 * sc), s = h.s;
  out.places.push({ key: `wr|hand|${who}${side}|${fkey(s)}`, draw: (p: Pen) => drawHandCard(p, s), x: A[0], y: A[1], z: A[2], scale: sc, size: [w, hh2, k] });
};

// ---------------- effects ----------------
const fxCard = (out: Stage, key: string, cw: number, ch: number, draw: (p: Pen) => void, P: V3, w: number, h: number, extra: { rot?: number; soft?: boolean } = {}) => {
  if (w < 0.004 || h < 0.004) return;
  out.fx.push({ key, cw, ch, draw, x: P[0], y: P[1], z: P[2], w, h, ...extra });
};
const camVecs = (cam: CamInfo, P: V3) => {
  const n = new THREE.Vector3(cam.pos.x - P[0], cam.pos.y - P[1], cam.pos.z - P[2]).normalize();
  const up = new THREE.Vector3().crossVectors(n, cam.right).normalize();
  return { R: [cam.right.x, cam.right.y, cam.right.z] as V3, N: [n.x, n.y, n.z] as V3, U: [up.x, up.y, up.z] as V3 };
};
const at3 = (P: V3, R: V3, U: V3, N: V3, x: number, y: number, z: number) => add(add(add(P, R, x), U, y), N, z);
/** keep a camera-facing card (centre P, size w x h) in frame: clear of the edges, the watermark and the captions */
const fit = (P: V3, w: number, h: number): V3 => {
  if (!VIEW) return P;
  const v = new THREE.Vector3(P[0], P[1], P[2]).sub(VIEW.pos), z = v.dot(VIEW.fwd);
  if (z < 0.3) return P;
  const hy = VIEW.th * z, hx = hy * (9 / 16), x = v.dot(VIEW.right), y = v.dot(VIEW.up);
  const mx = hx * 0.94 - w / 2, top = hy * 0.76 - h / 2, bot = -hy * 0.3 + h / 2;
  const nx = mx > 0 ? Math.max(-mx, Math.min(mx, x)) : 0, ny = top > bot ? Math.max(bot, Math.min(top, y)) : y;
  return add(add(P, [VIEW.right.x, VIEW.right.y, VIEW.right.z], nx - x), [VIEW.up.x, VIEW.up.y, VIEW.up.z], ny - y);
};
const mark = (out: Stage, t: number, t0: number, t1: number, P: V3, m: "!" | "?", size = 0.2) => {
  const k = env(t, t0, t1);
  if (k < 0.02) return;
  fxCard(out, `mark${m}`, 300, 400, (p) => fxMark(p, m, m === "!" ? "#ff5a4a" : "#ffe46b"), fit([P[0], P[1] + 0.015 * Math.sin(t * 5), P[2]], size, size * 1.33), size * k, size * 1.33 * k, { rot: 0.12 * Math.sin(t * 3) });
};
const sparkles = (out: Stage, t: number, t0: number, t1: number, C: V3, cam: CamInfo, spread: number, n: number, seed: number, size = 0.08) => {
  const g = env(t, t0, t1, 0.3, 0.4);
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, C);
  for (let j = 0; j < n; j++) {
    const ph = ((t - t0) * 1.2 + hh(seed, j)) % 1, s = size * g * Math.pow(Math.sin(Math.PI * ph), 2) * (0.7 + 0.6 * hh(seed, j + 20));
    const col = j % 3 === 0 ? "#fff6a8" : j % 3 === 1 ? "#ffffff" : "#bff0ff";
    fxCard(out, `spark|${col}`, 256, 256, (p) => fxSparkle(p, col), at3(C, R, U, N, (hh(seed, j + 40) - 0.5) * 2 * spread, (hh(seed, j + 60) - 0.5) * 1.6 * spread, 0.15), s, s, { rot: t * 0.8 + j });
  }
};
/** drops sliding / falling from P (sweat or rain drips) */
const drips = (out: Stage, t: number, from: number, to: number, P: V3, cam: CamInfo, rate: number, fall: number, size = 0.05, n = 2) => {
  if (t < from || t > to + 1 / rate) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const t0 = from + j / (n * rate), ph = ((t - t0) * rate) % 1, cyc = Math.floor((t - t0) * rate);
    if (t < t0 || t0 + cyc / rate > to) continue;
    const k = Math.sin(Math.PI * Math.min(1, ph * 1.1));
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, (j - (n - 1) / 2) * 0.07, -fall * ph * ph, 0.1), size * k, size * 1.3 * k);
  }
};
const burst = (out: Stage, t: number, t0: number, P: V3, cam: CamInfo, r: number, n: number, seed: number, size = 0.07) => {
  const s0 = t - t0;
  if (s0 < 0 || s0 > 0.9) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < n; j++) {
    const a = (j / n) * Math.PI * 2 + hh(seed, j), d = r + s0 * (0.5 + 0.4 * hh(seed, j + 3)), k = Math.sin(Math.PI * Math.min(1, s0 / 0.9));
    fxCard(out, "sweat", 200, 260, fxSweat, at3(P, R, U, N, Math.cos(a) * d, Math.sin(a) * d * 0.8 - 0.6 * s0 * s0, 0.15), size * k, size * 1.3 * k, { rot: -Math.cos(a) * 0.8 });
  }
};
const confetti = (out: Stage, t: number, t0: number, C: V3, cam: CamInfo, n: number, seed: number) => {
  const s0 = t - t0;
  if (s0 < 0) return;
  const { R, U, N } = camVecs(cam, C), cols = ["#ff4a6a", "#ffd23a", "#3ad0ff", "#6ae06a", "#b07aff"];
  for (let j = 0; j < n; j++) {
    const a = -Math.PI / 2 + (hh(seed, j) - 0.5) * 2.6, v = 1.6 + 1.2 * hh(seed, j + 5), x = Math.sin(a) * v * s0 * 0.6 + 0.05 * Math.sin(s0 * 6 + j), y = v * s0 * 0.9 - 1.6 * s0 * s0;
    const k = smooth(s0 / 0.1) * (1 - smooth((s0 - 1.3) / 0.4)), col = cols[j % 5], shp = j % 3;
    if (k < 0.02) continue;
    fxCard(out, `conf|${col}|${shp}`, 256, 256, (p) => fxConfetti(p, col, shp), at3(C, R, U, N, x, y, 0.2), 0.06 * k, 0.06 * k, { rot: s0 * (4 + 6 * hh(seed, j + 9)) });
  }
};
const speedLines = (out: Stage, t: number, P: V3, cam: CamInfo, g: number, horiz: boolean, size = 0.18) => {
  if (g < 0.02) return;
  const { R, U, N } = camVecs(cam, P);
  for (let j = 0; j < 3; j++) {
    const ph = (t * 4 + j / 3) % 1, k = g * Math.sin(Math.PI * ph);
    const off = horiz ? at3(P, R, U, N, -0.12 - 0.15 * ph, (j - 1) * 0.06, 0.05) : at3(P, R, U, N, (j - 1) * 0.07, -0.12 - 0.15 * ph, 0.05);
    fxCard(out, "speed", 256, 512, fxSpeed, off, size * 0.4 * k, size * k, { rot: horiz ? Math.PI / 2 : 0 });
  }
};

// ---------------- per shot ----------------
export const castAt = (id: number, t: number, cam: CamInfo, light: "day" | "golden"): Stage => {
  const out: Stage = { places: [], fx: [] };
  prepStage(light, cam);
  setView(id, t, cam);
  const cp = cam.pos, lt = lightOf(cam);
  const rig = rigAt(id, t, cp);
  if (!rig) return out;
  for (const f of rig.figs) {
    figCard(out, f, lt);
    if (f.blob) blob(out, f.A[0], f.A[1] + 0.012, f.A[2], 0.9 * f.sc, 1);
  }
  for (const [who, hs] of Object.entries(rig.hands)) hs.forEach((h, i) => { if (h && !h.hide) handCard(out, who, i, h); });
  if (id === 1 || id === 2 || id === 6) beanFx(id, t, rig, cam, out);
  else if (id === 4) labFx(t, rig, cam, out);
  else if (id === 5) cliffFx(t, rig, cam, out);
  return out;
};

const beanFx = (id: number, t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const head = rig.heads.bean, top = add(head, [0.05, 0.34, 0.05]), cp = cam.pos;
  const h1 = rig.hands.bean[1];
  if (id === 1) {
    const H = hookAt(1, t);
    drips(out, t, 0.25, W.not - 0.2, add(head, [0.2, 0.1, 0.05]), cam, 1.5, 0.12, 0.045, 1);
    // the water drop: falls onto the index fingertip, bounces off (it does NOT soak in), a little splash
    if (h1 && H.drop > 0 && H.drop < 1) {
      // QA: the MIDDLE fingertip (central, in the close-up); it drops in from the frame top and boings up-LEFT into
      // the gap by his face (it used to bounce off the right edge, unseen)
      const R = rightOf(cp, h1.P), tip = add(add(h1.P, R, -0.012), [0, 0.335, 0]), u = H.drop; // measured on the close-up frames
      let P: V3, k: number;
      if (u < 0.5) { const v = (u / 0.5) ** 2; P = add(tip, [0, 0.055 + 0.36 * (1 - v), 0.04]); k = smooth(u / 0.08); }
      else { const v = (u - 0.5) / 0.5; P = add(add(tip, R, -0.24 * v), [0, 0.055 + 0.46 * v * (1.3 - 1.6 * v), 0.04]); k = 1 - smooth((v - 0.8) / 0.2); }
      const sq = u > 0.44 && u < 0.56 ? 1 - 0.38 * Math.sin(Math.PI * (u - 0.44) / 0.12) : 1;
      fxCard(out, "drop", 256, 320, fxDrop, P, 0.085 * k / Math.sqrt(sq), 0.106 * k * sq, { rot: u > 0.5 ? -2.4 * (u - 0.5) : 0 });
      const sk = u > 0.47 && u < 0.85 ? (u - 0.47) / 0.38 : -1;
      if (sk >= 0) fxCard(out, `splash|${q(sk, 12)}`, 512, 300, (p) => fxSplash(p, q(sk, 12)), add(tip, [0, 0.04, 0.05]), 0.2 * (1 - 0.4 * sk), 0.117 * (1 - 0.4 * sk));
    }
    mark(out, t, W.not - LEAD, W.brain - 0.45, top, "?", 0.18);
    // the BRAIN PIT-STOP thought bubble
    const bk = H.bubble;
    if (bk > 0.02) {
      const { R, U, N } = camVecs(cam, head), w = 0.8, ov = 1 + 0.15 * Math.sin(Math.PI * clamp01((t - (W.brain - 0.3)) / 0.35));
      const P = fit(at3(head, R, U, N, -0.28, 0.5, 0.22), w, w);
      fxCard(out, `bubble|${q(H.swap, 30)}|${q((t * 4) % (Math.PI * 2), 4)}`, 800, 800, (p) => fxBubble(p, q(H.swap, 30), q((t * 4) % (Math.PI * 2), 4)), P, w * bk * ov, w * bk * ov, { rot: 0.03 * Math.sin(t * 2) });
    }
    if (h1) sparkles(out, t, W.weird - 0.2, 99, handLocalW(h1, [0, -120], cp), cam, 0.12, 4, 31, 0.06);
  } else if (id === 2) {
    mark(out, t, W.purpose - 0.1 - LEAD, 99, top, "!", 0.24);
    sparkles(out, t, W.purpose - 0.1, 99, add(head, [0, 0.1, 0]), cam, 0.3, 5, 37, 0.07);
  } else {
    const E = endAt(6, t);
    // bored: little bubbles rising from the foam by his mouth
    if (E.bored > 0.05) { const { R, U, N } = camVecs(cam, head); for (let j = 0; j < 3; j++) { const ph = (t * 0.9 + j / 3) % 1, k = E.bored * Math.sin(Math.PI * ph); fxCard(out, "puff", 128, 128, (p) => { p.ell(64, 64, 50, 50, "#f4fbff", 8); p.ell(46, 46, 12, 9, "#ffffff", 0); }, at3(head, R, U, N, 0.22 + 0.04 * j, -0.14 + 0.35 * ph, 0.12), 0.05 * k, 0.05 * k); } }
    if (E.worried > 0.05) drips(out, t, W.hands2 - 0.2, W.switched - 0.3, add(head, [0.2, 0.12, 0.05]), cam, 1.6, 0.12, 0.045, 1);
    mark(out, t, W.switched - 0.2 - LEAD, W.rainmode - 0.2, top, "!", 0.18);
    const hb = rig.hands.bean[1];
    if (hb && E.badge > 0.01) {
      const kb = env(t, W.rainmode - 0.15, 99, 0.22, 0.2), w = 0.56, P = fit(add(head, [0.08, 0.52, 0.12]), w, w / 2.56);
      fxCard(out, "badge", 1024, 400, fxBadge, P, w * kb, (w / 2.56) * kb, { rot: -0.04 });
    }
    if (hb && E.grab > 0) {
      const { R, U, N } = camVecs(cam, hb.P);
      const wk = env(t, W.rainmode - 0.03, W.rainmode + 0.12, 0.05, 0.15);
      // one set of whoosh lines trailing up-left of the fist, along its dive to the soap (3 stacked cards read as a ladder)
      if (wk > 0.02) fxCard(out, "speed", 256, 512, fxSpeed, at3(hb.P, R, U, N, -0.1, 0.08, 0.05), 0.09 * wk, 0.18 * wk, { rot: 0.9 });
      sparkles(out, t, W.rainmode + 0.1, 99, hb.P, cam, 0.14, 4, 43, 0.07);
    }
    sparkles(out, t, W.mode - LEAD, 99, add(head, [0, 0.2, 0]), cam, 0.22, 3, 47, 0.06);
  }
};

const labFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const Lb = labAt(4, t), hs = rig.heads.smooth, hw = rig.heads.wrinkly, hr = rig.heads.ref;
  drips(out, t, shotStart(4) + 0.2, MEME0 - 0.05, add(hs, [0.18, 0.1, 0.05]), cam, 1.8, 0.12, 0.04, 2);
  // WRINKLY zooms: speed lines behind the carrying hand
  const hc = rig.hands.wrinkly[1];
  if (hc) speedLines(out, t, hc.P, cam, env(t, W.people, W.wrinkly2 - 0.15, 0.15, 0.2), true, 0.2);
  // THE PEAK: SMOOTH's ray burst, sweat flying, marbles squirting out of his hands
  if (t >= MEME0) {
    const s0 = t - MEME0, { R, U, N } = camVecs(cam, hs);
    const rk = env(t, MEME0, MEME1 - 0.1, 0.1, 0.3);
    if (rk > 0.02) fxCard(out, "rays", 512, 512, fxRays, at3(hs, R, U, N, 0, 0, -0.25), 0.72 * rk, 0.72 * rk, { rot: s0 * 0.7 });
    burst(out, t, MEME0, hs, cam, 0.22, 7, 13, 0.05);
    for (let side = 0; side < 2; side++) {
      const h = rig.hands.smooth[side];
      if (!h) continue;
      for (let j = 0; j < 3; j++) {
        const t0 = MEME0 + 0.05 + j * 0.16 + side * 0.08, s1 = t - t0;
        if (s1 < 0 || s1 > 0.9) continue;
        const a = (side ? 0.4 : -0.4) + (hh(j, side + 3) - 0.5) * 1.4, v = 1.2 + 0.6 * hh(j, side + 7);
        const P = add(add(h.P, rightOf(cam.pos, h.P), Math.sin(a) * v * s1), [0, Math.cos(a) * v * s1 - 2.4 * s1 * s1, 0.12]);
        const k = smooth(s1 / 0.06) * (1 - smooth((s1 - 0.7) / 0.2)), col = MARBLE[(j + side) % 4];
        fxCard(out, `marble|${col}`, 128, 128, (p) => fxMarble(p, col), P, 0.045 * k, 0.045 * k);
      }
    }
    mark(out, t, MEME0, W.wrinkly2 - 0.3, add(hr, [0.06, 0.3, 0.05]), "!", 0.15);
  }
  if (t > MEME1) drips(out, t, MEME1, 99, add(hs, [-0.18, 0.1, 0.05]), cam, 1.2, 0.12, 0.045, 1);
  // the win: trophy in the raised fist, confetti, sparkles
  const hw1 = rig.hands.wrinkly[1];
  if (Lb.win > 0.02 && hw1) {
    const k = env(t, W.wrinkly2 - 0.1, 99, 0.25, 0.2), w = 0.24;
    fxCard(out, "trophy", 512, 512, fxTrophy, add(hw1.P, [0, 0.13, 0.08]), w * k, w * k, { rot: 0.08 * Math.sin(t * 6) });
    confetti(out, t, W.wrinkly2 - 0.1, add(hw, [0, 0.35, 0]), cam, 14, 5);
    sparkles(out, t, W.wrinkly2, 99, add(hw1.P, [0, 0.15, 0]), cam, 0.15, 4, 53, 0.07);
  }
  void Lb.fumble; void MARBLES;
};

const cliffFx = (t: number, rig: Rig, cam: CamInfo, out: Stage) => {
  const head = rig.heads.anc, cp = cam.pos, [h0, h1] = rig.hands.anc;
  drips(out, t, shotStart(5), 99, add(head, [-0.12, -0.1, 0.05]), cam, 1.3, 0.25, 0.04, 2);
  mark(out, t, T_SLIDE0 - LEAD, T_GRIP - 0.05, add(head, [0.05, 0.34, 0.05]), "!", 0.2);
  if (t > T_SLIDE0 && t < T_GRIP + 0.4) burst(out, t, T_SLIDE0, head, cam, 0.2, 5, 61, 0.05);
  // GRIP: screech arcs at both fists + the burst label
  if (h0 && h1) {
    const m = mix3(h0.P, h1.P, 0.5), gk = env(t, T_GRIP - LEAD, W.branches - 0.45, 0.08, 0.25);
    if (gk > 0.02) {
      const { R, U, N } = camVecs(cam, m);
      fxCard(out, "screech", 512, 420, fxScreech, at3(m, R, U, N, 0, 0.17, 0.12), 0.42 * gk, 0.34 * gk);
      const w = 0.5; fxCard(out, "pow|GRIP!", 800, 600, (p) => fxPow(p, "GRIP!", "#ff4a3a"), fit(at3(m, R, U, N, 0.45, 0.36, 0.2), w, w * 0.75), w * gk, w * 0.75 * gk, { rot: -0.12 });
    }
    sparkles(out, t, T_GRIP, W.branches - 0.45, m, cam, 0.15, 4, 67, 0.06);
  }
  const swk = env(t, W.branches - 0.4, W.branches + 0.25, 0.1, 0.2);
  if (swk > 0.02) speedLines(out, t, add(rig.figs[0].A, [0, 0.6, 0]), cam, swk, true, 0.35);
  sparkles(out, t, W.branches - LEAD, 99, add(head, [0, 0.1, 0]), cam, 0.3, 4, 71, 0.07);
  if (h1 && t > W.rain2 - LEAD) sparkles(out, t, W.rain2 - LEAD, 99, h1.P, cam, 0.1, 3, 73, 0.06);
  void cp;
};
