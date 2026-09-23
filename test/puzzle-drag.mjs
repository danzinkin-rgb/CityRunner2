/**
 * Puzzle difficulty by street — a GATE, wired into `npm test`.
 *
 * Street 1 is tap-to-place and test/puzzle-solvable.mjs already proves every
 * piece can be reached. Streets 2 and 3 are placed by DRAGGING, street 3 hides
 * which piece is next and makes some pieces arrive a quarter-turn out. This
 * drives those rules with real pointer events (press, move, release) through
 * the same code a finger goes through in main.js — not by calling the puzzle
 * directly — because the pointer layer deciding "drag this piece" versus
 * "orbit the camera" is exactly the part that can break.
 *
 *   street 2: dragging a glowing piece onto its ghost places it
 *   street 3: a piece from a later course is refused, even on its own spot
 *   street 3: a piece that is a quarter-turn out is refused until tapped
 *   every street: the clock scales with the loose pieces
 *
 * Usage: node test/puzzle-drag.mjs [baseUrl]
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
const VIEW = { width: 390, height: 844 };

// Screen position of an item's parked mesh and of its target, plus whether a
// press at the mesh position actually lands on it (nothing in front).
const LOCATE = ({ order }) => {
  const p = window.__cr.puzzle, cam = window.__cr.camera;
  const it = p.items.find((x) => x.order === order);
  const toPx = (v) => {
    const n = v.clone().project(cam);
    return { x: (n.x + 1) / 2 * innerWidth, y: (1 - n.y) / 2 * innerHeight, nx: n.x, ny: n.y };
  };
  const at = toPx(it.mesh.position.clone().setY(it.mesh.position.y + 0.1));
  const target = toPx(it.mesh.position.clone().set(...it.def.p));
  const clear = p.hitTest(at.nx, at.ny) === it;
  return { at, target, clear };
};

async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(from.x + (to.x - from.x) * i / 12, from.y + (to.y - from.y) * i / 12);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);
}

async function openPuzzle(city, level) {
  const ctx = await browser.newContext({ viewport: VIEW });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?view=puzzle&city=${city}&level=${level}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

// Candidates: loose items matching a filter, in an order that tries the
// ones clearly visible first.
async function candidates(page, filterSrc) {
  return page.evaluate((src) => {
    const p = window.__cr.puzzle;
    const f = new Function('it', 'p', `return (${src});`);
    return p.items.filter((it) => !it.placed && f(it, p)).map((it) => it.order);
  }, filterSrc);
}

// ------------------------------------------------------------- street 2
{
  const { ctx, page, errors } = await openPuzzle('paris', 2);
  const info = await page.evaluate(() => {
    const p = window.__cr.puzzle;
    return { mode: p.mode, glow: p.glow, total: p.timeTotal, loose: p.items.length - p.placedCount };
  });
  check(info.mode === 'drag' && info.glow, 'street 2 is drag-to-place, with glow', JSON.stringify(info));
  check(info.total === Math.round(Math.min(120, Math.max(40, 20 + 3.4 * info.loose))),
    'street 2 clock scales with the loose pieces', `${info.total}s for ${info.loose}`);
  let placed = false;
  for (const order of await candidates(page, 'p.pickable(it)')) {
    const loc = await page.evaluate(LOCATE, { order });
    if (!loc.clear) continue;
    const before = await page.evaluate(() => window.__cr.puzzle.placedCount);
    await drag(page, loc.at, loc.target);
    const after = await page.evaluate(() => window.__cr.puzzle.placedCount);
    placed = after === before + 1;
    break;
  }
  check(placed, 'street 2: dragging a glowing piece onto its ghost places it');
  check(!errors.length, 'street 2: no page errors', errors[0] || '');
  await ctx.close();
}

// ------------------------------------------------------------- street 3
{
  const { ctx, page, errors } = await openPuzzle('paris', 3);
  const info = await page.evaluate(() => ({ mode: window.__cr.puzzle.mode, glow: window.__cr.puzzle.glow }));
  check(info.mode === 'drag' && !info.glow, 'street 3 is drag-to-place, with no glow', JSON.stringify(info));

  // out of order: a piece from a later course, dropped on its own ghost
  let refused = null;
  for (const order of await candidates(page, '!p.pickable(it) && it.turns === 0')) {
    const loc = await page.evaluate(LOCATE, { order });
    if (!loc.clear) continue;
    const before = await page.evaluate(() => window.__cr.puzzle.placedCount);
    await drag(page, loc.at, loc.target);
    refused = (await page.evaluate(() => window.__cr.puzzle.placedCount)) === before;
    break;
  }
  check(refused === true, 'street 3: a piece from a later course is refused on its own spot');

  // Build up to the first course that has a turned piece, by tapping pieces
  // home programmatically (tryPick is the placement call street 1 uses).
  for (let guard = 0; guard < 40; guard++) {
    const turnedNow = await candidates(page, 'p.pickable(it) && it.turns === 1');
    if (turnedNow.length) break;
    const next = await candidates(page, 'p.pickable(it)');
    if (!next.length) break;
    await page.evaluate(({ order }) => {
      const p = window.__cr.puzzle, cam = window.__cr.camera;
      const it = p.items.find((x) => x.order === order);
      p.flying.push(it); it.t = 0; it.from = it.mesh.position.clone(); it.fromRot = it.mesh.rotation.clone();
    }, { order: next[0] });
    await page.waitForTimeout(700);
  }
  let turnRefused = null, turnedThenPlaced = null;
  for (const order of await candidates(page, 'p.pickable(it) && it.turns === 1')) {
    let loc = await page.evaluate(LOCATE, { order });
    if (!loc.clear) continue;
    const before = await page.evaluate(() => window.__cr.puzzle.placedCount);
    await drag(page, loc.at, loc.target);
    turnRefused = (await page.evaluate(() => window.__cr.puzzle.placedCount)) === before;
    // it bounced back to where it was parked; tap it to turn it, then retry
    loc = await page.evaluate(LOCATE, { order });
    await page.mouse.click(loc.at.x, loc.at.y);
    await page.waitForTimeout(500);
    const turns = await page.evaluate(({ o }) => window.__cr.puzzle.items.find((x) => x.order === o).turns, { o: order });
    loc = await page.evaluate(LOCATE, { order });
    await drag(page, loc.at, loc.target);
    turnedThenPlaced = turns === 0
      && (await page.evaluate(() => window.__cr.puzzle.placedCount)) === before + 1;
    break;
  }
  check(turnRefused === true, 'street 3: a piece a quarter-turn out is refused');
  check(turnedThenPlaced === true, 'street 3: tapping it turns it, and then it fits');
  check(!errors.length, 'street 3: no page errors', errors[0] || '');
  await ctx.close();
}

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} puzzle-drag check(s) failed` : 'ok puzzle difficulty — drag, order and turning all hold'}`);
process.exit(failures ? 1 : 0);
