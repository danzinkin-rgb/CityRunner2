/**
 * Moving hazards — a GATE, wired into `npm test`.
 *
 * Player feedback, October 2026: experienced players wanted more going on.
 * src/run/hazards.js adds birds that swoop (roll under), a traffic officer
 * who steps in from the kerb (change lane) and a runaway suitcase (jump it).
 * Something that moves into your lane is only fair if you are told in time
 * and there is somewhere to go, so this drives real courses and checks:
 *
 *   - none on street 1, in either mode;
 *   - Gamer meets more of them than Newbie;
 *   - every hazard leaves a clear lane: another lane is clear in the rows
 *     either side of it, and the officer and suitcase only take an outside
 *     lane (they come in from the kerb, crossing nothing);
 *   - none shares a gap with a monument piece;
 *   - the warning starts at least 1.5 s out, and it is in place before the
 *     player gets there;
 *   - the hitboxes are honest: standing under the birds hits and rolling
 *     under does not; the suitcase can be jumped and the officer cannot.
 *
 * Usage: node test/hazards.mjs [baseUrl]
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
const errors = [];

// One page for everything, as test/piece-lanes.mjs does: a fresh browser
// context per street left WebKit unable to start a renderer after a few
// full-street surveys. The mode goes into storage before each load, from a
// static page: written while a street was still running, it was overwritten
// by that street's own save before the next page loaded.
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
async function open(query, mode) {
  await page.goto(`${BASE}/privacy.html`, { waitUntil: 'load' });
  await page.evaluate((m) => localStorage.setItem('cityrunner2', JSON.stringify({ stars: {}, coins: 0, best: 0, mode: m })), mode);
  await page.goto(`${BASE}/${query}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.track, null, { timeout: 45000 });
  return { page, ctx: { close: async () => {} } };
}

// Drive a whole street with a player off the road; report every hazard.
const SURVEY = () => {
  const t = window.__cr.track;
  const LANES = [-2.4, 0, 2.4];
  const away = { hitbox: () => ({ x: 999, y0: 50, y1: 51, r: 0.4 }) };
  const step = 12 / [0.55, 0.8, 1.05][t.level - 1];
  const reach = step / 2 + 1;
  const z = (o) => o.localZ + o.chunk.position.z + t.group.position.z;
  const seen = new Map();
  let speed = 30;
  for (let i = 0; i < 6000 && t.distance < t.goal; i++) {
    const dt = 0.02;
    for (const o of t.obstacles) {
      if (!o.haz) continue;
      const wz = z(o), ahead = -wz / speed;
      let s = seen.get(o);
      if (!s) {
        // the rows either side, as the course was built (hazards excluded)
        const rows = t.obstacles.filter((r) => !r.haz && Math.abs(z(r) - wz) < reach);
        const taken = (side) => new Set(rows.filter((r) => Math.sign(z(r) - wz) === side).map((r) => (r.weave ? r.lane + r.weave : r.lane)));
        const before = taken(1), after = taken(-1);
        const escape = [0, 1, 2].filter((l) => l !== o.lane && !before.has(l) && !after.has(l));
        const pieceNear = t.pieces.some((p) => Math.abs(p.mesh.position.z + p.chunk.position.z + t.group.position.z - wz) < 1);
        s = { kind: o.hazard, lane: o.lane, key: `${Math.round(o.chunk.position.z)}|${o.localZ.toFixed(2)}|${o.lane}|${o.hazard}`,
          escape: escape.length, pieceNear, warnedAt: null, inPlace: null };
        seen.set(o, s);
      }
      if (o.haz.warned && s.warnedAt === null) s.warnedAt = ahead;
      if (wz > -0.3 && s.inPlace === null) s.inPlace = !!o.haz.done && Math.abs(o.x - LANES[o.lane]) < 0.05;
    }
    t.update(dt, speed, away, () => {}, () => {});
  }
  return [...seen.values()];
};

const streets = [['nyc', 2], ['london', 3], ['sf', 3], ['rome', 3], ['paris', 2], ['mexico', 3]];
const SEEDS = [21, 22];

// ---- street 1: none ---------------------------------------------------------
for (const mode of ['newbie', 'gamer']) {
  const { page, ctx } = await open('?view=run&city=london&level=1&god=1&seed=21', mode);
  const h = await page.evaluate(SURVEY);
  check(h.length === 0, `${mode}: no hazards on street 1`, `${h.length}`);
  await ctx.close();
}

// ---- the courses ---------------------------------------------------------------
let total = 0;
const unfair = [], outer = [], nearPiece = [], late = [], notIn = [];
let gamerMore = 0, newbieTotal = 0;
for (const [city, lv] of streets) for (const seed of SEEDS) {
  const got = {};
  for (const mode of ['newbie', 'gamer']) {
    const { page, ctx } = await open(`?view=run&city=${city}&level=${lv}&god=1&seed=${seed}`, mode);
    got[mode] = await page.evaluate(SURVEY);
    await ctx.close();
  }
  // only the hazards the street reaches: chunks are built past the finish
  for (const m of ['newbie', 'gamer']) got[m] = got[m].filter((h) => h.inPlace !== null);
  gamerMore += got.gamer.length; newbieTotal += got.newbie.length;
  for (const h of got.gamer) {
    total++;
    const where = `${city} ${lv} seed ${seed} ${h.kind} lane ${h.lane}`;
    if (h.escape < 1) unfair.push(where);
    if (h.kind !== 'birds' && h.lane === 1) outer.push(where);
    if (h.pieceNear) nearPiece.push(where);
    if (h.warnedAt === null || h.warnedAt < 1.5) late.push(`${where}: warned ${h.warnedAt?.toFixed(2)}s out`);
    if (h.inPlace === false) notIn.push(where);
  }
}
check(total > 10, 'hazards appear on streets 2 and 3', `${total} over ${streets.length * SEEDS.length} Gamer runs`);
check(gamerMore > newbieTotal * 1.4, 'Gamer meets clearly more hazards than Newbie', `${newbieTotal} vs ${gamerMore}`);
check(!unfair.length, 'every hazard leaves another lane clear in the rows either side', unfair.slice(0, 3).join(' | '));
check(!outer.length, 'the officer and the suitcase only take an outside lane', outer.slice(0, 3).join(' | '));
check(!nearPiece.length, 'no hazard shares a gap with a monument piece', nearPiece.slice(0, 3).join(' | '));
check(!late.length, 'every warning starts at least 1.5 s out', late.slice(0, 3).join(' | '));
check(!notIn.length, 'every hazard is in its lane before the player reaches it', notIn.slice(0, 3).join(' | '));

// ---- honest hitboxes, through the real collision code ------------------------------
// Find each kind's first hazard, run up to just short of it, then step once
// with a player in its lane in the given pose and see whether it hits.
const POSES = {
  stand: { y0: 0.05, y1: 1.9 }, roll: { y0: 0.05, y1: 0.9 },
  jumpTop: { y0: 2.53, y1: 4.38 },   // the top of a jump: JUMP_V 12.6, GRAVITY 32
};
const HIT = async (page, kind, pose) => page.evaluate(([kind, pose]) => {
  const t = window.__cr.track;
  const LANES = [-2.4, 0, 2.4];
  const away = { hitbox: () => ({ x: 999, y0: 50, y1: 51, r: 0.4 }) };
  const z = (o) => o.localZ + o.chunk.position.z + t.group.position.z;
  for (let i = 0; i < 20000 && t.distance < t.goal; i++) {
    const o = t.obstacles.find((x) => x.hazard === kind && z(x) < 0.5);
    if (o && z(o) > -0.35) {
      let hit = false;
      t.update(0.002, 30, { hitbox: () => ({ x: LANES[o.lane], ...pose, r: 0.42 }) }, () => {}, () => { hit = true; });
      return { found: true, hit };
    }
    t.update(o && z(o) > -3 ? 0.002 : 0.02, 30, away, () => {}, () => {});
  }
  return { found: false };
}, [kind, pose]);
for (const [kind, pose, want, label] of [
  ['birds', 'stand', true, 'standing under the birds hits'],
  ['birds', 'roll', false, 'rolling under the birds is clear'],
  ['suitcase', 'jumpTop', false, 'a jump clears the suitcase'],
  ['suitcase', 'stand', true, 'running into the suitcase hits'],
  ['officer', 'jumpTop', true, 'a jump does not clear the officer'],
]) {
  let r = { found: false };
  for (const [city, lv] of streets) {
    const { page, ctx } = await open(`?view=run&city=${city}&level=${lv}&seed=21`, 'gamer');
    r = await HIT(page, kind, POSES[pose]);
    await ctx.close();
    if (r.found) break;
  }
  check(r.found && r.hit === want, label, JSON.stringify(r));
}

check(!errors.length, 'no page errors', errors[0] || '');
await ctx.close();
await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} hazard check(s) failed` : 'ok hazards — warned, escapable and honest'}`);
process.exit(failures ? 1 : 0);
