# Releases

How CityRunner ships. Agreed with Dan, 2 October 2026.

## The rule

- **Fixes and improvements** go out in whatever release comes next.
- **Every finished city is released, into its region's pack** (Dan, 15
  October 2026; until then cities went out one at a time). Every city feeds
  the daily challenge. Founder opens everything; otherwise each region's
  pack opens its cities. Paid cities open in a chain within their region:
  the first plays once owned, each later one after a street in the one
  before it. New York, Paris and London stay free with their own chain.
- The release queue (`RELEASE_QUEUE`) remains for a city still being built.

## How it works in the code

`main` is always the next release, ready to ship. Everything merges into it as
soon as it is tested, including finished cities, because a city can be in
`main` without players seeing it:

- `src/cities/releases.js` holds `RELEASE_QUEUE`, the finished cities not yet
  released, next one first.
- A queued city is hidden from players everywhere the game lists cities (the
  menu, the progression chain, NEXT LEVEL, the souvenir list, the Game Center
  totals), in the store build and on the web.
- Tester builds (`npm run ios:sync:tester`) and the test suites see every
  city, so a queued city is played and tested on a phone before it ships.
- `test/releases.mjs` and `test/release-build.mjs` check that players see
  exactly the released cities.

GitHub Pages serves `main`, so the free web version picks up fixes as soon
as they merge, and a city when it is released.

## Releasing

1. **Decide what ships.** Everything in `main`, including every finished
   city.
2. **Release the cities** (if any): remove them from `RELEASE_QUEUE`.
3. **Version**: bump `VERSION` in `src/main.js`, `version` in `package.json`,
   and `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in
   `ios/App/App.xcodeproj/project.pbxproj`. A city release is a minor
   version (1.2.0); fixes only, a patch (1.1.1). The build number always
   goes up.
4. **For a new city**, in App Store Connect before submitting: create its
   Game Center leaderboard (`uk.co.zinkin.cityrunner.leaderboard.<id>`) and
   achievement (`...achievement.city.<id>`) and add both for review; add it
   to the description; add its screenshots if it should be in them. It is
   paid (not in `FREE_CITIES`), so the Founder purchase and its region's pack
   cover it; the region's pack must exist in App Store Connect.
   **City achievements are worth 0 points** (Dan, 15 October 2026). Game
   Center allows 1,000 points per game and the first ten live achievements
   used 950; a live achievement's points can never change. App Store Connect
   accepts 0, and players still get the badge and message. The 50 points
   left are kept for milestones that do not depend on the city count
   (for example "master 10 cities"). Copy San Francisco's settings (not
   hidden, not repeatable; earned and pre-earned text "Earn(ed) all 3 stars
   in <city>.") and a 1024x1024 badge in the same style.
5. **Daily challenge**: a new city stays out of the daily until a release
   chooses to add it, which needs a new `DAILY.version` and a matching daily
   leaderboard (see `src/core/rng.js`).
6. **Test**: `npm test` green, then a tester build on the phone.
7. **Ship**: on the Mac, `git pull`, `npm run ios:sync` (the plain sync, not
   the tester one), archive, upload, submit. Tag the release commit
   (`git tag v1.2.0`) and push the tag.

## Queue

Every city finished before 1.2.0 was released in it. Waiting now:

| Order | City | Region | Status | Game Center items to create |
|---|---|---|---|---|
| 1 | Venice | Europe | Built; facts approved by Dan, 15 October 2026 (`docs/VENICE-FACTS-DRAFT.md`) | `…leaderboard.venice`, `…achievement.city.venice` |
| 2 | New Orleans | North America | Built; facts approved by Dan, 17 October 2026 (`docs/NEW-ORLEANS-FACTS-DRAFT.md`) | `…leaderboard.neworleans`, `…achievement.city.neworleans` |

`…` is `uk.co.zinkin.cityrunner`. Each city's own move (the "Rome Vespa" of
that city) is listed in `docs/CITY-ROADMAP.md`. Every city after Mexico
City needs Dan's sign-off on its facts draft before it ships; each draft
lists what is left to check.

Kyoto is parked (`docs/CITY-ROADMAP.md`).

## Next release: what is waiting

1.2.0, build 13 (planned 15 October 2026). Since 1.1.1:

- Region packs at £0.99 (Dan, 14 October 2026), about three cities each:
  each unlocks every city in its region, including ones added later. Six
  regions (Asia split into East Asia and South and Central Asia). Founder stays at £1.99 and unlocks
  everything, for the first ~250 buyers; the app never says so, and Founder
  is removed from sale by hand when `weekly-report.mjs --founder` nears 250
  (docs/FREEMIUM-IAP.md §6). The paywall offers both: everything, and the
  tapped city's pack. All six packs are needed in App Store Connect (§5.2a). New York,
  Paris and London unchanged.
- Game Center (Dan, 15 October 2026): the "Overall" leaderboard is renamed
  "Lifetime points" in App Store Connect (it always summed every run), and
  a new "Best run" leaderboard, `…leaderboard.bestrun`, takes the highest
  single run on any street (not the daily). Create it as a Classic
  leaderboard, High Score, Best Score, Integer, and add it to the version.
- Every city released (Dan, 15 October 2026): Jerusalem, Mexico City,
  Marrakech, Delhi, Bangkok, Cape Town, Hanoi, Seoul, Samarkand, Zanzibar,
  Beijing, Havana, Istanbul, Chicago and Buenos Aires join the five, twenty
  in all, each paid and in its region's pack. All six packs are needed in
  App Store Connect, and for each new city `…leaderboard.<id>` and
  `…achievement.city.<id>` (0 points). The daily is version 3 and draws
  from all twenty: `…leaderboard.daily.v3` (Recurring, like daily.v2).
  `marketing/asc-setup.mjs` creates whatever of this is missing (all of it
  existed by 15 October 2026); an App Manager API key cannot set IAP prices,
  so prices were set on the web page.
- Monument pieces on the run are always placed in a lane that can be
  collected without hitting anything (player feedback). This changes the
  courses, so `COURSE_VERSION` is 2 and saved ghosts from earlier versions
  are retired.
- Two game modes (player feedback: too slow for experienced players).
  Newbie keeps the original pace and scores 70%; Gamer starts at 20/23/26
  m/s with a steeper ramp and scores in full. Chosen in Settings or on the
  How to Play screen. The daily ignores the mode (Newbie pace, full score).
- Monuments are built by dragging, except street 1 of New York, Paris and
  London in Newbie mode, which stay tap-to-place. The first dragged street 1
  in each city shows a "Drag to build" card before the clock starts.
- Harder monument building (feedback: too easy). Only street 1 starts with
  pieces in place (20%; 35% on a tapped street). From street 2 nothing
  glows and pieces arrive turned (one on street 2, up to three on street 3).
  Less time per piece (3.0 s, 3.6 s on street 3); Gamer gets 15% less time,
  and each city after the first three 3% less (at most 15%).
- Gamer mode deals more monument pieces on streets 2 and 3 (up to +30% and
  +50%): attached detail comes off as its own piece, and tall or long
  pieces are cut in two. The finished monument looks the same.
- Moving hazards from street 2 (feedback: more going on): birds that swoop
  (roll under), a traffic officer stepping in from the kerb (change lane),
  a runaway suitcase (jump). An amber patch and a sound warn of each about
  2.4 s ahead; there is always a clear lane. About 3-4 a street in Newbie,
  8-9 in Gamer.

## History

| Version | Build | Date | City | Notes |
|---|---|---|---|---|
| 1.0 | 6 | Sept 2026 | NY, Paris, London, Rome | Launch |
| 1.1.0 | 10 | 26 Sept 2026 | San Francisco | Pieces on the run, monuments rebuilt, Game Center, versioned daily |
| 1.1.1 | 12 | 7 Oct 2026 | none | Race your own ghost (on/off in Settings, pause and run); roll stays above the road; Eiffel Tower as open ironwork; souvenirs sway to face the player; finished monuments turn to face the player; GPU memory leak fixed (each street kept a ~16 MB shadow map); app download about 3 MB smaller (unused icons no longer bundled) |
