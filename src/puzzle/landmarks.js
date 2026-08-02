// Every monument is a list of blocks:
//   { p:[x,y,z], s:[w,h,d], c:'#hex', shape, rotX/rotY/rotZ, tex, tx, glass, metal, ... }
// shape: 'box' (default) | 'cyl' | 'cone4' | 'pyramid' | 'dome' | 'sphere' | 'torus'
//        | 'pod' | 'clock' | 'archvault' | 'prism' | 'spokes' | 'water' | 'cable'
//        | 'arcseg' | 'colonnade' | 'turrets' | 'statue' | 'rock' | 'arch'
//        | 'tier' | 'eifleg' | 'chain' | 'walkway'
// tex (canvas texture painted in the block color): 'win' | 'strip' | 'arch'
//        | 'archcut' | 'gothic' | 'relief' | 'glass' | 'crown' | 'lattice'
//        | 'ashlar' | 'niche'
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
function eifleg(x0, z0, x1, z1, h, r, c) {
  return B([(x0 + x1) / 2, h / 2, (z0 + z1) / 2], [Math.abs(x0 - x1) + r * 2, h, Math.abs(z0 - z1) + r * 2],
    c, 'eifleg', { leg: { x0, z0, x1, z1, h, r }, em: '#ff9d5a', emI: 0.08 });
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
    B([0, 1.25, 0], [6.4, 2.5, 6.4], '#d8d2c4', 'box', { tex: 'win', tx: { cols: 8, rows: 2 } }),
    // corner setback shoulders
    B([2.55, 3.1, 2.55], [1.5, 1.2, 1.5], '#ccc6b6'),
    B([-2.55, 3.1, 2.55], [1.5, 1.2, 1.5], '#ccc6b6'),
    B([2.55, 3.1, -2.55], [1.5, 1.2, 1.5], '#ccc6b6'),
    B([-2.55, 3.1, -2.55], [1.5, 1.2, 1.5], '#ccc6b6'),
    B([0, 4.8, 0], [5.2, 4.6, 5.2], '#ded8ca', 'box', { tex: 'win', tx: { cols: 7, rows: 5 } }),
    B([0, 8.8, 0], [4.3, 3.4, 4.3], '#d4cec0', 'box', { tex: 'win', tx: { cols: 6, rows: 4 } }),
    B([0, 11.6, 0], [3.6, 2.2, 3.6], '#ded8ca', 'box', { tex: 'win', tx: { cols: 5, rows: 2 } }),
    // chrome eagles, 3x bigger so they read from the plaza
    B([2.1, 13.1, 2.1], [1.0, 0.85, 2.7], '#e6ebf4', 'box', { rotY: -Math.PI / 4, metal: 1 }),
    B([-2.1, 13.1, 2.1], [1.0, 0.85, 2.7], '#e6ebf4', 'box', { rotY: Math.PI / 4, metal: 1 }),
    B([2.1, 13.1, -2.1], [1.0, 0.85, 2.7], '#e6ebf4', 'box', { rotY: -3 * Math.PI / 4, metal: 1 }),
    B([-2.1, 13.1, -2.1], [1.0, 0.85, 2.7], '#e6ebf4', 'box', { rotY: 3 * Math.PI / 4, metal: 1 }),
    // chrome sunburst crown: telescoping tiers with dark triangular windows
    B([0, 13.55, 0], [3.6, 1.7, 2.75], '#e6ebf4', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.16 }),
    B([0, 15.1, 0], [2.75, 1.55, 2.05], '#dde3ee', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.18 }),
    B([0, 16.5, 0], [2.05, 1.4, 1.45], '#e6ebf4', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.2 }),
    B([0, 17.75, 0], [1.45, 1.2, 0.92], '#dde3ee', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.24 }),
    B([0, 18.8, 0], [0.92, 0.95, 0.48], '#eef2f8', 'tier', { tex: 'crown', metal: 1, em: '#fff2d8', emI: 0.28 }),
    B([0, 19.62, 0], [0.48, 0.75, 0.16], '#f2f5fa', 'tier', { metal: 1, em: '#fff2d8', emI: 0.3 }),
    B([0, 21.3, 0], [0.13, 2.9, 0.13], '#f4f7fb', 'cyl', { metal: 1, em: '#fff2d8', emI: 0.35 }),
  ],

  // Brooklyn Bridge: scaled up ~30%, deck approach ramps reaching the plaza
  // edges, main catenary cables 3x thicker (suspenders stay thin).
  brooklyn: [
    B([-10.8, 2.2, 0], [2.5, 3.4, 4.3], '#a89a80', 'box', { tex: 'relief' }),
    B([10.8, 2.2, 0], [2.5, 3.4, 4.3], '#a89a80', 'box', { tex: 'relief' }),
    // approach ramps sloping down to the plaza edges
    B([-14.9, 2.2, 0], [7.0, 0.6, 3.9], '#7d6f5a', 'box', { rotZ: -0.35 }),
    B([14.9, 2.2, 0], [7.0, 0.6, 3.9], '#7d6f5a', 'box', { rotZ: 0.35 }),
    B([-7.4, 3.4, 0], [7.2, 0.6, 3.9], '#867860'),
    B([0, 3.4, 0], [8.1, 0.6, 3.9], '#93846c'),
    B([7.4, 3.4, 0], [7.2, 0.6, 3.9], '#867860'),
    B([-6.0, 7.0, 0], [3.3, 8.6, 4.3], '#b2a488', 'box', { tex: 'gothic' }),
    B([6.0, 7.0, 0], [3.3, 8.6, 4.3], '#b2a488', 'box', { tex: 'gothic' }),
    B([-6.0, 11.6, 0], [3.8, 0.65, 4.8], '#c4b294'),
    B([6.0, 11.6, 0], [3.8, 0.65, 4.8], '#c4b294'),
    B([0, 3.5, 1.7], [22.6, 0.7, 0.3], '#efeadb', 'cable',
      { sortY: 12, cable: { towerX: 6.0, topY: 11.2, midY: 4.35, endX: 11.2, endY: 3.5, deckY: 3.7, hangers: 11, r: 0.27 } }),
    B([0, 3.5, -1.7], [22.6, 0.7, 0.3], '#efeadb', 'cable',
      { sortY: 12, cable: { towerX: 6.0, topY: 11.2, midY: 4.35, endX: 11.2, endY: 3.5, deckY: 3.7, hangers: 11, r: 0.27 } }),
  ],

  // ================= PARIS =================
  // Eiffel: dark iron-bronze, +30% height, thin curved legs flowing
  // continuously into a thin trussed first platform, high-contrast lattice.
  eiffel: [
    eifleg(-3.4, -3.4, -1.62, -1.62, 6.0, 0.28, '#3f342c'),
    eifleg(3.4, -3.4, 1.62, -1.62, 6.0, 0.28, '#3f342c'),
    eifleg(-3.4, 3.4, -1.62, 1.62, 6.0, 0.28, '#3f342c'),
    eifleg(3.4, 3.4, 1.62, 1.62, 6.0, 0.28, '#3f342c'),
    // thin connecting arches tucked between the legs
    B([0, 3.1, 2.35], [4.8, 4.8, 0.22], '#453a31', 'arch'),
    B([0, 3.1, -2.35], [4.8, 4.8, 0.22], '#453a31', 'arch'),
    B([2.35, 3.1, 0], [4.8, 4.8, 0.22], '#453a31', 'arch', { rotY: Math.PI / 2 }),
    B([-2.35, 3.1, 0], [4.8, 4.8, 0.22], '#453a31', 'arch', { rotY: Math.PI / 2 }),
    // first platform: thin truss, gold-lit underside so the deck separates
    B([0, 6.1, 0], [4.9, 0.3, 4.9], '#54463a', 'box', { tex: 'lattice', em: '#ffb96a', emI: 0.3 }),
    B([0, 9.15, 0], [3.1, 6.0, 3.1], '#463b32', 'cone4', { tex: 'lattice', em: '#ff9d5a', emI: 0.1 }),
    B([0, 12.3, 0], [2.5, 0.24, 2.5], '#54463a', 'box', { tex: 'lattice', em: '#ffb96a', emI: 0.3 }),
    B([0, 15.9, 0], [1.85, 7.0, 1.85], '#463b32', 'cone4', { tex: 'lattice', em: '#ff9d5a', emI: 0.1 }),
    B([0, 19.5, 0], [1.1, 0.18, 1.1], '#54463a', 'box', { em: '#ffb96a', emI: 0.36 }),
    B([0, 20.1, 0], [0.7, 0.6, 0.7], '#4c4036', 'box', { tex: 'lattice', em: '#ffd9a0', emI: 0.16 }),
    B([0, 22.0, 0], [0.09, 3.4, 0.09], '#8a7458', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.7 }),
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
  // Big Ben: limestone ashlar panels with gothic ribs, glowing warm-ivory
  // clock faces with bold hands and a gold ring, stretched belfry.
  bigben: [
    B([0, 0.35, 0], [4.0, 0.7, 4.0], '#b6ab8d'),                 // plinth
    B([0, 2.9, 0], [3.5, 4.4, 3.5], '#d4c9a8', 'box', { tex: 'ashlar' }),
    B([0, 7.2, 0], [3.25, 4.2, 3.25], '#cbbf9e', 'box', { tex: 'ashlar' }),
    B([0, 11.3, 0], [3.25, 4.0, 3.25], '#d4c9a8', 'box', { tex: 'ashlar' }),
    B([0, 14.35, 0], [3.7, 2.4, 3.7], '#ded3b0', 'box', { tex: 'relief', em: '#ffd9a0', emI: 0.14 }),
    B([0, 14.35, 1.93], [2.55, 2.55, 0.22], '#f8f1da', 'clock'),
    B([0, 14.35, -1.93], [2.55, 2.55, 0.22], '#f8f1da', 'clock'),
    B([1.93, 14.35, 0], [2.55, 2.55, 0.22], '#f8f1da', 'clock', { rotY: Math.PI / 2 }),
    B([-1.93, 14.35, 0], [2.55, 2.55, 0.22], '#f8f1da', 'clock', { rotY: Math.PI / 2 }),
    // belfry stretched ~20%
    B([0, 16.5, 0], [3.05, 1.95, 3.05], '#cbbf9e', 'box', { tex: 'arch', tx: { n: 3 } }),
    B([0, 19.05, 0], [2.75, 3.2, 2.75], '#5e7258', 'cone4'),
    B([0, 21.15, 0], [1.15, 1.75, 1.15], '#cfae6c', 'cone4', { metal: 1, em: '#ffd9a0', emI: 0.45 }),
    B([0, 22.5, 0], [0.18, 1.3, 0.18], '#e6d29e', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.55 }),
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
    // A-frame front legs (base splayed wide + forward, meeting at the hub)
    B([-1.27, 4.1, 1.25], [0.62, 8.9, 0.62], '#f0ece2', 'cyl', { rotZ: -0.3, rotX: -0.25, em: '#ffd9a0', emI: 0.16 }),
    B([1.27, 4.1, 1.25], [0.62, 8.9, 0.62], '#f0ece2', 'cyl', { rotZ: 0.3, rotX: -0.25, em: '#ffd9a0', emI: 0.16 }),
    // A-frame cross-brace + rear back-leaning stay struts
    B([0, 5.6, 1.0], [2.6, 0.24, 0.24], '#e0dcd2', 'box', { rotX: -0.25 }),
    B([-0.62, 4.15, -1.35], [0.34, 8.6, 0.34], '#c5ccd6', 'cyl', { rotZ: -0.14, rotX: 0.3 }),
    B([0.62, 4.15, -1.35], [0.34, 8.6, 0.34], '#c5ccd6', 'cyl', { rotZ: 0.14, rotX: 0.3 }),
    // rim + a warm gold rim-light ring just inside it
    B([0, 8.2, 0], [13.0, 13.0, 0.40], '#f4f6fa', 'torus', { em: '#ffd9a0', emI: 0.55 }),
    B([0, 8.2, 0], [12.1, 12.1, 0.16], '#e8b45e', 'torus', { metal: 1, em: '#ffc46a', emI: 0.95 }),
    B([0, 8.2, 0], [12.4, 0.13, 0.13], '#d6dbe4', 'spokes', { n: 12, spin: 0.11, em: '#ffd9a0', emI: 0.3 }),
    B([0, 8.2, 0], [1.9, 1.5, 1.9], '#8d97a6', 'cyl', { rotX: Math.PI / 2, em: '#ffc266', emI: 1.0 }),
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
};

export function getLandmark(id) { return defs[id]; }
