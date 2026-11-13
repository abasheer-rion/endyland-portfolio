// Bench rig page. Only this page loads this file.
// 1. The race: two bars on one scale, sped up. By hand fills the track; the script is 90 s of 2,700 s, so 1/30 of it.
// 2. The four steps light one after another while the list is on screen; during "Sweep" the 12 ticks fill in.
import { setupPage } from '../page.js';

setupPage();

const race = document.querySelector('[data-race]');
if (race) {
  const hand = race.querySelector('[data-fill="hand"]'), script = race.querySelector('[data-fill="script"]');
  const tHand = race.querySelector('[data-time="hand"]'), tScript = race.querySelector('[data-time="script"]');
  const SHOW = 5200;             // ms the by-hand bar takes to fill on screen
  const HAND_S = 2700, SCRIPT_S = 90;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const ease = (t) => 1 - Math.pow(1 - t, 2);
  let raf = 0;
  const go = () => {
    cancelAnimationFrame(raf);
    const t0 = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / SHOW);
      const sec = ease(k) * HAND_S;                      // simulated seconds elapsed
      hand.style.transform = `scaleX(${sec / HAND_S})`;
      script.style.transform = `scaleX(${Math.min(sec, SCRIPT_S) / HAND_S})`;
      tHand.textContent = fmt(sec);
      tScript.textContent = fmt(Math.min(sec, SCRIPT_S));
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };
  race.querySelector('[data-replay]').addEventListener('click', go);
  new IntersectionObserver((es, io) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { threshold: 0.6 }).observe(race);
}

const steps = document.querySelector('[data-steps]');
if (steps) {
  const items = [...steps.children], ticks = [...steps.querySelectorAll('.ticks i')];
  let visible = false, at = 0, tk = 0, timer = 0;
  const paint = () => {
    items.forEach((li, i) => li.classList.toggle('on', i === at));
    ticks.forEach((t, i) => t.classList.toggle('hit', at === 1 && i < tk));
  };
  const loop = () => {
    if (at === 1 && tk < ticks.length) { tk++; }
    else { at = (at + 1) % items.length; tk = 0; }
    paint();
  };
  const run = () => { clearInterval(timer); if (visible) timer = setInterval(loop, 380); };
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; run(); }, { threshold: 0.3 }).observe(steps);
  paint();
}
