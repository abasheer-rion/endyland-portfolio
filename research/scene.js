// Research tab scene: a vector oscilloscope in 3D. Everything is glowing wire, drawn as thick
// screen-space lines with plain WebGL 2 (no three.js on this page, which keeps it light on phones).
//
// Layers:
//   graticule floor with a trigger sweep, the 4-element array with phase pulses,
//   dipole field-line cages, wavefronts that are bright only where the beam points,
//   the 3D beam lobe, the steer line, the test signal, and (at Parity) a spectrum waterfall
//   with two curves that draw as you scroll.
// The camera flies between three stops as you scroll (state.scroll, 0 to 2). shared/scene-loader.js runs the loop.
import { state, tick, subscribe, N, D } from './state.js';

const GREEN = [0.224, 1.0, 0.533];
const AMBER = [1.0, 0.69, 0.0];
const DIM = [0.13, 0.55, 0.3];
const BG = [5 / 255, 7 / 255, 5 / 255];
const SP = 0.7;            // world units per half wavelength (element spacing)
const WF = [17, -0.6, -11]; // waterfall centre
const PI = Math.PI;

// ---------- tiny matrix helpers (column major) ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function viewProj(eye, at, fov, aspect, sx, sy) {
  const f = norm(sub(at, eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  const V = [r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0,
    -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]), -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]),
    f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2], 1];
  const n = 0.1, fa = 120, t = 1 / Math.tan(fov / 2);
  // Perspective with a screen shift (sx, sy in NDC) so the subject can sit off centre.
  const P = [t / aspect, 0, 0, 0, 0, t, 0, 0, -sx, -sy, (fa + n) / (n - fa), -1, 0, 0, (2 * fa * n) / (n - fa), 0];
  const M = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += P[k * 4 + rr] * V[c * 4 + k];
    M[c * 4 + rr] = s;
  }
  return M;
}

// ---------- shaders ----------
const HEAD = `#version 300 es
precision highp float;
in vec4 aA; in vec4 aB; in vec2 aS;
uniform mat4 uVP; uniform vec2 uRes; uniform vec3 uEye;
uniform float uW, uT, uSteer, uFade, uDraw, uBoot, uLobe;
uniform vec3 uSrc;
out float vD; out float vI;
const float PI = 3.14159265;
float af(float sx){
  float psi = 2.*PI*${D.toFixed(2)}*(sx - uSteer);
  float s = sin(psi*.5);
  return abs(s) < 1e-4 ? 1. : abs(sin(${N}.*psi*.5)/(${N}.*s));
}
// Element pattern: a patch column, wide across, narrower in elevation.
float elem(vec3 d){ return pow(max(d.z, 0.), .8)*pow(max(1. - d.y*d.y, 0.), 2.5); }
vec3 dirOf(float az, float el){ return vec3(sin(az)*cos(el), sin(el), cos(az)*cos(el)); }
`;
const MAIN = `
void main(){
  vec4 a = P(aA), b = P(aB);
  vec4 ca = uVP*vec4(a.xyz, 1.), cb = uVP*vec4(b.xyz, 1.);
  bool atB = aS.x > .5;
  vec4 c = atB ? cb : ca;
  vec2 sa = ca.xy/max(ca.w, 1e-3)*uRes, sb = cb.xy/max(cb.w, 1e-3)*uRes;
  vec2 d = sb - sa; float L = length(d);
  vec2 dir = L > 1e-4 ? d/L : vec2(1., 0.);
  c.xy += vec2(-dir.y, dir.x)*aS.y*uW/uRes*c.w;
  gl_Position = c;
  vD = aS.y;
  float dist = distance(atB ? b.xyz : a.xyz, uEye);
  vI = (atB ? b.w : a.w)*uFade*clamp(1.5 - dist/30., 0., 1.);
  if (ca.w < .05 || cb.w < .05) vI = 0.;
}`;
const FS = `#version 300 es
precision mediump float;
in float vD; in float vI; uniform vec3 uC; out vec4 o;
void main(){
  float g = exp(-vD*vD*3.2);
  float core = smoothstep(.5, 0., abs(vD));
  o = vec4(uC*(g*.5 + core*.65)*clamp(vI, 0., 1.6), 1.);
}`;

// Position functions, one per layer. Each returns xyz in world space and w = brightness.
const P_GRID = `vec4 P(vec4 p){
  float k = fract(p.z/36. + .5 - uT*.05);
  float band = pow(k, 28.)*1.4;
  float r = length(p.xz);
  float I = (.13 + .18*p.w + band)*clamp(1.25 - r/18., 0., 1.)*uBoot;
  return vec4(p.x, -1.5, p.z, I);
}`;
const P_ARRAY = `vec4 P(vec4 p){
  float I = .5;
  if (p.w >= 0.) I = .55 + .55*cos(uT*7. - p.w*PI*uSteer);
  return vec4(p.xyz, I*uBoot);
}`;
const P_FEED = `vec4 P(vec4 p){
  float k = fract(p.w - uT*.6);
  return vec4(p.xyz, (.18 + pow(k, 10.)*.9)*uBoot);
}`;
// Dipole field lines r = L sin^2(theta), rotated around each element's vertical axis.
const P_FIELD = `vec4 P(vec4 p){
  float u = p.x, L = p.y, al = p.z, e = p.w;
  float th = mix(.04, PI - .04, u);
  float breathe = 1. + .12*sin(uT*3. - e*PI*uSteer);
  float r = L*breathe*sin(th)*sin(th);
  vec3 c = vec3((e - 1.5)*${SP.toFixed(2)}, 0., 0.);
  vec3 q = c + vec3(r*sin(th)*cos(al), r*cos(th)*1.3, r*sin(th)*sin(al));
  float pulse = pow(.5 + .5*sin(u*PI*6. - uT*4. + L*3.), 10.);
  float grow = step(u, uBoot*1.02);
  return vec4(q, (.14 + .85*pulse)*grow);
}`;
// Expanding wavefront arcs. Bright only where the array actually sends energy.
const P_WAVE = `vec4 P(vec4 p){
  float k = fract(uT*.16 + p.z);
  float R = .5 + k*10.;
  vec3 d = dirOf(p.x, p.y);
  float g = af(d.x)*elem(d);
  float I = g*g*2.2*smoothstep(0., .06, k)*(1. - k)*uBoot;
  return vec4(d*R, I);
}`;
const P_LOBE = `vec4 P(vec4 p){
  vec3 d = dirOf(p.x, p.y);
  float g = af(d.x)*elem(d);
  float r = g*4.4*uLobe*uBoot;
  return vec4(d*r, .3 + .9*g);
}`;
const P_BEAM = `vec4 P(vec4 p){
  float c = sqrt(max(0., 1. - uSteer*uSteer));
  vec3 q = vec3(uSteer, 0., c)*(.3 + p.x*14.);
  float I = (.25 + .9*pow(fract(p.x*9. - uT*1.2), 8.))*(1. - p.x)*uBoot;
  return vec4(q, I);
}`;
const P_SRC = `vec4 P(vec4 p){
  float a = uT*1.4, ca = cos(a), sa = sin(a);
  vec3 q = vec3(p.x*ca - p.z*sa, p.y, p.x*sa + p.z*ca)*(.42 + .06*sin(uT*5.));
  return vec4(uSrc + q, 1.1*uBoot);
}`;
// Spectrum waterfall. Rows move back in time; each row keeps the spectrum it was born with.
const P_FALL = `float S(float x, float tau){
  float a = .95*exp(-pow((x - .45*sin(tau*1.3))*4.2, 2.));
  float b = .45*exp(-pow((x + .55 + .12*sin(tau*2.1))*7., 2.));
  float c = .3*exp(-pow((x - .7 + .1*cos(tau*1.7))*9., 2.));
  float n = .05*sin(x*53. + tau*31.) + .04*sin(x*97. - tau*17.);
  return a + b + c + n;
}
vec4 P(vec4 p){
  float u = p.y + uT*.045;
  float ph = fract(u);
  float tau = floor(u) - p.y;
  float h = S(p.x, tau*7.);
  float fade = smoothstep(0., .08, ph)*smoothstep(1., .75, ph);
  vec3 q = vec3(${WF[0]}. + p.x*6., ${WF[1]} + h*1.5, ${WF[2]}. + 4.5 - ph*9.);
  return vec4(q, (.18 + h*.8)*fade);
}`;
// Two curves above the waterfall. They draw from left to right as you scroll (uDraw).
const P_CURVE = `vec4 P(vec4 p){
  float u = p.x;
  float y = p.y > .5
    ? u*1.25 + .22*sin(u*17.) + .09*sin(u*43.) - .1*sin(u*5.)
    : u*1.0 + .16*sin(u*11. + 1.) + .07*sin(u*29.);
  vec3 q = vec3(${WF[0]}. + (u - .5)*12., ${WF[1]} + 2.1 + y*2.2, ${WF[2]}. + 5.);
  float on = step(u, uDraw);
  float head = exp(-(uDraw - u)*60.)*1.4;
  return vec4(q, (.55 + head)*on);
}`;

// ---------- geometry ----------
// Each segment becomes 4 vertices: aA, aB (the two endpoint params) and aS (end, side).
function buildSegs(segs) {
  const n = segs.length / 8;
  const data = new Float32Array(n * 4 * 10);
  const idx = new Uint32Array(n * 6);
  const S = [[0, -1], [0, 1], [1, -1], [1, 1]];
  for (let i = 0; i < n; i++) {
    for (let v = 0; v < 4; v++) {
      const o = (i * 4 + v) * 10;
      for (let k = 0; k < 8; k++) data[o + k] = segs[i * 8 + k];
      data[o + 8] = S[v][0]; data[o + 9] = S[v][1];
    }
    const b = i * 4, j = i * 6;
    idx[j] = b; idx[j + 1] = b + 1; idx[j + 2] = b + 2; idx[j + 3] = b + 2; idx[j + 4] = b + 1; idx[j + 5] = b + 3;
  }
  return { data, idx, count: n * 6 };
}
// polyline(fn, steps): fn(i/steps) -> [x,y,z,w]. Pushes steps segments.
function polyline(out, steps, fn) {
  let prev = fn(0);
  for (let i = 1; i <= steps; i++) { const cur = fn(i / steps); out.push(...prev, ...cur); prev = cur; }
}

function geoGrid(low) {
  const out = [], step = low ? 2 : 1.5, ext = 18, sub = low ? 12 : 24;
  for (let v = -ext; v <= ext + 1e-6; v += step) {
    const major = Math.abs(Math.round(v / step) % 4) === 0 ? 1 : 0;
    polyline(out, sub, (t) => [-ext + t * 2 * ext, 0, v, major]);
    polyline(out, sub, (t) => [v, 0, -ext + t * 2 * ext, major]);
  }
  return out;
}
function geoArray() {
  const out = [];
  for (let e = 0; e < N; e++) {
    const x = (e - 1.5) * SP;
    out.push(x, 0.07, 0, e, x, 0.5, 0, e); out.push(x, -0.07, 0, e, x, -0.5, 0, e);
    out.push(x - 0.08, 0.5, 0, e, x + 0.08, 0.5, 0, e); out.push(x - 0.08, -0.5, 0, e, x + 0.08, -0.5, 0, e);
  }
  return out;
}
function geoFeed() {
  const out = [], y = -1.05, xs = (N - 1) / 2 * SP;
  const seg = (a, b, w0, w1) => out.push(...a, w0, ...b, w1);
  polyline(out, 12, (t) => [-xs + t * 2 * xs, y, 0, t]);
  for (let e = 0; e < N; e++) { const x = (e - 1.5) * SP; seg([x, -0.07, 0], [x, y, 0], 0.2, 0.6); }
  seg([0, y, 0], [0, y, -1.3], 0.5, 0.9);
  // receiver box
  const B = [[-0.45, -1.35, -1.3], [0.45, -1.35, -1.3], [0.45, -0.75, -1.3], [-0.45, -0.75, -1.3]];
  const B2 = B.map((p) => [p[0], p[1], p[2] - 0.7]);
  for (let i = 0; i < 4; i++) {
    seg(B[i], B[(i + 1) % 4], 0.3, 0.3); seg(B2[i], B2[(i + 1) % 4], 0.3, 0.3); seg(B[i], B2[i], 0.3, 0.3);
  }
  // ground plane
  const g = 1.6, gy = -0.6;
  const G = [[-g, gy, -0.5], [g, gy, -0.5], [g, gy, 0.5], [-g, gy, 0.5]];
  for (let i = 0; i < 4; i++) seg(G[i], G[(i + 1) % 4], 0.25, 0.25);
  for (let i = 1; i < 8; i++) { const x = -g + (i * 2 * g) / 8; seg([x, gy, -0.5], [x, gy, 0.5], 0.12, 0.12); }
  return out;
}
function geoField(low) {
  const out = [], Ls = low ? [0.4, 0.75, 1.15] : [0.3, 0.55, 0.85, 1.2], az = low ? 4 : 6, steps = low ? 28 : 40;
  for (let e = 0; e < N; e++) for (const L of Ls) for (let a = 0; a < az; a++) {
    const al = (a / az) * PI + e * 0.4;
    polyline(out, steps, (t) => [t, L, al, e]);
  }
  return out;
}
function geoWave(low) {
  const out = [], rings = low ? 6 : 9, els = low ? [0] : [-0.32, 0, 0.32], steps = low ? 56 : 84;
  for (let r = 0; r < rings; r++) for (const el of els) polyline(out, steps, (t) => [(t - 0.5) * PI, el, r / rings, 0]);
  return out;
}
function geoLobe(low) {
  const out = [], nAz = low ? 14 : 22, nEl = low ? 9 : 13, steps = low ? 40 : 64;
  for (let j = 0; j <= nEl; j++) { const el = (j / nEl - 0.5) * PI * 0.92; polyline(out, steps, (t) => [(t - 0.5) * PI, el, 0, 0]); }
  for (let i = 0; i <= nAz; i++) { const az = (i / nAz - 0.5) * PI; polyline(out, steps / 2, (t) => [az, (t - 0.5) * PI * 0.92, 0, 0]); }
  return out;
}
function geoBeam() { const out = []; polyline(out, 60, (t) => [t, 0, 0, 0]); return out; }
function geoSrc() {
  const V = [[1, 0, 0], [-1, 0, 0], [0, 1.3, 0], [0, -1.3, 0], [0, 0, 1], [0, 0, -1]];
  const E = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
  const out = [];
  for (const [a, b] of E) out.push(...V[a], 0, ...V[b], 0);
  return out;
}
function geoFall(low) {
  const out = [], rows = low ? 22 : 40, steps = low ? 60 : 110;
  for (let r = 0; r < rows; r++) polyline(out, steps, (t) => [t * 2 - 1, r / rows, 0, 0]);
  return out;
}
function geoCurve(series, low) { const out = []; polyline(out, low ? 120 : 220, (t) => [t, series, 0, 0]); return out; }

// ---------- camera stops: [eye, target, shiftX, shiftY, fov] ----------
// 0: intro, behind the array looking down the beam. 1: the gap after RF, looking down on the fan.
// 2: the gap after Parity, over the waterfall. Phones get their own framing.
const STOPS = [
  [[-5.2, 4.6, -3.8], [0.9, -0.2, 3.6], 0.52, 0.05, 42],
  [[2.4, 9.5, 9.5], [0.2, -0.8, 3.4], 0.0, 0.0, 42],
  [[WF[0] + 3.5, WF[1] + 5.2, WF[2] + 12.5], [WF[0], WF[1] + 1.4, WF[2]], 0.0, 0.05, 42],
];
const STOPS_PHONE = [
  [[-3.6, 4.6, -7.5], [0.5, 0.4, 3.2], 0.05, -0.42, 56],
  [[1.5, 13, 9], [0.0, -0.8, 3.0], 0.0, 0.0, 58],
  [[WF[0] + 2.0, WF[1] + 7.5, WF[2] + 15], [WF[0], WF[1] + 1.2, WF[2]], 0.0, 0.0, 58],
];

export async function start(ctx) {
  const { canvas, low } = ctx;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: low ? 'low-power' : 'high-performance' });
  if (!gl) throw new Error('no webgl2');

  // Setup is spread out so no single task blocks the page: geometry is built a layer at a time
  // with a yield in between, shaders compile in the background where the browser allows it,
  // and each program is checked on a later frame (at most one per frame).
  const pause = () => new Promise((r) => setTimeout(r, 0));
  const par = gl.getExtension('KHR_parallel_shader_compile');
  const shader = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
  const fs = shader(gl.FRAGMENT_SHADER, FS);
  const programs = new Map();
  const U = ['uVP', 'uRes', 'uEye', 'uW', 'uT', 'uSteer', 'uFade', 'uDraw', 'uBoot', 'uLobe', 'uSrc', 'uC'];
  const program = (pSrc) => {
    if (programs.has(pSrc)) return programs.get(pSrc);
    const p = gl.createProgram();
    const vs = shader(gl.VERTEX_SHADER, HEAD + pSrc + MAIN);
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aA'); gl.bindAttribLocation(p, 1, 'aB'); gl.bindAttribLocation(p, 2, 'aS');
    gl.linkProgram(p);
    const rec = { p, vs, u: null, ok: false };
    programs.set(pSrc, rec); return rec;
  };
  let checkedThisFrame = false;
  const ready = (rec) => {
    if (rec.ok) return true;
    if (checkedThisFrame) return false;
    if (par && !gl.getProgramParameter(rec.p, par.COMPLETION_STATUS_KHR)) return false;
    checkedThisFrame = true;
    if (!gl.getProgramParameter(rec.p, gl.LINK_STATUS)) {
      throw new Error(gl.getShaderInfoLog(rec.vs) || gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(rec.p));
    }
    rec.u = {}; for (const n of U) rec.u[n] = gl.getUniformLocation(rec.p, n);
    rec.ok = true;
    return true;
  };
  const buffers = [];
  const layer = (pSrc, segs, color, width, group) => {
    const { data, idx, count } = buildSegs(segs);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 40, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 40, 16);
    gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 40, 32);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    buffers.push(vb, ib);
    return { prog: program(pSrc), vao, count, color, width, group };
  };

  const plan = [
    () => layer(P_GRID, geoGrid(low), DIM, 1.6, 'floor'),
    () => layer(P_FEED, geoFeed(), DIM, 1.6, 'rf'),
    () => layer(P_ARRAY, geoArray(), AMBER, 3.0, 'rf'),
    () => layer(P_LOBE, geoLobe(low), AMBER, 1.5, 'lobe'),
    () => layer(P_FIELD, geoField(low), GREEN, 1.7, 'rf'),
    () => layer(P_WAVE, geoWave(low), GREEN, 2.0, 'rf'),
    () => layer(P_BEAM, geoBeam(), AMBER, 2.6, 'rf'),
    () => layer(P_SRC, geoSrc(), AMBER, 2.4, 'rf'),
    () => layer(P_FALL, geoFall(low), GREEN, 1.6, 'fall'),
    () => layer(P_CURVE, geoCurve(0, low), AMBER, 2.6, 'curve'),
    () => layer(P_CURVE, geoCurve(1, low), GREEN, 3.0, 'curve'),
  ];
  const layers = [];
  for (const make of plan) { layers.push(make()); await pause(); }

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.clearColor(BG[0], BG[1], BG[2], 1);

  let W = 1, H = 1, dpr = 1;
  let s = state.scroll, px = 0, py = 0, boot = 0;
  const RAD = PI / 180;

  function camera(sc, aspect) {
    const K = aspect < 0.9 ? STOPS_PHONE : STOPS;
    const i = Math.min(K.length - 2, Math.floor(sc)), f = ss(0, 1, sc - i);
    const A = K[i], B = K[i + 1];
    let eye = lerp3(A[0], B[0], f);
    const at = lerp3(A[1], B[1], f);
    const sx = lerp(A[2], B[2], f), sy = lerp(A[3], B[3], f), fov = lerp(A[4], B[4], f);
    // pointer parallax
    const fwd = norm(sub(at, eye)), right = norm(cross(fwd, [0, 1, 0]));
    eye = [eye[0] + right[0] * px * 0.8, eye[1] + py * 0.5, eye[2] + right[2] * px * 0.8];
    return { eye, at, sx, sy, fov };
  }

  function render(t) {
    const aspect = W / H;
    const { eye, at, sx, sy, fov } = camera(s, aspect);
    const VP = viewProj(eye, at, fov * RAD, aspect, sx, sy);
    const steer = Math.sin(state.steer * RAD);
    const sr = state.source * RAD;
    const src = [Math.sin(sr) * 8.5, 0.15, Math.cos(sr) * 8.5];
    const fade = {
      floor: 1,
      rf: 1 - 0.7 * ss(1.2, 1.8, s),
      lobe: 1 - 0.8 * ss(1.2, 1.8, s),
      fall: ss(1.0, 1.7, s),
      curve: ss(1.2, 1.6, s),
    };
    const lobeScale = lerp(1.2, 1.3, ss(0.2, 1, s)) * (1 - 0.4 * ss(1, 2, s));
    const draw = ss(1.25, 1.95, s);
    const wScale = dpr * (low ? 0.9 : 1);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let cur = null;
    checkedThisFrame = false;
    for (const L of layers) {
      const fd = fade[L.group];
      if (!ready(L.prog) || fd < 0.01) continue; // check hidden layers too, so the still frame stops redrawing
      const { p, u } = L.prog;
      if (cur !== p) { gl.useProgram(p); cur = p; }
      gl.uniformMatrix4fv(u.uVP, false, VP);
      gl.uniform2f(u.uRes, canvas.width / 2, canvas.height / 2);
      gl.uniform3f(u.uEye, eye[0], eye[1], eye[2]);
      gl.uniform1f(u.uW, L.width * wScale);
      gl.uniform1f(u.uT, t);
      gl.uniform1f(u.uSteer, steer);
      gl.uniform1f(u.uFade, fd);
      gl.uniform1f(u.uDraw, draw);
      gl.uniform1f(u.uBoot, boot);
      gl.uniform1f(u.uLobe, lobeScale);
      gl.uniform3f(u.uSrc, src[0], src[1], src[2]);
      gl.uniform3f(u.uC, L.color[0], L.color[1], L.color[2]);
      gl.bindVertexArray(L.vao);
      gl.drawElements(gl.TRIANGLES, L.count, gl.UNSIGNED_INT, 0);
    }
    gl.bindVertexArray(null);
  }

  // With reduced motion the loop is off. Redraw the still frame when the steer angle changes.
  const unsub = subscribe(() => { if (ctx.reduced) still(); });

  function still() {
    // Reduced motion: one calm frame at the intro stop, fully built.
    // Programs finish one per frame, so redraw until all of them are in.
    boot = 1; s = 0; px = 0; py = 0;
    render(4.2);
    if (ctx.reduced && layers.some((L) => !L.prog.ok)) requestAnimationFrame(() => { if (ctx.reduced) still(); });
  }

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
    },
    frame(t, dt) {
      tick();
      const k = Math.min(1, dt * 3);
      s += (state.scroll - s) * k;
      px += (state.px - px) * Math.min(1, dt * 2.5);
      py += (state.py - py) * Math.min(1, dt * 2.5);
      boot = Math.min(1, boot + dt * 0.55);
      render(t);
    },
    still,
    dispose() {
      unsub();
      for (const b of buffers) gl.deleteBuffer(b);
      for (const L of layers) gl.deleteVertexArray(L.vao);
      for (const { p, vs } of programs.values()) { gl.deleteProgram(p); gl.deleteShader(vs); }
      gl.deleteShader(fs);
    },
  };
}
