// Every monument is a list of blocks:
//   { p:[x,y,z], s:[w,h,d], c:'#hex', shape, rotX/rotY/rotZ, tex, tx, glass, metal, ... }
// shape: 'box' (default) | 'cyl' | 'cone4' | 'pyramid' | 'dome' | 'sphere' | 'torus'
//        | 'lathe' (profile: [[r, y], ...] as fractions of w/2 and h)
//        | 'extrude' (outline: [[x, y], ...] as fractions of w and h, centred;
//          holes: [{ x, y, w, h, arch }] cut right through, arch rounds the top)
//        | 'pod' | 'clock' | 'archvault' | 'prism' | 'spokes' | 'water' | 'cable'
//        | 'arcseg' | 'colonnade' | 'turrets' | 'statue' | 'rock' | 'arch'
//        | 'tier' | 'eifleg' | 'chain' | 'walkway'
//        | 'group' (no mesh of its own: the piece is its adorn parts)
// tex (canvas texture painted in the block color): 'win' | 'strip' | 'arch'
//        | 'archcut' | 'gothic' | 'relief' | 'glass' | 'crown' | 'lattice'
//        | 'ashlar' | 'niche'
// adorn: [block defs] — detail that arrives WITH this piece (railings,
//        pinnacles, lamps). Their p is relative to the piece's centre; keep
//        them inside the piece's s box. Realism without extra taps.
// extras: em/emI (emissive hue + strength for glows), wet (water material),
//         op (glass opacity), spin (rad/s once built), sortY (build order).
// Blocks are ordered bottom-up by the puzzle (sorted on p[1]).

const B = (p, s, c, shape, extra = {}) => ({ p, s, c, shape, ...extra });

// ring of identical blocks around (cx, y) — horizontal plane
function ring(cx, y, r, n, size, c, shape, extra = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    out.push({ p: [cx + Math.cos(a) * r, y, Math.sin(a) * r], s: size, c, shape, rotY: -a, ...extra });
  }
  return out;
}

// vertical ring in the x/y plane (for the Eye's capsules on its rim).
// Each capsule is rolled so its long axis lies tangent to the rim, which is
// what makes them read as mounted gondolas rather than floating lozenges.
function vring(cy, r, n, size, c, shape, extra = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    out.push({
      p: [Math.cos(a) * r, cy + Math.sin(a) * r, 0], s: size, c, shape,
      rotZ: a + Math.PI / 2, ...extra,
    });
  }
  return out;
}

// curved wall segments for the Colosseum: n segments of an arched arcade
// centred on the plaza origin at ring radius R.
function arcade(y, R, h, n, c, tex, texN, coverage = 1, startA = 0) {
  const out = [];
  const total = Math.PI * 2 * coverage;
  const sweep = (total / n) * 0.965;
  for (let i = 0; i < n; i++) {
    const a = startA + (i / n) * total + total / n / 2;
    out.push({
      p: [Math.cos(a) * R, y, Math.sin(a) * R],
      s: [2 * R * Math.sin(sweep / 2), h, 0.9],
      c, shape: 'arcseg', rotY: Math.PI / 2 - a,
      arc: { R, sweep }, tex, tx: { n: texN },
    });
  }
  return out;
}

// Eiffel leg helper: curved lattice leg from foot (x0,z0) up into the first
// platform corner (x1,z1) at height h — the curve eases vertical at the top
// so it flows continuously into the platform (no visual detach).
// y0: where the leg starts (0 = the ground). The block's centre and height
// cover y0..h, which is what the scatter and the build order read.
function eifleg(x0, z0, x1, z1, h, r, c, y0 = 0) {
  return B([(x0 + x1) / 2, (y0 + h) / 2, (z0 + z1) / 2], [Math.abs(x0 - x1) + r * 2, h - y0, Math.abs(z0 - z1) + r * 2],
    c, 'eifleg', { leg: { x0, z0, x1, z1, h, r, y0 }, tex: 'truss', tx: { rows: y0 ? 5 : 4 }, em: '#ffb060', emI: 0.3 });
}

// Painted Ladies row house: the body, and the gable roof above it. The body
// arrives with what makes it a Victorian: a three-sided bay window running
// up both storeys, a cornice band in the trim colour, and a stoop. The roof
// arrives with its carved bargeboards and a gable window. The trim colour
// is half of what "painted" means here — every house is in two or three
// colours, not one.
function ladyHouse(x, body, trim, roofI) {
  const roof = ['#403c38', '#4a4640'][roofI];
  // the bay: a trapezoid extruded upward (rotX turns the extrusion to vertical)
  const bay = (y, h) => B([0, y, 2.62], [2.1, 0.84, h], body, 'extrude', {
    rotX: Math.PI / 2, outline: [[-0.5, -0.5], [0.5, -0.5], [0.3, 0.5], [-0.3, 0.5]],
  });
  const win = (bx, y) => B([bx, y, 3.06], [0.62, 1.2, 0.05], '#4d6278');
  return [
    B([x, 4.1, 0], [3.4, 8.2, 4.4], body, 'box', {
      tex: 'win', tx: { cols: 2, rows: 4 },
      adorn: [
        bay(-0.4, 5.6),
        win(0, 0.9), win(0, -1.9),
        B([0, 2.35, 3.05], [1.4, 0.18, 0.1], trim),        // bay cornice
        B([0, 4.0, 0.1], [3.62, 0.34, 4.6], trim),          // cornice band
        B([-1.72, 0, 2.21], [0.14, 8.2, 0.08], trim),       // corner boards
        B([1.72, 0, 2.21], [0.14, 8.2, 0.08], trim),
        B([1.05, -3.75, 2.7], [1.0, 0.7, 1.0], trim),       // stoop
      ],
    }),
    B([x, 10.0, 0], [3.7, 3.6, 4.4], roof, 'prism', {
      adorn: [
        B([-0.925, 0, 2.24], [4.05, 0.22, 0.1], trim, 'box', { rotZ: 1.096 }),
        B([0.925, 0, 2.24], [4.05, 0.22, 0.1], trim, 'box', { rotZ: -1.096 }),
        B([0, -0.55, 2.23], [0.7, 0.9, 0.06], '#4d6278'),
      ],
    }),
  ];
}


// Half of a regular octagon wall, as one piece: four flat panels meeting
// edge to edge, with its twin half turned 180 degrees. r is the apothem (centre
// to the middle of a face). Two identical halves beat eight panels that look
// alike but each fit one spot only (the Colosseum's problem). Each panel's
// width runs round the octagon: a box turned by -a has its local z along the
// tangent at angle a, so the width goes in s[2].
function octHalf(y, r, h, t, c, extra, flip) {
  const side = 2 * r * Math.tan(Math.PI / 8);
  const angles = [0, 1, 2, 3].map((k) => (Math.PI / 8) + k * (Math.PI / 4));
  const cz = angles.reduce((acc, a) => acc + Math.sin(a) * r, 0) / 4;
  return B([0, y, flip ? -cz : cz], [2 * r + t, h, r - cz + t + 1.4], c, 'group', {
    rotY: flip ? Math.PI : 0,
    adorn: angles.map((a) => B([Math.cos(a) * r, 0, Math.sin(a) * r - cz], [t, h, side + 0.04], c, 'box',
      { rotY: -a, ...extra })),
  });
}

const defs = {
  // ================= NEW YORK =================
  // Empire State: warm limestone-cream setbacks, halved window-stripe
  // frequency with amber lit windows, art-deco crown of stacked cones
  // with a gold rim-light glow.
  empire: [
    B([0, 1.0, 0], [8.6, 2.0, 8.6], '#cdbf9f', 'box', { tex: 'win', tx: { cols: 10, rows: 2 } }),
    B([0, 2.95, 0], [7.0, 1.9, 7.0], '#d6c8a6', 'box', { tex: 'win', tx: { cols: 8, rows: 2 } }),
    B([0, 5.4, 0], [5.4, 3.0, 5.4], '#d1c2a1', 'box', { tex: 'strip', tx: { n: 3 } }),
    B([0, 9.3, 0], [4.3, 4.8, 4.3], '#dacba9', 'box', { tex: 'strip', tx: { n: 3 } }),
    B([0, 12.7, 0], [3.5, 2.0, 3.5], '#d1c2a1', 'box', { tex: 'strip', tx: { n: 3 } }),
    B([0, 14.5, 0], [2.8, 1.6, 2.8], '#dacba9', 'box', { tex: 'strip', tx: { n: 2 } }),
    B([0, 15.9, 0], [2.2, 1.2, 2.2], '#e1d3b1', 'box', { tex: 'strip', tx: { n: 2 } }),
    B([0, 17.0, 0], [1.6, 1.0, 1.6], '#dacba9', 'box', { tex: 'strip', tx: { n: 2 } }),
    // art-deco crown: telescoping cones, gold rim-lit
    B([0, 18.05, 0], [1.5, 1.1, 0.95], '#e8dab8', 'tier', { em: '#ffd9a0', emI: 0.24 }),
    B([0, 19.0, 0], [0.95, 0.85, 0.58], '#f0e4c4', 'tier', { em: '#ffd9a0', emI: 0.32 }),
    B([0, 19.78, 0], [0.58, 0.75, 0.26], '#f5ecd2', 'tier', { metal: 1, em: '#ffce8a', emI: 0.42 }),
    B([0, 21.0, 0], [0.15, 1.8, 0.15], '#f7efe0', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.4 }),
  ],

  // Chrysler: warm white-brick body with corner setbacks, eagles that read,
  // chrome sunburst crown tiers (dark triangular cutouts) ~40% of the
  // height, tall needle. (+20% overall)
  chrysler: [
    // the base arrives with its four corner setback shoulders
    B([0, 1.25, 0], [6.4, 2.5, 6.4], '#d8d2c4', 'box', {
      tex: 'win', tx: { cols: 8, rows: 2 },
      adorn: [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) =>
        B([sx * 2.55, 1.85, sz * 2.55], [1.5, 1.2, 1.5], '#ccc6b6')),
    }),
    B([0, 4.8, 0], [5.2, 4.6, 5.2], '#ded8ca', 'box', { tex: 'win', tx: { cols: 7, rows: 5 } }),
    B([0, 8.8, 0], [4.3, 3.4, 4.3], '#d4cec0', 'box', { tex: 'win', tx: { cols: 6, rows: 4 } }),
    // The top block carries the chrome eagle heads at its corners, craning
    // out diagonally with hooked beaks. As four loose boxes they read as
    // random blocks stuck on the corners (device feedback).
    B([0, 11.6, 0], [3.6, 2.2, 3.6], '#ded8ca', 'box', {
      tex: 'win', tx: { cols: 5, rows: 2 },
      adorn: [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) =>
        B([sx * 1.72, 0.95, sz * 1.72], [1.25, 0.62, 0.34], '#e6ebf4', 'extrude', {
          metal: 1, rotY: Math.atan2(-sz, sx),
          // side profile: neck from the corner, head, beak hooked down
          outline: [[-0.5, -0.35], [0.12, -0.3], [0.3, -0.12], [0.5, -0.32], [0.46, 0.02],
            [0.3, 0.3], [0.02, 0.5], [-0.5, 0.3]],
        })),
    }),
    // chrome sunburst crown: telescoping tiers with dark triangular windows
    B([0, 13.55, 0], [3.6, 1.7, 2.75], '#e6ebf4', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.16 }),
    B([0, 15.1, 0], [2.75, 1.55, 2.05], '#dde3ee', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.18 }),
    B([0, 16.5, 0], [2.05, 1.4, 1.45], '#e6ebf4', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.2 }),
    B([0, 17.75, 0], [1.45, 1.2, 0.92], '#dde3ee', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.24 }),
    B([0, 18.8, 0], [0.92, 0.95, 0.48], '#eef2f8', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.28 }),
    B([0, 19.62, 0], [0.48, 0.75, 0.16], '#f2f5fa', 'tier', { metal: 1, em: '#fff2d8', emI: 0.3 }),
    B([0, 21.3, 0], [0.13, 2.9, 0.13], '#f4f7fb', 'cyl', { metal: 1, em: '#fff2d8', emI: 0.35 }),
  ],

  // Brooklyn Bridge. Seen side-on, what makes it Brooklyn is the WEB: the
  // diagonal stays that fan out from each tower top across the main cables,
  // which the old model did not have at all. The granite towers are cut
  // right through with their twin pointed Gothic arches — oriented as the
  // real ones are, with the roadway passing THROUGH them, so they show as
  // the camera comes round. Towers rise well clear of the deck, and the
  // cables land on masonry anchorages rather than on ramps into the plaza.
  brooklyn: [
    // tower foundations and the two masonry anchorages
    B([-6.2, 0.6, 0], [3.4, 1.2, 5.4], '#9d917b', 'box', { tex: 'relief' }),
    B([6.2, 0.6, 0], [3.4, 1.2, 5.4], '#9d917b', 'box', { tex: 'relief' }),
    B([-12.6, 2.1, 0], [3.2, 4.2, 5.0], '#a89a80', 'box', { tex: 'ashlar' }),
    B([12.6, 2.1, 0], [3.2, 4.2, 5.0], '#a89a80', 'box', { tex: 'ashlar' }),
    // the deck, with the raised timber promenade down its middle: hung from
    // the cables once they were spun, and the stays added after it — the
    // real order: towers, cables, deck, stays
    B([-8.9, 3.7, 0], [5.4, 0.5, 4.0], '#6f675d', 'box', { sortY: 14 }),
    B([8.9, 3.7, 0], [5.4, 0.5, 4.0], '#6f675d', 'box', { sortY: 14 }),
    B([0, 3.7, 0], [9.0, 0.5, 4.0], '#766d62', 'box', {
      sortY: 14,
      adorn: [B([0, 0.42, 0], [9.0, 0.16, 1.2], '#b08a5c')],
    }),
    // granite towers: an extruded face with two pointed arches cut through,
    // turned so the roadway runs through the arches
    ...[-6.2, 6.2].map((x) => B([x, 6.9, 0], [4.8, 11.6, 2.8], '#b9aa8e', 'extrude', {
      rotY: Math.PI / 2,
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [
        { x: -0.22, y: -0.07, w: 0.25, h: 0.4, arch: 'pointed' },
        { x: 0.22, y: -0.07, w: 0.25, h: 0.4, arch: 'pointed' },
      ],
      adorn: [
        // cornice and crown across the top of the tower
        B([0, 5.95, 0], [5.0, 0.45, 3.0], '#c9ba9c'),
        B([0, 6.35, 0], [4.6, 0.4, 2.6], '#b3a488'),
        // the narrow faces are what the camera sees side-on. A tall sunk
        // panel and three string courses stop them reading as blank slabs.
        // (Local x is across the bridge here: the tower is turned 90deg.)
        ...[-1, 1].flatMap((sd) => [
          B([sd * 2.42, 0.8, 0], [0.06, 7.8, 1.5], '#9e9078'),
          ...[-3.9, -0.9, 3.9].map((y) => B([sd * 2.43, y, 0], [0.08, 0.26, 2.8], '#cbbc9e')),
        ]),
      ],
    })),
    // The main cables, all four spun together: one piece, after the towers.
    B([0, 3.9, 1.7], [25.2, 0.7, 0.3], '#e6e0d0', 'cable', {
      sortY: 12.5,
      cable: { towerX: 6.2, topY: 12.9, midY: 4.6, endX: 12.4, endY: 4.0, deckY: 4.0, hangers: 13, r: 0.2 },
      adorn: [B([0, 0, -3.4], [25.2, 0.7, 0.3], '#e6e0d0', 'cable',
        { cable: { towerX: 6.2, topY: 12.9, midY: 4.6, endX: 12.4, endY: 4.0, deckY: 4.0, hangers: 13, r: 0.2 } })],
    }),
    // The web: one piece per tower, stays fanning both ways from its top.
    // Both are the same shape, so either fits either tower.
    ...[-6.2, 6.2].map((x) => B([x, 8.3, 0], [11.6, 9.2, 3.6], '#f2ecdc', 'fan', {
      sortY: 14.5,
      fan: { ax: 0, ay: 4.4, x0: 0.8, x1: 5.4, deckY: -4.4, n: 6, z: 1.7, r: 0.11 },
      adorn: [B([0, 0, 0], [11.6, 9.2, 3.6], '#f2ecdc', 'fan',
        { fan: { ax: 0, ay: 4.4, x0: -0.8, x1: -5.4, deckY: -4.4, n: 6, z: 1.7, r: 0.11 } })],
    })),
  ],

  // ================= PARIS =================
  // The Eiffel Tower. Proportions are the real ones, as fractions of its
  // 330 m: base 0.38 wide, platforms at 0.17, 0.35 and 0.84. What makes it
  // the Eiffel Tower rather than a mast is the IRONWORK, so the structure is
  // open lattice you can see through (the 'truss' texture, alpha-tested): the
  // four legs are square braced pylons that stay separate up to the second
  // platform, the great arches are tied up into the first platform by their
  // struts, and the long taper above is lattice too. It glows gold, as the
  // tower does once it is lit at dusk.
  eiffel: [
    eifleg(-5.1, -5.1, -2.85, -2.85, 4.6, 0.8, '#a88048'),
    eifleg(5.1, -5.1, 2.85, -2.85, 4.6, 0.8, '#a88048'),
    eifleg(-5.1, 5.1, -2.85, 2.85, 4.6, 0.8, '#a88048'),
    eifleg(5.1, 5.1, 2.85, 2.85, 4.6, 0.8, '#a88048'),
    // the four great arches, springing from the legs and tied to the
    // underside of the first platform — sortY brings them after the legs
    B([0, 2.45, 3.6], [8.6, 3.5, 0.26], '#b08850', 'eifarch', { chord: 5.4, sortY: 3.0, em: '#ffb060', emI: 0.3 }),
    B([0, 2.45, -3.6], [8.6, 3.5, 0.26], '#b08850', 'eifarch', { chord: 5.4, sortY: 3.0, em: '#ffb060', emI: 0.3 }),
    B([3.6, 2.45, 0], [8.6, 3.5, 0.26], '#b08850', 'eifarch', { chord: 5.4, rotY: Math.PI / 2, sortY: 3.0, em: '#ffb060', emI: 0.3 }),
    B([-3.6, 2.45, 0], [8.6, 3.5, 0.26], '#b08850', 'eifarch', { chord: 5.4, rotY: Math.PI / 2, sortY: 3.0, em: '#ffb060', emI: 0.3 }),
    // first platform: the deck, its lit gallery band and its railing
    B([0, 4.85, 0], [7.0, 0.5, 7.0], '#6a5234', 'box', {
      adorn: [
        ...[[0, 3.52, 7.0, 0.06], [0, -3.52, 7.0, 0.06]].map(([x, z, ww, dd]) => B([x, 0, z], [ww, 0.5, dd], '#d8a860', 'box', { em: '#ffc470', emI: 0.75 })),
        ...[[3.52, 0, 0.06, 7.0], [-3.52, 0, 0.06, 7.0]].map(([x, z, ww, dd]) => B([x, 0, z], [ww, 0.5, dd], '#d8a860', 'box', { em: '#ffc470', emI: 0.75 })),
        B([0, 0.45, 3.46], [7.0, 0.3, 0.07], '#a88048'), B([0, 0.45, -3.46], [7.0, 0.3, 0.07], '#a88048'),
        B([3.46, 0.45, 0], [0.07, 0.3, 7.0], '#a88048'), B([-3.46, 0.45, 0], [0.07, 0.3, 7.0], '#a88048'),
      ],
    }),
    // second storey: the same four pylons, leaning in to the second platform
    eifleg(-2.55, -2.55, -1.45, -1.45, 9.4, 0.56, '#a88048', 5.1),
    eifleg(2.55, -2.55, 1.45, -1.45, 9.4, 0.56, '#a88048', 5.1),
    eifleg(-2.55, 2.55, -1.45, 1.45, 9.4, 0.56, '#a88048', 5.1),
    eifleg(2.55, 2.55, 1.45, 1.45, 9.4, 0.56, '#a88048', 5.1),
    B([0, 9.6, 0], [4.0, 0.4, 4.0], '#6a5234', 'box', {
      adorn: [
        ...[[0, 2.02, 4.0, 0.06], [0, -2.02, 4.0, 0.06]].map(([x, z, ww, dd]) => B([x, 0, z], [ww, 0.4, dd], '#d8a860', 'box', { em: '#ffc470', emI: 0.75 })),
        ...[[2.02, 0, 0.06, 4.0], [-2.02, 0, 0.06, 4.0]].map(([x, z, ww, dd]) => B([x, 0, z], [ww, 0.4, dd], '#d8a860', 'box', { em: '#ffc470', emI: 0.75 })),
        B([0, 0.38, 1.96], [4.0, 0.26, 0.06], '#a88048'), B([0, 0.38, -1.96], [4.0, 0.26, 0.06], '#a88048'),
        B([1.96, 0.38, 0], [0.06, 0.26, 4.0], '#a88048'), B([-1.96, 0.38, 0], [0.06, 0.26, 4.0], '#a88048'),
      ],
    }),
    // the long taper to the top, in two lifts of open lattice
    B([0, 13.2, 0], [3.0, 6.8, 1.5], '#a88048', 'tier', { sides: 4, tex: 'truss', tx: { rows: 5 }, em: '#ffb060', emI: 0.3 }),
    B([0, 19.7, 0], [1.5, 6.2, 0.78], '#a88048', 'tier', { sides: 4, tex: 'truss', tx: { rows: 7 }, em: '#ffb060', emI: 0.3 }),
    // third platform with its cabin, and the beacon and mast above
    B([0, 23.0, 0], [1.7, 0.3, 1.7], '#6a5234', 'box', {
      adorn: [B([0, 0.35, 0], [1.75, 0.22, 1.75], '#d8a860', 'box', { em: '#ffc470', emI: 0.8 })],
    }),
    B([0, 23.9, 0], [1.2, 1.5, 1.2], '#8a6a40', 'lathe', {
      profile: [[0.95, 0], [0.95, 0.4], [0.62, 0.5], [0.62, 0.78], [0.34, 0.86], [0.2, 1]],
      seg: 8, em: '#ffd9a0', emI: 0.35,
    }),
    B([0, 26.2, 0], [0.16, 3.4, 0.16], '#b89866', 'cyl', {
      metal: 1, em: '#ffd9a0', emI: 0.7,
      adorn: [B([0, -1.5, 0], [0.5, 0.5, 0.5], '#fff4c8', 'sphere', { em: '#fff0b0', emI: 1.4 })],
    }),
  ],

  // Arc de Triomphe: attic flush with the legs, inset vault for shadow
  // depth, grander arch opening, sculpture groups at the leg bases.
  arc: [
    // sculpture groups (La Marseillaise etc.) standing proud of the pier faces
    B([-3.45, 1.6, 2.2], [2.0, 3.2, 0.85], '#f2e6c4', 'statue', { figs: 3, em: '#ffd9a0', emI: 0.14 }),
    B([3.45, 1.6, 2.2], [2.0, 3.2, 0.85], '#f2e6c4', 'statue', { figs: 3, em: '#ffd9a0', emI: 0.14 }),
    B([-3.45, 1.6, -2.2], [2.0, 3.2, 0.85], '#e8dab8', 'statue', { figs: 3 }),
    B([3.45, 1.6, -2.2], [2.0, 3.2, 0.85], '#e8dab8', 'statue', { figs: 3 }),
    // outer piers, full height so the attic sits flush on them (outer ±4.5)
    B([-3.45, 4.7, 0], [2.1, 9.4, 3.8], '#ded0ae', 'box', { tex: 'relief' }),
    B([3.45, 4.7, 0], [2.1, 9.4, 3.8], '#ded0ae', 'box', { tex: 'relief' }),
    // the vault itself: real barrel geometry, inset 0.5 behind the piers so
    // the opening carries genuine shadow depth instead of reading as a
    // painted cardboard cutout
    B([0, 4.7, 0], [4.9, 9.4, 2.8], '#e6d8b6', 'archvault'),
    // entablature / frieze / attic, all matched to the pier depth
    B([0, 10.15, 0], [9.0, 1.5, 3.9], '#d8caa8'),
    B([0, 11.15, 0], [9.0, 0.5, 3.95], '#c2b28c', 'box', { tex: 'relief' }),
    B([0, 12.0, 0], [9.0, 1.2, 3.8], '#e4d7b6', 'box', { tex: 'relief', em: '#ffd9a0', emI: 0.12 }),
    B([0, 12.75, 0], [9.3, 0.3, 4.05], '#cfc09c', 'box', { em: '#ffd9a0', emI: 0.16 }),
  ],

  // Louvre: regular diamond-grid glass pyramid lit from within, slate
  // blue-grey palace roofs with dormer hints, warm light pools.
  louvre: [
    // warm travertine Cour Napoleon paving — its own warm pool of ground
    // inside the cool blue-grey plaza, so the teal pyramid has both a warm
    // floor and a cool surround to read against
    B([0, 0.22, 0.4], [17.2, 0.44, 12.6], '#c0b498'),
    // palace windows deliberately dimmer than the pyramid's glow so the icon
    // stays the brightest thing in frame
    B([0, 2.55, -5.9], [17, 4.7, 2.4], '#cbbb95', 'box', { tex: 'win', tx: { cols: 15, rows: 3, lit: '#d9a866' } }),
    B([0, 5.45, -5.9], [17, 1.1, 2.6], '#465070', 'box', { tex: 'win', tx: { cols: 11, rows: 1, lit: '#d9a866' } }),
    B([-8.3, 2.55, 0.4], [2.4, 4.7, 10.2], '#cbbb95', 'box', { tex: 'win', tx: { cols: 3, rows: 3, lit: '#d9a866' } }),
    B([8.3, 2.55, 0.4], [2.4, 4.7, 10.2], '#cbbb95', 'box', { tex: 'win', tx: { cols: 3, rows: 3, lit: '#d9a866' } }),
    B([-8.3, 5.35, 0.4], [2.6, 0.9, 10.4], '#465070', 'box', { tex: 'win', tx: { cols: 6, rows: 1, lit: '#d9a866' } }),
    B([8.3, 5.35, 0.4], [2.6, 0.9, 10.4], '#465070', 'box', { tex: 'win', tx: { cols: 6, rows: 1, lit: '#d9a866' } }),
    // the icon: bigger, deep-teal reflective glass on a regular diamond grid,
    // with an opaque warm lantern inside so it glows from within
    B([0, 1.7, 1.3], [3.6, 3.0, 3.6], '#ffcf94', 'pyramid', { em: '#ffbc70', emI: 0.7, sortY: 0.6 }),
    B([0, 3.6, 1.3], [9.6, 7.0, 9.6], '#8fc6e2', 'pyramid', { glass: 1, op: 0.9, tex: 'glass', em: '#6fc0e0', emI: 0.1, sortY: 9 }),
    B([-6.0, 1.2, 4.4], [2.4, 2.1, 2.4], '#8fc6e2', 'pyramid', { glass: 1, op: 0.9, tex: 'glass', em: '#6fc0e0', emI: 0.1 }),
    B([6.0, 1.2, 4.4], [2.4, 2.1, 2.4], '#8fc6e2', 'pyramid', { glass: 1, op: 0.9, tex: 'glass', em: '#6fc0e0', emI: 0.1 }),
    B([-4.9, 0.55, 5.4], [3.2, 0.26, 3.2], '#2c6f96', 'water', { em: '#54b6d8', emI: 0.28 }),
    B([4.9, 0.55, 5.4], [3.2, 0.26, 3.2], '#2c6f96', 'water', { em: '#54b6d8', emI: 0.28 }),
  ],

  // ================= LONDON =================
  // Big Ben (the Elizabeth Tower). The pieces are the same thirteen; what
  // changed is what they carry. The shaft is Gothic panelling rather than
  // plain ashlar above the base; each clock stage arrives with its gablets
  // and corner pinnacles; the belfry is a real open arcade of pointed arches
  // round a dark core; and the iron spire carries its four corner pinnacles
  // and the Ayrton Light lantern below the finial.
  bigben: [
    B([0, 0.35, 0], [4.0, 0.7, 4.0], '#b6ab8d'),                 // plinth
    B([0, 2.9, 0], [3.5, 4.4, 3.5], '#d4c9a8', 'box', { tex: 'ashlar' }),
    B([0, 7.2, 0], [3.25, 4.2, 3.25], '#cbbf9e', 'box', { tex: 'gothic' }),
    B([0, 11.3, 0], [3.25, 4.0, 3.25], '#d4c9a8', 'box', { tex: 'gothic' }),
    B([0, 14.35, 0], [3.7, 2.4, 3.7], '#ded3b0', 'box', {
      tex: 'relief', em: '#ffd9a0', emI: 0.14,
      adorn: [
        // a gablet over each clock face
        B([0, 1.55, 1.78], [2.4, 0.9, 0.3], '#e2d7b4', 'prism'),
        B([0, 1.55, -1.78], [2.4, 0.9, 0.3], '#e2d7b4', 'prism'),
        B([1.78, 1.55, 0], [2.4, 0.9, 0.3], '#e2d7b4', 'prism', { rotY: Math.PI / 2 }),
        B([-1.78, 1.55, 0], [2.4, 0.9, 0.3], '#e2d7b4', 'prism', { rotY: Math.PI / 2 }),
        // corner pinnacles, gold-tipped
        ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => B([a * 1.75, 1.5, b * 1.75], [0.34, 1.1, 0.34], '#cfae6c', 'cone4', { metal: 1 })),
      ],
    }),
    B([0, 14.35, 1.93], [2.55, 2.55, 0.22], '#f8f1da', 'clock'),
    B([0, 14.35, -1.93], [2.55, 2.55, 0.22], '#f8f1da', 'clock'),
    B([1.93, 14.35, 0], [2.55, 2.55, 0.22], '#f8f1da', 'clock', { rotY: Math.PI / 2 }),
    B([-1.93, 14.35, 0], [2.55, 2.55, 0.22], '#f8f1da', 'clock', { rotY: Math.PI / 2 }),
    // belfry: a dark core behind four arcaded screens of pointed arches
    B([0, 16.65, 0], [3.05, 1.95, 3.05], '#3d3a35', 'box', {
      adorn: [
        ...[[0, 1.46, 0], [0, -1.46, 0], [1.46, 0, Math.PI / 2], [-1.46, 0, Math.PI / 2]].map(([x, z, r]) =>
          B([x, 0, z], [3.1, 1.95, 0.14], '#d4c9a8', 'extrude', {
            rotY: r,
            outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
            holes: [-0.3, 0, 0.3].map((hx) => ({ x: hx, y: -0.06, w: 0.2, h: 0.66, arch: 'pointed' })),
          })),
      ],
    }),
    // cast-iron spire, with its four corner pinnacles
    B([0, 19.25, 0], [2.85, 3.2, 2.85], '#5a6d55', 'cone4', {
      adorn: [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => B([a * 1.25, -0.6, b * 1.25], [0.3, 2.0, 0.3], '#6f8568', 'cone4', {
        adorn: [B([0, 1.05, 0], [0.12, 0.3, 0.12], '#cfae6c', 'cyl', { metal: 1 })],
      })),
    }),
    // the Ayrton Light: a small lantern, lit when Parliament sits
    B([0, 21.2, 0], [1.1, 1.8, 1.1], '#cfae6c', 'lathe', {
      profile: [[0.8, 0], [0.8, 0.18], [0.55, 0.22], [0.55, 0.6], [0.72, 0.64], [0.3, 0.88], [0.08, 1]],
      seg: 8, metal: 1, em: '#ffd9a0', emI: 0.5,
    }),
    B([0, 22.7, 0], [0.18, 1.3, 0.18], '#e6d29e', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.55 }),
  ],

  // Tower Bridge: pale stone towers with corner turrets, saturated
  // steel-blue raised walkways with white rails + suspender rods, and
  // suspension chains that sweep up from the anchors to tower mid-height.
  towerbridge: [
    B([0, 1.55, 0], [20.7, 0.7, 3.7], '#5f6878'),
    B([-10.0, 1.95, 0], [2.2, 3.2, 4.1], '#e9e1cb', 'box', { tex: 'relief' }),
    B([10.0, 1.95, 0], [2.2, 3.2, 4.1], '#e9e1cb', 'box', { tex: 'relief' }),
    B([-5.3, 5.65, 0], [3.7, 7.9, 3.7], '#efe7d1', 'box', { tex: 'gothic' }),
    B([5.3, 5.65, 0], [3.7, 7.9, 3.7], '#efe7d1', 'box', { tex: 'gothic' }),
    B([-5.3, 10.0, 0], [4.15, 0.8, 4.15], '#f6efda', 'box', { em: '#ffd9a0', emI: 0.14 }),
    B([5.3, 10.0, 0], [4.15, 0.8, 4.15], '#f6efda', 'box', { em: '#ffd9a0', emI: 0.14 }),
    B([-5.3, 11.7, 0], [3.9, 3.1, 3.9], '#f2ead3', 'turrets', { em: '#ffd9a0', emI: 0.12 }),
    B([5.3, 11.7, 0], [3.9, 3.1, 3.9], '#f2ead3', 'turrets', { em: '#ffd9a0', emI: 0.12 }),
    // raised steel-blue walkways with white rails + suspender rods
    B([0, 8.6, 0], [7.1, 0.6, 1.8], '#4e8bc6', 'walkway', { walk: { rods: 7, drop: 1.3 }, em: '#8fb8e0', emI: 0.16, sortY: 9.6 }),
    B([0, 10.0, 0], [7.1, 0.6, 1.8], '#4e8bc6', 'walkway', { walk: { rods: 0, drop: 0 }, em: '#8fb8e0', emI: 0.16, sortY: 9.7 }),
    // suspension chains sweeping UP from anchors to tower mid-height
    B([-7.6, 6.1, 0], [5.3, 5.3, 3.3], '#4e8bc6', 'chain',
      { sortY: 10, chain: { x0: -10.05, y0: 3.6, x1: -5.2, y1: 8.45, sag: 1.0, z: 1.45, r: 0.17, deckY: 1.9, rods: 3 } }),
    B([7.6, 6.1, 0], [5.3, 5.3, 3.3], '#4e8bc6', 'chain',
      { sortY: 10, chain: { x0: 10.05, y0: 3.6, x1: 5.2, y1: 8.45, sag: 1.0, z: 1.45, r: 0.17, deckY: 1.9, rods: 3 } }),
  ],

  // London Eye: A-frame back-leaning legs, warm gold rim-light + hub glow,
  // big readable ovoid capsules mounted outboard of the rim, slow rotation.
  eye: [
    B([0, 0.7, 2.4], [6.4, 0.7, 2.6], '#767f8d'),
    // The A-frame is one piece: both raked front legs and the cross-brace.
    // The brace on its own was a short thin bar, hard to find and to drop
    // (device feedback). The two back stays are one piece likewise.
    B([0, 4.1, 1.25], [3.6, 8.9, 1.4], '#f0ece2', 'group', {
      adorn: [
        B([-1.27, 0, 0], [0.62, 8.9, 0.62], '#f0ece2', 'cyl', { rotZ: -0.3, rotX: -0.25, em: '#ffd9a0', emI: 0.16 }),
        B([1.27, 0, 0], [0.62, 8.9, 0.62], '#f0ece2', 'cyl', { rotZ: 0.3, rotX: -0.25, em: '#ffd9a0', emI: 0.16 }),
        B([0, 1.5, -0.25], [2.6, 0.24, 0.24], '#e0dcd2', 'box', { rotX: -0.25 }),
      ],
    }),
    B([0, 4.15, -1.35], [1.8, 8.6, 1.2], '#c5ccd6', 'group', {
      adorn: [
        B([-0.62, 0, 0], [0.34, 8.6, 0.34], '#c5ccd6', 'cyl', { rotZ: -0.14, rotX: 0.3 }),
        B([0.62, 0, 0], [0.34, 8.6, 0.34], '#c5ccd6', 'cyl', { rotZ: 0.14, rotX: 0.3 }),
      ],
    }),
    // The wheel is ONE piece: rim, gold rim-light ring, spokes and hub.
    // As four separate pieces, each parked at under half size, a thin ring
    // and a bundle of sticks did not read as a wheel (device feedback).
    B([0, 8.2, 0], [13.0, 13.0, 0.40], '#f4f6fa', 'torus', {
      em: '#ffd9a0', emI: 0.55, spin: 0.11,
      adorn: [
        B([0, 0, 0], [12.1, 12.1, 0.16], '#e8b45e', 'torus', { metal: 1, em: '#ffc46a', emI: 0.95 }),
        B([0, 0, 0], [12.4, 0.13, 0.13], '#d6dbe4', 'spokes', { n: 12, em: '#ffd9a0', emI: 0.3 }),
        B([0, 0, 0], [1.9, 1.5, 1.9], '#8d97a6', 'cyl', { rotX: Math.PI / 2, em: '#ffc266', emI: 1.0 }),
      ],
    }),
    // capsules: big readable ovoids mounted outboard of the rim
    ...vring(8.2, 7.35, 10, [3.0, 1.6, 1.6], '#2b93c4', 'pod', { glass: 1, op: 0.96, em: '#ffb85a', emI: 0.16, sortY: 9.5 }),
  ],

  // ================= ROME =================
  // Colosseum: travertine white-grey, warm AO inside darker arches,
  // dramatic broken-rim height jump, scaled up ~20%.
  colosseum: [
    B([0, 0.5, 0], [17.4, 1.0, 17.4], '#a9a08e', 'cyl'),
    // dark inner drum: what you see through every arch, so the arcade reads
    // as pierced stone instead of a lace curtain
    B([0, 4.1, 0], [12.4, 7.2, 12.4], '#5e5347', 'cyl', { sortY: 0.6 }),
    ...arcade(2.75, 7.7, 3.3, 8, '#e2dbcb', 'archcut', 3),
    ...arcade(6.15, 7.5, 3.3, 8, '#d6cfbd', 'archcut', 3),
    ...arcade(9.9, 7.35, 3.9, 5, '#c9c2b0', 'archcut', 2, 0.62, -0.35),
    B([6.6, 1.5, 3.8], [1.8, 1.2, 1.5], '#cfc8b8', 'rock'),
    B([-5.5, 1.4, -5.0], [1.5, 1.0, 1.4], '#c4bdac', 'rock'),
  ],

  // Trevi Fountain: arched statue niches + central triumphal arch,
  // Oceanus figure, cascading travertine rock shelf spilling into a pool
  // with stepped falls and foam rings.
  trevi: [
    B([0, 3.6, -1.7], [13.4, 7.2, 1.8], '#eadcb6', 'box', { tex: 'niche', tx: { n: 5 } }),
    B([0, 7.85, -1.7], [13.4, 1.3, 2.1], '#d2c299', 'box', { tex: 'relief' }),
    B([0, 9.25, -1.7], [0.95, 1.7, 0.75], '#f6eed6', 'statue', { em: '#ffd9a0', emI: 0.16 }),
    B([-3.5, 9.1, -1.7], [0.85, 1.45, 0.65], '#f2e9d0', 'statue'),
    B([3.5, 9.1, -1.7], [0.85, 1.45, 0.65], '#f2e9d0', 'statue'),
    // central triumphal-arch bay, projecting forward
    B([0, 3.8, -0.8], [4.9, 7.2, 1.5], '#f7edd0', 'box', { tex: 'archcut', tx: { n: 1 } }),
    B([0, 7.95, -0.8], [5.6, 1.1, 1.9], '#dfd0a8', 'box', { tex: 'relief', em: '#ffd9a0', emI: 0.12 }),
    B([-3.3, 3.5, -0.55], [2.5, 5.0, 1.0], '#efe2c2', 'colonnade', { cols: 2 }),
    B([3.3, 3.5, -0.55], [2.5, 5.0, 1.0], '#efe2c2', 'colonnade', { cols: 2 }),
    // Oceanus commanding the central niche, gold rim-lit
    B([0, 3.5, -0.1], [2.1, 4.2, 1.3], '#fdf6e4', 'statue', { em: '#ffd9a0', emI: 0.34 }),
    // cascading travertine rock shelf: wide interlocking slabs running the
    // full facade width and spilling forward into the basin
    B([-4.9, 1.0, 0.3], [4.0, 2.0, 2.2], '#c6b189', 'rock'),
    B([-1.9, 1.35, 0.75], [3.6, 2.7, 2.4], '#d3bf97', 'rock'),
    B([1.9, 1.3, 0.75], [3.6, 2.6, 2.4], '#cdb891', 'rock'),
    B([4.9, 1.0, 0.3], [4.0, 2.0, 2.2], '#c6b189', 'rock'),
    B([0, 1.95, 1.0], [3.0, 1.8, 2.0], '#dcc9a2', 'rock', { em: '#ffd9a0', emI: 0.08 }),
    // stepped falls tumbling shelf → ledge → basin, each step tipped forward
    // so they read as running water rather than stacked glass sheets
    B([0, 2.35, 1.35], [2.2, 0.9, 0.9], '#b4f0fc', 'box', { wet: 1, rotX: -0.5, em: '#d8faff', emI: 0.8, sortY: 2.6 }),
    B([-1.9, 1.75, 1.7], [1.3, 0.8, 0.8], '#9ce8f8', 'box', { wet: 1, rotX: -0.45, em: '#c8f6ff', emI: 0.7, sortY: 2.65 }),
    B([1.9, 1.75, 1.7], [1.3, 0.8, 0.8], '#9ce8f8', 'box', { wet: 1, rotX: -0.45, em: '#c8f6ff', emI: 0.7, sortY: 2.65 }),
    B([0, 1.35, 2.15], [4.6, 0.7, 0.9], '#7fd8ee', 'box', { wet: 1, rotX: -0.35, em: '#a8ecff', emI: 0.55, sortY: 2.7 }),
    B([0, 0.8, 2.7], [7.0, 0.35, 0.9], '#5fc9e2', 'box', { wet: 1, rotX: -0.2, em: '#8fe4f6', emI: 0.4, sortY: 2.8 }),
    // basin rim, pool, foam rings
    B([0, 0.6, 2.3], [11.6, 0.75, 0.75], '#ded1a8', 'arch', { rotX: Math.PI / 2 }),
    B([0, 0.42, 2.3], [9.8, 0.28, 9.8], '#2f9fc0', 'water', { em: '#4fd0ea', emI: 0.5 }),
    B([-2.0, 0.6, 2.7], [2.6, 0, 0.11], '#eafaff', 'torus', { rotX: Math.PI / 2, wet: 1, em: '#ffffff', emI: 0.8, sortY: 2.9 }),
    B([2.1, 0.6, 3.3], [1.9, 0, 0.10], '#eafaff', 'torus', { rotX: Math.PI / 2, wet: 1, em: '#ffffff', emI: 0.8, sortY: 2.9 }),
    B([0.2, 0.6, 4.5], [3.2, 0, 0.09], '#eafaff', 'torus', { rotX: Math.PI / 2, wet: 1, em: '#ffffff', emI: 0.7, sortY: 2.9 }),
  ],

  // Pantheon: unified grey-brown Roman concrete dome + rotunda with a
  // merged junction, glowing warm oculus, fluted (faceted) columns.
  pantheon: [
    B([0, 0.55, 3.0], [10.0, 1.1, 4.6], '#b8ab93'),
    B([0, 3.7, -2.4], [9.1, 7.4, 9.1], '#9d9081', 'cyl'),
    // portico in warm travertine so it separates from the grey concrete drum
    B([-2.4, 3.15, 4.2], [4.2, 4.2, 0.9], '#e0d3b4', 'colonnade', { cols: 4 }),
    B([2.4, 3.15, 4.2], [4.2, 4.2, 0.9], '#e0d3b4', 'colonnade', { cols: 4 }),
    B([0, 3.15, 2.5], [7.8, 4.2, 0.9], '#d5c8a8', 'colonnade', { cols: 5 }),
    B([0, 5.8, 3.4], [9.6, 1.2, 3.5], '#c4b79b', 'box', { em: '#ffd9a0', emI: 0.1 }),
    B([0, 7.5, 3.4], [10.0, 2.2, 3.5], '#cdc0a2', 'prism', { tex: 'relief' }),
    // stepped junction rings blending drum into dome (the real Pantheon's
    // stacked concrete offsets), all one Roman-concrete family
    B([0, 7.75, -2.4], [9.0, 1.0, 9.0], '#948779', 'cyl'),
    B([0, 8.5, -2.4], [8.2, 0.75, 8.2], '#8f8b80', 'cyl'),
    B([0, 8.9, -2.4], [7.6, 3.9, 7.6], '#8f8b80', 'dome', { em: '#ffd9a0', emI: 0.07 }),
    B([0, 12.4, -2.4], [1.9, 0.7, 1.9], '#e6cd9a', 'cyl', { metal: 1, em: '#ffce8a', emI: 1.3 }),
  ],
  // ================= SAN FRANCISCO =================
  // Golden Gate: the towers are the silhouette, so they get the height and
  // the detail — tapering lattice shafts, the two portal struts that read as
  // the rungs of a ladder from the side, and the stepped Art Deco cap. The
  // deck is deliberately plain and low so it cannot compete. Cables borrow
  // brooklyn's 'cable' block (main sag plus its own hangers) rather than the
  // chain used by Tower Bridge: this is a suspension bridge.
  // International Orange throughout; the real bridge is painted steel, so no
  // metal flag and no glass.
  ggbridge: [
    B([-6.4, 1.6, 0], [3.4, 3.2, 5.2], '#8c857a', 'box', { tex: 'relief' }),
    B([6.4, 1.6, 0], [3.4, 3.2, 5.2], '#8c857a', 'box', { tex: 'relief' }),
    // Built as the real one was: towers, then cables, then the deck HUNG
    // from them (sortY puts it after the cables' 19) — not laid first.
    B([0, 3.6, 0], [10.4, 0.5, 3.8], '#6e6a66', 'box', { sortY: 20 }),
    B([-8.6, 3.6, 0], [7.2, 0.5, 3.8], '#66625e', 'box', { sortY: 20 }),
    B([8.6, 3.6, 0], [7.2, 0.5, 3.8], '#66625e', 'box', { sortY: 20 }),
    // orange kerb rails: two thin lines that carry the colour along the deck
    B([0, 4.06, 1.85], [25.6, 0.22, 0.16], '#c1440e', 'box', { sortY: 21 }),
    B([0, 4.06, -1.85], [25.6, 0.22, 0.16], '#c1440e', 'box', { sortY: 21 }),
    // south tower
    B([-6.4, 6.0, 0], [2.4, 4.8, 4.6], '#c1440e', 'box', { tex: 'lattice' }),
    B([-6.4, 8.55, 0], [2.8, 0.55, 4.8], '#a9380c'),
    B([-6.4, 11.0, 0], [2.0, 5.2, 4.0], '#c94d16', 'box', { tex: 'lattice' }),
    B([-6.4, 13.75, 0], [2.4, 0.5, 4.2], '#a9380c'),
    B([-6.4, 15.6, 0], [1.7, 3.2, 3.4], '#d1531c', 'box', { tex: 'lattice' }),
    B([-6.4, 17.5, 0], [2.0, 0.6, 3.8], '#b23d0f'),
    B([-6.4, 18.1, 0], [1.4, 0.55, 2.8], '#e2621f', 'box', { em: '#ffb066', emI: 0.34 }),
    // north tower
    B([6.4, 6.0, 0], [2.4, 4.8, 4.6], '#c1440e', 'box', { tex: 'lattice' }),
    B([6.4, 8.55, 0], [2.8, 0.55, 4.8], '#a9380c'),
    B([6.4, 11.0, 0], [2.0, 5.2, 4.0], '#c94d16', 'box', { tex: 'lattice' }),
    B([6.4, 13.75, 0], [2.4, 0.5, 4.2], '#a9380c'),
    B([6.4, 15.6, 0], [1.7, 3.2, 3.4], '#d1531c', 'box', { tex: 'lattice' }),
    B([6.4, 17.5, 0], [2.0, 0.6, 3.8], '#b23d0f'),
    B([6.4, 18.1, 0], [1.4, 0.55, 2.8], '#e2621f', 'box', { em: '#ffb066', emI: 0.34 }),
    // main cables, hung last (sortY) so they arrive over finished towers
    B([0, 3.9, 1.6], [27.2, 0.6, 0.3], '#d8520f', 'cable',
      { sortY: 19, cable: { towerX: 6.4, topY: 17.2, midY: 5.0, endX: 13.4, endY: 3.9, deckY: 4.0, hangers: 13, r: 0.17 } }),
    B([0, 3.9, -1.6], [27.2, 0.6, 0.3], '#d8520f', 'cable',
      { sortY: 19, cable: { towerX: 6.4, topY: 17.2, midY: 5.0, endX: 13.4, endY: 3.9, deckY: 4.0, hangers: 13, r: 0.17 } }),
  ],

  // Coit Tower: a plain unpainted-concrete fluted column, pale grey-cream,
  // and NOT shaped like a fire-hose nozzle — that is a myth. The flutes are
  // real ribs now, arriving with each lift of the shaft, not a painted
  // stripe; the gallery is a ring of tall round-headed openings; and it
  // stands on the two-storey base building where the 1934 murals are.
  coit: [
    // the base building, with its arched entrance
    B([0, 1.1, 0], [6.6, 2.2, 6.6], '#c3bdae', 'box', {
      tex: 'arch', tx: { n: 5 },
      adorn: [B([0, 1.25, 0], [7.0, 0.3, 7.0], '#b7b1a4')],
    }),
    // the fluted shaft, in seven lifts, each carrying its own ribs
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const w = 3.5 - i * 0.1;
      return B([0, 3.3 + i * 2.2, 0], [w, 2.2, w], i % 2 ? '#d4cec0' : '#d2ccbd', 'cyl', {
        adorn: ring(0, 0, w / 2 + 0.02, 16, [0.12, 2.2, 0.16], '#c6c0b1'),
      });
    }),
    // corbel, then the observation gallery of tall arched openings
    // stacked flush: the shaft's last lift tops out at 17.7
    B([0, 17.95, 0], [3.2, 0.5, 3.2], '#c9c3b4', 'cyl'),
    B([0, 19.4, 0], [3.3, 2.4, 3.3], '#dcd6c6', 'cyl', { tex: 'archcut' }),
    B([0, 20.9, 0], [2.9, 0.6, 2.9], '#c9c3b4', 'cyl'),
    B([0, 21.65, 0], [2.3, 0.9, 2.3], '#d4cec0', 'cyl'),
    B([0, 22.1, 0], [2.0, 1.1, 2.0], '#dcd6c6', 'dome'),
    B([0, 24.3, 0], [0.13, 2.4, 0.13], '#efe9da', 'cyl', { metal: 1 }),
  ],

  // Painted Ladies: seven narrow houses shoulder to shoulder, each its own
  // colour, each with a bay window and a steep gable. The jagged roofline is
  // the whole picture; the colour variety is in the walls, not the roofs.
  paintedladies: [
    // body and trim colours in the spirit of Steiner Street: each house a
    // pastel with a contrasting trim, no two neighbours alike
    ...ladyHouse(-10.8, '#d8788c', '#f4ecd8', 0),
    ...ladyHouse(-7.2, '#e8c274', '#7a3a4a', 1),
    ...ladyHouse(-3.6, '#9fc4a8', '#f4ecd8', 0),
    ...ladyHouse(0, '#8fb4d4', '#e8c274', 1),
    ...ladyHouse(3.6, '#c9a8cc', '#f4ecd8', 0),
    ...ladyHouse(7.2, '#e2a07c', '#3f5a6a', 1),
    ...ladyHouse(10.8, '#cfc4b2', '#8a3a3a', 0),
  ],
  // ================= JERUSALEM =================
  // docs/cities/jerusalem.md, adapted: small details (cypresses, caper
  // plants in the joints, the minaret's balcony and cap, battlements) arrive
  // WITH a larger piece rather than as pieces of their own, and the stone uses
  // plain masonry textures. The spec's 'relief' paints robed figures, which
  // have no place on the Western Wall.

  // The Western Wall, as it is seen from the prayer plaza. One sheer, flat
  // face about three times as wide as it is tall (the first version stepped
  // back like a staircase, which the real wall does not do), in three bands
  // you can read from across the plaza: huge pale Herodian stones with
  // drafted margins at the bottom, a band of mid-sized stones, then many
  // courses of small stones at the top. Caper plants hang from the joints.
  // Above, the trees of the platform, and the gold Dome of the Rock
  // glimpsed behind on the left, as in every photograph of the place.
  // Wilson's Arch opens at the left end. Nothing modern: no bridge, no
  // scaffolding, no figures, partition or prayer notes.
  kotel: [
    B([-1.3, 0.12, 3.2], [21.8, 0.24, 5.2], '#e4dac2', 'box', { tex: 'stone', tx: { cols: 14, rows: 4 } }),   // plaza
    // Herodian courses: three rows, each in two identical halves
    // (each with its own layout of stones, so no two courses line up)
    ...[0, 1, 2].flatMap((row) => [-1, 1].map((side) => B([side * 4.5, 0.89 + row * 1.3, -row * 0.05],
      [9, 1.3, 1.2], row === 1 ? '#dccfaa' : '#d6c9a2', 'box', { tex: 'herodian', tx: { cols: 3, rows: 1, seed: row * 2 + (side > 0 ? 1 : 0) } }))),
    // the band of mid-sized stones, with the first caper plants
    ...[-1, 1].map((side) => B([side * 4.5, 4.74, -0.15], [9, 1.2, 1.2], '#cfc29c', 'box', {
      tex: 'stone', tx: { cols: 6, rows: 1 },
      adorn: [[-2.6, 0.2], [1.9, -0.1]].map(([x, y]) => B([side * x, y, 0.62], [0.7, 0.6, 0.4], '#5f8040', 'sphere')),
    })),
    // many courses of small stones at the top, thick with caper plants
    ...[-1, 1].map((side) => B([side * 4.5, 6.64, -0.2], [9, 2.6, 1.2], '#c8bb96', 'box', {
      tex: 'stone', tx: { cols: 12, rows: 4 },
      adorn: [[-3.4, 0.6, 0.9], [-1.1, -0.4, 0.7], [0.8, 0.9, 1.0], [2.9, -0.2, 0.8], [3.8, 0.8, 0.6]].flatMap(([x, y, r]) => [
        B([side * x, y, 0.64], [r, r * 0.85, 0.5], '#5f8040', 'sphere'),
        B([side * x + 0.2, y - r * 0.5, 0.66], [r * 0.6, r * 0.8, 0.4], '#4e7034', 'sphere'),   // hanging down
      ]),
    })),
    // the uneven top edge: odd stones of different heights
    B([0, 8.25, -0.25], [18, 0.6, 1.2], '#c2b490', 'box', {
      tex: 'stone', tx: { cols: 14, rows: 1 },
      adorn: [-7.6, -5.1, -2.2, 0.9, 3.4, 6.2, 8.1].map((x, i) => B([x, 0.45 + (i % 3) * 0.12, 0], [1.1 + (i % 2) * 0.6, 0.3 + (i % 3) * 0.24, 1.1], '#c2b490')),
    }),
    // Wilson's Arch, opening at the left end of the plaza
    B([-10.6, 3.3, 1.2], [3.2, 6.6, 3.6], '#d2c49e', 'archvault'),
    // above and behind: the trees of the platform, and the gold dome
    B([0, 10.0, -2.6], [20, 2.8, 3.0], '#c8b98e', 'group', {
      adorn: [
        ...[-8.2, -3.1, 1.8, 5.4, 8.6].map((x, i) => B([x, 0.3 + (i % 2) * 0.3, 0.3], [0.9, 3.4 + (i % 2) * 0.8, 0.9], '#2e4a30', 'lathe',
          { profile: [[0, 0], [0.8, 0.06], [1, 0.3], [0.75, 0.7], [0, 1]], emI: 0 })),
        ...[-0.6, 3.6, 7.0].map((x) => B([x, -0.4, 0.2], [2.0, 1.6, 1.8], '#56733c', 'sphere')),   // olive trees
        B([-5.4, -0.6, -0.8], [3.0, 1.2, 3.0], '#d8cba0', 'cyl'),                                  // the Dome's drum
        B([-5.4, 0.0, -0.8], [3.0, 2.0, 3.0], '#e8b840', 'dome', { metal: 1, em: '#ffcf5a', emI: 0.6 }),
      ],
    }),
  ],

  // The Dome of the Rock: an octagon clad in marble below and blue tilework
  // above, a round drum, and the gold dome. Four facts, one of which says it
  // is not the al-Aqsa Mosque (src/facts.js).
  domerock: [
    B([0, 0.4, 0], [12.4, 0.8, 12.4], '#c8b98e', 'cyl'),                    // podium
    octHalf(2.6, 5.2, 3.6, 0.9, '#eee3c8', { tex: 'stone' }, false),
    octHalf(2.6, 5.2, 3.6, 0.9, '#eee3c8', { tex: 'stone' }, true),
    octHalf(5.5, 5.2, 2.2, 0.9, '#3a6ea0', { tex: 'tile' }, false),
    octHalf(5.5, 5.2, 2.2, 0.9, '#3a6ea0', { tex: 'tile' }, true),
    B([0, 6.75, 0], [11.4, 11.4, 0.34], '#e8b45e', 'torus', { rotX: Math.PI / 2, metal: 1, em: '#ffc46a', emI: 0.7 }),
    B([0, 8.2, 0], [8.6, 2.7, 8.6], '#ece2c4', 'cyl', { tex: 'win', tx: { cols: 16, rows: 1 } }),
    B([0, 9.75, 0], [8.0, 0.7, 8.0], '#d8cba0', 'cyl'),
    B([0, 10.35, 0], [7.2, 0.55, 7.2], '#d2c498', 'cyl'),
    B([0, 10.62, 0], [7.6, 4.9, 7.6], '#e8b840', 'dome', {
      metal: 1, em: '#ffcf5a', emI: 0.6,
      adorn: [B([0, 4.5, 0], [0.16, 1.6, 0.16], '#f4d878', 'cyl', { metal: 1, em: '#ffe08a', emI: 0.7 })],
    }),
  ],

  // The Tower of David citadel: a squat fortress of visibly different
  // building phases, with the Ottoman minaret set off-centre on top, which is
  // what makes it read as a tower with a minaret added later.
  towerdavid: [
    // dry moat wall, with excavated foundation stones below the plaza
    B([0, 0.3, 5.2], [13.0, 0.6, 2.4], '#a89a7c', 'box', {
      tex: 'stone',
      adorn: [B([-2.6, 0.25, -0.5], [2.2, 0.9, 1.6], '#8c8064', 'rock'), B([2.4, 0.2, -0.4], [1.9, 0.8, 1.5], '#948866', 'rock')],
    }),
    B([-0.6, 2.0, 0], [8.2, 3.4, 8.0], '#c2b28e', 'box', { tex: 'stone', tx: { rough: 1 } }),   // rough ancient base
    B([-0.6, 1.6, 4.0], [3.4, 3.0, 1.8], '#d0c19a', 'archvault'),           // gate
    // stacked tower body, narrowing: the Crusader, Mamluk and Ottoman rebuilds
    B([-0.6, 5.6, 0], [7.2, 3.2, 7.0], '#cabb92', 'box', { tex: 'stone' }),
    B([-0.6, 8.9, 0], [6.2, 2.6, 6.0], '#d0c19a', 'box', {
      tex: 'stone', adorn: [B([0, -0.2, 3.05], [1.6, 1.8, 0.3], '#b8a87e', 'archvault')],
    }),
    B([-0.6, 11.1, 0], [5.4, 1.6, 5.2], '#cabb92', 'box', { tex: 'stone' }),
    // corner turrets
    B([-2.9, 9.2, 2.6], [1.7, 3.4, 1.7], '#d4c59c', 'box', {
      tex: 'stone', adorn: [-1, 1].flatMap((a) => [-1, 1].map((b) => B([a * 0.62, 1.9, b * 0.62], [0.42, 0.42, 0.42], '#d4c59c'))),
    }),
    B([2.1, 6.3, -2.6], [1.5, 3.0, 1.5], '#cec090', 'box', {
      tex: 'stone', adorn: [-1, 1].flatMap((a) => [-1, 1].map((b) => B([a * 0.54, 1.7, b * 0.54], [0.38, 0.4, 0.38], '#cec090'))),
    }),
    // parapet, with its battlements
    B([-0.6, 12.15, 0], [5.6, 0.7, 5.4], '#d8c9a0', 'box', {
      tex: 'stone',
      adorn: [-2.4, -1.2, 0, 1.2, 2.4].flatMap((u) => [
        B([u, 0.55, 2.45], [0.55, 0.45, 0.5], '#d8c9a0'), B([u, 0.55, -2.45], [0.55, 0.45, 0.5], '#d8c9a0'),
        B([2.55, 0.55, u * 0.95], [0.5, 0.45, 0.55], '#d8c9a0'), B([-2.55, 0.55, u * 0.95], [0.5, 0.45, 0.55], '#d8c9a0'),
      ]),
    }),
    // the Ottoman minaret (1655), deliberately off the tower's centre line,
    // with its balcony, cap and finial
    B([1.6, 15.5, 1.2], [0.7, 6.4, 0.7], '#e2d4ac', 'cyl', {
      tex: 'stone',
      adorn: [
        B([0, 2.0, 0], [1.3, 1.3, 0.2], '#e8dcb4', 'torus', { rotX: Math.PI / 2 }),
        B([0, 3.9, 0], [0.9, 1.3, 0.9], '#d6c8a0', 'lathe', { profile: [[1, 0], [0.95, 0.4], [0.55, 0.85], [0, 1]] }),
        B([0, 5.0, 0], [0.1, 0.9, 0.1], '#f0e4bc', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.4 }),
      ],
    }),
  ],
  // The Church of the Holy Sepulchre, from its courtyard: the Crusader front
  // of two storeys, twin arched doors below (the right one walled up) and
  // twin arched windows above; the wooden ladder that has stood on the ledge
  // over the entrance since at least the 1700s; the bell tower on the left,
  // which lost its top storey long ago; and behind, the two grey domes, the
  // great Rotunda over the tomb and the smaller Katholikon, each with its
  // cross. Facts approved 27 September 2026 (src/facts.js).
  holysepulchre: [
    B([0, 0.12, 3.0], [15, 0.24, 5.6], '#d8ccae', 'box', { tex: 'stone', tx: { cols: 10, rows: 4 } }),   // courtyard
    // the mass of the church behind its front
    B([0.5, 4.6, -5.6], [12, 9.2, 10.4], '#d0c29c', 'box', { tex: 'stone', tx: { cols: 9, rows: 8 } }),
    // front, lower storey: the twin doorways
    B([0, 2.6, 0], [9, 5.0, 1.2], '#dccfaa', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: -0.2, y: -0.08, w: 0.22, h: 0.8, arch: true }, { x: 0.2, y: -0.08, w: 0.22, h: 0.8, arch: true }],
      adorn: [
        B([-1.8, -0.4, -0.3], [1.9, 3.8, 0.2], '#4a3424'),                       // the open door, dark wood
        B([1.8, -0.4, -0.2], [1.9, 3.8, 0.4], '#cbbd96', 'box', { tex: 'stone', tx: { cols: 2, rows: 4 } }),   // walled up
      ],
    }),
    B([0, 5.35, 0.1], [9.4, 0.5, 1.5], '#e6dab8'),                              // the ledge between storeys
    // front, upper storey: twin arched windows, and the ladder
    B([0, 7.6, 0], [9, 4.0, 1.2], '#dccfaa', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: -0.2, y: 0.02, w: 0.18, h: 0.72, arch: true }, { x: 0.2, y: 0.02, w: 0.18, h: 0.72, arch: true }],
      adorn: [
        ...[-1.8, 1.8].map((x) => B([x, -0.1, -0.35], [1.6, 2.8, 0.2], '#2e3a48')),   // glass behind
        // the ladder, leaning under the right-hand window
        B([2.6, -1.05, 1.0], [0.9, 1.9, 0.5], '#7a5a36', 'group', {
          rotX: -0.25,
          adorn: [
            ...[-0.36, 0.36].map((x) => B([x, 0, 0], [0.08, 1.9, 0.08], '#7a5a36')),
            ...[-0.7, -0.3, 0.1, 0.5].map((y) => B([0, y, 0], [0.72, 0.06, 0.06], '#7a5a36')),
          ],
        }),
      ],
    }),
    // the bell tower on the left, and its upper storey with arched openings
    B([-6.2, 5.0, -0.4], [3.0, 10.0, 3.0], '#d4c6a0', 'box', { tex: 'stone', tx: { cols: 3, rows: 9 } }),
    B([-6.2, 11.6, -0.4], [2.8, 3.2, 2.8], '#dccfaa', 'box', {
      tex: 'stone', tx: { cols: 3, rows: 3 },
      adorn: [[0, 1.42], [0, -1.42], [1.42, 0], [-1.42, 0]].map(([x, z]) => B([x, 0, z], [x ? 0.1 : 1.0, 1.8, z ? 0.1 : 1.0], '#2a2620')),
    }),
    // a chapel on the right with its small dome
    B([6.2, 2.8, -0.6], [3.2, 5.6, 3.2], '#d4c6a0', 'box', {
      tex: 'stone', tx: { cols: 3, rows: 5 },
      adorn: [B([0, 2.8, 0], [2.4, 1.3, 2.4], '#9aa0a6', 'dome')],
    }),
    // the Katholikon's drum and dome, with its cross
    B([3.0, 10.4, -5.0], [4.2, 2.2, 4.2], '#d8caa4', 'cyl', { tex: 'win', tx: { cols: 10, rows: 1 } }),
    B([3.0, 11.5, -5.0], [4.4, 2.4, 4.4], '#8e949a', 'dome', {
      adorn: [
        B([0, 2.5, 0], [0.12, 1.1, 0.12], '#d8c070', 'box', { metal: 1 }),
        B([0, 2.75, 0], [0.6, 0.1, 0.1], '#d8c070', 'box', { metal: 1 }),
      ],
    }),
    // the great Rotunda over the tomb: drum, grey dome, lantern and cross
    B([-3.4, 10.6, -8.0], [8.2, 2.8, 8.2], '#d8caa4', 'cyl', { tex: 'win', tx: { cols: 18, rows: 1 } }),
    B([-3.4, 12.0, -8.0], [8.6, 5.0, 8.6], '#9298a0', 'dome', {
      adorn: [
        B([0, 4.6, 0], [1.2, 1.0, 1.2], '#d8caa4', 'cyl'),
        B([0, 5.7, 0], [0.14, 1.4, 0.14], '#d8c070', 'box', { metal: 1 }),
        B([0, 6.0, 0], [0.8, 0.12, 0.12], '#d8c070', 'box', { metal: 1 }),
      ],
    }),
  ],
  // ================= MEXICO CITY =================
  // docs/cities/mexico-city.md, adapted like Jerusalem's: small details come
  // with a larger piece, and stone uses the plain masonry textures (the
  // spec's 'relief' and 'statue' draw robed human figures).

  // The Templo Mayor: a stepped platform of square tiers, each a sloping
  // talud under a vertical tablero band, with the double staircase up the
  // west face and the twin shrines on top: Tlaloc's, blue and white, on the
  // left (north) and Huitzilopochtli's, red, on the right (south).
  templomayor: [
    B([0, 0.2, 0], [17, 0.4, 17], '#8a8070', 'box', { tex: 'stone', tx: { cols: 12, rows: 1 } }),
    ...[[14.0, 12.4], [12.0, 10.4], [10.0, 8.4], [8.0, 6.6]].map(([bot, top], i) => B([0, 1.2 + i * 1.7, 0], [bot, 1.2, top], ['#8a7c68', '#8f8270', '#948878', '#9a8e7e'][i], 'tier', {
      sides: 4,
      adorn: [B([0, 0.85, 0], [top + 0.2, 0.5, top + 0.2], ['#a2947e', '#a69884', '#aa9c88', '#aea08c'][i], 'box', { tex: 'stone', tx: { cols: 8, rows: 1 } })],
    })),
    B([0, 8.05, -0.3], [6.4, 0.5, 6.0], '#a4987e', 'box', { tex: 'stone', tx: { cols: 6, rows: 1 } }),   // summit platform
    // the double staircase: two flights side by side, each a stepped profile.
    // The extrusion depth is each flight's width once turned: 4.2 made the two
    // overlap by 1.6 m, and the blue and red fought over the same faces
    // (device feedback, 15 October 2026: the colours flickered).
    ...[[-1.3, '#3a6a9a'], [1.3, '#b0402a']].map(([x, col]) => B([x, 4.0, 5.2], [2.4, 7.6, 2.5], col, 'extrude', {
      rotY: -Math.PI / 2,
      outline: (() => {
        const pts = [[0.5, -0.5]];
        for (let k = 0; k < 10; k++) { const y = -0.5 + (k + 1) / 10, z = 0.5 - (k + 1) / 10; pts.push([z + 0.1, y - 0.1], [z, y - 0.1]); }
        pts.push([-0.5, 0.5], [-0.5, -0.5]);
        return pts.map(([zz, yy]) => [zz, Math.min(0.5, yy + 0.1)]);
      })(),
      // a serpent head at the foot of each flight, in stone
      adorn: [B([0.9, -3.4, 0.7], [0.9, 0.8, 1.2], '#8f8270', 'rock')],
    })),
    // the two shrines, each with its roof and roof comb
    B([-1.6, 9.7, -0.6], [2.8, 2.8, 3.2], '#eae0c8', 'box', {
      adorn: [
        B([0, 0.6, 1.62], [2.8, 0.6, 0.05], '#3a6a9a'), B([0, -0.6, 1.62], [0.9, 1.6, 0.05], '#1e2430'),
        B([0, 1.55, 0], [3.1, 0.3, 3.5], '#dcd0ae'), B([0, 2.2, 0], [2.4, 1.0, 0.3], '#3a6a9a'),
      ],
    }),
    B([1.6, 9.7, -0.6], [2.8, 2.8, 3.2], '#c1432a', 'box', {
      adorn: [
        B([0, -0.6, 1.62], [0.9, 1.6, 0.05], '#1e2430'),
        B([0, 1.55, 0], [3.1, 0.3, 3.5], '#a83a24'), B([0, 2.2, 0], [2.4, 1.0, 0.3], '#c1432a', 'box', { em: '#ffb070', emI: 0.1 }),
      ],
    }),
  ],

  // The Metropolitan Cathedral: a wide pale facade with three arched
  // portals and a central clock storey, twin bell towers narrowing up to
  // their bell-shaped roofs and crosses, and the tiled dome behind.
  catedral: [
    B([0, 0.3, 1.0], [20, 0.6, 9], '#c4b494', 'box', { tex: 'stone', tx: { cols: 14, rows: 1 } }),
    B([-8.4, 3.8, -1.5], [3.2, 6.4, 7], '#d8d2c4', 'box', { tex: 'stone', tx: { cols: 3, rows: 5 } }),   // flanks
    B([8.4, 3.8, -1.5], [3.2, 6.4, 7], '#d8d2c4', 'box', { tex: 'stone', tx: { cols: 3, rows: 5 } }),
    B([0, 4.1, 0], [6.6, 7.0, 1.4], '#e6d8b6', 'extrude', {                      // three portals, between the towers
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: -0.32, y: -0.16, w: 0.17, h: 0.56, arch: true }, { x: 0, y: -0.1, w: 0.22, h: 0.68, arch: true }, { x: 0.32, y: -0.16, w: 0.17, h: 0.56, arch: true }],
      adorn: [B([0, -0.6, -0.4], [6.2, 5.6, 0.2], '#3a2e24')],
    }),
    B([0, 9.0, 0], [5.6, 2.8, 1.4], '#ddd0ae', 'box', {                          // the clock storey
      tex: 'stone', tx: { cols: 4, rows: 2 },
      adorn: [B([0, 0.3, 0.72], [1.1, 1.1, 0.1], '#f4ecd4', 'cyl', { rotX: Math.PI / 2 }), B([0, 1.8, 0], [0.8, 0.9, 0.8], '#d8caa4', 'box')],
    }),
    ...[-5.1, 5.1].flatMap((x) => [
      B([x, 6.2, 0], [3.6, 11.2, 3.6], '#d4c9a8', 'box', { tex: 'stone', tx: { cols: 3, rows: 9 } }),   // tower body
      B([x, 13.3, 0], [3.1, 3.0, 3.1], '#dcd0b0', 'box', {                                            // belfry
        adorn: [[0, 1.57], [0, -1.57], [1.57, 0], [-1.57, 0]].map(([ax, az]) => B([ax, -0.1, az], [ax ? 0.1 : 1.3, 2.0, az ? 0.1 : 1.3], '#2a2420')),
      }),
      B([x, 15.8, 0], [2.8, 2.0, 2.8], '#b8a880', 'lathe', {                                           // bell-shaped roof
        profile: [[1, 0], [0.98, 0.25], [0.7, 0.55], [0.35, 0.75], [0.22, 0.95], [0, 1]],
        adorn: [B([0, 1.45, 0], [0.12, 0.9, 0.12], '#e6d29e', 'box', { metal: 1 }), B([0, 1.6, 0], [0.55, 0.1, 0.1], '#e6d29e', 'box', { metal: 1 })],
      }),
    ]),
    B([0, 8.6, -5.0], [5.4, 2.4, 5.4], '#c8baa0', 'cyl', { tex: 'win', tx: { cols: 12, rows: 1 } }),   // dome drum
    B([0, 9.8, -5.0], [5.6, 3.6, 5.6], '#e0c070', 'dome', {                                              // tiled dome
      adorn: [B([0, 3.3, 0], [0.9, 1.2, 0.9], '#e6cd9a', 'cyl', { em: '#ffce8a', emI: 0.8 })],
    }),
  ],

  // Chapultepec Castle on its hill: two storeys of pale palace with wings,
  // the arcaded gallery along the terrace, and the Caballero Alto tower
  // with its flag. Only the 1860s exterior (docs/cities/mexico-city.md §0).
  castillo: [
    B([0, 1.4, 0], [22, 2.8, 14], '#6a7a4e', 'lathe', { profile: [[1, 0], [0.95, 0.35], [0.8, 0.75], [0.7, 1]] }),   // the hill
    B([0, 3.1, 0], [16, 0.6, 9], '#b8a888', 'box', { tex: 'stone', tx: { cols: 12, rows: 1 } }),                     // terrace
    B([-5.4, 5.2, -1.0], [5.6, 3.6, 5], '#e8dcc0', 'box', { tex: 'win', tx: { cols: 5, rows: 2 },
      adorn: [B([0, 1.95, 0], [5.8, 0.3, 5.2], '#c4a878')] }),
    B([5.4, 5.2, -1.0], [5.6, 3.6, 5], '#e8dcc0', 'box', { tex: 'win', tx: { cols: 5, rows: 2 },
      adorn: [B([0, 1.95, 0], [5.8, 0.3, 5.2], '#c4a878')] }),
    B([0, 5.4, -0.4], [5.4, 4.0, 5.4], '#ecdfc4', 'box', { tex: 'win', tx: { cols: 4, rows: 2 },
      adorn: [B([0, 2.15, 0], [5.6, 0.3, 5.6], '#d5c8a8')] }),
    B([0, 4.9, 3.6], [15.6, 3.0, 1.4], '#f0e6cc', 'colonnade', { cols: 12,                    // the gallery
      adorn: [B([0, 1.7, 0], [15.8, 0.4, 1.8], '#c4a878')] }),
    B([4.0, 8.9, -1.5], [2.6, 3.0, 2.6], '#e0d3b4', 'box', { tex: 'win', tx: { cols: 2, rows: 2 } }),            // Caballero Alto
    B([4.0, 11.0, -1.5], [2.2, 1.2, 2.2], '#f2ead3', 'box', {
      adorn: [
        ...[-1, 1].flatMap((a) => [-1, 1].map((b) => B([a * 0.9, 0.8, b * 0.9], [0.4, 0.4, 0.4], '#f2ead3'))),
        B([0, 2.0, 0], [0.08, 2.8, 0.08], '#cfcfcf', 'cyl', { metal: 1 }),
        ...[['#2e7d4a', 0.24], ['#f4f4f0', 0.6], ['#c8202e', 0.96]].map(([c, x]) => B([x, 2.9, 0], [0.36, 0.7, 0.04], c)),
      ],
    }),
  ],
  // ================= MARRAKECH =================
  // All three are Almohad or Saadian work, centuries old: no copyright
  // question. Stone and plaster colours are the city's red-pink earth.

  // The Koutoubia minaret: a square shaft about one fifth as wide as it is
  // tall, its faces carved with arches and a lozenge net (sebka) that grows
  // busier towards the top, a band of turquoise tile under stepped merlons,
  // then the small lantern tower, its dome, and the spire of copper balls.
  // Street 1: about a dozen pieces.
  koutoubia: [
    B([0, 0.3, 0], [7.2, 0.6, 7.2], '#a88468', 'box', { tex: 'stone' }),
    B([0, 1.75, 0], [4.4, 2.3, 4.4], '#bc845e', 'box', { tex: 'stone', tx: { cols: 4, rows: 3 } }),
    B([0, 4.05, 0], [4.4, 2.3, 4.4], '#c08660', 'box', { tex: 'stone', tx: { cols: 4, rows: 3 } }),
    B([0, 7.2, 0], [4.4, 4.0, 4.4], '#c48a62', 'box', { tex: 'arch', tx: { n: 2 } }),
    B([0, 11.2, 0], [4.4, 4.0, 4.4], '#c68c64', 'box', { tex: 'sebka', tx: { n: 3 } }),
    B([0, 15.2, 0], [4.4, 4.0, 4.4], '#c88e66', 'box', { tex: 'sebka', tx: { n: 4 } }),
    B([0, 17.6, 0], [4.5, 0.8, 4.5], '#2e8a86', 'box', { tex: 'tile' }),
    B([0, 18.5, 0], [4.6, 1.0, 4.6], '#c48a62', 'group', {
      adorn: [
        B([0, -0.3, 0], [4.6, 0.4, 4.6], '#c48a62'),
        ...[-1.8, -0.6, 0.6, 1.8].flatMap((x) => [
          B([x, 0.2, 2.1], [0.5, 0.6, 0.3], '#c88e66', 'pyramid'), B([x, 0.2, -2.1], [0.5, 0.6, 0.3], '#c88e66', 'pyramid'),
          B([2.1, 0.2, x], [0.3, 0.6, 0.5], '#c88e66', 'pyramid'), B([-2.1, 0.2, x], [0.3, 0.6, 0.5], '#c88e66', 'pyramid'),
        ]),
      ],
    }),
    B([0, 20.2, 0], [1.8, 2.4, 1.8], '#c88e66', 'box', { tex: 'sebka', tx: { n: 1 } }),
    B([0, 21.6, 0], [1.9, 0.4, 1.9], '#2e8a86', 'box', { tex: 'tile' }),
    B([0, 22.25, 0], [1.6, 0.9, 1.6], '#3a8a6a', 'dome'),
    B([0, 23.75, 0], [0.9, 2.2, 0.9], '#d8b04a', 'group', {
      adorn: [
        B([0, 0, 0], [0.1, 2.2, 0.1], '#c8a040', 'cyl', { metal: 1 }),
        B([0, -0.6, 0], [0.62, 0.62, 0.62], '#e0b84e', 'sphere', { metal: 1, em: '#ffd070', emI: 0.3 }),
        B([0, 0.05, 0], [0.48, 0.48, 0.48], '#e0b84e', 'sphere', { metal: 1, em: '#ffd070', emI: 0.3 }),
        B([0, 0.6, 0], [0.34, 0.34, 0.34], '#e0b84e', 'sphere', { metal: 1, em: '#ffd070', emI: 0.3 }),
      ],
    }),
  ],

  // Bab Agnaou: the carved stone gate of the royal kasbah. A horseshoe arch
  // under bands of carved stone, set in a rectangular frame with an
  // inscription band across the top, between walls of rammed red earth.
  // Street 2: about eighteen pieces; the carving goes on piece by piece.
  babagnaou: [
    B([0, 0.2, 0], [20, 0.4, 5], '#9a7a62', 'box', { tex: 'stone' }),
    B([0, 0.55, 2.0], [4.0, 0.3, 1.2], '#8a6c54', 'box', { tex: 'stone' }),          // threshold step
    ...[-1, 1].flatMap((sx) => [
      B([sx * 7.4, 1.9, -0.4], [5.6, 3.0, 1.8], '#c06648', 'box', { tex: 'stone', tx: { cols: 4, rows: 2, rough: 1 } }),
      B([sx * 7.4, 4.9, -0.4], [5.6, 3.0, 1.8], '#c46a4c', 'box', { tex: 'stone', tx: { cols: 4, rows: 2, rough: 1 } }),
      B([sx * 7.4, 6.75, -0.4], [5.6, 0.7, 1.0], '#c46a4c', 'group', {
        adorn: [-2.1, -0.7, 0.7, 2.1].map((x) => B([x, 0, 0], [0.6, 0.7, 1.0], '#c46a4c', 'pyramid')),
      }),
    ]),
    B([0, 3.4, -0.6], [3.2, 5.8, 0.2], '#3a2a20'),                                    // the dark passage
    B([0, 4.4, 0], [9.0, 8.0, 2.0], '#b08c6a', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.12, w: 0.36, h: 0.72, arch: 'horseshoe' }],
    }),
    B([0, 4.41, 1.05], [5.2, 2.6, 0.5], '#d4aa7a', 'arch'),                           // inner carved band
    B([0, 4.42, 1.15], [6.2, 3.1, 0.3], '#9a7454', 'arch'),                           // outer carved band
    B([-3.6, 6.5, 1.15], [0.4, 2.2, 0.3], '#d4aa7a'),                                 // the frame
    B([3.6, 6.5, 1.15], [0.4, 2.2, 0.3], '#d4aa7a'),
    B([0, 7.9, 1.15], [7.6, 0.7, 0.3], '#6a4a34', 'box', {                           // inscription band
      adorn: [B([0, 0, 0.12], [6.8, 0.3, 0.1], '#e0c08a', 'box', { em: '#ffd8a0', emI: 0.1 })],
    }),
    B([0, 8.5, 0], [9.2, 0.6, 2.2], '#a8845e'),
    B([0, 9.2, 0], [9.2, 0.8, 1.2], '#b08c6a', 'group', {
      adorn: [-3.6, -1.8, 0, 1.8, 3.6].map((x) => B([x, 0, 0], [0.7, 0.8, 1.2], '#b08c6a', 'pyramid')),
    }),
  ],

  // The Ben Youssef Madrasa, seen from inside its courtyard: the long pool
  // on a marble floor, cedar-and-stucco galleries down both sides with the
  // students' rooms above, green-tiled eaves, and the prayer hall's great
  // arch at the far end over a band of zellige tile.
  // Street 3: about two dozen pieces, the galleries in bays.
  benyoussef: [
    B([-4.25, 0.2, 0], [8.5, 0.4, 13], '#e6e0d2', 'box', { tex: 'stone', tx: { cols: 6, rows: 8 } }),
    B([4.25, 0.2, 0], [8.5, 0.4, 13], '#e2dccc', 'box', { tex: 'stone', tx: { cols: 6, rows: 8 } }),
    B([0, 0.45, 1.2], [4.0, 0.2, 8.0], '#cfc6b2'),                                       // the pool's rim
    B([0, 0.6, 1.2], [3.4, 0.3, 7.4], '#5cc0dc', 'box', { wet: 1, em: '#9ce4f4', emI: 0.4 }),
    B([0, 0.9, 5.4], [1.2, 0.6, 1.2], '#e6e0d2', 'cyl'),                                 // the basin
    ...[-1, 1].flatMap((sx) => [
      B([sx * 6.8, 0.8, 0.6], [1.7, 0.8, 10.05], '#2e7a5a', 'box', { tex: 'tile' }),     // zellige dado
      B([sx * 6.8, 2.4, -1.9], [1.6, 4.0, 5], '#ece2cc', 'box', { tex: 'arch', tx: { n: 3 } }),
      B([sx * 6.8, 2.4, 3.1], [1.6, 4.0, 5], '#ece2cc', 'box', { tex: 'arch', tx: { n: 3 } }),
      B([sx * 6.8, 4.55, 0.6], [1.7, 0.3, 10.05], '#7a4a2a'),                            // cedar beam
      B([sx * 6.8, 5.9, -1.9], [1.6, 2.4, 5], '#e2d4b4', 'box', { tex: 'win', tx: { cols: 3, rows: 1, lit: '#e8b070' } }),
      B([sx * 6.8, 5.9, 3.1], [1.6, 2.4, 5], '#e2d4b4', 'box', { tex: 'win', tx: { cols: 3, rows: 1, lit: '#e8b070' } }),
      B([sx * 6.8, 7.6, -1.9], [2.2, 1.0, 5.2], '#2e7a5a', 'prism'),
      B([sx * 6.8, 7.6, 3.1], [2.2, 1.0, 5.2], '#2e7a5a', 'prism'),
    ]),
    B([0, 3.4, -6.1], [3.4, 5.4, 0.2], '#4a3424'),                                       // the prayer hall, dark within
    B([0, 4.2, -5.6], [10, 8.0, 1.0], '#eadfc6', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.08, w: 0.34, h: 0.7, arch: 'horseshoe' }],
    }),
    B([-3.4, 1.25, -5.0], [3.0, 1.8, 0.1], '#2e7a5a', 'box', { tex: 'tile', sortY: 4.3 }),
    B([3.4, 1.25, -5.0], [3.0, 1.8, 0.1], '#2e7a5a', 'box', { tex: 'tile', sortY: 4.3 }),
    B([0, 7.2, -5.0], [10, 1.2, 0.1], '#7a4a2a', 'box', { tex: 'sebka', tx: { n: 8 } }),
    B([0, 8.7, -5.6], [10.8, 1.0, 2.0], '#2e7a5a', 'prism'),
  ],
  // ================= DELHI =================
  // The Red Fort (1639-48) and the Qutub Minar (from 1199) are centuries
  // old. India Gate (1931) was designed by Edwin Lutyens, who died in 1944:
  // out of copyright in India since 2005 (life + 60) and in the UK since
  // 2015 (life + 70); the United States does not protect buildings
  // completed before 1990.

  // The Red Fort's Lahori Gate: a red sandstone gatehouse with a pointed
  // arch, two octagonal towers each topped by a domed pavilion (chhatri),
  // a row of small white chhatris along the top, and the battlemented
  // walls either side. Street 1: about a dozen pieces.
  lahori: [
    ...[-1, 1].flatMap((sx) => [
      B([sx * 8.2, 3.0, -0.6], [6.4, 6.0, 2.4], '#b04e38', 'box', { tex: 'stone', tx: { cols: 5, rows: 4, rough: 1 } }),
      B([sx * 8.2, 6.4, -0.6], [6.4, 0.8, 1.2], '#b85640', 'group', {
        adorn: [-2.6, -1.3, 0, 1.3, 2.6].map((x) => B([x, 0, 0], [0.7, 0.8, 1.2], '#b85640', 'dome')),
      }),
    ]),
    B([0, 3.4, -0.8], [3.0, 5.4, 0.2], '#2e2420'),                                       // the dark passage
    B([0, 4.5, 0], [8.0, 9.0, 3.0], '#bc5a40', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.15, w: 0.34, h: 0.62, arch: 'pointed' }],
    }),
    B([0, 4.0, 1.55], [3.6, 6.4, 0.15], '#ece4d4', 'extrude', {                         // white marble frame
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.07, w: 0.76, h: 0.86, arch: 'pointed' }],
    }),
    ...[-1, 1].map((sx) => B([sx * 4.6, 5.5, 0.6], [2.6, 11, 2.3], '#c46446', 'tier', {
      sides: 8, tex: 'stone', tx: { cols: 8, rows: 8 },
    })),
    ...[-1, 1].map((sx) => B([sx * 4.6, 12.3, 0.6], [2.4, 2.6, 2.4], '#ece4d4', 'group', {
      adorn: [
        ...[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, z]) => B([x, -0.5, z], [0.18, 1.4, 0.18], '#ece4d4')),
        B([0, 0.25, 0], [2.2, 0.2, 2.2], '#e0d6c4'),
        B([0, 0.35, 0], [1.8, 1.0, 1.8], '#f4f0e8', 'dome', { adorn: [B([0, 1.0, 0], [0.12, 0.5, 0.12], '#d8b04a', 'cyl', { metal: 1 })] }),
      ],
    })),
    B([0, 9.5, 0.2], [8.2, 1.4, 1.6], '#ece4d4', 'group', {                            // the row of little chhatris
      adorn: [-3.3, -2.2, -1.1, 0, 1.1, 2.2, 3.3].flatMap((x) => [
        B([x, -0.35, 0], [0.7, 0.6, 0.7], '#e8e0d0'),
        B([x, 0.0, 0], [0.62, 0.6, 0.62], '#f4f0e8', 'dome'),
      ]),
    }),
  ],

  // The Qutub Minar: five storeys of fluted red sandstone and white marble,
  // tapering from a wide base to a narrow top, each storey ringed by a
  // carved balcony on stone brackets; the iron pillar stands nearby.
  // Street 2: about eighteen pieces.
  qutub: [
    B([0, 0.3, 0], [16, 0.6, 11], '#9a8a76', 'box', { tex: 'stone' }),
    B([0, 0.8, 0], [7.4, 0.4, 7.4], '#a8604a', 'cyl'),                                   // the base step
    B([0, 2.75, 0], [6.0, 3.5, 5.45], '#b0583e', 'tier', { tex: 'flute', tx: { n: 16 } }),
    B([0, 4.5, 0], [5.6, 0.4, 5.6], '#d89070', 'cyl'),                                    // a band of carved script
    B([0, 6.25, 0], [5.45, 3.5, 4.9], '#b25a40', 'tier', { tex: 'flute', tx: { n: 16 } }),
    B([0, 8.25, 0], [4.9, 0.5, 5.6], '#c87050', 'tier'),                                  // balcony 1, on its brackets
    B([0, 9.75, 0], [4.6, 2.5, 4.3], '#b65c42', 'tier', { tex: 'flute', tx: { n: 14 } }),
    B([0, 11.0, 0], [4.4, 0.35, 4.4], '#d89070', 'cyl'),
    B([0, 12.25, 0], [4.3, 2.5, 4.0], '#b85e44', 'tier', { tex: 'flute', tx: { n: 14 } }),
    B([0, 13.75, 0], [4.0, 0.5, 4.7], '#c87050', 'tier'),                                 // balcony 2
    B([0, 15.0, 0], [3.8, 2.0, 3.55], '#ba6046', 'tier', { tex: 'flute', tx: { n: 12 } }),
    B([0, 17.0, 0], [3.55, 2.0, 3.3], '#bc6248', 'tier', { tex: 'flute', tx: { n: 12 } }),
    B([0, 18.25, 0], [3.3, 0.5, 4.0], '#c87050', 'tier'),                                 // balcony 3
    B([0, 20.0, 0], [3.1, 3.0, 2.7], '#ece6da', 'tier', {                                // marble, with sandstone bands
      adorn: [B([0, 0.4, 0], [2.95, 0.3, 2.95], '#c06a4c', 'cyl'), B([0, -0.8, 0], [3.05, 0.3, 3.05], '#c06a4c', 'cyl')],
    }),
    B([0, 21.75, 0], [2.7, 0.5, 3.3], '#c87050', 'tier'),                                 // balcony 4
    B([0, 23.25, 0], [2.6, 2.5, 2.2], '#c06a4c', 'tier', {
      adorn: [B([0, 0.2, 0], [2.45, 0.6, 2.45], '#ece6da', 'cyl')],
    }),
    B([0, 24.85, 0], [2.4, 0.7, 2.4], '#d8d0c0', 'group', {                              // the railing at the top
      adorn: [B([0, -0.25, 0], [2.4, 0.2, 2.4], '#d0c4b0', 'cyl'), B([0, 0.1, 0], [2.2, 0.12, 0.12], '#d8d0c0', 'torus', { rotX: Math.PI / 2 })],
    }),
    B([6.0, 3.95, 2.6], [0.6, 6.7, 0.6], '#4a3e36', 'cyl', {                             // the iron pillar
      metal: 1, adorn: [B([0, 3.2, 0], [0.8, 0.4, 0.8], '#5a4c42', 'cyl', { metal: 1 })],
    }),
  ],

  // India Gate: the great arch of buff sandstone on a red sandstone base,
  // the deep cornice, the stepped attic carrying INDIA across its face, and
  // the shallow bowl on top. Street 3: about two dozen pieces.
  indiagate: [
    B([0, 0.25, 0], [20, 0.5, 11], '#a85a40', 'box', { tex: 'stone' }),
    B([0, 0.75, 0], [16, 0.5, 8], '#b06248', 'box', { tex: 'stone' }),
    ...[-1, 1].flatMap((sx) => [
      B([sx * 4.75, 3.0, 0], [4.5, 4.0, 6], '#d6be96', 'box', { tex: 'stone', tx: { cols: 3, rows: 4 } }),
      B([sx * 4.75, 7.0, 0], [4.5, 4.0, 6], '#d8c098', 'box', { tex: 'stone', tx: { cols: 3, rows: 4 } }),
      B([sx * 4.75, 5.0, 3.06], [3.4, 6.6, 0.15], '#c8ae86', 'box', { tex: 'niche', tx: { n: 1 }, sortY: 9.05 }),
      B([sx * 4.75, 5.0, -3.06], [3.4, 6.6, 0.15], '#c8ae86', 'box', { tex: 'niche', tx: { n: 1 }, sortY: 9.05 }),
      B([sx * 4.75, 9.2, 0], [4.9, 0.4, 6.4], '#e4d0aa', 'box', { sortY: 9.1 }),          // impost moulding
    ]),
    B([0, 12.2, 0], [14, 6.0, 6], '#dac29c', 'extrude', {                               // the arch and its crown
      outline: (() => {
        const pts = [[-0.5, -0.5]];
        for (let k = 0; k <= 16; k++) {
          const a = Math.PI - (k / 16) * Math.PI;
          pts.push([Math.cos(a) * 2.5 / 14, -0.5 + Math.sin(a) * 2.5 / 6]);
        }
        pts.push([0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]);
        return pts;
      })(),
    }),
    B([0, 13.6, 3.06], [8.0, 1.4, 0.15], '#ecdcb8', 'box', {                           // the INDIA panel
      adorn: [-2.0, -1.0, 0, 1.0, 2.0].map((x) => B([x, 0, 0.05], [0.5, 0.8, 0.06], '#8a7458')),
    }),
    B([0, 15.5, 0], [14.8, 0.6, 6.8], '#e4d0aa'),                                        // the cornice
    B([0, 16.6, 0], [12.0, 1.6, 5.2], '#d6be96', 'box', { tex: 'stone' }),               // the attic, stepping in
    B([0, 18.1, 0], [9.6, 1.4, 4.4], '#d8c098', 'box', { tex: 'stone' }),
    B([0, 19.4, 0], [7.2, 1.2, 3.6], '#dac29c'),
    B([0, 20.4, 0], [2.8, 0.8, 4.2], '#e4d0aa', 'tier'),                                 // the shallow bowl
    ...[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz]) => B([sx * 7.4, 2.4, sz * 3.4], [0.5, 3.2, 0.5], '#3a3a40', 'cyl', {
      metal: 1, adorn: [B([0, 1.7, 0], [0.5, 0.5, 0.5], '#fff2c0', 'sphere', { em: '#ffe9a0', emI: 1.2 })],
    })),
  ],
  // ================= BANGKOK =================
  // All three are 18th and 19th-century royal or religious buildings: no
  // copyright question. The Giant Swing's timbers were replaced to the old
  // design in 2007. Shown as buildings only: no Buddha images, and nothing
  // said about the monarchy (docs/BANGKOK-FACTS-DRAFT.md).

  // The Giant Swing: two tall red teak pillars on a stepped white stone
  // base, joined by a carved crossbeam with upturned ends, braced by
  // struts at the foot. Street 1: about a dozen pieces.
  giantswing: [
    B([0, 0.3, 0], [12, 0.6, 7], '#d8d0c0', 'box', { tex: 'stone' }),
    B([0, 0.85, 0], [9, 0.5, 4.4], '#e8e2d4', 'box', { tex: 'stone' }),
    B([0, 0.85, 3.0], [3, 0.5, 1.6], '#e0d8c8', 'box', { tex: 'stone' }),                // steps
    ...[-1, 1].flatMap((sx) => [
      B([sx * 3.2, 4.6, 0], [0.9, 7.0, 0.9], '#c8282a', 'cyl'),
      B([sx * 3.2, 11.6, 0], [0.8, 7.0, 0.8], '#cc2c2c', 'cyl'),
      B([sx * 3.9, 2.3, 0], [0.3, 2.8, 0.3], '#b82424', 'box', { rotZ: sx * 0.5 }),       // a strut at the foot
    ]),
    B([0, 7.6, 0], [6.4, 0.4, 0.5], '#b82424'),                                           // a lower tie beam
    B([0, 15.4, 0], [9.0, 0.6, 0.9], '#c8282a', 'box', {                                  // the crossbeam
      adorn: [-1, 1].map((sx) => B([sx * 4.7, 0.4, 0], [0.6, 1.0, 0.6], '#c8282a', 'cone4', { rotZ: -sx * 0.6 })),
    }),
    B([0, 16.1, 0], [7.4, 0.8, 0.5], '#e0b040', 'box', {                                  // its carved, gilded crest
      metal: 1, em: '#ffd070', emI: 0.2,
      adorn: [-2.4, -1.2, 0, 1.2, 2.4].map((x) => B([x, 0.5, 0], [0.5, 0.5, 0.3], '#e0b040', 'pyramid', { metal: 1 })),
    }),
  ],

  // Wat Arun: the central prang on three steep terraces, its tiers crusted
  // with coloured porcelain, four smaller prangs at the corners, and steep
  // stairs up each face. Street 2: about twenty pieces.
  watarun: [
    B([0, 0.4, 0], [18, 0.8, 18], '#d8d0c0', 'box', { tex: 'stone' }),
    B([0, 1.5, 0], [12, 1.4, 12], '#e4dccc', 'tier', { sides: 4, tex: 'tile', tx: {} }),
    B([0, 3.2, 0], [9.6, 2.0, 9.6], '#e8e0d0', 'tier', { sides: 4 }),
    B([0, 5.2, 0], [7.2, 2.0, 7.2], '#ece4d4', 'tier', { sides: 4 }),
    ...[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([x, z]) => B([x * 5.0, 3.0, z * 5.0], [1.6, 4.4, 2.4], '#dcd2c0', 'prism', {
      rotY: x ? Math.PI / 2 : 0, sortY: 6.3,                                             // steep stairs, one per face
    })),
    B([0, 7.5, 0], [5.6, 2.6, 4.8], '#d8c8b0', 'tier', { sides: 8, tex: 'tile' }),
    B([0, 10.0, 0], [4.8, 2.4, 4.0], '#e0d0b8', 'tier', { sides: 8, tex: 'niche', tx: { n: 4 } }),
    B([0, 12.3, 0], [4.0, 2.2, 3.2], '#e4d4bc', 'tier', { sides: 8, tex: 'tile' }),
    B([0, 14.6, 0], [3.2, 2.4, 2.0], '#e8d8c0', 'tier', { sides: 8, tex: 'tile' }),
    B([0, 17.0, 0], [2.0, 2.4, 0.6], '#ecdcc4', 'tier', { sides: 8 }),
    B([0, 18.9, 0], [0.5, 1.4, 0.5], '#e0b040', 'group', {                                // the spire's top
      adorn: [B([0, 0, 0], [0.16, 1.4, 0.16], '#e0b040', 'cyl', { metal: 1 }), B([0, -0.4, 0], [0.45, 0.2, 0.45], '#e0b040', 'cyl', { metal: 1 })],
    }),
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([x, z]) => B([x * 6.8, 4.4, z * 6.8], [2.4, 7.2, 2.4], '#e0d4c0', 'group', {
      adorn: [
        B([0, -2.8, 0], [2.4, 1.6, 2.0], '#e4dccc', 'tier', { sides: 4 }),
        B([0, -0.6, 0], [1.8, 2.8, 1.2], '#e0d0b8', 'tier', { sides: 8, tex: 'tile' }),
        B([0, 1.8, 0], [1.2, 2.2, 0.3], '#e8d8c0', 'tier', { sides: 8 }),
        B([0, 3.3, 0], [0.1, 0.8, 0.1], '#e0b040', 'cyl', { metal: 1 }),
      ],
    })),
  ],

  // The Chakri Maha Prasat throne hall at the Grand Palace: a European
  // classical body of three pavilions joined by wings, under three tiered
  // Thai roofs, each crowned with a tall gilded spire. Street 3: about
  // two dozen pieces.
  chakri: [
    B([0, 0.3, 0], [26, 0.6, 12], '#d8d0c0', 'box', { tex: 'stone' }),
    B([0, 0.9, 1.5], [10, 0.6, 3], '#e4dccc', 'box', { tex: 'stone' }),                     // front steps
    B([0, 3.0, 0], [8, 4.2, 8], '#f0ece2', 'box', { tex: 'win', tx: { cols: 4, rows: 1 } }),
    B([0, 6.6, 0], [8, 3.0, 8], '#f2eee6', 'box', { tex: 'win', tx: { cols: 4, rows: 1 } }),
    B([0, 4.6, 4.3], [6.0, 7.4, 0.8], '#f6f2ea', 'colonnade', { cols: 6 }),                  // the portico
    ...[-1, 1].flatMap((sx) => [
      B([sx * 7.5, 2.6, 0], [7, 3.4, 6], '#ece8de', 'box', { tex: 'win', tx: { cols: 4, rows: 1 } }),   // wing, ground
      B([sx * 7.5, 5.5, 0], [7, 2.4, 6], '#eeeae0', 'box', { tex: 'win', tx: { cols: 4, rows: 1 } }),   // wing, upper
      B([sx * 7.5, 6.9, 0], [7.2, 0.4, 6.2], '#d8d0c0', 'box', { sortY: 6.95 }),                        // wing balustrade
      B([sx * 11.0, 3.6, 0], [4, 6.6, 6], '#f0ece2', 'box', { tex: 'win', tx: { cols: 2, rows: 2 } }), // end pavilion
    ]),
    B([0, 8.4, 0], [8.6, 0.6, 8.6], '#d8d0c0'),                                               // the central cornice
    B([0, 9.6, 0], [8.0, 1.8, 7.0], '#c8402a', 'prism'),                                      // central roof, lower tier
    B([0, 11.0, 0], [6.2, 1.6, 5.4], '#2a7a4a', 'prism'),                                      // upper tier
    B([0, 12.6, 0], [4.4, 1.6, 4.0], '#c8402a', 'prism'),
    B([0, 15.6, 0], [1.6, 6.0, 0.1], '#e0b040', 'tier', { sides: 8, metal: 1, em: '#ffd070', emI: 0.25 }),   // gilded spire
    ...[-1, 1].flatMap((sx) => [
      B([sx * 11.0, 7.3, 0], [4.6, 0.6, 6.4], '#d8d0c0'),
      B([sx * 11.0, 8.4, 0], [4.2, 1.6, 6.0], '#c8402a', 'prism', { rotY: Math.PI / 2 }),
      B([sx * 11.0, 9.8, 0], [3.0, 1.4, 4.4], '#2a7a4a', 'prism', { rotY: Math.PI / 2 }),
      B([sx * 11.0, 12.4, 0], [1.2, 4.6, 0.1], '#e0b040', 'tier', { sides: 8, metal: 1, em: '#ffd070', emI: 0.25 }),
    ]),
  ],
  // ================= CAPE TOWN =================
  // The Castle (1666-79) and the Clock Tower (1882) are centuries old. City
  // Hall (1905) is by Harry Austin Reid and Frederick George Green, who won
  // its competition in the 1890s; their death dates were not found, but
  // South Africa's term is life + 50, so it would take an architect active
  // in the 1890s living past 1975 to matter (docs/CAPE-TOWN-FACTS-DRAFT.md).

  // The Waterfront Clock Tower: the old Port Captain's office, three
  // storeys of red Gothic Revival with white trim, a clock stage with four
  // faces, and a steep pointed roof. Street 1: about a dozen pieces.
  clocktower: [
    B([0, 0.25, 0], [7, 0.5, 7], '#8a8a86', 'box', { tex: 'stone' }),
    B([0, 1.9, 0], [3.6, 2.8, 3.6], '#b8362a', 'box', { tex: 'gothic' }),
    B([0, 4.6, 0], [3.4, 2.6, 3.4], '#bc3a2c', 'box', { tex: 'gothic' }),
    B([0, 7.1, 0], [3.2, 2.4, 3.2], '#c03e2e', 'box', { tex: 'win', tx: { cols: 2, rows: 1 } }),
    B([0, 8.55, 0], [3.5, 0.5, 3.5], '#f2ece0'),                                         // white cornice
    B([0, 9.8, 0], [2.8, 2.0, 2.8], '#c4402e'),                                            // the clock stage
    B([0, 9.8, 1.42], [1.6, 1.6, 0.14], '#f8f2e0', 'clock'),
    B([0, 9.8, -1.42], [1.6, 1.6, 0.14], '#f8f2e0', 'clock'),
    B([1.42, 9.8, 0], [1.6, 1.6, 0.14], '#f8f2e0', 'clock', { rotY: Math.PI / 2 }),
    B([-1.42, 9.8, 0], [1.6, 1.6, 0.14], '#f8f2e0', 'clock', { rotY: Math.PI / 2 }),
    B([0, 12.0, 0], [3.2, 2.4, 3.2], '#4a5a6a', 'pyramid'),                                 // the slate roof
    B([0, 13.8, 0], [0.5, 1.2, 0.5], '#e0b040', 'group', {                              // the finial and its ball
      adorn: [B([0, 0, 0], [0.08, 1.2, 0.08], '#e0b040', 'cyl', { metal: 1 }), B([0, -0.2, 0], [0.3, 0.3, 0.3], '#e0b040', 'sphere', { metal: 1 })],
    }),
  ],

  // The Castle of Good Hope: a five-pointed star fort of grey stone, a
  // pointed bastion at each corner, low curtain walls between, the moat
  // in front, the gate with its bell tower, and the yellow buildings
  // inside. Street 2: about eighteen pieces.
  goodhope: (() => {
    const out = [
      B([0, 0.2, 0], [22, 0.4, 22], '#7a8a5a', 'box'),
      B([0, 0.42, 9.6], [12, 0.12, 2.2], '#4a7a9a', 'box', { wet: 1, em: '#7ab4d4', emI: 0.3 }),   // the moat
    ];
    const R = 8.2;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i / 5) * Math.PI * 2;
      const bx = Math.cos(a) * R, bz = Math.sin(a) * R;
      out.push(B([bx, 1.7, bz], [3.2, 2.6, 3.2], '#8a8a80', 'box', { tex: 'stone', rotY: -a + Math.PI / 4 }));   // a bastion
      const b = Math.PI / 2 + ((i + 0.5) / 5) * Math.PI * 2;
      const wx = Math.cos(b) * R * 0.8, wz = Math.sin(b) * R * 0.8;
      out.push(B([wx, 1.5, wz], [7.6, 2.2, 1.2], '#92928a', 'box', { tex: 'stone', rotY: -b + Math.PI / 2 }));   // a curtain wall
    }
    out.push(
      B([0, 1.9, 6.6], [3.8, 3.0, 1.6], '#f0d060', 'extrude', {                            // the gate
        outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
        holes: [{ x: 0, y: -0.18, w: 0.36, h: 0.6, arch: true }],
      }),
      B([0, 4.3, 6.6], [1.6, 1.8, 1.4], '#f2d468', 'box', {                                 // the bell tower over it
        adorn: [B([0, 1.2, 0], [1.8, 0.6, 1.6], '#b84a2a', 'prism')],
      }),
      B([0, 2.0, -1.5], [8, 3.2, 3], '#f0d060', 'box', { tex: 'win', tx: { cols: 6, rows: 1 } }),   // the yellow buildings inside
      B([0, 4.0, -1.5], [8.4, 1.0, 3.4], '#9a3a2a', 'prism'),
      B([4.8, 5.4, -4.0], [0.1, 5.0, 0.1], '#e0e0e0', 'group', {                            // a flagpole on a bastion
        adorn: [B([0, 0, 0], [0.08, 5.0, 0.08], '#e0e0e0', 'cyl', { metal: 1 })],
      }),
    );
    return out;
  })(),

  // Cape Town City Hall: an Edwardian palace of honey-coloured stone, a
  // colonnaded centre with the balcony over the entrance, domed corner
  // pavilions, and the tall clock tower with four faces and a cupola.
  // Street 3: about two dozen pieces.
  cityhall: [
    B([0, 0.3, 0], [26, 0.6, 12], '#9a948a', 'box', { tex: 'stone' }),
    B([0, 0.8, 4.2], [8, 0.4, 2.4], '#cfc2a0', 'box', { tex: 'stone' }),                  // the front steps
    ...[-1, 1].flatMap((sx) => [
      B([sx * 6.5, 2.6, 0], [7, 3.6, 7], '#dcc898', 'box', { tex: 'win', tx: { cols: 4, rows: 1 } }),
      B([sx * 6.5, 6.0, 0], [7, 3.2, 7], '#e0cc9c', 'box', { tex: 'win', tx: { cols: 4, rows: 1 } }),
      B([sx * 10.8, 4.4, 0], [3.4, 7.6, 7.6], '#d8c494', 'box', { tex: 'arch', tx: { n: 2 } }),   // corner pavilion
      B([sx * 10.8, 8.9, 0], [2.6, 1.4, 2.6], '#5a7a6a', 'dome', { metal: 1 }),
    ]),
    B([0, 2.6, 0.2], [6, 3.6, 7.4], '#e4d0a0', 'box', { tex: 'arch', tx: { n: 3 } }),
    B([0, 6.0, 0.2], [6, 3.2, 7.4], '#e6d4a6', 'box', { tex: 'win', tx: { cols: 3, rows: 1 } }),
    B([0, 4.4, 4.3], [5.6, 7.2, 0.9], '#f0e2be', 'colonnade', { cols: 6 }),
    B([0, 4.3, 4.9], [3.0, 0.3, 1.2], '#d0bc90', 'box', {                                   // the balcony over the door
      adorn: [B([0, 0.4, 0.5], [3.0, 0.5, 0.1], '#d0bc90')],
    }),
    B([0, 8.6, 4.4], [6.2, 1.6, 1.0], '#e8d6aa', 'prism'),                                   // the pediment
    B([0, 8.0, 0], [21, 0.5, 7.6], '#d0bc90', 'box', { sortY: 8.1 }),                       // balustrade and cornice
    B([0, 10.6, -1.8], [3.6, 4.6, 3.6], '#dcc898', 'box', { tex: 'arch', tx: { n: 2 } }),   // the tower
    B([0, 14.3, -1.8], [3.2, 2.8, 3.2], '#e0cc9c', 'box', { tex: 'arch', tx: { n: 2 } }),
    B([0, 16.6, -1.8], [3.0, 1.8, 3.0], '#e4d0a0'),                                          // the clock stage
    B([0, 16.6, -0.28], [1.5, 1.5, 0.12], '#f8f2e0', 'clock'),
    B([0, 16.6, -3.32], [1.5, 1.5, 0.12], '#f8f2e0', 'clock'),
    B([1.52, 16.6, -1.8], [1.5, 1.5, 0.12], '#f8f2e0', 'clock', { rotY: Math.PI / 2 }),
    B([-1.52, 16.6, -1.8], [1.5, 1.5, 0.12], '#f8f2e0', 'clock', { rotY: Math.PI / 2 }),
    B([0, 18.3, -1.8], [2.6, 1.6, 2.6], '#d8c494', 'colonnade', { cols: 4 }),              // the open belfry
    B([0, 19.4, -1.8], [2.4, 1.4, 2.4], '#5a7a6a', 'dome', { metal: 1 }),
    B([0, 21.2, -1.8], [0.3, 1.6, 0.3], '#e0b040', 'cyl', { metal: 1 }),
  ],
  // ================= HANOI =================
  // The Turtle Tower (1886), Long Bien Bridge (1903, by the Paris firm
  // Daydé & Pillé) and the Temple of Literature (1070, its pavilion 1805)
  // are all long out of copyright. The One Pillar Pagoda was left out: the
  // one standing is a 1955 rebuild by an architect who died this century.

  // The Turtle Tower on its island in Hoan Kiem Lake: three small storeys
  // of arched openings, each a step narrower, under a curved roof.
  // Street 1: about a dozen pieces.
  turtletower: [
    B([0, 0.15, 0], [16, 0.3, 12], '#4a7a6a', 'box', { wet: 1, em: '#7ab0a0', emI: 0.3 }),   // the lake
    B([0, 0.6, 0], [8, 0.8, 6], '#7a7058', 'lathe', { profile: [[1, 0], [0.92, 0.6], [0.7, 1]] }),
    B([-2.6, 1.3, 1.2], [1.4, 1.2, 1.4], '#4a8a3a', 'sphere'),                              // shrubs
    B([2.8, 1.2, -1.0], [1.2, 1.0, 1.2], '#3a7a34', 'sphere'),
    B([0, 2.6, 0], [3.6, 2.6, 3.6], '#d8d0b8', 'box', { tex: 'arch', tx: { n: 3 } }),
    B([0, 4.05, 0], [4.0, 0.3, 4.0], '#c8bea4'),
    B([0, 5.2, 0], [2.8, 2.0, 2.8], '#dcd4bc', 'box', { tex: 'arch', tx: { n: 3 } }),
    B([0, 6.35, 0], [3.2, 0.3, 3.2], '#c8bea4'),
    B([0, 7.3, 0], [2.0, 1.6, 2.0], '#e0d8c0', 'box', { tex: 'arch', tx: { n: 1 } }),
    B([0, 8.6, 0], [2.8, 1.0, 2.8], '#8a5a3a', 'pyramid'),
    B([0, 9.5, 0], [0.4, 0.8, 0.4], '#e0b040', 'cone4', { metal: 1 }),
    B([3.2, 1.6, 1.8], [0.4, 1.2, 0.4], '#9a9488', 'box'),                                  // a stone lantern
  ],

  // Long Bien Bridge: dark steel cantilever trusses on tall stone piers over
  // the Red River, the railway running along the deck between them.
  // Street 2: about eighteen pieces.
  longbien: [
    B([0, 0.15, 0], [30, 0.3, 8], '#8a6a4a', 'box', { wet: 1, em: '#a08060', emI: 0.2 }),   // the Red River
    B([-13.5, 0.9, 0], [4, 1.2, 8], '#6a7a4a', 'box'),                                      // the banks
    B([13.5, 0.9, 0], [4, 1.2, 8], '#6a7a4a', 'box'),
    ...[-9, -3, 3, 9].map((x) => B([x, 2.3, 0], [1.4, 4.6, 2.2], '#8a8a80', 'box', { tex: 'stone' })),
    ...[-6, 0, 6].flatMap((x) => [
      B([x, 4.75, 0], [6, 0.3, 2.0], '#4a4a46'),                                            // the deck
      B([x, 5.9, 0], [6, 2.0, 1.8], '#4e4e48', 'box', { tex: 'lattice' }),                  // a truss
      B([x, 7.4, 0], [6, 1.0, 1.8], '#4e4e48', 'prism', { tex: 'lattice' }),                // its humped top chord
    ]),
    B([-13.5, 4.75, 0], [6, 0.3, 2.0], '#7a6a5a', 'box', {                                 // the stone approaches
      adorn: [B([0, -1.7, 0], [1.0, 3.2, 1.6], '#8a8a80')],
    }),
    B([13.5, 4.75, 0], [6, 0.3, 2.0], '#7a6a5a', 'box', {
      adorn: [B([0, -1.7, 0], [1.0, 3.2, 1.6], '#8a8a80')],
    }),
    B([0, 5.05, 0], [24, 0.12, 0.9], '#9a9aa0', 'box', { metal: 1, sortY: 7.5 }),          // the rails
  ],

  // The Temple of Literature: the Khue Van Cac pavilion on its four white
  // pillars, the square Well of Heavenly Clarity, rows of stone tablets on
  // the backs of stone turtles, and the great middle gate behind.
  // Street 3: about two dozen pieces.
  vanmieu: [
    B([0, 0.15, 0], [20, 0.3, 16], '#7a8a5a', 'box'),
    B([0, 0.35, 0], [3, 0.1, 14], '#c8bca0', 'box', { tex: 'stone' }),                     // the path
    B([0, 0.4, 4.2], [5.6, 0.2, 4.4], '#a8a090', 'box', { tex: 'stone' }),                  // the well's rim
    B([0, 0.52, 4.2], [5.0, 0.12, 3.8], '#3a7a8a', 'box', { wet: 1, em: '#6ab0c0', emI: 0.3 }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => B([x * 1.2, 1.9, z * 1.2 - 0.5], [0.9, 3.2, 0.9], '#ece6d8', 'box')),
    B([0, 4.6, -0.5], [3.4, 2.2, 3.4], '#a8302a', 'box', {                                 // the wooden upper storey
      adorn: [
        B([0, 0, 1.72], [1.2, 1.2, 0.08], '#f0c050', 'cyl', { rotX: Math.PI / 2, em: '#ffd070', emI: 0.3 }),
        B([0, 0, -1.72], [1.2, 1.2, 0.08], '#f0c050', 'cyl', { rotX: Math.PI / 2, em: '#ffd070', emI: 0.3 }),
      ],
    }),
    B([0, 6.1, -0.5], [4.8, 0.9, 4.8], '#6a3a2a', 'pyramid'),
    B([0, 6.9, -0.5], [3.0, 0.8, 3.0], '#6a3a2a', 'pyramid', {
      adorn: [B([0, 0.6, 0], [0.3, 0.5, 0.3], '#e0b040', 'cone4', { metal: 1 })],
    }),
    ...[-1, 1].flatMap((sx) => [-3.4, -1.2, 1.0, 3.2].map((z) => B([sx * 5.6, 1.1, z], [1.0, 1.6, 1.4], '#8a8a84', 'group', {
      adorn: [
        B([0, -0.5, 0], [0.9, 0.5, 1.3], '#7a7a74', 'sphere'),                             // the turtle
        B([0, 0.25, 0], [0.8, 1.1, 0.16], '#9a9a90', 'box'),                                // the tablet
        B([0, 0.85, 0], [0.9, 0.25, 0.3], '#8a8a80', 'prism'),
      ],
    }))),
    B([0, 1.7, -6.0], [8, 3.0, 1.6], '#d8c8a0', 'box', { tex: 'arch', tx: { n: 3 } }),    // the middle gate
    B([0, 3.8, -6.0], [2.6, 1.2, 9], '#8a3a2a', 'prism', { rotY: Math.PI / 2 }),
    B([-7.0, 1.2, -6.0], [6, 2.4, 0.8], '#c8b890', 'box', { tex: 'stone' }),
    B([7.0, 1.2, -6.0], [6, 2.4, 0.8], '#c8b890', 'box', { tex: 'stone' }),
  ],
  // ================= SEOUL =================
  // All three stand as rebuilt in 1867-1869, to the Joseon designs: long
  // out of copyright. Sungnyemun was left out (rebuilt 2013), and so was N
  // Seoul Tower (1971).
  // Roofs are built as a dark eave slab under a ridge, the closest the
  // block shapes come to the curved Korean hip-and-gable roof.

  // Heunginjimun, the Great East Gate: a stone base pierced by an arched
  // passage, a two-storey timber gatehouse on it under two tiled roofs,
  // and in front the ongseong, the half-ring of wall that guards it.
  // Street 1: about a dozen pieces.
  heunginjimun: [
    B([0, 0.2, 2], [22, 0.4, 18], '#8a8a80', 'box'),
    B([0, 2.4, 0], [10, 4.0, 5], '#bcb4a4', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.12, w: 0.3, h: 0.76, arch: true }],
    }),
    ...[0, 1, 2, 3].map((i) => {
      const a = 0.25 + (i / 3) * (Math.PI - 0.9);
      return B([Math.cos(a) * 7.2, 1.6, 2.6 + Math.sin(a) * 7.2], [4.4, 2.8, 1.4], '#b8b0a0', 'box', { tex: 'stone', rotY: Math.PI / 2 - a });
    }),
    B([0, 5.4, 0], [8.4, 2.0, 3.8], '#a8302a', 'box', { tex: 'arch', tx: { n: 5 } }),
    B([0, 6.7, 0], [10.4, 0.5, 5.6], '#4a4c52', 'box', {                                // lower eaves, painted beneath
      adorn: [B([0, -0.35, 0], [9.6, 0.2, 5.0], '#2a7a6a')],
    }),
    B([0, 8.0, 0], [7.4, 2.0, 3.4], '#a8302a', 'box', { tex: 'arch', tx: { n: 4 } }),
    B([0, 9.3, 0], [9.6, 0.5, 5.2], '#4a4c52', 'box', {
      adorn: [B([0, -0.35, 0], [8.8, 0.2, 4.6], '#2a7a6a')],
    }),
    B([0, 10.4, 0], [8.4, 1.6, 4.4], '#4a4c52', 'prism', { rotY: Math.PI / 2 }),
  ],

  // Gyeonghoeru: the royal banquet pavilion on its island in the palace
  // pond, raised on 48 stone pillars, its wide timber hall and great roof
  // above them, reached by stone bridges. Street 2: about eighteen pieces.
  gyeonghoeru: [
    B([0, 0.15, 0], [26, 0.3, 20], '#3a6a6a', 'box', { wet: 1, em: '#6aa0a0', emI: 0.3 }),   // the pond
    B([0, 0.55, 0], [17, 0.8, 12], '#bcb4a4', 'box', { tex: 'stone' }),                     // the island
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => B([sx * 3.6, 2.4, sz * 2.4], [6.4, 3.0, 4.2], '#d8d0c0', 'group', {
      adorn: [0, 1, 2, 3].flatMap((i) => [0, 1, 2].map((j) => B([-2.7 + i * 1.8, 0, -1.6 + j * 1.6], [0.5, 3.0, 0.5], '#d8d0c0', i % 3 && j === 1 ? 'cyl' : 'box'))),
    }))),
    B([0, 4.1, 0], [15.4, 0.4, 10.4], '#8a5a3a'),                                             // the timber floor
    B([0, 4.6, 0], [15.6, 0.6, 10.6], '#a8302a', 'box', { sortY: 4.25,                       // its red railing
      adorn: [B([0, 0, 0], [15.0, 0.5, 10.0], '#7a2a24')] }),
    B([0, 5.9, 0], [13, 2.6, 8], '#b83a2c', 'box', { tex: 'win', tx: { cols: 8, rows: 1, lit: '#f2e2b8' } }),
    B([0, 7.5, 0], [17.4, 0.6, 12.2], '#4a4c52', 'box', {
      adorn: [B([0, -0.4, 0], [16.4, 0.2, 11.2], '#2a7a6a')],
    }),
    B([0, 9.0, 0], [11.4, 2.4, 15], '#4a4c52', 'prism', { rotY: Math.PI / 2 }),
    B([0, 10.3, 0], [0.4, 0.4, 9], '#3a3c42'),                                              // the ridge
    ...[-4, 0, 4].map((x) => B([x, 0.75, 7.4], [2.2, 0.4, 3.0], '#c8c0b0', 'box', { tex: 'stone' })),   // three bridges
    B([-10, 1.4, -7.5], [2.6, 2.6, 2.6], '#4a8a3a', 'sphere'),                              // willows by the pond
  ],

  // Geunjeongjeon, the throne hall: a great two-storey timber hall on a
  // two-tier stone terrace ringed with balustrades and stone animals, in a
  // stone-paved courtyard. Street 3: about two dozen pieces.
  geunjeongjeon: [
    B([0, 0.2, 0], [24, 0.4, 22], '#b8b0a0', 'box', { tex: 'stone', tx: { cols: 16, rows: 14 } }),
    B([0, 0.9, -1.5], [18, 1.0, 13], '#c8c0b0', 'box', { tex: 'stone' }),                    // the lower terrace
    B([0, 1.9, -2.0], [15, 1.0, 10], '#ccc4b4', 'box', { tex: 'stone' }),                    // the upper terrace
    ...[-1, 1].flatMap((sx) => [
      B([sx * 8.8, 1.7, -1.5], [12.8, 0.6, 0.3], '#d8d0c0', 'colonnade', { cols: 10, rotY: Math.PI / 2, sortY: 1.45 }),
      B([sx * 7.3, 2.7, -2.0], [9.8, 0.6, 0.3], '#d8d0c0', 'colonnade', { cols: 8, rotY: Math.PI / 2, sortY: 2.45 }),
      B([sx * 8.6, 1.9, 4.6], [0.7, 1.0, 0.7], '#a8a090', 'sphere', { sortY: 1.5 }),         // stone guardians
      B([sx * 7.1, 2.9, 2.6], [0.7, 1.0, 0.7], '#a8a090', 'sphere', { sortY: 2.5 }),
      B([sx * 6.0, 0.7, 7.5], [0.9, 1.0, 0.9], '#5a4a3a', 'cyl', { metal: 1 }),              // bronze cauldrons
    ]),
    B([0, 1.4, 5.4], [3.0, 1.0, 2.0], '#c8c0b0', 'prism', { sortY: 1.6 }),                  // the front stairs
    B([0, 2.4, 3.3], [3.0, 1.0, 2.0], '#c8c0b0', 'prism', { sortY: 2.6 }),
    B([0, 4.4, -3.0], [12, 4.0, 7], '#a8302a', 'box', { tex: 'arch', tx: { n: 7 } }),        // the hall, lower storey
    B([0, 6.7, -3.0], [14.4, 0.6, 9.4], '#4a4c52', 'box', {
      adorn: [B([0, -0.4, 0], [13.6, 0.2, 8.6], '#2a7a6a')],
    }),
    B([0, 8.2, -3.0], [10, 2.4, 5.4], '#a8302a', 'box', { tex: 'win', tx: { cols: 7, rows: 1, lit: '#f2e2b8' } }),
    B([0, 9.7, -3.0], [12.8, 0.6, 8.0], '#4a4c52', 'box', {
      adorn: [B([0, -0.4, 0], [12.0, 0.2, 7.2], '#2a7a6a')],
    }),
    B([0, 11.2, -3.0], [7.0, 2.4, 11.4], '#4a4c52', 'prism', { rotY: Math.PI / 2 }),
    B([0, 12.5, -3.0], [0.4, 0.4, 8], '#3a3c42'),
    B([0, 0.5, 9.0], [2.4, 0.2, 4.0], '#d8d0c0', 'box', { tex: 'stone' }),                   // the royal path
    ...[-1, 1].map((sx) => B([sx * 3.0, 0.6, 8.6], [0.4, 0.4, 4.4], '#a8a090', 'group', {   // rank stones
      adorn: [-1.8, -0.6, 0.6, 1.8].map((z) => B([0, 0, z], [0.4, 0.4, 0.3], '#a8a090')),
    })),
  ],
  // ================= SAMARKAND =================
  // Timurid and later work, 1400s-1600s: no copyright question. The
  // Bibi-Khanym Mosque was left out: its dome was largely rebuilt from 1974.

  // The Ulugh Beg Observatory, as it stood in the 1420s: a round,
  // three-storey building on its hill, faced in tile, with the great marble
  // arc of its sextant running down through it into the ground.
  // Street 1: about a dozen pieces.
  observatory: [
    B([0, 0.7, 0], [18, 1.4, 14], '#a89470', 'lathe', { profile: [[1, 0], [0.9, 0.6], [0.75, 1]] }),
    B([0, 1.7, 0], [11, 0.6, 11], '#c8b490', 'cyl'),
    B([0, 3.4, 0], [9.6, 2.8, 9.6], '#d8b888', 'cyl', { tex: 'arch', tx: { n: 12 } }),
    B([0, 6.2, 0], [9.2, 2.8, 9.2], '#2aa8b8', 'cyl', { tex: 'tile' }),
    B([0, 8.9, 0], [8.8, 2.6, 8.8], '#d4b484', 'cyl', { tex: 'arch', tx: { n: 12 } }),
    B([0, 10.45, 0], [9.0, 0.5, 9.0], '#2a4aa8', 'cyl', { tex: 'tile' }),
    B([-0.4, 6.0, 0], [12, 6, 0.4], '#ece6d8', 'arch', { rotY: Math.PI / 2, sortY: 10.6 }),   // the sextant's two marble rails
    B([0.4, 6.0, 0], [12, 6, 0.4], '#ece6d8', 'arch', { rotY: Math.PI / 2, sortY: 10.7 }),
    B([0, 2.6, 6.2], [3.0, 1.2, 2.4], '#c8b490', 'prism', { rotY: Math.PI / 2 }),          // steps up the hill
    B([-7, 3.0, 4], [1.0, 4.0, 1.0], '#3a6a3a', 'cone4'),                                   // poplars
    B([7, 3.0, -4], [1.0, 4.0, 1.0], '#3a6a3a', 'cone4'),
    B([6.5, 1.8, 4.5], [1.2, 1.0, 1.2], '#4a7a3a', 'sphere'),
  ],

  // Gur-e-Amir, Timur's tomb: an octagonal base, a tall drum ringed with a
  // band of script in tile, the ribbed turquoise melon dome, and the great
  // tiled entrance gate with its two minarets. Street 2: about eighteen
  // pieces.
  gurlamir: [
    B([0, 0.2, 0], [20, 0.4, 18], '#c8b490', 'box', { tex: 'stone' }),
    B([0, 2.4, -2], [10, 4.0, 10], '#d8b888', 'tier', { sides: 8, tex: 'arch', tx: { n: 8 } }),
    B([0, 5.0, -2], [9.4, 1.2, 9.4], '#2a4aa8', 'tier', { sides: 8, tex: 'tile' }),
    B([0, 7.4, -2], [6.6, 3.6, 6.6], '#2aa8b8', 'cyl', { tex: 'tile' }),                   // the drum
    B([0, 9.5, -2], [6.8, 0.6, 6.8], '#f2ecd8', 'cyl'),                                    // its band of script
    B([0, 12.8, -2], [8.0, 6.0, 8.0], '#2ab0c8', 'lathe', {                                 // the ribbed melon dome
      tex: 'flute', tx: { n: 32 },
      profile: [[0.82, 0], [0.98, 0.25], [1, 0.45], [0.9, 0.7], [0.6, 0.9], [0.2, 0.98], [0, 1]],
    }),
    B([0, 16.3, -2], [0.3, 1.2, 0.3], '#e0b040', 'cyl', { metal: 1 }),
    B([0, 4.6, 5.0], [7.0, 9.2, 1.4], '#d8b888', 'extrude', {                             // the entrance gate
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.06, w: 0.5, h: 0.74, arch: 'pointed' }],
    }),
    B([0, 4.6, 5.75], [7.2, 9.4, 0.12], '#2a4aa8', 'extrude', {                           // its tile frame
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.03, w: 0.78, h: 0.9, arch: 'pointed' }],
    }),
    B([0, 3.0, 4.4], [3.2, 5.0, 0.2], '#3a2a20'),                                          // the shadowed door
    ...[-1, 1].flatMap((sx) => [
      B([sx * 4.2, 4.0, 5.0], [1.3, 8.0, 1.3], '#d8b888', 'cyl', { tex: 'tile', tx: {} }),
      B([sx * 4.2, 8.8, 5.0], [1.6, 1.6, 1.6], '#2aa8b8', 'cyl', {
        adorn: [B([0, 1.2, 0], [1.2, 0.8, 1.2], '#d8b888', 'dome')],
      }),
      B([sx * 7.5, 1.8, 2.0], [4.0, 3.2, 1.0], '#d4b484', 'box', { tex: 'arch', tx: { n: 2 } }),   // courtyard walls
    ]),
    B([0, 0.55, 7.2], [5, 0.3, 2.4], '#c8b490', 'box', { tex: 'stone' }),
  ],

  // The Registan: three madrasas around the square, each behind a huge
  // tiled gate (pishtaq) with a pointed arch, flanked by towers. Ulugh Beg's
  // on the left, Sher-Dor facing it on the right, Tilya-Kori at the back
  // with its turquoise dome. Street 3: about two dozen pieces.
  registan: (() => {
    const out = [B([0, 0.2, 0], [30, 0.4, 28], '#c8b490', 'box', { tex: 'stone', tx: { cols: 20, rows: 18 } })];
    const madrasa = (x, z, rotY, tint) => {
      const at = (dx, dy, dz) => {
        const c = Math.cos(rotY), s = Math.sin(rotY);
        return [x + dx * c + dz * s, dy, z - dx * s + dz * c];
      };
      out.push(
        B(at(0, 5.4, 0), [7.4, 10.4, 1.4], '#d8b888', 'extrude', { rotY,
          outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
          holes: [{ x: 0, y: -0.05, w: 0.52, h: 0.76, arch: 'pointed' }] }),
        B(at(0, 5.4, 0.76), [7.6, 10.6, 0.12], tint, 'extrude', { rotY, tex: 'tile',
          outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
          holes: [{ x: 0, y: -0.03, w: 0.8, h: 0.9, arch: 'pointed' }] }),
        B(at(-6.2, 3.2, -1.8), [5.0, 6.0, 4.0], '#d4b484', 'box', { rotY, tex: 'arch', tx: { n: 3 } }),
        B(at(6.2, 3.2, -1.8), [5.0, 6.0, 4.0], '#d4b484', 'box', { rotY, tex: 'arch', tx: { n: 3 } }),
        B(at(-8.9, 5.6, -0.2), [1.3, 11, 1.3], '#d8b888', 'cyl', { tex: 'tile' }),
        B(at(8.9, 5.6, -0.2), [1.3, 11, 1.3], '#d8b888', 'cyl', { tex: 'tile' }),
      );
    };
    madrasa(-10.5, 0, Math.PI / 2, '#2a4aa8');      // Ulugh Beg, facing the square from the left
    madrasa(10.5, 0, -Math.PI / 2, '#2aa8b8');      // Sher-Dor, facing it
    madrasa(0, -10.5, 0, '#2a6ac8');                // Tilya-Kori, at the back
    out.push(
      B([-6.0, 7.2, -12.5], [4.6, 1.6, 4.6], '#d8b888', 'cyl'),                           // Tilya-Kori's dome
      B([-6.0, 8.0, -12.5], [5.0, 3.6, 5.0], '#2ab0c8', 'dome'),
      B([12.3, 6.6, -3.5], [3.6, 2.4, 3.6], '#2aa8b8', 'dome', { tex: 'flute', tx: { n: 20 } }),   // Sher-Dor's ribbed domes
      B([12.3, 6.6, 3.5], [3.6, 2.4, 3.6], '#2aa8b8', 'dome', { tex: 'flute', tx: { n: 20 } }),
      B([0, 0.45, 2], [8, 0.1, 8], '#b8a480', 'box', { tex: 'stone' }),                     // the square's centre
    );
    return out;
  })(),
  // ================= ZANZIBAR =================
  // The Old Fort (1699), Christ Church (1873-80) and the House of Wonders
  // (1883) are all long out of copyright. The slave memorial beside the
  // cathedral (1998) is a living artist's work and is not shown.

  // The Old Fort: a square of high, weathered stone walls with stepped
  // battlements, a round tower at each corner and the gate in front.
  // Street 1: about a dozen pieces.
  oldfort: [
    B([0, 0.2, 0], [22, 0.4, 22], '#9a8a6a', 'box'),
    ...[[0, 7.2, 0], [0, -7.2, 0], [7.2, 0, Math.PI / 2], [-7.2, 0, Math.PI / 2]].map(([x, z, rot]) =>
      B([x, 2.6, z], [12, 4.4, 1.4], '#b8a888', 'box', { tex: 'stone', tx: { rough: 1 }, rotY: rot,
        adorn: [-5, -3, -1, 1, 3, 5].map((dx) => B([dx, 2.6, 0], [0.8, 0.8, 1.4], '#b0a080', 'pyramid')) })),
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) =>
      B([sx * 7.2, 3.0, sz * 7.2], [3.0, 6.0, 3.0], '#c0b090', 'cyl', { tex: 'stone', tx: { rough: 1 },
        adorn: [B([0, 3.3, 0], [3.2, 0.6, 3.2], '#b0a080', 'cyl')] })),
    B([0, 2.4, 8.0], [3.6, 4.4, 1.0], '#c8b896', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.15, w: 0.5, h: 0.6, arch: true }],
    }),
    B([0, 0.55, 10.5], [4, 0.3, 3], '#a89a7a', 'box', { tex: 'stone' }),
  ],

  // Christ Church Cathedral: a long nave of coral stone with pointed
  // windows under a barrel roof, aisles either side, a rounded apse at the
  // east end, and the clock tower with its spire at the west front.
  // Street 2: about eighteen pieces.
  christchurch: [
    B([0, 0.2, 0], [16, 0.4, 24], '#9a9480', 'box'),
    B([0, 3.0, -2], [6, 5.2, 7], '#e8e0cc', 'box', { tex: 'gothic' }),
    B([0, 3.0, -9], [6, 5.2, 7], '#e8e0cc', 'box', { tex: 'gothic' }),
    B([0, 6.4, -5.5], [6.4, 1.8, 14.2], '#8a7a6a', 'prism'),                                // the barrel roof
    ...[-1, 1].flatMap((sx) => [
      B([sx * 4.4, 2.0, -5.5], [2.8, 3.2, 14], '#e4dcc6', 'box', { tex: 'gothic' }),       // aisles
      B([sx * 4.4, 4.0, -5.5], [3.0, 0.9, 14.2], '#8a7a6a', 'prism'),
      B([sx * 5.9, 1.6, -5.5], [0.6, 2.8, 12], '#d8d0bc', 'group', {                       // buttresses
        adorn: [-5, -2.5, 0, 2.5, 5].map((z) => B([0, 0, z], [0.6, 2.8, 0.6], '#d8d0bc')),
      }),
    ]),
    B([0, 3.0, -13.6], [6, 5.2, 6], '#e4dcc6', 'cyl', { tex: 'gothic' }),                   // the apse
    B([0, 5.6, -13.6], [6.2, 2.4, 6.2], '#8a7a6a', 'dome'),
    B([0, 3.0, 3.8], [3.6, 5.6, 3.6], '#ece4d0', 'box', { tex: 'gothic' }),                 // the tower
    B([0, 7.2, 3.8], [3.4, 2.8, 3.4], '#ece4d0', 'box'),
    B([0, 7.2, 5.55], [1.6, 1.6, 0.12], '#f8f2e0', 'clock'),
    B([0, 9.8, 3.8], [3.6, 2.4, 3.6], '#6a6a70', 'pyramid'),
    B([0, 11.6, 3.8], [0.2, 1.2, 0.2], '#e0b040', 'cyl', { metal: 1 }),
    B([0, 1.8, 5.65], [1.8, 3.2, 0.2], '#4a3424', 'box', { sortY: 3.1 }),                   // the west door
    B([0, 0.55, 7.0], [4, 0.3, 2.4], '#b8b0a0', 'box', { tex: 'stone' }),
  ],

  // The House of Wonders: a tall square palace wrapped on every floor in
  // balconies carried on slim cast-iron columns, with the clock tower in
  // front. Street 3: about two dozen pieces.
  wonders: [
    B([0, 0.2, 0], [22, 0.4, 20], '#a89c84', 'box', { tex: 'stone' }),
    ...[0, 1, 2].flatMap((fl) => [
      B([-3.0, 2.2 + fl * 4, 0], [6, 4, 12], '#ece6d6', 'box', { tex: 'win', tx: { cols: 3, rows: 1 } }),
      B([3.0, 2.2 + fl * 4, 0], [6, 4, 12], '#e8e2d2', 'box', { tex: 'win', tx: { cols: 3, rows: 1 } }),
      B([0, 4.05 + fl * 4, 0], [16, 0.3, 16], '#d8d0bc', 'box', { sortY: 4.25 + fl * 4 }),       // the balcony floor
      B([0, 2.2 + fl * 4, 7.6], [15.6, 3.7, 0.4], '#e8e4d8', 'colonnade', { cols: 12, sortY: 4.3 + fl * 4 }),
      B([0, 2.2 + fl * 4, -7.6], [15.6, 3.7, 0.4], '#e8e4d8', 'colonnade', { cols: 12, sortY: 4.3 + fl * 4 }),
    ]),
    B([0, 12.6, 0], [16.4, 0.6, 16.4], '#7a6a5a'),                                          // the roof
    B([0, 8.6, 9.2], [3.2, 17, 3.2], '#ece6d6', 'box', { tex: 'arch', tx: { n: 2 } }),     // the clock tower
    B([0, 16.1, 10.82], [2.0, 2.0, 0.12], '#f8f2e0', 'clock', { sortY: 16.2 }),
    B([0, 16.1, 7.58], [2.0, 2.0, 0.12], '#f8f2e0', 'clock', { sortY: 16.2 }),
    B([1.62, 16.1, 9.2], [2.0, 2.0, 0.12], '#f8f2e0', 'clock', { rotY: Math.PI / 2, sortY: 16.2 }),
    B([-1.62, 16.1, 9.2], [2.0, 2.0, 0.12], '#f8f2e0', 'clock', { rotY: Math.PI / 2, sortY: 16.2 }),
    B([0, 17.9, 9.2], [3.6, 1.6, 3.6], '#6a7a6a', 'pyramid'),
    B([0, 0.6, 11.6], [5, 0.4, 2.4], '#c8bea8', 'box', { tex: 'stone' }),                   // the steps
  ],
  // ================= BEIJING =================
  // Ming buildings, rebuilt to their old designs (the Hall of Prayer after a
  // fire in 1889, the Hall of Supreme Harmony in 1695): no copyright
  // question. Tiananmen Square and its monuments are not in the game.

  // The Drum Tower: a massive base of red-plastered brick pierced by arched
  // tunnels, and on it a timber hall of red columns under a double roof of
  // grey tile with green-painted eaves. Street 1: about a dozen pieces.
  drumtower: [
    B([0, 0.2, 0], [20, 0.4, 14], '#8a8478', 'box', { tex: 'stone' }),
    B([0, 3.0, 0], [14, 5.2, 9], '#a8402a', 'extrude', {
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: -0.25, y: -0.18, w: 0.14, h: 0.55, arch: true }, { x: 0, y: -0.18, w: 0.14, h: 0.55, arch: true }, { x: 0.25, y: -0.18, w: 0.14, h: 0.55, arch: true }],
    }),
    B([0, 5.85, 0], [14.6, 0.5, 9.6], '#8a8478'),                                            // the parapet
    B([0, 7.8, 0], [11, 3.4, 6.4], '#b8302a', 'colonnade', { cols: 8 }),
    B([0, 7.8, 0], [10, 3.2, 5.4], '#7a2a1a', 'box', { tex: 'win', tx: { cols: 6, rows: 1, lit: '#f2c470' } }),
    B([0, 9.8, 0], [13.6, 0.5, 9.0], '#3a3c42', 'box', { adorn: [B([0, -0.35, 0], [12.8, 0.2, 8.2], '#2a6a5a')] }),
    B([0, 11.4, 0], [9.6, 2.6, 5.2], '#b8302a', 'box', { tex: 'win', tx: { cols: 6, rows: 1, lit: '#f2c470' } }),
    B([0, 13.0, 0], [12.4, 0.5, 8.0], '#3a3c42', 'box', { adorn: [B([0, -0.35, 0], [11.6, 0.2, 7.2], '#2a6a5a')] }),
    B([0, 14.4, 0], [7.0, 2.2, 11.4], '#3a3c42', 'prism', { rotY: Math.PI / 2 }),
    B([0, 15.6, 0], [0.4, 0.5, 7.6], '#2a2c32'),
    B([4.0, 6.6, 3.6], [1.0, 1.0, 0.6], '#b8302a', 'cyl', { rotX: Math.PI / 2, sortY: 6.0 }),     // the great drum, seen through
  ],

  // The Hall of Prayer for Good Harvests at the Temple of Heaven: a round
  // hall of red and gold under three tiers of blue glazed roof, on three
  // round white marble terraces with balustrades. Street 2: about eighteen
  // pieces.
  qiniandian: [
    B([0, 0.2, 0], [24, 0.4, 24], '#8a8a84', 'box', { tex: 'stone' }),
    ...[[18, 0.9], [15, 2.1], [12, 3.3]].flatMap(([w, y]) => [
      B([0, y, 0], [w, 1.2, w], '#ece8de', 'cyl'),                                            // a marble terrace
      B([0, y + 0.85, 0], [w, 0.3, 0.3], '#f2eee4', 'torus', { rotX: Math.PI / 2, sortY: y + 0.7 }),   // its balustrade
    ]),
    B([0, 4.5, 6.6], [3.2, 4.2, 2.6], '#e4e0d6', 'prism', { sortY: 4.0 }),                  // the stair up the terraces
    B([0, 6.0, 0], [9.0, 3.6, 9.0], '#b8302a', 'cyl', { tex: 'win', tx: { cols: 12, rows: 1, lit: '#e8b850' } }),
    B([0, 8.0, 0], [11.4, 0.4, 11.4], '#2a4a9a', 'cyl'),                                    // the lowest eaves
    B([0, 8.8, 0], [11.0, 1.2, 7.6], '#2a5aa8', 'tier'),                                     // the lowest roof
    B([0, 9.9, 0], [7.4, 1.4, 7.4], '#b8302a', 'cyl', { tex: 'win', tx: { cols: 10, rows: 1, lit: '#e8b850' } }),
    B([0, 11.2, 0], [9.0, 1.2, 5.8], '#2a5aa8', 'tier'),                                     // the middle roof
    B([0, 12.2, 0], [5.6, 1.2, 5.6], '#b8302a', 'cyl', { tex: 'win', tx: { cols: 8, rows: 1, lit: '#e8b850' } }),
    B([0, 13.3, 0], [7.0, 2.4, 1.0], '#2a5aa8', 'tier'),                                     // the top roof
    B([0, 15.0, 0], [0.9, 1.4, 0.9], '#e0b040', 'sphere', { metal: 1, em: '#ffd070', emI: 0.3 }),
    B([0, 8.35, 0], [9.4, 0.3, 0.3], '#e0b040', 'torus', { rotX: Math.PI / 2, metal: 1, sortY: 8.7 }),   // gilded ring
    B([0, 0.6, 10.5], [6, 0.4, 3], '#c8c4ba', 'box', { tex: 'stone' }),                       // the raised way
  ],

  // The Hall of Supreme Harmony in the Forbidden City: a vast hall of red
  // columns and walls under a double hipped roof of yellow glazed tile, on
  // a three-tier white marble terrace with balustrades and staircases.
  // Street 3: about two dozen pieces.
  taihedian: [
    B([0, 0.2, 0], [30, 0.4, 24], '#9a948a', 'box', { tex: 'stone', tx: { cols: 20, rows: 16 } }),
    ...[[26, 18, 1.0], [22, 15, 2.2], [19, 12.5, 3.4]].flatMap(([w, d, y]) => [
      B([0, y, -1], [w, 1.2, d], '#ece8de', 'box', { tex: 'stone' }),
      B([0, y + 0.85, -1 + d / 2], [w, 0.5, 0.25], '#f2eee4', 'colonnade', { cols: Math.round(w / 1.2), sortY: y + 0.7 }),
    ]),
    B([0, 2.2, 9.0], [3.6, 3.6, 3.0], '#e4e0d6', 'prism', { sortY: 3.0 }),                    // the central stair
    B([-5, 2.2, 9.0], [2.4, 3.6, 3.0], '#e4e0d6', 'prism', { sortY: 3.05 }),
    B([5, 2.2, 9.0], [2.4, 3.6, 3.0], '#e4e0d6', 'prism', { sortY: 3.1 }),
    B([-4.5, 6.4, -1], [9, 5.2, 9], '#b8302a', 'box', { tex: 'win', tx: { cols: 5, rows: 1, lit: '#e8b850' } }),
    B([4.5, 6.4, -1], [9, 5.2, 9], '#b8302a', 'box', { tex: 'win', tx: { cols: 5, rows: 1, lit: '#e8b850' } }),
    B([0, 6.4, 3.8], [17.6, 5.0, 0.8], '#c8382c', 'colonnade', { cols: 12 }),               // the front columns
    B([0, 9.3, -1], [21, 0.6, 12.6], '#e8b830', 'box', { adorn: [B([0, -0.4, 0], [20.2, 0.2, 11.8], '#2a6a5a')] }),   // lower eaves
    B([0, 10.6, -1], [16, 2.0, 9.6], '#b8302a', 'box', { tex: 'win', tx: { cols: 9, rows: 1, lit: '#e8b850' } }),
    B([0, 12.0, -1], [19, 0.6, 11.4], '#e8b830', 'box', { adorn: [B([0, -0.4, 0], [18.2, 0.2, 10.6], '#2a6a5a')] }),  // upper eaves
    B([-4.6, 13.8, -1], [8.6, 3.0, 9.6], '#e8b830', 'prism', { rotY: Math.PI / 2 }),
    B([4.6, 13.8, -1], [8.6, 3.0, 9.6], '#e8b830', 'prism', { rotY: Math.PI / 2 }),
    B([0, 15.4, -1], [12, 0.5, 0.5], '#d8a020'),                                             // the ridge
    ...[-1, 1].map((sx) => B([sx * 6.2, 16.0, -1], [0.6, 1.2, 0.6], '#d8a020', 'cone4')),    // ridge beasts
    ...[-1, 1].map((sx) => B([sx * 10.5, 4.5, 6.0], [1.2, 1.4, 1.2], '#4a4038', 'cyl', { metal: 1 })),   // bronze cauldrons
  ],
  // ================= HAVANA =================
  // Spanish colonial work of the 1500s to 1700s: no copyright question.
  // El Capitolio (1929) was left out: it is a joint work, and Cuba protects
  // it until 50 years after the last of its architects died; not every
  // co-author's death date could be confirmed.

  // The Castillo de la Real Fuerza: a square stone fort with an arrowhead
  // bastion at each corner, a moat, and the watchtower with the Giraldilla
  // weathervane on top. Street 1: about a dozen pieces.
  realfuerza: [
    B([0, 0.15, 0], [22, 0.3, 22], '#4a7a8a', 'box', { wet: 1, em: '#6aa0b0', emI: 0.3 }),   // the moat
    B([0, 0.55, 0], [14, 0.6, 14], '#8a8a72', 'box'),
    ...[[0, 5.5, 0], [0, -5.5, 0], [5.5, 0, Math.PI / 2], [-5.5, 0, Math.PI / 2]].map(([x, z, rot]) =>
      B([x, 2.6, z], [9, 3.6, 1.6], '#b8a888', 'box', { tex: 'stone', tx: { rough: 1 }, rotY: rot })),
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) =>
      B([sx * 6.2, 2.4, sz * 6.2], [3.4, 3.2, 3.4], '#c0b090', 'box', { tex: 'stone', tx: { rough: 1 }, rotY: Math.PI / 4 })),
    B([4.8, 6.0, -4.8], [2.2, 4.0, 2.2], '#c8b896', 'box', { tex: 'arch', tx: { n: 1 } }),   // the watchtower
    B([4.8, 8.6, -4.8], [1.4, 1.6, 1.4], '#8a5a3a', 'cyl', {
      adorn: [B([0, 1.2, 0], [0.4, 0.9, 0.4], '#c8a050', 'cone4', { metal: 1 })],         // the Giraldilla's perch
    }),
  ],

  // Havana Cathedral: a curving Baroque front of coral stone between two
  // bell towers of different widths, three doorways, and the dome behind.
  // Street 2: about eighteen pieces. Each part has its own tone (device
  // feedback, 15 October 2026: in one sandy colour throughout, nobody could
  // tell which piece went where): the front pale, the towers a warmer coral
  // getting lighter up each stage, the nave grey stone under a tiled roof.
  habanacathedral: [
    B([0, 0.2, 0], [22, 0.4, 20], '#a89c84', 'box', { tex: 'stone' }),
    B([0, 0.55, 5.2], [11, 0.3, 2.0], '#c0b49c', 'box', { tex: 'stone' }),                   // the steps
    B([0, 3.6, 3.6], [9.0, 6.4, 1.2], '#d4c8a8', 'extrude', {                                 // the front
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: -0.3, y: -0.2, w: 0.12, h: 0.5, arch: true }, { x: 0, y: -0.15, w: 0.16, h: 0.6, arch: true }, { x: 0.3, y: -0.2, w: 0.12, h: 0.5, arch: true }],
    }),
    B([0, 3.0, 3.2], [8, 5.4, 0.2], '#3a2a20'),                                              // the doors, in shadow
    B([0, 7.8, 3.6], [6.0, 2.4, 1.0], '#d8ccac', 'extrude', {                               // the curving gable
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.42, -0.1], [0.3, 0.1], [0.15, 0.25], [0.06, 0.5], [-0.06, 0.5], [-0.15, 0.25], [-0.3, 0.1], [-0.42, -0.1]],
    }),
    B([0, 4.4, 4.25], [8.6, 0.4, 0.2], '#c8bc9c', 'box', { sortY: 6.9 }),                     // the cornice between storeys
    ...[[-1, 3.2], [1, 2.6]].flatMap(([sx, w]) => [
      B([sx * (4.5 + w / 2), 3.4, 3.0], [w, 6.4, w], '#c49a78', 'box', { tex: 'stone' }),
      B([sx * (4.5 + w / 2), 7.8, 3.0], [w * 0.9, 2.4, w * 0.9], '#d2ae8a', 'box', { tex: 'arch', tx: { n: 1 } }),
      B([sx * (4.5 + w / 2), 9.6, 3.0], [w * 0.8, 1.2, w * 0.8], '#e0c4a2', 'box', { tex: 'arch', tx: { n: 1 } }),
      B([sx * (4.5 + w / 2), 10.7, 3.0], [w * 0.7, 1.0, w * 0.7], '#8a6a52', 'pyramid'),
    ]),
    B([0, 3.4, -2.5], [9, 6.4, 11], '#a8a294', 'box', { tex: 'stone' }),                     // the nave
    B([0, 7.0, -2.5], [9.4, 0.8, 11.4], '#a0583a', 'prism'),                                // its tiled roof
    B([0, 7.8, -5.0], [3.6, 1.6, 3.6], '#e8e0cc', 'cyl'),                                   // the dome
    B([0, 8.6, -5.0], [3.8, 2.6, 3.8], '#7a8a8e', 'dome'),
  ],

  // Morro Castle: the fortress on its rock at the harbour mouth, walls
  // stepping down to the sea in tiers, sentry boxes on the corners, and the
  // lighthouse at the point. Street 3: about two dozen pieces.
  morro: [
    B([0, 0.15, 0], [30, 0.3, 24], '#2a6a8a', 'box', { wet: 1, em: '#4a8aaa', emI: 0.3 }),   // the sea
    B([-2, 1.2, -1], [24, 2.4, 16], '#7a6a5a', 'rock'),
    B([6, 1.4, 4], [10, 2.6, 8], '#6a5a4a', 'rock'),
    ...[[-8, -4, 10, 6], [-1, -5, 8, 6], [5, -3, 6, 6], [-7, 3, 8, 5], [0, 2, 8, 5]].map(([x, z, w, d], i) =>
      B([x, 3.6 + (i % 2) * 0.8, z], [w, 2.6 + (i % 2) * 0.8, d], '#c0a888', 'box', { tex: 'stone', tx: { rough: 1 } })),
    ...[[-12, -6], [3, -7], [-11, 5], [4, 5]].map(([x, z]) => B([x, 5.4, z], [2.4, 2.0, 2.4], '#c8b090', 'box', { tex: 'stone', rotY: Math.PI / 4 })),   // bastion tips
    B([-3, 5.6, -0.5], [14, 0.6, 10], '#b8a080', 'box', { sortY: 5.9 }),                     // the parade ground
    B([-6, 6.9, -2], [6, 2.0, 4], '#d0b898', 'box', { tex: 'arch', tx: { n: 3 } }),          // barracks
    B([-6, 8.2, -2], [6.4, 0.8, 4.4], '#9a7a5a', 'prism', { rotY: Math.PI / 2 }),
    ...[[-12.6, -6.6], [3.6, -7.6], [-11.6, 5.6], [4.6, 5.6]].map(([x, z]) => B([x, 7.1, z], [1.0, 1.4, 1.0], '#d0b898', 'cyl', {   // sentry boxes
      adorn: [B([0, 0.9, 0], [1.1, 0.5, 1.1], '#c0a888', 'dome')],
    })),
    B([7.5, 6.0, 4.5], [2.6, 3.0, 2.6], '#d8d0c0', 'cyl'),                                  // the lighthouse
    B([7.5, 9.5, 4.5], [2.2, 4.0, 2.2], '#e8e2d4', 'cyl'),
    B([7.5, 12.5, 4.5], [1.8, 2.0, 1.8], '#ece6d8', 'cyl'),
    B([7.5, 14.0, 4.5], [2.4, 0.4, 2.4], '#3a3a40', 'cyl', { metal: 1 }),
    B([7.5, 14.9, 4.5], [1.4, 1.4, 1.4], '#fff2c0', 'cyl', { glass: 1, em: '#ffe090', emI: 1.2 }),
    B([7.5, 16.0, 4.5], [1.7, 0.9, 1.7], '#3a3a40', 'dome', { metal: 1 }),
  ],
  // ================= ISTANBUL =================
  // Hagia Sophia (537), the Blue Mosque (1609-16) and the Galata Tower
  // (1348; its cap rebuilt in the 1960s to the old shape) are long out of
  // copyright. Both mosques are places of worship today: shown as
  // buildings, from outside.

  // The Galata Tower: a round stone tower on the hill above the Golden
  // Horn, a gallery ringed with arched windows near the top, and a tall
  // conical cap. Street 1: about a dozen pieces.
  galata: [
    B([0, 0.4, 0], [14, 0.8, 12], '#8a8070', 'box', { tex: 'stone' }),
    B([-5, 2.4, -3], [3.6, 3.6, 4], '#d8c4a4', 'box', { tex: 'win', tx: { cols: 2, rows: 1 } }),   // houses below it
    B([5, 2.0, 3], [3.4, 2.8, 4], '#c8b8a0', 'box', { tex: 'win', tx: { cols: 2, rows: 1 } }),
    B([0, 2.6, 0], [5.6, 3.6, 5.6], '#a89880', 'cyl', { tex: 'stone', tx: { rough: 1 } }),
    B([0, 6.2, 0], [5.4, 3.6, 5.4], '#ac9c84', 'cyl', { tex: 'stone' }),
    B([0, 9.8, 0], [5.2, 3.6, 5.2], '#b0a088', 'cyl', { tex: 'stone' }),
    B([0, 13.4, 0], [5.0, 3.6, 5.0], '#b4a48c', 'cyl', { tex: 'stone' }),
    B([0, 15.5, 0], [6.0, 0.4, 6.0], '#8a7a66', 'cyl'),                                     // the gallery floor
    B([0, 16.9, 0], [4.8, 2.4, 4.8], '#c8b898', 'cyl', { tex: 'arch', tx: { n: 8 } }),
    B([0, 18.3, 0], [6.0, 0.24, 0.24], '#3a3a40', 'torus', { rotX: Math.PI / 2, metal: 1 }),   // the gallery rail
    B([0, 20.6, 0], [5.4, 4.4, 0.1], '#5a5e66', 'tier'),                                   // the conical cap
    B([0, 23.2, 0], [0.3, 1.0, 0.3], '#d8b04a', 'cyl', { metal: 1 }),
  ],

  // The Blue Mosque (Sultan Ahmed Mosque): a square hall under a central
  // dome and a cascade of half-domes and smaller domes, six slender
  // minarets with balconies, and the arcaded courtyard in front.
  // Street 2: about eighteen pieces.
  bluemosque: [
    B([0, 0.2, 0], [26, 0.4, 26], '#a8a49c', 'box', { tex: 'stone' }),
    B([0, 3.0, -2], [14, 5.2, 14], '#cac6be', 'box', { tex: 'arch', tx: { n: 6 } }),
    ...[[0, 4], [0, -8], [6, -2], [-6, -2]].map(([x, z]) => B([x, 6.0, z], [6.4, 2.4, 6.4], '#8a909a', 'dome')),   // half-domes
    B([0, 7.4, -2], [8.6, 2.0, 8.6], '#cac6be', 'cyl', { tex: 'win', tx: { cols: 16, rows: 1, lit: '#f2d8a0' } }),
    B([0, 8.4, -2], [9.6, 5.4, 9.6], '#8a909a', 'dome'),
    B([0, 14.4, -2], [0.3, 1.4, 0.3], '#d8b04a', 'cyl', { metal: 1 }),
    ...[[-8, 6], [8, 6], [-8, -10], [8, -10], [-11.5, 8.5], [11.5, 8.5]].map(([x, z]) => B([x, 7.6, z], [1.0, 15.2, 1.0], '#d6d2ca', 'cyl', {   // minarets
      adorn: [
        B([0, 1.2, 0], [1.6, 0.3, 1.6], '#c4c0b8', 'cyl'), B([0, 4.0, 0], [1.6, 0.3, 1.6], '#c4c0b8', 'cyl'),
        B([0, 7.2, 0], [1.1, 1.6, 1.1], '#7a808a', 'cone4'),
      ],
    })),
    B([-6.5, 2.0, 9.5], [6, 3.2, 1.6], '#cac6be', 'colonnade', { cols: 5 }),                // the courtyard arcades
    B([6.5, 2.0, 9.5], [6, 3.2, 1.6], '#cac6be', 'colonnade', { cols: 5 }),
    B([0, 3.0, 10.0], [4.4, 5.6, 1.4], '#d0ccc4', 'extrude', {                             // the courtyard gate
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.12, w: 0.5, h: 0.62, arch: 'pointed' }],
    }),
  ],

  // Hagia Sophia: a huge block of pinkish stone and brick held up by heavy
  // buttresses, the vast shallow dome on its ring of windows, half-domes
  // east and west, and the four minarets at its corners.
  // Street 3: about two dozen pieces.
  hagiasophia: [
    B([0, 0.2, 0], [30, 0.4, 28], '#a8a094', 'box', { tex: 'stone' }),
    B([-4, 3.6, 0], [8, 6.4, 16], '#d8a07a', 'box', { tex: 'arch', tx: { n: 4 } }),
    B([4, 3.6, 0], [8, 6.4, 16], '#d4a078', 'box', { tex: 'arch', tx: { n: 4 } }),
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => B([sx * 8.6, 4.4, sz * 5.6], [2.4, 8.0, 3.0], '#cc9670', 'box', { tex: 'stone' })),   // buttresses
    B([0, 8.6, 0], [10, 2.0, 10], '#d8a47e', 'box'),
    B([0, 7.6, 6.0], [8.4, 3.4, 8.4], '#7a8088', 'dome'),                                  // half-domes, west and east
    B([0, 7.6, -6.0], [8.4, 3.4, 8.4], '#7a8088', 'dome'),
    B([0, 10.3, 0], [9.0, 1.4, 9.0], '#d8a47e', 'cyl', { tex: 'win', tx: { cols: 20, rows: 1, lit: '#f2d8a0' } }),   // the ring of windows
    B([0, 11.0, 0], [10.4, 4.0, 10.4], '#7a8088', 'dome'),                                 // the great dome
    B([0, 15.3, 0], [0.3, 1.2, 0.3], '#d8b04a', 'cyl', { metal: 1 }),
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].flatMap(([sx, sz]) => [
      B([sx * 12, 5.0, sz * 10], [1.2, 10, 1.2], sx * sz > 0 ? '#d6d2ca' : '#d0a080', 'cyl'),   // minarets, two of stone and two of brick
      B([sx * 12, 12.0, sz * 10], [1.0, 4.0, 1.0], '#d6d2ca', 'cyl', {
        adorn: [B([0, -1.2, 0], [1.6, 0.3, 1.6], '#c4c0b8', 'cyl'), B([0, 2.6, 0], [1.0, 1.4, 1.0], '#7a8088', 'cone4')],
      }),
    ]),
    B([0, 2.6, 9.5], [14, 4.4, 3], '#d4a078', 'box', { tex: 'arch', tx: { n: 7 } }),        // the porch
    ...[[-10, -9], [10, -9]].map(([x, z]) => B([x, 2.2, z], [4, 3.6, 4], '#cac6be', 'box', {   // tombs in the grounds
      adorn: [B([0, 1.8, 0], [3.6, 2.0, 3.6], '#7a8088', 'dome')],
    })),
  ],
  // ================= CHICAGO =================
  // All three are US buildings or structures finished before 1990 (the
  // Water Tower 1869, Buckingham Fountain 1927, the Willis Tower 1973):
  // US copyright does not cover buildings built before 1 December 1990.
  // The fountain's bronze sea horses (1927) are sculptures and are not
  // modelled; their pedestals stand empty.

  // The Chicago Water Tower: a little castle of yellow limestone, turrets at
  // its corners, and a slim octagonal shaft rising to a lantern and cap.
  // Street 1: about a dozen pieces.
  watertower: [
    B([0, 0.2, 0], [14, 0.4, 14], '#8a8a80', 'box', { tex: 'stone' }),
    B([-1.6, 2.6, 0], [3.2, 4.4, 6.4], '#e0d0a0', 'box', { tex: 'gothic' }),
    B([1.6, 2.6, 0], [3.2, 4.4, 6.4], '#dccc9c', 'box', { tex: 'gothic' }),
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => B([sx * 3.3, 3.2, sz * 3.3], [1.0, 5.6, 1.0], '#e4d4a4', 'cyl', {
      adorn: [B([0, 3.2, 0], [1.1, 0.9, 1.1], '#d8c898', 'cone4')],
    })),
    B([0, 7.1, 0], [2.6, 4.6, 2.4], '#e0d0a0', 'tier', { sides: 8, tex: 'stone' }),
    B([0, 11.2, 0], [2.2, 3.6, 2.0], '#e4d4a4', 'tier', { sides: 8, tex: 'gothic' }),
    B([0, 14.0, 0], [1.6, 2.0, 1.4], '#e8d8a8', 'tier', { sides: 8, tex: 'arch', tx: { n: 4 } }),
    B([0, 15.6, 0], [1.6, 1.2, 0.2], '#8a8070', 'tier', { sides: 8 }),
    B([0, 16.6, 0], [0.4, 0.8, 0.4], '#d8b04a', 'cone4', { metal: 1 }),
  ],

  // Buckingham Fountain: a wide pink-granite basin, three stepped basins
  // rising from it like a wedding cake, water falling from each, and the
  // great jet from the top. Street 2: about eighteen pieces.
  buckingham: [
    B([0, 0.2, 0], [28, 0.4, 28], '#a8a49c', 'box', { tex: 'stone' }),
    B([0, 0.6, 0], [22, 0.4, 22], '#3a8ab0', 'water', { wet: 1, em: '#6ab4d4', emI: 0.4 }),   // the lower pool
    B([0, 0.75, 0], [22.4, 0.5, 0.5], '#d8a8a0', 'torus', { rotX: Math.PI / 2, sortY: 0.8 }),   // its rim
    ...[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([sx, sz]) => B([sx * 6.2, 1.4, sz * 6.2], [1.6, 1.6, 1.6], '#c8a098', 'box', { sortY: 0.9 })),   // empty pedestals
    B([0, 1.6, 0], [12, 1.6, 11], '#d4aca4', 'tier', { tex: 'stone' }),                       // the first basin
    B([0, 2.6, 0], [11.2, 0.4, 11.2], '#5ab0d4', 'water', { wet: 1, em: '#8ad0e8', emI: 0.4 }),
    B([0, 3.6, 0], [7.4, 1.6, 6.6], '#d8b0a8', 'tier', { tex: 'stone' }),                     // the second
    B([0, 4.6, 0], [6.6, 0.4, 6.6], '#5ab0d4', 'water', { wet: 1, em: '#8ad0e8', emI: 0.4 }),
    B([0, 5.6, 0], [3.8, 1.6, 3.2], '#dcb4ac', 'tier', { tex: 'stone' }),                     // the third
    B([0, 6.6, 0], [3.2, 0.4, 3.2], '#5ab0d4', 'water', { wet: 1, em: '#8ad0e8', emI: 0.4 }),
    B([0, 7.4, 0], [1.2, 1.2, 1.2], '#dcb4ac', 'cyl'),
    B([0, 11.6, 0], [0.6, 7.2, 0.6], '#b4ecfc', 'water', { wet: 1, em: '#d8faff', emI: 0.8 }),   // the great jet
    B([0, 0.9, 11.5], [10, 0.2, 2], '#b8b4ac', 'box', { tex: 'stone' }),                       // the promenade
    ...[[-1], [1]].map(([sx]) => B([sx * 12, 2.4, 11.5], [0.4, 4.4, 0.4], '#3a3a40', 'cyl', {
      metal: 1, adorn: [B([0, 2.4, 0], [0.6, 0.6, 0.6], '#fff2c0', 'sphere', { em: '#ffe9a0', emI: 1.2 })],
    })),
  ],

  // The Willis Tower: nine square tubes of black steel and dark glass
  // bundled together, dropping away at different heights so the tower
  // steps back as it rises, and two antennas on top. Street 3: about two
  // dozen pieces.
  willis: (() => {
    const out = [B([0, 0.6, 0], [12, 1.2, 12], '#5a5c64', 'box', { tex: 'stone' })];
    const tubes = [[-3, -3, 10], [3, 3, 10], [3, -3, 13], [-3, 3, 13], [-3, 0, 18], [3, 0, 18], [0, 3, 18], [0, 0, 22], [0, -3, 22]];
    for (const [x, z, h] of tubes) {
      for (let y = 0; y < h; y += 7) {
        const seg = Math.min(7, h - y);
        out.push(B([x, 1.2 + y + seg / 2, z], [2.9, seg, 2.9], '#2a2c32', 'box', {
          tex: 'win', tx: { cols: 3, rows: Math.max(1, Math.round(seg * 1.6)), lit: '#e8c890' },
        }));
      }
    }
    out.push(
      B([-0.5, 25.2, -1.5], [0.25, 6.0, 0.25], '#c8ccd4', 'cyl', { metal: 1 }),
      B([0.5, 24.8, -1.5], [0.25, 5.2, 0.25], '#c8ccd4', 'cyl', { metal: 1 }),
    );
    return out;
  })(),
  // ================= BUENOS AIRES =================
  // Argentina protects works for life + 70. The architects of all three
  // died long ago: Francesco Tamburini 1891, Carl Kihlberg 1908, Henrik
  // Åberg 1922 (Casa Rosada); Tamburini, Vittorio Meano 1904 and Jules
  // Dormal 1924 (Teatro Colón, the Congress). Their sculptures are not
  // modelled. The Obelisco (1936; its architect died 1970) is left out.

  // The Casa Rosada: the pink presidential palace, two wings joined by a
  // great arched gateway, mansard roofs, and the balcony over the square.
  // Street 1: about a dozen pieces.
  casarosada: [
    B([0, 0.2, 0], [26, 0.4, 14], '#9a968e', 'box', { tex: 'stone' }),
    ...[-1, 1].flatMap((sx) => [
      B([sx * 7.2, 2.4, 0], [9, 4.0, 8], '#e0a8a0', 'box', { tex: 'arch', tx: { n: 5 } }),
      B([sx * 7.2, 5.8, 0], [9, 2.8, 8], '#e4aca4', 'box', { tex: 'win', tx: { cols: 5, rows: 1 } }),
      B([sx * 7.2, 7.9, 0], [9.2, 1.4, 8.2], '#4a5058', 'prism', { rotY: Math.PI / 2 }),   // mansard roof
    ]),
    B([0, 4.0, 0.5], [5.4, 7.2, 7], '#e8b0a8', 'extrude', {                               // the archway
      outline: [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]],
      holes: [{ x: 0, y: -0.15, w: 0.5, h: 0.62, arch: true }],
    }),
    B([0, 8.4, 0.5], [5.6, 2.0, 7.2], '#e8b0a8', 'prism'),                                // its pediment
    B([0, 4.6, 4.3], [3.0, 0.3, 1.2], '#d8a098', 'box', {                                 // the balcony
      adorn: [B([0, 0.4, 0.5], [3.0, 0.5, 0.1], '#d8a098')],
    }),
    B([0, 0.6, 5.6], [8, 0.4, 2.4], '#c8c0b4', 'box', { tex: 'stone' }),
  ],

  // The Teatro Colón: the great opera house, a stone front of arched doors
  // and tall windows, a columned porch, corner pavilions and mansard roofs.
  // Street 2: about eighteen pieces.
  colon: [
    B([0, 0.2, 0], [26, 0.4, 20], '#9a968e', 'box', { tex: 'stone' }),
    B([0, 0.6, 7.2], [12, 0.4, 2.4], '#c8c0b4', 'box', { tex: 'stone' }),
    ...[-1, 0, 1].flatMap((i) => [
      B([i * 7, 2.6, 0], [7, 4.4, 12], '#e4dac4', 'box', { tex: 'arch', tx: { n: 3 } }),
      B([i * 7, 6.4, 0], [7, 3.2, 12], '#e8dec8', 'box', { tex: 'win', tx: { cols: 3, rows: 1 } }),
      B([i * 7, 8.7, 0], [7.2, 1.4, 12.2], '#4a5058', 'prism'),
    ]),
    B([0, 2.8, 6.6], [8, 4.8, 1.2], '#ece2cc', 'colonnade', { cols: 6 }),                // the porch
    B([0, 5.4, 6.6], [8.4, 0.4, 1.6], '#ddd2bc', 'box', { sortY: 5.5 }),
    B([0, 6.6, 6.4], [6, 2.0, 0.8], '#ece2cc', 'colonnade', { cols: 6, sortY: 6.7 }),     // the loggia above
    ...[-1, 1].map((sx) => B([sx * 11.5, 5.0, 4.5], [3, 9.6, 3], '#e0d6c0', 'box', {     // corner pavilions
      tex: 'win', tx: { cols: 1, rows: 3 },
      adorn: [B([0, 5.4, 0], [3.2, 1.4, 3.2], '#4a5058', 'dome')],
    })),
  ],

  // The Palace of the Congress: a long palace of grey stone with a deep
  // columned portico and pediment at its centre, wings either side, and
  // over it all the tall green copper dome on its drum.
  // Street 3: about two dozen pieces.
  congreso: [
    B([0, 0.2, 0], [30, 0.4, 22], '#9a968e', 'box', { tex: 'stone' }),
    B([0, 0.7, 7.5], [14, 0.6, 3], '#c8c0b4', 'box', { tex: 'stone' }),                   // the great stair
    B([0, 1.3, 6.4], [10, 0.6, 2], '#ccc4b8', 'box', { tex: 'stone' }),
    ...[-1, 1].flatMap((sx) => [
      B([sx * 4.5, 3.0, 0], [9, 4.8, 12], '#d4cec2', 'box', { tex: 'arch', tx: { n: 4 } }),
      B([sx * 4.5, 6.8, 0], [9, 2.8, 12], '#d8d2c6', 'box', { tex: 'win', tx: { cols: 4, rows: 1 } }),
      B([sx * 11.5, 2.8, 0], [5, 4.4, 9], '#d0cabe', 'box', { tex: 'arch', tx: { n: 2 } }),   // wings
      B([sx * 11.5, 5.6, 0], [5.2, 1.2, 9.2], '#c4beb2', 'box'),
      B([sx * 8.6, 9.2, 4.6], [2.4, 1.6, 2.4], '#4a8a6a', 'dome', { metal: 1 }),             // corner domes
      B([sx * 3.6, 2.2, 9.4], [0.4, 3.6, 0.4], '#3a3a40', 'cyl', { metal: 1,                // lamps on the stair
        adorn: [B([0, 2.0, 0], [0.6, 0.6, 0.6], '#fff2c0', 'sphere', { em: '#ffe9a0', emI: 1.2 })] }),
    ]),
    B([0, 4.4, 6.6], [7.6, 6.4, 1.4], '#e0dacc', 'colonnade', { cols: 6 }),              // the portico
    B([0, 8.6, 6.6], [8.2, 2.0, 1.8], '#d8d2c6', 'prism'),                                // its pediment
    B([0, 8.4, 0], [18.4, 0.6, 12.4], '#c4beb2', 'box', { sortY: 8.5 }),                  // cornice and balustrade
    B([0, 10.4, -0.5], [7.4, 3.4, 7.4], '#d4cec2', 'cyl', { tex: 'arch', tx: { n: 12 } }),   // the drum
    B([0, 12.6, -0.5], [6.8, 1.0, 6.8], '#c4beb2', 'cyl'),
    B([0, 16.3, -0.5], [7.0, 6.4, 7.0], '#4a8a6a', 'lathe', {                              // the green dome
      metal: 1,
      profile: [[1, 0], [0.98, 0.2], [0.88, 0.45], [0.66, 0.7], [0.36, 0.9], [0.12, 1]],
    }),
    B([0, 20.3, -0.5], [1.2, 1.6, 1.2], '#d4cec2', 'cyl', { tex: 'arch', tx: { n: 6 } }),    // the lantern
    B([0, 21.8, -0.5], [0.3, 1.4, 0.3], '#d8b04a', 'cyl', { metal: 1 }),
  ],
  // Venice. The Rialto Bridge (1588-1591, Antonio da Ponte): one stone arch
  // over the Grand Canal, two rows of shops climbing each ramp, and the
  // arched portico at the top.
  rialto: [
    B([0, 0.15, 0], [30, 0.3, 12], '#3a7a78', 'box', { wet: 1, em: '#4a8a88', emI: 0.15 }),   // the Grand Canal
    B([-13, 0.8, 0], [4, 1.0, 12], '#c8c0b0', 'box', { tex: 'stone' }),                     // the quays
    B([13, 0.8, 0], [4, 1.0, 12], '#c8c0b0', 'box', { tex: 'stone' }),
    B([0, 2.6, 0], [24, 4.4, 8], '#ece6d8', 'extrude', {                                   // the single arch
      outline: [[-0.5, -0.5], [-0.36, -0.5], [-0.28, -0.2], [-0.15, -0.02], [0, 0.04], [0.15, -0.02],
        [0.28, -0.2], [0.36, -0.5], [0.5, -0.5], [0.5, -0.12], [0.25, 0.3], [0, 0.5], [-0.25, 0.3], [-0.5, -0.12]],
    }),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => B([sx * 6.2, 5.0, sz * 2.4], [8.2, 2.2, 2.2], '#f0eadc', 'box', {   // the shops
      tex: 'arch', tx: { n: 6 }, rotZ: -sx * 0.21,
      adorn: [B([0, 1.0, 0], [8.4, 0.24, 2.4], '#a8543a')],
    }))),
    B([0, 6.7, 0], [3.4, 3.0, 7.0], '#f2ecde', 'box', {                                     // the portico at the top
      tex: 'arch', tx: { n: 1 },
      adorn: [B([0, 1.9, 0], [3.8, 0.8, 7.2], '#e8e0d0', 'prism')],
    }),
    ...[-1, 1].flatMap((sx) => [B([sx * 6.0, 4.5, 3.9], [11, 0.5, 0.3], '#e8e2d4', 'box', { rotZ: -sx * 0.21, sortY: 4.9 }),   // balustrades
      B([sx * 6.0, 4.5, -3.9], [11, 0.5, 0.3], '#e8e2d4', 'box', { rotZ: -sx * 0.21, sortY: 4.9 })]),
  ],
  // Santa Maria della Salute (1631-1687, Baldassare Longhena): the octagonal
  // church at the mouth of the Grand Canal, its great dome on a ring of
  // scroll buttresses, a smaller dome and two bell towers behind.
  salute: [
    B([0, 0.15, 0], [32, 0.3, 30], '#3a7a78', 'box', { wet: 1, em: '#4a8a88', emI: 0.15 }),   // the water
    B([0, 0.55, -2], [24, 0.5, 26], '#d8d2c6', 'box', { tex: 'stone' }),                    // the quay
    B([0, 1.1, 0], [19, 0.6, 18.6], '#ece6da', 'tier', { sides: 8 }),                        // the platform
    B([0, 1.0, 10.4], [9, 0.8, 3], '#e8e2d6', 'box', { tex: 'stone' }),                       // the steps up from the water
    B([0, 4.6, 0], [15.6, 6.4, 15.6], '#f0ead8', 'tier', { sides: 8, tex: 'arch', tx: { n: 8 } }),   // the octagon
    B([0, 5.2, 7.6], [6.4, 7.6, 1.4], '#f4eede', 'box', {                                   // the front, a triumphal arch
      tex: 'arch', tx: { n: 1 },
      adorn: [B([0, 4.4, 0], [6.8, 1.4, 1.6], '#ece6d6', 'prism')],
    }),
    ...[[-1, 0], [1, 0]].map(([sx]) => B([sx * 7.0, 4.0, 4.0], [3.4, 5.0, 2.6], '#ece6d6', 'box', {   // side chapels
      tex: 'arch', tx: { n: 1 }, rotY: sx * Math.PI / 4,
      adorn: [B([0, 3.0, 0], [3.6, 1.0, 2.8], '#e4ded0', 'prism')],
    })),
    B([0, 9.4, 0], [11.4, 3.0, 11.4], '#f2ecdc', 'cyl', {                                   // the drum, its scrolls
      tex: 'arch', tx: { n: 16 },
      adorn: Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return B([Math.cos(a) * 5.1, -0.4, Math.sin(a) * 5.1], [1.4, 2.2, 1.0], '#e8e2d2', 'sphere', { rotY: -a });
      }),
    }),
    B([0, 13.6, 0], [11.6, 5.6, 11.6], '#aeb4ba', 'lathe', {                                // the great dome, in lead
      metal: 1,
      profile: [[1, 0], [0.98, 0.2], [0.9, 0.42], [0.72, 0.66], [0.46, 0.86], [0.18, 1]],
    }),
    B([0, 17.6, 0], [2.4, 2.4, 2.4], '#f2ecdc', 'cyl', {                                    // the lantern
      tex: 'arch', tx: { n: 6 },
      adorn: [B([0, 1.6, 0], [1.4, 1.0, 1.4], '#aeb4ba', 'dome', { metal: 1 })],
    }),
    B([0, 6.2, -9.6], [9, 7.6, 6], '#ece6d6', 'box', { tex: 'win', tx: { cols: 3, rows: 2 } }),   // the chancel behind
    B([0, 11.2, -9.6], [6.4, 3.6, 6.4], '#aeb4ba', 'dome', { metal: 1 }),                    // its smaller dome
    ...[-1, 1].map((sx) => B([sx * 5.4, 8.0, -12.0], [1.8, 11, 1.8], '#ece6d6', 'box', {     // two bell towers
      tex: 'arch', tx: { n: 2 },
      adorn: [B([0, 5.9, 0], [1.6, 1.4, 1.6], '#aeb4ba', 'dome', { metal: 1 })],
    })),
  ],
  // The Doge's Palace (mostly 1340-1440): an open arcade on the ground, a
  // loggia of Gothic tracery above it, and above that a high wall of pink and
  // white brick in a diamond pattern with a few great windows; the
  // waterfront and Piazzetta fronts, the Bridge of Sighs (about 1600) on the
  // canal beside it, and the two columns of the Piazzetta.
  dogespalace: [
    B([0, 0.15, -2], [40, 0.3, 34], '#cac4b8', 'box', { tex: 'stone' }),                    // the Molo and Piazzetta
    B([0, 0.1, 14], [40, 0.2, 4], '#3a7a78', 'box', { wet: 1, em: '#4a8a88', emI: 0.15 }),   // the lagoon's edge
    ...[-9.4, 0, 9.4].flatMap((x) => [
      B([x, 2.6, 2], [9.4, 4.6, 8], '#f0ece2', 'box', { tex: 'arch', tx: { n: 3 } }),       // the ground-floor arcade
      B([x, 6.7, 2], [9.4, 3.6, 8], '#f2eee4', 'box', { tex: 'gothic' }),                   // the loggia above
      B([x, 11.7, 2], [9.4, 6.4, 8], '#e8b0a8', 'box', { tex: 'lozenge', tx: { n: 2 } }),   // the pink and white wall
    ]),
    ...[-13, -5].flatMap((z) => [
      B([-10, 2.6, z], [8, 4.6, 8], '#f0ece2', 'box', { tex: 'arch', tx: { n: 3 }, rotY: Math.PI / 2 }),   // the Piazzetta wing
      B([-10, 6.7, z], [8, 3.6, 8], '#f2eee4', 'box', { tex: 'gothic', rotY: Math.PI / 2 }),
      B([-10, 11.7, z], [8, 6.4, 8], '#e8b0a8', 'box', { tex: 'lozenge', tx: { n: 2 }, rotY: Math.PI / 2 }),
    ]),
    B([0, 11.6, 6.4], [3.2, 5.6, 0.8], '#f4f0e6', 'box', { tex: 'gothic', sortY: 11.8 }),    // the great balcony window
    B([2, 15.3, 2], [28.6, 1.0, 8.2], '#9aa0a6', 'box', {                                   // roof, and its cresting
      metal: 1,
      adorn: Array.from({ length: 14 }, (_, i) => B([-13.4 + i * 2.06, 0.3, 3.9], [0.5, 0.4, 0.3], '#f4f0e6')),
    }),
    B([-10, 15.3, -9], [8.2, 1.0, 16.2], '#9aa0a6', 'box', {
      metal: 1,
      adorn: Array.from({ length: 8 }, (_, i) => B([-3.9, 0.3, -7.2 + i * 2.06], [0.3, 0.4, 0.5], '#f4f0e6')),
    }),
    B([15.6, 0.12, 0], [3, 0.24, 28], '#3a7a78', 'box', { wet: 1, em: '#4a8a88', emI: 0.15 }),   // the canal beside it
    B([15.6, 7.4, -1], [3.4, 2.6, 2.2], '#f2eee4', 'box', { tex: 'arch', tx: { n: 1 } }),    // the Bridge of Sighs
    ...[-1, 1].map((s) => B([-17 + s * 3.2, 5.6, 9.5], [1.0, 11.2, 1.0], '#e8e2d6', 'cyl', {   // the Piazzetta's columns
      adorn: [B([0, 5.9, 0], [1.4, 0.6, 1.4], '#e0d8c8', 'box'),
        B([0, 6.8, 0], [1.2, 1.2, 1.2], s < 0 ? '#5a6a5a' : '#e8e2d6', 'statue', { figs: 1 })],
    })),
  ],
};

export function getLandmark(id) { return defs[id]; }
