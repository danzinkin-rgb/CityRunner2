/**
 * Build mode — a GATE, wired into `npm test`.
 *
 * Build mode (docs/BUILD-MODE-PROPOSAL.md, November 2026) builds any owned
 * monument with every piece provided and awards nothing. This checks the
 * promises that make it safe to ship:
 *
 *   - the picker offers exactly the cities the player owns: everything on
 *     the web, the free four on an unpaid phone, plus a pack's cities once
 *     bought; a city not owned opens the purchase screen;
 *   - a win changes no stars, no scores, no lifetime total and no ghosts,
 *     and records a best time that only ever improves;
 *   - a timed-out build says so, with no score, and offers another go;
 *   - BUILD ANOTHER and the back button return to the picker, and the run's
 *     own result screens are put back afterwards.
 *
 * Usage: node test/build-mode.mjs [baseUrl]
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

async function open({ native = false, owned = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([nat, own]) => {
    if (nat) window.Capacitor = { isNativePlatform: () => true };
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cityrunner2.ent', JSON.stringify(own));
    localStorage.setItem('cityrunner2', JSON.stringify({ stars: { nyc: 1 }, coins: 40, best: 1234, newsSeen: '1.2.0',
      dragTold: new Proxy({}, { get: () => true }), seenMissingHelp: true }));
  }, [native, owned]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?view=menu`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#city-select .city-card:not(.skel)').length);
  return { page, ctx };
}
const picker = (page) => page.evaluate(() => [...document.querySelectorAll('#build-body .bm-city')].map((r) => ({
  name: r.querySelector('.bm-name').textContent.replace('🔒', '').trim(), locked: r.classList.contains('locked'),
})));
const openPicker = async (page) => {
  await page.click('#btn-buildmode');
  await page.waitForFunction(() => window.__cr?.state === 'ui-build', null, { timeout: 10000 });
};

// ---- what the picker offers -------------------------------------------------
{
  const { page, ctx } = await open();
  await openPicker(page);
  const rows = await picker(page);
  check(rows.length >= 20 && rows.every((r) => !r.locked), 'web: every city is offered, none locked', `${rows.length} cities`);
  await ctx.close();
}
{
  const { page, ctx } = await open({ native: true });
  await openPicker(page);
  const rows = await picker(page);
  const open4 = rows.filter((r) => !r.locked).map((r) => r.name).sort().join(',');
  check(open4 === 'Jerusalem,London,New York,Paris', 'phone, nothing bought: only the four free cities are open', open4);
  await page.click('.bm-city.locked .bm-tile');
  await page.waitForFunction(() => window.__cr.state === 'ui-paywall', null, { timeout: 10000 }).catch(() => {});
  check(await page.evaluate(() => window.__cr.state) === 'ui-paywall', 'a locked city opens the purchase screen');
  await page.click('#btn-paywall-close');
  check(await page.evaluate(() => window.__cr.state) === 'ui-build', 'closing it returns to the picker');
  await ctx.close();
}
{
  const { page, ctx } = await open({ native: true, owned: ['uk.co.zinkin.cityrunner.pack.europe'] });
  await openPicker(page);
  const rows = await picker(page);
  const rome = rows.find((r) => r.name === 'Rome'), sf = rows.find((r) => r.name === 'San Francisco');
  check(rome && !rome.locked && sf?.locked, 'phone with the Europe pack: Rome is open, San Francisco is not',
    JSON.stringify({ rome, sf }));
  await ctx.close();
}

// ---- a win awards nothing but a best time ------------------------------------
{
  const { page, ctx } = await open();
  const snap = () => page.evaluate(() => ({
    stars: JSON.stringify(JSON.parse(localStorage.getItem('cityrunner2')).stars),
    best: JSON.parse(localStorage.getItem('cityrunner2')).best,
    scores: localStorage.getItem('cityrunner2.scores'),
    lifetime: localStorage.getItem('cityrunner2.lifetime'),
    ghosts: localStorage.getItem('cityrunner2.ghosts'),
  }));
  const before = await snap();
  await openPicker(page);
  const build = async (taken) => {
    await page.click('#build-body .bm-city:nth-of-type(2) .bm-tile');   // New York, the Empire State
    await page.waitForFunction(() => window.__cr.state === 'puzzle' && window.__cr.puzzle, null, { timeout: 20000 });
    await page.evaluate((t) => { const p = window.__cr.puzzle; p.time = p.timeTotal - t; p.done = true; }, taken);
    await page.waitForFunction(() => window.__cr.state === 'pwin', null, { timeout: 15000 });
    return page.evaluate(() => ({
      sub: document.getElementById('pw-sub').textContent,
      next: getComputedStyle(document.getElementById('btn-next')).display,
      another: getComputedStyle(document.getElementById('btn-build-another')).display,
      best: JSON.parse(localStorage.getItem('cityrunner2.playstats')).best,
    }));
  };
  const a = await build(20);
  check(/built in 20s/.test(a.sub) && a.next === 'none' && a.another !== 'none', 'a win shows the time and BUILD ANOTHER, not NEXT LEVEL', JSON.stringify(a));
  const after = await snap();
  check(JSON.stringify(after) === JSON.stringify(before), 'a win changes no stars, best score, scores, lifetime total or ghosts',
    JSON.stringify({ before, after }));
  await page.evaluate(() => window.__cr.back());
  await page.waitForFunction(() => window.__cr.state === 'ui-build', null, { timeout: 10000 }).catch(() => {});
  check(await page.evaluate(() => window.__cr.state) === 'ui-build', 'back from the win screen returns to the picker');
  const b = await build(30);
  check(b.best.empire === 20, 'a slower build keeps the best time', JSON.stringify(b.best));
  await page.click('#btn-build-another');
  await page.waitForFunction(() => window.__cr.state === 'ui-build', null, { timeout: 10000 });
  const c = await build(12);
  check(c.best.empire === 12, 'a faster build improves it', JSON.stringify(c.best));
  const tile = await page.evaluate(() => {
    document.getElementById('btn-build-another').click();
    return null;
  });
  await page.waitForFunction(() => window.__cr.state === 'ui-build', null, { timeout: 10000 });
  const shown = await page.evaluate(() => document.querySelector('#build-body .bm-city:nth-of-type(2) .bm-best').textContent);
  check(/best 12s/.test(shown), 'the picker shows the best time', shown);

  // ---- running out of time ---------------------------------------------------
  await page.click('#build-body .bm-city:nth-of-type(2) .bm-tile');
  await page.waitForFunction(() => window.__cr.state === 'puzzle' && window.__cr.puzzle, null, { timeout: 20000 });
  await page.evaluate(() => { window.__cr.puzzle.time = 0.05; });
  await page.waitForFunction(() => window.__cr.state === 'over', null, { timeout: 15000 });
  const over = await page.evaluate(() => ({
    title: document.getElementById('over-title').textContent,
    score: getComputedStyle(document.getElementById('over-score')).display,
    retry: document.getElementById('btn-retry').textContent,
    another: getComputedStyle(document.getElementById('btn-over-build')).display,
  }));
  check(over.title === 'Out of time' && over.score === 'none' && over.retry === 'TRY AGAIN' && over.another !== 'none',
    'a timed-out build says so, shows no score, and offers TRY AGAIN and BUILD ANOTHER', JSON.stringify(over));
  check(JSON.stringify(await snap()) === JSON.stringify(before), 'and changes no scores either');

  // ---- back to the menu: the run's result screens are put back ---------------
  await page.click('#btn-menu');
  await page.waitForFunction(() => window.__cr.state === 'menu', null, { timeout: 10000 });
  const restored = await page.evaluate(() => ({
    score: getComputedStyle(document.getElementById('over-score')).display,
    retry: document.getElementById('btn-retry').textContent,
    sub: document.getElementById('pw-sub').textContent,
  }));
  check(restored.score !== 'none' && restored.retry === 'RUN AGAIN' && /bonus/.test(restored.sub),
    "the run's result screens are back to normal", JSON.stringify(restored));
  const stats = await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2.playstats')));
  check(stats.buildWins === 3 && stats.runs === 0 && stats.buildMs > 0, 'the play summary counts the builds and their time, and no runs',
    JSON.stringify({ buildWins: stats.buildWins, runs: stats.runs, buildMs: Math.round(stats.buildMs) }));
  await ctx.close();
}

check(!errors.length, 'no page errors', errors[0] || '');
await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} Build mode check(s) failed` : 'ok build mode — owned monuments only, nothing awarded but a best time'}`);
process.exit(failures ? 1 : 0);
