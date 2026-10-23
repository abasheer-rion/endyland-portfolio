// Voice network device backups scene: a rack of devices drawn as small squares. A backup run sweeps
// across them. The first pass ticks each device off; later passes flash each one as it is backed up again.
// Devices near a mouse lift and show a tag. A tap on a phone sends out a ping.
// Plain 2D canvas (mountScene with webgl: false). still() draws every device ticked, for reduced motion.

const TAU = Math.PI * 2;

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');

  let W = 1, H = 1, dpr = 1, x0 = 0, y0 = 0, cols = 1, rows = 1, cell = 24, size = 16, wide = true;
  let cells = [];
  let sweep = -1, pass = 0, hold = 0;
  const ptr = { x: 0, y: 0, on: false };
  const pings = [];
  const onMove = (e) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } };
  const onDown = (e) => { if (e.pointerType !== 'mouse') { pings.push({ x: e.clientX, y: e.clientY, t: 0 }); if (pings.length > 4) pings.shift(); } };
  const onOut = (e) => { if (!e.relatedTarget) ptr.on = false; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });

  function layout() {
    wide = W >= 960;
    cell = wide ? 26 : 20; size = wide ? 17 : 13;
    // Desktop: a tall rack in the right part of the screen. Phones: a band along the bottom.
    const left = wide ? Math.max(W * 0.66, W - 18 * cell - 30) : 12;
    const top = wide ? 96 : H * 0.76;
    cols = Math.max(4, Math.floor((W - left - 12) / cell));
    rows = Math.max(3, Math.floor((H - top - 16) / cell));
    if (low) { cols = Math.min(cols, 18); rows = Math.min(rows, 12); }
    x0 = W - 12 - cols * cell + (cell - size); y0 = top;
    const old = cells;
    cells = [];
    for (let i = 0; i < cols * rows; i++) cells.push(old[i] || { done: 0, flash: 0, lift: 0 });
  }

  function draw(still) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const sy = -Math.min(H * 0.3, (scrollY || 0) * 0.06);
    // Rack rails on the sides.
    g.strokeStyle = 'rgba(156,201,255,.35)'; g.lineWidth = 1;
    const rx0 = x0 - (cell - size) - 6, rx1 = x0 + cols * cell + 2;
    g.beginPath(); g.moveTo(rx0, y0 + sy - 12); g.lineTo(rx0, y0 + sy + rows * cell + 6);
    g.moveTo(rx1, y0 + sy - 12); g.lineTo(rx1, y0 + sy + rows * cell + 6); g.stroke();
    // Devices: one outline path, one fill path, one tick path, so the draw stays cheap.
    const outline = new Path2D(), filled = new Path2D(), ticks = new Path2D();
    let hover = -1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, s = cells[i];
        const lift = s.lift * 3;
        const x = x0 + c * cell - lift, y = y0 + sy + r * cell - lift;
        const done = still ? 1 : s.done;
        outline.rect(x + 0.5, y + 0.5, size, size);
        if (done > 0.5) {
          filled.rect(x + 1, y + 1, size - 1, size - 1);
          ticks.moveTo(x + size * 0.24, y + size * 0.52); ticks.lineTo(x + size * 0.44, y + size * 0.72); ticks.lineTo(x + size * 0.78, y + size * 0.3);
        }
        if (s.lift > 0.6) hover = i;
      }
    }
    g.fillStyle = 'rgba(143,216,255,.07)'; g.fill(filled);
    g.strokeStyle = 'rgba(156,201,255,.3)'; g.stroke(outline);
    g.strokeStyle = 'rgba(255,200,87,.5)'; g.lineWidth = 1.25; g.stroke(ticks); g.lineWidth = 1;
    // Flashes from the current pass.
    if (!still) {
      for (let i = 0; i < cells.length; i++) {
        const s = cells[i];
        if (s.flash < 0.03) continue;
        const c = i % cols, r = (i - c) / cols;
        g.fillStyle = `rgba(255,200,87,${0.4 * s.flash})`;
        g.fillRect(x0 + c * cell, y0 + sy + r * cell, size + 1, size + 1);
      }
    }
    // The sweep: an amber line with a fading trail.
    if (!still && sweep > -1) {
      const sx = x0 + sweep;
      const top = y0 + sy - 14, h = rows * cell + 22;
      const gr = g.createLinearGradient(sx - 90, 0, sx, 0);
      gr.addColorStop(0, 'rgba(255,200,87,0)'); gr.addColorStop(1, 'rgba(255,200,87,.18)');
      g.fillStyle = gr; g.fillRect(sx - 90, top, 90, h);
      g.fillStyle = '#FFC857'; g.fillRect(sx - 1, top, 2, h);
      if (wide) { g.font = '500 11px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillText(`RUN ${String(pass + 1).padStart(2, '0')}`, sx, top - 6); }
    }
    // A tag on the device under the mouse.
    if (hover >= 0 && wide) {
      const c = hover % cols, r = (hover - c) / cols;
      const x = x0 + c * cell - 3, y = y0 + sy + r * cell - 3;
      g.strokeStyle = '#FFC857'; g.strokeRect(x - 0.5, y - 0.5, size + 2, size + 2);
      const tx = x - 12, ty = y - 14;
      g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.lineTo(tx - 78, ty); g.stroke();
      g.font = '500 11px ui-monospace,Menlo,monospace'; g.textAlign = 'right'; g.fillStyle = '#FFC857';
      g.fillText(`DEV ${String(hover + 1).padStart(3, '0')} ${cells[hover].done > 0.5 ? 'SAVED' : 'NO COPY'}`, tx - 2, ty - 5);
    }
    for (const q of pings) {
      const k = q.t / 0.9;
      g.beginPath(); g.arc(q.x, q.y, 10 + k * 110, 0, TAU);
      g.strokeStyle = `rgba(255,200,87,${0.6 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
    }
  }

  function step(dt) {
    const span = cols * cell;
    if (hold > 0) { hold -= dt; if (hold <= 0) sweep = 0; }
    else {
      sweep += dt * (wide ? 150 : 110);
      if (sweep > span + 20) { sweep = -1; hold = 1.4; pass++; }
    }
    const sy = -Math.min(H * 0.3, (scrollY || 0) * 0.06);
    for (let i = 0; i < cells.length; i++) {
      const s = cells[i];
      const c = i % cols, r = (i - c) / cols;
      if (sweep > -1 && Math.abs(c * cell + size / 2 - sweep) < cell * 0.5 && s.last !== pass) {
        s.last = pass; s.flash = 1;
        if (!s.done) s.done = 1;
      }
      s.flash = Math.max(0, s.flash - dt * 1.6);
      let want = 0;
      if (ptr.on) {
        const cx = x0 + c * cell + size / 2, cy = y0 + sy + r * cell + size / 2;
        const d = Math.hypot(ptr.x - cx, ptr.y - cy);
        want = d < cell * 0.75 ? 1 : d < 70 ? 0.4 : 0;
      }
      s.lift += (want - s.lift) * Math.min(1, dt * 10);
    }
    for (const q of pings) q.t += dt;
    while (pings.length && pings[0].t > 0.9) pings.shift();
  }

  return {
    resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); layout(); },
    frame(t, dt) { step(dt); draw(false); },
    still() { draw(true); },
    dispose() {
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerout', onOut);
    },
  };
}
