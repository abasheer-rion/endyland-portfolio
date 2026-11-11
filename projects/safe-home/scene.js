// Safe Home page scene: a mesh of small houses passing encrypted packets box to box to the one house with Internet,
// which uploads to a map where a red alert pulse appears. Click or tap a house to knock it offline and watch the
// packets reroute. A plain 2D canvas, light on phones. Decoration only: the same story is in the HTML and the buttons
// under the scene do the same thing as clicking. Contract: see shared/scene-loader.js.
import { bus } from './bus.js';

const INK = '#1D2020', RED = '#D92B12', LINE = '#CDD2D2', PAPER = '#FFFFFF', MUTE = '#5B6262', AMBER = '#B45F06';
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, time = 0, spawnIn = 0.3, delivered = 0, lastTell = '';
  let userAt = -99, autoAt = 4, autoCut = -1, autoBack = 0, hover = -1;
  const cols = low ? 4 : 5, rows = 3;
  const nodes = [], packets = [], pings = [], recent = [];

  // Houses on a loose grid. The last one is the house with Internet.
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    const j = (c * 7 + r * 13) % 5 - 2;
    nodes.push({ x: 0.07 + (c / (cols - 1)) * 0.78 + j * 0.008, y: 0.2 + r * 0.3 + (((c + r * 2) % 3) - 1) * 0.035, up: true, hold: 0 });
  }
  const GW = nodes.length;
  nodes.push({ x: 0.97, y: 0.5, up: true, gw: true, hold: 0 });
  const adj = nodes.map(() => []);
  nodes.forEach((a, i) => nodes.forEach((b, j) => {
    if (i < j && Math.hypot((a.x - b.x) * 1.6, a.y - b.y) < 0.46 * (cols === 4 ? 1.12 : 1)) { adj[i].push(j); adj[j].push(i); }
  }));

  // Shortest path over houses that are still up, from one house to the gateway.
  function route(from) {
    const prev = new Array(nodes.length).fill(-2); prev[from] = -1;
    const q = [from];
    while (q.length) {
      const n = q.shift();
      if (n === GW) break;
      for (const m of adj[n]) if (prev[m] === -2 && nodes[m].up) { prev[m] = n; q.push(m); }
    }
    if (prev[GW] === -2) return null;
    const p = [];
    for (let n = GW; n !== -1; n = prev[n]) p.unshift(n);
    return p;
  }

  // Layout: mesh on the left, map on the right. On narrow screens the map sits under the mesh.
  let M, MAP;
  function layout() {
    if (W >= 640) { const mw = Math.round(W * 0.66); M = { x: 0, y: 0, w: mw, h: H }; MAP = { x: mw + 18, y: 14, w: W - mw - 18, h: H - 28 }; }
    else { const mh = Math.round(H * 0.7); M = { x: 0, y: 0, w: W, h: mh }; MAP = { x: 8, y: mh + 6, w: W - 16, h: H - mh - 12 }; }
  }
  const px = (n) => M.x + 18 + n.x * (M.w - 36);
  const py = (n) => M.y + 14 + n.y * (M.h - 28);
  const mapPoint = (i) => { const n = nodes[i]; return { x: MAP.x + 14 + (n.y * 0.8 + 0.1) * (MAP.w - 28) * 0.9 + (n.x - 0.5) * 20, y: MAP.y + 30 + ((n.x * 0.9 + 0.05)) * (MAP.h - 50) * 0.92 }; };
  const gwXY = () => ({ x: px(nodes[GW]), y: py(nodes[GW]) });
  const size = () => Math.max(13, Math.min(22, M.w / (cols + 4.2) / 2.1));

  function house(x, y, s, up, gw, hot) {
    g.save();
    g.translate(x, y);
    g.lineJoin = 'round'; g.lineWidth = gw ? 2.4 : 2;
    g.beginPath(); g.moveTo(-s, -s * 0.1); g.lineTo(0, -s * 0.95); g.lineTo(s, -s * 0.1); g.lineTo(s, s * 0.8); g.lineTo(-s, s * 0.8); g.closePath();
    g.fillStyle = up ? PAPER : '#E7EAEA'; g.fill();
    g.strokeStyle = up ? INK : '#98A0A0'; g.setLineDash(up ? [] : [4, 3]); g.stroke(); g.setLineDash([]);
    if (up) { g.fillStyle = gw ? INK : RED; g.fillRect(-s * 0.32, s * 0.12, s * 0.64, s * 0.46); }
    else { g.strokeStyle = '#7A8282'; g.lineWidth = 2; g.beginPath(); g.moveTo(-s * .4, 0); g.lineTo(s * .4, s * .6); g.moveTo(s * .4, 0); g.lineTo(-s * .4, s * .6); g.stroke(); }
    if (hot) { g.strokeStyle = RED; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, s * 1.5, 0, 7); g.stroke(); }
    g.restore();
  }

  function drawMap() {
    const { x, y, w, h } = MAP;
    g.save();
    g.beginPath(); g.roundRect(x, y, w, h, 14); g.fillStyle = PAPER; g.fill(); g.strokeStyle = LINE; g.lineWidth = 1.5; g.stroke(); g.clip();
    g.strokeStyle = '#E4E7E7'; g.lineWidth = 1;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(x + (w / 6) * i, y); g.lineTo(x + (w / 6) * i + 14, y + h); g.stroke(); }
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(x, y + (h / 5) * i); g.lineTo(x + w, y + (h / 5) * i - 10); g.stroke(); }
    g.strokeStyle = '#C9CFCF'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x, y + h * 0.78); g.bezierCurveTo(x + w * 0.3, y + h * 0.5, x + w * 0.6, y + h * 0.65, x + w, y + h * 0.2); g.stroke();
    // a weather alert area, drawn as a hatched amber band
    g.fillStyle = 'rgba(217,119,6,.12)'; g.beginPath(); g.moveTo(x + w * 0.52, y + 26); g.lineTo(x + w, y + 26); g.lineTo(x + w, y + h * 0.38); g.lineTo(x + w * 0.7, y + h * 0.45); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(180,95,6,.55)'; g.lineWidth = 1.2; g.setLineDash([5, 4]); g.stroke(); g.setLineDash([]);
    g.restore();
    g.font = '600 14px "Geist", ui-sans-serif, system-ui, sans-serif'; g.fillStyle = MUTE; g.textAlign = 'left';
    g.fillText('Command map', x + 12, y + 20);
    if (w > 150) { g.fillStyle = AMBER; g.textAlign = 'right'; g.fillText('Weather alert', x + w - 12, y + 20); g.textAlign = 'left'; }
    // report dots and pulses
    recent.forEach((p, i) => {
      const a = Math.max(0.25, 1 - i * 0.16);
      g.fillStyle = `rgba(217,43,18,${a})`; g.beginPath(); g.arc(p.x, p.y, 4.5, 0, 7); g.fill();
    });
    pings.forEach((p) => {
      const k = Math.min(1, p.age / 1.6);
      g.strokeStyle = `rgba(217,43,18,${(1 - k) * 0.8})`; g.lineWidth = 2;
      g.beginPath(); g.arc(p.x, p.y, 5 + k * Math.min(40, MAP.w * 0.22), 0, 7); g.stroke();
    });
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    const s = size();
    // links
    g.lineWidth = 1.4; g.strokeStyle = LINE;
    nodes.forEach((a, i) => adj[i].forEach((j) => {
      if (j < i) return;
      const b = nodes[j];
      g.globalAlpha = a.up && b.up ? 1 : 0.35;
      g.beginPath(); g.moveTo(px(a), py(a)); g.lineTo(px(b), py(b)); g.stroke();
    }));
    g.globalAlpha = 1;
    // live routes: dashed red lines that march toward the gateway
    packets.forEach((p) => {
      if (!p.path) return;
      g.strokeStyle = 'rgba(217,43,18,.55)'; g.lineWidth = 2; g.setLineDash([2, 7]); g.lineDashOffset = -time * 22;
      g.beginPath(); p.path.forEach((n, k) => { const a = nodes[n]; k ? g.lineTo(px(a), py(a)) : g.moveTo(px(a), py(a)); }); g.stroke();
    });
    g.setLineDash([]); g.lineDashOffset = 0;
    // houses
    nodes.forEach((n, i) => house(px(n), py(n), n.gw ? s * 1.12 : s * 0.82, n.up, n.gw, i === hover && !n.gw));
    // gateway antenna and label
    const gw = gwXY(), gs = s * 1.12;
    g.strokeStyle = INK; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(gw.x, gw.y - gs); g.lineTo(gw.x, gw.y - gs - 8); g.stroke();
    const wave = (time * 1.3) % 1;
    for (let k = 0; k < 2; k++) { const r = 8 + ((wave + k * 0.5) % 1) * 16; g.globalAlpha = 1 - ((wave + k * 0.5) % 1); g.beginPath(); g.arc(gw.x, gw.y - gs - 8, r, -2.4, -0.74); g.stroke(); }
    g.globalAlpha = 1;
    g.font = '600 14px "Geist", ui-sans-serif, system-ui, sans-serif'; g.fillStyle = INK; g.textAlign = 'center';
    g.fillText('Internet', gw.x, gw.y + gs + 18);
    if (hover >= 0 && !nodes[hover].gw) {
      const n = nodes[hover], tx = Math.min(M.w - 70, Math.max(70, px(n)));
      g.fillStyle = INK; g.fillText(n.up ? 'Click to knock offline' : 'Click to restore', tx, py(n) + s * 0.82 + 18);
    }
    // held packets (no route right now) and moving packets
    packets.forEach((p) => {
      const a = nodes[p.cur];
      let x = px(a), y = py(a);
      if (p.state === 'move') { const b = nodes[p.next], e = ease(Math.min(1, p.t)); x += (px(b) - x) * e; y += (py(b) - y) * e; }
      if (p.state === 'wait' && !p.path) {
        g.strokeStyle = AMBER; g.lineWidth = 2; g.globalAlpha = 0.5 + 0.5 * Math.sin(time * 6);
        g.beginPath(); g.arc(x, y - s * 1.35, 6, 0, 7); g.stroke(); g.globalAlpha = 1;
      }
      g.fillStyle = RED; g.beginPath(); g.roundRect(x - 5, y - 5, 10, 10, 2.5); g.fill();
      g.fillStyle = PAPER; g.fillRect(x - 1.6, y - 1.6, 3.2, 3.2);
    });
    // upload line from the gateway to the map
    g.strokeStyle = LINE; g.lineWidth = 1.5; g.setLineDash([3, 5]);
    g.beginPath(); g.moveTo(gw.x + gs, gw.y); g.lineTo(MAP.x, MAP.y + MAP.h * 0.5); g.stroke(); g.setLineDash([]);
    pings.forEach((p) => {
      if (p.up >= 1) return;
      const sx = gw.x + gs, sy = gw.y, ex = MAP.x, ey = MAP.y + MAP.h * 0.5;
      g.fillStyle = RED; g.beginPath(); g.arc(sx + (ex - sx) * p.up, sy + (ey - sy) * p.up, 4, 0, 7); g.fill();
    });
    drawMap();
  }

  function tell() {
    const offline = nodes.filter((n) => !n.up).length;
    const key = delivered + ':' + offline;
    if (key !== lastTell && bus.onStats) { lastTell = key; bus.onStats({ delivered, offline }); }
  }

  function knock(i) {
    const n = nodes[i];
    if (!n || n.gw) return;
    n.up = !n.up;
    if (!n.up) {
      for (let k = packets.length - 1; k >= 0; k--) {
        const p = packets[k];
        if (p.cur === i && p.state === 'wait') packets.splice(k, 1);
        else if (p.next === i && p.state === 'move') { p.state = 'wait'; p.path = null; }
      }
    }
    replan(); tell();
  }
  function replan() { packets.forEach((p) => { if (p.state === 'wait') p.path = route(p.cur); }); }

  bus.knock = () => {
    userAt = time;
    const up = nodes.map((n, i) => i).filter((i) => nodes[i].up && !nodes[i].gw);
    if (up.length < 4) return false;
    // prefer a house that sits on a route today
    const on = recent.length ? up.filter((i) => route(i) && route(i).length > 2) : up;
    const pool = on.length ? on : up;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    knock(pick);
    return true;
  };
  bus.reset = () => { userAt = time; autoCut = -1; nodes.forEach((n) => { n.up = true; }); replan(); tell(); };

  function nearest(mx, my) {
    let best = -1, bd = 30 * 30;
    nodes.forEach((n, i) => { const d = (px(n) - mx) ** 2 + (py(n) - my) ** 2; if (d < bd) { bd = d; best = i; } });
    return best;
  }
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onMove = (e) => { if (e.pointerType !== 'mouse') return; const [x, y] = local(e); const h = nearest(x, y); const v = h >= 0 && !nodes[h].gw ? h : -1; if (v !== hover) { hover = v; canvas.style.cursor = v >= 0 ? 'pointer' : ''; } };
  const onLeave = () => { hover = -1; canvas.style.cursor = ''; };
  const onDown = (e) => { const [x, y] = local(e); const i = nearest(x, y); if (i >= 0 && !nodes[i].gw) { userAt = time; if (autoCut === i) autoCut = -1; knock(i); } };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerdown', onDown);

  function spawn() {
    if (packets.length >= (low ? 4 : 6)) return;
    const busy = new Set(packets.map((p) => p.origin));
    const pool = nodes.map((n, i) => i).filter((i) => nodes[i].up && !nodes[i].gw && !busy.has(i));
    if (!pool.length) return;
    const i = pool[Math.floor(Math.random() * pool.length)];
    packets.push({ origin: i, cur: i, next: -1, t: 0, state: 'wait', path: route(i) });
  }

  function step(dt) {
    time += dt;
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = 0.55 + Math.random() * 0.5; }
    // A little automatic outage every few seconds so the story plays without a click.
    if (time - userAt > 12) {
      if (autoCut < 0 && time > autoAt) {
        const cand = nodes.map((n, i) => i).filter((i) => nodes[i].up && !nodes[i].gw && i !== hover);
        const hot = cand.filter((i) => (route(i) || []).length > 3);
        const pick = (hot.length ? hot : cand)[Math.floor(Math.random() * (hot.length || cand.length))];
        if (pick != null) { autoCut = pick; autoBack = time + 4.2; knock(pick); }
      } else if (autoCut >= 0 && time > autoBack) { if (!nodes[autoCut].up) knock(autoCut); autoCut = -1; autoAt = time + 3.5; }
    }
    for (let k = packets.length - 1; k >= 0; k--) {
      const p = packets[k];
      if (p.state === 'wait') {
        p.path = route(p.cur);
        if (p.path && p.path.length > 1) { p.next = p.path[1]; p.state = 'move'; p.t = 0; }
      } else {
        p.t += dt / 0.42;
        if (p.t >= 1) {
          p.cur = p.next;
          if (p.cur === GW) {
            packets.splice(k, 1); delivered++;
            const m = mapPoint(p.origin);
            recent.unshift({ x: m.x, y: m.y }); recent.length = Math.min(recent.length, 6);
            pings.push({ x: m.x, y: m.y, age: 0, up: 0 }); tell();
          } else { p.state = 'wait'; p.path = route(p.cur); }
        }
      }
    }
    for (let k = pings.length - 1; k >= 0; k--) { const p = pings[k]; p.age += dt; p.up = Math.min(1, p.up + dt / 0.35); if (p.age > 1.7) pings.splice(k, 1); }
  }

  tell();
  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.round(w * d); canvas.height = Math.round(h * d);
      g.setTransform(d, 0, 0, d, 0, 0);
      layout();
    },
    frame(t, dt) { step(Math.min(dt || 0.016, 0.05)); draw(); },
    dispose() {
      canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerleave', onLeave); canvas.removeEventListener('pointerdown', onDown);
      bus.knock = null; bus.reset = null;
    },
  };
}
