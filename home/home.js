// Home page behaviour. Everything here is polish: with no script the page is a plain, readable long scroll.
// Scroll reveals come from /shared/motion.js (data-reveal attributes). The 3D mark is mounted by /shared/models/auto.js.
import { mountScene } from '../shared/scene-loader.js';

// Hero: letters get an index for the CSS stagger.
let i = 0;
document.querySelectorAll('h1 .l').forEach((l) => l.style.setProperty('--i', String(i++)));

// Code strip: the year as a plate of dots, one column per week, and two numbers from /data/github.json.
async function codeStrip() {
  const canvas = document.getElementById('code-plate');
  const line = document.getElementById('code-line');
  if (!canvas) return;
  let data;
  try {
    const r = await fetch('/data/github.json', { credentials: 'omit' });
    if (!r.ok) throw new Error(String(r.status));
    data = await r.json();
  } catch { canvas.hidden = true; return; }
  const counts = data?.calendar?.counts;
  const total = data?.totals?.contributions, streak = data?.streaks?.longest?.days;
  if (line && Number.isFinite(total) && Number.isFinite(streak)) {
    line.textContent = `${total.toLocaleString('en-US')} contributions on GitHub in the past year. The longest streak was ${streak} days.`;
  }
  if (!Array.isArray(counts) || !counts.length) { canvas.hidden = true; return; }
  const weeks = Math.ceil(counts.length / 7);
  const draw = () => {
    const w = canvas.clientWidth || 640, dpr = Math.min(2, devicePixelRatio || 1);
    const pitch = w / weeks, h = pitch * 7;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.aspectRatio = `${w} / ${h}`;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const max = Math.max(...counts, 1);
    for (let k = 0; k < counts.length; k++) {
      const c = counts[k], x = (Math.floor(k / 7) + 0.5) * pitch, y = (k % 7 + 0.5) * pitch;
      const f = Math.sqrt(c / max);
      g.fillStyle = c ? (f > 0.7 ? '#9C4A22' : '#B8872E') : 'rgba(23,16,10,.28)';
      g.beginPath(); g.arc(x, y, c ? pitch * (0.18 + 0.2 * f) : pitch * 0.09, 0, 6.2832); g.fill();
    }
  };
  draw();
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(draw, 120); });
}
codeStrip();

mountScene({ canvas: document.getElementById('scene'), webgl: false, load: () => import('./scene.js') });
