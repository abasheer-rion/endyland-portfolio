// Safe Home sensor box, as built for HackUTD 2026: a printed enclosure holding a Seeed XIAO ESP32-S3 (mesh radio),
// an Arduino Uno Q reading the sensors, a breadboard power module, a buzzer and a tilt switch, over a 6 x AA pack.
// The water sensor hangs outside on a lead, the flame sensor looks out of the front wall, and the 2.4 GHz antenna
// stands on the right wall. Sizes are approximate: the enclosure is drawn to fit the parts, not copied from the STL.
//   create({ explode }) -> THREE.Group. Parameter: explode 0..1.
import { THREE, C, T, Part, box, cyl, ball, slab, plate, tray, wire, traces, chip, header, passives, ecap, led, usbc, standoff, screw, antenna, pcb, labelTexture, explodable, model } from './kit.js';

const PI = Math.PI;
const W = 150, D = 100, H = 46, WALL = 2.6, R = 9;

function basePart() {
  const P = new Part('base');
  tray(P, C.cream, W, H, D, R, WALL);
  // Screw bosses in the corners and two wall-mount ears.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    P.add(cyl(4.2, H - 4, 14), C.cream, T(sx * (W / 2 - 7.5), WALL, sz * (D / 2 - 7.5)));
    P.add(cyl(1.5, 0.1, 10), C.saddle, T(sx * (W / 2 - 7.5), H - 1.35, sz * (D / 2 - 7.5)), { edges: false });
  }
  for (const sx of [-1, 1]) P.add(plate(24, 3, 22, 6, [[sx * 4, 0, 2.6]], 0.4), C.cream, T(sx * (W / 2 + 7), 0, 0));
  // Deck standoffs.
  for (const [x, z] of [[-62, -38], [62, -38], [-62, 38], [62, 38]]) P.add(cyl(2.8, 21.5, 6), C.brass, T(x, WALL, z));
  // Cable gland for the water sensor lead, left wall.
  P.add(cyl(5.5, 4, 6).rotateZ(PI / 2), C.walnut, T(-W / 2, 14, 18));
  P.add(cyl(4, 7, 16).rotateZ(PI / 2), C.ink, T(-W / 2 - 3, 14, 18));
  // Antenna bulkhead on the right wall, with the coax pigtail running inside to the radio board.
  P.add(cyl(4.4, 2.2, 6).rotateZ(-PI / 2), C.brass, T(W / 2, 34, -28));
  P.add(cyl(3, 9, 16).rotateZ(-PI / 2), C.foil, T(W / 2 + 2, 34, -28));
  P.at(T(W / 2 + 12, 34, -28), () => {
    P.add(cyl(3.6, 8, 16).rotateZ(-PI / 2), C.ink, T(-2, 0, 0));
    P.add(cyl(3.3, 62, 16, 2.4), C.ink, T(6, -3.3, 0));
    P.add(ball(3.3, 12), C.ink, T(6, -3.3, 0), { edges: false });
    P.add(ball(2.4, 12), C.ink, T(6, 58.7, 0), { edges: false });
  });
  wire(P, [[W / 2 - 3, 34, -28], [62, 36, -30], [54, 37, -34], [47, 36.4, -31]], 0.55, C.ink);
  return P.build();
}

function batteryPart() {
  const P = new Part('battery');
  tray(P, C.ink, 112, 12, 50, 2.5, 1.6);
  for (let col = 0; col < 2; col++) for (let row = 0; row < 3; row++) {
    const x = (col - 0.5) * 54, z = (row - 1) * 15.2, flip = (row + col) % 2 ? 1 : -1;
    P.at(T(x, 8.9, z, 0, flip > 0 ? 0 : PI, 0), () => {
      P.add(cyl(7.1, 47, 20).rotateZ(-PI / 2), C.brass, T(-24.5, 0, 0));
      P.add(cyl(7.15, 13, 20).rotateZ(-PI / 2), C.walnut, T(-24.5, 0, 0), { edges: false });
      P.add(cyl(7.15, 3, 20).rotateZ(-PI / 2), C.walnut, T(8, 0, 0), { edges: false });
      P.add(cyl(2.6, 1.6, 12).rotateZ(-PI / 2), C.tin, T(22.5, 0, 0));
      P.add(cyl(4.6, 3.2, 10, 2.4).rotateZ(PI / 2), C.tin, T(-24.5, 0, 0), { edges: false });
    });
  }
  // Leads up to the power module.
  wire(P, [[56, 6, 20], [63, 12, 24], [64, 22, 22]], 0.8, C.rust);
  wire(P, [[56, 6, 16], [66, 11, 17], [67, 22, 17]], 0.8, C.ink);
  return P.build();
}

function unoQ(P, y) {
  // Arduino Uno Q, 68.6 x 53.3 mm: USB-C, two chips, the 8 x 13 LED matrix and the Uno header rows.
  const top = pcb(P, 68.6, 53.3, { y, r: 2.5, colour: C.board, holes: [[-20.3, -24.1, 1.6], [31.7, -19, 1.6], [-19, 24.1, 1.6], [31.7, 9, 1.6]] });
  usbc(P, -30.6, -9, top, PI / 2);
  chip(P, -8, -8, top, 12, 12, 1.1, { pins: 'bga', colour: C.steel });
  chip(P, -9, 9.5, top, 8, 8, 1, { pins: 'quad', n: 9 });
  chip(P, 18, -12, top, 5, 4, 0.9, { pins: 'dual', n: 4 });
  for (let i = 0; i < 13; i++) for (let j = 0; j < 8; j++) P.add(box(1.05, 0.5, 1.05), C.foil, T(4 + i * 1.85, top, 0.5 + j * 1.85), { edges: false });
  header(P, 5.4, -24.1, top, 10, 1, { female: true });
  header(P, 0.3, 24.1, top, 8, 1, { female: true }); header(P, 21.9, 24.1, top, 6, 1, { female: true });
  header(P, 26.4, -24.1, top, 5, 1, { female: true });
  passives(P, top, [[-22, 4, 0, 'l'], [-20, -19, 0, 'c'], [-16, -19, 0, 'c'], [2, -16, PI / 2, 'r'], [5, -16, PI / 2, 'r'], [-22, 14, 0, 'c'], [-1, 17, 0, 'r'], [26, -3, PI / 2, 'c'], [29, 16, 0, 'c']]);
  P.add(slab(4.2, 2, 4.2, 0.6, 0.3, 3), C.steel, T(-27, top, 16)); P.add(cyl(1.2, 0.5, 10), C.ink, T(-27, top + 2, 16), { edges: false });
  traces(P, top, [[[-2, -8], [3, -8], [3, -3], [3.6, -1]], [[-8, -1.5], [-8, 5]], [[-14.5, -8], [-25, -8]], [[-4.5, 9.5], [0, 9.5], [0, 20]], [[18, -9.5], [18, -4], [22, 0]], [[-2, -11], [8, -11], [8, -21.5]], [[-2, -5], [1, -5], [1, 20]]], 0.45);
  P.decal(labelTexture('UNO Q', { w: 160, h: 48, font: '700 34px ui-monospace,Menlo,monospace' }), 13, 3.9, T(20, top + 0.05, 19));
}

function deckPart() {
  const P = new Part('deck');
  const top = pcb(P, 136, 86, { r: 4, colour: C.saddle, holes: [[-62, -38, 1.7], [62, -38, 1.7], [-62, 38, 1.7], [62, 38, 1.7]] });
  // Arduino Uno Q on four short standoffs.
  P.at(T(-30, top, -11), () => {
    for (const [x, z] of [[-20.3, -24.1], [31.7, -19], [-19, 24.1], [31.7, 9]]) P.add(cyl(2.4, 5, 6), C.brass, T(x, 0, z));
    unoQ(P, 5);
  });
  // Seeed XIAO ESP32-S3, 21 x 17.8 mm, in a pair of socket strips. USB-C faces the back wall.
  P.at(T(42, top, -28), () => {
    header(P, 0, -7.62, 0, 7, 1, { female: true, h: 5 }); header(P, 0, 7.62, 0, 7, 1, { female: true, h: 5 });
    const y = pcb(P, 21, 17.8, { y: 5.6, t: 1.2, r: 1.6, colour: C.board });
    usbc(P, -8.2, 0, y, PI / 2);
    P.add(slab(10.5, 2.3, 10.5, 0.6, 0.25, 3), C.steel, T(3.2, y, 0));
    P.decal(labelTexture(['ESP32', 'S3'], { w: 128, h: 128, fg: C.ink, font: '700 36px ui-monospace,Menlo,monospace' }), 8.6, 8.6, T(3.2, y + 2.33, 0, 0, -PI / 2, 0));
    P.add(cyl(1.1, 1.2, 12), C.foil, T(-3.2, y, 6.6));
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) P.add(box(1.5, 0.12, 1.3), C.foil, T((i - 3) * 2.54, y, s * 8.2), { edges: false });
    passives(P, y, [[-4.5, -5.5, 0, 'c'], [-4.5, -3, 0, 'r'], [-3.6, 2.5, PI / 2, 'c']]);
  });
  // Breadboard power module: barrel jack, switch, regulator, capacitor.
  P.at(T(46, top, 18), () => {
    const y = pcb(P, 34, 32, { y: 4, r: 1.5, colour: C.boardDark });
    for (const [x, z] of [[-14, -13], [14, -13], [-14, 13], [14, 13]]) P.add(cyl(1.6, 4, 6), C.brass, T(x, 0, z), { edges: false });
    P.add(slab(9, 11, 14, 0.8, 0.4, 3), C.ink, T(9.5, y, -7)); P.add(cyl(3.2, 0.4, 16).rotateX(-PI / 2), C.steel, T(9.5, y + 6.4, -14.1));
    P.add(slab(8.6, 3.6, 4.4, 0.4, 0.2, 2), C.steel, T(-8, y, -11)); P.add(box(2.6, 2.2, 1.8), C.ink, T(-9.5, y + 3.6, -11));
    chip(P, -7, 1, y, 6.5, 3.6, 1.6, { pins: 'dual', n: 3 });
    ecap(P, 4, 8, y, 3.2, 7.5); ecap(P, -4, 9.5, y, 2.2, 5.5);
    led(P, 13, 11, y, C.rust);
    header(P, -13, 3, y, 1, 4, {}); header(P, 13, 3, y, 1, 2, {});
    traces(P, y, [[[-7, -1.5], [-7, -8]], [[-4, 1], [4, 1], [4, 5]], [[9, 0], [13, 0], [13, 1]]], 0.7);
  });
  // Active buzzer.
  P.at(T(14, top, 31), () => {
    P.add(cyl(6, 9, 22), C.ink); P.add(cyl(1.1, 0.12, 10), C.saddle, T(0, 9, 0), { edges: false });
    P.add(new THREE.RingGeometry(3.6, 4.2, 20).rotateX(-PI / 2), C.saddle, T(0, 9.05, 0), { edges: false });
  });
  // Tilt switch on its little breakout: a metal can leaning on two legs.
  P.at(T(-14, top, 32), () => {
    const y = pcb(P, 20, 12, { y: 2.5, t: 1.2, r: 1, colour: C.boardDark });
    P.add(cyl(2.7, 11, 16).rotateZ(-PI / 2.6), C.steel, T(-7, y + 3.2, 0));
    P.add(cyl(2.75, 2.4, 16).rotateZ(-PI / 2.6), C.rust, T(-7, y + 3.2, 0), { edges: false });
    header(P, 8, 0, y, 1, 3, { pin: 5 });
    passives(P, y, [[3, -3.5, 0, 'r'], [3, 3.5, 0, 'c']]);
  });
  // Jumper wires from the Uno headers to the radio board, the sensors and power.
  const J = (pts, col) => wire(P, pts.map(([x, y, z]) => [x, top + y, z]), 0.6, col, 20);
  J([[-24, 13.5, -35], [-8, 21, -39], [22, 19, -40], [36, 10.6, -35.6]], C.rust);
  J([[-21.5, 13.5, -35], [-4, 18, -37], [24, 16, -38], [38.5, 10.6, -35.6]], C.foil);
  J([[-29, 13.5, 13], [-26, 17, 24], [-10, 12, 30], [-6, 9, 32]], C.cream);
  J([[-10, 13.5, 13], [2, 16, 22], [12, 12, 27], [14, 9, 28]], C.rust);
  J([[-5, 13.5, 13], [14, 17, 12], [28, 13, 19], [33, 12, 21]], C.ink);
  J([[-36, 13.5, 13], [-48, 16, 22], [-60, 10, 26], [-66, 2, 26]], C.brass);
  return P.build();
}

function waterPart() {
  // Water level sensor: a bare board whose parallel traces conduct when wet, on a three-wire lead.
  const P = new Part('water');
  P.at(T(-W / 2 - 46, 0, 30, 0, 0.5, 0), () => {
    const y = pcb(P, 62, 20, { r: 1.5, colour: C.rust, holes: [[27, -7, 1.3], [27, 7, 1.3]] });
    for (let i = 0; i < 10; i++) P.add(box(40, 0.08, 0.95), i % 2 ? C.foil : C.tin, T(-9 + (i % 2 ? 0.8 : -0.8), y, (i - 4.5) * 1.75), { edges: false });
    header(P, 17, 0, y, 1, 3, { pin: 4 });
    passives(P, y, [[21.5, -4.5, PI / 2, 'r'], [21.5, 4, PI / 2, 'r']]);
    chip(P, 22.5, 0, y, 2.6, 2, 0.9, { pins: 'none' });
  });
  for (const [dz, col] of [[-2.2, C.rust], [0, C.ink], [2.2, C.foil]]) {
    wire(P, [[-W / 2 - 8, 14, 18 + dz * 0.4], [-W / 2 - 20, 12, 18 + dz], [-W / 2 - 27, 5, 22 + dz], [-W / 2 - 30, 3.2, 24 + dz]], 0.7, col, 16);
  }
  return P.build();
}

function flamePart() {
  // Flame sensor module: an infrared photodiode on a small board with a trimmer and a comparator. It stands inside
  // the front wall with the diode poking through.
  const P = new Part('flame');
  P.at(T(-36, 22, D / 2 - 4, -PI / 2, 0, 0), () => {
    const y = pcb(P, 15, 32, { t: 1.4, r: 1, colour: C.board, holes: [[0, -12, 1.4]] });
    P.add(slab(6.6, 4.6, 6.6, 0.5, 0.3, 2), C.brass, T(0, y, 2)); P.add(cyl(1.5, 0.7, 12), C.vellum, T(0, y + 4.6, 2));
    P.add(box(1.8, 0.1, 0.4), C.ink, T(0, y + 5.3, 2), { edges: false });
    chip(P, 0, -6, y, 4.9, 3.9, 1.2, { pins: 'dual', n: 4 });
    led(P, -4.5, 8, y, C.rust); led(P, 4.5, 8, y, C.foil);
    header(P, 0, 13, y, 4, 1, { pin: 4 });
  });
  // The diode itself, and a bezel ring on the outside of the wall.
  P.add(cyl(2.5, 7, 16).rotateX(PI / 2), C.ink, T(-36, 30, D / 2 - 1.5));
  P.add(ball(2.5, 14), C.ink, T(-36, 30, D / 2 + 5.5), { edges: false });
  P.add(cyl(5, 1.6, 20, 4.4).rotateX(PI / 2), C.walnut, T(-36, 30, D / 2));
  return P.build();
}

function lidPart() {
  const P = new Part('lid');
  P.add(slab(W, 3.4, D, R, 0.9), C.cream);
  // Inner lip that drops inside the walls.
  tray(P, C.cream, W - 2 * WALL - 0.6, 3, D - 2 * WALL - 0.6, R - WALL, 1.4, T(0, 0, 0, PI, 0, 0));
  // Vent slots over the buzzer, a status light pipe and the name plate.
  for (let i = 0; i < 6; i++) P.add(slab(16, 0.3, 1.8, 0.9, 0, 4), C.saddle, T(14, 3.3, 22 + i * 3.6), { edges: true });
  P.add(cyl(2.2, 0.8, 16), C.foil, T(-58, 3.4, -34)); P.add(new THREE.RingGeometry(2.2, 3.3, 20).rotateX(-PI / 2), C.saddle, T(-58, 3.45, -34), { edges: false });
  P.add(slab(64, 0.5, 20, 2, 0.2, 4), C.walnut, T(-24, 3.4, 20));
  P.decal(labelTexture(['SAFE HOME', 'BOX A'], { w: 512, h: 160, fg: C.foil, font: '600 54px Georgia,"Times New Roman",serif', lh: 1.25 }), 60, 18.75, T(-24, 3.95, 20));
  return P.build();
}

function screwsPart() {
  const P = new Part('screws');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    screw(P, sx * (W / 2 - 7.5), 0, sz * (D / 2 - 7.5), 3, C.brass);
    P.add(cyl(1.4, 9, 10), C.brass, T(sx * (W / 2 - 7.5), -9, sz * (D / 2 - 7.5)), { edges: false });
  }
  return P.build();
}

export function create() {
  const root = new THREE.Group(); root.name = 'sensor-box';
  const base = basePart(), battery = batteryPart(), deck = deckPart(), water = waterPart(), flame = flamePart(), lid = lidPart(), screws = screwsPart();
  battery.position.set(-4, WALL, 0);
  deck.position.set(0, WALL + 21.5, 0);
  lid.position.set(0, H, 0);
  screws.position.set(0, H + 3.4, 0);
  root.add(base, battery, deck, water, flame, lid, screws);
  const setExplode = explodable([
    [screws, [0, 150, 0], 0, 0.55], [lid, [0, 112, 0], 0.08, 0.7], [deck, [0, 58, 0], 0.3, 1],
    [battery, [0, 6, 0], 0.5, 1], [water, [-26, 0, 8], 0.2, 0.8], [flame, [0, 0, 34], 0.25, 0.85],
  ]);
  return model(root, {
    params: { explode: { value: 0, min: 0, max: 1 } },
    set(name, v) { if (name === 'explode') setExplode(v); },
    view: { az: 0.62, el: 0.5, elMin: 0.06, elMax: 1.35, zoom: 1.18 },
    labels: [
      { text: 'XIAO ESP32-S3', part: deck, at: [45, 14, -28], when: [0.55, 1] },
      { text: 'Arduino Uno Q', part: deck, at: [-30, 12, -11], when: [0.55, 1] },
      { text: 'Power module', part: deck, at: [46, 14, 18], when: [0.55, 1] },
      { text: 'Tilt switch', part: deck, at: [-18, 10, 32], when: [0.55, 1] },
      { text: '6 x AA', part: battery, at: [0, 18, 0], when: [0.7, 1] },
      { text: 'Water sensor', part: water, at: [-W / 2 - 46, 4, 30], when: [0, 1] },
      { text: 'Flame sensor', part: flame, at: [-36, 30, D / 2 + 8], when: [0, 1] },
      { text: '2.4 GHz antenna', part: base, at: [W / 2 + 18, 70, -28], when: [0, 1] },
    ],
  });
}
export default create;
