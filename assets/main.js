import { MAP } from './vietnam-map.js';
import { PLACES, EXPERIENCES, HERO, img } from './data.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth < 861;
const sized = (url, w) => url.replace(/w=\d+/, `w=${w}`);
const vnd = (n) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
const short = (n) => (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr';
const lerp = (a, b, t) => a + (b - a) * t;
const byId = Object.fromEntries(PLACES.map((p) => [p.id, p]));

const stage = $('#stage');
const nav = $('#nav');

/* ============================== Loader ============================== */
const loader = (() => {
  let done = 0; const total = 3; const bar = $('#loaderBar');
  let resolve; const ready = new Promise((r) => (resolve = r));
  const step = () => { done++; bar.style.width = `${(done / total) * 100}%`; if (done >= total) resolve(); };
  setTimeout(resolve, 6000); // đừng bao giờ kẹt người dùng ở màn chờ
  return { step, ready };
})();
document.fonts?.ready.then(loader.step);

/* ============================== Smooth scroll ============================== */
const lenis = new Lenis({ lerp: reduce ? 1 : 0.1, smoothWheel: !reduce });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();
history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ============================== Hero ============================== */
const heroImg = $('#heroImg');
heroImg.alt = HERO.alt;
heroImg.srcset = [800, 1600, 2400].map((w) => `${img(HERO.image, w)} ${w}w`).join(', ');
heroImg.sizes = '100vw';
heroImg.src = img(HERO.image, 1600);
const heroLoaded = () => { heroImg.classList.add('is-loaded'); loader.step(); };
heroImg.complete && heroImg.naturalWidth ? heroLoaded() : (heroImg.onload = heroLoaded, heroImg.onerror = loader.step);

function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo(heroImg, { scale: 1.18 }, { scale: 1.04, duration: 2.6, ease: 'power2.out' }, 0)
    .from('.hero__title .line > span', { yPercent: 110, duration: 1.4, stagger: 0.12 }, 0.15)
    .from('.hero .kicker, .hero__sub, .hero__cta, .hero__facts, .scroll-cue', { y: 24, autoAlpha: 0, duration: 1.2, stagger: 0.08 }, 0.5)
    .from(nav, { y: -20, autoAlpha: 0, duration: 1, clearProps: 'transform,opacity,visibility' }, 0.6);
}
gsap.to('.hero__media', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
gsap.to('.hero__content, .hero__facts, .scroll-cue', { y: -60, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: '85% top', scrub: true } });

/* ============================== Map ============================== */
const svg = $('#map');
const P = MAP.places;
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const projY = (lat) => 700 - 4300 * (merc(lat) - merc(15.8));
const projX = (lon) => 550 + (lon - 108.6) * 4300 * Math.PI / 180;

function seeded(s) { return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function islandDots(cx, cy, rx, ry, n, seed) {
  const r = seeded(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r());
    out += `<circle cx="${(cx + Math.cos(a) * rx * d).toFixed(1)}" cy="${(cy + Math.sin(a) * ry * d).toFixed(1)}" r="${(1.2 + r() * 2.2).toFixed(1)}"/>`;
  }
  return out;
}
function buildMap() {
  let grat = '';
  for (let lon = 96; lon <= 122; lon += 2) grat += `M${projX(lon).toFixed(1)} -400V1800`;
  for (let lat = 4; lat <= 28; lat += 2) grat += `M-1000 ${projY(lat).toFixed(1)}H2100`;
  const nb = Object.entries(MAP.paths).filter(([k]) => k !== 'vn').map(([, d]) => `<path class="nb" d="${d}"/>`).join('');
  const city = (k, name, dx = 9, dy = 4, cls = '') =>
    `<g class="mk city ${cls}" transform="translate(${P[k][0]} ${P[k][1]})"><g class="mk-s"><circle r="4.5"/><text x="${dx}" y="${dy}" ${dx < 0 ? 'text-anchor="end"' : ''}>${name}</text></g></g>`;
  const [cr, hn, hcm] = [P.camranh, P.hanoi, P.hcm];
  const r1 = `M${hn[0]} ${hn[1]} Q ${hn[0] + 520} ${(hn[1] + cr[1]) / 2 - 120} ${cr[0]} ${cr[1]}`;
  const r2 = `M${hcm[0]} ${hcm[1]} Q ${hcm[0] + 70} ${hcm[1] - 10} ${cr[0]} ${cr[1]}`;
  svg.innerHTML = `
    <path class="grat" d="${grat}"/>
    <g>${nb}</g>
    <path class="vn-fill" d="${MAP.paths.vn}"/>
    <path class="vn-stroke" d="${MAP.paths.vn}" pathLength="1"/>
    <g class="isl">${islandDots(805, 640, 46, 30, 16, 11)}${islandDots(940, 1175, 150, 120, 30, 5)}</g>
    <g class="map-fade">
      <text class="lbl" x="${projX(103.2)}" y="${projY(19.6)}">LÀO</text>
      <text class="lbl" x="${projX(104.9)}" y="${projY(12.8)}">CAMPUCHIA</text>
      <text class="lbl" x="${projX(101.2)}" y="${projY(15.4)}">THÁI LAN</text>
      <text class="lbl" x="${projX(106.2)}" y="${projY(23.8)}">TRUNG QUỐC</text>
      <text class="lbl lbl--sea" x="${projX(112.6)}" y="${projY(13.6)}">Biển Đông</text>
      <text class="lbl lbl--sea" x="${projX(107.7)}" y="${projY(19.9)}" style="font-size:calc(var(--u)*14px)">Vịnh Bắc Bộ</text>
      <text class="lbl lbl--isl" x="${805 + 56}" y="${640}">QĐ. Hoàng Sa<tspan class="sub" x="${805 + 56}" dy="1.35em">Đà Nẵng, Việt Nam</tspan></text>
      <text class="lbl lbl--isl" x="${940 + 40}" y="${1175 - 128}">QĐ. Trường Sa<tspan class="sub" x="${940 + 40}" dy="1.35em">Khánh Hòa, Việt Nam</tspan></text>
    </g>
    <path class="route-dash" d="${r1}"/><path class="route-dash" d="${r2}"/>
    <path class="route" id="route1" d="${r1}" pathLength="1"/>
    <path class="route" id="route2" d="${r2}" pathLength="1"/>
    <g class="cities">
      ${city('hanoi', 'Hà Nội', -10)}${city('danang', 'Đà Nẵng', -10)}${city('hcm', 'TP. Hồ Chí Minh', -10, 4)}
      ${city('phuquoc', 'Phú Quốc', -10)}${city('condao', 'Côn Đảo', 10)}
    </g>
    <g class="cities cities--near">
      <text class="lbl" x="${projX(108.85)}" y="${projY(12.62)}" style="font-size:calc(var(--u)*13px);fill:rgba(18,33,29,.42)">KHÁNH HÒA</text>
      ${city('nhatrang', 'Nha Trang', -10, 0)}${city('camranh', 'Sân bay Cam Ranh', -10, 8, 'city--air')}
    </g>
    <g id="plane"><g class="mk-s"><path d="M0-9l2 7 9 3v2l-9-1-1 6 3 2v1.5L0 20l-4 1.5V20l3-2-1-6-9 1v-2l9-3z" transform="rotate(90) scale(.9)"/></g></g>
    <g class="resort-mk" transform="translate(${P.resort[0]} ${P.resort[1]})"><g class="mk-s">
      <circle class="ring" r="14"/><circle class="ring" r="14"/><circle class="core" r="7"/>
      <text x="16" y="-6">Lưu Vân Bay</text><text class="sub" x="16" y="12">KHU NGHỈ DƯỠNG</text>
    </g></g>`;
}
buildMap();

// Các "khung nhìn" của bản đồ. fx/fy: vị trí điểm tiêu cự trên màn hình (chừa chỗ cho thẻ nội dung).
function mapStates() {
  const W = stage.clientWidth, H = stage.clientHeight, a = W / H, m = isMobile();
  const R = P.resort;
  return [
    { cx: m ? 640 : 600, cy: 720, h: Math.max(1450, m ? 1120 / a : 0), fx: m ? 0.5 : 0.63, fy: m ? 0.4 : 0.5 },
    { cx: m ? 600 : 560, cy: 720, h: Math.max(1320, m ? 1000 / a : 0), fx: m ? 0.5 : 0.63, fy: m ? 0.4 : 0.5 },
    { cx: R[0], cy: R[1], h: Math.max(250, m ? 170 / a : 0), fx: m ? 0.5 : 0.64, fy: m ? 0.36 : 0.5 },
    { cx: R[0], cy: R[1], h: 14, fx: 0.5, fy: 0.5 },
  ];
}
const mapView = { z: 0 };
function updateMap() {
  const S = mapStates(), W = stage.clientWidth, H = stage.clientHeight;
  const i = Math.min(Math.floor(mapView.z), S.length - 2), t = mapView.z - i, A = S[i], B = S[i + 1];
  const h = Math.exp(lerp(Math.log(A.h), Math.log(B.h), t)), w = h * (W / H);
  const cx = lerp(A.cx, B.cx, t), cy = lerp(A.cy, B.cy, t), fx = lerp(A.fx, B.fx, t), fy = lerp(A.fy, B.fy, t);
  svg.setAttribute('viewBox', `${(cx - fx * w).toFixed(2)} ${(cy - fy * h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
  svg.style.setProperty('--u', (h / H).toFixed(4));
}
updateMap();

const plane = { t: 0 };
const route1 = $('#route1'), planeEl = $('#plane');
function updatePlane() {
  const L = route1.getTotalLength(), p = route1.getPointAtLength(L * plane.t), q = route1.getPointAtLength(Math.min(L, L * plane.t + 1));
  const ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
  planeEl.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${ang})`);
}
updatePlane();

/* ============================== Clouds (DOM) ============================== */
const cloudURL = (() => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 320;
  const x = c.getContext('2d'); const r = seeded(3);
  for (let i = 0; i < 34; i++) {
    const cx = 90 + r() * 330, cy = 120 + r() * 100, rad = 50 + r() * 80;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
  }
  return c.toDataURL('image/png');
})();
const cloudsEl = $('#clouds');
const puffs = [];
{
  const r = seeded(9);
  for (let i = 0; i < 12; i++) {
    const el = document.createElement('div'); el.className = 'cloud';
    const a = r() * Math.PI * 2, d = 10 + r() * 30, s = 55 + r() * 60;
    el.style.cssText = `width:${s}vmax;height:${s * 0.62}vmax;left:${50 + Math.cos(a) * d - s / 2}vw;top:${50 + Math.sin(a) * d - s * 0.31}vh;background-image:url(${cloudURL})`;
    el.dataset.dx = Math.cos(a); el.dataset.dy = Math.sin(a);
    cloudsEl.appendChild(el); puffs.push(el);
  }
}

/* ============================== 3D scene ============================== */
let scene = null;
const sceneState = { p: 0, drift: 0.5 };
const webglOK = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const FALLBACK_POS = { overwater: [70, 60], beach: [20, 50], hill: [50, 34], jungle: [84, 40], dining: [40, 56], spa: [28, 38] };

async function initScene() {
  if (!webglOK) return fallback();
  try {
    const { ResortScene } = await import('./resort-scene.js');
    scene = new ResortScene($('#scene'), PLACES);
    scene.onFrame = updateHotspots;
  } catch (err) {
    console.error('[scene]', err);
    fallback();
  }
}
function fallback() {
  const fb = $('#fallback'); fb.hidden = false;
  fb.style.backgroundImage = `url(${img('1540541338287-41700207dee6', 1600)})`;
  $('#scene').hidden = true;
  requestAnimationFrame(updateHotspots);
}
function syncScene(time) {
  if (!scene) return;
  scene.progress = sceneState.p;
  scene.drift = sceneState.drift;
  const want = journeyST?.isActive && time > 4.4;
  want ? scene.start() : scene.stop();
}

/* ============================== Hotspots + dock ============================== */
const hsWrap = $('#hotspots');
const hsEls = {};
for (const p of PLACES) {
  const b = document.createElement('button');
  b.className = 'hs'; b.dataset.id = p.id;
  b.setAttribute('aria-label', `${p.num}. ${p.name} — xem chi tiết`);
  b.innerHTML = `<span class="hs__dot"><b>${+p.num}</b></span><span class="hs__label">${p.name}<small>${p.kind === 'villa' ? 'từ ' + short(p.price) + ' / đêm' : p.hours}</small></span>`;
  b.addEventListener('click', () => openPlace(p.id, b));
  b.addEventListener('pointerenter', () => { prefetch(p); setHover(p.id); });
  b.addEventListener('pointerleave', () => setHover(null));
  b.addEventListener('focus', () => prefetch(p));
  hsWrap.appendChild(b); hsEls[p.id] = b;
}
const dock = $('#dock');
for (const p of PLACES) {
  const b = document.createElement('button');
  b.className = 'dock__item'; b.dataset.id = p.id; b.setAttribute('role', 'listitem');
  b.innerHTML = `<img src="${sized(p.gallery[0][0], 160)}" alt="" loading="lazy"><span><span class="n">${p.num}</span><b>${p.name}</b><small>${p.kind === 'villa' ? 'từ ' + short(p.price) + ' / đêm' : p.hours}</small></span>`;
  b.addEventListener('click', () => openPlace(p.id, b));
  b.addEventListener('pointerenter', () => { prefetch(p); setHover(p.id); });
  b.addEventListener('pointerleave', () => setHover(null));
  dock.appendChild(b);
}
const prefetched = new Set();
function prefetch(p) {
  if (prefetched.has(p.id)) return; prefetched.add(p.id);
  const im = new Image(); im.src = sized(p.gallery[0][0], isMobile() ? 900 : 1200);
}
let hoverId = null;
function setHover(id) {
  if (id === hoverId) return; hoverId = id;
  for (const [k, el] of Object.entries(hsEls)) el.classList.toggle('is-hover', k === id);
  $$('.dock__item').forEach((el) => el.classList.toggle('is-hover', el.dataset.id === id));
}
function updateHotspots() {
  if (!stage.classList.contains('is-explore') && !document.body.classList.contains('panel-open')) return;
  if (scene) {
    for (const a of scene.projectAnchors()) {
      const el = hsEls[a.id];
      el.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`;
      el.classList.toggle('is-visible', a.visible);
    }
  } else {
    const W = stage.clientWidth, H = stage.clientHeight;
    for (const [id, [x, y]] of Object.entries(FALLBACK_POS)) {
      hsEls[id].style.transform = `translate3d(${(x / 100) * W}px, ${(y / 100) * H}px, 0)`;
      hsEls[id].classList.add('is-visible');
    }
  }
}

/* ============================== Journey timeline ============================== */
const UNIT = () => innerHeight * (isMobile() ? 0.7 : 0.78);
let journeyST;
const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
const cardIn = (sel, at) => tl.fromTo(sel, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }, at);
const cardOut = (sel, at) => tl.to(sel, { autoAlpha: 0, y: -30, duration: 0.3, ease: 'power2.in' }, at);

tl.fromTo('.vn-stroke', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1, ease: 'none' }, 0)
  .fromTo('.vn-fill', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'none' }, 0.35)
  .fromTo('.isl, .map-fade, .cities:not(.cities--near)', { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.08 }, 0.5)
  .set('.cities--near, .resort-mk, #plane, .route-dash', { opacity: 0 }, 0);
cardIn('#c1', 0.25);
cardOut('#c1', 1.3);
tl.addLabel('map', 0.95)
  .to(mapView, { z: 1, duration: 1, ease: 'none', onUpdate: updateMap }, 1.3)
  .to('.route-dash, #plane', { opacity: 1, duration: 0.15 }, 1.5)
  .to('.route', { strokeDashoffset: 0, duration: 0.9, stagger: 0.12, ease: 'none' }, 1.5)
  .to(plane, { t: 1, duration: 0.9, ease: 'none', onUpdate: updatePlane }, 1.5);
cardIn('#c2', 1.7);
cardOut('#c2', 2.8);
tl.addLabel('route', 2.3)
  .to(mapView, { z: 2, duration: 1, ease: 'power2.inOut', onUpdate: updateMap }, 2.9)
  .to('.route, .route-dash, #plane, .cities:not(.cities--near), .map-fade, .isl', { opacity: 0, duration: 0.35 }, 2.95)
  .to('.cities--near', { opacity: 1, duration: 0.3 }, 3.4)
  .fromTo('.resort-mk', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 3.5);
cardIn('#c3', 3.6);
cardOut('#c3', 4.5);
tl.addLabel('bay', 4.05)
  .to(mapView, { z: 3, duration: 0.85, ease: 'power3.in', onUpdate: updateMap }, 4.5)
  .to('.cities--near', { opacity: 0, duration: 0.3 }, 4.6)
  .fromTo(cloudsEl, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power1.in' }, 4.8);
puffs.forEach((el) => {
  const dx = +el.dataset.dx, dy = +el.dataset.dy;
  tl.fromTo(el, { scale: 0.5, xPercent: 0, yPercent: 0 }, { scale: 2.6, xPercent: dx * 70, yPercent: dy * 70, duration: 1.6, ease: 'none' }, 4.5);
});
tl.set('#mapLayer', { autoAlpha: 0 }, 5.35)
  .to(cloudsEl, { opacity: 0, duration: 0.7, ease: 'power1.out' }, 5.4)
  .addLabel('resort', 6.45)
  .to(sceneState, { p: 1, duration: 2, ease: 'none' }, 5.35);
cardIn('#c4', 6.2);
cardOut('#c4', 7.1);
tl.addLabel('explore', 7.6)
  .to(sceneState, { drift: 1, duration: 1.7, ease: 'none' }, 7.3)
  .set({}, {}, 9);

const EXPLORE_AT = 7.3;
journeyST = ScrollTrigger.create({
  trigger: stage,
  start: 'top top',
  end: () => '+=' + UNIT() * tl.duration(),
  pin: true,
  scrub: reduce ? true : 0.9,
  animation: tl,
  invalidateOnRefresh: true,
  onToggle: () => syncScene(tl.time()),
  onRefresh: () => { updateMap(); syncScene(tl.time()); },
});
// Trạng thái bám theo thời gian thật của timeline (scrub làm timeline trễ hơn vị trí cuộn)
function syncJourney() {
  const t = tl.time(), on = t >= EXPLORE_AT;
  if (on !== stage.classList.contains('is-explore')) {
    stage.classList.toggle('is-explore', on);
    $('#explore').setAttribute('aria-hidden', !on);
    if (on) updateHotspots();
  }
  syncScene(t);
}
tl.eventCallback('onUpdate', syncJourney);
ScrollTrigger.addEventListener('refresh', syncJourney); // refresh render lại timeline mà không bắn onUpdate
const labelScroll =(label) => journeyST.start + (tl.labels[label] / tl.duration()) * (journeyST.end - journeyST.start);

/* ============================== Stage interaction ============================== */
let drag = null;
let hintGone = false;
const hideHint = () => { if (!hintGone) { hintGone = true; $('#exploreHint').classList.add('is-gone'); } };
const exploring = () => stage.classList.contains('is-explore') && !document.body.classList.contains('panel-open');
stage.addEventListener('pointerdown', (e) => {
  if (!exploring() || e.target.closest('.hs, .explore button, .dock')) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false, type: e.pointerType };
});
stage.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      drag.moved = true; stage.classList.add('is-dragging'); hideHint();
      try { stage.setPointerCapture(e.pointerId); } catch {}
    }
    if (drag.moved && scene) scene.dragBy(dx, drag.type === 'touch' ? 0 : dy);
    drag.x = e.clientX; drag.y = e.clientY;
    return;
  }
  if (e.pointerType === 'mouse' && exploring() && scene && !e.target.closest('.hs, .explore > *')) schedulePick(e.clientX, e.clientY);
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const wasClick = !drag.moved; drag = null; stage.classList.remove('is-dragging');
  if (wasClick && scene && e.type === 'pointerup') { const id = scene.pick(e.clientX, e.clientY); if (id) openPlace(id, hsEls[id]); }
};
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
let pickRaf = 0;
function schedulePick(x, y) {
  if (pickRaf) return;
  pickRaf = requestAnimationFrame(() => {
    pickRaf = 0;
    const id = scene.pick(x, y);
    setHover(id); stage.classList.toggle('is-pointer', !!id);
  });
}
$$('.seg [data-tod]').forEach((b) => b.addEventListener('click', () => {
  $$('.seg [data-tod]').forEach((x) => x.setAttribute('aria-checked', x === b));
  scene?.setTimeOfDay(b.dataset.tod);
}));
$$('.zoom [data-zoom]').forEach((b) => b.addEventListener('click', () => {
  if (!scene) return;
  const z = b.dataset.zoom;
  z === 'in' ? scene.zoomBy(0.82) : z === 'out' ? scene.zoomBy(1.2) : scene.resetView();
}));

/* ============================== Panel ============================== */
const panel = $('#panel'), scrim = $('#scrim');
const track = $('#pTrack');
let current = null, lastTrigger = null, panelOpen = false;

function renderPanel(p, animate) {
  const i = PLACES.indexOf(p);
  $('#pIndex').textContent = `${i + 1} / ${PLACES.length}`;
  $('#pKicker').textContent = `${p.num} · ${p.en}`;
  $('#pTitle').textContent = p.name;
  $('#pTag').textContent = p.tagline;
  $('#pSpecs').innerHTML = p.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  track.innerHTML = p.gallery.map(([src, cap], k) => `
    <figure data-k="${k}"><img alt="${cap}" ${k ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"
      srcset="${sized(src, 800)} 800w, ${sized(src, 1200)} 1200w, ${sized(src, 1800)} 1800w" sizes="(max-width: 860px) 100vw, 560px" src="${sized(src, 1200)}"></figure>`).join('');
  track.scrollLeft = 0;
  updateGallery();
  $('#tp-ov').innerHTML = `<p>${p.desc}</p>
    <ul class="feat">${p.features.slice(0, 4).map((f) => `<li>${f}</li>`).join('')}</ul>`;
  const hasIn = p.interior.length || p.pano;
  $('#tab-in').disabled = !hasIn;
  $('#tp-in').innerHTML = hasIn ? `
    ${p.pano ? `<button class="pano-card" data-pano style="background-image:url(${sized((p.interior[0] || p.gallery[0])[0], 900)})">
      <span class="badge">360°</span>
      <span><b><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12 2a4 10 0 010 20M12 2a4 10 0 000 20" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>Bước vào bên trong</b>
      <small>Tham quan 360° · ${p.pano.label}</small></span></button>` : ''}
    <div class="interior">${p.interior.map(([src, cap], k) => `<figure data-k="${k}"><div class="ph"><img loading="lazy" decoding="async" alt="${cap}" src="${sized(src, k ? 700 : 1100)}"></div><figcaption>${cap}</figcaption></figure>`).join('')}</div>` : '';
  $('#tp-am').innerHTML = `<ul class="feat">${p.features.map((f) => `<li>${f}</li>`).join('')}</ul>`;
  $('#pPrice').innerHTML = p.kind === 'villa'
    ? `<small>Giá từ</small><b>${vnd(p.price)}</b> <span>/ ${p.unit}</span>`
    : `<small>Giờ mở cửa</small><b>${p.hours}</b>`;
  $('#pCta').textContent = p.kind === 'villa' ? 'Đặt villa này' : p.cta;
  selectTab('ov', false);
  $$('img', panel).forEach(fadeImg);
  if (animate) for (const el of [$('#pBody'), $('#pGallery')]) { el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap'); }
}
function fadeImg(im) { const ok = () => im.classList.add('is-loaded'); im.complete && im.naturalWidth ? ok() : im.addEventListener('load', ok, { once: true }); }

function selectTab(key, focus = true) {
  for (const k of ['ov', 'in', 'am']) {
    const on = k === key;
    $(`#tab-${k}`).setAttribute('aria-selected', on);
    $(`#tab-${k}`).tabIndex = on ? 0 : -1;
    $(`#tp-${k}`).hidden = !on;
  }
  if (focus) $(`#tab-${key}`).focus();
}
$$('.tabs [role="tab"]').forEach((t) => t.addEventListener('click', () => selectTab(t.id.slice(4))));
$('.tabs').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const tabs = $$('.tabs [role="tab"]:not(:disabled)'), i = tabs.indexOf(document.activeElement);
  const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
  selectTab(n.id.slice(4));
});

function updateGallery() {
  const n = current ? current.gallery.length : 1, k = Math.round(track.scrollLeft / (track.clientWidth || 1));
  $('#pCount').textContent = `${k + 1} / ${n}`;
  $('#pCap').textContent = current ? current.gallery[k]?.[1] || '' : '';
  $('.gallery__btn--prev').disabled = k <= 0;
  $('.gallery__btn--next').disabled = k >= n - 1;
}
track.addEventListener('scroll', () => requestAnimationFrame(updateGallery), { passive: true });
const galleryGo = (d) => track.scrollBy({ left: d * track.clientWidth });
$('.gallery__btn--prev').addEventListener('click', () => galleryGo(-1));
$('.gallery__btn--next').addEventListener('click', () => galleryGo(1));
track.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') galleryGo(-1); if (e.key === 'ArrowRight') galleryGo(1); });
track.addEventListener('click', (e) => { const f = e.target.closest('figure'); if (f) openLightbox(current.gallery, +f.dataset.k); });
$('#tp-in').addEventListener('click', (e) => {
  if (e.target.closest('[data-pano]')) return openPano(current);
  const f = e.target.closest('figure'); if (f) openLightbox(current.interior, +f.dataset.k);
});

function openPlace(id, trigger) {
  const p = byId[id]; if (!p) return;
  hideHint();
  const switching = panelOpen;
  current = p;
  renderPanel(p, switching);
  for (const [k, el] of Object.entries(hsEls)) el.classList.toggle('is-active', k === id);
  scene?.setFocus(id);
  if (switching) return;
  lastTrigger = trigger || document.activeElement;
  panelOpen = true;
  lenis.stop();
  document.body.classList.add('panel-open');
  nav.classList.add('is-hidden');
  panel.hidden = false; scrim.hidden = false;
  requestAnimationFrame(() => { panel.classList.add('is-open'); scrim.classList.add('is-on'); });
  setTimeout(() => $('#pClose').focus({ preventScroll: true }), 60);
  if (scene) {
    const m = isMobile();
    scene.setShift(m ? 0 : panel.offsetWidth / 2 + 12, m ? panel.offsetHeight / 2 - 30 : 0);
  }
}
function closePanel({ keepScroll = false } = {}) {
  if (!panelOpen) return;
  panelOpen = false;
  panel.classList.remove('is-open'); scrim.classList.remove('is-on');
  panel.style.transform = '';
  document.body.classList.remove('panel-open');
  for (const el of Object.values(hsEls)) el.classList.remove('is-active');
  scene?.setFocus(null); scene?.setShift(0, 0);
  setTimeout(() => { if (!panelOpen) { panel.hidden = true; scrim.hidden = true; } }, 700);
  if (!keepScroll) lenis.start();
  nav.classList.remove('is-hidden');
  lastTrigger?.focus?.({ preventScroll: true });
}
const step = (d) => { const i = PLACES.indexOf(current); openPlace(PLACES[(i + d + PLACES.length) % PLACES.length].id); };
$('#pPrev').addEventListener('click', () => step(-1));
$('#pNext').addEventListener('click', () => step(1));
$('#pClose').addEventListener('click', () => closePanel());
scrim.addEventListener('click', () => closePanel());
$('#pCta').addEventListener('click', () => {
  const p = current;
  closePanel({ keepScroll: true });
  lenis.start();
  if (p.kind === 'villa') setVilla(p.id);
  else { const note = $('[name="note"]'); note.value = `${p.cta} tại ${p.name}: `; }
  lenis.scrollTo('#booking', { duration: 2.2, offset: -20 });
  setTimeout(() => (p.kind === 'villa' ? $('[name="checkin"]') : $('[name="note"]')).focus({ preventScroll: true }), 2300);
});

// Kéo bottom sheet xuống để đóng (mobile)
{
  const grip = $('#panelGrip'); let y0 = null, dy = 0;
  grip.addEventListener('pointerdown', (e) => { y0 = e.clientY; dy = 0; grip.setPointerCapture(e.pointerId); panel.style.transition = 'none'; });
  grip.addEventListener('pointermove', (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); panel.style.transform = `translateY(${dy}px)`; });
  const up = () => { if (y0 === null) return; y0 = null; panel.style.transition = ''; if (dy > 110) closePanel(); else panel.style.transform = ''; };
  grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up);
}

// Giữ focus trong dialog đang mở
function trapFocus(e, root) {
  const f = $$('button:not(:disabled), [href], input, textarea, [tabindex]:not([tabindex="-1"])', root).filter((el) => el.offsetParent !== null || el === document.activeElement);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

/* ============================== Lightbox ============================== */
const lb = $('#lightbox'); let lbList = [], lbK = 0;
function openLightbox(list, k) {
  lbList = list; lbK = k; showLb();
  lb.hidden = false; requestAnimationFrame(() => lb.classList.add('is-open'));
  $('#lbClose').focus();
}
function showLb() {
  const [src, cap] = lbList[lbK];
  const im = $('#lbImg'); im.src = sized(src, 2000); im.alt = cap;
  $('#lbCap').textContent = `${cap} · ${lbK + 1}/${lbList.length}`;
  $('#lbPrev').hidden = $('#lbNext').hidden = lbList.length < 2;
}
const lbStep = (d) => { lbK = (lbK + d + lbList.length) % lbList.length; showLb(); };
function closeLightbox() { lb.classList.remove('is-open'); setTimeout(() => (lb.hidden = true), 300); $('#pClose').focus({ preventScroll: true }); }
$('#lbClose').addEventListener('click', closeLightbox);
$('#lbPrev').addEventListener('click', () => lbStep(-1));
$('#lbNext').addEventListener('click', () => lbStep(1));
lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
{ let x0 = null; lb.addEventListener('pointerdown', (e) => (x0 = e.clientX)); lb.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) lbStep(e.clientX < x0 ? 1 : -1); x0 = null; }); }

/* ============================== Panorama 360 ============================== */
const panoEl = $('#pano'); let pano = null;
const PANOS = PLACES.filter((p) => p.pano);
async function openPano(p) {
  panoEl.hidden = false; requestAnimationFrame(() => panoEl.classList.add('is-open'));
  $('#panoHint').classList.remove('is-gone');
  $('#panoTabs').innerHTML = PANOS.map((x) => `<button data-id="${x.id}" aria-pressed="${x.id === p.id}">${x.pano.label} · ${x.name.replace('Villa ', '')}</button>`).join('');
  $('#panoClose').focus();
  if (!pano) {
    const { PanoViewer } = await import('./pano.js');
    pano = new PanoViewer($('#panoCanvas'));
    pano.onInteract = () => $('#panoHint').classList.add('is-gone');
  }
  pano.open();
  loadPano(p);
}
async function loadPano(p) {
  $('#panoTitle').textContent = `${p.pano.label} — ${p.name}`;
  $$('#panoTabs button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.id === p.id));
  const ld = $('#panoLoading'); ld.classList.remove('is-gone'); ld.querySelector('span').textContent = 'Đang tải không gian…';
  try { await pano.load(p.pano.src); ld.classList.add('is-gone'); }
  catch { ld.querySelector('span').textContent = 'Không tải được ảnh 360°. Kiểm tra kết nối và thử lại.'; }
}
$('#panoTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) loadPano(byId[b.dataset.id]); });
function closePano() { pano?.close(); panoEl.classList.remove('is-open'); setTimeout(() => (panoEl.hidden = true), 300); $('#pClose').focus({ preventScroll: true }); }
$('#panoClose').addEventListener('click', closePano);

/* ============================== Keyboard ============================== */
document.addEventListener('keydown', (e) => {
  const top = !panoEl.hidden ? panoEl : !lb.hidden ? lb : panelOpen ? panel : null;
  if (e.key === 'Escape' && top) { e.preventDefault(); top === panoEl ? closePano() : top === lb ? closeLightbox() : closePanel(); return; }
  if (e.key === 'Tab' && top) trapFocus(e, top);
  if (top === lb && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) lbStep(e.key === 'ArrowRight' ? 1 : -1);
});

/* ============================== Experiences ============================== */
const expTrack = $('#expTrack');
expTrack.innerHTML = EXPERIENCES.map((x, i) => `
  <article class="xcard"><img loading="lazy" decoding="async" alt="" srcset="${img(x.img, 600)} 600w, ${img(x.img, 1000)} 1000w" sizes="(max-width: 860px) 78vw, 440px" src="${img(x.img, 1000)}">
    <span class="xcard__idx">${String(i + 1).padStart(2, '0')}</span>
    <div class="xcard__body"><small>${x.meta}</small><h3>${x.title}</h3><p>${x.text}</p></div></article>`).join('');
gsap.matchMedia().add('(min-width: 861px)', () => {
  const dist = () => Math.max(0, expTrack.scrollWidth - innerWidth);
  gsap.to(expTrack, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.exp__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: reduce ? true : 0.6, invalidateOnRefresh: true },
  });
});

/* ============================== Numbers ============================== */
$$('[data-count]').forEach((el) => {
  const n = +el.dataset.count, suf = el.dataset.suffix || '', o = { v: 0 };
  el.textContent = '0' + suf;
  ScrollTrigger.create({
    trigger: el, start: 'top 85%', once: true,
    onEnter: () => gsap.to(o, { v: n, duration: reduce ? 0 : 1.8, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('vi-VN') + suf) }),
  });
});

/* ============================== Booking ============================== */
const form = $('#bookingForm');
const villaPick = $('#villaPick');
const VILLAS = PLACES.filter((p) => p.kind === 'villa');
villaPick.insertAdjacentHTML('beforeend', VILLAS.map((v, i) => `
  <label class="vopt"><input type="radio" name="villa" value="${v.id}" ${i === 1 ? 'checked' : ''}>
    <img src="${sized(v.gallery[0][0], 160)}" alt="" loading="lazy"><span><b>${v.name}</b><small>${short(v.price)} / đêm</small></span></label>`).join(''));
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const today = new Date();
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const cin = $('[name="checkin"]'), cout = $('[name="checkout"]');
cin.min = iso(today); cin.value = iso(addDays(today, 21)); cout.value = iso(addDays(today, 24)); cout.min = iso(addDays(today, 22));
const counts = { adults: 2, kids: 0 };
$$('.stepper').forEach((s) => {
  const [minus, plus] = $$('button', s), out = $('output', s), k = s.dataset.name, min = +s.dataset.min, max = +s.dataset.max;
  const sync = () => { out.textContent = counts[k]; minus.disabled = counts[k] <= min; plus.disabled = counts[k] >= max; };
  minus.addEventListener('click', () => { counts[k] = Math.max(min, counts[k] - 1); sync(); });
  plus.addEventListener('click', () => { counts[k] = Math.min(max, counts[k] + 1); sync(); });
  sync();
});
function nights() { const a = new Date(cin.value), b = new Date(cout.value); return Math.round((b - a) / 864e5); }
function updateSummary() {
  const v = byId[form.villa.value], n = nights();
  if (!(n > 0)) { $('#sumLine').textContent = 'Chọn ngày trả phòng sau ngày nhận phòng'; $('#sumTotal').textContent = '—'; return; }
  $('#sumLine').textContent = `${n} đêm × ${vnd(v.price)}`;
  $('#sumTotal').textContent = vnd(n * v.price);
}
function setVilla(id) { const r = form.querySelector(`[name="villa"][value="${id}"]`); if (r) { r.checked = true; updateSummary(); } }
cin.addEventListener('change', () => {
  const next = iso(addDays(new Date(cin.value), 1));
  cout.min = next; if (cout.value <= cin.value) cout.value = iso(addDays(new Date(cin.value), 3));
  updateSummary();
});
form.addEventListener('change', updateSummary);
form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-invalid'));
updateSummary();
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const errs = [];
  const bad = (name, msg) => { form[name].closest('.field').classList.add('is-invalid'); errs.push(msg); };
  if (!form.name.value.trim()) bad('name', 'Vui lòng nhập họ tên.');
  if (!/^[0-9+().\s-]{9,15}$/.test(form.phone.value.trim())) bad('phone', 'Số điện thoại chưa đúng định dạng.');
  if (!(nights() > 0)) bad('checkout', 'Ngày trả phòng phải sau ngày nhận phòng.');
  $('#formError').textContent = errs.join(' ');
  if (errs.length) { form.querySelector('.is-invalid input')?.focus(); return; }
  const v = byId[form.villa.value], n = nights(), first = form.name.value.trim().split(/\s+/).pop();
  const total = vnd(n * v.price);
  form.classList.add('is-sent');
  form.innerHTML = `<span class="tick"><svg width="30" height="30" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#12211d" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <h3>Cảm ơn ${first}!</h3>
    <p>Yêu cầu ${v.name} · ${n} đêm (${total}) đã được ghi nhận. Đội ngũ Lưu Vân Bay sẽ gọi lại trong 2 giờ. <br><small>(Website demo — chưa có yêu cầu nào được gửi đi.)</small></p>
    <button class="btn btn--dark" type="button" onclick="location.reload()">Gửi yêu cầu khác</button>`;
  ScrollTrigger.refresh();
});

/* ============================== Nav / chapters / progress ============================== */
const chapters = $('#chapters');
const bar = $('#progressBar');
function chapterAt(y) {
  const s = journeyST, H = innerHeight;
  if (y < s.start - H * 0.4) return 'top';
  if (y < s.end) { const t = ((y - s.start) / (s.end - s.start)) * tl.duration(); return t < 5.35 ? 'map' : t < EXPLORE_AT ? 'resort' : 'explore'; }
  const b = $('#booking').getBoundingClientRect().top + y;
  return y < b - H * 0.5 ? 'experiences' : 'booking';
}
let lastY = 0;
lenis.on('scroll', ({ scroll, progress, direction }) => {
  bar.style.transform = `scaleX(${progress})`;
  const ch = chapterAt(scroll);
  $$('button', chapters).forEach((b) => b.classList.toggle('is-active', b.dataset.go === ch));
  const afterJourney = scroll >= journeyST.end - 2;
  nav.classList.toggle('is-light', afterJourney);
  const inJourney = scroll > journeyST.start - 10 && !afterJourney;
  if (!panelOpen) nav.classList.toggle('is-hidden', inJourney && direction === 1 && scroll - lastY > 0);
  lastY = scroll;
});
ScrollTrigger.create({ trigger: '.numbers', start: 'top 50%', end: 'bottom 50%', onToggle: (s) => chapters.classList.toggle('is-light', !s.isActive && lenis.scroll > journeyST.end) });
ScrollTrigger.create({ trigger: '#experiences', start: 'top 50%', endTrigger: 'html', end: 'bottom bottom', onToggle: (s) => chapters.classList.toggle('is-light', s.isActive) });
ScrollTrigger.create({ trigger: '.foot', start: 'top 60%', onToggle: (s) => chapters.classList.toggle('is-muted', s.isActive) });

function go(target) {
  let y;
  if (target === 'top') y = 0;
  else if (tl.labels[target] !== undefined) y = labelScroll(target);
  else y = document.getElementById(target) ? document.getElementById(target).getBoundingClientRect().top + lenis.scroll : 0;
  const dist = Math.abs(y - lenis.scroll);
  lenis.scrollTo(y, { duration: reduce ? 0 : Math.min(3.2, Math.max(1.2, dist / 2600)), easing: (t) => 1 - Math.pow(1 - t, 4) });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-go], [data-scroll], [data-chapter]');
  if (!a) return;
  e.preventDefault();
  if (panelOpen) closePanel();
  if (a.dataset.go) go(a.dataset.go);
  else if (a.dataset.chapter) go(a.dataset.chapter);
  else go(a.dataset.scroll.slice(1));
});

/* ============================== Boot ============================== */
initScene().then(loader.step);
loader.ready.then(() => {
  $('#loader').classList.add('is-done');
  lenis.start();
  heroIntro();
  ScrollTrigger.refresh();
});
addEventListener('resize', () => updateMap());

// Debug: __lv.at(7.6) nhảy tới thời điểm 7.6 của timeline hành trình
window.__lv = { lenis, tl, get scene() { return scene; }, at: (t) => lenis.scrollTo(journeyST.start + (t / tl.duration()) * (journeyST.end - journeyST.start), { immediate: true, force: true }) };
