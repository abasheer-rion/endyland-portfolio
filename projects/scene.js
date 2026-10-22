// Projects tab: the arcade world. Decoration only, everything it shows is also in the HTML.
// Layers, back to front: pixel stars, a pixel moon, voxel mountains that scroll toward you,
// a marching formation of voxel invaders, spinning coins, the player ship, shots and pixel explosions.
// It draws at about a third of screen resolution and the canvas is scaled up with hard edges.
// Scroll: the camera dives from the sky to the valley floor, the invaders step down one row for each
// cabinet you reach, and at the bottom of the page the whole wave blows up (stage clear).
// Hover or focus a cabinet: the invaders flash its color and the ship fires a volley.
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import {
  WebGLRenderer, Scene, PerspectiveCamera, InstancedMesh, BoxGeometry, MeshLambertMaterial, MeshBasicMaterial,
  Object3D, Color, HemisphereLight, DirectionalLight, Fog, Group, Points, PointsMaterial, BufferGeometry,
  Float32BufferAttribute, DynamicDrawUsage, Matrix4,
} from '../shared/vendor/three-r186.module.min.js';
import { bus } from './state.js';

const NIGHT = '#0B0420';
const PINK = '#FF4FD8', CYAN = '#3DF2FF', YELLOW = '#FFE14D';

// Invader sprites, two frames each. '#' is a voxel.
const SPRITES = [
  [['...####...', '.########.', '##.####.##', '##########', '.#.#..#.#.', '#........#'],
    ['...####...', '.########.', '##.####.##', '##########', '..#.##.#..', '.#......#.']],
  [['.#.....#.', '..#...#..', '.#######.', '##.###.##', '#########', '#.#...#.#', '...#.#...'],
    ['.#.....#.', '#.#...#.#', '#########', '##.###.##', '.#######.', '.#.....#.', '#.......#']],
  [['..####..', '.######.', '##.##.##', '########', '########', '.#.##.#.', '#..##..#', '.#....#.'],
    ['..####..', '.######.', '##.##.##', '########', '########', '#.#..#.#', '.#.##.#.', '#......#']],
];
const ROW_COLORS = [CYAN, PINK, YELLOW];
// Player ship, seen from above. c cyan, p pink, y yellow.
const SHIP = ['....p....', '...ccc...', '.y.cpc.y.', 'ccccccccc', 'cc.y.y.cc'];
const COIN = ['..###..', '.#####.', '##+#+##', '##+#+##', '##+#+##', '.#####.', '..###..'];

const cells = (rows) => {
  const out = [], h = rows.length, w = rows[0].length;
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') out.push([x - (w - 1) / 2, (h - 1) / 2 - y, ch]); }));
  return out;
};
const hash = (x, z) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (x) => x * x * (3 - 2 * x);

// Setup is split into small steps with pauses between them, so phones never freeze while it builds.
const pause = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise((r) => setTimeout(r, 0)));

export async function start({ canvas, low, dpr: dpr0 }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: low ? 'low-power' : 'default' });
  renderer.setClearColor(NIGHT, 1);
  const scene = new Scene();
  scene.fog = new Fog(NIGHT, 22, 64);
  const camera = new PerspectiveCamera(48, 1, 0.5, 140);
  scene.add(new HemisphereLight('#8C6BFF', '#2A0838', 1.5));
  const sun = new DirectionalLight('#FFFFFF', 1.9);
  sun.position.set(-6, 10, 7);
  scene.add(sun);

  const o = new Object3D(), m4 = new Matrix4(), zero = new Matrix4().makeScale(0, 0, 0), col = new Color();
  const disposables = [];
  const keep = (...xs) => { disposables.push(...xs); return xs[0]; };
  const unit = keep(new BoxGeometry(1, 1, 1));

  // ---------- Stars: two layers, one blinks in steps ----------
  const starLayer = (n, seed, size, color) => {
    const pos = [];
    for (let i = 0; i < n; i++) {
      pos.push((hash(i, seed) - 0.5) * 170, 4 + hash(seed, i) * 52, -70 - hash(i + 7, seed) * 20);
    }
    const g = keep(new BufferGeometry());
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    const pts = new Points(g, keep(new PointsMaterial({ color, size, sizeAttenuation: false, fog: false })));
    scene.add(pts);
    return pts;
  };
  starLayer(low ? 90 : 220, 1, 1, '#B8AEF0');
  const blinkStars = starLayer(low ? 50 : 110, 2, 2, CYAN);

  await pause();
  // ---------- Pixel moon ----------
  {
    const R = 8, list = [];
    for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) if (x * x + y * y <= R * R + 2) list.push([x, y]);
    const moon = new InstancedMesh(unit, keep(new MeshBasicMaterial({ fog: false })), list.length);
    list.forEach(([x, y], i) => {
      o.position.set(x, y, 0); o.scale.set(1, 1, 1); o.updateMatrix(); moon.setMatrixAt(i, o.matrix);
      const crater = hash(x + 40, y + 40) > 0.86 && x * x + y * y < 40;
      const band = y < -2 && (y & 1) === 0; // stripes on the lower half
      moon.setColorAt(i, col.set(band ? '#2A1470' : crater ? '#22A8C4' : x + y > 6 ? '#9FF8FF' : CYAN));
    });
    moon.position.set(24, 25, -86); moon.scale.setScalar(1.3);
    scene.add(moon);
  }

  await pause();
  // ---------- Voxel terrain: a valley between stepped mountains, scrolling toward the camera ----------
  const TW = low ? 30 : 46, TD = low ? 30 : 44, NEAR_Z = 16;
  const terr = new InstancedMesh(unit, keep(new MeshLambertMaterial()), TW * TD);
  terr.instanceMatrix.setUsage(DynamicDrawUsage);
  const terrGroup = new Group();
  terrGroup.add(terr); scene.add(terrGroup);
  const LEVELS = ['#2B1470', '#3B1A8A', '#5422B4', '#7A2BD8', '#B23BE0', PINK, '#FF8BE6', CYAN, '#B9FBFF'];
  const heightAt = (x, z) => {
    const d = Math.abs(x);
    if (d < 6) return 0;
    const n = Math.sin(z * 0.23 + x * 0.61) * 0.5 + Math.sin(z * 0.11 - x * 0.37) * 0.8 + hash(x, z) * 1.3;
    return Math.max(0, Math.min(LEVELS.length - 1, Math.floor((d - 5) * 0.62 + n)));
  };
  let rowShift = null;
  const buildTerrain = (k) => {
    let i = 0;
    for (let j = 0; j < TD; j++) {
      const wz = j - k, z = NEAR_Z - TD + 1 + j;
      for (let c = 0; c < TW; c++) {
        const x = c - (TW - 1) / 2, xi = Math.round(x), h = heightAt(xi, wz);
        const sy = h === 0 ? 0.4 : h + 0.4;
        o.position.set(x, sy / 2 - 0.4, z); o.scale.set(1, sy, 1); o.updateMatrix();
        terr.setMatrixAt(i, o.matrix);
        let c0;
        if (h > 0) c0 = LEVELS[h];
        else if (Math.abs(xi) < 1 && ((wz % 4) + 4) % 4 < 2) c0 = PINK; // dashed center line
        else if (Math.abs(xi) === 5) c0 = '#5422B4';                  // valley edge
        else c0 = ((xi + wz) & 1) ? '#1A0B45' : '#22105A';           // checker floor
        terr.setColorAt(i, col.set(c0));
        i++;
      }
    }
    terr.instanceMatrix.needsUpdate = true;
    terr.instanceColor.needsUpdate = true;
  };
  let travel = 0;
  const updateTerrain = () => {
    const k = Math.floor(travel);
    terrGroup.position.z = travel - k;
    if (k !== rowShift) { rowShift = k; buildTerrain(k); }
  };

  await pause();
  // ---------- Invaders: one group per row, two meshes per row (one per animation frame) ----------
  const ROWS = low ? 2 : 3, COLS = low ? 4 : 5, VOX = 0.38, SP = 4.6, RS = 3.4;
  const formation = new Group();
  scene.add(formation);
  const rows = [], invaders = [];
  const invGeo = keep(new BoxGeometry(VOX, VOX, VOX * 1.8));
  for (let r = 0; r < ROWS; r++) {
    const type = SPRITES[r % SPRITES.length], color = ROW_COLORS[r % ROW_COLORS.length];
    const mat = keep(new MeshLambertMaterial({ emissive: color, emissiveIntensity: 0.35 }));
    const g = new Group(); g.position.y = -r * RS; formation.add(g);
    const frames = type.map((rowsBits) => {
      const cs = cells(rowsBits);
      const mesh = new InstancedMesh(invGeo, mat, cs.length * COLS);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      g.add(mesh);
      return { cs, mesh };
    });
    const row = { g, mat, color: new Color(color), frames };
    rows.push(row);
    for (let c = 0; c < COLS; c++) {
      const inv = { row, r, c, bx: (c - (COLS - 1) / 2) * SP, alive: true, respawn: 0, color };
      invaders.push(inv);
      showInvader(inv, true);
      frames.forEach((f) => f.cs.forEach((_, i) => f.mesh.setColorAt(c * f.cs.length + i, col.set(color))));
    }
  }
  function showInvader(inv, on) {
    for (const f of inv.row.frames) {
      const n = f.cs.length;
      for (let i = 0; i < n; i++) {
        if (on) {
          const [x, y] = f.cs[i];
          o.position.set(inv.bx + x * VOX, y * VOX, 0); o.scale.set(1, 1, 1); o.updateMatrix();
          f.mesh.setMatrixAt(inv.c * n + i, o.matrix);
        } else f.mesh.setMatrixAt(inv.c * n + i, zero);
      }
      f.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  const STEP = 0.42, MARCH = 8, AMP = 0.55;
  const marchX = (k) => { const m = ((k % (2 * MARCH)) + 2 * MARCH) % (2 * MARCH); return ((m < MARCH ? m : 2 * MARCH - m) - MARCH / 2) * AMP; };
  let formY = 11, lastStep = -1, fx = 0;
  const FORM_Z = -12;
  const invWorld = (inv) => [formation.position.x + inv.row.g.position.x + inv.bx, formation.position.y + inv.row.g.position.y, FORM_Z];

  // ---------- Ship ----------
  const SV = 0.3, shipCells = cells(SHIP);
  const ship = new Group();
  const shipMesh = new InstancedMesh(keep(new BoxGeometry(SV, SV * 1.4, SV)), keep(new MeshLambertMaterial({ emissive: '#2A0838' })), shipCells.length);
  shipCells.forEach(([x, y, ch], i) => {
    o.position.set(x * SV, 0, -y * SV); o.scale.set(1, 1, 1); o.updateMatrix(); shipMesh.setMatrixAt(i, o.matrix);
    shipMesh.setColorAt(i, col.set(ch === 'p' ? PINK : ch === 'y' ? YELLOW : CYAN));
  });
  const flameMat = keep(new MeshBasicMaterial({ color: YELLOW }));
  const flame = new InstancedMesh(unit, flameMat, 2);
  [-0.6, 0.6].forEach((x, i) => { o.position.set(x, 0, 1.0); o.scale.set(0.3, 0.3, 0.45); o.updateMatrix(); flame.setMatrixAt(i, o.matrix); });
  ship.add(shipMesh, flame);
  const SHIP_Y = 1.5, SHIP_Z = 7;
  ship.position.set(0, SHIP_Y, SHIP_Z);
  scene.add(ship);
  let shipX = 0, shipV = 0, autoX = 0, autoAt = 0;

  // ---------- Shots ----------
  const BMAX = 14, shots = [];
  const shotMesh = new InstancedMesh(unit, keep(new MeshBasicMaterial({ color: YELLOW, fog: false })), BMAX);
  shotMesh.instanceMatrix.setUsage(DynamicDrawUsage);
  shotMesh.count = 0;
  scene.add(shotMesh);
  for (let i = 0; i < BMAX; i++) shots.push({ on: false, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, left: 0, target: null });

  await pause();
  // ---------- Pixel explosions ----------
  const PMAX = low ? 90 : 240;
  const parts = new InstancedMesh(unit, keep(new MeshBasicMaterial()), PMAX);
  parts.instanceMatrix.setUsage(DynamicDrawUsage);
  for (let i = 0; i < PMAX; i++) parts.setColorAt(i, col.set('#FFFFFF'));
  parts.count = 0;
  scene.add(parts);
  const P = { x: new Float32Array(PMAX), y: new Float32Array(PMAX), z: new Float32Array(PMAX), vx: new Float32Array(PMAX),
    vy: new Float32Array(PMAX), vz: new Float32Array(PMAX), life: new Float32Array(PMAX), max: new Float32Array(PMAX),
    r: new Float32Array(PMAX), g: new Float32Array(PMAX), b: new Float32Array(PMAX) };
  let pn = 0, seed = 1;
  const rnd = () => hash(seed++, 99);
  const burst = (x, y, z, color, n, speed = 7) => {
    col.set(color);
    for (let k = 0; k < n && pn < PMAX; k++, pn++) {
      const a = rnd() * Math.PI * 2, e = (rnd() - 0.3) * 1.6, s = speed * (0.4 + rnd() * 0.8);
      P.x[pn] = x; P.y[pn] = y; P.z[pn] = z;
      P.vx[pn] = Math.cos(a) * s; P.vy[pn] = e * s; P.vz[pn] = Math.sin(a) * s * 0.6;
      P.life[pn] = P.max[pn] = 0.6 + rnd() * 0.7;
      const white = rnd() < 0.2;
      P.r[pn] = white ? 1 : col.r; P.g[pn] = white ? 1 : col.g; P.b[pn] = white ? 1 : col.b;
    }
  };
  const updateParts = (dt) => {
    for (let i = 0; i < pn; i++) {
      P.life[i] -= dt;
      if (P.life[i] <= 0) {
        pn--;
        for (const key in P) P[key][i] = P[key][pn];
        i--; continue;
      }
      P.vy[i] -= 14 * dt;
      P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt;
      if (P.y[i] < 0.1) { P.y[i] = 0.1; P.vy[i] *= -0.4; }
      const s = (Math.ceil((P.life[i] / P.max[i]) * 3) / 3) * 0.34; // shrinks in 3 steps
      o.position.set(P.x[i], P.y[i], P.z[i]); o.scale.set(s, s, s); o.updateMatrix();
      parts.setMatrixAt(i, o.matrix);
      parts.setColorAt(i, col.setRGB(P.r[i], P.g[i], P.b[i]));
    }
    parts.count = pn;
    parts.instanceMatrix.needsUpdate = true;
    parts.instanceColor.needsUpdate = true;
  };

  // ---------- Coins ----------
  const coinCells = cells(COIN), coinMat = keep(new MeshLambertMaterial({ emissive: '#7A5A00', emissiveIntensity: 1 }));
  const coinGeo = keep(new BoxGeometry(0.22, 0.22, 0.22));
  const coins = [];
  for (let k = 0; k < (low ? 3 : 6); k++) {
    const mesh = new InstancedMesh(coinGeo, coinMat, coinCells.length);
    coinCells.forEach(([x, y, ch], i) => {
      o.position.set(x * 0.22, y * 0.22, 0); o.scale.set(1, 1, 1); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, col.set(ch === '+' ? '#FFF6B0' : YELLOW));
    });
    scene.add(mesh);
    coins.push({ mesh, x: 0, z: 0, ph: k * 1.7 });
  }
  const placeCoin = (cn, z) => { cn.x = Math.round((rnd() - 0.5) * 8); cn.z = z; };
  coins.forEach((cn, k) => placeCoin(cn, NEAR_Z - 8 - k * (TD / coins.length)));

  await pause();
  // ---------- Firing and hits ----------
  let pendingShots = 0, nextShot = 0, lastFire = bus.fire, lastHoverAt = bus.hoverAt, autoFireAt = 1.2;
  let cleared = false, clearQueue = [], clearAt = 0;
  const fire = () => {
    const s = shots.find((b) => !b.on);
    if (!s) return;
    // Aim at the lowest live invader in the ship's column, or straight ahead.
    let best = null, bd = 2.6;
    for (const inv of invaders) {
      if (!inv.alive) continue;
      const [x] = invWorld(inv), d = Math.abs(x - shipX);
      if (d < bd - 0.01 || (best && Math.abs(d - bd) < 0.01 && inv.r > best.r)) { best = inv; bd = d; }
    }
    const [tx, ty, tz] = best ? invWorld(best) : [shipX, formY - RS, FORM_Z];
    const sx = shipX, sy = SHIP_Y + 0.3, sz = SHIP_Z - 1;
    const dx = tx - sx, dy = ty - sy, dz = tz - sz, len = Math.hypot(dx, dy, dz);
    Object.assign(s, { on: true, x: sx, y: sy, z: sz, dx: dx / len, dy: dy / len, dz: dz / len, left: len, target: best });
  };
  const kill = (inv, scored) => {
    if (!inv.alive) return;
    inv.alive = false;
    inv.respawn = (clock + 3 + rnd() * 4);
    showInvader(inv, false);
    const [x, y, z] = invWorld(inv);
    burst(x, y, z, inv.color, low ? 14 : 26);
    if (scored) bus.onKill?.();
  };
  const updateShots = (dt) => {
    let n = 0;
    for (const s of shots) {
      if (!s.on) continue;
      const step = 46 * dt;
      s.x += s.dx * step; s.y += s.dy * step; s.z += s.dz * step; s.left -= step;
      if (s.left <= 0) {
        s.on = false;
        if (s.target && s.target.alive && Math.abs(invWorld(s.target)[0] - s.x) < 1.9) kill(s.target, true);
        continue;
      }
      o.position.set(s.x, s.y, s.z); o.scale.set(0.16, 0.16, 1.1);
      o.lookAt(s.x + s.dx, s.y + s.dy, s.z + s.dz); o.updateMatrix();
      o.rotation.set(0, 0, 0);
      shotMesh.setMatrixAt(n++, o.matrix);
    }
    shotMesh.count = n;
    shotMesh.instanceMatrix.needsUpdate = true;
  };

  // ---------- Camera and layout ----------
  let W = 1, H = 1, sp = bus.p, clock = 0, narrow = false;
  const hoverColor = new Color();
  const placeCamera = () => {
    const e = smooth(sp);
    const back = narrow ? 13 : 0;
    const t = performance.now() - bus.pt < 3000 ? 1 : 0;
    camera.position.set(bus.px * 0.9 * t, lerp(12.5, 5.8, e) - bus.py * 0.5 * t + back * 0.35, lerp(24, 19.5, e) + back);
    camera.lookAt(0, lerp(7, 4.6, e), -14);
  };

  // One step of the world. calm = the still frame for reduced motion.
  const step = (t, dt, calm) => {
    clock = t;
    sp = calm ? bus.p : lerp(sp, bus.p, Math.min(1, dt * 3));
    const e = smooth(sp);
    const lit = bus.hover >= 0;

    // Terrain speeds up as you scroll, and when a cabinet is lit.
    if (!calm) travel += dt * (2.2 + e * 6 + (lit ? 3 : 0));
    updateTerrain();
    blinkStars.visible = calm || Math.floor(t * 2.5) % 3 !== 0;

    // Invaders: rows march in steps, one after another, and swap frames on every step.
    const wide = W / H > 1.15;
    fx = wide ? lerp(12.5, 0, e) : 0;
    const k0 = calm ? 0 : Math.floor(t / STEP);
    if (k0 !== lastStep) {
      lastStep = k0;
      const want = 11.5 - Math.min(3, bus.stage) * 1.3;
      formY += Math.sign(want - formY) * Math.min(0.5, Math.abs(want - formY));
    }
    if (calm) formY = 11.5 - Math.min(3, bus.stage) * 1.3;
    formation.position.set(fx, formY, FORM_Z);
    rows.forEach((row, r) => {
      const k = calm ? 0 : Math.floor((t - r * 0.08) / STEP);
      row.g.position.x = marchX(k);
      row.frames[0].mesh.visible = (k & 1) === 0;
      row.frames[1].mesh.visible = (k & 1) === 1;
      // Lit cabinet: the wave flashes that cabinet's color, then glows with it.
      if (lit) {
        const since = (performance.now() - bus.hoverAt) / 1000;
        hoverColor.set(bus.hoverColor);
        row.mat.emissive.copy(hoverColor);
        row.mat.emissiveIntensity = since < 0.6 && !calm ? (Math.floor(since / 0.1) % 2 ? 1.1 : 0.15) : 0.55;
      } else { row.mat.emissive.copy(row.color); row.mat.emissiveIntensity = 0.35; }
    });

    // Ship: follows the mouse when it moves, otherwise flies on its own.
    const steering = performance.now() - bus.pt < 2500;
    if (!steering && t > autoAt) {
      autoAt = t + 1.4 + rnd() * 1.2;
      const live = invaders.filter((i) => i.alive);
      autoX = live.length ? invWorld(live[Math.floor(rnd() * live.length)])[0] : (rnd() - 0.5) * 8;
    }
    const goal = Math.max(-7, Math.min(7, steering ? bus.px * 8 : autoX));
    if (calm) { shipX = 0; shipV = 0; }
    else {
      const v = Math.max(-9, Math.min(9, (goal - shipX) * 4));
      shipV = v; shipX += v * dt;
    }
    ship.position.set(shipX, SHIP_Y + (calm ? 0 : Math.floor(t * 4) % 2) * 0.08, SHIP_Z);
    ship.rotation.z = -Math.round(shipV / 3) * 0.12;
    flame.visible = calm || Math.floor(t * 14) % 2 === 0;
    flameMat.color.set(Math.floor(t * 7) % 2 ? PINK : YELLOW);

    // Coins drift toward you with the ground and spin in steps.
    for (const cn of coins) {
      if (!calm) cn.z += dt * (2.2 + e * 6 + (lit ? 3 : 0));
      if (cn.z > NEAR_Z) placeCoin(cn, NEAR_Z - TD + 4);
      if (!calm && Math.abs(cn.z - SHIP_Z) < 0.7 && Math.abs(cn.x - shipX) < 1.2) {
        burst(cn.x, SHIP_Y + 0.6, cn.z, YELLOW, low ? 8 : 14, 5);
        bus.onCoin?.();
        placeCoin(cn, NEAR_Z - TD + 4);
      }
      cn.mesh.position.set(cn.x, 1.6 + (calm ? 0 : Math.floor((t + cn.ph) * 3) % 2) * 0.15, cn.z);
      cn.mesh.rotation.y = calm ? 0.4 : Math.floor((t * 1.6 + cn.ph) * 8) / 8 * Math.PI;
    }

    if (!calm) {
      // Shots: the ship fires on its own now and then, on clicks, and when a cabinet lights up.
      if (bus.fire !== lastFire) { pendingShots += Math.min(6, bus.fire - lastFire); lastFire = bus.fire; }
      if (bus.hoverAt !== lastHoverAt) { lastHoverAt = bus.hoverAt; if (bus.hover >= 0) pendingShots += 3; }
      if (t > autoFireAt) { pendingShots++; autoFireAt = t + (low ? 1.5 : 0.95) + rnd() * 0.6; }
      if (pendingShots > 0 && t > nextShot) { fire(); pendingShots--; nextShot = t + 0.12; }
      updateShots(dt);

      // Stage clear at the bottom of the page: the whole wave blows up, then comes back when you scroll up.
      if (!cleared && bus.p > 0.97) { cleared = true; clearQueue = invaders.filter((i) => i.alive); clearAt = t; }
      if (cleared && clearQueue.length && t > clearAt) { kill(clearQueue.shift(), false); clearAt = t + 0.07; }
      if (cleared && bus.p < 0.85) {
        cleared = false; clearQueue = [];
        invaders.forEach((inv, i) => { if (!inv.alive) inv.respawn = t + i * 0.06; });
      }
      if (!cleared) {
        for (const inv of invaders) {
          if (inv.alive || t < inv.respawn) continue;
          inv.alive = true; showInvader(inv, true);
          const [x, y, z] = invWorld(inv);
          burst(x, y, z, '#FFFFFF', low ? 4 : 8, 3);
        }
      }
      updateParts(dt);
    } else {
      shotMesh.count = 0; parts.count = 0;
    }
    placeCamera();
  };

  // Compile the shaders ahead of the first frame, without blocking the page where the browser allows it.
  await pause();
  try { await renderer.compileAsync(scene, camera); } catch { /* the first frame compiles them instead */ }
  await pause();

  return {
    resize(w, h, dpr) {
      W = w; H = h; narrow = w / h < 0.9;
      // About one buffer pixel per 3 CSS pixels: real chunky pixels, and very cheap to draw.
      const chunk = low ? 0.34 : 0.32;
      renderer.setPixelRatio(chunk * Math.min(1, dpr / (dpr0 || 1)));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = narrow ? 64 : 48;
      camera.updateProjectionMatrix();
    },
    frame(t, dt) { step(t, dt, false); renderer.render(scene, camera); },
    still() { step(0, 0, true); renderer.render(scene, camera); },
    dispose() {
      disposables.forEach((d) => d.dispose?.());
      [terr, shotMesh, parts, shipMesh, flame, ...coins.map((c) => c.mesh), ...rows.flatMap((r) => r.frames.map((f) => f.mesh))].forEach((m) => m.dispose?.());
      renderer.dispose();
    },
  };
}
