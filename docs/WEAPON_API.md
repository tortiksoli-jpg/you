# Контракт модели оружия

Каждое оружие — модуль `src/weapons/<id>.js`, экспортирующий `default` объект:

```js
export default {
  id: 'm416', title: 'HK416 A5', short: 'M416', caliber: '5,56×45 NATO',
  specs: [['Масса', '3,49 кг'], ...],           // карточка в интерфейсе
  thread: '1/2x28',                             // резьба ствола (для фильтра дульных устройств)
  base: { weight, length, ergo, recoilV, recoilH, moa, velocity, range, loud, flash, adsTime, rpm, mag },
  audio: { cal: '556' | '545' | '762x39' | '762x51', rpm, body: 0..1, crack: 0..1 },
  modes: ['safe', 'semi', 'auto'],
  build(ctx) -> {
    root,                        // THREE.Group, мм, +X к дулу, +Y вверх, +Z правый борт, ось канала Y=0 Z=0
    nodes: { carrier, charger, trigger, selector, catch?, dustCover?, hammer? },
    anim: { carrierTravel: мм, chargerTravel: мм, selector: {safe: град, semi, auto}, axis ... },
    eject: { p: [x,y,z], dir: [x,y,z] },       // окно выброса гильз
    muzzle: [x,0,0],                            // дульный срез без ДТК
    irons?: { rear: [x,y,z], front: [x,y,z], fold?: [...] },  // штатные прицельные
    eyeX,                                       // положение глаза при прикладке (x, мм)
    focus: { center: [x,y,z], size: мм },       // для камеры
  },
  slots: [ { id, label, group, accepts: [cat...], mount: 'mountId' | rails: ['railId', ...], prefer, thread?, iface? } ],
  parts: [ ...модули, специфичные для оружия (цевья, приклады, магазины, ДТК) ],
  defaults: { slotId: partId | null },
  keepOut: [ { axis: 'top', x0, x1, label } ],  // зоны планки, куда ничего нельзя ставить
};
```

## Крепления

`ctx.mount({ id, type, p, face })` или `ctx.railMount(id, p, face, slots)` создаёт `Object3D`.
Начало узла — рабочая поверхность: верх планки над центром **первого** паза, торец
резьбы, посадка магазина. `face` поворачивает узел так, что +Y смотрит наружу.
Модуль строится с началом в той же точке, поэтому ничего не «висит».

Типы: `pica` (Пикатинни), `thread`, `magwell`, `stock`, `grip`, `hg` (цевьё),
`dovetail` (АК «ласточкин хвост»), `cover` (крышка ствольной коробки) и т. д.
Модули могут сами создавать крепления (цевьё с планками, кронштейн).

## Модуль

```js
{ id, cat, name, desc, stats: { weight: +г, ergo: ±, 'recoilV%': ±, loud: ±дБ, ... },
  fit: { thread: ['1/2x28'] , iface: ['ar'] }, only: ['m416'],
  foot: [назад, вперёд], body: [назад, вперёд],   // мм вдоль планки от начала модуля
  mountTypes: ['pica'], hides: ['hideKey'], needs(config, asm) -> bool,
  build(ctx) -> { root, sight?, light?, laser?, muzzle?, mag?, bipod?, flip? } }
```

`sight`: `{ y, z, x0, x1, r, mag, zoom?: [1,6], reticle, eyeRelief, lens: Mesh, node? }` — ось в локальных мм модуля (или узла `node`).
`sights`: `[{ label, ...как sight }]` — дополнительные прицелы модуля (RMR на ACOG), переключаются V.
`muzzle`: `{ x, kind: 'fh'|'brake'|'comp'|'supp'|'bare', flash: 0..1 }`.
`light`: `{ p, lens: Mesh }`, `laser`: `{ p, lens: Mesh }`.
`mag`: `{ cap, rounds: Group }`.
`irons`: `{ rear: [x,y,z] }` или `{ front: [x,y,z] }` — точка диоптра/прорези целика и вершины мушки.
`flip`: `{ node, angle }` — откидная часть (складывается поворотом вокруг Z на angle°, когда есть прицел).
`fold`: `{ node, axis: 'y', angle }` — складной приклад (поворот узла; шарнир — начало узла).
`cheek`: `{ x, y }` — точка щеки на прикладе (в координатах модуля).
`bipod`: `{ legs: [Object3D...], angle }` — ножки сошек, раскрываются поворотом вокруг Z.
`charger`: `{ travel }` — отдельная рукоять заряжания (AR), движется назад при перезарядке.

Узлы `nodes` базы (все необязательны, но желательны):
`carrier` — затворная рама, при выстреле уезжает на `anim.carrierTravel` мм по −X
(у АК рукоять затвора — часть рамы; у SCAR рукоять тоже ходит с рамой — сделайте её дочерней);
`trigger` — крючок, начало узла на оси вращения (вращение вокруг Z);
`selector` — переводчик, начало на оси, углы в `anim.selector = {safe, semi, auto}` (градусы вокруг Z);
`hammer` — курок (необязателен).
Крепление магазина может иметь `rock: [px, py, deg]` — АК-магазин вставляется «с зацепом»:
поворот на deg вокруг точки (px, py) в координатах крепления.

## Реалистичность

Размеры — реальные, в мм. Детали, которые видно на фото, должны быть: заклёпки/штифты,
выштамповки, антабки, фаски, насечки, винты. Сплошная «коробка» без деталей — плохо.
Внешний вид проверяйте скриншотами: `node /tmp/tools/shot.mjs <abs path html> <out.png> 1400 860 7000`,
URL-параметры: `?view=right|left|top|front|back|iso|isoL|under&zoom=2&at=x,y,z&cfg={"slot":"part"}`.
Сборка: `node build.mjs --only=akm` (id из build.mjs).

## Общая библиотека (src/engine/lib) — идентификаторы

Оптика на Пикатинни (`cat: 'optic'`): `t2_low` (ось 20 мм над планкой), `t2_lrp` (39 мм), `exps3` (39 мм), `compm4`, `mro`,
`rmr_riser` (39 мм), `hs510c`, `xps2` (36 мм), `pk120` (40 мм); на «ласточкин хвост» АК: `okp7d`;
`acog` (4×, ось 38 мм), `lpvo` (1–6×, ось 40 мм). Увеличитель: `mag3x` (ось 39 мм).
Складные целик/мушка: `mbus_rear`, `mbus_front` (линия прицеливания 35,5 мм над планкой).
Дульные: `sf_socom556`, `a2_fh`, `warcomp556`, `pa_brake556` (резьба `1/2x28`), `sf_socom762`, `warcomp762`,
`pa_brake762` (`5/8x24`); только HK416: `bt_rotex_hk`, `kac_nt4`.
Фонари `cat:'light'`: `m600`, `m300`. ЛЦУ `cat:'laser'`: `peq15`, `ls321`.
Рукоятки `cat:'foregrip'`: `rvg`, `bcm_vg`, `afg2`, `handstop`. Сошки `cat:'bipod'`: `harris`.
Пистолетные рукояти `cat:'pgrip'`, `fit.iface: ['ar']`: `hk_v2`, `moe_grip`, `bcm_mod3`.
