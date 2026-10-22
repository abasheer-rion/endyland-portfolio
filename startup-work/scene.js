// TODO(startup-work builder): the Startup work scene. See docs/DESIGN.md, "Startup work".
// Cinematic: a particle swarm that morphs between shapes per company, camera dolly, cheap additive glow.
// This placeholder only shows the scene contract. Replace all of it.
// Contract: export start(ctx) and return { resize, frame, still?, dispose? }. Details in shared/scene-loader.js.
import { WebGLRenderer, Scene, PerspectiveCamera, Points, BufferGeometry, BufferAttribute, PointsMaterial, AdditiveBlending } from '../shared/vendor/three-r186.module.min.js';

export function start({ canvas, low }) {
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true });
  const scene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);
  const n = low ? 1500 : 5000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 2.4, s = Math.sqrt(1 - u * u);
    pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3);
  }
  const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(pos, 3));
  const swarm = new Points(g, new PointsMaterial({ color: '#8AB4FF', size: 0.035, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }));
  swarm.position.x = 2.2;
  scene.add(swarm);
  return {
    resize(w, h, dpr) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); },
    frame(t) { swarm.rotation.y = t * 0.12; renderer.render(scene, camera); },
    still() { renderer.render(scene, camera); },
    dispose() { renderer.dispose(); },
  };
}
