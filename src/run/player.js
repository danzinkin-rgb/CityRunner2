import * as THREE from '../../vendor/three.module.js';

export const LANES = [-2.4, 0, 2.4];

// Stylized runner: capsule torso, sphere head, animated limbs, cap.
// Procedurally animated (run cycle, jump tuck, roll ball).
export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    this.lane = 1;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.grounded = true;
    this.rolling = 0;      // roll time remaining
    this.dead = false;
    this.time = 0;

    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.7 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x2e6fd8, roughness: 0.55 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x28303e, roughness: 0.7 });
    const capM = new THREE.MeshStandardMaterial({ color: 0xe33636, roughness: 0.5 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.4 });

    this.body = new THREE.Group();

    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 6, 12), shirt);
    this.torso.position.y = 1.05;
    this.torso.castShadow = true;
    this.body.add(this.torso);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), skin);
    this.head.position.y = 1.85;
    this.head.castShadow = true;
    this.body.add(this.head);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM);
    cap.position.y = 1.92;
    cap.rotation.x = -0.25;
    this.body.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.3), capM);
    brim.position.set(0, 1.92, -0.36);
    this.body.add(brim);

    const limb = () => new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), skin);
    this.armL = limb(); this.armR = limb();
    this.armL.material = shirt; this.armR.material = shirt;
    this.armL.position.set(-0.48, 1.25, 0);
    this.armR.position.set(0.48, 1.25, 0);
    this.armL.castShadow = this.armR.castShadow = true;
    this.body.add(this.armL, this.armR);

    this.legL = limb(); this.legR = limb();
    this.legL.material = pants; this.legR.material = pants;
    this.legL.position.set(-0.18, 0.42, 0);
    this.legR.position.set(0.18, 0.42, 0);
    this.legL.castShadow = this.legR.castShadow = true;
    this.body.add(this.legL, this.legR);

    this.shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.42), shoe);
    this.shoeR = this.shoeL.clone();
    this.shoeL.position.set(-0.18, 0.08, -0.05);
    this.shoeR.position.set(0.18, 0.08, -0.05);
    this.body.add(this.shoeL, this.shoeR);

    this.group.add(this.body);

    // soft blob shadow (in addition to real shadows — reads better at speed)
    const blobTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d');
      const rg = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      rg.addColorStop(0, 'rgba(0,0,0,.4)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(c);
    })();
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4),
      new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.02;
    this.group.add(this.blob);

    scene.add(this.group);
  }

  moveLane(dir, sfx) {
    const next = THREE.MathUtils.clamp(this.lane + dir, 0, 2);
    if (next !== this.lane) { this.lane = next; sfx.lane(); }
  }

  jump(sfx) {
    if (this.grounded && this.rolling <= 0) {
      this.vy = 11.5;
      this.grounded = false;
      sfx.jump();
    }
  }

  roll(sfx) {
    if (this.rolling <= 0) {
      this.rolling = 0.62;
      if (!this.grounded) this.vy = -16; // slam down
      sfx.roll();
    }
  }

  update(dt, speed) {
    this.time += dt;

    // lane easing
    const targetX = LANES[this.lane];
    this.x += (targetX - this.x) * Math.min(1, dt * 12);
    this.group.position.x = this.x;
    this.body.rotation.z = (targetX - this.x) * -0.14;

    // vertical
    if (!this.grounded) {
      this.vy -= 32 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; }
    }
    this.group.position.y = this.y;
    this.blob.position.y = 0.02 - this.y;
    const sc = 1 / (1 + this.y * 0.25);
    this.blob.scale.setScalar(sc);
    this.blob.material.opacity = sc;

    if (this.rolling > 0) this.rolling -= dt;

    // --- animation ---
    const run = this.time * Math.min(14, 8 + speed * 0.18);
    if (this.rolling > 0) {
      this.body.scale.y = 0.52;
      this.body.rotation.x = -this.rolling * 8;
      this.armL.rotation.x = this.armR.rotation.x = 1.5;
      this.legL.rotation.x = this.legR.rotation.x = -1.5;
    } else if (!this.grounded) {
      this.body.scale.y = 1;
      this.body.rotation.x = 0.18;
      this.armL.rotation.x = -2.4; this.armR.rotation.x = -2.4; // arms up
      this.legL.rotation.x = 0.8; this.legR.rotation.x = -0.4;  // tuck
    } else {
      this.body.scale.y = 1;
      this.body.rotation.x = 0.12; // forward lean
      const s = Math.sin(run), c = Math.cos(run);
      this.armL.rotation.x = s * 1.1;
      this.armR.rotation.x = -s * 1.1;
      this.legL.rotation.x = -s * 1.2;
      this.legR.rotation.x = s * 1.2;
      this.shoeL.position.z = -0.05 + s * 0.3;
      this.shoeR.position.z = -0.05 - s * 0.3;
      this.shoeL.position.y = 0.08 + Math.max(0, s) * 0.18;
      this.shoeR.position.y = 0.08 + Math.max(0, -s) * 0.18;
      this.body.position.y = Math.abs(c) * 0.09;
      this.head.rotation.y = s * 0.08;
    }
  }

  // Collision cylinder: {x, yBottom, yTop}
  hitbox() {
    const h = this.rolling > 0 ? 0.9 : 1.9;
    return { x: this.x, y0: this.y + 0.05, y1: this.y + h, r: 0.42 };
  }
}
