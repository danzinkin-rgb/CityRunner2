/**
 * Monument pieces on the run must be collectable without hitting anything —
 * a GATE, wired into `npm test`.
 *
 * Player feedback, October 2026: some pieces could not be collected without
 * hitting an obstacle. Each piece sat midway between two obstacle rows in a
 * lane fixed by its index, whatever those rows held. Measured over every
 * street and six seeds: 142 of 1,500 pieces had an obstacle in their own lane
 * both before and after them, 21 of them a vehicle each side; others asked
 * for a roll under a bar and then a jump straight after, which a roll is too
 * long to allow.
 *
 * The rule now (src/run/track.js): a piece goes in a lane clear of the rows
 * either side, or failing that, one clear in the row after. This drives every
 * street's course forward, records each piece as it appears, and checks:
 *   - no piece has an obstacle in its lane in the row after it;
 *   - no piece is boxed in, with an obstacle in its lane on both sides.
 * A weaving Vespa counts in the lane it weaves into, and not in the one it
 * leaves before the player gets there.
 *
 * Usage: node test/piece-lanes.mjs [baseUrl]
 */
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBase } from './serve.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const themesSrc = readFileSync(join(HERE, '..', 'src', 'cities', 'themes.js'), 'utf8');
const CITIES = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
const SEEDS = [11, 12];

const { base: BASE, close } = await resolveBase(process.argv[2]);
let failures = 0;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok ' : 'x  '} ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failures++;
};

const browser = await webkit.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

let total = 0;
const bad = [];
for (const city of CITIES) for (const level of [1, 2, 3]) for (const seed of SEEDS) {
  await page.goto(`${BASE}/?view=run&city=${city}&level=${level}&god=1&seed=${seed}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__cr?.track, null, { timeout: 20000 });
  const pieces = await page.evaluate(() => {
    const t = window.__cr.track;
    const LANES = [-2.4, 0, 2.4];
    // a player nowhere near the road, so nothing is collected or hit
    const away = { hitbox: () => ({ x: 999, y0: 50, y1: 51, r: 0.4 }) };
    const z = (local, chunk) => local + chunk.position.z + t.group.position.z;
    const seen = new Map();
    for (let i = 0; i < 4000 && seen.size < t.pieceDefs.length; i++) {
      for (const p of t.pieces) {
        if (seen.has(p.idx)) continue;
        const pz = z(p.mesh.position.z, p.chunk);
        const lane = LANES.indexOf(p.mesh.position.x);
        // the rows either side are half a row-spacing away (track.js); look
        // that far and no further, so a hazard in the gap beyond a row is not
        // mistaken for one beside the piece
        const step = 12 / [0.55, 0.8, 1.05][t.level - 1];
        const reach = step / 2 + 1;
        const inLane = t.obstacles
          .filter((o) => (o.weave ? o.lane + o.weave : o.lane) === lane)
          .map((o) => ({ kind: o.kind, dz: z(o.localZ, o.chunk) - pz }))
          .filter((o) => Math.abs(o.dz) < reach);
        seen.set(p.idx, {
          lane,
          before: inLane.filter((o) => o.dz > 0).map((o) => `${o.kind} ${o.dz.toFixed(1)}m before`),
          after: inLane.filter((o) => o.dz < 0).map((o) => `${o.kind} ${(-o.dz).toFixed(1)}m after`),
        });
      }
      t.update(0.05, 30, away, () => {}, () => {});
    }
    return [...seen.values()];
  });
  total += pieces.length;
  for (const p of pieces) if (p.after.length) bad.push(`${city} ${level} seed ${seed} lane ${p.lane}: ${[...p.before, ...p.after].join(', ')}`);
}

check(total > 100, 'pieces were generated on every street', `${total} pieces`);
check(!bad.length, 'no piece has an obstacle in its lane in the row after it (so none is boxed in)',
  bad.length ? `${bad.length}: ${bad.slice(0, 3).join(' | ')}` : '');
check(!errors.length, 'no page errors', errors[0] || '');

await browser.close();
await close();
console.log(`\n${failures ? `x ${failures} piece-lane check(s) failed` : 'ok piece lanes — every piece can be collected cleanly'}`);
process.exit(failures ? 1 : 0);
