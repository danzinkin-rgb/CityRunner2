/**
 * Game Center — the leaderboard/achievement id scheme, and when to call them.
 *
 * src/core/native.js owns the plugin wrapper (how to talk to GameKit);
 * this file owns WHAT to talk to it about. That split matters because these
 * ids are permanent the moment they go live in App Store Connect — see the
 * "Product ids are permanent" comment in entitlements.js for the same rule
 * applied to IAP. Keeping them in one place, spelled out once, is what makes
 * that promise checkable.
 *
 * Per-city ids are derived from `cityId`, not enumerated, so a future city
 * (src/cities/themes.js) needs only a new leaderboard/achievement created in
 * App Store Connect — no code change here. Same reasoning as GRANTS_EVERYTHING
 * in entitlements.js not being a city list.
 *
 * Reporting is stateless and idempotent by design: every function below can
 * be called every time its condition is merely TRUE, with no "have I already
 * sent this" bookkeeping. GameKit itself keeps the highest score/percent it
 * has ever seen per id, so a repeat call is a no-op on Apple's side. That is
 * deliberately simpler than mirroring GameKit's own dedupe locally.
 */

import { CITIES } from '../cities/themes.js';
import { gkSubmitScore, gkReportAchievement } from './native.js';
import { lifetimeScore } from './scores.js';
import { isFounder } from './entitlements.js';

const NS = 'uk.co.zinkin.cityrunner';

export const LEADERBOARDS = {
  DAILY: `${NS}.leaderboard.daily`,
  OVERALL: `${NS}.leaderboard.overall`,
};

/** Per-city leaderboard id. Works for any cityId, present or future. */
export function leaderboardForCity(cityId) {
  return `${NS}.leaderboard.${cityId}`;
}

export const ACHIEVEMENTS = {
  ALL_MONUMENTS: `${NS}.achievement.allmonuments`,
  DAILY_FIRST: `${NS}.achievement.daily.first`,
  DAILY_STREAK_7: `${NS}.achievement.daily.streak7`,
  SOUVENIRS_1000: `${NS}.achievement.souvenirs1000`,
  FOUNDER: `${NS}.achievement.founder`,
};

/** Per-city "completed all three monuments" achievement id. */
function achievementForCity(cityId) {
  return `${NS}.achievement.city.${cityId}`;
}

/**
 * Called once per finished run (win or lose — a run that ends still counts
 * for the leaderboards, matching the local submit() this mirrors). Reports
 * the run's score to the relevant leaderboards and re-checks every
 * achievement that depends on save data.
 *
 * `save` is the player's save object as main.js already maintains it —
 * this module reads it, never writes it.
 */
export function reportRun({ cityId, score, dailyMode, save }) {
  gkSubmitScore(leaderboardForCity(cityId), score);
  if (dailyMode) gkSubmitScore(LEADERBOARDS.DAILY, score);
  gkSubmitScore(LEADERBOARDS.OVERALL, lifetimeScore());

  reportProgress(save);
}

/** Re-check every save-derived achievement. Cheap and safe to call often. */
export function reportProgress(save) {
  if (!save) return;

  const stars = save.stars || {};
  let citiesComplete = 0;
  for (const c of CITIES) {
    const done = (stars[c.id] || 0) >= 3;
    if (done) citiesComplete++;
    gkReportAchievement(achievementForCity(c.id), (Math.min(3, stars[c.id] || 0) / 3) * 100);
  }
  gkReportAchievement(ACHIEVEMENTS.ALL_MONUMENTS, (citiesComplete / CITIES.length) * 100);

  const streak = save.dailyStreak || 0;
  if (streak >= 1) gkReportAchievement(ACHIEVEMENTS.DAILY_FIRST, 100);
  if (streak >= 1) gkReportAchievement(ACHIEVEMENTS.DAILY_STREAK_7, (Math.min(7, streak) / 7) * 100);

  if (Number.isFinite(save.coins)) {
    gkReportAchievement(ACHIEVEMENTS.SOUVENIRS_1000, (Math.min(1000, save.coins) / 1000) * 100);
  }

  if (isFounder()) gkReportAchievement(ACHIEVEMENTS.FOUNDER, 100);
}
