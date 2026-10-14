/**
 * Painted text — a GATE, wired into `npm test`.
 *
 * Shop signs, billboards and the boards over the roll-under obstacles are
 * painted onto canvases from each street's word lists. San Francisco's first
 * street set `ads: []`, and indexing an empty list painted "undefined" on its
 * signs (device feedback). This loads every street, records every string the
 * game paints onto a canvas, and fails on any that came from a missing value.
 *
 * Usage: node test/sign-text.mjs [baseUrl]
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
const BAD = /undefined|NaN|null|\[object/;

async function street(city, level) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    window.__painted = [];
    for (const fn of ['fillText', 'strokeText']) {
      const orig = CanvasRenderingContext2D.prototype[fn];
      CanvasRenderingContext2D.prototype[fn] = function (text, ...rest) {
        window.__painted.push(String(text));
        return orig.call(this, text, ...rest);
      };
    }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?view=run&city=${city}&level=${level}&seed=7&god=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
  // 600 m in, past many obstacle rows: driven in code rather than waited
  // for, so a slow machine (software WebGL on a CI runner) sees the same
  // stretch of street as a fast one. A street whose only text is on its
  // overhead signs can paint nothing in its opening chunks.
  const painted = await page.evaluate(() => {
    const t = window.__cr.track;
    const away = { hitbox: () => ({ x: 999, y0: 50, y1: 51, r: 0.4 }) };
    for (let i = 0; i < 2000 && t.distance < Math.min(600, t.goal - 10); i++) t.update(0.05, 30, away, () => {}, () => {});
    return window.__painted;
  });
  await ctx.close();
  return { painted, errors };
}

const cities = ['nyc', 'paris', 'london', 'rome', 'sf', 'jerusalem', 'mexico', 'marrakech', 'delhi', 'bangkok', 'capetown', 'hanoi', 'seoul', 'samarkand', 'zanzibar', 'beijing', 'havana', 'istanbul', 'chicago', 'buenosaires'];
const jobs = [];
for (const c of cities) for (const lv of [1, 2, 3]) jobs.push([c, lv]);
// a few at a time: every page runs WebGL
for (let i = 0; i < jobs.length; i += 5) {
  const batch = await Promise.all(jobs.slice(i, i + 5).map(([c, lv]) => street(c, lv).then((r) => ({ c, lv, ...r }))));
  for (const { c, lv, painted, errors } of batch) {
    const bad = [...new Set(painted.filter((t) => BAD.test(t)))];
    check(painted.length > 0 && bad.length === 0, `${c} street ${lv}: painted text is all real words`,
      bad.length ? `bad: ${bad.join(' | ')}` : `${new Set(painted).size} distinct strings`);
    if (errors.length) check(false, `${c} street ${lv}: no page errors`, errors[0]);
  }
}

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} sign-text check(s) failed` : 'ok sign text — no undefined on any street'}`);
process.exit(failures ? 1 : 0);
