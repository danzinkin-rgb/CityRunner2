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
import { makeHandcart, makeAutoRickshaw } from '../cities/builders.js';

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
const CART_CHANCE = [0.14, 0.2, 0.26];     // share of rows, by street: more on later streets
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

// ---- Delhi: auto-rickshaws that drive on ahead, then brake ----------------
// Some rickshaws are going your way. Far off, one drives on ahead of you at
// half your pace, so it seems to come at you slowly; then, BRAKE_AT metres
// out, it brakes hard, its brake lights flash, and it stops dead in its
// lane. From there it closes at your full speed. The skill is not trusting
// the slow approach: be ready to jump it or change lane.
//
// Only its position on screen changes: its hitbox is where it stops, so it
// can never touch the player before it has braked. It drives on for at most
// BRAKE_FROM - BRAKE_AT metres of approach, so it is never more than
// (BRAKE_FROM - BRAKE_AT) * BRAKE_PACE (13 m) nearer than where it stops,
// which is less than the gap between rows on any street.
// Fairness:
//   - it brakes at least BRAKE_AT (22 m, over a second at top speed) out
//   - it never drives through the row before it: its lane is free there,
//     and is not that row's coin lane
//   - on streets 2 and 3 its row may also hold a barrier, never in its lane
const BRAKE_CHANCE = [0.12, 0.18, 0.24];     // share of rows, by street
const BRAKE_AT = 22, BRAKE_FROM = 48, BRAKE_PACE = 0.5;
const BRAKER = {
  hint: 'That rickshaw is braking! Jump it or change lanes.',
  row({ level, rand, randInt, addObstacle, prev }) {
    if (rand() >= BRAKE_CHANCE[level - 1]) return null;
    const lanes = [0, 1, 2].filter((l) => !prev || (!prev.used.has(l) && prev.coin !== l));
    if (!lanes.length) return null;
    const lane = lanes[randInt(lanes.length)];
    const mesh = makeAutoRickshaw(true);
    mesh.rotation.y = Math.PI;                     // going your way: tail lights to you
    const rec = addObstacle(lane, 'full', { mesh, y0: 0, y1: 1.6, halfLen: 1.3 });
    if (level >= 2 && rand() < 0.5) {
      const others = [0, 1, 2].filter((l) => l !== lane);
      addObstacle(others[randInt(others.length)], 'low');
    }
    return rec;
  },
  settle() {},
  move(o, ahead) {
    const a = Math.min(ahead, BRAKE_FROM);
    const shown = a <= BRAKE_AT ? a : BRAKE_AT + (a - BRAKE_AT) * (1 - BRAKE_PACE);
    o.mesh.position.z = o.localZ + (a - shown);
    const braking = ahead <= BRAKE_AT && ahead > -4;
    const on = braking && Math.floor(ahead / 2.5) % 2 === 0;
    const [off, lit] = o.mesh.userData.brakeMats;
    for (const l of o.mesh.userData.brakeLights) l.material = on ? lit : off;
    o.mesh.position.y = braking && ahead > BRAKE_AT - 2 ? 0.04 : 0;   // the nose dips as it brakes
    return braking;
  },
};

export const MECHANICS = {
  handcart: CART,
  braker: BRAKER,
};
