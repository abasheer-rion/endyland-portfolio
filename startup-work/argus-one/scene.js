// Argus One scene: people walking past a store camera, seen the way the model sees them.
// Each person is a pose skeleton (17 body points) with a tracking box that follows a little behind,
// an ID tag and a risk bar that rises and falls. A faint floor grid sits under them.
// Drawn on a plain 2D canvas in the hero only; it scrolls away with the page. Phones get two people.
// shared/scene-loader.js runs the loop, pauses it when hidden and draws still() with reduced motion.
const TAU = Math.PI * 2;
const BONES = [[0, 1], [1, 2], [1, 3], [2, 4], [4, 6], [3, 5], [5, 7], [1, 8], [8, 9], [8, 10], [9, 11], [11, 13], [10, 12], [12, 14]];

function rng(seed) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

// Body points for one step of a walk, facing +x. h is the body height in px, ph the walk phase.
function pose(h, ph, out) {
  const sw = Math.sin(ph), sw2 = Math.sin(ph + Math.PI);
  const bob = Math.abs(Math.cos(ph)) * 0.015 * h;
  const neck = [0.02 * h, -0.8 * h + bob];
  const hip = [0, -0.47 * h + bob];
  const leg = (s, k) => {
    const a = s * 0.42, kb = Math.max(0, -Math.sin(k)) * 0.75;
    const knee = [hip[0] + Math.sin(a) * 0.245 * h, hip[1] + Math.cos(a) * 0.245 * h];
    const ank = [knee[0] + Math.sin(a - kb) * 0.235 * h, knee[1] + Math.cos(a - kb) * 0.235 * h];
    return [knee, ank];
  };
  const arm = (s) => {
    const a = -s * 0.38, sh = [neck[0], neck[1] + 0.03 * h];
    const el = [sh[0] + Math.sin(a) * 0.17 * h, sh[1] + Math.cos(a) * 0.17 * h];
    const wr = [el[0] + Math.sin(a + 0.35) * 0.16 * h, el[1] + Math.cos(a + 0.35) * 0.16 * h];
    return [sh, el, wr];
  };
  const [kL, aL] = leg(sw, ph), [kR, aR] = leg(sw2, ph + Math.PI);
  const [sL, eL, wL] = arm(sw), [sR, eR, wR] = arm(sw2);
  const head = [neck[0] + 0.03 * h, neck[1] - 0.11 * h];
  // 0 head, 1 neck, 2/3 shoulders, 4/5 elbows, 6/7 wrists, 8 hip, 9/10 hips l/r, 11/12 knees, 13/14 ankles
  const pts = [head, neck, sL, sR, eL, eR, wL, wR, hip, [hip[0] - 0.01 * h, hip[1]], [hip[0] + 0.01 * h, hip[1]], kL, kR, aL, aR];
  for (let i = 0; i < pts.length; i++) { out[i * 2] = pts[i][0]; out[i * 2 + 1] = pts[i][1]; }
  return out;
}

export function start({ canvas, low }) {
  const g = canvas.getContext('2d');
  const R = rng(26);
  let W = 0, H = 0, D = 1;
  const hero = document.querySelector('.proj-hero');
  const n = low ? 2 : 4;
  const people = Array.from({ length: n }, (_, i) => ({
    id: 3 + Math.floor(R() * 40),
    lane: i / n,                       // 0 far, 1 near
    x: R(), dir: R() < 0.5 ? -1 : 1,
    ph: R() * TAU,
    risk: 0.2 + R() * 0.3, riskT: R(), riskW: 0.15 + R() * 0.2,
    bx: null,
  }));
  const pts = new Float32Array(30);

  function draw(t, dt, settled) {
    g.setTransform(D, 0, 0, D, 0, 0);
    g.clearRect(0, 0, W, H);
    const r = hero ? hero.getBoundingClientRect() : { top: 0, bottom: H };
    const top = Math.max(r.top, 60), bot = r.bottom;
    if (bot - top < 120 || top > H) return;
    const floorY = Math.min(bot - 10, top + (bot - top) * 0.98);
    // Floor grid in perspective.
    g.strokeStyle = 'rgba(26,26,26,.06)';
    g.lineWidth = 1;
    g.beginPath();
    const vx = W * 0.5, vy = floorY - (bot - top) * 0.9;
    for (let i = -12; i <= 12; i++) { const x = vx + (i / 12) * W * 1.6; g.moveTo(x, floorY); g.lineTo(x + (vx - x) * 0.75, floorY + (vy - floorY) * 0.75); }
    for (let k = 0; k < 6; k++) { const y = floorY - (floorY - vy) * 0.25 * (1 - Math.pow(0.62, k)); g.moveTo(0, y); g.lineTo(W, y); }
    g.stroke();

    for (const p of people) {
      const near = 0.55 + p.lane * 0.45;
      const h = Math.min(260, (bot - top) * 0.36) * near * (W < 700 ? 0.7 : 1);
      const speed = (26 + 22 * near) * (W < 700 ? 0.7 : 1);
      if (!settled) {
        p.x += (p.dir * speed * dt) / W;
        p.ph += dt * speed / (h * 0.2);
        if (p.x > 1.12) { p.x = -0.12; p.id = 3 + Math.floor(R() * 40); p.risk = 0.2; }
        if (p.x < -0.12) { p.x = 1.12; p.id = 3 + Math.floor(R() * 40); p.risk = 0.2; }
        p.riskT += dt * p.riskW;
      }
      const target = 0.25 + 0.6 * (0.5 + 0.5 * Math.sin(p.riskT * TAU + p.lane * 3));
      p.risk += (target - p.risk) * Math.min(1, dt * 0.8);
      const fx = p.x * W, fy = floorY - (1 - p.lane) * (bot - top) * 0.16;
      pose(h, p.ph, pts);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let i = 0; i < 15; i++) {
        pts[i * 2] = fx + pts[i * 2] * p.dir; pts[i * 2 + 1] = fy + pts[i * 2 + 1];
        x0 = Math.min(x0, pts[i * 2]); x1 = Math.max(x1, pts[i * 2]); y0 = Math.min(y0, pts[i * 2 + 1]); y1 = Math.max(y1, pts[i * 2 + 1]);
      }
      const pad = h * 0.08;
      const box = [x0 - pad, y0 - pad * 1.2, x1 + pad, y1 + pad * 0.5];
      if (!p.bx || settled) p.bx = box.slice();
      else for (let i = 0; i < 4; i++) p.bx[i] += (box[i] - p.bx[i]) * Math.min(1, dt * 7);
      const a = 0.5 + p.lane * 0.5;
      // Bones
      g.strokeStyle = `rgba(26,26,26,${(0.2 * a).toFixed(3)})`;
      g.lineWidth = Math.max(1.2, h / 90);
      g.lineCap = 'round';
      g.beginPath();
      for (const [i, j] of BONES) { g.moveTo(pts[i * 2], pts[i * 2 + 1]); g.lineTo(pts[j * 2], pts[j * 2 + 1]); }
      g.stroke();
      g.beginPath(); g.arc(pts[0], pts[1], h * 0.055, 0, TAU); g.stroke();
      // Points
      g.fillStyle = `rgba(220,38,38,${(0.5 * a).toFixed(3)})`;
      for (let i = 1; i < 15; i++) { g.beginPath(); g.arc(pts[i * 2], pts[i * 2 + 1], Math.max(1.6, h / 85), 0, TAU); g.fill(); }
      // Tracking box, dashed
      const [bx0, by0, bx1, by1] = p.bx;
      const col = p.risk > 0.7 ? '220,38,38' : p.risk > 0.45 ? '217,119,6' : '26,26,26';
      g.setLineDash([5, 4]);
      g.strokeStyle = `rgba(${col},${(0.32 * a).toFixed(3)})`;
      g.lineWidth = 1;
      g.strokeRect(bx0, by0, bx1 - bx0, by1 - by0);
      g.setLineDash([]);
      // ID tag and risk bar
      g.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
      g.fillStyle = `rgba(26,26,26,${(0.42 * a).toFixed(3)})`;
      g.fillText(`ID ${String(p.id).padStart(2, '0')}`, bx0, by0 - 14);
      const bw = Math.max(36, (bx1 - bx0) * 0.9);
      g.fillStyle = `rgba(26,26,26,${(0.08 * a).toFixed(3)})`;
      g.fillRect(bx0, by0 - 9, bw, 4);
      g.fillStyle = `rgba(${col},${(0.55 * a).toFixed(3)})`;
      g.fillRect(bx0, by0 - 9, bw * p.risk, 4);
    }
  }

  return {
    resize(w, h, dpr) { W = w; H = h; D = dpr; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); },
    frame(t, dt) { draw(t, dt, false); },
    still() { draw(0, 0.016, true); },
  };
}
