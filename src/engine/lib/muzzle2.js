// Дульные устройства, часть 2: подробные глушители, ДТК и пламегасители.
// Начало — торец резьбы ствола (упор), +X — вперёд. Размеры — по реальным образцам, мм.
import * as G from '../geo.js';

const DEG = Math.PI / 180;

/* ------------------------------------------------------------ помощники */

// Лыски под ключ: цилиндр r со срезанными боками (±Z) на глубину cut.
function flatsX(r, cut, x0, x1, o = {}) {
  const lim = r - cut, pts = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    pts.push([Math.max(-lim, Math.min(lim, Math.cos(a) * r)), Math.sin(a) * r]);
  }
  const clean = pts.filter((p, i) => { const q = pts[(i + 1) % pts.length]; return Math.abs(p[0] - q[0]) > 1e-3 || Math.abs(p[1] - q[1]) > 1e-3; });
  return G.extrudeX(clean, x0, x1, { bevel: o.bevel ?? 0.6 });
}

// Шестигранник вдоль X (грань на +Z), af — размер под ключ, rc — скругление рёбер.
function hexX(af, x0, x1, o = {}) {
  const R = af / 2 / Math.cos(30 * DEG), pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (30 + i * 60) * DEG;
    pts.push([Math.cos(a) * R, Math.sin(a) * R, o.rc ?? 2]);
  }
  return G.extrudeX(pts, x0, x1, { bevel: o.bevel ?? 1, crease: 25 });
}

// Плоская накладка-паз (стадион) на поверхности радиуса r, повёрнутая вокруг X на a°.
// Тёмный материал читается как прорезь/окно, тёмно-цветной — как фрезерованный карман.
function slotOn(x0, x1, w, r, a, o = {}) {
  const g = G.extrudeY(G.slot(x0, x1, 0, w), r - (o.depth ?? 0.8), r + (o.lift ?? 0.12), { bevel: 0.2 });
  if (o.tilt) { G.T(g, { p: [-(x0 + x1) / 2, -r, 0] }); G.T(g, { r: [0, 0, o.tilt] }); G.T(g, { p: [(x0 + x1) / 2, r, 0] }); }
  return G.T(g, { r: [a, 0, 0] });
}

// Корпус со спиральными канавками: лофт сечений с радиусом r(θ, x), канавки
// плавно сходят на нет у концов, чтобы стыковаться с гладкими токарными частями.
function spiralBody(R, x0, x1, o = {}) {
  const n = o.n ?? 8, depth = o.depth ?? 1.5, twist = (o.twist ?? 120) * DEG, width = o.width ?? 0.45;
  const m = n * 12, rings = [], steps = Math.max(12, Math.round((x1 - x0) / (o.dx ?? 3)));
  const fade = o.fade ?? 10;
  for (let s = 0; s <= steps; s++) {
    const x = x0 + (s / steps) * (x1 - x0);
    const ramp = Math.min(1, (x - x0) / fade, (x1 - x) / fade);
    const ph = twist * (x - x0) / (x1 - x0);
    const pts = [];
    for (let i = 0; i < m; i++) {
      // точки сечения поворачиваются вместе с винтом — кромки канавок идут по рёбрам сетки
      const t0 = (i / m) * Math.PI * 2, t = t0 + ph;
      // профиль канавки: плоское дно, скруглённые кромки
      const c = Math.cos(n * t0);
      const g = c > 1 - width * 2 ? Math.min(1, (c - (1 - width * 2)) / (width * 0.9)) : 0;
      const r = R - depth * g * Math.max(0, ramp);
      pts.push([Math.cos(t) * r, Math.sin(t) * r]);
    }
    rings.push({ x, pts });
  }
  // сечения идут по +X — обход противоположен лофтам прикладов, поэтому flip
  return G.loftX(rings, { caps: false, crease: 50, flip: true });
}

// Кольцо отверстий на торце (выход газов): n тёмных каналов на радиусе rr.
function faceHoles(k, x, rr, n, r, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (o.a0 ?? 0) * DEG;
    k.add('lensBlack', G.T(G.cylX(r, x - (o.depth ?? 1.6), x + 0.05, { seg: 10, c: 0.1 }), { p: [0, Math.cos(a) * rr, Math.sin(a) * rr] }));
  }
}

/* ------------------------------------------------------------ глушители */

// HUXWRX FLOW 556k (прямая резьба 1/2x28): проточный глушитель из инконеля, 3D-печать.
// Ø 39,6 мм, длина 169 мм. Решётка продольных окон по корпусу, кольцевые выходы на торце.
function flow556k(ctx) {
  const k = ctx.kit(), M = 'cast#3b3d40';
  const R = 19.8, L = 169;
  k.add('steel', G.latheX([[0, 0], [0, 7.4], [2, 7.4], [2, 0]], { seg: 20 }));
  // задний торец с шестигранником под ключ
  k.add(M, hexX(25.4, 0, 12, { rc: 1.2, bevel: 0.8 }));
  k.add(M, G.latheX([[11, 0], [11, 14.2], [13, 15.6], [19, R - 1.2], [22, R], [L - 12, R], [L - 8, R - 1.2], [L - 4, R - 3.4], [L, R - 4.4],
    [L, R - 6], [L - 1.4, R - 7], [L - 1.4, 8.2], [L, 7.2], [L, 4.3], [L - 3, 3.8], [L - 3, 0]], { seg: 56, crease: 30 }));
  // насечка захвата у задней части
  k.add(M, G.ringGrooves(R + 0.05, 24, 34, 5, 0.45, { seg: 56 }));
  // решётка: 6 поясов по 12 окон, пояса смещены на полшага
  for (let row = 0; row < 6; row++) {
    const x = 44 + row * 18;
    for (let i = 0; i < 12; i++) k.add('lensBlack', slotOn(x - 7, x + 7, 3.4, R, i * 30 + (row % 2) * 15));
  }
  // перемычки-рёбра между поясами (кольца печатной решётки)
  for (let row = 0; row <= 6; row++) k.add(M, G.tubeX(R + 0.35, R - 0.5, 34.4 + row * 18, 36.2 + row * 18, { seg: 56, c: 0.3 }));
  // выходные «почки» проточной камеры в кольцевой выемке торца
  for (let i = 0; i < 16; i++) k.add('lensBlack', G.T(G.box(1.6, 3.6, 2.4, { bevel: 0.5 }), { p: [L - 1.3, 10.6, 0], r: [i * 22.5, 0, 0] }));
  k.add('lensBlack', G.cylX(4.3, L - 2.9, L + 0.05, { seg: 20 }));
  return { root: k.build('flow556k'), muzzle: { x: L, kind: 'supp', flash: 0.05, voice: { len: 169, loud: -24 } } };
}

// SilencerCo Omega 36M: титановый мультикалиберный глушитель Ø 43,7 мм, длина 181 мм.
// Сзади — крепление ASR с храповым стопорным кольцом, спереди — съёмная коническая крышка.
function omega36m(ctx) {
  const k = ctx.kit(), M = 'cast';
  const R = 21.85, L = 181;
  // переходник ASR (пламегаситель) виден в муфте
  k.add('steel', G.latheX([[0, 0], [0, 10.6], [1, 11.2], [6, 11.2], [6, 0]], { seg: 28 }));
  k.add(M, G.latheX([[4, 0], [4, 15.4], [5.5, 17], [27, 17], [28, 18.4], [30, R - 0.8], [32, R],
    [L - 26.5, R], [L - 26, R - 0.7], [L - 25.5, R],
    [L - 15, R], [L - 3, R - 5.2], [L, R - 6.6], [L, R - 8.4], [L - 1, R - 9.4], [L - 1, 6.6], [L, 5.8], [L, 4.9], [L - 3, 4.4], [L - 3, 0]], { seg: 60, crease: 30 }));
  // стопорное кольцо ASR: зубья храповика и накатка
  k.add('steelPark', G.flutesX(17, 7, 26, 32, 1.7, 1.0));
  k.add('steelPark', G.ringGrooves(18.6, 27.6, 30, 1, 0.3, { seg: 48 }));
  // собачка храповика снизу муфты
  k.add('steel', G.T(G.box(9, 2.6, 5, { bevel: 0.7 }), { p: [16, -18.6, 0] }));
  // лазерная гравировка — светлые тонкие кольца и полоса маркировки
  for (const x of [40, 43.5, L - 40]) k.add('cast#6b6e72', G.tubeX(R + 0.04, R - 0.3, x, x + 0.9, { seg: 60, c: 0.1 }));
  k.add('cast#5d6064', G.T(G.extrudeY(G.slot(58, 96, 0, 4.4), R - 0.6, R + 0.06, { bevel: 0.1 }), { r: [90, 0, 0] }));
  // пазы под ключ на конической крышке
  for (let i = 0; i < 4; i++) k.add('lensBlack', G.T(G.box(3, 3.2, 4, { bevel: 0.4 }), { p: [L - 0.9, R - 7.5, 0], r: [45 + i * 90, 0, 0] }));
  // рельеф фронтальной перегородки в выемке торца
  k.add('steelPark', G.tubeX(9.6, 7.4, L - 1.6, L - 0.6, { seg: 40, c: 0.2 }));
  k.add('lensBlack', G.cylX(4.9, L - 2.9, L + 0.05, { seg: 20 }));
  return { root: k.build('omega36m'), muzzle: { x: L, kind: 'supp', flash: 0.03, voice: { len: 181, loud: -30 } } };
}

// Спиральный глушитель 7,62 (по мотивам OSS/современных «спиральных» банок):
// Ø 44,5 мм, длина 198 мм, 10 винтовых канавок, быстросъёмная муфта с накаткой.
function spiral762(ctx) {
  const k = ctx.kit(), M = 'cast#5a5040';
  const R = 22.25, L = 198, X0 = 42, X1 = L - 30;
  k.add('steel', G.latheX([[0, 0], [0, 11.8], [1, 12.4], [8, 12.4], [8, 0]], { seg: 28 }));
  // муфта QD: стальное кольцо с ромбовидной накаткой + уступ
  k.add('steelPark', G.latheX([[5, 0], [5, 16.4], [6.5, 17.8], [30, 17.8], [31, 16.8], [31, 0]], { seg: 52 }));
  k.add('steelPark', G.flutesX(17.6, 9, 28, 36, 1.4, 0.8));
  k.add('steelPark', G.ringGrooves(18.3, 9, 28, 6, 0.5, { seg: 52 }));
  k.add(M, G.latheX([[30, 0], [30, 18.6], [32, 20], [37, R - 0.4], [39, R], [X0 + 0.5, R], [X0 + 0.5, 0]], { seg: 60, crease: 30 }));
  k.add(M, spiralBody(R, X0, X1, { n: 10, depth: 1.7, twist: 150, width: 0.38 }));
  // передняя крышка: кольцо, конус, торец с каналами
  k.add(M, G.latheX([[X1 - 0.5, 0], [X1 - 0.5, R], [L - 16, R], [L - 15, R - 0.6], [L - 14, R], [L - 5, R - 2.6], [L, R - 4.2],
    [L, R - 6.4], [L - 1.2, R - 7.2], [L - 1.2, 7.2], [L, 6.4], [L, 5.4], [L - 3, 4.9], [L - 3, 0]], { seg: 60, crease: 30 }));
  k.add(M, G.flutesX(R - 0.3, L - 13, L - 6, 12, 2.6, 0.5));
  faceHoles(k, L - 1.2, 11.2, 8, 1.3, { a0: 22.5 });
  k.add('lensBlack', G.cylX(5.4, L - 2.9, L + 0.05, { seg: 20 }));
  return { root: k.build('spiral762'), muzzle: { x: L, kind: 'supp', flash: 0.04, voice: { len: 198, loud: -29 } } };
}

// Зенитко ДТК-4М: тактический глушитель к АК. Цилиндрический стальной корпус Ø 44 мм,
// муфта с рычагом-фиксатором, передний пламегасящий конус с прорезями.
function dtk4m(ctx) {
  const k = ctx.kit(), M = 'steelPark';
  const R = 22, L = 192, XC = L - 38, RC = 14;
  k.add('steel', G.latheX([[0, 0], [0, 11.4], [1, 12.2], [10, 12.2], [10, 0]], { seg: 28 }));
  // муфта крепления: гайка с накаткой и три продольных ребра
  k.add(M, G.latheX([[6, 0], [6, 15.6], [7.5, 17.2], [34, 17.2], [36, 19], [38, R - 0.4], [40, R], [XC, R],
    [L - 6, RC], [L - 6, RC - 0.4], [L, RC], [L, 11], [L - 5.5, 8.4], [L - 5.5, 0]], { seg: 60, crease: 25 }));
  k.add('steel', G.ringGrooves(17.5, 10, 24, 8, 0.45, { seg: 52 }));
  for (const a of [60, 180, 300]) k.add(M, G.T(G.box(8, 2.2, 3, { bevel: 0.6 }), { p: [30, 17.8, 0], r: [a, 0, 0] }));
  // рычаг-фиксатор на правом борту
  k.add('steel', G.T(G.extrudeZ([[0, -2.6, 1], [22, -2.2, 1.2], [25, 0, 1], [22, 2.8, 1.4], [0, 2.8, 1]], 2.4, { bevel: 0.5 }), { p: [12, 0, 18.4] }));
  k.add('steel', G.T(G.cylZ(2.8, 16.6, 19.8, { seg: 14 }), { p: [33, 0, 0] }));
  // сварные швы и бандажи корпуса
  for (const x of [52, 96, 140]) k.add(M, G.tubeX(R + 0.6, R - 0.2, x, x + 3.2, { seg: 60, c: 0.6 }));
  k.add('steel', G.tubeX(R + 0.25, R - 0.2, 44, 45.6, { seg: 60, c: 0.4 }));
  // прорези пламегасящего конуса (по образующей)
  const tilt = -Math.atan((R - RC) / (L - 6 - XC)) / DEG;
  for (let i = 0; i < 8; i++) k.add('lensBlack', slotOn(XC + 6, L - 12, 3.2, (R + RC) / 2 + 0.1, i * 45 + 22.5, { tilt }));
  // зубцы короны на срезе
  for (let i = 0; i < 6; i++) k.add('lensBlack', G.T(G.box(3.6, 3.4, 2.6, { bevel: 0.4 }), { p: [L - 0.8, RC - 1.3, 0], r: [i * 60, 0, 0] }));
  k.add('lensBlack', G.cylX(8.4, L - 5.9, L - 5.3, { seg: 28 }));
  k.add('lensBlack', G.cylX(5, L - 6, L - 5.2, { seg: 20 }));
  return { root: k.build('dtk4m'), muzzle: { x: L, kind: 'supp', flash: 0.04, voice: { len: 192, loud: -27 } } };
}

// Hexagon «Wolverine»: глушитель к АК с шестигранным корпусом (под ключ 42 мм), длина 186 мм.
// Фрезерованные карманы на гранях, круглые муфта и дульная крышка.
function wolverine(ctx) {
  const k = ctx.kit(), M = 'cast#4a4c3c', POCKET = 'cast#23241d';
  const AF = 42, L = 186, H0 = 24, H1 = L - 22;
  k.add('steel', G.latheX([[0, 0], [0, 11.4], [1, 12.2], [10, 12.2], [10, 0]], { seg: 28 }));
  // круглая муфта с накаткой и лысками под ключ
  k.add(M, G.latheX([[5, 0], [5, 16.6], [6.5, 18], [H0 + 1, 18], [H0 + 1, 0]], { seg: 52 }));
  k.add(M, G.ringGrooves(18.2, 7, 14, 4, 0.45, { seg: 52 }));
  k.add(M, flatsX(18.3, 1.6, 15, H0 - 1));
  // шестигранный корпус
  k.add(M, hexX(AF, H0, H1, { rc: 3, bevel: 1.4 }));
  const ap = AF / 2;
  for (let i = 0; i < 6; i++) {
    const a = 90 - i * 60;
    k.add(POCKET, slotOn(H0 + 12, H0 + 62, 9, ap, a, { depth: 0.5, lift: 0.06 }));
    k.add(POCKET, slotOn(H0 + 70, H1 - 12, 9, ap, a, { depth: 0.5, lift: 0.06 }));
  }
  // дульная крышка: круглая, с фаской и каналами на торце
  k.add(M, G.latheX([[H1 - 1, 0], [H1 - 1, 19.6], [H1 + 1, 20.4], [L - 8, 20.4], [L - 2, 17.6], [L, 16],
    [L, 13.6], [L - 1.2, 12.8], [L - 1.2, 6.8], [L, 6], [L, 5.2], [L - 3, 4.7], [L - 3, 0]], { seg: 56, crease: 30 }));
  k.add(M, G.ringGrooves(20.4, H1 + 4, H1 + 12, 3, 0.4, { seg: 56 }));
  faceHoles(k, L - 1.2, 9.8, 6, 1.5, { a0: 30 });
  k.add('lensBlack', G.cylX(5.2, L - 2.9, L + 0.05, { seg: 20 }));
  return { root: k.build('wolverine'), muzzle: { x: L, kind: 'supp', flash: 0.04, voice: { len: 186, loud: -26 } } };
}

/* ------------------------------------------------ пламегасители и ДТК */

// KAC Triple Tap: пламегаситель-компенсатор 5,56 (Ø 22,2 мм, длина 57 мм),
// по три окна на каждом борту, отверстия компенсатора сверху, трёхзубая корона на срезе.
function tripleTap(ctx) {
  const k = ctx.kit();
  const R = 11.1, L = 57;
  k.add('steel', flatsX(R, 1.8, 0, 12.4, { bevel: 0.6 }));
  k.add('steel', G.latheX([[12, 0], [12, R - 0.5], [12.5, R], [L - 1.6, R], [L, R - 1.4], [L, 5.4], [L - 3, 4.8], [L - 3, 0]], { seg: 40, crease: 30 }));
  k.add('steel', G.ringGrooves(R, 13.5, 17.5, 2, 0.35, { seg: 40 }));
  // три боковых окна на каждом борту (скруглённые, растут к срезу)
  for (let i = 0; i < 3; i++) for (const a of [-90, 90]) k.add('lensBlack', slotOn(20 + i * 10.5, 28 + i * 11, 4.4 + i * 0.4, R, a, { depth: 2.4, lift: 0.05 }));
  // отверстия компенсатора сверху
  for (const x of [25, 33, 41]) k.add('lensBlack', G.T(G.cylY(1.7, R - 1.6, R + 0.2, { seg: 12 }), { p: [x, 0, 0] }));
  // зубцы короны: вырезы на 60/180/300°
  for (let i = 0; i < 3; i++) k.add('lensBlack', G.T(G.box(9, 3.4, 3.8, { bevel: 0.6 }), { p: [L - 3.6, R - 1.2, 0], r: [60 + i * 120, 0, 0] }));
  k.add('lensBlack', G.cylX(4.8, L - 2.9, L + 0.05, { seg: 18 }));
  return { root: k.build('tripletap'), muzzle: { x: L, kind: 'fh', flash: 0.35 } };
}

// Зенитко ДТК-3 (стиль): компенсатор к АК с открытой передней «клеткой»:
// четыре бруска, внутренний конусный отражатель и кольцо на срезе. Ø 30 мм, длина 88 мм.
function dtk3(ctx) {
  const k = ctx.kit(), M = 'steelPark';
  const R = 15, L = 88, C0 = 38, C1 = L - 9;
  k.add(M, flatsX(R, 2.2, 0, 14, { bevel: 0.8 }));
  k.add(M, G.latheX([[13.5, 0], [13.5, R - 0.6], [14.5, R], [C0, R], [C0, 0]], { seg: 44 }));
  k.add(M, G.flutesX(R - 0.2, 16, 24, 18, 1.6, 0.6));
  // окна компенсатора сверху
  for (const x of [28, 33.5]) k.add('lensBlack', G.T(G.cylY(2.3, R - 2, R + 0.3, { seg: 14 }), { p: [x, 0, 0] }));
  // вырез под фиксатор снизу
  k.add('lensBlack', G.T(G.box(6, 2, 4, { bevel: 0.4 }), { p: [6, -R + 0.7, 0] }));
  // клетка: бруски на 45/135/225/315°
  for (let i = 0; i < 4; i++) {
    const a = 45 + i * 90;
    k.add(M, G.T(G.extrudeZ([[C0 - 1, 0], [C1 + 1, 0], [C1 + 1, 4.2, 0.8], [C0 - 1, 4.2, 0.8]], 7, { bevel: 0.7 }), { p: [0, R - 4.2, 0], r: [a, 0, 0] }));
  }
  // внутренние отражатели (видны в окнах клетки) и канал пули
  for (const x of [C0 + 9, C0 + 24]) k.add('steel', G.latheX([[x, 0], [x, 5], [x + 5, R - 4.4], [x + 7, R - 4.4], [x + 7, 5.4], [x + 5, 5], [x + 5, 0]], { seg: 32 }));
  k.add('lensBlack', G.tubeX(5, 4.2, C0, C1, { seg: 16, c: 0.1 }));
  // переднее кольцо с фаской и дульным каналом
  k.add(M, G.latheX([[C1, 6.6], [C1, R - 0.8], [C1 + 0.8, R], [L - 1.2, R], [L, R - 1.2], [L, 7.6], [L - 3, 6], [C1, 6], [C1, 6.6]], { seg: 44, crease: 30 }));
  k.add('lensBlack', G.cylX(6.05, C1 - 0.2, L + 0.05, { seg: 20, c: 0.1 }));
  return { root: k.build('dtk3'), muzzle: { x: L, kind: 'comp', flash: 0.45 } };
}

export const MUZZLES2 = [
  { id: 'hux_flow556k', cat: 'muzzle', name: 'HUXWRX FLOW 556k', desc: 'Проточный глушитель из инконеля (3D-печать): меньше обратного газа, решётка окон, прямая резьба', fit: { thread: ['1/2x28'] }, stats: { weight: 414, length: 169, loud: -24, flash: -70, 'recoilV%': -9, ergo: -7, adsTime: 22, velocity: 4 }, build: flow556k },
  { id: 'omega36m', cat: 'muzzle', name: 'SilencerCo Omega 36M', desc: 'Титановый мультикалиберный глушитель: крепление ASR, коническая дульная крышка', fit: { thread: ['1/2x28', '5/8x24'] }, stats: { weight: 400, length: 181, loud: -30, flash: -78, 'recoilV%': -12, ergo: -8, adsTime: 25, velocity: 5 }, build: omega36m },
  { id: 'spiral762', cat: 'muzzle', name: 'Спиральный глушитель 7,62', desc: 'Корпус с винтовыми канавками (как у OSS): легче и лучше охлаждается, быстросъёмная муфта', fit: { thread: ['5/8x24'] }, stats: { weight: 590, length: 198, loud: -29, flash: -76, 'recoilV%': -13, ergo: -10, adsTime: 30, velocity: 6 }, build: spiral762 },
  { id: 'dtk4m', cat: 'muzzle', name: 'Зенитко ДТК-4М', desc: 'Тактический глушитель к АК: стальной корпус, рычаг-фиксатор, пламегасящий конус', fit: { thread: ['m24x1.5', 'm14x1L'] }, stats: { weight: 560, length: 192, loud: -27, flash: -85, 'recoilV%': -14, ergo: -9, adsTime: 28, velocity: 3 }, build: dtk4m },
  { id: 'hex_wolverine', cat: 'muzzle', name: 'Hexagon Wolverine', desc: 'Глушитель к АК с шестигранным корпусом: не катится по столу, фрезерованные карманы', fit: { thread: ['m24x1.5', 'm14x1L'] }, stats: { weight: 520, length: 186, loud: -26, flash: -80, 'recoilV%': -12, ergo: -8, adsTime: 24, velocity: 3 }, build: wolverine },
  { id: 'kac_tripletap', cat: 'muzzle', name: 'KAC Triple Tap', desc: 'Пламегаситель-компенсатор: три окна сверху гасят подброс, трёхзубая корона', fit: { thread: ['1/2x28'] }, stats: { weight: 94, length: 57, flash: -40, 'recoilV%': -7, 'recoilH%': -5, loud: 1 }, build: tripleTap },
  { id: 'dtk3', cat: 'muzzle', name: 'Зенитко ДТК-3', desc: 'Компенсатор к АК с открытой передней клеткой: гасит подброс, громче штатного', fit: { thread: ['m24x1.5', 'm14x1L'] }, stats: { weight: 170, length: 88, flash: -20, 'recoilV%': -18, 'recoilH%': -14, loud: 3 }, build: dtk3 },
];
