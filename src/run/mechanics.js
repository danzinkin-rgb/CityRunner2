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
import {
  makeHandcart, makeAutoRickshaw, makeTukTuk, makeGustDust, makeMotorbike, makeTrainCar,
} from '../cities/builders.js';

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

// ---- Bangkok: tuk-tuks that make a U-turn across the road ------------------
// A tuk-tuk coming towards you flashes its big amber roof light, then swings
// round in a U-turn across one or two lanes and stops, facing away. Where it
// ends up is the lane to avoid; where it was is now free.
//
// Distances ahead of the player: the light starts flashing at UT_SIGNAL, the
// turn runs from UT_START to UT_END, so there are 16 m of warning before it
// moves and it has finished moving 16 m out (about three quarters of a
// second at top speed).
// Fairness:
//   - every lane it crosses or ends in is empty in its row, and none of them
//     is the row's coin lane (souvenirs are laid only in a lane it never
//     touches)
//   - on streets 2 and 3 a one-lane turn may share its row with a barrier,
//     in the lane it never touches
//   - two-lane turns get more likely on later streets
const UTURN_CHANCE = [0.12, 0.18, 0.24];     // share of rows, by street
const UTURN_WIDE = [0.2, 0.4, 0.6];          // of those, how many cross two lanes
const UT_SIGNAL = 44, UT_START = 28, UT_END = 16;
const UTURN = {
  hint: 'Flashing light: that tuk-tuk is about to U-turn!',
  row({ level, rand, randInt, addObstacle, usedLanes }) {
    if (rand() >= UTURN_CHANCE[level - 1]) return null;
    let from, to;
    if (rand() < UTURN_WIDE[level - 1]) {
      from = rand() < 0.5 ? 0 : 2; to = 2 - from;
    } else {
      from = randInt(3);
      const opts = [from - 1, from + 1].filter((l) => l >= 0 && l <= 2);
      to = opts[randInt(opts.length)];
    }
    const rec = addObstacle(from, 'full', { mesh: makeTukTuk(true), y0: 0, y1: 1.6, halfLen: 1.2 });
    for (let l = Math.min(from, to); l <= Math.max(from, to); l++) usedLanes.add(l);   // its whole path
    const spare = [0, 1, 2].find((l) => !usedLanes.has(l));
    if (spare !== undefined && level >= 2 && rand() < 0.5) addObstacle(spare, 'low');
    rec.uFrom = from; rec.uTo = to;
    return rec;
  },
  settle() {},
  move(o, ahead, dt) {
    const sig = o.mesh.userData.signal;
    const flashing = ahead <= UT_SIGNAL && ahead > UT_END;
    sig.light.material = flashing && Math.floor(ahead / 2.2) % 2 === 0 ? sig.on : sig.off;
    const t = Math.max(0, Math.min(1, (UT_START - ahead) / (UT_START - UT_END)));
    const k = t * t * (3 - 2 * t);
    o.x = LANES[o.uFrom] + (LANES[o.uTo] - LANES[o.uFrom]) * k;
    o.mesh.position.x = o.x;
    o.mesh.rotation.y = Math.PI * k * (o.uTo > o.uFrom ? -1 : 1);
    o.lane = t >= 1 ? o.uTo : o.uFrom;
    return flashing;
  },
};

// ---- Cape Town: gusts of the Cape Doctor ---------------------------------
// The south-easter blows hard here. At a gust's row, the wind shoves the
// runner one lane over, the way it is blowing. A band of dust starts
// streaming across the road GUST_WARN metres out, in the gust's direction,
// so you can see it coming and which way it will push: be in a lane where
// the push lands you somewhere safe, or steer straight back.
//
// The push is a lane change like the player's own (it is recorded in a
// ghost like one, so a ghost replays it exactly).
// Fairness, checked at the moment of the push:
//   - it never pushes you into an obstacle: if anything stands in the lane
//     you would land in, from just behind you to PUSH_CLEAR metres ahead,
//     the gust does not push
//   - against the edge of the road it does not push
//   - a gust has its row to itself
const GUST_CHANCE = [0.1, 0.15, 0.2];        // share of rows, by street
const GUST_WARN = 45, PUSH_CLEAR = 16;
const QUIET = { lane() {} };
const GUST = {
  hint: 'Wind! The gust will push you sideways.',
  row({ level, rand, addObstacle, usedLanes }) {
    if (rand() >= GUST_CHANCE[level - 1]) return null;
    // no hitbox: it lies far below the road
    const rec = addObstacle(1, 'full', { mesh: makeGustDust(), y0: -9, y1: -8, halfLen: 0.1 });
    usedLanes.delete(1);
    rec.gust = rand() < 0.5 ? -1 : 1;
    return rec;
  },
  settle() {},
  move(o, ahead, dt, track, player) {
    const warn = ahead <= GUST_WARN && ahead > -6;
    o.mesh.visible = warn;
    if (warn) {
      const s = o.mesh.userData.streaks;
      s.position.x = ((GUST_WARN - ahead) * 0.9 % 8) * o.gust;
    }
    if (!o.blown && ahead <= 0 && player) {
      o.blown = true;
      const to = player.lane + o.gust;
      let pushed = false;
      if (to >= 0 && to <= 2) {
        const blocked = track.obstacles.some((b) => {
          if (b === o || b.y1 < 0) return false;
          const a = -(b.localZ + b.chunk.position.z + track.group.position.z);
          const lane = b.x !== undefined ? Math.round(b.x / 2.4) + 1 : b.lane;
          return lane === to && a > -2 && a < PUSH_CLEAR;
        });
        if (!blocked) { player.moveLane(o.gust, QUIET); pushed = true; }
      }
      o.push = { to, pushed };
    }
    return warn && ahead > 0;
  },
};

// ---- Hanoi: motorbikes that swerve in pairs --------------------------------
// Hanoi's traffic moves as a flock. Two motorbikes side by side flash their
// indicators, then swerve one lane over together, so the free lane jumps
// from one side of the road to the other. Distances ahead, as for the
// tuk-tuks: signal from SW_SIGNAL, swerve from SW_START to SW_END.
// Fairness:
//   - a pair has its row to itself, and its row has no souvenirs
//   - after the swerve exactly one lane is free: the one they left
//   - the bikes are low enough to jump, as every motorbike in the game is
const SWARM_CHANCE = [0.14, 0.2, 0.26];      // share of rows, by street
const SW_SIGNAL = 44, SW_START = 30, SW_END = 18;
const SWARM = {
  hint: 'Those motorbikes are signalling: they will swerve together!',
  row({ level, rand, addObstacle, usedLanes }) {
    if (rand() >= SWARM_CHANCE[level - 1]) return null;
    const right = rand() < 0.5;                  // lanes 0-1 moving right, or 1-2 moving left
    const lanes = right ? [0, 1] : [1, 2], dir = right ? 1 : -1;
    const recs = lanes.map((l) => addObstacle(l, 'full', { mesh: makeMotorbike(true), y0: 0, y1: 1.6, halfLen: 1.1 }));
    for (let l = 0; l <= 2; l++) usedLanes.add(l);   // no souvenirs in a swarm's row
    for (const r of recs) { r.uFrom = r.lane; r.uTo = r.lane + dir; r.mech = SWARM; }
    return recs[0];
  },
  settle() {},
  move(o, ahead) {
    const sig = o.mesh.userData.signal;
    const flashing = ahead <= SW_SIGNAL && ahead > SW_END;
    sig.light.material = flashing && Math.floor(ahead / 2.2) % 2 === 0 ? sig.on : sig.off;
    const t = Math.max(0, Math.min(1, (SW_START - ahead) / (SW_START - SW_END)));
    const k = t * t * (3 - 2 * t);
    o.x = LANES[o.uFrom] + (LANES[o.uTo] - LANES[o.uFrom]) * k;
    o.mesh.position.x = o.x;
    o.mesh.rotation.z = (o.uTo - o.uFrom) * -0.15 * Math.sin(Math.PI * t);   // lean into it
    o.lane = t >= 1 ? o.uTo : o.uFrom;
    return flashing;
  },
};

// ---- Hanoi, Train Street: the train ----------------------------------------
// The railway runs down the left lane (lane 0), between the houses. Now and
// then a train comes through: a locomotive and three carriages, a wall the
// length of a city block, rushing at you faster than the rest of the
// street. Its red lamps flash from TRAIN_WARN out.
//
// It is drawn further away than where it will meet you and closes the gap
// as it comes (at most RUSH_MAX metres), so it seems to come at you faster
// than the street; its hitboxes are where they meet you, as for Delhi's
// rickshaws.
// Fairness:
//   - the train fits inside its chunk, so it is never cut off early
//   - every row alongside it, and up to TRAIN_TAIL metres past its last
//     car, has nothing in the rail lane and no souvenirs there, and always
//     keeps one of the other two lanes free of vehicles
//   - only the rail lane: the train never leaves its rails
const TRAIN_CHANCE = [0.12, 0.16, 0.2];      // share of rows, by street
const TRAIN_CARS = 4, CAR_LEN = 6, RUSH = 0.35, RUSH_MAX = 30, TRAIN_WARN = 90, TRAIN_TAIL = 14;
const TRAIN = {
  hint: 'Train coming! Keep out of the rail lane.',
  row({ level, rand, addObstacle, zRow, chunkLen, track, chunk }) {
    if (zRow + TRAIN_CARS * CAR_LEN > chunkLen - 2) return null;
    if (rand() >= TRAIN_CHANCE[level - 1]) return null;
    let head = null;
    for (let k = 0; k < TRAIN_CARS; k++) {
      const r = addObstacle(0, 'full', { mesh: makeTrainCar(k === 0), y0: 0, y1: 3.2, halfLen: 2.6, dz: k * CAR_LEN });
      r.mech = TRAIN;
      r.loco = k === 0;
      if (!head) head = r;
    }
    track.trainHold = { chunk, from: zRow, to: zRow + TRAIN_CARS * CAR_LEN };
    return head;
  },
  settle() {},
  // A row laid alongside the train: clear the rail lane, and keep one of
  // the other lanes free of vehicles.
  after({ track, chunk, zRow }) {
    const h = track.trainHold;
    if (!h || h.chunk !== chunk || zRow <= h.from || zRow > h.to + TRAIN_TAIL) return;
    const inRow = (o) => o.chunk === chunk && Math.abs(o.localZ + zRow) < 0.01 && !o.mech;
    const drop = (o) => { chunk.remove(o.mesh); track.obstacles = track.obstacles.filter((x) => x !== o); };
    for (const o of track.obstacles.filter((x) => inRow(x) && track.laneAtArrival(x) === 0)) drop(o);
    const walls = track.obstacles.filter((x) => inRow(x) && x.kind === 'full');
    if ([1, 2].every((l) => walls.some((w) => track.laneAtArrival(w) === l))) {
      drop(walls.find((w) => track.laneAtArrival(w) === 2));
    }
    track.coins = track.coins.filter((c) => {
      const hit = c.chunk === chunk && Math.abs(c.mesh.position.x - LANES[0]) < 0.1
        && c.mesh.position.z <= -zRow + 0.1 && c.mesh.position.z > -zRow - 7.5;
      if (hit) chunk.remove(c.mesh);
      return !hit;
    });
  },
  move(o, ahead) {
    const off = Math.min(RUSH_MAX, Math.max(0, ahead) * RUSH);
    o.mesh.position.z = o.localZ - off;
    const warn = ahead <= TRAIN_WARN && ahead > -4;
    if (o.loco) {
      const L = o.mesh.userData.lamps;
      const on = warn && Math.floor(ahead / 3) % 2 === 0;
      for (const l of L.lamps) l.material = on ? L.on : L.off;
    }
    return o.loco && warn && ahead > 0;
  },
};

export const MECHANICS = {
  handcart: CART,
  braker: BRAKER,
  uturn: UTURN,
  gust: GUST,
  swarm: SWARM,
  train: TRAIN,
};
