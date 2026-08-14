// Deterministic pseudo-random number generation.
//
// Why this exists: the daily challenge requires every player worldwide to run
// the identical course, and server-side score verification requires the server
// to reproduce a run exactly from its seed. Neither is possible with
// Math.random(), which cannot be seeded.
//
// Gameplay randomness (obstacle lane, kind, spacing, collectible placement)
// MUST come from a seeded stream. Purely cosmetic randomness (which windows
// are lit) may use Math.random without breaking determinism.

// mulberry32 — small, fast, good enough distribution for gameplay.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a — stable string → 32-bit seed, identical on every platform.
export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// The daily challenge seed. UTC so the world shares one course, and the same
// date always regenerates the same course (needed to re-verify old scores).
export function dailySeedFor(date = new Date()) {
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
  return hashString(`cityrunner-daily-${key}`);
}

export function dailyKey(date = new Date()) {
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${m}-${d}`;
}

// Seconds until the next daily reset (00:00 UTC) — for the countdown display.
export function secondsUntilDailyReset(now = new Date()) {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, Math.floor((next - now.getTime()) / 1000));
}

// ---------------------------------------------------------------------------
// Current run stream.
//
// Track and the builders draw gameplay randomness from `rand()`. A run is
// started with startRun(seed); replaying that seed reproduces the course
// exactly, provided draws happen in the same order.
// ---------------------------------------------------------------------------
let current = makeRng(hashString(String(Date.now())));
let currentSeed = 0;

export function startRun(seed) {
  currentSeed = seed >>> 0;
  current = makeRng(currentSeed);
  return currentSeed;
}

export function randomSeed() {
  return hashString(`${Date.now()}-${Math.random()}`);
}

export function getSeed() { return currentSeed; }

/** Gameplay random in [0,1). Deterministic for a given run seed. */
export function rand() { return current(); }

/** Integer in [0, n). */
export function randInt(n) { return Math.floor(current() * n) | 0; }

/** Float in [min, max). */
export function randRange(min, max) { return min + current() * (max - min); }

/** Uniform pick from an array. */
export function pick(arr) { return arr[Math.floor(current() * arr.length) | 0]; }
