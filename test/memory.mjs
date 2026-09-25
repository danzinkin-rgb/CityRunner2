/**
 * GPU memory across a session — a GATE, wired into `npm test`.
 *
 * Found from a crash on a real phone: GPU textures were never released
 * between streets. The street builders cached every texture for the whole
 * session, and the sky and sun were repainted per street without the old
 * ones being freed. Measured before the fix: 209 textures after the first
 * street, 902 after seventeen, each up to half a megabyte — and iOS kills
 * the WebView long before that is any real surprise.
 *
 * This drives one page through many streets and puzzles IN-SESSION (a page
 * reload would reset memory and hide exactly this kind of leak) and asserts
 * that the texture count is bounded and does not creep on revisits.
 *
 * Usage: node test/memory.mjs [baseUrl]
 */
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBase } from './serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const themesSrc = readFileSync(join(HERE, '..', 'src', 'cities', 'themes.js'), 'utf8');
const CITIES = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);

const { base: BASE, close } = await resolveBase(process.argv[2]);
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await webkit.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${BASE}/?view=run&city=${CITIES[0]}&level=1&god=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });

const visit = async (c, l, asPuzzle = false) => {
  await page.evaluate(([c, l, p]) => window.__cr.go(c, l, p), [c, l, asPuzzle]);
  await page.waitForTimeout(1800);
  return page.evaluate(() => window.__cr.gpu.textures);
};

// every city's first street and its monument, then every city again
const first = await visit(CITIES[0], 1);
const counts = [first];
for (const c of CITIES) { counts.push(await visit(c, 1)); counts.push(await visit(c, 1, true)); }
for (const c of CITIES) counts.push(await visit(c, 2));
const again = await visit(CITIES[0], 1);
counts.push(again);

const peak = Math.max(...counts);
check(peak < 300, 'GPU textures stay bounded across a session', `peak ${peak} over ${counts.length} streets/puzzles`);
check(again <= first * 1.5 + 20, 'revisiting a street does not add up', `first ${first}, revisit ${again}`);
check(!errors.length, 'no page errors', errors[0] || '');

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} memory check(s) failed` : 'ok memory — textures are released between streets'}`);
process.exit(failures ? 1 : 0);
