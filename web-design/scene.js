// TODO(web-design builder): the Web design scene. See docs/DESIGN.md, "Web design".
// Bright Memphis and Bauhaus 3D: chunky shapes with soft shadows you can drag and fling, springy hover.
// This placeholder only shows the scene contract. Replace all of it.
// Contract: export start(ctx) and return { resize, frame, still?, dispose? }. Details in shared/scene-loader.js.
import { WebGLRenderer, Scene, PerspectiveCamera, Mesh, TorusGeometry, MeshStandardMaterial, HemisphereLight, DirectionalLight } from '../shared/vendor/three-r186.module.min.js';

export function start({ canvas, low }) {
  const renderer = new WebGLRenderer({ canvas, antialias: !low, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 8);
  scene.add(new HemisphereLight('#FFF4E0', '#2D5BFF', 1.6), new DirectionalLight('#FFFFFF', 1.4));
  const shape = new Mesh(new TorusGeometry(1.4, 0.55, low ? 16 : 32, low ? 48 : 96), new MeshStandardMaterial({ color: '#FF5A4E', roughness: 0.5 }));
  shape.position.set(2.6, 0.6, 0);
  scene.add(shape);
  return {
    resize(w, h, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    frame(t) { shape.rotation.set(t * 0.4, t * 0.6, 0); renderer.render(scene, camera); },
    still() { shape.rotation.set(0.6, 0.4, 0); renderer.render(scene, camera); },
    dispose() { renderer.dispose(); },
  };
}
