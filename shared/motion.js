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

// ---------- Shared motion layer ----------
// Pages mark elements with attributes (the CSS is in base.css). nav.js calls initMotion() on any page that uses one,
// so a page needs no script of its own for these. Safe to call more than once.
//   data-reveal="rise | wipe | wipe-up | unmask"   enters once when it scrolls in
//   data-reveal-group                               its children enter 30ms apart
//   data-depth, data-depth="tilt"                   follows the pointer (mouse and trackpad only)
//   data-scrub="..."                                scroll-linked, CSS only, nothing to run here
let motionOn = false;
export function initMotion(scope = document) {
  const root = document.documentElement;
  setupReveals(scope);
  setupDepth(scope);
  if (!motionOn) { motionOn = true; root.classList.add('mo-on'); }
}

// One-shot entrances. Adds class "in", then "done" when the transition is over so the clip is dropped.
export function setupReveals(scope = document) {
  const fresh = (el) => { if (el.dataset.mo) return false; el.dataset.mo = '1'; return true; };
  const singles = [...scope.querySelectorAll('[data-reveal]')].filter(fresh);
  const groups = [...scope.querySelectorAll('[data-reveal-group]')].filter(fresh);
  for (const g of groups) [...g.children].forEach((c, i) => c.style.setProperty('--i', String(Math.min(i, 12))));
  const show = (el) => {
    el.classList.add('in');
    if (el.hasAttribute('data-reveal')) setTimeout(() => el.classList.add('done'), 1100);
  };
  // Scroll-linked ones need view timelines. Where those are missing they fall back to a one-shot entrance.
  if (!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()'))) {
    for (const el of scope.querySelectorAll('[data-scrub]:not([data-reveal])')) {
      if (el.dataset.scrub === 'drift' || !fresh(el)) continue;
      el.setAttribute('data-reveal', el.dataset.scrub);
      singles.push(el);
    }
  }
  // A wipe starts clipped to a 1px sliver (see base.css) because the observer counts clipped area. Those need
  // threshold 0, since 8% of a sliver is never reached.
  const clipped = (el) => /^wipe/.test(el.getAttribute('data-reveal') || '');
  onVisible([...singles.filter((el) => !clipped(el)), ...groups], show, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
  onVisible(singles.filter(clipped), show, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
}

// Pointer depth. The element gets --dx and --dy from -1 to 1 (0 at its centre), eased toward the pointer.
// One pointermove listener per element (passive), one rAF loop that only runs while a value is still moving,
// and the element's box is measured on pointerenter, never during the move.
export function setupDepth(scope = document) {
  if (!finePointer()) return;
  for (const el of scope.querySelectorAll('[data-depth]')) {
    if (el.dataset.moDepth) continue;
    el.dataset.moDepth = '1';
    let box = null, tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const tick = () => {
      x += (tx - x) * 0.12; y += (ty - y) * 0.12;
      if (Math.abs(tx - x) < 0.002 && Math.abs(ty - y) < 0.002) { x = tx; y = ty; raf = 0; } else raf = requestAnimationFrame(tick);
      el.style.setProperty('--dx', x.toFixed(3));
      el.style.setProperty('--dy', y.toFixed(3));
      if (!raf && !tx && !ty) el.classList.remove('is-live');
    };
    const go = () => { if (!raf) raf = requestAnimationFrame(tick); };
    el.addEventListener('pointerenter', () => { box = el.getBoundingClientRect(); el.classList.add('is-live'); }, { passive: true });
    el.addEventListener('pointermove', (e) => {
      if (!box) box = el.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - box.top) / box.height) * 2 - 1));
      go();
    }, { passive: true });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; box = null; go(); }, { passive: true });
  }
}

// Smooth number change: moves the number shown in el from where it is to `to` (ease-out, 400ms by default).
// For values that change while the page is open (a slider, a toggle, live data). It does not count up from zero on
// load: a page always shows its real figure first.
//   tweenNumber(el, 62.5, { decimals: 1, prefix: '', suffix: '%', comma: false })
const tweens = new WeakMap();
export function tweenNumber(el, to, { duration = 400, decimals = 0, prefix = '', suffix = '', comma = false } = {}) {
  const prev = tweens.get(el);
  if (prev) cancelAnimationFrame(prev.raf);
  const shown = prev ? prev.now : parseFloat(String(el.dataset.value ?? el.textContent).replace(/[^0-9.+-]/g, ''));
  const from = Number.isFinite(shown) ? shown : to;
  const fmt = (v) => {
    const s = comma ? v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : v.toFixed(decimals);
    return prefix + s + suffix;
  };
  el.dataset.value = String(to);
  if (from === to || duration <= 0) { el.textContent = fmt(to); tweens.delete(el); return; }
  const state = { now: from, raf: 0 }, t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / duration), e = 1 - Math.pow(1 - k, 3);
    state.now = from + (to - from) * e;
    el.textContent = fmt(k >= 1 ? to : state.now);
    if (k < 1) state.raf = requestAnimationFrame(step); else tweens.delete(el);
  };
  tweens.set(el, state);
  state.raf = requestAnimationFrame(step);
}
