// Общая библиотека модулей для всех образцов.
import { OPTICS } from './optics.js';
import { MUZZLES } from './muzzle.js';
import { MUZZLES2 } from './muzzle2.js';
import { TACTICAL } from './tactical.js';
import { GRIPS } from './grips.js';

export const LIB = [...OPTICS, ...MUZZLES, ...MUZZLES2, ...TACTICAL, ...GRIPS];
