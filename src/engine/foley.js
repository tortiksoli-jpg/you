// Фоли перезарядки и механики. Каждый звук синтезируется один раз в буфер
// (несколько вариаций) из физически мотивированных слоёв:
//  • удар — набор неэквидистантных затухающих мод с очень коротким
//    затуханием (2–30 мс) + шумовой транзиент: «клац», а не «динь»;
//  • трение — поток микроударов (stick-slip) через полосовой фильтр:
//    скольжение магазина в шахте, рамы по направляющим;
//  • глухой удар — низкочастотный шум с резонансом корпуса (ладонь, пластик).

function biquad(d, sr, type, f, q = 0.707) {
  const w = 2 * Math.PI * Math.min(f, sr * 0.45) / sr, cw = Math.cos(w), sw = Math.sin(w), a = sw / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; } else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; } else { b0 = a; b1 = 0; b2 = -a; }
  const a0 = 1 + a, a1 = -2 * cw, a2 = 1 - a;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y; d[i] = y;
  }
  return d;
}

const R = Math.random;
const jit = (v, k = 0.08) => v * (1 - k + R() * 2 * k);

class Track {
  constructor(sr, sec) { this.sr = sr; this.d = new Float32Array(Math.ceil(sr * sec)); }
  // удар: modes = [[f, затухание (с), амплитуда]], шум: {amp, decay, lp, hp, bp}
  impact(t, level, modes, nz = {}) {
    const sr = this.sr, d = this.d, i0 = Math.floor(t * sr);
    for (const [f0, dec0, a0] of modes) {
      const f = jit(f0, 0.06), dec = jit(dec0, 0.15), ph = R() * 6.28, w = 2 * Math.PI * f / sr;
      const n = Math.min(d.length - i0, Math.ceil(dec * sr * 7));
      const att = Math.max(2, sr * 0.0003);
      for (let i = 0; i < n; i++) d[i0 + i] += level * a0 * Math.exp(-i / (dec * sr)) * Math.min(1, i / att) * Math.sin(w * i + ph);
    }
    if (nz.amp) {
      const dec = nz.decay || 0.01;
      const n = Math.min(d.length - i0, Math.ceil(dec * sr * 7));
      const b = new Float32Array(n);
      for (let i = 0; i < n; i++) b[i] = (R() * 2 - 1) * Math.exp(-i / (dec * sr));
      if (nz.lp) biquad(b, sr, 'lp', nz.lp, 0.8);
      if (nz.hp) biquad(b, sr, 'hp', nz.hp, 0.7);
      if (nz.bp) biquad(b, sr, 'bp', nz.bp, nz.q || 1.5);
      for (let i = 0; i < n; i++) d[i0 + i] += b[i] * level * nz.amp;
    }
    return this;
  }
  // трение: длительность, полоса f0→f1, плотность зацепов в секунду
  scrape(t, dur, level, f0, f1, o = {}) {
    const sr = this.sr, i0 = Math.floor(t * sr), n = Math.min(this.d.length - i0, Math.floor(dur * sr));
    const b = new Float32Array(n);
    const rate = o.rate ?? 900, rough = o.rough ?? 0.6;
    let next = 0;
    for (let i = 0; i < n; i++) {
      let v = (R() * 2 - 1) * (1 - rough) * 0.35;
      if (i >= next) { v += (R() * 2 - 1) * rough * 2.2; next = i + Math.floor(sr / rate * (0.3 + R() * 1.4)); }
      b[i] = v;
    }
    // полосовой фильтр с развёрткой по частоте (кусками с перекрытием)
    const seg = 256, out = new Float32Array(n);
    for (let s = 0; s < n; s += seg) {
      const f = f0 * Math.pow(f1 / f0, s / n);
      const from = Math.max(0, s - 64);
      const part = biquad(b.slice(from, Math.min(n, s + seg)), sr, 'bp', f, o.q ?? 1.8);
      for (let i = s - from; i < part.length; i++) out[from + i] = part[i];
    }
    const shape = o.shape || ((k) => Math.sin(Math.PI * Math.min(1, k * 1.15)) ** 0.7);
    for (let i = 0; i < n; i++) this.d[i0 + i] += out[i] * level * 3.2 * shape(i / n);
    return this;
  }
  // глухой удар (ладонь, пластик, земля)
  thud(t, level, lp, dec = 0.03, body = 0) {
    return this.impact(t, level, body ? [[body, dec * 0.8, 0.9], [body * 2.3, dec * 0.4, 0.3]] : [], { amp: 1.4, decay: dec, lp, hp: 60 });
  }
  buffer(ctx) {
    const d = this.d;
    let pk = 0;
    for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]));
    const g = pk > 0.98 ? 0.98 / pk : 1;
    const fade = Math.min(d.length, Math.floor(this.sr * 0.01));
    for (let i = 0; i < d.length; i++) d[i] *= g * (i > d.length - fade ? (d.length - i) / fade : 1);
    const b = ctx.createBuffer(1, d.length, this.sr);
    b.getChannelData(0).set(d);
    return b;
  }
}

// Моды деталей (Гц, затухание с, амплитуда) — короткие и негармоничные.
const STEEL_SMALL = [[2350, 0.006, 0.5], [3900, 0.004, 0.45], [5600, 0.003, 0.35], [7700, 0.0022, 0.25], [9800, 0.0016, 0.15]];
const STEEL_MED = [[1150, 0.012, 0.45], [1870, 0.009, 0.4], [2760, 0.007, 0.35], [4100, 0.005, 0.3], [6200, 0.0035, 0.2]];
const CARRIER = [[160, 0.03, 0.9], [340, 0.022, 0.55], [760, 0.014, 0.45], [1450, 0.009, 0.4], [2650, 0.006, 0.35], [4300, 0.004, 0.25], [6800, 0.0025, 0.15]];
const POLY = [[420, 0.012, 0.6], [900, 0.008, 0.4], [1700, 0.005, 0.25]];
const ALU_WELL = [[610, 0.016, 0.5], [1320, 0.01, 0.4], [2240, 0.007, 0.3], [3500, 0.005, 0.2]];

const RECIPES = {
  // кнопка магазина нажата
  release(T) {
    T.impact(0, 0.35, STEEL_SMALL, { amp: 0.4, decay: 0.003, hp: 2500 });
    T.impact(0.012, 0.18, STEEL_SMALL.slice(1), { amp: 0.2, decay: 0.002, hp: 3500 });
  },
  // магазин выходит из шахты: трение, выход губок, хват рукой
  magOut(T, o) {
    const poly = o.kind !== 'steel';
    if (o.fam === 'ak') {
      // АК: нажим на защёлку, магазин проворачивают вперёд — зацеп выходит с лязгом
      T.impact(0, 0.32, STEEL_SMALL, { amp: 0.3, decay: 0.003, hp: 2000 });
      T.scrape(0.02, 0.12, 0.2, 1800, 1100, { rate: 700, rough: 0.7 });
      T.impact(0.13, 0.5, poly ? POLY : STEEL_MED, { amp: 0.6, decay: 0.006, lp: 5000 });
      T.scrape(0.15, 0.1, 0.14, 1300, 800, { rate: 500 });
    } else {
      RECIPES.release(T);
      T.scrape(0.018, 0.13, poly ? 0.2 : 0.26, poly ? 1400 : 2100, poly ? 900 : 1300, { rate: poly ? 600 : 1100, rough: 0.55 });
      T.impact(0.14, 0.22, poly ? POLY : ALU_WELL, { amp: 0.3, decay: 0.004, lp: 6000 });
    }
    T.thud(0.2, 0.18, 700, 0.02);
  },
  // магазин входит в шахту (до посадки)
  magInsert(T, o) {
    const poly = o.kind !== 'steel';
    if (o.fam === 'ak') {
      // передний зацеп магазина цепляет окно коробки
      T.impact(0, 0.42, poly ? POLY : STEEL_MED, { amp: 0.5, decay: 0.005, hp: 900 });
      T.scrape(0.01, 0.07, 0.16, 1500, 2200, { rate: 800 });
    } else {
      T.scrape(0, 0.1, poly ? 0.2 : 0.26, poly ? 900 : 1300, poly ? 1600 : 2600, { rate: poly ? 700 : 1300, rough: 0.5, shape: (k) => Math.min(1, k * 3) * (1 - k * 0.3) });
    }
  },
  // посадка: удар в упор + щелчок защёлки (+ ладонь по дну у AR/SCAR)
  magIn(T, o) {
    const poly = o.kind !== 'steel';
    if (o.fam === 'ak') {
      T.scrape(0, 0.05, 0.12, 1200, 1800, { rate: 600 });
      T.impact(0.05, 0.85, poly ? [[380, 0.016, 0.7], [820, 0.012, 0.5], ...STEEL_MED.slice(1)] : [[520, 0.018, 0.6], ...STEEL_MED], { amp: 0.9, decay: 0.006, lp: 7000 });
      T.impact(0.058, 0.4, STEEL_SMALL, { amp: 0.4, decay: 0.002, hp: 3000 });
      T.thud(0.05, 0.35, 500, 0.025, 180);
    } else {
      T.thud(0, 0.55, 900, 0.03, poly ? 210 : 260);
      T.impact(0.002, 0.7, poly ? [[330, 0.02, 0.8], ...POLY] : [[280, 0.022, 0.7], ...ALU_WELL], { amp: 0.7, decay: 0.007, lp: 5500 });
      T.impact(0.016, 0.55, STEEL_SMALL, { amp: 0.5, decay: 0.0025, hp: 2800 });
      T.impact(0.021, 0.2, STEEL_SMALL.slice(2), { amp: 0.15, decay: 0.0015, hp: 4000 });
    }
  },
  // рукоять назад: хват, трение рамы, сжатие пружины, удар в заднем положении
  chargeBack(T, o) {
    T.thud(0, 0.14, 1200, 0.012);
    T.impact(0.004, 0.28, STEEL_MED, { amp: 0.35, decay: 0.004, hp: 1500 });
    T.scrape(0.01, 0.17, 0.26, 1400, 3400, { rate: o.fam === 'ak' ? 700 : 1200, rough: 0.5, q: 2.4 });
    T.scrape(0.02, 0.16, 0.08, 5200, 7200, { rate: 2400, rough: 0.3, q: 3 });
    T.impact(0.19, 0.55, CARRIER.slice(2), { amp: 0.5, decay: 0.005, lp: 7000 });
  },
  // рама вперёд: короткое трение, мощный удар запирания, доворот затвора
  chargeRelease(T, o) {
    T.scrape(0, 0.05, 0.22, 3000, 1600, { rate: 1600, rough: 0.5 });
    const big = o.fam === 'ak' || o.cal === '762x51' ? 1.15 : 1;
    T.impact(0.05, 0.95 * big, CARRIER, { amp: 0.9, decay: 0.008, lp: 6500 });
    T.impact(0.058, 0.35, STEEL_SMALL, { amp: 0.35, decay: 0.002, hp: 3000 });
    T.impact(0.066, 0.3, STEEL_MED.slice(1), { amp: 0.2, decay: 0.003, hp: 1800 });
  },
  // затворная задержка: нажатие кнопки, затем удар рамы
  boltCatch(T) {
    T.impact(0, 0.3, STEEL_SMALL, { amp: 0.35, decay: 0.003, hp: 2200 });
    T.impact(0.035, 1.0, CARRIER, { amp: 0.9, decay: 0.008, lp: 6500 });
    T.impact(0.043, 0.35, STEEL_SMALL, { amp: 0.3, decay: 0.002, hp: 3000 });
  },
  // магазин падает на бетон
  magGround(T, o) {
    const poly = o.kind !== 'steel';
    T.thud(0, 0.7, 700, 0.03, 140);
    T.impact(0.004, 0.4, poly ? POLY : [[900, 0.03, 0.5], [1650, 0.02, 0.4], [2900, 0.012, 0.3], [4700, 0.008, 0.2]], { amp: 0.4, decay: 0.01, lp: 4000 });
    T.thud(0.11 + R() * 0.04, 0.25, 600, 0.02, 160);
    if (!poly) T.impact(0.12, 0.18, [[1100, 0.02, 0.5], [2300, 0.012, 0.3]], { amp: 0.2, decay: 0.006, lp: 3500 });
  },
  // спуск без выстрела: удар курка
  dryFire(T) {
    T.impact(0, 0.6, [[900, 0.01, 0.5], ...STEEL_MED.slice(1)], { amp: 0.6, decay: 0.004, hp: 800 });
    T.impact(0.004, 0.25, STEEL_SMALL, { amp: 0.3, decay: 0.002, hp: 3000 });
  },
  // переводчик: пружинный фиксатор
  selector(T) {
    T.scrape(0, 0.035, 0.08, 2500, 3500, { rate: 1500 });
    T.impact(0.03, 0.45, STEEL_SMALL, { amp: 0.4, decay: 0.0025, hp: 2500 });
    T.impact(0.037, 0.2, STEEL_MED.slice(2), { amp: 0.15, decay: 0.002, hp: 2000 });
  },
  click(T) { T.impact(0, 0.3, STEEL_SMALL.slice(1), { amp: 0.3, decay: 0.002, hp: 3000 }); },
};

const LEN = { magOut: 0.34, magInsert: 0.14, magIn: 0.16, chargeBack: 0.26, chargeRelease: 0.16, boltCatch: 0.14, magGround: 0.26, dryFire: 0.06, selector: 0.07, click: 0.04 };
const VARIANTS = 3;

export class Foley {
  constructor(ctx) { this.ctx = ctx; this.cache = new Map(); }
  buffer(name, o = {}) {
    const key = name + '|' + (o.fam || '') + '|' + (o.kind || '') + '|' + (o.cal || '');
    let list = this.cache.get(key);
    if (!list) {
      list = [];
      for (let v = 0; v < VARIANTS; v++) {
        const T = new Track(this.ctx.sampleRate, LEN[name] || 0.2);
        RECIPES[name](T, o);
        list.push(T.buffer(this.ctx));
      }
      this.cache.set(key, list);
    }
    return list[(Math.random() * list.length) | 0];
  }
}
