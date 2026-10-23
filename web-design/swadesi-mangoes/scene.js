// Swadesi Mangoes crate. A plain 2D canvas, started by main.js through mountScene (webgl: false).
// Mangoes drop in one by one, bounce, roll and settle in a pile on the crate. A mouse pushes them as it passes,
// and a tap pops the nearest one up. Hand-written physics: gravity, circle contacts, friction. No library.
// Reduced motion: the pile is worked out ahead of time and drawn once, already settled.

function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const rand = rng(11);
  let W = 0, H = 0, dpr = 1, floor = 0;
  const N = low ? 20 : 44;
  const ms = [];
  const tints = [['#F7D84A', '#C9C12A'], ['#F5C93A', '#E8892B'], ['#E9D84E', '#8DB83A'], ['#F8CF3F', '#D9A12C']];
  for (let i = 0; i < N; i++) {
    ms.push({ x: 0, y: 0, vx: 0, vy: 0, a: rand() * 6.28, va: 0, r: 0, k: rand(), t: tints[i % tints.length], leaf: rand() < 0.3, drop: 0.2 + i * (low ? 0.12 : 0.07), live: false });
  }
  const size = () => Math.max(16, Math.min(30, H * 0.13));
  let ptr = null, lastPtr = null;

  function reset() {
    const s = size();
    ms.forEach((m) => { m.r = s * (0.82 + m.k * 0.3); m.x = m.r + rand() * (W - 2 * m.r); m.y = -m.r * 2; m.vx = (rand() - 0.5) * 80; m.vy = 0; m.va = (rand() - 0.5) * 3; m.live = false; });
  }

  function step(t, dt) {
    const G = 1700;
    for (const m of ms) {
      if (!m.live) { if (t >= m.drop) m.live = true; else continue; }
      m.vy += G * dt;
      m.x += m.vx * dt; m.y += m.vy * dt; m.a += m.va * dt;
      if (m.y > floor - m.r * 0.78) { m.y = floor - m.r * 0.78; if (m.vy > 0) m.vy *= -0.32; m.vx *= 0.96; m.va = m.vx / m.r; }
      if (m.x < m.r) { m.x = m.r; m.vx = Math.abs(m.vx) * 0.5; }
      if (m.x > W - m.r) { m.x = W - m.r; m.vx = -Math.abs(m.vx) * 0.5; }
    }
    // Contacts: push overlapping mangoes apart and trade a little speed.
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < N; i++) {
        const a = ms[i]; if (!a.live) continue;
        for (let j = i + 1; j < N; j++) {
          const b = ms[j]; if (!b.live) continue;
          const dx = b.x - a.x, dy = (b.y - a.y) * 1.15, d = Math.hypot(dx, dy), min = (a.r + b.r) * 0.8;
          if (d > 0 && d < min) {
            const nx = dx / d, ny = dy / d, push = (min - d) / 2;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
            const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (rv < 0) { const j2 = -rv * 0.6; a.vx -= nx * j2; a.vy -= ny * j2; b.vx += nx * j2; b.vy += ny * j2; }
          }
        }
      }
    }
    for (const m of ms) { if (m.live) { m.vx *= 1 - 1.2 * dt; m.va *= 1 - 2 * dt; } }
  }

  function mango(m) {
    const rx = m.r * 1.12, ry = m.r * 0.82;
    g.save(); g.translate(m.x, m.y);
    g.fillStyle = 'rgba(70,40,10,.08)';
    g.beginPath(); g.ellipse(3, ry * 0.7, rx * 0.85, ry * 0.28, 0, 0, 6.283); g.fill();
    g.rotate(m.a);
    const gr = g.createRadialGradient(-rx * 0.35, -ry * 0.4, ry * 0.1, 0, 0, rx * 1.1);
    gr.addColorStop(0, '#FFF2A0'); gr.addColorStop(0.35, m.t[0]); gr.addColorStop(1, m.t[1]);
    g.fillStyle = gr;
    // A mango: an egg shape, fuller at one end with a soft beak.
    g.beginPath();
    g.moveTo(rx, 0);
    g.bezierCurveTo(rx, ry * 0.9, -rx * 0.4, ry * 1.1, -rx * 0.9, ry * 0.35);
    g.bezierCurveTo(-rx * 1.1, -ry * 0.2, -rx * 0.6, -ry * 1.05, 0, -ry);
    g.bezierCurveTo(rx * 0.6, -ry * 0.95, rx, -ry * 0.5, rx, 0);
    g.fill();
    g.fillStyle = '#5B3A12';
    g.beginPath(); g.arc(rx * 0.86, -ry * 0.28, Math.max(1.5, m.r * 0.07), 0, 6.283); g.fill();
    if (m.leaf) {
      g.fillStyle = '#2E8C1E';
      g.beginPath(); g.ellipse(rx * 1.15, -ry * 0.55, m.r * 0.42, m.r * 0.16, -0.6, 0, 6.283); g.fill();
    }
    g.restore();
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    const order = ms.filter((m) => m.live).sort((a, b) => a.y - b.y);
    order.forEach(mango);
  }

  const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') ptr = local(e); });
  canvas.addEventListener('pointerleave', () => { ptr = null; lastPtr = null; });
  canvas.addEventListener('pointerdown', (e) => {
    const p = local(e);
    let best = null, bd = 1e9;
    for (const m of ms) { if (!m.live) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } }
    if (best && bd < best.r * 2.5) { best.vy = -620 - Math.random() * 200; best.vx += (best.x - p.x) * 4; best.va += (Math.random() - 0.5) * 8; }
  });

  function nudge(dt) {
    if (!ptr) return;
    const vx = lastPtr ? (ptr.x - lastPtr.x) / Math.max(dt, 1 / 120) : 0;
    for (const m of ms) {
      if (!m.live) continue;
      const dx = m.x - ptr.x, dy = m.y - ptr.y, d = Math.hypot(dx, dy);
      if (d < m.r * 1.4 && d > 0) { m.vx += (dx / d) * 260 + vx * 0.15; m.vy -= 180; }
    }
    lastPtr = ptr;
  }

  function settle() {
    reset();
    const dt = 1 / 120;
    for (let t = 0; t < 7; t += dt) step(t, dt);
  }

  return {
    resize(w, h, r) {
      const first = W === 0;
      const sx = W ? w / W : 1;
      W = w; H = h; dpr = r; floor = H - 22;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (first) { if (ctx.reduced) settle(); else reset(); }
      else ms.forEach((m) => { m.x *= sx; m.r = size() * (0.82 + m.k * 0.3); });
    },
    frame(t, dt) {
      nudge(dt);
      // Two smaller steps per frame keep the pile steady.
      step(t, dt / 2); step(t, dt / 2);
      draw();
    },
    still() {
      if (!ms.some((m) => m.live)) settle();
      draw();
    },
  };
}
