// Контекст, который получает каждая функция build() модели или модуля.
import * as THREE from 'three';
import * as G from './geo.js';
import * as C from './lib/common.js';
import { mount, railMount } from './mounts.js';

export function makeCtx(mats) {
  return {
    THREE, G, C, mats, mount, railMount,
    kit: () => new G.Kit(mats),
    // Узел, скрываемый при установке модуля с part.hides = [key]
    hideable(obj, key) { obj.userData.hideKey = key; return obj; },
  };
}
