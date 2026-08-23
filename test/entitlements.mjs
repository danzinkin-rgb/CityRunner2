/**
 * Entitlement gate — what is free, what is paid, and what the menu shows.
 *
 * This is a GATE, not a probe: it exits non-zero and is wired into `npm test`,
 * alongside coin-arc / road-clearance / ios-ui / determinism / puzzle-solvable.
 * It earns that because the failure it guards against is silent and expensive
 * in both directions — shipping a build that gives paid cities away, or one
 * that charges for a city promised free forever. Neither throws an error, and
 * neither is visible on the web build, where everything is unlocked by design.
 *
 * The whole point of the design is that entitlement is decided in exactly one
 * place (src/core/entitlements.js), so this drives the real module through the
 * real page rather than reimplementing the rules and testing its own opinion.
 *
 * HOW THE NATIVE PATH IS REACHED FROM A DESKTOP BROWSER. `isNative()` in
 * src/core/native.js is just `globalThis.Capacitor?.isNativePlatform?.()`, so
 * an init script that defines that object before any module evaluates puts the
 * page on the iOS code path. It has to be an INIT script — set it after load
 * and the modules have already read it.
 *
 * Usage:
 *   npm run serve          # needs :4173 up, like the other suites
 *   node test/entitlements.mjs
 */
import { webkit } from 'playwright';
import { resolveBase } from './serve.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The suite serves the repo itself unless a URL is named. See test/serve.mjs
// for why an externally-started server was the wrong shape for this.
const { base: BASE } = await resolveBase(process.argv[2]);
const HERE = dirname(fileURLToPath(import.meta.url));

// City ids from themes.js, the same derivation the other suites use, so a
// renamed or added city is caught here rather than becoming a free city by
// accident.
const themesSrc = readFileSync(join(HERE, '..', 'src', 'cities', 'themes.js'), 'utf8');
const CITIES = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
if (!CITIES.length) {
  console.log('x could not read city ids from src/cities/themes.js — has the file moved?');
  process.exit(1);
}

// FREE_CITIES read from source rather than imported: src/*.js is ESM inside a
// "type": "commonjs" package, so node cannot import it directly here.
const entSrc = readFileSync(join(HERE, '..', 'src', 'core', 'entitlements.js'), 'utf8');
const freeMatch = entSrc.match(/export const FREE_CITIES\s*=\s*\[([^\]]*)\]/);
if (!freeMatch) {
  console.log('x could not find FREE_CITIES in src/core/entitlements.js');
  process.exit(1);
}
const FREE = [...freeMatch[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const PAID = CITIES.filter((c) => !FREE.includes(c));

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

console.log(`cities [${CITIES.join(', ')}]`);
console.log(`free   [${FREE.join(', ')}]   paid [${PAID.join(', ')}]\n`);

// ---------------------------------------------------------------- static
// The promise is three free cities. If someone edits FREE_CITIES to two or
// four, that is a change to what existing players were already given, and it
// should require deliberately editing this number too.
check(FREE.length === 3, 'exactly three cities are free forever', `got ${FREE.length}`);
// ...and these three specifically. FREE above is derived FROM the source, so
// every other check in this file agrees with whatever the source says — edit
// the constant and they all happily re-derive. The promise itself has to be
// pinned to a literal written HERE, so that changing which cities were given
// away forever takes two deliberate edits instead of one careless one.
check(FREE.join(',') === 'nyc,paris,london',
  'the free-forever set is exactly the three cities players were promised',
  FREE.join(','));
check(FREE.every((c) => CITIES.includes(c)), 'every free city id exists in themes.js',
  FREE.filter((c) => !CITIES.includes(c)).join(',') || '');
check(PAID.length >= 1, 'at least one city is paid', `got ${PAID.length}`);
// A hardcoded launch date would break silently once it passed; the design
// deliberately leaves the window to App Store Connect. Guard that it stays out.
check(!/\b20\d\d-\d\d-\d\d\b/.test(entSrc) && !/Date\.now\(\)/.test(entSrc),
  'no launch date or clock check in the entitlement policy');

const browser = await webkit.launch();

// ------------------------------------------------------------- web build
// No Capacitor: everything unlocked, and nothing purchasable is advertised.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const web = await page.evaluate(() => ({
    paidCards: document.querySelectorAll('#city-select .city-card.paid').length,
    padlocks: document.querySelectorAll('#city-select .padlock').length,
    cards: document.querySelectorAll('#city-select .city-card').length,
  }));
  check(web.cards === CITIES.length, 'web: every city has a card', `${web.cards}/${CITIES.length}`);
  check(web.paidCards === 0, 'web: no city is behind a paywall', `${web.paidCards} paid`);
  check(web.padlocks === 0, 'web: no padlock badges', `${web.padlocks}`);
  check(!errors.length, 'web: no page errors', errors[0] || '');

  // The Settings purchase rows must be hidden, not just inert — a dead
  // "Restore purchases" button on the open web is a support email waiting
  // to happen.
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const rows = await page.evaluate(() => {
    const shown = (id) => {
      const el = document.getElementById(id);
      if (!el) return 'MISSING';
      const row = el.closest('.row') || el;
      return row.getBoundingClientRect().height > 2;
    };
    return { purchase: shown('set-purchase'), restore: shown('set-restore') };
  });
  check(rows.purchase === false, 'web: settings hides the purchase row', String(rows.purchase));
  check(rows.restore === false, 'web: settings hides restore', String(rows.restore));
  await ctx.close();
}

// ----------------------------------------------------------- native build
// Capacitor faked before module evaluation, so isNative() is true and the
// entitlement rules actually apply.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const state = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#city-select .city-card').forEach((el) => {
      const name = el.querySelector('.name')?.textContent?.trim() || '?';
      out[name] = {
        paid: el.classList.contains('paid'),
        locked: el.classList.contains('locked'),
        padlock: !!el.querySelector('.padlock'),
      };
    });
    return out;
  });

  // Map display names back to ids by position — themes.js order drives both.
  const names = Object.keys(state);
  const byId = {};
  CITIES.forEach((id, i) => { if (names[i]) byId[id] = state[names[i]]; });

  for (const id of FREE) {
    check(byId[id] && !byId[id].paid, `native: ${id} is not behind the paywall`);
    check(byId[id] && !byId[id].padlock, `native: ${id} shows no padlock`);
  }
  for (const id of PAID) {
    const c = byId[id];
    // A paid city is only offered for sale once it has been EARNED — until
    // then it is progression-locked, and showing a price on a city the player
    // cannot reach yet would be selling a closed door.
    check(!!c, `native: ${id} has a card`);
    check(c && (c.paid || c.locked), `native: ${id} is gated somehow`,
      c ? `paid=${c.paid} locked=${c.locked}` : '');
    check(c && !(c.paid && c.locked), `native: ${id} is not both states at once`);
  }
  check(!errors.length, 'native: no page errors', errors[0] || '');

  // The paywall must survive being opened with no store present — this is
  // exactly the state of the current build (no IAP plugin wired), and it must
  // degrade to an explanatory message rather than a dead buy button.
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  const nativeRows = await page.evaluate(() => {
    const row = (id) => (document.getElementById(id)?.closest('.row'))?.getBoundingClientRect().height > 2;
    return { purchase: row('set-purchase'), restore: row('set-restore') };
  });
  check(nativeRows.purchase === true, 'native: settings shows the purchase row');
  check(nativeRows.restore === true, 'native: settings shows Restore purchases');

  await page.evaluate(() => document.getElementById('set-purchase').click());
  await page.waitForTimeout(900);
  const pw = await page.evaluate(() => ({
    on: document.getElementById('screen-paywall').classList.contains('on'),
    buyShown: document.getElementById('btn-paywall-buy').style.display !== 'none',
    status: document.getElementById('paywall-status').textContent.trim(),
    restore: !!document.getElementById('btn-paywall-restore'),
  }));
  check(pw.on, 'native: settings opens the paywall');
  check(pw.buyShown === false, 'native: no buy button when the store cannot answer',
    `buyShown=${pw.buyShown}`);
  check(pw.status.length > 0, 'native: an explanation is shown instead', pw.status);
  check(pw.restore, 'native: Restore stays reachable on the paywall');
  check(!errors.length, 'native: no page errors after opening the paywall', errors[0] || '');

  await ctx.close();
}

// ------------------------------------------- native, with the city EARNED
// The branch above leaves Rome progression-locked on a fresh save, which
// means the interesting path — earned but not paid for — never runs. Seed
// enough stars to open the progression gate so the purchasable state is the
// one actually on screen.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript((freeIds) => {
    window.Capacitor = { isNativePlatform: () => true };
    const stars = {};
    for (const id of freeIds) stars[id] = 3;
    localStorage.setItem('cityrunner2', JSON.stringify({ stars, coins: 0, best: 0 }));
  }, FREE);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const earned = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#city-select .city-card')];
    const last = cards[cards.length - 1];
    return {
      paid: last.classList.contains('paid'),
      locked: last.classList.contains('locked'),
      padlock: !!last.querySelector('.padlock'),
      // A purchasable card must not be dimmed like an unearned one — it is
      // merchandise, and .locked's 0.35 opacity would read as "not yet".
      opacity: getComputedStyle(last).opacity,
      clickable: getComputedStyle(last).cursor,
    };
  });
  const paidId = PAID[PAID.length - 1];
  check(earned.paid, `native/earned: ${paidId} is offered for sale`, JSON.stringify(earned));
  check(!earned.locked, `native/earned: ${paidId} is no longer progression-locked`);
  check(earned.padlock, `native/earned: ${paidId} shows a padlock badge`);
  check(Number(earned.opacity) > 0.9, `native/earned: ${paidId} is not dimmed`, earned.opacity);
  check(earned.clickable === 'pointer', `native/earned: ${paidId} invites a tap`, earned.clickable);

  // Tapping it must open the paywall rather than starting an unpaid run.
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#city-select .city-card')];
    cards[cards.length - 1].click();
  });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => ({
    paywall: document.getElementById('screen-paywall').classList.contains('on'),
    menu: document.getElementById('screen-menu').classList.contains('on'),
    canvasRunning: !!document.querySelector('#hud.on'),
  }));
  check(after.paywall, `native/earned: tapping ${paidId} opens the paywall`);
  check(!after.canvasRunning, `native/earned: tapping ${paidId} does not start a run`);
  check(!errors.length, 'native/earned: no page errors', errors[0] || '');

  // The card is not the only door. ?view=run / ?view=puzzle build a real scene
  // from a URL parameter, and startDaily() takes its city from the daily seed —
  // neither goes anywhere near buildCitySelect(). Both are guarded at
  // startRun()/startPuzzle(); prove it, because a debug parameter that survives
  // into a shipped build is a one-tap bypass of the whole paywall.
  for (const view of ['run', 'puzzle']) {
    await page.goto(`${BASE}/?view=${view}&city=${paidId}`, { waitUntil: 'load' });
    await page.waitForTimeout(1100);
    const got = await page.evaluate(() => ({
      paywall: document.getElementById('screen-paywall').classList.contains('on'),
      hud: !!document.querySelector('#hud.on'),
    }));
    check(got.paywall, `native/earned: ?view=${view}&city=${paidId} is refused`,
      JSON.stringify(got));
    check(!got.hud, `native/earned: ?view=${view} does not start unpaid play`);
  }

  // A free city through the same door must still work — the guard has to block
  // the paywall, not the debug entry points.
  await page.goto(`${BASE}/?view=run&city=${FREE[0]}`, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  const freeRun = await page.evaluate(() =>
    !document.getElementById('screen-paywall').classList.contains('on'));
  check(freeRun, `native/earned: ?view=run&city=${FREE[0]} still plays`);

  await ctx.close();
}

await browser.close();

console.log(`\n${failures ? `x ${failures} entitlement check(s) failed` : 'ok entitlements — all checks passed'}`);
process.exit(failures ? 1 : 0);
