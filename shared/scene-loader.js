// Lazy 3D loader, shared by every page.
//
//   import { mountScene } from '../shared/scene-loader.js';
//   mountScene({ canvas: document.getElementById('scene'), load: () => import('./scene.js') });
//
// What it does for you:
// - Waits until the page has painted and the browser is idle, then loads your scene module.
// - Checks for WebGL 2 first. Without it, or if anything fails, it adds class "no-webgl" to <html>
//   and the page shows its CSS fallback instead.
// - Runs one animation loop and stops it when the tab is hidden, the canvas is off screen,
//   or the visitor prefers reduced motion. With reduced motion it draws one still frame.
// - Tells your scene its size and pixel ratio, and lowers the pixel ratio if frames run slow.
// - Adds class "on" to the canvas after the first frame, so CSS can fade it in.
//
// Your scene module exports start(ctx), which returns (or resolves to) an object:
//   ctx   = { canvas, low, dpr, reduced, onReducedChange(cb) }
//           low: phone or slow machine, so build a lighter scene. dpr: starting pixel ratio.
//   scene = {
//     resize(width, height, dpr)  required. Called first, then on every size or pixel ratio change.
//     frame(t, dt)                required. Draw one frame. t and dt are in seconds. t stops while paused.
//     still()                     optional. Draw one calm frame for reduced motion. Defaults to frame(0, 0).
//     dispose()                   optional. Free GPU resources.
//   }
//
// Several canvases on one page are fine: call mountScene once per canvas.
// For a plain 2D canvas, pass webgl: false.

import { prefersReducedMotion, onReducedMotionChange, isLowPower } from './motion.js';

export function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

// Runs fn after the load event, when the browser is idle. Text and layout paint first.
export function afterFirstPaint(fn, timeout = 1500) {
  const go = () => (window.requestIdleCallback ? requestIdleCallback(() => fn(), { timeout }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') go();
  else addEventListener('load', go, { once: true });
}

export function mountScene({
  canvas,
  load,
  webgl = true,
  dprCap = 1.5,        // highest pixel ratio on desktops
  lowDprCap = 1,       // highest pixel ratio on phones and slow machines
  minDpr = 0.75,       // never drop below this when frames are slow
  rootMargin = '120px', // start drawing a little before the canvas scrolls into view
  fallbackClass = 'no-webgl',
} = {}) {
  return new Promise((resolve) => {
    const fail = () => { document.documentElement.classList.add(fallbackClass); resolve(null); };
    if (!canvas) return resolve(null);
    afterFirstPaint(async () => {
      if (webgl && !hasWebGL2()) return fail();
      const low = isLowPower();
      const cap = low ? lowDprCap : dprCap;
      let dpr = Math.min(devicePixelRatio || 1, cap);
      const reducedSubs = new Set();
      const ctx = {
        canvas, low, dpr,
        get reduced() { return prefersReducedMotion(); },
        onReducedChange(cb) { reducedSubs.add(cb); return () => reducedSubs.delete(cb); },
      };
      let scene;
      try {
        const mod = await load();
        scene = await mod.start(ctx);
        if (!scene || typeof scene.frame !== 'function' || typeof scene.resize !== 'function') throw new Error('scene must return { frame, resize }');
      } catch (err) {
        console.warn('3D scene did not start:', err);
        return fail();
      }

      let W = 0, H = 0, running = false, paused = false, onScreen = true, raf = 0, prev = 0, t = 0;
      let slow = 0, fast = 0, shown = false, lost = false;
      const still = () => {
        if (lost) return;
        try { (scene.still || (() => scene.frame(t, 0)))(); } catch (e) { console.warn(e); }
        show();
      };
      const show = () => { if (!shown) { shown = true; canvas.classList.add('on'); } };
      const measure = () => {
        const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
        if (w === W && h === H) return false;
        W = w; H = h; scene.resize(W, H, dpr);
        return true;
      };
      const frame = (now) => {
        raf = 0;
        if (!running) return;
        const dt = Math.min(0.1, (now - (prev || now)) / 1000);
        prev = now; t += dt;
        try { scene.frame(t, dt); } catch (e) { console.warn(e); running = false; return; }
        show();
        // Drop the pixel ratio when frames run slow for a while. Raise it back with headroom.
        if (dt > 0.028) { slow++; fast = 0; } else if (dt > 0 && dt < 0.014) { fast++; slow = 0; }
        if (slow > 45 && dpr > minDpr) { dpr = Math.max(minDpr, dpr - 0.25); scene.resize(W, H, dpr); slow = 0; }
        if (fast > 240 && dpr < Math.min(devicePixelRatio || 1, cap)) { dpr = Math.min(cap, dpr + 0.25); scene.resize(W, H, dpr); fast = 0; }
        raf = requestAnimationFrame(frame);
      };
      const sync = () => {
        const reduced = prefersReducedMotion();
        const want = !lost && !paused && !reduced && !document.hidden && onScreen;
        if (want && !running) { running = true; prev = 0; raf = requestAnimationFrame(frame); }
        if (!want && running) { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
        if (reduced && !lost) still();
      };

      measure();
      new ResizeObserver(() => { if (measure() && !running) still(); }).observe(canvas);
      document.addEventListener('visibilitychange', sync);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((e) => { onScreen = e[e.length - 1].isIntersecting; sync(); }, { rootMargin }).observe(canvas);
      }
      onReducedMotionChange((r) => { reducedSubs.forEach((cb) => cb(r)); sync(); });
      if (webgl) {
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault(); lost = true; sync(); document.documentElement.classList.add(fallbackClass);
        });
      }
      sync();
      resolve({
        pause() { paused = true; sync(); },
        resume() { paused = false; sync(); },
        get running() { return running; },
        scene,
      });
    });
  });
}
