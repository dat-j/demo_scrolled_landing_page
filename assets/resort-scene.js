import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ *
 * Địa hình: một vịnh hình cánh cung, đất liền ở phía -z, biển ở phía +z.
 * coastZ(x) là đường bờ (giải tích) — shader nước dùng lại đúng công thức này
 * để vẽ bọt sóng và độ sâu, nên đừng thêm noise vào dải bãi cát (d < 14).
 * ------------------------------------------------------------------ */
const coastZ = (x) => -40 + 0.0035 * x * x + 6 * Math.sin(x * 0.05) + 3 * Math.sin(x * 0.13 + 1.0);
const WATERLINE = 3.08; // mặt nước y=0 cắt bãi cát tại d = 0.4/0.13

function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { v += a * vnoise(x * f, y * f); f *= 2.03; a *= 0.5; } return v; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
let seed = 7;
const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function groundHeight(x, z) {
  // vùng biên: địa hình chìm dần xuống biển để không lộ mép cắt
  const edge = Math.max(smooth(360, 445, Math.abs(x)), smooth(-290, -365, z), smooth(380, 445, z));
  const h = rawHeight(x, z);
  return edge > 0 ? lerp(h, -16, edge) : h;
}
function rawHeight(x, z) {
  const d = coastZ(x) - z;
  if (d < 0) {
    const n = (fbm(x * 0.02, z * 0.02) - 0.5) * 5 * smooth(0, 30, -d);
    return Math.max(-18, -0.4 + d * 0.16) + n;
  }
  if (d < 14) return -0.4 + d * 0.13;
  const t = d - 14;
  const n = fbm(x * 0.008 + 3.1, z * 0.008 - 1.7);
  const n2 = fbm(x * 0.03, z * 0.03);
  return 1.42 + t * 0.12 + 78 * smooth(10, 170, t) * (0.35 + 0.9 * n) + (n2 - 0.5) * 4 * smooth(0, 20, t);
}
const onShore = (x, dFromCoast) => coastZ(x) - dFromCoast; // z của điểm cách bờ dFromCoast vào đất liền

/* ------------------------------ Shaders ------------------------------ */
const WATER_VS = /* glsl */`
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const WATER_FS = /* glsl */`
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uShallow, uDeep, uSky, uSunDir, uSunColor, uFoam;
  uniform float uSpec;
  varying vec3 vWorld;
  float coastZ(float x) { return -40.0 + 0.0035 * x * x + 6.0 * sin(x * 0.05) + 3.0 * sin(x * 0.13 + 1.0); }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  vec3 waveNormal(vec2 p, float t) {
    vec2 g = vec2(0.0);
    vec2 dirs[4]; dirs[0] = vec2(0.8, 0.6); dirs[1] = vec2(-0.6, 0.8); dirs[2] = vec2(0.2, -1.0); dirs[3] = vec2(-0.9, -0.3);
    float fr[4]; fr[0] = 0.09; fr[1] = 0.15; fr[2] = 0.27; fr[3] = 0.45;
    for (int i = 0; i < 4; i++) {
      float ph = dot(dirs[i], p) * fr[i] + t * (1.0 + float(i) * 0.6);
      g += dirs[i] * cos(ph) * (0.18 / (1.0 + float(i)));
    }
    g += (vec2(noise(p * 0.6 + t * 0.4), noise(p * 0.6 - t * 0.35 + 7.0)) - 0.5) * 0.1;
    return normalize(vec3(-g.x, 1.0, -g.y));
  }
  void main() {
    float d = vWorld.z - coastZ(vWorld.x) + ${WATERLINE.toFixed(2)}; // khoảng cách ra khơi tính từ mép nước
    vec3 n = waveNormal(vWorld.xz, uTime);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 base = mix(uShallow, uDeep, smoothstep(2.0, 110.0, d));
    float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    vec3 col = mix(base, uSky, fres * 0.55);
    vec3 H = normalize(uSunDir + V);
    col += uSunColor * pow(max(dot(n, H), 0.0), 1600.0) * uSpec * 4.0; // lấp lánh nhỏ, sắc
    float lap = sin(uTime * 1.2 + vWorld.x * 0.07) * 0.9;
    float shore = 1.0 - smoothstep(0.0, 3.5, d + lap);
    float fn = noise(vWorld.xz * 0.45 + vec2(uTime * 0.25, -uTime * 0.2));
    float foam = shore * smoothstep(0.25, 0.65, fn + shore * 0.35);
    col = mix(col, uFoam, foam * 0.9);
    float alpha = mix(0.28, 0.94, smoothstep(0.0, 22.0, d));
    gl_FragColor = vec4(col, max(alpha, foam));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;
const SKY_VS = /* glsl */`
  varying vec3 vDir;
  void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = /* glsl */`
  uniform vec3 uTop, uHorizon, uSunDir, uSunColor; uniform float uGlow;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 col = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.65, h), 0.75));
    float s = max(dot(normalize(vDir), uSunDir), 0.0);
    col += uSunColor * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.35 * uGlow);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/* ------------------------------ Presets ------------------------------ */
const PRESETS = {
  day: {
    top: '#3f8fd0', horizon: '#cfe6ee', fog: '#cfe2e8', sun: '#fff1d6', sunI: 2.8, sunDir: [0.72, 0.62, 0.22],
    hemiSky: '#d6ecff', hemiGround: '#6d5b3e', hemiI: 0.95, shallow: '#58d6c8', deep: '#0b5d80', foam: '#ffffff',
    spec: 0.9, glow: 0.6, windows: 0.0, pools: 0.12, stars: 0, exposure: 1.0,
  },
  sunset: {
    top: '#30407a', horizon: '#f6a45e', fog: '#e9ad84', sun: '#ffae6e', sunI: 2.6, sunDir: [-0.8, 0.3, -0.15],
    hemiSky: '#ffc9a3', hemiGround: '#5a4640', hemiI: 0.95, shallow: '#4fb2b0', deep: '#173f66', foam: '#ffe6d2',
    spec: 2.4, glow: 1.6, windows: 0.9, pools: 0.35, stars: 0.05, exposure: 1.02,
  },
  night: {
    top: '#040a1c', horizon: '#1c2d55', fog: '#122042', sun: '#a9bfff', sunI: 0.9, sunDir: [0.3, 0.6, 0.5],
    hemiSky: '#5a72b8', hemiGround: '#141a28', hemiI: 0.75, shallow: '#0f4c5c', deep: '#041b2c', foam: '#a9c3d6',
    spec: 0.9, glow: 0.2, windows: 2.6, pools: 1.6, stars: 1, exposure: 1.3,
  },
};

/* ------------------------------ Scene ------------------------------ */
export class ResortScene {
  constructor(canvas, places) {
    this.canvas = canvas;
    this.places = places;
    this.active = false;
    this.progress = 0; // 0 = trên mây, 1 = toàn cảnh
    this.drift = 0.5;
    this.drag = { theta: 0, phi: 0, tTheta: 0, tPhi: 0 };
    this.focus = { blend: 0, pose: null };
    this.zoom = { v: 1, t: 1 };
    this.shift = { x: 0, y: 0 }; // dịch khung hình (px) để công trình không bị panel che
    this.anchors = {};
    this.clickables = [];
    this.hoverId = null;
    this.onFrame = null;
    this.clock = new THREE.Clock();

    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#cfe2e8', 400, 1600);
    this.camera = new THREE.PerspectiveCamera(40, 1, 1, 6000);

    this.mats = this.makeMaterials();
    this.buildLights();
    this.buildSky();
    this.buildTerrain();
    this.buildWater();
    this.buildIslets();
    this.buildResort();
    this.buildVegetation();
    this.buildBoats();
    this.buildClouds();

    this.tod = {};
    this.applyPreset(PRESETS.day, PRESETS.day, 1);
    this.todName = 'day';

    this.raycaster = new THREE.Raycaster();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
    this.resize();
    this.loop = this.loop.bind(this);
  }

  /* ---------- materials ---------- */
  makeMaterials() {
    const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
    return {
      wall: std('#f2ebdf', { roughness: 0.92 }),
      wood: std('#8a5a3b'),
      darkWood: std('#5a3a27'),
      thatch: std('#93653b', { flatShading: true, roughness: 1 }),
      tile: std('#97462c', { flatShading: true }),
      stone: std('#d3c9b6'),
      white: std('#fbfaf6'),
      pool: new THREE.MeshStandardMaterial({ color: '#4ccbe0', emissive: '#2bc5e6', emissiveIntensity: 0.12, roughness: 0.08, metalness: 0.1 }),
      glass: new THREE.MeshStandardMaterial({ color: '#2a3940', emissive: '#ffb25e', emissiveIntensity: 0, roughness: 0.2, metalness: 0.4 }),
      veg: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }),
      rock: new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
      boat: std('#f7f3ea', { roughness: 0.5 }),
    };
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#d6ecff', '#6d5b3e', 0.95);
    this.sun = new THREE.DirectionalLight('#fff1d6', 2.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = -300; c.right = 300; c.top = 300; c.bottom = -300; c.near = 10; c.far = 1400;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.5;
    this.sunTarget = new THREE.Object3D();
    this.sunTarget.position.set(20, 0, 20);
    this.sun.target = this.sunTarget;
    this.scene.add(this.hemi, this.sun, this.sunTarget);
  }

  buildSky() {
    this.skyU = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color() }, uGlow: { value: 1 },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(4000, 32, 16),
      new THREE.ShaderMaterial({ uniforms: this.skyU, vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false })
    );
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    // sao (chỉ hiện ban đêm)
    const n = 1500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rand() * Math.PI * 2, v = Math.acos(lerp(0.04, 1, rand()));
      pos.set([Math.sin(v) * Math.cos(u) * 3600, Math.cos(v) * 3600, Math.sin(v) * Math.sin(u) * 3600], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starsMat = new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(g, this.starsMat);
    this.scene.add(this.stars);
  }

  buildTerrain() {
    const W = 900, D = 820, SX = 260, SZ = 236;
    const geo = new THREE.PlaneGeometry(W, D, SX, SZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, 40);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, groundHeight(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const nrm = geo.attributes.normal;
    const col = new Float32Array(p.count * 3);
    const C = (h) => new THREE.Color(h);
    const sandDeep = C('#2f8f95'), sandMid = C('#8fd3c2'), sandWet = C('#d8c79d'), sand = C('#efe1c0'),
      grass = C('#86a24e'), forest = C('#3f6b33'), forest2 = C('#2f5229'), rock = C('#8b826f');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), h = p.getY(i);
      const d = coastZ(x) - z;
      if (d < WATERLINE || h < 0.1) {
        const t = d < WATERLINE ? smooth(WATERLINE, -60, d) : smooth(0.1, -12, h);
        c.copy(sandWet).lerp(sandMid, smooth(0, 0.35, t)).lerp(sandDeep, smooth(0.35, 1, t));
      } else if (d < 15.5) {
        c.copy(sandWet).lerp(sand, smooth(WATERLINE, 6, d));
      } else {
        const n = fbm(x * 0.05, z * 0.05);
        c.copy(sand).lerp(grass, smooth(15.5, 20, d)).lerp(forest, smooth(18, 45, d) * (0.6 + 0.4 * n));
        c.lerp(forest2, smooth(30, 80, h) * 0.7);
        c.lerp(rock, smooth(0.82, 0.62, nrm.getY(i)) * 0.85);
      }
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }));
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  buildWater() {
    this.waterU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uShallow: { value: new THREE.Color() }, uDeep: { value: new THREE.Color() },
      uSky: { value: new THREE.Color() }, uSunDir: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Color() },
      uFoam: { value: new THREE.Color('#fff') }, uSpec: { value: 1.5 },
    }]);
    const geo = new THREE.PlaneGeometry(6000, 6000, 1, 1);
    geo.rotateX(-Math.PI / 2);
    this.water = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.waterU, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false, fog: true,
    }));
    this.water.renderOrder = 1;
    this.scene.add(this.water);
  }

  // Đảo đá vôi kiểu vịnh Hạ Long / Nha Trang
  buildIslets() {
    const spots = [[-150, 215, 18, 46], [-70, 330, 26, 64], [170, 300, 20, 52], [265, 205, 14, 34], [-300, 360, 34, 80],
      [380, 520, 50, 110], [-40, 620, 60, 120], [-480, 640, 70, 130], [520, 300, 30, 70], [120, 760, 55, 90]];
    const parts = [];
    for (const [x, z, r, h] of spots) {
      const g = new THREE.CylinderGeometry(r * 0.72, r, h, 11, 8);
      const p = g.attributes.position;
      const col = new Float32Array(p.count * 3);
      const k = rand() * 100;
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
        const ang = Math.atan2(vz, vx), yt = (vy + h / 2) / h;
        const bulge = 1 + 0.22 * Math.sin(ang * 3 + k) + 0.15 * Math.sin(yt * 7 + ang * 2 + k) - 0.18 * Math.sin(yt * Math.PI) ;
        p.setXYZ(i, vx * bulge, vy + (yt > 0.99 ? (vnoise(vx * 0.2 + k, vz * 0.2) - 0.3) * h * 0.35 : 0), vz * bulge);
        const green = smooth(0.55, 0.95, yt + 0.15 * vnoise(ang * 3 + k, yt * 4));
        const c = new THREE.Color('#9b9384').lerp(new THREE.Color('#4f7a3a'), green).lerp(new THREE.Color('#5d5649'), (1 - yt) * 0.35);
        col.set([c.r, c.g, c.b], i * 3);
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.translate(x, h / 2 - 6, z);
      parts.push(g.toNonIndexed());
    }
    const merged = mergeGeometries(parts);
    merged.computeVertexNormals();
    const m = new THREE.Mesh(merged, this.mats.rock);
    m.castShadow = m.receiveShadow = true;
    this.scene.add(m);
  }

  /* ---------- building helpers ---------- */
  box(w, h, d, mat, x, y, z, parent) {
    const m = new THREE.Mesh(this.BOX, mat);
    m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m); return m;
  }
  roof(w, d, h, mat, x, y, z, parent) {
    const m = new THREE.Mesh(this.ROOF, mat);
    m.scale.set(w, h, d); m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m); return m;
  }
  post(x, y0, y1, z, r, mat, parent) {
    const m = new THREE.Mesh(this.CYL, mat);
    m.scale.set(r, y1 - y0, r); m.position.set(x, (y0 + y1) / 2, z);
    m.castShadow = true; parent.add(m); return m;
  }
  house(parent, { w, d, h, roofH, x = 0, y = 0, z = 0, roofMat = this.mats.thatch, wallMat = this.mats.wall }) {
    this.box(w, h, d, wallMat, x, y + h / 2, z, parent);
    this.box(w * 0.72, h * 0.62, 0.15, this.mats.glass, x, y + h * 0.45, z + d / 2 + 0.05, parent);
    this.box(0.15, h * 0.5, d * 0.5, this.mats.glass, x + w / 2 + 0.05, y + h * 0.45, z, parent);
    this.roof(w * 1.4, d * 1.4, roofH, roofMat, x, y + h, z, parent);
  }
  lounger(parent, x, y, z) { this.box(0.9, 0.35, 2.2, this.mats.white, x, y + 0.2, z, parent); }

  makeGroup(placeId, x, z, y = groundHeight(x, z), rotY = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = rotY;
    g.userData.placeId = placeId;
    this.scene.add(g); this.clickables.push(g);
    return g;
  }

  buildResort() {
    this.BOX = new THREE.BoxGeometry(1, 1, 1);
    this.ROOF = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
    this.ROOF.rotateY(Math.PI / 4); this.ROOF.translate(0, 0.5, 0);
    this.CYL = new THREE.CylinderGeometry(1, 1, 1, 6);
    this.lanterns = [];
    const M = this.mats;

    /* 01 — Overwater: cầu gỗ cong ra vịnh + 6 villa */
    const jetty = new THREE.Group(); jetty.userData.placeId = 'overwater';
    this.scene.add(jetty); this.clickables.push(jetty);
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(96, 1.4, coastZ(96) - 6), new THREE.Vector3(100, 1.4, 25),
      new THREE.Vector3(118, 1.4, 70), new THREE.Vector3(126, 1.4, 118),
    ]);
    const segs = 40;
    for (let i = 0; i < segs; i++) {
      const a = path.getPoint(i / segs), b = path.getPoint((i + 1) / segs);
      const mid = a.clone().add(b).multiplyScalar(0.5), len = a.distanceTo(b);
      const s = this.box(3, 0.35, len + 0.2, M.wood, mid.x, 1.4, mid.z, jetty);
      s.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      if (i % 3 === 0) { this.post(mid.x - 1.4, -16, 1.4, mid.z, 0.18, M.darkWood, jetty); this.post(mid.x + 1.4, -16, 1.4, mid.z, 0.18, M.darkWood, jetty); }
      if (i % 4 === 2) this.lanterns.push(new THREE.Vector3(mid.x + 1.6, 2.6, mid.z));
    }
    const owSpots = [0.38, 0.5, 0.62, 0.74, 0.86, 1.0];
    owSpots.forEach((t, i) => {
      const p = path.getPoint(t), tan = path.getTangent(t);
      const side = t === 1.0 ? 0 : (i % 2 ? 1 : -1);
      const nx = tan.z, nz = -tan.x; // pháp tuyến ngang
      const off = side === 0 ? 10 : 13;
      const cx = side === 0 ? p.x + tan.x * off : p.x + nx * off * side;
      const cz = side === 0 ? p.z + tan.z * off : p.z + nz * off * side;
      const v = this.makeGroup('overwater', cx, cz, 0, Math.atan2(cx - p.x, cz - p.z));
      this.box(15, 0.6, 13, M.wood, 0, 1.6, 0, v);
      for (const [px, pz] of [[-7, -6], [7, -6], [-7, 6], [7, 6], [0, -6], [0, 6]]) this.post(px, -16, 1.6, pz, 0.28, M.darkWood, v);
      this.house(v, { w: 8.5, d: 7, h: 3.6, roofH: 4.6, y: 1.9, z: -2 });
      this.box(5.5, 0.3, 3.4, M.pool, 2.5, 2.0, 4.4, v);
      this.lounger(v, -4, 1.9, 4.5);
      this.box(2.2, 0.3, off - 6.5 + 0.4, M.wood, 0, 1.5, -(6.5 + off - 1.5) / 2, v); // cầu nối ra cầu chính
      if (i === 3) this.anchors.overwater = new THREE.Vector3(cx, 13, cz);
    });

    /* 02 — Beach pool villa: 6 căn sau hàng dừa */
    [-182, -160, -138, -116, -94, -72].forEach((x, i) => {
      const z = onShore(x, 19);
      const nrm = Math.atan2(-(0.007 * x + 0.3 * Math.cos(x * 0.05) + 0.39 * Math.cos(x * 0.13 + 1)), 1); // hướng ra biển
      const v = this.makeGroup('beach', x, z, groundHeight(x, z), nrm);
      this.box(17, 1.2, 15, M.stone, 0, 0, 0, v);
      this.house(v, { w: 10, d: 6.5, h: 4, roofH: 4.4, y: 0.6, z: -3 });
      this.box(8, 0.35, 4.2, M.pool, -2, 0.75, 4.4, v);
      this.lounger(v, 4, 0.6, 4); this.lounger(v, 5.6, 0.6, 4);
      // chòi mái lá
      for (const [px, pz] of [[4, 5.8], [7, 5.8], [4, 2.8], [7, 2.8]]) this.post(px, 0.6, 3.2, pz, 0.12, M.darkWood, v);
      this.roof(4.6, 4.6, 2.2, M.thatch, 5.5, 3.2, 4.3, v);
      if (i === 3) this.anchors.beach = new THREE.Vector3(x, groundHeight(x, z) + 12, z);
      this.lanterns.push(new THREE.Vector3(x + 8, groundHeight(x, z) + 1.2, z + 8));
    });

    /* 03 — Hill villa: 4 căn trên sườn đồi */
    [-4, 26, 56, 84].forEach((x, i) => {
      const z = onShore(x, 82 + (i % 2) * 6);
      const y = groundHeight(x, z);
      const v = this.makeGroup('hill', x, z, y, (x - 40) * -0.004);
      this.box(22, 12, 17, M.stone, 0, -5, 0, v);
      this.house(v, { w: 12, d: 7.5, h: 4.4, roofH: 2.6, y: 1, z: -3.5, roofMat: M.darkWood });
      this.box(15, 0.4, 4.6, M.pool, 0, 1.2, 5.6, v);
      this.lounger(v, -6, 1, 2.4); this.lounger(v, -4.4, 1, 2.4);
      if (i === 1) this.anchors.hill = new THREE.Vector3(x, y + 13, z);
      this.lanterns.push(new THREE.Vector3(x - 9, y + 1.6, z + 8));
    });

    /* 04 — Jungle treehouse: 2 nhà cây phía đông */
    [[168, 44], [198, 52]].forEach(([x, dd], i) => {
      const z = onShore(x, dd), y = groundHeight(x, z);
      const v = this.makeGroup('jungle', x, z, y, -0.35);
      for (const [px, pz] of [[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5]]) this.post(px, -2, 9, pz, 0.35, M.darkWood, v);
      this.box(10, 0.5, 10, M.wood, 0, 9, 0, v);
      this.house(v, { w: 6.4, d: 6, h: 3.2, roofH: 5.2, y: 9.25, z: -0.8, wallMat: M.wood });
      if (i === 0) this.anchors.jungle = new THREE.Vector3(x, y + 24, z);
      this.lanterns.push(new THREE.Vector3(x, y + 10, z + 5.5));
    });

    /* 05 — Nhà hàng: nhà rường hai tầng mái trên bãi cát + hồ bơi chung */
    {
      const x = -22, z = onShore(x, 13), y = groundHeight(x, z);
      const v = this.makeGroup('dining', x, z, y, 0.05);
      this.box(28, 1, 19, M.wood, 0, 0, 0, v);
      for (let ix = -12; ix <= 12; ix += 6) for (const iz of [-8, 8]) this.post(ix, 0.5, 5.5, iz, 0.35, M.darkWood, v);
      this.box(14, 4, 8, M.wall, 0, 2.5, -4, v);
      this.roof(36, 25, 6, M.tile, 0, 5.5, 0, v);
      this.roof(18, 12, 4, M.tile, 0, 9.6, 0, v);
      this.anchors.dining = new THREE.Vector3(x, y + 20, z);
      for (let k = -12; k <= 12; k += 6) this.lanterns.push(new THREE.Vector3(x + k, y + 4.5, z + 10));
      const pz = onShore(22, 15);
      const pool = this.makeGroup('dining', 22, pz, groundHeight(22, pz), 0.08);
      this.box(34, 0.8, 13, M.stone, 0, 0, 0, pool);
      this.box(30, 0.4, 9, M.pool, 0, 0.45, 0, pool);
      for (let k = -12; k <= 12; k += 3) this.lounger(pool, k, 0.4, 8.4);
    }

    /* 06 — Spa: 5 chòi tròn bên suối */
    {
      const x0 = -112, d0 = 58;
      const g0 = this.makeGroup('spa', x0, onShore(x0, d0), groundHeight(x0, onShore(x0, d0)));
      const hutWall = new THREE.CylinderGeometry(3, 3.2, 3.4, 10);
      const hutRoof = new THREE.ConeGeometry(4.6, 4, 10); hutRoof.translate(0, 2, 0);
      [[0, 0], [11, 5], [-11, 5], [6, -10], [-7, -11]].forEach(([dx, dz]) => {
        const wx = x0 + dx, wz = onShore(x0, d0) + dz, wy = groundHeight(wx, wz);
        const base = new THREE.Mesh(this.BOX, M.stone); base.scale.set(8, 2, 8); base.position.set(dx, wy - g0.position.y, dz); g0.add(base);
        const w = new THREE.Mesh(hutWall, M.wall); w.position.set(dx, wy - g0.position.y + 2.7, dz); w.castShadow = true; g0.add(w);
        const r = new THREE.Mesh(hutRoof, M.thatch); r.position.set(dx, wy - g0.position.y + 4.4, dz); r.castShadow = true; g0.add(r);
        this.lanterns.push(new THREE.Vector3(wx + 3.5, wy + 1.4, wz + 3.5));
      });
      this.anchors.spa = new THREE.Vector3(x0, g0.position.y + 16, onShore(x0, d0));
    }

    // villa dựng xong → tắt những bóng không cần
    this.scene.traverse((o) => { if (o.isMesh && o.material === M.glass) o.castShadow = false; });

    // đèn lồng (ban đêm)
    const lg = new THREE.BufferGeometry().setFromPoints(this.lanterns);
    this.lanternMat = new THREE.PointsMaterial({
      color: '#ffcf8a', size: 11, map: this.glowTexture(), transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    this.scene.add(new THREE.Points(lg, this.lanternMat));
  }

  glowTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,220,160,.8)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  nearBuilding(x, z, r) {
    for (const g of this.clickables) {
      if (g === this.clickables[0]) continue;
      if ((g.position.x - x) ** 2 + (g.position.z - z) ** 2 < r * r) return true;
    }
    return x > 88 && x < 112 && z < coastZ(x) + 2 && z > coastZ(x) - 14; // đầu cầu gỗ
  }

  buildVegetation() {
    const withColor = (g, hex) => {
      g = g.index ? g.toNonIndexed() : g;
      const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
      g.setAttribute('color', new THREE.BufferAttribute(a, 3));
      g.deleteAttribute('uv');
      return g;
    };
    // --- Dừa ---
    const trunk = new THREE.CylinderGeometry(0.28, 0.45, 10, 5, 5);
    trunk.translate(0, 5, 0);
    { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + 0.03 * y * y); } }
    const leaves = [];
    for (let k = 0; k < 7; k++) {
      const leaf = new THREE.BoxGeometry(5.6, 0.12, 1.1, 6, 1, 1);
      leaf.translate(2.8, 0, 0);
      const p = leaf.attributes.position;
      for (let i = 0; i < p.count; i++) { const lx = p.getX(i); p.setY(i, p.getY(i) - 0.11 * lx * lx + 0.6 * lx * 0.3); p.setZ(i, p.getZ(i) * (1 - lx / 7)); }
      leaf.rotateY((k / 7) * Math.PI * 2 + 0.3);
      leaf.translate(3, 10, 0);
      leaves.push(withColor(leaf, k % 2 ? '#4f8a33' : '#3f7a2c'));
    }
    const palmGeo = mergeGeometries([withColor(trunk, '#8d6e4c'), ...leaves]);
    const palms = [];
    for (let i = 0; i < 2600 && palms.length < 150; i++) {
      const x = lerp(-250, 250, rand()), dd = lerp(7.5, 15, rand());
      const z = onShore(x, dd);
      if (this.nearBuilding(x, z, 11)) continue;
      palms.push([x, groundHeight(x, z), z]);
    }
    const palmMesh = new THREE.InstancedMesh(palmGeo, this.mats.veg, palms.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
    palms.forEach(([x, y, z], i) => {
      e.set(lerp(-0.1, 0.12, rand()), rand() * Math.PI * 2, lerp(-0.08, 0.08, rand()));
      q.setFromEuler(e); const k = lerp(0.75, 1.25, rand()); s.set(k, k, k); v.set(x, y - 0.2, z);
      palmMesh.setMatrixAt(i, m4.compose(v, q, s));
    });
    palmMesh.castShadow = true; palmMesh.receiveShadow = true;
    this.scene.add(palmMesh);

    // --- Rừng ---
    const canopy = new THREE.IcosahedronGeometry(3.2, 0); canopy.scale(1, 1.25, 1); canopy.translate(0, 6, 0);
    const canopy2 = new THREE.IcosahedronGeometry(2.2, 0); canopy2.translate(0.8, 9, 0.4);
    const tTrunk = new THREE.CylinderGeometry(0.35, 0.5, 4, 5); tTrunk.translate(0, 2, 0);
    const treeGeo = mergeGeometries([withColor(tTrunk, '#6b4f35'), withColor(canopy, '#ffffff'), withColor(canopy2, '#f2f2f2')]);
    const trees = [];
    for (let i = 0; i < 20000 && trees.length < 2200; i++) {
      const x = lerp(-450, 450, rand()), z = lerp(-370, 420, rand());
      const d = coastZ(x) - z;
      if (d < 21 || this.nearBuilding(x, z, 14) || groundHeight(x, z) < 2) continue;
      if (rand() > 0.35 + smooth(20, 80, d) * 0.65) continue;
      trees.push([x, groundHeight(x, z), z, d]);
    }
    const treeMesh = new THREE.InstancedMesh(treeGeo, this.mats.veg, trees.length);
    const tc = [new THREE.Color('#4d7d35'), new THREE.Color('#3b6a2d'), new THREE.Color('#5d8c3c'), new THREE.Color('#2f5a2a'), new THREE.Color('#6f8f3a')];
    const trunkFix = new THREE.Color();
    trees.forEach(([x, y, z, d], i) => {
      e.set(0, rand() * 6.28, 0); q.setFromEuler(e);
      const k = lerp(0.7, 1.6, rand()) * (1 + smooth(40, 200, d) * 0.5);
      s.set(k, k * lerp(0.85, 1.2, rand()), k); v.set(x, y - 0.5, z);
      treeMesh.setMatrixAt(i, m4.compose(v, q, s));
      treeMesh.setColorAt(i, trunkFix.copy(tc[Math.floor(rand() * tc.length)]));
    });
    treeMesh.castShadow = true; treeMesh.receiveShadow = true;
    this.scene.add(treeMesh);
  }

  buildBoats() {
    const hull = new THREE.CylinderGeometry(1.1, 0.6, 7, 6, 1);
    hull.rotateX(Math.PI / 2); hull.scale(1, 0.55, 1);
    this.boats = [];
    const paths = [
      { cx: -40, cz: 150, rx: 110, rz: 45, sp: 0.05, ph: 0 },
      { cx: 60, cz: 210, rx: 160, rz: 60, sp: -0.035, ph: 2 },
      { cx: -215, cz: 168, rx: 42, rz: 22, sp: 0.03, ph: 4 },
    ];
    for (const p of paths) {
      const b = new THREE.Group();
      const h = new THREE.Mesh(hull, this.mats.boat); h.castShadow = true; b.add(h);
      this.box(1.4, 1, 2, this.mats.wood, 0, 0.8, -0.6, b);
      b.userData = p; this.boats.push(b); this.scene.add(b);
    }
    // vệt sóng sau thuyền
    this.wakeMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false });
    for (const b of this.boats) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 16), this.wakeMat);
      w.rotation.x = -Math.PI / 2; w.position.set(0, 0.1 - b.position.y, -11); b.add(w);
    }
  }

  buildClouds() {
    const tex = cloudTexture();
    this.cloudTex = tex;
    this.clouds = new THREE.Group();
    for (let i = 0; i < 46; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: lerp(0.55, 0.95, rand()), fog: false });
      const s = new THREE.Sprite(m);
      const high = i < 34;
      s.position.set(lerp(-420, 460, rand()), high ? lerp(250, 520, rand()) : lerp(70, 140, rand()), high ? lerp(-300, 420, rand()) : lerp(-900, -1300, rand()));
      const k = high ? lerp(140, 300, rand()) : lerp(300, 600, rand());
      s.scale.set(k, k * 0.6, 1);
      s.userData.base = m.opacity;
      this.clouds.add(s);
    }
    this.scene.add(this.clouds);
  }

  /* ---------- time of day ---------- */
  snapshot() {
    const o = {};
    for (const k of Object.keys(PRESETS.day)) {
      const v = this.tod[k];
      o[k] = v?.isColor ? '#' + v.getHexString(THREE.SRGBColorSpace) : Array.isArray(v) ? [...v] : v;
    }
    return o;
  }
  applyPreset(a, b, t) {
    const T = this.tod;
    for (const k of Object.keys(a)) {
      if (typeof a[k] === 'string') {
        T[k] = T[k] || new THREE.Color();
        T[k].set(a[k]).lerp(new THREE.Color(b[k]), t);
      } else if (Array.isArray(a[k])) T[k] = a[k].map((v, i) => lerp(v, b[k][i], t));
      else T[k] = lerp(a[k], b[k], t);
    }
    const dir = new THREE.Vector3(...T.sunDir).normalize();
    this.skyU.uTop.value.copy(T.top); this.skyU.uHorizon.value.copy(T.horizon);
    this.skyU.uSunDir.value.copy(dir); this.skyU.uSunColor.value.copy(T.sun); this.skyU.uGlow.value = T.glow;
    this.scene.fog.color.copy(T.fog);
    this.sun.color.copy(T.sun); this.sun.intensity = T.sunI;
    this.sun.position.copy(this.sunTarget.position).addScaledVector(dir, 600);
    this.hemi.color.copy(T.hemiSky); this.hemi.groundColor.copy(T.hemiGround); this.hemi.intensity = T.hemiI;
    const W = this.waterU;
    W.uShallow.value.copy(T.shallow); W.uDeep.value.copy(T.deep); W.uSky.value.copy(T.horizon).lerp(T.top, 0.3);
    W.uSunDir.value.copy(dir); W.uSunColor.value.copy(T.sun); W.uFoam.value.copy(T.foam); W.uSpec.value = T.spec;
    this.mats.glass.emissiveIntensity = T.windows;
    this.mats.pool.emissiveIntensity = T.pools;
    this.lanternMat.opacity = Math.min(1, T.windows / 1.6);
    this.starsMat.opacity = T.stars;
    this.renderer.toneMappingExposure = T.exposure;
    for (const c of this.clouds.children) c.material.color.copy(T.fog).lerp(new THREE.Color('#ffffff'), 0.55);
  }
  setTimeOfDay(name, tween = true) {
    if (!PRESETS[name] || name === this.todName) return;
    const from = this.snapshot(), to = PRESETS[name];
    this.todName = name;
    if (!tween || !window.gsap) { this.applyPreset(to, to, 1); this.renderOnce(); return; }
    const st = { t: 0 };
    window.gsap.to(st, { t: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: () => { this.applyPreset(from, to, st.t); this.renderOnce(); } });
  }

  /* ---------- camera ---------- */
  basePose() {
    const p = this.progress;
    const e = 1 - Math.pow(1 - p, 3);
    const portrait = this.camera.aspect < 1 ? 1 + (1 - this.camera.aspect) * 1.1 : 1; // khung dọc: lùi camera để thấy cả vịnh
    return {
      tx: 20, ty: lerp(0, 6, p), tz: lerp(30, -6, p),
      r: lerp(700, 370 * portrait, e),
      phi: lerp(0.015, 0.98, smooth(0.22, 1, p)),
      theta: lerp(-0.7, 0.04, smooth(0, 1, p)) + (this.drift - 0.5) * 0.3 * p,
    };
  }
  focusPoseFor(id) {
    const a = this.anchors[id]; if (!a) return null;
    const presets = {
      overwater: { r: 96, phi: 1.08, theta: 0.55 }, beach: { r: 100, phi: 1.1, theta: -0.3 },
      hill: { r: 150, phi: 1.16, theta: 0.2 }, jungle: { r: 110, phi: 1.12, theta: 0.6 },
      dining: { r: 105, phi: 1.12, theta: -0.05 }, spa: { r: 110, phi: 1.08, theta: -0.45 },
    };
    const p = presets[id];
    return { tx: a.x, ty: a.y - 10, tz: a.z, ...p };
  }
  setFocus(id) {
    const pose = id ? this.focusPoseFor(id) : null;
    if (pose) this.focus.pose = pose;
    this.drag.tTheta = 0; this.drag.tPhi = 0;
    window.gsap.to(this.focus, { blend: pose ? 1 : 0, duration: 1.8, ease: 'power3.inOut' });
  }
  dragBy(dx, dy) {
    this.drag.tTheta = THREE.MathUtils.clamp(this.drag.tTheta - dx * 0.004, -1.1, 1.1);
    this.drag.tPhi = THREE.MathUtils.clamp(this.drag.tPhi - dy * 0.003, -0.42, 0.3);
  }
  setShift(x, y) { window.gsap.to(this.shift, { x, y, duration: 1.2, ease: 'power3.inOut' }); }
  zoomBy(f) { this.zoom.t = THREE.MathUtils.clamp(this.zoom.t * f, 0.55, 1.25); }
  resetView() { this.drag.tTheta = 0; this.drag.tPhi = 0; this.zoom.t = 1; }

  updateCamera(dt) {
    const k = 1 - Math.exp(-dt * 6);
    this.drag.theta += (this.drag.tTheta - this.drag.theta) * k;
    this.drag.phi += (this.drag.tPhi - this.drag.phi) * k;
    this.zoom.v += (this.zoom.t - this.zoom.v) * k;
    const b = this.basePose(), f = this.focus.pose, t = this.focus.blend;
    const P = {};
    for (const key of ['tx', 'ty', 'tz', 'r', 'phi', 'theta']) P[key] = f ? lerp(b[key], f[key], t) : b[key];
    const userAmt = Math.max(smooth(0.85, 1, this.progress), t);
    const phi = THREE.MathUtils.clamp(P.phi + this.drag.phi * userAmt, 0.01, 1.32);
    const theta = P.theta + this.drag.theta * userAmt;
    const r = P.r * lerp(1, this.zoom.v, userAmt);
    const c = this.camera;
    c.position.set(P.tx + r * Math.sin(phi) * Math.sin(theta), P.ty + r * Math.cos(phi), P.tz + r * Math.sin(phi) * Math.cos(theta));
    c.position.y = Math.max(c.position.y, groundHeight(c.position.x, c.position.z) + 8);
    c.lookAt(P.tx, P.ty, P.tz);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (Math.abs(this.shift.x) > 0.5 || Math.abs(this.shift.y) > 0.5) c.setViewOffset(w, h, this.shift.x, this.shift.y, w, h);
    else if (c.view && c.view.enabled) c.clearViewOffset();
    this.scene.fog.near = r * 0.9;
    this.scene.fog.far = r * 4.2 + 300;
  }

  /* ---------- picking / projection ---------- */
  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(this.clickables, true)[0];
    if (!hit) return null;
    let o = hit.object; while (o && !o.userData.placeId) o = o.parent;
    return o ? o.userData.placeId : null;
  }
  projectAnchors() {
    const out = [], v = new THREE.Vector3();
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    for (const id of Object.keys(this.anchors)) {
      v.copy(this.anchors[id]).project(this.camera);
      out.push({ id, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 });
    }
    return out;
  }

  /* ---------- loop ---------- */
  resize() {
    const el = this.canvas.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 58 : 40; // màn hình dọc → mở rộng góc nhìn
    this.camera.updateProjectionMatrix();
    this.renderOnce();
  }
  start() { if (this.active) return; this.active = true; this.clock.getDelta(); requestAnimationFrame(this.loop); }
  stop() { this.active = false; }
  renderOnce() { if (!this.active) this.tick(0); }
  tick(dt) {
    const t = this.clock.elapsedTime;
    this.waterU.uTime.value = t;
    for (const b of this.boats) {
      const p = b.userData, a = t * p.sp + p.ph;
      b.position.set(p.cx + Math.cos(a) * p.rx, 0.3 + Math.sin(t * 1.5 + p.ph) * 0.12, p.cz + Math.sin(a) * p.rz);
      const dx = -Math.sin(a) * p.rx * Math.sign(p.sp), dz = Math.cos(a) * p.rz * Math.sign(p.sp);
      b.rotation.y = Math.atan2(dx, dz);
    }
    for (const c of this.clouds.children) c.material.opacity = c.userData.base * (c.position.y > 200 ? 1 - smooth(0.55, 0.9, this.progress) : 1);
    this.updateCamera(dt || 0.016);
    this.sky.position.copy(this.camera.position);
    this.stars.position.copy(this.camera.position);
    this.renderer.render(this.scene, this.camera);
    if (this.onFrame) this.onFrame();
  }
  loop() {
    if (!this.active) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.tick(dt);
    requestAnimationFrame(this.loop);
  }
}

export function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const x = c.getContext('2d');
  let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 26; i++) {
    const cx = 50 + r() * 156, cy = 60 + r() * 50, rad = 22 + r() * 40;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.userData.canvas = c;
  return t;
}
