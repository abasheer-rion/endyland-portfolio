// Safe Home project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, back links) come from /shared/project.js.
// The mesh scene (scene.js, plain 2D canvas, light on phones) shows encrypted packets hopping house to house to the
// one house with Internet. The buttons under it do what clicking a house does, so the story works by keyboard too.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { onVisible } from '../../shared/motion.js';
import { bus } from './bus.js';

initProject();

// Scroll reveals for steps, numbers, timeline and limits.
const rv = [...document.querySelectorAll('.rv')];
rv.forEach((el, i) => el.style.setProperty('--d', `${(i % 4) * 90}ms`));
onVisible(rv, (el) => el.classList.add('in'), { threshold: 0.15 });
const tl = document.querySelector('.tl');
if (tl) onVisible([tl], () => tl.classList.add('drawn'), { threshold: 0.2 });

// Mesh controls.
const status = document.querySelector('[data-status]');
const nDel = document.querySelector('[data-delivered]');
const nOff = document.querySelector('[data-offline]');
const cut = document.querySelector('[data-cut]');
const reset = document.querySelector('[data-reset]');
let offline = 0;
bus.onStats = (s) => {
  if (nDel) nDel.textContent = String(s.delivered);
  if (nOff) nOff.textContent = String(s.offline);
  offline = s.offline;
  if (reset) reset.disabled = s.offline === 0;
};
if (reset) reset.disabled = true;
cut?.addEventListener('click', () => {
  const ok = bus.knock && bus.knock();
  if (status) status.textContent = ok ? `${offline} ${offline === 1 ? 'house is' : 'houses are'} offline. Reports are finding another way.` : 'Too few houses left to cut.';
});
reset?.addEventListener('click', () => {
  if (bus.reset) bus.reset();
  if (status) status.textContent = 'All houses are back online.';
});

mountScene({
  canvas: document.querySelector('.mesh-canvas'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1.5, lowDprCap: 1,
});
