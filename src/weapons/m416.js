// HK416 A5 (в играх — M416). 5,56×45, ствол 14,5" (368 мм), газовый поршень.
// Размеры — по чертежам AR-15/HK416: ось канала Y = 0, зеркало затвора X = 0.
import { M416_PARTS, engrave, railMarks } from './m416_parts.js';

const RAIL_TOP = 30.5; // верх планки над осью канала — стандарт AR

function upperReceiver(ctx, k) {
  const { G } = ctx;
  // сечение HK: прямые борта, скос-полка к планке
  const sec = [[14.5, -13, 1], [14.5, 7, 1], [13.4, 10.2, 1], [11, 15, 2], [-11, 15, 2], [-13.4, 10.2, 1], [-14.5, 7, 1], [-14.5, -13, 1]];
  // сечение в зоне окна выброса: правый борт вскрыт до канала затворной рамы
  const rB = 12.4, yT = 5, yB = -8;
  const port = [[14.5, yT], [14.5, 7], [13.4, 10.2], [11, 15], [-11, 15], [-13.4, 10.2], [-14.5, 7], [-14.5, -13], [14.5, -13], [14.5, yB]];
  const a0 = Math.atan2(yB, Math.sqrt(rB * rB - yB * yB)), a1 = Math.atan2(yT, Math.sqrt(rB * rB - yT * yT)) - Math.PI * 2;
  for (let i = 0; i <= 28; i++) { const a = a0 + (a1 - a0) * (i / 28); port.push([Math.cos(a) * rB, Math.sin(a) * rB]); }
  // части внахлёст на 1,2 мм, чтобы фаски торцов не давали ложных швов на левом борту
  k.add('alu', G.extrudeX(sec, -142, -58.8, { bevel: 0.8 }));
  k.add('alu', G.extrudeX(port, -60, 8, { bevel: 0.25 }));
  k.add('alu', G.extrudeX(sec, 6.8, 38, { bevel: 0.8 }));
  // верхняя планка ствольной коробки с гравировкой номеров пазов
  const r = G.picatinny(178, { base: RAIL_TOP - 14.5 });
  k.add('alu', r.geo, { p: [-141, RAIL_TOP, 0] });
  k.add('steelWorn', railMarks(ctx, r, 1), { p: [-141, RAIL_TOP, 0] });
  // задний прилив под рукоять заряжания
  k.add('alu', G.extrudeX([[-9, -13, 1], [9, -13, 1], [9, -4, 2], [-9, -4, 2]], -150, -140, { bevel: 0.6 }));
  // отражатель гильз: клин за окном выброса со скошенной передней гранью
  k.add('alu', G.extrudeY([[-80, 14.2], [-60, 14.2], [-60.5, 17.6, 1.5], [-65, 21, 3], [-74, 20, 6]], -3.5, 12.5, { bevel: 1.6 }));
  // досылатель (forward assist): каплевидный прилив, сходящий на нет к отражателю
  const rings = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    rings.push({ x: -129 + 52 * t, pts: G.superEllipse(11.5 * Math.pow(1 - t, 1.25) + 0.8, 6.9 - 3.4 * t, 2.6, 28, 5 + t, 14.2) });
  }
  k.add('alu', G.loftX(rings, { flip: true, crease: 50 }));
  const fa = { r: [0, 12, 0], p: [-130, 5, 19.5] }; // ось под 12° к каналу, кнопка торчит назад-вправо
  k.add('alu', G.T(G.latheX([[0, 0], [0, 6.4], [0.8, 7.2], [14, 7.2], [18, 6], [18, 0]], { seg: 28 }), fa));
  const btn = [G.cylX(5.4, -8.6, 0.5, { c: 0.7, seg: 24 }), G.ringGrooves(5.5, -6.5, -1.5, 3, 0.35, { seg: 24 })];
  // рифлёный торец кнопки
  for (let i = -2; i <= 2; i++) { const y = i * 2.05, c = Math.sqrt(4.9 * 4.9 - y * y); btn.push(G.T(G.box(0.9, 1, c * 2, { bevel: 0.2 }), { p: [-8.8, y, 0] })); }
  for (const g of btn) k.add('steel', G.T(g, fa));
  // шляпка штифта досылателя
  k.add('steel', G.pin(2.2, 30), { p: [-122, -8, 0] });
  // ушки петли пылезащитной крышки
  for (const [a, b] of [[-64, -60.4], [8.4, 12]]) k.add('alu', G.cylX(2.4, a, b, { c: 0.4, seg: 16 }), { p: [0, -9.5, 15.5] });
  // поперечные винты фиксации цевья в передней части коробки
  for (const x of [22, 32]) k.pair('steel', G.screwHead(2.6, 1.2), { p: [x, -7.5, 14.4] });
  return { railFirst: -141 + r.first, railSlots: r.slots };
}

// Пиктограмма пули (HK): остриём вверх, в плоскости XY, толщина по Z.
function bullet(G, x, y, s = 1) {
  return G.T(G.extrudeZ([[-0.7, -1.8], [0.7, -1.8], [0.7, 0.5], [0, 1.8], [-0.7, 0.5]].map(([u, v]) => [u * s, v * s]), 0.16, { bevel: 0.04 }), { p: [x, y, 0] });
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
  // рифление передней стенки приёмника (A5)
  for (let i = 0; i < 12; i++) k.add('alu', G.box(1.4, 1.3, 24, { bevel: 0.4 }), { p: [31.1, -21 - i * 3, 0] });
  // маркировка на левой стенке приёмника
  k.add('steelWorn', engrave(ctx, 'HK416 A5', { h: 4.2, basis: 'left', p: [-6, -29, -15.47] }));
  k.add('steelWorn', engrave(ctx, '5,56MM X45', { h: 2.6, basis: 'left', p: [-6, -38, -15.47] }));
  k.add('steelWorn', engrave(ctx, 'HK 21-09734', { h: 2.2, basis: 'right', p: [-6, -44, 15.47] }));
  // передний прилив шарнирной оси — на всю ширину коробки
  k.add('alu', G.extrudeZ([[26, -13], [44, -13], [44, -20, 4], [38, -26, 4], [26, -26]], 22, { bevel: 1.2 }));
  // спусковая скоба A5: увеличенная, с «пузом» под перчатку
  const tg = G.shape([[-42, -38], [-44, -54, 4], [-53, -62, 6], [-110, -58, 8], [-122, -46, 4], [-122, -38]],
    [[[-50, -40], [-50, -51, 3], [-58, -56, 5], [-106, -52, 6], [-114, -44, 3], [-114, -40]]]);
  k.add('alu', G.extrudeZ(tg, 13, { bevel: 2 }));
  // ограждение кнопки магазина (справа) и кнопка с рифлением
  k.add('alu', G.extrudeZ([[-50, -16], [-38, -16], [-38, -34, 3], [-50, -34, 3]], 3, { bevel: 0.8, z: 13 }));
  k.add('steel', G.cylZ(5.2, 12, 15.2, { c: 0.6, seg: 24 }), { p: [-44, -25, 0] });
  for (const y of [-27, -25, -23]) k.add('steel', G.box(7, 0.8, 0.8, { bevel: 0.2 }), { p: [-44, y, 15.4] });
  // двусторонний рычаг затворной задержки A5 справа: лопатка перед скобой под указательный палец
  k.add('steel', G.extrudeZ([[-38, -33.5, 1], [-38, -36, 1], [-51, -37, 1.5], [-54.5, -43.5, 1.5], [-58.5, -43, 1.5], [-57, -34, 2]], 1.8, { bevel: 0.5, z: 12.9 }));
  for (const y of [-39.5, -41.5]) k.add('steel', G.box(4, 0.6, 0.6, { bevel: 0.15 }), { p: [-56.2, y, 14] });
  // затворная задержка слева: прилив, увеличенная лопатка с рифлением
  k.add('alu', G.extrudeZ([[-61, -14], [-43, -14], [-43, -22, 2], [-50, -25, 3], [-61, -21, 2]], 2.4, { bevel: 0.7, z: -12.6 }));
  k.add('steel', G.extrudeZ([[-60, -15, 1], [-46, -15, 1], [-44.5, -18, 1], [-47.5, -33, 2.5], [-57, -33.5, 2.5], [-59, -26, 1.5]], 2.2, { bevel: 0.6, z: -14.5 }));
  for (const y of [-26, -28.2, -30.4]) k.add('steel', G.box(9, 0.7, 0.7, { bevel: 0.2 }), { p: [-52.4, y, -15.7] });
  k.add('steel', G.cylZ(1.6, -15.9, -13, { seg: 12, c: 0.2 }), { p: [-53, -17.5, 0] });
  // двусторонняя защёлка магазина слева — рычаг под затворной задержкой
  k.add('steel', G.extrudeZ([[-52, -35], [-41, -35], [-40, -38, 1], [-51, -39.5, 1.5]], 1.8, { bevel: 0.5, z: -12.9 }));
  // оси с головками (справа — головка с проточкой, слева — торец заподлицо)
  const pinHead = G.latheX([[0, 0], [0, 4.6], [0.4, 5], [1.2, 5], [1.5, 4.3], [2, 4.3], [2.3, 3.7], [2.3, 0]], { seg: 24 });
  for (const [x, y] of [[36, -18], [-138, -18]]) {
    k.add('steel', G.cylZ(3.2, -12.25, 12.1, { c: 0.35, seg: 20 }), { p: [x, y, 0] });
    k.add('steel', G.T(pinHead.clone(), { r: [0, -90, 0], p: [x, y, 11.8] }));
  }
  // штифты спускового крючка и курка
  for (const [x, y] of [[-74, -34], [-86, -21]]) k.add('steel', G.cylZ(2.4, -12.2, 12.2, { c: 0.3, seg: 16 }), { p: [x, y, 0] });
  // маркировка переводчика (пиктограммы HK): предохранитель — белая пуля, одиночный — красная, авто — три красные
  const SX = -106, SY = -28;
  for (const side of [1, -1]) {
    const add = (mat, g) => k.add(mat, side > 0 ? G.T(g, { p: [0, 0, 12.02] }) : G.T(G.mirrorZ(g), { p: [0, 0, -12.02] }));
    add('paintWhite', bullet(G, SX + 12, SY));
    add('paintWhite', G.T(G.box(5.4, 0.45, 0.16, { bevel: 0 }), { r: [0, 0, 55], p: [SX + 12, SY, 0] }));
    add('paintRed', bullet(G, SX, SY + 10.6, 0.9));
    for (const dx of [-1.9, 0, 1.9]) add('paintRed', bullet(G, SX - 12.5 + dx, SY, 0.75));
  }
  // башня буферной трубы, гайка с прорезями и концевая пластина с QD-гнёздами
  k.add('alu', G.T(G.cylX(17, -158, -142, { c: 1.5, seg: 32 }), { p: [0, 1, 0] }));
  k.add('steel', G.T(G.cylX(17.4, -168, -159, { c: 0.8, seg: 32 }), { p: [0, 1, 0] }));
  k.add('steel', G.T(G.flutesX(17, -166.5, -160.5, 8, 5, 2.4), { p: [0, 1, 0] }));
  k.add('steel', G.T(G.latheX([[-172, 0], [-172, 17], [-168, 19], [-168, 0]], { seg: 32 }), { p: [0, 1, 0] }));
  for (const s of [-1, 1]) {
    k.add('steel', G.cylZ(6, 0, 7, { c: 0.8, seg: 20 }), { p: [-166, 1, s > 0 ? 17 : -24] });
    k.add('lensBlack', G.cylZ(3.6, 0, 1, { seg: 16 }), { p: [-166, 1, s > 0 ? 23.6 : -24.6] });
  }
  // буферная труба (HK) с ребром фиксации приклада
  k.add('alu', G.T(G.cylX(14.6, -338, -160, { c: 1.2, seg: 32 }), { p: [0, 1, 0] }));
  k.add('alu', G.extrudeX(G.rrect(0, -14.5, 9, 6, 1.5), -330, -168, { bevel: 0.6 }), { p: [0, 1, 0] });
  for (let i = 0; i < 6; i++) k.add('lensBlack', G.cylY(2, -1, 1, { seg: 12 }), { p: [-228 - i * 16, -16.5, 0] });

  // спусковой крючок: гладкий изогнутый, с фасками
  const tk = ctx.kit();
  tk.add('steel', G.extrudeZ([[-3, 4], [3, 4], [3, -6, 2], [0, -16, 4], [-6, -22, 2], [-7.5, -20], [-3, -9, 3]], 6, { bevel: 1 }));
  tk.add('steel', G.cylZ(2.9, -3.4, 3.4, { seg: 16, c: 0.3 }));
  nodes.trigger = G.node('trigger', [tk.build()], { p: [-74, -34, 0] });
  // переводчик огня: двусторонний, флажки с рифлёными концами, ось вращения — Z
  const sk = ctx.kit();
  sk.add('steel', G.extrudeZ([[0, -4.2, 2], [13.5, -3, 2.5], [15.5, 0, 1.2], [13.5, 3, 2.5], [0, 4.2, 2]], 2.6, { bevel: 0.8, z: -13.7 }));
  sk.add('steel', G.extrudeZ([[0, -3.5, 2], [9.5, -2.6, 2], [10.5, 0, 1], [9.5, 2.6, 2], [0, 3.5, 2]], 2.4, { bevel: 0.6, z: 13.6 }));
  for (const x of [9, 11, 13]) sk.add('steel', G.box(0.7, 5.2 - (x - 9) * 0.5, 0.6, { bevel: 0.2 }), { p: [x, 0, -15.1] });
  for (const x of [6.5, 8.3]) sk.add('steel', G.box(0.7, 4.4, 0.6, { bevel: 0.2 }), { p: [x, 0, 14.9] });
  sk.add('steel', G.cylZ(5.4, -15.2, 15, { c: 0.6, seg: 24 }));
  nodes.selector = G.node('selector', [sk.build()], { p: [SX, SY, 0] });
  return [nodes.trigger, nodes.selector];
}

function barrel(ctx, k) {
  const { G } = ctx;
  // ствол: цапфа ствольной гайки, ступенчатый профиль, заплечик резьбы
  k.add('steel', G.latheX([[38, 0], [38, 12], [60, 12], [61, 10.4], [250, 10.4], [252, 9.6], [354.5, 9.6], [355.5, 8.6], [357, 8.2], [357, 0]], { seg: 32 }));
  // резьба 1/2x28 и дульный срез с углублённой коронкой
  k.add('steel', G.ringGrooves(6.3, 357, 366.8, 11, 0.35, { seg: 24 }));
  k.add('steel', G.latheX([[366.6, 0], [366.6, 6.1], [368, 5.3], [368, 3.2], [367.2, 2.8], [362, 2.8], [362, 0]], { seg: 24 }));
  // газовый блок HK: хомут на стволе, трубка поршня, штифты, регулятор слева
  k.add('steel', G.extrudeX([[-13, -10.5, 5], [13, -10.5, 5], [13, 10, 3], [8, 19, 4], [-8, 19, 4], [-13, 10, 3]], 258, 286, { bevel: 1.2 }));
  k.add('steel', G.T(G.cylX(7, 238, 262, { seg: 20 }), { p: [0, 14, 0] }));
  for (const x of [264, 280]) k.add('steel', G.pin(2, 27.2), { p: [x, -5, 0] });
  k.add('steel', G.T(ctx.C.knob(5.5, 4, 16), { r: [0, 90, 0], p: [272, 12, -12.6] }));
}

function carrierGroup(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  // затворная рама с ударной площадкой поршня и отверстием экстрактора
  k.add('steelPark', G.latheX([[-190, 0], [-190, 11.2], [-186, 12], [-60, 12], [-58, 11], [-44, 11], [-42, 12], [-6, 12], [-5, 10], [-5, 0]], { seg: 32 }));
  k.add('steelPark', G.extrudeX(G.rrect(0, 12.5, 9, 6, 1.5), -150, -20, { bevel: 0.6 }));
  // газоотводные окна справа — видны в окне выброса
  for (const x of [-35, -26]) k.add('lensBlack', G.T(G.cylZ(1.5, 0, 1, { seg: 14 }), { s: [1.9, 1, 1], p: [x, 3.5, 11.3] }));
  // головка оси боевой личинки (сверху)
  k.add('steelWorn', G.box(7, 3, 6, { bevel: 0.6 }), { p: [-32, 12.4, 0] });
  // боевая личинка
  k.add('steelWorn', G.latheX([[-6, 0], [-6, 8.2], [4, 8.2], [4.6, 7.4], [4.6, 0]], { seg: 20 }));
  for (let i = 0; i < 7; i++) k.add('steelWorn', G.T(G.box(4, 3, 3.6, { bevel: 0.4 }), { p: [2.8, 9, 0], r: [i * 51.4, 0, 0] }));
  // выбрасыватель с осью
  k.add('steel', G.extrudeZ([[-18, 6], [2, 6], [3, 8.2, 0.6], [2, 9.5], [-18, 9.5]], 3, { bevel: 0.5, z: 7.2 }));
  k.add('steel', G.cylZ(0.9, 6.5, 9.6, { seg: 10 }), { p: [-12, 7.8, 0] });
  return G.node('carrier', [k.build()]);
}

function dustCover(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  // крышка окна: начало узла — на оси петли (y = -9.5), в закрытом положении прилегает к борту
  k.add('steelPark', G.extrudeZ([[-60, 1.2, 1], [8, 1.2, 1], [8, 15, 1.5], [-60, 15, 1.5]], 1.4, { bevel: 0.4, z: -0.2 }));
  // выштамповка жёсткости
  k.add('steelPark', G.extrudeZ([[-54, 4.6, 3], [-3.5, 4.6, 3], [-3.5, 11.6, 3], [-54, 11.6, 3]], 1.2, { bevel: 0.45, z: 0.6 }));
  // завальцованные кулачки петли, ось и пружинное кольцо
  for (const [a, b] of [[-59.8, -33], [-23, 7.8]]) k.add('steelPark', G.tubeX(2.1, 1.45, a, b, { seg: 16, c: 0.4 }));
  k.add('steel', G.cylX(1.4, -64.5, 12.6, { seg: 12, c: 0.3 }));
  k.add('steel', G.tubeX(2, 1.3, 12.6, 13.4, { seg: 14, c: 0.2 }));
  // защёлка крышки — грибок в заднем верхнем углу
  k.add('steel', G.T(G.latheX([[0, 0], [0, 2.2], [0.5, 2.2], [0.9, 1.4], [0.9, 0]], { seg: 16 }), { r: [0, -90, 0], p: [-57, 12.4, 0.45] }));
  return G.node('dustCover', [k.build()], { p: [0, -9.5, 15.5] });
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
    { id: 'rearsight', label: 'Целик', group: 'Оптика', accepts: ['rearsight'], rails: ['upperRail'], prefer: 'rear' },
    { id: 'frontsight', label: 'Мушка', group: 'Оптика', accepts: ['frontsight'], rails: ['hgTop'], prefer: 'front' },
    { id: 'optic', label: 'Прицел', group: 'Оптика', accepts: ['optic'], rails: ['upperRail', 'hgTop'], prefer: { x: -40 } },
    { id: 'magnifier', label: 'Увеличитель', group: 'Оптика', accepts: ['magnifier'], rails: ['upperRail', 'hgTop'], prefer: { x: -90 }, behind: 'optic' },
    { id: 'offset', label: 'Боковой коллиматор', group: 'Оптика', accepts: ['offset'], rails: ['upperRail', 'hgTop'], prefer: { x: 20 } },
    { id: 'under', label: 'Под стволом', group: 'Тактика', accepts: ['foregrip', 'bipod'], rails: ['hgBottom'], prefer: { x: 190 } },
    { id: 'tacRight', label: 'Правая планка', group: 'Тактика', accepts: ['light', 'laser', 'combo'], rails: ['hgRight'], prefer: 'front' },
    { id: 'tacLeft', label: 'Левая планка', group: 'Тактика', accepts: ['light', 'laser', 'combo'], rails: ['hgLeft'], prefer: 'front' },
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
