// Система креплений. Каждая точка крепления — Object3D, у которого
// начало координат лежит на рабочей поверхности (верх планки, торец резьбы,
// посадка магазина), +X — вдоль оси оружия к дулу, +Y — от поверхности наружу.
// Модули строятся так, что их собственное начало совпадает с этой точкой,
// поэтому они физически не могут «висеть» в воздухе.
import * as THREE from 'three';
import { PICA } from './geo.js';

// Создаёт узел-крепление. o: {id, type, p:[x,y,z], face:'top'|'left'|'right'|'bottom', ...}
export function mount(o) {
  const n = new THREE.Group();
  n.name = 'mount:' + o.id;
  if (o.p) n.position.set(...o.p);
  const face = o.face || 'top';
  // +Y узла — наружу от поверхности; у боковых планок модуль «лежит» на боку
  if (face === 'left') n.rotation.x = -Math.PI / 2;
  else if (face === 'right') n.rotation.x = Math.PI / 2;
  else if (face === 'bottom') n.rotation.x = Math.PI;
  n.userData.mount = { pitch: PICA.PITCH, ...o, face };
  return n;
}

// Планка Пикатинни: slots — число поперечных пазов, первый паз в x = 0 узла.
export function railMount(id, p, face, slots, extra = {}) {
  return mount({ id, type: 'pica', p, face, slots, ...extra });
}

const _m = new THREE.Matrix4(), _v = new THREE.Vector3();

// Матрица узла относительно корня оружия (в мм модели).
export function toRoot(obj, root) {
  const m = new THREE.Matrix4();
  const chain = [];
  let o = obj;
  while (o && o !== root) { chain.push(o); o = o.parent; }
  for (let i = chain.length - 1; i >= 0; i--) { chain[i].updateMatrix(); m.multiply(chain[i].matrix); }
  return m;
}

export function pointToRoot(obj, root, p) {
  return new THREE.Vector3(...(Array.isArray(p) ? p : [p.x, p.y, p.z])).applyMatrix4(toRoot(obj, root));
}

/* ---------------------------------------------------------------- сборщик */

export class Assembler {
  // def — описание оружия, lib — общая библиотека модулей, ctx — {THREE, G, mats, Kit}
  constructor(def, lib, ctx) {
    this.def = def; this.ctx = ctx;
    this.parts = new Map();
    for (const p of [...lib, ...(def.parts || [])]) this.parts.set(p.id, p);
    this.base = def.build(ctx);
    this.root = new THREE.Group();
    this.root.name = def.id;
    this.root.add(this.base.root);
    this.cache = new Map();
    this.installed = new Map(); // slotId -> {part, obj, info, mount, pos}
    this.mounts = new Map();
    this.config = {};
  }

  partList() { return [...this.parts.values()]; }
  part(id) { return this.parts.get(id); }

  // Статическая совместимость: может ли модуль в принципе встать на это оружие.
  static fits(part, slot, def) {
    if (!slot.accepts.includes(part.cat)) return false;
    if (part.only && !part.only.includes(def.id)) return false;
    if (part.fit?.thread && !part.fit.thread.includes(slot.thread || def.thread)) return false;
    if (part.fit?.iface && slot.iface && !part.fit.iface.includes(slot.iface)) return false;
    return true;
  }

  slotOptions(slot) {
    return this.partList().filter((p) => Assembler.fits(p, slot, this.def));
  }

  collectMounts() {
    this.mounts.clear();
    const walk = (o) => {
      if (o.userData.mount) this.mounts.set(o.userData.mount.id, o);
      for (const c of o.children) walk(c);
    };
    walk(this.root);
  }

  // Все допустимые позиции модуля на наборе планок, отсортированные вдоль оси.
  railPositions(slot, part, ignoreSlot) {
    const out = [];
    const foot = part.foot || [-5, 5];
    for (const rid of slot.rails || []) {
      const m = this.mounts.get(rid);
      if (!m) continue;
      const md = m.userData.mount;
      const accepts = part.mountTypes || ['pica'];
      if (!accepts.includes(md.type)) continue;
      const mat = toRoot(m, this.root);
      const n = md.slots || 1;
      for (let i = 0; i < n; i++) {
        const lx = i * (md.pitch || PICA.PITCH);
        // башмак модуля должен целиком лежать на планке
        if (md.type === 'pica') {
          const lo = -PICA.PITCH / 2 - 1.5, hi = (n - 1) * PICA.PITCH + PICA.PITCH / 2 + 1.5;
          if (lx + foot[0] < lo - 0.01 || lx + foot[1] > hi + 0.01) continue;
        }
        const wx = _v.set(lx, 0, 0).applyMatrix4(mat).x;
        out.push({ rail: rid, i, x: wx, face: md.face, axis: md.axis || md.face });
      }
    }
    out.sort((a, b) => a.x - b.x);
    // исключить позиции, где корпус модуля пересекается с уже установленными
    const body = part.body || part.foot || [-5, 5];
    return out.map((p) => ({ ...p, clash: this.clash(p, body, ignoreSlot, slot) }));
  }

  clash(p, body, ignoreSlot, slot) {
    const x0 = p.x + body[0], x1 = p.x + body[1];
    for (const [sid, it] of this.installed) {
      if (sid === ignoreSlot || !it.railPos) continue;
      if (it.railPos.axis !== p.axis) continue;
      const b = it.part.body || it.part.foot || [-5, 5];
      const y0 = it.railPos.x + b[0], y1 = it.railPos.x + b[1];
      if (x0 < y1 - 0.5 && y0 < x1 - 0.5) return this.def.slots.find((s) => s.id === sid)?.label || sid;
    }
    // обязательные зоны на планке (напр. рукоять заряжания, мушка)
    for (const z of this.def.keepOut || []) {
      if (z.axis !== p.axis) continue;
      if (z.slots && !z.slots.includes(slot.id)) continue;
      if (x0 < z.x1 && z.x0 < x1) return z.label;
    }
    return null;
  }

  built(slotId, part) {
    const key = slotId + '|' + part.id;
    if (!this.cache.has(key)) {
      const res = part.build(this.ctx, { weapon: this.def, slot: slotId });
      const obj = res.root || res;
      obj.name = 'part:' + part.id;
      obj.userData.partId = part.id;
      obj.userData.slotId = slotId;
      obj.traverse((o) => { if (o.isMesh) { o.userData.partId = part.id; o.userData.slotId = slotId; } });
      this.cache.set(key, { obj, info: res.root ? res : { root: obj } });
    }
    return this.cache.get(key);
  }

  // Применяет конфигурацию {slotId: {id, pos}}; возвращает исправленную версию.
  apply(config) {
    for (const it of this.installed.values()) it.obj.parent?.remove(it.obj);
    this.installed.clear();
    const out = {};
    // скрытые узлы базы (штатные детали, заменённые модулями)
    const hidden = new Set();
    this.collectMounts();
    for (const slot of this.def.slots) {
      const want = config[slot.id];
      const pid = want && typeof want === 'object' ? want.id : want;
      if (!pid) { out[slot.id] = null; continue; }
      const part = this.parts.get(pid);
      if (!part || !Assembler.fits(part, slot, this.def)) { out[slot.id] = null; continue; }
      if (part.needs && !part.needs(out, this)) { out[slot.id] = null; continue; }
      let host = null, railPos = null;
      if (slot.rails) {
        const ps = this.railPositions(slot, part, slot.id).filter((p) => !p.clash);
        if (!ps.length) { out[slot.id] = null; continue; }
        const wantPos = want && typeof want === 'object' && want.pos != null ? want.pos : null;
        let pick = null;
        if (wantPos) pick = ps.find((p) => p.rail === wantPos.rail && p.i === wantPos.i);
        if (!pick) {
          const pref = slot.prefer;
          if (pref && typeof pref === 'object') pick = ps.reduce((a, b) => (Math.abs(b.x - pref.x) < Math.abs(a.x - pref.x) ? b : a));
          else if (pref === 'front') pick = ps[ps.length - 1];
          else if (pref === 'rear') pick = ps[0];
          else pick = ps[Math.floor(ps.length / 2)];
        }
        railPos = pick;
        host = this.mounts.get(pick.rail);
      } else {
        host = this.mounts.get(slot.mount);
      }
      if (!host) { out[slot.id] = null; continue; }
      const { obj, info } = this.built(slot.id, part);
      obj.position.set(railPos ? railPos.i * (host.userData.mount.pitch || PICA.PITCH) : 0, 0, 0);
      obj.rotation.set(0, 0, 0);
      host.add(obj);
      this.installed.set(slot.id, { part, obj, info, host, railPos, slot });
      for (const h of part.hides || []) hidden.add(h);
      out[slot.id] = { id: pid, pos: railPos ? { rail: railPos.rail, i: railPos.i } : null };
      // новые крепления (цевьё с планками, кронштейны)
      obj.traverse((o) => { if (o.userData.mount) this.mounts.set(o.userData.mount.id, o); });
    }
    this.base.root.traverse((o) => { if (o.userData.hideKey) o.visible = !hidden.has(o.userData.hideKey); });
    this.config = out;
    return out;
  }

  info(slotId) { return this.installed.get(slotId)?.info || null; }

  // Все установленные модули с заданным свойством info (sight, light, laser ...).
  withInfo(key) {
    const out = [];
    for (const [sid, it] of this.installed) if (it.info && it.info[key]) out.push({ slotId: sid, ...it, data: it.info[key] });
    if (this.base[key]) out.unshift({ slotId: '_base', obj: this.base.root, data: this.base[key], info: this.base });
    return out;
  }

  stats() {
    const s = { ...this.def.base };
    const mods = [];
    for (const it of this.installed.values()) if (it.part.stats) mods.push(it.part.stats);
    for (const m of mods) {
      for (const [k, v] of Object.entries(m)) {
        if (k === 'mag') continue;
        if (k.endsWith('%')) { const kk = k.slice(0, -1); s[kk] = (s[kk] ?? 0) * (1 + v / 100); }
        else if (k === 'loud' || k === 'flash' || k === 'velocity' || k === 'rangeAdd') s[k] = (s[k] ?? 0) + v;
        else s[k] = (s[k] ?? 0) + v;
      }
    }
    for (const it of this.installed.values()) if (it.part.stats?.mag) s.mag = it.part.stats.mag;
    return s;
  }
}
