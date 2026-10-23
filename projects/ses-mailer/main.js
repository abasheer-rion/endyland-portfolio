// Bulk email app on Amazon SES project page. Only this page loads this file.
// Shared parts (what I did reveal, count-up, gallery lightbox, back links) come from /shared/project.js.
// The stage is an outbox firing pixel envelopes at a wall of inboxes (scene.js, a plain 2D canvas).
// Like the real app, the send can be paused and resumed: the button pauses the animation.
// The button only shows when motion is on (with reduced motion the stage is a still picture).
import { initProject } from '../../shared/project.js';
import { mountScene } from '../../shared/scene-loader.js';
import { prefersReducedMotion, onReducedMotionChange } from '../../shared/motion.js';
import { bus } from './bus.js';

initProject();

const sent = document.querySelector('.stage-sent');
bus.onSent = (n) => { if (sent) sent.textContent = `Sent ${String(n).padStart(5, '0')}`; };

const ctl = document.querySelector('.send-ctl');
const btn = document.querySelector('.send-btn');
let paused = false;

mountScene({
  canvas: document.querySelector('.outbox .proj-scene'),
  load: () => import('./scene.js'),
  webgl: false,
  dprCap: 1, lowDprCap: 1,
}).then((h) => {
  if (!h || !ctl || !btn) return;
  const sync = () => { ctl.hidden = prefersReducedMotion(); };
  sync();
  onReducedMotionChange(sync);
  btn.addEventListener('click', () => {
    paused = !paused;
    if (paused) h.pause(); else h.resume();
    btn.textContent = paused ? 'Resume the send' : 'Pause the send';
    if (sent && paused) sent.textContent = 'Paused';
  });
});
