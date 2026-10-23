// Sensor node page stage: two pixel sensor nodes in a field at night. A plain 2D canvas, light on phones.
// Decoration only. It shows what the text says: the old node stayed awake and its battery lasted 3 days,
// the new one sleeps between reads and its battery lasts 6 weeks.
// Left: "before". Always awake, always sending, the battery drains in a few seconds, goes flat, then refills.
// Right: "after". Wakes, sends one reading to the gateway, sleeps (Zzz). The battery barely moves.
// Time is sped up a lot so you can see it. Drawn at a fraction of screen resolution with hard pixel edges.
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import { bus } from './bus.js';

const C = {
  sky: ['#04121D', '#061A29', '#082234', '#0A2A3F'], ground: '#0B3A2A', grass: '#127A4A', post: '#6B4A2B',
  box: '#1D3442', edge: '#3DF2FF', off: '#0E2F3A', cyan: '#3DF2FF', yellow: '#FFE14D', pink: '#FF4FD8', green: '#3DFF8A',
  star: '#F5F1FF', moon: '#FFE9A6', line: '#16384A', dark: '#020A10',
};
const Z = ['####', '..#.', '.#..', '####'];
const hash = (n) => { let h = Math.imul(n | 0, 2654435761) ^ (n >>> 7); h = Math.imul(h ^ (h >>> 15), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

export function start({ canvas, low }) {
  const g = canvas.getContext('2d', { alpha: false });
  const P = low ? 3 : 4; // screen pixels per drawn pixel
  let W = 0, H = 0, awakeWas = null, last = -1;
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const sprite = (rows, x, y, c) => rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') rect(x + i, y + j, 1, 1, c); }));

  // A pixel arc around (cx, cy) of radius r, facing right, about 100 degrees wide.
  function arc(cx, cy, r, c) {
    g.fillStyle = c;
    const n = Math.max(6, Math.round(r * 1.8));
    for (let i = 0; i <= n; i++) {
      const a = -0.9 + (1.8 * i) / n;
      g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.9), 1, 1);
    }
  }

  function node(x, gy, level, awake, wave, zt, gwLit, gx) {
    // gateway: a little hut with an antenna and a window that lights up when a reading arrives
    for (let i = 0; i < 4; i++) rect(gx - 2 - i * 2, gy - 18 + i * 2, 5 + i * 4, 2, '#5A3A5E');
    rect(gx - 7, gy - 10, 15, 10, '#2C3E4C');
    rect(gx - 3, gy - 8, 5, 4, gwLit ? C.yellow : '#3A3A28');
    rect(gx + 4, gy - 4, 3, 4, C.dark);
    rect(gx + 5, gy - 26, 1, 8, '#9FB3BF');
    rect(gx + 4, gy - 27, 3, 2, gwLit ? C.yellow : '#4A4A2A');
    // post, box, antenna, LED
    rect(x - 1, gy - 13, 2, 13, C.post);
    rect(x - 5, gy - 20, 11, 7, C.edge);
    rect(x - 4, gy - 19, 9, 5, C.box);
    rect(x + 3, gy - 27, 1, 7, '#9FB3BF');
    rect(x + 2, gy - 18, 2, 2, awake ? C.cyan : C.off);
    // battery above the node
    const bx = x - 7, by = gy - 36;
    rect(bx, by, 13, 7, '#9FB3BF');
    rect(bx + 1, by + 1, 11, 5, C.dark);
    rect(bx + 13, by + 2, 1, 3, '#9FB3BF');
    const fill = Math.round(11 * Math.max(0, level));
    if (fill > 0) rect(bx + 1, by + 1, fill, 5, level > 0.5 ? C.green : level > 0.2 ? C.yellow : C.pink);
    // radio waves from the antenna tip
    if (wave >= 0) {
      const reach = gx - (x + 3) - 4;
      for (let k = 0; k < 3; k++) {
        const r = Math.floor(wave * reach) - k * 5;
        if (r > 2) arc(x + 3, gy - 27, r, k === 0 ? C.cyan : '#1E8A9A');
      }
    }
    // Zzz while asleep
    if (zt >= 0) {
      for (let k = 0; k < 3; k++) {
        const p = (zt + k / 3) % 1;
        sprite(Z, x + 6 + Math.round(p * 8), gy - 24 - Math.round(p * 14), p < 0.75 ? C.star : '#5B6F7A');
      }
    }
  }

  function draw(t, still) {
    const gy = H - Math.max(8, Math.round(H * 0.16));
    // stepped night sky
    for (let i = 0; i < 4; i++) rect(0, Math.floor((gy * i) / 4), W, Math.ceil(gy / 4) + 1, C.sky[i]);
    for (let i = 0; i < 40; i++) {
      const sx = Math.floor(hash(i) * W), sy = Math.floor(hash(i + 99) * gy * 0.7);
      const tw = still ? 1 : Math.floor(t * 2 + hash(i + 7) * 4) % 4;
      if (tw) rect(sx, sy, 1, 1, tw === 3 && i % 3 === 0 ? C.yellow : C.star);
    }
    // a pixel crescent moon
    const mx = Math.round(W / 2), my = Math.round(gy * 0.26);
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      if (x * x + y * y > 26) continue;
      if ((x - 3) * (x - 3) + (y + 2) * (y + 2) <= 22) continue;
      rect(mx + x, my + y, 1, 1, C.moon);
    }
    // ground and grass
    rect(0, gy, W, H - gy, C.ground);
    for (let x = 0; x < W; x += 3) if (hash(x) > 0.4) rect(x, gy - 1, 1, 1, C.grass);
    // dashed divider between before and after
    for (let y = 0; y < gy; y += 4) rect(Math.round(W / 2), y, 1, 2, C.line);

    const half = W / 2;
    // Before: always on. Drains in 5 s, sits flat for 1 s, refills.
    const tb = still ? 2.4 : t % 6;
    const lb = tb < 5 ? 1 - tb / 5 : 0;
    const onB = lb > 0;
    node(Math.round(half * 0.3), gy, lb, onB, onB ? (still ? 0.6 : (t % 0.7) / 0.7) : -1, -1, onB && (still || (t % 0.7) > 0.55), Math.round(half * 0.8));
    // After: sleeps 2.6 s, wakes 0.6 s to send. The battery drains 14 times slower.
    const cyc = still ? 1.5 : t % 3.2;
    const awake = cyc < 0.6;
    const la = 1 - ((still ? 10 : t) % 70) / 70;
    node(Math.round(half + half * 0.3), gy, la, awake, awake ? cyc / 0.6 : -1, awake ? -1 : (still ? 0.3 : (t * 0.5) % 1), awake && cyc > 0.45, Math.round(half + half * 0.8));
    if (awake !== awakeWas) { awakeWas = awake; bus.onState?.(awake); }
  }

  return {
    resize(w, h) {
      W = Math.max(40, Math.ceil(w / P)); H = Math.max(30, Math.ceil(h / P));
      canvas.width = W; canvas.height = H;
      g.imageSmoothingEnabled = false;
      last = -1;
    },
    // Stepped time: the picture updates 12 times a second, like an old game.
    frame(t) {
      const s = Math.floor(t * 12) / 12;
      if (s !== last) { last = s; draw(s, false); }
    },
    still() { draw(0, true); },
  };
}
