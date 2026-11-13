// Four-element 5.8 GHz patch antenna array (a uniform linear array) with the beam it forms. The patches sit half a
// wavelength apart, 25.844 mm. Each has its own feed line and SMA connector, so the phase at every element can be
// set or measured. The lobe is the array factor of four elements multiplied by a cosine element pattern, drawn to
// scale in amplitude; steering it changes the phase step between neighbours, exactly as on the research page.
// Board outline, patch size and feed layout are illustrative: the real board has not been built.
//   create({ angle }) -> THREE.Group. Parameter: angle, -60..60 degrees from broadside.
import { THREE, C, T, Part, box, cyl, slab, sma, traces, pcb, plateMaterial, labelTexture, model } from './kit.js';

const PI = Math.PI, N = 4, PITCH = 25.844, REACH = 84;
const NU = 96, NV = 22;

function boardPart() {
  const P = new Part('board');
  const w = 112, d = 62;
  P.add(slab(w, 0.25, d, 3, 0, 4), C.brass, T(0, -0.25, 0), { edges: false }); // ground plane
  const y = pcb(P, w, d, { r: 3, colour: C.board, holes: [[-51, -26], [51, -26], [-51, 26], [51, 26]] });
  for (let i = 0; i < N; i++) {
    const x = (i - (N - 1) / 2) * PITCH;
    P.add(box(15.6, 0.12, 11.8), C.foil, T(x, y, -8));                 // the patch
    P.add(box(0.5, 0.14, 4), C.board, T(x - 1.5, y, -3.9), { edges: false }); // inset feed notches
    P.add(box(0.5, 0.14, 4), C.board, T(x + 1.5, y, -3.9), { edges: false });
    P.add(box(1, 0.1, 9.5), C.foil, T(x, y, -1.2), { edges: false });   // quarter-wave section
    P.add(box(2.6, 0.1, 27.5), C.foil, T(x, y, 17.25), { edges: false });    // 50 ohm line to the connector
    sma(P, x, d / 2, y, PI);
  }
  P.decal(labelTexture('5.8 GHz', { w: 256, h: 64, font: '600 44px ui-monospace,Menlo,monospace' }), 19, 4.75, T(-25.8, y + 0.05, 21));
  P.decal(labelTexture('25.8 mm', { w: 256, h: 64, font: '600 40px ui-monospace,Menlo,monospace' }), 17, 4.25, T(0, y + 0.05, 21));
  // Dimension line between the two middle feed lines: the element spacing.
  traces(P, y, [[[-PITCH / 2 + 2.2, 15.5], [PITCH / 2 - 2.2, 15.5]]], 0.25, C.cream, false);
  for (const s of [-1, 1]) P.add(box(0.25, 0.06, 3), C.cream, T(s * (PITCH / 2 - 2.2), y, 15.5), { edges: false });
  return P.build();
}

export function create() {
  const root = new THREE.Group(); root.name = 'patch-array';
  root.add(boardPart());
  // The lobe: a grid over the upper half space. u runs along the array (the steering plane), v runs across it.
  const count = (NU + 1) * (NV + 1), pos = new Float32Array(count * 3), col = new Float32Array(count * 3), idx = [];
  const foil = new THREE.Color(C.foil);
  for (let i = 0; i < count; i++) col.set([foil.r, foil.g, foil.b], i * 3);
  for (let u = 0; u < NU; u++) for (let v = 0; v < NV; v++) { const a = u * (NV + 1) + v, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
  const lobeMat = plateMaterial({ opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const lobe = new THREE.Mesh(geo, lobeMat); lobe.position.set(0, 2, -8); lobe.renderOrder = 2; root.add(lobe);
  // The cut through the steering plane: the polar plot of the pattern, as an ink line. Plus broadside and beam axes.
  const cutPos = new Float32Array((NU + 1) * 3), cutGeo = new THREE.BufferGeometry(); cutGeo.setAttribute('position', new THREE.BufferAttribute(cutPos, 3));
  const cut = new THREE.Line(cutGeo, new THREE.LineBasicMaterial({ color: C.ink })); cut.position.copy(lobe.position); cut.renderOrder = 3; root.add(cut);
  const axPos = new Float32Array(12), axGeo = new THREE.BufferGeometry(); axGeo.setAttribute('position', new THREE.BufferAttribute(axPos, 3));
  const axes = new THREE.LineSegments(axGeo, new THREE.LineBasicMaterial({ color: C.rust })); axes.position.copy(lobe.position); axes.renderOrder = 3; root.add(axes);

  const pattern = (theta, steer) => {
    const psi = PI * (Math.sin(theta) - Math.sin(steer)); // half-wavelength spacing: k d = pi
    const s = Math.sin(psi / 2);
    return Math.abs(s) < 1e-6 ? 1 : Math.abs(Math.sin((N * psi) / 2) / (N * s));
  };
  function setAngle(deg) {
    const steer = (deg * PI) / 180;
    for (let u = 0; u <= NU; u++) {
      const theta = -PI / 2 + (u / NU) * PI, af = pattern(theta, steer), st = Math.sin(theta), ct = Math.cos(theta);
      for (let v = 0; v <= NV; v++) {
        const phi = -PI / 2 + (v / NV) * PI, e = Math.pow(Math.max(0, ct * Math.cos(phi)), 0.7), r = af * e * REACH, i = (u * (NV + 1) + v) * 3;
        pos[i] = r * st; pos[i + 1] = r * ct * Math.cos(phi); pos[i + 2] = r * ct * Math.sin(phi);
      }
      const rc = af * Math.pow(ct, 0.7) * REACH;
      cutPos[u * 3] = rc * st; cutPos[u * 3 + 1] = rc * ct; cutPos[u * 3 + 2] = 0;
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); cutGeo.attributes.position.needsUpdate = true;
    const tip = REACH * 1.12;
    axPos.set([0, 0, 0, 0, tip * 0.5, 0, 0, 0, 0, Math.sin(steer) * tip, Math.cos(steer) * tip, 0]); axGeo.attributes.position.needsUpdate = true;
  }
  setAngle(0);
  // Keep the framing steady while the beam moves: measure with the lobe at its widest reach.
  return model(root, {
    params: { angle: { value: 0, min: -60, max: 60 } },
    set(name, v) { if (name === 'angle') setAngle(v); },
    view: { az: 0.5, el: 0.36, elMin: 0.03, elMax: 1.3, center: [0, 34, 2], radius: 86, zoom: 1.1 },
    dispose() { lobeMat.dispose(); },
  });
}
export default create;
