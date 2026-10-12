/**
 * Each newer city's own move (src/run/mechanics.js) — a GATE, wired into
 * `npm test`.
 *
 * Rome's signalling Vespas have their own suite (test/rome-weave.mjs). The
 * cities after Mexico City each bring a move of their own, and each move is
 * only fair if it keeps its rules. This checks them against real courses,
 * not a copy of the rules:
 *
 *   - the move happens in its city and in no other
 *   - the same seed deals the same course (daily-challenge determinism)
 *   - each move's own fairness rules (listed with each check below)
 *
 * Usage: node test/city-mechanics.mjs [baseUrl]
 *        SHOTS=dir node test/city-mechanics.mjs   also saves a frame of each
 *                                                  move in action, for review
 */
import { webkit } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { resolveBase } from './serve.mjs';

const { base: BASE, close } = await resolveBase(process.argv[2]);
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};
const SHOTS = process.env.SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const LANES = [-2.4, 0, 2.4];

const browser = await webkit.launch();

// Load a street and return the page, ready, with the course laid out.
async function open(city, level, seed) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${BASE}/?view=run&city=${city}&level=${level}&seed=${seed}&god=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.track?.obstacles?.length, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  return { page, ctx, errors };
}

// Every obstacle a move owns, with its row's other obstacles and coins.
const SNAP = () => {
  const tr = window.__cr.track;
  const rowKey = (o) => `${tr.chunks.indexOf(o.chunk)}:${o.localZ.toFixed(2)}`;
  const obs = tr.obstacles.map((o) => ({
    row: rowKey(o), lane: o.lane, kind: o.kind, mech: !!o.mech, cross: o.cross ?? 0,
    z: o.chunk.position.z + o.localZ,
  }));
  const coins = tr.coins.map((c) => ({ chunk: tr.chunks.indexOf(c.chunk), x: c.mesh.position.x, z: c.mesh.position.z,
    wz: c.chunk.position.z + c.mesh.position.z }));
  return { obs, coins };
};

// Does a coin line run in lane `lane` of row `row`? (a row's coins run from
// its own z back ~7 m: five souvenirs, 1.6 m apart)
const coinIn = (snap, row, lane) => {
  const [chunk, lz] = row.split(':').map(Number);
  return snap.coins.some((c) => c.chunk === chunk && c.z <= lz + 0.1 && c.z > lz - 7.5
    && Math.abs(c.x - LANES[lane]) < 0.2);
};

// Watch the run for `ms`, recording where each moving obstacle is at the
// moment the player reaches it, and saving one frame of it on the way in.
async function watch(page, ms, shotName) {
  return page.evaluate(async ({ ms, wantShot }) => {
    const tr = window.__cr.track;
    const met = new Map();
    let shotAt = null;
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      for (const o of tr.obstacles) {
        if (!o.mech) continue;
        const ahead = -(o.localZ + o.chunk.position.z + tr.group.position.z);
        if (Math.abs(ahead) < 1.2 && !met.has(o)) met.set(o, { lane: o.lane, x: o.x, ahead });
        // how far nearer than its own spot it is drawn, by distance ahead
        if (ahead > 0) (window.__offsets ||= []).push([ahead, o.mesh.position.z - o.localZ]);
        if (wantShot && !shotAt && ahead > 14 && ahead < 22) shotAt = performance.now() - t0;
      }
      if (wantShot && shotAt && !window.__shotTaken) { window.__shotTaken = true; return { met: [...met.values()], shot: true, offsets: window.__offsets || [] }; }
      await new Promise((r) => requestAnimationFrame(r));
    }
    return { met: [...met.values()], shot: false, offsets: window.__offsets || [] };
  }, { ms, wantShot: !!shotName });
}

// ------------------------------------------------------------ Marrakech
// Porters' handcarts cross the road. Rules (CART_* in mechanics.js):
//   - a cart has its row to itself
//   - its target lane is never its row's coin lane
//   - it is exactly in its target lane as the player reaches it
//   - it is in the road and moving for at least 34 m of approach
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234]) {
    ({ page, ctx, errors } = await open('marrakech', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.mech)) break;
    await ctx.close();
  }
  const carts = snap.obs.filter((o) => o.mech);
  check(carts.length > 0, 'Marrakech deals handcarts', `${carts.length} in the opening chunks, seed ${SEED}`);
  check(carts.every((c) => snap.obs.filter((o) => o.row === c.row).length === 1), 'a handcart has its row to itself');
  check(carts.every((c) => !coinIn(snap, c.row, c.lane)), "a handcart never ends up in its row's coin lane");
  check(carts.every((c) => (c.lane === 0 && c.cross === -1) || (c.lane === 2 && c.cross === 1) || c.lane === 1),
    'a handcart comes from the far side of its lane');
  const entry = await page.evaluate(() => {
    const cart = window.__cr.track.obstacles.find((o) => o.mech);
    const probe = (lane, cross) => {
      const o = { lane, cross, x: 0, mesh: { position: {}, userData: { wheels: [] } } };
      return cart.mech.move(o, 34, 0);
    };
    return [probe(0, -1), probe(1, -1), probe(1, 1), probe(2, 1)];
  });
  check(entry.every(Boolean), 'a handcart is in the road from at least 34 m out');
  const seen = await watch(page, 14000, SHOTS && 'marrakech-handcart');
  if (SHOTS && seen.shot) await page.screenshot({ path: join(SHOTS, 'marrakech-handcart.png') });
  const more = seen.shot ? await watch(page, 12000) : { met: [] };
  const met = [...seen.met, ...more.met];
  check(met.length > 0, 'the player reaches handcarts', `${met.length} met`);
  check(met.every((m) => Math.abs(m.x - LANES[m.lane]) < 0.25), 'a handcart is in the centre of its lane as the player reaches it',
    met.map((m) => `${m.lane}@${m.x.toFixed(2)}`).join(' '));
  check(!errors.length, 'Marrakech: no page errors', errors[0] || '');
  await ctx.close();

  const again = await open('marrakech', 3, SEED);
  const snap2 = await again.page.evaluate(SNAP);
  const sig = (s) => JSON.stringify(s.obs.filter((o) => o.mech).map((o) => [o.row, o.lane, o.cross]));
  check(sig(snap) === sig(snap2), 'the same seed deals the same handcarts');
  await again.ctx.close();
}

// ------------------------------------------------------------ Delhi
// Auto-rickshaws drive on ahead, then brake (BRAKE_* in mechanics.js):
//   - its hitbox is where it stops; it is drawn at most 13 m nearer than
//     that, and exactly there from BRAKE_AT (22 m) out
//   - its lane is free in the row before, and is not that row's coin lane
//   - a barrier sharing its row is never in its lane
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234]) {
    ({ page, ctx, errors } = await open('delhi', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.mech)) break;
    await ctx.close();
  }
  const brakers = snap.obs.filter((o) => o.mech);
  check(brakers.length > 0, 'Delhi deals braking rickshaws', `${brakers.length} in the opening chunks, seed ${SEED}`);
  const rowZs = [...new Set(snap.obs.map((o) => o.z))].sort((a, b) => b - a);   // nearest first
  let prevBad = 0, coinBad = 0, laneBad = 0;
  for (const b of brakers) {
    const i = rowZs.indexOf(b.z);
    if (snap.obs.some((o) => o !== b && o.z === b.z && o.lane === b.lane)) laneBad++;
    if (i <= 0) continue;
    const prevZ = rowZs[i - 1];
    if (prevZ - b.z > 26) continue;                     // no obstacle row just before it
    if (snap.obs.some((o) => o.z === prevZ && o.lane === b.lane)) prevBad++;
    if (snap.coins.some((c) => c.wz <= prevZ + 0.1 && c.wz > prevZ - 7.5 && Math.abs(c.x - LANES[b.lane]) < 0.2)) coinBad++;
  }
  check(laneBad === 0, "a barrier never shares a braking rickshaw's lane", `${laneBad} bad`);
  check(prevBad === 0, 'a braking rickshaw never drives through the row before it', `${prevBad} bad`);
  check(coinBad === 0, "a braking rickshaw's lane is not the coin lane of the row before", `${coinBad} bad`);
  const seen = await watch(page, 14000, SHOTS && 'delhi-braker');
  if (SHOTS && seen.shot) await page.screenshot({ path: join(SHOTS, 'delhi-braker.png') });
  const more = seen.shot ? await watch(page, 10000) : { met: [], offsets: [] };
  const offs = [...seen.offsets, ...more.offsets];
  check(offs.length > 0 && offs.every(([, d]) => d >= -0.01 && d <= 13.01), 'a braking rickshaw is drawn at most 13 m nearer than where it stops');
  check(offs.filter(([a]) => a <= 22).every(([, d]) => Math.abs(d) < 0.01), 'from 22 m out it is exactly where its hitbox is');
  check([...seen.met, ...more.met].length > 0, 'the player reaches braking rickshaws');
  check(!errors.length, 'Delhi: no page errors', errors[0] || '');
  await ctx.close();

  const again = await open('delhi', 3, SEED);
  const snap2 = await again.page.evaluate(SNAP);
  const sig = (s) => JSON.stringify(s.obs.filter((o) => o.mech).map((o) => [o.row, o.lane]));
  check(sig(snap) === sig(snap2), 'the same seed deals the same braking rickshaws');
  await again.ctx.close();
}

// ------------------------------------------------------- no stray moves
for (const city of ['nyc', 'rome', 'sf', 'jerusalem', 'mexico']) {
  const { page, ctx } = await open(city, 3, 4242);
  const snap = await page.evaluate(SNAP);
  check(!snap.obs.some((o) => o.mech), `${city} has no city move from mechanics.js`);
  await ctx.close();
}

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} city-mechanics check(s) failed` : 'ok city mechanics: fair, deterministic, each in its own city'}`);
process.exit(failures ? 1 : 0);
