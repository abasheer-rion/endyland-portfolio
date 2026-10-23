// endyland hosting page stage, light version for phones and slow machines: the same rack, cloud and
// health check as scene.js, drawn flat in pixels on a plain 2D canvas (no three.js to download or run).
// Contract: see shared/scene-loader.js. start(ctx) returns { resize, frame, still, dispose }.
import { bus } from './bus.js';

const GREEN = '#3DFF8A', YELLOW = '#FFE14D', CYAN = '#3DF2FF', PINK = '#FF4FD8';
const CHECK = 3.2;
const hash = (n) => { let h = Math.imul(n | 0, 2654435761); h = Math.imul(h ^ (h >>> 15), 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };

export function start({ canvas }) {
  const g = canvas.getContext('2d', { alpha: false });
  const P = 3;
  let W = 0, H = 0, last = -1, lastCheck = null;
  const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  function draw(t, still) {
    const fy = Math.round(H * 0.78);
    rect(0, 0, W, H, '#0A0702');
    // floor, checkered
    for (let y = fy; y < H; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < W; x += 8) rect(x, y, 4, 4, '#251C0C');
    rect(0, fy, W, 1, '#3A2C10');
    const phase = still ? 0.2 : (t % CHECK) / CHECK;
    const checking = phase < 0.28;
    // rack
    const rw = Math.max(18, Math.round(W * 0.2)), rh = Math.round(H * 0.62);
    const rx = Math.round(W * 0.3 - rw / 2), ry = fy - rh;
    rect(rx - 1, ry - 2, rw + 2, 3, '#34343C');
    rect(rx, ry, rw, rh, '#24242A');
    const uh = Math.floor((rh - 4) / 6);
    for (let u = 0; u < 6; u++) {
      const y = ry + 3 + u * uh;
      rect(rx + 2, y, rw - 4, uh - 2, '#3A3A44');
      for (let k = 0; k < 3; k++) {
        const i = u * 3 + k;
        let c = GREEN;
        if (!checking) {
          const on = still ? hash(i) > 0.3 : hash(i * 31 + Math.floor(t * (4 + hash(i) * 6))) > 0.35;
          c = on ? (k === 2 ? YELLOW : GREEN) : '#123A20';
        }
        rect(rx + 4 + k * 3, y + Math.floor(uh / 2) - 1, 2, 2, c);
      }
    }
    // switch
    rect(rx + rw + 6, fy - 5, 12, 5, '#2E2E36');
    rect(rx + rw + 8, fy - 3, 1, 1, still || Math.floor(t * 6) % 2 ? YELLOW : '#4A3A10');
    // health check: rings of light running out along the floor, in steps
    if (checking) {
      const r = (Math.floor((phase / 0.28) * 6) + 1) * Math.max(4, Math.round(W / 22));
      const cx = rx + rw / 2;
      for (let a = 0; a < 40; a++) {
        const ang = (a / 40) * Math.PI * 2;
        const x = cx + Math.cos(ang) * r, y = fy + 6 + Math.sin(ang) * r * 0.25;
        if (y >= fy) rect(x, y, 2, 1, GREEN);
      }
    }
    // cloud
    const ccx = Math.round(W * 0.74), ccy = Math.round(H * 0.24), cr = Math.max(6, Math.round(W * 0.07));
    for (let y = -cr; y <= cr; y += 2) for (let x = -cr * 2; x <= cr * 2; x += 2) {
      const d = (x * x) / (4 * cr * cr) + (y * y) / (cr * cr) - (y < 0 && Math.abs(x) < cr ? 0.5 : 0);
      if (d < 0.75) rect(ccx + x, ccy + y, 2, 2, y > cr * 0.3 ? '#B8B2A2' : '#E9E4D6');
    }
    // cable and packets
    const path = [];
    const x0 = rx + rw - 4, y0 = ry - 2, y1 = Math.round(ccy + cr * 0.4), x1 = ccx - cr * 2 + 2;
    for (let y = y0; y >= y1; y -= 2) path.push([x0, y]);
    for (let x = x0; x <= x1; x += 2) path.push([x, y1]);
    for (const [x, y] of path) rect(x, y, 1, 1, '#5A4A20');
    for (let i = 0; i < 6; i++) {
      const up = i % 2 === 0;
      const p = (still ? i / 6 : t * 0.55 + i / 6) % 1;
      let idx = Math.floor(p * path.length);
      if (!up) idx = path.length - 1 - idx;
      const [x, y] = path[Math.max(0, Math.min(path.length - 1, idx))];
      rect(x - 1, y - 1, 3, 3, up ? CYAN : PINK);
    }
    if (checking !== lastCheck) { lastCheck = checking; bus.onCheck?.(checking); }
  }

  return {
    resize(w, h) {
      W = Math.max(60, Math.ceil(w / P)); H = Math.max(40, Math.ceil(h / P));
      canvas.width = W; canvas.height = H;
      g.imageSmoothingEnabled = false;
      last = -1;
    },
    frame(t) {
      const s = Math.floor(t * 15) / 15;
      if (s !== last) { last = s; draw(s, false); }
    },
    still() { lastCheck = null; draw(0, true); },
  };
}
