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
    from: o.uFrom ?? null, to: o.uTo ?? null,
    y1: o.y1, gate: o.gate || '',
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

// ------------------------------------------------------------ Bangkok
// Tuk-tuks U-turn across the road (UT_* in mechanics.js):
//   - every lane it crosses or ends in is empty in its row and is not the
//     row's coin lane
//   - it turns across one or two lanes, and some cross two
//   - it has finished turning, centred in its new lane, 16 m out
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337]) {
    ({ page, ctx, errors } = await open('bangkok', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.filter((o) => o.mech).length >= 2) break;
    await ctx.close();
  }
  const tuks = snap.obs.filter((o) => o.mech);
  check(tuks.length > 0, 'Bangkok deals U-turning tuk-tuks', `${tuks.length} in the opening chunks, seed ${SEED}`);
  let pathBad = 0, coinBad = 0;
  for (const t of tuks) {
    for (let l = Math.min(t.from, t.to); l <= Math.max(t.from, t.to); l++) {
      if (snap.obs.some((o) => o !== t && o.row === t.row && o.lane === l)) pathBad++;
      if (coinIn(snap, t.row, l)) coinBad++;
    }
  }
  check(pathBad === 0, "nothing else stands in a U-turn's path", `${pathBad} bad`);
  check(coinBad === 0, "no souvenirs lie in a U-turn's path", `${coinBad} bad`);
  check(tuks.every((t) => t.from !== t.to && Math.abs(t.from - t.to) <= 2), 'a U-turn crosses one or two lanes');
  const settled = await page.evaluate(() => {
    const t = window.__cr.track.obstacles.find((o) => o.mech);
    const probe = (from, to, ahead) => {
      const o = { uFrom: from, uTo: to, lane: from, x: 0, mesh: { position: {}, rotation: {}, userData: { signal: { light: {}, on: 1, off: 0 } } } };
      t.mech.move(o, ahead, 0);
      return { x: o.x, lane: o.lane };
    };
    return [probe(0, 2, 16), probe(2, 1, 16), probe(1, 0, 15.9), probe(0, 2, 28.1)];
  });
  check(Math.abs(settled[0].x - 2.4) < 1e-6 && settled[0].lane === 2 && Math.abs(settled[1].x) < 1e-6 && Math.abs(settled[2].x + 2.4) < 1e-6,
    'a U-turn has finished, centred in its new lane, 16 m out');
  check(Math.abs(settled[3].x + 2.4) < 1e-6, 'a U-turn has not started 28 m out');
  const seen = await watch(page, 14000, SHOTS && 'bangkok-uturn');
  if (SHOTS && seen.shot) await page.screenshot({ path: join(SHOTS, 'bangkok-uturn.png') });
  check(!errors.length, 'Bangkok: no page errors', errors[0] || '');
  await ctx.close();
  const wide = [];
  for (const sd of [7, 4242, 99, 1234, 31337, 2024]) {
    const o = await open('bangkok', 3, sd);
    wide.push(...(await o.page.evaluate(SNAP)).obs.filter((x) => x.mech && Math.abs(x.from - x.to) === 2));
    await o.ctx.close();
    if (wide.length) break;
  }
  check(wide.length > 0, 'some U-turns cross two lanes');

  const again = await open('bangkok', 3, SEED);
  const snap2 = await again.page.evaluate(SNAP);
  const sig = (s) => JSON.stringify(s.obs.filter((o) => o.mech).map((o) => [o.row, o.from, o.to]));
  check(sig(snap) === sig(snap2), 'the same seed deals the same U-turns');
  await again.ctx.close();
}

// ------------------------------------------------------------ Cape Town
// Gusts push the runner a lane (GUST_* in mechanics.js):
//   - a gust has its row to itself, and no hitbox
//   - it never pushes into an obstacle: nothing stands in the lane it would
//     push you into, from just behind you to 16 m ahead
//   - when it does push, you really move one lane, the way it blows
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337]) {
    ({ page, ctx, errors } = await open('capetown', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.mech)) break;
    await ctx.close();
  }
  const gusts = snap.obs.filter((o) => o.mech);
  check(gusts.length > 0, 'Cape Town deals gusts', `${gusts.length} in the opening chunks, seed ${SEED}`);
  check(gusts.every((g) => snap.obs.filter((o) => o.row === g.row).length === 1), 'a gust has its row to itself');
  const hitless = await page.evaluate(() => window.__cr.track.obstacles.filter((o) => o.mech).every((o) => o.y1 < 0 && o.y0 < 0));
  check(hitless, 'a gust has no hitbox');
  // Watch the run, steering between lanes so some gusts have room to push
  const pushes = await page.evaluate(async () => {
    const tr = window.__cr.track, pl = window.__cr.player;
    const seen = new Map();
    const quiet = { lane() {}, jump() {}, roll() {} };
    const t0 = performance.now();
    let k = 0;
    while (performance.now() - t0 < 22000) {
      if (++k % 45 === 0) pl.moveLane(k % 90 === 0 ? 1 : -1, quiet);
      for (const o of tr.obstacles) {
        if (!o.mech) continue;
        const ahead = -(o.localZ + o.chunk.position.z + tr.group.position.z);
        if (ahead > 0 && ahead < 1.5) o.__laneBefore = pl.lane;
        if (o.push && !seen.has(o)) {
          const blockers = tr.obstacles.filter((b) => {
            if (b === o || b.y1 < 0) return false;
            const a = -(b.localZ + b.chunk.position.z + tr.group.position.z);
            return tr.laneAtArrival(b) === o.push.to && a > -2 && a < 16;
          }).length;
          seen.set(o, { ...o.push, blockers, before: o.__laneBefore, after: pl.lane, dir: o.gust });
        }
      }
      await new Promise((r) => requestAnimationFrame(r));
    }
    return [...seen.values()];
  });
  const pushed = pushes.filter((p) => p.pushed);
  check(pushes.length > 0, 'the player meets gusts', `${pushes.length} met, ${pushed.length} pushed`);
  check(pushed.every((p) => p.blockers === 0), 'a gust never pushes you into an obstacle');
  check(pushes.filter((p) => !p.pushed && p.to >= 0 && p.to <= 2).every((p) => p.blockers > 0), 'a gust only holds back when the lane is blocked');
  check(pushed.every((p) => p.before === undefined || p.to === p.before + p.dir), 'a push moves you one lane, the way the wind blows');
  check(!errors.length, 'Cape Town: no page errors', errors[0] || '');
  await ctx.close();

  const again = await open('capetown', 3, SEED);
  const snap2 = await again.page.evaluate(SNAP);
  const sig = (s) => JSON.stringify(s.obs.filter((o) => o.mech).map((o) => o.row));
  check(sig(snap) === sig(snap2), 'the same seed deals the same gusts');
  await again.ctx.close();
}

// ------------------------------------------------------------ Hanoi
// Motorbikes swerve in pairs (SW_* in mechanics.js), on Hang Gai and by the
// lake:
//   - a pair has its row to itself, side by side, and the row has no
//     souvenirs
//   - both swerve one lane the same way, so exactly one lane is free after
// Train Street's train (TRAIN_* in mechanics.js):
//   - four cars nose to tail in the rail lane, all inside one chunk
//   - rows alongside have nothing in the rail lane, no souvenirs there, and
//     keep one other lane completely empty
//   - it is drawn at most 30 m further off than where it meets you
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337]) {
    ({ page, ctx, errors } = await open('hanoi', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.mech)) break;
    await ctx.close();
  }
  const bikes = snap.obs.filter((o) => o.mech);
  check(bikes.length > 0, 'Hanoi deals swerving pairs of motorbikes', `${bikes.length / 2} pairs, seed ${SEED}`);
  const rows = [...new Set(bikes.map((b) => b.row))];
  let pairBad = 0, coinBad = 0;
  for (const row of rows) {
    const inRow = snap.obs.filter((o) => o.row === row);
    const pair = inRow.filter((o) => o.mech);
    const ok = inRow.length === 2 && pair.length === 2 && Math.abs(pair[0].from - pair[1].from) === 1
      && pair[0].to - pair[0].from === pair[1].to - pair[1].from && Math.abs(pair[0].to - pair[0].from) === 1;
    if (!ok) pairBad++;
    // a row's own souvenirs start exactly at the row (an arc from the row
    // before can run on past it, over the bikes, which is fine)
    const [ch, lz] = row.split(':').map(Number);
    if (snap.coins.some((c) => c.chunk === ch && Math.abs(c.z - lz) < 0.1)) coinBad++;
    const after = new Set(pair.map((b) => b.to));
    if (after.size !== 2) pairBad++;
  }
  check(pairBad === 0, 'a pair rides side by side, alone in its row, and swerves one lane together');
  check(coinBad === 0, "a pair's row has no souvenirs", `${coinBad} bad`);
  check(!errors.length, 'Hanoi street 3: no page errors', errors[0] || '');
  await ctx.close();
  const again = await open('hanoi', 3, SEED);
  const snap2 = await again.page.evaluate(SNAP);
  const sig = (s) => JSON.stringify(s.obs.filter((o) => o.mech).map((o) => [o.row, o.from, o.to]));
  check(sig(snap) === sig(snap2), 'the same seed deals the same pairs');
  await again.ctx.close();

  // Train Street
  let tsnap;
  for (SEED of [7, 4242, 99, 1234, 31337, 2024, 5]) {
    ({ page, ctx, errors } = await open('hanoi', 2, SEED));
    tsnap = await page.evaluate(() => {
      const tr = window.__cr.track;
      const cars = tr.obstacles.filter((o) => o.mech).map((o) => ({
        chunk: tr.chunks.indexOf(o.chunk), z: o.localZ, lane: tr.laneAtArrival(o), loco: !!o.loco,
      }));
      const rows = tr.obstacles.filter((o) => !o.mech).map((o) => ({
        chunk: tr.chunks.indexOf(o.chunk), z: o.localZ, lane: tr.laneAtArrival(o), kind: o.kind,
      }));
      const coins = tr.coins.map((c) => ({ chunk: tr.chunks.indexOf(c.chunk), x: c.mesh.position.x, z: c.mesh.position.z }));
      return { cars, rows, coins };
    });
    if (tsnap.cars.length) break;
    await ctx.close();
  }
  const trains = tsnap.cars.filter((c) => c.loco);
  check(trains.length > 0, 'Train Street deals trains', `${trains.length} in the opening chunks, seed ${SEED}`);
  let carBad = 0, alongBad = 0, coinsBad = 0;
  for (const t of trains) {
    const cars = tsnap.cars.filter((c) => c.chunk === t.chunk && c.z <= t.z && c.z > t.z - 24.5);
    if (cars.length !== 4 || cars.some((c) => c.lane !== 0) || cars.some((c) => c.z < -34)) carBad++;
    const along = tsnap.rows.filter((r) => r.chunk === t.chunk && r.z < t.z && r.z >= t.z - 26);
    if (along.some((r) => r.lane === 0)) alongBad++;
    const zs = [...new Set(along.map((r) => r.z))];
    for (const z of zs) {
      const lanes = along.filter((r) => r.z === z).map((r) => r.lane);
      if (lanes.includes(1) && lanes.includes(2)) alongBad++;
    }
    if (tsnap.coins.some((c) => c.chunk === t.chunk && c.z < t.z && c.z >= t.z - 26 && Math.abs(c.x + 2.4) < 0.2)) coinsBad++;
  }
  check(carBad === 0, 'a train is four cars in the rail lane, inside one chunk', `${carBad} bad`);
  check(alongBad === 0, 'rows beside a train keep out of the rail lane and leave another lane empty', `${alongBad} bad`);
  check(coinsBad === 0, 'no souvenirs lie in the rail lane beside a train', `${coinsBad} bad`);
  const offs = await page.evaluate(() => {
    const o = window.__cr.track.obstacles.find((x) => x.mech);
    const probe = (a) => { const r = { localZ: 0, loco: false, mesh: { position: {}, userData: {} } }; o.mech.move(r, a); return -r.mesh.position.z; };
    return [probe(0), probe(20), probe(500)];
  });
  check(offs[0] === 0 && offs[1] > 0 && offs[2] <= 30, 'a train is drawn at most 30 m off, and exactly where it meets you', offs.join(', '));
  check(!errors.length, 'Train Street: no page errors', errors[0] || '');
  await ctx.close();
}

// ------------------------------------------------------------ Seoul
// Crowds cross when the countdown ends (CR_* in mechanics.js):
//   - a crossing has its row to itself, and no souvenirs of its own
//   - the crowd fills one or two lanes, side by side, and leaves one free
//   - it has stopped in its lanes 22 m out, and waits at the kerb before
//     the signal goes green
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337]) {
    ({ page, ctx, errors } = await open('seoul', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.mech)) break;
    await ctx.close();
  }
  const crowds = snap.obs.filter((o) => o.mech);
  check(crowds.length > 0, 'Seoul deals crossing crowds', `${crowds.length} groups, seed ${SEED}`);
  let rowBad = 0, coinBad = 0;
  for (const row of new Set(crowds.map((c) => c.row))) {
    const inRow = snap.obs.filter((o) => o.row === row);
    const lanes = inRow.map((o) => o.lane).sort();
    if (inRow.some((o) => !o.mech) || lanes.length > 2 || (lanes.length === 2 && lanes[1] - lanes[0] !== 1)) rowBad++;
    const [ch, lz] = row.split(':').map(Number);
    if (snap.coins.some((c) => c.chunk === ch && Math.abs(c.z - lz) < 0.1)) coinBad++;
  }
  check(rowBad === 0, 'a crowd fills one or two lanes side by side, alone in its row, leaving a lane free');
  check(coinBad === 0, 'a crossing has no souvenirs of its own', `${coinBad} bad`);
  const probe = await page.evaluate(() => {
    const o = window.__cr.track.obstacles.find((x) => x.mech);
    const at = (ahead) => {
      const r = { lane: 0, walkFrom: -5.6, signal: { face: {}, faces: [0, 1, 2, 3] }, mesh: { position: {} } };
      o.mech.move(r, ahead);
      return r.x;
    };
    return [at(22), at(10), at(41), at(80)];
  });
  check(probe[0] === -2.4 && probe[1] === -2.4, 'a crowd has stopped in its lane 22 m out', probe.join(', '));
  check(probe[2] === -5.6 && probe[3] === -5.6, 'a crowd waits at the kerb until the signal goes green');
  check(!errors.length, 'Seoul: no page errors', errors[0] || '');
  await ctx.close();
  const again = await open('seoul', 3, SEED);
  const snap2 = await again.page.evaluate(SNAP);
  const sig = (s) => JSON.stringify(s.obs.filter((o) => o.mech).map((o) => [o.row, o.lane]));
  check(sig(snap) === sig(snap2), 'the same seed deals the same crossings');
  await again.ctx.close();
}

// ------------------------------------------------------------ Samarkand
// Walls of tiled arches (AR_* in mechanics.js):
//   - a wall is three arches, one per lane, alone in its row
//   - at least one arch is open when you reach it (no hitbox), and the row's
//     souvenirs lie only in an open one
//   - an arch that closes is solid from the start; one that opens has no
//     hitbox from the start; a switch always has one of each
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337, 2024]) {
    ({ page, ctx, errors } = await open('samarkand', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.gate)) break;
    await ctx.close();
  }
  const bays = snap.obs.filter((o) => o.mech);
  check(bays.length > 0, 'Samarkand deals arch walls', `${bays.length / 3} walls, seed ${SEED}`);
  let wallBad = 0, openBad = 0, coinBad = 0, gateBad = 0;
  for (const row of new Set(bays.map((b) => b.row))) {
    const inRow = snap.obs.filter((o) => o.row === row);
    if (inRow.length !== 3 || inRow.some((o) => !o.mech) || new Set(inRow.map((o) => o.lane)).size !== 3) wallBad++;
    const open = inRow.filter((o) => o.y1 < 0).map((o) => o.lane);
    if (!open.length) openBad++;
    const [ch, lz] = row.split(':').map(Number);
    if (snap.coins.some((c) => c.chunk === ch && Math.abs(c.z - lz) < 0.1 && !open.some((l) => Math.abs(c.x - LANES[l]) < 0.2))) coinBad++;
    const closes = inRow.filter((o) => o.gate === 'closes'), opens = inRow.filter((o) => o.gate === 'opens');
    if (closes.length !== opens.length || closes.some((o) => o.y1 < 0) || opens.some((o) => o.y1 >= 0)) gateBad++;
  }
  check(wallBad === 0, 'an arch wall is three arches, alone in its row');
  check(openBad === 0, 'at least one arch is open when you reach it');
  check(coinBad === 0, 'souvenirs lie only in an open arch', `${coinBad} bad`);
  check(gateBad === 0, 'a closing arch is solid from the start, an opening one never is');
  check(bays.some((b) => b.gate), 'some walls switch their open arch on the last street');
  check(!errors.length, 'Samarkand: no page errors', errors[0] || '');
  await ctx.close();
  const again = await open('samarkand', 3, SEED);
  const snap2 = await again.page.evaluate(SNAP);
  const sig = (s) => JSON.stringify(s.obs.filter((o) => o.mech).map((o) => [o.row, o.lane, o.y1, o.gate]));
  check(sig(snap) === sig(snap2), 'the same seed deals the same arch walls');
  await again.ctx.close();
}

// ------------------------------------------------------------ Zanzibar
// Houses that jut out and narrow the street (NARROW_* in mechanics.js):
//   - four stretches nose to tail in an outer lane, all inside one chunk
//   - rows alongside, and up to 14 m past it, keep out of that lane, have no
//     souvenirs there, and keep one other lane completely empty
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337, 2024, 5]) {
    ({ page, ctx, errors } = await open('zanzibar', 3, SEED));
    snap = await page.evaluate(() => {
      const tr = window.__cr.track;
      const parts = tr.obstacles.filter((o) => o.mech).map((o) => ({
        chunk: tr.chunks.indexOf(o.chunk), z: o.localZ, lane: tr.laneAtArrival(o), front: !!o.front,
      }));
      const rows = tr.obstacles.filter((o) => !o.mech).map((o) => ({
        chunk: tr.chunks.indexOf(o.chunk), z: o.localZ, lane: tr.laneAtArrival(o),
      }));
      const coins = tr.coins.map((c) => ({ chunk: tr.chunks.indexOf(c.chunk), x: c.mesh.position.x, z: c.mesh.position.z }));
      return { parts, rows, coins };
    });
    if (snap.parts.length) break;
    await ctx.close();
  }
  const fronts = snap.parts.filter((p) => p.front);
  check(fronts.length > 0, 'Zanzibar deals narrowings', `${fronts.length} in the opening chunks, seed ${SEED}`);
  let partBad = 0, alongBad = 0, coinsBad = 0;
  for (const f of fronts) {
    const parts = snap.parts.filter((p) => p.chunk === f.chunk && p.z <= f.z && p.z > f.z - 20.5);
    if (parts.length !== 4 || parts.some((p) => p.lane !== f.lane) || f.lane === 1 || parts.some((p) => p.z < -34)) partBad++;
    const along = snap.rows.filter((r) => r.chunk === f.chunk && r.z < f.z && r.z >= f.z - 34);
    if (along.some((r) => r.lane === f.lane)) alongBad++;
    for (const z of new Set(along.map((r) => r.z))) {
      const lanes = along.filter((r) => r.z === z).map((r) => r.lane);
      if ([0, 1, 2].filter((l) => l !== f.lane).every((l) => lanes.includes(l))) alongBad++;
    }
    if (snap.coins.some((c) => c.chunk === f.chunk && c.z < f.z && c.z >= f.z - 34 && Math.abs(c.x - LANES[f.lane]) < 0.2)) coinsBad++;
  }
  check(partBad === 0, 'a narrowing is four stretches in an outer lane, inside one chunk', `${partBad} bad`);
  check(alongBad === 0, 'rows beside a narrowing keep out of its lane and leave another lane empty', `${alongBad} bad`);
  check(coinsBad === 0, 'no souvenirs lie in a narrowed lane', `${coinsBad} bad`);
  check(!errors.length, 'Zanzibar: no page errors', errors[0] || '');
  await ctx.close();
}

// ------------------------------------------------------------ Beijing
// Delivery tricycles (TRIKE_* in mechanics.js):
//   - a low load has a barrier's hitbox (jump it), a tall load a bus's
//   - a row of tricycles has nothing else in it and always leaves a lane
//     with no tall one in it
//   - on the last street some come in pairs, one of each
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337, 2024, 5, 11, 12, 13]) {
    ({ page, ctx, errors } = await open('beijing', 3, SEED));
    snap = await page.evaluate(SNAP);
    const rows = snap.obs.filter((o) => o.mech).map((o) => o.row);
    if (rows.some((r, i) => rows.indexOf(r) !== i)) break;          // a seed that deals a pair
    await ctx.close();
  }
  const trikes = snap.obs.filter((o) => o.mech);
  check(trikes.length > 0, 'Beijing deals delivery tricycles', `${trikes.length}, seed ${SEED}`);
  check(trikes.every((t) => (t.kind === 'low' && t.y1 === 1.2) || (t.kind === 'full' && t.y1 === 3.2)), 'a tricycle is either a low load to jump or a tall one to go round');
  let rowBad = 0, pairs = 0;
  for (const row of new Set(trikes.map((t) => t.row))) {
    const inRow = snap.obs.filter((o) => o.row === row);
    if (inRow.some((o) => !o.mech)) rowBad++;
    if (inRow.filter((o) => o.kind === 'full').length > 2) rowBad++;
    if (inRow.length === 2) { pairs++; if (inRow[0].kind === inRow[1].kind) rowBad++; }
  }
  check(rowBad === 0, 'a tricycle row has nothing else in it, leaves a lane open, and a pair is one of each');
  check(pairs > 0, 'some tricycles come in pairs on the last street', `${pairs} pairs`);
  check(!errors.length, 'Beijing: no page errors', errors[0] || '');
  await ctx.close();
}

// ------------------------------------------------------------ Havana
// Waves over the Malecón's sea wall (WV_* in mechanics.js):
//   - a wave fills the sea-side lane (sometimes two later on), never the far
//     lane, alone in its row with no souvenirs
// Old cars pulling out from the kerb (PO_* in mechanics.js), on Obispo and
// the Prado:
//   - into an outer lane, with at most one other obstacle in its row, in
//     the far lane, so the middle lane is free; no souvenirs in its lane
//   - parked at the kerb until PO_START, in its lane by PO_END (18 m)
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337]) {
    ({ page, ctx, errors } = await open('havana', 1, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.mech)) break;
    await ctx.close();
  }
  const waves = snap.obs.filter((o) => o.mech);
  check(waves.length > 0, 'the Malecón deals waves', `${waves.length}, seed ${SEED}`);
  let waveBad = 0;
  for (const row of new Set(waves.map((w) => w.row))) {
    const inRow = snap.obs.filter((o) => o.row === row);
    const [ch, lz] = row.split(':').map(Number);
    if (inRow.some((o) => !o.mech) || !inRow.some((o) => o.lane === 0) || inRow.some((o) => o.lane === 2)) waveBad++;
    if (snap.coins.some((c) => c.chunk === ch && Math.abs(c.z - lz) < 0.1)) waveBad++;
  }
  check(waveBad === 0, 'a wave fills the sea-side lane, never the far one, alone and with no souvenirs');
  check(!errors.length, 'Malecón: no page errors', errors[0] || '');
  await ctx.close();

  for (SEED of [7, 4242, 99, 1234, 31337]) {
    ({ page, ctx, errors } = await open('havana', 3, SEED));
    snap = await page.evaluate(SNAP);
    if (snap.obs.some((o) => o.mech)) break;
    await ctx.close();
  }
  const cars = snap.obs.filter((o) => o.mech);
  check(cars.length > 0, 'the Prado deals cars pulling out', `${cars.length}, seed ${SEED}`);
  let carBad = 0;
  for (const c of cars) {
    const others = snap.obs.filter((o) => o.row === c.row && o !== c);
    if (c.lane === 1 || others.length > 1 || others.some((o) => o.lane !== 2 - c.lane)) carBad++;
    const [ch, lz] = c.row.split(':').map(Number);
    if (snap.coins.some((k) => k.chunk === ch && Math.abs(k.z - lz) < 0.1 && Math.abs(k.x - LANES[c.lane]) < 0.2)) carBad++;
  }
  check(carBad === 0, 'a car pulls into an outer lane, leaving the middle lane free and no souvenirs in its way');
  const pos = await page.evaluate(() => {
    const o = window.__cr.track.obstacles.find((x) => x.mech);
    const at = (a) => { const r = { lane: 0, side: -1, x: 0, mesh: { position: {}, rotation: {} }, blink: {} }; o.mech.move(r, a); return r.x; };
    return [at(40), at(18), at(5)];
  });
  check(pos[0] < -4 && Math.abs(pos[1] + 2.4) < 1e-6 && Math.abs(pos[2] + 2.4) < 1e-6, 'a car is at the kerb until it pulls out, and in its lane 18 m out', pos.map((v) => v.toFixed(2)).join(', '));
  check(!errors.length, 'Prado: no page errors', errors[0] || '');
  await ctx.close();
}

// ------------------------------------------------------------ Istanbul
// The tram down the middle of İstiklal (railMove in mechanics.js, as Hanoi's
// train):
//   - two cars nose to tail in the middle lane, inside one chunk
//   - rows beside it keep out of the middle lane, no souvenirs there, and
//     keep another lane completely empty
{
  let snap, page, ctx, errors, SEED;
  for (SEED of [7, 4242, 99, 1234, 31337, 2024, 5]) {
    ({ page, ctx, errors } = await open('istanbul', 1, SEED));
    snap = await page.evaluate(() => {
      const tr = window.__cr.track;
      const cars = tr.obstacles.filter((o) => o.mech).map((o) => ({ chunk: tr.chunks.indexOf(o.chunk), z: o.localZ, lane: tr.laneAtArrival(o), loco: !!o.loco }));
      const rows = tr.obstacles.filter((o) => !o.mech).map((o) => ({ chunk: tr.chunks.indexOf(o.chunk), z: o.localZ, lane: tr.laneAtArrival(o) }));
      const coins = tr.coins.map((c) => ({ chunk: tr.chunks.indexOf(c.chunk), x: c.mesh.position.x, z: c.mesh.position.z }));
      return { cars, rows, coins };
    });
    if (snap.cars.length) break;
    await ctx.close();
  }
  const fronts = snap.cars.filter((c) => c.loco);
  check(fronts.length > 0, 'İstiklal deals trams', `${fronts.length}, seed ${SEED}`);
  let carBad = 0, alongBad = 0;
  for (const f of fronts) {
    const cars = snap.cars.filter((c) => c.chunk === f.chunk && c.z <= f.z && c.z > f.z - 13.1);
    if (cars.length !== 2 || cars.some((c) => c.lane !== 1)) carBad++;
    const along = snap.rows.filter((r) => r.chunk === f.chunk && r.z < f.z && r.z >= f.z - 27);
    if (along.some((r) => r.lane === 1)) alongBad++;
    for (const z of new Set(along.map((r) => r.z))) {
      const lanes = along.filter((r) => r.z === z).map((r) => r.lane);
      if (lanes.includes(0) && lanes.includes(2)) alongBad++;
    }
    if (snap.coins.some((c) => c.chunk === f.chunk && c.z < f.z && c.z >= f.z - 27 && Math.abs(c.x) < 0.2)) alongBad++;
  }
  check(carBad === 0, 'a tram is two cars in the middle lane', `${carBad} bad`);
  check(alongBad === 0, 'rows beside a tram keep off its rails and leave another lane empty', `${alongBad} bad`);
  check(!errors.length, 'İstiklal: no page errors', errors[0] || '');
  await ctx.close();
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
