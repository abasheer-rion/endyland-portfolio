// In-store AI board scene (three.js). A drawing of the idea, not the real board.
// A black circuit board with red traces and white silkscreen, the compute module with its heat sink in
// the middle, network jacks, a camera connector, capacitors and mounting holes. Red signals run along
// the traces, a status light blinks, and the board turns slowly and leans toward the pointer.
// Phones get fewer signals and no shadows. shared/scene-loader.js runs the loop and handles reduced motion.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, BoxGeometry, CylinderGeometry, TorusGeometry,
  MeshStandardMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight, CanvasTexture, Sprite, SpriteMaterial,
  AdditiveBlending, ColorManagement, LinearSRGBColorSpace,
} from '../../shared/vendor/three-r186.module.min.js';

ColorManagement.enabled = false;

const BW = 1.6, BD = 1.0, BT = 0.03;   // board width, depth, thickness
const TW = 1024, TH = 640;            // silkscreen texture size
// Traces in texture pixels. Each is a polyline. Signals run along them.
const TRACES = [
  [[40, 150], [250, 150], [290, 190], [400, 190]],
  [[40, 250], [220, 250], [280, 190]],
  [[40, 380], [300, 380], [350, 330], [400, 330]],
  [[40, 470], [260, 470], [330, 400], [400, 400]],
  [[640, 210], [760, 210], [800, 170], [990, 170]],
  [[640, 300], [800, 300], [850, 350], [990, 350]],
  [[640, 400], [740, 400], [790, 450], [990, 450]],
  [[520, 120], [520, 50], [700, 50], [740, 90], [860, 90]],
  [[470, 520], [470, 590], [700, 590], [760, 530], [900, 530]],
  [[560, 520], [560, 560], [640, 560]],
  [[120, 560], [380, 560], [420, 520]],
  [[110, 80], [380, 80], [420, 120]],
];

function silkscreen() {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const g = c.getContext('2d');
  g.fillStyle = '#121212'; g.fillRect(0, 0, TW, TH);
  // Fine copper pour hatching
  g.strokeStyle = 'rgba(255,255,255,.025)'; g.lineWidth = 1;
  for (let x = -TH; x < TW; x += 10) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + TH, TH); g.stroke(); }
  // Traces
  g.strokeStyle = '#6B1B1B'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  for (const t of TRACES) { g.beginPath(); t.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
  // Vias and pads
  g.fillStyle = '#B4A06A';
  for (const t of TRACES) for (const p of [t[0], t[t.length - 1]]) { g.beginPath(); g.arc(p[0], p[1], 9, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#121212';
  for (const t of TRACES) for (const p of [t[0], t[t.length - 1]]) { g.beginPath(); g.arc(p[0], p[1], 4, 0, Math.PI * 2); g.fill(); }
  // Silkscreen
  g.strokeStyle = 'rgba(245,245,245,.75)'; g.lineWidth = 2;
  g.strokeRect(392, 112, 256, 416);
  g.strokeRect(842, 140, 150, 110); g.strokeRect(842, 300, 150, 110);
  g.strokeRect(150, 280, 90, 60);
  g.fillStyle = 'rgba(245,245,245,.8)';
  g.font = '600 26px ui-monospace, Menlo, monospace';
  g.fillText('U1', 400, 104);
  g.fillText('J1', 846, 132); g.fillText('J2', 846, 292);
  g.fillText('CAM', 150, 272);
  g.font = '600 22px ui-monospace, Menlo, monospace';
  g.fillText('NanoPi R76S', 400, 560);
  g.font = '700 34px ui-sans-serif, system-ui, sans-serif';
  g.fillText('A R G U S', 60, 620);
  g.fillStyle = '#DC2626'; g.beginPath(); g.arc(300, 608, 9, 0, Math.PI * 2); g.fill();
  const tex = new CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,220,220,1)'); gr.addColorStop(0.25, 'rgba(255,80,80,.85)'); gr.addColorStop(1, 'rgba(220,38,38,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

const toWorld = ([x, y]) => [(x / TW - 0.5) * BW, (y / TH - 0.5) * BD];

export function start({ canvas, low }) {
  const renderer = new WebGLRenderer({ canvas, antialias: !low, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 2, 0.1, 20);
  camera.position.set(0, 1.5, 1.78);
  camera.lookAt(0, -0.05, 0);

  scene.add(new HemisphereLight(0xffffff, 0x2a1010, 1.5));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(1.5, 3, 1.2);
  scene.add(key);
  const rim = new DirectionalLight(0xff6b6b, 1.2);
  rim.position.set(-2, 1, -2);
  scene.add(rim);

  const board = new Group();
  scene.add(board);
  const top = new MeshStandardMaterial({ map: silkscreen(), roughness: 0.75, metalness: 0.1 });
  const edge = new MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.9 });
  const pcb = new Mesh(new BoxGeometry(BW, BT, BD), [edge, edge, top, edge, edge, edge]);
  board.add(pcb);

  const at = (mesh, px, py, h) => { const [x, z] = toWorld([px, py]); mesh.position.set(x, BT / 2 + h / 2, z); board.add(mesh); return mesh; };
  const dark = new MeshStandardMaterial({ color: 0x262626, roughness: 0.6, metalness: 0.2 });
  const fin = new MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.45, metalness: 0.35 });
  const steel = new MeshStandardMaterial({ color: 0xc4c8d0, roughness: 0.35, metalness: 0.3 });
  const white = new MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
  const gold = new MeshStandardMaterial({ color: 0xc9b47a, roughness: 0.35, metalness: 0.4 });

  // Compute module and its heat sink
  const mw = (256 / TW) * BW * 0.92, md = (416 / TH) * BD * 0.92;
  at(new Mesh(new BoxGeometry(mw, 0.04, md), dark), 520, 320, 0.04);
  const finGeo = new BoxGeometry(mw * 0.9, 0.11, 0.012);
  for (let i = 0; i < (low ? 7 : 11); i++) {
    const f = at(new Mesh(finGeo, fin), 520, 0, 0.11);
    f.position.y += 0.04;
    f.position.z = toWorld([0, 150 + (i * 340) / ((low ? 7 : 11) - 1)])[1];
  }
  // Network jacks
  const jack = new BoxGeometry(0.24, 0.13, 0.17);
  at(new Mesh(jack, steel), 917, 195, 0.13);
  at(new Mesh(jack, steel), 917, 355, 0.13);
  // USB-C and camera connector
  at(new Mesh(new BoxGeometry(0.09, 0.035, 0.06), steel), 990, 480, 0.035);
  at(new Mesh(new BoxGeometry(0.14, 0.03, 0.05), white), 195, 310, 0.03);
  // Capacitors
  const cap = new CylinderGeometry(0.028, 0.028, 0.07, low ? 10 : 18);
  [[300, 120], [340, 120], [300, 440], [700, 470], [740, 470], [780, 240]].forEach(([x, y]) => at(new Mesh(cap, steel), x, y, 0.07));
  // Small parts
  const part = new BoxGeometry(0.035, 0.012, 0.02);
  for (let i = 0; i < (low ? 10 : 22); i++) {
    const m = at(new Mesh(part, i % 3 ? dark : white), 100 + ((i * 137) % 260), 300 + ((i * 89) % 230), 0.012);
    m.rotation.y = (i % 2) * Math.PI / 2;
  }
  // Mounting holes
  const ring = new TorusGeometry(0.03, 0.009, 8, low ? 16 : 28);
  [[30, 30], [TW - 30, 30], [30, TH - 30], [TW - 30, TH - 30]].forEach(([x, y]) => { const m = at(new Mesh(ring, gold), x, y, 0); m.rotation.x = Math.PI / 2; m.position.y = BT / 2 + 0.002; });
  // Status light
  const ledMat = new MeshBasicMaterial({ color: 0xff3b3b });
  const led = at(new Mesh(new BoxGeometry(0.03, 0.015, 0.02), ledMat), 760, 90, 0.015);
  const glow = glowTexture();
  const ledGlow = new Sprite(new SpriteMaterial({ map: glow, color: 0xff4040, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  ledGlow.scale.set(0.16, 0.16, 1);
  ledGlow.position.copy(led.position); ledGlow.position.y += 0.02;
  board.add(ledGlow);

  // Signals: glowing sprites that run along the traces.
  const paths = TRACES.map((t) => {
    const pts = t.map(toWorld);
    const segs = []; let len = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); len += l; }
    return { pts, segs, len };
  });
  const pulses = [];
  const nP = low ? 8 : 22;
  for (let i = 0; i < nP; i++) {
    const s = new Sprite(new SpriteMaterial({ map: glow, color: 0xff5050, blending: AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.set(0.07, 0.07, 1);
    board.add(s);
    pulses.push({ s, path: paths[i % paths.length], u: (i * 0.37) % 1, v: 0.18 + ((i * 7) % 5) * 0.05 });
  }
  const place = (p) => {
    let d = p.u * p.path.len, i = 0;
    while (i < p.path.segs.length - 1 && d > p.path.segs[i]) { d -= p.path.segs[i]; i++; }
    const a = p.path.pts[i], b = p.path.pts[i + 1], k = Math.min(1, d / p.path.segs[i]);
    p.s.position.set(a[0] + (b[0] - a[0]) * k, BT / 2 + 0.006, a[1] + (b[1] - a[1]) * k);
    p.s.material.opacity = Math.sin(Math.PI * Math.min(1, p.u)) * 0.95;
  };

  // Pointer and scroll
  let tx = 0, ty = 0, cx = 0, cy = 0;
  const host = canvas.parentElement;
  const onMove = (e) => {
    const r = host.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  };
  const onLeave = () => { tx = 0; ty = 0; };
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerleave', onLeave);

  let W = 1, H = 1;
  function pose(t) {
    const r = host.getBoundingClientRect();
    const sp = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
    board.rotation.y = -0.5 + Math.sin(t * 0.18) * 0.25 + sp * 0.5 + cx * 0.35;
    board.rotation.x = 0.06 + cy * 0.18;
    board.rotation.z = -0.04;
    board.position.y = Math.sin(t * 0.8) * 0.02;
    const narrow = W / H < 1.3;
    camera.position.set(0, narrow ? 1.95 : 1.5, narrow ? 2.5 : 1.78);
    camera.lookAt(0, -0.05, 0);
  }

  return {
    resize(w, h, dpr) {
      W = w; H = h;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    frame(t, dt) {
      cx += (tx - cx) * Math.min(1, dt * 4); cy += (ty - cy) * Math.min(1, dt * 4);
      for (const p of pulses) { p.u += (dt * p.v) / p.path.len * 0.6; if (p.u > 1) p.u -= 1; place(p); }
      const on = (t % 1.6) < 0.8 ? 1 : 0.25;
      ledGlow.material.opacity = on; ledMat.color.setHex(on > 0.5 ? 0xff3b3b : 0x7f1d1d);
      pose(t);
      renderer.render(scene, camera);
    },
    still() {
      for (const p of pulses) place(p);
      pose(0);
      renderer.render(scene, camera);
    },
    dispose() {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      renderer.dispose();
    },
  };
}
