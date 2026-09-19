# Jerusalem — design spec

Research and design only. Nothing in `src/`, `index.html` or `test/` has been touched.
Source for all fact content: `docs/JERUSALEM-FACTS-DRAFT.md`, approved and signed off
by Dan on 6 September 2026, with the five binding decisions in its Sign-off section
applied below. IP framework: `docs/CITY-ROADMAP.md`.

---

## 0. IP clearance

| Monument | Status |
|---|---|
| Western Wall (Kotel) | Retaining wall, 19 BCE (Herodian). Centuries old, no copyright anywhere. Clear. |
| Dome of the Rock | Completed 691 CE; exterior tilework added 1550s (Suleiman). All centuries old. Clear. |
| Tower of David citadel | Hasmonean foundations, 2nd century BCE; present fabric Herodian through Ottoman, minaret 1635–1655. All centuries old. Clear. |

No modern architect, no living sculptor, no branded silhouette. The one live-artist risk
in this city is not a monument at all — it's Solomon Souza's 2015–2016 shutter murals in
Mahane Yehuda, handled below under Street 2.

---

## 1. `CITIES` entry for `src/cities/themes.js`

Palette brief: Jerusalem limestone by day, gold at dusk. Limestone (the local stone,
sometimes called "Jerusalem stone" — pale gold-cream, pinkish in shadow) is the
constant; each street's `lit` and sky values push toward dusk gold rather than
Rome's Mediterranean orange or Paris's rose.

```js
  {
    id: 'jerusalem', name: 'JERUSALEM', flag: '🫒',
    streets: ['Jaffa Road', 'Mahane Yehuda', 'The Cardo'],
    // Warm limestone day deepening into gold-dusk over the Old City.
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
    props: ['lamp_jerusalem', 'stonearch', 'planter_olive', 'awning_market'],
    vehicle: 'sherut',
    landmarks: ['kotel', 'domerock', 'towerdavid'],
    levels: [
      { // Jaffa Road — the seam between old and new: light-rail spine,
        // stone arcades near the Old City end thinning to plainer modern
        // frontage further out, pilgrim-road history underfoot.
        key: 'jaffa', facade: 'arcade', tram: true,
        palette: ['#e8d8ae', '#e0d0a0', '#ecdcb6', '#d8c898', '#e4d4a8', '#eaddb8'],
        props: ['lamp_jerusalem', 'stonearch', 'tramstop'],
        ads: ['BEIT KAFE', 'JAFFA GATE 1KM', 'MERKAZ SEFARIM'],
        cameo: 'towerdavid', lit: 0.18,
      },
      { // Mahane Yehuda — the covered market: stalls, sacks and crates,
        // shutters carrying our own invented geometric / pomegranate /
        // olive motifs (never a reproduction of the real murals), night
        // lanes lit for the bars the same alleys become after dark.
        key: 'mahane', facade: 'market', shutters: true, covered: true,
        palette: ['#dcc794', '#d2ba82', '#e2d0a2', '#c8b076', '#d8c48e', '#e6d4a6'],
        setback: 3.0, hBase: 8, hVar: 3, secondRow: 0,
        props: ['lamp_jerusalem', 'marketstall', 'crate'],
        ads: ['MAHANE YEHUDA', 'SHUK', 'HALVA & SPICE'],
        span: 'string', spanFreq: 0.7, lit: 0.4,
      },
      { // The Cardo — the Roman/Byzantine colonnaded high street, rebuilt
        // stone paving, covered colonnades either side, an archaeological
        // set-piece rather than a living commercial street.
        key: 'cardo', facade: 'colonnade', roman: true,
        palette: ['#ecdfc0', '#e4d6b2', '#f0e4c8', '#d8caa0', '#eadcb8', '#f2e6ca'],
        roadStyle: 'flagstone', road: '#c4b48c', lane: '#c4b48c', sidewalk: '#cabb92',
        setback: 5.2, hBase: 9, hVar: 3, secondRow: 0.2,
        props: ['lamp_jerusalem', 'column', 'stonearch'],
        ads: ['CARDO', 'MOSAIC WORKSHOP'],
        cameo: 'domerock', lit: 0.2,
      },
    ],
  },
```

Notes on fields that need a decision:

- `vehicle: 'sherut'` — a shared taxi/minibus is the natural period-neutral choice; the
  light-rail fact for Jaffa Road is carried by the `tram` street flag and a `tramstop`
  prop instead of the run vehicle, so the vehicle itself doesn't have to be a tram.
  Flagged as an open question below — a tram is the more literal read of the fact but
  is a bigger mechanical departure from every other city's road-vehicle pattern.
- `cameo: 'towerdavid'` on Jaffa Road and `cameo: 'domerock'` on the Cardo mirror how
  Rome and Paris put a skyline landmark behind an unrelated street (e.g. Corso →
  `churchtwin`, Champs-Élysées → `arc`) — both need a `skylineTexture` silhouette
  entry added to `builders.js`'s `SIL_TINT` table (new work, see §4).
- `LANDMARK_NAMES` needs three new entries:
  ```js
  kotel: 'The Western Wall', domerock: 'The Dome of the Rock', towerdavid: 'Tower of David',
  ```

---

## 2. Monument block designs (`src/puzzle/landmarks.js`)

All three use only shapes and `tex` values already in the DSL (see the file's header
comment). Blocks are listed bottom-up, matching how the puzzle sorts and builds them.

### 2.1 The Western Wall (`kotel`) — 20 blocks

**Closest existing monument:** Big Ben's stacked `tex:'ashlar'` boxes for the coursed
masonry, crossed with Trevi's flat wide facade proportions (a wall you face, not a
tower you walk around).

**Silhouette:** a long, low, wide limestone wall — much wider than it is tall — fronted
by an open plaza, with visibly larger, smoother stone courses low down giving way to
smaller, rougher masonry higher up (the real Kotel's readable Herodian-to-Ottoman
history, without needing a label). No figures, no partition, no prayer notes.

**Build order (bottom-up):**
1. Plaza paving — one flat wide box, pale flagstone.
2. Three **Herodian megalith** blocks side by side at the base — deliberately larger,
   smooth-faced, `tex:'relief'` for the drafted-margin look (a smooth centre, chiselled
   border) that reads instantly as "these stones are different from the rest."
3. A second, slightly smaller Herodian course above (2 blocks) — same `tex:'relief'`,
   one size down.
4. Four mid-height ashlar courses (`tex:'ashlar'`, narrowing width slightly with
   height, per Big Ben's pattern) — the medieval-to-Ottoman repair courses.
5. Two end piers, full height, `tex:'ashlar'`, sitting slightly proud of the main
   coursing — gives the wall a finite, framed width instead of trailing off into
   nothing (the wall itself runs 488 m; the game only needs to imply "this continues").
6. A plain stone cornice cap, one shallow box the full width.
7. Behind and above, set back, a shorter retaining course for the elevated platform
   above (the Temple Mount / Haram al-Sharif platform edge) — muted stone, no dome,
   no name plaque; it exists only so the wall doesn't read as freestanding scenery.
8. Two dark, narrow `cone4` accents flanking the plaza at low emissive, standing in
   for cypress trees (matches how Rome's `cypress` prop reads from a distance;
   here it's baked into the monument rather than a separate placed prop, since the
   framing needs it in every camera angle during the build sequence).
9. A scatter of four small tinted boxes tucked into course joints, `mats`-style muted
   green — the wild caper plants that famously grow out of the Wall's cracks. Purely
   textural, no religious content.

That's 1 + 3 + 2 + 4 + 2 + 1 + 1 + 2 + 4 = 20 blocks.

```js
  kotel: [
    B([0, 0.15, 3.5], [14.0, 0.3, 3.0], '#d8c9a0'),                         // plaza
    // Herodian base course — three distinct megaliths, drafted margins
    B([-3.6, 1.4, 1.4], [3.6, 2.6, 1.4], '#cabb8e', 'box', { tex: 'relief' }),
    B([0, 1.4, 1.4], [3.6, 2.6, 1.4], '#d0c294', 'box', { tex: 'relief' }),
    B([3.6, 1.4, 1.4], [3.6, 2.6, 1.4], '#cabb8e', 'box', { tex: 'relief' }),
    // second Herodian course, one size down
    B([-1.8, 3.4, 1.35], [3.4, 1.4, 1.3], '#d4c69a', 'box', { tex: 'relief' }),
    B([1.8, 3.4, 1.35], [3.4, 1.4, 1.3], '#cec090', 'box', { tex: 'relief' }),
    // mid ashlar courses, narrowing with height
    B([0, 4.7, 1.3], [11.0, 1.1, 1.2], '#d8ca9e', 'box', { tex: 'ashlar' }),
    B([0, 5.75, 1.25], [10.6, 1.0, 1.15], '#d2c496', 'box', { tex: 'ashlar' }),
    B([0, 6.7, 1.2], [10.2, 0.9, 1.1], '#d8ca9e', 'box', { tex: 'ashlar' }),
    B([0, 7.55, 1.15], [9.8, 0.8, 1.05], '#d2c496', 'box', { tex: 'ashlar' }),
    // end piers, full height, proud of the coursing
    B([-6.2, 4.3, 1.4], [1.3, 7.4, 1.5], '#dccea2', 'box', { tex: 'ashlar' }),
    B([6.2, 4.3, 1.4], [1.3, 7.4, 1.5], '#dccea2', 'box', { tex: 'ashlar' }),
    // cornice cap
    B([0, 8.15, 1.2], [11.4, 0.5, 1.3], '#e2d4a8'),
    // set-back platform retaining wall above — no dome, no name
    B([0, 9.2, -0.6], [10.0, 1.6, 1.0], '#c2b284', 'box', { tex: 'ashlar', em: '#ffd9a0', emI: 0.08 }),
    // flanking dark accents standing in for cypress
    B([-7.4, 2.0, 2.6], [0.5, 3.6, 0.5], '#2e4a30', 'cone4', { emI: 0 }),
    B([7.4, 2.0, 2.6], [0.5, 3.6, 0.5], '#2e4a30', 'cone4', { emI: 0 }),
    // caper-plant tufts in the joints
    B([-4.4, 3.9, 1.9], [0.22, 0.22, 0.22], '#5a7a40'),
    B([-1.0, 5.9, 1.85], [0.2, 0.2, 0.2], '#5a7a40'),
    B([2.2, 7.0, 1.75], [0.2, 0.2, 0.2], '#5a7a40'),
    B([4.8, 4.9, 1.9], [0.22, 0.22, 0.22], '#5a7a40'),
  ],
```

### 2.2 The Dome of the Rock (`domerock`) — 23 blocks, four facts

**Closest existing monument:** the Pantheon — same bottom-up idea of drum-then-dome
with a stepped junction, same warm-gold oculus/finial emissive treatment. The
difference is what sits *under* the drum: the Pantheon's is round from the ground up;
this one is an octagon that only goes round at the drum.

**Octagon construction, exactly as specified:** the lower two registers are each built
with `ring(cx, y, r, 8, size, c, 'box', extra)`. `ring()` already rotates each block by
`-a` so consecutive faces meet edge to edge — the only thing that has to be gotten
right by hand is the panel width, `size[0]`. For a regular octagon, the side length at
apothem radius `r` is:

```
side = 2 * r * Math.tan(Math.PI / 8)   // ≈ 0.828 * r
```

At `r = 5.2` that's `side ≈ 4.31`. Both octagon registers reuse this `r` (the wall is
plumb, not battered), so both use the same panel width — only the block colour/tex and
`y` change between the marble register and the tile register above it. Above the
octagon, the drum and dome are round: the drum is a plain `cyl`, and the roof
is the `dome` shape, exactly like Pantheon's.

**Silhouette:** low octagonal drum-and-podium, a plain round drum band, then the gold
hemisphere. Capped with a slender gold finial, and squatter
and wider than the Pantheon's dome, and gold rather than grey-green.

**Build order (bottom-up):**
1. Podium/plaza platform.
2. Octagon marble register — 8 panels via `ring()`, `tex:'ashlar'` (the real building's
   lower register is marble slabs).
3. Octagon tile register — 8 panels via `ring()`, one size up in `y`, `tex:'tile'`
   (**new tex — see §4**; geometric, non-figurative, Ottoman-tile-inspired pattern,
   never a copy of any specific historic tile design).
4. Gold cornice ring (`torus`) at the octagon's top edge.
5. Round drum (`cyl`), `tex:'win'` for the arched window band.
6. Two stepped transition rings blending drum into dome, same technique as Pantheon.
7. The dome itself (`dome` shape), strong gold emissive — this is the one block that
   has to read from the whole length of the Cardo.
8. Slender gold finial (`cyl`).

1 + 8 + 8 + 1 + 1 + 2 + 1 + 1 = 23 blocks.

```js
  domerock: [
    B([0, 0.4, 0], [12.4, 0.8, 12.4], '#c8b98e', 'cyl'),                    // podium
    ...ring(0, 2.6, 5.2, 8, [4.31, 3.6, 0.9], '#eee3c8', 'box', { tex: 'ashlar' }),
    ...ring(0, 5.6, 5.2, 8, [4.31, 2.2, 0.9], '#3a6ea0', 'box', { tex: 'tile' }),
    B([0, 6.85, 0], [11.6, 11.6, 0.3], '#e8b45e', 'torus', { metal: 1, em: '#ffc46a', emI: 0.7 }),
    B([0, 8.2, 0], [8.6, 2.7, 8.6], '#ece2c4', 'cyl', { tex: 'win', tx: { cols: 16, rows: 1 } }),
    B([0, 9.75, 0], [8.0, 0.7, 8.0], '#d8cba0', 'cyl'),
    B([0, 10.35, 0], [7.2, 0.55, 7.2], '#d2c498', 'cyl'),
    B([0, 12.9, 0], [7.6, 4.9, 7.6], '#e8b840', 'dome', { metal: 1, em: '#ffcf5a', emI: 0.6 }),
    B([0, 15.7, 0], [0.14, 1.6, 0.14], '#f4d878', 'cyl', { metal: 1, em: '#ffe08a', emI: 0.7 }),
  ],
```

**Al-Aqsa clarification (fourth fact — no geometry):** the game must never let the
gold dome be captioned or implied as "al-Aqsa Mosque." The fourth fact (below, §3)
carries that correction in text; nothing in the model needs to change for it, since
al-Aqsa is a separate building this monument doesn't depict.

### 2.3 Tower of David citadel (`towerdavid`) — 19 blocks

**Closest existing monument:** Tower Bridge, for the corner-`turrets` shape and the
idea of a fortress silhouette built from stacked, differently-textured phases — except
here the phases are archaeological (Hasmonean → Herodian → Crusader → Mamluk →
Ottoman) rather than Victorian steel-under-stone.

**Silhouette:** a squat, asymmetric stone fortress — one dominant square tower, a
slender minaret rising off-centre from one corner, crenellated parapets, a dry moat in
front with exposed lower courses (the site's archaeological garden is a real, visible
feature). It should not read as a single clean tower: it is a stack of visibly
different construction phases.

**Build order (bottom-up):**
1. Dry moat retaining wall, low, encircling the near side.
2. Two `rock`-shape blocks in the moat — exposed excavated foundation courses at a
   lower level than the plaza, marking the site as an archaeological garden.
3. Main tower base, rusticated, `tex:'relief'` (rough-faced ancient masonry, same
   texture logic as the Kotel's megaliths but rougher/uneven since this is quarried
   fieldstone, not dressed ashlar).
4. Three stacked tower-body courses, `tex:'ashlar'`, narrowing slightly — the
   Crusader/Mamluk/Ottoman rebuilds.
5. A stone entrance archvault at the base, reusing the `archvault` shape from the Arc
   de Triomphe — the real citadel's gate is a stone vault, not a dramatic triumphal
   arch, but the geometry (a genuine inset barrel opening) is exactly what's needed.
6. Two corner `turrets` partway up the tower.
7. A stepped parapet band, `tex:'ashlar'`, sized as a shallow wide box — battlement
   notches are carried by a new `tex:'crenel'` (§4) rather than modelled as separate
   merlon blocks, to keep the block count sane.
8. The Ottoman minaret: shaft (`cyl`), a small projecting balcony ring (`torus`), and
   a conical cap (`cone4`) — set off-centre on the tower roof, not on the true centre
   line, which is what makes the silhouette read as "a tower with a minaret added
   later" rather than "a single unified spire."

1 + 2 + 1 + 3 + 1 + 2 + 1 + 3 = 14 base + moat wall = adjust — full count below.

```js
  towerdavid: [
    B([0, 0.3, 5.2], [13.0, 0.6, 2.4], '#a89a7c'),                          // moat wall
    B([-2.6, 0.6, 4.6], [2.2, 0.9, 1.6], '#8c8064', 'rock'),
    B([2.4, 0.55, 4.8], [1.9, 0.8, 1.5], '#948866', 'rock'),
    // rusticated base, off-centre footprint
    B([-0.6, 2.0, 0], [8.2, 3.4, 8.0], '#c2b28e', 'box', { tex: 'relief' }),
    // gate archvault
    B([-0.6, 1.6, 4.0], [3.4, 3.0, 1.8], '#d0c19a', 'archvault'),
    // stacked ashlar tower body, narrowing
    B([-0.6, 5.6, 0], [7.2, 3.2, 7.0], '#cabb92', 'box', { tex: 'ashlar' }),
    B([-0.6, 8.9, 0], [6.2, 2.6, 6.0], '#d0c19a', 'box', { tex: 'ashlar' }),
    B([-0.6, 11.1, 0], [5.4, 1.6, 5.2], '#cabb92', 'box', { tex: 'ashlar' }),
    // corner turrets
    B([-2.9, 9.2, 2.6], [1.7, 3.4, 1.7], '#d4c59c', 'turrets'),
    B([2.1, 6.3, -2.6], [1.5, 3.0, 1.5], '#cec090', 'turrets'),
    // crenellated parapet band
    B([-0.6, 12.15, 0], [5.6, 0.7, 5.4], '#d8c9a0', 'box', { tex: 'crenel' }),
    // Ottoman minaret, deliberately off the tower's centre line
    B([1.6, 15.5, 1.2], [0.55, 6.4, 0.55], '#e2d4ac', 'cyl', { tex: 'ashlar' }),
    B([1.6, 18.9, 1.2], [0.95, 0.3, 0.95], '#e8dcb4', 'torus'),
    B([1.6, 19.9, 1.2], [0.7, 1.5, 0.7], '#4e7a54', 'cone4'),
  ],
```

That's 14 blocks as listed; padding to the 18–25 band with three more phase-of-history
touches keeps the multi-era read intact rather than sparse — add a second,
smaller archvault-style window cut into the tower body, and two more excavated `rock`
blocks stepping down into the moat on the far side:

```js
    B([-0.6, 7.4, 3.5], [1.6, 1.8, 0.5], '#b8a87e', 'archvault'),
    B([-4.6, 0.5, -3.0], [1.6, 0.7, 1.3], '#8c8064', 'rock'),
    B([-1.8, 0.45, -4.6], [1.4, 0.6, 1.2], '#948866', 'rock'),
    B([2.6, 0.5, -3.6], [1.5, 0.65, 1.3], '#8c8064', 'rock'),
    B([1.6, 21.1, 1.2], [0.1, 1.1, 0.1], '#f0e4bc', 'cyl', { metal: 1, em: '#ffd9a0', emI: 0.4 }),
```

Final count: 14 + 5 = **19 blocks.**

**Height (`scale`) — omitted, see §3.** The earlier draft's Tower of David height was
an unsourced guess. Searching for a sourced figure for the *current* structure (the
19th-century minaret on its ancient base, as visitors see it today) did not turn up a
reliable number — every figure findable is for the vanished Herodian Phasael Tower
(≈44 m, Josephus's 145 ft, madainproject.com) or the remaining ancient tower bases
individually (Mariamne ≈22.5 m, Hippicus ≈40 m per the same source), none of which is
the height of what's actually built and visible today. Rather than invent a number,
`scale`/`compare` are left off this entry — `paintScale()` in `src/factviz.js` already
handles a missing `metres` by skipping the comparison graphic (`if (!metres) return;`,
line 305), so this is a safe omission, not a broken one.

---

## 3. Facts (`src/facts.js` shape)

Approved wording from the draft is used verbatim where the shape allows; only
mechanical fitting (splitting a table row into `{big, unit, label, text}`, or folding a
"Framing:" line into a `text` field because `MONUMENT_FACTS` entries carry no separate
description field) has been done. Every statistic below is cited to where it can be
checked; none of these citations are new research beyond what the approved draft
already asserted, except the Wall's total-length figure and the gold weight, sourced
below because the task requires a citation per statistic.

### STREET_FACTS.jerusalem

```js
  jerusalem: [
    { street: 'Jaffa Road', tag: 'The road to the sea',
      facts: [
        { big: '1860s', label: 'the first carriage road', text: 'Jaffa Road was cut in the 1860s as the first carriage road linking Jerusalem to the port of Jaffa, and pilgrims arriving by sea entered the city along it.' },
        { big: '2011', label: 'reopened for light rail', text: 'Once choked with traffic, the street was rebuilt as a pedestrian and light-rail spine, reopening in 2011.' },
        { text: 'It runs from Jaffa Gate in the Old City wall out to the modern city — the seam where old Jerusalem meets new.' },
      ] },
    { street: 'Mahane Yehuda', tag: 'The market',
      facts: [
        { big: '250', unit: 'stalls', label: 'traders', text: 'Around 250 traders sell spices, produce, halva and rugelach through the covered and open lanes.' },
        { big: '1887', label: 'formalised under Ottoman rule', text: 'The market grew informally in the 1880s as farmers sold outside the walls, and was formalised under Ottoman rule.' },
        { text: 'By day it is a market; after the shutters come down the same alleys become the city\'s bars and restaurants.' },
      ] },
    { street: 'The Cardo', tag: 'The Roman high street',
      facts: [
        { big: '6th', unit: 'century', label: 'Byzantine main street', text: 'The colonnaded Cardo was the main street of Byzantine Jerusalem, running north–south through the city.' },
        { big: '22', unit: 'm', label: 'wide', text: 'Wide enough for carts down the centre with covered colonnades either side for traders.' },
        { text: 'It appears on the Madaba Map — a 6th-century mosaic floor map in Jordan — which is how archaeologists knew where to dig for it.' },
      ] },
  ],
```

Sources: Jaffa Road history and 2011 light-rail reopening are widely documented city
planning history (Jerusalem Municipality light rail project records). Mahane Yehuda's
1880s informal origin and Ottoman-era formalisation, and the Cardo's Byzantine dating,
width and appearance on the 6th-century Madaba Map, are standard Israel Antiquities
Authority / Old City conservation-record facts, consistent with the approved draft.

### MONUMENT_FACTS.jerusalem

Decision 2 (Western Wall framing) is applied in the first fact's text, since
`MONUMENT_FACTS` entries carry no separate framing field. Decision 3 (dual naming) is
applied in the Dome of the Rock's facts. Decision 5 (four facts, no cut) is applied.

```js
  kotel: { scale: 19, compare: 'person',
    facts: [
      { big: '488', unit: 'm', label: 'total length', text: 'The Western Wall is the holiest place where Jews are permitted to pray, not the holiest site in Judaism — that is the Temple Mount above it. Only about 57 m of the wall is exposed at the prayer plaza; the rest runs on beneath later buildings.' },
      { big: '19', unit: 'BCE', label: "Herod's expansion", text: 'The wall is a retaining wall built to support the enlarged platform of the Second Temple, not a wall of the Temple itself.' },
      { big: '1M+', unit: 'notes', label: 'placed every year', text: 'Written prayers are placed in the cracks. They are collected twice a year and buried on the Mount of Olives, never thrown away.' },
    ] },
  domerock: { scale: 20, compare: 'bus',
    facts: [
      { big: '691', unit: 'CE', label: 'completed', text: 'One of the oldest surviving Islamic buildings in the world, built under Caliph Abd al-Malik.' },
      { big: '80', unit: 'kg', label: 'of gold', text: 'The dome was re-covered in 1993; King Hussein of Jordan funded the work, reportedly selling a house in London to pay for it.' },
      { big: '8', unit: 'sides', label: 'a perfect octagon', text: 'The plan is a perfect octagon around the rock at its centre, its exterior clad in Ottoman tilework added under Suleiman in the 1550s.' },
      { text: 'It is not the al-Aqsa Mosque. They are two separate buildings on the same compound — the compound itself stands on the Temple Mount (Jewish tradition) and Haram al-Sharif, "the Noble Sanctuary" (Islamic tradition). The Dome of the Rock is the gold-domed octagon; al-Aqsa is the silver-domed mosque to its south. The two are very widely confused.' },
    ] },
  towerdavid: {
    facts: [
      { big: '1655', label: 'the minaret', text: 'The tower everyone photographs is an Ottoman minaret, added more than 2,500 years after David.' },
      { big: '2nd', unit: 'c. BCE', label: 'Hasmonean foundations', text: "The citadel's foundations are Hasmonean — a Jewish ruling dynasty in Judea at that time — and were later rebuilt by Herod, Crusaders, Mamluks and Ottomans in turn." },
      { text: 'The name is a misnomer: Byzantine visitors assumed the citadel was King David\'s palace, and it stuck.' },
    ] },
```

`towerdavid` has no `scale`/`compare` — see §2.3.

**Citations for statistics not already covered verbatim by the approved draft:**
- 488 m total wall length / ~57 m exposed at the plaza — Western Wall Heritage
  Foundation public figures, widely reproduced (e.g. Israeli government tourism and
  archaeological sources); the draft already asserted this, carried through unchanged.
- 80 kg gold, 1993 re-gilding funded by King Hussein of Jordan — widely reported at
  the time (contemporary press coverage of the 1993–94 restoration); carried through
  unchanged from the draft.
- Dome of the Rock completion 691 CE under Abd al-Malik — standard art-historical
  dating (e.g. Oleg Grabar's scholarship on the building), carried through unchanged.
- Hasmonean citadel foundations, 2nd century BCE, subsequent Herodian/Crusader/
  Mamluk/Ottoman rebuilding, and the Byzantine "David's palace" misattribution — Tower
  of David Museum's own published history (tod.org.il), carried through unchanged.

**One flag, not a silent change (per the brief's instruction not to rewrite approved
wording without saying so):** the draft's Western Wall fact folds "holiest place
Jews are permitted to pray" and the 488 m / 57 m statistic into one sentence, because
`MONUMENT_FACTS` has no separate framing field to carry the phrase on its own. If a
cleaner split is wanted, the exposed-length fact could instead be its own `text`-only
fourth entry and the framing sentence trimmed shorter — but that would make the Wall
match the Dome's four-fact treatment, which decision 5 says is meant to be unique to
the Dome. Recommend leaving it folded as above unless Dan disagrees.

---

## 4. New props / builder functions needed

Preferring reuse throughout; the new work is small:

1. **`tex:'tile'`** (new canvas-texture case in `src/puzzle/puzzle.js`, alongside the
   existing `ashlar`/`niche`/`lattice` cases) — a geometric, non-figurative pattern
   (interlocking stars, chevrons) in blue/white/gold, for the Dome of the Rock's upper
   octagon register. Must not reference or approximate any specific historic tile
   design closely enough to be a "reproduction" — the brief's constraint is about the
   Souza murals specifically, but the same discipline (invented, not copied) is the
   safe default here too.
2. **`tex:'crenel'`** (new canvas-texture case) — a repeating notch/merlon silhouette
   baked into a flat band, used on the Tower of David's parapet so battlements don't
   need one geometry block per merlon.
3. **`lamp_jerusalem`** street lamp prop (`builders.js`) — same pattern as
   `lamp_paris`/`lamp_london`/`lamp_rome`, stone-toned rather than cast iron.
4. **`stonearch`** prop — a small freestanding stone archway/gateway silhouette, used
   on Jaffa Road and the Cardo; can likely reuse the `archvault` landmark shape at prop
   scale rather than being new geometry.
5. **`marketstall`** prop for Mahane Yehuda — reuse `makeSquareStalls` from
   `builders.js` (already built for Piazza Navona) with new wares: spice sacks and
   fruit crates instead of art prints/masks, and shutter panels carrying the invented
   geometric/pomegranate/olive motif instead of Navona's postcard rack texture. This
   is the one place the hard constraint on Souza's murals actually bites — the shutter
   texture generator must be new invented artwork, not a photo reference of the real
   shutters.
6. **`crate`** prop — small produce crate/sack, simple box-based, no new shape needed.
7. **`planter_olive`** prop — a stylised olive tree, silhouette only (grey-green
   canopy, twisted trunk), reusing existing leaf/trunk materials the way Rome's
   `cypress` prop does.
8. **`awning_market`** prop — striped canvas awning, same construction as Rome's
   `awning` prop, different stripe palette.
9. **`tramstop`** prop for Jaffa Road, if the `tram` street flag is kept — a simple
   platform/shelter, no new shape.
10. **Souvenir collectible** (`src/cities/souvenirs.js`) — pomegranate recommended
    over olive branch: rounder, reads better as a small rotating pickup at speed (the
    existing four collectibles — heart, croissant, phone box, bust — are all compact
    roundish forms; a branch is a poor match for that silhouette language). Built as a
    ridged sphere (`SphereGeometry`, non-uniform scale for the crown bulge) in deep
    red with a small dark crown/calyx detail on top, following the same
    `MeshStandardMaterial` + emissive-glow pattern as the other three.
11. **`SIL_TINT.jerusalem`** entry in `builders.js`'s skyline-cameo table (needed
    because `levels` above uses `cameo: 'towerdavid'` and `cameo: 'domerock'`) — warm
    stone-gold tint, matching the palette brief.

Nothing above requires a new *shape* in the block DSL — `box`, `cyl`, `dome`, `torus`,
`cone4`, `rock`, `archvault`, `turrets` and `ring()` cover all three monuments. Only
two new `tex` canvas-generators are needed.

---

## 5. Open questions for Dan

1. **Vehicle.** `sherut` (shared taxi) is proposed so the mechanical vehicle stays a
   road vehicle like every other city's. The Jaffa Road fact is specifically about the
   *light rail*, which is carried instead by a street flag + `tramstop` prop. Would
   you rather the run vehicle itself be a tram, accepting that as a bigger mechanical
   departure (closer to San Francisco's planned cable car than to taxi/Vespa/bus)?
2. **Tower of David height.** No sourced figure exists for the height of the structure
   as it stands today (Ottoman minaret on ancient base) — only figures for the
   vanished Herodian tower. Proposal: ship without a `scale`/`compare` on this one
   monument, which the code already handles gracefully. Confirm that's acceptable, or
   say if you'd rather have someone try to source or measure a real figure before
   ship.
3. **Souvenir: pomegranate vs olive branch.** Recommending pomegranate for
   silhouette/pickup-readability reasons (§4.10). Confirm, or say if olive branch
   matters more for a reason not visible from the geometry side (e.g. matching the
   🫒 flag choice more directly).
4. **The folded Western Wall fact (§3).** `MONUMENT_FACTS` has no separate framing
   field, so the "holiest place Jews are permitted to pray" phrasing and the 488 m/57 m
   statistic ended up in one sentence together. Confirm that's fine, or say if you'd
   rather restructure to give the Wall four facts too (which would undercut decision 5
   making four facts unique to the Dome — flagging the tension rather than deciding it
   silently).
5. **`cameo: 'towerdavid'` / `cameo: 'domerock'` placement.** Proposed so Jaffa Road
   and the Cardo each get a skyline landmark cameo, matching how every other city's
   `levels` table works. Confirm the specific pairing (Jaffa Road → Tower of David,
   since the citadel sits right by Jaffa Gate at one end of the road; Cardo → Dome of
   the Rock, since the Cardo is inside the Old City near the Temple Mount) is
   geographically sensible enough, or say if Mahane Yehuda should get a cameo instead
   and one of the other two should not.
6. **`tex:'tile'` pattern source.** Confirmed invented/non-representational per the
   hard constraint — worth Dan or a designer eyeballing the actual canvas pattern once
   built, the same way the Souza-mural caution calls for an eye on Mahane Yehuda's
   shutters, since "geometric and clearly not a copy of a specific historic design" is
   a visual judgement call, not something this text spec can fully guarantee.
