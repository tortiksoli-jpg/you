// Общие элементы модулей: прижимы на планку, винты, крышки, линзы.
import * as G from '../geo.js';

// Башмак на Пикатинни: охватывает планку, начало — верх планки по центру.
// Возвращает геометрию корпуса; y1 — высота верхней плоскости.
export function clampBody(x0, x1, y1, o = {}) {
  const w = (o.w ?? 26) / 2, jaw = o.jaw ?? -6.6;
  const sec = [[-w, jaw, 1], [-w + 1.6, jaw - 0.2], [w - 1.6, jaw - 0.2], [w, jaw, 1], [w, y1, o.r ?? 1.2], [-w, y1, o.r ?? 1.2]];
  return G.extrudeX(sec, x0, x1, { bevel: o.bevel ?? 0.8 });
}

// Поперечный винт прижима: гайка справа, головка слева.
export function crossBolt(x, y = -2.5, w = 13, o = {}) {
  const nut = G.T(G.cylZ(o.nutR ?? 4.2, 0, o.nutH ?? 3.2, { seg: 6, c: 0.3 }), { p: [x, y, w] });
  const head = G.T(G.cylZ(o.headR ?? 3.4, 0, 1.6, { seg: 18, c: 0.4 }), { p: [x, y, -w - 1.6] });
  return [nut, head];
}

// Рычаг быстросъёмного крепления (ADM/LaRue): на левом борту.
export function qdLever(x0, x1, y, w = 13) {
  const len = x1 - x0;
  const pro = [[0, 0, 0.5], [len, 0, 2], [len, 7, 3], [len * 0.2, 6.5, 2], [0, 4, 1]];
  const g = G.extrudeZ(pro, 3.6, { bevel: 0.8 });
  const pivot = G.cylZ(3.6, -1.2, 1.2, { seg: 16 });
  return [G.T(g, { p: [x0, y - 3, -w - 1.6] }), G.T(pivot, { p: [x1 - 3, y, -w - 2.8] })];
}

// Барабан с насечкой (маховик, крышка батареи) вдоль Z, от z0 наружу на h.
export function knob(r, h, grooves = 24, o = {}) {
  const gs = [G.cylX(r - 0.6, 0, h, { c: 0.6, seg: 32 })];
  if (grooves) gs.push(G.flutesX(r - 0.9, 0.6, h - (o.lipH ?? 0.8), grooves, 1.1, 0.9));
  return G.merge(gs);
}

// Откидная крышка линзы (резина) в открытом положении: шарнир сверху.
export function flipCap(r, t = 2.4) {
  const disc = G.cylX(r + 1.6, 0, t, { c: 0.6, seg: 28 });
  const hinge = G.T(G.box(6, 5, 10, { bevel: 1 }), { p: [t / 2, r + 3, 0] });
  const tab = G.T(G.box(3, 7, 8, { bevel: 1 }), { p: [t / 2, -r - 4, 0] });
  return G.merge([disc, hinge, tab]);
}

// Прозрачная линза-диск вдоль X.
export function lensDisc(r, x, t = 1.2) { return G.cylX(r, x - t / 2, x + t / 2, { c: 0.2, seg: 32 }); }

// Кольцо с внутренним каналом (корпус оптики), профиль [[x, rOut]] + радиус канала.
export function hollowLathe(prof, rIn, o = {}) {
  const back = [];
  const x0 = prof[0][0], x1 = prof[prof.length - 1][0];
  const inner = typeof rIn === 'number' ? [[x1, rIn], [x0, rIn]] : rIn.slice().reverse();
  return G.latheX([[x0, inner[inner.length - 1][1]], ...prof, ...inner, [x0, inner[inner.length - 1][1]]], o);
}

/* ---------------------------------------------------------------- патроны */

// Размеры (мм): гильза L, Ø дна, Ø у ската, Ø дульца, длина до ската, полная длина.
export const CAL = {
  '556': { L: 44.7, rim: 9.6, sh: 9.0, neck: 6.4, shX: 36.5, oal: 57.4, steel: false },
  '545': { L: 39.8, rim: 10.0, sh: 9.2, neck: 6.3, shX: 31.5, oal: 57.0, steel: true },
  '762x39': { L: 38.6, rim: 11.35, sh: 10.1, neck: 8.6, shX: 30.5, oal: 56.0, steel: true },
  '762x51': { L: 51.2, rim: 11.9, sh: 11.5, neck: 8.7, shX: 39.6, oal: 71.1, steel: false },
};

export function caseGeo(cal) {
  const c = CAL[cal] || CAL['556'];
  const r = c.rim / 2, s = c.sh / 2, n = c.neck / 2;
  return G.latheX([[0, 0], [0, r - 0.3], [0.3, r], [1.3, r], [1.6, r - 0.8], [2.4, r - 0.8], [2.9, r - 0.15],
    [c.shX, s], [c.shX + (s - n) * 1.5, n], [c.L, n], [c.L, n - 0.4]], { seg: 18 });
}

export function bulletGeo(cal) {
  const c = CAL[cal] || CAL['556'];
  const n = c.neck / 2 - 0.35, len = c.oal - c.L + 5;
  const pts = [[c.L - 5, n]];
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    pts.push([c.L - 5 + len * (0.35 + 0.65 * t), n * Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.8))) + 0.2 * (1 - t)]);
  }
  pts.push([c.L - 5 + len, 0]);
  return G.latheX([[c.L - 5, 0], ...pts], { seg: 16, crease: 60 });
}

// Патрон вдоль +X, начало — дно гильзы.
export function cartridge(k, cal, t) {
  const c = CAL[cal] || CAL['556'];
  k.add(c.steel ? 'steelCase' : 'brass', caseGeo(cal), t && { ...t });
  k.add('copper', bulletGeo(cal), t && { ...t });
}
