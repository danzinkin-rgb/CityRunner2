# CityRunner Code Review

Review scope: application runtime, persistence, score handling, release build, and test coverage. No source or test code was changed.

## Findings

### High: Data erasure does not erase all locally held user state

**Location:** [src/core/identity.js](src/core/identity.js#L78-L83)

`eraseAllData()` removes the identity, progress, and local scores, but it does not remove the entitlement cache (`cityrunner2.ent`) or audio preferences (`cityrunner2.audio`). The entitlement cache represents purchase state and is explicitly persisted by [src/core/entitlements.js](src/core/entitlements.js#L112-L123); audio preferences are persisted by [src/core/audio.js](src/core/audio.js#L4-L13).

This makes the in-app "erase my data" action incomplete relative to its confirmation text and the compliance documentation's claim that the control erases all locally held data. It also leaves the module-level entitlement set loaded for the current page, so erasure does not immediately clear paid access even if the cache key were removed.

**Recommendation:** define the complete set of locally stored keys in one deletion boundary, including entitlement and preference state where the product meaningfully treats those as user data. Reset in-memory caches as part of the same operation, or require a controlled reload after deletion.

### High: Production code ships privileged debug controls

**Location:** [src/main.js](src/main.js#L996-L1070)

The runtime always parses `view`, `ui`, `god`, `seed`, and related query parameters, and exposes `window.__cr` with live game objects and control functions. The `god` parameter disables collision handling, while the exposed object includes `crash`, `acceptContinue`, `declineContinue`, and mutable session access. Static inspection of the existing build also found this logic in `dist/assets/index-xUxlbL7Y.js`.

Although the comments call this test-only, there is no build-time or environment guard around it. A shipped web or native bundle can therefore be driven through non-player paths, and the same public runtime contains the controls needed to manipulate score/session behavior. This is a release-boundary problem, not merely an internal testing convenience.

**Recommendation:** isolate test hooks in a test-only entry point or compile them out of production builds. At minimum, gate both query handling and `window.__cr` behind an explicit development/test build flag, and ensure release builds cannot enable `god` mode.

### High: Local score validation cannot provide a trustworthy leaderboard

**Location:** [src/core/scores.js](src/core/scores.js#L39-L70)

`startSession()`, `currentSession()`, and `submit()` are exported to the page's JavaScript context. `currentSession()` returns the live mutable session object, so a console caller can backdate `startedAt`, choose arbitrary mode/city/level/seed values via `startSession()`, and submit any score within the deliberately generous client-side bound. The source documentation acknowledges this limitation, but the architecture still presents the local result as a leaderboard entry.

This is acceptable for a purely local personal board, but it is not an adequate foundation for a public or competitive leaderboard. The planned Supabase path cannot be treated as a configuration-only swap: the server must independently authenticate the player/session, validate the run context and score, enforce uniqueness, and reject client-supplied identity or entitlement claims.

**Recommendation:** keep local scores explicitly local, or treat the remote leaderboard as a separate security boundary with server-issued sessions and server-side verification. Do not rely on exported client session state as an integrity control.

### Medium: A failed score write consumes the one submission and loses the score

**Location:** [src/core/scores.js](src/core/scores.js#L69-L99)

`submit()` sets `session.submitted = true` before calling `record()`. `writeAll()` catches and discards `localStorage.setItem()` failures, including quota and private-storage failures. The result is returned as successful even when the entry was not persisted, and the runtime submission path does not surface or retry that failure.

Under storage pressure or a restricted WebView, the player can finish a run, receive no durable leaderboard entry, and be unable to submit again in that session. This conflicts with the stated "never throws" behavior: avoiding an exception is good, but silently reporting success after a failed write is data loss.

**Recommendation:** have persistence return success/failure, set `submitted` only after a confirmed write, and make the caller handle a failed persistence result without interrupting the run. If retry semantics are undesirable, report the failure clearly and preserve the entry for a later retry.

## Test and release observations

- The declared `npm test` chain is useful and covers several high-value gameplay invariants, but it is serial `&&` execution: later suites do not run after an earlier failure. `test/difficulty.mjs` is a non-gating probe, and no automated test currently covers the complete erase-key set, release exclusion of debug hooks, or storage-write failure behavior.
- The repository documents Game Center, server leaderboards, and several App Store requirements as future or incomplete work. Those are release-readiness gaps rather than defects in the current offline game, but the current score module should not be promoted to a remotely trusted leaderboard without the server-side boundary described above.
- Static editor/source inspection found no syntax or type diagnostics in the reviewed JavaScript/configuration surfaces. `npm test` and `npm run build` could not be executed in this review session because terminal execution was unavailable; the report therefore does not claim a runtime test pass.

## Overall assessment

The code has strong local documentation and unusually targeted gameplay tests. The main quality concern is boundary discipline: deletion, production/test separation, persistence success, and leaderboard trust are each described thoughtfully but are not fully enforced by the implementation. Those boundaries should be closed before treating the app as production-ready or connecting it to a public scoring backend.