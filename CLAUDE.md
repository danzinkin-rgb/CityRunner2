# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An endless runner through New York, Paris, London and Rome, built on Three.js. Each city has three streets; each street ends in a 60-second monument-rebuilding puzzle. All geometry, textures and audio are generated procedurally at runtime — the repo ships no art or audio assets. It runs as a web page and, via Capacitor, as an iOS app.

## Commands

```bash
npm test              # all 11 gates, serially — a failure stops the chain
npm run build         # vite build -> dist/
npm run ios:sync      # vite build && cap sync ios   (Mac)
npm run ios:open      # cap open ios                 (Mac)
npm run serve         # static server on :4173 for manual poking
```

Run one suite directly — every test file is standalone and starts its own server:

```bash
node test/menu-fit.mjs
```

Named shortcuts exist for a few: `test:ios`, `test:fit`, `test:determinism`, `test:coins`, `test:clearance`, `test:puzzle`.

Any suite accepts a base URL to run against something else: `node test/ios-ui.mjs http://host:1234`.

Two files in `test/` are **probes, not gates**, and are deliberately excluded from `npm test`: `test/difficulty.mjs` prints a table and asserts nothing, and `test/contact-sheet.mjs` (`npm run review`) renders every fact page for proofreading. `test/menu-budget.mjs` is likewise diagnostic — it prints the menu's per-child height budget so breakpoints get chosen by measurement. `npm run shots:store` generates App Store screenshots.

## The dual-deployment split — read before touching the build

**The repo root is directly servable.** GitHub Pages, `npm run serve` and every test suite load `src/*.js` as raw ES modules with no build step. `vite build` exists only to produce `dist/` for the native app and hosted deploys. Two consequences that bite:

- `vite.config.js` sets `base: './'` and `publicDir: false` — assets live at the repo root so the unbundled deployment keeps working, and are copied into `dist/` by a plugin after the build. Absolute asset paths break both Capacitor (`capacitor://localhost`) and Pages (`/CityRunner2/`).
- `package.json` says `"type": "commonjs"`, but browser code is ES modules loaded via `<script type="module">` and tests are `.mjs`. Don't "fix" this.

**`src/core/debug.js` is the seam that makes it safe.** `DEBUG_HOOKS = !import.meta.env?.PROD` resolves to `false` in a Vite bundle and `true` when the same file is served raw (where `import.meta.env` is undefined — hence the `?.`). Behind that gate are query-string entry points the suites depend on and a player build must never have: `?view=`/`?ui=`/`?built=` jump straight to a screen or a finished monument, `?god=1` disables collisions, `?ui=` writes a fabricated best score into the in-memory save, and `window.__cr` exposes live handles to the run, the score session and the continue flow.

Two rules follow. Never replace the `?.` with a build-time define like `__DEBUG__` — the identifier won't exist when the file is served raw and every suite dies with a ReferenceError. Never move a declaration that non-debug code reads inside an `if (DEBUG_HOOKS)` block; `GOD` in `src/main.js` is the live example, read by the collision path every frame, so the *value* is gated and the declaration stays at module scope. `test/release-build.mjs` is the proof this holds: it is the only suite that looks at `dist/`, and it builds first rather than trusting whatever is sitting there.

## Architecture

`src/main.js` (~1250 lines) is the orchestrator: DOM wiring, screen/overlay state, the save file, and the run/puzzle lifecycle. Most other modules are leaves it calls into.

**Determinism is a hard requirement, not a nicety.** The daily challenge needs every player worldwide on an identical course, and server-side score verification needs the server to reproduce a run from its seed. So every *gameplay* draw — obstacle lane, kind, spacing, collectible placement — must come from the seeded stream in `src/core/rng.js` (mulberry32 + FNV-1a, UTC-keyed daily seed). Purely cosmetic randomness (which windows are lit, paint noise in `src/cities/builders.js`) may use `Math.random()`. `test/determinism.mjs` gates this.

**`src/cities/themes.js` drives everything visual.** A city entry plus a per-street `levels` override is merged by `resolveStreet(city, level)`; sky, fog, palette, facades, props, vehicles and puzzle landmarks all flow from that one table. `builders.js` turns it into geometry, caching shared geometries in `SHARED_GEO` because `track.js` recycles chunks and would otherwise dispose geometry it doesn't own.

**`src/core/entitlements.js` is the single source of truth for what is locked.** Two independent locks: *progression* (earned by stars, predates any purchase) and *entitlement* (bought, iOS only, always open on the web build). They are reported separately so the UI can say the true thing — "keep playing to unlock" on a city no amount of playing will open is the kind of dark pattern the Children's Code targets. `GRANTS_EVERYTHING` is a product set, deliberately not a list of city ids, because the Founder promise covers cities nobody has designed yet. There is deliberately **no launch-date constant anywhere** — the sale window is closed by removing the product in App Store Connect, because a device clock is user-settable and a baked-in cutoff would eventually offer an unbuyable product with no fix short of an app update.

**`src/core/storage-keys.js` owns every `localStorage` key**, and each key must appear in exactly one of `ERASED_KEYS` or `KEPT_KEYS`. Adding a key without choosing fails `test/storage-keys.mjs`. The split is a product decision documented in that file: the entitlement cache and audio prefs deliberately survive "Erase my data".

**Scores are untrustworthy by construction.** `src/core/scores.js` runs on the player's device; its bounds raise the cost of casual cheating and are not a control. A remote leaderboard is a new security boundary, not a storage driver — every check must be repeated server-side (`supabase/schema.sql`, `docs/COMPLIANCE.md` §4).

**Native integration** goes through `src/core/native.js`, which no-ops when `isNative()` is false, so nothing in `src/` needs a platform branch. `ios/App/App/GameCenterPlugin.swift` is hand-rolled with no pod and is registered by hand in `BridgeViewController.swift` — Capacitor 7 only auto-registers plugins shipped as real npm packages. `src/core/iap.js` wraps `cordova-plugin-purchase`, which exists only inside the native WebView, so **nothing in that file is exercisable by `npm test`** — changes there are verified by reading and by sandbox testing on a device.

## Constraints that are not negotiable

- **No third-party SDKs** (`docs/COMPLIANCE.md` §4). No analytics, crash reporting, ads or social login. This is what keeps the App Store "Data Not Collected" label true on a 4+ title. It is also why `iap.js` uses no receipt validator: configuring one would send purchase and device data to that validator's servers.
- **The Supabase service-role key must never appear** in client code or any committed file. The anon key is public by design; security rests on RLS policies.
- The web build (GitHub Pages) stays completely free and completely unlocked.

## Testing philosophy

Most suites exist because a specific bug shipped, and each one's header comment explains the failure it guards — read it before changing the suite. `test/serve.mjs` gives each run its own server on port 0 so suites can't race or connect to a stale one.

Two known fidelity limits, both stated in the suites themselves: headless WebKit resolves `env(safe-area-inset-*)` to **0**, so `test/menu-fit.mjs` emulates notch insets explicitly — without that, every measurement assumes ~93px more height than a real iPhone has, which is exactly how a menu-overflow bug shipped past a green suite. And Safari's collapsing toolbars, Apple emoji glyphs and iOS audio autoplay rules can only be checked on a real device.

## Docs

`docs/` carries the reasoning behind most of the above. `COMPLIANCE.md` is authoritative on privacy, security and competitor-naming; `FREEMIUM-IAP.md` on the purchase model; `LAUNCH-CHECKLIST.md` and `APPSTORE-SUBMISSION.md` on release state; `PROPOSALS.md` §4 on the Children's Code constraints the paywall is built to.
