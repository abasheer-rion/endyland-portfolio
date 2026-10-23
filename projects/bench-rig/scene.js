// Bench rig page stage: a pixel oscilloscope running the 12-point amplifier sweep. A plain 2D canvas.
// Decoration only. It shows what the text says: a 12-point amplifier test, charts that draw themselves,
// and a 3 dB error the script caught. Which point is low is made up for the picture.
// Yellow (top): the test signal from the function generator. Green (bottom): gain at each of the 12 points,
// plotted one by one, then the low point is boxed in pink. Then the screen clears and it runs again.
// Phosphor glow: each frame fades the last one a little instead of clearing it.
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import { bus } from './bus.js';

const BG = '#020A04', GRID = '#0E3A1C', AXIS = '#1A5A2C', GREEN = '#3DFF8A', DIM = '#1E9A50', YELLOW = '#FFE14D', PINK = '#FF4FD8';
const N = 12, LOW = 7, STEP = 0.32, HOLD = 2.6;          // points, the low one, seconds per point, seconds to hold the result
const RUN = N * STEP + HOLD;
// Gain at each point in dB: flat with a gentle roll-off at the top end, and one point 3 dB low.
const GAIN = Array.from({ length: N }, (_, i) => 20 - Math.max(0, i - 8) * 0.9 - (i === LOW ? 3 : 0));

export function start({ canvas, low }) {
  const g = canvas.getContext('2d', { alpha: false });
  const P = 3; // screen pixels per drawn pixel
  let W = 0, H = 0, last = -1, lastPt = -1, done = false;
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  // Pixel line (Bresenham), so the plot stays crisp.
  function line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    g.fillStyle = c;
    for (let i = 0; i < 2000; i++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  function grid() {
    const cx = W / 10, cy = H / 8;
    for (let i = 1; i < 10; i++) for (let y = 0; y < H; y += 2) px(i * cx, y, i === 5 ? AXIS : GRID);
    for (let j = 1; j < 8; j++) for (let x = 0; x < W; x += 2) px(x, j * cy, j === 4 ? AXIS : GRID);
  }
  const plotX = (i) => W * 0.08 + (i * (W * 0.84)) / (N - 1);
  const plotY = (db) => H * 0.92 - ((db - 10) / 14) * (H * 0.42);

  function draw(t, still) {
    const r = still ? N * STEP + 1 : t % RUN;
    const shown = Math.min(N, Math.floor(r / STEP) + 1);
    // fade the last frame (phosphor), or clear at the start of a run
    if (still || r < 0.1) { g.fillStyle = BG; g.fillRect(0, 0, W, H); }
    else { g.fillStyle = 'rgba(2,10,4,0.42)'; g.fillRect(0, 0, W, H); }
    grid();
    // test signal
    let prev = null;
    for (let x = 0; x < W; x += 1) {
      const y = H * 0.27 + Math.sin(x / (W / 18) - (still ? 0 : t * 5)) * H * 0.12;
      if (prev !== null) line(x - 1, prev, x, y, YELLOW);
      prev = y;
    }
    // sweep: points so far, joined
    for (let i = 0; i < shown; i++) {
      const x = plotX(i), y = plotY(GAIN[i]);
      if (i > 0) line(plotX(i - 1), plotY(GAIN[i - 1]), x, y, DIM);
      g.fillStyle = GREEN; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    // the low point, boxed and blinking once the run is done
    const finished = shown >= N && r >= N * STEP;
    if (finished && (still || Math.floor(t * 3) % 2 === 0)) {
      const x = Math.round(plotX(LOW)), y = Math.round(plotY(GAIN[LOW]));
      const b = 5;
      line(x - b, y - b, x + b, y - b, PINK); line(x + b, y - b, x + b, y + b, PINK);
      line(x + b, y + b, x - b, y + b, PINK); line(x - b, y + b, x - b, y - b, PINK);
      // dotted line at where it should have been
      const yy = Math.round(plotY(GAIN[LOW] + 3));
      for (let k = -8; k <= 8; k += 2) px(x + k, yy, PINK);
    }
    const pt = finished ? N : shown;
    if (pt !== lastPt && !finished) { lastPt = pt; done = false; bus.onPoint?.(r < 0.1 ? 0 : pt); }
    if (finished && !done) { done = true; lastPt = -1; bus.onDone?.(); }
  }

  return {
    resize(w, h) {
      W = Math.max(40, Math.ceil(w / P)); H = Math.max(30, Math.ceil(h / P));
      canvas.width = W; canvas.height = H;
      g.imageSmoothingEnabled = false;
      g.fillStyle = BG; g.fillRect(0, 0, W, H);
      last = -1;
    },
    // Stepped time: 15 updates a second, like an old scope.
    frame(t) {
      const s = Math.floor(t * 15) / 15;
      if (s !== last) { last = s; draw(s, false); }
    },
    still() { draw(0, true); },
  };
}
