import * as THREE from '../../vendor/three.module.js';

export const LANES = [-2.4, 0, 2.4];

// Default look — identical to the original hard-coded runner. Every
// character in src/run/characters.js overrides a subset of these fields;
// Player fills in the rest from here, so `new Player(scene)` with no style
// renders exactly as before.
export const DEFAULT_STYLE = {
  hoodie: 0xff7b24,
  cap: 0x2ec4b6,
  trousers: 0x3a5a9c,
  shoes: 0xf8f8f8,
  backpack: 0xffd23f,
  accent: 0xe33636,
  skin: 0xe8b48a,
  accessory: null,   // 'satchel' | 'camera' | 'apron' | 'beret' | 'laurel' | null
};

function shade(hex, dl) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + dl, 0, 1));
  return c;
}

// Stylized runner: capsule torso, sphere head, animated limbs, cap.
// Procedurally animated (run cycle, jump tuck, roll ball).
export class Player {
  constructor(scene, style) {
    const s = { ...DEFAULT_STYLE, ...(style || {}) };

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
    const skin = new THREE.MeshStandardMaterial({ color: s.skin, roughness: 0.65 });
    const hoodie = new THREE.MeshStandardMaterial({
      color: s.hoodie, roughness: 0.55, emissive: shade(s.hoodie, -0.14), emissiveIntensity: 0.12,
    });
    const hoodieDark = new THREE.MeshStandardMaterial({ color: shade(s.hoodie, -0.12), roughness: 0.6 });
    const pants = new THREE.MeshStandardMaterial({ color: s.trousers, roughness: 0.7 });
    const capM = new THREE.MeshStandardMaterial({
      color: s.cap, roughness: 0.5, emissive: shade(s.cap, -0.1), emissiveIntensity: 0.15,
    });
    const shoe = new THREE.MeshStandardMaterial({ color: s.shoes, roughness: 0.35 });
    const shoeAccent = new THREE.MeshStandardMaterial({ color: s.accent, roughness: 0.4 });
    const packM = new THREE.MeshStandardMaterial({
      color: s.backpack, roughness: 0.55, emissive: shade(s.backpack, -0.14), emissiveIntensity: 0.12,
    });
    const accentM = new THREE.MeshStandardMaterial({ color: s.accent, roughness: 0.55 });

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

    // headwear: the default backwards baseball cap, or an accessory that
    // replaces it (beret, laurel wreath) for characters that call for one.
    if (s.accessory === 'beret') this.buildBeret(capM);
    else if (s.accessory === 'laurel') this.buildLaurel(accentM);
    else this.buildCap(capM, shoeAccent);

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

    // chest/shoulder accessories — small props, never geometry that changes
    // the silhouette's collision footprint (hitbox() only reads x/y/rolling).
    if (s.accessory === 'satchel') this.buildSatchel(accentM);
    else if (s.accessory === 'camera') this.buildCamera(accentM);
    else if (s.accessory === 'apron') this.buildApron(accentM);

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

  // ---- headwear ----
  buildCap(capM, shoeAccent) {
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
  }

  buildBeret(capM) {
    const beret = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 8), capM);
    beret.scale.set(1.15, 0.42, 1.15);
    beret.position.set(0.05, 2.05, -0.02);
    beret.rotation.z = -0.15;
    this.body.add(beret);
    const stem = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), capM);
    stem.position.set(0.08, 2.28, -0.02);
    this.body.add(stem);
  }

  buildLaurel(accentM) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 16), accentM);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 1.98, 0.02);
    this.body.add(band);
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), accentM);
        leaf.position.set(side * (0.28 + i * 0.07), 2.0 + i * 0.03, -0.05 - i * 0.05);
        leaf.rotation.z = side > 0 ? -0.6 - i * 0.15 : 0.6 + i * 0.15;
        leaf.rotation.x = 0.3;
        this.body.add(leaf);
      }
    }
  }

  // ---- chest/shoulder accessories ----
  buildSatchel(accentM) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.06), accentM);
    strap.position.set(-0.06, 1.15, 0.3);
    strap.rotation.z = 0.55;
    this.body.add(strap);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.16), accentM);
    pouch.position.set(0.28, 0.78, 0.22);
    this.body.add(pouch);
  }

  buildCamera(accentM) {
    const camBody = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4 });
    const neckStrap = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 12, Math.PI), accentM);
    neckStrap.rotation.x = Math.PI / 2.4;
    neckStrap.position.set(0, 1.55, 0.15);
    this.body.add(neckStrap);
    const cam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.14), camBody);
    cam.position.set(0, 0.92, 0.36);
    this.body.add(cam);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), camBody);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.92, 0.44);
    this.body.add(lens);
  }

  buildApron(accentM) {
    const bib = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.04), accentM);
    bib.position.set(0, 0.98, 0.34);
    this.body.add(bib);
    const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.04), accentM);
    strapL.position.set(-0.18, 1.32, 0.28);
    strapL.rotation.z = 0.35;
    this.body.add(strapL);
    const strapR = strapL.clone();
    strapR.position.x = 0.18;
    strapR.rotation.z = -0.35;
    this.body.add(strapR);
  }

  moveLane(dir, sfx) {
    const next = THREE.MathUtils.clamp(this.lane + dir, 0, 2);
    if (next !== this.lane) { this.lane = next; sfx.lane(); }
  }

  jump(sfx) {
    if (this.grounded && this.rolling <= 0) {
      this.vy = 12.6;   // apex ~2.5m, ~0.79s airtime — clears a 1.6m-tall car comfortably
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
