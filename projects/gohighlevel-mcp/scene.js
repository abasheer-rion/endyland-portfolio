// GoHighLevel page stage: an 8 by 6 item inventory, one slot per tool (48 in all). A plain 2D canvas.
// Decoration only. The icons are generic CRM things (mail, calendar, contact, tag, phone, note, money,
// chart, star, chat, gear, check), not a list of the real tools.
// A cursor hops from slot to slot. When it lands, the slot lights up and throws a few sparks.
// If the visitor points at a slot (bus.want), the cursor walks there instead.
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import { bus } from './bus.js';

const COLS = 8, ROWS = 6;
const BG = '#0C0314', SLOT = '#1E0A2C', EDGE = '#3A1650', LIT = '#4A1A62', PINK = '#FF4FD8', ORANGE = '#FF9A4D', WHITE = '#F5F1FF';
// 7 by 7 icons. '#' main color, '+' second color.
const ICONS = [
  ['#######', '##...##', '#.#.#.#', '#..#..#', '#.....#', '#######', '.......'],          // mail
  ['.#...#.', '#######', '#+++++#', '#.....#', '#.#.#.#', '#.....#', '#######'],          // calendar
  ['..###..', '..###..', '..###..', '.......', '.#####.', '#######', '#######'],          // contact
  ['####...', '#.+##..', '######.', '#######', '.######', '..#####', '...###.'],          // tag
  ['##.....', '###....', '.##....', '..##...', '...###.', '....###', '.....##'],          // phone
  ['######.', '#....##', '#+++..#', '#.....#', '#+++..#', '#.....#', '#######'],          // note
  ['...#...', '.#####.', '#..#...', '.####..', '...#..#', '.#####.', '...#...'],          // money
  ['.....#.', '...#.#.', '...#.#.', '.#.#.#.', '.#.#.#.', '.#.#.#.', '#######'],          // chart
  ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '##...##'],          // star
  ['######.', '#.....#', '#.+++.#', '#.....#', '######.', '.##....', '.#.....'],          // chat
  ['.#.#.#.', '#######', '.##.##.', '###.###', '.##.##.', '#######', '.#.#.#.'],          // gear
  ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....', '.......'],          // check
];
const TINT = ['#3DF2FF', '#FFE14D', '#FF9A4D', '#3DFF8A', '#FF4FD8', '#C9BFEA'];
const hash = (n) => { let h = Math.imul(n | 0, 2654435761); h = Math.imul(h ^ (h >>> 15), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

export function start({ canvas, low }) {
  const g = canvas.getContext('2d', { alpha: false });
  const P = 3; // screen pixels per drawn pixel
  let W = 0, H = 0, cell = 8, ox = 0, oy = 0, last = -1;
  let at = 0, target = 0, stepAt = 0, landedAt = -10, nextPick = 0.8, seed = 1;
  const sparks = [];
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

  function layout() {
    cell = Math.max(8, Math.floor(Math.min((W - 8) / COLS, (H - 26) / ROWS)));
    ox = Math.floor((W - cell * COLS) / 2);
    oy = Math.floor((H - cell * ROWS) / 2);
    bus.layout = { ox, oy, cell, cols: COLS, rows: ROWS, P };
  }

  function icon(i, x, y, s, bright) {
    const rows = ICONS[i % ICONS.length];
    const c1 = TINT[(i * 5) % TINT.length], c2 = i % 2 ? ORANGE : PINK;
    rows.forEach((r, j) => [...r].forEach((ch, k) => {
      if (ch === '.') return;
      rect(x + k * s, y + j * s, s, s, ch === '+' ? c2 : (bright ? WHITE : c1));
    }));
  }

  function draw(t, still) {
    rect(0, 0, W, H, BG);
    const s = Math.max(1, Math.floor((cell - 3) / 7));
    const pad = Math.floor((cell - 7 * s) / 2);
    const since = t - landedAt;
    for (let i = 0; i < COLS * ROWS; i++) {
      const cx = ox + (i % COLS) * cell, cy = oy + Math.floor(i / COLS) * cell;
      const here = i === at;
      rect(cx + 1, cy + 1, cell - 2, cell - 2, EDGE);
      rect(cx + 2, cy + 2, cell - 4, cell - 4, here && since < 0.5 && !still ? LIT : SLOT);
      // A soft idle shimmer: each icon bobs one pixel now and then.
      const bob = !still && Math.floor(t * 2 + hash(i) * 8) % 8 === 0 ? -1 : 0;
      icon(i, cx + pad, cy + pad + bob, s, here && since < 0.18 && !still);
    }
    // cursor: a pink box with notched corners, and a pointing hand above it
    const cx = ox + (at % COLS) * cell, cy = oy + Math.floor(at / COLS) * cell;
    const blink = still || Math.floor(t * 4) % 2 === 0;
    const c = blink ? PINK : ORANGE;
    rect(cx, cy - 1, cell, 2, c); rect(cx, cy + cell - 1, cell, 2, c);
    rect(cx - 1, cy, 2, cell, c); rect(cx + cell - 1, cy, 2, cell, c);
    // sparks
    for (const p of sparks) rect(p.x, p.y, 1, 1, p.c);
  }

  function step(t, dt) {
    // pick a new target now and then, or follow the pointer
    if (bus.want >= 0) target = bus.want;
    else if (t > nextPick && at === target) {
      seed++;
      target = Math.floor(hash(seed * 31) * COLS * ROWS);
      nextPick = t + 0.9 + hash(seed) * 0.6;
    }
    // walk one slot at a time toward the target, 9 steps a second
    if (at !== target && t - stepAt > 0.11) {
      stepAt = t;
      const ac = at % COLS, ar = Math.floor(at / COLS), tc = target % COLS, tr = Math.floor(target / COLS);
      if (ac !== tc) at += tc > ac ? 1 : -1;
      else at += tr > ar ? COLS : -COLS;
      if (at === target) {
        landedAt = t;
        bus.onSlot?.(at + 1);
        const cx = ox + (at % COLS) * cell + cell / 2, cy = oy + Math.floor(at / COLS) * cell + cell / 2;
        const n = low ? 6 : 10;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          sparks.push({ x: cx, y: cy, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26 - 10, life: 0.5, c: k % 2 ? ORANGE : WHITE });
        }
      }
    }
    for (let k = sparks.length - 1; k >= 0; k--) {
      const p = sparks[k];
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
      if (p.life <= 0) sparks.splice(k, 1);
    }
  }

  return {
    resize(w, h) {
      W = Math.max(40, Math.ceil(w / P)); H = Math.max(30, Math.ceil(h / P));
      canvas.width = W; canvas.height = H;
      g.imageSmoothingEnabled = false;
      layout();
      last = -1;
    },
    // Stepped time: 15 updates a second.
    frame(t, dt) {
      step(t, dt);
      const s = Math.floor(t * 15) / 15;
      if (s !== last) { last = s; draw(t, false); }
    },
    still() { sparks.length = 0; at = 9; draw(0, true); bus.onSlot?.(at + 1); },
  };
}
