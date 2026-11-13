// Shared parts for the 3D models in this folder. Loaded only by stage.js, after the stage nears the viewport.
// Units are millimetres. Y is up. Helper geometry sits on y = 0, centred in x and z.
//
// A model is a THREE.Group of "parts". Each part is one merged mesh with per-vertex colour plus one merged set of
// edge lines, so a whole board costs two draw calls. The plate material shades with flat tone and a screen-space
// halftone, so models read like an engraved technical plate. No lights are needed.
import * as THREE from '../vendor/three-r186.module.min.js';

export { THREE };

// The book palette from base.css, plus two board colours mixed from it.
export const C = {
  ink: '#17100A', leather: '#26180F', walnut: '#35221A', saddle: '#5A3A22', brass: '#B8872E', foil: '#D9AE4A',
  paper: '#EFE3C8', vellum: '#F6EEDB', rust: '#9C4A22', cream: '#D9CBAA',
  board: '#4B4426', boardDark: '#2F2B19', steel: '#A99C82', tin: '#C9BD9F', shade: '#7A5A3A',
};

const PI = Math.PI;
const colours = new Map();
const lin = (hex) => { let c = colours.get(hex); if (!c) { c = new THREE.Color(hex); colours.set(hex, c); } return c; };
const luma = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const EDGE_DARK = lin(C.ink), EDGE_LIGHT = lin('#8A6B48');

// Uniforms shared by every plate material. stage.js sets uDot before each render (dot pitch in device pixels).
export const U = {
  uDot: { value: 5 },
  uInk: { value: lin(C.ink).clone() },
  uL: { value: new THREE.Vector3(-0.45, 0.72, 0.53).normalize() }, // light direction in view space: upper left, toward the viewer
};

const VERT = `
attribute vec3 aColor;
varying vec3 vC; varying vec3 vN;
void main(){
  vC = aColor;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
uniform vec3 uInk; uniform vec3 uL; uniform float uDot; uniform float uOpacity; uniform float uFade; uniform vec3 uFadeTo;
varying vec3 vC; varying vec3 vN;
void main(){
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float shade = smoothstep(0.18, 0.86, dot(n, uL) * 0.5 + 0.5);
  vec3 base = mix(vC, uFadeTo, uFade);
  vec3 col = base * (0.74 + 0.32 * shade);
  // Halftone: dots on a 45 degree screen grow as the surface turns from the light.
  vec2 p = mat2(0.7071, -0.7071, 0.7071, 0.7071) * (gl_FragCoord.xy / uDot);
  float r = (1.0 - shade) * 0.5;
  float d = smoothstep(r, r - 0.14, length(fract(p) - 0.5)) * step(0.06, r);
  float lum = dot(base, vec3(0.2126, 0.7152, 0.0722));
  vec3 dotCol = lum < 0.03 ? base * 2.6 + 0.012 : mix(base, uInk, 0.55);
  col = mix(col, dotCol, d * (1.0 - uFade * 0.6));
  // Dark rim where a curved surface turns away, so cylinders and spheres get an outline.
  col = mix(col, lum < 0.03 ? base * 2.4 + 0.01 : uInk, smoothstep(0.84, 0.97, 1.0 - abs(n.z)) * 0.75);
  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}`;

// plateMaterial({ opacity, fade, fadeTo, side }): the engraved-plate shader. fade mixes every colour toward fadeTo.
export function plateMaterial({ opacity = 1, fade = 0, fadeTo = C.paper, side = THREE.FrontSide, depthWrite = true } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side, transparent: opacity < 1, depthWrite,
    uniforms: {
      uDot: U.uDot, uInk: U.uInk, uL: U.uL,
      uOpacity: { value: opacity }, uFade: { value: fade }, uFadeTo: { value: lin(fadeTo).clone() },
    },
  });
}
let plateMat, lineMat;
export const sharedPlate = () => plateMat || (plateMat = plateMaterial());
export const sharedLines = () => lineMat || (lineMat = new THREE.LineBasicMaterial({ vertexColors: true }));

// T(x, y, z, rx, ry, rz, s): a transform matrix. s is a number or [sx, sy, sz].
export function T(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1) {
  const sc = typeof s === 'number' ? new THREE.Vector3(s, s, s) : new THREE.Vector3(s[0], s[1], s[2]);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), sc);
}

// One part of a model: collects geometry, then build() returns a Group holding the merged mesh and its edge lines.
export class Part {
  constructor(name) { this.name = name; this.p = []; this.n = []; this.c = []; this.ep = []; this.ec = []; this.extra = []; this.stack = [new THREE.Matrix4()]; }
  // Run fn with every add() inside it moved by matrix m.
  at(m, fn) { this.stack.push(this.stack[this.stack.length - 1].clone().multiply(m)); fn(this); this.stack.pop(); return this; }
  // add(geometry, colour, matrix, { edges, angle, keep }). The geometry is consumed unless keep is true.
  add(geo, colour, m, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const top = this.stack[this.stack.length - 1];
    g.applyMatrix4(m ? top.clone().multiply(m) : top);
    const c = lin(colour), P = g.attributes.position.array, N = g.attributes.normal.array;
    for (let i = 0; i < P.length; i += 3) { this.p.push(P[i], P[i + 1], P[i + 2]); this.n.push(N[i], N[i + 1], N[i + 2]); this.c.push(c.r, c.g, c.b); }
    if (o.edges !== false) {
      const e = new THREE.EdgesGeometry(g, o.angle ?? 30), E = e.attributes.position.array, k = luma(c) < 0.03 ? EDGE_LIGHT : EDGE_DARK;
      for (let i = 0; i < E.length; i += 3) { this.ep.push(E[i], E[i + 1], E[i + 2]); this.ec.push(k.r, k.g, k.b); }
      e.dispose();
    }
    g.dispose(); if (!o.keep) geo.dispose();
    return this;
  }
  // A flat label (canvas texture) lying on a surface. Rotate it with m.
  decal(tex, w, d, m) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-PI / 2),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    mesh.applyMatrix4(m ? this.stack[this.stack.length - 1].clone().multiply(m) : this.stack[this.stack.length - 1]);
    this.extra.push(mesh);
    return this;
  }
  build(material) {
    const g = new THREE.Group(); g.name = this.name;
    if (this.p.length) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      geo.setAttribute('aColor', new THREE.Float32BufferAttribute(this.c, 3));
      const mesh = new THREE.Mesh(geo, material || sharedPlate()); mesh.name = this.name;
      g.add(mesh); g.userData.mesh = mesh;
    }
    if (this.ep.length) {
      const eg = new THREE.BufferGeometry();
      eg.setAttribute('position', new THREE.Float32BufferAttribute(this.ep, 3));
      eg.setAttribute('color', new THREE.Float32BufferAttribute(this.ec, 3));
      const ls = new THREE.LineSegments(eg, sharedLines()); g.add(ls); g.userData.lines = ls;
    }
    for (const x of this.extra) g.add(x);
    this.p = this.n = this.c = this.ep = this.ec = null;
    return g;
  }
}

// tint(geometry, colour): give a stand-alone geometry the per-vertex colour the plate material reads.
export function tint(geo, colour) {
  const c = lin(colour), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('aColor', new THREE.BufferAttribute(a, 3));
  return geo;
}

// ---- Geometry. Everything sits on y = 0 and is centred in x and z. ----
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
export const cyl = (r, h, seg = 20, rTop = r) => new THREE.CylinderGeometry(rTop, r, h, seg).translate(0, h / 2, 0);
export const ball = (r, seg = 16) => new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1));

// Rounded rectangle outline in the xy plane, w by d, corner radius r. Cls is THREE.Shape, or THREE.Path for a hole.
export function rrShape(w, d, r, Cls = THREE.Shape) {
  r = Math.max(0.01, Math.min(r, w / 2 - 0.01, d / 2 - 0.01));
  const x = -w / 2, y = -d / 2, s = new Cls();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -PI / 2, 0, false);
  s.lineTo(x + w, y + d - r); s.absarc(x + w - r, y + d - r, r, 0, PI / 2, false);
  s.lineTo(x + r, y + d); s.absarc(x + r, y + d - r, r, PI / 2, PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, PI, PI * 1.5, false);
  return s;
}
// Extrude a shape drawn in plan (x right, y away from the viewer becomes -z) up to height h, with an optional bevel.
export function extrude(shape, h, bevel = 0, curve = 6) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, h - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: curve,
  });
  return g.rotateX(-PI / 2).translate(0, bevel, 0);
}
// A bevelled slab: the workhorse for bodies, lids and chips.
export const slab = (w, h, d, r = 1, bevel = 0.4, curve = 6) => extrude(rrShape(w, d, r), h, Math.min(bevel, h / 2 - 0.01), curve);
// A plate with round holes: holes = [[x, z, radius], ...].
export function plate(w, h, d, r, holes = [], bevel = 0) {
  const s = rrShape(w, d, r);
  for (const [x, z, hr] of holes) { const p = new THREE.Path(); p.absarc(x, -z, hr, 0, PI * 2, true); s.holes.push(p); }
  return extrude(s, h, bevel, 5);
}
// Open-topped tray: walls of thickness t around a floor.
export function tray(P, colour, w, h, d, r, t, m) {
  const s = rrShape(w, d, r); s.holes.push(rrShape(w - 2 * t, d - 2 * t, Math.max(0.2, r - t), THREE.Path));
  P.add(extrude(s, h - t, 0, 6), colour, (m || new THREE.Matrix4()).clone().multiply(T(0, t, 0)));
  P.add(slab(w, t, d, r, 0.5), colour, m);
}
// A round wire through 3D points.
export function wire(P, pts, r, colour, seg = 24) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
  return P.add(new THREE.TubeGeometry(curve, seg, r, 6, false), colour, null, { edges: false });
}

// ---- Board parts. x, z are the centre on the board; y is the board's top face. ----

// Copper traces. routes = [[[x, z], [x, z], ...], ...], drawn as flat strips with a round pad at each end.
export function traces(P, y, routes, w = 0.5, colour = C.brass, pads = true) {
  for (const r of routes) {
    for (let i = 0; i < r.length - 1; i++) {
      const [x0, z0] = r[i], [x1, z1] = r[i + 1], len = Math.hypot(x1 - x0, z1 - z0);
      P.add(box(len + w * 0.9, 0.06, w), colour, T((x0 + x1) / 2, y, (z0 + z1) / 2, 0, -Math.atan2(z1 - z0, x1 - x0), 0), { edges: false });
    }
    if (pads) for (const e of [r[0], r[r.length - 1]]) P.add(cyl(w * 1.15, 0.08, 10), colour, T(e[0], y, e[1]), { edges: false });
  }
}
// An IC. pins: 'quad', 'dual', 'bga' (no legs, a dot grid is implied by the label) or 'none'.
export function chip(P, x, z, y, w, d, h, { pins = 'quad', n = 8, colour = C.ink, ry = 0, pitch } = {}) {
  P.at(T(x, y, z, 0, ry, 0), () => {
    P.add(slab(w, h, d, 0.3, 0.18, 3), colour, T(0, pins === 'bga' ? 0.25 : 0.05, 0));
    if (pins === 'bga') P.add(box(w + 1.6, 0.25, d + 1.6), C.boardDark, null, { edges: false });
    const leg = (px, pz, lw, ld) => P.add(box(lw, h * 0.45, ld), C.tin, T(px, 0, pz), { edges: false });
    if (pins === 'quad' || pins === 'dual') {
      const sx = pitch || (w - 1) / n;
      for (let i = 0; i < n; i++) {
        const o = (i - (n - 1) / 2) * sx;
        leg(o, d / 2 + 0.45, sx * 0.5, 1.1); leg(o, -d / 2 - 0.45, sx * 0.5, 1.1);
        if (pins === 'quad') { const oz = (i - (n - 1) / 2) * ((d - 1) / n); leg(w / 2 + 0.45, oz, 1.1, sx * 0.5); leg(-w / 2 - 0.45, oz, 1.1, sx * 0.5); }
      }
    }
    P.add(cyl(Math.min(w, d) * 0.045, 0.05, 8), C.saddle, T(-w / 2 + Math.min(w, d) * 0.14, h + (pins === 'bga' ? 0.25 : 0.05), d / 2 - Math.min(w, d) * 0.14), { edges: false });
  });
}
// Pin header. female = a socket strip; otherwise bare pins in a plastic base.
export function header(P, x, z, y, cols, rows = 1, { ry = 0, female = false, pitch = 2.54, h = female ? 8.5 : 2.5, pin = 6 } = {}) {
  P.at(T(x, y, z, 0, ry, 0), () => {
    P.add(box(cols * pitch, h, rows * pitch), C.ink, null);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = (i - (cols - 1) / 2) * pitch, pz = (j - (rows - 1) / 2) * pitch;
      if (female) P.add(box(0.9, 0.06, 0.9), C.saddle, T(px, h, pz), { edges: false });
      else P.add(box(0.64, pin, 0.64), C.foil, T(px, h, pz), { edges: false });
    }
  });
}
// Small surface-mount parts. list = [[x, z, ry, kind]], kind 'r' (resistor), 'c' (capacitor) or 'l' (inductor).
export function passives(P, y, list) {
  for (const [x, z, ry = 0, kind = 'c'] of list) {
    P.at(T(x, y, z, 0, ry, 0), () => {
      if (kind === 'l') { P.add(slab(4, 2.2, 4, 0.6, 0.3, 3), C.walnut); return; }
      P.add(box(1.1, 0.75, 0.95), kind === 'r' ? C.ink : C.shade, null, { edges: false });
      P.add(box(0.4, 0.8, 1), C.tin, T(-0.75, 0, 0), { edges: false });
      P.add(box(0.4, 0.8, 1), C.tin, T(0.75, 0, 0), { edges: false });
    });
  }
}
// Electrolytic capacitor can.
export function ecap(P, x, z, y, r = 2.5, h = 6) {
  P.add(cyl(r, h, 18), C.steel, T(x, y, z));
  P.add(cyl(r * 0.99, 0.5, 18), C.ink, T(x, y, z), { edges: false });
  P.add(box(r * 1.5, 0.05, 0.3), C.saddle, T(x, y + h, z), { edges: false });
}
// A round status LED on a small base.
export function led(P, x, z, y, colour = C.foil, ry = 0) {
  P.add(box(1.6, 0.5, 0.8), C.vellum, T(x, y, z, 0, ry, 0), { edges: false });
  P.add(box(0.9, 0.75, 0.75), colour, T(x, y, z, 0, ry, 0), { edges: false });
}
// USB-C socket, opening toward -z before ry.
export function usbc(P, x, z, y, ry = 0) {
  P.at(T(x, y, z, 0, ry, 0), () => {
    P.add(slab(8.9, 7.3, 3.2, 1.5, 0.2, 5).rotateX(PI / 2).translate(0, 1.6, -3.65), C.steel);
    P.add(slab(6.9, 0.4, 1.4, 0.6, 0, 4).rotateX(PI / 2).translate(0, 1.6, -3.74), C.ink, null, { edges: false });
  });
}
// RJ45 socket with a metal shield, opening toward -z before ry.
export function rj45(P, x, z, y, ry = 0) {
  P.at(T(x, y, z, 0, ry, 0), () => {
    P.add(slab(16, 13.5, 21, 0.5, 0.25, 2), C.steel);
    P.add(box(11.6, 8, 0.6), C.ink, T(0, 2.2, -10.5), { edges: false });
    P.add(box(6, 2, 0.7), C.ink, T(0, 10.1, -10.5), { edges: false });
    P.add(box(2.4, 1.6, 0.4), C.foil, T(-5.6, 11.2, -10.6), { edges: false });
    P.add(box(2.4, 1.6, 0.4), C.rust, T(5.6, 11.2, -10.6), { edges: false });
  });
}
// A hex standoff with a screw head on top.
export function standoff(P, x, z, y, h = 6, r = 2.6) {
  P.add(cyl(r, h, 6), C.brass, T(x, y, z));
  screw(P, x, y + h, z, r * 0.85);
}
export function screw(P, x, y, z, r = 2.2, colour = C.steel, m) {
  P.at((m || new THREE.Matrix4()).clone().multiply(T(x, y, z)), () => {
    P.add(cyl(r, r * 0.55, 16, r * 0.8), colour);
    P.add(box(r * 1.3, 0.12, r * 0.28), C.ink, T(0, r * 0.55, 0), { edges: false });
    P.add(box(r * 0.28, 0.12, r * 1.3), C.ink, T(0, r * 0.55, 0), { edges: false });
  });
}
// SMA connector on a board edge, barrel pointing toward -z before ry.
export function sma(P, x, z, y, ry = 0) {
  P.at(T(x, y, z, 0, ry, 0), () => {
    P.add(box(6.4, 6.4, 1.6), C.foil, T(0, -2.4, -0.8));
    const barrel = (r, h, at, col = C.foil, seg = 18) => P.add(cyl(r, h, seg).rotateX(-PI / 2), col, T(0, 0.8, -1.6 - at));
    barrel(3.1, 2, 0, C.brass, 6);
    barrel(2.6, 7.5, 2);
    for (let i = 0; i < 5; i++) barrel(2.85, 0.5, 3 + i * 1.3, C.brass);
    barrel(1.9, 0.3, 9.5, C.vellum);
    P.add(box(1.2, 1.7, 5), C.foil, T(-2.4, 0, 2.4), { edges: false });
    P.add(box(1.2, 1.7, 5), C.foil, T(2.4, 0, 2.4), { edges: false });
  });
}
// A hinged 2.4 GHz stub antenna standing on (x, y, z). tilt leans the rod toward +x.
export function antenna(P, x, y, z, len = 60, tilt = 0, m) {
  P.at((m || new THREE.Matrix4()).clone().multiply(T(x, y, z)), () => {
    P.add(cyl(3.2, 3, 6), C.brass);
    P.add(cyl(3.6, 7, 16), C.ink, T(0, 3, 0));
    P.at(T(0, 10, 0, 0, 0, -tilt), () => {
      P.add(cyl(3.2, 5, 14).rotateX(PI / 2).translate(0, 0, -2.5), C.walnut);
      P.add(cyl(3.3, len * 0.55, 16, 3), C.ink, T(0, 2, 0));
      P.add(cyl(3, len * 0.45, 16, 2.3), C.ink, T(0, 2 + len * 0.55, 0), { edges: false });
      P.add(ball(2.3, 12), C.ink, T(0, 2 + len, 0), { edges: false });
    });
  });
}
// A printed circuit board with rounded corners and mounting holes ringed in copper.
export function pcb(P, w, d, { t = 1.6, r = 2, holes = [], colour = C.board, y = 0 } = {}) {
  P.add(plate(w, t, d, r, holes.map(([x, z, hr = 1.6]) => [x, z, hr])), colour, T(0, y, 0));
  for (const [x, z, hr = 1.6] of holes) P.add(new THREE.RingGeometry(hr, hr + 1.1, 20).rotateX(-PI / 2), C.foil, T(x, y + t + 0.03, z), { edges: false });
  return y + t;
}

// ---- Labels drawn on a canvas, used as silkscreen and engraved plates. ----
export function labelTexture(lines, { w = 256, h = 64, fg = C.cream, bg = null, font = '600 30px ui-monospace,Menlo,Consolas,monospace', border = false, lh = 1.15 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  if (border) { g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(5, 5, w - 10, h - 10); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  const list = Array.isArray(lines) ? lines : [lines], size = parseFloat(font.match(/(\d+(\.\d+)?)px/)[1]) * lh;
  list.forEach((s, i) => g.fillText(s, w / 2, h / 2 + (i - (list.length - 1) / 2) * size));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return tex;
}

// ---- Exploded views. ----
// explodable(root, parts): parts = [[group, [dx, dy, dz], start, end], ...]. Returns setExplode(v) for v in 0..1.
// start and end stagger the parts along the 0..1 range so they leave in order.
export function explodable(parts) {
  const items = parts.map(([g, d, a = 0, b = 1]) => ({ g, d, a, b, home: g.position.clone() }));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  return (v) => {
    for (const it of items) {
      const k = ease(Math.min(1, Math.max(0, (v - it.a) / (it.b - it.a))));
      it.g.position.set(it.home.x + it.d[0] * k, it.home.y + it.d[1] * k, it.home.z + it.d[2] * k);
    }
  };
}

// model(root, def): attaches the contract stage.js reads. def = { params, set, tick, pick, pickables, action, view }.
export function model(root, def) { root.userData.model = def; return root; }
