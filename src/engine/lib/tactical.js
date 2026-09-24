// Фонари, ЛЦУ, рукоятки, сошки. Начало — верх планки, +Y — от планки наружу
// (на нижней планке это «вниз» в мире, на боковых — в сторону).
import * as G from '../geo.js';
import { clampBody, crossBolt } from './common.js';
import { lens } from './optics.js';

/* ------------------------------------------- передняя часть фонаря */

// Параболический отражатель (хром), светодиод в центре и защитное стекло; у TIR-оптики —
// прозрачная линза полного внутреннего отражения с матовым центром. x — плоскость
// торца, r — радиус окна, depth — глубина отражателя. Возвращает меши и данные свечения.
function lampFace(ctx, o) {
  const { x, r, cy = 0, cz = 0, depth = 14, led = 2.2, tir = false } = o;
  const at = (g) => g.translate(0, cy, cz);
  const meshes = [];
  let refl;
  if (!tir) {
    const prof = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push([x - 1.2 - depth * (1 - t), led * 1.25 + (r - 0.4 - led * 1.25) * Math.sqrt(t)]); }
    refl = lens(ctx, at(G.latheX(prof.reverse(), { seg: 40, crease: 80 })), 'reflector');
    refl.renderOrder = 0;
  } else {
    const prof = [[x - depth, led * 1.6], [x - depth * 0.45, r * 0.62], [x - 1.2, r - 0.3]];
    refl = lens(ctx, at(G.latheX(prof.reverse(), { seg: 36, crease: 80 })), 'reflector');
    refl.material.color.set(0x9aa3aa); refl.material.roughness = 0.25; refl.renderOrder = 0;
  }
  refl.material.transparent = false;
  meshes.push(refl);
  // светодиод: подложка + купол с люминофором
  const x0 = tir ? x - depth : x - 1.2 - depth;
  const pad = new ctx.THREE.Mesh(at(G.box(0.8, led * 2.6, led * 2.6, { bevel: 0.2 }).translate(x0 + 0.2, 0, 0)), ctx.mats.get('paintWhite'));
  meshes.push(pad);
  const ledM = lens(ctx, at(G.latheX([[x0 + 0.5, 0], [x0 + 0.5, led], [x0 + 1.1, led * 0.9], [x0 + 1.5, led * 0.5], [x0 + 1.7, 0]], { seg: 20 })), 'ledPhos');
  ledM.renderOrder = 0; ledM.material.transparent = false;
  meshes.push(ledM);
  const glass = lens(ctx, at(G.cylX(r - 0.1, x - 1.1, x - 0.3, { seg: 40, c: 0.2 })), 'glass');
  meshes.push(glass);
  if (tir) {
    const cone = lens(ctx, at(G.latheX([[x - depth + 0.3, 0], [x - depth + 0.3, led * 1.5], [x - depth * 0.45, r * 0.6], [x - 1.3, r - 0.4], [x - 1.3, 0]], { seg: 36 })), 'glass');
    cone.material.opacity = 0.22;
    meshes.push(cone);
  }
  for (const m of meshes) m.userData.noAO = true;
  return { meshes, lens: ledM, refl, p: [x + 0.2, cy, cz], lensR: r / 1000 };
}

/* ------------------------------------------------------------ фонари */

function scout(ctx, o) {
  const k = ctx.kit();
  const r = o.r, L0 = o.tail, L1 = o.head, H = o.headR, cy = r + 4.5;
  const at = (g) => g.translate(0, cy, 0);
  // хвостовик с кнопкой, корпус, головка «Scout» с выборками
  k.add('alu', at(G.latheX([[L0 - 4, 0], [L0 - 4, 5.5], [L0 - 2.5, 6.2], [L0, 6.2], [L0, r - 0.8], [L0 + 1, r], [L0 + 16, r], [L0 + 17, r - 0.8], [L0 + 18, r - 0.4], [L1, r - 0.4], [L1 + 5, H], [L1 + 28, H], [L1 + 30, H - 1.4], [L1 + 30, H - 3.2]], { seg: 36 })));
  k.add('rubber', at(G.cylX(5.4, L0 - 5.5, L0 - 3.5, { seg: 20 })));
  k.add('alu', at(G.ringGrooves(r + 0.2, L0 + 3, L0 + 15, 6, 0.5, { seg: 36 })));
  k.add('alu', at(G.flutesX(H - 1.6, L1 + 8, L1 + 25, 6, 5, 1.8)));
  k.add('steel', at(G.tubeX(H + 0.1, H - 3.4, L1 + 28, L1 + 31, { seg: 36 })));
  k.add('steel', at(G.ringGrooves(H + 0.1, L1 + 28.4, L1 + 30.6, 2, 0.3, { seg: 36 })));
  // интегральное крепление с винтом
  k.add('alu', clampBody(-13, 13, 4.8, { w: 24 }));
  k.add('alu', G.extrudeX([[-7, 3], [7, 3], [7, cy - r + 3], [-7, cy - r + 3]], -12, 12, { bevel: 1 }));
  k.add('steel', G.T(ctx.C.knob(6.2, 5, 16), { r: [0, -90, 0], p: [0, -2.5, 12.5] }));
  k.add('steel', G.cylZ(2.4, -14, 12.5, { seg: 12 }), { p: [0, -2.5, 0] });
  // гравировка-кольцо и винт хвостовика
  k.add('steel', at(G.tubeX(r + 0.25, r - 0.5, L0 + 0.5, L0 + 1.5, { seg: 36 })));
  const root = G.node(o.name, [k.build()]);
  const f = lampFace(ctx, { x: L1 + 29.2, r: H - 3.4, cy, depth: 18, led: 2.4 });
  root.add(...f.meshes);
  return { root, light: { p: [L1 + 30, cy, 0], lens: f.lens, refl: f.refl, lumens: o.lm, beam: { lensR: f.lensR, ...o.beam } } };
}

// Streamlight TLR-1 HL: «пистолетный» корпус из алюминия, двухсторонние клавиши
// сзади, поперечная защёлка крепления, головка с рифлёным ободком.
function tlr1(ctx) {
  const k = ctx.kit();
  const cy = 18;
  k.add('alu', clampBody(-16, 16, 5, { w: 25 }));
  k.add('steel', G.T(G.box(8, 4, 26, { bevel: 0.8 }), { p: [4, -2, 0] }));                    // поперечный упор
  k.add('steel', G.T(ctx.C.knob(5.4, 4, 14), { r: [0, -90, 0], p: [4, -2.5, 12.8] }));        // винт-барашек
  // корпус: скруглённое сечение, к хвосту переходит в прямоугольный блок с клавишами
  const sec = G.rrect(0, cy - 1, 30, 29, 11);
  k.add('alu', G.extrudeX(sec, -52, 14, { bevel: 2 }));
  k.add('alu', G.extrudeX(G.rrect(0, 6.5, 22, 5, 1.5), -40, 12, { bevel: 0.8 }));
  // рёбра охлаждения на головке
  k.add('alu', G.T(G.latheX([[12, 0], [12, 14.6], [14, 15.6], [30, 15.6], [31, 16.4], [37, 16.4], [38, 15.2], [38, 0]], { seg: 44 }), { p: [0, cy, 0] }));
  k.add('alu', G.T(G.ringGrooves(15.7, 16, 28, 5, 0.5, { seg: 44 }), { p: [0, cy, 0] }));
  k.add('steel', G.T(G.flutesX(16.3, 31, 37, 30, 1.2, 0.6), { p: [0, cy, 0] }));
  // клавиши-качели по бортам сзади
  for (const s of [-1, 1]) {
    k.add('poly', G.T(G.extrudeZ([[0, -6, 2], [12, -4, 3], [14, 6, 3], [0, 7, 2]], 4, { bevel: 1.2 }), { p: [-58, cy - 2, s * 14.5] }));
    for (let i = 0; i < 4; i++) k.add('poly', G.T(G.box(1.2, 10, 1, { bevel: 0.3 }), { p: [-55 + i * 3, cy - 1, s * 16.8] }));
  }
  k.add('alu', G.extrudeX(G.rrect(0, cy - 2, 26, 22, 6), -60, -50, { bevel: 1.5 }));
  // винты крышки батарейного отсека и надписи-рельеф
  for (const x of [-44, -8]) for (const s of [-1, 1]) k.add('steel', G.T(G.cylZ(1.6, 14.8, 15.6, { seg: 10 }), { p: [x, cy + 7, s > 0 ? 0 : -30.4] }));
  const root = G.node('tlr1', [k.build()]);
  const f = lampFace(ctx, { x: 38, r: 13.6, cy, depth: 15, led: 2.2 });
  root.add(...f.meshes);
  return { root, light: { p: f.p, lens: f.lens, refl: f.refl, beam: { lensR: f.lensR, candela: 13000, hot: 0.085, spill: 0.62, spillK: 0.05, ring: 0.05, color: 0xf1f4ff } } };
}

// Modlite PLHv2 18650 на выносном кронштейне: глубокий отражатель под «дальний»
// луч, рёбра охлаждения, резиновая кнопка давления в хвосте.
function modlite(ctx) {
  const k = ctx.kit();
  const cy = 24, r = 12.7;
  // кронштейн: башмак + перемычка + хомут вокруг корпуса
  k.add('alu', clampBody(-13, 13, 5, { w: 24 }));
  k.add('steel', crossBolt(0));
  k.add('alu', G.extrudeX([[-8, 3, 1], [8, 3, 1], [8, cy - r + 2, 2], [-8, cy - r + 2, 2]], -12, 12, { bevel: 1 }));
  k.add('alu', G.T(G.tubeX(r + 3.2, r, -14, 14, { seg: 40 }), { p: [0, cy, 0] }));
  k.add('steel', G.T(G.cylY(2.4, cy + r - 1, cy + r + 4.4, { seg: 12 }), { p: [0, 0, 0] }));
  // корпус-труба, хвост с кнопкой
  const at = (g) => G.T(g, { p: [0, cy, 0] });
  k.add('alu', at(G.latheX([[-86, 0], [-86, 9], [-84, 11.5], [-80, 13.2], [-66, 13.2], [-65, r], [6, r], [8, r + 1.2], [14, r + 1.2]], { seg: 40 })));
  k.add('alu', at(G.ringGrooves(13.3, -79, -67, 6, 0.5, { seg: 40 })));
  k.add('rubber', at(G.latheX([[-90, 0], [-90, 7], [-88.5, 8.8], [-86, 9.4], [-86, 0]], { seg: 28 })));
  // головка PLHv2 Ø 38 мм с кольцевыми рёбрами
  k.add('alu', at(G.latheX([[14, 0], [14, 13.9], [22, 16.5], [30, 18.4], [50, 19.2], [52, 18.4], [52, 0]], { seg: 48 })));
  for (let i = 0; i < 6; i++) k.add('alu', at(G.tubeX(19.6, 17.5, 22 + i * 3.5, 23.6 + i * 3.5, { seg: 48 })));
  k.add('steel', at(G.tubeX(19.3, 16.8, 49, 53, { seg: 48 })));
  const root = G.node('modlite', [k.build()]);
  const f = lampFace(ctx, { x: 52.6, r: 16.8, cy, depth: 26, led: 1.8 });
  root.add(...f.meshes);
  return { root, light: { p: f.p, lens: f.lens, refl: f.refl, beam: { lensR: f.lensR, candela: 60000, hot: 0.045, spill: 0.5, spillK: 0.018, ring: 0.07, color: 0xfff3e4 } } };
}

// Cloud Defensive REIN 3.0 Micro: короткий корпус, широкий «заливающий» луч
// (TIR-оптика), шестигранная головка, интегральное крепление.
function rein(ctx) {
  const k = ctx.kit();
  const cy = 19, r = 12;
  k.add('alu', clampBody(-14, 14, 5, { w: 24 }));
  k.add('steel', crossBolt(-6)); k.add('steel', crossBolt(6));
  k.add('alu', G.extrudeX([[-9, 3, 1], [9, 3, 1], [9, cy - 6, 3], [-9, cy - 6, 3]], -16, 16, { bevel: 1 }));
  const at = (g) => G.T(g, { p: [0, cy, 0] });
  k.add('alu', at(G.latheX([[-36, 0], [-36, 8], [-34, 11], [-30, 11.6], [-18, 11.6], [-17, r], [18, r]], { seg: 40 })));
  k.add('alu', at(G.ringGrooves(r + 0.2, -12, 16, 7, 0.45, { seg: 40 })));
  k.add('rubber', at(G.latheX([[-40, 0], [-40, 6], [-38, 7.6], [-36, 8], [-36, 0]], { seg: 24 })));
  // шестигранная головка
  k.add('alu', at(G.cylX(15.5, 18, 36, { seg: 6, c: 1.4 })));
  k.add('steel', at(G.tubeX(15.3, 13.2, 35, 37, { seg: 40 })));
  const root = G.node('rein', [k.build()]);
  const f = lampFace(ctx, { x: 37.4, r: 13, cy, depth: 12, led: 1.6, tir: true });
  root.add(...f.meshes);
  return { root, light: { p: f.p, lens: f.lens, refl: f.refl, beam: { lensR: f.lensR, candela: 16000, hot: 0.13, spill: 0.72, spillK: 0.12, ring: 0.02, tir: true, color: 0xfff0dd } } };
}

// Зенитко «Клещ-2П»: плоский корпус с интегральным креплением, основной
// отражатель и ИК-светодиод рядом, выносная кнопка, ребристые бока.
function klesch(ctx) {
  const k = ctx.kit();
  const cy = 17;
  k.add('alu', clampBody(-20, 20, 5, { w: 26 }));
  k.add('steel', crossBolt(-10)); k.add('steel', crossBolt(10));
  k.add('alu', G.extrudeX(G.rrect(0, cy, 32, 28, 7), -46, 30, { bevel: 2.2 }));
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) k.add('alu', G.T(G.box(3, 16, 1.6, { bevel: 0.5 }), { p: [-34 + i * 6, cy, s * 16.4] }));
  // рамка передней панели и винты
  k.add('alu', G.extrudeX(G.shape(G.rrect(0, cy, 32, 28, 7), [G.rrect(-3, cy, 24, 22, 5)]), 30, 34, { bevel: 0.8 }));
  for (const [z, y] of [[-12, cy - 10], [12, cy - 10], [-12, cy + 10], [12, cy + 10]]) k.add('steel', G.T(G.cylX(1.3, 33.5, 34.5, { seg: 10 }), { p: [0, y, z] }));
  k.add('lensBlack', G.extrudeX(G.rrect(-3, cy, 24, 22, 5), 30.2, 31, { bevel: 0.2 }));
  // ИК-светодиод
  k.add('steel', G.T(G.tubeX(4.4, 3, 30, 34.4, { seg: 20 }), { p: [0, cy + 6, 11.5] }));
  k.add('irLens', G.T(G.cylX(3, 31.5, 32.5, { seg: 20 }), { p: [0, cy + 6, 11.5] }));
  // хвост: разъём выносной кнопки, кнопка
  k.add('steel', G.T(G.cylX(4.2, -52, -46, { seg: 20 }), { p: [0, cy + 4, 0] }));
  k.add('rubber', G.T(G.cylX(5.4, -50, -46, { seg: 20 }), { p: [0, cy - 7, 0] }));
  const root = G.node('klesch', [k.build()]);
  const f = lampFace(ctx, { x: 31, r: 10.5, cy, cz: -3, depth: 13, led: 2 });
  root.add(...f.meshes);
  return { root, light: { p: f.p, lens: f.lens, refl: f.refl, beam: { lensR: f.lensR, candela: 9000, hot: 0.06, spill: 0.46, spillK: 0.03, ring: 0.06, color: 0xeef3ff } } };
}

/* ---------------------------------------------------------------- ЛЦУ */

// Лазерный блок в стиле DBAL-A3 / Перст-4: скруглённый корпус, окна излучателей,
// маховики выверки с прорезями и шкалой, поворотный переключатель режимов с метками.
function laserBox(ctx, o) {
  const k = ctx.kit();
  const { L0, L1, H, W, mat } = o;
  k.add('alu', clampBody(-18, 18, 5));
  k.add('steel', G.T(ctx.C.knob(6, 5, 18), { r: [0, -90, 0], p: [0, -2.5, 13] }));
  k.add('steel', G.cylZ(2.4, -14, 13, { seg: 12 }), { p: [0, -2.5, 0] });
  const sec = [[-W / 2, 4, 3], [W / 2, 4, 3], [W / 2, H - 4, 6], [W / 2 - 4, H, 5], [-W / 2 + 4, H, 5], [-W / 2, H - 4, 6]];
  k.add(mat, G.extrudeX(sec, L0, L1, { bevel: 3, bevelSeg: 3 }));
  // панель-вставка по борту и продольные канавки
  for (const s of [-1, 1]) {
    k.add(mat, G.T(G.box(L1 - L0 - 24, H - 16, 1.2, { bevel: 0.6 }), { p: [(L0 + L1) / 2 - 2, H / 2 + 1, s * (W / 2 + 0.2)] }));
    for (let i = 0; i < 3; i++) k.add('lensBlack', G.T(G.box(L1 - L0 - 40, 0.8, 0.6), { p: [(L0 + L1) / 2 - 2, 10 + i * 5, s * (W / 2 + 0.9)] }));
  }
  // передняя панель: окна видимого и ИК лазеров, ИК-осветитель с фокусирующим ободком
  const vis = [L1 + 0.6, H * 0.7, -W * 0.22];
  k.add('lensBlack', G.extrudeX(G.rrect(0, H * 0.7, W - 10, 12, 3), L1 - 0.8, L1 + 0.6, { bevel: 0.3 }));
  for (const z of [-W * 0.22, W * 0.12]) k.add('steel', G.T(G.tubeX(4.4, 2.8, L1 - 1, L1 + 2.2, { seg: 20 }), { p: [0, H * 0.7, z] }));
  if (o.illum) {
    const iy = H * 0.34;
    k.add(mat, G.T(G.tubeX(o.illum + 3, o.illum, L1 - 4, L1 + 9, { seg: 36 }), { p: [0, iy, 0] }));
    k.add('rubber', G.T(G.flutesX(o.illum + 2.8, L1 + 1, L1 + 8, 24, 1.2, 0.8), { p: [0, iy, 0] }));
    k.add('irLens', G.T(G.cylX(o.illum - 0.2, L1 + 6, L1 + 7, { seg: 30 }), { p: [0, iy, 0] }));
  }
  // маховики выверки: сверху и сбоку, с прорезью под монету и белой шкалой
  const turret = (p, r) => {
    k.add(mat, G.T(G.cylY(5, 0, 2.2, { seg: 24, c: 0.5 }), { p, r }));
    k.add('steel', G.T(G.cylY(3.4, 2.2, 3.4, { seg: 20, c: 0.3 }), { p, r }));
    k.add('lensBlack', G.T(G.box(0.8, 1.2, 5, { bevel: 0.1 }), { p: [p[0], p[1], p[2]], r }).translate(0, 0, 0));
  };
  turret([L1 - 16, H, 0], [0, 0, 0]);
  turret([L1 - 16, H / 2, W / 2], [90, 0, 0]);
  // поворотный переключатель режимов с метками
  k.add(mat, G.T(ctx.C.knob(8.5, 5, 20), { r: [0, 0, 90], p: [L0 + 30, H - 1, 0] }));
  for (let i = 0; i < 5; i++) {
    const a = (-0.9 + i * 0.45);
    k.add('paintWhite', G.T(G.box(2.4, 0.6, 1.1), { p: [L0 + 30 + Math.cos(a) * 11, H + 0.1, Math.sin(a) * 11], r: [0, -a * 57.3, 0] }));
  }
  k.add('paintWhite', G.T(G.box(4, 0.8, 1.2), { p: [L0 + 30, H + 4.2, 5] }));
  // кнопки и гнездо выносной кнопки
  for (const z of [-W * 0.25, W * 0.25]) k.add('rubber', G.T(G.cylY(4.2, H - 1, H + 2.4, { c: 1, seg: 18 }), { p: [L0 + 12, 0, z] }));
  k.add('steel', G.T(G.cylX(4, L0 - 5, L0, { seg: 20 }), { p: [0, H * 0.5, 0] }));
  // батарейный отсек сбоку
  k.add(mat, G.T(ctx.C.knob(8, 5, 26), { r: [0, 0, 0], p: [0, 0, 0] }).rotateY(-Math.PI / 2).translate(L0 + 14, H * 0.45, W / 2 - 1));
  const root = G.node(o.name, [k.build()]);
  const ll = lens(ctx, G.cylX(2.7, vis[0] + 0.8, vis[0] + 1.4, { seg: 16 }).translate(0, vis[1], vis[2]), 'laserLens');
  ll.renderOrder = 0; ll.material.transparent = false;
  ll.material.emissive.set(o.color);
  root.add(ll);
  const out = { root, laser: { p: [vis[0] + 2, vis[1], vis[2]], lens: ll, color: o.color } };
  if (o.light) {
    // белый фонарь снизу-спереди (AN/PEQ-16)
    const ly = -2 + H * 0.3, lr = 9.5;
    k.add(mat, G.T(G.latheX([[L1 - 12, 0], [L1 - 12, lr + 2], [L1 + 6, lr + 3.4], [L1 + 8, lr + 2.4], [L1 + 8, 0]], { seg: 36 }), { p: [0, ly, W * 0.2] }));
    root.add(k.build());
    const f = lampFace(ctx, { x: L1 + 8.2, r: lr, cy: ly, cz: W * 0.2, depth: 8, led: 1.6, tir: true });
    root.add(...f.meshes);
    out.light = { p: f.p, lens: f.lens, refl: f.refl, beam: { lensR: f.lensR, ...o.light } };
  }
  return out;
}

function boxLaser(ctx, o) {
  const k = ctx.kit();
  const { L0, L1, H, W } = o;
  k.add('alu', clampBody(-18, 18, 5));
  k.add('steel', crossBolt(-8));
  k.add('steel', crossBolt(8));
  k.add(o.mat, G.extrudeX([[-W / 2, 4, 2], [W / 2, 4, 2], [W / 2, H, 5], [-W / 2, H, 5]], L0, L1, { bevel: 2.4 }));
  // передняя панель с окнами излучателей
  k.add('lensBlack', G.extrudeX(G.rrect(0, (H + 4) / 2, W - 6, H - 10, 3), L1 - 0.8, L1 + 0.6, { bevel: 0.3 }));
  const vis = [L1 + 0.6, H * 0.72, -W * 0.25];
  k.add('steel', G.T(G.tubeX(4.6, 3, L1 - 1, L1 + 2.4, { seg: 20 }), { p: [0, vis[1], vis[2]] }));
  k.add('steel', G.T(G.tubeX(4.6, 3, L1 - 1, L1 + 2.4, { seg: 20 }), { p: [0, vis[1], W * 0.05] }));
  if (o.illum) {
    k.add(o.mat, G.T(G.tubeX(o.illum + 2.4, o.illum, L1 - 3, L1 + 8, { seg: 32 }), { p: [0, H * 0.42, W * 0.18] }));
    k.add('rubber', G.T(G.flutesX(o.illum + 2.2, L1, L1 + 7, 20, 1.2, 0.8), { p: [0, H * 0.42, W * 0.18] }));
    k.add('irLens', G.T(G.cylX(o.illum - 0.2, L1 + 5, L1 + 6, { seg: 28 }), { p: [0, H * 0.42, W * 0.18] }));
  }
  // кнопки и переключатель режимов
  k.add('rubber', G.T(G.cylY(4.4, H - 1, H + 2.4, { c: 1, seg: 18 }), { p: [L0 + 16, 0, -W * 0.22] }));
  k.add('rubber', G.T(G.cylY(4.4, H - 1, H + 2.4, { c: 1, seg: 18 }), { p: [L0 + 16, 0, W * 0.22] }));
  k.add(o.mat, G.T(ctx.C.knob(8, 5, 18), { r: [0, 0, 90], p: [L0 + 36, H - 1, 0] }));
  k.add('paintWhite', G.T(G.box(3, 1, 1.2), { p: [L0 + 36, H + 4.3, 5] }));
  // регулировочные винты
  for (const z of [-W / 4, W / 4]) k.add('steel', G.T(G.cylY(2.6, H - 1, H + 1, { seg: 12 }), { p: [L1 - 16, 0, z] }));
  const root = G.node(o.name, [k.build()]);
  const ll = lens(ctx, G.cylX(2.9, vis[0] + 1.2, vis[0] + 1.8, { seg: 16 }).translate(0, vis[1], vis[2]), 'laserLens');
  ll.renderOrder = 0; ll.material.transparent = false;
  root.add(ll);
  return { root, laser: { p: [vis[0] + 2, vis[1], vis[2]], lens: ll, color: o.color } };
}

/* -------------------------------------------------------- рукоятки */

/* ------------------------------------- Steiner DBAL-PL: фонарь + лазер */

function dbal(ctx) {
  const k = ctx.kit();
  const L0 = -40, L1 = 36, W = 34, H = 34;
  k.add('alu', clampBody(-16, 16, 5));
  k.add('steel', crossBolt(0));
  k.add('polyTan', G.extrudeX([[-W / 2, 4, 2], [W / 2, 4, 2], [W / 2, H, 6], [-W / 2, H, 6]], L0, L1 - 8, { bevel: 2.2 }));
  // головка фонаря снизу-спереди, окно лазера над ней
  const ly = 15, lr = 11.5;
  k.add('polyTan', G.T(G.latheX([[L1 - 12, 0], [L1 - 12, lr + 2], [L1 + 4, lr + 3.4], [L1 + 6, lr + 2.6], [L1 + 6, 0]], { seg: 36 }), { p: [0, ly, 0] }));
  k.add('steel', G.T(G.tubeX(lr + 2.7, lr, L1 + 5, L1 + 7, { seg: 36 }), { p: [0, ly, 0] }));
  const vy = H - 6;
  k.add('polyTan', G.extrudeX(G.rrect(0, vy, 18, 10, 3), L1 - 10, L1 + 2, { bevel: 1 }));
  k.add('lensBlack', G.extrudeX(G.rrect(0, vy, 14, 6.5, 2), L1 + 1.6, L1 + 2.4, { bevel: 0.2 }));
  // выносная кнопка, переключатель режимов, винты выверки
  k.add('rubber', G.T(G.cylY(4.6, H - 1, H + 2.6, { c: 1, seg: 18 }), { p: [L0 + 14, 0, 0] }));
  k.add('polyTan', G.T(ctx.C.knob(7, 5, 16), { r: [0, 0, 90], p: [L0 + 30, H - 1, 0] }));
  for (const z of [-7, 7]) k.add('steel', G.T(G.cylY(2.4, H - 1, H + 0.8, { seg: 12 }), { p: [L1 - 18, 0, z] }));
  const root = G.node('dbal', [k.build()]);
  const le = lens(ctx, G.cylX(lr - 0.1, L1 + 5.2, L1 + 5.8, { seg: 32 }).translate(0, ly, 0), 'lampLens');
  le.renderOrder = 0; le.material.transparent = false;
  const ll = lens(ctx, G.cylX(2.4, L1 + 2.3, L1 + 2.8, { seg: 16 }).translate(0, vy, 3), 'laserLens');
  ll.renderOrder = 0; ll.material.transparent = false;
  root.add(le, ll);
  return {
    root,
    light: { p: [L1 + 7, ly, 0], lens: le, lumens: 300, beam: { candela: 4000, hot: 0.1, spill: 0.5, spillK: 0.06, ring: 0.03, tir: true, color: 0xf6f6ff, lensR: 0.0114 } },
    laser: { p: [L1 + 3, vy, 3], lens: ll, color: 0xff2a1a },
  };
}

function vgrip(ctx, o) {
  const k = ctx.kit();
  const L = o.len, d = o.d;
  k.add('poly', clampBody(-d / 2 - 2, d / 2 + 2, 5, { w: 26 }));
  // тело рукоятки: слегка конусное, с кольцевой текстурой
  const prof = [[0, 0], [0, d / 2 - 0.5]];
  const n = 12;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const r = d / 2 - t * 2 + (o.ribs && i % 2 ? 0.8 : 0);
    prof.push([4 + t * (L - 10), r]);
  }
  prof.push([L - 3, d / 2 - 2.5], [L, d / 2 - 5], [L, 0]);
  const body = G.latheX(prof, { seg: 32, crease: 50 });
  k.add('poly', G.T(body, { r: [0, 0, 90], p: [o.tilt ?? 0, 3, 0], s: [1, 1, o.flat ?? 1] }));
  if (o.cap) k.add('polySoft', G.T(G.cylY(d / 2 - 3, L + 1, L + 4, { c: 1, seg: 28 }), { p: [0, 0, 0] }));
  k.add('steel', G.T(ctx.C.knob(5.5, 4, 14), { r: [0, -90, 0], p: [0, -2.5, 13] }));
  return { root: k.build(o.name) };
}

function afg(ctx) {
  const k = ctx.kit();
  const pro = G.shape([[-62, 0, 2], [34, 0, 2], [34, 6, 4], [14, 18, 20], [-40, 34, 12], [-66, 30, 8], [-66, 12, 6]]);
  k.add('poly', G.extrudeZ(pro, 30, { bevel: 6, curve: 8 }));
  k.add('polySoft', G.extrudeZ([[-50, 14, 4], [-10, 10, 6], [-30, 26, 8], [-58, 26, 6]], 1.2, { bevel: 0.4, z: 14.6 }));
  k.add('polySoft', G.extrudeZ([[-50, 14, 4], [-10, 10, 6], [-30, 26, 8], [-58, 26, 6]], 1.2, { bevel: 0.4, z: -14.6 }));
  k.add('steel', crossBolt(-20, -2.5, 15));
  k.add('steel', crossBolt(14, -2.5, 15));
  k.add('poly', clampBody(-64, 34, 3, { w: 28, jaw: -5.5 }));
  return { root: k.build('afg2') };
}

function handstop(ctx) {
  const k = ctx.kit();
  k.add('poly', clampBody(-14, 18, 3, { w: 26 }));
  k.add('poly', G.extrudeZ([[-14, 0, 1], [18, 0, 1], [18, 6, 3], [6, 21, 5], [-2, 21, 4], [-14, 6, 3]], 24, { bevel: 3 }));
  k.add('steel', crossBolt(0));
  return { root: k.build('handstop') };
}

/* ------------------------------------------------------------ сошки */

function harris(ctx) {
  const k = ctx.kit();
  k.add('alu', clampBody(-18, 18, 6));
  k.add('steel', G.T(ctx.C.knob(7, 6, 18), { r: [0, -90, 0], p: [0, -2.5, 13] }));
  // корпус с пружинами и поворотной осью
  k.add('steel', G.extrudeZ([[-26, 5, 2], [26, 5, 2], [26, 18, 4], [-26, 18, 4]], 30, { bevel: 2 }));
  k.add('steel', G.cylY(8, 5, 12, { seg: 24 }));
  for (const s of [-1, 1]) {
    k.add('spring', G.T(G.spring(3, 0.8, -22, 8, 9), { p: [0, 20, s * 12] }));
    k.add('steel', G.cylZ(5.5, 0, 8, { seg: 18 }), { p: [16, 12, s > 0 ? 14 : -22] });
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const lk = ctx.kit();
    lk.add('steel', G.cylX(6.2, -4, 160, { c: 1, seg: 20 }));
    lk.add('steelWorn', G.cylX(4.8, 160, 214, { c: 0.6, seg: 18 }));
    lk.add('steel', G.cylX(7, 150, 162, { c: 1, seg: 20 }));
    lk.add('rubber', G.latheX([[212, 0], [212, 7], [222, 8], [228, 5], [230, 0]], { seg: 20 }));
    for (let i = 0; i < 5; i++) lk.add('steel', G.T(G.box(3, 2, 4), { p: [168 + i * 9, -4.8, 0] }));
    const leg = G.node('leg', [lk.build()]);
    leg.position.set(16, 12, s * 21);
    legs.push(leg);
  }
  return { root: G.node('harris', [k.build(), ...legs]), bipod: { legs, angle: 90 } };
}

// Magpul MVG: трапециевидная рукоятка с наклоном вперёд, рифление спереди и сзади.
function mvg(ctx) {
  const k = ctx.kit();
  k.add('poly', clampBody(-22, 22, 5, { w: 26 }));
  k.add('steel', G.T(ctx.C.knob(5.5, 4, 14), { r: [0, -90, 0], p: [0, -2.5, 13] }));
  const pro = [[-26, 3, 2], [24, 3, 2], [18, 62, 8], [10, 70, 6], [-10, 70, 6], [-18, 62, 8]];
  k.add('polySoft', G.extrudeZ(pro, 27, { bevel: 7, curve: 8, bevelSeg: 3 }));
  for (let i = 0; i < 9; i++) {
    const y = 12 + i * 5.4, t = (y - 3) / 59;
    k.add('polySoft', G.T(G.box(2.2, 1.6, 20, { bevel: 0.6 }), { p: [24 - 6 * t + 0.6, y, 0], r: [0, 0, -6] }));
    k.add('polySoft', G.T(G.box(2.2, 1.6, 20, { bevel: 0.6 }), { p: [-26 + 8 * t - 0.6, y, 0], r: [0, 0, 7] }));
  }
  return { root: k.build('mvg') };
}

// BCM KAG: низкая наклонная рукоятка-упор с «крючком» спереди.
function kag(ctx) {
  const k = ctx.kit();
  const pro = [[-40, 0, 2], [34, 0, 2], [36, 6, 3], [30, 26, 7], [22, 30, 5], [16, 22, 6], [-30, 12, 12], [-42, 8, 4]];
  k.add('poly', G.extrudeZ(pro, 28, { bevel: 5, curve: 8, bevelSeg: 3 }));
  k.add('poly', clampBody(-34, 30, 4, { w: 26 }));
  for (const x of [-18, 12]) k.add('steel', G.T(G.cylZ(2.6, 13.2, 14.6, { seg: 12 }), { p: [x, 4, 0] }));
  for (let i = 0; i < 6; i++) k.add('poly', G.T(G.box(1.6, 3, 18, { bevel: 0.5 }), { p: [-8 + i * 4.2, 17 - i * 0.9, 0], r: [0, 0, -14] }));
  return { root: k.build('kag') };
}

export const TACTICAL = [
  { id: 'm600', cat: 'light', name: 'SureFire M600 Scout', desc: 'Тактический фонарь 1000 лм', foot: [-13, 13], body: [-78, 72], stats: { weight: 175, ergo: -2 }, power: { light: 20, cells: '2 × CR123A', driver: 'reg' }, build: (c) => scout(c, { name: 'm600', r: 12.7, headR: 15.9, tail: -76, head: 42, lm: 1000, beam: { candela: 20000, hot: 0.07, spill: 0.55, spillK: 0.03, ring: 0.06, color: 0xf2f5ff } }) },
  { id: 'm300', cat: 'light', name: 'SureFire M300 Mini Scout', desc: 'Компактный фонарь 500 лм', foot: [-13, 13], body: [-60, 44], stats: { weight: 120, ergo: -1 }, power: { light: 24, cells: '1 × CR123A', driver: 'reg' }, build: (c) => scout(c, { name: 'm300', r: 11, headR: 12.6, tail: -58, head: 14, lm: 500, beam: { candela: 7000, hot: 0.085, spill: 0.6, spillK: 0.045, ring: 0.05, color: 0xf2f5ff } }) },
  { id: 'peq15', cat: 'laser', name: 'L3 AN/PEQ-15', desc: 'ЛЦУ: видимый + ИК лазер, ИК-осветитель', foot: [-18, 18], body: [-48, 60], stats: { weight: 215, ergo: -3, 'hipSpread%': -18 }, power: { laser: 30, cells: '1 × CR123A' }, build: (c) => boxLaser(c, { name: 'peq15', L0: -48, L1: 56, H: 38, W: 50, mat: 'polyTan', illum: 8, color: 0xff2a1a }) },
  { id: 'ls321', cat: 'laser', name: 'Holosun LS321', desc: 'Компактный ЛЦУ: зелёный видимый + ИК лазер, ИК-осветитель', foot: [-18, 18], body: [-34, 46], stats: { weight: 140, ergo: -2, 'hipSpread%': -15 }, power: { laser: 26, cells: '1 × CR123A' }, build: (c) => boxLaser(c, { name: 'ls321', L0: -34, L1: 44, H: 32, W: 36, mat: 'poly', illum: 6, color: 0x3dff5a }) },

  { id: 'dbal', cat: 'combo', name: 'Steiner DBAL-PL', desc: 'Комбо-блок: фонарь 300 лм + видимый лазер (C / Z)', foot: [-16, 16], body: [-42, 44], stats: { weight: 150, ergo: -2, 'hipSpread%': -12 }, power: { light: 26, laser: 30, cells: '1 × CR123A', driver: 'reg' }, build: dbal },
  { id: 'rvg', cat: 'foregrip', name: 'Magpul RVG', desc: 'Вертикальная рукоятка, контроль отдачи', foot: [-17, 17], body: [-17, 17], stats: { weight: 70, 'recoilV%': -6, 'recoilH%': -10, ergo: 3, adsTime: 6 }, build: (c) => vgrip(c, { name: 'rvg', len: 98, d: 32, ribs: true }) },
  { id: 'bcm_vg', cat: 'foregrip', name: 'BCM Gunfighter Mod 3', desc: 'Короткая рукоятка-упор', foot: [-16, 16], body: [-16, 16], stats: { weight: 45, 'recoilV%': -4, 'recoilH%': -6, ergo: 5 }, build: (c) => vgrip(c, { name: 'bcm', len: 62, d: 31, flat: 0.85 }) },
  { id: 'afg2', cat: 'foregrip', name: 'Magpul AFG-2', desc: 'Наклонная рукоятка, быстрая вскидка', foot: [-64, 34], body: [-66, 34], stats: { weight: 55, 'recoilV%': -3, 'recoilH%': -5, ergo: 6, adsTime: -8 }, build: afg },
  { id: 'handstop', cat: 'foregrip', name: 'Упор для ладони', desc: 'Упор под хват «C-clamp»', foot: [-14, 18], body: [-14, 18], stats: { weight: 25, ergo: 4, 'recoilH%': -3 }, build: handstop },
  { id: 'harris', cat: 'bipod', name: 'Сошки Harris S-BRM', desc: 'Раскладные сошки, клавиша B', foot: [-18, 18], body: [-28, 232], stats: { weight: 420, ergo: -8, adsTime: 25, 'recoilV%': -4 }, build: harris },

  // фонари (добавлены): Streamlight, Modlite, Cloud Defensive, Зенитко
  { id: 'tlr1', cat: 'light', name: 'Streamlight TLR-1 HL', desc: 'Фонарь «пистолетного» типа 1000 лм, клавиши сзади с обеих сторон', foot: [-16, 16], body: [-62, 39], stats: { weight: 125, ergo: -2 }, power: { light: 22, cells: '2 × CR123A', driver: 'reg' }, build: tlr1 },
  { id: 'modlite', cat: 'light', name: 'Modlite PLHv2 18650', desc: 'Дальнобойный фонарь 1500 лм / 60 000 кд, выносной кронштейн', foot: [-13, 13], body: [-91, 54], stats: { weight: 190, ergo: -3 }, power: { light: 21, cells: '1 × 18650', driver: 'step' }, build: modlite },
  { id: 'rein', cat: 'light', name: 'Cloud Defensive REIN 3.0 Micro', desc: 'Компактный фонарь с широким ровным лучом (TIR), 1400 лм', foot: [-16, 16], body: [-41, 38], stats: { weight: 105, ergo: -1 }, power: { light: 25, cells: '1 × 18350', driver: 'step' }, build: rein },
  { id: 'klesch', cat: 'light', name: 'Зенитко «Клещ-2П»', desc: 'Тактический фонарь с ИК-светодиодом, выносная кнопка', foot: [-20, 20], body: [-53, 35], stats: { weight: 160, ergo: -2 }, power: { light: 30, cells: '2 × CR123A', driver: 'reg' }, build: klesch },
  // лазерные блоки (добавлены)
  { id: 'dbal_a3', cat: 'laser', name: 'Steiner DBAL-A3', desc: 'ЛЦУ: зелёный видимый + ИК лазер, ИК-осветитель с фокусировкой', foot: [-18, 18], body: [-44, 66], stats: { weight: 230, ergo: -3, 'hipSpread%': -18 }, power: { laser: 30, cells: '1 × CR123A' }, build: (c) => laserBox(c, { name: 'dbal_a3', L0: -44, L1: 56, H: 36, W: 42, mat: 'polyFdeDark', illum: 8, color: 0x3dff5a }) },
  { id: 'perst4', cat: 'laser', name: 'Зенитко «Перст-4»', desc: 'Компактный ЛЦУ: красный видимый + ИК лазеры', foot: [-18, 18], body: [-36, 40], stats: { weight: 135, ergo: -2, 'hipSpread%': -14 }, power: { laser: 28, cells: '1 × CR123A' }, build: (c) => laserBox(c, { name: 'perst4', L0: -36, L1: 38, H: 30, W: 34, mat: 'alu', illum: 0, color: 0xff2a1a }) },
  { id: 'peq16', cat: 'combo', name: 'Insight AN/PEQ-16A', desc: 'Комбо-блок: белый фонарь 150 лм + красный и ИК лазеры (C / Z)', foot: [-18, 18], body: [-48, 66], stats: { weight: 280, ergo: -3, 'hipSpread%': -14 }, power: { light: 24, laser: 30, cells: '2 × CR123A', driver: 'reg' }, build: (c) => laserBox(c, { name: 'peq16', L0: -48, L1: 56, H: 40, W: 46, mat: 'polyTan', illum: 0, color: 0xff2a1a, light: { candela: 3000, hot: 0.12, spill: 0.5, spillK: 0.08, ring: 0.02, tir: true, color: 0xf6f6ff } }) },
  // рукоятки (добавлены)
  { id: 'mvg', cat: 'foregrip', name: 'Magpul MVG', desc: 'Широкая вертикальная рукоятка с наклоном, контроль отдачи', foot: [-22, 22], body: [-27, 25], stats: { weight: 60, 'recoilV%': -5, 'recoilH%': -9, ergo: 4, adsTime: 4 }, build: mvg },
  { id: 'rk6', cat: 'foregrip', name: 'Зенитко РК-6', desc: 'Прямая рукоятка с выраженным рифлением', foot: [-18, 18], body: [-18, 18], stats: { weight: 85, 'recoilV%': -7, 'recoilH%': -9, ergo: 2, adsTime: 7 }, build: (c) => vgrip(c, { name: 'rk6', len: 108, d: 34, ribs: true, flat: 0.86, cap: true }) },
  { id: 'kag', cat: 'foregrip', name: 'BCM KAG', desc: 'Низкая наклонная рукоятка-упор, быстрая вскидка', foot: [-34, 30], body: [-42, 36], stats: { weight: 40, 'recoilV%': -2, 'recoilH%': -5, ergo: 6, adsTime: -8 }, build: kag },
];
