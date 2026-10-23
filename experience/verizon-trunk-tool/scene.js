// Carrier Trunk Provisioning Tool scene: many carrier trunks drawn as curved cable runs, all landing in
// one record system, with a single API line going out. Packets flow in along the trunks and out along
// the API. Trunks near a mouse bend toward it, like loose cables. A tap on a phone sends out a ping.
// Plain 2D canvas (mountScene with webgl: false). still() draws the finished drawing for reduced motion.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const TAU = Math.PI * 2;
const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const bez = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  const rand = rng(2025);
  const N = low ? 12 : 26;
  const trunks = [];
  for (let i = 0; i < N; i++) {
    trunks.push({ v: (i + 0.5) / N + (rand() - 0.5) * 0.02, slot: (i + 0.5) / N, ox: 0, oy: 0, bend: 0.25 + rand() * 0.2 });
  }
  const packets = [];
  for (let i = 0; i < (low ? 10 : 26); i++) packets.push({ k: Math.floor(rand() * N), s: rand(), v: 0.18 + rand() * 0.16 });
  const out = [];
  for (let i = 0; i < (low ? 3 : 6); i++) out.push({ s: i / (low ? 3 : 6) });

  let W = 1, H = 1, dpr = 1, hx = 0, hy = 0, bw = 120, bh = 84, wide = true, flash = 0;
  const ptr = { x: 0, y: 0, on: false };
  const pings = [];
  const onMove = (e) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } };
  const onDown = (e) => { if (e.pointerType !== 'mouse') { pings.push({ x: e.clientX, y: e.clientY, t: 0 }); if (pings.length > 4) pings.shift(); } };
  const onOut = (e) => { if (!e.relatedTarget) ptr.on = false; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });

  function hub() {
    const sy = Math.min(H * 0.25, (scrollY || 0) * 0.08);
    return [hx, hy - sy];
  }
  // The four control points of trunk i.
  function curve(tr) {
    const [x, y] = hub();
    const y0 = H * (0.04 + tr.v * 0.94);
    const y3 = y - bh / 2 + 10 + tr.slot * (bh - 20);
    const x3 = x - bw / 2;
    return [-20, y0, W * tr.bend + tr.ox, y0 + tr.oy, x3 - W * 0.18 + tr.ox, y3 + tr.oy, x3, y3];
  }
  const at = (c, t) => [bez(c[0], c[2], c[4], c[6], t), bez(c[1], c[3], c[5], c[7], t)];

  function draw(p) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const [x, y] = hub();
    // Trunks, drawn on from the left edge as the page arrives.
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(156,201,255,.3)';
    const SEG = low ? 18 : 28;
    for (const tr of trunks) {
      const c = curve(tr);
      const lim = ease(p * 1.3 - tr.v * 0.3);
      g.beginPath(); g.moveTo(c[0], c[1]);
      for (let i = 1; i <= SEG; i++) {
        const t = (i / SEG) * lim;
        const [px, py] = at(c, t); g.lineTo(px, py);
      }
      g.stroke();
    }
    if (p >= 1) {
      g.fillStyle = '#FFC857';
      for (const q of packets) {
        const [px, py] = at(curve(trunks[q.k]), q.s);
        g.fillRect(px - 2.5, py - 2.5, 5, 5);
      }
    }
    // API line: a double line from the bottom of the box down off the screen.
    const ay = y + bh / 2, ey = H + 20;
    const shown = ay + (ey - ay) * ease(p * 1.5 - 0.5);
    g.strokeStyle = 'rgba(255,200,87,.55)';
    g.beginPath(); g.moveTo(x - 4, ay); g.lineTo(x - 4, shown); g.moveTo(x + 4, ay); g.lineTo(x + 4, shown); g.stroke();
    if (p >= 1) {
      g.fillStyle = '#FFC857';
      for (const q of out) g.fillRect(x - 2, ay + (ey - ay) * q.s - 5, 4, 10);
    }
    // The record system: a box with a dashed inner frame and a label.
    g.globalAlpha = ease(p * 2 - 0.6);
    g.fillStyle = 'rgba(11,37,69,.97)';
    g.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    g.strokeStyle = flash > 0.05 ? `rgba(255,200,87,${0.5 + 0.5 * flash})` : 'rgba(156,201,255,.8)';
    g.strokeRect(x - bw / 2 + 0.5, y - bh / 2 + 0.5, bw - 1, bh - 1);
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(156,201,255,.45)';
    g.strokeRect(x - bw / 2 + 7.5, y - bh / 2 + 7.5, bw - 15, bh - 15);
    g.setLineDash([]);
    g.font = `600 ${wide ? 13 : 11}px ui-monospace,Menlo,monospace`; g.textAlign = 'center';
    g.fillStyle = 'rgba(234,243,255,.9)'; g.fillText('RECORDS', x, y + 4);
    g.fillStyle = 'rgba(255,200,87,.85)'; g.textAlign = 'left';
    g.fillText('API', x + 14, ay + 22);
    g.globalAlpha = 1;
    for (const q of pings) {
      const k = q.t / 0.9;
      g.beginPath(); g.arc(q.x, q.y, 10 + k * 110, 0, TAU);
      g.strokeStyle = `rgba(255,200,87,${0.6 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
    }
  }

  function step(dt) {
    const k = Math.min(1, dt * 7);
    for (const tr of trunks) {
      let tx = 0, ty = 0;
      if (ptr.on) {
        const c = curve(tr);
        const [mx, my] = at(c, 0.45);
        const dx = ptr.x - mx, dy = ptr.y - my, d = Math.hypot(dx, dy);
        const f = Math.max(0, 1 - d / 220);
        tx = dx * f * 0.6; ty = dy * f * 0.6;
      }
      tr.ox += (tx - tr.ox) * k; tr.oy += (ty - tr.oy) * k;
    }
    for (const q of packets) {
      q.s += q.v * dt;
      if (q.s >= 1) { q.s = 0; q.k = Math.floor(Math.random() * trunks.length); flash = 1; }
    }
    for (const q of out) { q.s += dt * 0.55; if (q.s > 1) q.s -= 1; }
    flash = Math.max(0, flash - dt * 4);
    for (const q of pings) q.t += dt;
    while (pings.length && pings[0].t > 0.9) pings.shift();
  }

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
      wide = W >= 960;
      bw = wide ? 124 : 92; bh = wide ? 84 : 60;
      // The record system sits in the right margin, clear of the text column where there is room.
      hx = wide ? Math.max(W * 0.8, W - bw / 2 - 18) : W - bw / 2 - 12;
      hy = H * (wide ? 0.5 : 0.78);
    },
    frame(t, dt) { step(dt); draw(Math.min(1, t / 1.8)); },
    still() { draw(1); },
    dispose() {
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerout', onOut);
    },
  };
}
