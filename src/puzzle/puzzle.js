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
// Plaza floors deliberately contrast their monuments. Every landmark in the
// game is a warm stone/limestone/bronze hero, and every city theme lights the
// scene with a warm sunset key — so all four plazas are pushed well into cool
// blue-grey. They have to be over-corrected: a "neutral" hex reads tan once
// the warm sun and hemi light hit it.
// These hexes render considerably lighter than they look in source: the warm
// sun + hemi + ACES exposure lift them a long way. Paris and London are pushed
// darkest because their heroes (the pale Louvre wings, the near-white London
// Eye) have the least value of their own to separate with.
const PLAZA = {
  nyc: { stone: '#6b7383', dark: '#4e5563', trim: '#8f98a9', ground: '#2f3440', sky: '#2a3450' },
  paris: { stone: '#7a8394', dark: '#5e6678', trim: '#a3abbc', ground: '#3c4150', sky: '#3e466e' },
  london: { stone: '#5a6675', dark: '#434e5c', trim: '#8496a8', ground: '#2f3640', sky: '#2c3348' },
  rome: { stone: '#63737a', dark: '#4a5960', trim: '#95a8ae', ground: '#323b39', sky: '#4c3e56' },
};

// Painted-panorama palette. Near layer is the darker, more saturated band the
// eye reads as "the next few streets"; far is the hazier ridge behind it.
const SKYPAL = {
  nyc: { near: '#2c3350', far: '#465072', trim: '#3e4768', roof: '#23293d', win: '255,214,150', accent: '#6d7799' },
  paris: { near: '#4f4c6e', far: '#7c7999', trim: '#726f92', roof: '#38364f', win: '255,228,176', accent: '#d8d2c6' },
  london: { near: '#3b2b2d', far: '#565b6e', trim: '#37414f', roof: '#26262f', win: '255,236,192', accent: '#8f95a6' },
  rome: { near: '#4a3a30', far: '#6d6055', trim: '#6b4e3a', roof: '#5c3324', win: '255,214,150', accent: '#cfc4b0' },
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
  // the pyramid's mullion grid needs the extra resolution — a cylinder UV
  // gives each of the four faces only a quarter of the texture width
  const SZ = tex === 'glass' ? 512 : 256;
  return cachedTex(key, SZ, SZ, (g, S) => {
    if (tex === 'lattice') {
      // Painted iron lattice. The girder highlight is deliberately restrained:
      // lifting it far above the base hue turned the Eiffel tan under Paris'
      // warm sun, which is what made it read as varnished wood. Contrast comes
      // from a very dark field behind bright-but-still-bronze members.
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, shade(c, -0.42));
      grad.addColorStop(1, shade(c, -0.58));
      g.fillStyle = grad; g.fillRect(0, 0, S, S);
      g.strokeStyle = shade(c, 0.30); g.lineWidth = 4;
      g.beginPath();
      for (let i = -6; i <= 6; i++) {
        g.moveTo(i * S / 4, 0); g.lineTo(i * S / 4 + S / 2, S);
        g.moveTo(i * S / 4 + S / 2, 0); g.lineTo(i * S / 4, S);
      }
      g.stroke();
      g.strokeStyle = 'rgba(10,8,6,0.75)'; g.lineWidth = 3;
      for (let j = 1; j < 4; j++) {
        g.beginPath(); g.moveTo(0, j * S / 4); g.lineTo(S, j * S / 4); g.stroke();
      }
      // horizontal belt girders + the vertical corner posts that frame it
      g.strokeStyle = shade(c, 0.20); g.lineWidth = 7;
      for (let j = 1; j < 4; j++) {
        g.beginPath(); g.moveTo(0, j * S / 4 - 3); g.lineTo(S, j * S / 4 - 3); g.stroke();
      }
      g.strokeStyle = shade(c, 0.24); g.lineWidth = 10;
      g.strokeRect(3, -20, S - 6, S + 40);
      return;
    }
    if (tex === 'glass') {
      // The Louvre icon. Deep teal-blue glass (NOT pale) so the pyramid holds
      // a silhouette against a bright sky, a warm sky reflection raking down
      // from the apex, and a strictly REGULAR diamond mullion grid in bright
      // white — the diamond lattice is the thing everyone recognises.
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, '#f0b878');            // warm sunset caught up top
      grad.addColorStop(0.12, '#3f7ba0');
      grad.addColorStop(0.5, '#1d5578');
      grad.addColorStop(1, '#0d3a5c');            // deep at the base
      g.fillStyle = grad; g.fillRect(0, 0, S, S);
      // a restrained warm bloom near the base — enough to suggest the lit hall
      // underneath without bleaching the glass to white
      const lantern = g.createRadialGradient(S / 2, S * 0.95, 4, S / 2, S * 0.95, S * 0.44);
      lantern.addColorStop(0, 'rgba(255,190,110,0.42)');
      lantern.addColorStop(1, 'rgba(255,170,90,0)');
      g.fillStyle = lantern; g.fillRect(0, 0, S, S);
      // regular diamond grid: both diagonal sets on the SAME pitch, plus the
      // horizontal purlins that make it read as a real space-frame
      const N = 16;                               // 4 rhombi per pyramid face
      const step = S / N;
      g.strokeStyle = 'rgba(255,255,255,0.30)'; g.lineWidth = 2;
      g.beginPath();
      for (let j = 1; j < N; j++) { g.moveTo(0, j * step); g.lineTo(S, j * step); }
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4;
      g.beginPath();
      for (let i = -N; i <= 2 * N; i++) {
        g.moveTo(i * step, 0); g.lineTo(i * step - S, S);       // \ set
        g.moveTo(i * step - S, 0); g.lineTo(i * step, S);       // / set
      }
      g.stroke();
      // node beads where the mullions cross
      g.fillStyle = 'rgba(255,246,226,0.95)';
      for (let j = 0; j <= N; j++) for (let i = -N; i <= 2 * N; i++) {
        g.beginPath(); g.arc((i - j) * step, j * step, 3.2, 0, Math.PI * 2); g.fill();
      }
      return;
    }
    if (tex === 'ashlar') {
      // limestone panel courses with subtle gothic ribs — no barcode noise
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, shade(c, 0.08)); grad.addColorStop(1, shade(c, -0.06));
      g.fillStyle = grad; g.fillRect(0, 0, S, S);
      // stone courses
      g.strokeStyle = shade(c, -0.16); g.lineWidth = 2;
      for (let j = 1; j < 8; j++) {
        g.beginPath(); g.moveTo(0, j * S / 8); g.lineTo(S, j * S / 8); g.stroke();
        for (let i = 0; i < 4; i++) {
          const x = ((i + (j % 2) * 0.5) / 4) * S;
          g.beginPath(); g.moveTo(x, (j - 1) * S / 8); g.lineTo(x, j * S / 8); g.stroke();
        }
      }
      // gothic ribs: raised vertical bands with shaded edges
      for (const rx of [0.16, 0.5, 0.84]) {
        const x = rx * S;
        g.fillStyle = shade(c, 0.16); g.fillRect(x - 9, 0, 18, S);
        g.fillStyle = shade(c, -0.24); g.fillRect(x - 11, 0, 3, S);
        g.fillStyle = shade(c, 0.28); g.fillRect(x + 8, 0, 3, S);
        // lancet hint at the top of each rib
        g.fillStyle = shade(c, -0.35);
        g.beginPath();
        g.moveTo(x - 5, S * 0.16); g.quadraticCurveTo(x, S * 0.05, x + 5, S * 0.16);
        g.lineTo(x + 5, S * 0.3); g.lineTo(x - 5, S * 0.3); g.closePath(); g.fill();
      }
      return;
    }
    if (tex === 'niche') {
      // arched statue niches for the Trevi facade
      baseFill(g, S, c);
      const n = tx.n || 5;
      const w = S / n;
      for (let i = 0; i < n; i++) {
        const cx = i * w + w / 2, aw = w * 0.52, top = S * 0.2, bot = S * 0.82;
        // dark recessed niche with warm AO
        const ng = g.createLinearGradient(0, top, 0, bot);
        ng.addColorStop(0, '#2a2118'); ng.addColorStop(1, '#4a3a26');
        g.fillStyle = ng;
        g.beginPath();
        g.moveTo(cx - aw / 2, bot);
        g.lineTo(cx - aw / 2, top + aw / 2);
        g.arc(cx, top + aw / 2, aw / 2, Math.PI, 0);
        g.lineTo(cx + aw / 2, bot);
        g.closePath(); g.fill();
        g.strokeStyle = shade(c, -0.3); g.lineWidth = 4; g.stroke();
        // statue silhouette inside
        g.fillStyle = shade(c, 0.22);
        g.beginPath(); g.arc(cx, top + aw * 0.62, aw * 0.14, 0, Math.PI * 2); g.fill();
        g.beginPath();
        g.moveTo(cx - aw * 0.2, bot);
        g.quadraticCurveTo(cx - aw * 0.24, top + aw * 0.85, cx, top + aw * 0.78);
        g.quadraticCurveTo(cx + aw * 0.24, top + aw * 0.85, cx + aw * 0.2, bot);
        g.closePath(); g.fill();
        // pilasters between niches
        g.fillStyle = shade(c, 0.15); g.fillRect(i * w + 1, S * 0.12, 8, S * 0.76);
        g.fillStyle = shade(c, -0.2); g.fillRect(i * w + 9, S * 0.12, 2, S * 0.76);
      }
      // cornice + plinth bands
      g.fillStyle = shade(c, 0.2); g.fillRect(0, 0, S, S * 0.09);
      g.fillStyle = shade(c, -0.24); g.fillRect(0, S * 0.09, S, 4);
      g.fillStyle = shade(c, -0.1); g.fillRect(0, S * 0.88, S, S * 0.12);
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
        // deep warm ambient-occlusion ring just inside the arch
        g.strokeStyle = 'rgba(46,28,12,0.6)'; g.lineWidth = 10;
        g.beginPath();
        g.moveTo(cx - aw / 2 + 4, bot);
        g.lineTo(cx - aw / 2 + 4, top + aw / 2);
        g.arc(cx, top + aw / 2, aw / 2 - 4, Math.PI, 0);
        g.lineTo(cx + aw / 2 - 4, bot);
        g.stroke();
        // crisp arch surround
        g.strokeStyle = shade(c, -0.4); g.lineWidth = 5;
        g.beginPath();
        g.moveTo(cx - aw / 2, bot);
        g.lineTo(cx - aw / 2, top + aw / 2);
        g.arc(cx, top + aw / 2, aw / 2, Math.PI, 0);
        g.lineTo(cx + aw / 2, bot);
        g.stroke();
        // keystone
        g.fillStyle = shade(c, 0.24);
        g.fillRect(cx - 5, top - 6, 10, 14);
        // pilaster hint between arches
        g.fillStyle = shade(c, 0.16);
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
        const lit = dRand(i, j) < 0.42;
        g.fillStyle = lit ? (tx.lit || '#ffc46a') : '#2e3542';
        g.fillRect(x, y, cw * 0.64, ch * 0.6);
        g.fillStyle = lit ? 'rgba(255,240,200,0.55)' : 'rgba(140,170,205,0.3)';
        g.fillRect(x, y, cw * 0.64, ch * 0.16);
      }
    } else if (tex === 'strip') {
      const n = tx.n || 3;                       // halved stripe frequency
      const w = S / n;
      for (let i = 0; i < n; i++) {
        g.fillStyle = '#332f28';
        g.fillRect(i * w + w * 0.28, S * 0.05, w * 0.44, S * 0.9);
        g.fillStyle = 'rgba(255,190,110,0.85)';  // warm amber lit windows
        for (let j = 0; j < 7; j++) if (dRand(i, j) < 0.5) g.fillRect(i * w + w * 0.32, S * (0.08 + j * 0.125), w * 0.36, S * 0.07);
        g.fillStyle = shade(c, 0.18);
        g.fillRect(i * w, 0, w * 0.1, S);
        g.fillStyle = shade(c, -0.14);
        g.fillRect(i * w + w * 0.1, 0, w * 0.04, S);
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
      // Lancet openings. These used to be near-black caves that dominated the
      // Brooklyn / Tower Bridge / Big Ben towers; now they are warm shadowed
      // recesses with a stone mullion and a hint of lamplight deep inside.
      for (let i = 0; i < 2; i++) {
        const cx = S * (0.29 + i * 0.42), aw = S * 0.21, top = S * 0.18, bot = S * 0.90;
        const lancet = () => {
          g.beginPath();
          g.moveTo(cx - aw / 2, bot);
          g.lineTo(cx - aw / 2, top + aw * 0.9);
          g.quadraticCurveTo(cx - aw / 2, top, cx, top - aw * 0.25);
          g.quadraticCurveTo(cx + aw / 2, top, cx + aw / 2, top + aw * 0.9);
          g.lineTo(cx + aw / 2, bot);
          g.closePath();
        };
        const rg = g.createLinearGradient(0, top, 0, bot);
        rg.addColorStop(0, '#4c3a26'); rg.addColorStop(0.45, '#5c452c');
        rg.addColorStop(1, '#3d2f20');
        g.fillStyle = rg; lancet(); g.fill();
        // warm lamplight glow low in the opening
        const lit = g.createRadialGradient(cx, bot - aw * 0.5, 2, cx, bot - aw * 0.5, aw * 1.1);
        lit.addColorStop(0, 'rgba(255,196,116,0.5)');
        lit.addColorStop(1, 'rgba(255,180,100,0)');
        g.save(); lancet(); g.clip();
        g.fillStyle = lit; g.fillRect(cx - aw, top, aw * 2, bot - top);
        g.restore();
        // central stone mullion + tracery bar
        g.fillStyle = shade(c, 0.06);
        g.fillRect(cx - S * 0.011, top + aw * 0.42, S * 0.022, bot - top - aw * 0.42);
        g.fillRect(cx - aw / 2, top + aw * 1.1, aw, S * 0.014);
        // crisp lit surround
        g.strokeStyle = shade(c, 0.3); g.lineWidth = 6; lancet(); g.stroke();
        g.strokeStyle = shade(c, -0.24); g.lineWidth = 2;
        lancet(); g.stroke();
      }
      g.fillStyle = shade(c, 0.2); g.fillRect(0, 0, S, S * 0.07);
      g.fillStyle = shade(c, -0.2); g.fillRect(0, S * 0.07, S, 4);
    } else if (tex === 'relief') {
      // Carved figurative panels. The old version read as filing-cabinet
      // drawers; these are arch-topped recesses with a deep warm AO wash and
      // a robed figure catching the light, which is what a monumental frieze
      // actually looks like from twenty metres.
      const cols = 3, rows = 2;
      const pw = S * 0.26, ph = S * 0.36;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        const x = S * 0.07 + i * S * 0.302, y = S * 0.09 + j * S * 0.45;
        const cx = x + pw / 2;
        const panel = () => {
          g.beginPath();
          g.moveTo(x, y + ph);
          g.lineTo(x, y + pw * 0.5);
          g.arc(cx, y + pw * 0.5, pw / 2, Math.PI, 0);
          g.lineTo(x + pw, y + ph);
          g.closePath();
        };
        // recess + warm occlusion
        const rg = g.createLinearGradient(0, y, 0, y + ph);
        rg.addColorStop(0, 'rgba(40,26,12,0.72)');
        rg.addColorStop(1, 'rgba(70,48,24,0.5)');
        g.fillStyle = rg; panel(); g.fill();
        // figure catching the light
        g.fillStyle = shade(c, 0.34);
        g.beginPath(); g.arc(cx, y + ph * 0.33, pw * 0.12, 0, Math.PI * 2); g.fill();
        g.beginPath();
        g.moveTo(cx - pw * 0.19, y + ph * 0.93);
        g.quadraticCurveTo(cx - pw * 0.23, y + ph * 0.5, cx, y + ph * 0.45);
        g.quadraticCurveTo(cx + pw * 0.23, y + ph * 0.5, cx + pw * 0.19, y + ph * 0.93);
        g.closePath(); g.fill();
        g.fillStyle = shade(c, 0.14);          // outflung arm
        g.beginPath();
        g.moveTo(cx + pw * 0.08, y + ph * 0.48);
        g.lineTo(cx + pw * 0.33, y + ph * 0.34);
        g.lineTo(cx + pw * 0.35, y + ph * 0.42);
        g.lineTo(cx + pw * 0.10, y + ph * 0.56);
        g.closePath(); g.fill();
        // crisp lit surround + shadow line
        g.strokeStyle = shade(c, 0.34); g.lineWidth = 5; panel(); g.stroke();
        g.strokeStyle = shade(c, -0.34); g.lineWidth = 2; panel(); g.stroke();
      }
      g.fillStyle = shade(c, 0.24); g.fillRect(0, 0, S, S * 0.05);
      g.fillStyle = shade(c, -0.3); g.fillRect(0, S * 0.05, S, 4);
      g.fillStyle = shade(c, -0.16); g.fillRect(0, S * 0.955, S, S * 0.045);
    } else if (tex === 'crown') {
      // chrome sunburst: mirror gradient + crisp dark triangular cutouts
      const grad = g.createLinearGradient(0, 0, 0, S);
      grad.addColorStop(0, '#fbfdff'); grad.addColorStop(0.35, shade(c, 0.12));
      grad.addColorStop(0.7, '#aeb7c6'); grad.addColorStop(1, '#6f7889');
      g.fillStyle = grad; g.fillRect(0, 0, S, S);
      const n = 8;
      for (let i = 0; i < n; i++) {
        const cx = (i + 0.5) * S / n;
        g.fillStyle = '#141a26';
        g.beginPath();
        g.moveTo(cx - S / n * 0.34, S * 0.99);
        g.lineTo(cx, S * 0.16);
        g.lineTo(cx + S / n * 0.34, S * 0.99);
        g.closePath(); g.fill();
        // bright chrome edge on each cutout
        g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5;
        g.stroke();
      }
      // polished band along the tier base
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(0, 0, S, 5);
    }
  });
}

const clockFaceTex = () => cachedTex('clockface2', 256, 256, (g, S) => {
  // warm ivory dial with a bold gold ring and heavy gothic hands
  const rg = g.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S * 0.48);
  rg.addColorStop(0, '#fdf6dd'); rg.addColorStop(1, '#f0e3ba');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#2b2b26'; g.lineWidth = 12;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.455, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#d4af5a'; g.lineWidth = 11;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.395, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#8a6d2c'; g.lineWidth = 3;
  g.beginPath(); g.arc(S / 2, S / 2, S * 0.34, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = '#2b2b26';
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(S / 2 + Math.cos(a) * S * 0.26, S / 2 + Math.sin(a) * S * 0.26);
    g.lineTo(S / 2 + Math.cos(a) * S * 0.335, S / 2 + Math.sin(a) * S * 0.335);
    g.stroke();
  }
  g.lineWidth = 15; g.lineCap = 'round';
  g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 + S * 0.17, S / 2 - S * 0.13); g.stroke();
  g.lineWidth = 12;
  g.beginPath(); g.moveTo(S / 2, S / 2); g.lineTo(S / 2 - S * 0.06, S / 2 - S * 0.28); g.stroke();
  g.fillStyle = '#2b2b26';
  g.beginPath(); g.arc(S / 2, S / 2, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#d4af5a';
  g.beginPath(); g.arc(S / 2, S / 2, 6, 0, Math.PI * 2); g.fill();
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

// ============================================================
// PAINTED SKYLINE PANORAMA
// The old backdrop was a ring of unlit boxes. Because they were drawn with
// fog disabled while the ground under them was ~70% fogged, they read as
// crisp navy cutouts pasted onto a beige void — the "floating slabs" problem.
// This replaces the whole ring with one painted cylinder, which lets every
// depth cue be authored directly: two layers with different haze, roofs that
// belong to their city, and a ground skirt tinted to the exact colour the
// fogged plaza floor reaches at the panorama's radius, so the join is seamless.
// ============================================================
const PANO_R = 130;                                  // cylinder radius, world units
const PANO_W = 4096, PANO_H = 1024;
const PANO_U = PANO_W / (2 * Math.PI * PANO_R);      // ≈5.01 px per world unit
const PANO_HOR = 760;                                // horizon scanline in the texture
const PANO_HT = PANO_H / PANO_U;                     // cylinder height in world units

// a scatter of lit windows inside a facade rect (all args in px)
function panoWindows(g, x, y, w, h, seed, o) {
  const cw = o.cw || 4, ch = o.ch || 6, gx = o.gx || 6, gy = o.gy || 7;
  const cols = Math.floor((w + gx) / (cw + gx));
  const rows = Math.floor((h + gy) / (ch + gy));
  if (cols < 1 || rows < 1) return;
  const ox = x + (w - (cols * (cw + gx) - gx)) / 2;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    if (dRand(seed * 3.7 + i, j * 1.9 + 2) > (o.p || 0.34)) continue;
    g.fillStyle = `rgba(${o.win},${0.4 + dRand(i + seed, j * 2) * 0.5})`;
    g.fillRect(ox + i * (cw + gx), y + j * (ch + gy), cw, ch);
  }
}

// a ribbed church dome with drum and lantern
function panoDome(g, cx, baseY, r, cLight, cDark) {
  g.fillStyle = cDark;
  g.fillRect(cx - r * 1.02, baseY - r * 0.62, r * 2.04, r * 0.7);
  g.fillStyle = cLight;
  g.beginPath();
  g.moveTo(cx - r, baseY - r * 0.55);
  g.bezierCurveTo(cx - r, baseY - r * 1.5, cx - r * 0.44, baseY - r * 1.86, cx, baseY - r * 1.9);
  g.bezierCurveTo(cx + r * 0.44, baseY - r * 1.86, cx + r, baseY - r * 1.5, cx + r, baseY - r * 0.55);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = Math.max(1, r * 0.05);
  for (const t of [-0.6, -0.24, 0.24, 0.6]) {
    g.beginPath();
    g.moveTo(cx + r * t, baseY - r * 0.55);
    g.quadraticCurveTo(cx + r * t * 0.72, baseY - r * 1.5, cx + r * t * 0.1, baseY - r * 1.88);
    g.stroke();
  }
  g.fillStyle = cLight;
  g.fillRect(cx - r * 0.2, baseY - r * 2.4, r * 0.4, r * 0.55);   // lantern
  g.fillRect(cx - r * 0.06, baseY - r * 2.72, r * 0.12, r * 0.34);
}

// square bell tower with belfry openings and a pyramid cap
function panoCampanile(g, cx, baseY, w, h, cBody, cRoof, win) {
  g.fillStyle = cBody; g.fillRect(cx - w / 2, baseY - h, w, h + 10);
  g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(cx + w * 0.16, baseY - h, w * 0.34, h + 10);
  g.fillStyle = `rgba(${win},0.5)`;
  for (let k = 0; k < 3; k++) {
    g.fillRect(cx - w * 0.3, baseY - h + h * (0.12 + k * 0.22), w * 0.6, h * 0.12);
  }
  g.fillStyle = cRoof;
  g.beginPath();
  g.moveTo(cx - w * 0.66, baseY - h); g.lineTo(cx + w * 0.66, baseY - h);
  g.lineTo(cx, baseY - h - w * 1.15); g.closePath(); g.fill();
}

// Roman umbrella pine — the flat-topped canopy is the whole point
function panoPine(g, cx, baseY, s, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(cx - s * 0.05, baseY + 4);
  g.quadraticCurveTo(cx - s * 0.02, baseY - s * 0.5, cx - s * 0.03, baseY - s * 0.78);
  g.lineTo(cx + s * 0.05, baseY - s * 0.78);
  g.quadraticCurveTo(cx + s * 0.05, baseY - s * 0.5, cx + s * 0.08, baseY + 4);
  g.closePath(); g.fill();
  g.beginPath(); g.ellipse(cx, baseY - s * 0.85, s * 0.46, s * 0.17, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx - s * 0.24, baseY - s * 0.75, s * 0.2, s * 0.1, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + s * 0.26, baseY - s * 0.77, s * 0.18, s * 0.09, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(cx + s * 0.04, baseY - s * 0.97, s * 0.24, s * 0.1, 0, 0, Math.PI * 2); g.fill();
}

// tapering faceted spike with an open, broken crown
function panoShard(g, cx, baseY, w, h, col, win) {
  const facets = [-0.5, -0.15, 0.18, 0.5];
  const tint = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.10)', 'rgba(0,0,0,0.14)'];
  for (let f = 0; f < 3; f++) {
    const x0 = cx + w * facets[f], x1 = cx + w * facets[f + 1];
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x0, baseY + 6); g.lineTo(x1, baseY + 6);
    g.lineTo(cx + w * facets[f + 1] * 0.08, baseY - h);
    g.lineTo(cx + w * facets[f] * 0.08, baseY - h);
    g.closePath(); g.fill();
    g.fillStyle = tint[f]; g.fill();
  }
  // floor bands thinning toward the tip
  g.strokeStyle = `rgba(${win},0.22)`; g.lineWidth = 1.5;
  for (let k = 1; k < 22; k++) {
    const t = k / 22, yy = baseY - h * t;
    const hw = w * 0.5 * (1 - t * 0.92);
    g.beginPath(); g.moveTo(cx - hw, yy); g.lineTo(cx + hw, yy); g.stroke();
  }
  // the splintered open spire
  g.fillStyle = col;
  for (let k = 0; k < 4; k++) {
    const sx = cx + (k - 1.5) * w * 0.045;
    g.fillRect(sx, baseY - h - 4 - dRand(k, 3) * 16, 2.4, 20);
  }
}

// bullet-profile tower with a diagrid skin
function panoGherkin(g, cx, baseY, w, h, col, win) {
  const body = () => {
    g.beginPath();
    g.moveTo(cx - w * 0.32, baseY + 6);
    g.bezierCurveTo(cx - w * 0.54, baseY - h * 0.42, cx - w * 0.48, baseY - h * 0.85, cx, baseY - h);
    g.bezierCurveTo(cx + w * 0.48, baseY - h * 0.85, cx + w * 0.54, baseY - h * 0.42, cx + w * 0.32, baseY + 6);
    g.closePath();
  };
  g.fillStyle = col; body(); g.fill();
  g.save(); body(); g.clip();
  g.strokeStyle = `rgba(${win},0.20)`; g.lineWidth = 2;
  for (let k = -8; k < 14; k++) {
    g.beginPath();
    g.moveTo(cx - w + k * w * 0.18, baseY + 8); g.lineTo(cx - w + k * w * 0.18 + h * 0.5, baseY - h - 8);
    g.moveTo(cx + w - k * w * 0.18, baseY + 8); g.lineTo(cx + w - k * w * 0.18 - h * 0.5, baseY - h - 8);
    g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,0.16)';
  g.fillRect(cx + w * 0.14, baseY - h, w * 0.5, h + 10);
  g.restore();
  g.fillStyle = `rgba(${win},0.4)`;
  g.beginPath(); g.ellipse(cx, baseY - h + 6, w * 0.08, w * 0.06, 0, 0, Math.PI * 2); g.fill();
}

function panoTex(cityId, P, fogHex, fogF) {
  const S = SKYPAL[cityId] || SKYPAL.nyc;
  const c = document.createElement('canvas');
  c.width = PANO_W; c.height = PANO_H;
  const g = c.getContext('2d');
  const FOG = new THREE.Color(fogHex);
  // haze a hue toward the scene's fog colour by `t` — this is baked because
  // real three.js fog flattens all four cities to the same beige at 130 units
  const hz = (hex, t) => `#${new THREE.Color(hex).lerp(FOG, Math.max(0, Math.min(0.96, t))).getHexString()}`;
  const U = PANO_U, HOR = PANO_HOR, W = PANO_W;
  // Haze budget. These are deliberately far below the physical fog factor
  // (~0.72 at this radius): the two source-atop washes below stack on top of
  // them, and at full strength the whole backdrop bleached to the sky colour.
  // The far band was previously hazed so hard (0.80) that it bleached into the
  // sky in every city but New York, leaving one flat cut-out silhouette instead
  // of two depth layers. 0.63 keeps it clearly behind the near band while the
  // source-atop washes below still stack on top of it.
  const FAR = fogF * 0.63, NEAR = fogF * 0.24;
  const win = S.win;

  // ---- far layer: hazier, bases a touch above the horizon so they sit back
  const farCol = hz(S.far, FAR);
  const farRow = (minH, maxH, minW, maxW, gapMin, gapMax, seed, cap) => {
    let x = -80, i = 0;
    while (x < W + 90) {
      const bw = (minW + dRand(i, seed) * (maxW - minW)) * U;
      const bh = (minH + dRand(i, seed + 1) * (maxH - minH)) * U;
      g.fillStyle = farCol;
      g.fillRect(x, HOR - 6 - bh, bw, bh + 8);
      if (cap) cap(x, HOR - 6 - bh, bw, bh, i);
      x += bw + (gapMin + dRand(i, seed + 2) * (gapMax - gapMin)) * U;
      i++;
    }
  };

  if (cityId === 'paris') {
    farRow(9, 15, 14, 26, 1, 5, 21, (x, y, bw) => {
      g.fillStyle = hz(S.roof, FAR + 0.04);
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x + bw, y);
      g.lineTo(x + bw * 0.86, y - 9); g.lineTo(x + bw * 0.14, y - 9);
      g.closePath(); g.fill();
    });
    // Sacré-Cœur, pale travertine on its distant hill
    const sx = W * 0.60, pale = hz(S.accent, FAR * 0.86), paleD = hz(S.accent, FAR * 0.98);
    g.fillStyle = hz(S.far, FAR + 0.04);
    g.beginPath(); g.ellipse(sx, HOR + 8, 460, 66, 0, Math.PI, 0); g.fill();
    g.fillStyle = pale;
    g.fillRect(sx - 62, HOR - 88, 124, 50);
    panoDome(g, sx, HOR - 88, 31, pale, paleD);
    panoDome(g, sx - 72, HOR - 74, 14, pale, paleD);
    panoDome(g, sx + 72, HOR - 74, 14, pale, paleD);
  } else if (cityId === 'rome') {
    farRow(6, 11, 14, 26, 2, 7, 31);
    const sx = W * 0.34, pale = hz(S.accent, FAR * 0.7);
    g.fillStyle = pale; g.fillRect(sx - 74, HOR - 84, 148, 90);
    panoDome(g, sx, HOR - 84, 52, pale, hz(S.accent, FAR * 0.85));
  } else if (cityId === 'london') {
    farRow(8, 20, 12, 24, 2, 6, 41);
    const sx = W * 0.78, pale = hz(S.accent, FAR * 0.74);   // St Paul's
    g.fillStyle = pale; g.fillRect(sx - 62, HOR - 66, 124, 72);
    panoDome(g, sx, HOR - 66, 42, pale, hz(S.accent, FAR * 0.88));
  } else {
    farRow(20, 46, 10, 22, 0.5, 4, 51, (x, y, bw, bh, i) => {
      if (dRand(i, 6) > 0.7) {
        g.fillStyle = farCol;
        g.fillRect(x + bw * 0.44, y - 30 - dRand(i, 7) * 26, 5, 34);
      }
    });
  }

  // ---- haze wash: only over what is already painted, so the sky stays clear
  g.globalCompositeOperation = 'source-atop';
  const fr = Math.round(FOG.r * 255), fgc = Math.round(FOG.g * 255), fb = Math.round(FOG.b * 255);
  let hg = g.createLinearGradient(0, HOR - 150, 0, HOR + 10);
  hg.addColorStop(0, `rgba(${fr},${fgc},${fb},0)`);
  hg.addColorStop(1, `rgba(${fr},${fgc},${fb},0.45)`);
  g.fillStyle = hg; g.fillRect(0, 0, W, PANO_H);
  g.globalCompositeOperation = 'source-over';

  // ---- near layer: darker, more saturated, bases overlapping the horizon
  const nearCol = hz(S.near, NEAR);
  const trimCol = hz(S.trim, NEAR * 0.86);
  const roofCol = hz(S.roof, NEAR * 0.9);
  const shade1 = 'rgba(0,0,0,0.13)';

  if (cityId === 'paris') {
    // Haussmann: 6 storeys of ashlar, a continuous cornice, a 45° zinc mansard
    let x = -60, i = 0;
    while (x < W + 70) {
      // every seventh plot is a boulevard: a gap the sky shows through, which
      // is what stops the row reading as one continuous wall
      if (i % 7 === 5) { x += (7 + dRand(i, 8) * 9) * U; i++; continue; }
      const bw = (15 + dRand(i, 1) * 13) * U;
      // corner blocks and the odd church run taller than the standard six storeys
      const tall = i % 5 === 2 ? 5.5 : i % 3 === 1 ? 2.2 : 0;
      const bh = (9.5 + tall + dRand(i, 2) * 4.6) * U;
      const y = HOR + 8 - bh;
      g.fillStyle = nearCol; g.fillRect(x, y, bw, bh + 16);
      g.fillStyle = shade1; g.fillRect(x + bw * 0.74, y, bw * 0.26, bh + 16);
      g.fillStyle = trimCol;
      g.fillRect(x, y + bh * 0.30, bw, 3);            // 2nd-floor balcony run
      g.fillRect(x, y + bh * 0.70, bw, 3);            // 5th-floor balcony run
      g.fillRect(x, y + bh * 0.84, bw, 2);
      panoWindows(g, x + 5, y + 7, bw - 10, bh * 0.74, i, { cw: 4, ch: 10, gx: 8, gy: 7, p: 0.5, win });
      g.fillStyle = trimCol; g.fillRect(x - 3, y - 4, bw + 6, 6);   // cornice
      // ---- roofline. A boulevard is not one repeated block: the mansard is
      // the common case, but the row is broken up by flat balustraded attics,
      // steep slate pitches, corner rotundas and the occasional church flèche.
      const mh = (2.4 + dRand(i, 3) * 1.0) * U, mi = bw * 0.12;
      const roofT = i % 9 === 4 ? 3 : i % 4;
      const dormers = (ry, rh, inset) => {
        const dn = Math.max(2, Math.round(bw / (7 * U)));
        for (let d = 0; d < dn; d++) {
          const dx = x + inset + ((d + 0.5) / dn) * (bw - 2 * inset);
          g.fillStyle = `rgba(${win},${0.25 + dRand(i * 5 + d, 4) * 0.45})`;
          g.fillRect(dx - 3, ry, 6, rh);
        }
      };
      const stacks = (ry, n) => {
        for (let ci = 0; ci < n; ci++) {
          g.fillStyle = roofCol;
          g.fillRect(x + bw * (0.15 + ci * (0.7 / Math.max(1, n - 1))), ry - 9, 4.5, 10);
        }
      };
      if (roofT === 0) {                             // classic zinc mansard
        g.fillStyle = roofCol;
        g.beginPath();
        g.moveTo(x - 3, y - 3); g.lineTo(x + bw + 3, y - 3);
        g.lineTo(x + bw - mi, y - 3 - mh); g.lineTo(x + mi, y - 3 - mh);
        g.closePath(); g.fill();
        dormers(y - 5 - mh * 0.62, mh * 0.44, mi);
        stacks(y - 3 - mh, 3);
      } else if (roofT === 1) {                      // flat attic + balustrade
        g.fillStyle = roofCol;
        g.fillRect(x - 2, y - 3 - mh * 0.5, bw + 4, mh * 0.5);
        g.fillStyle = trimCol;
        g.fillRect(x - 4, y - 4 - mh * 0.5, bw + 8, 4);
        for (let b2 = 0; b2 * 9 < bw; b2++) {
          g.fillRect(x + 2 + b2 * 9, y - 3 - mh * 0.5 - 7, 3, 7);   // balusters
        }
        stacks(y - 3 - mh * 0.5, 2);
      } else if (roofT === 2) {                      // steep slate pitch
        g.fillStyle = roofCol;
        g.beginPath();
        g.moveTo(x - 4, y - 3); g.lineTo(x + bw + 4, y - 3);
        g.lineTo(x + bw * 0.5, y - 3 - mh * 1.45);
        g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.beginPath();
        g.moveTo(x + bw * 0.5, y - 3); g.lineTo(x + bw + 4, y - 3);
        g.lineTo(x + bw * 0.5, y - 3 - mh * 1.45);
        g.closePath(); g.fill();
        dormers(y - 3 - mh * 0.42, mh * 0.3, bw * 0.24);
        stacks(y - 3, 2);
      } else {                                       // corner rotunda / pavilion
        g.fillStyle = roofCol;
        g.beginPath();
        g.moveTo(x - 3, y - 3); g.lineTo(x + bw + 3, y - 3);
        g.lineTo(x + bw - mi, y - 3 - mh * 0.72); g.lineTo(x + mi, y - 3 - mh * 0.72);
        g.closePath(); g.fill();
        const cx3 = x + bw * (i % 2 ? 0.22 : 0.78), cr = Math.min(bw * 0.2, 5.5 * U);
        g.fillStyle = trimCol;
        g.fillRect(cx3 - cr, y - 4 - mh * 0.72, cr * 2, 5);
        g.fillStyle = roofCol;
        g.beginPath();
        g.moveTo(cx3 - cr, y - 3 - mh * 0.72);
        g.bezierCurveTo(cx3 - cr, y - 3 - mh * 2.0, cx3 + cr, y - 3 - mh * 2.0,
          cx3 + cr, y - 3 - mh * 0.72);
        g.closePath(); g.fill();
        g.fillRect(cx3 - 1.6, y - 3 - mh * 2.5, 3.2, mh * 0.6);     // finial
        dormers(y - 5 - mh * 0.5, mh * 0.3, mi);
        stacks(y - 3 - mh * 0.72, 2);
      }
      // a church flèche every so often, standing clear of the roofline
      if (i % 11 === 7) {
        const sx2 = x + bw * 0.5;
        g.fillStyle = roofCol;
        g.beginPath();
        g.moveTo(sx2 - 5.5, y - 3 - mh);
        g.lineTo(sx2 + 5.5, y - 3 - mh);
        g.lineTo(sx2, y - 3 - mh - 26 * U);
        g.closePath(); g.fill();
      }
      x += bw + 2; i++;
    }
  } else if (cityId === 'rome') {
    let x = -60, i = 0;
    while (x < W + 70) {
      const bw = (13 + dRand(i, 1) * 11) * U;
      const bh = (6.5 + dRand(i, 2) * 3.6) * U;
      const y = HOR + 8 - bh;
      g.fillStyle = nearCol; g.fillRect(x, y, bw, bh + 16);
      g.fillStyle = shade1; g.fillRect(x + bw * 0.76, y, bw * 0.24, bh + 16);
      panoWindows(g, x + 6, y + 9, bw - 12, bh - 16, i, { cw: 5, ch: 9, gx: 11, gy: 9, p: 0.36, win });
      g.fillStyle = roofCol; g.fillRect(x - 4, y - 5, bw + 8, 6);   // pantile eaves
      if (i % 4 === 1) panoDome(g, x + bw / 2, y - 5, (4.6 + dRand(i, 5) * 2.2) * U, trimCol, roofCol);
      else if (i % 4 === 3) {
        panoCampanile(g, x + bw * 0.5, y - 5, (2.2 + dRand(i, 6) * 0.9) * U,
          (10 + dRand(i, 7) * 6) * U, nearCol, roofCol, win);
      }
      x += bw + 2; i++;
    }
    const pineCol = hz('#26382b', NEAR * 0.8);
    for (let k = 0; k < 11; k++) {
      panoPine(g, (0.037 + k * 0.0905) * W + dRand(k, 8) * 90, HOR + 6,
        (7 + dRand(k, 9) * 4) * U, pineCol);
    }
  } else if (cityId === 'london') {
    const brick = nearCol, office = hz(S.trim, NEAR * 0.92);
    let x = -60, i = 0;
    while (x < W + 70) {
      const isOffice = dRand(i, 9) > 0.66;
      const bw = ((isOffice ? 11 + dRand(i, 1) * 9 : 8 + dRand(i, 1) * 7)) * U;
      const bh = ((isOffice ? 13 + dRand(i, 2) * 9 : 7 + dRand(i, 2) * 3)) * U;
      const y = HOR + 8 - bh;
      g.fillStyle = isOffice ? office : brick;
      g.fillRect(x, y, bw, bh + 16);
      g.fillStyle = shade1; g.fillRect(x + bw * 0.74, y, bw * 0.26, bh + 16);
      if (isOffice) {
        g.fillStyle = 'rgba(0,0,0,0.16)';
        for (let b = 10; b < bh - 6; b += 13) g.fillRect(x + 3, y + b, bw - 6, 5);
        panoWindows(g, x + 5, y + 9, bw - 10, bh - 18, i, { cw: 5, ch: 5, gx: 8, gy: 8, p: 0.32, win });
      } else {
        panoWindows(g, x + 6, y + 10, bw - 12, bh - 20, i, { cw: 4, ch: 7, gx: 9, gy: 8, p: 0.42, win });
        g.fillStyle = roofCol; g.fillRect(x - 3, y - 4, bw + 6, 5);
        const cn = 1 + Math.round(dRand(i, 4) * 2);
        for (let k = 0; k < cn; k++) {
          const cx2 = x + bw * (0.16 + k * 0.31);
          g.fillStyle = roofCol; g.fillRect(cx2, y - 13, 8, 10);
          g.fillStyle = trimCol;
          for (let p2 = 0; p2 < 3; p2++) g.fillRect(cx2 + 1 + p2 * 2.6, y - 17, 1.8, 4);
        }
      }
      x += bw + 2; i++;
    }
    // u=0.5 is dead centre of the default view and u climbs to the LEFT (the
    // panorama is seen from inside the cylinder), so these two sit either side
    // of the monument where the player actually sees them. A Shard parked at
    // u=0.30 is 70° behind the camera and might as well not exist.
    panoShard(g, W * 0.57, HOR + 8, 12 * U, 46 * U, hz(S.trim, NEAR * 0.78), win);
    panoGherkin(g, W * 0.43, HOR + 8, 9.5 * U, 26 * U, hz(S.trim, NEAR * 0.84), win);
  } else {
    // Manhattan: every tower is a stack of setbacks, never a single slab
    let x = -60, i = 0;
    while (x < W + 70) {
      const bw0 = (9 + dRand(i, 1) * 10) * U;
      const bh = (17 + dRand(i, 2) * 27) * U;
      const cx = x + bw0 / 2;
      const nSt = 2 + Math.round(dRand(i, 3) * 2);
      let by = HOR + 8, bw = bw0;
      for (let s = 0; s < nSt; s++) {
        const sh = bh * (s === 0 ? 0.46 : 0.54 / (nSt - 1)) * (1 - s * 0.06);
        g.fillStyle = nearCol; g.fillRect(cx - bw / 2, by - sh, bw, sh + 6);
        g.fillStyle = shade1; g.fillRect(cx + bw * 0.2, by - sh, bw * 0.3, sh + 6);
        panoWindows(g, cx - bw / 2 + 4, by - sh + 7, bw - 8, sh - 12, i * 7 + s,
          { cw: 4, ch: 5, gx: 6, gy: 7, p: 0.3, win });
        g.fillStyle = trimCol; g.fillRect(cx - bw / 2 - 2.5, by - sh - 4, bw + 5, 5);
        by -= sh; bw *= 0.62 + dRand(i, s + 4) * 0.14;
      }
      const crown = dRand(i, 8);
      if (crown > 0.62) {                       // deco spire
        g.fillStyle = trimCol;
        g.beginPath();
        g.moveTo(cx - bw * 0.3, by); g.lineTo(cx + bw * 0.3, by);
        g.lineTo(cx, by - bw * 1.5); g.closePath(); g.fill();
        g.fillRect(cx - 1.5, by - bw * 2.1, 3, bw * 0.7);
      } else if (crown > 0.34) {                // rooftop water tank
        g.fillStyle = roofCol;
        g.fillRect(cx - bw * 0.16, by - 15, bw * 0.32, 13);
        g.beginPath();
        g.moveTo(cx - bw * 0.19, by - 15); g.lineTo(cx + bw * 0.19, by - 15);
        g.lineTo(cx, by - 23); g.closePath(); g.fill();
      }
      x += bw0 + (0.6 + dRand(i, 5) * 2.4) * U; i++;
    }
  }

  // ---- base haze + contact shadow on the near layer, then the ground skirt
  g.globalCompositeOperation = 'source-atop';
  hg = g.createLinearGradient(0, HOR - 62, 0, HOR + 6);
  hg.addColorStop(0, `rgba(${fr},${fgc},${fb},0)`);
  hg.addColorStop(1, `rgba(${fr},${fgc},${fb},0.30)`);
  g.fillStyle = hg; g.fillRect(0, 0, W, PANO_H);
  // a whisper of occlusion right where the near layer meets the street, so the
  // silhouette has a contact edge instead of sitting on the horizon like a decal
  hg = g.createLinearGradient(0, HOR - 16, 0, HOR + 4);
  hg.addColorStop(0, 'rgba(24,16,24,0)');
  hg.addColorStop(1, 'rgba(24,16,24,0.24)');
  g.fillStyle = hg; g.fillRect(0, 0, W, PANO_H);
  g.globalCompositeOperation = 'source-over';

  // The skirt has to match what the fogged plaza ground reaches at PANO_R, or
  // a bright ring appears exactly on the horizon. The ground hex is lifted
  // first because the hemi + sun render it much lighter than its raw value.
  const litGround = new THREE.Color(P.ground).lerp(new THREE.Color('#ffffff'), 0.26);
  const skirt = litGround.clone().lerp(FOG, fogF);
  const sg = g.createLinearGradient(0, HOR - 14, 0, HOR + 90);
  sg.addColorStop(0, `#${skirt.getHexString()}`);
  sg.addColorStop(1, `#${skirt.clone().lerp(litGround, 0.45).getHexString()}`);
  g.fillStyle = sg;
  g.fillRect(0, HOR - 1, W, PANO_H - HOR + 1);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- material + geometry construction ----------
function blockMaterial(def, isGhost) {
  if (isGhost) {
    // warm-gold silhouette that reads clearly against the plaza
    return new THREE.MeshBasicMaterial({
      color: 0xffc97a, transparent: true, opacity: 0.2,
      depthWrite: false, side: THREE.DoubleSide,
    });
  }
  const color = new THREE.Color(def.c);
  const seeThru = def.tex === 'archcut';
  const wet = def.shape === 'water' || def.wet;
  const mat = new THREE.MeshStandardMaterial({
    // textured blocks paint their colour into the map, so the material tints
    // white — except glass, where the block colour multiplies the map so the
    // pyramid keeps a saturated teal under this scene's very warm key light
    color: def.tex ? new THREE.Color(def.glass ? def.c : '#ffffff') : color,
    // glass stays fairly rough: at 0.1 the sun's specular blew the Louvre
    // pyramid and the Eye's capsules out to flat white, which is exactly the
    // "invisible icon" the critic called out
    roughness: def.glass ? 0.34 : wet ? 0.15 : def.metal ? 0.3 : 0.72,
    metalness: def.metal ? 0.55 : def.glass ? 0.06 : 0.05,
    transparent: !!def.glass || wet || seeThru,
    opacity: def.glass ? (def.op || 0.88) : wet ? 0.85 : 1,
    emissive: def.em ? new THREE.Color(def.em)
      : wet ? new THREE.Color('#3fc8e8')
        : def.glass ? new THREE.Color('#bfe0f5') : color.clone(),
    emissiveIntensity: 0,
    side: seeThru ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (def.tex) {
    mat.map = makeBlockTexture(def);
    if (seeThru) { mat.alphaTest = 0.45; mat.transparent = false; }
  }
  mat.userData.baseEm = def.emI !== undefined ? def.emI
    : wet ? 0.4 : def.glass ? 0.15 : def.metal ? 0.12 : 0;
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
    case 'tier':
      // truncated cone tier: bottom diameter w, top diameter d
      geo = new THREE.CylinderGeometry(Math.max(0.02, d / 2), w / 2, h, 20);
      break;
    case 'eifleg': {
      // curved lattice leg easing vertical into the platform corner
      const L = def.leg;
      const [px, py, pz] = def.p;
      const P0 = new THREE.Vector3(L.x0 - px, -py, L.z0 - pz);
      const P3 = new THREE.Vector3(L.x1 - px, L.h - py, L.z1 - pz);
      const P1 = new THREE.Vector3(
        P0.x + (P3.x - P0.x) * 0.12, -py + L.h * 0.38, P0.z + (P3.z - P0.z) * 0.12);
      const P2 = new THREE.Vector3(P3.x, -py + L.h * 0.74, P3.z);
      const curve = new THREE.CubicBezierCurve3(P0, P1, P2, P3);
      out = new THREE.Group();
      out.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, L.r, 8), mat));
      // broad foot pad
      const foot = new THREE.Mesh(new THREE.BoxGeometry(L.r * 3.2, 0.3, L.r * 3.2), mat);
      foot.position.set(P0.x, P0.y + 0.15, P0.z);
      out.add(foot);
      break;
    }
    case 'chain': {
      // suspension chain sweeping up from the anchor to tower mid-height
      const ch = def.chain;
      const [px, py] = def.p;
      const A = new THREE.Vector3(ch.x0 - px, ch.y0 - py, 0);
      const C = new THREE.Vector3(ch.x1 - px, ch.y1 - py, 0);
      const M = A.clone().add(C).multiplyScalar(0.5);
      M.y -= ch.sag;
      const curve = new THREE.QuadraticBezierCurve3(A, M, C);
      out = new THREE.Group();
      for (const zz of [ch.z, -ch.z]) {
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, ch.r, 8), mat);
        tube.position.z = zz;
        out.add(tube);
        for (let i = 1; i <= (ch.rods || 0); i++) {
          const t = i / ((ch.rods || 0) + 1);
          const pt = curve.getPoint(t);
          const hh = Math.max(0.2, (pt.y + py) - ch.deckY);
          const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, hh, 0.06), mat);
          rod.position.set(pt.x, pt.y - hh / 2, zz);
          out.add(rod);
        }
      }
      break;
    }
    case 'walkway': {
      // steel walkway: deck, white rails, suspender rods down to the road
      out = new THREE.Group();
      const railMat = isGhost ? mat : new THREE.MeshStandardMaterial({
        color: '#f4f6fa', roughness: 0.45, metalness: 0.2,
        emissive: new THREE.Color('#f4f6fa'), emissiveIntensity: 0,
      });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.6, d), mat);
      out.add(deck);
      for (const zz of [-(d / 2 - 0.06), d / 2 - 0.06]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, 0.07), railMat);
        rail.position.set(0, h * 0.75, zz);
        out.add(rail);
        for (let i = 0; i < 7; i++) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.75, 0.06), railMat);
          post.position.set(-w / 2 + 0.3 + (i / 6) * (w - 0.6), h * 0.38, zz);
          out.add(post);
        }
      }
      const wk = def.walk || {};
      for (let i = 0; i < (wk.rods || 0); i++) {
        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.07, wk.drop, 0.07), mat);
        rod.position.set(-w / 2 + 0.5 + (i / (wk.rods - 1)) * (w - 1), -h * 0.3 - wk.drop / 2, 0);
        out.add(rod);
      }
      break;
    }
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
        const rim = new THREE.MeshStandardMaterial({ color: '#a8894e', roughness: 0.4, metalness: 0.4, emissive: new THREE.Color('#d4af5a'), emissiveIntensity: 0 });
        rim.userData.baseEm = 0.15;
        const face = new THREE.MeshStandardMaterial({ map: clockFaceTex(), roughness: 0.6, emissive: new THREE.Color('#ffe9b8'), emissiveIntensity: 0 });
        face.userData.baseEm = 0.45;             // clock faces glow warm ivory
        m = new THREE.Mesh(cg, [rim, face, face]);
      }
      out.add(m);
      break;
    }
    case 'archvault': {
      // One extruded solid: a slab with a rounded-arch opening punched clean
      // through it. Extruding the hole gives the tunnel real inner walls and a
      // real barrel ceiling, so the arch carries its own shadow instead of
      // reading as a painted cutout on cardboard — and, unlike a lintel box,
      // the arch CURVE is visible head-on.
      const v = def.vault || {};
      const r = w * (v.r || 0.31);              // half the opening width
      const spring = h * (v.spring || 0.68);    // springing height off the base
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2);
      sh.lineTo(w / 2, h / 2); sh.lineTo(-w / 2, h / 2); sh.closePath();
      const hole = new THREE.Path();
      hole.moveTo(-r, -h / 2);
      hole.lineTo(-r, -h / 2 + spring);
      hole.absarc(0, -h / 2 + spring, r, Math.PI, 0, true);
      hole.lineTo(r, -h / 2);
      hole.closePath();
      sh.holes.push(hole);
      geo = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 18 });
      geo.translate(0, 0, -d / 2);
      geo.computeVertexNormals();
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
      out.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 60, c.r || 0.09, 8), mat));
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
      // 9-segment flat-shaded shafts read as fluting shade separation
      const shaftMat = isGhost ? mat : mat.clone();
      if (!isGhost) { shaftMat.flatShading = true; shaftMat.userData.baseEm = mat.userData.baseEm; }
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + (i + 0.5) * (w / n);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h * 0.8, 9), shaftMat);
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
      // A single robed figure by default; `figs: 3` makes it a sculpture group
      // (the Arc's pier reliefs). Each figure gets a flared robe, shoulders and
      // a raised arm so the silhouette reads as carved marble, not a bollard.
      out = new THREE.Group();
      const n = def.figs || 1;
      const ph = h * 0.22;
      const ped = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, ph, d * 0.98), mat);
      ped.position.y = -h / 2 + ph / 2;
      out.add(ped);
      const fh = h - ph;                          // figure height above plinth
      for (let i = 0; i < n; i++) {
        const fx = n === 1 ? 0 : (-w / 2 + (i + 0.5) * (w / n)) * 0.82;
        const sc = n === 1 ? 1 : (i === (n - 1) >> 1 ? 1 : 0.82);
        const r = (n === 1 ? w * 0.24 : (w / n) * 0.44);
        const y0 = -h / 2 + ph;
        const robe = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.72, r * 1.15, fh * 0.52 * sc, 9), mat);
        robe.position.set(fx, y0 + fh * 0.26 * sc, 0);
        const torso = new THREE.Mesh(
          new THREE.CapsuleGeometry(r * 0.66, fh * 0.24 * sc, 4, 10), mat);
        torso.position.set(fx, y0 + fh * 0.64 * sc, 0);
        const head = new THREE.Mesh(new THREE.SphereGeometry(r * 0.46, 12, 10), mat);
        head.position.set(fx, y0 + fh * 0.90 * sc, 0);
        const arm = new THREE.Mesh(
          new THREE.CapsuleGeometry(r * 0.20, fh * 0.34 * sc, 3, 8), mat);
        arm.position.set(fx + r * 0.78, y0 + fh * 0.70 * sc, d * 0.12);
        arm.rotation.z = -0.5;
        out.add(robe, torso, head, arm);
      }
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

// Real world-space extent of a block, which is not always what def.s says: a
// 'spokes' hub declares its rim diameter as WIDTH but sweeps that same diameter
// vertically, and a torus/arch laid flat by rotX sweeps it in depth. The scatter
// layout needs the true footprint or it parks a 12m wheel half off the screen.
function effSize(d) {
  let [w, h, dp] = d.s;
  const flat = Math.abs(Math.abs(d.rotX || 0) - Math.PI / 2) < 0.25;
  if (d.shape === 'spokes' || d.shape === 'torus' || d.shape === 'arch') {
    const sweep = d.shape === 'arch' && !flat ? w / 2 : w;
    if (flat) { dp = Math.max(dp, sweep); h = Math.max(d.s[2], 0.3); }
    else h = Math.max(h, sweep);
  }
  return [w, h, dp];
}

// Vertical extent [base, top] of a block in world space. Every shape is
// centred on its origin EXCEPT 'dome', which is a hemisphere whose flat face
// sits at p[1] — the same special case restingY() makes when parking one on
// the plaza. Course clustering needs this to know what rests on what.
function vExtent(d) {
  const h = effSize(d)[1];
  const base = d.shape === 'dome' ? d.p[1] : d.p[1] - h / 2;
  return [base, base + h];
}

// scattered pieces keep their final materials, pulled to ~70% saturation
function desaturate(mesh) {
  forEachMat(mesh, (m) => {
    if (!m.color) return;
    if (!m.userData.origCol) m.userData.origCol = m.color.clone();
    const o = m.userData.origCol;
    const l = (o.r + o.g + o.b) / 3;
    m.color.copy(o).lerp(new THREE.Color(l, l, l), 0.3).multiplyScalar(0.94);
  });
}
function resaturate(mesh) {
  forEachMat(mesh, (m) => { if (m.userData.origCol) m.color.copy(m.userData.origCol); });
}

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
    // Bob is driven by its own accumulator rather than by elapsed time, so the
    // urgency pass can raise the rate without the sine phase jumping.
    this.bobT = 0;

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
    // &tscale=N speeds this puzzle's own clock up N times. Review-only: a
    // headless browser driven by --virtual-time-budget only ever runs a
    // handful of animation frames, so without this the 4.3s celebration can
    // never be caught in a screenshot. Defaults to 1 in normal play.
    this.tScale = Math.max(1, Math.min(60, parseFloat(q.get('tscale')) || 1));
    // &time=N starts the clock at N seconds. Review-only: it is the only way a
    // single headless screenshot can catch the last-10-seconds urgency pass.
    const t0 = parseFloat(q.get('time'));
    if (t0 > 0) this.time = Math.min(60, t0);

    // sort blocks bottom-up (sortY lets cables etc. come after their towers)
    this.blocks = def.map((d, i) => ({ def: d, idx: i }))
      .sort((a, b) => (a.def.sortY ?? a.def.p[1]) - (b.def.sortY ?? b.def.p[1]));

    // ---- build COURSES (layers) -------------------------------------------
    // A monument is built bottom-up, but a single visual course is rarely at
    // one exact height: the Eiffel's four legs sit at y=3.0 and the arches
    // tucked between them at y=3.1; Big Ben's four clock faces share the belfry
    // block's y. Forcing one strict order there feels arbitrary and punishing.
    // So blocks are clustered into layers by their sort height (single-linkage,
    // LAYER_TOL apart) — any order WITHIN a layer, strict bottom-up ACROSS
    // layers. sortY overrides still work: they push cables/chains/walkways into
    // a later layer than the towers they span.
    // Height proximity alone is NOT enough to prove two blocks share a course.
    // A short ring and the tall dome resting on it have centres close together
    // precisely BECAUSE the dome is tall — on the Pantheon the ring at y=8.50
    // and the dome at y=8.90 are only 0.40 apart, so they clustered together
    // and the dome became placeable before its own support. Single-linkage
    // made it worse: a chain of blocks each within LAYER_TOL of the last can
    // merge into one course spanning any height.
    // So a course ALSO breaks whenever the next block's base has cleared the
    // top of everything already in that course — i.e. it rests on the course
    // rather than sitting alongside it. Blocks that genuinely interleave
    // (Eiffel arches tucked between the legs, Big Ben's clock faces set into
    // the belfry) still overlap the course band and stay interchangeable.
    // A block carrying an explicit sortY has already been placed in the order
    // its author wanted, and its real height deliberately disagrees with that
    // key — the Eye's ten capsules all sort at 9.5 but physically ring the
    // wheel from y=0.85 to y=10.47. Splitting those by physical support would
    // scatter one interchangeable set across three courses, so sortY blocks
    // are exempt from the support rule. They still raise the course ceiling,
    // so anything genuinely resting on them is pushed to a later course.
    const LAYER_TOL = 0.6;
    const SUPPORT_EPS = 0.25;
    let layer = 0, prevY = null, courseTop = -Infinity;
    for (const entry of this.blocks) {
      const y = entry.def.sortY ?? entry.def.p[1];
      const [base, top] = vExtent(entry.def);
      const authored = entry.def.sortY !== undefined;
      const gapSplit = prevY !== null && y - prevY > LAYER_TOL;
      const supportSplit = !authored && prevY !== null && base >= courseTop - SUPPORT_EPS;
      if (gapSplit || supportSplit) { layer++; courseTop = -Infinity; }
      entry.layer = layer;
      courseTop = Math.max(courseTop, top);
      prevY = y;
    }
    this.layerCount = layer + 1;

    // ---- scatter layout ----------------------------------------------------
    // Every loose piece has to stay inside the frustum of a PORTRAIT phone,
    // where the horizontal half-angle is only ~15.5° and the camera can only
    // retreat so far before the monument becomes an unreadable speck. Past a
    // radius of ~14 world units pieces fall off the sides of the frame and
    // become unreachable, so this packs them dense rather than wide: a piece
    // you can see and tap beats a piece with elbow room you can never reach.
    const SCATTER_R = 13.2;                       // hard radial cap (<14)
    const XBUD = 11.0;                            // budget for |x| + half the piece's screen width
    let xExt = 0, zExt = 0;
    for (const d of def) {
      xExt = Math.max(xExt, Math.abs(d.p[0]) + d.s[0] / 2);
      zExt = Math.max(zExt, Math.abs(d.p[2]) + d.s[2] / 2);
    }
    // Footprint clearance in a given direction, so nothing is parked ON the
    // monument: the Colosseum needs 9m of elbow room all round, while the
    // bridges are 18m wide but only 3m deep and take pieces close in front.
    // `off` is measured off the ±x axis; positive is the camera side.
    const clearAt = (off, sw) => {
      const ca = Math.abs(Math.cos(off)) / Math.max(2, xExt);
      const sa = Math.abs(Math.sin(off)) / Math.max(2, zExt);
      return Math.min(11.6, 1 / Math.sqrt(ca * ca + sa * sa) + 1.5 + sw * 0.2);
    };
    // A monument that spans wide in x (the two bridges) would swallow anything
    // parked on the ±x wings, so its fans swing round to the front and back.
    const wide = xExt > 12;
    // Angular slots, radians off the ±x axis; positive is the camera side.
    // The footprint clearance below pins most pieces to a similar radius, so
    // the spread has to come from ANGLE — pieces are seated round the plaza
    // first and only stack into a second/third band once the arc is full.
    const OFFS = wide ? [-1.34, -1.08, -0.82, 0.54, 0.80, 1.06]
      : [-0.90, -0.60, -0.30, 0.02, 0.32, 0.62];
    const RBAND = [9.0, 11.0, 12.9];

    // Bulky pieces are laid out first and land in the BACK slots, where the
    // extra distance shrinks them; the small pieces fill the camera-side slots.
    const bulkOf = (d) => { const e = effSize(d); return Math.max(e[0], e[1], e[2]); };
    const loose = this.blocks
      .map((e, order) => ({ e, order }))
      .filter((x) => x.order >= preplaced)
      .sort((a, b) => bulkOf(b.e.def) - bulkOf(a.e.def));
    const layout = new Map();
    let back = 0, tallN = 0;
    loose.forEach((x, k) => {
      const side = k % 2 ? 1 : -1;
      const rank = (k / 2) | 0;
      const [w, hh, dp] = effSize(x.e.def);
      // Tall pieces (the Eye's 9m A-frame legs) go in the far slots: near the
      // camera they overshoot the TOP of a portrait frame, not the sides.
      const tall = hh > 7.5;
      const slot = tall ? tallN % 2 : rank % OFFS.length;
      const band = tall ? ((tallN >> 1) % 2) + 1 : Math.floor(rank / OFFS.length) % 3;
      if (tall) tallN++;
      // Oversized pieces — a whole Louvre wing, the Eye's 13m rim — can't fit
      // on a wing without hanging off the side of a portrait frame. They go
      // straight to the back of the plaza instead: |x| stays small there, and
      // the extra distance shrinks them without hiding them behind the (still
      // half-built) monument.
      if (Math.min(w, dp) > 8 || Math.max(w, dp) > 15 || hh > 9) {
        const yaw = (dp < w ? 1.52 : 0.05) * (back % 2 ? 1 : -1);
        const a = -Math.PI / 2 + (back % 2 ? 0.36 : -0.36) + (Math.floor(back / 2) % 2 ? 0.13 : -0.13);
        layout.set(x.order, { a, r: 10.8 + (back % 3) * 0.9, yaw });
        back++;
        return;
      }
      // Wide pieces are turned toward the camera so they stop spearing out
      // past the frame edge — but never fully edge-on, or a Louvre wing would
      // read as a blank sliver instead of a wing you can recognise.
      const yaw = (w > 9 ? 1.30 : w > 5 ? 0.95 : 0.42) * (side > 0 ? -1 : 1)
        + (dRand(k, 13) - 0.5) * 0.34;
      const sw = Math.abs(Math.cos(yaw)) * w + Math.abs(Math.sin(yaw)) * dp;
      let off = OFFS[slot] + band * 0.06 + dRand(k, 11) * 0.05;
      let r = Math.min(SCATTER_R,
        Math.max(RBAND[band] + dRand(k, 12) * 0.5, clearAt(off, sw)));
      // If standing that far out would push the piece past the side of the
      // frame, swing it round toward the front or back rather than pulling it
      // in on top of the monument — |x| shrinks fast as the angle opens up.
      const capCos = Math.max(0.05, Math.min(1, (XBUD - sw / 2) / r));
      const tMin = Math.acos(capCos);
      if (Math.abs(off) < tMin) {
        // Sideways is out, so it goes front or back. Back is the safe side:
        // in landscape the camera sits much closer, and a chunky piece parked
        // near the player overflows the BOTTOM of the frame. Only small pieces
        // are allowed to swing forward, and never onto the centre sightline.
        const goBack = off < 0 || sw > 6 || tMin > 1.1;
        off = goBack ? -Math.min(1.45, tMin + 0.05) : tMin + 0.05;
        r = Math.min(SCATTER_R, Math.max(r, clearAt(off, sw)));
      }
      // last resort: never let it leave the frame, even if that means crowding
      r = Math.min(r, (XBUD - sw / 2) / Math.max(0.05, Math.abs(Math.cos(off))));
      // and never let a big piece camp in the player's lap
      if (Math.sin(off) * r > 9.4 - sw * 0.3) off = -off;
      const a = side > 0 ? off : Math.PI - off;
      layout.set(x.order, { a, r, yaw });
    });

    this.items = this.blocks.map((entry, order) => {
      const mesh = makeBlockMesh(entry.def);
      const ghost = makeBlockMesh(entry.def, true);
      placeAtTarget(ghost, entry.def);
      this.group.add(ghost);

      const item = {
        def: entry.def, mesh, ghost, order, layer: entry.layer,
        placed: order < preplaced,
        bobPhase: Math.random() * Math.PI * 2,
      };

      if (item.placed) {
        placeAtTarget(mesh, entry.def);
        ghost.visible = false;
        this.placedCount++;
        this.collectShimmer(mesh);
      } else {
        // Art-directed scatter (positions worked out in the layout pass above):
        // two wings either side of the plaza, nothing left standing on the
        // sightline between the player and the build site.
        const L = layout.get(order);
        mesh.position.set(Math.cos(L.a) * L.r, restingY(entry.def), Math.sin(L.a) * L.r);
        mesh.rotation.y = L.yaw;
        item.rotY0 = L.yaw;
        desaturate(mesh);
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
    this.monSpread = spread;
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

    // city-specific painted skyline panorama
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.sharedGeos = [boxGeo];
    this.buildSkyline(g, P, cityId);

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
    this.lampAnchors = anchors;                  // firework launch points

    // string lights along the bunting catenaries — pulse during celebration
    this.stringMats = [];
    const bulbGeo = new THREE.SphereGeometry(0.11, 8, 6);
    this.sharedGeos.push(bulbGeo);
    const bulbCols = ['#ffd98a', '#ffb2c8', '#a8d8ff'];
    for (let ci = 0; ci < 3; ci++) {
      const m = new THREE.MeshStandardMaterial({
        color: bulbCols[ci], emissive: new THREE.Color(bulbCols[ci]), emissiveIntensity: 1.0,
      });
      this.stringMats.push(m);
    }
    for (let i = 0; i < anchors.length; i++) {
      const a0 = anchors[i], a1 = anchors[(i + 1) % anchors.length];
      for (let k = 0; k < 6; k++) {
        const t = 0.14 + (k / 5) * 0.72;
        const bulb = new THREE.Mesh(bulbGeo, this.stringMats[(i * 6 + k) % 3]);
        bulb.position.set(
          a0.x + (a1.x - a0.x) * t,
          a0.y - Math.sin(t * Math.PI) * 0.9 - 0.62,
          a0.z + (a1.z - a0.z) * t,
        );
        g.add(bulb);
      }
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

    // warm celebratory key light over the build site. Kept on the instance so
    // the last-10-seconds urgency pass can dim it and pull it towards red —
    // that reads as the whole plaza tightening without touching block colours
    // (which would collide with the desaturate/resaturate scatter machinery).
    const warm = new THREE.PointLight(0xffcf9a, 240, 90, 2);
    warm.position.set(0, 13, 11);
    g.add(warm);
    this.warmLight = warm;
    this.warmBase = new THREE.Color(0xffcf9a);
    this.warmInt = 240;
    this.urgentCol = new THREE.Color(0xff6a4a);
  }

  // ---------- per-city skyline backdrop ----------
  buildSkyline(g, P, cityId) {
    // The panorama is drawn unfogged and bakes its own haze instead. Real fog
    // at 130 units is ~70% opaque, which flattened all four cities to the same
    // beige; baking it lets each keep its identity AND stay atmospheric.
    const fog = this.scene.fog;
    const fogHex = fog ? `#${fog.color.getHexString()}` : '#ffd0a0';
    const dens = fog ? fog.density : 0.009;
    const fogF = 1 - Math.exp(-Math.pow(dens * PANO_R, 2));
    const geo = new THREE.CylinderGeometry(PANO_R, PANO_R, PANO_HT, 96, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: panoTex(cityId, P, fogHex, fogF),
      transparent: true, side: THREE.BackSide, fog: false, depthWrite: false,
    });
    const cyl = new THREE.Mesh(geo, mat);
    // seat the painted horizon line exactly on y=0, where the fogged ground
    // disc reaches the cylinder — that join is what stops it reading as float
    cyl.position.y = PANO_HT / 2 - (PANO_H - PANO_HOR) / PANO_U;
    cyl.renderOrder = -5;
    g.add(cyl);
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

  // lowest course that still has a piece waiting to be picked; a piece already
  // in flight counts as committed, so the next course unlocks immediately
  currentLayer() {
    let lo = Infinity;
    for (const it of this.items) {
      if (it.placed || this.flying.includes(it)) continue;
      if (it.layer < lo) lo = it.layer;
    }
    return lo;
  }

  // any order within a course, strict bottom-up across courses
  pickable(item) {
    if (item.placed || this.flying.includes(item)) return false;
    return item.layer === this.currentLayer();
  }

  tryPick(nx, ny) {
    if (this.done || this.failed) return;
    this.raycaster.setFromCamera({ x: nx, y: ny }, this.camera);
    const meshes = this.items.filter((it) => !it.placed && !this.flying.includes(it)).map((it) => it.mesh);
    const hits = this.raycaster.intersectObjects(meshes, true);
    if (!hits.length) return;

    // Walk the whole ray and take the first PICKABLE piece, rather than
    // whatever happens to be nearest.
    //
    // Scattering guards against the frame edges and the monument footprint,
    // but never against other loose pieces, so a slab from an upper course can
    // sit squarely in front of a small piece from the course below. Taking
    // hits[0] made that piece untappable through every one of its pixels --
    // and because pickable() is strict bottom-up, the only thing that could
    // uncover it was the very piece you are not allowed to touch yet. That is
    // a soft-lock, not an annoyance: the camera does not orbit during play and
    // nothing reshuffles, so the board simply runs out the clock. Simulating
    // every monument to completion found it on the Chrysler Building and the
    // Trevi Fountain, under both greedy and optimal play.
    //
    // Reaching past a piece the player can see is safe here precisely because
    // it is unpickable: tapping it could never have done anything but shake.
    let item = null, front = null;
    for (const hit of hits) {
      let obj = hit.object;
      while (obj && !meshes.includes(obj)) obj = obj.parent;
      const cand = obj && this.items.find((it) => it.mesh === obj);
      if (!cand) continue;
      if (!front) front = cand;
      if (this.pickable(cand)) { item = cand; break; }
    }
    if (!item) {
      // nothing pickable anywhere along the ray -- keep the "not this course
      // yet" feedback on the piece the finger actually landed on
      if (front) { sfx.tick(); this.shakeEffect(front.mesh); }
      return;
    }
    this.flying.push(item);
    item.t = 0;
    item.from = item.mesh.position.clone();
    item.fromRot = item.mesh.rotation.clone();
    resaturate(item.mesh);                       // full color as it flies home
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

  // confetti: mode 'top' erupts from the monument crown, 'stage' rains
  // across the whole plaza for the hero moment
  confettiBurst(mode = 'top') {
    const stage = mode === 'stage';
    const N = stage ? 420 : 260;
    const geo = new THREE.BufferGeometry();
    const p = new Float32Array(N * 3), col = new Float32Array(N * 3), v = [];
    const C = new THREE.Color();
    for (let i = 0; i < N; i++) {
      if (stage) {
        const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 17;
        p[i * 3] = Math.cos(a) * r;
        p[i * 3 + 1] = this.monTop * 0.55 + 4 + Math.random() * (this.monTop * 0.6 + 4);
        p[i * 3 + 2] = Math.sin(a) * r;
        v.push((Math.random() - 0.5) * 2.4, -0.5 - Math.random() * 1.5, (Math.random() - 0.5) * 2.4);
      } else {
        p[i * 3] = (Math.random() - 0.5) * 3;
        p[i * 3 + 1] = this.monTop + 1.5;
        p[i * 3 + 2] = (Math.random() - 0.5) * 3;
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 7;
        v.push(Math.cos(a) * sp * (0.4 + Math.random()), 5 + Math.random() * 7, Math.sin(a) * sp * (0.4 + Math.random()));
      }
      C.set(FESTIVE[i % FESTIVE.length]);
      col[i * 3] = C.r; col[i * 3 + 1] = C.g; col[i * 3 + 2] = C.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.34, vertexColors: true, transparent: true, opacity: 1, depthWrite: false,
    }));
    this.group.add(pts);
    const life = stage ? 5.2 : 4;
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt;
        const arr = geo.attributes.position.array;
        const grav = stage ? 3.2 : 11;
        for (let i = 0; i < N; i++) {
          v[i * 3 + 1] = Math.max(v[i * 3 + 1] - grav * dt, stage ? -2.6 : -12);
          v[i * 3] *= (1 - dt * 0.8); v[i * 3 + 2] *= (1 - dt * 0.8);
          arr[i * 3] += v[i * 3] * dt + Math.sin(t * 9 + i) * dt * 1.6;
          arr[i * 3 + 1] += v[i * 3 + 1] * dt;
          arr[i * 3 + 2] += v[i * 3 + 2] * dt + Math.cos(t * 8 + i * 1.7) * dt * 1.6;
          if (arr[i * 3 + 1] < 0.1) { arr[i * 3 + 1] = 0.1; v[i * 3 + 1] = 0; }
        }
        geo.attributes.position.needsUpdate = true;
        if (t > life - 0.8) pts.material.opacity = Math.max(0, 1 - (t - (life - 0.8)) / 0.8);
        if (t >= life) { this.group.remove(pts); geo.dispose(); pts.material.dispose(); return false; }
        return true;
      },
    });
  }

  // firework: rocket streaks up from a lamp post, bursts into a sphere
  fireworkRocket(from, color) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([from.x, from.y, from.z]), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.55, map: softDotTex(), color: 0xfff2cc, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.group.add(pts);
    const apex = new THREE.Vector3(
      from.x * (0.3 + Math.random() * 0.3),
      this.monTop * 0.7 + 4 + Math.random() * (this.monTop * 0.5),
      from.z * (0.3 + Math.random() * 0.3),
    );
    const dur = 0.55 + Math.random() * 0.25;
    let t = 0;
    this.effects.push({
      update: (dt) => {
        t += dt;
        const k = Math.min(1, t / dur);
        const e = k * (2 - k);                   // ease-out climb
        const arr = geo.attributes.position.array;
        arr[0] = from.x + (apex.x - from.x) * e;
        arr[1] = from.y + (apex.y - from.y) * e;
        arr[2] = from.z + (apex.z - from.z) * e;
        geo.attributes.position.needsUpdate = true;
        if (k >= 1) {
          this.group.remove(pts); geo.dispose(); pts.material.dispose();
          this.sparkleBurst(apex, 42, 8.5, color);
          this.ringPulse(new THREE.Vector3(apex.x, 0.08, apex.z), color, 1.6);
          return false;
        }
        return true;
      },
    });
  }

  // ---------- per-frame ----------
  update(dt) {
    dt *= this.tScale;                             // 1 unless the review harness asks
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
          resaturate(it.mesh);
        }
        this.autoT = 0.3;
      }
    }

    // build-site ring: gold normally, urgent red pulse under 10s.
    // Under 10s the plaza also tightens: the warm key light dims and swings
    // towards red, which drains the scene's warmth without ever going harsh,
    // and the loose blocks bob faster.
    const low = !this.done && this.time <= 10;
    if (low) {
      const p = 0.5 + Math.sin(T * 9) * 0.5;
      this.ring.material.color.setHex(0xff5544);
      this.ring.material.opacity = 0.35 + p * 0.45;
      this.ring.scale.setScalar(1 + p * 0.035);
      if (this.warmLight) {
        // ease in over the first second so 10s doesn't arrive as a hard cut
        const ramp = Math.min(1, (10 - this.time) / 1);
        this.warmLight.intensity = this.warmInt * (1 - ramp * (0.42 + 0.14 * p));
        this.warmLight.color.copy(this.warmBase)
          .lerp(this.urgentCol, ramp * (0.46 + 0.16 * p));
      }
    } else {
      this.ring.material.color.setHex(0xffd166);
      this.ring.material.opacity = 0.32 + Math.sin(T * 2.6) * 0.14;
      this.ring.scale.setScalar(1);
      if (this.warmLight) {
        this.warmLight.intensity = this.warmInt;
        this.warmLight.color.copy(this.warmBase);
      }
    }
    // bob accelerates as the clock runs out (phase-continuous, see bobT)
    this.bobT += dt * (low ? 4.2 : 2.4);

    // drifting dust
    const dp = this.dust.geometry.attributes.position.array;
    for (let i = 1; i < dp.length; i += 3) {
      dp[i] += dt * 0.35;
      if (dp[i] > 14) dp[i] = 0;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;

    // shimmer on placed water / chrome
    for (const m of this.shimmer) m.emissiveIntensity = m.userData.baseEm * (0.8 + Math.sin(T * 3 + m.id) * 0.35);

    // pickable highlight + bob; ghost guidance pulse.
    // The WHOLE current course glows and bobs, so the player can see every
    // legal choice at once rather than guessing which four are unlocked.
    const layerNow = this.currentLayer();
    const pending = this.items.filter((it) => !it.placed && !this.flying.includes(it));
    for (const it of pending) {
      const pickNow = it.layer === layerNow;
      const target = pickNow ? 0.6 : 0;
      forEachMat(it.mesh, (m) => {
        const base = m.userData.baseEm || 0;
        m.emissiveIntensity += (Math.max(base, target) - m.emissiveIntensity) * dt * 6;
      });
      if (pickNow) {
        it.mesh.position.y = restingY(it.def) +
          Math.abs(Math.sin(this.bobT + it.bobPhase)) * 0.3;
        // sway around the parked yaw rather than spinning freely: a long piece
        // that kept turning would eventually swing out past the frame edge
        it.mesh.rotation.y = (it.rotY0 || 0) + Math.sin(T * 0.9 + it.bobPhase) * 0.26;
      }
      // Ghost hint: warm-gold silhouette; the whole live course breathes, the
      // courses still to come stay a faint hint of what is coming.
      // Ghosts are depthWrite:false, so overlapping ones composite on top of
      // each other — a course with ten pieces (the Eye's rim) at the old 0.09
      // stacked up brighter than a single-piece live course at 0.26 and stole
      // the eye. Distant courses are therefore pushed well back, and the live
      // course pushed up, so "what to build next" always wins on contrast.
      it.ghost.userData.blockMat.opacity = pickNow
        ? 0.30 + Math.sin(T * 5 + it.bobPhase) * 0.09
        : it.layer === layerNow + 1 ? 0.13 : 0.055;
    }

    // built pieces that rotate (the Eye's wheel)
    for (const it of this.items) {
      if (it.placed && it.def.spin) it.mesh.rotation.z -= it.def.spin * dt;
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

    // gentle ambient twinkle on the string lights — but they go dull and
    // restless in the last 10 seconds, so the party visibly loses its nerve
    if (!this.done && this.stringMats) {
      const lampBase = low ? 0.3 : 0.9;
      const lampAmp = low ? 0.12 : 0.2;
      const lampRate = low ? 6.5 : 2.2;
      for (let i = 0; i < this.stringMats.length; i++) {
        this.stringMats[i].emissiveIntensity =
          lampBase + Math.sin(T * lampRate + i * 2.1) * lampAmp;
      }
    }

    // ---------- celebration: the un-dimmed hero moment ----------
    // main.js holds the win modal for ~4.3s; everything below plays out in
    // that window — orbit pull-back, glow-up, fireworks, stage confetti.
    if (this.done) {
      if (this.celebT < 0) {
        this.celebT = 0;
        this.camFrom = this.camera.position.clone();
        this.celebA0 = Math.atan2(this.camFrom.x, this.camFrom.z);
        this.celebR0 = Math.hypot(this.camFrom.x, this.camFrom.z);
        this.nextRocket = 0.15;
        this.rocketIdx = 0;
        this.confettiBurst('top');
        this.confettiBurst('stage');
        this.sparkleBurst(new THREE.Vector3(0, this.monTop * 0.6, 0), 30, 7, 0xffd166);
        this.ringPulse(new THREE.Vector3(0, 0.08, 0), 0xffe08a, 2.4);
      }
      this.celebT += dt;
      const ct = this.celebT;

      // fireworks launched from the lamp posts, staggered around the ring
      if (ct < 3.7 && ct > this.nextRocket && this.lampAnchors) {
        const lamp = this.lampAnchors[(this.rocketIdx * 3) % this.lampAnchors.length];
        const cols = [0xffd166, 0x8fd0ff, 0xffa8c8, 0x9fe8a8, 0xffb26e];
        this.fireworkRocket(lamp, cols[this.rocketIdx % cols.length]);
        this.rocketIdx++;
        this.nextRocket = ct + 0.38 + Math.random() * 0.14;
      }
      // extra stage confetti waves keep the air full
      if (!this.fx2 && ct > 1.2) { this.fx2 = 1; this.confettiBurst('stage'); }
      if (!this.fx3 && ct > 2.5) { this.fx3 = 1; this.confettiBurst('stage'); }

      // monument glow-up: windows, crowns, oculus and pods flare warm,
      // blocks with a dedicated glow hue (def.em) flare hardest
      const ramp = Math.min(1, ct / 0.7);
      const glow = ramp * (0.5 + 0.14 * Math.sin(ct * 4.2));
      for (const it of this.items) {
        const boost = it.def.em ? 1.5 : 1;
        forEachMat(it.mesh, (m) => {
          m.emissiveIntensity = (m.userData.baseEm || 0) + glow * boost;
        });
      }
      // string lights pulse to the party
      if (this.stringMats) {
        for (let i = 0; i < this.stringMats.length; i++) {
          this.stringMats[i].emissiveIntensity = 1.6 + Math.sin(ct * 7 + i * 2.1) * 1.1;
        }
      }

      // camera: slow pull-back orbit around the glowing monument
      // (main.js releases the camera once state leaves 'puzzle')
      const k = Math.min(1, ct / 3.9);
      const ease = k * k * (3 - 2 * k);
      const rT = Math.max(20, this.monTop * 1.35, this.monSpread * 1.9);
      const ang = this.celebA0 + ct * 0.26;
      const rad = this.celebR0 + (rT - this.celebR0) * ease;
      const hgt = this.camFrom.y + (this.monTop * 0.62 + 5 - this.camFrom.y) * ease;
      this.camera.position.set(Math.sin(ang) * rad, hgt, Math.cos(ang) * rad);
      this.camera.lookAt(0, this.monTop * 0.42, 0);
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
