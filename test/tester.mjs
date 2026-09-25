/**
 * Tester section — a GATE, wired into `npm test`.
 *
 * A tester build (npm run ios:sync:tester) adds a Tester section to Settings
 * so every street and monument can be checked on a phone without earning it.
 * Asked for after device testing stalled at street 2: "i cant test all on
 * phone as i dont finish the levels". This checks it does what it says: the
 * chosen street runs, the chosen monument builds, locks don't stop it, and an
 * invincible run neither crashes nor records a score. test/release-build.mjs
 * checks the section never reaches a release build.
 *
 * Usage: node test/tester.mjs [baseUrl]
 */
import { webkit } from 'playwright';
import { resolveBase } from './serve.mjs';

const { base: BASE, close } = await resolveBase(process.argv[2]);
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};
const browser = await webkit.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// A fresh save: nothing earned, so street 3 anywhere is locked by progression.
await page.goto(`${BASE}/?tester=1`, { waitUntil: 'load' });
await page.waitForSelector('#tester-tag');
await page.click('#btn-settings');
check(await page.isVisible('#tester'), 'Settings has a Tester section');

// Build a locked monument directly.
await page.selectOption('#tst-city', 'london');
await page.selectOption('#tst-street', '3');
const streets = await page.$$eval('#tst-street option', (o) => o.map((x) => x.textContent));
check(streets.length === 3 && /Westminster|Parliament|Big|3 ·/.test(streets[2]), 'street picker follows the city', streets.join(' | '));
await page.click('#tst-build');
// __cr only exists with ?view=, so read the puzzle through its timer
await page.waitForFunction(() => getComputedStyle(document.getElementById('hud-timer')).display === 'block',
  null, { timeout: 15000 }).catch(() => {});
const timer = await page.evaluate(() => ({
  shown: getComputedStyle(document.getElementById('hud-timer')).display === 'block',
  text: document.getElementById('hud-timer').textContent,
  paywall: document.getElementById('screen-paywall')?.classList.contains('on') || false,
}));
check(timer.shown && !timer.paywall, 'Build the monument opens a locked street 3 monument', JSON.stringify(timer));

// Now a run, invincible, via the same section.
await page.goto(`${BASE}/?tester=1&view=run&city=nyc&level=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
await page.evaluate(() => { document.getElementById('btn-settings').click(); });
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('tst-god').click());
check(await page.textContent('#tst-god') === 'ON', 'Invincible toggles on');
await page.selectOption('#tst-city', 'rome');
await page.selectOption('#tst-street', '2');
await page.evaluate(() => document.getElementById('tst-run').click());
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const before = window.__cr.state;
  window.__cr.crash();
  return { before, after: window.__cr.state, city: window.__cr.track?.theme?.id ?? null, level: window.__cr.track?.level };
});
check(r.before === 'run' && r.after === 'run', 'an invincible run does not crash', JSON.stringify(r));
check(r.level === 2, 'Run the street plays the chosen street', JSON.stringify(r));
const scoresBefore = await page.evaluate(() => localStorage.getItem('cityrunner2.scores'));
await page.evaluate(() => { window.__cr.track.goal = 1; });
await page.waitForFunction(() => document.getElementById('screen-facts').classList.contains('on'), null, { timeout: 10000 }).catch(() => {});
const after = await page.evaluate(() => ({
  best: JSON.parse(localStorage.getItem('cityrunner2') || '{}').best || 0,
  scores: localStorage.getItem('cityrunner2.scores'),
}));
check(after.best === 0 && after.scores === scoresBefore, 'an invincible run records no score', JSON.stringify(after).slice(0, 120));
check(!errors.length, 'no page errors', errors[0] || '');

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} tester check(s) failed` : 'ok tester — any street, any monument, no scores when invincible'}`);
process.exit(failures ? 1 : 0);
