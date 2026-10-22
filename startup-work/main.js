// startup-work tab: page behaviour. Only this page loads this file.
// - Starts the 3D swarm after first paint (shared loader), and tells it where you are on the page.
// - Reveals each glass card as it scrolls in. Tilts cards and moves their shine under a mouse.
// - Lights up the chapter rail. Taps and clicks send a ripple through the swarm.
// With reduced motion: no reveals, no tilt, no ripples. The scene draws one still frame per chapter.
import { mountScene } from '../shared/scene-loader.js';
import { prefersReducedMotion, onReducedMotionChange, finePointer, onVisible } from '../shared/motion.js';
import { state } from './state.js';

const root = document.documentElement;
const items = [...document.querySelectorAll('.item')];
const anchors = [document.querySelector('.intro'), ...items];
const railLinks = [...document.querySelectorAll('.rail a')];
const rail = document.querySelector('.rail');
let reduced = prefersReducedMotion();

// ---------- Reveals ----------
function setupReveals() {
  if (reduced) { root.classList.remove('sw-anim'); items.forEach((el) => el.classList.add('in')); return; }
  root.classList.add('sw-anim');
  onVisible(items, (el) => el.classList.add('in'), { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
}
setupReveals();

// ---------- Scroll to chapter ----------
let centers = [];
function measure() {
  // offsetTop ignores the reveal transforms, so the chapter points do not move while cards animate in
  centers = anchors.map((el) => {
    let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
    return y + el.offsetHeight / 2;
  });
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function chapterAt(y) {
  if (y <= centers[0]) return 0;
  for (let i = 0; i < centers.length - 1; i++) {
    if (y < centers[i + 1]) return i + smooth(0.28, 0.72, (y - centers[i]) / (centers[i + 1] - centers[i]));
  }
  return centers.length - 1;
}

let active = -1, queued = false;
function update() {
  queued = false;
  state.y = scrollY;
  const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
  state.m = atEnd ? anchors.length - 1 : chapterAt(scrollY + innerHeight * 0.5);
  const c = Math.round(state.m);
  if (rail) rail.style.setProperty('--p', (state.m / (anchors.length - 1)).toFixed(4));
  if (c !== active) {
    active = c;
    items.forEach((el, i) => el.classList.toggle('is-active', i + 1 === c));
    railLinks.forEach((a, i) => a.classList.toggle('is-on', i + 1 === c));
    if (reduced && state.redraw) state.redraw();
  }
}
const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
measure(); update();
addEventListener('scroll', queue, { passive: true });
addEventListener('resize', () => { measure(); queue(); }, { passive: true });
addEventListener('load', () => { measure(); queue(); });
if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); queue(); }).observe(document.body);

// ---------- Cards tell the swarm which shape to show ----------
items.forEach((el, i) => {
  const on = () => { state.hover = i + 1; if (reduced && state.redraw) state.redraw(); };
  const off = () => { if (state.hover === i + 1) state.hover = -1; if (reduced && state.redraw) state.redraw(); };
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') on(); });
  el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') off(); });
  el.addEventListener('focusin', on);
  el.addEventListener('focusout', (e) => { if (!el.contains(e.relatedTarget)) off(); });
});

// ---------- Pointer: the swarm moves away from the mouse. A tap or click sends a ripple ----------
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  state.px = (e.clientX / innerWidth) * 2 - 1; state.py = 1 - (e.clientY / innerHeight) * 2; state.ptr = reduced ? 0 : 1;
}, { passive: true });
document.addEventListener('pointerleave', () => { state.ptr = 0; });
addEventListener('blur', () => { state.ptr = 0; });
addEventListener('pointerdown', (e) => {
  if (reduced) return;
  state.pulseX = (e.clientX / innerWidth) * 2 - 1; state.pulseY = 1 - (e.clientY / innerHeight) * 2;
  state.pulseAt = performance.now() / 1000;
  if (e.pointerType !== 'mouse') { state.px = state.pulseX; state.py = state.pulseY; }
}, { passive: true });

// ---------- Card tilt and shine (mouse only) ----------
items.forEach((el) => {
  let raf = 0, rx = 0, ry = 0, mx = 50, my = 30;
  const apply = () => {
    raf = 0;
    el.style.setProperty('--rx', rx.toFixed(2) + 'deg'); el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    el.style.setProperty('--mx', mx.toFixed(1) + '%'); el.style.setProperty('--my', my.toFixed(1) + '%');
  };
  el.addEventListener('pointermove', (e) => {
    if (reduced || e.pointerType !== 'mouse' || !finePointer()) return;
    const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    ry = (x - 0.5) * 7; rx = (0.5 - y) * 6; mx = x * 100; my = y * 100;
    el.classList.add('tilt');
    if (!raf) raf = requestAnimationFrame(apply);
  });
  el.addEventListener('pointerleave', () => { rx = ry = 0; el.classList.remove('tilt'); if (!raf) raf = requestAnimationFrame(apply); });
});

onReducedMotionChange((r) => {
  reduced = r;
  if (r) { state.ptr = 0; state.pulseAt = -1; items.forEach((el) => { el.classList.add('in'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); }); }
  setupReveals();
});

// ---------- The 3D scene ----------
mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  dprCap: 1.5,
  lowDprCap: 1,
});
