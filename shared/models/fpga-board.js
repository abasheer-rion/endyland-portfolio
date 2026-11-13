// A generic FPGA development board for the 8-bit RISC processor project. The project ran on a Xilinx Artix-7 at
// 50 MHz; the board itself was not photographed, so this is a typical layout (FPGA, switches, LEDs, buttons, a
// four-digit display, expansion headers, USB and power), not a copy of a real product.
//   create() -> THREE.Group. No parameters.
import { THREE, C, T, Part, box, cyl, slab, traces, chip, header, passives, ecap, led, pcb, labelTexture, model } from './kit.js';

const PI = Math.PI;

// Four seven-segment digits spelling "rISC", drawn on a canvas.
function displayTexture() {
  const cv = document.createElement('canvas'); cv.width = 400; cv.height = 150;
  const g = cv.getContext('2d'); g.fillStyle = C.ink; g.fillRect(0, 0, 400, 150);
  const SEG = { a: [18, 8, 44, 10], b: [62, 18, 10, 46], c: [62, 82, 10, 46], d: [18, 130, 44, 10], e: [8, 82, 10, 46], f: [8, 18, 10, 46], g: [18, 69, 44, 10] };
  ['eg', 'bc', 'afgcd', 'afed'].forEach((on, i) => {
    for (const k in SEG) { const [x, y, w, h] = SEG[k]; g.fillStyle = on.includes(k) ? C.foil : '#3A2A1C'; g.beginPath(); g.roundRect(14 + i * 96 + x, y, w, h, 4); g.fill(); }
  });
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function create() {
  const P = new Part('fpga-board');
  const y = pcb(P, 124, 88, { r: 4, colour: C.board, holes: [[-57, -39, 1.8], [57, -39, 1.8], [-57, 39, 1.8], [57, 39, 1.8]] });
  // The FPGA and what it needs next to it: clock, configuration flash, decoupling.
  chip(P, 6, -4, y, 19, 19, 1.5, { pins: 'bga' });
  P.decal(labelTexture(['FPGA', 'ARTIX-7'], { w: 256, h: 256, font: '700 44px ui-monospace,Menlo,monospace', lh: 1.4 }), 15, 15, T(6, y + 1.78, -4));
  P.add(slab(7, 1.7, 5, 0.6, 0.25, 3), C.steel, T(-12, y, -18));
  P.decal(labelTexture('50 MHz', { w: 200, h: 56, font: '600 34px ui-monospace,Menlo,monospace' }), 11, 3.1, T(-12, y + 0.05, -23.4));
  chip(P, 27, -17, y, 5.2, 4, 1.4, { pins: 'dual', n: 4 });
  passives(P, y, [[-7, -9, 0, 'c'], [-7, -5, 0, 'c'], [-7, -1, 0, 'c'], [-7, 3, 0, 'c'], [19, -9, 0, 'c'], [19, -3, 0, 'c'], [19, 3, 0, 'c'], [0, 9, PI / 2, 'c'], [5, 9, PI / 2, 'c'], [11, 9, PI / 2, 'c'], [0, -17, PI / 2, 'c'], [6, -17, PI / 2, 'c'], [12, -17, PI / 2, 'c']]);
  // Eight slide switches along the front edge, an LED above each.
  for (let i = 0; i < 8; i++) {
    const x = -14 + i * 9.2;
    P.add(slab(5, 3.4, 8.6, 0.5, 0.25, 2), C.steel, T(x, y, 35.5));
    P.add(box(2.6, 3, 3), C.ink, T(x, y + 3.4, 35.5 + (i % 3 === 0 ? -1.9 : 1.9)));
    led(P, x, 26, y, i % 3 === 0 ? C.foil : C.rust, PI / 2);
    passives(P, y, [[x, 22.5, PI / 2, 'r']]);
  }
  // Five push buttons in a cross.
  for (const [dx, dz] of [[0, 0], [-9, 0], [9, 0], [0, -9], [0, 9]]) {
    P.add(slab(6.2, 3.4, 6.2, 0.6, 0.3, 2), C.steel, T(43 + dx, y, 4 + dz));
    P.add(cyl(1.9, 1.5, 14), C.ink, T(43 + dx, y + 3.4, 4 + dz));
  }
  // Four-digit seven-segment display.
  P.add(slab(40, 7.2, 16, 0.8, 0.4, 3), C.ink, T(-31, y, 6));
  P.decal(displayTexture(), 37.5, 14, T(-31, y + 7.25, 6));
  // Expansion headers: two on the left edge, one on the right. Twelve-pin sockets lying on their side.
  for (const [x, z, ry] of [[-58, -16, PI / 2], [-58, 22, PI / 2], [58, -22, -PI / 2]]) {
    P.at(T(x, y, z, 0, ry, 0), () => {
      P.add(slab(15.6, 5.2, 9, 0.5, 0.25, 2), C.ink, T(0, 0, 1));
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) P.add(box(1, 1, 0.3), C.saddle, T((i - 2.5) * 2.54, 0.9 + j * 2.54, -3.55), { edges: false });
    });
  }
  // Back edge: USB for programming and serial, its bridge chip, the power jack, switch and regulators.
  P.add(slab(8, 2.9, 6, 0.7, 0.25, 3), C.steel, T(-34, y, -41.5)); P.add(box(6.6, 1.4, 0.5), C.ink, T(-34, y + 0.7, -44.6), { edges: false });
  chip(P, -34, -29, y, 7, 7, 1, { pins: 'quad', n: 8 });
  P.add(slab(9, 11, 14, 0.8, 0.4, 3), C.ink, T(36, y, -37.5)); P.add(cyl(3.2, 0.4, 16).rotateX(-PI / 2), C.steel, T(36, y + 6.4, -44.6));
  P.add(slab(9, 4, 4.6, 0.5, 0.25, 2), C.steel, T(20, y, -40)); P.add(box(2.8, 2.4, 2), C.ink, T(18.3, y + 4, -40));
  chip(P, 45, -22, y, 6.5, 3.6, 1.6, { pins: 'dual', n: 3 }); chip(P, 45, -12, y, 6.5, 3.6, 1.6, { pins: 'dual', n: 3 });
  passives(P, y, [[35, -24, 0, 'l'], [35, -16, 0, 'l'], [52, -30, 0, 'c'], [-25, -36, 0, 'r'], [-43, -36, 0, 'r'], [-44, -27, PI / 2, 'c']]);
  ecap(P, 50, -37, y, 3, 7); ecap(P, 8, -37, y, 2.4, 5.5);
  led(P, 27, -32, y, C.foil); led(P, -22, -41, y, C.rust);
  header(P, -6, -40, y, 6, 1, { pin: 5.5 }); header(P, -50, -38, y, 2, 1, { pin: 5.5 });
  // Copper from the FPGA out to everything.
  const fan = [];
  for (let i = 0; i < 8; i++) { const x = -14 + i * 9.2, sx = -1 + i * 2; fan.push([[sx, 6], [sx, 14], [x, 19], [x, 21]]); }
  for (let i = 0; i < 5; i++) fan.push([[-4, -10 + i * 3], [-20 - i * 1.5, -10 + i * 3], [-24 - i * 1.5, -5 + i * 3], [-24 - i * 1.5, -1]]);
  for (let i = 0; i < 4; i++) fan.push([[16, -8 + i * 3], [28 + i * 1.5, -8 + i * 3], [31 + i * 1.5, -5 + i * 3 + 2]]);
  fan.push([[6, -14], [6, -24], [-28, -24], [-30, -26]], [[10, -14], [10, -20], [24, -20]], [[-8.5, -18], [-4, -18], [0, -14]], [[-48, -16], [-30, -16], [-26, -12]], [[-48, 22], [-56, 22]], [[49, -22], [53, -22]]);
  traces(P, y, fan, 0.42);
  const root = new THREE.Group(); root.name = 'fpga-board'; root.add(P.build());
  return model(root, { view: { az: 0.42, el: 0.74, elMin: 0.1, elMax: 1.45, zoom: 1.18 } });
}
export default create;
