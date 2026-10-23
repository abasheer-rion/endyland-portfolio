// Argus Dashboard scene: the dot matrix behind the app's loss prevention screen, as a plain 2D canvas.
// A dense grid of small dots. Slow waves pass over it, a few maroon "hot zones" drift like store zones
// lighting up, and dots brighten near the pointer. A tap sends a pulse out.
// Phones get a coarser grid and draw every other frame. shared/scene-loader.js runs the loop.
export function start({ canvas, low }) {
  const g = canvas.getContext('2d', { alpha: true });
  const STEP = low ? 20 : 15;
  const BUCKETS = 7;
  let W = 0, H = 0, D = 1, skip = 0;
  let px = -1e4, py = -1e4, pOn = 0, pWant = 0;
  const pulses = [];
  const zones = [
    { x: 0.78, y: 0.28, r: 0.2, sx: 0.07, sy: 0.05, ph: 0 },
    { x: 0.2, y: 0.72, r: 0.16, sx: 0.05, sy: 0.08, ph: 2.1 },
    { x: 0.6, y: 0.85, r: 0.14, sx: 0.09, sy: 0.04, ph: 4.2 },
  ];
  const onMove = (e) => { px = e.clientX; py = e.clientY; pWant = 1; };
  const onLeave = () => { pWant = 0; };
  const onDown = (e) => {
    if (e.target.closest && e.target.closest('a,button,dialog')) return;
    pulses.push({ x: e.clientX, y: e.clientY, a: 0 });
    if (pulses.length > 3) pulses.shift();
  };
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  addEventListener('pointerdown', onDown, { passive: true });

  // One path per brightness step, per color, so each frame is a handful of fills.
  const grey = Array.from({ length: BUCKETS }, () => null);
  const red = Array.from({ length: BUCKETS }, () => null);
  const greyFill = Array.from({ length: BUCKETS }, (_, i) => `rgba(245,245,245,${(0.05 + i * 0.035).toFixed(3)})`);
  const redFill = Array.from({ length: BUCKETS }, (_, i) => `rgba(192,56,79,${(0.18 + i * 0.09).toFixed(3)})`);

  function draw(t, dt, settled) {
    g.setTransform(D, 0, 0, D, 0, 0);
    g.clearRect(0, 0, W, H);
    pOn += (pWant - pOn) * Math.min(1, dt * 5);
    for (let i = 0; i < BUCKETS; i++) { grey[i] = new Path2D(); red[i] = new Path2D(); }
    const zs = zones.map((z) => ({
      x: (z.x + Math.sin(t * z.sx * 2 + z.ph) * 0.08) * W,
      y: (z.y + Math.cos(t * z.sy * 2 + z.ph) * 0.08) * H,
      r: z.r * Math.max(W, H) * (0.85 + 0.15 * Math.sin(t * 0.7 + z.ph)),
    }));
    for (let k = pulses.length - 1; k >= 0; k--) { pulses[k].a += dt; if (pulses[k].a > 1.6) pulses.splice(k, 1); }
    const cols = Math.ceil(W / STEP) + 1, rows = Math.ceil(H / STEP) + 1;
    for (let j = 0; j < rows; j++) {
      const y = j * STEP + 4;
      for (let i = 0; i < cols; i++) {
        const x = i * STEP + 4;
        // Waves: grey brightness.
        let w = 0.5 + 0.25 * Math.sin(x * 0.009 + t * 0.5) * Math.sin(y * 0.012 - t * 0.35) + 0.25 * Math.sin((x + y) * 0.004 + t * 0.25);
        // Hot zones: red.
        let h = 0;
        for (const z of zs) {
          const d2 = ((x - z.x) ** 2 + (y - z.y) ** 2) / (z.r * z.r);
          if (d2 < 1) h = Math.max(h, (1 - d2) * (1 - d2));
        }
        if (pOn > 0.01) {
          const d = Math.hypot(x - px, y - py);
          if (d < 160) w = Math.min(1, w + (1 - d / 160) * 0.9 * pOn);
        }
        for (const p of pulses) {
          const d = Math.abs(Math.hypot(x - p.x, y - p.y) - p.a * 600);
          if (d < 40) h = Math.max(h, (1 - d / 40) * (1 - p.a / 1.6));
        }
        const s = h > 0.5 ? 1.8 : 1.3;
        if (h > 0.12) red[Math.min(BUCKETS - 1, Math.floor(h * BUCKETS))].rect(x - s / 2, y - s / 2, s, s);
        else grey[Math.min(BUCKETS - 1, Math.floor(w * w * BUCKETS))].rect(x - 0.65, y - 0.65, 1.3, 1.3);
      }
    }
    for (let i = 0; i < BUCKETS; i++) {
      g.fillStyle = greyFill[i]; g.fill(grey[i]);
      g.fillStyle = redFill[i]; g.fill(red[i]);
    }
  }

  return {
    resize(w, h, dpr) { W = w; H = h; D = dpr; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); },
    frame(t, dt) {
      if (low && (skip ^= 1)) return; // phones: 30 frames a second is plenty
      draw(t, low ? dt * 2 : dt, false);
    },
    still() { draw(3, 0, true); },
    dispose() {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}
