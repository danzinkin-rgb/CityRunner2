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

### 2. Kyoto — Asia

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
| **Monuments** | **Angel of Independence** (1910), **Metropolitan Cathedral** (1573–1813), **Templo Mayor** pyramid |
| **Souvenir** | A sugar skull or marigold |

*IP caution: Mexico is life + 100. **Palacio de Bellas Artes is still protected** — its architect died in 1928, so it clears only in 2028. Leave it out for now. The three above are all clear.*

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

## Balance check

| Region | Cities |
|---|---|
| Europe | Paris, London, Rome *(already 3 of 4)* |
| North America | New York, **San Francisco** |
| Asia | **Kyoto** |
| Latin America | **Mexico City** |
| Middle East | **Jerusalem** |

That lands at **8 cities, 24 streets, 24 monuments**, with Europe down from 75% to 38% of the roster.

---

## Effort

A city is now largely **data**: one `CITIES` entry with three street overrides in `themes.js`, three monument definitions in `landmarks.js`, six fact sets in `facts.js`, one souvenir in `souvenirs.js`, plus any props unique to that city in `builders.js`.

**Roughly 1–2 sessions each** — versus the many the first four consumed. The three that need genuinely new *mechanics* rather than new data are Lombard Street's curving road, Fushimi Inari's torii corridor, and Xochimilco's canals. Those are the ones worth doing well.
