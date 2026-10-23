// Moving apps off VMware scene: server racks on the left, a cloud drawn in blueprint arcs on the right.
// App boxes leave their rack slots one by one and fly along high arcs into the cloud. When the racks are
// empty they are crossed out, then the drawing resets. A mouse lifts or lowers the arcs. A tap on a phone
// sends out a ping. Plain 2D canvas (mountScene with webgl: false). still() draws the move half done.

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const TAU = Math.PI * 2;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  const rand = rng(480);
  const RACKS = 3, SLOTS = low ? 7 : 10;
  let W = 1, H = 1, dpr = 1, wide = true;
  let rackX = 0, rackY = 0, rackW = 60, slotH = 14, cloudX = 0, cloudY = 0, cloudR = 80;
  let lifted = 0, order = [], next = 0, timer = 0, phase = 'move', phaseT = 0, lift = 0, liftWant = 0;
  const flying = [];
  let slots = [], docked = 0;
  const reset = () => {
    slots = Array.from({ length: RACKS * SLOTS }, () => 1);
    order = slots.map((_, i) => i).sort(() => rand() - 0.5);
    next = 0; docked = 0; flying.length = 0;
  };
  reset();
  const ptr = { x: 0, y: 0, on: false };
  const pings = [];
  const onMove = (e) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } };
  const onDown = (e) => { if (e.pointerType !== 'mouse') { pings.push({ x: e.clientX, y: e.clientY, t: 0 }); if (pings.length > 4) pings.shift(); } };
  const onOut = (e) => { if (!e.relatedTarget) ptr.on = false; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });

  // How far the footer has come up into view. Bottom-anchored drawing rests on top of it.
  const foot = document.querySelector('.site-footer');
  const footLift = () => (foot ? Math.max(0, H - foot.getBoundingClientRect().top) : 0);

  function layout() {
    wide = W >= 960;
    // Racks stay in the left margin where there is one, so they do not sit behind the text.
    rackW = wide ? Math.max(30, Math.min(52, ((W - 1160) / 2 + 20) / 3 - 14)) : 36; slotH = wide ? 14 : 10;
    rackX = wide ? 18 : 10;
    rackY = H - 24 - SLOTS * (slotH + 4);
    cloudR = wide ? Math.min(110, W * 0.08) : 54;
    cloudX = W - cloudR * 1.6 - (wide ? 20 : 4);
    cloudY = wide ? H * 0.24 : H * 0.2;
  }
  const slotPos = (i) => {
    const r = Math.floor(i / SLOTS), s = i % SLOTS;
    return [rackX + r * (rackW + 12) + rackW / 2, rackY - lifted + s * (slotH + 4) + slotH / 2];
  };
  // Docked apps fill a small grid inside the cloud.
  const dockPos = (n) => {
    const cols = 8, c = n % cols, r = Math.floor(n / cols);
    const cw = cloudR * 0.26, ch = cloudR * 0.21;
    return [cloudX - cw * 3.5 + c * cw, cloudY - ch * 1.5 + r * ch];
  };
  const arc = (a, b, k) => {
    const peak = Math.min(a[1], b[1]) - H * (0.18 + lift * 0.14);
    const mx = (a[0] + b[0]) / 2;
    const u = 1 - k;
    return [u * u * a[0] + 2 * u * k * mx + k * k * b[0], u * u * a[1] + 2 * u * k * peak + k * k * b[1]];
  };

  function cloud() {
    const r = cloudR;
    g.beginPath();
    g.arc(cloudX - r * 0.9, cloudY + r * 0.15, r * 0.5, Math.PI * 0.5, Math.PI * 1.5);
    g.arc(cloudX - r * 0.35, cloudY - r * 0.3, r * 0.6, Math.PI * 1.05, Math.PI * 1.85);
    g.arc(cloudX + r * 0.45, cloudY - r * 0.15, r * 0.55, Math.PI * 1.2, Math.PI * 2.05);
    g.arc(cloudX + r * 0.95, cloudY + r * 0.25, r * 0.4, Math.PI * 1.5, Math.PI * 0.5);
    g.closePath();
  }

  function draw(still) {
    lifted = footLift();
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineWidth = 1;
    // Flight paths: a few dashed guide arcs from each rack to the cloud.
    g.setLineDash([4, 6]); g.strokeStyle = 'rgba(156,201,255,.22)';
    for (let r = 0; r < RACKS; r++) {
      const a = slotPos(r * SLOTS), b = dockPos(r * 2);
      g.beginPath(); g.moveTo(a[0], a[1]);
      for (let i = 1; i <= 24; i++) { const p = arc(a, b, i / 24); g.lineTo(p[0], p[1]); }
      g.stroke();
    }
    g.setLineDash([]);
    // Racks.
    for (let r = 0; r < RACKS; r++) {
      const x = rackX + r * (rackW + 12), y = rackY - lifted - 10, h = SLOTS * (slotH + 4) + 16;
      g.fillStyle = 'rgba(11,37,69,.9)'; g.fillRect(x - 6, y, rackW + 12, h);
      g.strokeStyle = 'rgba(156,201,255,.55)'; g.strokeRect(x - 5.5, y + 0.5, rackW + 11, h - 1);
      for (let s = 0; s < SLOTS; s++) {
        const i = r * SLOTS + s, sy = rackY - lifted + s * (slotH + 4);
        const full = still ? (i % 2 === 0 ? 1 : 0) : slots[i];
        g.strokeStyle = full ? 'rgba(156,201,255,.7)' : 'rgba(156,201,255,.2)';
        g.strokeRect(x + 0.5, sy + 0.5, rackW - 1, slotH - 1);
        if (full) { g.fillStyle = 'rgba(143,216,255,.16)'; g.fillRect(x + 1, sy + 1, rackW - 2, slotH - 2); g.fillStyle = '#8FD8FF'; g.fillRect(x + rackW - 8, sy + slotH / 2 - 1.5, 3, 3); }
      }
      if (!still && phase === 'off') {
        const k = Math.min(1, phaseT / 0.5);
        g.strokeStyle = `rgba(255,200,87,${0.8 * k})`; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x - 4, y + 2); g.lineTo(x - 4 + (rackW + 8) * k, y + 2 + (h - 4) * k);
        g.moveTo(x + rackW + 4, y + 2); g.lineTo(x + rackW + 4 - (rackW + 8) * k, y + 2 + (h - 4) * k); g.stroke(); g.lineWidth = 1;
      }
    }
    if (wide) {
      g.font = '500 11px ui-monospace,Menlo,monospace'; g.textAlign = 'left'; g.fillStyle = 'rgba(169,195,224,.75)';
      g.fillText('BEFORE', rackX - 6, rackY - lifted - 18);
    }
    // The cloud, as a double outline.
    g.fillStyle = 'rgba(11,37,69,.9)'; cloud(); g.fill();
    g.strokeStyle = 'rgba(156,201,255,.7)'; g.stroke();
    g.save(); g.translate(cloudX, cloudY); g.scale(1.08, 1.1); g.translate(-cloudX, -cloudY);
    g.setLineDash([3, 5]); g.strokeStyle = 'rgba(156,201,255,.35)'; cloud(); g.stroke(); g.restore();
    g.setLineDash([]);
    if (wide) {
      g.font = '500 11px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillStyle = 'rgba(169,195,224,.75)';
      g.fillText('AFTER', cloudX, cloudY - cloudR * 1.05);
    }
    const n = still ? Math.ceil(RACKS * SLOTS / 2) : docked;
    const bw = cloudR * 0.2, bh = cloudR * 0.13;
    for (let i = 0; i < n; i++) {
      const [x, y] = dockPos(i);
      g.fillStyle = 'rgba(255,200,87,.75)'; g.fillRect(x - bw / 2, y - bh / 2, bw, bh);
    }
    // Apps in flight.
    if (!still) {
      for (const f of flying) {
        const k = ease(Math.min(1, f.k));
        const [x, y] = arc(f.a, f.b, k);
        const [px, py] = arc(f.a, f.b, Math.max(0, k - 0.06));
        g.strokeStyle = 'rgba(255,200,87,.35)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); g.lineWidth = 1;
        g.fillStyle = 'rgba(11,37,69,.95)'; g.fillRect(x - 9, y - 6, 18, 12);
        g.strokeStyle = '#FFC857'; g.strokeRect(x - 8.5, y - 5.5, 17, 11);
      }
    }
    for (const q of pings) {
      const k = q.t / 0.9;
      g.beginPath(); g.arc(q.x, q.y, 10 + k * 110, 0, TAU);
      g.strokeStyle = `rgba(255,200,87,${0.6 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
    }
  }

  function step(dt) {
    liftWant = ptr.on ? Math.max(-0.6, Math.min(1, (H * 0.6 - ptr.y) / (H * 0.4))) : 0;
    lift += (liftWant - lift) * Math.min(1, dt * 3);
    phaseT += dt;
    if (phase === 'move') {
      timer -= dt;
      if (timer <= 0 && next < order.length) {
        const i = order[next++];
        slots[i] = 0;
        flying.push({ i, a: slotPos(i), b: dockPos(docked + flying.length), k: 0, v: 0.45 + Math.random() * 0.2 });
        timer = low ? 0.55 : 0.32;
      }
      for (let j = flying.length - 1; j >= 0; j--) {
        const f = flying[j];
        f.k += f.v * dt;
        if (f.k >= 1) { flying.splice(j, 1); docked++; }
      }
      if (next >= order.length && !flying.length) { phase = 'off'; phaseT = 0; }
    } else if (phase === 'off' && phaseT > 2.6) {
      reset(); phase = 'move'; phaseT = 0; timer = 0.6;
    }
    for (const q of pings) q.t += dt;
    while (pings.length && pings[0].t > 0.9) pings.shift();
  }

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); layout();
      // Keep apps already in the air heading for the right places.
      flying.forEach((f, j) => { f.a = slotPos(f.i); f.b = dockPos(docked + j); });
    },
    frame(t, dt) { step(dt); draw(false); },
    still() { draw(true); },
    dispose() {
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerout', onOut);
    },
  };
}
