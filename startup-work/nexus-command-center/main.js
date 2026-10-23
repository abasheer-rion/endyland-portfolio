// NEXUS Command Center project page. Only this page loads this file.
// Shared RION behaviour (pointer glow, typed panel, arrival glow, initProject) comes from /startup-work/rion/brand.js.
// This page: the commit bars fill when they scroll in. The telemetry line and starfield are in scene.js.
import { initRion } from '../rion/brand.js';
import { onVisible } from '../../shared/motion.js';

initRion({ scene: () => import('./scene.js') });
onVisible(document.querySelectorAll('.meter'), (el) => el.classList.add('in'), { threshold: 0.3 });
