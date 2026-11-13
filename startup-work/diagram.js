// Diagram motion for the Startup work pages. Each .dg-box holds two drawings (wide and narrow); the visible one is used.
// While the figure is on screen, a dot walks down the nodes marked .dg-chain (or all nodes, in order, when none are marked)
// and each node it reaches is lit for a moment. It runs once when the figure scrolls in, pauses, and repeats.
// Nothing here is needed to read the figure.
const STEP = 480, PAUSE = 2600;

function run(box) {
  const svg = [...box.querySelectorAll('svg.dg')].find((s) => s.getClientRects().length);
  if (!svg) return null;
  const dot = svg.querySelector('.dg-dot');
  let nodes = [...svg.querySelectorAll('.dg-n.dg-chain')];
  if (!nodes.length) nodes = [...svg.querySelectorAll('.dg-n')];
  if (!dot || nodes.length < 2) return null;
  const pts = nodes.map((n) => {
    const r = n.querySelector('rect');
    return [+r.getAttribute('x') + +r.getAttribute('width') / 2, +r.getAttribute('y') + +r.getAttribute('height') / 2];
  });
  const total = STEP * (nodes.length - 1);
  const anim = dot.animate(
    pts.map((p, i) => ({ transform: `translate(${p[0]}px, ${p[1]}px)`, opacity: i === 0 || i === pts.length - 1 ? 0.01 : 1, offset: i / (pts.length - 1) })),
    { duration: total, easing: 'linear', fill: 'both' });
  anim.pause();
  let timers = [], alive = true;
  const clear = () => { timers.forEach(clearTimeout); timers = []; nodes.forEach((n) => n.classList.remove('on')); };
  const cycle = () => {
    if (!alive) return;
    clear();
    anim.currentTime = 0; anim.play();
    nodes.forEach((n, i) => {
      timers.push(setTimeout(() => n.classList.add('on'), i * STEP));
      timers.push(setTimeout(() => n.classList.remove('on'), i * STEP + STEP * 1.4));
    });
    timers.push(setTimeout(() => { anim.pause(); dot.style.opacity = 0; cycle2(); }, total + STEP * 1.4));
  };
  const cycle2 = () => timers.push(setTimeout(cycle, PAUSE));
  return { start: cycle, stop() { alive = false; clear(); anim.cancel(); } };
}

export function initDiagrams() {
  const boxes = [...document.querySelectorAll('[data-diagram]')];
  if (!boxes.length || !('IntersectionObserver' in window)) return;
  boxes.forEach((box) => {
    let run1 = null;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!run1) run1 = run(box); if (run1) { run1.alive = true; run1.start(); } }
      else if (run1) { run1.stop(); run1 = null; }
    }, { threshold: 0.35 });
    io.observe(box);
  });
}
