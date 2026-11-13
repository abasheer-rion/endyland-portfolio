// Argus store hardware: a store camera, and the small computer planned for shops with no PC. The computer is drawn
// from the stock FriendlyElec NanoPi R76S (Rockchip RK3576, 4 GB RAM, 64 GB eMMC, two 2.5 GbE ports, USB-C power)
// in a finned metal case. It is a model of the stock board, not a custom design, and the camera is a generic bullet
// camera: Argus read the store's existing cameras.
//   create() -> THREE.Group. Parameter: explode 0..1.
import { THREE, C, T, Part, box, cyl, ball, slab, plate, tray, wire, traces, chip, header, passives, ecap, led, usbc, rj45, screw, pcb, labelTexture, explodable, model } from './kit.js';

const PI = Math.PI;
const S = 74, BH = 13, TH = 16; // case footprint, bottom tray height, top shell height

function boardPart() {
  const P = new Part('board');
  const y = pcb(P, 66, 66, { r: 3, colour: C.board, holes: [[-29, -29], [29, -29], [-29, 29], [29, 29]] });
  // Front edge (toward +z): two 2.5 GbE jacks and USB-C power. Back edge: HDMI and USB-A.
  rj45(P, -21, 27.3, y, PI); rj45(P, -3.5, 27.3, y, PI);
  usbc(P, 14, 34.1, y, PI);
  P.add(slab(15, 5.8, 11, 0.8, 0.3, 3), C.steel, T(-16, y, -32.2)); P.add(box(12.5, 3.4, 0.6), C.ink, T(-16, y + 1.2, -37.8), { edges: false });
  P.add(slab(14, 7, 14, 0.5, 0.3, 2), C.steel, T(8, y, -30.7)); P.add(box(11.6, 4.6, 0.6), C.ink, T(8, y + 1.2, -37.8), { edges: false }); P.add(box(10.5, 1.4, 0.7), C.vellum, T(8, y + 3.6, -37.8), { edges: false });
  // Processor, memory and storage.
  chip(P, 10, -2, y, 17, 17, 1.3, { pins: 'bga', colour: C.walnut });
  P.add(slab(11.5, 0.5, 11.5, 0.6, 0.15, 3), C.steel, T(10, y + 1.55, -2));
  P.decal(labelTexture('RK3576', { w: 256, h: 96, fg: C.ink, font: '700 46px ui-monospace,Menlo,monospace' }), 10, 3.75, T(10, y + 2.08, -2));
  chip(P, -14, -8, y, 9, 12.5, 1, { pins: 'bga' });
  P.decal(labelTexture(['RAM', '4 GB'], { w: 128, h: 160, font: '700 36px ui-monospace,Menlo,monospace' }), 7, 8.75, T(-14, y + 1.28, -8));
  chip(P, 23.5, 16, y, 11.5, 13, 1, { pins: 'bga' });
  P.decal(labelTexture(['eMMC', '64 GB'], { w: 160, h: 160, font: '700 34px ui-monospace,Menlo,monospace' }), 9, 9, T(23.5, y + 1.28, 16));
  // Ethernet controllers behind the jacks, the power chip, and the small parts around them.
  chip(P, -22, 6.5, y, 6, 6, 0.9, { pins: 'quad', n: 7 }); chip(P, -5, 6.5, y, 6, 6, 0.9, { pins: 'quad', n: 7 });
  chip(P, 26, -17, y, 7, 7, 0.9, { pins: 'quad', n: 8 });
  passives(P, y, [[25, -5, 0, 'l'], [25, 1, 0, 'l'], [-27, -20, 0, 'l'], [16, -15, 0, 'c'], [19, -15, 0, 'c'], [3, 10, PI / 2, 'c'], [6, 10, PI / 2, 'c'], [-3, -14, 0, 'r'], [-6, -14, 0, 'r'],
    [-24, -1, 0, 'c'], [-20, -1, 0, 'c'], [-7, -1, 0, 'c'], [0, -20, PI / 2, 'r'], [12, 12, 0, 'c'], [15, 12, 0, 'c'], [-27, 14, PI / 2, 'r']]);
  ecap(P, -27, -10, y, 2.4, 5);
  led(P, 24, 30, y, C.foil); led(P, 28, 30, y, C.rust);
  P.add(slab(4, 1.8, 3.4, 0.5, 0.2, 2), C.steel, T(30, y, 6)); P.add(cyl(0.9, 0.6, 10), C.ink, T(30, y + 1.8, 6), { edges: false });
  // M.2 socket with a short card held by one screw, and a microSD slot.
  P.add(box(21, 4, 5.5), C.ink, T(-13, y, -20));
  P.add(slab(15, 1.3, 12, 0.6, 0.2, 3), C.steel, T(27, y, -29));
  traces(P, y, [[[1.5, -2], [-9.5, -2], [-9.5, -6]], [[1.5, 2], [-5, 2], [-5, 3.5]], [[1.5, 5], [-18, 5], [-22, 3.4]], [[10, 6.5], [10, 14], [17.5, 14]], [[18.5, -2], [22.5, -2], [22.5, -13.2]],
    [[10, -10.5], [10, -19]], [[5, -10.5], [5, -16], [-2.5, -20]], [[14, 6.5], [14, 20], [14, 26]], [[-21, 9.6], [-21, 12]], [[-4, 9.6], [-4, 12]], [[18.5, 3], [21, 3], [21, 9.5]]], 0.5);
  return P.build();
}
function bottomPart() {
  const P = new Part('case-bottom');
  tray(P, C.tin, S, BH, S, 5, 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { P.add(cyl(2.6, 4.5, 6), C.brass, T(sx * 29, 2, sz * 29)); P.add(cyl(4.5, 1.6, 16), C.ink, T(sx * 28, -1.6, sz * 28)); }
  return P.build();
}
function topPart() {
  // The top shell is the heatsink: a block with fins, and cut-outs drawn on the front for the ports.
  const P = new Part('case-top');
  tray(P, C.tin, S, TH, S, 5, 2, T(0, TH, 0, PI, 0, 0));
  for (let i = 0; i < 11; i++) P.add(slab(2.4, 7, S - 12, 1, 0.5, 3), C.tin, T((i - 5) * 5.6, TH, 0));
  P.add(slab(30, 0.4, 8, 1, 0, 3), C.walnut, T(-15, TH - 0.05, 30)); P.add(slab(30, 0.4, 8, 1, 0, 3), C.walnut, T(-15, TH - 0.05, -30));
  // Thermal post that reaches down to the processor.
  P.add(slab(18, 6.5, 18, 1, 0.3, 3), C.tin, T(10, 7.6, -2));
  return P.build();
}
function padPart() {
  const P = new Part('thermal-pad');
  P.add(slab(15, 1.4, 15, 0.8, 0.3, 3), C.cream);
  return P.build();
}
function screwsPart() {
  const P = new Part('screws');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { screw(P, sx * 29, 0, sz * 29, 2.4, C.ink); P.add(cyl(1.1, 8, 8), C.steel, T(sx * 29, -8, sz * 29), { edges: false }); }
  return P.build();
}

// Camera pieces are built along +z (the lens looks toward +z), around the origin at the centre of the tube.
function camBody() {
  const P = new Part('cam-body');
  P.add(cyl(19, 62, 28).rotateX(PI / 2), C.cream, T(0, 0, -31));
  // Sunshield: a visor over the top that runs past the front glass.
  P.add(slab(36, 2.4, 80, 7, 0.8), C.walnut, T(0, 18.6, 6));
  P.add(box(8, 2, 30), C.cream, T(0, 17.2, -4), { edges: false });
  return P;
}
function camFront() {
  const P = new Part('cam-front');
  P.add(cyl(19, 5, 28).rotateX(PI / 2), C.ink, T(0, 0, 0));
  P.add(cyl(16.5, 0.6, 28).rotateX(PI / 2), C.walnut, T(0, 0, 5), { edges: false });
  P.add(cyl(8.6, 1.4, 22).rotateX(PI / 2), C.brass, T(0, 0, 5));
  P.add(cyl(6.6, 0.5, 22).rotateX(PI / 2), C.ink, T(0, 0, 6.4), { edges: false });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2 + 0.39; P.add(cyl(1.5, 0.8, 10).rotateX(PI / 2), C.rust, T(Math.cos(a) * 12.6, Math.sin(a) * 12.6, 5.2), { edges: false }); }
  return P;
}
function camLens() {
  const P = new Part('cam-lens');
  // Sensor board, lens mount and barrel.
  P.add(plate(30, 1.4, 30, 3, [[-11.5, -11.5, 1.2], [11.5, 11.5, 1.2]]).rotateX(PI / 2), C.board, T(0, 0, -6));
  P.add(slab(8, 1.2, 6, 0.4, 0.2, 2).rotateX(PI / 2), C.ink, T(0, 0, -4.4));
  P.add(slab(14, 5, 14, 1.5, 0.4, 3).rotateX(PI / 2), C.ink, T(0, 0, -4.4));
  P.add(cyl(6.6, 13, 22).rotateX(PI / 2), C.ink, T(0, 0, 0.5));
  for (const z of [3.5, 6.5, 9.5]) P.add(cyl(7, 0.9, 22).rotateX(PI / 2), C.walnut, T(0, 0, z), { edges: false });
  P.add(cyl(5.2, 0.5, 20).rotateX(PI / 2), C.brass, T(0, 0, 13.5)); P.add(ball(4.2, 16).scale(1, 1, 0.35), C.ink, T(0, 0, 13.6), { edges: false });
  chip(P, 9, -4, 0, 5, 5, 0.9, { pins: 'quad', n: 5 });
  return P;
}
function camRear() {
  const P = new Part('cam-rear');
  P.add(cyl(19, 4, 28, 17).rotateX(-PI / 2), C.cream, T(0, 0, 0));
  P.add(cyl(4, 6, 12).rotateX(-PI / 2), C.ink, T(0, -8, -4));
  return P;
}
function camMount() {
  const P = new Part('cam-mount');
  P.add(cyl(21, 4, 28, 19), C.cream); for (let i = 0; i < 3; i++) { const a = (i / 3) * PI * 2 + 0.5; screw(P, Math.cos(a) * 15, 4, Math.sin(a) * 15, 2.2, C.steel); }
  P.add(cyl(6, 34, 16, 5), C.cream, T(0, 4, 0));
  P.add(ball(8, 18), C.walnut, T(0, 42, 0), { edges: false });
  P.add(cyl(7.5, 3, 16), C.cream, T(0, 46, 0));
  return P;
}

export function create() {
  const root = new THREE.Group(); root.name = 'edge-unit';
  // The computer.
  const unit = new THREE.Group(); unit.position.set(46, 0, 8); unit.rotation.y = -0.25; root.add(unit);
  const bottom = bottomPart(), board = boardPart(), pad = padPart(), top = topPart(), screws = screwsPart();
  bottom.position.y = 1.6; board.position.y = 8.1; pad.position.set(10, 12.2, -2); top.position.y = 14.6; screws.position.y = 14.6 + TH + 0.2;
  unit.add(bottom, board, pad, top, screws);
  // The camera on its stand, tilted down a little, looking at the viewer's left.
  const cam = new THREE.Group(); cam.position.set(-62, 0, -6); cam.rotation.y = 0.55; root.add(cam);
  const mount = camMount().build(); cam.add(mount);
  const head = new THREE.Group(); head.position.set(0, 68, 2); head.rotation.x = 0.2; cam.add(head);
  const body = camBody().build(), front = camFront().build(), lens = camLens().build(), rear = camRear().build();
  front.position.z = 31; lens.position.z = 14; rear.position.z = -31;
  head.add(body, front, lens, rear);
  // Network cable from the camera's tail to the first jack.
  const cable = new Part('cable');
  wire(cable, [[-76, 60, -34], [-86, 32, -42], [-66, 3, -26], [-34, 2.5, 22], [-8, 3, 54], [9, 11, 60], [14, 16.6, 49]], 1.5, C.ink, 60);
  cable.add(slab(11, 8, 12, 1, 0.4, 2), C.cream, T(15, 12.4, 45, 0, -0.25, 0));
  const cab = cable.build(); root.add(cab);

  const setExplode = explodable([
    [screws, [0, 78, 0], 0, 0.5], [top, [0, 52, 0], 0.1, 0.75], [pad, [0, 24, 0], 0.3, 0.9], [bottom, [0, -20, 0], 0.3, 1], [cab, [0, 0, 0], 0, 1],
    [front, [0, 0, 70], 0, 0.7], [lens, [0, 0, 46], 0.2, 0.9], [rear, [0, 0, -22], 0.2, 0.8],
  ]);
  return model(root, {
    params: { explode: { value: 0, min: 0, max: 1 } },
    set(name, v) { if (name === 'explode') { setExplode(v); cab.visible = v < 0.04; } },
    view: { az: 0.38, el: 0.5, elMin: 0.05, elMax: 1.35, zoom: 1.16 },
    labels: [
      { text: 'RK3576', part: board, at: [10, 6, -2], when: [0.6, 1] },
      { text: '4 GB RAM', part: board, at: [-24, 4, -16], when: [0.6, 1] },
      { text: '64 GB eMMC', part: board, at: [23.5, 4, 16], when: [0.6, 1] },
      { text: '2 x 2.5 GbE', part: board, at: [-12, 4, 42], when: [0.6, 1] },
      { text: 'Heatsink lid', part: top, at: [0, TH + 8, 0], when: [0.6, 1] },
      { text: 'Lens and sensor', part: lens, at: [0, 8, 6], when: [0.6, 1] },
      { text: 'Store camera', part: head, at: [0, 26, 0], when: [0, 0.3] },
      { text: 'NanoPi R76S', part: top, at: [0, TH + 10, 0], when: [0, 0.3] },
    ],
  });
}
export default create;
