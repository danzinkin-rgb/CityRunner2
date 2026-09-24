/**
 * Monument pieces collected on the run — a GATE, wired into `npm test`.
 *
 * The run lays the monument's loose pieces along the street; what the
 * player collects is what they build with, and missed pieces arrive late in
 * the puzzle (or are bought in with souvenirs). Two rules matter most, and
 * both were asked for explicitly:
 *
 *   - Collecting never BUILDS anything. Every piece still has to be placed
 *     by hand; a full haul means everything is on the plaza at the start,
 *     not that the monument is already standing.
 *   - A missed piece blocks what rests on it. Pieces collected for an upper
 *     course cannot go on until the missing support below them arrives, so
 *     missing an early piece costs real time.
 *
 * Also checked: the pieces sit on the street where they should (after the
 * safe opening, before the monument, never on an obstacle row), running
 * through one collects it, and the souvenir button brings the rest.
 *
 * Usage: node test/run-pieces.mjs [baseUrl]
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
const VIEW = { viewport: { width: 390, height: 844 } };

// ------------------------------------------------------------ on the street
{
  const ctx = await browser.newContext(VIEW);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?view=run&city=paris&level=2&seed=7&god=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.track?.pieceDefs, null, { timeout: 20000 });

  const layout = await page.evaluate(() => {
    const tr = window.__cr.track;
    return { n: tr.pieceDefs.length, dist: tr.pieceDist, goal: tr.goal };
  });
  check(layout.n > 0, 'the street carries the monument\'s loose pieces', `${layout.n} pieces`);
  check(layout.dist.every((d, i) => i === 0 || d > layout.dist[i - 1]), 'pieces come in build order along the street');
  check(layout.dist[0] >= 72 && layout.dist[layout.n - 1] <= layout.goal - 40,
    'pieces start after the safe opening and end before the monument',
    `${Math.round(layout.dist[0])}m .. ${Math.round(layout.dist[layout.n - 1])}m of ${layout.goal}m`);

  // Steer onto each piece's lane as it comes up and let the run collect them.
  const got = await page.evaluate(async () => {
    const tr = window.__cr.track, pl = window.__cr.player;
    const lanes = [-2.4, 0, 2.4];
    const t0 = performance.now();
    let rowClash = 0;
    const checked = new Set();
    while (performance.now() - t0 < 14000) {
      const ahead = tr.pieces.filter((p) => !p.taken)
        .map((p) => ({ p, wz: p.mesh.position.z + p.chunk.position.z + tr.group.position.z }))
        .filter((x) => x.wz < 1).sort((a, b) => b.wz - a.wz)[0];
      if (ahead) pl.lane = lanes.indexOf(ahead.p.mesh.position.x);
      // no piece sits on an obstacle row
      for (const p of tr.pieces) {
        if (checked.has(p)) continue;
        checked.add(p);
        if (tr.obstacles.some((o) => o.chunk === p.chunk && Math.abs(o.localZ - p.mesh.position.z) < 2)) rowClash++;
      }
      await new Promise((r) => setTimeout(r, 30));
    }
    return {
      collected: tr.piecesCollected.filter(Boolean).length,
      hud: document.getElementById('hud-pieces').textContent,
      rowClash,
    };
  });
  check(got.rowClash === 0, 'no piece sits on an obstacle row', `${got.rowClash} clashes`);
  check(got.collected >= 2, 'running through a piece collects it', `${got.collected} collected`);
  check(got.hud.startsWith(`${got.collected}/`), 'the HUD counts them', got.hud);
  check(!errors.length, 'run: no page errors', errors[0] || '');
  await ctx.close();
}

// ------------------------------------------------------------ in the puzzle
// A full haul places nothing: the monument is built by hand.
{
  const ctx = await browser.newContext(VIEW);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?view=puzzle&city=paris&level=3`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  const r = await page.evaluate(() => ({ placed: window.__cr.puzzle.placedCount, missing: window.__cr.puzzle.missingLeft() }));
  check(r.placed === 0 && r.missing === 0, 'a full haul arrives loose — nothing is pre-built', JSON.stringify(r));
  await ctx.close();
}

// Missed pieces: support rule, delivery, and the souvenir button.
{
  const ctx = await browser.newContext(VIEW);
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('cityrunner2', JSON.stringify({ stars: {}, coins: 500, best: 0 }));
    }
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // the first two loose pieces (the bottom of the monument) were missed
  await page.goto(`${BASE}/?view=puzzle&city=paris&level=3&missing=2`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  const s0 = await page.evaluate(() => {
    const p = window.__cr.puzzle;
    const missing = p.items.filter((it) => it.missing);
    const lowest = Math.min(...missing.map((it) => it.layer));
    const above = p.items.filter((it) => !it.missing && !it.placed && it.layer > lowest);
    return {
      missing: missing.length,
      hidden: missing.every((it) => !it.mesh.visible),
      aboveLocked: above.length > 0 && above.every((it) => !p.pickable(it)),
      fetchShown: getComputedStyle(document.getElementById('btn-fetch')).display !== 'none',
      fetchText: document.getElementById('btn-fetch').textContent,
    };
  });
  check(s0.missing === 2 && s0.hidden, 'missed pieces start off the plaza', JSON.stringify(s0));
  check(s0.aboveLocked, 'pieces resting on a missed piece cannot go on until it arrives');
  check(s0.fetchShown && /BRING 2 NOW · 20/.test(s0.fetchText), 'the souvenir button offers to bring them', s0.fetchText);

  // delivery on its own clock
  await page.waitForFunction(() => window.__cr.puzzle.missingLeft() < 2, null, { timeout: 8000 }).catch(() => {});
  const s1 = await page.evaluate(() => window.__cr.puzzle.missingLeft());
  check(s1 < 2, 'missed pieces are delivered during the build', `${s1} still missing`);

  // bring the rest now for souvenirs
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2')).coins);
  if (s1 > 0) await page.click('#btn-fetch');
  await page.waitForTimeout(400);
  const s2 = await page.evaluate(() => ({
    missing: window.__cr.puzzle.missingLeft(),
    coins: JSON.parse(localStorage.getItem('cityrunner2')).coins,
    fetchShown: getComputedStyle(document.getElementById('btn-fetch')).display !== 'none',
  }));
  check(s2.missing === 0, 'the button brings every remaining piece', JSON.stringify(s2));
  check(s1 === 0 || before - s2.coins === s1 * 10, 'and charges 10 souvenirs a piece', `${before} -> ${s2.coins}`);
  check(!s2.fetchShown, 'the button goes once nothing is missing');
  check(!errors.length, 'puzzle: no page errors', errors[0] || '');
  await ctx.close();
}

// End to end: a real (shortened) street, then BUILD. Exactly the pieces not
// collected on the street must arrive missing in the puzzle.
{
  const ctx = await browser.newContext(VIEW);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // goal=170: the street ends just after the first piece (at ~136m)
  await page.goto(`${BASE}/?view=run&city=paris&level=2&seed=7&god=1&goal=170`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.track?.pieceDefs, null, { timeout: 20000 });
  const total = await page.evaluate(() => window.__cr.track.pieceDefs.length);
  await page.evaluate(async () => {
    const tr = window.__cr.track, pl = window.__cr.player;
    const t0 = performance.now();
    while (performance.now() - t0 < 20000 && !document.getElementById('screen-facts').classList.contains('on')) {
      const p = tr.pieces.find((x) => !x.taken);
      if (p) pl.lane = [-2.4, 0, 2.4].indexOf(p.mesh.position.x);
      await new Promise((r) => setTimeout(r, 30));
    }
  });
  const collected = await page.evaluate(() => window.__cr.track.piecesCollected.filter(Boolean).length);
  await page.click('#btn-build');
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const missing = await page.evaluate(() => window.__cr.puzzle.missingLeft()
    + window.__cr.puzzle.items.filter((it) => it.dropping).length);
  check(collected >= 1, 'end to end: a piece was collected on the street', `${collected}`);
  check(missing === total - collected, 'end to end: exactly the uncollected pieces arrive missing',
    `${missing} missing of ${total}, ${collected} collected`);
  check(!errors.length, 'end to end: no page errors', errors[0] || '');
  await ctx.close();
}

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} run-pieces check(s) failed` : 'ok run pieces — collected, never pre-built, supports first'}`);
process.exit(failures ? 1 : 0);
