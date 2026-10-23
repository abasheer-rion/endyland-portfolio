// In-store AI board project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: a 3D drawing of the board (scene.js, three.js) in a dark stage under the hero, with a
// flat drawing as the fallback when WebGL is off, and a magnifier on the photo for mouse and trackpad.
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion, finePointer, onVisible } from '../../shared/motion.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

// Magnifier: a round lens that follows the pointer over the photo and shows it at 2.4x.
const fig = document.querySelector('.eb-photo');
const img = fig?.querySelector('img');
if (fig && img && finePointer()) {
  const lens = document.createElement('span');
  lens.className = 'eb-lens';
  lens.setAttribute('aria-hidden', 'true');
  fig.append(lens);
  const Z = 2.4;
  let raf = 0, ex = 0, ey = 0;
  const draw = () => {
    raf = 0;
    const r = img.getBoundingClientRect();
    const x = ex - r.left, y = ey - r.top;
    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    fig.classList.toggle('lens-on', inside && !prefersReducedMotion());
    if (!inside) return;
    lens.style.transform = `translate(${x - 80}px, ${y - 80}px)`;
    lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
    lens.style.backgroundSize = `${r.width * Z}px ${r.height * Z}px`;
    lens.style.backgroundPosition = `${-(x * Z - 80)}px ${-(y * Z - 80)}px`;
  };
  fig.addEventListener('pointermove', (e) => { ex = e.clientX; ey = e.clientY; if (!raf) raf = requestAnimationFrame(draw); });
  fig.addEventListener('pointerleave', () => fig.classList.remove('lens-on'));
}

onVisible('.eb-stage', (el) => el.classList.add('in'), { threshold: 0.2 });
// three.js is big, so the 3D board only loads when its stage comes near the screen.
let mounted = false;
onVisible('.eb-stage', () => {
  if (mounted) return;
  mounted = true;
  mountScene({ canvas: document.getElementById('eb-scene'), load: () => import('./scene.js'), dprCap: 1.75 });
}, { rootMargin: '300px 0px 300px 0px', threshold: 0 });
