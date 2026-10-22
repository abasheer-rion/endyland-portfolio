// web-design tab: the 3D scene. Bright Memphis and Bauhaus toys you can grab and throw.
// Decoration only. Every word on the page is in the HTML.
//
// Layers, back to front:
//   1. A wall that only shows soft shadows (a blurred blob per shape on phones).
//   2. A big two-tone Bauhaus sun that turns as you scroll.
//   3. Confetti: tiny triangles, dots and bars drifting up with the scroll.
//   4. The toys: chunky cel-shaded shapes with ink outlines. Drag and fling them.
//      Hand-written physics: springs home, wall bounces, toy-to-toy hits, gravity at the bottom.
//   5. Two big shapes near the camera that slide past quickly when you scroll.
//
// Scroll moments: the toys move from the intro into the page margins, the palette changes for each
// card (main.js tells us through bus.js), and at the very bottom gravity switches on and they fall.
// Contract: export start(ctx) and return { resize, frame, still, dispose }. See shared/scene-loader.js.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Mesh, Group, Color, Vector2, Vector3, Plane, Raycaster, Object3D,
  MeshToonMaterial, MeshBasicMaterial, ShadowMaterial, DataTexture, RedFormat, NearestFilter, CanvasTexture,
  HemisphereLight, DirectionalLight, BackSide, PCFShadowMap,
  SphereGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, CapsuleGeometry, PlaneGeometry, CircleGeometry,
  ExtrudeGeometry, Shape, TubeGeometry, Curve, InstancedMesh,
} from '../shared/vendor/three-r186.module.min.js';
import { PALETTES, bus, state } from './bus.js';
import { finePointer } from '../shared/motion.js';

const INK = '#1B1B1F';
const CAM_Z = 22, FOV = 32, WALL_Z = -3.6;
const TAN = Math.tan((FOV / 2) * Math.PI / 180);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const wrap = (v, lo, hi) => { const s = hi - lo; return ((((v - lo) % s) + s) % s) + lo; };

// ---------- Shapes ----------
class Wave extends Curve {
  getPoint(t, target = new Vector3()) { return target.set((t - 0.5) * 3.2, Math.sin(t * Math.PI * 3) * 0.36, 0); }
}
function extrude(shape, depth, bevel, curveSegments) {
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments });
  g.center();
  return g;
}
function halfDisc(seg) {
  const s = new Shape();
  s.absarc(0, 0, 1.15, 0, Math.PI, false);
  s.closePath();
  return extrude(s, 0.42, 0.12, seg);
}
function zigzag() {
  const xs = [-1.5, -0.75, 0, 0.75, 1.5], h = 0.42, t = 0.26;
  const ys = xs.map((_, i) => (i % 2 ? h : -h));
  const s = new Shape();
  s.moveTo(xs[0], ys[0] + t);
  for (let i = 1; i < xs.length; i++) s.lineTo(xs[i], ys[i] + t);
  for (let i = xs.length - 1; i >= 0; i--) s.lineTo(xs[i], ys[i] - t);
  s.closePath();
  return extrude(s, 0.36, 0.08, 4);
}
function roundBox(seg) {
  const s = new Shape(), w = 0.55, r = 0.18;
  s.moveTo(-w + r, -w); s.lineTo(w - r, -w); s.quadraticCurveTo(w, -w, w, -w + r); s.lineTo(w, w - r);
  s.quadraticCurveTo(w, w, w - r, w); s.lineTo(-w + r, w); s.quadraticCurveTo(-w, w, -w, w - r); s.lineTo(-w, -w + r);
  s.quadraticCurveTo(-w, -w, -w + r, -w);
  return extrude(s, 0.8, 0.14, seg / 8);
}
function plus() {
  const s = new Shape(), a = 0.28, b = 0.85;
  s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, -a); s.lineTo(b, -a); s.lineTo(b, a); s.lineTo(a, a); s.lineTo(a, b);
  s.lineTo(-a, b); s.lineTo(-a, a); s.lineTo(-b, a); s.lineTo(-b, -a); s.lineTo(-a, -a); s.closePath();
  return extrude(s, 0.4, 0.1, 2);
}

// Each toy: its shape, palette slot (0-3, or 4 for ink), size, depth, and where it rests.
// hero / heroPhone: in the intro. side / sidePhone: in the page margins. Units are -1..1 of the screen.
// The first 8 are the phone set, so the most fun shapes come first.
function toyList(seg) {
  return [
    { geo: () => new SphereGeometry(1, seg, seg * 0.6), slot: 0, size: 1.05, z: 0.4, hero: [0.56, 0.3], heroPhone: [-0.5, -0.36], side: [-0.9, 0.62] },
    { geo: () => halfDisc(seg), slot: 1, size: 1, z: -0.2, hero: [0.3, -0.46], heroPhone: [0.46, -0.6], side: [0.9, 0.42], rot: [0.3, 0.4, 0] },
    { geo: () => zigzag(), slot: 2, size: 0.85, z: 0.8, hero: [0.8, -0.6], heroPhone: [-0.12, -0.86], side: [-0.92, -0.1], rot: [0.4, -0.3, 0.3] },
    { geo: () => new TorusGeometry(0.9, 0.34, Math.max(10, seg / 2), seg, Math.PI), slot: 3, size: 1, z: 0, hero: [0.34, 0.52], heroPhone: [0.52, -0.24], side: [0.92, -0.32], arch: true },
    { geo: () => new ConeGeometry(0.85, 1.7, seg), slot: 1, size: 0.95, z: 0.6, hero: [0.88, 0.3], heroPhone: [0.08, -0.5], side: [-0.9, -0.58], rot: [0.2, 0, -0.3] },
    { geo: () => new CylinderGeometry(0.95, 0.95, 0.42, seg), slot: 2, size: 0.95, z: -0.5, hero: [0.16, 0.04], heroPhone: [-0.6, -0.7], side: [0.9, 0.85], rot: [1.2, 0, 0.3] },
    { geo: () => new TubeGeometry(new Wave(), Math.max(40, seg * 2), 0.17, 10, false), slot: 4, size: 1, z: 1, hero: [0.62, -0.16], heroPhone: [0.4, -0.92], side: [0.92, 0.08], caps: 0.17 },
    { geo: () => new TorusGeometry(0.72, 0.28, Math.max(10, seg / 2), seg), slot: 0, size: 1, z: -0.3, hero: [0.8, 0.66], heroPhone: [-0.08, -0.2], side: [-0.92, 0.25] },
    { geo: () => new CylinderGeometry(0.95, 0.95, 0.6, 3), slot: 3, size: 0.95, z: 0.2, hero: [0.5, -0.74], side: [0.9, -0.72], rot: [1.5, 0, 0.2] },
    { geo: () => new CapsuleGeometry(0.4, 1.1, 6, seg), slot: 0, size: 1, z: 0.3, hero: [0.97, -0.14], side: [-0.9, -0.85], rot: [0, 0, 0.9] },
    { geo: () => roundBox(seg), slot: 2, size: 1, z: -0.4, hero: [0.44, 0.06], side: [0.92, 0.62], rot: [0.5, 0.6, 0] },
    { geo: () => plus(), slot: 1, size: 0.9, z: 0.5, hero: [0.14, -0.72], side: [-0.92, 0.85], rot: [0.2, 0.3, 0.4] },
    { geo: () => new SphereGeometry(0.55, seg, seg * 0.6), slot: 3, size: 1, z: 0.9, hero: [0.72, 0.04], side: [-0.9, -0.34] },
  ];
}

// Setup is split into small steps with pauses between them, so phones never freeze while it builds.
const pause = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

export async function start({ canvas, low, reduced: reducedAtStart, onReducedChange }) {
  const renderer = new WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: low ? 'low-power' : 'default' });
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = !low;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.5, 80);
  camera.position.set(0, 0, CAM_Z);
  const disposables = [];
  const keep = (x) => { disposables.push(x); return x; };

  // Lights. Toon shading turns them into two or three flat tones.
  scene.add(new HemisphereLight('#FFFFFF', '#FFD8C2', 1.55));
  const sun = new DirectionalLight('#FFFFFF', 2.1);
  sun.position.set(-7, 9, 14);
  if (!low) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.radius = 7;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 40;
  }
  scene.add(sun, sun.target);
  await pause();

  const tones = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
  tones.minFilter = tones.magFilter = NearestFilter;
  tones.needsUpdate = true;
  keep(tones);

  // One material per palette slot, so a palette change is five color tweens.
  const slotMats = [0, 1, 2, 3].map((i) => keep(new MeshToonMaterial({ color: PALETTES[0][i], gradientMap: tones })));
  slotMats.push(keep(new MeshToonMaterial({ color: '#2A2A31', gradientMap: tones })));
  const outline = keep(new MeshBasicMaterial({ color: INK, side: BackSide }));
  const target = PALETTES[0].map((c) => new Color(c));
  await pause();

  // ---------- Layer 1: shadow wall ----------
  const wallGeo = keep(new PlaneGeometry(90, 60));
  if (!low) {
    const wall = new Mesh(wallGeo, keep(new ShadowMaterial({ color: INK, opacity: 0.2 })));
    wall.position.z = WALL_Z;
    wall.receiveShadow = true;
    scene.add(wall);
  }
  // Phones: a soft blob per toy instead of a shadow map.
  let blobMat = null, blobGeo = null;
  if (low) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    grd.addColorStop(0, 'rgba(27,27,31,1)');
    grd.addColorStop(1, 'rgba(27,27,31,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const tex = keep(new CanvasTexture(c));
    blobMat = keep(new MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.2, depthWrite: false }));
    blobGeo = keep(new PlaneGeometry(1, 1));
  }

  // ---------- Layer 2: Bauhaus sun ----------
  const sunDisc = new Group();
  const halfGeo = keep(new CircleGeometry(1, low ? 40 : 72, 0, Math.PI));
  const sunA = new Mesh(halfGeo, keep(new MeshBasicMaterial({ color: PALETTES[0][1] })));
  const sunB = new Mesh(halfGeo, keep(new MeshBasicMaterial({ color: PALETTES[0][0] })));
  sunB.rotation.z = Math.PI;
  const sunRing = new Mesh(keep(new TorusGeometry(1.02, 0.035, 6, low ? 48 : 96)), keep(new MeshBasicMaterial({ color: INK })));
  sunDisc.add(sunA, sunB, sunRing);
  sunDisc.position.z = WALL_Z + 0.2;
  scene.add(sunDisc);

  // ---------- Layer 3: confetti ----------
  const dummy = new Object3D();
  const confetti = [];
  const confGeos = [keep(new CircleGeometry(0.16, 3)), keep(new CircleGeometry(0.11, 12)), keep(new PlaneGeometry(0.42, 0.1))];
  const confCount = low ? 14 : 36;
  const confMat = keep(new MeshBasicMaterial({ color: '#FFFFFF' }));
  confGeos.forEach((geo, k) => {
    const im = new InstancedMesh(geo, confMat, confCount);
    const parts = [];
    for (let i = 0; i < confCount; i++) {
      parts.push({
        u: Math.random() * 2 - 1, y0: Math.random(), z: WALL_Z + 0.4 + Math.random() * 1.6,
        rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 1.6, s: 0.7 + Math.random() * 0.8,
        par: 0.35 + Math.random() * 0.5, slot: (i + k) % 5,
      });
    }
    scene.add(im);
    confetti.push({ im, parts });
  });
  const tmpColor = new Color();
  const inkColor = new Color(INK);
  const paintConfetti = () => {
    for (const { im, parts } of confetti) {
      parts.forEach((p, i) => im.setColorAt(i, p.slot === 4 ? inkColor : slotMats[p.slot].color));
      im.instanceColor.needsUpdate = true;
    }
  };

  // ---------- Layer 4: toys ----------
  const seg = low ? 20 : 40;
  const defs = toyList(seg).slice(0, low ? 8 : 13);
  const bodies = [];
  const capGeo = keep(new SphereGeometry(1, 16, 10));
  for (const d of defs) {
    if (bodies.length % 3 === 2) await pause();
    const geo = keep(d.geo());
    geo.computeBoundingSphere();
    const mat = slotMats[d.slot];
    const mesh = new Mesh(geo, mat);
    mesh.castShadow = !low;
    const r = geo.boundingSphere.radius;
    const hull = new Mesh(geo, outline);
    hull.scale.setScalar(1 + 0.075 / Math.max(0.5, r * 0.6));
    mesh.add(hull);
    // Round off the open ends of the arch and the squiggle.
    const capR = d.arch ? 0.34 : d.caps;
    if (capR) {
      const ends = d.arch ? [[0.9, 0, 0], [-0.9, 0, 0]] : [[-1.6, 0, 0], [1.6, 0, 0]];
      for (const e of ends) {
        const cap = new Mesh(capGeo, mat);
        cap.scale.setScalar(capR);
        cap.position.set(...e);
        cap.castShadow = !low;
        const ch = new Mesh(capGeo, outline);
        ch.scale.setScalar(1 + 0.075 / capR);
        cap.add(ch);
        mesh.add(cap);
      }
    }
    const rot = d.rot || [0, 0, 0];
    mesh.rotation.set(...rot);
    scene.add(mesh);
    let blob = null;
    if (low) { blob = new Mesh(blobGeo, blobMat); blob.position.z = WALL_Z; scene.add(blob); }
    bodies.push({
      d, mesh, blob, r: r * 0.78, z: d.z,
      pos: new Vector2(), vel: new Vector2(), home: new Vector2(),
      w: new Vector3(), spin: new Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.3),
      rot0: rot, s: 0, sv: 0, free: 0, hover: false, phase: Math.random() * 6.28,
    });
  }
  const meshes = bodies.map((b) => b.mesh);

  await pause();
  // ---------- Layer 5: foreground ----------
  const fg = [];
  {
    const ringG = keep(new TorusGeometry(2.1, 0.42, low ? 12 : 20, low ? 40 : 72));
    const ring = new Mesh(ringG, slotMats[2]);
    const rh = new Mesh(ringG, outline); rh.scale.setScalar(1.03); ring.add(rh);
    ring.position.z = 7;
    ring.rotation.set(0.5, -0.4, 0);
    const halfG = keep(halfDisc(low ? 24 : 48));
    const half = new Mesh(halfG, slotMats[3]);
    const hh = new Mesh(halfG, outline); hh.scale.setScalar(1.05); half.add(hh);
    half.position.z = 6;
    half.rotation.set(0.3, 0.5, 0.4);
    scene.add(ring, half);
    fg.push({ m: ring, size: 1, u: 0.9, v: 0.95, par: 1.5, spin: 0.25 }, { m: half, size: 1.9, u: -0.92, v: -1.05, par: 1.1, spin: -0.2 });
  }

  await pause();
  // ---------- Layout ----------
  let W = 1, H = 1, aspect = 1, phone = false;
  const halfH = (z) => (CAM_Z - z) * TAN;
  const halfW = (z) => halfH(z) * aspect;
  const worldPerPx = (z) => (2 * halfH(z)) / H;
  let hp = 0, gravity = false, lastScroll = scrollY;

  function homeFor(b, scroll, t) {
    const d = b.d;
    const hero = phone ? (d.heroPhone || [d.side[0] * 1.05, d.side[1]]) : d.hero;
    const side = phone ? [d.side[0] > 0 ? 1.02 : -1.02, d.side[1] * 0.9] : d.side;
    const bob = Math.sin(scroll * 0.0022 + b.phase) * 0.06 + Math.sin(t * 0.7 + b.phase) * 0.015;
    const u = lerp(hero[0], side[0], hp), v = lerp(hero[1], side[1], hp) + bob * hp;
    b.home.set(u * halfW(b.z), v * halfH(b.z));
  }

  // ---------- Pointer ----------
  const ray = new Raycaster();
  const ndc = new Vector2(9, 9);
  const plane = new Plane(new Vector3(0, 0, 1), 0);
  const hit = new Vector3();
  let moved = false, canGrab = false, drag = null, hovered = null, reduced = !!reducedAtStart;
  const fine = finePointer();
  const camAim = new Vector2();
  const isUI = (el) => !!(el && el.closest && el.closest('a,button,input,select,textarea,label,summary,.item,.tabbar,.site-footer,.lede,.kicker,h1'));
  const setNdc = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); };
  const pick = () => {
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(meshes, false);
    return hits.length ? bodies[meshes.indexOf(hits[0].object)] : null;
  };
  const worldAt = (z, out) => {
    ray.setFromCamera(ndc, camera);
    plane.constant = -z;
    return ray.ray.intersectPlane(plane, out);
  };
  const root = document.documentElement;
  function onMove(e) {
    setNdc(e);
    moved = true;
    canGrab = !isUI(e.target);
    if (drag && e.pointerId === drag.id) worldAt(drag.b.z, drag.to) && drag.to.add(drag.off3);
  }
  function onDown(e) {
    if (reduced || !e.isPrimary || e.button > 0 || isUI(e.target)) return;
    setNdc(e);
    const b = pick();
    if (!b) return;
    if (!worldAt(b.z, hit)) return;
    drag = { b, id: e.pointerId, to: hit.clone(), off3: new Vector3(b.pos.x - hit.x, b.pos.y - hit.y, 0) };
    drag.to.add(drag.off3);
    b.free = 0;
    b.sv += 2;
    root.classList.add('wd-grabbing');
    if (e.pointerType === 'mouse') e.preventDefault();
  }
  function onUp(e) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const b = drag.b;
    const sp = b.vel.length();
    if (sp > 26) b.vel.multiplyScalar(26 / sp);
    b.w.set(-b.vel.y * 0.45, b.vel.x * 0.45, -b.vel.x * 0.2);
    b.free = 2.2;
    drag = null;
    root.classList.remove('wd-grabbing');
  }
  // A touch that lands on a toy holds it, so the page does not scroll under your finger.
  const onTouch = (e) => { if (drag) e.preventDefault(); };
  const onBlur = () => onUp(drag ? { pointerId: drag.id } : null);
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown);
  addEventListener('pointerup', onUp);
  addEventListener('pointercancel', onUp);
  addEventListener('touchstart', onTouch, { passive: false });
  addEventListener('touchmove', onTouch, { passive: false });
  addEventListener('blur', onBlur);

  // A new palette makes every toy hop and spin.
  const onPalette = (e) => {
    PALETTES[e.detail].forEach((c, i) => target[i].set(c));
    if (reduced) return;
    for (const b of bodies) { b.sv += 2.4; b.w.y += (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2); }
  };
  bus.addEventListener('palette', onPalette);
  // Reduced motion: drop anything held and stop reacting to the pointer.
  const offReduced = onReducedChange((r) => {
    reduced = r;
    if (r) { onBlur(); if (hovered) hovered.hover = false; hovered = null; root.classList.remove('wd-grab'); }
  });
  PALETTES[state.palette].forEach((c, i) => target[i].set(c));

  // ---------- Physics ----------
  const K = 16, STEP = 1 / 120;
  const tmp = new Vector2();
  function physics(h) {
    const floorPad = 0.02;
    for (const b of bodies) {
      const hw = halfW(b.z), hh = halfH(b.z);
      if (drag && drag.b === b) {
        const k = 1 - Math.exp(-h * 32);
        const nx = lerp(b.pos.x, drag.to.x, k), ny = lerp(b.pos.y, drag.to.y, k);
        b.vel.set((nx - b.pos.x) / h, (ny - b.pos.y) / h);
        b.pos.set(nx, ny);
        continue;
      }
      if (b.free > 0) b.free = Math.max(0, b.free - h);
      if (gravity) {
        b.vel.y -= 24 * h;
        b.vel.multiplyScalar(Math.exp(-h * 0.25));
      } else {
        const ramp = 1 - smooth(b.free / 2.2);
        const k = K * (0.08 + 0.92 * ramp);
        const c = 2 * Math.sqrt(K) * (0.34 * ramp + 0.06);
        tmp.subVectors(b.home, b.pos).multiplyScalar(k).addScaledVector(b.vel, -c);
        b.vel.addScaledVector(tmp, h);
      }
      b.pos.addScaledVector(b.vel, h);
      // Walls: only for thrown toys and when gravity is on. Resting toys may peek past the edge.
      if (b.free > 0 || gravity) {
        const e = gravity ? 0.42 : 0.72, r = b.r;
        if (b.pos.x < -hw + r && b.vel.x < 0) { b.pos.x = -hw + r; bump(b, Math.abs(b.vel.x)); b.vel.x *= -e; }
        if (b.pos.x > hw - r && b.vel.x > 0) { b.pos.x = hw - r; bump(b, Math.abs(b.vel.x)); b.vel.x *= -e; }
        if (b.pos.y < -hh + r + floorPad && b.vel.y < 0) {
          b.pos.y = -hh + r + floorPad; bump(b, Math.abs(b.vel.y)); b.vel.y *= -e;
          if (gravity) b.vel.x *= Math.exp(-h * 40);
        }
        if (b.pos.y > hh - r && b.vel.y > 0) { b.pos.y = hh - r; bump(b, Math.abs(b.vel.y)); b.vel.y *= -e; }
      }
    }
    // Toy-to-toy hits. Only when something is moving freely, so resting toys stay calm.
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const aLive = a.free > 0 || (drag && drag.b === a), bLive = b.free > 0 || (drag && drag.b === b);
        if (!gravity && !aLive && !bLive) continue;
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = rr - d;
        const ia = drag && drag.b === a ? 0 : 1 / (a.r * a.r), ib = drag && drag.b === b ? 0 : 1 / (b.r * b.r);
        const sum = ia + ib;
        if (!sum) continue;
        a.pos.x -= nx * over * (ia / sum); a.pos.y -= ny * over * (ia / sum);
        b.pos.x += nx * over * (ib / sum); b.pos.y += ny * over * (ib / sum);
        const vn = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny;
        if (vn < 0) {
          const jimp = (-(1 + 0.6) * vn) / sum;
          a.vel.x -= jimp * ia * nx; a.vel.y -= jimp * ia * ny;
          b.vel.x += jimp * ib * nx; b.vel.y += jimp * ib * ny;
          if (-vn > 1.5) {
            if (ia) { a.free = Math.max(a.free, 1.4); bump(a, -vn * 0.6); }
            if (ib) { b.free = Math.max(b.free, 1.4); bump(b, -vn * 0.6); }
          }
        }
      }
    }
  }
  function bump(b, speed) {
    if (speed < 0.8) return;
    b.sv -= Math.min(3, speed * 0.12);
    b.w.z += (Math.random() - 0.5) * speed * 0.4;
  }

  // ---------- Per frame ----------
  function place(t, dt) {
    for (const b of bodies) {
      const m = b.mesh;
      m.position.set(b.pos.x, b.pos.y, b.z);
      if (dt > 0) {
        m.rotation.x += (b.spin.x + b.w.x) * dt;
        m.rotation.y += (b.spin.y + b.w.y) * dt;
        m.rotation.z += (b.spin.z * 0.4 + b.w.z) * dt;
        b.w.multiplyScalar(Math.exp(-dt * 1.1));
        // Springy scale: a little bigger when hovered or held.
        const goal = (b.hover ? 0.16 : 0) + (drag && drag.b === b ? 0.1 : 0);
        b.sv += (300 * (goal - b.s) - 13 * b.sv) * dt;
        b.s += b.sv * dt;
      }
      const sc = b.d.size * (phone ? 0.78 : 1) * (1 + b.s);
      m.scale.setScalar(Math.max(0.2, sc));
      if (b.blob) {
        const off = (b.z - WALL_Z) * 0.32;
        b.blob.position.set(b.pos.x + off * 0.6, b.pos.y - off, WALL_Z);
        b.blob.scale.setScalar(b.r * 2.8 * sc);
      }
    }
  }
  function layers(t, scroll) {
    const wpp = worldPerPx(0);
    // Bauhaus sun: behind the toys in the intro, then rides up and turns with the scroll.
    const sh = halfH(sunDisc.position.z), sw = sh * aspect;
    const sunR = phone ? sh * 0.4 : sh * 0.5;
    sunDisc.scale.setScalar(sunR);
    sunDisc.position.x = phone ? sw * 0.15 : sw * 0.6;
    sunDisc.position.y = wrap((phone ? -sh * 0.5 : sh * 0.02) + scroll * wpp * 0.35, -sh - sunR, sh + sunR + 2 * sh);
    sunDisc.rotation.z = -scroll * 0.0016 + t * 0.05;
    // Confetti drifts up and wraps around.
    for (const { im, parts } of confetti) {
      parts.forEach((p, i) => {
        const hh = halfH(p.z), hw = hh * aspect;
        const y = wrap(p.y0 * hh * 2 + scroll * wpp * p.par + t * 0.18, -hh - 0.5, hh + 0.5);
        dummy.position.set(p.u * hw, y, p.z);
        dummy.rotation.set(0, 0, p.rot + t * p.spin + scroll * 0.002);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    }
    // Foreground: fast parallax.
    for (const f of fg) {
      const hh = halfH(f.m.position.z), hw = hh * aspect;
      f.m.position.x = f.u * hw;
      f.m.scale.setScalar(f.size * (phone ? 0.6 : 1));
      f.m.position.y = wrap(f.v * hh + scroll * wpp * f.par, -hh - 4, hh + 4 + hh * 1.5);
      f.m.rotation.z += f.spin * 0.016;
    }
  }
  function colors(k) {
    let moving = false;
    slotMats.slice(0, 4).forEach((m, i) => {
      if (!m.color.equals(target[i])) { m.color.lerp(target[i], k); moving = true; }
    });
    sunA.material.color.copy(slotMats[1].color);
    sunB.material.color.copy(slotMats[0].color);
    if (moving || !confetti[0].im.instanceColor) paintConfetti();
  }
  function scrollState(scroll) {
    hp = smooth(scroll / (H * 0.85));
    const docH = document.documentElement.scrollHeight;
    gravity = docH - (scroll + H) < 140 && docH > H * 1.5;
  }
  function aimCamera(dt) {
    if (fine && !reduced) {
      const k = 1 - Math.exp(-dt * 2.5);
      camAim.x = lerp(camAim.x, ndc.x < 2 ? ndc.x : 0, k);
      camAim.y = lerp(camAim.y, ndc.y < 2 ? ndc.y : 0, k);
    }
    camera.position.set(camAim.x * 0.9, camAim.y * 0.6, CAM_Z);
    camera.lookAt(0, 0, 0);
  }

  let first = true;
  function settle(scroll, t) {
    scrollState(scroll);
    for (const b of bodies) { homeFor(b, scroll, t); b.pos.copy(b.home); b.vel.set(0, 0); b.free = 0; }
  }

  function frame(t, dt) {
    const scroll = scrollY;
    if (first) { settle(scroll, t); first = false; paintConfetti(); }
    const ds = scroll - lastScroll;
    lastScroll = scroll;
    const wasGravity = gravity;
    scrollState(scroll);
    if (wasGravity && !gravity) for (const b of bodies) b.free = Math.max(b.free, 1.6);
    for (const b of bodies) {
      homeFor(b, scroll, t);
      // Scrolling gives the toys a nudge, so they lag and bounce behind the page.
      if (!(drag && drag.b === b) && !gravity && ds) {
        b.vel.y += clamp(ds * worldPerPx(b.z) * 3.2, -4, 4);
        b.mesh.rotation.y += ds * 0.0025;
      }
    }
    // Hover: springy grow and a grab cursor, mouse only.
    if (fine && moved) {
      moved = false;
      const over = canGrab && !drag ? pick() : null;
      if (over !== hovered) {
        if (hovered) hovered.hover = false;
        hovered = over;
        if (hovered) { hovered.hover = true; hovered.sv += 1.2; }
        root.classList.toggle('wd-grab', !!hovered);
      }
    }
    let left = dt;
    let n = 0;
    while (left > 1e-4 && n < 12) { const h = Math.min(STEP, left); physics(h); left -= h; n++; }
    place(t, dt);
    layers(t, scroll);
    colors(1 - Math.exp(-dt * 3.5));
    aimCamera(dt);
    renderer.render(scene, camera);
  }

  function still() {
    const scroll = scrollY;
    settle(scroll, 0);
    for (const b of bodies) { b.mesh.rotation.set(...b.rot0); b.s = 0; b.sv = 0; b.hover = false; }
    place(0, 0);
    layers(0, scroll);
    colors(1);
    paintConfetti();
    camAim.set(0, 0);
    aimCamera(0);
    renderer.render(scene, camera);
  }

  // Compile the shaders ahead of the first frame, without blocking the page where the browser allows it.
  try { await renderer.compileAsync(scene, camera); } catch { /* the first frame compiles them instead */ }
  await pause();

  return {
    resize(w, h, dpr) {
      if (w !== W || h !== H) first = true;
      W = w; H = h; aspect = w / h; phone = aspect < 0.8;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      if (!low) {
        const sc = sun.shadow.camera, hh = halfH(WALL_Z) + 2, hw = hh * aspect + 2;
        sc.left = -hw; sc.right = hw; sc.top = hh; sc.bottom = -hh;
        sc.updateProjectionMatrix();
      }
    },
    frame,
    still,
    dispose() {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp);
      removeEventListener('pointercancel', onUp);
      removeEventListener('touchstart', onTouch);
      removeEventListener('touchmove', onTouch);
      removeEventListener('blur', onBlur);
      bus.removeEventListener('palette', onPalette);
      offReduced();
      confetti.forEach(({ im }) => im.dispose());
      disposables.forEach((x) => x.dispose());
      renderer.dispose();
    },
  };
}
