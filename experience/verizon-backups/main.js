// Page behaviour. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// Adds the backup run scene (scene.js): a grid of devices that a backup sweep ticks off.
// A plain 2D canvas, started after first paint by the shared loader, paused off screen, and drawn as one
// still frame with reduced motion.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 2,
  lowDprCap: 1.5,
});
