// County records API and client intake project page. Only this page loads this file.
// Shared RION behaviour (pointer glow, typed panel, arrival glow, initProject) comes from /startup-work/rion/brand.js.
// The merging record streams and starfield are in scene.js.
import { initRion } from '../rion/brand.js';

initRion({ scene: () => import('./scene.js') });
