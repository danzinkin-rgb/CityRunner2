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
  makeCrowd, makeCrossing, makeArchBay, makeJutHouse, makeTricycle, makeWave, makeVehicle, makePullBlinker,
  makeTramCar, makeBridgeLeaf,
} from '../cities/builders.js';

// A move that takes a lane for a stretch (Hanoi's train, Zanzibar's narrow
// alleys) sets track.laneHold = { chunk, from, to, lane }. Every row laid
// alongside it, and up to HOLD_TAIL metres past its end, is cleared out of
// that lane (obstacles and souvenirs), and keeps one of the other two lanes
// completely empty, so it never asks for a jump or a roll with the held lane
// alongside and nowhere else to go. Removing draws nothing from the seeded
// stream.
const HOLD_TAIL = 14;
function clearHeldLane({ track, chunk, zRow }) {
  const h = track.laneHold;
  if (!h || h.chunk !== chunk || zRow <= h.from || zRow > h.to + HOLD_TAIL) return;
  const inRow = (o) => o.chunk === chunk && Math.abs(o.localZ + zRow) < 0.01 && !o.mech;
  const drop = (o) => { chunk.remove(o.mesh); track.obstacles = track.obstacles.filter((x) => x !== o); };
  for (const o of track.obstacles.filter((x) => inRow(x) && track.laneAtArrival(x) === h.lane)) drop(o);
  const others = [0, 1, 2].filter((l) => l !== h.lane);
  const rest = track.obstacles.filter((x) => inRow(x));
  if (others.every((l) => rest.some((o) => track.laneAtArrival(o) === l))) {
    // empty the lane without a vehicle if there is one, else the outer one
    const lane = others.find((l) => !rest.some((o) => track.laneAtArrival(o) === l && o.kind === 'full')) ?? others[1];
    for (const o of rest.filter((x) => track.laneAtArrival(x) === lane)) drop(o);
  }
  track.coins = track.coins.filter((c) => {
    const hit = c.chunk === chunk && Math.abs(c.mesh.position.x - LANES[h.lane]) < 0.1
      && c.mesh.position.z <= -zRow + 0.1 && c.mesh.position.z > -zRow - 7.5;
    if (hit) chunk.remove(c.mesh);
    return !hit;
  });
}

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

// ---- Trains and trams on rails: Hanoi's Train Street, Istanbul's trams -----
// A rail lane runs down the street. Now and then a train comes through on
// it, a wall several cars long, rushing at you faster than the rest of the
// street, its red lamps flashing from RAIL_WARN out.
//
// It is drawn further away than where it will meet you and closes the gap
// as it comes (at most RUSH_MAX metres), so it seems to come at you faster
// than the street; its hitboxes are where they meet you, as for Delhi's
// rickshaws.
// Fairness:
//   - the train fits inside its chunk, so it is never cut off early
//   - every row alongside it, and up to HOLD_TAIL metres past its last
//     car, has nothing in the rail lane and no souvenirs there, and always
//     keeps one of the other two lanes completely empty (clearHeldLane)
//   - only the rail lane: it never leaves its rails
const RUSH = 0.35, RUSH_MAX = 30, RAIL_WARN = 90;
function railMove({ lane, cars, carLen, chance, maker, hint }) {
  const M = {
    hint,
    row({ level, rand, addObstacle, zRow, chunkLen, track, chunk }) {
      if (zRow + cars * carLen > chunkLen - 2) return null;
      if (rand() >= chance[level - 1]) return null;
      let head = null;
      for (let k = 0; k < cars; k++) {
        const r = addObstacle(lane, 'full', { mesh: maker(k === 0), y0: 0, y1: 3.2, halfLen: 2.6, dz: k * carLen });
        r.mech = M;
        r.loco = k === 0;
        if (!head) head = r;
      }
      track.laneHold = { chunk, from: zRow, to: zRow + cars * carLen, lane };
      return head;
    },
    settle() {},
    after: clearHeldLane,
    move(o, ahead) {
      const off = Math.min(RUSH_MAX, Math.max(0, ahead) * RUSH);
      o.mesh.position.z = o.localZ - off;
      const warn = ahead <= RAIL_WARN && ahead > -4;
      if (o.loco) {
        const L = o.mesh.userData.lamps;
        const on = warn && Math.floor(ahead / 3) % 2 === 0;
        for (const l of L.lamps) l.material = on ? L.on : L.off;
      }
      return o.loco && warn && ahead > 0;
    },
  };
  return M;
}
// Hanoi's Train Street: a locomotive and three carriages in the left lane.
const TRAIN = railMove({
  lane: 0, cars: 4, carLen: 6, chance: [0.12, 0.16, 0.2], maker: makeTrainCar,
  hint: 'Train coming! Keep out of the rail lane.',
});
// Istanbul: the tram down the middle of İstiklal and of Divanyolu, two
// cars long, in the middle lane.
const TRAM = railMove({
  lane: 1, cars: 2, carLen: 6.5, chance: [0.12, 0.16, 0.2], maker: (front) => makeTramCar(front),
  hint: 'Tram coming down the middle! Keep off the rails.',
});

// ---- Seoul: crowds at the crossing -------------------------------------------
// A zebra crossing with a walk signal at the kerb. As you come up to it the
// signal counts down, 3, 2, 1, then the walker turns green and the crowd
// waiting at the kerb steps out and walks into the road, stopping in one or
// two lanes. Distances ahead: the count runs from CR_COUNT to CR_GO, they
// walk from CR_GO to CR_STOP.
// Fairness:
//   - a crossing has its row to itself, and no souvenirs
//   - the crowd always leaves at least one lane free
//   - it has stopped, in its lanes, CR_STOP (22 m) out, about a second at
//     top speed
//   - two-lane crowds get more likely on later streets
const CROSS_CHANCE = [0.12, 0.16, 0.2];      // share of rows, by street
const CROSS_WIDE = [0.15, 0.5, 0.7];         // of those, how many fill two lanes
const CR_COUNT = 64, CR_GO = 40, CR_STOP = 22, KERB = 5.6;
const CROSSING = {
  hint: 'When the signal goes green, the crowd will cross!',
  row({ level, rand, randInt, addObstacle, usedLanes, zRow, chunk }) {
    if (rand() >= CROSS_CHANCE[level - 1]) return null;
    let lanes, fromLeft;
    if (rand() < CROSS_WIDE[level - 1]) {
      fromLeft = rand() < 0.5; lanes = fromLeft ? [0, 1] : [1, 2];
    } else {
      const l = randInt(3);
      lanes = [l];
      fromLeft = l === 0 ? true : l === 2 ? false : rand() < 0.5;
    }
    const recs = lanes.map((l) => addObstacle(l, 'full', { mesh: makeCrowd(), y0: 0, y1: 3.2, halfLen: 0.6 }));
    for (let l = 0; l <= 2; l++) usedLanes.add(l);   // no souvenirs at a crossing
    const zebra = makeCrossing({}, 8.6);
    zebra.position.z = -zRow;
    if (!fromLeft) zebra.userData.face.parent.position.x *= -1;   // the signal on their kerb
    chunk.add(zebra);
    for (const r of recs) {
      r.mech = CROSSING;
      r.walkFrom = fromLeft ? -KERB : KERB;
      r.signal = zebra.userData;
      r.mesh.rotation.y = fromLeft ? 0 : Math.PI;
    }
    return recs[0];
  },
  settle() {},
  move(o, ahead) {
    const S = o.signal;
    const face = ahead > CR_COUNT ? 0 : ahead > CR_GO ? Math.min(2, Math.floor((CR_COUNT - ahead) / ((CR_COUNT - CR_GO) / 3))) : 3;
    S.face.material = S.faces[face];
    const t = Math.max(0, Math.min(1, (CR_GO - ahead) / (CR_GO - CR_STOP)));
    o.x = o.walkFrom + (LANES[o.lane] - o.walkFrom) * t;
    o.mesh.position.x = o.x;
    o.mesh.position.y = t > 0 && t < 1 ? Math.abs(Math.sin(t * 20)) * 0.06 : 0;   // a walking bob
    return ahead <= CR_COUNT && ahead > CR_STOP;
  },
};

// ---- Samarkand: walls of tiled arches --------------------------------------
// Now and then the road runs through a wall of three tiled arches, one per
// lane, some open and some filled with tile. On later streets the gates
// change as you come: the grilles of two arches flash, then one open arch
// drops its grille and a closed one lifts its own, so the way through moves.
// Distances ahead: the grilles flash from AR_WARN to AR_SWITCH and move
// between AR_SWITCH and AR_DONE.
// Fairness:
//   - an arch wall has its row to itself
//   - at least one arch is open when you reach it, and souvenirs lie only
//     in an open one
//   - a switch is shown for 16 m before it happens and is over 18 m out
//   - the hitboxes are where the arches end up: an arch that will close is
//     solid from the start (it cannot be reached while it still looks open)
const ARCH_CHANCE = [0.1, 0.14, 0.18];       // share of rows, by street
const ARCH_SWITCH_P = [0, 0.4, 0.7];         // of walls with one open arch, how many switch
const AR_WARN = 46, AR_SWITCH = 30, AR_DONE = 18;
const ARCHES = {
  hint: 'The gates are changing! Run for the arch that stays open.',
  row({ level, rand, randInt, addObstacle, usedLanes }) {
    if (rand() >= ARCH_CHANCE[level - 1]) return null;
    const oneOpen = level === 3 || (level === 2 && rand() < 0.5);
    let open = randInt(3), closesFirst = -1;
    const openSet = new Set([open]);
    if (!oneOpen) openSet.add((open + 1 + randInt(2)) % 3);
    if (oneOpen && rand() < ARCH_SWITCH_P[level - 1]) {
      closesFirst = open;                                     // open now, closed when you arrive
      open = (open + 1 + randInt(2)) % 3;
      openSet.clear(); openSet.add(open);
    }
    let head = null;
    for (let l = 0; l <= 2; l++) {
      const shut = !openSet.has(l);
      const opens = closesFirst >= 0 && l === open;
      // how it looks before any switch: a closing arch starts open, an
      // opening one starts shut
      const looksOpen = (!shut && !opens) || l === closesFirst;
      const mesh = makeArchBay(l, !looksOpen);
      // a solid arch has a wall's hitbox; an open one none at all
      const rec = addObstacle(l, 'full', shut
        ? { mesh, y0: 0, y1: 3.2, halfLen: 0.4 }
        : { mesh, y0: -9, y1: -8, halfLen: 0.1 });
      if (shut) usedLanes.add(l); else usedLanes.delete(l);
      rec.mech = ARCHES;
      rec.gate = l === closesFirst ? 'closes' : opens ? 'opens' : '';
      if (rec.gate === 'opens') {                             // built shut: give it a grille to lift
        mesh.userData.grille = mesh.children.find((c) => c.scale.y > 4 && c.position.y < 3);
      }
      if (!head) head = rec;
    }
    return head;
  },
  settle() {},
  move(o, ahead) {
    if (!o.gate) return false;
    const g = o.mesh.userData.grille;
    const warn = ahead <= AR_WARN && ahead > AR_SWITCH;
    const t = Math.max(0, Math.min(1, (AR_SWITCH - ahead) / (AR_SWITCH - AR_DONE)));
    if (o.gate === 'closes') {
      g.visible = true;
      g.position.y = 2.3 + (1 - t) * 4.6;                     // drops into the arch
    } else {
      g.position.y = 2.3 + t * 4.6;                           // lifts out of it
    }
    o.mesh.userData.flash = warn && Math.floor(ahead / 2.5) % 2 === 0;
    g.scale.z = o.mesh.userData.flash ? 0.3 : (o.gate === 'closes' ? 0.12 : 0.5);
    return warn;
  },
};

// ---- Zanzibar: alleys that narrow -------------------------------------------
// Stone Town's lanes are narrow. Here and there a house juts out into the
// road for a stretch, its carved door and balcony on the street, and the
// way through narrows to two lanes. It does not move: the skill is seeing
// it far enough ahead and being out of that lane, with the rest of the
// street's traffic squeezed into the two lanes left.
// Fairness:
//   - it fits inside its chunk, and stands in an outer lane only
//   - the rows alongside it, and up to HOLD_TAIL metres past it, keep out of
//     its lane and keep one other lane completely empty (clearHeldLane)
const NARROW_CHANCE = [0.1, 0.14, 0.18];     // share of rows, by street
const JUT_PARTS = 4, JUT_LEN = 5;
const NARROWS = {
  hint: 'The street narrows ahead: find the open lanes!',
  row({ level, rand, addObstacle, zRow, chunkLen, track, chunk }) {
    if (zRow + JUT_PARTS * JUT_LEN > chunkLen - 2) return null;
    if (rand() >= NARROW_CHANCE[level - 1]) return null;
    const lane = rand() < 0.5 ? 0 : 2;
    let head = null;
    for (let k = 0; k < JUT_PARTS; k++) {
      const r = addObstacle(lane, 'full', { mesh: makeJutHouse(lane, k), y0: 0, y1: 3.2, halfLen: JUT_LEN / 2, dz: k * JUT_LEN });
      r.mech = NARROWS;
      r.front = k === 0;
      if (!head) head = r;
    }
    track.laneHold = { chunk, from: zRow, to: zRow + JUT_PARTS * JUT_LEN, lane };
    return head;
  },
  settle() {},
  after: clearHeldLane,
  move(o, ahead) { return o.front && ahead < 70 && ahead > 0; },
};

// ---- Beijing: delivery tricycles ---------------------------------------------
// Cargo tricycles parked in the lane, loaded for delivery. The load says
// what to do: a low load of crates you can jump; a tall stack of boxes and
// sacks is a wall, and you go round it. On the last street two often stand
// side by side, one of each, so you have to read both at speed.
// Fairness:
//   - each tricycle's hitbox matches its load: low (under 1.2 m, like a
//     barrier) or tall (3.2 m, like a bus)
//   - a row of tricycles always leaves a lane with no tall one in it
//   - a tricycle row has nothing else in it
const TRIKE_CHANCE = [0.14, 0.2, 0.26];      // share of rows, by street
const TRIKE_PAIR = [0, 0.4, 0.6];            // of those, how many put two side by side
const TRIKE = {
  hint: 'Read the load: jump the low ones, go round the tall ones!',
  row({ level, rand, randInt, addObstacle }) {
    if (rand() >= TRIKE_CHANCE[level - 1]) return null;
    const first = randInt(3);
    const tallFirst = rand() < 0.5;
    const lanes = [[first, tallFirst]];
    if (rand() < TRIKE_PAIR[level - 1]) lanes.push([(first + 1 + randInt(2)) % 3, !tallFirst]);
    let head = null;
    for (const [lane, tall] of lanes) {
      const r = addObstacle(lane, tall ? 'full' : 'low', tall
        ? { mesh: makeTricycle(true), y0: 0, y1: 3.2, halfLen: 1.0 }
        : { mesh: makeTricycle(false), y0: 0, y1: 1.2, halfLen: 1.0 });
      r.mech = TRIKE;
      if (!head) head = r;
    }
    return head;
  },
  settle() {},
  move(o, ahead) { return ahead < 50 && ahead > 0; },
};

// ---- Havana, the Malecón: waves over the sea wall ---------------------------
// In a swell, waves break over the Malecón's sea wall and sweep across the
// road. Foam builds against the wall from WV_WARN out; at WV_BREAK the wave
// comes over and fills the sea-side lane (on the last street sometimes two),
// and it is still there when you reach it. A wall of water: go round it.
// Fairness:
//   - a wave has its row to itself, and no souvenirs
//   - it always leaves the far lane clear
//   - the foam shows WV_WARN - WV_BREAK (20 m) before the wave rises, and it
//     is up WV_BREAK (26 m) before you reach it
const WAVE_CHANCE = [0.12, 0.16, 0.2];       // share of rows, by street
const WAVE_WIDE = [0, 0.3, 0.5];             // of those, how many cover two lanes
const WV_WARN = 46, WV_BREAK = 26;
const WAVES = {
  hint: 'Foam on the sea wall: a wave is coming over!',
  row({ level, rand, addObstacle, usedLanes }) {
    if (rand() >= WAVE_CHANCE[level - 1]) return null;
    const lanes = rand() < WAVE_WIDE[level - 1] ? [0, 1] : [0];
    let head = null;
    for (const l of lanes) {
      const r = addObstacle(l, 'full', { mesh: makeWave(l), y0: 0, y1: 3.2, halfLen: 1.4 });
      r.mech = WAVES;
      if (!head) head = r;
    }
    for (let l = 0; l <= 2; l++) usedLanes.add(l);   // no souvenirs where the sea comes over
    return head;
  },
  settle() {},
  move(o, ahead) {
    const U = o.mesh.userData;
    const foam = Math.max(0, Math.min(1, (WV_WARN - ahead) / (WV_WARN - WV_BREAK)));
    U.foam.scale.setScalar(0.2 + foam);
    U.foam.visible = foam > 0;
    const up = Math.max(0, Math.min(1, (WV_BREAK - ahead) / 6));
    U.wave.scale.set(1, Math.max(0.01, up), 1);
    U.wave.visible = up > 0;
    return ahead <= WV_WARN && ahead > 0;
  },
};

// ---- Havana and Buenos Aires: cars and buses that pull out -------------------
// A vehicle parked at the kerb, its indicator flashing, pulls out into the
// outer lane as you come up to it. Distances ahead: it signals from PO_SIGNAL,
// pulls out between PO_START and PO_END, and is then in its lane like any
// other vehicle. Its hitbox is the lane it ends in, so it is fair to treat it
// as there all along; the skill is noticing which parked car is signalling.
// Fairness:
//   - it has its row to itself, or shares it on later streets with one other
//     obstacle in the far lane, leaving the middle lane free
//   - no souvenirs in the lane it pulls into
//   - it is in its lane PO_END (18 m) out
// Gamer mode (device feedback, 15 October 2026: "they appear in a lane that
// would never be where I am"): half of them pull right across into the
// middle lane, where most players run, and later, settling 12 m out. The
// lane they pull out from is then the free one. A jump-over obstacle may
// still take the far lane on later streets, so a lane is always clear.
const PULL_CHANCE = [0.14, 0.18, 0.22];      // share of rows, by street
const PO_SIGNAL = 46, PO_START = 32, PO_END = 18, PARKED_X = 5.3;
const PO_GAMER = { start: 26, end: 12 };
const PULLOUT = {
  hint: 'Indicator flashing at the kerb: it is about to pull out!',
  row({ level, rand, addObstacle, usedLanes, track }) {
    if (rand() >= PULL_CHANCE[level - 1]) return null;
    const kerb = rand() < 0.5 ? 0 : 2;
    const deep = track.gamer && rand() < 0.5;     // Gamer only: drawn only there
    const lane = deep ? 1 : kerb;
    const theme = track.theme;
    const mesh = makeVehicle(theme);
    const tall = theme.vehicle === 'colectivo';
    const r = addObstacle(lane, 'full', { mesh, y0: 0, y1: tall ? 3.2 : 1.6, halfLen: tall ? 2.6 : 2.1 });
    r.mech = PULLOUT;
    r.side = kerb === 0 ? -1 : 1;
    r.po = track.gamer ? PO_GAMER : { start: PO_START, end: PO_END };
    if (level >= 2 && rand() < 0.5) addObstacle(2 - kerb, 'low');
    r.blink = makePullBlinker(mesh, r.side);
    PULLOUT.move(r, 200);
    return r;
  },
  settle() {},
  move(o, ahead) {
    const { start, end } = o.po || { start: PO_START, end: PO_END };
    const t = Math.max(0, Math.min(1, (start - ahead) / (start - end)));
    const k = t * t * (3 - 2 * t);
    o.x = o.side * PARKED_X + (LANES[o.lane] - o.side * PARKED_X) * k;
    o.mesh.position.x = o.x;
    o.mesh.rotation.y = -o.side * 0.35 * Math.sin(Math.PI * t);
    const flashing = ahead <= PO_SIGNAL && ahead > end;
    o.blink.visible = flashing && Math.floor(ahead / 2.2) % 2 === 0;
    return flashing;
  },
};

// ---- Chicago: the river's bascule bridges -----------------------------------
// The road crosses the river on a bascule bridge. As you come, the warning
// gates flash and the two leaves of the bridge begin to lift from the
// middle, and by the time you reach it their raised edges are a lip across
// the whole road: jump it. Distances ahead: the lights flash from BR_WARN,
// the leaves lift between BR_LIFT and BR_SET and then hold.
// Fairness:
//   - the lip is a barrier's height (1.2 m) in every lane, so a jump always
//     clears it, and it is at that height from BR_SET (22 m) out
//   - nothing to roll under in the 16 m before it (no bridge is placed
//     there) or the 18 m after it (cleared), so a jump is never squeezed
//     against a roll
//   - a bridge has its row to itself, and no souvenirs on the ground
//   - no bridge within BR_PIECE_GAP (24 m) of a monument piece: a piece
//     sits in the slot nearest its spot, up to half a row away
const BRIDGE_CHANCE = [0.08, 0.1, 0.12];     // share of rows, by street
const BR_WARN = 60, BR_LIFT = 44, BR_SET = 22, BR_CLEAR_BEFORE = 16, BR_CLEAR_AFTER = 18, BR_PIECE_GAP = 24;
const BRIDGE = {
  hint: 'The bridge is lifting: jump the edge!',
  row({ level, rand, addObstacle, usedLanes, zRow, track, chunk }) {
    if (rand() >= BRIDGE_CHANCE[level - 1]) return null;
    // no bridge next to a monument piece: the lip fills every lane, so a
    // piece just before it would have nowhere clear to be collected
    if (track.pieceDist.some((d) => Math.abs(d + chunk.position.z - zRow) < BR_PIECE_GAP)) return null;
    const here = chunk.position.z - zRow;
    const rollBefore = track.obstacles.some((o) => o.kind === 'high'
      && o.chunk.position.z + o.localZ > here && o.chunk.position.z + o.localZ < here + BR_CLEAR_BEFORE);
    if (rollBefore) return null;
    let head = null;
    for (let l = 0; l <= 2; l++) {
      const r = addObstacle(l, 'low', { mesh: makeBridgeLeaf(l), y0: 0, y1: 1.2, halfLen: 0.6 });
      r.mech = BRIDGE;
      if (!head) head = r;
    }
    for (let l = 0; l <= 2; l++) usedLanes.add(l);
    track.bridgeHold = { chunk, zRow };
    return head;
  },
  settle() {},
  // the rows just past a bridge: nothing to roll under
  after({ track, chunk, zRow }) {
    const h = track.bridgeHold;
    if (!h || h.chunk !== chunk || zRow <= h.zRow || zRow > h.zRow + BR_CLEAR_AFTER) return;
    for (const o of track.obstacles.filter((x) => x.chunk === chunk && Math.abs(x.localZ + zRow) < 0.01 && x.kind === 'high')) {
      chunk.remove(o.mesh); track.obstacles = track.obstacles.filter((x) => x !== o);
    }
  },
  move(o, ahead) {
    const U = o.mesh.userData;
    const t = Math.max(0, Math.min(1, (BR_LIFT - ahead) / (BR_LIFT - BR_SET)));
    U.leaf.rotation.x = -0.26 * t;
    const warn = ahead <= BR_WARN && ahead > -4;
    if (U.lights) for (const l of U.lights) l.material = warn && Math.floor(ahead / 2.4) % 2 === 0 ? U.on : U.off;
    return o.lane === 1 && warn && ahead > 0;
  },
};

export const MECHANICS = {
  bridge: BRIDGE,
  tram: TRAM,
  waves: WAVES,
  pullout: PULLOUT,
  tricycle: TRIKE,
  narrows: NARROWS,
  arches: ARCHES,
  crossing: CROSSING,
  handcart: CART,
  braker: BRAKER,
  uturn: UTURN,
  gust: GUST,
  swarm: SWARM,
  train: TRAIN,
};
