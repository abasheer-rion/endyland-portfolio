// Argus project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: the aperture and red dot grid scene (scene.js, a 2D canvas), the hero dashboard that
// tilts toward the pointer, and stat blocks and sub-project cards that rise in as they scroll into view.
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';
import { mountScene } from '../../shared/scene-loader.js';
import { tilt } from './fx.js';

initProject();
tilt(document.querySelector('.a-tilt'), { max: 6 });
onVisible('.proj-numbers .stat, .proj-subs .cards > li', (el) => el.classList.add('in'), { threshold: 0.15 });
mountScene({ canvas: document.getElementById('argus-scene'), load: () => import('./scene.js'), webgl: false, dprCap: 2 });
