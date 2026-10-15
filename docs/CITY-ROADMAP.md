# CityRunner — City Roadmap

**For decision. 02 August 2026.**
Which cities to add, in what order, and which landmarks are legally clean.

---

## The rule that shapes everything

Every landmark must clear an IP filter. Three regimes matter:

| Region | Position |
|---|---|
| **United States** | **Safest of all.** Buildings completed before **1 December 1990** have no architectural copyright — the AWCPA only protects works from that date. §120(a) also permits pictorial representations of buildings visible from public places |
| **Ancient / pre-modern** | Anything centuries old is out of copyright everywhere. Temples, walls, pyramids, cathedrals |
| **Italy, Greece, Egypt** | Heritage-code regimes charge fees for commercial reproduction **even of public-domain works**. Rome is already in the game — we are clear only because we render our own geometry rather than reproducing images |

**Two traps that recur:** modern landmarks by architects who died within the last 70 years (Sydney Opera House, Louvre Pyramid, Tokyo Tower), and living artists' sculptures (Chicago's "Bean", Rio's Christ).

**Mexico is the outlier: copyright runs life + 100 years**, the longest in the world. It rules out more than you would expect.

---

## Recommended order

### 1. San Francisco — next (United States)

The strongest choice available: legally the cleanest, and visually the maximum possible contrast with New York. Hills, fog, pastel Victorians and orange steel against Manhattan's canyon.

| | |
|---|---|
| **Streets** | **Lombard Street** (the crooked block — a gift for a runner), **Market Street**, **Haight-Ashbury** |
| **Monuments** | **Golden Gate Bridge** (1937), **Coit Tower** (1933), **Painted Ladies** (1890s) |
| **Souvenir** | A cable car |
| **Vehicle** | Cable car / vintage trolley — and the hills justify a genuinely different road profile |
| **Palette** | International-orange steel, fog-grey haze, pastel Victorian facades |

*IP: every landmark is pre-1990 and therefore unprotected. Avoid naming the Transamerica Pyramid — the shape is a registered trademark, though the building itself is pre-1990.*

**Why Lombard Street matters:** its hairpin bends are the first excuse in the game for a road that is not straight. That is a genuine mechanical novelty, not just a reskin.

### 2. Kyoto — Asia (PARKED)

**Parked 19 September 2026, Dan's call.** The design spec is kept in `docs/cities/kyoto.md` for when it is picked up again. Two things were unresolved and both would have to be settled first:

1. **It may not be data-only.** The bamboo grove and the shrine path replace building facades with something else. The spec suggests that may need changes to how `track.js` places buildings, which would make Kyoto a mechanics job rather than a data job. Not traced.
2. **Japanese heritage fees are unchecked.** Italy, Greece and Egypt charge fees to reproduce even public-domain works. No Japanese equivalent was found, but the search was not thorough.

San Francisco, Mexico City and Jerusalem go ahead without it.


Recommended over Tokyo, for a reason worth knowing: **Tokyo's famous modern landmarks are all off-limits.** Tokyo Tower (1958) is protected until 2040, Skytree and Rainbow Bridge are far newer. A legal Tokyo would rest on Senso-ji, Shibuya Crossing and Harajuku — good, but Shibuya's neon would duplicate Times Square.

Kyoto is legally spotless and unlike anything in the game.

| | |
|---|---|
| **Streets** | **Fushimi Inari** (the vermilion torii tunnel), **Gion / Hanamikoji** (wooden machiya, lanterns), **Arashiyama** (bamboo grove) |
| **Monuments** | **Yasaka Pagoda**, **Kiyomizu-dera** stage, **Fushimi Inari** torii gate |
| **Souvenir** | A paper lantern or maneki-neko |
| **Palette** | Vermilion, moss green, black timber, cherry blossom |

*The torii tunnel is the standout: a runner passing through hundreds of vermilion gates is a genuinely striking corridor, and completely distinct from a street.*

### 3. Mexico City — Latin America

Vivid, culturally rich, and a real change of register.

| | |
|---|---|
| **Streets** | **Paseo de la Reforma**, **Coyoacán**, **Xochimilco** (canals and painted trajinera boats) |
| **Monuments** | **Templo Mayor** pyramid, **Metropolitan Cathedral** (1573–1813), **Chapultepec Castle** (from 1785) |
| **Souvenir** | A sugar skull or marigold |

*IP caution: Mexico is life + 100, counted from the death of the last surviving author. **Palacio de Bellas Artes is still protected** — its architect died in 1928, so it clears only in 2028. Leave it out.*

**Changed 19 September 2026: the Angel of Independence is out, Chapultepec Castle is in.** This table previously listed the Angel (1910) as clear. It is not. Age of the work is the wrong test under life + 100; the authors' death dates are. Its architect, Antonio Rivas Mercado, died 3 January 1927, so it clears no earlier than 2027. It is also a joint work: sculptor Enrique Alciati made the bronze Angel, and his death date could not be found, so the true clearance date may be later. Dan chose Chapultepec Castle as the replacement. The castle was remodelled in the 1860s and later, so every credited architect's death date is checked in `docs/cities/mexico-city.md` before anything is built.

**Alternative:** Havana — classic American cars, pastel colonial, the Malecón. It pairs neatly with San Francisco's vintage-vehicle theme.

### 4. Jerusalem — later, as you said

Legally the simplest city on this list: everything of note is centuries old, so there is no copyright question at all.

| | |
|---|---|
| **Streets** | **Jaffa Road**, **Mahane Yehuda** market, **the Cardo** (Old City) |
| **Monuments** | **The Western Wall**, **The Dome of the Rock**, **Tower of David** citadel |
| **Souvenir** | A pomegranate or an olive branch |
| **Palette** | Jerusalem stone — warm limestone, gold at dusk |

**Decided: the Western Wall and the Dome of the Rock are both included.** Dan's call, taken 02 August 2026.

Both are legally clear — they are centuries old, so no copyright question arises. The care needed is editorial rather than legal. The approach: dual naming where a site has contested names (Temple Mount / Haram al-Sharif), facts kept architectural and historical rather than political, and religious significance described in the terms each tradition uses of itself.

**The three monuments are therefore: the Western Wall, the Dome of the Rock, and the Tower of David.**

**Jerusalem's facts are drafted separately in `JERUSALEM-FACTS-DRAFT.md` and must be personally reviewed and signed off by Dan before they ship.** No other city has this gate; this one does.

### Parked: Sydney

Buildable, but compromised. The **Opera House** is protected until **2078** (Utzon died 2008). Australia's freedom of panorama covers 2D depictions — photographs, drawings, film — but we would be building a **3D model**, which is a different act and far less clearly covered, and the Opera House Trust separately asserts trademark over commercial use of its image.

A Sydney built on the **Harbour Bridge (1932)**, Queen Victoria Building and Bondi is legally fine — but a Sydney without the Opera House feels like a Paris without the Eiffel Tower. Revisit only if the roster runs dry.

---

## Thirteen more cities (12 October 2026)

Dan asked for more cities, light on Europe and heavier on Asia and Africa,
grouped by region so they could later be sold as region packs, and each
with a move of its own, in the way Rome has its signalling Vespas. All
thirteen are built and in the release queue behind Mexico City
(`docs/RELEASES.md`). Each city has a `region` in `themes.js` (`REGIONS`
lists them); packs themselves are not built, and how they would sit beside
the Founder and Unlock purchases is still Dan's decision.

| # | City | Region | Monuments (street 1, 2, 3) | Its move |
|---|---|---|---|---|
| 1 | Marrakech | Middle East and Africa | Koutoubia Minaret, Bab Agnaou, Ben Youssef Madrasa | Porters' handcarts cross the road |
| 2 | Delhi | Asia | Red Fort (Lahori Gate), Qutub Minar, India Gate | Rickshaws drive on ahead, then brake hard |
| 3 | Bangkok | Asia | Giant Swing, Wat Arun, Chakri Maha Prasat | Tuk-tuks U-turn across one or two lanes |
| 4 | Cape Town | Middle East and Africa | Waterfront Clock Tower, Castle of Good Hope, City Hall | Wind gusts push you a lane, never into anything |
| 5 | Hanoi | Asia | Turtle Tower, Long Bien Bridge, Temple of Literature | Motorbikes swerve in pairs; a train on Train Street |
| 6 | Seoul | Asia | Heunginjimun, Gyeonghoeru Pavilion, Geunjeongjeon | A crowd crosses when the countdown ends |
| 7 | Zanzibar | Middle East and Africa | Old Fort, Christ Church Cathedral, House of Wonders | Houses jut out: the street narrows to two lanes |
| 8 | Samarkand | Asia | Ulugh Beg Observatory, Gur-e-Amir, the Registan | Walls of tiled arches; the open arch switches |
| 9 | Beijing | Asia | Drum Tower, Hall of Prayer for Good Harvests, Hall of Supreme Harmony | Tricycles: jump the low loads, go round the tall |
| 10 | Havana | Latin America | Castillo de la Real Fuerza, Havana Cathedral, Morro Castle | Waves over the sea wall; old cars pull out |
| 11 | Istanbul | Europe | Galata Tower, Blue Mosque, Hagia Sophia | The tram down the middle; porters in the bazaar |
| 12 | Chicago | North America | Water Tower, Buckingham Fountain, Willis Tower | Bascule bridges lift: jump the edge; cabs pull out |
| 13 | Buenos Aires | Latin America | Casa Rosada, Teatro Colón, Palace of the Congress | Buses pull out from their stops |

Every move lives in `src/run/mechanics.js` and is gated by
`test/city-mechanics.mjs`: each one is driven by the seed, warns before it
happens, keeps a lane open, and runs only in its own city, so the existing
courses (and the determinism fingerprint) do not change. Monuments get more
pieces street by street (about 12, 18 and 24), on top of main's general
puzzle tuning.

**Monuments swapped from the first plan**, all on copyright grounds:

- **One Pillar Pagoda → Long Bien Bridge** (Hanoi): the pagoda standing is a 1955 rebuild by an architect who died this century; Vietnam is life + 50.
- **Sungnyemun → Gyeonghoeru Pavilion** (Seoul): Sungnyemun was rebuilt in 2013, and three gates would look alike.
- **Bibi-Khanym Mosque → Ulugh Beg Observatory** (Samarkand): largely reconstructed from 1974.
- **El Capitolio → Castillo de la Real Fuerza** (Havana): a joint work protected until 50 years after its last author's death, and not every co-author's death date could be confirmed.

**Still to check:** Cape Town City Hall's architects (Reid and Green, 1890s competition): their death dates were not found; South Africa is life + 50, so it would take one living past 1975.

**Left out of every skyline and street:** Buenos Aires' Obelisco (to 2041), N Seoul Tower, Tiananmen Square, the Bean and other recent sculptures, and the bronze sea horses of Buckingham Fountain.

---

## Venice (15 October 2026)

Packs went on sale by region on 14 October, and Dan wanted them roughly
equal, so Europe and North America each needed one more paid city. Of the
candidates (Lisbon, Venice, Amsterdam; Quebec City, New Orleans,
Washington), Dan chose Venice first, for the water. North America is still
open.

- **Streets:** Strada Nova (the 1871 street from the Rialto to the
  station, washing hung across), the Zattere (the quay on the Giudecca
  Canal, gondolas moored along it), the Riva degli Schiavoni (the lagoon
  front, the Campanile at the end).
- **Monuments:** Rialto Bridge (13 pieces), Santa Maria della Salute (15),
  Doge's Palace with the Bridge of Sighs and the Piazzetta's columns (24).
  All long out of copyright.
- **No cars.** The obstacle that stands in a lane is a porter's trolley of
  parcels, jumpable; trolleys also stand along the sides in place of
  parked cars.
- **Moves:** on the first two streets a gondola crosses in a side canal.
  The canal is a jump in every lane, and the gondola, being long, walls
  off the middle lane and one outer lane when you get there: jump in the
  lane it will have left. On the Riva, acqua alta: two lanes flood for
  15 m and a wooden walkway runs along the third. test/city-mechanics.mjs
  gates both.
- **Souvenir:** a carnival mask.
- Queued second, behind Mexico City.

---

## Balance check

| Region | Cities |
|---|---|
| North America | New York, San Francisco, Chicago |
| Latin America | Mexico City, Havana, Buenos Aires |
| Europe | Paris, London, Rome, Istanbul, Venice |
| Middle East and Africa | Jerusalem, Marrakech, Cape Town, Zanzibar |
| Asia | Delhi, Bangkok, Hanoi, Seoul, Samarkand, Beijing *(Kyoto parked)* |

With Venice that makes **21 cities, 63 streets, 63 monuments**.

---

## Effort

A city is now largely **data**: one `CITIES` entry with three street overrides in `themes.js`, three monument definitions in `landmarks.js`, six fact sets in `facts.js`, one souvenir in `souvenirs.js`, plus any props unique to that city in `builders.js`.

**Roughly 1–2 sessions each** — versus the many the first four consumed. The three that need genuinely new *mechanics* rather than new data are Lombard Street's curving road, Fushimi Inari's torii corridor, and Xochimilco's canals. Those are the ones worth doing well.
