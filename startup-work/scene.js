// startup-work scene: an engraved sphere made of dots, like the sun on a banknote. Decoration only.
// Points sit on a sphere. A point is inked only if its own random threshold is below the light on it, so the
// shading is real stipple: dense in the shadow, sparse in the light. The sphere turns slowly, so the dots shimmer.
// An armillary ring of dots circles it. On load the dots resolve from scattered noise (ease-out, staggered).
// The pointer tilts the light. Phones get fewer dots. shared/scene-loader.js runs the loop, pauses it off screen and caps the pixel ratio.
import { state } from './state.js';

export function start({ canvas, low }) {
  const ctx = canvas.getContext('2d');
  const N = low ? 2000 : 6000, R_N = low ? 160 : 400;
  const rnd = (() => { let s = 20260; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
  // sphere points (uniform), each with an ink threshold, a start offset and a stagger
  const P = new Float32Array(N * 3), thr = new Float32Array(N), sx = new Float32Array(N), sy = new Float32Array(N), dl = new Float32Array(N), sz = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const u = rnd() * 2 - 1, a = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    P[i * 3] = r * Math.cos(a); P[i * 3 + 1] = u; P[i * 3 + 2] = r * Math.sin(a);
    thr[i] = rnd(); sx[i] = (rnd() - 0.5) * 2.6; sy[i] = (rnd() - 0.5) * 2.6; dl[i] = rnd() * 0.55; sz[i] = rnd();
  }
  // ring points (tilted circle around the sphere)
  const Q = new Float32Array(R_N * 3), qs = new Float32Array(R_N * 2), qd = new Float32Array(R_N);
  for (let i = 0; i < R_N; i++) {
    const a = (i / R_N) * Math.PI * 2 + rnd() * 0.01, rr = 1.42 + (rnd() - 0.5) * 0.012;
    Q[i * 3] = Math.cos(a) * rr; Q[i * 3 + 1] = 0; Q[i * 3 + 2] = Math.sin(a) * rr;
    qs[i * 2] = (rnd() - 0.5) * 2.6; qs[i * 2 + 1] = (rnd() - 0.5) * 2.6; qd[i] = 0.3 + rnd() * 0.5;
  }
  let W = 0, H = 0, dpr = 1, born = -1, lx = -0.55, ly = 0.6, tilt = 0.38;
  const FOIL = '#D9AE4A', BRASS = '#B8872E';
  const ease = (x) => 1 - Math.pow(1 - x, 3);

  function draw(t, prog, rot) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const c = W / 2, R = W * 0.31;
    // light direction eased toward the pointer
    const tlx = -0.55 + state.px * 0.5 * state.ptr, tly = 0.6 + state.py * 0.35 * state.ptr;
    lx += (tlx - lx) * 0.06; ly += (tly - ly) * 0.06;
    let l0 = Math.hypot(lx, ly, 0.7); const Lx = lx / l0, Ly = ly / l0, Lz = 0.7 / l0;
    const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
    const s = Math.max(1.2, W / 300);
    // pass 1: bright dots (foil) in the lit half, pass 2: dim dots (brass) in the shadow
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? BRASS : FOIL; ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const x0 = P[i * 3], y0 = P[i * 3 + 1], z0 = P[i * 3 + 2];
        const x = x0 * cr + z0 * sr, z1 = -x0 * sr + z0 * cr;
        const y = y0 * ct - z1 * st, z = y0 * st + z1 * ct;
        if (z < -0.02) continue;                       // back of the sphere is not drawn
        // engraving: ink where it is dark. light = lambert; shadow side gets many dots, lit side few.
        const lam = Math.max(0, x * Lx + y * Ly + z * Lz);
        const dark = 1 - lam;
        if (thr[i] > Math.pow(dark, 0.85) * 0.98 + 0.06) continue;
        if ((dark > 0.55) !== !!pass) continue;
        const k = Math.min(1, Math.max(0, (prog - dl[i]) / 0.45)), e = ease(k);
        if (e <= 0) continue;
        const px = c + (x * R + sx[i] * R * (1 - e)), py = c + (-y * R + sy[i] * R * (1 - e));
        const d = (0.7 + sz[i] * 0.7) * s * (0.55 + z * 0.55);
        ctx.rect(px - d / 2, py - d / 2, d, d);
      }
      ctx.fill();
    }
    // ring: back half behind the sphere is hidden by depth test on z against sphere
    ctx.fillStyle = FOIL; ctx.beginPath();
    const rc = Math.cos(rot * 0.5 + 0.8), rs = Math.sin(rot * 0.5 + 0.8), rt = -0.35, rct = Math.cos(rt), rst = Math.sin(rt);
    for (let i = 0; i < R_N; i++) {
      const x0 = Q[i * 3], z0 = Q[i * 3 + 2];
      const x1 = x0 * rc + z0 * rs, z1 = -x0 * rs + z0 * rc;
      const ca = Math.cos(1.1), sa = Math.sin(1.1);   // tip the ring toward the viewer
      const y2 = -z1 * sa, z = z1 * ca;
      const x = x1 * rct - y2 * rst, y = x1 * rst + y2 * rct;
      const inFront = z > 0;
      if (!inFront && Math.hypot(x, y) < 1) continue;   // hidden behind the sphere
      const k = Math.min(1, Math.max(0, (prog - qd[i]) / 0.5)), e = ease(k);
      if (e <= 0) continue;
      const px = c + x * R + qs[i * 2] * R * (1 - e), py = c - y * R + qs[i * 2 + 1] * R * (1 - e);
      const d = (inFront ? 1.5 : 1) * s * 0.9;
      ctx.rect(px - d / 2, py - d / 2, d, d);
    }
    ctx.fill();
  }

  return {
    resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); },
    frame(t) {
      if (born < 0) born = t;
      const prog = Math.min(1.2, (t - born) / 1.6);
      draw(t, prog, t * 0.16 + 0.6);
    },
    still() { draw(0, 1.2, 0.9); },
  };
}
