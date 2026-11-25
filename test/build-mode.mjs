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
import { readFileSync } from 'node:fs';

const { base: BASE, close } = await resolveBase(process.argv[2]);
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};
const browser = await webkit.launch();
// Every city id, so the one-time "drag to build" card can be marked as seen
// in the save (it would otherwise hold the first dragged build of each city).
const CITY_IDS = [...readFileSync(new URL('../src/cities/themes.js', import.meta.url), 'utf8')
  .matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
const errors = [];

async function open({ native = false, owned = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(([nat, own, ids]) => {
    if (nat) window.Capacitor = { isNativePlatform: () => true };
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('cityrunner2.ent', JSON.stringify(own));
    localStorage.setItem('cityrunner2', JSON.stringify({ stars: { nyc: 1 }, coins: 40, best: 1234, newsSeen: '1.2.0',
      dragTold: Object.fromEntries(ids.map((id) => [id, true])), seenMissingHelp: true }));
  }, [native, owned, CITY_IDS]);
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

// ---- the daily build ------------------------------------------------------------
const KNOWN_BUILD_WEEK = {
  3: 'castillo,domerock,coit,geunjeongjeon,giantswing,bluemosque,qiniandian',
};
// One monument a day, the same for everyone. Its schedule is pinned per daily
// version, as the run daily's pool is (test/determinism.mjs): players on
// different app versions must never build different monuments for one board.
{
  const { page, ctx } = await open();
  const sched = await page.evaluate(() => {
    const t = window.__cr.todaysBuild, d = window.__cr.todaysDaily;
    const at = (h, day = 2) => t(new Date(Date.UTC(2026, 11, day, h)));
    const week = [];
    let clash = 0;
    for (let k = 0; k < 60; k++) {
      const date = new Date(Date.UTC(2026, 11, 1 + k, 12));
      const b = t(date), r = d(date);
      if (b.cityIdx === r.cityIdx && b.level === r.level) clash++;
      if (k < 7) week.push(b.landmark);
    }
    return { morning: at(1).landmark, night: at(23).landmark, next: at(12, 3).landmark, week: week.join(','), clash,
      valid: week.every(Boolean) };
  });
  check(sched.morning === sched.night, 'the daily build is the same monument all day (UTC)', `${sched.morning} / ${sched.night}`);
  check(sched.valid && sched.clash === 0, 'it is always a real monument, never the run daily\'s street', `clashes in 60 days: ${sched.clash}`);
  const v = await page.evaluate(async () => (await import('/src/core/rng.js')).DAILY.version);
  console.log(`   daily build, 1-7 December 2026, daily v${v}: ${sched.week}`);
  check(KNOWN_BUILD_WEEK[v] === sched.week, 'the daily build schedule matches the one recorded for this daily version',
    `recorded: ${KNOWN_BUILD_WEEK[v] || 'none'} — a changed schedule needs a new DAILY.version and board`);

  // the card, the rules, and the day's best
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('cityrunner2')); s.mode = 'gamer'; localStorage.setItem('cityrunner2', JSON.stringify(s)); });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr && document.querySelectorAll('#city-select .city-card:not(.skel)').length);
  await openPicker(page);
  const card = await page.evaluate(() => document.getElementById('bm-daily')?.textContent || '');
  check(/TODAY'S BUILD/.test(card), "the picker leads with today's build", card.slice(0, 80));
  const daily = async (taken) => {
    await page.click('#bm-daily');
    await page.waitForFunction(() => window.__cr.state === 'puzzle' && window.__cr.puzzle, null, { timeout: 20000 });
    const r = await page.evaluate((t) => {
      const p = window.__cr.puzzle; const rules = window.__cr.rules.name;
      const hud = document.getElementById('hud-city').textContent;
      p.time = p.timeTotal - t; p.done = true;
      return { rules, hud };
    }, taken);
    await page.waitForFunction(() => window.__cr.state === 'pwin', null, { timeout: 15000 });
    return { ...r, sub: await page.evaluate(() => document.getElementById('pw-sub').textContent),
      best: await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2.playstats')).dailyBuild) };
  };
  const a = await daily(25.5);
  check(a.rules === 'newbie' && /^TODAY'S BUILD/.test(a.hud), 'it plays Newbie rules for a Gamer player too, labelled TODAY\'S BUILD',
    JSON.stringify({ rules: a.rules, hud: a.hud }));
  check(a.best?.best === 2550 && /25\.5s/.test(a.sub), 'a win records the time in hundredths', JSON.stringify({ best: a.best, sub: a.sub }));
  await page.click('#btn-build-another');
  await page.waitForFunction(() => window.__cr.state === 'ui-build', null, { timeout: 10000 });
  const b = await daily(30);
  check(b.best.best === 2550 && /best today 25\.5s/.test(b.sub), 'a slower go keeps the best of the day', JSON.stringify({ best: b.best, sub: b.sub }));
  await ctx.close();
}
// Open to everyone, as the run daily is: an unpaid phone can build today's
// monument even in a paid city. The clock is set to a day whose build is in
// one, found from the schedule.
{
  const { page, ctx } = await open({ native: true });
  const day = await page.evaluate(async () => {
    const { CITIES } = await import('/src/cities/offered.js');
    const { isPaidCity } = await import('/src/core/entitlements.js');
    for (let k = 0; k < 60; k++) {
      const date = new Date(Date.UTC(2026, 11, 1 + k, 12));
      const b = window.__cr.todaysBuild(date);
      if (isPaidCity(CITIES[b.cityIdx].id)) return date.getTime();
    }
    return null;
  });
  await page.clock.setFixedTime(day);
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr && document.querySelectorAll('#city-select .city-card:not(.skel)').length);
  const paid = await page.evaluate(() => ({ landmark: window.__cr.todaysBuild().landmark }));
  await openPicker(page);
  const lockedRow = await page.evaluate((lm) => {
    const img = [...document.querySelectorAll('#build-body .bm-city img')].find((i) => i.src.endsWith(`/${lm}.png`));
    return img?.closest('.bm-city')?.classList.contains('locked') ?? null;
  }, paid.landmark);
  await page.click('#bm-daily');
  await page.waitForFunction(() => ['puzzle', 'ui-paywall'].includes(window.__cr.state), null, { timeout: 20000 }).catch(() => {});
  const st = await page.evaluate(() => window.__cr.state);
  check(lockedRow === true && st === 'puzzle', "an unpaid phone can build today's monument in a city it has not bought",
    JSON.stringify({ landmark: paid.landmark, lockedInPicker: lockedRow, state: st }));
  await ctx.close();
}

check(!errors.length, 'no page errors', errors[0] || '');
await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} Build mode check(s) failed` : 'ok build mode — owned monuments only, nothing awarded but a best time'}`);
process.exit(failures ? 1 : 0);
