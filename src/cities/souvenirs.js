import * as THREE from '../../vendor/three.module.js';

// City souvenirs — the collectible "coins", one icon per city:
// NYC: glossy I<3NY heart · Paris: croissant · London: red phone box ·
// Rome: marble Caesar bust with laurel wreath.
// Built once per Track and cloned per pickup (clone shares geometry/materials).
export function makeCollectible(theme) {
  const g = new THREE.Group();
  if (theme.id === 'nyc') {
    const s = new THREE.Shape();
    s.moveTo(0, 0.22);
    s.bezierCurveTo(0.02, 0.4, 0.38, 0.42, 0.38, 0.16);
    s.bezierCurveTo(0.38, -0.06, 0.06, -0.22, 0, -0.4);
    s.bezierCurveTo(-0.06, -0.22, -0.38, -0.06, -0.38, 0.16);
    s.bezierCurveTo(-0.38, 0.42, -0.02, 0.4, 0, 0.22);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2,
    });
    geo.center();
    const heart = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0xe62e3e, roughness: 0.2, metalness: 0.2,
      emissive: 0xb01020, emissiveIntensity: 0.5,
    }));
    g.add(heart);
  } else if (theme.id === 'paris') {
    const dough = new THREE.MeshStandardMaterial({
      color: 0xd99a4e, roughness: 0.55, emissive: 0x8a5218, emissiveIntensity: 0.35,
    });
    const sweep = Math.PI * 1.3;
    const baseRot = Math.PI - sweep / 2;      // crescent opens downward
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.15, 10, 20, sweep), dough);
    body.rotation.z = baseRot;
    g.add(body);
    const crust = new THREE.MeshStandardMaterial({ color: 0xb87a34, roughness: 0.6 });
    for (const a of [-0.5, 0, 0.5]) {
      const ang = baseRot + sweep / 2 + a;     // along the visible arc
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.168, 0.055, 12), crust);
      band.position.set(Math.cos(ang) * 0.3, Math.sin(ang) * 0.3, 0);
      band.rotation.z = ang;
      g.add(band);
    }
  } else if (theme.id === 'london') {
    // The K6 phone box, as it is recognised at a glance: a red box with a
    // DOMED roof, a white TELEPHONE band under the dome, and small panes of
    // glass in a grid of red bars. The first version had none of those — a
    // red block with a glowing panel — and players could not tell what it was.
    const red = new THREE.MeshStandardMaterial({
      color: 0xd6182e, roughness: 0.3, emissive: 0x7a0a16, emissiveIntensity: 0.45,
    });
    const glow = new THREE.MeshStandardMaterial({
      color: 0xfff2cc, roughness: 0.3, emissive: 0xffe1a0, emissiveIntensity: 0.8,
    });
    const white = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.4, emissive: 0xcccccc, emissiveIntensity: 0.5,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.6, 0.34), red);
    g.add(body);
    // glazing: lit panes behind a red grid, on the front and both sides
    for (const [x, z, ry] of [[0, 0.172, 0], [0.172, 0, Math.PI / 2], [-0.172, 0, Math.PI / 2]]) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.36), glow);
      pane.position.set(x, -0.02, z);
      pane.rotation.y = ry;
      if (x < 0) pane.rotation.y = -Math.PI / 2;
      g.add(pane);
      for (const gx of [-0.04, 0.04]) {                     // vertical bars
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.36, 0.01), red);
        bar.position.set(x + (z ? gx : 0), -0.02, z + (x ? gx * Math.sign(x) : 0));
        bar.rotation.y = pane.rotation.y;
        g.add(bar);
      }
      for (const gy of [-0.1, 0.02, 0.14]) {                // horizontal bars
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.018, 0.01), red);
        bar.position.set(x, gy - 0.02, z);
        bar.rotation.y = pane.rotation.y;
        g.add(bar);
      }
    }
    // TELEPHONE band: white strip on every face, just under the roof
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.36), white);
    band.position.y = 0.26;
    g.add(band);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), red);
    cap.position.y = 0.32;
    g.add(cap);
    // the dome: a shallow, wide curve, not a hemisphere
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), red);
    dome.scale.set(1, 0.42, 1);
    dome.position.y = 0.35;
    g.add(dome);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), white);
    crown.position.y = 0.46;
    g.add(crown);
  } else if (theme.id === 'sf') {
    // A Powell Street cable car as it reads from the pavement: a long cream
    // car with a ROW of windows, a maroon skirt, a roof that overhangs both
    // ends, and open end platforms with their grab poles. The first version
    // was a two-colour box, which read as a van.
    const cream = new THREE.MeshStandardMaterial({
      color: 0xf2e8d0, roughness: 0.4, emissive: 0x8a8060, emissiveIntensity: 0.3,
    });
    const maroon = new THREE.MeshStandardMaterial({
      color: 0x9a2230, roughness: 0.35, emissive: 0x4a0a12, emissiveIntensity: 0.45,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x33465e, roughness: 0.2, emissive: 0x6a8ab0, emissiveIntensity: 0.35,
    });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8a838, roughness: 0.3, metalness: 0.6 });
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.3), maroon);
    skirt.position.y = -0.14;
    g.add(skirt);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.24, 0.3), cream);
    cabin.position.y = 0.05;
    g.add(cabin);
    for (let i = 0; i < 4; i++) {                             // the row of windows
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.31), glass);
      w.position.set(-0.15 + i * 0.1, 0.07, 0);
      g.add(w);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.045, 0.34), cream);
    roof.position.y = 0.2;
    g.add(roof);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.16), cream);
    lantern.position.y = 0.245;
    g.add(lantern);
    for (const ex of [-0.3, 0.3]) {                            // open ends: poles
      for (const ez of [-0.12, 0.12]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), brass);
        pole.position.set(ex, 0.02, ez);
        g.add(pole);
      }
    }
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x55555f, roughness: 0.6 });
    for (const wx of [-0.2, 0.2]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 10), wheelMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, -0.24, 0);
      g.add(wh);
    }
  } else if (theme.id === 'hanoi') {
    // A conical leaf hat, the non la: a shallow cone of palm leaf with its
    // rings of stitching, and a red ribbon to tie under the chin.
    const straw = new THREE.MeshStandardMaterial({ color: 0xe8d4a0, roughness: 0.7, emissive: 0x5a4a20, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.34, 24, 1, true), straw);
    hat.position.y = 0.08; g.add(hat);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xb89a60, roughness: 0.8 });
    for (const t of [0.25, 0.5, 0.75]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46 * t, 0.008, 4, 28), ringMat);
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.25 - 0.34 * t; g.add(ring);
    }
    const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xd8202a, roughness: 0.5, emissive: 0x5a0a0a, emissiveIntensity: 0.4 }));
    ribbon.rotation.z = Math.PI; ribbon.position.y = -0.09; g.add(ribbon);
    g.rotation.x = 0.35;
  } else if (theme.id === 'capetown') {
    // A king protea, South Africa's national flower: a cup of pointed pink
    // bracts around a domed, silvery centre, on a short stem with leaves.
    const pink = new THREE.MeshStandardMaterial({ color: 0xe8708a, roughness: 0.5, emissive: 0x6a1a2a, emissiveIntensity: 0.35 });
    const bract = new THREE.ConeGeometry(0.07, 0.34, 5);
    bract.translate(0, 0.17, 0);
    for (let ring = 0; ring < 2; ring++) {
      const n = ring ? 11 : 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.3;
        const b = new THREE.Mesh(bract, pink);
        b.position.set(Math.cos(a) * (0.14 + ring * 0.05), -0.1 - ring * 0.05, Math.sin(a) * (0.14 + ring * 0.05));
        b.rotation.set(0, -a, 0, 'YXZ');
        b.rotateZ(-(0.35 + ring * 0.35));
        g.add(b);
      }
    }
    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xf0d8dc, roughness: 0.8, emissive: 0x4a3a3e, emissiveIntensity: 0.3 }));
    centre.scale.set(1, 1.3, 1); centre.position.y = 0.02; g.add(centre);
    const green = new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.6 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.3, 6), green);
    stem.position.y = -0.36; g.add(stem);
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), green);
      leaf.scale.set(0.5, 1.6, 0.25); leaf.position.set(s * 0.09, -0.38, 0); leaf.rotation.z = s * 0.5;
      g.add(leaf);
    }
  } else if (theme.id === 'bangkok') {
    // A little carved elephant figurine in grey, trunk raised, with a red
    // and gold saddle cloth on its back.
    const hide = new THREE.MeshStandardMaterial({ color: 0x9a9aa4, roughness: 0.6, emissive: 0x2a2a34, emissiveIntensity: 0.3 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), hide);
    body.scale.set(1.25, 0.95, 0.9); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), hide);
    head.position.set(0.32, 0.12, 0); g.add(head);
    for (const z of [-0.15, 0.15]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), hide);
      ear.scale.set(0.25, 1, 0.9); ear.position.set(0.28, 0.14, z * 1.15); g.add(ear);
    }
    const trunk = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 8, 14, Math.PI * 0.9), hide);
    trunk.rotation.z = -Math.PI * 0.55; trunk.position.set(0.5, 0.02, 0); g.add(trunk);
    for (const [x, z] of [[-0.18, -0.13], [-0.18, 0.13], [0.16, -0.13], [0.16, 0.13]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.26, 10), hide);
      leg.position.set(x, -0.3, z); g.add(leg);
    }
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.5, emissive: 0x5a0a0a, emissiveIntensity: 0.4 }));
    cloth.position.y = 0.25; g.add(cloth);
    const gold = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xe8b830, roughness: 0.3, metalness: 0.6 }));
    for (const z of [-0.22, 0.22]) { const b = gold.clone(); b.position.set(0, 0.24, z); g.add(b); }
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.18, 5), hide);
    tail.rotation.z = -0.5; tail.position.set(-0.36, 0.0, 0); g.add(tail);
  } else if (theme.id === 'delhi') {
    // A paper fighter kite, the kind flown from Delhi's rooftops: a diamond
    // in two bright colours on a bamboo spine and bow, with a short tail.
    const half = (col, s) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.42, 0, 0, -0.42, 0, s * 0.36, 0.04, 0], 3));
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: col, emissive: col, emissiveIntensity: 0.35, roughness: 0.6, side: THREE.DoubleSide,
      }));
    };
    g.add(half(0xe8306a, -1), half(0xf2b418, 1));
    const bamboo = new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.7 });
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.86, 5), bamboo);
    spine.position.z = 0.01; g.add(spine);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.012, 4, 16, Math.PI * 0.62), bamboo);
    bow.rotation.z = Math.PI * 0.19; bow.position.set(0, -0.34, 0.01); g.add(bow);
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x2a9a4a, emissive: 0x2a9a4a, emissiveIntensity: 0.3, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const t = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.1), tailMat);
      t.position.set(Math.sin(i) * 0.04, -0.5 - i * 0.1, 0); t.rotation.z = (i % 2 ? 0.4 : -0.4);
      g.add(t);
    }
  } else if (theme.id === 'marrakech') {
    // A brass lantern: a six-sided body of coloured glass behind brass
    // ribs, a pointed cap with a ball finial, and a ring to hang it by.
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8a838, roughness: 0.3, metalness: 0.7, emissive: 0x5a3a08, emissiveIntensity: 0.4 });
    // one pane of coloured glass per side, lit from inside (plain materials,
    // no canvas: a texture here would outlive the street)
    const cols = [0xe83a3a, 0x2aa860, 0x2a6ae8, 0xf2b020, 0xe83a3a, 0x2aa860];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.02),
        new THREE.MeshStandardMaterial({ color: cols[i], emissive: cols[i], emissiveIntensity: 0.8, roughness: 0.3 }));
      pane.position.set(Math.cos(a) * 0.18, 0, Math.sin(a) * 0.18);
      pane.rotation.y = Math.PI / 2 - a;
      g.add(pane);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd070, emissiveIntensity: 2 }));
    g.add(core);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 0.03), brass);
      rib.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
      rib.rotation.z = Math.cos(a) * 0.1; rib.rotation.x = -Math.sin(a) * 0.1;
      g.add(rib);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.1, 6), brass);
    base.position.y = -0.28; g.add(base);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.23, 0.06, 6), brass);
    rim.position.y = 0.25; g.add(rim);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.3, 6), brass);
    cap.position.y = 0.43; g.add(cap);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), brass);
    ball.position.y = 0.6; g.add(ball);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 14), brass);
    ring.position.y = 0.7; g.add(ring);
  } else if (theme.id === 'mexico') {
    // A marigold (cempasuchil), the flower of the Day of the Dead: a dense
    // pompom of ruffled orange petals on a short stem with two leaves.
    const cols = [0xf28a0c, 0xf9a21a, 0xe8740a];
    const petal = new THREE.SphereGeometry(0.06, 7, 5);
    const pm = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, emissive: 0x6a2a00, emissiveIntensity: 0.4 }));
    // ~150 petals spread evenly over most of a ball (a golden-angle spiral),
    // each a flattened disc facing outwards with a little ruffle: the round
    // pompom a cempasuchil is, not a stack of tiers
    const N = 150;
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 1.75;                  // top down to well below the equator
      const rr = Math.sqrt(Math.max(0, 1 - y * y)), a = i * 2.39996;
      const dir = new THREE.Vector3(Math.cos(a) * rr, y, Math.sin(a) * rr);
      const p = new THREE.Mesh(petal, pm[i % 3]);
      p.position.copy(dir).multiplyScalar(0.24);
      p.lookAt(dir.clone().multiplyScalar(2));
      p.rotateZ((i * 0.7) % 3);
      p.rotateX(((i * 0.37) % 1 - 0.5) * 0.8);
      p.scale.set(1.35, 1.1, 0.45);
      g.add(p);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), pm[2]);
    g.add(core);
    const green = new THREE.MeshStandardMaterial({ color: 0x3a7a30, roughness: 0.6 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.34, 6), green);
    stem.position.y = -0.4; g.add(stem);
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), green);
      leaf.scale.set(1.8, 0.3, 0.7); leaf.position.set(s * 0.11, -0.42, 0); leaf.rotation.z = s * 0.5;
      g.add(leaf);
    }
  } else if (theme.id === 'jerusalem') {
    // A pomegranate cut open: the whole fruit with a quarter wedge taken out,
    // so the red seeds show on the two cut faces, and its little crown on top.
    const rind = new THREE.MeshStandardMaterial({
      color: 0xb3202e, roughness: 0.45, emissive: 0x5a0a12, emissiveIntensity: 0.4, side: THREE.DoubleSide,
    });
    const pith = new THREE.MeshStandardMaterial({
      color: 0xf2dcc0, roughness: 0.6, emissive: 0x6a5040, emissiveIntensity: 0.25, side: THREE.DoubleSide,
    });
    const seed = new THREE.MeshStandardMaterial({
      color: 0xe0203a, roughness: 0.2, emissive: 0x900818, emissiveIntensity: 0.55,
    });
    const R = 0.27;
    // built in its own group, turned so the cut faces the front
    const fruit = new THREE.Group();
    fruit.rotation.y = Math.PI * 0.8;
    g.add(fruit);
    // three quarters of a sphere: the missing wedge is the quadrant x<0, z<0
    fruit.add(new THREE.Mesh(new THREE.SphereGeometry(R, 22, 16, 0, Math.PI * 1.5), rind));
    const face = new THREE.CircleGeometry(R * 0.985, 20, Math.PI / 2, Math.PI);   // half disc, x<0
    const seedGeo = new THREE.SphereGeometry(0.021, 6, 5);
    for (const turn of [0, -Math.PI / 2]) {
      const half = new THREE.Group();
      half.add(new THREE.Mesh(face, pith));
      // the seeds, packed edge to edge across the flesh, a pale rim of pith
      // left round the outside
      for (let row = -6; row <= 6; row++) {
        for (let col = 0; col < 8; col++) {
          const x = -(col + (row & 1 ? 0.5 : 0)) * 0.034 - 0.01, y = row * 0.03;
          if (Math.hypot(x, y) > R * 0.84) continue;
          const sd = new THREE.Mesh(seedGeo, seed);
          const jig = Math.sin(row * 12.9 + col * 78.2) * 43758.5;   // fixed per seed
          sd.position.set(x + ((jig % 1) - 0.5) * 0.012, y + (((jig * 7) % 1) - 0.5) * 0.012, -0.012);
          half.add(sd);
        }
      }
      half.rotation.y = turn;
      fruit.add(half);
    }
    // The crown is what says "pomegranate" rather than "apple": a flared,
    // trumpet-shaped neck with six pointed sepals bending outwards, drawn
    // bigger than life so it reads at pickup size.
    const neck = new THREE.Mesh(new THREE.LatheGeometry([
      new THREE.Vector2(0.075, 0), new THREE.Vector2(0.05, 0.05), new THREE.Vector2(0.048, 0.1),
      new THREE.Vector2(0.075, 0.15), new THREE.Vector2(0.1, 0.17),
    ], 12), rind);
    neck.position.y = R - 0.03;
    fruit.add(neck);
    for (let i = 0; i < 6; i++) {                              // the pointed sepals
      const a = (i / 6) * Math.PI * 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), rind);
      tip.position.set(Math.cos(a) * 0.1, R + 0.17, Math.sin(a) * 0.1);
      tip.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);   // lean outwards
      fruit.add(tip);
    }
  } else {
    const marble = new THREE.MeshStandardMaterial({
      color: 0xf4efe4, roughness: 0.3, emissive: 0x9a9280, emissiveIntensity: 0.25,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), marble);
    head.scale.set(0.88, 1, 0.92);
    head.position.y = 0.16;
    g.add(head);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.09, 6), marble);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.15, 0.19);
    g.add(nose);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.12, 10), marble);
    neck.position.y = -0.02;
    g.add(neck);
    const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.28, 0.18, 12), marble);
    shoulders.position.y = -0.15;
    g.add(shoulders);
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34),
      new THREE.MeshStandardMaterial({ color: 0xc9b98e, roughness: 0.5 }));
    pedestal.position.y = -0.29;
    g.add(pedestal);
    const laurel = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.035, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x4a7a3a, roughness: 0.6, emissive: 0x1e3a14, emissiveIntensity: 0.4 }));
    laurel.rotation.x = Math.PI / 2 - 0.35;
    laurel.position.y = 0.24;
    g.add(laurel);
  }
  g.traverse((n) => { if (n.isMesh) n.castShadow = true; });
  return g;
}
