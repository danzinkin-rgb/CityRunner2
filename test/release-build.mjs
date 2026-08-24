/**
 * Release boundary: the debug harness must not exist in a shipped bundle.
 *
 * This is a GATE, and it is the only suite in `npm test` that looks at dist/
 * rather than at the repo root. That inversion is the entire point. Every
 * other suite deliberately drives the unbundled source, which means every
 * other suite is blind to the one question a player's copy raises: are the
 * query-string entry points still there?
 *
 * WHAT IS AT STAKE. `?god=1` disables collision handling. `?ui=` fabricates a
 * score and writes it into the in-memory save, which the next persist() makes
 * permanent. `?built=1` completes a monument outright, handing over the whole
 * puzzle bonus. `window.__cr` exposes live references to the run, the score
 * session and the continue flow — startSession() and submit() included. A code
 * review found all of it present in a built bundle; src/core/debug.js is the
 * fix and this file is the proof that the fix survives.
 *
 * WHY IT BUILDS RATHER THAN READING WHATEVER IS IN dist/. A stale dist/ is
 * worse than no check at all: it would go green for as long as nobody rebuilt,
 * which is exactly the window in which a regression would be introduced. So
 * the build runs here, from this process, every time.
 *
 * WHY IT ASSERTS BEHAVIOUR AND NOT TEXT. Grepping the bundle for "__cr" or
 * "god" tests the minifier as much as the code — a renamed local or an inlined
 * string would flip the result without anything really changing. Loading the
 * built app and asking it to cheat is minifier-proof.
 *
 * THE CONTROL MATTERS AS MUCH AS THE ASSERTION. A build that simply failed to
 * boot would pass "no debug hooks" trivially, and a DEBUG_HOOKS that was
 * always false would break nine other suites in ways that look unrelated. So
 * the same URLs are driven against the raw repo root, where they MUST work.
 * Both halves have to hold: off in dist/, on in src/.
 *
 * WHY THERE IS A STATIC SCAN AS WELL. The behavioural checks can only ask
 * about the query parameters we already know about. A THIRD module reading
 * location.search would pass every one of them in silence and ship live. That
 * is the same blind spot test/storage-keys.mjs PART A exists to close for
 * storage keys, so the same answer is used here: scan src/ for the pattern
 * itself. It is file-level, not expression-level — it proves a module knows
 * the gate exists, not that every branch is behind it — which is as far as a
 * scan can honestly go, and it catches the case that matters: a module nobody
 * remembered to gate at all.
 *
 * Usage: node test/release-build.mjs
 */
import { webkit } from 'playwright';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStaticServer } from './serve.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(REPO, 'dist');

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

// ---- static: every debug surface knows about the gate ---------------------
{
  const ALLOWED = new Set([join('src', 'core', 'debug.js')]); // where the gate is defined
  const offenders = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!name.endsWith('.js')) continue;
      const rel = relative(REPO, full);
      if (ALLOWED.has(rel)) continue;
      // Comments are stripped first: debug.js's explanation is quoted in other
      // files, and documentation is not a surface.
      const code = readFileSync(full, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      if (!/location\.search|window\.__/.test(code)) continue;
      if (!/DEBUG_HOOKS/.test(code)) offenders.push(rel);
    }
  };
  walk(join(REPO, 'src'));
  check(offenders.length === 0,
    'every module reading location.search or exposing window.__ imports DEBUG_HOOKS',
    offenders.join(', '));
}

// ---- build ----------------------------------------------------------------
// Invoked through node + vite's own bin rather than `npm run build`, so this
// works identically on Windows and POSIX without a shell.
const viteBin = join(REPO, 'node_modules', 'vite', 'bin', 'vite.js');
if (!existsSync(viteBin)) {
  console.log('x   vite is not installed — run npm install');
  process.exit(1);
}
console.log('… building dist/ (vite build)');
const built = spawnSync(process.execPath, [viteBin, 'build'], { cwd: REPO, encoding: 'utf8' });
check(built.status === 0, 'vite build succeeds',
  built.status === 0 ? '' : (built.stderr || built.stdout || '').split('\n').slice(-6).join(' | '));
if (built.status !== 0) process.exit(1);

const browser = await webkit.launch();

/**
 * Load one URL and report what the debug hooks did or did not do.
 *
 * `hooks` is the debug handle itself; `screen` is whichever overlay is visible,
 * which is how a forced ?ui= screen shows up; `alive` proves the app booted at
 * all, so that a blank page cannot masquerade as a locked-down one.
 *
 * THE TWO URLS ARE KEPT SEPARATE ON PURPOSE. Combining them reads as thorough
 * and measures nothing: ?view=run starts a run, and a run clears the overlay a
 * beat later, so ?ui= and ?view= together settle on "no screen visible" whether
 * or not either of them was honoured. One question per load.
 */
async function probe(base, query) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/${query}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const out = await page.evaluate(() => ({
    hooks: typeof window.__cr,
    screen: document.querySelector('.screen.on')?.id || null,
    alive: document.querySelectorAll('#city-select .city-card').length,
  }));
  out.errors = errors;
  await ctx.close();
  return out;
}

const FORCE_SCREEN = '?ui=shop';
const FORCE_RUN = '?view=run&god=1&built=1&seed=7';

// ---- the shipped bundle: everything must be inert -------------------------
// In a release build both URLs are just noise, so the menu is still what the
// player is looking at a second later — the same thing they would see with no
// query string at all.
{
  const { base, close } = await startStaticServer(DIST);
  const forced = await probe(base, FORCE_SCREEN);
  const run = await probe(base, FORCE_RUN);

  check(forced.errors.length === 0 && run.errors.length === 0,
    'release: the built app boots without page errors',
    forced.errors[0] || run.errors[0] || '');
  check(forced.alive > 0, 'release: the built app is genuinely alive (menu rendered city cards)',
    `${forced.alive} cards`);
  check(forced.screen === 'screen-menu', 'release: ?ui= cannot force an overlay open',
    String(forced.screen));
  check(run.screen === 'screen-menu', 'release: ?view= cannot start a run',
    String(run.screen));
  check(run.hooks === 'undefined', 'release: window.__cr is not exposed', `typeof=${run.hooks}`);
  await close();
}

// ---- the raw repo: the same hooks must still work -------------------------
// Without this half, deleting the harness outright would also pass — and would
// take nine other suites with it, for reasons that would look unrelated.
{
  const { base, close } = await startStaticServer();
  const forced = await probe(base, FORCE_SCREEN);
  const run = await probe(base, FORCE_RUN);

  check(forced.screen === 'screen-shop',
    'control: the unbundled source DOES honour ?ui=, so the gate is real and not a no-op',
    String(forced.screen));
  check(run.hooks === 'object',
    'control: the unbundled source DOES expose window.__cr, so the suites keep working',
    `typeof=${run.hooks}`);
  check(run.screen === null,
    'control: the unbundled source DOES start a run from ?view= (no menu overlay left)',
    String(run.screen));
  await close();
}

await browser.close();

console.log(`\n${failures ? `x ${failures} check(s) failed` : 'ok release-build — all checks passed'}`);
process.exit(failures ? 1 : 0);
