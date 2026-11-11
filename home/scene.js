// The hero beam: a 6 element antenna array and its beam, drawn only with dots, in foil gold on ink brown.
// Blue-noise points (Bridson) with a fixed random threshold each. A field says how bright each spot is;
// brightness sets dot size, and a dot shows only once the field passes its threshold. That is how engravers shade.
// Dots resolve from scattered noise on load, drift slowly, steer the lobe toward the pointer, and ripple on click.
// Decoration only. shared/scene-loader.js runs the loop (webgl: false, so a plain 2D canvas) and stops it
// whenever the canvas is off screen or the tab is hidden.

const INK = '#17100A';
const TONES = ['#5A3A22', '#8A6428', '#B8872E', '#D9AE4A', '#F3E7C8']; // saddle, dark brass, brass, foil, paper (hot core)
const N_EL = 6;
const N_PAT = 1.8; // drawn pattern is a little broader than a real 6 element array, so it reads from across a room
const TAU = 6.2832;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Bridson Poisson-disc sampling. Even spacing, no grid look.
function poisson(w, h, r, rand, cap) {
  const cell = r / Math.SQRT2, gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const grid = new Int32Array(gw * gh).fill(-1);
  const pts = [], active = [];
  const add = (x, y) => { pts.push(x, y); const i = pts.length / 2 - 1; grid[((y / cell) | 0) * gw + ((x / cell) | 0)] = i; active.push(i); };
  add(rand() * w, rand() * h);
  while (active.length && pts.length / 2 < cap) {
    const ai = (rand() * active.length) | 0, i = active[ai], px = pts[i * 2], py = pts[i * 2 + 1];
    let found = false;
    for (let k = 0; k < 22; k++) {
      const a = rand() * TAU, d = r * (1 + rand());
      const x = px + Math.cos(a) * d, y = py + Math.sin(a) * d;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const cx = (x / cell) | 0, cy = (y / cell) | 0;
      let ok = true;
      for (let yy = Math.max(0, cy - 2); yy <= Math.min(gh - 1, cy + 2) && ok; yy++) {
        for (let xx = Math.max(0, cx - 2); xx <= Math.min(gw - 1, cx + 2); xx++) {
          const j = grid[yy * gw + xx];
          if (j >= 0) { const dx = pts[j * 2] - x, dy = pts[j * 2 + 1] - y; if (dx * dx + dy * dy < r * r) { ok = false; break; } }
        }
      }
      if (ok) { add(x, y); found = true; break; }
    }
    if (!found) { active[ai] = active[active.length - 1]; active.pop(); }
  }
  return pts;
}

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (t) => 1 - Math.pow(1 - t, 3);

export async function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d', { alpha: false });
  if (!g) throw new Error('no 2d canvas');

  let W = 0, H = 0, dpr = 1;
  let bins, cnt, lastDraw = -1;
  let hx, hy, sx, sy, thr, ph, dly, rr, sphi, elf, dyh, n = 0;
  let ax = 0, ay = 0, S = 0, wide = true;   // apex of the array, a size unit, and the layout kind

  // Steering. angle is from straight up, in radians. reach scales the lobe length.
  const st = { ang: 0.18, reach: 1, tAng: 0.18, tReach: 1 };
  let lastPointer = -99, lastInput = -99, clock = 0, hoverRoom = false;
  const ripples = [];

  const setTarget = (u, v) => { st.tAng = Math.max(-1.1, Math.min(1.1, u * 1.05)); st.tReach = 1 + v * 0.28; };

  function build() {
    const rand = rng(7);
    wide = W > 900;
    // Wide screens: the words sit on the left, so dots only cover the right 62% of the plate. That lets us use many more dots
    // there (about 28k on a laptop) with no empty patches. On a phone the plate is short, so about 3k dots.
    const x0 = wide ? W * 0.38 : 0;
    const area = (W - x0) * H;
    const r = low ? Math.max(6.5, Math.sqrt(area / 2600)) : Math.max(5.6, Math.sqrt(area / 19000));
    const raw = poisson(W - x0, H, r, rand, low ? 3200 : 20000);
    n = raw.length / 2;
    bins = []; for (let b = 0; b < 5; b++) bins.push(new Float32Array(n * 3));
    cnt = new Int32Array(5);
    hx = new Float32Array(n); hy = new Float32Array(n); sx = new Float32Array(n); sy = new Float32Array(n);
    thr = new Float32Array(n); ph = new Float32Array(n); dly = new Float32Array(n);
    rr = new Float32Array(n); sphi = new Float32Array(n); elf = new Float32Array(n); dyh = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      hx[i] = raw[i * 2] + x0; hy[i] = raw[i * 2 + 1];
      sx[i] = x0 + rand() * (W - x0); sy[i] = rand() * H;
      thr[i] = Math.pow(rand(), 0.8); ph[i] = rand() * TAU;
    }
    layout();
  }

  // The apex never moves, so each dot's distance and angle from it are worked out once per layout.
  function layout() {
    ax = wide ? W * 0.64 : W * 0.5;
    ay = H * (wide ? 0.93 : 0.92);
    S = wide ? Math.min(H * 1.02, W * 0.7) : Math.min(H * 1.0, W * 1.3);
    for (let i = 0; i < n; i++) {
      const dx = hx[i] - ax, dy = ay - hy[i];
      const r = Math.hypot(dx, dy);
      const phi = Math.atan2(dx, Math.max(dy, 0.0001));
      rr[i] = r; dyh[i] = dy; sphi[i] = Math.sin(phi);
      elf[i] = Math.pow(Math.max(0, Math.cos(phi)), 0.3);
      dly[i] = Math.min(1.4, r / (S * 1.3) * 1.1 + ph[i] * 0.03);
    }
  }

  function resize(w, h, d) {
    const rebuild = !n || w !== W || h !== H;
    if (rebuild) { W = w; H = h; }
    W = w; H = h; dpr = d;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (rebuild) build();
  }

  // Beam field: array factor of N elements at half wavelength, steered to st.ang, with an element falloff.
  // Returns 0..1 brightness for dot i. Rings run outward from the apex and read as engraved wavefronts.
  function field(i, t, intro, sinAng) {
    const dy = dyh[i];
    if (dy < -S * 0.06) return 0;
    const r = rr[i];
    const half = Math.PI * (sphi[i] - sinAng) / 2;
    const sh = Math.sin(half);
    const af = Math.abs(sh) < 1e-4 ? 1 : Math.abs(Math.sin(N_PAT * half) / (N_PAT * sh));
    const sq = Math.sqrt(af);
    const G = sq * Math.sqrt(sq) * elf[i];
    const L = S * st.reach * (0.26 + 0.78 * G);          // how far this angle reaches
    const q = r / Math.max(L, 1);
    if (q > 1.3) return 0;
    let I = (Math.pow(Math.max(0, 1 - q), 0.8) * (0.5 + 0.6 * G) + Math.exp(-r / (S * 0.05)) * 0.6) * 1.3;
    const ring = 0.5 + 0.5 * Math.cos((r / (S * 0.045) - t * 0.9) * TAU * 0.35);
    I *= 0.6 + 0.4 * ring * ring;
    I *= sstep(-S * 0.06, S * 0.02, dy);                  // dots thin out just under the apex line
    // A quiet engraved ground over the whole plate so no part of it is bare: it thins toward the top and the edges.
    const up = 1 - Math.min(1, Math.max(0, dy / (S * 1.5)));
    const amb = (0.2 + 0.1 * Math.sin(r / (S * 0.07) - t * 0.5)) * (0.55 + 0.45 * up) * sstep(0, S * 0.08, dy + S * 0.05);
    return Math.max(I * 0.98, amb) * intro;
  }

  function frameAt(t, dt, still) {
    const k = still ? 1 : 1 - Math.exp(-dt * 4.2);
    if (!still) {
      if (clock - lastInput > 4) { st.tAng = 0.2 + Math.sin(t * 0.22) * 0.34; st.tReach = 1 + Math.sin(t * 0.17 + 1) * 0.08; }
      st.ang += (st.tAng - st.ang) * k; st.reach += (st.tReach - st.reach) * k;
    }
    const sinAng = Math.sin(st.ang);

    g.fillStyle = INK; g.fillRect(0, 0, W, H);

    // The array itself: six brass studs on a rail at the apex. Hardware, drawn flat.
    g.fillStyle = TONES[2];
    const rail = S * 0.1;
    for (let e = 0; e < N_EL; e++) {
      const ex = ax + (e - (N_EL - 1) / 2) * (rail / (N_EL - 1)) * 2;
      g.beginPath(); g.arc(ex, ay + 6, 2.6, 0, TAU); g.fill();
    }

    cnt.fill(0);
    const scaleR = low ? 0.9 : 1;
    for (let i = ripples.length - 1; i >= 0; i--) if (t - ripples[i].t0 > 3.2 && !still) ripples.splice(i, 1);
    const nr = ripples.length;

    for (let i = 0; i < n; i++) {
      // Resolve from noise: each dot travels from a scattered place to its home.
      const e = still ? 1 : ease(Math.min(1, Math.max(0, (t - 0.15 - dly[i]) / 1.5)));
      let x = sx[i] + (hx[i] - sx[i]) * e, y = sy[i] + (hy[i] - sy[i]) * e;
      x += Math.sin(t * 0.33 + ph[i]) * 0.9 * e; y += Math.cos(t * 0.29 + ph[i] * 1.3) * 0.9 * e;
      // Wide screens: the name sits on the left, so the left of the plate stays clear.
      const side = wide ? sstep(W * 0.38, W * 0.5, x) : 1;
      let I = side > 0 ? field(i, t, e, sinAng) * side : 0;
      let boost = 0;
      for (let k2 = 0; k2 < nr; k2++) {
        const rp = ripples[k2], age = t - rp.t0, d = Math.hypot(x - rp.x, y - rp.y);
        const front = age * 420, w = 38 + age * 26, off = (d - front) / w;
        const a = Math.exp(-off * off) * Math.exp(-age * 1.1);
        if (a > 0.01) { boost += a; const m = a * 9 / (d + 1); x += (x - rp.x) * m; y += (y - rp.y) * m; }
      }
      I = Math.min(1.25, I + boost * 0.7);
      const noise = (1 - e) * 0.5;
      const vis = Math.max(sstep(thr[i] * 0.8, thr[i] * 0.8 + 0.14, I), noise);
      if (vis < 0.04) continue;
      const rad = (0.7 + 2.0 * Math.min(1, I) + (noise > I ? 0.2 : 0)) * vis * scaleR;
      const Ic = Math.min(1, I);
      const b = noise > I ? 0 : (Ic > 0.97 ? 4 : Math.max(1, Math.min(3, (Math.pow(Ic, 0.8) * 3.99) | 0)));
      const a = bins[b], o = cnt[b]; a[o] = x; a[o + 1] = y; a[o + 2] = rad; cnt[b] = o + 3;
    }
    // Small dots are 1 or 2 pixel squares (cheap to fill); larger ones are circles.
    for (let b = 0; b < 5; b++) {
      const a = bins[b], len = cnt[b]; if (!len) continue;
      g.fillStyle = TONES[b]; g.beginPath();
      for (let j = 0; j < len; j += 3) {
        const rad = a[j + 2];
        if (rad < 1.05) g.rect(a[j] - rad, a[j + 1] - rad, rad * 2, rad * 2);
        else { g.moveTo(a[j] + rad, a[j + 1]); g.arc(a[j], a[j + 1], rad, 0, TAU); }
      }
      g.fill();
    }
  }

  // ---- input ----
  let box = null;                                   // the canvas box, read once per pointer event and never in a scroll handler
  const inside = (e) => { box = canvas.getBoundingClientRect(); return e.clientY >= box.top && e.clientY <= box.bottom && e.clientX >= box.left && e.clientX <= box.right; };
  addEventListener('pointermove', (e) => {
    if (hoverRoom || !inside(e)) return;
    lastPointer = clock;
    setTarget((e.clientX - box.left - ax) / (W * 0.5), -((e.clientY - box.top) / H - 0.5) * 2);
    lastInput = clock;
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('a,button,input')) return;
    if (!inside(e)) return;
    ripples.push({ x: e.clientX - box.left, y: e.clientY - box.top, t0: clock });
    if (ripples.length > 4) ripples.shift();
  }, { passive: true });
  document.querySelectorAll('[data-steer]').forEach((el) => {
    const [u, v] = el.dataset.steer.split(',').map(Number);
    const go = () => { hoverRoom = true; setTarget(u, v); lastInput = clock + 3; };
    const stop = () => { hoverRoom = false; lastInput = clock; };
    el.addEventListener('pointerenter', go); el.addEventListener('focusin', go);
    el.addEventListener('pointerleave', stop); el.addEventListener('focusout', stop);
  });

  return {
    resize,
    // After the intro, the idle drift only needs 30 frames a second. Pointer moves and clicks keep the full rate.
    frame(t, dt) {
      clock = t;
      const idle = t > 2.6 && !ripples.length && t - lastInput > 0.6 && t - lastPointer > 0.6;
      if (idle && t - lastDraw < 0.031) return;
      frameAt(t, lastDraw < 0 ? dt : Math.min(0.1, t - lastDraw), false);
      lastDraw = t;
    },
    still() { frameAt(3, 0, true); },
  };
}
