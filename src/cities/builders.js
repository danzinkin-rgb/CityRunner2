import * as THREE from '../../vendor/three.module.js';
import { canvasTexture, TEXTURE_SLOTS } from '../core/engine.js';

// ---------- shared texture cache (per street) ----------
const cache = new Map();

// Free everything this module cached for the street just left.
//
// The cache is what lets a street's hundreds of buildings share a few dozen
// textures, but it was never emptied: every street visited added its facade,
// road, sky-line and cameo textures for the rest of the session. Measured in
// WebKit: 209 GPU textures after the first street, 902 after seventeen, each
// up to half a megabyte, with revisits still adding more. On a phone that is
// the WebView being killed for memory mid-run. Everything here is rebuilt on
// demand, so the next street simply makes what it needs.
//
// Canvases are shrunk to 0x0 as well as dropped: iOS counts canvas backing
// stores against a fixed budget, and waiting for GC to find them is too slow.
function freeTexture(t) {
  t.dispose();
  const img = t.image;
  if (img && typeof img.getContext === 'function') { img.width = 0; img.height = 0; }
}
export function releaseStreetCaches() {
  for (const v of cache.values()) {
    if (!v) continue;
    if (v.isTexture) freeTexture(v);
    else if (v.isMaterial) {
      for (const k of TEXTURE_SLOTS) {
        if (v[k] && v[k].isTexture) freeTexture(v[k]);
      }
      v.dispose();
    } else if (v.isBufferGeometry) {
      SHARED_GEO.delete(v);
      v.dispose();
    }
  }
  cache.clear();
}
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
      // San Francisco: painted timber clapboard on the houses, and contrasting
      // corner boards — the trim colour is half of what makes them "painted"
      if (style === 'rowhouse' || style === 'victorian') {
        g.fillStyle = 'rgba(0,0,0,.07)';
        for (let y = 0; y < H; y += 9) g.fillRect(0, y, W, 2);
        g.fillStyle = 'rgba(255,255,255,.06)';
        for (let y = 2; y < H; y += 9) g.fillRect(0, y, W, 1);
        g.fillStyle = theme.trim || '#f2ece0';
        g.fillRect(0, 0, 7, H);
        g.fillRect(W - 7, 0, 7, H);
      }
      // Jerusalem stone: every building faced in pale limestone ashlar,
      // each block a touch different in tone (a municipal rule since 1918)
      if (theme.id === 'jerusalem') {
        for (let y = 0, row = 0; y < H; y += 18, row++) {
          for (let x = -(row % 2) * 17; x < W; x += 34) {
            const t = Math.random();
            g.fillStyle = t < 0.5 ? `rgba(0,0,0,${t * 0.1})` : `rgba(255,248,230,${(t - 0.5) * 0.14})`;
            g.fillRect(x + 1, y + 1, 32, 16);
            g.fillStyle = 'rgba(80,64,40,.18)'; g.fillRect(x, y, 1, 18);
          }
          g.fillStyle = 'rgba(80,64,40,.2)'; g.fillRect(0, y, W, 1);
        }
      }
      // Marrakech: lime plaster over red earth, smoothed by hand, so the
      // colour drifts in soft patches rather than courses
      if (theme.id === 'marrakech') {
        for (let i = 0; i < 70; i++) {
          const t = Math.random();
          g.fillStyle = t < 0.5 ? `rgba(90,30,20,${t * 0.12})` : `rgba(255,220,190,${(t - 0.5) * 0.12})`;
          g.beginPath();
          g.ellipse(Math.random() * W, Math.random() * H, 10 + Math.random() * 30, 6 + Math.random() * 16, 0, 0, 7);
          g.fill();
        }
      }
      // Venice: lime plaster in rose and ochre, faded by the salt air, and
      // here and there fallen away to show the brick underneath
      if (theme.id === 'venice') {
        for (let i = 0; i < 50; i++) {
          const t = Math.random();
          g.fillStyle = t < 0.5 ? `rgba(80,40,30,${t * 0.1})` : `rgba(255,240,220,${(t - 0.5) * 0.12})`;
          g.fillRect(Math.random() * W, Math.random() * H, 20 + Math.random() * 50, 10 + Math.random() * 30);
        }
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.4) continue;
          const px = Math.random() * (W - 60), py = Math.random() * (H - 80), pw = 30 + Math.random() * 40, ph = 18 + Math.random() * 30;
          for (let by = 0; by < ph; by += 6) {
            for (let bx = ((by / 6) % 2) * 6; bx < pw; bx += 12) {
              g.fillStyle = `rgba(${150 + Math.random() * 40 | 0},70,50,.7)`;
              g.fillRect(px + bx, py + by, 11, 5);
            }
          }
        }
      }
      // rusticated stone joints for stone styles
      if (style === 'flagship' || style === 'arcade' || style === 'hotel' || style === 'baroque' || style === 'deptstore' || style === 'beauxarts') {
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
          if (style === 'hanok' || style === 'hutong') continue;   // painted below
          if (style === 'conventillo') {
            // La Boca: corrugated tin walls, each panel a different bright
            // colour, small wooden windows with shutters
            if (cIdx === 0) {
              for (let x = 0; x < W; x += W / 3) {
                g.fillStyle = pickR(theme.palette);
                g.fillRect(x, rowY, W / 3 + 1, wh + 1);
                g.fillStyle = 'rgba(0,0,0,.12)';
                for (let rx = x + 2; rx < x + W / 3; rx += 5) g.fillRect(rx, rowY, 1.5, wh);
              }
            }
            if ((cIdx + f) % 2) continue;
            const x = cIdx * ww + ww * 0.25, y = rowY + wh * 0.2, w = ww * 0.5, h = wh * 0.6;
            g.fillStyle = '#f4f0e4'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
            g.fillStyle = Math.random() < (theme.lit ?? 0.16) ? theme.windowLit : pickR(['#2a6a4a', '#2a3a6a', '#6a2a2a']);
            g.fillRect(x, y, w, h);
            continue;
          }
          if (style === 'venetian') {
            // Venice: pointed Gothic windows framed in white Istrian stone.
            // On the main floor (the piano nobile) four of them join into one
            // window with a little balcony; elsewhere they stand singly, some
            // behind green shutters.
            const arch = (x, y, w, h) => {
              g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.55);
              g.quadraticCurveTo(x, y + w * 0.1, x + w / 2, y);
              g.quadraticCurveTo(x + w, y + w * 0.1, x + w, y + w * 0.55);
              g.lineTo(x + w, y + h); g.closePath(); g.fill();
            };
            if (f === Math.min(1, floors - 1) && floors > 1) {
              if (cIdx === 0) {
                const x0 = W * 0.2, x1 = W * 0.8, n = 4, y = rowY + wh * 0.12, h = wh * 0.72, bw = (x1 - x0) / n;
                g.fillStyle = theme.trim; g.fillRect(x0 - 6, y + bw * 0.3, x1 - x0 + 12, h - bw * 0.3 + 6);
                for (let k = 0; k < n; k++) { g.fillStyle = theme.trim; arch(x0 + k * bw - 1, y - 4, bw + 2, h + 4); }
                for (let k = 0; k < n; k++) {
                  g.fillStyle = Math.random() < (theme.lit ?? 0.16) ? theme.windowLit : '#2a3440';
                  arch(x0 + k * bw + 3, y, bw - 6, h);
                }
                g.fillStyle = theme.trim; g.fillRect(x0 - 10, y + h + 1, x1 - x0 + 20, 5);
                for (let bx = x0 - 8; bx < x1 + 10; bx += 6) g.fillRect(bx, y + h - 10, 2.5, 12);
              }
              continue;
            }
            if ((cIdx + f) % 3 === 2) continue;
            const x = cIdx * ww + ww * 0.28, y = rowY + wh * 0.16, w = ww * 0.44, h = wh * 0.68;
            g.fillStyle = theme.trim; arch(x - 4, y - 5, w + 8, h + 9);
            const shut = Math.random() < 0.45;
            g.fillStyle = shut ? '#3a6a4a' : Math.random() < (theme.lit ?? 0.16) ? theme.windowLit : '#2a3440';
            arch(x, y, w, h);
            if (shut) { g.fillStyle = 'rgba(0,0,0,.25)'; for (let ly = y + w * 0.5; ly < y + h; ly += 4) g.fillRect(x, ly, w, 1); }
            continue;
          }
          if (style === 'colonial') {
            // Old Havana: tall French windows with louvred shutters, a small
            // iron balcony on each upper floor, faded paint
            const x = cIdx * ww + ww * 0.24, y = rowY + wh * 0.08, w = ww * 0.52, h = wh * 0.8;
            g.fillStyle = theme.trim; g.fillRect(x - 4, y - 6, w + 8, h + 8);
            const open = Math.random() < 0.4;
            g.fillStyle = open ? (Math.random() < (theme.lit ?? 0.16) ? theme.windowLit : '#2a3440') : pickR(['#2a7a8a', '#3a6a4a', '#5a7aa0', '#8a5a3a']);
            g.fillRect(x, y, w, h);
            if (!open) { g.fillStyle = 'rgba(0,0,0,.22)'; for (let ly = y + 2; ly < y + h; ly += 4) g.fillRect(x, ly, w, 1); }
            if (f > 0) {
              g.fillStyle = 'rgba(30,30,34,.9)'; g.fillRect(x - 6, y + h - 2, w + 12, 3);
              for (let bx = x - 4; bx < x + w + 6; bx += 4) g.fillRect(bx, y + h - 14, 1.5, 12);
            }
            continue;
          }
          if (style === 'coral') {
            // Stone Town: small shuttered windows in thick coral-stone walls,
            // and on the upper floors the odd closed wooden balcony
            if ((cIdx + f) % 2 === 1) continue;
            const x = cIdx * ww + ww * 0.25, y = rowY + wh * 0.2, w = ww * 0.5, h = wh * 0.6;
            g.fillStyle = '#5a3a24'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
            g.fillStyle = Math.random() < (theme.lit ?? 0.16) ? theme.windowLit : '#3a4a5a';
            g.fillRect(x, y, w, h);
            g.fillStyle = '#4a7a8a';
            g.fillRect(x, y, w * 0.48, h); g.fillRect(x + w * 0.52, y, w * 0.48, h);
            if (f > 0 && f % 3 === 1 && cIdx === 0) {
              g.fillStyle = '#5a3a24'; g.fillRect(x - 10, y - 6, W * 0.6, h + 14);
              g.fillStyle = 'rgba(255,230,190,.3)';
              for (let lx = x - 6; lx < x - 10 + W * 0.6; lx += 6) g.fillRect(lx, y, 2, h);
            }
            continue;
          }
          if (style === 'tilework') {
            // Samarkand: deep pointed-arch niches set in the brick, each
            // framed in turquoise tile, a small latticed window at the back
            if (f % 2 === 1) continue;
            const x = cIdx * ww + ww * 0.2, w = ww * 0.6, y = rowY + wh * 0.1, h = wh * 1.6;
            g.fillStyle = theme.trim;
            g.beginPath(); g.moveTo(x - 4, y + h); g.lineTo(x - 4, y + w * 0.6);
            g.quadraticCurveTo(x - 4, y - 6, x + w / 2, y - 8); g.quadraticCurveTo(x + w + 4, y - 6, x + w + 4, y + w * 0.6);
            g.lineTo(x + w + 4, y + h); g.closePath(); g.fill();
            g.fillStyle = 'rgba(70,50,30,.75)';
            g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w * 0.6);
            g.quadraticCurveTo(x, y, x + w / 2, y - 2); g.quadraticCurveTo(x + w, y, x + w, y + w * 0.6);
            g.lineTo(x + w, y + h); g.closePath(); g.fill();
            g.fillStyle = Math.random() < (theme.lit ?? 0.16) ? theme.windowLit : '#2a3a4a';
            g.fillRect(x + w * 0.3, y + h * 0.45, w * 0.4, h * 0.3);
            continue;
          }
          if (style === 'tubehouse') {
            // Hanoi's tube houses: narrow fronts, tall French windows behind
            // green shutters, a little balcony with plants on most floors
            if (cols > 3 && cIdx === 1) continue;
            const x = cIdx * ww + ww * 0.2, y = rowY + wh * 0.14, w = ww * 0.6, h = wh * 0.76;
            const lit = Math.random() < (theme.lit ?? 0.16);
            g.fillStyle = lit ? theme.windowLit : '#2a343c';
            g.fillRect(x, y, w, h);
            g.fillStyle = '#3a7a5a';
            g.fillRect(x - w * 0.28, y, w * 0.26, h); g.fillRect(x + w * 1.02, y, w * 0.26, h);
            g.fillStyle = 'rgba(0,0,0,.25)';
            for (let ly = y + 2; ly < y + h; ly += 4) { g.fillRect(x - w * 0.28, ly, w * 0.26, 1); g.fillRect(x + w * 1.02, ly, w * 0.26, 1); }
            if (f > 0 && Math.random() < 0.6) {
              g.fillStyle = 'rgba(40,40,40,.85)';
              g.fillRect(x - 8, y + h - 3, w + 16, 3);
              for (let bx = x - 6; bx < x + w + 8; bx += 4) g.fillRect(bx, y + h - 12, 1.5, 9);
              g.fillStyle = '#4a9a3a';
              for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x + w * (0.2 + k * 0.3), y + h - 14, 4, 0, 7); g.fill(); }
            }
            continue;
          }
          if (style === 'flatpaint') {
            // Bo-Kaap: small sash windows in crisp white frames on a wall of
            // one bright colour
            if ((cIdx + f) % 3 === 2) continue;
            const x = cIdx * ww + ww * 0.28, y = rowY + wh * 0.22, w = ww * 0.44, h = wh * 0.56;
            g.fillStyle = '#ffffff'; g.fillRect(x - 4, y - 4, w + 8, h + 8);
            g.fillStyle = Math.random() < (theme.lit ?? 0.16) ? theme.windowLit : '#2a3a4c';
            g.fillRect(x, y, w, h);
            g.fillStyle = '#ffffff'; g.fillRect(x, y + h / 2 - 1, w, 2); g.fillRect(x + w / 2 - 1, y, 2, h);
            continue;
          }
          if (style === 'shophouse') {
            // Bangkok's shophouses: tall windows with round-arched heads and
            // louvred shutters, a stucco moulding over each, and here and
            // there an air-conditioning box or a potted plant on the sill.
            const x = cIdx * ww + ww * 0.22, y = rowY + wh * 0.18, w = ww * 0.56, h = wh * 0.68;
            const lit = Math.random() < (theme.lit ?? 0.16);
            g.fillStyle = theme.trim;
            g.beginPath(); g.arc(x + w / 2, y + w / 2, w / 2 + 4, Math.PI, 0); g.fill();
            g.fillRect(x - 4, y + w / 2, w + 8, h - w / 2 + 4);
            g.fillStyle = lit ? theme.windowLit : '#2c3640';
            g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2);
            g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill();
            if (!lit && Math.random() < 0.55) {
              g.fillStyle = pickR(['#4a7a6a', '#7a5a3a', '#5a6a8a']);    // closed louvres
              g.fillRect(x + 1, y + w / 2, w - 2, h - w / 2);
              g.fillStyle = 'rgba(0,0,0,.25)';
              for (let ly = y + w / 2 + 2; ly < y + h; ly += 4) g.fillRect(x + 1, ly, w - 2, 1);
            }
            if (Math.random() < 0.15) { g.fillStyle = '#d8d8d0'; g.fillRect(x + w * 0.2, y + h - 8, w * 0.6, 9); }
            else if (Math.random() < 0.2) { g.fillStyle = '#3a8a3a'; g.beginPath(); g.arc(x + w / 2, y + h - 3, 6, 0, 7); g.fill(); }
            continue;
          }
          if (style === 'bazaar') {
            // Old Delhi: tall shuttered windows in bright paint, many with a
            // small balcony, and the odd painted signboard nailed between
            // floors. Every house a different colour.
            if (cIdx === 0 && f % 2 === 1 && Math.random() < 0.6) {
              g.fillStyle = pickR(theme.storefront);
              g.fillRect(4, rowY + 2, W - 8, wh * 0.3);
              g.fillStyle = 'rgba(255,250,235,.9)';
              g.fillRect(14, rowY + wh * 0.12, W - 28, 3);
              g.fillRect(24, rowY + wh * 0.2, W - 48, 2);
            }
            const x = cIdx * ww + ww * 0.24, y = rowY + wh * 0.3, w = ww * 0.52, h = wh * 0.6;
            const lit = Math.random() < (theme.lit ?? 0.16);
            g.fillStyle = theme.trim; g.fillRect(x - 3, y - 4, w + 6, h + 6);
            g.fillStyle = lit ? theme.windowLit : '#2a3440';
            g.fillRect(x, y, w, h);
            const sh = pickR(['#2a8a6a', '#2a6ab0', '#c8403a', '#e0a020']);
            g.fillStyle = sh;                                             // open shutters
            g.fillRect(x - w * 0.3, y, w * 0.26, h); g.fillRect(x + w * 1.04, y, w * 0.26, h);
            if (Math.random() < 0.4) {
              g.fillStyle = 'rgba(40,30,24,.85)';                         // a little balcony
              g.fillRect(x - 6, y + h - 2, w + 12, 4);
              for (let bx = x - 4; bx < x + w + 6; bx += 4) g.fillRect(bx, y + h - 10, 1.5, 8);
            }
            continue;
          }
          if (style === 'medina') {
            // Houses in the medina look inwards: few, small windows behind
            // carved wooden grilles, many bays left as blank wall. In the
            // Mellah (theme.balconies) the houses open onto the street with
            // wooden balconies instead.
            if (Math.random() < (theme.balconies ? 0.3 : 0.5)) continue;
            const x = cIdx * ww + ww * 0.3, y = rowY + wh * 0.22, w = ww * 0.4, h = wh * 0.5;
            g.fillStyle = theme.trim; g.fillRect(x - 3, y - 3, w + 6, h + 6);
            const lit = Math.random() < (theme.lit ?? 0.16);
            g.fillStyle = lit ? theme.windowLit : '#3a2a22';
            g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2);
            g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fill();
            g.strokeStyle = '#6a3e22'; g.lineWidth = 1.5;                  // the grille
            for (let gx = x + 4; gx < x + w; gx += 5) { g.beginPath(); g.moveTo(gx, y + w / 2); g.lineTo(gx, y + h); g.stroke(); }
            for (let gy = y + w / 2 + 3; gy < y + h; gy += 5) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
            if (theme.balconies && f > 0) {
              g.fillStyle = '#5a3a24'; g.fillRect(x - 8, y + h, w + 16, 6);
              g.fillStyle = '#7a5434';
              for (let bx = x - 6; bx < x + w + 8; bx += 5) g.fillRect(bx, y + h - 12, 2, 12);
              g.fillRect(x - 8, y + h - 14, w + 16, 3);
            }
            continue;
          }
          if (theme.id === 'jerusalem') {
            // tall arched windows with a stone sill, some behind green
            // iron shutters, as on the stone houses of the city
            const x = cIdx * ww + ww * 0.28, y = rowY + wh * 0.16, w = ww * 0.44, h = wh * 0.66;
            const arch = () => {
              g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2);
              g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath();
            };
            g.fillStyle = 'rgba(255,248,230,.35)';                    // dressed surround
            g.fillRect(x - 3, y + w / 2, w + 6, h - w / 2 + 2);
            const shut = Math.random() < 0.3;
            const lit = !shut && Math.random() < (theme.lit ?? 0.16);
            g.fillStyle = shut ? '#3e6a58' : lit ? theme.windowLit : '#2c3a4c';
            arch(); g.fill();
            if (shut) {
              g.fillStyle = 'rgba(0,0,0,.25)';
              for (let ly = y + w / 2; ly < y + h; ly += 4) g.fillRect(x + 1, ly, w - 2, 1);
            } else {
              g.strokeStyle = 'rgba(30,30,30,.5)'; g.lineWidth = 1.5;
              g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.stroke();
            }
            g.fillStyle = theme.trim || '#f6ecd0';                    // sill
            g.fillRect(x - 5, y + h, w + 10, 4);
            continue;
          }
          const tall = theme.id === 'paris' || style === 'rowhouse' || style === 'victorian';
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

          // London / Paris / San Francisco houses: bright trim surround
          if (theme.id === 'london' || theme.id === 'paris' || style === 'rowhouse' || style === 'victorian') {
            g.fillStyle = theme.trim || '#f0ecdc';
            g.fillRect(x - 4, y - 4, w + 8, h + 8);
          }
          // Victorian: a small pediment over every window
          if (style === 'victorian') {
            g.fillStyle = theme.trim || '#f8f2e0';
            g.beginPath();
            g.moveTo(x - 7, y - 4); g.lineTo(x + w / 2, y - 15); g.lineTo(x + w + 7, y - 4);
            g.fill();
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

      // Havana: sun-faded paint, peeling here and there to the plaster
      if (style === 'colonial') {
        for (let i = 0; i < 26; i++) {
          g.fillStyle = `rgba(240,230,210,${0.15 + Math.random() * 0.25})`;
          g.beginPath(); g.ellipse(Math.random() * W, Math.random() * H, 4 + Math.random() * 14, 3 + Math.random() * 8, 0, 0, 7); g.fill();
        }
      }
      // Stone Town: lime-washed coral stone, weathered in grey-brown streaks
      if (style === 'coral') {
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(90,80,60,${Math.random() * 0.1})`;
          const x = Math.random() * W;
          g.fillRect(x, Math.random() * H * 0.3, 3 + Math.random() * 8, H * (0.2 + Math.random() * 0.5));
        }
      }
      // Samarkand: brick coursing, and a band of cobalt and turquoise tile
      // with white stars under the parapet
      if (style === 'tilework') {
        g.fillStyle = 'rgba(90,60,30,.12)';
        for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 1);
        for (let x = 0, k = 0; x < W; x += 16, k++) {
          g.fillStyle = k % 2 ? '#2a4aa8' : '#2aa8b8'; g.fillRect(x, 20, 16, 14);
          g.fillStyle = '#f4f0e0'; g.beginPath(); g.arc(x + 8, 27, 3, 0, 7); g.fill();
        }
      }
      // Beijing's hutong: grey brick courtyard walls, a lattice window up
      // high, and on Qianmen (theme.trim gold) carved and gilded fronts
      if (style === 'hutong') {
        g.fillStyle = 'rgba(0,0,0,.1)';
        for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 1);
        for (let y = 0, row = 0; y < H; y += 8, row++) for (let x = (row % 2) * 12; x < W; x += 24) g.fillRect(x, y, 1, 8);
        const x = W * 0.3, w = W * 0.4, y = H * 0.22, h = H * 0.2;
        g.fillStyle = '#c8202a'; g.fillRect(x - 4, y - 4, w + 8, h + 8);
        g.fillStyle = Math.random() < (theme.lit ?? 0.16) ? '#ffd498' : '#f0e4c8'; g.fillRect(x, y, w, h);
        g.strokeStyle = '#7a2a1a'; g.lineWidth = 2;
        for (let gx = x + w / 6; gx < x + w; gx += w / 6) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
        for (let gy = y + h / 3; gy < y + h; gy += h / 3) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
        g.fillStyle = theme.trim === '#d8a838' ? '#d8a838' : '#3a3c42'; g.fillRect(0, 0, W, 14);
      }
      // Seoul's hanok: white plaster between dark timber posts and beams,
      // and windows of paper on a wooden lattice
      if (style === 'hanok') {
        g.fillStyle = '#4a3a2e';
        for (let x = 0; x <= W; x += W / 3) g.fillRect(Math.min(W - 8, x), 0, 8, H);
        g.fillRect(0, H * 0.14, W, 7); g.fillRect(0, H * 0.5, W, 6);
        for (let k = 0; k < 3; k++) {
          const x = k * W / 3 + W / 3 * 0.22, y = H * 0.2, w = W / 3 * 0.56, h = H * 0.24;
          g.fillStyle = Math.random() < (theme.lit ?? 0.16) ? '#ffe2a8' : '#f2ead2';
          g.fillRect(x, y, w, h);
          g.strokeStyle = '#6a4a32'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
          for (let gx = x + w / 4; gx < x + w - 1; gx += w / 4) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
          for (let gy = y + h / 4; gy < y + h - 1; gy += h / 4) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
        }
      }
      // Cape Town's harbour warehouses: red brick coursing
      if (style === 'warehouse') {
        g.fillStyle = 'rgba(0,0,0,.08)';
        for (let y = 0; y < H; y += 8) g.fillRect(0, y, W, 1);
      }
      // Marrakech: a band of green and white tile under the parapet
      if (theme.id === 'marrakech') {
        for (let x = 0, k = 0; x < W; x += 8, k++) {
          g.fillStyle = k % 2 ? '#f2e8d6' : '#1f7a6a';
          g.fillRect(x, CORNICE + 3, 8, 6);
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
      else if (style === 'rowhouse') paintRowhouseGround(G);
      else if (style === 'beauxarts') paintBeauxGround(G);
      else if (style === 'market') paintMarketGround(G);
      else if (style === 'medina') paintMedinaGround(G);
      else if (style === 'bazaar') paintBazaarGround(G);
      else if (style === 'shophouse') paintShophouseGround(G);
      else if (style === 'flatpaint') paintFlatpaintGround(G);
      else if (style === 'tubehouse') paintTubehouseGround(G);
      else if (style === 'hanok') paintHanokGround(G);
      else if (style === 'coral') paintCoralGround(G);
      else if (style === 'hutong') paintHutongGround(G);
      else if (style === 'colonial') paintColonialGround(G);
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
  g.fillText(pickR(adWords(theme, BRANDS.show)), W / 2, shopY + 4 + SHOP_H * 0.17, W - 24);
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
    g.fillText(pickR(adWords(theme, BRANDS.show)), bx + bw / 2, by + bh / 2, bw - 10);
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

// Mahane Yehuda: stall fronts. Some are open, crates of produce and sacks
// of spice under a striped awning; the rest have their roll-down shutters
// down, painted with motifs invented for the game (stars and tiles, a
// pomegranate, an olive sprig). The real market's shutter paintings are the
// work of a living artist and must never be copied or approximated.
function paintMarketGround({ g, W, H, shopY, SHOP_H, theme }) {
  const n = 3, sw = W / n;
  const produce = ['#d8402a', '#f0a020', '#6aa040', '#e8c040', '#a0302a', '#8a5a2a'];
  for (let i = 0; i < n; i++) {
    const x = i * sw;
    if (Math.random() < 0.55) {
      g.fillStyle = '#3a2e22'; g.fillRect(x + 2, shopY, sw - 4, SHOP_H);
      const cols = pickR(theme.storefront || ['#a0522e']);
      for (let ax = x + 3; ax < x + sw - 3; ax += 10) {              // striped awning
        g.fillStyle = ((ax - x) / 10) % 2 < 1 ? cols : '#f2ead6';
        g.fillRect(ax, shopY, Math.min(10, x + sw - 3 - ax), SHOP_H * 0.16);
      }
      for (let r = 0; r < 2; r++) {                                   // crates and sacks
        for (let cx = x + 6; cx < x + sw - 10; cx += 14) {
          const cy = H - 6 - (r + 1) * SHOP_H * 0.2;
          g.fillStyle = '#9a7040'; g.fillRect(cx, cy, 12, SHOP_H * 0.18);
          g.fillStyle = pickR(produce);
          for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + 3 + k * 3, cy + 2, 2.4, 0, 7); g.fill(); }
        }
      }
    } else {
      g.fillStyle = '#8a8a86'; g.fillRect(x + 2, shopY, sw - 4, SHOP_H);   // roll-down shutter
      g.fillStyle = 'rgba(0,0,0,.18)';
      for (let y = shopY + 3; y < H; y += 5) g.fillRect(x + 2, y, sw - 4, 1);
      const cx = x + sw / 2, cy = shopY + SHOP_H * 0.52, r = Math.min(sw, SHOP_H) * 0.28;
      const motif = (Math.random() * 3) | 0;
      if (motif === 0) {                                              // star and tile
        g.fillStyle = '#2e5e8e'; g.fillRect(cx - r, cy - r, r * 2, r * 2);
        g.fillStyle = '#f2e6c8'; g.beginPath();
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? r * 0.45 : r * 0.9; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        g.fill();
      } else if (motif === 1) {                                       // a pomegranate
        g.fillStyle = '#b3202e'; g.beginPath(); g.arc(cx, cy + r * 0.1, r * 0.8, 0, 7); g.fill();
        g.fillRect(cx - r * 0.18, cy - r * 0.95, r * 0.36, r * 0.3);
      } else {                                                        // an olive sprig
        g.strokeStyle = '#4a5a30'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx - r, cy + r * 0.6); g.lineTo(cx + r, cy - r * 0.6); g.stroke();
        g.fillStyle = '#6a8040';
        for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx - r + k * r * 0.45, cy + r * 0.5 - k * r * 0.28, r * 0.28, r * 0.1, -0.6, 0, 7); g.fill(); }
      }
    }
  }
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, shopY, W, 3);
}

// Old Havana: a shaded arcade of round arches on columns along the
// pavement, shopfronts and doorways deep inside it.
function paintColonialGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = 'rgba(40,30,24,.55)'; g.fillRect(0, shopY, W, SHOP_H);
  const n = 3, bw = W / n;
  for (let i = 0; i < n; i++) {
    const x = i * bw;
    g.fillStyle = theme.trim;
    g.fillRect(x, shopY, 8, SHOP_H); g.fillRect(x + bw - 8, shopY, 8, SHOP_H);
    g.beginPath(); g.moveTo(x, shopY); g.lineTo(x + bw, shopY); g.lineTo(x + bw, shopY + SHOP_H * 0.3);
    g.arc(x + bw / 2, shopY + SHOP_H * 0.3, bw / 2 - 8, 0, Math.PI, true); g.lineTo(x, shopY); g.fill();
    if (i === 1 && Math.random() < 0.6) {
      g.fillStyle = pickR(theme.storefront); g.fillRect(x + 12, shopY + SHOP_H * 0.42, bw - 24, SHOP_H * 0.14);
      g.fillStyle = '#fff6e0'; g.font = `900 ${Math.round(SHOP_H * 0.1)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(pickR(adWords(theme, ['CAFÉ'])), x + bw / 2, shopY + SHOP_H * 0.49, bw - 28);
    }
    g.fillStyle = Math.random() < 0.5 ? '#ffd498' : '#3a2a20';
    g.fillRect(x + bw * 0.3, shopY + SHOP_H * 0.6, bw * 0.4, SHOP_H * 0.4 - 4);
  }
}

// Beijing: a red courtyard gate with brass knockers under a little tiled
// porch, a red lantern either side, and here and there a shop with its
// name on a black and gold board.
function paintHutongGround({ g, W, H, shopY, SHOP_H, theme }) {
  if (Math.random() < 0.45) {
    g.fillStyle = '#1a1a1e'; g.fillRect(W * 0.12, shopY + 2, W * 0.76, SHOP_H * 0.22);
    g.fillStyle = '#e8c060';
    g.font = `900 ${Math.round(SHOP_H * 0.13)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pickR(adWords(theme, ['TEA'])), W / 2, shopY + 2 + SHOP_H * 0.11, W * 0.7);
    g.fillStyle = '#7a2a1a'; g.fillRect(W * 0.1, shopY + SHOP_H * 0.26, W * 0.8, SHOP_H * 0.74 - 4);
    g.fillStyle = '#f0e2c0';
    for (let k = 0; k < 4; k++) g.fillRect(W * (0.14 + k * 0.19), shopY + SHOP_H * 0.32, W * 0.15, SHOP_H * 0.5);
    return;
  }
  const dx = W * 0.32, dw = W * 0.36, top = shopY + SHOP_H * 0.2;
  g.fillStyle = '#3a3c42'; g.fillRect(dx - 12, top - 14, dw + 24, 14);             // the porch roof
  g.fillStyle = '#b8201c'; g.fillRect(dx, top, dw, H - 4 - top);
  g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(dx + dw / 2 - 1, top, 2, H - 4 - top);
  g.fillStyle = '#e8c060';
  for (const x of [dx + dw * 0.4, dx + dw * 0.6]) { g.beginPath(); g.arc(x, top + (H - top) * 0.45, 4, 0, 7); g.fill(); }
  for (const x of [dx - 22, dx + dw + 22]) {
    g.fillStyle = '#e8302a'; g.beginPath(); g.ellipse(x, top + 6, 9, 12, 0, 0, 7); g.fill();
    g.fillStyle = '#f2c040'; g.fillRect(x - 5, top - 7, 10, 3);
  }
}

// Stone Town: a carved teak door, square-headed or round-topped, studded
// with brass, in a stone frame, and now and then a little shop beside it.
function paintCoralGround({ g, W, H, shopY, SHOP_H, theme }) {
  const dx = W * 0.3, dw = W * 0.4, top = shopY + SHOP_H * 0.08;
  const round = Math.random() < 0.5;
  g.fillStyle = '#d8ccb4'; g.fillRect(dx - 10, top - 8, dw + 20, H - top + 4);       // the frame
  g.fillStyle = '#4a2e1a';
  g.beginPath(); g.moveTo(dx, H - 4);
  if (round) { g.lineTo(dx, top + dw / 2); g.arc(dx + dw / 2, top + dw / 2, dw / 2, Math.PI, 0); }
  else { g.lineTo(dx, top + 14); g.lineTo(dx + dw, top + 14); }
  g.lineTo(dx + dw, H - 4); g.closePath(); g.fill();
  g.fillStyle = '#7a5232';                                                           // carved lintel
  if (!round) g.fillRect(dx - 6, top - 2, dw + 12, 16);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(dx + dw / 2 - 1, top + 20, 2, H - top - 24);
  g.fillStyle = '#e8c060';                                                           // brass studs
  for (let y = top + 30; y < H - 10; y += 14) for (const x of [dx + dw * 0.2, dx + dw * 0.4, dx + dw * 0.6, dx + dw * 0.8]) {
    g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill();
  }
  if (Math.random() < 0.4) {
    g.fillStyle = pickR(theme.storefront); g.fillRect(4, shopY + SHOP_H * 0.3, W * 0.2, SHOP_H * 0.5);
    g.fillRect(W * 0.76, shopY + SHOP_H * 0.3, W * 0.2, SHOP_H * 0.5);
  }
}

// Seoul: a hanok's ground floor, sliding lattice doors, and in Insadong a
// craft shop with its name on a hanging wooden board.
function paintHanokGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = '#c8b8a0'; g.fillRect(0, H - 12, W, 8);                         // stone base
  for (let k = 0; k < 3; k++) {
    const x = k * W / 3 + 10, w = W / 3 - 20, y = shopY + SHOP_H * 0.2, h = SHOP_H * 0.72 - 12;
    g.fillStyle = '#f2ead2'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#5a3a28'; g.lineWidth = 2; g.strokeRect(x, y, w, h);
    for (let gx = x + w / 3; gx < x + w - 1; gx += w / 3) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
    for (let gy = y + h / 5; gy < y + h - 1; gy += h / 5) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + w, gy); g.stroke(); }
  }
  if (Math.random() < 0.5) {
    g.fillStyle = '#5a3a28'; g.fillRect(W * 0.2, shopY + 2, W * 0.6, SHOP_H * 0.16);
    g.fillStyle = '#f2e4c4';
    g.font = `900 ${Math.round(SHOP_H * 0.11)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pickR(adWords(theme, ['TEA'])), W / 2, shopY + 2 + SHOP_H * 0.08, W * 0.56);
  }
}

// Hanoi: one open shop across the whole narrow front, its name on a board
// above, goods hung up inside.
function paintTubehouseGround({ g, W, H, shopY, SHOP_H, theme }) {
  const col = pickR(theme.storefront);
  g.fillStyle = col; g.fillRect(4, shopY + 2, W - 8, SHOP_H * 0.24);
  g.fillStyle = '#fff4d8';
  g.font = `900 ${Math.round(SHOP_H * 0.15)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(pickR(adWords(theme, ['SILK'])), W / 2, shopY + 2 + SHOP_H * 0.12, W - 20);
  g.fillStyle = '#2a201a'; g.fillRect(10, shopY + SHOP_H * 0.28, W - 20, SHOP_H * 0.72 - 4);
  for (let x = 18; x < W - 20; x += 14) {
    g.fillStyle = pickR(['#c8202a', '#e8a818', '#2a7a5a', '#2a5ab0', '#e85a8a', '#f2ece0']);
    g.fillRect(x, shopY + SHOP_H * 0.34, 10, SHOP_H * 0.42);
  }
}

// Bo-Kaap: a panelled front door up two steps, a window beside it, and the
// odd corner shop with a painted sign.
function paintFlatpaintGround({ g, W, H, shopY, SHOP_H, theme }) {
  if (Math.random() < 0.3) {
    g.fillStyle = pickR(theme.storefront); g.fillRect(8, shopY + 4, W - 16, SHOP_H * 0.24);
    g.fillStyle = '#ffffff'; g.font = `900 ${Math.round(SHOP_H * 0.15)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pickR(adWords(theme, ['SPICES'])), W / 2, shopY + 4 + SHOP_H * 0.12, W - 30);
  }
  const dx = W * 0.18, dw = W * 0.2;
  g.fillStyle = pickR(['#2a2a30', '#5a3a24', '#1a4a6a', '#ffffff']);
  g.fillRect(dx, shopY + SHOP_H * 0.32, dw, SHOP_H * 0.68 - 10);
  g.fillStyle = 'rgba(255,255,255,.4)';
  g.fillRect(dx + 4, shopY + SHOP_H * 0.38, dw - 8, 2); g.fillRect(dx + 4, shopY + SHOP_H * 0.7, dw - 8, 2);
  g.fillStyle = '#c8c4bc'; g.fillRect(dx - 6, H - 10, dw + 12, 6);              // the stoep steps
  const wx = W * 0.56, ww2 = W * 0.26;
  g.fillStyle = '#ffffff'; g.fillRect(wx - 3, shopY + SHOP_H * 0.36, ww2 + 6, SHOP_H * 0.42);
  g.fillStyle = '#2a3a4c'; g.fillRect(wx, shopY + SHOP_H * 0.39, ww2, SHOP_H * 0.36);
}

// Bangkok: the shophouse ground floor, one bay a roll-down shutter, the
// next an open front (a gold shop in red and gold, or a noodle counter).
function paintShophouseGround({ g, W, H, shopY, SHOP_H, theme }) {
  const n = 2, sw = W / n;
  for (let i = 0; i < n; i++) {
    const x = i * sw;
    if (Math.random() < 0.35) {
      g.fillStyle = '#9a9a98'; g.fillRect(x + 3, shopY + 4, sw - 6, SHOP_H - 8);
      g.fillStyle = 'rgba(0,0,0,.2)';
      for (let y = shopY + 6; y < H - 4; y += 4) g.fillRect(x + 3, y, sw - 6, 1);
      continue;
    }
    const col = pickR(theme.storefront);
    g.fillStyle = col; g.fillRect(x + 2, shopY, sw - 4, SHOP_H * 0.24);            // signboard
    g.fillStyle = '#f4e4a0';
    g.font = `900 ${Math.round(SHOP_H * 0.14)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pickR(adWords(theme, ['NOODLES'])), x + sw / 2, shopY + SHOP_H * 0.12, sw - 10);
    g.fillStyle = col === '#c8202a' ? '#5a0a0a' : '#2a2420';
    g.fillRect(x + 4, shopY + SHOP_H * 0.26, sw - 8, SHOP_H * 0.74 - 4);
    g.fillStyle = col === '#c8202a' ? '#f0c040' : '#f4e8d0';                     // gold, or a lit counter
    g.fillRect(x + 10, shopY + SHOP_H * 0.55, sw - 20, SHOP_H * 0.14);
  }
}

// Old Delhi: open shopfronts under bold painted signboards, goods stacked to
// the ceiling, a striped awning or two.
function paintBazaarGround({ g, W, H, shopY, SHOP_H, theme }) {
  const n = 2, sw = W / n;
  for (let i = 0; i < n; i++) {
    const x = i * sw;
    g.fillStyle = pickR(theme.storefront);                             // signboard
    g.fillRect(x + 2, shopY, sw - 4, SHOP_H * 0.24);
    g.fillStyle = 'rgba(255,250,235,.95)';
    g.font = `900 ${Math.round(SHOP_H * 0.15)}px Arial`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(pickR(adWords(theme, ['SWEETS', 'SPICES'])), x + sw / 2, shopY + SHOP_H * 0.12, sw - 12);
    g.fillStyle = '#2a2018'; g.fillRect(x + 4, shopY + SHOP_H * 0.26, sw - 8, SHOP_H * 0.74 - 4);
    for (let r = 0; r < 3; r++) {                                       // shelves of goods
      for (let cx = x + 8; cx < x + sw - 10; cx += 10) {
        g.fillStyle = pickR(['#e8780a', '#c8203a', '#f0c020', '#2a7ab0', '#e8e0d0', '#8a2a8a']);
        g.fillRect(cx, shopY + SHOP_H * (0.32 + r * 0.22), 8, SHOP_H * 0.16);
      }
    }
  }
}

// Marrakech: a horseshoe-arched doorway with a studded door in a strong
// colour, a band of zellige tile beneath, and now and then a shop front
// hung with lanterns and rugs.
function paintMedinaGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = 'rgba(60,20,10,.12)'; g.fillRect(0, shopY, W, SHOP_H);
  const doors = theme.storefront;
  for (let i = 0; i < 2; i++) {
    const dx = W * (0.1 + i * 0.5), dw = W * 0.3;
    if (Math.random() < 0.45) {
      // a shop: an open square front with rugs and lanterns hung up
      g.fillStyle = '#2e1e16'; g.fillRect(dx, shopY + SHOP_H * 0.1, dw, SHOP_H * 0.9 - 4);
      for (let k = 0; k < 3; k++) {
        g.fillStyle = pickR(['#b0302c', '#2c5ca8', '#d8a020', '#1f7a6a', '#8a3a6a']);
        g.fillRect(dx + 4 + k * dw / 3, shopY + SHOP_H * 0.16, dw / 3 - 8, SHOP_H * 0.55);
        g.fillStyle = 'rgba(255,240,210,.35)';
        g.fillRect(dx + 4 + k * dw / 3, shopY + SHOP_H * 0.3, dw / 3 - 8, 2);
      }
      g.fillStyle = '#ffcf6a';
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(dx + dw * (0.2 + k * 0.3), shopY + SHOP_H * 0.12, 3.5, 0, 7); g.fill(); }
      continue;
    }
    const r = dw / 2 * 1.18, k = Math.sqrt(r * r - (dw / 2) ** 2);
    const yc = shopY + SHOP_H * 0.1 + r, spring = yc + k;
    g.fillStyle = theme.trim;                                         // carved plaster surround
    g.fillRect(dx - 6, shopY + SHOP_H * 0.04, dw + 12, SHOP_H);
    g.fillStyle = pickR(doors);
    g.beginPath();
    g.moveTo(dx, H - 4); g.lineTo(dx, spring);
    g.arc(dx + dw / 2, yc, r, Math.atan2(k, -dw / 2), Math.atan2(k, dw / 2));
    g.lineTo(dx + dw, H - 4); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,230,170,.75)';                            // studs
    for (let sy = spring + 4; sy < H - 8; sy += 9) for (let sx = dx + 5; sx < dx + dw - 3; sx += 9) g.fillRect(sx, sy, 2, 2);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(dx + dw / 2 - 1, spring, 2, H - 4 - spring);
  }
  for (let x = 0, k = 0; x < W; x += 6, k++) {                       // zellige dado
    g.fillStyle = ['#1f7a6a', '#f2e8d6', '#2c5ca8', '#f2e8d6'][k % 4];
    g.fillRect(x, H - 12, 6, 8);
  }
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
    // Hanging boutique sign. It used to be a bare coloured rectangle floating
    // on the wall — at a grazing angle a row of those read as unexplained red
    // blobs down the street. Now it hangs off a visible wrought-iron bracket
    // with a gold border and a shadow, so it reads as signage.
    const col = pickR(shops);
    const sx = dx + dw + 6, sy = shopY + SHOP_H * 0.26, sw = 20, sh = 13;
    g.strokeStyle = '#2a1f14'; g.lineWidth = 2;      // bracket arm + hanger
    g.beginPath();
    g.moveTo(sx - 5, sy - 9); g.lineTo(sx + sw + 1, sy - 9);
    g.moveTo(sx + 3, sy - 9); g.lineTo(sx + 3, sy);
    g.moveTo(sx + sw - 3, sy - 9); g.lineTo(sx + sw - 3, sy);
    g.stroke();
    g.fillStyle = 'rgba(0,0,0,.22)';
    g.fillRect(sx + 2, sy + 2, sw, sh);
    g.fillStyle = col;
    g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = 'rgba(240,222,178,.95)'; g.lineWidth = 1.5;
    g.strokeRect(sx + 1.5, sy + 1.5, sw - 3, sh - 3);
    g.fillStyle = 'rgba(255,248,232,.92)';
    g.fillRect(sx + 4, sy + sh * 0.42, sw - 8, 3);
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
// San Francisco row house: a garage at street level and the front door up a
// short flight of steps beside it. A residential block, so no shopfronts.
function paintRowhouseGround({ g, W, H, shopY, SHOP_H, theme, variant }) {
  g.fillStyle = 'rgba(0,0,0,.12)';
  g.fillRect(0, shopY, W, SHOP_H);
  const garLeft = variant % 2 === 0;
  // garage door: a panelled roller door set in a trim-coloured frame
  const gw = W * 0.48, gx = garLeft ? W * 0.08 : W * 0.44;
  const gh = SHOP_H * 0.72, gy = H - 4 - gh;
  g.fillStyle = theme.trim || '#f2ece0';
  g.fillRect(gx - 5, gy - 6, gw + 10, gh + 6);
  g.fillStyle = 'rgba(246,242,232,.96)';
  g.fillRect(gx, gy, gw, gh);
  g.fillStyle = 'rgba(0,0,0,.13)';
  for (let yy = gy + gh / 4; yy < gy + gh; yy += gh / 4) g.fillRect(gx, yy, gw, 2);
  // front door in the house's accent colour, with a glazed transom
  const doors = theme.storefront && theme.storefront.length ? theme.storefront : ['#5a6a8a'];
  const dw = W * 0.2, dx = garLeft ? W * 0.68 : W * 0.12;
  const step = SHOP_H * 0.06;
  const dh = SHOP_H * 0.6, dy = H - 4 - dh - step * 3;
  g.fillStyle = theme.trim || '#f2ece0';
  g.fillRect(dx - 6, dy - 10, dw + 12, dh + 10);
  g.fillStyle = doors[variant % doors.length];
  g.fillRect(dx, dy, dw, dh);
  g.fillStyle = 'rgba(200,225,245,.85)';
  g.fillRect(dx + dw * 0.18, dy + dh * 0.1, dw * 0.64, dh * 0.3);
  // three stone steps down to the pavement
  for (let i = 0; i < 3; i++) {
    g.fillStyle = i % 2 ? '#bdb6a8' : '#cfc8ba';
    g.fillRect(dx - 8 - i * 4, dy + dh + i * step, dw + 16 + i * 8, step);
  }
}

// Market Street: a Beaux-Arts banking hall. Rusticated stone with tall
// round-headed windows, bronze doors in the middle bay.
function paintBeauxGround({ g, W, H, shopY, SHOP_H, theme }) {
  g.fillStyle = 'rgba(0,0,0,.07)';
  g.fillRect(0, shopY, W, SHOP_H);
  g.fillStyle = 'rgba(0,0,0,.1)';
  for (let yy = shopY + 10; yy < H; yy += 14) g.fillRect(0, yy, W, 2);
  const bays = 3, bw = W / bays;
  for (let i = 0; i < bays; i++) {
    const cx = bw * i + bw / 2, r = bw * 0.26;
    const top = shopY + SHOP_H * 0.14, bot = H - 6;
    g.fillStyle = i === 1 ? '#5a4630' : 'rgba(40,56,80,.92)';
    g.beginPath();
    g.moveTo(cx - r, bot); g.lineTo(cx - r, top + r);
    g.arc(cx, top + r, r, Math.PI, 0);
    g.lineTo(cx + r, bot);
    g.fill();
    g.fillStyle = theme.trim || '#efe8d6';
    g.fillRect(cx - 5, top - 5, 10, 12);                 // keystone
    if (i !== 1) {
      g.fillStyle = 'rgba(210,190,130,.55)';               // bronze glazing bars
      g.fillRect(cx - 1, top + r * 0.5, 2, bot - top - r * 0.5);
      g.fillRect(cx - r, top + r + (bot - top - r) * 0.45, r * 2, 2);
    }
  }
}

export function roadTexture(theme) {
  return cached(`road:${sKey(theme)}`, () =>
    canvasTexture(512, 512, (g) => {
      const style = theme.roadStyle || 'asphalt';
      g.fillStyle = theme.road; g.fillRect(0, 0, 512, 512);
      if (style === 'cobble' || style === 'travertine' || style === 'brick') {
        // fan-set cobbles / travertine setts / Lombard's red brick
        const cw = style === 'cobble' ? 26 : style === 'brick' ? 40 : 42;
        const ch = style === 'cobble' ? 20 : style === 'brick' ? 15 : 30;
        if (style === 'brick') { g.fillStyle = '#9a8c80'; g.fillRect(0, 0, 512, 512); }   // mortar
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
        // Market Street: streetcar rails set into the centre lane
        if (style === 'trainline') {
          // Hanoi's Train Street: metre-gauge rails on sleepers down the
          // left lane (lane 0, centred at x = 113 of 512)
          g.fillStyle = 'rgba(70,52,36,.85)';
          for (let y = 0; y < 512; y += 22) g.fillRect(113 - 46, y, 92, 9);
          for (const rx of [113 - 30, 113 + 30]) {
            g.fillStyle = 'rgba(28,28,32,.6)'; g.fillRect(rx - 5, 0, 10, 512);
            g.fillStyle = 'rgba(206,210,216,.95)'; g.fillRect(rx - 2, 0, 4, 512);
          }
        }
        if (style === 'streetcar') {
          for (const rx of [256 - 34, 256 + 34]) {
            g.fillStyle = 'rgba(28,28,32,.55)'; g.fillRect(rx - 5, 0, 10, 512);
            g.fillStyle = 'rgba(206,210,216,.92)'; g.fillRect(rx - 2, 0, 4, 512);
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

// ---------- San Francisco bay windows and gables ----------
// A three-sided bay: half a hexagonal prism, three facets over pi radians.
// Unscaled it bulges +x; makeBuilding turns it to face the street.
const bayGeo = new THREE.CylinderGeometry(1, 1, 1, 3, 1, false, 0, Math.PI);
// A front gable: a triangle in the street-facing plane, extruded back into
// the block. Unit size, centred; makeBuilding scales it to the house.
const gableGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  geo.translate(0, 0, -0.5);
  geo.rotateY(Math.PI / 2);
  return geo;
})();
SHARED_GEO.add(bayGeo); SHARED_GEO.add(gableGeo);

function bayMat(theme, color, floors) {
  return cached(`bayMat:${sKey(theme)}:${color}:${floors}`, () => new THREE.MeshStandardMaterial({
    map: canvasTexture(192, 96, (g) => {
      g.fillStyle = color; g.fillRect(0, 0, 192, 96);
      g.fillStyle = 'rgba(0,0,0,.07)';
      for (let y = 0; y < 96; y += 9) g.fillRect(0, y, 192, 2);
      for (let i = 0; i < 3; i++) {
        const x = i * 64 + 16;
        g.fillStyle = theme.trim || '#f2ece0';
        g.fillRect(x - 5, 12, 42, 70);
        const gl = g.createLinearGradient(0, 16, 0, 78);
        gl.addColorStop(0, theme.windowDay || '#a8c4d8');
        gl.addColorStop(1, 'rgba(38,54,84,.95)');
        g.fillStyle = gl; g.fillRect(x, 16, 32, 62);
        g.fillStyle = 'rgba(30,34,44,.55)'; g.fillRect(x, 44, 32, 2);
      }
    }, 1, floors),
    roughness: 0.8,
  }));
}
function bayTopMat(theme) {
  return cached(`bayTop:${sKey(theme)}`, () =>
    new THREE.MeshStandardMaterial({ color: theme.trim || '#f2ece0', roughness: 0.85 }));
}

// ---------- buildings ----------
export function makeBuilding(theme, w, h, d, rng = Math.random, side = 0) {
  if (theme.facade === 'georgian') return makeVilla(theme, w, d, rng, side);

  const color = theme.palette[(rng() * theme.palette.length) | 0];
  const floors = Math.max(4, Math.round(h / 3.2));
  // Beaux-Arts banks are mostly pier, not window: widening the bay spacing
  // is what keeps Market Street reading as pale stone rather than dark glass.
  const cols = Math.max(3, Math.round(w / (theme.facade === 'beauxarts' ? 3.6 : 2.2)));
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
  // Oxford Street: columned department-store flagship front. Only some of the
  // buildings get the giant order — every building carrying one produced an
  // unbroken colonnade down both pavements, which at landscape's 94° horizontal
  // FOV filled the near corners of the frame with white stone. Punctuating it
  // with plainer shopfronts also matches the real street.
  if (theme.facade === 'deptstore' && side !== 0 && rng() < 0.55) {
    const front = makeDeptFront(theme, Math.min(d - 0.3, 8.6));
    // 0.55 → 0.2: the front now sits tight against the building line rather
    // than standing 35cm proud of it.
    front.position.set(-side * (w / 2 + 0.2), 0, 0);
    front.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(front);
  }
  // Seoul's hanok: a hipped roof of dark grey tiles, its eaves reaching out
  // well past the walls
  if (theme.facade === 'hanok' || theme.facade === 'hutong') {
    const roof = new THREE.Mesh(cached('geo:hanokRoof', () => {
      const geo = new THREE.CylinderGeometry(0.01, 1, 1, 4, 1);
      geo.rotateY(Math.PI / 4);
      return geo;
    }), cached('mat:hanokRoof', () => new THREE.MeshStandardMaterial({ color: 0x3a3c42, roughness: 0.7 })));
    roof.scale.set((w + 1.6) / Math.SQRT2, 2.0, (d + 1.6) / Math.SQRT2);
    roof.position.y = h + 1.2;
    group.add(roof);
    const ridge = new THREE.Mesh(boxGeo, cached('mat:hanokRidge', () => new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.8 })));
    ridge.scale.set(0.3, 0.25, d * 0.5); ridge.position.y = h + 2.0; group.add(ridge);
  }
  // Venice: the funnel-shaped chimneys (camini a imbuto) on the roofs, and
  // on some houses an altana, a wooden roof terrace on posts. Cosmetic.
  if (theme.facade === 'venetian') {
    const brick = cached('mat:vChimney', () => new THREE.MeshStandardMaterial({ color: 0xb8664a, roughness: 0.85 }));
    const n = 1 + ((Math.random() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const x = (Math.random() - 0.5) * (w - 1.6), z = (Math.random() - 0.5) * (d - 1.6);
      const stack = new THREE.Mesh(boxGeo, brick);
      stack.scale.set(0.45, 1.5, 0.45); stack.position.set(x, h + 0.75, z); group.add(stack);
      const funnel = new THREE.Mesh(cached('geo:vFunnel', () => new THREE.CylinderGeometry(0.55, 0.2, 0.9, 10)), brick);
      funnel.position.set(x, h + 1.95, z); group.add(funnel);
    }
    if (Math.random() < 0.3) {
      const wood = cached('mat:altana', () => new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 }));
      const deck = new THREE.Mesh(boxGeo, wood);
      deck.scale.set(2.6, 0.12, 2.6); deck.position.set(0, h + 1.6, 0); group.add(deck);
      for (const sx of [-1.2, 1.2]) for (const sz of [-1.2, 1.2]) {
        const post = new THREE.Mesh(boxGeo, wood);
        post.scale.set(0.1, 2.4, 0.1); post.position.set(sx, h + 1.2, sz); group.add(post);
      }
      const rail = new THREE.Mesh(boxGeo, wood);
      rail.scale.set(2.6, 0.08, 0.08); rail.position.set(0, h + 2.5, 1.25); group.add(rail);
    }
  }
  // Long Street: a first-floor balcony with an iron-lace railing, carried
  // on slim columns at the pavement edge, the length of the house front.
  if (theme.facade === 'veranda' && side !== 0) {
    const iron = cached('mat:veranda', () => new THREE.MeshStandardMaterial({ color: 0x2a3a34, roughness: 0.5, metalness: 0.4 }));
    const out = -side * (w / 2 + 0.75);
    const deck = new THREE.Mesh(boxGeo, iron);
    deck.scale.set(1.5, 0.14, d - 0.6); deck.position.set(out, 3.6, 0); group.add(deck);
    const roof = new THREE.Mesh(boxGeo, cached('mat:verandaRoof', () => new THREE.MeshStandardMaterial({ color: 0xc8cccc, roughness: 0.5, metalness: 0.5 })));
    roof.scale.set(1.6, 0.08, d - 0.5); roof.position.set(out, 6.4, 0); roof.rotation.z = side * 0.12; group.add(roof);
    const rail = new THREE.Mesh(boxGeo, iron);
    rail.scale.set(0.06, 0.9, d - 0.6); rail.position.set(out - side * 0.72, 4.15, 0); group.add(rail);
    for (let z = -(d - 1) / 2; z <= (d - 1) / 2 + 0.01; z += (d - 1) / Math.max(1, Math.round((d - 1) / 2.6))) {
      for (const y of [1.8, 5.0]) {
        const col = new THREE.Mesh(cylGeo, iron);
        col.scale.set(0.07, 3.2, 0.07); col.position.set(out - side * 0.7, y, z); group.add(col);
      }
    }
  }
  // Yaowarat: tall vertical neon signs hung out from the house fronts over
  // the street, a word spelled down each in lit letters. Cosmetic, so the
  // choices use Math.random, not the seeded stream.
  if (theme.neonSigns && side !== 0 && Math.random() < 0.7) {
    const words = adWords(theme, ['GOLD']);
    const wi = (Math.random() * words.length) | 0, ci = (Math.random() * 3) | 0;
    const mat = cached(`mat:vneon:${sKey(theme)}:${wi}:${ci}`, () => {
      const word = words[wi], bg = ['#a8141c', '#f0c020', '#1a3a8a'][ci], fg = ['#fff2b0', '#a8141c', '#ffe060'][ci];
      const tex = canvasTexture(64, 256, (c) => {
        c.fillStyle = bg; c.fillRect(0, 0, 64, 256);
        c.strokeStyle = fg; c.lineWidth = 3; c.strokeRect(4, 4, 56, 248);
        c.fillStyle = fg; c.font = '900 30px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
        const letters = word.replace(/ /g, '').slice(0, 7);
        const step = 236 / letters.length;
        [...letters].forEach((ch, k) => c.fillText(ch, 32, 10 + step * (k + 0.5)));
      });
      return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.5 });
    });
    const sign = new THREE.Mesh(boxGeo, mat);
    const hh = Math.min(4.2, h - 5);
    if (hh > 2) {
      // sticks out from the facade (x), its faces towards the oncoming runner
      sign.scale.set(1.3, hh, 0.18);
      sign.position.set(-side * (w / 2 + 0.75), 4.2 + hh / 2, (Math.random() - 0.5) * (d - 2));
      group.add(sign);
    }
  }
  // Via Veneto: entrance canopy + national flags over the door
  if (theme.facade === 'hotel' && side !== 0) {
    const can = makeHotelCanopy(theme);
    can.position.set(-side * (w / 2 + 0.9), 0, 0);
    can.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(can);
  }

  // San Francisco: a three-sided bay window running up the street face of
  // every house, and a front gable on the Victorians. No rng() here: both are
  // placed from the building's own dimensions, so they cannot shift the
  // seeded stream the rest of the street is laid out from.
  if ((theme.facade === 'rowhouse' || theme.facade === 'victorian') && side !== 0) {
    const bayH = h - 3.4;
    if (bayH > 2) {
      const floorsB = Math.max(1, Math.round(bayH / 3.2));
      const zs = d > 9 ? [-d * 0.24, d * 0.24] : [0];
      for (const zz of zs) {
        const bay = new THREE.Mesh(bayGeo, [bayMat(theme, color, floorsB), bayTopMat(theme), bayTopMat(theme)]);
        bay.scale.set(1.0, bayH, 1.15);
        bay.position.set(-side * (w / 2), 3.4 + bayH / 2, zz);
        bay.rotation.y = side > 0 ? Math.PI : 0;
        bay.castShadow = true;
        group.add(bay);
      }
    }
    if (theme.facade === 'victorian' && Math.round(d * 10) % 2 === 0) {
      const gable = new THREE.Mesh(gableGeo, [
        cached(`mat:gableEnd:${color}`, () => new THREE.MeshStandardMaterial({ color, roughness: 0.85 })),
        cached(`mat:gableRoof:${sKey(theme)}`, () => new THREE.MeshStandardMaterial({ color: theme.roof || '#5a5450', roughness: 0.8 })),
      ]);
      gable.scale.set(w, Math.min(3.2, d * 0.42), d * 0.98);
      gable.position.y = h + 0.44;
      gable.castShadow = true;
      group.add(gable);
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
    } else if (theme.id === 'jerusalem') {
      // a rooftop solar water heater: a tilted panel and its white tank,
      // on nearly every flat roof in Israel
      top = new THREE.Group();
      const panel = new THREE.Mesh(boxGeo,
        cached('mat:solarPanel', () => new THREE.MeshStandardMaterial({ color: 0x24344c, roughness: 0.3, metalness: 0.5 })));
      panel.scale.set(1.8, 0.08, 1.4); panel.rotation.x = -0.6; panel.position.set(0, -0.3, 0.3);
      top.add(panel);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.8, 10),
        cached('mat:solarTank', () => new THREE.MeshStandardMaterial({ color: 0xe8e8e2, roughness: 0.5 })));
      tank.rotation.z = Math.PI / 2; tank.position.set(0, 0.05, -0.45);
      top.add(tank);
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
  const words = adWords(theme, BRANDS.show);
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
  // Entablature + cornice over the giant order. Kept shallow (1.2 → 0.7 deep)
  // and pulled back level with the columns: the old slab oversailed the
  // pavement by 70cm at eye height and was the single heaviest thing in the
  // near frame.
  const ent = new THREE.Mesh(boxGeo, stoneMat);
  ent.scale.set(w + 0.5, 0.7, 0.7);
  ent.position.set(0, 6.55, 0.02);
  ent.castShadow = true;
  g.add(ent);
  const cornice = new THREE.Mesh(boxGeo, stoneMat);
  cornice.scale.set(w + 0.8, 0.26, 0.62);
  cornice.position.set(0, 7.0, 0.06);
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
  } else if (theme.id === 'marrakech') {
    // a pierced brass lantern instead of a globe
    head.scale.set(0.8, 1.2, 0.8);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.34, 6), mats.gold);
    cap.position.y = 5.08; g.add(cap);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.12, 0.14, 6), mats.gold);
    base.position.y = 4.32; g.add(base);
  } else if (theme.id === 'paris' || theme.id === 'rome') {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.1, 0.2, 8), mats.gold);
    collar.position.y = 4.42; g.add(collar);
  }
  return g;
}

export function makeTree(kind = 'round') {
  const g = new THREE.Group();
  if (kind === 'jacaranda') {
    // jacaranda in flower: a dark twisting trunk under a wide, loose crown
    // of violet-blue blossom
    const trunk = new THREE.Mesh(cached('geo:jacTrunk', () => new THREE.CylinderGeometry(0.14, 0.24, 3.0, 7)), mats.trunk);
    trunk.position.y = 1.5; trunk.rotation.z = 0.06; trunk.castShadow = true; g.add(trunk);
    const bloom = cached('mat:jacBloom', () => new THREE.MeshStandardMaterial({ color: 0x8a6ad8, roughness: 0.9, emissive: 0x2a1a5a, emissiveIntensity: 0.25 }));
    for (const [x, y, z, s] of [[0, 3.6, 0, 1.6], [-0.9, 3.2, 0.4, 1.1], [0.9, 3.3, -0.3, 1.2], [0.2, 4.2, 0.5, 1.0]]) {
      const c = new THREE.Mesh(ballGeo, bloom);
      c.scale.set(s, s * 0.6, s); c.position.set(x, y, z); c.castShadow = true; g.add(c);
    }
  } else if (kind === 'palm') {
    // date palm: a tall, slightly leaning ringed trunk and a crown of
    // drooping fronds, well above head height
    const lean = (Math.random() - 0.5) * 0.12;
    for (let i = 0; i < 6; i++) {
      const seg = new THREE.Mesh(cached('geo:palmSeg', () => new THREE.CylinderGeometry(0.2, 0.25, 1.05, 8)), mats.trunk);
      seg.position.set(lean * i, 0.5 + i * 1.0, 0); seg.castShadow = true; g.add(seg);
    }
    const top = new THREE.Vector3(lean * 6, 6.1, 0);
    const frondGeo = cached('geo:palmFrond', () => {
      const geo = new THREE.ConeGeometry(0.34, 2.6, 4);
      geo.translate(0, 1.3, 0);
      return geo;
    });
    for (let i = 0; i < 9; i++) {
      const fr = new THREE.Mesh(frondGeo, mats.leaf);
      fr.position.copy(top);
      fr.rotation.set(0, (i / 9) * Math.PI * 2, 1.15 + (i % 2) * 0.35, 'YXZ');
      fr.scale.set(1, 1, 0.25);
      g.add(fr);
    }
  } else if (kind === 'cypress') {
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
// A street's own ad words, or the fallback. An empty list counts as none:
// SF's Lombard street sets `ads: []`, and indexing an empty list painted
// "undefined" on its signs.
function adWords(theme, fallback) {
  return theme.ads?.length ? theme.ads : fallback;
}

const ADS = {
  venice: ['MASKS', 'GLASS', 'GELATO', 'BOOKS'],
  nyc: ['BROADWAY', 'LIVE!', 'CITY RUN', '42nd ST', 'NEON', 'PIZZA', 'JAZZ CLUB'],
  paris: ['CAFÉ', 'MODE', 'PARFUM', 'BISTRO'],
  london: ['WEST END', 'TEA & CO', 'THE TUBE', 'OXFORD ST'],
  rome: ['GELATO', 'CINEMA', 'MODA', 'ROMA'],
  sf: ['CABLE CAR', 'SOURDOUGH', 'BAY TOURS', 'CHOWDER'],
  jerusalem: ['FALAFEL', 'BOOKS & MAPS', 'SPICE HOUSE', 'OLD CITY TOURS'],
  mexico: ['TACOS', 'PAN DULCE', 'MERCADO', 'CAFÉ'],
  marrakech: ['TAPIS', 'ÉPICES', 'HAMMAM', 'ARGAN'],
  delhi: ['CHAI', 'MITHAI', 'SAREES', 'BOOKS'],
  bangkok: ['NOODLES', 'MANGO', 'SILK', 'COFFEE'],
  capetown: ['SURF', 'BOOKS', 'COFFEE', 'MARKET'],
  hanoi: ['PHO', 'SILK', 'COFFEE', 'LANTERNS'],
  seoul: ['TEA', 'GALLERY', 'CAFÉ', 'BOOKS'],
  samarkand: ['SILK', 'CERAMICS', 'BREAD', 'TEA'],
  zanzibar: ['SPICES', 'KANGA', 'COFFEE', 'TOURS'],
  beijing: ['TEA', 'DUMPLINGS', 'NOODLES', 'BOOKS'],
  havana: ['CAFÉ', 'MUSIC', 'BOOKS', 'ICE CREAM'],
  istanbul: ['SIMIT', 'TEA', 'BOOKS', 'LOKUM'],
  chicago: ['PIZZA', 'JAZZ', 'BLUES', 'HOT DOGS'],
  buenosaires: ['CAFÉ', 'TANGO', 'BOOKS', 'EMPANADAS'],
};

export function makeBillboard(theme, w = 5, h = 2.6) {
  const words = adWords(theme, ADS[theme.id] || ADS.nyc);
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
  const words = adWords(theme, BRANDS.show);
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

// Cape Town: a flag on a tall pole, standing out stiff in the wind.
function makeWindFlag() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(cylGeo, mats.chrome);
  pole.scale.set(0.05, 5.4, 0.05); pole.position.y = 2.7; g.add(pole);
  const cols = [0x1a7ad0, 0xe8302a, 0xf2b418, 0x2a9a5a];
  const ci = (Math.random() * cols.length) | 0;
  const flag = new THREE.Mesh(boxGeo, cached(`mat:windflag:${ci}`, () => new THREE.MeshStandardMaterial({ color: cols[ci], roughness: 0.8, side: THREE.DoubleSide })));
  flag.scale.set(0.03, 0.6, 1.0); flag.position.set(0, 5.05, -0.5); g.add(flag);
  return g;
}

// Cape Town's quay: a cast-iron mooring bollard.
function makeBollard() {
  const g = new THREE.Group();
  const m = cached('mat:bollard', () => new THREE.MeshStandardMaterial({ color: 0x2a2a30, roughness: 0.5, metalness: 0.5 }));
  const post = new THREE.Mesh(cylGeo, m);
  post.scale.set(0.22, 0.7, 0.22); post.position.y = 0.35; g.add(post);
  const cap = new THREE.Mesh(ballGeo, m);
  cap.scale.set(0.3, 0.14, 0.3); cap.position.y = 0.72; g.add(cap);
  return g;
}

// Bangkok: a fruit seller's glass-sided cart, ice and cut fruit inside,
// under a striped umbrella.
function makeFruitCart() {
  const g = new THREE.Group();
  const frame = cached('mat:fruitFrame', () => new THREE.MeshStandardMaterial({ color: 0xd8dce4, roughness: 0.35, metalness: 0.5 }));
  const cart = new THREE.Mesh(boxGeo, frame);
  cart.scale.set(0.9, 0.7, 1.5); cart.position.y = 0.6; cart.castShadow = true; g.add(cart);
  const glass = new THREE.Mesh(boxGeo, cached('mat:fruitGlass', () =>
    new THREE.MeshStandardMaterial({ color: 0xcfe8f0, roughness: 0.1, transparent: true, opacity: 0.5 })));
  glass.scale.set(0.86, 0.5, 1.46); glass.position.y = 1.2; g.add(glass);
  const cols = [0xf2c418, 0xe8506a, 0x8ac040, 0xf28a20];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(ballGeo, cached(`mat:fruit:${i % 4}`, () => new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.5 })));
    f.scale.setScalar(0.1); f.position.set(-0.2 + (i % 2) * 0.4, 1.08, -0.5 + ((i / 2) | 0) * 0.5); g.add(f);
  }
  const pole = new THREE.Mesh(cylGeo, mats.black);
  pole.scale.set(0.03, 1.4, 0.03); pole.position.set(0, 1.9, 0); g.add(pole);
  const umb = new THREE.Mesh(coneGeo, cached('mat:fruitUmb', () => new THREE.MeshStandardMaterial({ color: 0x2a8a5a, roughness: 0.9 })));
  umb.scale.set(1.0, 0.4, 1.0); umb.position.y = 2.7; g.add(umb);
  return g;
}

// Delhi: a tea seller's cart, a brass kettle on a little stove, glasses
// lined up, under a faded umbrella.
function makeChaiStall() {
  const g = new THREE.Group();
  const wood = cached('mat:chaiWood', () => new THREE.MeshStandardMaterial({ color: 0x5a7a8a, roughness: 0.8 }));
  const cart = new THREE.Mesh(boxGeo, wood);
  cart.scale.set(0.9, 0.9, 1.5); cart.position.y = 0.75; cart.castShadow = true; g.add(cart);
  const kettle = new THREE.Mesh(ballGeo, mats.gold);
  kettle.scale.set(0.2, 0.18, 0.2); kettle.position.set(0, 1.4, 0.3); g.add(kettle);
  for (let i = 0; i < 4; i++) {
    const cup = new THREE.Mesh(cylGeo, cached('mat:chaiCup', () => new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.4 })));
    cup.scale.set(0.05, 0.1, 0.05); cup.position.set(-0.2 + i * 0.13, 1.25, -0.3); g.add(cup);
  }
  const pole = new THREE.Mesh(cylGeo, mats.black);
  pole.scale.set(0.03, 1.6, 0.03); pole.position.set(0, 1.9, 0); g.add(pole);
  const umb = new THREE.Mesh(coneGeo, cached('mat:chaiUmb', () => new THREE.MeshStandardMaterial({ color: 0xc8503a, roughness: 0.9 })));
  umb.scale.set(1.0, 0.4, 1.0); umb.position.y = 2.8; g.add(umb);
  return g;
}

// Marrakech: rugs hung to show on a wooden rail outside a shop. Built along
// the street (the rugs face the road), so it needs no turning.
const RUG_COLS = [['#b0302c', '#e8c070'], ['#2c5ca8', '#f2e8d6'], ['#d8a020', '#7a2a24'], ['#1f7a6a', '#f2d8a0'], ['#6a3a8a', '#e8a050']];
function makeRugRack() {
  const g = new THREE.Group();
  const wood = cached('mat:rugWood', () => new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.9 }));
  for (const z of [-1.6, 1.6]) {
    const post = new THREE.Mesh(boxGeo, wood);
    post.scale.set(0.1, 2.6, 0.1); post.position.set(0, 1.3, z); g.add(post);
  }
  const rail = new THREE.Mesh(boxGeo, wood);
  rail.scale.set(0.1, 0.1, 3.4); rail.position.y = 2.55; g.add(rail);
  for (let i = 0; i < 2; i++) {
    const ci = (Math.random() * RUG_COLS.length) | 0;
    const mat = cached(`mat:rug:${ci}`, () => {
      const [a, b] = RUG_COLS[ci];
      const tex = canvasTexture(64, 96, (c) => {
        c.fillStyle = a; c.fillRect(0, 0, 64, 96);
        c.strokeStyle = b; c.lineWidth = 3; c.strokeRect(5, 5, 54, 86);
        c.fillStyle = b;
        for (let y = 20; y < 80; y += 20) {
          c.beginPath(); c.moveTo(32, y - 8); c.lineTo(44, y); c.lineTo(32, y + 8); c.lineTo(20, y); c.closePath(); c.fill();
        }
      });
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, side: THREE.DoubleSide });
    });
    const rug = new THREE.Mesh(boxGeo, mat);
    rug.scale.set(0.04, 2.1, 1.45);
    rug.position.set(0, 1.45, -0.78 + i * 1.56);
    g.add(rug);
  }
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
  // Venice has no cars: porters' trolleys wait at the side instead
  if (theme.parked === 'carrello') return makeCarrello();
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

// Lombard Street: a brick planter packed with hydrangeas.
const BLOOMS = [0x6a8ad8, 0xd87aa8, 0x9a78d0, 0xeef0f8];
function makeFlowerbed() {
  const g = new THREE.Group();
  const box = new THREE.Mesh(boxGeo, cached('mat:planter', () =>
    new THREE.MeshStandardMaterial({ color: 0x8a4a34, roughness: 0.9 })));
  box.scale.set(1.1, 0.5, 2.6);
  box.position.y = 0.25; box.castShadow = true; box.receiveShadow = true;
  g.add(box);
  const leaves = new THREE.Mesh(ballGeo, mats.leafDark);
  leaves.scale.set(0.52, 0.3, 1.26);
  leaves.position.y = 0.56;
  g.add(leaves);
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(ballGeo, cached(`mat:bloom:${i % 4}`, () =>
      new THREE.MeshStandardMaterial({ color: BLOOMS[i % 4], roughness: 0.8 })));
    b.scale.setScalar(0.24 + (i % 3) * 0.03);
    b.position.set((i % 2 ? 0.22 : -0.2), 0.74 + (i % 3) * 0.04, -1.05 + i * 0.35);
    g.add(b);
  }
  return g;
}

// Market Street: a trolley-wire pole. The wires themselves are street spans.
function makeTrolleyPole() {
  const g = new THREE.Group();
  const m = cached('mat:trolleyPole', () =>
    new THREE.MeshStandardMaterial({ color: 0x2e4a3a, roughness: 0.6, metalness: 0.4 }));
  const pole = new THREE.Mesh(cylGeo, m);
  pole.scale.set(0.13, 7.4, 0.13);
  pole.position.y = 3.7; pole.castShadow = true;
  g.add(pole);
  const cap = new THREE.Mesh(ballGeo, m);
  cap.scale.setScalar(0.2);
  cap.position.y = 7.45;
  g.add(cap);
  return g;
}

export function makeProp(kind, theme) {
  switch (kind) {
    case 'lamp': case 'lamp_paris': case 'lamp_london': case 'lamp_rome': case 'lamp_sf': case 'lamp_jerusalem': return makeLamp(theme);
    case 'flowerbed': return makeFlowerbed();
    case 'streetcar_pole': return makeTrolleyPole();
    case 'tree': return makeTree('round');
    case 'cypress': return makeTree('cypress');
    case 'palm': return makeTree('palm');
    case 'jacaranda': return makeTree('jacaranda');
    case 'rugs': return makeRugRack();
    case 'chaistall': return makeChaiStall();
    case 'fruitcart': return makeFruitCart();
    case 'flagpole': return makeWindFlag();
    case 'bollard': return makeBollard();
    case 'chestnut': return makeTree('chestnut');
    case 'planetree': return makeTree('plane');
    case 'phonebox': return makePhonebox();
    case 'postbox': return makePostbox();
    case 'hydrant': return makeHydrant();
    case 'wellhead': return makeWellhead();
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
  if (style === 'wires') {
    // Market Street: a trolley cross-span, with the two hangers that hold
    // the contact wire over the centre lane. Wire only, no decoration.
    for (const hx of [-0.9, 0.9]) {
      const hanger = new THREE.Mesh(boxGeo, cache.get('mat:wire'));
      hanger.scale.set(0.03, 0.5, 0.03);
      hanger.position.set(hx, -0.25, 0);
      g.add(hanger);
    }
    return g;
  }
  if (style === 'lanterns') {
    // Hanoi: a string of round silk lanterns in red, yellow and pink
    const cols = [0xd8202a, 0xf2b418, 0xe8508a, 0xd8202a, 0xf28a20];
    for (let i = 0; i < 9; i++) {
      const t = (i + 0.5) / 9;
      const l = new THREE.Mesh(ballGeo, cached(`mat:silkLantern:${i % 5}`, () =>
        new THREE.MeshStandardMaterial({ color: cols[i % 5], emissive: cols[i % 5], emissiveIntensity: 0.55, roughness: 0.6 })));
      l.scale.set(0.28, 0.36, 0.28);
      l.position.set((t - 0.5) * width, -0.45 - Math.sin(t * Math.PI) * 0.3, 0);
      g.add(l);
    }
    return g;
  }
  if (style === 'tangle') {
    // Old Delhi: a sagging tangle of cables strung across the lane, a dozen
    // of them at different sags, and a junction box hanging in the middle.
    const cable = cached('mat:cable', () => new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.7 }));
    for (let k = 0; k < 12; k++) {
      const sag = 0.3 + (k % 5) * 0.22, dz = (k % 4 - 1.5) * 0.18;
      for (let i = 0; i < 8; i++) {
        const t0 = i / 8, t1 = (i + 1) / 8;
        const y0 = -Math.sin(t0 * Math.PI) * sag, y1 = -Math.sin(t1 * Math.PI) * sag;
        const seg = new THREE.Mesh(boxGeo, cable);
        const len = Math.hypot(width / 8, y1 - y0);
        seg.scale.set(len, 0.035, 0.035);
        seg.position.set((t0 + t1 - 1) / 2 * width, (y0 + y1) / 2 - k * 0.04, dz);
        seg.rotation.z = Math.atan2(y1 - y0, width / 8);
        g.add(seg);
      }
    }
    const box = new THREE.Mesh(boxGeo, cable);
    box.scale.set(0.4, 0.5, 0.3); box.position.set(width * 0.12, -0.9, 0); g.add(box);
    return g;
  }
  if (style === 'laundry') {
    // Venice: washing hung out on a line between the houses
    const cols = [0xf4f4f0, 0x3a6ac8, 0xe8b040, 0xd84a4a, 0xf4f4f0, 0x6ab07a];
    for (let i = 0; i < 16; i++) {
      if (Math.random() < 0.3) continue;
      const t = (i + 0.5) / 16;
      const cloth = new THREE.Mesh(boxGeo, cached(`mat:laundry:${i % 6}`, () => new THREE.MeshStandardMaterial({ color: cols[i % 6], roughness: 0.95 })));
      const tall = 0.3 + Math.random() * 0.35;
      cloth.scale.set(0.3 + Math.random() * 0.25, tall, 0.03);
      cloth.position.set((t - 0.5) * width, -tall / 2 - Math.sin(t * Math.PI) * 0.25, 0);
      g.add(cloth);
    }
    return g;
  }
  if (style === 'slats') {
    // Marrakech's souks: a panel of reed slats laid across the lane on a
    // couple of beams, throwing stripes of light down onto the street.
    const reed = cached('mat:reed', () => new THREE.MeshStandardMaterial({ color: 0xb08a58, roughness: 1 }));
    for (const bz of [-1.4, 1.4]) {
      const beam = new THREE.Mesh(boxGeo, cache.get('mat:wire'));
      beam.scale.set(width, 0.12, 0.12); beam.position.z = bz; g.add(beam);
    }
    for (let i = 0; i < 9; i++) {
      const slat = new THREE.Mesh(boxGeo, reed);
      slat.scale.set(width, 0.06, 0.16);
      slat.position.set(0, 0.09, -1.6 + i * 0.4);
      g.add(slat);
    }
    return g;
  }
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
  } else if (style === 'papel') {
    // papel picado: rows of cut-paper flags in bright colours
    const cols = [0xe8307a, 0xf28a0c, 0x2c8ed8, 0x4ab04a, 0xf4c400, 0x8a4ad0];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const f = new THREE.Mesh(boxGeo, cached(`mat:papel:${i % 6}`, () =>
        new THREE.MeshStandardMaterial({ color: cols[i % 6], roughness: 0.7, side: THREE.DoubleSide })));
      f.scale.set(0.42, 0.5, 0.02);
      f.position.set((t - 0.5) * width, -0.32 - Math.sin(t * Math.PI) * 0.28, 0);
      g.add(f);
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
  } else if (kind === 'vocho') {
    // Mexico City's taxi: a VW Beetle (the vocho) in the pink and white the
    // city's taxis have worn since 2013, with its roof sign. A car, not a
    // wall: low enough to jump, like New York's taxis.
    const pink = cached('mat:vocho', () => new THREE.MeshStandardMaterial({ color: 0xe0588e, roughness: 0.3, metalness: 0.2 }));
    const white = cached('mat:vochoRoof', () => new THREE.MeshStandardMaterial({ color: 0xf4f2f0, roughness: 0.3 }));
    const shell = new THREE.Mesh(cached('geo:vochoShell', () => new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)), pink);
    shell.scale.set(0.95, 0.85, 2.0); shell.position.y = 0.35; shell.castShadow = true; g.add(shell);
    const cabin = new THREE.Mesh(cached('geo:vochoCab', () => new THREE.SphereGeometry(0.62, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), white);
    cabin.scale.set(1.2, 1.0, 1.5); cabin.position.set(0, 0.92, -0.1); g.add(cabin);
    const glass = new THREE.Mesh(cached('geo:vochoGlass', () => new THREE.SphereGeometry(0.635, 20, 12, 0, Math.PI * 2, 0.55, 0.45)),
      cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
    glass.scale.set(1.2, 1.0, 1.5); glass.position.set(0, 0.92, -0.1); g.add(glass);
    for (const [x, z] of [[-0.8, 1.1], [0.8, 1.1], [-0.8, -1.15], [0.8, -1.15]]) {
      const fender = new THREE.Mesh(cached('geo:vochoFender', () => new THREE.SphereGeometry(0.42, 14, 8)), pink);
      fender.scale.set(0.55, 0.7, 1); fender.position.set(x, 0.42, z); g.add(fender);
      const wheel = new THREE.Mesh(cached('geo:vochoWheel', () => new THREE.CylinderGeometry(0.3, 0.3, 0.22, 14)),
        cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 })));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(x * 1.05, 0.3, z); g.add(wheel);
    }
    const sign = new THREE.Mesh(boxGeo, mats.glow);
    sign.scale.set(0.5, 0.16, 0.2); sign.position.set(0, 1.6, -0.1); g.add(sign);
  } else if (kind === 'carrello') {
    return makeCarrello();
  } else if (kind === 'colectivo') {
    // Buenos Aires' colectivo: a single-deck city bus in two bright colours,
    // the front painted with fileteado, the city's swirling scroll-work. A
    // wall, as tall as its hitbox (3.2 m).
    const fil = cached('colTex', () => canvasTexture(128, 64, (c) => {
      c.fillStyle = '#e8b020'; c.fillRect(0, 0, 128, 64);
      c.strokeStyle = '#c8302a'; c.lineWidth = 4;
      for (const [cx, s] of [[32, 1], [96, -1]]) {
        c.beginPath();
        for (let t = 0; t < 12; t += 0.2) { const r = 3 + t * 2; c.lineTo(cx + Math.cos(t * s) * r, 32 + Math.sin(t * s) * r); }
        c.stroke();
      }
      c.strokeStyle = '#2a6ac8'; c.lineWidth = 3; c.strokeRect(4, 4, 120, 56);
    }));
    const green = cached('mat:colectivo', () => new THREE.MeshStandardMaterial({ color: 0x2a8a5a, roughness: 0.35, metalness: 0.2 }));
    const body = new THREE.Mesh(boxGeo, green);
    body.scale.set(2.2, 2.7, 5.4); body.position.y = 1.65; body.castShadow = true; g.add(body);
    const front = new THREE.Mesh(boxGeo, cached('mat:colFront', () => new THREE.MeshStandardMaterial({ map: cache.get('colTex'), roughness: 0.5 })));
    front.scale.set(2.1, 1.0, 0.06); front.position.set(0, 0.9, 2.72); g.add(front);
    const glassM = cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
    const screen = new THREE.Mesh(boxGeo, glassM);
    screen.scale.set(2.0, 1.1, 0.06); screen.position.set(0, 2.2, 2.72); g.add(screen);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(boxGeo, glassM);
      side.scale.set(0.04, 0.9, 4.4); side.position.set(sx * 1.11, 2.1, -0.2); g.add(side);
    }
    const roof = new THREE.Mesh(boxGeo, cached('mat:colRoof', () => new THREE.MeshStandardMaterial({ color: 0xe8b020, roughness: 0.5 })));
    roof.scale.set(2.1, 0.3, 5.2); roof.position.y = 3.15; g.add(roof);
  } else if (kind === 'classiccar') {
    return makeClassicCar();
  } else if (kind === 'bjtaxi') {
    // A two-tone city taxi, yellow below and dark green above, with a lit
    // roof sign. A car, low enough to jump.
    const lower = cached('mat:bjtaxiLow', () => new THREE.MeshStandardMaterial({ color: 0xe8c030, roughness: 0.3, metalness: 0.2 }));
    const upper = cached('mat:bjtaxiUp', () => new THREE.MeshStandardMaterial({ color: 0x2a5a4a, roughness: 0.3, metalness: 0.2 }));
    const body = new THREE.Mesh(boxGeo, lower);
    body.scale.set(1.75, 0.6, 3.9); body.position.y = 0.65; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(boxGeo, upper);
    cab.scale.set(1.6, 0.55, 2.0); cab.position.set(0, 1.22, -0.2); g.add(cab);
    const glass = new THREE.Mesh(boxGeo, cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
    glass.scale.set(1.62, 0.38, 1.7); glass.position.set(0, 1.25, -0.2); g.add(glass);
    const sign = new THREE.Mesh(boxGeo, mats.glow);
    sign.scale.set(0.5, 0.16, 0.22); sign.position.set(0, 1.58, -0.2); g.add(sign);
  } else if (kind === 'daladala') {
    // Zanzibar's dala dala: a small truck with a cab in front and an open
    // passenger box behind under a roof on posts, painted bright. A wall:
    // with its roof rack and load it stands 3 m tall.
    const paint = cached('mat:dala', () => new THREE.MeshStandardMaterial({ color: 0x2a8aa8, roughness: 0.4, metalness: 0.15 }));
    const cream = cached('mat:dalaCream', () => new THREE.MeshStandardMaterial({ color: 0xf2e8c8, roughness: 0.6 }));
    const cab = new THREE.Mesh(boxGeo, cream);
    cab.scale.set(2.0, 1.6, 1.6); cab.position.set(0, 1.3, 1.8); cab.castShadow = true; g.add(cab);
    const glassM = cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
    const screen = new THREE.Mesh(boxGeo, glassM);
    screen.scale.set(1.8, 0.6, 0.06); screen.position.set(0, 1.75, 2.62); g.add(screen);
    const box = new THREE.Mesh(boxGeo, paint);
    box.scale.set(2.1, 1.0, 3.4); box.position.set(0, 0.95, -0.7); g.add(box);
    const roof = new THREE.Mesh(boxGeo, paint);
    roof.scale.set(2.2, 0.12, 3.6); roof.position.set(0, 2.7, -0.7); g.add(roof);
    for (const [x, z] of [[-1, 0.9], [1, 0.9], [-1, -2.3], [1, -2.3]]) {
      const post = new THREE.Mesh(boxGeo, mats.black);
      post.scale.set(0.08, 1.3, 0.08); post.position.set(x, 2.05, z); g.add(post);
    }
    const load = new THREE.Mesh(boxGeo, cached('mat:dalaLoad', () => new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.9 })));
    load.scale.set(1.6, 0.4, 2.4); load.position.set(0, 3.0, -0.7); g.add(load);
    for (const sx of [-0.7, 0.7]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats.glow);
      lamp.position.set(sx, 0.85, 2.62); g.add(lamp);
    }
  } else if (kind === 'minivan') {
    // Samarkand: a small, tall white minivan with a sliding door. A car,
    // low enough to jump.
    const white = cached('mat:minivan', () => new THREE.MeshStandardMaterial({ color: 0xf0f0ec, roughness: 0.3, metalness: 0.2 }));
    const body = new THREE.Mesh(boxGeo, white);
    body.scale.set(1.5, 1.2, 3.2); body.position.y = 0.9; body.castShadow = true; g.add(body);
    const glassM = cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
    const screen = new THREE.Mesh(boxGeo, glassM);
    screen.scale.set(1.36, 0.45, 0.06); screen.position.set(0, 1.25, 1.62); g.add(screen);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(boxGeo, glassM);
      side.scale.set(0.04, 0.4, 2.2); side.position.set(sx * 0.76, 1.25, -0.2); g.add(side);
    }
    for (const sx of [-0.5, 0.5]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mats.glow);
      lamp.position.set(sx, 0.6, 1.62); g.add(lamp);
    }
  } else if (kind === 'seoulbus') {
    // Seoul's green city bus: a single-deck bus with a long glass side.
    // A wall, as tall as its hitbox (3.2 m).
    const green = cached('mat:seoulBus', () => new THREE.MeshStandardMaterial({ color: 0x3aa04a, roughness: 0.35, metalness: 0.2 }));
    const body = new THREE.Mesh(boxGeo, green);
    body.scale.set(2.2, 2.7, 5.4); body.position.y = 1.65; body.castShadow = true; g.add(body);
    const glassM = cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
    const screen = new THREE.Mesh(boxGeo, glassM);
    screen.scale.set(2.0, 1.2, 0.06); screen.position.set(0, 2.1, 2.72); g.add(screen);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(boxGeo, glassM);
      side.scale.set(0.04, 0.9, 4.4); side.position.set(sx * 1.11, 2.1, -0.2); g.add(side);
    }
    const roof = new THREE.Mesh(boxGeo, cached('mat:seoulBusRoof', () => new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.5 })));
    roof.scale.set(2.1, 0.3, 5.2); roof.position.y = 3.15; g.add(roof);
  } else if (kind === 'motorbike') {
    return makeMotorbike();
  } else if (kind === 'minibus') {
    // Cape Town's white minibus taxi: a tall, boxy van with a long row of
    // side windows. A wall, as tall as its hitbox (3.2 m with the roof
    // rack and luggage).
    const white = cached('mat:minibus', () => new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.3, metalness: 0.2 }));
    const body = new THREE.Mesh(boxGeo, white);
    body.scale.set(1.95, 2.1, 5.0); body.position.y = 1.35; body.castShadow = true; g.add(body);
    const glassM = cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
    const screen = new THREE.Mesh(boxGeo, glassM);
    screen.scale.set(1.8, 0.8, 0.06); screen.position.set(0, 1.9, 2.5); g.add(screen);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(boxGeo, glassM);
      side.scale.set(0.04, 0.6, 3.8); side.position.set(sx * 0.99, 1.85, -0.3); g.add(side);
    }
    const rack = new THREE.Mesh(boxGeo, mats.black);
    rack.scale.set(1.7, 0.1, 3.6); rack.position.y = 2.5; g.add(rack);
    const bags = new THREE.Mesh(boxGeo, cached('mat:luggage', () => new THREE.MeshStandardMaterial({ color: 0x3a5a8a, roughness: 0.9 })));
    bags.scale.set(1.4, 0.65, 2.2); bags.position.set(0, 2.85, -0.4); g.add(bags);
    for (const sx of [-0.7, 0.7]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mats.glow);
      lamp.position.set(sx, 0.85, 2.52); g.add(lamp);
    }
  } else if (kind === 'tuktuk') {
    return makeTukTuk();
  } else if (kind === 'autorickshaw') {
    return makeAutoRickshaw();
  } else if (kind === 'petittaxi') {
    // Marrakech's petit taxi: a small beige hatchback with a lit roof sign.
    // A car, low enough to jump.
    const beige = cached('mat:ptaxi', () => new THREE.MeshStandardMaterial({ color: 0xd8c098, roughness: 0.35, metalness: 0.15 }));
    const body = new THREE.Mesh(boxGeo, beige);
    body.scale.set(1.7, 0.7, 3.4); body.position.y = 0.7; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(boxGeo, beige);
    cab.scale.set(1.55, 0.55, 2.0); cab.position.set(0, 1.3, -0.35); g.add(cab);
    const glass = new THREE.Mesh(boxGeo,
      cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
    glass.scale.set(1.58, 0.4, 1.7); glass.position.set(0, 1.32, -0.3); g.add(glass);
    const sign = new THREE.Mesh(boxGeo, mats.glow);
    sign.scale.set(0.6, 0.18, 0.24); sign.position.set(0, 1.68, -0.2); g.add(sign);
    for (const sx of [-0.55, 0.55]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats.glow);
      lamp.position.set(sx, 0.85, 1.7); g.add(lamp);
    }
  } else if (kind === 'citybus') {
    // Jerusalem: a single-deck city bus, white with a green band, the livery
    // Israeli buses are known for. No operator name or logo on it: every
    // brand in the game is fictional (docs/COMPLIANCE.md). Same footprint as
    // London's bus so collisions and road clearance are unchanged.
    const busTex = cached('citybusTex', () => canvasTexture(256, 128, (c) => {
      c.fillStyle = '#f2f2ee'; c.fillRect(0, 0, 256, 128);
      c.fillStyle = '#1f7a45'; c.fillRect(0, 74, 256, 22);          // green band
      c.fillStyle = '#2a5a3a'; c.fillRect(0, 100, 256, 6);
      c.fillStyle = '#9cc4dc';
      for (let x = 10; x < 246; x += 30) c.fillRect(x, 16, 24, 44);  // one row of windows
      c.fillStyle = '#1c1c1c'; c.fillRect(0, 64, 256, 4);
    }));
    const body = new THREE.Mesh(boxGeo,
      cached('mat:citybus', () => new THREE.MeshStandardMaterial({ map: cache.get('citybusTex'), roughness: 0.35, metalness: 0.15 })));
    body.scale.set(2.0, 2.7, 5.2);
    body.position.y = 1.7; body.castShadow = true; g.add(body);
    const roof = new THREE.Mesh(boxGeo,
      cached('mat:citybusRoof', () => new THREE.MeshStandardMaterial({ color: 0xe4e4de, roughness: 0.45 })));
    roof.scale.set(1.9, 0.22, 4.9);
    roof.position.y = 3.15; g.add(roof);
    const cabGlass = new THREE.Mesh(boxGeo,
      cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
    cabGlass.scale.set(1.9, 1.1, 0.1);
    cabGlass.position.set(0, 2.2, 2.62); g.add(cabGlass);
    const dest = new THREE.Mesh(boxGeo, mats.glow);                 // destination board
    dest.scale.set(1.3, 0.26, 0.08);
    dest.position.set(0, 2.9, 2.64); g.add(dest);
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
  } else if (kind === 'cablecar') {
    // Powell Street cable car: maroon lower body, cream upper panels, a blue
    // belt line, open running boards and a clerestory roof. Tall: track.js
    // treats it as an unjumpable wall, as it does London's bus, so its
    // height here has to match that hitbox (3.2m).
    const livery = cached('ccTex', () => canvasTexture(256, 128, (c) => {
      c.fillStyle = '#f2e8d0'; c.fillRect(0, 0, 256, 128);
      c.fillStyle = '#8a1f2a'; c.fillRect(0, 78, 256, 50);
      c.fillStyle = '#2a4a8a'; c.fillRect(0, 72, 256, 6);
      c.fillStyle = '#cfe4ff';
      for (let x = 10; x < 250; x += 30) c.fillRect(x, 12, 22, 46);
      c.fillStyle = '#d8a838'; c.font = '900 13px Arial'; c.textAlign = 'center';
      c.fillText('POWELL & HYDE', 128, 106);
    }));
    const wood = cached('mat:ccWood', () => new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.85 }));
    const cream = cached('mat:ccRoof', () => new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.6 }));
    const body = new THREE.Mesh(boxGeo, cached('mat:ccBody', () =>
      new THREE.MeshStandardMaterial({ map: cache.get('ccTex'), roughness: 0.45 })));
    body.scale.set(2.0, 2.3, 5.0);
    body.position.y = 1.75; body.castShadow = true; g.add(body);
    const roof = new THREE.Mesh(boxGeo, cream);
    roof.scale.set(2.3, 0.16, 5.4);
    roof.position.y = 2.98; g.add(roof);
    const clere = new THREE.Mesh(boxGeo, cream);
    clere.scale.set(1.2, 0.26, 4.6);
    clere.position.y = 3.19; g.add(clere);
    const boards = new THREE.Mesh(boxGeo, wood);
    boards.scale.set(2.5, 0.08, 4.6);
    boards.position.y = 0.6; g.add(boards);
    const lampF = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mats.glow);
    lampF.position.set(0, 2.3, 2.52); g.add(lampF);
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

// Hanoi's motorbike: a step-through scooter, its rider in a helmet, often a
// passenger or a load of goods behind. Built facing the player; `signal`
// adds the big amber indicator light used when a pair swerves together
// (src/run/mechanics.js).
const BIKE_COLS = [0xc8202a, 0x2a5ab0, 0xf2f2ee, 0x2a2a30, 0xe8a818];
export function makeMotorbike(signal = false) {
  const g = new THREE.Group();
  const ci = (Math.random() * BIKE_COLS.length) | 0;
  const body = new THREE.Mesh(boxGeo, cached(`mat:moto:${ci}`, () => new THREE.MeshStandardMaterial({ color: BIKE_COLS[ci], roughness: 0.3, metalness: 0.3 })));
  body.scale.set(0.6, 0.6, 1.7); body.position.y = 0.7; body.castShadow = true; g.add(body);
  const shirt = [0x4a7ab0, 0xe8e0d0, 0x8a3a3a, 0x3a8a5a][(Math.random() * 4) | 0];
  const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.6, 4, 8), cached(`mat:mrider:${shirt}`, () => new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 })));
  rider.position.set(0, 1.45, 0.15); g.add(rider);
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), cached('mat:mhelm', () => new THREE.MeshStandardMaterial({ color: 0x2a5a3a, roughness: 0.4 })));
  helm.position.set(0, 1.98, 0.15); g.add(helm);
  if (Math.random() < 0.5) {
    const load = new THREE.Mesh(boxGeo, cached('mat:mload', () => new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.9 })));
    load.scale.set(0.9, 0.6, 0.6); load.position.set(0, 1.15, -0.65); g.add(load);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mats.glow);
  lamp.position.set(0, 1.0, 0.9); g.add(lamp);
  const tyre = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  for (const z of [0.7, -0.7]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2; w.scale.set(0.8, 0.8, 0.8); w.position.set(0, 0.3, z); g.add(w);
  }
  if (signal) {
    const off = cached('mat:signalOff', () => new THREE.MeshStandardMaterial({ color: 0x8a6a20, roughness: 0.4 }));
    const on = cached('mat:signalOn', () => new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xffa000, emissiveIntensity: 3 }));
    const light = new THREE.Mesh(boxGeo, off);
    light.scale.set(0.8, 0.26, 0.26); light.position.set(0, 2.4, 0.15); g.add(light);
    g.userData.signal = { light, off, on };
  }
  return g;
}

// Chicago's bascule bridge, one lane's share of it: a steel deck leaf
// hinged 4 m beyond the crossing line, so as it tilts up its near edge
// rises into a lip across the lane (src/run/mechanics.js tilts it). The
// outer lanes also carry the warning gate and its flashing lights at the
// kerb. Faces the player.
export function makeBridgeLeaf(lane) {
  const g = new THREE.Group();
  const steel = cached('mat:bridgeDeck', () => new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.5, metalness: 0.5 }));
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.02, -4.2);
  const leaf = new THREE.Mesh(boxGeo, steel);
  leaf.scale.set(2.4, 0.3, 4.2); leaf.position.set(0, 0, 2.1); pivot.add(leaf);
  const stripe = new THREE.Mesh(boxGeo, cached('mat:bridgeEdge', () => new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.6 })));
  stripe.scale.set(2.4, 0.32, 0.25); stripe.position.set(0, 0.01, 4.1); pivot.add(stripe);
  g.add(pivot);
  g.userData.leaf = pivot;
  if (lane !== 1) {
    const out = lane === 0 ? -1 : 1;
    const post = new THREE.Mesh(cylGeo, mats.black);
    post.scale.set(0.12, 1.4, 0.12); post.position.set(out * 2.9, 0.7, 1.4); g.add(post);
    const arm = new THREE.Mesh(boxGeo, cached('mat:gateArm', () => new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.5 })));
    arm.scale.set(0.1, 2.2, 0.1); arm.position.set(out * 2.9, 2.5, 1.4); g.add(arm);
    const off = cached('mat:gateOff', () => new THREE.MeshStandardMaterial({ color: 0x5a1010, roughness: 0.4 }));
    const on = cached('mat:gateOn', () => new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff1a1a, emissiveIntensity: 3 }));
    const lights = [];
    for (const dz of [-0.2, 0.2]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), off);
      l.position.set(out * 2.9, 1.5, 1.4 + dz); g.add(l); lights.push(l);
    }
    g.userData.lights = lights; g.userData.on = on; g.userData.off = off;
  }
  return g;
}

// Chicago's Loop: one chunk's stretch of the elevated railway over the
// street, steel columns along both kerbs carrying girders and a deck high
// overhead, and now and then a train passing above.
export function makeElevated(len) {
  const g = new THREE.Group();
  const steel = cached('mat:elSteel', () => new THREE.MeshStandardMaterial({ color: 0x3a4a3e, roughness: 0.6, metalness: 0.5 }));
  for (let z = 3; z < len; z += 9) {
    for (const x of [-5.0, 5.0]) {
      const col = new THREE.Mesh(boxGeo, steel);
      col.scale.set(0.4, 7.6, 0.4); col.position.set(x, 3.8, -z); g.add(col);
    }
    const beam = new THREE.Mesh(boxGeo, steel);
    beam.scale.set(10.6, 0.6, 0.5); beam.position.set(0, 7.8, -z); g.add(beam);
  }
  for (const x of [-3.2, 3.2]) {
    const girder = new THREE.Mesh(boxGeo, steel);
    girder.scale.set(0.5, 1.0, len); girder.position.set(x, 8.4, -len / 2); g.add(girder);
  }
  const deck = new THREE.Mesh(boxGeo, steel);
  deck.scale.set(7.0, 0.2, len); deck.position.set(0, 8.95, -len / 2); g.add(deck);
  if (Math.random() < 0.3) {
    const car = new THREE.Mesh(boxGeo, cached('mat:elCar', () => new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.35, metalness: 0.6 })));
    car.scale.set(2.6, 2.8, 14); car.position.set(1.6, 10.5, -len / 2); g.add(car);
  }
  return g;
}

// Istanbul's tram: a car of the old red-and-cream tram, with its trolley
// pole up to the wire. A wall (3.2 m). The front car carries two big
// lamps that flash as it comes.
export function makeTramCar(front = false) {
  const g = new THREE.Group();
  const red = cached('mat:tramRed', () => new THREE.MeshStandardMaterial({ color: 0xc8202a, roughness: 0.4, metalness: 0.15 }));
  const cream = cached('mat:tramCream', () => new THREE.MeshStandardMaterial({ color: 0xf2e8d0, roughness: 0.5 }));
  const body = new THREE.Mesh(boxGeo, red);
  body.scale.set(2.2, 1.6, 5.8); body.position.y = 1.2; body.castShadow = true; g.add(body);
  const upper = new THREE.Mesh(boxGeo, cream);
  upper.scale.set(2.2, 1.1, 5.8); upper.position.y = 2.55; g.add(upper);
  const glassM = cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(boxGeo, glassM);
    win.scale.set(0.04, 0.7, 4.8); win.position.set(sx * 1.11, 2.55, 0); g.add(win);
  }
  const roof = new THREE.Mesh(boxGeo, red);
  roof.scale.set(2.0, 0.2, 5.6); roof.position.y = 3.2; g.add(roof);
  const pole = new THREE.Mesh(boxGeo, mats.black);
  pole.scale.set(0.05, 0.05, 3.0); pole.position.set(0, 4.0, -0.6); pole.rotation.x = 0.5; g.add(pole);
  const tyre = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  for (const z of [-1.9, 1.9]) for (const x of [-0.5, 0.5]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); g.add(w);
  }
  if (front) {
    const screen = new THREE.Mesh(boxGeo, glassM);
    screen.scale.set(1.8, 0.8, 0.06); screen.position.set(0, 2.55, 2.92); g.add(screen);
    const off = cached('mat:trainLampOff', () => new THREE.MeshStandardMaterial({ color: 0x5a1010, roughness: 0.4 }));
    const on = cached('mat:trainLampOn', () => new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff1a1a, emissiveIntensity: 3.2 }));
    const lamps = [];
    for (const x of [-0.7, 0.7]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), off);
      l.position.set(x, 1.1, 2.94); g.add(l); lamps.push(l);
    }
    g.userData.lamps = { lamps, off, on };
  }
  return g;
}

// Havana's old cars: long, rounded 1950s shapes with tail fins and plenty
// of chrome, in bright two-tone paint. Generic: no make's grille, badge or
// name. A car, low enough to jump. Faces the player.
const CLASSIC_COLS = [[0xe85a8a, 0xf4f0e8], [0x3ab0c8, 0xf4f0e8], [0xe8a018, 0xf4f0e8], [0x2a6ac8, 0xe8e8e0], [0xc8302a, 0xf4f0e8], [0x5ac878, 0xf4f0e8]];
export function makeClassicCar() {
  const g = new THREE.Group();
  const ci = (Math.random() * CLASSIC_COLS.length) | 0;
  const [bc, tc] = CLASSIC_COLS[ci];
  const body = cached(`mat:classic:${ci}`, () => new THREE.MeshStandardMaterial({ color: bc, roughness: 0.25, metalness: 0.3 }));
  const top = cached(`mat:classicTop:${ci}`, () => new THREE.MeshStandardMaterial({ color: tc, roughness: 0.3, metalness: 0.2 }));
  const hull = new THREE.Mesh(boxGeo, body);
  hull.scale.set(1.9, 0.62, 4.4); hull.position.y = 0.66; hull.castShadow = true; g.add(hull);
  const cab = new THREE.Mesh(cached('geo:classicCab', () => new THREE.CylinderGeometry(0.9, 0.9, 2.0, 14, 1, false, 0, Math.PI)), top);
  cab.rotation.set(0, Math.PI / 2, Math.PI / 2); cab.scale.set(0.62, 1, 0.82); cab.position.set(0, 0.96, -0.2); g.add(cab);
  const glass = new THREE.Mesh(boxGeo, cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
  glass.scale.set(1.6, 0.36, 0.06); glass.position.set(0, 1.18, 0.6); glass.rotation.x = -0.5; g.add(glass);
  for (const sx of [-0.78, 0.78]) {
    const fin = new THREE.Mesh(boxGeo, body);
    fin.scale.set(0.12, 0.34, 1.0); fin.position.set(sx, 1.05, -1.8); fin.rotation.x = 0.3; g.add(fin);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), mats.glow);
    lamp.position.set(sx * 0.9, 0.78, 2.2); g.add(lamp);
  }
  const bumper = new THREE.Mesh(boxGeo, mats.chrome);
  bumper.scale.set(2.0, 0.18, 0.18); bumper.position.set(0, 0.4, 2.22); g.add(bumper);
  const rear = new THREE.Mesh(boxGeo, mats.chrome);
  rear.scale.set(2.0, 0.18, 0.18); rear.position.set(0, 0.4, -2.22); g.add(rear);
  const strip = new THREE.Mesh(boxGeo, mats.chrome);
  strip.scale.set(1.94, 0.05, 4.2); strip.position.y = 0.85; g.add(strip);
  return g;
}

// A big amber indicator lamp for a vehicle about to pull out from the kerb
// (src/run/mechanics.js), on the side facing the road. Hidden until used.
export function makePullBlinker(vehicle, side) {
  const lamp = new THREE.Mesh(boxGeo, cached('mat:pullBlink', () =>
    new THREE.MeshStandardMaterial({ color: 0xffb020, emissive: 0xff9a00, emissiveIntensity: 2.6 })));
  lamp.scale.set(0.3, 0.3, 0.3);
  lamp.position.set(-side * 1.05, 1.3, 2.0);
  lamp.visible = false;
  vehicle.add(lamp);
  return lamp;
}

// Havana's wave: foam building against the sea wall, then a wall of white
// water rising over the lane. src/run/mechanics.js grows them as you come.
export function makeWave(lane) {
  const g = new THREE.Group();
  const white = cached('mat:waveFoam', () => new THREE.MeshStandardMaterial({ color: 0xf4f8fa, roughness: 0.4, transparent: true, opacity: 0.85, emissive: 0xaad8e8, emissiveIntensity: 0.3 }));
  const foam = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(ballGeo, white);
    b.scale.setScalar(0.5 + (i % 3) * 0.2); b.position.set(-1.2 + (i % 3) * 0.3 - (lane === 0 ? 1.6 : 0), 0.6, (i - 2.5) * 0.6);
    foam.add(b);
  }
  foam.visible = false; g.add(foam);
  const wave = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(ballGeo, white);
    b.scale.set(1.0, 1.3, 0.9); b.position.set(((i % 3) - 1) * 0.7, 0.8 + ((i / 3) | 0) * 0.9, ((i % 2) - 0.5) * 1.2);
    wave.add(b);
  }
  wave.visible = false; g.add(wave);
  g.userData.foam = foam; g.userData.wave = wave;
  return g;
}

// Beijing's delivery tricycle, parked: a three-wheeled cargo bike with its
// load. `tall` stacks it high with boxes and sacks, a wall to go round;
// otherwise it carries a low load, under 1.2 m, to jump over. Its height
// matches its hitbox either way. Faces the player.
export function makeTricycle(tall = false) {
  const g = new THREE.Group();
  const frame = cached('mat:trikeFrame', () => new THREE.MeshStandardMaterial({ color: 0x2a5aa8, roughness: 0.4, metalness: 0.4 }));
  const tyre = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  for (const [x, z] of [[0, 1.0], [-0.6, -0.6], [0.6, -0.6]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2; w.scale.set(0.9, 0.9, 0.9); w.position.set(x, 0.32, z); g.add(w);
  }
  const bar = new THREE.Mesh(boxGeo, frame);
  bar.scale.set(0.08, 0.08, 1.4); bar.position.set(0, 0.7, 0.4); g.add(bar);
  const handle = new THREE.Mesh(boxGeo, frame);
  handle.scale.set(0.6, 0.06, 0.06); handle.position.set(0, 1.05, 1.0); g.add(handle);
  const bed = new THREE.Mesh(boxGeo, cached('mat:trikeBed', () => new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.8 })));
  bed.scale.set(1.3, 0.1, 1.3); bed.position.set(0, 0.62, -0.6); g.add(bed);
  const crate = cached('mat:trikeCrate', () => new THREE.MeshStandardMaterial({ color: 0xc8a070, roughness: 0.9 }));
  const sack = cached('mat:trikeSack', () => new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 1 }));
  if (tall) {
    for (let k = 0; k < 5; k++) {
      const box = new THREE.Mesh(boxGeo, k % 2 ? sack : crate);
      box.scale.set(1.2 - (k % 2) * 0.1, 0.48, 1.2 - (k % 2) * 0.1);
      box.position.set(((k % 3) - 1) * 0.05, 0.92 + k * 0.48, -0.6); g.add(box);
    }
    const rope = new THREE.Mesh(boxGeo, cached('mat:trikeRope', () => new THREE.MeshStandardMaterial({ color: 0xc8302a, roughness: 0.8 })));
    rope.scale.set(1.24, 2.4, 0.04); rope.position.set(0, 1.9, -0.6); g.add(rope);
  } else {
    for (const x of [-0.32, 0.32]) {
      const box = new THREE.Mesh(boxGeo, crate);
      box.scale.set(0.58, 0.4, 1.1); box.position.set(x, 0.87, -0.6); g.add(box);
    }
  }
  return g;
}

// Zanzibar's narrowing: one five-metre stretch of a house that juts out
// into the road over an outer lane, from the lane's inner edge out to the
// pavement: lime-washed coral stone, a closed wooden balcony on top, and on
// the front stretch a carved door facing the runner. A wall.
export function makeJutHouse(lane, k) {
  const g = new THREE.Group();
  const out = lane === 0 ? -1 : 1;
  const wallMat = cached('mat:jutWall', () => new THREE.MeshStandardMaterial({ color: 0xe8dfcc, roughness: 0.9 }));
  const wood = cached('mat:jutWood', () => new THREE.MeshStandardMaterial({ color: 0x5a3a24, roughness: 0.8 }));
  const wall = new THREE.Mesh(boxGeo, wallMat);
  wall.scale.set(4.4, 5.6, 5.0); wall.position.set(out * 1.0, 2.8, 0); wall.castShadow = true; g.add(wall);
  const balcony = new THREE.Mesh(boxGeo, wood);
  balcony.scale.set(0.8, 1.6, 4.2); balcony.position.set(-out * 1.35, 4.4, 0); g.add(balcony);
  if (k === 0) {
    const door = new THREE.Mesh(boxGeo, wood);
    door.scale.set(1.4, 2.6, 0.12); door.position.set(0, 1.3, 2.52); g.add(door);
    const studs = new THREE.Mesh(boxGeo, cached('mat:jutStuds', () => new THREE.MeshStandardMaterial({ color: 0xe8c060, roughness: 0.3, metalness: 0.7 })));
    studs.scale.set(1.0, 1.8, 0.04); studs.position.set(0, 1.3, 2.6); g.add(studs);
    const lintel = new THREE.Mesh(boxGeo, wood);
    lintel.scale.set(1.8, 0.4, 0.2); lintel.position.set(0, 2.8, 2.55); g.add(lintel);
  }
  return g;
}

// Samarkand's arch wall: one bay of a wall of tiled arches built across
// the road, centred on its lane. `closed` fills the arch with a tiled
// panel; otherwise it is open, with a lattice grille that
// src/run/mechanics.js can drop or lift. The arch is 4.6 m high, clear of
// a jump. The outer bays carry the wall on to the kerb.
function archTileMat() {
  return cached('mat:archTile', () => {
    const tex = canvasTexture(128, 128, (c) => {
      c.fillStyle = '#2a4aa8'; c.fillRect(0, 0, 128, 128);
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const cx = i * 32 + 16, cy = j * 32 + 16;
        c.fillStyle = (i + j) % 2 ? '#2aa8b8' : '#f2ecd8';
        c.beginPath();
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, r = k % 2 ? 6 : 13; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        c.closePath(); c.fill();
      }
    });
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 });
  });
}
export function makeArchBay(lane, closed) {
  const g = new THREE.Group();
  const brick = cached('mat:archBrick', () => new THREE.MeshStandardMaterial({ color: 0xd8b888, roughness: 0.85 }));
  const tile = archTileMat();
  for (const sx of [-1, 1]) {
    const pier = new THREE.Mesh(boxGeo, brick);
    pier.scale.set(0.3, 6.4, 0.8); pier.position.set(sx * 1.05, 3.2, 0); g.add(pier);
  }
  const lintel = new THREE.Mesh(boxGeo, tile);
  lintel.scale.set(2.4, 1.8, 0.8); lintel.position.y = 5.5; g.add(lintel);
  const crown = new THREE.Mesh(boxGeo, brick);
  crown.scale.set(2.4, 0.3, 1.0); crown.position.y = 6.55; g.add(crown);
  if (lane !== 1) {
    const out = lane === 0 ? -1 : 1;
    const wing = new THREE.Mesh(boxGeo, brick);
    wing.scale.set(2.6, 6.4, 0.8); wing.position.set(out * 2.5, 3.2, 0); g.add(wing);
  }
  if (closed) {
    const panel = new THREE.Mesh(boxGeo, tile);
    panel.scale.set(1.8, 4.6, 0.5); panel.position.y = 2.3; g.add(panel);
  } else {
    const grille = new THREE.Mesh(boxGeo, cached('mat:archGrille', () => new THREE.MeshStandardMaterial({ color: 0x5a4a30, roughness: 0.6, metalness: 0.4 })));
    grille.scale.set(1.8, 4.6, 0.12); grille.position.y = 4.6 + 2.3; grille.visible = false; g.add(grille);
    g.userData.grille = grille;
  }
  return g;
}

// Seoul's crossing: a few people waiting at the kerb who step out together
// when the signal changes. A wall: nobody jumps over people. Faces the way
// they walk (+x).
const PED_COLS = [0x2a3a5a, 0xc8302a, 0xe8e0d0, 0x3a6a4a, 0x8a5a3a, 0xe8a018, 0x5a3a7a];
export function makeCrowd() {
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Group();
    const col = PED_COLS[(Math.random() * PED_COLS.length) | 0];
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.75, 4, 8),
      cached(`mat:ped:${col}`, () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.8 })));
    body.position.y = 0.95; body.castShadow = true; p.add(body);
    const head = new THREE.Mesh(ballGeo, cached('mat:pedHead', () => new THREE.MeshStandardMaterial({ color: 0xd8b08a, roughness: 0.7 })));
    head.scale.setScalar(0.17); head.position.y = 1.62; p.add(head);
    const hair = new THREE.Mesh(ballGeo, cached('mat:pedHair', () => new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.8 })));
    hair.scale.set(0.18, 0.11, 0.18); hair.position.y = 1.72; p.add(hair);
    p.position.set((i % 2) * 0.5 - 0.25, 0, (i - 1.5) * 0.55);
    g.add(p);
  }
  return g;
}

// The crossing's walk signal at the kerb, and the zebra stripes across the
// road. src/run/mechanics.js swaps the face: 3, 2, 1, then the green walker.
const SIGNAL_FACES = ['3', '2', '1', 'WALK'];
function signalMat(k) {
  return cached(`mat:walksig:${k}`, () => {
    const tex = canvasTexture(64, 64, (c) => {
      c.fillStyle = '#14141a'; c.fillRect(0, 0, 64, 64);
      if (k === 3) {
        c.fillStyle = '#3ae86a';
        c.beginPath(); c.arc(32, 14, 7, 0, 7); c.fill();
        c.fillRect(27, 22, 10, 22);
        c.fillRect(22, 44, 7, 16); c.fillRect(35, 44, 7, 16);
      } else {
        c.fillStyle = '#ff4a3a'; c.font = '900 48px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(SIGNAL_FACES[k], 32, 34);
      }
    });
    return new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.2 });
  });
}
export function makeCrossing(theme, roadW) {
  const g = makeZebra(theme, roadW);
  for (const c of g.children.slice(1)) g.remove(c);     // London's beacons: not here
  const sig = new THREE.Group();
  const pole = new THREE.Mesh(cylGeo, mats.black);
  pole.scale.set(0.07, 3.0, 0.07); pole.position.y = 1.5; sig.add(pole);
  const face = new THREE.Mesh(boxGeo, signalMat(0));
  face.scale.set(0.12, 0.7, 0.7); face.position.y = 3.2; face.rotation.y = Math.PI / 2; sig.add(face);
  sig.position.set(roadW / 2 + 0.7, 0.3, 0);
  g.add(sig);
  g.userData.face = face;
  g.userData.faces = [0, 1, 2, 3].map(signalMat);
  return g;
}

// Hanoi's Train Street train: a carriage, or the locomotive at its head,
// in blue with a cream band, filling the rail lane. A wall (3.2 m), as a
// bus is. The locomotive carries two big red lamps that flash as it comes.
export function makeTrainCar(loco = false) {
  const g = new THREE.Group();
  const blue = cached('mat:trainBlue', () => new THREE.MeshStandardMaterial({ color: 0x2a4a8a, roughness: 0.4, metalness: 0.2 }));
  const cream = cached('mat:trainCream', () => new THREE.MeshStandardMaterial({ color: 0xf0e4c8, roughness: 0.5 }));
  const body = new THREE.Mesh(boxGeo, loco ? cached('mat:trainLoco', () => new THREE.MeshStandardMaterial({ color: 0xc8302a, roughness: 0.4, metalness: 0.2 })) : blue);
  body.scale.set(2.3, 2.6, 5.6); body.position.y = 1.8; body.castShadow = true; g.add(body);
  const band = new THREE.Mesh(boxGeo, cream);
  band.scale.set(2.32, 0.4, 5.62); band.position.y = 2.2; g.add(band);
  const roof = new THREE.Mesh(boxGeo, cached('mat:trainRoof', () => new THREE.MeshStandardMaterial({ color: 0x5a5a60, roughness: 0.6 })));
  roof.scale.set(2.2, 0.2, 5.4); roof.position.y = 3.2; g.add(roof);
  if (loco) {
    const glassM = cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 }));
    const screen = new THREE.Mesh(boxGeo, glassM);
    screen.scale.set(1.9, 0.8, 0.06); screen.position.set(0, 2.5, 2.82); g.add(screen);
    const off = cached('mat:trainLampOff', () => new THREE.MeshStandardMaterial({ color: 0x5a1010, roughness: 0.4 }));
    const on = cached('mat:trainLampOn', () => new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff1a1a, emissiveIntensity: 3.2 }));
    const lamps = [];
    for (const x of [-0.7, 0.7]) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), off);
      l.position.set(x, 1.2, 2.84); g.add(l); lamps.push(l);
    }
    g.userData.lamps = { lamps, off, on };
  }
  const tyre = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  for (const z of [-1.8, 1.8]) for (const x of [-0.5, 0.5]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.35, z); g.add(w);
  }
  return g;
}

// Cape Town's gust: a band of blown dust and sand streaming across the road
// at the gust's row, which src/run/mechanics.js slides sideways the way the
// wind blows as you approach. Nothing solid: it only shows the wind.
export function makeGustDust() {
  const g = new THREE.Group();
  const dust = cached('mat:gust', () => new THREE.MeshBasicMaterial({
    color: 0xe8cc98, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide,
  }));
  // puffs of sand, tilted with the wind, well up off the road so they never
  // read as lane markings
  const streaks = new THREE.Group();
  for (let i = 0; i < 30; i++) {
    const s = new THREE.Mesh(ballGeo, dust);
    s.scale.set(0.9 + Math.random() * 1.4, 0.18 + Math.random() * 0.2, 0.3);
    s.rotation.z = 0.15;
    s.position.set(-10 + Math.random() * 20, 0.9 + Math.random() * 2.8, (Math.random() - 0.5) * 6);
    streaks.add(s);
  }
  g.add(streaks);
  g.userData.streaks = streaks;
  g.visible = false;
  return g;
}

// Bangkok's tuk-tuk: a three-wheeler with a long bench behind the driver,
// open sides, a broad roof with a fringe, in bright two-tone paint. Low
// enough to jump. Built facing the player (front at +z); `signal` adds the
// big amber roof light that flashes before a U-turn (src/run/mechanics.js).
const TUK_COLS = [[0x2a9a5a, 0xf2c418], [0x2a5ab0, 0xe8302a], [0xe8506a, 0x2a2a30], [0xf28a20, 0x2a6a8a]];
export function makeTukTuk(signal = false) {
  const g = new THREE.Group();
  const ci = (Math.random() * TUK_COLS.length) | 0;
  const [bc, rc] = TUK_COLS[ci];
  const body = cached(`mat:tukBody:${ci}`, () => new THREE.MeshStandardMaterial({ color: bc, roughness: 0.35, metalness: 0.2 }));
  const roofM = cached(`mat:tukRoof:${ci}`, () => new THREE.MeshStandardMaterial({ color: rc, roughness: 0.6 }));
  const tyre = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  const cab = new THREE.Mesh(boxGeo, body);
  cab.scale.set(0.9, 0.7, 1.0); cab.position.set(0, 0.7, 1.0); cab.castShadow = true; g.add(cab);
  const tub = new THREE.Mesh(boxGeo, body);
  tub.scale.set(1.5, 0.6, 1.6); tub.position.set(0, 0.62, -0.5); g.add(tub);
  const seat = new THREE.Mesh(boxGeo, cached('mat:tukSeat', () => new THREE.MeshStandardMaterial({ color: 0x5a1a1a, roughness: 0.8 })));
  seat.scale.set(1.3, 0.5, 0.3); seat.position.set(0, 1.1, -1.15); g.add(seat);
  const roof = new THREE.Mesh(boxGeo, roofM);
  roof.scale.set(1.6, 0.14, 2.9); roof.position.set(0, 1.66, 0); g.add(roof);
  const fringe = new THREE.Mesh(boxGeo, mats.chrome);
  fringe.scale.set(1.64, 0.08, 2.94); fringe.position.set(0, 1.56, 0); g.add(fringe);
  for (const [x, z] of [[-0.42, 1.35], [0.42, 1.35], [-0.72, -1.3], [0.72, -1.3]]) {
    const post = new THREE.Mesh(boxGeo, mats.chrome);
    post.scale.set(0.05, 0.75, 0.05); post.position.set(x, 1.22, z); g.add(post);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), mats.glow);
  lamp.position.set(0, 0.85, 1.52); g.add(lamp);
  for (const [x, z] of [[0, 1.1], [-0.68, -0.7], [0.68, -0.7]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2; w.scale.set(0.8, 0.8, 0.8); w.position.set(x, 0.3, z); g.add(w);
  }
  if (signal) {
    const off = cached('mat:signalOff', () => new THREE.MeshStandardMaterial({ color: 0x8a6a20, roughness: 0.4 }));
    const on = cached('mat:signalOn', () => new THREE.MeshStandardMaterial({ color: 0xffc040, emissive: 0xffa000, emissiveIntensity: 3 }));
    const light = new THREE.Mesh(boxGeo, off);
    light.scale.set(0.9, 0.3, 0.5); light.position.set(0, 1.88, 0.4); g.add(light);
    g.userData.signal = { light, off, on };
  }
  return g;
}

// Bangkok, Khlong Bang Luang: the canal side of the lane, one chunk long,
// placed at the far edge of the pavement (which is the landing): mooring
// posts, the water, a moored long-tail boat or two, and old wooden houses
// on stilts along the far bank. Everything is at negative x, away from the
// road.
export function makeCanalSide(theme, len) {
  const g = new THREE.Group();
  const water = new THREE.Mesh(boxGeo, cached('mat:canal', () =>
    new THREE.MeshStandardMaterial({ color: 0x4a7a6a, roughness: 0.2, metalness: 0.3 })));
  water.scale.set(9, 0.1, len); water.position.set(-4.5, 0.06, -len / 2); g.add(water);
  const plank = cached('mat:landing', () => new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.9 }));
  for (let z = 2; z < len; z += 4) {
    const post = new THREE.Mesh(cylGeo, plank);
    post.scale.set(0.1, 1.4, 0.1); post.position.set(-0.3, -0.1, -z); g.add(post);
  }
  if (theme.id === 'venice') {
    // Venice: the quay's white stone edge, striped mooring poles, gondolas
    // tied up along it, and the wide water beyond. On the Zattere the far
    // bank is the Giudecca's row of houses; on the Riva it is open lagoon.
    water.scale.set(80, 0.1, len); water.position.set(-40, 0.02, -len / 2);
    water.material = cached('mat:lagoon', () => new THREE.MeshStandardMaterial({ color: 0x3a7a80, roughness: 0.16, metalness: 0.35 }));
    const stone = cached('mat:istrian', () => new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.7 }));
    const edge = new THREE.Mesh(boxGeo, stone);
    edge.scale.set(0.5, 0.36, len); edge.position.set(-0.25, 0.12, -len / 2); g.add(edge);
    for (let z = 3, k = 0; z < len - 2; z += 6 + Math.random() * 3, k++) {
      const pole = makeMooringPole(k);
      pole.position.set(-2.8, -0.3, -z); g.add(pole);
      if (Math.random() < 0.6) {
        const boat = makeGondola(false);
        boat.rotation.y = Math.PI / 2; boat.position.set(-1.6, -0.1, -z - 2.4); g.add(boat);
      }
    }
    if (!theme.lagoon) {
      for (let z = 0; z < len; z += 9 + Math.random() * 4) {
        const col = theme.palette[(Math.random() * theme.palette.length) | 0];
        const house = new THREE.Mesh(boxGeo, cached(`mat:giudecca:${col}`, () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 })));
        const hh = 7 + Math.random() * 5;
        house.scale.set(6, hh, 8.5); house.position.set(-46, hh / 2, -z - 4); g.add(house);
        const roof = new THREE.Mesh(boxGeo, cached('mat:giudeccaRoof', () => new THREE.MeshStandardMaterial({ color: 0xa8543a, roughness: 0.9 })));
        roof.scale.set(6.4, 0.5, 8.9); roof.position.set(-46, hh + 0.25, -z - 4); g.add(roof);
      }
    }
    return g;
  }
  if (theme.seawall) {
    // Havana's Malecón: a low stone sea wall along the pavement's edge, the
    // open sea beyond it out to the horizon
    water.scale.set(60, 0.1, len); water.position.set(-30, -0.2, -len / 2);
    water.material = cached('mat:sea', () => new THREE.MeshStandardMaterial({ color: 0x2a6a8a, roughness: 0.25, metalness: 0.3 }));
    const wall = new THREE.Mesh(boxGeo, cached('mat:seawall', () => new THREE.MeshStandardMaterial({ color: 0xc8c0b0, roughness: 0.9 })));
    wall.scale.set(0.7, 0.9, len); wall.position.set(-0.35, 0.45, -len / 2); g.add(wall);
    return g;
  }
  if (theme.lake) {
    // Hoan Kiem: no boats or houses, the lake runs away to the trees on the
    // far shore, with leaning trees along this bank
    water.scale.set(26, 0.1, len); water.position.set(-13, 0.06, -len / 2);
    for (let z = 3; z < len; z += 9 + Math.random() * 3) {
      const tree = makeTree('round');
      tree.scale.setScalar(1.3); tree.rotation.z = 0.12;
      tree.position.set(-0.8, 0.3, -z); g.add(tree);
    }
    return g;
  }
  for (let k = 0; k < 2; k++) {
    if (Math.random() < 0.35) continue;
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(boxGeo, cached('mat:boat', () => new THREE.MeshStandardMaterial({ color: 0x6a3a22, roughness: 0.7 })));
    hull.scale.set(1.0, 0.4, 6.0); boat.add(hull);
    const prow = new THREE.Mesh(coneGeo, hull.material);
    prow.scale.set(0.5, 1.2, 0.3); prow.rotation.x = -0.9; prow.position.set(0, 0.4, 3.2); boat.add(prow);
    const band = new THREE.Mesh(boxGeo, cached('mat:boatBand', () => new THREE.MeshStandardMaterial({ color: 0xe8c040, roughness: 0.6 })));
    band.scale.set(1.04, 0.08, 6.04); band.position.y = 0.15; boat.add(band);
    boat.position.set(-1.8 - k * 1.8, 0.3, -6 - k * 16 - Math.random() * 4);
    g.add(boat);
  }
  for (let z = 0; z < len - 4; z += 7 + Math.random() * 3) {
    const house = new THREE.Group();
    const col = theme.palette[(Math.random() * theme.palette.length) | 0];
    const wall = new THREE.Mesh(boxGeo, cached(`mat:stilt:${col}`, () => new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 })));
    wall.scale.set(4, 3.2, 5.5); wall.position.y = 3.0; house.add(wall);
    const roof = new THREE.Mesh(cached('geo:stiltRoof', () => {
      const geo = new THREE.CylinderGeometry(0.01, 3.4, 1.8, 4, 1);
      geo.rotateY(Math.PI / 4); return geo;
    }), cached('mat:stiltRoof', () => new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.8 })));
    roof.scale.set(1, 1, 1.4); roof.position.y = 5.5; house.add(roof);
    for (const [x, zz] of [[-1.6, -2.2], [1.6, -2.2], [-1.6, 2.2], [1.6, 2.2]]) {
      const stilt = new THREE.Mesh(cylGeo, plank);
      stilt.scale.set(0.12, 1.8, 0.12); stilt.position.set(x, 0.6, zz); house.add(stilt);
    }
    house.position.set(-11.5, 0, -z - 3);
    g.add(house);
  }
  return g;
}

// Delhi's auto-rickshaw: three wheels, a green body, a yellow canvas roof.
// Low enough to jump, like a car. Built facing the player (front at +z);
// `braking` adds the big red brake lights at the back, for the ones that
// drive on ahead and then stop (src/run/mechanics.js), which are turned
// round so the lights face the player.
export function makeAutoRickshaw(braking = false) {
  const g = new THREE.Group();
  const green = cached('mat:autoGreen', () => new THREE.MeshStandardMaterial({ color: 0x2a9a4a, roughness: 0.4, metalness: 0.1 }));
  const yellow = cached('mat:autoYellow', () => new THREE.MeshStandardMaterial({ color: 0xf2c418, roughness: 0.6 }));
  const tyre = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  const body = new THREE.Mesh(boxGeo, green);
  body.scale.set(1.4, 0.7, 2.4); body.position.set(0, 0.7, -0.2); body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(boxGeo, green);
  nose.scale.set(0.8, 0.9, 0.6); nose.position.set(0, 0.85, 1.2); g.add(nose);
  const roof = new THREE.Mesh(boxGeo, yellow);
  roof.scale.set(1.5, 0.12, 2.5); roof.position.set(0, 1.62, -0.15); g.add(roof);
  for (const [x, z] of [[-0.68, 0.9], [0.68, 0.9], [-0.68, -1.3], [0.68, -1.3]]) {
    const post = new THREE.Mesh(boxGeo, mats.black);
    post.scale.set(0.05, 0.62, 0.05); post.position.set(x, 1.28, z); g.add(post);
  }
  const screen = new THREE.Mesh(boxGeo,
    cached('mat:carGlass', () => new THREE.MeshStandardMaterial({ color: 0xa8d0ec, roughness: 0.12, metalness: 0.5 })));
  screen.scale.set(1.2, 0.5, 0.05); screen.position.set(0, 1.3, 0.95); g.add(screen);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mats.glow);
  lamp.position.set(0, 1.0, 1.52); g.add(lamp);
  for (const [x, z] of [[0, 1.2], [-0.62, -0.9], [0.62, -0.9]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2; w.scale.set(0.8, 0.8, 0.8); w.position.set(x, 0.3, z); g.add(w);
  }
  if (braking) {
    // two shared materials, off and on, swapped per light: one material
    // flashed in place would light every rickshaw on the street at once
    const off = cached('mat:brakeOff', () => new THREE.MeshStandardMaterial({ color: 0x5a0a0a, roughness: 0.4 }));
    const on = cached('mat:brakeOn', () => new THREE.MeshStandardMaterial({ color: 0xff3a3a, emissive: 0xff1a1a, emissiveIntensity: 3 }));
    const lights = [];
    for (const x of [-0.5, 0.5]) {
      const l = new THREE.Mesh(boxGeo, off);
      l.scale.set(0.34, 0.24, 0.08); l.position.set(x, 0.85, -1.44); g.add(l);
      lights.push(l);
    }
    g.userData.brakeLights = lights;
    g.userData.brakeMats = [off, on];
  }
  return g;
}

// Old Delhi's roll-under obstacle: not a signboard on a scaffold but a fat,
// sagging bundle of cables slung low across one lane between two poles.
// The same hitbox as every 'high' obstacle: the gap below is 1.3 m.
export function makeWireTangle() {
  const g = new THREE.Group();
  const cable = cached('mat:cable', () => new THREE.MeshStandardMaterial({ color: 0x1e1e22, roughness: 0.7 }));
  for (const x of [-1.0, 1.0]) {
    const pole = new THREE.Mesh(cylGeo, cached('mat:wirePole', () => new THREE.MeshStandardMaterial({ color: 0x6a6a70, roughness: 0.6, metalness: 0.4 })));
    pole.scale.set(0.08, 3.4, 0.08); pole.position.set(x, 1.7, 0); g.add(pole);
  }
  for (let k = 0; k < 9; k++) {
    const sag = 0.1 + (k % 3) * 0.12;
    for (let i = 0; i < 6; i++) {
      const t0 = i / 6, t1 = (i + 1) / 6;
      const y0 = 1.95 - Math.sin(t0 * Math.PI) * sag - (k % 3) * 0.12, y1 = 1.95 - Math.sin(t1 * Math.PI) * sag - (k % 3) * 0.12;
      const seg = new THREE.Mesh(boxGeo, cable);
      seg.scale.set(Math.hypot(2 / 6, y1 - y0), 0.05, 0.05);
      seg.position.set(t0 + t1 - 1, (y0 + y1) / 2, ((k / 3) | 0) * 0.1 - 0.1);
      seg.rotation.z = Math.atan2(y1 - y0, 2 / 6);
      g.add(seg);
    }
  }
  // the bundle's lowest strands, tied together with a bright tag so the
  // height reads at speed
  const tie = new THREE.Mesh(boxGeo, cached('mat:wireTag', () => new THREE.MeshStandardMaterial({ color: 0xf2c418, emissive: 0x6a5000, emissiveIntensity: 0.6 })));
  tie.scale.set(1.4, 0.16, 0.2); tie.position.set(0, 1.5, 0); g.add(tie);
  return g;
}

// Marrakech: a porter's handcart, two big wheels and a flat bed piled with
// sacks and a rolled rug, pushed by a porter in a djellaba. The whole thing
// is a wall to dodge (src/run/mechanics.js), so it stands tall: the load
// and the porter both reach well above jump height. Built facing +x, the
// porter behind on the -x side.
// ---------- Venice ----------

// A gondola: long, black, its bow and stern sweeping up, the steel ferro on
// the bow, a red seat, and the gondolier standing at the stern with his oar.
// Its long axis lies along x, the way it crosses the road in a side canal;
// rotate it a quarter turn to moor it along a quay. Generic: no club or
// company markings.
export function makeGondola(withGondolier = true) {
  const g = new THREE.Group();
  const black = cached('mat:gondola', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.35, metalness: 0.2 }));
  const hull = new THREE.Mesh(boxGeo, black);
  hull.scale.set(3.6, 0.42, 0.95); hull.position.y = 0.3; hull.castShadow = true; g.add(hull);
  for (const sx of [-1, 1]) {
    const end = new THREE.Mesh(boxGeo, black);
    end.scale.set(0.9, 0.22, 0.5); end.position.set(sx * 2.05, 0.62, 0); end.rotation.z = sx * 0.55; g.add(end);
  }
  const ferro = new THREE.Mesh(boxGeo, cached('mat:ferro', () => new THREE.MeshStandardMaterial({ color: 0xd8dce0, roughness: 0.25, metalness: 0.8 })));
  ferro.scale.set(0.12, 0.75, 0.06); ferro.position.set(2.42, 1.05, 0); ferro.rotation.z = -0.2; g.add(ferro);
  for (let k = 0; k < 3; k++) {
    const tooth = new THREE.Mesh(boxGeo, ferro.material);
    tooth.scale.set(0.22, 0.04, 0.05); tooth.position.set(2.5, 0.8 + k * 0.14, 0); g.add(tooth);
  }
  const seat = new THREE.Mesh(boxGeo, cached('mat:gondolaSeat', () => new THREE.MeshStandardMaterial({ color: 0xa8202a, roughness: 0.8 })));
  seat.scale.set(0.9, 0.22, 0.75); seat.position.set(0.3, 0.6, 0); g.add(seat);
  if (withGondolier) {
    const white = cached('mat:gondShirt', () => new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.8 }));
    const blue = cached('mat:gondStripe', () => new THREE.MeshStandardMaterial({ color: 0x1a2a6a, roughness: 0.8 }));
    const legs = new THREE.Mesh(boxGeo, cached('mat:gondTrousers', () => new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 })));
    legs.scale.set(0.3, 0.8, 0.3); legs.position.set(-1.4, 0.92, 0); g.add(legs);
    for (let k = 0; k < 4; k++) {           // the striped shirt
      const band = new THREE.Mesh(boxGeo, k % 2 ? blue : white);
      band.scale.set(0.38, 0.17, 0.36); band.position.set(-1.4, 1.42 + k * 0.17, 0); g.add(band);
    }
    const head = new THREE.Mesh(ballGeo, cached('mat:skin', () => new THREE.MeshStandardMaterial({ color: 0xd8a888, roughness: 0.8 })));
    head.scale.setScalar(0.17); head.position.set(-1.4, 2.25, 0); g.add(head);
    const brim = new THREE.Mesh(cylGeo, cached('mat:straw', () => new THREE.MeshStandardMaterial({ color: 0xe8d088, roughness: 0.9 })));
    brim.scale.set(0.3, 0.03, 0.3); brim.position.set(-1.4, 2.38, 0); g.add(brim);
    const crown = new THREE.Mesh(cylGeo, brim.material);
    crown.scale.set(0.17, 0.12, 0.17); crown.position.set(-1.4, 2.45, 0); g.add(crown);
    const ribbon = new THREE.Mesh(cylGeo, blue);
    ribbon.scale.set(0.175, 0.04, 0.175); ribbon.position.set(-1.4, 2.42, 0); g.add(ribbon);
    const oar = new THREE.Mesh(cylGeo, cached('mat:oar', () => new THREE.MeshStandardMaterial({ color: 0x9a7448, roughness: 0.8 })));
    oar.scale.set(0.04, 3.0, 0.04); oar.position.set(-1.1, 1.0, 0.45); oar.rotation.set(0.35, 0, 0.45); g.add(oar);
  }
  return g;
}

// A mooring pole (palina), painted in bands, with a gilded knob on top.
function makeMooringPole(band = 0) {
  const g = new THREE.Group();
  const cols = [[0x1a3a8a, 0xf2f2f2], [0xa82a2a, 0xf2f2f2], [0x2a6a4a, 0xe8c040]][band % 3];
  for (let k = 0; k < 6; k++) {
    const seg = new THREE.Mesh(cylGeo, cached(`mat:palina:${cols[k % 2]}`, () =>
      new THREE.MeshStandardMaterial({ color: cols[k % 2], roughness: 0.6 })));
    seg.scale.set(0.11, 0.5, 0.11); seg.position.y = 0.25 + k * 0.5; g.add(seg);
  }
  const knob = new THREE.Mesh(ballGeo, cached('mat:palinaGold', () => new THREE.MeshStandardMaterial({ color: 0xd8b04a, roughness: 0.3, metalness: 0.7 })));
  knob.scale.setScalar(0.16); knob.position.y = 3.1; g.add(knob);
  return g;
}

// A side canal (rio) crossing the street: water right across the road and
// both pavements, edged in white Istrian stone, a striped mooring pole at
// each side. Sits in the middle lane; the road is 8.6 m wide.
export function makeRio() {
  const g = new THREE.Group();
  const water = cached('mat:rio', () => new THREE.MeshStandardMaterial({ color: 0x1e6a74, roughness: 0.12, metalness: 0.3, emissive: 0x0a3a40, emissiveIntensity: 0.4 }));
  const road = new THREE.Mesh(boxGeo, water);
  road.scale.set(8.6, 0.06, 2.2); road.position.y = 0.02; g.add(road);
  for (const sx of [-1, 1]) {
    const pave = new THREE.Mesh(boxGeo, water);
    pave.scale.set(8, 0.06, 2.2); pave.position.set(sx * 8.3, 0.31, 0); g.add(pave);
    const pole = makeMooringPole(sx > 0 ? 0 : 1);
    pole.position.set(sx * 5.4, 0.3, -0.9); g.add(pole);
  }
  const stone = cached('mat:istrian', () => new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.7 }));
  for (const sz of [-1, 1]) {
    const edge = new THREE.Mesh(boxGeo, stone);
    edge.scale.set(24, 0.2, 0.4); edge.position.set(0, 0.1, sz * 1.25); g.add(edge);
  }
  return g;
}

// Acqua alta: a 5 m stretch of one lane under the tide, which rises as you
// come (userData.water is scaled from flat to full). `boards` lays the
// raised wooden walkway (passerella) instead, in the lane that stays dry.
export function makeFloodLane(boards = false) {
  const g = new THREE.Group();
  if (boards) {
    const wood = cached('mat:passerella', () => new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 }));
    const deck = new THREE.Mesh(boxGeo, wood);
    deck.scale.set(1.5, 0.08, 4.9); deck.position.y = 0.14; g.add(deck);
    for (const sx of [-0.65, 0.65]) for (const sz of [-2, 2]) {
      const leg = new THREE.Mesh(boxGeo, wood);
      leg.scale.set(0.08, 0.12, 0.08); leg.position.set(sx, 0.05, sz); g.add(leg);
    }
    return g;
  }
  const water = new THREE.Mesh(boxGeo, cached('mat:tide', () =>
    new THREE.MeshStandardMaterial({ color: 0x4a8a8a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 })));
  water.scale.set(2.4, 0.3, 5.0); water.position.y = 0.15; g.add(water);
  const shine = new THREE.Mesh(boxGeo, cached('mat:tideShine', () =>
    new THREE.MeshStandardMaterial({ color: 0xc8e8e8, roughness: 0.1, transparent: true, opacity: 0.5 })));
  shine.scale.set(0.9, 0.02, 1.6); shine.position.set(-0.4, 0.31, 0.8); g.add(shine);
  const tide = new THREE.Group();
  tide.add(water, shine);
  tide.scale.y = 0.01;
  g.add(tide);
  g.userData.water = tide;
  return g;
}

// A wellhead (vera da pozzo): the carved stone drum over a cistern that
// stands in every Venetian square, with an iron frame for the bucket.
function makeWellhead() {
  const g = new THREE.Group();
  const stone = cached('mat:istrian', () => new THREE.MeshStandardMaterial({ color: 0xf0ece2, roughness: 0.7 }));
  const drum = new THREE.Mesh(cached('geo:wellDrum', () => new THREE.CylinderGeometry(0.62, 0.55, 0.9, 8)), stone);
  drum.position.y = 0.45; drum.castShadow = true; g.add(drum);
  const lip = new THREE.Mesh(cached('geo:wellLip', () => new THREE.CylinderGeometry(0.7, 0.7, 0.12, 8)), stone);
  lip.position.y = 0.95; g.add(lip);
  const step = new THREE.Mesh(cached('geo:wellStep', () => new THREE.CylinderGeometry(0.95, 0.95, 0.14, 8)), stone);
  step.position.y = 0.07; g.add(step);
  const iron = cached('mat:wellIron', () => new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.5, metalness: 0.5 }));
  for (const sx of [-0.55, 0.55]) {
    const post = new THREE.Mesh(boxGeo, iron);
    post.scale.set(0.05, 1.0, 0.05); post.position.set(sx, 1.5, 0); g.add(post);
  }
  const bar = new THREE.Mesh(boxGeo, iron);
  bar.scale.set(1.15, 0.05, 0.05); bar.position.y = 2.0; g.add(bar);
  return g;
}

// A porter's trolley (carrello), parked with its load of parcels: Venice has
// no cars, and goods go round on these. Low enough to jump, its load under
// its 1.6 m hitbox.
function makeCarrello() {
  const g = new THREE.Group();
  const iron = cached('mat:carrello', () => new THREE.MeshStandardMaterial({ color: 0x3a4a5a, roughness: 0.5, metalness: 0.5 }));
  const tyre = cached('mat:tyre', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.8 }));
  const plate = new THREE.Mesh(boxGeo, iron);
  plate.scale.set(1.0, 0.06, 1.3); plate.position.y = 0.3; g.add(plate);
  for (const sx of [-0.5, 0.5]) {
    const w = new THREE.Mesh(cached('geo:carrelloWheel', () => new THREE.CylinderGeometry(0.2, 0.2, 0.08, 14)), tyre);
    w.rotation.z = Math.PI / 2; w.position.set(sx, 0.2, -0.5); g.add(w);
    const rail = new THREE.Mesh(boxGeo, iron);
    rail.scale.set(0.05, 1.5, 0.05); rail.position.set(sx, 1.05, -0.62); rail.rotation.x = -0.12; g.add(rail);
  }
  const card = [0xc8a070, 0xb88a58, 0xd8b888];
  const stack = [[-0.2, 0.52, 0.5], [0.22, 0.52, 0.42], [-0.16, 0.9, 0.46], [0.2, 0.9, 0.4], [0.02, 1.27, 0.5]];
  stack.forEach(([x, y, sw], i) => {
    const box = new THREE.Mesh(boxGeo, cached(`mat:parcel:${i % 3}`, () => new THREE.MeshStandardMaterial({ color: card[i % 3], roughness: 0.95 })));
    box.scale.set(sw, 0.36, 0.55); box.position.set(x, y, (i % 3 - 1) * 0.08);
    box.castShadow = true; g.add(box);
  });
  return g;
}

export function makeHandcart() {
  const g = new THREE.Group();
  const wood = cached('mat:cartWood', () => new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.9 }));
  const bed = new THREE.Mesh(boxGeo, wood);
  bed.scale.set(2.0, 0.2, 1.3); bed.position.y = 0.9; bed.castShadow = true; g.add(bed);
  const wheels = [];
  for (const z of [-0.72, 0.72]) {
    const w = new THREE.Mesh(cached('geo:cartWheel', () => new THREE.CylinderGeometry(0.62, 0.62, 0.12, 14)), wood);
    w.rotation.x = Math.PI / 2; w.position.set(0, 0.62, z); g.add(w); wheels.push(w);
  }
  const sackCols = [0xd8c4a0, 0xc8a070, 0xe0d0b0];
  for (let i = 0; i < 5; i++) {
    const sack = new THREE.Mesh(ballGeo, cached(`mat:sack:${i % 3}`, () =>
      new THREE.MeshStandardMaterial({ color: sackCols[i % 3], roughness: 1 })));
    sack.scale.set(0.42, 0.34, 0.42);
    sack.position.set(-0.7 + (i % 3) * 0.6, 1.3 + ((i / 3) | 0) * 0.5, (i % 2 ? 0.25 : -0.25));
    g.add(sack);
  }
  const rug = new THREE.Mesh(cylGeo, cached('mat:rugRoll', () => new THREE.MeshStandardMaterial({ color: 0xb0302c, roughness: 0.95 })));
  rug.scale.set(0.3, 1.9, 0.3); rug.rotation.z = Math.PI / 2; rug.position.set(0, 2.1, 0); g.add(rug);
  const robe = cached('mat:djellaba', () => new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 }));
  const body = new THREE.Mesh(coneGeo, robe);
  body.scale.set(0.45, 1.9, 0.45); body.position.set(-1.45, 0.95, 0); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(ballGeo, robe);
  head.scale.setScalar(0.24); head.position.set(-1.45, 2.05, 0); g.add(head);
  for (const z of [-0.5, 0.5]) {
    const handle = new THREE.Mesh(boxGeo, wood);
    handle.scale.set(0.7, 0.06, 0.06); handle.position.set(-1.2, 1.15, z); g.add(handle);
  }
  g.userData.wheels = wheels;
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
    const words = adWords(theme, ['WEST END', 'REVUE ROYALE', 'GINGER SNAP', 'LITES']);
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
// Each city's far horizon is a distinct silhouette — NYC's setback towers,
// Paris's Haussmann roofline under Sacré-Cœur, London's dome/clock/glass
// towers, Rome's domes and umbrella pines. They were being drawn only 12–34%
// away from the fog colour, which made all four read as the same generic
// haze; SIL_TINT gives each city its own silhouette hue and SIL_GAIN lifts the
// contrast far enough to actually be legible through the fog.
const SIL_TINT = {
  venice: '#6a5a58',     // warm rose-grey: roofs and campanili in the lagoon haze
  nyc: '#243052',        // cool slate against the warm horizon
  paris: '#5a6486',      // soft blue-grey slate roofs
  london: '#33455e',     // sooty blue-grey
  rome: '#6e4632',       // warm umber stone and pine
  sf: '#4a5a6a',         // fog-softened slate: hills and towers through the marine layer
  jerusalem: '#6a5a44',  // warm stone-gold: limestone hills at dusk
  mexico: '#5a3a52',     // plum dusk over the volcano-ringed valley
  marrakech: '#6a3c3a',  // red earth city under the blue-grey Atlas
  delhi: '#6a4a3a',      // red sandstone and domes through the afternoon haze
  bangkok: '#5a4a5a',    // temple spires and towers in the humid haze
  capetown: '#3a4a5e',   // Table Mountain's blue-grey sandstone
  hanoi: '#5a4e42',      // tiled roofs and tube houses in the haze
  seoul: '#3e4a5a',      // the granite mountains around the city
  samarkand: '#5a4a3a',  // sand brick, and the blue domes catching the light
  zanzibar: '#4a5a64',   // white stone town, palms and minarets against the sea haze
  beijing: '#4a4a52',    // grey roofs and the curved eaves of the old towers
  havana: '#5a4a52',     // faded pastel blocks and the fortress over the harbour
  istanbul: '#4a4256',   // domes and minarets against the evening haze
  chicago: '#3a4252',    // the skyline's towers over the lake haze
  buenosaires: '#4a4a5a',  // Parisian domes and blocks, a few towers behind
};
const SIL_GAIN = 1.6;
const SIL_MAX = 0.56;      // keep the far horizon airy, never a hard cutout
function skylineTexture(theme) {
  const fogC = theme.fog;
  const tint = SIL_TINT[theme.id] || '#2c3454';
  const dark = (f) => mixc(fogC, tint, Math.min(SIL_MAX, f * SIL_GAIN));
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
      // continuous six-storey roofline with mansards. The height cycled over
      // only 3 values, which read as a row of identical dolls' houses; a
      // 7-step cycle with the odd taller block breaks the repeat up.
      for (let x = CX - 800; x < CX + 800; x += 84) {
        const k = Math.abs(Math.round(x / 84)) % 7;
        const h = 38 + k * 4 + (k === 3 ? 14 : 0);
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
      // Clock face kept dim: the tower behind it is usually hidden by the
      // street walls, so a bright disc floated in the gap like a moon.
      g.fillStyle = light(0.14);
      g.beginPath(); g.arc(cx3, GY - 178, 10, 0, 7); g.fill();
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
    } else if (theme.id === 'sf') {
      // San Francisco: hills in the marine layer with houses climbing them.
      // A far ridge (Twin Peaks' double hump right of centre), then a nearer
      // one carrying rows of narrow gabled houses. No named buildings: the
      // three landmarks appear as monuments and cameos, and the Transamerica
      // Pyramid's shape is a registered trademark.
      const ridge = (f, hFn) => {
        g.fillStyle = dark(f);
        g.beginPath(); g.moveTo(0, GY);
        for (let x = 0; x <= 1600; x += 16) g.lineTo(x, GY - hFn(x));
        g.lineTo(1600, GY); g.fill();
      };
      const bump = (x, c, w, a) => a * Math.exp(-(((x - c) / w) ** 2));
      const farH = (x) => 34 + bump(x, 1090, 105, 70) + bump(x, 1270, 95, 58) + bump(x, 380, 230, 40);
      const nearH = (x) => 12 + bump(x, 560, 190, 52) + bump(x, 1420, 150, 34) + bump(x, 110, 120, 20);
      ridge(0.1, farH);
      ridge(0.18, nearH);
      // houses packed shoulder to shoulder up the nearer hills
      for (let x = 8, i = 0; x < 1592; i++) {
        const bw = 10 + (i * 7) % 5;
        const base = nearH(x + bw / 2);
        if (base > 22) {
          const hh = 9 + (i * 13) % 6;
          box(x, bw, base + hh, 0.24);
          g.beginPath();
          g.moveTo(x, GY - base - hh); g.lineTo(x + bw / 2, GY - base - hh - 6); g.lineTo(x + bw, GY - base - hh);
          g.fill();
        }
        x += bw + 1;
      }
    } else if (theme.id === 'buenosaires') {
      // A long, even line of seven- and eight-storey blocks with domed and
      // spired corners, a few modern towers behind. (No Obelisco: it is
      // still under copyright.)
      for (const [x, w, h] of [[160, 60, 160], [600, 50, 180], [1180, 70, 170], [1440, 50, 150]]) box(x, w, h, 0.14);
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 40 + (i * 13) % 26, bh = 50 + (i * 7) % 20;
        box(x, bw, bh, 0.2);
        if (i % 5 === 2) {
          g.fillStyle = dark(0.26);
          g.beginPath(); g.ellipse(x + bw / 2, GY - bh, 12, 16, 0, Math.PI, 0); g.fill();
          g.fillRect(x + bw / 2 - 1.5, GY - bh - 30, 3, 16);
        }
        x += bw + 2;
      }
    } else if (theme.id === 'venice') {
      // A low line of tiled roofs with funnel chimneys, broken by campanili
      // with pointed tops and the odd dome. (The Campanile of San Marco is a
      // cameo on the Riva; these are generic.)
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 36 + (i * 11) % 24, bh = 30 + (i * 7) % 18;
        box(x, bw, bh, 0.16);
        if (i % 3 === 1) { box(x + bw * 0.3, 4, bh + 10, 0.18); g.fillStyle = dark(0.18); g.fillRect(x + bw * 0.3 - 3, GY - bh - 14, 10, 4); }
        x += bw;
      }
      for (const x of [220, 760, 1300]) {
        box(x, 18, 140, 0.24);
        g.fillStyle = dark(0.24); g.beginPath(); g.moveTo(x - 2, GY - 140); g.lineTo(x + 9, GY - 172); g.lineTo(x + 20, GY - 140); g.fill();
      }
      for (const x of [480, 1050]) { g.fillStyle = dark(0.22); g.beginPath(); g.ellipse(x, GY - 60, 34, 34, 0, Math.PI, 0); g.fill(); box(x - 34, 68, 60, 0.22); }
    } else if (theme.id === 'chicago') {
      // A wall of towers of every height, a few very tall with antennas.
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 40 + (i * 17) % 40, bh = 70 + (i * 37) % 140;
        box(x, bw, bh, 0.16 + ((i * 3) % 4) * 0.02);
        if (bh > 180) box(x + bw * 0.4, bw * 0.2, bh + 24, 0.2);
        x += bw + 6;
      }
      for (const [x, w, h] of [[700, 56, 290], [1020, 50, 250]]) {
        box(x, w, h * 0.7, 0.28); box(x + w * 0.2, w * 0.6, h * 0.9, 0.28); box(x + w * 0.35, w * 0.3, h, 0.3);
        box(x + w * 0.4, 3, h + 40, 0.32);
      }
    } else if (theme.id === 'istanbul') {
      // The old city's skyline from the water: hills of houses, and on them
      // great domes, each ringed by its pencil-thin minarets.
      g.fillStyle = dark(0.16);
      g.beginPath(); g.moveTo(0, GY - 30); g.quadraticCurveTo(500, GY - 80, 900, GY - 50); g.quadraticCurveTo(1300, GY - 24, 1600, GY - 40); g.lineTo(1600, GY); g.lineTo(0, GY); g.fill();
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 22 + (i * 13) % 20, bh = 30 + (i * 7) % 26;
        box(x, bw, bh, 0.2);
        x += bw + 2;
      }
      for (const [cx, r, n] of [[340, 40, 4], [820, 52, 6], [1260, 36, 2]]) {
        g.fillStyle = dark(0.32);
        g.fillRect(cx - r * 1.4, GY - 70, r * 2.8, 40);
        g.beginPath(); g.ellipse(cx, GY - 70, r, r * 0.9, 0, Math.PI, 0); g.fill();
        for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * r * 0.95, GY - 70, r * 0.45, r * 0.4, 0, Math.PI, 0); g.fill(); }
        for (let k = 0; k < n; k++) {
          const x = cx - r * 1.9 + (k / Math.max(1, n - 1)) * r * 3.8;
          g.fillRect(x - 3, GY - 70 - r * 2.2, 6, r * 2.2);
          g.beginPath(); g.moveTo(x - 4, GY - 70 - r * 2.2); g.lineTo(x, GY - 70 - r * 2.6); g.lineTo(x + 4, GY - 70 - r * 2.2); g.fill();
        }
      }
    } else if (theme.id === 'havana') {
      // Old Havana's skyline: low pastel blocks, church towers and domes,
      // and a few taller old hotels behind.
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 30 + (i * 17) % 30, bh = 26 + (i * 11) % 34;
        box(x, bw, bh, 0.18 + ((i * 7) % 3) * 0.02);
        x += bw + 2;
      }
      for (const [x, w, h] of [[300, 50, 110], [1100, 60, 130], [1380, 40, 100]]) box(x, w, h, 0.22);
      for (const [cx, r] of [[620, 34], [880, 26]]) {
        g.fillStyle = dark(0.3);
        g.fillRect(cx - r, GY - 70, r * 2, 70);
        g.beginPath(); g.ellipse(cx, GY - 70, r, r * 1.2, 0, Math.PI, 0); g.fill();
      }
      for (const x of [500, 740]) { box(x, 18, 110, 0.3); box(x + 4, 10, 124, 0.32); }
    } else if (theme.id === 'beijing') {
      // Grey courtyard roofs in long low lines, the double-eaved towers of
      // the old city here and there, and modern towers behind.
      for (const [x, w, h] of [[100, 60, 140], [380, 70, 170], [1140, 80, 150], [1420, 60, 180]]) box(x, w, h, 0.14);
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 40 + (i * 13) % 30;
        box(x, bw, 16, 0.22);
        g.beginPath(); g.moveTo(x - 4, GY - 16); g.lineTo(x + bw / 2, GY - 26); g.lineTo(x + bw + 4, GY - 16); g.fill();
        x += bw + 4;
      }
      for (const [cx, s] of [[620, 1], [900, 0.8]]) {
        g.fillStyle = dark(0.32);
        g.fillRect(cx - 50 * s, GY - 60 * s, 100 * s, 60 * s);
        for (const [y, w] of [[60, 140], [100, 110]]) {
          g.beginPath(); g.moveTo(cx - w / 2 * s, GY - y * s); g.quadraticCurveTo(cx, GY - (y + 10) * s, cx + w / 2 * s, GY - y * s);
          g.lineTo(cx + w * 0.35 * s, GY - (y + 22) * s); g.lineTo(cx - w * 0.35 * s, GY - (y + 22) * s); g.closePath(); g.fill();
        }
        g.fillRect(cx - 34 * s, GY - 100 * s, 68 * s, 40 * s);
      }
    } else if (theme.id === 'zanzibar') {
      // Stone Town from the water: tall white houses packed together, a
      // church spire, slim minarets, and palms along the shore.
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 20 + (i * 11) % 26, bh = 30 + (i * 19) % 40;
        box(x, bw, bh, 0.16 + ((i * 3) % 3) * 0.02);
        x += bw + 2;
      }
      box(700, 16, 140, 0.3);
      g.fillStyle = dark(0.3); g.beginPath(); g.moveTo(696, GY - 140); g.lineTo(708, GY - 176); g.lineTo(720, GY - 140); g.fill();
      for (const x of [380, 1000, 1240]) box(x, 8, 110, 0.28);
      for (const x of [120, 260, 520, 860, 1120, 1420]) {
        g.fillStyle = dark(0.3);
        g.fillRect(x, GY - 70, 4, 70);
        for (let k = 0; k < 6; k++) { g.beginPath(); g.ellipse(x + 2 + Math.cos(k) * 12, GY - 72 + Math.abs(Math.sin(k)) * 4, 16, 4, Math.cos(k) * 0.6, 0, 7); g.fill(); }
      }
    } else if (theme.id === 'samarkand') {
      // Low brick roofs, and over them the city's turquoise domes, ribbed and
      // round, with slim minarets and the tall gates of the old madrasas.
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 36 + (i * 13) % 30, bh = 18 + (i * 7) % 16;
        box(x, bw, bh, 0.2);
        x += bw;
      }
      for (const [cx, r, h] of [[300, 30, 60], [760, 44, 90], [1180, 34, 70]]) {
        box(cx - r * 1.2, r * 2.4, h, 0.28);
        g.fillStyle = mixc(fogC, '#2aa8b8', 0.6);
        g.beginPath(); g.ellipse(cx, GY - h, r, r * 1.3, 0, Math.PI, 0); g.fill();
      }
      for (const x of [560, 620, 960, 1020, 1400]) box(x, 9, 130, 0.3);
      for (const [x, w, h] of [[640, 100, 110], [1260, 80, 90]]) box(x, w, h, 0.26);
    } else if (theme.id === 'seoul') {
      // The granite peaks that ring the city, and the city's towers in
      // front. (No tower on the summit: N Seoul Tower is too recent.)
      g.fillStyle = dark(0.22);
      g.beginPath(); g.moveTo(0, GY - 60);
      for (const [x, h] of [[160, 150], [300, 110], [470, 190], [640, 130], [820, 170], [1000, 120], [1180, 200], [1360, 140], [1600, 90]]) g.lineTo(x, GY - h);
      g.lineTo(1600, GY); g.lineTo(0, GY); g.fill();
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 30 + (i * 11) % 40, bh = 40 + (i * 37) % 90;
        box(x, bw, bh, 0.18 + ((i * 5) % 3) * 0.03);
        x += bw + 4;
      }
    } else if (theme.id === 'hanoi') {
      // A dense ragged line of narrow tube houses of every height, a few
      // curved temple roofs among them, and some taller blocks behind.
      for (const [x, w, h] of [[160, 70, 150], [520, 60, 130], [980, 80, 170], [1380, 60, 140]]) box(x, w, h, 0.14);
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 12 + (i * 7) % 12, bh = 30 + (i * 23) % 50;
        box(x, bw, bh, 0.2 + ((i * 3) % 4) * 0.02);
        x += bw + 1;
      }
      for (const cx of [380, 760, 1220]) {
        g.fillStyle = dark(0.3);
        g.beginPath(); g.moveTo(cx - 70, GY - 60); g.quadraticCurveTo(cx, GY - 74, cx + 70, GY - 60);
        g.lineTo(cx + 84, GY - 70); g.lineTo(cx + 50, GY - 96); g.lineTo(cx - 50, GY - 96); g.lineTo(cx - 84, GY - 70); g.fill();
        g.fillRect(cx - 54, GY - 60, 108, 60);
      }
    } else if (theme.id === 'capetown') {
      // Table Mountain's long flat top with Devil's Peak on the left and
      // Lion's Head on the right, a white tablecloth of cloud spilling over
      // the edge, and the city low along its foot.
      g.fillStyle = dark(0.42);
      g.beginPath(); g.moveTo(0, GY - 20);
      g.lineTo(200, GY - 70); g.lineTo(330, GY - 135); g.lineTo(380, GY - 118);
      g.lineTo(470, GY - 146); g.lineTo(1060, GY - 150); g.lineTo(1180, GY - 90);
      g.lineTo(1300, GY - 66); g.quadraticCurveTo(1370, GY - 156, 1440, GY - 70);
      g.lineTo(1600, GY - 26); g.lineTo(1600, GY); g.lineTo(0, GY); g.fill();
      g.fillStyle = light(0.9);
      g.beginPath(); g.moveTo(480, GY - 146);
      for (let x = 480; x <= 1060; x += 30) g.lineTo(x, GY - 152 - Math.sin(x * 0.05) * 4);
      g.lineTo(1080, GY - 132); g.lineTo(1040, GY - 136); g.lineTo(980, GY - 126); g.lineTo(900, GY - 138);
      g.lineTo(780, GY - 130); g.lineTo(640, GY - 140); g.lineTo(500, GY - 134); g.fill();
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 30 + (i * 13) % 30, bh = 16 + (i * 7) % 26;
        box(x, bw, bh, 0.22);
        x += bw;
      }
    } else if (theme.id === 'bangkok') {
      // A mix of towers and temples: a few tall blocks behind, and in front
      // the stepped roofs, tall prangs and bell-shaped chedis of the wats.
      for (const [x, w, h] of [[80, 60, 150], [260, 50, 190], [420, 70, 130], [1080, 60, 200], [1250, 80, 160], [1450, 55, 140]]) box(x, w, h, 0.14);
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 34 + (i * 11) % 28, bh = 22 + (i * 7) % 20;
        box(x, bw, bh, 0.22);
        x += bw;
      }
      const prang = (cx, h, f) => {
        g.fillStyle = dark(f);
        g.beginPath(); g.moveTo(cx - h * 0.2, GY - 30);
        g.quadraticCurveTo(cx - h * 0.18, GY - h * 0.8, cx, GY - h);
        g.quadraticCurveTo(cx + h * 0.18, GY - h * 0.8, cx + h * 0.2, GY - 30);
        g.fill();
      };
      prang(640, 170, 0.32); prang(560, 90, 0.28); prang(720, 90, 0.28);
      for (const cx of [300, 980, 1180]) {                            // chedis
        g.fillStyle = dark(0.28);
        g.beginPath(); g.moveTo(cx - 26, GY - 30); g.quadraticCurveTo(cx, GY - 110, cx + 26, GY - 30); g.fill();
        g.fillRect(cx - 2, GY - 140, 4, 40);
      }
      for (const cx of [860, 1340]) {                                 // stepped temple roofs
        g.fillStyle = dark(0.3);
        for (let k = 0; k < 3; k++) {
          g.beginPath(); g.moveTo(cx - 60 + k * 12, GY - 34 - k * 16); g.lineTo(cx, GY - 70 - k * 18); g.lineTo(cx + 60 - k * 12, GY - 34 - k * 16); g.fill();
        }
      }
    } else if (theme.id === 'delhi') {
      // Domes and minarets of the old city, chhatri pavilions on the
      // rooftops, and a few taller blocks fading into the haze.
      for (let x = 0, i = 0; x < 1600; i++) {
        const bw = 30 + (i * 13) % 34, bh = 26 + (i * 17) % 40;
        box(x, bw, bh, 0.2 + ((i * 5) % 3) * 0.02);
        if (i % 4 === 1) {                                           // a chhatri
          g.fillStyle = dark(0.26);
          g.fillRect(x + bw / 2 - 8, GY - bh - 12, 16, 12);
          g.beginPath(); g.arc(x + bw / 2, GY - bh - 12, 9, Math.PI, 0); g.fill();
        }
        x += bw;
      }
      for (const [cx, r] of [[520, 34], [600, 46], [680, 34]]) {   // a great mosque's three domes
        g.fillStyle = dark(0.3);
        g.fillRect(cx - r, GY - 90, r * 2, 26);
        g.beginPath(); g.ellipse(cx, GY - 90, r, r * 1.1, 0, Math.PI, 0); g.fill();
        g.fillRect(cx - 1.5, GY - 90 - r * 1.1 - 14, 3, 14);
      }
      for (const x of [470, 730]) { box(x, 10, 150, 0.32); box(x - 4, 18, 120, 0.32); }
      for (const [x, h] of [[1100, 120], [1180, 96], [1300, 140], [200, 110]]) box(x, 46, h, 0.16);
    } else if (theme.id === 'marrakech') {
      // The High Atlas far off, then the flat-roofed medina with a minaret
      // here and there, and palms over the walls.
      g.fillStyle = dark(0.2);
      g.beginPath(); g.moveTo(0, GY - 40);
      const peaks = [[120, 150], [260, 110], [420, 190], [560, 140], [720, 210], [880, 160], [1040, 200], [1200, 130], [1360, 175], [1520, 120], [1600, 90]];
      for (const [x, h] of peaks) g.lineTo(x, GY - h);
      g.lineTo(1600, GY); g.lineTo(0, GY); g.fill();
      for (let x = 0, i = 0; x < 1600; i++) {                       // flat roofs
        const bw = 26 + (i * 17) % 30, bh = 20 + (i * 11) % 22;
        box(x, bw, bh, 0.24 + ((i * 7) % 3) * 0.02);
        x += bw;
      }
      for (const [x, h] of [[260, 96], [880, 120], [1330, 84]]) {   // minarets
        box(x, 14, h, 0.32);
        box(x + 3, 8, h + 14, 0.34);
      }
      for (const x of [120, 470, 640, 1080, 1480]) {                 // palms
        g.fillStyle = dark(0.34);
        g.fillRect(x, GY - 76, 4, 76);
        for (let k = 0; k < 6; k++) {
          g.beginPath(); g.ellipse(x + 2 + Math.cos(k) * 12, GY - 78 + Math.abs(Math.sin(k)) * 4, 16, 4, Math.cos(k) * 0.6, 0, 7); g.fill();
        }
      }
    } else {
      // Rome: dome after dome over a soft ridge, framed by umbrella pines
      g.fillStyle = dark(0.12);
      g.beginPath();
      g.moveTo(CX - 800, GY);
      g.quadraticCurveTo(CX - 300, GY - 76, CX + 200, GY - 30);
      g.quadraticCurveTo(CX + 560, GY - 8, CX + 800, GY);
      g.lineTo(CX + 800, GY); g.fill();
      for (let x = CX - 780; x < CX + 780; x += 62) box(x, 60, 34 + ((x / 62) % 3) * 10, 0.16);
      // Dome radii were set while the silhouette was invisible; at 0.5 world
      // units per pixel r=62 built a 130m dome that read as an orange blob
      // hanging over the rooftops. These are basilica-scale, not hill-scale.
      const domes = [[-430, 22, 0.24], [-150, 38, 0.3], [180, 26, 0.25], [430, 18, 0.2]];
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
      // umbrella pines: bare trunk, flat spreading canopy (halved — a 74px
      // trunk was a 37m pine, twice the height of the real thing)
      for (const [ox, s] of [[-640, 0.58], [-540, 0.45], [-40, 0.5], [300, 0.6], [620, 0.47], [700, 0.53]]) {
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
  // 400px tall was not enough headroom: Sacré-Cœur's dome, lantern and cross
  // reach 322px above its podium at GY-150 and were being sliced flat off the
  // top of the texture. The canvas grows upward only — GY stays pinned to the
  // bottom edge and the plane's bottom edge stays at the same world height,
  // so every other cameo is framed exactly as before.
  const CAM_H = 520;
  const tex = cached(`cameo:${sKey(theme)}:${key}`, () => canvasTexture(1024, CAM_H, (g) => {
    g.clearRect(0, 0, 1024, CAM_H);
    const GY = CAM_H;            // ground line at canvas bottom
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
    } else if (key === 'castillo') {
      // Chapultepec Castle on its wooded hill at the far end of Reforma
      g.fillStyle = dark(0.28);
      g.beginPath(); g.ellipse(cx, GY, 330, 96, 0, Math.PI, 0); g.fill();
      g.fillStyle = dark(0.36);
      for (const [ox, oy, r] of [[-230, 26, 26], [-150, 60, 30], [170, 56, 28], [250, 24, 24], [-60, 84, 22], [80, 82, 22]]) {
        g.beginPath(); g.arc(cx + ox, GY - oy, r, 0, 7); g.fill();
      }
      g.fillStyle = dark(0.24);
      g.fillRect(cx - 150, GY - 150, 300, 60);                       // the palace
      g.fillRect(cx + 50, GY - 196, 40, 50);                         // the tower
      g.fillStyle = light(0.2);
      for (let x = cx - 140; x < cx + 140; x += 16) g.fillRect(x, GY - 138, 7, 12);   // the gallery
    } else if (key === 'congresocameo') {
      // The Palace of the Congress at the far end of Avenida de Mayo: the
      // long colonnaded front and the great green dome over it.
      g.fillStyle = dark(0.24);
      for (const [ox, w, h] of [[-470, 160, 150], [-300, 130, 140], [170, 140, 150], [320, 150, 140]]) g.fillRect(cx + ox, GY - h, w, h);
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 170, GY - 130, 340, 130);
      g.fillStyle = light(0.25);
      for (let x = cx - 150; x < cx + 150; x += 24) g.fillRect(x, GY - 120, 8, 80);
      g.fillStyle = dark(0.4);
      g.fillRect(cx - 60, GY - 200, 120, 70);
      g.fillStyle = mixc(fogC, '#4a8a6a', 0.65);
      g.beginPath(); g.ellipse(cx, GY - 200, 64, 90, 0, Math.PI, 0); g.fill();
      g.fillStyle = dark(0.4); g.fillRect(cx - 8, GY - 312, 16, 26);
    } else if (key === 'watertowercameo') {
      // The old Water Tower on Michigan Avenue: a castellated stone tower
      // with turrets at its corners and a slim shaft rising from it.
      g.fillStyle = dark(0.22);
      for (const [ox, w, h] of [[-460, 160, 300], [-280, 120, 250], [180, 140, 280], [340, 120, 320]]) g.fillRect(cx + ox, GY - h, w, h);
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 70, GY - 110, 140, 110);
      for (const x of [cx - 78, cx + 62]) { g.fillRect(x, GY - 130, 16, 130); g.beginPath(); g.moveTo(x, GY - 130); g.lineTo(x + 8, GY - 146); g.lineTo(x + 16, GY - 130); g.fill(); }
      g.fillRect(cx - 18, GY - 280, 36, 170);
      g.fillRect(cx - 24, GY - 230, 48, 10);
      g.beginPath(); g.moveTo(cx - 20, GY - 280); g.lineTo(cx, GY - 320); g.lineTo(cx + 20, GY - 280); g.fill();
    } else if (key === 'williscameo') {
      // The Willis Tower at the end of Wacker Drive: black bundled tubes
      // stepping back as they rise, two antennas on top.
      g.fillStyle = dark(0.22);
      for (const [ox, w, h] of [[-460, 110, 200], [-330, 90, 160], [200, 120, 220], [340, 110, 180]]) g.fillRect(cx + ox, GY - h, w, h);
      g.fillStyle = dark(0.5);
      g.fillRect(cx - 60, GY - 230, 120, 230);
      g.fillRect(cx - 60, GY - 300, 80, 70);
      g.fillRect(cx - 20, GY - 360, 60, 60);
      g.fillRect(cx - 20, GY - 400, 40, 40);
      g.fillRect(cx - 12, GY - 470, 4, 70); g.fillRect(cx + 10, GY - 460, 4, 60);
    } else if (key === 'campanilecameo') {
      // San Marco at the end of the Riva: the Campanile's brick shaft, its
      // open belfry and green pyramid, the domes of the basilica beside it
      // and the long front of the Doge's Palace before them.
      g.fillStyle = dark(0.24);
      g.fillRect(cx - 380, GY - 110, 300, 110);
      for (const [ox, r] of [[-330, 34], [-250, 44], [-170, 34]]) { g.beginPath(); g.ellipse(cx + ox, GY - 110, r, r * 1.1, 0, Math.PI, 0); g.fill(); }
      g.fillStyle = dark(0.32);
      g.fillRect(cx - 34, GY - 300, 68, 300);
      g.fillStyle = light(0.25);
      for (let x = cx - 26; x < cx + 26; x += 13) g.fillRect(x, GY - 300 + 4, 7, 26);
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 38, GY - 340, 76, 40);
      g.beginPath(); g.moveTo(cx - 38, GY - 340); g.lineTo(cx, GY - 440); g.lineTo(cx + 38, GY - 340); g.fill();
      g.fillRect(cx - 1.5, GY - 460, 3, 20);
      g.fillStyle = dark(0.2);
      g.fillRect(cx + 60, GY - 120, 380, 120);
    } else if (key === 'galatacameo') {
      // The Galata Tower at the far end of İstiklal, over the rooftops:
      // the round stone shaft, its gallery and the tall conical cap.
      g.fillStyle = dark(0.24);
      for (const [ox, w, h] of [[-420, 140, 80], [-260, 120, 96], [150, 130, 90], [300, 160, 76]]) g.fillRect(cx + ox, GY - h, w, h);
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 40, GY - 250, 80, 250);
      g.fillRect(cx - 48, GY - 270, 96, 20);
      g.fillStyle = light(0.3);
      for (let x = cx - 44; x < cx + 44; x += 12) g.fillRect(x, GY - 266, 6, 12);
      g.fillStyle = dark(0.4);
      g.beginPath(); g.moveTo(cx - 46, GY - 270); g.lineTo(cx, GY - 360); g.lineTo(cx + 46, GY - 270); g.fill();
    } else if (key === 'domes') {
      // Sultanahmet ahead: the Blue Mosque's cascade of domes and its six
      // minarets, and beyond it Hagia Sophia's great flattened dome.
      g.fillStyle = dark(0.26);
      g.fillRect(cx - 470, GY - 60, 940, 60);
      g.fillStyle = dark(0.34);
      g.fillRect(cx - 160, GY - 140, 320, 80);
      g.beginPath(); g.ellipse(cx, GY - 140, 110, 90, 0, Math.PI, 0); g.fill();
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 120, GY - 140, 54, 46, 0, Math.PI, 0); g.fill(); }
      for (const x of [-250, -190, -150, 150, 190, 250]) {
        g.fillRect(cx + x - 4, GY - 330, 8, 270);
        g.beginPath(); g.moveTo(cx + x - 6, GY - 330); g.lineTo(cx + x, GY - 360); g.lineTo(cx + x + 6, GY - 330); g.fill();
      }
      g.fillStyle = dark(0.22);
      g.fillRect(cx + 300, GY - 120, 160, 60);
      g.beginPath(); g.ellipse(cx + 380, GY - 120, 70, 44, 0, Math.PI, 0); g.fill();
    } else if (key === 'morro') {
      // Morro Castle across the harbour mouth: the long fortress walls on
      // their rock, and the lighthouse rising from the point.
      g.fillStyle = dark(0.24);
      g.beginPath(); g.moveTo(cx - 480, GY); g.lineTo(cx - 420, GY - 40); g.lineTo(cx + 260, GY - 50); g.lineTo(cx + 380, GY - 20); g.lineTo(cx + 480, GY); g.fill();
      g.fillStyle = dark(0.32);
      g.fillRect(cx - 400, GY - 90, 600, 46);
      for (let x = cx - 400; x < cx + 200; x += 26) g.fillRect(x, GY - 100, 14, 10);
      g.fillStyle = dark(0.4);
      g.fillRect(cx + 120, GY - 260, 34, 170);
      g.fillRect(cx + 114, GY - 272, 46, 14);
      g.fillStyle = light(0.7); g.fillRect(cx + 124, GY - 292, 26, 20);
      g.fillStyle = dark(0.4); g.beginPath(); g.moveTo(cx + 118, GY - 292); g.lineTo(cx + 137, GY - 308); g.lineTo(cx + 156, GY - 292); g.fill();
    } else if (key === 'wonders') {
      // The House of Wonders on the seafront: a tall square block wrapped in
      // balconies on slim columns, with its clock tower rising in front.
      g.fillStyle = dark(0.22);
      for (let x = cx - 480; x < cx + 480; x += 30) { if (Math.abs(x - cx) > 170) { g.fillRect(x, GY - 60, 3, 60); g.beginPath(); g.ellipse(x, GY - 62, 14, 4, 0, 0, 7); g.fill(); } }
      g.fillStyle = dark(0.34);
      g.fillRect(cx - 150, GY - 200, 300, 200);
      g.fillStyle = light(0.25);
      for (let y = GY - 190; y < GY; y += 64) for (let x = cx - 144; x < cx + 144; x += 18) g.fillRect(x, y, 3, 56);
      g.fillStyle = dark(0.4);
      g.fillRect(cx - 24, GY - 260, 48, 260);
      g.beginPath(); g.moveTo(cx - 28, GY - 260); g.lineTo(cx, GY - 284); g.lineTo(cx + 28, GY - 260); g.fill();
      g.fillStyle = light(0.6); g.beginPath(); g.arc(cx, GY - 236, 12, 0, 7); g.fill();
    } else if (key === 'registan') {
      // The Registan ahead: three great tiled gates facing the square, the
      // middle one with its turquoise dome, and minarets at the corners.
      const gate = (x, w, h, f) => {
        g.fillStyle = dark(f); g.fillRect(x - w / 2, GY - h, w, h);
        g.fillStyle = dark(f + 0.25);
        g.beginPath(); g.moveTo(x - w * 0.28, GY); g.lineTo(x - w * 0.28, GY - h * 0.5);
        g.quadraticCurveTo(x, GY - h * 0.85, x + w * 0.28, GY - h * 0.5); g.lineTo(x + w * 0.28, GY); g.fill();
      };
      g.fillStyle = dark(0.24); g.fillRect(cx - 470, GY - 90, 940, 90);
      gate(cx - 300, 150, 230, 0.3); gate(cx + 300, 150, 230, 0.3); gate(cx, 170, 210, 0.32);
      g.fillStyle = mixc(fogC, '#2aa8b8', 0.65);
      g.beginPath(); g.ellipse(cx - 130, GY - 150, 50, 60, 0, Math.PI, 0); g.fill();
      g.fillStyle = dark(0.36);
      for (const x of [cx - 390, cx - 210, cx + 210, cx + 390]) { g.fillRect(x - 8, GY - 300, 16, 300); g.fillRect(x - 12, GY - 304, 24, 8); }
    } else if (key === 'turtletower') {
      // The Turtle Tower on its island in the lake: a small three-storey
      // tower of arched openings, the far shore's trees behind
      g.fillStyle = dark(0.22);
      for (let x = cx - 480; x < cx + 480; x += 30) { g.beginPath(); g.arc(x, GY - 60, 26, 0, 7); g.fill(); }
      g.fillRect(cx - 480, GY - 60, 960, 60);
      g.fillStyle = dark(0.3);
      g.beginPath(); g.ellipse(cx, GY - 20, 90, 14, 0, 0, 7); g.fill();
      g.fillStyle = dark(0.4);
      g.fillRect(cx - 34, GY - 70, 68, 50); g.fillRect(cx - 26, GY - 108, 52, 38); g.fillRect(cx - 18, GY - 136, 36, 28);
      g.beginPath(); g.moveTo(cx - 24, GY - 136); g.lineTo(cx, GY - 156); g.lineTo(cx + 24, GY - 136); g.fill();
      g.fillStyle = light(0.3);
      for (const [y, n, w] of [[-58, 3, 12], [-96, 3, 9], [-128, 1, 8]]) {
        for (let k = 0; k < n; k++) { g.beginPath(); g.arc(cx + (k - (n - 1) / 2) * (w + 8), GY + y, w / 2, Math.PI, 0); g.fill(); g.fillRect(cx + (k - (n - 1) / 2) * (w + 8) - w / 2, GY + y, w, 12); }
      }
    } else if (key === 'tablemountain') {
      // Table Mountain across the harbour, close and huge, with its
      // tablecloth of cloud, and the masts of the quay in front.
      g.fillStyle = dark(0.62);
      g.beginPath(); g.moveTo(cx - 520, GY);
      g.lineTo(cx - 420, GY - 230); g.lineTo(cx - 360, GY - 300); g.lineTo(cx + 300, GY - 306);
      g.lineTo(cx + 420, GY - 180); g.lineTo(cx + 520, GY - 120); g.lineTo(cx + 520, GY); g.fill();
      g.fillStyle = light(0.85);
      g.beginPath(); g.moveTo(cx - 360, GY - 300);
      for (let x = cx - 360; x <= cx + 300; x += 30) g.lineTo(x, GY - 312 - Math.sin(x * 0.04) * 8);
      g.lineTo(cx + 320, GY - 270); g.lineTo(cx + 200, GY - 286); g.lineTo(cx, GY - 270); g.lineTo(cx - 200, GY - 290);
      g.lineTo(cx - 340, GY - 276); g.fill();
      g.fillStyle = dark(0.4);
      for (const x of [cx - 300, cx - 180, cx + 120, cx + 260]) g.fillRect(x, GY - 150, 4, 150);
    } else if (key === 'watarun') {
      // Wat Arun across the river: the tall central prang with its four
      // smaller prangs, over the far bank's trees.
      g.fillStyle = dark(0.22);
      for (let x = cx - 480; x < cx + 480; x += 34) { g.beginPath(); g.arc(x, GY - 26, 24, 0, 7); g.fill(); }
      const prang = (x, h, f) => {
        g.fillStyle = dark(f);
        g.fillRect(x - h * 0.24, GY - h * 0.22, h * 0.48, h * 0.22);
        g.beginPath(); g.moveTo(x - h * 0.18, GY - h * 0.2);
        g.quadraticCurveTo(x - h * 0.16, GY - h * 0.82, x, GY - h);
        g.quadraticCurveTo(x + h * 0.16, GY - h * 0.82, x + h * 0.18, GY - h * 0.2);
        g.fill();
      };
      prang(cx - 170, 130, 0.3); prang(cx + 170, 130, 0.3);
      prang(cx, 240, 0.36);
      g.fillStyle = light(0.4);
      for (let k = 0; k < 5; k++) g.fillRect(cx - 36 + k * 3, GY - 90 - k * 22, 72 - k * 6, 3);
    } else if (key === 'lahori') {
      // The Red Fort's Lahori Gate at the end of Chandni Chowk: the long
      // battlemented wall, the gate with its two octagonal towers, and the
      // row of little white chhatris along its top.
      g.fillStyle = dark(0.3);
      g.fillRect(cx - 470, GY - 110, 940, 110);
      for (let x = cx - 470; x < cx + 470; x += 22) g.fillRect(x, GY - 122, 12, 12);
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 120, GY - 220, 240, 220);
      for (const x of [cx - 150, cx + 120]) {
        g.fillRect(x, GY - 250, 30, 250);
        g.beginPath(); g.arc(x + 15, GY - 250, 16, Math.PI, 0); g.fill();
      }
      g.fillStyle = light(0.5);
      for (let k = 0; k < 7; k++) {
        const x = cx - 96 + k * 32;
        g.fillRect(x - 7, GY - 236, 14, 14);
        g.beginPath(); g.arc(x, GY - 236, 8, Math.PI, 0); g.fill();
      }
      g.fillStyle = dark(0.5);
      g.beginPath(); g.moveTo(cx - 40, GY); g.lineTo(cx - 40, GY - 100);
      g.quadraticCurveTo(cx, GY - 160, cx + 40, GY - 100); g.lineTo(cx + 40, GY); g.fill();
    } else if (key === 'indiagate') {
      // India Gate at the far end of Kartavya Path: the great arch, its
      // stepped attic and the shallow bowl on top, between rows of trees.
      g.fillStyle = dark(0.24);
      for (let x = cx - 480; x < cx + 480; x += 40) {
        if (Math.abs(x - cx) < 160) continue;
        g.beginPath(); g.arc(x, GY - 40, 26, 0, 7); g.fill();
        g.fillRect(x - 3, GY - 40, 6, 40);
      }
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 90, GY - 250, 180, 250);
      g.fillRect(cx - 98, GY - 262, 196, 14);
      g.fillRect(cx - 70, GY - 290, 140, 28);
      g.fillRect(cx - 50, GY - 306, 100, 16);
      g.beginPath(); g.ellipse(cx, GY - 306, 34, 10, 0, Math.PI, 0); g.fill();
      g.fillStyle = mixc(fogC, '#f4e0b0', 0.4);
      g.beginPath(); g.moveTo(cx - 40, GY); g.lineTo(cx - 40, GY - 150);
      g.arc(cx, GY - 150, 40, Math.PI, 0); g.lineTo(cx + 40, GY); g.fill();
    } else if (key === 'koutoubia') {
      // The Koutoubia minaret over the far side of Jemaa el-Fnaa: the square
      // shaft, its lantern tower, and the spire of three balls.
      g.fillStyle = dark(0.26);
      g.fillRect(cx - 460, GY - 50, 920, 50);
      for (const [ox, w, h] of [[-380, 120, 70], [-230, 90, 58], [190, 110, 66], [330, 130, 54]]) g.fillRect(cx + ox, GY - h, w, h);
      g.fillStyle = dark(0.34);
      g.fillRect(cx - 26, GY - 250, 52, 250);
      for (let x = cx - 26; x < cx + 26; x += 13) g.fillRect(x, GY - 259, 7, 9);
      g.fillRect(cx - 11, GY - 288, 22, 38);
      g.beginPath(); g.arc(cx, GY - 288, 10, Math.PI, 0); g.fill();
      g.fillStyle = mixc(fogC, '#e0b84e', 0.6);
      for (const [dy, r] of [[-306, 5], [-315, 4], [-323, 3]]) { g.beginPath(); g.arc(cx, GY + dy, r, 0, 7); g.fill(); }
      g.fillStyle = mixc(fogC, '#2e8a86', 0.5);
      g.fillRect(cx - 26, GY - 243, 52, 6);
    } else if (key === 'towerdavid') {
      // The Tower of David citadel by Jaffa Gate: the Old City wall with its
      // battlements, the squat citadel, and the minaret rising off-centre.
      g.fillStyle = dark(0.3);
      g.fillRect(cx - 420, GY - 70, 840, 70);
      for (let x = cx - 420; x < cx + 420; x += 24) g.fillRect(x, GY - 84, 13, 14);
      g.fillStyle = dark(0.36);
      g.fillRect(cx - 110, GY - 170, 200, 170);
      for (let x = cx - 110; x < cx + 90; x += 22) g.fillRect(x, GY - 184, 12, 14);
      g.fillStyle = dark(0.3);
      g.fillRect(cx + 44, GY - 290, 20, 120);                        // minaret shaft
      g.fillRect(cx + 38, GY - 260, 32, 7);                          // balcony
      g.beginPath(); g.moveTo(cx + 40, GY - 290); g.lineTo(cx + 54, GY - 322); g.lineTo(cx + 68, GY - 290); g.fill();
    } else if (key === 'domerock') {
      // The Dome of the Rock beyond the Old City wall: the octagon, drum and
      // the gold dome, which catches the light even at this distance.
      g.fillStyle = dark(0.28);
      g.fillRect(cx - 440, GY - 64, 880, 64);
      for (let x = cx - 440; x < cx + 440; x += 24) g.fillRect(x, GY - 78, 13, 14);
      g.fillStyle = dark(0.34);
      g.fillRect(cx - 120, GY - 150, 240, 86);                        // octagon
      g.fillRect(cx - 78, GY - 186, 156, 38);                         // drum
      g.fillStyle = mixc(fogC, '#e8b840', 0.72);
      g.beginPath(); g.ellipse(cx, GY - 186, 84, 92, 0, Math.PI, 0); g.fill();
      g.fillRect(cx - 2, GY - 300, 4, 26);                            // finial
    } else if (key === 'coit') {
      // Coit Tower on Telegraph Hill, up ahead at the end of the street
      g.fillStyle = dark(0.3);
      g.beginPath(); g.ellipse(cx, GY, 300, 74, 0, Math.PI, 0); g.fill();
      g.fillStyle = dark(0.36);
      for (const [ox, oy, r] of [[-190, 22, 22], [-108, 50, 26], [136, 46, 24], [214, 20, 19], [54, 64, 17]]) {
        g.beginPath(); g.arc(cx + ox, GY - oy, r, 0, 7); g.fill();
      }
      // Scale note: the plane is 268m away at 0.2925 world units per pixel,
      // so 1px is ~0.29m of apparent height. Every other cameo tops out
      // around 250px; the tower and its hill are kept inside that.
      const top = GY - 68, tw = 30;
      g.fillStyle = dark(0.24);
      g.beginPath();
      g.moveTo(cx - tw / 2 - 4, top); g.lineTo(cx - tw / 2, top - 142);
      g.lineTo(cx + tw / 2, top - 142); g.lineTo(cx + tw / 2 + 4, top);
      g.fill();
      g.fillRect(cx - tw / 2 - 5, top - 164, tw + 10, 24);           // observation ring
      g.fillStyle = light(0.22);
      for (let i = 0; i < 4; i++) {
        const ax = cx - tw / 2 + 1 + i * 8;
        g.fillRect(ax, top - 157, 4, 11);
        g.beginPath(); g.arc(ax + 2, top - 157, 2, Math.PI, 0); g.fill();
      }
      g.fillStyle = dark(0.27);
      g.fillRect(cx - tw / 2 + 2, top - 174, tw - 4, 11);            // cap
    } else if (key === 'ferrytower') {
      // the Ferry Building's clock tower, closing the end of Market Street
      g.fillStyle = dark(0.3);
      g.fillRect(cx - 240, GY - 54, 480, 54);                        // long terminal
      g.fillStyle = light(0.12);
      for (let x = cx - 224; x < cx + 224; x += 32) {
        if (Math.abs(x - cx) < 40) continue;
        g.fillRect(x, GY - 42, 16, 24);
        g.beginPath(); g.arc(x + 8, GY - 42, 8, Math.PI, 0); g.fill();
      }
      g.fillStyle = dark(0.34);
      g.fillRect(cx - 23, GY - 196, 46, 196);                        // tower shaft
      g.fillRect(cx - 18, GY - 228, 36, 34);                         // belfry stage
      g.fillRect(cx - 12, GY - 252, 24, 25);                         // lantern
      g.beginPath();
      g.moveTo(cx - 14, GY - 252); g.lineTo(cx, GY - 272); g.lineTo(cx + 14, GY - 252);
      g.fill();
      g.fillRect(cx - 1.5, GY - 290, 3, 20);                         // flagpole
      g.fillStyle = light(0.45);
      g.beginPath(); g.arc(cx, GY - 178, 11, 0, 7); g.fill();        // clock face
      g.fillStyle = dark(0.4);
      g.fillRect(cx - 1, GY - 186, 2, 8); g.fillRect(cx, GY - 179, 6, 2);
    } else if (key === 'sacre') {
      // The white basilica crowning the hill — the thing you are running
      // toward, so it is drawn big, bright and high-contrast.
      // Scaled about its base: at full size the domes swallowed the top 44%
      // of a portrait frame and pushed the street out of the composition.
      g.save();
      g.translate(cx, GY); g.scale(0.82, 0.82); g.translate(-cx, -GY);
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
      // stone vs shade were 30 levels apart against a pale sky, so the ribs,
      // side domes and campanile all melted into one white blob. Widening the
      // gap is what makes it read as a basilica rather than a cloud.
      const stone = light(0.66), shade = mixc(fogC, '#8f8578', 0.66);
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
      g.restore();
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
      // Rose window as a dark opening in the stone. It used to be a pale disc
      // — sitting dead centre at the end of a narrow vista and lit by ACES at
      // 1.22 exposure, it read as a second sun; a pale ring read as a
      // gunsight. A window is the darkest thing on a backlit facade, so this
      // is also the correct value.
      g.fillStyle = dark(0.62);
      g.beginPath(); g.arc(cx, GY - 122, 13, 0, 7); g.fill();
      g.fillStyle = dark(0.4);
      g.beginPath(); g.arc(cx, GY - 122, 8, 0, 7); g.fill();
      // and a legible facade for it to sit on
      g.fillStyle = dark(0.34);
      g.fillRect(cx - 94, GY - 150, 188, 6);
      for (const dxr of [-56, 0, 56]) {
        g.fillStyle = dark(0.6);
        g.beginPath();
        g.moveTo(cx + dxr - 17, GY); g.lineTo(cx + dxr - 17, GY - 46);
        g.arc(cx + dxr, GY - 46, 17, Math.PI, 0);
        g.lineTo(cx + dxr + 17, GY); g.fill();
      }
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
  // 0.2925 world units per texture pixel, bottom edge pinned at y = -10.5
  const PPU = 0.2925;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(300, CAM_H * PPU), mat);
  plane.position.set(0, -10.5 + (CAM_H * PPU) / 2, -268);
  plane.renderOrder = -9;
  group.add(plane);
  return group;
}
