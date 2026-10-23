// 8-bit RISC processor on FPGA project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The stage in "By the numbers" plays a voxel chip whose 5-stage pipeline moves instructions along
// (scene.js, three.js, loaded after first paint; scene2d.js on phones). As an instruction moves, the matching stage card lights up.
import { initProject } from '../../shared/project.js';
import { mountScene, hasWebGL2, afterFirstPaint } from '../../shared/scene-loader.js';
import { finePointer, isLowPower } from '../../shared/motion.js';
import { bus } from './bus.js';

initProject();

const numbers = document.querySelector('.proj-numbers');
bus.onStage = (i) => { if (numbers) numbers.dataset.stage = String(i); };
bus.onStop = () => { if (numbers) delete numbers.dataset.stage; };

// Pointer tilts the board a little (mouse only).
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
