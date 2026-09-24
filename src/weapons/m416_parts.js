// Модули, специфичные для HK416: цевья, прицельные HK, приклады,
// магазины STANAG, рукояти заряжания.
const RAIL_TOP = 30.5;

/* ------------------------------------------------------------ гравировка */

// Штрихи символов в ячейке 0,6 × 1: семисегментник плюс диагонали.
const CW = 0.6;
const SEG = { a: [[0, 1], [CW, 1]], b: [[CW, 1], [CW, 0.5]], c: [[CW, 0.5], [CW, 0]], d: [[0, 0], [CW, 0]], e: [[0, 0], [0, 0.5]], f: [[0, 0.5], [0, 1]], g: [[0, 0.5], [CW, 0.5]] };
const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', A: 'efabcg', E: 'afged', F: 'afge', H: 'fbgec', S: 'afgcd', C: 'afed', L: 'fed', P: 'efabg', '-': 'g' };
const STROKES = {
  K: [[[0, 0], [0, 1]], [[0, 0.45], [CW, 1]], [[0.18, 0.6], [CW, 0]]],
  M: [[[0, 0], [0, 1]], [[0, 1], [CW / 2, 0.45]], [[CW / 2, 0.45], [CW, 1]], [[CW, 1], [CW, 0]]],
  X: [[[0, 0], [CW, 1]], [[0, 1], [CW, 0]]],
  T: [[[0, 1], [CW, 1]], [[CW / 2, 1], [CW / 2, 0]]],
};
// Плоскость надписи: [направление строки, верх букв, наружу].
const BASIS = { right: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], left: [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], top: [[0, 0, 1], [1, 0, 0], [0, 1, 0]] };

// Гравировка текста рельефом d мм, высота букв h, центр строки — p.
// right/left — борта (читается снаружи), top — сверху, низ букв к стрелку.
export function engrave(ctx, text, o = {}) {
  const { G, THREE } = ctx;
  const h = o.h ?? 3, t = o.t ?? Math.max(0.28, h * 0.13), d = o.d ?? 0.12;
  const adv = (CW + 0.4) * h, total = text.length * adv - 0.4 * h;
  const gs = [];
  [...text].forEach((ch, i) => {
    const x0 = -total / 2 + i * adv;
    const list = (STROKES[ch] || [...(SEGS[ch] || '')].map((s) => SEG[s])).slice();
    if (ch === '.' || ch === ',') list.push([[CW / 2, 0], [CW / 2, ch === ',' ? -0.18 : 0.02]]);
    for (const [[ax, ay], [bx, by]] of list) {
      const px = x0 + ax * h, py = (ay - 0.5) * h, qx = x0 + bx * h, qy = (by - 0.5) * h;
      gs.push(G.T(G.box(Math.hypot(qx - px, qy - py) + t, t, d, { bevel: 0 }), { r: [0, 0, Math.atan2(qy - py, qx - px) * 180 / Math.PI], p: [(px + qx) / 2, (py + qy) / 2, d / 2] }));
    }
  });
  const g = G.merge(gs);
  if (!g) return null;
  const B = BASIS[o.basis || 'right'], p = o.p || [0, 0, 0];
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...B[0]), new THREE.Vector3(...B[1]), new THREE.Vector3(...B[2]));
  m.setPosition(p[0], p[1], p[2]);
  return g.applyMatrix4(m);
}

// Номера пазов на выступах планки (T-marks) в координатах планки: верх выступов — y = 0.
export function railMarks(ctx, r, n0 = 1, o = {}) {
  const gs = [];
  for (let i = 0; i < r.slots - 1; i++) {
    gs.push(engrave(ctx, String(n0 + i), { h: o.h ?? 2.3, d: 0.1, basis: 'top', p: [r.first + (i + 0.5) * ctx.G.PICA.PITCH, -0.04, 0] }));
  }
  return ctx.G.merge(gs);
}

/* ----------------------------------------------------------------- цевья */

// Дуга окружности (центр cz, cy) от угла t0 до t1 (радианы), точки [z, y].
function arc(cz, cy, r, t0, t1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * (i / n); out.push([cz + Math.cos(t) * r, cy + Math.sin(t) * r]); }
  return out;
}

function quadRail(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  const x0 = 2, x1 = 252;
  // корпус: восьмигранник под четыре планки, внутри — канал под ствол и поршень (центр y = 2, R 17,5).
  // Две части, как у HK RIS: верхняя (верх и борта) и съёмная нижняя, между ними — шов.
  const a = 26, f = 10.5, R = 17.5, cy = 2;
  const zAt = (y) => a - (-y - f);
  const ys = -12, yl = -12.7;
  const dzU = Math.sqrt(R * R - (ys - cy) ** 2), dzL = Math.sqrt(R * R - (yl - cy) ** 2);
  const upper = [[zAt(ys), ys, 0.9], [a, -f, 2.2], [a, f, 2.2], [f, a, 2.2], [-f, a, 2.2], [-a, f, 2.2], [-a, -f, 2.2], [-zAt(ys), ys, 0.9],
    ...arc(0, cy, R, Math.atan2(ys - cy, -dzU), Math.atan2(ys - cy, dzU) - Math.PI * 2, 36)];
  const lower = [[-zAt(yl), yl, 0.9], [-f, -a, 2.2], [f, -a, 2.2], [zAt(yl), yl, 0.9],
    ...arc(0, cy, R, Math.atan2(yl - cy, dzL), Math.atan2(yl - cy, -dzL), 12)];
  k.add('alu', G.extrudeX(upper, x0 + 6, x1 - 10, { bevel: 1 }));
  k.add('alu', G.extrudeX(lower, x0 + 10, x1 - 13, { bevel: 1 }));
  // передний пояс, торцевая крышка с отверстием под ствол, задний пояс у ствольной гайки
  const ringP = (d, rr) => [[-f - d, a + d], [f + d, a + d], [a + d, f + d], [a + d, -f - d], [f + d, -a - d], [-f - d, -a - d], [-a - d, -f - d], [-a - d, f + d]].map((p) => [...p, rr]);
  k.add('alu', G.extrudeX(G.shape(ringP(1.5, 3), [G.circle(0, cy, R, 32)]), x1 - 14, x1 - 2, { bevel: 1.4 }));
  k.add('alu', G.extrudeX(G.shape(ringP(0.6, 2.6), [G.circle(0, 0, 11.2, 32)]), x1 - 3.5, x1, { bevel: 1 }));
  k.add('alu', G.extrudeX(G.shape(ringP(1.5, 3), [G.circle(0, 0, 16, 32)]), x0, x0 + 11, { bevel: 1.2 }));
  // винты крепления: на нижних диагональных гранях (обе стороны) у заднего и переднего поясов
  const dia = (a + f) / Math.SQRT2 + 0.1;
  for (const s of [-1, 1]) for (const x of [x0 + 18, x0 + 30, x1 - 22]) {
    k.add('steel', G.T(G.screwHead(2.7, 1.3, { seg: 6 }), { r: [s > 0 ? 45 : 135, 0, 0], p: [x, -dia * Math.SQRT1_2, s * dia * Math.SQRT1_2] }));
  }
  const len = x1 - x0 - 2;
  const mounts = [];
  const faces = [['hgTop', 'top', [0, 0, 0], [0, RAIL_TOP, 0], 18], ['hgRight', 'right', [90, 0, 0], [0, 0, RAIL_TOP], 1], ['hgBottom', 'bottom', [180, 0, 0], [0, -RAIL_TOP, 0], 1], ['hgLeft', 'left', [-90, 0, 0], [0, 0, -RAIL_TOP], 1]];
  for (const [id, face, rot, off, n0] of faces) {
    const rr = G.picatinny(len, { base: RAIL_TOP - a + 0.5 });
    k.add('alu', rr.geo, { r: rot, p: [x0 + 1 + off[0], off[1], off[2]] });
    k.add('steelWorn', railMarks(ctx, rr, n0), { r: rot, p: [x0 + 1 + off[0], off[1], off[2]] });
    const p = [x0 + 1 + rr.first, off[1], off[2]];
    mounts.push(ctx.railMount(id, p, face, rr.slots, { axis: face }));
  }
  const root = G.node('hk_quad', [k.build(), ...mounts]);
  return { root };
}

function mlokRail(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  const x0 = 2, x1 = 262, R = 24, t = 3.2;
  const w = 2 * R * Math.tan(Math.PI / 8) + 0.6;
  for (let i = 0; i < 8; i++) {
    const a = i * 45;
    if (a === 0) continue;
    const holes = G.mlokHoles(x0 + 26, x1 - 14, 0, { pitch: 40 });
    const plate = G.shape(G.rrect((x0 + x1) / 2, 0, x1 - x0, w, 0.8), a % 90 === 0 ? holes : holes.filter((_, j) => j % 2 === 1));
    const g = G.extrudeZ(plate, t, { bevel: 0.6, z: R - t / 2 });
    k.add('alu', G.T(g, { r: [a - 90, 0, 0] }));
  }
  // верхняя панель под сплошную планку
  k.add('alu', G.extrudeX(G.rrect(0, R - 2, w + 1, 5, 1), x0, x1, { bevel: 0.6 }));
  k.add('alu', G.extrudeX(G.shape(G.circle(0, 0, R + 2.5, 8).map((p) => [p[0], p[1], 2]), [G.circle(0, 0, 16, 32)]), x0, x0 + 12, { bevel: 1 }), null);
  k.add('alu', G.extrudeX(G.shape(G.circle(0, 0, R + 1.5, 8).map((p) => [p[0], p[1], 2]), [G.circle(0, 0, 17, 32)]), x1 - 6, x1, { bevel: 1 }), null);
  // стяжные винты хомута на ствольной гайке (снизу, обе стороны) и антиповоротный выступ сверху
  for (const s of [-1, 1]) for (const x of [x0 + 3.5, x0 + 8.5]) {
    const ap = (R + 2.5) * Math.cos(Math.PI / 8); // апофема восьмигранного пояса
    k.add('steel', G.T(G.screwHead(2.2, 1.1), { r: [s > 0 ? 22.5 : 157.5, 0, 0], p: [x, -ap * Math.sin(Math.PI / 8), s * ap * Math.cos(Math.PI / 8)] }));
  }
  k.add('alu', G.extrudeX(G.rrect(0, R + 3.5, 12, 4, 1), x0 - 5, x0 + 1, { bevel: 0.6 }));
  const mounts = [];
  const top = G.picatinny(x1 - x0 - 2, { base: RAIL_TOP - R + 0.5 });
  k.add('alu', top.geo, { p: [x0 + 1, RAIL_TOP, 0] });
  k.add('steelWorn', railMarks(ctx, top, 18), { p: [x0 + 1, RAIL_TOP, 0] });
  mounts.push(ctx.railMount('hgTop', [x0 + 1 + top.first, RAIL_TOP, 0], 'top', top.slots, { axis: 'top' }));
  // секции планки M-LOK, установленные на винтах
  const sections = [['hgBottom', 'bottom', 180, 102, [0, -R - 0.2, 0]], ['hgRight', 'right', 90, 72, [0, 0, R + 0.2]], ['hgLeft', 'left', -90, 72, [0, 0, -R - 0.2]]];
  for (const [id, face, rot, len, off] of sections) {
    const xs = x1 - 18 - len;
    const rr = G.picatinny(len, { base: 9.6 });
    const sk = ctx.kit();
    sk.add('alu', rr.geo, { p: [0, 9.4, 0] });
    sk.add('steel', G.T(G.screwHead(2.6, 1.2), { r: [-90, 0, 0] }), { p: [len * 0.25, 9.6, 0] });
    sk.add('steel', G.T(G.screwHead(2.6, 1.2), { r: [-90, 0, 0] }), { p: [len * 0.75, 9.6, 0] });
    const sec = sk.build();
    const holder = G.node('sec:' + id, [sec]);
    holder.position.set(xs, off[1], off[2]);
    holder.rotation.x = rot * Math.PI / 180;
    mounts.push(holder);
    const m = ctx.railMount(id, [xs + rr.first, (off[1] ? Math.sign(off[1]) : 0) * (R + 9.6), (off[2] ? Math.sign(off[2]) : 0) * (R + 9.6)], face, rr.slots, { axis: face });
    mounts.push(m);
  }
  return { root: G.node('hk_mlok', [k.build(), ...mounts]) };
}

/* --------------------------------------------------------- прицельные HK */

function hkFront(ctx) {
  const { G } = ctx;
  const k = ctx.kit(), f = ctx.kit();
  k.add('alu', ctx.C.clampBody(-11, 11, 5));
  k.add('steel', ctx.C.crossBolt(0));
  // кнопка фиксатора откидной части (слева)
  k.add('steel', G.cylZ(2.2, -14.6, -12.8, { seg: 14, c: 0.4 }), { p: [-6.5, 2.2, 0] });
  // откидная часть: основание, стойки и кольцевой намушник
  f.add('alu', G.extrudeZ([[-9, 0, 1], [7, 0, 1], [7, 11, 2], [-9, 9, 2]], 16, { bevel: 0.8 }));
  for (const s of [-1, 1]) f.add('alu', G.extrudeZ([[-7, 8], [5, 8], [4, 24.6, 2], [-4.5, 24.6, 2]], 2.6, { bevel: 0.6, z: s * 6.2 }));
  f.add('alu', G.T(G.tubeX(9.6, 7.9, -4.5, 4.5, { seg: 40, c: 0.6 }), { p: [0, 30.5, 0] }));
  // мушка: барабан выверки по высоте с насечкой, стержень, лопатка с тритиевой точкой
  f.add('steel', G.cylY(3.3, 9, 13.5, { seg: 20, c: 0.5 }));
  f.add('steel', G.T(G.flutesX(3.1, 9.5, 13, 12, 0.8, 0.5), { r: [0, 0, 90] }));
  f.add('steel', G.cylY(1.9, 13, 30.5, { seg: 12, c: 0.3 }));
  f.add('steel', G.extrudeZ([[-1, 30], [1, 30], [0.8, 35.5, 0.3], [-0.8, 35.5, 0.3]], 1.6, { bevel: 0.2 }));
  f.add('tritium', G.T(G.sphere(0.55), { p: [-0.9, 34.4, 0] }));
  const flip = G.node('flip', [f.build()]);
  flip.position.set(-9, 5, 0);
  flip.children[0].position.set(9, -5, 0);
  return { root: G.node('hk_front', [k.build(), flip]), irons: { front: [0, 35.5, 0] }, flip: { node: flip, angle: 90 } };
}

function hkDiopter(ctx) {
  const { G } = ctx;
  const k = ctx.kit(), f = ctx.kit();
  k.add('alu', ctx.C.clampBody(-15, 15, 5.5));
  k.add('steel', ctx.C.crossBolt(0));
  const ear = [[-12, 0, 1], [12, 0, 1], [12, 30, 3], [7, 46, 4], [-7, 46, 4], [-12, 30, 3]];
  f.add('alu', G.extrudeZ(ear, 3, { bevel: 0.6, z: 11 }));
  f.add('alu', G.extrudeZ(ear, 3, { bevel: 0.6, z: -11 }));
  f.add('alu', G.extrudeZ([[-12, 0, 1], [12, 0, 1], [12, 22, 2], [-12, 22, 2]], 25, { bevel: 0.8 }));
  // барабан диоптра (ось — Z) со сквозным каналом вдоль X: боковые щёки + верх/низ средней части
  const AP = 2.1, Y = 35.5;
  for (const s of [-1, 1]) f.add('steel', G.T(G.cylZ(9.8, s > 0 ? AP : -8.5, s > 0 ? 8.5 : -AP, { seg: 28, c: 0.6 }), { p: [0, Y, 0] }));
  const half = (sg) => { const pts = []; for (let i = 0; i <= 14; i++) { const a = Math.asin(AP / 9.8) + (i / 14) * (Math.PI - 2 * Math.asin(AP / 9.8)); pts.push([Math.cos(a) * 9.8, sg * Math.sin(a) * 9.8]); } return pts; };
  for (const sg of [-1, 1]) f.add('steel', G.T(G.extrudeZ(half(sg), AP * 2 + 0.2, { bevel: 0.2 }), { p: [0, Y, 0] }));
  // насечка обода барабана (кроме зоны канала)
  for (let a = 0; a < 360; a += 15) {
    if (Math.min(Math.abs(a - 180), a, 360 - a) < 25 || Math.abs(a - 90) < 8 || Math.abs(a - 270) < 8) continue;
    const t = a * Math.PI / 180;
    f.add('steel', G.T(G.box(1.1, 0.9, 15.6, { bevel: 0.25 }), { r: [0, 0, a], p: [Math.cos(t) * 10, Y + Math.sin(t) * 10, 0] }));
  }
  // отверстия других диоптров сверху/снизу и цифры дистанций на щеке барабана
  for (const s of [-1, 1]) f.add('lensBlack', G.cylY(1.4, -0.25, 0.25, { seg: 14 }), { p: [0, Y + s * 9.6, 0] });
  for (const [txt, a] of [['2', 90], ['3', 0], ['4', 270], ['5', 180]]) {
    const t = a * Math.PI / 180;
    f.add('steelWorn', engrave(ctx, txt, { h: 2.4, basis: 'right', p: [Math.cos(t) * 6, Y + Math.sin(t) * 6, 8.45] }));
  }
  // задний диоптр-кольцо: видно как «призрачное кольцо» при прицеливании
  f.add('steel', G.T(G.tubeX(6.2, AP, -10.6, -9.2, { seg: 32, c: 0.3 }), { p: [0, Y, 0] }));
  // маховичок поправок по горизонтали с насечкой и риской
  f.add('steel', G.T(ctx.C.knob(5, 2.9, 14), { r: [0, -90, 0], p: [0, Y, 9.5] }));
  f.add('paintWhite', G.box(0.5, 3, 0.2, { bevel: 0 }), { p: [0, Y + 2.2, 12.45] });
  const flip = G.node('flip', [f.build()]);
  flip.position.set(12, 5.5, 0);
  flip.children[0].position.set(-12, -5.5, 0);
  return { root: G.node('hk_diopter', [k.build(), flip]), irons: { rear: [0, 35.5, 0], type: 'aperture' }, flip: { node: flip, angle: -90 } };
}

function hkFlashHider(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  // хвостовик заходит на резьбу до заплечика ствола; лыски под ключ
  const flat = G.circle(0, 0, 10.6, 40).map(([z, y]) => [Math.max(-8.8, Math.min(8.8, z)), y]);
  k.add('steel', G.extrudeX(flat, -11, 5, { bevel: 0.7 }));
  k.add('steel', G.latheX([[4, 0], [4, 10.6], [14, 10.6], [15.2, 10.1], [15.2, 6.8], [16.2, 3.2], [16.2, 0]], { seg: 40 }));
  k.add('lensBlack', G.cylX(3.2, 15.6, 16.4, { seg: 16 }));
  // шесть ламелей между сквозными продольными прорезями
  const r0 = 6.8, r1 = 10.5, sw = 1.4;
  const ho = Math.PI / 6 - sw / r1, hi = Math.PI / 6 - sw / r0;
  const tine = [];
  for (let j = 0; j <= 8; j++) { const t = -ho + (2 * ho * j) / 8; tine.push([Math.sin(t) * r1, Math.cos(t) * r1]); }
  for (let j = 8; j >= 0; j--) { const t = -hi + (2 * hi * j) / 8; tine.push([Math.sin(t) * r0, Math.cos(t) * r0]); }
  for (let i = 0; i < 6; i++) k.add('steel', G.T(G.extrudeX(tine, 14.8, 49.4, { bevel: 0.45 }), { r: [i * 60 + 30, 0, 0] }));
  // передний пояс, полый
  k.add('steel', G.latheX([[49, r0], [49, r1], [52.4, r1], [53.5, 9.4], [53.5, 7.6], [52.9, r0], [49, r0]], { seg: 40 }));
  return { root: k.build('hk_fh'), muzzle: { x: 53.5, kind: 'fh', flash: 0.35 } };
}

/* ---------------------------------------------------------------- приклады */

function stockHkSlim(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  // скруглённый корпус: верх — прямая щека, низ — скос к пятке
  k.add('poly', G.sideLoft([[-10, 25], [40, 25], [88, 24], [130, 21], [152, 16]], [[-10, -94], [4, -86], [60, -52], [116, -22], [152, -16]], { w: 38, k: 3.6, width: (t) => 0.9 + 0.1 * t, rings: 28 }));
  // боковые накладки (толстые — утоплены в скруглённый корпус) с антабочной прорезью у пятки
  const slotO = G.slot(9, 35, -48, 9, 8), slotI = G.slot(10.6, 33.4, -48, 5.8, 8);
  const pan = G.shape([[4, -26, 5], [96, -22, 5], [60, -40, 6], [12, -66, 6], [4, -64, 3]], [slotO]);
  for (const s of [-1, 1]) {
    k.add('polySoft', G.extrudeZ(pan, 3.6, { bevel: 0.5, z: s * 16.4 }));
    k.add('poly', G.extrudeZ(G.shape(slotO, [slotI]), 1.2, { bevel: 0.35, z: s * 17.1 }));
    k.add('lensBlack', G.extrudeZ(slotI, 0.3, { bevel: 0.05, z: s * 17.15 }));
  }
  // затыльник с рёбрами и винтами
  k.add('rubber', G.extrudeZ([[-10, 26, 3], [-26, 25, 5], [-27, -95, 5], [-10, -96, 3]], 41, { bevel: 4 }));
  for (let i = 0; i < 9; i++) k.add('rubber', G.T(G.box(2, 3, 38), { p: [-27, 16 - i * 13, 0] }));
  for (const y of [8, -72]) k.add('steel', G.T(G.screwHead(2.4, 1), { r: [0, -90, 0], p: [-26.4, y, 0] }));
  // рычаг фиксации: корпус, ось, рифлёная лапка
  k.add('poly', G.extrudeZ([[112, -18, 2], [146, -16, 2], [146, -24, 3], [118, -26, 3]], 14, { bevel: 1.5 }));
  k.add('steel', G.cylZ(1.6, -7.4, 7.4, { seg: 12, c: 0.3 }), { p: [140, -20, 0] });
  for (let i = 0; i < 4; i++) k.add('poly', G.box(1.2, 1, 12, { bevel: 0.3 }), { p: [118 + i * 3.4, -25.6 + i * 0.28, 0] });
  // QD-гнёзда
  for (const s of [-1, 1]) {
    k.add('steel', G.cylZ(5.5, 0, 2.6, { seg: 20, c: 0.5 }), { p: [14, -22, s > 0 ? 17 : -19.6] });
    k.add('lensBlack', G.cylZ(3.2, 0, 0.6, { seg: 14 }), { p: [14, -22, s > 0 ? 19.4 : -20] });
  }
  return { root: k.build('hk_slim'), cheek: { x: 70, y: 25 } };
}

function stockCTR(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  // корпус CTR: труба-обойма, клиновидная щека, открытая нижняя часть
  // щека над трубой, вертикальная стойка затыльника и нижняя диагональная «нога» —
  // между ними сквозное треугольное окно, как у настоящего CTR
  k.add('poly', G.sideLoft([[-8, 24], [36, 22.5], [118, 20], [150, 17]], [[-8, -24], [30, -24], [92, -22], [150, -17]], { w: 36, k: 3.4, rings: 24 }));
  k.add('poly', G.extrudeZ([[-8, 20, 3], [10, 20, 3], [10, -92, 4], [-8, -92, 4]], 34, { bevel: 4, curve: 6 }));
  k.add('poly', G.extrudeZ([[2, -92, 3], [16, -92, 3], [106, -24, 5], [88, -18, 5], [2, -76, 4]], 28, { bevel: 4, curve: 6 }));
  k.add('poly', G.T(G.cylX(19, 60, 150, { c: 3, seg: 28 }), { p: [0, 0, 0] }));
  // фрикционный фиксатор
  k.add('poly', G.extrudeZ([[96, -18, 2], [144, -18, 2], [144, -30, 3], [100, -28, 3]], 20, { bevel: 2 }));
  k.add('steel', G.cylZ(3, -11, 11, { seg: 14 }), { p: [128, -26, 0] });
  k.add('rubber', G.extrudeZ([[-8, 24, 3], [-22, 23, 4], [-22, -93, 4], [-8, -93, 3]], 38, { bevel: 3.5 }));
  for (let i = 0; i < 10; i++) k.add('rubber', G.T(G.box(1.6, 2.6, 34), { p: [-22.2, 16 - i * 11.5, 0] }));
  k.add('steel', G.wire([[20, -80, 0], [14, -99, 0], [-2, -99, 0], [-4, -84, 0]], 1.8, { n: 30 }));
  return { root: k.build('ctr'), cheek: { x: 60, y: 23 } };
}

function stockSopmod(ctx) {
  const { G } = ctx;
  const k = ctx.kit();
  const pro = [[150, -17, 3], [150, 18, 4], [110, 28, 16], [-8, 30, 5], [-8, -90, 6], [110, -22, 26]];
  k.add('poly', G.extrudeZ(pro, 34, { bevel: 4 }));
  // отсеки под батареи — «щёки» SOPMOD
  for (const s of [-1, 1]) {
    k.add('poly', G.T(G.cylX(13, -6, 118, { c: 4, seg: 24 }), { p: [0, 12, s * 18] }));
    k.add('poly', G.T(G.cylX(11.5, 118, 132, { c: 2, seg: 24 }), { p: [0, 12, s * 18] }));
    k.add('steel', G.T(G.cylX(9, 130, 134, { c: 1, seg: 20 }), { p: [0, 12, s * 18] }));
  }
  k.add('poly', G.extrudeZ([[104, -20, 2], [146, -18, 2], [146, -27, 3], [110, -28, 3]], 18, { bevel: 2 }));
  k.add('rubber', G.extrudeZ([[-8, 30, 3], [-24, 29, 4], [-24, -91, 5], [-8, -91, 3]], 60, { bevel: 4 }));
  for (let i = 0; i < 10; i++) k.add('rubber', G.T(G.box(1.8, 2.6, 56), { p: [-24.2, 22 - i * 12, 0] }));
  return { root: k.build('sopmod'), cheek: { x: 60, y: 30 } };
}

/* -------------------------------------------------------------- магазины */

// Боковой профиль магазина STANAG: изгиб вперёд в нижней части.
function stanagProfile(len, depth, curve, top = 48) {
  const pts = [];
  const off = (y) => (y > -20 ? 0 : curve * Math.pow((-20 - y) / (len - 20), 1.6));
  const n = 14;
  for (let i = 0; i <= n; i++) { const y = top - (i / n) * (top + len); pts.push([-depth / 2 + off(y), y]); }
  for (let i = n; i >= 0; i--) { const y = top - (i / n) * (top + len); pts.push([depth / 2 + off(y), y]); }
  return { pts, off };
}

function magRounds(ctx, k, cal, top, x = -4, body = null, mat = 'steelPark') {
  if (body) ctx.C.feedLips(body, mat, -31, 2, 48, 11.5);
  ctx.C.cartridge(k, cal, { p: [x - 26, top + 3.6, -2.6], r: [0, 0, -2] });
  ctx.C.cartridge(k, cal, { p: [x - 26, top - 3.2, 2.6], r: [0, 0, -2] });
}

function stanag(ctx, o) {
  const { G } = ctx;
  const k = ctx.kit(), rk = ctx.kit();
  const len = o.len, depth = 62, W = 23;
  const { pts, off } = stanagProfile(len, depth, o.curve ?? 22);
  k.add(o.mat, G.extrudeZ(pts.map((p) => [p[0], p[1], 0]), W, { bevel: o.bevel ?? 1.2 }));
  // рёбра-«корешки» по передней и задней кромке (видимая часть ниже приёмника)
  const edge = (sx, ins) => { const out = []; for (let y = -6; y >= -len + 6; y -= 8) out.push([sx * (depth / 2 - ins) + off(y), y, 0]); return out; };
  for (const sx of [-1, 1]) k.add(o.mat, G.wire(edge(sx, 1.4), 1.9, { n: 60, seg: 10 }));
  if (o.ribs) {
    // выштамповки на боковинах и поперечное ребро жёсткости HK
    const inner = stanagProfile(len - 18, depth - 18, (o.curve ?? 22) * 0.9, 30).pts;
    for (const s of [-1, 1]) {
      k.add(o.mat, G.extrudeZ(inner.map((p) => [p[0], p[1] - 8, 0]), 1, { bevel: 0.4, z: s * (W / 2 + 0.2) }));
      k.add(o.mat, G.T(G.box(depth - 8, 2.2, 1.2, { bevel: 0.45 }), { p: [0, -8, s * (W / 2 + 0.3)] }));
    }
  }
  if (o.texture) {
    // PMAG: поперечные рифы хвата и точечная матрица у затыльника
    const rw = o.window ? depth - 26 : depth - 14, rx = o.window ? 7 : 1;
    for (let i = 0; i < 7; i++) for (const s of [-1, 1]) { const y = -24 - i * 5; k.add(o.mat, G.T(G.box(rw, 1.5, 1, { bevel: 0.35 }), { p: [off(y) + rx, y, s * (W / 2 + 0.2)] })); }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) for (const s of [-1, 1]) {
      const y = -len + 30 + r * 3.4, x = off(y) - 16 + c * 3.4;
      k.add(o.mat, G.box(1.9, 1.9, 1, { bevel: 0.35 }), { p: [x, y, s * (W / 2 + 0.15)] });
    }
  }
  // подаватель у губок
  k.add(o.follower || 'polyTan', G.box(depth - 8, 3, W - 5), { p: [-2, o.top ?? 44, 0] });
  // затыльник: выступающие вперёд-назад губы, рифление по бокам (у PMAG), фиксатор
  const fy = -len, rot = [0, 0, -Math.atan(off(fy) / len) * 20];
  const fp = o.texture
    ? [[-depth / 2 - 4, -4.5, 2], [depth / 2 + 6, -4.5, 2], [depth / 2 + 7, 1, 2], [depth / 2 + 1, 3.5, 1], [-depth / 2 - 1, 3.5, 1], [-depth / 2 - 5, 1, 2]]
    : [[-depth / 2 - 3, -3.5, 1.5], [depth / 2 + 4, -3.5, 1.5], [depth / 2 + 4, 3.5, 1], [-depth / 2 - 3, 3.5, 1]];
  k.add(o.plate || o.mat, G.T(G.extrudeZ(fp, W + 4, { bevel: o.texture ? 2 : 1.4 }), { p: [off(fy) + 2, fy - 1.5, 0], r: rot }));
  if (o.texture) for (let i = 0; i < 3; i++) for (const s of [-1, 1]) k.add(o.plate || o.mat, G.T(G.box(depth - 6, 0.9, 0.8, { bevel: 0.25 }), { p: [off(fy) + 2, fy - 3.4 + i * 1.9, s * (W / 2 + 2)], r: rot }));
  else k.add(o.plate || o.mat, G.T(G.cylY(3, -0.6, 0.6, { seg: 14 }), { p: [off(fy) + 14, fy - 5.2, 0] }));
  if (o.window) {
    k.add('glassDark', G.box(7, 60, 1, { bevel: 0.3 }), { p: [-depth / 2 + 10, -20, W / 2 + 0.1] });
    k.add(o.mat, G.extrudeZ(G.shape(G.rrect(-depth / 2 + 10, -20, 11, 64, 3), [G.rrect(-depth / 2 + 10, -20, 7.4, 60.4, 2)]), 1.2, { bevel: 0.35, z: W / 2 + 0.2 }));
  }
  magRounds(ctx, rk, o.cal || '556', 44, -4, k, o.lips || o.mat);
  const rounds = rk.build('rounds');
  return { root: G.node('mag', [k.build(), rounds]), mag: { cap: o.cap, rounds } };
}

function surefire60(ctx) {
  const { G } = ctx;
  const k = ctx.kit(), rk = ctx.kit();
  const { pts, off } = stanagProfile(150, 62, 10);
  k.add('alu', G.extrudeZ(pts.map((p) => [p[0], p[1] > -20 ? p[1] : p[1], 0]).map((p) => p), 23, { bevel: 1.2 }));
  // четырёхрядная нижняя часть — заметно шире
  const low = stanagProfile(150, 64, 10).pts.filter((p) => p[1] < -24).map((p) => [p[0], p[1], 0]);
  k.add('alu', G.extrudeZ(low, 38, { bevel: 3 }));
  k.add('alu', G.T(G.box(68, 8, 40, { bevel: 2 }), { p: [off(-150) + 2, -152, 0] }));
  magRounds(ctx, rk, '556', 44, -4, k, 'alu');
  const rounds = rk.build('rounds');
  return { root: G.node('mag', [k.build(), rounds]), mag: { cap: 60, rounds } };
}

function drum60(ctx) {
  const { G } = ctx;
  const k = ctx.kit(), rk = ctx.kit();
  const { pts } = stanagProfile(70, 62, 0);
  k.add('poly', G.extrudeZ(pts.map((p) => [p[0], p[1], 0]), 23, { bevel: 1.2 }));
  // два барабана по бокам (Magpul D-60)
  for (const s of [-1, 1]) {
    k.add('poly', G.T(G.cylZ(58, 0, 34, { c: 4, seg: 40 }), { p: [8, -110, s > 0 ? 6 : -40] }));
    k.add('polySoft', G.T(G.cylZ(20, 0, 3, { c: 1, seg: 28 }), { p: [8, -110, s > 0 ? 39 : -43] }));
    k.add('glassDark', G.T(G.cylZ(9, 0, 1, { seg: 20 }), { p: [8, -110, s > 0 ? 42 : -44] }));
  }
  k.add('poly', G.T(G.box(20, 30, 12), { p: [8, -170, 0] }));
  magRounds(ctx, rk, '556', 44, -4, k, 'poly');
  const rounds = rk.build('rounds');
  return { root: G.node('mag', [k.build(), rounds]), mag: { cap: 60, rounds } };
}

/* ------------------------------------------------------ рукояти заряжания */

function charger(ctx, kind) {
  const { G } = ctx;
  const k = ctx.kit();
  k.add('alu', G.extrudeX(G.rrect(0, 0, 11, 6, 1.5), -6, 40, { bevel: 0.6 }));
  const wing = (z0, z1, ext) => G.extrudeY(G.shape([[-3, z0, 2], [-14 - ext, z0 + (z1 > z0 ? 0 : 0), 3], [-14 - ext, z1, 3], [-3, z1, 2]]), -4, 3, { bevel: 1 });
  if (kind === 'std') {
    k.add('alu', G.extrudeY(G.shape([[0, -17, 2], [-13, -17, 4], [-13, 17, 4], [0, 17, 2]].map(([x, z, r]) => [x, z, r])), -4, 3, { bevel: 1 }));
    k.add('alu', G.extrudeY(G.shape([[-4, -17], [-12, -17, 2], [-12, -24, 3], [-4, -22, 2]]), -4, 2.5, { bevel: 0.8 }));
  } else if (kind === 'raptor') {
    k.add('alu', G.extrudeY(G.shape([[0, -14, 2], [-12, -14, 3], [-12, 14, 3], [0, 14, 2]]), -4, 3, { bevel: 1 }));
    for (const s of [-1, 1]) k.add('poly', G.extrudeY(G.shape([[-2, s * 12], [-18, s * 13, 4], [-18, s * 32, 6], [-6, s * 30, 5]]), -5, 4, { bevel: 1.4 }));
  } else {
    k.add('alu', G.extrudeY(G.shape([[0, -17, 2], [-13, -17, 4], [-13, 17, 4], [0, 17, 2]]), -4, 3, { bevel: 1 }));
    k.add('alu', G.extrudeY(G.shape([[-3, -16], [-16, -17, 3], [-17, -34, 6], [-6, -30, 5]]), -5, 3, { bevel: 1.2 }));
  }
  return { root: k.build('charger'), charger: { travel: 64 } };
}

export const M416_PARTS = [
  { id: 'hk_quad', cat: 'hg', name: 'HK416 Quad Rail', desc: 'Штатное цевьё с четырьмя планками Пикатинни', fit: { iface: ['hk416'] }, stats: { weight: 330, ergo: 0 }, build: quadRail },
  { id: 'hk_mlok', cat: 'hg', name: 'Цевьё M-LOK 10,5"', desc: 'Облегчённое, верхняя планка + секции M-LOK', fit: { iface: ['hk416'] }, stats: { weight: 210, ergo: 6, length: 10 }, build: mlokRail },

  { id: 'hk_fh', cat: 'muzzle', name: 'HK пламегаситель', desc: 'Штатный щелевой пламегаситель', fit: { thread: ['1/2x28'] }, stats: { weight: 60, length: 44, flash: -45, loud: 0 }, build: hkFlashHider },

  { id: 'hk_diopter', cat: 'rearsight', name: 'HK диоптр (складной)', desc: 'Барабан с четырьмя диоптрами 200–500 м', foot: [-15, 15], body: [-15, 15], stats: { weight: 80 }, build: hkDiopter },
  { id: 'hk_front', cat: 'frontsight', name: 'HK мушка (складная)', desc: 'Мушка в кольцевом намушнике, тритий', foot: [-11, 11], body: [-11, 11], stats: { weight: 60 }, build: hkFront },

  { id: 'hk_slim', cat: 'stock', name: 'HK A5 Slimline', desc: 'Штатный 6-позиционный приклад', mountTypes: ['stock'], fit: { iface: ['ar'] }, body: [-40, 150], stats: { weight: 260, ergo: 0, 'recoilV%': 0 }, build: stockHkSlim },
  { id: 'ctr', cat: 'stock', name: 'Magpul CTR', desc: 'Лёгкий, фрикционный фиксатор без люфта', mountTypes: ['stock'], fit: { iface: ['ar'] }, body: [-30, 150], stats: { weight: 230, ergo: 4, 'recoilV%': 2 }, build: stockCTR },
  { id: 'sopmod', cat: 'stock', name: 'B5 SOPMOD', desc: 'Широкая щека, отсеки под батареи', mountTypes: ['stock'], fit: { iface: ['ar'] }, body: [-30, 150], stats: { weight: 330, ergo: -2, 'recoilV%': -6 }, build: stockSopmod },

  { id: 'hk_steel30', cat: 'mag', name: 'HK Steel 30', desc: 'Стальной магазин HK на 30 патронов', fit: { iface: ['stanag'] }, stats: { weight: 470, mag: 30 }, build: (c) => stanag(c, { len: 128, mat: 'steelPark', ribs: true, cap: 30, follower: 'polyTan' }) },
  { id: 'pmag30', cat: 'mag', name: 'Magpul PMAG 30 Gen M3', desc: 'Полимер, 30 патронов', fit: { iface: ['stanag'] }, stats: { weight: 420, mag: 30, ergo: 1 }, build: (c) => stanag(c, { len: 128, mat: 'poly', texture: true, cap: 30, follower: 'polyGrey', bevel: 1.6 }) },
  { id: 'pmag30w', cat: 'mag', name: 'PMAG 30 с окном', desc: 'Окно контроля остатка', fit: { iface: ['stanag'] }, stats: { weight: 425, mag: 30 }, build: (c) => stanag(c, { len: 128, mat: 'polyFde', texture: true, cap: 30, window: true, follower: 'polyGrey', bevel: 1.6 }) },
  { id: 'pmag40', cat: 'mag', name: 'Magpul PMAG 40', desc: 'Удлинённый, 40 патронов', fit: { iface: ['stanag'] }, stats: { weight: 560, mag: 40, ergo: -3, adsTime: 10 }, build: (c) => stanag(c, { len: 168, curve: 22, mat: 'poly', texture: true, cap: 40, follower: 'polyGrey', bevel: 1.6 }) },
  { id: 'sf60', cat: 'mag', name: 'SureFire MAG5-60', desc: 'Четырёхрядный, 60 патронов', fit: { iface: ['stanag'] }, stats: { weight: 800, mag: 60, ergo: -6, adsTime: 20 }, build: surefire60 },
  { id: 'd60', cat: 'mag', name: 'Magpul D-60', desc: 'Барабан на 60 патронов', fit: { iface: ['stanag'] }, stats: { weight: 1100, mag: 60, ergo: -9, adsTime: 30 }, build: drum60 },

  { id: 'ch_std', cat: 'charger', name: 'Штатная рукоять', desc: 'Mil-spec, защёлка слева', fit: { iface: ['ar'] }, stats: { weight: 30 }, build: (c) => charger(c, 'std') },
  { id: 'ch_bcm', cat: 'charger', name: 'BCM Gunfighter Mod 4', desc: 'Увеличенная защёлка', fit: { iface: ['ar'] }, stats: { weight: 36, ergo: 2 }, build: (c) => charger(c, 'bcm') },
  { id: 'ch_raptor', cat: 'charger', name: 'Radian Raptor', desc: 'Двусторонняя, удобна с оптикой', fit: { iface: ['ar'] }, stats: { weight: 40, ergo: 3 }, build: (c) => charger(c, 'raptor') },
];
