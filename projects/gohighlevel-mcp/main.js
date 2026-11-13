// GoHighLevel page. Only this page loads this file.
// Plays one request through the four boxes at the top: the question, the tool choice, the secret check, the CRM call
// and the answer. It runs while it is on screen; the button pauses it.
import { setupPage } from '../page.js';

setupPage();

const root = document.querySelector('[data-req]');
if (root) {
  const nodes = [...root.querySelectorAll('.node')];
  const line = root.querySelector('[data-line]');
  const play = root.querySelector('[data-play]');
  const STEPS = [
    { n: 0, t: 'Who did we tag as 1031 last week?' },
    { n: 1, t: 'Claude picks search_contacts and fills in the query.' },
    { n: 2, t: 'The server checks the shared secret sent with the call.' },
    { n: 3, t: 'The server calls the GoHighLevel API with the account token.' },
    { n: 1, t: 'The result comes back as text. Claude reads it and answers.' },
  ];
  let at = 0, timer = 0, visible = false, playing = true;
  const show = () => {
    const s = STEPS[at];
    nodes.forEach((n, i) => n.classList.toggle('on', i === s.n));
    line.textContent = s.t;
    line.classList.remove('swap'); void line.offsetWidth; line.classList.add('swap');
  };
  const run = () => { clearInterval(timer); if (playing && visible) timer = setInterval(() => { at = (at + 1) % STEPS.length; show(); }, 2300); };
  play.addEventListener('click', () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; play.setAttribute('aria-pressed', String(playing)); run(); });
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; run(); }, { threshold: 0.3 }).observe(root);
  show();
}
