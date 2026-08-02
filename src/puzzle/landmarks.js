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

// vertical ring in the x/y plane (for the Eye's capsules on its rim)
function vring(cy, r, n, size, c, shape, extra = {}) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    out.push({ p: [Math.cos(a) * r, cy + Math.sin(a) * r, 0], s: size, c, shape, ...extra });
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
    eifleg(-3.4, -3.4, -1.62, -1.62, 6.0, 0.3, '#4a3c30'),
    eifleg(3.4, -3.4, 1.62, -1.62, 6.0, 0.3, '#4a3c30'),
    eifleg(-3.4, 3.4, -1.62, 1.62, 6.0, 0.3, '#4a3c30'),
    eifleg(3.4, 3.4, 1.62, 1.62, 6.0, 0.3, '#4a3c30'),
    // thin connecting arches tucked between the legs
    B([0, 3.1, 2.35], [4.8, 4.8, 0.24], '#55463a', 'arch'),
    B([0, 3.1, -2.35], [4.8, 4.8, 0.24], '#55463a', 'arch'),
    B([2.35, 3.1, 0], [4.8, 4.8, 0.24], '#55463a', 'arch', { rotY: Math.PI / 2 }),
    B([-2.35, 3.1, 0], [4.8, 4.8, 0.24], '#55463a', 'arch', { rotY: Math.PI / 2 }),
    // first platform: thin truss
    B([0, 6.1, 0], [4.7, 0.26, 4.7], '#5a4a3a', 'box', { tex: 'lattice', em: '#ffb96a', emI: 0.14 }),
    B([0, 9.15, 0], [3.1, 6.0, 3.1], '#4e4034', 'cone4', { tex: 'lattice', em: '#ff9d5a', emI: 0.08 }),
    B([0, 12.3, 0], [2.4, 0.2, 2.4], '#5a4a3a', 'box', { tex: 'lattice', em: '#ffb96a', emI: 0.14 }),
    B([0, 15.9, 0], [1.85, 7.0, 1.85], '#4e4034', 'cone4', { tex: 'lattice', em: '#ff9d5a', emI: 0.08 }),
    B([0, 19.5, 0], [1.05, 0.16, 1.05], '#5a4a3a', 'box', { em: '#ffb96a', emI: 0.18 }),
    B([0, 20.05, 0], [0.68, 0.55, 0.68], '#55463a', 'box', { tex: 'lattice' }),
    B([0, 22.0, 0], [0.09, 3.4, 0.09], '#6a5a48', 'cyl', { em: '#ffd9a0', emI: 0.5 }),
  ],

  // Arc de Triomphe: attic flush with the legs, inset vault for shadow
  // depth, grander arch opening, sculpture groups at the leg bases.
  arc: [
    B([-3.45, 1.2, 2.2], [1.9, 2.4, 0.55], '#e4d6b4', 'statue'),
    B([3.45, 1.2, 2.2], [1.9, 2.4, 0.55], '#e4d6b4', 'statue'),
    B([-3.45, 1.2, -2.2], [1.9, 2.4, 0.55], '#e4d6b4', 'statue'),
    B([3.45, 1.2, -2.2], [1.9, 2.4, 0.55], '#e4d6b4', 'statue'),
    B([-3.45, 3.7, 0], [2.1, 7.4, 3.6], '#ded0ae', 'box', { tex: 'relief' }),
    B([3.45, 3.7, 0], [2.1, 7.4, 3.6], '#ded0ae', 'box', { tex: 'relief' }),
    // vault panel inset 0.5 each side for shadow depth; grand open arch
    B([0, 7.0, 0], [4.85, 4.8, 2.6], '#e6d8b6', 'box', { tex: 'archcut', tx: { n: 1, open: 1 } }),
    B([0, 9.9, 0], [9.0, 1.6, 3.9], '#d8caa8'),
    B([0, 11.05, 0], [9.0, 0.7, 3.9], '#c9ba96', 'box', { tex: 'relief' }),
    // attic flush with the legs (outer edge ±4.5)
    B([0, 11.9, 0], [9.0, 1.0, 3.6], '#e0d3b2', 'box', { tex: 'relief' }),
    B([0, 12.55, 0], [9.0, 0.3, 3.8], '#cfc09c'),
  ],

  // Louvre: regular diamond-grid glass pyramid lit from within, slate
  // blue-grey palace roofs with dormer hints, warm light pools.
  louvre: [
    B([0, 0.22, 0.6], [17, 0.44, 14], '#bcac8c'),
    B([0, 2.55, -5.6], [17, 4.7, 2.4], '#d2c29c', 'box', { tex: 'win', tx: { cols: 15, rows: 3 } }),
    B([0, 5.45, -5.6], [17, 1.1, 2.6], '#525b74', 'box', { tex: 'win', tx: { cols: 11, rows: 1 } }),
    B([-8.1, 2.55, 0.4], [2.4, 4.7, 9.6], '#d2c29c', 'box', { tex: 'win', tx: { cols: 3, rows: 3 } }),
    B([8.1, 2.55, 0.4], [2.4, 4.7, 9.6], '#d2c29c', 'box', { tex: 'win', tx: { cols: 3, rows: 3 } }),
    B([-8.1, 5.35, 0.4], [2.6, 0.9, 9.8], '#525b74'),
    B([8.1, 5.35, 0.4], [2.6, 0.9, 9.8], '#525b74'),
    B([0, 3.0, 1.2], [7.6, 5.6, 7.6], '#cfe6f4', 'pyramid', { glass: 1, op: 0.55, tex: 'glass', em: '#ffd9a0', emI: 0.3 }),
    B([-5.3, 1.15, 1.2], [2.0, 1.9, 2.0], '#cfe6f4', 'pyramid', { glass: 1, op: 0.55, tex: 'glass', em: '#ffd9a0', emI: 0.25 }),
    B([5.3, 1.15, 1.2], [2.0, 1.9, 2.0], '#cfe6f4', 'pyramid', { glass: 1, op: 0.55, tex: 'glass', em: '#ffd9a0', emI: 0.25 }),
    B([0, 1.15, 5.9], [2.0, 1.9, 2.0], '#cfe6f4', 'pyramid', { glass: 1, op: 0.55, tex: 'glass', em: '#ffd9a0', emI: 0.25 }),
    B([-4.9, 0.55, 4.6], [3.0, 0.26, 3.0], '#3fa8c8', 'water', { em: '#ffd9a0', emI: 0.45 }),
    B([4.9, 0.55, 4.6], [3.0, 0.26, 3.0], '#3fa8c8', 'water', { em: '#ffd9a0', emI: 0.45 }),
  ],

  // ================= LONDON =================
  // Big Ben: limestone ashlar panels with gothic ribs, glowing warm-ivory
  // clock faces with bold hands and a gold ring, stretched belfry.
  bigben: [
    B([0, 2.3, 0], [3.4, 4.6, 3.4], '#cfc4a4', 'box', { tex: 'ashlar' }),
    B([0, 6.75, 0], [3.15, 4.3, 3.15], '#c6ba9a', 'box', { tex: 'ashlar' }),
    B([0, 10.9, 0], [3.15, 4.0, 3.15], '#cfc4a4', 'box', { tex: 'ashlar' }),
    B([0, 13.95, 0], [3.6, 2.3, 3.6], '#d8cdac', 'box', { tex: 'relief' }),
    B([0, 13.95, 1.87], [2.4, 2.4, 0.2], '#f6eed6', 'clock'),
    B([0, 13.95, -1.87], [2.4, 2.4, 0.2], '#f6eed6', 'clock'),
    B([1.87, 13.95, 0], [2.4, 2.4, 0.2], '#f6eed6', 'clock', { rotY: Math.PI / 2 }),
    B([-1.87, 13.95, 0], [2.4, 2.4, 0.2], '#f6eed6', 'clock', { rotY: Math.PI / 2 }),
    // belfry stretched ~20%
    B([0, 16.0, 0], [3.0, 1.85, 3.0], '#c6ba9a', 'box', { tex: 'arch', tx: { n: 3 } }),
    B([0, 18.5, 0], [2.7, 3.15, 2.7], '#5e7258', 'cone4'),
    B([0, 20.6, 0], [1.1, 1.7, 1.1], '#cfae6c', 'cone4', { metal: 1, em: '#ffd9a0', emI: 0.3 }),
    B([0, 21.9, 0], [0.18, 1.3, 0.18], '#e6d29e', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.35 }),
  ],

  // Tower Bridge: pale stone towers with corner turrets, saturated
  // steel-blue raised walkways with white rails + suspender rods, and
  // suspension chains that sweep up from the anchors to tower mid-height.
  towerbridge: [
    B([0, 1.35, 0], [18, 0.6, 3.2], '#7a8090'),
    B([-8.7, 1.7, 0], [1.9, 2.8, 3.6], '#e6dec8', 'box', { tex: 'relief' }),
    B([8.7, 1.7, 0], [1.9, 2.8, 3.6], '#e6dec8', 'box', { tex: 'relief' }),
    B([-4.6, 4.9, 0], [3.2, 6.9, 3.2], '#eae2cc', 'box', { tex: 'gothic' }),
    B([4.6, 4.9, 0], [3.2, 6.9, 3.2], '#eae2cc', 'box', { tex: 'gothic' }),
    B([-4.6, 8.7, 0], [3.6, 0.7, 3.6], '#f0e9d4'),
    B([4.6, 8.7, 0], [3.6, 0.7, 3.6], '#f0e9d4'),
    B([-4.6, 10.15, 0], [3.4, 2.7, 3.4], '#ede5cf', 'turrets'),
    B([4.6, 10.15, 0], [3.4, 2.7, 3.4], '#ede5cf', 'turrets'),
    // raised steel-blue walkways with white rails + suspender rods
    B([0, 7.45, 0], [6.2, 0.55, 1.6], '#5a8fc0', 'walkway', { walk: { rods: 7, drop: 1.1 }, em: '#8fb8e0', emI: 0.1, sortY: 9.6 }),
    B([0, 8.7, 0], [6.2, 0.55, 1.6], '#5a8fc0', 'walkway', { walk: { rods: 0, drop: 0 }, em: '#8fb8e0', emI: 0.1, sortY: 9.7 }),
    // suspension chains sweeping UP from anchors to tower mid-height
    B([-6.6, 5.3, 0], [4.6, 4.6, 2.9], '#5a8fc0', 'chain',
      { sortY: 10, chain: { x0: -8.75, y0: 3.15, x1: -4.5, y1: 7.35, sag: 0.9, z: 1.25, r: 0.15, deckY: 1.65, rods: 3 } }),
    B([6.6, 5.3, 0], [4.6, 4.6, 2.9], '#5a8fc0', 'chain',
      { sortY: 10, chain: { x0: 8.75, y0: 3.15, x1: 4.5, y1: 7.35, sag: 0.9, z: 1.25, r: 0.15, deckY: 1.65, rods: 3 } }),
  ],

  // London Eye: A-frame back-leaning legs, warm gold rim-light + hub glow,
  // big readable ovoid capsules mounted outboard of the rim, slow rotation.
  eye: [
    B([0, 0.7, 2.4], [5.8, 0.6, 2.4], '#8b95a2'),
    // A-frame front legs (base splayed wide + forward, meeting at the hub)
    B([-1.27, 4.1, 1.25], [0.48, 8.9, 0.48], '#dde2ea', 'cyl', { rotZ: -0.3, rotX: -0.25 }),
    B([1.27, 4.1, 1.25], [0.48, 8.9, 0.48], '#dde2ea', 'cyl', { rotZ: 0.3, rotX: -0.25 }),
    // rear stay struts
    B([-0.55, 4.15, -1.05], [0.26, 8.5, 0.26], '#c9cfd9', 'cyl', { rotZ: -0.13, rotX: 0.26 }),
    B([0.55, 4.15, -1.05], [0.26, 8.5, 0.26], '#c9cfd9', 'cyl', { rotZ: 0.13, rotX: 0.26 }),
    B([0, 8.2, 0], [13.0, 13.0, 0.34], '#eef1f6', 'torus', { em: '#ffd9a0', emI: 0.3 }),
    B([0, 8.2, 0], [12.4, 0.13, 0.13], '#ccd3dd', 'spokes', { n: 10, spin: 0.12, em: '#ffd9a0', emI: 0.16 }),
    B([0, 8.2, 0], [1.5, 1.3, 1.5], '#9aa4b2', 'cyl', { rotX: Math.PI / 2, em: '#ffc97a', emI: 0.55 }),
    ...vring(8.2, 7.1, 10, [1.7, 1.05, 1.05], '#bfe0f2', 'pod', { glass: 1, op: 0.85, em: '#ffe2b0', emI: 0.3, sortY: 9.5 }),
  ],

  // ================= ROME =================
  // Colosseum: travertine white-grey, warm AO inside darker arches,
  // dramatic broken-rim height jump, scaled up ~20%.
  colosseum: [
    B([0, 0.45, 0], [15.4, 0.9, 15.4], '#b9a98c', 'cyl'),
    ...arcade(2.5, 6.85, 3.0, 8, '#ded7c8', 'archcut', 3),
    ...arcade(5.5, 6.65, 3.0, 8, '#d4cdbc', 'archcut', 3),
    ...arcade(8.7, 6.5, 3.4, 5, '#c8c1b0', 'archcut', 2, 0.62, -0.35),
    B([5.9, 1.3, 3.4], [1.5, 1.0, 1.3], '#cfc8b8', 'rock'),
    B([-4.9, 1.25, -4.5], [1.3, 0.9, 1.2], '#c4bdac', 'rock'),
  ],

  // Trevi Fountain: arched statue niches + central triumphal arch,
  // Oceanus figure, cascading travertine rock shelf spilling into a pool
  // with stepped falls and foam rings.
  trevi: [
    B([0, 3.3, -1.5], [12.5, 6.6, 1.7], '#e6d9b6', 'box', { tex: 'niche', tx: { n: 5 } }),
    B([0, 7.25, -1.5], [12.5, 1.2, 1.9], '#d6c7a2', 'box', { tex: 'relief' }),
    B([0, 8.45, -1.5], [0.8, 1.4, 0.6], '#eee3c8', 'statue'),
    B([-3.1, 8.4, -1.5], [0.7, 1.3, 0.55], '#eee3c8', 'statue'),
    B([3.1, 8.4, -1.5], [0.7, 1.3, 0.55], '#eee3c8', 'statue'),
    // central triumphal-arch bay, projecting forward
    B([0, 3.5, -0.7], [4.4, 6.6, 1.4], '#f2e8ca', 'box', { tex: 'archcut', tx: { n: 1 } }),
    B([-3.0, 3.3, -0.5], [2.3, 4.4, 0.9], '#ecdfc0', 'colonnade', { cols: 2 }),
    B([3.0, 3.3, -0.5], [2.3, 4.4, 0.9], '#ecdfc0', 'colonnade', { cols: 2 }),
    // Oceanus commanding the central niche
    B([0, 3.15, -0.25], [1.6, 3.3, 1.0], '#f6eed8', 'statue', { em: '#ffd9a0', emI: 0.12 }),
    // cascading travertine rock shelf across the facade width
    B([-4.3, 1.05, 0.5], [1.7, 1.3, 1.4], '#cdb890', 'rock'),
    B([-2.2, 1.25, 0.75], [1.9, 1.5, 1.5], '#d5c098', 'rock'),
    B([0, 1.0, 1.0], [2.1, 1.3, 1.6], '#cdb890', 'rock'),
    B([2.2, 1.25, 0.75], [1.9, 1.5, 1.5], '#d5c098', 'rock'),
    B([4.3, 1.05, 0.5], [1.7, 1.3, 1.4], '#cdb890', 'rock'),
    // stepped water falls
    B([0, 1.7, 0.45], [3.2, 0.3, 1.2], '#63c8de', 'box', { wet: 1, sortY: 2.1 }),
    B([0, 1.0, 1.25], [5.4, 0.28, 1.7], '#54bcd6', 'box', { wet: 1, sortY: 2.2 }),
    // basin rim, pool, foam rings
    B([0, 0.55, 1.5], [10.2, 0.6, 0.6], '#dbcea8', 'arch', { rotX: Math.PI / 2 }),
    B([0, 0.42, 1.5], [8.6, 0.26, 8.6], '#3fa8c8', 'water'),
    B([-1.6, 0.58, 1.9], [2.0, 0, 0.1], '#e8f6fa', 'torus', { rotX: Math.PI / 2, wet: 1, sortY: 2.3 }),
    B([1.7, 0.58, 2.3], [1.5, 0, 0.09], '#e8f6fa', 'torus', { rotX: Math.PI / 2, wet: 1, sortY: 2.3 }),
  ],

  // Pantheon: unified grey-brown Roman concrete dome + rotunda with a
  // merged junction, glowing warm oculus, fluted (faceted) columns.
  pantheon: [
    B([0, 0.5, 2.8], [9.2, 1.0, 4.2], '#b3a48e'),
    B([0, 3.4, -2.2], [8.4, 6.8, 8.4], '#96887a', 'cyl'),
    B([-2.2, 2.9, 3.9], [3.9, 3.8, 0.8], '#d2c5aa', 'colonnade', { cols: 4 }),
    B([2.2, 2.9, 3.9], [3.9, 3.8, 0.8], '#d2c5aa', 'colonnade', { cols: 4 }),
    B([0, 2.9, 2.3], [7.2, 3.8, 0.8], '#c8bb9e', 'colonnade', { cols: 5 }),
    B([0, 5.35, 3.1], [8.8, 1.1, 3.2], '#b3a48e'),
    B([0, 6.9, 3.1], [9.2, 2.0, 3.2], '#bcae96', 'prism'),
    // merged junction ring, same concrete as the dome
    B([0, 7.15, -2.2], [8.2, 0.9, 8.2], '#8f8274', 'cyl'),
    B([0, 8.05, -2.2], [7.4, 3.7, 7.4], '#8f8274', 'dome'),
    B([0, 11.6, -2.2], [1.5, 0.55, 1.5], '#d8c090', 'cyl', { em: '#ffce8a', emI: 0.9 }),
  ],
};

export function getLandmark(id) { return defs[id]; }
