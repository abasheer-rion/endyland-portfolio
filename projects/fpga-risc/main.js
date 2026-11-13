// 8-bit RISC page. Only this page loads this file.
// The pipeline widget: four instructions move through five stages, one clock cycle at a time. It plays on its own while it is
// on screen; the buttons pause it or step one clock. Instruction i sits in stage s during cycle i + s.
import { setupPage } from '../page.js';

setupPage();

const root = document.querySelector('[data-pipe]');
if (root) {
  const STAGES = ['F', 'D', 'E', 'M', 'W'], N = 4, LAST = N + STAGES.length - 1;
  const cards = [...root.querySelectorAll('.pipe-stages li')];
  const nows = cards.map((c) => c.querySelector('[data-now]'));
  const grid = root.querySelector('[data-grid]');
  const heads = [...root.querySelectorAll('thead th')].slice(1);
  const cycleEl = root.querySelector('[data-cycle]');
  const play = root.querySelector('[data-play]');
  const step = root.querySelector('[data-step]');
  const cells = [];
  for (let i = 1; i <= N; i++) {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); th.scope = 'row'; th.textContent = 'Instr. ' + i; tr.append(th);
    for (let c = 1; c <= LAST; c++) {
      const td = document.createElement('td'); const s = c - i;
      if (s >= 0 && s < STAGES.length) { td.textContent = STAGES[s]; td.classList.add('used'); td.dataset.i = String(i); td.dataset.s = String(s); }
      tr.append(td); cells.push(td);
    }
    grid.append(tr);
  }
  let cycle = 1, timer = 0, visible = false, playing = true;
  function render() {
    cycleEl.textContent = String(cycle);
    heads.forEach((h, k) => h.classList.toggle('on', k + 1 === cycle));
    cells.forEach((td, idx) => {
      const c = (idx % LAST) + 1;
      td.classList.toggle('on', td.classList.contains('used') && c === cycle);
      td.classList.toggle('past', td.classList.contains('used') && c < cycle);
    });
    cards.forEach((card, s) => {
      const i = cycle - s, live = i >= 1 && i <= N;
      card.classList.toggle('on', live);
      nows[s].textContent = live ? 'Instruction ' + i : ' ';
    });
  }
  let hold = 0;
  const loop = () => {
    if (hold) { hold = 0; cycle = 1; render(); return; }
    cycle = cycle >= LAST ? (hold = 1, LAST) : cycle + 1; render();
  };
  function run() { stop(); if (playing && visible) timer = setInterval(loop, 950); }
  function stop() { clearInterval(timer); timer = 0; }
  play.addEventListener('click', () => {
    playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; play.setAttribute('aria-pressed', String(playing)); run();
  });
  step.addEventListener('click', () => {
    playing = false; play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); stop(); hold = 0;
    cycle = cycle >= LAST ? 1 : cycle + 1; render();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; run(); }, { threshold: 0.25 }).observe(root);
  } else { visible = true; run(); }
  render();
}
