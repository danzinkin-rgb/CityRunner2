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
