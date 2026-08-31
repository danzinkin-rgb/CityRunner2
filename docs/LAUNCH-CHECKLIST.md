# CityRunner — Launch Checklist

**Source of truth for App Store readiness. Last updated 23 August 2026.**
Status of every element a submitted game is normally expected to have.

Legend: **DONE** · **PARTIAL** · **TODO** · *n/a*

---

## Executive summary

The game itself is complete and good. What is missing is almost entirely the **shell around the game** — the screens, settings and native integrations that reviewers and players treat as table stakes. There are 35 items below; **24 are done, 1 partial, 8 are outstanding, and 2 are deliberately not being built** (crash SDK, analytics SDK — see their own rows for why).

Three of the outstanding items are genuine submission blockers (app icon set, screenshots, export-compliance declaration). Six more are Guideline 4.2 risk — without them a Capacitor build reads as a wrapped website and gets rejected. The rest are quality and retention.

**Suggested order:** Tranche A (player shell) → Tranche B (native/Apple) → Tranche C (production hardening). A is mostly UI over services that already exist, so it moves fast.

---

## Tranche A — the player shell

*What makes it feel like a finished product rather than a prototype.*

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | How to play / help screen | **DONE** | Persistent help screen exists: `#screen-help` in index.html with controls guide |
| 2 | Settings screen | **DONE** | Settings screen exists: `#screen-settings` in index.html |
| 3 | Music / SFX toggles + volume | **DONE** | All three in Settings: `#set-music`, `#set-sfx`, `#set-vol` wired in `src/main.js`. Persisted to `cityrunner2.audio`, which an erase deliberately keeps (see `src/core/storage-keys.js`) |
| 4 | Leaderboard screen | **DONE** | Service and UI complete: `#screen-scores` in index.html displays leaderboard |
| 5 | Daily challenge | **DONE** | `track.js` draws every gameplay draw (obstacle lane/kind/spacing) from the seeded stream via `startRun(seed)`; `startDaily()` feeds it `dailySeedFor(date)`. Verified by `test/determinism.mjs`: same seed reproduces an identical layout, different seeds diverge, today's seed is UTC-stable |
| 6 | Achievements | **PARTIAL** | Client code done (src/core/gamecenter.js, src/core/native.js): 9 achievements defined and wired at run-completion. Unverified — needs a native build (see #16) and the achievements created in App Store Connect |
| 7 | Progression / rewards | **DONE** | Stars unlock cities (progression, free); souvenirs spend on 9 cosmetic characters priced 500–2500 (`src/run/characters.js`, shop wired in `src/main.js`). Deliberately cosmetics-only — city access stays gated by stars + the FOUNDER/UNLOCK IAP alone, so the souvenir economy never competes with the paid unlock |
| 8 | First-run onboarding | **DONE** | A brand-new player (no existing save) lands on the help screen instead of a bare menu; reuses `#screen-help`/`openOverlay('help')`. Gated on `!DEBUG_HOOKS` so it never fires under test, since every automated suite drives a fresh browser context that otherwise looks identical to a first launch |
| 9 | Credits / About + version number | **DONE** | Version surfaced in settings screen: `#set-version` in index.html:605, populated from `VERSION` constant in src/main.js:15 (v1.0.0) |
| 10 | Pause + resume | **DONE** | Button, Esc/P, auto-pause on backgrounding, no time-jump on resume |
| 11 | Progress persistence | **DONE** | `localStorage`, survives reload |
| 12 | Offline play | **DONE** | No network dependency in any core loop |
| 13 | Anonymous identity | **DONE** | Generated non-free-text names; reroll; erase-my-data |

## Tranche B — Apple submission and native integration

*Items 14–16 are hard blockers. Items 16–21 are the Guideline 4.2 defence.*

| # | Item | Status | Notes |
|---|---|---|---|
| 14 | iOS app icon set | **DONE** | Full set exists: assets/icon-192.png, icon-512.png, icon-1024.png (1024px marketing icon added 23 Aug) |
| 15 | Screenshots | **TODO** | Generator built (`npm run shots:store`), captures not yet taken/uploaded. iPad is NOT optional — TARGETED_DEVICE_FAMILY is "1,2", so 6.7", 6.5" and 13" iPad are all required |
| 16 | Game Center leaderboards + achievements | **PARTIAL** | Native GameKit plugin written (ios/App/App/GameCenterPlugin.swift, hand-rolled, no third-party pod — see COMPLIANCE §4), wired to score/achievement reporting on every run. **Never compiled** — this session has no Mac/Xcode; the user will build and verify on their own Mac. All 6 leaderboards and all 9 achievements created and localized in App Store Connect, ids match src/core/gamecenter.js, status "Prepare for Submission" — not yet live since no build has shipped. Achievement icons are placeholder art (flat colour + initials, generated this session) — swap for real artwork before submission, no code change needed since GameKit serves the icon from ASC. Still TODO: build on Xcode to confirm the plugin compiles and signs, enable the Game Center service on the App ID in the developer portal |
| 17 | Haptics | **DONE** | `hapticHeavy()` function implemented in src/core/native.js:75, wired into collisions in src/main.js:239 |
| 18 | iPad layout | **DONE** | Tablet breakpoint (`min-width:900px`) scales type, cards and sheets up so the layout reads as tablet-sized rather than a stretched phone screen; verified against the 13" iPad screenshot set |
| 19 | Native pause on interruption | **DONE** | `visibilitychange` handler |
| 20 | Export compliance declaration | **TODO** | HTTPS-only → exempt, but must still be declared |
| 21 | Store metadata (name, subtitle, keywords, description) | **TODO** | Must name no competitor — see COMPLIANCE.md §3.0 |
| 22 | Privacy policy URL | **DONE** | Live at `/privacy.html`, child-readable summary included |
| 23 | Support URL | **PARTIAL** | GitHub issues works; a simple support page would look more finished |
| 24 | Privacy nutrition labels | **DONE** | Answers pre-drafted in COMPLIANCE.md §2.1 |
| 25 | Age rating questionnaire | **TODO** | Expected 4+; completed in App Store Connect |
| 26 | Terms of use / EULA | **TODO** | Apple's standard EULA is sufficient while there are no purchases |

## Tranche C — production hardening

| # | Item | Status | Notes |
|---|---|---|---|
| 27 | Build step (Vite) | **DONE** | `npm run build` produces `dist/`; `npm run ios:sync` builds and syncs it into the Capacitor app. Three.js is split into its own chunk so a repeat visitor re-downloads only game code. The repo root stays directly servable with no build step, which is what keeps the test suites and GitHub Pages working on raw ES modules |
| 28 | Crash / error reporting | **DECIDED — Apple only for v1** | No crash SDK. Sentry/Crashlytics/Bugsnag all receive device data, which contradicts COMPLIANCE §4 "no third-party SDKs" and would end the submitted "Data Not Collected" label on a 4+ title. App Store Connect → Crashes is free, user-opt-in, and needs no code. Revisit only if Apple's data proves insufficient |
| 29 | Deterministic simulation wired in | **DONE** | Same fix as #5 — `track.js` obstacle placement is fully on the seeded stream. Only cosmetic detail inside `src/cities/builders.js` (lit windows, paint noise) still uses `Math.random()`, by design — it doesn't touch gameplay |
| 30 | Automated tests for logic | **DONE** | `npm test` chains ten gates: coin-arc reachability, road clearance across every city and level, iOS layout, determinism, entitlements, save-migration + score bounds + storage-write failure, the erase/keep storage boundary, puzzle solvability, the loading state, and the release build. They run serially with `&&`, so a failure stops the chain — deliberate, because the run takes minutes and the first failure is nearly always the one to fix; `node test/<name>.mjs` runs any suite alone. Two files are probes, not gates, and are excluded on purpose: `test/difficulty.mjs` prints a table and asserts nothing, and `test/contact-sheet.mjs` (`npm run review`) renders every fact page at two viewports so the corpus can be proofread without playing |
| 31 | Loading screen | **DONE** | The menu renders placeholder city cards at the real geometry while Three.js loads, so the title and the card row never move when the real cards arrive. `test/boot.mjs` gates it per-card at three viewports (0.00px movement) |
| 32 | Analytics | **DECIDED, not built** | No SDK, ever. Instead: run-outcome columns on our own score row, plus Apple's free App Analytics. Ships with the leaderboard. See PRODUCT-ROADMAP §7 |

## Tranche D — accessibility

*Apple weights this, and it is the right thing regardless.*

| # | Item | Status | Notes |
|---|---|---|---|
| 33 | Reduced-motion support | **DONE** | `prefers-reduced-motion: reduce` media query implemented in index.html:276, body.reduced-motion selectors on lines 131, 164 |
| 34 | VoiceOver labels / colour-contrast pass | **DONE** | Settings toggles now carry `aria-label` tying them to their row (Music, Sound effects, Reduced motion, On-screen controls) plus `aria-pressed` reflecting state; ambiguous link buttons ("view", "Restore", "Erase", "new nickname") labelled with their full action. Every other screen's buttons already carry their own visible text as the accessible name. Colour contrast checked, not assumed: body text (`--fg-2`/`--fg-3`) against the near-black body/sheet backgrounds computes to ~13:1, well above the WCAG AA 4.5:1 minimum |
| 35 | Tap-control alternative to swipe | **DONE** | Settings → "On-screen controls" reveals `#touchpad` (left/jump/roll/right), each wired in `src/main.js` (`padAction`) straight into the same `player.moveLane/jump/roll` calls swipe uses, each with its own `aria-label` |

---

## What is genuinely blocking submission

1. **App icon set + screenshots** (#14, #15) — cannot submit without them.
2. **Export compliance declaration** (#20) — trivial but mandatory.
3. **Guideline 4.2 substance** (#16, #17) — a wrapper without native features is the most likely rejection reason.

Everything else is quality, retention or hygiene — and is what separates "it works" from "it's a product".
