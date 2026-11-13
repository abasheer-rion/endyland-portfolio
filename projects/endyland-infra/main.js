// endyland-infra page. Only this page loads this file.
// Plays two pushes through the deploy path: one passes every step, one fails the site checks and stops there.
import { setupPage } from '../page.js';

setupPage();

const root = document.querySelector('[data-gate]');
if (root) {
  const nodes = [...root.querySelectorAll('.node')];
  const line = root.querySelector('[data-line]');
  const play = root.querySelector('[data-play]');
  const STEPS = [
    { n: 0, t: 'A push to main.' },
    { n: 1, t: 'The site checks pass.' },
    { n: 2, t: 'The site is deployed to Cloudflare Pages.' },
    { n: 3, t: 'The live site reports the new commit. Done.' },
    { n: 0, t: 'Another push to main.' },
    { n: 1, t: 'A site check fails. Nothing is deployed.', bad: true },
  ];
  let at = 0, timer = 0, visible = false, playing = true;
  const show = () => {
    const s = STEPS[at];
    nodes.forEach((n, i) => { n.classList.toggle('on', i === s.n && !s.bad); n.classList.toggle('bad', i === s.n && !!s.bad); });
    line.textContent = s.t;
    line.classList.remove('swap'); void line.offsetWidth; line.classList.add('swap');
  };
  const run = () => { clearInterval(timer); if (playing && visible) timer = setInterval(() => { at = (at + 1) % STEPS.length; show(); }, 2200); };
  play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; play.setAttribute('aria-pressed', String(playing)); run(); });
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; run(); }, { threshold: 0.3 }).observe(root);
  show();
}
