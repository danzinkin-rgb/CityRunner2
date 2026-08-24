# Response to CODE-REVIEW.md

Every finding was checked against the code. Three were fixed, one was answered
in documentation rather than in code, and the test observations were acted on.
`npm test` passes end to end (ten gates, exit 0) after the changes.

| # | Finding | Verdict | Outcome |
|---|---|---|---|
| 1 | Erasure does not cover all local state | **Valid in substance, overstated in one detail** | Fixed — one declared key registry, plus a gate |
| 2 | Production ships privileged debug controls | **Valid** | Fixed — compiled out of the build, and proved by a gate |
| 3 | Local score validation cannot back a real leaderboard | **Valid, and already known** | No code change; the file's own header was corrected where it undercut the point |
| 4 | A failed write consumes the one submission | **Valid** | Fixed — write success is now reported and the session stays open |

---

## 1 — Data erasure (High)

**Correct that the key set was fragile. Not correct that the confirmation text
was being contradicted.**

The confirm dialog says *"Erase your nickname, progress and scores from this
device?"* — three things — and the code removed exactly those three.
`docs/COMPLIANCE.md` §1.2 likewise lists only the UUID, the display name and
scores/progress as retained "until user erases". So the erase route matched
what it promised.

The real defect is the one underneath: the five keys were string literals
scattered across five modules, and `eraseAllData()` re-typed three of them a
second time. A sixth key added anywhere would have been missed in silence — no
exception, no failing test, no symptom.

**Fixed** by declaring the keys once, in `src/core/storage-keys.js`, with the
erase/keep decision and its reason recorded next to each key. Every module now
imports its key from there; none spells one itself.

**The two keys stay kept, on purpose:**

- `cityrunner2.ent` is a cache of Apple's receipt, not a record we hold. Apple's
  copy is authoritative and survives an app delete, so clearing ours cannot
  un-buy anything — it would only show a paying player a paywall the instant
  they erase, which reads as the erase having taken their purchase away.
- `cityrunner2.audio` is a device setting (music, sfx, volume). It says nothing
  about who is playing, it is not named in the confirmation text, and silently
  un-muting a game somebody deliberately muted is a defect, not a privacy win.

The review's second half — "leaves the module-level entitlement set loaded" —
follows from wiping the entitlement key, which we are not doing. The in-memory
concern that *does* apply is the identity cache, which was already dropped and
is now asserted.

Both exclusions are now stated where a player and an auditor would each look:
`privacy.html` under Your rights, and a new table in `docs/COMPLIANCE.md` §1.2.

**Gate:** `test/storage-keys.mjs`, in three layers, because no single one is
sufficient.

- A static scan of `src/` fails if any module outside the registry writes a
  `cityrunner2*` key literal. This is the only layer that can catch a key in a
  module the suite never loads — the exact case that worries us.
- The declared lists are pinned to spelled-out strings, so the check cannot
  confirm itself from the module under test.
- The behaviour is driven through the real Settings → Erase button, confirm
  dialog and all, and asserts the kept keys as firmly as the erased ones.

One thing the gate documents that is easy to misread: *erased* means "holds
nothing of the old player", not "absent". The save is rewritten blank
immediately (the running game holds that object, and the next `persist()` would
otherwise put the old progress back), and re-rendering Settings mints a fresh
anonymous identity — which is what the confirmation tells the player will
happen.

---

## 2 — Debug controls in the release build (High)

**Valid, and slightly wider than the review found.** The cited range was
`src/main.js`; there is a second debug surface in `src/puzzle/puzzle.js`
(`?built`, `?celebrate`, `?auto`, `?tscale`, `?time`), and `?built=1` completes
a monument outright, handing over the whole puzzle bonus. `const GOD =
q.has('god')` was also unconditional, so `?god=1` worked without `?view=`.

Worth stating plainly alongside that: **today's real-world impact is
self-cheating on a device-local board.** The game is single-player, the
leaderboard never leaves the device, and nothing outside a Capacitor WKWebView
can push a query string into it. It is nonetheless a release-boundary problem
and it has to be closed *before* a server leaderboard exists, not after.

**Fixed** with `src/core/debug.js`: `DEBUG_HOOKS` is `false` when Vite built the
bundle and `true` when the suites serve `src/` raw. Vite statically replaces
`import.meta.env.PROD`, so Rollup eliminates the gated code outright — the
built bundle contains no `__cr`, no `'god'` and no `'built'`. In raw ES modules
`import.meta.env` is `undefined`, hence the `?.`, so the nine suites that depend
on these entry points keep working with no separate test entry point to
maintain.

Two mechanical points that were easy to get wrong and are documented in the
file: `GOD` stays declared at module scope because the collision path reads it
every frame (moving the declaration inside the gate would trade a cheating hole
for a `ReferenceError` on first collision), and a build-time define like
`__DEBUG__` would have been a `ReferenceError` under raw serving. The vestigial
`window.GOD = false` was removed — nothing had read it since `GOD` became a
module const.

**Gate:** `test/release-build.mjs` runs `vite build` itself (a stale `dist/`
would go green precisely during the window a regression could appear), serves
the result, and asserts behaviour rather than grepping for strings, which would
be testing the minifier. It also drives the same URLs against the raw root,
where they *must* work — without that control, deleting the harness entirely
would also pass.

The behavioural half can only ask about the parameters we already know about,
so the gate opens with a static scan of `src/`: any module reading
`location.search` or exposing a `window.__` handle without importing
`DEBUG_HOOKS` fails it. That is what catches a *third* debug surface added
later — the case that would otherwise ship live having passed all ten gates in
silence. It is file-level rather than expression-level, which is as far as a
scan can honestly go, and it was verified by planting an ungated module and
confirming the gate went red.

The bundle the review inspected, `dist/assets/index-xUxlbL7Y.js`, was a local
build artifact; `dist/` and `ios/App/App/public/` are both gitignored, so no
holed bundle was ever committed.

---

## 3 — Local score validation cannot back a leaderboard (High)

**Valid, and no code change is the right answer.** This is a limitation that was
already understood and written down: `src/core/scores.js`'s header says a
client-side check is a suggestion rather than a control, `docs/COMPLIANCE.md`
§4.4 says the same, and `supabase/schema.sql` is where the real control lives.
Client-side code cannot fix this; only a server can, and no server leaderboard
ships in v1.

One thing in that file *was* worth correcting, because it argued against its own
security note two lines further down: **"swapping in Supabase is a config
change, not a rewrite."** That sentence has been replaced. The pluggability is
an architecture convenience; a remote leaderboard is a new security boundary.
The header now spells out what the server has to do for itself — issue its own
session, time the run on its own clock, re-run every bound here, enforce
one-entry-per-session on its own side, and ignore any identity or entitlement
the client claims.

---

## 4 — A failed write consumes the one submission (Medium)

**Valid. Fixed.** `writeAll()` and `record()` now return whether the write
actually happened; `submit()` marks the session used only after a confirmed
write and returns `{ ok: false, reason: 'not-saved' }` otherwise. It still never
throws.

Setting the flag last cannot introduce a duplicate — `setItem` throwing means
nothing was written — and even a duplicate would be harmless, because `top()`
already keeps one best entry per player id. All three call sites in `main.js`
ignore the return value, so nothing else changes for a run.

One edge is stated rather than chased: `writeAll()` keeps the top 500, so a
confirmed write proves the list was stored, not that this particular entry made
the cut. On a single-player device 500 is not a real ceiling, and the entry that
would be dropped is by definition the worst one.

**Gate:** `test/save-and-scores.mjs` PART C stubs `Storage.prototype.setItem` to
throw for the scores key only, and asserts the failure is reported, the session
stays open, the *same* session can retry successfully once storage recovers,
exactly one entry lands, and the one-shot rule still closes the session after a
confirmed write.

---

## Test and release observations

- **Serial `&&` stops the chain at the first failure.** Deliberate, and kept.
  The full run takes minutes, and the first failure is nearly always the one to
  fix; a run that continues past it mostly produces noise. Any suite can be run
  alone with `node test/<name>.mjs`. This reasoning is now recorded in
  `docs/LAUNCH-CHECKLIST.md` #30 rather than left implicit.
- **`test/difficulty.mjs` is a non-gating probe.** Correct and intentional — it
  prints a table and asserts nothing, so it has nothing to gate on.
  `test/contact-sheet.mjs` is the same kind of thing.
- **The three uncovered areas named — the erase key set, release exclusion of
  debug hooks, and storage-write failure — are now all gated**, by
  `test/storage-keys.mjs`, `test/release-build.mjs` and
  `test/save-and-scores.mjs` PART C respectively. The chain went from eight
  gates to ten.
- **`npm test` and `npm run build` were both run**, which the review could not
  do. Build succeeds; all ten gates pass.
- Stale rows in `docs/LAUNCH-CHECKLIST.md` were corrected while in there: #27
  (Vite build) and #31 (loading screen) were both marked TODO but are done, and
  #30 still described a four-suite chain.
