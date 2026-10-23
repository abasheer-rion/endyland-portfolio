// YoTummy seller map. A plain 2D canvas, started by main.js through mountScene (webgl: false).
// Pins drop onto a little street map, then group into orange bubbles with a count, like the seller map
// built for yotummy.com. Pointing at a bubble (or tapping it) splits it back into pins.
// Reduced motion: one still frame with the bubbles formed.

const ORANGE = '#FF7600', ORANGE2 = '#F5581B', INK = '#2E241F', SUN = '#FFC93C';

// Seeded random, so the map looks the same on every visit.
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

export function start(ctx) {
  const { canvas } = ctx;
  const g = canvas.getContext('2d');
  const rand = rng(7);
  // Neighborhoods: pins gather around these points (in 0..1 map space).
  const hoods = [[0.24, 0.3, 7], [0.7, 0.26, 5], [0.5, 0.62, 8], [0.18, 0.75, 4], [0.84, 0.72, 5]];
  const pins = [];
  hoods.forEach(([hx, hy, n], h) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, d = 0.03 + rand() * 0.075;
      pins.push({ hx: hx + Math.cos(a) * d, hy: hy + Math.sin(a) * d * 1.15, h, delay: 0.15 + pins.length * 0.05, x: 0, y: 0 });
    }
  });
  const groups = hoods.map(() => ({ k: 0, target: 0, cx: 0, cy: 0, n: 0, hot: 0 }));
  pins.forEach((p) => { groups[p.h].n++; });
  // Fixed street layout in map space.
  const roads = [];
  for (let i = 0; i < 4; i++) roads.push([0, 0.12 + i * 0.27 + rand() * 0.04, 1, 0.1 + i * 0.27 + rand() * 0.06]);
  for (let i = 0; i < 4; i++) roads.push([0.1 + i * 0.27 + rand() * 0.05, 0, 0.12 + i * 0.27 + rand() * 0.03, 1]);

  let W = 0, H = 0, dpr = 1, ptr = null, tapUntil = 0, now = 0;
  const DROP_END = 0.15 + pins.length * 0.05 + 0.7;

  const toLocal = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') ptr = toLocal(e); });
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') ptr = null; });
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { ptr = toLocal(e); tapUntil = now + 2.6; } });

  function layout() {
    groups.forEach((gr) => { gr.cx = 0; gr.cy = 0; });
    for (const p of pins) { groups[p.h].cx += p.hx * W; groups[p.h].cy += p.hy * H; }
    groups.forEach((gr) => { gr.cx /= gr.n; gr.cy /= gr.n; });
  }

  function drawMap() {
    g.fillStyle = '#F7EDE2'; g.fillRect(0, 0, W, H);
    // A park and a pond.
    g.fillStyle = '#DCEBC9';
    g.beginPath(); g.ellipse(W * 0.6, H * 0.43, W * 0.11, H * 0.08, -0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#CFE3F0';
    g.beginPath(); g.ellipse(W * 0.08, H * 0.48, W * 0.12, H * 0.07, 0.4, 0, Math.PI * 2); g.fill();
    // Streets: a soft edge, then white.
    g.lineCap = 'round';
    for (const [x1, y1, x2, y2] of roads) {
      g.strokeStyle = 'rgba(46,36,31,.08)'; g.lineWidth = Math.max(10, W * 0.028);
      g.beginPath(); g.moveTo(x1 * W, y1 * H); g.lineTo(x2 * W, y2 * H); g.stroke();
      g.strokeStyle = '#FFFFFF'; g.lineWidth = Math.max(7, W * 0.02);
      g.beginPath(); g.moveTo(x1 * W, y1 * H); g.lineTo(x2 * W, y2 * H); g.stroke();
    }
  }

  function pin(x, y, s, a) {
    if (a <= 0.01) return;
    g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
    g.fillStyle = 'rgba(46,36,31,.18)';
    g.beginPath(); g.ellipse(0, 1, 6, 2.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = ORANGE;
    g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-4, -8, -11, -12, -11, -20); g.arc(0, -20, 11, Math.PI, 0); g.bezierCurveTo(11, -12, 4, -8, 0, 0); g.fill();
    g.fillStyle = '#FFFFFF';
    g.beginPath(); g.arc(0, -20, 4.5, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function bubble(gr) {
    const a = gr.k;
    if (a <= 0.02) return;
    const r = (20 + gr.n * 2.4) * (0.6 + 0.4 * a) * Math.min(1.25, Math.max(0.8, W / 520));
    g.save(); g.globalAlpha = Math.min(1, a * 1.2);
    if (gr.hot > 0.01) { g.fillStyle = `rgba(255,201,60,${0.45 * gr.hot})`; g.beginPath(); g.arc(gr.cx, gr.cy, r + 12, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(255,118,0,.22)'; g.beginPath(); g.arc(gr.cx, gr.cy, r + 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = ORANGE; g.beginPath(); g.arc(gr.cx, gr.cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK; g.font = `700 ${Math.round(r * 0.8)}px Fredoka, ui-rounded, system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(gr.n), gr.cx, gr.cy + 1);
    g.restore();
  }

  function draw(t, dt, settled) {
    drawMap();
    const near = settled ? null : ptr;
    groups.forEach((gr) => {
      let target = settled || t > DROP_END ? 1 : 0;
      const hit = near && Math.hypot(near.x - gr.cx, near.y - gr.cy) < Math.max(60, W * 0.13);
      if (hit) target = 0;
      gr.target = target;
      const hot = hit ? 1 : 0;
      if (settled) { gr.k = target; gr.hot = hot; return; }
      gr.k += (gr.target - gr.k) * Math.min(1, dt * 5);
      gr.hot += (hot - gr.hot) * Math.min(1, dt * 6);
    });
    for (const p of pins) {
      const gr = groups[p.h];
      let x = p.hx * W, y = p.hy * H, s = 1, a = 1;
      if (!settled) {
        const k = Math.min(1, Math.max(0, (t - p.delay) / 0.55));
        if (k <= 0) continue;
        const bounce = 1 - Math.abs(Math.cos(k * Math.PI * 1.5)) * (1 - k) ** 2;
        y = y - (1 - bounce) * H * 0.35; a = Math.min(1, k * 3);
      }
      const m = gr.k;
      x += (gr.cx - x) * m; y += (gr.cy - y) * m; s = 1 - m * 0.5; a *= 1 - m;
      pin(x, y, s * Math.min(1.2, Math.max(0.85, W / 520)), a);
    }
    groups.forEach(bubble);
  }

  function still() { groups.forEach((gr) => { gr.k = 1; }); draw(DROP_END + 1, 0, true); }

  return {
    resize(w, h, r) {
      W = w; H = h; dpr = r;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
    },
    frame(t, dt) { now = t; if (tapUntil && t > tapUntil) { tapUntil = 0; ptr = null; } draw(t, dt, false); },
    still,
  };
}
