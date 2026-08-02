import * as THREE from '../../vendor/three.module.js';
import { canvasTexture } from '../core/engine.js';

// ---------- shared texture cache (per theme) ----------
const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// Facade texture: window grid with random lit windows, subtle floor bands.
export function facadeTexture(theme, baseColor, floors = 10, cols = 6) {
  return cached(`fac:${theme.id}:${baseColor}:${floors}:${cols}`, () =>
    canvasTexture(256, 512, (g) => {
      g.fillStyle = baseColor; g.fillRect(0, 0, 256, 512);
      // vertical shading for depth
      const sh = g.createLinearGradient(0, 0, 256, 0);
      sh.addColorStop(0, 'rgba(0,0,0,.25)'); sh.addColorStop(0.5, 'rgba(255,255,255,.06)'); sh.addColorStop(1, 'rgba(0,0,0,.3)');
      g.fillStyle = sh; g.fillRect(0, 0, 256, 512);
      const wh = 512 / floors, ww = 256 / cols;
      for (let f = 0; f < floors; f++) {
        // floor band
        g.fillStyle = 'rgba(0,0,0,.18)';
        g.fillRect(0, f * wh, 256, 2);
        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const lit = Math.random() < 0.34;
          const x = cIdx * ww + ww * 0.18, y = f * wh + wh * 0.2;
          const w = ww * 0.64, h = wh * 0.58;
          g.fillStyle = lit ? theme.windowLit : 'rgba(18,24,40,.92)';
          g.fillRect(x, y, w, h);
          if (lit) { g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, w, h * 0.3); }
          else { g.fillStyle = 'rgba(120,160,220,.25)'; g.fillRect(x, y, w, h * 0.35); }
          // frame
          g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
        }
      }
    })
  );
}

export function roadTexture(theme) {
  return cached(`road:${theme.id}`, () =>
    canvasTexture(512, 512, (g) => {
      g.fillStyle = theme.road; g.fillRect(0, 0, 512, 512);
      // asphalt noise
      for (let i = 0; i < 1600; i++) {
        g.fillStyle = `rgba(${120 + Math.random() * 60 | 0},${120 + Math.random() * 60 | 0},${125 + Math.random() * 60 | 0},${Math.random() * 0.08})`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      // lane dashes at the two lane boundaries (road spans 3 lanes)
      g.fillStyle = theme.lane;
      for (const x of [512 / 3, 1024 / 3]) {
        for (let y = 0; y < 512; y += 84) g.fillRect(x - 5, y, 10, 46);
      }
      // wear tracks
      const wear = g.createLinearGradient(0, 0, 512, 0);
      wear.addColorStop(0.15, 'rgba(0,0,0,0)'); wear.addColorStop(0.5, 'rgba(0,0,0,.12)'); wear.addColorStop(0.85, 'rgba(0,0,0,0)');
      g.fillStyle = wear; g.fillRect(0, 0, 512, 512);
    }, 1, 3)
  );
}

export function sidewalkTexture(theme) {
  return cached(`side:${theme.id}`, () =>
    canvasTexture(256, 256, (g) => {
      g.fillStyle = theme.sidewalk; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
        g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      }
      for (let i = 0; i < 500; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`;
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    }, 2, 8)
  );
}

// ---------- buildings ----------
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

export function makeBuilding(theme, w, h, d, rng = Math.random) {
  const color = theme.palette[(rng() * theme.palette.length) | 0];
  const floors = Math.max(4, Math.round(h / 3.2));
  const cols = Math.max(3, Math.round(w / 2.2));
  const mat = new THREE.MeshStandardMaterial({
    map: facadeTexture(theme, color, floors, cols),
    roughness: 0.85, metalness: 0.08,
  });
  const topMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.5), roughness: 0.95 });
  const b = new THREE.Mesh(boxGeo, [mat, mat, topMat, topMat, mat, mat]);
  b.scale.set(w, h, d);
  b.position.y = h / 2;
  b.castShadow = true;
  b.receiveShadow = true;
  const group = new THREE.Group();
  group.add(b);

  // rooftop details: water tank (NYC), chimneys (Paris/London), pergola (Rome)
  if (rng() < 0.55) {
    let top;
    if (theme.id === 'nyc') {
      top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 1.8, 10),
        new THREE.MeshStandardMaterial({ color: 0x6e4a30, roughness: 0.9 }));
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
        new THREE.MeshStandardMaterial({ color: 0x333333 }));
      legs.position.y = -1.2; top.add(legs);
    } else if (theme.id === 'rome') {
      top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2.4),
        new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 }));
    } else {
      top = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.4, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x8a5a44, roughness: 0.95 }));
    }
    top.position.set((rng() - 0.5) * w * 0.5, h + 0.8, (rng() - 0.5) * d * 0.5);
    top.castShadow = true;
    group.add(top);
  }

  // Paris/Rome: mansard-style sloped roof cap
  if ((theme.id === 'paris' || theme.id === 'rome') && rng() < 0.8) {
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, Math.min(w, d) * 0.62, 2.2, 4),
      new THREE.MeshStandardMaterial({ color: theme.id === 'paris' ? 0x4a5866 : 0x9a4a30, roughness: 0.8 }));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w / Math.min(w, d), 1, d / Math.min(w, d));
    roof.position.y = h + 1.1;
    roof.castShadow = true;
    group.add(roof);
  }
  return group;
}

// ---------- props ----------
const mats = {
  black: new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.6, metalness: 0.5 }),
  darkGreen: new THREE.MeshStandardMaterial({ color: 0x1e3a2a, roughness: 0.7 }),
  red: new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.5 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 2.2 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3a6b35, roughness: 0.9 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x2a4a28, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xcbbfa5, roughness: 0.85 }),
  hydrant: new THREE.MeshStandardMaterial({ color: 0xd23b2f, roughness: 0.55 }),
};

export function makeLamp(theme) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.6, 8),
    theme.id === 'paris' || theme.id === 'rome' ? mats.darkGreen : mats.black);
  pole.position.y = 2.3; pole.castShadow = true;
  g.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mats.glow);
  head.position.y = 4.65;
  g.add(head);
  if (theme.id === 'london') {
    // classic crown
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 8), mats.black);
    crown.position.y = 5.0; g.add(crown);
  }
  return g;
}

export function makeTree(cypress = false) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, cypress ? 0.8 : 1.6, 7), mats.trunk);
  trunk.position.y = cypress ? 0.4 : 0.8; trunk.castShadow = true;
  g.add(trunk);
  if (cypress) {
    const fol = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.4, 9), mats.leafDark);
    fol.position.y = 2.9; fol.castShadow = true;
    g.add(fol);
  } else {
    for (let i = 0; i < 3; i++) {
      const fol = new THREE.Mesh(new THREE.SphereGeometry(0.9 - i * 0.14, 9, 7), mats.leaf);
      fol.position.set((Math.random() - 0.5) * 0.7, 1.9 + i * 0.55, (Math.random() - 0.5) * 0.7);
      fol.castShadow = true;
      g.add(fol);
    }
  }
  return g;
}

export function makePhonebox() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.3, 0.9), mats.red);
  body.position.y = 1.15; body.castShadow = true;
  g.add(body);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 1.0), mats.red);
  cap.position.y = 2.4; g.add(cap);
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.3, 0.94),
    new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffedb0, emissiveIntensity: 0.9 }));
  win.position.y = 1.35; g.add(win);
  return g;
}

export function makeHydrant() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 10), mats.hydrant);
  body.position.y = 0.35; body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mats.hydrant);
  cap.position.y = 0.74; g.add(cap);
  return g;
}

export function makeColumn() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 4.2, 12), mats.stone);
  shaft.position.y = 2.1; shaft.castShadow = true; g.add(shaft);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), mats.stone);
  cap.position.y = 4.35; g.add(cap);
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), mats.stone);
  base.position.y = 0.15; g.add(base);
  return g;
}

// Times Square style animated-feel billboard with per-city ad text.
const ADS = {
  nyc: ['BROADWAY', 'LIVE!', 'CITY RUN', '42nd ST', 'NEON'],
  paris: ['CAFÉ', 'MODE', 'PARFUM', 'BISTRO'],
  london: ['WEST END', 'TEA & CO', 'THE TUBE', 'OXFORD ST'],
  rome: ['GELATO', 'CINEMA', 'MODA', 'ROMA'],
};

export function makeBillboard(theme, w = 5, h = 2.6) {
  const words = ADS[theme.id] || ADS.nyc;
  const text = words[(Math.random() * words.length) | 0];
  const hue = (Math.random() * 360) | 0;
  const tex = canvasTexture(256, 128, (g) => {
    const bg = g.createLinearGradient(0, 0, 256, 128);
    bg.addColorStop(0, `hsl(${hue},85%,55%)`);
    bg.addColorStop(1, `hsl(${(hue + 60) % 360},85%,45%)`);
    g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(255,255,255,.95)';
    g.font = '900 44px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 66);
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 8; g.strokeRect(0, 0, 256, 128);
  });
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.2),
    [mats.black, mats.black, mats.black, mats.black,
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.5 }),
      mats.black]);
  board.castShadow = true;
  return board;
}

export function makeAwning(theme) {
  const g = new THREE.Group();
  const colors = theme.id === 'paris' ? [0x8a1f2d, 0x1f4a8a, 0x2d6b3f] : [0xb03030, 0x306b40];
  const c = colors[(Math.random() * colors.length) | 0];
  const tex = canvasTexture(128, 64, (g2) => {
    g2.fillStyle = '#' + c.toString(16).padStart(6, '0'); g2.fillRect(0, 0, 128, 64);
    g2.fillStyle = 'rgba(255,255,255,.85)';
    for (let x = 0; x < 128; x += 24) g2.fillRect(x, 0, 12, 64);
  });
  const awn = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.5),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  awn.rotation.x = 0.28;
  awn.position.y = 3.0;
  awn.castShadow = true;
  g.add(awn);
  return g;
}

export function makePostbox() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.5, 12), mats.red);
  body.position.y = 0.75; body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.red);
  cap.position.y = 1.5; g.add(cap);
  return g;
}

export function makeFountain() {
  const g = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 14), mats.stone);
  basin.position.y = 0.25; basin.castShadow = true; g.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.1, 14),
    new THREE.MeshStandardMaterial({ color: 0x3a7a9c, roughness: 0.15, metalness: 0.4 }));
  water.position.y = 0.5; g.add(water);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 10), mats.stone);
  spire.position.y = 1.2; g.add(spire);
  return g;
}

export function makeProp(kind, theme) {
  switch (kind) {
    case 'lamp': case 'lamp_paris': case 'lamp_london': case 'lamp_rome': return makeLamp(theme);
    case 'tree': return makeTree(false);
    case 'cypress': return makeTree(true);
    case 'phonebox': return makePhonebox();
    case 'postbox': return makePostbox();
    case 'hydrant': return makeHydrant();
    case 'column': return makeColumn();
    case 'billboard': { const b = makeBillboard(theme); b.position.y = 5 + Math.random() * 3; return b; }
    case 'awning': return makeAwning(theme);
    case 'fountain': return makeFountain();
    case 'kiosk': {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 2.4, 10), mats.darkGreen);
      body.position.y = 1.2; body.castShadow = true; g.add(body);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mats.darkGreen);
      dome.position.y = 2.4; g.add(dome);
      return g;
    }
    case 'scaffold': {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: 0x2a5a8a, roughness: 0.5, metalness: 0.6 });
      for (const x of [-1.4, 1.4]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), m);
        pole.position.set(x, 1.7, 0); g.add(pole);
      }
      const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x7a5c38, roughness: 0.9 }));
      deck.position.y = 3.3; deck.castShadow = true; g.add(deck);
      return g;
    }
    case 'hotdog': {
      const g = new THREE.Group();
      const cart = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.4, metalness: 0.5 }));
      cart.position.y = 0.8; cart.castShadow = true; g.add(cart);
      const umb = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8c020, roughness: 0.7 }));
      umb.position.y = 2.2; g.add(umb);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), mats.black);
      pole.position.y = 1.5; g.add(pole);
      return g;
    }
    case 'arch': {
      const g = new THREE.Group();
      for (const x of [-1.3, 1.3]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.4, 0.7), mats.stone);
        pier.position.set(x, 1.7, 0); pier.castShadow = true; g.add(pier);
      }
      const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.7, 0.8), mats.stone);
      top.position.y = 3.75; top.castShadow = true; g.add(top);
      return g;
    }
    case 'bunting': {
      const g = new THREE.Group();
      const cols = [0xc8102e, 0xffffff, 0x012169];
      for (let i = 0; i < 7; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4),
          new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.8 }));
        f.rotation.x = Math.PI;
        f.position.set(-1.5 + i * 0.5, 3.6 - Math.sin((i / 6) * Math.PI) * 0.3, 0);
        g.add(f);
      }
      return g;
    }
    default: return makeLamp(theme);
  }
}

// ---------- vehicles (full-lane obstacles) ----------
export function makeVehicle(theme) {
  const g = new THREE.Group();
  const kind = theme.vehicle;
  if (kind === 'bus') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.4, 5.2),
      new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.35, metalness: 0.2 }));
    body.position.y = 2.0; body.castShadow = true; g.add(body);
    const winTex = canvasTexture(128, 64, (c) => {
      c.fillStyle = '#c8102e'; c.fillRect(0, 0, 128, 64);
      c.fillStyle = '#cfe4ff';
      for (let x = 6; x < 128; x += 26) { c.fillRect(x, 6, 18, 20); c.fillRect(x, 36, 18, 20); }
    });
    const side = new THREE.Mesh(new THREE.BoxGeometry(2.06, 2.6, 4.9),
      new THREE.MeshStandardMaterial({ map: winTex, roughness: 0.4 }));
    side.position.y = 2.2; g.add(side);
  } else if (kind === 'taxi') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.0, 4.2),
      new THREE.MeshStandardMaterial({ color: 0xf2b800, roughness: 0.3, metalness: 0.3 }));
    body.position.y = 0.85; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.75, 2.2),
      new THREE.MeshStandardMaterial({ color: 0xf2b800, roughness: 0.3 }));
    cab.position.set(0, 1.65, 0.1); g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.5, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x9ecbe8, roughness: 0.1, metalness: 0.6 }));
    glass.position.set(0, 1.68, 0.1); g.add(glass);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.3), mats.glow);
    sign.position.y = 2.15; g.add(sign);
  } else if (kind === 'vespa') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.9),
      new THREE.MeshStandardMaterial({ color: 0x7fb8d8, roughness: 0.3, metalness: 0.3 }));
    body.position.y = 0.75; body.castShadow = true; g.add(body);
    const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x8a4a3a, roughness: 0.8 }));
    rider.position.y = 1.6; g.add(rider);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.3 }));
    helm.position.y = 2.15; g.add(helm);
  } else { // citroen — rounded classic car
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 2.4, 4, 10),
      new THREE.MeshStandardMaterial({ color: 0x4a5a70, roughness: 0.35, metalness: 0.4 }));
    body.rotation.x = Math.PI / 2;
    body.position.y = 1.0; body.castShadow = true; g.add(body);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xaad4ee, roughness: 0.1, metalness: 0.5 }));
    glass.scale.set(1, 0.6, 1.2);
    glass.position.set(0, 1.6, 0.2); g.add(glass);
  }
  // wheels
  const wg = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  const wm = new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 });
  const isBike = kind === 'vespa';
  const positions = isBike
    ? [[0, 0.35, 0.8], [0, 0.35, -0.8]]
    : [[-0.85, 0.35, 1.4], [0.85, 0.35, 1.4], [-0.85, 0.35, -1.4], [0.85, 0.35, -1.4]];
  for (const p of positions) {
    const w = new THREE.Mesh(wg, wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    g.add(w);
  }
  return g;
}
