// County records API scene: the RION sky plus three streams of records (property, owner, records) that curve in
// from the left and merge into one point, the API. Some lookups loop once around the cache ring there before they
// leave as one bright beam to the right. Plain 2D canvas, kept faint (45% alpha at most) behind the text.
import { createSky, fit } from '../rion/sky.js';

const rand = (a, b) => a + Math.random() * (b - a);
const ease = (k) => k * k * (3 - 2 * k);

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  let W = 1, H = 1, t = 0;
  let M = [0, 0], R = 30, src = [];
  const sky = createSky({ low, home: () => M[0] ? [M[0], M[1]] : null, glowSize: 0.6, follow: 0.4 });

  const parts = Array.from({ length: low ? 26 : 54 }, () => fresh(true));
  function fresh(spread) {
    return { s: Math.floor(Math.random() * 3), k: spread ? Math.random() * 1.6 : 0, v: rand(0.18, 0.28), cache: Math.random() < 0.35, ph: rand(0, 6.28) };
  }
  // A point on stream s at progress k: 0..1 along the curve to M, then (cache) a lap of the ring, then out to the right.
  function at(p) {
    const [sx, sy] = src[p.s];
    if (p.k < 1) {
      const u = ease(p.k), cx = W * 0.32, cy = sy, iu = 1 - u;
      return [iu * iu * sx + 2 * iu * u * cx + u * u * M[0], iu * iu * sy + 2 * iu * u * cy + u * u * M[1], 'in'];
    }
    let k = p.k - 1;
    if (p.cache) {
      if (k < 0.5) { const a = Math.PI + (k / 0.5) * Math.PI * 2; return [M[0] + R + Math.cos(a) * R, M[1] + Math.sin(a) * R, 'cache']; }
      k -= 0.5;
    }
    return [M[0] + k * (W - M[0] + 40) * 1.6, M[1], 'out'];
  }

  function layout() {
    const narrow = W < 760;
    M = narrow ? [W * 0.72, H * 0.4] : [W * 0.58, H * 0.52];
    R = narrow ? 18 : 30;
    const ys = narrow ? [0.25, 0.4, 0.55] : [0.28, 0.52, 0.76];
    src = ys.map((y) => [-20, H * y]);
  }

  function draw(dt, still) {
    t += dt;
    g.clearRect(0, 0, W, H);
    sky.draw(g, dt, { still, alpha: 0.22 });

    // the three paths and the beam out
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 1; g.globalAlpha = 0.11;
    g.beginPath();
    for (const [sx, sy] of src) { g.moveTo(sx, sy); g.quadraticCurveTo(W * 0.32, sy, M[0], M[1]); }
    g.moveTo(M[0] + R * 2, M[1]); g.lineTo(W, M[1]);
    g.stroke();
    // the cache ring
    g.strokeStyle = '#FF3131'; g.globalAlpha = 0.35; g.lineWidth = 1.2;
    g.setLineDash([4, 7]); g.lineDashOffset = still ? 0 : -t * 14;
    g.beginPath(); g.arc(M[0] + R, M[1], R, 0, Math.PI * 2); g.stroke();
    g.setLineDash([]);

    for (const p of parts) {
      if (!still) {
        p.k += dt * p.v;
        const end = 1 + (p.cache ? 0.5 : 0) + 0.7;
        if (p.k > end) Object.assign(p, fresh(false));
      }
      const [x, y, phase] = at(p);
      if (x > W + 10) continue;
      g.globalAlpha = phase === 'in' ? 0.3 + 0.15 * ease(Math.min(1, p.k)) : 0.45;
      g.fillStyle = phase === 'out' ? '#FFFFFF' : '#FF3131';
      const r = phase === 'in' ? 2.6 : 3;
      g.fillRect(x - r / 2, y - r / 2, r, r);
    }
    // the merge point
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.35;
    const gs = R * 5;
    g.drawImage(sky.sprite, M[0] + R - gs / 2, M[1] - gs / 2, gs, gs);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
  }

  return {
    resize(w, h, d) { W = w; H = h; fit(canvas, g, w, h, d); layout(); sky.resize(w, h); },
    frame(_t, dt) { draw(dt, false); },
    still() { draw(0, true); },
  };
}
