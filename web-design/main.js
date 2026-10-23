// web-design tab: page behaviour. Only this page loads this file.
// The 3D scene loads after first paint through the shared loader, and pauses when hidden or off screen.
// Everything here is decoration on top of plain HTML. With reduced motion, cards do not flip,
// nothing springs, and both faces of every card show stacked.
import { mountScene } from '../shared/scene-loader.js';
import { prefersReducedMotion, onReducedMotionChange, finePointer, onVisible } from '../shared/motion.js';
import { setPalette } from './bus.js';

const root = document.documentElement;
const intro = document.querySelector('.intro');
const items = [...document.querySelectorAll('.item')];
const ribbonA = document.querySelector('.ribbon-a');
const ribbonB = document.querySelector('.ribbon-b');
const motion = () => root.classList.contains('wd-motion');

root.classList.toggle('wd-motion', !prefersReducedMotion());
if (motion()) intro.classList.add('pre');

mountScene({
  canvas: document.getElementById('scene'),
  load: () => import('./scene.js'),
});

// ---------- Intro letters ----------
// The heading keeps its text for screen readers. The letters you see are a copy, one span each.
const h1 = intro.querySelector('h1');
const word = h1.textContent.trim();
h1.textContent = '';
const said = document.createElement('span');
said.className = 'visually-hidden';
said.textContent = word;
const shown = document.createElement('span');
shown.setAttribute('aria-hidden', 'true');
let n = 0;
let wordBox = null;
for (const ch of word) {
  if (ch === ' ') { shown.append(' '); wordBox = null; continue; }
  // Letters sit inside a box per word, so a line only breaks between words.
  if (!wordBox) { wordBox = document.createElement('span'); wordBox.className = 'word'; shown.append(wordBox); }
  const s = document.createElement('span');
  s.className = 'ch';
  s.textContent = ch;
  // Where each letter drifts as the intro scrolls away.
  s.style.setProperty('--i', n);
  s.style.setProperty('--dy', String(-(60 + ((n * 47) % 110))));
  s.style.setProperty('--dr', String(((n * 61) % 50) - 25));
  wordBox.append(s);
  n++;
}
h1.append(said, shown);
const boing = (el) => {
  if (!motion() || el.classList.contains('boing')) return;
  el.classList.add('boing');
  el.addEventListener('animationend', () => el.classList.remove('boing'), { once: true });
};
shown.addEventListener('pointerover', (e) => { if (e.target.classList?.contains('ch')) boing(e.target); });
shown.addEventListener('pointerdown', () => shown.querySelectorAll('.ch').forEach((c, i) => setTimeout(() => boing(c), i * 40)));
requestAnimationFrame(() => requestAnimationFrame(() => intro.classList.remove('pre')));

// ---------- Springs ----------
// A tiny spring: x chases t, overshoots a little and settles.
class Spring {
  constructor(v) { this.x = v; this.v = 0; this.t = v; }
  step(dt, k = 220, c = 15) { const a = k * (this.t - this.x) - c * this.v; this.v += a * dt; this.x += this.v * dt; }
  get done() { return Math.abs(this.t - this.x) < 0.002 && Math.abs(this.v) < 0.002; }
}
const active = new Set();
let loop = 0, last = 0;
function tick(now) {
  const dt = Math.min(0.033, (now - (last || now)) / 1000);
  last = now;
  for (const c of active) {
    c.rx.step(dt); c.ry.step(dt); c.s.step(dt, 300, 13);
    const st = c.card.style;
    st.setProperty('--rx', c.rx.x.toFixed(2) + 'deg');
    st.setProperty('--ry', c.ry.x.toFixed(2) + 'deg');
    st.setProperty('--s', c.s.x.toFixed(4));
    if (!c.hover && c.rx.done && c.ry.done && c.s.done) {
      active.delete(c);
      st.removeProperty('--rx'); st.removeProperty('--ry'); st.removeProperty('--s');
    }
  }
  loop = active.size ? requestAnimationFrame(tick) : 0;
  if (!loop) last = 0;
}
const wake = (c) => { active.add(c); if (!loop) loop = requestAnimationFrame(tick); };

// ---------- Cards: flip, springy tilt, reveal ----------
const SVG = 'http://www.w3.org/2000/svg';
function flipIcon() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const d of ['M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3', 'M18.5 2.5v4.5H14M5.5 21.5V17H10']) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '2.6');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    svg.append(p);
  }
  return svg;
}
const makeBtn = (text, label) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'flip-btn';
  b.append(flipIcon(), text);
  b.setAttribute('aria-label', label);
  return b;
};
const states = new Map();

function setFlip(item, on) {
  if (!motion()) return;
  if (item.classList.contains('flipped') === on) return;
  item.classList.toggle('flipped', on);
  const c = states.get(item);
  c.s.v += 1.6; // a little hop as it turns
  wake(c);
}

for (const item of items) {
  const name = item.querySelector('h2').textContent.trim();
  const card = item.querySelector('.card');
  const front = item.querySelector('.face-front');
  const back = item.querySelector('.face-back');
  const toBack = makeBtn('Flip', `Flip, show details for ${name}`);
  const toFront = makeBtn('Flip back', `Flip back, show the picture for ${name}`);
  front.append(toBack);
  back.append(toFront);
  const c = { card, rx: new Spring(0), ry: new Spring(0), s: new Spring(1), hover: false };
  states.set(item, c);

  toBack.addEventListener('click', (e) => { e.stopPropagation(); setFlip(item, true); toFront.focus({ preventScroll: true }); });
  toFront.addEventListener('click', (e) => { e.stopPropagation(); setFlip(item, false); toBack.focus({ preventScroll: true }); });
  // Keyboard: tabbing into a face turns that face to the front, at once, so focus is never on the hidden face.
  const snapTo = (to) => {
    if (item.classList.contains('flipped') === to) return;
    item.classList.add('snap');
    setFlip(item, to);
    requestAnimationFrame(() => requestAnimationFrame(() => item.classList.remove('snap')));
  };
  front.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) snapTo(false); else setFlip(item, false); });
  back.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) snapTo(true); else setFlip(item, true); });
  // Click or tap anywhere else on a card to turn it over. Not while selecting text.
  const tapFlip = (to) => (e) => {
    if (e.target.closest('a,button,.badge-private')) return;
    const sel = getSelection();
    if (sel && !sel.isCollapsed) return;
    setFlip(item, to);
  };
  front.addEventListener('click', tapFlip(true));
  back.addEventListener('click', tapFlip(false));

  // Springy tilt toward the pointer. Mouse and trackpad only.
  card.addEventListener('pointermove', (e) => {
    if (!motion() || !finePointer() || e.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const flip = item.classList.contains('flipped') ? -1 : 1;
    c.hover = true;
    c.rx.t = (0.5 - y) * 12;
    c.ry.t = (x - 0.5) * 16 * flip;
    c.s.t = 1.025;
    card.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
    card.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
    card.style.setProperty('--glare', '1');
    wake(c);
  });
  card.addEventListener('pointerleave', () => {
    c.hover = false; c.rx.t = 0; c.ry.t = 0; c.s.t = 1;
    card.style.setProperty('--glare', '0');
    if (motion()) wake(c);
  });
  // Touch: a soft squish under the finger.
  card.addEventListener('pointerdown', (e) => {
    if (!motion() || e.pointerType === 'mouse') return;
    c.s.t = 0.97; wake(c);
  });
  const unpress = (e) => { if (e.pointerType !== 'mouse') { c.s.t = 1; if (motion()) wake(c); } };
  card.addEventListener('pointerup', unpress);
  card.addEventListener('pointercancel', unpress);
}

// Cards drop in as they scroll into view. Cards that arrive together come in one after another.
let batch = 0, batchReset = 0;
onVisible(items, (el) => {
  el.style.setProperty('--d', (batch * 0.12).toFixed(2) + 's');
  batch++;
  if (!batchReset) batchReset = requestAnimationFrame(() => { batch = 0; batchReset = 0; });
  el.classList.add('in');
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

// ---------- Scroll: ribbons, letters and the palette ----------
let ticking = false;
function onScroll() {
  ticking = false;
  const y = scrollY, vh = innerHeight;
  intro.style.setProperty('--hp', Math.min(1, Math.max(0, y / (vh * 0.75))).toFixed(3));
  if (motion()) {
    ribbonA.style.setProperty('--rba', (-(y * 0.55) % 240).toFixed(1) + 'px');
    ribbonB.style.setProperty('--rbb', ((y * 0.4) % 200 - 200).toFixed(1) + 'px');
  }
  // The card nearest the middle of the screen sets the palette. The intro has its own.
  let pal = 0, best = vh * 0.6;
  if (y > vh * 0.45) {
    items.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh / 2);
      if (r.bottom > 0 && r.top < vh && d < best) { best = d; pal = i + 1; }
    });
    if (!pal) pal = Number(root.dataset.pal || 0);
  }
  if (String(pal) !== root.dataset.pal) { root.dataset.pal = String(pal); setPalette(pal); }
}
const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
addEventListener('scroll', queue, { passive: true });
addEventListener('resize', queue, { passive: true });
onScroll();

// ---------- Reduced motion can change while the page is open ----------
onReducedMotionChange((reduced) => {
  root.classList.toggle('wd-motion', !reduced);
  if (!reduced) return;
  intro.classList.remove('pre');
  items.forEach((el) => { el.classList.remove('flipped'); el.classList.add('in'); });
  for (const c of active) { c.card.style.removeProperty('--rx'); c.card.style.removeProperty('--ry'); c.card.style.removeProperty('--s'); }
  active.clear();
  ribbonA.style.removeProperty('--rba');
  ribbonB.style.removeProperty('--rbb');
});
