// Home page behaviour. Everything here is polish: with no script the page is a plain, readable long scroll.
// Observers only, no scroll handlers. Animations run for everyone.
import { mountScene } from '../shared/scene-loader.js';

const root = document.documentElement;
const hasIO = 'IntersectionObserver' in window;

// Count a number up. The HTML already holds the final value, so no script still shows the right text.
function countUp(el, delay = 0, dur = 1200) {
  const end = Number(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  el.textContent = pre + '0' + suf;
  const t0 = performance.now() + delay;
  const tick = (now) => {
    const f = Math.min(1, Math.max(0, (now - t0) / dur));
    el.textContent = pre + Math.round(end * (1 - Math.pow(1 - f, 3))) + suf;
    if (f < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Hero: letters get an index for the CSS stagger, and the proof numbers count up.
function setupHero() {
  let i = 0;
  document.querySelectorAll('h1 .l').forEach((l) => l.style.setProperty('--i', String(i++)));
  document.querySelectorAll('.proof [data-count]').forEach((el) => countUp(el, 900));
}

// Chapters: add .in the first time one comes into view (entrance), and .live while it is on screen
// (so looping drawings only run when seen). Numbers inside count up once.
function setupChapters() {
  if (!hasIO) return;
  const chapters = document.querySelectorAll('.room, .recent');
  const counted = new WeakSet();
  const hold = (c) => c.querySelectorAll('[data-count]').forEach((el) => { el.textContent = (el.dataset.prefix || '') + '0' + (el.dataset.suffix || ''); });
  chapters.forEach((c) => { if (c.getBoundingClientRect().top > innerHeight * 0.8) { hold(c); } else { c.classList.add('seen'); } });
  root.classList.add('hm');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const c = e.target;
      c.classList.toggle('live', e.isIntersecting);
      if (!e.isIntersecting || c.classList.contains('seen')) continue;
      c.classList.add('seen');
      c.querySelectorAll('[data-count]').forEach((el, k) => { if (!counted.has(el)) { counted.add(el); countUp(el, 250 + k * 60); } });
    }
  }, { rootMargin: '0px 0px -18% 0px', threshold: 0.08 });
  chapters.forEach((c) => io.observe(c));
}

// Bio: a sticky path on the left follows the paragraph being read.
function setupBio() {
  const path = document.querySelector('.path');
  const steps = document.querySelectorAll('.bio [data-step]');
  if (!path || !steps.length || !hasIO) return;
  const items = path.querySelectorAll('li');
  const ol = path.querySelector('ol');
  const set = (n) => {
    items.forEach((li, k) => li.classList.toggle('on', k < n && Number(li.dataset.for) === n));
    ol.style.setProperty('--p', String((n - 1) / (items.length - 1)));
  };
  set(1);
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) set(Number(e.target.dataset.step));
  }, { rootMargin: '-40% 0px -45% 0px' });
  steps.forEach((s) => io.observe(s));
}

setupHero();
setupChapters();
setupBio();
mountScene({ canvas: document.getElementById('scene'), webgl: false, load: () => import('./scene.js') });
