// Experience hero art: an engraved halftone. Gold dots on leather swell and shrink in rings that travel
// outward from a point, like a signal leaving a mast. Decoration only (aria-hidden, no text sits on it).
// Plain 2D canvas started by /shared/scene-loader.js after first paint. The loader stops it off screen and in a
// hidden tab and sets the pixel ratio (cap 1.5 on desktop, 1 on phones). Phones get a coarser dot grid.
// Dots are drawn in four sizes, one path each, so a frame is four fills.

const FOIL = '#D9AE4A';
const SIZES = 4;

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  let W = 1, H = 1, dpr = 1, cols = 0, rows = 0, step = 0;

  const resize = (w, h, d) => {
    W = w; H = h; dpr = d;
    canvas.width = Math.max(1, Math.round(w * d));
    canvas.height = Math.max(1, Math.round(h * d));
    step = low ? 18 : 12;
    cols = Math.ceil(w / step) + 1;
    rows = Math.ceil(h / step) + 1;
  };

  const frame = (t) => {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const ox = W * 0.62, oy = H * 0.5;
    const reach = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    const paths = [];
    for (let i = 0; i < SIZES; i++) paths.push(new Path2D());
    const maxR = step * 0.46;
    for (let r = 0; r < rows; r++) {
      const y = r * step;
      for (let c = 0; c < cols; c++) {
        const x = c * step + (r % 2 ? step / 2 : 0);
        const d = Math.hypot(x - ox, y - oy);
        const fall = Math.max(0, 1 - d / reach);
        const wave = 0.5 + 0.5 * Math.sin(d * 0.045 - t * 1.6);
        const k = fall * fall * (0.25 + 0.75 * wave);
        const bucket = Math.min(SIZES - 1, Math.floor(k * SIZES * 1.15));
        if (k < 0.04) continue;
        const rad = (bucket + 1) / SIZES * maxR;
        const p = paths[bucket];
        p.moveTo(x + rad, y);
        p.arc(x, y, rad, 0, 6.2832);
      }
    }
    g.fillStyle = FOIL;
    for (let i = 0; i < SIZES; i++) {
      g.globalAlpha = 0.35 + 0.65 * ((i + 1) / SIZES);
      g.fill(paths[i]);
    }
    g.globalAlpha = 1;
  };

  return { resize, frame, still: () => frame(0.4), dispose() {} };
}
