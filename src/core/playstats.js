/**
 * The play summary in Settings, kept on this device only (docs/BUILD-MODE-
 * PROPOSAL.md §1.5, Dan, November 2026).
 *
 * Counts runs played and monuments built (after a run, and in Build mode),
 * and the minutes spent in each with the run or puzzle on screen and not
 * paused. Also the best Build mode time per monument, and this week's counts
 * that feed the two hidden Game Center usage boards (src/core/gamecenter.js).
 *
 * Nothing here is sent anywhere except those two weekly counts, and only on
 * iOS with the player signed in to Game Center; see docs/COMPLIANCE.md §2.1.
 * Plain counts: no streaks, no "keep it up" (Children's Code). Erased with
 * "Erase my data" (STORAGE.PLAYSTATS is in ERASED_KEYS).
 */
import { STORAGE } from './storage-keys.js';

// Monday 9 November 2026, 00:00 UTC: the start of the first week on the
// Game Center usage boards, which restart every 7 days from it. The local
// week has to turn over at the same moment or a count would straddle two.
export const USAGE_WEEK0 = Date.UTC(2026, 10, 9);
const WEEK_MS = 7 * 24 * 3600 * 1000;
export const weekIndex = (now = Date.now()) => Math.floor((now - USAGE_WEEK0) / WEEK_MS);

const fresh = () => ({ runs: 0, runMs: 0, built: 0, builtMs: 0, buildWins: 0, buildMs: 0, best: {}, week: { i: weekIndex(), runs: 0, build: 0 } });

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE.PLAYSTATS) || 'null');
    return raw && typeof raw === 'object' ? { ...fresh(), ...raw } : fresh();
  } catch { return fresh(); }
}

let stats = load();
let dirtyMs = 0;

export function savePlayStats() {
  dirtyMs = 0;
  try { localStorage.setItem(STORAGE.PLAYSTATS, JSON.stringify(stats)); } catch { /* storage full or blocked */ }
}

/** After "Erase my data": start again from nothing, in memory too. */
export function resetPlayStats() { stats = fresh(); }

function thisWeek() {
  const i = weekIndex();
  if (stats.week?.i !== i) stats.week = { i, runs: 0, build: 0 };
  return stats.week;
}

/** A run started. Returns this week's run count, for the usage board. */
export function countRun() {
  stats.runs++;
  const w = thisWeek(); w.runs++;
  savePlayStats();
  return w.runs;
}

/** A monument finished after a run. */
export function countMonument() { stats.built++; savePlayStats(); }

/**
 * A monument finished in Build mode, in `seconds`. Records the best time
 * (fastest) and returns { best, improved, weekCount }.
 */
export function countBuild(landmarkId, seconds) {
  stats.buildWins++;
  const prev = stats.best[landmarkId];
  const improved = prev == null || seconds < prev;
  if (improved) stats.best[landmarkId] = seconds;
  const w = thisWeek(); w.build++;
  savePlayStats();
  return { best: stats.best[landmarkId], improved, weekCount: w.build };
}

/** Best Build mode time for a monument, in seconds, or null. */
export const bestBuildTime = (landmarkId) => stats.best[landmarkId] ?? null;

/** Active play time, called every frame with the frame's dt (seconds). */
export function addPlayTime(kind, dt) {
  const ms = dt * 1000;
  if (kind === 'run') stats.runMs += ms;
  else if (kind === 'puzzle') stats.builtMs += ms;
  else if (kind === 'build') stats.buildMs += ms;
  dirtyMs += ms;
  if (dirtyMs > 15000) savePlayStats();   // at most every 15 s of play
}

/** For Settings. */
export function playSummary() {
  const { runs, runMs, built, builtMs, buildWins, buildMs } = stats;
  return { runs, runMs, built: built + buildWins, builtMs: builtMs + buildMs, buildWins, buildMs };
}

/** "1 h 05 min", "38 min", "under a minute". */
export function formatMinutes(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return ms > 0 ? 'under a minute' : '0 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`;
}
