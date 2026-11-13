// Shared building blocks for project pages (/<tab>/<slug>/). Each page's main.js calls initProject().
//
//   import { initProject } from '../../shared/project.js';
//   initProject();
//
// What it does:
// - Reveal: lines in .did-list are inked in left to right, one after another (30ms apart), as they scroll into
//   view. Any element with data-wipe gets the same ink-wipe. New pages use data-reveal (motion.js) instead.
// - Numbers stay as written. The old count-up from zero is retired (setupCounts does nothing).
// - Gallery lightbox: links in .gallery (a.lb) open their full image in a <dialog>. Arrow keys move,
//   Escape closes, focus goes back to the link. Without JS the link just opens the image.
// - Back links: a.back-link goes back in history when the visitor came straight from that page, so the
//   tab keeps its scroll position. Otherwise it is a normal link.
// The page turn and the page-theme transition (a circle wipe from the click point) are CSS in base.css plus nav.js.
import { onVisible } from './motion.js';

const root = document.documentElement;

export function initProject({ reveal = true, counts = true, gallery = true, back = true } = {}) {
  root.classList.add('pj-anim');
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
  // Single elements marked data-wipe are inked in on their own when they scroll in.
  onVisible(document.querySelectorAll('[data-wipe]'), (el) => el.classList.add('in'), { threshold: 0.1 });
}

// ---------- Count-up (retired) ----------
// Numbers used to run up from zero, which showed a false figure for a moment. They now stay as written.
// Kept as an export so existing pages keep working. For a value that changes while the page is open,
// use tweenNumber from motion.js.
export function setupCounts() {}

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
