import * as THREE from '../../vendor/three.module.js';
import { getLandmark } from './landmarks.js';
import { sfx } from '../core/audio.js';

// Monument assembly puzzle.
// Blocks are scattered on a festival plaza; a ghost silhouette shows the
// target. Tap a glowing block and it flies into place. Finish before the
// 60s clock runs out.

// ---------- city flavor for the plaza dressing ----------
const CITY_OF = {
  empire: 'nyc', chrysler: 'nyc', brooklyn: 'nyc',
  eiffel: 'paris', arc: 'paris', louvre: 'paris',
  bigben: 'london', towerbridge: 'london', eye: 'london',
  colosseum: 'rome', trevi: 'rome', pantheon: 'rome',
};
const PLAZA = {
  nyc: { stone: '#8f8a82', dark: '#6d6860', trim: '#b9b2a2', ground: '#3c3f48', sky: '#2a3450', win: '#ffd98a' },
  paris: { stone: '#c9bda2', dark: '#a89c80', trim: '#e4dac2', ground: '#57504a', sky: '#3e466e', win: '#ffe6b0' },
  london: { stone: '#95908a', dark: '#716c66', trim: '#c2baa8', ground: '#403c42', sky: '#2c3348', win: '#ffedbe' },
  rome: { stone: '#c4aa82', dark: '#9d8562', trim: '#e0cda6', ground: '#5c5044', sky: '#4c3e56', win: '#ffdda0' },
};
const FESTIVE = ['#e75c5c', '#f4b942', '#4ca7e0', '#66c07a', '#e78ac0', '#f2884b'];

// ---------- shared canvas-texture cache (kept across puzzle instances) ----------
const texCache = new Map();
const sharedTex = new Set();
function cachedTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  sharedTex.add(t);
  return t;
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f >= 0) c.lerp(new THREE.Color('#ffffff'), f);
  else c.lerp(new THREE.Color('#101018'), -f);
  return `#${c.getHexString()}`;
}

// deterministic pseudo-random for texture details
const dRand = (i, j) => ((Math.sin(i * 127.1 + j * 311.7) * 43758.5453) % 1 + 1) % 1;

// ---------- block face textures (painted in the block's own color) ----------
function baseFill(g, S, color) {
  const grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, shade(color, 0.10));
  grad.addColorStop(1, shade(color, -0.08));
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(0,0,0,${dRand(i, 3) * 0.05})`;
    g.fillRect(dRand(i, 1) * S, dRand(i, 2) * S, 4, 4);
  }
}

function makeBlockTexture(def) {
  const { tex, c } = def;
  const tx = def.tx || {};
  const key = `${tex}|${c}|${JSON.stringify(tx)}`;
  return cachedTex(key, 256, 256, (g, S) => {
    if (tex === 'lattice') {
      // painted iron lattice: base color with lighter girder crosshatch
      baseFill(g, S, c);
      g.strokeStyle = shade(c, 0.35); g.lineWidth = 5;
      g.beginPath();
      for (let i = -6; i <= 6; i++) {
        g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4 + S / 2, S);
        g.moveTo(i * S / 4 + S / 2, 0); g.lineTo(i * S / 4, S);
      }
      g.stroke();
      g.strokeStyle = shade(c, -0.3); g.lineWidth = 4;
      for (let j = 1; j < 4; j++) {
        g.beginPath(); g.moveTo(0, j * S / 4); g.lineTo(S, j * S / 4); g.stroke();
      }
      g.strokeStyle = shade(c, 0.2); g.lineWidth = 14;
      g.strokeRect(3, -20, S - 6, S + 40);
      return;
    }
    if (tex === 'glass') {
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, '#bfe2f8'); grad.addColorStop(1, '#5e9cc8');
      g.fillStyle = grad; g.fillRect(0, 0, S, S);
      g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 5;
      g.beginPath();
      for (let i = -8; i <= 8; i++) {
        g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4 + S, S);
        g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4 - S, S);
      }
      g.stroke();
      return;
    }
    if (tex === 'archcut') {
      baseFill(g, S, c);
      const n = tx.n || 3;
      const w = S / n;
      for (let i = 0; i < n; i++) {
        const cx = i * w + w / 2, aw = w * 0.52, top = S * 0.30, bot = tx.open ? S : S * 0.88;
        g.save();
        g.globalCompositeOperation = 'destination-out';
        g.beginPath();
        g.moveTo(cx - aw / 2, bot);
        g.lineTo(cx - aw / 2, top + aw / 2);
        g.arc(cx, top + aw / 2, aw / 2, Math.PI, 0);
        g.lineTo(cx + aw / 2, bot);
        g.closePath(); g.fill();
        g.restore();
        // arch surround shading
        g.strokeStyle = shade(c, -0.35); g.lineWidth = 5;
        g.beginPath();
        g.moveTo(cx - aw / 2, bot);
        g.lineTo(cx - aw / 2, top + aw / 2);
        g.arc(cx, top + aw / 2, aw / 2, Math.PI, 0);
        g.lineTo(cx + aw / 2, bot);
        g.stroke();
        // pilaster hint between arches
        g.fillStyle = shade(c, 0.14);
        g.fillRect(i * w + 2, S * 0.2, 7, S * 0.75);
      }
      g.fillStyle = shade(c, 0.18); g.fillRect(0, 0, S, S * 0.10);
      g.fillStyle = shade(c, -0.22); g.fillRect(0, S * 0.10, S, 5);
      return;
    }
    baseFill(g, S, c);
    if (tex === 'win') {
      const cols = tx.cols || 6, rows = tx.rows || 4;
      const mx = S * 0.06, my = S * 0.12;
      const cw = (S - mx * 2) / cols, ch = (S - my * 2) / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = mx + i * cw + cw * 0.18, y = my + j * ch + ch * 0.2;
        const lit = dRand(i, j) < 0.35;
        g.fillStyle = lit ? '#ffd98a' : '#39434f';
        g.fillRect(x, y, cw * 0.64, ch * 0.6);
        g.fillStyle = lit ? 'rgba(255,255,255,0.5)' : 'rgba(140,170,205,0.35)';
        g.fillRect(x, y, cw * 0.64, ch * 0.16);
      }
    } else if (tex === 'strip') {
      const n = 6;
      const w = S / n;
      for (let i = 0; i < n; i++) {
        g.fillStyle = '#2b3240';
        g.fillRect(i * w + w * 0.3, S * 0.05, w * 0.4, S * 0.9);
        g.fillStyle = 'rgba(255,217,138,0.6)';
        for (let j = 0; j < 7; j++) if (dRand(i, j) < 0.4) g.fillRect(i * w + w * 0.34, S * (0.08 + j * 0.125), w * 0.32, S * 0.06);
        g.fillStyle = shade(c, 0.16);
        g.fillRect(i * w, 0, w * 0.12, S);
      }
    } else if (tex === 'arch') {
      const n = tx.n || 4;
      const w = S / n;
      for (let i = 0; i < n; i++) {
        const cx = i * w + w / 2, aw = w * 0.5, top = S * 0.22, bot = S * 0.92;
        g.fillStyle = '#2e2a26';
        g.beginPath();
        g.moveTo(cx - aw / 2, bot);
        g.lineTo(cx - aw / 2, top + aw / 2);
        g.arc(cx, top + aw / 2, aw / 2, Math.PI, 0);
        g.lineTo(cx + aw / 2, bot);
        g.closePath(); g.fill();
        g.strokeStyle = shade(c, 0.22); g.lineWidth = 4; g.stroke();
      }
    } else if (tex === 'gothic') {
      for (let i = 0; i < 2; i++) {
        const cx = S * (0.28 + i * 0.44), aw = S * 0.24, top = S * 0.14, bot = S * 0.96;
        g.fillStyle = '#241f1c';
        g.beginPath();
        g.moveTo(cx - aw / 2, bot);
        g.lineTo(cx - aw / 2, top + aw * 0.9);
        g.quadraticCurveTo(cx - aw / 2, top, cx, top - aw * 0.25);
        g.quadraticCurveTo(cx + aw / 2, top, cx + aw / 2, top + aw * 0.9);
        g.lineTo(cx + aw / 2, bot);
        g.closePath(); g.fill();
        g.strokeStyle = shade(c, 0.25); g.lineWidth = 5; g.stroke();
      }
      g.fillStyle = shade(c, 0.18); g.fillRect(0, 0, S, S * 0.06);
    } else if (tex === 'relief') {
      const cols = 3, rows = 2;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = S * 0.08 + i * S * 0.3, y = S * 0.1 + j * S * 0.44;
        g.fillStyle = shade(c, -0.16); g.fillRect(x, y, S * 0.24, S * 0.34);
        g.fillStyle = shade(c, 0.1); g.fillRect(x + 5, y + 5, S * 0.24 - 10, S * 0.34 - 10);
        g.fillStyle = shade(c, -0.08);
        g.beginPath(); g.arc(x + S * 0.12, y + S * 0.18, S * 0.07, 0, Math.PI * 2); g.fill();
      }
      g.strokeStyle = shade(c, -0.2); g.lineWidth = 3;
      g.strokeRect(3, 3, S - 6, S - 6);
    } else if (tex === 'crown') {
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, '#f2f6fc'); grad.addColorStop(0.5, shade(c, 0));
      grad.addColorStop(1, '#8d95a6');
      g.fillStyle = grad; g.fillRect(0, 0, S, S);
      const n = 9;
      for (let i = 0; i < n; i++) {
        const cx = (i + 0.5) * S / n;
        g.fillStyle = '#1d2430';
        g.beginPath();
        g.moveTo(cx - S / n * 0.30, S * 0.98);
        g.lineTo(cx, S * 0.30);
        g.lineTo(cx + S / n * 0.30, S * 0.98);
        g.closePath(); g.fill();
      }
    }
  });
}

const clockFaceTex = () => cachedTex('clockface', 256, 256, (g, S) => {
  g.fillStyle = '#f6efd8'; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#2b2b26'; g.lineWidth = 14;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.44, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#b09248'; g.lineWidth = 6;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#2b2b26';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(S / 2 + Math.cos(a) * S * 0.30, S / 2 + Math.sin(a) * S * 0.30);
    g.lineTo(S / 2 + Math.cos(a) * S * 0.40, S / 2 + Math.sin(a) * S * 0.40);
    g.stroke();
  }
  g.lineWidth = 10; g.lineCap = 'round';
  g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + S * 0.17, S / 2 - S * 0.13); g.stroke();
  g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 - S * 0.06, S / 2 - S * 0.28); g.stroke();
  g.fillStyle = '#2b2b26';
  g.beginPath(); g.arc(S / 2, S / 2, 10, 0, Math.PI * 2); g.fill();
});

const softDotTex = () => cachedTex('softdot', 64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.4, 'rgba(255,240,210,0.6)');
  r.addColorStop(1, 'rgba(255,230,180,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});

const glowSpriteTex = () => cachedTex('glowsprite', 128, 128, (g) => {
  const r = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  r.addColorStop(0, 'rgba(255,236,190,0.9)');
  r.addColorStop(0.35, 'rgba(255,214,140,0.35)');
  r.addColorStop(1, 'rgba(255,200,110,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
});

// lit-window texture for the distant skyline silhouettes
function skylineTex(cityId) {
  const P = PLAZA[cityId];
  return cachedTex(`skyline|${cityId}`, 128, 256, (g, W, H) => {
    g.fillStyle = P.sky; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) for (let j = 0; j < 22; j++) {
      if (dRand(i, j) < 0.24) {
        g.fillStyle = `rgba(255,220,150,${0.35 + dRand(j, i) * 0.5})`;
        g.fillRect(6 + i * 12, 6 + j * 11, 5, 6);
      }
    }
  });
}

// ---------- material + geometry construction ----------
function blockMaterial(def, isGhost) {
  if (isGhost) {
    return new THREE.MeshBasicMaterial({
      color: 0x9ed2ff, transparent: true, opacity: 0.09,
      depthWrite: false, side: THREE.DoubleSide,
    });
  }
  const color = new THREE.Color(def.c);
  const seeThru = def.tex === 'archcut';
  const mat = new THREE.MeshStandardMaterial({
    color: def.tex ? new THREE.Color('#ffffff') : color,
    roughness: def.glass ? 0.1 : def.shape === 'water' ? 0.15 : def.metal ? 0.3 : 0.72,
    metalness: def.metal ? 0.55 : def.glass ? 0.25 : 0.05,
    transparent: !!def.glass || def.shape === 'water' || seeThru,
    opacity: def.glass ? 0.88 : def.shape === 'water' ? 0.85 : 1,
    emissive: def.shape === 'water' ? new THREE.Color('#3fc8e8')
      : def.glass ? new THREE.Color('#bfe0f5') : color.clone(),
    emissiveIntensity: 0,
    side: seeThru ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (def.tex) {
    mat.map = makeBlockTexture(def);
    if (seeThru) { mat.alphaTest = 0.45; mat.transparent = false; }
  }
  mat.userData.baseEm = def.shape === 'water' ? 0.4 : def.glass ? 0.15 : def.metal ? 0.12 : 0;
  return mat;
}

function makeBlockMesh(def, isGhost = false) {
  const [w, h, d] = def.s;
  const mat = blockMaterial(def, isGhost);
  const setEm = (n) => {
    if (isGhost) return;
    const ms = Array.isArray(n.material) ? n.material : [n.material];
    for (const m of ms) if (m.userData.baseEm === undefined) m.userData.baseEm = mat.userData.baseEm;
  };
  let geo = null, out = null;

  switch (def.shape) {
    case 'cyl': geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 24); break;
    case 'cone4':
      geo = new THREE.CylinderGeometry(w * 0.16, w / 2, h, 4, 1);
      geo.rotateY(Math.PI / 4);
      break;
    case 'pyramid':
      geo = new THREE.CylinderGeometry(0.02, (w / 2) * Math.SQRT2, h, 4, 1);
      geo.rotateY(Math.PI / 4);
      break;
    case 'dome': geo = new THREE.SphereGeometry(w / 2, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2); break;
    case 'sphere': geo = new THREE.SphereGeometry(w / 2, 18, 14); break;
    case 'torus': geo = new THREE.TorusGeometry(w / 2, d / 2, 12, 56); break;
    case 'pod':
      geo = new THREE.CapsuleGeometry(h / 2, w * 0.5, 4, 12);
      geo.rotateZ(Math.PI / 2);
      break;
    case 'water': geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 32); break;
    case 'prism': {
      const tri = new THREE.Shape();
      tri.moveTo(-w / 2, -h / 2); tri.lineTo(w / 2, -h / 2); tri.lineTo(0, h / 2); tri.closePath();
      geo = new THREE.ExtrudeGeometry(tri, { depth: d, bevelEnabled: false });
      geo.translate(0, 0, -d / 2);
      break;
    }
    case 'arch': {
      const tube = d / 2;
      geo = new THREE.TorusGeometry((w - d) / 2, tube, 10, 32, Math.PI);
      break;
    }
    case 'arcseg': {
      const { R, sweep } = def.arc;
      geo = new THREE.CylinderGeometry(R, R, h, 12, 1, true, -sweep / 2, sweep);
      geo.translate(0, 0, -R);
      break;
    }
    case 'spokes': {
      out = new THREE.Group();
      const n = def.n || 8;
      for (let i = 0; i < n; i++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(w, 0.13, 0.13), mat);
        sp.rotation.z = (i / n) * Math.PI;
        out.add(sp);
      }
      break;
    }
    case 'clock': {
      out = new THREE.Group();
      const cg = new THREE.CylinderGeometry(w / 2, w / 2, d, 28);
      cg.rotateX(Math.PI / 2);
      let m;
      if (isGhost) m = new THREE.Mesh(cg, mat);
      else {
        const rim = new THREE.MeshStandardMaterial({ color: '#87754a', roughness: 0.5, metalness: 0.3, emissive: new THREE.Color('#87754a'), emissiveIntensity: 0 });
        const face = new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.6, emissive: new THREE.Color('#f6efd8'), emissiveIntensity: 0 });
        m = new THREE.Mesh(cg, [rim, face, face]);
      }
      out.add(m);
      break;
    }
    case 'archvault': {
      out = new THREE.Group();
      const r = w * 0.31, sw = (w - 2 * r) / 2;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.32, d), mat);
      top.position.y = h * 0.34;
      const ceilGeo = new THREE.CylinderGeometry(r, r, d * 0.96, 18, 1, true, 0, Math.PI);
      ceilGeo.rotateX(Math.PI / 2); ceilGeo.rotateZ(Math.PI / 2);
      const ceilMat = isGhost ? mat : mat.clone();
      if (!isGhost) ceilMat.side = THREE.DoubleSide;
      const ceil = new THREE.Mesh(ceilGeo, ceilMat);
      ceil.position.y = h * 0.18 - r * 0.0;
      const rimGeo = new THREE.TorusGeometry(r, w * 0.045, 8, 24, Math.PI);
      for (const zz of [d / 2 - w * 0.05, -(d / 2 - w * 0.05)]) {
        const rim = new THREE.Mesh(rimGeo, mat);
        rim.position.set(0, h * 0.18, zz);
        out.add(rim);
      }
      for (const xx of [-(w - sw) / 2, (w - sw) / 2]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(sw, h * 0.68, d), mat);
        side.position.set(xx, -h * 0.16, 0);
        out.add(side);
      }
      out.add(top, ceil);
      break;
    }
    case 'cable': {
      out = new THREE.Group();
      const c = def.cable;
      const pts = [];
      const V = (x, y) => new THREE.Vector3(x, y - c.endY, 0);
      pts.push(V(-c.endX, c.endY), V(-(c.endX + c.towerX) / 2, (c.endY + c.topY) / 2 + 0.3), V(-c.towerX, c.topY));
      for (let i = 1; i < 12; i++) {
        const x = -c.towerX + (i / 12) * 2 * c.towerX;
        pts.push(V(x, c.midY + (c.topY - c.midY) * Math.pow(x / c.towerX, 2)));
      }
      pts.push(V(c.towerX, c.topY), V((c.endX + c.towerX) / 2, (c.endY + c.topY) / 2 + 0.3), V(c.endX, c.endY));
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.12);
      out.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, 0.09, 6), mat));
      const n = c.hangers || 9;
      for (let i = 0; i < n; i++) {
        const x = -c.towerX * 0.86 + (i / (n - 1)) * 2 * c.towerX * 0.86;
        const yTop = c.midY + (c.topY - c.midY) * Math.pow(x / c.towerX, 2);
        const hh = Math.max(0.2, yTop - c.deckY);
        const hang = new THREE.Mesh(new THREE.BoxGeometry(0.05, hh, 0.05), mat);
        hang.position.set(x, (c.deckY - c.endY) + hh / 2, 0);
        out.add(hang);
      }
      break;
    }
    case 'colonnade': {
      out = new THREE.Group();
      const n = def.cols || 4;
      const r = Math.min(h * 0.10, (w / n) * 0.30);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (i + 0.5) * (w / n);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h * 0.8, 12), mat);
        shaft.position.set(x, 0, 0);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(r * 2.7, h * 0.07, r * 2.7), mat);
        cap.position.set(x, h * 0.43, 0);
        const base = new THREE.Mesh(new THREE.BoxGeometry(r * 2.7, h * 0.07, r * 2.7), mat);
        base.position.set(x, -h * 0.43, 0);
        out.add(shaft, cap, base);
      }
      break;
    }
    case 'turrets': {
      out = new THREE.Group();
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = sx * (w / 2 - 0.38), z = sz * (d / 2 - 0.38);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, h * 0.55, 10), mat);
        shaft.position.set(x, -h * 0.22, z);
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.38, h * 0.5, 10), mat);
        cone.position.set(x, h * 0.30, z);
        out.add(shaft, cone);
      }
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, w * 0.20, h * 0.55, 4), mat);
      spire.position.y = -h * 0.1;
      out.add(spire);
      break;
    }
    case 'statue': {
      out = new THREE.Group();
      const ped = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, h * 0.26, d * 0.95), mat);
      ped.position.y = -h * 0.37;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(w * 0.26, h * 0.3, 4, 10), mat);
      body.position.y = h * 0.05;
      const head = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 12, 10), mat);
      head.position.y = h * 0.38;
      out.add(ped, body, head);
      break;
    }
    case 'rock': {
      geo = new THREE.DodecahedronGeometry(w / 2, 0);
      geo.scale(1, h / w, d / w);
      break;
    }
    default: geo = new THREE.BoxGeometry(w, h, d);
  }

  if (!out) out = new THREE.Mesh(geo, mat);
  out.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = !isGhost;
      n.receiveShadow = !isGhost;
      setEm(n);
    }
  });
  // invisible fat hit-proxy so thin blocks (spires, cables) are easy to tap
  if (!isGhost) {
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(w, 1.2), Math.max(h, 1.2), Math.max(d, 1.2)),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }),
    );
    hit.userData.isHitProxy = true;
    out.add(hit);
  }
  out.userData.blockMat = mat;
  return out;
}

function placeAtTarget(mesh, def) {
  mesh.position.set(...def.p);
  mesh.rotation.set(def.rotX || 0, def.rotY || 0, def.rotZ || 0);
  mesh.scale.setScalar(1);
}

function restingY(def) {
  if (def.shape === 'dome') return 0.05;
  return def.s[1] / 2 + 0.04;
}

const forEachMat = (root, fn) => root.traverse((n) => {
  if (!n.isMesh || n.userData.isHitProxy) return;
  const ms = Array.isArray(n.material) ? n.material : [n.material];
  for (const m of ms) fn(m);
});

// ============================================================
export class Puzzle {
  constructor(scene, camera, landmarkId, level) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.group = new THREE.Group();
    scene.add(this.group);
    this.placedCount = 0;
    this.flying = [];
    this.effects = [];
    this.shimmer = [];
    this.done = false;
    this.failed = false;
    this.celebT = -1;
    this.time = 60;
    this.elapsed = 0;

    const def = getLandmark(landmarkId);
    const P = PLAZA[CITY_OF[landmarkId]] || PLAZA.paris;
    this.P = P;

    this.buildPlaza(P, CITY_OF[landmarkId]);

    // Difficulty: level 1 pre-places some base blocks, level 3 scatters everything.
    let preplaced = level === 1 ? Math.floor(def.length * 0.35)
      : level === 2 ? Math.floor(def.length * 0.15) : 0;
    // visual-review harness: ?built=1 shows the finished monument,
    // ?auto=1 self-plays a block every half second
    const q = new URLSearchParams(location.search);
    if (q.has('built') || q.has('celebrate')) preplaced = def.length;
    this.autoT = q.has('auto') ? 0.6 : -1;
    this.celebrateAt = q.has('celebrate') ? 0.05 : -1;

    // sort blocks bottom-up (sortY lets cables etc. come after their towers)
    this.blocks = def.map((d, i) => ({ def: d, idx: i }))
      .sort((a, b) => (a.def.sortY ?? a.def.p[1]) - (b.def.sortY ?? b.def.p[1]));

    this.items = this.blocks.map((entry, order) => {
      const mesh = makeBlockMesh(entry.def);
      const ghost = makeBlockMesh(entry.def, true);
      placeAtTarget(ghost, entry.def);
      this.group.add(ghost);

      const item = {
        def: entry.def, mesh, ghost, order,
        placed: order < preplaced,
        bobPhase: Math.random() * Math.PI * 2,
      };

      if (item.placed) {
        placeAtTarget(mesh, entry.def);
        ghost.visible = false;
        this.placedCount++;
        this.collectShimmer(mesh);
      } else {
        const a = (order / this.blocks.length) * Math.PI * 2 + Math.random() * 0.9;
        const r = 11.5 + Math.random() * 8.5;
        mesh.position.set(Math.cos(a) * r, restingY(entry.def), Math.sin(a) * r * 0.62 + 7);
        mesh.rotation.y = Math.random() * Math.PI * 2;
      }
      this.group.add(mesh);
      return item;
    });

    // celebration camera target derived from monument bounds
    let top = 0, spread = 0;
    for (const d of def) {
      top = Math.max(top, d.p[1] + d.s[1] / 2);
      spread = Math.max(spread, Math.abs(d.p[0]) + d.s[0] / 2);
    }
    this.monTop = top;
    this.camTarget = new THREE.Vector3(0, top * 0.52, Math.max(15, top * 1.05, spread * 1.6));
  }

  // ---------- plaza dressing ----------
  buildPlaza(P, cityId) {
    const g = this.group;

    // vast city ground below everything
    const ground = new THREE.Mesh(new THREE.CircleGeometry(280, 40),
      new THREE.MeshStandardMaterial({ color: P.ground, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.06;
    ground.receiveShadow = true;
    g.add(ground);

    // ornamental plaza floor
    const floor = new THREE.Mesh(new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({ map: this.makeFloorTex(P, cityId), roughness: 0.85 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);

    // glow ring at the build site
    const ringM = new THREE.Mesh(new THREE.RingGeometry(9.0, 9.7, 64),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
    ringM.rotation.x = -Math.PI / 2;
    ringM.position.y = 0.03;
    this.ring = ringM;
    g.add(ringM);

    // skyline silhouettes with lit windows
    const skyMat = new THREE.MeshBasicMaterial({ map: skylineTex(cityId), color: 0xffffff });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.sharedGeos = [boxGeo];
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2 + dRand(i, 7) * 0.2;
      const r = 62 + dRand(i, 2) * 26;
      const hgt = 9 + dRand(i, 3) * 24;
      const b = new THREE.Mesh(boxGeo, skyMat);
      b.position.set(Math.cos(a) * r, hgt / 2 - 0.1, Math.sin(a) * r);
      b.scale.set(6 + dRand(i, 4) * 8, hgt, 6 + dRand(i, 5) * 8);
      b.rotation.y = dRand(i, 6) * Math.PI;
      g.add(b);
    }

    // hedges ring
    const hedgeMat = new THREE.MeshStandardMaterial({ color: '#2f6b3a', roughness: 0.95 });
    const hedgeTopMat = new THREE.MeshStandardMaterial({ color: '#3d7f47', roughness: 0.95 });
    for (let i = 0; i < 20; i++) {
      if (i % 5 === 4) continue;              // gaps for entrances
      const a = (i / 20) * Math.PI * 2;
      const h = new THREE.Mesh(boxGeo, hedgeMat);
      h.position.set(Math.cos(a) * 23.2, 0.45, Math.sin(a) * 23.2);
      h.scale.set(3.6, 0.9, 1.2);
      h.rotation.y = -a + Math.PI / 2;
      h.castShadow = true;
      const t = new THREE.Mesh(boxGeo, hedgeTopMat);
      t.position.set(Math.cos(a) * 23.2, 0.98, Math.sin(a) * 23.2);
      t.scale.set(3.3, 0.18, 1.0);
      t.rotation.y = -a + Math.PI / 2;
      g.add(h, t);
    }

    // lampposts + glow sprites + bunting anchor points
    const poleMat = new THREE.MeshStandardMaterial({ color: '#2c3230', roughness: 0.6, metalness: 0.3 });
    const lampMat = new THREE.MeshStandardMaterial({ color: '#fff2cc', emissive: new THREE.Color('#ffd98a'), emissiveIntensity: 2.2 });
    const poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 4.4, 8);
    const lampGeo = new THREE.SphereGeometry(0.3, 10, 8);
    this.sharedGeos.push(poleGeo, lampGeo);
    const anchors = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
      const x = Math.cos(a) * 21.8, z = Math.sin(a) * 21.8;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 2.2, z);
      pole.castShadow = true;
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(x, 4.5, z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowSpriteTex(), transparent: true, opacity: 0.85, depthWrite: false,
      }));
      glow.scale.setScalar(3.4);
      glow.position.set(x, 4.5, z);
      g.add(pole, lamp, glow);
      anchors.push(new THREE.Vector3(x, 4.35, z));
    }

    // festive pennant bunting strung between lampposts
    const bunt = new THREE.BufferGeometry();
    const verts = [], cols = [];
    const C = new THREE.Color();
    for (let i = 0; i < anchors.length; i++) {
      const a0 = anchors[i], a1 = anchors[(i + 1) % anchors.length];
      for (let k = 0; k < 9; k++) {
        const t = 0.1 + (k / 8) * 0.8;
        const px = a0.x + (a1.x - a0.x) * t, pz = a0.z + (a1.z - a0.z) * t;
        const py = a0.y - Math.sin(t * Math.PI) * 0.9;
        const dx = (a1.x - a0.x), dz = (a1.z - a0.z);
        const len = Math.hypot(dx, dz), ux = dx / len * 0.17, uz = dz / len * 0.17;
        C.set(FESTIVE[(i * 9 + k) % FESTIVE.length]);
        verts.push(px - ux, py, pz - uz, px + ux, py, pz + uz, px, py - 0.5, pz);
        for (let v = 0; v < 3; v++) cols.push(C.r, C.g, C.b);
      }
    }
    bunt.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    bunt.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const buntMesh = new THREE.Mesh(bunt,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    g.add(buntMesh);

    // floating golden dust
    const N = 150;
    const pgeo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 46;
      pos[i * 3 + 1] = Math.random() * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 46;
    }
    pgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(pgeo, new THREE.PointsMaterial({
      size: 0.3, map: softDotTex(), transparent: true, opacity: 0.55,
      color: 0xffe6b0, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    g.add(this.dust);

    // warm celebratory key light over the build site
    const warm = new THREE.PointLight(0xffcf9a, 240, 90, 2);
    warm.position.set(0, 13, 11);
    g.add(warm);
  }

  makeFloorTex(P, cityId) {
    return cachedTex(`floor|${cityId}`, 1024, 1024, (g, S) => {
      const cx = S / 2;
      g.fillStyle = P.stone; g.fillRect(0, 0, S, S);
      // alternating stone rings
      for (let r = S * 0.47; r > 0; r -= S * 0.047) {
        g.fillStyle = ((r / (S * 0.047)) | 0) % 2 ? P.stone : shade(P.stone, -0.07);
        g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.fill();
      }
      // radial seams
      g.strokeStyle = shade(P.dark, -0.1); g.lineWidth = 3;
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        g.beginPath(); g.moveTo(cx + Math.cos(a) * S * 0.09, cx + Math.sin(a) * S * 0.09);
        g.lineTo(cx + Math.cos(a) * S * 0.5, cx + Math.sin(a) * S * 0.5); g.stroke();
      }
      // ring seams
      g.strokeStyle = shade(P.dark, 0.02); g.lineWidth = 4;
      for (let r = S * 0.47; r > 0; r -= S * 0.047) {
        g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2); g.stroke();
      }
      // center compass medallion
      g.fillStyle = P.trim;
      g.beginPath(); g.arc(cx, cx, S * 0.085, 0, Math.PI * 2); g.fill();
      g.fillStyle = P.dark;
      g.beginPath(); g.arc(cx, cx, S * 0.072, 0, Math.PI * 2); g.fill();
      g.fillStyle = P.trim;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const lg = i % 2 === 0 ? S * 0.068 : S * 0.045;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * lg, cx + Math.sin(a) * lg);
        g.lineTo(cx + Math.cos(a + 0.35) * S * 0.014, cx + Math.sin(a + 0.35) * S * 0.014);
        g.lineTo(cx + Math.cos(a - 0.35) * S * 0.014, cx + Math.sin(a - 0.35) * S * 0.014);
        g.closePath(); g.fill();
      }
      // decorative trim band
      g.strokeStyle = P.trim; g.lineWidth = 8;
      g.beginPath(); g.arc(cx, cx, S * 0.40, 0, Math.PI * 2); g.stroke();
      g.setLineDash([14, 20]);
      g.beginPath(); g.arc(cx, cx, S * 0.435, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
      // speckle
      for (let i = 0; i < 1300; i++) {
        g.fillStyle = `rgba(0,0,0,${dRand(i, 9) * 0.07})`;
        g.fillRect(dRand(i, 1) * S, dRand(i, 2) * S, 3, 3);
      }
    });
  }

  collectShimmer(mesh) {
    forEachMat(mesh, (m) => { if (m.userData.baseEm) this.shimmer.push(m); });
  }

  // ---------- interaction ----------
  nextNeeded() {
    return this.items.find((it) => !it.placed && !this.flying.includes(it));
  }

  pickable(item) {
    const pending = this.items.filter((it) => !it.placed && !this.flying.includes(it));
    return pending.slice(0, 4).includes(item);
  }

  tryPick(nx, ny) {
    if (this.done || this.failed) return;
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const meshes = this.items.filter((it) => !it.placed && !this.flying.includes(it)).map((it) => it.mesh);
    const hits = this.raycaster.intersectObjects(meshes, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj && !meshes.includes(obj)) obj = obj.parent;
    const item = this.items.find((it) => it.mesh === obj);
    if (!item) return;
    if (!this.pickable(item)) {
      sfx.tick();
      this.shakeEffect(item.mesh);
      return;
    }
    this.flying.push(item);
    item.t = 0;
    item.from = item.mesh.position.clone();
    item.fromRot = item.mesh.rotation.clone();
    sfx.place();
  }

  // ---------- transient effects ----------
  shakeEffect(mesh) {
    const ox = mesh.position.x;
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt;
        mesh.position.x = ox + Math.sin(t * 42) * 0.13 * Math.max(0, 1 - t / 0.32);
        if (t >= 0.32) { mesh.position.x = ox; return false; }
        return true;
      },
    });
  }

  ringPulse(pos, color = 0xffe08a, big = 1) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.copy(pos);
    this.group.add(m);
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt * 2.4;
        m.scale.setScalar(1 + t * 4.5 * big);
        m.material.opacity = Math.max(0, 0.95 * (1 - t));
        if (t >= 1) { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); return false; }
        return true;
      },
    });
  }

  sparkleBurst(pos, count = 18, speed = 4.5, color = 0xffe6a0) {
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3), v = [];
    for (let i = 0; i < count; i++) {
      p[i * 3] = pos.x; p[i * 3 + 1] = pos.y; p[i * 3 + 2] = pos.z;
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      const sp = speed * (0.4 + Math.random() * 0.8);
      v.push(Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp + 1.5, Math.sin(ph) * Math.sin(th) * sp);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.42, map: softDotTex(), color, transparent: true, opacity: 1,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.group.add(pts);
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt;
        const arr = geo.attributes.position.array;
        for (let i = 0; i < count; i++) {
          arr[i * 3] += v[i * 3] * dt;
          arr[i * 3 + 1] += (v[i * 3 + 1] -= 7 * dt) * dt;
          arr[i * 3 + 2] += v[i * 3 + 2] * dt;
        }
        geo.attributes.position.needsUpdate = true;
        pts.material.opacity = Math.max(0, 1 - t / 0.65);
        if (t >= 0.65) { this.group.remove(pts); geo.dispose(); pts.material.dispose(); return false; }
        return true;
      },
    });
  }

  confettiBurst() {
    const N = 260;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3), col = new Float32Array(N * 3), v = [];
    const C = new THREE.Color();
    for (let i = 0; i < N; i++) {
      p[i * 3] = (Math.random() - 0.5) * 3;
      p[i * 3 + 1] = this.monTop + 1.5;
      p[i * 3 + 2] = (Math.random() - 0.5) * 3;
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
      v.push(Math.cos(a) * sp * (0.4 + Math.random()), 5 + Math.random() * 7, Math.sin(a) * sp * (0.4 + Math.random()));
      C.set(FESTIVE[i % FESTIVE.length]);
      col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.34, vertexColors: true, transparent: true, opacity: 1, depthWrite: false,
    }));
    this.group.add(pts);
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt;
        const arr = geo.attributes.position.array;
        for (let i = 0; i < N; i++) {
          v[i * 3 + 1] -= 11 * dt;
          v[i * 3] *= (1 - dt * 0.8); v[i * 3 + 2] *= (1 - dt * 0.8);
          arr[i * 3] += v[i * 3] * dt + Math.sin(t * 9 + i) * dt * 1.6;
          arr[i * 3 + 1] += v[i * 3 + 1] * dt;
          arr[i * 3 + 2] += v[i * 3 + 2] * dt + Math.cos(t * 8 + i * 1.7) * dt * 1.6;
          if (arr[i * 3 + 1] < 0.1) { arr[i * 3 + 1] = 0.1; v[i * 3 + 1] = 0; }
        }
        geo.attributes.position.needsUpdate = true;
        if (t > 3.2) pts.material.opacity = Math.max(0, 1 - (t - 3.2) / 0.8);
        if (t >= 4) { this.group.remove(pts); geo.dispose(); pts.material.dispose(); return false; }
        return true;
      },
    });
  }

  // ---------- per-frame ----------
  update(dt) {
    this.elapsed += dt;
    const T = this.elapsed;
    if (!this.done && !this.failed) this.time -= dt;

    // celebration-review harness
    if (this.celebrateAt >= 0 && !this.done && this.elapsed > this.celebrateAt) {
      this.done = true;
      sfx.win();
    }

    // self-play harness
    if (this.autoT >= 0 && !this.done) {
      this.autoT -= dt;
      if (this.autoT <= 0) {
        const it = this.nextNeeded();
        if (it) {
          this.flying.push(it);
          it.t = 0;
          it.from = it.mesh.position.clone();
          it.fromRot = it.mesh.rotation.clone();
        }
        this.autoT = 0.3;
      }
    }

    // build-site ring: gold normally, urgent red pulse under 10s
    const low = !this.done && this.time <= 10;
    if (low) {
      const p = 0.5 + Math.sin(T * 9) * 0.5;
      this.ring.material.color.setHex(0xff5544);
      this.ring.material.opacity = 0.35 + p * 0.45;
      this.ring.scale.setScalar(1 + p * 0.035);
    } else {
      this.ring.material.color.setHex(0xffd166);
      this.ring.material.opacity = 0.32 + Math.sin(T * 2.6) * 0.14;
      this.ring.scale.setScalar(1);
    }

    // drifting dust
    const dp = this.dust.geometry.attributes.position.array;
    for (let i = 1; i < dp.length; i += 3) {
      dp[i] += dt * 0.35;
      if (dp[i] > 14) dp[i] = 0;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;

    // shimmer on placed water / chrome
    for (const m of this.shimmer) m.emissiveIntensity = m.userData.baseEm * (0.8 + Math.sin(T * 3 + m.id) * 0.35);

    // pickable highlight + bob; ghost guidance pulse
    const pending = this.items.filter((it) => !it.placed && !this.flying.includes(it));
    for (let i = 0; i < pending.length; i++) {
      const it = pending[i];
      const pickNow = i < 4;
      const target = pickNow ? 0.85 : 0;
      forEachMat(it.mesh, (m) => {
        const base = m.userData.baseEm || 0;
        m.emissiveIntensity += (Math.max(base, target) - m.emissiveIntensity) * dt * 6;
      });
      if (pickNow) {
        it.mesh.position.y = restingY(it.def) +
          Math.abs(Math.sin(T * 2.4 + it.bobPhase)) * 0.3;
        it.mesh.rotation.y += dt * 0.4;
      }
      // ghost hint: next block's silhouette breathes brighter
      it.ghost.userData.blockMat.opacity = i === 0 ? 0.18 + Math.sin(T * 5) * 0.1
        : pickNow ? 0.11 : 0.06;
    }

    // fly animations
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const it = this.flying[i];
      it.t += dt * 1.8;
      const k = Math.min(1, it.t);
      const e = 1 - Math.pow(1 - k, 3);
      const target = new THREE.Vector3(...it.def.p);
      it.mesh.position.lerpVectors(it.from, target, e);
      it.mesh.position.y += Math.sin(e * Math.PI) * 3.4;
      it.mesh.rotation.set(
        (it.def.rotX || 0) * e + it.fromRot.x * (1 - e),
        (it.def.rotY || 0) * e + it.fromRot.y * (1 - e),
        (it.def.rotZ || 0) * e + it.fromRot.z * (1 - e),
      );
      if (k >= 1) {
        placeAtTarget(it.mesh, it.def);
        it.placed = true;
        it.pop = 0;
        it.ghost.visible = false;
        this.placedCount++;
        this.flying.splice(i, 1);
        forEachMat(it.mesh, (m) => { m.emissiveIntensity = m.userData.baseEm || 0; });
        this.collectShimmer(it.mesh);
        this.ringPulse(it.mesh.position.clone().setY(Math.max(0.06, it.def.p[1] - it.def.s[1] / 2 + 0.05)));
        this.sparkleBurst(new THREE.Vector3(...it.def.p));
        if (this.placedCount === this.items.length) {
          this.done = true;
          sfx.win();
        } else sfx.place();
      }
    }

    // landing scale pop
    for (const it of this.items) {
      if (it.pop === undefined) continue;
      it.pop += dt;
      const s = 1 + Math.exp(-it.pop * 7) * Math.sin(it.pop * 22) * 0.22;
      it.mesh.scale.setScalar(Math.max(0.001, s));
      if (it.pop > 0.7) { it.mesh.scale.setScalar(1); delete it.pop; }
    }

    // transient effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i].update(dt)) this.effects.splice(i, 1);
    }

    // celebration
    if (this.done) {
      if (this.celebT < 0) {
        this.celebT = 0;
        this.camFrom = this.camera.position.clone();
        this.confettiBurst();
        this.sparkleBurst(new THREE.Vector3(0, this.monTop * 0.6, 0), 30, 7, 0xffd166);
      }
      this.celebT += dt;
      const ct = this.celebT;
      // extra firework crackles
      if (!this.fx2 && ct > 0.45) { this.fx2 = 1; this.sparkleBurst(new THREE.Vector3(3, this.monTop * 0.8, 2), 24, 6, 0x8fd0ff); }
      if (!this.fx3 && ct > 0.9) { this.fx3 = 1; this.sparkleBurst(new THREE.Vector3(-3, this.monTop * 0.9, -1), 24, 6, 0xffa8c8); }
      // monument glow-up
      const glow = Math.max(0, Math.sin(Math.min(ct * 2.2, Math.PI))) * 0.55;
      for (const it of this.items) {
        forEachMat(it.mesh, (m) => { m.emissiveIntensity = (m.userData.baseEm || 0) + glow; });
      }
      // camera push-in (main.js releases the camera once state leaves 'puzzle')
      const k = Math.min(1, ct / 1.3);
      const ease = k * k * (3 - 2 * k);
      this.camera.position.lerpVectors(this.camFrom, this.camTarget, ease);
      this.camera.lookAt(0, this.monTop * 0.45, 0);
    }

    if (!this.done && this.time <= 0) { this.failed = true; this.time = 0; }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((n) => {
      if (n.geometry && !(this.sharedGeos || []).includes(n.geometry)) n.geometry.dispose();
      const mats = Array.isArray(n.material) ? n.material : n.material ? [n.material] : [];
      for (const m of mats) {
        if (m.map && !sharedTex.has(m.map)) m.map.dispose();
        m.dispose();
      }
    });
    for (const geo of this.sharedGeos || []) geo.dispose();
    this.effects.length = 0;
    this.shimmer.length = 0;
    this.flying.length = 0;
  }
}
