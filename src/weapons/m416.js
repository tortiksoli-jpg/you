// HK416 A5 (в играх — M416). 5,56×45, ствол 14,5" (368 мм), газовый поршень.
// Размеры — по чертежам AR-15/HK416: ось канала Y = 0, зеркало затвора X = 0.
import { M416_PARTS } from './m416_parts.js';

const RAIL_TOP = 30.5; // верх планки над осью канала — стандарт AR

function upperReceiver(ctx, k) {
  const { G } = ctx;
  const sec = [[14.5, -13, 1], [14.5, 6, 1], [11, 15, 2], [-11, 15, 2], [-14.5, 6, 1], [-14.5, -13, 1]];
  // сечение в зоне окна выброса: правый борт вскрыт до канала затворной рамы
  const rB = 12.4, yT = 5, yB = -8;
  const port = [[14.5, yT], [14.5, 6], [11, 15], [-11, 15], [-14.5, 6], [-14.5, -13], [14.5, -13], [14.5, yB]];
  const a0 = Math.atan2(yB, Math.sqrt(rB * rB - yB * yB)), a1 = Math.atan2(yT, Math.sqrt(rB * rB - yT * yT)) - Math.PI * 2;
  for (let i = 0; i <= 28; i++) { const a = a0 + (a1 - a0) * (i / 28); port.push([Math.cos(a) * rB, Math.sin(a) * rB]); }
  k.add('alu', G.extrudeX(sec, -142, -60, { bevel: 0.8 }));
  k.add('alu', G.extrudeX(port, -60, 8, { bevel: 0.25 }));
  k.add('alu', G.extrudeX(sec, 8, 38, { bevel: 0.8 }));
  // верхняя планка ствольной коробки
  const r = G.picatinny(178, { base: RAIL_TOP - 14.5 });
  k.add('alu', r.geo, { p: [-141, RAIL_TOP, 0] });
  // заслонка для рукояти заряжания, задний выступ
  k.add('alu', G.extrudeX([[-9, -13, 1], [9, -13, 1], [9, -4, 2], [-9, -4, 2]], -150, -140, { bevel: 0.6 }));
  // отражатель гильз
  k.add('alu', G.extrudeY([[-74, 14.2], [-58, 14.2], [-58, 19.5, 2], [-67, 21, 3]], -3, 14, { bevel: 0.8 }));
  // досылатель (forward assist): корпус под углом 30° к оси
  k.add('alu', G.T(G.cylX(6.8, 0, 30, { c: 1.2, seg: 24 }), { r: [0, 28, 0], p: [-125, 6, 13] }));
  k.add('steel', G.T(G.ringGrooves(5.4, -10, 0.5, 6, 0.4, { seg: 24 }), { r: [0, 28, 0], p: [-125, 6, 13] }));
  // накладка-упор рамы справа, шляпки штифтов
  k.add('steel', G.pin(2.2, 30), { p: [-122, -8, 0] });
  // метки на планке — насечки номеров не делаем, но ставим торцевые скосы
  return { railFirst: -141 + r.first, railSlots: r.slots };
}

function lowerReceiver(ctx, k, nodes) {
  const { G } = ctx;
  // корпус УСМ
  const body = [[-150, -13], [30, -13], [30, -24], [-40, -24], [-42, -40, 2], [-118, -40], [-124, -44, 2], [-150, -44, 3], [-156, -30, 6], [-156, -13]];
  k.add('alu', G.extrudeZ(body, 24, { bevel: 1.6 }));
  // приёмник магазина с раструбом (полый, магазин виден сверху при снятии)
  const well = G.shape(G.rrect(-6, 0, 74, 31, 3), [G.rrect(-6, 0, 67, 25, 2)]);
  k.add('alu', G.extrudeY(well, -60, -14, { bevel: 0.8 }));
  const flare = G.shape(G.rrect(-5, 0, 80, 35, 5), [G.rrect(-6, 0, 67, 25, 2)]);
  k.add('alu', G.extrudeY(flare, -65, -58, { bevel: 1.4 }));
  // передний прилив шарнирной оси
  k.add('alu', G.extrudeZ([[26, -13], [44, -13], [44, -20, 4], [38, -26, 4], [26, -26]], 16, { bevel: 1 }));
  // спусковая скоба (увеличенная, как у HK)
  const tg = G.shape([[-42, -38], [-44, -52, 4], [-54, -60, 6], [-110, -58, 8], [-122, -46, 4], [-122, -38]],
    [[[-50, -40], [-50, -50, 3], [-58, -54, 4], [-106, -52, 6], [-114, -44, 3], [-114, -40]]]);
  k.add('alu', G.extrudeZ(tg, 13, { bevel: 1.5 }));
  // ограждение кнопки магазина (справа) и затворная задержка (слева)
  k.add('alu', G.extrudeZ([[-50, -16], [-38, -16], [-38, -34, 3], [-50, -34, 3]], 3, { bevel: 0.8, z: 13 }));
  k.add('steel', G.cylZ(5.2, 12, 15.2, { c: 0.6, seg: 20 }), { p: [-44, -25, 0] });
  k.add('steel', G.extrudeZ([[-58, -14, 1], [-44, -14, 1], [-44, -20, 2], [-52, -30, 2], [-58, -28, 1]], 3.2, { bevel: 0.6, z: -13.2 }));
  // оси и штифты
  for (const [x, y, r] of [[36, -18, 4], [-138, -18, 4], [-80, -30, 2.4], [-100, -30, 2.4]]) k.add('steel', G.pin(r, 25.5), { p: [x, y, 0] });
  // башня буферной трубы и концевая пластина с QD-гнёздами
  k.add('alu', G.T(G.cylX(17, -158, -142, { c: 1.5, seg: 32 }), { p: [0, 1, 0] }));
  k.add('steel', G.T(G.cylX(19.5, -168, -159, { c: 1, seg: 12 }), { p: [0, 1, 0] }));
  k.add('steel', G.T(G.latheX([[-172, 0], [-172, 17], [-168, 19], [-168, 0]], { seg: 32 }), { p: [0, 1, 0] }));
  for (const s of [-1, 1]) {
    k.add('steel', G.cylZ(6, 0, 7, { c: 0.8, seg: 20 }), { p: [-166, 1, s > 0 ? 17 : -24] });
    k.add('lensBlack', G.cylZ(3.6, 0, 1, { seg: 16 }), { p: [-166, 1, s > 0 ? 23.6 : -24.6] });
  }
  // буферная труба (HK) с ребром фиксации приклада
  k.add('alu', G.T(G.cylX(14.6, -338, -160, { c: 1.2, seg: 32 }), { p: [0, 1, 0] }));
  k.add('alu', G.extrudeX(G.rrect(0, -14.5, 9, 6, 1.5), -330, -168, { bevel: 0.6 }), { p: [0, 1, 0] });
  for (let i = 0; i < 6; i++) k.add('lensBlack', G.cylY(2, -1, 1, { seg: 12 }), { p: [-228 - i * 16, -16.5, 0] });

  // спусковой крючок
  const tk = ctx.kit();
  tk.add('steel', G.extrudeZ([[-3, 4], [3, 4], [3, -6, 2], [0, -16, 4], [-6, -22, 2], [-7.5, -20], [-3, -9, 3]], 6, { bevel: 1 }));
  nodes.trigger = G.node('trigger', [tk.build()], { p: [-74, -34, 0] });
  // переводчик огня: флажки с обеих сторон, ось вращения — Z
  const sk = ctx.kit();
  const lever = [[0, -4.5, 2], [20, -3, 3], [21, 3, 3], [0, 4.5, 2]];
  sk.add('steel', G.extrudeZ(lever, 3, { bevel: 0.8, z: -13.8 }));
  sk.add('steel', G.extrudeZ([[0, -3.5, 2], [11, -2.5, 2], [11, 2.5, 2], [0, 3.5, 2]], 2.6, { bevel: 0.6, z: 13.6 }));
  sk.add('steel', G.cylZ(5.4, -15.2, 15, { c: 0.6, seg: 20 }));
  nodes.selector = G.node('selector', [sk.build()], { p: [-106, -26, 0] });
  return [nodes.trigger, nodes.selector];
}

function barrel(ctx, k) {
  const { G } = ctx;
  k.add('steel', G.latheX([[38, 0], [38, 12], [60, 12], [61, 10.4], [250, 10.4], [252, 9.6], [356, 9.6], [357, 6.4], [368, 6.3], [368, 2.8], [362, 2.8], [362, 0]], { seg: 32 }));
  // газовый блок HK с регулятором
  k.add('steel', G.extrudeX(G.rrect(0, 4, 26, 30, 6), 258, 286, { bevel: 1.2 }));
  k.add('steel', G.T(G.cylX(7, 240, 262, { seg: 20 }), { p: [0, 16, 0] }));
  k.add('steel', G.T(G.cylZ(3.2, -16, 16, { seg: 16 }), { p: [270, -6, 0] }));
}

function carrierGroup(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  // затворная рама с ударной площадкой поршня и отверстием экстрактора
  k.add('steelPark', G.latheX([[-190, 0], [-190, 11.2], [-186, 12], [-60, 12], [-58, 11], [-44, 11], [-42, 12], [-6, 12], [-5, 10], [-5, 0]], { seg: 32 }));
  k.add('steelPark', G.extrudeX(G.rrect(0, 12.5, 9, 6, 1.5), -150, -20, { bevel: 0.6 }));
  // боевая личинка
  k.add('steelWorn', G.latheX([[-6, 0], [-6, 8.2], [4, 8.2], [4.6, 7.4], [4.6, 0]], { seg: 20 }));
  for (let i = 0; i < 7; i++) k.add('steelWorn', G.T(G.box(4, 3, 3.6, { bevel: 0.4 }), { p: [2.8, 9, 0], r: [i * 51.4, 0, 0] }));
  k.add('steel', G.extrudeZ([[-18, 6], [2, 6], [2, 9.5], [-18, 9.5]], 3, { bevel: 0.5, z: 7.2 }));
  return G.node('carrier', [k.build()]);
}

function dustCover(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  // крышка окна: петля снизу (y = -9), в закрытом положении прилегает к борту
  k.add('steelPark', G.extrudeZ([[-60, 0, 1], [8, 0, 1], [8, 15, 1.5], [-60, 15, 1.5]], 1.4, { bevel: 0.4, z: 0.7 }));
  k.add('steelPark', G.extrudeZ([[-40, 6], [-6, 6], [-6, 9.5], [-40, 9.5]], 1.2, { bevel: 0.4, z: 1.8 }));
  k.add('steel', G.cylX(1.4, -61, 9, { seg: 10 }), { p: [0, 0, 0.9] });
  const g = G.node('dustCover', [k.build()], { p: [0, -9.5, 14.6] });
  return g;
}

function build(ctx) {
  const { G, THREE } = ctx;
  const k = ctx.kit();
  const nodes = {};
  const up = upperReceiver(ctx, k);
  const lowerNodes = lowerReceiver(ctx, k, nodes);
  barrel(ctx, k);
  const body = k.build('receiver');
  nodes.carrier = carrierGroup(ctx);
  nodes.dustCover = dustCover(ctx);
  const root = G.node('m416', [body, nodes.carrier, nodes.dustCover, ...lowerNodes]);

  root.add(ctx.railMount('upperRail', [up.railFirst, RAIL_TOP, 0], 'top', up.railSlots, { axis: 'top' }));
  root.add(ctx.mount({ id: 'hg', type: 'hg', p: [38, 0, 0] }));
  root.add(ctx.mount({ id: 'muzzle', type: 'thread', p: [368, 0, 0] }));
  root.add(ctx.mount({ id: 'magwell', type: 'magwell', p: [-6, -62, 0] }));
  root.add(ctx.mount({ id: 'grip', type: 'grip', p: [-121, -40, 0] }));
  root.add(ctx.mount({ id: 'stock', type: 'stock', p: [-338, 1, 0], slots: 6, pitch: -16, axis: 'stock' }));
  root.add(ctx.mount({ id: 'charger', type: 'charger', p: [-142, 18, 0] }));

  return {
    root, nodes,
    anim: { carrierTravel: 92, portCover: nodes.dustCover, selector: { safe: 0, semi: 90, auto: 180 } },
    eject: { p: [-26, 2, 16], dir: [0.25, 0.35, 1] },
    muzzle: [368, 0, 0],
    chamber: [0, 0, 0],
    eyeX: -238,
    cheekY: RAIL_TOP + 22,
    focus: { center: [20, -20, 0], size: 920 },
  };
}

export default {
  id: 'm416',
  title: 'HK416 A5',
  short: 'M416',
  caliber: '5,56×45 NATO',
  cal: '556',
  thread: '1/2x28',
  specs: [['Ствол', '368 мм (14,5")'], ['Автоматика', 'газовый поршень'], ['Темп', '850 выстр/мин'], ['Масса', '3,49 кг']],
  base: { weight: 2420, length: 800, ergo: 52, recoilV: 100, recoilH: 100, moa: 1.4, velocity: 880, range: 450, loud: 160, flash: 70, adsTime: 280, rpm: 850, mag: 30 },
  audio: { cal: '556', body: 0.55, crack: 1.0, mech: 0.8 },
  modes: ['safe', 'semi', 'auto'],
  build,
  slots: [
    { id: 'handguard', label: 'Цевьё', group: 'Цевьё и ствол', accepts: ['hg'], mount: 'hg', iface: 'hk416' },
    { id: 'muzzle', label: 'Дульное устройство', group: 'Цевьё и ствол', accepts: ['muzzle'], mount: 'muzzle' },
    { id: 'optic', label: 'Прицел', group: 'Оптика', accepts: ['optic'], rails: ['upperRail', 'hgTop'], prefer: { x: -70 } },
    { id: 'rearsight', label: 'Целик', group: 'Оптика', accepts: ['rearsight'], rails: ['upperRail'], prefer: 'rear' },
    { id: 'frontsight', label: 'Мушка', group: 'Оптика', accepts: ['frontsight'], rails: ['hgTop'], prefer: 'front' },
    { id: 'magnifier', label: 'Увеличитель', group: 'Оптика', accepts: ['magnifier'], rails: ['upperRail', 'hgTop'], prefer: { x: -120 } },
    { id: 'under', label: 'Под стволом', group: 'Тактика', accepts: ['foregrip', 'bipod'], rails: ['hgBottom'], prefer: { x: 190 } },
    { id: 'tacRight', label: 'Правая планка', group: 'Тактика', accepts: ['light', 'laser'], rails: ['hgRight'], prefer: 'front' },
    { id: 'tacLeft', label: 'Левая планка', group: 'Тактика', accepts: ['light', 'laser'], rails: ['hgLeft'], prefer: 'front' },
    { id: 'tacTop', label: 'Верх цевья', group: 'Тактика', accepts: ['laser'], rails: ['hgTop'], prefer: 'front' },
    { id: 'mag', label: 'Магазин', group: 'Ствольная коробка', accepts: ['mag'], mount: 'magwell', iface: 'stanag' },
    { id: 'pgrip', label: 'Пистолетная рукоять', group: 'Ствольная коробка', accepts: ['pgrip'], mount: 'grip', iface: 'ar' },
    { id: 'stock', label: 'Приклад', group: 'Ствольная коробка', accepts: ['stock'], mount: 'stock', rails: ['stock'], iface: 'ar', prefer: { x: -386 } },
    { id: 'charger', label: 'Рукоять заряжания', group: 'Ствольная коробка', accepts: ['charger'], mount: 'charger', iface: 'ar' },
  ],
  parts: M416_PARTS,
  defaults: {
    handguard: 'hk_quad', muzzle: 'hk_fh', optic: null, rearsight: 'hk_diopter', frontsight: 'hk_front',
    magnifier: null, under: null, tacRight: null, tacLeft: null, tacTop: null,
    mag: 'hk_steel30', pgrip: 'hk_v2', stock: 'hk_slim', charger: 'ch_std',
  },
};
