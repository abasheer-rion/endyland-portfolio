// Experience tab scene: a network drawn like a blueprint, with packets moving between routers.
// A plain 2D canvas (mountScene with webgl: false). Decoration only. The loader pauses it off screen
// and draws still() once for reduced motion. Phones get fewer nodes and packets.

// Small seeded random, so the network is the same on every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const rand = rng(20251022);
  const N = low ? 14 : 26;
  // Nodes keep their place as a share of the screen. The middle third stays emptier, behind the text.
  const nodes = [];
  for (let i = 0; i < N; i++) {
    let u = rand();
    if (u > 0.36 && u < 0.64) u = u < 0.5 ? u - 0.24 : u + 0.24;
    nodes.push({ u: Math.min(0.97, Math.max(0.03, u)), v: 0.06 + rand() * 0.9, links: [] });
  }
  // Each node links to its two nearest neighbors.
  const edges = [];
  const key = new Set();
  nodes.forEach((a, i) => {
    const near = nodes.map((b, j) => [j, (a.u - b.u) ** 2 + (a.v - b.v) ** 2 * 0.6]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 2);
    for (const [j] of near) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (key.has(k)) continue;
      key.add(k);
      const e = { a: i, b: j };
      edges.push(e); a.links.push(e); nodes[j].links.push(e);
    }
  });
  // Packets ride along edges and pick a new edge at each node.
  const packets = [];
  const P = low ? 8 : 20;
  for (let i = 0; i < P; i++) {
    const e = edges[Math.floor(rand() * edges.length)];
    packets.push({ e, from: rand() < 0.5 ? e.a : e.b, t: rand(), speed: 0.22 + rand() * 0.3 });
  }

  let W = 1, H = 1, dpr = 1;
  const px = (n) => [n.u * W, n.v * H];

  function draw(t) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // Links: thin cyan lines, dashed like construction lines.
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(156,201,255,.24)';
    g.setLineDash([6, 6]);
    g.beginPath();
    for (const e of edges) {
      const [x1, y1] = px(nodes[e.a]); const [x2, y2] = px(nodes[e.b]);
      g.moveTo(x1, y1); g.lineTo(x2, y2);
    }
    g.stroke();
    g.setLineDash([]);
    // Routers: a circle with a cross, the usual network symbol.
    g.strokeStyle = 'rgba(156,201,255,.55)';
    g.fillStyle = 'rgba(11,37,69,.95)';
    for (const n of nodes) {
      const [x, y] = px(n);
      g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.moveTo(x, y - 5); g.lineTo(x, y + 5); g.stroke();
    }
    // Packets: amber squares with a short trail.
    for (const p of packets) {
      const a = nodes[p.from], b = nodes[p.from === p.e.a ? p.e.b : p.e.a];
      const [x1, y1] = px(a); const [x2, y2] = px(b);
      const x = x1 + (x2 - x1) * p.t, y = y1 + (y2 - y1) * p.t;
      const back = Math.max(0, p.t - 0.08);
      const grad = g.createLinearGradient(x1 + (x2 - x1) * back, y1 + (y2 - y1) * back, x, y);
      grad.addColorStop(0, 'rgba(255,200,87,0)');
      grad.addColorStop(1, 'rgba(255,200,87,.7)');
      g.strokeStyle = grad; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x1 + (x2 - x1) * back, y1 + (y2 - y1) * back); g.lineTo(x, y); g.stroke();
      g.fillStyle = '#FFC857';
      g.fillRect(x - 3, y - 3, 6, 6);
    }
  }

  function step(dt) {
    for (const p of packets) {
      const a = nodes[p.e.a], b = nodes[p.e.b];
      const len = Math.hypot((a.u - b.u) * W, (a.v - b.v) * H) || 1;
      p.t += (p.speed * 420 * dt) / len;
      if (p.t >= 1) {
        const at = p.from === p.e.a ? p.e.b : p.e.a;
        const choices = nodes[at].links.filter((e) => e !== p.e);
        p.e = choices.length ? choices[Math.floor(rand() * choices.length)] : p.e;
        p.from = at; p.t = 0;
      }
    }
  }

  return {
    resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); },
    frame(t, dt) { step(dt); draw(t); },
    still() { draw(0); },
    dispose() {},
  };
}
