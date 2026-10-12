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
//
// This file imports nothing, on purpose: marketing/build-pages.mjs loads it
// as text. It lists EVERY city, released or queued. The cities a build offers
// players are CITIES in src/cities/offered.js; read that for anything a
// player sees.
// Regions, for selling cities in regional packs. Every city names one in
// `region`. Packs are not built yet: this is the grouping Dan chose on
// 12 October 2026, so the data is ready when the purchase model is decided.
export const REGIONS = {
  'north-america': 'North America',
  'latin-america': 'Latin America',
  europe: 'Europe',
  'mideast-africa': 'Middle East and Africa',
  asia: 'Asia',
};

export const ALL_CITIES = [
  {
    id: 'nyc', name: 'NEW YORK', flag: '🗽', region: 'north-america',
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
    id: 'paris', name: 'PARIS', flag: '🗼', region: 'europe',
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
    id: 'london', name: 'LONDON', flag: '🇬🇧', region: 'europe',
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
    id: 'rome', name: 'ROME', flag: '🏛️', region: 'europe',
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
  {
    id: 'sf', name: 'SAN FRANCISCO', flag: '🌉', region: 'north-america',
    streets: ['Lombard Street', 'Market Street', 'Haight-Ashbury'],
    // Cool marine-layer blue-grey thinning to a pale fog horizon. The least
    // saturated sky in the game on purpose: the orange of the bridge and the
    // painted Victorians are meant to be the only strong colour in frame.
    // NYC is warm brick under a blue-to-gold sky; nothing here overlaps it.
    sky: { top: '#5c7690', mid: '#a8bcc8', horizon: '#e4e2da', glow: '#d8d4c8' },
    fog: 0xd8d4c8, fogDensity: 0.0118,
    sun: { color: 0xf0ece0, intensity: 1.9, pos: [30, 50, -60] },
    hemi: { sky: 0xc4d2dc, ground: 0x8c8478, intensity: 1.0 },
    fill: { color: 0xe8e4d8, intensity: 0.95 },
    road: '#565a5e', lane: '#e8d840', sidewalk: '#a8a498',
    palette: ['#d8c4d0', '#b8cdd4', '#e0d0a8', '#c8b8c4', '#a8c0b8', '#dcc8b0'],
    trim: '#f2ece0', roof: '#5a5450',
    windowLit: '#ffd9a0', windowDay: '#a8c4d8', accent: '#c1440e',
    storefront: ['#c1440e', '#2e6b7a', '#8a4a6a', '#3a7a5a', '#c89020'],
    props: ['lamp_sf', 'hydrant', 'streetsign', 'lamp_sf'],
    vehicle: 'cablecar',
    landmarks: ['ggbridge', 'coit', 'paintedladies'],
    levels: [
      { // Lombard Street — the crooked block. The track engine is a straight
        // fixed-lane corridor, so the switchbacks are not modelled; the street
        // is sold instead by its red brick, packed flowerbeds, low pastel
        // houses, thick fog, and Coit Tower on the hill ahead.
        key: 'lombard', facade: 'rowhouse',
        roadStyle: 'brick', road: '#9c5638', lane: '#9c5638', sidewalk: '#b4a898',
        palette: ['#e4c4a0', '#d4b8c8', '#c8d4c0', '#e8d0b0', '#c4b8d0', '#dcc8a8'],
        // 3.6, not tighter: the bay windows stand ~0.9m proud of the facade
        // and the curb props reach 2.7m in, so anything less puts lamps
        // inside the bays.
        setback: 3.6, hBase: 9, hVar: 2, secondRow: 0,
        fogDensity: 0.0145,
        props: ['lamp_sf', 'flowerbed', 'flowerbed', 'hydrant'],
        storefront: ['#6a8a5a', '#8a6a4a', '#5a6a8a', '#8a5a6a'],
        ads: [],
        cameo: 'coit', lit: 0.1,
      },
      { // Market Street — the wide civic spine: Beaux-Arts banks, streetcar
        // rails and overhead wires, the Ferry Building clock tower at the end.
        key: 'market', facade: 'beauxarts',
        palette: ['#d8d2c0', '#cec8b6', '#d4cdb8', '#dad3c2', '#cfc9b4', '#d6cfbc'],
        setback: 5.8, hBase: 16, hVar: 8, secondRow: 0.25,
        roadStyle: 'streetcar', road: '#585c60', lane: '#e8d840',
        props: ['lamp_sf', 'streetcar_pole', 'flagbanner', 'newsstand'],
        storefront: ['#1c5a7a', '#8a2a3a', '#2e6b4a', '#7a5a1e'],
        ads: ['EMBARCADERO BANK', 'FERRY PLAZA', 'MARKET & CO', 'GOLDEN STATE TRUST'],
        span: 'wires', spanFreq: 0.7, spanY: 7.2,   // trolley wires, just above the poles
        cameo: 'ferrytower', lit: 0.18,
      },
      { // Haight-Ashbury — painted Victorians with bay windows and bright trim.
        key: 'haight', facade: 'victorian',
        palette: ['#d8506a', '#4a8ac8', '#e8b840', '#6ab868', '#a868c8', '#e87840'],
        trim: '#f8f2e0',
        setback: 3.6, hBase: 10, hVar: 3, secondRow: 0.15,
        fogDensity: 0.0098,
        props: ['lamp_sf', 'streetsign', 'tree', 'hydrant'],
        storefront: ['#e83060', '#20b0c0', '#e8a020', '#7040c0'],
        ads: ['RECORD SHOP', 'BOOKS & ZINES', 'CORNER STORE', 'VINTAGE & CO'],
        lit: 0.14,
      },
    ],
  },
  {
    id: 'jerusalem', name: 'JERUSALEM', flag: '🫒', region: 'mideast-africa',
    streets: ['Jaffa Road', 'Mahane Yehuda', 'The Cardo'],
    // Jerusalem limestone by day, gold at dusk. The pale gold-cream stone is
    // the constant; the sky pushes toward dusk gold rather than Rome's
    // Mediterranean orange or Paris's rose. docs/cities/jerusalem.md.
    sky: { top: '#5a6fb0', mid: '#b0a4d0', horizon: '#ffd9a0', glow: '#ffc478' },
    fog: 0xffc478, fogDensity: 0.009,
    sun: { color: 0xffe8c0, intensity: 2.5, pos: [55, 60, -50] },
    hemi: { sky: 0xe8dcc8, ground: 0x9c8a68, intensity: 1.1 },
    fill: { color: 0xffe8cc, intensity: 1.05 },
    road: '#8a8070', lane: '#e4d8b8', sidewalk: '#c8b990',
    palette: ['#e8d8ae', '#dfcd9e', '#ecdcb6', '#d4c290', '#e2d2a4', '#eaddb8'],
    trim: '#f6ecd0', roof: '#a89468',
    windowLit: '#ffd8a0', windowDay: '#a8c4dc', accent: '#c8962e',
    storefront: ['#a0522e', '#2e6a4f', '#8a6a2e', '#5a3a7a', '#b0741e'],
    props: ['lamp_jerusalem', 'cypress', 'awning'],
    // Low-rise: three or four storeys of stone, not a city of towers.
    hBase: 10, hVar: 4,
    // A city bus in green and white. Deliberately no operator name or logo:
    // every brand in the game is fictional (docs/COMPLIANCE.md).
    vehicle: 'citybus',
    // One central site for each of the city's three faiths. The Tower of
    // David (defined in landmarks.js, with its facts) waits for a fourth
    // street; it is the skyline at the end of Jaffa Road meanwhile.
    landmarks: ['kotel', 'domerock', 'holysepulchre'],
    levels: [
      { // Jaffa Road — the seam between old and new: the light-rail spine
        // (rails and overhead wires), stone frontage near the Old City end.
        key: 'jaffa', facade: 'arcade',
        palette: ['#e8d8ae', '#e0d0a0', '#ecdcb6', '#d8c898', '#e4d4a8', '#eaddb8'],
        roadStyle: 'streetcar', road: '#7e7668', lane: '#e4d8b8',
        props: ['lamp_jerusalem', 'streetcar_pole', 'planetree'],
        ads: ['BEIT KAFE', 'JAFFA GATE 1KM', 'BOOKS & MAPS'],
        span: 'wires', spanFreq: 0.7, spanY: 7.2,
        cameo: 'towerdavid', lit: 0.18,
      },
      { // Mahane Yehuda — the market: stalls and awnings in narrow lanes,
        // string lights for the bars the same alleys become after dark.
        key: 'mahane', facade: 'market',
        palette: ['#dcc794', '#d2ba82', '#e2d0a2', '#c8b076', '#d8c48e', '#e6d4a6'],
        setback: 3.0, hBase: 7, hVar: 2, secondRow: 0,   // two or three storeys over the stalls
        props: ['lamp_jerusalem', 'awning', 'souvenirstall'],
        ads: ['MAHANE YEHUDA', 'SHUK', 'HALVA & SPICE'],
        span: 'string', spanFreq: 0.7, lit: 0.4,
      },
      { // The Cardo — the Roman and Byzantine colonnaded high street:
        // flagstone paving and columns, an archaeological set-piece.
        key: 'cardo', facade: 'arcade',
        palette: ['#ecdfc0', '#e4d6b2', '#f0e4c8', '#d8caa0', '#eadcb8', '#f2e6ca'],
        roadStyle: 'travertine', road: '#c4b48c', lane: '#c4b48c', sidewalk: '#cabb92',
        setback: 5.2, hBase: 9, hVar: 3, secondRow: 0.2,
        props: ['lamp_jerusalem', 'column', 'cypress'],
        ads: ['CARDO', 'MOSAIC WORKSHOP'],
        cameo: 'domerock', lit: 0.2,
      },
    ],
  },
  {
    id: 'mexico', name: 'MEXICO CITY', flag: '🇲🇽', region: 'latin-america',
    streets: ['Paseo de la Reforma', 'Coyoacán', 'Xochimilco'],
    // High-altitude dusk: violet sky bleeding into deep marigold at the
    // horizon. The highest-chroma city in the roster on purpose: Talavera
    // blue, rosa mexicana, marigold, terracotta, lime. docs/cities/mexico-city.md
    sky: { top: '#3a4fb0', mid: '#9070b8', horizon: '#ffab3e', glow: '#ff8a3a' },
    fog: 0xff8a3a, fogDensity: 0.0092,
    sun: { color: 0xffdca0, intensity: 2.5, pos: [55, 60, -50] },
    hemi: { sky: 0xd8c8ec, ground: 0x9a7250, intensity: 1.1 },
    fill: { color: 0xffe2c0, intensity: 1.05 },
    road: '#57504a', lane: '#f2d33e', sidewalk: '#c2a978',
    palette: ['#c96a3e', '#2f6f9e', '#d81b7a', '#e0a33e', '#8ab23e', '#d9a066'],
    trim: '#f5e6c8', roof: '#8a4a34',
    windowLit: '#ffd98a', windowDay: '#a8cbe4', accent: '#d81b7a',
    storefront: ['#d81b7a', '#2f6f9e', '#e0a33e', '#8ab23e', '#c8461f'],
    props: ['lamp', 'fountain', 'topiary', 'kiosk'],
    // The pink-and-white taxi Mexico City has used since 2013 (a VW Beetle,
    // the "vocho"). No operator name or logo.
    vehicle: 'vocho',
    landmarks: ['templomayor', 'catedral', 'castillo'],
    levels: [
      { // Paseo de la Reforma: the broad boulevard, glass and stone, a tree
        // median, the castle visible far down the avenue
        key: 'reforma',
        setback: 6.4,
        palette: ['#8fa4b8', '#a0b4c4', '#8098b0', '#98acc0', '#7890a8', '#a8bcc8'],
        storefront: ['#2f6f9e', '#d81b7a', '#e0a33e', '#1f4a72'],
        props: ['lamp', 'planetree', 'fountain'],
        ads: ['TORRE SOL', 'CAFÉ REFORMA', 'JOYERÍA LUNA', 'LIBRERÍA'],
        cameo: 'castillo', lit: 0.16,
      },
      { // Coyoacán: cobbled colonial village, low terracotta and Talavera
        // facades, market stalls
        key: 'coyoacan', facade: 'ochre',
        roadStyle: 'cobble', road: '#7a6a56', lane: '#7a6a56', sidewalk: '#c4ae86',
        palette: ['#d9a066', '#c96a3e', '#d81b7a', '#e0a33e', '#8ab23e', '#cf8850'],
        trim: '#f6ecd4', roof: '#7a4a34',
        setback: 3.6, hBase: 8, hVar: 4, secondRow: 0.3,
        storefront: ['#c8461f', '#2f6f9e', '#e0a33e', '#8ab23e'],
        props: ['lamp', 'fountain', 'souvenirstall', 'artstall'],
        ads: ['MERCADO', 'CAFÉ AZUL', 'DULCERÍA', 'LIBROS'],
        span: 'papel', spanFreq: 0.6, lit: 0.14,
      },
      { // Xochimilco: the canal village, low bright houses, papel picado
        // strung overhead
        key: 'xochimilco',
        fogDensity: 0.008,
        palette: ['#8ab23e', '#a8c85e', '#7ca034', '#c96a3e', '#d9a066', '#94b048'],
        setback: 4.2, hBase: 5, hVar: 2, secondRow: 0,
        props: ['lamp', 'tree', 'topiary'],
        ads: ['TRAJINERAS', 'FLORES', 'ELOTES', 'MARIACHI'],
        span: 'papel', spanFreq: 0.5, lit: 0.08,
      },
    ],
  },
  {
    id: 'marrakech', name: 'MARRAKECH', flag: '🇲🇦', region: 'mideast-africa',
    streets: ['Jemaa el-Fnaa', 'The Souks', 'The Mellah'],
    // Hot late afternoon: deep blue overhead, dust-gold at the horizon. The
    // whole medina is plastered in the same red-pink earth, so the colour
    // comes from tile, doors, rugs and lanterns, not the walls.
    sky: { top: '#2f6cc4', mid: '#8ab4e0', horizon: '#ffcf96', glow: '#ffb070' },
    fog: 0xf0b07a, fogDensity: 0.0094,
    sun: { color: 0xffe0b0, intensity: 2.6, pos: [60, 70, -40] },
    hemi: { sky: 0xd8e4f4, ground: 0xa06a50, intensity: 1.1 },
    fill: { color: 0xffe2c4, intensity: 1.0 },
    road: '#a0705a', lane: '#e8cfa8', sidewalk: '#c48c6c',
    palette: ['#c8644a', '#d27458', '#bc5c44', '#d6806a', '#c66c52', '#cc7056'],
    trim: '#e8cbb0', roof: '#a4553e',
    windowLit: '#ffcc80', windowDay: '#5a8aa0', accent: '#1f7a6a',
    storefront: ['#1f7a6a', '#2c5ca8', '#d8a020', '#b0302c', '#6a3a8a'],
    facade: 'medina', hBase: 9, hVar: 4,
    props: ['lamp', 'palm', 'rugs', 'souvenirstall'],
    // Marrakech's petit taxis are small beige cars with a roof sign. No
    // operator name or logo.
    vehicle: 'petittaxi',
    // Porters push laden handcarts straight across the road
    // (src/run/mechanics.js).
    mechanic: 'handcart',
    landmarks: ['koutoubia', 'babagnaou', 'benyoussef'],
    levels: [
      { // Jemaa el-Fnaa: the great square, food stalls and orange-juice
        // carts, the Koutoubia minaret over the rooftops
        key: 'jemaa',
        setback: 6.0, hBase: 8, hVar: 3, secondRow: 0.4,
        props: ['lamp', 'palm', 'souvenirstall', 'rugs'],
        ads: ['JUS D\'ORANGE', 'HARIRA', 'THÉ À LA MENTHE', 'GRILLADES'],
        span: 'string', spanFreq: 0.4, lit: 0.22,
        cameo: 'koutoubia',
      },
      { // The souks: narrow lanes of stalls under slatted reed canopies,
        // rugs, lanterns, leather, spice
        key: 'souks', facade: 'market',
        setback: 3.0, hBase: 7, hVar: 2, secondRow: 0,
        palette: ['#c46448', '#ba5c44', '#cc7058', '#b4583e', '#c8684e', '#be6046'],
        props: ['rugs', 'awning', 'souvenirstall'],
        ads: ['TAPIS', 'ÉPICES', 'BABOUCHES', 'LANTERNES', 'ARGAN'],
        span: 'slats', spanFreq: 1, spanY: 6.4, lit: 0.3,
      },
      { // The Mellah: the old Jewish quarter by the Badia palace, its houses
        // with wooden balconies over the street, the spice market at its gate
        key: 'mellah', balconies: true,
        setback: 4.0, hBase: 10, hVar: 3, secondRow: 0.3,
        palette: ['#d07a5c', '#c86c52', '#d8866a', '#c4664c', '#cc7458', '#d48064'],
        props: ['lamp', 'palm', 'awning'],
        ads: ['ÉPICES', 'BIJOUTERIE', 'SYNAGOGUE 200M', 'PALAIS BADIA'],
        lit: 0.2,
      },
    ],
  },
  {
    id: 'delhi', name: 'DELHI', flag: '🇮🇳', region: 'asia',
    streets: ['Chandni Chowk', 'Connaught Place', 'Kartavya Path'],
    // A warm, hazy afternoon: pale sky, a dusty gold horizon, the light
    // softened by the haze. Red sandstone, marigold, white marble.
    sky: { top: '#5a8ac8', mid: '#a8c0d8', horizon: '#f4d8a8', glow: '#f0c080' },
    fog: 0xe8c890, fogDensity: 0.0108,
    sun: { color: 0xffe4b8, intensity: 2.4, pos: [-50, 70, -40] },
    hemi: { sky: 0xe0e4ec, ground: 0x9a7a5a, intensity: 1.1 },
    fill: { color: 0xffe8cc, intensity: 1.0 },
    road: '#5a5650', lane: '#f0e0b0', sidewalk: '#b8a690',
    palette: ['#c8603a', '#e0b860', '#5a9ab0', '#d88a5a', '#a0c070', '#e8d0a8'],
    trim: '#f2e8d4', roof: '#8a4a30',
    windowLit: '#ffd28a', windowDay: '#8ab0c8', accent: '#e8780a',
    storefront: ['#e8780a', '#c8203a', '#2a7ab0', '#3a9a4a', '#f0c020', '#8a2a8a'],
    props: ['lamp', 'tree', 'chaistall'],
    // The green-and-yellow auto-rickshaw. No operator name or logo.
    vehicle: 'autorickshaw',
    // Some rickshaws drive on ahead of you, then brake hard
    // (src/run/mechanics.js).
    mechanic: 'braker',
    landmarks: ['lahori', 'qutub', 'indiagate'],
    levels: [
      { // Chandni Chowk: the old city's great bazaar, painted shopfronts and
        // signboards, a tangle of wires overhead, the Red Fort at the end
        key: 'chandni', facade: 'bazaar',
        setback: 3.2, hBase: 9, hVar: 4, secondRow: 0.2,
        props: ['lamp', 'chaistall', 'souvenirstall'],
        ads: ['PARATHE', 'MITHAI', 'SAREES', 'SILVER', 'SPICES', 'BOOKS'],
        span: 'tangle', spanFreq: 0.9, spanY: 6.8, lit: 0.26,
        cameo: 'lahori',
      },
      { // Connaught Place: the white Georgian colonnades in a ring, shops
        // and cafes under them, a green park at the centre
        key: 'cp', facade: 'arcade', arcade: true,
        palette: ['#f2efe6', '#ece8dc', '#f4f0e8', '#e8e2d4', '#f0ece2', '#eae6da'],
        trim: '#ffffff', hBase: 10, hVar: 2, secondRow: 0.5,
        storefront: ['#2a7ab0', '#c8203a', '#3a9a4a', '#e8780a'],
        props: ['lamp', 'tree', 'flowerbed', 'souvenirstall'],
        ads: ['COFFEE HOUSE', 'BOOKS', 'CINEMA', 'TAILOR', 'CAFÉ'],
        lit: 0.18,
      },
      { // Kartavya Path: the long ceremonial avenue, lawns and trees either
        // side, red sandstone ministries, India Gate at the end
        key: 'kartavya', facade: 'beauxarts', setback: 8.4, hBase: 12, hVar: 3, secondRow: 0,
        palette: ['#c0644a', '#b85c44', '#c86c50', '#e8d0b0', '#bc6048', '#e0c8a8'],
        trim: '#f0dcc0', treeline: 'tree',
        props: ['lamp', 'flowerbed'],
        ads: ['INDIA GATE 1KM', 'CENTRAL VISTA'],
        cameo: 'indiagate', lit: 0.12,
      },
    ],
  },
  {
    id: 'bangkok', name: 'BANGKOK', flag: '🇹🇭', region: 'asia',
    streets: ['Yaowarat Road', 'Khao San Road', 'Khlong Bang Luang'],
    // Humid late afternoon: a clear blue top over a warm peach haze. The
    // colour is in the signs, the temple roofs and the tuk-tuks.
    sky: { top: '#3a78c8', mid: '#94bce0', horizon: '#ffd4a8', glow: '#ffb88a' },
    fog: 0xf4c8a0, fogDensity: 0.0102,
    sun: { color: 0xffe2b8, intensity: 2.5, pos: [50, 65, -45] },
    hemi: { sky: 0xd8e4f0, ground: 0x8a7a64, intensity: 1.1 },
    fill: { color: 0xffe6cc, intensity: 1.0 },
    road: '#4e4e54', lane: '#f2d040', sidewalk: '#b0a898',
    palette: ['#d8c8a8', '#e0b4a0', '#a8c8c0', '#d8d0b8', '#c8a888', '#b8c4a8'],
    trim: '#f2ece0', roof: '#a8442c',
    windowLit: '#ffd08a', windowDay: '#8ab4c8', accent: '#e8302a',
    storefront: ['#c8202a', '#e8a818', '#2a8a5a', '#2a5ab0', '#e85a8a'],
    facade: 'shophouse', hBase: 10, hVar: 5,
    props: ['lamp', 'tree', 'fruitcart'],
    // The three-wheeled tuk-tuk, in bright two-tone paint. No operator name
    // or logo.
    vehicle: 'tuktuk',
    // Some tuk-tuks make a U-turn across the road (src/run/mechanics.js).
    mechanic: 'uturn',
    landmarks: ['giantswing', 'watarun', 'chakri'],
    levels: [
      { // Yaowarat Road: Chinatown, gold shops and restaurants under tall
        // vertical neon signs that hang out over the street
        key: 'yaowarat', neonSigns: true,
        setback: 3.8, hBase: 12, hVar: 6, secondRow: 0.5,
        palette: ['#c8b898', '#d0a890', '#a0b8b0', '#c8c0a8', '#b89878', '#a8b498'],
        storefront: ['#c8202a', '#e8a818', '#c8202a', '#2a8a5a'],
        props: ['lamp', 'fruitcart', 'souvenirstall'],
        ads: ['GOLD', 'NOODLES', 'DIM SUM', 'TEA', 'BIRD NEST'],
        lit: 0.32,
      },
      { // Khao San Road: once the city's rice market, now guesthouses,
        // street food and string lights
        key: 'khaosan',
        setback: 3.4, hBase: 9, hVar: 3, secondRow: 0.2,
        palette: ['#e8c8a8', '#a8d0c8', '#e8b0b0', '#d8d8b0', '#b8c8e0', '#e0c0a0'],
        props: ['lamp', 'fruitcart', 'souvenirstall', 'awning'],
        ads: ['GUESTHOUSE', 'PAD THAI', 'MANGO', 'ICE CREAM', 'SILK'],
        span: 'string', spanFreq: 0.8, lit: 0.36,
      },
      { // Khlong Bang Luang: a canal-side lane of old wooden houses, the
        // water on one side, Wat Arun's spire across the river
        key: 'khlong', canal: true,
        setback: 3.2, hBase: 6, hVar: 2, secondRow: 0,
        palette: ['#8a6a4a', '#9a7a5a', '#7a5a3e', '#a08060', '#6a8a7a', '#8a7a5a'],
        trim: '#e8dcc4',
        props: ['lamp', 'tree'],
        ads: ['ART HOUSE', 'COFFEE', 'BOAT TRIPS'],
        cameo: 'watarun', lit: 0.2,
      },
    ],
  },
  {
    id: 'capetown', name: 'CAPE TOWN', flag: '🇿🇦', region: 'mideast-africa',
    streets: ['Bo-Kaap', 'Long Street', 'V&A Waterfront'],
    // A clear, windy day: hard blue sky, white cloud spilling over the flat
    // top of Table Mountain, Atlantic light. Bright paint everywhere.
    sky: { top: '#2a6ad0', mid: '#6aa8e8', horizon: '#cfe2f2', glow: '#e8f0f4' },
    fog: 0xc0d6ea, fogDensity: 0.0074,
    sun: { color: 0xfff4e0, intensity: 2.6, pos: [-60, 75, -30] },
    hemi: { sky: 0xd8e8fc, ground: 0x7a7468, intensity: 1.1 },
    fill: { color: 0xf0f4ff, intensity: 1.0 },
    road: '#4a4c52', lane: '#f2f2ea', sidewalk: '#b4b0a6',
    palette: ['#e8508a', '#8ad04a', '#4a9ae8', '#f2d040', '#a060d0', '#40c0b0'],
    trim: '#ffffff', roof: '#5a5a62',
    windowLit: '#ffe0a0', windowDay: '#8ac0e0', accent: '#1a7ad0',
    storefront: ['#1a7ad0', '#e8302a', '#f2b418', '#2a9a5a', '#8a3ab0'],
    props: ['lamp', 'tree', 'flagpole'],
    // The white minibus taxi. No operator name or logo. A tall wall, like
    // London's bus, and as rare; the other vehicles are ordinary cars.
    vehicle: 'minibus',
    // The Cape Doctor: wind gusts that push you a lane (src/run/mechanics.js).
    mechanic: 'gust',
    landmarks: ['clocktower', 'goodhope', 'cityhall'],
    levels: [
      { // Bo-Kaap: steep cobbled lanes of flat-roofed houses in bright
        // colours, Signal Hill behind
        key: 'bokaap', facade: 'flatpaint',
        roadStyle: 'cobble', road: '#6a6660', lane: '#6a6660', sidewalk: '#b8b0a4',
        setback: 3.2, hBase: 6, hVar: 2, secondRow: 0.2,
        props: ['lamp', 'flagpole', 'souvenirstall'],
        ads: ['SPICES', 'KOESISTERS', 'MUSEUM', 'CAFÉ'],
        lit: 0.12,
      },
      { // Long Street: Victorian shopfronts under iron-lace balconies
        key: 'longst', facade: 'veranda',
        palette: ['#e8d8c0', '#c8e0d8', '#f0d0c0', '#d8d0e8', '#e8e0b0', '#c8d8e8'],
        setback: 3.8, hBase: 10, hVar: 3, secondRow: 0.4,
        props: ['lamp', 'tree', 'flagpole', 'souvenirstall'],
        ads: ['BOOKS', 'VINYL', 'BAKERY', 'CAFÉ', 'BACKPACKERS'],
        span: 'string', spanFreq: 0.4, lit: 0.22,
      },
      { // V&A Waterfront: the working harbour, warehouses, the quay
        key: 'waterfront', facade: 'warehouse',
        palette: ['#b04a3a', '#c86a4a', '#a83e30', '#d8d0c0', '#3a5a7a', '#c05a40'],
        setback: 5.0, hBase: 9, hVar: 4, secondRow: 0.5,
        props: ['lamp', 'bollard', 'flagpole'],
        ads: ['FISH & CHIPS', 'BOAT TRIPS', 'AQUARIUM', 'MARKET'],
        cameo: 'tablemountain', lit: 0.16,
      },
    ],
  },
  {
    id: 'hanoi', name: 'HANOI', flag: '🇻🇳', region: 'asia',
    streets: ['Hang Gai', 'Train Street', 'Hoan Kiem Lake'],
    // A soft, humid afternoon: milky blue sky, warm haze. Mustard-yellow
    // plaster, green shutters, red lanterns, the lake's green water.
    sky: { top: '#4a84c4', mid: '#9cbcd8', horizon: '#f0dcb8', glow: '#f2c890' },
    fog: 0xe8d4b0, fogDensity: 0.0104,
    sun: { color: 0xffe8c0, intensity: 2.4, pos: [55, 65, -45] },
    hemi: { sky: 0xdce4ec, ground: 0x8a7a60, intensity: 1.1 },
    fill: { color: 0xffe8d0, intensity: 1.0 },
    road: '#4c4a4c', lane: '#ece6d4', sidewalk: '#a8a090',
    palette: ['#e8c050', '#e0b048', '#d8c890', '#c8d0b0', '#e8d4a0', '#d0a858'],
    trim: '#f4ecd8', roof: '#8a4a32',
    windowLit: '#ffd08a', windowDay: '#88b0c8', accent: '#c8202a',
    storefront: ['#c8202a', '#e8a818', '#2a7a5a', '#2a5ab0', '#a83a8a'],
    facade: 'tubehouse', hBase: 11, hVar: 5,
    props: ['lamp', 'tree'],
    // Motorbikes, Hanoi's traffic. Low enough to jump, short as a Vespa.
    vehicle: 'motorbike',
    // Motorbikes ride in pairs and swerve together (src/run/mechanics.js);
    // Train Street has its train instead.
    mechanic: 'swarm',
    landmarks: ['turtletower', 'longbien', 'vanmieu'],
    levels: [
      { // Hang Gai: the Old Quarter's silk street, narrow tube houses,
        // strings of silk lanterns overhead
        key: 'hanggai',
        setback: 3.2, secondRow: 0.3,
        props: ['lamp', 'souvenirstall'],
        ads: ['SILK', 'TAILOR', 'PHO', 'LANTERNS', 'COFFEE'],
        span: 'lanterns', spanFreq: 0.8, spanY: 7.4, lit: 0.28,
      },
      { // Train Street: houses a step from the rails, a train squeezing
        // through between them
        key: 'trainst', mechanic: 'train',
        roadStyle: 'trainline', setback: 2.4, hBase: 9, hVar: 3, secondRow: 0,
        palette: ['#d8b050', '#c8c090', '#b8c8a8', '#e0c070', '#c8a868', '#d0b888'],
        props: ['lamp', 'tree'],
        ads: ['COFFEE', 'EGG COFFEE', 'NOODLES'],
        lit: 0.2,
      },
      { // Hoan Kiem Lake: the lakeside road, the green water and its trees
        // on one side, the Turtle Tower on its island
        key: 'hoankiem', lake: true,
        setback: 4.4, hBase: 12, hVar: 4, secondRow: 0.4,
        props: ['lamp', 'tree'],
        ads: ['ICE CREAM', 'BOOKS', 'WATER PUPPETS'],
        cameo: 'turtletower', lit: 0.18,
      },
    ],
  },
  {
    id: 'seoul', name: 'SEOUL', flag: '🇰🇷', region: 'asia',
    streets: ['Insadong', 'Bukchon Hanok Village', 'Myeongdong'],
    // A crisp autumn day: deep clear blue, golden light, the mountains that
    // ring the city on the horizon. Grey tile roofs, white walls, dark
    // timber, and in Myeongdong the colour of a thousand shop signs.
    sky: { top: '#2a68c8', mid: '#7cb0e4', horizon: '#f2e4c8', glow: '#ffd8a0' },
    fog: 0xe8dcc4, fogDensity: 0.0086,
    sun: { color: 0xfff0d0, intensity: 2.5, pos: [-55, 70, -40] },
    hemi: { sky: 0xd8e4f4, ground: 0x7a7060, intensity: 1.1 },
    fill: { color: 0xfff0dc, intensity: 1.0 },
    road: '#4a4a50', lane: '#f2f0e4', sidewalk: '#b0aaa0',
    palette: ['#ece6d8', '#e4dccc', '#f0eadc', '#d8d0c0', '#e8e0d0', '#dcd4c4'],
    trim: '#3a3a40', roof: '#3a3c42',
    windowLit: '#ffdca0', windowDay: '#a8c4dc', accent: '#c8302a',
    storefront: ['#6a3a2a', '#2a5a7a', '#8a2a3a', '#3a6a4a', '#c8902a'],
    facade: 'hanok', hBase: 5, hVar: 2,
    props: ['lamp', 'tree'],
    // Seoul's green city bus. A wall, as rare as London's; the rest of the
    // traffic is ordinary cars. No operator name or logo.
    vehicle: 'seoulbus',
    // Crowds cross when the countdown runs out (src/run/mechanics.js).
    mechanic: 'crossing',
    landmarks: ['heunginjimun', 'gyeonghoeru', 'geunjeongjeon'],
    levels: [
      { // Insadong: the street of tea houses, galleries and craft shops,
        // in low traditional-style buildings
        key: 'insadong', hBase: 6, hVar: 2,
        setback: 3.4, secondRow: 0.4,
        props: ['lamp', 'tree', 'souvenirstall'],
        ads: ['TEA HOUSE', 'GALLERY', 'PAPER', 'POTTERY', 'BRUSHES'],
        span: 'lanterns', spanFreq: 0.5, spanY: 6.6, lit: 0.22,
      },
      { // Bukchon: lanes of hanok houses under curved tile roofs, on the
        // hill between two palaces
        key: 'bukchon', hBase: 4, hVar: 1,
        roadStyle: 'cobble', road: '#6a6a6c', lane: '#6a6a6c', sidewalk: '#a8a49c',
        setback: 2.8, secondRow: 0.6,
        props: ['lamp', 'tree'],
        ads: ['TEA', 'CRAFTS'],
        lit: 0.14,
      },
      { // Myeongdong: the shopping streets, signs stacked up every front,
        // street-food stalls down the middle of the evening
        key: 'myeongdong', facade: 'neon', hBase: 16, hVar: 14,
        palette: ['#4e5462', '#5a606e', '#3e4452', '#565064', '#4a5668', '#605a6e'],
        storefront: ['#e3128a', '#12c4e3', '#f2e216', '#8a2ae8', '#ff5a1e'],
        sky: { top: '#1a2a5a', mid: '#4a5a9a', horizon: '#c08ab0', glow: '#d898b8' },
        fog: 0xc890b0, fogDensity: 0.0098,
        mood: { sun: 0.5, hemi: 0.7, fill: 0.85 },
        props: ['lamp', 'fruitcart', 'souvenirstall'],
        ads: ['SKINCARE', 'K-POP', 'HOTTEOK', 'SOCKS', 'CAFÉ', 'NOODLES'],
        span: 'string', spanFreq: 0.6, lit: 0.42,
      },
    ],
  },
  {
    id: 'samarkand', name: 'SAMARKAND', flag: '🇺🇿', region: 'asia',
    streets: ['Tashkent Street', 'Siab Bazaar', 'Registan Square'],
    // Dry, bright desert light: a hard blue sky fading to pale dust at the
    // horizon. Sand-coloured brick everywhere, and on it the turquoise and
    // cobalt tile the city is famous for.
    sky: { top: '#2a64c8', mid: '#7aaee4', horizon: '#f4e0b8', glow: '#ffd090' },
    fog: 0xecd8b0, fogDensity: 0.0084,
    sun: { color: 0xfff0d0, intensity: 2.7, pos: [50, 75, -45] },
    hemi: { sky: 0xd8e4f4, ground: 0xa08a68, intensity: 1.1 },
    fill: { color: 0xfff0dc, intensity: 1.0 },
    road: '#8a7a64', lane: '#f2e8d0', sidewalk: '#c8b494',
    palette: ['#d8b888', '#d0ae7e', '#dcc094', '#c8a676', '#d4b484', '#e0c49a'],
    trim: '#2aa8b8', roof: '#8a7050',
    windowLit: '#ffd08a', windowDay: '#88b0c8', accent: '#2a4aa8',
    storefront: ['#2aa8b8', '#2a4aa8', '#c8902a', '#a83a2a', '#3a8a5a'],
    facade: 'tilework', hBase: 8, hVar: 4,
    props: ['lamp', 'cypress', 'souvenirstall'],
    // The little white minivan that is everywhere in Uzbekistan. A car, low
    // enough to jump. No make or logo.
    vehicle: 'minivan',
    // Walls of tiled arches across the road (src/run/mechanics.js).
    mechanic: 'arches',
    landmarks: ['observatory', 'gurlamir', 'registan'],
    levels: [
      { // Tashkent Street: the pedestrian street from the Registan to the
        // great mosque, tiled fronts and craft shops
        key: 'tashkent',
        setback: 4.2, secondRow: 0.4,
        props: ['lamp', 'cypress', 'souvenirstall', 'rugs'],
        ads: ['SUZANI', 'CERAMICS', 'SILK', 'BREAD', 'SPICES'],
        lit: 0.18,
      },
      { // Siab Bazaar: the city's great market, fruit, nuts and round
        // patterned loaves of bread under long awnings
        key: 'siab', facade: 'market',
        setback: 3.2, hBase: 6, hVar: 2, secondRow: 0,
        palette: ['#d0ae7e', '#c8a676', '#d8b888', '#c09e70', '#ccaa7a', '#d4b484'],
        props: ['awning', 'fruitcart', 'souvenirstall'],
        ads: ['MELONS', 'NON BREAD', 'DRIED FRUIT', 'NUTS', 'TEA'],
        span: 'slats', spanFreq: 0.5, spanY: 6.6, lit: 0.2,
      },
      { // Registan Square: the wide approach to the three madrasas, their
        // tiled gates and turquoise domes ahead
        key: 'registanst', setback: 7.4, hBase: 10, hVar: 3, secondRow: 0.3,
        props: ['lamp', 'cypress'],
        ads: ['REGISTAN', 'MUSEUM'],
        cameo: 'registan', lit: 0.14,
      },
    ],
  },
  {
    id: 'zanzibar', name: 'ZANZIBAR', flag: '🇹🇿', region: 'mideast-africa',
    streets: ['Kenyatta Road', 'Darajani Market', 'Forodhani Gardens'],
    // Tropical afternoon by the Indian Ocean: bright turquoise sky, white
    // light on weathered coral-stone walls, dark carved teak doors.
    sky: { top: '#2a80d0', mid: '#80c4ec', horizon: '#f2ead4', glow: '#ffe0a8' },
    fog: 0xe8e4d4, fogDensity: 0.0088,
    sun: { color: 0xfff4dc, intensity: 2.6, pos: [55, 75, -40] },
    hemi: { sky: 0xd4ecf8, ground: 0x9a8a70, intensity: 1.1 },
    fill: { color: 0xfff2e0, intensity: 1.0 },
    road: '#7a7468', lane: '#f0ece0', sidewalk: '#bcb4a4',
    palette: ['#ece4d4', '#e4dac6', '#f0eadc', '#d8ccb6', '#e8e0cc', '#dcd2bc'],
    trim: '#5a3a24', roof: '#8a6a4a',
    windowLit: '#ffd8a0', windowDay: '#8ab4c8', accent: '#2a8aa8',
    storefront: ['#2a8aa8', '#c8502a', '#3a8a5a', '#e8b020', '#8a3a6a'],
    facade: 'coral', hBase: 9, hVar: 3,
    props: ['lamp', 'palm', 'souvenirstall'],
    // The dala dala, an open-backed truck turned into a minibus. A wall,
    // as rare as London's bus; the rest are ordinary cars. No markings.
    vehicle: 'daladala',
    // Houses jut out and the street narrows (src/run/mechanics.js).
    mechanic: 'narrows',
    landmarks: ['oldfort', 'christchurch', 'wonders'],
    levels: [
      { // Kenyatta Road: Stone Town's old shopping street, coral-stone
        // houses with carved doors and closed wooden balconies
        key: 'kenyatta',
        setback: 3.0, secondRow: 0.2,
        props: ['lamp', 'souvenirstall', 'rugs'],
        ads: ['SPICES', 'KANGA', 'CARVINGS', 'COFFEE', 'TOURS'],
        lit: 0.18,
      },
      { // Darajani Market: the main market, spices and fruit and fish, the
        // crowds and the dala dala stops outside
        key: 'darajani', facade: 'market',
        setback: 3.4, hBase: 7, hVar: 2, secondRow: 0,
        props: ['awning', 'fruitcart', 'souvenirstall'],
        ads: ['SPICES', 'CLOVES', 'MANGOES', 'FISH', 'COCONUTS'],
        span: 'string', spanFreq: 0.4, lit: 0.2,
      },
      { // Forodhani Gardens: the seafront, the ocean on one side, the
        // gardens and the old palaces along the other
        key: 'forodhani', lake: true,
        setback: 5.6, hBase: 11, hVar: 3, secondRow: 0.3,
        props: ['lamp', 'palm'],
        ads: ['SEAFOOD', 'SUGARCANE', 'DHOW TRIPS'],
        cameo: 'wonders', lit: 0.16,
      },
    ],
  },
  {
    id: 'beijing', name: 'BEIJING', flag: '🇨🇳', region: 'asia',
    streets: ['Nanluoguxiang', 'Wangfujing', 'Qianmen Street'],
    // A clear autumn afternoon in the north: a pale cold blue sky, low gold
    // sun. Grey hutong brick, red doors and lanterns, yellow glazed roofs.
    sky: { top: '#3a70c0', mid: '#9ab8dc', horizon: '#f2e2c4', glow: '#ffcc90' },
    fog: 0xe4d8c0, fogDensity: 0.0094,
    sun: { color: 0xffe8c4, intensity: 2.5, pos: [-50, 60, -45] },
    hemi: { sky: 0xd8e2f0, ground: 0x7a7060, intensity: 1.1 },
    fill: { color: 0xffecd4, intensity: 1.0 },
    road: '#5a5a5e', lane: '#ece8dc', sidewalk: '#a4a09a',
    palette: ['#7a7a78', '#828280', '#727272', '#8a8884', '#767674', '#7e7c78'],
    trim: '#3a3c42', roof: '#3a3c42',
    windowLit: '#ffd498', windowDay: '#9ab4c8', accent: '#c8202a',
    storefront: ['#c8202a', '#2a6a4a', '#e8b020', '#2a4a8a', '#8a2a2a'],
    facade: 'hutong', hBase: 4.5, hVar: 1,
    props: ['lamp', 'tree'],
    // A two-tone city taxi. No operator name or logo.
    vehicle: 'bjtaxi',
    // Delivery tricycles: a low load you jump, a tall one you go round
    // (src/run/mechanics.js).
    mechanic: 'tricycle',
    landmarks: ['drumtower', 'qiniandian', 'taihedian'],
    levels: [
      { // Nanluoguxiang: a hutong lane of grey courtyard walls, red doors and
        // tiled roofs, lanterns overhead
        key: 'nanluogu',
        setback: 2.8, secondRow: 0.5,
        props: ['lamp', 'tree', 'souvenirstall'],
        ads: ['DUMPLINGS', 'TEA', 'YOGHURT', 'CRAFTS'],
        span: 'lanterns', spanFreq: 0.6, spanY: 6.0, lit: 0.2,
      },
      { // Wangfujing: the big shopping street, department stores and
        // brand shops, a wide pedestrian way
        key: 'wangfujing', facade: 'deptstore', hBase: 18, hVar: 12,
        palette: ['#d8d0c0', '#c8c4bc', '#e0d8c8', '#bcc0c4', '#d0c8b8', '#c4bcb0'],
        trim: '#ece6d8', storefront: ['#1a2a44', '#c8202a', '#3a2a1c', '#14342c'],
        setback: 5.4, secondRow: 0.6,
        props: ['lamp', 'tree', 'flowerbed'],
        ads: ['BOOKSTORE', 'SNACK STREET', 'DEPARTMENT STORE', 'TEA HOUSE'],
        lit: 0.2,
      },
      { // Qianmen Street: the old shopping street south of the city gate,
        // red and green painted shopfronts with gilded signboards
        key: 'qianmen', hBase: 7, hVar: 2,
        palette: ['#8a3a2a', '#7a2a24', '#2a5a4a', '#8a4a2a', '#6a2a24', '#2a4a3a'],
        trim: '#d8a838', setback: 4.4, secondRow: 0.3,
        props: ['lamp', 'souvenirstall'],
        ads: ['ROAST DUCK', 'TEA', 'SILK', 'SHOES', 'HATS'],
        span: 'lanterns', spanFreq: 0.7, spanY: 7.0, lit: 0.24,
      },
    ],
  },
  {
    id: 'havana', name: 'HAVANA', flag: '🇨🇺', region: 'latin-america',
    streets: ['Malecón', 'Calle Obispo', 'Paseo del Prado'],
    // Caribbean late afternoon: a deep warm blue sky, the sun low over the
    // sea, sun-faded pastel walls, and the chrome of old cars.
    sky: { top: '#2a6ac8', mid: '#7ab6e8', horizon: '#ffe0b0', glow: '#ffbc80' },
    fog: 0xf4d4b0, fogDensity: 0.0086,
    sun: { color: 0xffe2b0, intensity: 2.6, pos: [-60, 55, -40] },
    hemi: { sky: 0xd4e8f8, ground: 0x9a8a70, intensity: 1.1 },
    fill: { color: 0xffe8d0, intensity: 1.0 },
    road: '#5a5856', lane: '#f2ead8', sidewalk: '#c4b8a4',
    palette: ['#e8a0b0', '#a0d0c8', '#f0d090', '#b0c8e8', '#e8c0a0', '#c8e0a0'],
    trim: '#f4efe4', roof: '#a86a4a',
    windowLit: '#ffd498', windowDay: '#8ab8d0', accent: '#2a7ab0',
    storefront: ['#2a7ab0', '#c8402a', '#e8a018', '#3a8a5a', '#8a3a8a'],
    facade: 'colonial', hBase: 10, hVar: 3,
    props: ['lamp', 'palm'],
    // Old American cars of the 1950s, kept running and painted bright:
    // generic shapes, no make's grille, badge or name. Low enough to jump.
    vehicle: 'classiccar',
    // Old cars pull out from the kerb (src/run/mechanics.js); on the
    // Malecón, waves break over the sea wall instead.
    mechanic: 'pullout',
    landmarks: ['realfuerza', 'habanacathedral', 'morro'],
    levels: [
      { // The Malecón: the seafront road, the sea wall on one side and a
        // row of weathered, colourful houses on the other
        key: 'malecon', lake: true, seawall: true, mechanic: 'waves',
        setback: 4.6, hBase: 11, hVar: 4, secondRow: 0.2,
        props: ['lamp'],
        ads: ['CAFÉ', 'RUMBA', 'MUSIC'],
        cameo: 'morro', lit: 0.16,
      },
      { // Calle Obispo: the narrow old shopping street of Old Havana,
        // balconies, shutters and music from open doors
        key: 'obispo',
        setback: 3.0, hBase: 9, hVar: 2, secondRow: 0,
        props: ['lamp', 'souvenirstall'],
        ads: ['BOOKS', 'PHARMACY', 'CAFÉ', 'MUSIC', 'ICE CREAM'],
        span: 'string', spanFreq: 0.5, lit: 0.22,
      },
      { // Paseo del Prado: the tree-lined promenade with its marble benches
        // down the middle, grand old houses either side
        key: 'prado', treeline: 'tree',
        setback: 5.6, hBase: 13, hVar: 3, secondRow: 0.4,
        props: ['lamp', 'flowerbed'],
        ads: ['HOTEL', 'THEATRE', 'CAFÉ'],
        lit: 0.18,
      },
    ],
  },
  {
    id: 'istanbul', name: 'ISTANBUL', flag: '🇹🇷', region: 'europe',
    streets: ['İstiklal Avenue', 'Grand Bazaar', 'Divanyolu'],
    // A soft gold evening over the Bosphorus: deep blue sky, warm haze, the
    // domes and minarets of the old city in silhouette.
    sky: { top: '#2a5ab8', mid: '#7a9ed8', horizon: '#ffd4a0', glow: '#ffb070' },
    fog: 0xf0c898, fogDensity: 0.009,
    sun: { color: 0xffdcb0, intensity: 2.5, pos: [60, 50, -45] },
    hemi: { sky: 0xd4e0f0, ground: 0x8a7a64, intensity: 1.1 },
    fill: { color: 0xffe4cc, intensity: 1.0 },
    road: '#5a5652', lane: '#ece6d8', sidewalk: '#b4aa9a',
    palette: ['#e0c8a8', '#d4b8a0', '#c8c0b0', '#e8d4b8', '#c8b098', '#d8c4b0'],
    trim: '#f2ece0', roof: '#8a5a44',
    windowLit: '#ffd498', windowDay: '#9ab8d0', accent: '#c8202a',
    storefront: ['#c8202a', '#2a5aa8', '#2a8a7a', '#c88a20', '#6a2a4a'],
    props: ['lamp', 'tree'],
    // The yellow city taxi. No operator name or logo.
    vehicle: 'taxi',
    // The tram down the middle of the street (src/run/mechanics.js); in the
    // Grand Bazaar, porters' carts instead.
    mechanic: 'tram',
    landmarks: ['galata', 'bluemosque', 'hagiasophia'],
    levels: [
      { // İstiklal Avenue: the long pedestrian street of Beyoğlu, grand
        // 19th-century apartment fronts, the red tram on its single track
        key: 'istiklal', facade: 'beauxarts',
        roadStyle: 'streetcar', road: '#6a6460', lane: '#6a6460', sidewalk: '#b8ae9e',
        setback: 3.8, hBase: 14, hVar: 6, secondRow: 0.4,
        props: ['lamp', 'streetcar_pole', 'souvenirstall'],
        ads: ['SIMIT', 'BOOKS', 'CINEMA', 'LOKUM', 'MUSIC'],
        span: 'wires', spanFreq: 0.7, spanY: 7.2,
        cameo: 'galatacameo', lit: 0.22,
      },
      { // The Grand Bazaar: covered lanes of shops under painted vaults,
        // lamps, carpets and gold, porters pushing carts through the crowd
        key: 'bazaar', facade: 'market', mechanic: 'handcart',
        setback: 3.0, hBase: 6, hVar: 1, secondRow: 0,
        palette: ['#d8c4a0', '#e0ccaa', '#c8b490', '#d0bc98', '#e4d0ae', '#ccb894'],
        props: ['rugs', 'souvenirstall', 'awning'],
        ads: ['CARPETS', 'LAMPS', 'GOLD', 'SPICES', 'CERAMICS', 'TEA'],
        span: 'slats', spanFreq: 1, spanY: 6.0, lit: 0.3,
      },
      { // Divanyolu: the old imperial road through Sultanahmet, the tram
        // along it, the great mosques ahead
        key: 'divanyolu',
        roadStyle: 'streetcar', road: '#5e5a56', lane: '#5e5a56',
        setback: 4.6, hBase: 9, hVar: 3, secondRow: 0.3,
        props: ['lamp', 'streetcar_pole', 'tree'],
        ads: ['KEBAB', 'BAKLAVA', 'TEA GARDEN', 'CARPETS'],
        span: 'wires', spanFreq: 0.6, spanY: 7.2,
        cameo: 'domes', lit: 0.18,
      },
    ],
  },
  {
    id: 'chicago', name: 'CHICAGO', flag: '🌆', region: 'north-america',
    streets: ['Michigan Avenue', 'The Loop', 'Wacker Drive'],
    // A crisp autumn afternoon off the lake: clear blue, a cool bright
    // haze. Brick and limestone, steel and glass, and the river.
    sky: { top: '#2a62c0', mid: '#80b0e0', horizon: '#e8e4d8', glow: '#ffd8a0' },
    fog: 0xd8d8d0, fogDensity: 0.0082,
    sun: { color: 0xfff0d8, intensity: 2.5, pos: [-55, 65, -40] },
    hemi: { sky: 0xd4e0f0, ground: 0x7a7468, intensity: 1.05 },
    fill: { color: 0xf8f0e4, intensity: 1.0 },
    road: '#46464c', lane: '#f2d040', sidewalk: '#b0aca4',
    palette: ['#a8604a', '#c8b898', '#8a9aa8', '#b8784e', '#d0c4a8', '#7a8898'],
    trim: '#e8e2d4', roof: '#4a4a50',
    windowLit: '#ffd898', windowDay: '#9cc0e0', accent: '#2a5ab0',
    storefront: ['#2a5ab0', '#c8302a', '#2a7a4a', '#e8a018', '#3a3a44'],
    hBase: 26, hVar: 30,
    props: ['lamp', 'tree', 'hydrant'],
    // The yellow city taxi. No operator name or logo.
    vehicle: 'taxi',
    // The river's bascule bridges rise as you come (src/run/mechanics.js);
    // under the elevated tracks of the Loop, cabs pull out from the kerb.
    mechanic: 'bridge',
    landmarks: ['watertower', 'buckingham', 'willis'],
    levels: [
      { // Michigan Avenue: the grand shopping avenue north of the river,
        // limestone and terracotta towers, the old Water Tower on it
        key: 'michigan', facade: 'deptstore',
        palette: ['#d8ccb0', '#c8bca0', '#e0d4bc', '#b8ac94', '#d0c4a8', '#c4b89c'],
        setback: 5.6, secondRow: 0.7,
        props: ['lamp', 'tree', 'flowerbed'],
        ads: ['DEPARTMENT STORE', 'BOOKS', 'CHOCOLATE', 'SHOES', 'CAFÉ'],
        cameo: 'watertowercameo', lit: 0.16,
      },
      { // The Loop: under the elevated railway, its steel columns along the
        // kerbs and trains rumbling overhead
        key: 'loop', elevated: true, mechanic: 'pullout',
        setback: 4.4, hBase: 30, hVar: 34, secondRow: 0.8,
        props: ['lamp', 'hydrant', 'newsstand'],
        ads: ['THEATRE', 'JAZZ', 'HOT DOGS', 'PIZZA', 'RECORDS'],
        lit: 0.2,
      },
      { // Wacker Drive: along the river, its bridges, the towers stepping
        // up to the tallest of them all
        key: 'wacker', facade: 'beauxarts', lake: true,
        setback: 5.0, hBase: 34, hVar: 40, secondRow: 0.6,
        props: ['lamp', 'tree'],
        ads: ['BOAT TOURS', 'ARCHITECTURE', 'RIVERWALK'],
        cameo: 'williscameo', lit: 0.18,
      },
    ],
  },
];

export const LANDMARK_NAMES = {
  empire: 'Empire State Building', chrysler: 'Chrysler Building', brooklyn: 'Brooklyn Bridge',
  eiffel: 'Eiffel Tower', arc: 'Arc de Triomphe', louvre: 'Louvre Pyramid',
  bigben: 'Big Ben', towerbridge: 'Tower Bridge', eye: 'London Eye',
  colosseum: 'Colosseum', trevi: 'Trevi Fountain', pantheon: 'Pantheon',
  ggbridge: 'Golden Gate Bridge', coit: 'Coit Tower', paintedladies: 'Painted Ladies',
  kotel: 'The Western Wall', domerock: 'The Dome of the Rock', towerdavid: 'Tower of David',
  holysepulchre: 'Church of the Holy Sepulchre',
  templomayor: 'Templo Mayor', catedral: 'Metropolitan Cathedral', castillo: 'Chapultepec Castle',
  koutoubia: 'Koutoubia Minaret', babagnaou: 'Bab Agnaou', benyoussef: 'Ben Youssef Madrasa',
  lahori: 'Red Fort', qutub: 'Qutub Minar', indiagate: 'India Gate',
  giantswing: 'Giant Swing', watarun: 'Wat Arun', chakri: 'Chakri Maha Prasat',
  clocktower: 'Waterfront Clock Tower', goodhope: 'Castle of Good Hope', cityhall: 'Cape Town City Hall',
  turtletower: 'Turtle Tower', longbien: 'Long Bien Bridge', vanmieu: 'Temple of Literature',
  heunginjimun: 'Heunginjimun Gate', gyeonghoeru: 'Gyeonghoeru Pavilion', geunjeongjeon: 'Geunjeongjeon Hall',
  observatory: 'Ulugh Beg Observatory', gurlamir: 'Gur-e-Amir', registan: 'The Registan',
  oldfort: 'The Old Fort', christchurch: 'Christ Church Cathedral', wonders: 'House of Wonders',
  drumtower: 'Drum Tower', qiniandian: 'Hall of Prayer for Good Harvests', taihedian: 'Hall of Supreme Harmony',
  realfuerza: 'Castillo de la Real Fuerza', habanacathedral: 'Havana Cathedral', morro: 'Morro Castle',
  galata: 'Galata Tower', bluemosque: 'Blue Mosque', hagiasophia: 'Hagia Sophia',
  watertower: 'Chicago Water Tower', buckingham: 'Buckingham Fountain', willis: 'Willis Tower',
};

// Merge a street's overrides over its city base. `streetKey` uniquely tags
// textures/materials in the builder caches so streets never share facades.
export function resolveStreet(city, level) {
  const ov = (city.levels && city.levels[level - 1]) || {};
  return { ...city, ...ov, streetKey: ov.key || `${city.id}${level}` };
}
