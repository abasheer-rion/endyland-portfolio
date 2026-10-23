// Swadesi Mangoes project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds the mango crate (scene.js, a 2D canvas). The logo sway and the green panel are CSS only.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

mountScene({ canvas: document.querySelector('.sw-mangoes'), load: () => import('./scene.js'), webgl: false, dprCap: 2, lowDprCap: 2 });
