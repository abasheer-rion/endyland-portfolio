// Claude for GoHighLevel project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The stage is an 8 by 6 item inventory, one slot per tool (scene.js, a plain 2D canvas, light on phones).
// A cursor hops between slots on its own; point at a slot and it goes there.
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { bus } from './bus.js';

initProject();

const stage = document.querySelector('.stage');
const slot = document.querySelector('.stage-slot');
bus.onSlot = (n) => { if (slot) slot.textContent = `Slot ${String(n).padStart(2, '0')}`; };

if (stage) {
  const pick = (e) => {
    const L = bus.layout;
    if (!L) return;
    const r = stage.getBoundingClientRect();
    const c = Math.floor(((e.clientX - r.left) / L.P - L.ox) / L.cell);
    const w = Math.floor(((e.clientY - r.top) / L.P - L.oy) / L.cell);
    bus.want = c >= 0 && c < L.cols && w >= 0 && w < L.rows ? w * L.cols + c : -1;
  };
  stage.addEventListener('pointermove', pick, { passive: true });
  stage.addEventListener('pointerdown', pick, { passive: true });
  stage.addEventListener('pointerleave', () => { bus.want = -1; });
}

mountScene({
  canvas: document.querySelector('.stage .proj-scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1, lowDprCap: 1,
});
