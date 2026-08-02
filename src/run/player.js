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

    // Bright, chunky, mobile-game proportions: big head, hoodie, backpack,
    // fat sneakers. Slight emissive lift so he pops against any street.
    const skin = new THREE.MeshStandardMaterial({ color: 0xe8b48a, roughness: 0.65 });
    const hoodie = new THREE.MeshStandardMaterial({
      color: 0xff7b24, roughness: 0.55, emissive: 0xff5a1a, emissiveIntensity: 0.12,
    });
    const hoodieDark = new THREE.MeshStandardMaterial({ color: 0xe05e10, roughness: 0.6 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x3a5a9c, roughness: 0.7 });
    const capM = new THREE.MeshStandardMaterial({
      color: 0x2ec4b6, roughness: 0.5, emissive: 0x1a8a80, emissiveIntensity: 0.15,
    });
    const shoe = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, roughness: 0.35 });
    const shoeAccent = new THREE.MeshStandardMaterial({ color: 0xe33636, roughness: 0.4 });
    const packM = new THREE.MeshStandardMaterial({
      color: 0xffd23f, roughness: 0.55, emissive: 0xcc9a1a, emissiveIntensity: 0.12,
    });

    this.body = new THREE.Group();

    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.37, 0.46, 6, 12), hoodie);
    this.torso.position.y = 1.02;
    this.torso.castShadow = true;
    this.body.add(this.torso);
    // hoodie pouch + drawstring band
    const pouch = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 4, 10), hoodieDark);
    pouch.scale.set(1, 0.55, 0.7);
    pouch.position.set(0, 0.85, -0.18);
    this.body.add(pouch);

    // big head = charm
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14), skin);
    this.head.position.y = 1.82;
    this.head.castShadow = true;
    this.body.add(this.head);
    // hood bunched around the neck
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.11, 8, 14), hoodieDark);
    hood.rotation.x = Math.PI / 2.3;
    hood.position.set(0, 1.48, 0.1);
    this.body.add(hood);

    // backwards cap (brim toward the camera — we see his back)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM);
    cap.position.y = 1.9;
    cap.rotation.x = 0.18;
    this.body.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.3), capM);
    brim.position.set(0, 1.86, 0.46);
    brim.rotation.x = 0.3;
    this.body.add(brim);
    const capBtn = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), shoeAccent);
    capBtn.position.y = 2.32;
    this.body.add(capBtn);

    // yellow backpack facing the camera
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.26), packM);
    pack.position.set(0, 1.12, 0.36);
    pack.castShadow = true;
    this.body.add(pack);
    const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.1), shoeAccent);
    packPocket.position.set(0, 1.0, 0.5);
    this.body.add(packPocket);
    const packZip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), hoodieDark);
    packZip.position.set(0, 1.34, 0.47);
    this.body.add(packZip);

    const limb = (r, len) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), skin);
    this.armL = limb(0.13, 0.46); this.armR = limb(0.13, 0.46);
    this.armL.material = hoodie; this.armR.material = hoodie;
    this.armL.position.set(-0.5, 1.22, 0);
    this.armR.position.set(0.5, 1.22, 0);
    this.armL.castShadow = this.armR.castShadow = true;
    this.body.add(this.armL, this.armR);
    // skin-tone fists
    const fistL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), skin);
    fistL.position.y = -0.36;
    this.armL.add(fistL);
    const fistR = fistL.clone();
    this.armR.add(fistR);

    this.legL = limb(0.14, 0.42); this.legR = limb(0.14, 0.42);
    this.legL.material = pants; this.legR.material = pants;
    this.legL.position.set(-0.19, 0.42, 0);
    this.legR.position.set(0.19, 0.42, 0);
    this.legL.castShadow = this.legR.castShadow = true;
    this.body.add(this.legL, this.legR);

    this.shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.17, 0.52), shoe);
    this.shoeR = this.shoeL.clone();
    this.shoeL.position.set(-0.19, 0.09, -0.06);
    this.shoeR.position.set(0.19, 0.09, -0.06);
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.54), shoeAccent);
    stripeL.position.y = -0.03;
    this.shoeL.add(stripeL);
    this.shoeR.add(stripeL.clone());
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
