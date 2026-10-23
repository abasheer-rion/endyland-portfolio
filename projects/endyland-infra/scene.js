// endyland hosting page stage: a voxel server rack under a voxel cloud. Decoration only.
// It shows what the text says: services that are checked on a timer (every 5 minutes, sped up here),
// and requests going between the machines and the cloud.
// The rack's lights blink as it works. On each health check a ring of light runs out across the floor,
// every light on the rack turns green for a moment, and the HUD says so (bus.onCheck).
// Cubes ride the cable between the rack and the cloud both ways.
// It draws at a fraction of screen resolution and the canvas is scaled up with hard edges: real pixels.
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import {
  WebGLRenderer, Scene, PerspectiveCamera, InstancedMesh, BoxGeometry, MeshLambertMaterial, MeshBasicMaterial,
  Mesh, Object3D, Color, HemisphereLight, DirectionalLight, Group, Matrix4,
} from '../../shared/vendor/three-r186.module.min.js';
import { bus } from './bus.js';

const GREEN = '#3DFF8A', YELLOW = '#FFE14D', CYAN = '#3DF2FF', PINK = '#FF4FD8';
const CHECK = 3.2; // seconds between health checks in the picture
const hash = (n) => { let h = Math.imul(n | 0, 2654435761); h = Math.imul(h ^ (h >>> 15), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

export function start({ canvas, low }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: low ? 'low-power' : 'default' });
  renderer.setClearColor('#0A0702', 1);
  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1.4, 1, 120);
  scene.add(new HemisphereLight('#FFE9B0', '#1A1206', 1.5));
  const sun = new DirectionalLight('#FFFFFF', 2);
  sun.position.set(-5, 10, 8);
  scene.add(sun);
  const world = new Group();
  scene.add(world);

  const geos = [], mats = [];
  const box = (w, h, d) => { const g = new BoxGeometry(w, h, d); geos.push(g); return g; };
  const lam = (c) => { const m = new MeshLambertMaterial({ color: c }); mats.push(m); return m; };
  const basic = (c) => { const m = new MeshBasicMaterial({ color: c }); mats.push(m); return m; };
  const o = new Object3D(), col = new Color(), zero = new Matrix4().makeScale(0, 0, 0);

  // Floor tiles, checkered
  const R = low ? 6 : 8;
  const tiles = new InstancedMesh(box(0.96, 0.2, 0.96), lam('#FFFFFF'), (2 * R + 1) ** 2);
  const tileXZ = [];
  let n = 0;
  for (let x = -R; x <= R; x++) for (let z = -R; z <= R; z++) {
    o.position.set(x, -0.1, z); o.updateMatrix(); tiles.setMatrixAt(n, o.matrix);
    tiles.setColorAt(n, col.set((x + z) & 1 ? '#1C150A' : '#251C0C'));
    tileXZ.push([x, z]); n++;
  }
  world.add(tiles);

  // Rack: a tall case with six servers in it
  const rack = new Mesh(box(3, 7, 2.4), lam('#24242A'));
  rack.position.set(-1.6, 3.5, 0);
  world.add(rack);
  const top = new Mesh(box(3.2, 0.3, 2.6), lam('#34343C'));
  top.position.set(-1.6, 7.1, 0);
  world.add(top);
  const units = new InstancedMesh(box(2.5, 0.8, 0.12), lam('#3A3A44'), 6);
  for (let i = 0; i < 6; i++) { o.position.set(-1.6, 0.9 + i * 1.05, 1.24); o.updateMatrix(); units.setMatrixAt(i, o.matrix); }
  world.add(units);
  // Three lights per server
  const leds = new InstancedMesh(box(0.22, 0.22, 0.1), basic('#FFFFFF'), 18);
  for (let i = 0; i < 18; i++) {
    const u = Math.floor(i / 3), k = i % 3;
    o.position.set(-0.75 + k * 0.32, 0.9 + u * 1.05, 1.32); o.updateMatrix(); leds.setMatrixAt(i, o.matrix);
    leds.setColorAt(i, col.set(GREEN));
  }
  world.add(leds);
  // A small box beside the rack (the network switch)
  const sw = new Mesh(box(1.6, 0.8, 1.6), lam('#2E2E36'));
  sw.position.set(1.4, 0.4, 0.8);
  world.add(sw);
  const swLed = new Mesh(box(0.2, 0.2, 0.08), basic(YELLOW));
  swLed.position.set(1.0, 0.55, 1.62);
  world.add(swLed);

  // Cloud: a blob of cubes up and to the right
  const cloudCells = [];
  const CX = 3.2, CY = 8.6, CZ = -1.5;
  for (let x = -3; x <= 3; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const d = (x * x) / 9 + (y * y) / 1.4 + (z * z) / 1.6 + (x > 0 && y > 0 ? 0.35 : 0);
    if (d < 1.05 && (!low || (x + y + z) % 2 === 0 || d < 0.6)) cloudCells.push([CX + x * 0.9, CY + y * 0.9 + (x === 0 || x === -1 ? 0.35 : 0), CZ + z * 0.9]);
  }
  const cloud = new InstancedMesh(box(0.92, 0.92, 0.92), lam('#E9E4D6'), cloudCells.length);
  cloudCells.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); cloud.setMatrixAt(i, o.matrix); });
  world.add(cloud);

  // Cable: from the rack top up to the cloud, a chain of small cubes
  const path = [];
  const a = [-1.2, 7.3, 0], b = [-1.2, 8.6, 0], c = [CX - 2.4, 8.6, CZ + 0.4];
  const seg = (p, q, steps) => { for (let i = 0; i < steps; i++) { const k = i / steps; path.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]); } };
  seg(a, b, 4); seg(b, c, 10); path.push(c);
  const cable = new InstancedMesh(box(0.22, 0.22, 0.22), lam('#5A4A20'), path.length);
  path.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.updateMatrix(); cable.setMatrixAt(i, o.matrix); });
  world.add(cable);
  const NP = 6;
  const packets = new InstancedMesh(box(0.42, 0.42, 0.42), basic('#FFFFFF'), NP);
  world.add(packets);

  // Health check ring on the floor
  const RING = low ? 28 : 44;
  const ring = new InstancedMesh(box(0.5, 0.14, 0.5), basic(GREEN), RING);
  world.add(ring);

  let aspect = 1.4, lastCheck = null;

  function place(t, still) {
    const phase = still ? 0.2 : (t % CHECK) / CHECK;
    const checking = phase < 0.28;
    // lights
    for (let i = 0; i < 18; i++) {
      let c = GREEN;
      if (!checking) {
        const on = still ? hash(i) > 0.3 : hash(i * 31 + Math.floor(t * (4 + hash(i) * 6))) > 0.35;
        c = on ? (i % 3 === 2 ? YELLOW : GREEN) : '#123A20';
      }
      leds.setColorAt(i, col.set(c));
    }
    leds.instanceColor.needsUpdate = true;
    swLed.material.color.set(still || Math.floor(t * 6) % 2 ? YELLOW : '#4A3A10');
    // ring: a circle of tiles growing from under the rack, in steps
    const rr = checking ? Math.floor((phase / 0.28) * 6) + 1.5 : -1;
    for (let i = 0; i < RING; i++) {
      if (rr < 0) { ring.setMatrixAt(i, zero); continue; }
      const ang = (i / RING) * Math.PI * 2;
      o.position.set(-1.6 + Math.round(Math.cos(ang) * rr), 0.08, Math.round(Math.sin(ang) * rr));
      o.rotation.set(0, 0, 0); o.updateMatrix(); ring.setMatrixAt(i, o.matrix);
    }
    ring.instanceMatrix.needsUpdate = true;
    // packets riding the cable, half up and half down, stepping one cube at a time
    for (let i = 0; i < NP; i++) {
      const up = i % 2 === 0;
      const p = ((still ? i / NP : t * 0.55 + i / NP) % 1);
      let idx = Math.floor(p * path.length);
      if (!up) idx = path.length - 1 - idx;
      const [x, y, z] = path[Math.min(path.length - 1, idx)];
      o.position.set(x, y, z); o.updateMatrix(); packets.setMatrixAt(i, o.matrix);
      packets.setColorAt(i, col.set(up ? CYAN : PINK));
    }
    packets.instanceMatrix.needsUpdate = true;
    packets.instanceColor.needsUpdate = true;
    if (checking !== lastCheck) { lastCheck = checking; bus.onCheck?.(checking); }
  }

  function aim(t) {
    const yaw = 0.55 + Math.sin(t * 0.16) * 0.28 + bus.px * 0.15;
    const pitch = 0.42 + bus.py * 0.05;
    const dist = aspect < 1 ? 33 : aspect < 1.5 ? 30 : 29;
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, 4 + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(0.6, 4.8, 0);
  }

  return {
    resize(w, h, dpr) {
      aspect = w / Math.max(1, h);
      renderer.setPixelRatio(Math.max(0.25, dpr / (low ? 2 : 2.5)));
      renderer.setSize(w, h, false);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    },
    frame(t) {
      const s = Math.floor(t * 20) / 20; // stepped motion, 20 updates a second
      aim(s);
      place(s, false);
      renderer.render(scene, camera);
    },
    still() {
      lastCheck = null;
      aim(0);
      place(0, true);
      renderer.render(scene, camera);
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      renderer.dispose();
    },
  };
}
