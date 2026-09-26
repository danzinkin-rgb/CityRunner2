// Race your own ghost: your best run on a street, replayed beside you.
//
// Every run's speed follows the same curve, so the ghost is always level with
// you. What differs is its ROUTE (which lane, when it jumped or rolled) and its
// SCORE (the coins and pieces it collected). So a ghost is a list of moves,
// each stamped with the distance it happened at, plus the score every 50m. A
// whole street is a few kilobytes, kept on the device only: no server, which
// keeps the App Store "Data Not Collected" label true.
//
// A ghost only makes sense on the course it was run on, so it carries its
// seed, and racing it replays that course. It also carries COURSE_VERSION:
// if course generation changes (as Rome's did when its Vespas started
// weaving), the same seed builds a different street, so an old ghost would
// run through obstacles. test/determinism.mjs fingerprints the courses and
// fails if they change without a new COURSE_VERSION.
import * as THREE from '../../vendor/three.module.js';
import { Player } from './player.js';
import { STORAGE } from '../core/storage-keys.js';
import { COURSE_VERSION } from './track.js';

const SCORE_STEP = 50;   // metres between score samples
// The ghost runs this far ahead of you, and makes its moves this much earlier,
// so it clears each obstacle exactly where it did. Level with you, a ghost in
// a side lane sat half off the edge of a phone screen.
const AHEAD = 3;

function readAll() {
  try { return JSON.parse(localStorage.getItem(STORAGE.GHOSTS) || '{}') || {}; } catch { return {}; }
}

/** The saved ghost for a street, or null (none, or from an older course). */
export function loadGhost(cityId, level) {
  const g = readAll()[`${cityId}:${level}`];
  if (!g || g.v !== COURSE_VERSION || !Array.isArray(g.moves)) return null;
  return g;
}

/** Keep `data` as the street's ghost if it beats the one saved. Returns true if kept. */
export function saveGhostIfBest(cityId, level, data) {
  const all = readAll();
  const key = `${cityId}:${level}`;
  const old = all[key];
  if (old && old.v === COURSE_VERSION && old.score >= data.score) return false;
  all[key] = { ...data, v: COURSE_VERSION };
  try { localStorage.setItem(STORAGE.GHOSTS, JSON.stringify(all)); } catch { return false; }
  return true;
}

/** Records one run: the moves that took effect, and the score as it grows. */
export class GhostRecorder {
  constructor(seed) {
    this.seed = seed;
    this.moves = [];     // [distance, 'L'|'R'|'J'|'D']
    this.scores = [];    // score at 0, 50, 100 ... metres
  }
  move(d, a) { this.moves.push([Math.round(d * 10) / 10, a]); }
  sample(d, score) {
    while (this.scores.length * SCORE_STEP <= d) this.scores.push(Math.round(score));
  }
  result(score) { return { seed: this.seed, score: Math.round(score), moves: this.moves, scores: this.scores }; }
}

const NO_SFX = { lane() {}, jump() {}, roll() {} };

/** A translucent copy of the player that replays a recorded run. */
export class GhostRunner {
  constructor(scene, style, data) {
    this.data = data;
    this.next = 0;
    this.player = new Player(scene, style);
    this.player.group.traverse((n) => {
      if (!n.isMesh) return;
      if (n === this.player.blob) { n.visible = false; return; }
      n.material = n.material.clone();
      n.material.transparent = true;
      n.material.opacity = 0.38;
      n.material.depthWrite = false;
      if (n.material.emissive) {
        n.material.emissive = new THREE.Color(0x9fd4ff);
        n.material.emissiveIntensity = 0.45;
      }
      n.castShadow = false;
      n.renderOrder = 2;
    });
    this.player.group.position.z = -AHEAD;
  }

  update(dt, speed, distance) {
    const m = this.data.moves;
    while (this.next < m.length && m[this.next][0] <= distance + AHEAD) {
      const a = m[this.next][1];
      if (a === 'L') this.player.moveLane(-1, NO_SFX);
      else if (a === 'R') this.player.moveLane(1, NO_SFX);
      else if (a === 'J') this.player.jump(NO_SFX);
      else if (a === 'D') this.player.roll(NO_SFX);
      this.next++;
    }
    this.player.update(dt, speed);
  }

  /** The ghost's score at this distance, interpolated between samples. */
  scoreAt(distance) {
    const s = this.data.scores;
    if (!s.length) return 0;
    const f = distance / SCORE_STEP, i = Math.floor(f);
    if (i >= s.length - 1) return s[s.length - 1];
    return s[i] + (s[i + 1] - s[i]) * (f - i);
  }
}
