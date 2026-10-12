// Moving hazards: things that swoop or step into a lane, from street 2 on.
//
// Player feedback, October 2026: experienced players wanted more going on
// than rows of parked obstacles. Each hazard is one of the three moves the
// game already teaches, with a hitbox to match what it looks like:
//   birds    — a flock dives to head height: ROLL under (like an overhead sign)
//   officer  — a traffic officer steps in from the kerb: CHANGE LANE (a wall)
//   suitcase — a runaway case rolls in from the kerb: JUMP it (like a barrier)
//
// Fairness, the same promise as Rome's weaving Vespas (track.js):
//   - a hazard sits in a gap between two rows, never in a gap with a monument
//     piece, and only where at least two lanes are clear in BOTH rows, so
//     there is always a clear lane to be in whichever one it takes;
//   - the officer and the suitcase come in from the kerb, so only into an
//     outside lane: they never cross a lane on the way;
//   - warning first. From WARN seconds out an amber marker flashes in the
//     lane it is heading for and it makes its sound; it moves at MOVE and is
//     in place MOVE - DUR seconds before the player reaches it.
//
// Every draw comes from the hazard stream (Track.hazRng), seeded from the
// course seed but separate from the obstacle stream, so adding hazards moves
// no existing obstacle. Their lane and kind are part of the course, though:
// a change here needs a COURSE_VERSION bump like any other.
import * as THREE from '../../vendor/three.module.js';

export const HAZ_WARN = 2.4, HAZ_MOVE = 1.2, HAZ_DUR = 0.5;

// What the collision code and the autopilot need, per kind: `as` is the
// obstacle kind it behaves like.
export const HAZARDS = {
  birds: { as: 'high', y0: 1.25, y1: 2.9, halfLen: 0.6, outerOnly: false },
  // 2.6, not the 2.3 he stands: a jump peaks at about 2.5 m (JUMP_V, GRAVITY),
  // and a person should not look jumpable.
  officer: { as: 'full', y0: 0, y1: 2.6, halfLen: 0.35, outerOnly: true },
  suitcase: { as: 'low', y0: 0, y1: 0.9, halfLen: 0.45, outerOnly: true },
};

// Per-street chance that an eligible gap gets a hazard, by mode. None on
// street 1, which teaches the basics.
export const HAZARD_RATE = {
  newbie: [0, 0.2, 0.3],
  gamer: [0, 0.4, 0.55],
};

// Materials are shared by colour: chunks are recycled every couple of seconds
// and free only their geometry (track.js), so a material per hazard would
// pile up. disposeAll() frees these with the street; three rebuilds a
// disposed material the next time it is drawn.
const MATS = new Map();
const mat = (c, extra = {}) => {
  const key = `${c}|${JSON.stringify(extra)}`;
  if (!MATS.has(key)) MATS.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, ...extra }));
  return MATS.get(key);
};
const MARK_MAT = new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.9, depthWrite: false });
export const MARK_GEO = new THREE.PlaneGeometry(2.0, 4.5);   // shared: track.js adds it to SHARED_GEO

// Uniform colours by city: fictional, no insignia. A tall helmet in London,
// a kepi in Paris, a white uniform for Rome's traffic police.
const OFFICER = {
  london: { coat: 0x1b2233, hat: 'helmet' },
  paris: { coat: 0x1f2b4a, hat: 'kepi' },
  rome: { coat: 0xf2f2ee, hat: 'cap', hatC: 0xf2f2ee },
  default: { coat: 0x1d2a44, hat: 'cap' },
};

function makeBirds(theme) {
  const g = new THREE.Group();
  const gull = theme.id === 'sf';
  const body = mat(gull ? 0xf4f4f0 : 0x8a8f99), wing = mat(gull ? 0xdedede : 0x6b707a);
  const wings = [];
  const spots = [[0, 0, 0], [-0.7, 0.25, 0.4], [0.7, 0.2, 0.3], [-0.35, -0.2, -0.45], [0.4, -0.15, -0.5]];
  for (const [x, y, z] of spots) {
    const b = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), body);
    torso.scale.set(1, 0.8, 1.6);
    b.add(torso);
    for (const side of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.26), wing);
      w.position.x = side * 0.3;
      w.userData.side = side;
      b.add(w);
      wings.push(w);
    }
    b.position.set(x, y, z);
    g.add(b);
  }
  g.userData.wings = wings;
  return g;
}

function makeOfficer(theme) {
  const look = OFFICER[theme.id] || OFFICER.default;
  const g = new THREE.Group();
  const coat = mat(look.coat), skin = mat(0xd9a77f), hi = mat(0xd8f53a, { emissive: 0x6a7a10 });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.26), mat(0x1a1f2a));
  legs.position.y = 0.45;
  // a hi-vis jacket over the uniform: a dark figure was lost against the
  // street at speed; the uniform shows at the shoulders and hat
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.8, 0.32), hi);
  torso.position.y = 1.3;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.35), mat(0xe8e8e8, { emissive: 0x555555 }));   // reflective band
  vest.position.y = 1.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
  head.position.y = 1.9;
  const hatC = mat(look.hatC ?? 0x111622);
  const hat = look.hat === 'helmet'
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.42, 12), hatC)
    : look.hat === 'kepi'
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.22, 12), hatC)
      : new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 12), hatC);
  hat.position.y = look.hat === 'helmet' ? 2.2 : 2.08;
  // the arm that goes up with the whistle
  const arm = new THREE.Group();
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.62, 0.14), coat);
  sleeve.position.y = -0.31;
  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), mat(0xf4f4f4));
  glove.position.y = -0.66;
  arm.add(sleeve, glove);
  arm.position.set(0.36, 1.66, 0);
  g.add(legs, torso, vest, head, hat, arm);
  g.scale.setScalar(1.15);
  g.userData.arm = arm;
  return g;
}

function makeSuitcase(theme) {
  const g = new THREE.Group();
  // bright yellow whatever the city: it has to read at 30 m/s
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.5), mat(0xffc81e, { emissive: 0x5a3e00 }));
  box.position.y = 0.45;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), mat(0x333333));
  handle.position.set(-0.3, 0.98, 0);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.1, 0.52), mat(theme.accent || '#d9534f'));
  strap.position.y = 0.45;
  g.add(box, handle, strap);
  for (const x of [-0.32, 0.32]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), mat(0x222222));
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.08, 0.16);
    g.add(wheel);
  }
  return g;
}

const MAKERS = { birds: makeBirds, officer: makeOfficer, suitcase: makeSuitcase };

/** A hazard's mesh plus its lane marker, at rest where it waits before moving. */
export function makeHazard(kind, theme, laneX) {
  const mesh = MAKERS[kind](theme);
  const marker = new THREE.Mesh(MARK_GEO, MARK_MAT);
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.04;
  marker.visible = false;
  // where it waits: birds high above the lane, the others on the kerb
  const side = Math.sign(laneX) || 1;
  const from = kind === 'birds' ? { x: laneX + side * 1.5, y: 7.5 } : { x: side * 5.2, y: 0 };
  const to = { x: laneX, y: kind === 'birds' ? 1.9 : 0 };
  mesh.position.set(from.x, from.y, 0);
  if (kind !== 'birds') mesh.rotation.y = -side * Math.PI / 2;   // facing the road
  return { mesh, marker, from, to };
}

/**
 * Advance one hazard. `ahead` is seconds until the player reaches it.
 * Returns true the frame its warning starts (for the sound and the hint).
 */
export function stepHazard(o, ahead, dt, clock) {
  const h = o.haz;
  let started = false;
  if (ahead < HAZ_WARN && !h.warned) { h.warned = true; started = true; }
  if (h.warned && !h.done) {
    // pulse, never fully off: a blink can land on an off frame for too long
    h.marker.visible = true;
    MARK_MAT.opacity = 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(clock * 12));
  }
  if (o.hazard === 'birds') {
    for (const w of o.mesh.userData.wings) w.rotation.z = w.userData.side * Math.sin(clock * 18) * 0.7;
  }
  if (o.hazard === 'officer' && h.warned) o.mesh.userData.arm.rotation.z = Math.min(2.6, (o.mesh.userData.arm.rotation.z || 0) + dt * 6);
  if (ahead < HAZ_MOVE && !h.done) {
    h.t = Math.min(1, (h.t || 0) + dt / HAZ_DUR);
    const k = h.t * h.t * (3 - 2 * h.t);
    o.x = h.from.x + (h.to.x - h.from.x) * k;
    o.mesh.position.x = o.x;
    o.mesh.position.y = h.from.y + (h.to.y - h.from.y) * k;
    if (o.hazard === 'suitcase') o.mesh.rotation.z = Math.sin(clock * 20) * 0.08;   // wobbling on its wheels
    if (h.t >= 1) {
      h.done = true;
      o.x = h.to.x;
      h.marker.visible = false;
      if (o.hazard !== 'birds') o.mesh.rotation.y = 0;
    }
  }
  return started;
}
