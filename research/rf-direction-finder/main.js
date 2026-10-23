// RF direction finder and Butler matrix page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// Two plain 2D canvases load after first paint through the shared loader, so they work with WebGL off:
// - scene.js: the wireframe beam behind the page.
// - instrument.js: the "find, then steer" plot, with Butler matrix port buttons.
// Gallery screens power on as they scroll in. Reduced motion: still frames, no power-on.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { onVisible } from '../../shared/motion.js';

initProject();

mountScene({ canvas: document.getElementById('rf-scene'), load: () => import('./scene.js'), webgl: false, dprCap: 1.5, lowDprCap: 1 });

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

mountScene({ canvas: document.getElementById('rf-inst'), load: () => import('./instrument.js'), webgl: false, dprCap: 2, lowDprCap: 2 })
  .then((h) => { inst = h; apply(); });

// Watch the figure, not the clipped screen: a clipped box looks almost invisible to the observer.
onVisible('.gallery figure', (fig) => fig.querySelector('.rs-reveal')?.classList.add('is-in'), { threshold: 0.2 });
