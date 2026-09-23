// Приложение: связывает сцену, сборку оружия, эффекты, звук и интерфейс.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createScene, GUN_Y } from './scene.js';
import { createMaterials } from './materials.js';
import { makeCtx } from './ctx.js';
import { Assembler } from './mounts.js';

export async function boot(def, lib) {
  const host = document.getElementById('app');
  const S = createScene(host);
  const mats = createMaterials(S.env);
  const ctx = makeCtx(mats);
  const asm = new Assembler(def, lib, ctx);
  const rig = new THREE.Group();
  rig.position.set(0, GUN_Y, 0);
  S.scene.add(rig);
  const gun = asm.root;
  gun.scale.setScalar(0.001);
  rig.add(gun);
  asm.apply(def.defaults);

  const f = asm.base.focus || { center: [0, 0, 0], size: 900 };
  const controls = new OrbitControls(S.camera, S.renderer.domElement);
  controls.target.set(f.center[0] / 1000, GUN_Y + f.center[1] / 1000, f.center[2] / 1000);
  S.camera.position.set(controls.target.x - 0.1, controls.target.y + 0.12, controls.target.z + f.size / 1000 * 1.25);
  controls.enableDamping = true;
  controls.update();

  // Отладка: ?cfg={"optic":"t2_lrp"}&view=left|right|top|front|back|iso&zoom=1.5&cut=1
  const qs = new URLSearchParams(location.search);
  if (qs.get('cfg')) {
    try { asm.apply({ ...def.defaults, ...JSON.parse(qs.get('cfg')) }); } catch (e) { console.error('cfg', e); }
  }
  const setView = (v, zoom = 1) => {
    const t = controls.target, d = (f.size / 1000) * 1.25 / zoom;
    const V = { right: [0, 0.05, 1], left: [0, 0.05, -1], top: [0, 1, 0.001], front: [1, 0.1, 0.02], back: [-1, 0.1, 0.02], iso: [-0.5, 0.35, 0.8], isoL: [-0.5, 0.35, -0.8], under: [0, -1, 0.001] }[v] || [-0.1, 0.12, 1];
    const l = Math.hypot(...V);
    S.camera.position.set(t.x + V[0] / l * d, t.y + V[1] / l * d, t.z + V[2] / l * d);
    controls.update();
  };
  if (qs.get('view') || qs.get('zoom')) setView(qs.get('view'), +(qs.get('zoom') || 1));
  if (qs.get('at')) { const a = qs.get('at').split(',').map(Number); controls.target.set(a[0] / 1000, GUN_Y + a[1] / 1000, (a[2] || 0) / 1000); setView(qs.get('view'), +(qs.get('zoom') || 1)); }

  const boot = document.getElementById('boot');
  if (boot) boot.classList.add('off');

  const app = { S, asm, mats, ctx, rig, gun, controls, def, setView };
  window.__app = app;
  const loop = () => {
    controls.update();
    S.renderer.render(S.scene, S.camera);
    requestAnimationFrame(loop);
  };
  loop();
  return app;
}
