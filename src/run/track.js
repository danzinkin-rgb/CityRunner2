import * as THREE from '../../vendor/three.module.js';
import { LANES } from './player.js';
import { makeSky } from '../core/engine.js';
import { resolveStreet } from '../cities/themes.js';
import {
  roadTexture, sidewalkTexture, makeBuilding, makeProp, makeVehicle,
  makeBillboard, makeParkedCar, makeStreetSpan, makeGardenWall,
  makeArcade, makeGardenRail, makeWindmill, makeObeliskFountain,
  makeEquestrian, makeErosFountain, makeCurvedLED, makeZebra, makeCameo,
  makeGardenParterre, makeStepStreet, makeArtistPitch, makeSquareStalls,
  SHARED_GEO,
} from '../cities/builders.js';
import { makeCollectible } from '../cities/souvenirs.js';
import { startRun, randomSeed, rand, randInt } from '../core/rng.js';

const CHUNK_LEN = 36;
const CHUNKS = 7;          // visible chunks ahead
const ROAD_W = 8.6;

// ---- overhead dressing, tuned for a 9:19.5 portrait frame ----
// three.js FOV is vertical (62°), so portrait keeps the same vertical framing
// but loses two thirds of the horizontal view: anything spanning the road
// reads much wider there and a board that is a harmless strip in landscape
// becomes a wall.
//
// The camera sits at (0, 5.2, 8.5) looking at (0, 2.2, -14): a 7.6° downward
// pitch, which puts the horizon — and therefore the road's vanishing point —
// at 39% from the top of the frame in EVERY aspect ratio. The top 20% of the
// frame ends at 12.2° above horizontal (tan ≈ 0.217).
//
// Anything at a fixed height sinks toward that 39% line as it recedes, so no
// single height can satisfy the rule at all distances. What works is a pair:
// lift the board so it clears the top-20% line over the range where it is
// large and dominant (roughly 20–40 m), and thin the cadence so the corridor
// never queues up a picket fence of boards marching down onto the horizon.
const SPAN_Y = 8.8;        // festoon / string-light wire height (t.spanY wins)
const BANNER_Y = 14.6;     // road-spanning billboard centre
const BANNER_W = 7.0;
const BANNER_H = 1.7;
// board bottom = 13.75, i.e. 8.55 above the eye → inside the top 20% out to
// 39 m, and still a clear 9% of frame height above the vanishing point at the
// 80 m mark where fog has already eaten most of its contrast.
const BANNER_GAP = 2;      // min chunks between two spanning boards

// Obstacle materials are shared: the track recycles a chunk every few seconds
// and would otherwise allocate a fresh material per barrier leg.
const OB = {
  post: new THREE.MeshStandardMaterial({ color: 0x8a9099, metalness: 0.6, roughness: 0.4 }),
  leg: new THREE.MeshStandardMaterial({ color: 0x333333 }),
  stripe: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
  beamStripe: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }),
  bannerPost: new THREE.MeshStandardMaterial({ color: 0x2a2a32, metalness: 0.5, roughness: 0.5 }),
};
// The spanning board used to stand on two masts planted at x ±4.1 — 20cm
// inside the kerb, i.e. in the road. It now hangs from a truss that runs into
// the buildings on both sides, which is both truer to Times Square and keeps
// the running corridor completely clear of vertical clutter.
const OB_GEO = {
  bar: new THREE.BoxGeometry(2.0, 0.9, 0.3),
  barStripe: new THREE.BoxGeometry(2.02, 0.28, 0.32),
  leg: new THREE.BoxGeometry(0.12, 0.6, 0.12),
  beam: new THREE.BoxGeometry(2.2, 0.45, 0.6),
  beamStripe: new THREE.BoxGeometry(2.22, 0.16, 0.62),
  post: new THREE.CylinderGeometry(0.07, 0.07, 3.2, 6),
  bannerTruss: new THREE.BoxGeometry(17, 0.18, 0.18),
  bannerHanger: new THREE.BoxGeometry(0.1, 0.7, 0.1),
};
for (const g of Object.values(OB_GEO)) SHARED_GEO.add(g);

// Obstacle kinds:
//   'low'  — barrier, jump over
//   'high' — overhead sign/scaffold, roll under
//   'full' — vehicle, must change lane
//   'coin' — collectible
export class Track {
  constructor(scene, theme, level, seed) {
    this.scene = scene;
    // Gameplay randomness (obstacle spacing/pattern/lane/kind, bus chance,
    // collectible placement) is drawn from the seeded stream in rng.js so a
    // seed reproduces an identical course. Cosmetic randomness (window
    // lighting, facades, props, parked-car colours) stays on Math.random and
    // is untouched by this. Must run before any chunk is generated.
    this.seed = seed !== undefined && seed !== null ? startRun(seed) : startRun(randomSeed());
    // Resolve the per-street identity (facade style, palette, mood, props...)
    // over the city base — this is what makes Broadway ≠ 5th Ave ≠ Times Sq.
    this.baseTheme = theme;
    this.theme = resolveStreet(theme, level);
    this.level = level;            // 1..3, drives density + speed
    this.group = new THREE.Group();
    scene.add(this.group);
    this.chunks = [];
    this.obstacles = [];           // live obstacle records
    this.coins = [];
    this.distance = 0;
    this.goal = 900 + (level - 1) * 350;   // meters to the monument
    this.coinSpin = 0;
    this.chunkCount = 0;           // drives set-piece cadence per street
    this.lastBannerChunk = -99;    // spacing guard for road-spanning boards

    this.applyStreetMood(scene, theme);
    // one accent material for every barrier/beam on this street
    this.accentMat = new THREE.MeshStandardMaterial({ color: this.theme.accent, roughness: 0.52 });

    // road + pavement are identical in every chunk: build the geometry and
    // materials once and let all 7 live chunks share them.
    const setback = this.theme.setback ?? 4.4;
    this.swW = Math.max(4.4, setback + 2.2);
    this.roadGeo = new THREE.PlaneGeometry(ROAD_W, CHUNK_LEN);
    this.sidewalkGeo = new THREE.BoxGeometry(this.swW, 0.3, CHUNK_LEN);
    SHARED_GEO.add(this.roadGeo); SHARED_GEO.add(this.sidewalkGeo);
    this.roadMat = new THREE.MeshStandardMaterial({ map: roadTexture(this.theme), roughness: 0.92 });
    this.sidewalkMat = new THREE.MeshStandardMaterial({ map: sidewalkTexture(this.theme), roughness: 0.95 });

    // static skyline cameo far beyond the last chunk (haze baked in)
    this.backdrop = makeCameo(this.theme);
    if (this.backdrop) scene.add(this.backdrop);

    // per-city souvenir collectible, cloned for every pickup. Clones share the
    // prototype's geometry, so it must never be disposed with a chunk.
    this.souvenirProto = makeCollectible(theme);
    this.souvenirProto.traverse((n) => { if (n.geometry) SHARED_GEO.add(n.geometry); });

    for (let i = 0; i < CHUNKS; i++) this.spawnChunk(-i * CHUNK_LEN, i < 2);
  }

  // Streets can override fog, sky and light mood over the city base
  // (dressScene has already applied the city defaults to this scene).
  applyStreetMood(scene, baseTheme) {
    const t = this.theme;
    if (scene.fog) {
      scene.fog.color.set(t.fog);
      scene.fog.density = t.fogDensity;
    }
    if (t.sky !== baseTheme.sky) {
      // swap the sky dome for the street's own gradient (dusk streets etc.)
      const old = scene.children.find((c) => c.isMesh && c.renderOrder === -10);
      if (old) {
        scene.remove(old);
        if (old.material.map) old.material.map.dispose();
        old.material.dispose();
        old.geometry.dispose();
      }
      scene.add(makeSky(t));
    }
    if (t.mood) {
      scene.traverse((o) => {
        if (o.isDirectionalLight) o.intensity *= (o.castShadow ? t.mood.sun : t.mood.fill) ?? 1;
        else if (o.isHemisphereLight) o.intensity *= t.mood.hemi ?? 1;
      });
    }
  }

  spawnChunk(z, safe) {
    const t = this.theme;
    const g = new THREE.Group();
    g.position.z = z;
    const nChunk = this.chunkCount++;

    // road
    const road = new THREE.Mesh(this.roadGeo, this.roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -CHUNK_LEN / 2;
    road.receiveShadow = true;
    g.add(road);

    // curbs + sidewalks. The pavement always reaches at least to the building
    // line, so streets with a wide setback (Navona's square, the Champs) don't
    // leave a strip of void between kerb and facade.
    const setback = t.setback ?? 4.4;
    const swW = this.swW;
    for (const side of [-1, 1]) {
      const sw = new THREE.Mesh(this.sidewalkGeo, this.sidewalkMat);
      sw.position.set(side * (ROAD_W / 2 + swW / 2), 0.15, -CHUNK_LEN / 2);
      sw.receiveShadow = true;
      g.add(sw);

      // Rue de Rivoli: the left side is the formal garden — railings, hedges
      // and trees instead of a building wall.
      if (t.garden && side < 0) {
        const rail = makeGardenRail(t, CHUNK_LEN);
        rail.position.set(side * (ROAD_W / 2 + 3.4), 0.3, 0);
        g.add(rail);
        // gravel walk, box parterres, urns and a back line of trees
        const par = makeGardenParterre(t, CHUNK_LEN);
        par.position.set(-(ROAD_W / 2 + 3.4), 0.3, 0);
        g.add(par);
        // gilded equestrian statue cameo rising over the garden
        if (nChunk % 3 === 1) {
          const eq = makeEquestrian();
          eq.position.set(side * (ROAD_W / 2 + 8.5), 0.3, -CHUNK_LEN * 0.5);
          eq.rotation.y = side * Math.PI / 2.5;
          g.add(eq);
        }
      } else {
        // buildings — packed shoulder to shoulder, varied heights
        let bz = 0;
        while (bz < CHUNK_LEN - 4) {
          const w = 7 + Math.random() * 6;
          const d = 8 + Math.random() * 4;
          const hBase = t.hBase ?? (t.id === 'paris' || t.id === 'rome' ? 14 : 22);
          const hVar = t.hVar ?? (t.id === 'nyc' ? 34 : 14);
          const h = hBase + Math.random() * hVar;
          // Piccadilly: the giant curved stacked-LED corner building
          if (t.curvedLED && side > 0 && nChunk % 4 === 2 && bz === 0) {
            const led = makeCurvedLED(t);
            led.position.set(side * (ROAD_W / 2 + 10.5), 0, -8);
            led.rotation.y = Math.PI * 1.05;
            g.add(led);
            bz += 15;
            continue;
          }
          const b = makeBuilding(t, w, h, d, Math.random, side);
          // The road-facing face (the box's ±X face) is pinned to a single
          // building line at `setback - 1` behind the kerb. Placing by centre
          // used to let the facade wander ±2.5m, so a random building — and
          // any shopfront bolted to it — could jut into the running corridor
          // (Oxford Street's colonnade was the worst offender). Pinning the
          // face keeps the mean position identical but kills the jitter.
          b.position.set(side * (ROAD_W / 2 + setback - 1 + w / 2), 0, -bz - d / 2);
          g.add(b);

          // Abbey Road: villas sit behind a continuous low wall + hedge
          if (t.facade === 'georgian') {
            const wall = makeGardenWall(t, w + 0.5);
            wall.rotation.y = Math.PI / 2;
            wall.position.set(side * (ROAD_W / 2 + setback - 1.6), 0.3, -bz - w / 2);
            g.add(wall);
          }

          // distant second row for skyline depth
          const rowP = t.secondRow ?? 0.8;
          if (Math.random() < rowP) {
            const b2 = makeBuilding(t, w * 1.3, h * (0.9 + Math.random() * 0.8), d);
            b2.position.set(side * (ROAD_W / 2 + 16 + Math.random() * 8), 0, -bz - d / 2);
            g.add(b2);
          }
          bz += w + (t.facade === 'georgian' ? 2.5 : 0.5);
        }
      }

      // Rue de Rivoli: continuous arcade colonnade over the arcade side
      if (t.arcade && side > 0) {
        const arc = makeArcade(t, CHUNK_LEN, side);
        arc.position.set(side * (ROAD_W / 2 + 2.4), 0.3, 0);
        g.add(arc);
      }

      // Champs-Élysées: disciplined double row of pollarded plane trees.
      // Widely spaced and set back off the kerb so they frame the avenue
      // rather than walling it in.
      if (t.treeline && !(t.garden && side < 0)) {
        for (let tz = 3; tz < CHUNK_LEN; tz += 9) {
          const tree = makeProp(t.treeline, t);
          tree.position.set(side * (ROAD_W / 2 + 2.1), 0.3, -tz);
          g.add(tree);
          const back = makeProp(t.treeline, t);   // second, further row
          back.scale.setScalar(0.88);
          back.position.set(side * (ROAD_W / 2 + 5.4), 0.3, -tz - 4.5);
          g.add(back);
        }
      }

      // parked decorative cars hugging the curb (placed first so props avoid them)
      const carZs = [];
      const parkP = t.facade === 'georgian' ? 0.95 : t.arcade ? 0.3 : 0.85;
      if (Math.random() < parkP) {
        const n = 1 + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const cz = 5 + Math.random() * (CHUNK_LEN - 12);
          if (carZs.some((zz) => Math.abs(zz - cz) < 5)) continue;
          carZs.push(cz);
          const car = makeParkedCar(t);
          car.position.set(side * (ROAD_W / 2 + 1.35), 0.3, -cz);
          car.rotation.y = side > 0 ? Math.PI : 0;
          g.add(car);
        }
      }

      // props along the curb — denser for a lived-in street
      const propKinds = t.props;
      const wallProps = new Set(['billboard', 'awning', 'flagbanner']);
      for (let pz = 3; pz < CHUNK_LEN; pz += 5.5 + Math.random() * 4) {
        const kind = propKinds[(Math.random() * propKinds.length) | 0];
        if (!wallProps.has(kind) && carZs.some((zz) => Math.abs(zz - pz) < 3.2)) continue;
        // under the arcade only the stalls fit (lamps would pierce the vault)
        if (t.arcade && side > 0 && kind !== 'souvenirstall') continue;
        const p = makeProp(kind, t);
        p.position.set(side * (ROAD_W / 2 + 1.1 + Math.random() * 1.6), 0.3, -pz);
        if (kind === 'billboard') {
          p.position.x = side * (ROAD_W / 2 + 4.2);
          p.position.y = 5 + Math.random() * 3;   // keep it up on the facade line
          p.rotation.y = side > 0 ? -Math.PI / 2.3 : Math.PI / 2.3;
        }
        if (kind === 'awning') {
          p.position.x = side * (ROAD_W / 2 + setback - 1.05);
          p.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
        if (kind === 'flagbanner') {
          p.position.x = side * (ROAD_W / 2 + setback - 1.2);
          p.position.y = 6 + Math.random() * 2.5;
          p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        }
        if (kind === 'newsstand' || kind === 'kiosk' || kind === 'hotdog' || kind === 'artstall'
          || kind === 'souvenirstall' || kind === 'playbill') {
          p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          p.position.x = side * (ROAD_W / 2 + 2.4);
        }
        if (kind === 'terrace_cafe' || kind === 'terrace_white' || kind === 'bistro') {
          p.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
          p.position.x = side * (ROAD_W / 2 + 3.0);
        }
        if (kind === 'stagedoor' || kind === 'streetsign') {
          p.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          p.position.x = side * (ROAD_W / 2 + 1.4);
        }
        if (kind === 'hedge') {
          p.rotation.y = Math.PI / 2;
          p.position.x = side * (ROAD_W / 2 + 3.2);
        }
        if (kind === 'barrier') {
          p.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
          p.position.x = side * (ROAD_W / 2 + 0.9);
        }
        if (kind === 'easel') p.rotation.y = Math.random() * Math.PI * 2;
        g.add(p);
      }
    }

    // ---- road-wide + one-off street set pieces ----

    // Abbey Road: THE zebra crossing, a recurring road set piece
    if (t.zebra && nChunk % 2 === 0) {
      const zb = makeZebra(t, ROAD_W);
      zb.position.z = -CHUNK_LEN * 0.55;
      g.add(zb);
    }
    // Montmartre: the red CABARET windmill on a corner
    if (t.windmill && nChunk % 3 === 1) {
      const wm = makeWindmill();
      const side = nChunk % 6 === 1 ? 1 : -1;
      wm.position.set(side * (ROAD_W / 2 + 7), 0, -CHUNK_LEN * 0.5);
      wm.rotation.y = -side * Math.PI / 2;
      g.add(wm);
    }
    // Montmartre: the signature stepped street climbing off the road, plus
    // painters pitched along the pavement.
    if (t.steps) {
      if (nChunk % 2 === 0) {
        const side = nChunk % 4 === 0 ? -1 : 1;
        const st = makeStepStreet(t);
        st.position.set(side * (ROAD_W / 2 + 3.0), 0.3, -CHUNK_LEN * (0.3 + (nChunk % 3) * 0.16));
        st.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        g.add(st);
      }
      for (const side of [-1, 1]) {
        if (Math.random() > 0.6) continue;
        const ap = makeArtistPitch(t);
        ap.position.set(side * (ROAD_W / 2 + 2.6), 0.3, -4 - Math.random() * (CHUNK_LEN - 10));
        ap.rotation.y = side > 0 ? -1.2 : 1.2;
        g.add(ap);
      }
    }
    // Piazza Navona: obelisk-over-rocky-fountain set pieces down the middle of
    // the square, with artists' stalls edging it.
    if (t.obelisk) {
      if (nChunk % 2 === 1) {
        // clear of every lane — the square is paved right up to it, so it
        // still reads as standing in the middle of the piazza
        const obSide = nChunk % 4 === 1 ? 1 : -1;
        const ob = makeObeliskFountain();
        ob.position.set(obSide * (ROAD_W / 2 + 1.4), 0.3, -CHUNK_LEN * 0.45);
        g.add(ob);
      }
      const side = nChunk % 2 === 0 ? -1 : 1;
      const stalls = makeSquareStalls(t, 3);
      stalls.position.set(side * (ROAD_W / 2 + 4.2), 0.3, -CHUNK_LEN * 0.25);
      stalls.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      g.add(stalls);
    }
    // Piccadilly: winged-archer fountain on the sidewalk
    if (t.eros && nChunk % 5 === 3) {
      const er = makeErosFountain();
      er.position.set(-(ROAD_W / 2 + 2.6), 0.3, -CHUNK_LEN * 0.35);
      g.add(er);
    }

    // Times Square: overhead banner billboards spanning the street, slung from
    // a truss that disappears into the buildings either side. Rationed to one
    // every few chunks: seven live chunks at the old 75% put five boards in
    // the corridor at once, and in portrait only the furthest one read — the
    // one sitting right on the vanishing point.
    if (t.banners && nChunk - this.lastBannerChunk >= BANNER_GAP && Math.random() < 0.34) {
      this.lastBannerChunk = nChunk;
      const bz = -CHUNK_LEN * (0.3 + Math.random() * 0.5);
      const banner = makeBillboard(t, BANNER_W, BANNER_H);
      banner.position.set(0, BANNER_Y, bz);
      g.add(banner);
      const trussY = BANNER_Y + BANNER_H / 2 + 0.55;
      const truss = new THREE.Mesh(OB_GEO.bannerTruss, OB.bannerPost);
      truss.position.set(0, trussY, bz);
      g.add(truss);
      for (const hx of [-BANNER_W * 0.34, BANNER_W * 0.34]) {
        const hang = new THREE.Mesh(OB_GEO.bannerHanger, OB.bannerPost);
        hang.position.set(hx, trussY - 0.35, bz);
        g.add(hang);
      }
    }
    // festoons / string lights / bunting lines across the street. Thin wires
    // block nothing, so they only need to stay off the vanishing point at
    // close range — streets with a low roofline (Montmartre) set their own
    // spanY so the lights still read as strung between the houses.
    if (t.span && Math.random() < (t.spanFreq ?? 0.75)) {
      const span = makeStreetSpan(t, ROAD_W + 4.5);
      span.position.set(0, (t.spanY ?? SPAN_Y) + Math.random() * 0.4,
        -CHUNK_LEN * (0.2 + Math.random() * 0.6));
      g.add(span);
    }

    if (!safe) this.populateObstacles(g, z);

    this.group.add(g);
    this.chunks.push(g);
  }

  populateObstacles(chunkGroup, chunkZ) {
    // Rows per 12m. Level 1 is a teaching level: it must be comfortably
    // completable by a first-time player, so it sits well below the old
    // 0.8 that made streets feel relentless.
    const density = [0.55, 0.8, 1.05][this.level - 1] ?? 0.8;
    const t = this.theme;
    for (let zRow = 8; zRow < CHUNK_LEN - 4; zRow += 12 / density) {
      const worldZ = chunkZ - zRow;
      const pattern = rand();
      const usedLanes = new Set();

      const addObstacle = (lane, kind) => {
        usedLanes.add(lane);
        let mesh, y0 = 0, y1 = 0, halfLen = 0.35;
        if (kind === 'full') {
          mesh = makeVehicle(t);
          // Honest hitboxes: buses are walls you must dodge; cars/taxis/vespas
          // are low enough that a well-timed jump clears them.
          // A bus is an unjumpable wall. If every London vehicle were a bus,
          // London would be far harder than the other cities for no reason —
          // so most London vehicles are jumpable cabs, and buses stay rare
          // (and rarer still on level 1).
          const busChance = this.level === 1 ? 0.18 : 0.4;
          const isBus = t.vehicle === 'bus' && rand() < busChance;
          mesh.userData.asCab = t.vehicle === 'bus' && !isBus;
          y0 = 0; y1 = isBus ? 3.2 : 1.6;
          halfLen = isBus ? 2.6 : t.vehicle === 'vespa' ? 1.1 : 2.1;
          if (mesh.userData.asCab) mesh.scale.set(0.82, 0.5, 0.86);
        } else if (kind === 'low') {
          mesh = new THREE.Group();
          const bar = new THREE.Mesh(OB_GEO.bar, this.accentMat);
          bar.position.y = 0.75; bar.castShadow = true;
          mesh.add(bar);
          const stripes = new THREE.Mesh(OB_GEO.barStripe, OB.stripe);
          stripes.position.y = 0.75; mesh.add(stripes);
          for (const lx of [-0.8, 0.8]) {
            const leg = new THREE.Mesh(OB_GEO.leg, OB.leg);
            leg.position.set(lx, 0.3, 0); mesh.add(leg);
          }
          y0 = 0; y1 = 1.2;
        } else { // high
          mesh = new THREE.Group();
          const beam = new THREE.Mesh(OB_GEO.beam, this.accentMat);
          beam.position.y = 1.55; beam.castShadow = true;
          mesh.add(beam);
          const beamStripe = new THREE.Mesh(OB_GEO.beamStripe, OB.beamStripe);
          beamStripe.position.y = 1.55; mesh.add(beamStripe);
          for (const lx of [-1.0, 1.0]) {
            const post = new THREE.Mesh(OB_GEO.post, OB.post);
            post.position.set(lx, 1.6, 0);
            mesh.add(post);
          }
          const sign = makeBillboard(t, 1.9, 0.8);
          sign.position.y = 2.5; mesh.add(sign);
          y0 = 1.3; y1 = 3.4;   // gap below 1.3 → roll under
        }
        mesh.position.set(LANES[lane], 0, -zRow);
        chunkGroup.add(mesh);
        this.obstacles.push({ mesh, lane, kind, y0, y1, halfLen, chunk: chunkGroup, localZ: -zRow });
      };

      // Level 1 sees fewer vehicles and more single jump/roll obstacles.
      const fullCut = this.level === 1 ? 0.18 : 0.3;
      if (pattern < fullCut) {
        addObstacle(randInt(3), 'full');
        if (this.level >= 2 && rand() < 0.5) addObstacle(pick3(usedLanes), 'low');
      } else if (pattern < 0.55) {
        addObstacle(randInt(3), 'low');
      } else if (pattern < 0.75) {
        addObstacle(randInt(3), 'high');
      } else if (this.level >= 2 && pattern < 0.88) {
        // double vehicle wall — one lane free
        const free = randInt(3);
        for (let l = 0; l < 3; l++) if (l !== free) addObstacle(l, 'full');
      }

      // coin lines on a free lane
      const freeLanes = [0, 1, 2].filter((l) => !usedLanes.has(l));
      if (freeLanes.length && rand() < 0.75) {
        const lane = freeLanes[randInt(freeLanes.length)];
        const arc = rand() < 0.3;
        for (let i = 0; i < 5; i++) {
          const coin = this.souvenirProto.clone();
          const yy = arc ? 1.2 + Math.sin((i / 4) * Math.PI) * 1.3 : 1.1;
          coin.position.set(LANES[lane], yy, -zRow - i * 1.6);
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
      c.mesh.rotation.y = this.coinSpin;   // souvenirs spin about vertical axis
      const wz = c.mesh.position.z + c.chunk.position.z + this.group.position.z;
      if (Math.abs(wz) < 0.9 && Math.abs(c.mesh.position.x - hb.x) < 0.9 &&
          c.mesh.position.y > hb.y0 - 0.6 && c.mesh.position.y < hb.y1 + 0.6) {
        c.taken = true;
        c.mesh.visible = false;
        onCoin();
      }
    }

    // Obstacles. The z window is deliberately SHORTER than the mesh: matching
    // true vehicle length made a bus a 6.1m collision zone, so brushing past
    // one mid-lane-change clipped you. Players should feel they got away with
    // it, not robbed.
    for (const o of this.obstacles) {
      const wz = o.localZ + o.chunk.position.z + this.group.position.z;
      const zw = (o.halfLen || 0.35) * 0.55 + 0.3;
      if (wz > -zw && wz < zw && Math.abs(LANES[o.lane] - hb.x) < 1.15) {
        const overlap = hb.y0 < o.y1 && hb.y1 > o.y0;
        if (overlap) { onHit(); return; }
      }
    }
  }

  progress() { return Math.min(1, this.distance / this.goal); }
  done() { return this.distance >= this.goal; }

  // Souvenir-economy sink #2: the continue token. Paying to revive is only
  // fair if the player isn't immediately killed by the same obstacle they
  // just hit — so wipe everything in the corridor from just behind the
  // player out to one chunk ahead. This never touches spawnChunk/
  // populateObstacles, so obstacle density/balance (test/difficulty.mjs) is
  // untouched; it only removes obstacles that already exist in the world.
  clearNearPlayer(ahead = CHUNK_LEN, behind = 4) {
    const kept = [];
    for (const o of this.obstacles) {
      const wz = o.localZ + o.chunk.position.z + this.group.position.z;
      if (wz > -ahead && wz < behind) {
        o.chunk.remove(o.mesh);
      } else {
        kept.push(o);
      }
    }
    this.obstacles = kept;
  }

  dispose() {
    this.scene.remove(this.group);
    disposeGroup(this.group);
    if (this.backdrop) {
      this.scene.remove(this.backdrop);
      disposeGroup(this.backdrop);
      this.backdrop = null;
    }
    this.accentMat.dispose();
    SHARED_GEO.delete(this.roadGeo); SHARED_GEO.delete(this.sidewalkGeo);
    this.roadGeo.dispose(); this.sidewalkGeo.dispose();
    this.roadMat.dispose(); this.sidewalkMat.dispose();
  }
}

function pick3(used) {
  const free = [0, 1, 2].filter((l) => !used.has(l));
  return free[randInt(free.length)] ?? 1;
}

// Free only geometry this chunk actually owns. Shared/cached geometry (boxes,
// spheres, the souvenir prototype) is registered in SHARED_GEO by the builders
// and is reused by every future chunk — disposing it would force a GPU
// re-upload on every recycle.
function disposeGroup(g) {
  g.traverse((n) => {
    if (n.geometry && !SHARED_GEO.has(n.geometry)) n.geometry.dispose();
  });
}
