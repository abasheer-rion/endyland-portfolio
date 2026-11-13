// Shared setup for the project pages (/projects/<slug>/). Each page's main.js calls setupPage().
//   import { setupPage, sectionProgress } from '../page.js';
//
// setupPage()
//  - runs initProject() from /shared/project.js (back links, reveal of .did-list)
//  - marks the blocks inside each .proj-section for the one-shot rise entrance from /shared/motion.js
//  - drops data-labels from 3D stages on narrow screens, where part names would cover the model
// sectionProgress(section, cb, opts)
//  - calls cb(p) with p from 0 to 1 as the section scrolls through the screen, on every frame the page scrolls.
//    Used to open the exploded view of the sensor box and to start the pipeline animation.
import { initProject } from '../shared/project.js';
import { initMotion } from '../shared/motion.js';

const BLOCKS = ':scope > h2, :scope > h3, :scope > p, :scope > ul, :scope > ol, :scope > dl, :scope > .figure, :scope > .table-wrap, :scope > details, :scope > pre, :scope > .split-text > *';

export function setupPage() {
  if (innerWidth < 640) for (const s of document.querySelectorAll('.model-stage[data-labels]')) s.removeAttribute('data-labels');
  initProject({ gallery: false, counts: false });
  restackTables();
  for (const sec of document.querySelectorAll('.proj-section')) {
    for (const el of sec.querySelectorAll(BLOCKS)) {
      if (el.hasAttribute('data-reveal') || el.hasAttribute('data-reveal-group') || el.closest('[data-reveal]')) continue;
      el.setAttribute('data-reveal', 'rise');
    }
  }
  initMotion();
}

// Tables with a header row restack under 640px: each cell gets its column name as a label (shared/base.css .restack).
export function restackTables() {
  for (const t of document.querySelectorAll('table.facts')) {
    const heads = [...t.querySelectorAll('thead th')].map((h) => h.textContent.trim());
    if (!heads.length) continue;
    for (const tr of t.querySelectorAll('tbody tr')) {
      [...tr.children].forEach((c, i) => { if (c.tagName === 'TD' && heads[i]) c.setAttribute('data-label', heads[i]); });
    }
    t.classList.add('restack');
  }
}

// p = 0 when the section's top is at `from` of the screen height (0.6 = 60% down), 1 after the section has moved
// up by `span` of its own height.
export function sectionProgress(section, cb, { from = 0.6, span = 0.5 } = {}) {
  if (!section) return () => {};
  let raf = 0, last = -1;
  const run = () => {
    raf = 0;
    const r = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * from - r.top) / Math.max(1, r.height * span)));
    if (Math.abs(p - last) > 0.002) { last = p; cb(p); }
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(run); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick, { passive: true });
  kick();
  return () => { removeEventListener('scroll', kick); removeEventListener('resize', kick); };
}

// Calls fn(stage) when the 3D stage inside `el` has loaded (now, if it already has).
export function whenModelReady(el, fn) {
  if (!el) return;
  if (el.__stage?.model) { fn(el.__stage); return; }
  el.addEventListener('model:ready', () => fn(el.__stage), { once: true });
}
