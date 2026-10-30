// Shared by daily-clip.mjs and promo-clip.mjs. It is passed to page.evaluate,
// so it must stay self-contained and use nothing from this module's scope.

/**
 * The autopilot, run inside the page once per frame.
 *
 * It plans rather than reacts. Every frame it simulates the runner over the
 * next 1.4 seconds for a set of short plans (do nothing; one move at one of
 * thirteen moments; two moves) using the game's own physics (src/run/
 * player.js: lane easing, JUMP_V, GRAVITY, the 0.62s roll and its hitbox),
 * and checks each against every obstacle with the track's own collision test.
 * It takes the plan with the fewest moves that hits nothing, and acts only if
 * that plan's first move is now. Rules of thumb ("jump a barrier 0.3s out")
 * stopped being enough once the game gained moving hazards and city moves:
 * a planner does not need to know what an obstacle is, only where it is.
 *
 * Anything that moves sideways (a weaving Vespa, a hazard stepping in from
 * the kerb, a city move) is treated as filling both where it is and the lane
 * it belongs to, which is cautious but never wrong.
 *
 * When doing nothing is safe, it drifts towards the nearest monument piece or
 * souvenir, so the clip shows collecting, not just dodging.
 */
export function autopilotStep() {
  const cr = window.__cr;
  if (!cr || cr.state !== 'run' || !cr.track || !cr.player) return;
  const { track, player } = cr;
  const speed = Math.max(1, cr.speed);
  const press = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code }));
  const LANE_X = [-2.4, 0, 2.4];
  const zOf = (o) => o.localZ + o.chunk.position.z + track.group.position.z;
  const zwOf = (o) => (o.halfLen || 0.35) * 0.55 + 0.3;

  // Count what would have been a crash, using the track's own test, so the
  // run log says whether the autopilot actually played the course cleanly.
  const hb = player.hitbox();
  for (const o of track.obstacles) {
    const wz = zOf(o), zw = zwOf(o);
    const hit = wz > -zw && wz < zw && Math.abs((o.x ?? LANE_X[o.lane]) - hb.x) < 1.15 && hb.y0 < o.y1 && hb.y1 > o.y0;
    if (hit && !o.__mkHit) {
      o.__mkHit = true;
      window.__mkHits = (window.__mkHits || 0) + 1;
      (window.__mkLog ||= []).push({ kind: o.hazard || o.kind, y1: o.y1, lane: o.lane, px: +player.x.toFixed(2), plane: player.lane, py: +player.y.toFixed(2), rolling: +player.rolling.toFixed(2), dist: Math.round(track.distance) });
    }
  }

  // ---- the plan ------------------------------------------------------------
  const H = 1.4, DT = 1 / 60;
  const obs = [];
  for (const o of track.obstacles) {
    const wz0 = zOf(o), zw = zwOf(o);
    if (wz0 > zw || -wz0 / speed > H + 0.5) continue;
    const xs = new Set([o.x ?? LANE_X[o.lane]]);
    if (LANE_X[o.lane] !== undefined) xs.add(LANE_X[o.lane]);
    if (o.weave && !o.weaveDone && LANE_X[o.lane + o.weave] !== undefined) xs.add(LANE_X[o.lane + o.weave]);
    obs.push({ wz0, zw, xs: [...xs], y0: o.y0 || 0, y1: o.y1 });
  }

  // Returns the time of the first collision for a plan, or Infinity.
  const sim = (plan) => {
    let x = player.x, y = player.y, vy = player.vy, gr = player.grounded, roll = player.rolling, lane = player.lane, k = 0;
    for (let i = 0; i * DT < H; i++) {
      const t = i * DT;
      while (k < plan.length && plan[k].t <= t + 1e-6) {
        const a = plan[k++].a;
        if (a === 'L') lane = Math.max(0, lane - 1);
        else if (a === 'R') lane = Math.min(2, lane + 1);
        else if (a === 'U') { if (gr && roll <= 0) { vy = 12.6; gr = false; } else return -1; }
        else if (a === 'D') { if (roll <= 0) { roll = 0.62; if (!gr) vy = -16; } else return -1; }
      }
      // The track checks collisions before the player moves, as the game does.
      const hy0 = y + 0.05, hy1 = y + (roll > 0 ? 0.9 : 1.9);
      for (const o of obs) {
        const wz = o.wz0 + speed * t;
        if (wz <= -o.zw || wz >= o.zw || !(hy0 < o.y1 && hy1 > o.y0)) continue;
        for (const xo of o.xs) if (Math.abs(xo - x) < 1.15) return t;
      }
      x += (LANE_X[lane] - x) * Math.min(1, DT * 12);
      if (!gr) { vy -= 32 * DT; y += vy * DT; if (y <= 0) { y = 0; vy = 0; gr = true; } }
      if (roll > 0) roll -= DT;
    }
    return Infinity;
  };
  const key = { L: 'ArrowLeft', R: 'ArrowRight', U: 'ArrowUp', D: 'ArrowDown' };

  if (sim([]) === Infinity) {
    // Safe as things are: drift one lane towards the nearest collectible, if
    // that move is safe too.
    if (!player.grounded || player.rolling > 0) return;
    let target = -1, nearest = 1e9;
    for (const c of [...(track.pieces || []), ...track.coins]) {
      if (c.taken) continue;
      const wz = c.mesh.position.z + c.chunk.position.z + track.group.position.z;
      if (wz > -4 || wz < -30) continue;
      if (-wz < nearest) { nearest = -wz; target = LANE_X.findIndex((x) => Math.abs(x - c.mesh.position.x) < 0.2); }
    }
    if (target >= 0 && target !== player.lane) {
      const a = target < player.lane ? 'L' : 'R';
      if (sim([{ t: 0, a }]) === Infinity) press(key[a]);
    }
    return;
  }

  // Something is coming. Fewest moves first; among those, the earliest first
  // move, so lane changes start in good time and there is room to replan.
  const T = Array.from({ length: 13 }, (_, i) => i * 0.1);
  const A = ['L', 'R', 'U', 'D'];
  let best = null, bestT = -Infinity;
  const consider = (plan) => {
    const r = sim(plan);
    if (r === Infinity) return true;
    if (r > bestT) { bestT = r; best = plan; }   // fallback: last as long as possible
    return false;
  };
  for (const t1 of T) for (const a1 of A) {
    const p = [{ t: t1, a: a1 }];
    if (consider(p)) { if (t1 === 0) press(key[a1]); return; }
  }
  for (const t1 of T) for (const a1 of A) for (const t2 of T) {
    if (t2 <= t1) continue;
    for (const a2 of A) {
      const p = [{ t: t1, a: a1 }, { t: t2, a: a2 }];
      if (consider(p)) { if (t1 === 0) press(key[a1]); return; }
    }
  }
  // Nothing clears everything: take the plan that stays clear the longest.
  if (best && best[0].t === 0) press(key[best[0].a]);
}
