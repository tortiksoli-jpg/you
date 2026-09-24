// Эффекты: дульное пламя, дым, искры, гильзы, попадания, луч ЛЦУ, фонарь.
// Частицы рисуются инстансингом (один вызов отрисовки на тип смешивания),
// гильзы — InstancedMesh: даже длинная очередь не добавляет draw call'ов.
import * as THREE from 'three';
import { caseGeo, bulletGeo, CAL } from './lib/common.js';

function tex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function texWH(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const R = Math.random;
const TEX = {};
function textures() {
  if (TEX.glow) return TEX;
  TEX.glow = tex(128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.8)'); gr.addColorStop(0.5, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  // Пламя сбоку: вытянутый язык вдоль оси (дуло — левый край). Горячее бело-жёлтое
  // ядро у среза, дальше — оранжевый «шар» вторичной вспышки с рваными краями.
  const flameSide = (o) => texWH(256, 96, (g, w, h) => {
    g.globalCompositeOperation = 'lighter';
    const env = (u) => Math.pow(Math.sin(Math.PI * Math.min(1, u / o.peak) * 0.5), 0.8) * Math.pow(1 - u, o.taper);
    for (let i = 0; i < o.n; i++) {
      const u = Math.pow(R(), o.bias) * 0.92;
      const r = h * 0.5 * env(u) * (0.35 + R() * 0.65);
      if (r < 1) continue;
      const x = u * w, y = h / 2 + (R() - 0.5) * h * 0.5 * env(u);
      const hot = Math.max(0, 1 - u * 2.2);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const a = (0.1 + R() * 0.14) * (1 - u * 0.6);
      gr.addColorStop(0, `rgba(255,${Math.round(190 + 60 * hot)},${Math.round(90 + 150 * hot)},${a * 1.6})`);
      gr.addColorStop(0.45, `rgba(255,${Math.round(140 + 60 * hot)},${Math.round(40 + 60 * hot)},${a})`);
      gr.addColorStop(1, 'rgba(255,90,20,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r * (1.3 + R()), r, (R() - 0.5) * 0.6, 0, 7); g.fill();
    }
    // ядро у самого среза
    const cr = h * 0.2;
    const gr = g.createRadialGradient(4, h / 2, 0, 4, h / 2, cr * 2.4);
    gr.addColorStop(0, 'rgba(255,252,235,1)'); gr.addColorStop(0.3, 'rgba(255,230,160,.7)'); gr.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(4, h / 2, cr * 2.4, cr, 0, 0, 7); g.fill();
    // мягкое затухание к дальнему краю
    g.globalCompositeOperation = 'destination-in';
    const fx = g.createLinearGradient(0, 0, w, 0);
    fx.addColorStop(0, 'rgba(0,0,0,1)'); fx.addColorStop(0.75, 'rgba(0,0,0,.9)'); fx.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = fx; g.fillRect(0, 0, w, h);
  });
  TEX.flameLong = [0, 1, 2].map(() => flameSide({ n: 170, peak: 0.42, taper: 0.8, bias: 1.25 }));
  TEX.flameShort = [0, 1, 2].map(() => flameSide({ n: 120, peak: 0.25, taper: 1.6, bias: 1.8 }));
  // Вид с торца: «лепестки» (у пламегасителя — по числу прорезей) + ядро.
  const star = (petals) => tex(256, (g, s) => {
    g.translate(s / 2, s / 2);
    g.globalCompositeOperation = 'lighter';
    const n = petals || 9;
    const a0 = R() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i / n) * Math.PI * 2 + (petals ? 0 : (R() - 0.5) * 0.5);
      const L = s * (petals ? 0.4 + R() * 0.08 : 0.2 + R() * 0.26), wd = s * (petals ? 0.05 : 0.03 + R() * 0.03);
      g.save(); g.rotate(a);
      for (let j = 0; j < 5; j++) {
        const gr = g.createLinearGradient(0, 0, L, 0);
        gr.addColorStop(0, 'rgba(255,244,215,.5)'); gr.addColorStop(0.5, 'rgba(255,175,70,.3)'); gr.addColorStop(1, 'rgba(255,100,20,0)');
        g.fillStyle = gr;
        const jw = wd * (0.5 + R() * 0.7), jl = L * (0.6 + R() * 0.4), dy = (R() - 0.5) * wd;
        g.beginPath(); g.moveTo(0, dy - jw); g.quadraticCurveTo(jl * 0.55, dy - jw * (0.6 + R() * 0.6), jl, dy + (R() - 0.5) * jw); g.quadraticCurveTo(jl * 0.55, dy + jw * (0.6 + R() * 0.6), 0, dy + jw); g.fill();
      }
      g.restore();
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.2);
    gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.4, 'rgba(255,215,130,.75)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 0.2, 0, 7); g.fill();
  });
  TEX.star = [star(0), star(0), star(0)];
  TEX.star3 = [star(3), star(3)];
  TEX.star4 = [star(4), star(4)];
  // Атлас дыма 2×2: рваные волокна из фрактального шума, а не круглые «шарики».
  TEX.smoke = tex(256, (g, s) => {
    const h = s / 2, img = g.createImageData(s, s), d = img.data;
    const N = 32, grid = [];
    for (let i = 0; i < 4 * N * N; i++) grid.push(R());
    const vn = (c, x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const at = (a, b) => grid[c * N * N + ((b % N + N) % N) * N + ((a % N + N) % N)];
      const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy;
    };
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const c = (x >= h ? 1 : 0) + (y >= h ? 2 : 0);
      const u = (x % h) / h - 0.5, v = (y % h) / h - 0.5;
      let f = 0, amp = 0.5, fr = 3;
      for (let o = 0; o < 5; o++) { f += vn(c, u * fr + 7 * c, v * fr) * amp; amp *= 0.5; fr *= 2.03; }
      const r = Math.hypot(u, v) * 2;
      const fall = Math.max(0, 1 - r * r) ** 1.4;
      const a = Math.max(0, f - 0.32) * 1.9 * fall;
      const i = (y * s + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = 255 * (0.85 + f * 0.15); d[i + 3] = Math.min(255, a * 255);
    }
    g.putImageData(img, 0, 0);
  });
  TEX.spark = tex(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.25, 'rgba(255,200,110,.9)'); gr.addColorStop(1, 'rgba(255,120,30,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  TEX.hole = tex(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(20,18,16,1)'); gr.addColorStop(0.35, 'rgba(40,36,30,.9)'); gr.addColorStop(0.6, 'rgba(120,110,95,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  return TEX;
}

const additive = (map, color, opacity = 1) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

/* ------------------------------------------------ инстансные частицы */

const VS = `
attribute vec3 iPos;
attribute vec4 iData;   // размер, поворот, альфа, кадр атласа
attribute vec4 iCol;    // цвет + растяжение (искры)
varying vec2 vUv;
varying float vA;
varying vec3 vC;
#include <fog_pars_vertex>
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(iPos, 1.0);
  float c = cos(iData.y), s = sin(iData.y);
  vec2 q = position.xy;
  q.x *= 1.0 + iCol.w;
  mvPosition.xy += vec2(q.x * c - q.y * s, q.x * s + q.y * c) * iData.x;
  gl_Position = projectionMatrix * mvPosition;
  float f = iData.w;
  vUv = ATLAS > 1.0 ? (uv + vec2(mod(f, 2.0), floor(f / 2.0))) * 0.5 : uv;
  vA = iData.z;
  vC = iCol.rgb;
  #include <fog_vertex>
}`;
const FS = `
uniform sampler2D map;
varying vec2 vUv;
varying float vA;
varying vec3 vC;
#include <fog_pars_fragment>
void main() {
  vec4 t = texture2D(map, vUv);
  gl_FragColor = vec4(vC * t.rgb, t.a * vA);
  if (gl_FragColor.a < 0.003) discard;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

class Particles {
  constructor(scene, map, max, o = {}) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    const quad = new THREE.PlaneGeometry(1, 1);
    g.index = quad.index;
    g.setAttribute('position', quad.getAttribute('position'));
    g.setAttribute('uv', quad.getAttribute('uv'));
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iData', this.aData); g.setAttribute('iCol', this.aCol);
    g.instanceCount = 0;
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null } }]);
    uniforms.map.value = map;
    const mat = new THREE.ShaderMaterial({
      uniforms, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: true,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      defines: { ATLAS: (o.atlas ? 2 : 1).toFixed(1) },
    });
    mat.toneMapped = !o.additive;
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = o.additive ? 3 : 2;
    scene.add(this.mesh);
    this.list = [];
    this.pool = [];
    this.sort = !!o.sort;
  }
  // p: {pos, vel, life, size, grow, alpha, color, drag, buoy, gravity, turb, rot, spin, frame, stretch, fadeIn}
  add(p) {
    if (this.list.length >= this.max) this.pool.push(this.list.shift());
    const q = this.pool.pop() || {};
    Object.assign(q, { t: 0, drag: 2, buoy: 0, gravity: 0, rot: R() * 6.28, spin: (R() - 0.5) * 1.2, frame: (R() * 4) | 0, stretch: 0, fadeIn: 0.06, grow: 0, turb: 0 }, p);
    q.px = p.pos.x; q.py = p.pos.y; q.pz = p.pos.z;
    q.vx = p.vel.x; q.vy = p.vel.y; q.vz = p.vel.z;
    q.pos = q.vel = null;
    this.list.push(q);
  }
  update(dt, cam, wind) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt;
      if (p.t >= p.life) { this.pool.push(p); L.splice(i, 1); continue; }
      const dr = Math.exp(-p.drag * dt);
      p.vx = p.vx * dr + wind.x * (1 - dr); p.vz = p.vz * dr + wind.z * (1 - dr);
      p.vy = p.vy * dr + (p.buoy - p.gravity) * dt;
      if (p.turb) { p.vx += (R() - 0.5) * p.turb * dt; p.vy += (R() - 0.5) * p.turb * dt; p.vz += (R() - 0.5) * p.turb * dt; }
      p.px += p.vx * dt; p.py += p.vy * dt; p.pz += p.vz * dt;
      p.rot += p.spin * dt;
    }
    if (this.sort && L.length > 1 && cam) {
      const c = cam.position;
      for (const p of L) p.d = (p.px - c.x) ** 2 + (p.py - c.y) ** 2 + (p.pz - c.z) ** 2;
      L.sort((a, b) => b.d - a.d);
    }
    const P = this.aPos.array, D = this.aData.array, C = this.aCol.array;
    for (let i = 0; i < L.length; i++) {
      const p = L[i], k = p.t / p.life;
      P[i * 3] = p.px; P[i * 3 + 1] = p.py; P[i * 3 + 2] = p.pz;
      D[i * 4] = p.size + p.grow * Math.sqrt(k);
      D[i * 4 + 1] = p.rot;
      const fin = p.fadeIn > 0 ? Math.min(1, p.t / p.fadeIn) : 1;
      D[i * 4 + 2] = p.alpha * fin * (1 - k) * (1 - k * 0.5);
      D[i * 4 + 3] = p.frame;
      C[i * 4] = p.color[0]; C[i * 4 + 1] = p.color[1]; C[i * 4 + 2] = p.color[2]; C[i * 4 + 3] = p.stretch * (1 - k);
    }
    this.mesh.geometry.instanceCount = L.length;
    if (L.length) {
      for (const a of [this.aPos, this.aData, this.aCol]) { a.clearUpdateRanges(); a.addUpdateRange(0, L.length * a.itemSize); a.needsUpdate = true; }
    }
  }
}

const MAX_SHELLS = 60;
const X_AXIS = new THREE.Vector3(1, 0, 0);

export class FX {
  constructor(scene, mats) {
    this.scene = scene;
    const T = textures();
    this.T = T;
    this.mats = mats;
    // дульное пламя (спрайты живут 1–2 кадра)
    this.flash = new THREE.Group();
    this.flash.visible = false;
    scene.add(this.flash);
    // Пламя — скрещённые плоскости вдоль оси ствола (читается сбоку и сверху)
    // и «звезда» поперёк оси (вид от стрелка). Живёт один-два кадра.
    const flameMat = () => new THREE.MeshBasicMaterial({ map: T.flameLong[0], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false });
    const along = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);
    this.flameAxis = new THREE.Group();
    this.flamePlanes = [0, 1, 2].map(() => { const m = new THREE.Mesh(along, flameMat()); m.renderOrder = 4; m.frustumCulled = false; this.flameAxis.add(m); return m; });
    const across = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2);
    this.flameStar = new THREE.Mesh(across, flameMat()); this.flameStar.renderOrder = 4; this.flameStar.frustumCulled = false;
    this.flameAxis.add(this.flameStar);
    // боковые струи тормоза/компенсатора
    this.jets = [0, 1].map(() => {
      const g = new THREE.Group();
      for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(along, flameMat()); m.rotation.x = i * Math.PI / 2; m.renderOrder = 4; m.frustumCulled = false; g.add(m); }
      this.flameAxis.add(g);
      return g;
    });
    this.flash.add(this.flameAxis);
    this.flashFade = 1;
    this.flashLight = new THREE.PointLight(0xffa850, 0, 6, 2);
    scene.add(this.flashLight);
    this.flashT = 0;
    // дым (сортировка, обычное смешивание) и огонь/искры (аддитивно)
    this.smoke = new Particles(scene, T.smoke, 420, { atlas: true, sort: true });
    this.fire = new Particles(scene, T.spark, 260, { additive: true });
    this.wind = new THREE.Vector3(0.18, 0, 0.1);
    this.noWind = new THREE.Vector3();
    this.heat = 0;
    this.wispT = 0;
    // гильзы (и целые патроны при разряжании) — инстансы
    this.shells = [];
    this.inst = new Map();
    // отметины попаданий: общие геометрия и материал
    this.holes = [];
    this.holeGeo = new THREE.CircleGeometry(0.012, 12);
    this.holeMat = new THREE.MeshBasicMaterial({ map: T.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    // ЛЦУ
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0014, 1, 6, 1, true).translate(0, 0.5, 0).rotateZ(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.beam.visible = false; this.beam.frustumCulled = false;
    this.dot = new THREE.Sprite(additive(T.glow, 0xff3020, 1));
    this.dot.visible = false;
    scene.add(this.beam, this.dot);
    // фонарь
    this.spot = new THREE.SpotLight(0xfff1dc, 0, 60, 0.28, 0.55, 1.4);
    scene.add(this.spot, this.spot.target);
    this.lampGlow = new THREE.Sprite(additive(T.glow, 0xfff6e6, 0));
    this.lampGlow.scale.setScalar(0.07);
    scene.add(this.lampGlow);
    this.ray = new THREE.Raycaster();
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._q = new THREE.Quaternion(); this._m = new THREE.Matrix4(); this._s = new THREE.Vector3(1, 1, 1);
  }

  // Что-то ещё движется — кадр нужно перерисовать.
  active() {
    return this.flashT > 0 || this.smoke.list.length > 0 || this.fire.list.length > 0 || this.heat > 0.3 || this.shells.some((s) => s.alive && !s.rest);
  }

  smokePuff(pos, vel, o = {}) {
    const g = o.grey ?? (0.58 + R() * 0.1);
    this.smoke.add({
      pos, vel, life: o.life ?? 1.6 + R(), size: o.size ?? 0.03, grow: o.grow ?? 0.3, alpha: o.alpha ?? 0.35,
      color: o.tint ? [g * 0.96, g * 0.98, g * 1.04] : [g * 1.02, g, g * 0.95], drag: o.drag ?? 3.5, buoy: o.buoy ?? 0.12, turb: o.turb ?? 0.25, fadeIn: o.fadeIn ?? 0.03, gravity: o.gravity ?? 0,
    });
  }

  // kind: bare | fh | comp | linear | brake | supp; q — ориентация оружия (боковые струи),
  // o.flash — заметность вспышки дульного устройства (0..1), o.first — первый выстрел из холодного глушителя
  muzzleFlash(pos, dir, kind, size = 1, q = null, o = {}) {
    const T = this.T, supp = kind === 'supp';
    const pick = (a) => a[(R() * a.length) | 0];
    this.flash.position.copy(pos);
    if (q) this.flameAxis.quaternion.copy(q); else this.flameAxis.quaternion.setFromUnitVectors(X_AXIS, dir);
    this.flash.visible = true;
    this.flashT = 0.03;
    this.flashFade = 1;
    const vis = o.flash ?? 1;
    const k = size * (0.85 + R() * 0.3);
    // длина/ширина языка (м) по типу устройства
    const P = {
      bare: { L: 0.3, W: 0.12, a: 1, long: true, star: 0 },
      fh: { L: 0.11, W: 0.05, a: 0.55, long: false, star: 4 },
      comp: { L: 0.16, W: 0.07, a: 0.85, long: false, star: 0 },
      linear: { L: 0.22, W: 0.05, a: 0.8, long: true, star: 0 },
      brake: { L: 0.1, W: 0.06, a: 0.75, long: false, star: 0 },
      supp: { L: 0.035, W: 0.025, a: o.first ? 0.7 : 0.25, long: false, star: 0 },
    }[kind] || { L: 0.2, W: 0.08, a: 0.9, long: true, star: 0 };
    const a = P.a * (0.35 + 0.65 * Math.min(1, vis * 1.4));
    const tex = P.long ? T.flameLong : T.flameShort;
    const roll = R() * Math.PI;
    this.flamePlanes.forEach((m, i) => {
      m.rotation.x = roll + (i * Math.PI) / 3;
      m.material.map = pick(tex);
      m.userData.a = a * (i ? 0.75 : 1);
      m.material.opacity = m.userData.a;
      m.scale.set(P.L * k * (0.8 + R() * 0.4), P.W * k * (0.8 + R() * 0.4), 1);
    });
    this.flameStar.material.map = pick(P.star === 4 ? T.star4 : P.star === 3 ? T.star3 : T.star);
    this.flameStar.userData.a = a * (supp ? 0.5 : 0.9);
    this.flameStar.material.opacity = this.flameStar.userData.a;
    this.flameStar.position.set(P.L * 0.12 * k, 0, 0);
    this.flameStar.rotation.x = R() * 6.28;
    this.flameStar.scale.setScalar(P.W * 1.5 * k * (0.8 + R() * 0.4));
    // струи: тормоз — вправо и влево, компенсатор — вверх (окна сверху)
    const jetDirs = kind === 'brake' ? [[0, 0, 1], [0, 0, -1]] : kind === 'comp' ? [[0.25, 1, 0.3], [0.25, 1, -0.3]] : [];
    this.jets.forEach((g, i) => {
      const d = jetDirs[i];
      g.visible = !!d;
      if (!d) return;
      g.quaternion.setFromUnitVectors(X_AXIS, new THREE.Vector3(...d).normalize());
      g.position.set(P.L * 0.3 * k, 0, 0);
      const L = (kind === 'brake' ? 0.14 : 0.08) * k * (0.8 + R() * 0.4);
      g.children.forEach((m) => { m.material.map = pick(T.flameShort); m.material.opacity = a * 0.8; m.scale.set(L, L * 0.45, 1); });
    });
    // вспышка подсвечивает оружие и землю на один кадр
    this.flashLight.position.copy(pos).addScaledVector(dir, 0.08);
    this.flashLight.intensity = (supp ? 0.6 : 7) * a * size;
    this.heat = Math.min(3, this.heat + 0.22 * size);

    // догорающие крупинки пороха — редкие короткие искры
    const nSp = supp ? 0 : Math.round((kind === 'bare' ? 5 : kind === 'brake' ? 4 : 2) * size * (0.5 + R()));
    for (let i = 0; i < nSp; i++) {
      const v = dir.clone().multiplyScalar(5 + R() * 9).add(new THREE.Vector3((R() - 0.5) * 2, (R() - 0.5) * 2, (R() - 0.5) * 2));
      this.fire.add({ pos: pos.clone().addScaledVector(dir, 0.03), vel: v, life: 0.04 + R() * 0.07, size: 0.0025 + R() * 0.003, alpha: 1, color: [1, 0.66, 0.3], drag: 7, gravity: 3, stretch: 3, fadeIn: 0, spin: 0 });
    }

    // Дым бездымного пороха: прозрачная серо-голубая дымка, быстро рассеивается.
    // Струя вдоль оси тормозится воздухом за 20–40 см, дальше дрейфует и тает.
    const lvl = size * (supp ? 0.7 : kind === 'brake' ? 0.8 : 1);
    const haze = (p, v, op) => this.smokePuff(p, v, { grey: 0.5 + R() * 0.12, tint: 1, ...op });
    const n = supp ? 5 : 8;
    for (let i = 0; i < n; i++) {
      const v = dir.clone().multiplyScalar((supp ? 0.4 : 1.2) + R() * (supp ? 0.8 : 2.4)).add(new THREE.Vector3((R() - 0.5) * 0.35, (R() - 0.3) * 0.3, (R() - 0.5) * 0.35));
      haze(pos.clone().addScaledVector(dir, 0.02 + R() * 0.12), v, { size: 0.02 + R() * 0.02, grow: 0.22 + R() * 0.28, alpha: (0.1 + R() * 0.07) * lvl, life: 0.9 + R() * 1.3, drag: 6 + R() * 3, buoy: 0.06, turb: 0.5, fadeIn: 0.02 });
    }
    const side = new THREE.Vector3(0, 0, 1).applyQuaternion(this.flameAxis.quaternion);
    const up = new THREE.Vector3(0, 1, 0);
    if (kind === 'brake' || kind === 'comp') {
      for (let i = 0; i < 6; i++) {
        const sg = kind === 'comp' ? (R() - 0.5) * 0.6 : (i % 2 ? 1 : -1);
        const v = side.clone().multiplyScalar(sg * (1.5 + R() * 2)).addScaledVector(up, kind === 'comp' ? 1.2 + R() * 1.5 : (R() - 0.2) * 0.6).addScaledVector(dir, R() * 0.6);
        haze(pos.clone(), v, { size: 0.02, grow: 0.25 + R() * 0.2, alpha: 0.09 * size, life: 0.9 + R() * 0.8, drag: 7, turb: 0.5 });
      }
    }
    // остаточная дымка у среза
    for (let i = 0; i < 2; i++) {
      haze(pos.clone().addScaledVector(dir, 0.05 + R() * 0.2), dir.clone().multiplyScalar(0.15 + R() * 0.3).add(new THREE.Vector3(0, 0.04, 0)), { size: 0.05, grow: 0.5 + R() * 0.3, alpha: 0.045 * lvl, life: 2.2 + R() * 1.5, drag: 2.5, buoy: 0.07, turb: 0.35, fadeIn: 0.2 });
    }
  }

  // пороховые газы из окна выброса
  portSmoke(pos, dir) {
    for (let i = 0; i < 2; i++) {
      const v = dir.clone().multiplyScalar(0.35 + R() * 0.3).add(new THREE.Vector3((R() - 0.5) * 0.1, 0.18 + R() * 0.1, 0));
      this.smokePuff(pos.clone(), v, { size: 0.01, grow: 0.1 + R() * 0.08, alpha: 0.09, life: 0.8 + R() * 0.6, drag: 3.5, grey: 0.6, tint: 1, turb: 0.3 });
    }
  }

  shellMesh(key, cal, live) {
    let m = this.inst.get(key);
    if (m) return m;
    const c = CAL[cal] || CAL['556'];
    const brass = c.steel ? this.mats.get('steelCase') : this.mats.get('brass');
    let g = caseGeo(cal), mat = brass;
    if (live) {
      // целый патрон: гильза + пуля, две группы материалов
      const parts = [g, bulletGeo(cal)].map((x) => (x.index ? x.toNonIndexed() : x));
      g = new THREE.BufferGeometry();
      for (const a of ['position', 'normal']) {
        const arr = new Float32Array(parts[0].getAttribute(a).array.length + parts[1].getAttribute(a).array.length);
        arr.set(parts[0].getAttribute(a).array, 0); arr.set(parts[1].getAttribute(a).array, parts[0].getAttribute(a).array.length);
        g.setAttribute(a, new THREE.BufferAttribute(arr, 3));
      }
      const n0 = parts[0].getAttribute('position').count;
      g.addGroup(0, n0, 0); g.addGroup(n0, parts[1].getAttribute('position').count, 1);
      mat = [brass, this.mats.get('copper')];
    }
    g.scale(0.001, 0.001, 0.001);
    g.translate(-c.L * 0.0005, 0, 0);
    m = new THREE.InstancedMesh(g, mat, live ? 8 : MAX_SHELLS);
    m.castShadow = true;
    m.count = 0;
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(m);
    this.inst.set(key, m);
    return m;
  }

  // Гильза: вылет из окна с кувырком, дымок из дульца, отскоки от бетона.
  shell(pos, vel, cal, quat, live = false) {
    const c = CAL[cal] || CAL['556'];
    const key = cal + (live ? ':live' : '');
    this.shellMesh(key, cal, live);
    const cap = live ? 8 : MAX_SHELLS;
    const same = this.shells.filter((x) => x.key === key);
    let s = same.find((x) => !x.alive);
    if (!s) {
      if (same.length >= cap) s = same.reduce((a, b) => (a.t > b.t ? a : b));
      else { s = { key, pos: new THREE.Vector3(), quat: new THREE.Quaternion(), vel: new THREE.Vector3(), w: new THREE.Vector3() }; this.shells.push(s); }
    }
    s.pos.copy(pos);
    s.quat.copy(quat);
    s.vel.copy(vel);
    // ось вращения: поперёк гильзы и направления вылета → кувырок «через голову»
    const axis = X_AXIS.clone().applyQuaternion(quat);
    const tumble = new THREE.Vector3().crossVectors(axis, vel).normalize();
    s.w.copy(tumble).multiplyScalar((live ? 12 : 24) + R() * 22).addScaledVector(axis, (R() - 0.5) * 12);
    s.alive = true; s.rest = false; s.t = 0; s.bounced = 0; s.steel = c.steel; s.live = live;
    s.r = c.rim * 0.0005;
    s.trail = live ? 0 : 0.28;
    return s;
  }

  // Попадание: пыль и комья по земле/валу, искры и отметина на стали.
  impact(hit, surface) {
    const p = hit.point, n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    if (surface === 'steel') {
      for (let i = 0; i < 3; i++) this.smokePuff(p.clone().addScaledVector(n, 0.02), n.clone().multiplyScalar(0.4).add(new THREE.Vector3((R() - 0.5) * 0.6, R() * 0.5, (R() - 0.5) * 0.6)), { life: 0.7, size: 0.06, grow: 0.25, alpha: 0.4, drag: 3 });
      for (let i = 0; i < 10; i++) {
        const v = n.clone().multiplyScalar(1 + R() * 2).add(new THREE.Vector3((R() - 0.5) * 4, R() * 3, (R() - 0.5) * 4));
        this.fire.add({ pos: p.clone().addScaledVector(n, 0.01), vel: v, life: 0.15 + R() * 0.25, size: 0.012 + R() * 0.01, alpha: 1, color: [1, 0.75, 0.4], drag: 1.5, gravity: 9.8, stretch: 2, fadeIn: 0, spin: 0 });
      }
      const hole = new THREE.Mesh(this.holeGeo, this.holeMat);
      hit.object.worldToLocal(hole.position.copy(p).addScaledVector(n, 0.0015));
      const ln = n.clone().transformDirection(new THREE.Matrix4().copy(hit.object.matrixWorld).invert());
      hole.lookAt(hole.position.clone().add(ln));
      hit.object.add(hole);
      this.holes.push(hole);
      if (this.holes.length > 80) { const h = this.holes.shift(); h.parent?.remove(h); }
    } else {
      for (let i = 0; i < 6; i++) {
        this.smoke.add({ pos: p.clone(), vel: n.clone().multiplyScalar(0.8 + R() * 1.4).add(new THREE.Vector3((R() - 0.5) * 0.9, R() * 1.2, (R() - 0.5) * 0.9)), life: 1 + R() * 0.8, size: 0.08, grow: 0.55, alpha: 0.55, color: [0.58, 0.5, 0.39], drag: 2.5, gravity: 0.4, turb: 0.3 });
      }
      for (let i = 0; i < 5; i++) {
        this.smoke.add({ pos: p.clone(), vel: n.clone().multiplyScalar(2 + R() * 2).add(new THREE.Vector3((R() - 0.5) * 2, R() * 2, (R() - 0.5) * 2)), life: 0.5 + R() * 0.3, size: 0.025, alpha: 0.9, color: [0.3, 0.26, 0.2], drag: 0.8, gravity: 9.8, fadeIn: 0 });
      }
    }
  }

  setLaser(on, pos, dir, hitables) {
    this.beam.visible = this.dot.visible = on;
    if (!on) return;
    this.ray.set(pos, dir);
    this.ray.far = 250;
    const h = this.ray.intersectObjects(hitables, false)[0];
    const d = h ? h.distance : 250;
    this.beam.position.copy(pos);
    this.beam.scale.set(d, 1, 1);
    this.beam.quaternion.setFromUnitVectors(X_AXIS, dir);
    this.dot.position.copy(pos).addScaledVector(dir, d - 0.01);
    this.dot.scale.setScalar(0.015 + d * 0.0022);
  }

  setLight(on, pos, dir, lumens = 1000) {
    this.spot.intensity = on ? 30 * (lumens / 1000) : 0;
    this.lampGlow.material.opacity = on ? 0.9 : 0;
    if (!on) return;
    this.spot.position.copy(pos);
    this.spot.target.position.copy(pos).addScaledVector(dir, 10);
    this.lampGlow.position.copy(pos).addScaledVector(dir, 0.004);
  }

  // muzzle — текущий дульный срез: от нагретого ствола после очереди идёт струйка дыма
  update(dt, onShellBounce, cam, muzzle) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flash.visible = false; this.flashLight.intensity = 0; } else { this.flashLight.intensity *= 0.5; this.flashFade *= 0.55; }
    }
    if (this.flash.visible && cam) {
      // с торца видна «звезда», сбоку — язык пламени вдоль оси
      const ax = this._v.set(1, 0, 0).applyQuaternion(this.flameAxis.quaternion);
      const f = Math.abs(ax.dot(this._v2.subVectors(this.flash.position, cam.position).normalize()));
      const F = this.flashFade;
      this.flameStar.material.opacity = this.flameStar.userData.a * (0.15 + 0.85 * f * f) * F;
      for (const m of this.flamePlanes) m.material.opacity = m.userData.a * (1 - 0.55 * f * f) * F;
    }
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - dt * 0.35);
      this.wispT -= dt;
      if (this.wispT <= 0 && this.heat > 0.3 && muzzle) {
        this.wispT = 0.06 + R() * 0.05;
        this.smokePuff(muzzle.clone(), new THREE.Vector3((R() - 0.5) * 0.02, 0.1 + R() * 0.06, (R() - 0.5) * 0.02), { size: 0.01, grow: 0.09, alpha: Math.min(0.08, this.heat * 0.035), life: 1.8 + R(), drag: 1.2, buoy: 0.06, turb: 0.12, grey: 0.6, tint: 1, fadeIn: 0.3 });
      }
    }
    for (const s of this.shells) {
      if (!s.alive) continue;
      s.t += dt;
      if (s.t > 10) { s.alive = false; continue; }
      if (s.rest) continue;
      s.vel.y -= 9.81 * dt;
      s.vel.multiplyScalar(Math.exp(-0.25 * dt));
      s.pos.addScaledVector(s.vel, dt);
      const wl = s.w.length();
      if (wl > 1e-3) { this._q.setFromAxisAngle(this._v.copy(s.w).divideScalar(wl), wl * dt); s.quat.premultiply(this._q); }
      if (s.trail > 0) {
        s.trail -= dt;
        if (R() < 0.45) this.smokePuff(s.pos.clone(), s.vel.clone().multiplyScalar(0.1), { size: 0.006, grow: 0.05, alpha: 0.06, life: 0.5 + R() * 0.4, drag: 4, grey: 0.62, tint: 1, fadeIn: 0.02 });
      }
      const floor = (Math.abs(s.pos.x + 0.8) < 3 && Math.abs(s.pos.z) < 2.5 ? 0.12 : 0) + s.r;
      if (s.pos.y < floor) {
        s.pos.y = floor;
        if (s.vel.y < -0.35) {
          s.vel.y *= -(0.28 + R() * 0.12); s.vel.x *= 0.55; s.vel.z *= 0.55;
          s.w.multiplyScalar(0.5).add(this._v.set((R() - 0.5) * 20, (R() - 0.5) * 30, (R() - 0.5) * 20));
          if (s.bounced++ < 2 && onShellBounce) onShellBounce(s, s.bounced);
        } else {
          // гильза ложится на бок: ось горизонтальна, случайный поворот вокруг оси
          s.rest = true;
          const ax = X_AXIS.clone().applyQuaternion(s.quat); ax.y = 0;
          if (ax.lengthSq() < 1e-6) ax.set(1, 0, 0);
          s.quat.setFromUnitVectors(X_AXIS, ax.normalize()).multiply(this._q.setFromAxisAngle(X_AXIS, R() * 6.28));
        }
      }
    }
    const counts = new Map();
    for (const s of this.shells) {
      if (!s.alive) continue;
      const m = this.inst.get(s.key), i = counts.get(s.key) || 0;
      m.setMatrixAt(i, this._m.compose(s.pos, s.quat, this._s));
      counts.set(s.key, i + 1);
    }
    for (const [k, m] of this.inst) {
      const n = counts.get(k) || 0;
      if (n || m.count) m.instanceMatrix.needsUpdate = true;
      m.count = n;
    }
    this.smoke.update(dt, cam, this.wind);
    this.fire.update(dt, cam, this.noWind);
  }
}
