// OWNER: looks agent. Light-you-can-see building blocks for lightfx.ts (all NOINK, additive, transparent, depthWrite
// false, deterministic): Beam (a ray-marched haze shaft through a window / an opening, extruded along the light),
// Cone (a cheap volumetric spotlight cone), Motes (dust specks that only glow inside a Beam), Glows (soft billboards).
import * as THREE from "three";
import { NOINK } from "../bridge/ink";

export type C3 = [number, number, number];
const NOISE = /* glsl */ `
  float lh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(lh(i), lh(i + vec2(1.0, 0.0)), f.x), mix(lh(i + vec2(0.0, 1.0)), lh(i + vec2(1.0, 1.0)), f.x), f.y); }`;
/** window-plane mask (lp.xy in -0.5..0.5): soft edges + mullion bars. mode 0 = plain opening, 1 = a 4-pane window
 *  (cross bar), 2 = a tall gallery window (centre bar + 2 transoms), 3 = skin (blotchy pores + hair shadows) */
const MASK = /* glsl */ `
  uniform float uMode; uniform float uBar;
  float bar(float v, float c, float w){ return smoothstep(w, w * 1.6, abs(v - c)); }
  float winMask(vec2 q){
    float e = smoothstep(0.5, 0.43, abs(q.x)) * smoothstep(0.5, 0.45, abs(q.y));
    float m = 1.0;
    if (uMode > 0.5 && uMode < 1.5) m = bar(q.x, 0.0, 0.022) * bar(q.y, 0.12, 0.018);
    else if (uMode > 1.5 && uMode < 2.5) m = bar(q.x, 0.0, 0.02) * bar(q.y, -0.12, 0.012) * bar(q.y, 0.2, 0.012);
    else if (uMode > 2.5) { m = 0.55 + 0.45 * vn(q * 7.0 + 3.1); m *= bar(q.x + 0.3 * q.y, 0.18, 0.012) * bar(q.x - 0.2 * q.y, -0.22, 0.01); }
    return e * mix(1.0, m, uBar);
  }`;

/** a haze shaft: the parallelepiped spanned by the window (centre c, axes U * w, V * h) extruded along the light's
 *  travel direction d for len metres; ray-marched, clipped to the room box, stopped at up to 3 vertical cylinders
 *  (the characters: haze never draws over a face standing inside it). */
export class Beam {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; inv = new THREE.Matrix3(); cen = new THREE.Vector3();
  constructor(parent: THREE.Object3D, mode = 0, steps = 22) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uInv: { value: this.inv }, uCen: { value: this.cen }, uHC: { value: new THREE.Vector3(1, 1, 1) }, uK: { value: 0 }, uT: { value: 0 },
        uMin: { value: new THREE.Vector3(-1e4, -1e4, -1e4) }, uMax: { value: new THREE.Vector3(1e4, 1e4, 1e4) },
        uCyl: { value: [0, 1, 2].map(() => new THREE.Vector4(0, 0, 0, 0)) }, uY0: { value: 0 }, uMode: { value: mode }, uBar: { value: 1 },
        uFall: { value: new THREE.Vector2(0.55, 1.0) }, uCap: { value: 0.22 },
      },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform mat3 uInv; uniform vec3 uCen; uniform vec3 uHC; uniform float uK; uniform float uT; uniform vec3 uMin; uniform vec3 uMax;
        uniform vec4 uCyl[3]; uniform float uY0; uniform vec2 uFall; uniform float uCap; varying vec3 vW;
        ${NOISE}
        ${MASK}
        // soft keep-out: how much a sample at distance t along the ray is hidden by a character (0 = free .. 0.9).
        // Only the part of the ray BEYOND its closest approach to the character's axis is hidden, with a soft rim, so
        // no hard column edge ever shows around a card.
        float keep(vec3 ro, vec3 rd, vec4 c, float t){
          if (c.z <= 0.0) return 0.0;
          vec2 o = c.xy - ro.xz; vec2 d = rd.xz; float a = max(dot(d, d), 1e-6);
          float tc = dot(o, d) / a; float dm = length(o - d * tc);
          float y = ro.y + rd.y * tc; float hy = smoothstep(c.w + 0.12, c.w - 0.08, y) * step(uY0, y);
          return 0.9 * (1.0 - smoothstep(c.z * 0.55, c.z * 1.25, dm)) * smoothstep(tc - c.z * 0.6, tc + c.z * 0.2, t) * hy * step(0.0, tc); }
        void main(){
          vec3 rd = normalize(vW - cameraPosition);
          vec3 rl = uInv * rd + vec3(1e-6); vec3 cl = uInv * (cameraPosition - uCen); vec3 pl = uInv * (vW - uCen);
          bool inside = all(lessThan(abs(cl), vec3(0.5)));
          if (gl_FrontFacing == inside) { gl_FragColor = vec4(0.0); return; }
          vec3 te = (sign(rl) * 0.5 - pl) / rl; float tB = max(min(min(te.x, te.y), te.z), 0.0);
          vec3 p0 = vW;
          if (inside) { p0 = cameraPosition; tB = length(vW - cameraPosition); }
          float acc = 0.0; float dt = tB / ${steps}.0;
          float jit = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          for (int i = 0; i < ${steps}; i++) {
            vec3 p = p0 + rd * ((float(i) + jit) * dt);
            if (any(lessThan(p, uMin)) || any(greaterThan(p, uMax))) continue;
            vec3 lp = uInv * (p - uCen);
            float along = clamp(lp.z + 0.5, 0.0, 1.0);
            float fall = smoothstep(0.0, 0.05, along) * (1.0 - smoothstep(uFall.x, uFall.y, along)) * (1.0 - 0.35 * along);
            float nz = 0.5 + 0.5 * vn(p.xz * 1.7 + vec2(p.y * 1.3 - uT * 0.08, uT * 0.035));
            float tt = (float(i) + jit) * dt, hid = 0.0;
            for (int k = 0; k < 3; k++) hid = max(hid, keep(p0, rd, uCyl[k], tt));
            acc += winMask(lp.xy) * fall * nz * (1.0 - hid) * smoothstep(0.35, 1.3, length(p - cameraPosition));
          }
          vec3 hc = uHC * acc * dt * uK; hc = uCap * (vec3(1.0) - exp(-hc / uCap));
          gl_FragColor = vec4(hc, 1.0);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    });
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mat);
    this.mesh.matrixAutoUpdate = false; this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    parent.add(this.mesh);
  }
  /** window centre c, unit axes U (width) / Vv (height), size w x h, unit travel dir d, length len */
  set(c: THREE.Vector3, U: THREE.Vector3, Vv: THREE.Vector3, w: number, h: number, d: THREE.Vector3, len: number) {
    const a = U.clone().multiplyScalar(w), b = Vv.clone().multiplyScalar(h), e = d.clone().multiplyScalar(len);
    this.cen.copy(c).addScaledVector(d, len / 2);
    const m = new THREE.Matrix4().makeBasis(a, b, e).setPosition(this.cen);
    this.mesh.matrix.copy(m); this.mesh.matrixWorldNeedsUpdate = true;
    this.inv.setFromMatrix4(m).invert();
  }
  room(min: THREE.Vector3Tuple, max: THREE.Vector3Tuple) { (this.mat.uniforms.uMin.value as THREE.Vector3).set(...min); (this.mat.uniforms.uMax.value as THREE.Vector3).set(...max); this.mat.uniforms.uY0.value = min[1]; }
  /** characters standing in the light: [x, z, radius, top y] (radius 0 = unused) */
  cyl(c: [number, number, number, number][]) { const u = this.mat.uniforms.uCyl.value as THREE.Vector4[]; for (let i = 0; i < 3; i++) u[i].set(...(c[i] ?? [0, 0, 0, 0])); }
  look(col: THREE.Color, k: number, t: number) {
    (this.mat.uniforms.uHC.value as THREE.Vector3).set(col.r, col.g, col.b); this.mat.uniforms.uK.value = k; this.mat.uniforms.uT.value = t;
    this.mesh.visible = k > 0.003;
  }
}

/** a volumetric spotlight cone: apex a, aimed at b, radius r at b, extended past b by ext (x the a->b length) */
export class Cone {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Vector3(1, 1, 1) }, uK: { value: 0 } },
      vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
          vY = 0.5 - position.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform vec3 uC; uniform float uK; varying vec3 vN; varying vec3 vV; varying float vY;
        void main(){ float f = abs(dot(normalize(vN), normalize(vV))); f = pow(f, 2.2);
          float a = smoothstep(0.0, 0.18, vY) * (1.0 - smoothstep(0.75, 1.0, vY));
          gl_FragColor = vec4(uC * f * a * uK, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, fog: false,
    });
    const g = new THREE.ConeGeometry(1, 1, 48, 1, true); // apex at +y 0.5, base at -0.5
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
  aim(a: THREE.Vector3, b: THREE.Vector3, r: number, ext = 1.4) {
    const d = b.clone().sub(a), L = d.length() * ext, R = (r * ext);
    this.mesh.position.copy(a).addScaledVector(d.normalize(), L / 2);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
    this.mesh.scale.set(R, L, R);
  }
  look(col: THREE.Color, k: number) { (this.mat.uniforms.uC.value as THREE.Vector3).set(col.r, col.g, col.b); this.mat.uniforms.uK.value = k; this.mesh.visible = k > 0.003; }
}

const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/** dust motes seeded inside a Beam's box; each glows by how deep inside the shaft it drifts (clipped to the room) */
export class Motes {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D, beam: Beam, n: number, seed: number) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry();
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const r = rng(seed), P = new Float32Array(n * 3), D = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      P.set([r() - 0.5, r() - 0.5, Math.pow(r(), 1.3) * 0.8 - 0.5], i * 3); // box-local (re-mapped in the shader)
      D.set([r(), 0.006 + 0.01 * r() * r(), 0.6 + 0.8 * r(), r()], i * 4);
    }
    g.setAttribute("iP", new THREE.InstancedBufferAttribute(P, 3)); g.setAttribute("iS", new THREE.InstancedBufferAttribute(D, 4));
    g.instanceCount = n;
    const bu = beam.mat.uniforms;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uInv: bu.uInv, uCen: bu.uCen, uMin: bu.uMin, uMax: bu.uMax, uMode: bu.uMode, uBar: bu.uBar, uFwd: { value: new THREE.Matrix4() }, uHC: { value: new THREE.Vector3(1, 1, 1) }, uK: { value: 0 }, uT: { value: 0 } },
      vertexShader: /* glsl */ `attribute vec3 iP; attribute vec4 iS; uniform mat3 uInv; uniform vec3 uCen; uniform vec3 uMin; uniform vec3 uMax; uniform mat4 uFwd;
        uniform vec3 uHC; uniform float uK; uniform float uT; varying vec3 vC; varying vec2 vQ;
        ${NOISE}
        ${MASK}
        void main(){
          float ph = iS.x * 6.2832, sp = iS.z;
          vec3 p = (uFwd * vec4(iP, 1.0)).xyz + vec3(sin(uT * 0.21 * sp + ph) * 0.14 + sin(uT * 0.09 + ph * 3.0) * 0.05,
            sin(uT * 0.13 * sp + ph * 2.0) * 0.1 - 0.02 * uT * sp, cos(uT * 0.19 * sp + ph * 1.3) * 0.14);
          vec3 lp = uInv * (p - uCen);
          float inB = winMask(lp.xy) * smoothstep(-0.5, -0.45, lp.z) * (1.0 - smoothstep(0.1, 0.4, lp.z));
          if (any(lessThan(p, uMin)) || any(greaterThan(p, uMax))) inB = 0.0;
          float tw = 0.55 + 0.45 * sin(uT * (1.3 + 2.2 * iS.w) + ph * 5.0);
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          float dist = length(cameraPosition - p); float s = iS.y * max(1.0, dist * 0.25);
          vec3 w = p + (right * position.x + up * position.y) * s;
          vQ = position.xy * 2.0; vC = uHC * uK * inB * tw * smoothstep(0.5, 1.2, dist) / max(1.0, dist * 0.25);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float a = exp(-dot(vQ, vQ) * 3.5); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 6; parent.add(this.mesh);
  }
  follow(beam: Beam) { this.mat.uniforms.uFwd.value.copy(beam.mesh.matrix); }
  look(col: THREE.Color, k: number, t: number) {
    (this.mat.uniforms.uHC.value as THREE.Vector3).set(col.r, col.g, col.b); this.mat.uniforms.uK.value = k; this.mat.uniforms.uT.value = t;
    this.mesh.visible = k > 0.003;
  }
}

/** soft round glows: camera-facing additive billboards. Per item: position, size, colour (x intensity, set per frame)
 *  and a bias (metres pulled toward the lens: + sits in front of its source, - tucks behind it as a rim halo) */
export type GlowItem = { p: THREE.Vector3; s: number; bias?: number };
export class Glows {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial; private C: THREE.InstancedBufferAttribute; private P: THREE.InstancedBufferAttribute;
  n: number;
  constructor(parent: THREE.Object3D, items: GlowItem[], near = 0.5) {
    const q = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(), n = (this.n = items.length);
    g.index = q.index; g.setAttribute("position", q.getAttribute("position"));
    const P = new Float32Array(n * 4), B = new Float32Array(n), Cc = new Float32Array(n * 3);
    items.forEach((it, i) => { P.set([it.p.x, it.p.y, it.p.z, it.s], i * 4); B[i] = it.bias ?? 0; });
    this.P = new THREE.InstancedBufferAttribute(P, 4); this.C = new THREE.InstancedBufferAttribute(Cc, 3);
    g.setAttribute("iP", this.P); g.setAttribute("iB", new THREE.InstancedBufferAttribute(B, 1)); g.setAttribute("iC", this.C);
    g.instanceCount = n;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uNear: { value: near } },
      vertexShader: /* glsl */ `attribute vec4 iP; attribute float iB; attribute vec3 iC; uniform float uNear; varying vec3 vC; varying vec2 vQ;
        void main(){
          vec3 p = iP.xyz; vec3 toC = normalize(cameraPosition - p); p += toC * iB;
          vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
          vec3 w = p + (right * position.x + up * position.y) * iP.w;
          float dist = length(cameraPosition - p);
          vQ = position.xy * 2.0; vC = iC * smoothstep(uNear, uNear * 2.4, dist);
          gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0); }`,
      fragmentShader: `varying vec3 vC; varying vec2 vQ; void main(){ float r2 = dot(vQ, vQ); float a = exp(-r2 * 7.0) * 0.75 + exp(-r2 * 2.6) * 0.3; a *= 1.0 - smoothstep(0.75, 1.0, r2); gl_FragColor = vec4(vC * a, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 7; parent.add(this.mesh);
  }
  /** set glow i's colour x intensity */
  col(i: number, c: THREE.Color, k: number) { this.C.setXYZ(i, c.r * k, c.g * k, c.b * k); }
  pos(i: number, p: THREE.Vector3, s?: number) { this.P.setXYZ(i, p.x, p.y, p.z); if (s !== undefined) this.P.setW(i, s); this.P.needsUpdate = true; }
  commit(visible: boolean) { this.C.needsUpdate = true; this.mesh.visible = visible; }
}

/** a soft additive pool lying flat on a floor / surface (normal up), radius r */
export class Pool {
  mesh: THREE.Mesh; mat: THREE.ShaderMaterial;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Vector3() }, uK: { value: 0 } },
      vertexShader: `varying vec2 vQ; void main(){ vQ = position.xy * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uC; uniform float uK; varying vec2 vQ; void main(){ float r2 = dot(vQ, vQ); float a = exp(-r2 * 3.0) * (1.0 - smoothstep(0.7, 1.0, r2)); gl_FragColor = vec4(uC * a * uK, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.mat);
    this.mesh.rotation.x = -Math.PI / 2; this.mesh.layers.set(NOINK); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4; parent.add(this.mesh);
  }
  set(p: THREE.Vector3, rx: number, rz: number, col: THREE.Color, k: number) {
    this.mesh.position.copy(p); this.mesh.scale.set(2 * rx, 2 * rz, 1);
    (this.mat.uniforms.uC.value as THREE.Vector3).set(col.r, col.g, col.b); this.mat.uniforms.uK.value = k; this.mesh.visible = k > 0.003;
  }
}
