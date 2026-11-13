// Sensor node page. Only this page loads this file.
// The board model's missing pull-up resistor drops into place as the "board" section scrolls through the screen.
import { setupPage, sectionProgress } from '../page.js';

setupPage();

const sec = document.querySelector('#board');
const stage = sec?.querySelector('.model-stage');
let p = 0;
sectionProgress(sec, (v) => { p = v; stage?.__stage?.set('pullup', v); }, { from: 0.35, span: 0.45 });
stage?.addEventListener('model:ready', () => stage.__stage.set('pullup', p), { once: true });
