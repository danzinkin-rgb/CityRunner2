/**
 * Difficulty probe: measures whether a level is actually survivable.
 *
 * Runs the real Track in WebKit (Playwright pages are never "hidden", so the
 * game loop actually advances) and samples every obstacle row over the full
 * distance to the monument. For each row it computes the reaction time a
 * player gets, and for consecutive rows the lane changes required.
 *
 * Usage: node test/difficulty.mjs [baseUrl]
 */
import { webkit, devices } from 'playwright';

const BASE = process.argv[2] || 'http://localhost:4173';
const LANE_CHANGE_SEC = 0.30;   // measured: lane easing settles in ~0.3s
const JUMP_AIRTIME = 0.79;      // vy 12.6, g 32

const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 15'] });
const page = await ctx.newPage();

const results = [];
for (const [city, level] of [['nyc', 1], ['london', 1], ['london', 2], ['rome', 3]]) {
  await page.goto(`${BASE}/?view=run&city=${city}&level=${level}&god=1`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const data = await page.evaluate(async ({ LANE_CHANGE_SEC }) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const { track } = window.__cr;
    const rowsSeen = new Map();
    let ticks = 0;
    // sample while the track scrolls; each obstacle keyed by chunk+localZ+lane
    while (ticks < 220 && track.distance < track.goal) {
      const speed = window.__cr.speed;
      for (const o of track.obstacles) {
        const key = `${o.chunk.uuid}:${o.localZ}`;
        const wz = o.localZ + o.chunk.position.z + track.group.position.z;
        if (!rowsSeen.has(key)) rowsSeen.set(key, { lanes: new Map(), firstSeenZ: wz, speed });
        rowsSeen.get(key).lanes.set(o.lane, { kind: o.kind, y1: o.y1, halfLen: o.halfLen });
      }
      await sleep(30);
      ticks++;
    }
    const rows = [...rowsSeen.values()].map((r) => ({
      speed: r.speed,
      dist: r.firstSeenZ,
      lanes: [...r.lanes.entries()].map(([lane, v]) => ({ lane, ...v })),
    }));
    return { rows, distance: track.distance, goal: track.goal, finalSpeed: window.__cr.speed };
  }, { LANE_CHANGE_SEC });

  // analyse
  const rows = data.rows;
  let mustDodge = 0, allBlocked = 0, jumpable = 0, longest = 0;
  const tight = [];
  for (const r of rows) {
    const walls = r.lanes.filter((l) => l.kind === 'full' && l.y1 > 2.5).map((l) => l.lane);
    const jumps = r.lanes.filter((l) => l.y1 <= 2.0);
    if (walls.length) mustDodge++;
    if (walls.length === 3) allBlocked++;
    if (jumps.length) jumpable++;
    for (const l of r.lanes) longest = Math.max(longest, (l.halfLen || 0.35) * 2);
  }
  // reaction distance: how far ahead is an obstacle visible? fog + camera ~ 60m
  const avgSpeed = data.finalSpeed;
  results.push({
    level: `${city} L${level}`,
    rowsSampled: rows.length,
    rowsWithWalls: mustDodge,
    rowsAllThreeBlocked: allBlocked,
    rowsWithJumpable: jumpable,
    longestObstacleMetres: +longest.toFixed(1),
    speed: +avgSpeed.toFixed(1),
    secondsBetweenRows: rows.length > 1 ? +(12 / (0.55 + level * 0.25) / avgSpeed).toFixed(2) : null,
    progressed: +data.distance.toFixed(0) + '/' + data.goal,
  });
}

console.table(results);
await browser.close();
