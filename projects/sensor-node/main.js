// Low-power wireless sensor node project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The stage shows two pixel sensor nodes: the old one that never sleeps and drains its battery fast,
// and the new one that wakes, sends a reading and sleeps again (scene.js, a plain 2D canvas, light on phones).
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { onVisible } from '../../shared/motion.js';
import { bus } from './bus.js';

initProject();

// Batteries charge up when the numbers scroll into view.
const numbers = document.querySelector('.proj-numbers');
if (numbers) onVisible([numbers], () => numbers.classList.add('charged'), { threshold: 0.25 });

const state = document.querySelector('.stage-state');
bus.onState = (awake) => { if (state) state.textContent = awake ? 'Awake: sending' : 'Asleep'; };

mountScene({
  canvas: document.querySelector('.stage .proj-scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1, lowDprCap: 1,
});
