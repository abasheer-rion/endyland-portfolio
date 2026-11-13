// Public spending data explorer page. Only this page loads this file.
// Shared parts (reveal, count-up, back links) come from /shared/project.js.
// The merge table: a button folds each vendor's spellings into one row with the total.
import { initProject } from '../../shared/project.js';

initProject();

const btn = document.querySelector('.se-btn');
const status = document.getElementById('se-status');
const rows = [...document.querySelectorAll('.se-row')];
rows.forEach((r, i) => {
  r.style.setProperty('--k', i);
  r.dataset.name = r.querySelector('.se-name').textContent;
  r.dataset.amt = r.querySelector('.se-amt').textContent;
});
let merged = false, timer = 0;
function setMerged(on) {
  merged = on;
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? 'Show raw rows' : 'Merge duplicates';
  clearTimeout(timer);
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
    } else if (on) {
      r.classList.add('se-fold');
    } else {
      r.hidden = false;
      r.classList.remove('se-fold');
    }
  }
  if (on) timer = setTimeout(() => rows.forEach((r) => { if (r.classList.contains('se-fold')) r.hidden = true; }), 220);
  status.textContent = on ? '3 rows, one per vendor, with the totals added up.' : '9 rows, 3 vendors spelled 9 ways.';
}
btn.addEventListener('click', () => setMerged(!merged));

