// Argus One project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: the walking pose skeletons behind the hero (scene.js, a 2D canvas) and the camera
// clock on the live feed. The feed's scan line, brackets, tracking boxes and risk meter are CSS.
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion } from '../../shared/motion.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

const clock = document.querySelector('.one-time');
if (clock) {
  const two = (n) => String(n).padStart(2, '0');
  const tick = () => { const d = new Date(); clock.textContent = `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`; };
  tick();
  if (!prefersReducedMotion()) setInterval(() => { if (!document.hidden && !prefersReducedMotion()) tick(); }, 1000);
}

mountScene({ canvas: document.getElementById('one-scene'), load: () => import('./scene.js'), webgl: false, dprCap: 2 });
