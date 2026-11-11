// Shared motion helpers. Every page uses these, so motion behaves the same everywhere.
//   import { prefersReducedMotion, isLowPower, finePointer, onVisible } from '../shared/motion.js';

// Owner decision: animations always run for everyone, whatever the system motion setting says.
// These two stay as exports so existing imports keep working. They never report reduced motion.
export const prefersReducedMotion = () => false;

// Kept for old imports. The setting is ignored, so the callback never fires.
export function onReducedMotionChange() {
  return () => {};
}

// True for a mouse or trackpad that can hover. Use it to gate hover and tilt effects.
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

// True on phones, tablets and slow machines. Use lighter scenes when this is true.
export function isLowPower() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const small = Math.min(innerWidth, innerHeight) < 600;
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory || 8;
  return coarse || small || cores <= 4 || mem <= 4;
}

// Calls cb(el, entry) when each element scrolls into view. Once per element by default.
// Without IntersectionObserver, cb runs right away for every element.
// Returns a function that stops watching.
export function onVisible(els, cb, { once = true, rootMargin = '0px 0px -10% 0px', threshold = 0.1 } = {}) {
  const list = typeof els === 'string' ? [...document.querySelectorAll(els)] : [...els];
  if (!('IntersectionObserver' in window)) {
    list.forEach((el) => cb(el, null));
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      cb(e.target, e);
      if (once) io.unobserve(e.target);
    }
  }, { rootMargin, threshold });
  list.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
