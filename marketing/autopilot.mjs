// Shared by daily-clip.mjs and promo-clip.mjs. It is passed to page.evaluate,
// so it must stay self-contained and use nothing from this module's scope.

/**
 * The autopilot, run inside the page once per frame.
 *
 * It looks at what is about to reach the runner and picks one action. Lane
 * changes are instant in this game, so the only timing that matters is the
 * jump (0.79s of air, so leave about a third of a second early) and the roll
 * (0.62s long). A Vespa that is about to weave blocks both its current lane
 * and the one it is heading into.
 */
export function autopilotStep() {
  const cr = window.__cr;
  if (!cr || cr.state !== 'run' || !cr.track || !cr.player) return;
  const { track, player } = cr;
  const speed = Math.max(1, cr.speed);
  const press = (code) => window.dispatchEvent(new KeyboardEvent('keydown', { code }));

  // Count what would have been a crash, using the track's own test, so the
  // run log says whether the autopilot actually played the course cleanly.
  const hb = player.hitbox();
  for (const o of track.obstacles) {
    const wz = o.localZ + o.chunk.position.z + track.group.position.z;
    const zw = (o.halfLen || 0.35) * 0.55 + 0.3;
    const hit = wz > -zw && wz < zw && Math.abs((o.x ?? [-2.4, 0, 2.4][o.lane]) - hb.x) < 1.15 && hb.y0 < o.y1 && hb.y1 > o.y0;
    if (hit && !o.__mkHit) { o.__mkHit = true; window.__mkHits = (window.__mkHits || 0) + 1; (window.__mkLog ||= []).push({ kind: o.kind, y1: o.y1, lane: o.lane, weave: o.weave || 0, px: +player.x.toFixed(2), plane: player.lane, py: +player.y.toFixed(2), rolling: +player.rolling.toFixed(2), dist: Math.round(track.distance) }); }
  }
  // Everything that has not yet passed the runner, as { lanes, secs, kind, tall }.
  const ahead = [];
  for (const o of track.obstacles) {
    const wz = o.localZ + o.chunk.position.z + track.group.position.z;
    const zw = (o.halfLen || 0.35) * 0.55 + 0.3;
    if (wz > zw) continue;                       // already behind
    const secs = -wz / speed;
    if (secs > 1.5) continue;
    const lanes = [o.lane];
    if (o.weave && !o.weaveDone) lanes.push(o.lane + o.weave);
    ahead.push({ lanes, secs, kind: o.kind, tall: o.y1 > 1.7 });
  }
  const next = (lane) => ahead.filter((a) => a.lanes.includes(lane)).sort((a, b) => a.secs - b.secs)[0];
  // How good a lane is to be in: empty beats a barrier or sign (one keypress),
  // which beats a car (a tight jump), which beats a bus (no way through).
  // A jump or roll already under way cannot be followed by another until it
  // ends, so anything arriving sooner than that cannot be dealt with in place.
  // Two barriers half a second apart in one lane are the usual case: a player
  // jumps the first and sidesteps the second, and so does this.
  const busy = !player.grounded
    ? (player.vy + Math.sqrt(Math.max(0, player.vy * player.vy + 64 * player.y))) / 32
    : Math.max(0, player.rolling);
  const tooSoon = (n) => busy > 0 && n.secs < busy + 0.15;
  const rank = (lane) => {
    const n = next(lane);
    if (!n) return 3;
    // Crossing into a lane takes a moment, so an obstacle about to arrive in
    // another lane is as bad as a bus: there is no time to jump it on arrival.
    if (n.tall || tooSoon(n) || (lane !== player.lane && n.secs < 0.3)) return 0;
    return n.kind === 'full' ? 1 : 2;
  };
  const step = (to) => press(to < player.lane ? 'ArrowLeft' : 'ArrowRight');
  const mine = next(player.lane);

  if (mine && (mine.kind === 'full' || tooSoon(mine))) {
    // Head for the best lane, nearest first on a tie. It may be two lanes
    // away when a row is a double wall, so this starts early and takes one
    // step per frame.
    const best = [0, 1, 2].filter((l) => l !== player.lane)
      .sort((x, y) => rank(y) - rank(x) || Math.abs(x - player.lane) - Math.abs(y - player.lane))[0];
    if (rank(best) > rank(player.lane)) { step(best); return; }
  }
  if (mine) {
    // Staying put. Roll under a sign; jump a barrier or a car, leaving late
    // enough to still be high over it and early enough to be high on arrival
    // (a car is longer, so it needs the earlier take-off).
    if (mine.kind === 'high') { if (mine.secs < 0.32) press('ArrowDown'); return; }
    if (!mine.tall && mine.secs < 0.4 && mine.secs > (mine.kind === 'full' ? 0.22 : 0.13)) press('ArrowUp');
    return;
  }

  // Nothing coming in this lane: drift towards the nearest monument piece or
  // souvenir so the clip shows collecting, not just dodging. One lane at a
  // time, and only into a lane that is just as empty.
  if (player.grounded === false || player.rolling > 0) return;
  let target = -1, nearest = 1e9;
  for (const c of [...(track.pieces || []), ...track.coins]) {
    if (c.taken) continue;
    const wz = c.mesh.position.z + c.chunk.position.z + track.group.position.z;
    if (wz > -4 || wz < -30) continue;
    if (-wz < nearest) { nearest = -wz; target = [-2.4, 0, 2.4].findIndex((x) => Math.abs(x - c.mesh.position.x) < 0.2); }
  }
  if (target >= 0 && target !== player.lane) {
    const to = player.lane + Math.sign(target - player.lane);
    if (!next(to)) step(to);
  }
}
