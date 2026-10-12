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

## History

| Version | Build | Date | City | Notes |
|---|---|---|---|---|
| 1.0 | 6 | Sept 2026 | NY, Paris, London, Rome | Launch |
| 1.1.0 | 10 | 26 Sept 2026 | San Francisco | Pieces on the run, monuments rebuilt, Game Center, versioned daily |
| 1.1.1 | 12 | 7 Oct 2026 | none | Race your own ghost (on/off in Settings, pause and run); roll stays above the road; Eiffel Tower as open ironwork; souvenirs sway to face the player; finished monuments turn to face the player; GPU memory leak fixed (each street kept a ~16 MB shadow map); app download about 3 MB smaller (unused icons no longer bundled) |
