// Процедурный звук: выстрел собирается из слоёв (дульная волна, «тело»,
// баллистический щелчок пули, механика автоматики, эхо стрельбища).
// Дульное устройство меняет каждый слой: глушитель срезает дульную волну
// на ~25 дБ и верх спектра, тормоз делает выстрел громче и резче.

import { Foley } from './foley.js';

const CAL = {
  '556': { blastF: 7200, blastT: 0.075, bodyF: 150, bodyT: 0.09, body: 0.55, crack: 0.9, level: 1.0, mechF: 3400 },
  '545': { blastF: 7600, blastT: 0.07, bodyF: 140, bodyT: 0.09, body: 0.55, crack: 0.95, level: 1.0, mechF: 2900 },
  '762x39': { blastF: 5200, blastT: 0.1, bodyF: 105, bodyT: 0.13, body: 0.85, crack: 0.75, level: 1.08, mechF: 2500 },
  '762x51': { blastF: 5600, blastT: 0.12, bodyF: 90, bodyT: 0.15, body: 1.0, crack: 1.0, level: 1.18, mechF: 2300 },
};

const MUZ = {
  bare: { blast: 1.1, lp: 1.1, body: 1.0, crack: 1.0, wet: 1.0, attack: 0.0006, tail: 1.0, harsh: 0.15 },
  fh: { blast: 1.0, lp: 0.95, body: 1.0, crack: 1.0, wet: 1.0, attack: 0.0007, tail: 1.0, harsh: 0.1 },
  comp: { blast: 1.2, lp: 1.1, body: 1.05, crack: 1.0, wet: 1.15, attack: 0.0005, tail: 1.1, harsh: 0.35 },
  // линейный: волна уходит вперёд — глуше и мягче у стрелка, без резкого «треска»
  linear: { blast: 0.72, lp: 0.7, body: 0.95, crack: 1.0, wet: 0.8, attack: 0.0009, tail: 0.85, harsh: 0 },
  brake: { blast: 1.45, lp: 1.3, body: 1.1, crack: 1.0, wet: 1.35, attack: 0.0004, tail: 1.2, harsh: 0.6 },
  supp: { blast: 0.075, lp: 0.2, body: 0.32, crack: 0.55, wet: 0.22, attack: 0.004, tail: 0.6, harsh: 0 },
};

export class GunAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.profile = { cal: '556', mech: 0.8 };
    this.muzzle = 'fh';
    this.lastShot = -10;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 8; comp.attack.value = 0.001; comp.release.value = 0.12;
    this.master.connect(comp).connect(c.destination);
    this.dry = c.createGain();
    this.dry.connect(this.master);
    this.verb = c.createConvolver();
    this.verb.buffer = this.impulse(2.6);
    this.wet = c.createGain();
    this.wet.gain.value = 0.55;
    this.verb.connect(this.wet).connect(this.master);
    this.noise = this.noiseBuf(1.5, 'white');
    this.pink = this.noiseBuf(1.5, 'pink');
    this.crackBuf = this.nwave();
    // буферы механики готовим в простое, чтобы первая перезарядка не дёргала кадр
    const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
    idle(() => this.warm());
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  noiseBuf(sec, kind) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else d[i] = w;
    }
    return b;
  }

  // N-волна сверхзвуковой пули: короткий двуполярный импульс.
  nwave() {
    const c = this.ctx, n = Math.floor(c.sampleRate * 0.006);
    const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    const L = Math.floor(c.sampleRate * 0.0009);
    for (let i = 0; i < n; i++) {
      if (i < L) d[i] = 1 - (2 * i) / L; else d[i] = Math.exp(-(i - L) / (c.sampleRate * 0.0006)) * -0.3 * Math.sin(i * 0.9);
    }
    return b;
  }

  // Импульсная характеристика открытого стрельбища: плотный хвост + отражения от валов.
  impulse(sec) {
    const c = this.ctx, n = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(2, n, c.sampleRate);
    const refl = [[0.045, 0.5], [0.11, 0.35], [0.19, 0.3], [0.31, 0.42], [0.52, 0.22], [0.78, 0.16]];
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / c.sampleRate;
        const w = Math.random() * 2 - 1;
        lp += (w - lp) * (0.35 - Math.min(0.3, t * 0.14));
        d[i] = lp * Math.pow(1 - t / sec, 3.2) * 0.35;
      }
      for (const [t, a] of refl) {
        const s = Math.floor((t + (ch ? 0.007 : 0)) * c.sampleRate);
        for (let j = 0; j < 900 && s + j < n; j++) d[s + j] += (Math.random() * 2 - 1) * a * Math.exp(-j / 180);
      }
    }
    return b;
  }

  env(g, t, a, peak, tau, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(0.0001, t + a, tau);
    if (end) g.gain.setValueAtTime(0, t + end);
  }

  src(buf, t, dur, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf; s.playbackRate.value = rate;
    s.start(t, Math.random() * (buf.duration - dur - 0.01), dur);
    return s;
  }

  out(node, wet = 0, pan = 0) {
    let n = node;
    if (pan && this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = pan; n.connect(p); n = p; }
    n.connect(this.dry);
    if (wet > 0) { const w = this.ctx.createGain(); w.gain.value = wet; n.connect(w).connect(this.verb); }
  }

  /* --------------------------------------------------------------- выстрел */

  shot(o = {}) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + 0.005;
    const P = CAL[this.profile.cal] || CAL['556'];
    const M = MUZ[this.muzzle] || MUZ.fh;
    const v = 0.92 + Math.random() * 0.16;
    // «первый выстрел» глушителя громче — в холодной банке есть кислород
    const frp = this.muzzle === 'supp' && t - this.lastShot > 3 ? 1.9 : 1;
    this.lastShot = t;
    const L = P.level * v;

    // 1) дульная волна
    {
      const s = this.src(this.noise, t, 0.6, 0.9 + Math.random() * 0.2);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass';
      lp.frequency.setValueAtTime(P.blastF * M.lp * (0.9 + Math.random() * 0.2), t);
      lp.frequency.exponentialRampToValueAtTime(Math.max(300, P.blastF * M.lp * 0.18), t + P.blastT * 2.5);
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = this.muzzle === 'supp' ? 90 : 55;
      const g = c.createGain();
      this.env(g, t, M.attack, 1.25 * L * M.blast * frp, P.blastT * M.tail, 0.7);
      s.connect(lp).connect(hp).connect(g);
      this.out(g, 0.9 * M.wet);
    }
    // резкая составляющая дульного тормоза
    if (M.harsh > 0) {
      const s = this.src(this.noise, t, 0.25);
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.2;
      const g = c.createGain(); this.env(g, t, 0.0004, 0.9 * L * M.harsh, 0.035, 0.3);
      s.connect(bp).connect(g);
      this.out(g, 0.6 * M.wet);
    }
    // 2) «тело» выстрела — низкочастотный удар
    {
      const osc = c.createOscillator(); osc.type = 'sine';
      const f = P.bodyF * (this.muzzle === 'supp' ? 0.8 : 1) * (0.95 + Math.random() * 0.1);
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.33, t + P.bodyT);
      const g = c.createGain(); this.env(g, t, 0.002, 1.1 * L * P.body * M.body * frp, P.bodyT * 0.5, P.bodyT * 3);
      const ws = c.createWaveShaper(); ws.curve = this.softclip || (this.softclip = (() => { const a = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; a[i] = Math.tanh(x * 2.2); } return a; })());
      osc.connect(ws).connect(g);
      this.out(g, 0.35 * M.wet);
      osc.start(t); osc.stop(t + P.bodyT * 3 + 0.05);
      // суб-хлопок из шума
      const s = this.src(this.pink, t, 0.3);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = this.muzzle === 'supp' ? 380 : 700;
      const g2 = c.createGain(); this.env(g2, t, 0.001, 1.6 * L * P.body * M.body * frp, P.bodyT * 0.7, 0.35);
      s.connect(lp).connect(g2);
      this.out(g2, 0.5 * M.wet);
    }
    // 3) щелчок сверхзвуковой пули
    {
      const s = c.createBufferSource(); s.buffer = this.crackBuf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
      const g = c.createGain(); g.gain.value = 0.55 * P.crack * M.crack * v;
      s.connect(hp).connect(g);
      this.out(g, 0.25);
      s.start(t + 0.002);
    }
    // 4) механика: отпирание, удар рамы в буфер, накат и запирание (синтез ударов, foley.js)
    {
      const mech = (this.profile.mech ?? 0.8) * (this.muzzle === 'supp' ? 1.3 : 1);
      this.play('cycle', { gain: 0.32 * mech, delay: 0.004, wet: 0.05, pan: 0.15 });
    }
    // 5) эхо от вала — поздний приглушённый повтор
    if (this.muzzle !== 'supp') {
      const s = this.src(this.pink, t + 0.34, 0.25);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      const g = c.createGain(); this.env(g, t + 0.34, 0.01, 0.14 * L * M.wet, 0.09, 0.3);
      s.connect(lp).connect(g);
      this.out(g, 0.6, -0.2);
    }
  }

  // Механика и перезарядка — синтезированные буферы (foley.js): без тональных «звонов».
  play(name, o = {}) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx;
    if (!this.foley) this.foley = new Foley(c);
    const P = this.profile;
    const s = c.createBufferSource();
    s.buffer = this.foley.buffer(name, { fam: P.family, cal: P.cal, kind: o.kind, rpm: name === 'cycle' ? P.rpm : undefined });
    s.playbackRate.value = 0.96 + Math.random() * 0.08;
    const g = c.createGain(); g.gain.value = (o.gain ?? 1) * 0.9;
    s.connect(g);
    this.out(g, o.wet ?? 0.07, o.pan ?? 0.12);
    s.start(c.currentTime + (o.delay || 0));
  }

  dryFire() { this.play('dryFire', { gain: 0.7 }); }
  selector() { this.play('selector', { gain: 0.8 }); }
  click() { this.play('click', { gain: 0.6, pan: 0 }); }
  magOut(kind = 'steel') { this.play('magOut', { kind, gain: 0.95 }); }
  magInsert(kind = 'steel') { this.play('magInsert', { kind, gain: 0.85 }); }
  magIn(kind = 'steel') { this.play('magIn', { kind, gain: 1.1 }); }
  magDropGround(kind = 'steel') { this.play('magGround', { kind, gain: 0.7, pan: 0.3, wet: 0.12 }); }
  chargeBack() { this.play('chargeBack', { gain: 0.95 }); }
  chargeRelease() { this.play('chargeRelease', { gain: 1.05 }); }
  boltCatch() { this.play('boltCatch', { gain: 1.05 }); }
  // заранее синтезировать буферы (вызывается при первом взаимодействии)
  warm() {
    if (!this.ctx) return;
    if (!this.foley) this.foley = new Foley(this.ctx);
    const P = this.profile, o = { fam: P.family, cal: P.cal };
    for (const n of ['magOut', 'magInsert', 'magIn', 'magGround']) for (const kind of ['steel', 'poly']) this.foley.buffer(n, { ...o, kind });
    for (const n of ['chargeBack', 'chargeRelease', 'boltCatch', 'dryFire', 'selector', 'click']) this.foley.buffer(n, o);
    this.foley.buffer('cycle', { ...o, rpm: P.rpm });
    for (const kind of ['steel', 'poly']) this.foley.buffer('tick', { ...o, kind });
    for (const kind of ['steel', 'brass']) this.foley.buffer('casing', { ...o, kind });
  }

  // Установка модуля: щелчки прижима или храповик резьбы.
  attach(kind) {
    if (!this.ctx || this.muted) return;
    if (kind === 'thread' || kind === 'supp') {
      for (let i = 0; i < 6; i++) this.play('tick', { kind: 'steel', gain: 0.25 + Math.random() * 0.1, delay: i * 0.06 + Math.random() * 0.01, pan: 0 });
      this.play('tick', { kind: 'steel', gain: 0.6, delay: 0.42, pan: 0 });
    } else if (kind === 'poly') {
      this.play('tick', { kind: 'poly', gain: 0.6, pan: 0 });
      this.play('tick', { kind: 'steel', gain: 0.25, delay: 0.03, pan: 0 });
    } else {
      this.play('tick', { kind: 'steel', gain: 0.55, pan: 0 });
      this.play('tick', { kind: 'steel', gain: 0.35, delay: 0.09, pan: 0 });
    }
  }

  fold() { this.play('tick', { kind: 'steel', gain: 0.5 }); this.play('tick', { kind: 'steel', gain: 0.8, delay: 0.22 }); }
  bipod() { this.play('tick', { kind: 'steel', gain: 0.6, delay: 0.12, pan: 0 }); this.play('tick', { kind: 'steel', gain: 0.5, delay: 0.15, pan: 0 }); }

  // Гильза падает на бетон/землю.
  casing(delay = 0.5, steel = false, vol = 1) {
    if (!this.ctx || this.muted) return;
    this.play('casing', { kind: steel ? 'steel' : 'brass', gain: 0.22 * vol, delay, pan: 0.35 + Math.random() * 0.3, wet: 0.1 });
  }

  // Попадание в стальную мишень: звон, приходит с задержкой по дальности.
  ding(dist, level = 1) {
    if (!this.ctx || this.muted) return;
    const c = this.ctx, t = c.currentTime + dist / 343;
    const a = Math.min(1, 12 / Math.max(6, dist)) * level;
    for (const [f, k] of [[820, 1], [2150, 0.6], [3710, 0.35], [5120, 0.2]]) {
      const o = c.createOscillator(); o.frequency.value = f * (0.98 + Math.random() * 0.04);
      const g = c.createGain(); this.env(g, t, 0.001, 0.22 * a * k, 0.18 / (1 + k * 0.2), 1.4);
      o.connect(g); this.out(g, 0.5);
      o.start(t); o.stop(t + 1.45);
    }
  }

  thump(dist) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + dist / 343;
    const a = Math.min(1, 10 / Math.max(6, dist));
    const c = this.ctx, s = this.src(this.pink, t, 0.2);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = c.createGain(); this.env(g, t, 0.003, 0.25 * a, 0.05, 0.2);
    s.connect(lp).connect(g); this.out(g, 0.3);
  }
}
