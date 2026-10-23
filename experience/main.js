// Experience tab: page behaviour. Only this page loads this file.
// Starts the network scene after first paint (shared loader, plain 2D canvas), and draws each sheet's
// frame on as it scrolls in. With reduced motion: no reveals, and the scene draws one still frame.
import { mountScene } from '../shared/scene-loader.js';
import { prefersReducedMotion, onReducedMotionChange, onVisible } from '../shared/motion.js';

const root = document.documentElement;
const sheets = [...document.querySelectorAll('.sheet')];

const apply = (reduced) => {
  root.classList.toggle('ex-anim', !reduced);
  if (reduced) sheets.forEach((el) => el.classList.add('in'));
};
apply(prefersReducedMotion());
onReducedMotionChange(apply);
onVisible(sheets, (el) => el.classList.add('in'), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 2,
  lowDprCap: 1.5,
});
