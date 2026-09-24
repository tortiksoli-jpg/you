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

/* ------------------------------------------ Trijicon ACOG TA31RMR 4×32 */

// Корпус TA31 — кованый: круглый окуляр, «плечи» под барабанами, раструб объектива 32 мм.
// Сверху — световод (подсветка шеврона) и мини-коллиматор RMR на штатной площадке:
// через него можно целиться (V — переключить прицел), ось RMR на 38 мм выше оси ACOG.
function acog(ctx) {
  const k = ctx.kit();
  const A = 38;
  const at = (g, t = {}) => G.T(g, { ...t, p: [(t.p?.[0] || 0), A + (t.p?.[1] || 0), t.p?.[2] || 0] });
  // кронштейн TA51: плоское основание, два барашка слева
  k.add('alu', clampBody(-32, 32, 7));
  for (const x of [-18, 18]) {
    k.add('alu', G.T(ctx.C.knob(8, 8, 20), { r: [0, 90, 0], p: [x, -2, -13] }));
    k.add('steel', G.cylZ(3, -13, 16, { seg: 12 }), { p: [x, -2, 0] });
    k.add('steel', G.T(G.cylZ(4.2, 13, 16, { seg: 6 }), { p: [x, -2, 0] }));
  }
  // ножки корпуса до кронштейна (два «копыта» с винтами)
  for (const x of [-26, 14]) {
    k.add('alu', G.extrudeX([[-12, 6, 1], [12, 6, 1], [11, A - 14, 3], [-11, A - 14, 3]], x, x + 14, { bevel: 1.2 }));
    for (const s of [-1, 1]) k.add('steel', G.T(G.screwHead(2.2, 1), { r: [0, 0, 0], p: [x + 7, 12, s * 12.2] }));
  }
  k.add('alu', G.extrudeX([[-10, 6, 1], [10, 6, 1], [10, 10, 1], [-10, 10, 1]], -26, 28, { bevel: 0.8 }));
  // корпус: окуляр, средняя часть, раструб объектива
  k.add('alu', at(hollowLathe([[-74, 14.5], [-73, 19.8], [-70, 20.6], [-54, 20.6], [-50, 18.8], [-44, 18.2], [26, 18.2], [36, 20], [54, 23.6], [72, 24.2], [74.5, 23.2]], [[-74, 15.8], [30, 15.8], [74.5, 18]], { seg: 44 })));
  // резиновый наглазник и кольцо окуляра с насечкой
  k.add('rubber', at(G.tubeX(21.2, 19.8, -76, -68, { seg: 40 })));
  k.add('alu', at(G.flutesX(20.6, -66, -56, 36, 1.2, 0.6)));
  k.add('lensBlack', at(G.tubeX(15.9, 15.2, -72, 30, { seg: 32 })));
  k.add('lensBlack', at(G.tubeX(18.1, 17.4, 30, 73.5, { seg: 32 })));
  // «плечи» корпуса под барабанами (квадратное сечение с большими радиусами)
  k.add('alu', at(G.extrudeX(G.rrect(0, 0, 40, 40, 11), -8, 24, { bevel: 2 })));
  // барабаны под колпачками: вертикаль сверху, горизонталь справа
  k.add('alu', at(G.cylY(10, 19, 29, { c: 1.4, seg: 32 }), { p: [8, 0, 0] }));
  k.add('alu', at(G.ringGrooves(10, 20, 27, 3, 0.4, { seg: 32 }), { r: [0, 0, 90], p: [8, 0, 0] }));
  k.add('alu', at(G.cylZ(10, 19, 29, { c: 1.4, seg: 32 }), { p: [8, 0, 0] }));
  k.add('alu', at(G.ringGrooves(10, 20, 27, 3, 0.4, { seg: 32 }), { r: [0, -90, 0], p: [8, 0, 0] }));
  // гребень со световодом: открыт спереди, сзади — площадка под RMR
  k.add('alu', G.extrudeX([[-9, A + 14, 2], [9, A + 14, 2], [8, A + 23, 3], [-8, A + 23, 3]], -44, 42, { bevel: 1.5 }));
  k.add('emGreen', G.extrudeX([[-2.4, A + 22.2], [2.4, A + 22.2], [2.4, A + 24, 1], [-2.4, A + 24, 1]], 10, 38, { bevel: 0.3 }));
  for (let i = 0; i < 4; i++) k.add('alu', G.T(G.box(1.6, 2.4, 7, { bevel: 0.4 }), { p: [14 + i * 7, A + 24.2, 0] }));
  // площадка RMR (штатная у TA31RMR) и два винта
  k.add('alu', G.extrudeX(G.rrect(0, A + 24, 25, 2.2, 0.8), -40, 6, { bevel: 0.6 }));
  for (const x of [-30, -4]) k.add('steel', G.T(G.cylY(2.2, A + 25, A + 26.2, { seg: 12 }), { p: [x, 0, 0] }));
  // RMR Type 2: собственная прицельная ось (сетка «точка»)
  const rk = ctx.kit();
  const RA = rmrBody(ctx, rk);
  const glass = lens(ctx, G.extrudeX(G.shape(G.rrect(0, RA + 0.5, 18.6, 13.4, 5)), 6, 7, { bevel: 0.2 }), 'glassAmber');
  const rmr = G.node('acogRmr', [rk.build(), glass]);
  rmr.position.set(-17, A + 25.1, 0);
  const root = G.node('acog', [k.build(), rmr]);
  const oc = lens(ctx, at(ctx.C.lensDisc(15.8, -72)), 'glassBlue');
  const ob = lens(ctx, at(ctx.C.lensDisc(17.8, 73)), 'glassAmber');
  root.add(oc, ob);
  return {
    root,
    sight: { y: A, z: 0, x0: -76, x1: 75, r: 15, mag: 4, reticle: 'chevron', eyeRelief: 38, lens: oc },
    sights: [{ label: 'RMR на ACOG', node: rmr, y: RA, z: 0, x0: -22, x1: 15, r: 9, mag: 1, reticle: 'dot', lens: glass }],
  };
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

// Кронштейн 45° с произвольным мини-коллиматором: body(k) строит корпус в системе
// наклонной площадки (начало — центр нижней плоскости) и возвращает { A, glass, x0, x1, reticle }.
function cantOptic(ctx, name, body) {
  const k = ctx.kit(), m = ctx.kit();
  k.add('alu', clampBody(-13, 13, 5, { w: 24 }));
  k.add('steel', crossBolt(0));
  k.add('alu', G.extrudeX([[-12, 3, 1], [12, 3, 1], [31, 14, 3], [27, 22, 3], [6, 12, 3], [-12, 8, 2]], -13, 13, { bevel: 1.2 }));
  for (const x of [-7, 7]) k.add('steel', G.T(G.cylX(1.9, 0, 1.4, { seg: 6 }).rotateY(Math.PI / 2), { p: [x, 17, 24] }));
  m.add('alu', G.extrudeX(G.rrect(0, -1.5, 28, 5, 1.5), -24, 25, { bevel: 0.8 }));
  const b = body(ctx, m);
  const cant = G.node(name + 'Cant', [m.build(), b.glass]);
  cant.position.set(0, 16.5, 22);
  cant.rotation.x = Math.PI / 4;
  return {
    root: G.node(name, [k.build(), cant]),
    sight: { node: cant, y: b.A, z: 0, x0: b.x0, x1: b.x1, r: 9, mag: 1, reticle: b.reticle || 'dot', lens: b.glass },
  };
}

// Leupold DeltaPoint Pro: высокое окно с наклонённым верхом, металлический козырёк,
// кнопка сверху сзади, батарея сверху под прицелом.
function dppBody(ctx, k) {
  const A = 17;
  k.add('alu', G.extrudeX(G.rrect(0, 4, 26, 8, 2), -24, 22, { bevel: 1.2 }));
  k.add('alu', G.extrudeZ([[-24, 7], [-8, 7], [-8, 11], [-14, 13.5, 2], [-24, 12.5, 2]], 24, { bevel: 1.2 }));
  const hood = G.shape([[-13, 7], [13, 7], [13, 22, 3], [8, 29, 5], [-8, 29, 5], [-13, 22, 3]], [[[-10, 8.6], [10, 8.6], [10, 21.5, 2], [6.5, 26.5, 4], [-6.5, 26.5, 4], [-10, 21.5, 2]]]);
  k.add('alu', G.extrudeX(hood, 0, 17, { bevel: 1 }));
  k.add('steel', G.T(G.box(10, 2.4, 20, { bevel: 0.6 }), { p: [8, 28.6, 0] }));
  k.add('rubber', G.T(G.cylY(3, 11, 13.6, { seg: 16, c: 0.6 }), { p: [-18, 0, 0] }));
  for (const s of [-1, 1]) k.add('steel', G.T(G.cylZ(2.2, 12.6, 13.6, { seg: 12 }), { p: [-4, 11, s > 0 ? 0 : -26.2] }));
  const glass = lens(ctx, G.extrudeX(G.shape([[-9.6, 9], [9.6, 9], [9.6, 21, 2], [6, 26, 4], [-6, 26, 4], [-9.6, 21, 2]]), 11, 12, { bevel: 0.2 }), 'glassAmber');
  return { A, glass, x0: -24, x1: 17, reticle: 'dot' };
}

// Aimpoint ACRO P-2: закрытый корпус (излучатель защищён), плоские окна спереди и сзади.
function acroBody(ctx, k) {
  const A = 16;
  const sec = G.shape(G.rrect(0, 14, 30, 28, 5), [G.rrect(0, 16, 20, 17, 3)]);
  k.add('alu', G.extrudeX(sec, -12, 16, { bevel: 1.4 }));
  k.add('alu', G.extrudeX(G.rrect(0, 4, 30, 8, 2), -24, 16, { bevel: 1.2 }));
  k.add('alu', G.extrudeZ([[-24, 7], [-12, 7], [-12, 20], [-18, 19, 3], [-24, 14, 3]], 26, { bevel: 1.4 }));
  for (const s of [-1, 1]) k.add('rubber', G.T(G.box(6, 5, 1.6, { bevel: 0.6 }), { p: [-18, 12, s * 13.8] }));
  k.add('steel', G.T(G.cylY(3.4, 1, 2, { seg: 20 }), { p: [-2, -1, 0] }));
  const glass = lens(ctx, G.extrudeX(G.shape(G.rrect(0, 16, 20, 17, 3)), 12, 13, { bevel: 0.2 }), 'glassBlue');
  return { A, glass, x0: -12, x1: 16, reticle: 'dot' };
}

// Holosun HS507C: открытый, как RMR, но с боковым лотком батареи и кнопками под «рогами».
function hs507Body(ctx, k) {
  const A = rmrBody(ctx, k);
  k.add('alu', G.T(G.box(16, 9, 2.2, { bevel: 0.8 }), { p: [-10, 5, 13.3] }));
  k.add('steel', G.T(G.cylZ(1.5, 14.2, 15, { seg: 10 }), { p: [-15, 5, 0] }));
  const glass = lens(ctx, G.extrudeX(G.shape(G.rrect(0, A + 0.5, 18.6, 13.4, 5)), 6, 7, { bevel: 0.2 }), 'glassBlue');
  return { A, glass, x0: -22, x1: 15, reticle: 'cdot' };
}

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
  return { root: G.node('pvs14', [k.build(), flip]), sight: { y: A, z: 0, x0: -86, x1: 60, r: 14, mag: 1, eyeRelief: 22, magnifier: true, nv: true, hide: body, suffix: ' + PVS-14', lens: lensE }, flipAside: { node: flip, angle: -95 } };
}

function mbusRear(ctx) {
  const k = ctx.kit(), f = ctx.kit();
  k.add('poly', clampBody(-13, 13, 6, { w: 25 }));
  k.add('steel', crossBolt(0));
  k.add('poly', G.extrudeZ([[-13, 5], [13, 5], [13, 11, 3], [-13, 11, 3]], 30, { bevel: 1.5 }));
  // створка с двумя диоптрами (большой и малый)
  const leaf = G.shape([[-4, 0, 1], [4, 0, 1], [4, 44, 3], [-4, 44, 3]].map(([x, y, r]) => [x, y, r]));
  // створка со сквозным отверстием диоптра (сечение в плоскости z-y)
  f.add('poly', G.extrudeX(G.shape([[-13, 0, 1], [13, 0, 1], [13, 42, 3], [-13, 42, 3]], [G.circle(0, 29.5, 2.7, 24)]), -3.5, 3.5, { bevel: 1 }));
  f.add('poly', G.T(G.tubeX(8, 2.6, -2.5, 2.5, { seg: 28 }), { p: [0, 29.5, 0] }));
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

/* ------------------------------------------- Коллиматоры и голографы (лёгкие) */

// Aimpoint CompM4s на QRP2 + проставка 39 мм: труба 30 мм, батарея АА под объективом.
function compm4(ctx) {
  const k = ctx.kit();
  const A = 39;
  const at = (g, t = {}) => G.T(g, { ...t, p: [(t.p?.[0] || 0), A + (t.p?.[1] || 0), t.p?.[2] || 0] });
  // QRP2: башмак, проставка и кольцо-хомут с крупным барашком справа
  k.add('alu', clampBody(-16, 16, 6));
  k.add('alu', G.extrudeZ(G.shape([[-15, 5, 1], [15, 5, 1], [13, A - 17, 3], [-13, A - 17, 3]], [G.slot(-7, 7, (A - 12) / 2 + 3, 8)]), 20, { bevel: 1.2 }));
  k.add('alu', at(G.tubeX(22.4, 19.6, -11, 11, { seg: 44, c: 1.2 })));
  k.add('alu', G.extrudeX([[-6, A - 26], [6, A - 26], [6, A - 18], [-6, A - 18]], -11, 11, { bevel: 0.8 }));
  k.add('alu', G.T(ctx.C.knob(11, 9, 20), { r: [0, -90, 0], p: [0, -1, 13] }));
  k.add('steel', G.cylZ(3.4, -15, 13, { seg: 12 }), { p: [0, -1, 0] });
  // корпус
  k.add('alu', at(hollowLathe([[-60, 18.8], [-59, 21], [-50, 21], [-48, 19.6], [36, 19.6], [40, 21.6], [58, 21.6], [60, 20.2]], [[-60, 15.2], [60, 17.4]], { seg: 48 })));
  k.add('rubber', at(G.tubeX(21.4, 20.2, -58, -50, { seg: 44 })));
  k.add('lensBlack', at(G.tubeX(17.5, 16.8, -58, 58, { seg: 32 })));
  k.add('alu', at(G.ringGrooves(21.6, 44, 56, 4, 0.5, { seg: 44 })));
  // башня регулировок: колпачки сверху и справа
  k.add('alu', at(G.extrudeX(G.rrect(0, 0, 34, 34, 9), 8, 30, { bevel: 1.6 })));
  k.add('alu', at(G.cylY(9.5, 16, 26, { c: 1.2, seg: 28 }), { p: [19, 0, 0] }));
  k.add('alu', at(G.cylZ(9.5, 16, 26, { c: 1.2, seg: 28 }), { p: [19, 0, 0] }));
  // батарейный отсек АА под объективом, крышка спереди; переключатель яркости слева
  k.add('alu', at(G.cylX(9.4, 14, 58, { c: 1, seg: 28 }), { p: [0, -21, 0] }));
  k.add('alu', at(G.extrudeX([[-7, -19], [7, -19], [7, -12], [-7, -12]], 14, 58, { bevel: 0.8 })));
  k.add('alu', at(ctx.C.knob(10, 8, 24), { r: [0, 0, -90], p: [58, -21, 0] }));
  k.add('alu', at(ctx.C.knob(9, 7, 20), { r: [0, 90, 0], p: [-30, 0, -19.5] }));
  const root = G.node('compm4', [k.build()]);
  root.add(lens(ctx, at(ctx.C.lensDisc(15.4, -57)), 'glassBlue'));
  const front = lens(ctx, at(ctx.C.lensDisc(17.4, 57)), 'glassRed');
  root.add(front);
  return { root, sight: { y: A, z: 0, x0: -60, x1: 60, r: 15, mag: 1, reticle: 'dot', lens: front } };
}

// EOTech XPS2-0: короткий голограф с поперечной батареей CR123, окно на абсолютном совмещении.
function xps2(ctx) {
  const k = ctx.kit();
  const A = 36;
  k.add('alu', clampBody(-18, 18, 5.5));
  k.add('steel', crossBolt(0, -2.5, 13, { nutR: 0 }).slice(0, 1));
  k.add('steel', G.T(ctx.C.knob(7, 5, 16), { r: [0, -90, 0], p: [0, -1, 13] }));
  // основание-корпус
  k.add('alu', G.extrudeX([[-16, 4.5, 1], [16, 4.5, 1], [16, 13, 3], [-16, 13, 3]], -36, 40, { bevel: 1.2 }));
  // батарейный отсек спереди (поперечный) и кнопки сзади
  k.add('alu', G.T(G.cylZ(9, -16.5, 16.5, { c: 1, seg: 28 }), { p: [30, 13, 0] }));
  k.add('alu', G.T(ctx.C.knob(9.3, 5, 22), { r: [0, -90, 0], p: [30, 13, 16.5] }));
  k.add('alu', G.extrudeZ([[-36, 5], [-26, 5], [-26, 20, 3], [-36, 17, 2]], 30, { bevel: 1.2 }));
  for (const y of [9, 15]) k.add('rubber', G.T(G.box(3, 4.6, 12, { bevel: 0.8 }), { p: [-36.5, y, 0] }));
  // кожух окна: арка с толстыми стенками
  const arch = (w, cy, h0) => {
    const pts = [[-w, h0], [w, h0]];
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; pts.push([Math.cos(a) * w, cy + Math.sin(a) * w]); }
    return pts;
  };
  k.add('alu', G.extrudeX(G.shape(arch(21, A + 2, 11), [arch(15.6, A + 2, 19.6)]), -22, 24, { bevel: 1.2 }));
  k.add('alu', G.extrudeX([[-21, 11], [21, 11], [21, 20], [-21, 20]], -22, 24, { bevel: 0.8 }));
  for (const s of [-1, 1]) k.add('steel', G.T(G.cylZ(2.2, 0, 1.2, { seg: 12 }), { p: [16, A - 8, s * 21] }));
  const root = G.node('xps2', [k.build()]);
  const rp = G.rrect(0, A - 1, 28, 26, 7);
  root.add(lens(ctx, G.extrudeX(rp, -14, -12.8, { bevel: 0.2 }), 'glassBlue'));
  const front = lens(ctx, G.extrudeX(rp, 16, 17.2, { bevel: 0.2 }), 'glassAmber');
  root.add(front);
  return { root, sight: { y: A, z: 0, x0: -14, x1: 17, r: 13, mag: 1, reticle: 'holo', lens: front } };
}

// Holosun HS510C: открытый коллиматор с титановым кожухом, солнечной панелью и QD-рычагом.
function hs510c(ctx) {
  const k = ctx.kit();
  const A = 36;
  k.add('alu', clampBody(-20, 22, 5));
  k.add('steel', qdLever(-16, 14, -1));
  k.add('steel', crossBolt(0, -2.5, 13, { nutR: 0 }).slice(0, 1));
  // плита основания и задний блок с электроникой
  k.add('alu', G.extrudeX([[-17, 4, 1], [17, 4, 1], [17, 12, 2], [-17, 12, 2]], -34, 32, { bevel: 1.2 }));
  k.add('alu', G.extrudeZ([[-34, 10], [-8, 10], [-8, 15, 2], [-14, 18, 3], [-34, 17, 3]], 32, { bevel: 1.5 }));
  k.add('lensBlack', G.T(G.box(16, 0.8, 22, { bevel: 0.3 }), { p: [-22, 17.8, 0], r: [0, 0, -4] }));
  // кнопки «+/−» слева, винты выверки
  for (const x of [-28, -18]) k.add('rubber', G.T(G.cylZ(2.6, -17.8, -16, { c: 0.6, seg: 16 }), { p: [x, 13.5, 0] }));
  k.add('steel', G.T(G.cylY(2.4, 16.5, 18, { seg: 14 }), { p: [-10, 0, 8] }));
  k.add('steel', G.T(G.cylZ(2.4, 16, 17.6, { seg: 14 }), { p: [-12, 13.5, 0] }));
  // кожух окна: рамка + «дуга безопасности» над окном
  const frame = G.shape([[-20, 10, 2], [20, 10, 2], [20, A + 13, 8], [-20, A + 13, 8]], [G.rrect(0, A, 32, 26, 6)]);
  k.add('alu', G.extrudeX(frame, 14, 24, { bevel: 1.4 }));
  k.add('alu', G.extrudeX(G.shape([[-20, A + 8, 3], [20, A + 8, 3], [20, A + 13, 4], [-20, A + 13, 4]]), -8, 20, { bevel: 1.2 }));
  // боковые щёки кожуха с вырезом — вид сбоку как у настоящего 510C
  const cheek = G.shape([[-8, 10, 1], [24, 10, 1], [24, A + 13, 3], [-8, A + 13, 3]], [[[-2, 22, 3], [16, 22, 3], [16, A + 6, 4], [2, A + 6, 4]]]);
  for (const s of [-1, 1]) k.add('alu', G.extrudeZ(cheek, 3.4, { bevel: 0.8, z: s * 18.3 }));
  const root = G.node('hs510c', [k.build()]);
  const win = lens(ctx, G.extrudeX(G.shape(G.rrect(0, A, 32, 26, 6)), 17.4, 18.4, { bevel: 0.2 }), 'glassBlue');
  root.add(win);
  return { root, sight: { y: A, z: 0, x0: -8, x1: 18, r: 13, mag: 1, reticle: 'cdot', lens: win } };
}

// Trijicon MRO: короткий корпус с расширяющимся объективом 25 мм, ось 39 мм.
function mro(ctx) {
  const k = ctx.kit();
  const A = 39;
  const at = (g, t = {}) => G.T(g, { ...t, p: [(t.p?.[0] || 0), A + (t.p?.[1] || 0), t.p?.[2] || 0] });
  k.add('alu', clampBody(-18, 18, 5.5));
  k.add('alu', G.extrudeZ(G.shape([[-17, 5], [17, 5], [15, A - 13, 3], [-15, A - 13, 3]], [G.slot(-8, 8, (A - 8) / 2 + 3, 9)]), 18, { bevel: 1.2 }));
  k.add('steel', crossBolt(0));
  k.add('alu', at(hollowLathe([[-30, 15], [-29, 16.6], [-10, 16.6], [18, 19.6], [30, 20.2], [32, 19.2]], [[-30, 12.4], [32, 16.8]], { seg: 44 })));
  k.add('lensBlack', at(G.tubeX(16.9, 16.2, 10, 31, { seg: 32 })));
  k.add('lensBlack', at(G.tubeX(12.5, 11.8, -29, 10, { seg: 32 })));
  k.add('alu', G.extrudeX([[-12, A - 16, 2], [12, A - 16, 2], [12, A - 10], [-12, A - 10]], -16, 16, { bevel: 1 }));
  // колесо яркости сверху-слева, регулировки сверху и справа
  k.add('alu', at(ctx.C.knob(8.5, 6, 26), { r: [0, 0, 90], p: [-14, 14.5, -6] }));
  k.add('alu', at(G.cylY(6.5, 15, 20, { c: 0.8, seg: 20 }), { p: [6, 0, 5] }));
  k.add('alu', at(G.cylZ(6.5, 15, 20, { c: 0.8, seg: 20 }), { p: [6, 0, 0] }));
  const root = G.node('mro', [k.build()]);
  root.add(lens(ctx, at(ctx.C.lensDisc(12.6, -28.5)), 'glassBlue'));
  const front = lens(ctx, at(ctx.C.lensDisc(17, 30.5)), 'glassRed');
  root.add(front);
  return { root, sight: { y: A, z: 0, x0: -30, x1: 32, r: 12, mag: 1, reticle: 'dot', lens: front } };
}

// Trijicon RMR Type 2 на райзере Unity FAST (ось на высоте нижней трети AR).
function rmrRiser(ctx) {
  const k = ctx.kit(), m = ctx.kit();
  const H = 24;
  k.add('alu', clampBody(-17, 17, 5, { w: 25 }));
  k.add('steel', crossBolt(-8));
  k.add('steel', crossBolt(8));
  // стойка с облегчающим окном
  k.add('alu', G.extrudeZ(G.shape([[-18, 4, 1], [18, 4, 1], [17, H, 1.5], [-17, H, 1.5]], [G.slot(-10, 10, H / 2 + 2, 8)]), 24, { bevel: 1 }));
  k.add('alu', G.extrudeX(G.rrect(0, H - 1.5, 26, 3, 1), -22, 22, { bevel: 0.6 }));
  const A = rmrBody(ctx, m);
  const glass = lens(ctx, G.extrudeX(G.shape(G.rrect(0, A + 0.5, 18.6, 13.4, 5)), 6, 7, { bevel: 0.2 }), 'glassAmber');
  const body = G.node('rmr', [m.build(), glass]);
  body.position.set(-3, H, 0);
  return { root: G.node('rmr_riser', [k.build(), body]), sight: { node: body, y: A, z: 0, x0: -22, x1: 15, r: 9, mag: 1, reticle: 'dot', lens: glass } };
}

// ПК-120 (БелОМО): коллиматор с прямоугольным кожухом-«тоннелем» и выносной батареей.
function pk120(ctx) {
  const k = ctx.kit();
  const A = 40;
  k.add('alu', clampBody(-24, 24, 6));
  k.add('steel', crossBolt(-10));
  k.add('steel', G.T(ctx.C.knob(8, 7, 18), { r: [0, -90, 0], p: [12, -1, 13] }));
  k.add('alu', G.extrudeX([[-15, 5, 1], [15, 5, 1], [15, A - 16, 2], [-15, A - 16, 2]], -30, 30, { bevel: 1.2 }));
  // тоннель: восьмигранное сечение со скосами, стенки 4 мм
  const oct = (w, h, c, cy) => [[-w + c, cy - h], [w - c, cy - h], [w, cy - h + c], [w, cy + h - c], [w - c, cy + h], [-w + c, cy + h], [-w, cy + h - c], [-w, cy - h + c]];
  k.add('alu', G.extrudeX(G.shape(oct(20, 17, 6, A), [oct(16, 13, 5, A)]), -34, 34, { bevel: 1.2 }));
  // бленда объектива, отсек батареи справа, маховик яркости слева
  k.add('alu', G.extrudeX(G.shape(oct(21, 18, 6.5, A), [oct(16.5, 13.5, 5, A)]), 26, 36, { bevel: 1 }));
  k.add('alu', G.T(G.cylX(7.5, -30, 6, { c: 1, seg: 24 }), { p: [0, A - 4, 24] }));
  k.add('alu', G.T(ctx.C.knob(7.8, 5, 18), { r: [0, 180, 0], p: [-30, A - 4, 24] }));
  k.add('alu', G.T(ctx.C.knob(9, 7, 22), { r: [0, 90, 0], p: [-18, A - 6, -20] }));
  const root = G.node('pk120', [k.build()]);
  const win = lens(ctx, G.extrudeX(G.shape(oct(16, 13, 5, A)), 24, 25, { bevel: 0.2 }), 'glassRed');
  root.add(win);
  return { root, sight: { y: A, z: 0, x0: -34, x1: 36, r: 12, mag: 1, reticle: 'dot', lens: win } };
}

// ОКП-7Д «Валдай»: низкий коллиматор на «ласточкин хвост» АК, тоннель над крышкой.
// Начало — боковая планка на левом борту коробки, +Z — к оси оружия.
function okp7(ctx) {
  const k = ctx.kit();
  const Y = 50, Z = 19;
  k.add('steel', G.extrudeX(G.shape([[-3, -9, 1], [4, -9], [4, 9], [-3, 9, 1], [-11, 7, 2], [-11, -7, 2]]), -46, 46, { bevel: 0.8 }));
  k.add('steel', G.T(ctx.C.knob(7, 6, 18), { r: [0, 90, 0], p: [-26, 0, -11] }));
  // кронштейн от планки вверх и над крышкой
  k.add('alu', G.extrudeX(G.shape([[-11, 6, 2], [4, 6, 2], [Z - 6, Y - 18, 3], [Z - 10, Y - 12, 3], [-11, 20, 2]]), -44, 44, { bevel: 1.4 }));
  // корпус-тоннель: трапеция, сзади и спереди открыт
  const trap = (w0, w1, y0, y1) => [[Z - w0, y0, 2], [Z + w0, y0, 2], [Z + w1, y1, 5], [Z - w1, y1, 5]];
  k.add('alu', G.extrudeX(G.shape(trap(22, 17, Y - 17, Y + 15), [trap(17.5, 13.5, Y - 13, Y + 11.5)]), -48, 40, { bevel: 1.4 }));
  // блок электроники снизу-сзади и переключатель яркости справа
  k.add('alu', G.extrudeX([[Z - 18, Y - 22, 2], [Z + 18, Y - 22, 2], [Z + 18, Y - 16], [Z - 18, Y - 16]], -48, -8, { bevel: 1 }));
  k.add('alu', G.T(ctx.C.knob(8, 6, 20), { r: [0, -90, 0], p: [-30, Y - 6, Z + 21] }));
  const root = G.node('okp7', [k.build()]);
  const win = lens(ctx, G.extrudeX(G.shape(trap(17.5, 13.5, Y - 13, Y + 11.5)), 30, 31, { bevel: 0.2 }), 'glassAmber');
  root.add(win);
  return { root, sight: { y: Y - 1, z: Z, x0: -48, x1: 31, r: 12, mag: 1, reticle: 'dot', lens: win } };
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
  { id: 'compm4', cat: 'optic', name: 'Aimpoint CompM4s', desc: 'Армейский коллиматор, точка 2 MOA, батарея АА на 8 лет', foot: [-16, 16], body: [-62, 62], stats: { weight: 380, ergo: -3, adsTime: 14 }, build: compm4 },
  { id: 'mro', cat: 'optic', name: 'Trijicon MRO', desc: 'Компактный коллиматор с широким полем зрения, точка 2 MOA', foot: [-18, 18], body: [-31, 33], stats: { weight: 170, ergo: -1, adsTime: 9 }, build: mro },
  { id: 'rmr_riser', cat: 'optic', name: 'Trijicon RMR на райзере Unity', desc: 'Мини-коллиматор открытого типа, самый лёгкий', foot: [-17, 17], body: [-25, 22], stats: { weight: 90, ergo: 0, adsTime: 6 }, build: rmrRiser },
  { id: 'hs510c', cat: 'optic', name: 'Holosun HS510C', desc: 'Открытый коллиматор: кольцо 65 MOA + точка, солнечная панель', foot: [-20, 22], body: [-34, 32], stats: { weight: 245, ergo: -1, adsTime: 8 }, build: hs510c },
  { id: 'xps2', cat: 'optic', name: 'EOTech XPS2-0', desc: 'Короткий голографический, абсолютное совмещение с механикой', foot: [-18, 18], body: [-37, 40], stats: { weight: 255, ergo: -2, adsTime: 11 }, build: xps2 },
  { id: 'pk120', cat: 'optic', name: 'ПК-120 (БелОМО)', desc: 'Коллиматор в защищённом кожухе-тоннеле', foot: [-24, 24], body: [-40, 37], stats: { weight: 310, ergo: -2, adsTime: 12 }, build: pk120 },
  { id: 'okp7d', cat: 'optic', name: 'ОКП-7Д «Валдай»', desc: 'Низкий коллиматор на боковую планку АК, окно над крышкой', mountTypes: ['dovetail'], only: ['akm', 'ak74'], foot: [-46, 46], body: [-48, 46], needs: (cfg) => !cfg.sidemount, stats: { weight: 290, ergo: -2, adsTime: 11 }, build: okp7 },
  { id: 'acog', cat: 'optic', name: 'Trijicon ACOG TA31RMR 4×32', desc: 'Призменный 4×, шеврон со шкалой + RMR сверху для ближнего боя (V — переключить)', foot: [-32, 32], body: [-77, 76], stats: { weight: 530, ergo: -6, adsTime: 40 }, build: acog },
  { id: 'lpvo', cat: 'optic', name: 'Прицел 1–6×24', desc: 'Переменная кратность, колёсико — зум в прицеле', foot: [-38, 34], body: [-132, 106], stats: { weight: 720, ergo: -9, adsTime: 55 }, build: lpvo },
  { id: 'mag3x', cat: 'magnifier', name: 'Aimpoint 3XMag-1 + FTS', desc: 'Увеличитель 3×, откидывается вбок', foot: [-16, 16], body: [-57, 55], needs: mag1x39, stats: { weight: 330, ergo: -4, adsTime: 20 }, build: magnifier },
  { id: 'pvs14', cat: 'magnifier', name: 'Монокуляр AN/PVS-14', desc: 'ПНВ за коллиматором на откидном кронштейне (N — откинуть)', foot: [-16, 16], body: [-86, 60], needs: mag1x39, stats: { weight: 420, ergo: -6, adsTime: 25 }, build: pvs14 },
  { id: 'rmr_off', cat: 'offset', side: true, name: 'Trijicon RMR на 45° кронштейне', desc: 'Мини-коллиматор сбоку для ближнего боя: V — переключиться, оружие заваливается', foot: [-12, 12], body: [-23, 24], stats: { weight: 95, ergo: -1 }, build: rmrOffset },
  { id: 'dpp_off', cat: 'offset', side: true, name: 'Leupold DeltaPoint Pro на 45°', desc: 'Наклонный коллиматор с большим окном, точка 2,5 MOA (V — переключиться)', foot: [-13, 13], body: [-24, 25], stats: { weight: 110, ergo: -1 }, build: (c) => cantOptic(c, 'dpp_off', dppBody) },
  { id: 'acro_off', cat: 'offset', side: true, name: 'Aimpoint ACRO P-2 на 45°', desc: 'Наклонный закрытый коллиматор: излучатель защищён от грязи и воды', foot: [-13, 13], body: [-24, 25], stats: { weight: 120, ergo: -1 }, build: (c) => cantOptic(c, 'acro_off', acroBody) },
  { id: 'hs507_off', cat: 'offset', side: true, name: 'Holosun HS507C на 45°', desc: 'Наклонный коллиматор: кольцо 32 MOA + точка, боковой лоток батареи', foot: [-13, 13], body: [-24, 25], stats: { weight: 100, ergo: -1 }, build: (c) => cantOptic(c, 'hs507_off', hs507Body) },
  { id: 'mbus_rear', cat: 'rearsight', name: 'Magpul MBUS (целик)', desc: 'Складной диоптр, полимер', foot: [-13, 13], body: [-13, 13], stats: { weight: 34 }, build: mbusRear },
  { id: 'mbus_front', cat: 'frontsight', name: 'Magpul MBUS (мушка)', desc: 'Складная мушка, полимер', foot: [-13, 13], body: [-13, 13], stats: { weight: 26 }, build: mbusFront },
];
