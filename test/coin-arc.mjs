/**
 * Coin-arc reachability test.
 *
 * A player reported that arcs of souvenirs felt impossible to collect with a
 * normal jump. They were right, and provably so: the old arc was a sine curve
 * of its own invention, unrelated to the jump. From the ground the apex coin
 * sat outside the hitbox; at the top of a jump the two end coins fell below it.
 * No timing collected all five.
 *
 * This simulates the real thing — the player's parabola against the arc's
 * geometry, using the same collection test as the game — sweeping every jump
 * start time to find the best achievable result.
 *
 * Asserts, for every level's running speed:
 *   1. A well-timed jump collects ALL coins in an arc.
 *   2. The timing window that achieves it is wide enough to hit by feel
 *      (>= 100ms), not frame-perfect.
 *   3. Running underneath, without jumping, does NOT collect them all —
 *      otherwise the arc is decoration rather than a reward.
 *
 * Usage: node test/coin-arc.mjs
 */

const JUMP_V = 12.6;
const GRAVITY = 32;
const ARC_LIFT = 0.9;
const N = 5;

// The game's collection test, from Track.update():
//   coinY > hb.y0 - 0.6  &&  coinY < hb.y1 + 0.6
// with hb.y0 = playerY + 0.05 and hb.y1 = playerY + 1.9 (standing).
// The band therefore reaches 2.5m ABOVE the player but only 0.55m below.
const collects = (playerY, coinY) => coinY > playerY - 0.55 && coinY < playerY + 2.5;

const jumpY = (t) => (t < 0 ? 0 : Math.max(0, JUMP_V * t - 0.5 * GRAVITY * t * t));

/** Arc geometry, mirroring track.js exactly. */
function arcCoins(speed) {
  const T = (2 * JUMP_V) / GRAVITY;
  return Array.from({ length: N }, (_, i) => {
    const t = (i / (N - 1)) * T;
    return { z: speed * t, y: jumpY(t) + ARC_LIFT };
  });
}

/**
 * How many coins are collected if the player jumps when the arc's start is
 * `lead` metres ahead. The player advances at `speed`; the coin at distance z
 * is reached at time z/speed after that moment.
 */
function collectedWithJumpAt(speed, lead) {
  const coins = arcCoins(speed);
  let n = 0;
  for (const c of coins) {
    const tAtCoin = (c.z + lead) / speed;   // time since the jump began
    if (collects(jumpY(tAtCoin), c.y)) n++;
  }
  return n;
}

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) console.log(`✓ ${name}${detail ? '  ' + detail : ''}`);
  else { failures++; console.log(`✗ ${name}${detail ? '\n    ' + detail : ''}`); }
};

console.log('arc traces the jump: apex '
  + (JUMP_V * JUMP_V / (2 * GRAVITY)).toFixed(2) + 'm, airtime '
  + ((2 * JUMP_V) / GRAVITY).toFixed(3) + 's, lift ' + ARC_LIFT + 'm\n');

for (const [label, speed] of [['level 1', 15.5], ['level 2', 18.5], ['level 3', 21.5]]) {
  const coins = arcCoins(speed);
  const heights = coins.map((c) => c.y.toFixed(2)).join(', ');
  const span = coins[N - 1].z.toFixed(1);

  // sweep jump timing in 5ms steps of lead distance
  let best = 0, window = 0, run = 0;
  for (let lead = -14; lead <= 6; lead += speed * 0.005) {
    const n = collectedWithJumpAt(speed, lead);
    if (n > best) { best = n; run = 0; }
    if (n === N) { run += speed * 0.005; window = Math.max(window, run); } else run = 0;
  }
  const windowMs = (window / speed) * 1000;

  // and what a player gets by simply running under it
  const onFoot = coins.filter((c) => collects(0, c.y)).length;

  console.log(`${label} (${speed} m/s) — arc spans ${span}m, heights [${heights}]`);
  check(`  all ${N} collectible with one jump`, best === N, `best = ${best}/${N}`);
  check('  timing window is forgiving', windowMs >= 100, `${windowMs.toFixed(0)}ms`);
  check('  running underneath does not collect them all', onFoot < N, `${onFoot}/${N} on foot`);
  console.log('');
}

console.log(`${failures ? '✗' : '✓'} coin arc — ${failures} failing`);
process.exit(failures ? 1 : 0);
