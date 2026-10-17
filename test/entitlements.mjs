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
// The menu with every city on it, queued ones included (src/cities/releases.js):
// a queued city's locks must already be right on the day it is released.
// That players see only released cities is test/releases.mjs's job.
const MENU = `${BASE}/?allcities=1`;

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

// The Founder product id, read from source for the same reason as FREE_CITIES.
const founderMatch = entSrc.match(/FOUNDER:\s*'([^']+)'/);
if (!founderMatch) {
  console.log('x could not find PRODUCTS.FOUNDER in src/core/entitlements.js');
  process.exit(1);
}
const FOUNDER = founderMatch[1];

let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

console.log(`cities [${CITIES.join(', ')}]`);
console.log(`free   [${FREE.join(', ')}]   paid [${PAID.join(', ')}]\n`);

// ---------------------------------------------------------------- static
// The promise is four free cities (three until Jerusalem joined them, Dan,
// 17 October 2026). If someone edits FREE_CITIES, that is a change to what
// existing players were already given, and it should require deliberately
// editing this number too.
check(FREE.length === 4, 'exactly four cities are free forever', `got ${FREE.length}`);
// ...and these three specifically. FREE above is derived FROM the source, so
// every other check in this file agrees with whatever the source says — edit
// the constant and they all happily re-derive. The promise itself has to be
// pinned to a literal written HERE, so that changing which cities were given
// away forever takes two deliberate edits instead of one careless one.
check(FREE.join(',') === 'nyc,paris,london,jerusalem',
  'the free-forever set is exactly the four cities players were promised',
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
  await page.goto(MENU, { waitUntil: 'load' });
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
  await page.goto(MENU, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const state = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#city-select .city-card').forEach((el) => {
      const name = el.querySelector('.name')?.textContent?.trim() || '?';
      out[name] = {
        paid: el.classList.contains('paid'),
        locked: el.classList.contains('locked'),
        padlock: !!el.querySelector('.padlock'),
        clickable: getComputedStyle(el).cursor,
      };
    });
    return out;
  });

  // Map display names back to ids by NAME: the menu groups cities by region
  // pack, so its order is no longer themes.js order (October 2026).
  const byId = {};
  for (const id of CITIES) {
    const name = themesSrc.match(new RegExp(`id: '${id}', name: '([^']+)'`))?.[1];
    if (name && state[name]) byId[id] = state[name];
  }

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
    // The padlock marks purchasable content and shows from the FIRST LAUNCH,
    // before the city has been earned. It used to appear only once earned,
    // which hid from a new player that the city was buyable at all.
    check(c && c.padlock, `native: ${id} shows a padlock on a fresh save`);
    // And it must do something. A padlock that ignores taps is the same dead
    // control as the bought-but-unreached card fixed alongside this.
    check(c && c.clickable === 'pointer',
      `native: ${id} is tappable on a fresh save`, c ? c.clickable : '');
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
  // Seed a star in every city BEFORE the target, not just the free ones.
  // Progression is a chain: each city opens when the one before it has a
  // star. While there was a single paid city sitting right after the free
  // three, starring the free ones happened to open it. With a second paid
  // city added the chain got longer and that shortcut stopped working, so
  // the earned state is derived from the city order instead of assumed.
  await ctx.addInitScript((ids) => {
    window.Capacitor = { isNativePlatform: () => true };
    const stars = {};
    for (const id of ids) stars[id] = 3;
    localStorage.setItem('cityrunner2', JSON.stringify({ stars, coins: 0, best: 0 }));
  }, CITIES.slice(0, -1));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(MENU, { waitUntil: 'load' });
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

// ------------------------------- native, PAID FOR but not yet progressed to
// The fourth state, and the one that shipped broken. `earned` and `owned` are
// independent, so buying the full set on a fresh save satisfies the
// entitlement gate while the progression gate is still shut. That combination
// matched neither branch in buildCitySelect(): the card fell through to
// `.locked` -- dimmed to 0.35, no padlock, and NO CLICK HANDLER IN EITHER
// BRANCH. A player who had just paid GBP 1.99 saw a dead grey card with no
// explanation, and nothing anywhere told them what was left to do.
//
// The suite could not have caught it: the scenario above seeds full stars, so
// it only ever exercised earned-and-unpaid. This one seeds the purchase and NO
// stars, which is exactly what a player who buys before playing looks like.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript((founder) => {
    window.Capacitor = { isNativePlatform: () => true };
    // Owned, but no stars at all -- the progression gate is shut.
    // Seeded only when absent: addInitScript re-runs on every navigation,
    // including the reload below, so writing unconditionally would wipe the
    // star that reload is there to test.
    localStorage.setItem('cityrunner2.ent', JSON.stringify([founder]));
    if (localStorage.getItem('cityrunner2') == null) {
      localStorage.setItem('cityrunner2', JSON.stringify({ stars: {}, coins: 0, best: 0 }));
    }
  }, FOUNDER);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(MENU, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  const bought = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#city-select .city-card')];
    const last = cards[cards.length - 1];
    const gate = last.querySelector('.gate');
    return {
      gated: last.classList.contains('gated'),
      locked: last.classList.contains('locked'),
      paid: last.classList.contains('paid'),
      padlock: !!last.querySelector('.padlock'),
      opacity: getComputedStyle(last).opacity,
      note: gate ? gate.textContent.trim() : '',
    };
  });
  const paidId = PAID[PAID.length - 1];
  check(bought.gated, `native/bought: ${paidId} uses the bought-but-unreached state`,
    JSON.stringify(bought));
  check(!bought.locked, `native/bought: ${paidId} is not dimmed as merely locked`);
  check(!bought.paid, `native/bought: ${paidId} is not still offered for sale`);
  check(!bought.padlock, `native/bought: ${paidId} shows no padlock -- it is owned`);
  // Not withheld from them, so not dimmed to .locked's 0.35.
  check(Number(bought.opacity) > 0.5, `native/bought: ${paidId} stays legible`, bought.opacity);
  // The whole point: the card has to SAY something. An empty note is the bug.
  check(bought.note.length > 0, `native/bought: ${paidId} explains what is left to do`,
    JSON.stringify(bought.note));
  // One star opens the next city, not three -- so the copy must not say
  // "finish" or "complete", which would overstate what is required.
  check(!/finish (the|all)|complete/i.test(bought.note),
    'native/bought: the note does not overstate the requirement', bought.note);
  check(!errors.length, 'native/bought: no page errors', errors[0] || '');

  // Earning the star must hand the city over -- the purchase already stands,
  // so the only thing that was missing is now present and the card must play.
  // One star in the city immediately before the target is what opens it.
  await page.evaluate((prevIds) => {
    const save = JSON.parse(localStorage.getItem('cityrunner2'));
    for (const id of prevIds) save.stars[id] = 1;
    localStorage.setItem('cityrunner2', JSON.stringify(save));
  }, CITIES.slice(0, -1));
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  const opened = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#city-select .city-card')];
    const last = cards[cards.length - 1];
    return {
      gated: last.classList.contains('gated'),
      clickable: getComputedStyle(last).cursor,
      stars: !!last.querySelector('.stars'),
    };
  });
  check(!opened.gated, `native/bought: one star releases ${paidId}`, JSON.stringify(opened));
  check(opened.clickable === 'pointer', `native/bought: ${paidId} is now tappable`, opened.clickable);
  check(opened.stars, `native/bought: ${paidId} shows its stars row again`);

  await ctx.close();
}

// ------------------------------------------------- native, owning a REGION PACK
// Region packs (October 2026): a pack opens every city in its region and
// nothing else. Seeded with the Europe pack only: Rome and Istanbul (Europe)
// must open, San Francisco and Jerusalem must not, and owning a pack is not
// owning everything.
{
  const packMatch = entSrc.match(/europe:\s*'([^']+)'/);
  const ctx = await browser.newContext();
  await ctx.addInitScript((pack) => {
    window.Capacitor = { isNativePlatform: () => true };
    localStorage.setItem('cityrunner2.ent', JSON.stringify([pack]));
  }, packMatch && packMatch[1]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(MENU, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const r = await page.evaluate(async () => {
    const m = await import('/src/core/entitlements.js');
    const ids = ['rome', 'istanbul', 'sf', 'marrakech', 'paris'];
    return {
      entitled: Object.fromEntries(ids.map((id) => [id, m.isCityEntitled(id)])),
      full: m.hasFullAccess(),
      everyCityHasAPack: (await import('/src/cities/themes.js')).ALL_CITIES
        .filter((c) => m.isPaidCity(c.id)).every((c) => !!m.packForCity(c.id)),
    };
  });
  check(!!packMatch, 'entitlements.js names a Europe pack');
  check(r.entitled.rome && r.entitled.istanbul, 'native/pack: the Europe pack opens Rome and Istanbul', JSON.stringify(r.entitled));
  check(!r.entitled.sf && !r.entitled.marrakech, 'native/pack: it does not open San Francisco or Marrakech', JSON.stringify(r.entitled));
  check(r.entitled.paris, 'native/pack: free cities stay free');
  check(!r.full, 'native/pack: owning a pack is not owning everything');
  check(r.everyCityHasAPack, 'every paid city belongs to a region with a pack');
  check(!errors.length, 'native/pack: no page errors', errors[0] || '');
  await ctx.close();
}

// ---------------------------------------------------- native, REGION CHAINS
// With every city released (October 2026), paid cities open in a chain within
// their region: the region's first paid city opens after a street in London
// (the last free city), each later one after a street in the one before it IN
// THAT REGION. Founder owned and no stars: Rome and Delhi wait on London;
// with a star in London they play, Istanbul waits on Rome and Chicago on San
// Francisco; a star in Rome opens Istanbul. Until 15 October 2026 a region's
// first city needed nothing, so six bright "buy" cards met a new player.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript((founder) => {
    window.Capacitor = { isNativePlatform: () => true };
    localStorage.setItem('cityrunner2.ent', JSON.stringify([founder]));
    if (localStorage.getItem('cityrunner2') == null) {
      localStorage.setItem('cityrunner2', JSON.stringify({ stars: {}, coins: 0, best: 0 }));
    }
  }, FOUNDER);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const cards = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#city-select .city-card')].map((el) => [
    el.querySelector('.name').textContent.trim(),
    { gated: el.classList.contains('gated'), locked: el.classList.contains('locked'), note: el.querySelector('.gate')?.textContent.trim() || '' },
  ])));
  await page.goto(MENU, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const z = await cards();
  check(z.ROME?.gated && /LONDON/i.test(z.ROME.note), 'chains: Rome, first paid city in Europe, waits on a street in London', JSON.stringify(z.ROME));
  check(z.DELHI?.gated && /LONDON/i.test(z.DELHI.note), 'chains: Delhi, first in South and Central Asia, waits on London too', JSON.stringify(z.DELHI));
  check(z.MARRAKECH?.gated && /LONDON/i.test(z.MARRAKECH.note), 'chains: Marrakech, first paid city in its region now Jerusalem is free, waits on London', JSON.stringify(z.MARRAKECH));
  check(z.JERUSALEM?.locked, 'chains: Jerusalem (free) waits on a street in London', JSON.stringify(z.JERUSALEM));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cityrunner2'));
    s.stars.london = 1;
    localStorage.setItem('cityrunner2', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  const a = await cards();
  check(a.ROME && !a.ROME.gated && !a.ROME.locked, 'chains: a street in London opens Rome', JSON.stringify(a.ROME));
  check(a.DELHI && !a.DELHI.gated && !a.DELHI.locked, 'chains: and Delhi, first in South and Central Asia', JSON.stringify(a.DELHI));
  check(a.JERUSALEM && !a.JERUSALEM.locked, 'chains: and Jerusalem, the fourth free city', JSON.stringify(a.JERUSALEM));
  check(a.MARRAKECH && !a.MARRAKECH.gated && !a.MARRAKECH.locked, 'chains: and Marrakech; Jerusalem is no step in front of the paid cities', JSON.stringify(a.MARRAKECH));
  check(a.ISTANBUL?.gated && /ROME/i.test(a.ISTANBUL.note), 'chains: Istanbul waits on a street in Rome, not the city before it in the list', JSON.stringify(a.ISTANBUL));
  check(a.CHICAGO?.gated && /SAN FRANCISCO/i.test(a.CHICAGO.note), 'chains: Chicago waits on San Francisco', JSON.stringify(a.CHICAGO));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('cityrunner2'));
    s.stars.rome = 1;
    localStorage.setItem('cityrunner2', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(900);
  const b = await cards();
  check(b.ISTANBUL && !b.ISTANBUL.gated && !b.ISTANBUL.locked, 'chains: a street in Rome opens Istanbul', JSON.stringify(b.ISTANBUL));
  check(!errors.length, 'chains: no page errors', errors[0] || '');
  await ctx.close();
}

await browser.close();

console.log(`\n${failures ? `x ${failures} entitlement check(s) failed` : 'ok entitlements — all checks passed'}`);
process.exit(failures ? 1 : 0);
