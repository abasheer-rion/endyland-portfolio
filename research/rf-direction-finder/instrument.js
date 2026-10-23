// RF direction finder page: the "find, then steer" instrument. A plain 2D canvas run by the shared loader.
// Auto mode loops the idea: listen across the front, find the beacon's peak, then turn the beam to it.
// Port mode shows the four fixed beams of a textbook 4-port Butler matrix on a 4-element line array.
// Drawn for this site from the standard array formulas, not measured data. The canvas is aria-hidden;
// the buttons and the text readout next to it carry the same information.

const RAD = Math.PI / 180;
const N = 4, D = 0.5, FLOOR = -40;
const C = { bg: '#050705', grid: 'rgba(57,255,136,.18)', gridHi: 'rgba(57,255,136,.4)', text: '#8FBF9F', ph: '#39FF88', amber: '#FFB000', dim: 'rgba(207,255,224,.28)' };
// Butler beams: progressive phase of -135, -45, +45, +135 degrees gives sin(angle) = -phase / 180.
export const PORTS = [-135, -45, 45, 135].map((p) => ({ phase: p, angle: Math.asin(-p / 180) / RAD })).sort((a, b) => a.angle - b.angle);
const BEACONS = [25, -38, 12, 47, -20, 36, -6];
const T = { listen: 2.2, found: 2.8, steer: 4.1, end: 5.8 };

function afDb(deg, steerDeg) {
  const psi = 2 * Math.PI * D * (Math.sin(deg * RAD) - Math.sin(steerDeg * RAD));
  const s = Math.sin(psi / 2);
  const af = Math.abs(s) < 1e-6 ? 1 : Math.abs(Math.sin((N * psi) / 2) / (N * s));
  const e = Math.pow(Math.max(Math.cos(deg * RAD), 0), 0.8);
  return Math.max(FLOOR, 20 * Math.log10(Math.max(af * e, 1e-6)));
}
// A MUSIC-style pseudo-spectrum: one sharp peak at the source, a low ripple elsewhere.
function specDb(deg, src) {
  const d = Math.sin(deg * RAD) - Math.sin(src * RAD);
  const p = 1 / (0.0009 + d * d * 1.8);
  const ripple = 1.6 * Math.sin(deg * 0.21 + src) + 1.1 * Math.sin(deg * 0.57);
  return Math.max(FLOOR, Math.min(0, 10 * Math.log10(p / (1 / 0.0009)) + (d * d > 0.01 ? ripple : 0)));
}
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const fmt = (v) => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1)}`;

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const readout = document.getElementById('rf-readout');
  let W = 1, H = 1, dpr = 1, stacked = false;
  let A = { x: 0, y: 0, w: 1, h: 1 }, P = { cx: 0, cy: 0, r: 1 };
  let mode = 'auto', port = 0, clock = 0, bi = 0, src = BEACONS[0], prevSteer = 0, steer = 0, lastText = '';

  function layout() {
    const cw = canvas.width, ch = canvas.height, pad = 16 * dpr;
    stacked = W < 640;
    if (stacked) {
      A = { x: pad + 34 * dpr, y: pad + 26 * dpr, w: cw - pad * 2 - 34 * dpr, h: ch * 0.36 };
      const top = A.y + A.h + 46 * dpr;
      const r = Math.min(cw / 2 - pad - 18 * dpr, ch - top - pad);
      P = { cx: cw / 2, cy: top + r + 4 * dpr, r };
    } else {
      A = { x: pad + 40 * dpr, y: pad + 30 * dpr, w: cw * 0.5 - pad * 2 - 40 * dpr, h: ch - pad * 2 - 64 * dpr };
      const r = Math.min(cw * 0.22, ch - pad * 2 - 48 * dpr);
      P = { cx: cw * 0.75, cy: ch - pad - 26 * dpr, r };
    }
  }
  const ax = (deg) => A.x + ((deg + 90) / 180) * A.w;
  const ay = (db) => A.y + (db / FLOOR) * A.h;
  const pxy = (deg, r) => [P.cx + Math.sin(deg * RAD) * r, P.cy - Math.cos(deg * RAD) * r];
  const pr = (db) => ((db - FLOOR) / -FLOOR) * P.r;
  const font = (px, w = 400) => `${w} ${Math.round(px * dpr)}px "JetBrains Mono", ui-monospace, monospace`;

  function frameA(title) {
    g.lineWidth = 1;
    for (let db = 0; db >= FLOOR; db -= 10) {
      g.strokeStyle = db === 0 ? C.gridHi : C.grid;
      g.beginPath(); g.moveTo(A.x, ay(db)); g.lineTo(A.x + A.w, ay(db)); g.stroke();
    }
    for (let a = -90; a <= 90; a += 30) {
      g.strokeStyle = a === 0 ? C.gridHi : C.grid;
      g.beginPath(); g.moveTo(ax(a), A.y); g.lineTo(ax(a), A.y + A.h); g.stroke();
    }
    g.fillStyle = C.text; g.font = font(11); g.textBaseline = 'top'; g.textAlign = 'center';
    for (let a = -90; a <= 90; a += 30) g.fillText(`${a}`, ax(a), A.y + A.h + 6 * dpr);
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let db = 0; db >= FLOOR; db -= 20) g.fillText(`${db}`, A.x - 6 * dpr, ay(db));
    g.textAlign = 'left'; g.textBaseline = 'bottom'; g.font = font(12, 600);
    g.fillText(title, A.x, A.y - 8 * dpr);
  }

  function line(fn, upto, color, width, glow, fill) {
    g.beginPath();
    let first = true;
    for (let a = -90; a <= upto; a += low ? 1 : 0.5) {
      const x = ax(a), y = ay(fn(a));
      if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y);
    }
    if (fill) {
      g.save(); g.lineTo(ax(Math.min(upto, 90)), ay(FLOOR)); g.lineTo(ax(-90), ay(FLOOR)); g.closePath();
      g.fillStyle = fill; g.fill(); g.restore();
      g.beginPath(); first = true;
      for (let a = -90; a <= upto; a += low ? 1 : 0.5) { const x = ax(a), y = ay(fn(a)); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); }
    }
    g.strokeStyle = color; g.lineWidth = width * dpr;
    if (glow && !low) { g.shadowColor = color; g.shadowBlur = 8 * dpr; }
    g.stroke(); g.shadowBlur = 0;
  }

  function polar(steerDeg, others) {
    g.lineWidth = 1;
    for (let db = 0; db >= FLOOR; db -= 10) {
      g.strokeStyle = db === 0 ? C.gridHi : C.grid;
      g.beginPath(); g.arc(P.cx, P.cy, Math.max(0.5, pr(db)), -Math.PI, 0); g.stroke();
    }
    for (let a = -90; a <= 90; a += 30) {
      g.strokeStyle = C.grid; const [x, y] = pxy(a, P.r);
      g.beginPath(); g.moveTo(P.cx, P.cy); g.lineTo(x, y); g.stroke();
    }
    g.fillStyle = C.text; g.font = font(11); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let a = -60; a <= 60; a += 60) { const [x, y] = pxy(a, P.r + 14 * dpr); g.fillText(`${a}`, x, y); }
    const lobe = (s, color, w, fill) => {
      g.beginPath();
      for (let a = -90; a <= 90; a += low ? 1.5 : 0.75) { const [x, y] = pxy(a, pr(afDb(a, s))); a === -90 ? g.moveTo(x, y) : g.lineTo(x, y); }
      if (fill) { g.fillStyle = fill; g.fill(); }
      g.strokeStyle = color; g.lineWidth = w * dpr; g.stroke();
    };
    (others || []).forEach((s) => lobe(s, C.dim, 1));
    if (!low) { g.shadowColor = C.ph; g.shadowBlur = 10 * dpr; }
    lobe(steerDeg, C.ph, 2, 'rgba(57,255,136,.10)');
    g.shadowBlur = 0;
    const [sx, sy] = pxy(steerDeg, P.r);
    g.setLineDash([5 * dpr, 5 * dpr]); g.strokeStyle = C.amber; g.lineWidth = 1.5 * dpr;
    g.beginPath(); g.moveTo(P.cx, P.cy); g.lineTo(sx, sy); g.stroke(); g.setLineDash([]);
    // The array at the center.
    g.fillStyle = C.ph;
    for (let k = 0; k < N; k++) g.fillRect(P.cx + (k - 1.5) * 9 * dpr - 3 * dpr, P.cy + 4 * dpr, 6 * dpr, 4 * dpr);
  }

  function beacon(deg, t) {
    const [bx, by] = pxy(deg, P.r + 2 * dpr);
    g.fillStyle = C.amber; g.beginPath(); g.arc(bx, by, 4.5 * dpr, 0, Math.PI * 2); g.fill();
    const k = (t * 0.9) % 1;
    g.strokeStyle = `rgba(255,176,0,${(1 - k) * 0.8})`; g.lineWidth = 1.2 * dpr;
    g.beginPath(); g.arc(bx, by, (5 + k * 18) * dpr, 0, Math.PI * 2); g.stroke();
  }

  function say(text) {
    if (readout && text !== lastText) { readout.textContent = text; lastText = text; }
  }

  function draw(t, still) {
    g.fillStyle = C.bg; g.fillRect(0, 0, canvas.width, canvas.height);
    if (mode === 'port') {
      const p = PORTS[port];
      frameA('BUTLER BEAMS  dB vs angle');
      PORTS.forEach((q, i) => { if (i !== port) line((a) => afDb(a, q.angle), 90, C.dim, 1); });
      line((a) => afDb(a, p.angle), 90, C.amber, 2, true);
      polar(p.angle, PORTS.filter((_, i) => i !== port).map((q) => q.angle));
      say(`Port ${port + 1}: phase step ${p.phase > 0 ? '+' : ''}${p.phase} degrees, beam at ${fmt(p.angle)} degrees.`);
      return;
    }
    // Auto: listen, find, steer, hold.
    const c = still ? T.end : clock;
    const upto = c < T.listen ? -90 + (c / T.listen) * 180 : 90;
    frameA('LISTEN  spectrum vs angle');
    line((a) => specDb(a, src), upto, C.ph, 1.8, true, 'rgba(57,255,136,.08)');
    if (c < T.listen) {
      g.strokeStyle = C.amber; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.moveTo(ax(upto), A.y); g.lineTo(ax(upto), A.y + A.h); g.stroke();
    } else {
      const x = ax(src);
      g.setLineDash([4 * dpr, 4 * dpr]); g.strokeStyle = C.amber; g.lineWidth = 1.5 * dpr;
      g.beginPath(); g.moveTo(x, A.y); g.lineTo(x, A.y + A.h); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.amber; g.font = font(12, 600); g.textBaseline = 'top';
      g.textAlign = src > 45 ? 'right' : 'left';
      g.fillText(`FOUND ${fmt(src)}`, x + (src > 45 ? -8 : 8) * dpr, A.y + 6 * dpr);
    }
    const k = c < T.found ? 0 : Math.min(1, (c - T.found) / (T.steer - T.found));
    steer = prevSteer + (src - prevSteer) * ease(k);
    polar(steer);
    beacon(src, t);
    if (c < T.listen) say('Auto: listening across the front of the array.');
    else if (c < T.found) say(`Auto: found the beacon at ${fmt(src)} degrees.`);
    else if (c < T.steer) say(`Auto: steering the beam to ${fmt(src)} degrees.`);
    else say(`Auto: beam locked on the beacon at ${fmt(src)} degrees.`);
  }

  function next(deg) {
    prevSteer = steer;
    if (deg === undefined) { bi = (bi + 1) % BEACONS.length; src = BEACONS[bi]; } else src = Math.round(deg * 10) / 10;
    clock = 0;
  }

  // Tap or click the plot to move the beacon there (auto mode).
  const onDown = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * dpr, y = (e.clientY - r.top) * dpr;
    let deg;
    if (x >= A.x && x <= A.x + A.w && y >= A.y - 10 * dpr && y <= A.y + A.h + 20 * dpr) deg = ((x - A.x) / A.w) * 180 - 90;
    else if (y <= P.cy + 10 * dpr) deg = Math.atan2(x - P.cx, Math.max(P.cy - y, 1)) / RAD;
    if (deg === undefined) return;
    api.setMode('auto');
    next(Math.max(-70, Math.min(70, deg)));
    if (ctx.reduced) { clock = T.end; steer = src; prevSteer = src; draw(0, true); }
    document.dispatchEvent(new CustomEvent('rf-mode', { detail: { mode: 'auto' } }));
  };
  canvas.addEventListener('pointerdown', onDown);

  const api = {
    setMode(m, i = 0) {
      if (m === 'port') { if (mode === 'auto') prevSteer = steer; mode = 'port'; port = i; }
      else if (mode !== 'auto') { mode = 'auto'; prevSteer = PORTS[port].angle; clock = T.found; }
    },
    redraw() { draw(0, ctx.reduced); },
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      layout();
    },
    frame(t, dt) {
      clock += dt;
      if (mode === 'auto' && clock > T.end) next();
      draw(t, false);
    },
    still() { if (mode === 'auto') { steer = src; prevSteer = src; } draw(0.3, true); },
    dispose() { canvas.removeEventListener('pointerdown', onDown); },
  };
  return api;
}
