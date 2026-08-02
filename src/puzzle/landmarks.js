// Every monument is a list of blocks:
//   { p:[x,y,z], s:[w,h,d], c:'#hex', shape, rotX/rotY/rotZ, tex, tx, glass, metal, ... }
// shape: 'box' (default) | 'cyl' | 'cone4' | 'pyramid' | 'dome' | 'sphere' | 'torus'
//        | 'pod' | 'clock' | 'archvault' | 'prism' | 'spokes' | 'water' | 'cable'
//        | 'arcseg' | 'colonnade' | 'turrets' | 'statue' | 'rock' | 'arch'
// tex (canvas texture painted in the block color): 'win' | 'strip' | 'arch'
//        | 'archcut' | 'gothic' | 'relief' | 'glass' | 'crown' | 'lattice'
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

const defs = {
  // ================= NEW YORK =================
  // Empire State: broad limestone base, telescoping art-deco setbacks,
  // vertical window ribs, crown drum + chrome mast.
  empire: [
    B([0, 1.0, 0], [8.6, 2.0, 8.6], '#a79a80', 'box', { tex: 'win', tx: { cols: 11, rows: 2 } }),
    B([0, 2.95, 0], [7.0, 1.9, 7.0], '#b2a58a', 'box', { tex: 'win', tx: { cols: 9, rows: 2 } }),
    B([0, 5.4, 0], [5.4, 3.0, 5.4], '#ab9e83', 'box', { tex: 'strip' }),
    B([0, 9.3, 0], [4.3, 4.8, 4.3], '#b6a98c', 'box', { tex: 'strip' }),
    B([0, 12.7, 0], [3.5, 2.0, 3.5], '#ab9e83', 'box', { tex: 'strip' }),
    B([0, 14.5, 0], [2.8, 1.6, 2.8], '#b6a98c', 'box', { tex: 'strip' }),
    B([0, 15.9, 0], [2.2, 1.2, 2.2], '#c0b294', 'box', { tex: 'strip' }),
    B([0, 17.0, 0], [1.6, 1.0, 1.6], '#b6a98c', 'box', { tex: 'strip' }),
    B([0, 17.9, 0], [1.1, 0.8, 1.1], '#cabb9c'),
    B([0, 18.75, 0], [0.85, 0.9, 0.85], '#d3c6a8', 'cyl'),
    B([0, 19.9, 0], [0.4, 1.6, 0.4], '#dcd2b8', 'cyl', { metal: 1 }),
    B([0, 21.15, 0], [0.18, 1.1, 0.18], '#eee8d4', 'cyl', { metal: 1 }),
  ],

  // Chrysler: steel-blue brick tower, chrome eagles, telescoping sunburst
  // crown arcs, needle spire.
  chrysler: [
    B([0, 1.1, 0], [6.0, 2.2, 6.0], '#8b93a4', 'box', { tex: 'win', tx: { cols: 8, rows: 2 } }),
    B([0, 3.95, 0], [4.9, 3.5, 4.9], '#98a0b0', 'box', { tex: 'win', tx: { cols: 7, rows: 4 } }),
    B([0, 7.35, 0], [4.0, 3.3, 4.0], '#8b93a4', 'box', { tex: 'win', tx: { cols: 6, rows: 4 } }),
    B([0, 10.15, 0], [3.3, 2.3, 3.3], '#98a0b0', 'box', { tex: 'win', tx: { cols: 5, rows: 3 } }),
    B([1.75, 11.55, 1.75], [0.5, 0.38, 1.15], '#d5dce8', 'box', { rotY: -Math.PI / 4, metal: 1 }),
    B([-1.75, 11.55, 1.75], [0.5, 0.38, 1.15], '#d5dce8', 'box', { rotY: Math.PI / 4, metal: 1 }),
    B([1.75, 11.55, -1.75], [0.5, 0.38, 1.15], '#d5dce8', 'box', { rotY: -3 * Math.PI / 4, metal: 1 }),
    B([-1.75, 11.55, -1.75], [0.5, 0.38, 1.15], '#d5dce8', 'box', { rotY: 3 * Math.PI / 4, metal: 1 }),
    B([0, 11.3, 0], [3.2, 1.6, 3.2], '#dde3ee', 'dome', { tex: 'crown', metal: 1 }),
    B([0, 12.45, 0], [2.55, 1.3, 2.55], '#d2d9e6', 'dome', { tex: 'crown', metal: 1 }),
    B([0, 13.45, 0], [1.95, 1.0, 1.95], '#dde3ee', 'dome', { tex: 'crown', metal: 1 }),
    B([0, 14.3, 0], [1.4, 0.75, 1.4], '#d2d9e6', 'dome', { tex: 'crown', metal: 1 }),
    B([0, 15.0, 0], [0.95, 0.55, 0.95], '#e4e9f2', 'dome', { tex: 'crown', metal: 1 }),
    B([0, 16.6, 0], [0.26, 2.6, 0.26], '#eef2f8', 'cyl', { metal: 1 }),
  ],

  // Brooklyn Bridge: granite anchorages, deck, twin gothic towers with
  // pointed arches, draped main cables with vertical suspenders.
  brooklyn: [
    B([-8.3, 1.7, 0], [1.9, 2.6, 3.3], '#9c8f78', 'box', { tex: 'relief' }),
    B([8.3, 1.7, 0], [1.9, 2.6, 3.3], '#9c8f78', 'box', { tex: 'relief' }),
    B([-5.7, 2.62, 0], [5.6, 0.45, 3.0], '#7d6f5a'),
    B([0, 2.62, 0], [6.2, 0.45, 3.0], '#8a7c66'),
    B([5.7, 2.62, 0], [5.6, 0.45, 3.0], '#7d6f5a'),
    B([-4.6, 5.4, 0], [2.5, 6.6, 3.3], '#a89b82', 'box', { tex: 'gothic' }),
    B([4.6, 5.4, 0], [2.5, 6.6, 3.3], '#a89b82', 'box', { tex: 'gothic' }),
    B([-4.6, 8.95, 0], [2.9, 0.5, 3.7], '#baa98c'),
    B([4.6, 8.95, 0], [2.9, 0.5, 3.7], '#baa98c'),
    B([0, 2.7, 1.3], [17.4, 0.5, 0.2], '#e8e4d6', 'cable',
      { sortY: 9.2, cable: { towerX: 4.6, topY: 8.6, midY: 3.35, endX: 8.6, endY: 2.7, deckY: 2.85, hangers: 11 } }),
    B([0, 2.7, -1.3], [17.4, 0.5, 0.2], '#e8e4d6', 'cable',
      { sortY: 9.2, cable: { towerX: 4.6, topY: 8.6, midY: 3.35, endX: 8.6, endY: 2.7, deckY: 2.85, hangers: 11 } }),
  ],

  // ================= PARIS =================
  // Eiffel: four splayed lattice legs, base arches, three platforms,
  // tapering see-through lattice sections, tip antenna.
  eiffel: [
    B([-2.7, 1.8, -2.7], [1.05, 4.4, 1.05], '#6f5038', 'box', { rotZ: 0.30, rotX: -0.30 }),
    B([2.7, 1.8, -2.7], [1.05, 4.4, 1.05], '#6f5038', 'box', { rotZ: -0.30, rotX: -0.30 }),
    B([-2.7, 1.8, 2.7], [1.05, 4.4, 1.05], '#6f5038', 'box', { rotZ: 0.30, rotX: 0.30 }),
    B([2.7, 1.8, 2.7], [1.05, 4.4, 1.05], '#6f5038', 'box', { rotZ: -0.30, rotX: 0.30 }),
    B([0, 1.9, 2.45], [4.6, 4.6, 0.32], '#8a6547', 'arch'),
    B([0, 1.9, -2.45], [4.6, 4.6, 0.32], '#8a6547', 'arch'),
    B([2.45, 1.9, 0], [4.6, 4.6, 0.32], '#8a6547', 'arch', { rotY: Math.PI / 2 }),
    B([-2.45, 1.9, 0], [4.6, 4.6, 0.32], '#8a6547', 'arch', { rotY: Math.PI / 2 }),
    B([0, 4.35, 0], [6.4, 0.65, 6.4], '#8a6547'),
    B([0, 6.6, 0], [3.6, 3.8, 3.6], '#7c5a40', 'cone4', { tex: 'lattice' }),
    B([0, 8.7, 0], [3.5, 0.55, 3.5], '#8a6547'),
    B([0, 11.4, 0], [2.2, 5.0, 2.2], '#7c5a40', 'cone4', { tex: 'lattice' }),
    B([0, 14.15, 0], [1.5, 0.5, 1.5], '#8a6547'),
    B([0, 15.4, 0], [1.0, 2.2, 1.0], '#7c5a40', 'cone4', { tex: 'lattice' }),
    B([0, 16.8, 0], [0.9, 0.6, 0.9], '#8a6547'),
    B([0, 17.9, 0], [0.16, 1.7, 0.16], '#9a7a5c', 'cyl'),
  ],

  // Arc de Triomphe: relief-carved piers, sculpture groups, grand vault,
  // entablature + frieze + attic.
  arc: [
    B([-3.2, 3.3, 0], [2.6, 6.6, 3.9], '#d8caa8', 'box', { tex: 'relief' }),
    B([3.2, 3.3, 0], [2.6, 6.6, 3.9], '#d8caa8', 'box', { tex: 'relief' }),
    B([-3.2, 1.7, 2.05], [1.8, 2.8, 0.35], '#e6dabb'),
    B([3.2, 1.7, 2.05], [1.8, 2.8, 0.35], '#e6dabb'),
    B([0, 6.15, 0], [4.9, 4.4, 3.9], '#e0d3b2', 'box', { tex: 'archcut', tx: { n: 1, open: 1 } }),
    B([0, 8.95, 0], [9.2, 1.7, 4.2], '#d8caa8'),
    B([0, 10.15, 0], [9.2, 0.75, 4.2], '#c9ba96', 'box', { tex: 'relief' }),
    B([0, 11.0, 0], [8.6, 1.0, 3.8], '#e0d3b2', 'box', { tex: 'relief' }),
    B([0, 11.68, 0], [9.0, 0.36, 4.0], '#cfc09c'),
  ],

  // Louvre: courtyard slab, palace wings (windowed) as backdrop, big glass
  // pyramid with white grid, three pyramidions, twin fountains.
  louvre: [
    B([0, 0.22, 0.6], [17, 0.44, 14], '#b9aa8a'),
    B([0, 2.55, -5.6], [17, 4.7, 2.4], '#cdbb95', 'box', { tex: 'win', tx: { cols: 15, rows: 3 } }),
    B([0, 5.45, -5.6], [17, 1.1, 2.6], '#4d4f5c'),
    B([-8.1, 2.55, 0.4], [2.4, 4.7, 9.6], '#cdbb95', 'box', { tex: 'win', tx: { cols: 3, rows: 3 } }),
    B([8.1, 2.55, 0.4], [2.4, 4.7, 9.6], '#cdbb95', 'box', { tex: 'win', tx: { cols: 3, rows: 3 } }),
    B([0, 3.0, 1.2], [7.6, 5.6, 7.6], '#cfe6f4', 'pyramid', { glass: 1, tex: 'glass' }),
    B([-5.3, 1.15, 1.2], [2.0, 1.9, 2.0], '#cfe6f4', 'pyramid', { glass: 1, tex: 'glass' }),
    B([5.3, 1.15, 1.2], [2.0, 1.9, 2.0], '#cfe6f4', 'pyramid', { glass: 1, tex: 'glass' }),
    B([0, 1.15, 5.9], [2.0, 1.9, 2.0], '#cfe6f4', 'pyramid', { glass: 1, tex: 'glass' }),
    B([-4.9, 0.55, 4.6], [3.0, 0.26, 3.0], '#3fa8c8', 'water'),
    B([4.9, 0.55, 4.6], [3.0, 0.26, 3.0], '#3fa8c8', 'water'),
  ],

  // ================= LONDON =================
  // Big Ben: ribbed golden stone shaft, four white clock faces, arched
  // belfry, green slate spire with gilt needle.
  bigben: [
    B([0, 2.3, 0], [3.4, 4.6, 3.4], '#b7a071', 'box', { tex: 'strip' }),
    B([0, 6.75, 0], [3.15, 4.3, 3.15], '#c2ab7a', 'box', { tex: 'strip' }),
    B([0, 10.9, 0], [3.15, 4.0, 3.15], '#b7a071', 'box', { tex: 'strip' }),
    B([0, 13.9, 0], [3.6, 2.2, 3.6], '#cdb888', 'box', { tex: 'relief' }),
    B([0, 13.9, 1.87], [2.35, 2.35, 0.2], '#f4ecd4', 'clock'),
    B([0, 13.9, -1.87], [2.35, 2.35, 0.2], '#f4ecd4', 'clock'),
    B([1.87, 13.9, 0], [2.35, 2.35, 0.2], '#f4ecd4', 'clock', { rotY: Math.PI / 2 }),
    B([-1.87, 13.9, 0], [2.35, 2.35, 0.2], '#f4ecd4', 'clock', { rotY: Math.PI / 2 }),
    B([0, 15.75, 0], [3.0, 1.5, 3.0], '#c2ab7a', 'box', { tex: 'arch', tx: { n: 3 } }),
    B([0, 17.55, 0], [2.7, 2.6, 2.7], '#5e7258', 'cone4'),
    B([0, 19.2, 0], [1.1, 1.6, 1.1], '#c8a96b', 'cone4', { metal: 1 }),
    B([0, 20.3, 0], [0.2, 1.2, 0.2], '#e2cf9c', 'cyl', { metal: 1 }),
  ],

  // Tower Bridge: stone towers with gothic windows, corner turrets, twin
  // blue walkways, blue suspension chains, side piers.
  towerbridge: [
    B([0, 1.35, 0], [18, 0.6, 3.2], '#8b8b96'),
    B([-8.7, 1.55, 0], [1.7, 2.5, 3.5], '#cfc5aa', 'box', { tex: 'relief' }),
    B([8.7, 1.55, 0], [1.7, 2.5, 3.5], '#cfc5aa', 'box', { tex: 'relief' }),
    B([-4.6, 4.9, 0], [3.1, 6.9, 3.1], '#d9cfb4', 'box', { tex: 'gothic' }),
    B([4.6, 4.9, 0], [3.1, 6.9, 3.1], '#d9cfb4', 'box', { tex: 'gothic' }),
    B([-4.6, 8.7, 0], [3.5, 0.7, 3.5], '#e4dbc2'),
    B([4.6, 8.7, 0], [3.5, 0.7, 3.5], '#e4dbc2'),
    B([-4.6, 10.0, 0], [3.3, 2.5, 3.3], '#dfd6bc', 'turrets'),
    B([4.6, 10.0, 0], [3.3, 2.5, 3.3], '#dfd6bc', 'turrets'),
    B([0, 7.25, 0], [6.2, 0.5, 1.5], '#3e6fa8'),
    B([0, 8.35, 0], [6.2, 0.5, 1.5], '#3e6fa8'),
    B([-7.0, 3.6, 0], [4.7, 0.26, 0.26], '#4a7ab2', 'box', { rotZ: 0.42, sortY: 8.8 }),
    B([7.0, 3.6, 0], [4.7, 0.26, 0.26], '#4a7ab2', 'box', { rotZ: -0.42, sortY: 8.8 }),
  ],

  // London Eye: boarding platform, tilted A-frame legs, white rim, radial
  // spokes, hub, ten glass capsules.
  eye: [
    B([0, 0.75, 2.0], [5.2, 0.7, 2.0], '#9aa3ae'),
    B([-1.8, 2.9, 1.0], [0.55, 6.0, 0.55], '#cdd2da', 'cyl', { rotZ: 0.26, rotX: 0.18 }),
    B([1.8, 2.9, 1.0], [0.55, 6.0, 0.55], '#cdd2da', 'cyl', { rotZ: -0.26, rotX: 0.18 }),
    B([0, 8.0, 0], [12.6, 12.6, 0.5], '#eaeef5', 'torus'),
    B([0, 8.0, 0], [11.9, 0.18, 0.18], '#c2c9d4', 'spokes', { n: 9 }),
    B([0, 8.0, 0], [1.25, 1.05, 1.25], '#9aa4b2', 'cyl', { rotX: Math.PI / 2 }),
    ...vring(8.0, 6.3, 10, [1.05, 0.62, 0.62], '#8fc5e8', 'pod', { glass: 1, sortY: 8.5 }),
  ],

  // ================= ROME =================
  // Colosseum: arena floor + three stacked arcades of see-through arches,
  // the top tier broken like the ruin.
  colosseum: [
    B([0, 0.4, 0], [12.8, 0.8, 12.8], '#c2996b', 'cyl'),
    ...arcade(2.05, 5.7, 2.5, 8, '#cfa876', 'archcut', 3),
    ...arcade(4.55, 5.55, 2.5, 8, '#d9b382', 'archcut', 3),
    ...arcade(6.95, 5.4, 2.3, 5, '#c49a6a', 'archcut', 2, 0.62, -0.35),
  ],

  // Trevi Fountain: windowed palazzo, statue-topped attic, twin column
  // pairs, arched central niche, Oceanus statue, rocks, curved basin, pool.
  trevi: [
    B([0, 3.1, -1.5], [12.5, 6.2, 1.7], '#ded0ab', 'box', { tex: 'win', tx: { cols: 8, rows: 3 } }),
    B([0, 6.75, -1.5], [12.5, 1.1, 1.9], '#cfc09a', 'box', { tex: 'relief' }),
    B([0, 7.95, -1.5], [0.75, 1.3, 0.55], '#e8ddc2', 'statue'),
    B([-2.9, 7.9, -1.5], [0.65, 1.2, 0.5], '#e8ddc2', 'statue'),
    B([2.9, 7.9, -1.5], [0.65, 1.2, 0.5], '#e8ddc2', 'statue'),
    B([-2.7, 3.2, -0.55], [2.3, 4.2, 0.85], '#e6dab8', 'colonnade', { cols: 2 }),
    B([2.7, 3.2, -0.55], [2.3, 4.2, 0.85], '#e6dab8', 'colonnade', { cols: 2 }),
    B([0, 3.6, -0.7], [3.0, 3.6, 1.2], '#efe4c6', 'archvault'),
    B([0, 2.3, 0.0], [1.15, 2.5, 0.8], '#f2e8d0', 'statue'),
    B([-1.9, 1.0, 0.8], [1.6, 1.2, 1.3], '#c9b48d', 'rock'),
    B([1.9, 1.0, 0.8], [1.6, 1.2, 1.3], '#c9b48d', 'rock'),
    B([0, 0.5, 1.2], [9.4, 0.56, 0.56], '#d5c7a2', 'arch', { rotX: Math.PI / 2 }),
    B([0, 0.4, 1.1], [7.6, 0.24, 7.6], '#3fa8c8', 'water'),
  ],

  // Pantheon: stepped base, twin colonnades, entablature, pediment,
  // rotunda, stepped rings, coffered dome + oculus.
  pantheon: [
    B([0, 0.5, 2.8], [9.2, 1.0, 4.2], '#d9c79e'),
    B([0, 3.4, -2.2], [8.4, 6.8, 8.4], '#c8af84', 'cyl'),
    B([-2.2, 2.9, 3.9], [3.9, 3.8, 0.8], '#dfcda6', 'colonnade', { cols: 4 }),
    B([2.2, 2.9, 3.9], [3.9, 3.8, 0.8], '#dfcda6', 'colonnade', { cols: 4 }),
    B([0, 2.9, 2.3], [7.2, 3.8, 0.8], '#d4c096', 'colonnade', { cols: 5 }),
    B([0, 5.35, 3.1], [8.8, 1.1, 3.2], '#d9c79e'),
    B([0, 6.9, 3.1], [9.2, 2.0, 3.2], '#dcc9a0', 'prism'),
    B([0, 7.15, -2.2], [8.0, 0.7, 8.0], '#bda878', 'cyl'),
    B([0, 7.75, -2.2], [7.2, 0.6, 7.2], '#b5a072', 'cyl'),
    B([0, 8.0, -2.2], [7.0, 3.5, 7.0], '#ab9469', 'dome'),
    B([0, 11.25, -2.2], [1.4, 0.55, 1.4], '#d9c79e', 'cyl'),
  ],
};

export function getLandmark(id) { return defs[id]; }
