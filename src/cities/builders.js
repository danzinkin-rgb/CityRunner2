import * as THREE from '../../vendor/three.module.js';
import { canvasTexture } from '../core/engine.js';

// ---------- shared texture cache (per theme) ----------
const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// ---------- shared geometries (reused across every spawn) ----------
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 4.6, 8);
const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
const bulbGeo = new THREE.SphereGeometry(0.09, 8, 6);

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

// ---------- facade texture ----------
// Per-city styled facade: cornice on top, window grid with city-specific
// detailing, and a colorful ground-floor storefront band.
export function facadeTexture(theme, baseColor, floors = 10, cols = 6, variant = 0) {
  return cached(`fac:${theme.id}:${baseColor}:${floors}:${cols}:${variant}`, () =>
    canvasTexture(256, 512, (g) => {
      const W = 256, H = 512;
      g.fillStyle = baseColor; g.fillRect(0, 0, W, H);

      // gentle vertical shading for roundness (kept light — daytime look)
      const sh = g.createLinearGradient(0, 0, W, 0);
      sh.addColorStop(0, 'rgba(0,0,0,.12)');
      sh.addColorStop(0.5, 'rgba(255,255,255,.08)');
      sh.addColorStop(1, 'rgba(0,0,0,.14)');
      g.fillStyle = sh; g.fillRect(0, 0, W, H);

      // brick coursing for brick cities
      if (theme.id === 'london' || (theme.id === 'nyc' && variant % 2 === 0)) {
        g.fillStyle = 'rgba(0,0,0,.06)';
        for (let y = 0; y < H; y += 7) g.fillRect(0, y, W, 1);
        g.fillStyle = 'rgba(255,255,255,.04)';
        for (let y = 3; y < H; y += 14) g.fillRect(0, y, W, 1);
      }

      // storefront band height scales with floor count so it always reads as
      // ~1.5 street-level storeys, never a giant stretched stripe on towers
      const CORNICE = 16;
      const SHOP_H = Math.max(46, Math.min(110, ((512 - CORNICE) / (floors + 1.6)) * 1.6));
      const bodyTop = CORNICE + 4;
      const bodyH = H - SHOP_H - bodyTop;
      const wh = bodyH / floors, ww = W / cols;

      // --- windows ---
      for (let f = 0; f < floors; f++) {
        const rowY = bodyTop + f * wh;
        // floor slab shadow line
        g.fillStyle = 'rgba(0,0,0,.12)';
        g.fillRect(0, rowY + wh - 2, W, 2);

        // Paris: continuous wrought-iron balcony line under the windows
        if (theme.id === 'paris' && f > 0) {
          g.fillStyle = 'rgba(45,50,62,.8)';
          g.fillRect(4, rowY + wh * 0.86, W - 8, 3);
          for (let x = 8; x < W; x += 10) g.fillRect(x, rowY + wh * 0.72, 2, wh * 0.16);
        }

        for (let cIdx = 0; cIdx < cols; cIdx++) {
          const tall = theme.id === 'paris';
          const x = cIdx * ww + ww * (tall ? 0.22 : 0.18);
          const y = rowY + wh * (tall ? 0.12 : 0.2);
          const w = ww * (tall ? 0.56 : 0.64);
          const h = wh * (tall ? 0.72 : 0.58);
          const lit = Math.random() < 0.16;

          // Rome: shutters flanking a smaller window
          if (theme.id === 'rome') {
            g.fillStyle = 'rgba(78,98,72,.95)';
            g.fillRect(x - w * 0.24, y, w * 0.2, h);
            g.fillRect(x + w + w * 0.04, y, w * 0.2, h);
            g.fillStyle = 'rgba(0,0,0,.2)';
            for (let ly = y + 3; ly < y + h - 2; ly += 5) {
              g.fillRect(x - w * 0.24, ly, w * 0.2, 1);
              g.fillRect(x + w + w * 0.04, ly, w * 0.2, 1);
            }
          }

          // London / Paris: bright trim surround
          if (theme.id === 'london' || theme.id === 'paris') {
            g.fillStyle = theme.trim || '#f0ecdc';
            g.fillRect(x - 4, y - 4, w + 8, h + 8);
          }

          // glass: sky reflection gradient (day) or warm lit
          if (lit) {
            g.fillStyle = theme.windowLit;
            g.fillRect(x, y, w, h);
            g.fillStyle = 'rgba(255,255,255,.4)';
            g.fillRect(x, y, w, h * 0.28);
          } else {
            const gl = g.createLinearGradient(0, y, 0, y + h);
            gl.addColorStop(0, theme.windowDay || '#9cc0e0');
            gl.addColorStop(1, 'rgba(38,54,84,.95)');
            g.fillStyle = gl;
            g.fillRect(x, y, w, h);
            g.fillStyle = 'rgba(255,255,255,.28)';
            g.beginPath();
            g.moveTo(x, y + h); g.lineTo(x + w * 0.45, y); g.lineTo(x + w * 0.75, y); g.lineTo(x + w * 0.3, y + h);
            g.fill();
          }
          // mullions
          g.strokeStyle = 'rgba(30,34,44,.55)'; g.lineWidth = 2;
          g.strokeRect(x, y, w, h);
          g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();

          // London: white sill
          if (theme.id === 'london') {
            g.fillStyle = theme.trim || '#f0ecdc';
            g.fillRect(x - 5, y + h + 2, w + 10, 4);
          }
          // NYC: occasional AC unit
          if (theme.id === 'nyc' && Math.random() < 0.14) {
            g.fillStyle = '#b9bec6';
            g.fillRect(x + w * 0.3, y + h - 7, w * 0.4, 8);
            g.fillStyle = 'rgba(0,0,0,.3)';
            g.strokeRect(x + w * 0.3, y + h - 7, w * 0.4, 8);
          }
        }
      }

      // --- cornice ---
      g.fillStyle = theme.trim || '#e8e0cc';
      g.fillRect(0, 0, W, CORNICE);
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.fillRect(0, CORNICE, W, 3);
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(0, 2, W, 2);
      // dentils
      g.fillStyle = 'rgba(0,0,0,.18)';
      for (let x = 4; x < W; x += 14) g.fillRect(x, CORNICE - 5, 7, 5);

      // --- ground floor storefronts ---
      const shopY = H - SHOP_H;
      const signH = Math.round(SHOP_H * 0.26);
      const awnH = Math.round(SHOP_H * 0.15);
      const shops = theme.storefront || ['#c8102e', '#2e8fd8'];
      const nShops = 2 + (variant % 2);
      const shopW = W / nShops;
      for (let s = 0; s < nShops; s++) {
        const sx = s * shopW;
        const col = shops[(Math.random() * shops.length) | 0];
        // pilaster background
        g.fillStyle = 'rgba(0,0,0,.25)';
        g.fillRect(sx, shopY, shopW, SHOP_H);
        // sign band
        g.fillStyle = col;
        g.fillRect(sx + 3, shopY + 2, shopW - 6, signH);
        g.fillStyle = 'rgba(255,255,255,.92)';
        const nDash = 2 + ((Math.random() * 3) | 0);
        let dx = sx + 10;
        for (let dI = 0; dI < nDash; dI++) {
          const dw = 12 + Math.random() * 22;
          g.fillRect(dx, shopY + 2 + signH * 0.35, dw, Math.max(4, signH * 0.3));
          dx += dw + 7;
          if (dx > sx + shopW - 14) break;
        }
        // awning (striped) over the glass
        if (Math.random() < 0.65) {
          for (let ax = sx + 4; ax < sx + shopW - 4; ax += 12) {
            g.fillStyle = (ax / 12 | 0) % 2 ? col : '#f4f0e4';
            g.fillRect(ax, shopY + 4 + signH, Math.min(12, sx + shopW - 4 - ax), awnH);
          }
          g.fillStyle = 'rgba(0,0,0,.25)';
          g.fillRect(sx + 4, shopY + 4 + signH + awnH - 2, shopW - 8, 3);
        }
        // shop glass — warm and inviting
        const gy = shopY + 6 + signH + awnH;
        const glassGrad = g.createLinearGradient(0, gy, 0, H - 6);
        glassGrad.addColorStop(0, '#ffe9b0');
        glassGrad.addColorStop(1, '#e8b25c');
        g.fillStyle = glassGrad;
        g.fillRect(sx + 6, gy, shopW - 12, H - 8 - gy);
        g.strokeStyle = 'rgba(40,36,30,.7)'; g.lineWidth = 3;
        g.strokeRect(sx + 6, gy, shopW - 12, H - 8 - gy);
        g.beginPath(); g.moveTo(sx + shopW / 2, gy); g.lineTo(sx + shopW / 2, H - 8); g.stroke();
        // silhouettes in the window
        const sil = Math.min(30, SHOP_H * 0.4);
        g.fillStyle = 'rgba(120,70,30,.45)';
        g.fillRect(sx + 12, H - 8 - sil, 14, sil);
        g.fillRect(sx + shopW - 30, H - 8 - sil * 1.15, 12, sil * 1.15);
      }
      // sidewalk shadow line at the very bottom
      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(0, H - 4, W, 4);
    })
  );
}

export function roadTexture(theme) {
  return cached(`road:${theme.id}`, () =>
    canvasTexture(512, 512, (g) => {
      g.fillStyle = theme.road; g.fillRect(0, 0, 512, 512);
      // asphalt noise
      for (let i = 0; i < 1600; i++) {
        g.fillStyle = `rgba(${140 + Math.random() * 60 | 0},${140 + Math.random() * 60 | 0},${145 + Math.random() * 60 | 0},${Math.random() * 0.09})`;
        g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      }
      // lane dashes at the two lane boundaries (road spans 3 lanes)
      g.fillStyle = theme.lane;
      for (const x of [512 / 3, 1024 / 3]) {
        for (let y = 0; y < 512; y += 84) g.fillRect(x - 5, y, 10, 46);
      }
      // crisp edge lines
      g.fillStyle = 'rgba(240,240,240,.85)';
      g.fillRect(6, 0, 5, 512);
      g.fillRect(501, 0, 5, 512);
      // wear tracks
      const wear = g.createLinearGradient(0, 0, 512, 0);
      wear.addColorStop(0.15, 'rgba(0,0,0,0)'); wear.addColorStop(0.5, 'rgba(0,0,0,.1)'); wear.addColorStop(0.85, 'rgba(0,0,0,0)');
      g.fillStyle = wear; g.fillRect(0, 0, 512, 512);
    }, 1, 3)
  );
}

export function sidewalkTexture(theme) {
  return cached(`side:${theme.id}`, () =>
    canvasTexture(256, 256, (g) => {
      g.fillStyle = theme.sidewalk; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
        g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      }
      for (let i = 0; i < 500; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`;
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      // warm highlight speckle
      for (let i = 0; i < 200; i++) {
        g.fillStyle = `rgba(255,240,210,${Math.random() * 0.08})`;
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    }, 2, 8)
  );
}

// ---------- buildings ----------
// side: -1 building on the left of the street, +1 on the right (used to hang
// billboards on the street-facing face). 0/undefined = decorative back row.
export function makeBuilding(theme, w, h, d, rng = Math.random, side = 0) {
  const color = theme.palette[(rng() * theme.palette.length) | 0];
  const floors = Math.max(4, Math.round(h / 3.2));
  const cols = Math.max(3, Math.round(w / 2.2));
  const variant = (rng() * 4) | 0;
  const mat = new THREE.MeshStandardMaterial({
    map: facadeTexture(theme, color, floors, cols, variant),
    roughness: 0.85, metalness: 0.04,
  });
  const topMat = cached(`btop:${theme.id}:${color}`, () =>
    new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.6), roughness: 0.95 }));
  const b = new THREE.Mesh(boxGeo, [mat, mat, topMat, topMat, mat, mat]);
  b.scale.set(w, h, d);
  b.position.y = h / 2;
  b.castShadow = true;
  b.receiveShadow = true;
  const group = new THREE.Group();
  group.add(b);

  // cornice slab crowning the facade
  const cornice = new THREE.Mesh(boxGeo, cached(`cornice:${theme.id}`, () =>
    new THREE.MeshStandardMaterial({ color: theme.trim || '#e8e0cc', roughness: 0.9 })));
  cornice.scale.set(w * 1.08, 0.45, d * 1.08);
  cornice.position.y = h + 0.22;
  group.add(cornice);

  // NYC: glowing billboards bolted to the street-facing facade
  if (theme.id === 'nyc' && side !== 0 && rng() < 0.6 && h > 18) {
    const n = rng() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const bb = makeBillboard(theme, 3.6 + rng() * 2.4, 2 + rng() * 1.4);
      bb.position.set(-side * (w / 2 + 0.18), h * (0.35 + rng() * 0.4), (rng() - 0.5) * d * 0.5);
      bb.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(bb);
    }
  }

  // rooftop details: water tank (NYC), chimneys (London), pergola (Rome)
  if (rng() < 0.55) {
    let top;
    if (theme.id === 'nyc') {
      top = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 1.8, 10),
        cached('mat:tank', () => new THREE.MeshStandardMaterial({ color: 0x8a6242, roughness: 0.9 })));
      const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 6),
        cached('mat:tanklegs', () => new THREE.MeshStandardMaterial({ color: 0x444444 })));
      legs.position.y = -1.2; top.add(legs);
      const lid = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.6, 10),
        cached('mat:tanklid', () => new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.9 })));
      lid.position.y = 1.2; top.add(lid);
    } else if (theme.id === 'rome') {
      top = new THREE.Mesh(boxGeo,
        cached('mat:pergola', () => new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 })));
      top.scale.set(2.4, 0.4, 2.4);
    } else {
      top = new THREE.Mesh(boxGeo,
        cached('mat:chimney', () => new THREE.MeshStandardMaterial({ color: 0x9a6248, roughness: 0.95 })));
      top.scale.set(0.7, 1.4, 0.7);
    }
    top.position.set((rng() - 0.5) * w * 0.5, h + 0.9, (rng() - 0.5) * d * 0.5);
    top.castShadow = true;
    group.add(top);
  }

  // Paris/Rome: mansard / terracotta sloped roof cap
  if ((theme.id === 'paris' || theme.id === 'rome') && rng() < 0.85) {
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, Math.min(w, d) * 0.62, 2.2, 4),
      cached(`mat:roof:${theme.id}`, () => new THREE.MeshStandardMaterial({
        color: theme.roof || (theme.id === 'paris' ? 0x5d6d7e : 0xb0472e), roughness: 0.8 })));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w / Math.min(w, d), 1, d / Math.min(w, d));
    roof.position.y = h + 1.5;
    roof.castShadow = true;
    group.add(roof);
  }
  return group;
}

// ---------- props ----------
const mats = {
  black: new THREE.MeshStandardMaterial({ color: 0x24242c, roughness: 0.6, metalness: 0.5 }),
  darkGreen: new THREE.MeshStandardMaterial({ color: 0x1e4a32, roughness: 0.6 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd41f38, roughness: 0.45 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 2.2 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x6a4c38, roughness: 0.95 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x4a8c42, roughness: 0.9 }),
  leafDark: new THREE.MeshStandardMaterial({ color: 0x2f5c30, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: 0xdccfb0, roughness: 0.85 }),
  hydrant: new THREE.MeshStandardMaterial({ color: 0xe4483a, roughness: 0.5 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xd8dce4, roughness: 0.35, metalness: 0.6 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd8a838, roughness: 0.4, metalness: 0.5 }),
};

export function makeLamp(theme) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(poleGeo,
    theme.id === 'paris' || theme.id === 'rome' ? mats.darkGreen : mats.black);
  pole.position.y = 2.3; pole.castShadow = true;
  g.add(pole);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mats.glow);
  head.position.y = 4.65;
  g.add(head);
  if (theme.id === 'london') {
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 8), mats.black);
    crown.position.y = 5.0; g.add(crown);
  } else if (theme.id === 'paris' || theme.id === 'rome') {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.2, 8), mats.gold);
    collar.position.y = 4.42; g.add(collar);
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
  const body = new THREE.Mesh(boxGeo, mats.red);
  body.scale.set(0.9, 2.3, 0.9);
  body.position.y = 1.15; body.castShadow = true;
  g.add(body);
  const cap = new THREE.Mesh(boxGeo, mats.red);
  cap.scale.set(1.0, 0.22, 1.0);
  cap.position.y = 2.4; g.add(cap);
  const win = new THREE.Mesh(boxGeo,
    cached('mat:phonewin', () => new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffedb0, emissiveIntensity: 0.9 })));
  win.scale.set(0.62, 1.3, 0.94);
  win.position.y = 1.35; g.add(win);
  return g;
}

export function makeHydrant() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 10), mats.black);
  base.position.y = 0.06; g.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.55, 10), mats.hydrant);
  body.position.y = 0.38; body.castShadow = true; g.add(body);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mats.hydrant);
  cap.position.y = 0.66; g.add(cap);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), mats.chrome);
  knob.position.y = 0.78; g.add(knob);
  // side nozzles
  for (const sx of [-1, 1]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 8), mats.chrome);
    noz.rotation.z = Math.PI / 2;
    noz.position.set(sx * 0.19, 0.45, 0); g.add(noz);
  }
  return g;
}

export function makeColumn() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 4.2, 12), mats.stone);
  shaft.position.y = 2.1; shaft.castShadow = true; g.add(shaft);
  const cap = new THREE.Mesh(boxGeo, mats.stone);
  cap.scale.set(1.0, 0.3, 1.0); cap.position.y = 4.35; g.add(cap);
  const base = new THREE.Mesh(boxGeo, mats.stone);
  base.scale.set(1.0, 0.3, 1.0); base.position.y = 0.15; g.add(base);
  return g;
}

// Times Square style animated-feel billboard with per-city ad text.
const ADS = {
  nyc: ['BROADWAY', 'LIVE!', 'CITY RUN', '42nd ST', 'NEON', 'PIZZA', 'JAZZ CLUB'],
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
    bg.addColorStop(0, `hsl(${hue},90%,58%)`);
    bg.addColorStop(1, `hsl(${(hue + 60) % 360},90%,46%)`);
    g.fillStyle = bg; g.fillRect(0, 0, 256, 128);
    g.fillStyle = 'rgba(255,255,255,.96)';
    g.font = '900 42px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 64, 236);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 6; g.strokeRect(5, 5, 246, 118);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(0, 0, 256, 128);
  });
  const board = new THREE.Mesh(boxGeo,
    [mats.black, mats.black, mats.black, mats.black,
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.35 }),
      mats.black]);
  board.scale.set(w, h, 0.2);
  board.castShadow = true;
  return board;
}

export function makeAwning(theme) {
  const g = new THREE.Group();
  const shops = theme.storefront || ['#b03030', '#306b40'];
  const c = shops[(Math.random() * shops.length) | 0];
  const tex = canvasTexture(128, 64, (g2) => {
    g2.fillStyle = c; g2.fillRect(0, 0, 128, 64);
    g2.fillStyle = 'rgba(255,255,255,.9)';
    for (let x = 0; x < 128; x += 24) g2.fillRect(x, 0, 12, 64);
    g2.fillStyle = 'rgba(0,0,0,.15)'; g2.fillRect(0, 56, 128, 8);
  });
  const awn = new THREE.Mesh(boxGeo,
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  awn.scale.set(3.4, 0.12, 1.5);
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
  const slot = new THREE.Mesh(boxGeo, mats.black);
  slot.scale.set(0.3, 0.06, 0.04);
  slot.position.set(0, 1.2, 0.31); g.add(slot);
  return g;
}

export function makeFountain() {
  const g = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.5, 14), mats.stone);
  basin.position.y = 0.25; basin.castShadow = true; g.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.1, 14),
    cached('mat:water', () => new THREE.MeshStandardMaterial({ color: 0x4aa2c8, roughness: 0.12, metalness: 0.3 })));
  water.position.y = 0.5; g.add(water);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.4, 10), mats.stone);
  spire.position.y = 1.2; g.add(spire);
  return g;
}

// Paris Morris advertising column: poster-band cylinder, ornate dome, finial.
function makeMorrisColumn(theme) {
  const g = new THREE.Group();
  const posterTex = cached('morrisTex', () => canvasTexture(256, 256, (c) => {
    c.fillStyle = '#1e4a32'; c.fillRect(0, 0, 256, 256);
    const posters = [['#e8443a', 'CIRQUE'], ['#f2b21e', 'OPÉRA'], ['#3a78c8', 'REVUE']];
    for (let i = 0; i < 3; i++) {
      const px = 10 + i * 84;
      c.fillStyle = '#f4eede';
      c.fillRect(px, 22, 68, 212);
      c.fillStyle = posters[i][0];
      c.fillRect(px + 5, 30, 58, 90);
      c.fillStyle = '#222';
      c.font = '900 15px Arial'; c.textAlign = 'center';
      c.fillText(posters[i][1], px + 34, 145);
      c.fillStyle = posters[i][0];
      c.fillRect(px + 8, 160, 52, 6);
      c.fillRect(px + 8, 174, 52, 6);
      c.fillRect(px + 8, 188, 40, 6);
    }
  }));
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.3, 12), mats.darkGreen);
  base.position.y = 0.15; base.castShadow = true; g.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 2.3, 14),
    cached('mat:morrisBody', () => new THREE.MeshStandardMaterial({ map: cache.get('morrisTex'), roughness: 0.75 })));
  body.position.y = 1.45; body.castShadow = true; g.add(body);
  const cornice = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.6, 0.28, 14), mats.darkGreen);
  cornice.position.y = 2.72; g.add(cornice);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.darkGreen);
  dome.scale.y = 0.85;
  dome.position.y = 2.86; g.add(dome);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mats.gold);
  finial.position.y = 3.5; g.add(finial);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.25, 6), mats.darkGreen);
  tip.position.y = 3.34; g.add(tip);
  return g;
}

// NYC corner newsstand: colorful magazine racks under a striped awning.
function makeNewsstand(theme) {
  const g = new THREE.Group();
  const magTex = cached('magTex', () => canvasTexture(128, 128, (c) => {
    c.fillStyle = '#2a4a38'; c.fillRect(0, 0, 128, 128);
    for (let y = 8; y < 120; y += 30) {
      for (let x = 6; x < 120; x += 20) {
        c.fillStyle = `hsl(${(Math.random() * 360) | 0},80%,55%)`;
        c.fillRect(x, y, 16, 24);
        c.fillStyle = 'rgba(255,255,255,.85)';
        c.fillRect(x + 2, y + 2, 12, 5);
      }
    }
  }));
  const body = new THREE.Mesh(boxGeo,
    cached('mat:newsBody', () => new THREE.MeshStandardMaterial({ color: 0x2a5a44, roughness: 0.7 })));
  body.scale.set(2.0, 1.7, 1.1);
  body.position.y = 0.85; body.castShadow = true; g.add(body);
  const rack = new THREE.Mesh(boxGeo,
    cached('mat:newsRack', () => new THREE.MeshStandardMaterial({ map: cache.get('magTex'), roughness: 0.8 })));
  rack.scale.set(1.8, 1.3, 0.08);
  rack.position.set(0, 0.9, 0.58); g.add(rack);
  const awnTex = cached('newsAwnTex', () => canvasTexture(128, 32, (c) => {
    for (let x = 0; x < 128; x += 16) {
      c.fillStyle = (x / 16) % 2 ? '#f4f0e4' : '#d41f38';
      c.fillRect(x, 0, 16, 32);
    }
  }));
  const awn = new THREE.Mesh(boxGeo,
    cached('mat:newsAwn', () => new THREE.MeshStandardMaterial({ map: cache.get('newsAwnTex'), roughness: 0.8 })));
  awn.scale.set(2.3, 0.1, 1.5);
  awn.rotation.x = 0.24;
  awn.position.set(0, 1.95, 0.35);
  awn.castShadow = true; g.add(awn);
  const sign = new THREE.Mesh(boxGeo,
    cached('mat:newsSign', () => {
      const t = canvasTexture(128, 32, (c) => {
        c.fillStyle = '#d41f38'; c.fillRect(0, 0, 128, 32);
        c.fillStyle = '#fff'; c.font = '900 18px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('NEWS', 64, 17);
      });
      return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.4 });
    }));
  sign.scale.set(1.6, 0.4, 0.08);
  sign.position.set(0, 2.25, 0.1); g.add(sign);
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
    case 'kiosk': return makeMorrisColumn(theme);
    case 'newsstand': return makeNewsstand(theme);
    case 'hotdog': {
      const g = new THREE.Group();
      const cart = new THREE.Mesh(boxGeo, mats.chrome);
      cart.scale.set(1.6, 1.0, 0.9);
      cart.position.y = 0.8; cart.castShadow = true; g.add(cart);
      const stripe = new THREE.Mesh(boxGeo, mats.red);
      stripe.scale.set(1.62, 0.24, 0.92);
      stripe.position.y = 1.05; g.add(stripe);
      const umbTex = cached('umbTex', () => canvasTexture(128, 64, (c) => {
        for (let x = 0; x < 128; x += 16) {
          c.fillStyle = (x / 16) % 2 ? '#f2b800' : '#2a5ac8';
          c.fillRect(x, 0, 16, 64);
        }
      }));
      const umb = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.5, 10),
        cached('mat:umb', () => new THREE.MeshStandardMaterial({ map: cache.get('umbTex'), roughness: 0.7 })));
      umb.position.y = 2.2; g.add(umb);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), mats.black);
      pole.position.y = 1.5; g.add(pole);
      return g;
    }
    case 'arch': {
      const g = new THREE.Group();
      for (const x of [-1.3, 1.3]) {
        const pier = new THREE.Mesh(boxGeo, mats.stone);
        pier.scale.set(0.7, 3.4, 0.7);
        pier.position.set(x, 1.7, 0); pier.castShadow = true; g.add(pier);
      }
      const top = new THREE.Mesh(boxGeo, mats.stone);
      top.scale.set(3.4, 0.7, 0.8);
      top.position.y = 3.75; top.castShadow = true; g.add(top);
      return g;
    }
    case 'bunting': {
      const g = new THREE.Group();
      const cols = [0xc8102e, 0xffffff, 0x012169];
      for (let i = 0; i < 7; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 4),
          cached(`mat:bunt:${i % 3}`, () => new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.8 })));
        f.rotation.x = Math.PI;
        f.position.set(-1.5 + i * 0.5, 3.6 - Math.sin((i / 6) * Math.PI) * 0.3, 0);
        g.add(f);
      }
      return g;
    }
    default: return makeLamp(theme);
  }
}

// ---------- overhead street dressing (spans the road) ----------
// Rome: string lights; London: union-jack bunting line; Paris: tricolor line.
export function makeStreetSpan(theme, width = 13) {
  const g = new THREE.Group();
  const wire = new THREE.Mesh(boxGeo,
    cached('mat:wire', () => new THREE.MeshStandardMaterial({ color: 0x4a4a54, roughness: 0.8 })));
  wire.scale.set(width, 0.022, 0.022);
  g.add(wire);
  const n = 11;
  if (theme.id === 'rome') {
    const bulbMat = cached('mat:bulb', () =>
      new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffdf90, emissiveIntensity: 2.6 }));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set((t - 0.5) * width, -0.18 - Math.sin(t * Math.PI) * 0.55, 0);
      g.add(bulb);
    }
    wire.rotation.z = 0;
  } else {
    const cols = theme.id === 'london'
      ? [0xc8102e, 0xffffff, 0x012169]
      : [0x1f4a8a, 0xffffff, 0xd41f38];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 4),
        cached(`mat:flag:${theme.id}:${i % 3}`, () =>
          new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.8 })));
      f.rotation.x = Math.PI;
      f.position.set((t - 0.5) * width, -0.24 - Math.sin(t * Math.PI) * 0.45, 0);
      g.add(f);
    }
  }
  return g;
}

// ---------- vehicles ----------
const PARKED_COLORS = [0xe84a3a, 0x3a78d8, 0x3fae5c, 0xf2b800, 0xe8e8ec, 0x8a4fd0, 0x2a2e38, 0xd86aa8];

// Small decorative sedan for parked / passing traffic.
export function makeParkedCar(theme) {
  const g = new THREE.Group();
  // NYC curbs get a share of yellow cabs for flavor
  const col = theme.id === 'nyc' && Math.random() < 0.35
    ? 0xffc020
    : PARKED_COLORS[(Math.random() * PARKED_COLORS.length) | 0];
  const bodyMat = cached(`mat:car:${col}`, () =>
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.28, metalness: 0.25 }));
  const glassMat = cached('mat:carGlass', () =>
    new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
  // lower body (hood + trunk implied by the cab sitting inboard)
  const body = new THREE.Mesh(boxGeo, bodyMat);
  body.scale.set(1.6, 0.55, 3.7);
  body.position.y = 0.58; body.castShadow = true; g.add(body);
  // glass band, slightly wider than the cab roof so it reads as windows
  const glass = new THREE.Mesh(boxGeo, glassMat);
  glass.scale.set(1.42, 0.42, 1.95);
  glass.position.set(0, 1.05, -0.15); g.add(glass);
  // painted roof cap
  const roof = new THREE.Mesh(boxGeo, bodyMat);
  roof.scale.set(1.34, 0.1, 1.8);
  roof.position.set(0, 1.3, -0.15); g.add(roof);
  const wm = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  for (const p of [[-0.78, 0.32, 1.15], [0.78, 0.32, 1.15], [-0.78, 0.32, -1.15], [0.78, 0.32, -1.15]]) {
    const w = new THREE.Mesh(wheelGeo, wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    g.add(w);
  }
  return g;
}

export function makeVehicle(theme) {
  const g = new THREE.Group();
  const kind = theme.vehicle;
  if (kind === 'bus') {
    const busTex = cached('busTex', () => canvasTexture(256, 128, (c) => {
      c.fillStyle = '#d41f38'; c.fillRect(0, 0, 256, 128);
      c.fillStyle = '#cfe4ff';
      for (let x = 12; x < 246; x += 34) { c.fillRect(x, 10, 24, 28); c.fillRect(x, 66, 24, 28); }
      c.fillStyle = '#f4f0e4'; c.fillRect(0, 44, 256, 14);
      c.fillStyle = '#222'; c.font = '900 12px Arial'; c.textAlign = 'center';
      c.fillText('CITY TOUR 42', 128, 55);
    }));
    const body = new THREE.Mesh(boxGeo,
      cached('mat:busBody', () => new THREE.MeshStandardMaterial({ map: cache.get('busTex'), roughness: 0.35, metalness: 0.15 })));
    body.scale.set(2.0, 3.2, 5.2);
    body.position.y = 1.95; body.castShadow = true; g.add(body);
    const roof = new THREE.Mesh(boxGeo,
      cached('mat:busRoof', () => new THREE.MeshStandardMaterial({ color: 0xb01a30, roughness: 0.4 })));
    roof.scale.set(1.96, 0.14, 5.16);
    roof.position.y = 3.6; g.add(roof);
    const cabGlass = new THREE.Mesh(boxGeo,
      cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
    cabGlass.scale.set(1.9, 0.7, 0.1);
    cabGlass.position.set(0, 2.9, 2.62); g.add(cabGlass);
  } else if (kind === 'taxi') {
    const body = new THREE.Mesh(boxGeo,
      cached('mat:taxi', () => new THREE.MeshStandardMaterial({ color: 0xffc020, roughness: 0.28, metalness: 0.25 })));
    body.scale.set(1.9, 1.0, 4.2);
    body.position.y = 0.85; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(boxGeo,
      cached('mat:taxi', () => new THREE.MeshStandardMaterial({ color: 0xffc020, roughness: 0.28, metalness: 0.25 })));
    cab.scale.set(1.7, 0.75, 2.2);
    cab.position.set(0, 1.65, 0.1); g.add(cab);
    const glass = new THREE.Mesh(boxGeo,
      cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
    glass.scale.set(1.72, 0.5, 2.0);
    glass.position.set(0, 1.68, 0.1); g.add(glass);
    const checker = cached('checkerTex', () => canvasTexture(64, 16, (c) => {
      for (let x = 0; x < 64; x += 8) {
        for (let y = 0; y < 16; y += 8) {
          c.fillStyle = ((x + y) / 8) % 2 ? '#111' : '#fff';
          c.fillRect(x, y, 8, 8);
        }
      }
    }, 4, 1));
    const band = new THREE.Mesh(boxGeo,
      cached('mat:checker', () => new THREE.MeshStandardMaterial({ map: cache.get('checkerTex'), roughness: 0.4 })));
    band.scale.set(1.92, 0.22, 4.22);
    band.position.y = 1.1; g.add(band);
    const sign = new THREE.Mesh(boxGeo, mats.glow);
    sign.scale.set(0.7, 0.25, 0.3);
    sign.position.y = 2.15; g.add(sign);
  } else if (kind === 'vespa') {
    const body = new THREE.Mesh(boxGeo,
      cached('mat:vespa', () => new THREE.MeshStandardMaterial({ color: 0x7fd0e8, roughness: 0.25, metalness: 0.3 })));
    body.scale.set(0.8, 0.7, 1.9);
    body.position.y = 0.75; body.castShadow = true; g.add(body);
    const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 4, 8),
      cached('mat:rider', () => new THREE.MeshStandardMaterial({ color: 0xc86a3a, roughness: 0.8 })));
    rider.position.y = 1.6; g.add(rider);
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8),
      cached('mat:helm', () => new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.3 })));
    helm.position.y = 2.15; g.add(helm);
  } else { // citroen — rounded classic car, readable head-on
    const bodyMat = cached('mat:citroen', () =>
      new THREE.MeshStandardMaterial({ color: 0x4a7ac8, roughness: 0.28, metalness: 0.3 }));
    const glassMat = cached('mat:citroenGlass', () =>
      new THREE.MeshStandardMaterial({ color: 0xbadcf2, roughness: 0.1, metalness: 0.4 }));
    const body = new THREE.Mesh(boxGeo, bodyMat);
    body.scale.set(1.8, 0.7, 3.9);
    body.position.y = 0.72; body.castShadow = true; g.add(body);
    // rounded cabin: half-cylinder across the car
    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 12, 1, false, 0, Math.PI),
      bodyMat);
    cabin.rotation.z = Math.PI / 2;
    cabin.rotation.y = Math.PI / 2;
    cabin.position.set(0, 1.05, -0.2);
    cabin.castShadow = true; g.add(cabin);
    // windshield facing the player
    const shield = new THREE.Mesh(boxGeo, glassMat);
    shield.scale.set(1.4, 0.55, 0.08);
    shield.rotation.x = -0.35;
    shield.position.set(0, 1.42, 0.68); g.add(shield);
    // chrome bumper + round headlights facing the player
    const bumper = new THREE.Mesh(boxGeo, mats.chrome);
    bumper.scale.set(1.85, 0.22, 0.15);
    bumper.position.set(0, 0.45, 1.98); g.add(bumper);
    for (const sx of [-0.62, 0.62]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mats.glow);
      lamp.position.set(sx, 0.95, 1.96); g.add(lamp);
    }
  }
  // wheels
  const wm = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  const isBike = kind === 'vespa';
  const positions = isBike
    ? [[0, 0.35, 0.8], [0, 0.35, -0.8]]
    : [[-0.85, 0.35, 1.4], [0.85, 0.35, 1.4], [-0.85, 0.35, -1.4], [0.85, 0.35, -1.4]];
  for (const p of positions) {
    const w = new THREE.Mesh(wheelGeo, wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    g.add(w);
  }
  return g;
}
