/**
 * Daily-challenge rules and the erase route — a GATE, wired into `npm test`.
 *
 * WHY IT EXISTS. A code review of the live 1.0 build found that the daily
 * challenge leaked in two ways, both silent, both only visible by playing
 * the whole loop through:
 *
 *   1. NEXT LEVEL after a daily win kept dailyMode on. Daily mode skips the
 *      paywall (so every player worldwide gets the same course), so a free
 *      player could win a daily and keep tapping NEXT into paid cities.
 *   2. A daily win awarded stars. The daily's city comes from the date, not
 *      the player's progress, so that opened cities out of order and handed
 *      out progress in paid content.
 *
 * And "Erase my data" left characters bought with souvenirs, and the daily
 * streak, in the save — it reset three fields and re-persisted the rest.
 *
 * Usage: node test/daily-rules.mjs [baseUrl]
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

// ------------------------------------------------ a daily win, native, unpaid
// Native, so the paywall is real. ?daily puts the run on today's course,
// ?celebrate completes the monument, and finishPuzzle() runs for real.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true };
    if (localStorage.getItem('cityrunner2') == null) {
      localStorage.setItem('cityrunner2', JSON.stringify({ stars: {}, coins: 0, best: 0 }));
    }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?view=puzzle&daily&celebrate=1`, { waitUntil: 'load' });
  // the win modal waits 4.3s so the celebration plays out first
  await page.waitForFunction(
    () => document.getElementById('screen-puzzle-win').classList.contains('on'),
    null, { timeout: 15000 },
  ).catch(() => {});
  const r = await page.evaluate(() => ({
    pwin: document.getElementById('screen-puzzle-win').classList.contains('on'),
    nextShown: getComputedStyle(document.getElementById('btn-next')).display !== 'none',
    stars: JSON.parse(localStorage.getItem('cityrunner2') || '{}').stars || {},
    daily: window.__cr && window.__cr.todaysDaily ? window.__cr.todaysDaily() : null,
  }));
  check(r.pwin, 'a daily monument can be won (the win screen appears)');
  check(!r.nextShown, 'NEXT LEVEL is hidden after a daily win');
  check(Object.keys(r.stars).length === 0, 'a daily win awards no stars', JSON.stringify(r.stars));
  check(!errors.length, 'daily: no page errors', errors[0] || '');
  await ctx.close();
}

// ---------------------------------------------------- erase really erases
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cityrunner2', JSON.stringify({
      stars: { nyc: 3 }, coins: 900, best: 5000,
      characters: ['runner', 'skater'], equipped: 'skater',
      dailyStreak: 6, dailyLast: '2026-01-01', factCursor: { 's:nyc:1': 2 },
      reducedMotion: true, touchButtons: true,
    }));
  });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept());
  await page.goto(`${BASE}/?ui=settings`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.click('#set-erase');
  await page.waitForTimeout(400);
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2') || '{}'));
  check(JSON.stringify(s.characters) === '["runner"]', 'erase removes characters bought with souvenirs',
    JSON.stringify(s.characters));
  check(s.equipped === 'runner', 'erase resets the equipped character', s.equipped);
  check(s.dailyStreak === undefined && s.dailyLast === undefined, 'erase clears the daily streak',
    `${s.dailyStreak}/${s.dailyLast}`);
  check(s.factCursor === undefined, 'erase clears the fact cursor');
  check(Object.keys(s.stars || {}).length === 0 && s.coins === 0 && s.best === 0,
    'erase clears stars, souvenirs and best');
  check(s.reducedMotion === true && s.touchButtons === true,
    'erase keeps the accessibility settings', `${s.reducedMotion}/${s.touchButtons}`);
  await ctx.close();
}

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} daily/erase check(s) failed` : 'ok daily rules — no progress, no carry-over, a real erase'}`);
process.exit(failures ? 1 : 0);
