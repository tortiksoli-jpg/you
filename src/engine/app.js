// Приложение: связывает сцену, сборку оружия, эффекты, звук и интерфейс.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene, GUN_Y } from './scene.js';
import { createMaterials } from './materials.js';
import { makeCtx } from './ctx.js';
import { Assembler, toRoot } from './mounts.js';
import { GunAudio } from './audio.js';
import { FX } from './fx.js';
import { reticleMesh } from './reticle.js';
import { UI } from './ui.js';

const D2R = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t * t * (3 - 2 * t);

// Сила отдачи по калибрам (градусы подброса на выстрел при recoilV = 100).
const KICK = { '556': 0.75, '545': 0.7, '762x39': 1.15, '762x51': 1.6 };

class Tweens {
  constructor() { this.list = []; }
  add(obj, key, to, dur, ease = (t) => t, done) {
    this.list = this.list.filter((t) => !(t.obj === obj && t.key === key));
    this.list.push({ obj, key, from: obj[key], to, dur: Math.max(dur, 1e-4), t: 0, ease, done });
  }
  wait(dur, done) { this.list.push({ obj: null, dur, t: 0, done }); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const w = this.list[i];
      w.t += dt;
      const k = Math.min(1, w.t / w.dur);
      if (w.obj) w.obj[w.key] = w.from + (w.to - w.from) * w.ease(k);
      if (k >= 1) { this.list.splice(i, 1); w.done && w.done(); }
    }
  }
}

export async function boot(def, lib) {
  const host = document.getElementById('app');
  const S = createScene(host);
  const mats = createMaterials(S.env);
  const ctx = makeCtx(mats);
  const asm = new Assembler(def, lib, ctx);
  const base = asm.base;
  const audio = new GunAudio();
  audio.profile = { ...def.audio, rpm: def.base.rpm };
  const fx = new FX(S.scene, mats);
  const tw = new Tweens();

  // aim — направление взгляда стрелка; rig — отдача; gun — модель в мм
  const aim = new THREE.Group();
  aim.position.set(0, GUN_Y, 0);
  S.scene.add(aim);
  const rig = new THREE.Group();
  aim.add(rig);
  const gun = asm.root;
  gun.scale.setScalar(0.001);
  rig.add(gun);
  const pivotX = (base.eyeX ?? -240) / 1000;

  const st = {
    mode: def.modes.includes('auto') ? 'auto' : def.modes[1] || 'semi',
    mag: 0, cap: 30, chambered: true, magIn: true,
    busy: false, trigger: false, lastShot: 0, burst: 0, held: false,
    ads: false, adsT: 0, sightIdx: 0, zoom: 1,
    light: false, laser: false, folded: false, bipod: false, magAside: false, holdOpen: false,
    yaw: 0, pitch: 0, climb: 0, rec: { p: 0, y: 0, z: 0, vp: 0, vy: 0, vz: 0 },
    stats: {}, baseStats: {},
  };

  let cfg = {};
  let ui = null;
  let sights = [];
  let lights = [], lasers = [];
  let stencilRef = 1;
  let lastOptic = null;

  function magKind() {
    const it = asm.installed.get('mag');
    const m = it?.obj;
    let steel = false;
    m?.traverse((o) => { if (o.isMesh && /steel|alu/.test(o.userData.mat || '')) steel = true; });
    return steel ? 'steel' : 'poly';
  }

  // --------------------------------------------------------- применение сборки
  function applyConfig(next, opts = {}) {
    cfg = asm.apply(next);
    const magInfo = asm.info('mag')?.mag;
    const prevCap = st.cap;
    st.cap = magInfo?.cap || def.base.mag || 30;
    if (opts.init || st.mag > st.cap || prevCap !== st.cap) st.mag = st.cap;
    if (!magInfo) st.magIn = false; else if (opts.init) st.magIn = true;
    const mz = asm.info('muzzle')?.muzzle;
    audio.muzzle = mz ? mz.kind : 'bare';
    st.stats = asm.stats();
    // прицельные: стенсил линз и сетки «в бесконечности»
    for (const it of asm.installed.values()) {
      const s = it.info?.sight;
      if (!s || !s.lens || s.lens.userData.stencilSet) continue;
      const ref = stencilRef++;
      const m = s.lens.material;
      m.stencilWrite = true; m.stencilRef = ref; m.stencilFunc = THREE.AlwaysStencilFunc;
      m.stencilZPass = THREE.ReplaceStencilOp;
      s.lens.userData.stencilSet = true;
      if (s.reticle) it.obj.add(reticleMesh(s.reticle, s, ref));
    }
    // откидные механические при наличии оптики
    const hasOptic = !!asm.info('optic')?.sight;
    for (const it of asm.installed.values()) {
      const f = it.info?.flip;
      if (f) tw.add(f.node.rotation, 'z', hasOptic ? f.angle * D2R : 0, opts.init ? 0.001 : 0.35, ease);
      const fa = it.info?.flipAside;
      if (fa) fa.node.rotation.x = st.magAside ? fa.angle * D2R : 0;
      const fo = it.info?.fold;
      if (fo) fo.node.rotation[fo.axis || 'y'] = st.folded ? fo.angle * D2R : 0;
      const bp = it.info?.bipod;
      if (bp) for (const l of bp.legs) l.rotation.z = st.bipod ? bp.angle * D2R : 0;
    }
    if (!asm.withInfo('bipod').length) st.bipod = false;
    if (!asm.withInfo('fold').length) st.folded = false;
    lights = asm.withInfo('light');
    lasers = asm.withInfo('laser');
    if (!lights.length) st.light = false;
    if (!lasers.length) st.laser = false;
    for (const l of lights) l.data.lens.material.emissiveIntensity = st.light ? 6 : 0;
    for (const l of lasers) l.data.lens.material.emissiveIntensity = st.laser ? 5 : 0;
    // магазин: видимость патронов
    const mi = asm.info('mag')?.mag;
    if (mi?.rounds) mi.rounds.visible = st.mag > 0;
    const magObj = asm.installed.get('mag')?.obj;
    if (magObj) { magObj.visible = st.magIn; magObj.position.y = 0; magObj.rotation.z = 0; }
    buildSights();
    if (ui) ui.refresh();
  }

  // Прицельные системы: оптика (+ увеличитель), затем механика.
  function buildSights() {
    const prev = sights[st.sightIdx]?.id;
    sights = [];
    const m = new THREE.Matrix4();
    const push = (id, label, obj, s) => {
      m.copy(toRoot(obj, gun));
      const eye = new THREE.Vector3(s.x0 ?? 0, s.y, s.z || 0).applyMatrix4(m);
      const dir = new THREE.Vector3(1, 0, 0).transformDirection(m);
      sights.push({ id, label, eye, dir, mag: s.mag || 1, zoom: s.zoom, reticle: s.reticle, eyeRelief: s.eyeRelief, magnifier: s.magnifier, x0: eye.x });
    };
    const opt = asm.installed.get('optic');
    if (opt?.info?.sight) push('optic', opt.part.name, opt.obj, opt.info.sight);
    for (const it of asm.installed.values()) if (it.slot.id !== 'optic' && it.info?.sight && !it.info.sight.magnifier) push(it.slot.id, it.part.name, it.obj, it.info.sight);
    const mg = asm.installed.get('magnifier');
    if (mg?.info?.sight && sights[0]) {
      m.copy(toRoot(mg.obj, gun));
      const eye = new THREE.Vector3(mg.info.sight.x0, mg.info.sight.y, 0).applyMatrix4(m);
      sights.splice(1, 0, { ...sights[0], id: 'magnifier', label: sights[0].label + ' + 3×', eye, mag: mg.info.sight.mag, eyeRelief: mg.info.sight.eyeRelief, withMag: true });
    }
    // механика: целик + мушка
    let rear = null, front = null;
    const pts = (it, key) => { const v = it.info?.irons?.[key]; if (!v) return null; return new THREE.Vector3(...v).applyMatrix4(toRoot(it.obj, gun)); };
    for (const it of asm.installed.values()) { rear = rear || pts(it, 'rear'); front = front || pts(it, 'front'); }
    if (base.irons?.rear && !rear) rear = new THREE.Vector3(...base.irons.rear);
    if (base.irons?.front && !front) front = new THREE.Vector3(...base.irons.front);
    const opticFolds = !!opt && [...asm.installed.values()].some((it) => it.info?.flip);
    if (rear && front && !opticFolds) {
      const dir = front.clone().sub(rear).normalize();
      sights.push({ id: 'irons', label: 'Механический прицел', eye: rear, dir, mag: 1, irons: true, x0: rear.x });
    }
    // только что установленный прицел становится активным
    const optNow = sights.find((s) => s.id === 'optic')?.label || null;
    const i = sights.findIndex((s) => s.id === prev);
    st.sightIdx = i >= 0 && optNow === lastOptic ? i : 0;
    lastOptic = optNow;
    if (sights[st.sightIdx]?.id === 'magnifier' && st.magAside) st.sightIdx = 0;
  }

  // ----------------------------------------------------------------- камера
  const f = base.focus || { center: [0, 0, 0], size: 900 };
  const controls = new OrbitControls(S.camera, S.renderer.domElement);
  controls.target.set(f.center[0] / 1000, GUN_Y + f.center[1] / 1000, f.center[2] / 1000);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.12;
  controls.maxDistance = 3.5;
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null };
  const orbitHome = () => {
    S.camera.position.set(controls.target.x - 0.2, controls.target.y + 0.17, controls.target.z + f.size / 1000 * 1.75);
    controls.update();
  };
  orbitHome();
  const focusTarget = new THREE.Vector3().copy(controls.target);
  const homeTarget = controls.target.clone();
  let focusDist = null;

  const orbitPose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: 38 };
  const baseFov = 38;

  function sightPose(out) {
    const s = sights[st.sightIdx];
    if (!s) return null;
    // положение глаза: у щеки на прикладе или по удалению выходного зрачка
    let ex = base.eyeX ?? -240;
    if (s.eyeRelief) ex = s.eye.x - s.eyeRelief;
    else if (!s.irons) ex = Math.min(ex, s.eye.x - 60);
    const t = (ex - s.eye.x) / (s.dir.x || 1);
    const eyeGun = s.eye.clone().addScaledVector(s.dir, t);
    const m = new THREE.Matrix4().makeScale(0.001, 0.001, 0.001);
    out.pos.copy(eyeGun).applyMatrix4(m);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), s.dir);
    out.quat.copy(q);
    const mag = s.zoom ? st.zoom : s.mag;
    out.fov = s.irons ? baseFov * 0.78 : baseFov / Math.max(1, mag) * (mag > 1 ? 1 : 0.88);
    out.mag = mag;
    out.s = s;
    return out;
  }

  // ---------------------------------------------------------------- стрельба
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tq = new THREE.Quaternion();
  function muzzleWorld(out, dir) {
    const mz = asm.mounts.get('muzzle');
    const len = asm.info('muzzle')?.muzzle?.x || 0;
    if (mz) mz.localToWorld(out.set(len, 0, 0)); else gun.localToWorld(out.set(...(base.muzzle || [400, 0, 0])));
    if (dir) dir.set(1, 0, 0).transformDirection(gun.matrixWorld).normalize();
    return out;
  }

  function canFire() { return st.mode !== 'safe' && !st.busy; }

  function fireOnce() {
    const now = performance.now() / 1000;
    if (!st.chambered) {
      audio.dryFire();
      st.held = false;
      if (ui) ui.toast(st.magIn ? 'Патронник пуст — перезарядка (R)' : 'Нет магазина');
      return false;
    }
    st.lastShot = now;
    audio.shot();
    const mzInfo = asm.info('muzzle')?.muzzle;
    const kind = mzInfo ? mzInfo.kind : 'bare';
    const pos = muzzleWorld(new THREE.Vector3(), tmp2);
    fx.muzzleFlash(pos, tmp2.clone(), kind, def.cal === '762x51' ? 1.3 : def.cal === '762x39' ? 1.15 : 1);
    // пуля: разброс = кучность + разброс от отдачи в очереди
    const spreadMoa = (st.stats.moa || 1.5) + Math.min(st.burst, 10) * 0.7 * (st.stats.recoilV || 100) / 100 + (st.ads ? 0 : 60);
    const sp = spreadMoa / 60 * D2R * 0.5;
    const dir = tmp2.clone();
    dir.x += 0; dir.y += (Math.random() - 0.5) * 2 * sp; dir.z += (Math.random() - 0.5) * 2 * sp;
    dir.normalize();
    const rc = new THREE.Raycaster(pos, dir, 0.05, 400);
    const hit = rc.intersectObjects(S.range.hitables, false)[0];
    if (hit) {
      const surf = hit.object.userData.surface || 'dirt';
      setTimeout(() => fx.impact(hit, surf), (hit.distance / (st.stats.velocity || 850)) * 1000);
      if (surf === 'steel') {
        S.range.hit(hit.object.userData.target, 2.5 + (def.cal === '762x51' ? 2 : 0));
        audio.ding(hit.distance);
      } else audio.thump(hit.distance);
    }
    // гильза и затвор
    cycleAction();
    // отдача
    const kick = (KICK[def.cal] || 0.8) * (st.stats.recoilV || 100) / 100 * (st.bipod ? 0.45 : 1);
    const side = (KICK[def.cal] || 0.8) * 0.5 * (st.stats.recoilH || 100) / 100 * (st.bipod ? 0.4 : 1);
    st.rec.vp += kick * 60 * (0.85 + Math.random() * 0.3);
    st.rec.vy += (Math.random() - 0.45) * side * 55;
    st.rec.vz += kick * 1.6;
    st.climb += kick * 0.55 * D2R;
    st.burst++;
    // подача следующего патрона
    if (st.magIn && st.mag > 0) { st.mag--; st.chambered = true; } else {
      st.chambered = false;
      if (base.anim?.holdOpen !== false && def.boltHold !== false && st.magIn) st.holdOpen = true;
    }
    const mi = asm.info('mag')?.mag;
    if (mi?.rounds) mi.rounds.visible = st.mag > 0;
    if (ui) ui.hud();
    return true;
  }

  function cycleAction() {
    const car = base.nodes?.carrier;
    const travel = base.anim?.carrierTravel || 80;
    const cyc = 60 / (def.base.rpm || 700);
    if (car) {
      const back = () => tw.add(car.position, 'x', -travel, cyc * 0.32, (t) => 1 - (1 - t) * (1 - t), () => {
        if (!st.chambered && st.holdOpen) return;
        tw.add(car.position, 'x', 0, cyc * 0.45, (t) => t * t);
      });
      back();
    }
    const pc = base.anim?.portCover;
    if (pc && pc.rotation.x < 1) tw.add(pc.rotation, 'x', 1.9, 0.08, (t) => 1 - (1 - t) * (1 - t));
    const tr = base.nodes?.trigger;
    if (tr) { tr.rotation.z = -0.16; tw.add(tr.rotation, 'z', 0, cyc * 0.9); }
    // выброс гильзы
    const ej = base.eject;
    if (ej) {
      setTimeout(() => {
        const p = gun.localToWorld(new THREE.Vector3(...ej.p));
        const d = new THREE.Vector3(...ej.dir).normalize().transformDirection(gun.matrixWorld);
        const v = d.multiplyScalar(3.2 + Math.random() * 1.2).add(new THREE.Vector3((Math.random() - 0.5) * 0.4, Math.random() * 0.6, 0));
        gun.getWorldQuaternion(tq);
        fx.shell(p, v, def.cal, tq);
        fx.portSmoke(p, d);
      }, cyc * 300);
    }
  }

  // ------------------------------------------------------- перезарядка
  function magNode() { return asm.installed.get('mag')?.obj || null; }
  function magMount() { return asm.mounts.get('magwell')?.userData.mount || {}; }

  function dropMag(done) {
    const m = magNode();
    if (!m || !st.magIn) { done && done(); return; }
    const kind = magKind();
    audio.magOut(kind);
    const rock = magMount().rock;
    const fall = () => {
      tw.add(m.position, 'y', -420, 0.42, (t) => t * t, () => { m.visible = false; m.position.y = 0; m.rotation.z = 0; audio.magDropGround(kind); });
      st.magIn = false;
      if (ui) ui.hud();
      setTimeout(() => done && done(), 380);
    };
    if (rock) tw.add(m.rotation, 'z', rock[2] * D2R, 0.16, ease, fall); else fall();
  }

  function insertMag(done) {
    const m = magNode();
    if (!m) { done && done(); return; }
    m.visible = true;
    m.position.y = -300;
    const rock = magMount().rock;
    m.rotation.z = rock ? rock[2] * D2R : 0;
    const kind = magKind();
    st.mag = st.cap;
    const mi = asm.info('mag')?.mag;
    if (mi?.rounds) mi.rounds.visible = true;
    tw.add(m.position, 'y', 0, 0.35, (t) => 1 - Math.pow(1 - t, 3), () => {
      const fin = () => { audio.magIn(kind); st.magIn = true; if (ui) ui.hud(); setTimeout(() => done && done(), 150); };
      if (rock) tw.add(m.rotation, 'z', 0, 0.14, ease, fin); else fin();
    });
  }

  function charge(done) {
    const car = base.nodes?.carrier;
    const ch = asm.installed.get('charger');
    const travel = base.anim?.carrierTravel || 80;
    const release = () => {
      if (st.magIn && st.mag > 0 && !st.chambered) { st.mag--; st.chambered = true; }
      st.holdOpen = false;
      const mi = asm.info('mag')?.mag;
      if (mi?.rounds) mi.rounds.visible = st.mag > 0;
      if (ui) ui.hud();
    };
    if (st.holdOpen && def.boltCatch !== false) {
      // затворная задержка: ладонью по кнопке — рама уходит вперёд
      audio.boltCatch();
      release();
      if (car) tw.add(car.position, 'x', 0, 0.06, (t) => t * t);
      setTimeout(() => done && done(), 250);
      return;
    }
    audio.chargeBack();
    const chObj = ch?.obj;
    const chTravel = ch?.info?.charger?.travel || 0;
    if (car) tw.add(car.position, 'x', -travel, 0.2, ease);
    if (chObj) tw.add(chObj.position, 'x', -chTravel, 0.2, ease);
    const wasChambered = st.chambered;
    setTimeout(() => {
      if (wasChambered) {
        // выброс неизрасходованного патрона
        const ej = base.eject;
        if (ej) {
          const p = gun.localToWorld(new THREE.Vector3(...ej.p));
          const d = new THREE.Vector3(...ej.dir).normalize().transformDirection(gun.matrixWorld).multiplyScalar(1.5);
          gun.getWorldQuaternion(tq);
          fx.shell(p, d, def.cal, tq);
        }
        st.chambered = false;
      }
      audio.chargeRelease();
      if (car) tw.add(car.position, 'x', 0, 0.07, (t) => t * t);
      if (chObj) tw.add(chObj.position, 'x', 0, 0.12, ease);
      release();
      setTimeout(() => done && done(), 200);
    }, 330);
  }

  function reload() {
    if (st.busy || !asm.info('mag')) return;
    if (st.magIn && st.mag >= st.cap && st.chambered) { ui?.toast('Магазин полный'); return; }
    st.busy = true; st.trigger = false;
    if (ui) ui.hud();
    const after = () => {
      if (!st.chambered) charge(() => { st.busy = false; ui?.hud(); });
      else { st.busy = false; ui?.hud(); }
    };
    dropMag(() => setTimeout(() => insertMag(after), 250));
  }

  function toggleMag() {
    if (st.busy || !asm.info('mag')) return;
    st.busy = true;
    if (st.magIn) dropMag(() => { st.busy = false; ui?.hud(); });
    else insertMag(() => { st.busy = false; ui?.hud(); });
  }

  function setMode(m) {
    st.mode = m;
    audio.selector();
    const sel = base.nodes?.selector;
    const a = base.anim?.selector?.[m];
    if (sel && a != null) tw.add(sel.rotation, 'z', a * D2R, 0.12, ease);
    ui?.hud();
  }
  function cycleMode() { const ms = def.modes; setMode(ms[(ms.indexOf(st.mode) + 1) % ms.length]); }

  // ------------------------------------------------------------ прицеливание
  function setADS(on) {
    if (on && !sights.length) { ui?.toast('Нет прицельного приспособления'); return; }
    if (on === st.ads) return;
    st.ads = on;
    if (on) {
      orbitPose.pos.copy(S.camera.position);
      orbitPose.quat.copy(S.camera.quaternion);
      controls.enabled = false;
      st.yaw = 0; st.pitch = 0;
      const s = sights[st.sightIdx];
      if (s?.zoom) st.zoom = clamp(st.zoom, s.zoom[0], s.zoom[1]);
    }
    audio.click();
    ui?.hud();
  }
  function cycleSight() {
    if (sights.length < 2) { ui?.toast(sights.length ? 'Другого прицела нет' : 'Нет прицела'); return; }
    st.sightIdx = (st.sightIdx + 1) % sights.length;
    if (sights[st.sightIdx].id === 'magnifier' && st.magAside) toggleMagnifier(false);
    ui?.toast('Прицел: ' + sights[st.sightIdx].label);
    ui?.hud();
  }
  function toggleMagnifier(aside) {
    const mg = asm.installed.get('magnifier');
    if (!mg?.info?.flipAside) return;
    st.magAside = aside ?? !st.magAside;
    const fa = mg.info.flipAside;
    tw.add(fa.node.rotation, 'x', st.magAside ? fa.angle * D2R : 0, 0.22, ease);
    audio.click();
    const mi = sights.findIndex((s) => s.id === 'magnifier');
    if (st.magAside && sights[st.sightIdx]?.id === 'magnifier') st.sightIdx = 0;
    else if (!st.magAside && mi >= 0) st.sightIdx = mi;
    ui?.hud();
  }

  // ----------------------------------------------------------- тактика
  function toggleLight() {
    if (!lights.length) { ui?.toast('Фонарь не установлен'); return; }
    st.light = !st.light; audio.click();
    for (const l of lights) l.data.lens.material.emissiveIntensity = st.light ? 6 : 0;
    ui?.hud();
  }
  function toggleLaser() {
    if (!lasers.length) { ui?.toast('ЛЦУ не установлен'); return; }
    st.laser = !st.laser; audio.click();
    for (const l of lasers) l.data.lens.material.emissiveIntensity = st.laser ? 5 : 0;
    ui?.hud();
  }
  function toggleBipod() {
    const b = asm.withInfo('bipod')[0];
    if (!b) { ui?.toast('Сошки не установлены'); return; }
    st.bipod = !st.bipod;
    for (const l of b.data.legs) tw.add(l.rotation, 'z', st.bipod ? b.data.angle * D2R : 0, 0.3, ease);
    audio.bipod();
    ui?.hud();
  }
  function toggleFold() {
    const f = asm.withInfo('fold')[0];
    if (!f) { ui?.toast('Приклад не складывается'); return; }
    st.folded = !st.folded;
    const ax = f.data.axis || 'y';
    tw.add(f.data.node.rotation, ax, st.folded ? f.data.angle * D2R : 0, 0.4, ease);
    audio.fold();
    ui?.hud();
  }

  // ---------------------------------------------------- изменение модулей
  function setPart(slotId, partId, pos) {
    const next = { ...cfg, [slotId]: partId ? { id: partId, pos: pos ?? (cfg[slotId]?.id === partId ? cfg[slotId].pos : null) } : null };
    const before = JSON.stringify(cfg);
    applyConfig(next);
    const part = partId && asm.part(partId);
    if (part) {
      const slot = def.slots.find((s) => s.id === slotId);
      audio.attach(slot?.mount === 'muzzle' ? 'thread' : /poly/.test(part.cat) ? 'poly' : 'rail');
    } else audio.click();
    // модуль мог вытеснить другие
    const lost = def.slots.filter((s) => next[s.id]?.id && !cfg[s.id]).map((s) => asm.part(next[s.id].id)?.name).filter(Boolean);
    if (partId && !cfg[slotId]) ui?.toast('Не помещается: ' + (asm.part(partId)?.name || ''));
    else if (lost.length && before !== JSON.stringify(cfg)) ui?.toast('Снято: ' + lost.join(', '));
    saveCfg();
  }
  function railMove(slotId, dir) {
    const it = asm.installed.get(slotId);
    if (!it?.railPos) return;
    const slot = def.slots.find((s) => s.id === slotId);
    const ps = asm.railPositions(slot, it.part, slotId).filter((p) => !p.clash);
    const i = ps.findIndex((p) => p.rail === it.railPos.rail && p.i === it.railPos.i);
    const n = ps[clamp(i + dir, 0, ps.length - 1)];
    if (!n || n === ps[i]) return;
    applyConfig({ ...cfg, [slotId]: { id: it.part.id, pos: { rail: n.rail, i: n.i } } });
    audio.click();
    saveCfg();
  }
  function railInfo(slotId) {
    const it = asm.installed.get(slotId);
    if (!it?.railPos) return null;
    const slot = def.slots.find((s) => s.id === slotId);
    const ps = asm.railPositions(slot, it.part, slotId).filter((p) => !p.clash);
    const i = ps.findIndex((p) => p.rail === it.railPos.rail && p.i === it.railPos.i);
    return { i, n: ps.length };
  }
  const LS = 'gunsmith:' + def.id;
  function saveCfg() { try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch (e) { /* приватный режим */ } }
  function resetCfg() { applyConfig(def.defaults, { init: true }); saveCfg(); audio.click(); }

  // Фокус камеры на модуле при выборе слота в меню
  function focusSlot(slotId) {
    if (st.ads) return;
    const it = asm.installed.get(slotId);
    const slot = def.slots.find((s) => s.id === slotId);
    let obj = it?.obj;
    if (!obj) {
      const mid = slot?.mount || slot?.rails?.find((r) => asm.mounts.get(r));
      obj = mid && asm.mounts.get(mid);
    }
    if (!obj) { focusTarget.copy(homeTarget); focusDist = null; return; }
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) obj.getWorldPosition(focusTarget); else box.getCenter(focusTarget);
    focusDist = 0.55;
  }
  function unfocus() { focusTarget.copy(homeTarget); focusDist = null; }

  // ----------------------------------------------------------------- ввод
  const pointer = { x: 0.5, y: 0.5 };
  const cvs = S.renderer.domElement;
  cvs.addEventListener('contextmenu', (e) => e.preventDefault());
  cvs.addEventListener('pointerdown', (e) => {
    audio.init();
    if (e.button === 2) { setADS(!st.ads); e.preventDefault(); return; }
    if (e.button === 0 && st.ads) { triggerDown(); e.preventDefault(); }
  });
  addEventListener('pointerup', (e) => { if (e.button === 0) triggerUp(); });
  cvs.addEventListener('pointermove', (e) => { pointer.x = e.clientX / innerWidth; pointer.y = e.clientY / innerHeight; hover(e); });
  cvs.addEventListener('wheel', (e) => {
    if (!st.ads) return;
    const s = sights[st.sightIdx];
    if (s?.zoom) { st.zoom = clamp(st.zoom * (e.deltaY < 0 ? 1.18 : 1 / 1.18), s.zoom[0], s.zoom[1]); ui?.hud(); }
    e.preventDefault();
  }, { passive: false });
  cvs.addEventListener('click', (e) => { if (!st.ads && !dragged) pick(e); });
  let downAt = null, dragged = false;
  cvs.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; dragged = false; });
  cvs.addEventListener('pointermove', (e) => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) dragged = true; });

  function triggerDown() {
    audio.init();
    if (st.trigger) return;
    st.trigger = true; st.held = true; st.burst = 0;
    if (st.mode === 'safe') { audio.click(); ui?.toast('Предохранитель (X — режим огня)'); return; }
    if (!canFire()) return;
    if (fireOnce()) st.nextShot = performance.now() / 1000 + 60 / (st.stats.rpm || def.base.rpm);
  }
  function triggerUp() { st.trigger = false; st.burst = 0; }

  const keys = {
    KeyR: reload, KeyX: cycleMode, KeyF: () => setADS(!st.ads), KeyV: cycleSight, KeyN: () => toggleMagnifier(),
    KeyC: toggleLight, KeyZ: toggleLaser, KeyB: toggleBipod, KeyK: toggleFold, KeyT: () => { if (!st.busy) { st.busy = true; charge(() => { st.busy = false; ui?.hud(); }); } },
    KeyM: toggleMag, Escape: () => setADS(false), KeyH: () => ui?.toggleHelp(),
  };
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    audio.init();
    if (e.code === 'Space') { if (!e.repeat) triggerDown(); e.preventDefault(); return; }
    if (e.repeat) return;
    const fn = keys[e.code];
    if (fn) { fn(); e.preventDefault(); }
  });
  addEventListener('keyup', (e) => { if (e.code === 'Space') triggerUp(); });

  // подсказка при наведении на деталь, клик — открыть слот
  const ray = new THREE.Raycaster();
  let hoverT = 0;
  function partUnder(e) {
    const p = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(p, S.camera);
    const hs = ray.intersectObject(gun, true);
    for (const h of hs) {
      if (!h.object.visible || h.object.userData.reticle) continue;
      let o = h.object;
      while (o && !o.userData.slotId && o !== gun) o = o.parent;
      if (o && o.userData.slotId) return o.userData;
      return { base: true };
    }
    return null;
  }
  function hover(e) {
    if (st.ads || e.buttons) { ui?.tip(null); return; }
    const now = performance.now();
    if (now - hoverT < 60) return;
    hoverT = now;
    const u = partUnder(e);
    if (u && u.partId) ui?.tip(asm.part(u.partId)?.name, e.clientX, e.clientY);
    else if (u && u.base) ui?.tip(def.title, e.clientX, e.clientY);
    else ui?.tip(null);
  }
  function pick(e) {
    const u = partUnder(e);
    if (u?.slotId) ui?.openSlot(u.slotId);
  }

  // ------------------------------------------------------------------ цикл
  const adsPose = { pos: new THREE.Vector3(), quat: new THREE.Quaternion(), fov: baseFov };
  const clock = new THREE.Clock();
  const camKick = new THREE.Quaternion();
  const eulerTmp = new THREE.Euler();

  function applyViewOffset() {
    const o = Math.round(st.viewOff || 0);
    if (Math.abs(o) < 1) { if (S.camera.view) S.camera.clearViewOffset(); return; }
    S.camera.setViewOffset(innerWidth, innerHeight, -o, 0, innerWidth, innerHeight);
  }

  function update(dt) {
    tw.update(dt);
    // автоматический огонь
    const now = performance.now() / 1000;
    if (st.trigger && st.held && st.mode === 'auto' && canFire() && st.chambered && now >= (st.nextShot || 0)) {
      fireOnce();
      st.nextShot = Math.max(now, (st.nextShot || now)) + 60 / (st.stats.rpm || def.base.rpm);
    }
    if (st.trigger && st.mode === 'auto' && !st.chambered && st.held && now >= (st.nextShot || 0)) { audio.dryFire(); st.held = false; }

    // пружина отдачи
    const r = st.rec;
    const k = 180, d = 20;
    r.vp += (-k * r.p - d * r.vp) * dt; r.p += r.vp * dt;
    r.vy += (-k * r.y - d * r.vy) * dt; r.y += r.vy * dt;
    r.vz += (-260 * r.z - 26 * r.vz) * dt; r.z += r.vz * dt;
    st.climb *= Math.pow(0.12, dt);

    // прицеливание курсором в режиме прицела
    if (st.ads) {
      const ty = -(pointer.x - 0.5) * 0.55, tp = -(pointer.y - 0.5) * 0.35;
      st.yaw = lerp(st.yaw, ty, 1 - Math.pow(0.001, dt));
      st.pitch = lerp(st.pitch, tp, 1 - Math.pow(0.001, dt));
    } else {
      st.yaw = lerp(st.yaw, 0, 1 - Math.pow(0.01, dt));
      st.pitch = lerp(st.pitch, 0, 1 - Math.pow(0.01, dt));
    }
    aim.rotation.set(0, st.yaw, st.pitch + st.climb, 'YZX');
    // модель отдачи: поворот вокруг плеча + отход назад
    rig.position.set(-r.z * 0.001 * 12 + pivotX * 0, 0, 0);
    rig.rotation.set(0, r.y * D2R * 0.6, r.p * D2R * 0.5);
    rig.position.x -= pivotX * (Math.cos(r.p * D2R * 0.5) - 1);
    rig.position.y = -pivotX * Math.sin(r.p * D2R * 0.5);

    // камера
    st.adsT = clamp(st.adsT + (st.ads ? 1 : -1) * dt / ((st.stats.adsTime || 280) / 1000 + 0.05), 0, 1);
    if (st.adsT > 0) {
      const p = sightPose(adsPose);
      if (p) {
        aim.updateMatrixWorld();
        const wpos = p.pos.clone().applyMatrix4(aim.matrixWorld);
        eulerTmp.set(0, r.y * D2R * 0.15, r.p * D2R * 0.22, 'YZX');
        camKick.setFromEuler(eulerTmp);
        const wq = aim.getWorldQuaternion(new THREE.Quaternion()).multiply(camKick).multiply(p.quat);
        const e = ease(st.adsT);
        S.camera.position.lerpVectors(orbitPose.pos, wpos, e);
        S.camera.quaternion.slerpQuaternions(orbitPose.quat, wq, e);
        S.camera.fov = lerp(baseFov, p.fov, e);
        st.viewOff = lerp(st.viewOff || 0, 0, e);
        applyViewOffset();
        S.camera.updateProjectionMatrix();
        const magnified = p.mag > 1.5 && st.adsT > 0.92;
        gun.visible = !magnified;
        ui?.scope(magnified ? p : null, st.adsT > 0.92 ? p : null);
      }
      if (!st.ads && st.adsT === 0) { controls.enabled = true; }
    } else {
      if (S.camera.fov !== baseFov) { S.camera.fov = baseFov; S.camera.updateProjectionMatrix(); }
      // центрируем оружие в свободной области между панелями
      const off = ui ? ui.viewOffset() : 0;
      st.viewOff = lerp(st.viewOff || 0, off, 1 - Math.pow(0.01, dt));
      gun.visible = true;
      ui?.scope(null, null);
      controls.enabled = true;
      controls.target.lerp(focusTarget, 1 - Math.pow(0.02, dt));
      if (focusDist) {
        const off = S.camera.position.clone().sub(controls.target);
        const l = off.length();
        if (Math.abs(l - focusDist) > 0.01) S.camera.position.copy(controls.target).addScaledVector(off.normalize(), lerp(l, focusDist, 1 - Math.pow(0.05, dt)));
      }
      applyViewOffset();
      controls.update();
    }

    // фонарь и ЛЦУ
    gun.updateMatrixWorld(true);
    if (lights.length && st.light) {
      const L = lights[0];
      const p = L.obj.localToWorld(new THREE.Vector3(...L.data.p));
      const dv = new THREE.Vector3(1, 0, 0).transformDirection(L.obj.matrixWorld);
      fx.setLight(true, p, dv, L.data.lumens);
    } else fx.setLight(false);
    if (lasers.length && st.laser) {
      const L = lasers[0];
      const p = L.obj.localToWorld(new THREE.Vector3(...L.data.p));
      const dv = new THREE.Vector3(1, 0, 0).transformDirection(L.obj.matrixWorld);
      fx.setLaser(true, p, dv, S.range.hitables);
    } else fx.setLaser(false);

    fx.update(dt, (s) => audio.casing(0, s.steel, 0.8));
    S.range.update(dt);
  }

  // ------------------------------------------------------------ интерфейс
  const app = {
    def, asm, st, S, gun, rig, aim, fx, audio, mats,
    get cfg() { return cfg; }, get sights() { return sights; },
    setPart, railMove, railInfo, resetCfg, focusSlot, unfocus,
    triggerDown, triggerUp, reload, cycleMode, setADS, cycleSight, toggleMagnifier,
    toggleLight, toggleLaser, toggleBipod, toggleFold, toggleMag,
    charge: () => keys.KeyT(),
    toggleSound: () => { audio.init(); audio.setMuted(!audio.muted); ui?.hud(); },
    defaultStats: null,
  };

  // стартовая конфигурация: сохранённая → ?cfg → по умолчанию
  let start = def.defaults;
  try { const sv = JSON.parse(localStorage.getItem(LS) || 'null'); if (sv) start = { ...def.defaults, ...sv }; } catch (e) { /* пусто */ }
  const qs = new URLSearchParams(location.search);
  if (qs.get('cfg')) { try { start = { ...def.defaults, ...JSON.parse(qs.get('cfg')) }; } catch (e) { console.error('cfg', e); } }
  applyConfig(def.defaults, { init: true });
  app.defaultStats = { ...st.stats };
  applyConfig(start, { init: true });
  const sel = base.nodes?.selector, a0 = base.anim?.selector?.[st.mode];
  if (sel && a0 != null) sel.rotation.z = a0 * D2R;
  ui = new UI(app);
  ui.refresh();

  // отладочные параметры вида
  const setView = (v, zoom = 1) => {
    const t = controls.target, dd = (f.size / 1000) * 1.25 / zoom;
    const V = { right: [0, 0.05, 1], left: [0, 0.05, -1], top: [0, 1, 0.001], front: [1, 0.1, 0.02], back: [-1, 0.1, 0.02], iso: [-0.5, 0.35, 0.8], isoL: [-0.5, 0.35, -0.8], under: [0, -1, 0.001] }[v] || [-0.15, 0.13, 1];
    const l = Math.hypot(...V);
    S.camera.position.set(t.x + V[0] / l * dd, t.y + V[1] / l * dd, t.z + V[2] / l * dd);
    controls.update();
  };
  if (qs.get('at')) { const a = qs.get('at').split(',').map(Number); controls.target.set(a[0] / 1000, GUN_Y + a[1] / 1000, (a[2] || 0) / 1000); focusTarget.copy(controls.target); homeTarget.copy(controls.target); }
  if (qs.get('view') || qs.get('zoom') || qs.get('at')) setView(qs.get('view'), +(qs.get('zoom') || 1));
  if (qs.get('ads')) { setADS(true); st.adsT = 1; }
  if (qs.get('ui') === '0') document.body.classList.add('noui');
  app.setView = setView;

  const bootEl = document.getElementById('boot');
  if (bootEl) bootEl.classList.add('off');
  window.__app = app;

  const loop = () => {
    requestAnimationFrame(loop);
    if (window.__pause) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    update(dt);
    S.renderer.render(S.scene, S.camera);
  };
  loop();
  return app;
}
