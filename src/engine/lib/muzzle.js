// Дульные устройства. Начало — торец резьбы ствола, +X — вперёд.
import * as G from '../geo.js';

// Глушитель SureFire SOCOM-RC2: быстросъёмная муфта с храповиком + корпус 1,5".
function socom(ctx, o) {
  const k = ctx.kit();
  const R = 19.05, L = o.len;
  // переходник-пламегаситель внутри муфты (виден сзади)
  k.add('steel', G.latheX([[0, 0], [0, 10.4], [1, 11], [14, 11], [15, 10], [15, 0]], { seg: 28 }));
  k.add('cast', G.latheX([[10, 0], [10, 14.6], [12, 16.4], [30, 16.4], [31, 18.2], [36, R - 0.2], [L - 6, R], [L - 3, R - 1.2], [L, R - 3], [L, 5.4], [L - 2, 4.6], [L - 2, 0]], { seg: 48, crease: 30 }));
  // храповое кольцо и насечка муфты
  k.add('cast', G.flutesX(16.2, 12, 30, 30, 1.8, 1.0));
  k.add('steel', G.ringGrooves(17.2, 31, 36, 3, 0.4, { seg: 40 }));
  // продольные грани у дульной крышки (как у RC2)
  k.add('cast', G.flutesX(R - 0.3, L - 22, L - 7, 12, 3.2, 0.7));
  k.add('lensBlack', G.cylX(5.2, L - 2.2, L + 0.05, { seg: 20 }));
  return { root: k.build('socom'), muzzle: { x: L, kind: 'supp', flash: 0.04 } };
}

// A2 «птичья клетка»: прорези только сверху и по бокам.
function a2(ctx) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, 10.5], [1, 11], [9, 11], [9.5, 10.6], [43, 10.6], [44, 9.8], [44, 5.6], [10, 5.6], [10, 0]], { seg: 32 }));
  for (const a of [-72, -36, 0, 36, 72]) k.add('lensBlack', G.T(G.box(22, 2.4, 3.6, { bevel: 0.5 }), { p: [28, 9.6, 0], r: [a, 0, 0] }));
  k.add('steel', G.flutesX(10.6, 2, 8, 2, 5, 0.6, { a0: 90 }));
  return { root: k.build('a2'), muzzle: { x: 44, kind: 'fh', flash: 0.4 } };
}

// SureFire WarComp: пламегаситель-компенсатор с тремя зубцами.
function warcomp(ctx, R) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, R - 0.5], [1, R], [26, R], [27, R - 1.5], [30, R - 1.5], [30, R * 0.5], [0, R * 0.5]], { seg: 32 }));
  for (let i = 0; i < 3; i++) {
    const a = 60 + i * 120;
    k.add('steel', G.T(G.extrudeZ([[0, 0], [28, 0], [30, -1, 1], [26, -3.5], [0, -3.5]], 7, { bevel: 0.8 }), { p: [29, R - 0.3, 0], r: [a, 0, 0] }));
  }
  for (const a of [-40, 0, 40]) k.add('lensBlack', G.T(G.box(3.2, 3, 6, { bevel: 0.6 }), { p: [18, R - 1.2, 0], r: [a, 0, 0] }));
  k.add('steel', G.flutesX(R, 2, 10, 2, 6, 0.5, { a0: 90 }));
  return { root: k.build('warcomp'), muzzle: { x: 59, kind: 'fh', flash: 0.3 } };
}

// Линейный компенсатор (KAK Flash Can): газы уходят вперёд, стрелку и соседям тише.
function linear(ctx, r) {
  const k = ctx.kit();
  const R = 14.3, L = 62;
  k.add('steel', G.latheX([[0, 0], [0, r + 1.5], [1, r + 3], [14, r + 3], [15, R - 0.6], [16, R], [L - 1.5, R], [L, R - 1.4], [L, 10.2], [L - 3, 9.6], [L - 3, 0]], { seg: 40 }));
  k.add('steel', G.flutesX(r + 3, 3, 12, 2, 8, 0.8, { a0: 90 }));
  k.add('steel', G.ringGrooves(R, 18, 24, 2, 0.4, { seg: 40 }));
  k.add('lensBlack', G.cylX(9.7, L - 3.2, L + 0.05, { seg: 28 }));
  return { root: k.build('linear'), muzzle: { x: L, kind: 'linear', flash: 0.15 } };
}

// Precision Armament M4-72: дульный тормоз с крупными боковыми окнами.
function brake(ctx, R) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, R - 0.4], [0.8, R], [56, R], [57, R - 1], [57, 4.5], [55, 4.5], [55, 0]], { seg: 32 }));
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) k.add('lensBlack', G.T(G.box(9 - i, 11, 4, { bevel: 1.2 }), { p: [18 + i * 13, 1, s * (R - 1.4)] }));
  for (let i = 0; i < 3; i++) k.add('lensBlack', G.T(G.cylY(1.6, 0, 3, { seg: 10 }), { p: [20 + i * 12, R - 2.4, 0] }));
  k.add('steel', G.flutesX(R, 2, 10, 2, 6, 0.5, { a0: 90 }));
  return { root: k.build('brake'), muzzle: { x: 57, kind: 'brake', flash: 0.7 } };
}

// B&T Rotex-V для HK416: крепление на штатный пламегаситель HK, стопорное кольцо
// с насечкой, корпус Ø40 мм, торцевая крышка с фаской.
function rotexV(ctx) {
  const k = ctx.kit();
  const R = 20, L = 158;
  k.add('steel', G.latheX([[0, 0], [0, 10.4], [1, 11], [16, 11], [17, 10], [17, 0]], { seg: 28 }));
  // муфта и стопорное кольцо
  k.add('steelPark', G.latheX([[8, 0], [8, 15.2], [10, 17], [34, 17], [35, 18.6], [38, R - 0.3], [L - 10, R], [L - 5, R - 1], [L - 1.5, R - 3.6], [L, R - 5], [L, 5.2], [L - 3, 4.6], [L - 3, 0]], { seg: 52, crease: 30 }));
  k.add('steelPark', G.flutesX(17.3, 12, 32, 36, 1.6, 0.9));
  k.add('steel', G.ringGrooves(R, 42, 46, 2, 0.35, { seg: 48 }));
  k.add('steel', G.ringGrooves(R, L - 18, L - 14, 2, 0.35, { seg: 48 }));
  // стопор-защёлка кольца снизу
  k.add('steel', G.T(G.box(10, 3, 6, { bevel: 0.8 }), { p: [22, -17.8, 0] }));
  k.add('lensBlack', G.cylX(5, L - 3.2, L + 0.05, { seg: 20 }));
  return { root: k.build('rotex'), muzzle: { x: L, kind: 'supp', flash: 0.03 } };
}

// Knight's Armament NT4 QDSS (M27 IAR на базе HK416): быстросъёмный на ДТК,
// рычаг-защёлка сбоку, скруглённый передний торец с кольцом каналов.
function nt4(ctx) {
  const k = ctx.kit();
  const R = 19.05, L = 168;
  k.add('steel', G.latheX([[0, 0], [0, 10.4], [1, 11], [14, 11], [15, 10], [15, 0]], { seg: 28 }));
  k.add('cast', G.latheX([[6, 0], [6, 14.5], [8, 16.5], [30, 16.5], [34, R - 0.4], [L - 14, R], [L - 6, R - 2], [L - 2, R - 5.5], [L, R - 8], [L, 4.8], [L - 2, 4.4], [L - 2, 0]], { seg: 52, crease: 30 }));
  k.add('cast', G.flutesX(16.7, 10, 28, 24, 2, 1.1));
  // рычаг защёлки на правом борту
  k.add('steel', G.T(G.extrudeZ([[0, -3, 1], [26, -2.4, 1.5], [28, 0, 1], [26, 2.4, 1.5], [0, 3, 1]], 2.6, { bevel: 0.6 }), { p: [8, 0, 17.6] }));
  k.add('steel', G.T(G.cylZ(3, 15.5, 19.4, { seg: 14 }), { p: [10, 0, 0] }));
  // кольцо каналов на торце
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.add('lensBlack', G.T(G.cylX(1.3, L - 4, L + 0.05, { seg: 10 }), { p: [0, Math.cos(a) * 8, Math.sin(a) * 8] }));
  }
  k.add('lensBlack', G.cylX(4.6, L - 2.2, L + 0.05, { seg: 20 }));
  return { root: k.build('nt4'), muzzle: { x: L, kind: 'supp', flash: 0.03 } };
}

export const MUZZLES = [
  { id: 'sf_socom556', cat: 'muzzle', name: 'SureFire SOCOM556-RC2', desc: 'Глушитель 5,56, быстросъёмный', fit: { thread: ['1/2x28'] }, stats: { weight: 620, length: 168, loud: -28, flash: -70, 'recoilV%': -10, ergo: -8, adsTime: 25, velocity: 6 }, build: (c) => socom(c, { len: 168 }) },
  { id: 'bt_rotex_hk', cat: 'muzzle', only: ['m416'], name: 'B&T Rotex-V (HK416)', desc: 'Штатный глушитель к HK416: ставится на пламегаситель HK, стопорное кольцо', fit: { thread: ['1/2x28'] }, stats: { weight: 560, length: 158, loud: -29, flash: -72, 'recoilV%': -11, ergo: -7, adsTime: 22, velocity: 5 }, build: rotexV },
  { id: 'kac_nt4', cat: 'muzzle', only: ['m416'], name: "Knight's Armament NT4 QDSS", desc: 'Глушитель M27 IAR (USMC, база HK416): быстросъёмный, рычаг-защёлка', fit: { thread: ['1/2x28'] }, stats: { weight: 640, length: 168, loud: -30, flash: -75, 'recoilV%': -12, ergo: -8, adsTime: 25, velocity: 6 }, build: nt4 },
  { id: 'sf_socom762', cat: 'muzzle', name: 'SureFire SOCOM762-RC2', desc: 'Глушитель 7,62, быстросъёмный', fit: { thread: ['5/8x24'] }, stats: { weight: 720, length: 188, loud: -27, flash: -70, 'recoilV%': -12, ergo: -10, adsTime: 30, velocity: 6 }, build: (c) => socom(c, { len: 188 }) },
  { id: 'a2_fh', cat: 'muzzle', name: 'Пламегаситель A2', desc: 'Классическая «птичья клетка»', fit: { thread: ['1/2x28'] }, stats: { weight: 50, length: 34, flash: -35, 'recoilV%': -3 }, build: a2 },
  { id: 'warcomp556', cat: 'muzzle', name: 'SureFire WarComp 5,56', desc: 'Пламегаситель-компенсатор', fit: { thread: ['1/2x28'] }, stats: { weight: 90, length: 49, flash: -45, 'recoilV%': -8, 'recoilH%': -6, loud: 1 }, build: (c) => warcomp(c, 11) },
  { id: 'warcomp762', cat: 'muzzle', name: 'SureFire WarComp 7,62', desc: 'Пламегаситель-компенсатор', fit: { thread: ['5/8x24'] }, stats: { weight: 110, length: 49, flash: -45, 'recoilV%': -8, 'recoilH%': -6, loud: 1 }, build: (c) => warcomp(c, 12) },
  { id: 'pa_brake556', cat: 'muzzle', name: 'Precision Armament M4-72', desc: 'Дульный тормоз: меньше отдача, громче', fit: { thread: ['1/2x28'] }, stats: { weight: 85, length: 47, flash: 25, 'recoilV%': -22, 'recoilH%': -18, loud: 5 }, build: (c) => brake(c, 11.2) },
  { id: 'pa_brake762', cat: 'muzzle', name: 'Precision Armament M11', desc: 'Дульный тормоз 7,62', fit: { thread: ['5/8x24'] }, stats: { weight: 120, length: 47, flash: 25, 'recoilV%': -24, 'recoilH%': -18, loud: 5 }, build: (c) => brake(c, 12.5) },
  { id: 'linear556', cat: 'muzzle', name: 'Линейный компенсатор KAK', desc: 'Уводит газы вперёд: тише для стрелка, чуть больше отдача', fit: { thread: ['1/2x28'] }, stats: { weight: 115, length: 62, flash: -30, loud: -3, 'recoilV%': 3 }, build: (c) => linear(c, 6.4) },
  { id: 'linear762', cat: 'muzzle', name: 'Линейный компенсатор KAK 7,62', desc: 'Уводит газы вперёд: тише для стрелка, чуть больше отдача', fit: { thread: ['5/8x24'] }, stats: { weight: 130, length: 62, flash: -30, loud: -3, 'recoilV%': 3 }, build: (c) => linear(c, 7.9) },
  { id: 'linear_ak', cat: 'muzzle', name: 'Линейный компенсатор (АК)', desc: 'Уводит газы вперёд: тише для стрелка, чуть больше отдача', fit: { thread: ['m14x1L', 'm24x1.5'] }, stats: { weight: 125, length: 62, flash: -30, loud: -3, 'recoilV%': 3 }, build: (c) => linear(c, 8.5) },
];
