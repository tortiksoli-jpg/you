// Сцена: рендер, закрытый стрелковый тир (100 м), освещение «день/ночь»,
// окружение для отражений, мишени.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const GUN_Y = 1.42;
// Размеры тира (м): задняя стена, пулеулавливатель, полуширина, потолок, огневой рубеж.
export const RANGE = { back: -4.2, end: 102, halfW: 6, ceil: 3.6, line: 0.62 };

// Масштаб освещённости: 1 единица сцены ≈ 200 лк. Свет в тире ~400 лк → 2 ед.,
// фонарь 20 000 кд → 100 кд-ед. Яркость картинки подстраивает «глаз» (app.js).
export const LUX = 1 / 200;

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Мягкие пятна: разводы на бетоне, потёки (бесшовно — копии у краёв).
function blotches(g, w, h, n, r0, r1, col, a0, a1, R) {
  for (let i = 0; i < n; i++) {
    const x = R() * w, y = R() * h, r = r0 + R() * (r1 - r0);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const a = a0 + R() * (a1 - a0);
    gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr;
    for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
  }
}
function speckle(g, w, h, n, lo, hi, a, R, s0 = 0.5, s1 = 2) {
  for (let i = 0; i < n; i++) {
    const v = lo + R() * (hi - lo);
    g.fillStyle = `rgba(${v},${v},${v},${R() * a})`;
    const s = s0 + R() * (s1 - s0);
    g.fillRect(R() * w, R() * h, s, s);
  }
}

// Затёртый бетонный пол: разводы от затирки, следы, пятна масла.
function floorTex() {
  const R = rng(7);
  const map = canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = '#77756f'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 90, 40, 220, '96,94,88', 0.05, 0.22, R);
    blotches(g, w, h, 70, 30, 160, '140,137,128', 0.04, 0.16, R);
    blotches(g, w, h, 18, 10, 60, '45,42,38', 0.08, 0.25, R);
    speckle(g, w, h, 60000, 70, 160, 0.35, R);
    g.strokeStyle = 'rgba(150,148,140,0.05)';
    for (let i = 0; i < 160; i++) { g.lineWidth = 6 + R() * 20; g.beginPath(); g.arc(R() * w, R() * h, 80 + R() * 200, R() * 6, R() * 6 + 1.5); g.stroke(); }
    // деформационный шов по краю тайла (тайл = 4 м)
    g.fillStyle = 'rgba(30,30,30,.85)'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
  });
  const rough = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 80, 20, 120, '60,60,60', 0.1, 0.35, R);
    blotches(g, w, h, 40, 20, 90, '220,220,220', 0.1, 0.3, R);
    speckle(g, w, h, 12000, 120, 255, 0.5, R);
  }, false);
  return { map, rough };
}

// Стена из бетонных блоков 390×190 мм, окрашенная. Тайл 1,6 × 0,8 м.
function blockTex() {
  const R = rng(21);
  return canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#a9a7a0'; g.fillRect(0, 0, w, h);
    const bw = w / 4, bh = h / 4;
    for (let r = 0; r < 4; r++) for (let c = -1; c < 5; c++) {
      const x = c * bw + (r % 2) * bw / 2, y = r * bh;
      const v = 178 + R() * 18;
      g.fillStyle = `rgb(${v},${v - 2},${v - 8})`; g.fillRect(x + 4, y + 4, bw - 8, bh - 8);
    }
    speckle(g, w, h, 40000, 120, 210, 0.3, R, 0.5, 2.5);
    blotches(g, w, h, 30, 20, 140, '120,116,105', 0.04, 0.14, R);
  });
}

// Акустическая панель: перфорированная окрашенная сталь, стыки панелей.
function acousticTex() {
  const R = rng(33);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#34363a'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 30000, 30, 90, 0.5, R, 0.6, 1.6);
    g.fillStyle = 'rgba(0,0,0,.5)';
    for (let y = 8; y < h; y += 12) for (let x = 8 + ((y / 12) % 2) * 6; x < w; x += 12) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(15,15,16,.9)'; g.fillRect(0, 0, w, 5); g.fillRect(0, 0, 5, h);
    blotches(g, w, h, 12, 20, 90, '90,86,78', 0.03, 0.08, R);
  });
}

function woodTex(seed = 55) {
  const R = rng(seed);
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#8b7355'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { const v = (R() - 0.5) * 30; g.fillStyle = `rgba(${90 + v},${70 + v},${48 + v},.35)`; g.fillRect(0, y, w, 1 + R() * 2); }
    speckle(g, w, h, 5000, 50, 120, 0.25, R);
    blotches(g, w, h, 20, 10, 60, '40,30,20', 0.1, 0.3, R);
  });
}

// Перегородка кабинки: бронепанель в светлой ткани, рамка, крепёж, потёртости.
function boothTex() {
  const R = rng(91);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8f9290'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 50000, 100, 170, 0.35, R, 0.5, 1.5);
    for (let y = 0; y < h; y += 3) { g.fillStyle = `rgba(0,0,0,${0.03 + R() * 0.03})`; g.fillRect(0, y, w, 1); }
    blotches(g, w, h, 25, 20, 90, '70,70,68', 0.05, 0.15, R);
    g.fillStyle = '#3b3d3f'; g.fillRect(0, 0, w, 14); g.fillRect(0, h - 14, w, 14); g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);
    g.fillStyle = '#1e1f20';
    for (const [x, y] of [[7, 7], [w - 7, 7], [7, h - 7], [w - 7, h - 7], [w / 2, 7], [w / 2, h - 7]]) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
  });
}

function signTex(text, o = {}) {
  return canvasTex(o.w || 512, o.h || 192, (g, w, h) => {
    g.fillStyle = o.bg || '#e8e3d4'; g.fillRect(0, 0, w, h);
    g.fillStyle = o.fg || '#1e1e1e'; g.font = `bold ${o.size || 96}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 4);
  });
}

// Окружение для отражений — упрощённый зал вокруг оружия. Днём ряды светильников
// над головой дают блики на металле, ночью зал почти чёрный.
function envScene(night) {
  const s = new THREE.Scene();
  const dim = night ? 0.004 : 1;
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, RANGE.ceil, RANGE.halfW * 2), new THREE.MeshBasicMaterial({ color: 0x6d6b66, side: THREE.BackSide }));
  room.material.color.multiplyScalar(dim);
  room.position.set(14, RANGE.ceil / 2 - GUN_Y, 0);
  s.add(room);
  const plane = (w, d, color, k, x, y, z, rx = Math.PI / 2) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.material.color.multiplyScalar(k);
    m.rotation.x = rx; m.position.set(x, y, z); s.add(m); return m;
  };
  plane(40, RANGE.halfW * 2, 0x55544f, dim, 14, -GUN_Y + 0.01, 0);
  plane(40, RANGE.halfW * 2, 0x26272a, dim, 14, RANGE.ceil - GUN_Y - 0.01, 0);
  if (!night) {
    for (const x of [4, 8, 12, 16, 20, 24]) plane(0.25, 9, 0xfff3e2, 9, x, RANGE.ceil - GUN_Y - 0.05, 0);
    for (const x of [-2.6, -0.9]) for (const z of [-2.4, 0, 2.4]) plane(1.2, 0.6, 0xfff3e2, 8, x, RANGE.ceil - GUN_Y - 0.06, z);
  } else {
    plane(0.5, 0.2, 0x40ff80, 2.5, RANGE.back + 0.05, 2.3 - GUN_Y, -3, 0).rotation.y = Math.PI / 2;
  }
  return s;
}

export function createScene(canvasHost) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  canvasHost.appendChild(renderer.domElement);
  RectAreaLightUniformsLib.init();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envDay = pmrem.fromScene(envScene(false), 0.035).texture;
  const envNight = pmrem.fromScene(envScene(true), 0.035).texture;
  scene.environment = envDay;
  scene.environmentIntensity = 0.8;
  // лёгкая дымка: в закрытом тире всегда висит пороховой дым и пыль
  scene.fog = new THREE.FogExp2(0x77756f, 0.0045);

  // Над огневым рубежом — светодиодные панели (тени от оружия), вдоль зала —
  // линии светильников между защитными козырьками.
  const hemi = new THREE.HemisphereLight(0xfff4e6, 0x5d5a52, 0.5);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2e0, 2.1); // панель над стрелком (имя — для app.js)
  sun.position.set(-0.9, 5.5, 0.9);
  sun.target.position.set(0, GUN_Y, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -1.1; sc.right = 1.1; sc.top = 1.1; sc.bottom = -1.1; sc.near = 1; sc.far = 12;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.012;
  scene.add(sun, sun.target);
  const area = new THREE.RectAreaLight(0xfff3e2, 5.5, 1.2, 0.6);
  area.position.set(-0.9, RANGE.ceil - 0.08, 0);
  area.lookAt(-0.9, 0, 0);
  scene.add(area);
  const down = new THREE.DirectionalLight(0xfff0dc, 1.3);
  down.position.set(-10, 20, 3);
  down.target.position.set(40, 0, 0);
  scene.add(down, down.target);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.35);
  fill.position.set(0.5, 0.6, 3);
  fill.target.position.set(0, GUN_Y, 0);
  scene.add(fill, fill.target);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.008, 400);
  camera.position.set(-0.25, GUN_Y + 0.25, 1.35);

  const range = buildRange(scene);

  // Ночь: светильники тира выключены, остаются табло «ВЫХОД» и полоска света
  // из-под двери. Число источников не меняется — шейдеры не перекомпилируются.
  const DAY = { hemi: 0.5, sun: 2.1, area: 5.5, down: 1.3, fill: 0.35, env: 0.8, fog: 0x77756f };
  const NIGHT = { hemi: 0.004, sun: 0, area: 0, down: 0, fill: 0.0015, env: 1, fog: 0x040405 };
  let night = false;
  const setNight = (on) => {
    night = !!on;
    const P = night ? NIGHT : DAY;
    hemi.intensity = P.hemi; sun.intensity = P.sun; area.intensity = P.area; down.intensity = P.down; fill.intensity = P.fill;
    hemi.color.set(night ? 0x8fa2c8 : 0xfff4e6);
    fill.color.set(night ? 0x9fb4d8 : 0xfff4e6);
    scene.environment = night ? envNight : envDay;
    scene.environmentIntensity = P.env;
    scene.fog.color.set(P.fog);
    range.setNight(night);
  };
  // Средняя освещённость зала (ед.) — от неё отталкивается адаптация «глаза».
  const ambient = () => (night ? 0.004 : 2.2);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { renderer, scene, camera, sun, range, env: envDay, setNight, ambient, get night() { return night; } };
}

/* ---------------------------------------------------------------- тир */

function buildRange(scene) {
  const grp = new THREE.Group();
  scene.add(grp);
  const { back, end, halfW, ceil, line } = RANGE;
  const L = end - back, cx = (end + back) / 2;
  const hitables = [];
  const add = (m, surface, hit = true) => { m.userData.surface = surface; grp.add(m); if (hit) hitables.push(m); return m; };

  // пол
  const ft = floorTex();
  ft.map.repeat.set(L / 4, halfW * 2 / 4); ft.rough.repeat.set(L / 3, halfW * 2 / 3);
  const floorM = new THREE.MeshStandardMaterial({ map: ft.map, roughnessMap: ft.rough, roughness: 0.62, metalness: 0, envMapIntensity: 0.5 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, halfW * 2), floorM);
  floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, 0);
  add(floor, 'concrete');

  // разметка: огневой рубеж, границы направлений, дистанции
  const paint = (w, d, color, x, z, rough = 0.5) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: rough, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.002, z); grp.add(m); return m;
  };
  paint(0.1, halfW * 2, 0xc9a227, line, 0);
  paint(0.05, halfW * 2, 0xa8342b, line + 0.9, 0);
  for (const z of [-3.6, -1.2, 1.2, 3.6]) paint(end - line - 2, 0.05, 0xd8d4c8, (end + line) / 2, z, 0.6);
  for (const d of [5, 10, 15, 25, 50, 75, 100]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshStandardMaterial({ map: signTex(d + ' м', { bg: '#77756f', fg: '#e4dfd0', size: 120 }), roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    t.rotation.x = -Math.PI / 2; t.rotation.z = Math.PI / 2; t.position.set(line + d, 0.003, halfW - 0.6); grp.add(t);
  }

  // стены: бетонный блок, у рубежа — акустические панели
  const bt = blockTex();
  bt.repeat.set(L / 1.6, ceil / 0.8);
  const wallM = new THREE.MeshStandardMaterial({ map: bt, roughness: 0.9, envMapIntensity: 0.4 });
  const at = acousticTex();
  at.repeat.set(12, 2);
  const panelM = new THREE.MeshStandardMaterial({ map: at, roughness: 0.95, envMapIntensity: 0.3 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(L, ceil), wallM);
    w.position.set(cx, ceil / 2, s * halfW); w.rotation.y = s > 0 ? Math.PI : 0;
    add(w, 'concrete');
    const p = new THREE.Mesh(new THREE.BoxGeometry(18, 2.2, 0.06), panelM);
    p.position.set(back + 9.2, 1.5, s * (halfW - 0.03));
    add(p, 'panel');
  }
  // задняя стена с дверью и табло
  const at2 = at.clone(); at2.repeat.set(6, 2); at2.needsUpdate = true;
  const bw = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, ceil), new THREE.MeshStandardMaterial({ map: at2, roughness: 0.95, envMapIntensity: 0.3 }));
  bw.position.set(back, ceil / 2, 0); bw.rotation.y = Math.PI / 2;
  add(bw, 'panel', false);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 1.0), new THREE.MeshStandardMaterial({ color: 0x5a5f63, roughness: 0.5, metalness: 0.6 }));
  door.position.set(back + 0.03, 1.05, -3); grp.add(door);
  const exitT = signTex('ВЫХОД', { bg: '#0f7a3a', fg: '#e8ffe8', size: 110 });
  const exitM = new THREE.MeshStandardMaterial({ map: exitT, emissiveMap: exitT, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 });
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), exitM);
  exit.position.set(back + 0.07, 2.3, -3); exit.rotation.y = Math.PI / 2; grp.add(exit);
  // полоска света из-под двери
  const gapM = new THREE.MeshBasicMaterial({ color: 0xffe2b0 });
  const gap = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.012), gapM);
  gap.position.set(back + 0.065, 0.006, -3); gap.rotation.y = Math.PI / 2; grp.add(gap);

  // потолок и защитные козырьки (фанера по стали под 30°)
  const ceilMesh = new THREE.Mesh(new THREE.PlaneGeometry(L, halfW * 2), new THREE.MeshStandardMaterial({ color: 0x1f2022, roughness: 0.95 }));
  ceilMesh.rotation.x = Math.PI / 2; ceilMesh.position.set(cx, ceil, 0);
  add(ceilMesh, 'concrete');
  const wt = woodTex(); wt.repeat.set(6, 1);
  const bafG = [], fixtures = [];
  for (let x = 3; x < end - 4; x += x < 30 ? 4 : 8) {
    bafG.push(new THREE.BoxGeometry(0.03, 1.0, halfW * 2 - 0.1).rotateZ(-0.52).translate(x, ceil - 0.5, 0));
    fixtures.push(x + (x < 30 ? 2 : 4));
  }
  const baffles = new THREE.Mesh(mergeGeometries(bafG), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.85 }));
  add(baffles, 'wood');
  // светильники: линии поперёк зала между козырьками + панели над рубежом
  const fixM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff3e2, emissiveIntensity: 2.2, roughness: 0.4 });
  const housingM = new THREE.MeshStandardMaterial({ color: 0x9a9da0, roughness: 0.4, metalness: 0.7 });
  const fixG = [], houseG = [];
  const bar = (x, y, z, w, d) => {
    houseG.push(new THREE.BoxGeometry(w + 0.04, 0.05, d + 0.04).translate(x, y + 0.03, z));
    fixG.push(new THREE.BoxGeometry(w, 0.012, d).translate(x, y, z));
  };
  for (const x of fixtures) bar(x, ceil - 0.06, 0, 0.14, halfW * 2 - 1.5);
  for (const x of [-2.6, -0.9]) for (const z of [-2.4, 0, 2.4]) bar(x, ceil - 0.06, z, 1.2, 0.6);
  grp.add(new THREE.Mesh(mergeGeometries(houseG), housingM));
  grp.add(new THREE.Mesh(mergeGeometries(fixG), fixM));

  // Кабинки огневого рубежа. Перегородки односторонние: при облёте камерой
  // снаружи своей кабинки они не заслоняют оружие.
  const boothM = new THREE.MeshStandardMaterial({ map: boothTex(), roughness: 0.85, metalness: 0.05 });
  for (const z of [-3.6, -1.2, 1.2, 3.6]) {
    for (const s of [-1, 1]) {
      const inner = (z === 1.2 && s > 0) || (z === -1.2 && s < 0);
      if (Math.abs(z) === 1.2 && !inner) continue;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.9), boothM);
      p.position.set(line - 0.85, 1.05, z);
      // плоскость смотрит в свою кабинку (к оси z = 0 для своих перегородок)
      p.rotation.y = s > 0 ? Math.PI : 0;
      grp.add(p);
    }
  }
  // стойка огневого рубежа: видна только сверху и из тира
  const st = woodTex(77); st.repeat.set(1, 18); st.rotation = Math.PI / 2;
  const shelf = new THREE.Mesh(new THREE.PlaneGeometry(0.45, halfW * 2 - 0.2), new THREE.MeshStandardMaterial({ map: st, roughness: 0.7 }));
  shelf.rotation.x = -Math.PI / 2; shelf.position.set(line - 0.25, 0.95, 0);
  add(shelf, 'wood');
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, halfW * 2 - 0.2), new THREE.MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.5, metalness: 0.6 }));
  edge.position.set(line - 0.02, 0.93, 0); grp.add(edge);
  const shelfFront = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 - 0.2, 0.93), boothM);
  shelfFront.position.set(line, 0.465, 0); shelfFront.rotation.y = Math.PI / 2; grp.add(shelfFront);
  shelfFront.material = new THREE.MeshStandardMaterial({ color: 0x4a4d50, roughness: 0.7, metalness: 0.2 });

  // пулеулавливатель: наклонные стальные ламели и чёрная торцевая стена
  const trapG = [];
  for (let i = 0; i < 7; i++) trapG.push(new THREE.BoxGeometry(0.02, 0.62, halfW * 2).rotateZ(0.55).translate(end - 0.3 - (i % 2) * 0.15, 0.3 + i * 0.5, 0));
  add(new THREE.Mesh(mergeGeometries(trapG), new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.55, metalness: 0.75 })), 'trap');
  const trapWall = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2, ceil), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }));
  trapWall.position.set(end, ceil / 2, 0); trapWall.rotation.y = -Math.PI / 2;
  add(trapWall, 'trap');

  // Мишени: стальные гонги и силуэты IPSC на стойках, бумажные — на каретках.
  const targets = [];
  const steelM = new THREE.MeshStandardMaterial({ color: 0xe0dccf, roughness: 0.55, metalness: 0.3 });
  const postM = new THREE.MeshStandardMaterial({ color: 0x3a3b3c, roughness: 0.7, metalness: 0.4 });
  const ipsc = new THREE.Shape();
  ipsc.moveTo(-0.15, 0); ipsc.lineTo(0.15, 0); ipsc.lineTo(0.23, 0.12); ipsc.lineTo(0.23, 0.52);
  ipsc.lineTo(0.14, 0.6); ipsc.lineTo(0.08, 0.6); ipsc.lineTo(0.08, 0.76); ipsc.lineTo(-0.08, 0.76);
  ipsc.lineTo(-0.08, 0.6); ipsc.lineTo(-0.14, 0.6); ipsc.lineTo(-0.23, 0.52); ipsc.lineTo(-0.23, 0.12); ipsc.closePath();
  const ipscG = new THREE.ExtrudeGeometry(ipsc, { depth: 0.012, bevelEnabled: false });
  ipscG.translate(0, 0, -0.006); ipscG.rotateY(Math.PI / 2);
  const plateG = new THREE.CylinderGeometry(0.15, 0.15, 0.012, 32); plateG.rotateZ(Math.PI / 2);

  const addTarget = (x, z, kind, label) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const hinge = new THREE.Group();
    hinge.position.y = kind === 'plate' ? 1.25 : 1.05;
    const plate = new THREE.Mesh(kind === 'plate' ? plateG : ipscG, steelM.clone());
    plate.position.y = kind === 'plate' ? -0.15 : -0.76;
    plate.castShadow = true;
    plate.userData.surface = 'steel';
    plate.userData.target = t;
    hinge.add(plate); t.add(hinge);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, hinge.position.y + 0.04, 0.05), postM);
    post.position.set(0.04, (hinge.position.y + 0.04) / 2, 0); post.castShadow = true;
    t.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), postM);
    foot.position.y = 0.025; t.add(foot);
    if (label) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.24), new THREE.MeshStandardMaterial({ roughness: 0.8, map: signTex(label) }));
      sign.position.set(-0.3, 0.3, z > 0 ? -0.4 : 0.4); sign.rotation.y = -Math.PI / 2;
      t.add(sign);
    }
    t.userData = { hinge, plate, swing: 0, vel: 0, kind };
    grp.add(t); targets.push(t); hitables.push(plate);
    return t;
  };
  // бумажная мишень IPSC на картоне
  const paperTex = canvasTex(256, 384, (g) => {
    g.fillStyle = '#b89a6c'; g.fillRect(0, 0, 256, 384);
    g.fillStyle = '#cdb184';
    g.beginPath(); g.moveTo(64, 380); g.lineTo(192, 380); g.lineTo(236, 320); g.lineTo(236, 130); g.lineTo(200, 96); g.lineTo(160, 96); g.lineTo(160, 20); g.lineTo(96, 20); g.lineTo(96, 96); g.lineTo(56, 96); g.lineTo(20, 130); g.lineTo(20, 320); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(60,40,20,.7)'; g.lineWidth = 2.5;
    g.strokeRect(88, 120, 80, 150); g.strokeRect(104, 32, 48, 48); g.strokeRect(60, 110, 136, 220);
    g.fillStyle = 'rgba(60,40,20,.8)'; g.font = 'bold 20px Arial'; g.textAlign = 'center'; g.fillText('A', 128, 200); g.fillText('C', 76, 300); g.fillText('D', 36, 200);
  });
  paperTex.wrapS = paperTex.wrapT = THREE.ClampToEdgeWrapping;
  const paperM = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.95, side: THREE.DoubleSide });
  const railM = new THREE.MeshStandardMaterial({ color: 0x55585b, roughness: 0.45, metalness: 0.7 });
  const addPaper = (x, z) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const hinge = new THREE.Group();
    hinge.position.y = 2.62;
    hinge.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), railM));
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5), railM);
    rod.position.y = -0.28; hinge.add(rod);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.69), paperM);
    sheet.rotation.y = -Math.PI / 2; sheet.position.y = -0.9;
    sheet.castShadow = true;
    sheet.userData.surface = 'paper'; sheet.userData.target = t;
    hinge.add(sheet);
    t.add(hinge);
    t.userData = { hinge, plate: sheet, swing: 0, vel: 0, kind: 'paper' };
    grp.add(t); targets.push(t); hitables.push(sheet);
    return t;
  };
  const railG = [];
  for (const z of [-2.4, 0, 2.4]) railG.push(new THREE.BoxGeometry(26, 0.08, 0.06).translate(line + 13, 2.7, z));
  grp.add(new THREE.Mesh(mergeGeometries(railG), railM));
  addPaper(line + 7, 0);
  addPaper(line + 15, 2.4);
  addPaper(line + 25, -2.4);
  addTarget(line + 10, -1.6, 'plate', '10 м');
  addTarget(line + 25, 1.0, 'ipsc', '25 м');
  addTarget(line + 25, 3.4, 'plate');
  addTarget(line + 50, -0.8, 'ipsc', '50 м');
  addTarget(line + 50, 2.2, 'plate');
  addTarget(line + 75, 0.6, 'ipsc', '75 м');
  addTarget(line + 100, -1.0, 'ipsc', '100 м');
  addTarget(line + 100, 1.8, 'plate');

  grp.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

  const update = (dt) => {
    for (const t of targets) {
      const u = t.userData;
      const k = u.kind === 'paper' ? 14 : 60, d = u.kind === 'paper' ? 1.8 : 4.5;
      u.vel += (-u.swing * k - u.vel * d) * dt;
      u.swing += u.vel * dt;
      u.hinge.rotation.z = -u.swing;
    }
  };
  const hit = (t, energy) => { if (t) t.userData.vel += t.userData.kind === 'paper' ? energy * 0.12 : energy; };
  // высота поверхности под точкой: гильзы и магазин падают на стойку или пол
  const floorAt = (x, z) => (x > line - 0.47 && x < line && Math.abs(z) < halfW - 0.1 ? 0.95 : 0);
  const setNight = (on) => {
    fixM.emissiveIntensity = on ? 0 : 2.2;
    gapM.color.set(0xffe2b0).multiplyScalar(on ? 0.08 : 0.3);
    exitM.emissiveIntensity = on ? 0.35 : 0.9;
  };
  return { group: grp, targets, hitables, update, hit, floorAt, setNight, ground: floor };
}
