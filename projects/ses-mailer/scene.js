// SES mailer page stage: an outbox fires pixel envelopes at a wall of inboxes. A plain 2D canvas.
// Decoration only. It shows what the text says: a list goes in as CSV rows, mail goes out in bulk,
// some with attachments (a paper clip), and the send can be paused (main.js pauses this loop).
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import { bus } from './bus.js';

const BG = '#020A22', BODY = '#1B2E66', DARK = '#0B1D46', SLOT = '#132A60', LIP = '#3A5AA6';
const CYAN = '#3DF2FF', PINK = '#FF4FD8', YELLOW = '#FFE14D', PAPER = '#F5F1FF', FOLD = '#9AA6C8';
const ENV = ['#######', '##...##', '#.#.#.#', '#..#..#', '#######'];
const hash = (n) => { let h = Math.imul(n | 0, 2654435761); h = Math.imul(h ^ (h >>> 15), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

export function start({ canvas, low }) {
  const g = canvas.getContext('2d', { alpha: false });
  const P = 3;
  let W = 0, H = 0, cols = 4, rows = 6, wx = 0, sw = 8, sh = 6, last = -1;
  let fired = 0, landed = 0, nextFire = 0;
  const flying = [];
  const flash = new Map(); // slot index -> time it was hit
  const rate = low ? 0.28 : 0.16; // seconds between envelopes
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

  function layout() {
    rows = Math.max(4, Math.floor((H - 16) / 9));
    sh = Math.floor((H - 16) / rows);
    cols = W > 160 ? 5 : 3;
    sw = Math.max(8, Math.floor((W * 0.3) / cols));
    wx = W - cols * sw - 4;
  }
  const mouth = () => ({ x: Math.round(W * 0.17), y: Math.round(H * 0.56) });
  const slotPos = (i) => ({ x: wx + (i % cols) * sw + Math.floor(sw / 2) - 3, y: 12 + Math.floor(i / cols) * sh + Math.floor(sh / 2) - 2 });

  function fire(t, k) {
    const m = mouth(), to = Math.floor(hash(k * 7 + 3) * cols * rows), d = slotPos(to);
    flying.push({ k, t0: t, dur: 0.7 + hash(k) * 0.35, x0: m.x, y0: m.y, x1: d.x, y1: d.y, to, clip: hash(k * 13) < 0.3, arc: 6 + hash(k * 5) * (H * 0.35) });
  }

  function envelope(x, y, clip) {
    ENV.forEach((r, j) => [...r].forEach((ch, i) => rect(x + i, y + j, 1, 1, ch === '#' ? PAPER : FOLD)));
    if (clip) { rect(x + 5, y - 2, 1, 3, YELLOW); rect(x + 6, y - 2, 1, 1, YELLOW); }
  }

  function draw(t) {
    rect(0, 0, W, H, BG);
    // inbox wall
    for (let i = 0; i < cols * rows; i++) {
      const x = wx + (i % cols) * sw, y = 12 + Math.floor(i / cols) * sh;
      const hit = flash.has(i) && t - flash.get(i) < 0.35;
      rect(x, y, sw - 1, sh - 1, hit ? PINK : SLOT);
      rect(x + 1, y + 1, sw - 3, 1, hit ? PAPER : LIP);
    }
    // outbox machine with a hopper on top
    const m = mouth();
    rect(4, Math.round(H * 0.3), m.x - 4, Math.round(H * 0.62), BODY);
    rect(6, Math.round(H * 0.3) + 2, m.x - 8, 2, CYAN);
    rect(m.x - 2, m.y - 2, 3, 7, DARK);
    rect(10, Math.round(H * 0.3) - 6, m.x - 16, 6, LIP);
    for (let i = 0; i < 3; i++) rect(8 + i * 5, Math.round(H * 0.92) - 4, 3, 2, i === Math.floor(t * 4) % 3 ? CYAN : DARK);
    // CSV rows dropping into the hopper
    for (let k = 0; k < 3; k++) {
      const p = (t * 0.7 + k / 3) % 1;
      const y = Math.round(-4 + p * (H * 0.3 - 2));
      rect(12, y, m.x - 20, 2, PAPER);
      rect(12 + ((k * 3) % (m.x - 24)), y, 3, 2, CYAN);
    }
    // envelopes in flight
    for (const e of flying) {
      const p = Math.min(1, (t - e.t0) / e.dur);
      const x = e.x0 + (e.x1 - e.x0) * p;
      const y = e.y0 + (e.y1 - e.y0) * p - Math.sin(p * Math.PI) * e.arc;
      envelope(Math.round(x), Math.round(y), e.clip);
    }
  }

  function step(t) {
    while (t >= nextFire) { fire(nextFire, fired++); nextFire += rate; }
    for (let i = flying.length - 1; i >= 0; i--) {
      const e = flying[i];
      if (t - e.t0 >= e.dur) {
        flash.set(e.to, t);
        flying.splice(i, 1);
        landed++;
      }
    }
  }

  let lastSent = -1;
  return {
    resize(w, h) {
      W = Math.max(60, Math.ceil(w / P)); H = Math.max(40, Math.ceil(h / P));
      canvas.width = W; canvas.height = H;
      g.imageSmoothingEnabled = false;
      layout();
      flying.length = 0;
      last = -1;
    },
    frame(t) {
      step(t);
      const s = Math.floor(t * 15) / 15;
      if (s !== last) {
        last = s; draw(t);
        if (landed !== lastSent) { lastSent = landed; bus.onSent?.(landed); }
      }
    },
    still() {
      flying.length = 0;
      for (let k = 0; k < 6; k++) fire(-k * 0.13, k + 40);
      draw(0.0001);
    },
  };
}
