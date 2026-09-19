# Mexico City — design spec

Research and design only. Nothing in `src/`, `index.html` or `test/` is touched by this document.

**Flag: Chapultepec Castle's authorship trail has two gaps.** Francisco Bambitelli, the original 1785 engineer who left before the castle was finished, has no findable death date. Carlos Schaffer and Eleuterio Méndez, two of the architects Maximilian hired in 1864, also have no findable death date — but every source that names them says their assignment was the interior rooms, not the exterior form. No architect is named anywhere for the 1941–1944 conversion into the National History Museum. None of this blocks the build: the exterior silhouette this spec models — walls, towers, loggia, roofline — is credited by every source consulted to three architects whose deaths are all confirmed and all comfortably clear (1882, 1895, 1896), and the 1785 design it replaced doesn't survive in the current exterior anyway. Section 0 has the full table and the reasoning. Section 5 flags it again for Dan's sign-off before anyone builds this.

---

## 0. IP clearance

Rule: Mexican copyright is life of the last surviving credited author + 100 years. Today is 19 September 2026, so anyone who died in **1926 or earlier** is clear. Pre-Columbian works have no author and no copyright question.

### Templo Mayor

| Author | Died | Clears |
|---|---|---|
| — (Mexica religious/civic construction, begun c. 1325, rebuilt in stages until 1521) | no individual author | Clear — pre-Columbian, no copyright ever attached |

No caveat needed. It is also the pattern already used for Rome: we render our own geometry rather than reproducing any photograph or scan, so no separate heritage-reproduction fee regime applies even if one existed here.

### Metropolitan Cathedral

Built in stages 1573–1813; the exterior we'd model (facade, twin bell towers, dome) is the accumulated work of three named chief architects.

| Author | Role | Died | Clearance year | Status |
|---|---|---|---|---|
| Claudio de Arciniega | Chief architect from 1573; laid out the plan and began construction | 1593 | 1693 | Clear |
| José Damián Ortiz de Castro | Completed the bell towers up to the first level | 1793 | 1893 | Clear |
| Manuel Tolsá | Finished the towers, the dome and the balustrades; completed 1813 | 1816 | 1916 | Clear |

All three died well over a century ago. No caveat.

### Chapultepec Castle

This is the one the owner flagged as needing real scrutiny. The castle has three construction phases; only the exterior form from the second phase is proposed for modelling.

| Phase | Author | Role | Died | Clearance year | Status |
|---|---|---|---|---|---|
| 1785 (original) | Francisco Bambitelli | First engineer; left for Havana before completion | **not found** | — | **Cannot verify — excluded** |
| 1785 (original) | Manuel Agustín Mascaró | Took over on Bambitelli's departure; died on site in 1786 | 1786 | 1886 | Clear, but see below |
| 1860s (Maximilian's remodel — the current exterior silhouette) | Julius Hofmann | Lead architect of the exterior remodel | 1896 | 1996 | **Clear** |
| 1860s | Carl Gangolf Kayser | Continued and extended Hofmann's and Arangoiti's work on the exterior | 1895 | 1995 | **Clear** |
| 1860s | Ramón Rodríguez Arangoiti | Mexican architect, principal builder of the castle's remodelled form | 1882 | 1982 | **Clear** |
| 1860s (interiors only, per every source found) | Carlos Schaffer | Assigned to design rooms (interior) | **not found** | — | Excluded — interior only, not modelled anyway |
| 1860s (interiors only, per every source found) | Eleuterio Méndez | Assigned to design rooms (interior) | **not found** | — | Excluded — interior only, not modelled anyway |
| 1941–1944 (museum conversion) | — | No architect named in any source found (Britannica, INAH's own site, Spanish Wikipedia, Wikidata) | unknown | — | **Cannot verify — excluded** |

**Reasoning for what's safe to build:** the castle's present, recognisable exterior — pale walls, the two-tier loggia overlooking the valley, the corner lookout tower, the balustraded terrace — is the 1860s remodel, and every source that credits an architect for that exterior work names Hofmann, Kayser or Arangoiti. All three are clear by 130+ years of margin. Bambitelli's 1785 design is not what we'd be drawing — it was substantially rebuilt over in the 1860s, and no element of the current exterior is attributed to him in any source found, so his unknown death date doesn't reach into this model. Schaffer and Méndez are named only for interior rooms; since this is an exterior-only monument model (same as every other landmark in the game), their unverified dates don't reach in either, but they are excluded from the credit list below out of caution. The 1941–1944 museum conversion is not credited to anyone in any source found, so **nothing from that period should be treated as a modelled feature** — the block design in Section 2 sticks to exterior massing documented in 19th- and early-20th-century sources, not anything specific to the museum fit-out.

**This still needs Dan's sign-off before it ships** — see Section 5.

---

## 1. `themes.js` — paste-ready `CITIES` entry

Add after the Rome entry (before the closing `];`). Palette: Talavera blue, rosa mexicana (hot pink), marigold orange, terracotta and lime — the highest-chroma city in the roster on purpose, to read as a genuine change of register from three cities that are all doing golden-hour Europe.

```js
{
  id: 'mexico', name: 'MEXICO CITY', flag: '🇲🇽',
  streets: ['Paseo de la Reforma', 'Coyoacán', 'Xochimilco'],
  // High-altitude dusk: violet sky bleeding into deep marigold at the horizon.
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
  props: ['lamp', 'fountain', 'topiary', 'flagbanner', 'kiosk'],
  vehicle: 'vocho',
  landmarks: ['templomayor', 'catedral', 'castillo'],
  levels: [
    { // Paseo de la Reforma — broad glass-and-stone boulevard, tree median,
      // a glorieta roundabout fountain, the castle visible far down the avenue
      key: 'reforma', facade: 'boulevard', glorieta: true,
      setback: 6.4,           // second-widest avenue in the game, after Champs
      palette: ['#8fa4b8', '#a0b4c4', '#8098b0', '#98acc0', '#7890a8', '#a8bcc8'],
      storefront: ['#2f6f9e', '#d81b7a', '#e0a33e', '#1f4a72'],
      props: ['lamp', 'planetree', 'fountain'],
      ads: ['TORRE SOL', 'BANCO AZTECA', 'CAFÉ REFORMA', 'JOYERÍA LUNA'],
      cameo: 'castillo', lit: 0.16,
    },
    { // Coyoacán — cobbled colonial village square, market stalls, a plaza
      // fountain, low terracotta-and-Talavera facades
      key: 'coyoacan', facade: 'colonial', market: true,
      roadStyle: 'cobble', road: '#7a6a56', lane: '#7a6a56', sidewalk: '#c4ae86',
      palette: ['#d9a066', '#c96a3e', '#d81b7a', '#e0a33e', '#8ab23e', '#cf8850'],
      trim: '#f6ecd4', roof: '#7a4a34',
      setback: 3.6, hBase: 8, hVar: 4, secondRow: 0.3,
      storefront: ['#c8461f', '#2f6f9e', '#e0a33e', '#8ab23e'],
      props: ['lamp', 'fountain', 'souvenirstall', 'artstall'],
      ads: ['MERCADO', 'CAFÉ AZUL', 'DULCERÍA', 'LIBROS'],
      lit: 0.14,
    },
    { // Xochimilco — canal towpath on one side (Rivoli-style side swap),
      // trajineras moored along the bank, marigold garlands overhead
      key: 'xochimilco', facade: 'lowland', canal: true,
      roadStyle: 'plain', fogDensity: 0.008,
      palette: ['#8ab23e', '#a8c85e', '#7ca034', '#c96a3e', '#d9a066', '#94b048'],
      setback: 4.2, hBase: 5, hVar: 2, secondRow: 0,
      props: ['lamp', 'tree', 'topiary'],
      span: 'papel', spanFreq: 0.5,
      lit: 0.08,
    },
  ],
},
```

Add to `LANDMARK_NAMES`:

```js
templomayor: 'Templo Mayor', catedral: 'Metropolitan Cathedral', castillo: 'Chapultepec Castle',
```

---

## 2. Monument block designs

DSL from `src/puzzle/landmarks.js`: blocks are `{ p, s, c, shape, ... }`, bottom-up build order by `p[1]`, `shape` one of `box|cyl|cone4|pyramid|dome|sphere|torus|pod|clock|archvault|prism|spokes|water|cable|arcseg|colonnade|turrets|statue|rock|arch|tier|eifleg|chain|walkway`, `tex` one of `win|strip|arch|archcut|gothic|relief|glass|crown|lattice|ashlar|niche`.

### Templo Mayor — 24 blocks

Structurally closest to the **Empire State/Chrysler tiered setback stack** (narrowing stacked tiers), not to Louvre's smooth glass pyramid — the real Templo Mayor is a stepped platform built of talud-tablero tiers (a sloped base panel under a vertical framed panel, repeated), topped by twin shrines, which reads much better as stacked boxes than as a single pyramid shape.

Silhouette: a wide stepped base narrowing upward through 5 tiers, a double staircase up the west face (one flight painted red, one blue-and-white), and two small flat-roofed shrines side by side at the summit — the signature twin-temple profile.

Build order (bottom to top):
1. **Tier 1 base** (talud + tablero pair): sloped `box` (batter, slight `rotX`) + vertical `box` with `tex:'relief'`, warm grey-brown volcanic stone `#8a7c68`. Widest footprint, ~13×13.
2. **Tier 2**: same talud+tablero pair, `#8f8270`, inset ~1.0 narrower, `tex:'relief'`.
3. **Tier 3**: same pair, `#948878`, inset again.
4. **Tier 4**: same pair, `#9a8e7e`, inset again.
5. **Tier 5** (summit platform): single wide flat `box`, `#a4987e`, `tex:'ashlar'` — the plaza the two shrines stand on.
6. **West staircase, Huitzilopochtli side**: sloped `box` (`rotX` ramp, like the Brooklyn Bridge approach ramps), red-stuccoed `#b0402a`.
7. **West staircase, Tlaloc side**: sloped `box`, blue-and-white banded `#3a6a9a` with a `tex:'strip'` overlay to suggest the painted bands.
8. **Serpent balustrade, south**: `statue` shape (reuse Arc's sculpture-group block), stone grey `#8f8270`, flanking the staircase foot.
9. **Serpent balustrade, north**: mirrored `statue` block.
10–12. **Huitzilopochtli shrine** (south, red): body `box` `#c1432a` `tex:'relief'`, flat roof slab `box` `#a83a24`, roof-comb fin `box` (thin, tall) `#c1432a` `em:'#ffb070', emI:0.1` for a warm rim-glow at dusk.
13–15. **Tlaloc shrine** (north, blue/white): body `box` `#eae0c8` with blue trim block `#3a6a9a` inset, flat roof slab `box` `#dcd0ae`, roof-comb fin `box` `#3a6a9a`.
16. **Brazier, southwest corner**: `cyl`, dark stone `#5e5347`, `em:'#ff9d5a', emI:0.3` (small ceremonial-fire glow, not fire geometry).
17. **Brazier, northeast corner**: mirrored `cyl`.
18–19. **Flanking altar platforms** in the plaza: low `box` blocks (reuse the Colosseum's loose `rock` blocks pattern instead — `rock` shape, `#c4bdac`), one each side.
20–24. **Plaza retaining wall segments**: four low `box` blocks, `#948878`, ringing the base at ground level, plus one `tex:'ashlar'` corner block for texture variety.

Facts drive the twin-shrine colour split (red/blue) and the "rebuilt seven times" fact drives the five visible tiers being read as one phase of many — the puzzle doesn't need to show all seven historical layers, just enough steps to sell "ancient stepped pyramid."

### Metropolitan Cathedral — 21 blocks

Structurally closest to **Big Ben's tiered bell tower**, doubled, fronted by a **Pantheon-style colonnaded portico** and backed by a **Louvre-style dome**.

Silhouette: a wide pale-stone facade with a triple colonnaded portal, two symmetric bell towers each narrowing through tiers to a small cupola and cross, and a grey-blue dome rising behind the facade line.

Build order:
1. **Base platform**, wide `box`, `#c4b494`, spanning the whole facade width.
2. **Triple portal colonnade**: `colonnade` shape, `cols:3`, pale travertine `#e6d8b6` (reused pattern from Pantheon's portico blocks).
3. **Balustrade band** above the portal: thin `box`, `#cfc09c`, `tex:'relief'`.
4. **Central pediment**: `box`, `#d8caa8`, `tex:'relief'` (coat-of-arms relief, no readable text).
5–10. **South tower** (3 body tiers narrowing + 1 belfry + 1 cupola + 1 cross): body tiers `box` `tex:'ashlar'` `#d4c9a8`→`#cbbf9e`→`#d4c9a8` (reuse Big Ben's tier palette rhythm), belfry `box` `tex:'arch', tx:{n:3}`, cupola `dome` `#5e7258` (oxidised-copper green), cross finial `cyl` `#e6d29e` `metal:1, em:'#ffd9a0', emI:0.5`.
11–16. **North tower**, mirrored, identical block list at `-x`.
17. **Dome drum**: `cyl`, `#948779`, set behind the facade midpoint.
18. **Dome**: `dome` shape, `#8f8b80`, `em:'#ffd9a0', emI:0.08`.
19. **Dome lantern**: `cyl`, `#e6cd9a`, `metal:1, em:'#ffce8a', emI:1.2`.
20. **South flank wall**: `box`, `#d8d2c4`, `tex:'win'`, `tx:{cols:4, rows:2}` (small chapel windows).
21. **North flank wall**: mirrored.

### Chapultepec Castle — 20 blocks

Structurally closest to the **Louvre's flanking palace wings** (window-banded wings either side of a central block) combined with **Tower Bridge's corner turret**. Every block below belongs to the 1860s exterior remodel credited to Hofmann, Kayser and Arangoiti (Section 0) — nothing here is attributed to the 1941–1944 museum conversion.

Silhouette: a long, pale two-storey palace on a hilltop podium, a colonnaded loggia looking out over the terrace, a central portico with a small dome, and one square corner lookout tower.

Build order:
1. **Hilltop podium**: wide flat `box`, `#b8a888`, `tex:'ashlar'` (the terrace the castle stands on).
2. **South wing body**: `box`, `#e8dcc0`, `tex:'win'`, `tx:{cols:6, rows:2}`.
3. **South wing roof band**: thin `box`, `#c4a878`, terracotta trim.
4. **North wing body**: mirrored, `box`, `#e8dcc0`, `tex:'win'`, `tx:{cols:6, rows:2}`.
5. **North wing roof band**: mirrored.
6. **Central block body**: `box`, `#ecdfc4`, `tex:'win'`, `tx:{cols:4, rows:2}`, set slightly forward of the wings.
7. **Central portico colonnade**: `colonnade`, `cols:4`, pale stone `#e0d3b4`.
8. **Portico entablature**: thin `box`, `#d5c8a8`, `tex:'relief'`.
9. **Portico dome drum**: `cyl`, `#c9bc9c`.
10. **Portico dome**: `dome`, `#b8a888`, `em:'#ffd9a0', emI:0.08`.
11. **Open loggia / "Galería"**: `colonnade`, `cols:5`, set along the cliff-facing side — the arcaded gallery that is the castle's single most recognisable feature.
12. **Loggia roof slab**: thin `box`, `#c4a878`.
13. **Corner lookout tower shaft**: `box`, `#e0d3b4`, `tex:'win'`, `tx:{cols:2, rows:3}`.
14. **Tower turret cap**: `turrets` shape (reused from Tower Bridge), `#f2ead3`, `em:'#ffd9a0', emI:0.1`.
15. **Tower flag finial**: thin `cyl`, `metal:1`.
16. **Balustraded terrace rail**: thin `box` strip running the podium edge, `#d8caa8`.
17–18. **Entrance stair, two flights**: sloped `box` ramps (Brooklyn-ramp pattern), `#c4b494`.
19–20. **Flanking urns/statues at the entrance**: two `statue`-shape blocks, `#e8dcc0`, either side of the main stair.

---

## 3. Facts (`src/facts.js` shape)

### `STREET_FACTS.mexico`

```js
mexico: [
  { street: 'Paseo de la Reforma', tag: 'A boulevard built for an emperor',
    facts: [
      { big: '15', unit: 'km', label: 'end to end', text: 'Paseo de la Reforma runs fifteen kilometres across the city, from the historic centre to Chapultepec park.' },
      { big: '1865', label: 'first laid out', text: 'Emperor Maximilian ordered the avenue built to link his palace downtown with his home at Chapultepec Castle.' },
      { text: 'Its grand traffic circles, called glorietas, were added decades later, under President Porfirio Díaz.' },
    ] },
  { street: 'Coyoacán', tag: 'The place of coyotes',
    facts: [
      { big: '1521', label: "Cortés' first headquarters", text: 'After the fall of the Aztec capital, Hernán Cortés set up his first base here while Mexico City was rebuilt.' },
      { big: '1907', label: "Frida Kahlo's birthplace", text: "Painter Frida Kahlo was born in Coyoacán's Blue House, which is now a museum of her life and work." },
      { text: "Coyoacán means 'place of coyotes' in the Nahuatl language, and a coyote fountain still marks the main plaza." },
    ] },
  { street: 'Xochimilco', tag: 'The floating gardens',
    facts: [
      { big: '170', unit: 'km', label: 'of canals', text: "Xochimilco's canals stretch about 170 kilometres — nearly all that survives of the lake the Aztecs once sailed." },
      { big: '1987', label: 'named a World Heritage Site', text: "UNESCO protects Xochimilco's floating gardens alongside the historic centre of Mexico City." },
      { text: 'The gardens are built on chinampas — islands woven from lake mud and reeds — and farmers still grow flowers on them today.' },
    ] },
],
```

### `MONUMENT_FACTS`

```js
templomayor: { scale: 45, compare: 'bus',
  facts: [
    { big: '1325', label: 'construction began', text: 'Building started here soon after 1325, when the Mexica people founded their city on an island in a lake.' },
    { big: '7', unit: 'layers', label: 'built again and again', text: 'Each ruler expanded the temple by building a new layer over the old one — archaeologists found seven layers stacked inside.' },
    { text: 'It was rediscovered by accident in 1978, when electrical workers dug up a huge carved stone disc nearby.' },
  ] },
catedral: { scale: 67, compare: 'bus',
  facts: [
    { big: '250', unit: 'years', label: 'to build', text: 'Building went on for two and a half centuries, from 1573 to 1813, so it mixes styles from early Baroque to Neoclassical.' },
    { big: '25', unit: 'bells', label: 'in its towers', text: 'Twenty-five bells hang in the twin towers — the biggest alone weighs about as much as two elephants.' },
    { text: "The cathedral is slowly sinking into the soft old lakebed it stands on, and engineers have spent decades working to straighten it." },
  ] },
castillo: { scale: null /* SEE OPEN QUESTIONS — not independently verified, do not ship a guessed number */, compare: 'person',
  facts: [
    { big: '1785', label: 'building began', text: 'Construction started in 1785, on a hill where Aztec rulers once had a retreat.' },
    { big: '1847', label: 'the cadets who defended it', text: 'During a battle here in 1847, a group of young military cadets are remembered in Mexico as the Niños Héroes for standing their ground.' },
    { text: 'It later became home to Mexican presidents, and today it holds the National History Museum.' },
  ] },
```

Sources for every fact above, by monument/street:
- Paseo de la Reforma length/history: [Wikipedia — Paseo de la Reforma](https://en.wikipedia.org/wiki/Paseo_de_la_Reforma); [Mexico News Daily](https://mexiconewsdaily.com/lifestyle/paseo-de-la-reforma-10-facts/)
- Coyoacán / Cortés / Kahlo: [Britannica — Coyoacán](https://www.britannica.com/place/Coyoacan-administrative-subdivision-Mexico); [Wikipedia — Frida Kahlo](https://en.wikipedia.org/wiki/Frida_Kahlo)
- Xochimilco canals/UNESCO/chinampas: [Wikipedia — Xochimilco](https://en.wikipedia.org/wiki/Xochimilco)
- Templo Mayor construction/layers/1978 rediscovery: [World History Encyclopedia — Templo Mayor](https://www.worldhistory.org/Templo_Mayor/); [Britannica — Templo Mayor](https://www.britannica.com/topic/Templo-Mayor)
- Metropolitan Cathedral dates/bells/sinking: [Wikipedia — Mexico City Metropolitan Cathedral](https://en.wikipedia.org/wiki/Mexico_City_Metropolitan_Cathedral); [Have Camera Will Travel](https://havecamerawilltravel.com/field-notes/metropolitan-cathedral-mexico-city-mexico/)
- Chapultepec Castle 1785 start / 1847 battle / museum: [Wikipedia — Chapultepec Castle](https://en.wikipedia.org/wiki/Chapultepec_Castle); [Wikipedia — Niños Héroes](https://en.wikipedia.org/wiki/Ni%C3%B1os_H%C3%A9roes)

Content note: the Niños Héroes fact is phrased to honour their courage without describing their deaths — this is a 4+ title and the game should not dwell on it. Templo Mayor's facts stay on construction and archaeology, not on what the temple was used for.

---

## 4. New props / builders needed

Reuse first, new builders only where nothing fits.

**Reused as-is** (no change needed): `makeLamp`, `makeFountain`, `makeTopiary`, `makeFlagBanner`, `makeMorrisColumn` (kiosk), `makeSouvenirStall`, `makeArtStall`, `makeSquareStalls`, `makeTree`, `makeGardenRail`/`makeGardenParterre` (as the *pattern* to copy, not reused directly — see below), the `colonnade`/`statue`/`turrets`/`dome`/`archvault` monument-block shapes, and `makeParkedCar`'s existing `beetle` body (see vehicle, below).

**New builders**:
- `makeCanalRail(theme, len)` / `makeCanalDressing(theme, len)` — the Xochimilco towpath side-swap. Same pairing as Rue de Rivoli's `makeArcade`/`makeGardenRail`+`makeGardenParterre`: one sidewalk side keeps normal buildings, the other side is replaced by a low stone/timber rail (`makeCanalRail`, copy `makeGardenRail`'s geometry) backed by a static water-coloured strip and moored boat props (`makeCanalDressing`, copy `makeGardenParterre`'s layout function but lay out `makeTrajinera` instances and marigold-bed patches instead of parterres). This is **visual dressing on a fixed towpath**, exactly as specified — no new physics, no changes to `player.js`, `track.js` or `rng.js`.
- `makeTrajinera()` — a small painted flat-bottomed boat prop, moored along the canal rail. Simple box hull + painted-arch canvas canopy (reuse the `tex:'arch'` canvas-texture pattern already used for Big Ben's belfry) + a scatter of flower-crate boxes on the deck.
- `vocho` vehicle case in `makeVehicle` — Mexico City's classic green-and-white VW Beetle taxi. This is almost entirely reuse: `makeParkedCar`'s existing `beetle` body/dome/glass geometry, promoted to a moving-vehicle case the same way `citroen`/`bus`/`vespa` already are, painted in taxi livery (`#4a9e5c` body, white roof) instead of `BEETLE_COLORS`.
- `span: 'papel'` case in `makeStreetSpan` — papel picado (cut-paper banner) overhead dressing for Xochimilco. Same triangular-flag loop already used for `bunting`/`tricolor`, just with a brighter multi-colour palette (`#d81b7a`, `#e0a33e`, `#2f6f9e`, `#8ab23e`) and, if budget allows, a punched-lattice canvas texture on each flag instead of a flat fill — otherwise it's a drop-in reskin of the existing loop, not new geometry.
- Souvenir: extend `makeCollectible` in `src/cities/souvenirs.js` with an `else if (theme.id === 'mexico')` branch. Owner's choice is sugar skull or marigold; **recommend the marigold** — it avoids any risk of the sugar-skull shape reading as a Halloween/spooky icon to a young player, and marigolds (cempasúchil) are the flower Mexicans use to guide the spirits of the dead home during Día de Muertos, which keeps the remembrance framing intact without needing a skull motif at all. A simple layered-petal shape (a ring of flattened, curved petal meshes around a small emissive-orange centre disc, similar complexity to the Paris croissant's torus-arc construction) would do it.

---

## 5. Open questions for Dan

1. **Chapultepec Castle building height is not independently verified.** I found the hill's elevation (about 61m/200ft above the surrounding park) but not a trustworthy figure for the castle structure's own height, which is what `MONUMENT_FACTS.castillo.scale` needs. I left `scale: null` rather than guess — please supply a sourced number, or I can keep researching if you'd rather not.
2. **Sugar skull vs. marigold**, per your brief either is fine — I've recommended marigold above for the Halloween-drift reason, but it's your call.
3. **Francisco Bambitelli's death date** could not be found. It doesn't currently block anything, since nothing in the exterior model is attributed to his 1785 design — but if you'd rather have zero unresolved names anywhere in the credit chain, someone would need to track down a primary Spanish-archive source for him.
4. **No architect is named anywhere for the 1941–1944 museum conversion.** I've scoped the block design to exclude anything specific to that period, sticking to the exterior massing as it existed by the early 20th century. If you know of a credited architect for that phase, it should be checked before the design is extended to include anything more recent than that.
5. **Cameo placement**: I gave Reforma a `cameo: 'castillo'` (the castle visible down the avenue, which is historically why the avenue exists) and left Coyoacán and Xochimilco without a cameo, on the theory that both read as self-contained village/canal scenes rather than city-vista streets — same treatment as Abbey Road and Montmartre. Flag if you'd rather one of them showed a skyline glimpse of the cathedral instead.
6. **Vehicle name `vocho`** is the Mexican slang for the VW Beetle taxi and reads clearly to Mexican players; if that's too colloquial for the UI anywhere it's user-facing, `taxi` would need disambiguating from NYC's existing `taxi` vehicle id.
