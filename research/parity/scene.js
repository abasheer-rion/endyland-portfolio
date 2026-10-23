// Parity page: the background. A backtest tape that scrolls left forever: a green line for simply holding
// the market and an amber line for a strategy that keeps falling behind it, with faint candles under them.
// Made-up walks for decoration, not Parity's data. The canvas is aria-hidden.
// Run by /shared/scene-loader.js with webgl: false. Phones draw fewer points and every other frame.

// Small seeded random, so the tape looks the same on every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const rand = rng(97);
  const gauss = () => (rand() + rand() + rand() - 1.5) * 1.15;
  let W = 1, H = 1, dpr = 1, step = 8, count = 0, offset = 0, skip = false;
  let hold = [], strat = [], candles = [];

  function push() {
    const h = hold.length ? hold[hold.length - 1] : 0;
    const s = strat.length ? strat[strat.length - 1] : 0;
    // Hold drifts up a little faster than the strategy, so the gap keeps opening, then resets gently.
    hold.push(h + 0.0042 + gauss() * 0.012);
    strat.push(s + 0.0012 + gauss() * 0.016);
    const o = rand(), c = o + gauss() * 0.25;
    candles.push([o, c, Math.max(o, c) + rand() * 0.15, Math.min(o, c) - rand() * 0.15]);
  }
  function fill() {
    while (hold.length < count + 2) push();
    while (hold.length > count + 2) { hold.shift(); strat.shift(); candles.shift(); }
  }

  function draw(t) {
    const cw = canvas.width, ch = canvas.height;
    g.clearRect(0, 0, cw, ch);
    const n = hold.length;
    // Keep both lines in view: fit the band to the visible range.
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) { lo = Math.min(lo, hold[i], strat[i]); hi = Math.max(hi, hold[i], strat[i]); }
    const pad = (hi - lo) * 0.25 + 0.02;
    const top = ch * 0.18, bot = ch * 0.9;
    const y = (v) => bot - ((v - lo + pad) / (hi - lo + pad * 2)) * (bot - top);
    const x = (i) => (i * step - offset) * dpr;

    // Candles along the floor.
    const cb = ch * 0.97, ck = ch * 0.07;
    for (let i = 0; i < n; i++) {
      const [o, c, h, l] = candles[i];
      const up = c >= o;
      g.strokeStyle = up ? 'rgba(57,255,136,.25)' : 'rgba(255,176,0,.25)';
      g.fillStyle = g.strokeStyle;
      const xx = x(i);
      g.lineWidth = dpr;
      g.beginPath(); g.moveTo(xx, cb - h * ck); g.lineTo(xx, cb - l * ck); g.stroke();
      g.fillRect(xx - 2 * dpr, cb - Math.max(o, c) * ck, 4 * dpr, Math.max(dpr, Math.abs(c - o) * ck));
    }
    // The gap between the lines.
    g.beginPath();
    for (let i = 0; i < n; i++) i ? g.lineTo(x(i), y(hold[i])) : g.moveTo(x(i), y(hold[i]));
    for (let i = n - 1; i >= 0; i--) g.lineTo(x(i), y(strat[i]));
    g.closePath(); g.fillStyle = 'rgba(255,176,0,.06)'; g.fill();
    const lineOf = (arr, color) => {
      g.beginPath();
      for (let i = 0; i < n; i++) i ? g.lineTo(x(i), y(arr[i])) : g.moveTo(x(i), y(arr[i]));
      g.strokeStyle = color; g.lineWidth = 2 * dpr; g.stroke();
    };
    lineOf(hold, 'rgba(57,255,136,.7)');
    lineOf(strat, 'rgba(255,176,0,.75)');
    // Live heads and labels at the right edge.
    const last = n - 2, hx = x(last);
    g.font = `600 ${Math.round(11 * dpr)}px "JetBrains Mono", ui-monospace, monospace`;
    g.textAlign = 'right'; g.textBaseline = 'bottom';
    [[hold, '#39FF88', 'HOLD S&P 500'], [strat, '#FFB000', 'STRATEGY']].forEach(([arr, col, label]) => {
      const yy = y(arr[last]);
      g.fillStyle = col; g.beginPath(); g.arc(hx, yy, 3.5 * dpr, 0, Math.PI * 2); g.fill();
      const k = (t * 1.2) % 1;
      g.strokeStyle = col; g.globalAlpha = 1 - k; g.beginPath(); g.arc(hx, yy, (4 + k * 10) * dpr, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
      g.fillText(label, hx - 10 * dpr, yy - 6 * dpr);
    });
  }

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      step = low ? 12 : 8;
      // Leave room on the right for the labels.
      count = Math.ceil((w * 0.86) / step);
      fill();
    },
    frame(t, dt) {
      if (low) { skip = !skip; if (skip) return; dt *= 2; }
      offset += dt * 18;
      while (offset >= step) {
        offset -= step;
        push(); hold.shift(); strat.shift(); candles.shift();
        // Re-anchor now and then, so the numbers never grow without end.
        if (hold[0] > 50) { const a = Math.min(hold[0], strat[0]); hold = hold.map((v) => v - a); strat = strat.map((v) => v - a); }
      }
      draw(t);
    },
    still() { offset = 0; draw(0.2); },
  };
}
