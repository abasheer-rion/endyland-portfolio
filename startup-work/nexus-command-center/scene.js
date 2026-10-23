// NEXUS Command Center scene: the RION sky plus a live telemetry strip along the bottom of the screen, like the
// payments chart on an admin dashboard. A red line scrolls left with a pulsing head, over faint grid rows and ticks.
// Plain 2D canvas. The line stays at 40% alpha so text that crosses it keeps AA contrast.
import { createSky, centerOf, fit } from '../rion/sky.js';

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const win = document.querySelector('.nx-window');
  const sky = createSky({ low, home: () => centerOf(win, 0.7, 0.45), glowSize: 0.85 });
  let W = 1, H = 1, t = 0;
  const N = low ? 48 : 90;
  // A smooth, made-up signal: a few slow waves plus bumps. Decoration, not data.
  const sig = (x) => 0.5 + 0.18 * Math.sin(x * 0.21) + 0.12 * Math.sin(x * 0.53 + 1.3) + 0.08 * Math.sin(x * 1.37 + 0.4)
    + 0.14 * Math.max(0, Math.sin(x * 0.11 + 2)) ** 8;

  function draw(dt, still) {
    t += dt;
    g.clearRect(0, 0, W, H);
    sky.draw(g, dt, { still });
    const top = H * (W < 760 ? 0.76 : 0.68), bot = H * 0.94, hh = bot - top;
    const x0 = W * 0.04, x1 = W * (W < 760 ? 0.9 : 0.93), step = (x1 - x0) / (N - 1);
    const shift = still ? 0 : t * 1.4;

    // grid rows and moving ticks
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 1;
    g.globalAlpha = 0.06;
    g.beginPath();
    for (let i = 0; i <= 4; i++) { const y = Math.round(top + (hh * i) / 4) + 0.5; g.moveTo(x0, y); g.lineTo(x1, y); }
    const tk = 80, off = ((shift * step) % tk + tk) % tk;
    for (let x = x1 - off; x > x0; x -= tk) { g.moveTo(Math.round(x) + 0.5, bot); g.lineTo(Math.round(x) + 0.5, bot + 6); }
    g.stroke();

    // the line and its fill
    const pts = [];
    for (let i = 0; i < N; i++) pts.push([x0 + i * step, bot - sig(i + shift) * hh * 0.9]);
    const fill = g.createLinearGradient(0, top, 0, bot);
    fill.addColorStop(0, 'rgba(255,49,49,.10)');
    fill.addColorStop(1, 'rgba(255,49,49,0)');
    g.globalAlpha = 1;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.lineTo(x1, bot); g.lineTo(x0, bot); g.closePath();
    g.fillStyle = fill; g.fill();
    const fade = g.createLinearGradient(x0, 0, x1, 0);
    fade.addColorStop(0, 'rgba(255,49,49,0)');
    fade.addColorStop(0.35, 'rgba(255,49,49,.4)');
    fade.addColorStop(1, 'rgba(255,49,49,.4)');
    g.strokeStyle = fade; g.lineWidth = 1.6; g.lineJoin = 'round';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();

    // pulsing head
    const [hx, hy] = pts[N - 1];
    const pulse = still ? 0.5 : (t * 0.9) % 1;
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5 * (1 - pulse);
    g.drawImage(sky.sprite, hx - 30 - pulse * 30, hy - 30 - pulse * 30, 60 + pulse * 60, 60 + pulse * 60);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.9; g.fillStyle = '#FF3131';
    g.beginPath(); g.arc(hx, hy, 3.5, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }

  return {
    resize(w, h, d) { W = w; H = h; fit(canvas, g, w, h, d); sky.resize(w, h); },
    frame(_t, dt) { draw(dt, false); },
    still() { draw(0, true); },
  };
}
