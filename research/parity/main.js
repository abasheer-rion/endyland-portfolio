// Parity project page. Only this page loads this file.
// Shared parts (reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// No canvases here: the page is text, tables and figures.
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';

initProject();
document.querySelectorAll('.steps').forEach((ol) => {
  [...ol.children].forEach((li, i) => li.style.setProperty('--i', i));
  onVisible([ol], () => ol.classList.add('in'), { threshold: 0.15 });
});
