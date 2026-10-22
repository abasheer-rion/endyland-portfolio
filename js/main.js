// Page behaviour that does not need 3D: reveals and card tilt.
// The 3D scene loads afterwards, only when WebGL 2 works.

const root = document.documentElement;
const reduceQ = matchMedia('(prefers-reduced-motion: reduce)');
const fineQ = matchMedia('(hover: hover) and (pointer: fine)');

// Staggered reveal. Items already on screen at load stay visible.
function setupReveal() {
  const items = [...document.querySelectorAll('.reveal')];
  if (reduceQ.matches || !('IntersectionObserver' in window)) return;
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
    el.style.setProperty('--i', String(n % 3));
    if (el.getBoundingClientRect().top > vh * 0.92) {
      el.classList.add('pre');
      io.observe(el);
    }
  }
}

// 3D tilt and pointer glow on cards.
function setupTilt() {
  const wraps = document.querySelectorAll('.tilt-wrap');
  for (const wrap of wraps) {
    const card = wrap.querySelector('.tilt');
    let raf = 0, px = 0.5, py = 0.5;
    const apply = () => {
      raf = 0;
      card.style.setProperty('--rx', ((0.5 - py) * 9).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((px - 0.5) * 12).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    };
    wrap.addEventListener('pointermove', (e) => {
      if (reduceQ.matches || !fineQ.matches) return;
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

function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function startScene() {
  const canvas = document.getElementById('scene');
  if (!canvas || !hasWebGL2()) {
    root.classList.add('no-webgl');
    return;
  }
  import('./scene.js')
    .then((m) => m.start(canvas, reduceQ))
    .catch(() => root.classList.add('no-webgl'));
}

setupReveal();
setupTilt();

// Let the text paint first, then build the scene when the browser is idle.
const later = window.requestIdleCallback || ((f) => setTimeout(f, 200));
if (document.readyState === 'complete') later(startScene, { timeout: 1500 });
else addEventListener('load', () => later(startScene, { timeout: 1500 }), { once: true });
