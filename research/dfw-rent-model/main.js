// DFW rental pricing model project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The scatter plot (scatter.js) is a plain 2D canvas loaded after first paint by the shared loader,
// so it works with WebGL off. It assembles as you scroll; with reduced motion it shows the finished plot.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

mountScene({ canvas: document.getElementById('dfw-scatter'), load: () => import('./scatter.js'), webgl: false, dprCap: 2, lowDprCap: 2 });
