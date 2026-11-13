// RION brand behaviour for the RION pages: /startup-work/rion/, nexus-command-center, rion-county-api.
// Styles are in brand.css and /startup-work/pages.css. This file:
// - runs initProject() from /shared/project.js (what I owned reveal, count-up, lightbox, back links)
// - lets rows marked .a-steps, .a-parts, .a-time and .sub-list rise in as they scroll into view
// - mounts the page's 2D canvas scene (<canvas class="proj-scene">), which pauses off screen and in a hidden tab
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';
import { initDiagrams } from '../diagram.js';
import { mountScene } from '../../shared/scene-loader.js';

const root = document.documentElement;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Where the visitor clicked on the page before this one, as shares of the screen, or null.
// nav.js saves it for the page-theme wipe. Only trusted on a fresh, same-site navigation.
export function arrivalPoint() {
  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type !== 'navigate') return null;
    if (!document.referrer || new URL(document.referrer).origin !== location.origin) return null;
    const pt = JSON.parse(sessionStorage.getItem('endyland-vt-point') || 'null');
    if (Array.isArray(pt) && pt.length === 2 && pt.every(Number.isFinite)) return [clamp01(pt[0]), clamp01(pt[1])];
  } catch { /* storage off or bad value */ }
  return null;
}

export function initRion({ scene } = {}) {
  initProject();
  initDiagrams();
  document.querySelectorAll('.a-steps, .a-parts, .a-time, .sub-list').forEach((list) => {
    [...list.children].forEach((li, i) => { li.classList.add('a-rv'); li.style.setProperty('--i', String(i)); });
  });
  onVisible('.a-rv', (el) => el.classList.add('in'), { threshold: 0.12 });
  const canvas = document.querySelector('canvas.proj-scene');
  if (scene && canvas) {
    mountScene({ canvas, load: scene, webgl: false, dprCap: 1.5, lowDprCap: 1 })
      .then((s) => { if (s) root.classList.add('rion-live'); });
  }
}
