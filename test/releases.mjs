/**
 * The city release queue — a GATE, wired into `npm test`.
 *
 * New cities ship one at a time: a finished city waits in RELEASE_QUEUE
 * (src/cities/releases.js), merged and tested but hidden from players, until
 * its release. This checks that a player build offers exactly the released
 * cities (menu and souvenir list; NEXT LEVEL and Game Center read the same
 * list) while tester builds and the test
 * routes still reach the queued ones.
 *
 * Usage: node test/releases.mjs [baseUrl]
 */
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolveBase } from './serve.mjs';

const { base: BASE, close } = await resolveBase(process.argv[2]);
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

const themes = readFileSync(new URL('../src/cities/themes.js', import.meta.url), 'utf8');
const ALL = [...themes.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
const QUEUE = JSON.parse(readFileSync(new URL('../src/cities/releases.js', import.meta.url), 'utf8')
  .match(/RELEASE_QUEUE = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
const RELEASED = ALL.filter((c) => !QUEUE.includes(c));
console.log(`released [${RELEASED.join(', ')}]  queued [${QUEUE.join(', ')}]`);

check(QUEUE.every((c) => ALL.includes(c)), 'every queued city exists in themes.js', QUEUE.join(', '));
check(new Set(QUEUE).size === QUEUE.length, 'no city is queued twice');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const placeholders = (html.match(/class="city-card skel"/g) || []).length;
check(placeholders === RELEASED.length, 'index.html has one menu placeholder per released city',
  `${placeholders} placeholders, ${RELEASED.length} released`);

const browser = await webkit.launch();
const cardsAt = async (url) => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelectorAll('#city-select .city-card:not(.skel)').length, null, { timeout: 20000 });
  const r = await page.evaluate(() => ({
    names: [...document.querySelectorAll('#city-select .city-card:not(.skel) .name')].map((n) => n.textContent.trim()),
    souvenirs: [...document.querySelectorAll('.souv')].filter((s) => getComputedStyle(s).display !== 'none').length,
  }));
  return { ...r, errors, page };
};
const nameOf = (id) => themes.match(new RegExp(`id: '${id}', name: '([^']+)'`))[1];

// a player: the plain page (the store build is checked in release-build.mjs)
const player = await cardsAt(`${BASE}/`);
check(JSON.stringify(player.names) === JSON.stringify(RELEASED.map(nameOf)), 'a player sees exactly the released cities',
  player.names.join(', '));
check(!player.errors.length, 'player: no page errors', player.errors[0] || '');
check(player.souvenirs === RELEASED.length, 'the souvenir list names only released cities',
  `${player.souvenirs} shown`);
// the tester build sees every city
const tester = await cardsAt(`${BASE}/?tester=1`);
check(tester.names.length === ALL.length, 'a tester build sees every city, queued ones included', tester.names.join(', '));
check(tester.souvenirs === ALL.length, 'and every souvenir', `${tester.souvenirs} shown`);
// the test routes reach a queued city
if (QUEUE.length) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto(`${BASE}/?view=run&city=${QUEUE[0]}&level=1&god=1`, { waitUntil: 'load' });
  const ok = await page.waitForFunction((id) => window.__cr?.track?.theme?.id === id, QUEUE[0], { timeout: 20000 }).then(() => true, () => false);
  check(ok, 'the test routes still reach a queued city', QUEUE[0]);
}
await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} release check(s) failed` : 'ok releases — players see only released cities'}`);
process.exit(failures ? 1 : 0);
