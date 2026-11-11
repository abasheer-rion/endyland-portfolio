// Research tab hero: the beam engraved in dots. A plain 2D canvas (no WebGL), run by shared/scene-loader.js.
// Stippling is the shading: where the beam is strong the dots are big and close, where it is weak they thin out
// and vanish, the way an engraver builds a gradient. The array sits low on the right edge of the page and the
// lobe turns to follow the test signal (state.js). On load the dots start as noise and resolve into the lobe.
// Decoration only: the numbers it shows are also in the hero text. Phones get fewer dots.
import { state, tick, gainDb } from './state.js';

const FOIL = '#D9AE4A', BRASS = '#B8872E', FAINT = 'rgba(184,135,46,.5)';
const RAD = Math.PI / 180;
// A small seeded random, so the engraving is the same on every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  const rand = rng(58);
  let W = 1, H = 1, dpr = 1, ox = 0, oy = 0, R = 1;
  let dots = [], gain = new Float32Array(181), gainFor = 999, age = 0;

  // Rebuild the dot field for a new size: a jittered grid, so the dots never clump or line up.
  function build() {
    dots = [];
    const cell = low ? 9 : 6.5;
    for (let y = 0; y < H + cell; y += cell) {
      for (let x = 0; x < W + cell; x += cell) {
        const px = x + (rand() - 0.5) * cell * 0.9, py = y + (rand() - 0.5) * cell * 0.9;
        const dx = px - ox, dy = oy - py;
        const rho = Math.hypot(dx, dy);
        if (rho > R || dy < 2) continue;
        const th = Math.atan2(dx, dy) / RAD;           // degrees from straight up
        if (th < -90 || th > 90) continue;
        // Keep the left of the page quiet so the title and text stay clean on the leather.
        const quiet = ss(0.3, 0.52, px / W);
        dots.push({ x: px, y: py, rho: rho / R, a: Math.round(th) + 90, u: rand(), q: quiet });
      }
    }
  }

  function table(steer) {
    for (let a = 0; a <= 180; a++) gain[a] = Math.pow(10, gainDb(a - 90, steer, -40) / 20);
    gainFor = steer;
  }

  function rings() {
    g.lineWidth = Math.max(1, dpr * 0.75);
    g.strokeStyle = FAINT;
    for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(ox, oy, R * k / 4, -Math.PI, 0); g.stroke(); }
    // A ruler along the rim, like the edge of an engraved dial: a tick every 5 degrees, longer at 15.
    for (let a = -90; a <= 90; a += 5) {
      const len = (a % 15 === 0 ? 14 : 7) * dpr;
      const x = Math.sin(a * RAD), y = Math.cos(a * RAD);
      g.beginPath(); g.moveTo(ox + x * R, oy - y * R); g.lineTo(ox + x * (R + len), oy - y * (R + len)); g.stroke();
    }
  }

  function draw(t) {
    g.clearRect(0, 0, canvas.width, canvas.height);
    const k = Math.min(1, age / 2.4);
    const p = 1 - Math.pow(1 - k, 3);            // ease-out: noise resolves into the lobe
    if (Math.abs(state.steer - gainFor) > 0.2 || age < 2.6) table(state.steer);
    rings();
    g.save(); g.scale(dpr, dpr);
    const small = [], mid = [], big = [];
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const lobe = Math.pow(gain[d.a], 0.9) * (1 - Math.pow(d.rho, 1.35) * 0.82);
      // Noise at the start (every dot has the same low chance), then the lobe takes over.
      const I = (0.07 + (lobe - 0.07) * p) * d.q;
      if (d.u > I) continue;
      (I < 0.2 ? small : I < 0.5 ? mid : big).push(d);
    }
    const put = (arr, r, fill, round) => {
      if (!arr.length) return;
      g.fillStyle = fill; g.beginPath();
      for (const d of arr) {
        if (round) { g.moveTo(d.x + r, d.y); g.arc(d.x, d.y, r, 0, Math.PI * 2); } else g.rect(d.x - r, d.y - r, r * 2, r * 2);
      }
      g.fill();
    };
    put(small, 0.55, BRASS, false);
    put(mid, 0.95, BRASS, true);
    put(big, 1.35, FOIL, true);
    g.restore();
    // The test signal: a ring on the rim and a small filled mark. No glow, just a ring that opens and fades.
    const bx = ox + Math.sin(state.source * RAD) * R, by = oy - Math.cos(state.source * RAD) * R;
    {
      g.fillStyle = FOIL; g.beginPath(); g.arc(bx, by, 4 * dpr, 0, Math.PI * 2); g.fill();
      const pk = (t * 0.7) % 1;
      g.strokeStyle = `rgba(217,174,74,${(1 - pk) * 0.8})`; g.lineWidth = dpr;
      g.beginPath(); g.arc(bx, by, (5 + pk * 20) * dpr, 0, Math.PI * 2); g.stroke();
    }
    // The array: four small plates on the base line.
    g.fillStyle = FOIL;
    for (let n = 0; n < 4; n++) g.fillRect(ox + (n - 1.5) * 12 * dpr - 4 * dpr, oy - 3 * dpr, 8 * dpr, 3 * dpr);
  }

  return {
    resize(w, h, d) {
      dpr = d; W = w; H = h;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      const phone = w < 760;
      // The array sits near the bottom right; the fan opens up and to the left. Dots are laid out in CSS pixels.
      ox = (phone ? w * 0.62 : w * 0.76) * d;
      oy = (phone ? h * 0.98 : h * 1.0) * d;
      R = (phone ? Math.min(w * 0.7, h * 0.7) : Math.min(w * 0.52, h * 1.02)) * d;
      // build() works in CSS pixels, so hand it the origin and radius in CSS pixels.
      const sox = ox, soy = oy, sR = R;
      ox /= d; oy /= d; R /= d;
      build();
      ox = sox; oy = soy; R = sR;
      // After build the dots are in CSS pixels; drawing scales by dpr, the rings and marker use device pixels.
      gainFor = 999;
    },
    frame(t, dt) {
      tick();
      age += dt;
      draw(t);
    },
    still() { age = 99; tick(); draw(0.2); },
  };
}
