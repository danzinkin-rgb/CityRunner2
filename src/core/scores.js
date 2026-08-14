// Leaderboard service.
//
// The backend is pluggable. Today it is device-local; swapping in Supabase is
// a config change, not a rewrite, because everything goes through submit()/top().
//
// SCORE INTEGRITY — read before trusting any number in here.
// This game runs entirely on the player's device. Anyone can open developer
// tools and call submit() with any value. The checks below raise the cost of
// casual cheating; they do NOT make scores trustworthy. When a remote backend
// is added, EVERY check in this file must be repeated server-side, because a
// client-side check is a suggestion, not a control.

import { getIdentity } from './identity.js';
import { dailyKey } from './rng.js';

const STORE = 'cityrunner2.scores';

// ---------------------------------------------------------------------------
// Plausibility bounds
// ---------------------------------------------------------------------------

// Score accrues as 2 x speed per second, plus 25 per souvenir, plus a puzzle
// bonus of at most 50 x 60 = 3000 per level. Speed starts at ~20 and ramps by
// 0.25/s. These bounds are deliberately generous — the goal is to reject the
// absurd (nine billion), not to police skilled play.
export function maxPlausibleScore(seconds) {
  const t = Math.max(0, seconds);
  const fromDistance = 2 * (22 * t + 0.125 * t * t);
  const fromSouvenirs = 200 * t;      // ~8 souvenirs/sec, well above real rates
  const fromPuzzle = 3000;
  return Math.ceil(fromDistance + fromSouvenirs + fromPuzzle + 500);
}

const MIN_RUN_SECONDS = 3;

// ---------------------------------------------------------------------------
// Sessions — a score may only be submitted against a session that actually ran
// ---------------------------------------------------------------------------
let session = null;

export function startSession(mode, cityId, level, seed) {
  session = {
    token: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    mode, cityId, level, seed,
    startedAt: Date.now(),
    submitted: false,
  };
  return session.token;
}

export function currentSession() { return session; }

/**
 * Validate and record a score.
 * Returns { ok, reason?, entry? }. Never throws — a failed submission must not
 * interrupt play.
 */
export function submit(score) {
  if (!session) return { ok: false, reason: 'no-session' };
  if (session.submitted) return { ok: false, reason: 'already-submitted' };

  const seconds = (Date.now() - session.startedAt) / 1000;
  if (seconds < MIN_RUN_SECONDS) return { ok: false, reason: 'too-fast' };

  const rounded = Math.round(Number(score));
  if (!Number.isFinite(rounded) || rounded < 0) return { ok: false, reason: 'not-a-number' };
  if (rounded > maxPlausibleScore(seconds)) return { ok: false, reason: 'implausible' };

  session.submitted = true;
  const me = getIdentity();
  const entry = {
    id: me.id,
    name: me.name,
    score: rounded,
    mode: session.mode,
    cityId: session.cityId,
    level: session.level,
    seed: session.seed,
    day: dailyKey(),
    at: new Date().toISOString(),
  };
  record(entry);
  return { ok: true, entry };
}

// ---------------------------------------------------------------------------
// Local backend
// ---------------------------------------------------------------------------
function readAll() {
  try {
    const raw = localStorage.getItem(STORE);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeAll(list) {
  try { localStorage.setItem(STORE, JSON.stringify(list.slice(0, 500))); } catch { /* full or private */ }
}

function record(entry) {
  const all = readAll();
  all.push(entry);
  all.sort((a, b) => b.score - a.score);
  writeAll(all);
}

/**
 * Top scores. filter: { mode, cityId, level, day }
 * Returns one best entry per player, highest first.
 */
export function top(filter = {}, limit = 10) {
  const all = readAll().filter((e) => (
    (filter.mode === undefined || e.mode === filter.mode) &&
    (filter.cityId === undefined || e.cityId === filter.cityId) &&
    (filter.level === undefined || e.level === filter.level) &&
    (filter.day === undefined || e.day === filter.day)
  ));
  const best = new Map();
  for (const e of all) {
    const prev = best.get(e.id);
    if (!prev || e.score > prev.score) best.set(e.id, e);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function personalBest(filter = {}) {
  const me = getIdentity();
  const mine = top({ ...filter }, 500).find((e) => e.id === me.id);
  return mine ? mine.score : 0;
}

export function hasPlayedDaily(day = dailyKey()) {
  const me = getIdentity();
  return readAll().some((e) => e.id === me.id && e.mode === 'daily' && e.day === day);
}
