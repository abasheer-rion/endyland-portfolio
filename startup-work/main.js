// startup-work tab: page behaviour. Only this page loads this file.
// - Starts the stipple sphere after first paint (shared loader, which pauses it off screen and in a hidden tab).
// - Reveals the company sections as they scroll in (IntersectionObserver).
// - A mouse tilts the sphere's light a little.
import { mountScene } from '../shared/scene-loader.js';
import { finePointer, onVisible } from '../shared/motion.js';
import { state } from './state.js';

const root = document.documentElement;
const reveal = [...document.querySelectorAll('.rv')];
document.querySelectorAll('.ledger').forEach((l) => [...l.children].forEach((li, i) => { li.classList.add('rv'); li.style.setProperty('--i', String(i)); reveal.push(li); }));
root.classList.add('sw-anim');
onVisible(reveal, (el) => el.classList.add('in'), { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

if (finePointer()) {
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    state.px = (e.clientX / innerWidth) * 2 - 1; state.py = 1 - (e.clientY / innerHeight) * 2; state.ptr = 1;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { state.ptr = 0; });
}

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1.5,
  lowDprCap: 1,
});

// Hovering or focusing a ledger row shows that project's picture in the company's frame.
document.querySelectorAll('.co').forEach((co) => {
  const fig = co.querySelector('.co-fig');
  if (!fig) return;
  const swap = document.createElement('img');
  swap.className = 'swap'; swap.alt = ''; swap.decoding = 'async';
  fig.append(swap);
  const show = (src) => { if (src) { swap.src = src; swap.classList.add('on'); } else swap.classList.remove('on'); };
  co.querySelectorAll('.ledger a[data-thumb]').forEach((a) => {
    a.addEventListener('pointerenter', () => show(a.dataset.thumb));
    a.addEventListener('focus', () => show(a.dataset.thumb));
    a.addEventListener('pointerleave', () => show(null));
    a.addEventListener('blur', () => show(null));
  });
});
