// Small motion helpers shared by the Argus pages (the brand folder). Each page's main.js imports what it needs.
//   tilt(el): the element leans toward the pointer in 3D, with a soft glare. Mouse and trackpad only.
//   follow(el, cb): calls cb(x, y) with the pointer position inside el as 0..1, once per frame at most.
// With reduced motion both do nothing, and the CSS shows the resting pose.
import { prefersReducedMotion, onReducedMotionChange, finePointer } from '../../shared/motion.js';

export function tilt(el, { max = 7, base = [0, 0] } = {}) {
  if (!el || !finePointer()) return;
  let raf = 0, tx = 0, ty = 0, on = false;
  const apply = () => {
    raf = 0;
    el.style.setProperty('--rx', `${(base[0] + ty * -max).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${(base[1] + tx * max).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${((tx + 1) * 50).toFixed(1)}%`);
    el.style.setProperty('--gy', `${((ty + 1) * 50).toFixed(1)}%`);
  };
  const move = (e) => {
    if (prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    if (!on) { on = true; el.classList.add('is-tilting'); }
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const leave = () => {
    on = false; tx = 0; ty = 0; el.classList.remove('is-tilting');
    ['--rx', '--ry', '--gx', '--gy'].forEach((p) => el.style.removeProperty(p));
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  onReducedMotionChange((r) => { if (r) leave(); });
}

export function follow(el, cb) {
  if (!el) return;
  let raf = 0, x = 0.5, y = 0.5;
  el.addEventListener('pointermove', (e) => {
    if (prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    x = (e.clientX - r.left) / r.width; y = (e.clientY - r.top) / r.height;
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; cb(x, y); });
  });
}
