/**
 * Newbie and Gamer modes — a GATE, wired into `npm test`.
 *
 * Player feedback, October 2026: a 14-year-old who knows runners found the
 * game too slow. Newbie keeps the original pace; Gamer runs faster and builds
 * every monument by dragging. Newbie scores 70% so a Gamer score is the full
 * one. Tapping a piece home survives only in Newbie, on street 1, in New York,
 * Paris and London; everywhere else a first street is dragged, and the first
 * time a city asks for that, a card says so before the clock runs.
 *
 * Checked here:
 *   - each mode's opening speed and score share, on streets 1 and 3;
 *   - the daily ignores the mode: Newbie pace, full score, for everyone;
 *   - which street-1 puzzles tap and which drag, in each mode;
 *   - the drag card: shown on a dragged street 1, holds the clock, once per city;
 *   - Gamer deals more pieces on streets 2 and 3, within its cap;
 *   - the Settings switch saves the mode.
 *
 * Usage: node test/modes.mjs [baseUrl]
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
const errors = [];

/** A fresh page whose save holds `extra` (mode, cards seen) on first load only. */
async function open(query, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((x) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cityrunner2', JSON.stringify({ stars: { nyc: 3, paris: 3, london: 3, rome: 3 }, coins: 0, best: 0, ...x }));
  }, extra);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load' });
  return { page, ctx };
}

// ---- run speed and score share --------------------------------------------
for (const [mode, lv, speed, mul] of [['newbie', 1, 14, 0.7], ['newbie', 3, 20, 0.7], ['gamer', 1, 20, 1], ['gamer', 3, 26, 1]]) {
  const { page, ctx } = await open(`?view=run&city=nyc&level=${lv}&god=1&seed=5`, { mode });
  await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
  const r = await page.evaluate(() => ({ name: window.__cr.rules.name, start: window.__cr.track.speed, mul: window.__cr.rules.scoreMul }));
  check(r.name === mode && r.mul === mul, `${mode} street ${lv}: scores ${mul * 100}%`, JSON.stringify(r));
  check(Math.abs(r.start - speed) < 1.5, `${mode} street ${lv}: opens at about ${speed} m/s`, `${r.start.toFixed(1)}`);
  await ctx.close();
}

// ---- the daily ignores the mode ---------------------------------------------
{
  const { page, ctx } = await open('?view=run&daily=1&god=1', { mode: 'gamer' });
  await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
  const r = await page.evaluate(() => ({ name: window.__cr.rules.name, mul: window.__cr.rules.scoreMul }));
  check(r.name === 'newbie' && r.mul === 1, 'the daily runs at Newbie pace and full score, even for a Gamer', JSON.stringify(r));
  await ctx.close();
}

// ---- which street-1 puzzles tap ---------------------------------------------
const told = { dragTold: { nyc: true, paris: true, london: true, rome: true, sf: true } };
for (const [mode, city, lv, want] of [
  ['newbie', 'nyc', 1, 'tap'], ['newbie', 'london', 1, 'tap'], ['newbie', 'rome', 1, 'drag'], ['newbie', 'sf', 1, 'drag'],
  ['newbie', 'paris', 2, 'drag'], ['gamer', 'nyc', 1, 'drag'], ['gamer', 'paris', 1, 'drag'],
]) {
  const { page, ctx } = await open(`?view=puzzle&city=${city}&level=${lv}`, { mode, ...told });
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  const got = await page.evaluate(() => window.__cr.puzzle.mode);
  check(got === want, `${mode}, ${city} street ${lv}: built by ${want === 'tap' ? 'tapping' : 'dragging'}`, got);
  await ctx.close();
}

// ---- Gamer deals more pieces on streets 2 and 3 --------------------------------
for (const [city, lv] of [['sf', 3], ['paris', 2]]) {
  const counts = {};
  for (const mode of ['newbie', 'gamer']) {
    const { page, ctx } = await open(`?view=puzzle&city=${city}&level=${lv}`, { mode, ...told });
    await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
    counts[mode] = await page.evaluate(() => window.__cr.puzzle.items.length);
    await ctx.close();
  }
  const cap = Math.ceil(counts.newbie * (lv === 3 ? 0.5 : 0.3));
  check(counts.gamer > counts.newbie && counts.gamer <= counts.newbie + cap,
    `Gamer deals more pieces on ${city} street ${lv}, within the cap`, `${counts.newbie} -> ${counts.gamer}`);
}

// ---- the drag card ------------------------------------------------------------
{
  const { page, ctx } = await open('?view=puzzle&city=rome&level=1', { mode: 'newbie' });
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  await page.waitForTimeout(900);
  const shown = await page.evaluate(() => ({
    on: document.getElementById('drag-help').classList.contains('on'),
    text: document.getElementById('dh-text').textContent,
    state: window.__cr.state, time: window.__cr.puzzle.time,
  }));
  check(shown.on && /dragging/.test(shown.text), 'a dragged street 1 opens with the drag card', shown.text.slice(0, 60));
  await page.waitForTimeout(1500);
  const held = await page.evaluate(() => window.__cr.puzzle.time);
  check(shown.state === 'puzzle-intro' && held === shown.time, 'the clock waits while the card is up', `${shown.time} -> ${held}`);
  await page.click('#dh-ok');
  const after = await page.evaluate(() => ({
    on: document.getElementById('drag-help').classList.contains('on'), state: window.__cr.state,
    told: JSON.parse(localStorage.getItem('cityrunner2')).dragTold,
  }));
  check(!after.on && after.state === 'puzzle' && after.told?.rome === true, 'GOT IT starts the clock and remembers the city', JSON.stringify(after));
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  await page.waitForTimeout(900);
  const again = await page.evaluate(() => document.getElementById('drag-help').classList.contains('on'));
  check(!again, 'the card is not shown again for the same city');
  await ctx.close();
}
{
  const { page, ctx } = await open('?view=puzzle&city=nyc&level=1', { mode: 'newbie' });
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  await page.waitForTimeout(900);
  const on = await page.evaluate(() => document.getElementById('drag-help').classList.contains('on'));
  check(!on, 'no drag card on a tapped street 1 (Newbie, New York)');
  await ctx.close();
}

// ---- the Settings switch --------------------------------------------------------
{
  const { page, ctx } = await open('');
  await page.waitForTimeout(1200);
  await page.click('#btn-settings');
  await page.click('#set-mode');
  const r = await page.evaluate(() => ({
    label: document.getElementById('set-mode').textContent,
    saved: JSON.parse(localStorage.getItem('cityrunner2')).mode,
  }));
  check(r.label === 'GAMER' && r.saved === 'gamer', 'the Settings switch turns Gamer on and saves it', JSON.stringify(r));
  await ctx.close();
}

check(!errors.length, 'no page errors', errors[0] || '');
await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} mode check(s) failed` : 'ok modes — Newbie and Gamer behave as designed'}`);
process.exit(failures ? 1 : 0);
