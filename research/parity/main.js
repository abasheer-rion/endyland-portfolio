// Parity project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The backtest tape behind the page is a plain 2D canvas (scene.js) loaded after first paint by the
// shared loader, so it works with WebGL off. The meter and the results board play when they scroll in.
// Reduced motion: one still frame, everything in its end state.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { onVisible } from '../../shared/motion.js';

initProject();

mountScene({ canvas: document.getElementById('pa-scene'), load: () => import('./scene.js'), webgl: false, dprCap: 1.5, lowDprCap: 1 });

document.querySelectorAll('.pa-board li').forEach((li, i) => li.style.setProperty('--i', String(i)));
onVisible('.proj-numbers, .pa-results', (el) => el.classList.add('is-in'), { threshold: 0.3 });
