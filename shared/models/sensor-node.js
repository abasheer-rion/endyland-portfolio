// The battery sensor node: a two-layer board with an ESP32 module, one I2C sensor, a regulator and a single 18650
// cell in a holder. The board was not photographed, so the layout is a plausible one, not a copy. The pullup
// parameter drops in the I2C pull-up resistor that was missing on the first build.
//   create({ pullup }) -> THREE.Group. Parameter: pullup 0..1 (0 missing, 1 fitted).
import { THREE, C, T, Part, box, cyl, slab, traces, chip, header, passives, ecap, led, pcb, labelTexture, model } from './kit.js';

const PI = Math.PI;

export function create() {
  const root = new THREE.Group(); root.name = 'sensor-node';
  const P = new Part('board');
  const y = pcb(P, 92, 54, { r: 3, colour: C.board, holes: [[-42, -23, 1.6], [42, -23, 1.6], [-42, 23, 1.6], [42, 23, 1.6]] });
  // 18650 cell in its holder along the back edge.
  P.at(T(-2, y, -13), () => {
    P.add(slab(76, 5, 21, 2, 0.5, 3), C.ink);
    for (const s of [-1, 1]) { P.add(slab(3, 17, 21, 1, 0.4, 2), C.ink, T(s * 37.5, 0, 0)); P.add(box(0.8, 11, 9), C.tin, T(s * 35.6, 5, 0)); }
    P.add(cyl(9.1, 65, 26).rotateZ(-PI / 2), C.brass, T(-32.5, 11, 0));
    P.add(cyl(9.15, 13, 26).rotateZ(-PI / 2), C.walnut, T(-32.5, 11, 0), { edges: false });
    P.add(cyl(9.15, 4, 26).rotateZ(-PI / 2), C.walnut, T(26, 11, 0), { edges: false });
    P.add(cyl(4, 1.4, 16).rotateZ(-PI / 2), C.tin, T(32.5, 11, 0));
  });
  // ESP32 module: shield can, and the printed antenna on the end that overhangs the board.
  P.at(T(27, y, 12), () => {
    P.add(slab(25.5, 0.9, 18, 0.6, 0, 3), C.boardDark);
    P.add(slab(17.6, 2.6, 15.6, 0.8, 0.3, 3), C.steel, T(-3.4, 0.9, 0));
    P.decal(labelTexture('ESP32', { w: 256, h: 96, fg: C.ink, font: '700 52px ui-monospace,Menlo,monospace' }), 13, 4.9, T(-3.4, 3.53, 0));
    traces(P, 0.9, [[[6.6, 7.5], [6.6, -7.5], [8.2, -7.5], [8.2, 5.5], [9.8, 5.5], [9.8, -7.5], [11.4, -7.5], [11.4, 7.5]]], 0.6, C.foil, false);
    for (let i = 0; i < 12; i++) for (const s of [-1, 1]) P.add(box(0.9, 0.5, 1.2), C.foil, T(-11.3 + i * 1.27, 0.2, s * 9), { edges: false });
  });
  // The sensor, with its two I2C lines running to the module and a pull-up position on each.
  P.add(slab(5, 1.6, 5, 0.5, 0.25, 3), C.steel, T(-30, y, 14)); P.add(cyl(0.7, 0.1, 10), C.ink, T(-31, y + 1.6, 13), { edges: false });
  P.decal(labelTexture('I2C', { w: 128, h: 56, font: '600 36px ui-monospace,Menlo,monospace' }), 7.5, 3.3, T(-30, y + 0.05, 21.5));
  traces(P, y, [[[-27.2, 12.5], [-14, 12.5], [-8, 9], [14, 9], [15.5, 3.4]], [[-27.2, 15.5], [-12, 15.5], [-6, 19], [10, 19], [14, 21.4]], [[-18, 12.5], [-18, 4]], [[-10, 17.2], [-10, 4]], [[-24, 4], [8, 4]]], 0.5);
  passives(P, y, [[-18, 8, PI / 2, 'r'], [-36, 8, PI / 2, 'c'], [-36, 20, PI / 2, 'c']]);
  for (const z of [6.2, 9.8]) P.add(box(1.2, 0.1, 1), C.foil, T(-10, y, z + 2.6), { edges: false }); // empty pads for the second resistor
  // Regulator, capacitors, a status light, a reset button and the programming header.
  chip(P, 2, 20, y, 6.5, 3.6, 1.6, { pins: 'dual', n: 3 });
  ecap(P, -6, 22, y, 2, 4.5);
  passives(P, y, [[8, 23, 0, 'c'], [12, 14, 0, 'c'], [-24, 22, 0, 'r']]);
  led(P, -42, 6, y, C.rust, PI / 2);
  P.add(slab(4.4, 1.9, 3.6, 0.5, 0.2, 2), C.steel, T(-42, y, 14)); P.add(cyl(1, 0.6, 10), C.ink, T(-42, y + 1.9, 14), { edges: false });
  header(P, 3, -0.4, y, 6, 1, { pin: 5 });
  root.add(P.build());
  // The pull-up that was missing: a resistor that drops onto its pads.
  const R = new Part('pullup');
  passives(R, 0, [[0, 0, PI / 2, 'r']]);
  const pull = R.build(); root.add(pull);
  const set = (v) => { pull.visible = v > 0.02; pull.position.set(-10, y + (1 - v) * (1 - v) * 22, 10.6); };
  set(1);
  return model(root, {
    params: { pullup: { value: 1, min: 0, max: 1 } },
    set(name, v) { if (name === 'pullup') set(v); },
    view: { az: 0.5, el: 0.66, elMin: 0.08, elMax: 1.45, zoom: 1.16 },
    labels: [{ text: 'Pull-up resistor', part: pull, at: [0, 2, 0] }],
  });
}
export default create;
