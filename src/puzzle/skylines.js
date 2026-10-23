// Painted skyline panoramas for the cities added in 1.2 (Dan, 23 October
// 2026: their monuments all stood in front of the same generic towers, where
// London's has the Shard and the Gherkin). Each city paints a far layer and a
// near layer onto the panorama canvas that panoTex() in puzzle.js builds; the
// six original cities keep their own code there.
//
// A backdrop never repeats one of the city's own puzzle monuments (they are
// built in front of it): Chicago shows the Hancock and Marina City, not
// Willis; Istanbul shows mosques, but not the Blue Mosque or Hagia Sophia.
//
// K carries the canvas and its helpers: g, W, U (px per world unit), HOR
// (horizon scanline), PANO_H, dRand, hz (haze toward the fog), the far and
// near colours, win (window rgb) and the shared painters from puzzle.js
// (panoWindows, panoDome, panoCampanile). u = 0.5 of W is dead centre of the
// default view, behind the monument. A portrait phone sees only about
// u = 0.455 to 0.545 at first, so each city's signature landmarks stand just
// inside that, either side of the monument; the rest of the strip shows as
// the player turns the view. Everything is deterministic (dRand).

const SHADE = 'rgba(0,0,0,0.13)';

// A ridge across the whole strip. Whole-number harmonics, so it joins at the
// wrap. Returns its height function, for things that stand on it.
function ridge(K, base, amp, h1, a1, h2, a2, col, k1 = 2, k2 = 5) {
  const { g, W, PANO_H } = K;
  const yAt = (x) => {
    const a = (x / W) * Math.PI * 2;
    return base - amp - h1 * Math.sin(k1 * a + a1) - h2 * Math.sin(k2 * a + a2);
  };
  g.fillStyle = col;
  g.beginPath(); g.moveTo(-80, PANO_H);
  for (let x = -80; x <= W + 80; x += 12) g.lineTo(x, yAt(x));
  g.lineTo(W + 80, PANO_H); g.closePath(); g.fill();
  return yAt;
}

// A row of buildings along the horizon. o: w, h ([min, max] world units),
// seed, col(i), gap, win (panoWindows options), top(x, y, bw, bh, i) for the
// roofline, base(x) to lift the row onto a slope, skip(x) to leave a space.
function row(K, o) {
  const { g, W, U, HOR, dRand } = K;
  let x = -60, i = 0;
  while (x < W + 70) {
    if (o.skip && o.skip(x)) { x += 4 * U; i++; continue; }
    const bw = (o.w[0] + dRand(i, o.seed) * (o.w[1] - o.w[0])) * U;
    const bh = (o.h[0] + dRand(i, o.seed + 1) * (o.h[1] - o.h[0])) * U;
    const lift = o.base ? o.base(x + bw / 2) : 0;
    const y = HOR + (o.drop ?? 8) - lift - bh;
    g.fillStyle = o.col(i);
    g.fillRect(x, y, bw, bh + lift + 16);
    g.fillStyle = SHADE; g.fillRect(x + bw * 0.76, y, bw * 0.24, bh + lift + 16);
    if (o.win) K.panoWindows(g, x + 4, y + 6, bw - 8, bh - 10, i + o.seed, { ...o.win, win: K.win });
    if (o.top) o.top(x, y, bw, bh, i);
    x += bw + (o.gap ? (o.gap[0] + dRand(i, o.seed + 2) * (o.gap[1] - o.gap[0])) * U : 2);
    i++;
  }
}

// Modern towers with setbacks, for a business district. o: w, h, seed, col,
// trim, skip(x), crown (chance of a spire).
function towers(K, o) {
  const { g, W, U, HOR, dRand } = K;
  let x = -60, i = 0;
  while (x < W + 70) {
    const bw0 = (o.w[0] + dRand(i, o.seed) * (o.w[1] - o.w[0])) * U;
    if (o.skip && o.skip(x + bw0 / 2)) { x += bw0; i++; continue; }
    const bh = (o.h[0] + dRand(i, o.seed + 1) * (o.h[1] - o.h[0])) * U;
    const cx = x + bw0 / 2;
    const nSt = 1 + Math.round(dRand(i, o.seed + 2) * 2);
    let by = HOR + (o.drop ?? 8), bw = bw0;
    for (let s = 0; s < nSt; s++) {
      const sh = bh * (s === 0 ? 0.6 : 0.4 / (nSt - 1));
      g.fillStyle = o.col; g.fillRect(cx - bw / 2, by - sh, bw, sh + 6);
      g.fillStyle = SHADE; g.fillRect(cx + bw * 0.18, by - sh, bw * 0.32, sh + 6);
      if (o.win) K.panoWindows(g, cx - bw / 2 + 3, by - sh + 6, bw - 6, sh - 10, i * 7 + s, { ...o.win, win: K.win });
      if (o.trim) { g.fillStyle = o.trim; g.fillRect(cx - bw / 2 - 2, by - sh - 3, bw + 4, 4); }
      by -= sh; bw *= 0.7 + dRand(i, s + 9) * 0.12;
    }
    if (dRand(i, o.seed + 3) < (o.crown ?? 0.2)) {
      g.fillStyle = o.trim || o.col;
      g.fillRect(cx - 1.5, by - bw * 1.4, 3, bw * 1.4);
    }
    x += bw0 + ((o.gap ?? [0.6, 3])[0] + dRand(i, o.seed + 4) * ((o.gap ?? [0.6, 3])[1] - (o.gap ?? [0.6, 3])[0])) * U;
    i++;
  }
}

// An upswept East Asian roof: a concave pitch with the eaves turned up.
function eave(g, cx, y, w, h, col) {
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(cx - w / 2, y - h * 0.5);
  g.quadraticCurveTo(cx - w * 0.42, y + h * 0.08, cx - w * 0.3, y);
  g.lineTo(cx + w * 0.3, y);
  g.quadraticCurveTo(cx + w * 0.42, y + h * 0.08, cx + w / 2, y - h * 0.5);
  g.quadraticCurveTo(cx + w * 0.3, y - h * 0.42, cx + w * 0.17, y - h);
  g.lineTo(cx - w * 0.17, y - h);
  g.quadraticCurveTo(cx - w * 0.3, y - h * 0.42, cx - w / 2, y - h * 0.5);
  g.closePath(); g.fill();
}

// A tiered pagoda: storeys narrowing upward, each under its own eave.
function pagoda(g, cx, baseY, w, tiers, body, roof) {
  let y = baseY + 4, tw = w;
  const th = w * 0.4;
  for (let t = 0; t < tiers; t++) {
    g.fillStyle = body; g.fillRect(cx - tw * 0.3, y - th, tw * 0.6, th + 2);
    eave(g, cx, y - th, tw, th * 0.55, roof);
    y -= th * 1.45; tw *= 0.84;
  }
  g.fillStyle = roof; g.fillRect(cx - 1.4, y - w * 0.55, 2.8, w * 0.55 + th * 0.5);
}

// An Ottoman pencil minaret: slim shaft, two balconies, a tall cone.
function minaret(g, cx, baseY, w, h, col) {
  g.fillStyle = col;
  g.fillRect(cx - w / 2, baseY - h, w, h + 6);
  g.fillRect(cx - w, baseY - h * 0.74, w * 2, w * 0.45);
  g.fillRect(cx - w * 0.85, baseY - h * 0.92, w * 1.7, w * 0.4);
  g.beginPath();
  g.moveTo(cx - w * 0.6, baseY - h); g.lineTo(cx + w * 0.6, baseY - h); g.lineTo(cx, baseY - h - w * 4.4);
  g.closePath(); g.fill();
}

// A domed mosque: a base, a cascade of half-domes, the great dome, minarets.
function mosque(K, cx, baseY, r, col, colD, nMin) {
  const { g } = K;
  g.fillStyle = col; g.fillRect(cx - r * 2.1, baseY - r * 0.8, r * 4.2, r * 0.8 + 6);
  K.panoDome(g, cx - r * 1.3, baseY - r * 0.8, r * 0.44, col, colD);
  K.panoDome(g, cx + r * 1.3, baseY - r * 0.8, r * 0.44, col, colD);
  K.panoDome(g, cx, baseY - r * 0.8, r, col, colD);
  const xs = nMin === 4 ? [-2.5, -1.9, 1.9, 2.5] : nMin === 2 ? [-2.4, 2.4] : [2.4];
  for (const k of xs) minaret(g, cx + k * r, baseY, r * 0.13, r * (Math.abs(k) > 2 ? 3.1 : 2.6), col);
}

// A square Maghrebi minaret with a crenellated top and a small lantern.
function squareTower(g, cx, baseY, w, h, col, trim) {
  g.fillStyle = col; g.fillRect(cx - w / 2, baseY - h, w, h + 6);
  g.fillStyle = SHADE; g.fillRect(cx + w * 0.18, baseY - h, w * 0.32, h + 6);
  g.fillStyle = trim; g.fillRect(cx - w / 2 - 2, baseY - h - 3, w + 4, 4);
  for (let k = 0; k < 4; k++) g.fillRect(cx - w / 2 + k * w * 0.29, baseY - h - 3 - w * 0.18, w * 0.15, w * 0.18);
  g.fillStyle = col; g.fillRect(cx - w * 0.22, baseY - h - w * 0.68, w * 0.44, w * 0.68);
  g.beginPath(); g.moveTo(cx - w * 0.3, baseY - h - w * 0.68); g.lineTo(cx + w * 0.3, baseY - h - w * 0.68);
  g.lineTo(cx, baseY - h - w * 1.05); g.closePath(); g.fill();
  g.fillRect(cx - 1.2, baseY - h - w * 1.4, 2.4, w * 0.38);
}

// A Thai chedi: stepped base, a bell, and a spire of rings.
function chedi(g, cx, baseY, w, h, col) {
  g.fillStyle = col;
  g.fillRect(cx - w * 0.5, baseY - h * 0.12, w, h * 0.12 + 6);
  g.fillRect(cx - w * 0.4, baseY - h * 0.2, w * 0.8, h * 0.09);
  g.beginPath(); g.moveTo(cx - w * 0.36, baseY - h * 0.2);
  g.bezierCurveTo(cx - w * 0.36, baseY - h * 0.44, cx - w * 0.2, baseY - h * 0.53, cx, baseY - h * 0.55);
  g.bezierCurveTo(cx + w * 0.2, baseY - h * 0.53, cx + w * 0.36, baseY - h * 0.44, cx + w * 0.36, baseY - h * 0.2);
  g.closePath(); g.fill();
  g.beginPath(); g.moveTo(cx - w * 0.1, baseY - h * 0.53); g.lineTo(cx + w * 0.1, baseY - h * 0.53); g.lineTo(cx, baseY - h);
  g.closePath(); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 1.2;
  for (let k = 1; k < 6; k++) {
    const yy = baseY - h * (0.56 + k * 0.06), hw = w * 0.1 * (1 - k / 7);
    g.beginPath(); g.moveTo(cx - hw, yy); g.lineTo(cx + hw, yy); g.stroke();
  }
}

// A Thai temple hall: three stacked steep roofs, with chofa horns at the gables.
function thaiRoof(g, cx, baseY, w, h, body, roof) {
  g.fillStyle = body; g.fillRect(cx - w * 0.4, baseY - h * 0.4, w * 0.8, h * 0.4 + 6);
  for (let k = 0; k < 3; k++) {
    const rw = w * (1 - k * 0.18), ry = baseY - h * (0.4 + k * 0.17), rh = h * (0.32 - k * 0.04);
    g.fillStyle = roof;
    g.beginPath(); g.moveTo(cx - rw / 2, ry); g.lineTo(cx + rw / 2, ry); g.lineTo(cx, ry - rh); g.closePath(); g.fill();
    g.fillRect(cx - rw / 2 - 1, ry - rh * 0.5 - 6, 2, 6);
    g.fillRect(cx + rw / 2 - 1, ry - rh * 0.5 - 6, 2, 6);
  }
  g.fillRect(cx - 1, baseY - h * 1.12, 2, h * 0.14);
}

// A palm: a curved trunk and a crown of drooping fronds.
function palm(g, cx, baseY, s, col) {
  const tx = cx + s * 0.12, ty = baseY - s;
  g.strokeStyle = col; g.lineWidth = Math.max(2, s * 0.05); g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx, baseY + 4); g.quadraticCurveTo(cx + s * 0.02, baseY - s * 0.5, tx, ty); g.stroke();
  g.fillStyle = col;
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * 0.97 + k * (Math.PI * 0.94 / 6);
    const ex = tx + Math.cos(a) * s * 0.44, ey = ty + Math.sin(a) * s * 0.2 + s * 0.16 * Math.abs(Math.cos(a));
    g.beginPath(); g.moveTo(tx, ty - 1);
    g.quadraticCurveTo((tx + ex) / 2, ty - s * 0.14, ex, ey);
    g.quadraticCurveTo((tx + ex) / 2, ty - s * 0.03, tx, ty + 2);
    g.fill();
  }
}

// A rounded broadleaf tree (or a cypress when narrow).
function tree(g, cx, baseY, w, h, col) {
  g.fillStyle = col;
  g.fillRect(cx - w * 0.05, baseY - h * 0.4, w * 0.1, h * 0.4 + 6);
  g.beginPath(); g.ellipse(cx, baseY - h * 0.62, w / 2, h * 0.38, 0, 0, Math.PI * 2); g.fill();
}

// A volcano, with an optional snow cap.
function volcano(g, cx, baseY, w, h, col, snow) {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(cx - w / 2, baseY + 6);
  g.quadraticCurveTo(cx - w * 0.18, baseY - h * 0.7, cx - w * 0.06, baseY - h);
  g.lineTo(cx + w * 0.06, baseY - h);
  g.quadraticCurveTo(cx + w * 0.18, baseY - h * 0.7, cx + w / 2, baseY + 6);
  g.closePath(); g.fill();
  if (!snow) return;
  g.fillStyle = snow;
  g.beginPath();
  g.moveTo(cx - w * 0.06, baseY - h); g.lineTo(cx + w * 0.06, baseY - h);
  g.lineTo(cx + w * 0.13, baseY - h * 0.8); g.lineTo(cx + w * 0.05, baseY - h * 0.85);
  g.lineTo(cx, baseY - h * 0.78); g.lineTo(cx - w * 0.06, baseY - h * 0.86); g.lineTo(cx - w * 0.13, baseY - h * 0.8);
  g.closePath(); g.fill();
}

// A tapered obelisk.
function obelisk(g, cx, baseY, w, h, col) {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(cx - w / 2, baseY + 6); g.lineTo(cx - w * 0.34, baseY - h);
  g.lineTo(cx, baseY - h - w * 0.7); g.lineTo(cx + w * 0.34, baseY - h); g.lineTo(cx + w / 2, baseY + 6);
  g.closePath(); g.fill();
  g.fillStyle = SHADE;
  g.beginPath(); g.moveTo(cx, baseY + 6); g.lineTo(cx, baseY - h - w * 0.7); g.lineTo(cx + w * 0.34, baseY - h);
  g.lineTo(cx + w / 2, baseY + 6); g.closePath(); g.fill();
}

// A broadcast tower: a mast with an observation pod.
function tvTower(g, cx, baseY, w, h, col) {
  g.fillStyle = col;
  g.fillRect(cx - w * 0.12, baseY - h, w * 0.24, h + 4);
  g.beginPath(); g.ellipse(cx, baseY - h * 0.74, w * 0.5, w * 0.2, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(cx - w * 0.3, baseY - h * 0.84, w * 0.6, w * 0.26);
  g.fillRect(cx - 1.2, baseY - h * 1.3, 2.4, h * 0.3);
}

// A tall tower that tapers to a point (Lotte World Tower, China Zun).
function taperTower(g, cx, baseY, w, h, col, win) {
  g.fillStyle = col;
  g.beginPath(); g.moveTo(cx - w / 2, baseY + 6);
  g.quadraticCurveTo(cx - w * 0.46, baseY - h * 0.6, cx - w * 0.12, baseY - h);
  g.lineTo(cx + w * 0.12, baseY - h);
  g.quadraticCurveTo(cx + w * 0.46, baseY - h * 0.6, cx + w / 2, baseY + 6);
  g.closePath(); g.fill();
  g.fillStyle = SHADE; g.fillRect(cx + w * 0.08, baseY - h, w * 0.4, h + 6);
  g.strokeStyle = `rgba(${win},0.2)`; g.lineWidth = 1.4;
  for (let k = 1; k < 18; k++) {
    const t = k / 18, yy = baseY - h * t, hw = w * 0.5 * (1 - t * 0.76);
    g.beginPath(); g.moveTo(cx - hw, yy); g.lineTo(cx + hw, yy); g.stroke();
  }
}

// Mexico City: the snow-capped volcanoes on the eastern horizon, Torre
// Latinoamericana and the Angel of Independence's column; low colonial
// facades in front.
function mexico(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    ridge(K, HOR + 18, 26, 12, 1.4, 8, 0.3, K.hz(K.S.far, K.FAR + 0.14));
    const vol = K.hz('#6a6a86', K.FAR + 0.06), snow = K.hz('#f2f0f4', K.FAR * 0.5);
    volcano(g, W * 0.53, HOR + 6, 120 * U, 30 * U, vol, snow);     // Popocatépetl
    volcano(g, W * 0.43, HOR + 6, 150 * U, 22 * U, vol, snow);     // Iztaccíhuatl's long ridge
    return;
  }
  const facade = ['#c8503a', '#e0a040', '#3a7a9a', '#d87090', '#e8c8a0'];
  row(K, { w: [7, 13], h: [7, 12], seed: 61, gap: [0.4, 2], col: (i) => K.tint(facade[i % 5], 0.5),
    win: { cw: 4, ch: 7, gx: 8, gy: 8, p: 0.4 },
    top: (x, y, bw) => { g.fillStyle = K.trimCol; g.fillRect(x - 2, y - 3, bw + 4, 4); } });
  // Torre Latinoamericana
  const tc = K.hz('#5a6478', K.NEAR * 0.8), cx = W * 0.545;
  g.fillStyle = tc; g.fillRect(cx - 5 * U, HOR + 8 - 34 * U, 10 * U, 34 * U);
  g.fillRect(cx - 3.6 * U, HOR + 8 - 38 * U, 7.2 * U, 4.2 * U);
  g.fillRect(cx - 2.2 * U, HOR + 8 - 41 * U, 4.4 * U, 3.2 * U);
  g.fillRect(cx - 0.4 * U, HOR + 8 - 47 * U, 0.8 * U, 6.2 * U);
  K.panoWindows(g, cx - 4.4 * U, HOR + 8 - 33 * U, 8.8 * U, 32 * U, 5, { cw: 3, ch: 4, gx: 4, gy: 6, p: 0.35, win: K.win });
  // the Angel's column, gilded at the top
  const ax = W * 0.455;
  g.fillStyle = K.hz('#d8d0c0', K.NEAR); g.fillRect(ax - 3 * U, HOR + 8 - 3 * U, 6 * U, 3 * U);
  g.fillRect(ax - 0.9 * U, HOR + 8 - 22 * U, 1.8 * U, 19 * U);
  g.fillStyle = K.hz('#e8b830', K.NEAR * 0.5);
  g.beginPath(); g.ellipse(ax, HOR + 8 - 23.5 * U, 1.3 * U, 2 * U, 0, 0, Math.PI * 2); g.fill();
}

// Marrakech: the snowy High Atlas behind, then flat-roofed ochre walls with
// crenellations, palms, and a square minaret or two (not the Koutoubia, which
// is a monument here).
function marrakech(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    const y = ridge(K, HOR + 10, 90, 44, 0.9, 20, 2.2, K.hz('#7880a0', K.FAR * 0.8), 3, 7);
    g.fillStyle = K.hz('#f4f2f6', K.FAR * 0.4);
    const line = HOR + 10 - 118;
    for (let x = 0; x < W; x += 6) {
      const yy = y(x);
      if (yy < line) g.fillRect(x, yy - 1, 6, (line - yy) * 0.75 + 4);
    }
    return;
  }
  const ochre = K.tint('#c8704a', 0.55);
  row(K, { w: [6, 14], h: [6, 10], seed: 71, gap: [0, 1.2], col: () => ochre,
    win: { cw: 3, ch: 4, gx: 10, gy: 9, p: 0.25 },
    top: (x, y, bw) => {
      g.fillStyle = ochre;
      for (let m = x; m < x + bw - 3; m += 7) g.fillRect(m, y - 4, 3.5, 4);
    } });
  const tw = K.tint('#d08a5a', 0.6);
  squareTower(g, W * 0.545, HOR + 8, 4.4 * U, 22 * U, tw, K.hz('#2e8a6a', K.NEAR));
  squareTower(g, W * 0.455, HOR + 8, 3.2 * U, 15 * U, tw, K.hz('#2e8a6a', K.NEAR));
  squareTower(g, W * 0.82, HOR + 8, 3.4 * U, 17 * U, tw, K.hz('#2e8a6a', K.NEAR));
  const pc = K.hz('#2e4a30', K.NEAR * 0.9);
  for (let k = 0; k < 16; k++) palm(g, (k / 16) * W + K.dRand(k, 72) * 120, HOR + 8, (8 + K.dRand(k, 73) * 5) * U, pc);
}

// Delhi: Jama Masjid's domes and minarets in red sandstone and white marble,
// the Lotus Temple, low buildings with chhatris, and rounded trees.
function delhi(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    towers(K, { w: [6, 12], h: [8, 18], seed: 81, col: K.farCol, gap: [3, 10] });
    return;
  }
  const sand = K.tint('#a84a30', 0.5), marble = K.hz('#f0ece4', K.NEAR * 1.2), marbleD = K.hz('#c8c0b4', K.NEAR);
  row(K, { w: [6, 12], h: [4, 8], seed: 82, gap: [0.6, 3], col: () => K.nearCol,
    win: { cw: 3, ch: 5, gx: 8, gy: 8, p: 0.35 },
    top: (x, y, bw, bh, i) => {
      if (i % 4 !== 1) return;
      const cx = x + bw / 2, r = 1.3 * U;
      g.fillStyle = K.trimCol; g.fillRect(cx - r, y - r * 1.4, 2, r * 1.4); g.fillRect(cx + r - 2, y - r * 1.4, 2, r * 1.4);
      K.panoDome(g, cx, y - r * 1.4, r, K.trimCol, K.roofCol);
    } });
  // Jama Masjid
  const jx = W * 0.548, jy = HOR + 8;
  g.fillStyle = sand; g.fillRect(jx - 20 * U, jy - 7 * U, 40 * U, 7 * U + 6);
  K.panoDome(g, jx, jy - 7 * U, 6 * U, marble, marbleD);
  K.panoDome(g, jx - 10 * U, jy - 7 * U, 4 * U, marble, marbleD);
  K.panoDome(g, jx + 10 * U, jy - 7 * U, 4 * U, marble, marbleD);
  for (const k of [-1, 1]) {
    g.fillStyle = sand; g.fillRect(jx + k * 19 * U - 1.1 * U, jy - 26 * U, 2.2 * U, 26 * U);
    g.fillStyle = marble; for (let s = 1; s < 4; s++) g.fillRect(jx + k * 19 * U - 1.1 * U, jy - s * 7 * U, 2.2 * U, 0.7 * U);
    K.panoDome(g, jx + k * 19 * U, jy - 26 * U, 1.4 * U, marble, marbleD);
  }
  // the Lotus Temple: three rings of white petals
  const lx = W * 0.455, ly = HOR + 8;
  for (let ring = 0; ring < 3; ring++) {
    const n = 5 - ring, pw = (8 - ring * 1.2) * U, ph = (12 + ring * 4) * U;
    for (let p = 0; p < n; p++) {
      const px = lx + (p - (n - 1) / 2) * pw * 0.72;
      g.fillStyle = ring === 2 ? marble : ring === 1 ? marbleD : K.hz('#e0dad0', K.NEAR);
      g.beginPath(); g.moveTo(px - pw / 2, ly);
      g.quadraticCurveTo(px - pw / 2, ly - ph * 0.7, px, ly - ph);
      g.quadraticCurveTo(px + pw / 2, ly - ph * 0.7, px + pw / 2, ly);
      g.closePath(); g.fill();
    }
  }
  const tc = K.hz('#3a5030', K.NEAR * 0.9);
  for (let k = 0; k < 18; k++) tree(g, (k / 18) * W + K.dRand(k, 83) * 90, HOR + 8, (5 + K.dRand(k, 84) * 4) * U, (6 + K.dRand(k, 85) * 3) * U, tc);
}

// Bangkok: glass towers behind; in front, shophouses, gilded chedis and the
// stacked roofs of temple halls.
function bangkok(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    towers(K, { w: [7, 13], h: [12, 28], seed: 91, col: K.farCol, gap: [1, 4], crown: 0.3 });
    return;
  }
  row(K, { w: [5, 9], h: [6, 10], seed: 92, gap: [0, 1], col: (i) => (i % 3 ? K.nearCol : K.tint('#d8b890', 0.4)),
    win: { cw: 3, ch: 6, gx: 6, gy: 7, p: 0.45 } });
  const gold = K.hz('#e0a828', K.NEAR * 0.7), white = K.hz('#ece6da', K.NEAR);
  const roof = K.hz('#b83a2a', K.NEAR * 0.8), green = K.hz('#2a7a4a', K.NEAR * 0.8);
  thaiRoof(g, W * 0.452, HOR + 8, 32 * U, 24 * U, white, roof);
  chedi(g, W * 0.545, HOR + 8, 13 * U, 40 * U, gold);
  chedi(g, W * 0.565, HOR + 8, 7 * U, 22 * U, gold);
  for (const u of [0.12, 0.27, 0.74, 0.9]) {
    thaiRoof(g, W * u, HOR + 8, 24 * U, 18 * U, white, u > 0.5 ? green : roof);
    chedi(g, W * (u + 0.045), HOR + 8, 6.5 * U, 21 * U, white);
  }
}

// Cape Town: Table Mountain's flat top fills the sky behind the monument,
// with Lion's Head and Devil's Peak either side; the bright little houses of
// the Bo-Kaap in front, and a few towers of the city bowl.
function capetown(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    const rock = K.hz('#4a5a5a', K.FAR * 0.45), rockD = K.hz('#3a4848', K.FAR * 0.45);   // dark enough to stand out from the haze
    g.fillStyle = rock;
    g.beginPath(); g.moveTo(W * 0.24, HOR + 8);
    g.quadraticCurveTo(W * 0.27, HOR - 22 * U, W * 0.3, HOR - 30 * U);        // Devil's Peak
    g.lineTo(W * 0.32, HOR - 31 * U);
    g.lineTo(W * 0.35, HOR - 33 * U);
    g.lineTo(W * 0.62, HOR - 33 * U);                                          // the flat top
    g.lineTo(W * 0.65, HOR - 27 * U);
    g.quadraticCurveTo(W * 0.7, HOR - 18 * U, W * 0.73, HOR - 16 * U);
    g.quadraticCurveTo(W * 0.755, HOR - 32 * U, W * 0.765, HOR - 34 * U);     // Lion's Head
    g.quadraticCurveTo(W * 0.78, HOR - 28 * U, W * 0.82, HOR + 8);
    g.closePath(); g.fill();
    g.fillStyle = rockD;                                                       // the cliff face
    g.fillRect(W * 0.35, HOR - 33 * U, W * 0.27, 4 * U);
    g.fillStyle = 'rgba(255,255,255,0.55)';                                    // the tablecloth
    g.beginPath(); g.ellipse(W * 0.48, HOR - 32.5 * U, W * 0.12, 1.4 * U, 0, 0, Math.PI * 2); g.fill();
    return;
  }
  towers(K, { w: [6, 11], h: [12, 26], seed: 101, col: K.hz(K.S.near, K.NEAR * 1.4), gap: [4, 14],
    win: { cw: 3, ch: 4, gx: 5, gy: 6, p: 0.3 }, skip: (x) => x > W * 0.4 && x < W * 0.6 });
  const bo = ['#e8508a', '#f0c030', '#40a8d8', '#60c070', '#f08040', '#a070d0'];
  row(K, { w: [5, 7], h: [5, 8], seed: 102, gap: [0, 0.4], col: (i) => K.tint(bo[i % 6], 0.6),
    win: { cw: 3, ch: 5, gx: 6, gy: 7, p: 0.4 },
    top: (x, y, bw) => { g.fillStyle = K.trimCol; g.fillRect(x - 1, y - 3, bw + 2, 3); } });
}

// Hanoi: Landmark 72 and newer towers behind; narrow tall "tube houses" in
// mixed colours, trees, and the tiered Tran Quoc pagoda.
function hanoi(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    towers(K, { w: [6, 11], h: [12, 26], seed: 111, col: K.farCol, gap: [2, 8] });
    taperTower(g, W * 0.545, HOR + 2, 12 * U, 52 * U, K.hz(K.S.far, K.FAR * 0.9), K.win);
    return;
  }
  const tube = ['#e0c060', '#d88a6a', '#9ab8c8', '#e8e0c8', '#c8d890'];
  row(K, { w: [3.2, 4.6], h: [9, 15], seed: 112, gap: [0, 0.3], col: (i) => K.tint(tube[i % 5], 0.45),
    win: { cw: 3, ch: 5, gx: 4, gy: 7, p: 0.5 },
    top: (x, y, bw, bh, i) => {
      g.fillStyle = K.trimCol;
      for (let b = y + bh * 0.25; b < y + bh - 6; b += 2.6 * U) g.fillRect(x - 1, b, bw + 2, 2);   // balconies
      if (i % 3 === 0) { g.fillStyle = K.roofCol; g.fillRect(x, y - 2 * U, bw, 2 * U); }
    } });
  const tc = K.hz('#345a32', K.NEAR * 0.9);
  for (let k = 0; k < 14; k++) tree(g, (k / 14) * W + K.dRand(k, 113) * 100, HOR + 8, (6 + K.dRand(k, 114) * 3) * U, (7 + K.dRand(k, 115) * 3) * U, tc);
  pagoda(g, W * 0.455, HOR + 8, 11 * U, 7, K.hz('#b85a3a', K.NEAR), K.hz('#6a3a2a', K.NEAR));
}

// Seoul: the granite peaks of Bukhansan with N Seoul Tower on its hill, the
// Lotte World Tower's taper, apartment blocks, and curved hanok roofs.
function seoul(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    ridge(K, HOR + 14, 96, 40, 0.6, 18, 1.9, K.hz('#6a7488', K.FAR), 3, 7);
    const y = ridge(K, HOR + 10, 48, 26, 2.2, 12, 0.7, K.hz('#5a6476', K.FAR * 0.9), 2, 5);
    const tx = W * 0.455;
    tvTower(g, tx, y(tx), 5 * U, 30 * U, K.hz('#e8e4dc', K.FAR * 0.8));
    taperTower(g, W * 0.545, HOR + 4, 11 * U, 64 * U, K.hz('#8a96a8', K.FAR * 0.8), K.win);
    return;
  }
  towers(K, { w: [9, 14], h: [12, 18], seed: 121, col: K.tint('#c8ccd4', 0.4), gap: [2, 6], crown: 0,
    win: { cw: 3, ch: 3, gx: 4, gy: 5, p: 0.4 }, skip: (x) => x > W * 0.43 && x < W * 0.48 });
  row(K, { w: [9, 14], h: [3.4, 4.6], seed: 122, gap: [0.4, 1.6], col: () => K.tint('#e0d8c8', 0.6),
    top: (x, y, bw) => eave(g, x + bw / 2, y + 2, bw * 1.16, 5 * U, K.hz('#4a4e58', K.NEAR)) });
}

// Samarkand: mountains beyond, then mud-brick walls, the turquoise ribbed
// domes and tall arched portals of Timurid mosques and madrasas (not the
// Registan or Gur-e-Amir, which are monuments here).
function samarkand(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    ridge(K, HOR + 12, 70, 30, 1.2, 14, 2.8, K.hz('#8088a0', K.FAR * 0.85), 2, 7);
    return;
  }
  const brick = K.tint('#c8a070', 0.55), turq = K.hz('#2aa8b8', K.NEAR * 0.6), turqD = K.hz('#1a7888', K.NEAR * 0.6);
  row(K, { w: [6, 12], h: [5, 8], seed: 131, gap: [0.4, 2], col: () => brick,
    win: { cw: 3, ch: 5, gx: 9, gy: 9, p: 0.2 } });
  const portal = (cx, w, h) => {
    g.fillStyle = brick; g.fillRect(cx - w / 2, HOR + 8 - h, w, h + 4);
    g.fillStyle = turqD;
    g.beginPath(); g.moveTo(cx - w * 0.3, HOR + 8); g.lineTo(cx - w * 0.3, HOR + 8 - h * 0.55);
    g.quadraticCurveTo(cx, HOR + 8 - h * 0.95, cx + w * 0.3, HOR + 8 - h * 0.55); g.lineTo(cx + w * 0.3, HOR + 8); g.fill();
    g.fillStyle = turq; g.fillRect(cx - w / 2, HOR + 8 - h - 3, w, 4);
  };
  const timurid = (cx, s) => {
    g.fillStyle = brick; g.fillRect(cx - 4 * s * U, HOR + 8 - 7 * s * U, 8 * s * U, 7 * s * U);   // drum
    K.panoDome(g, cx, HOR + 8 - 7 * s * U, 4.4 * s * U, turq, turqD);
    portal(cx - 9 * s * U, 9 * s * U, 15 * s * U);
    for (const k of [-15, 6]) { g.fillStyle = brick; g.fillRect(cx + k * s * U, HOR + 8 - 19 * s * U, 1.6 * s * U, 19 * s * U); g.fillStyle = turq; g.fillRect(cx + k * s * U - 0.3 * U, HOR + 8 - 19.6 * s * U, 2.2 * s * U, 1 * s * U); }
  };
  timurid(W * 0.56, 1.7);
  timurid(W * 0.22, 1.2);
  timurid(W * 0.84, 1.3);
  g.fillStyle = brick; g.fillRect(W * 0.45 - 4 * U, HOR + 8 - 6 * U, 8 * U, 6 * U);
  K.panoDome(g, W * 0.45, HOR + 8 - 6 * U, 4.4 * U, turq, turqD);
}

// Zanzibar: the Indian Ocean with the sails of dhows on it, then Stone Town:
// white and weathered houses with flat roofs and carved balconies, a slim
// minaret or two, and coconut palms.
function zanzibar(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    const sail = K.hz('#f0ece0', K.FAR * 0.8), hull = K.hz('#4a3a2a', K.FAR);
    for (let k = 0; k < 7; k++) {
      const x = (0.08 + k * 0.14) * W + K.dRand(k, 141) * 120, s = (6 + K.dRand(k, 142) * 3) * U;
      g.fillStyle = hull; g.fillRect(x - s * 0.6, HOR - 2, s * 1.2, s * 0.25);
      g.fillStyle = sail;
      g.beginPath(); g.moveTo(x - s * 0.5, HOR - 3); g.lineTo(x + s * 0.7, HOR - s * 1.6); g.lineTo(x + s * 0.2, HOR - 3); g.closePath(); g.fill();
    }
    return;
  }
  const white = ['#ece6dc', '#d8cfc0', '#e8dcc8', '#c8c0b0'];
  row(K, { w: [6, 11], h: [8, 13], seed: 143, gap: [0, 0.8], col: (i) => K.tint(white[i % 4], 0.6),
    win: { cw: 3, ch: 6, gx: 8, gy: 9, p: 0.3 },
    top: (x, y, bw, bh, i) => {
      if (i % 3) return;
      g.fillStyle = K.hz('#5a3a2a', K.NEAR);                                 // a carved wooden balcony
      g.fillRect(x + bw * 0.15, y + bh * 0.3, bw * 0.7, 1.2 * U);
      for (let b = x + bw * 0.15; b < x + bw * 0.85; b += 4) g.fillRect(b, y + bh * 0.3, 1.5, 2.4 * U);
    } });
  minaret(g, W * 0.545, HOR + 8, 2 * U, 28 * U, K.tint('#ece6dc', 0.6));
  squareTower(g, W * 0.455, HOR + 8, 4.4 * U, 22 * U, K.tint('#e0d8c8', 0.6), K.trimCol);
  const pc = K.hz('#2e5032', K.NEAR * 0.9);
  for (let k = 0; k < 12; k++) palm(g, (k / 12) * W + K.dRand(k, 144) * 150, HOR + 8, (10 + K.dRand(k, 145) * 5) * U, pc);
}

// Beijing: the Western Hills and the CBD's towers with China Zun behind;
// the grey tiled roofs of hutong courtyards in front, the White Dagoba of
// Beihai, and a pagoda.
function beijing(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    ridge(K, HOR + 14, 80, 34, 0.4, 14, 2.6, K.hz('#7a7a88', K.FAR * 0.9), 2, 5);
    towers(K, { w: [7, 12], h: [16, 32], seed: 151, col: K.farCol, gap: [1, 5], skip: (x) => x > W * 0.43 && x < W * 0.48 });
    taperTower(g, W * 0.545, HOR + 4, 12 * U, 62 * U, K.hz(K.S.far, K.FAR * 0.85), K.win);
    return;
  }
  const wall = K.tint('#8a8a90', 0.45), tile = K.hz('#3e3e44', K.NEAR);
  row(K, { w: [9, 14], h: [3.6, 5], seed: 152, gap: [0.4, 1.6], col: () => wall,
    top: (x, y, bw) => eave(g, x + bw / 2, y + 2, bw * 1.14, 4.6 * U, tile) });
  chedi(g, W * 0.455, HOR + 8, 13 * U, 34 * U, K.hz('#f2eee6', K.NEAR));      // the White Dagoba
  pagoda(g, W * 0.18, HOR + 8, 7 * U, 7, K.hz('#b03a2a', K.NEAR), K.hz('#3a6a4a', K.NEAR));
  pagoda(g, W * 0.86, HOR + 8, 6 * U, 5, K.hz('#b03a2a', K.NEAR), K.hz('#c8a030', K.NEAR * 0.8));
}

// Havana: the Capitolio's dome over pastel colonial facades with arcades,
// the towers along the Malecón, and royal palms.
function havana(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    towers(K, { w: [7, 11], h: [12, 24], seed: 161, col: K.farCol, gap: [4, 14], crown: 0 });
    return;
  }
  const pastel = ['#e8a8a0', '#a8d0d8', '#f0d890', '#b8d8a8', '#e8c0e0', '#f0e0c8'];
  row(K, { w: [6, 11], h: [5, 9], seed: 162, gap: [0, 0.6], col: (i) => K.tint(pastel[i % 6], 0.55),
    win: { cw: 3, ch: 6, gx: 7, gy: 8, p: 0.35 },
    top: (x, y, bw, bh) => {
      g.fillStyle = 'rgba(0,0,0,0.18)';                                      // the arcade at street level
      for (let a = x + 3; a < x + bw - 6; a += 2.4 * U) {
        g.beginPath(); g.moveTo(a, y + bh + 8); g.lineTo(a, y + bh - 1.4 * U);
        g.arc(a + 0.8 * U, y + bh - 1.4 * U, 0.8 * U, Math.PI, 0); g.lineTo(a + 1.6 * U, y + bh + 8); g.fill();
      }
      g.fillStyle = K.trimCol; g.fillRect(x - 2, y - 3, bw + 4, 4);
    } });
  // the Capitolio
  const cx = W * 0.545, base = HOR + 8, stone = K.hz('#e8e2d4', K.NEAR), stoneD = K.hz('#c0b8a8', K.NEAR);
  g.fillStyle = stone; g.fillRect(cx - 26 * U, base - 8 * U, 52 * U, 8 * U + 6);
  g.fillRect(cx - 7 * U, base - 15 * U, 14 * U, 7 * U);
  g.fillRect(cx - 4.4 * U, base - 21 * U, 8.8 * U, 6 * U);
  K.panoDome(g, cx, base - 21 * U, 4.6 * U, stone, stoneD);
  const pc = K.hz('#2e5032', K.NEAR * 0.9);
  for (let k = 0; k < 10; k++) palm(g, (k / 10) * W + K.dRand(k, 163) * 160, HOR + 8, (12 + K.dRand(k, 164) * 5) * U, pc);
}

// Istanbul: hills crowned with domes and pencil minarets across the water;
// tightly packed houses in front (the Blue Mosque, Hagia Sophia and Galata
// Tower are monuments here, so these are other mosques).
function istanbul(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    const y = ridge(K, HOR + 10, 16, 10, 0.8, 5, 2.3, K.farCol, 2, 5);
    for (const u of [0.15, 0.36, 0.64, 0.85]) {
      const x = W * u;
      mosque(K, x, y(x) + 4, (7 + K.dRand(u * 10, 171) * 2) * U, K.hz(K.S.far, K.FAR * 0.85), K.hz(K.S.far, K.FAR * 1.1), u === 0.36 ? 4 : 2);
    }
    return;
  }
  row(K, { w: [5, 9], h: [6, 11], seed: 172, gap: [0, 0.6], col: (i) => K.tint(['#c88a6a', '#e0c8a0', '#a8a0b0', '#d0a080'][i % 4], 0.4),
    win: { cw: 3, ch: 6, gx: 6, gy: 7, p: 0.45 },
    top: (x, y, bw) => {
      g.fillStyle = K.hz('#8a4a3a', K.NEAR);
      g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + bw + 2, y); g.lineTo(x + bw * 0.5, y - bw * 0.2); g.closePath(); g.fill();
    } });
  mosque(K, W * 0.548, HOR + 8, 11 * U, K.hz('#b8b0a8', K.NEAR * 1.1), K.hz('#8a8288', K.NEAR), 4);
  minaret(g, W * 0.455, HOR + 8, 1.8 * U, 32 * U, K.hz('#b8b0a8', K.NEAR * 1.1));
}

// Chicago: the Loop's towers, the tapering, cross-braced Hancock Center with
// its twin masts and the two round "corn cob" towers of Marina City (Willis
// is a monument here).
function chicago(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    towers(K, { w: [7, 12], h: [20, 42], seed: 181, col: K.farCol, gap: [0.5, 3], crown: 0.25 });
    return;
  }
  towers(K, { w: [8, 14], h: [16, 34], seed: 182, col: K.nearCol, trim: K.trimCol, gap: [0.6, 2.4],
    win: { cw: 4, ch: 5, gx: 6, gy: 7, p: 0.3 }, skip: (x) => (x > W * 0.435 && x < W * 0.475) || (x > W * 0.525 && x < W * 0.565) });
  // John Hancock Center
  const hx = W * 0.455, hb = HOR + 8, hw = 13 * U, hh = 62 * U, col = K.hz('#20242c', K.NEAR * 0.6);
  g.fillStyle = col;
  g.beginPath(); g.moveTo(hx - hw / 2, hb + 6); g.lineTo(hx - hw * 0.34, hb - hh); g.lineTo(hx + hw * 0.34, hb - hh); g.lineTo(hx + hw / 2, hb + 6); g.closePath(); g.fill();
  g.strokeStyle = `rgba(${K.win},0.22)`; g.lineWidth = 1.6;
  for (let s = 0; s < 5; s++) {
    const y0 = hb - (hh * s) / 5, y1 = hb - (hh * (s + 1)) / 5;
    const w0 = hw / 2 - (hw * 0.16 * s) / 5, w1 = hw / 2 - (hw * 0.16 * (s + 1)) / 5;
    g.beginPath(); g.moveTo(hx - w0, y0); g.lineTo(hx + w1, y1); g.moveTo(hx + w0, y0); g.lineTo(hx - w1, y1); g.stroke();
  }
  g.fillStyle = col; g.fillRect(hx - hw * 0.2, hb - hh - 14 * U, 1.2 * U, 14 * U); g.fillRect(hx + hw * 0.12, hb - hh - 14 * U, 1.2 * U, 14 * U);
  // Marina City
  const mc = K.hz('#d8d4cc', K.NEAR);
  for (const dx of [-3.4, 3.4]) {
    const mx = W * 0.545 + dx * U, mh = 34 * U, mw = 6 * U;
    g.fillStyle = mc; g.fillRect(mx - mw / 2, hb - mh, mw, mh + 6);
    g.fillStyle = SHADE; g.fillRect(mx + mw * 0.1, hb - mh, mw * 0.4, mh + 6);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let b = hb - mh + 4; b < hb - 6; b += 1.6 * U) {
      g.beginPath(); g.ellipse(mx, b, mw / 2 + 1.4, 1.2, 0, 0, Math.PI); g.fill();
    }
  }
}

// Buenos Aires: towers of Puerto Madero behind; Parisian mansard blocks in
// front, the white Obelisco and the lighthouse-topped Palacio Barolo.
function buenosaires(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    towers(K, { w: [7, 12], h: [18, 34], seed: 191, col: K.farCol, gap: [2, 8] });
    return;
  }
  row(K, { w: [10, 16], h: [9, 13], seed: 192, gap: [0.2, 1.5], col: () => K.nearCol,
    win: { cw: 4, ch: 8, gx: 7, gy: 7, p: 0.45 },
    top: (x, y, bw) => {
      g.fillStyle = K.trimCol; g.fillRect(x - 2, y - 3, bw + 4, 4);
      g.fillStyle = K.roofCol;
      g.beginPath(); g.moveTo(x - 2, y - 3); g.lineTo(x + bw + 2, y - 3); g.lineTo(x + bw * 0.88, y - 3 - 2.6 * U); g.lineTo(x + bw * 0.12, y - 3 - 2.6 * U); g.closePath(); g.fill();
    } });
  obelisk(g, W * 0.455, HOR + 8, 4.2 * U, 40 * U, K.hz('#f2eee8', K.NEAR));
  // Palacio Barolo
  const bx = W * 0.545, stone = K.hz('#d8ccb0', K.NEAR), stoneD = K.hz('#b0a488', K.NEAR);
  g.fillStyle = stone; g.fillRect(bx - 7 * U, HOR + 8 - 22 * U, 14 * U, 22 * U + 6);
  g.fillRect(bx - 4 * U, HOR + 8 - 30 * U, 8 * U, 8 * U);
  g.fillRect(bx - 2.6 * U, HOR + 8 - 35 * U, 5.2 * U, 5 * U);
  K.panoDome(g, bx, HOR + 8 - 35 * U, 2.4 * U, stone, stoneD);
  K.panoWindows(g, bx - 6.4 * U, HOR + 8 - 21 * U, 12.8 * U, 20 * U, 7, { cw: 3, ch: 6, gx: 6, gy: 7, p: 0.4, win: K.win });
}

// Venice: across the lagoon, the dome and campanile of San Giorgio Maggiore;
// in front, tall narrow palazzi in faded colours with funnel chimneys, and
// the campanile of St Mark's (the Salute and the Rialto are monuments here).
function venice(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    const pale = K.hz('#e8e0d0', K.FAR * 0.8), paleD = K.hz('#c8c0b0', K.FAR * 0.8);
    const sx = W * 0.43;
    g.fillStyle = pale; g.fillRect(sx - 20 * U, HOR - 12 * U, 40 * U, 12 * U + 6);
    K.panoDome(g, sx, HOR - 12 * U, 9 * U, pale, paleD);
    K.panoCampanile(g, sx + 26 * U, HOR + 4, 4.4 * U, 40 * U, pale, paleD, K.win);
    for (const u of [0.15, 0.7, 0.86]) {
      g.fillStyle = K.farCol; g.fillRect(W * u - 10 * U, HOR - 4 * U, 20 * U, 4 * U + 6);
      K.panoDome(g, W * u, HOR - 4 * U, 3 * U, K.farCol, K.hz(K.S.far, K.FAR * 1.1));
    }
    return;
  }
  const faded = ['#d88a6a', '#e8c090', '#c8a8a0', '#e0d0b0', '#b89080'];
  row(K, { w: [6, 9], h: [10, 15], seed: 201, gap: [0, 0.4], col: (i) => K.tint(faded[i % 5], 0.5),
    win: { cw: 3, ch: 7, gx: 6, gy: 8, p: 0.4 },
    top: (x, y, bw, bh, i) => {
      g.fillStyle = K.roofCol; g.fillRect(x - 2, y - 3, bw + 4, 4);
      if (i % 2) return;
      const cx = x + bw * (i % 4 ? 0.3 : 0.7);                               // a funnel chimney
      g.fillRect(cx - 1, y - 3 - 2.4 * U, 2.6, 2.4 * U);
      g.beginPath(); g.moveTo(cx - 0.9 * U, y - 3 - 3.4 * U); g.lineTo(cx + 1.2 * U, y - 3 - 3.4 * U);
      g.lineTo(cx + 0.5 * U, y - 3 - 2.3 * U); g.lineTo(cx - 0.2 * U, y - 3 - 2.3 * U); g.closePath(); g.fill();
    } });
  // St Mark's campanile, brick with a green pyramid spire
  const cx = W * 0.545, brick = K.hz('#a85a40', K.NEAR);
  g.fillStyle = brick; g.fillRect(cx - 3 * U, HOR + 8 - 36 * U, 6 * U, 36 * U + 6);
  g.fillStyle = SHADE; g.fillRect(cx + 0.6 * U, HOR + 8 - 36 * U, 2 * U, 36 * U + 6);
  g.fillStyle = K.hz('#e8e0d0', K.NEAR); g.fillRect(cx - 3.3 * U, HOR + 8 - 42 * U, 6.6 * U, 6 * U);
  g.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 3; k++) g.fillRect(cx - 2.4 * U + k * 1.8 * U, HOR + 8 - 41 * U, 1 * U, 4 * U);
  g.fillStyle = K.hz('#4a8a70', K.NEAR);
  g.beginPath(); g.moveTo(cx - 3.3 * U, HOR + 8 - 42 * U); g.lineTo(cx + 3.3 * U, HOR + 8 - 42 * U); g.lineTo(cx, HOR + 8 - 52 * U); g.closePath(); g.fill();
}

// New Orleans: the towers of the business district and the Superdome behind;
// French Quarter houses with cast-iron galleries and green shutters in front
// (the Cabildo, the Pontalba Buildings and St Louis Cathedral are monuments).
function neworleans(K, layer) {
  const { g, W, U, HOR } = K;
  if (layer === 'far') {
    towers(K, { w: [7, 12], h: [16, 32], seed: 211, col: K.farCol, gap: [1, 4], skip: (x) => x > W * 0.41 && x < W * 0.5 });
    const dx = W * 0.455, dome = K.hz('#c8c8cc', K.FAR * 0.8);
    g.fillStyle = K.farCol; g.fillRect(dx - 18 * U, HOR - 6 * U, 36 * U, 6 * U + 6);
    g.fillStyle = dome; g.beginPath(); g.ellipse(dx, HOR - 6 * U, 18 * U, 6 * U, 0, Math.PI, 0); g.fill();
    return;
  }
  const qtr = ['#e8b0a0', '#f0d8a0', '#a8c8d8', '#c8d8b0', '#e8c8d8'];
  row(K, { w: [7, 11], h: [9, 13], seed: 212, gap: [0, 0.5], col: (i) => K.tint(qtr[i % 5], 0.55),
    win: { cw: 3, ch: 7, gx: 7, gy: 9, p: 0.4 },
    top: (x, y, bw, bh) => {
      const iron = K.hz('#2a2e30', K.NEAR);
      for (const f of [0.38, 0.72]) {                                         // two storeys of galleries
        const gy = y + bh * f;
        g.fillStyle = iron; g.fillRect(x - 2, gy, bw + 4, 2);
        for (let p = x; p < x + bw; p += 1.6 * U) g.fillRect(p, gy, 1.2, bh * 0.2);
        g.fillRect(x - 2, gy + bh * 0.2, bw + 4, 1.4);
      }
      g.fillStyle = K.trimCol; g.fillRect(x - 2, y - 3, bw + 4, 4);
    } });
  const tc = K.hz('#30482e', K.NEAR * 0.9);
  for (let k = 0; k < 10; k++) tree(g, (k / 10) * W + K.dRand(k, 213) * 140, HOR + 8, (8 + K.dRand(k, 214) * 4) * U, (8 + K.dRand(k, 215) * 3) * U, tc);
}

export const SKYLINES = {
  mexico, marrakech, delhi, bangkok, capetown, hanoi, seoul, samarkand,
  zanzibar, beijing, havana, istanbul, chicago, buenosaires, venice, neworleans,
};
