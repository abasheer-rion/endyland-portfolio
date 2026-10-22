// research tab: page behaviour. Only this page loads this file.
// The 3D scene loads after first paint through the shared loader, and pauses when hidden or off screen.
import { mountScene } from '../shared/scene-loader.js';
// Also available: prefersReducedMotion, onReducedMotionChange, finePointer, isLowPower, onVisible.
// import { onVisible } from '../shared/motion.js';

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
});

// TODO(research builder): DOM effects for this tab go here (see docs/DESIGN.md).
// Keep every effect off when prefersReducedMotion() is true, and keep links and text working without JS.
