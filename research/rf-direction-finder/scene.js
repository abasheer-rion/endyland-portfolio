// RF direction finder page: the background. A wireframe of the 4-element array's beam in 3D, drawn on a
// plain 2D canvas (no WebGL), turning slowly toward an amber beacon that wanders in front of it.
// Run by /shared/scene-loader.js with webgl: false. Decoration only (the canvas is aria-hidden).
// Phones get fewer lines and every other frame. Reduced motion gets one still frame, beam at 25 degrees.

const RAD = Math.PI / 180;
const N = 4, D = 0.5;

// Array factor along the array axis (x), times a patch-like element pattern toward broadside (z).
function gain(ux, uz, s0) {
  const psi = 2 * Math.PI * D * (ux - s0);
  const s = Math.sin(psi / 2);
  const af = Math.abs(s) < 1e-6 ? 1 : Math.abs(Math.sin((N * psi) / 2) / (N * s));
  return af * Math.pow(Math.max(uz, 0), 0.9);
}

export function start(ctx) {
  const { canvas, low } = ctx;
  const g = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, ox = 0, oy = 0, L = 1, phone = false;
  let steer = 25, src = 25, yaw = -0.5, px = 0, py = 0, tpx = 0, tpy = 0, skip = false, scrollK = 0;

  const thStep = low ? 6 : 4, phStep = low ? 20 : 12;
  const thetas = []; for (let a = -90; a <= 90; a += thStep) thetas.push(a);
  const phis = []; for (let a = -84; a <= 84; a += phStep) phis.push(a);

  // Project a point (x, y, z) in array space to the screen. Broadside (z) points up the screen,
  // the array axis (x) runs across, and elevation (y) is depth, so turning the view shows the lobe's width.
  function proj(x, y, z) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const X = x * cy + y * sy; let Z = -x * sy + y * cy;
    const tilt = 0.28 + py * 0.08, ct = Math.cos(tilt), st = Math.sin(tilt);
    const Y = z * ct - Z * st; Z = z * st + Z * ct;
    const f = 3.2 / (3.2 + Z);
    return [ox + X * L * f, oy - Y * L * f, f];
  }

  function point(thDeg, phDeg, s0) {
    const th = thDeg * RAD, ph = phDeg * RAD;
    const ux = Math.sin(th) * Math.cos(ph), uy = Math.sin(ph), uz = Math.cos(th) * Math.cos(ph);
    const r = gain(ux, uz, s0);
    return proj(ux * r, uy * r, uz * r);
  }

  function draw(t) {
    g.clearRect(0, 0, canvas.width, canvas.height);
    const s0 = Math.sin(steer * RAD);
    g.lineWidth = Math.max(1, 1.1 * dpr);
    // Parallels: one ring per elevation.
    for (const ph of phis) {
      g.beginPath();
      thetas.forEach((th, i) => { const [x, y] = point(th, ph, s0); i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.strokeStyle = `rgba(57,255,136,${ph === phis[(phis.length - 1) >> 1] ? 0.55 : 0.22})`;
      g.stroke();
    }
    // Meridians: one line per azimuth, every other sample.
    for (let i = 0; i < thetas.length; i += 2) {
      g.beginPath();
      phis.forEach((ph, j) => { const [x, y] = point(thetas[i], ph, s0); j ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.strokeStyle = 'rgba(57,255,136,.14)';
      g.stroke();
    }
    // The array: four patches on a ground plate.
    g.fillStyle = 'rgba(57,255,136,.5)';
    for (let k = 0; k < N; k++) {
      const [a, b] = proj((k - 1.5) * 0.09, 0, 0);
      g.fillRect(a - 3 * dpr, b - 3 * dpr, 6 * dpr, 6 * dpr);
    }
    // Steer line and the beacon.
    const [sx, sy] = proj(Math.sin(steer * RAD) * 1.25, 0, Math.cos(steer * RAD) * 1.25);
    const [o1, o2] = proj(0, 0, 0);
    g.setLineDash([6 * dpr, 6 * dpr]); g.strokeStyle = 'rgba(255,176,0,.55)';
    g.beginPath(); g.moveTo(o1, o2); g.lineTo(sx, sy); g.stroke(); g.setLineDash([]);
    const [bx, by] = proj(Math.sin(src * RAD) * 1.08, 0.04, Math.cos(src * RAD) * 1.08);
    g.fillStyle = '#FFB000';
    g.beginPath(); g.arc(bx, by, 4 * dpr, 0, Math.PI * 2); g.fill();
    const k = (t * 0.7) % 1;
    g.strokeStyle = `rgba(255,176,0,${(1 - k) * 0.7})`;
    g.beginPath(); g.arc(bx, by, (5 + k * 26) * dpr, 0, Math.PI * 2); g.stroke();
  }

  const onMove = (e) => { tpx = (e.clientX / innerWidth) * 2 - 1; tpy = (e.clientY / innerHeight) * 2 - 1; };
  const onScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollK = scrollY / max;
  };
  if (!low) addEventListener('pointermove', onMove, { passive: true });
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return {
    resize(w, h, d) {
      W = w; H = h; dpr = d;
      canvas.width = Math.max(1, Math.round(w * d));
      canvas.height = Math.max(1, Math.round(h * d));
      phone = w < 760;
      // Desktop: the lobe sits low on the right, behind the hero image. Phones: low in the middle, smaller.
      ox = canvas.width * (phone ? 0.5 : 0.78);
      oy = canvas.height * (phone ? 0.97 : 0.99);
      L = Math.min(canvas.width, canvas.height) * (phone ? 0.62 : 0.95);
    },
    frame(t, dt) {
      if (low) { skip = !skip; if (skip) return; dt *= 2; }
      src = 38 * Math.sin(t * 0.21) + 9 * Math.sin(t * 0.83 + 1.1);
      steer += (src - steer) * Math.min(1, dt * 1.6);
      px += (tpx - px) * Math.min(1, dt * 3); py += (tpy - py) * Math.min(1, dt * 3);
      yaw = 0.5 + Math.sin(t * 0.12) * 0.25 + px * 0.3 - scrollK * 1.0;
      draw(t);
    },
    still() { steer = 25; src = 25; yaw = 0.5 - scrollK * 1.0; draw(0.25); },
    dispose() {
      removeEventListener('pointermove', onMove);
      removeEventListener('scroll', onScroll);
    },
  };
}
