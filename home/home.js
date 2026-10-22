// Home page behaviour: reveals and card tilt. The beam scene loads after first paint.
import { prefersReducedMotion, finePointer } from '../shared/motion.js';
import { mountScene } from '../shared/scene-loader.js';

// Staggered reveal. Items already on screen at load stay visible.
function setupReveal() {
  const items = [...document.querySelectorAll('.reveal')];
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  const vh = innerHeight;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      e.target.classList.remove('pre');
      io.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  // Number items within each group, so each row staggers on its own.
  const groups = new Map();
  for (const el of items) {
    const g = el.parentElement;
    const n = groups.get(g) || 0;
    groups.set(g, n + 1);
    el.style.setProperty('--i', String(n % 4));
    if (el.getBoundingClientRect().top > vh * 0.92) {
      el.classList.add('pre');
      io.observe(el);
    }
  }
}

// 3D tilt and pointer glow on the room cards.
function setupTilt() {
  for (const wrap of document.querySelectorAll('.tilt-wrap')) {
    const card = wrap.querySelector('.tilt');
    let raf = 0, px = 0.5, py = 0.5;
    const apply = () => {
      raf = 0;
      card.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    };
    wrap.addEventListener('pointermove', (e) => {
      if (prefersReducedMotion() || !finePointer()) return;
      const r = card.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      wrap.classList.add('moving');
      if (!raf) raf = requestAnimationFrame(apply);
    }, { passive: true });
    wrap.addEventListener('pointerleave', () => {
      wrap.classList.remove('moving');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }
}

setupReveal();
setupTilt();
mountScene({ canvas: document.getElementById('scene'), load: () => import('./scene.js') });
