// Argus Dashboard project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// This page adds: the app's dot matrix scene (scene.js, a 2D canvas), the dashboard picture that leans
// toward the pointer, sparklines that draw on, and the side rail that marks the section you are reading.
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';
import { mountScene } from '../../shared/scene-loader.js';
import { tilt } from '../argus/fx.js';

initProject();
tilt(document.querySelector('.a-tilt'), { max: 5 });
onVisible('.proj-dash .stat, .proj-dash .gallery li', (el) => el.classList.add('in'), { threshold: 0.2 });

// Side rail: mark the section in view.
const links = [...document.querySelectorAll('.dash-rail a[href^="#"]')];
const targets = links.map((a) => document.getElementById(a.hash.slice(1))?.closest('section, header')).filter(Boolean);
if (links.length && 'IntersectionObserver' in window) {
  const seen = new Map();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => seen.set(e.target, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null, top = 0;
    targets.forEach((el) => { const r = seen.get(el) || 0; if (r > top) { top = r; best = el; } });
    links.forEach((a, i) => {
      if (targets[i] === best) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }, { rootMargin: '-30% 0px -50% 0px', threshold: [0, 0.01, 0.25, 0.5, 1] });
  targets.forEach((el) => io.observe(el));
}

mountScene({ canvas: document.getElementById('dash-scene'), load: () => import('./scene.js'), webgl: false, dprCap: 1.5 });
