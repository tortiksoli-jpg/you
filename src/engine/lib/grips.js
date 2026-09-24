// Пистолетные рукояти AR. Начало — передний верхний угол посадочного места,
// рукоять уходит вниз и назад под углом ~20°.
import * as G from '../geo.js';

function grip(ctx, o) {
  const k = ctx.kit();
  const a = (o.angle ?? 20) * Math.PI / 180;
  const H = o.h ?? 104;
  const sh = (y) => -Math.tan(a) * -y; // смещение назад по высоте
  const front = o.front.map(([f, y]) => [sh(y) + f, y]);
  const back = o.back.map(([f, y]) => [sh(y) + f, y]);
  // скруглённое тело: сечение-«яйцо», шире у ладони, с поясом у верхней части
  k.add(o.mat || 'poly', G.gripLoft(front, back, { w: o.w ?? 30, width: (t) => 0.86 + 0.14 * Math.sin(Math.PI * Math.min(1, t * 1.6)) }));
  // зона насечки: тонкие рельефные полосы вдоль ладонной стороны
  if (o.texture !== false) {
    const tx = [];
    for (let i = 0; i < 9; i++) {
      const y = -24 - i * 8.5;
      for (const s of [-1, 1]) tx.push(G.T(G.box(16, 1.1, 1.2, { bevel: 0.3 }), { p: [sh(y) - 22, y, s * ((o.w ?? 30) / 2 * 0.9 - 0.2)], r: [0, 0, o.angle ?? 20] }));
    }
    k.add(o.mat || 'poly', tx);
  }
  if (o.cap) k.add('polySoft', G.T(G.box(34, 5, (o.w ?? 30) - 4, { bevel: 2 }), { p: [sh(-H) - 18, -H - 1, 0], r: [0, 0, -4] }));
  return { root: k.build(o.name) };
}

export const GRIPS = [
  { id: 'hk_v2', cat: 'pgrip', name: 'HK V2', desc: 'Эргономичная рукоять HK с упором под палец', fit: { iface: ['ar'] }, stats: { weight: 80, ergo: 0 },
    build: (c) => grip(c, { name: 'hk_v2', angle: 18, front: [[2, 0], [0, -14], [5, -26], [0, -36], [-3, -70], [-2, -102]], back: [[-34, 6], [-44, 2], [-42, -20], [-36, -48], [-38, -80], [-36, -104]], cap: true }) },
  { id: 'moe_grip', cat: 'pgrip', name: 'Magpul MOE+', desc: 'Прорезиненная, с отсеком в торце', fit: { iface: ['ar'] }, stats: { weight: 75, ergo: 2 },
    build: (c) => grip(c, { name: 'moe', angle: 22, mat: 'polySoft', front: [[1, 0], [0, -20], [2, -40], [-1, -70], [0, -100]], back: [[-32, 5], [-40, 0], [-38, -30], [-35, -60], [-36, -102]], cap: true }) },
  { id: 'bcm_mod3', cat: 'pgrip', name: 'BCM Gunfighter Mod 3', desc: 'Вертикальнее, удобна при коротком прикладе', fit: { iface: ['ar'] }, stats: { weight: 70, ergo: 3 },
    build: (c) => grip(c, { name: 'bcm', angle: 12, front: [[1, 0], [0, -30], [1, -60], [0, -96]], back: [[-30, 4], [-38, 0], [-35, -40], [-34, -96]], texture: true }) },
];
