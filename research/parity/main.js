// Parity project page. Only this page loads this file.
// Shared parts (reveal, gallery lightbox, back links) come from /shared/project.js.
// The Sharpe bars and the gauntlet squares play once when they scroll into view.
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';

initProject();
document.querySelectorAll('.sb').forEach((r, i) => r.style.setProperty('--n', i));
onVisible('#sbars,#pgrid', (el) => el.classList.add('in'), { threshold: 0.25 });
