// One small viewer for every 3D model in this folder.
//
//   <div class="model-stage" data-model="sensor-box" data-explode="scroll" aria-label="..."></div>
//   <script type="module" src="/shared/models/auto.js"></script>      (mounts every .model-stage on the page)
// or, from a page script:
//   import { mountModel } from '/shared/models/stage.js';
//   const stage = mountModel(el, { model: 'patch-array', options: { angle: 25 } });
//   stage.set('angle', -40); stage.dispose();
//
// What it does:
// - Loads three.js and the model only when the element comes within 300px of the viewport.
// - Draws with the plate material from kit.js on a transparent canvas, pixel ratio capped at 2 (1.5 on phones and touch screens).
// - Drag to turn, with inertia and rubber-band limits. Arrow keys turn it, Home resets, Enter or Space runs the
//   model's action. A gentle idle sway runs when nobody is touching it.
// - Model parameters (explode, angle, ...) come from data attributes or options: a number, "scroll" (follows the
//   element's way through the viewport), "pointer" (follows the pointer across the element) or "auto" (sweeps).
// - Stops drawing when off screen or when the tab is hidden. Handles resize. dispose() frees everything.
// - Without WebGL 2, or if anything fails, the element gets class "is-static" and shows its own child markup, or a
//   poster image from ./posters/<model>.webp (data-poster="url" picks another, data-poster="none" shows nothing).
// Reduced motion is ignored on purpose (owner decision). Full notes: docs/models.md.

const LOADERS = {
  'sensor-box': () => import('./sensor-box.js'),
  'mesh': () => import('./mesh.js'),
  'edge-unit': () => import('./edge-unit.js'),
  'patch-array': () => import('./patch-array.js'),
  'fpga-board': () => import('./fpga-board.js'),
  'logo': () => import('./logo.js'),
  'pose': () => import('./pose.js'),
  'sensor-node': () => import('./sensor-node.js'),
};
export const MODELS = Object.keys(LOADERS);

const FOV = 26, DPR_CAP = 2;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const band = (x, min, max, give = 0.35) => {
  if (x > max) return max + (1 - 1 / ((x - max) * 0.55 / give + 1)) * give;
  if (x < min) return min - (1 - 1 / ((min - x) * 0.55 / give + 1)) * give;
  return x;
};

function hasWebGL2(soft) {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: !soft });
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch { return false; }
}

export function mountModel(el, { model, options = {} } = {}) {
  if (!el) return null;
  if (el.__stage) return el.__stage;
  const name = model || el.dataset.model;
  const opts = { ...el.dataset, ...options };
  const ac = new AbortController(), on = (target, type, fn, o = {}) => target.addEventListener(type, fn, { ...o, signal: ac.signal });
  const observers = [];
  let dead = false, started = false, near = false, shown = false, live = false;
  let renderer, scene, camera, root, api = {}, kit, canvas, labelBox, labels = [], fitA, fitB;
  let W = 0, H = 0, dpr = 0, cap = (matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600) ? 1.5 : DPR_CAP, radius = 100, raf = 0, running = false, prev = 0, t = 0, slow = 0;
  const view = { az: 0.6, el: 0.42, elMin: 0.04, elMax: 1.4, azRange: null, spin: 0, sway: 0.14, zoom: 1 };
  const orbit = { az: 0, el: 0, vAz: 0, vEl: 0, drag: null, last: -9, idle: 0 };
  const params = {};
  const pointer = { x: 0, y: 0, moved: false, inside: false };

  if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
  if (!el.hasAttribute('role')) { el.setAttribute('role', 'group'); el.setAttribute('aria-roledescription', '3D model'); }
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', `3D model: ${String(name).replace(/-/g, ' ')}. Drag or use the arrow keys to turn it.`);

  const goStatic = () => {
    live = false; stop();
    el.classList.remove('is-live'); el.classList.add('is-static');
    if (canvas) { canvas.remove(); canvas = null; }
    if (!el.querySelector('img,svg,picture') && el.dataset.poster !== 'none') {
      const img = new Image();
      img.className = 'model-poster'; img.alt = ''; img.width = 960; img.height = 720; img.decoding = 'async'; img.loading = 'lazy';
      const file = name === 'logo' && opts.tone === 'light' ? 'logo-light' : name;
      img.src = el.dataset.poster || new URL(`./posters/${file}.webp`, import.meta.url).href;
      el.append(img);
    }
  };

  async function start() {
    if (!LOADERS[name]) { console.warn(`model-stage: no model named "${name}"`); return goStatic(); }
    if (!hasWebGL2('softGl' in el.dataset)) return goStatic();
    try {
      const [k, mod] = await Promise.all([import('./kit.js'), LOADERS[name]()]);
      if (dead) return;
      kit = k; build(mod);
    } catch (err) {
      console.warn('3D model did not start:', err);
      goStatic();
    }
  }

  function build(mod) {
    const THREE = kit.THREE;
    canvas = document.createElement('canvas'); canvas.setAttribute('aria-hidden', 'true');
    el.append(canvas);
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV, 1, 1, 6000);
    root = mod.create(opts);
    api = root.userData.model || {};
    Object.assign(view, api.view || {});
    for (const k of ['az', 'el', 'zoom']) if (opts[k] != null && opts[k] !== '' && !Number.isNaN(+opts[k])) view[k] = +opts[k];
    if ('still' in opts) { view.sway = 0; view.spin = 0; }
    scene.add(root);

    // Parameters: fixed number, or bound to scroll, pointer or a slow sweep.
    for (const [key, def] of Object.entries(api.params || {})) {
      const raw = opts[key];
      const p = { min: def.min ?? 0, max: def.max ?? 1, value: def.value ?? 0, bind: null };
      if (raw === 'scroll' || raw === 'pointer' || raw === 'auto') p.bind = raw;
      else if (raw != null && raw !== '' && !Number.isNaN(+raw)) p.value = clamp(+raw, p.min, p.max);
      p.target = p.value; params[key] = p; api.set?.(key, p.value);
    }

    // Frame the model: measure it closed and fully exploded. The camera target and distance follow the explode value.
    const ex = params.explode, measureAt = (v) => {
      if (ex) api.set('explode', v);
      root.updateMatrixWorld(true);
      return new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere());
    };
    fitA = measureAt(ex ? ex.min : 0); fitB = ex ? measureAt(ex.max) : fitA;
    if (ex) api.set('explode', ex.value);
    if (view.center) { fitA.center.set(...view.center); fitB = fitA; }
    if (view.radius) fitA.radius = fitB.radius = view.radius;
    orbit.az = view.az; orbit.el = view.el;

    if ('labels' in el.dataset && api.labels) {
      labelBox = document.createElement('div'); labelBox.className = 'model-labels'; labelBox.setAttribute('aria-hidden', 'true');
      labels = api.labels.map((l) => {
        const s = document.createElement('span'); s.className = 'model-label'; s.textContent = l.text; labelBox.append(s);
        return { ...l, node: s, v: new THREE.Vector3(), on: null, xy: '' };
      });
      el.append(labelBox);
    }

    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); goStatic(); });
    observers.push(new ResizeObserver(() => { if (measure() && !running) draw(0); }));
    observers[observers.length - 1].observe(el);
    wire(THREE);
    live = true; measure(); draw(0); sync();
    el.dispatchEvent(new CustomEvent('model:ready', { bubbles: true, detail: { model: name } }));
  }

  function measure() {
    const w = el.clientWidth, h = el.clientHeight;
    const want = Math.min(devicePixelRatio || 1, cap);
    if (!w || !h || (w === W && h === H && want === dpr)) return false;
    W = w; H = h; dpr = want;
    renderer.setPixelRatio(dpr); renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    return true;
  }

  // 0..1 as the element moves through the viewport. "in": 0 when its centre is low on screen, 1 just above the
  // middle. "out" (for heroes): 0 until the centre passes the middle, 1 as it leaves the top.
  function scrollProgress() {
    const r = el.getBoundingClientRect(), vh = innerHeight || 1, c = r.top + r.height / 2;
    return el.dataset.scroll === 'out' ? clamp((vh * 0.5 - c) / (vh * 0.45), 0, 1) : clamp((vh * 0.85 - c) / (vh * 0.45), 0, 1);
  }

  function step(dt) {
    // Parameters ease toward their targets.
    for (const key in params) {
      const p = params[key];
      if (p.bind === 'scroll') p.target = p.min + scrollProgress() * (p.max - p.min);
      else if (p.bind === 'auto') p.target = (p.min + p.max) / 2 + Math.sin(t * 0.55) * (p.max - p.min) * 0.42;
      else if (p.bind === 'pointer' && pointer.inside) p.target = p.min + clamp(pointer.x / (W || 1), 0, 1) * (p.max - p.min);
      const next = p.value + (p.target - p.value) * (1 - Math.exp(-dt * 9));
      if (Math.abs(next - p.value) > 1e-5) { p.value = Math.abs(p.target - next) < 1e-4 ? p.target : next; api.set?.(key, p.value); }
    }
    // Orbit: inertia after a drag or key press, a spring back inside the limits, then the idle sway.
    const o = orbit, lo = view.azRange == null ? -Infinity : view.az - view.azRange, hi = view.azRange == null ? Infinity : view.az + view.azRange;
    if (!o.drag) {
      o.az += o.vAz * dt; o.el += o.vEl * dt;
      const f = Math.exp(-dt * 3.2); o.vAz *= f; o.vEl *= f;
      const pull = 1 - Math.exp(-dt * 11);
      const cEl = clamp(o.el, view.elMin, view.elMax), cAz = clamp(o.az, lo, hi);
      if (cEl !== o.el) { o.el += (cEl - o.el) * pull; o.vEl *= 0.8; }
      if (cAz !== o.az) { o.az += (cAz - o.az) * pull; o.vAz *= 0.8; }
    }
    const idleWant = !o.drag && t - o.last > 1.4 ? 1 : 0;
    o.idle += (idleWant - o.idle) * (1 - Math.exp(-dt * (idleWant ? 1.6 : 8)));
    if (view.spin) o.az += view.spin * dt * o.idle;
    const az = (o.drag ? band(o.az, lo, hi) : o.az) + Math.sin(t * 0.45) * view.sway * o.idle;
    const elv = (o.drag ? band(o.el, view.elMin, view.elMax) : o.el) + Math.sin(t * 0.31) * view.sway * 0.25 * o.idle;
    const half = (FOV * Math.PI) / 360, fit = Math.min(half, Math.atan(Math.tan(half) * camera.aspect));
    const ek = params.explode ? (params.explode.value - params.explode.min) / (params.explode.max - params.explode.min || 1) : 0;
    radius = fitA.radius + (fitB.radius - fitA.radius) * ek;
    root.position.lerpVectors(fitA.center, fitB.center, ek).negate();
    const dist = (radius / Math.sin(fit)) * 1.04 / view.zoom;
    camera.position.set(dist * Math.cos(elv) * Math.sin(az), dist * Math.sin(elv), dist * Math.cos(elv) * Math.cos(az));
    camera.near = Math.max(1, dist - radius * 2.2); camera.far = dist + radius * 2.2; camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
    api.tick?.(t, dt);
  }

  const stat = { ms: 0, n: 0 };
  function draw(dt) {
    if (!live) return;
    const t0 = performance.now();
    step(dt);
    kit.U.uDot.value = 4.2 * dpr;
    renderer.render(scene, camera);
    for (const l of labels) {
      const part = l.part || root, ex = params.explode ? params.explode.value : 1;
      const vis = !l.when || (ex >= l.when[0] && ex <= l.when[1]);
      if (vis !== l.on) { l.on = vis; l.node.classList.toggle('on', vis); }
      if (!vis) continue;
      l.v.set(l.at[0], l.at[1], l.at[2]).applyMatrix4(part.matrixWorld).project(camera);
      const lx = Math.round((l.v.x * 0.5 + 0.5) * W), flip = lx > W - 150;
      if (flip !== l.flip) { l.flip = flip; l.node.classList.toggle('flip', flip); }
      const xy = `translate(${lx}px,${Math.round((-l.v.y * 0.5 + 0.5) * H)}px)`;
      if (xy !== l.xy) { l.xy = xy; l.node.style.transform = xy; }
    }
    if (!shown) { shown = true; el.classList.add('is-live'); }
    stat.ms += (performance.now() - t0 - stat.ms) * 0.1; stat.n++;
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.05, (now - (prev || now)) / 1000);
    prev = now; t += dt;
    try { draw(dt); } catch (err) { console.warn(err); return goStatic(); }
    // Lower the pixel ratio if frames stay slow.
    if (dt > 0.028) slow++; else if (slow > 0) slow--;
    if (slow > 50 && dpr > 1) { cap = Math.max(1, dpr - 0.5); slow = 0; measure(); }
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    const want = live && near && !document.hidden;
    if (want && !running) { running = true; prev = 0; raf = requestAnimationFrame(frame); }
    else if (!want && running) stop();
  }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  function wire(THREE) {
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
    const hit = (e) => {
      if (!api.pickables?.length) return null;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(api.pickables, false)[0] || null;
    };
    on(el, 'pointerdown', (e) => {
      if (e.button !== 0) return;
      orbit.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, touch: e.pointerType === 'touch', t: performance.now() };
      orbit.vAz = orbit.vEl = 0; orbit.last = t;
      el.setPointerCapture?.(e.pointerId); el.classList.add('is-dragging');
    });
    on(el, 'pointermove', (e) => {
      const r = el.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.inside = true;
      const d = orbit.drag;
      if (!d || d.id !== e.pointerId) { if (api.pickables?.length && e.pointerType === 'mouse') el.classList.toggle('can-pick', !!hit(e)); return; }
      const now = performance.now(), dts = Math.max(0.008, (now - d.t) / 1000);
      const dAz = -(e.clientX - d.x) * 0.0075, dEl = d.touch ? 0 : (e.clientY - d.y) * 0.006;
      orbit.az += dAz; orbit.el += dEl;
      orbit.vAz = orbit.vAz * 0.4 + (dAz / dts) * 0.6; orbit.vEl = orbit.vEl * 0.4 + (dEl / dts) * 0.6;
      d.x = e.clientX; d.y = e.clientY; d.t = now; orbit.last = t;
    });
    const end = (e) => {
      const d = orbit.drag;
      if (!d || d.id !== e.pointerId) return;
      orbit.drag = null; el.classList.remove('is-dragging'); orbit.last = t;
      const lo = view.azRange == null ? -Infinity : view.az - view.azRange, hi = view.azRange == null ? Infinity : view.az + view.azRange;
      orbit.az = band(orbit.az, lo, hi); orbit.el = band(orbit.el, view.elMin, view.elMax);
      if (performance.now() - d.t > 80) orbit.vAz = orbit.vEl = 0;
      orbit.vAz = clamp(orbit.vAz, -6, 6); orbit.vEl = clamp(orbit.vEl, -4, 4);
      if (e.type === 'pointerup' && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) {
        const h = hit(e);
        if (h && api.pick) changed(api.pick(h.object, h));
      }
    };
    on(el, 'pointerup', end); on(el, 'pointercancel', end);
    on(el, 'pointerleave', () => { pointer.inside = false; el.classList.remove('can-pick'); });
    on(el, 'keydown', (e) => {
      const k = e.key;
      if (k === 'ArrowLeft') orbit.vAz = -1.5; else if (k === 'ArrowRight') orbit.vAz = 1.5;
      else if (k === 'ArrowUp') orbit.vEl = 0.9; else if (k === 'ArrowDown') orbit.vEl = -0.9;
      else if (k === 'Home') { orbit.az = view.az; orbit.el = view.el; orbit.vAz = orbit.vEl = 0; }
      else if (k === 'Enter' || k === ' ') {
        if (api.action) changed(api.action());
        else if (params.explode && !params.explode.bind) params.explode.target = params.explode.target > 0.5 ? 0 : 1;
        else return;
      } else return;
      orbit.last = t; e.preventDefault();
    });
    on(el, 'model:set', (e) => { if (e.detail) handle.set(e.detail.name, e.detail.value); });
    on(document, 'visibilitychange', sync);
  }
  const changed = (detail) => { if (detail !== undefined) el.dispatchEvent(new CustomEvent('model:change', { bubbles: true, detail })); };

  // Load when within 300px of the viewport; draw only while within 60px of it.
  if ('IntersectionObserver' in window) {
    const loadIO = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting) || started) return;
      started = true; loadIO.disconnect(); start();
    }, { rootMargin: '300px 0px' });
    const runIO = new IntersectionObserver((es) => { near = es[es.length - 1].isIntersecting; sync(); }, { rootMargin: '60px 0px' });
    loadIO.observe(el); runIO.observe(el); observers.push(loadIO, runIO);
  } else { near = true; started = true; start(); }

  const handle = {
    el,
    // set('explode', 0.5): move a parameter to a value (it eases there). This also releases a scroll or pointer binding.
    set(key, value) { const p = params[key]; if (!p) return; p.bind = null; p.target = clamp(+value, p.min, p.max); },
    // bind('explode', 'scroll' | 'pointer' | 'auto' | null)
    bind(key, how) { if (params[key]) params[key].bind = how; },
    get(key) { return params[key]?.value; },
    get model() { return api; },
    // Rough cost of one frame on the main thread, for the test page.
    stats() { const i = renderer?.info.render; return { ms: +stat.ms.toFixed(2), frames: stat.n, calls: i?.calls, triangles: i?.triangles, dpr }; },
    dispose() {
      if (dead) return;
      dead = true; live = false; stop(); ac.abort();
      observers.forEach((o) => o.disconnect());
      if (root) {
        const seen = new Set();
        root.traverse((o) => {
          o.geometry?.dispose();
          for (const m of [].concat(o.material || [])) { if (seen.has(m)) continue; seen.add(m); m.map?.dispose(); m.dispose(); }
        });
        api.dispose?.();
      }
      if (renderer) { renderer.dispose(); renderer.forceContextLoss(); }
      canvas?.remove(); labelBox?.remove();
      el.classList.remove('is-live', 'is-dragging', 'can-pick');
      delete el.__stage;
    },
  };
  el.__stage = handle;
  return handle;
}

// Mount every .model-stage[data-model] under a root element. Safe to call again after adding markup.
export function mountAll(scope = document) {
  return [...scope.querySelectorAll('.model-stage[data-model]')].map((el) => mountModel(el));
}
