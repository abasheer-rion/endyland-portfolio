// TODO(projects builder): the Projects scene. See docs/DESIGN.md, "Individual projects".
// Retro arcade: a voxel world, 8-bit hover effects, cabinets that light up, a small idle loop.
// This placeholder only shows the scene contract. Replace all of it.
// Contract: export start(ctx) and return { resize, frame, still?, dispose? }. Details in shared/scene-loader.js.
import { WebGLRenderer, Scene, PerspectiveCamera, InstancedMesh, BoxGeometry, MeshLambertMaterial, Object3D, Color, AmbientLight, DirectionalLight } from '../shared/vendor/three-r186.module.min.js';

export function start({ canvas, low }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(6, 6, 10); camera.lookAt(2, 0, 0);
  scene.add(new AmbientLight('#6B4BFF', 0.8), new DirectionalLight('#FFFFFF', 1));
  const N = low ? 8 : 12, cubes = new InstancedMesh(new BoxGeometry(0.9, 0.9, 0.9), new MeshLambertMaterial(), N * N);
  const o = new Object3D(), cols = ['#FF4FD8', '#3DF2FF', '#FFE14D'].map((c) => new Color(c));
  for (let i = 0, k = 0; i < N; i++) for (let j = 0; j < N; j++, k++) {
    o.position.set(i - N / 2 + 2, Math.floor(((i * 7 + j * 3) % 5) / 2) * 0.5 - 1.5, j - N / 2);
    o.updateMatrix(); cubes.setMatrixAt(k, o.matrix); cubes.setColorAt(k, cols[(i + j) % 3]);
  }
  cubes.position.set(1.5, -3.2, -2); // low and to the right, so the text stays readable
  scene.add(cubes);
  return {
    resize(w, h, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    frame(t) { cubes.rotation.y = Math.sin(t * 0.3) * 0.2; renderer.render(scene, camera); },
    still() { renderer.render(scene, camera); },
    dispose() { renderer.dispose(); },
  };
}
