// Research tab: page behaviour. Only this page loads this file.
// Two scenes load after first paint through the shared loader: the 3D scope behind the page
// and the live polar plot. Both pause when hidden or off screen.
// Everything here is extra. Text, links and the static plots work without it.
import { mountScene } from '../shared/scene-loader.js';
import { prefersReducedMotion, onReducedMotionChange, finePointer, onVisible } from '../shared/motion.js';
import { state, subscribe, setSteer, setReduced, gainPath, gainDb, plotX, PLOT, MAX } from './state.js';

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

root.classList.add('rs-js');
const applyReduced = (r) => { root.classList.toggle('rs-anim', !r); setReduced(r); };
applyReduced(prefersReducedMotion());
onReducedMotionChange(applyReduced);

mountScene({ canvas: $('#scene'), load: () => import('./scene.js'), dprCap: 1.5, lowDprCap: 1 });
mountScene({ canvas: $('#polar'), load: () => import('./polar.js'), webgl: false, dprCap: 2, lowDprCap: 2 });

// ---------- reveals: each channel powers on like a CRT, then its parts come in one by one ----------
$$('.ch').forEach((ch) => $$('.rv', ch).forEach((el, i) => el.style.setProperty('--i', i)));
// Channels and plots are checked by position on every scroll, not with an IntersectionObserver.
// A closed channel is clipped to a thin trace, so an observer can miss it after a jump or a fast
// fling, and the channel would stay dark. Plots start drawing as soon as they are on screen.
const pending = [...$$('.ch'), ...$$('.plot')];
function reveal() {
  const vh = innerHeight;
  // Channels come first in the list, so a plot can start in the same pass as its channel.
  for (const el of [...pending]) {
    const plot = el.classList.contains('plot');
    if (plot && !el.closest('.ch.is-in')) continue;
    const r = el.getBoundingClientRect();
    if (r.top < vh * (plot ? 0.85 : 0.9) && r.bottom > vh * (plot ? 0.1 : 0)) {
      el.classList.add('is-in');
      pending.splice(pending.indexOf(el), 1);
    }
  }
}
if (prefersReducedMotion()) pending.splice(0).forEach((el) => el.classList.add('is-in'));
onVisible('.stage', (el) => el.classList.add('is-in'), { threshold: 0.6 });

// ---------- readouts that follow the beam ----------
const fmt = (v) => `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(1).padStart(4, '0')}`;
const roSteer = $$('.ro-steer'), roMode = $$('.ro-mode');
const slider = $('#steer'), out = $('#steer-out');
const gainTrace = $('.inst-gain .tr'), gainMark = $('.inst-gain .mk');
let lastPath = 20;
subscribe((s) => {
  const v = fmt(s.steer);
  roSteer.forEach((el) => { el.textContent = v; });
  const mode = s.reduced ? 'HOLD' : s.manual ? 'MANUAL' : 'LOCK';
  roMode.forEach((el) => { el.textContent = mode; });
  root.classList.toggle('rs-manual', s.manual && !s.reduced);
  if (slider && document.activeElement !== slider) slider.value = Math.round(s.target);
  if (out) out.textContent = `${Math.round(s.target) >= 0 ? '+' : ''}${Math.round(s.target)}°`;
  if (gainTrace && Math.abs(s.steer - lastPath) > 0.05) {
    lastPath = s.steer;
    gainTrace.setAttribute('d', gainPath(s.steer));
    const x = plotX(s.steer).toFixed(1);
    gainMark.setAttribute('x1', x); gainMark.setAttribute('x2', x);
  }
});
setReduced(state.reduced); // paint the readouts once now that they listen
if (slider) {
  const say = () => slider.setAttribute('aria-valuetext', `${slider.value} degrees`);
  say();
  slider.addEventListener('input', () => { setSteer(+slider.value, 8000); say(); });
}

// ---------- scroll: where the camera is (0 intro, 1 the gap after RF, 2 the gap after Parity) ----------
const marks = [0, 1, 2];
const tbMark = $('.tb-mark'), tbLinks = $$('.timebase a');
const stages = $$('.stage');
function measure() {
  const vh = innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
  const mid = (el) => el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - vh / 2;
  marks[1] = Math.min(max - 1, Math.max(1, mid(stages[0])));
  marks[2] = Math.max(marks[1] + 1, Math.min(max, mid(stages[1])));
  onScroll();
}
function onScroll() {
  if (pending.length) reveal();
  const y = scrollY;
  const s = y <= marks[1] ? y / marks[1] : 1 + Math.min(1, (y - marks[1]) / (marks[2] - marks[1]));
  state.scroll = Math.max(0, Math.min(2, s));
  // the timebase dot walks the page; its link lights up for the part on screen
  const page = y / Math.max(1, document.documentElement.scrollHeight - innerHeight);
  if (tbMark) tbMark.style.transform = `translateY(${(page * 100).toFixed(1)}%)`;
  const ids = ['main', 'rf-direction-finder', 'parity'];
  let on = 0;
  ids.forEach((id, i) => { const el = document.getElementById(id); if (i && el.getBoundingClientRect().top < innerHeight * 0.5) on = i; });
  tbLinks.forEach((a, i) => a.classList.toggle('on', i === on));
}
addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', measure);
new ResizeObserver(measure).observe($('#main'));
measure();

// ---------- pointer: parallax, and the pointer steers the beam over the intro (mouse only) ----------
if (finePointer()) {
  const intro = $('.intro');
  addEventListener('pointermove', (e) => {
    if (state.reduced) return;
    state.px = (e.clientX / innerWidth) * 2 - 1;
    state.py = -((e.clientY / innerHeight) * 2 - 1);
    if (state.scroll < 0.3 && intro.contains(e.target)) setSteer(state.px * MAX * 0.9, 2500);
  }, { passive: true });
}

// ---------- channels: a crosshair and x/y readout follow the pointer or the last tap ----------
$$('.ch').forEach((ch) => {
  const xy = $('.ch-xy', ch);
  let raf = 0, ex = 0, ey = 0, timer = 0;
  const paint = () => {
    raf = 0;
    const r = ch.getBoundingClientRect();
    const x = ex - r.left, y = ey - r.top;
    ch.style.setProperty('--mx', `${x}px`);
    ch.style.setProperty('--my', `${y}px`);
    if (xy) xy.textContent = `x ${String(Math.round((x / r.width) * 999)).padStart(3, '0')} y ${String(Math.round((y / r.height) * 999)).padStart(3, '0')}`;
  };
  const at = (e) => { ex = e.clientX; ey = e.clientY; if (!raf) raf = requestAnimationFrame(paint); };
  ch.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { ch.classList.add('aim'); at(e); } });
  ch.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') ch.classList.remove('aim'); });
  ch.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    at(e); ch.classList.add('aim');
    clearTimeout(timer); timer = setTimeout(() => ch.classList.remove('aim'), 1800);
  });
});

// ---------- plot cursors: hover or drag across a plot to read it ----------
$$('.plot').forEach((fig) => {
  const svg = $('svg', fig), cur = $('.cur', fig);
  if (!svg || !cur) return;
  const line = $('line', cur), text = $('text', cur);
  const vb = svg.viewBox.baseVal;
  const isGain = fig.classList.contains('inst-gain');
  const show = (e) => {
    const r = svg.getBoundingClientRect();
    const x = Math.max(PLOT.x0, Math.min(PLOT.x1, ((e.clientX - r.left) / r.width) * vb.width));
    line.setAttribute('x1', x.toFixed(1)); line.setAttribute('x2', x.toFixed(1));
    const u = (x - PLOT.x0) / (PLOT.x1 - PLOT.x0);
    let label;
    if (isGain) {
      const deg = u * 180 - 90;
      label = `${deg >= 0 ? '+' : ''}${deg.toFixed(0)}° ${gainDb(deg, state.steer).toFixed(1)} dB`;
    } else label = `t ${Math.round(u * 120)} / 120`;
    text.textContent = label;
    text.setAttribute('x', Math.min(x + 4, vb.width - 4 - label.length * 6.2).toFixed(1));
    fig.classList.add('reading');
  };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', () => fig.classList.remove('reading'));
});
