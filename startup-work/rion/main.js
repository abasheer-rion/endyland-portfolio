// RION Solutions project page. Only this page loads this file.
// Shared RION behaviour (pointer glow, typed status panel, tilt, arrival glow) is in brand.js next to this file,
// which also runs initProject() from /shared/project.js. The 3D logo mark and starfield are in scene.js.
import { initRion } from './brand.js';

initRion({ scene: () => import('./scene.js') });
