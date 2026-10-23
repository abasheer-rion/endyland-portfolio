// RION brand behaviour, shared by the four RION pages: /startup-work/rion/, /startup-work/nexus-command-center/,
// /startup-work/rion-county-api/ and /web-design/rion-website/. Styles are in brand.css next to this file.
//
//   import { initRion } from '/startup-work/rion/brand.js';
//   initRion({ scene: () => import('./scene.js') });
//
// - initProject() from /shared/project.js (what I did reveal, count-up, lightbox, back links).
// - Arrival: when you came here by clicking a link on this site, a red bloom grows from the click point.
// - .rion-glow: a red edge glow that follows the pointer.
// - .rion-code: decorative code panels type themselves out when they scroll into view.
// - .rion-tilt: a screenshot tilts toward the pointer (mouse and trackpad only).
// - Mounts the page's 2D canvas scene (<canvas class="proj-scene">) with /shared/scene-loader.js.
// Reduced motion: no bloom, no typing, no tilt, and the scene draws one still frame.
import { initProject } from '../../shared/project.js';
import { prefersReducedMotion, onReducedMotionChange, finePointer, onVisible } from '../../shared/motion.js';
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
  arrive();
  setupEdgeGlow();
  setupTilt();
  setupTyped();
  const canvas = document.querySelector('canvas.proj-scene');
  if (scene && canvas) {
    mountScene({ canvas, load: scene, webgl: false, dprCap: 1.5, lowDprCap: 1 })
      .then((s) => { if (s) root.classList.add('rion-live'); });
  }
}

function arrive() {
  const pt = arrivalPoint();
  if (!pt || prefersReducedMotion()) return;
  root.style.setProperty('--arrive-x', (pt[0] * 100).toFixed(1) + '%');
  root.style.setProperty('--arrive-y', (pt[1] * 100).toFixed(1) + '%');
  root.classList.add('rion-arrive');
  setTimeout(() => root.classList.remove('rion-arrive'), 1700);
}

export function setupEdgeGlow(selector = '.rion-glow') {
  for (const el of document.querySelectorAll(selector)) {
    const set = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    };
    el.addEventListener('pointermove', set, { passive: true });
    el.addEventListener('pointerdown', set, { passive: true });
  }
}

export function setupTilt(selector = '.rion-tilt', max = 5) {
  if (!finePointer()) return;
  for (const el of document.querySelectorAll(selector)) {
    const frame = el.closest('.rion-frame') || el;
    el.addEventListener('pointermove', (e) => {
      if (prefersReducedMotion()) return;
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
      el.classList.add('live');
      el.style.setProperty('--ry', (nx * max * 2).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-ny * max * 2).toFixed(2) + 'deg');
      frame.style.setProperty('--sheen', (100 - (nx + 0.5) * 100).toFixed(0) + '%');
    }, { passive: true });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('live');
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
      frame.style.setProperty('--sheen', '100%');
    });
  }
}

// Types the text of each .rion-code panel in order. Lines with class "cmd" type like a person,
// the output lines print fast, like a terminal. The final text is in the HTML.
export function setupTyped(selector = '.rion-code') {
  const blocks = [...document.querySelectorAll(selector)];
  if (!blocks.length || prefersReducedMotion() || !('IntersectionObserver' in window)) return;
  for (const block of blocks) {
    const body = block.querySelector('.rc-body') || block;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.data.trim()) parts.push({ n, text: n.data, line: n.parentElement.closest('.ln') });
    }
    if (!parts.length) continue;
    block.style.minHeight = block.offsetHeight + 'px';
    parts.forEach((p) => { p.n.data = ''; });
    const finish = () => { parts.forEach((p) => { p.n.data = p.text; }); body.querySelectorAll('.cur').forEach((l) => l.classList.remove('cur')); };
    const stop = onReducedMotionChange((r) => { if (r) finish(); });
    onVisible([block], () => {
      let i = 0, c = 0, last = null;
      const step = () => {
        if (prefersReducedMotion()) { finish(); return; }
        if (i >= parts.length) { setTimeout(() => last && last.classList.remove('cur'), 1600); stop(); return; }
        const p = parts[i];
        if (p.line !== last) { last && last.classList.remove('cur'); last = p.line; last && last.classList.add('cur'); }
        const cmd = p.line && p.line.classList.contains('cmd');
        const n = cmd ? 1 : 3;
        c = Math.min(p.text.length, c + n);
        p.n.data = p.text.slice(0, c);
        if (c >= p.text.length) {
          i++; c = 0;
          const nextLine = parts[i] && parts[i].line !== p.line;
          setTimeout(step, nextLine ? (cmd ? 380 : 90) : 0);
        } else {
          setTimeout(step, cmd ? 46 + Math.random() * 40 : 12);
        }
      };
      setTimeout(step, 250);
    }, { threshold: 0.35 });
  }
}
