/**
 * Race your own ghost — a GATE, wired into `npm test`.
 *
 * Finishing a street saves the run (its moves, scores and course seed) as that
 * street's ghost. The next run on the street replays the same course with the
 * ghost beside you, making the same moves at the same distances, and the HUD
 * shows the score gap. With "Race your best run" off, the street is a fresh
 * random course with no ghost. The daily never has a ghost.
 *
 * Usage: node test/ghost.mjs [baseUrl]
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

// A short street (goal 320m), run with some lane changes and a jump, to the end.
const RUN = `${BASE}/?view=run&city=paris&level=1&god=1&goal=320`;
async function playToEnd(makeMoves) {
  await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
  return page.evaluate(async (moves) => {
    const { player } = window.__cr;
    const sfx = { lane() {}, jump() {}, roll() {} };
    const plan = [[60, () => player.moveLane(-1, sfx)], [120, () => player.jump(sfx)],
      [180, () => player.moveLane(1, sfx)], [200, () => player.moveLane(1, sfx)], [260, () => player.roll(sfx)]];
    let i = 0, ghostLanes = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 40000 && !document.getElementById('screen-facts').classList.contains('on')) {
      const d = window.__cr.track?.distance || 0;
      if (moves) while (i < plan.length && d >= plan[i][0]) plan[i++][1]();
      const g = window.__cr.ghost;
      if (g) ghostLanes.push(g.player.lane);
      await new Promise((r) => setTimeout(r, 30));
    }
    return {
      seed: window.__cr.track?.seed ?? null,
      score: Math.round(window.__cr.score),
      facts: document.getElementById('screen-facts').classList.contains('on'),
      ghostLanes: [...new Set(ghostLanes.join(','))].length ? ghostLanes : [],
    };
  }, makeMoves);
}
const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('cityrunner2.ghosts') || '{}')['paris:1'] || null);

// 1. first run: no ghost yet; finishing saves one
await page.goto(RUN, { waitUntil: 'load' });
await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
check(await page.evaluate(() => !window.__cr.ghost && !document.body.classList.contains('ghost-run')),
  'a street with no best run has no ghost');
const first = await playToEnd(true);
const g = await saved();
check(first.facts && g && g.seed === first.seed, 'finishing the street saves the run as its ghost, with its course',
  g ? `seed ${g.seed}, ${g.moves.length} moves, score ${g.score}` : 'nothing saved');
check(g && g.moves.map((m) => m[1]).join('') === 'LJRRD', 'the ghost holds the moves that took effect',
  g ? g.moves.map((m) => `${m[1]}@${m[0]}`).join(' ') : '');

// 2. second run: same course, ghost replays the moves, HUD shows the gap
await page.goto(RUN, { waitUntil: 'load' });
await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
const s2 = await page.evaluate(() => ({ seed: window.__cr.track.seed, ghost: !!window.__cr.ghost,
  cls: document.body.classList.contains('ghost-run') }));
check(s2.ghost && s2.cls && s2.seed === g.seed, 'the next run replays the best run\'s course with its ghost',
  JSON.stringify(s2));
await page.waitForTimeout(1500);
const hud = await page.evaluate(() => ({ text: document.getElementById('hud-ghost').textContent,
  shown: getComputedStyle(document.getElementById('hud-ghost')).display !== 'none' }));
check(hud.shown && /[▲▼][\d,]+ vs best/.test(hud.text), 'the HUD shows the score gap to the ghost', hud.text);
const second = await playToEnd(false);
const lanes = second.ghostLanes;
// the ghost went left (0), back to the middle (1) and then right (2), in that order
const order = lanes.filter((l, i) => i === 0 || l !== lanes[i - 1]).join('');
check(order === '1012', 'the ghost makes the recorded moves along the way', `lanes ${order}`);
const g2 = await saved();
// the second run made no moves; whichever of the two scored higher is the ghost now
const keptRight = second.score > g.score
  ? g2.score === second.score && g2.moves.length === 0
  : g2.score === g.score && g2.moves.length === g.moves.length;
check(keptRight, 'the ghost is always the higher-scoring run',
  `first ${g.score}, second ${second.score}, saved ${g2.score} with ${g2.moves.length} moves`);

// 3. setting off: fresh course, no ghost
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('cityrunner2') || '{}'); s.raceBest = false;
  localStorage.setItem('cityrunner2', JSON.stringify(s));
});
await page.goto(RUN, { waitUntil: 'load' });
await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
const s3 = await page.evaluate(() => ({ seed: window.__cr.track.seed, ghost: !!window.__cr.ghost }));
check(!s3.ghost && s3.seed !== g.seed, 'with "Race your best run" off there is no ghost and a fresh course', JSON.stringify(s3));

check(!errors.length, 'no page errors', errors[0] || '');
await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} ghost check(s) failed` : 'ok ghost — saved, replayed on its course, and optional'}`);
process.exit(failures ? 1 : 0);
