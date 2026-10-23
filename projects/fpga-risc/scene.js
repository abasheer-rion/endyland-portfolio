// FPGA page stage: a voxel chip on a circuit board, running a 5-stage pipeline.
// Decoration only. Everything it shows is also in the text (5 stages, 50 MHz board, 16 instructions).
// Instructions ride in along a gold trace, step across the five stage pads on the chip once per clock tick
// (IF, ID, EX, MEM, WB), and leave on the far side. Now and then a slot is empty (a bubble).
// It draws at a fraction of screen resolution and the canvas is scaled up with hard edges: real pixels.
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import {
  WebGLRenderer, Scene, PerspectiveCamera, InstancedMesh, BoxGeometry, MeshLambertMaterial, MeshBasicMaterial,
  Mesh, Object3D, Color, HemisphereLight, DirectionalLight, Group, Matrix4,
} from '../../shared/vendor/three-r186.module.min.js';
import { bus } from './bus.js';

const PINK = '#FF4FD8', CYAN = '#3DF2FF', YELLOW = '#FFE14D', GREEN = '#3DFF8A';
const INSTR = [CYAN, YELLOW, GREEN, CYAN, YELLOW, GREEN, CYAN, PINK]; // every 8th one is the pink one we follow
const TICK = 0.55;      // seconds per clock tick (slowed way down from 50 MHz so you can see it)
const GAP = 1.25;       // distance between pipeline slots
const hash = (n) => {
  let h = Math.imul(n | 0, 374761393) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
// Instruction k exists unless it is a bubble. The pink one (k % 8 === 7) never is.
const exists = (k) => k % 8 === 7 || hash(k) > 0.16;

export function start({ canvas, low }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: low ? 'low-power' : 'default' });
  renderer.setClearColor('#010A06', 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 2, 1, 120);
  scene.add(new HemisphereLight('#B9FFD8', '#0A2A18', 1.6));
  const sun = new DirectionalLight('#FFFFFF', 2.1);
  sun.position.set(-6, 12, 8);
  scene.add(sun);

  const world = new Group();
  scene.add(world);
  const geos = [], mats = [];
  const box = (w, h, d) => { const g = new BoxGeometry(w, h, d); geos.push(g); return g; };
  const lam = (c) => { const m = new MeshLambertMaterial({ color: c }); mats.push(m); return m; };
  const basic = (c) => { const m = new MeshBasicMaterial({ color: c }); mats.push(m); return m; };

  // Board
  const board = new Mesh(box(28, 0.6, 15), lam('#0E6B3A'));
  board.position.y = -0.3;
  world.add(board);

  // Chip: package, pins and the pin-1 dot
  const chip = new Mesh(box(7.6, 1, 6.4), lam('#17171C'));
  chip.position.y = 0.5;
  world.add(chip);
  const dot = new Mesh(box(0.5, 0.06, 0.5), lam('#3A3A44'));
  dot.position.set(-3.2, 1.03, -2.6);
  world.add(dot);

  const o = new Object3D(), col = new Color();
  const pinsPerSide = low ? 7 : 9;
  const pins = new InstancedMesh(box(0.34, 0.26, 0.9), lam('#C9C2A8'), pinsPerSide * 4);
  const traceCount = pinsPerSide * 4 + 2;
  const traces = new InstancedMesh(box(1, 0.08, 0.22), lam('#D6B24A'), traceCount);
  let pi = 0, ti = 0;
  const addTrace = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    o.position.set((x0 + x1) / 2, 0.04, (z0 + z1) / 2);
    o.rotation.set(0, Math.atan2(-(z1 - z0), x1 - x0), 0);
    o.scale.set(len, 1, 1);
    o.updateMatrix(); traces.setMatrixAt(ti++, o.matrix);
    o.scale.set(1, 1, 1);
  };
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < pinsPerSide; i++) {
      const u = (i - (pinsPerSide - 1) / 2) * (side < 2 ? 6.6 / pinsPerSide : 5.6 / pinsPerSide);
      const r = 2 + hash(side * 31 + i) * 5;
      if (side < 2) { // front and back rows, along x
        const z = side === 0 ? 3.55 : -3.55, s = side === 0 ? 1 : -1;
        o.position.set(u, 0.2, z); o.rotation.set(0, 0, 0); o.updateMatrix(); pins.setMatrixAt(pi++, o.matrix);
        addTrace(u, z, u, Math.max(-7.2, Math.min(7.2, z + s * r)));
      } else { // left and right rows, along z
        const x = side === 2 ? -4.15 : 4.15, s = side === 2 ? -1 : 1;
        o.position.set(x, 0.2, u); o.rotation.set(0, Math.PI / 2, 0); o.updateMatrix(); pins.setMatrixAt(pi++, o.matrix);
        // The middle pins on each side carry the instruction bus, so they are drawn below instead.
        if (Math.abs(u) > 0.5) addTrace(x, u, x + s * r, u);
      }
    }
  }
  // Instruction bus in and out, along z = 0
  addTrace(-14, 0, -4.1, 0);
  addTrace(4.1, 0, 14, 0);
  traces.count = ti;
  world.add(pins, traces);

  // A few parts on the board: capacitors, a crystal, header pins
  const parts = [
    [-9, -4.5, 1.1, 1.2, 1.1, '#2B6CB0'], [-10.6, -4.5, 1.1, 1.2, 1.1, '#2B6CB0'], [9.2, 4.6, 1.1, 1.4, 1.1, '#20242B'],
    [7.2, -5, 1.6, 0.7, 0.8, '#B8BCC6'], [-7, 5, 0.8, 0.5, 0.5, '#8A5A2B'], [-6, 5, 0.8, 0.5, 0.5, '#8A5A2B'],
    [11, -4.2, 0.8, 0.5, 0.5, '#8A5A2B'],
  ];
  for (const [x, z, w, h, d, c] of parts) {
    const m = new Mesh(box(w, h, d), lam(c));
    m.position.set(x, h / 2, z);
    world.add(m);
  }
  const header = new InstancedMesh(box(0.3, 1.1, 0.3), lam('#C9C2A8'), 12);
  for (let i = 0; i < 12; i++) { o.position.set(-5.5 + i * 1, 0.55, 6.6); o.rotation.set(0, 0, 0); o.updateMatrix(); header.setMatrixAt(i, o.matrix); }
  world.add(header);

  // Clock LED: blinks once per tick
  const ledOff = new Color('#3B1030'), ledOn = new Color(PINK);
  const led = new Mesh(box(0.6, 0.4, 0.6), basic(ledOff));
  led.position.set(5.6, 0.2, -4.6);
  world.add(led);

  // Five stage pads on the chip
  const padIdle = new Color('#26303A');
  const pads = [];
  for (let s = 0; s < 5; s++) {
    const m = new Mesh(box(1, 0.16, 1.7), basic(padIdle.clone()));
    m.position.set((s - 2) * GAP, 1.08, 0);
    world.add(m); pads.push(m);
  }

  // Instructions: one cube per slot along the path
  const SLOT_MIN = -9, SLOT_MAX = 13;
  const nInstr = SLOT_MAX - SLOT_MIN + 2;
  const cubes = new InstancedMesh(box(0.7, 0.7, 0.7), basic('#FFFFFF'), nInstr);
  world.add(cubes);
  const zero = new Matrix4().makeScale(0, 0, 0);
  const slotX = (s) => (s - 2) * GAP;
  const slotY = (s) => (s >= 0 && s <= 4 ? 1.6 : 0.5);

  let W = 2, H = 1, aspect = 2;
  let lastTick = -1, lastStage = -2;

  function place(t, animate) {
    const ticks = t / TICK;
    const now = Math.floor(ticks);
    const f = animate ? ticks - now : 1;
    // Stepped hop: move in 4 steps over the first 40% of a tick, then rest.
    const hop = Math.min(1, Math.floor(Math.min(1, f / 0.4) * 4) / 4);
    let n = 0, pink = -2;
    const padColor = [null, null, null, null, null];
    for (let k = now - SLOT_MAX; k <= now - SLOT_MIN; k++) {
      if (k < 0 || !exists(k)) continue;
      const s1 = now - k, s0 = s1 - 1;
      if (s1 < SLOT_MIN || s1 > SLOT_MAX) continue;
      const x = slotX(s0) + (slotX(s1) - slotX(s0)) * hop;
      const y = slotY(s0) + (slotY(s1) - slotY(s0)) * hop + Math.sin(hop * Math.PI) * 0.9;
      o.position.set(x, y, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix();
      cubes.setMatrixAt(n, o.matrix);
      const c = INSTR[k % 8];
      cubes.setColorAt(n, col.set(c));
      n++;
      if (s1 >= 0 && s1 <= 4) padColor[s1] = c;
      if (k % 8 === 7) pink = s1;
    }
    for (let i = n; i < nInstr; i++) cubes.setMatrixAt(i, zero);
    cubes.instanceMatrix.needsUpdate = true;
    if (cubes.instanceColor) cubes.instanceColor.needsUpdate = true;
    pads.forEach((m, i) => m.material.color.set(padColor[i] ? col.set(padColor[i]).multiplyScalar(0.55) : padIdle));
    led.material.color.copy(animate && f < 0.25 ? ledOn : ledOff);
    const st = pink >= 0 && pink <= 4 ? pink : -1;
    if (now !== lastTick || st !== lastStage) { lastTick = now; lastStage = st; bus.onStage?.(st); }
  }

  function aim(t) {
    const yaw = Math.sin(t * 0.17) * 0.22 + bus.px * 0.18;
    const pitch = 0.78 + bus.py * 0.06;
    const dist = aspect < 1.7 ? 33 : aspect < 2.4 ? 30 : 28;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0, -0.4, 0.4);
  }

  return {
    resize(w, h, dpr) {
      W = w; H = h; aspect = w / Math.max(1, h);
      // Chunky pixels: about one drawn pixel per 2.5 screen pixels (2 on phones, where the stage is small).
      renderer.setPixelRatio(Math.max(0.25, dpr / (low ? 2 : 2.5)));
      renderer.setSize(W, H, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    frame(t) {
      aim(t);
      place(t + 12 * TICK, true);
      renderer.render(scene, camera);
    },
    still() {
      aim(0);
      place(23 * TICK, false);
      renderer.render(scene, camera);
      bus.onStop?.();
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
