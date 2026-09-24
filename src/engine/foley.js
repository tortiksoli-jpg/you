// Фоли перезарядки и механики. Каждый звук синтезируется один раз в буфер
// (несколько вариаций). Никаких синусоид с фиксированной высотой — они и дают
// «колокольчики». Вместо этого — физическая модель удара:
//  • контакт: импульс длительностью tc (сталь по стали ~0,1 мс, полимер ~1 мс,
//    ладонь 3–6 мс) — чем короче контакт, тем ярче спектр;
//  • корпус: плотный банк (30–60) резонаторов со случайными частотами в полосе
//    и сильным демпфированием (оружие держат руками) — слух не находит высоты
//    тона, получается «клац», а не «динь»;
//  • трение: поток микрозацепов (stick-slip), пропущенный через тот же корпус;
//  • патроны в магазине: россыпь мелких латунных касаний;
//  • масса: низкочастотный «тук» всего оружия при посадке магазина/затвора.

const R = Math.random;
const jit = (v, k = 0.1) => v * (1 - k + R() * 2 * k);

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

// Материал корпуса: полоса мод, их число, время затухания на 1 кГц (с),
// наклон затухания по частоте, спектральный наклон амплитуд.
const BODY = {
  // фрезерованный алюминий ствольной коробки AR/SCAR: плотный, сухой
  alu: { f0: 380, f1: 9000, n: 48, tau: 0.007, tilt: -0.25, decK: 0.75 },
  // штампованная сталь АК: тонкий лист — ярче и чуть дольше
  sheet: { f0: 450, f1: 9500, n: 56, tau: 0.011, tilt: -0.15, decK: 0.7 },
  // массивные стальные детали (затворная рама, защёлка)
  steel: { f0: 900, f1: 11000, n: 40, tau: 0.004, tilt: -0.1, decK: 0.8 },
  // мелкая пружинная сталь (кнопка, защёлка, фиксатор)
  small: { f0: 2200, f1: 13000, n: 30, tau: 0.0022, tilt: 0, decK: 0.85 },
  // полимерный магазин / накладки — глухо и коротко
  poly: { f0: 250, f1: 5000, n: 36, tau: 0.004, tilt: -0.6, decK: 0.6 },
  // стальной магазин — корпус из тонкого листа
  magSteel: { f0: 500, f1: 8000, n: 44, tau: 0.006, tilt: -0.3, decK: 0.7 },
  // латунь патронов в магазине
  brass: { f0: 2500, f1: 12000, n: 24, tau: 0.0018, tilt: -0.1, decK: 0.8 },
  // бетон/земля при падении
  ground: { f0: 150, f1: 3500, n: 30, tau: 0.004, tilt: -0.8, decK: 0.5 },
};

class Track {
  constructor(sr, sec) { this.sr = sr; this.d = new Float32Array(Math.ceil(sr * sec)); }

  // Банк резонаторов, возбуждаемых сигналом x (начиная с отсчёта i0).
  resonate(x, i0, body, level, damp = 1) {
    const sr = this.sr, d = this.d, B = BODY[body] || body;
    const tail = Math.ceil(sr * Math.min(0.12, B.tau * 8 * damp));
    const n = Math.min(d.length - i0, x.length + tail);
    if (n <= 0) return;
    const out = new Float32Array(n);
    const lf0 = Math.log(B.f0), lf1 = Math.log(B.f1);
    let norm = 0;
    for (let m = 0; m < B.n; m++) {
      const f = Math.exp(lf0 + (lf1 - lf0) * R());
      const tau = B.tau * damp * Math.pow(f / 1000, -B.decK) * (0.6 + R() * 0.8);
      const r = Math.exp(-1 / (Math.max(0.0004, tau) * sr));
      const w = 2 * Math.PI * f / sr;
      const c1 = 2 * r * Math.cos(w), c2 = -r * r;
      const g = (0.25 + R() * 0.75) * Math.pow(f / 1000, B.tilt) * (1 - r) * 2;
      norm += g;
      let y1 = 0, y2 = 0;
      for (let i = 0; i < n; i++) {
        const y = (i < x.length ? x[i] : 0) * g + c1 * y1 + c2 * y2;
        y2 = y1; y1 = y; out[i] += y;
      }
    }
    const k = level / Math.max(1e-6, norm) * 1.6;
    for (let i = 0; i < n; i++) d[i0 + i] += out[i] * k;
  }

  // Удар: контакт длительностью tc (с) + шумовой «треск» контакта + корпус.
  hit(t, level, body, o = {}) {
    const sr = this.sr, i0 = Math.floor(t * sr);
    if (i0 >= this.d.length) return this;
    const tc = jit(o.tc ?? 0.0002, 0.2);
    const nc = Math.max(2, Math.round(tc * sr));
    const nn = Math.round((o.noise ?? 0.0012) * sr);
    const x = new Float32Array(Math.max(nc, nn) + 2);
    for (let i = 0; i < nc; i++) x[i] += Math.sin(Math.PI * i / nc) ** 2 * (o.push ?? 1);
    // шероховатость контакта: короткий шум, спадающий за время noise
    const na = o.grit ?? 0.35;
    for (let i = 0; i < nn; i++) x[i] += (R() * 2 - 1) * na * Math.exp(-i / (nn * 0.3 + 1));
    this.resonate(x, i0, body, level, o.damp ?? 1);
    // прямой (некорпусный) щелчок контакта — верх спектра
    if (o.click) {
      const m = Math.round(0.0015 * sr), b = new Float32Array(m);
      for (let i = 0; i < m; i++) b[i] = (R() * 2 - 1) * Math.exp(-i / (sr * 0.00025));
      biquad(b, sr, 'hp', o.clickHp ?? 3000, 0.7);
      for (let i = 0; i < m && i0 + i < this.d.length; i++) this.d[i0 + i] += b[i] * level * o.click;
    }
    return this;
  }

  // Масса оружия: низкий глухой «тук» (руки гасят его за 20–40 мс).
  mass(t, level, f = 160, dec = 0.025) {
    const sr = this.sr, i0 = Math.floor(t * sr), n = Math.min(this.d.length - i0, Math.ceil(sr * dec * 6));
    if (n <= 0) return this;
    const b = new Float32Array(n);
    for (let i = 0; i < n; i++) b[i] = (R() * 2 - 1) * Math.exp(-i / (sr * dec * 0.35));
    biquad(b, sr, 'lp', jit(f * 2.2), 0.7); biquad(b, sr, 'lp', jit(f * 2.2), 0.7);
    biquad(b, sr, 'hp', 45, 0.7);
    // сглаженный полупериод давления + шумовое тело
    const np = Math.round(sr / f * 0.5);
    for (let i = 0; i < n; i++) this.d[i0 + i] += level * (b[i] * 2.2 + (i < np ? Math.sin(Math.PI * i / np) * 0.5 : 0));
    return this;
  }

  // Трение: поток микрозацепов через корпус + широкополосное шуршание.
  scrape(t, dur, level, body, o = {}) {
    const sr = this.sr, i0 = Math.floor(t * sr), n = Math.min(this.d.length - i0, Math.floor(dur * sr));
    if (n <= 0) return this;
    const x = new Float32Array(n), hiss = new Float32Array(n);
    const rate0 = o.rate ?? 700, rate1 = o.rate1 ?? rate0;
    const shape = o.shape || ((k) => Math.sin(Math.PI * Math.min(1, k * 1.1)) ** 0.6);
    let next = 0;
    for (let i = 0; i < n; i++) {
      const k = i / n, env = shape(k), rate = rate0 + (rate1 - rate0) * k;
      if (i >= next) {
        const a = env * (0.3 + R() * 0.7) * (R() < 0.08 ? 2.2 : 1);
        const m = Math.max(2, Math.round(sr * jit(o.tc ?? 0.00015, 0.4)));
        for (let j = 0; j < m && i + j < n; j++) x[i + j] += a * Math.sin(Math.PI * j / m) ** 2;
        next = i + Math.max(1, Math.round(sr / rate * (0.2 + R() * 1.6)));
      }
      hiss[i] = (R() * 2 - 1) * env;
    }
    this.resonate(x, i0, body, level * 1.1, o.damp ?? 0.8);
    biquad(hiss, sr, 'bp', o.hissF ?? 3200, 0.6); biquad(hiss, sr, 'hp', 900, 0.7); biquad(hiss, sr, 'lp', 6500, 0.7);
    const h = (o.hiss ?? 0.25) * level;
    for (let i = 0; i < n; i++) this.d[i0 + i] += hiss[i] * h;
    return this;
  }

  // Патроны в магазине: n мелких латунных касаний за dur.
  rattle(t, dur, level, n = 6) {
    for (let i = 0; i < n; i++) this.hit(t + R() * dur, level * (0.3 + R() * 0.7), 'brass', { tc: 0.00008, noise: 0.0006, grit: 0.5, damp: 0.8 });
    return this;
  }

  // Ладонь по дну магазина: мягкий контакт + шлепок кожи.
  palm(t, level, body = 'poly') {
    this.hit(t, level * 0.6, body, { tc: 0.004, noise: 0.004, grit: 0.25, damp: 0.7 });
    const sr = this.sr, i0 = Math.floor(t * sr), n = Math.min(this.d.length - i0, Math.round(sr * 0.02));
    const b = new Float32Array(Math.max(0, n));
    for (let i = 0; i < n; i++) b[i] = (R() * 2 - 1) * Math.exp(-i / (sr * 0.003));
    biquad(b, sr, 'bp', jit(1400), 0.8);
    for (let i = 0; i < n; i++) this.d[i0 + i] += b[i] * level * 0.9;
    return this.mass(t + 0.001, level * 0.5, 120, 0.02);
  }

  // Ткань и снаряжение: шуршание нейлона (полосовой шум с рваной огибающей) и хруст складок.
  cloth(t, dur, level, o = {}) {
    const sr = this.sr, i0 = Math.floor(t * sr), n = Math.min(this.d.length - i0, Math.floor(dur * sr));
    if (n <= 0) return this;
    const b = new Float32Array(n);
    let env = 0, target = 0, next = 0;
    for (let i = 0; i < n; i++) {
      if (i >= next) { target = R() < 0.25 ? 0.15 : 0.4 + R() * 0.6; next = i + Math.round(sr * (0.006 + R() * 0.02)); }
      env += (target - env) * 0.004;
      const k = i / n, shape = Math.sin(Math.PI * Math.min(1, k * 1.05)) ** 0.7;
      b[i] = (R() * 2 - 1) * env * shape * (R() < 0.003 ? 4 : 1);
    }
    biquad(b, sr, 'bp', o.f ?? 2400, 0.55); biquad(b, sr, 'hp', 700, 0.7);
    for (let i = 0; i < n; i++) this.d[i0 + i] += b[i] * level;
    return this;
  }

  buffer(ctx) {
    const d = this.d, sr = this.sr;
    // сухой «воздух» вокруг: убрать инфранизы, мягко ограничить пики
    biquad(d, sr, 'hp', 40, 0.7);
    let pk = 0;
    for (let i = 0; i < d.length; i++) { d[i] = Math.tanh(d[i] * 1.2) / 1.2; pk = Math.max(pk, Math.abs(d[i])); }
    const g = pk > 0 ? 0.9 / pk : 1;
    const fade = Math.min(d.length, Math.floor(sr * 0.01));
    for (let i = 0; i < d.length; i++) d[i] *= g * (i > d.length - fade ? (d.length - i) / fade : 1);
    const b = ctx.createBuffer(1, d.length, sr);
    b.getChannelData(0).set(d);
    return b;
  }
}

// Рецепты. o: { fam: 'ak'|'m416'|'scar', kind: 'steel'|'poly', cal }
const recv = (o) => (o.fam === 'ak' ? 'sheet' : 'alu');
const magB = (o) => (o.kind === 'steel' ? 'magSteel' : 'poly');

const RECIPES = {
  // Сброс магазина. AR/SCAR: кнопка → защёлка отпускает → магазин выскальзывает
  // под собственным весом (трение о шахту, патроны шевелятся).
  // АК: нажим на рычаг защёлки, магазин проворачивают вперёд и выводят зацеп.
  magOut(T, o) {
    const fr = o.fill === 0 ? 0 : o.fill === 1 ? 0.7 : 1;       // патроны шевелятся только в непустом
    const r0 = T.rattle.bind(T);
    T.rattle = (t, dur, lv, n) => (fr ? r0(t, dur, lv * fr, n) : T.hit(t + dur * 0.5, lv * 0.6, 'small', { tc: 0.0002, damp: 1.4 }));
    if (o.fam === 'ak') {
      T.hit(0, 0.35, 'small', { tc: 0.0015, noise: 0.002, grit: 0.2 });           // палец на рычаге
      T.hit(0.03, 0.7, 'steel', { tc: 0.00012, click: 0.25 });                   // защёлка вышла из упора
      T.hit(0.032, 0.45, 'sheet', { tc: 0.0002, damp: 0.8 });
      T.scrape(0.05, 0.1, 0.35, magB(o), { rate: 500, rate1: 300, tc: 0.0003 }); // поворот, трение губ о окно
      T.hit(0.15, 0.55, magB(o), { tc: o.kind === 'steel' ? 0.0003 : 0.0008 });  // зацеп выходит из окна коробки
      T.hit(0.152, 0.3, 'sheet', { tc: 0.0003, damp: 0.7 });
      T.rattle(0.15, 0.1, 0.12, 5);
    } else {
      T.hit(0, 0.3, 'small', { tc: 0.0018, noise: 0.002, grit: 0.2 });           // подушечка пальца на кнопке
      T.hit(0.012, 0.6, 'small', { tc: 0.0001, click: 0.3 });                     // защёлка выходит из окна магазина
      T.hit(0.013, 0.35, recv(o), { tc: 0.00015, damp: 0.6 });
      T.scrape(0.02, 0.12, 0.4, magB(o), { rate: 900, rate1: 500, tc: 0.00018, hiss: 0.3, shape: (k) => (1 - k) ** 0.7 * Math.min(1, k * 8) });
      T.rattle(0.03, 0.12, 0.1, 6);
      T.hit(0.135, 0.3, magB(o), { tc: 0.0004 });                                 // корпус магазина покинул шахту
    }
  },
  // Магазин входит в шахту: касание раструба, скольжение.
  magInsert(T, o) {
    if (o.fam === 'ak') {
      T.hit(0, 0.55, magB(o), { tc: o.kind === 'steel' ? 0.00025 : 0.0007 });     // зацеп магазина в окне
      T.hit(0.002, 0.35, 'sheet', { tc: 0.0002, damp: 0.7 });
      T.scrape(0.012, 0.06, 0.28, magB(o), { rate: 600, tc: 0.0002 });
      T.rattle(0, 0.05, 0.1, 4);
    } else {
      T.hit(0, 0.4, magB(o), { tc: o.kind === 'steel' ? 0.0003 : 0.0008 });      // край магазина по раструбу
      T.scrape(0.006, 0.1, 0.42, magB(o), { rate: 600, rate1: 1300, tc: 0.00016, hiss: 0.35, hissF: 2600, shape: (k) => Math.min(1, k * 5) * (1 - 0.4 * k) });
      T.rattle(0.01, 0.09, 0.08, 5);
    }
  },
  // Посадка: магазин в упор, защёлка заскакивает в окно (+ ладонь по дну у AR/SCAR).
  magIn(T, o) {
    if (o.fam === 'ak') {
      // доворот назад до щелчка: скрип зацепа, затем резкий «клац» защёлки
      T.scrape(0, 0.045, 0.22, 'sheet', { rate: 450, tc: 0.00025, hiss: 0.15 });
      T.hit(0.048, 1.0, 'steel', { tc: 0.0001, click: 0.35 });
      T.hit(0.048, 0.8, 'sheet', { tc: 0.00015 });
      T.hit(0.05, 0.45, magB(o), { tc: 0.0003 });
      T.mass(0.048, 0.35, 170, 0.02);
      T.rattle(0.052, 0.06, 0.1, 4);
    } else {
      T.hit(0, 0.9, recv(o), { tc: 0.00018, click: 0.15 });                       // удар губ магазина в упор
      T.hit(0.001, 0.5, magB(o), { tc: 0.0004 });
      T.mass(0, 0.45, 150, 0.025);
      T.hit(0.009, 0.75, 'small', { tc: 0.00008, click: 0.35 });                  // защёлка заскочила
      T.rattle(0.004, 0.05, 0.1, 5);
      T.palm(0.05, 0.55, magB(o));                                                // ладонью по дну — дожим
      T.hit(0.052, 0.3, recv(o), { tc: 0.0003, damp: 0.7 });
    }
  },
  // Рукоять назад: хват, отпирание, трение рамы, сжатие пружины, упор.
  chargeBack(T, o) {
    const ak = o.fam === 'ak';
    T.hit(0, 0.2, 'poly', { tc: 0.003, noise: 0.003, grit: 0.2 });              // пальцы на рукояти
    if (!ak) T.hit(0.012, 0.45, 'small', { tc: 0.0001, click: 0.2 });             // защёлка рукояти (AR)
    T.hit(0.02, 0.55, 'steel', { tc: 0.00015 });                                  // поворот затвора — отпирание
    T.scrape(0.03, 0.15, 0.5, ak ? 'sheet' : 'steel', { rate: ak ? 500 : 900, rate1: ak ? 900 : 1500, tc: 0.00016, hiss: 0.3, hissF: 3800 });
    T.hit(0.18, 0.6, ak ? 'sheet' : recv(o), { tc: 0.0002 });                     // рама в заднем положении
    T.hit(0.181, 0.4, 'steel', { tc: 0.00012, damp: 0.7 });
  },
  // Рама вперёд: пружина разгоняет, досылание патрона, мощное запирание.
  chargeRelease(T, o) {
    const big = o.fam === 'ak' || o.cal === '762x51' ? 1.15 : 1;
    T.scrape(0, 0.035, 0.45, 'steel', { rate: 1800, tc: 0.00012, hiss: 0.35, hissF: 4500 });
    T.scrape(0.02, 0.02, 0.3, 'brass', { rate: 1500, tc: 0.0001 });               // патрон срывается с губ
    T.hit(0.042, 1.0 * big, 'steel', { tc: 0.0001, click: 0.3 });                  // удар затвора в пенёк ствола
    T.hit(0.042, 0.9 * big, recv(o), { tc: 0.00015 });
    T.mass(0.042, 0.5 * big, 140, 0.028);
    T.hit(0.05, 0.4, 'small', { tc: 0.0001, damp: 0.8 });                          // доворот затвора
    if (o.fam !== 'ak') T.hit(0.075, 0.3, 'small', { tc: 0.0001, click: 0.15 });  // рукоять встала на защёлку
  },
  // Затворная задержка: ладонь по кнопке, рама вперёд.
  boltCatch(T, o) {
    T.hit(0, 0.35, 'small', { tc: 0.0015, noise: 0.002 });
    T.hit(0.01, 0.45, 'small', { tc: 0.0001, click: 0.2 });
    T.scrape(0.012, 0.03, 0.4, 'steel', { rate: 1800, tc: 0.00012, hiss: 0.3, hissF: 4500 });
    T.hit(0.043, 1.0, 'steel', { tc: 0.0001, click: 0.3 });
    T.hit(0.043, 0.85, recv(o), { tc: 0.00015 });
    T.mass(0.043, 0.45, 140, 0.028);
  },
  // Магазин падает на бетон и подпрыгивает.
  // Магазин о бетонный пол. Полный — тяжёлый глухой удар и почти без отскока;
  // пустой — лёгкий, звонкий, скачет и дребезжит пружиной с подавателем.
  magGround(T, o) {
    const steel = o.kind === 'steel';
    const full = o.fill === 2, empty = o.fill === 0;
    const ground = { ...BODY.ground, f0: 220, f1: 5200, tau: 0.005 };
    T.hit(0, full ? 1 : 0.75, ground, { tc: full ? 0.0009 : 0.0005 });
    T.hit(0.001, full ? 0.7 : 0.85, magB(o), { tc: steel ? 0.00015 : 0.0005, click: steel ? 0.25 : 0.06 });
    T.mass(0, full ? 0.6 : 0.25, full ? 95 : 140, 0.02);
    if (!empty) T.rattle(0.002, 0.08, full ? 0.28 : 0.2, full ? 10 : 6);
    else { T.hit(0.004, 0.3, 'small', { tc: 0.0002 }); T.hit(0.03, 0.2, 'small', { tc: 0.0002 }); }
    let t = 0.08 + R() * 0.04, a = full ? 0.25 : 0.55;
    for (let i = 0; i < (full ? 1 : 3); i++) {
      T.hit(t, a, magB(o), { tc: steel ? 0.0002 : 0.0006 });
      T.hit(t, a * 0.8, ground, { tc: 0.0006 });
      if (empty) T.hit(t + 0.003, a * 0.4, 'small', { tc: 0.0002 });
      t += (0.07 + R() * 0.05) * (1 - i * 0.3); a *= 0.5;
    }
  },
  // Магазин из подсумка: рука, шуршание нейлона, магазин выходит из кармана, патроны.
  pouch(T, o) {
    T.cloth(0, 0.34, 0.5, { f: 2100 });
    T.hit(0.05, 0.25, 'poly', { tc: 0.003, noise: 0.004, grit: 0.3 });          // пальцы на магазине
    T.scrape(0.12, 0.16, 0.3, magB(o), { rate: 400, rate1: 250, tc: 0.0004, hiss: 0.45, hissF: 1800 });
    T.rattle(0.15, 0.16, 0.12, 6);
    T.hit(0.29, 0.2, magB(o), { tc: 0.0006 });                                    // вышел из кармана
    T.cloth(0.3, 0.12, 0.25, { f: 2800 });
  },
  // Проверка посадки: рывок магазина вниз — стук в защёлку.
  tug(T, o) {
    T.hit(0, 0.35, magB(o), { tc: 0.0004 });
    T.hit(0.002, 0.25, 'small', { tc: 0.00015 });
    T.rattle(0.003, 0.03, 0.06, 3);
  },
  // Вскидка: ткань, приклад в плечо (глухой удар в плечевую накладку).
  shoulder(T) {
    T.cloth(0, 0.16, 0.35, { f: 2000 });
    T.hit(0.11, 0.3, 'poly', { tc: 0.004, noise: 0.004, grit: 0.2, damp: 0.6 });
    T.mass(0.11, 0.2, 90, 0.03);
  },
  // Опускание оружия.
  unshoulder(T) { T.cloth(0, 0.14, 0.25, { f: 2300 }); },
  // Спуск без выстрела: удар курка по ударнику.
  dryFire(T, o) {
    T.hit(0, 0.25, 'small', { tc: 0.0001 });                                       // срыв шептала
    T.hit(0.006, 0.8, 'steel', { tc: 0.0001, click: 0.25 });
    T.hit(0.006, 0.45, recv(o), { tc: 0.0002, damp: 0.7 });
  },
  // Переводчик: подпружиненный фиксатор перескакивает в лунку.
  selector(T, o) {
    T.scrape(0, 0.03, 0.18, 'small', { rate: 1500, tc: 0.0001, hiss: 0.1 });
    T.hit(0.03, 0.6, 'small', { tc: 0.0001, click: 0.25 });
    T.hit(0.031, 0.3, recv(o), { tc: 0.0002, damp: 0.6 });
  },
  click(T) { T.hit(0, 0.5, 'small', { tc: 0.0001, click: 0.2 }); },
  // Короткий удар металла общего назначения (детали на планке, сошки, приклад).
  tick(T, o) { T.hit(0, 0.6, o.kind === 'poly' ? 'poly' : 'steel', { tc: o.kind === 'poly' ? 0.0006 : 0.00012, click: 0.15 }); },
  // Механика при выстреле: отпирание, удар рамы в буфер, накат и запирание.
  cycle(T, o) {
    const cyc = 60 / (o.rpm || 700);
    T.hit(0.001, 0.45, 'steel', { tc: 0.0001 });
    T.scrape(0.004, cyc * 0.35, 0.25, 'steel', { rate: 2000, tc: 0.0001, hiss: 0.2, hissF: 4500 });
    T.hit(cyc * 0.45, 0.4, recv(o), { tc: 0.0002 });
    T.hit(cyc * 0.85, 0.7, 'steel', { tc: 0.0001, click: 0.15 });
    T.hit(cyc * 0.85, 0.5, recv(o), { tc: 0.00015 });
  },
  // Литиевые элементы CR123A: стальной корпус, щёлкают друг о друга и о трубку фонаря.
  battCells(T) {
    const cell = { ...BODY.small, f0: 1500, f1: 9000, tau: 0.004, n: 26 };
    T.scrape(0, 0.08, 0.15, 'alu', { rate: 700, tc: 0.0002, hiss: 0.15 });
    T.hit(0.07, 0.5, cell, { tc: 0.00015, click: 0.1 });
    T.hit(0.1 + R() * 0.02, 0.35, cell, { tc: 0.00015 });
    T.hit(0.2, 0.25, 'poly', { tc: 0.002, noise: 0.003 });
  },
  // Гильза о бетон: тонкостенная латунная (стальная) трубка звенит коротко.
  casing(T, o) {
    const body = o.kind === 'steel' ? { ...BODY.magSteel, f0: 1800, f1: 9000, tau: 0.02, n: 30 } : { ...BODY.brass, f0: 2600, f1: 11000, tau: 0.03, n: 26, decK: 0.5 };
    T.hit(0, 0.6, body, { tc: 0.00008, noise: 0.0008 });
    T.hit(0.06 + R() * 0.05, 0.3, body, { tc: 0.0001 });
    T.hit(0.15 + R() * 0.08, 0.15, body, { tc: 0.0001 });
  },
};

const LEN = { pouch: 0.48, tug: 0.08, shoulder: 0.22, unshoulder: 0.16, battCells: 0.3, magOut: 0.3, magInsert: 0.16, magIn: 0.16, chargeBack: 0.26, chargeRelease: 0.16, boltCatch: 0.14, magGround: 0.5, dryFire: 0.08, selector: 0.08, click: 0.05, tick: 0.06, cycle: 0.14, casing: 0.36 };
const VARIANTS = 3;

export class Foley {
  constructor(ctx) { this.ctx = ctx; this.cache = new Map(); }
  buffer(name, o = {}) {
    const key = name + '|' + (o.fam || '') + '|' + (o.kind || '') + '|' + (o.cal || '') + '|' + (o.rpm || '') + '|' + (o.fill ?? '');
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

export const FOLEY_NAMES = Object.keys(RECIPES);
