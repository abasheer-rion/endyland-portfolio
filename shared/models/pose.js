// A 17-point pose figure: the keypoints a pose model reports for one person (nose, eyes, ears, shoulders, elbows,
// wrists, hips, knees, ankles) and the bones drawn between them. Argus scored tracked people from points like
// these. The four poses are hand-made illustrations, not recorded data.
//   create({ pose }) -> THREE.Group. Parameter: pose 0..3 (0 standing, 1 reaching high, 2 crouching, 3 hand to
//   torso). Values in between blend two poses.
import { THREE, C, T, Part, cyl, ball, slab, tint, sharedPlate, model } from './kit.js';

const m = (pts) => pts; // x: figure's left is +x. y up, centimetres. z toward the viewer.
const STAND = m([[0, 160, 8], [3, 163, 6], [-3, 163, 6], [7, 161, 0], [-7, 161, 0], [18, 142, 0], [-18, 142, 0], [22, 112, 0], [-22, 112, 0], [23, 86, 4], [-23, 86, 4], [11, 92, 0], [-11, 92, 0], [11, 50, 2], [-11, 50, 2], [11, 6, 0], [-11, 6, 0]]);
const edit = (base, changes) => base.map((p, i) => changes[i] || p);
const REACH = edit(STAND, { 0: [1, 163, 6], 1: [4, 166, 3], 2: [-2, 166, 4], 3: [8, 163, -3], 4: [-6, 163, -2], 6: [-18, 146, 1], 8: [-24, 170, 12], 10: [-20, 198, 24], 15: [11, 8, 0], 16: [-11, 8, 0] });
const CROUCH = [[0, 108, 26], [3, 111, 24], [-3, 111, 24], [7, 110, 17], [-7, 110, 17], [18, 92, 10], [-18, 92, 10], [22, 66, 20], [-22, 66, 20], [15, 44, 34], [-15, 44, 34], [11, 46, -16], [-11, 46, -16], [13, 48, 22], [-13, 48, 22], [11, 6, 6], [-11, 6, 6]];
const TORSO = edit(STAND, { 0: [0, 158, 10], 1: [3, 161, 8], 2: [-3, 161, 8], 8: [-25, 114, 6], 10: [-5, 106, 15], 7: [23, 113, 2], 9: [20, 88, 8] });
const POSES = [STAND, REACH, CROUCH, TORSO];
const BONES = [[15, 13], [13, 11], [16, 14], [14, 12], [11, 12], [5, 11], [6, 12], [5, 6], [5, 7], [6, 8], [7, 9], [8, 10], [1, 2], [0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6]];

export function create() {
  const root = new THREE.Group(); root.name = 'pose';
  const floor = new Part('floor');
  floor.add(cyl(52, 2, 48), C.paper, T(0, -2, 0));
  floor.add(new THREE.RingGeometry(36, 36.6, 48).rotateX(-Math.PI / 2), C.saddle, T(0, 0.05, 0), { edges: false });
  for (const s of [-1, 1]) floor.add(slab(7, 0.3, 17, 3.4, 0, 6), C.cream, T(s * 11, 0, 4)); // foot marks
  root.add(floor.build());
  const jointGeo = tint(ball(2.7, 14), C.brass), headGeo = tint(ball(1.7, 10), C.brass), boneGeo = tint(cyl(1.15, 1, 10), C.ink);
  const joints = STAND.map((_, i) => { const j = new THREE.Mesh(i < 5 ? headGeo : jointGeo, sharedPlate()); root.add(j); return j; });
  const bones = BONES.map(([a]) => { const b = new THREE.Mesh(boneGeo, sharedPlate()); if (a < 5) b.scale.set(0.55, 1, 0.55); root.add(b); return b; });
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  function setPose(v) {
    const i = Math.min(POSES.length - 2, Math.max(0, Math.floor(v))), k0 = Math.min(1, Math.max(0, v - i)), k = k0 * k0 * (3 - 2 * k0), A = POSES[i], B = POSES[i + 1];
    joints.forEach((j, n) => j.position.set(A[n][0] + (B[n][0] - A[n][0]) * k, A[n][1] + (B[n][1] - A[n][1]) * k, A[n][2] + (B[n][2] - A[n][2]) * k));
    BONES.forEach(([a, b], n) => {
      const mesh = bones[n], pa = joints[a].position, pb = joints[b].position;
      d.subVectors(pb, pa); const len = d.length();
      mesh.position.copy(pa); mesh.scale.y = len; mesh.quaternion.setFromUnitVectors(up, d.divideScalar(len || 1));
    });
  }
  setPose(0);
  return model(root, {
    params: { pose: { value: 0, min: 0, max: 3 } },
    set(name, v) { if (name === 'pose') setPose(v); },
    view: { az: 0.5, el: 0.2, elMin: 0, elMax: 1.2, center: [0, 96, 6], radius: 112, zoom: 1.05, sway: 0.2 },
    dispose() { jointGeo.dispose(); headGeo.dispose(); boneGeo.dispose(); },
  });
}
export default create;
