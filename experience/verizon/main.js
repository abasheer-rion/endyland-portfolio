// Verizon project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// Adds the carrier backbone scene (scene.js, a plain 2D canvas) after first paint. Hovering or focusing
// a project card sends the scene's packets to that project's node. With reduced motion the scene draws
// one still frame, and a card only lights its node.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { prefersReducedMotion } from '../../shared/motion.js';

initProject();

const ready = mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 2,
  lowDprCap: 1.5,
});

ready.then((ctl) => {
  if (!ctl) return;
  const set = (i) => {
    ctl.scene.focus(i);
    if (prefersReducedMotion() || !ctl.running) ctl.scene.still();
  };
  for (const a of document.querySelectorAll('.card-link[data-node]')) {
    const i = Number(a.dataset.node);
    a.addEventListener('pointerenter', () => set(i));
    a.addEventListener('pointerleave', () => set(-1));
    a.addEventListener('focus', () => set(i));
    a.addEventListener('blur', () => set(-1));
  }
});
