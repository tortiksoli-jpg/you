// АКМ: 7,62×39, ствол 415 мм, штампованная коробка с выштамповками над
// магазином, газовая камера с отводом 90°, компенсатор «косой срез» (М14×1 лев.).
import { akBase, akParts, akSlots } from './ak_common.js';

export default {
  id: 'akm',
  title: 'Автомат Калашникова модернизированный',
  short: 'АКМ',
  caliber: '7,62×39',
  cal: '762x39',
  thread: 'm14x1L',
  boltHold: false,
  specs: [['Ствол', '415 мм'], ['Длина', '880 мм'], ['Темп', '600 выстр/мин'], ['Масса', '3,1 кг']],
  base: { weight: 1950, length: 845, ergo: 44, recoilV: 118, recoilH: 112, moa: 3.2, velocity: 715, range: 350, loud: 161, flash: 75, adsTime: 300, rpm: 600, mag: 30 },
  audio: { cal: '762x39', mech: 1.0 },
  modes: ['safe', 'auto', 'semi'],
  build: (ctx) => akBase(ctx, { id: 'akm', steel: 'steel', dimples: true, gas45: false, bayonet: true }),
  slots: akSlots(),
  parts: akParts('akm'),
  defaults: {
    handguard: 'hg_akm', muzzle: 'slant', cover: 'cover_std', sidemount: null, optic: null, magnifier: null,
    under: null, tacRight: null, tacLeft: null, mag: 'mag762_steel', pgrip: 'grip_akm', stock: 'stock_akm',
  },
};
