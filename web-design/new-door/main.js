// New Door Investments project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds slow scroll fades and the land plat that draws itself. The door and fog are CSS only.
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion, onVisible } from '../../shared/motion.js';

initProject();

const rise = [...document.querySelectorAll('.proj-section h2, .stats, .gallery li, .proj-related ul')];
rise.forEach((el) => el.classList.add('nd-rise'));
const plat = document.querySelector('.nd-plat');
if (!prefersReducedMotion()) document.documentElement.classList.add('nd-js');
onVisible([...rise, plat].filter(Boolean), (el) => el.classList.add('in'), { threshold: 0.15 });
