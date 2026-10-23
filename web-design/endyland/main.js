// endyland.com project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: hero shapes you can grab and fling (they spring back home), and the beam sketch (scene.js).
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion } from '../../shared/motion.js';
import { mountScene } from '../../shared/scene-loader.js';

initProject();

// Grab and fling. A spring pulls each shape back to where it lives; a little damping lets it wobble.
for (const el of document.querySelectorAll('.ed-shapes i')) {
  let x = 0, y = 0, vx = 0, vy = 0, rot = 0, vr = 0, raf = 0, grab = null, last = 0;
  const put = () => { el.style.setProperty('--dx', x.toFixed(1) + 'px'); el.style.setProperty('--dy', y.toFixed(1) + 'px'); el.style.setProperty('--rot', rot.toFixed(1) + 'deg'); };
  const tick = (now) => {
    const dt = Math.min(0.033, (now - (last || now)) / 1000); last = now;
    if (!grab) {
      vx += (-x * 90 - vx * 7) * dt; vy += (-y * 90 - vy * 7) * dt; vr += (-rot * 60 - vr * 6) * dt;
      x += vx * dt; y += vy * dt; rot += vr * dt;
    }
    put();
    if (grab || Math.abs(x) + Math.abs(y) + Math.abs(vx) + Math.abs(vy) + Math.abs(rot) > 0.5) raf = requestAnimationFrame(tick);
    else { x = y = vx = vy = rot = vr = 0; put(); raf = 0; last = 0; el.classList.remove('flung'); }
  };
  el.addEventListener('pointerdown', (e) => {
    if (prefersReducedMotion()) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    grab = { px: e.clientX - x, py: e.clientY - y, t: performance.now(), lx: e.clientX, ly: e.clientY };
    el.classList.add('grab', 'flung');
    if (!raf) raf = requestAnimationFrame(tick);
  });
  el.addEventListener('pointermove', (e) => {
    if (!grab) return;
    const now = performance.now(), dt = Math.max(1, now - grab.t) / 1000;
    vx = (e.clientX - grab.lx) / dt; vy = (e.clientY - grab.ly) / dt;
    grab.t = now; grab.lx = e.clientX; grab.ly = e.clientY;
    x = e.clientX - grab.px; y = e.clientY - grab.py; rot = Math.max(-40, Math.min(40, x * 0.15));
  });
  const drop = () => { if (!grab) return; grab = null; el.classList.remove('grab'); vr = vx * 0.05; };
  el.addEventListener('pointerup', drop);
  el.addEventListener('pointercancel', drop);
}

mountScene({ canvas: document.querySelector('.ed-beam-canvas'), load: () => import('./scene.js'), webgl: false, dprCap: 2, lowDprCap: 2 });
