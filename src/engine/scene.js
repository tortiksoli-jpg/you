// Сцена: рендер, освещение, окружение и стрельбище с мишенями.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const GUN_Y = 1.42;

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function groundTex() {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#6b6552'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const v = 70 + Math.random() * 60;
      g.fillStyle = `rgba(${v + 20},${v + 12},${v - 8},${Math.random() * 0.35})`;
      const s = Math.random() * 3 + 0.5;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(60,70,40,${Math.random() * 0.22})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 30 + 6, 0, 7); g.fill();
    }
  });
}

export function createScene(canvasHost) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.75;

  // небо — вертикальный градиент на большой сфере
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x5d7690) }, mid: { value: new THREE.Color(0xb9c3c9) }, bot: { value: new THREE.Color(0x8c8a7c) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top, mid, bot; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > 0. ? mix(mid, top, pow(h, .55)) : mix(mid, bot, pow(-h, .4)); gl_FragColor = vec4(c, 1.); }',
  }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xb4bdc2, 60, 420);

  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x6a604a, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
  sun.position.set(-2.2, 5.5, 3.2);
  sun.target.position.set(0, GUN_Y, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -1.1; sc.right = 1.1; sc.top = 1.1; sc.bottom = -1.1; sc.near = 1; sc.far = 12;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.012;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0xd7e4ff, 1.1);
  rim.position.set(1.8, 2.4, -3.2);
  rim.target.position.set(0, GUN_Y, 0);
  scene.add(rim, rim.target);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
  fill.position.set(0.5, 0.6, 3);
  fill.target.position.set(0, GUN_Y, 0);
  scene.add(fill, fill.target);

  const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.008, 900);
  camera.position.set(-0.25, GUN_Y + 0.25, 1.35);

  const range = buildRange(scene);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  return { renderer, scene, camera, sun, range, env };
}

/* ---------------------------------------------------------------- стрельбище */

function buildRange(scene) {
  const grp = new THREE.Group();
  scene.add(grp);
  const gt = groundTex();
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
  gt.repeat.set(120, 120);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.96, color: 0xb8b0a0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.userData.surface = 'dirt';
  grp.add(ground);

  // огневой рубеж: бетонная площадка и стол
  const concrete = new THREE.MeshStandardMaterial({ color: 0x9a9892, roughness: 0.9 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(6, 0.12, 5), concrete);
  pad.position.set(-0.8, 0.06, 0); pad.receiveShadow = true;
  grp.add(pad);
  const woodM = new THREE.MeshStandardMaterial({ color: 0x6d5236, roughness: 0.8 });
  const metalM = new THREE.MeshStandardMaterial({ color: 0x2c2e30, roughness: 0.6, metalness: 0.6 });
  const bench = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 1.6), woodM);
  top.position.y = 0.92; top.castShadow = top.receiveShadow = true;
  bench.add(top);
  for (const [x, z] of [[-0.4, -0.7], [0.4, -0.7], [-0.4, 0.7], [0.4, 0.7]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), metalM);
    leg.position.set(x, 0.45, z); leg.castShadow = true;
    bench.add(leg);
  }
  bench.position.set(0.05, 0.12, 0.2);
  grp.add(bench);

  // вал-пулеулавливатель и боковые валы
  const dirt = new THREE.MeshStandardMaterial({ color: 0x7a6b52, roughness: 1 });
  const berm = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 120), dirt);
  berm.position.set(128, 3.2, 0); berm.rotation.z = 0.35; berm.userData.surface = 'dirt';
  grp.add(berm);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(130, 4, 8), dirt);
    side.position.set(62, 1.2, s * 26); side.rotation.x = s * 0.3; side.userData.surface = 'dirt';
    grp.add(side);
  }
  // деревья вдали
  const treeM = new THREE.MeshStandardMaterial({ color: 0x3f4d34, roughness: 1 });
  for (let i = 0; i < 60; i++) {
    const t = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 8 + Math.random() * 7, 7), treeM);
    const a = (i / 60) * Math.PI * 1.2 - 0.6;
    t.position.set(150 + Math.random() * 40, 4, Math.sin(a) * 90 + (Math.random() - 0.5) * 20);
    grp.add(t);
  }

  const targets = [];
  const steelM = new THREE.MeshStandardMaterial({ color: 0xd9d4c6, roughness: 0.55, metalness: 0.35 });
  const postM = new THREE.MeshStandardMaterial({ color: 0x3a3b3c, roughness: 0.7, metalness: 0.4 });
  const ipsc = new THREE.Shape();
  // силуэт IPSC (м)
  ipsc.moveTo(-0.15, 0); ipsc.lineTo(0.15, 0); ipsc.lineTo(0.23, 0.12); ipsc.lineTo(0.23, 0.52);
  ipsc.lineTo(0.14, 0.6); ipsc.lineTo(0.08, 0.6); ipsc.lineTo(0.08, 0.76); ipsc.lineTo(-0.08, 0.76);
  ipsc.lineTo(-0.08, 0.6); ipsc.lineTo(-0.14, 0.6); ipsc.lineTo(-0.23, 0.52); ipsc.lineTo(-0.23, 0.12); ipsc.closePath();
  const ipscG = new THREE.ExtrudeGeometry(ipsc, { depth: 0.012, bevelEnabled: false });
  ipscG.translate(0, 0, -0.006);
  ipscG.rotateY(Math.PI / 2);
  const plateG = new THREE.CylinderGeometry(0.15, 0.15, 0.012, 32);
  plateG.rotateZ(Math.PI / 2);

  const addTarget = (x, z, kind, label) => {
    const t = new THREE.Group();
    t.position.set(x, 0, z);
    const hinge = new THREE.Group();
    hinge.position.y = kind === 'plate' ? 1.25 : 1.05;
    const plate = new THREE.Mesh(kind === 'plate' ? plateG : ipscG, steelM.clone());
    plate.position.y = kind === 'plate' ? -0.15 : -0.76;
    plate.castShadow = true;
    plate.userData.surface = 'steel';
    plate.userData.target = t;
    hinge.add(plate);
    t.add(hinge);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, hinge.position.y + 0.04, 0.05), postM);
    post.position.set(0.04, (hinge.position.y + 0.04) / 2, 0);
    t.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.5), postM);
    foot.position.y = 0.025; t.add(foot);
    if (label) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.36), new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(256, 102, (g, w, h) => {
        g.fillStyle = '#e8e3d4'; g.fillRect(0, 0, w, h); g.fillStyle = '#222'; g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, w / 2, h / 2 + 4);
      }) }));
      sign.position.set(-0.3, 0.3, z > 0 ? -0.6 : 0.6); sign.rotation.y = -Math.PI / 2;
      t.add(sign);
    }
    t.userData = { hinge, plate, swing: 0, vel: 0, kind };
    grp.add(t);
    targets.push(t);
    return t;
  };
  addTarget(15, 1.2, 'ipsc', '15 м');
  addTarget(15, -1.8, 'plate');
  addTarget(25, -0.6, 'ipsc', '25 м');
  addTarget(25, 2.4, 'plate');
  addTarget(50, 1.4, 'ipsc', '50 м');
  addTarget(50, -3.0, 'plate');
  addTarget(100, -1.0, 'ipsc', '100 м');
  addTarget(100, 3.5, 'ipsc');

  const hitables = [ground, berm, ...targets.map((t) => t.userData.plate)];
  grp.traverse((o) => { if (o.isMesh && o !== ground) o.receiveShadow = true; });

  const update = (dt) => {
    for (const t of targets) {
      const u = t.userData;
      u.vel += (-u.swing * 60 - u.vel * 4.5) * dt;
      u.swing += u.vel * dt;
      u.hinge.rotation.z = -u.swing;
    }
  };
  const hit = (t, energy) => { t.userData.vel += energy; };
  return { group: grp, targets, hitables, update, hit, ground };
}
