// Property manager scene: an architect's floor plan of a 23-unit building. Units on both sides of a
// corridor, door swings, a stair, and a dimension line. The plan draws itself when the page arrives, then
// the units light up one by one as they are leased. Now and then one goes dark and is leased again.
// A mouse over a unit outlines it and shows its tag. A tap on a phone sends out a ping.
// Plain 2D canvas (mountScene with webgl: false). still() draws the finished, fully leased plan.

const TAU = Math.PI * 2;
const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const TOP = 12, BOTTOM = 11; // 23 units

export function start(ctx) {
  const { canvas } = ctx;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  let W = 1, H = 1, dpr = 1, wide = true;
  let px = 0, py = 0, pw = 1, ph = 1, uw = 1, uh = 1, cor = 1;
  let units = [], segs = [], total = 1;
  const lit = Array.from({ length: TOP + BOTTOM }, () => ({ on: 0, want: 0 }));
  let order = 0, leaseT = 0, idleT = 3, out = -1, outT = 0;
  const ptr = { x: 0, y: 0, on: false };
  const pings = [];
  const onMove = (e) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } };
  const onDown = (e) => { if (e.pointerType !== 'mouse') { pings.push({ x: e.clientX, y: e.clientY, t: 0 }); if (pings.length > 4) pings.shift(); } };
  const onOut = (e) => { if (!e.relatedTarget) ptr.on = false; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });

  // How far the footer has come up into view. Bottom-anchored drawing rests on top of it.
  const foot = document.querySelector('.site-footer');
  const footLift = () => (foot ? Math.max(0, H - foot.getBoundingClientRect().top) : 0);

  function layout() {
    wide = W >= 960;
    // Desktop: the plan fills the right part of the screen, below the title. Phones: a band at the bottom.
    pw = wide ? Math.min(W * 0.5, 760) : W - 24;
    px = W - pw - (wide ? 24 : 12);
    uw = pw / (TOP + 1); // the last bay holds the stair
    uh = wide ? Math.min(120, uw * 1.5) : uw * 1.5;
    cor = uh * 0.42;
    ph = uh * 2 + cor;
    py = H - ph - (wide ? 34 : 26);
    units = [];
    for (let i = 0; i < TOP; i++) units.push({ x: px + i * uw, y: py, w: uw, h: uh, top: true });
    for (let i = 0; i < BOTTOM; i++) units.push({ x: px + i * uw, y: py + uh + cor, w: uw, h: uh, top: false });
    // Line work in drawing order: outer walls, partitions, corridor walls.
    segs = [];
    const L = (x1, y1, x2, y2, w = 1) => segs.push([x1, y1, x2, y2, w]);
    L(px, py, px + pw, py, 2); L(px + pw, py, px + pw, py + ph, 2); L(px + pw, py + ph, px, py + ph, 2); L(px, py + ph, px, py, 2);
    for (let i = 1; i <= TOP; i++) L(px + i * uw, py, px + i * uw, py + uh);
    for (let i = 1; i <= BOTTOM + 1; i++) L(px + i * uw, py + uh + cor, px + i * uw, py + ph);
    L(px, py + uh, px + TOP * uw, py + uh); L(px, py + uh + cor, px + BOTTOM * uw, py + uh + cor);
    total = segs.reduce((a, s) => a + Math.hypot(s[2] - s[0], s[3] - s[1]), 0);
  }
  const at = (y) => y - Math.min(H * 0.2, (scrollY || 0) * 0.05) - footLift();

  function draw(p) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const dy = at(0);
    g.save(); g.translate(0, dy);
    // Floor slab behind the plan, so the lines read cleanly.
    g.fillStyle = `rgba(11,37,69,${0.85 * ease(p * 3)})`;
    g.fillRect(px - 6, py - 6, pw + 12, ph + 12);
    // Leased units glow amber.
    for (let i = 0; i < units.length; i++) {
      const u = units[i], k = lit[i].on;
      if (k < 0.02) continue;
      g.fillStyle = `rgba(255,200,87,${0.1 * k})`;
      g.fillRect(u.x + 3, u.y + 3, u.w - 6, u.h - 6);
      g.fillStyle = `rgba(255,200,87,${0.8 * k})`;
      g.beginPath(); g.arc(u.x + u.w / 2, u.y + (u.top ? u.h * 0.42 : u.h * 0.58), Math.max(2.5, u.w * 0.08), 0, TAU); g.fill();
    }
    // Walls, drawn on in order.
    let left = total * ease(p * 1.1);
    g.strokeStyle = 'rgba(156,201,255,.7)';
    for (const s of segs) {
      if (left <= 0) break;
      const len = Math.hypot(s[2] - s[0], s[3] - s[1]);
      const k = Math.min(1, left / len); left -= len;
      g.lineWidth = s[4];
      g.beginPath(); g.moveTo(s[0], s[1]); g.lineTo(s[0] + (s[2] - s[0]) * k, s[1] + (s[3] - s[1]) * k); g.stroke();
    }
    g.lineWidth = 1;
    const late = ease(p * 2 - 1);
    if (late > 0) {
      g.globalAlpha = late;
      // Doors: a leaf and a quarter swing on the corridor side of each unit.
      g.strokeStyle = 'rgba(156,201,255,.45)';
      const d = Math.min(uw * 0.42, cor * 0.8);
      for (const u of units) {
        const hx = u.x + u.w * 0.22, hy = u.top ? u.y + u.h : u.y;
        const s = u.top ? -1 : 1;
        g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx, hy + s * d);
        g.moveTo(hx + d, hy); g.arc(hx, hy, d, 0, (s * Math.PI) / 2, u.top);
        g.stroke();
      }
      // Windows on the outer walls: three thin lines.
      g.strokeStyle = 'rgba(156,201,255,.5)';
      for (const u of units) {
        const wy = u.top ? u.y : u.y + u.h;
        for (const o of [-2, 0, 2]) { g.beginPath(); g.moveTo(u.x + u.w * 0.3, wy + o); g.lineTo(u.x + u.w * 0.7, wy + o); g.stroke(); }
      }
      // Stair in the last bay of the lower row.
      const sx = px + BOTTOM * uw, sy = py + uh + cor;
      g.strokeStyle = 'rgba(156,201,255,.4)';
      for (let i = 1; i < 8; i++) { g.beginPath(); g.moveTo(sx + 4, sy + (uh * i) / 8); g.lineTo(sx + uw - 4, sy + (uh * i) / 8); g.stroke(); }
      // Dimension line above the plan.
      const ty = py - (wide ? 26 : 18);
      g.strokeStyle = 'rgba(156,201,255,.6)';
      g.beginPath(); g.moveTo(px, ty); g.lineTo(px + pw, ty);
      g.moveTo(px, ty - 6); g.lineTo(px, ty + 6); g.moveTo(px + pw, ty - 6); g.lineTo(px + pw, ty + 6);
      g.moveTo(px - 4, ty + 4); g.lineTo(px + 4, ty - 4); g.moveTo(px + pw - 4, ty + 4); g.lineTo(px + pw + 4, ty - 4);
      g.stroke();
      g.font = `600 ${wide ? 12 : 10}px ui-monospace,Menlo,monospace`; g.textAlign = 'center';
      g.fillStyle = '#0B2545'; const tw = wide ? 92 : 74; g.fillRect(px + pw / 2 - tw / 2, ty - 8, tw, 16);
      g.fillStyle = 'rgba(234,243,255,.85)'; g.fillText('23 UNITS', px + pw / 2, ty + 4);
      g.globalAlpha = 1;
    }
    // Hover tag.
    if (ptr.on && wide && p >= 1) {
      const my = ptr.y - dy;
      const i = units.findIndex((u) => ptr.x >= u.x && ptr.x < u.x + u.w && my >= u.y && my < u.y + u.h);
      if (i >= 0) {
        const u = units[i];
        g.strokeStyle = '#FFC857'; g.lineWidth = 2; g.strokeRect(u.x + 2, u.y + 2, u.w - 4, u.h - 4); g.lineWidth = 1;
        const tx = u.x + u.w / 2, ty = u.top ? u.y - 40 : u.y + u.h + 40;
        g.beginPath(); g.moveTo(tx, u.top ? u.y : u.y + u.h); g.lineTo(tx, ty); g.stroke();
        g.fillStyle = '#FFC857'; g.fillRect(tx - 40, ty - (u.top ? 18 : 0), 80, 18);
        g.fillStyle = '#0B2545'; g.font = '600 11px ui-monospace,Menlo,monospace'; g.textAlign = 'center';
        g.fillText(`UNIT ${String(i + 1).padStart(2, '0')}`, tx, ty - (u.top ? 5 : -13));
      }
    }
    g.restore();
    for (const q of pings) {
      const k = q.t / 0.9;
      g.beginPath(); g.arc(q.x, q.y, 10 + k * 110, 0, TAU);
      g.strokeStyle = `rgba(255,200,87,${0.6 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
    }
  }

  function step(t, dt) {
    if (t > 2.2 && order < lit.length) {
      leaseT -= dt;
      if (leaseT <= 0) { lit[(order * 7) % lit.length].want = 1; order++; leaseT = 0.11; }
    }
    if (order >= lit.length) {
      // Turnover: one unit goes dark for a moment, then is leased again.
      idleT -= dt;
      if (out < 0 && idleT <= 0) { out = Math.floor(Math.random() * lit.length); lit[out].want = 0; outT = 1.6; }
      if (out >= 0) { outT -= dt; if (outT <= 0) { lit[out].want = 1; out = -1; idleT = 2.5 + Math.random() * 2; } }
    }
    for (const l of lit) l.on += (l.want - l.on) * Math.min(1, dt * 6);
    for (const q of pings) q.t += dt;
    while (pings.length && pings[0].t > 0.9) pings.shift();
  }

  return {
    resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); layout(); },
    frame(t, dt) { step(t, dt); draw(Math.min(1, t / 2.2)); },
    still() { for (const l of lit) { l.on = 1; l.want = 1; } order = lit.length; draw(1); },
    dispose() {
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerout', onOut);
    },
  };
}
