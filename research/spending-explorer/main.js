// Public spending data explorer project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// - scene.js: ledger rows streaming behind the page, a plain 2D canvas loaded after first paint.
// - The merge table: a button folds each vendor's spellings into one row with the total.
// - The search-time race plays when it scrolls in, with both bars to scale.
// Reduced motion: still frame, no fold animation, the race shows its end state.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { onVisible, prefersReducedMotion } from '../../shared/motion.js';

initProject();

mountScene({ canvas: document.getElementById('se-scene'), load: () => import('./scene.js'), webgl: false, dprCap: 1.5, lowDprCap: 1 });

// ---------- merge ----------
const btn = document.querySelector('.se-btn');
const status = document.getElementById('se-status');
const rows = [...document.querySelectorAll('.se-row')];
rows.forEach((r) => {
  r.dataset.name = r.querySelector('.se-name').textContent;
  r.dataset.amt = r.querySelector('.se-amt').textContent;
});
let merged = false, timer = 0;
function setMerged(on) {
  merged = on;
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? 'Show raw rows' : 'Merge duplicates';
  clearTimeout(timer);
  const quick = prefersReducedMotion();
  for (const r of rows) {
    const name = r.querySelector('.se-name'), amt = r.querySelector('.se-amt');
    if (r.classList.contains('se-first')) {
      name.textContent = on ? r.dataset.canon : r.dataset.name;
      amt.textContent = on ? `$${r.dataset.total}` : r.dataset.amt;
      r.querySelector('.se-badge')?.remove();
      if (on) {
        const b = document.createElement('span');
        b.className = 'se-badge'; b.textContent = `${r.dataset.n} spellings`;
        r.querySelector('.se-v').append(b);
      }
      r.classList.toggle('se-merged', on);
    } else if (on) {
      r.classList.add('se-fold');
      if (quick) r.hidden = true;
    } else {
      r.hidden = false;
      r.classList.remove('se-fold');
    }
  }
  if (on && !quick) timer = setTimeout(() => rows.forEach((r) => { if (r.classList.contains('se-fold')) r.hidden = true; }), 420);
  status.textContent = on ? '3 rows, one per vendor, with the totals added up.' : '9 rows, 3 vendors spelled 9 ways.';
}
btn.addEventListener('click', () => setMerged(!merged));

// ---------- race ----------
onVisible('.se-race', (el) => el.classList.add('is-in'), { threshold: 0.5 });
