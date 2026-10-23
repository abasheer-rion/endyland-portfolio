// FPGA page stage, light version for phones and slow machines: the same chip and pipeline as scene.js,
// drawn flat in pixels on a plain 2D canvas (no three.js to download or run).
// Instructions ride in along the bus, step across the five stage pads (IF, ID, EX, MEM, WB) once per
// clock tick, and leave on the far side. Now and then a slot is empty (a bubble).
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import { bus } from './bus.js';

const PINK = '#FF4FD8', CYAN = '#3DF2FF', YELLOW = '#FFE14D', GREEN = '#3DFF8A';
const INSTR = [CYAN, YELLOW, GREEN, CYAN, YELLOW, GREEN, CYAN, PINK];
const TICK = 0.55;
const hash = (n) => {
  let h = Math.imul(n | 0, 374761393) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
const exists = (k) => k % 8 === 7 || hash(k) > 0.16;

export function start({ canvas }) {
  const g = canvas.getContext('2d', { alpha: false });
  const P = 3;
  let W = 0, H = 0, last = -1, lastStage = -2;
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  function draw(t, still) {
    rect(0, 0, W, H, '#0D5A33');
    // traces
    for (let i = 0; i < 9; i++) {
      const y = Math.round(H * (0.1 + i * 0.1));
      const x0 = Math.round(hash(i) * W * 0.3), x1 = Math.round(W - hash(i + 9) * W * 0.3);
      if (Math.abs(y - H / 2) > 4) rect(x0, y, x1 - x0, 1, '#2E7A3A');
    }
    const cy = Math.round(H * 0.52);
    rect(0, cy, W, 2, '#D6B24A');
    // chip with pins
    const gap = Math.max(7, Math.round(W / 18));
    const cw = gap * 6, ch = Math.round(Math.min(H * 0.56, cw * 0.7));
    const cx = Math.round(W / 2 - cw / 2), ctop = Math.round(cy - ch / 2);
    for (let x = cx + 3; x < cx + cw - 2; x += 4) { rect(x, ctop - 3, 2, 3, '#C9C2A8'); rect(x, ctop + ch, 2, 3, '#C9C2A8'); }
    rect(cx, ctop, cw, ch, '#17171C');
    rect(cx + 2, ctop + 2, 3, 3, '#3A3A44');
    // pads and instructions
    const slotX = (s) => Math.round(W / 2 + (s - 2) * gap);
    const ticks = t / TICK, now = Math.floor(ticks), f = still ? 1 : ticks - now;
    const hop = Math.min(1, Math.floor(Math.min(1, f / 0.4) * 4) / 4);
    const pad = [null, null, null, null, null];
    const items = [];
    let pink = -1;
    const lo = Math.ceil(-W / 2 / gap) - 1, hi = Math.floor(W / 2 / gap) + 3;
    for (let k = now - hi; k <= now - lo; k++) {
      if (k < 0 || !exists(k)) continue;
      const s1 = now - k, s0 = s1 - 1;
      const x = slotX(s0) + (slotX(s1) - slotX(s0)) * hop;
      const y = cy - Math.round(Math.sin(hop * Math.PI) * 3);
      items.push([x, y, INSTR[k % 8]]);
      if (s1 >= 0 && s1 <= 4) pad[s1] = INSTR[k % 8];
      if (k % 8 === 7 && s1 >= 0 && s1 <= 4) pink = s1;
    }
    const ps = Math.max(4, gap - 3);
    for (let s = 0; s < 5; s++) rect(slotX(s) - ps / 2, cy - ps / 2 - 1, ps, ps + 2, pad[s] ? '#2F3A44' : '#26303A');
    const sz = Math.max(3, Math.round(gap * 0.45));
    for (const [x, y, c] of items) rect(x - sz / 2, y - sz / 2, sz, sz, c);
    // clock LED
    rect(cx + cw + 6, ctop, 3, 3, !still && f < 0.25 ? PINK : '#3B1030');
    if (pink !== lastStage) { lastStage = pink; bus.onStage?.(pink); }
  }

  return {
    resize(w, h) {
      W = Math.max(60, Math.ceil(w / P)); H = Math.max(40, Math.ceil(h / P));
      canvas.width = W; canvas.height = H;
      g.imageSmoothingEnabled = false;
      last = -1;
    },
    frame(t) {
      const s = Math.floor((t + 12 * TICK) * 12) / 12;
      if (s !== last) { last = s; draw(s, false); }
    },
    still() { draw(23 * TICK, true); bus.onStop?.(); },
  };
}
