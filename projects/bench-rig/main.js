// Automated bench test rig project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The scope in "What I did" runs the 12-point amplifier sweep and flags the 3 dB error
// (scene.js, a plain 2D canvas, light on phones). The race bars in the numbers run when they scroll in.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { onVisible } from '../../shared/motion.js';
import { bus } from './bus.js';

initProject();

const numbers = document.querySelector('.proj-numbers');
if (numbers) onVisible([numbers], () => numbers.classList.add('raced'), { threshold: 0.3 });

const pt = document.querySelector('.stage-pt'), res = document.querySelector('.stage-res');
bus.onPoint = (n) => {
  if (pt) pt.textContent = n ? `Point ${String(n).padStart(2, '0')} of 12` : '12 pt';
  if (res) res.textContent = n ? 'Measuring' : 'Ready';
};
bus.onDone = () => { if (res) res.textContent = '3 dB error found'; };

mountScene({
  canvas: document.querySelector('.scope .proj-scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1, lowDprCap: 1,
});
