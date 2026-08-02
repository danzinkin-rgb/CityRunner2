import * as THREE from '../../vendor/three.module.js';
import { getLandmark } from './landmarks.js';
import { sfx } from '../core/audio.js';

// Monument assembly puzzle.
// Blocks are scattered on a plaza floor; ghost silhouette shows the target.
// Click/tap a block → if its height layer is buildable (lower layers done),
// it flies into place. Finish before the 60s clock runs out.
export class Puzzle {
  constructor(scene, camera, landmarkId, level) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.placedCount = 0;
    this.flying = [];
    this.done = false;
    this.failed = false;
    this.time = 60;

    const def = getLandmark(landmarkId);

    // Difficulty: level 1 pre-places some base blocks, level 3 scatters everything.
    const preplaced = level === 1 ? Math.floor(def.length * 0.35)
      : level === 2 ? Math.floor(def.length * 0.15) : 0;

    // plaza floor
    const floorTex = makePlazaTexture();
    const floor = new THREE.Mesh(new THREE.CircleGeometry(26, 48),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // pedestal glow ring at the build site
    const ringM = new THREE.Mesh(new THREE.RingGeometry(8.6, 9.2, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ringM.rotation.x = -Math.PI / 2;
    ringM.position.y = 0.02;
    this.ring = ringM;
    this.group.add(ringM);

    // sort blocks bottom-up and compute layer index
    this.blocks = def.map((d, i) => ({ def: d, idx: i })).sort((a, b) => a.def.p[1] - b.def.p[1]);

    this.items = this.blocks.map((entry, order) => {
      const mesh = makeBlockMesh(entry.def);
      const ghost = makeBlockMesh(entry.def, true);
      placeAtTarget(ghost, entry.def);
      this.group.add(ghost);

      const item = {
        def: entry.def, mesh, ghost, order,
        placed: order < preplaced,
        home: new THREE.Vector3(...entry.def.p),
      };

      if (item.placed) {
        placeAtTarget(mesh, entry.def);
        ghost.visible = false;
        this.placedCount++;
      } else {
        // scatter on the floor around the monument
        const a = (order / this.blocks.length) * Math.PI * 2 + Math.random() * 0.8;
        const r = 12 + Math.random() * 9;
        mesh.position.set(Math.cos(a) * r, entry.def.s[1] / 2 + 0.02, Math.sin(a) * r * 0.7 + 6);
        mesh.rotation.y = Math.random() * Math.PI * 2;
        mesh.userData.bobPhase = Math.random() * Math.PI * 2;
      }
      this.group.add(mesh);
      return item;
    });
  }

  nextNeeded() {
    return this.items.find((it) => !it.placed && !this.flying.includes(it));
  }

  // A block is pickable if it's within the next few needed (forgiving ordering)
  pickable(item) {
    const pending = this.items.filter((it) => !it.placed && !this.flying.includes(it));
    return pending.slice(0, 4).includes(item);
  }

  tryPick(nx, ny) {
    if (this.done || this.failed) return;
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const meshes = this.items.filter((it) => !it.placed && !this.flying.includes(it)).map((it) => it.mesh);
    const hits = this.raycaster.intersectObjects(meshes, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj && !meshes.includes(obj)) obj = obj.parent;
    const item = this.items.find((it) => it.mesh === obj);
    if (!item) return;
    if (!this.pickable(item)) {
      // too early — flash the ghost of what's needed
      sfx.tick();
      shake(item.mesh);
      return;
    }
    this.flying.push(item);
    item.t = 0;
    item.from = item.mesh.position.clone();
    item.fromRot = item.mesh.rotation.y;
    sfx.place();
  }

  update(dt) {
    this.time -= dt;
    this.ring.material.opacity = 0.35 + Math.sin(performance.now() / 300) * 0.18;

    // idle bob + highlight pulse on the currently pickable blocks
    for (const it of this.items) {
      if (it.placed || this.flying.includes(it)) continue;
      const pickNow = this.pickable(it);
      const targetGlow = pickNow ? 0.85 : 0.0;
      it.mesh.traverse((n) => {
        if (n.material && n.material.emissive !== undefined && !n.userData.noGlow) {
          n.material.emissiveIntensity += (targetGlow - n.material.emissiveIntensity) * dt * 6;
        }
      });
      if (pickNow) {
        it.mesh.position.y = it.def.s[1] / 2 + 0.02 +
          Math.abs(Math.sin(performance.now() / 400 + it.mesh.userData.bobPhase)) * 0.25;
      }
    }

    // fly animations
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const it = this.flying[i];
      it.t += dt * 1.8;
      const k = Math.min(1, it.t);
      const e = 1 - Math.pow(1 - k, 3);
      const target = new THREE.Vector3(...it.def.p);
      it.mesh.position.lerpVectors(it.from, target, e);
      it.mesh.position.y += Math.sin(e * Math.PI) * 3.2;      // arc
      it.mesh.rotation.y = it.fromRot * (1 - e) + (it.def.rotY || 0) * e;
      applyStaticRot(it.mesh, it.def, e);
      if (k >= 1) {
        placeAtTarget(it.mesh, it.def);
        it.placed = true;
        it.ghost.visible = false;
        this.placedCount++;
        this.flying.splice(i, 1);
        it.mesh.traverse((n) => {
          if (n.material && n.material.emissive !== undefined) n.material.emissiveIntensity = 0;
        });
        if (this.placedCount === this.items.length) {
          this.done = true;
          sfx.win();
        } else sfx.place();
      }
    }

    if (!this.done && this.time <= 0) { this.failed = true; this.time = 0; }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((n) => { if (n.geometry) n.geometry.dispose(); });
  }
}

// ---------- block mesh construction ----------
function makeBlockMesh(def, isGhost = false) {
  const [w, h, d] = def.s;
  const color = new THREE.Color(def.c);
  const mat = isGhost
    ? new THREE.MeshBasicMaterial({ color: 0x9ecfff, transparent: true, opacity: 0.16, depthWrite: false })
    : new THREE.MeshStandardMaterial({
      color,
      roughness: def.glass || def.shape === 'water' ? 0.12 : 0.75,
      metalness: def.glass ? 0.5 : 0.08,
      transparent: !!def.glass || def.shape === 'water',
      opacity: def.glass ? 0.55 : def.shape === 'water' ? 0.8 : 1,
      emissive: color.clone().multiplyScalar(0.5),
      emissiveIntensity: 0,
    });

  let geo;
  switch (def.shape) {
    case 'cyl': geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 20); break;
    case 'cone4': geo = new THREE.CylinderGeometry(w * 0.16, w / 2, h, 4); break;
    case 'pyramid': geo = new THREE.CylinderGeometry(0.01, w / 2 * Math.SQRT2, h, 4); break;
    case 'dome': geo = new THREE.SphereGeometry(w / 2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2); break;
    case 'sphere': geo = new THREE.SphereGeometry(w / 2, 18, 14); break;
    case 'torus': geo = new THREE.TorusGeometry(w / 2, def.s[2] / 2, 10, 40); break;
    case 'pod': geo = new THREE.CapsuleGeometry(h / 2, w * 0.4, 4, 10); break;
    case 'clock': {
      geo = new THREE.CylinderGeometry(w / 2, w / 2, d, 24);
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = Math.PI / 2;
      const grp = new THREE.Group();
      grp.add(m);
      if (!isGhost) {
        const hand1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, w * 0.32, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x2a2a30 }));
        hand1.position.set(0, w * 0.12, d / 2 + 0.02);
        const hand2 = hand1.clone(); hand2.rotation.z = 1.9; hand2.position.y = 0.04;
        grp.add(hand1, hand2);
      }
      grp.traverse((n) => { n.castShadow = !isGhost; });
      return grp;
    }
    case 'archvault': {
      // pier-topped arch: box with half-cylinder cut illusion (box + cylinder overlay)
      const grp = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.35, d), mat);
      top.position.y = h * 0.32;
      const arch = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.36, w * 0.36, d, 20, 1, false, 0, Math.PI), mat);
      arch.rotation.x = Math.PI / 2; arch.rotation.z = Math.PI / 2;
      arch.position.y = -h * 0.1;
      grp.add(top, arch);
      grp.traverse((n) => { n.castShadow = !isGhost; });
      return grp;
    }
    case 'pediment': geo = new THREE.CylinderGeometry(0.01, w / 2, h, 3); break;
    case 'spokes': {
      const grp = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), mat);
        sp.rotation.z = (i / 6) * Math.PI;
        grp.add(sp);
      }
      return grp;
    }
    case 'water': geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 24); break;
    default: geo = new THREE.BoxGeometry(w, h, d);
  }
  const mesh = new THREE.Mesh(geo, mat);
  if (def.shape === 'pyramid' || def.shape === 'pediment') mesh.rotation.y = Math.PI / 4;
  if (def.shape === 'pediment') mesh.rotation.set(0, 0, 0), mesh.rotation.x = 0, mesh.rotation.z = Math.PI, mesh.rotation.y = 0;
  mesh.castShadow = !isGhost;
  mesh.receiveShadow = !isGhost;
  return mesh;
}

function placeAtTarget(mesh, def) {
  mesh.position.set(...def.p);
  mesh.rotation.set(0, 0, 0);
  applyStaticRot(mesh, def, 1);
  if (def.rotY) mesh.rotation.y = def.rotY;
}

function applyStaticRot(mesh, def, k) {
  if (def.rotX) mesh.rotation.x = def.rotX * k;
  if (def.rotZ) mesh.rotation.z = def.rotZ * k;
  if (def.shape === 'pyramid') mesh.rotation.y = Math.PI / 4;
  if (def.shape === 'pediment') mesh.rotation.z = Math.PI;
}

function shake(mesh) {
  const ox = mesh.position.x;
  let n = 0;
  const id = setInterval(() => {
    mesh.position.x = ox + Math.sin(n * 2.4) * 0.12 * (1 - n / 8);
    if (++n > 8) { mesh.position.x = ox; clearInterval(id); }
  }, 30);
}

function makePlazaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#9a9080'; g.fillRect(0, 0, 512, 512);
  // radial cobble rings
  for (let r = 30; r < 380; r += 26) {
    g.strokeStyle = `rgba(60,50,40,${0.25 - r / 2600})`;
    g.lineWidth = 3;
    g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke();
  }
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
