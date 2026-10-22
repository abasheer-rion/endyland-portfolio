// TODO(research builder): the Research scene. See docs/DESIGN.md, "Research".
// Dark lab instrument: phosphor green and amber on black, wireframe RF field lines, a live polar beam plot.
// This placeholder only shows the scene contract. Replace all of it.
// Contract: export start(ctx) and return { resize, frame, still?, dispose? }. Details in shared/scene-loader.js.
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, IcosahedronGeometry, MeshBasicMaterial } from '../shared/vendor/three-r186.module.min.js';

export function start({ canvas, low }) {
  const renderer = new WebGLRenderer({ canvas, antialias: !low, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 8);
  const field = new Mesh(new IcosahedronGeometry(2, low ? 2 : 3), new MeshBasicMaterial({ color: '#39FF88', wireframe: true, transparent: true, opacity: 0.35 }));
  field.position.set(2.4, 0.4, 0);
  scene.add(field);
  return {
    resize(w, h, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    frame(t) { field.rotation.set(t * 0.1, t * 0.25, 0); renderer.render(scene, camera); },
    still() { renderer.render(scene, camera); },
    dispose() { renderer.dispose(); },
  };
}
