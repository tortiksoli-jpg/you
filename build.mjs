// Собирает каждое оружие в один самодостаточный HTML: общий движок + модель
// оружия склеиваются esbuild'ом, three.js подтягивается через importmap.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const WEAPONS = [
  { id: 'akm', file: 'akm.html' },
  { id: 'ak74', file: 'ak74_modular.html' },
  { id: 'm416', file: 'm416.html' },
  { id: 'scar', file: 'scar-h.html' },
];
const THREE_VER = '0.166.1';
const watch = process.argv.includes('--watch');
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

mkdirSync('dist', { recursive: true });

function page(id, js) {
  const tpl = readFileSync('src/template.html', 'utf8');
  const css = readFileSync('src/engine/ui.css', 'utf8');
  const importmap = JSON.stringify({
    imports: {
      three: `https://unpkg.com/three@${THREE_VER}/build/three.module.js`,
      'three/addons/': `https://unpkg.com/three@${THREE_VER}/examples/jsm/`,
    },
  });
  return tpl
    .replace('/*CSS*/', () => css)
    .replace('/*IMPORTMAP*/', () => importmap)
    .replace('/*JS*/', () => js.replace(/<\/script/gi, '<\\/script'))
    .replace(/%ID%/g, id);
}

async function buildOne(w) {
  const opts = {
    entryPoints: [`src/entries/${w.id}.js`],
    bundle: true,
    format: 'esm',
    write: false,
    target: 'es2020',
    external: ['three', 'three/addons/*'],
    legalComments: 'none',
    charset: 'utf8',
  };
  const res = await build(opts);
  const js = res.outputFiles[0].text;
  writeFileSync(`dist/${w.file}`, page(w.id, js));
  console.log(`dist/${w.file}  ${(js.length / 1024).toFixed(0)} KB`);
}

const list = WEAPONS.filter((w) => !only || only.split(',').includes(w.id));
if (watch) {
  const { watch: fsWatch } = await import('node:fs');
  let t = null;
  const run = () => Promise.all(list.map(buildOne)).catch((e) => console.error(e.message));
  await run();
  fsWatch('src', { recursive: true }, () => { clearTimeout(t); t = setTimeout(run, 150); });
} else {
  await Promise.all(list.map(buildOne));
}
