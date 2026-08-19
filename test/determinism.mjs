/**
 * Determinism test — the proof the daily challenge actually works.
 *
 * The daily challenge promises every player worldwide the same course. That
 * only holds if a seed reproduces an identical obstacle layout. This asserts:
 *
 *   1. The same seed, loaded twice, yields an identical layout (lane, kind,
 *      hitbox and z position of every obstacle, in the same order).
 *   2. Two different seeds yield different layouts (i.e. the seed is actually
 *      being used, rather than everything being accidentally constant).
 *   3. Today's daily seed is stable across a day and picks the same city.
 *
 * Usage: node test/determinism.mjs [baseUrl]      (npm run test:determinism)
 */
import { webkit, devices } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4173';

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 15'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

/** Fingerprint the obstacle layout of a freshly-generated track. */
async function layoutFor(seed) {
  await page.goto(`${BASE}/?view=run&city=nyc&level=2&god=1&seed=${seed}`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  return page.evaluate(() => {
    const { track } = window.__cr;
    if (!track) return null;
    // Chunks are generated up front, so read them without letting the track
    // scroll — position within the chunk is what determinism must preserve.
    return track.obstacles
      .map((o) => `${o.chunk.position.z}|${o.localZ.toFixed(3)}|${o.lane}|${o.kind}|${o.y1}|${o.halfLen}`)
      .join('\n');
  });
}

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) console.log(`✓ ${name}`);
  else { failures++; console.log(`✗ ${name}${detail ? '\n    ' + detail : ''}`); }
};

// 1. same seed twice
const a1 = await layoutFor(12345);
const a2 = await layoutFor(12345);
check('same seed reproduces an identical layout', a1 && a1 === a2,
  a1 && a2 ? `first ${a1.split('\n').length} rows, second ${a2.split('\n').length}` : 'no layout captured');

// 2. different seeds differ
const b1 = await layoutFor(99999);
check('a different seed produces a different layout', b1 && b1 !== a1);

// 3. non-trivial
check('layout is non-trivial (obstacles were generated)', a1 && a1.split('\n').length >= 5,
  a1 ? `${a1.split('\n').length} obstacles` : 'none');

// 4. daily seed stability + city selection
await page.goto(`${BASE}/?view=run&city=nyc&level=1&god=1`, { waitUntil: 'load' });
await page.waitForTimeout(1200);
const daily = await page.evaluate(() => {
  const t = window.__cr.todaysDaily;
  const morning = t(new Date(Date.UTC(2026, 7, 2, 5, 0, 0)));
  const evening = t(new Date(Date.UTC(2026, 7, 2, 23, 0, 0)));
  const tomorrow = t(new Date(Date.UTC(2026, 7, 3, 12, 0, 0)));
  return { morning, evening, tomorrow };
});
check('daily seed is identical all day (UTC)',
  daily.morning.seed === daily.evening.seed && daily.morning.cityIdx === daily.evening.cityIdx,
  `05:00 seed ${daily.morning.seed} city ${daily.morning.cityIdx} · 23:00 seed ${daily.evening.seed} city ${daily.evening.cityIdx}`);
check('daily seed changes at UTC midnight', daily.morning.seed !== daily.tomorrow.seed);
check('daily picks a valid city and street',
  daily.morning.cityIdx >= 0 && daily.morning.cityIdx < 4
  && daily.morning.level >= 1 && daily.morning.level <= 3,
  `city ${daily.morning.cityIdx} level ${daily.morning.level}`);

if (errors.length) { failures++; console.log('✗ JS errors:\n    ' + [...new Set(errors)].join('\n    ')); }

console.log(`\n${failures ? '✗' : '✓'} determinism — ${failures} failing`);
await browser.close();
process.exit(failures ? 1 : 0);
