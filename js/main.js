import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createServiceModel } from './models.js';
import { CATEGORIES, SERVICES } from './services.js';
import { MISSIONS, QUIZ } from './missions.js';

// ---------- helpers & state ----------
const V3 = THREE.Vector3;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SVC = Object.fromEntries(SERVICES.map(s => [s.id, s]));
const catColor = id => CATEGORIES[SVC[id]?.category]?.color || '#888';
const LOCAL = {
  networking: { name: 'Network Junction', g: [-1, -1], icon: '🌐' }, compute: { name: 'Compute Heights', g: [0, -1], icon: '⚙️' }, storage: { name: 'Storage Docks', g: [1, -1], icon: '📦' },
  security: { name: 'Security Citadel', g: [-1, 0], icon: '🛡️' }, database: { name: 'Database District', g: [1, 0], icon: '🗄️' },
  management: { name: 'Ops Control', g: [-1, 1], icon: '📡' }, integration: { name: 'Integration Exchange', g: [0, 1], icon: '🔀' }, analytics: { name: 'Analytics Labs', g: [1, 1], icon: '📊' },
};
const save = Object.assign({ xp: 0, visited: {}, stars: {}, quizBest: 0 }, JSON.parse(localStorage.getItem('cloudcity') || '{}'));
const persist = () => { localStorage.setItem('cloudcity', JSON.stringify(save)); updateHud(); };
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
let toastTimer;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.opacity = 0, 2200); }
function addXp(n, why) { if (n <= 0) return; save.xp += n; persist(); toast(`✨ +${n} XP — ${why}`); }
const RANKS = [[0, 'Cloud Tourist'], [100, 'Cloud Practitioner'], [300, 'Junior Architect'], [600, 'Solutions Architect'], [1000, 'Principal Architect']];
function updateHud() {
  let i = RANKS.findLastIndex(r => save.xp >= r[0]); const next = RANKS[i + 1]?.[0];
  const pct = next ? (save.xp - RANKS[i][0]) / (next - RANKS[i][0]) * 100 : 100;
  const st = Object.values(save.stars).reduce((a, b) => a + b, 0);
  const seen = SERVICES.filter(s => save.visited[s.id]).length;
  $('#hud').innerHTML = `<span class="stat">🏅 <b>${RANKS[i][1]}</b> · ${save.xp} XP<span class="xpbar"><i style="width:${pct}%"></i></span></span><span class="stat">🧭 <b>${seen}/${SERVICES.length}</b> discovered</span><span class="stat">⭐ <b>${st}/${MISSIONS.length * 3}</b></span>`;
}

// ---------- scene ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
{ // gradient sky
  const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#03040c'); g.addColorStop(0.55, '#0b1030'); g.addColorStop(0.8, '#2a1650'); g.addColorStop(1, '#5a2350');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; scene.background = t;
}
scene.fog = new THREE.Fog('#150f38', 80, 260);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
camera.position.set(0, 52, 96);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI * 0.485; controls.minDistance = 2.5; controls.maxDistance = 90; controls.autoRotateSpeed = 0.7;
controls.enableZoom = false; // custom: two-finger scroll pans, pinch / mouse wheel zooms (fast)
renderer.domElement.addEventListener('wheel', e => {
  e.preventDefault(); if (mode === 'intro') return;
  fly = null;
  const off = camera.position.clone().sub(controls.target);
  const mouseWheel = !e.ctrlKey && e.deltaX === 0 && Math.abs(e.deltaY) >= 50;
  if (e.ctrlKey || mouseWheel) {
    const k = Math.exp(e.ctrlKey ? e.deltaY * 0.022 : Math.sign(e.deltaY) * 0.22);
    camera.position.copy(controls.target).add(off.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, off.length() * k))));
  } else {
    const f = off.clone().setY(0).normalize().negate(), r = new V3(-f.z, 0, f.x), sc = Math.max(8, off.length()) * 0.0019;
    const mv = r.multiplyScalar(e.deltaX * sc).add(f.multiplyScalar(-e.deltaY * sc));
    const nt = controls.target.clone().add(mv), lim = mode === 'explore' ? 120 : 16;
    nt.x = Math.max(-lim, Math.min(lim, nt.x)); nt.z = Math.max(-lim, Math.min(lim, nt.z));
    mv.copy(nt).sub(controls.target); controls.target.add(mv); camera.position.add(mv);
  }
}, { passive: false });
scene.add(new THREE.HemisphereLight('#a9b8ff', '#241a44', 1.5));
const sun = new THREE.DirectionalLight('#ffe9d0', 2.0);
sun.position.set(30, 50, 25); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 160 });
scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshStandardMaterial({ color: '#0a0d1e', roughness: 0.95 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
{ // stars
  const p = new Float32Array(1500);
  for (let i = 0; i < 1500; i += 3) { const a = Math.random() * 6.28, r = 150 + Math.random() * 60; p[i] = Math.cos(a) * r; p[i + 1] = 20 + Math.random() * 130; p[i + 2] = Math.sin(a) * r; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: '#dfe6ff', size: 0.8, fog: false })));
}
let winMats;
{ // skyline backdrop with lit windows
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 128);
  for (let r = 0; r < 16; r++) for (let q = 0; q < 6; q++) if (Math.random() < 0.38) { x.fillStyle = ['#ffd27a', '#7fd4ff', '#ff9ad5', '#fff3c4'][Math.floor(Math.random() * 4)]; x.fillRect(4 + q * 10, 3 + r * 8, 6, 4); }
  winMats = [[1, 1], [2, 2], [2, 4]].map(([u, v]) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(u, v); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ color: '#0b0f24', emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.6 }); });
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * 6.28, r = 125 + Math.random() * 50, h = 10 + Math.random() * 42, w = 5 + Math.random() * 7;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), winMats[h > 36 ? 2 : h > 22 ? 1 : 0]); b.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); b.rotation.y = Math.random(); scene.add(b);
  }
}
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.7, 0.8);
composer.addPass(bloom); composer.addPass(new OutputPass());
function resize() { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

function makeLabel(text, { color = '#ffffff', size = 1, sub = '' } = {}) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), f1 = '700 40px "Space Grotesk", system-ui, sans-serif', f2 = '500 25px system-ui, sans-serif';
  ctx.font = f1; let w = ctx.measureText(text).width;
  if (sub) { ctx.font = f2; w = Math.max(w, ctx.measureText(sub).width); }
  w = Math.ceil(w) + 44; const h = sub ? 100 : 64;
  c.width = w; c.height = h;
  ctx.fillStyle = 'rgba(6,9,24,.86)'; ctx.beginPath(); ctx.roundRect(0, 0, w, h, 20); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(2, 2, w - 4, h - 4, 18); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = f1; ctx.fillStyle = '#e9ecf8'; ctx.fillText(text, w / 2, 35);
  if (sub) { ctx.font = f2; ctx.fillStyle = '#9fb0e0'; ctx.fillText(sub, w / 2, 75); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(w / 64 * 0.42 * size, h / 64 * 0.42 * size, 1); sp.renderOrder = 10;
  return sp;
}
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const hitGeo = new THREE.BoxGeometry(1.8, 2.3, 1.8);
function makeHolder(id, s = 1) {
  const g = new THREE.Group();
  let m;
  try { m = createServiceModel(id); } catch (e) { console.error(id, e); }
  if (!m) m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: catColor(id) }));
  g.add(m);
  const label = makeLabel(SVC[id]?.short || id, { color: catColor(id), sub: SVC[id]?.role || '' }); label.position.y = 2.75; g.add(label);
  const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.y = 1.15; hit.userData.holder = g; g.add(hit);
  g.userData = { serviceId: id, model: m, hit, s, label };
  g.scale.setScalar(s);
  return g;
}

// ---------- camera flight ----------
let fly = null;
function flyTo(pos, target, dur = 0.9) { fly = { p0: camera.position.clone(), p1: pos.clone(), t0: controls.target.clone(), t1: target.clone(), t: 0, dur }; }

// ---------- THE CITY ----------
const world = new THREE.Group(), build = new THREE.Group(), quizG = new THREE.Group();
scene.add(world, build, quizG);
const pick = { explore: [], mission: [], quiz: [] };
const cityHolders = [];   // {h, x, z, id}
const PITCH = 42, BLOCK = 34, HALF = PITCH * 1.5;
const blockCenter = c => new V3(LOCAL[c].g[0] * PITCH, 0, LOCAL[c].g[1] * PITCH);
const gridTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#4a4a4a'; x.fillRect(0, 0, 64, 64); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(0, 0, 64, 64); x.fillStyle = '#fff'; x.fillRect(29, 29, 6, 6); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 12); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const markerGeo = new THREE.OctahedronGeometry(0.22), markerMat = new THREE.MeshBasicMaterial({ color: '#ffd24a' });
{
  for (const cid in LOCAL) {
    const list = SERVICES.filter(s => s.category === cid);
    if (!list.length || !CATEGORIES[cid]) continue;
    const cc = blockCenter(cid), col = new THREE.Color(CATEGORIES[cid].color);
    const d = new THREE.Group(); d.position.copy(cc); world.add(d);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(BLOCK, 0.3, BLOCK), new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.5), map: gridTex, roughness: 0.8 }));
    slab.position.y = 0.15; slab.receiveShadow = true; d.add(slab);
    const trimMat = new THREE.MeshBasicMaterial({ color: col });
    for (const [x, z, w, dp] of [[0, BLOCK / 2, BLOCK, 0.14], [0, -BLOCK / 2, BLOCK, 0.14], [BLOCK / 2, 0, 0.14, BLOCK], [-BLOCK / 2, 0, 0.14, BLOCK]]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, dp), trimMat); t.position.set(x, 0.32, z); d.add(t);
    }
    const beamMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 });
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 16, 6), beamMat); b.position.set(sx * BLOCK / 2, 8, sz * BLOCK / 2); d.add(b);
    }
    const sign = makeLabel(`${LOCAL[cid].icon} ${LOCAL[cid].name}`, { color: CATEGORIES[cid].color, size: 3.4, sub: CATEGORIES[cid].name }); sign.position.set(0, 13, 0); d.add(sign);
    const cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols), sp = Math.min(9, (BLOCK - 5) / cols);
    const plotMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.3), emissive: col, emissiveIntensity: 0.12, roughness: 0.6 });
    list.forEach((s, i) => {
      const h = makeHolder(s.id, 2);
      const x = (i % cols - (cols - 1) / 2) * sp, z = (Math.floor(i / cols) - (rows - 1) / 2) * sp;
      const plot = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.06, 40), plotMat); plot.position.set(x, 0.33, z); plot.receiveShadow = true; d.add(plot);
      h.position.set(x, 0.36, z); d.add(h); pick.explore.push(h.userData.hit);
      if (!save.visited[s.id]) { const mk = new THREE.Mesh(markerGeo, markerMat); mk.position.y = 3.3; h.add(mk); h.userData.marker = mk; }
      cityHolders.push({ h, x: cc.x + x, z: cc.z + z, id: s.id });
    });
  }
  // roads: dashed centre lines + lamps
  const lines = [-HALF, -PITCH / 2, PITCH / 2, HALF], dashes = [];
  for (const r of lines) for (let t = -HALF; t <= HALF; t += 3) { dashes.push([r, t, 0], [t, r, 1]); }
  const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.03, 1.3), new THREE.MeshBasicMaterial({ color: '#8a7a3a' }), dashes.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), QY = new THREE.Quaternion().setFromAxisAngle(new V3(0, 1, 0), Math.PI / 2), S = new V3(1, 1, 1);
  dashes.forEach(([x, z, rot], i) => dash.setMatrixAt(i, M.compose(new V3(x, 0.02, z), rot ? QY : Q, S)));
  world.add(dash);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6), new THREE.MeshStandardMaterial({ color: '#2a3158' }), 16);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 10), new THREE.MeshBasicMaterial({ color: '#ffd9a0' }), 16);
  let n = 0; for (const a of lines) for (const b of lines) { poles.setMatrixAt(n, M.makeTranslation(a + 2.6, 2.1, b + 2.6)); bulbs.setMatrixAt(n++, M.makeTranslation(a + 2.6, 4.3, b + 2.6)); }
  world.add(poles, bulbs);
  const roadMat = new THREE.MeshStandardMaterial({ color: '#191f3e', roughness: 0.9 });
  for (const r of lines) { const a = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.02, HALF * 2 + 6.4), roadMat); a.position.set(r, 0.004, 0); a.receiveShadow = true; const b = a.clone(); b.rotation.y = Math.PI / 2; b.position.set(0, 0.008, r); world.add(a, b); }
  const carN = 48, carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.5, 1.9), new THREE.MeshStandardMaterial({ roughness: 0.35 }), carN), carLight = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.16, 0.14), new THREE.MeshBasicMaterial({ color: '#fff3c4' }), carN);
  const cars = [], carCol = new THREE.Color();
  for (let i = 0; i < carN; i++) { cars.push({ r: lines[i % 4], ax: (i >> 2) % 2, dir: i % 2 ? 1 : -1, t: (Math.random() * 2 - 1) * HALF, v: 5 + Math.random() * 7 }); carBody.setColorAt(i, carCol.setHSL(Math.random(), 0.75, 0.55)); }
  world.add(carBody, carLight); world.userData.cars = { cars, carBody, carLight, o: new THREE.Object3D() };
  for (let i = 0; i < 64; i++) { const side = i % 4, u = (Math.random() * 2 - 1) * (HALF + 16), off = HALF + 10 + Math.random() * 12, h = 4 + Math.random() * 15, w = 4 + Math.random() * 4; const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), winMats[h > 12 ? 1 : 0]); b.position.set(side < 2 ? u : (side === 2 ? off : -off), h / 2, side < 2 ? (side ? off : -off) : u); world.add(b); }
  // central plaza
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.3, 48), new THREE.MeshStandardMaterial({ color: '#1a2150', roughness: 0.7 })); plaza.position.y = 0.15; plaza.receiveShadow = true; world.add(plaza);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(10, 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: '#ff9900' })); ringM.rotation.x = Math.PI / 2; ringM.position.y = 0.34; world.add(ringM);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), new THREE.MeshBasicMaterial({ color: '#ff9900', wireframe: true })); core.position.y = 4.2; world.add(core);
  const core2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#ff6a00', emissiveIntensity: 1.6, flatShading: true })); core2.position.y = 4.2; world.add(core2);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.7, 1.6, 8), new THREE.MeshStandardMaterial({ color: '#2a3370', flatShading: true })); base.position.y = 1.1; base.castShadow = true; world.add(base);
  world.userData.core = core; world.userData.core2 = core2;
  const l = makeLabel('Region Plaza', { color: '#ff9900', size: 2.4, sub: 'us-east-1 · explore any district' }); l.position.y = 8; world.add(l);
  const trunkG = new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6), leafG = new THREE.ConeGeometry(0.55, 1.6, 7);
  const trunkM = new THREE.MeshStandardMaterial({ color: '#4a3525' }), leafM = new THREE.MeshStandardMaterial({ color: '#1f8a5a', emissive: '#0c4a30', emissiveIntensity: 0.5, flatShading: true });
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + 0.3, tr = new THREE.Mesh(trunkG, trunkM), lf = new THREE.Mesh(leafG, leafM); tr.position.set(Math.cos(a) * 9.2, 0.75, Math.sin(a) * 9.2); lf.position.set(tr.position.x, 1.9, tr.position.z); lf.castShadow = true; world.add(tr, lf); }
}
// avatar
const avatar = new THREE.Group(); avatar.visible = false; avatar.position.set(0, 0.3, 6);
{
  const white = new THREE.MeshStandardMaterial({ color: '#f2f4ff', roughness: 0.35 }), glow = new THREE.MeshBasicMaterial({ color: '#4de3ff' }), org = new THREE.MeshStandardMaterial({ color: '#ff9900', emissive: '#ff6a00', emissiveIntensity: 0.6 });
  const body = new THREE.Group(); avatar.add(body); avatar.userData.body = body;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.45, 6, 12), white); torso.position.y = 0.85; torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 16), white); head.position.y = 1.62; head.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.12), glow); visor.position.set(0, 1.64, 0.27);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), white); ant.position.y = 2.05;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07), org); tip.position.y = 2.22;
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.2), org); pack.position.set(0, 0.95, -0.34);
  const hover = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.06, 8, 20), glow); hover.rotation.x = Math.PI / 2; hover.position.y = 0.22;
  body.add(torso, head, visor, ant, tip, pack, hover);
}
const keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (mode === 'explore' && e.key.startsWith('Arrow')) e.preventDefault(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let nearHolder = null, targetYaw = 0, walkT = 0;
function viewAt(c, snap) { const p = new V3(c.x, 30, c.z + 40), tg = new V3(c.x, 1, c.z); if (snap) { camera.position.copy(p); controls.target.copy(tg); } else flyTo(p, tg, 0.8); }
function teleport(cid) { const c = blockCenter(cid); avatar.position.set(c.x, 0.3, c.z + BLOCK / 2 + 2.2); targetYaw = Math.PI; dest = null; viewAt(c); toast(`${LOCAL[cid].icon} Welcome to ${LOCAL[cid].name}`); }
function renderTravel() {
  $('#travel').innerHTML = `<button class="chipbtn" data-c="" style="--c:#ff9900">🏛️ Plaza</button>` + Object.entries(LOCAL).map(([c, l]) => {
    const list = SERVICES.filter(s => s.category === c); if (!list.length) return '';
    const v = list.filter(s => save.visited[s.id]).length;
    return `<button class="chipbtn ${v === list.length ? 'done' : ''}" data-c="${c}" style="--c:${CATEGORIES[c].color}">${l.icon} ${l.name}<b>${v}/${list.length}</b></button>`;
  }).join('');
  document.querySelectorAll('.chipbtn').forEach(b => b.onclick = () => { if (b.dataset.c) teleport(b.dataset.c); else { avatar.position.set(0, 0.3, 6); dest = null; viewAt({ x: 0, z: 0 }); } b.blur(); });
}

function serviceCard(id) {
  const s = SVC[id]; if (!s) return '';
  const li = a => (a || []).map(x => `<li>${esc(x)}</li>`).join('');
  return `<span class="chip" style="background:${catColor(id)}">${esc(CATEGORIES[s.category]?.name)}</span>${LOCAL[s.category] ? `<span class="dim" style="font-size:12px">${LOCAL[s.category].icon} ${LOCAL[s.category].name}</span>` : ''}
    <h2 style="margin-top:6px">${esc(s.name)}</h2>${s.role ? `<div class="role">${esc(s.role)}</div>` : ''}<p class="tag">“${esc(s.tagline)}”</p><p>${esc(s.description)}</p>
    <h3>🎯 Pick it when the question says…</h3><ul>${li(s.useWhen)}</ul>
    <h3>⚠️ Exam tips & traps</h3><ul>${li(s.examTips)}</ul>
    ${s.vs ? `<div class="vs"><b>Don't confuse:</b> ${esc(s.vs)}</div>` : ''}`;
}
function showService(id, holder) {
  $('#right').style.display = ''; $('#right').innerHTML = serviceCard(id); $('#right').scrollTop = 0;
  if (mode === 'explore' && !save.visited[id]) {
    save.visited[id] = 1; addXp(5, `discovered ${SVC[id].short}`); renderTravel();
    if (holder?.userData.marker) { holder.remove(holder.userData.marker); holder.userData.marker = null; }
  }
}
function exploreIntro() {
  $('#right').innerHTML = `<h2>Welcome, architect 👋</h2>
    <p>This is <b>Region Plaza</b>. Eight districts surround it — each one a domain of the <b>SAA-C03</b> exam.</p>
    <ul><li><b>Two-finger scroll</b> to glide over the city, <b>pinch</b> to zoom, <b>drag</b> to rotate</li><li><b>Click any building</b> to open its flashcard — go wherever you like</li><li><span style="color:#ffd24a">◆</span> gold markers = not discovered yet (+5 XP)</li><li>Use the district bar below to fast-travel</li></ul>
    <div class="coach">💡 Each label shows the service name and its <b>job in plain English</b> — learn the job first, the name second.</div>`;
}

// ---------- MISSIONS ----------
const TIER_NAMES = ['Edge & DNS', 'Front Door', 'Compute', 'Messaging', 'Data', 'Guardrails'];
const tierOf = id => Math.max(0, Math.min(5, SVC[id]?.tier ?? 2));
const tierX = t => -6.5 + t * 3.3;
const USERS_POS = new V3(-10.8, 0.9, 0);
const links = new THREE.Group(); build.add(links);
const linkMat = new THREE.LineBasicMaterial({ color: '#3f7bff', transparent: true, opacity: 0.55 });
let cur = null, placed = new Map(), busy = false, resultShown = false;
{
  const pad = new THREE.Mesh(new THREE.BoxGeometry(26, 0.3, 13), new THREE.MeshStandardMaterial({ color: '#10163a', roughness: 0.8 }));
  pad.position.set(0.6, 0.15, 0); pad.receiveShadow = true; build.add(pad);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(26, 0.3, 13)), new THREE.LineBasicMaterial({ color: '#ff9900' })); edge.position.copy(pad.position); build.add(edge);
  const U = build.userData; U.edge = edge;
  const gh = new THREE.GridHelper(200, 100, '#3a4cc0', '#1a2468'); gh.position.y = 0.03; build.add(gh);
  U.cloud = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(20.6, 5.6, 12.6)), new THREE.LineBasicMaterial({ color: '#ff9900', transparent: true, opacity: 0.6 })); U.cloud.position.set(tierX(2.5), 3.1, 0); build.add(U.cloud);
  const cl = makeLabel('☁️ AWS Cloud', { color: '#ff9900', size: 2, sub: 'Region us-east-1 · your architecture goes here' }); cl.position.set(tierX(2.5), 7.2, -6.3); build.add(cl);
  U.globe = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 2), new THREE.MeshBasicMaterial({ color: '#4de3ff', wireframe: true })); U.globe.position.set(USERS_POS.x, 4.6, 0); build.add(U.globe);
  U.threat = new THREE.Group(); U.threat.position.set(USERS_POS.x, 0, -4.4); build.add(U.threat);
  U.threatLabel = new THREE.Group(); U.threatLabel.position.set(USERS_POS.x, 3.4, -4.4); build.add(U.threatLabel);
  U.rings = [];
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 20, 6), new THREE.MeshBasicMaterial({ color: sx > 0 ? '#4de3ff' : '#ff9900', transparent: true, opacity: 0.4 })); b.position.set(0.6 + sx * 13, 10, sz * 6.5); build.add(b); }
  const dp = new Float32Array(900); for (let i = 0; i < 900; i += 3) { dp[i] = (Math.random() - 0.5) * 30; dp[i + 1] = Math.random() * 9; dp[i + 2] = (Math.random() - 0.5) * 16; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  U.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: '#9db8ff', size: 0.09, transparent: true, opacity: 0.8 })); build.add(U.dust);
  TIER_NAMES.forEach((n, t) => {
    const lc = ['#8c4fff', '#4de3ff', '#ff9900', '#e7157b', '#3b6ef5', '#dd344c'][t];
    const l = makeLabel(n, { color: lc, size: 1.25 }); l.position.set(tierX(t), 0.7, 7.4); build.add(l);
    const holo = new THREE.Mesh(new THREE.PlaneGeometry(3, 5.4), new THREE.MeshBasicMaterial({ color: lc, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false })); holo.position.set(tierX(t), 3, -6.28); build.add(holo);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.06, 0.12), new THREE.MeshBasicMaterial({ color: lc })); bar.position.set(tierX(t), 0.34, 6); build.add(bar); const bar2 = bar.clone(); bar2.position.z = -6; build.add(bar2);
    for (const z of [-3, 0, 3]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.03, 6, 32), new THREE.MeshBasicMaterial({ color: lc, transparent: true, opacity: 0.4 })); r.rotation.x = Math.PI / 2; r.position.set(tierX(t), 0.36, z); build.add(r); build.userData.rings.push(r); }
    const strip = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.04, 12), new THREE.MeshStandardMaterial({ color: t % 2 ? '#161f4c' : '#1b2659' }));
    strip.position.set(tierX(t), 0.32, 0); strip.receiveShadow = true; build.add(strip);
  });
  const users = new THREE.Group();
  const um = new THREE.MeshStandardMaterial({ color: '#7fd4ff', emissive: '#1b8fd0', emissiveIntensity: 0.7 });
  [[-0.5, 0], [0.5, 0.2], [0, -0.5]].forEach(([x, z]) => {
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8), um); b.position.set(x, 0.65, z); b.castShadow = true;
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), um); h.position.set(x, 1.3, z);
    users.add(b, h);
  });
  const ul = makeLabel('Users', { color: '#7fd4ff', sub: 'the internet' }); ul.position.y = 2.5; users.add(ul);
  users.position.set(USERS_POS.x, 0.3, 0); build.add(users);
}
function setThreat(kind) {
  const g = build.userData.threat, lg = build.userData.threatLabel; g.clear(); lg.clear();
  if (!kind) return;
  const [txt, sub, col] = { ddos: ['🔥 Botnet', 'DDoS attack source', '#ff3350'], spike: ['📈 Flash crowd', '10× normal traffic', '#ffd24a'], outage: ['⚡ AZ failure', 'one data centre goes dark', '#c9a6ff'] }[kind];
  const mat = new THREE.MeshBasicMaterial({ color: col, wireframe: kind !== 'ddos' });
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(kind === 'ddos' ? new THREE.OctahedronGeometry(0.34) : new THREE.TetrahedronGeometry(0.3), mat); const a = i / 7 * 6.28; m.position.set(Math.cos(a) * 1.2, 1 + (i % 3) * 0.5, Math.sin(a) * 1.2); g.add(m); }
  lg.add(makeLabel(txt, { color: col, sub }));
}
function layout() {
  const cols = {};
  for (const [id, h] of placed) (cols[tierOf(id)] ||= []).push(h);
  for (const t in cols) cols[t].forEach((h, i) => { h.userData.goal = new V3(tierX(+t), 0.3, (i - (cols[t].length - 1) / 2) * Math.min(2.7, 11.5 / cols[t].length)); });
  links.clear();
  let prev = [new V3(USERS_POS.x, 0, 0)];
  for (let t = 0; t <= 4; t++) {
    if (!cols[t]) continue;
    const now = cols[t].map(h => h.userData.goal);
    for (const a of prev) for (const b of now) links.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([a.clone().setY(0.45), b.clone().setY(0.45)]), linkMat));
    prev = now;
  }
}
function togglePlace(id) {
  if (busy) return;
  if (placed.has(id)) { const h = placed.get(id); build.remove(h); pick.mission.splice(pick.mission.indexOf(h.userData.hit), 1); placed.delete(id); }
  else { const h = makeHolder(id); h.position.set(tierX(tierOf(id)), 7, 0); build.add(h); pick.mission.push(h.userData.hit); placed.set(id, h); }
  layout(); renderPalette();
}
function clearBuild() { for (const h of placed.values()) build.remove(h); placed.clear(); pick.mission.length = 0; links.clear(); }
function renderPalette() {
  const el = $('#palette'); if (!el || !cur) return;
  el.innerHTML = cur.palette.map(id => `<button class="pal ${placed.has(id) ? 'on' : ''}" data-id="${id}" style="--c:${catColor(id)}">${placed.has(id) ? '✓ ' : ''}${esc(SVC[id]?.short || id)}<small>${esc(SVC[id]?.role || '')}</small></button>`).join('');
  el.querySelectorAll('.pal').forEach(b => {
    b.onclick = () => togglePlace(b.dataset.id);
    b.onmouseenter = () => { if (!resultShown && !busy) $('#right').innerHTML = serviceCard(b.dataset.id); };
  });
  $('#count').textContent = `${placed.size} placed`;
}
const THREAT = { ddos: '🔥 DDoS attack', spike: '📈 Traffic spike', outage: '⚡ AZ outage' };
function missionList() {
  cur = null; clearBuild(); resultShown = false; setThreat(null);
  $('#left').innerHTML = `<h2>🏗️ Architect Missions</h2><p class="dim">A client needs a design. Meet every requirement — without over-engineering.</p>` +
    MISSIONS.map((m, i) => `<div class="mcard" data-i="${i}"><div class="t">${i + 1}. ${esc(m.title)}</div>
      <div class="s"><span>${esc(m.domain)} · ${'●'.repeat(m.difficulty)}${'○'.repeat(3 - m.difficulty)} ${m.threat ? '· ' + THREAT[m.threat] : ''}</span><span class="stars">${starStr(save.stars[m.id] || 0)}</span></div></div>`).join('');
  document.querySelectorAll('.mcard').forEach(c => c.onclick = () => openMission(+c.dataset.i));
  $('#right').innerHTML = `<h2>How missions work</h2><ul><li>Read the client brief and requirements</li><li><b>Hover</b> a service to read what it does, <b>click</b> to place or remove it</li><li>Stuck? Every requirement has a <b>💡 Hint</b>, then a <b>👀 Show me</b></li><li>Hit <b>Deploy</b> and watch live traffic hit your design</li></ul>
    <div class="coach">★★★ = every requirement met, no trap services, nothing unnecessary. Exactly how the exam scores “MOST cost-effective”.</div>`;
}
function openMission(i) {
  cur = MISSIONS[i]; clearBuild(); resultShown = false; setThreat(cur.threat);
  $('#left').innerHTML = `<button class="btn small" id="back">← All missions</button>
    <h2 style="margin-top:10px">${esc(cur.title)}</h2><span class="chip" style="background:#3b4a8a">${esc(cur.domain)}</span>${cur.threat ? `<span class="chip" style="background:#a3283a">${THREAT[cur.threat]} incoming</span>` : ''}
    <h3>Client brief</h3><p>${esc(cur.brief)}</p>
    <h3>Requirements</h3>
    <ul class="req">${cur.requirements.map((r, j) => `<li id="req${j}"><span>☐ ${esc(r.text)}</span> <button class="btn small hint" data-j="${j}" data-l="0">💡 Hint</button><small class="hintt" id="hint${j}"></small></li>`).join('')}</ul>
    <h3>Service palette <span id="count" style="float:right"></span></h3><div class="palette" id="palette"></div>
    <div class="row"><button class="btn primary" id="deploy">🚀 Deploy to production</button><button class="btn" id="clear">Clear</button></div>`;
  $('#left').scrollTop = 0;
  $('#back').onclick = () => { if (!busy) missionList(); };
  $('#clear').onclick = () => { if (!busy) { clearBuild(); renderPalette(); } };
  $('#deploy').onclick = deploy;
  document.querySelectorAll('.hint').forEach(b => b.onclick = () => {
    const r = cur.requirements[b.dataset.j];
    if (b.dataset.l === '0') { $('#hint' + b.dataset.j).textContent = '💡 ' + (r.hint || 'Think about which service is purpose-built for this.'); b.dataset.l = '1'; b.textContent = '👀 Show me'; }
    else r.anyOf[0].forEach(id => { const p = document.querySelector(`.pal[data-id="${id}"]`); if (p) { p.classList.remove('pulse'); void p.offsetWidth; p.classList.add('pulse'); } });
  });
  renderPalette();
  $('#right').innerHTML = `<h2>📋 Mission briefing</h2><p>${esc(cur.brief)}</p>
    ${cur.coach ? `<div class="coach">🧑‍🏫 <b>Coach:</b> ${esc(cur.coach)}</div>` : ''}
    <p class="dim">Services snap into lanes. Traffic flows Users → Edge → Front Door → Compute → Messaging → Data. Guardrails (security & ops) watch over everything.</p>
    <p class="dim">Hover any palette service to read its flashcard here.</p>`;
}
// traffic simulation
const packets = [];
const pGeo = new THREE.SphereGeometry(0.13, 10, 10);
const pMat = { ok: new THREE.MeshBasicMaterial({ color: '#4de3ff' }), bad: new THREE.MeshBasicMaterial({ color: '#ff3350' }), atk: new THREE.MeshBasicMaterial({ color: '#ff7a1a' }), idle: new THREE.MeshBasicMaterial({ color: '#3f6fd8' }) };
let sim = null;
function makePath(cut) {
  const pts = [USERS_POS.clone().add(new V3(0, 0, (Math.random() - 0.5) * 1.5))];
  for (let t = 0; t <= 4; t++) {
    const hs = [...placed].filter(([id]) => tierOf(id) === t).map(([, h]) => h);
    if (hs.length) { const h = hs[Math.floor(Math.random() * hs.length)]; pts.push(h.position.clone().setY(1.2)); }
  }
  if (pts.length < 2) pts.push(new V3(-4, 0.9, 0));
  return cut ? pts.slice(0, Math.max(2, Math.ceil(pts.length / 2) + 1)) : pts;
}
function spawn(kind, pts, dieAt) {
  const m = new THREE.Mesh(pGeo, pMat[kind]); if (kind === 'atk') m.scale.setScalar(1.5); if (kind === 'idle') m.scale.setScalar(0.65);
  build.add(m); packets.push({ m, pts, seg: 0, t: 0, dieAt, kind });
}
function deploy() {
  if (busy || !cur) return;
  if (!placed.size) return toast('Place at least one service first');
  const has = id => placed.has(id);
  const res = cur.requirements.map(r => r.anyOf.some(g => g.every(has)));
  const ok = res.every(Boolean);
  const traps = (cur.traps || []).filter(t => has(t.service));
  const over = placed.size > cur.maxServices;
  const stars = ok ? Math.max(1, 3 - (traps.length ? 1 : 0) - (over ? 1 : 0)) : 0;
  busy = true; $('#deploy').disabled = true;
  $('#banner').style.display = 'block';
  sim = { t: 0, next: 0, rate: cur.threat === 'spike' ? 0.04 : 0.09, ok, ddos: cur.threat === 'ddos', shielded: has('shield') || has('waf'), served: 0, dropped: 0, blocked: 0,
    title: { ddos: '🔥 DDoS attack in progress', spike: '📈 10× traffic spike', outage: '⚡ AZ failure simulated' }[cur.threat] || '🚦 Production traffic',
    done: () => { busy = false; $('#banner').style.display = 'none'; if ($('#deploy')) $('#deploy').disabled = false; showResult(res, ok, traps, over, stars); } };
}
function showResult(res, ok, traps, over, stars) {
  const m = cur, prev = save.stars[m.id] || 0; resultShown = true; celebrate(ok);
  res.forEach((r, j) => { const li = $('#req' + j); if (li) { li.className = r ? 'ok' : 'bad'; li.firstElementChild.textContent = (r ? '✅ ' : '❌ ') + m.requirements[j].text; } });
  if (stars > prev) { save.stars[m.id] = stars; addXp((stars - prev) * 20, 'mission progress'); }
  const idx = MISSIONS.indexOf(m);
  $('#right').innerHTML = `<div class="stars big">${starStr(stars)}</div>
    <h2 class="${ok ? 'okc' : 'badc'}">${ok ? 'Architecture approved! 🎉' : 'Failed architecture review'}</h2>
    <ul class="req">${m.requirements.map((r, j) => `<li class="${res[j] ? 'ok' : 'bad'}">${res[j] ? '✅' : '❌'} <b>${esc(r.text)}</b><small>${esc(res[j] ? r.explain : '💡 ' + (r.hint || 'Something is missing here.'))}</small></li>`).join('')}</ul>
    ${traps.length ? `<h3>Traps you fell for (−1 ★)</h3><ul class="req">${traps.map(t => `<li class="bad">⚠️ <b>${esc(SVC[t.service]?.short)}</b><small>${esc(t.text)}</small></li>`).join('')}</ul>` : ''}
    ${over ? `<p class="badc">⚠️ Over-engineered (−1 ★): ${placed.size} services placed, but ${m.maxServices} or fewer do the job.</p>` : ''}
    ${ok ? `<div class="vs"><b>🎓 Exam takeaway:</b> ${esc(m.lesson)}</div>` : '<p class="dim">Adjust your design and deploy again — the unmet requirements now show their hints.</p>'}
    <div class="row">${ok && idx < MISSIONS.length - 1 ? '<button class="btn primary" id="next">Next mission →</button>' : ''}${ok && stars < 3 ? '<button class="btn" id="retry">Go for ★★★</button>' : ''}<button class="btn" id="list">All missions</button></div>`;
  $('#right').scrollTop = 0;
  if ($('#next')) $('#next').onclick = () => openMission(idx + 1);
  if ($('#retry')) $('#retry').onclick = () => { resultShown = false; };
  $('#list').onclick = missionList;
}

// ---------- QUIZ ----------
let qz = null, quizModel = null;
{
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2, 0.4, 32), new THREE.MeshStandardMaterial({ color: '#1e2a5e' }));
  ped.position.y = 0.2; ped.receiveShadow = true; quizG.add(ped);
  const r = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: '#ff9900' })); r.rotation.x = Math.PI / 2; r.position.y = 0.42; quizG.add(r);
}
function setQuizModel(id) {
  if (quizModel) quizG.remove(quizModel); quizModel = null;
  if (id && SVC[id]) { quizModel = makeHolder(id, 1.6); quizModel.position.y = 0.4; quizG.add(quizModel); }
}
function startQuiz() { qz = { qs: [...QUIZ].sort(() => Math.random() - 0.5).slice(0, 10), i: 0, score: 0 }; showQ(); }
function showQ() {
  const q = qz.qs[qz.i]; setQuizModel(null);
  $('#quiz').innerHTML = `<div class="dim" style="display:flex;justify-content:space-between"><span>Question ${qz.i + 1} / ${qz.qs.length} · <span class="chip" style="background:#3b4a8a">${esc(q.domain)}</span></span><span>Score <b>${qz.score}</b></span></div>
    <p style="font-size:16px;font-weight:600">${esc(q.q)}</p>
    ${q.options.map((o, j) => `<button class="btn opt" data-j="${j}">${'ABCD'[j]}. ${esc(o)}</button>`).join('')}<div id="fb"></div>`;
  document.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const j = +b.dataset.j, right = j === q.answer;
    document.querySelectorAll('.opt').forEach((x, k) => { x.disabled = true; if (k === q.answer) x.classList.add('right'); else if (k === j) x.classList.add('wrong'); });
    if (right) { qz.score++; addXp(10, 'correct answer'); }
    setQuizModel(q.service);
    const last = qz.i === qz.qs.length - 1;
    $('#fb').innerHTML = `<div class="explain"><b class="${right ? 'okc' : 'badc'}">${right ? 'Correct!' : 'Not quite.'}</b> ${esc(q.explain)}</div>
      <div class="row"><button class="btn primary" id="nq">${last ? 'See results' : 'Next →'}</button>${SVC[q.service] ? `<button class="btn" id="card">📇 ${esc(SVC[q.service].short)} flashcard</button>` : ''}</div>`;
    $('#nq').onclick = () => { $('#right').style.display = 'none'; last ? endQuiz() : (qz.i++, showQ()); };
    if ($('#card')) $('#card').onclick = () => { $('#right').style.display = ''; $('#right').innerHTML = serviceCard(q.service); };
    $('#quiz').scrollTop = 1e4;
  });
}
function endQuiz() {
  const pct = Math.round(qz.score / qz.qs.length * 100);
  if (qz.score > save.quizBest) { save.quizBest = qz.score; persist(); }
  setQuizModel(null);
  $('#quiz').innerHTML = `<h2>Drill complete — ${qz.score}/${qz.qs.length} (${pct}%)</h2>
    <p>${pct >= 72 ? '🎉 Above the ~72% SAA pass mark. Keep it up!' : 'The real exam needs ~72%. Revisit the flashcards in the city and try again.'}</p>
    <p class="dim">Best round: ${save.quizBest}/10 · ${QUIZ.length} questions in the pool</p><div class="row"><button class="btn primary" id="again">New round</button></div>`;
  $('#again').onclick = startQuiz;
}

// ---------- modes ----------
let mode = 'intro';
function setMode(m) {
  mode = m; fly = null; controls.autoRotate = false;
  $('#intro').style.opacity = 0; setTimeout(() => $('#intro').style.display = 'none', 600);
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  world.visible = m === 'explore'; build.visible = m === 'mission'; quizG.visible = m === 'quiz';
  $('#left').style.display = m === 'mission' ? '' : 'none';
  $('#right').style.display = m === 'quiz' ? 'none' : '';
  $('#quiz').style.display = m === 'quiz' ? '' : 'none';
  $('#travel').style.display = m === 'explore' ? '' : 'none';
  $('#keys').style.display = m === 'explore' ? '' : 'none';
  controls.maxDistance = m === 'explore' ? 160 : 90;
  if (m === 'explore') { exploreIntro(); renderTravel(); nearHolder = null; viewAt({ x: 0, z: 0 }, true); }
  if (m === 'mission') { missionList(); flyTo(new V3(0.6, 20, 24), new V3(0.6, 0, 1)); }
  if (m === 'quiz') { startQuiz(); flyTo(new V3(0, 6, 10), new V3(0, 3.6, 0)); }
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { if (!busy) setMode(b.dataset.mode); b.blur(); });
$('#enter').onclick = () => setMode('explore');

// ---------- picking ----------
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let hover = null, down = null;
function pickAt(e) {
  mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(pick[mode] || [], false)[0];
  return hit ? hit.object.userData.holder : null;
}
const cv = renderer.domElement;
cv.addEventListener('pointermove', e => { hover = pickAt(e); cv.style.cursor = hover ? 'pointer' : 'grab'; });
cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
cv.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
  const h = pickAt(e);
  if (h) {
    if (mode === 'mission') resultShown = false;
    showService(h.userData.serviceId, h);
  }
});

// ---------- loop ----------
const clock = new THREE.Clock();
function animHolder(o, t, dt) {
  const u = o.userData;
  try { u.model.userData.animate?.(t); } catch (e) { u.model.userData.animate = null; }
  const target = u.s * (o === hover || o === nearHolder ? 1.15 : 1);
  o.scale.setScalar(o.scale.x + (target - o.scale.x) * Math.min(1, dt * 10));
  if (u.goal) o.position.lerp(u.goal, Math.min(1, dt * 7));
  if (u.marker) { u.marker.rotation.y = t * 2; u.marker.position.y = 3.5 + Math.sin(t * 3 + o.id) * 0.12; }
}
let dest = null;
const groundPlane = new THREE.Plane(new V3(0, 1, 0), -0.3);
function walk() { // free camera: only cull far-away labels
  for (const c of cityHolders) c.h.userData.label.visible = camera.position.distanceTo(c.h.userData.wp ||= c.h.getWorldPosition(new V3())) < 80;
}
function driveCars(dt) {
  const { cars, carBody, carLight, o } = world.userData.cars, L = HALF + 3;
  cars.forEach((c, i) => {
    c.t += c.dir * c.v * dt; if (c.t > L) c.t = -L; if (c.t < -L) c.t = L;
    for (const [mesh, f, y] of [[carBody, 0, 0.3], [carLight, 0.95, 0.34]]) {
      const along = c.t + c.dir * f;
      if (c.ax) { o.position.set(along, y, c.r + c.dir * 1.5); o.rotation.y = Math.PI / 2; } else { o.position.set(c.r - c.dir * 1.5, y, along); o.rotation.y = 0; }
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    }
  });
  carBody.instanceMatrix.needsUpdate = carLight.instanceMatrix.needsUpdate = true;
}
const sparks = []; let idleT = 0;
const ORANGE = new THREE.Color('#ff9900');
function celebrate(ok) {
  build.userData.flash = { t: 1.8, c: new THREE.Color(ok ? '#3ddc84' : '#ff3350') };
  if (!ok) return;
  for (let i = 0; i < 110; i++) { const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.9, 0.6) })); m.position.set((Math.random() - 0.5) * 16, 1, (Math.random() - 0.5) * 6); build.add(m); sparks.push({ m, v: new V3((Math.random() - 0.5) * 7, 8 + Math.random() * 8, (Math.random() - 0.5) * 7), life: 2.4 }); }
}
function arenaTick(dt, t) {
  const u = build.userData;
  for (const h of placed.values()) animHolder(h, t, dt);
  u.globe.rotation.y = t * 0.5; u.threat.rotation.y = t * 0.9; u.threat.children.forEach((c, i) => { if (c.isMesh) c.rotation.x = t * 2 + i; });
  u.rings.forEach((r, i) => { r.material.opacity = 0.25 + 0.2 * Math.sin(t * 2 + i * 0.7); });
  const a = u.dust.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) + dt * 0.5; if (y > 9) y = 0.3; a.setY(i, y); } a.needsUpdate = true;
  const f = u.flash; const col = f && (f.t -= dt) > 0 && Math.sin(f.t * 14) > -0.3 ? f.c : ORANGE; u.edge.material.color.copy(col); u.cloud.material.color.copy(col);
  if (!sim && placed.size && (idleT -= dt) < 0) { idleT = 0.3; spawn('idle', makePath(false), 99); }
  for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i]; s.v.y -= 16 * dt; s.m.position.addScaledVector(s.v, dt); if ((s.life -= dt) < 0 || s.m.position.y < 0.3) { build.remove(s.m); sparks.splice(i, 1); } }
}
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / fly.dur); const k = fly.t * fly.t * (3 - 2 * fly.t);
    camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k);
    if (fly.t >= 1) fly = null;
  }
  if (mode === 'explore') walk(dt, t);
  controls.update();
  if (world.visible) { driveCars(dt); for (const c of cityHolders) animHolder(c.h, t, dt); const u = world.userData; u.core.rotation.y = t * 0.3; u.core.rotation.x = t * 0.17; u.core2.rotation.y = -t * 0.6; u.core2.position.y = 4.2 + Math.sin(t * 1.5) * 0.2; }
  if (mode === 'mission') arenaTick(dt, t);
  if (mode === 'quiz' && quizModel) { animHolder(quizModel, t, dt); quizModel.rotation.y = t * 0.6; }
  if (sim) {
    sim.t += dt;
    if (sim.t < 3.6) {
      sim.next -= dt;
      while (sim.next <= 0) {
        sim.next += sim.rate;
        if (sim.ddos && Math.random() < 0.6) spawn('atk', makePath(false), sim.shielded ? 1 : 99);
        else spawn(sim.ok ? 'ok' : 'bad', makePath(!sim.ok), 99);
      }
    } else if (sim.t > 4.9) { const d = sim.done; sim = null; d(); }
    if (sim) $('#banner').textContent = `${sim.title} · ✅ ${sim.served} served · ❌ ${sim.dropped} dropped${sim.ddos ? ` · 🛡️ ${sim.blocked} attacks blocked` : ''}`;
  }
  for (let i = packets.length - 1; i >= 0; i--) {
    const p = packets[i]; p.t += dt * 2.4;
    if (p.t >= 1) { p.t = 0; p.seg++; }
    if (p.seg >= p.pts.length - 1 || p.seg >= p.dieAt) {
      if (sim && p.kind !== 'idle') { if (p.kind === 'ok') sim.served++; else if (p.kind === 'atk' && p.seg >= p.dieAt) sim.blocked++; else sim.dropped++; }
      build.remove(p.m); packets.splice(i, 1); continue;
    }
    const a = p.pts[p.seg], b = p.pts[p.seg + 1];
    p.m.position.lerpVectors(a, b, p.t); p.m.position.y += Math.sin(p.t * Math.PI) * 0.7;
  }
  composer.render();
  requestAnimationFrame(tick);
}
updateHud();
build.visible = quizG.visible = false;
controls.target.set(0, 2, 0); controls.autoRotate = true;
if (['#explore', '#mission', '#quiz'].includes(location.hash)) { setMode(location.hash.slice(1)); }
tick();
