# CityRunner — Launch Checklist

**Source of truth for App Store readiness. Last updated 23 August 2026.**
Status of every element a submitted game is normally expected to have.

Legend: **DONE** · **PARTIAL** · **TODO** · *n/a*

---

## Executive summary

The game itself is complete and good. What is missing is almost entirely the **shell around the game** — the screens, settings and native integrations that reviewers and players treat as table stakes. There are 34 items below; **8 are done, 5 partial, 21 outstanding**.

Three of the outstanding items are genuine submission blockers (app icon set, screenshots, export-compliance declaration). Six more are Guideline 4.2 risk — without them a Capacitor build reads as a wrapped website and gets rejected. The rest are quality and retention.

**Suggested order:** Tranche A (player shell) → Tranche B (native/Apple) → Tranche C (production hardening). A is mostly UI over services that already exist, so it moves fast.

---

## Tranche A — the player shell

*What makes it feel like a finished product rather than a prototype.*

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | How to play / help screen | **DONE** | Persistent help screen exists: `#screen-help` in index.html with controls guide |
| 2 | Settings screen | **DONE** | Settings screen exists: `#screen-settings` in index.html |
| 3 | Music / SFX toggles + volume | **TODO** | Procedural audio exists (`core/audio.js`) with no user control. Expected in every mobile game |
| 4 | Leaderboard screen | **DONE** | Service and UI complete: `#screen-scores` in index.html displays leaderboard |
| 5 | Daily challenge | **PARTIAL** | Seeded RNG built and verified (`core/rng.js`, UTC-stable). **Not wired into the track** — needs `track.js` to draw from the seeded stream |
| 6 | Achievements | **TODO** | Nothing. Pairs with Game Center (#16) |
| 7 | Progression / rewards | **PARTIAL** | Stars unlock cities; souvenirs accumulate but **buy nothing**. Needs a spend sink (characters, boards, city unlocks) |
| 8 | First-run onboarding | **TODO** | New players get no guided first run |
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
| 16 | Game Center leaderboards + achievements | **TODO** | The single strongest 4.2 answer; also removes our own anti-cheat burden |
| 17 | Haptics | **DONE** | `hapticHeavy()` function implemented in src/core/native.js:75, wired into collisions in src/main.js:239 |
| 18 | iPad layout | **TODO** | Responsive CSS exists but is untested at tablet aspect |
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
| 27 | Build step (Vite) | **TODO** | Ships unminified ES modules plus a full Three.js build — wasteful over mobile data |
| 28 | Crash / error reporting | **TODO** | We currently have no idea when the game breaks on a real device. Sentry free tier suffices |
| 29 | Deterministic simulation wired in | **PARTIAL** | Module done; `track.js` still calls `Math.random()` for obstacle placement |
| 30 | Automated tests for logic | **PARTIAL** | `npm test` chains four suites: coin-arc reachability, road clearance across every city and level, iOS layout, determinism. `test/difficulty.mjs` exists but is deliberately NOT in the chain — it prints a table and asserts nothing, so it is a probe to run by hand, not a gate. `test/contact-sheet.mjs` (`npm run review`) is a second hand-run probe: it renders every street and monument fact page at two viewports and writes a contact sheet, so the whole corpus can be proofread without playing. Score bounds and save-migration are still unchecked |
| 31 | Loading screen | **TODO** | Brief black flash before first frame |
| 32 | Analytics | **DECIDED, not built** | No SDK, ever. Instead: run-outcome columns on our own score row, plus Apple's free App Analytics. Ships with the leaderboard. See PRODUCT-ROADMAP §7 |

## Tranche D — accessibility

*Apple weights this, and it is the right thing regardless.*

| # | Item | Status | Notes |
|---|---|---|---|
| 33 | Reduced-motion support | **DONE** | `prefers-reduced-motion: reduce` media query implemented in index.html:276, body.reduced-motion selectors on lines 131, 164 |
| 34 | VoiceOver labels / colour-contrast pass | **PARTIAL** | One `aria-label` on the pause button; menus otherwise unlabelled |
| 35 | Tap-control alternative to swipe | **TODO** | On-screen lane buttons for players who cannot swipe reliably |

---

## What is genuinely blocking submission

1. **App icon set + screenshots** (#14, #15) — cannot submit without them.
2. **Export compliance declaration** (#20) — trivial but mandatory.
3. **Guideline 4.2 substance** (#16, #17, #18) — a wrapper without native features is the most likely rejection reason.

Everything else is quality, retention or hygiene — and is what separates "it works" from "it's a product".
