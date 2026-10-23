// endyland.com beam sketch. A plain 2D canvas, started by main.js through mountScene (webgl: false).
// One row of the home page array: 6 elements half a wavelength apart. The plot above them is the real
// array factor, |sum of e^(j n (pi sin(theta) - phase))| / 6, so the main lobe and side lobes are true to the math.
// The beam steers toward the pointer (or a finger), and drifts slowly side to side when left alone.
// Reduced motion: one still frame with the beam steered 20 degrees.

const INK = '#1B1B1F', CORAL = '#FF5A4E', SUN = '#FFC93C', BLUE = '#2D5BFF', MINT = '#2EC4B6';
const N = 6;

function af(theta, steer) {
  const psi = Math.PI * (Math.sin(theta) - Math.sin(steer));
  let re = 0, im = 0;
  for (let n = 0; n < N; n++) { re += Math.cos(n * psi); im += Math.sin(n * psi); }
  return Math.hypot(re, im) / N;
}

export function start(ctx) {
  const { canvas } = ctx;
  const g = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, steer = 0, target = 0, ptrAt = -10, now = 0;
  const maxSteer = (60 * Math.PI) / 180;

  const aim = (e) => {
    const r = canvas.getBoundingClientRect();
    const cx = r.width / 2, cy = r.height * 0.86;
    const ang = Math.atan2(e.clientX - r.left - cx, cy - (e.clientY - r.top));
    target = Math.max(-maxSteer, Math.min(maxSteer, ang));
    ptrAt = now;
  };
  canvas.addEventListener('pointermove', aim);
  canvas.addEventListener('pointerdown', aim);

  function draw(t) {
    g.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.86, R = Math.min(W * 0.44, H * 0.74);
    g.lineJoin = 'round'; g.lineCap = 'round';
    // Polar grid: half rings and spokes every 30 degrees.
    g.strokeStyle = 'rgba(27,27,31,.18)'; g.lineWidth = 1.5;
    for (const k of [0.25, 0.5, 0.75, 1]) { g.beginPath(); g.arc(cx, cy, R * k, Math.PI, 2 * Math.PI); g.stroke(); }
    for (let d = -90; d <= 90; d += 30) {
      const a = (d * Math.PI) / 180;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * R, cy - Math.cos(a) * R); g.stroke();
    }
    // Wavefronts leaving the array, tilted by the steering angle.
    const phase = (t * 0.9) % 1;
    for (let i = 0; i < 4; i++) {
      const k = (i + phase) / 4;
      g.strokeStyle = `rgba(45,91,255,${0.35 * (1 - k)})`; g.lineWidth = 3;
      const d = k * R, w = R * 0.6;
      const ux = Math.sin(steer), uy = -Math.cos(steer);
      const px = cx + ux * d, py = cy + uy * d;
      g.beginPath(); g.moveTo(px - uy * w, py + ux * w); g.lineTo(px + uy * w, py - ux * w); g.stroke();
    }
    // The pattern, in a hard-shadowed Memphis lobe.
    const path = () => {
      g.beginPath();
      for (let i = 0; i <= 180; i++) {
        const th = -Math.PI / 2 + (i / 180) * Math.PI;
        const r = R * af(th, steer);
        const x = cx + Math.sin(th) * r, y = cy - Math.cos(th) * r;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
    };
    g.save(); g.translate(6, 6); path(); g.fillStyle = INK; g.fill(); g.restore();
    path(); g.fillStyle = CORAL; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    // A sun marker at the beam peak.
    const px = cx + Math.sin(steer) * R, py = cy - Math.cos(steer) * R;
    g.beginPath(); g.arc(px, py, 11, 0, Math.PI * 2); g.fillStyle = SUN; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    // The six elements. Each pulses a little later than its neighbor, which is what steers the beam.
    const span = Math.min(W * 0.62, 340), gap = span / (N - 1), base = cy + 14;
    g.fillStyle = INK; g.fillRect(cx - span / 2 - 16, base + 10, span + 32, 6);
    for (let n = 0; n < N; n++) {
      const x = cx - span / 2 + n * gap;
      const ph = n * Math.PI * Math.sin(steer);
      const s = 1 + 0.18 * Math.sin(t * 6 - ph);
      const c = [CORAL, SUN, BLUE, MINT, SUN, CORAL][n];
      g.save(); g.translate(x, base); g.scale(s, s);
      g.fillStyle = c; g.strokeStyle = INK; g.lineWidth = 3;
      if (n % 2) { g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill(); g.stroke(); }
      else { g.fillRect(-9, -9, 18, 18); g.strokeRect(-9, -9, 18, 18); }
      g.restore();
    }
    // Steering readout.
    g.fillStyle = INK; g.font = '800 15px Archivo, ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText(`${Math.round((steer * 180) / Math.PI)}°`, 14, 12);
  }

  return {
    resize(w, h, r) {
      W = w; H = h; dpr = r;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    frame(t, dt) {
      now = t;
      if (t - ptrAt > 2.5) target = Math.sin(t * 0.45) * 0.75;
      steer += (target - steer) * Math.min(1, dt * 6);
      draw(t);
    },
    still() { steer = (20 * Math.PI) / 180; draw(0); },
  };
}
