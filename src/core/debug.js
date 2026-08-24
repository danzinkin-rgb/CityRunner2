/**
 * Is the automated-review harness allowed to run?
 *
 * This game ships two things that must never both be true at once: a rich set
 * of query-string entry points that let a headless browser jump straight to a
 * screen, a city, a finished monument or a collision-free run — and a store
 * build that a player installs. The harness is genuinely load-bearing: nine of
 * the suites in `npm test` drive the game through ?view=, ?ui=, ?built= and
 * friends, and they would all have to be rewritten (or deleted) if the hooks
 * went away. But `?god=1` disables collision handling, `?ui=` writes a made-up
 * best score into the in-memory save, `?built=1` pre-places an entire monument,
 * and window.__cr hands out live references to the run, the session and the
 * continue flow. None of that belongs in a shipped bundle.
 *
 * HOW THE SPLIT WORKS. Vite statically replaces `import.meta.env.PROD` with
 * `true` when it builds dist/, so this resolves to `false` there. The test
 * suites do not use Vite at all: test/serve.mjs serves the repository root and
 * the browser loads src/*.js as raw ES modules, where `import.meta.env` is
 * simply undefined — hence the `?.`, which yields `undefined` rather than
 * throwing, and this resolves to `true`. Same source file, opposite answers,
 * no separate test entry point to keep in sync with the real one.
 *
 * WHY `?.` AND NOT A BARE IDENTIFIER. A build-time define like `__DEBUG__`
 * would be the obvious alternative and it is a trap: the identifier does not
 * exist when the same file is served raw, so every suite would die with a
 * ReferenceError before its first assertion.
 *
 * WHAT CALLERS MUST NOT DO. Never move a declaration that non-debug code reads
 * inside a `if (DEBUG_HOOKS)` block. `GOD` is the live example — src/main.js
 * reads it in the collision path on every frame, so it stays declared at module
 * scope and it is the VALUE that is gated. A ReferenceError on first collision
 * would be a far worse bug than the one this flag exists to fix.
 */
export const DEBUG_HOOKS = !import.meta.env?.PROD;
