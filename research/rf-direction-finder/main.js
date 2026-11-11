// RF direction finder page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// One plain 2D canvas, the "find, then steer" instrument, loads after first paint through the shared loader.
// It pauses when off screen or when the tab is hidden, and caps its pixel ratio at 1.5 (1 on phones).
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { onVisible } from '../../shared/motion.js';

initProject();

const buttons = [...document.querySelectorAll('.rf-modes button')];
const press = (btn) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
let inst = null, want = null;
const apply = () => {
  if (!inst || !want) return;
  inst.scene.setMode(want.mode, want.port);
  if (!inst.running) inst.scene.redraw();
};
buttons.forEach((b) => b.addEventListener('click', () => {
  press(b);
  want = { mode: b.dataset.mode, port: +(b.dataset.port || 0) };
  apply();
}));
// A tap on the plot switches back to the auto loop.
document.addEventListener('rf-mode', () => { press(buttons[0]); want = { mode: 'auto', port: 0 }; });

mountScene({ canvas: document.getElementById('rf-inst'), load: () => import('./instrument.js'), webgl: false, dprCap: 1.5, lowDprCap: 1 })
  .then((h) => { inst = h; apply(); });

document.querySelectorAll('.steps').forEach((ol) => {
  [...ol.children].forEach((li, i) => li.style.setProperty('--i', i));
  onVisible([ol], () => ol.classList.add('in'), { threshold: 0.15 });
});
