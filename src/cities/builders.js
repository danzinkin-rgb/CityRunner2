import * as THREE from '../../vendor/three.module.js';
import { canvasTexture } from '../core/engine.js';

// ---------- shared texture cache (per street) ----------
const cache = new Map();
// Every geometry that is reused across spawns lands here. The track recycles a
// chunk every couple of seconds and disposes what it owns; without this set it
// would also dispose the shared geometries, forcing a GPU re-upload each time.
export const SHARED_GEO = new Set();
function cached(key, make) {
  if (!cache.has(key)) {
    const v = make();
    if (v && v.isBufferGeometry) SHARED_GEO.add(v);
    cache.set(key, v);
  }
  return cache.get(key);
}
const sKey = (t) => t.streetKey || t.id;

// ---------- shared geometries (reused across every spawn) ----------
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const poleGeo = new THREE.CylinderGeometry(0.07, 0.1, 4.6, 8);
const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
const bulbGeo = new THREE.SphereGeometry(0.09, 8, 6);
const ballGeo = new THREE.SphereGeometry(1, 10, 8);
const coneGeo = new THREE.ConeGeometry(1, 1, 10);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
for (const gg of [boxGeo, poleGeo, wheelGeo, bulbGeo, ballGeo, coneGeo, cylGeo]) SHARED_GEO.add(gg);

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
// mix a hex number color toward a css color, return css string
function mixc(a, b, f) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  ca.lerp(cb, f);
  return '#' + ca.getHexString();
}

// ---------- facade texture ----------
// Per-street styled facade: cornice, window grid with city detailing, and a
// street-specific ground floor (theatre, flagship, neon, arcade, hotel...).
export function facadeTexture(theme, baseColor, floors = 10, cols = 6, variant = 0) {
  return cached(`fac:${sKey(theme)}:${baseColor}:${floors}:${cols}:${variant}`, () =>
    canvasTexture(256, 512, (g) => {
      const W = 256, H = 512;
      const style = theme.facade || 'shops';
      g.fillStyle = baseColor; g.fillRect(0, 0, W, H);

      // gentle vertical shading for roundness
      const sh = g.createLinearGradient(0, 0, W, 0);
      sh.addColorStop(0, 'rgba(0,0,0,.12)');
      sh.addColorStop(0.5, 'rgba(255,255,255,.08)');
      sh.addColorStop(1, 'rgba(0,0,0,.14)');
      g.fillStyle = sh; g.fillRect(0, 0, W, H);

      // brick coursing for brick cities
      if (theme.id === 'london' || (theme.id === 'nyc' && variant % 2 === 0 && style !== 'flagship')) {
        g.fillStyle = 'rgba(0,0,0,.06)';
        for (let y = 0; y < H; y += 7) g.fillRect(0, y, W, 1);
        g.fillStyle = 'rgba(255,255,255,.04)';
        for (let y = 3; y < H; y += 14) g.fillRect(0, y, W, 1);
      }
      // rusticated stone joints for stone styles
      if (style === 'flagship' || style === 'arcade' || style === 'hotel' || style === 'baroque' || style === 'deptstore') {
        g.fillStyle = 'rgba(0,0,0,.07)';
        for (let y = 0; y < H; y += 26) g.fillRect(0, y, W, 2);
      }

      const CORNICE = 16;
      const SHOP_H = Math.max(46, Math.min(110, ((512 - CORNICE) / (floors + 1.6)) * 1.6));
      const bodyTop = CORNICE + 4;
      const bodyH = H - SHOP_H - bodyTop;
      const wh = bodyH / floors, ww = W / cols;

      // --- windows ---
      for (let f = 0; f < floors; f++) {
        const rowY = bodyTop + f * wh;
        g.fillStyle = 'rgba(0,0,0,.12)';
        g.fillRect(0, rowY + wh - 2, W, 2);

        // Paris: continuous wrought-iron balcony line under the windows
        if (theme.id === 'paris' && f > 0 && style !== 'village') {
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
          const lit = Math.random() < (theme.lit ?? 0.16);

          // Rome: shutters flanking a smaller window
          if (theme.id === 'rome') {
            g.fillStyle = style === 'ochre' ? 'rgba(74,88,60,.95)' : 'rgba(78,98,72,.95)';
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
          g.strokeStyle = 'rgba(30,34,44,.55)'; g.lineWidth = 2;
          g.strokeRect(x, y, w, h);
          g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();

          if (theme.id === 'london') {
            g.fillStyle = theme.trim || '#f0ecdc';
            g.fillRect(x - 5, y + h + 2, w + 10, 4);
          }
          if (theme.id === 'nyc' && style !== 'flagship' && style !== 'neon' && Math.random() < 0.14) {
            g.fillStyle = '#b9bec6';
            g.fillRect(x + w * 0.3, y + h - 7, w * 0.4, 8);
            g.strokeRect(x + w * 0.3, y + h - 7, w * 0.4, 8);
          }
        }
      }

      // --- style body overlays ---
      if (style === 'neon') paintNeonBody(g, W, H, bodyTop, bodyH, theme);
      if (style === 'village') paintIvy(g, W, H, bodyTop, bodyH);
      if (style === 'flagship') {
        // vertical luxury pennant flags between upper windows
        const cols2 = ['#7a1f36', '#1a2a52', '#14342c'];
        for (let i = 0; i < 2; i++) {
          const fx = W * (0.25 + i * 0.5) - 8;
          g.fillStyle = cols2[(variant + i) % 3];
          g.fillRect(fx, bodyTop + 26, 16, 58);
          g.beginPath(); g.moveTo(fx, bodyTop + 84); g.lineTo(fx + 8, bodyTop + 94); g.lineTo(fx + 16, bodyTop + 84); g.fill();
          g.fillStyle = 'rgba(232,200,120,.95)';
          g.fillRect(fx + 4, bodyTop + 36, 8, 8);
          g.fillStyle = 'rgba(0,0,0,.3)';
          g.fillRect(fx - 2, bodyTop + 24, 20, 3);
        }
      }

      // --- cornice ---
      g.fillStyle = theme.trim || '#e8e0cc';
      g.fillRect(0, 0, W, CORNICE);
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.fillRect(0, CORNICE, W, 3);
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(0, 2, W, 2);
      g.fillStyle = 'rgba(0,0,0,.18)';
      for (let x = 4; x < W; x += 14) g.fillRect(x, CORNICE - 5, 7, 5);

      // --- ground floor by street style ---
      const shopY = H - SHOP_H;
      const G = { g, W, H, shopY, SHOP_H, theme, variant };
      if (style === 'theatre') paintTheatreGround(G);
      else if (style === 'flagship') paintFlagshipGround(G);
      else if (style === 'neon') paintNeonGround(G);
      else if (style === 'showroom') paintShowroomGround(G);
      else if (style === 'arcade') paintArcadeGround(G);
      else if (style === 'village') paintVillageGround(G);
      else if (style === 'deptstore') paintDeptstoreGround(G);
      else if (style === 'ochre') paintOchreGround(G);
      else if (style === 'hotel') paintHotelGround(G);
      else if (style === 'baroque') paintBaroqueGround(G);
      else paintDefaultShops(G);

      g.fillStyle = 'rgba(0,0,0,.3)';
      g.fillRect(0, H - 4, W, 4);
    })
  );
}

// ----- ground floor painters -----
const BRANDS = {
  lux: ['MAISON LUMIÈRE', 'ASTOR & SONS', 'LA PERLE', 'VERRE & OR', 'ÉCLAT'],
  dept: ['ASTOR & SONS', 'GRAND STORES', 'MARLOW & CO', 'WHITFIELD'],
  hotel: ['GRAND AURORA', 'HOTEL SPLENDIDO', 'PALAZZO STELLA', 'HOTEL VITTORIA'],
  cafe: ['CAFFÈ AURORA', 'CAFÉ RIVE', 'BISTRO LUNE', 'TRATTORIA SOLE'],
  show: ['STARDUST', 'MOONGLOW', 'RUNAWAY!', 'CITY LIGHTS'],
};
const pickR = (a) => a[(Math.random() * a.length) | 0];

function paintDefaultShops({ g, W, H, shopY, SHOP_H, theme, variant }) {
  const signH = Math.round(SHOP_H * 0.26);
  const awnH = Math.round(SHOP_H * 0.15);
  const shops = theme.storefront || ['#c8102e', '#2e8fd8'];
  const nShops = 2 + (variant % 2);
  const shopW = W / nShops;
  for (let s = 0; s < nShops; s++) {
    const sx = s * shopW;
    const col = shops[(Math.random() * shops.length) | 0];
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(sx, shopY, shopW, SHOP_H);
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
    if (Math.random() < 0.65) {
      for (let ax = sx + 4; ax < sx + shopW - 4; ax += 12) {
        g.fillStyle = (ax / 12 | 0) % 2 ? col : '#f4f0e4';
        g.fillRect(ax, shopY + 4 + signH, Math.min(12, sx + shopW - 4 - ax), awnH);
      }
      g.fillStyle = 'rgba(0,0,0,.25)';
      g.fillRect(sx + 4, shopY + 4 + signH + awnH - 2, shopW - 8, 3);
    }
    const gy = shopY + 6 + signH + awnH;
    const glassGrad = g.createLinearGradient(0, gy, 0, H - 6);
    glassGrad.addColorStop(0, '#ffe9b0');
    glassGrad.addColorStop(1, '#e8b25c');
    g.fillStyle = glassGrad;
    g.fillRect(sx + 6, gy, shopW - 12, H - 8 - gy);
    g.strokeStyle = 'rgba(40,36,30,.7)'; g.lineWidth = 3;
    g.strokeRect(sx + 6, gy, shopW - 12, H - 8 - gy);
    g.beginPath(); g.moveTo(sx + shopW / 2, gy); g.lineTo(sx + shopW / 2, H - 8); g.stroke();
    const sil = Math.min(30, SHOP_H * 0.4);
    g.fillStyle = 'rgba(120,70,30,.45)';
    g.fillRect(sx + 12, H - 8 - sil, 14, sil);
    g.fillRect(sx + shopW - 30, H - 8 - sil * 1.15, 12, sil * 1.15);
  }
}

// Broadway/Piccadilly: dark glossy theatre front, gilded doors, playbills.
function paintTheatreGround({ g, W, H, shopY, SHOP_H }) {
  g.fillStyle = '#17141c'; g.fillRect(0, shopY, W, SHOP_H);
  g.fillStyle = '#d4a437'; g.fillRect(0, shopY, W, 5);           // gold rail
  g.fillStyle = 'rgba(212,164,55,.6)'; g.fillRect(0, shopY + SHOP_H * 0.5, W, 2);
  // three double doors with warm glow slits
  for (let i = 0; i < 3; i++) {
    const dx = W * (0.14 + i * 0.3), dw = W * 0.14;
    g.fillStyle = '#3a2a1a'; g.fillRect(dx, shopY + SHOP_H * 0.36, dw, SHOP_H * 0.64);
    g.fillStyle = '#ffd98a';
    g.fillRect(dx + dw * 0.46, shopY + SHOP_H * 0.4, dw * 0.08, SHOP_H * 0.56);
    g.fillStyle = '#d4a437';
    g.strokeStyle = '#d4a437'; g.lineWidth = 2;
    g.strokeRect(dx, shopY + SHOP_H * 0.36, dw, SHOP_H * 0.64);
  }
  // framed playbill posters between doors
  for (let i = 0; i < 2; i++) {
    const px = W * (0.31 + i * 0.3), pw = W * 0.1, py = shopY + SHOP_H * 0.34, ph = SHOP_H * 0.52;
    g.fillStyle = '#d4a437'; g.fillRect(px - 2, py - 2, pw + 4, ph + 4);
    g.fillStyle = '#f4eede'; g.fillRect(px, py, pw, ph);
    g.fillStyle = `hsl(${(Math.random() * 360) | 0},70%,45%)`;
    g.fillRect(px + 2, py + 2, pw - 4, ph * 0.55);
    g.fillStyle = '#222';
    g.fillRect(px + 3, py + ph * 0.62, pw - 6, 3);
    g.fillRect(px + 3, py + ph * 0.72, pw - 8, 3);
  }
  // bulb strip under the (3D) marquee line
  g.fillStyle = '#ffedb0';
  for (let x = 6; x < W; x += 12) { g.beginPath(); g.arc(x, shopY + 12, 3, 0, 7); g.fill(); }
}

// 5th Avenue: polished stone piers, tall arched lit display windows, brass.
function paintFlagshipGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, shopY, W, SHOP_H);
  g.fillStyle = mixc(0xd8d0be, '#8a8478', 0.35); g.fillRect(0, shopY, W, SHOP_H * 0.14);
  // brand nameplate
  g.fillStyle = '#1a1712'; g.fillRect(W * 0.2, shopY + 2, W * 0.6, SHOP_H * 0.13);
  g.fillStyle = '#e8c878'; g.font = `700 ${Math.max(10, SHOP_H * 0.09) | 0}px Georgia`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pickR(BRANDS.lux), W / 2, shopY + 2 + SHOP_H * 0.068, W * 0.56);
  // three arched display windows with warm spotlights + figures
  const wy = shopY + SHOP_H * 0.2, wh2 = SHOP_H * 0.76;
  for (let i = 0; i < 3; i++) {
    const wx = W * (0.06 + i * 0.33), ww2 = W * 0.24;
    // stone pier
    g.fillStyle = mixc(0xd8d0be, '#6a6458', 0.25);
    g.fillRect(wx - W * 0.045, wy - 4, W * 0.04, wh2 + 6);
    // arch
    g.fillStyle = '#2a2118';
    g.fillRect(wx - 3, wy - 3, ww2 + 6, wh2 + 5);
    const gr = g.createLinearGradient(0, wy, 0, wy + wh2);
    gr.addColorStop(0, '#ffe6a8'); gr.addColorStop(1, '#c8964a');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(wx, wy + wh2); g.lineTo(wx, wy + ww2 * 0.4);
    g.arc(wx + ww2 / 2, wy + ww2 * 0.4, ww2 / 2, Math.PI, 0);
    g.lineTo(wx + ww2, wy + wh2); g.fill();
    // mannequin / jewellery plinth silhouettes
    g.fillStyle = 'rgba(60,38,20,.8)';
    if (i % 2 === 0) { // mannequin
      g.fillRect(wx + ww2 * 0.4, wy + wh2 * 0.3, ww2 * 0.18, wh2 * 0.55);
      g.beginPath(); g.arc(wx + ww2 * 0.49, wy + wh2 * 0.24, ww2 * 0.09, 0, 7); g.fill();
    } else { // plinth with gem glint
      g.fillRect(wx + ww2 * 0.32, wy + wh2 * 0.55, ww2 * 0.36, wh2 * 0.32);
      g.fillStyle = '#fff8dc';
      g.beginPath(); g.arc(wx + ww2 * 0.5, wy + wh2 * 0.48, 3.5, 0, 7); g.fill();
    }
    // brass frame
    g.strokeStyle = '#c8a050'; g.lineWidth = 3;
    g.strokeRect(wx, wy + ww2 * 0.15, ww2, wh2 - ww2 * 0.15);
  }
}

// Times Square: LED sign band + glass lobby.
function paintNeonGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = '#0e0e16'; g.fillRect(0, shopY, W, SHOP_H);
  const shops = theme.storefront;
  // big LED strip across
  const c1 = pickR(shops), c2 = pickR(shops);
  const gr = g.createLinearGradient(0, shopY, W, shopY);
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  g.fillStyle = gr; g.fillRect(4, shopY + 4, W - 8, SHOP_H * 0.34);
  g.fillStyle = 'rgba(255,255,255,.95)';
  g.font = `900 ${(SHOP_H * 0.22) | 0}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pickR(theme.ads || BRANDS.show), W / 2, shopY + 4 + SHOP_H * 0.17, W - 24);
  // glass lobby with cool interior
  const gy = shopY + SHOP_H * 0.44;
  const gl = g.createLinearGradient(0, gy, 0, H - 6);
  gl.addColorStop(0, '#8ac4e8'); gl.addColorStop(1, '#2a5478');
  g.fillStyle = gl; g.fillRect(8, gy, W - 16, H - 10 - gy);
  g.strokeStyle = 'rgba(20,24,34,.8)'; g.lineWidth = 3;
  for (let x = 8; x <= W - 8; x += (W - 16) / 4) {
    g.beginPath(); g.moveTo(x, gy); g.lineTo(x, H - 10); g.stroke();
  }
}

// upper body of Times Square towers: stacked billboards + ticker bands.
function paintNeonBody(g, W, H, bodyTop, bodyH, theme) {
  const shops = theme.storefront;
  const n = 3 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const bw = W * (0.34 + Math.random() * 0.5);
    const bh = 34 + Math.random() * 52;
    const bx = Math.random() * (W - bw);
    const by = bodyTop + Math.random() * (bodyH - bh);
    const c1 = pickR(shops), c2 = pickR(shops);
    const gr = g.createLinearGradient(bx, by, bx + bw, by + bh);
    gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = '#0a0a12'; g.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
    g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
    g.fillStyle = 'rgba(255,255,255,.92)';
    g.font = `900 ${Math.max(12, bh * 0.4) | 0}px Arial`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pickR(theme.ads || BRANDS.show), bx + bw / 2, by + bh / 2, bw - 10);
  }
  // news ticker band
  const ty = bodyTop + bodyH * (0.3 + Math.random() * 0.4);
  g.fillStyle = '#0a0a12'; g.fillRect(0, ty, W, 16);
  g.fillStyle = '#ffb400'; g.font = '700 11px Arial'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText('● CITY RUN LEADS ● NEON NITES SELL OUT ● 24H LIVE ●', 2, ty + 8, W - 4);
}

function paintIvy(g, W, H, bodyTop, bodyH) {
  // ivy climbing the facade corners
  for (const side of [0, 1]) {
    let x = side ? W - 14 : 2;
    for (let y = H - 40; y > bodyTop + bodyH * 0.25; y -= 12) {
      g.fillStyle = `rgba(${52 + Math.random() * 30 | 0},${100 + Math.random() * 40 | 0},60,.85)`;
      const r = 7 + Math.random() * 9;
      g.beginPath(); g.arc(x + (Math.random() - 0.5) * 14 + 6, y, r, 0, 7); g.fill();
    }
  }
}

// Champs-Élysées: full-glass luxury showroom.
function paintShowroomGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = '#20242c'; g.fillRect(0, shopY, W, SHOP_H);
  g.fillStyle = '#f4efe2'; g.fillRect(0, shopY, W, SHOP_H * 0.16);
  g.fillStyle = '#2a2a30'; g.font = `700 ${Math.max(10, SHOP_H * 0.1) | 0}px Georgia`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pickR(BRANDS.lux), W / 2, shopY + SHOP_H * 0.08, W * 0.8);
  const gy = shopY + SHOP_H * 0.2;
  const gl = g.createLinearGradient(0, gy, 0, H - 6);
  gl.addColorStop(0, '#fff2cc'); gl.addColorStop(1, '#d8a860');
  g.fillStyle = gl; g.fillRect(6, gy, W - 12, H - 9 - gy);
  g.strokeStyle = 'rgba(30,32,40,.85)'; g.lineWidth = 3;
  g.strokeRect(6, gy, W - 12, H - 9 - gy);
  for (let i = 1; i < 4; i++) {
    g.beginPath(); g.moveTo(6 + (W - 12) * i / 4, gy); g.lineTo(6 + (W - 12) * i / 4, H - 9); g.stroke();
  }
  // sleek product silhouettes on plinths
  g.fillStyle = 'rgba(70,45,20,.6)';
  for (let i = 0; i < 3; i++) {
    const px = W * (0.16 + i * 0.3);
    g.fillRect(px, H - 9 - SHOP_H * 0.26, W * 0.1, SHOP_H * 0.06);
    g.fillRect(px + W * 0.02, H - 9 - SHOP_H * 0.4, W * 0.06, SHOP_H * 0.14);
  }
}

// Rivoli: the ground floor is the arcade — deep shadowed arches.
function paintArcadeGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = mixc(0xeadfc4, '#8a7d60', 0.3); g.fillRect(0, shopY, W, SHOP_H);
  const n = 3;
  const aw = W / n;
  for (let i = 0; i < n; i++) {
    const ax = i * aw + aw * 0.14, w2 = aw * 0.72;
    g.fillStyle = '#3a3226';
    g.beginPath();
    g.moveTo(ax, H - 4); g.lineTo(ax, shopY + SHOP_H * 0.42);
    g.arc(ax + w2 / 2, shopY + SHOP_H * 0.42, w2 / 2, Math.PI, 0);
    g.lineTo(ax + w2, H - 4); g.fill();
    // warm lamp glow inside each arch
    const gr = g.createRadialGradient(ax + w2 / 2, shopY + SHOP_H * 0.6, 2, ax + w2 / 2, shopY + SHOP_H * 0.6, w2 * 0.5);
    gr.addColorStop(0, 'rgba(255,220,150,.55)'); gr.addColorStop(1, 'rgba(255,220,150,0)');
    g.fillStyle = gr;
    g.fillRect(ax, shopY + SHOP_H * 0.3, w2, SHOP_H * 0.7);
  }
  g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(0, shopY, W, 4);
}

// Montmartre: bistro fronts, hand-painted signs, checked awnings.
function paintVillageGround({ g, W, H, shopY, SHOP_H, theme }) {
  const shops = theme.storefront || ['#a02438', '#2d6b3f'];
  const col = pickR(shops);
  g.fillStyle = mixc(new THREE.Color(col).getHex(), '#3a3028', 0.25);
  g.fillRect(0, shopY, W, SHOP_H);
  // name board
  g.fillStyle = '#f4eede'; g.font = `700 ${Math.max(11, SHOP_H * 0.13) | 0}px Georgia`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pickR(BRANDS.cafe), W / 2, shopY + SHOP_H * 0.12, W * 0.8);
  // checked awning
  const ay = shopY + SHOP_H * 0.24, ah = SHOP_H * 0.16;
  for (let x = 4; x < W - 4; x += 14) {
    g.fillStyle = (x / 14 | 0) % 2 ? '#f4f0e4' : col;
    g.fillRect(x, ay, Math.min(14, W - 4 - x), ah);
  }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(4, ay + ah - 2, W - 8, 3);
  // small paned windows + door
  const gy = ay + ah + 4;
  g.fillStyle = '#ffe9b0';
  g.fillRect(10, gy, W * 0.34, H - 10 - gy);
  g.fillRect(W - 10 - W * 0.34, gy, W * 0.34, H - 10 - gy);
  g.strokeStyle = 'rgba(40,36,30,.8)'; g.lineWidth = 2;
  g.strokeRect(10, gy, W * 0.34, H - 10 - gy);
  g.strokeRect(W - 10 - W * 0.34, gy, W * 0.34, H - 10 - gy);
  g.fillStyle = '#4a3222';
  g.fillRect(W * 0.42, gy, W * 0.16, H - 8 - gy);
}

// Oxford Street: giant white columns over two-storey display glass.
function paintDeptstoreGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = '#28241e'; g.fillRect(0, shopY, W, SHOP_H);
  // fascia with store name
  g.fillStyle = '#f2ede2'; g.fillRect(0, shopY, W, SHOP_H * 0.15);
  g.fillStyle = '#2a2620'; g.font = `700 ${Math.max(11, SHOP_H * 0.1) | 0}px Georgia`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pickR(BRANDS.dept), W / 2, shopY + SHOP_H * 0.075, W * 0.8);
  // columns + glass bays
  const nB = 3;
  const bw = W / nB;
  for (let i = 0; i <= nB; i++) {
    const cx = i * bw;
    g.fillStyle = '#e8e2d2';
    g.fillRect(cx - 7, shopY + SHOP_H * 0.15, 14, SHOP_H * 0.85);
    g.fillStyle = 'rgba(0,0,0,.15)';
    g.fillRect(cx + 3, shopY + SHOP_H * 0.15, 4, SHOP_H * 0.85);
    g.fillStyle = '#e8e2d2';
    g.fillRect(cx - 9, shopY + SHOP_H * 0.15, 18, 6);
    g.fillRect(cx - 9, H - 12, 18, 8);
  }
  for (let i = 0; i < nB; i++) {
    const gx = i * bw + 9, gw = bw - 18;
    const gl = g.createLinearGradient(0, shopY, 0, H);
    gl.addColorStop(0, '#ffeebc'); gl.addColorStop(1, '#d09a54');
    g.fillStyle = gl;
    g.fillRect(gx, shopY + SHOP_H * 0.2, gw, SHOP_H * 0.76);
    // display mannequins
    g.fillStyle = 'rgba(70,45,25,.65)';
    g.fillRect(gx + gw * 0.2, H - 8 - SHOP_H * 0.34, gw * 0.14, SHOP_H * 0.3);
    g.fillRect(gx + gw * 0.6, H - 8 - SHOP_H * 0.3, gw * 0.14, SHOP_H * 0.26);
  }
}

// Via del Corso: stucco with small boutique signs and arched doorways.
function paintOchreGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(0, shopY, W, SHOP_H);
  const shops = theme.storefront;
  for (let i = 0; i < 2; i++) {
    const dx = W * (0.12 + i * 0.5), dw = W * 0.26;
    // arched doorway
    g.fillStyle = '#3c2c1c';
    g.beginPath();
    g.moveTo(dx, H - 4); g.lineTo(dx, shopY + SHOP_H * 0.4);
    g.arc(dx + dw / 2, shopY + SHOP_H * 0.4, dw / 2, Math.PI, 0);
    g.lineTo(dx + dw, H - 4); g.fill();
    g.strokeStyle = '#f0e2c4'; g.lineWidth = 3;
    g.stroke();
    // warm interior slit
    g.fillStyle = '#ffd98a';
    g.fillRect(dx + dw * 0.42, shopY + SHOP_H * 0.5, dw * 0.16, SHOP_H * 0.5);
    // tiny hanging boutique sign
    const col = pickR(shops);
    g.fillStyle = col;
    g.fillRect(dx + dw + 4, shopY + SHOP_H * 0.28, 22, 14);
    g.fillStyle = 'rgba(255,255,255,.9)';
    g.fillRect(dx + dw + 7, shopY + SHOP_H * 0.28 + 5, 16, 4);
  }
}

// Via Veneto: grand hotel entrance, gold lettering, lanterns.
function paintHotelGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, shopY, W, SHOP_H);
  // gold name band
  g.fillStyle = '#20242e'; g.fillRect(W * 0.12, shopY + 2, W * 0.76, SHOP_H * 0.16);
  g.fillStyle = '#e8c878'; g.font = `700 ${Math.max(11, SHOP_H * 0.11) | 0}px Georgia`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pickR(BRANDS.hotel), W / 2, shopY + 2 + SHOP_H * 0.08, W * 0.7);
  // grand centered door with fan window
  const dw = W * 0.3, dx = W / 2 - dw / 2;
  g.fillStyle = '#2c1e12';
  g.beginPath();
  g.moveTo(dx, H - 4); g.lineTo(dx, shopY + SHOP_H * 0.46);
  g.arc(W / 2, shopY + SHOP_H * 0.46, dw / 2, Math.PI, 0);
  g.lineTo(dx + dw, H - 4); g.fill();
  g.fillStyle = '#ffdf9a';
  g.beginPath();
  g.arc(W / 2, shopY + SHOP_H * 0.46, dw * 0.38, Math.PI, 0); g.fill();
  g.fillStyle = '#3c2a18';
  g.fillRect(dx + dw * 0.14, shopY + SHOP_H * 0.5, dw * 0.72, SHOP_H * 0.5);
  g.fillStyle = '#ffd98a';
  g.fillRect(W / 2 - 2, shopY + SHOP_H * 0.52, 4, SHOP_H * 0.44);
  // flanking lanterns + windows
  for (const lx of [dx - W * 0.09, dx + dw + W * 0.05]) {
    g.fillStyle = '#ffedb0';
    g.fillRect(lx, shopY + SHOP_H * 0.42, W * 0.04, SHOP_H * 0.1);
    g.strokeStyle = '#2a2a30'; g.lineWidth = 2;
    g.strokeRect(lx, shopY + SHOP_H * 0.42, W * 0.04, SHOP_H * 0.1);
  }
  // red carpet step
  g.fillStyle = '#a01c30';
  g.fillRect(dx + dw * 0.1, H - 8, dw * 0.8, 5);
}

// Navona: travertine pilasters and pedimented doorways.
function paintBaroqueGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, shopY, W, SHOP_H);
  for (let i = 0; i <= 3; i++) {
    const cx = i * (W / 3);
    g.fillStyle = mixc(0xeadbb8, '#a89468', 0.4);
    g.fillRect(cx - 6, shopY, 12, SHOP_H);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(cx - 6, shopY, 3, SHOP_H);
  }
  for (let i = 0; i < 3; i++) {
    const dx = i * (W / 3) + W / 6 - W * 0.1, dw = W * 0.2;
    // pediment
    g.fillStyle = mixc(0xeadbb8, '#8a7850', 0.5);
    g.beginPath();
    g.moveTo(dx - 6, shopY + SHOP_H * 0.34);
    g.lineTo(dx + dw / 2, shopY + SHOP_H * 0.16);
    g.lineTo(dx + dw + 6, shopY + SHOP_H * 0.34); g.fill();
    g.fillStyle = '#3a2c1e';
    g.fillRect(dx, shopY + SHOP_H * 0.36, dw, SHOP_H * 0.64);
    g.fillStyle = i === 1 ? '#ffd98a' : 'rgba(255,217,138,.5)';
    g.fillRect(dx + dw * 0.4, shopY + SHOP_H * 0.42, dw * 0.2, SHOP_H * 0.55);
  }
}

// ---------- road / sidewalk ----------
export function roadTexture(theme) {
  return cached(`road:${sKey(theme)}`, () =>
    canvasTexture(512, 512, (g) => {
      const style = theme.roadStyle || 'asphalt';
      g.fillStyle = theme.road; g.fillRect(0, 0, 512, 512);
      if (style === 'cobble' || style === 'travertine') {
        // fan-set cobbles / travertine setts
        const cw = style === 'cobble' ? 26 : 42;
        const ch = style === 'cobble' ? 20 : 30;
        for (let y = 0; y < 512; y += ch) {
          for (let x = ((y / ch) % 2) * cw / 2 - cw; x < 512 + cw; x += cw) {
            const l = Math.random() * 18 - 9;
            g.fillStyle = mixc(new THREE.Color(theme.road).getHex(),
              l > 0 ? '#ffffff' : '#000000', Math.abs(l) / 100 + 0.04);
            g.beginPath();
            if (style === 'cobble') {
              g.ellipse(x + cw / 2, y + ch / 2, cw / 2 - 2, ch / 2 - 2, 0, 0, 7);
            } else {
              g.rect(x + 2, y + 2, cw - 4, ch - 4);
            }
            g.fill();
          }
        }
        g.fillStyle = 'rgba(0,0,0,.18)';
        for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
      } else {
        // asphalt noise
        for (let i = 0; i < 1600; i++) {
          g.fillStyle = `rgba(${140 + Math.random() * 60 | 0},${140 + Math.random() * 60 | 0},${145 + Math.random() * 60 | 0},${Math.random() * 0.09})`;
          g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
        if (style !== 'plain') {
          // lane dashes at the two lane boundaries (road spans 3 lanes)
          g.fillStyle = theme.lane;
          for (const x of [512 / 3, 1024 / 3]) {
            for (let y = 0; y < 512; y += 84) g.fillRect(x - 5, y, 10, 46);
          }
        }
        // crisp edge lines
        g.fillStyle = 'rgba(240,240,240,.85)';
        g.fillRect(6, 0, 5, 512);
        g.fillRect(501, 0, 5, 512);
        // wear tracks
        const wear = g.createLinearGradient(0, 0, 512, 0);
        wear.addColorStop(0.15, 'rgba(0,0,0,0)'); wear.addColorStop(0.5, 'rgba(0,0,0,.1)'); wear.addColorStop(0.85, 'rgba(0,0,0,0)');
        g.fillStyle = wear; g.fillRect(0, 0, 512, 512);
      }
    }, 1, 3)
  );
}

export function sidewalkTexture(theme) {
  return cached(`side:${sKey(theme)}`, () =>
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
      for (let i = 0; i < 200; i++) {
        g.fillStyle = `rgba(255,240,210,${Math.random() * 0.08})`;
        g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
    }, 2, 8)
  );
}

// ---------- buildings ----------
export function makeBuilding(theme, w, h, d, rng = Math.random, side = 0) {
  if (theme.facade === 'georgian') return makeVilla(theme, w, d, rng, side);

  const color = theme.palette[(rng() * theme.palette.length) | 0];
  const floors = Math.max(4, Math.round(h / 3.2));
  const cols = Math.max(3, Math.round(w / 2.2));
  const variant = (rng() * 4) | 0;
  // one material per (street, colour, floors, cols, variant) — buildings that
  // share a facade texture share the material too, so chunk churn allocates none.
  const mat = cached(`facMat:${sKey(theme)}:${color}:${floors}:${cols}:${variant}`, () => {
    const m = new THREE.MeshStandardMaterial({
      map: facadeTexture(theme, color, floors, cols, variant),
      roughness: 0.85, metalness: 0.04,
    });
    if (theme.facade === 'neon') { m.emissive = new THREE.Color(0xffffff); m.emissiveMap = m.map; m.emissiveIntensity = 0.55; }
    return m;
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
  const cornice = new THREE.Mesh(boxGeo, cached(`cornice:${sKey(theme)}`, () =>
    new THREE.MeshStandardMaterial({ color: theme.trim || '#e8e0cc', roughness: 0.9 })));
  cornice.scale.set(w * 1.08, 0.45, d * 1.08);
  cornice.position.y = h + 0.22;
  group.add(cornice);

  // NYC billboards bolted to street-facing facades (Times Square heavy)
  const wantsBB = theme.facade === 'neon' ? 0.9 : theme.id === 'nyc' && !theme.facade ? 0.6 : 0;
  if (wantsBB && side !== 0 && rng() < wantsBB && h > 18) {
    const n = theme.facade === 'neon' ? 2 + ((rng() * 2) | 0) : rng() < 0.35 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const bb = makeBillboard(theme, 3.6 + rng() * 2.4, 2 + rng() * 1.4);
      bb.position.set(-side * (w / 2 + 0.18), h * (0.3 + rng() * 0.5), (rng() - 0.5) * d * 0.5);
      bb.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(bb);
    }
    // corner LED wrap: two boards meeting at the street-facing front corner
    if (theme.cornerLED && rng() < 0.4) {
      const wrapH = 2.2 + rng() * 1.2;
      const yy = h * (0.2 + rng() * 0.3);
      const b1 = makeBillboard(theme, d * 0.55, wrapH);
      b1.position.set(-side * (w / 2 + 0.18), yy, d * 0.24);
      b1.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(b1);
      const b2 = makeBillboard(theme, w * 0.55, wrapH);
      b2.position.set(-side * (w / 2 - w * 0.28), yy, d * 0.5 + 0.12);
      group.add(b2);
    }
  }

  // Broadway / Piccadilly: bulb-chase marquee canopy over the entrance
  if (theme.marquee && side !== 0) {
    group.add(makeMarquee(theme, Math.min(5.4, w * 0.7), side, w, d));
  }
  // 5th Avenue: full prestige shopfront — granite base, limestone piers, lit
  // display windows with spotlit figures, gold awnings, topiary, flags.
  if (theme.goldAwnings && side !== 0) {
    const front = makeLuxeFront(theme, Math.min(d - 0.4, 8.5));
    front.position.set(-side * (w / 2 + 0.5), 0, 0);
    front.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(front);
  }
  // Oxford Street: columned department-store flagship front
  if (theme.facade === 'deptstore' && side !== 0) {
    const front = makeDeptFront(theme, Math.min(d - 0.3, 11));
    front.position.set(-side * (w / 2 + 0.55), 0, 0);
    front.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(front);
  }
  // Via Veneto: entrance canopy + national flags over the door
  if (theme.facade === 'hotel' && side !== 0) {
    const can = makeHotelCanopy(theme);
    can.position.set(-side * (w / 2 + 0.9), 0, 0);
    can.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(can);
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

// Abbey Road: low Georgian villa behind a low wall + hedge, pitched roof.
function villaTexture(theme, color, brick) {
  return cached(`villa:${color}:${brick}`, () =>
    canvasTexture(256, 256, (g) => {
      g.fillStyle = color; g.fillRect(0, 0, 256, 256);
      if (brick) {
        g.fillStyle = 'rgba(0,0,0,.08)';
        for (let y = 0; y < 256; y += 6) g.fillRect(0, y, 256, 1);
      }
      // two floors of white-trimmed sash windows
      for (let f = 0; f < 2; f++) {
        for (let c = 0; c < 3; c++) {
          if (f === 1 && c === 1) continue; // door slot
          const x = 22 + c * 78, y = 34 + f * 104, w = 44, h = 62;
          g.fillStyle = '#f6f3ea'; g.fillRect(x - 5, y - 5, w + 10, h + 10);
          const lit = Math.random() < 0.18;
          g.fillStyle = lit ? '#ffedbe' : '#a8c4dc';
          g.fillRect(x, y, w, h);
          if (!lit) {
            g.fillStyle = 'rgba(255,255,255,.3)';
            g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.8, y); g.lineTo(x + w * 0.3, y + h); g.fill();
          }
          g.strokeStyle = 'rgba(40,44,54,.7)'; g.lineWidth = 2;
          g.strokeRect(x, y, w, h);
          g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
          g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
        }
      }
      // front door with fanlight + tiny portico
      g.fillStyle = '#f6f3ea'; g.fillRect(94, 128, 68, 124);
      const doorCols = ['#1c3a6a', '#7a1626', '#1e4a30', '#222226'];
      g.fillStyle = doorCols[(Math.random() * 4) | 0];
      g.fillRect(102, 150, 52, 102);
      g.fillStyle = '#ffe9b0';
      g.beginPath(); g.arc(128, 150, 24, Math.PI, 0); g.fill();
      g.fillStyle = '#e8c878'; g.beginPath(); g.arc(146, 205, 3, 0, 7); g.fill();
      g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(94, 246, 68, 8);
    })
  );
}

export function makeVilla(theme, w, d, rng = Math.random, side = 0) {
  const g = new THREE.Group();
  const brick = rng() < 0.4;
  const color = brick ? (rng() < 0.5 ? '#b46848' : '#c07a58') : (rng() < 0.5 ? '#f2efe6' : '#ece7da');
  const h = 7.5 + rng() * 2.5;
  const mat = cached(`villaMat:${color}:${brick}`, () =>
    new THREE.MeshStandardMaterial({ map: villaTexture(theme, color, brick), roughness: 0.9 }));
  const sideMat = cached(`villaSide:${color}`, () =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
  const body = new THREE.Mesh(boxGeo, [sideMat, sideMat, sideMat, sideMat, mat, mat]);
  body.scale.set(w, h, d);
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // pitched slate roof
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, Math.min(w, d) * 0.62, 2.4, 4),
    cached('mat:slate', () => new THREE.MeshStandardMaterial({ color: 0x4c5258, roughness: 0.85 })));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w / Math.min(w, d), 1, d / Math.min(w, d));
  roof.position.y = h + 1.1;
  roof.castShadow = true;
  g.add(roof);
  // chimney
  const chim = new THREE.Mesh(boxGeo, cached('mat:chimney', () =>
    new THREE.MeshStandardMaterial({ color: 0x9a6248, roughness: 0.95 })));
  chim.scale.set(0.6, 1.3, 0.6);
  chim.position.set(w * 0.28, h + 1.6, 0);
  g.add(chim);
  // white portico columns at the door
  if (side !== 0) {
    const pMat = cached('mat:portico', () => new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.8 }));
    const porch = new THREE.Mesh(boxGeo, pMat);
    porch.scale.set(0.2, 1.6, w * 0.24);
    for (const pz of [-w * 0.1, w * 0.1]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 8), pMat);
      col.position.set(-side * (w / 2 + 0.55), 1.3, pz);
      g.add(col);
    }
    const lintel = new THREE.Mesh(boxGeo, pMat);
    lintel.scale.set(0.9, 0.22, w * 0.3);
    lintel.position.set(-side * (w / 2 + 0.45), 2.7, 0);
    g.add(lintel);
  }
  return g;
}

// low front wall + hedge strip for Abbey Road gardens
export function makeGardenWall(theme, len) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(boxGeo, cached('mat:gwall', () =>
    new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.95 })));
  wall.scale.set(0.3, 0.9, len);
  wall.position.y = 0.45;
  wall.castShadow = true;
  g.add(wall);
  const hedge = new THREE.Mesh(boxGeo, cached('mat:hedge', () =>
    new THREE.MeshStandardMaterial({ color: 0x2f5c30, roughness: 0.95 })));
  hedge.scale.set(0.8, 1.1, len * 0.96);
  hedge.position.set(0.55, 0.85, 0);
  hedge.castShadow = true;
  g.add(hedge);
  return g;
}

// ---------- signature street furniture ----------

// Bulb-chase marquee canopy with a fictional show name.
function marqueeFace(theme) {
  const words = theme.ads || BRANDS.show;
  const wi = (Math.random() * words.length) | 0;
  return cached(`marqMat:${sKey(theme)}:${wi}`, () => {
    const tex = canvasTexture(256, 64, (g) => {
      g.fillStyle = '#14101a'; g.fillRect(0, 0, 256, 64);
      g.fillStyle = '#fff4c8';
      g.font = '900 30px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(words[wi], 128, 32, 216);
      g.fillStyle = '#ffe27a';
      for (let x = 8; x < 256; x += 16) { g.beginPath(); g.arc(x, 8, 4, 0, 7); g.fill(); }
      for (let x = 8; x < 256; x += 16) { g.beginPath(); g.arc(x, 56, 4, 0, 7); g.fill(); }
    });
    return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.5 });
  });
}
export function makeMarquee(theme, w, side, bw, bd) {
  const g = new THREE.Group();
  const faceMat = marqueeFace(theme);
  const darkMat = cached('mat:marqDark', () => new THREE.MeshStandardMaterial({ color: 0x1a1420, roughness: 0.6 }));
  const canopy = new THREE.Mesh(boxGeo, [darkMat, darkMat, darkMat, darkMat, faceMat, darkMat]);
  canopy.scale.set(w, 1.1, 1.7);
  canopy.castShadow = true;
  g.add(canopy);
  // glowing underside
  const under = new THREE.Mesh(boxGeo, cached('mat:marqGlow', () =>
    new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 1.6 })));
  under.scale.set(w * 0.94, 0.06, 1.6);
  under.position.y = -0.58;
  g.add(under);
  // bulb rows on the canopy edge
  const bulbMat = cached('mat:marqBulb', () =>
    new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd24a, emissiveIntensity: 3 }));
  const nB = Math.max(4, Math.round(w / 0.55));
  for (let i = 0; i < nB; i++) {
    const bx = -w / 2 + 0.3 + (i / (nB - 1)) * (w - 0.6);
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(bx, 0.62, 0.86);
    g.add(bulb);
  }
  g.position.set(-side * (bw / 2 + 0.9), 4.4, 0);
  g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  return g;
}

// 5th Avenue scalloped gold awning.
function makeGoldAwning(theme, w) {
  const g = new THREE.Group();
  const goldTex = cached('goldAwnTex', () => canvasTexture(128, 64, (c) => {
    c.fillStyle = '#c9a544'; c.fillRect(0, 0, 128, 64);
    const sh = c.createLinearGradient(0, 0, 0, 64);
    sh.addColorStop(0, 'rgba(255,255,255,.3)'); sh.addColorStop(1, 'rgba(0,0,0,.2)');
    c.fillStyle = sh; c.fillRect(0, 0, 128, 64);
    // scalloped edge
    c.fillStyle = '#a8862e';
    for (let x = 0; x < 128; x += 16) { c.beginPath(); c.arc(x + 8, 60, 8, 0, Math.PI); c.fill(); }
  }));
  const awn = new THREE.Mesh(boxGeo,
    cached('mat:goldAwn', () => new THREE.MeshStandardMaterial({ map: cache.get('goldAwnTex'), roughness: 0.55, metalness: 0.25 })));
  awn.scale.set(w, 0.1, 1.5);
  awn.rotation.x = 0.24;
  awn.castShadow = true;
  g.add(awn);
  return g;
}

// Oxford Street: a columned flagship front bolted onto the building — giant
// order of columns over two-storey lit display bays with an entablature.
// Local frame matches makeMarquee: length along local X, +Z points at the road.
function makeDeptFront(theme, w) {
  const g = new THREE.Group();
  const stoneMat = mats.limestone;
  const nB = Math.max(2, Math.round(w / 3.4));
  const bayW = w / nB;
  const plinth = new THREE.Mesh(boxGeo, cached('mat:deptPlinth', () =>
    new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.8 })));
  plinth.scale.set(w, 0.45, 1.5);
  plinth.position.set(0, 0.22, -0.05);
  g.add(plinth);
  const colGeo = cached('geo:deptCol', () => new THREE.CylinderGeometry(0.32, 0.37, 5.5, 12));
  const capGeo = cached('geo:deptCap', () => new THREE.BoxGeometry(0.95, 0.26, 0.95));
  for (let i = 0; i <= nB; i++) {
    const cx = -w / 2 + i * bayW;
    const col = new THREE.Mesh(colGeo, stoneMat);
    col.position.set(cx, 3.2, 0.18);
    col.castShadow = true;
    g.add(col);
    const cap = new THREE.Mesh(capGeo, stoneMat);
    cap.position.set(cx, 6.05, 0.18);
    g.add(cap);
    const base = new THREE.Mesh(capGeo, stoneMat);
    base.position.set(cx, 0.55, 0.18);
    g.add(base);
  }
  // entablature + cornice over the giant order
  const ent = new THREE.Mesh(boxGeo, stoneMat);
  ent.scale.set(w + 0.6, 0.8, 1.2);
  ent.position.set(0, 6.6, 0.1);
  ent.castShadow = true;
  g.add(ent);
  const cornice = new THREE.Mesh(boxGeo, stoneMat);
  cornice.scale.set(w + 1.0, 0.3, 1.15);
  cornice.position.set(0, 7.12, 0.15);
  g.add(cornice);
  // recessed lit display bays between the columns
  for (let i = 0; i < nB; i++) {
    const cx = -w / 2 + (i + 0.5) * bayW;
    const darkMat = cached('mat:deptMull', () =>
      new THREE.MeshStandardMaterial({ color: 0x1c1913, roughness: 0.6 }));
    // Everything is kept shallow: at the grazing angle you see a shopfront
    // from, anything recessed more than ~30cm simply disappears.
    const reveal = new THREE.Mesh(boxGeo, darkMat);
    reveal.scale.set(bayW - 0.5, 4.7, 0.12);
    reveal.position.set(cx, 2.7, -0.36);
    g.add(reveal);
    const glass = new THREE.Mesh(boxGeo, mats.warmGlass);
    glass.scale.set(bayW - 0.8, 4.2, 0.1);
    glass.position.set(cx, 2.65, -0.28);
    g.add(glass);
    for (let k = 0; k < 2; k++) {     // mannequins on a plinth, lit from behind
      const plin = new THREE.Mesh(boxGeo, darkMat);
      plin.scale.set(0.55, 0.6, 0.32);
      plin.position.set(cx - 0.6 + k * 1.2, 0.85, -0.16);
      g.add(plin);
      const body = new THREE.Mesh(cached('geo:mannequin', () =>
        new THREE.CapsuleGeometry(0.2, 0.95, 4, 7)), mats.bronze);
      body.position.set(cx - 0.6 + k * 1.2, 1.85, -0.16);
      g.add(body);
      const head = new THREE.Mesh(ballGeo, mats.bronze);
      head.scale.setScalar(0.17);
      head.position.set(cx - 0.6 + k * 1.2, 2.55, -0.16);
      g.add(head);
    }
    // dark shopfront framing: transom rail and jambs read against the glow
    const mull = new THREE.Mesh(boxGeo, darkMat);
    mull.scale.set(bayW - 0.5, 0.22, 0.24);
    mull.position.set(cx, 3.5, -0.1);
    g.add(mull);
    for (const s of [-1, 1]) {
      const jamb = new THREE.Mesh(boxGeo, darkMat);
      jamb.scale.set(0.2, 4.7, 0.24);
      jamb.position.set(cx + s * (bayW - 0.5) / 2, 2.7, -0.1);
      g.add(jamb);
    }
    const fascia = new THREE.Mesh(boxGeo, cached('mat:deptFascia', () =>
      new THREE.MeshStandardMaterial({ color: 0x16324c, roughness: 0.55 })));
    fascia.scale.set(bayW - 0.35, 0.65, 0.2);
    fascia.position.set(cx, 5.4, -0.05);
    g.add(fascia);
  }
  return g;
}

// 5th Avenue: polished granite pier + limestone flagship front, gold scalloped
// awning, lit display window with spotlit figures, doorway topiary, flags.
function makeLuxeFront(theme, w) {
  const g = new THREE.Group();
  const w2 = Math.min(w - 0.5, 8.0);
  // polished dark granite backing wall — sits BEHIND the lit windows so the
  // display reads as a bright box cut into dark stone
  const base = new THREE.Mesh(boxGeo, mats.granite);
  base.scale.set(w2, 4.2, 0.18);
  base.position.set(0, 2.1, -0.72);
  base.castShadow = true;
  g.add(base);
  const nB = 2;
  const bayW = w2 / nB;
  const pierGeo = cached('geo:luxePier', () => new THREE.BoxGeometry(0.9, 4.2, 0.95));
  for (let i = 0; i <= nB; i++) {
    const p = new THREE.Mesh(pierGeo, mats.limestone);
    p.position.set(-w2 / 2 + i * bayW, 2.1, 0.1);
    p.castShadow = true;
    g.add(p);
  }
  // limestone entablature + gilded string course
  const ent = new THREE.Mesh(boxGeo, mats.limestone);
  ent.scale.set(w2 + 0.8, 0.8, 1.15);
  ent.position.set(0, 4.6, 0.05);
  ent.castShadow = true;
  g.add(ent);
  const gild = new THREE.Mesh(boxGeo, mats.gold);
  gild.scale.set(w2 + 0.85, 0.12, 1.22);
  gild.position.set(0, 4.14, 0.06);
  g.add(gild);
  for (let i = 0; i < nB; i++) {
    const cx = -w2 / 2 + (i + 0.5) * bayW;
    // lit backdrop of the window, then the figure, then the brass frame
    const glass = new THREE.Mesh(boxGeo, mats.warmGlass);
    glass.scale.set(bayW - 0.95, 3.05, 0.08);
    glass.position.set(cx, 2.4, -0.58);
    g.add(glass);
    const riser = new THREE.Mesh(boxGeo, mats.granite);   // stall riser
    riser.scale.set(bayW - 0.9, 0.85, 0.45);
    riser.position.set(cx, 0.42, -0.45);
    g.add(riser);
    // mannequin standing in the window under a warm spotlight cone
    const fig = new THREE.Mesh(cached('geo:luxeFig', () =>
      new THREE.CapsuleGeometry(0.16, 0.85, 4, 7)), mats.bronze);
    fig.position.set(cx, 1.55, -0.45);
    g.add(fig);
    const head = new THREE.Mesh(ballGeo, mats.bronze);
    head.scale.setScalar(0.14);
    head.position.set(cx, 2.22, -0.45);
    g.add(head);
    const spot = new THREE.Mesh(coneGeo, cached('mat:luxeSpot', () =>
      new THREE.MeshStandardMaterial({
        color: 0xffe8b4, emissive: 0xffdc94, emissiveIntensity: 1.4,
        transparent: true, opacity: 0.28, depthWrite: false })));
    spot.scale.set(0.5, 1.9, 0.42);
    spot.rotation.x = Math.PI;
    spot.position.set(cx, 2.5, -0.45);
    g.add(spot);
    // brass frame in front of the whole bay
    const frame = new THREE.Mesh(boxGeo, mats.gold);
    frame.scale.set(bayW - 0.72, 0.14, 0.16);
    frame.position.set(cx, 3.95, -0.28);
    g.add(frame);
    for (const s of [-1, 1]) {
      const jamb = new THREE.Mesh(boxGeo, mats.gold);
      jamb.scale.set(0.14, 3.4, 0.16);
      jamb.position.set(cx + s * (bayW - 0.72) / 2, 2.3, -0.28);
      g.add(jamb);
    }
    // gold scalloped awning over the bay
    const awn = makeGoldAwning(theme, bayW - 0.6);
    awn.position.set(cx, 3.95, 0.55);
    g.add(awn);
    // doorway topiary flanking each bay
    for (const s of [-1, 1]) {
      const tp = makeTopiary();
      tp.scale.setScalar(0.85);
      tp.position.set(cx + s * (bayW / 2 - 0.45), 0, 0.75);
      g.add(tp);
    }
  }
  // vertical luxury flags on gilded rods above the entablature
  for (let i = 0; i < 2; i++) {
    const fb = makeFlagBanner(theme);
    fb.scale.setScalar(0.95);
    fb.position.set(-w2 / 4 + i * (w2 / 2), 7.3, 0.85);
    g.add(fb);
  }
  return g;
}

// Via Veneto hotel entrance canopy + flag poles.
function makeHotelCanopy(theme) {
  const g = new THREE.Group();
  const canMat = cached('mat:hotelCan', () =>
    new THREE.MeshStandardMaterial({ color: 0x7a1626, roughness: 0.6 }));
  const can = new THREE.Mesh(boxGeo, canMat);
  can.scale.set(2.6, 0.16, 1.8);
  can.position.y = 3.4;
  can.castShadow = true;
  g.add(can);
  const fringe = new THREE.Mesh(boxGeo, cached('mat:hotelFringe', () =>
    new THREE.MeshStandardMaterial({ color: 0xe8c878, roughness: 0.6 })));
  fringe.scale.set(2.62, 0.14, 0.06);
  fringe.position.set(0, 3.3, 0.92);
  g.add(fringe);
  for (const px of [-1.1, 1.1]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.4, 6), mats.gold);
    pole.position.set(px, 1.7, 0.8);
    g.add(pole);
  }
  // angled flag poles with pastel flags above the canopy
  const flagCols = [0xe0e4ec, 0xd0a848, 0x8a1c30];
  for (let i = 0; i < 3; i++) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 5), mats.gold);
    pole.position.set(-0.9 + i * 0.9, 4.6, 0.4);
    pole.rotation.x = 0.7;
    g.add(pole);
    const flag = new THREE.Mesh(boxGeo, cached(`mat:hflag:${i}`, () =>
      new THREE.MeshStandardMaterial({ color: flagCols[i], roughness: 0.8 })));
    flag.scale.set(0.68, 0.42, 0.03);
    flag.position.set(-0.9 + i * 0.9, 5.15, 0.95);
    flag.rotation.x = 0.25;
    g.add(flag);
  }
  return g;
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
  travertine: new THREE.MeshStandardMaterial({ color: 0xe6d6ae, roughness: 0.8 }),
  rattan: new THREE.MeshStandardMaterial({ color: 0xb8874a, roughness: 0.85 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.7 }),
  orangeGlow: new THREE.MeshStandardMaterial({ color: 0xffa02a, emissive: 0xff8400, emissiveIntensity: 2.4 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.5, metalness: 0.6 }),
  planeTrunk: new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 0.95 }),
  gravel: new THREE.MeshStandardMaterial({ color: 0xc8b48c, roughness: 1 }),
  ivy: new THREE.MeshStandardMaterial({ color: 0x3c7038, roughness: 0.95 }),
  limestone: new THREE.MeshStandardMaterial({ color: 0xe6e0d0, roughness: 0.8 }),
  granite: new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.35, metalness: 0.35 }),
  warmGlass: new THREE.MeshStandardMaterial({ color: 0xffd88e, emissive: 0xffc35a, emissiveIntensity: 1.9, roughness: 0.3 }),
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

export function makeTree(kind = 'round') {
  const g = new THREE.Group();
  if (kind === 'cypress') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 7), mats.trunk);
    trunk.position.y = 0.4; trunk.castShadow = true; g.add(trunk);
    const fol = new THREE.Mesh(new THREE.ConeGeometry(0.75, 4.4, 9), mats.leafDark);
    fol.position.y = 2.9; fol.castShadow = true; g.add(fol);
  } else if (kind === 'chestnut') {
    // Champs-Élysées pollarded plane tree: tall bare trunk you can see the
    // street through, then a compact clipped-round crown well above head height.
    const trunk = new THREE.Mesh(cached('geo:chestTrunk', () =>
      new THREE.CylinderGeometry(0.16, 0.26, 3.7, 8)), mats.planeTrunk);
    trunk.position.y = 1.85; trunk.castShadow = true; g.add(trunk);
    for (const s of [-1, 1]) {                       // two stubby pollard boughs
      const b = new THREE.Mesh(cached('geo:chestBough', () =>
        new THREE.CylinderGeometry(0.07, 0.11, 0.95, 6)), mats.planeTrunk);
      b.position.set(s * 0.3, 3.6, 0);
      b.rotation.z = s * 0.6;
      g.add(b);
    }
    const skirt = new THREE.Mesh(coneGeo, mats.leafDark);   // clipped underside
    skirt.scale.set(1.22, 0.75, 1.22);
    skirt.rotation.x = Math.PI;
    skirt.position.y = 4.12;
    g.add(skirt);
    const crown = new THREE.Mesh(ballGeo, mats.leaf);
    crown.scale.set(1.24, 0.95, 1.24);
    crown.position.y = 4.55; crown.castShadow = true; g.add(crown);
    const cap = new THREE.Mesh(ballGeo, mats.leafDark);
    cap.scale.set(0.92, 0.68, 0.92);
    cap.position.y = 5.12; g.add(cap);
  } else if (kind === 'plane') {
    // big mature plane tree — Abbey Road / Veneto
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 2.8, 8),
      cached('mat:planetrunk', () => new THREE.MeshStandardMaterial({ color: 0x8a7a5c, roughness: 0.95 })));
    trunk.position.y = 1.4; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 4; i++) {
      const fol = new THREE.Mesh(new THREE.SphereGeometry(1.5 - i * 0.18, 9, 7), i % 2 ? mats.leaf : mats.leafDark);
      fol.position.set((Math.random() - 0.5) * 1.6, 3.4 + i * 0.8, (Math.random() - 0.5) * 1.6);
      fol.castShadow = true;
      g.add(fol);
    }
  } else {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 7), mats.trunk);
    trunk.position.y = 0.8; trunk.castShadow = true; g.add(trunk);
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

// Times Square style billboard with per-street ad text.
const ADS = {
  nyc: ['BROADWAY', 'LIVE!', 'CITY RUN', '42nd ST', 'NEON', 'PIZZA', 'JAZZ CLUB'],
  paris: ['CAFÉ', 'MODE', 'PARFUM', 'BISTRO'],
  london: ['WEST END', 'TEA & CO', 'THE TUBE', 'OXFORD ST'],
  rome: ['GELATO', 'CINEMA', 'MODA', 'ROMA'],
};

export function makeBillboard(theme, w = 5, h = 2.6) {
  const words = theme.ads || ADS[theme.id] || ADS.nyc;
  // Pool the board faces per street: one texture+material per ad word x hue
  // bucket. Same variety on screen, but nothing new allocated per chunk.
  const wi = (Math.random() * words.length) | 0;
  const hi = (Math.random() * 5) | 0;
  const faceMat = cached(`bbMat:${sKey(theme)}:${wi}:${hi}`, () => {
    const text = words[wi];
    const hue = (hi * 71 + wi * 37) % 360;
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
    return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.35 });
  });
  const board = new THREE.Mesh(boxGeo,
    [mats.black, mats.black, mats.black, mats.black, faceMat, mats.black]);
  board.scale.set(w, h, 0.2);
  board.castShadow = true;
  return board;
}

export function makeAwning(theme) {
  const g = new THREE.Group();
  const shops = theme.storefront || ['#b03030', '#306b40'];
  const ci = (Math.random() * shops.length) | 0;
  const awnMat = cached(`awnMat:${sKey(theme)}:${ci}`, () => {
    const tex = canvasTexture(128, 64, (g2) => {
      g2.fillStyle = shops[ci]; g2.fillRect(0, 0, 128, 64);
      g2.fillStyle = 'rgba(255,255,255,.9)';
      for (let x = 0; x < 128; x += 24) g2.fillRect(x, 0, 12, 64);
      g2.fillStyle = 'rgba(0,0,0,.15)'; g2.fillRect(0, 56, 128, 8);
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  });
  const awn = new THREE.Mesh(boxGeo, awnMat);
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

// Paris Morris advertising column.
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

// NYC corner newsstand.
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

// ---- new street-specific props ----

// Belisha beacon: striped pole with a glowing orange globe (London crossings).
function makeBeacon() {
  const g = new THREE.Group();
  const stripeTex = cached('beaconTex', () => canvasTexture(16, 64, (c) => {
    for (let y = 0; y < 64; y += 8) {
      c.fillStyle = (y / 8) % 2 ? '#1a1a20' : '#f4f2ec';
      c.fillRect(0, y, 16, 8);
    }
  }));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8),
    cached('mat:beaconPole', () => new THREE.MeshStandardMaterial({ map: cache.get('beaconTex'), roughness: 0.6 })));
  pole.position.y = 1.4; pole.castShadow = true;
  g.add(pole);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.orangeGlow);
  globe.position.y = 2.95;
  g.add(globe);
  return g;
}

// Standing playbill poster board (Broadway).
function makePlaybill(theme) {
  const g = new THREE.Group();
  const words = theme.ads || BRANDS.show;
  const wi = (Math.random() * words.length) | 0;
  const boardMat = cached(`playbillMat:${sKey(theme)}:${wi}`, () => {
    const tex = canvasTexture(128, 192, (c) => {
      c.fillStyle = '#17141c'; c.fillRect(0, 0, 128, 192);
      c.fillStyle = '#f4eede'; c.fillRect(10, 10, 108, 172);
      c.fillStyle = `hsl(${(wi * 67) % 360},72%,46%)`;
      c.fillRect(16, 16, 96, 96);
      c.fillStyle = '#f8e8a0';
      c.beginPath(); c.arc(64, 60, 26, 0, 7); c.fill();
      c.fillStyle = '#222'; c.font = '900 17px Arial'; c.textAlign = 'center';
      c.fillText(words[wi], 64, 132, 100);
      c.fillStyle = '#8a1626';
      c.fillRect(20, 146, 88, 6); c.fillRect(28, 160, 72, 6);
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  });
  const board = new THREE.Mesh(boxGeo, boardMat);
  board.scale.set(1.0, 1.5, 0.12);
  board.position.y = 1.05;
  board.castShadow = true;
  g.add(board);
  const frame = new THREE.Mesh(boxGeo, mats.gold);
  frame.scale.set(1.1, 1.6, 0.08);
  frame.position.y = 1.05;
  g.add(frame);
  return g;
}

// Small STAGE DOOR wall sign on a pole.
function makeStageDoor() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), mats.black);
  pole.position.y = 1.3;
  g.add(pole);
  const tex = cached('stageDoorTex', () => canvasTexture(128, 48, (c) => {
    c.fillStyle = '#17141c'; c.fillRect(0, 0, 128, 48);
    c.strokeStyle = '#d4a437'; c.lineWidth = 4; c.strokeRect(3, 3, 122, 42);
    c.fillStyle = '#ffe9a0'; c.font = '900 20px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('STAGE DOOR', 64, 25, 116);
  }));
  const sign = new THREE.Mesh(boxGeo,
    cached('mat:stageDoor', () => new THREE.MeshStandardMaterial({
      map: cache.get('stageDoorTex'), emissive: 0xffffff, emissiveMap: cache.get('stageDoorTex'), emissiveIntensity: 0.7 })));
  sign.scale.set(1.3, 0.5, 0.08);
  sign.position.y = 2.5;
  g.add(sign);
  return g;
}

// Crowd-control barrier (Times Square / Piccadilly).
function makeBarrier() {
  const g = new THREE.Group();
  for (const zx of [-0.9, 0.9]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), mats.chrome);
    post.position.set(zx, 0.5, 0);
    g.add(post);
  }
  for (const yy of [0.45, 0.85]) {
    const bar = new THREE.Mesh(boxGeo, mats.chrome);
    bar.scale.set(1.9, 0.06, 0.05);
    bar.position.y = yy;
    g.add(bar);
  }
  return g;
}

// Doorway topiary in a stone planter (5th Avenue).
function makeTopiary() {
  const g = new THREE.Group();
  const planter = new THREE.Mesh(boxGeo, mats.stone);
  planter.scale.set(0.7, 0.55, 0.7);
  planter.position.y = 0.28;
  g.add(planter);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), mats.trunk);
  stem.position.y = 0.85;
  g.add(stem);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), mats.leafDark);
  ball.position.y = 1.5;
  ball.castShadow = true;
  g.add(ball);
  return g;
}

// Vertical luxury flag hung perpendicular to a facade (5th Avenue).
function makeFlagBanner(theme) {
  const g = new THREE.Group();
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6), mats.gold);
  rod.rotation.z = Math.PI / 2;
  g.add(rod);
  const cols = theme.storefront || ['#1a2a44'];
  const ci = (Math.random() * cols.length) | 0;
  const flagMat = cached(`flagMat:${sKey(theme)}:${ci}`, () => {
    const tex = canvasTexture(64, 128, (g2) => {
      g2.fillStyle = cols[ci]; g2.fillRect(0, 0, 64, 128);
      g2.strokeStyle = 'rgba(232,200,120,.9)'; g2.lineWidth = 4;
      g2.strokeRect(6, 6, 52, 116);
      g2.fillStyle = 'rgba(232,200,120,.95)';
      g2.beginPath(); g2.arc(32, 52, 14, 0, 7); g2.fill();
      g2.fillRect(18, 84, 28, 5);
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  });
  const flag = new THREE.Mesh(boxGeo, flagMat);
  flag.scale.set(1.0, 2.0, 0.04);
  flag.position.set(0, -1.15, 0);
  g.add(flag);
  return g;
}

// Café terrace: rattan chairs + round tables behind a planter (Champs).
function makeTerrace(white = false) {
  const g = new THREE.Group();
  const tableMat = white ? mats.white : mats.rattan;
  for (let i = 0; i < 2; i++) {
    const tx = -0.9 + i * 1.8;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 10), tableMat);
    top.position.set(tx, 0.72, 0);
    g.add(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), mats.black);
    leg.position.set(tx, 0.36, 0);
    g.add(leg);
    for (const cz of [-0.62, 0.62]) {
      const seat = new THREE.Mesh(boxGeo, tableMat);
      seat.scale.set(0.4, 0.07, 0.4);
      seat.position.set(tx, 0.45, cz);
      g.add(seat);
      const back = new THREE.Mesh(boxGeo, tableMat);
      back.scale.set(0.4, 0.45, 0.06);
      back.position.set(tx, 0.68, cz + (cz > 0 ? 0.18 : -0.18));
      g.add(back);
    }
    if (white) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.7, 6), mats.chrome);
      pole.position.set(tx, 1.55, 0);
      g.add(pole);
      const umb = new THREE.Mesh(new THREE.ConeGeometry(1.05, 0.5, 10), mats.white);
      umb.position.set(tx, 2.45, 0);
      umb.castShadow = true;
      g.add(umb);
    }
  }
  const planter = new THREE.Mesh(boxGeo, mats.darkGreen);
  planter.scale.set(2.6, 0.5, 0.25);
  planter.position.set(0, 0.25, white ? 1.1 : -1.05);
  g.add(planter);
  return g;
}

// Bistro table with red-checked cloth (Montmartre).
function makeBistroTable() {
  const g = new THREE.Group();
  const checkTex = cached('checkClothTex', () => canvasTexture(64, 64, (c) => {
    c.fillStyle = '#f4f0e4'; c.fillRect(0, 0, 64, 64);
    c.fillStyle = '#c0273a';
    for (let x = 0; x < 64; x += 16) c.fillRect(x, 0, 8, 64);
    c.fillStyle = 'rgba(192,39,58,.75)';
    for (let y = 0; y < 64; y += 16) c.fillRect(0, y, 64, 8);
  }));
  const cloth = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 0.5, 10),
    cached('mat:checkCloth', () => new THREE.MeshStandardMaterial({ map: cache.get('checkClothTex'), roughness: 0.85 })));
  cloth.position.y = 0.55;
  cloth.castShadow = true;
  g.add(cloth);
  for (const cz of [-0.68, 0.68]) {
    const seat = new THREE.Mesh(boxGeo, mats.trunk);
    seat.scale.set(0.38, 0.06, 0.38);
    seat.position.set(0, 0.44, cz);
    g.add(seat);
    const back = new THREE.Mesh(boxGeo, mats.trunk);
    back.scale.set(0.38, 0.42, 0.05);
    back.position.set(0, 0.66, cz + (cz > 0 ? 0.17 : -0.17));
    g.add(back);
  }
  return g;
}

// Artist's easel with a little canvas (Montmartre / Navona).
function makeEasel() {
  const g = new THREE.Group();
  const legMat = mats.trunk;
  for (const [lx, rz] of [[-0.35, 0.16], [0.35, 0.16], [0, -0.3]]) {
    const leg = new THREE.Mesh(boxGeo, legMat);
    leg.scale.set(0.06, 1.7, 0.06);
    leg.position.set(lx, 0.85, rz === -0.3 ? -0.25 : 0.1);
    leg.rotation.x = rz;
    g.add(leg);
  }
  const vi = (Math.random() * 4) | 0;
  const canvMat = cached(`easelMat:${vi}`, () => {
    const tex = canvasTexture(64, 48, (c) => {
      c.fillStyle = '#f8f4ea'; c.fillRect(0, 0, 64, 48);
      // tiny impressionist scene, one per variant
      c.fillStyle = ['#9ec4e8', '#c8a8e0', '#f0c890', '#a8d8c0'][vi]; c.fillRect(4, 4, 56, 22);
      c.fillStyle = ['#e8b25c', '#8ab86a', '#d88a6a', '#c8b060'][vi]; c.fillRect(4, 26, 56, 18);
      c.fillStyle = '#f4f4f4';
      c.beginPath(); c.arc(46, 12, 6, 0, 7); c.fill();
      c.fillStyle = '#b0472e'; c.fillRect(10 + vi * 4, 18, 14, 12);
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  });
  const canv = new THREE.Mesh(boxGeo, canvMat);
  canv.scale.set(0.75, 0.55, 0.04);
  canv.position.set(0, 1.1, 0.14);
  canv.rotation.x = 0.12;
  g.add(canv);
  return g;
}

// Artist's stall: paintings board + awning (Navona).
function makeArtStall() {
  const g = new THREE.Group();
  const tex = cached('artStallTex', () => canvasTexture(128, 96, (c) => {
    c.fillStyle = '#5a4632'; c.fillRect(0, 0, 128, 96);
    for (let i = 0; i < 6; i++) {
      const x = 6 + (i % 3) * 42, y = 6 + ((i / 3) | 0) * 46;
      c.fillStyle = '#f4eede'; c.fillRect(x, y, 36, 38);
      c.fillStyle = `hsl(${20 + Math.random() * 220 | 0},55%,55%)`;
      c.fillRect(x + 3, y + 3, 30, 24);
      c.fillStyle = '#c8a050'; c.fillRect(x + 3, y + 30, 30, 4);
    }
  }));
  const board = new THREE.Mesh(boxGeo,
    cached('mat:artStall', () => new THREE.MeshStandardMaterial({ map: cache.get('artStallTex'), roughness: 0.85 })));
  board.scale.set(2.2, 1.6, 0.14);
  board.position.y = 1.1;
  board.rotation.x = -0.08;
  board.castShadow = true;
  g.add(board);
  for (const lx of [-0.95, 0.95]) {
    const leg = new THREE.Mesh(boxGeo, mats.trunk);
    leg.scale.set(0.08, 1.0, 0.08);
    leg.position.set(lx, 0.5, 0);
    g.add(leg);
  }
  return g;
}

// Souvenir stall under the Rivoli arches.
function makeSouvenirStall() {
  const g = new THREE.Group();
  const tex = cached('souvTex', () => canvasTexture(128, 96, (c) => {
    c.fillStyle = '#3a5a3c'; c.fillRect(0, 0, 128, 96);
    // postcards + trinkets
    for (let i = 0; i < 8; i++) {
      const x = 6 + (i % 4) * 30, y = 8 + ((i / 4) | 0) * 44;
      c.fillStyle = '#f4eede'; c.fillRect(x, y, 24, 34);
      c.fillStyle = `hsl(${(Math.random() * 360) | 0},60%,58%)`;
      c.fillRect(x + 2, y + 2, 20, 22);
    }
  }));
  const body = new THREE.Mesh(boxGeo,
    cached('mat:souvBody', () => new THREE.MeshStandardMaterial({ color: 0x2d5a34, roughness: 0.8 })));
  body.scale.set(1.7, 1.3, 0.9);
  body.position.y = 0.65;
  body.castShadow = true;
  g.add(body);
  const rack = new THREE.Mesh(boxGeo,
    cached('mat:souvRack', () => new THREE.MeshStandardMaterial({ map: cache.get('souvTex'), roughness: 0.85 })));
  rack.scale.set(1.5, 1.1, 0.08);
  rack.position.set(0, 0.85, 0.48);
  g.add(rack);
  return g;
}

// "ABBEY ROAD NW8" street nameplate on a pole.
function makeStreetSign() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), mats.black);
  pole.position.y = 1.2;
  g.add(pole);
  const tex = cached('abbeySignTex', () => canvasTexture(256, 48, (c) => {
    c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, 256, 48);
    c.strokeStyle = '#1a1a20'; c.lineWidth = 4; c.strokeRect(2, 2, 252, 44);
    c.fillStyle = '#1a1a20'; c.font = '700 26px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('ABBEY ROAD NW8', 128, 25, 240);
  }));
  const sign = new THREE.Mesh(boxGeo,
    cached('mat:abbeySign', () => new THREE.MeshStandardMaterial({ map: cache.get('abbeySignTex'), roughness: 0.7 })));
  sign.scale.set(2.2, 0.42, 0.06);
  sign.position.y = 2.3;
  g.add(sign);
  return g;
}

// Parked pastel classic beetle (Abbey Road).
const BEETLE_COLORS = [0xf2c4d0, 0xa8d8e8, 0xf6e6a8, 0xc4e8c4, 0xe8d0f0, 0xf4f2ec];

export function makeParkedCar(theme) {
  if (theme.parked === 'vespa') return makeParkedVespa();
  const beetle = theme.parked === 'beetle';
  const g = new THREE.Group();
  const col = beetle
    ? BEETLE_COLORS[(Math.random() * BEETLE_COLORS.length) | 0]
    : theme.id === 'nyc' && Math.random() < 0.35
      ? 0xffc020
      : PARKED_COLORS[(Math.random() * PARKED_COLORS.length) | 0];
  const bodyMat = cached(`mat:car:${col}`, () =>
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.28, metalness: 0.25 }));
  const glassMat = cached('mat:carGlass', () =>
    new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
  if (beetle) {
    // rounded classic: low body + dome cabin
    const body = new THREE.Mesh(boxGeo, bodyMat);
    body.scale.set(1.5, 0.5, 3.1);
    body.position.y = 0.55; body.castShadow = true; g.add(body);
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 1.44, 12, 1, false, 0, Math.PI), bodyMat);
    dome.rotation.z = Math.PI / 2;
    dome.rotation.y = Math.PI / 2;
    dome.position.set(0, 0.78, -0.1);
    dome.castShadow = true; g.add(dome);
    const glass = new THREE.Mesh(boxGeo, glassMat);
    glass.scale.set(1.3, 0.36, 1.3);
    glass.position.set(0, 1.02, -0.1); g.add(glass);
    const bumper = new THREE.Mesh(boxGeo, mats.chrome);
    bumper.scale.set(1.55, 0.14, 0.12);
    bumper.position.set(0, 0.38, 1.62); g.add(bumper);
  } else {
    const body = new THREE.Mesh(boxGeo, bodyMat);
    body.scale.set(1.6, 0.55, 3.7);
    body.position.y = 0.58; body.castShadow = true; g.add(body);
    const glass = new THREE.Mesh(boxGeo, glassMat);
    glass.scale.set(1.42, 0.42, 1.95);
    glass.position.set(0, 1.05, -0.15); g.add(glass);
    const roof = new THREE.Mesh(boxGeo, bodyMat);
    roof.scale.set(1.34, 0.1, 1.8);
    roof.position.set(0, 1.3, -0.15); g.add(roof);
  }
  const wm = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  const zz = beetle ? 1.0 : 1.15;
  for (const p of [[-0.78, 0.32, zz], [0.78, 0.32, zz], [-0.78, 0.32, -zz], [0.78, 0.32, -zz]]) {
    const w = new THREE.Mesh(wheelGeo, wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    g.add(w);
  }
  return g;
}

function makeParkedVespa() {
  const g = new THREE.Group();
  const col = [0x7fd0e8, 0xf2c4d0, 0xf6e6a8, 0xc4e8c4][(Math.random() * 4) | 0];
  const bodyMat = cached(`mat:pvespa:${col}`, () =>
    new THREE.MeshStandardMaterial({ color: col, roughness: 0.3, metalness: 0.3 }));
  const body = new THREE.Mesh(boxGeo, bodyMat);
  body.scale.set(0.5, 0.45, 1.5);
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  const shield = new THREE.Mesh(boxGeo, bodyMat);
  shield.scale.set(0.45, 0.65, 0.1);
  shield.position.set(0, 0.85, 0.65);
  shield.rotation.x = -0.15; g.add(shield);
  const seat = new THREE.Mesh(boxGeo, mats.black);
  seat.scale.set(0.4, 0.12, 0.7);
  seat.position.set(0, 0.84, -0.3); g.add(seat);
  const bar = new THREE.Mesh(boxGeo, mats.chrome);
  bar.scale.set(0.6, 0.05, 0.05);
  bar.position.set(0, 1.2, 0.62); g.add(bar);
  const wm = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  for (const z of [0.62, -0.62]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.14, 10), wm);
    w.rotation.z = Math.PI / 2;
    w.position.set(0, 0.24, z);
    g.add(w);
  }
  return g;
}

export function makeProp(kind, theme) {
  switch (kind) {
    case 'lamp': case 'lamp_paris': case 'lamp_london': case 'lamp_rome': return makeLamp(theme);
    case 'tree': return makeTree('round');
    case 'cypress': return makeTree('cypress');
    case 'chestnut': return makeTree('chestnut');
    case 'planetree': return makeTree('plane');
    case 'phonebox': return makePhonebox();
    case 'postbox': return makePostbox();
    case 'hydrant': return makeHydrant();
    case 'column': return makeColumn();
    case 'billboard': { const b = makeBillboard(theme); b.position.y = 5 + Math.random() * 3; return b; }
    case 'awning': return makeAwning(theme);
    case 'fountain': return makeFountain();
    case 'kiosk': return makeMorrisColumn(theme);
    case 'newsstand': return makeNewsstand(theme);
    case 'beacon': return makeBeacon();
    case 'playbill': return makePlaybill(theme);
    case 'stagedoor': return makeStageDoor();
    case 'barrier': return makeBarrier();
    case 'topiary': return makeTopiary();
    case 'flagbanner': return makeFlagBanner(theme);
    case 'terrace_cafe': return makeTerrace(false);
    case 'terrace_white': return makeTerrace(true);
    case 'bistro': return makeBistroTable();
    case 'easel': return makeEasel();
    case 'artstall': return makeArtStall();
    case 'souvenirstall': return makeSouvenirStall();
    case 'streetsign': return makeStreetSign();
    case 'hedge': return makeGardenWall(theme, 2.6);
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
// styles: 'string' bulbs, 'festoon' bulbs (shallower sag), 'bunting', 'tricolor'
export function makeStreetSpan(theme, width = 13) {
  const g = new THREE.Group();
  const style = theme.span
    || (theme.id === 'rome' ? 'string' : theme.id === 'london' ? 'bunting' : 'tricolor');
  const wire = new THREE.Mesh(boxGeo,
    cached('mat:wire', () => new THREE.MeshStandardMaterial({ color: 0x4a4a54, roughness: 0.8 })));
  wire.scale.set(width, 0.022, 0.022);
  g.add(wire);
  const n = 11;
  if (style === 'string' || style === 'festoon') {
    // shallow sag: a deep catenary dips straight through the vanishing point
    // on a narrow portrait frame
    const sag = style === 'string' ? 0.3 : 0.2;
    const bulbMat = cached('mat:bulb', () =>
      new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffdf90, emissiveIntensity: 2.6 }));
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set((t - 0.5) * width, -0.18 - Math.sin(t * Math.PI) * sag, 0);
      g.add(bulb);
    }
  } else {
    const cols = style === 'bunting'
      ? [0xc8102e, 0xffffff, 0x012169]
      : [0x1f4a8a, 0xffffff, 0xd41f38];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const f = new THREE.Mesh(cached('geo:buntFlag', () => new THREE.ConeGeometry(0.16, 0.36, 4)),
        cached(`mat:flag:${style}:${i % 3}`, () =>
          new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.8 })));
      f.rotation.x = Math.PI;
      f.position.set((t - 0.5) * width, -0.24 - Math.sin(t * Math.PI) * 0.28, 0);
      g.add(f);
    }
  }
  return g;
}

// ---------- vehicles ----------
const PARKED_COLORS = [0xe84a3a, 0x3a78d8, 0x3fae5c, 0xf2b800, 0xe8e8ec, 0x8a4fd0, 0x2a2e38, 0xd86aa8];

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
    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.6, 12, 1, false, 0, Math.PI),
      bodyMat);
    cabin.rotation.z = Math.PI / 2;
    cabin.rotation.y = Math.PI / 2;
    cabin.position.set(0, 1.05, -0.2);
    cabin.castShadow = true; g.add(cabin);
    const shield = new THREE.Mesh(boxGeo, glassMat);
    shield.scale.set(1.4, 0.55, 0.08);
    shield.rotation.x = -0.35;
    shield.position.set(0, 1.42, 0.68); g.add(shield);
    const bumper = new THREE.Mesh(boxGeo, mats.chrome);
    bumper.scale.set(1.85, 0.22, 0.15);
    bumper.position.set(0, 0.45, 1.98); g.add(bumper);
    for (const sx of [-0.62, 0.62]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mats.glow);
      lamp.position.set(sx, 0.95, 1.96); g.add(lamp);
    }
  }
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

// ---------- large set pieces (spawned by the track per street) ----------

// Rivoli: one chunk-length of arcade colonnade for one side of the street.
// Real semicircular arches on square piers, deeply shadowed, with a lantern
// hung in every bay. This colonnade is the whole point of Rue de Rivoli.
export function makeArcade(theme, len, side) {
  const g = new THREE.Group();
  const inner = -side;                   // local +x direction toward the road
  const stoneMat = cached('mat:arcadeStone', () =>
    new THREE.MeshStandardMaterial({ color: 0xe8dfc6, roughness: 0.85 }));
  const shadeMat = cached('mat:arcadeShade', () =>   // recessed, in shadow
    new THREE.MeshStandardMaterial({ color: 0x8f8266, roughness: 0.95 }));

  const roof = new THREE.Mesh(boxGeo, stoneMat);
  roof.scale.set(3.8, 0.7, len);
  roof.position.set(0, 4.95, -len / 2);
  roof.castShadow = true;
  g.add(roof);
  // string course under the roof slab
  const band = new THREE.Mesh(boxGeo, shadeMat);
  band.scale.set(3.9, 0.16, len);
  band.position.set(0, 4.52, -len / 2);
  g.add(band);
  // warm glowing vault ceiling
  const ceil = new THREE.Mesh(boxGeo, cached('mat:arcadeCeil', () =>
    new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffd98a, emissiveIntensity: 0.7 })));
  ceil.scale.set(3.4, 0.06, len - 0.2);
  ceil.position.set(0, 4.34, -len / 2);
  g.add(ceil);

  const BAY = 3.0, R = 1.16, SPRING = 2.5, PX = inner * 1.55;
  const pierGeo = cached('geo:arcPier', () => new THREE.BoxGeometry(0.62, SPRING, 0.72));
  const capGeo = cached('geo:arcCap', () => new THREE.BoxGeometry(0.76, 0.2, 0.9));
  const baseGeo = cached('geo:arcBase', () => new THREE.BoxGeometry(0.8, 0.24, 0.94));
  const ringGeo = cached('geo:arcRing', () =>
    new THREE.TorusGeometry(R, 0.16, 6, 14, Math.PI));
  const softGeo = cached('geo:arcSoffit', () =>   // shadowed reveal behind the ring
    new THREE.TorusGeometry(R, 0.3, 5, 12, Math.PI));
  const spandrelGeo = cached('geo:arcSpandrel', () => new THREE.BoxGeometry(0.52, 0.9, BAY));
  const hauncGeo = cached('geo:arcHaunch', () => new THREE.BoxGeometry(0.52, 0.95, 0.62));

  for (let z = 1.5; z < len; z += BAY) {
    const pier = new THREE.Mesh(pierGeo, stoneMat);
    pier.position.set(PX, SPRING / 2 + 0.12, -z);
    pier.castShadow = true;
    g.add(pier);
    const cap = new THREE.Mesh(capGeo, stoneMat);
    cap.position.set(PX, SPRING + 0.2, -z);
    g.add(cap);
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.set(PX, 0.12, -z);
    g.add(base);
    if (z + BAY > len) continue;
    const az = -z - BAY / 2;
    // shadowed reveal first, bright archivolt in front of it
    const soffit = new THREE.Mesh(softGeo, shadeMat);
    soffit.position.set(PX - inner * 0.16, SPRING + 0.22, az);
    soffit.rotation.y = Math.PI / 2;
    g.add(soffit);
    const ring = new THREE.Mesh(ringGeo, stoneMat);
    ring.position.set(PX + inner * 0.18, SPRING + 0.22, az);
    ring.rotation.y = Math.PI / 2;
    ring.castShadow = true;
    g.add(ring);
    // keystone
    const key = new THREE.Mesh(boxGeo, stoneMat);
    key.scale.set(0.6, 0.42, 0.3);
    key.position.set(PX + inner * 0.06, SPRING + R + 0.26, az);
    g.add(key);
    // masonry above the arch
    const sp = new THREE.Mesh(spandrelGeo, stoneMat);
    sp.position.set(PX, SPRING + R + 0.85, az);
    g.add(sp);
    for (const s of [-1, 1]) {           // haunch fills beside the arch crown
      const h = new THREE.Mesh(hauncGeo, stoneMat);
      h.position.set(PX, SPRING + 0.72, az + s * (BAY / 2 - 0.31));
      g.add(h);
    }
    // hanging lantern in the bay
    const rod = new THREE.Mesh(cached('geo:arcRod', () =>
      new THREE.CylinderGeometry(0.028, 0.028, 0.5, 5)), mats.black);
    rod.position.set(PX - inner * 0.55, 4.05, az);
    g.add(rod);
    const lant = new THREE.Mesh(cached('geo:arcLant', () =>
      new THREE.CylinderGeometry(0.2, 0.15, 0.38, 6)), mats.glow);
    lant.position.set(PX - inner * 0.55, 3.66, az);
    g.add(lant);
  }
  return g;
}

// Rivoli garden side: formal railings + greenery instead of buildings.
export function makeGardenRail(theme, len) {
  const g = new THREE.Group();
  const railMat = cached('mat:rail', () =>
    new THREE.MeshStandardMaterial({ color: 0x1e2a22, roughness: 0.5, metalness: 0.5 }));
  const top = new THREE.Mesh(boxGeo, railMat);
  top.scale.set(0.06, 0.06, len);
  top.position.set(0, 1.5, -len / 2);
  g.add(top);
  const mid = new THREE.Mesh(boxGeo, railMat);
  mid.scale.set(0.05, 0.05, len);
  mid.position.set(0, 0.8, -len / 2);
  g.add(mid);
  const barGeo = cached('geo:railbar', () => new THREE.CylinderGeometry(0.025, 0.025, 1.5, 5));
  for (let z = 0.5; z < len; z += 1.1) {
    const bar = new THREE.Mesh(barGeo, railMat);
    bar.position.set(0, 0.75, -z);
    g.add(bar);
    if (((z / 1.1) | 0) % 6 === 0) {
      const fin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mats.gold);
      fin.position.set(0, 1.62, -z);
      g.add(fin);
    }
  }
  // low clipped hedge tucked behind the railing (the garden itself is built
  // by makeGardenParterre, so this stays below the top rail)
  const hedge = new THREE.Mesh(boxGeo, cached('mat:hedge', () =>
    new THREE.MeshStandardMaterial({ color: 0x2f5c30, roughness: 0.95 })));
  hedge.scale.set(0.9, 0.85, len);
  hedge.position.set(-0.85, 0.42, -len / 2);
  g.add(hedge);
  return g;
}

// Montmartre: plain red windmill with CABARET sign.
export function makeWindmill() {
  const g = new THREE.Group();
  const redMat = cached('mat:moulinRed', () =>
    new THREE.MeshStandardMaterial({ color: 0xb01c2e, roughness: 0.6 }));
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, 6.5, 12), redMat);
  tower.position.y = 3.25;
  tower.castShadow = true;
  g.add(tower);
  const roofM = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.8, 12), redMat);
  roofM.position.y = 7.4;
  roofM.castShadow = true;
  g.add(roofM);
  // four lattice blades
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mats.black);
  hub.position.set(0, 6.4, 2.1);
  g.add(hub);
  const bladeMat = cached('mat:blade', () =>
    new THREE.MeshStandardMaterial({ color: 0x8a1c28, roughness: 0.7 }));
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(boxGeo, bladeMat);
    blade.scale.set(0.5, 3.4, 0.08);
    const a = Math.PI / 4 + i * Math.PI / 2;
    blade.position.set(Math.sin(a) * 1.9, 6.4 + Math.cos(a) * 1.9, 2.15);
    blade.rotation.z = -a;
    g.add(blade);
  }
  // CABARET sign
  const tex = cached('cabaretTex', () => canvasTexture(256, 48, (c) => {
    c.fillStyle = '#8a1c28'; c.fillRect(0, 0, 256, 48);
    c.fillStyle = '#ffe27a'; c.font = '900 34px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('CABARET', 128, 26);
    c.fillStyle = '#fff0c0';
    for (let x = 10; x < 256; x += 20) { c.beginPath(); c.arc(x, 6, 3, 0, 7); c.fill(); }
  }));
  const sign = new THREE.Mesh(boxGeo,
    cached('mat:cabaret', () => new THREE.MeshStandardMaterial({
      map: cache.get('cabaretTex'), emissive: 0xffffff, emissiveMap: cache.get('cabaretTex'), emissiveIntensity: 1.1 })));
  sign.scale.set(3.6, 0.7, 0.15);
  sign.position.set(0, 4.6, 2.15);
  g.add(sign);
  return g;
}

// Navona: obelisk rising from a rocky fountain.
export function makeObeliskFountain() {
  const g = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.55, 14), mats.travertine);
  basin.position.y = 0.28;
  basin.castShadow = true;
  g.add(basin);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.12, 14),
    cached('mat:water', () => new THREE.MeshStandardMaterial({ color: 0x4aa2c8, roughness: 0.12, metalness: 0.3 })));
  water.position.y = 0.56;
  g.add(water);
  // rocky outcrop
  const rockMat = cached('mat:rock', () =>
    new THREE.MeshStandardMaterial({ color: 0xc8b088, roughness: 0.95 }));
  for (let i = 0; i < 4; i++) {
    const rock = new THREE.Mesh(cached('geo:rock', () => new THREE.IcosahedronGeometry(0.7, 0)), rockMat);
    rock.position.set(Math.sin(i * 1.7) * 0.7, 0.85, Math.cos(i * 1.7) * 0.7);
    rock.rotation.set(i, i * 2, 0);
    rock.castShadow = true;
    g.add(rock);
  }
  // 4-sided tapering obelisk + gold tip
  const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.48, 5.2, 4), mats.travertine);
  obelisk.rotation.y = Math.PI / 4;
  obelisk.position.y = 3.9;
  obelisk.castShadow = true;
  g.add(obelisk);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.6, 4), mats.gold);
  tip.rotation.y = Math.PI / 4;
  tip.position.y = 6.75;
  g.add(tip);
  return g;
}

// Rivoli: gilded equestrian statue on a stone plinth.
export function makeEquestrian() {
  const g = new THREE.Group();
  const plinth = new THREE.Mesh(boxGeo, mats.stone);
  plinth.scale.set(1.8, 2.2, 2.8);
  plinth.position.y = 1.1;
  plinth.castShadow = true;
  g.add(plinth);
  const gold = mats.gold;
  const body = new THREE.Mesh(boxGeo, gold);
  body.scale.set(0.7, 0.9, 2.2);
  body.position.y = 3.1;
  body.castShadow = true;
  g.add(body);
  const neck = new THREE.Mesh(boxGeo, gold);
  neck.scale.set(0.4, 1.1, 0.5);
  neck.position.set(0, 3.9, 1.0);
  neck.rotation.x = 0.5;
  g.add(neck);
  const head = new THREE.Mesh(boxGeo, gold);
  head.scale.set(0.32, 0.35, 0.8);
  head.position.set(0, 4.4, 1.35);
  g.add(head);
  for (const [lx, lz] of [[-0.25, 0.8], [0.25, 0.8], [-0.25, -0.8], [0.25, -0.8]]) {
    const leg = new THREE.Mesh(boxGeo, gold);
    leg.scale.set(0.16, 1.0, 0.16);
    leg.position.set(lx, 2.2, lz);
    g.add(leg);
  }
  const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.7, 4, 8), gold);
  rider.position.set(0, 4.2, -0.2);
  g.add(rider);
  const rHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), gold);
  rHead.position.set(0, 4.85, -0.2);
  g.add(rHead);
  return g;
}

// Piccadilly: winged-archer fountain (memorial style, aluminum figure).
export function makeErosFountain() {
  const g = new THREE.Group();
  const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.5, 16), mats.bronze);
  basin.position.y = 0.25;
  basin.castShadow = true;
  g.add(basin);
  // tiered pedestal
  for (let i = 0; i < 3; i++) {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - i * 0.42, 1.7 - i * 0.42, 0.9, 12), mats.bronze);
    tier.position.y = 0.9 + i * 0.9;
    tier.castShadow = true;
    g.add(tier);
  }
  // winged archer on one leg
  const fig = mats.chrome;
  const bodyF = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.75, 4, 8), fig);
  bodyF.position.y = 4.35;
  bodyF.rotation.z = 0.3;
  g.add(bodyF);
  const headF = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), fig);
  headF.position.set(0.24, 4.98, 0);
  g.add(headF);
  const legF = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 6), fig);
  legF.position.set(-0.3, 3.7, 0);
  legF.rotation.z = -0.7;
  g.add(legF);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.1, 5), fig);
    wing.position.set(-0.25, 4.6, s * 0.3);
    wing.rotation.z = 2.4;
    wing.rotation.x = s * 0.5;
    g.add(wing);
  }
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 5, 10, Math.PI), fig);
  bow.position.set(0.55, 4.5, 0);
  bow.rotation.z = -0.5;
  g.add(bow);
  return g;
}

// Piccadilly: giant curved stacked-LED corner building.
export function makeCurvedLED(theme) {
  const g = new THREE.Group();
  const h = 26;
  const r = 8;
  const wallMat = cached('mat:ledWall', () =>
    new THREE.MeshStandardMaterial({ color: 0x2a2a34, roughness: 0.8, side: THREE.DoubleSide }));
  const wall = new THREE.Mesh(
    cached('geo:ledWall', () => new THREE.CylinderGeometry(8, 8, 26, 18, 1, true, 0, Math.PI * 0.6)),
    wallMat);
  wall.position.y = h / 2;
  g.add(wall);
  // stacked curved boards
  const boardGeo = cached('geo:ledBoard', () =>
    new THREE.CylinderGeometry(8.15, 8.15, 3.6, 18, 1, true, 0.05, Math.PI * 0.6 - 0.1));
  for (let i = 0; i < 4; i++) {
    const words = theme.ads || ['WEST END', 'REVUE ROYALE', 'GINGER SNAP', 'LITES'];
    const text = words[i % words.length];
    const hue = (30 + i * 85) % 360;
    const tex = cached(`ledTex:${sKey(theme)}:${i}`, () => canvasTexture(512, 96, (c) => {
      const bg = c.createLinearGradient(0, 0, 512, 0);
      bg.addColorStop(0, `hsl(${hue},95%,55%)`);
      bg.addColorStop(1, `hsl(${(hue + 70) % 360},95%,45%)`);
      c.fillStyle = bg; c.fillRect(0, 0, 512, 96);
      c.fillStyle = 'rgba(255,255,255,.96)';
      c.font = '900 56px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, 256, 50, 480);
      c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 6; c.strokeRect(0, 0, 512, 96);
    }));
    const board = new THREE.Mesh(boardGeo, cached(`ledMat:${sKey(theme)}:${i}`, () =>
      new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.5, side: THREE.DoubleSide })));
    board.position.y = 4 + i * 4.6;
    g.add(board);
  }
  const cap = new THREE.Mesh(boxGeo, wallMat);
  cap.scale.set(2 * r + 0.5, 1, 2 * r + 0.5);
  cap.position.y = h + 0.5;
  g.add(cap);
  return g;
}

// Abbey Road: the zebra crossing — stripes + beacons flanking the road.
export function makeZebra(theme, roadW) {
  const g = new THREE.Group();
  const tex = cached('zebraTex', () => canvasTexture(64, 256, (c) => {
    c.fillStyle = '#4c4c54'; c.fillRect(0, 0, 64, 256);
    c.fillStyle = '#eceae2';
    for (let y = 8; y < 256; y += 48) c.fillRect(0, y, 64, 28);
  }, 1, 1));
  const stripes = new THREE.Mesh(cached('geo:zebra', () => new THREE.PlaneGeometry(1, 1)),
    cached('mat:zebra', () => new THREE.MeshStandardMaterial({ map: cache.get('zebraTex'), roughness: 0.9 })));
  stripes.rotation.x = -Math.PI / 2;
  stripes.rotation.z = Math.PI / 2;
  stripes.scale.set(3.6, roadW + 0.4, 1);
  stripes.position.y = 0.02;
  stripes.receiveShadow = true;
  g.add(stripes);
  for (const side of [-1, 1]) {
    const beacon = makeBeacon();
    beacon.position.set(side * (roadW / 2 + 0.7), 0.3, 0);
    g.add(beacon);
  }
  return g;
}

// Rue de Rivoli garden side: raked gravel walk, clipped box parterres, stone
// urns and a back line of trees — content behind the railing instead of void.
// Local origin sits at the railing; the garden lays out toward -x.
export function makeGardenParterre(theme, len) {
  const g = new THREE.Group();
  // ground the garden sits on (the pavement box stops at the railing)
  const lawn = new THREE.Mesh(boxGeo, mats.gravel);
  lawn.scale.set(15, 0.3, len);
  lawn.position.set(-7.4, -0.15, -len / 2);
  lawn.receiveShadow = true;
  g.add(lawn);
  const walk = new THREE.Mesh(boxGeo,
    cached('mat:gravelWalk', () => new THREE.MeshStandardMaterial({ color: 0xd8c8a4, roughness: 1 })));
  walk.scale.set(3.0, 0.06, len);
  walk.position.set(-4.3, 0.03, -len / 2);
  walk.receiveShadow = true;
  g.add(walk);
  // low clipped box hedges in pairs, with a gravel gap between them
  const bedGeo = cached('geo:parterreBed', () => new THREE.BoxGeometry(1.5, 0.75, 3.0));
  const kerbGeo = cached('geo:parterreKerb', () => new THREE.BoxGeometry(1.75, 0.22, 3.25));
  for (let z = 2.5; z < len - 2; z += 6.4) {
    for (const ox of [-2.4, -6.2]) {
      const kerb = new THREE.Mesh(kerbGeo, mats.stone);
      kerb.position.set(ox, 0.26, -z);
      g.add(kerb);
      const bed = new THREE.Mesh(bedGeo, mats.leafDark);
      bed.position.set(ox, 0.55, -z);
      bed.castShadow = true;
      g.add(bed);
    }
    // stone urn on the axis between the beds
    const urn = new THREE.Mesh(cached('geo:urn', () => new THREE.CylinderGeometry(0.34, 0.16, 0.62, 10)), mats.stone);
    urn.position.set(-4.3, 0.55, -z - 3.2);
    urn.castShadow = true;
    g.add(urn);
    const plinth = new THREE.Mesh(boxGeo, mats.stone);
    plinth.scale.set(0.5, 0.3, 0.5);
    plinth.position.set(-4.3, 0.31, -z - 3.2);
    g.add(plinth);
    const bloom = new THREE.Mesh(ballGeo, mats.leaf);
    bloom.scale.setScalar(0.3);
    bloom.position.set(-4.3, 0.95, -z - 3.2);
    g.add(bloom);
  }
  // back line of trees closing the garden
  for (let z = 5; z < len; z += 9) {
    const t = makeTree('plane');
    t.position.set(-8.6 - Math.random() * 2.6, 0, -z);
    t.scale.setScalar(0.8);
    g.add(t);
  }
  return g;
}

// Montmartre: the signature stepped street running off the road between two
// buildings — lamp-lit flights climbing into the dark with an iron handrail.
export function makeStepStreet(theme) {
  const g = new THREE.Group();
  const stepGeo = cached('geo:step', () => new THREE.BoxGeometry(4.6, 0.34, 0.85));
  const N = 22;
  for (let i = 0; i < N; i++) {
    const s = new THREE.Mesh(stepGeo, mats.stone);
    s.position.set(0, 0.17 + i * 0.3, -i * 0.8);
    s.receiveShadow = true;
    g.add(s);
    // half-landing every 7 steps reads as a real Montmartre flight
    if (i % 7 === 6) {
      const land = new THREE.Mesh(stepGeo, mats.stone);
      land.scale.z = 1.9;
      land.position.set(0, 0.17 + i * 0.3, -i * 0.8 - 1.1);
      g.add(land);
    }
  }
  // iron handrail up the middle
  const railMat = cached('mat:stepRail', () =>
    new THREE.MeshStandardMaterial({ color: 0x22302a, roughness: 0.5, metalness: 0.5 }));
  const postGeo = cached('geo:stepPost', () => new THREE.CylinderGeometry(0.04, 0.04, 1.0, 6));
  for (let i = 0; i < N; i += 3) {
    const p = new THREE.Mesh(postGeo, railMat);
    p.position.set(0, 0.8 + i * 0.3, -i * 0.8);
    g.add(p);
  }
  const rail = new THREE.Mesh(boxGeo, railMat);
  rail.scale.set(0.07, 0.07, N * 0.86);
  rail.position.set(0, 1.3 + (N * 0.3) / 2, -(N * 0.8) / 2);
  rail.rotation.x = -Math.atan(0.3 / 0.8);
  g.add(rail);
  // two lamps flanking the foot of the stair, one halfway up
  for (const [lx, lz, ly] of [[-1.9, -0.6, 0], [1.9, -0.6, 0], [-1.9, -8.8, 3.3]]) {
    const lamp = makeLamp(theme);
    lamp.position.set(lx, ly, lz);
    lamp.scale.setScalar(0.85);
    g.add(lamp);
  }
  // side walls the stair is cut between
  for (const sx of [-2.9, 2.9]) {
    const wall = new THREE.Mesh(boxGeo, cached('mat:stepWall', () =>
      new THREE.MeshStandardMaterial({ color: 0xe0d6c2, roughness: 0.95 })));
    wall.scale.set(0.7, 6.5, N * 0.85);
    wall.position.set(sx, 3.2, -(N * 0.8) / 2);
    wall.rotation.x = -0.12;
    wall.castShadow = true;
    g.add(wall);
    // ivy tumbling over the wall
    for (let i = 0; i < 7; i++) {
      const iv = new THREE.Mesh(ballGeo, mats.ivy);
      const s = 0.35 + Math.random() * 0.4;
      iv.scale.set(s, s * 0.8, s * 1.3);
      iv.position.set(sx - Math.sign(sx) * 0.3, 5.2 + Math.random() * 1.4 + i * 0.32, -1.5 - i * 2.4);
      g.add(iv);
    }
  }
  return g;
}

// A painter at work: easel, stool, a leaning stack of finished canvases.
export function makeArtistPitch(theme) {
  const g = new THREE.Group();
  const easel = makeEasel();
  easel.rotation.y = 0.5;
  g.add(easel);
  const stool = new THREE.Mesh(cached('geo:stool', () => new THREE.CylinderGeometry(0.22, 0.22, 0.1, 8)), mats.trunk);
  stool.position.set(0.75, 0.62, -0.7);
  g.add(stool);
  for (const lz of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(cached('geo:stoolLeg', () => new THREE.CylinderGeometry(0.03, 0.03, 0.6, 5)), mats.black);
    leg.position.set(0.75, 0.3, -0.7 + lz);
    g.add(leg);
  }
  // finished canvases stacked against the easel
  const stackMat = cached('mat:canvasStack', () =>
    new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.9 }));
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(boxGeo, i === 1 ? mats.leaf : stackMat);
    c.scale.set(0.62, 0.48, 0.05);
    c.position.set(-0.7 + i * 0.07, 0.3, 0.35 + i * 0.06);
    c.rotation.z = 0.18;
    g.add(c);
  }
  return g;
}

// Piazza Navona: a run of canvas-roofed market stalls edging the square.
export function makeSquareStalls(theme, n = 3) {
  const g = new THREE.Group();
  const roofMat = cached('mat:stallRoof', () =>
    new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.9 }));
  const legGeo = cached('geo:stallLeg', () => new THREE.CylinderGeometry(0.045, 0.045, 2.3, 6));
  for (let i = 0; i < n; i++) {
    const z = -i * 3.4;
    const roof = new THREE.Mesh(boxGeo, roofMat);
    roof.scale.set(2.1, 0.09, 3.1);
    roof.position.set(0, 2.35, z);
    roof.castShadow = true;
    g.add(roof);
    const ridge = new THREE.Mesh(coneGeo, roofMat);
    ridge.scale.set(1.5, 0.42, 2.2);
    ridge.position.set(0, 2.55, z);
    g.add(ridge);
    for (const [lx, lz] of [[-0.9, -1.4], [0.9, -1.4], [-0.9, 1.4], [0.9, 1.4]]) {
      const leg = new THREE.Mesh(legGeo, mats.black);
      leg.position.set(lx, 1.15, z + lz);
      g.add(leg);
    }
    const counter = new THREE.Mesh(boxGeo, mats.trunk);
    counter.scale.set(1.9, 0.1, 2.7);
    counter.position.set(0, 1.0, z);
    g.add(counter);
    // wares: framed prints and little masks
    if (i % 2 === 0) {
      const board = makeArtStall();
      board.scale.setScalar(0.8);
      board.position.set(-0.15, 0.25, z);
      g.add(board);
    } else {
      for (let k = 0; k < 4; k++) {
        const mask = new THREE.Mesh(ballGeo, k % 2 ? mats.gold : mats.white);
        mask.scale.set(0.16, 0.2, 0.09);
        mask.position.set(-0.5 + (k % 2) * 0.9, 1.2, z - 0.9 + ((k / 2) | 0) * 1.4);
        g.add(mask);
      }
    }
  }
  return g;
}

// ---------- skyline cameo backdrops ----------
// A flat canvas-drawn silhouette placed beyond the last chunk with fog
// disabled — the haze is baked into the colors, so it always reads as a
// distant landmark closing the vista.
// Every city gets its own far horizon silhouette — the layer you still see on
// a narrow portrait frame after the sidewalks have fallen outside the view.
// Haze is baked into the colours (these materials ignore fog).
function skylineTexture(theme) {
  const fogC = theme.fog;
  const dark = (f) => mixc(fogC, '#2c3454', f);
  const light = (f) => mixc(fogC, '#ffffff', f);
  return cached(`skyline:${theme.id}:${fogC}`, () => canvasTexture(1600, 320, (g) => {
    g.clearRect(0, 0, 1600, 320);
    const GY = 300, CX = 800;
    const box = (x, w, h, f) => { g.fillStyle = dark(f); g.fillRect(x, GY - h, w, h); };

    if (theme.id === 'nyc') {
      // a wall of setback towers, spires and water tanks
      const seed = [
        [-760, 90, 120, .16], [-660, 70, 175, .2], [-580, 110, 130, .14],
        [-450, 80, 215, .24], [-360, 60, 150, .17], [-290, 95, 255, .27],
        [-180, 70, 185, .2], [-100, 120, 145, .15], [40, 85, 235, .26],
        [140, 65, 165, .18], [215, 105, 125, .14], [330, 75, 205, .23],
        [420, 90, 155, .17], [520, 70, 245, .28], [600, 110, 135, .15],
        [720, 80, 190, .21],
      ];
      for (const [x, w, h, f] of seed) {
        box(CX + x, w, h, f);
        if (h > 200) {                       // stepped crown + mast
          box(CX + x + w * 0.2, w * 0.6, h + 34, f + 0.04);
          box(CX + x + w * 0.44, w * 0.12, h + 78, f + 0.06);
        } else if (h > 160) {
          box(CX + x + w * 0.3, w * 0.4, h + 20, f + 0.04);
        } else if (w > 90) {                 // rooftop water tank
          box(CX + x + w * 0.55, 16, h + 20, f + 0.05);
        }
      }
      // a few lit window columns for depth
      g.fillStyle = light(0.13);
      for (let i = 0; i < 90; i++) {
        const x = CX - 780 + Math.random() * 1560;
        const y = GY - 30 - Math.random() * 190;
        g.fillRect(x, y, 3, 6);
      }
    } else if (theme.id === 'paris') {
      // uniform Haussmann roofline, chimney pots, the basilica on its hill,
      // and the lattice tower far right
      g.fillStyle = dark(0.14);
      g.beginPath();                          // Montmartre hill
      g.moveTo(CX - 620, GY);
      g.quadraticCurveTo(CX - 330, GY - 118, CX - 40, GY);
      g.fill();
      const bx = CX - 330, by = GY - 96;      // basilica domes on the hill
      g.fillStyle = light(0.4);
      g.fillRect(bx - 46, by - 44, 92, 44);
      g.beginPath(); g.arc(bx, by - 44, 46, Math.PI, 0); g.fill();
      g.fillRect(bx - 6, by - 108, 12, 24);
      g.beginPath(); g.arc(bx, by - 108, 8, Math.PI, 0); g.fill();
      for (const sx of [-78, 78]) {
        g.fillRect(bx + sx - 20, by - 26, 40, 26);
        g.beginPath(); g.arc(bx + sx, by - 26, 20, Math.PI, 0); g.fill();
      }
      // continuous six-storey roofline with mansards
      for (let x = CX - 800; x < CX + 800; x += 84) {
        const h = 42 + ((x / 84) % 3) * 7;
        box(x, 82, h, 0.3);
        g.fillStyle = dark(0.42);             // mansard slope
        g.beginPath();
        g.moveTo(x + 4, GY - h); g.lineTo(x + 20, GY - h - 17);
        g.lineTo(x + 62, GY - h - 17); g.lineTo(x + 78, GY - h);
        g.fill();
        for (const cx2 of [x + 14, x + 46, x + 70]) g.fillRect(cx2, GY - h - 25, 6, 9);
      }
      // lattice tower, right of centre
      const tx = CX + 520;
      g.fillStyle = dark(0.26);
      g.beginPath();
      g.moveTo(tx - 62, GY); g.lineTo(tx - 20, GY - 128);
      g.lineTo(tx - 8, GY - 240); g.lineTo(tx + 8, GY - 240);
      g.lineTo(tx + 20, GY - 128); g.lineTo(tx + 62, GY);
      g.fill();
      g.fillStyle = light(0.1);
      g.beginPath();
      g.moveTo(tx - 44, GY); g.lineTo(tx - 22, GY - 58);
      g.lineTo(tx + 22, GY - 58); g.lineTo(tx + 44, GY); g.fill();
      g.fillStyle = dark(0.26);
      g.fillRect(tx - 30, GY - 132, 60, 9);
      g.fillRect(tx - 20, GY - 196, 40, 7);
    } else if (theme.id === 'london') {
      // low brick roofline, a cathedral dome, a clock tower and two moderns
      for (let x = CX - 800; x < CX + 800; x += 68) {
        const h = 40 + ((x / 68) % 4) * 11;
        box(x, 66, h, 0.17);
        g.fillStyle = dark(0.27);
        for (const cx2 of [x + 10, x + 44]) g.fillRect(cx2, GY - h - 14, 9, 14);
      }
      const dx = CX - 250;                    // cathedral dome + peristyle
      g.fillStyle = dark(0.3);
      g.fillRect(dx - 66, GY - 92, 132, 92);
      g.fillRect(dx - 44, GY - 130, 88, 42);
      g.beginPath();
      g.moveTo(dx - 46, GY - 128);
      g.quadraticCurveTo(dx, GY - 232, dx + 46, GY - 128);
      g.fill();
      g.fillRect(dx - 8, GY - 226, 16, 22);
      g.beginPath(); g.arc(dx, GY - 226, 11, Math.PI, 0); g.fill();
      for (const sx of [-92, 92]) {           // west towers
        g.fillRect(dx + sx - 20, GY - 138, 40, 138);
        g.fillRect(dx + sx - 24, GY - 150, 48, 14);
      }
      const cx3 = CX + 120;                   // clock tower
      g.fillStyle = dark(0.34);
      g.fillRect(cx3 - 20, GY - 196, 40, 196);
      g.fillRect(cx3 - 25, GY - 214, 50, 22);
      g.beginPath();
      g.moveTo(cx3 - 23, GY - 214); g.lineTo(cx3, GY - 268); g.lineTo(cx3 + 23, GY - 214);
      g.fill();
      g.fillStyle = light(0.3);
      g.beginPath(); g.arc(cx3, GY - 178, 12, 0, 7); g.fill();
      g.fillStyle = dark(0.26);               // tapering glass sliver
      g.beginPath();
      g.moveTo(CX + 400, GY); g.lineTo(CX + 424, GY - 268);
      g.lineTo(CX + 436, GY - 268); g.lineTo(CX + 464, GY);
      g.fill();
      g.beginPath();                          // rounded bullet tower
      g.moveTo(CX + 560, GY);
      g.bezierCurveTo(CX + 548, GY - 130, CX + 566, GY - 196, CX + 596, GY - 200);
      g.bezierCurveTo(CX + 626, GY - 196, CX + 644, GY - 130, CX + 632, GY);
      g.fill();
    } else {
      // Rome: dome after dome over a soft ridge, framed by umbrella pines
      g.fillStyle = dark(0.12);
      g.beginPath();
      g.moveTo(CX - 800, GY);
      g.quadraticCurveTo(CX - 300, GY - 76, CX + 200, GY - 30);
      g.quadraticCurveTo(CX + 560, GY - 8, CX + 800, GY);
      g.lineTo(CX + 800, GY); g.fill();
      for (let x = CX - 780; x < CX + 780; x += 62) box(x, 60, 34 + ((x / 62) % 3) * 10, 0.16);
      const domes = [[-430, 34, 0.24], [-150, 62, 0.3], [180, 40, 0.25], [430, 28, 0.2]];
      for (const [ox, r, f] of domes) {
        const x = CX + ox;
        g.fillStyle = dark(f);
        g.fillRect(x - r * 1.5, GY - r * 1.4, r * 3, r * 1.4);   // block below
        g.fillRect(x - r, GY - r * 2.1, r * 2, r * 0.8);         // drum
        g.beginPath();
        g.moveTo(x - r, GY - r * 2.05);
        g.quadraticCurveTo(x, GY - r * 4.2, x + r, GY - r * 2.05);
        g.fill();
        g.fillRect(x - r * 0.12, GY - r * 4.3, r * 0.24, r * 0.5);
        g.beginPath(); g.arc(x, GY - r * 4.3, r * 0.17, Math.PI, 0); g.fill();
      }
      // umbrella pines: bare trunk, flat spreading canopy
      for (const [ox, s] of [[-640, 1.1], [-540, 0.85], [-40, 0.95], [300, 1.15], [620, 0.9], [700, 1.0]]) {
        const x = CX + ox, hT = 74 * s;
        g.fillStyle = dark(0.3);
        g.fillRect(x - 4 * s, GY - hT, 8 * s, hT);
        g.beginPath();
        g.ellipse(x, GY - hT - 12 * s, 46 * s, 20 * s, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x - 18 * s, GY - hT + 2 * s, 26 * s, 12 * s, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }));
}

export function makeCameo(theme) {
  const group = new THREE.Group();
  // far city horizon (all streets)
  const skyMat = new THREE.MeshBasicMaterial({
    map: skylineTexture(theme), transparent: true, fog: false, depthWrite: false,
  });
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(800, 160), skyMat);
  skyPlane.position.set(0, 70, -340);
  skyPlane.renderOrder = -9.5;
  group.add(skyPlane);
  if (!theme.cameo) return group;

  const key = theme.cameo;
  const fogC = theme.fog;
  const dark = (f) => mixc(fogC, '#2c3454', f);
  const light = (f) => mixc(fogC, '#ffffff', f);
  const tex = cached(`cameo:${sKey(theme)}:${key}`, () => canvasTexture(1024, 400, (g) => {
    g.clearRect(0, 0, 1024, 400);
    const GY = 400;              // ground line at canvas bottom
    const cx = 512;
    if (key === 'arc') {
      // Arc de Triomphe silhouette centered down the avenue
      g.fillStyle = dark(0.42);
      g.fillRect(cx - 150, GY - 260, 300, 260);
      g.fillStyle = dark(0.5);
      g.fillRect(cx - 160, GY - 285, 320, 34);
      // arch opening (punch through with lighter haze color)
      g.fillStyle = light(0.12);
      g.beginPath();
      g.moveTo(cx - 62, GY);
      g.lineTo(cx - 62, GY - 130);
      g.arc(cx, GY - 130, 62, Math.PI, 0);
      g.lineTo(cx + 62, GY);
      g.fill();
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 150, GY - 205, 300, 12);
    } else if (key === 'cathedral') {
      // twin gothic spires off to the left
      const bx = cx - 260;
      g.fillStyle = dark(0.45);
      g.fillRect(bx - 90, GY - 160, 180, 160);
      for (const sx of [-55, 55]) {
        g.fillRect(bx + sx - 28, GY - 230, 56, 230);
        g.beginPath();
        g.moveTo(bx + sx - 30, GY - 230);
        g.lineTo(bx + sx, GY - 330);
        g.lineTo(bx + sx + 30, GY - 230);
        g.fill();
        // pinnacles
        for (const px of [-26, 26]) {
          g.beginPath();
          g.moveTo(bx + sx + px - 6, GY - 224);
          g.lineTo(bx + sx + px, GY - 260);
          g.lineTo(bx + sx + px + 6, GY - 224);
          g.fill();
        }
      }
      // rose window hint
      g.fillStyle = light(0.15);
      g.beginPath(); g.arc(bx, GY - 185, 16, 0, 7); g.fill();
    } else if (key === 'balltower') {
      // slender ball-drop tower right of center
      const bx = cx + 230;
      g.fillStyle = dark(0.4);
      g.fillRect(bx - 34, GY - 250, 68, 250);
      g.fillRect(bx - 26, GY - 290, 52, 44);
      g.fillRect(bx - 4, GY - 350, 8, 62);
      g.fillStyle = light(0.55);
      g.beginPath(); g.arc(bx, GY - 352, 12, 0, 7); g.fill();
      // neighbors
      g.fillStyle = dark(0.28);
      g.fillRect(bx - 130, GY - 180, 70, 180);
      g.fillRect(bx + 60, GY - 150, 80, 150);
    } else if (key === 'sacre') {
      // The white basilica crowning the hill — the thing you are running
      // toward, so it is drawn big, bright and high-contrast.
      g.fillStyle = dark(0.26);           // the hill
      g.beginPath();
      g.moveTo(cx - 470, GY);
      g.quadraticCurveTo(cx, GY - 190, cx + 470, GY);
      g.fill();
      g.fillStyle = mixc(fogC, '#b9ac96', 0.5);   // the long stair up the hill
      g.beginPath();
      g.moveTo(cx - 34, GY); g.lineTo(cx - 15, GY - 148);
      g.lineTo(cx + 15, GY - 148); g.lineTo(cx + 34, GY); g.fill();
      g.fillStyle = mixc(fogC, '#8e836f', 0.45);
      for (let i = 0; i < 9; i++) g.fillRect(cx - 33 + i * 2, GY - 12 - i * 15, 66 - i * 4, 3);

      const by = GY - 150;
      const stone = light(0.72), shade = mixc(fogC, '#c9c2b4', 0.62);
      // podium the church sits on
      g.fillStyle = shade;
      g.fillRect(cx - 150, by - 26, 300, 30);
      g.fillStyle = stone;
      // main dome: tall drum, ribbed ogee dome, lantern, cross
      g.fillRect(cx - 62, by - 116, 124, 92);
      g.fillStyle = shade;
      for (let i = 0; i < 5; i++) g.fillRect(cx - 56 + i * 26, by - 110, 9, 80);
      g.fillStyle = stone;
      g.beginPath();
      g.moveTo(cx - 66, by - 112);
      g.bezierCurveTo(cx - 74, by - 200, cx - 26, by - 236, cx, by - 236);
      g.bezierCurveTo(cx + 26, by - 236, cx + 74, by - 200, cx + 66, by - 112);
      g.fill();
      g.fillStyle = shade;
      g.beginPath();
      g.moveTo(cx + 22, by - 118);
      g.bezierCurveTo(cx + 34, by - 196, cx + 22, by - 226, cx, by - 234);
      g.bezierCurveTo(cx + 40, by - 228, cx + 70, by - 190, cx + 66, by - 112);
      g.fill();
      g.fillStyle = stone;
      g.fillRect(cx - 15, by - 282, 30, 50);      // lantern
      g.beginPath(); g.arc(cx, by - 282, 17, Math.PI, 0); g.fill();
      g.fillRect(cx - 3, by - 322, 6, 24);        // cross
      g.fillRect(cx - 13, by - 312, 26, 6);
      // two side domes
      for (const sx of [-124, 124]) {
        g.fillRect(cx + sx - 40, by - 70, 80, 74);
        g.beginPath();
        g.moveTo(cx + sx - 42, by - 68);
        g.bezierCurveTo(cx + sx - 46, by - 122, cx + sx - 16, by - 140, cx + sx, by - 140);
        g.bezierCurveTo(cx + sx + 16, by - 140, cx + sx + 46, by - 122, cx + sx + 42, by - 68);
        g.fill();
        g.fillRect(cx + sx - 8, by - 168, 16, 30);
        g.beginPath(); g.arc(cx + sx, by - 168, 10, Math.PI, 0); g.fill();
      }
      // campanile off to the right
      g.fillRect(cx + 214, by - 158, 42, 162);
      g.fillStyle = shade;
      g.fillRect(cx + 220, by - 130, 30, 46);
      g.fillStyle = stone;
      g.fillRect(cx + 208, by - 174, 58, 18);
      g.beginPath();
      g.moveTo(cx + 210, by - 172); g.lineTo(cx + 235, by - 216); g.lineTo(cx + 260, by - 172);
      g.fill();
      // arcaded front
      g.fillStyle = shade;
      for (let i = 0; i < 5; i++) {
        const ax = cx - 110 + i * 46;
        g.beginPath();
        g.moveTo(ax, by + 4); g.lineTo(ax, by - 12);
        g.arc(ax + 16, by - 12, 16, Math.PI, 0);
        g.lineTo(ax + 32, by + 4); g.fill();
      }
    } else if (key === 'churchtwin') {
      // twin bell-tower church closing the narrow vista
      g.fillStyle = dark(0.4);
      g.fillRect(cx - 110, GY - 170, 220, 170);
      // pediment
      g.beginPath();
      g.moveTo(cx - 120, GY - 170); g.lineTo(cx, GY - 225); g.lineTo(cx + 120, GY - 170);
      g.fill();
      for (const sx of [-140, 140]) {
        g.fillRect(cx + sx - 32, GY - 240, 64, 240);
        g.fillStyle = dark(0.5);
        g.fillRect(cx + sx - 36, GY - 250, 72, 14);
        g.beginPath();
        g.moveTo(cx + sx - 34, GY - 250); g.lineTo(cx + sx, GY - 300); g.lineTo(cx + sx + 34, GY - 250);
        g.fill();
        g.fillStyle = light(0.15);
        g.beginPath(); g.arc(cx + sx, GY - 205, 13, 0, 7); g.fill();
        g.fillStyle = dark(0.4);
      }
      g.fillStyle = light(0.12);
      g.beginPath(); g.arc(cx, GY - 120, 20, 0, 7); g.fill();
    } else if (key === 'gate') {
      // ancient brick city gate spanning wide across the background
      g.fillStyle = mixc(fogC, '#6a3c2e', 0.42);
      g.fillRect(cx - 430, GY - 140, 860, 140);
      // crenellation
      for (let x = cx - 430; x < cx + 430; x += 46) g.fillRect(x, GY - 162, 26, 24);
      // twin round towers
      for (const sx of [-300, 300]) {
        g.fillRect(cx + sx - 55, GY - 205, 110, 205);
        g.beginPath(); g.arc(cx + sx, GY - 205, 55, Math.PI, 0); g.fill();
      }
      // arches
      g.fillStyle = light(0.12);
      for (const sx of [-120, 0, 120]) {
        g.beginPath();
        g.moveTo(cx + sx - 42, GY);
        g.lineTo(cx + sx - 42, GY - 72);
        g.arc(cx + sx, GY - 72, 42, Math.PI, 0);
        g.lineTo(cx + sx + 42, GY);
        g.fill();
      }
    } else if (key === 'navona') {
      // baroque dome + twin towers left of center
      const bx = cx - 180;
      g.fillStyle = dark(0.42);
      g.fillRect(bx - 120, GY - 150, 240, 150);
      for (const sx of [-100, 100]) {
        g.fillRect(bx + sx - 26, GY - 215, 52, 215);
        g.beginPath(); g.arc(bx + sx, GY - 215, 26, Math.PI, 0); g.fill();
        g.fillRect(bx + sx - 3, GY - 252, 6, 14);
      }
      // big drum + dome
      g.fillRect(bx - 55, GY - 205, 110, 60);
      g.beginPath();
      g.moveTo(bx - 58, GY - 205);
      g.quadraticCurveTo(bx, GY - 320, bx + 58, GY - 205);
      g.fill();
      g.fillRect(bx - 5, GY - 305, 10, 24);
      g.beginPath(); g.arc(bx, GY - 306, 7, Math.PI, 0); g.fill();
      // obelisk on the right for balance
      g.fillStyle = dark(0.32);
      g.beginPath();
      g.moveTo(cx + 250 - 14, GY);
      g.lineTo(cx + 250 - 7, GY - 190);
      g.lineTo(cx + 250 + 7, GY - 190);
      g.lineTo(cx + 250 + 14, GY);
      g.fill();
      g.beginPath();
      g.moveTo(cx + 250 - 8, GY - 188); g.lineTo(cx + 250, GY - 214); g.lineTo(cx + 250 + 8, GY - 188);
      g.fill();
    }
  }));
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, fog: false, depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(300, 117), mat);
  plane.position.set(0, 48, -268);
  plane.renderOrder = -9;
  group.add(plane);
  return group;
}
