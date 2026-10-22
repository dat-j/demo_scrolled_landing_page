// Trình xem 360° nội thất — ảnh equirectangular dán vào mặt trong một khối cầu.
import * as THREE from 'three';

export class PanoViewer {
  constructor(canvas, { onLoad } = {}) {
    this.canvas = canvas;
    this.onLoad = onLoad;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1100);
    const geo = new THREE.SphereGeometry(500, 72, 36);
    geo.scale(-1, 1, 1);
    this.mat = new THREE.MeshBasicMaterial({ color: '#000' });
    this.scene.add(new THREE.Mesh(geo, this.mat));
    this.loader = new THREE.TextureLoader();
    this.cache = new Map();
    this.lon = 0; this.lat = 0; this.tLon = 0; this.tLat = 0; this.fov = 75; this.tFov = 75;
    this.auto = true; this.running = false;
    this.pointers = new Map();
    this.bind();
    this.resize();
  }
  bind() {
    const c = this.canvas;
    let last = null, pinch0 = 0, fov0 = 75;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      last = [e.clientX, e.clientY]; this.auto = false;
      if (this.pointers.size === 2) { const [a, b] = [...this.pointers.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); fov0 = this.tFov; }
      this.onInteract?.();
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        this.tFov = THREE.MathUtils.clamp(fov0 * pinch0 / d, 35, 95);
        return;
      }
      const k = this.fov / 75 * 0.12;
      this.tLon -= (e.clientX - last[0]) * k;
      this.tLat = THREE.MathUtils.clamp(this.tLat + (e.clientY - last[1]) * k, -80, 80);
      last = [e.clientX, e.clientY];
    });
    const up = (e) => { this.pointers.delete(e.pointerId); const p = [...this.pointers.values()][0]; if (p) last = p; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.tFov = THREE.MathUtils.clamp(this.tFov + e.deltaY * 0.04, 35, 95); this.onInteract?.(); }, { passive: false });
    this.onKey = (e) => {
      const m = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, 6], ArrowDown: [0, -6] }[e.key];
      if (m) { this.tLon += m[0]; this.tLat = THREE.MathUtils.clamp(this.tLat + m[1], -80, 80); this.auto = false; }
      if (e.key === '+' || e.key === '=') this.tFov = Math.max(35, this.tFov - 6);
      if (e.key === '-') this.tFov = Math.min(95, this.tFov + 6);
    };
    this.onResize = () => this.resize();
  }
  load(src) {
    return new Promise((resolve, reject) => {
      const done = (tex) => { this.mat.map = tex; this.mat.color.set('#fff'); this.mat.needsUpdate = true; resolve(); };
      if (this.cache.has(src)) return done(this.cache.get(src));
      this.loader.load(src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        this.cache.set(src, tex); done(tex);
      }, undefined, reject);
    });
  }
  open() {
    this.lon = this.tLon = 0; this.lat = this.tLat = 0; this.fov = this.tFov = 75; this.auto = true;
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
    this.resize();
    this.running = true;
    const loop = () => { if (!this.running) return; this.frame(); requestAnimationFrame(loop); };
    loop();
  }
  close() {
    this.running = false;
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
  }
  resize() {
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }
  frame() {
    if (this.auto) this.tLon += 0.035;
    this.lon += (this.tLon - this.lon) * 0.12;
    this.lat += (this.tLat - this.lat) * 0.12;
    this.fov += (this.tFov - this.fov) * 0.12;
    this.camera.fov = this.fov; this.camera.updateProjectionMatrix();
    const phi = THREE.MathUtils.degToRad(90 - this.lat), th = THREE.MathUtils.degToRad(this.lon);
    this.camera.lookAt(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
    this.renderer.render(this.scene, this.camera);
  }
}
