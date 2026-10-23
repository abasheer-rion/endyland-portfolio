// DFW rental pricing model page: the scatter instrument. A plain 2D canvas run by the shared loader.
// 1,200 dots, one per listing, fly from a loose map of the metro into a plot of asking rent against the
// model's rent as you scroll. Half land inside the 6% band (the median error), and 8 sit far above it:
// the underpriced units, in amber. Made-up dots that follow the stated numbers, not the real data.
// The canvas is aria-hidden; the caption under it says what it shows.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const COUNT = 1200, UNDER = 8, BAND = 0.06, LO = 800, HI = 3800;

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const section = canvas.closest('section') || canvas;
  const rand = rng(1200);
  const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += rand(); return (u - 2) * 1.73; };
  let W = 1, H = 1, dpr = 1, prog = 0, target = 0, mx = -1, my = -1, skip = false;
  let plot = { x: 0, y: 0, w: 1, h: 1 };

  // Listings: map position (share of the box) and the two rents.
  const hubs = [[0.3, 0.45, 0.13], [0.62, 0.5, 0.12], [0.47, 0.25, 0.1], [0.45, 0.72, 0.09], [0.78, 0.3, 0.08], [0.2, 0.75, 0.08]];
  const pts = [];
  for (let i = 0; i < COUNT; i++) {
    const h = hubs[Math.floor(rand() * hubs.length)];
    const mxp = h[0] + gauss() * h[2] * 0.6, myp = h[1] + gauss() * h[2] * 0.6;
    const ask = Math.exp(Math.log(1050) + rand() * Math.log(2900 / 1050)) + gauss() * 60;
    let err;
    if (i < UNDER) err = 0.2 + rand() * 0.14;           // underpriced: the model says rent should be far higher
    else err = Math.max(-0.16, Math.min(0.16, gauss() * 0.06 / 0.6745)); // median |err| close to 6%
    pts.push({ mx: mxp, my: myp, ask, model: ask * (1 + err), under: i < UNDER, d: rand() * 0.35 });
  }

  const px = (v) => plot.x + ((v - LO) / (HI - LO)) * plot.w;
  const py = (v) => plot.y + plot.h - ((v - LO) / (HI - LO)) * plot.h;
  const font = (s, w = 400) => `${w} ${Math.round(s * dpr)}px "JetBrains Mono", ui-monospace, monospace`;
  const ease = (k) => 1 - Math.pow(1 - k, 3);

  function axes(k) {
    g.globalAlpha = k;
    g.strokeStyle = 'rgba(57,255,136,.18)'; g.lineWidth = 1;
    for (let v = 1000; v <= HI; v += 500) {
      g.beginPath(); g.moveTo(px(v), plot.y); g.lineTo(px(v), plot.y + plot.h); g.stroke();
      g.beginPath(); g.moveTo(plot.x, py(v)); g.lineTo(plot.x + plot.w, py(v)); g.stroke();
    }
    // The 6% band around a perfect guess.
    g.beginPath();
    g.moveTo(px(LO), py(LO * (1 + BAND))); g.lineTo(px(HI / (1 + BAND)), py(HI));
    g.lineTo(px(HI), py(HI)); g.lineTo(px(HI), py(HI * (1 - BAND))); g.lineTo(px(LO), py(LO * (1 - BAND)));
    g.closePath(); g.fillStyle = 'rgba(57,255,136,.10)'; g.fill();
    g.setLineDash([5 * dpr, 5 * dpr]); g.strokeStyle = 'rgba(57,255,136,.6)';
    g.beginPath(); g.moveTo(px(LO), py(LO)); g.lineTo(px(HI), py(HI)); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#8FBF9F'; g.font = font(11); g.textAlign = 'center'; g.textBaseline = 'top';
    for (let v = 1000; v <= 3000; v += 1000) g.fillText(`$${v / 1000}K`, px(v), plot.y + plot.h + 6 * dpr);
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let v = 1000; v <= 3000; v += 1000) g.fillText(`$${v / 1000}K`, plot.x - 6 * dpr, py(v));
    g.font = font(11, 600); g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillText('ASKING RENT', plot.x + plot.w / 2, plot.y + plot.h + 22 * dpr);
    g.save(); g.translate(plot.x - 46 * dpr, plot.y + plot.h / 2); g.rotate(-Math.PI / 2);
    g.fillText("MODEL'S RENT", 0, 0); g.restore();
    g.fillStyle = '#39FF88'; g.textAlign = 'left'; g.textBaseline = 'bottom';
    g.fillText('6% BAND', px(HI * 0.78), py(HI * 0.78 * (1 + BAND)) - 6 * dpr);
    g.globalAlpha = 1;
  }

  function draw(t) {
    const cw = canvas.width, ch = canvas.height;
    g.fillStyle = '#050705'; g.fillRect(0, 0, cw, ch);
    axes(ease(Math.max(0, (prog - 0.35) / 0.65)));
    const s = Math.max(1.5, 2 * dpr);
    let near = null, nd = (14 * dpr) ** 2;
    for (const p of pts) {
      const k = ease(Math.min(1, Math.max(0, (prog - p.d) / (1 - p.d))));
      const ax = plot.x + p.mx * plot.w, ay = plot.y + p.my * plot.h;
      const x = ax + (px(p.ask) - ax) * k, y = ay + (py(p.model) - ay) * k;
      if (p.under) continue;
      g.fillStyle = k > 0.98 && Math.abs(p.model / p.ask - 1) <= BAND ? 'rgba(57,255,136,.85)' : 'rgba(143,191,159,.6)';
      g.fillRect(x - s / 2, y - s / 2, s, s);
      if (mx >= 0) { const d = (x - mx) ** 2 + (y - my) ** 2; if (d < nd) { nd = d; near = [x, y]; } }
    }
    // The underpriced units, drawn last so they sit on top.
    for (const p of pts) {
      if (!p.under) continue;
      const k = ease(Math.min(1, Math.max(0, (prog - p.d) / (1 - p.d))));
      const ax = plot.x + p.mx * plot.w, ay = plot.y + p.my * plot.h;
      const x = ax + (px(p.ask) - ax) * k, y = ay + (py(p.model) - ay) * k;
      g.fillStyle = '#FFB000'; g.beginPath(); g.arc(x, y, 3.5 * dpr, 0, Math.PI * 2); g.fill();
      if (k > 0.98) {
        const r = (t * 0.8 + p.d * 3) % 1;
        g.strokeStyle = `rgba(255,176,0,${1 - r})`; g.lineWidth = 1.2 * dpr;
        g.beginPath(); g.arc(x, y, (4 + r * 14) * dpr, 0, Math.PI * 2); g.stroke();
      }
      if (mx >= 0) { const d = (x - mx) ** 2 + (y - my) ** 2; if (d < nd) { nd = d; near = [x, y]; } }
    }
    if (near) {
      g.strokeStyle = 'rgba(255,176,0,.7)'; g.lineWidth = 1;
      g.setLineDash([3 * dpr, 3 * dpr]);
      g.beginPath(); g.moveTo(near[0], near[1]); g.lineTo(near[0], plot.y + plot.h); g.moveTo(near[0], near[1]); g.lineTo(plot.x, near[1]); g.stroke();
      g.setLineDash([]);
      g.beginPath(); g.arc(near[0], near[1], 7 * dpr, 0, Math.PI * 2); g.stroke();
    }
    // Readout.
    g.font = font(12, 600); g.textAlign = 'left'; g.textBaseline = 'top';
    const shown = Math.round(COUNT * Math.min(1, prog * 1.25));
    g.fillStyle = '#CFFFE0'; g.fillText(`LISTINGS ${shown.toLocaleString('en-US')}`, 12 * dpr, 10 * dpr);
    if (prog > 0.95) { g.fillStyle = '#FFB000'; g.fillText(`UNDERPRICED ${UNDER}`, 12 * dpr, 28 * dpr); }
  }

  function measureScroll() {
    const r = section.getBoundingClientRect(), vh = innerHeight;
    // 0 when the section top reaches the bottom of the screen, 1 when the plot is well in view.
    target = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.85)));
  }
  const onScroll = () => measureScroll();
  addEventListener('scroll', onScroll, { passive: true });
  const onMove = (e) => { const r = canvas.getBoundingClientRect(); mx = (e.clientX - r.left) * dpr; my = (e.clientY - r.top) * dpr; };
  const onLeave = () => { mx = -1; my = -1; };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  measureScroll();

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      const left = (w < 520 ? 58 : 72) * d, bottom = 46 * d;
      plot = { x: left, y: 44 * d, w: canvas.width - left - 18 * d, h: canvas.height - 44 * d - bottom };
    },
    frame(t, dt) {
      if (low) { skip = !skip; if (skip) return; dt *= 2; }
      prog += (target - prog) * Math.min(1, dt * 3.5);
      if (Math.abs(target - prog) < 0.001) prog = target;
      draw(t);
    },
    still() { prog = 1; draw(0); },
    dispose() {
      removeEventListener('scroll', onScroll);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
