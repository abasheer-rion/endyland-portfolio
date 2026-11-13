// Safe Home mesh story: a small neighbourhood where each house has a sensor box with a short-range radio. Messages
// hop house to house to the one house that still has internet (the one with the mast). Click a house, or press
// Enter, to take its box offline: its links drop and messages find another way round.
//   create() -> THREE.Group. model.pick / model.action toggle houses; model.setOffline([ids]) sets them from a page.
//   Fires "model:change" on the stage element with { offline: [ids], reachable: n }.
import { THREE, C, T, Part, box, cyl, ball, slab, tint, plateMaterial, sharedPlate, sharedLines, model } from './kit.js';

const PI = Math.PI;
// House positions on the ground (x, z), and a turn so the street does not look ruled. The last one is the gateway.
const SITES = [[-112, -62, 0.1], [-40, -70, -0.08], [36, -64, 0.12], [-120, 8, -0.1], [-46, 2, 0.06], [30, 10, -0.12], [-104, 74, 0.08], [-30, 70, -0.05], [110, -5, 0.05]];
const GW = SITES.length - 1, REACH = 100;

function gable(w, h, d) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}
function house(i) {
  const P = new Part(`house-${i}`), gw = i === GW, w = 34, d = 26, h = 20;
  P.add(slab(w, h, d, 0.8, 0.3, 2), C.vellum);
  P.add(gable(d + 3, 13, w + 5).rotateY(PI / 2), gw ? C.brass : i % 3 === 1 ? C.rust : C.saddle, T(0, h, 0));
  P.add(box(4.5, 9, 4.5), C.walnut, T(-9, h + 5, 4));
  P.add(box(6, 11, 0.6), C.walnut, T(-7, 0, d / 2)); P.add(cyl(0.5, 0.5, 8).rotateX(PI / 2), C.foil, T(-5.3, 5.5, d / 2 + 0.4), { edges: false });
  for (const x of [4, 12]) P.add(box(5, 5.5, 0.5), C.brass, T(x, 8, d / 2));
  for (const z of [-5, 6]) P.add(box(0.5, 5.5, 5), C.brass, T(w / 2, 8, z));
  P.add(box(w + 3, 1.2, 3), C.cream, T(0, 0, d / 2 + 1.5));
  // The sensor box on the end wall, with its antenna above the eaves.
  P.add(slab(7, 9, 3.6, 0.8, 0.4, 3).rotateZ(PI / 2).translate(0, 0, 0), C.cream, T(w / 2 + 3.7, 9.5, -7));
  P.add(cyl(0.7, 20, 8), C.ink, T(w / 2 + 2.4, 16, -7)); P.add(ball(1.5, 10), gw ? C.foil : C.rust, T(w / 2 + 2.4, 36.5, -7), { edges: false });
  if (gw) {
    // The house with internet: a mast with a small dish.
    P.add(cyl(1, 46, 8), C.ink, T(-w / 2 - 5, 0, -6)); P.add(cyl(2.4, 1.2, 10), C.walnut, T(-w / 2 - 5, 0, -6));
    P.add(new THREE.SphereGeometry(7, 16, 6, 0, PI * 2, 0, 1.0).rotateX(PI / 2.4).rotateY(-0.7), C.cream, T(-w / 2 - 5, 40, -6), { angle: 50 });
    for (const y of [16, 28]) P.add(box(5, 0.8, 0.8), C.ink, T(-w / 2 - 2.5, y, -6), { edges: false });
  }
  return P;
}
function ground() {
  const P = new Part('ground');
  P.add(slab(330, 5, 230, 14, 1.2), C.paper, T(0, -5, 0));
  // Two streets and a few trees.
  P.add(slab(322, 0.4, 13, 3, 0, 3), C.cream, T(0, 0, -33)); P.add(slab(322, 0.4, 13, 3, 0, 3), C.cream, T(0, 0, 40));
  P.add(slab(13, 0.4, 222, 3, 0, 3), C.cream, T(-78, 0.02, 0)); P.add(slab(13, 0.4, 222, 3, 0, 3), C.cream, T(72, 0.02, 0));
  for (const [x, z, s] of [[-150, -20, 1], [-4, -92, 0.9], [70, -86, 1.1], [0, 96, 1], [84, 80, 1.2], [148, 86, 0.9], [-150, 100, 1.05], [60, 66, 0.8]]) {
    P.add(cyl(1.3, 9 * s, 6), C.walnut, T(x, 0, z), { edges: false });
    P.add(new THREE.IcosahedronGeometry(8 * s, 0), C.board, T(x, 13 * s, z, 0.4, x, 0), { angle: 10 });
  }
  return P.build();
}

export function create() {
  const root = new THREE.Group(); root.name = 'mesh';
  root.add(ground());
  const dim = plateMaterial({ fade: 0.72, fadeTo: C.paper });
  const dimLines = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28 });
  const tips = [], houses = [], up = SITES.map(() => true), pickables = [];
  SITES.forEach(([x, z, ry], i) => {
    const g = house(i).build(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    g.userData.mesh.userData.house = i; pickables.push(g.userData.mesh); houses.push(g);
    g.updateMatrix(); tips.push(new THREE.Vector3(34 / 2 + 2.4, 36.5, -7).applyMatrix4(g.matrix));
  });
  const adj = SITES.map(() => []);
  SITES.forEach((a, i) => SITES.forEach((b, j) => { if (i < j && Math.hypot(a[0] - b[0], a[1] - b[1]) < REACH) { adj[i].push(j); adj[j].push(i); } }));

  // Radio links: shallow arcs between antenna tips, drawn as dashes. Rebuilt when a house changes.
  const arc = (a, b, u, out) => { const k = 4 * u * (1 - u); return out.lerpVectors(a, b, u).setY(a.y + (b.y - a.y) * u + k * 12); };
  const linkGeo = new THREE.BufferGeometry(), v = new THREE.Vector3();
  const links = new THREE.LineSegments(linkGeo, new THREE.LineBasicMaterial({ color: C.brass }));
  root.add(links);
  function drawLinks() {
    const p = [];
    adj.forEach((list, i) => list.forEach((j) => {
      if (i > j || !up[i] || !up[j]) return;
      for (let s = 0; s < 14; s++) { arc(tips[i], tips[j], (s + 0.18) / 14, v); p.push(v.x, v.y, v.z); arc(tips[i], tips[j], (s + 0.82) / 14, v); p.push(v.x, v.y, v.z); }
    }));
    linkGeo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  }
  function route(from) {
    const prev = new Array(SITES.length).fill(-2); prev[from] = -1; const q = [from];
    while (q.length) { const n = q.shift(); if (n === GW) break; for (const m of adj[n]) if (prev[m] === -2 && up[m]) { prev[m] = n; q.push(m); } }
    if (prev[GW] === -2) return null;
    const path = []; for (let n = GW; n !== -1; n = prev[n]) path.unshift(n); return path;
  }

  // Messages: small balls that travel the arcs to the gateway.
  const packetGeo = tint(ball(2.6, 12), C.rust);
  const packets = Array.from({ length: 7 }, () => { const m = new THREE.Mesh(packetGeo, sharedPlate()); m.visible = false; root.add(m); return { m, path: null, seg: 0, u: 0 }; });
  let spawnIn = 0.4, next = 0, last = -1;
  function spawn() {
    const free = packets.find((p) => !p.path); if (!free) return;
    for (let tries = 0; tries < SITES.length; tries++) {
      const from = (next = (next + 5) % GW); if (!up[from]) continue;
      const path = route(from); if (!path) continue;
      free.path = path; free.seg = 0; free.u = 0; free.m.visible = true; return;
    }
  }
  function refresh() {
    houses.forEach((g, i) => { g.userData.mesh.material = up[i] ? sharedPlate() : dim; g.userData.lines.material = up[i] ? sharedLines() : dimLines; });
    drawLinks();
    for (const p of packets) {
      if (!p.path) continue;
      const here = p.path[p.seg], fresh = up[here] && up[p.path[p.seg + 1]] ? route(here) : null;
      if (fresh && fresh[1] === p.path[p.seg + 1]) { p.path = fresh; p.seg = 0; } else if (fresh && p.u < 0.5) { p.path = fresh; p.seg = 0; p.u = 0; } else if (!fresh || !up[p.path[p.seg + 1]]) { p.path = null; p.m.visible = false; }
    }
    return { offline: up.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0), reachable: SITES.filter((_, i) => i !== GW && up[i] && route(i)).length };
  }
  function toggle(i) { if (i === GW || i == null) return undefined; up[i] = !up[i]; return refresh(); }
  refresh();

  return model(root, {
    pickables,
    pick: (obj) => toggle(obj.userData.house),
    // Enter or Space: bring the last house back and take the next one offline.
    action() { if (last >= 0) up[last] = true; last = (last + 3) % GW; up[last] = false; return refresh(); },
    setOffline(ids) { up.forEach((_, i) => { up[i] = i === GW || !ids.includes(i); }); return refresh(); },
    tick(t, dt) {
      spawnIn -= dt; if (spawnIn <= 0) { spawn(); spawnIn = 0.55; }
      for (const p of packets) {
        if (!p.path) continue;
        p.u += dt * 1.25;
        if (p.u >= 1) { p.u -= 1; p.seg++; if (p.seg >= p.path.length - 1) { p.path = null; p.m.visible = false; continue; } }
        arc(tips[p.path[p.seg]], tips[p.path[p.seg + 1]], p.u, p.m.position);
      }
    },
    dispose() { dim.dispose(); dimLines.dispose(); },
    view: { az: 0.5, el: 0.62, elMin: 0.25, elMax: 1.3, zoom: 1.22, sway: 0.1 },
    labels: [{ text: 'Internet', at: [SITES[GW][0] - 22, 52, SITES[GW][1] - 6] }],
  });
}
export default create;
