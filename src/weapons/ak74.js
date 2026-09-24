// АК-74М: 5,45×39, ствол 415 мм, газовая камера 45°, двухкамерный ДТК
// (М24×1,5), полимерная фурнитура, складной влево приклад, боковая планка.
import { akBase, akParts, akSlots } from './ak_common.js';

export default {
  id: 'ak74',
  title: 'АК-74М',
  short: 'АК-74М',
  caliber: '5,45×39',
  cal: '545',
  thread: 'm24x1.5',
  boltHold: false,
  specs: [['Ствол', '415 мм'], ['Длина', '943 / 700 мм'], ['Темп', '650 выстр/мин'], ['Масса', '3,4 кг']],
  base: { weight: 2020, length: 860, ergo: 48, recoilV: 92, recoilH: 90, moa: 2.4, velocity: 900, range: 450, loud: 158, flash: 60, adsTime: 290, rpm: 650, mag: 30 },
  audio: { cal: '545', mech: 0.95 },
  modes: ['safe', 'auto', 'semi'],
  build: (ctx) => akBase(ctx, { id: 'ak74', steel: 'steel', dimples: true, gas45: true, bayonet: true }),
  slots: akSlots(),
  parts: akParts('ak74'),
  defaults: {
    handguard: 'hg_74m', muzzle: 'brake74', cover: 'cover_std', sidemount: null, optic: null, magnifier: null,
    under: null, tacRight: null, tacLeft: null, mag: 'mag545_plum', pgrip: 'grip_74m', stock: 'stock_74m',
  },
};
