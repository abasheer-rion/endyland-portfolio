// Projects tab: page behaviour. Only this page loads this file.
// The 3D scene loads after first paint through the shared loader, and pauses when hidden or off screen.
// Everything here is extra: links and text work without it, and motion stays off with reduced motion.
import { mountScene } from '../shared/scene-loader.js';
import { prefersReducedMotion, onReducedMotionChange, finePointer, onVisible } from '../shared/motion.js';
import { bus } from './state.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let reduced = prefersReducedMotion();
root.classList.toggle('arcade-anim', !reduced);

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
  dprCap: 1, lowDprCap: 1, // the scene draws chunky pixels on purpose, so high pixel ratios add nothing
});

const items = $$('.items .item');

// ---------- Reveal: each item boots in as it scrolls into view ----------
if (!reduced) items.forEach((el) => el.classList.add('pre'));
onVisible(items, (el) => {
  el.classList.remove('pre');
  if (prefersReducedMotion()) return;
  el.classList.add('in');
  setTimeout(() => el.classList.remove('in'), 1600);
}, { threshold: 0.12 });

// ---------- HUD: score, high score, stage, progress bar ----------
const scoreEl = $('[data-score]'), hiEl = $('[data-hi]'), stageEl = $('[data-stage]'), barEl = $('[data-bar]');
const pad = (n) => String(Math.min(999999, Math.max(0, Math.round(n)))).padStart(6, '0');
let hi = 0;
try { hi = Number(localStorage.getItem('endyland-arcade-hi')) || 0; } catch { /* storage blocked */ }
hiEl.textContent = pad(hi);
let maxP = 0, bonus = 0, shown = 0, rolling = 0;
const target = () => Math.round(maxP * 500) * 10 + bonus;
function roll() {
  rolling = 0;
  const want = target();
  if (reduced) shown = want;
  else shown += Math.max(10, Math.ceil((want - shown) / 6 / 10) * 10);
  if (shown > want) shown = want;
  scoreEl.textContent = pad(shown);
  if (shown > hi) {
    hi = shown; hiEl.textContent = pad(hi);
    try { localStorage.setItem('endyland-arcade-hi', String(hi)); } catch { /* storage blocked */ }
  }
  if (shown < want) rolling = setTimeout(roll, 50);
}
const bump = (n) => { bonus += n; if (!rolling) roll(); };
bus.onKill = () => bump(50);
bus.onCoin = () => bump(10);

// The HUD steps aside when the footer is on screen, so it never covers the footer links.
const hud = $('.hud'), footer = $('.site-footer');
if (hud && footer && 'IntersectionObserver' in window) {
  new IntersectionObserver((e) => hud.classList.toggle('away', e[e.length - 1].isIntersecting)).observe(footer);
}

// ---------- Scroll ----------
let ticking = false;
function onScroll() {
  ticking = false;
  const max = root.scrollHeight - innerHeight;
  bus.p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  if (bus.p > maxP) { maxP = bus.p; if (!rolling) roll(); }
  let stage = 0;
  for (const el of items) if (el.getBoundingClientRect().top < innerHeight * 0.65) stage++;
  if (stage !== bus.stage) { bus.stage = stage; stageEl.textContent = `1-${stage}`; }
  barEl.style.setProperty('--bar', (Math.round(bus.p * 12) / 12).toFixed(3));
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll, { passive: true });
onScroll();

// ---------- Pointer: steer the ship, click empty space to fire ----------
addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  bus.px = (e.clientX / innerWidth) * 2 - 1;
  bus.py = (e.clientY / innerHeight) * 2 - 1;
  bus.pt = performance.now();
}, { passive: true });
document.addEventListener('pointerdown', (e) => {
  if (e.target.closest('a, button, .item')) return;
  if (e.pointerType !== 'mouse') { bus.px = (e.clientX / innerWidth) * 2 - 1; bus.pt = performance.now(); }
  bus.fire++;
});
$('.start')?.addEventListener('click', () => { bus.fire += 3; });

// ---------- Cabinets light up: hover, keyboard focus, or a tap ----------
const scored = new WeakSet();
function light(el, i) {
  bus.hover = i; bus.hoverColor = el.dataset.color || '#FF4FD8'; bus.hoverAt = performance.now();
  if (scored.has(el)) return;
  scored.add(el); bump(100);
  if (reduced) return;
  const pop = document.createElement('span');
  pop.className = 'pop'; pop.setAttribute('aria-hidden', 'true'); pop.textContent = '+100';
  el.append(pop);
  setTimeout(() => pop.remove(), 1100);
}
function dim(el, i) {
  if (bus.hover === i && !el.matches(':hover, :focus-within, .lit')) bus.hover = -1;
}
items.forEach((el, i) => {
  el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') light(el, i); });
  el.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
    dim(el, i);
  });
  el.addEventListener('focusin', () => light(el, i));
  el.addEventListener('focusout', () => setTimeout(() => dim(el, i), 0));
  // Touch: a tap on the cabinet (not on a link) lights it, a second tap turns it off.
  el.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' || e.target.closest('a')) return;
    const on = !el.classList.contains('lit');
    items.forEach((o) => o.classList.remove('lit'));
    if (on) { el.classList.add('lit'); light(el, i); } else dim(el, i);
  });
  // Mouse: the cabinet tilts toward the pointer in small steps.
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced || !finePointer()) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${Math.round(nx * 5) * 2}deg`);
    el.style.setProperty('--rx', `${Math.round(-ny * 4) * 2}deg`);
  }, { passive: true });
});

onReducedMotionChange((r) => {
  reduced = r;
  root.classList.toggle('arcade-anim', !r);
  if (r) items.forEach((el) => { el.classList.remove('pre', 'in'); el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
  roll();
});
