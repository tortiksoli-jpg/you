import { boot } from '../engine/app.js';
import { LIB } from '../engine/lib/index.js';
import def from '../weapons/ak74.js';
boot(def, LIB).catch((e) => { console.error(e); const b = document.getElementById('boot-t'); if (b) b.textContent = 'Ошибка: ' + e.message; });
