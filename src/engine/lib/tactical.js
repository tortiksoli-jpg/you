// Фонари, ЛЦУ, рукоятки, сошки. Начало — верх планки, +Y — от планки наружу
// (на нижней планке это «вниз» в мире, на боковых — в сторону).
import * as G from '../geo.js';
import { clampBody, crossBolt } from './common.js';
import { lens } from './optics.js';

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
  // интегральное крепление с винтом
  k.add('alu', clampBody(-13, 13, 4.8, { w: 24 }));
  k.add('alu', G.extrudeX([[-7, 3], [7, 3], [7, cy - r + 3], [-7, cy - r + 3]], -12, 12, { bevel: 1 }));
  k.add('steel', G.T(ctx.C.knob(6.2, 5, 16), { r: [0, -90, 0], p: [0, -2.5, 12.5] }));
  k.add('steel', G.cylZ(2.4, -14, 12.5, { seg: 12 }), { p: [0, -2.5, 0] });
  const root = G.node(o.name, [k.build()]);
  const le = lens(ctx, G.cylX(H - 3.3, L1 + 28.6, L1 + 29.4, { seg: 32 }).translate(0, cy, 0), 'lampLens');
  le.renderOrder = 0;
  le.material.transparent = false;
  root.add(le);
  return { root, light: { p: [L1 + 30, cy, 0], lens: le, lumens: o.lm } };
}

/* ---------------------------------------------------------------- ЛЦУ */

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
  return { root, laser: { p: [vis[0] + 2, vis[1], vis[2]], lens: ll } };
}

/* -------------------------------------------------------- рукоятки */

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

export const TACTICAL = [
  { id: 'm600', cat: 'light', name: 'SureFire M600 Scout', desc: 'Тактический фонарь 1000 лм', foot: [-13, 13], body: [-78, 72], stats: { weight: 175, ergo: -2 }, build: (c) => scout(c, { name: 'm600', r: 12.7, headR: 15.9, tail: -76, head: 42, lm: 1000 }) },
  { id: 'm300', cat: 'light', name: 'SureFire M300 Mini Scout', desc: 'Компактный фонарь 500 лм', foot: [-13, 13], body: [-60, 44], stats: { weight: 120, ergo: -1 }, build: (c) => scout(c, { name: 'm300', r: 11, headR: 12.6, tail: -58, head: 14, lm: 500 }) },
  { id: 'peq15', cat: 'laser', name: 'L3 AN/PEQ-15', desc: 'ЛЦУ: видимый + ИК лазер, ИК-осветитель', foot: [-18, 18], body: [-48, 60], stats: { weight: 215, ergo: -3, 'hipSpread%': -18 }, build: (c) => boxLaser(c, { name: 'peq15', L0: -48, L1: 56, H: 38, W: 50, mat: 'polyTan', illum: 8 }) },
  { id: 'ls321', cat: 'laser', name: 'Holosun LS321', desc: 'Компактный ЛЦУ с ИК-осветителем', foot: [-18, 18], body: [-34, 46], stats: { weight: 140, ergo: -2, 'hipSpread%': -15 }, build: (c) => boxLaser(c, { name: 'ls321', L0: -34, L1: 44, H: 32, W: 36, mat: 'poly', illum: 6 }) },

  { id: 'rvg', cat: 'foregrip', name: 'Magpul RVG', desc: 'Вертикальная рукоятка, контроль отдачи', foot: [-17, 17], body: [-17, 17], stats: { weight: 70, 'recoilV%': -6, 'recoilH%': -10, ergo: 3, adsTime: 6 }, build: (c) => vgrip(c, { name: 'rvg', len: 98, d: 32, ribs: true }) },
  { id: 'bcm_vg', cat: 'foregrip', name: 'BCM Gunfighter Mod 3', desc: 'Короткая рукоятка-упор', foot: [-16, 16], body: [-16, 16], stats: { weight: 45, 'recoilV%': -4, 'recoilH%': -6, ergo: 5 }, build: (c) => vgrip(c, { name: 'bcm', len: 62, d: 31, flat: 0.85 }) },
  { id: 'afg2', cat: 'foregrip', name: 'Magpul AFG-2', desc: 'Наклонная рукоятка, быстрая вскидка', foot: [-64, 34], body: [-66, 34], stats: { weight: 55, 'recoilV%': -3, 'recoilH%': -5, ergo: 6, adsTime: -8 }, build: afg },
  { id: 'handstop', cat: 'foregrip', name: 'Упор для ладони', desc: 'Упор под хват «C-clamp»', foot: [-14, 18], body: [-14, 18], stats: { weight: 25, ergo: 4, 'recoilH%': -3 }, build: handstop },
  { id: 'harris', cat: 'bipod', name: 'Сошки Harris S-BRM', desc: 'Раскладные сошки, клавиша B', foot: [-18, 18], body: [-28, 232], stats: { weight: 420, ergo: -8, adsTime: 25, 'recoilV%': -4 }, build: harris },
];
