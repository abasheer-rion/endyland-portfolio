// Experience tab: page behaviour. Only this page loads this file.
// Starts the hero halftone after first paint (shared loader, plain 2D canvas). Entry and timeline reveals use
// data-reveal attributes, which /shared/nav.js hands to /shared/motion.js.
import { mountScene } from '../shared/scene-loader.js';

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1.5,
  lowDprCap: 1,
});
