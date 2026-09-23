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

  // Ламинированная берёза / орех: волокна вдоль U с кольцами.
  const wood = (hue) => {
    const n = fbm(S, 4, 301, 4), n2 = fbm(S, 3, 555, 16);
    return toTex(S, (i) => {
      const x = i % S, y = (i / S) | 0;
      const v = y / S + n[i] * 0.35 + n2[i] * 0.04;
      const ring = Math.pow(Math.abs(Math.sin(v * Math.PI * 9)), 6);
      const fib = n2[(y * S + ((x * 5) % S))] * 0.25;
      const k = 0.78 + fib - ring * 0.32 + (coarse[i] - 0.5) * 0.18;
      return [hue[0] * k, hue[1] * k, hue[2] * k];
    }, true);
  };
  const woodH = new Float32Array(S * S);
  { const n = fbm(S, 4, 301, 4); for (let i = 0; i < S * S; i++) { const y = ((i / S) | 0) / S; woodH[i] = Math.pow(Math.abs(Math.sin((y + n[i] * 0.35) * Math.PI * 9)), 6); } }

  return {
    rough: roughFrom(mix, S, 0.72, 1.0),
    roughStrong: roughFrom(coarse, S, 0.55, 1.0),
    roughBrushed: roughFrom(brushed, S, 0.7, 1.0),
    nMetal: normalFrom(fine, S, 1.4),
    nCast: normalFrom(mix, S, 3.2),
    nPoly: normalFrom(stipple, S, 5.5),
    nWood: normalFrom(woodH, S, 1.6),
    woodBirch: wood([196, 92, 48]),
    woodWalnut: wood([120, 70, 40]),
  };
}

export function createMaterials(envMap) {
  const tex = makeTextures();
  const rep = (t, mm) => { const c = t.clone(); c.needsUpdate = true; c.repeat.set(1 / mm, 1 / mm); return c; };
  const R = {};
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);

  const metal = (color, rough, metal, o = {}) => std({
    color, roughness: rough, metalness: metal,
    roughnessMap: rep(o.brushed ? tex.roughBrushed : tex.rough, o.tile ?? 70),
    normalMap: rep(o.cast ? tex.nCast : tex.nMetal, o.tile ?? 70), normalScale: new THREE.Vector2(o.ns ?? 0.35, o.ns ?? 0.35),
    envMapIntensity: o.env ?? 1,
  });
  const poly = (color, rough, o = {}) => std({
    color, roughness: rough, metalness: 0,
    roughnessMap: rep(tex.rough, 50), normalMap: rep(tex.nPoly, o.tile ?? 24), normalScale: new THREE.Vector2(o.ns ?? 0.45, o.ns ?? 0.45),
    envMapIntensity: o.env ?? 0.8,
  });

  // металл
  R.steel = metal(0x2b2c2e, 0.42, 0.8);                  // воронёная сталь
  R.steelPark = metal(0x353536, 0.62, 0.55, { cast: true, ns: 0.5 }); // фосфатирование
  R.steelWorn = metal(0x55565a, 0.36, 0.9, { brushed: true });
  R.steelBright = metal(0xa7a9ad, 0.26, 1.0, { brushed: true });
  R.chrome = metal(0xc9cbce, 0.14, 1.0);
  R.alu = metal(0x1f2022, 0.46, 0.55, { ns: 0.25 });     // анодированный алюминий
  R.aluGrey = metal(0x3b3d40, 0.44, 0.6, { ns: 0.25 });
  R.aluFde = metal(0x8f7a58, 0.58, 0.25, { cast: true, ns: 0.35, env: 0.8 });
  R.aluOd = metal(0x4c4b38, 0.6, 0.25, { cast: true });
  R.cast = metal(0x262729, 0.66, 0.55, { cast: true, ns: 0.7 });
  R.brass = metal(0xc8a050, 0.3, 1.0);
  R.copper = metal(0xb56d3e, 0.32, 1.0);
  R.steelCase = metal(0x5f5c3c, 0.45, 0.6);              // лакированная стальная гильза
  R.spring = metal(0x4a4b4e, 0.35, 0.9);

  // полимер, резина
  R.poly = poly(0x1b1b1c, 0.74);
  R.polySoft = poly(0x202021, 0.86, { ns: 0.7 });
  R.polyFde = poly(0x98845f, 0.78);
  R.polyFdeDark = poly(0x6f6048, 0.8);
  R.polyPlum = poly(0x4c2a22, 0.58, { ns: 0.3 });
  R.polyOd = poly(0x4a4a36, 0.78);
  R.polyGrey = poly(0x3c3e41, 0.7);
  R.polyTan = poly(0xb09a74, 0.78);
  R.rubber = poly(0x141414, 0.92, { ns: 0.9, tile: 14 });
  R.bakelite = std({ color: 0x7a2c10, roughness: 0.42, metalness: 0, normalMap: rep(tex.nCast, 60), normalScale: new THREE.Vector2(0.2, 0.2), roughnessMap: rep(tex.rough, 60) });

  // дерево
  R.wood = phys({ color: 0xffffff, map: rep(tex.woodBirch, 160), roughness: 0.52, metalness: 0,
    normalMap: rep(tex.nWood, 160), normalScale: new THREE.Vector2(0.25, 0.25), clearcoat: 0.35, clearcoatRoughness: 0.4 });
  R.woodDark = phys({ color: 0xffffff, map: rep(tex.woodWalnut, 160), roughness: 0.5, metalness: 0,
    normalMap: rep(tex.nWood, 160), normalScale: new THREE.Vector2(0.25, 0.25), clearcoat: 0.3, clearcoatRoughness: 0.45 });

  // стекло
  const glass = (color, op) => phys({ color, roughness: 0.04, metalness: 0.1, transparent: true, opacity: op,
    depthWrite: false, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide });
  R.glass = glass(0x9ec2d8, 0.16);
  R.glassAmber = glass(0xd6a35a, 0.2);
  R.glassRed = glass(0xe07a6a, 0.2);
  R.glassBlue = glass(0x6a8fe0, 0.22);
  R.glassDark = glass(0x223344, 0.55);
  R.lensBlack = std({ color: 0x050607, roughness: 0.25, metalness: 0.2 });

  // светящиеся
  R.emRed = std({ color: 0x220000, emissive: 0xff2a1a, emissiveIntensity: 3, roughness: 0.4 });
  R.emGreen = std({ color: 0x002200, emissive: 0x6dff5a, emissiveIntensity: 2.5, roughness: 0.4 });
  R.tritium = std({ color: 0x1a2a10, emissive: 0x8cff6a, emissiveIntensity: 1.2, roughness: 0.4 });
  R.lampLens = std({ color: 0xdde6ee, emissive: 0xfff3dc, emissiveIntensity: 0, roughness: 0.08, metalness: 0.2 });
  R.laserLens = std({ color: 0x331010, emissive: 0xff2010, emissiveIntensity: 0, roughness: 0.1 });
  R.irLens = std({ color: 0x151515, roughness: 0.05, metalness: 0.4 });
  R.white = std({ color: 0xe8e6e0, roughness: 0.5 });
  R.paintRed = std({ color: 0xb4241c, roughness: 0.5 });
  R.paintWhite = std({ color: 0xdedbd2, roughness: 0.55 });
  R.paper = std({ color: 0xe9e3d3, roughness: 0.95 });
  R.target = std({ color: 0xcfc8b6, roughness: 0.6, metalness: 0.2 });

  for (const m of Object.values(R)) if (envMap && m.envMap === null) m.envMap = null;

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
        cache.set(key, m);
        return m;
      }
      console.warn('нет материала', key);
      return R.poly;
    },
  };
}
