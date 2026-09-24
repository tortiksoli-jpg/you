/* Проверка геометрии бойца без браузера: вынимает модули util/geobuf/
   skeleton/soldier из game/start.html и строит все варианты головы.
   Запуск: node game/tools/check-soldier.cjs */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'start.html'), 'utf8');

function mod(name) {
  const a = html.indexOf('МОДУЛЬ: ' + name);
  if (a < 0) throw new Error('нет модуля ' + name);
  const start = html.lastIndexOf('/* ====', a);
  const nx = html.indexOf('МОДУЛЬ: ', a + 10);
  const end = html.lastIndexOf('/* ====', nx);
  return html.slice(start, end);
}
global.self = global;
for (const m of ['util.js', 'geobuf.js', 'skeleton.js', 'soldier.js']) {
  (0, eval)(mod(m).replace(/typeof module !== 'undefined'/g, 'false'));
}
const SK = self.GSkel, S = self.GSoldier;
const M = SK.metrics(1.8, 1);
const bones = SK.build(M);
const BI = SK.indexOf(bones);
const rest = SK.restWorld(bones);

let fail = 0;
for (const [head, mask] of [['helmet', true], ['boonie', true], ['helmet', false]]) {
  const t0 = Date.now();
  const G = S.newGroups();
  S.buildSoldier(G, M, BI, rest, { seed: 1701, head, mask });
  let tot = 0;
  for (const k of S.GROUPS) {
    const b = G[k], n = b.count();
    tot += n;
    if (b.pos.some((x) => !Number.isFinite(x))) { console.log(`  ${k}: NaN в координатах`); fail++; }
    if (b.index.some((ix) => ix >= n)) { console.log(`  ${k}: индекс вне буфера`); fail++; }
    for (let i = 0; i < b.skinWeight.length; i += 4) {
      const s = b.skinWeight[i] + b.skinWeight[i + 1] + b.skinWeight[i + 2] + b.skinWeight[i + 3];
      if (Math.abs(s - 1) > 1e-3) { console.log(`  ${k}: сумма весов ${s.toFixed(3)} у вершины ${i / 4}`); fail++; break; }
    }
  }
  console.log(`${head}${mask ? '+балаклава' : ''}: ${tot} вершин, ${Date.now() - t0} мс`);
}
if (fail) { console.log('ОШИБКИ:', fail); process.exit(1); }
console.log('ok');
