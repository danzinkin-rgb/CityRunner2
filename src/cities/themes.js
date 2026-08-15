// Visual identity for each city. Everything downstream (sky, fog, buildings,
// props, obstacles, puzzle landmarks) is driven from this table.
// Design bar: bright, saturated, golden-hour stylised look — high chroma,
// strong silhouettes, readable at speed on a small screen.
// fog color === sky glow color so distant geometry melts into the horizon glow.
//
// Each city also carries a `levels` array — one entry per street — of visual
// overrides (facade style, palette, prop mix, road style, sky/fog mood,
// skyline cameo, recurring set pieces). resolveStreet(city, level) merges an
// entry over the city base so every street gets its own unmistakable look.
export const CITIES = [
  {
    id: 'nyc', name: 'NEW YORK', flag: '🗽',
    streets: ['Broadway', '5th Avenue', 'Times Square'],
    // Crisp blue day melting into a warm golden horizon.
    sky: { top: '#2e6ad4', mid: '#7db2f2', horizon: '#ffe9b8', glow: '#ffd98e' },
    fog: 0xffd98e, fogDensity: 0.0088,
    sun: { color: 0xfff0d0, intensity: 2.4, pos: [-60, 80, -40] },
    hemi: { sky: 0xcfe2ff, ground: 0x8a7f6e, intensity: 1.05 },
    fill: { color: 0xfff0da, intensity: 1.05 },
    road: '#4a4a52', lane: '#ffd23f', sidewalk: '#b8b2a6',
    palette: ['#b0533f', '#d9c9a4', '#8fa2b8', '#c98a5a', '#a67c62', '#96a8bc'],
    trim: '#e8e0cc', roof: '#6a5a4c',
    windowLit: '#ffd98a', windowDay: '#9cc4e8', accent: '#e33636',
    storefront: ['#e33636', '#f2a516', '#2e8fd8', '#3fae5c', '#8a4fd0'],
    props: ['lamp', 'hydrant', 'billboard', 'newsstand', 'hotdog'],
    vehicle: 'taxi',
    landmarks: ['empire', 'chrysler', 'brooklyn'],
    levels: [
      { // Broadway — theatre district: bulb marquees, playbills, stage doors
        key: 'broadway', facade: 'theatre', marquee: true,
        palette: ['#8a4a3a', '#a05a42', '#6e5a6a', '#7a6652', '#94564a', '#6a6a78'],
        storefront: ['#b01030', '#8a1626', '#c89018', '#4a2a7a', '#20304e'],
        props: ['lamp', 'hydrant', 'playbill', 'stagedoor', 'newsstand'],
        ads: ['STARDUST', 'MOONGLOW', 'RUNAWAY!', 'CITY LIGHTS', 'ONE MORE NIGHT', 'THE BIG TOWN'],
        lit: 0.24,
      },
      { // 5th Avenue — prestige retail: limestone flagships, gold awnings
        key: 'fifth', facade: 'flagship', goldAwnings: true,
        palette: ['#ddd6c6', '#d0c9b8', '#c6bfae', '#d8d0be', '#cfc5ae', '#e2dbcb'],
        trim: '#efe8d6',
        storefront: ['#1a2a44', '#3a2a1c', '#4a1a2e', '#14342c', '#2a2038'],
        props: ['lamp', 'topiary', 'hydrant', 'flagbanner'],
        ads: ['MAISON LUMIÈRE', 'ASTOR & SONS', 'LA PERLE', 'VERRE & OR'],
        cameo: 'cathedral', lit: 0.15,
      },
      { // Times Square — dusk neon overload, stacked LED, tickers, crowds
        key: 'timessq', facade: 'neon', banners: true, cornerLED: true,
        palette: ['#4e5462', '#5a606e', '#3e4452', '#565064', '#4a5668', '#605a6e'],
        sky: { top: '#161e4a', mid: '#3a4488', horizon: '#9a5cc0', glow: '#c66ad4' },
        fog: 0xb866c8, fogDensity: 0.0104,
        mood: { sun: 0.4, hemi: 0.6, fill: 0.85 },
        road: '#3c3c46', sidewalk: '#8e8a92',
        storefront: ['#e3128a', '#12c4e3', '#f2e216', '#8a2ae8', '#ff5a1e'],
        props: ['lamp', 'barrier', 'newsstand', 'hotdog'],
        ads: ['CITY RUN', 'NEON NITES', 'MEGA COLA', 'GO! GO! GO!', 'LIVE 24H', 'BIG APPLE FM'],
        cameo: 'balltower', lit: 0.6,
      },
    ],
  },
  {
    id: 'paris', name: 'PARIS', flag: '🗼',
    streets: ['Champs-Élysées', 'Rue de Rivoli', 'Montmartre'],
    // Soft lavender-blue with a rosy pastel glow.
    sky: { top: '#4a6ad8', mid: '#96b4ee', horizon: '#ffd9e4', glow: '#ffc4d4' },
    fog: 0xffc4d4, fogDensity: 0.0085,
    sun: { color: 0xfff4e0, intensity: 2.2, pos: [50, 70, -50] },
    hemi: { sky: 0xe4ecff, ground: 0x9a8d7c, intensity: 1.1 },
    fill: { color: 0xfff0e4, intensity: 1.0 },
    road: '#54545c', lane: '#f0f0f0', sidewalk: '#cfc4b0',
    palette: ['#f2e6cc', '#ecdfc2', '#e8d9ba', '#f6ecd6', '#eadcbc', '#f0e2c8'],
    trim: '#fdf8ec', roof: '#5d6d7e',
    windowLit: '#ffe6b0', windowDay: '#a8c8e4', accent: '#3a6ea5',
    storefront: ['#a02438', '#1f4a8a', '#2d6b3f', '#6a3a8a', '#b8681e'],
    props: ['lamp_paris', 'awning', 'tree', 'kiosk', 'fountain'],
    vehicle: 'citroen',
    landmarks: ['eiffel', 'arc', 'louvre'],
    levels: [
      { // Champs-Élysées — pollarded plane rows, glass showrooms, Arc ahead
        key: 'champs', facade: 'showroom', treeline: 'chestnut',
        setback: 6.2,          // the widest avenue in the game
        props: ['lamp_paris', 'terrace_cafe', 'kiosk'],
        ads: ['MAISON LUMIÈRE', 'MODE 8', 'PARFUM ROSE', 'CAFÉ RIVE'],
        cameo: 'arc', lit: 0.14,
      },
      { // Rue de Rivoli — endless stone arcade colonnade, garden railings
        key: 'rivoli', facade: 'arcade', arcade: true, garden: true,
        palette: ['#eee3c8', '#eadfc4', '#f0e6cc', '#e8ddc0', '#f2e8d0', '#ecdfc2'],
        props: ['lamp_paris', 'souvenirstall'],
        ads: ['GALERIE DORÉE', 'CARTES & CO', 'SOUVENIRS'],
        lit: 0.14,
      },
      { // Montmartre — cobbles, ivy village walls, stepped streets, easels
        key: 'montmartre', facade: 'village', windmill: true, steps: true,
        palette: ['#f2e2cc', '#e8d2b4', '#f6ecd8', '#dcc4a6', '#eedcc0', '#e2cdb0'],
        roadStyle: 'cobble', road: '#7a7268', lane: '#7a7268', sidewalk: '#c0b49e',
        trim: '#fdf6e4', roof: '#6b5a54',
        setback: 3.4,          // a hill village lane, tight and low
        hBase: 7.5, hVar: 4, secondRow: 0.3,
        storefront: ['#a02438', '#2d6b3f', '#1f4a8a', '#8a5a1e'],
        props: ['lamp_paris', 'easel', 'bistro'],
        ads: ['CABARET', 'LA PALETTE', 'BISTRO LUNE', 'CRÊPES'],
        // low village rooflines: string the lights below the eaves, not at the
        // 8.8m default, or they float free of the houses they hang from
        span: 'festoon', spanFreq: 0.45, spanY: 7.4,
        cameo: 'sacre', lit: 0.2,
      },
    ],
  },
  {
    id: 'london', name: 'LONDON', flag: '🇬🇧',
    streets: ['Oxford Street', 'Abbey Road', 'Piccadilly'],
    // Fresh morning blue with a honey glow at the rooftops.
    sky: { top: '#3a70cc', mid: '#8ab4e8', horizon: '#ffe4bc', glow: '#ffd0a0' },
    fog: 0xffd0a0, fogDensity: 0.0095,
    sun: { color: 0xfff0d8, intensity: 2.2, pos: [-40, 60, -60] },
    hemi: { sky: 0xd8e4f8, ground: 0x8a8078, intensity: 1.05 },
    fill: { color: 0xffeeda, intensity: 1.05 },
    road: '#4c4c54', lane: '#f0f0f0', sidewalk: '#b0aa9e',
    palette: ['#b4553c', '#c26445', '#a84e38', '#cc7a52', '#9a5a64', '#b86a74'],
    trim: '#f6f2e8', roof: '#5a5650',
    windowLit: '#ffedbe', windowDay: '#a0c0dc', accent: '#c8102e',
    storefront: ['#c8102e', '#1c5aa8', '#2d7a44', '#d0851c', '#5a3a8a'],
    props: ['lamp_london', 'phonebox', 'postbox', 'tree', 'bunting'],
    vehicle: 'bus',
    landmarks: ['bigben', 'towerbridge', 'eye'],
    levels: [
      { // Oxford Street — columned department stores, festoon lights, buses
        key: 'oxford', facade: 'deptstore',
        palette: ['#d8d2c2', '#b4553c', '#cfc9b9', '#c26445', '#ddd7c7', '#b86a50'],
        props: ['lamp_london', 'beacon', 'phonebox', 'postbox'],
        ads: ['ASTOR & SONS', 'GRAND STORES', 'TEA & CO', 'MARLOW & CO'],
        span: 'festoon', spanFreq: 0.6, lit: 0.16,
      },
      { // Abbey Road — leafy Georgian villas, THE zebra crossing, NW8 signs
        key: 'abbey', facade: 'georgian', zebra: true, parked: 'beetle',
        roadStyle: 'plain', fogDensity: 0.008,
        palette: ['#f2efe6', '#ece7da', '#b46848', '#f6f3ea', '#c07a58', '#efe9dc'],
        // no 'hedge' prop: every villa already gets a makeGardenWall (wall +
        // hedge) on the building line, and the prop added a SECOND hedge 40cm
        // in front of it — a double green wall running the length of the
        // pavement, which crowded the near-left of the portrait frame.
        props: ['lamp_london', 'planetree', 'streetsign'],
        secondRow: 0, lit: 0.1,
      },
      { // Piccadilly — dusk, curved stacked-LED corner, theatre glow, Eros
        key: 'piccadilly', facade: 'theatre', marquee: true, curvedLED: true, eros: true,
        palette: ['#c9c2b2', '#bfb8a8', '#b5ae9e', '#d0c9b9', '#c4bcac', '#cbc3b3'],
        sky: { top: '#1c2456', mid: '#42509a', horizon: '#ff9a5c', glow: '#ff8050' },
        fog: 0xff8a55, fogDensity: 0.0098,
        mood: { sun: 0.5, hemi: 0.65, fill: 0.9 },
        road: '#44444c',
        storefront: ['#c8102e', '#d0851c', '#1c5aa8', '#8a2ae8', '#12b4c4'],
        props: ['lamp_london', 'phonebox', 'barrier'],
        ads: ['WEST END', 'REVUE ROYALE', 'GINGER SNAP', 'PICCADILLY LITES'],
        lit: 0.55,
      },
    ],
  },
  {
    id: 'rome', name: 'ROME', flag: '🏛️',
    streets: ['Via del Corso', 'Via Veneto', 'Piazza Navona'],
    // Rich Mediterranean golden hour.
    sky: { top: '#4a55b8', mid: '#c890b8', horizon: '#ffcf8c', glow: '#ffb768' },
    fog: 0xffb768, fogDensity: 0.0085,
    sun: { color: 0xffe2b0, intensity: 2.6, pos: [60, 55, -45] },
    hemi: { sky: 0xffe8cc, ground: 0x9a7c5c, intensity: 1.1 },
    fill: { color: 0xffe6c4, intensity: 1.05 },
    road: '#6a6058', lane: '#e0d4bc', sidewalk: '#c4ae8e',
    palette: ['#e8a068', '#f0b078', '#d8846a', '#f6c088', '#c86a52', '#f0dcae'],
    trim: '#f8ecd4', roof: '#b0472e',
    windowLit: '#ffdda0', windowDay: '#98b8d4', accent: '#2e7d4f',
    storefront: ['#b0472e', '#2e7d4f', '#c8861e', '#8a3a5a', '#3a6a9a'],
    props: ['lamp_rome', 'column', 'arch', 'cypress', 'fountain'],
    vehicle: 'vespa',
    landmarks: ['colosseum', 'trevi', 'pantheon'],
    levels: [
      { // Via del Corso — tight ochre canyon, shutters, mopeds, church vista
        key: 'corso', facade: 'ochre', parked: 'vespa',
        palette: ['#d9903f', '#c87f3a', '#e0a050', '#b06a34', '#d29a58', '#c4763a'],
        setback: 2.2, hBase: 17, hVar: 10, secondRow: 0,
        fogDensity: 0.0102,
        // Striped shop awnings and vertical boutique banners hung on the
        // building line — the canyon was bare apart from lamps, and the only
        // colour on it was a scatter of tiny painted signboards.
        props: ['lamp_rome', 'awning', 'flagbanner', 'lamp_rome'],
        storefront: ['#c4553a', '#2e7d4f', '#d8961e', '#1f4a8a', '#7a2f4e'],
        ads: ['MODA VIA', 'ORO FINO', 'GELATERIA', 'LIBRI'],
        cameo: 'churchtwin', lit: 0.16,
      },
      { // Via Veneto — grand hotels, flags, white umbrella cafés, city gate
        key: 'veneto', facade: 'hotel',
        palette: ['#efe4cc', '#e9dcc2', '#f3ead6', '#e2d2b4', '#ece0c6', '#f0e6d0'],
        setback: 5.6, hBase: 13, hVar: 6,     // broad, low, elegant
        fogDensity: 0.0078,
        props: ['lamp_rome', 'planetree', 'terrace_white'],
        ads: ['GRAND AURORA', 'HOTEL SPLENDIDO', 'PALAZZO STELLA', 'CAFFÈ AURORA'],
        cameo: 'gate', lit: 0.16,
      },
      { // Piazza Navona — baroque evening festival: obelisk fountains, stalls
        key: 'navona', facade: 'baroque', obelisk: true,
        palette: ['#eadbb8', '#e2cfa8', '#f0e2c4', '#d8c298', '#eed9b2', '#e6d2ac'],
        setback: 7.4, hBase: 9.5, hVar: 4, secondRow: 0.2,   // a square, not a canyon
        roadStyle: 'travertine', road: '#b8a684', lane: '#b8a684', sidewalk: '#bfad8b',
        sky: { top: '#332e78', mid: '#8862a8', horizon: '#ffab5e', glow: '#ff9848' },
        fog: 0xff9848, fogDensity: 0.0095,
        mood: { sun: 0.6, hemi: 0.8, fill: 1.0 },
        props: ['lamp_rome', 'artstall', 'easel'],
        ads: ['ARTE', 'CAFFÈ AURORA', 'TRATTORIA SOLE', 'MASCHERE'],
        span: 'string', spanFreq: 0.6,
        cameo: 'navona', lit: 0.5,
      },
    ],
  },
];

export const LANDMARK_NAMES = {
  empire: 'Empire State Building', chrysler: 'Chrysler Building', brooklyn: 'Brooklyn Bridge',
  eiffel: 'Eiffel Tower', arc: 'Arc de Triomphe', louvre: 'Louvre Pyramid',
  bigben: 'Big Ben', towerbridge: 'Tower Bridge', eye: 'London Eye',
  colosseum: 'Colosseum', trevi: 'Trevi Fountain', pantheon: 'Pantheon',
};

// Merge a street's overrides over its city base. `streetKey` uniquely tags
// textures/materials in the builder caches so streets never share facades.
export function resolveStreet(city, level) {
  const ov = (city.levels && city.levels[level - 1]) || {};
  return { ...city, ...ov, streetKey: ov.key || `${city.id}${level}` };
}
