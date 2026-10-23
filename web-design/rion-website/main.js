// RION Solutions website project page. Only this page loads this file.
// It wears the RION brand: shared RION behaviour (pointer glow, tilt, arrival glow, initProject) comes from
// /startup-work/rion/brand.js. This page: the commit squares light up when they scroll in. Scene: scene.js.
import { initRion } from '../../startup-work/rion/brand.js';
import { onVisible } from '../../shared/motion.js';

initRion({ scene: () => import('./scene.js') });
onVisible(document.querySelectorAll('.commits'), (el) => el.classList.add('in'), { threshold: 0.3 });
