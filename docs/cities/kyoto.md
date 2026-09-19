# Kyoto — city design spec

> **PARKED 19 September 2026.** Not being built. See docs/CITY-ROADMAP.md §2 for why.

Research and design only. Nothing in `src/`, `index.html` or `test/` is touched by this document. Field names below match the shapes read from `src/cities/themes.js`, `src/puzzle/landmarks.js`, `src/facts.js`, `src/cities/souvenirs.js` and `src/cities/builders.js` as of this writing.

---

## 0. IP clearance

| Monument | Current structure dates from | Regime | Clear? |
|---|---|---|---|
| Yasaka Pagoda (Hokan-ji five-story pagoda) | Rebuilt 1440, after repeated fire and lightning losses | Ancient/pre-modern, Japan | Clear — centuries old, no architect copyright question, Japan is not a heritage-fee regime like Italy/Greece/Egypt |
| Kiyomizu-dera main hall and stage (hondō and butai) | Rebuilt 1633, funded by Tokugawa Iemitsu after a 1629 fire | Ancient/pre-modern, Japan | Clear — same reasoning, and it is a still-active Buddhist temple, not a modern commission |
| Fushimi Inari Taisha Romon gate | Built 1589 by Toyotomi Hideyoshi | Ancient/pre-modern, Japan | Clear — same reasoning |

All three predate 1990 by centuries, so even under the stricter test in `CITY-ROADMAP.md` (architect-copyright life+70, not just the US's 1990 cutoff) there is no living or recently-deceased designer to clear. Japan is not named in the roadmap's heritage-fee-regime row (Italy, Greece, Egypt); I did not find a Japanese equivalent to those laws in the research for this doc, but I have not exhaustively checked — flagged in §5.

---

## 1. `CITIES` entry for `themes.js`

Paste-ready, field-for-field against the existing NYC/Paris/London/Rome entries. Numeric values (fog density, setback, hBase) are estimated from the existing entries' range and are a starting point for playtesting, not measured.

```js
{
  id: 'kyoto', name: 'KYOTO', flag: '⛩️',
  streets: ['Fushimi Inari', 'Hanamikoji', 'Arashiyama'],
  // Soft Higashiyama dusk: deep hill-blue overhead melting into a warm
  // cherry-blossom pink at the horizon.
  sky: { top: '#3d5a8c', mid: '#89a8c9', horizon: '#f6c9d0', glow: '#f2b8c4' },
  fog: 0xf2b8c4, fogDensity: 0.009,
  sun: { color: 0xfff2e0, intensity: 2.3, pos: [40, 65, -50] },
  hemi: { sky: 0xdce8f2, ground: 0x8a7c68, intensity: 1.05 },
  fill: { color: 0xffeee0, intensity: 1.0 },
  road: '#4c4640', lane: '#e8e2d0', sidewalk: '#b8ae9c',
  palette: ['#3a322a', '#4a4038', '#e8e0cc', '#5c5044', '#2f2822', '#d9cdb0'],
  trim: '#efe6d0', roof: '#33302c',
  windowLit: '#ffd9a0', windowDay: '#9cc4d8', accent: '#c23b26',
  storefront: ['#c23b26', '#2f4a34', '#3a332c', '#8a6a2e', '#5c3a2a'],
  props: ['toro', 'lantern', 'maple', 'bamboo'],
  vehicle: 'rickshaw',
  landmarks: ['yasaka', 'kiyomizu', 'fushimi'],
  levels: [
    { // Fushimi Inari — the torii tunnel: dense vermilion gate corridor
      // climbing the wooded hillside, stone lanterns at the treeline, no
      // shopfronts (this is a shrine path, not a street of buildings)
      key: 'fushimi_st', facade: 'shrine_path', span: 'torii', spanFreq: 0.92,
      spanY: 4.4,             // clear height under the lower crossbeam — see §2
      palette: ['#3a4a34', '#2e3c2a', '#4a5a42', '#333f2c', '#243020', '#40503a'],
      trim: '#c23b26', roof: '#2a241e',
      setback: 3.0, hBase: 4.5, hVar: 1.5, secondRow: 0,   // low stalls, mostly forest
      fogDensity: 0.0115,      // canopy closes the sightline in fast
      mood: { sun: 0.55, hemi: 0.85, fill: 0.7 },   // dappled forest light
      props: ['toro', 'maple'],
      lit: 0.08,
      // no `cameo` — see §5, geographic cameo is not honest for this city
    },
    { // Hanamikoji — Gion's teahouse street: black timber machiya, kimono
      // lattice (koshi), hanging paper lanterns over the road at dusk
      key: 'gion', facade: 'machiya', lattice: true, span: 'lantern', spanFreq: 0.55,
      palette: ['#2f2822', '#3a322a', '#4a4038', '#241f1a', '#5c4e3e', '#332c26'],
      storefront: ['#c23b26', '#8a6a2e', '#3a332c'],
      setback: 2.6, hBase: 6.5, hVar: 2, secondRow: 0.2,   // tight two-storey lane
      props: ['lantern', 'toro'],
      ads: [],                 // teahouses use small noren curtains, not signage
      lit: 0.3,
    },
    { // Arashiyama — the bamboo grove: towering culms close on both sides,
      // green filtered light, almost no buildings
      key: 'arashiyama', facade: 'bamboo_path', bamboo: true,
      palette: ['#4a5a3a', '#3a4a2e', '#5a6a48', '#2e3a24'],
      roadStyle: 'packed_earth', road: '#7a6e56', lane: '#7a6e56', sidewalk: '#6a6048',
      setback: 2.0, hBase: 3.0, hVar: 1, secondRow: 0,     // almost nothing built
      fogDensity: 0.013,        // grove closes in tighter than any street in the game
      sky: { top: '#3a5468', mid: '#7fa088', horizon: '#c8dcb8', glow: '#b8d4a0' },
      fog: 0xb8d4a0,
      mood: { sun: 0.4, hemi: 0.95, fill: 0.6 },   // green-filtered canopy light
      props: ['bamboo'],
      lit: 0.02,
    },
  ],
},
```

Add to `LANDMARK_NAMES`:

```js
yasaka: 'Yasaka Pagoda', kiyomizu: 'Kiyomizu-dera', fushimi: 'Fushimi Inari Taisha',
```

---

## 2. Monuments — block-by-block

Shared context from `src/run/track.js` (read before designing the torii corridor): jump apex is `JUMP_V²/(2·GRAVITY) = 12.6² / 64 ≈ 2.48 m` above the ground, and the game's own overhead obstacle (`'high'`, roll-under) already occupies `y0=1.3` to `y1=3.4`. The torii corridor is decorative — gates never enter `this.obstacles`, so they carry no collision — but they must still *look* clear of both figures or the eye reads a collision that isn't there. `spanY: 4.4` in the CITIES entry above puts the underside of the lower crossbeam a full metre above the existing 'high' obstacle's ceiling and about 2 m above jump apex.

### 2.1 Fushimi Inari torii (street corridor prop, not a puzzle monument)

Real proportions, for the record: an authentic *myōjin*-style torii has two slightly in-leaning uprights (*hashira*) with entasis (wider at the foot), a straight lower crossbeam (*nuki*) that passes fully through the uprights, and an upper lintel (*kasagi*/*shimaki*) whose ends curve upward — traditionally capped in black lacquer where the vermilion shaft meets the black tip. A short king-post (*gakuzuka*) sits centred between the two beams, sometimes carrying a *gaku* nameplate. This is decorative dressing, not a monument, so it should stay cheap: one shared geometry group, reused across every gate, matching the `SHARED_GEO` caching and chunk-recycling pattern `makeStreetSpan` already uses so `track.js` can dispose a chunk without touching geometry the corridor still needs elsewhere.

Per-gate group (reuse across every instance in the corridor):
1. Left upright — `tier` shape (its truncated-cone taper gives the entasis for free), vermilion, bottom radius slightly wider than top.
2. Right upright — mirrored `tier`.
3. Lower crossbeam (*nuki*) — `box`, spans between the uprights, vermilion, bottom at `spanY = 4.4`.
4. Upper lintel (*kasagi*) — `box`, wider than the road (overhangs both uprights), vermilion with **black** ends — the two colours mean this wants two blocks (a vermilion centre box plus two small black end-caps) rather than one, or a two-material `tex` if the DSL's block materials support per-block secondary color (they do, via `tex` canvas painting — closest existing use is the Empire/Chrysler crown `tier` blocks, which paint a different accent at the tip already).
5. Black end-caps ×2 — small `box`, at each end of block 4.
6. Central king-post (*gakuzuka*) — small `box`, black, between nuki and kasagi.

That is 7 draw calls per gate instance if built literally; because gates repeat at `spanFreq: 0.92` down the whole street, this should be built ONCE as a `THREE.Group` (mirroring `makeStreetSpan`'s own pattern) and the group cloned/positioned per chunk, the same way the souvenir prototype is cloned per pickup in `souvenirs.js`. The real Fushimi Inari gates are unpainted structural wood, not stone or concrete, and are frequently repainted/replaced by individual donors — the game's uniform vermilion is correct for the visual identity even though real gates weather to different shades gate-to-gate.

**Uncertain and flagged**: I could not confirm whether the DSL's `tex` painting can mix two colours in one block cleanly enough for the black kasagi tips without a new texture key. If not, six blocks (5+the two-tone lintel split into 3) is the fallback, still cheap since it's one shared group.

### 2.2 Yasaka Pagoda (`yasaka`)

**Correction to the brief's default assumption**: I researched this rather than assumed it — Yasaka Pagoda's exterior is *not* painted vermilion. Multiple independent descriptions call it weathered, unpainted timber with white plaster infill between structural members [V, see §3 sources]. Painting it vermilion would repeat the exact category error the brief already flags for Kiyomizu-dera (Buddhist vs. Shinto colour coding) — a five-story pagoda at a Buddhist temple complex (Hōkan-ji) should read as timber-brown, not shrine-red. The design below uses weathered brown/grey timber with cream plaster, reserving vermilion for small corner accents only if Dan wants a visual link to the other two monuments — see open question in §5.

`scale: 46, compare: 'bus'` (46 m — see §3 for source).

Structurally closest to the **Empire State Building's telescoping crown**: both are a stack of shrinking box tiers on a common vertical axis with a thin metal mast on top. The difference is that a pagoda's roofs are flat and *overhang* the story beneath (each eave is wider than its own wall), where Empire State's setbacks *narrow* continuously — so each "story" here is built as a **pair** of blocks (a narrow wall box, then a wide flat eave box sitting directly above it) rather than one continuously-tapering shape. Five such pairs, each pair narrower than the one below, produce the classic pagoda silhouette without needing a new shape in the DSL.

Build order (bottom-up, 21 blocks):

1. `B([0,0.25,0],[7.2,0.5,7.2],'#8f887a','box')` — stone base platform (*kidan*)
2. `B([0,1.65,0],[5.6,2.4,5.6],'#5c5044','box',{tex:'win'})` — 1st-story wall, `tex:'win'` painted as the timber-lattice/plaster rhythm real photos show
3. `B([0,3.0,0],[7.0,0.35,7.0],'#332c26','box')` — 1st eave, wide and thin, dark
4. `B([0,4.2,0],[4.6,2.1,4.6],'#635546','box',{tex:'win'})` — 2nd-story wall
5. `B([0,5.45,0],[5.8,0.32,5.8],'#332c26','box')` — 2nd eave
6. `B([0,6.5,0],[3.8,1.9,3.8],'#665748','box',{tex:'win'})` — 3rd-story wall
7. `B([0,7.6,0],[4.8,0.3,4.8],'#332c26','box')` — 3rd eave
8. `B([0,8.55,0],[3.1,1.7,3.1],'#6a5b4c','box',{tex:'win'})` — 4th-story wall
9. `B([0,9.5,0],[3.9,0.28,3.9],'#332c26','box')` — 4th eave
10. `B([0,10.35,0],[2.5,1.5,2.5],'#6e5f50','box',{tex:'win'})` — 5th (top) story wall
11. `B([0,11.2,0],[3.2,0.26,3.2],'#332c26','box')` — 5th (top) eave
12–15. Four corner pillars at the 1st-story veranda, `cyl`, weathered timber brown (not vermilion, per the correction above) — `B([±2.6,1.65,±2.6],[0.28,2.4,0.28],'#4a3f34','cyl')`
16. `B([0,11.9,0],[1.0,0.6,1.0],'#7a6a52','cyl')` — roof-ridge cap / finial base (weathered bronze)
17. `B([0,14.5,0],[0.14,5.0,0.14],'#c9a86a','cyl',{metal:1,em:'#e8c98a',emI:0.3})` — the *sōrin*, the tall bronze finial mast (this monument's first use of `metal`+`em` on something this thin and tall — closest precedent is the Eiffel Tower's antenna mast)
18–20. Three *kurin* rings, `torus`, shrinking slightly as they rise — `B([0,12.6,0],[0.7,0.12,0.7],'#c9a86a','torus',{metal:1})`, `B([0,13.3,0],[0.6,0.11,0.6],...)`, `B([0,13.95,0],[0.5,0.1,0.5],...)` — the game's first use of the plain `torus` shape (currently only used flattened, as `arch`, elsewhere)
21. `B([0,16.9,0],[0.5,0.9,0.5],'#e8c98a','sphere',{metal:1,em:'#ffdfa0',emI:0.5})` — the *suien* (flaming jewel) finial cap

21 blocks, inside the 18–25 band.

### 2.3 Kiyomizu-dera stage (`kiyomizu`)

`scale: 13, compare: 'bus'` — 13 m is the stage's height above the ravine floor, not the whole temple's footprint [V, §3].

The Buddhist-temple point from the brief is structural here, not decorative: **every timber surface is unpainted cypress (hinoki)** — no vermilion anywhere on this monument, including the corner accents I avoided on the pagoda above.

Structurally this splits into two problems the DSL doesn't have a ready single shape for, so it borrows from two different existing monuments:

- The understructure (*kake-zukuri* — a construction method where pillars are raised straight up a slope or cliff to carry a building out past its edge; Kiyomizu-dera's version is specifically the largest surviving example) is closest to the **Pantheon's `colonnade` portico** — rows of shafts with cap and base — reused here as **three stacked tiers of scaffolding** rather than one row, since the real structure is a grid of pillars at different heights following the hillside, not a single colonnade.
- The hall itself (*hondō*) with its hipped-and-gabled (*irimoya*) roof has no precedent in the existing defs at all — nothing else in the game has a hip-and-gable roof. It's approximated with a `pyramid` for the hip mass and a `prism` for the gable that crests through the roof's front slope, which is a genuinely new combination, not a reuse.

Build order (bottom-up, 19 blocks):

1. `B([0,0.15,-7.5],[9.2,0.3,2.0],'#6a6053','box')` — stone retaining wall at the hillside base
2. `B([0,1.0,-7],[8.6,2.0,2.6],'#4a3f30','colonnade',{cols:5})` — lowest scaffold tier, unpainted cypress/zelkova posts
3. `B([0,2.1,-7],[8.8,0.3,2.8],'#3a3226','box')` — horizontal brace beam
4. `B([0,3.3,-7],[8.2,2.2,2.5],'#4a3f30','colonnade',{cols:5})` — mid scaffold tier
5. `B([0,4.55,-7],[8.4,0.3,2.6],'#3a3226','box')` — brace beam
6. `B([0,5.9,-7],[7.8,2.4,2.4],'#4a3f30','colonnade',{cols:5})` — upper scaffold tier, reaching the stage underside
7–8. Two diagonal corner braces — `B([-3.2,3.5,-6.2],[0.25,5.5,0.25],'#4a3f30','box',{rotZ:0.35})` and its mirror at `+3.2, rotZ:-0.35` — the crisscross bracing every real photo of the stage shows
9. `B([0,7.3,-6.5],[9.6,0.5,5.0],'#8f7a5c','box')` — the stage deck (*butai*) itself, the cantilevered cypress-board platform
10. `B([0,7.85,-8.8],[9.6,0.6,0.15],'#786550','box')` — low unpainted balustrade at the platform's outer edge
11–12. Two rail corner posts, small `box`, same colour
13. `B([0,9.5,-3.5],[9.0,4.0,7.0],'#8a7660','box',{tex:'win'})` — hondō wall, `tex:'win'` reused for the shōji/lattice rhythm, unpainted cypress tone
14. `B([0,12.0,-3.5],[9.4,0.6,7.4],'#5c5044','box')` — eave beam beneath the roofline
15. `B([0,13.6,-3.5],[10.6,2.6,8.0],'#3a332c','pyramid')` — the main hip roof mass; real roofing is *hiwada-buki*, layered hinoki-bark shingle, not tile [V, §3] — colour kept dark brown-grey rather than the game's usual clay-tile tones for that reason
16. `B([0,14.6,-3.5],[6.0,1.6,3.0],'#332c26','prism')` — the gable ridge cresting through the hip roof's front slope, giving the *irimoya* double silhouette
17. `B([0,15.9,-3.5],[7.0,0.22,0.3],'#211c18','box')` — ridge cap beam (*munagi*)
18–19. Two ridge-end ornaments, small `box`, dark — a simplified stand-in for the sculpted tile-end ornaments real temple roofs carry; flagged as a stylization, not a claim about what the real ornament looks like

19 blocks, inside the 18–25 band.

**On kitsune guardians (the brief's warning)**: neither Yasaka Pagoda nor Kiyomizu-dera has fox guardians — those belong at Shinto shrines (Fushimi Inari itself has stone kitsune flanking its gates). I have deliberately left them off both Buddhist-temple monuments above and off the Romon gate design below, since a proper fox silhouette would need a new shape (four-legged animal, seated, with a distinct tail) that doesn't exist in the DSL yet — building one from the `statue` shape's bipedal-robe geometry would produce something unrecognizable as a fox. This is a real gap if Dan wants kitsune in the scene; see §5.

### 2.4 Fushimi Inari Romon gate (`fushimi`)

Not yet drafted in a block list here — the brief's monument list names "Fushimi Inari torii gate," and the roadmap names the corridor as the standout piece. I designed the *corridor* prop (§2.1) because that is what makes Fushimi Inari's street distinct from a normal building-lined street, per the roadmap ("a runner passing through hundreds of vermilion gates is a genuinely striking corridor"). Whether the puzzle-rebuild monument at the end of that street should be the **Romon gate** (built 1589 by Toyotomi Hideyoshi, the largest and oldest romon in Kyoto — a proper two-story gate with a roofed upper story, structurally closer to Tower Bridge's paired towers) or a single oversized **torii** (structurally just a giant version of §2.1) is an open decision — see §5. I did not want to draft a full 18–25 block list for both and have Dan pick one after reading a spec that already committed to a choice half the doc doesn't need.

---

## 3. Facts

Exact `src/facts.js` shape. Every fact below is [V] verified against at least one specific source found during this research pass, or [A] flagged for Dan to check — I did not invent any number.

### STREET_FACTS

```js
kyoto: [
  { street: 'Fushimi Inari', tag: 'The mountain of ten thousand gates',
    facts: [
      { big: '10,000', unit: 'gates', label: 'on the whole mountain', text: 'People believe there are about ten thousand torii gates covering Mount Inari, donated one at a time over centuries.' }, // [V] mai-ko.com, japan.travel
      { big: '800', unit: 'gates', label: 'in the famous tunnel', text: 'The famous photo spot, the Senbon Torii, is really about 800 gates packed close together — "senbon" just means "a thousand," a way of saying "so many you can\'t count."' }, // [V] hoteltavinos.com, ninja-cafe.com
      { text: 'Businesses and families have been donating gates since the Edo period, each one a way of saying thank you for good fortune.' }, // [V] mai-ko.com
    ] },
  { street: 'Hanamikoji', tag: 'Gion\'s teahouse street',
    facts: [
      { text: 'Hanamikoji is the main street of Gion, Kyoto\'s most famous geisha district, lined with wooden teahouses called machiya.' }, // [A] widely stated, needs a primary source
      { text: 'The black wooden lattice covering the front of a machiya is called koshi — it lets people inside see out, without letting people outside see in.' }, // [A] needs a primary source
      { text: 'Geiko (Kyoto\'s word for geisha) and their apprentices, maiko, still walk this street to appointments today.' }, // [A] needs a primary source
    ] },
  { street: 'Arashiyama', tag: 'The bamboo grove',
    facts: [
      { text: 'The path through the grove is lined with bamboo that can grow over 20 metres tall.' }, // [A] needs a primary source — height claim
      { text: 'Bamboo groves like this one have been sound so distinctive Japan\'s Ministry of the Environment named the rustle one of the "100 Soundscapes of Japan."' }, // [A] needs a primary source
      { text: 'The grove sits beside the Hozu River, which boatmen have poled log rafts and tourists down for centuries.' }, // [A] needs a primary source
    ] },
],
```

### MONUMENT_FACTS

```js
yasaka: { scale: 46, compare: 'bus',
  facts: [
    { big: '592', label: 'first built', text: 'A pagoda has stood on this spot since 592 AD, raised by Prince Shōtoku — one of the oldest sites in Kyoto.' }, // [V] en.wikipedia.org/wiki/Yasaka_Pagoda
    { big: '1440', label: 'the tower you see today', text: 'Fire and lightning destroyed it more than once. The tower standing now was rebuilt in 1440.' }, // [V] en.wikipedia.org/wiki/Yasaka_Pagoda
    { text: 'Unlike most old pagodas, you can actually go inside and climb partway up — that\'s rare for a protected building this old.' }, // [V] en.wikipedia.org/wiki/Yasaka_Pagoda
  ] },
kiyomizu: { scale: 13, compare: 'bus',
  facts: [
    { big: '1633', label: 'rebuilt', text: 'The hall you see was rebuilt in 1633, paid for by the shogun Tokugawa Iemitsu after a fire.' }, // [V] Wikipedia "Kiyomizu-dera"; worldhistory.org
    { big: '0', unit: 'nails', label: 'used to build the stage', text: 'The huge wooden stage was built with locking joints and not one single nail.' }, // [V] japanroyalservice.com, muza-chan.net
    { text: 'The roof isn\'t tiled — it\'s layered strips of Japanese cypress bark, a technique called hiwada-buki.' }, // [V] worldhistory.org, note.com (satoukensetu)
  ] },
fushimi: { scale: 4.4, compare: 'person',
  facts: [
    { big: '1589', label: 'the gate was built', text: 'The big entrance gate was built in 1589 by the warlord Toyotomi Hideyoshi, to thank the shrine after his mother recovered from illness.' }, // [V] inari.jp/en/map/spot_02, gltjp.com
    { text: 'It is the oldest and largest romon (two-story shrine gate) in all of Kyoto.' }, // [V] inari.jp/en/map/spot_02
    { text: 'Fushimi Inari is dedicated to Inari, the spirit of rice and business success — which is why so many companies donate gates here.' }, // [A] widely stated, needs a primary source for this doc
  ] },
```

Note on `fushimi`'s `scale`: 4.4 m is the corridor gate's *design* clear height from §2.1, not a real-world measurement of the Romon gate (which is a two-story structure, taller) — this needs correcting once §2.4's open question is resolved, since `MONUMENT_FACTS.fushimi` should describe whichever structure actually gets built as the puzzle monument.

---

## 4. New props / builder functions needed

Everything below is new; nothing in the existing `props` lists (`lamp`, `hydrant`, `billboard`, `tree`, `awning`, `column`, `fountain`, etc. — see `src/cities/builders.js`'s `makeProp` switch) fits Kyoto's palette without looking wrong.

- **`toro`** — stone lantern (*tōrō*): a squat stacked column of stone blocks (base, shaft, fire-box, roof cap), unlit or with a warm interior glow. Closest existing precedent to build from: `makeLamp`'s general shape (post + light housing), but stone-textured and stockier, not a tall iron post.
- **`lantern`** — hanging paper lantern (*chōchin*): the souvenir shape (§ below) reused as a street prop, hung singly outside teahouses rather than collected. Also needed as the payload of the new `span: 'lantern'` overhead-string style, parallel to the existing `festoon`/`string` styles in `makeStreetSpan`.
- **`maple`** — a `makeTree` variant (the function already branches on a `kind` string: `'round'`, `'cypress'`, `'chestnut'`, `'plane'`) — add `'maple'` with a red-orange canopy for the Higashiyama hillside look.
- **`bamboo`** — a dense cluster of thin tall pale-green culms with dark leaf tufts near the top; nothing existing is close, this needs a genuinely new builder.
- **New `span` style `'torii'`** in `makeStreetSpan` — see §2.1. Needs `spanFreq` pushed much higher than any existing street (`0.92` vs. Rome Navona's `0.6`) since the corridor effect depends on gates reading as near-continuous.
- **New `facade` styles** `'shrine_path'` (Fushimi Inari — mostly trees and lanterns, few or no buildings) and `'bamboo_path'` (Arashiyama — almost no buildings) — both are a bigger structural change than a normal facade swap, since `makeBuilding` currently assumes there's always a building to draw on each side. Whatever handles building placement per chunk needs a path that can skip buildings on a street and substitute dense flora instead. I have not looked at how deep that change would need to go inside `track.js`'s chunk-generation loop — flagged in §5.
- **`'machiya'` facade + `lattice: true`** — closer to a normal facade variant like Rome's `'ochre'` or Paris's `'village'`: black timber body, `koshi` lattice texture on the ground floor (a new `tex` canvas pattern, closest existing precedent is `'gothic'` or `'lattice'`, both already canvas-painted textures).
- **`rickshaw` vehicle** — new entry in `makeVehicle`'s switch. A two-wheeled pulled cart is a genuinely different silhouette from every existing vehicle (`taxi`, `citroen`, `bus`, `vespa`) — low, narrow, no engine — which may also mean a different lane-obstacle profile (`'full'` obstacles currently size around car/bus proportions).
- **Souvenir — paper lantern** (chosen over the maneki-neko alternative, see §5): an ellipsoid/capsule body in glowing vermilion-orange with black top and bottom rings and a short black tassel underneath. Build pattern closest to the London phonebox collectible in `souvenirs.js` (a small stack of primitives: box/dome/cylinder, one emissive material) rather than the NYC heart's extruded-shape approach.

---

## 5. Open questions for Dan

1. **Fushimi Inari's puzzle monument** — Romon gate (two-story, 1589, more work, more historically specific) or an oversized torii (reuses the corridor prop's geometry, less new work, but then the street's signature moment and its monument are the same shape)? See §2.4. I'd lean Romon gate, since the corridor already spends the torii idea and the puzzle payoff should be a different silhouette — but it's real extra scope.
2. **Kitsune guardians** — real Fushimi Inari has stone fox statues flanking its gates, and they're an obvious, expected detail. The DSL has no four-legged-animal shape. Worth a new `shape` for this, or skip foxes entirely for now? See §2.3's note.
3. **Yasaka Pagoda's colour** — I corrected the brief's assumed vermilion to weathered timber-brown because that's what the source photos and descriptions show (§2.2, §3). Confirm you're fine losing the vermilion accent on one of the three monuments, or want me to find a defensible way to keep a small amount of red trim (some restoration photos do show painted red on subsidiary elements — I did not chase that down; flagged as [A] rather than asserted).
4. **Geographic cameos** — every existing city's `cameo` field points to a landmark that is genuinely visible or plausible from that street in real life (Champs-Élysées really does look straight at the Arc; Piccadilly really does have Eros). Fushimi Inari, Gion and Arashiyama are several kilometres apart across Kyoto and none of the three monuments is visible from either of the other streets. I left `cameo` out of all three `levels` entries above rather than fabricate sightlines. If you'd rather have *something* on the horizon for visual interest, a generic unnamed silhouette (hills, not a specific named monument) would preserve the honesty; a named cross-cameo would not.
5. **`shrine_path` / `bamboo_path` facades** — flagged in §4 as possibly needing changes to how `track.js`'s chunk loop places buildings, not just a new facade skin. I have not traced how deep that goes; it may be bigger than "one CITIES entry," closer to Lombard Street's curved road or Xochimilco's canals — i.e. one of the roadmap's three genuinely-new-mechanic items, not routine data. Worth scoping before committing to a timeline.
6. **`toro`/`lantern` glow at night vs. day streets** — Hanamikoji is meant to read as dusk (lanterns lit); Fushimi Inari and Arashiyama are daylight. Confirm the `lit` values I picked (0.08 / 0.3 / 0.02) feel right once it's on screen — they're a guess from the existing cities' range, not measured against anything.
7. **Souvenir: lantern vs. maneki-neko** — I designed the lantern (§4) because it reuses a simple primitive-stack pattern and ties directly to the new `lantern` street prop and span style. A maneki-neko (beckoning cat) is more instantly recognizable to an 8-year-old outside Japan but is a more complex shape (a seated cat with a raised paw) and wouldn't share geometry with anything else in this spec. Confirm the lantern choice, or say if instant recognizability matters more than shape reuse here.
8. **Vehicle** — the roadmap doesn't specify one for Kyoto (unlike SF's cable car). I picked `rickshaw` as a period-appropriate, visually distinct option; a bicycle or a small delivery truck are other options with less new geometry work.
9. **Heritage-fee regime for Japan** — the roadmap's IP table names Italy, Greece and Egypt as charging commercial-reproduction fees even on public-domain works. I did not find a Japanese equivalent in this pass, but I also did not do an exhaustive legal search — worth a specific check before treating §0 as final, the same way Jerusalem's facts got a dedicated review gate.
