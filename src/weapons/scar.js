// FN SCAR-H (Mk 17 STD): 7,62×51, ствол 406 мм (16"), короткоходный газовый
// поршень, монолитный алюминиевый верх (FDE) с планкой во всю длину,
// полимерный низ, складной вправо телескопический приклад,
// рукоять заряжания ходит вместе с рамой.
import * as G from '../engine/geo.js';

const RAIL_TOP = 30.5;
const UP_REAR = -192, UP_FRONT = 266, BARREL = 406;

function upper(ctx, k) {
  const M = 'aluFde';
  // сечение в зоне коробки (ширина 38) и окно выброса справа
  const A = [[19, -12, 1], [19, 12, 2], [15, 21, 2], [-15, 21, 2], [-19, 12, 2], [-19, -12, 1]];
  const rB = 13.2, yT = 7, yB = -8;
  const port = [[19, yT], [19, 12], [15, 21], [-15, 21], [-19, 12], [-19, -12], [19, -12], [19, yB]];
  const a0 = Math.atan2(yB, Math.sqrt(rB * rB - yB * yB)), a1 = Math.atan2(yT, Math.sqrt(rB * rB - yT * yT)) - Math.PI * 2;
  for (let i = 0; i <= 28; i++) { const a = a0 + (a1 - a0) * (i / 28); port.push([Math.cos(a) * rB, Math.sin(a) * rB]); }
  k.add(M, G.extrudeX(A, UP_REAR, -74, { bevel: 1 }));
  k.add(M, G.extrudeX(port, -74, 6, { bevel: 0.3 }));
  k.add(M, G.extrudeX(A, 6, 48, { bevel: 0.8 }));
  // передняя часть (цевьё монолита): шире, с каналом ствола
  const B = G.shape([[-22, -30, 4], [22, -30, 4], [22, 13, 2], [17, 21, 2], [-17, 21, 2], [-22, 13, 2]], [G.circle(0, 0, 16.5, 28)]);
  k.add(M, G.extrudeX(B, 44, UP_FRONT, { bevel: 1.4 }));
  // «подбородок» — переход от коробки к цевью
  k.add(M, G.extrudeZ([[22, -11], [48, -11], [48, -30, 2], [36, -28, 8], [24, -16, 4]], 40, { bevel: 1.4 }));
  // продольные выборки цевья (облегчение) и паз рукояти заряжания
  for (const s of [-1, 1]) {
    k.add(M, G.extrudeZ([[60, -24, 3], [UP_FRONT - 12, -24, 3], [UP_FRONT - 12, -16, 3], [60, -16, 3]], 1.2, { bevel: 0.4, z: s * 22.3 }));
    k.add('lensBlack', G.extrudeZ([[-104, 3.5, 2], [100, 3.5, 2], [100, 9, 2], [-104, 9, 2]], 0.8, { bevel: 0.2, z: s * 19.05 }));
  }
  // верхняя планка во всю длину
  const r = G.picatinny(UP_FRONT - UP_REAR - 4, { base: RAIL_TOP - 21 + 0.6 });
  k.add(M, r.geo, { p: [UP_REAR + 2, RAIL_TOP, 0] });
  // номерные насечки на планке: белые метки через 5 пазов
  for (let i = 0; i < r.slots; i += 5) k.add('paintWhite', G.T(G.box(1.2, 0.3, 3.2), { p: [UP_REAR + 2 + r.first + i * G.PICA.PITCH, RAIL_TOP + 0.05, 9.2] }));
  // отражатель гильз за окном
  k.add(M, G.extrudeY(G.shape([[-90, 19], [-74, 19], [-74, 26, 2], [-84, 28, 3]]), -6, 14, { bevel: 1 }));
  // задний торец верха с посадкой узла приклада
  k.add(M, G.extrudeX(G.rrect(0, 4, 34, 30, 4), UP_REAR - 6, UP_REAR + 1, { bevel: 1.2 }));
  // винты: крепление боковых/нижней планок, ось ствола, заглушки
  for (const x of [134, 184, 234]) for (const s of [-1, 1]) k.add('steel', G.T(G.screwHead(2.8, 1.4), { r: [0, s > 0 ? 0 : 180, 0] }), { p: [x, 2, s * 22.1] });
  for (const s of [-1, 1]) k.add('steel', G.T(G.cylZ(4.2, 0, 1.6, { seg: 20 }), { p: [32, -2, s > 0 ? 19 : -20.6] }));
  // боковые и нижняя планки на передней части
  const mounts = [];
  const side = (id, face, rot, pos) => {
    const rr = G.picatinny(142, { base: 6.5 });
    k.add('aluFde', rr.geo, { r: rot, p: pos });
    mounts.push(ctx.railMount(id, [pos[0] + rr.first, pos[1], pos[2]], face, rr.slots, { axis: face }));
  };
  side('rightRail', 'right', [90, 0, 0], [UP_FRONT - 146, 0, 22 + 6.1]);
  side('leftRail', 'left', [-90, 0, 0], [UP_FRONT - 146, 0, -22 - 6.1]);
  side('bottomRail', 'bottom', [180, 0, 0], [UP_FRONT - 146, -30 - 6.1, 0]);
  mounts.push(ctx.railMount('topRail', [UP_REAR + 2 + r.first, RAIL_TOP, 0], 'top', r.slots, { axis: 'top' }));
  return mounts;
}

function lower(ctx, k, nodes) {
  const M = 'polyFde';
  // корпус УСМ
  k.add(M, G.extrudeZ([[-176, -11], [24, -11], [24, -22], [-68, -22], [-72, -40, 3], [-122, -40, 2], [-128, -44, 3], [-160, -44, 4], [-182, -24, 8], [-182, -11]], 34, { bevel: 2.4 }));
  // приёмник магазина с раструбом и текстурными накладками
  const well = G.shape(G.rrect(-30, 0, 90, 36, 5), [G.rrect(-30, 0, 81, 27, 2)]);
  k.add(M, G.extrudeY(well, -60, -12, { bevel: 1.4 }));
  k.add(M, G.extrudeY(G.shape(G.rrect(-28, 0, 97, 41, 8), [G.rrect(-30, 0, 81, 27, 2)]), -68, -58, { bevel: 2 }));
  for (const s of [-1, 1]) {
    k.add('polyFdeDark', G.extrudeZ(G.shape(G.rrect(-30, -40, 60, 24, 5)), 1.4, { bevel: 0.5, z: s * 18 }));
    for (let i = 0; i < 6; i++) k.add('polyFdeDark', G.T(G.box(52, 1.2, 1, { bevel: 0.3 }), { p: [-30, -48 + i * 3.6, s * 18.9] }));
  }
  // спусковая скоба
  const tg = G.shape([[-70, -38], [-72, -52, 4], [-82, -58, 6], [-116, -56, 8], [-126, -44, 4], [-126, -38]],
    [[[-78, -40], [-78, -49, 3], [-85, -52, 4], [-112, -51, 5], [-119, -43, 3], [-119, -40]]]);
  k.add(M, G.extrudeZ(tg, 12, { bevel: 1.6 }));
  // кнопки магазина (с обеих сторон), затворная задержка слева
  for (const s of [-1, 1]) {
    k.add('poly', G.cylZ(5, 0, 2.4, { c: 0.8, seg: 18 }), { p: [-80, -22, s > 0 ? 17 : -19.4] });
    k.add(M, G.extrudeZ([[-90, -14], [-72, -14], [-72, -30, 3], [-90, -30, 3]], 2, { bevel: 0.8, z: s * 17.4 }));
  }
  k.add('poly', G.extrudeZ([[-66, -8, 1], [-50, -8, 1], [-50, -15, 2], [-62, -20, 2], [-66, -18]], 2.6, { bevel: 0.6, z: -18.2 }));
  // оси (стальные) и задняя ось-фиксатор
  for (const [x, y] of [[-95, -28], [-112, -28], [-172, -18]]) k.add('steel', G.pin(2.6, 35.5), { p: [x, y, 0] });
  // спусковой крючок и двусторонний переводчик
  const tk = ctx.kit();
  tk.add('steel', G.extrudeZ([[-3, 4], [3, 4], [3, -6, 2], [0, -16, 4], [-6, -22, 2], [-7.5, -20], [-3, -9, 3]], 6, { bevel: 1 }));
  nodes.trigger = G.node('trigger', [tk.build()], { p: [-90, -34, 0] });
  const sk = ctx.kit();
  sk.add('steel', G.extrudeZ([[0, -4.5, 2], [22, -3, 3], [23, 3, 3], [0, 4.5, 2]], 3, { bevel: 0.8, z: -18.8 }));
  sk.add('steel', G.extrudeZ([[0, -4.5, 2], [18, -3, 3], [19, 3, 3], [0, 4.5, 2]], 3, { bevel: 0.8, z: 18.8 }));
  sk.add('steel', G.cylZ(5.6, -18, 18, { c: 0.6, seg: 20 }));
  nodes.selector = G.node('selector', [sk.build()], { p: [-122, -22, 0] });
  return [nodes.trigger, nodes.selector];
}

function barrel(ctx, k) {
  k.add('steel', G.latheX([[UP_FRONT - 30, 0], [UP_FRONT - 30, 13.6], [UP_FRONT + 2, 13.6], [UP_FRONT + 4, 11.2], [BARREL - 14, 10.4], [BARREL - 13, 7.9], [BARREL, 7.8], [BARREL, 3], [BARREL - 6, 3], [BARREL - 6, 0]], { seg: 32 }));
  // газовый блок с двухпозиционным регулятором и поршневой трубкой
  k.add('steel', G.extrudeX(G.shape([[-15, -13, 5], [15, -13, 5], [15, 32, 5], [-15, 32, 5]], [G.circle(0, 0, 10.6, 24)]), UP_FRONT + 4, UP_FRONT + 36, { bevel: 1.6 }));
  k.add('steel', G.T(G.cylX(8.5, UP_FRONT + 36, UP_FRONT + 44, { c: 1, seg: 24 }), { p: [0, 20, 0] }));
  k.add('steel', G.T(G.cylZ(4.5, -20, -15, { seg: 16 }), { p: [UP_FRONT + 26, 20, 0] }));
  k.add('steel', G.T(G.box(3, 12, 2), { p: [UP_FRONT + 40, 20, -8.8] }));
  k.add('steel', G.T(G.cylZ(2.6, -16, 16, { seg: 14 }), { p: [UP_FRONT + 14, -6, 0] }));
}

function carrier(ctx) {
  const k = ctx.kit();
  k.add('steelPark', G.latheX([[-150, 0], [-150, 12.4], [-6, 12.4], [-5, 9], [-5, 0]], { seg: 28 }));
  k.add('steelWorn', G.latheX([[-8, 0], [-8, 9.2], [4, 9.2], [4.6, 8.4], [4.6, 0]], { seg: 20 }));
  for (let i = 0; i < 7; i++) k.add('steelWorn', G.T(G.box(4, 3, 4), { p: [3, 10, 0], r: [i * 51.4, 0, 0] }));
  k.add('steel', G.extrudeZ([[-20, 7], [2, 7], [2, 10.5], [-20, 10.5]], 3, { bevel: 0.5, z: 8.4 }));
  // ползун рукояти заряжания в пазу коробки (оба борта)
  k.add('steelPark', G.extrudeZ([[-4, 3.5], [96, 3.5], [96, 9], [-4, 9]], 36, { bevel: 0.8 }));
  const node = G.node('carrier', [k.build()]);
  node.add(ctx.mount({ id: 'charger', type: 'charger', p: [74, 6, 0] }));
  return node;
}

function build(ctx) {
  const k = ctx.kit();
  const nodes = {};
  const rails = upper(ctx, k);
  const lowerNodes = lower(ctx, k, nodes);
  barrel(ctx, k);
  nodes.carrier = carrier(ctx);
  const root = G.node('scar', [k.build('receiver'), nodes.carrier, ...lowerNodes, ...rails]);
  root.add(ctx.mount({ id: 'muzzle', type: 'thread', p: [BARREL, 0, 0] }));
  root.add(ctx.mount({ id: 'magwell', type: 'magwell', p: [-30, -66, 0] }));
  root.add(ctx.mount({ id: 'grip', type: 'grip', p: [-126, -42, 0] }));
  root.add(ctx.mount({ id: 'stock', type: 'stock', p: [UP_REAR - 6, 4, 0] }));
  return {
    root, nodes,
    anim: { carrierTravel: 128, selector: { safe: 0, semi: 90, auto: 180 } },
    eject: { p: [-36, 2, 20], dir: [0.3, 0.35, 1] },
    muzzle: [BARREL, 0, 0],
    eyeX: -300,
    focus: { center: [30, -20, 0], size: 1000 },
  };
}

/* ------------------------------------------------------------------ модули */

function scarFront(ctx) {
  const k = ctx.kit(), f = ctx.kit();
  k.add('aluFde', ctx.C.clampBody(-12, 12, 6));
  k.add('steel', ctx.C.crossBolt(0));
  const ear = [[-10, 0, 1], [8, 0, 1], [8, 24, 3], [3, 42, 3], [-3, 42, 3], [-10, 20, 2]];
  f.add('aluFde', G.extrudeZ(ear, 3, { bevel: 0.6, z: 7 }));
  f.add('aluFde', G.extrudeZ(ear, 3, { bevel: 0.6, z: -7 }));
  f.add('aluFde', G.extrudeZ([[-10, 0, 1], [8, 0, 1], [8, 12, 2], [-10, 10, 2]], 17, { bevel: 0.8 }));
  f.add('steel', G.cylY(2, 10, 30.5, { seg: 12, c: 0.3 }));
  f.add('steel', G.extrudeZ([[-1, 30], [1, 30], [0.8, 35.5, 0.3], [-0.8, 35.5, 0.3]], 1.8, { bevel: 0.2 }));
  f.add('tritium', G.T(G.sphere(0.6), { p: [-1, 34.3, 0] }));
  const flip = G.node('flip', [f.build()]);
  flip.position.set(-10, 6, 0);
  flip.children[0].position.set(10, -6, 0);
  return { root: G.node('scar_front', [k.build(), flip]), irons: { front: [0, 35.5, 0] }, flip: { node: flip, angle: 90 } };
}

function scarRear(ctx) {
  const k = ctx.kit(), f = ctx.kit();
  k.add('aluFde', ctx.C.clampBody(-16, 16, 6));
  k.add('steel', ctx.C.crossBolt(0));
  const ear = [[-12, 0, 1], [12, 0, 1], [12, 28, 3], [6, 46, 4], [-6, 46, 4], [-12, 28, 3]];
  f.add('aluFde', G.extrudeZ(ear, 3, { bevel: 0.6, z: 10.5 }));
  f.add('aluFde', G.extrudeZ(ear, 3, { bevel: 0.6, z: -10.5 }));
  f.add('aluFde', G.extrudeZ([[-12, 0, 1], [12, 0, 1], [12, 22, 2], [-12, 22, 2]], 24, { bevel: 0.8 }));
  f.add('steel', G.T(G.tubeX(8.5, 1.4, -2.5, 2.5, { seg: 28 }), { p: [0, 35.5, 0] }));
  f.add('lensBlack', G.T(G.cylX(1.3, -4, 4, { seg: 12 }), { p: [0, 35.5, 0] }));
  f.add('steel', G.T(ctx.C.knob(6, 4, 18), { r: [0, -90, 0], p: [0, 16, 12] }));
  for (let i = 0; i < 4; i++) f.add('paintWhite', G.T(G.box(0.5, 0.2, 1.8), { p: [-6 + i * 4, 22.1, 9] }));
  const flip = G.node('flip', [f.build()]);
  flip.position.set(12, 6, 0);
  flip.children[0].position.set(-12, -6, 0);
  return { root: G.node('scar_rear', [k.build(), flip]), irons: { rear: [0, 35.5, 0], type: 'aperture' }, flip: { node: flip, angle: -90 } };
}

function scarFH(ctx) {
  const k = ctx.kit();
  // пламегаситель SCAR-H: три открытых зубца, лыски под ключ
  k.add('steel', G.latheX([[0, 0], [0, 11], [1, 11.6], [22, 11.6], [23, 11], [23, 5.6], [0, 5.6]], { seg: 32 }));
  for (let i = 0; i < 3; i++) k.add('steel', G.T(G.latheX([[21, 7.4], [21, 11.4], [52, 11.4], [53.5, 10.2], [53.5, 7.4]], { seg: 10, arc: 78, a0: -39 }), { r: [i * 120, 0, 0] }));
  k.add('steel', G.flutesX(11.6, 3, 16, 2, 7, 0.5, { a0: 90 }));
  return { root: k.build('scar_fh'), muzzle: { x: 53.5, kind: 'fh', flash: 0.3 } };
}

function cap(ctx) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, 10], [14, 10], [16, 8.6], [16, 0]], { seg: 28 }));
  k.add('steel', G.flutesX(10, 2, 14, 14, 1.2, 0.5));
  return { root: k.build('cap'), muzzle: { x: 16, kind: 'bare', flash: 1 } };
}

// Складной вправо телескопический приклад SCAR с регулируемой щекой.
function scarStock(ctx, o = {}) {
  const k = ctx.kit(), f = ctx.kit();
  // шарнирный узел на торце верха (шарнир справа)
  k.add('polyFde', G.extrudeX(G.rrect(0, -2, 36, 36, 5), -18, 0, { bevel: 2 }));
  k.add('steel', G.T(G.cylY(4, -20, 16, { seg: 16 }), { p: [-10, 0, 19] }));
  k.add('poly', G.T(G.box(10, 14, 3, { bevel: 1 }), { p: [-8, -6, -19] }));
  const L = o.long ? 310 : 280;
  // направляющие-трубки телескопа и тело приклада «скелет»
  for (const y of [8, -16]) f.add('polyFdeDark', G.T(G.cylX(6, -130, -18, { c: 1, seg: 18 }), { p: [0, y, 0] }));
  const body = G.shape([[-110, -30, 6], [-110, 22, 6], [-L + 18, 24, 4], [-L + 18, -112, 8], [-L + 60, -108, 12]],
    [[[-126, -22, 5], [-L + 34, 12, 4], [-L + 34, -84, 8]].map(([x, y, r]) => [x, y, r])]);
  f.add('polyFde', G.extrudeZ(body, 30, { bevel: 4, curve: 8 }));
  // щека-подъёмник с фиксатором
  f.add('polyFde', G.extrudeZ([[-120, 22, 3], [-L + 24, 22, 3], [-L + 26, 36, 6], [-140, 38, 10]], 34, { bevel: 4 }));
  f.add('poly', G.T(G.cylZ(5, -18, 18, { seg: 16 }), { p: [-150, 26, 0] }));
  // затыльник
  f.add('rubber', G.extrudeZ([[-L + 18, 26, 3], [-L, 25, 5], [-L - 1, -114, 6], [-L + 18, -114, 3]], 40, { bevel: 4 }));
  for (let i = 0; i < 11; i++) f.add('rubber', G.T(G.box(2, 3, 36), { p: [-L - 1, 16 - i * 12, 0] }));
  // антабки QD
  for (const s of [-1, 1]) f.add('steel', G.cylZ(5.5, 0, 3, { seg: 18 }), { p: [-L + 44, -90, s > 0 ? 15 : -18] });
  if (o.prs) {
    // SSR/PRS: регулировочные колёса щеки и затыльника, моноопора
    f.add('alu', G.T(ctx.C.knob(10, 8, 24), { r: [0, -90, 0], p: [-L + 60, 30, 16] }));
    f.add('alu', G.T(ctx.C.knob(10, 8, 24), { r: [0, 0, 90], p: [-L + 8, -40, 0] }).translate(0, 0, 0));
    f.add('alu', G.T(G.cylY(7, -150, -108, { seg: 18 }), { p: [-L + 40, 0, 0] }));
    f.add('rubber', G.T(G.cylY(10, -158, -150, { seg: 20 }), { p: [-L + 40, 0, 0] }));
  }
  const fold = G.node('fold', [f.build()]);
  const hinge = G.node('hinge', [fold]);
  hinge.position.set(-10, 0, 19);
  fold.position.set(10, 0, -19);
  return { root: G.node('scar_stock', [k.build(), hinge]), fold: { node: hinge, axis: 'y', angle: 172 }, cheek: { x: -160, y: 36 } };
}

function scarGrip(ctx) {
  const k = ctx.kit();
  const a = 20 * Math.PI / 180, sh = (y) => Math.tan(a) * y;
  const pts = [[2, 0, 0], [0, -16, 3], [5, -24, 3], [0, -34, 3], [-2, -60, 3], [-1, -100, 3], [-38, -102, 4], [-38, -70, 4], [-40, -30, 4], [-44, 0, 4], [-34, 6, 0]].map(([x, y, r]) => [x + sh(y), y, r]);
  k.add('polyFde', G.extrudeZ(pts, 30, { bevel: 6, curve: 8 }));
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) k.add('polyFdeDark', G.T(G.box(26, 1.3, 1, { bevel: 0.3 }), { p: [sh(-22 - i * 9) - 18, -22 - i * 9, s * 14.7], r: [0, 0, 20] }));
  return { root: k.build('scar_grip') };
}

// Магазин SR-25: почти прямой, 7,62×51.
function sr25(ctx, o) {
  const k = ctx.kit(), rk = ctx.kit();
  const len = o.len, D = 80, W = 26, curve = o.curve ?? 8;
  const off = (y) => (y > -30 ? 0 : curve * Math.pow((-30 - y) / (len - 30), 1.5));
  const pts = [];
  const n = 12, top = 52;
  for (let i = 0; i <= n; i++) { const y = top - (i / n) * (top + len); pts.push([-D / 2 + off(y), y, 0]); }
  for (let i = n; i >= 0; i--) { const y = top - (i / n) * (top + len); pts.push([D / 2 + off(y), y, 0]); }
  k.add(o.mat, G.extrudeZ(pts, W, { bevel: o.bevel ?? 1.2 }));
  if (o.ribs) for (const s of [-1, 1]) k.add(o.mat, G.T(G.box(D - 18, len - 30, 1, { bevel: 0.5 }), { p: [off(-len / 2), -len / 2 - 4, s * (W / 2 + 0.2)] }));
  if (o.texture) for (let i = 0; i < 6; i++) for (const s of [-1, 1]) k.add(o.mat, G.T(G.box(D - 14, 1.6, 1), { p: [off(-30 - i * 6), -30 - i * 6, s * (W / 2 + 0.2)] }));
  k.add(o.plate || o.mat, G.T(G.box(D + 8, 7, W + 4, { bevel: 2 }), { p: [off(-len) + 3, -len - 2, 0] }));
  k.add('polyGrey', G.box(D - 10, 3, W - 5), { p: [-2, top - 4, 0] });
  ctx.C.cartridge(rk, '762x51', { p: [-36, top - 0.5, -3.2] });
  ctx.C.cartridge(rk, '762x51', { p: [-36, top - 8, 3.2] });
  const rounds = rk.build('rounds');
  return { root: G.node('mag', [k.build(), rounds]), mag: { cap: o.cap, rounds } };
}

function drum50(ctx) {
  const base = sr25(ctx, { len: 60, mat: 'poly', cap: 50, curve: 0 });
  const k = ctx.kit();
  k.add('poly', G.T(G.cylZ(62, -28, 28, { c: 5, seg: 48 }), { p: [6, -110, 0] }));
  k.add('steel', G.T(ctx.C.knob(12, 7, 18), { r: [0, -90, 0], p: [6, -110, 28] }));
  k.add('glassDark', G.T(G.cylZ(14, -29.2, -28, { seg: 24 }), { p: [6, -110, 0] }));
  return { root: G.node('drum', [base.root, k.build()]), mag: { cap: 50, rounds: base.mag.rounds } };
}

// Рукоять заряжания: слева / справа / увеличенная. Начало — ползун рамы.
function charger(ctx, side, big) {
  const k = ctx.kit();
  const s = side;
  k.add('steel', G.extrudeZ([[-10, -3], [10, -3], [10, 3], [-10, 3]], 4, { bevel: 0.8, z: s * 20 }));
  const arm = big ? [[-6, -4, 2], [8, -4, 2], [18, -2, 3], [22, 4, 4], [10, 6, 3], [-6, 4, 2]] : [[-6, -3.5, 2], [6, -3.5, 2], [12, -1, 2], [12, 4, 3], [-6, 3.5, 2]];
  const g = G.extrudeY(G.shape(arm.map(([x, y, r]) => [x, y, r])), -3, 3, { bevel: 0.8 });
  // рычаг отходит от борта под углом вперёд
  k.add('poly', G.T(G.extrudeZ([[-5, -3.5, 2], [5, -3.5, 2], [7, 3.5, 2], [-5, 3.5, 2]], big ? 34 : 24, { bevel: 1.2 }), { p: [0, 0, s * (22 + (big ? 17 : 12))] }));
  k.add('poly', G.T(G.latheX([[0, 0], [0, 6], [2, 7.5], [9, 7.5], [11, 5], [11, 0]], { seg: 18 }), { r: [0, s > 0 ? -90 : 90, 0], p: [0, 0, s * (big ? 52 : 44)] }));
  return { root: k.build('charger') };
}

const PARTS = [
  { id: 'scar_fh', cat: 'muzzle', name: 'Пламегаситель SCAR-H', desc: 'Штатный трёхщелевой, под быстросъёмный глушитель', fit: { thread: ['5/8x24'] }, stats: { weight: 80, length: 40, flash: -45 }, build: scarFH },
  { id: 'scar_cap', cat: 'muzzle', name: 'Колпачок резьбы', desc: 'Голый ствол: громко, яркая вспышка', fit: { thread: ['5/8x24'] }, stats: { weight: 15, loud: 2, flash: 25, 'recoilV%': 6 }, build: cap },
  { id: 'scar_rear', cat: 'rearsight', name: 'Целик SCAR (складной)', desc: 'Диоптр с барабаном 200–600 м', foot: [-16, 16], body: [-16, 16], stats: { weight: 70 }, build: scarRear },
  { id: 'scar_front', cat: 'frontsight', name: 'Мушка SCAR (складная)', desc: 'Мушка с тритиевой вставкой', foot: [-12, 12], body: [-12, 12], stats: { weight: 50 }, build: scarFront },
  { id: 'scar_stock', cat: 'stock', name: 'SCAR, складной телескоп', desc: 'Складывается вправо (K), щека регулируется', fit: { iface: ['scar'] }, stats: { weight: 520 }, build: (c) => scarStock(c) },
  { id: 'scar_prs', cat: 'stock', name: 'FN SSR (Mk 20)', desc: 'Снайперский: регулировка щеки и затыльника, моноопора', fit: { iface: ['scar'] }, stats: { weight: 760, ergo: -3, 'recoilV%': -8, moa: -0.2, adsTime: 15 }, build: (c) => scarStock(c, { prs: true, long: true }) },
  { id: 'scar_grip', cat: 'pgrip', name: 'FN SCAR A2', desc: 'Штатная рукоять, текстура по бокам', fit: { iface: ['ar'] }, stats: { weight: 75 }, build: scarGrip },
  { id: 'fn20', cat: 'mag', name: 'FN SCAR-H 20, сталь', desc: 'Штатный стальной магазин, 20 патронов', fit: { iface: ['sr25'] }, stats: { weight: 290, mag: 20 }, build: (c) => sr25(c, { len: 118, mat: 'steelPark', cap: 20, ribs: true }) },
  { id: 'fn20fde', cat: 'mag', name: 'FN SCAR-H 20, FDE', desc: 'Стальной магазин в цвет оружия', fit: { iface: ['sr25'] }, stats: { weight: 290, mag: 20 }, build: (c) => sr25(c, { len: 118, mat: 'aluFde', cap: 20, ribs: true }) },
  { id: 'pmag20', cat: 'mag', name: 'Magpul PMAG 20 LR/SR', desc: 'Полимер, 20 патронов', fit: { iface: ['sr25'] }, stats: { weight: 200, mag: 20, ergo: 1 }, build: (c) => sr25(c, { len: 118, mat: 'poly', cap: 20, texture: true, bevel: 1.8 }) },
  { id: 'pmag25', cat: 'mag', name: 'Magpul PMAG 25 LR/SR', desc: 'Удлинённый, 25 патронов', fit: { iface: ['sr25'] }, stats: { weight: 250, mag: 25, ergo: -2, adsTime: 8 }, build: (c) => sr25(c, { len: 150, curve: 14, mat: 'poly', cap: 25, texture: true, bevel: 1.8 }) },
  { id: 'drum50', cat: 'mag', name: 'Барабан X-Products 50', desc: 'Барабанный, 50 патронов', fit: { iface: ['sr25'] }, stats: { weight: 1900, mag: 50, ergo: -14, adsTime: 40 }, build: drum50 },
  { id: 'ch_left', cat: 'charger', name: 'Рукоять заряжания слева', desc: 'Штатная, ходит вместе с рамой', stats: { weight: 25 }, build: (c) => charger(c, -1, false) },
  { id: 'ch_right', cat: 'charger', name: 'Рукоять заряжания справа', desc: 'Переставлена на правый борт', stats: { weight: 25 }, build: (c) => charger(c, 1, false) },
  { id: 'ch_big', cat: 'charger', name: 'Увеличенная рукоять (слева)', desc: 'Удобна в перчатках', stats: { weight: 35, ergo: 2 }, build: (c) => charger(c, -1, true) },
];

export default {
  id: 'scar',
  title: 'FN SCAR-H Mk 17',
  short: 'SCAR-H',
  caliber: '7,62×51 NATO',
  cal: '762x51',
  thread: '5/8x24',
  specs: [['Ствол', '406 мм (16")'], ['Длина', '997 / 750 мм'], ['Темп', '600 выстр/мин'], ['Масса', '3,58 кг']],
  base: { weight: 2380, length: 960, ergo: 46, recoilV: 120, recoilH: 105, moa: 1.1, velocity: 790, range: 600, loud: 164, flash: 80, adsTime: 320, rpm: 600, mag: 20 },
  audio: { cal: '762x51', mech: 0.85 },
  modes: ['safe', 'semi', 'auto'],
  build,
  slots: [
    { id: 'muzzle', label: 'Дульное устройство', group: 'Ствол', accepts: ['muzzle'], mount: 'muzzle' },
    { id: 'rearsight', label: 'Целик', group: 'Оптика', accepts: ['rearsight'], rails: ['topRail'], prefer: 'rear' },
    { id: 'frontsight', label: 'Мушка', group: 'Оптика', accepts: ['frontsight'], rails: ['topRail'], prefer: 'front' },
    { id: 'optic', label: 'Прицел', group: 'Оптика', accepts: ['optic'], rails: ['topRail'], prefer: { x: -70 } },
    { id: 'magnifier', label: 'Увеличитель', group: 'Оптика', accepts: ['magnifier'], rails: ['topRail'], prefer: { x: -130 }, behind: 'optic' },
    { id: 'under', label: 'Под стволом', group: 'Тактика', accepts: ['foregrip', 'bipod'], rails: ['bottomRail'], prefer: 'front' },
    { id: 'tacRight', label: 'Правая планка', group: 'Тактика', accepts: ['light', 'laser'], rails: ['rightRail'], prefer: 'front' },
    { id: 'tacLeft', label: 'Левая планка', group: 'Тактика', accepts: ['light', 'laser'], rails: ['leftRail'], prefer: 'front' },
    { id: 'tacTop', label: 'Верх цевья', group: 'Тактика', accepts: ['laser'], rails: ['topRail'], prefer: { x: 200 } },
    { id: 'mag', label: 'Магазин', group: 'Ствольная коробка', accepts: ['mag'], mount: 'magwell', iface: 'sr25' },
    { id: 'pgrip', label: 'Пистолетная рукоять', group: 'Ствольная коробка', accepts: ['pgrip'], mount: 'grip', iface: 'ar', required: true },
    { id: 'stock', label: 'Приклад', group: 'Ствольная коробка', accepts: ['stock'], mount: 'stock', iface: 'scar' },
    { id: 'charger', label: 'Рукоять заряжания', group: 'Ствольная коробка', accepts: ['charger'], mount: 'charger', required: true },
  ],
  parts: PARTS,
  defaults: {
    muzzle: 'scar_fh', rearsight: 'scar_rear', frontsight: 'scar_front', optic: null, magnifier: null,
    under: null, tacRight: null, tacLeft: null, tacTop: null, mag: 'fn20', pgrip: 'scar_grip', stock: 'scar_stock', charger: 'ch_left',
  },
};
