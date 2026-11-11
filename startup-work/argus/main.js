// Every Argus page loads this file (/startup-work/argus/, argus-dashboard, argus-one, argus-edge-board, argus-site).
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This adds one thing: rows marked .a-rv rise in as they scroll into view, 30ms apart inside one list.
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';

initProject();
document.querySelectorAll('.a-steps, .a-parts, .a-time, .sub-list').forEach((list) => {
  [...list.children].forEach((li, i) => { li.classList.add('a-rv'); li.style.setProperty('--i', String(i)); });
});
onVisible('.a-rv', (el) => el.classList.add('in'), { threshold: 0.12 });
