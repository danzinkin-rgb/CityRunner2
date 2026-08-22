/**
 * Puzzle solvability test.
 *
 * A player reported that on some monuments the large pieces hide the small
 * ones. They were right, and it was worse than "hard to tap": two monuments
 * could not be finished at all.
 *
 * The scatter layout guards a piece against the frame edges and against the
 * monument footprint, but never against the other loose pieces. So a slab from
 * an upper course can end up squarely in front of a small piece from the
 * course below. tryPick used to take hits[0] -- the nearest loose mesh under
 * the finger -- which made the small piece untappable through every one of its
 * pixels. And pickable() is strict bottom-up, so the only thing that could
 * uncover it was the very piece the player is not allowed to touch yet.
 *
 * Nothing rescues that board. The camera does not orbit during play, there is
 * no reshuffle, no hint and no idle nudge, so the run just bleeds out the
 * clock on a puzzle it was never possible to finish. It was reproducible on
 * the Chrysler Building and the Trevi Fountain under both greedy and optimal
 * play.
 *
 * WHAT THIS ASSERTS
 *   Every monument can be played to completion using nothing but taps, with
 *   the REAL tryPick. It does not model the pick rule -- a copy of the rule
 *   would drift away from the rule -- it calls it, at real screen coordinates,
 *   and fast-forwards each flight so the sweep does not take an hour.
 *
 * A monument fails if a sweep of every candidate point over every remaining
 * piece picks nothing while pieces are still unplaced.
 *
 * Usage:  node test/puzzle-solvable.mjs [baseUrl]    (npm run test:puzzle)
 */
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.argv[2] || 'http://localhost:4173';
const HERE = dirname(fileURLToPath(import.meta.url));

// Read the cities from the source of truth so a new city is covered the day it
// lands, rather than the day someone remembers to edit this list.
const themesSrc = readFileSync(join(HERE, '..', 'src', 'cities', 'themes.js'), 'utf8');
const CITIES = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
if (!CITIES.length) {
  console.log('x could not read city ids from src/cities/themes.js');
  process.exit(1);
}

// Portrait and landscape both matter: the scatter is laid out in world space
// but occlusion is a screen-space accident, so a board that is fine in one
// orientation can be unplayable in the other.
const VIEWS = [
  ['portrait', { width: 393, height: 659 }],
  ['landscape', { width: 844, height: 390 }],
];

let failures = 0, checked = 0;
const fail = (label, lines) => {
  failures++; checked++;
  console.log(`\nx ${label}`);
  lines.slice(0, 8).forEach((l) => console.log('    ' + l));
};
const pass = (label, note = '') => { checked++; console.log(`ok ${label}${note ? '  ' + note : ''}`); };

/**
 * Runs inside the page. Plays the board out with real taps.
 *
 * Pieces bob and yaw while they wait, so a point that misses on one frame can
 * land on the next; the sweep therefore retries across a few frames before
 * calling a board stuck.
 */
const PLAY = async () => {
  const p = window.__cr.puzzle;
  const THREE = await import('/vendor/three.module.js');
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const box = new THREE.Box3(), v = new THREE.Vector3();

  // Every point worth tapping: a grid across each remaining piece's projected
  // box. Anything a player could aim at is in here.
  const points = () => {
    const loose = p.items.filter((it) => !it.placed && !p.flying.includes(it));
    p.group.updateMatrixWorld(true);
    const out = [];
    for (const it of loose) {
      box.setFromObject(it.mesh);
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
      for (let i = 0; i < 8; i++) {
        v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
        v.project(p.camera);
        x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y);
      }
      const N = 11;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const nx = x0 + (x1 - x0) * (i + 0.5) / N, ny = y0 + (y1 - y0) * (j + 0.5) / N;
        if (nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1) out.push([nx, ny]);
      }
    }
    return out;
  };

  const total = p.items.length;
  const start = p.placedCount;
  let taps = 0;

  for (let step = 0; step < total + 5; step++) {
    if (p.placedCount >= total) break;
    let picked = false;
    for (let attempt = 0; attempt < 3 && !picked; attempt++) {
      for (const [nx, ny] of points()) {
        p.tryPick(nx, ny);
        taps++;
        if (p.flying.length) {
          // Land it now rather than over ~0.55s of animation. Nudging t to the
          // end and stepping the smallest possible dt runs the real completion
          // path -- placeAtTarget, placedCount, the done check -- while barely
          // moving the countdown clock.
          for (const f of p.flying) f.t = 1;
          p.update(0.001);
          picked = true;
          break;
        }
      }
      if (!picked) await frame();      // pieces bob; try again on a later frame
    }
    if (!picked) {
      const stuck = p.items.filter((it) => !it.placed && p.pickable(it))
        .map((it) => `#${it.order} L${it.layer}`);
      const left = p.items.filter((it) => !it.placed).length;
      return { ok: false, left, total, placed: p.placedCount, stuck, taps };
    }
  }
  return { ok: p.placedCount >= total, left: total - p.placedCount, total,
           placed: p.placedCount, preplaced: start, stuck: [], taps };
};

const browser = await webkit.launch();

console.log(`puzzle solvability — ${CITIES.length} cities x 3 levels x ${VIEWS.length} orientations`);
console.log(`cities [${CITIES.join(', ')}] from src/cities/themes.js\n`);

for (const [vname, viewport] of VIEWS) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const city of CITIES) {
    for (const level of [1, 2, 3]) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      const label = `${city} L${level} ${vname}`;
      try {
        await page.goto(`${BASE}/?view=puzzle&city=${city}&level=${level}`, { waitUntil: 'load' });
        await page.waitForFunction(() => window.__cr?.puzzle?.items?.length, null, { timeout: 20000 });
        await page.waitForTimeout(1200);          // let the scatter settle
        const r = await page.evaluate(PLAY);
        if (r.ok) pass(label, `${r.total} pieces, ${r.taps} taps`);
        else fail(`${label} — unwinnable, ${r.left} of ${r.total} pieces left`, [
          `placed ${r.placed}/${r.total} then no tap anywhere could move a piece`,
          `pickable but unreachable: ${r.stuck.join(', ') || '(none pickable at all)'}`,
          ...errors,
        ]);
      } catch (e) {
        fail(label, [String(e).split('\n')[0], ...errors]);
      }
      await page.close();
    }
  }
  await ctx.close();
}
await browser.close();

console.log(`\n${failures ? 'x' : 'ok'} puzzle solvability — ${checked} checked, ${failures} failing`);
process.exit(failures ? 1 : 0);
