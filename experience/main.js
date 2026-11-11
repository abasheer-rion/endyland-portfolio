// Experience tab: page behaviour. Only this page loads this file.
// Starts the hero halftone after first paint (shared loader, plain 2D canvas) and brings each job in as it
// scrolls into view (IntersectionObserver, transform and opacity only).
import { mountScene } from '../shared/scene-loader.js';
import { onVisible } from '../shared/motion.js';

const entries = [...document.querySelectorAll('.entry')];
for (const el of entries) [...el.querySelector('.entry-text').children].forEach((c, i) => c.style.setProperty('--i', String(i)));
document.documentElement.classList.add('ex-anim');
onVisible(entries, (el) => el.classList.add('in'), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1.5,
  lowDprCap: 1,
});
