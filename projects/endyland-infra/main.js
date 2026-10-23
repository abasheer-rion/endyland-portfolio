// endyland hosting and status page project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The stage is a voxel server rack that sends out a health check on a timer, with requests riding a cable
// up to the cloud (scene.js, three.js, loaded after first paint; scene2d.js on phones). The uptime strip fills in when it scrolls in.
import { initProject } from '../../shared/project.js';
import { mountScene, hasWebGL2, afterFirstPaint } from '../../shared/scene-loader.js';
import { onVisible, finePointer, isLowPower } from '../../shared/motion.js';
import { bus } from './bus.js';

initProject();

const numbers = document.querySelector('.proj-numbers');
document.querySelectorAll('.uptime-bar li').forEach((li, i) => li.style.setProperty('--d', String(i)));
if (numbers) onVisible([numbers], () => numbers.classList.add('lit'), { threshold: 0.25 });

const check = document.querySelector('.stage-check');
bus.onCheck = (on) => { if (check) check.textContent = on ? 'Health check' : 'All up'; };

if (finePointer()) {
  addEventListener('pointermove', (e) => {
    bus.px = (e.clientX / innerWidth) * 2 - 1;
    bus.py = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
}

// Phones, slow machines and browsers without WebGL get the flat pixel version (scene2d.js, a plain 2D
// canvas): no three.js to load. The check waits for first paint, like the loader does.
afterFirstPaint(() => {
  const light = isLowPower() || !hasWebGL2();
  mountScene({
    canvas: document.querySelector('.stage .proj-scene'),
    load: () => (light ? import('./scene2d.js') : import('./scene.js')),
    webgl: !light,
    dprCap: 1, lowDprCap: 1, // drawn as chunky pixels on purpose
  });
});
