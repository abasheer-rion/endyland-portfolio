// Public spending data explorer page: the background. Ledger rows stream up the screen like a table scan,
// faster while you scroll, and now and then a row lights amber as a match. Made-up rows, decoration only
// (the canvas is aria-hidden). Run by /shared/scene-loader.js with webgl: false.
// Phones draw every other frame. Reduced motion gets one still frame.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const VENDORS = ['CEDAR HOLLOW PAVING', 'Cedar Hollow Paving LLC', 'REDBUD OFFICE SUPPLY', 'Redbud Office Sup.', 'MESQUITE RIDGE FLEET',
  'Mesquite Ridge Fleet Svc', 'PECAN CREEK PRINTING', 'Pecan Creek Print Co', 'TRINITY BEND JANITORIAL', 'Trinity Bend Janitorial Inc'];
const DEPTS = ['ROADS', 'PARKS', 'FLEET', 'ADMIN', 'LIBRARY', 'WATER'];

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const rand = rng(250);
  let W = 1, H = 1, dpr = 1, lh = 22, y0 = 0, rows = [], id = 250000, boost = 0, lastY = scrollY, skip = false;

  const make = () => {
    id -= 1 + Math.floor(rand() * 40);
    const v = VENDORS[Math.floor(rand() * VENDORS.length)];
    const amt = (rand() * 48000 + 120).toFixed(2);
    const m = String(1 + Math.floor(rand() * 12)).padStart(2, '0'), d = String(1 + Math.floor(rand() * 28)).padStart(2, '0');
    return { text: `${String(id).padStart(6, '0')}  2026-${m}-${d}  ${DEPTS[Math.floor(rand() * DEPTS.length)].padEnd(8)} ${v.padEnd(28)} $${amt.padStart(9)}`, hit: rand() < 0.06, flash: 0 };
  };
  const fill = () => { const n = Math.ceil(H / lh) + 2; while (rows.length < n) rows.push(make()); while (rows.length > n) rows.pop(); };

  function draw() {
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.font = `${Math.round(13 * dpr)}px "JetBrains Mono", ui-monospace, monospace`;
    g.textBaseline = 'middle';
    const x = (W < 760 ? 12 : W * 0.5) * dpr;
    rows.forEach((r, i) => {
      const y = (i * lh - y0 + lh / 2) * dpr;
      if (r.hit) {
        g.fillStyle = `rgba(255,176,0,${0.07 + r.flash * 0.12})`;
        g.fillRect(x - 8 * dpr, y - (lh / 2) * dpr, W * dpr - x + 8 * dpr, lh * dpr);
        g.fillStyle = 'rgba(255,176,0,.55)';
      } else g.fillStyle = 'rgba(57,255,136,.28)';
      g.fillText(r.text, x, y);
    });
  }

  const onScroll = () => { boost = Math.min(18, boost + Math.abs(scrollY - lastY) * 0.08); lastY = scrollY; };
  addEventListener('scroll', onScroll, { passive: true });

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d; lh = w < 760 ? 20 : 22;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      fill();
    },
    frame(t, dt) {
      if (low) { skip = !skip; if (skip) return; dt *= 2; }
      y0 += dt * (14 + boost * 20);
      boost *= Math.pow(0.08, dt);
      while (y0 >= lh) { y0 -= lh; rows.shift(); const r = make(); if (r.hit) r.flash = 1; rows.push(r); }
      rows.forEach((r) => { r.flash = Math.max(0, r.flash - dt * 0.6); });
      draw();
    },
    still() { draw(); },
    dispose() { removeEventListener('scroll', onScroll); },
  };
}
