// Every Argus page loads this file (argus, argus-dashboard, argus-one, argus-edge-board, argus-site).
// Shared parts (the "what I did" reveal, the gallery lightbox, back links) come from /shared/project.js.
// This adds the diagram motion and the before/after bars.
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';
import { initDiagrams } from '../diagram.js';

initProject();
initDiagrams();
document.querySelectorAll('.bars').forEach((b) => b.querySelectorAll('.bar-fill').forEach((f, i) => f.style.setProperty('--i', String(i))));
onVisible('.bars', (el) => el.classList.add('in'), { threshold: 0.3 });
