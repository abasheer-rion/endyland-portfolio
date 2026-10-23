// Detail Theory paint panel. Plain WebGL 2 (no three.js), started by main.js through mountScene.
// One full-screen triangle and a fragment shader: a curved body panel in chameleon paint (purple, blue and
// bronze, like the wrapped Audi in the client's photos), metal flakes that sparkle when they catch the light,
// and a clear-coat highlight that sweeps across. The light follows the pointer on a mouse or trackpad.
// Phones render at a lower resolution. Reduced motion: one still frame.

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform vec2 res; uniform float t; uniform vec2 light; uniform float flakes;
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
// Height of the body panel: long soft swells, like a fender and a door crease.
float h(vec2 q){
  return 0.42 * sin(q.x * 1.5 + 0.6) * cos(q.y * 1.2 - 0.4)
       + 0.20 * sin(q.x * 2.6 - q.y * 1.9 + 1.3)
       + 0.08 * smoothstep(0.08, 0.0, abs(q.y - 0.25 * sin(q.x * 1.2) + 0.15));
}
void main(){
  vec2 q = (uv - 0.5) * vec2(res.x / res.y, 1.0) * 2.0;
  vec2 e = vec2(0.004, 0.0);
  vec3 n = normalize(vec3(-(h(q + e.xy) - h(q - e.xy)) / (2.0 * e.x), -(h(q + e.yx) - h(q - e.yx)) / (2.0 * e.x), 1.0));
  vec3 v = vec3(0.0, 0.0, 1.0);
  vec3 l = normalize(vec3(light, 0.9));
  float ndl = max(dot(n, l), 0.0);
  float ndv = max(dot(n, v), 0.0);
  // Chameleon: the color flips with the viewing angle.
  vec3 purple = vec3(0.30, 0.10, 0.52), blue = vec3(0.08, 0.16, 0.62), bronze = vec3(0.62, 0.32, 0.12);
  float a = clamp((1.0 - ndv) * 3.2 + 0.12 * q.x, 0.0, 1.0);
  vec3 base = mix(mix(blue, purple, smoothstep(0.0, 0.5, a)), bronze, smoothstep(0.45, 1.0, a + 0.15 * sin(q.y * 2.0 + t * 0.2)));
  vec3 col = base * (0.08 + 0.85 * ndl * ndl);
  // Flakes: tiny cells with their own tilt. They sparkle when tilted toward the light.
  vec2 cell = floor(gl_FragCoord.xy / flakes);
  float r = hash(cell);
  vec3 fn = normalize(n + 0.35 * vec3(hash(cell + 1.7) - 0.5, hash(cell + 3.1) - 0.5, 0.0));
  float sp = pow(max(dot(reflect(-l, fn), v), 0.0), 60.0) * step(0.82, r);
  col += sp * mix(vec3(1.0, 0.85, 0.5), vec3(0.8, 0.8, 1.0), r) * 0.7;
  // Clear coat: one sharp highlight, plus a soft sheen along the edges.
  float rv = max(dot(reflect(-l, n), v), 0.0);
  col += vec3(1.0, 0.97, 0.9) * (pow(rv, 160.0) * 1.6 + pow(rv, 12.0) * 0.18);
  col += vec3(0.95, 0.8, 0.4) * pow(1.0 - ndv, 3.0) * 0.25;
  // A slow gold reflection band, like a shop light passing over.
  float band = exp(-pow((q.x + q.y * 0.4 - 2.6 * sin(t * 0.25)) * 3.0 + h(q) * 8.0, 2.0));
  col += vec3(0.98, 0.81, 0.16) * band * 0.18;
  o = vec4(pow(col, vec3(0.9)), 1.0);
}`;

export function start(ctx) {
  const { canvas, low } = ctx;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('no webgl2');
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = { res: gl.getUniformLocation(prog, 'res'), t: gl.getUniformLocation(prog, 't'), light: gl.getUniformLocation(prog, 'light'), flakes: gl.getUniformLocation(prog, 'flakes') };

  // Phones draw fewer pixels: the paint is soft, so it still looks right.
  const scale = low ? 0.6 : 1;
  let W = 1, H = 1, dpr = 1;
  const lx = { cur: 0.4, to: 0.4 }, ly = { cur: 0.5, to: 0.5 };
  let pointerAt = -10, now = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    lx.to = ((e.clientX - r.left) / r.width - 0.5) * 2.2;
    ly.to = -((e.clientY - r.top) / r.height - 0.5) * 2.2;
    pointerAt = now;
  };
  if (fine) addEventListener('pointermove', onMove, { passive: true });

  const draw = (t) => {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(U.res, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(U.t, t);
    gl.uniform2f(U.light, lx.cur, ly.cur);
    gl.uniform1f(U.flakes, Math.max(1, 2 * dpr * scale));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  return {
    resize(w, h, r) {
      W = w; H = h; dpr = r;
      canvas.width = Math.max(1, Math.round(W * dpr * scale));
      canvas.height = Math.max(1, Math.round(H * dpr * scale));
    },
    frame(t, dt) {
      now = t;
      // With no pointer for a while, the light drifts on its own in a slow figure eight.
      if (t - pointerAt > 3) { lx.to = 0.9 * Math.sin(t * 0.35); ly.to = 0.45 * Math.sin(t * 0.7) + 0.2; }
      const k = Math.min(1, dt * 3);
      lx.cur += (lx.to - lx.cur) * k; ly.cur += (ly.to - ly.cur) * k;
      draw(t);
    },
    still() { lx.cur = 0.45; ly.cur = 0.35; draw(2.0); },
    dispose() { removeEventListener('pointermove', onMove); gl.deleteBuffer(buf); gl.deleteProgram(prog); },
  };
}
