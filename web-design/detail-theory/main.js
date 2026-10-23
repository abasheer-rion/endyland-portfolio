// Detail Theory project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: the paint panel (scene.js, WebGL 2, desktops only), gold edges that draw on, and the compare slider.
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion, onVisible, isLowPower } from '../../shared/motion.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

if (!prefersReducedMotion()) document.documentElement.classList.add('dt-js');
onVisible('.stats, .did-list li', (el) => el.classList.add('in'), { threshold: 0.3 });

// Compare slider. The range input does the work, so it already has keyboard and touch support.
const box = document.querySelector('.dt-compare-box');
const range = box?.querySelector('.dt-range');
if (box && range) {
  const set = () => box.style.setProperty('--pos', range.value + '%');
  range.addEventListener('input', set);
  set();
}

// Phones and slow machines get a light CSS version of the paint (moving gradients, no WebGL), so the page stays fast.
if (isLowPower()) document.documentElement.classList.add('dt-lite');
else mountScene({ canvas: document.querySelector('.dt-paint'), load: () => import('./scene.js'), dprCap: 1.5, lowDprCap: 1 });
