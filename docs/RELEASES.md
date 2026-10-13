# Releases

How CityRunner ships. Agreed with Dan, 2 October 2026.

## The rule

- **Fixes and improvements** go out in whatever release comes next.
- **New cities go out one at a time.** A finished city waits in the release
  queue until its release, so cities can be built ahead and released on a
  steady rhythm (weekly or monthly).

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

1. **Decide what ships.** Everything in `main`, plus at most one city from the
   front of the queue.
2. **Release the city** (if any): remove it from `RELEASE_QUEUE`.
3. **Version**: bump `VERSION` in `src/main.js`, `version` in `package.json`,
   and `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in
   `ios/App/App.xcodeproj/project.pbxproj`. A city release is a minor
   version (1.2.0); fixes only, a patch (1.1.1). The build number always
   goes up.
4. **For a new city**, in App Store Connect before submitting: create its
   Game Center leaderboard (`uk.co.zinkin.cityrunner.leaderboard.<id>`) and
   achievement (`...achievement.city.<id>`) and add both for review; add it
   to the description; add its screenshots if it should be in them. It is
   paid (not in `FREE_CITIES`), so the Founder and unlock purchases already
   cover it.
5. **Daily challenge**: a new city stays out of the daily until a release
   chooses to add it, which needs a new `DAILY.version` and a matching daily
   leaderboard (see `src/core/rng.js`).
6. **Test**: `npm test` green, then a tester build on the phone.
7. **Ship**: on the Mac, `git pull`, `npm run ios:sync` (the plain sync, not
   the tester one), archive, upload, submit. Tag the release commit
   (`git tag v1.2.0`) and push the tag.

## Queue

| Order | City | Region | Status | Game Center items to create |
|---|---|---|---|---|
| 1 | Jerusalem | Middle East and Africa | Built; facts approved | `…leaderboard.jerusalem`, `…achievement.city.jerusalem` |
| 2 | Mexico City | Latin America | Built; facts approved | `…leaderboard.mexico`, `…achievement.city.mexico` |
| 3 | Marrakech | Middle East and Africa | Built; facts approved (`docs/MARRAKECH-FACTS-DRAFT.md`) | `…leaderboard.marrakech`, `…achievement.city.marrakech` |
| 4 | Delhi | Asia | Built; facts approved (`docs/DELHI-FACTS-DRAFT.md`) | `…leaderboard.delhi`, `…achievement.city.delhi` |
| 5 | Bangkok | Asia | Built; facts approved (`docs/BANGKOK-FACTS-DRAFT.md`) | `…leaderboard.bangkok`, `…achievement.city.bangkok` |
| 6 | Cape Town | Middle East and Africa | Built; facts approved (`docs/CAPE-TOWN-FACTS-DRAFT.md`) | `…leaderboard.capetown`, `…achievement.city.capetown` |
| 7 | Hanoi | Asia | Built; facts approved (`docs/HANOI-FACTS-DRAFT.md`) | `…leaderboard.hanoi`, `…achievement.city.hanoi` |
| 8 | Seoul | Asia | Built; facts approved (`docs/SEOUL-FACTS-DRAFT.md`) | `…leaderboard.seoul`, `…achievement.city.seoul` |
| 9 | Zanzibar | Middle East and Africa | Built; facts approved (`docs/ZANZIBAR-FACTS-DRAFT.md`) | `…leaderboard.zanzibar`, `…achievement.city.zanzibar` |
| 10 | Samarkand | Asia | Built; facts approved (`docs/SAMARKAND-FACTS-DRAFT.md`) | `…leaderboard.samarkand`, `…achievement.city.samarkand` |
| 11 | Beijing | Asia | Built; facts approved (`docs/BEIJING-FACTS-DRAFT.md`) | `…leaderboard.beijing`, `…achievement.city.beijing` |
| 12 | Havana | Latin America | Built; facts approved (`docs/HAVANA-FACTS-DRAFT.md`) | `…leaderboard.havana`, `…achievement.city.havana` |
| 13 | Istanbul | Europe | Built; facts approved (`docs/ISTANBUL-FACTS-DRAFT.md`) | `…leaderboard.istanbul`, `…achievement.city.istanbul` |
| 14 | Chicago | North America | Built; facts approved (`docs/CHICAGO-FACTS-DRAFT.md`) | `…leaderboard.chicago`, `…achievement.city.chicago` |
| 15 | Buenos Aires | Latin America | Built; facts approved (`docs/BUENOS-AIRES-FACTS-DRAFT.md`) | `…leaderboard.buenosaires`, `…achievement.city.buenosaires` |

`…` is `uk.co.zinkin.cityrunner`. Each city's own move (the "Rome Vespa" of
that city) is listed in `docs/CITY-ROADMAP.md`. Every city after Mexico
City needs Dan's sign-off on its facts draft before it ships; each draft
lists what is left to check.

Kyoto is parked (`docs/CITY-ROADMAP.md`).

## Next release: what is waiting

Since 1.1.1:

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
