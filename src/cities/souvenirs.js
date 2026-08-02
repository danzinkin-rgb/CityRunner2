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
    const red = new THREE.MeshStandardMaterial({
      color: 0xd6182e, roughness: 0.3, emissive: 0x7a0a16, emissiveIntensity: 0.45,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.62, 0.36), red);
    g.add(body);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.42), red);
    cap.position.y = 0.35;
    g.add(cap);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), red);
    dome.scale.y = 0.5;
    dome.position.y = 0.39;
    g.add(dome);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.4, 0.38),
      new THREE.MeshStandardMaterial({
        color: 0xfff2cc, roughness: 0.3, emissive: 0xffe1a0, emissiveIntensity: 0.9,
      }));
    win.position.y = -0.04;
    g.add(win);
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
