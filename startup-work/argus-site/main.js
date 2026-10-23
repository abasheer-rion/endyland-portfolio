// useargus.co project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: the red glow that follows the pointer over the hero, the browser and phone that drift
// apart as you scroll, and gallery shots that rise in. No canvas: it is all CSS moved by a few variables.
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion, onVisible } from '../../shared/motion.js';
import { follow } from '../argus/fx.js';

initProject();

const hero = document.querySelector('.proj-site .proj-hero');
follow(hero, (x, y) => {
  hero.style.setProperty('--sx', `${(x * 100).toFixed(1)}%`);
  hero.style.setProperty('--sy', `${(y * 100).toFixed(1)}%`);
});

// Parallax: the phone rises faster than the browser while the hero scrolls away.
const stage = document.querySelector('.site-stage');
if (stage) {
  let raf = 0;
  const upd = () => {
    raf = 0;
    if (prefersReducedMotion()) { stage.style.removeProperty('--ph'); stage.style.removeProperty('--b'); return; }
    const r = stage.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const k = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
    stage.style.setProperty('--ph', `${(k * 70).toFixed(1)}px`);
    stage.style.setProperty('--b', `${(k * 18).toFixed(1)}px`);
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
  upd();
}

onVisible('.proj-site .gallery li', (el) => el.classList.add('in'), { threshold: 0.12 });
