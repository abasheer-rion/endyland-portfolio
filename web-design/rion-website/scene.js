// RION Solutions website scene: the site's own hero, recreated. The RION sky with a red glow that follows the
// cursor closely, and now and then a shooting star. Plain 2D canvas.
import { createSky, centerOf, fit } from '../../startup-work/rion/sky.js';

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const h1 = document.querySelector('.proj-hero h1');
  const sky = createSky({ low, home: () => centerOf(h1), glowSize: 0.75, follow: 0.8 });
  let W = 1, H = 1, t = 0, next = 1.5;
  const streaks = [];

  function draw(dt, still) {
    t += dt;
    g.clearRect(0, 0, W, H);
    sky.draw(g, dt, { still });
    if (still) return;
    if (t > next) {
      next = t + 2.5 + Math.random() * 4;
      const a = Math.PI * (0.78 + Math.random() * 0.1);
      streaks.push({ x: W * (0.35 + Math.random() * 0.7), y: H * Math.random() * 0.35, a, v: 900 + Math.random() * 500, life: 0, max: 0.9 });
    }
    for (let i = streaks.length - 1; i >= 0; i--) {
      const s = streaks[i];
      s.life += dt;
      if (s.life > s.max) { streaks.splice(i, 1); continue; }
      s.x += Math.cos(s.a) * s.v * dt; s.y += Math.sin(s.a) * s.v * dt;
      const len = 140, k = Math.sin((s.life / s.max) * Math.PI);
      const tx = s.x - Math.cos(s.a) * len, ty = s.y - Math.sin(s.a) * len;
      const gr = g.createLinearGradient(s.x, s.y, tx, ty);
      gr.addColorStop(0, `rgba(255,255,255,${(0.75 * k).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = gr; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(tx, ty); g.stroke();
    }
  }

  return {
    resize(w, h, d) { W = w; H = h; fit(canvas, g, w, h, d); sky.resize(w, h); },
    frame(_t, dt) { draw(dt, false); },
    still() { draw(0, true); },
  };
}
