// DFW rental pricing model page. Only this page loads this file.
// Shared parts (reveal, count-up, back links) come from /shared/project.js.
// One small calculator: what a 6% band means in dollars for a rent you type in.
import { initProject } from '../../shared/project.js';
import { onVisible } from '../../shared/motion.js';

initProject();
document.querySelectorAll('.steps').forEach((ol) => {
  [...ol.children].forEach((li, i) => li.style.setProperty('--i', i));
  onVisible([ol], () => ol.classList.add('in'), { threshold: 0.15 });
});

const form = document.querySelector('.dfw-calc');
const input = document.getElementById('dfw-rent');
const out = document.getElementById('dfw-out');
const usd = (v) => `$${Math.round(v).toLocaleString('en-US')}`;
form.addEventListener('submit', (e) => e.preventDefault());
input.addEventListener('input', () => {
  const v = parseFloat(input.value);
  out.textContent = v > 0
    ? `Within 6% of ${usd(v)} is ${usd(v * 0.94)} to ${usd(v * 1.06)}.`
    : 'Type a rent to see the band.';
});
