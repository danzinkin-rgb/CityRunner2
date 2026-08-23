/**
 * Road-clearance test.
 *
 * A player reported that Abbey Road's hedges pushed out into the running lanes
 * — you could run straight through them, and they hid whether anything solid
 * was behind. They were right: the garden wall was rotated 90 degrees, laying a
 * 7.5-13.5m wall ACROSS the street instead of along it. At maximum villa width
 * its inner edge reached x=0.35, through lane +2.4 and into the centre lane.
 *
 * It never collided, because chunk decoration is not a registered obstacle.
 * That is the whole problem: scenery inside the corridor teaches the player
 * that green things are safe to run through, which is a lie the moment a real
 * hedge-shaped obstacle appears.
 *
 * This sweeps EVERY city and level and asserts that nothing decorative sits in
 * the corridor the player's body actually occupies.
 *
 * WHAT COUNTS AS A VIOLATION
 *   A mesh whose world bounding box overlaps the running corridor, and which
 *   is not a registered obstacle (those are meant to be there and do collide)
 *   and not a collectible (souvenirs are meant to be there too).
 *
 * THE CORRIDOR is derived, never guessed:
 *   - half-width  = |outermost lane| + the player's real hitbox radius
 *   - height      = the player's STANDING hitbox, y0..y1
 * Bounding it to the standing box is deliberate. Using the full jump arc would
 * flag every festoon span, marquee and arcade soffit in the game — all of which
 * the player passes safely beneath.
 *
 * Usage:  node test/road-clearance.mjs [baseUrl]     (npm run test:clearance)
 */
import { webkit } from 'playwright';
import { resolveBase } from './serve.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The suite serves the repo itself unless a URL is named. See test/serve.mjs
// for why an externally-started server was the wrong shape for this.
const { base: BASE } = await resolveBase(process.argv[2]);
const HERE = dirname(fileURLToPath(import.meta.url));

// Lane positions come from the source of truth, so this test cannot drift out
// of step with the game the way a hardcoded copy would.
const playerSrc = readFileSync(join(HERE, '..', 'src', 'run', 'player.js'), 'utf8');
const laneMatch = playerSrc.match(/export const LANES\s*=\s*\[([^\]]+)\]/);
if (!laneMatch) {
  console.log('✗ could not read LANES from src/run/player.js — has it been renamed?');
  process.exit(1);
}
const LANES = laneMatch[1].split(',').map((n) => parseFloat(n.trim()));

// Every city and level in the game. Read from themes.js so a new city is
// covered the day it lands, without anyone remembering to edit this list.
const themesSrc = readFileSync(join(HERE, '..', 'src', 'cities', 'themes.js'), 'utf8');
const CITIES = [...themesSrc.matchAll(/^\s{2}\{\s*$\n\s*id:\s*'([a-z]+)'/gm)].map((m) => m[1]);
if (!CITIES.length) {
  console.log('✗ could not read city ids from src/cities/themes.js');
  process.exit(1);
}

let failures = 0, checked = 0;
const fail = (label, lines) => {
  failures++; checked++;
  console.log(`\n✗ ${label}`);
  lines.slice(0, 6).forEach((l) => console.log('    ' + l));
};
const pass = (label, note = '') => { checked++; console.log(`✓ ${label}${note ? '  ' + note : ''}`); };

/**
 * Runs inside the page. Walks the live track and returns every mesh sitting in
 * the corridor that has no business being there.
 */
async function auditCorridor(page, lanes) {
  return page.evaluate(async ({ lanes }) => {
    const cr = window.__cr;
    if (!cr || !cr.track || !cr.player) return { error: 'no track — did the run start?' };

    // Same module instance the game uses: ES modules are cached by URL.
    const THREE = await import('/vendor/three.module.js');

    const hb = cr.player.hitbox();
    const halfW = Math.max(...lanes.map(Math.abs)) + hb.r;
    // Standing box, measured from the ground rather than the player's current
    // y, so a mid-jump sample cannot lift the window off the scenery.
    const yLo = 0.05, yHi = 1.9;

    const track = cr.track;
    track.group.updateMatrixWorld(true);

    // Meshes that are ALLOWED in the corridor.
    const allowed = new Set();
    for (const o of track.obstacles || []) o.mesh && o.mesh.traverse((n) => allowed.add(n));
    for (const c of track.coins || []) c.mesh && c.mesh.traverse((n) => allowed.add(n));

    const box = new THREE.Box3();
    const hits = [];

    track.group.traverse((n) => {
      if (!n.isMesh || allowed.has(n)) return;
      box.setFromObject(n);
      if (!isFinite(box.min.x)) return;
      const inX = box.min.x < halfW && box.max.x > -halfW;
      const inY = box.min.y < yHi && box.max.y > yLo;
      if (!inX || !inY) return;

      // How far past the corridor edge it reaches — the number that matters.
      const intrusion = Math.min(halfW - box.min.x, box.max.x + halfW);
      let colour = '';
      try {
        const m = Array.isArray(n.material) ? n.material[0] : n.material;
        if (m && m.color) colour = '#' + m.color.getHexString();
      } catch { /* material may be shared or disposed */ }

      hits.push({
        x: [+box.min.x.toFixed(2), +box.max.x.toFixed(2)],
        y: [+box.min.y.toFixed(2), +box.max.y.toFixed(2)],
        z: [+box.min.z.toFixed(1), +box.max.z.toFixed(1)],
        intrusion: +intrusion.toFixed(2),
        colour,
      });
    });

    hits.sort((a, b) => b.intrusion - a.intrusion);
    return { halfW: +halfW.toFixed(2), yLo, yHi, hits, total: hits.length };
  }, { lanes });
}

const ctx = await (await webkit.launch()).newContext({ viewport: { width: 390, height: 844 } });

console.log(`corridor sweep — ${CITIES.length} cities x 3 levels`);
console.log(`lanes [${LANES.join(', ')}] from src/run/player.js\n`);

for (const city of CITIES) {
  for (const level of [1, 2, 3]) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    try {
      await page.goto(`${BASE}/?view=run&city=${city}&level=${level}`, { waitUntil: 'load' });
      // Let several chunks build and recycle, so this samples real variety
      // rather than only the opening stretch.
      await page.waitForFunction(() => window.__cr && window.__cr.track, null, { timeout: 15000 });
      await page.waitForTimeout(3500);

      const r = await auditCorridor(page, LANES);
      const label = `${city} L${level}`;

      if (r.error) {
        fail(label, [r.error, ...errors]);
      } else if (r.total > 0) {
        fail(`${label} — ${r.total} decorative mesh${r.total > 1 ? 'es' : ''} in the corridor`, [
          `corridor: |x| <= ${r.halfW},  y ${r.yLo}..${r.yHi}`,
          ...r.hits.slice(0, 5).map((h) =>
            `reaches ${h.intrusion}m inside — x ${h.x[0]}..${h.x[1]}, y ${h.y[0]}..${h.y[1]}, z ${h.z[0]}..${h.z[1]} ${h.colour}`),
        ]);
      } else {
        pass(label, `clear (|x| <= ${r.halfW})`);
      }
    } catch (e) {
      fail(`${city} L${level}`, [String(e).split('\n')[0], ...errors]);
    }
    await page.close();
  }
}

await ctx.browser().close();
console.log(`\n${failures ? '✗' : '✓'} road clearance — ${checked} checked, ${failures} failing`);
process.exit(failures ? 1 : 0);
