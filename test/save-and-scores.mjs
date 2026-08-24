/**
 * Save-file migration + score-plausibility gate.
 *
 * This is a GATE, not a probe: it exits non-zero and is meant to sit next to
 * entitlements / coin-arc / road-clearance / ios-ui / determinism /
 * puzzle-solvable in `npm test`. It covers three things nothing else did:
 *
 *   PART A — score plausibility bounds (src/core/scores.js)
 *   PART B — save-file migration (src/main.js, key "cityrunner2")
 *   PART C — what happens when the device refuses the write (src/core/scores.js)
 *
 * Why these three and why together: all of them are the client half of a
 * promise the server half enforces for real. docs/COMPLIANCE.md §4.4 is explicit that
 * `src/core/scores.js` is a courtesy to honest players and `supabase/schema.sql`
 * is the actual control — this file tests the courtesy, not the control. The
 * save migration has no server counterpart at all: the localStorage save under
 * the key "cityrunner2" is the only copy of a player's stars, coins and
 * unlocked characters that exists anywhere, so a version bump or a corrupted
 * write must never be allowed to lose it or crash the app outright — and
 * neither must a device that simply refuses to store anything, which is what
 * PART C covers.
 *
 * HOW SEEDING WORKS FOR THE MIGRATION HALF. localStorage has to be seeded
 * with an init script BEFORE main.js evaluates, exactly as entitlements.mjs
 * does for window.Capacitor — set it after `page.goto` and the module has
 * already read (or thrown on) whatever was there.
 *
 * HOW THE SCORE HALF DRIVES THE REAL MODULE. src/*.js is ESM inside a
 * "type": "commonjs" package.json, so node cannot import it directly here
 * (see entitlements.mjs's note on this). Instead a live page's browser
 * `import()` loads the actual served module and this file calls the real
 * startSession()/submit()/maxPlausibleScore(), the same way entitlements.mjs
 * drives the real isCityEntitled() instead of reimplementing its rules.
 *
 * Usage:
 *   npm run serve          # needs :4173 up, like the other suites
 *   node test/save-and-scores.mjs
 */
import { webkit } from 'playwright';
import { resolveBase } from './serve.mjs';

// The suite serves the repo itself unless a URL is named. See test/serve.mjs
// for why an externally-started server was the wrong shape for this.
const { base: BASE } = await resolveBase(process.argv[2]);
const SAVE_KEY = 'cityrunner2';

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await webkit.launch();

// =============================================================================
// PART A — score plausibility bounds
// =============================================================================
// submit() is deliberately generous and deliberately never throws (see the
// header comment in scores.js): a rejected score must fail play SILENTLY, not
// crash the run. So every check here is on the returned { ok, reason }, and
// every rejection is pinned to its exact reason string, not just `!ok` — a
// test that only checks `ok === false` would still pass if the plausibility
// check were deleted and every rejection came from "too-fast" instead.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // A page with no session auto-started (startSession() is only ever called
  // from startRun()) and no 3D scene to build — ?ui= forces an overlay
  // instead, which is the cheapest way to get the real module graph loaded.
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  // ---- no session yet: the very first thing checked, before any
  // startSession() call touches the module's session state. ----
  const noSession = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    return m.submit(100);
  });
  check(noSession.ok === false && noSession.reason === 'no-session',
    'submit() with no active session is refused', JSON.stringify(noSession));

  // ---- MIN_RUN_SECONDS = 3 gates everything before the plausibility check
  // even looks at the score. session.startedAt is set directly (currentSession()
  // returns the live object by reference) so elapsed time is pinned instead of
  // depending on a real sleep, and the whole compute-bound-then-submit sequence
  // below runs synchronously in one evaluate() so no extra wall-clock time can
  // sneak into `seconds` between deciding the bound and submitting it. ----
  const tooFast = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 2900; // clearly under 3s
    return m.submit(0);
  });
  check(tooFast.ok === false && tooFast.reason === 'too-fast',
    'a run under MIN_RUN_SECONDS (3s) is refused regardless of score',
    JSON.stringify(tooFast));

  const justLongEnough = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 3100; // clearly over 3s
    return m.submit(0);
  });
  check(justLongEnough.ok === true,
    'a run just past MIN_RUN_SECONDS with score 0 is accepted',
    JSON.stringify(justLongEnough));

  // ---- the plausibility bound itself, pinned at a fixed elapsed time (60s)
  // so maxPlausibleScore() is computed once and submitted against immediately,
  // rather than reimplementing its formula here (that would test this file's
  // opinion of the formula, not the formula). ----
  const atBound = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 60_000;
    const seconds = (Date.now() - m.currentSession().startedAt) / 1000;
    const max = m.maxPlausibleScore(seconds);
    return { max, result: m.submit(max) };
  });
  check(atBound.result.ok === true,
    'a score exactly at the plausibility bound is accepted',
    `max=${atBound.max} result=${JSON.stringify(atBound.result)}`);

  const overBound = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 60_000;
    const seconds = (Date.now() - m.currentSession().startedAt) / 1000;
    const max = m.maxPlausibleScore(seconds);
    return { max, result: m.submit(max + 1) };
  });
  check(overBound.result.ok === false && overBound.result.reason === 'implausible',
    'one point over the plausibility bound is refused as implausible',
    `max=${overBound.max} result=${JSON.stringify(overBound.result)}`);

  const wayOverBound = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 60_000;
    return m.submit(9_000_000_000);
  });
  check(wayOverBound.ok === false && wayOverBound.reason === 'implausible',
    'an absurd score (nine billion) is refused as implausible',
    JSON.stringify(wayOverBound));

  // ---- a normal, good run must NOT be caught in the net. This is the case
  // that matters most in practice: an overly tight bound would silently
  // refuse honest high scores, which nothing else here would catch. ----
  const normalGood = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 60_000;
    return m.submit(2500); // well within reach of a 60s run, nowhere near the ceiling
  });
  check(normalGood.ok === true && normalGood.entry?.score === 2500,
    'a normal good score from a real-length run is accepted, not rejected',
    JSON.stringify(normalGood));

  // ---- negative, non-numeric, NaN and Infinity all fail the finite/>=0
  // check BEFORE the bound check even runs (scores.js:65-67), so all of these
  // must come back as "not-a-number", never "implausible". Getting this
  // backwards (asserting "implausible") would still pass if the bound check
  // were deleted, since not-a-number is a different code path entirely. ----
  const notANumberCases = [
    ['negative score', -1000],
    ['non-numeric string', 'abc'],
    ['undefined', undefined],
    ['plain object', {}],
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['negative Infinity', -Infinity],
  ];
  for (const [label, value] of notANumberCases) {
    const result = await page.evaluate(async (v) => {
      const m = await import('/src/core/scores.js');
      m.startSession('run', 'nyc', 1, 0);
      m.currentSession().startedAt = Date.now() - 60_000;
      return m.submit(v);
    }, value);
    check(result.ok === false && result.reason === 'not-a-number',
      `${label} is refused as not-a-number (not "implausible")`,
      JSON.stringify(result));
  }

  // ---- one-shot per session: a second submit on the same session is refused
  // even with an otherwise-valid score, so a client can't retry its way to a
  // better-looking log by hammering submit(). ----
  const doubleSubmit = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 60_000;
    const first = m.submit(100);
    const second = m.submit(200);
    return { first, second };
  });
  check(doubleSubmit.first.ok === true, 'first submit on a session succeeds',
    JSON.stringify(doubleSubmit.first));
  check(doubleSubmit.second.ok === false && doubleSubmit.second.reason === 'already-submitted',
    'a second submit on the same session is refused', JSON.stringify(doubleSubmit.second));

  check(!errors.length, 'scores: no page errors across all of the above', errors[0] || '');
  await ctx.close();
}

// =============================================================================
// PART B — save-file migration
// =============================================================================
// The save is the ONLY copy of a player's progress; there is no server
// mirror. Every case below seeds localStorage via addInitScript, which runs
// before any module evaluates (an init script set after page.goto is too
// late — main.js has already parsed whatever was there by then). Each case
// then asserts three things: the page did not throw, the menu actually
// rendered city cards (proof the app is alive, not just that no exception
// bubbled up to Playwright), and prior progress that a fresh save would not
// have is still present.
{
  const cases = [
    {
      label: 'a save missing newer fields (no characters/equipped, pre-dates the shop)',
      raw: JSON.stringify({ stars: { nyc: 2, paris: 1 }, coins: 40, best: 500 }),
      assert: async (page) => {
        const s = await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2')));
        check(s.stars.nyc === 2 && s.stars.paris === 1, 'old save: stars survive migration', JSON.stringify(s.stars));
        check(s.coins === 40, 'old save: coins survive migration', String(s.coins));
        check(s.best === 500, 'old save: best score survives migration', String(s.best));
        check(Array.isArray(s.characters) && s.characters.includes('runner'),
          'old save: missing characters field is backfilled with the default runner', JSON.stringify(s.characters));
        check(s.equipped === 'runner', 'old save: missing equipped field defaults to runner', String(s.equipped));
      },
    },
    {
      label: 'a save with unexpected extra fields (future version wrote more than this one knows)',
      raw: JSON.stringify({
        stars: { nyc: 1 }, coins: 15, best: 200,
        characters: ['runner'], equipped: 'runner',
        futureField: 'from-a-newer-build', nested: { a: 1, b: [1, 2, 3] },
      }),
      assert: async (page) => {
        const s = await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2')));
        check(s.stars.nyc === 1, 'extra-fields save: existing progress survives', JSON.stringify(s.stars));
        check(s.coins === 15 && s.best === 200, 'extra-fields save: coins/best survive', `${s.coins}/${s.best}`);
        check(s.futureField === 'from-a-newer-build', 'extra-fields save: unknown fields are preserved, not stripped',
          String(s.futureField));
      },
    },
    {
      label: 'an empty object ({}) — the field this module assumes exists (stars) is absent',
      raw: '{}',
      assert: async (page) => {
        const s = await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2')));
        check(s && typeof s.stars === 'object' && !Array.isArray(s.stars),
          'empty-object save: stars is normalized to an object, not left undefined', JSON.stringify(s?.stars));
        check(Number.isFinite(s.coins) && Number.isFinite(s.best),
          'empty-object save: coins/best are normalized to finite numbers, not NaN/undefined',
          `coins=${s.coins} best=${s.best}`);
      },
    },
    {
      label: 'outright corrupt JSON (truncated write)',
      raw: '{"stars":{"nyc":3,"paris":2},"coins":9001,"best"',
      assert: async (page) => {
        const s = await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2')));
        // Corrupt input cannot be salvaged field-by-field — there is nothing
        // to read a "coins: 9001" out of once the JSON itself won't parse.
        // The bar here is different from the other three cases: not "keeps
        // the old progress" (impossible) but "degrades to a fresh, valid
        // save instead of throwing and leaving the app dead."
        check(s && typeof s.stars === 'object', 'corrupt save: degrades to a fresh save with a valid stars object',
          JSON.stringify(s));
        check(s.coins === 0 && s.best === 0, 'corrupt save: degrades to fresh coins/best, not garbage carried over',
          `coins=${s.coins} best=${s.best}`);
      },
    },
  ];

  for (const { label, raw, assert } of cases) {
    const ctx = await browser.newContext();
    await ctx.addInitScript((v) => { localStorage.setItem('cityrunner2', v); }, raw);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(900);

    const cardCount = await page.evaluate(() => document.querySelectorAll('#city-select .city-card').length);
    check(!errors.length, `${label}: no page errors`, errors[0] || '');
    check(cardCount > 0, `${label}: the menu actually rendered city cards (app is alive)`, `${cardCount} cards`);

    if (!errors.length) await assert(page);

    await ctx.close();
  }
}

// =============================================================================
// PART C — a failed write must not consume the session's one submission
// =============================================================================
// The device this game runs on can refuse a write at any moment: quota
// exceeded, a WebView with storage disabled, Safari's private mode. submit()
// used to mark the session used BEFORE writing and then discard the write's
// failure, so the player finished a run, lost the entry, was told { ok: true },
// and could not retry. Every symptom of that is invisible from inside the
// game, which is exactly why it needs a test.
//
// setItem is stubbed on Storage.prototype rather than on the localStorage
// instance because that is where WebKit actually resolves the call, and the
// stub is installed with addInitScript so it is in place before any module
// evaluates. It fails ONLY the scores key: failing every key would take the
// save file down too and the failure under test would be lost in the noise.
// The `window.__failScores` switch is what makes the retry half provable —
// the same session is submitted twice, first against a broken store and then
// against a working one.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    window.__failScores = true;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'cityrunner2.scores' && window.__failScores) {
        const err = new Error('QuotaExceededError: simulated full storage');
        err.name = 'QuotaExceededError';
        throw err;
      }
      return original.call(this, key, value);
    };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(400);

  const failed = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    m.startSession('run', 'nyc', 1, 0);
    m.currentSession().startedAt = Date.now() - 60_000;
    const result = m.submit(2500);
    return { result, stored: localStorage.getItem('cityrunner2.scores'), submitted: m.currentSession().submitted };
  });
  check(failed.result.ok === false && failed.result.reason === 'not-saved',
    'a score that could not be written reports failure, not success',
    JSON.stringify(failed.result));
  check(failed.stored === null,
    'nothing was written when storage refused (the stub really did fire)',
    String(failed.stored));
  check(failed.submitted === false,
    'the session is NOT marked submitted after a failed write',
    String(failed.submitted));

  // The retry the old code made impossible. Same session, storage now working.
  const retried = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    window.__failScores = false;
    const result = m.submit(2500);
    const stored = JSON.parse(localStorage.getItem('cityrunner2.scores') || '[]');
    return { result, count: stored.length, top: stored[0]?.score };
  });
  check(retried.result.ok === true && retried.result.entry?.score === 2500,
    'the same session can retry once storage recovers, and the score is not lost',
    JSON.stringify(retried.result));
  check(retried.count === 1 && retried.top === 2500,
    'exactly one entry is stored after the retry — no duplicate from the failed attempt',
    `count=${retried.count} top=${retried.top}`);

  // And the one-shot rule still holds once a write has actually succeeded.
  const third = await page.evaluate(async () => {
    const m = await import('/src/core/scores.js');
    return m.submit(3000);
  });
  check(third.ok === false && third.reason === 'already-submitted',
    'after a CONFIRMED write the session is closed as before',
    JSON.stringify(third));

  check(!errors.length, 'storage failure: no page errors — a refused write never throws into play',
    errors[0] || '');
  await ctx.close();
}

await browser.close();

console.log(`\n${failures ? `x ${failures} check(s) failed` : 'ok save-and-scores — all checks passed'}`);
process.exit(failures ? 1 : 0);
