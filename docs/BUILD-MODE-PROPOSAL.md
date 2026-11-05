# Build mode and on-device play summary — proposal

Status: **for Dan to approve before any code is written.** November 2026.

Tester feedback says the end-of-street monument puzzle is the best part of the game. This proposes a monuments-only Build mode inside CityRunner as a cheap experiment, plus an on-device play summary so testers can report how they actually spend their time. Section 2 assesses one way to get usage counts from real players without losing "Data Not Collected". Nothing in section 2 is to be built without a separate yes.

Builds on the piece-picking fix (`pieceAt()`, `parkScale()` in `src/puzzle/puzzle.js`), which is already on `main`.

---

## 1. Build mode

### What the player sees

- A **BUILD** button on the menu, beside the existing play controls.
- It opens a monument picker: cities as rows, each with its three monument thumbnails (`assets/monuments/*.png`, already rendered). Locked paid cities show the pack name and open the existing paywall on tap, the same quiet route the menu uses. No new offer screen, no extra prompts (PROPOSALS.md §4: show the offer once, no nagging).
- Tap a monument → the normal puzzle starts with **all pieces provided** (there is no run, so nothing is "missed on the street").
- On finishing: the existing win screen with the monument facts and scale card, plus the player's best time for that monument. Buttons: **Build another** (back to the picker) and **Menu**. No score, no RUN AGAIN, no NEXT STREET.
- On time-out: "Out of time — try again", same two buttons plus **Retry**.

### What is offered

Every monument in every city the player is *entitled* to: free cities always, paid cities when their pack (or Founder/Unlock) is owned, everything on the web build. The check is `isCityEntitled()` / `isLevelEntitled()` in `src/core/entitlements.js`; Build mode adds no lock logic of its own.

**Decision needed (1a): progression locks.** Today a free city's streets open in a chain by stars, and paid cities in a region chain (`chainPrev`). As briefed, Build mode ignores progression and shows every entitled monument at once — a new player could build the Eiffel Tower before running Paris. That matches "every monument the player can play" only if "can play" means entitled. Options:
- **A (recommended): entitlement only.** Simplest, and Build mode awards nothing, so it can't skip runner content. The runner's chain still gates the runs.
- B: also require the street to be unlocked in the runner. Keeps the runner as the way to discover monuments, but makes Build mode nearly empty for a new player.

### What Build mode must not do

Each of these is a line in `finishPuzzle()` / `settleRun()` today that Build mode skips:

| Today on a puzzle win | In Build mode |
|---|---|
| `save.stars[...]` raised | skipped — no progression |
| `settleRun()` → `submit(score)` to the local/remote leaderboard, ghosts, lifetime score | skipped — no score at all |
| Game Center score / achievements | skipped |
| `save.monumentsWon` +1 (drives the store rating prompt at 3, 10, 30) | **decision (1b)**: recommend counting it, since a player who enjoys building is a fair person to ask; the prompt is still StoreKit-limited |
| Souvenirs | none earned, none spent (no "fetch missing pieces", since none are missing) |

A best time per monument is the only thing kept. It is local, never submitted, and is not a score in `scores.js`, so `maxPlausibleScore()` and `supabase/schema.sql` are untouched.

### Rules inside the puzzle

- Uses the player's current mode (Newbie / Gamer) for clock speed and glow hints, so Newbie stays easier. **Tap-to-place stays where it is today** (Newbie, street 1 of New York, Paris, London) — no new rule.
- No determinism impact: the puzzle has no seeded course, and Build mode generates nothing a ghost or daily replays. `COURSE_VERSION` and `DAILY.version` do not change.

### How it is built (reuse, not new machinery)

- `startPuzzle()` already takes `collected: lastRunPieces` — passing `null` with a "build mode" flag deals every piece. The tester build's **Build the monument** button (TESTER block at the end of `src/main.js`) is already this flow: set `cityIdx`, `level`, `dailyMode = false`, `lastRunPieces = null`, call `startPuzzle()`.
- One module-level flag, `buildMode`, read in `startPuzzle()` (hud label, hints) and `finishPuzzle()` (the table above), and cleared in the same places `dailyMode` is cleared.
- The picker is a new screen in `index.html`, styled like the city list.
- Android back button: `handleBack()` maps the puzzle → picker → menu.
- Files touched: `src/main.js`, `index.html`, CSS, `src/core/storage-keys.js`. **Not** touched: `src/puzzle/puzzle.js`, `src/run/track.js`, `src/core/engine.js`, `src/core/input.js` (Android performance work is happening there in another branch).

### Tests

- New `test/build-mode.mjs`: picker lists exactly the entitled cities (free build vs paid-locked vs owned pack); a Build mode win leaves `save.stars`, the score store, lifetime score and ghosts unchanged; best time is written and only improves; Back returns to the picker.
- Existing gates that must stay green: `menu-fit` (a new menu button is the classic overflow risk on small iPhones), `storage-keys`, `release-build`, `memory` (picker → puzzle → picker repeatedly must not climb textures).

---

## 1.5 On-device play summary (Settings)

A small block at the foot of Settings, next to the graphics readout testers already screenshot:

```
Your play (this device only)
Runs played        42   ·  1 h 05 min
Monuments built    17   ·    38 min   (Build mode: 9 · 21 min)
```

- Counted locally: runs started, monuments completed (runner and Build mode separately), and active minutes in each (time with the run or puzzle on screen and not paused).
- **Nothing leaves the phone.** No network call, no new identifier. It is read by a tester taking a screenshot.
- Stored under one new key, `cityrunner2.playstats`, in **`ERASED_KEYS`** (it is about the player, and "Erase my data" promises progress goes). Best times per monument live in the same key. `test/storage-keys.mjs` enforces the choice.
- Shown to every player, not just the tester build: it is useful to a parent wondering how long a child plays, and it is plain counts, no streaks or "keep it up" nudges (Children's Code: no engagement-pushing techniques).
- Privacy label: unchanged. Data that never leaves the device is not "collected" under Apple's or Google's definitions; this matches how the local scores and ghosts are treated today (COMPLIANCE.md §2.1).

**Decision needed (1c):** show it to everyone (recommended) or tester build only.

---

## 2. Usage counts from real players — assessment only

Goal: know, across real players and not just testers, whether people use Build mode and how it compares with running. Constraint: no analytics, no third-party SDK, "Data Not Collected" stays (COMPLIANCE.md §4).

### Candidate: two weekly recurring Game Center leaderboards

- "Monuments built this week" and "Runs this week", each a recurring leaderboard that resets weekly. The app submits the player's running weekly count to each.
- A **tester-build-only** readout calls `loadEntries` and shows the player count Apple returns for the current week of each board. That gives "N players built a monument this week" vs "M players ran this week".
- Apple holds the data; the app sends nothing to our servers. Game Center is already integrated on iOS (`ios/App/App/GameCenterPlugin.swift`), so no new SDK.

### GameKit facts

Read from Apple's GameKit reference and App Store Connect help, 5 November 2026:

- **Recurring leaderboards exist** (`GKLeaderboard.LeaderboardType.recurring`: "allowing players a fresh start … in each occurrence"), configured in App Store Connect with a start date, duration and restart interval. iOS 14 and later. Confirmed.
- **`loadEntries(for:timeScope:range:)` returns `totalPlayerCount`**: "the total number of players whose scores match the `playerScope` and `timeScope` parameters, but not the `range` parameter." Confirmed. For recurring boards `timeScope` must be `allTime`.
- **Not confirmed:** that a recurring board's `totalPlayerCount` covers only the current occurrence (the docs do not say), and the allowed recurrence range (a summary said 5 minutes to 30 days; not seen verbatim). Both should be checked with a sandbox board on a device before anything relies on them. Past occurrences are reachable via `previousOccurrence`, so week-on-week comparison is possible if the count is per occurrence.
- **Not confirmed:** how Screen Time / child-account Game Center restrictions affect leaderboard submission. Nothing found in Apple's docs; treat children as under-counted.

### Limits, stated plainly

- **iOS only.** Android has no Play Games integration, deliberately (COMPLIANCE.md §1.2: it is a Google SDK that sends play data to Google and would change the Data safety answers). Android usage stays invisible to this.
- **Only players signed into Game Center.** Many aren't; children's accounts may have Game Center limited by Screen Time or parental settings. The sample is skewed towards older players and iOS enthusiasts.
- **Counts players, not sessions.** A board tells you how many players posted a score this week, and each player's weekly total. It does not tell you minutes, sessions, drop-off points or retention.
- **Players see these boards.** Leaderboards are visible in the Game Center dashboard unless hidden. A "Runs this week" board reads as a grind-ranking, which sits badly with the Children's Code (rewarding volume of play). They would need to be hidden from players, or framed so that ranking by play volume is not presented as an achievement — see "Children's Code" below.

### Privacy label implications

Apple's privacy-details guidance: "You are not responsible for disclosing data collected by Apple." It also says: "If you collect data about your app from Apple frameworks or services, you should indicate what data you collect and how you use it." Game Center is not named, so applying this to Game Center is an inference.

The plain reading for CityRunner:
- Submitting the existing score boards today is already treated as not collected by us, because Apple holds it and we never retrieve per-player data into our own systems.
- **The tester readout changes the purpose.** These two boards exist to measure usage, which is Analytics in Apple's terms, and the app (in the tester build) reads the counts back. COMPLIANCE.md §2.1 already takes the strict line that data kept "to improve the game" is analytics "whether or not an SDK is involved". By that standard the honest position is that the label stays "Data Not Collected" only if the counts are read by Dan in a tester build and never stored, sent or combined anywhere else — and that reasoning should be written into COMPLIANCE.md §2.1 before shipping, not assumed.
- If in doubt, the conservative label change is "Data Not Linked to You → Usage Data → Analytics". That would end "Data Not Collected", which is the thing this whole idea is meant to protect, so the doubt counts against it.

### Children's Code

A leaderboard that ranks players by how much they play is an engagement nudge, which PROPOSALS.md §4 and the AADC standards in COMPLIANCE.md §1.5 steer away from. If built, the boards should not be promoted in the game UI, and should be hidden from the Game Center dashboard if Apple allows it for the board type; if Apple does not, this is a reason to prefer the store-level signals below.

### Recommendation

Do the store-level signals first; they need no app change and carry no privacy question:

- **App Store Connect and Play Console retention** (day 1/7/28) and sessions-per-active-device, before vs after the Build mode release. Both are aggregated by the stores from opted-in users and are already available.
- **Pack sales** before vs after.
- **Watch a few families play**, with the Settings play summary as the shared record.

Add the Game Center boards only if those leave the question open, and only after COMPLIANCE.md §2.1 is revised and the open points above are settled.

---

## Decisions for Dan

1. Approve Build mode as described (section 1)?
   - 1a. Entitlement only, ignoring progression locks (recommended), or also require the street unlocked?
   - 1b. Count Build mode wins towards the rating prompt (recommended)?
   - 1c. Play summary for everyone (recommended) or tester build only?
2. Game Center usage boards: park for now (recommended), pending store-level signals?
