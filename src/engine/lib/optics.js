// Оптика на Пикатинни. Начало каждого модуля — верх планки над центром
// поперечного болта (паз), +X — к дулу. Высота оптической оси — реальная.
import * as G from '../geo.js';
import { clampBody, crossBolt, qdLever, flipCap, hollowLathe } from './common.js';

export function lens(ctx, geo, mat = 'glass') {
  const m = new ctx.THREE.Mesh(geo, ctx.mats.get(mat).clone());
  m.renderOrder = 10;
  m.userData.lens = true;
  return m;
}

/* ------------------------------------------------------------ Aimpoint T-2 */

function t2(ctx, A) {
  const k = ctx.kit();
  const at = (g, t = {}) => G.T(g, { ...t, p: [(t.p?.[0] || 0), A + (t.p?.[1] || 0), t.p?.[2] || 0] });
  // крепление: низкое (ось 20 мм) либо LRP 39 мм c рычагом
  k.add('alu', clampBody(-18, 18, 5.5));
  if (A > 30) {
    const tower = G.shape([[-17, 5], [17, 5], [17, A - 12, 3], [-17, A - 12, 3]], [G.slot(-9, 9, (A - 7) / 2 + 3, 9)]);
    k.add('alu', G.extrudeZ(tower, 18, { bevel: 1.2 }));
    k.add('steel', qdLever(-14, 12, -1));
    k.add('steel', crossBolt(0, -2.5, 13, { nutR: 0 }).slice(0, 1));
  } else {
    k.add('steel', crossBolt(0));
  }
  // корпус прицела (полый — изнутри виден тёмный канал)
  k.add('alu', at(hollowLathe([[-34, 14], [-33, 15.2], [18, 15.2], [20.5, 16.6], [33, 16.6], [34, 15.6]], 12.2, { seg: 40 })));
  k.add('lensBlack', at(G.tubeX(12.3, 11.6, -32, 32, { seg: 32 })));
  // основание корпуса
  k.add('alu', G.extrudeX([[-11, A - 16, 2], [11, A - 16, 2], [11, A - 8], [-11, A - 8]], -17, 17, { bevel: 1 }));
  // маховики: высота — сверху, горизонталь — справа, яркость/батарея — справа сзади
  k.add('alu', at(ctx.C.knob(7.4, 7.5, 22), { r: [0, 0, 90], p: [6, 14.6, 0] }));
  k.add('alu', at(ctx.C.knob(7.4, 7.5, 22), { r: [0, -90, 0], p: [6, 0, 14.6] }));
  k.add('alu', at(ctx.C.knob(10, 6.2, 28), { r: [0, -90, 0], p: [-15, -1, 14.2] }));
  k.add('steel', at(G.cylZ(3.2, 20, 21.4, { seg: 16 }), { p: [-15, -1, 0] }));
  // откинутые крышки линз (шарнир сверху)
  const capR = G.T(flipCap(12.5).translate(0, -15.5, 0), { r: [0, 0, -100], p: [-35, 15.5, 0] });
  const capF = G.T(flipCap(13.5).translate(0, -16.5, 0), { r: [0, 0, 100], p: [34, 16.5, 0] });
  k.add('rubber', at(capR));
  k.add('rubber', at(capF));
  k.add('rubber', at(G.tubeX(16.8, 15.1, -30, -24, { seg: 32 })));
  k.add('rubber', at(G.tubeX(17.8, 16.5, 25, 31, { seg: 32 })));
  const root = G.node('t2', [k.build()]);
  const rear = lens(ctx, at(ctx.C.lensDisc(12.4, -31)), 'glassBlue');
  const front = lens(ctx, at(ctx.C.lensDisc(12.6, 31)), 'glassRed');
  root.add(rear, front);
  return { root, sight: { y: A, z: 0, x0: -34, x1: 34, r: 12, mag: 1, reticle: 'dot', lens: front } };
}

/* ------------------------------------------------------------ EOTech EXPS3 */

function exps3(ctx) {
  const k = ctx.kit();
  const A = 39;
  k.add('alu', clampBody(-22, 22, 6));
  k.add('steel', qdLever(-16, 12, -1.5));
  // основание и отсек электроники
  k.add('alu', G.extrudeX([[-17, 5, 1], [17, 5, 1], [17, 15, 3], [-17, 15, 3]], -48, 46, { bevel: 1.2 }));
  k.add('alu', G.extrudeX([[-17, 12], [17, 12], [17, 28, 6], [-17, 28, 6]], -48, -24, { bevel: 2 }));
  // кнопки слева (вверх/вниз/NV) и регулировки справа
  for (const [x, y] of [[-42, 22], [-34, 22], [-38, 16]]) k.add('rubber', G.cylZ(3.1, -19.4, -16.5, { c: 0.8, seg: 16 }), { p: [x, y, 0] });
  for (const [x, y] of [[-40, 21], [-30, 21]]) k.add('steel', G.cylZ(3.3, 16.5, 18.5, { c: 0.6, seg: 16 }), { p: [x, y, 0] });
  // кожух-«тоннель» окна
  const arch = (w, cy, h0) => {
    const pts = [[-w, h0], [w, h0]];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; pts.push([Math.cos(a) * w, cy + Math.sin(a) * w]); }
    return pts;
  };
  const hood = G.shape(arch(22, 42, 12), [arch(16.2, 42, 23).map((p) => [p[0], p[1]])]);
  k.add('alu', G.extrudeX(hood, -22, 44, { bevel: 1.2 }));
  k.add('alu', G.extrudeX(G.shape([[-22, 12], [22, 12], [22, 23], [-22, 23]]), -22, 44, { bevel: 0.8 }));
  // батарейный отсек (поперечный) спереди справа
  k.add('alu', G.T(G.cylZ(9.5, -17, 17, { c: 1, seg: 28 }), { p: [34, 16, 0] }));
  k.add('alu', G.T(ctx.C.knob(9.8, 6, 24), { r: [0, -90, 0], p: [34, 16, 17] }));
  const root = G.node('exps3', [k.build()]);
  const rp = G.rrect(0, A - 1, 30, 28, 8);
  const rear = lens(ctx, G.extrudeX(rp, -14, -12.8, { bevel: 0.2 }), 'glassBlue');
  const front = lens(ctx, G.extrudeX(rp, 36, 37.2, { bevel: 0.2 }), 'glassAmber');
  root.add(rear, front);
  return { root, sight: { y: A, z: 0, x0: -14, x1: 37, r: 14, mag: 1, reticle: 'holo', lens: front } };
}

/* ----------------------------------------------------- Trijicon ACOG TA31 */

function acog(ctx) {
  const k = ctx.kit();
  const A = 38;
  const at = (g, t = {}) => G.T(g, { ...t, p: [(t.p?.[0] || 0), A + (t.p?.[1] || 0), t.p?.[2] || 0] });
  // кронштейн TA51: плоское основание и два барашка слева
  k.add('alu', clampBody(-32, 32, 7));
  for (const x of [-18, 18]) {
    k.add('alu', G.T(ctx.C.knob(8, 8, 20), { r: [0, 90, 0], p: [x, -2, -13] }));
    k.add('steel', G.cylZ(3, -13, 16, { seg: 12 }), { p: [x, -2, 0] });
  }
  k.add('alu', G.extrudeX([[-12, 6], [12, 6], [12, A - 14, 3], [-12, A - 14, 3]], -34, 34, { bevel: 1.2 }));
  // корпус: объектив 32 мм, сужение, окуляр
  k.add('alu', at(hollowLathe([[-74, 15], [-73, 19.5], [-68, 20.5], [-50, 20.5], [-45, 18.6], [30, 18.6], [44, 21.5], [62, 24.2], [74, 24.2], [75.5, 23]], 16.5, { seg: 40 })));
  k.add('lensBlack', at(G.tubeX(16.6, 15.5, -72, 73, { seg: 32 })));
  // верхний гребень со световодом
  k.add('alu', G.extrudeX([[-8, A + 12, 2], [8, A + 12, 2], [8, A + 23.5, 3], [-8, A + 23.5, 3]], -44, 40, { bevel: 1.5 }));
  k.add('emGreen', G.extrudeX([[-2.2, A + 22.5], [2.2, A + 22.5], [2.2, A + 24.2, 1], [-2.2, A + 24.2, 1]], -40, 36, { bevel: 0.3 }));
  // маховики под колпачками
  k.add('alu', at(G.cylY(9.5, 17, 27, { c: 1.4, seg: 28 }), { p: [8, 0, 0] }));
  k.add('alu', at(G.cylZ(9.5, 17, 27, { c: 1.4, seg: 28 }), { p: [8, 0, 0] }));
  // RMR сверху (как в TA31RMR)
  const r = ctx.kit();
  k.add('alu', G.extrudeX([[-12, A + 23], [12, A + 23], [12, A + 30, 3], [-12, A + 30, 3]], -24, 16, { bevel: 1 }));
  k.add('alu', G.extrudeX(G.shape([[-13, A + 29], [13, A + 29], [13, A + 42, 6], [8, A + 46, 4], [-8, A + 46, 4], [-13, A + 42, 6]], [G.rrect(0, A + 38, 20, 12, 4)]), -20, 8, { bevel: 1 }));
  const root = G.node('acog', [k.build()]);
  const oc = lens(ctx, at(ctx.C.lensDisc(15.8, -72)), 'glassBlue');
  const ob = lens(ctx, at(ctx.C.lensDisc(17, 73)), 'glassAmber');
  const rmr = lens(ctx, G.extrudeX(G.rrect(0, A + 38, 20, 12, 4), 4, 5, { bevel: 0.2 }), 'glassBlue');
  root.add(oc, ob, rmr);
  return { root, sight: { y: A, z: 0, x0: -74, x1: 75, r: 15, mag: 4, reticle: 'chevron', eyeRelief: 38, lens: oc } };
}

/* ------------------------------------------------ Прицел 1–6×24 (LPVO) */

function lpvo(ctx) {
  const k = ctx.kit();
  const A = 40;
  const at = (g, t = {}) => G.T(g, { ...t, p: [(t.p?.[0] || 0), A + (t.p?.[1] || 0), t.p?.[2] || 0] });
  k.add('alu', at(hollowLathe([
    [-132, 18], [-131, 21.6], [-126, 22.2], [-98, 22.2], [-92, 20], [-74, 18.2], [-72, 19.4], [-54, 19.4], [-52, 15.2],
    [-30, 15.2], [-28, 18], [14, 18], [16, 15.2], [30, 15.2], [46, 18.6], [100, 18.6], [104, 17.8]], 14.5, { seg: 44 })));
  k.add('rubber', at(G.tubeX(22.8, 21.5, -128, -110, { seg: 40 })));
  k.add('lensBlack', at(G.tubeX(14.6, 13.6, -130, 102, { seg: 32 })));
  // кольцо кратности с рычагом
  k.add('rubber', at(G.flutesX(19.2, -71, -56, 24, 1.6, 0.9)));
  k.add('alu', at(G.extrudeZ([[-70, 17], [-60, 17], [-61, 29, 3], [-68, 29, 3]], 5, { bevel: 1 }), { r: [-25, 0, 0] }));
  // башня: вертикаль, горизонталь, подсветка слева
  k.add('alu', at(G.cylY(12, 17, 30, { c: 1.2, seg: 32 }), { p: [-8, 0, 0] }));
  k.add('alu', at(G.flutesX(11.4, 0, 9, 30, 1.2, 0.9), { r: [0, 0, 90], p: [-8, 21, 0] }));
  k.add('alu', at(G.cylZ(12, 17, 30, { c: 1.2, seg: 32 }), { p: [-8, 0, 0] }));
  k.add('alu', at(G.flutesX(11.4, 0, 9, 30, 1.2, 0.9), { r: [0, -90, 0], p: [-8, 0, 21] }));
  k.add('alu', at(G.cylZ(10.5, -27, -17, { c: 1.2, seg: 28 }), { p: [-8, 0, 0] }));
  k.add('alu', at(G.flutesX(10, 0, 6, 24, 1, 0.8), { r: [0, 90, 0], p: [-8, 0, -20] }));
  // консольный моноблок-кронштейн (под 30 мм трубу)
  k.add('alu', clampBody(-38, 34, 7));
  k.add('steel', crossBolt(-20));
  k.add('steel', crossBolt(18));
  k.add('alu', G.extrudeX([[-12, 6, 1], [12, 6, 1], [12, A - 16], [-12, A - 16]], -40, 36, { bevel: 1.5 }));
  for (const x of [-44, 20]) {
    k.add('alu', at(G.tubeX(20.5, 15.3, x, x + 16, { seg: 40, c: 1.2 })));
    k.add('alu', G.extrudeX([[-13, A - 18], [13, A - 18], [13, A - 8], [-13, A - 8]], x, x + 16, { bevel: 1 }));
    for (const s of [-1, 1]) for (const d of [4, 12]) k.add('steel', G.T(G.screwHead(2.2, 1.4), { r: [-90 + 0, 0, 0] }), { p: [x + d, A + 20.5, s * 9] });
  }
  const root = G.node('lpvo', [k.build()]);
  const oc = lens(ctx, at(ctx.C.lensDisc(20, -129)), 'glassBlue');
  const ob = lens(ctx, at(ctx.C.lensDisc(16.6, 101)), 'glassAmber');
  root.add(oc, ob);
  return { root, sight: { y: A, z: 0, x0: -132, x1: 104, r: 15, mag: 1, zoom: [1, 6], reticle: 'lpvo', eyeRelief: 95, lens: oc } };
}

/* -------------------------------------- Aimpoint 3XMag-1 на откидном FTS */

function magnifier(ctx) {
  const k = ctx.kit(), f = ctx.kit();
  const A = 39;
  k.add('alu', clampBody(-16, 16, 6));
  k.add('steel', crossBolt(0));
  // стойка с шарниром слева
  k.add('alu', G.extrudeZ([[-14, 5], [14, 5], [14, 16, 3], [-14, 16, 3]], 24, { bevel: 1.2 }));
  k.add('alu', G.extrudeX([[-18, 10, 2], [-8, 10, 2], [-8, 22, 3], [-18, 22, 3]], -14, 14, { bevel: 1 }));
  k.add('steel', G.cylX(3.6, -16, 16, { seg: 16 }), { p: [0, 17, -17] });
  k.add('steel', G.T(ctx.C.knob(6, 5, 16), { r: [0, 90, 0], p: [0, 10, 12] }));
  // откидная часть: рычаг и сам увеличитель
  f.add('alu', G.extrudeX(G.shape([[-17, 12, 2], [-10, 12, 2], [4, A - 20, 4], [12, A - 12, 3], [-6, A - 10, 3], [-19, 22, 2]]), -12, 12, { bevel: 1.2 }));
  f.add('alu', hollowLathe([[-56, 15], [-55, 17.5], [-40, 17.5], [-36, 16.4], [48, 16.4], [54, 15.2]], 12.5, { seg: 40 }).translate(0, A, 0));
  f.add('rubber', G.tubeX(19.5, 16.5, -56, -40, { seg: 40 }).translate(0, A, 0));
  f.add('alu', G.T(G.flutesX(16.2, 0, 12, 20, 1.4, 0.8), { p: [20, A, 0] }));
  f.add('alu', G.extrudeX([[-6, A - 17], [6, A - 17], [6, A - 12], [-6, A - 12]], -12, 12, { bevel: 0.8 }));
  const lensM = lens(ctx, ctx.C.lensDisc(12.6, -53).translate(0, A, 0), 'glassBlue');
  const lensF = lens(ctx, ctx.C.lensDisc(12.6, 51).translate(0, A, 0), 'glassAmber');
  const body = G.node('magBody', [f.build(), lensM, lensF]);
  const flip = G.node('flip', [body]);
  flip.position.set(0, 17, -17);
  body.position.set(0, -17, 17);
  return { root: G.node('mag3x', [k.build(), flip]), sight: { y: A, z: 0, x0: -56, x1: 54, r: 12, mag: 3, eyeRelief: 70, magnifier: true, suffix: ' + 3×', lens: lensM }, flipAside: { node: flip, angle: -88 } };
}

/* ------------------------------------------------- Magpul MBUS (складные) */

/* -------------------------------------- Trijicon RMR Type 2 на 45° кронштейне */

// Корпус RMR: начало — центр нижней плоскости, ось прицеливания на высоте 15 мм.
function rmrBody(ctx, k) {
  const A = 15;
  k.add('alu', G.extrudeX(G.rrect(0, 4.5, 25, 9, 2.2), -22, 23, { bevel: 1.2 }));
  // задний отсек (светодиод, электроника) — ниже оси, чтобы не заслонять окно
  k.add('alu', G.extrudeZ([[-22, 8], [-6, 8], [-6, 10.5, 1.5], [-10, 11.5, 2], [-22, 11, 2]], 23, { bevel: 1.2 }));
  // «рога» — защитный козырёк окна
  const arch = (w, h, y0) => {
    const pts = [[w, y0]];
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; pts.push([Math.cos(a) * w, h - w * 0.55 + Math.sin(a) * w * 0.55]); }
    pts.push([-w, y0]);
    return pts;
  };
  const hood = G.shape(arch(12.7, 25.4, 7), [arch(9.6, 22.4, 8.6)]);
  k.add('alu', G.extrudeX(hood, -3, 15, { bevel: 1 }));
  // кнопки яркости на бортах и винты выверки
  for (const s of [-1, 1]) k.add('rubber', G.T(G.cylZ(3.2, 0, 1.6, { c: 0.6, seg: 16 }), { p: [-15, 10, s * 12.4], r: s < 0 ? [0, 180, 0] : [0, 0, 0] }));
  k.add('steel', G.T(G.cylY(2.6, 10.5, 12, { seg: 14 }), { p: [-16, 0, 0] }));
  k.add('steel', G.T(G.cylZ(2.6, 12.5, 13.8, { seg: 14 }), { p: [-2, 12, 0] }));
  return A;
}

function rmrOffset(ctx) {
  const k = ctx.kit(), m = ctx.kit();
  // башмак на планке и рычаг, уходящий вправо-вверх
  k.add('alu', clampBody(-12, 12, 5, { w: 24 }));
  k.add('steel', crossBolt(0));
  k.add('alu', G.extrudeX([[-12, 3, 1], [12, 3, 1], [30, 14, 3], [26, 21, 3], [6, 12, 3], [-12, 8, 2]], -12, 12, { bevel: 1.2 }));
  // наклонная площадка 45° с RMR (правый борт: +Z)
  m.add('alu', G.extrudeX(G.rrect(0, -1.5, 27, 5, 1.5), -23, 24, { bevel: 0.8 }));
  const A = rmrBody(ctx, m);
  const glass = lens(ctx, G.extrudeX(G.shape(G.rrect(0, A + 0.5, 18.6, 13.4, 5)), 6, 7, { bevel: 0.2 }), 'glassAmber');
  const cant = G.node('rmrCant', [m.build(), glass]);
  cant.position.set(0, 16.5, 22);
  cant.rotation.x = Math.PI / 4;
  return {
    root: G.node('rmr_offset', [k.build(), cant]),
    // прицельная ось задана в системе наклонной площадки: при прицеливании оружие заваливается на 45°
    sight: { node: cant, y: A, z: 0, x0: -22, x1: 15, r: 9, mag: 1, reticle: 'dot', lens: glass },
  };
}

/* ------------------------------------ AN/PVS-14 на откидном кронштейне */

function pvs14(ctx) {
  const k = ctx.kit(), f = ctx.kit();
  const A = 39;
  k.add('alu', clampBody(-16, 16, 6));
  k.add('steel', crossBolt(0));
  k.add('alu', G.extrudeX([[-18, 5, 2], [-6, 5, 2], [-6, 14, 3], [-18, 14, 3]], -15, 15, { bevel: 1 }));
  k.add('steel', G.cylX(3.6, -17, 17, { seg: 16 }), { p: [0, 11, -15] });
  // откидная часть: башмак-«ласточкин хвост» и монокуляр
  f.add('alu', G.extrudeX(G.shape([[-17, 8, 2], [-9, 7, 2], [0, 12, 2], [10, 12, 2], [10, 16, 2], [-17, 16, 2]]), -14, 14, { bevel: 1 }));
  f.add('poly', G.T(G.extrudeX(G.shape(G.rrect(0, 0, 36, 12, 3)), -26, 16, { bevel: 1.5 }), { p: [0, 20, 0] }));
  const at = (g) => g.translate(0, A, 0);
  // корпус, окуляр с наглазником, объектив с кольцом фокусировки; полые — изображение ЭОП
  // имитируется фильтром экрана, а взгляд проходит насквозь
  f.add('poly', at(hollowLathe([[-34, 17], [-30, 20], [22, 20], [26, 17.5]], 13, { seg: 40 })));
  f.add('poly', at(hollowLathe([[-62, 16.5], [-34, 16.5]], 13, { seg: 36 })));
  f.add('rubber', at(G.flutesX(16.5, -58, -40, 24, 1.6, 0.9)));
  f.add('rubber', at(hollowLathe([[-86, 20.5], [-80, 21.5], [-64, 18.5], [-62, 17]], 15, { seg: 40 })));
  f.add('poly', at(hollowLathe([[26, 19.5], [58, 19.5], [60, 18]], 15, { seg: 40 })));
  f.add('rubber', at(G.flutesX(19.5, 30, 54, 28, 1.8, 1)));
  f.add('lensBlack', at(G.tubeX(15, 13.6, 52, 60.2, { seg: 32 })));
  // батарейный отсек (AA) слева и ручка включения/усиления
  f.add('poly', G.T(G.cylZ(10, -36, -18, { c: 1, seg: 28 }), { p: [0, A + 4, 0] }));
  f.add('poly', G.T(ctx.C.knob(10.6, 5, 24), { r: [0, 90, 0], p: [0, A + 4, -36] }));
  f.add('poly', G.T(ctx.C.knob(8, 7, 12), { r: [0, 90, 0], p: [-22, A, -19] }));
  const lensO = lens(ctx, ctx.C.lensDisc(13.8, 56).translate(0, A, 0), 'glassBlue');
  const lensE = lens(ctx, ctx.C.lensDisc(14, -64).translate(0, A, 0), 'glassRed');
  const body = G.node('pvsBody', [f.build(), lensO, lensE]);
  const flip = G.node('flip', [body]);
  flip.position.set(0, 11, -15);
  body.position.set(0, -11, 15);
  return { root: G.node('pvs14', [k.build(), flip]), sight: { y: A, z: 0, x0: -86, x1: 60, r: 14, mag: 1, eyeRelief: 22, magnifier: true, nv: true, suffix: ' + PVS-14', lens: lensE }, flipAside: { node: flip, angle: -95 } };
}

function mbusRear(ctx) {
  const k = ctx.kit(), f = ctx.kit();
  k.add('poly', clampBody(-13, 13, 6, { w: 25 }));
  k.add('steel', crossBolt(0));
  k.add('poly', G.extrudeZ([[-13, 5], [13, 5], [13, 11, 3], [-13, 11, 3]], 30, { bevel: 1.5 }));
  // створка с двумя диоптрами (большой и малый)
  const leaf = G.shape([[-4, 0, 1], [4, 0, 1], [4, 44, 3], [-4, 44, 3]].map(([x, y, r]) => [x, y, r]));
  f.add('poly', G.extrudeZ(G.shape([[-3.5, 0, 1], [3.5, 0, 1], [3.5, 42, 2], [-3.5, 42, 2]]), 26, { bevel: 1.2 }).translate(0, 0, 0));
  f.add('poly', G.T(G.tubeX(8, 2.6, -2.5, 2.5, { seg: 28 }), { p: [0, 29.5, 0] }));
  f.add('lensBlack', G.T(G.cylX(2.4, -4, 4, { seg: 16 }), { p: [0, 29.5, 0] }));
  f.add('poly', G.T(G.cylZ(5, 12, 17, { c: 0.8, seg: 20 }), { p: [0, 22, 0] }));
  const flip = G.node('flip', [f.build()]);
  flip.position.set(4, 10, 0);
  flip.children[0].position.set(-4, -4, 0);
  return { root: G.node('mbus_rear', [k.build(), flip]), irons: { rear: [0, 35.5, 0], type: 'aperture' }, flip: { node: flip, angle: -90 } };
}

function mbusFront(ctx) {
  const k = ctx.kit(), f = ctx.kit();
  k.add('poly', clampBody(-13, 13, 6, { w: 25 }));
  k.add('steel', crossBolt(0));
  k.add('poly', G.extrudeZ([[-13, 5], [13, 5], [13, 11, 3], [-13, 11, 3]], 30, { bevel: 1.5 }));
  const ear = [[-6, 0, 1], [6, 0, 1], [5, 32, 2], [1, 42, 2], [-2, 42, 2], [-6, 30, 2]];
  f.add('poly', G.extrudeZ(G.shape(ear), 3.4, { bevel: 0.8, z: 8 }));
  f.add('poly', G.extrudeZ(G.shape(ear), 3.4, { bevel: 0.8, z: -8 }));
  f.add('poly', G.extrudeZ([[-6, 0, 1], [6, 0, 1], [6, 14, 2], [-6, 14, 2]], 19, { bevel: 1 }));
  f.add('steel', G.cylY(2, 12, 29.5, { seg: 12 }));
  f.add('steel', G.extrudeZ([[-1.1, 28], [1.1, 28], [0.8, 35.5, 0.3], [-0.8, 35.5, 0.3]], 1.8, { bevel: 0.2 }));
  const flip = G.node('flip', [f.build()]);
  flip.position.set(-6, 10, 0);
  flip.children[0].position.set(6, -4, 0);
  return { root: G.node('mbus_front', [k.build(), flip]), irons: { front: [0, 35.5, 0] }, flip: { node: flip, angle: 90 } };
}

const mag1x39 = (cfg, asm) => {
  const it = asm.installed.get('optic');
  const s = it?.info?.sight;
  return !!s && s.mag === 1 && !s.zoom && Math.abs(s.y - 39) < 1.5;
};

export const OPTICS = [
  { id: 't2_low', cat: 'optic', name: 'Aimpoint Micro T-2', desc: 'Коллиматор, низкое крепление (ось 20 мм). Для высоких планок АК', foot: [-18, 18], body: [-38, 38], stats: { weight: 135, ergo: -1, adsTime: 8 }, build: (c) => t2(c, 20) },
  { id: 't2_lrp', cat: 'optic', name: 'Aimpoint T-2 + LRP 39 мм', desc: 'Коллиматор на кронштейне, нижняя треть с механикой AR', foot: [-18, 18], body: [-38, 38], stats: { weight: 190, ergo: -1, adsTime: 10 }, build: (c) => t2(c, 39) },
  { id: 'exps3', cat: 'optic', name: 'EOTech EXPS3', desc: 'Голографический, кольцо 68 MOA с точкой', foot: [-22, 22], body: [-48, 46], stats: { weight: 320, ergo: -3, adsTime: 14 }, build: exps3 },
  { id: 'acog', cat: 'optic', name: 'Trijicon ACOG TA31 4×32', desc: 'Призменный 4×, шеврон с дальномерной шкалой', foot: [-32, 32], body: [-75, 76], stats: { weight: 480, ergo: -6, adsTime: 40 }, build: acog },
  { id: 'lpvo', cat: 'optic', name: 'Прицел 1–6×24', desc: 'Переменная кратность, колёсико — зум в прицеле', foot: [-38, 34], body: [-132, 106], stats: { weight: 720, ergo: -9, adsTime: 55 }, build: lpvo },
  { id: 'mag3x', cat: 'magnifier', name: 'Aimpoint 3XMag-1 + FTS', desc: 'Увеличитель 3×, откидывается вбок', foot: [-16, 16], body: [-57, 55], needs: mag1x39, stats: { weight: 330, ergo: -4, adsTime: 20 }, build: magnifier },
  { id: 'pvs14', cat: 'magnifier', name: 'Монокуляр AN/PVS-14', desc: 'ПНВ за коллиматором на откидном кронштейне (N — откинуть)', foot: [-16, 16], body: [-86, 60], needs: mag1x39, stats: { weight: 420, ergo: -6, adsTime: 25 }, build: pvs14 },
  { id: 'rmr_off', cat: 'offset', name: 'Trijicon RMR на 45° кронштейне', desc: 'Мини-коллиматор сбоку для ближнего боя: V — переключиться, оружие заваливается', foot: [-12, 12], body: [-23, 24], stats: { weight: 95, ergo: -1 }, build: rmrOffset },
  { id: 'mbus_rear', cat: 'rearsight', name: 'Magpul MBUS (целик)', desc: 'Складной диоптр, полимер', foot: [-13, 13], body: [-13, 13], stats: { weight: 34 }, build: mbusRear },
  { id: 'mbus_front', cat: 'frontsight', name: 'Magpul MBUS (мушка)', desc: 'Складная мушка, полимер', foot: [-13, 13], body: [-13, 13], stats: { weight: 26 }, build: mbusFront },
];
