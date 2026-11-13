// The endyland mark as a solid object: a capital E drawn as one trace, each arm ending in a dot. The arms shorten
// downward, so the dots sit on a slant (three antenna elements, steered wavefront). Geometry is the 64-unit grid
// from docs/brand.md. For a slow hero object.
//   create({ tone }) -> THREE.Group. tone "dark" (default): paper E, foil dots, for leather. "light": ink E, rust dots.
import { THREE, C, T, Part, cyl, extrude, model } from './kit.js';

const PI = Math.PI;

export function create({ tone = 'dark' } = {}) {
  const light = tone === 'light';
  const P = new Part('logo');
  // Outline of the stroked path M36 12H12V52H20 M12 32H28 (stroke 8, round caps and joins). The drawing is in the
  // plan view, so +y here is the top of the letter: grid y is flipped around 32.
  const f = (y) => 32 - y, s = new THREE.Shape();
  s.moveTo(12 - 32, f(8));
  s.lineTo(36 - 32, f(8)); s.absarc(36 - 32, f(12), 4, PI / 2, -PI / 2, true);
  s.lineTo(16 - 32, f(16)); s.lineTo(16 - 32, f(28));
  s.lineTo(28 - 32, f(28)); s.absarc(28 - 32, f(32), 4, PI / 2, -PI / 2, true);
  s.lineTo(16 - 32, f(36)); s.lineTo(16 - 32, f(48));
  s.lineTo(20 - 32, f(48)); s.absarc(20 - 32, f(52), 4, PI / 2, -PI / 2, true);
  s.lineTo(12 - 32, f(56)); s.absarc(12 - 32, f(52), 4, -PI / 2, PI, true);
  s.lineTo(8 - 32, f(12)); s.absarc(12 - 32, f(12), 4, PI, PI / 2, true);
  // extrude() lays the plan flat; stand it up again so the letter faces +z.
  const up = T(0, 0, 0, PI / 2, 0, 0);
  P.add(extrude(s, 9, 1.1, 10), light ? C.ink : C.paper, T(0, 0, 4.5).multiply(up));
  // The three dots: thick coins, set a little proud of the letter.
  for (const [x, y] of [[52, 12], [44, 32], [36, 52]]) {
    P.add(cyl(6, 11, 36).translate(0, -5.5, 0), light ? C.rust : C.foil, T(x - 32, f(y), 0, PI / 2, 0, 0), { angle: 40 });
    P.add(cyl(3.2, 0.3, 24), light ? C.saddle : C.brass, T(x - 32, f(y), 5.5, PI / 2, 0, 0), { edges: false });
  }
  const root = new THREE.Group(); root.name = 'logo'; root.add(P.build());
  return model(root, { view: { az: 0.45, el: 0.16, elMin: -0.5, elMax: 0.9, azRange: 1.25, sway: 0.42, center: [0, 0, 0], radius: 40, zoom: 1.02 } });
}
export default create;
