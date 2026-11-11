// Experience project pages. Shared parts (what I did reveal, count-up, back links) come from /shared/project.js.
// Adds the bar and lane reveal: bars grow, lanes draw, once, as they scroll in (transform only).
import { initProject } from '../shared/project.js';
import { onVisible } from '../shared/motion.js';

initProject();
const charts = [...document.querySelectorAll('.bars, .lanes')];
charts.forEach((el) => [...el.children].forEach((c, i) => c.querySelector('.lane-bar')?.style.setProperty('--i', String(i))));
onVisible(charts, (el) => el.classList.add('in'), { threshold: 0.2 });
