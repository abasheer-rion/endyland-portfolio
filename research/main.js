// Research tab: page behaviour. Only this page loads this file.
// Two plain 2D canvases load after first paint through the shared loader: the stippled beam in the hero
// and the live polar plot. Both pause when off screen or when the tab is hidden, cap their pixel ratio
// at 1.5 (1 on phones) and draw fewer dots on phones. Everything here is extra: text and links work without it.
import { mountScene } from '../shared/scene-loader.js';
import { finePointer, onVisible } from '../shared/motion.js';
import { subscribe, setSteer, MAX } from './state.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);

root.classList.add('rs-js', 'rs-anim');

mountScene({ canvas: $('#scene'), load: () => import('./scene.js'), webgl: false, dprCap: 1.5, lowDprCap: 1 });
mountScene({ canvas: $('#polar'), load: () => import('./polar.js'), webgl: false, dprCap: 1.5, lowDprCap: 1 });

// Each project section rises in once when it scrolls into view.
document.querySelectorAll('.work').forEach((w) => {
  w.querySelectorAll('.work-text>*,.shot,.inst').forEach((el, i) => el.style.setProperty('--i', i));
});
onVisible('.work', (el) => el.classList.add('is-in'), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

// The steer slider and its readout follow the shared state.
const slider = $('#steer'), out = $('#steer-out');
subscribe((s) => {
  const v = Math.round(s.target);
  if (slider && document.activeElement !== slider) slider.value = v;
  if (out) out.textContent = `${v >= 0 ? '+' : ''}${v}°`;
});
if (slider) {
  slider.addEventListener('input', () => {
    setSteer(+slider.value, 8000);
    slider.setAttribute('aria-valuetext', `${slider.value} degrees`);
  });
}

// A mouse over the hero steers the beam for a moment (mouse only, passive, throttled by the state module).
if (finePointer()) {
  const intro = $('.intro');
  intro.addEventListener('pointermove', (e) => {
    setSteer(((e.clientX / innerWidth) * 2 - 1) * MAX * 0.9, 2500);
  }, { passive: true });
}
