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
    c, 'eifleg', { leg: { x0, z0, x1, z1, h, r, y0 }, em: '#ff9d5a', emI: 0.08 });
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
  // Eiffel: dark iron-bronze, +30% height, thin curved legs flowing
  // continuously into a thin trussed first platform, high-contrast lattice.
  eiffel: [
    // Real proportions, as fractions of the 330m height: base 0.38 wide, first
    // platform at 0.17, second at 0.35, third at 0.84. The old tower had the
    // first two at 0.26 and 0.52 on a base only 0.29 wide, which stretched the
    // middle and read as a radio mast. The four legs also stay separate piers
    // right up to the SECOND platform, as the real ones do, instead of merging
    // at the first. Colour is the lighter "Eiffel Tower brown" it is painted,
    // not near-black; the lattice texture darkens it further on its own.
    eifleg(-5.1, -5.1, -2.85, -2.85, 4.6, 0.64, '#5d4c3d'),
    eifleg(5.1, -5.1, 2.85, -2.85, 4.6, 0.64, '#5d4c3d'),
    eifleg(-5.1, 5.1, -2.85, 2.85, 4.6, 0.64, '#5d4c3d'),
    eifleg(5.1, 5.1, 2.85, 2.85, 4.6, 0.64, '#5d4c3d'),
    // the four great arches, springing near the ground and meeting the
    // underside of the first platform — sortY brings them after the legs
    B([0, -0.2, 4.1], [9.2, 4.6, 0.62], '#6b5843', 'arch', { sortY: 3.0 }),
    B([0, -0.2, -4.1], [9.2, 4.6, 0.62], '#6b5843', 'arch', { sortY: 3.0 }),
    B([4.1, -0.2, 0], [9.2, 4.6, 0.62], '#6b5843', 'arch', { rotY: Math.PI / 2, sortY: 3.0 }),
    B([-4.1, -0.2, 0], [9.2, 4.6, 0.62], '#6b5843', 'arch', { rotY: Math.PI / 2, sortY: 3.0 }),
    // first platform, wider than the legs beneath it, arriving with its rails
    B([0, 4.8, 0], [6.6, 0.45, 6.6], '#6a5742', 'box', {
      tex: 'lattice', em: '#ffb96a', emI: 0.3,
      adorn: [
        B([0, 0.4, 3.26], [6.6, 0.34, 0.07], '#7a664e'),
        B([0, 0.4, -3.26], [6.6, 0.34, 0.07], '#7a664e'),
        B([3.26, 0.4, 0], [0.07, 0.34, 6.6], '#7a664e'),
        B([-3.26, 0.4, 0], [0.07, 0.34, 6.6], '#7a664e'),
      ],
    }),
    // second storey: the same four piers, leaning in to meet the second platform
    eifleg(-2.55, -2.55, -1.45, -1.45, 9.4, 0.42, '#5d4c3d', 5.0),
    eifleg(2.55, -2.55, 1.45, -1.45, 9.4, 0.42, '#5d4c3d', 5.0),
    eifleg(-2.55, 2.55, -1.45, 1.45, 9.4, 0.42, '#5d4c3d', 5.0),
    eifleg(2.55, 2.55, 1.45, 1.45, 9.4, 0.42, '#5d4c3d', 5.0),
    B([0, 9.55, 0], [3.7, 0.35, 3.7], '#6a5742', 'box', {
      tex: 'lattice', em: '#ffb96a', emI: 0.3,
      adorn: [
        B([0, 0.34, 1.83], [3.7, 0.3, 0.06], '#7a664e'),
        B([0, 0.34, -1.83], [3.7, 0.3, 0.06], '#7a664e'),
        B([1.83, 0.34, 0], [0.06, 0.3, 3.7], '#7a664e'),
        B([-1.83, 0.34, 0], [0.06, 0.3, 3.7], '#7a664e'),
      ],
    }),
    // the long taper to the top, in two lifts
    B([0, 13.1, 0], [2.9, 6.8, 2.9], '#5a493b', 'cone4', { tex: 'lattice', em: '#ff9d5a', emI: 0.1 }),
    B([0, 19.6, 0], [1.3, 6.2, 1.3], '#5a493b', 'cone4', { tex: 'lattice', em: '#ff9d5a', emI: 0.1 }),
    // third platform, and the lantern-topped campanile above it
    B([0, 22.8, 0], [1.5, 0.22, 1.5], '#6a5742', 'box', { em: '#ffb96a', emI: 0.36 }),
    B([0, 23.6, 0], [1.1, 1.4, 1.1], '#62503f', 'lathe', {
      profile: [[0.95, 0], [0.95, 0.42], [0.62, 0.5], [0.62, 0.78], [0.34, 0.84], [0.18, 1]],
      seg: 8, em: '#ffd9a0', emI: 0.22,
    }),
    B([0, 25.8, 0], [0.09, 3.0, 0.09], '#8a7458', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.7 }),
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
};

export function getLandmark(id) { return defs[id]; }
