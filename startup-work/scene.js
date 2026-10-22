// Startup work scene: cinematic and sleek.
// A swarm of glowing particles morphs between one shape per chapter as you scroll:
//   0 intro: a spiral galaxy   1 Argus: an eye with a camera iris
//   2 RION: a knot (automation loop)   3 New Door: an envelope with mail flying out
// Layers, back to front: nebula glows, warp dust, glass shards, orbit rings, the swarm, a core flare.
// The camera dollies and pans between chapters. The pointer pushes particles away, a tap sends a ripple.
// shared/scene-loader.js runs the loop, pauses it off screen and handles reduced motion.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, ColorManagement, LinearSRGBColorSpace, Group, Points, Line, Mesh,
  BufferGeometry, BufferAttribute, PlaneGeometry, ShaderMaterial, Sprite, SpriteMaterial, CanvasTexture,
  AdditiveBlending, DoubleSide,
} from '../shared/vendor/three-r186.module.min.js';
import { state } from './state.js';

ColorManagement.enabled = false; // hex colors below go straight to the screen

const TAU = Math.PI * 2;
// Two colors per chapter shape, and one accent for rings and flare.
const PAL = [['#C2B2FF', '#6F8DFF'], ['#9CC3FF', '#5FE3FF'], ['#A88BFF', '#E58CFF'], ['#FF92BC', '#FFCB8E']];
const ACC = ['#8F86FF', '#6FA8FF', '#A57BFF', '#FF8FB4'];
// Camera per chapter: orbit angle, height, zoom, roll. SIDE: which side of the screen the swarm sits on.
const CAM = [[0.0, 0.12, 1.08, 0], [0.34, 0.03, 1.0, -0.025], [-0.42, 0.2, 0.98, 0.03], [0.24, -0.07, 1.02, -0.02]];
const SIDE = [1, 1, -1, 1];
const LIFT = [-0.42, -0.05, -0.05, -0.05]; // phones: where the swarm sits up or down the screen
const RING_TILT = [[1.25, 0.2], [1.45, -0.35], [0.9, 0.6], [1.6, 0.1]];

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261022);
const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += R(); return (s - 2) / 0.58; };
const jit = (a) => (R() * 2 - 1) * a;

// ---------- Shapes. Each fills n points into arr (x, y, z) ----------
function galaxy(arr, n) {
  for (let i = 0; i < n; i++) {
    let x, y, z;
    if (R() < 0.12) { // bulge
      const r = Math.abs(gauss()) * 0.32, a = R() * TAU, u = R() * 2 - 1, s = Math.sqrt(1 - u * u);
      x = r * s * Math.cos(a); y = r * u * 0.7; z = r * s * Math.sin(a);
    } else {
      const arm = Math.floor(R() * 3), r = 0.25 + 2.35 * Math.pow(R(), 0.8);
      const a = arm * TAU / 3 + r * 1.7 + gauss() * 0.22 * (1.25 - r / 3);
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = gauss() * 0.07 * (1 + (3 - r) * 0.5);
    }
    arr.set([x, y, z], i * 3); // the shader spins it and tilts it toward the camera
  }
}

function eye(arr, n) {
  const w = 2.75, h = 1.2;
  for (let i = 0; i < n; i++) {
    const k = R();
    let x, y, z;
    if (k < 0.28) { // lids
      x = w * (R() * 2 - 1); const f = 1 - (x / w) ** 2;
      y = (R() < 0.5 ? 1 : -1) * h * f + jit(0.025); z = -0.25 * (x / w) ** 2 + jit(0.03);
    } else if (k < 0.37) { // lens barrel ring behind
      const a = R() * TAU, r = 1.75 + jit(0.03);
      x = Math.cos(a) * r; y = Math.sin(a) * r * 0.98; z = -0.45 + jit(0.04);
    } else if (k < 0.66) { // iris rings
      const rr = [0.42, 0.6, 0.78, 0.96][Math.floor(R() * 4)] + jit(0.012), a = R() * TAU;
      x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = 0.35 * Math.sqrt(Math.max(0, 1 - rr * rr)) + jit(0.02);
    } else if (k < 0.8) { // aperture blades: spokes that curve
      const b = Math.floor(R() * 8), t = R(), rr = 0.3 + t * 0.66, a = b * TAU / 8 + t * 0.6;
      x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = 0.35 * Math.sqrt(Math.max(0, 1 - rr * rr)) + jit(0.02);
    } else if (k < 0.93) { // pupil
      const rr = 0.27 * Math.sqrt(R()), a = R() * TAU;
      x = Math.cos(a) * rr; y = Math.sin(a) * rr; z = 0.4 + jit(0.03);
    } else { // glint
      x = 0.36 + gauss() * 0.05; y = 0.34 + gauss() * 0.05; z = 0.55 + jit(0.02);
    }
    arr.set([x, y, z], i * 3);
  }
}

function knotPoint(t, out) { // trefoil
  const a = t * TAU, k = 0.72;
  out[0] = k * (Math.sin(a) + 2 * Math.sin(2 * a)); out[1] = k * (Math.cos(a) - 2 * Math.cos(2 * a)) + 0.2; out[2] = -k * 1.1 * Math.sin(3 * a);
  return out;
}
function knot(arr, n) {
  const c = [0, 0, 0], d = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const t = R();
    knotPoint(t, c); knotPoint(t + 0.0005, d);
    let tx = d[0] - c[0], ty = d[1] - c[1], tz = d[2] - c[2];
    const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
    // a frame around the curve: normal from the z axis, binormal from the cross product
    let nx = -ty, ny = tx, nz = 0; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl; // tangent x z axis
    const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx;
    const core = R() < 0.22;
    const rad = core ? Math.abs(gauss()) * 0.04 : 0.24 + jit(0.015);
    const th = core ? R() * TAU : t * TAU * 40 + Math.floor(R() * 6) * TAU / 6; // stripes along the tube
    const cs = Math.cos(th) * rad, sn = Math.sin(th) * rad;
    arr.set([c[0] + nx * cs + bx * sn, c[1] + ny * cs + by * sn, c[2] + nz * cs + bz * sn], i * 3);
  }
}

function envelope(arr, n) {
  const W = 1.7, H = 1.1, cy = -0.12, rot = -0.22, cr = Math.cos(rot), sr = Math.sin(rot);
  const seg = (ax, ay, bx, by) => { const t = R(); return [ax + (bx - ax) * t + jit(0.015), ay + (by - ay) * t + jit(0.015)]; };
  for (let i = 0; i < n; i++) {
    const k = R();
    let x, y, z = 0;
    if (k < 0.3) { // outline
      const e = R() * 4;
      if (e < 1) [x, y] = seg(-W, H, W, H); else if (e < 2) [x, y] = seg(W, H, W, -H);
      else if (e < 3) [x, y] = seg(W, -H, -W, -H); else [x, y] = seg(-W, -H, -W, H);
      z = jit(0.02);
    } else if (k < 0.5) { // flap
      [x, y] = R() < 0.5 ? seg(-W, H, 0, cy) : seg(W, H, 0, cy); z = 0.06 + jit(0.02);
    } else if (k < 0.6) { // bottom folds
      [x, y] = R() < 0.5 ? seg(-W, -H, -0.45, 0.1) : seg(W, -H, 0.45, 0.1); z = 0.03 + jit(0.02);
    } else if (k < 0.76) { // paper face
      x = jit(W); y = jit(H); z = -0.05 + jit(0.04);
    } else { // mail flying out, up and to the right
      const s = Math.pow(R(), 0.7), spread = 0.04 + s * 0.35;
      x = 0.5 + s * 2.3 + gauss() * spread; y = H * 0.4 + s * 1.5 + Math.sin(s * 3.2) * 0.35 + gauss() * spread;
      z = s * 1.3 + gauss() * spread;
    }
    // tilt the envelope a little so it reads as a 3D object
    const X = x * cr - z * sr, Z = x * sr + z * cr;
    arr.set([X, y, Z], i * 3);
  }
}

// ---------- Shaders ----------
const SWARM_V = /* glsl */`
attribute vec3 aP1; attribute vec3 aP2; attribute vec3 aP3; attribute vec4 aR;
uniform float uM, uT, uSpin, uSize, uPx, uHover, uBurst, uAspect, uPtrK, uCalm;
uniform vec2 uPtr; uniform vec3 uPulse;
uniform vec3 uCA[4]; uniform vec3 uCB[4];
varying vec3 vC; varying float vA;
vec3 shapeAt(float i, vec3 g){ return i < 0.5 ? g : i < 1.5 ? aP1 : i < 2.5 ? aP2 : aP3; }
vec3 colA(float i){ return i < 0.5 ? uCA[0] : i < 1.5 ? uCA[1] : i < 2.5 ? uCA[2] : uCA[3]; }
vec3 colB(float i){ return i < 0.5 ? uCB[0] : i < 1.5 ? uCB[1] : i < 2.5 ? uCB[2] : uCB[3]; }
void main(){
  // the galaxy spins on its own axis, then tilts toward the camera
  float s = uSpin * (1.0 + 0.6 / (0.6 + length(position.xz)));
  vec3 g = vec3(position.x * cos(s) - position.z * sin(s), position.y, position.x * sin(s) + position.z * cos(s));
  g = vec3(g.x, g.y * cos(1.12) - g.z * sin(1.12), g.y * sin(1.12) + g.z * cos(1.12));
  float m = clamp(uM, 0.0, 3.0);
  float i = floor(min(m, 2.9999));
  float f = m - i;
  float dl = aR.x * 0.42;
  float ff = smoothstep(dl, dl + 0.58, f);
  vec3 p = mix(shapeAt(i, g), shapeAt(i + 1.0, g), ff);
  float tr = sin(ff * 3.14159) * uCalm;
  // swirl while between shapes
  float sw = tr * (0.9 + aR.z) * 1.4;
  p.xz = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xz;
  p *= 1.0 + tr * 0.28 + uBurst * (0.25 + aR.y * 0.35);
  float t = uT * uCalm;
  p += uCalm * 0.035 * vec3(sin(t * 0.9 + aR.z * 6.28 + p.y * 2.1), cos(t * 0.7 + aR.z * 5.0 + p.x * 2.3), sin(t * 0.8 + p.z * 1.9));
  p += tr * 0.55 * vec3(sin(p.y * 1.7 + t * 1.3 + aR.z * 6.0), sin(p.z * 1.9 + t * 1.1), sin(p.x * 1.5 + t * 1.7));

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 cp = projectionMatrix * mv;
  vec2 nd = cp.xy / cp.w;
  vec2 d = (nd - uPtr) * vec2(uAspect, 1.0);
  float dd = length(d);
  vec2 dir = d / (dd + 1e-4);
  float fall = exp(-dd * dd * 30.0) * uPtrK;
  mv.xy += dir * fall * 0.45;
  vec2 dq = (nd - uPulse.xy) * vec2(uAspect, 1.0);
  float dqq = length(dq);
  float ring = exp(-pow((dqq - uPulse.z * 1.5) * 7.0, 2.0)) * max(0.0, 1.0 - uPulse.z / 1.6);
  mv.xy += dq / (dqq + 1e-4) * ring * 0.45;
  gl_Position = projectionMatrix * mv;

  vec3 c = mix(mix(colA(i), colB(i), aR.w), mix(colA(i + 1.0), colB(i + 1.0), aR.w), ff);
  float tw = aR.z > 0.7 ? 0.55 + 0.45 * sin(t * 2.4 + aR.z * 40.0) : 1.0;
  vC = c * (1.0 + uHover * 0.35 + fall * 1.2 + ring * 1.5 + tr * 0.4);
  vA = tw;
  gl_PointSize = clamp(uSize * aR.y * uPx / -mv.z * (1.0 + fall * 0.6 + ring), 1.0, 48.0);
}`;
const SWARM_F = /* glsl */`
uniform float uOpacity;
varying vec3 vC; varying float vA;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = pow(1.0 - d * 2.0, 2.0) * 0.55 + smoothstep(0.16, 0.0, d) * 0.6;
  gl_FragColor = vec4(vC, a * vA * uOpacity);
}`;

const DUST_V = /* glsl */`
attribute float aS;
uniform float uZ, uPx, uT;
varying float vA;
void main(){
  vec3 p = position;
  p.z = mod(p.z + uZ, 60.0) - 48.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float near = smoothstep(12.0, 6.0, p.z) * smoothstep(-48.0, -36.0, p.z);
  vA = near * (0.5 + 0.5 * sin(uT * 1.7 + aS * 50.0));
  gl_PointSize = clamp(0.05 * (0.6 + aS) * uPx / -mv.z, 1.0, 6.0);
}`;
const DUST_F = /* glsl */`
uniform vec3 uColor;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(uColor, (1.0 - d * 2.0) * vA * 0.7);
}`;

const GLASS_V = /* glsl */`
varying vec2 vUv; varying float vFace;
void main(){
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 n = normalize(normalMatrix * normal);
  vFace = abs(dot(n, normalize(-mv.xyz)));
  gl_Position = projectionMatrix * mv;
}`;
const GLASS_F = /* glsl */`
uniform vec3 uColor; uniform vec2 uSize; uniform float uT, uPhase, uAlpha;
varying vec2 vUv; varying float vFace;
float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){
  vec2 p = (vUv - 0.5) * uSize;
  float d = box(p, uSize * 0.5, 0.14);
  if (d > 0.0) discard;
  float edge = smoothstep(-0.03, 0.0, d);
  float fill = 0.05 + 0.09 * (1.0 - vUv.y);
  float band = vUv.x * 0.8 + vUv.y * 0.6 - (fract(uT * 0.06 + uPhase) * 2.8 - 0.6);
  float sweep = exp(-band * band * 40.0);
  float rim = pow(1.0 - vFace, 2.0);
  gl_FragColor = vec4(uColor, (fill + edge * 0.6 + sweep * 0.25 + rim * 0.2) * uAlpha);
}`;

const RING_V = /* glsl */`
attribute float aU; varying float vU;
void main(){ vU = aU; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const RING_F = /* glsl */`
uniform vec3 uColor; uniform float uT, uSpeed, uAlpha;
varying float vU;
void main(){
  float h = fract(vU - uT * uSpeed);
  gl_FragColor = vec4(uColor, (0.08 + 0.95 * pow(h, 12.0)) * uAlpha);
}`;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.2, 'rgba(255,255,255,.55)');
  grd.addColorStop(0.5, 'rgba(255,255,255,.14)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
function along(arr, m) { // arr of numbers or arrays, sampled at chapter m
  const i = Math.min(Math.floor(m), arr.length - 2), f = ease(Math.min(1, Math.max(0, m - i)));
  const a = arr[i], b = arr[i + 1];
  return Array.isArray(a) ? a.map((v, k) => lerp(v, b[k], f)) : lerp(a, b, f);
}

// Setup is split into small steps with pauses between them, so phones never freeze while it builds.
const pause = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

export async function start(ctx) {
  const { canvas, low } = ctx;
  const N = low ? 5200 : 15000;
  const baseSize = low ? 0.034 : 0.028;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(38, 1, 0.1, 120);
  const tanH = Math.tan((camera.fov * Math.PI) / 360);
  const tex = glowTexture();
  const disposables = [tex];
  const keep = (o) => { disposables.push(o); return o; };

  // Nebula glows far behind
  const nebula = [];
  const NEB = [['#4B2FD0', -9, 4, -26, 30], ['#1F46C8', 10, -3, -30, 34], ['#A12E86', 4, 7, -34, 26], ['#1A6D96', -12, -7, -28, 24], ['#5B2FB0', 0, -1, -40, 44]];
  for (const [col, x, y, z, s] of NEB.slice(0, low ? 3 : 5)) {
    const sp = new Sprite(keep(new SpriteMaterial({ map: tex, color: new Color(col), blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.32 })));
    sp.position.set(x, y, z); sp.scale.set(s, s, 1); sp.userData = { x, y, ph: R() * TAU };
    scene.add(sp); nebula.push(sp);
  }

  await pause();
  // Warp dust
  const DN = low ? 700 : 1800;
  const dpos = new Float32Array(DN * 3), ds = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { dpos.set([jit(26), jit(15), R() * 60 - 48], i * 3); ds[i] = R(); }
  const dg = keep(new BufferGeometry());
  dg.setAttribute('position', new BufferAttribute(dpos, 3)); dg.setAttribute('aS', new BufferAttribute(ds, 1));
  const dm = keep(new ShaderMaterial({ vertexShader: DUST_V, fragmentShader: DUST_F, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uZ: { value: 0 }, uPx: { value: 800 }, uT: { value: 0 }, uColor: { value: new Color('#B7C4FF') } } }));
  const dust = new Points(dg, dm); dust.frustumCulled = false; scene.add(dust);

  await pause();
  // Glass shards drifting around the swarm
  const shards = [];
  const SH = low ? 3 : 7;
  for (let i = 0; i < SH; i++) {
    const w = 0.7 + R() * 0.9, h = w * (1.25 + R() * 0.45);
    const mat = keep(new ShaderMaterial({ vertexShader: GLASS_V, fragmentShader: GLASS_F, transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
      uniforms: { uColor: { value: new Color(i % 2 ? '#A9B8FF' : '#C9A8FF') }, uSize: { value: [w, h] }, uT: { value: 0 }, uPhase: { value: R() }, uAlpha: { value: 0.55 + R() * 0.3 } } }));
    const mesh = new Mesh(keep(new PlaneGeometry(w, h)), mat);
    const a = (i / SH) * TAU + jit(0.4), r = 4.4 + R() * 2.2;
    mesh.position.set(Math.cos(a) * r, jit(2.8), Math.sin(a) * r * 0.5 - 3.2);
    mesh.rotation.set(jit(0.6), jit(1.2), jit(0.4));
    mesh.userData = { base: mesh.position.clone(), rs: [jit(0.08), 0.04 + R() * 0.08, jit(0.05)], ph: R() * TAU };
    scene.add(mesh); shards.push(mesh);
  }

  // Orbit rings with a comet head
  const rings = new Group(); scene.add(rings);
  const ringMats = [];
  for (const [rad, sq, speed] of [[3.5, 0.92, 0.07], [4.1, 0.78, -0.05], [4.8, 0.96, 0.035]].slice(0, low ? 2 : 3)) {
    const S = 240, rp = new Float32Array((S + 1) * 3), ru = new Float32Array(S + 1);
    for (let k = 0; k <= S; k++) { const a = (k / S) * TAU; rp.set([Math.cos(a) * rad, Math.sin(a) * rad * sq, 0], k * 3); ru[k] = k / S; }
    const g = keep(new BufferGeometry()); g.setAttribute('position', new BufferAttribute(rp, 3)); g.setAttribute('aU', new BufferAttribute(ru, 1));
    const mat = keep(new ShaderMaterial({ vertexShader: RING_V, fragmentShader: RING_F, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color(ACC[0]) }, uT: { value: 0 }, uSpeed: { value: speed }, uAlpha: { value: 0.75 } } }));
    const line = new Line(g, mat); line.rotation.z = R() * TAU; line.frustumCulled = false;
    rings.add(line); ringMats.push(mat);
  }

  await pause();
  // The swarm
  const p0 = new Float32Array(N * 3), p1 = new Float32Array(N * 3), p2 = new Float32Array(N * 3), p3 = new Float32Array(N * 3), rnd = new Float32Array(N * 4);
  galaxy(p0, N); await pause(); eye(p1, N); await pause(); knot(p2, N); await pause(); envelope(p3, N); await pause();
  for (let i = 0; i < N; i++) rnd.set([R(), R() < 0.02 ? 2.6 : 0.55 + R() * 0.9, R(), R()], i * 4);
  const sg = keep(new BufferGeometry());
  sg.setAttribute('position', new BufferAttribute(p0, 3)); sg.setAttribute('aP1', new BufferAttribute(p1, 3));
  sg.setAttribute('aP2', new BufferAttribute(p2, 3)); sg.setAttribute('aP3', new BufferAttribute(p3, 3)); sg.setAttribute('aR', new BufferAttribute(rnd, 4));
  const su = {
    uM: { value: 0 }, uT: { value: 0 }, uSpin: { value: 0 }, uSize: { value: baseSize }, uPx: { value: 800 },
    uHover: { value: 0 }, uBurst: { value: 0 }, uAspect: { value: 1 }, uPtrK: { value: 0 }, uCalm: { value: 1 }, uOpacity: { value: 0.62 },
    uPtr: { value: [9, 9] }, uPulse: { value: [9, 9, 99] },
    uCA: { value: PAL.map((p) => new Color(p[0])) }, uCB: { value: PAL.map((p) => new Color(p[1])) },
  };
  const sm = keep(new ShaderMaterial({ vertexShader: SWARM_V, fragmentShader: SWARM_F, uniforms: su, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  const swarmG = new Group(); scene.add(swarmG);
  const swarm = new Points(sg, sm); swarm.frustumCulled = false; swarmG.add(swarm);

  await pause();
  // Core flare
  const flareMat = keep(new SpriteMaterial({ map: tex, color: new Color(ACC[0]), blending: AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.2 }));
  const flare = new Sprite(flareMat); flare.scale.set(6, 6, 1); swarmG.add(flare);

  // ---------- State ----------
  let W = 1, H = 1, wide = true;
  let m = state.m, side = along(SIDE, m), hover = 0, ptrK = 0, px = 0, py = 0, burst = 0, spin = 0, warp = 0;
  let lastY = state.y, vel = 0, lastChap = Math.round(m);
  const accA = new Color(), accB = new Color();

  function place(t, mm, sd) {
    const [az0, el0, zoom, roll] = along(CAM, mm);
    const aspect = W / H;
    const s = wide ? 0.4 * sd : 0, lift = wide ? 0 : along(LIFT, mm);
    const distW = 3.35 / ((1 - Math.abs(s)) * tanH * aspect), distH = 2.6 / tanH;
    const dist = Math.max(distW, distH) * zoom * (wide ? 1 : 0.95);
    su.uSize.value = baseSize * Math.max(1, dist / 11);
    const az = az0 + px * 0.07 + Math.sin(t * 0.09) * 0.03, el = el0 - py * 0.05 + Math.sin(t * 0.07) * 0.02;
    camera.position.set(Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(az) * Math.cos(el) * dist);
    camera.lookAt(0, 0, 0);
    camera.rotateZ(roll);
    camera.updateMatrixWorld();
    camera.projectionMatrix.elements[8] = -s; // lens shift: slide the swarm across the screen without bending it
    camera.projectionMatrix.elements[9] = -lift;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    rings.rotation.set(...along(RING_TILT, mm), 0);
    const i = Math.min(Math.floor(mm), 2), f = ease(Math.min(1, mm - i));
    accA.set(ACC[i]); accB.set(ACC[i + 1]); accA.lerp(accB, f);
    flareMat.color.copy(accA);
    for (const rm of ringMats) rm.uniforms.uColor.value.copy(accA);
  }

  function render() { renderer.render(scene, camera); }

  function frame(t, dt) {
    // scroll speed drives the galaxy spin and the warp dust
    const dy = state.y - lastY; lastY = state.y;
    vel = damp(vel, dt > 0 ? dy / dt : 0, 6, dt);
    const sp = Math.min(Math.abs(vel) / 600, 4);
    spin += dt * (0.1 + sp * 0.35);
    warp += dt * (0.6 + sp * 5);

    const target = state.hover >= 0 ? state.hover : state.m;
    m = damp(m, target, 2.4, dt);
    side = damp(side, along(SIDE, target), 1.8, dt);
    const chap = Math.round(m);
    if (chap !== lastChap) { burst = 1; lastChap = chap; }
    burst = damp(burst, 0, 2.8, dt);
    hover = damp(hover, state.hover >= 0 ? 1 : 0, 4, dt);
    ptrK = damp(ptrK, state.ptr, 5, dt);
    px = damp(px, state.px, 3, dt); py = damp(py, state.py, 3, dt);

    su.uM.value = m; su.uT.value = t; su.uSpin.value = spin; su.uHover.value = hover; su.uBurst.value = burst * 0.6;
    su.uPtrK.value = ptrK; su.uPtr.value = [state.px, state.py]; su.uCalm.value = 1;
    const age = state.pulseAt >= 0 ? performance.now() / 1000 - state.pulseAt : 99;
    su.uPulse.value = [state.pulseX, state.pulseY, Math.min(age, 99)];

    swarmG.rotation.set(Math.sin(t * 0.13) * 0.06, Math.sin(t * 0.17) * 0.2, 0);
    const tr = Math.sin(Math.PI * Math.min(1, Math.max(0, m - Math.floor(m))));
    flareMat.opacity = 0.16 + tr * 0.22 + hover * 0.1 + burst * 0.25;
    const fs = 5.5 + tr * 2 + burst * 2; flare.scale.set(fs, fs, 1);

    dm.uniforms.uZ.value = warp; dm.uniforms.uT.value = t;
    for (const n of nebula) {
      const u = n.userData; n.position.x = u.x + Math.sin(t * 0.03 + u.ph) * 2; n.position.y = u.y + Math.cos(t * 0.025 + u.ph) * 1.4;
      n.material.rotation = t * 0.01 + u.ph;
    }
    for (const s of shards) {
      const u = s.userData;
      s.rotation.x += u.rs[0] * dt; s.rotation.y += u.rs[1] * dt; s.rotation.z += u.rs[2] * dt;
      s.position.y = u.base.y + Math.sin(t * 0.3 + u.ph) * 0.35;
      s.material.uniforms.uT.value = t;
    }
    for (const rm of ringMats) rm.uniforms.uT.value = t;
    place(t, m, side);
    render();
  }

  // Reduced motion: one calm frame with the current chapter's shape, nothing moving.
  function still() {
    const c = Math.round(state.hover >= 0 ? state.hover : state.m);
    m = c; side = SIDE[c]; lastChap = c; burst = 0; hover = 0;
    su.uM.value = c; su.uT.value = 0; su.uSpin.value = 0.6; su.uHover.value = 0; su.uBurst.value = 0; su.uPtrK.value = 0; su.uCalm.value = 0;
    su.uPulse.value = [9, 9, 99];
    swarmG.rotation.set(0, 0, 0);
    flareMat.opacity = 0.16; flare.scale.set(5.5, 5.5, 1);
    dm.uniforms.uT.value = 0.4;
    px = py = 0;
    place(0, c, side);
    render();
  }
  state.redraw = () => { if (ctx.reduced) still(); };

  // Compile the shaders ahead of the first frame, without blocking the page where the browser allows it.
  await pause();
  try { await renderer.compileAsync(scene, camera); } catch { /* the first frame compiles them instead */ }
  await pause();

  return {
    resize(w, h, dpr) {
      W = w; H = h; wide = w >= 900;
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const px = (h * dpr) / (2 * tanH);
      su.uPx.value = px; dm.uniforms.uPx.value = px; su.uAspect.value = w / h;
      su.uOpacity.value = wide ? 0.62 : 0.6;
    },
    frame,
    still,
    dispose() {
      state.redraw = null;
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    },
  };
}
