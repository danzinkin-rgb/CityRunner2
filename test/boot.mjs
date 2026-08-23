/**
 * Loading-state gate — the menu must not move when the city cards arrive.
 *
 * This is a GATE, not a probe: it exits non-zero and is wired into `npm test`.
 *
 * WHAT IT GUARDS. The menu markup ships in index.html, but its CONTENT does
 * not: the city cards, their thumbnails and the saved stars are all painted by
 * buildCitySelect() in src/main.js, which cannot run until three.js has been
 * downloaded and parsed. On a phone on mobile data that is not instant. What
 * the player used to see was a title sitting above an empty row, then the RUN
 * button and the daily card jumping down as the cards landed under them.
 *
 * The fix is that index.html ships placeholder cards — one per city — so the
 * row is already the right height and wraps the same way. This suite is what
 * stops that quietly rotting, because it rots in a way nobody notices locally:
 * on a fast machine the cards arrive so quickly that a wrong placeholder height
 * is a flicker you have to be looking for.
 *
 * WHY NOT AN OVERLAY. A full-screen loading screen with its own copy of the
 * title was built first and measured: because the menu is a tall column (title,
 * subtitle, four cards, RUN, daily card) and an overlay is a short centred one,
 * the title landed 274-367px apart in the two states and visibly jumped at the
 * handover. Holding the real layout open is the only version with no jump in
 * it. If someone reaches for an overlay again, this suite fails.
 *
 * HOW THE PRE-JS STATE IS CAPTURED. page.route() answers src/main.js with an
 * empty body, so the page renders exactly what a player sees while the real
 * module is still in flight — no timing games, and no chance of measuring a
 * half-built menu. The same page is then loaded unrouted and measured again.
 *
 * Usage:
 *   node test/boot.mjs                 # serves the repo itself
 *   node test/boot.mjs http://host:1234
 */
import { webkit } from 'playwright';
import { resolveBase } from './serve.mjs';

const { base: BASE } = await resolveBase(process.argv[2]);
const browser = await webkit.launch();

let failures = 0;
const check = (ok, what, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : '  X   '}${what}${detail ? `   ${detail}` : ''}`);
};

/**
 * Sub-pixel differences are real layout, not noise: a font that rounds
 * differently between the two loads would show up here, and 0.5px is below
 * anything a player could see while still being tight enough to catch a
 * placeholder that is one text row short.
 */
const TOL = 0.5;

/**
 * Three viewports because the card row WRAPS. Four 150px cards fit on one line
 * on the iPad and take two lines on both phones, so a placeholder that is right
 * at one width can still be wrong at another — which is exactly the bug a fixed
 * min-height on #city-select would have shipped.
 */
const SIZES = [
  { name: 'iphone-15', width: 393, height: 852 },
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'ipad', width: 820, height: 1180 },
];

/** Everything the menu's layout is made of, measured the same way in both states. */
const MEASURE = () => {
  const r = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: b.top, height: b.height };
  };
  return {
    title: r('#screen-menu .title'),
    cities: r('#city-select'),
    run: r('#btn-play'),
    daily: r('#daily-card'),
    cards: document.querySelectorAll('#city-select > *').length,
    // Per-card geometry, because the row can be the right total height while
    // the cards inside it are the wrong shape. That is not hypothetical: the
    // placeholders first shipped about a third of their real width, as tall
    // narrow slivers, and every height assertion above passed.
    card: [...document.querySelectorAll('#city-select > *')].map((el) => {
      const b = el.getBoundingClientRect();
      return { top: b.top, left: b.left, width: b.width, height: b.height };
    }),
    busy: document.getElementById('city-select')?.getAttribute('aria-busy') ?? null,
  };
};

// The count the placeholders have to match. Read from the real module through
// the browser rather than parsed out of the file, so adding a city to
// src/cities/themes.js is what moves this number and nothing else has to agree.
const countCtx = await browser.newContext();
const countPage = await countCtx.newPage();
await countPage.goto(`${BASE}/`, { waitUntil: 'load' });
const CITY_COUNT = await countPage.evaluate(async () => {
  const m = await import('/src/cities/themes.js');
  return m.CITIES.length;
});
await countCtx.close();
console.log(`\nsrc/cities/themes.js declares ${CITY_COUNT} cities\n`);
check(CITY_COUNT > 0, 'themes.js CITIES is readable');

for (const s of SIZES) {
  console.log(`${s.name} ${s.width}x${s.height}`);
  const ctx = await browser.newContext({
    viewport: { width: s.width, height: s.height },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // --- before: the real module held, so the placeholders are what is on screen
  await page.route('**/src/main.js', (r) =>
    r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* held */' }));
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(250);
  const before = await page.evaluate(MEASURE);

  // --- after: the same page with the module allowed through
  await page.unroute('**/src/main.js');
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(1400);
  const after = await page.evaluate(MEASURE);

  check(before.cards === CITY_COUNT,
    `${s.name}: index.html ships one placeholder per city`,
    `${before.cards} placeholders / ${CITY_COUNT} cities`);
  check(after.cards === CITY_COUNT,
    `${s.name}: buildCitySelect() replaced them with real cards`,
    `${after.cards} cards`);

  // The four things below the fold are the ones a player watches jump.
  for (const part of ['title', 'cities', 'run', 'daily']) {
    const b = before[part];
    const a = after[part];
    if (!b || !a) { check(false, `${s.name}: ${part} exists in both states`); continue; }
    const shift = a.top - b.top;
    check(Math.abs(shift) <= TOL, `${s.name}: ${part} does not move`,
      `${shift >= 0 ? '+' : ''}${shift.toFixed(2)}px`);
  }

  for (let i = 0; i < Math.min(before.card.length, after.card.length); i++) {
    for (const dim of ['left', 'top', 'width', 'height']) {
      const d = after.card[i][dim] - before.card[i][dim];
      check(Math.abs(d) <= TOL, `${s.name}: card ${i + 1} ${dim} is unchanged`,
        `${d >= 0 ? '+' : ''}${d.toFixed(2)}px`);
    }
  }

  const grow = after.cities.height - before.cities.height;
  check(Math.abs(grow) <= TOL, `${s.name}: the card row is the same height before and after`,
    `${grow >= 0 ? '+' : ''}${grow.toFixed(2)}px`);

  // aria-busy is the whole loading story for a screen reader here — there is
  // no visible spinner. Left set, the menu announces itself as still loading
  // forever; never set, it never announced itself as loading at all.
  check(before.busy === 'true', `${s.name}: the placeholder row is aria-busy`, String(before.busy));
  check(after.busy === null, `${s.name}: aria-busy is dropped once the cards are real`, String(after.busy));

  await ctx.close();
}

await browser.close();

console.log(`\n${failures ? `x ${failures} loading-state check(s) failed` : 'ok loading state — the menu holds still'}`);
process.exit(failures ? 1 : 0);
