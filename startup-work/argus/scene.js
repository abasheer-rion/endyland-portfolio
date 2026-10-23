// Argus page scene: a plain 2D canvas, light on phones.
// - A camera aperture (8 blades) behind the hero. It opens when the page loads, like the logo,
//   turns as you scroll and closes a little further down the page. A red gear turns in the opening.
// - The faint dot grid is CSS (body.a-dots). Here, dots near the pointer light up red, and a tap or
//   click sends a red ring out through the grid.
// shared/scene-loader.js runs the loop, pauses it when hidden and draws still() with reduced motion.
const TAU = Math.PI * 2;
const N = 8;            // blades
const GRID = 24;        // must match background-size in brand.css (body.a-dots)
const SPOT = 150;       // pointer light radius, px

export function start({ canvas, low }) {
  const g = canvas.getContext('2d');
  let W = 0, H = 0, D = 1;
  let px = -1e4, py = -1e4, pOn = 0, pWant = 0;
  const ripples = [];
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const onMove = (e) => { px = e.clientX; py = e.clientY; pWant = e.pointerType === 'mouse' ? 1 : 0; };
  const onLeave = () => { pWant = 0; };
  const onDown = (e) => {
    if (e.target.closest && e.target.closest('a,button,input,dialog')) return;
    ripples.push({ x: e.clientX, y: e.clientY, a: 0 });
    if (ripples.length > 3) ripples.shift();
  };
  if (fine) addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  addEventListener('pointerdown', onDown, { passive: true });

  function layout() {
    const wide = W >= 960;
    return wide
      ? { cx: W * 0.74, cy: Math.min(H * 0.5, 470), R: Math.min(W * 0.27, H * 0.46, 420) }
      : { cx: W * 0.9, cy: Math.min(H * 0.24, 210), R: Math.min(W * 0.5, 220) };
  }

  function iris(cx, cy, R, open, rot, spin) {
    const r = R * open, c = Math.cos(Math.PI / N), tn = Math.tan(Math.PI / N);
    const rv = r / c, s = Math.sqrt(Math.max(0, R * R - r * r)) - r * tn;
    const V = [], E = [];
    for (let k = 0; k < N; k++) {
      const a = rot + k * TAU / N, va = a + Math.PI / N;
      const vx = cx + rv * Math.cos(va), vy = cy + rv * Math.sin(va);
      V.push([vx, vy]);
      E.push([vx - Math.sin(a) * s, vy + Math.cos(a) * s]);
    }
    // Blades: between edge k and the tangent line of blade k+1, out to the rim.
    for (let k = 0; k < N; k++) {
      const n = (k + 1) % N;
      const a0 = Math.atan2(E[k][1] - cy, E[k][0] - cx);
      let a1 = Math.atan2(E[n][1] - cy, E[n][0] - cx);
      if (a1 < a0) a1 += TAU;
      g.beginPath();
      g.moveTo(V[k][0], V[k][1]);
      g.lineTo(E[k][0], E[k][1]);
      g.arc(cx, cy, R, a0, a1);
      g.lineTo(V[n][0], V[n][1]);
      g.closePath();
      g.fillStyle = k % 2 ? 'rgba(26,26,26,.045)' : 'rgba(26,26,26,.03)';
      g.fill();
    }
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(26,26,26,.13)';
    g.beginPath();
    for (let k = 0; k < N; k++) { g.moveTo(V[k][0], V[k][1]); g.lineTo(E[k][0], E[k][1]); }
    g.stroke();
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.strokeStyle = 'rgba(26,26,26,.06)';
    g.beginPath(); g.arc(cx, cy, R * 1.06, 0, TAU); g.stroke();
    // Tick marks on the outer ring, like a lens barrel.
    g.strokeStyle = 'rgba(26,26,26,.12)';
    g.beginPath();
    for (let i = 0; i < 72; i++) {
      const a = i * TAU / 72 - rot * 0.25, l = i % 6 ? 5 : 11;
      g.moveTo(cx + Math.cos(a) * R * 1.06, cy + Math.sin(a) * R * 1.06);
      g.lineTo(cx + Math.cos(a) * (R * 1.06 + l), cy + Math.sin(a) * (R * 1.06 + l));
    }
    g.stroke();
    // The red gear in the opening.
    const gr = r * 0.62;
    if (gr > 8) {
      g.save();
      g.translate(cx, cy); g.rotate(spin);
      g.beginPath();
      const teeth = 12;
      for (let i = 0; i < teeth * 2; i++) {
        const a0 = (i / (teeth * 2)) * TAU, a1 = ((i + 1) / (teeth * 2)) * TAU;
        const rr = i % 2 ? gr * 0.8 : gr;
        g.arc(0, 0, rr, a0, a1);
      }
      g.closePath();
      g.moveTo(gr * 0.42, 0); g.arc(0, 0, gr * 0.42, 0, TAU, true);
      g.fillStyle = 'rgba(220,38,38,.2)';
      g.fill('evenodd');
      g.restore();
    }
  }

  function dots(t, dt) {
    pOn += (pWant - pOn) * Math.min(1, dt * 6);
    if (pOn > 0.02) {
      const x0 = Math.max(0, Math.floor((px - SPOT) / GRID)), x1 = Math.ceil((px + SPOT) / GRID);
      const y0 = Math.max(0, Math.floor((py - SPOT) / GRID)), y1 = Math.ceil((py + SPOT) / GRID);
      for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
        const x = i * GRID + 1, y = j * GRID + 1, d = Math.hypot(x - px, y - py);
        const f = (1 - d / SPOT) * pOn;
        if (f <= 0) continue;
        g.fillStyle = `rgba(220,38,38,${(0.12 + 0.55 * f).toFixed(3)})`;
        g.beginPath(); g.arc(x, y, 1 + 1.7 * f, 0, TAU); g.fill();
      }
    }
    for (let k = ripples.length - 1; k >= 0; k--) {
      const rp = ripples[k];
      rp.a += dt;
      const rad = rp.a * 520, band = 46, life = 1 - rp.a / 1.3;
      if (life <= 0) { ripples.splice(k, 1); continue; }
      const x0 = Math.max(0, Math.floor((rp.x - rad - band) / GRID)), x1 = Math.ceil((rp.x + rad + band) / GRID);
      const y0 = Math.max(0, Math.floor((rp.y - rad - band) / GRID)), y1 = Math.ceil((rp.y + rad + band) / GRID);
      for (let i = x0; i <= x1; i++) for (let j = y0; j <= y1; j++) {
        const x = i * GRID + 1, y = j * GRID + 1, d = Math.abs(Math.hypot(x - rp.x, y - rp.y) - rad);
        if (d > band) continue;
        const f = (1 - d / band) * life;
        g.fillStyle = `rgba(220,38,38,${(0.6 * f).toFixed(3)})`;
        g.beginPath(); g.arc(x, y, 1 + 1.5 * f, 0, TAU); g.fill();
      }
    }
  }

  let age = 0;
  function draw(t, dt, settled) {
    g.setTransform(D, 0, 0, D, 0, 0);
    g.clearRect(0, 0, W, H);
    const { cx, cy, R } = layout();
    const sy = window.scrollY || 0;
    age += dt;
    const k = settled ? 1 : Math.min(1, age / 1.8), e = 1 - Math.pow(1 - k, 3);
    const open = (0.07 + 0.53 * e) - Math.min(0.22, sy / 3200);
    const rot = -0.6 * (1 - e) + sy * 0.0011 + (settled ? 0 : t * 0.02);
    const y = cy - Math.min(sy * 0.35, H);
    iris(cx, y, R, open, rot, settled ? 0 : -t * 0.25);
    if (!settled) dots(t, dt);
  }

  return {
    resize(w, h, dpr) {
      W = w; H = h; D = dpr;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    },
    frame(t, dt) { draw(t, dt, false); },
    still() { draw(0, 0, true); },
    dispose() {
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    },
  };
}
