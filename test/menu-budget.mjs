/**
 * Diagnostic (not a gate): where does the menu's vertical height actually go?
 *
 * The menu must fit above the fold — test/ios-ui.mjs enforces that with its
 * BELOW-FOLD check. For a long time it "fit" only because .screen is a flex
 * column and its children were being silently compressed below their own
 * content to make room, which is what broke the daily card (see
 * test/menu-fit.mjs for the full mechanism). Now that nothing compresses,
 * fitting has to be earned honestly, by the content being small enough.
 *
 * This prints the per-child height budget at a given viewport so that
 * tightening the @media blocks is a measurement rather than a guess.
 *
 * Usage: node test/menu-budget.mjs [height...]   (default: 667 620 600 568)
 */
import { webkit } from 'playwright';
import { startStaticServer } from './serve.mjs';

const heights = process.argv.slice(2).map(Number).filter(Boolean);
const HEIGHTS = heights.length ? heights : [844, 740, 667, 620, 600, 568];
const WIDTH = 390;

const { base, close } = await startStaticServer();
const browser = await webkit.launch();

for (const height of HEIGHTS) {
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  // Emulate a notched iPhone's safe-area insets. env() is 0 in a headless
  // browser, so without this the budget is computed for ~93px more room than
  // the device actually has -- the gap that let the overflow ship.
  if (process.env.INSETS !== '0') {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style');
        s.textContent = `.screen{padding-top:${window.innerHeight>=812?59:20}px !important;padding-bottom:${window.innerHeight>=812?34:0}px !important}`;
        document.head.appendChild(s);
      });
    });
  }
  await page.goto(`${base}/?seed=7`, { waitUntil: 'load' });
  await page.waitForFunction(
    () => (document.getElementById('daily-best')?.textContent || '').trim().length > 0,
    null, { timeout: 5000 },
  ).catch(() => {});
  await page.waitForTimeout(250);

  const r = await page.evaluate(() => {
    const menu = document.getElementById('screen-menu');
    const rows = [];
    let total = 0;
    for (const el of menu.children) {
      const cs = getComputedStyle(el);
      if (cs.position === 'absolute' || cs.display === 'none') continue;
      const b = el.getBoundingClientRect();
      if (b.height === 0) continue;
      const mt = parseFloat(cs.marginTop) || 0, mb = parseFloat(cs.marginBottom) || 0;
      const outer = b.height + mt + mb;
      total += outer;
      rows.push({
        name: el.id || (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : el.tagName),
        h: +b.height.toFixed(1), mt, mb, outer: +outer.toFixed(1),
      });
    }
    const pad = getComputedStyle(menu);
    return {
      rows, total: +total.toFixed(1),
      padT: parseFloat(pad.paddingTop) || 0,
      padB: parseFloat(pad.paddingBottom) || 0,
      vh: window.innerHeight,
    };
  });

  const need = r.total + r.padT + r.padB;
  const over = need - r.vh;
  console.log(`\n=== ${WIDTH}x${height}  content=${need.toFixed(1)}px  viewport=${r.vh}px  ` +
    `${over > 0 ? `OVER BY ${over.toFixed(1)}px` : `fits, ${(-over).toFixed(1)}px spare`}`);
  for (const row of r.rows) {
    console.log(`   ${String(row.outer).padStart(7)}px  ${row.name}` +
      `${row.mt || row.mb ? `   (h ${row.h} + margins ${row.mt}/${row.mb})` : ''}`);
  }
  await ctx.close();
}

await browser.close();
await close();
