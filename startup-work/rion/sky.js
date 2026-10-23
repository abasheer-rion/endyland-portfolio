// The RION sky: a slow starfield drifting toward you and a red glow that follows the pointer.
// Shared by the scene.js of each RION page, which draws its own layer on top.
//
//   const sky = createSky({ low, home: () => [x, y] });   // home: where the glow rests, in CSS px
//   sky.resize(w, h);  sky.draw(g, dt, { still });          // g is a 2D context already scaled to CSS px
//
// The glow starts where you clicked on the page before (brand.js arrivalPoint) and eases home, so the
// theme seems to flow out of your click. Its peak alpha stays at 28% so text over it keeps AA contrast.
import { arrivalPoint } from './brand.js';
import { finePointer } from '../../shared/motion.js';

const rand = (a, b) => a + Math.random() * (b - a);

export function glowSprite(rgb = '255,49,49') {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.3, `rgba(${rgb},.5)`);
  gr.addColorStop(0.65, `rgba(${rgb},.12)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return c;
}

export function createSky({ low = false, home = null, glowAlpha = 0.28, glowSize = 0.9, follow = 0.55 } = {}) {
  const K = 1.25;
  const stars = Array.from({ length: low ? 110 : 240 }, () => {
    const z = rand(0.18, 1);
    return { x: rand(-K, K) * z, y: rand(-K, K) * z, z, tw: rand(0, 6.28), red: Math.random() < 0.07 };
  });
  const sprite = glowSprite();
  const fine = finePointer();
  let W = 1, H = 1, t = 0;
  const ptr = { x: 0, y: 0, on: false, at: -99 };
  const arrive = arrivalPoint();
  const glow = { x: null, y: null };
  const onMove = (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; ptr.at = t; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { ptr.on = false; });

  const homeAt = () => {
    const h = home && home();
    // Once the anchor scrolls away, the glow waits near the top instead of leaving the screen.
    return h ? [h[0], Math.max(h[1], H * 0.12)] : [W * 0.5, H * 0.35];
  };

  return {
    sprite,
    get glow() { return glow; },
    // Pointer position as -0.5..0.5 shares of the screen, eased. Scenes use it for parallax.
    par: { x: 0, y: 0 },
    resize(w, h) {
      W = w; H = h;
      if (glow.x === null) {
        const [hx, hy] = homeAt();
        glow.x = arrive ? arrive[0] * W : hx;
        glow.y = arrive ? arrive[1] * H : hy;
      }
    },
    draw(g, dt, { still = false, speed = 1, alpha = glowAlpha } = {}) {
      t += dt;
      const cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.5;
      // Pointer parallax, eased.
      const tx = ptr.on && fine ? ptr.x / W - 0.5 : 0, ty = ptr.on && fine ? ptr.y / H - 0.5 : 0;
      const k = still ? 1 : 1 - Math.exp(-dt * 2);
      this.par.x += (tx - this.par.x) * k;
      this.par.y += (ty - this.par.y) * k;
      const ox = -this.par.x * 26, oy = -this.par.y * 26;

      g.globalCompositeOperation = 'source-over';
      for (const s of stars) {
        if (!still) {
          s.z -= dt * 0.014 * speed;
          if (s.z < 0.18) { s.z = 1; s.x = rand(-K, K); s.y = rand(-K, K); }
        }
        const sx = cx + (s.x / s.z) * f + ox / s.z, sy = cy + (s.y / s.z) * f + oy / s.z;
        if (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4) continue;
        const near = 1 - s.z;
        const tw = still ? 1 : 0.75 + 0.25 * Math.sin(t * 1.7 + s.tw);
        g.globalAlpha = Math.min(1, (0.25 + near * 0.95) * tw);
        g.fillStyle = s.red ? '#FF6B6B' : '#FFFFFF';
        const r = 0.6 + near * 1.5;
        g.fillRect(sx - r / 2, sy - r / 2, r, r);
      }

      // Glow: toward the pointer while it moves (mouse) or for a moment after a tap, otherwise home.
      const recent = t - ptr.at < (fine ? 1e9 : 2.5);
      let [gx, gy] = homeAt();
      if (ptr.on && recent) { gx = gx + (ptr.x - gx) * follow; gy = gy + (ptr.y - gy) * follow; }
      const e = still ? 1 : 1 - Math.exp(-dt * 1.6);
      glow.x += (gx - glow.x) * e;
      glow.y += (gy - glow.y) * e;
      const size = Math.min(Math.max(W, H) * 0.8, Math.min(W, H) * glowSize * 1.6) * (still ? 1 : 1 + 0.04 * Math.sin(t * 0.8));
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = alpha;
      g.drawImage(sprite, glow.x - size / 2, glow.y - size / 2, size, size);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },
  };
}

// Helper: the center of an element in viewport CSS px, or null when it has no box.
export function centerOf(el, fx = 0.5, fy = 0.5) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return [r.left + r.width * fx, r.top + r.height * fy];
}

// Helper: sizes a canvas for CSS size w by h at pixel ratio dpr and returns its 2D context, scaled to CSS px.
export function fit(canvas, g, w, h, dpr) {
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
