// Verizon page scene: a carrier backbone drawn like a blueprint. A ring of core routers, edge routers
// wired in with square-cornered runs, and amber packets going round. Three core nodes stand for the
// three projects; hovering a project card sends packets to its node (focus(i), called from main.js).
// A drafting crosshair follows a mouse. A tap on a phone sends out a ping.
// Plain 2D canvas (mountScene with webgl: false). The loader pauses it off screen and calls still()
// once for reduced motion. Phones get fewer packets and edge routers.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const TAU = Math.PI * 2;
const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
const LABELS = ['TRUNK TOOL', 'BACKUPS', 'CLOUD MOVE'];
const SPECIAL = [1, 4, 7];

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  const rand = rng(70);
  const CORE = 10;
  const edges = [];
  const EDGE_N = low ? 9 : 16;
  for (let i = 0; i < EDGE_N; i++) {
    edges.push({ core: Math.floor(rand() * CORE), da: (rand() - 0.5) * 0.5, r: 1.45 + rand() * 0.7, flip: rand() < 0.5 });
  }
  const ring = [];
  for (let i = 0; i < (low ? 7 : 14); i++) ring.push({ a: rand() * TAU, v: (0.12 + rand() * 0.12) * (rand() < 0.3 ? -1 : 1) });
  const runs = [];
  for (let i = 0; i < (low ? 4 : 9); i++) runs.push({ e: i % EDGE_N, s: rand(), v: 0.25 + rand() * 0.25, inbound: rand() < 0.5 });

  let W = 1, H = 1, dpr = 1, cx = 0, cy = 0, rx = 1, ry = 1;
  let focus = -1, glow = [0, 0, 0];
  const ptr = { x: 0, y: 0, on: false };
  const pings = [];
  const onMove = (e) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } };
  const onDown = (e) => { if (e.pointerType !== 'mouse') { pings.push({ x: e.clientX, y: e.clientY, t: 0 }); if (pings.length > 4) pings.shift(); } };
  const onOut = (e) => { if (!e.relatedTarget) ptr.on = false; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });

  function layout() {
    const wide = W >= 960;
    // Phones: the ring sits low and to the right, half off screen, away from the text.
    cx = wide ? W * 0.76 : W * 0.86;
    cy = H * (wide ? 0.56 : 0.8);
    const R = Math.min(W, H) * (wide ? 0.3 : 0.5);
    rx = R * 1.1; ry = R * 0.78;
  }
  const corePos = (i, rot) => {
    const a = (i / CORE) * TAU + rot;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  };
  const edgePos = (e, rot) => {
    const a = (e.core / CORE) * TAU + rot + e.da;
    return [cx + Math.cos(a) * rx * e.r, cy + Math.sin(a) * ry * e.r];
  };
  // A square-cornered run from an edge router to its core router.
  const runPts = (e, rot) => {
    const [x1, y1] = edgePos(e, rot); const [x2, y2] = corePos(e.core, rot);
    return e.flip ? [[x1, y1], [x2, y1], [x2, y2]] : [[x1, y1], [x1, y2], [x2, y2]];
  };
  const along = (pts, k) => {
    const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    let d = k * (l1 + l2);
    if (d <= l1) { const f = l1 ? d / l1 : 0; return [pts[0][0] + (pts[1][0] - pts[0][0]) * f, pts[0][1] + (pts[1][1] - pts[0][1]) * f]; }
    d -= l1; const f = l2 ? d / l2 : 0;
    return [pts[1][0] + (pts[2][0] - pts[1][0]) * f, pts[1][1] + (pts[2][1] - pts[1][1]) * f];
  };
  const partial = (pts, k) => {
    const end = along(pts, k);
    const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    const l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]);
    g.moveTo(pts[0][0], pts[0][1]);
    if (k * (l1 + l2) > l1) g.lineTo(pts[1][0], pts[1][1]);
    g.lineTo(end[0], end[1]);
  };
  function router(x, y, r, hi) {
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = 'rgba(11,37,69,.96)'; g.fill();
    g.strokeStyle = hi ? '#FFC857' : 'rgba(156,201,255,.6)'; g.stroke();
    g.beginPath(); g.moveTo(x - r * 0.55, y); g.lineTo(x + r * 0.55, y); g.moveTo(x, y - r * 0.55); g.lineTo(x, y + r * 0.55); g.stroke();
  }

  function draw(t, p) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const wide = W >= 760;
    const rot = -(scrollY || 0) * 0.0005 + t * 0.012;
    g.lineWidth = 1;
    // Edge runs: dashed construction lines.
    g.setLineDash([5, 5]);
    g.strokeStyle = 'rgba(156,201,255,.26)';
    g.beginPath();
    for (const e of edges) partial(runPts(e, rot), ease(p * 1.4 - 0.3));
    g.stroke();
    g.setLineDash([]);
    // The ring: a double line, like a cable run.
    g.strokeStyle = 'rgba(156,201,255,.42)';
    for (const k of [1, 1.06]) {
      g.beginPath();
      g.ellipse(cx, cy, rx * k, ry * k, 0, rot, rot + TAU * ease(p));
      g.stroke();
    }
    // Ring packets.
    if (p >= 1) {
      for (const q of ring) {
        const a = q.a + rot;
        const x = cx + Math.cos(a) * rx * 1.03, y = cy + Math.sin(a) * ry * 1.03;
        g.fillStyle = 'rgba(255,200,87,.85)'; g.fillRect(x - 2.5, y - 2.5, 5, 5);
      }
      for (const q of runs) {
        const pts = runPts(edges[q.e], rot);
        const [x, y] = along(pts, q.inbound ? q.s : 1 - q.s);
        g.fillStyle = '#FFC857'; g.fillRect(x - 3, y - 3, 6, 6);
      }
    }
    // Routers.
    const fade = ease(p * 1.6 - 0.4);
    g.globalAlpha = fade;
    for (const e of edges) { const [x, y] = edgePos(e, rot); router(x, y, 6, false); }
    let near = -1, nd = 1e9;
    for (let i = 0; i < CORE; i++) {
      const [x, y] = corePos(i, rot);
      const si = SPECIAL.indexOf(i);
      const hi = si >= 0 && glow[si] > 0.05;
      if (ptr.on) { const d = Math.hypot(ptr.x - x, ptr.y - y); if (d < nd) { nd = d; near = i; } }
      if (si >= 0) {
        // Project nodes are drawn square, with a leader line out to a label.
        const s = 11 + glow[si] * 4;
        g.fillStyle = 'rgba(11,37,69,.96)'; g.fillRect(x - s, y - s, s * 2, s * 2);
        g.strokeStyle = hi ? '#FFC857' : 'rgba(156,201,255,.75)'; g.strokeRect(x - s, y - s, s * 2, s * 2);
        g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke();
        if (glow[si] > 0.02) {
          g.beginPath(); g.arc(x, y, s + 8 + glow[si] * 10, 0, TAU);
          g.strokeStyle = `rgba(255,200,87,${0.5 * glow[si]})`; g.stroke();
        }
        if (!wide) continue;
        const lx = x + (x > cx ? 34 : -34), ly = y - 26;
        g.strokeStyle = hi ? 'rgba(255,200,87,.8)' : 'rgba(156,201,255,.4)';
        g.beginPath(); g.moveTo(x, y); g.lineTo(lx, ly); g.lineTo(lx + (x > cx ? 70 : -70), ly); g.stroke();
        g.font = '500 11px ui-monospace,Menlo,monospace';
        g.textAlign = x > cx ? 'left' : 'right';
        g.fillStyle = hi ? '#FFC857' : 'rgba(169,195,224,.75)';
        g.fillText(LABELS[si], lx + (x > cx ? 4 : -4), ly - 6);
      } else {
        router(x, y, 9, false);
      }
    }
    g.globalAlpha = 1;
    // Drafting crosshair with a coordinate readout.
    if (ptr.on) {
      g.strokeStyle = 'rgba(156,201,255,.16)';
      g.beginPath(); g.moveTo(0, ptr.y + 0.5); g.lineTo(W, ptr.y + 0.5); g.moveTo(ptr.x + 0.5, 0); g.lineTo(ptr.x + 0.5, H); g.stroke();
      g.strokeStyle = 'rgba(255,200,87,.7)';
      g.strokeRect(ptr.x - 6, ptr.y - 6, 12, 12);
      g.font = '500 11px ui-monospace,Menlo,monospace'; g.textAlign = 'left';
      g.fillStyle = 'rgba(169,195,224,.8)';
      const pad = (n) => String(Math.max(0, Math.round(n))).padStart(4, '0');
      g.fillText(`X ${pad(ptr.x)}  Y ${pad(ptr.y + (scrollY || 0))}`, ptr.x + 12, ptr.y - 10);
      if (near >= 0 && nd < 40) {
        const [x, y] = corePos(near, rot);
        g.beginPath(); g.arc(x, y, 16, 0, TAU); g.strokeStyle = 'rgba(255,200,87,.8)'; g.stroke();
      }
    }
    for (const q of pings) {
      const k = q.t / 0.9;
      g.beginPath(); g.arc(q.x, q.y, 10 + k * 110, 0, TAU);
      g.strokeStyle = `rgba(255,200,87,${0.6 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
    }
  }

  function step(dt) {
    for (const q of ring) {
      let v = q.v;
      if (focus >= 0) {
        // Packets speed toward the focused project node.
        const target = (SPECIAL[focus] / CORE) * TAU;
        const d = Math.atan2(Math.sin(target - q.a), Math.cos(target - q.a));
        v = Math.sign(d || 1) * Math.max(0.15, Math.min(1.4, Math.abs(d) * 1.6));
        if (Math.abs(d) < 0.04) q.a = (target + (Math.random() - 0.5) * 3) % TAU;
      }
      q.a = (q.a + v * dt + TAU) % TAU;
    }
    for (const q of runs) {
      q.s += q.v * dt;
      if (q.s >= 1) { q.s = 0; q.e = Math.floor(Math.random() * edges.length); q.inbound = Math.random() < 0.5; }
    }
    for (let i = 0; i < 3; i++) glow[i] += ((i === focus ? 1 : 0) - glow[i]) * Math.min(1, dt * 6);
    for (const q of pings) q.t += dt;
    while (pings.length && pings[0].t > 0.9) pings.shift();
  }

  return {
    resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); layout(); },
    frame(t, dt) { step(dt); draw(t, Math.min(1, t / 1.6)); },
    still() { glow = glow.map((v, i) => (i === focus ? 1 : 0)); draw(0, 1); },
    focus(i) { focus = i; },
    dispose() {
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerout', onOut);
    },
  };
}
