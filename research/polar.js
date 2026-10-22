// Research tab: the live polar beam plot. A plain 2D canvas, run by shared/scene-loader.js (webgl: false).
// It draws the 4-element array's gain across the front half, with phosphor trails like a real scope.
// Drag or tap the plot to steer. The range slider under it does the same from the keyboard.
import { state, tick, subscribe, setSteer, gainDb, MAX } from './state.js';

const C = { bg: '#050705', grid: 'rgba(57,255,136,.22)', gridHi: 'rgba(57,255,136,.42)', text: '#8FBF9F', ph: '#39FF88', amber: '#FFB000' };
const FLOOR = -30;
const RAD = Math.PI / 180;

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, cx = 0, cy = 0, R = 1;
  let blip = 0;

  const toXY = (deg, r) => [cx + Math.sin(deg * RAD) * r, cy - Math.cos(deg * RAD) * r];
  const rOf = (db) => ((db - FLOOR) / -FLOOR) * R;

  function grid() {
    g.lineWidth = 1;
    for (let db = 0; db >= FLOOR; db -= 10) {
      g.strokeStyle = db === 0 ? C.gridHi : C.grid;
      g.beginPath(); g.arc(cx, cy, Math.max(0.5, rOf(db)), -Math.PI, 0); g.stroke();
    }
    for (let a = -90; a <= 90; a += 15) {
      g.strokeStyle = a % 30 === 0 ? C.gridHi : C.grid;
      const [x, y] = toXY(a, R);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke();
    }
    g.fillStyle = C.text;
    g.font = `${Math.round(11 * dpr)}px "JetBrains Mono", ui-monospace, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let a = -90; a <= 90; a += 30) {
      const [x, y] = toXY(a, R + 14 * dpr);
      g.fillText(`${a > 0 ? '+' : ''}${a}`, x, Math.min(y, cy - 6 * dpr));
    }
    g.textAlign = 'left';
    for (let db = -10; db >= FLOOR; db -= 10) g.fillText(`${db}`, cx + 4 * dpr, cy - rOf(db) - 7 * dpr);
  }

  function trace(steer, alpha) {
    g.beginPath();
    for (let a = -90; a <= 90; a += low ? 1.5 : 0.75) {
      const [x, y] = toXY(a, rOf(gainDb(a, steer, FLOOR)));
      if (a === -90) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.globalAlpha = alpha;
    g.fillStyle = 'rgba(57,255,136,.10)';
    g.fill();
    g.strokeStyle = C.ph; g.lineWidth = 2 * dpr;
    if (!low) { g.shadowColor = C.ph; g.shadowBlur = 10 * dpr; }
    g.stroke();
    g.shadowBlur = 0; g.globalAlpha = 1;
  }

  function markers(t) {
    // steer line
    const [sx, sy] = toXY(state.steer, R);
    g.setLineDash([6 * dpr, 5 * dpr]); g.strokeStyle = C.amber; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(sx, sy); g.stroke(); g.setLineDash([]);
    // test signal blip on the rim, with a ring that pings
    const [bx, by] = toXY(state.source, R);
    g.fillStyle = C.amber;
    g.beginPath(); g.arc(bx, by, 4 * dpr, 0, Math.PI * 2); g.fill();
    const k = (t * 0.9) % 1;
    g.strokeStyle = `rgba(255,176,0,${(1 - k) * 0.8})`; g.lineWidth = 1.2 * dpr;
    g.beginPath(); g.arc(bx, by, (4 + k * 18) * dpr, 0, Math.PI * 2); g.stroke();
  }

  function readout() {
    const f = (v) => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1).padStart(4, '0')}`;
    g.font = `${Math.round(12 * dpr)}px "JetBrains Mono", ui-monospace, monospace`;
    g.textAlign = 'left'; g.textBaseline = 'top';
    const x = 10 * dpr, y = 8 * dpr, lh = 16 * dpr;
    g.fillStyle = C.amber; g.fillText(`STEER ${f(state.steer)}`, x, y);
    g.fillStyle = C.text; g.fillText(`SIG   ${f(state.source)}`, x, y + lh);
    g.textAlign = 'right';
    g.fillStyle = state.manual ? C.amber : C.ph;
    g.fillText(state.reduced ? 'HOLD' : state.manual ? 'MANUAL' : 'LOCK', W * dpr - x, y);
    g.fillStyle = C.text; g.fillText('dB', W * dpr - x, y + lh);
  }

  function draw(t, trails) {
    if (trails) { g.fillStyle = 'rgba(5,7,5,.28)'; g.fillRect(0, 0, canvas.width, canvas.height); }
    else { g.fillStyle = C.bg; g.fillRect(0, 0, canvas.width, canvas.height); }
    grid();
    trace(state.steer, 1);
    markers(t);
    // Clear the readout corners each frame so text stays crisp over the trails.
    g.fillStyle = C.bg;
    g.fillRect(0, 0, 150 * dpr, 42 * dpr); g.fillRect(W * dpr - 90 * dpr, 0, 90 * dpr, 42 * dpr);
    readout();
  }

  // Drag or tap to steer. Horizontal drags only on touch, so the page still scrolls.
  let dragging = false;
  const steerAt = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * dpr - cx, y = cy - (e.clientY - r.top) * dpr;
    let deg = Math.atan2(x, Math.max(y, 1)) / RAD;
    deg = Math.max(-MAX, Math.min(MAX, deg));
    setSteer(deg, 7000);
  };
  const down = (e) => { dragging = true; steerAt(e); };
  const move = (e) => { if (dragging) steerAt(e); };
  const up = () => { dragging = false; };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  // With reduced motion the loop is off. Redraw on demand when the angle changes.
  const unsub = subscribe(() => { if (ctx.reduced) draw(0, false); });

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      cx = canvas.width / 2;
      cy = canvas.height - 14 * d;
      R = Math.min(canvas.width / 2 - 28 * d, canvas.height - 44 * d);
    },
    frame(t) { tick(); blip = t; draw(t, true); },
    still() { draw(blip, false); },
    dispose() {
      unsub();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
    },
  };
}
