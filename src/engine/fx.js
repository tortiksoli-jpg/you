// Эффекты: дульное пламя, дым, гильзы, попадания, луч ЛЦУ, фонарь.
import * as THREE from 'three';
import { caseGeo, CAL } from './lib/common.js';

function tex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const TEX = {};
function textures() {
  if (TEX.glow) return TEX;
  TEX.glow = tex(128, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.8)'); gr.addColorStop(0.5, 'rgba(255,255,255,.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  TEX.flash = tex(256, (g, s) => {
    g.translate(s / 2, s / 2);
    for (let i = 0; i < 9; i++) {
      g.rotate((Math.PI * 2) / 9 + Math.random() * 0.3);
      const gr = g.createLinearGradient(0, 0, s * (0.3 + Math.random() * 0.2), 0);
      gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,150,40,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -s * 0.04); g.lineTo(s * 0.48, 0); g.lineTo(0, s * 0.04); g.fill();
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.22);
    gr.addColorStop(0, 'rgba(255,255,235,1)'); gr.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, s * 0.22, 0, 7); g.fill();
  });
  TEX.jet = tex(256, (g, s) => {
    const gr = g.createRadialGradient(s * 0.2, s / 2, 0, s * 0.2, s / 2, s * 0.8);
    gr.addColorStop(0, 'rgba(255,245,215,1)'); gr.addColorStop(0.3, 'rgba(255,180,70,.8)'); gr.addColorStop(1, 'rgba(255,120,20,0)');
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(s * 0.45, s / 2, s * 0.45, s * 0.16, 0, 0, 7); g.fill();
  });
  TEX.smoke = tex(128, (g, s) => {
    for (let i = 0; i < 14; i++) {
      const x = s / 2 + (Math.random() - 0.5) * s * 0.35, y = s / 2 + (Math.random() - 0.5) * s * 0.35, r = s * (0.18 + Math.random() * 0.18);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(220,220,215,.22)'); gr.addColorStop(1, 'rgba(220,220,215,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
  });
  TEX.dust = tex(128, (g, s) => {
    for (let i = 0; i < 18; i++) {
      const x = s / 2 + (Math.random() - 0.5) * s * 0.4, y = s / 2 + (Math.random() - 0.5) * s * 0.4, r = s * (0.12 + Math.random() * 0.2);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(150,130,100,.5)'); gr.addColorStop(1, 'rgba(150,130,100,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
    }
  });
  TEX.hole = tex(64, (g, s) => {
    const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    gr.addColorStop(0, 'rgba(20,18,16,1)'); gr.addColorStop(0.35, 'rgba(40,36,30,.9)'); gr.addColorStop(0.6, 'rgba(120,110,95,.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, s, s);
  });
  return TEX;
}

const additive = (map, color, opacity = 1) => new THREE.SpriteMaterial({ map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

export class FX {
  constructor(scene, mats) {
    this.scene = scene;
    const T = textures();
    this.T = T;
    // дульное пламя
    this.flash = new THREE.Group();
    this.flash.visible = false;
    scene.add(this.flash);
    this.flashCore = new THREE.Sprite(additive(T.flash, 0xffd9a0));
    this.flashFront = [0, 1, 2].map(() => new THREE.Sprite(additive(T.glow, 0xffb35a, 0.9)));
    this.flashSide = [0, 1].map(() => new THREE.Sprite(additive(T.jet, 0xffc070, 0.95)));
    this.flash.add(this.flashCore, ...this.flashFront, ...this.flashSide);
    this.flashLight = new THREE.PointLight(0xffa850, 0, 6, 2);
    scene.add(this.flashLight);
    this.flashT = 0;
    // частицы
    this.parts = [];
    this.pool = [];
    // гильзы
    this.shells = [];
    this.shellMats = { brass: mats.get('brass'), steel: mats.get('steelCase') };
    this.shellGeo = {};
    // метки попаданий
    this.holes = [];
    // ЛЦУ
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0014, 1, 6, 1, true).translate(0, 0.5, 0).rotateZ(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.beam.visible = false; this.beam.frustumCulled = false;
    this.dot = new THREE.Sprite(additive(T.glow, 0xff3020, 1));
    this.dot.visible = false;
    scene.add(this.beam, this.dot);
    // фонарь
    this.spot = new THREE.SpotLight(0xfff1dc, 0, 60, 0.28, 0.55, 1.4);
    scene.add(this.spot, this.spot.target);
    this.lampGlow = new THREE.Sprite(additive(T.glow, 0xfff6e6, 0));
    this.lampGlow.scale.setScalar(0.07);
    scene.add(this.lampGlow);
    this.ray = new THREE.Raycaster();
  }

  muzzleFlash(pos, dir, kind, size = 1) {
    const s = kind === 'supp' ? 0.12 : kind === 'brake' ? 1.1 : kind === 'fh' ? 0.55 : 1;
    this.flash.position.copy(pos);
    this.flash.visible = true;
    this.flashT = 0.045 + Math.random() * 0.015;
    const k = s * size;
    this.flashCore.scale.setScalar(0.07 * k * (0.8 + Math.random() * 0.4));
    this.flashCore.material.rotation = Math.random() * 6.28;
    this.flashCore.material.opacity = kind === 'supp' ? 0.35 : 1;
    this.flashFront.forEach((sp, i) => {
      sp.position.copy(dir).multiplyScalar((0.03 + i * 0.04) * k);
      sp.scale.setScalar((0.07 - i * 0.015) * k * (0.8 + Math.random() * 0.5));
      sp.visible = kind !== 'supp';
    });
    // у тормоза и голого ствола — боковые струи
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
    this.flashSide.forEach((sp, i) => {
      const sgn = i ? 1 : -1;
      sp.visible = kind === 'brake';
      sp.position.copy(side).multiplyScalar(sgn * 0.04 * k).addScaledVector(dir, -0.01);
      sp.scale.set(0.09 * k, 0.04 * k, 1);
      sp.material.rotation = sgn > 0 ? 0 : Math.PI;
    });
    this.flashLight.position.copy(pos).addScaledVector(dir, 0.05);
    this.flashLight.intensity = kind === 'supp' ? 0.3 : 5 * k;
    // дым
    const n = kind === 'supp' ? 2 : 4;
    for (let i = 0; i < n; i++) {
      const v = dir.clone().multiplyScalar(0.4 + Math.random() * 0.9).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0.08 + Math.random() * 0.15, (Math.random() - 0.5) * 0.2));
      this.emit('smoke', pos.clone().addScaledVector(dir, 0.02 + Math.random() * 0.05), v, 1.4 + Math.random(), 0.03, 0.22, kind === 'supp' ? 0.5 : 0.9);
    }
  }

  portSmoke(pos, dir) {
    const v = dir.clone().multiplyScalar(0.12).add(new THREE.Vector3(0, 0.12, 0));
    this.emit('smoke', pos.clone(), v, 1.1, 0.015, 0.1, 0.5);
  }

  emit(kind, pos, vel, life, size, grow, alpha = 1) {
    let sp = this.pool.pop();
    if (!sp) {
      sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      this.scene.add(sp);
    }
    sp.material.map = kind === 'dust' ? this.T.dust : this.T.smoke;
    sp.material.opacity = alpha;
    sp.material.rotation = Math.random() * 6.28;
    sp.material.needsUpdate = true;
    sp.visible = true;
    sp.position.copy(pos);
    sp.scale.setScalar(size);
    this.parts.push({ sp, vel, life, t: 0, size, grow, alpha });
  }

  shell(pos, vel, cal, quat) {
    const c = CAL[cal] || CAL['556'];
    if (!this.shellGeo[cal]) {
      const g = caseGeo(cal);
      g.scale(0.001, 0.001, 0.001);
      g.translate(-c.L * 0.0005, 0, 0);
      this.shellGeo[cal] = g;
    }
    let s = this.shells.find((x) => !x.alive);
    if (!s) {
      if (this.shells.length > 70) s = this.shells.shift(); else s = { mesh: new THREE.Mesh(this.shellGeo[cal], this.shellMats.brass) };
      s.mesh.castShadow = true;
      this.scene.add(s.mesh);
      this.shells.push(s);
    }
    s.mesh.geometry = this.shellGeo[cal];
    s.mesh.material = c.steel ? this.shellMats.steel : this.shellMats.brass;
    s.mesh.visible = true;
    s.mesh.position.copy(pos);
    s.mesh.quaternion.copy(quat);
    s.vel = vel;
    s.spin = new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60, 20 + Math.random() * 40);
    s.alive = true; s.t = 0; s.bounced = 0; s.steel = c.steel;
    return s;
  }

  // Попадание: пыль по земле/валу, искры и отметина на стали.
  impact(hit, surface) {
    const p = hit.point, n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
    if (surface === 'steel') {
      for (let i = 0; i < 3; i++) this.emit('dust', p.clone().addScaledVector(n, 0.02), n.clone().multiplyScalar(0.4).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.5, (Math.random() - 0.5) * 0.6)), 0.5, 0.06, 0.25, 0.5);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ map: this.T.hole, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      hit.object.worldToLocal(hole.position.copy(p).addScaledVector(n, 0.0015));
      const ln = n.clone().transformDirection(new THREE.Matrix4().copy(hit.object.matrixWorld).invert());
      hole.lookAt(hole.position.clone().add(ln));
      hit.object.add(hole);
      this.holes.push(hole);
      if (this.holes.length > 80) { const h = this.holes.shift(); h.parent?.remove(h); }
    } else {
      for (let i = 0; i < 4; i++) this.emit('dust', p.clone(), n.clone().multiplyScalar(0.8 + Math.random()).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.8, (Math.random() - 0.5) * 0.8)), 0.9 + Math.random() * 0.6, 0.08, 0.5, 0.8);
    }
  }

  setLaser(on, pos, dir, hitables) {
    this.beam.visible = this.dot.visible = on;
    if (!on) return;
    this.ray.set(pos, dir);
    this.ray.far = 250;
    const h = this.ray.intersectObjects(hitables, false)[0];
    const d = h ? h.distance : 250;
    this.beam.position.copy(pos);
    this.beam.scale.set(d, 1, 1);
    this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);
    this.dot.position.copy(pos).addScaledVector(dir, d - 0.01);
    this.dot.scale.setScalar(0.015 + d * 0.0022);
  }

  setLight(on, pos, dir, lumens = 1000) {
    this.spot.intensity = on ? 30 * (lumens / 1000) : 0;
    this.lampGlow.material.opacity = on ? 0.9 : 0;
    if (!on) return;
    this.spot.position.copy(pos);
    this.spot.target.position.copy(pos).addScaledVector(dir, 10);
    this.lampGlow.position.copy(pos).addScaledVector(dir, 0.004);
  }

  update(dt, onShellBounce) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flash.visible = false; this.flashLight.intensity = 0; } else this.flashLight.intensity *= 0.6;
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.sp.visible = false; this.pool.push(p.sp); this.parts.splice(i, 1); continue; }
      p.vel.multiplyScalar(Math.pow(0.1, dt));
      p.vel.y += 0.05 * dt;
      p.sp.position.addScaledVector(p.vel, dt);
      p.sp.scale.setScalar(p.size + p.grow * Math.sqrt(k));
      p.sp.material.opacity = p.alpha * (1 - k) * (k < 0.05 ? k / 0.05 : 1);
    }
    for (const s of this.shells) {
      if (!s.alive) continue;
      s.t += dt;
      if (s.t > 8) { s.alive = false; s.mesh.visible = false; continue; }
      if (s.rest) continue;
      s.vel.y -= 9.81 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.spin.x * dt; s.mesh.rotation.y += s.spin.y * dt; s.mesh.rotation.z += s.spin.z * dt;
      const floor = Math.abs(s.mesh.position.x + 0.8) < 3 && Math.abs(s.mesh.position.z) < 2.5 ? 0.125 : 0.004;
      if (s.mesh.position.y < floor) {
        s.mesh.position.y = floor;
        if (s.vel.y < -0.4) {
          s.vel.y *= -0.32; s.vel.x *= 0.5; s.vel.z *= 0.5; s.spin.multiplyScalar(0.5);
          if (s.bounced++ === 0 && onShellBounce) onShellBounce(s);
        } else {
          s.rest = true;
          s.mesh.rotation.set(0, Math.random() * 6.28, Math.PI / 2 * 0 + (Math.random() - 0.5) * 0.2, 'YXZ');
          s.mesh.rotation.x = 0; s.mesh.rotation.z = 0;
        }
      }
    }
  }
}
