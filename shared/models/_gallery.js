// Test page script for the model kit. ?only=<model> shows one model full window, for close looks and poster shots:
//   ?only=sensor-box&explode=1&az=0.6&el=0.5&zoom=1&bg=dark|clear&labels=1&still=1
// ?stats=1 prints draw cost under each model.
import { mountModel, mountAll } from './stage.js';

const q = new URLSearchParams(location.search);
const show = (msg) => { const p = document.createElement('p'); p.textContent = msg; p.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;background:#9C4A22;color:#fff;padding:6px 10px;font:14px monospace;max-width:90vw'; document.body.append(p); };
addEventListener('error', (e) => show(`error: ${e.message} ${e.filename || ''}:${e.lineno || ''}`));
addEventListener('unhandledrejection', (e) => show(`rejected: ${e.reason && (e.reason.stack || e.reason)}`));
const warn = console.warn; console.warn = (...a) => { show(a.map((x) => (x && x.stack) || x).join(' ')); warn(...a); };

const only = q.get('only');
if (only) {
  const wrap = document.createElement('div'); wrap.className = `gal-solo ${q.get('bg') || ''}`;
  const el = document.createElement('div'); el.className = 'model-stage'; el.dataset.softGl = '';
  if (q.has('labels')) el.dataset.labels = '';
  document.querySelector('.gal-grid')?.remove();
  if (q.get('bg') === 'clear') document.documentElement.classList.add('gal-bare');
  wrap.append(el); document.body.append(wrap);
  const options = {};
  for (const [k, v] of q) if (!['only', 'bg', 'labels', 'stats'].includes(k)) options[k] = v;
  const stage = mountModel(el, { model: only, options });
  if (q.has('stats')) setInterval(() => show(JSON.stringify(stage.stats())), 1500);
} else {
  mountAll();
  if (q.has('stats')) {
    setInterval(() => {
      for (const el of document.querySelectorAll('.model-stage')) {
        const s = el.__stage && el.__stage.stats(); if (!s) continue;
        let out = el.parentNode.querySelector('output'); if (!out) { out = document.createElement('output'); el.parentNode.append(out); }
        out.textContent = ` ${s.ms} ms, ${s.calls} calls, ${s.triangles} triangles`;
      }
    }, 1500);
  }
}
