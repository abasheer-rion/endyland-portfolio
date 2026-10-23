// RION Solutions page scene: the RION sky plus the logo mark in 3D, drawn on a plain 2D canvas so phones stay light.
// The mark sits in the hero's .rion-stage box: an upside-down triangle, a hexagon that turns on its own axis, and the
// red gear spinning inside it, with an orbit ring. It leans toward the pointer and turns a little as you scroll.
import { createSky, centerOf, fit } from './sky.js';

const C = [0, 0.1]; // the triangle's incenter, where the hexagon and gear sit

function triangle(sc, z) {
  return [[-1.05, 0.7], [1.05, 0.7], [0, -1.1]].map(([x, y]) => [C[0] + (x - C[0]) * sc, C[1] + (y - C[1]) * sc, z]);
}
function hexagon(r, z) {
  return Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 2 + (k * Math.PI) / 3;
    return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, z];
  });
}
function gear(teeth, ro, ri, z) {
  const pts = [], step = (Math.PI * 2) / teeth;
  for (let k = 0; k < teeth; k++) {
    const a = k * step;
    pts.push([Math.cos(a) * ri, Math.sin(a) * ri, z]);
    pts.push([Math.cos(a + step * 0.12) * ro, Math.sin(a + step * 0.12) * ro, z]);
    pts.push([Math.cos(a + step * 0.42) * ro, Math.sin(a + step * 0.42) * ro, z]);
    pts.push([Math.cos(a + step * 0.54) * ri, Math.sin(a + step * 0.54) * ri, z]);
  }
  return pts;
}

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const stage = document.querySelector('.rion-stage');
  const h1 = document.querySelector('.proj-hero h1');
  const sky = createSky({ low, home: () => centerOf(h1, 0.35, 0.5) });
  let W = 1, H = 1, dpr = 1, t = 0;

  const tri = [triangle(1, 0.07), triangle(1, -0.07)];
  const triIn = triangle(0.84, 0.07);
  const hex = [hexagon(0.5, 0.16), hexagon(0.5, -0.16)];
  const gr = [gear(8, 0.34, 0.27, 0.07), gear(8, 0.34, 0.27, -0.07)];

  function draw(dt, still) {
    t += dt;
    g.clearRect(0, 0, W, H);
    sky.draw(g, dt, { still });
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    if (r.bottom < -40 || r.top > H + 40 || r.width < 10) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.5;
    const s = Math.min(r.width, r.height) * (W < 760 ? 0.4 : 0.36);
    const yaw = 0.38 * Math.sin(t * 0.33) + sky.par.x * 0.6 + scrollY * 0.0011 + (still ? 0.32 : 0);
    const pitch = 0.12 + sky.par.y * 0.35 + (still ? 0.06 : 0);
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cxp = Math.cos(pitch), sxp = Math.sin(pitch);

    // local: optional spin of the hexagon around its vertical axis, and of the gear in its own plane
    const P = (p, hexYaw = 0, gearSpin = null) => {
      let [x, y, z] = p;
      if (gearSpin !== null) {
        const c = Math.cos(gearSpin), si = Math.sin(gearSpin);
        const gx = x * c - y * si, gy = x * si + y * c;
        x = gx + C[0]; y = gy + C[1];
      }
      if (hexYaw) {
        const c = Math.cos(hexYaw), si = Math.sin(hexYaw), lx = x - C[0];
        x = C[0] + lx * c + z * si; z = -lx * si + z * c;
      }
      const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
      const y1 = y * cxp - z1 * sxp, z2 = y * sxp + z1 * cxp;
      const d = 5 / (5 - z2);
      return [cx + x1 * s * d, cy - y1 * s * d];
    };
    const loop = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    const ties = (a, b, every = 1) => { g.beginPath(); for (let i = 0; i < a.length; i += every) { g.moveTo(...a[i]); g.lineTo(...b[i]); } };

    // glow behind the mark
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.5;
    const gs = s * 3.4;
    g.drawImage(sky.sprite, cx - gs / 2, cy - gs / 2 - s * 0.1, gs, gs);
    g.globalCompositeOperation = 'source-over';

    // orbit ring in the floor plane, with a red dot riding it
    const ring = Array.from({ length: 64 }, (_, i) => { const a = (i / 64) * Math.PI * 2; return P([Math.cos(a) * 1.55, -0.2, Math.sin(a) * 1.55]); });
    g.globalAlpha = 0.22; g.strokeStyle = '#FFFFFF'; g.lineWidth = 1; loop(ring); g.stroke();
    const oa = t * 0.7 + 1.1, dot = P([Math.cos(oa) * 1.55, -0.2, Math.sin(oa) * 1.55]);
    g.globalAlpha = 1; g.fillStyle = '#FF3131'; g.beginPath(); g.arc(dot[0], dot[1], 3.2, 0, Math.PI * 2); g.fill();

    const hy = still ? 0.5 : t * 0.55;
    const spin = still ? 0.2 : t * 0.45;
    const T = tri.map((l) => l.map((p) => P(p)));
    const X = hex.map((l) => l.map((p) => P(p, hy)));
    const G = gr.map((l) => l.map((p) => P(p, hy * 0.35, spin)));

    g.lineJoin = 'round';
    // back faces
    g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.2;
    g.globalAlpha = 0.22; loop(T[1]); g.stroke(); ties(T[0], T[1]); g.stroke();
    g.globalAlpha = 0.3; loop(X[1]); g.stroke(); ties(X[0], X[1]); g.stroke();
    g.strokeStyle = '#FF3131'; g.globalAlpha = 0.45; loop(G[1]); g.stroke(); ties(G[0], G[1], 2); g.stroke();
    // front faces
    g.strokeStyle = '#FFFFFF';
    g.globalAlpha = 0.35; g.lineWidth = 1; loop(triIn.map((p) => P(p))); g.stroke();
    g.globalAlpha = 0.85; g.lineWidth = 2; loop(T[0]); g.stroke();
    g.globalAlpha = 0.9; g.lineWidth = 1.8; loop(X[0]); g.stroke();
    // the gear: solid red with a round hole
    const hole = Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return P([Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.07], hy * 0.35, spin); });
    g.globalAlpha = 0.18; g.strokeStyle = '#FF3131'; g.lineWidth = 9; loop(G[0]); g.stroke();
    g.globalAlpha = 0.95; g.fillStyle = '#FF3131';
    g.beginPath();
    G[0].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    hole.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.fill('evenodd');
    g.globalAlpha = 1;
  }

  // With reduced motion the loader draws one still frame. Redraw it when the page scrolls so the mark stays put.
  let queued = false;
  addEventListener('scroll', () => {
    if (!ctx.reduced || queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(0, true); });
  }, { passive: true });

  return {
    resize(w, h, d) { W = w; H = h; dpr = d; fit(canvas, g, w, h, dpr); sky.resize(w, h); },
    frame(_t, dt) { draw(dt, false); },
    still() { draw(0, true); },
  };
}
