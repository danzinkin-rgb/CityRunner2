/**
 * Soak test — a PROBE, not a gate (it takes as long as you give it).
 *
 * Plays street after street in real time, Gamer mode with collisions off so
 * each street runs to its end, then builds that street's monument, then
 * moves to the next city. After each it prints frame time (p50/p95), GPU
 * textures, geometries and shader programs, the page's element count and the
 * track's live lists. Every column should hold flat; a column that climbs
 * is a leak. October 2026, before 1.2.0: 38 streets and monuments in 30
 * minutes, all flat, no page errors.
 *
 * Usage: node test/soak.mjs [minutes]      (default 30)
 */
import { webkit } from 'playwright';
import { resolveBase } from './serve.mjs';
import { readFileSync } from 'node:fs';
const src = readFileSync('src/cities/themes.js', 'utf8');
const CITIES = [...src.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
const MINUTES = +(process.argv[2] || 30);
const { base: BASE, close } = await resolveBase();
const b = await webkit.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript((ids) => { if (!localStorage.getItem('cityrunner2')) localStorage.setItem('cityrunner2', JSON.stringify({ stars: {}, coins: 0, best: 0, mode: 'gamer', dragTold: Object.fromEntries(ids.map((c) => [c, true])) })); }, CITIES);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
await page.goto(`${BASE}/?view=run&city=nyc&level=1&god=1&allcities=1`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__cr?.track, null, { timeout: 30000 });
const frames = (ms) => page.evaluate((ms) => new Promise((res) => { const ts = []; let last = performance.now(); const t0 = last; const tick = (t) => { ts.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(tick); else { ts.sort((a, b) => a - b); res({ p50: +ts[Math.floor(ts.length / 2)].toFixed(1), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(1) }); } }; requestAnimationFrame(tick); }), ms);
const t0 = Date.now();
let i = 0;
console.log('min  street        p50/p95 ms   tex  geo  prog  dom  obstacles coins');
while (Date.now() - t0 < MINUTES * 60000) {
  const c = CITIES[i % CITIES.length], lv = 1 + (i % 3);
  await page.evaluate(([c, lv]) => window.__cr.go(c, lv), [c, lv]);
  await page.waitForTimeout(1500);
  // play the street in real time until it ends (god mode), up to 3 minutes
  const f = await frames(3000);
  await page.waitForFunction(() => window.__cr.state !== 'run', null, { timeout: 180000, polling: 1000 }).catch(() => {});
  // and build its monument for a while
  await page.evaluate(([c, lv]) => window.__cr.go(c, lv, true), [c, lv]);
  await page.waitForTimeout(6000);
  const s = await page.evaluate(() => ({ g: window.__cr.gpu, dom: document.getElementsByTagName('*').length,
    obs: window.__cr.track?.obstacles?.length ?? 0, coins: window.__cr.track?.coins?.length ?? 0 }));
  const min = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`${min.padStart(4)} ${(c + lv).padEnd(13)} ${String(f.p50).padStart(5)}/${String(f.p95).padStart(5)}   ${String(s.g.textures).padStart(4)} ${String(s.g.geometries).padStart(4)} ${String(s.g.programs).padStart(4)} ${String(s.dom).padStart(5)} ${String(s.obs).padStart(5)} ${String(s.coins).padStart(5)}`);
  i++;
}
console.log(`\n${i} streets and monuments in ${MINUTES} min; page errors: ${errs.length ? errs.slice(0, 3).join(' | ') : 'none'}`);
await b.close(); await close();
