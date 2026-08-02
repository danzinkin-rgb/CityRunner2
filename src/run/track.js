import * as THREE from '../../vendor/three.module.js';
import { LANES } from './player.js';
import { roadTexture, sidewalkTexture, makeBuilding, makeProp, makeVehicle, makeBillboard, makeParkedCar, makeStreetSpan } from '../cities/builders.js';

const CHUNK_LEN = 36;
const CHUNKS = 7;          // visible chunks ahead
const ROAD_W = 8.6;

// Obstacle kinds:
//   'low'  — barrier, jump over
//   'high' — overhead sign/scaffold, roll under
//   'full' — vehicle, must change lane
//   'coin' — collectible
export class Track {
  constructor(scene, theme, level) {
    this.scene = scene;
    this.theme = theme;
    this.level = level;            // 1..3, drives density + speed
    this.group = new THREE.Group();
    scene.add(this.group);
    this.chunks = [];
    this.obstacles = [];           // live obstacle records
    this.coins = [];
    this.distance = 0;
    this.goal = 900 + (level - 1) * 350;   // meters to the monument
    this.coinSpin = 0;

    this.coinGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.09, 18);
    this.coinMat = new THREE.MeshStandardMaterial({
      color: 0xffd166, emissive: 0xcc8a1e, emissiveIntensity: 0.55,
      metalness: 0.9, roughness: 0.25,
    });

    for (let i = 0; i < CHUNKS; i++) this.spawnChunk(-i * CHUNK_LEN, i < 2);
  }

  spawnChunk(z, safe) {
    const t = this.theme;
    const g = new THREE.Group();
    g.position.z = z;

    // road
    const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_W, CHUNK_LEN),
      new THREE.MeshStandardMaterial({ map: roadTexture(t), roughness: 0.92 }));
    road.rotation.x = -Math.PI / 2;
    road.position.z = -CHUNK_LEN / 2;
    road.receiveShadow = true;
    g.add(road);

    // curbs + sidewalks
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, CHUNK_LEN),
        new THREE.MeshStandardMaterial({ map: sidewalkTexture(t), roughness: 0.95 }));
      sw.position.set(side * (ROAD_W / 2 + 2.2), 0.15, -CHUNK_LEN / 2);
      sw.receiveShadow = true;
      g.add(sw);

      // buildings — packed shoulder to shoulder, varied heights
      let bz = 0;
      while (bz < CHUNK_LEN - 4) {
        const w = 7 + Math.random() * 6;
        const d = 8 + Math.random() * 4;
        const hBase = t.id === 'paris' || t.id === 'rome' ? 14 : 22;
        const h = hBase + Math.random() * (t.id === 'nyc' ? 34 : 14);
        const b = makeBuilding(t, w, h, d, Math.random, side);
        b.position.set(side * (ROAD_W / 2 + 4.4 + d / 2 - 1), 0, -bz - d / 2);
        g.add(b);

        // distant second row for skyline depth
        if (Math.random() < 0.8) {
          const b2 = makeBuilding(t, w * 1.3, h * (0.9 + Math.random() * 0.8), d);
          b2.position.set(side * (ROAD_W / 2 + 16 + Math.random() * 8), 0, -bz - d / 2);
          g.add(b2);
        }
        bz += w + 0.5;
      }

      // parked decorative cars hugging the curb (placed first so props avoid them)
      const carZs = [];
      if (Math.random() < 0.85) {
        const n = 1 + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const cz = 5 + Math.random() * (CHUNK_LEN - 12);
          if (carZs.some((z) => Math.abs(z - cz) < 5)) continue;
          carZs.push(cz);
          const car = makeParkedCar(t);
          car.position.set(side * (ROAD_W / 2 + 1.35), 0.3, -cz);
          car.rotation.y = side > 0 ? Math.PI : 0;
          g.add(car);
        }
      }

      // props along the curb — denser for a lived-in street
      const propKinds = t.props;
      for (let pz = 3; pz < CHUNK_LEN; pz += 5.5 + Math.random() * 4) {
        const kind = propKinds[(Math.random() * propKinds.length) | 0];
        if (kind !== 'billboard' && kind !== 'awning' && carZs.some((z) => Math.abs(z - pz) < 3.2)) continue;
        const p = makeProp(kind, t);
        p.position.set(side * (ROAD_W / 2 + 1.1 + Math.random() * 1.6), 0.3, -pz);
        if (kind === 'billboard') {
          p.position.x = side * (ROAD_W / 2 + 4.2);
          p.position.y = 5 + Math.random() * 3;   // keep it up on the facade line
          p.rotation.y = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
        }
        if (kind === 'awning') {
          // snap to the building face so it reads as a shop awning
          p.position.x = side * (ROAD_W / 2 + 3.35);
          p.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        if (kind === 'newsstand' || kind === 'kiosk' || kind === 'hotdog') {
          p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          p.position.x = side * (ROAD_W / 2 + 2.4);
        }
        g.add(p);
      }
    }

    // Times Square special: overhead banner billboards spanning the street
    if (this.theme.id === 'nyc' && Math.random() < 0.5) {
      const bz = -CHUNK_LEN * (0.3 + Math.random() * 0.5);
      const banner = makeBillboard(t, 9, 2.4);
      banner.position.set(0, 7.5, bz);
      g.add(banner);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x2a2a32, metalness: 0.5, roughness: 0.5 });
      for (const px of [-5.1, 5.1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8.7, 8), postMat);
        post.position.set(px, 4.35, bz);
        g.add(post);
      }
    }
    // Rome string lights / London & Paris bunting lines across the street
    if (this.theme.id !== 'nyc' && Math.random() < 0.75) {
      const span = makeStreetSpan(t, ROAD_W + 4.5);
      span.position.set(0, 5.6 + Math.random() * 0.8, -CHUNK_LEN * (0.2 + Math.random() * 0.6));
      g.add(span);
    }

    if (!safe) this.populateObstacles(g, z);

    this.group.add(g);
    this.chunks.push(g);
  }

  populateObstacles(chunkGroup, chunkZ) {
    const density = 0.55 + this.level * 0.25;      // rows per 12m
    const t = this.theme;
    for (let zRow = 8; zRow < CHUNK_LEN - 4; zRow += 12 / density) {
      const worldZ = chunkZ - zRow;
      const pattern = Math.random();
      const usedLanes = new Set();

      const addObstacle = (lane, kind) => {
        usedLanes.add(lane);
        let mesh, y0 = 0, y1 = 0;
        if (kind === 'full') {
          mesh = makeVehicle(t);
          y0 = 0; y1 = 3.4;
        } else if (kind === 'low') {
          mesh = new THREE.Group();
          const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.9, 0.3),
            new THREE.MeshStandardMaterial({ color: t.accent, roughness: 0.5 }));
          bar.position.y = 0.75; bar.castShadow = true;
          mesh.add(bar);
          const stripes = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.28, 0.32),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }));
          stripes.position.y = 0.75; mesh.add(stripes);
          for (const lx of [-0.8, 0.8]) {
            const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12),
              new THREE.MeshStandardMaterial({ color: 0x333333 }));
            leg.position.set(lx, 0.3, 0); mesh.add(leg);
          }
          y0 = 0; y1 = 1.2;
        } else { // high
          mesh = new THREE.Group();
          const beam = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.6),
            new THREE.MeshStandardMaterial({ color: t.accent, roughness: 0.55 }));
          beam.position.y = 1.55; beam.castShadow = true;
          mesh.add(beam);
          const beamStripe = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.16, 0.62),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }));
          beamStripe.position.y = 1.55; mesh.add(beamStripe);
          for (const lx of [-1.0, 1.0]) {
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6),
              new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 0.6, roughness: 0.4 }));
            post.position.set(lx, 1.6, 0);
            mesh.add(post);
          }
          const sign = makeBillboard(t, 1.9, 0.8);
          sign.position.y = 2.5; mesh.add(sign);
          y0 = 1.3; y1 = 3.4;   // gap below 1.3 → roll under
        }
        mesh.position.set(LANES[lane], 0, -zRow);
        chunkGroup.add(mesh);
        this.obstacles.push({ mesh, lane, kind, y0, y1, chunk: chunkGroup, localZ: -zRow });
      };

      if (pattern < 0.3) {
        addObstacle((Math.random() * 3) | 0, 'full');
        if (this.level >= 2 && Math.random() < 0.5) addObstacle(pick3(usedLanes), 'low');
      } else if (pattern < 0.55) {
        addObstacle((Math.random() * 3) | 0, 'low');
      } else if (pattern < 0.75) {
        addObstacle((Math.random() * 3) | 0, 'high');
      } else if (this.level >= 2 && pattern < 0.88) {
        // double vehicle wall — one lane free
        const free = (Math.random() * 3) | 0;
        for (let l = 0; l < 3; l++) if (l !== free) addObstacle(l, 'full');
      }

      // coin lines on a free lane
      const freeLanes = [0, 1, 2].filter((l) => !usedLanes.has(l));
      if (freeLanes.length && Math.random() < 0.75) {
        const lane = freeLanes[(Math.random() * freeLanes.length) | 0];
        const arc = Math.random() < 0.3;
        for (let i = 0; i < 5; i++) {
          const coin = new THREE.Mesh(this.coinGeo, this.coinMat);
          coin.rotation.x = Math.PI / 2;
          const yy = arc ? 1.2 + Math.sin((i / 4) * Math.PI) * 1.3 : 1.1;
          coin.position.set(LANES[lane], yy, -zRow - i * 1.6);
          coin.castShadow = true;
          chunkGroup.add(coin);
          this.coins.push({ mesh: coin, chunk: chunkGroup, taken: false });
        }
      }
    }
  }

  update(dt, speed, player, onCoin, onHit) {
    const dz = speed * dt;
    this.distance += dz;
    this.group.position.z += dz;
    this.coinSpin += dt * 4;

    // recycle chunks that passed behind the camera
    while (this.chunks.length && this.chunks[0].position.z + this.group.position.z > CHUNK_LEN + 14) {
      const old = this.chunks.shift();
      this.obstacles = this.obstacles.filter((o) => o.chunk !== old);
      this.coins = this.coins.filter((c) => c.chunk !== old);
      this.group.remove(old);
      disposeGroup(old);
      const lastZ = this.chunks[this.chunks.length - 1].position.z;
      this.spawnChunk(lastZ - CHUNK_LEN, false);
    }

    const hb = player.hitbox();

    // coins
    for (const c of this.coins) {
      if (c.taken) continue;
      c.mesh.rotation.z = this.coinSpin;
      const wz = c.mesh.position.z + c.chunk.position.z + this.group.position.z;
      if (Math.abs(wz) < 0.9 && Math.abs(c.mesh.position.x - hb.x) < 0.9 &&
          c.mesh.position.y > hb.y0 - 0.6 && c.mesh.position.y < hb.y1 + 0.6) {
        c.taken = true;
        c.mesh.visible = false;
        onCoin();
      }
    }

    // obstacles
    for (const o of this.obstacles) {
      const wz = o.localZ + o.chunk.position.z + this.group.position.z;
      if (wz > -0.55 && wz < 0.55 && Math.abs(LANES[o.lane] - hb.x) < 1.15) {
        const overlap = hb.y0 < o.y1 && hb.y1 > o.y0;
        if (overlap) { onHit(); return; }
      }
    }
  }

  progress() { return Math.min(1, this.distance / this.goal); }
  done() { return this.distance >= this.goal; }

  dispose() {
    this.scene.remove(this.group);
    disposeGroup(this.group);
  }
}

function pick3(used) {
  const free = [0, 1, 2].filter((l) => !used.has(l));
  return free[(Math.random() * free.length) | 0] ?? 1;
}

function disposeGroup(g) {
  g.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
  });
}
