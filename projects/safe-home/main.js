// Safe Home project page. Only this page loads this file.
// - setupPage() (projects/page.js): entrances, back links.
// - The box model opens as the "The box" section scrolls through the screen.
// - The mesh model: buttons and a live count tied to its offline/online state (events from shared/models/mesh.js).
import { setupPage, sectionProgress, whenModelReady } from '../page.js';
import { tweenNumber } from '../../shared/motion.js';

setupPage();

// Exploded view follows the scroll position of the section.
const hw = document.querySelector('#hardware');
const box = hw?.querySelector('.model-stage');
let boxP = 0;
sectionProgress(hw, (p) => { boxP = p; box?.__stage?.set('explode', p); }, { from: 0.2, span: 0.4 });
if (box) box.addEventListener('model:ready', () => box.__stage.set('explode', boxP), { once: true });

// Architecture diagram: the step on screen marks its parts in the diagram, and the packets pause when it is off screen.
const flow = document.querySelector('#flow');
const steps = [...document.querySelectorAll('#trace li')];
const marked = [...document.querySelectorAll('#flow .arch [data-id]')];
function mark(i) {
  const hit = new Set((steps[i]?.dataset.hit || '').split(' ').filter(Boolean));
  steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
  for (const el of marked) el.classList.toggle('hot', el.dataset.id.split(' ').some((t) => hit.has(t)));
}
if (flow && steps.length) {
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) mark(steps.indexOf(e.target));
  }, { rootMargin: '-42% 0px -48% 0px' });
  steps.forEach((s) => io.observe(s));
  const svgs = [...flow.querySelectorAll('svg.arch')];
  const vis = new IntersectionObserver((es) => {
    for (const e of es) { if (e.isIntersecting) e.target.unpauseAnimations?.(); else e.target.pauseAnimations?.(); }
  });
  svgs.forEach((sv) => vis.observe(sv));
}

// Mesh controls.
const meshEl = document.querySelector('#mesh .model-stage');
const ctl = document.querySelector('#mesh .model-ctl');
const state = document.querySelector('#mesh [data-state]');
const cut = document.querySelector('[data-cut]');
const reset = document.querySelector('[data-reset]');
const nOff = document.querySelector('[data-off]');
const nRep = document.querySelector('[data-rep]');
const TOTAL = 8;
let offlineIds = [];

function show(d) {
  if (!d) return;
  offlineIds = d.offline.slice();
  tweenNumber(nOff, d.offline.length);
  tweenNumber(nRep, d.reachable);
  if (reset) reset.disabled = d.offline.length === 0;
  if (cut) cut.disabled = d.offline.length >= TOTAL - 2;
}
if (meshEl) {
  whenModelReady(meshEl, (stage) => {
    if (meshEl.classList.contains('is-static')) return;
    ctl.hidden = false; state.hidden = false;
    show(stage.model.setOffline([]));
    meshEl.addEventListener('model:change', (e) => show(e.detail));
    cut.addEventListener('click', () => {
      const free = [...Array(TOTAL).keys()].filter((i) => !offlineIds.includes(i));
      if (free.length <= 2) return;
      show(stage.model.setOffline([...offlineIds, free[(offlineIds.length * 3) % free.length]]));
    });
    reset.addEventListener('click', () => show(stage.model.setOffline([])));
  });
}
