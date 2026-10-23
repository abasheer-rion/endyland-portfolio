// YoTummy project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: the phone mockup tilting toward the pointer, and the seller map scene (scene.js, a 2D canvas).
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion, finePointer } from '../../shared/motion.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

// Phone tilt. Mouse and trackpad only, and only when motion is allowed.
const media = document.querySelector('.yt-media');
const phone = document.querySelector('.yt-phone');
if (media && phone && finePointer()) {
  let raf = 0, rx = 0, ry = 0;
  const apply = () => { raf = 0; phone.style.setProperty('--rx', rx.toFixed(2) + 'deg'); phone.style.setProperty('--ry', ry.toFixed(2) + 'deg'); };
  media.addEventListener('pointermove', (e) => {
    if (prefersReducedMotion()) return;
    const r = media.getBoundingClientRect();
    ry = ((e.clientX - r.left) / r.width - 0.5) * 16;
    rx = -((e.clientY - r.top) / r.height - 0.5) * 10;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  media.addEventListener('pointerleave', () => { rx = 0; ry = 0; if (!raf) raf = requestAnimationFrame(apply); });
}

// Seller map: pins drop in, group into bubbles, and split apart under the pointer.
mountScene({ canvas: document.querySelector('.yt-map-canvas'), load: () => import('./scene.js'), webgl: false, dprCap: 2, lowDprCap: 2 });
