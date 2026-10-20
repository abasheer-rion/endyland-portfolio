(function(){
  if(!window.THREE) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('beam');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true}); }
  catch(e){ canvas.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);

  // Planar array, half-wavelength spacing. Boresight is +z.
  const N = 6, FLOOR = -32;
  const geo = new THREE.SphereGeometry(1, 180, 90);
  const pos = geo.attributes.position;
  const dirs = Float32Array.from(pos.array);
  const colors = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const cLow = new THREE.Color('#9AA3B2'), cMid = new THREE.Color('#4B2BFF'), cHi = new THREE.Color('#FF5A36');
  const tmp = new THREE.Color();

  const beam = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({vertexColors:true, transparent:true, opacity:.92, side:THREE.DoubleSide}));
  const wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color:'#151A26', wireframe:true, transparent:true, opacity:.07}));
  const rig = new THREE.Group(); rig.add(beam, wire);

  // the array itself: a small grid of elements at the origin
  const el = new THREE.BoxGeometry(.07, .07, .015), elMat = new THREE.MeshBasicMaterial({color:'#151A26'});
  for(let i=0;i<N;i++) for(let j=0;j<N;j++){
    const m = new THREE.Mesh(el, elMat); m.position.set((i-(N-1)/2)*.11, (j-(N-1)/2)*.11, 0); rig.add(m);
  }
  scene.add(rig);

  function af1(x){ // normalised array factor of N elements, psi = pi * x
    const p = Math.PI * x / 2;
    const s = Math.sin(p);
    if (Math.abs(s) < 1e-6) return 1;
    return Math.abs(Math.sin(N * p) / (N * s));
  }

  let u0 = 0, v0 = 0, tu = .25, tv = .15, grow = reduce ? 1 : 0;
  function shape(){
    const a = pos.array;
    for(let i=0;i<pos.count;i++){
      const x = dirs[i*3], y = dirs[i*3+1], z = dirs[i*3+2];
      const elem = z > 0 ? Math.pow(z, .7) : 0;
      const g = af1(x - u0) * af1(y - v0) * elem;
      let db = 20 * Math.log10(g + 1e-6); if (db < FLOOR) db = FLOOR;
      const t = (db - FLOOR) / -FLOOR;            // 0..1
      const r = .06 + 1.85 * t;
      const rr = .55 + (r - .55) * grow;          // starts as a plain sphere, grows into the beam
      a[i*3] = x * rr; a[i*3+1] = y * rr; a[i*3+2] = z * rr;
      if (t < .55) tmp.copy(cLow).lerp(cMid, t / .55); else tmp.copy(cMid).lerp(cHi, (t - .55) / .45);
      colors[i*3] = tmp.r; colors[i*3+1] = tmp.g; colors[i*3+2] = tmp.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true;
  }

  let W = 0, H = 0;
  function resize(){
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    const wide = W > 900;
    camera.setViewOffset(W, H, wide ? -W * .2 : -W * .1, wide ? 0 : H * .2, W, H);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  // pointer steers the beam; hovering a project steers it toward that project
  let lastMove = 0;
  addEventListener('pointermove', e => {
    tu = (e.clientX / W - .5) * 1.5; tv = -(e.clientY / H - .5) * 1.3; lastMove = performance.now();
  }, {passive:true});
  document.querySelectorAll('[data-steer]').forEach(li => {
    const [a, b] = li.dataset.steer.split(',').map(Number);
    const go = () => { tu = a; tv = b; lastMove = performance.now() + 4000; };
    li.addEventListener('pointerenter', go); li.addEventListener('focusin', go);
  });

  let orbit = 0;
  addEventListener('scroll', () => { orbit = scrollY / Math.max(1, document.body.scrollHeight - H); }, {passive:true});

  const start = performance.now();
  function frame(now){
    const idle = now - lastMove > 3500;
    if (idle && !reduce){ const t = now / 1000; tu = .45 * Math.sin(t * .35); tv = .25 * Math.sin(t * .23 + 1); }
    if (!reduce && grow < 1) grow = Math.min(1, (now - start) / 1600), grow = 1 - Math.pow(1 - grow, 3);
    const du = tu - u0, dv = tv - v0;
    if (Math.abs(du) + Math.abs(dv) > .0005 || grow < 1){ u0 += du * .08; v0 += dv * .08; shape(); }
    const ang = -.75 + orbit * 1.6;
    camera.position.set(Math.sin(ang) * 6.2, 1.5 - orbit * 1.2, Math.cos(ang) * 6.2);
    camera.lookAt(0, 0, .6);
    renderer.render(scene, camera);
    if (!reduce) requestAnimationFrame(frame);
  }
  shape();
  if (reduce){ addEventListener('pointermove', () => requestAnimationFrame(frame), {passive:true}); addEventListener('scroll', () => requestAnimationFrame(frame), {passive:true}); frame(performance.now()); }
  else requestAnimationFrame(frame);
})();
