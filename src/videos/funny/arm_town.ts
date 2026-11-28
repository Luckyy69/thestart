// OWNER: arm agent. PINKY TOWN (ARM-LOCAL coordinates): the power POLE at (16,0,0) with insulators + the two house
// wires, PINKY's pink cottage (fingernail roof, lunula) and RING's blue cottage (a gold ring round the chimney, wired
// on only HALF: half its windows ever light), the town sign "PINKY TOWN - POP. 1 1/2", pavement, picket fence, flower
// pots, two streetlamps, and further back the other fingers' houses on a separate pole line "MEDIAN NERVE CO." whose
// lamps NEVER light.
import * as THREE from "three";
import { NOINK } from "../bridge/ink";
import { V3 } from "./story";
import { amat, tubeGeo, blobGeo, C, h1, lerp, TAU, townSignTex, medianTex, paveTex, softTex } from "./arm_kit";

const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; return o;
};
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
/** catenary between a and b, sag below the chord */
export const sagLine = (a: V3, b: V3, sag: number, n = 24): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n; out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * 4 * u * (1 - u), lerp(a[2], b[2], u)]); }
  return out;
};

export type Town = {
  G: THREE.Group;
  /** window glass materials: PINKY's, RING's lit half, RING's dead half, the others' */
  winP: THREE.MeshBasicMaterial; winR: THREE.MeshBasicMaterial; winRd: THREE.MeshBasicMaterial; winO: THREE.MeshBasicMaterial;
  /** streetlamp bulbs + their halos */
  bulbs: THREE.MeshBasicMaterial; halos: THREE.Sprite[]; deadBulbs: THREE.MeshBasicMaterial;
};

export const POLE_L: V3 = [16, 0, 0];
const POLE_H = 3.55, ARM_Y = 3.25;
export const PINKY_HOUSE_L: V3 = [20, 0, 1.6];
export const RING_HOUSE_L: V3 = [20, 0, -1.4];
const HW = 1.8, HH = 1.5, HD = 1.6;
export const STREETLAMPS_L: V3[] = [[17.4, 0, 2.75], [21.9, 0, 0.1]];

export const buildTown = (): Town => {
  const G = new THREE.Group();
  const wood = amat("wood", { color: "#8a5a34", spec: 0.15, shin: 18, rim: [0.3, 0.16, 0.08] });
  const white = amat("plain", { color: "#fff6ec", spec: 0.2, shin: 20 });
  const ink = amat("plain", { color: "#2a2430", spec: 0.4, shin: 50 });
  const glassI = amat("plain", { color: "#bfe8d8", spec: 0.9, shin: 90, rim: [0.2, 0.3, 0.3] });
  const winP = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.4) });
  const winR = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.8, 0.4) });
  const winRd = new THREE.MeshBasicMaterial({ color: C("#2a3050") });
  const winO = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 0.36, 0.2) });
  const bulbs = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.1, 0.6) });
  const deadBulbs = new THREE.MeshBasicMaterial({ color: C("#4a4a54") });
  const halos: THREE.Sprite[] = [];

  // ---------- pavement (a slightly raised town square; characters' soles at y 0 sink 2.5 cm: invisible) ----------
  {
    const t = paveTex().clone(); t.repeat.set(5, 4); t.needsUpdate = true;
    const g = new THREE.CylinderGeometry(1, 1, 0.05, 64); g.translate(0, 0.0, 0);
    const m = mesh(g, amat("plain", { map: t, spec: 0.12, shin: 20, rim: [0.25, 0.15, 0.1] }), 19.4, 0.0, -0.2); m.scale.set(4.6, 1, 3.9); m.castShadow = false; G.add(m);
  }

  // ---------- the power pole ----------
  {
    const P = POLE_L;
    G.add(mesh(new THREE.CylinderGeometry(0.11, 0.15, POLE_H, 12), wood, P[0], POLE_H / 2, P[2]));
    G.add(mesh(box(0.16, 0.16, 2.5), wood, P[0], ARM_Y, P[2]));
    for (const s of [-1, 1]) { const br = mesh(box(0.06, 0.06, 0.9), wood, P[0], ARM_Y - 0.32, P[2] + s * 0.36); br.rotation.x = s * 0.75; G.add(br); }
    for (const z of [-0.95, 0.95]) {
      for (let k = 0; k < 3; k++) G.add(mesh(new THREE.CylinderGeometry(0.09 - k * 0.012, 0.11 - k * 0.012, 0.07, 14), glassI, P[0], ARM_Y + 0.12 + k * 0.08, P[2] + z));
    }
    // the cable end: a fat terminal box on the crossarm
    G.add(mesh(box(0.42, 0.36, 0.42), amat("plain", { color: "#5ab8a8", spec: 0.5, shin: 60 }), P[0], ARM_Y + 0.02, P[2]));
    // a little transformer can
    G.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.6, 18), amat("plain", { color: "#8a9aa8", spec: 0.6, shin: 70 }), P[0] - 0.32, 2.35, P[2]));
  }

  // ---------- houses ----------
  const house = (at: V3, body: string, trim: string) => {
    const H = new THREE.Group(); H.position.set(...at);
    H.add(mesh(box(HW, HH, HD), amat("plain", { color: body, spec: 0.15, shin: 20, rim: [0.3, 0.2, 0.2] }), 0, HH / 2, 0));
    H.add(mesh(box(HW + 0.08, 0.14, HD + 0.08), amat("plain", { color: trim, spec: 0.2 }), 0, 0.07, 0)); // plinth
    // door on the -x face
    return H;
  };
  const door = (H: THREE.Group, z: number, col: string) => {
    H.add(mesh(box(0.06, 0.98, 0.5), amat("wood", { color: col, spec: 0.3, shin: 40 }), -HW / 2 - 0.03, 0.56, z));
    H.add(mesh(new THREE.SphereGeometry(0.035, 10, 8), amat("plain", { color: "#ffd23a", spec: 0.9, shin: 90 }), -HW / 2 - 0.07, 0.56, z + 0.15));
    H.add(mesh(box(0.3, 0.05, 0.66), white, -HW / 2 - 0.12, 0.03, z)); // doorstep
  };
  /** a framed window: frame box proud of the wall + an emissive pane 2.5 cm in front of the wall face */
  const win = (H: THREE.Group, face: "x" | "z", c: number, mat: THREE.Material, w = 0.4, h = 0.44, y = 0.98) => {
    const fr = white, d = 0.05;
    if (face === "x") {
      const x = -HW / 2;
      H.add(mesh(box(d, h + 0.1, 0.06), fr, x - d / 2, y, c - w / 2 - 0.03)); H.add(mesh(box(d, h + 0.1, 0.06), fr, x - d / 2, y, c + w / 2 + 0.03));
      H.add(mesh(box(d, 0.06, w), fr, x - d / 2, y + h / 2 + 0.02, c)); H.add(mesh(box(d + 0.06, 0.07, w + 0.16), fr, x - d / 2 - 0.02, y - h / 2 - 0.03, c));
      H.add(mesh(box(d * 0.6, h, 0.035), fr, x - d / 2, y, c)); H.add(mesh(box(d * 0.6, 0.035, w), fr, x - d / 2, y, c));
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.rotation.y = -Math.PI / 2; p.position.set(x - 0.022, y, c); p.frustumCulled = false; H.add(p);
    } else {
      const z = HD / 2;
      H.add(mesh(box(0.06, h + 0.1, d), fr, c - w / 2 - 0.03, y, z + d / 2)); H.add(mesh(box(0.06, h + 0.1, d), fr, c + w / 2 + 0.03, y, z + d / 2));
      H.add(mesh(box(w, 0.06, d), fr, c, y + h / 2 + 0.02, z + d / 2)); H.add(mesh(box(w + 0.16, 0.07, d + 0.06), fr, c, y - h / 2 - 0.03, z + d / 2 + 0.02));
      H.add(mesh(box(0.035, h, d * 0.6), fr, c, y, z + d / 2)); H.add(mesh(box(w, 0.035, d * 0.6), fr, c, y, z + d / 2));
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.set(c, y, z + 0.022); p.frustumCulled = false; H.add(p);
    }
  };
  // PINKY: pink cottage, a glossy FINGERNAIL roof with a white lunula
  {
    const H = house(PINKY_HOUSE_L, "#ff8fb4", "#d85a86");
    door(H, -0.3, "#c8325a");
    win(H, "x", 0.38, winP); win(H, "z", -0.42, winP); win(H, "z", 0.42, winP);
    const g = new THREE.SphereGeometry(1, 48, 20, 0, TAU, 0, Math.PI / 2);
    const p = g.getAttribute("position") as THREE.BufferAttribute, cc = new Float32Array(p.count * 3);
    const nail = C("#ffc8d8"), lun = C("#fff6f4"), tip = C("#fff0f4");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      // the lunula: a pale crescent at the nail's base (the -x side, low)
      const lu = Math.max(0, -x) > 0.55 && y < 0.55 ? 1 : 0;
      const tp = x > 0.82 ? 1 : 0;
      const c = nail.clone().lerp(lun, lu * 0.9).lerp(tip, tp * 0.8);
      cc[i * 3] = c.r; cc[i * 3 + 1] = c.g; cc[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(cc, 3));
    const roof = mesh(g, amat("plain", { vc: true, spec: 0.95, shin: 110, rim: [0.4, 0.3, 0.32] }), 0, HH - 0.02, 0);
    roof.scale.set(1.12, 0.78, 1.0); H.add(roof);
    // cuticle rim
    const rim = mesh(new THREE.TorusGeometry(1, 0.06, 8, 48), amat("plain", { color: "#e86a94", spec: 0.3 }), 0, HH - 0.01, 0); rim.rotation.x = Math.PI / 2; rim.scale.set(1.12, 1.0, 1); H.add(rim);
    // mailbox "P"
    H.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), wood, -HW / 2 - 0.75, 0.45, 0.55));
    H.add(mesh(box(0.22, 0.2, 0.34), amat("plain", { color: "#ff4a7a", spec: 0.6, shin: 70 }), -HW / 2 - 0.75, 0.98, 0.55));
    G.add(H);
  }
  // RING: blue cottage, gable roof, a GOLD RING round the chimney, wired on only the +z half
  {
    const H = house(RING_HOUSE_L, "#80b6ee", "#4a7ac8");
    door(H, -0.15, "#2a4a9a");
    win(H, "x", 0.5, winR); win(H, "x", -0.6, winRd);
    win(H, "z", -0.4, winR); win(H, "z", 0.42, winRd); // half wired: the lit window sits right beside a dead one
    const rg = new THREE.CylinderGeometry(1, 1, 1, 3, 1); rg.rotateX(-Math.PI / 2); // triangular prism, apex up, ridge along z
    const roof = mesh(rg, amat("plain", { color: "#34468a", spec: 0.3, shin: 30, rim: [0.2, 0.2, 0.36] }), 0, HH + 0.42, 0);
    roof.scale.set(1.2, 0.84, HD + 0.3); roof.rotation.y = 0; H.add(roof);
    const ch = mesh(box(0.3, 0.8, 0.3), amat("plain", { color: "#c8604a", spec: 0.1 }), 0.45, HH + 0.75, -0.35); H.add(ch);
    const ring = mesh(new THREE.TorusGeometry(0.24, 0.06, 12, 32), amat("plain", { color: "#ffcc33", spec: 1.0, shin: 120, rim: [0.4, 0.3, 0.05] }), 0.45, HH + 0.95, -0.35); ring.rotation.x = Math.PI / 2; H.add(ring);
    H.add(mesh(new THREE.OctahedronGeometry(0.08, 0), amat("plain", { color: "#bff4ff", spec: 1.0, shin: 140 }), 0.45, HH + 1.08, -0.12));
    // fuse box on the wired half
    H.add(mesh(box(0.08, 0.3, 0.24), amat("plain", { color: "#5ab8a8", spec: 0.4 }), -HW / 2 - 0.04, 1.25, 0.25));
    G.add(H);
  }
  // house wires: pole insulators -> the cottages (glow with the line: kind "cable", u = 1)
  {
    const cm = amat("cable", { color: "#ffd040", spec: 0.6, shin: 60 });
    for (const [a, b] of [[[16, ARM_Y + 0.36, 0.95], [PINKY_HOUSE_L[0] - HW / 2 - 0.02, 1.38, PINKY_HOUSE_L[2] + 0.55]], [[16, ARM_Y + 0.36, -0.95], [RING_HOUSE_L[0] - HW / 2 - 0.02, 1.38, RING_HOUSE_L[2] + 0.45]]] as [V3, V3][]) {
      G.add(mesh(tubeGeo(sagLine(a, b, 0.35), () => 0.045, 8, undefined, true, () => 1), cm));
      G.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 10).rotateZ(Math.PI / 2), glassI, b[0] - 0.02, b[1], b[2]));
    }
  }
  // ---------- streetlamps ----------
  for (const L of STREETLAMPS_L) {
    G.add(mesh(new THREE.CylinderGeometry(0.045, 0.07, 2.3, 10), ink, L[0], 1.15, L[2]));
    G.add(mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.12, 10), ink, L[0], 0.06, L[2]));
    G.add(mesh(new THREE.ConeGeometry(0.24, 0.2, 6), ink, L[0], 2.62, L[2]));
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), bulbs); b.position.set(L[0], 2.42, L[2]); b.frustumCulled = false; G.add(b);
    G.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), ink, L[0], 2.75, L[2]));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: new THREE.Color(1.2, 0.85, 0.45), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    s.position.set(L[0], 2.42, L[2]); s.scale.setScalar(1.3); s.layers.set(NOINK); s.frustumCulled = false; s.renderOrder = 5; G.add(s); halos.push(s);
  }
  // ---------- picket fence behind the cottages ----------
  {
    const N = 34, pk = new THREE.InstancedMesh(box(0.09, 0.62, 0.035), white, N), m4 = new THREE.Matrix4();
    for (let i = 0; i < N; i++) { const z = -2.7 + (i / (N - 1)) * 5.6; m4.makeTranslation(21.75, 0.31 + 0.02 * h1(i), z); pk.setMatrixAt(i, m4); }
    pk.castShadow = true; pk.receiveShadow = true; pk.frustumCulled = false; G.add(pk);
    for (const y of [0.2, 0.46]) G.add(mesh(box(0.04, 0.06, 5.7), white, 21.72, y, 0.1));
  }
  // ---------- flower pots ----------
  {
    const pot = amat("plain", { color: "#d8703a", spec: 0.2, rim: [0.3, 0.15, 0.08] });
    const fl = [amat("plain", { vc: true, spec: 0.3 })];
    const spots: [number, number, string][] = [[18.95, 2.3, "#ff3a5a"], [18.95, 0.65, "#ffd23a"], [18.95, -2.15, "#ff6ad8"], [18.95, -0.7, "#ffffff"]];
    spots.forEach(([x, z, c], i) => {
      G.add(mesh(new THREE.CylinderGeometry(0.17, 0.12, 0.28, 16), pot, x, 0.14, z));
      G.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), amat("plain", { color: "#5a3a22" }), x, 0.27, z));
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * TAU + i, fx = x + Math.cos(a) * 0.07, fz = z + Math.sin(a) * 0.07, hy = 0.42 + 0.08 * h1(i * 3 + k);
        G.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, hy - 0.27, 5), amat("plain", { color: "#3a9a3a" }), fx, (hy + 0.27) / 2, fz));
        G.add(mesh(blobGeo(0.075, 10, 0.25, 3, i * 7 + k, () => C(c)), fl[0], fx, hy, fz));
      }
    });
  }
  // ---------- the town sign at the entrance (faces the incoming ride, 4+ m off its path) ----------
  {
    const S = new THREE.Group(); S.position.set(12.4, 0, -1.7); S.rotation.y = -0.93; // -z side of the line, clear of the RIDE
    for (const s of [-1, 1]) S.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.9, 10), wood, s * 0.72, 0.95, -0.04));
    const face = amat("plain", { map: townSignTex(), spec: 0.05, shin: 20, rim: [0.1, 0.1, 0.1] }), back = amat("plain", { color: "#2a6a3a" });
    S.add(mesh(box(1.7, 0.85, 0.06), [back, back, back, back, face, back], 0, 1.45, 0));
    G.add(S);
  }
  // ---------- the other fingers: houses + the MEDIAN NERVE CO. pole line (lamps never light) ----------
  {
    const cols: [string, string][] = [["#f4e0a8", "#c89a4a"], ["#a8e0b0", "#4a9a5a"], ["#cdb8f0", "#7a5ab8"]];
    cols.forEach(([b, r], i) => {
      const H = new THREE.Group(); H.position.set(21.0 + i * 2.05, 0, -6.1 + 0.25 * (i % 2)); H.rotation.y = -0.15 + 0.1 * i;
      H.add(mesh(box(1.5, 1.25, 1.3), amat("plain", { color: b, spec: 0.12 }), 0, 0.625, 0));
      const rg = new THREE.CylinderGeometry(1, 1, 1, 3, 1); rg.rotateX(-Math.PI / 2);
      const roof = mesh(rg, amat("plain", { color: r, spec: 0.2 }), 0, 1.25 + 0.34, 0); roof.scale.set(0.98, 0.68, 1.5); H.add(roof);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.36), winO); p.position.set(0, 0.72, 0.675); H.add(p);
      H.add(mesh(box(0.42, 0.06, 0.06), white, 0, 0.52, 0.68));
      G.add(H);
    });
    const poles: V3[] = [[9.5, 0, -4.6], [14.2, 0, -4.9], [18.6, 0, -4.7], [23.2, 0, -4.3]];
    poles.forEach((P, i) => {
      G.add(mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.0, 10), amat("wood", { color: "#6a5a4a", spec: 0.1 }), P[0], 1.5, P[2]));
      G.add(mesh(box(0.1, 0.1, 1.1), amat("wood", { color: "#6a5a4a" }), P[0], 2.75, P[2]));
      G.add(mesh(new THREE.ConeGeometry(0.16, 0.14, 8), ink, P[0] + 0.3, 2.5, P[2] + 0.3));
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), deadBulbs); b.position.set(P[0] + 0.3, 2.38, P[2] + 0.3); G.add(b);
      G.add(mesh(box(0.5, 0.04, 0.04), ink, P[0] + 0.15, 2.6, P[2] + 0.15));
      if (i < poles.length - 1) { const Q = poles[i + 1]; G.add(mesh(tubeGeo(sagLine([P[0], 2.85, P[2]], [Q[0], 2.85, Q[2]], 0.4), () => 0.03, 6), ink)); }
    });
    const pl = mesh(box(0.9, 0.28, 0.04), [ink, ink, ink, ink, amat("plain", { map: medianTex(), spec: 0.05 }), ink], 14.2, 1.7, -4.79); G.add(pl);
  }
  G.traverse((o) => { o.frustumCulled = false; });
  void lerp;
  return { G, winP, winR, winRd, winO, bulbs, halos, deadBulbs };
};
