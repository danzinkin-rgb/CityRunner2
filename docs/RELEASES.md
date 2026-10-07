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

| Order | City | Status |
|---|---|---|
| 1 | Jerusalem | Built; facts approved; needs its Game Center items |
| 2 | Mexico City | Built; facts approved; needs its Game Center items |

Kyoto is parked (`docs/CITY-ROADMAP.md`).

## Next release: what is waiting

Nothing yet since 1.1.1.

## History

| Version | Build | Date | City | Notes |
|---|---|---|---|---|
| 1.0 | 6 | Sept 2026 | NY, Paris, London, Rome | Launch |
| 1.1.0 | 10 | 26 Sept 2026 | San Francisco | Pieces on the run, monuments rebuilt, Game Center, versioned daily |
| 1.1.1 | 11 | Oct 2026 | none | Race your own ghost (on/off in Settings, pause and run); roll stays above the road; Eiffel Tower as open ironwork; souvenirs sway to face the player; finished monuments turn to face the player |
