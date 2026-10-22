// Research tab: shared state. main.js, scene.js and polar.js all import this one module,
// so the 3D beam, the polar plot, the gain plot and the readouts agree on one steer angle.
//
// The story: a test signal moves around in front of a 4-element array at 5.8 GHz.
// In LOCK mode the beam follows it. Dragging the plot, the slider or (on desktop) the pointer
// over the intro switches to MANUAL for a few seconds, then it locks on again.

export const N = 4;      // elements
export const D = 0.5;    // spacing, in wavelengths
export const MAX = 60;   // steer limit, degrees
const RAD = Math.PI / 180;

// Array factor magnitude (0..1) toward angle th (radians from broadside) when steered to th0.
export function af(th, th0) {
  const psi = 2 * Math.PI * D * (Math.sin(th) - Math.sin(th0));
  const s = Math.sin(psi / 2);
  if (Math.abs(s) < 1e-6) return 1;
  return Math.abs(Math.sin((N * psi) / 2) / (N * s));
}

// Total gain in dB with a patch-like element pattern, floored at `floor`. Angles in degrees.
export function gainDb(deg, steerDeg, floor = -30) {
  const th = deg * RAD;
  const e = Math.pow(Math.max(Math.cos(th), 0), 0.8);
  const g = af(th, steerDeg * RAD) * e;
  return Math.max(floor, 20 * Math.log10(Math.max(g, 1e-6)));
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const state = {
  steer: 20,     // degrees, what the beam points at now
  target: 20,    // where it is heading
  source: 20,    // where the test signal is
  manualUntil: 0,
  reduced: false,
  scroll: 0,     // camera stop: 0 intro, 1 the gap after RF, 2 the gap after Parity
  px: 0, py: 0,  // pointer, -1..1
  get manual() { return this.reduced || performance.now() < this.manualUntil; },
};

const subs = new Set();
export function subscribe(cb) { subs.add(cb); return () => subs.delete(cb); }
let lastEmit = 0;
function emit(force) {
  const now = performance.now();
  if (!force && now - lastEmit < 90) return;
  lastEmit = now;
  subs.forEach((cb) => cb(state));
}

// Steer by hand. Holds MANUAL for `hold` ms.
export function setSteer(deg, hold = 6000) {
  state.target = clamp(Math.round(deg * 10) / 10, -MAX, MAX);
  state.manualUntil = performance.now() + hold;
  if (state.reduced) state.steer = state.target;
  emit(true);
}

export function setReduced(r) {
  state.reduced = r;
  if (r) state.steer = state.target;
  emit(true);
}

// Advance the simulation. Safe to call from several loops in one frame.
let last = 0, clock = 0;
export function tick(now = performance.now()) {
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  if (last && now - last < 4) return state;
  last = now;
  if (state.reduced) return state;
  clock += dt;
  state.source = 44 * Math.sin(clock * 0.31) + 9 * Math.sin(clock * 1.07 + 1.3);
  if (!state.manual) state.target = state.source;
  state.steer += (state.target - state.steer) * Math.min(1, dt * 3.2);
  emit(false);
  return state;
}

// The gain plot (an SVG, viewBox 0 0 400 210): angle -90..90 across, 0..-30 dB down.
export const PLOT = { x0: 44, x1: 388, y0: 16, y1: 180, floor: -30 };
export const plotX = (deg) => PLOT.x0 + ((deg + 90) / 180) * (PLOT.x1 - PLOT.x0);
export const plotY = (db) => PLOT.y0 + (-db / -PLOT.floor) * (PLOT.y1 - PLOT.y0);
export function gainPath(steerDeg) {
  let d = '';
  for (let a = -90; a <= 90; a += 1.5) {
    d += `${a === -90 ? 'M' : 'L'}${plotX(a).toFixed(1)} ${plotY(gainDb(a, steerDeg, PLOT.floor)).toFixed(1)}`;
  }
  return d;
}
