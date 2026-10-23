// Shared building blocks for project pages (/<tab>/<slug>/). Each page's main.js calls initProject().
//
//   import { initProject } from '../../shared/project.js';
//   initProject();
//
// What it does:
// - "What I did" reveal: list items in .did-list rise in one after another as they scroll into view.
// - Count-up: numbers marked [data-count] count up once when they scroll into view. The HTML always
//   holds the final value, and screen readers read a hidden copy of it.
// - Gallery lightbox: links in .gallery (a.lb) open their full image in a <dialog>. Arrow keys move,
//   Escape closes, focus goes back to the link. Without JS the link just opens the image.
// - Back links: a.back-link goes back in history when the visitor came straight from that page, so the
//   tab keeps its scroll position. Otherwise it is a normal link.
// The page-theme transition (a circle wipe from the click point) is CSS in base.css plus nav.js.
// With reduced motion: no reveal, no count-up, no lightbox animation. Everything shows in its end state.
import { prefersReducedMotion, onReducedMotionChange, onVisible } from './motion.js';

const root = document.documentElement;

export function initProject({ reveal = true, counts = true, gallery = true, back = true } = {}) {
  root.classList.toggle('pj-anim', !prefersReducedMotion());
  onReducedMotionChange((r) => {
    root.classList.toggle('pj-anim', !r);
    if (r) document.querySelectorAll('.did-list li').forEach((li) => li.classList.add('in'));
  });
  if (reveal) setupReveal();
  if (counts) setupCounts();
  if (gallery) setupGallery();
  if (back) setupBackLinks();
}

// ---------- What I did ----------
export function setupReveal(selector = '.did-list') {
  for (const list of document.querySelectorAll(selector)) {
    const items = [...list.children];
    items.forEach((li, i) => li.style.setProperty('--i', String(i)));
    onVisible([list], () => items.forEach((li) => li.classList.add('in')), { threshold: 0.05 });
  }
}

// ---------- Count-up ----------
// Markup: <b><span class="visually-hidden">$480K</span><span aria-hidden="true" data-count="480" data-pre="$" data-post="K">$480K</span></b>
export function setupCounts(selector = '[data-count]') {
  const els = [...document.querySelectorAll(selector)];
  if (!els.length || prefersReducedMotion()) return;
  onVisible(els, (el) => {
    const end = parseFloat(el.dataset.count);
    if (!Number.isFinite(end)) return;
    const final = el.textContent;
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const pre = el.dataset.pre || '', post = el.dataset.post || '';
    const comma = el.dataset.comma === '1';
    const dur = 1100, t0 = performance.now();
    const fmt = (v) => {
      let s = v.toFixed(dec);
      if (comma) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return pre + s + post;
    };
    const step = (now) => {
      if (prefersReducedMotion()) { el.textContent = final; return; }
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = k >= 1 ? final : fmt(end * e);
      if (k < 1) requestAnimationFrame(step);
    };
    el.textContent = fmt(0);
    requestAnimationFrame(step);
  }, { threshold: 0.4 });
}

// ---------- Gallery lightbox ----------
export function setupGallery(selector = 'a.lb') {
  const links = [...document.querySelectorAll(selector)];
  if (!links.length || typeof HTMLDialogElement !== 'function') return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Image viewer');
  dlg.dataset.count = String(links.length);
  const fig = document.createElement('figure');
  const img = document.createElement('img');
  img.decoding = 'async';
  const cap = document.createElement('figcaption');
  fig.append(img, cap);
  const btn = (cls, label, text) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = `lb-btn ${cls}`; b.setAttribute('aria-label', label); b.textContent = text;
    return b;
  };
  const close = btn('lb-close', 'Close', '×');
  const prev = btn('lb-prev', 'Previous image', '‹');
  const next = btn('lb-next', 'Next image', '›');
  dlg.append(fig, close, prev, next);
  document.body.append(dlg);

  let at = 0, opener = null;
  const show = (i) => {
    at = (i + links.length) % links.length;
    const a = links[at];
    const thumb = a.querySelector('img');
    img.src = a.href;
    img.alt = thumb ? thumb.alt : '';
    if (a.dataset.w && a.dataset.h) { img.width = +a.dataset.w; img.height = +a.dataset.h; }
    // Copy the caption (with its credit links) from the page, node by node.
    const fc = a.closest('figure')?.querySelector('figcaption');
    cap.replaceChildren(...(fc ? [...fc.childNodes].map((n) => n.cloneNode(true)) : []));
  };
  links.forEach((a, i) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    opener = a; show(i); dlg.showModal();
  }));
  close.addEventListener('click', () => dlg.close());
  prev.addEventListener('click', () => show(at - 1));
  next.addEventListener('click', () => show(at + 1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
  });
  // A click on the dark backdrop (outside the figure and buttons) closes it.
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { img.removeAttribute('src'); opener?.focus({ preventScroll: true }); });
}

// ---------- Back links ----------
export function setupBackLinks(selector = 'a.back-link') {
  for (const a of document.querySelectorAll(selector)) {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      let ref;
      try { ref = new URL(document.referrer); } catch { return; }
      const to = new URL(a.href, location.href);
      if (ref.origin === location.origin && ref.pathname === to.pathname && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
  }
}
