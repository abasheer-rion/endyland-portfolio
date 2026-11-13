// ses-mailer page. Only this page loads this file.
// The Send Status replica: 2,500 made-up recipients in phases of 1,000, sent at about 14 a second while it is on screen.
import { setupPage } from '../page.js';

setupPage();

const sim = document.querySelector('[data-sim]');
if (sim) {
  const TOTAL = 2500, RATE = 14, PHASES = [1000, 1000, 500];
  const sentEl = sim.querySelector('[data-sent]');
  const pctEl = sim.querySelector('[data-pct]');
  const bar = sim.querySelector('[data-bar]');
  const fill = sim.querySelector('[data-fill]');
  const rows = [...sim.querySelectorAll('[data-phase]')];
  const pause = sim.querySelector('[data-pause]');
  const restart = sim.querySelector('[data-restart]');
  let sent = 0, last = 0, raf = 0, paused = false, visible = false;

  const paint = () => {
    const n = Math.floor(sent);
    const pct = Math.round((n / TOTAL) * 100);
    sentEl.textContent = n.toLocaleString('en-US');
    pctEl.textContent = pct + '%';
    bar.setAttribute('aria-valuenow', String(pct));
    fill.style.transform = 'scaleX(' + (n / TOTAL).toFixed(4) + ')';
    let from = 0;
    rows.forEach((r, i) => {
      const end = from + PHASES[i];
      const state = n >= end ? 'Complete' : n >= from && n > 0 ? 'Sending' : 'Queued';
      const b = r.querySelector('[data-state]');
      if (b.textContent !== state) b.textContent = state;
      r.dataset.on = state === 'Sending' ? '1' : '0';
      r.dataset.done = state === 'Complete' ? '1' : '0';
      from = end;
    });
  };
  const tick = (t) => {
    raf = 0;
    if (!last) last = t;
    const dt = Math.min(0.2, (t - last) / 1000); last = t;
    if (!paused && visible && sent < TOTAL) sent = Math.min(TOTAL, sent + RATE * dt);
    paint();
    if (visible && !paused && sent < TOTAL) raf = requestAnimationFrame(tick); else last = 0;
  };
  const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
  pause.addEventListener('click', () => {
    if (sent >= TOTAL) return;
    paused = !paused; pause.textContent = paused ? 'Resume' : 'Pause'; go();
  });
  restart.addEventListener('click', () => { sent = 0; paused = false; pause.textContent = 'Pause'; last = 0; paint(); go(); });
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) go(); }, { threshold: 0.4 }).observe(sim);
  paint();
}
