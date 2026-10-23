// Food bank coordinator scene: a packing line drawn like a plan. Boxes ride a belt past five volunteer
// stations; each station drops one item in. Full boxes leave at the end and add a dot to the families
// tally. Hovering near the belt, or tapping on a phone, runs the line 15% faster for a while.
// Plain 2D canvas (mountScene with webgl: false). still() draws the line stopped with packed boxes.

const TAU = Math.PI * 2;
const STATIONS = 5;

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  let W = 1, H = 1, dpr = 1, wide = true;
  let beltY = 0, bx0 = 0, bx1 = 1, box = 30, gap = 90, sx = [], tallyX = 0, tallyY = 0;
  let off = 0, speed = 1, boost = 0, families = low ? 24 : 48;
  const drops = [];
  const TALLY = low ? 60 : 120;
  const ptr = { x: 0, y: 0, on: false };
  const pings = [];
  const onMove = (e) => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } };
  const onDown = (e) => {
    if (e.pointerType === 'mouse') return;
    pings.push({ x: e.clientX, y: e.clientY, t: 0 }); if (pings.length > 4) pings.shift();
    boost = 2.5;
  };
  const onOut = (e) => { if (!e.relatedTarget) ptr.on = false; };
  addEventListener('pointermove', onMove, { passive: true });
  addEventListener('pointerdown', onDown, { passive: true });
  document.addEventListener('pointerout', onOut, { passive: true });

  // How far the footer has come up into view. Bottom-anchored drawing rests on top of it.
  const foot = document.querySelector('.site-footer');
  const footLift = () => (foot ? Math.max(0, H - foot.getBoundingClientRect().top) : 0);

  function layout() {
    wide = W >= 960;
    box = wide ? 30 : 22;
    gap = box * 3;
    beltY = H - (wide ? 70 : 48);
    bx0 = wide ? W * 0.35 : 0; bx1 = W + 10;
    sx = [];
    for (let i = 0; i < STATIONS; i++) sx.push(bx0 + (bx1 - bx0) * (0.1 + (i * 0.72) / (STATIONS - 1)));
    tallyX = W - (wide ? 24 : 12); tallyY = wide ? 96 : 76;
  }

  // Boxes are spaced evenly along the belt; off moves them. Each box's fill depends on stations passed.
  function boxes() {
    const out = [];
    const start = -((off % gap) + gap) + bx0;
    for (let x = start; x < bx1 + gap; x += gap) out.push(x);
    return out;
  }

  function person(x, y, s, active) {
    g.strokeStyle = active ? '#FFC857' : 'rgba(156,201,255,.7)';
    g.beginPath(); g.arc(x, y - s * 1.5, s * 0.55, 0, TAU); g.stroke();
    g.beginPath(); g.arc(x, y + s * 0.2, s, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
  }

  function draw(still) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.lineWidth = 1;
    g.translate(0, -footLift());
    const bh = box * 0.55;
    // Belt: two rails and rollers that turn with the belt.
    g.fillStyle = 'rgba(11,37,69,.9)'; g.fillRect(bx0 - 10, beltY - 6, bx1 - bx0 + 20, bh + 12 + box * 0.5);
    g.strokeStyle = 'rgba(156,201,255,.65)';
    g.beginPath(); g.moveTo(bx0, beltY); g.lineTo(bx1, beltY); g.moveTo(bx0, beltY + bh); g.lineTo(bx1, beltY + bh); g.stroke();
    const rr = bh * 0.32, step = bh * 1.3;
    const ang = (off / rr) % TAU;
    g.strokeStyle = 'rgba(156,201,255,.4)';
    for (let x = bx0 + step / 2; x < bx1; x += step) {
      g.beginPath(); g.arc(x, beltY + bh / 2, rr, 0, TAU);
      g.moveTo(x, beltY + bh / 2); g.lineTo(x + Math.cos(ang) * rr, beltY + bh / 2 + Math.sin(ang) * rr);
      g.stroke();
    }
    // Stations: a volunteer and a table edge above the belt.
    for (let i = 0; i < STATIONS; i++) {
      const x = sx[i], y = beltY - box * 2.4;
      const busy = drops.some((d) => d.i === i);
      person(x, y, box * 0.42, busy && !still);
      g.strokeStyle = 'rgba(156,201,255,.45)';
      g.beginPath(); g.moveTo(x - box * 0.8, y + box * 0.5); g.lineTo(x + box * 0.8, y + box * 0.5); g.stroke();
      if (wide) { g.font = '500 10px ui-monospace,Menlo,monospace'; g.textAlign = 'center'; g.fillStyle = 'rgba(169,195,224,.7)'; g.fillText(`S${i + 1}`, x, y + box * 0.5 + 13); }
    }
    // Boxes, with one band of fill per station passed.
    for (const x of boxes()) {
      const passed = still ? STATIONS : sx.filter((s) => x > s).length;
      const y = beltY - box - 1;
      g.fillStyle = 'rgba(11,37,69,.95)'; g.fillRect(x - box / 2, y, box, box);
      const bandH = (box - 6) / STATIONS;
      g.fillStyle = 'rgba(255,200,87,.55)';
      for (let k = 0; k < passed; k++) g.fillRect(x - box / 2 + 3, y + box - 3 - (k + 1) * bandH, box - 6, bandH - 1);
      g.strokeStyle = 'rgba(156,201,255,.8)'; g.strokeRect(x - box / 2 + 0.5, y + 0.5, box - 1, box - 1);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + box * 0.25); g.stroke();
    }
    // Items falling from a station into the box below.
    g.fillStyle = '#FFC857';
    for (const d of drops) {
      const y = beltY - box * 2.4 + box * 0.5 + (box * 1.4) * Math.min(1, d.k);
      g.fillRect(sx[d.i] - 3, y - 3, 6, 6);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Families tally: dots filling a block, top right.
    // Phones have no room for the tally under the two-row tab bar.
    const n = still ? TALLY : families % (TALLY + 1);
    if (wide) {
    const cols = 12, dot = wide ? 4 : 3, pitch = dot * 2.6;
    for (let k = 0; k < TALLY; k++) {
      const c = k % cols, r = Math.floor(k / cols);
      const x = tallyX - (cols - c) * pitch, y = tallyY + r * pitch;
      g.beginPath(); g.arc(x, y, dot / 2 + 0.5, 0, TAU);
      if (k < n) { g.fillStyle = 'rgba(255,200,87,.8)'; g.fill(); } else { g.strokeStyle = 'rgba(156,201,255,.3)'; g.stroke(); }
    }
      g.font = '500 11px ui-monospace,Menlo,monospace'; g.textAlign = 'right'; g.fillStyle = 'rgba(169,195,224,.8)';
      g.fillText('FAMILIES', tallyX - pitch / 2, tallyY - 12);
    }
    if (!still && speed > 1.04) {
      g.font = '600 12px ui-monospace,Menlo,monospace'; g.textAlign = 'left'; g.fillStyle = '#FFC857';
      g.fillText('+15% PACKING SPEED', bx0 + 6, beltY + bh + 22);
    }
    for (const q of pings) {
      const k = q.t / 0.9;
      g.beginPath(); g.arc(q.x, q.y, 10 + k * 110, 0, TAU);
      g.strokeStyle = `rgba(255,200,87,${0.6 * (1 - k)})`; g.lineWidth = 1.5; g.stroke(); g.lineWidth = 1;
    }
  }

  function step(dt) {
    const near = ptr.on && ptr.y + footLift() > beltY - box * 4 && ptr.x > bx0 - 40;
    boost = Math.max(0, boost - dt);
    const want = near || boost > 0 ? 1.15 : 1;
    speed += (want - speed) * Math.min(1, dt * 3);
    const before = boxes();
    const move = dt * (wide ? 60 : 44) * speed;
    off += move;
    // A box passing a station gets an item; a box leaving the belt counts one family.
    for (const x of before) {
      // Drop a little early, so the item lands as the box reaches the station.
      const lead = (wide ? 60 : 44) * speed / 2.6;
      for (let i = 0; i < STATIONS; i++) if (x <= sx[i] - lead && x + move > sx[i] - lead) drops.push({ i, k: 0 });
      if (x <= bx1 && x + move > bx1) families++;
    }
    for (let j = drops.length - 1; j >= 0; j--) { drops[j].k += dt * 2.6; if (drops[j].k >= 1) drops.splice(j, 1); }
    for (const q of pings) q.t += dt;
    while (pings.length && pings[0].t > 0.9) pings.shift();
  }

  return {
    resize(w, h, d) { W = w; H = h; dpr = d; canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); layout(); },
    frame(t, dt) { step(dt); draw(false); },
    still() { draw(true); },
    dispose() {
      removeEventListener('pointermove', onMove); removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerout', onOut);
    },
  };
}
