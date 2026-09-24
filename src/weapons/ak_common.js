// Семейство Калашникова: штампованная ствольная коробка, ствол, газовая
// система, прицельные приспособления и общие для АКМ / АК-74М модули.
// Мм, ось канала Y = 0, зеркало затвора X = 0, +X к дулу, +Z правый борт.
import * as G from '../engine/geo.js';
import { lens } from '../engine/lib/optics.js';

export const AK = {
  FRONT: 24, REAR: -223,           // торцы ствольной коробки
  WALL: 11, BOTTOM: -24,           // верх боковин и дно коробки
  GAS_Y: 23, GAS_R: 9,             // ось газовой трубки
  SIGHT_Y: 44,                     // линия прицеливания (прорезь целика / вершина мушки)
  REAR_X: 30, FRONT_X: 386,        // прорезь целика / мушка
  MUZZLE: 415,
};

/* ---------------------------------------------------------- ствольная коробка */

function receiver(ctx, k, o) {
  const M = o.steel;
  const { FRONT: F, REAR: R, WALL: W, BOTTOM: B } = AK;
  // правая боковина: окно выброса и паз рукояти затворной рамы
  const right = [[F, B, 1], [F, W], [-12, W], [-12, -1, 1], [-88, -1, 1], [-88, 7], [-206, 7], [-206, W], [R, W], [R, -15, 2], [R + 9, B, 3]];
  const left = [[F, B, 1], [F, W], [R, W], [R, -15, 2], [R + 9, B, 3]];
  k.add(M, G.extrudeZ(right, 1.4, { bevel: 0.35, z: 14.3 }));
  k.add(M, G.extrudeZ(left, 1.4, { bevel: 0.35, z: -14.3 }));
  // дно с окном магазина
  const floor = G.shape(G.rrect((F + R) / 2, 0, F - R, 30, 1), [G.rrect(-37, 0, 72, 26, 2)]);
  k.add(M, G.extrudeY(floor, B - 1.4, B, { bevel: 0.3 }));
  // вкладыши: передний и задний, внутренние поверхности (затемнены)
  k.add('steel', G.extrudeX(G.rrect(0, (B + W) / 2 - 2, 26.6, W - B - 4, 1), 8, F, { bevel: 0.6 }));
  k.add('steel', G.extrudeX(G.rrect(0, (B + W) / 2 - 2, 26.6, W - B - 6, 1), R, R + 14, { bevel: 0.6 }));
  k.add('lensBlack', G.extrudeX(G.rrect(0, -8, 26, 8, 0), -205, 6, { bevel: 0 }));
  // верхние отбортовки-направляющие
  for (const s of [-1, 1]) k.add(M, G.extrudeX(G.rrect(s * 13.6, W - 0.6, 3, 1.4, 0.4), R, F, { bevel: 0.2 }));
  // заклёпки передней и задней вставок, оси УСМ, ось переводчика
  const rivets = [[4, -5], [14, -15], [2, -17], [16, -4], [-214, -3], [-214, -14], [-201, -9], [-58, -19], [-150, -18]];
  for (const s of [-1, 1]) for (const [x, y] of rivets) k.add(M, G.T(G.latheX([[0, 0], [0, 2.3], [0.7, 1.9], [1.1, 0]], { seg: 12 }), { r: [0, s > 0 ? -90 : 90, 0], p: [x, y, s * 15] }));
  for (const s of [-1, 1]) for (const [x, y] of [[-118, -7], [-143, -7]]) {
    k.add('steelWorn', G.T(G.cylZ(2.6, 0, 1.2, { seg: 14 }), { p: [x, y, s > 0 ? 15 : -16.2] }));
  }
  // «пастуший посох» — пружина-фиксатор осей УСМ (слева)
  k.add('spring', G.wire([[-118, -7, -16.3], [-128, -9, -16.4], [-143, -7, -16.3], [-160, -10, -16.2], [-170, -6, -16.2], [-168, -1, -16.2]], 0.8, { n: 60, seg: 6 }));
  // выштамповки над магазином (АКМ) — углубления видны по ободку
  if (o.dimples) for (const s of [-1, 1]) k.add(M, G.T(G.tubeX(6.5, 4.8, 0, 0.5, { seg: 24, c: 0.15 }), { r: [0, s > 0 ? -90 : 90, 0], p: [-37, -11, s * 15] }));
  // боковая планка «ласточкин хвост» (слева)
  k.add(M, G.T(G.extrudeX(G.shape([[-5, 0], [5, 0], [7, 3.2], [-7, 3.2]]), -150, -38, { bevel: 0.4 }), { r: [-90, 0, 0], p: [0, -2, -15.5] }));
  for (const x of [-140, -48]) k.add(M, G.T(G.cylZ(2.2, -19.4, -18.3, { seg: 12 }), { p: [x, -2, 0] }));
}

// Крышка ствольной коробки: штатная (рёбра) — отдельный модуль, чтобы менялась.
export function coverStd(ctx, o = {}) {
  const k = ctx.kit();
  const M = o.steel || 'steel';
  const arc = (w, y0, y1, r, n = 14) => {
    const pts = [[w, y0]];
    const cy = y1 - r;
    pts.push([w, cy]);
    for (let i = 1; i < n; i++) { const a = (i / n) * Math.PI; pts.push([Math.cos(a) * w, cy + Math.sin(a) * r]); }
    pts.push([-w, cy], [-w, y0]);
    return pts;
  };
  const outer = arc(16.4, 11.4, 27.5, 12);
  const inner = arc(15.2, 11.4, 26.3, 11).reverse();
  const sec = [...outer, ...inner.map((p) => [p[0], p[1]])];
  k.add(M, G.extrudeX(sec, AK.REAR + 1, AK.FRONT + 4, { bevel: 0.3 }));
  // поперечные рёбра жёсткости
  const ribs = o.ribs || [-196, -170, -144, -118, -92, -66, -40];
  const rib = arc(16.9, 14, 28, 12.5);
  const ribIn = arc(16.3, 14, 27.4, 11.9).reverse();
  for (const x of ribs) k.add(M, G.extrudeX([...rib, ...ribIn], x - 3, x + 3, { bevel: 0.6 }));
  // задний торец и кнопка направляющей возвратной пружины
  k.add(M, G.extrudeX(arc(16.4, 11.4, 27.5, 12), AK.REAR - 1, AK.REAR + 2, { bevel: 0.5 }));
  k.add('steelWorn', G.T(G.cylX(4.6, AK.REAR - 6, AK.REAR - 0.5, { c: 0.8, seg: 18 }), { p: [0, 17, 0] }));
  k.add('steelWorn', G.T(G.box(3, 3, 12), { p: [AK.REAR - 4, 13.5, 0] }));
  return { root: k.build('cover') };
}

function carrier(ctx, o) {
  const k = ctx.kit();
  // рама: видна в окне выброса и в пазу рукояти
  k.add('steelBright', G.extrudeX(G.rrect(0, 12, 22, 15, 3), -150, 6, { bevel: 1 }));
  k.add('steelBright', G.extrudeX(G.rrect(0, 3, 20, 8, 2), -150, -30, { bevel: 0.8 }));
  // затвор с боевыми упорами
  k.add('steelWorn', G.cylX(8.8, -36, 0, { c: 0.8, seg: 24 }));
  k.add('steelWorn', G.T(G.box(10, 4, 5), { p: [-4, 7.5, 0] }));
  k.add('steelWorn', G.T(G.box(10, 4, 5), { p: [-4, -7.5, 0] }));
  k.add('steel', G.extrudeZ([[-24, 2], [-2, 2], [-2, 6], [-24, 6]], 2.2, { bevel: 0.4, z: 8.4 }));
  // рукоять затворной рамы справа: изогнутый рычаг с грибком
  const hx = -88;
  k.add('steelBright', G.extrudeY(G.shape([[hx - 14, 10], [hx + 16, 10], [hx + 6, 20, 3], [hx - 10, 22, 3]]), 4, 10.5, { bevel: 0.8 }));
  k.add('steelBright', G.T(G.cylZ(3.6, 18, 26, { seg: 16 }), { p: [hx - 2, 7.5, 0] }));
  k.add('steelBright', G.T(G.latheX([[0, 0], [0, 5.2], [2, 6.4], [7, 6.4], [9.5, 4.4], [10.5, 0]], { seg: 20 }), { r: [0, -90, 0], p: [hx - 2, 7.5, 24] }));
  return G.node('carrier', [k.build()]);
}

function barrelAndGas(ctx, k, o) {
  const M = o.steel;
  const { MUZZLE } = AK;
  k.add(M, G.latheX([[AK.FRONT - 6, 0], [AK.FRONT - 6, 12.5], [96, 12.5], [98, 11], [220, 10.2], [296, 9.4], [300, 9], [368, 8.4], [404, 8.2], [405, 7], [MUZZLE, 7], [MUZZLE, 3], [MUZZLE - 6, 3], [MUZZLE - 6, 0]], { seg: 32 }));
  // колодка прицела
  k.add(M, G.extrudeZ([[AK.FRONT - 2, 6], [94, 6], [94, 27, 2], [86, 34, 3], [34, 37, 3], [AK.FRONT - 2, 33, 2]], 26, { bevel: 1.4 }));
  k.add(M, G.extrudeX(G.shape(G.circle(0, 0, 15, 24).map((p) => [p[0], p[1], 0])), AK.FRONT - 2, 94, { bevel: 1 }));
  // планка прицела с хомутиком и прорезью
  const leaf = ctx.kit();
  const SY = AK.SIGHT_Y;
  leaf.add(M, G.extrudeZ([[AK.REAR_X, 36.4], [88, 33.6], [88, 36.2], [36, 39.4, 2], [AK.REAR_X, 39.8]], 17, { bevel: 0.5 }));
  // щиток с U-образной прорезью: плечики прорези — линия прицеливания (вершина мушки вровень с ними)
  const notch = [[-8.5, 35.2, 1], [8.5, 35.2, 1], [8.5, SY, 0.8], [1.5, SY, 0.2], [1.2, SY - 2.4, 0.5], [-1.2, SY - 2.4, 0.5], [-1.5, SY, 0.2], [-8.5, SY, 0.8]];
  leaf.add(M, G.extrudeX(notch, AK.REAR_X, AK.REAR_X + 3.4, { bevel: 0.3 }));
  leaf.add('steelWorn', G.extrudeZ([[58, 35.6], [70, 34.9], [70, 41.5, 1], [58, 42.2, 1]], 20, { bevel: 0.8 }));
  leaf.add('steelWorn', G.T(G.cylZ(2.6, 10, 13, { seg: 14 }), { p: [64, 38.6, 0] }));
  for (let i = 0; i < 6; i++) leaf.add('paintWhite', G.T(G.box(0.6, 0.2, 3), { p: [40 + i * 7.5, 39.1 - i * 0.4, 5] }));
  const leafNode = leaf.build('rearLeaf');
  // флажок-замыкатель газовой трубки справа на колодке
  k.add(M, G.extrudeZ([[82, 16, 1], [90, 16, 1], [100, 30, 2], [95, 33, 2]], 3, { bevel: 0.6, z: 14.4 }));
  k.add(M, G.T(G.cylZ(3.2, 13, 16.5, { seg: 16 }), { p: [86, 18, 0] }));
  // газовая трубка
  k.add(M, G.T(G.cylX(AK.GAS_R, 92, 300, { c: 0.8, seg: 24 }), { p: [0, AK.GAS_Y, 0] }));
  // газовая камера: АКМ — отвод 90°, АК-74 — 45°
  const gb = o.gas45
    ? [[292, -9, 2], [322, -9, 2], [326, 2, 2], [313, 32, 4], [292, 32, 3]]
    : [[292, -9, 2], [328, -9, 2], [328, 10, 2], [324, 33, 4], [296, 33, 3], [292, 26]];
  k.add(M, G.extrudeZ(gb, 22, { bevel: 1.6 }));
  k.add(M, G.T(G.cylX(11.5, 290, 300, { c: 1, seg: 24 }), { p: [0, AK.GAS_Y, 0] }));
  // антабка на газовой камере (слева)
  k.add(M, G.wire([[300, 4, -11], [300, 4, -18], [314, 4, -20], [320, 4, -11]], 1.8, { n: 30 }));
  // основание мушки: кольцо, намушник-«уши», мушка, штык-упор
  k.add(M, G.extrudeZ([[364, -11, 2], [404, -11, 2], [404, 10, 2], [398, 18, 3], [370, 18, 3], [364, 10, 2]], 20, { bevel: 1.4 }));
  for (const s of [-1, 1]) k.add(M, G.extrudeZ([[372, 12], [396, 12], [394, 40, 3], [386, AK.SIGHT_Y + 8, 4], [379, AK.SIGHT_Y + 8, 3], [374, 38, 2]], 2.8, { bevel: 0.6, z: s * 7.4 }));
  k.add('steelWorn', G.cylY(1.9, 16, AK.SIGHT_Y - 1.2, { seg: 12 }), { p: [AK.FRONT_X, 0, 0] });
  k.add('steelWorn', G.extrudeZ([[AK.FRONT_X - 1.2, AK.SIGHT_Y - 2], [AK.FRONT_X + 1.2, AK.SIGHT_Y - 2], [AK.FRONT_X + 0.9, AK.SIGHT_Y, 0.3], [AK.FRONT_X - 0.9, AK.SIGHT_Y, 0.3]], 2.2, { bevel: 0.2 }));
  if (o.bayonet) k.add(M, G.extrudeZ([[366, -10], [398, -10], [398, -21, 2], [372, -21, 2]], 11, { bevel: 1 }));
  // шомпол под стволом
  k.add('steelWorn', G.T(G.cylX(3, 214, 402, { c: 0.6, seg: 12 }), { p: [0, -15, 0] }));
  k.add('steelWorn', G.T(G.latheX([[402, 0], [402, 4.2], [408, 4.2], [410, 2.4], [410, 0]], { seg: 14 }), { p: [0, -15, 0] }));
  return leafNode;
}

function triggerGroup(ctx, k, nodes, o) {
  const M = o.steel;
  // спусковая скоба с защёлкой магазина
  const tg = G.shape([[-78, -24], [-152, -24], [-152, -30, 3], [-140, -44, 6], [-94, -46, 6], [-80, -36, 3]],
    [[[-86, -26.5], [-146, -26.5], [-137, -40, 5], [-96, -42, 5], [-86, -33, 3]]]);
  k.add(M, G.extrudeZ(tg, 10, { bevel: 0.8 }));
  k.add(M, G.extrudeZ([[-74, -24], [-80, -24], [-84, -40, 2], [-80, -43, 2], [-76, -38]], 12, { bevel: 0.8 }));
  const t = ctx.kit();
  t.add(M, G.extrudeZ([[-2, 3], [3, 3], [3, -6, 2], [0, -17, 4], [-5, -23, 2], [-7, -21], [-3, -8, 3]], 6, { bevel: 0.9 }));
  nodes.trigger = G.node('trigger', [t.build()], { p: [-112, -18, 0] });
  // переводчик: длинный флажок справа, ось сзади; перекрывает паз рукояти
  const s = ctx.kit();
  s.add(M, G.extrudeZ([[-4, -4, 2], [112, 1, 2], [118, 4, 2], [118, 11, 2], [108, 12, 2], [4, 6, 3], [-4, 4, 2]], 1.6, { bevel: 0.4, z: 16.4 }));
  s.add(M, G.extrudeZ([[108, 4], [118, 4], [120, -4, 2], [110, -4, 2]], 3, { bevel: 0.8, z: 17 }));
  s.add(M, G.cylZ(5.5, 15, 17.5, { seg: 20 }));
  nodes.selector = G.node('selector', [s.build()], { p: [-178, 2, 0] });
  return [nodes.trigger, nodes.selector];
}

// Базовая модель: коробка, ствол, газ, прицел, УСМ. o: {steel, dimples, gas45, bayonet}
export function akBase(ctx, o) {
  const k = ctx.kit();
  const nodes = {};
  receiver(ctx, k, o);
  const leaf = barrelAndGas(ctx, k, o);
  const trg = triggerGroup(ctx, k, nodes, o);
  const body = k.build('receiver');
  nodes.carrier = carrier(ctx, o);
  const root = G.node(o.id, [body, leaf, nodes.carrier, ...trg]);
  const { mount } = ctx;
  root.add(mount({ id: 'hg', type: 'hg', p: [0, 0, 0] }));
  root.add(mount({ id: 'cover', type: 'cover', p: [0, 0, 0] }));
  root.add(mount({ id: 'dovetail', type: 'dovetail', p: [-95, -2, -19], slots: 1, axis: 'side' }));
  root.add(mount({ id: 'muzzle', type: 'thread', p: [AK.MUZZLE, 0, 0] }));
  root.add(mount({ id: 'magwell', type: 'magwell', p: [-4, AK.BOTTOM, 0], rock: [0, 0, 18] }));
  root.add(mount({ id: 'grip', type: 'grip', p: [-150, AK.BOTTOM, 0] }));
  root.add(mount({ id: 'stock', type: 'stock', p: [AK.REAR, 0, 0] }));
  return {
    root, nodes,
    anim: { carrierTravel: 118, selector: { safe: 0, auto: -11, semi: -22 } },
    eject: { p: [-48, 6, 16], dir: [0.35, 0.45, 1] },
    muzzle: [AK.MUZZLE, 0, 0],
    irons: { rear: [AK.REAR_X + 2, AK.SIGHT_Y, 0], front: [AK.FRONT_X, AK.SIGHT_Y, 0] },
    eyeX: -262,
    focus: { center: [20, -30, 0], size: 900 },
  };
}

/* ------------------------------------------------------------------ цевья */

// U-образное сечение нижней накладки: hw — полуширина, yb — низ, yt — верх боковин.
function uSec(hw, yb, yt, t = 3.2, n = 10) {
  const out = [], inn = [];
  const r = Math.min(hw, (yt - yb) * 0.6);
  out.push([-hw, yt]);
  for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; out.push([Math.cos(a) * hw, yb + r + Math.sin(a) * r]); }
  out.push([hw, yt]);
  const hi = hw - t, ri = r - t;
  inn.push([hi, yt]);
  for (let i = n; i >= 0; i--) { const a = Math.PI + (i / n) * Math.PI; inn.push([Math.cos(a) * hi, yb + t + ri + Math.sin(a) * ri]); }
  inn.push([-hi, yt]);
  return [...out, ...inn];
}

// Верхняя накладка на газовую трубку.
function upperSec(r, y0, n = 14) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; pts.push([Math.cos(a) * r, AK.GAS_Y + Math.sin(a) * r]); }
  pts.push([-r, y0], [r, y0]);
  return pts;
}

function lowerStd(ctx, k, mat, o = {}) {
  const x0 = AK.FRONT + 2, x1 = 212;
  // «лопатки» АКМ: расширение у магазина, затем сужение
  const rings = [];
  const prof = o.paddle ? [[x0, 22, -22], [x0 + 20, 23.5, -23], [x0 + 55, 21, -22], [x0 + 80, 18.5, -21], [x1 - 10, 18.5, -20], [x1, 18, -19]]
    : [[x0, 20, -22], [x1 - 10, 19, -21], [x1, 18.5, -20]];
  for (const [x, hw, yb] of prof) rings.push({ x, pts: uSec(hw, yb, 11, 3.4, 10) });
  k.add(mat, G.loftX(rings, { caps: false }));
  k.add(mat, G.extrudeX(rings[0].pts, x0, x0 + 1.2, { bevel: 0.3 }));
  k.add(mat, G.extrudeX(rings[rings.length - 1].pts, x1 - 1.2, x1, { bevel: 0.3 }));
  if (o.ribs) for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.add(mat, G.T(G.box(x1 - x0 - 34, 1.8, 1.4, { bevel: 0.4 }), { p: [(x0 + x1) / 2 + 10, 6 - i * 6.5, s * 19.3] }));
}

function upperStd(ctx, k, mat, o = {}) {
  k.add(mat, G.extrudeX(upperSec(13.2, 12), 100, 288, { bevel: 2 }));
  if (o.ribs) for (let i = 0; i < 5; i++) { const a = (i - 2) * 24 * Math.PI / 180; k.add(mat, G.T(G.box(160, 1.6, 2, { bevel: 0.4 }), { p: [196, AK.GAS_Y + 13.3 * Math.cos(a), 13.3 * Math.sin(a)], r: [-(i - 2) * 24, 0, 0] })); }
  // металлический наконечник
  k.add('steel', G.extrudeX(upperSec(13.8, 11), 284, 292, { bevel: 0.8 }));
}

function retainer(ctx, k) {
  k.add('steel', G.extrudeX(G.shape(uSec(20.2, -22.2, 12, 3, 10).slice(0, 13).concat(uSec(20.2, -22.2, 12, 3, 10).slice(13))), 208, 222, { bevel: 0.8 }));
  k.add('steel', G.T(G.cylZ(2.4, 19, 21.5, { seg: 12 }), { p: [215, 4, 0] }));
  k.add('steel', G.T(G.cylZ(3.6, -12, 12, { seg: 16 }), { p: [215, -15, 0] }));
}

export function hgStd(ctx, o) {
  const k = ctx.kit();
  lowerStd(ctx, k, o.mat, o);
  upperStd(ctx, k, o.mat, o);
  retainer(ctx, k);
  return { root: k.build('hg_std') };
}

// Зенитко Б-10М (низ, три планки) + Б-33 (планка на газовой трубке).
function hgB10(ctx) {
  const k = ctx.kit();
  const x0 = AK.FRONT + 2, x1 = 210;
  const sec = [[-21, 11, 1], [-22, -6, 3], [-15, -22, 5], [15, -22, 5], [22, -6, 3], [21, 11, 1], [18, 11], [18, -4], [12, -18], [-12, -18], [-18, -4], [-18, 11]];
  k.add('alu', G.extrudeX(sec, x0, x1, { bevel: 1 }));
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) k.add('alu', G.T(G.box(20, 5, 2), { p: [x0 + 30 + i * 36, 4, s * 21.5] }));
  retainer(ctx, k);
  const mounts = [];
  const add = (id, face, rot, len, pos, base) => {
    const r = G.picatinny(len, { base });
    k.add('alu', r.geo, { r: rot, p: pos });
    const d = { top: [0, 1, 0], bottom: [0, -1, 0], left: [0, 0, -1], right: [0, 0, 1] }[face];
    mounts.push(ctx.railMount(id, [pos[0] + r.first, pos[1], pos[2]], face, r.slots, { axis: face }));
  };
  add('hgBottom', 'bottom', [180, 0, 0], 120, [x1 - 126, -31, 0], 10);
  add('hgRight', 'right', [90, 0, 0], 70, [x1 - 78, -2, 31], 9.5);
  add('hgLeft', 'left', [-90, 0, 0], 70, [x1 - 78, -2, -31], 9.5);
  // Б-33: хомут на газовой трубке с верхней планкой
  const top = AK.GAS_Y + 19.4;
  k.add('alu', G.extrudeX(G.shape([[-13, 12, 2], [13, 12, 2], [13, top - 9.4, 3], [-13, top - 9.4, 3]], [G.circle(0, AK.GAS_Y, 9.3, 24)]), 108, 250, { bevel: 1.2 }));
  const rr = G.picatinny(140, { base: 9.8 });
  k.add('alu', rr.geo, { p: [109, top, 0] });
  mounts.push(ctx.railMount('gasRail', [109 + rr.first, top, 0], 'top', rr.slots, { axis: 'top' }));
  for (const x of [130, 228]) k.add('steel', G.T(G.cylZ(2.8, 12.5, 14.5, { seg: 6 }), { p: [x, AK.GAS_Y + 4, 0] }));
  return { root: G.node('b10', [k.build(), ...mounts]) };
}

// Magpul Zhukov-U: цельное цевьё M-LOK с секциями планки.
function hgZhukov(ctx, o) {
  const k = ctx.kit();
  const x0 = AK.FRONT + 2, x1 = 250;
  const low = [[-25, 12, 1], [-25, 0, 3], [-21, -18, 4], [-10, -25, 3], [10, -25, 3], [21, -18, 4], [25, 0, 3], [25, 12, 1], [21, 12], [21, 0], [17, -15], [8, -21], [-8, -21], [-17, -15], [-21, 0], [-21, 12]];
  const upp = [[-25, 12, 1], [25, 12, 1], [23, 32, 4], [12, 42, 3], [-12, 42, 3], [-23, 32, 4]];
  const holesSide = G.mlokHoles(x0 + 26, x1 - 10, 4, { h: 7, len: 32 });
  k.add(o.mat, G.extrudeX(low, x0, x1, { bevel: 1.6 }));
  k.add(o.mat, G.extrudeX(G.shape(upp, [G.circle(0, AK.GAS_Y, 10, 24)]), 98, x1, { bevel: 1.6 }));
  // шлицы M-LOK: боковые и нижние (тёмные окна)
  for (const h of holesSide) for (const s of [-1, 1]) k.add('lensBlack', G.extrudeZ(G.shape(h), 1, { bevel: 0.2, z: s * 24.6 }));
  for (const h of G.mlokHoles(x0 + 40, x1 - 10, 0, { h: 7 })) k.add('lensBlack', G.T(G.extrudeZ(G.shape(h), 1, { bevel: 0.2 }), { r: [90, 0, 0], p: [0, -24.6, 0] }));
  for (let i = 0; i < 5; i++) k.add(o.mat, G.T(G.box(22, 1.6, 20), { p: [118 + i * 26, 42, 0] }));
  const mounts = [];
  const sec = (id, face, rot, len, pos) => {
    const r = G.picatinny(len, { base: 4 });
    k.add('alu', r.geo, { r: rot, p: pos });
    mounts.push(ctx.railMount(id, [pos[0] + r.first, pos[1], pos[2]], face, r.slots, { axis: face }));
  };
  sec('hgBottom', 'bottom', [180, 0, 0], 110, [x1 - 126, -29, 0]);
  sec('hgRight', 'right', [90, 0, 0], 60, [x1 - 80, 4, 29]);
  sec('hgLeft', 'left', [-90, 0, 0], 60, [x1 - 80, 4, -29]);
  return { root: G.node('zhukov', [k.build(), ...mounts]) };
}

/* --------------------------------------------------------------- крышки */

function coverTWS(ctx, o) {
  const base = coverStd(ctx, { ...o, ribs: [-60, -30] });
  const k = ctx.kit();
  // усиленная крышка с планкой, шарнир в колодке целика
  const top = 41;
  k.add('alu', G.extrudeX(G.shape([[-15, 20, 2], [15, 20, 2], [15, top - 9.4, 2], [-15, top - 9.4, 2]]), -206, 12, { bevel: 1 }));
  const r = G.picatinny(210, { base: 9.8 });
  k.add('alu', r.geo, { p: [-202, top, 0] });
  k.add('alu', G.extrudeX(G.shape([[-10, 22, 1], [10, 22, 1], [10, 32, 2], [-10, 32, 2]]), 10, 26, { bevel: 0.8 }));
  k.add('steel', G.T(G.cylZ(3, -12, 12, { seg: 16 }), { p: [20, 26, 0] }));
  k.add('steel', G.T(ctx.C.knob(6, 5, 16), { r: [0, 90, 0], p: [-210, 18, -16] }));
  const m = ctx.railMount('coverRail', [-202 + r.first, top, 0], 'top', r.slots, { axis: 'top' });
  return { root: G.node('tws', [base.root, k.build(), m]) };
}

/* ------------------------------------------------------ боковой кронштейн */

function sideMount(ctx) {
  const k = ctx.kit();
  // колодка на «ласточкин хвост» (начало — центр планки на левом борту)
  k.add('alu', G.extrudeX(G.shape([[-3, -9, 1], [4, -9], [4, 9], [-3, 9, 1], [-10, 7, 2], [-10, -7, 2]]), -55, 55, { bevel: 0.8 }));
  k.add('steel', G.T(ctx.C.knob(7, 6, 18), { r: [0, 90, 0], p: [30, 0, -10] }));
  k.add('steel', G.extrudeZ([[20, -4, 1], [44, -3, 2], [44, 3, 2], [20, 4, 1]], 3, { bevel: 0.6, z: -16 }));
  // кронштейн перекидывается через крышку
  const riser = G.shape([[-55, 8, 2], [55, 8, 2], [55, 20, 3], [40, 46, 4], [-40, 46, 4], [-55, 20, 3]], [G.slot(-30, 30, 26, 14)]);
  k.add('alu', G.T(G.extrudeZ(riser, 8, { bevel: 1.2 }), { p: [0, 0, -5] }));
  const top = 58, cz = 19;
  k.add('alu', G.extrudeX(G.shape([[-6, 42, 2], [cz + 11, 42, 2], [cz + 11, top - 9, 2], [-6, top - 9, 2]]), -52, 52, { bevel: 1 }));
  const r = G.picatinny(104, { base: 9.4 });
  k.add('alu', r.geo, { p: [-52, top, cz] });
  const m = ctx.railMount('sideRail', [-52 + r.first, top, cz], 'top', r.slots, { axis: 'top' });
  return { root: G.node('sidemount', [k.build(), m]) };
}

/* ------------------------------------------------ прицелы на «ласточкин хвост» */

function dovetailClamp(k, x0, x1) {
  k.add('steel', G.extrudeX(G.shape([[-3, -9, 1], [4, -9], [4, 9], [-3, 9, 1], [-11, 7, 2], [-11, -7, 2]]), x0, x1, { bevel: 0.8 }));
}

// ПСО-1 4×24: ось смещена влево над крышкой, резиновый наглазник, барабаны.
function pso1(ctx) {
  const k = ctx.kit();
  dovetailClamp(k, -60, 40);
  k.add('steel', G.extrudeZ([[-40, 4, 2], [-10, 4, 2], [-8, 16, 3], [-42, 16, 3]], 10, { bevel: 1.4, z: -6 }));
  k.add('steel', G.T(G.cylZ(3.5, -16, -8, { seg: 16 }), { p: [-26, 10, 0] }));
  const Y = 60, Z = 13;
  const at = (g) => g.translate(0, Y, Z);
  // стойка кронштейна до корпуса
  k.add('steel', G.extrudeX(G.shape([[-12, 6, 2], [4, 6, 2], [Z + 6, Y - 22, 4], [Z - 8, Y - 14, 4], [-12, 18, 2]]), -58, 36, { bevel: 1.5 }));
  k.add('steel', at(G.latheX([[-150, 0], [-150, 17], [-146, 19], [-120, 19], [-114, 16], [-96, 16], [-92, 17.2], [100, 17.2], [104, 18.4], [134, 18.4], [136, 20], [176, 20], [177, 18.8], [177, 0]], { seg: 40 })));
  k.add('lensBlack', at(G.tubeX(18.9, 17.8, 136, 177.2, { seg: 32 })));
  k.add('rubber', at(G.latheX([[-212, 16], [-212, 22.5], [-206, 24], [-190, 23], [-170, 20.5], [-151, 19.5], [-151, 16]], { seg: 36 })));
  k.add('lensBlack', at(G.tubeX(16.2, 14.5, -212, -150, { seg: 32 })));
  // корпус механизма выверки: барабан высоты сверху, поправок слева
  k.add('steel', G.extrudeX(G.shape([[Z - 16, Y + 6, 3], [Z + 16, Y + 6, 3], [Z + 16, Y + 20, 4], [Z - 16, Y + 20, 4]]), -34, 24, { bevel: 1.5 }));
  k.add('steel', G.T(G.cylY(15, Y + 19, Y + 31, { c: 1.4, seg: 36 }), { p: [-5, 0, Z] }));
  k.add('steel', G.T(G.flutesX(14.4, 0, 6, 36, 1.2, 0.8), { r: [0, 0, 90], p: [-5, Y + 24, Z] }));
  for (let i = 0; i < 10; i++) k.add('paintWhite', G.T(G.box(0.8, 3, 0.6), { p: [-5, Y + 27, Z + 15.2], r: [0, i * 36, 0] }));
  k.add('steel', G.T(G.cylZ(13, Z - 30, Z - 17, { c: 1.4, seg: 32 }), { p: [-5, Y, 0] }));
  k.add('steel', G.T(G.flutesX(12.4, 0, 6, 32, 1.2, 0.8), { r: [0, 90, 0], p: [-5, Y, Z - 23] }));
  // осветитель сетки с батарейным отсеком
  k.add('steel', G.T(G.cylX(7, 40, 86, { c: 1, seg: 20 }), { p: [0, Y + 12, Z - 12] }));
  k.add('steel', G.T(ctx.C.knob(7.4, 6, 18), { p: [86, Y + 12, Z - 12] }));
  const root = G.node('pso1', [k.build()]);
  const oc = lens(ctx, at(ctx.C.lensDisc(15, -148)), 'glassBlue');
  const ob = lens(ctx, at(ctx.C.lensDisc(17.4, 134)), 'glassAmber');
  root.add(oc, ob);
  return { root, sight: { y: Y, z: Z, x0: -150, x1: 177, r: 15, mag: 4, reticle: 'pso1', eyeRelief: 68, lens: oc } };
}

// ЭКП-1С-03 «Кобра»: коллиматор с окном и переключателем сеток.
function kobra(ctx) {
  const k = ctx.kit();
  dovetailClamp(k, -50, 40);
  k.add('steel', G.T(ctx.C.knob(7, 6, 18), { r: [0, 90, 0], p: [-30, 0, -11] }));
  const Y = 54, Z = 19;
  k.add('alu', G.extrudeX(G.shape([[-12, 4, 2], [4, 4, 2], [Z + 16, 26, 3], [Z + 16, 34, 3], [-12, 18, 2]]), -48, 38, { bevel: 1.4 }));
  // корпус: основание с электроникой, рамка окна
  k.add('alu', G.extrudeX(G.shape([[Z - 18, 28, 3], [Z + 18, 28, 3], [Z + 18, 38, 3], [Z - 18, 38, 3]]), -50, 40, { bevel: 1.4 }));
  const frame = G.shape([[Z - 19, 36, 2], [Z + 19, 36, 2], [Z + 19, Y + 20, 6], [Z - 19, Y + 20, 6]], [G.rrect(Z, Y + 1, 30, 30, 4)]);
  k.add('alu', G.T(G.extrudeX(frame, -6, 6, { bevel: 1.2 }), { p: [28, 0, 0] }));
  k.add('alu', G.T(G.extrudeX(frame, -3, 3, { bevel: 0.8 }), { p: [-40, 0, 0] }));
  k.add('alu', G.extrudeX(G.shape([[Z - 19, Y + 16, 3], [Z + 19, Y + 16, 3], [Z + 19, Y + 21, 4], [Z - 19, Y + 21, 4]]), -42, 34, { bevel: 1 }));
  // переключатель режимов и батарейный отсек
  k.add('alu', G.T(ctx.C.knob(10, 8, 20), { r: [0, -90, 0], p: [-18, 33, Z + 18] }));
  k.add('alu', G.T(G.cylX(7.5, -50, -36, { c: 1, seg: 20 }), { p: [0, 33, Z] }));
  const root = G.node('kobra', [k.build()]);
  const win = lens(ctx, G.T(G.extrudeX(G.rrect(Z, Y + 1, 30, 30, 4), -0.6, 0.6, { bevel: 0.2 }), { p: [28, 0, 0] }), 'glassAmber');
  root.add(win);
  return { root, sight: { y: Y + 1, z: Z, x0: -42, x1: 28, r: 14, mag: 1, reticle: 'kobra', lens: win } };
}

/* ------------------------------------------------------------- дульные */

function slantComp(ctx) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, 10], [1, 10.6], [24, 10.6], [24, 5.2], [3, 5.2], [3, 0]], { seg: 28 }));
  // косой срез: нижняя левая «губа» длиннее
  k.add('steel', G.latheX([[23.5, 7.2], [23.5, 10.6], [33, 10.6], [34, 9.6], [34, 7.2]], { seg: 16, a0: 110, arc: 140 }));
  k.add('steel', G.flutesX(10.6, 2, 8, 2, 4, 0.5, { a0: 90 }));
  return { root: k.build('slant'), muzzle: { x: 30, kind: 'comp', flash: 0.8 } };
}

function brake74(ctx) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, 11.5], [1, 12.4], [60, 12.4], [62, 11.8], [80, 11.8], [81.5, 10.6], [81.5, 4], [78, 3.6], [78, 0]], { seg: 32 }));
  // передняя камера: широкие окна по бокам, «крылья» спереди
  for (const s of [-1, 1]) {
    k.add('lensBlack', G.T(G.box(15, 12, 3), { p: [70, 0, s * 11] }));
    k.add('steel', G.extrudeZ([[62, -8, 1], [81, -8, 1], [81, 8, 1], [62, 8, 1]], 2.4, { bevel: 0.5, z: s * 12.8 }));
  }
  k.add('lensBlack', G.T(G.cylY(2.4, 9, 13, { seg: 12 }), { p: [48, 0, 0] }));
  k.add('lensBlack', G.T(G.cylY(2.4, 9, 13, { seg: 12 }), { p: [40, 0, 0] }));
  k.add('lensBlack', G.T(G.box(6, 3.4, 16), { p: [58, 11.2, 0] }));
  k.add('steel', G.T(G.cylZ(2.6, -13.4, 13.4, { seg: 12 }), { p: [16, -4, 0] }));
  return { root: k.build('brake74'), muzzle: { x: 82, kind: 'brake', flash: 0.7 } };
}

function dtk1(ctx) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, 13], [1.4, 14.5], [74, 14.5], [76, 13.4], [76, 5], [73, 4.6], [73, 0]], { seg: 36 }));
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) k.add('lensBlack', G.T(G.box(10, 13, 4, { bevel: 2 }), { p: [26 + i * 17, 0, s * 13.3] }));
  for (let i = 0; i < 3; i++) k.add('lensBlack', G.T(G.cylY(2.2, 11, 15, { seg: 12 }), { p: [24 + i * 17, 0, 0] }));
  k.add('steel', G.flutesX(14.5, 3, 12, 6, 3, 0.6));
  return { root: k.build('dtk1'), muzzle: { x: 76, kind: 'brake', flash: 0.6 } };
}

function can(ctx, o) {
  const k = ctx.kit();
  const R = o.r, L = o.len;
  k.add('steel', G.latheX([[0, 0], [0, 10.5], [16, 10.5], [16, 0]], { seg: 24 }));
  k.add(o.mat, G.latheX([[8, 0], [8, R - 4], [12, R], [L - 5, R], [L, R - 4], [L, 5.2], [L - 3, 4.6], [L - 3, 0]], { seg: 44, crease: 30 }));
  if (o.fins) k.add(o.mat, G.flutesX(R - 0.4, 26, L - 18, o.fins, 3.2, 1.4));
  if (o.knurl) k.add(o.mat, G.ringGrooves(R + 0.3, 12, 30, 7, 0.5, { seg: 44 }));
  if (o.rings) for (const x of o.rings) k.add(o.mat, G.tubeX(R + 0.8, R - 0.2, x, x + 4, { seg: 44 }));
  k.add('lensBlack', G.cylX(5.2, L - 2.9, L + 0.05, { seg: 18 }));
  return { root: k.build(o.name), muzzle: { x: L, kind: 'supp', flash: 0.04 } };
}

function threadCap(ctx) {
  const k = ctx.kit();
  k.add('steel', G.latheX([[0, 0], [0, 8.8], [14, 8.8], [16, 7.6], [16, 0]], { seg: 28 }));
  k.add('steel', G.flutesX(8.8, 2, 14, 14, 1.2, 0.5));
  return { root: k.build('cap'), muzzle: { x: 16, kind: 'bare', flash: 1 } };
}

/* ------------------------------------------------------------ магазины */

// Дугообразный магазин АК: начало — передний зацеп у дна коробки.
export function akMag(ctx, o) {
  const k = ctx.kit(), rk = ctx.kit();
  const R = o.R, L = o.len, D0 = o.d0, D1 = o.d1, W = o.w;
  // центр дуги впереди-снизу; верх — горизонтальная площадка на глубине top
  const cx = -D0 / 2 + R, cy = 0;
  const n = 18, back = [], front = [];
  const ang0 = Math.PI; // стартовая точка — слева от центра (сзади)
  for (let i = 0; i <= n; i++) {
    const s = (i / n) * L;
    const a = ang0 + s / R;
    const d = D0 + (D1 - D0) * (i / n);
    const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
    const nx = Math.cos(a), ny = Math.sin(a);
    back.push([px + nx * d / 2 - D0 / 2 * 0, py + ny * d / 2]);
    front.push([px - nx * d / 2, py - ny * d / 2]);
  }
  // сдвиг: передний зацеп в (0,0), тело назад и вниз
  const shiftX = -front[0][0], shiftY = 0;
  const P = [[front[0][0], 12], [back[0][0], 12], ...back.slice(1), ...front.slice().reverse()].map(([x, y]) => [x + shiftX, y + shiftY]);
  k.add(o.mat, G.extrudeZ(P.map((p) => [...p, 0]), W, { bevel: o.bevel ?? 1.2 }));
  const endA = ang0 + L / R;
  const ex = cx + Math.cos(endA) * R + shiftX, ey = cy + Math.sin(endA) * R;
  // выштамповки / рёбра на боковинах
  if (o.ribs) {
    const m = 4;
    for (let j = 1; j < m; j++) {
      const pts = [];
      for (let i = 1; i < n; i++) {
        const s = (i / n) * L, a = ang0 + s / R, d = D0 + (D1 - D0) * (i / n);
        const t = j / m - 0.5;
        pts.push([cx + Math.cos(a) * (R + t * d) + shiftX, Math.sin(a) * (R + t * d), 0]);
      }
      for (const s of [-1, 1]) k.add(o.ribMat || o.mat, G.wire(pts.map((p) => [p[0], p[1], s * (W / 2 + 0.2)]), 1.3, { n: 40, seg: 6 }));
    }
  }
  if (o.cross) for (let i = 2; i < n - 1; i += 3) {
    const s = (i / n) * L, a = ang0 + s / R, d = D0 + (D1 - D0) * (i / n);
    for (const sd of [-1, 1]) k.add(o.mat, G.T(G.box(d - 10, 2.2, 1.4, { bevel: 0.5 }), { p: [cx + Math.cos(a) * R + shiftX, Math.sin(a) * R, sd * (W / 2 + 0.3)], r: [0, 0, a * 57.3] }));
  }
  // затыльник и передний зацеп
  const tx = -Math.sin(endA), ty = Math.cos(endA);
  k.add(o.plate || o.mat, G.T(G.box(D1 + 7, 6, W + 3, { bevel: 1.6 }), { p: [ex + tx * 2, ey + ty * 2, 0], r: [0, 0, endA * 57.3] }));
  k.add(o.mat, G.T(G.box(8, 6, W - 6), { p: [2, 8, 0] }));
  k.add(o.mat, G.T(G.box(6, 5, W - 4), { p: [-D0 + 4, 9, 0] }));
  // верхние патроны в подающих губках
  const cal = o.cal;
  ctx.C.feedLips(k, o.mat, -D0 + 6, -D0 + 42, 12, W / 2, { rise: 5.2, curl: 3.4 });
  ctx.C.cartridge(rk, cal, { p: [-D0 + 8, 13.5, -3.4], r: [0, 0, 3] });
  ctx.C.cartridge(rk, cal, { p: [-D0 + 8, 7, 3.4], r: [0, 0, 3] });
  const rounds = rk.build('rounds');
  return { root: G.node('mag', [k.build(), rounds]), mag: { cap: o.cap, rounds } };
}

function drum(ctx, o) {
  const k = ctx.kit(), rk = ctx.kit();
  const base = akMag(ctx, { ...o, len: 70, cross: false, ribs: false });
  k.add(o.mat, G.T(G.cylZ(66, -26, 26, { c: 5, seg: 48 }), { p: [-10, -120, 0] }));
  k.add(o.mat, G.T(G.cylZ(20, 26, 31, { c: 2, seg: 32 }), { p: [-10, -120, 0] }));
  k.add('steel', G.T(ctx.C.knob(10, 6, 16), { r: [0, -90, 0], p: [-10, -120, 30] }));
  for (let i = 0; i < 12; i++) for (const s of [-1, 1]) k.add(o.mat, G.T(G.box(2.4, 40, 1.6, { bevel: 0.5 }), { p: [-10, -120, s * 26.3] , r: [0, 0, i * 30] }).translate(0, 0, 0));
  return { root: G.node('drum', [base.root, k.build()]), mag: { cap: o.cap, rounds: base.mag.rounds } };
}

/* --------------------------------------------------------------- рукояти */

function akGrip(ctx, o) {
  const k = ctx.kit();
  const a = (o.angle ?? 18) * Math.PI / 180;
  const sh = (y) => Math.tan(a) * y;
  const front = o.front.map(([f, y]) => [sh(y) + f, y]);
  const back = o.back.map(([f, y]) => [sh(y) + f, y]);
  const W = o.w ?? 30;
  // скруглённое тело по контурам; у АК рукоять почти одинаковой ширины по высоте
  k.add(o.mat, G.gripLoft(front, back, { w: W, k: 2.8, taper: 0.22, width: (t) => 0.9 + 0.1 * Math.sin(Math.PI * t) }));
  // вертикальные рифы бакелитовой рукояти АКМ (по боковой плоскости)
  if (o.grooves) for (let i = 0; i < o.grooves; i++) for (const s of [-1, 1]) {
    k.add(o.mat, G.T(G.box(1.6, 58, 1.2, { bevel: 0.5 }), { p: [sh(-52) - 9 - i * 3.3, -52, s * (W / 2 * 0.93 - 0.3)], r: [0, 0, -o.angle] }));
  }
  if (o.texture) for (let i = 0; i < 9; i++) for (const s of [-1, 1]) k.add(o.mat, G.T(G.box(16, 1.2, 1.1, { bevel: 0.3 }), { p: [sh(-20 - i * 8.5) - 20, -20 - i * 8.5, s * (W / 2 * 0.9 - 0.2)], r: [0, 0, o.angle] }));
  if (o.cap) k.add('polySoft', G.T(G.box(34, 5, (o.w ?? 28) - 4, { bevel: 2 }), { p: [sh(-o.h) - 16, -o.h - 1, 0] }));
  k.add('steel', G.T(G.cylY(3, -o.h - 2, -o.h + 1, { seg: 12 }), { p: [sh(-o.h) - 14, 0, 0] }));
  return { root: k.build('pgrip') };
}

/* --------------------------------------------------------------- приклады */

// Лофт приклада: сечения-суперэллипсы вдоль −X от торца коробки.
function stockLoft(prof, k = 3.4) {
  return G.loftX(prof.map(([x, cy, hh, hw]) => ({ x, pts: G.superEllipse(hw, hh, k, 28, cy, 0) })));
}

function stockAKM(ctx) {
  const k = ctx.kit();
  // ламинированный деревянный приклад АКМ: прямой гребень, затыльник с люком
  const prof = [[-2, -6, 18, 14.6], [-30, -12, 22, 16], [-80, -26, 34, 17.6], [-140, -42, 48, 19], [-196, -60, 60, 20.4], [-206, -63, 62, 20.6]];
  k.add('wood', stockLoft(prof));
  k.add('steel', G.extrudeX(G.shape(G.superEllipse(21, 63, 3.4, 28, -63, 0)), -212, -205, { bevel: 1.2 }));
  k.add('steel', G.extrudeX(G.rrect(0, -80, 24, 44, 8), -213, -211.5, { bevel: 0.3 }));
  k.add('steel', G.T(G.cylZ(2.2, -12, 12, { seg: 12 }), { p: [-212, -62, 0] }));
  for (const y of [-10, -114]) k.add('steel', G.T(G.cylX(2.6, -214, -211, { seg: 12 }), { p: [0, y, 0] }));
  // хвостовик коробки и антабка слева
  k.add('steel', G.extrudeZ([[4, 6], [-30, -2], [-30, -8], [4, -2]], 12, { bevel: 0.6 }));
  k.add('steel', G.wire([[-166, -64, -20], [-166, -64, -27], [-184, -64, -27], [-184, -64, -20]], 1.8, { n: 30 }));
  return { root: k.build('akm_wood'), cheek: { x: -60, y: 8 } };
}

function stockAK74M(ctx) {
  const k = ctx.kit();
  const prof = [[-10, -6, 18, 15], [-40, -13, 23, 16.5], [-90, -28, 36, 18], [-150, -44, 49, 19.4], [-205, -62, 60, 20.6], [-214, -64, 61, 20.6]];
  const f = ctx.kit();
  f.add('poly', stockLoft(prof, 3.8));
  // продольная выборка по бокам и затыльник с рёбрами
  for (const s of [-1, 1]) f.add('polySoft', G.T(G.extrudeZ([[-40, -18, 6], [-180, -58, 10], [-180, -96, 10], [-60, -40, 6]], 1, { bevel: 0.3 }), { p: [0, 0, s * 18.6] }));
  f.add('rubber', G.extrudeX(G.shape(G.superEllipse(21.4, 62, 3.8, 28, -64, 0)), -224, -213, { bevel: 2 }));
  for (let i = 0; i < 9; i++) f.add('rubber', G.T(G.box(2, 2.4, 38), { p: [-224, -16 - i * 12, 0] }));
  // узел складывания (шарнир слева)
  f.add('steel', G.extrudeX(G.rrect(0, -4, 30, 26, 3), -14, -1, { bevel: 1 }));
  const fold = G.node('fold', [f.build()]);
  // шарнир с кнопкой на коробке
  k.add('steel', G.extrudeZ([[4, 10], [-4, 10], [-4, -22], [4, -22]], 12, { bevel: 1, z: -20 }));
  k.add('steel', G.T(G.cylY(4, -22, 11, { seg: 16 }), { p: [0, 0, -22] }));
  k.add('steel', G.T(G.cylZ(5.5, 8, 13, { seg: 18 }), { p: [-2, -4, 0] }));
  fold.position.set(0, 0, -22);
  fold.children[0].position.set(0, 0, 22);
  return { root: G.node('ak74m_fold', [k.build(), fold]), fold: { node: fold, axis: 'y', angle: -172 }, cheek: { x: -70, y: 8 } };
}

function stockUnder(ctx) {
  const k = ctx.kit();
  // складной металлический приклад АКМС (штампованные рычаги + затыльник)
  for (const s of [-1, 1]) {
    k.add('steel', G.extrudeZ([[0, 4, 2], [-10, 4], [-230, -30, 3], [-232, -40, 3], [-220, -40], [-10, -4], [0, -4]], 3, { bevel: 0.6, z: s * 11 }));
    k.add('steel', G.extrudeZ([[-12, -12], [-226, -90, 3], [-230, -96, 3], [-218, -96], [-12, -20]], 3, { bevel: 0.6, z: s * 11 }));
  }
  k.add('steel', G.extrudeZ([[-222, -28, 4], [-236, -30, 4], [-236, -104, 6], [-220, -100, 4]], 28, { bevel: 2 }));
  k.add('steel', G.T(G.cylZ(4, -13, 13, { seg: 16 }), { p: [-4, 0, 0] }));
  k.add('steel', G.T(G.cylZ(3, -13, 13, { seg: 14 }), { p: [-10, -16, 0] }));
  return { root: k.build('akms'), cheek: { x: -60, y: 6 } };
}

function stockPT(ctx, o) {
  const k = ctx.kit();
  // Зенитко ПТ: переходник под трубу AR + Magpul CTR на средней позиции
  k.add('steel', G.extrudeX(G.rrect(0, -2, 30, 34, 4), -30, 0, { bevel: 1.2 }));
  k.add('alu', G.T(G.cylX(14.6, -200, -28, { c: 1.2, seg: 32 }), { p: [0, 2, 0] }));
  k.add('steel', G.T(G.cylX(17.5, -38, -28, { c: 1, seg: 10 }), { p: [0, 2, 0] }));
  k.add('alu', G.extrudeX(G.rrect(0, -12.5, 9, 6, 1.5), -196, -40, { bevel: 0.6 }));
  const s = ctx.kit();
  const pro = G.shape([[150, -17, 3], [150, 17, 4], [118, 20, 6], [36, 22, 8], [-8, 24, 4], [-8, -92, 5], [8, -92, 4], [100, -21, 10]],
    [[[92, -26, 3], [30, -26, 4], [8, -74, 4], [8, -30, 3]]]);
  s.add('poly', G.extrudeZ(pro, 36, { bevel: 3.5 }));
  s.add('poly', G.cylX(19, 60, 150, { c: 3, seg: 28 }));
  s.add('poly', G.extrudeZ([[96, -18, 2], [144, -18, 2], [144, -30, 3], [100, -28, 3]], 20, { bevel: 2 }));
  s.add('rubber', G.extrudeZ([[-8, 24, 3], [-22, 23, 4], [-22, -93, 4], [-8, -93, 3]], 38, { bevel: 3.5 }));
  for (let i = 0; i < 10; i++) s.add('rubber', G.T(G.box(1.6, 2.6, 34), { p: [-22.2, 16 - i * 11.5, 0] }));
  const st = G.node('ctr', [s.build()]);
  st.position.set(-235, 2, 0);
  let fold = null;
  const parts = [k.build(), st];
  if (o.folding) {
    // ПТ-3 сохраняет узел складывания АК-74М
    const f = G.node('fold', parts.slice());
    fold = G.node('hinge', [f]);
    fold.position.set(0, 0, -22);
    f.position.set(0, 0, 22);
    return { root: G.node('pt', [fold]), fold: { node: fold, axis: 'y', angle: -172 }, cheek: { x: -110, y: 22 } };
  }
  return { root: G.node('pt', parts), cheek: { x: -110, y: 22 } };
}

/* ---------------------------------------------------------- наборы модулей */

export function akParts(v) {
  const is74 = v === 'ak74';
  const thr = is74 ? 'm24x1.5' : 'm14x1L';
  const steel = 'steel';
  const cal = is74 ? '545' : '762x39';
  const mag = (id, name, desc, stats, o) => ({ id, cat: 'mag', name, desc, fit: { iface: [is74 ? 'ak545' : 'ak762'] }, stats, build: (c) => (o.drum ? drum(c, o) : akMag(c, o)) });
  const M762 = { R: 235, d0: 70, d1: 64, w: 27, cal: '762x39' };
  const M545 = { R: 330, d0: 66, d1: 60, w: 25.5, cal: '545' };
  const list = [
    // цевья
    is74
      ? { id: 'hg_74m', cat: 'hg', name: 'АК-74М, полимер', desc: 'Штатные накладки из стеклонаполненного полиамида', stats: { weight: 240 }, build: (c) => hgStd(c, { mat: 'poly', ribs: true }) }
      : { id: 'hg_akm', cat: 'hg', name: 'АКМ, дерево', desc: 'Клеёная берёза, «лопатки» у магазина', stats: { weight: 300 }, build: (c) => hgStd(c, { mat: 'wood', paddle: true }) },
    { id: 'hg_b10', cat: 'hg', name: 'Зенитко Б-10М + Б-33', desc: 'Три планки снизу и по бокам + низкая планка на газовой трубке', stats: { weight: 390, ergo: 4 }, build: hgB10 },
    { id: 'hg_zhukov', cat: 'hg', name: 'Magpul Zhukov-U', desc: 'M-LOK, секции планок по бокам и снизу', stats: { weight: 280, ergo: 6 }, build: (c) => hgZhukov(c, { mat: is74 ? 'poly' : 'polyFde' }) },
    // крышки
    { id: 'cover_std', cat: 'cover', name: 'Штатная крышка', desc: 'Штампованная, с рёбрами жёсткости', stats: { weight: 180 }, build: (c) => coverStd(c, { steel }) },
    { id: 'cover_tws', cat: 'cover', name: 'Крышка с планкой (TWS)', desc: 'Жёсткая крышка на шарнире в колодке целика', stats: { weight: 290 }, build: (c) => coverTWS(c, { steel }) },
    // боковой кронштейн
    { id: 'side_mount', cat: 'sidemount', name: 'Кронштейн «ласточкин хвост» — Пикатинни', desc: 'Боковое крепление с планкой над крышкой', mountTypes: ['dovetail'], stats: { weight: 190 }, build: sideMount },
    // прицелы на «ласточкин хвост»
    { id: 'pso1', cat: 'optic', name: 'ПСО-1 4×24', desc: 'Снайперский прицел с дальномерной шкалой и подсветкой', mountTypes: ['dovetail'], foot: [-60, 40], body: [-212, 177], needs: (cfg) => !cfg.sidemount, stats: { weight: 580, ergo: -8, adsTime: 45 }, build: pso1 },
    { id: 'kobra', cat: 'optic', name: 'ЭКП-1С-03 «Кобра»', desc: 'Коллиматор, четыре сетки, крепление на боковую планку', mountTypes: ['dovetail'], foot: [-50, 40], body: [-50, 40], needs: (cfg) => !cfg.sidemount, stats: { weight: 380, ergo: -3, adsTime: 15 }, build: kobra },
    // дульные
    is74
      ? { id: 'brake74', cat: 'muzzle', name: 'ДТК АК-74', desc: 'Штатный двухкамерный дульный тормоз-компенсатор', fit: { thread: ['m24x1.5'] }, stats: { weight: 90, 'recoilV%': -20, 'recoilH%': -15, loud: 3, flash: 5 }, build: brake74 }
      : { id: 'slant', cat: 'muzzle', name: 'Компенсатор АКМ', desc: 'Штатный «косой срез»: гасит увод вверх-вправо', fit: { thread: ['m14x1L'] }, stats: { weight: 40, 'recoilV%': -8, 'recoilH%': -12, loud: 1, flash: 10 }, build: slantComp },
    { id: 'dtk1', cat: 'muzzle', name: 'Зенитко ДТК-1', desc: 'Трёхкамерный ДТК: сильно снижает отдачу, громче', fit: { thread: ['m14x1L', 'm24x1.5'] }, stats: { weight: 190, length: 60, 'recoilV%': -28, 'recoilH%': -24, loud: 5, flash: 0 }, build: dtk1 },
    is74
      ? { id: 'pbs4', cat: 'muzzle', name: 'ПБС-4', desc: 'Штатный глушитель к АК-74 (под патрон УС)', fit: { thread: ['m24x1.5'] }, stats: { weight: 480, length: 175, loud: -26, flash: -80, 'recoilV%': -10, ergo: -8, adsTime: 25 }, build: (c) => can(c, { name: 'pbs4', r: 17.5, len: 175, mat: 'steel', knurl: true, rings: [60, 120] }) }
      : { id: 'pbs1', cat: 'muzzle', name: 'ПБС-1', desc: 'Классический глушитель к АКМ', fit: { thread: ['m14x1L'] }, stats: { weight: 520, length: 200, loud: -26, flash: -80, 'recoilV%': -10, ergo: -9, adsTime: 25 }, build: (c) => can(c, { name: 'pbs1', r: 17.5, len: 200, mat: 'steel', knurl: true, rings: [70, 140] }) },
    { id: 'rotor43', cat: 'muzzle', name: '«Ротор-43»', desc: 'Малогабаритный глушитель с оребрённым корпусом', fit: { thread: ['m14x1L', 'm24x1.5'] }, stats: { weight: 430, length: 150, loud: -24, flash: -75, 'recoilV%': -12, ergo: -6, adsTime: 20 }, build: (c) => can(c, { name: 'rotor43', r: 21, len: 150, mat: 'cast', fins: 16 }) },
    { id: 'cap', cat: 'muzzle', name: 'Колпачок резьбы', desc: 'Голый ствол: громко, яркая вспышка', fit: { thread: [thr] }, stats: { weight: 15, loud: 2, flash: 25, 'recoilV%': 6 }, build: threadCap },
    // рукояти
    is74
      ? { id: 'grip_74m', cat: 'pgrip', name: 'АК-74М, полимер', desc: 'Штатная рукоять', fit: { iface: ['ak'] }, stats: { weight: 70 }, build: (c) => akGrip(c, { mat: 'poly', h: 100, front: [[2, 0], [0, -30], [1, -60], [-2, -100]], back: [[-36, 2], [-40, -8], [-39, -50], [-36, -80], [-37, -99]], angle: 17, grooves: 0, texture: true }) }
      : { id: 'grip_akm', cat: 'pgrip', name: 'АКМ, бакелит', desc: 'Рыжий бакелит с вертикальными рифами', fit: { iface: ['ak'] }, stats: { weight: 75 }, build: (c) => akGrip(c, { mat: 'bakelite', h: 100, front: [[2, 0], [0, -40], [-1, -100]], back: [[-36, 2], [-41, -10], [-40, -50], [-37, -82], [-38, -99]], angle: 17, grooves: 7 }) },
    { id: 'grip_rk3', cat: 'pgrip', name: 'Зенитко РК-3', desc: 'Эргономичная, с упором под ладонь', fit: { iface: ['ak'] }, stats: { weight: 90, ergo: 5 }, build: (c) => akGrip(c, { mat: 'poly', h: 104, front: [[2, 0], [0, -14], [5, -28], [0, -40], [-2, -104]], back: [[-34, 4], [-44, 0], [-42, -30], [-38, -70], [-38, -104]], angle: 16, texture: true, cap: true }) },
    { id: 'grip_moe_ak', cat: 'pgrip', name: 'Magpul MOE AK', desc: 'Полимерная, с отсеком в торце', fit: { iface: ['ak'] }, stats: { weight: 80, ergo: 3 }, build: (c) => akGrip(c, { mat: 'polySoft', h: 102, front: [[1, 0], [0, -30], [2, -60], [0, -102]], back: [[-34, 3], [-40, -10], [-38, -60], [-37, -102]], angle: 20, texture: true, cap: true }) },
    // приклады
    is74
      ? { id: 'stock_74m', cat: 'stock', name: 'АК-74М, складной', desc: 'Полимерный, складывается влево (K)', fit: { iface: ['ak'] }, stats: { weight: 360 }, build: stockAK74M }
      : { id: 'stock_akm', cat: 'stock', name: 'АКМ, дерево', desc: 'Клеёная берёза, стальной затыльник с пеналом', fit: { iface: ['ak'] }, stats: { weight: 480 }, build: stockAKM },
    is74 ? null : { id: 'stock_akms', cat: 'stock', name: 'АКМС, складной вниз', desc: 'Штампованный металлический приклад', fit: { iface: ['ak'] }, stats: { weight: 320, ergo: 4, 'recoilV%': 8 }, build: stockUnder },
    { id: 'stock_pt', cat: 'stock', name: is74 ? 'Зенитко ПТ-3 + Magpul CTR' : 'Зенитко ПТ-1 + Magpul CTR', desc: 'Переходник под трубу AR, телескопический приклад', fit: { iface: ['ak'] }, stats: { weight: 420, ergo: 6, 'recoilV%': -6 }, build: (c) => stockPT(c, { folding: is74 }) },
  ].filter(Boolean);
  if (is74) {
    list.push(
      mag('mag545_plum', 'Магазин 6Л23, «слива»', 'Полимер, 30 патронов 5,45', { weight: 220, mag: 30 }, { ...M545, len: 150, mat: 'polyPlum', cap: 30, ribs: true }),
      mag('mag545_black', 'Магазин 6Л23, чёрный', 'Полимер, 30 патронов', { weight: 220, mag: 30 }, { ...M545, len: 150, mat: 'poly', cap: 30, ribs: true }),
      mag('mag545_45', 'Магазин РПК-74, 45', 'Удлинённый, 45 патронов', { weight: 320, mag: 45, ergo: -4, adsTime: 12 }, { ...M545, len: 210, mat: 'polyPlum', cap: 45, ribs: true }),
      mag('mag545_drum', 'Барабан 95 (РПК-74)', 'Барабанный, 95 патронов', { weight: 1600, mag: 95, ergo: -12, adsTime: 35 }, { ...M545, mat: 'poly', cap: 95, drum: true }),
    );
  } else {
    list.push(
      mag('mag762_steel', 'Магазин стальной, 30', 'Штампованная сталь с рёбрами', { weight: 330, mag: 30 }, { ...M762, len: 158, mat: 'steelPark', cap: 30, cross: true }),
      mag('mag762_bak', 'Магазин бакелитовый, 30', '«Рыжий» АГ-4С', { weight: 250, mag: 30 }, { ...M762, len: 158, mat: 'bakelite', cap: 30, ribs: true }),
      mag('mag762_pmag', 'Magpul PMAG 30 AK', 'Полимер, окно у затыльника', { weight: 240, mag: 30, ergo: 1 }, { ...M762, len: 158, mat: 'poly', cap: 30, ribs: true, bevel: 1.8 }),
      mag('mag762_40', 'Магазин РПК, 40', 'Удлинённый, 40 патронов', { weight: 440, mag: 40, ergo: -4, adsTime: 12 }, { ...M762, len: 205, mat: 'steelPark', cap: 40, cross: true }),
      mag('mag762_drum', 'Барабан РПК, 75', 'Барабанный, 75 патронов', { weight: 2100, mag: 75, ergo: -14, adsTime: 40 }, { ...M762, mat: 'steelPark', cap: 75, drum: true }),
    );
  }
  return list;
}

export function akSlots() {
  const optRails = ['coverRail', 'gasRail', 'sideRail', 'dovetail'];
  return [
    { id: 'handguard', label: 'Цевьё', group: 'Цевьё и ствол', accepts: ['hg'], mount: 'hg', required: true },
    { id: 'muzzle', label: 'Дульное устройство', group: 'Цевьё и ствол', accepts: ['muzzle'], mount: 'muzzle' },
    { id: 'cover', label: 'Крышка коробки', group: 'Ствольная коробка', accepts: ['cover'], mount: 'cover', required: true },
    { id: 'sidemount', label: 'Боковой кронштейн', group: 'Оптика', accepts: ['sidemount'], rails: ['dovetail'] },
    { id: 'optic', label: 'Прицел', group: 'Оптика', accepts: ['optic'], rails: optRails, prefer: { x: -60 } },
    { id: 'magnifier', label: 'Увеличитель', group: 'Оптика', accepts: ['magnifier'], rails: optRails.slice(0, 3), prefer: 'rear', behind: 'optic' },
    { id: 'offset', label: 'Боковой коллиматор', group: 'Оптика', accepts: ['offset'], rails: optRails.slice(0, 3), prefer: { x: 0 } },
    { id: 'under', label: 'Под стволом', group: 'Тактика', accepts: ['foregrip', 'bipod'], rails: ['hgBottom'], prefer: 'front' },
    { id: 'tacRight', label: 'Правая планка', group: 'Тактика', accepts: ['light', 'laser', 'combo'], rails: ['hgRight'], prefer: 'front' },
    { id: 'tacLeft', label: 'Левая планка', group: 'Тактика', accepts: ['light', 'laser', 'combo'], rails: ['hgLeft'], prefer: 'front' },
    { id: 'mag', label: 'Магазин', group: 'Ствольная коробка', accepts: ['mag'], mount: 'magwell' },
    { id: 'pgrip', label: 'Пистолетная рукоять', group: 'Ствольная коробка', accepts: ['pgrip'], mount: 'grip', iface: 'ak', required: true },
    { id: 'stock', label: 'Приклад', group: 'Ствольная коробка', accepts: ['stock'], mount: 'stock', iface: 'ak' },
  ];
}
