// Each newer city's own move, in the way Rome has its signalling Vespas
// (WEAVE_CHANCE in track.js). A city names its move with `mechanic` in
// src/cities/themes.js; the track asks the move here whether it wants each
// obstacle row, before the ordinary pattern is drawn.
//
// The rules every move keeps:
//   - Gameplay draws come from the seeded stream (rng.js), and only for the
//     city that has the move, so every other city's course, and the daily
//     challenge, is exactly what it was.
//   - Movement is tied to how far ahead of the player the obstacle is, not
//     to the clock, so a seed plays the same at any speed and a ghost replay
//     meets the same course.
//   - The player always gets a readable warning, and is never left with no
//     safe lane.
//
// A move is { hint, row(ctx), settle(rec, ctx), move(o, ahead, dt) }:
//   row     called per obstacle row; returns a record if it takes the row
//           (the ordinary pattern is then skipped), or null
//   settle  called once the row's coins are laid, so the move can keep out
//           of the coin lane
//   move    called every frame for each obstacle it owns; `ahead` is metres
//           from the player to the obstacle, positive while it is in front
// test/city-mechanics.mjs checks each move's rules against real courses.
import { LANES } from './player.js';
import { makeHandcart } from '../cities/builders.js';

// ---- Marrakech: porters' handcarts crossing the road --------------------
// A porter pushes a laden cart straight across the road, kerb to kerb, at
// a steady walk. It is a wall, so the question is only WHERE it will be
// when you reach it: watch it come and pick the lane it will have left, or
// the one it has not reached yet.
//
// It crosses CART_RATE metres sideways for every metre the player closes,
// and it is exactly in the centre of its target lane as the player reaches
// it, never between two. It always comes from the far side of its target
// lane, so it is in the road and moving for at least 34 m of approach
// (about two seconds at top speed), and it waits at the kerb before that.
// Fairness:
//   - a cart has its row to itself
//   - its target lane is never the row's coin lane
const CART_CHANCE = [0.16, 0.18, 0.2];      // of rows, by level: about 3, 6, 8 a street
const CART_RATE = 0.16;
const KERB_X = 5.7;
const CART = {
  hint: 'A handcart is crossing. Pick a lane it will not be in!',
  row({ level, rand, addObstacle, usedLanes }) {
    if (rand() >= CART_CHANCE[level - 1]) return null;
    const rec = addObstacle(1, 'full', { mesh: makeHandcart(), y0: 0, y1: 3.2, halfLen: 0.9 });
    usedLanes.delete(1);            // the cart has no lane until it is settled
    return rec;
  },
  settle(rec, { coinLane, rand, randInt }) {
    const lanes = [0, 1, 2].filter((l) => l !== coinLane);
    const target = lanes[randInt(lanes.length)];
    // from the far side: lane 0 is reached moving left, lane 2 moving right
    const dir = target === 0 ? -1 : target === 2 ? 1 : (rand() < 0.5 ? -1 : 1);
    rec.lane = target;
    rec.cross = dir;
    rec.mesh.rotation.y = dir > 0 ? 0 : Math.PI;
    CART.move(rec, 200, 0);
  },
  move(o, ahead, dt) {
    const free = LANES[o.lane] - o.cross * ahead * CART_RATE;
    const x = Math.max(-KERB_X, Math.min(KERB_X, free));
    if (dt && x !== o.x) {
      for (const w of o.mesh.userData.wheels) w.rotation.y += Math.abs(x - o.x) / 0.62 * o.cross;
    }
    o.x = x;
    o.mesh.position.x = x;
    return Math.abs(free) < KERB_X;  // true while it is in the road
  },
};

export const MECHANICS = {
  handcart: CART,
};
