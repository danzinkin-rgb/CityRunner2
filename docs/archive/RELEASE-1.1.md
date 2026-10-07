# Release 1.1.0 (build 10)

Everything on `main` as of 26 September 2026. `npm test` passes in full.

## In this release

- San Francisco: three streets (Lombard Street, Market Street, Haight-Ashbury)
  and three monuments (Golden Gate Bridge, Coit Tower, the Painted Ladies).
  Paid; included in the Founder and full-unlock purchases.
- Monument pieces are collected during the run; missed pieces arrive late in
  the build or can be brought with souvenirs.
- Monuments rebuilt with more detail. Building changes by street: tap on
  street 1, drag on street 2, drag with some pieces turned on street 3.
- The target monument is shown before each street.
- Rome: Vespas signal, then change lane.
- Fixes: the crash after several streets (GPU memory leak), sound not
  recovering after an interruption, the daily challenge giving stars and
  leading into NEXT LEVEL, Erase my data, several puzzle drag problems.
- The daily challenge is versioned (see `DAILY` in `src/core/rng.js`) and
  posts to a new Game Center leaderboard.

## App Store Connect — before submitting

### 1. Game Center: three new items

Copy the settings of the existing items of the same kind.

| Type | ID | Notes |
|---|---|---|
| Leaderboard (recurring, daily) | `uk.co.zinkin.cityrunner.leaderboard.daily.v2` | Replaces `...leaderboard.daily`. Same reset time (00:00 UTC) and sort as the old one. |
| Leaderboard (classic) | `uk.co.zinkin.cityrunner.leaderboard.sf` | San Francisco best run |
| Achievement | `uk.co.zinkin.cityrunner.achievement.city.sf` | All three San Francisco monuments |

Then add all three to the Game Center section of the 1.1.0 version page, or
they are not reviewed with it. Leave the old daily leaderboard as it is.

Check the wording of the "all monuments" achievement: if it says "all four
cities", it is now five.

### 2. Version 1.1.0

What's New:

```
New city: San Francisco. Run Lombard Street, Market Street and Haight-Ashbury, then rebuild the Golden Gate Bridge, Coit Tower and the Painted Ladies.

Collect each monument's pieces as you run. What you pick up is what you build with.

Every monument rebuilt in far more detail, and building gets harder street by street: tap, then drag, then turn pieces to fit.

See the monument you are running to before each street.

In Rome, watch the Vespas: they signal before they change lanes.

Fixes for a crash after playing several streets, and for sound not coming back after an interruption.
```

### 3. Description: lines that are now wrong

The description was written by hand, so only these lines change:

| Now | Change to |
|---|---|
| `...recreations of New York, London, Paris and Rome.` | `...recreations of New York, London, Paris, Rome and San Francisco.` |
| `...a 60-second puzzle mode asks you to tap scattered blocks into place and rebuild the monument — the Colosseum, the Eiffel Tower, Big Ben, the Brooklyn Bridge — before the clock runs out.` | `...a puzzle mode asks you to rebuild the monument from the pieces you collected on the way — the Colosseum, the Eiffel Tower, Big Ben, the Golden Gate Bridge — before the clock runs out.` |
| `...a Caesar bust in Rome —` | `...a Caesar bust in Rome, a cable car in San Francisco —` |
| `- No advertising, no third-party trackers, no in-app purchases` | `- No advertising and no third-party trackers. New York, Paris and London are free; one optional purchase unlocks every other city` |

The last one matters most: the Founder purchase is live, so "no in-app
purchases" is already inaccurate, which is a Guideline 2.3 rejection risk.

### 4. Screenshots

`npm run shots:store`, then review `test/shots/store/index.html`. Ten per
size; two new San Francisco shots. The menu shot shows the fifth city card
cut off at the right edge (the city row scrolls sideways); drop that shot if
it reads as a layout fault.

## On the Mac

```bash
cd ~/Claudelocal/CityRunner2
git checkout main && git pull
npm run ios:sync
```

`ios:sync`, not `ios:sync:tester`: the tester section must not ship.
`test/release-build.mjs` checks that a normal build carries none of it.

Then Xcode: Product → Archive, upload from the Organizer, and submit for
review in App Store Connect.
