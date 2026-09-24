// Материалы и процедурные текстуры. UV всех деталей — в миллиметрах,
// поэтому повтор текстуры задаётся в «мм на тайл».
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function valueNoise(size, cells, seed) {
  const r = rng(seed);
  const grid = new Float32Array((cells + 1) * (cells + 1));
  for (let i = 0; i < grid.length; i++) grid[i] = r();
  for (let i = 0; i <= cells; i++) { grid[i * (cells + 1) + cells] = grid[i * (cells + 1)]; grid[cells * (cells + 1) + i] = grid[i]; }
  const out = new Float32Array(size * size);
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = (x / size) * cells, gy = (y / size) * cells;
    const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = sm(gx - x0), fy = sm(gy - y0);
    const g = (i, j) => grid[j * (cells + 1) + i];
    const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * fx;
    const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * fx;
    out[y * size + x] = a + (b - a) * fy;
  }
  return out;
}

function fbm(size, octaves, seed, base = 4) {
  const out = new Float32Array(size * size);
  let amp = 1, tot = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(size, base << o, seed + o * 17);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

function toTex(size, fill, srgb) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const [r, g, b] = fill(i);
    img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function normalFrom(h, size, strength) {
  return toTex(size, (i) => {
    const x = i % size, y = (i / size) | 0;
    const hx = h[y * size + ((x + 1) % size)] - h[y * size + ((x - 1 + size) % size)];
    const hy = h[((y + 1) % size) * size + x] - h[((y - 1 + size) % size) * size + x];
    let nx = -hx * strength, ny = -hy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    return [((nx / l) * 0.5 + 0.5) * 255, ((ny / l) * 0.5 + 0.5) * 255, ((nz / l) * 0.5 + 0.5) * 255];
  });
}

function roughFrom(h, size, lo, hi) {
  return toTex(size, (i) => { const v = (lo + (hi - lo) * h[i]) * 255; return [v, v, v]; });
}

function makeTextures() {
  const S = 256;
  const coarse = fbm(S, 5, 11, 4);
  const fine = fbm(S, 3, 77, 32);
  const stipple = fbm(S, 2, 123, 64);
  const brushed = new Float32Array(S * S);
  const br = fbm(S, 4, 5, 8);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) brushed[y * S + x] = br[y * S + ((x * 7) % S)] * 0.3 + br[((y * 3) % S) * S + x] * 0.7;
  const mix = new Float32Array(S * S);
  for (let i = 0; i < mix.length; i++) mix[i] = coarse[i] * 0.55 + fine[i] * 0.45;

  // Клеёная берёза (АКМ) / орех: прямые волокна вдоль U, тонкие слои шпона,
  // редкие мягкие «разводы» — без мультяшных колец.
  const streak = (() => {
    const n = fbm(S, 4, 555, 16), out = new Float32Array(S * S), R = 18;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let a = 0;
      for (let d = -R; d <= R; d++) a += n[y * S + ((x + d + S) % S)];
      out[y * S + x] = a / (2 * R + 1);
    }
    return out;
  })();
  const woodVal = (i) => {
    const y = ((i / S) | 0) / S;
    const ply = 0.5 + 0.5 * Math.sin((y + coarse[i] * 0.06) * Math.PI * 2 * 28);
    return (streak[i] - 0.5) * 1.6 + (ply - 0.5) * 0.12 + (coarse[i] - 0.5) * 0.25;
  };
  const wood = (hue) => toTex(S, (i) => {
    const k = 0.9 + woodVal(i) * 0.5;
    return [hue[0] * k, hue[1] * k, hue[2] * k];
  }, true);
  const woodH = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) woodH[i] = woodVal(i) * 0.5 + 0.5;

  return {
    rough: roughFrom(mix, S, 0.72, 1.0),
    roughStrong: roughFrom(coarse, S, 0.55, 1.0),
    roughBrushed: roughFrom(brushed, S, 0.7, 1.0),
    nMetal: normalFrom(fine, S, 1.4),
    nCast: normalFrom(mix, S, 3.2),
    nPoly: normalFrom(stipple, S, 5.5),
    nWood: normalFrom(woodH, S, 1.6),
    woodBirch: wood([100, 42, 24]),
    woodWalnut: wood([92, 58, 36]),
  };
}

// Износ и неоднородность поверхности (шейдерная надстройка над MeshStandard/Physical):
//  • потёртости на рёбрах: кривизна поверхности считается по производным нормали
//    в экранном пространстве, нормированным на размер пикселя в метрах, — не зависит
//    от расстояния; на фасках и мелких деталях проступает металл / светлый полимер;
//  • крупные пятна: засаленность, неравномерная матовость и оттенок покрытия
//    (3D-шум в координатах детали, мм).
const WEAR_GLSL = `
varying vec3 vObjP;
uniform float uWear, uWearMetal, uWearRough, uGrime;
uniform vec3 uWearCol;
float wH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float wN(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wH(i), wH(i + vec3(1, 0, 0)), f.x), mix(wH(i + vec3(0, 1, 0)), wH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(wH(i + vec3(0, 0, 1)), wH(i + vec3(1, 0, 1)), f.x), mix(wH(i + vec3(0, 1, 1)), wH(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}`;
function addWear(mat, o) {
  const U = {
    uWear: { value: o.wear ?? 0.6 }, uWearMetal: { value: o.metal ?? mat.metalness }, uWearRough: { value: o.rough ?? 0.35 },
    uGrime: { value: o.grime ?? 1 }, uWearCol: { value: new THREE.Color(o.col ?? 0x8f9296) },
  };
  mat.userData.wear = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + WEAR_GLSL)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      {
        vec3 nn = normalize(vNormal);
        float px = max(length(fwidth(vViewPosition)), 1e-6);
        float curv = length(fwidth(nn)) / px;               // 1/м
        float brk = wN(vObjP * 0.45) * 0.65 + wN(vObjP * 2.1) * 0.35;
        float edge = smoothstep(170.0, 750.0, curv) * smoothstep(0.3, 0.6, brk);
        float m = clamp(edge * uWear, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uWearCol, m);
        metalnessFactor = mix(metalnessFactor, uWearMetal, m);
        roughnessFactor = mix(roughnessFactor, uWearRough, m);
        float g1 = wN(vObjP * 0.018 + 3.1), g2 = wN(vObjP * 0.06 + 11.7);
        roughnessFactor = clamp(roughnessFactor * mix(1.0, 0.8 + 0.4 * g1, uGrime), 0.04, 1.0);
        diffuseColor.rgb *= mix(1.0, 0.93 + 0.14 * g2, uGrime);
      }`);
  };
  mat.customProgramCacheKey = () => 'wear';
  return mat;
}

export function createMaterials(envMap) {
  const tex = makeTextures();
  const rep = (t, mm) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(1 / mm, 1 / mm); return c; };
  const R = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);

  const metal = (color, rough, metal, o = {}) => std({
    color, roughness: rough, metalness: metal,
    roughnessMap: rep(o.brushed ? tex.roughBrushed : tex.rough, o.tile ?? 40),
    normalMap: rep(o.cast ? tex.nCast : tex.nMetal, o.tile ?? 30), normalScale: new THREE.Vector2((o.ns ?? 0.35) * 0.45, (o.ns ?? 0.35) * 0.45),
    envMapIntensity: o.env ?? 1,
  });
  const poly = (color, rough, o = {}) => std({
    color, roughness: rough, metalness: 0,
    roughnessMap: rep(tex.rough, 50), normalMap: rep(tex.nPoly, o.tile ?? 14), normalScale: new THREE.Vector2((o.ns ?? 0.45) * 0.55, (o.ns ?? 0.45) * 0.55),
    envMapIntensity: o.env ?? 0.8,
  });

  // металл
  R.steel = metal(0x2b2c2e, 0.38, 0.82, { ns: 0.18, tile: 18 }); // воронёная сталь
  R.steelPark = metal(0x353536, 0.62, 0.55, { cast: true, ns: 0.5 }); // фосфатирование
  R.steelWorn = metal(0x55565a, 0.36, 0.9, { brushed: true });
  R.steelBright = metal(0xa7a9ad, 0.26, 1.0, { brushed: true });
  R.chrome = metal(0xc9cbce, 0.14, 1.0);
  R.alu = metal(0x1f2022, 0.44, 0.6, { ns: 0.14, tile: 16 });  // анодированный алюминий
  R.aluGrey = metal(0x3b3d40, 0.44, 0.6, { ns: 0.25 });
  R.aluFde = metal(0x75634a, 0.58, 0.25, { cast: true, ns: 0.35, env: 0.8 });
  R.aluOd = metal(0x4c4b38, 0.6, 0.25, { cast: true });
  R.cast = metal(0x262729, 0.66, 0.55, { cast: true, ns: 0.7 });
  R.brass = metal(0xc8a050, 0.3, 1.0);
  R.copper = metal(0xb56d3e, 0.32, 1.0);
  R.steelCase = metal(0x5f5c3c, 0.45, 0.6);              // лакированная стальная гильза
  R.spring = metal(0x4a4b4e, 0.35, 0.9);

  // полимер, резина
  R.poly = poly(0x1b1b1c, 0.74);
  R.polySoft = poly(0x202021, 0.86, { ns: 0.7 });
  R.polyFde = poly(0x7f6c50, 0.78);
  R.polyFdeDark = poly(0x5c4e3a, 0.8);
  R.polyPlum = poly(0x4c2a22, 0.58, { ns: 0.3 });
  R.polyOd = poly(0x4a4a36, 0.78);
  R.polyGrey = poly(0x3c3e41, 0.7);
  R.polyTan = poly(0xb09a74, 0.78);
  R.rubber = poly(0x141414, 0.92, { ns: 0.9, tile: 14 });
  R.bakelite = std({ color: 0x4a1c0e, roughness: 0.4, metalness: 0, normalMap: rep(tex.nCast, 60), normalScale: new THREE.Vector2(0.2, 0.2), roughnessMap: rep(tex.rough, 60) });

  // дерево
  R.wood = phys({ color: 0xffffff, map: rep(tex.woodBirch, 160), roughness: 0.52, metalness: 0,
    normalMap: rep(tex.nWood, 160), normalScale: new THREE.Vector2(0.15, 0.15), clearcoat: 0.3, clearcoatRoughness: 0.35 });
  R.woodDark = phys({ color: 0xffffff, map: rep(tex.woodWalnut, 160), roughness: 0.5, metalness: 0,
    normalMap: rep(tex.nWood, 160), normalScale: new THREE.Vector2(0.25, 0.25), clearcoat: 0.3, clearcoatRoughness: 0.45 });

  // стекло
  const glass = (color, op) => phys({ color, roughness: 0.04, metalness: 0.1, transparent: true, opacity: op,
    depthWrite: false, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide });
  R.glass = glass(0xb8d4e4, 0.08);
  R.glassAmber = glass(0xe0b070, 0.1);
  R.glassRed = glass(0xe8a090, 0.09);
  R.glassBlue = glass(0x8aa8e8, 0.1);
  R.glassDark = glass(0x223344, 0.55);
  R.lensBlack = std({ color: 0x050607, roughness: 0.25, metalness: 0.2 });

  // светящиеся
  R.emRed = std({ color: 0x220000, emissive: 0xff2a1a, emissiveIntensity: 3, roughness: 0.4 });
  R.emGreen = std({ color: 0x002200, emissive: 0x6dff5a, emissiveIntensity: 2.5, roughness: 0.4 });
  R.tritium = std({ color: 0x1a2a10, emissive: 0x8cff6a, emissiveIntensity: 1.2, roughness: 0.4 });
  R.lampLens = std({ color: 0xdde6ee, emissive: 0xfff3dc, emissiveIntensity: 0, roughness: 0.08, metalness: 0.2 });
  R.laserLens = std({ color: 0x331010, emissive: 0xff2010, emissiveIntensity: 0, roughness: 0.1 });
  R.irLens = std({ color: 0x151515, roughness: 0.05, metalness: 0.4 });
  // люминофор светодиода: жёлтый кристалл под куполом, светится при включении
  R.ledPhos = std({ color: 0xcfc07a, emissive: 0xfff3dc, emissiveIntensity: 0, roughness: 0.45 });
  // отражатель с фактурой «апельсиновая корка» (OP): блики размыты — серебристый, а не чёрное зеркало
  R.reflector = std({ color: 0xe6e8ec, roughness: 0.22, metalness: 1, emissive: 0xfff3dc, emissiveIntensity: 0, side: THREE.DoubleSide, envMapIntensity: 2.4 });
  R.white = std({ color: 0xe8e6e0, roughness: 0.5 });
  R.paintRed = std({ color: 0xb4241c, roughness: 0.5 });
  R.paintWhite = std({ color: 0xdedbd2, roughness: 0.55 });
  R.paper = std({ color: 0xe9e3d3, roughness: 0.95 });
  R.target = std({ color: 0xcfc8b6, roughness: 0.6, metalness: 0.2 });

  // Износ по материалам: воронение стирается до светлой стали, анодировка — до
  // серебристого алюминия, песочная краска SCAR — до тёмного металла, полимер — светлеет.
  const W = {
    steel: { col: 0x8e9398, metal: 1, rough: 0.3, wear: 0.75 },
    steelPark: { col: 0x6c6e71, metal: 0.9, rough: 0.38, wear: 0.55 },
    steelWorn: { col: 0xa9adb2, metal: 1, rough: 0.28, wear: 0.5 },
    alu: { col: 0x8b8e94, metal: 1, rough: 0.3, wear: 0.4 },
    aluGrey: { col: 0x9a9da2, metal: 1, rough: 0.3, wear: 0.4 },
    aluFde: { col: 0x8f8c86, metal: 0.95, rough: 0.35, wear: 0.45 },
    aluOd: { col: 0x8f8c86, metal: 0.95, rough: 0.35, wear: 0.45 },
    cast: { col: 0x7d7f82, metal: 0.95, rough: 0.35, wear: 0.35 },
    poly: { col: 0x3a3a3c, metal: 0, rough: 0.5, wear: 0.55 },
    polySoft: { col: 0x3a3a3c, metal: 0, rough: 0.6, wear: 0.35 },
    polyFde: { col: 0xa89272, metal: 0, rough: 0.55, wear: 0.5 },
    polyFdeDark: { col: 0x7c6b52, metal: 0, rough: 0.55, wear: 0.5 },
    polyTan: { col: 0xb6a27f, metal: 0, rough: 0.55, wear: 0.5 },
    polyOd: { col: 0x6a6a52, metal: 0, rough: 0.55, wear: 0.5 },
    polyGrey: { col: 0x626468, metal: 0, rough: 0.55, wear: 0.5 },
    polyPlum: { col: 0x6e3c30, metal: 0, rough: 0.4, wear: 0.45 },
    bakelite: { col: 0x8a4a2a, metal: 0, rough: 0.35, wear: 0.4 },
    rubber: { col: 0x2e2e2f, metal: 0, rough: 0.7, wear: 0.2, grime: 0.6 },
  };
  for (const [k, o] of Object.entries(W)) if (R[k]) addWear(R[k], o);

  const cache = new Map();
  return {
    tex,
    all: R,
    get(key) {
      if (typeof key !== 'string') return key;
      if (R[key]) return R[key];
      if (cache.has(key)) return cache.get(key);
      // "poly#556b2f" — полимер произвольного цвета
      const [base, col] = key.split('#');
      if (R[base] && col) {
        const m = R[base].clone();
        m.color = new THREE.Color('#' + col);
        if (W[base]) addWear(m, W[base]);
        cache.set(key, m);
        return m;
      }
      console.warn('нет материала', key);
      return R.poly;
    },
  };
}
