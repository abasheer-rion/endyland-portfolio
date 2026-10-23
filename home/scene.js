// The home page scene: the hub. One 3D scene, four stops. The camera flies a fixed path as you scroll.
// Stop 0: a 6 by 6 phased array and its beam, which steers toward the pointer.
// Stop 1: five rooms, one node in the sky per tab. The beam swings to the one you hover.
// Stop 2: about, a tunnel of rings with pipes and packets.
// Stop 3: contact, a beacon sending ripples across the floor.
// shared/scene-loader.js runs the loop, pauses it off screen and handles reduced motion.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, ColorManagement, Vector2, Vector3, Matrix4, Object3D,
  Group, Mesh, Points, LineSegments, InstancedMesh, BufferGeometry, BufferAttribute, InstancedBufferAttribute,
  SphereGeometry, BoxGeometry, ConeGeometry, TorusGeometry, TubeGeometry, CircleGeometry, IcosahedronGeometry,
  CylinderGeometry, Curve, CatmullRomCurve3, ShaderMaterial, AdditiveBlending, DoubleSide,
} from '../shared/vendor/three-r186.module.min.js';

ColorManagement.enabled = false; // colors below are plain sRGB hex values, written straight out

const BG = new Color('#07090F');
const SIGNAL = new Color('#4B2BFF');
const LOBE = new Color('#FF5A36');
const FOAM = new Color('#C9D0DA');
const N = 6; // array size, N by N

export async function start(ctx) {
  const { canvas, low } = ctx;
  const reduceQ = { get matches() { return ctx.reduced; } };
  const Q = low
    ? { sphere: [120, 60], waves: 700, dust: 260, pitch: 1.5, aa: false }
    : { sphere: [180, 90], waves: 1800, dust: 900, pitch: 1.0, aa: true };

  const renderer = new WebGLRenderer({ canvas, antialias: Q.aa, alpha: false, powerPreference: 'high-performance' });
  let dpr = ctx.dpr;
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(BG, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(36, 1, 0.1, 120);

  // Shared uniforms. Every material reads time, fog and the steer direction from here.
  const U = {
    uTime: { value: 0 },
    uSteer: { value: new Vector2(0.25, 0.15) },
    uGrow: { value: reduceQ.matches ? 1 : 0 },
    uNodes: { value: 0 },
    uBg: { value: BG },
    uFog: { value: 0.05 },
    uPR: { value: dpr },
    uLP: { value: [new Vector3(0, 0.6, 1.4), new Vector3(10, 2.5, -8), new Vector3(-14, 0.5, -18), new Vector3(0, 0.5, -30)] },
    uLC: { value: [new Color('#5A3BFF'), new Color('#6E8BFF'), new Color('#7A4DFF'), new Color('#FF6A3D')] },
  };

  const FOG = /* glsl */`
    uniform vec3 uBg; uniform float uFog;
    vec3 fogMix(vec3 c, float depth){ float f = 1.0 - exp(-depth * depth * uFog * uFog); return mix(c, uBg, clamp(f, 0.0, 1.0)); }
    float fogKeep(float depth){ return exp(-depth * depth * uFog * uFog); }`;
  const LIGHT = /* glsl */`
    uniform vec3 uLP[4]; uniform vec3 uLC[4];
    vec3 lit(vec3 base, vec3 p, vec3 n){
      vec3 c = base * 0.3;
      for (int i = 0; i < 4; i++){
        vec3 l = uLP[i] - p; float d2 = dot(l, l);
        float k = max(dot(n, normalize(l)), 0.0) * 0.5 + 0.12;
        c += uLC[i] * k * 4.2 / (1.0 + d2 * 0.9);
      }
      return c;
    }`;
  const FACET = /* glsl */`vec3 facetN(vec3 w){ return normalize(cross(dFdx(w), dFdy(w))); }`;

  let stage = scene; // where add() puts things; later stops build into their own group first
  const add = (o, parent = stage) => { parent.add(o); return o; };
  const staged = [];
  const mat = (o) => new ShaderMaterial({ uniforms: U, ...o });

  // ---------- Stop 0: the array and its beam ----------
  const hero = add(new Group());

  // Beam: a unit sphere pushed out by the array factor on the GPU, so steering costs nothing on the CPU.
  const beamVS = /* glsl */`
    uniform vec2 uSteer; uniform float uGrow;
    varying float vT; varying vec3 vW; varying float vDepth;
    const float PI = 3.14159265;
    float af(float x){ float p = PI * x * 0.5; float s = sin(p); if (abs(s) < 1e-4) return 1.0; return abs(sin(6.0 * p) / (6.0 * s)); }
    void main(){
      vec3 d = position;
      float elem = d.z > 0.0 ? pow(d.z, 0.7) : 0.0;
      float g = af(d.x - uSteer.x) * af(d.y - uSteer.y) * elem;
      float db = max(20.0 * log(g + 1e-6) / log(10.0), -32.0);
      float t = (db + 32.0) / 32.0;
      float r = 0.06 + 1.85 * t;
      float rr = 0.55 + (r - 0.55) * uGrow;
      vT = t;
      vec4 w = modelMatrix * vec4(d * rr, 1.0); vW = w.xyz;
      vec4 mv = viewMatrix * w; vDepth = -mv.z;
      gl_Position = projectionMatrix * mv;
    }`;
  const beamGeo = new SphereGeometry(1, Q.sphere[0], Q.sphere[1]);
  const beam = add(new Mesh(beamGeo, mat({
    vertexShader: beamVS,
    fragmentShader: /* glsl */`
      uniform float uTime; varying float vT; varying vec3 vW; varying float vDepth;
      ${FOG} ${FACET}
      vec3 ramp(float t){
        vec3 a = vec3(0.10, 0.12, 0.25), b = vec3(${SIGNAL.r}, ${SIGNAL.g}, ${SIGNAL.b});
        vec3 c = vec3(${LOBE.r}, ${LOBE.g}, ${LOBE.b}), d = vec3(1.0, 0.86, 0.72);
        if (t < 0.5) return mix(a, b, t / 0.5);
        if (t < 0.86) return mix(b, c, (t - 0.5) / 0.36);
        return mix(c, d, (t - 0.86) / 0.14);
      }
      void main(){
        vec3 n = facetN(vW);
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - abs(dot(n, v)), 2.2);
        float r = length(vW);
        float band = smoothstep(0.86, 1.0, fract(r * 1.4 - uTime * 0.7)) * smoothstep(0.25, 0.8, vT);
        vec3 c = ramp(vT) * (0.55 + 0.9 * fres) + band * vec3(1.0, 0.75, 0.55) * 0.7;
        float a = (0.16 + 0.7 * fres + 0.5 * band) * (0.3 + 0.7 * vT);
        gl_FragColor = vec4(c, a * fogKeep(vDepth));
      }`,
    transparent: true, blending: AdditiveBlending, depthWrite: false, side: DoubleSide,
  })), hero);
  add(new Mesh(beamGeo, mat({
    vertexShader: beamVS,
    fragmentShader: /* glsl */`varying float vT; varying float vDepth; ${FOG}
      void main(){ gl_FragColor = vec4(vec3(${FOAM.r}, ${FOAM.g}, ${FOAM.b}), (0.035 + 0.06 * vT) * fogKeep(vDepth)); }`,
    wireframe: true, transparent: true, blending: AdditiveBlending, depthWrite: false,
  })), hero);
  beam.renderOrder = 2;
  hero.children.forEach((o) => { if (o.geometry === beamGeo) o.frustumCulled = false; });

  // The array: 36 elements. Each one pulses with its own phase, the same phase that steers the beam.
  {
    const el = new InstancedMesh(new BoxGeometry(0.075, 0.075, 0.02), mat({
      vertexShader: /* glsl */`
        attribute vec2 aIJ; uniform vec2 uSteer; uniform float uTime; varying float vB;
        void main(){
          float ph = -3.14159265 * (aIJ.x * uSteer.x + aIJ.y * uSteer.y);
          vB = 0.5 + 0.5 * cos(uTime * 4.0 + ph);
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`varying float vB;
        void main(){ vec3 c = mix(vec3(${SIGNAL.r}, ${SIGNAL.g}, ${SIGNAL.b}), vec3(1.0, 0.55, 0.4), vB * vB); gl_FragColor = vec4(c * (0.45 + 0.9 * vB), 1.0); }`,
    }), N * N);
    const ij = new Float32Array(N * N * 2), m = new Matrix4();
    for (let i = 0, k = 0; i < N; i++) for (let j = 0; j < N; j++, k++) {
      m.makeTranslation((i - (N - 1) / 2) * 0.11, (j - (N - 1) / 2) * 0.11, 0);
      el.setMatrixAt(k, m); ij[k * 2] = i; ij[k * 2 + 1] = j;
    }
    el.geometry.setAttribute('aIJ', new InstancedBufferAttribute(ij, 2));
    add(el, hero);
    const plate = new Mesh(new BoxGeometry(0.78, 0.78, 0.035), solid('#141a2c'));
    plate.position.z = -0.03;
    add(plate, hero);
    const mast = new Mesh(new CylinderGeometry(0.03, 0.05, 1.8, 10), solid('#1a2135'));
    mast.position.set(0, -1.25, -0.05);
    add(mast, hero);
  }

  // Wavefront particles leave the array along the beam.
  {
    const g = new BufferGeometry(), n = Q.waves;
    const seed = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) seed[i] = Math.random();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 3));
    const p = add(new Points(g, mat({
      vertexShader: /* glsl */`
        attribute vec3 aSeed; uniform vec2 uSteer; uniform float uTime; uniform float uPR; uniform float uGrow;
        varying float vA; varying float vG;
        void main(){
          vec2 j = (aSeed.xy - 0.5) * 0.34;
          vec2 uv = uSteer + j; float q = dot(uv, uv); if (q > 0.96) uv *= 0.98 / sqrt(q);
          vec3 dir = vec3(uv, sqrt(max(0.0, 1.0 - dot(uv, uv))));
          float life = fract(uTime * 0.16 + aSeed.z);
          vec4 mv = modelViewMatrix * vec4(dir * (0.2 + life * 8.0), 1.0);
          vG = exp(-dot(j, j) * 45.0);
          vA = (1.0 - life) * smoothstep(0.0, 0.06, life) * (0.25 + 0.75 * vG) * uGrow;
          gl_PointSize = uPR * (14.0 + 26.0 * vG) / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`varying float vA; varying float vG;
        void main(){ float d = length(gl_PointCoord - 0.5); float s = smoothstep(0.5, 0.0, d);
          vec3 c = mix(vec3(0.5, 0.42, 1.0), vec3(1.0, 0.6, 0.45), vG);
          gl_FragColor = vec4(c, s * s * vA); }`,
      transparent: true, blending: AdditiveBlending, depthWrite: false,
    })), hero);
    p.frustumCulled = false;
  }

  // ---------- The chamber floor: anechoic foam pyramids, lit by each stop ----------
  {
    const pitch = Q.pitch, list = [];
    for (let x = -26; x <= 22; x += pitch) for (let z = -42; z <= 10; z += pitch) {
      if (Math.hypot(x, z + 30) < 9.4) continue;                           // contact disc
      list.push([x + (Math.random() - 0.5) * 0.04, z]);
    }
    const h = 0.72 * pitch;
    const geo = new ConeGeometry(0.47 * pitch, h, 4, 1);
    geo.rotateY(Math.PI / 4); geo.translate(0, h / 2, 0);
    const foam = new InstancedMesh(geo, solid('#0a0d18', true), list.length);
    const m = new Matrix4();
    list.forEach(([x, z], i) => { m.makeTranslation(x, -2.2, z); foam.setMatrixAt(i, m); });
    add(foam);
  }

  // ---------- Stop 1: five rooms, nodes in the sky where the beam can point ----------
  const nodes = [];
  staged.push(() => {
    const R = 4.4;
    const items = [...document.querySelectorAll('[data-steer]')];
    const ico = new IcosahedronGeometry(0.17, 0);
    const lines = [];
    items.forEach((el, i) => {
      const [u, v] = el.dataset.steer.split(',').map(Number);
      const w = Math.sqrt(Math.max(0, 1 - u * u - v * v));
      const pos = new Vector3(u, v, w).multiplyScalar(R);
      const g = add(new Group()); g.position.copy(pos);
      const core = add(new Mesh(ico, mat({
        uniforms: { ...U, uOn: { value: 0 } },
        vertexShader: /* glsl */`varying vec3 vW; varying float vDepth; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */`uniform float uOn; varying vec3 vW; varying float vDepth; ${FOG} ${FACET}
          void main(){ vec3 n = facetN(vW); float k = 0.5 + 0.5 * dot(n, normalize(vec3(0.3, 0.8, 0.5)));
            vec3 c = mix(vec3(0.55, 0.5, 1.0), vec3(1.0, 0.5, 0.33), uOn) * (0.45 + 0.8 * k);
            gl_FragColor = vec4(fogMix(c, vDepth), 1.0); }`,
      })), g);
      const halo = add(new Mesh(new TorusGeometry(0.34, 0.008, 6, 48), mat({
        uniforms: { ...U, uOn: { value: 0 } },
        vertexShader: /* glsl */`varying float vDepth; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: /* glsl */`uniform float uOn; varying float vDepth; ${FOG}
          void main(){ gl_FragColor = vec4(mix(vec3(0.5, 0.45, 1.0), vec3(1.0, 0.55, 0.4), uOn), (0.35 + 0.65 * uOn) * fogKeep(vDepth)); }`,
        transparent: true, blending: AdditiveBlending, depthWrite: false,
      })), g);
      lines.push(0, 0, 0, pos.x, pos.y, pos.z);
      g.scale.setScalar(0.001);
      nodes.push({ g, core, halo, on: 0, spin: Math.random() * 6 });
    });
    const lg = new BufferGeometry();
    lg.setAttribute('position', new BufferAttribute(new Float32Array(lines), 3));
    add(new LineSegments(lg, mat({
      vertexShader: /* glsl */`varying float vD; varying float vDepth; void main(){ vD = length(position); vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uTime; uniform float uNodes; varying float vD; varying float vDepth; ${FOG}
        void main(){ float dash = step(0.5, fract(vD * 3.0 - uTime * 0.8)); gl_FragColor = vec4(0.45, 0.42, 1.0, (0.05 + 0.18 * dash) * fogKeep(vDepth) * uNodes * step(vD, 4.4 * uNodes)); }`,
      transparent: true, blending: AdditiveBlending, depthWrite: false,
    })));
  });

  // ---------- Stop 2: about, the tunnel ----------
  const TUN = { x: -14, y: 0.5, z0: -9, len: 19 };
  staged.push(() => {
    const rings = 26;
    const tor = new InstancedMesh(new TorusGeometry(1.95, 0.022, 6, 72), mat({
      vertexShader: /* glsl */`uniform float uTime; varying float vB; varying float vDepth;
        void main(){ vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          vB = 0.25 + 0.75 * smoothstep(0.82, 1.0, fract(-w.z * 0.09 - uTime * 0.25));
          vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`varying float vB; varying float vDepth; ${FOG}
        void main(){ gl_FragColor = vec4(mix(vec3(0.35, 0.3, 1.0), vec3(1.0, 0.5, 0.35), vB * vB) * vB, fogKeep(vDepth)); }`,
      transparent: true, blending: AdditiveBlending, depthWrite: false,
    }), rings);
    const o = new Object3D();
    for (let i = 0; i < rings; i++) {
      o.position.set(TUN.x, TUN.y, TUN.z0 - (i / (rings - 1)) * TUN.len);
      o.rotation.set(0, 0, i * 0.21); o.updateMatrix();
      tor.setMatrixAt(i, o.matrix);
    }
    add(tor);

    // Pipes: helices along the tunnel wall. Packets ride them, placed on the GPU.
    class Helix extends Curve {
      constructor(a) { super(); this.a = a; }
      getPoint(t, out = new Vector3()) {
        const s = t * TUN.len, ang = this.a + s * 0.33;
        return out.set(TUN.x + 1.4 * Math.cos(ang), TUN.y + 1.4 * Math.sin(ang), TUN.z0 - s);
      }
    }
    const pipes = 5;
    const pipeMat = solid('#232b45', false, 0.5);
    for (let i = 0; i < pipes; i++) add(new Mesh(new TubeGeometry(new Helix(i * Math.PI * 2 / pipes), low ? 90 : 160, 0.045, 6), pipeMat));
    const n = low ? 60 : 140, seed = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { seed[i * 2] = Math.floor(Math.random() * pipes) * Math.PI * 2 / pipes; seed[i * 2 + 1] = Math.random(); }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 2));
    const pk = add(new Points(g, mat({
      vertexShader: /* glsl */`attribute vec2 aSeed; uniform float uTime; uniform float uPR; varying float vDepth;
        void main(){ float s = fract(aSeed.y + uTime * 0.05) * ${TUN.len.toFixed(1)}; float a = aSeed.x + s * 0.33;
          vec3 p = vec3(${TUN.x.toFixed(1)} + 1.4 * cos(a), ${TUN.y.toFixed(1)} + 1.4 * sin(a), ${TUN.z0.toFixed(1)} - s);
          vec4 mv = viewMatrix * vec4(p, 1.0); vDepth = -mv.z; gl_PointSize = uPR * 70.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`varying float vDepth; ${FOG}
        void main(){ float d = length(gl_PointCoord - 0.5); float s = smoothstep(0.5, 0.05, d);
          gl_FragColor = vec4(1.0, 0.6, 0.42, s * fogKeep(vDepth)); }`,
      transparent: true, blending: AdditiveBlending, depthWrite: false,
    })));
    pk.frustumCulled = false;
  });

  // ---------- Stop 3: contact, the beacon ----------
  staged.push(() => {
    const disc = new Mesh(new CircleGeometry(9.2, 120), mat({
      vertexShader: /* glsl */`varying vec2 vP; varying float vDepth; void main(){ vP = position.xy; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`uniform float uTime; varying vec2 vP; varying float vDepth; ${FOG}
        void main(){ float r = length(vP);
          float ring = smoothstep(0.93, 1.0, fract(r * 0.55 - uTime * 0.35));
          float fade = smoothstep(9.2, 2.0, r);
          vec2 g = abs(fract(vP * 1.0) - 0.5); float grid = smoothstep(0.48, 0.5, max(g.x, g.y)) * 0.08;
          vec3 c = vec3(0.04, 0.05, 0.09) + ring * fade * vec3(1.0, 0.45, 0.28) + grid * vec3(0.4, 0.4, 1.0) * fade;
          gl_FragColor = vec4(fogMix(c, vDepth), 1.0); }`,
    }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, -2.15, -30);
    add(disc);
    const beacon = new Mesh(new CylinderGeometry(0.035, 0.035, 7, 8, 1, true), mat({
      vertexShader: /* glsl */`varying float vY; void main(){ vY = position.y / 7.0 + 0.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`uniform float uTime; varying float vY;
        void main(){ float p = smoothstep(0.9, 1.0, fract(vY * 2.0 - uTime * 0.6)); gl_FragColor = vec4(vec3(1.0, 0.55, 0.38), (0.25 + 0.75 * p) * (1.0 - vY)); }`,
      transparent: true, blending: AdditiveBlending, depthWrite: false,
    }));
    beacon.position.set(0, 1.3, -30);
    add(beacon);
    const orb = new Mesh(new IcosahedronGeometry(0.22, 1), solid('#FF7A55'));
    orb.position.set(0, -1.6, -30);
    add(orb);
  });

  // ---------- Dust, for depth while the camera moves ----------
  staged.push(() => {
    const n = Q.dust, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -24 + Math.random() * 46; pos[i * 3 + 1] = -1.8 + Math.random() * 9; pos[i * 3 + 2] = -40 + Math.random() * 50;
    }
    const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(pos, 3));
    const d = add(new Points(g, mat({
      vertexShader: /* glsl */`uniform float uTime; uniform float uPR; varying float vDepth;
        void main(){ vec3 p = position; p.y += sin(uTime * 0.2 + p.x * 0.7) * 0.25; p.x += cos(uTime * 0.15 + p.z) * 0.2;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vDepth = -mv.z; gl_PointSize = uPR * 18.0 / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`varying float vDepth; ${FOG}
        void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(0.7, 0.72, 1.0, smoothstep(0.5, 0.0, d) * 0.5 * fogKeep(vDepth)); }`,
      transparent: true, blending: AdditiveBlending, depthWrite: false,
    })));
    d.frustumCulled = false;
  });

  // A plain lit, faceted material for solid things.
  function solid(hex, isFoam = false, gloss = 0) {
    const c = new Color(hex);
    return mat({
      vertexShader: /* glsl */`varying vec3 vW; varying float vDepth;
        void main(){
          #ifdef USE_INSTANCING
            vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
          #else
            vec4 w = modelMatrix * vec4(position, 1.0);
          #endif
          vW = w.xyz; vec4 mv = viewMatrix * w; vDepth = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`varying vec3 vW; varying float vDepth; ${FOG} ${LIGHT} ${FACET}
        void main(){
          vec3 n = facetN(vW);
          vec3 c = lit(vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)}), vW, n);
          ${isFoam ? 'c *= 0.7 + 0.6 * smoothstep(-2.2, -1.5, vW.y);' : ''}
          ${gloss ? `c += ${gloss.toFixed(2)} * pow(max(dot(reflect(-normalize(cameraPosition - vW), n), vec3(0.0, 1.0, 0.0)), 0.0), 8.0) * vec3(0.3, 0.3, 0.6);` : ''}
          gl_FragColor = vec4(fogMix(c, vDepth), 1.0);
        }`,
    });
  }

  // ---------- Camera path ----------
  // Points marked with a stop number are where the camera rests. The rest shape the flight between them.
  const KEYS = [
    // [position, look at, stop]
    [[-4.3, 1.3, 4.7], [0, 0.05, 0.7], 0],
    [[-7.4, 2.6, 2.2], [0.6, 0.2, 1.4]],
    [[-6.9, 3.4, -4.4], [2.4, -0.9, 1.6], 1],
    [[-12, 2, -4.5], [-14, 0.5, -14]],
    [[-14, 0.55, -6.6], [-14, 0.5, -20], 2],
    [[-14, 0.5, -24], [-14, 0.5, -34]],
    [[-12.5, 1.6, -31.5], [-4, -1.4, -31]],
    [[4.6, 4.9, -22.6], [0, -1.6, -30.4], 3],
  ];
  const posCurve = new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k[0])), false, 'centripetal');
  const tgtCurve = new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k[1])), false, 'centripetal');
  const stopIdx = KEYS.map((k, i) => (k[2] !== undefined ? i : -1)).filter((i) => i >= 0);
  const last = KEYS.length - 1;

  // Scroll position to path position. Each stop holds while its section fills the screen.
  const stopEls = [...document.querySelectorAll('[data-stop]')].sort((a, b) => a.dataset.stop - b.dataset.stop);
  let holds = [];
  function measure() {
    const vh = innerHeight, sy = scrollY, max = document.documentElement.scrollHeight - vh;
    holds = stopEls.map((el, k) => {
      if (k === 0) return [0, 0];
      const r = el.getBoundingClientRect(), top = r.top + sy, h = r.height;
      const a = Math.min(max, top - Math.max(0, vh - h) / 2);
      return [a, Math.min(max, a + Math.max(0, h - vh))];
    });
    for (let k = 1; k < holds.length; k++) if (holds[k][0] < holds[k - 1][1] + 1) holds[k][0] = holds[k - 1][1] + 1;
  }
  const ease = (x) => x * x * (3 - 2 * x);
  function pathAt(sy) {
    for (let k = 0; k < holds.length; k++) {
      const [a, b] = holds[k];
      if (sy <= b || k === holds.length - 1) {
        if (sy >= a || k === 0) return stopIdx[k];
        const pa = holds[k - 1][1], f = ease(Math.min(1, Math.max(0, (sy - pa) / (a - pa))));
        return stopIdx[k - 1] + (stopIdx[k] - stopIdx[k - 1]) * f;
      }
    }
    return stopIdx[stopIdx.length - 1];
  }

  // ---------- Sizing ----------
  // The loader calls resize(width, height, dpr) first and on every change.
  let W = 1, H = 1, portrait = false;
  function resize(w, h, d) {
    W = w; H = h; portrait = W / H < 0.9;
    if (d !== dpr) { dpr = d; renderer.setPixelRatio(dpr); U.uPR.value = dpr; }
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = portrait ? 52 : 36;
    const wide = W > 900;
    // Push the scene right on wide screens (text sits left), and up on phones (text sits low).
    camera.setViewOffset(W, H, wide ? -W * 0.18 : -W * 0.08, wide ? 0 : H * 0.14, W, H);
    camera.updateProjectionMatrix();
    measure();
  }
  new ResizeObserver(() => measure()).observe(document.body);

  // ---------- Input ----------
  // Pointer times use the scene clock (seconds), so they pause with the loop.
  const target = new Vector2(0.25, 0.15), steer = U.uSteer.value, pointer = new Vector2();
  let clock = 0, lastMove = -1e9, active = -1;
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    target.set((e.clientX / W - 0.5) * 1.5, -(e.clientY / H - 0.5) * 1.3);
    pointer.set(e.clientX / W - 0.5, e.clientY / H - 0.5);
    lastMove = clock;
    if (reduceQ.matches) { steer.copy(target); renderStill(); }
  }, { passive: true });
  // Hovering or focusing a room steers the beam to it. Same order as the nodes.
  document.querySelectorAll('[data-steer]').forEach((el, i) => {
    const [u, v] = el.dataset.steer.split(',').map(Number);
    const go = () => {
      target.set(u, v); active = i; lastMove = clock + 4;
      if (reduceQ.matches) { steer.copy(target); renderStill(); }
    };
    const stop = () => { if (active === i) active = -1; };
    el.addEventListener('pointerenter', go); el.addEventListener('focusin', go);
    el.addEventListener('pointerleave', stop); el.addEventListener('focusout', stop);
  });

  // ---------- Frames ----------
  const camPos = new Vector3(), camTgt = new Vector3(), tmp = new Vector3();
  const intro = new Vector3(-10, 4.2, 12.5);
  let pathCur = 0;

  function place(idx, introK) {
    const t = idx / last;
    posCurve.getPoint(t, camPos); tgtCurve.getPoint(t, camTgt);
    if (portrait) camPos.sub(camTgt).multiplyScalar(1.3).add(camTgt);
    if (introK < 1) camPos.lerp(intro, 1 - introK);
    tmp.set(pointer.x * 0.6, -pointer.y * 0.4, 0);
    camera.position.copy(camPos).add(tmp);
    camera.lookAt(camTgt);
  }

  function frame(t, dt) {
    clock = t;
    U.uTime.value = t;
    if (t - lastMove > 3.5) target.set(0.45 * Math.sin(t * 0.35), 0.25 * Math.sin(t * 0.23 + 1));
    const k = 1 - Math.exp(-dt * 4.5);
    steer.x += (target.x - steer.x) * k; steer.y += (target.y - steer.y) * k;
    U.uGrow.value = 1 - Math.pow(1 - Math.min(1, t / 1.8), 3);
    pathCur += (pathAt(scrollY) - pathCur) * (1 - Math.exp(-dt * 3.2));
    const introK = 1 - Math.pow(1 - Math.min(1, t / 2.6), 3);
    place(pathCur, introK);

    // Room nodes only appear near the rooms stop.
    const vis = ease(Math.min(1, Math.max(0, 1 - Math.abs(pathCur - stopIdx[1]) / 1.6)));
    U.uNodes.value = vis;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.g.visible = vis > 0.01;
      n.on += ((i === active ? 1 : 0) - n.on) * (1 - Math.exp(-dt * 8));
      n.core.material.uniforms.uOn.value = n.on; n.halo.material.uniforms.uOn.value = n.on;
      n.g.scale.setScalar(Math.max(0.001, vis * (1 + n.on * 0.7)));
      n.halo.rotation.set(t * 0.7 + n.spin, t * 0.5, 0);
      n.core.rotation.y = t * 0.4 + n.spin;
    }
    renderer.render(scene, camera);
  }

  // Reduced motion: one still picture of the array.
  function renderStill() {
    if (!reduceQ.matches) return;
    U.uGrow.value = 1; U.uTime.value = 2.0; pointer.set(0, 0);
    place(stopIdx[0], 1);
    renderer.render(scene, camera);
  }

  pathCur = pathAt(scrollY);
  place(stopIdx[0], 0);

  // Build in steps so no single task blocks the page for long. The array and floor come first,
  // the other stops follow one at a time when the browser is idle. Shaders compile off the main
  // path (compileAsync) before anything is shown.
  const idle = (f) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 600 }) : setTimeout(f, 30));
  const compile = (obj) => (renderer.compileAsync ? renderer.compileAsync(obj, camera, scene).catch(() => {}) : Promise.resolve());
  const next = () => {
    const build = staged.shift();
    if (!build) return;
    idle(() => {
      stage = new Group();
      build();
      const g = stage;
      stage = scene;
      compile(g).then(() => { scene.add(g); renderStill(); next(); });
    });
  };
  await compile(scene);
  // Dust first, it shows at every stop. Then the stops in scroll order.
  staged.unshift(staged.pop());
  next();

  return {
    resize,
    frame,
    still() { steer.set(0.25, 0.15); U.uGrow.value = 1; U.uTime.value = 2.0; pointer.set(0, 0); place(stopIdx[0], 1); renderer.render(scene, camera); },
    dispose() { renderer.dispose(); },
  };
}
