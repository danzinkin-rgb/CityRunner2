# Gameplay roadmap

Decided with Dan, 23 September 2026. What makes CityRunner more than another
endless runner, in the order it will be built.

The problem these solve: the run and the monument puzzle were two separate
games joined by a fade. The strongest ideas connect them.

## Agreed

| # | Idea | Status |
|---|---|---|
| 1 | **Collect the monument's pieces during the run.** Building pieces lie along the street alongside souvenirs; what you collect is what you build with. Missed pieces leave gaps you fill against the clock or with souvenirs. | Next, after the monument and puzzle work below |
| 2 | **Race your own ghost.** Runs are deterministic from a seed, so recording inputs is enough to replay a best run as a ghost. Local only — no server — which keeps "Data Not Collected" true. | Queued |
| 3 | **One place-specific move per city.** | Rome prototype built — see below |
| 4 | **Passport and postcards.** Photo spots along each street give you a postcard; each finished city gets a passport stamp on a world map. Calm collecting, no loot boxes, no timers (Children's Code). | Queued; absorbs #5 |
| 5 | ~~Named cross-streets ticker~~ | **Dropped as a ticker; folded into #4** |

### Why #5 was folded into #4

A run lasts about 46, 53 and 59 seconds on streets 1 to 3. Real streets
vary too much for a single rule: the Champs-Élysées gives a name every
~5s, which is readable; Market Street's ~40 junctions give one every ~1.3s,
which is a blur; Broadway would need a segment choosing; and Times Square,
Piazza Navona and Lombard's crooked block have none. Players are watching
the road, so a ticker mostly goes unread. Instead two or three real, named
places per street become photo spots, so the name earns its place on
screen, and it is 30–45 names to verify against two sources rather than
~120.

### #3 — city moves

Rome, prototyped on branch `rome-vespa`: Vespas flick an indicator on and
change lanes 1.5s later. Read the signal: the lane it leaves is safe, the
lane it enters is not. See `WEAVE_CHANCE` in `src/run/track.js` for the
timing and the fairness rules, and `test/rome-weave.mjs`.

Candidates for the other cities, not built:
- **New York** — steam vents that puff before they blast.
- **San Francisco** — jump onto a passing cable car for a ride. Close to
  Subway Surfers' train roofs, so lower priority than Rome's.
- **London, Paris** — to be decided.

## Monument puzzle (built, on `cities`)

Difficulty now changes how you build, not just how many pieces start in
place: street 1 taps what glows; street 2 drags, with the next course
glowing; street 3 drags with no glow and some pieces a quarter-turn out.
The clock scales with the loose pieces. The suspension bridges go together
in real build order, deck hung after the cables.

Not yet done: a fact revealed at each real construction stage, which
needs sourced stage facts per monument.
