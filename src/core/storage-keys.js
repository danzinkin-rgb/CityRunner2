/**
 * Every localStorage key this game writes, and what "Erase my data" does to it.
 *
 * WHY THIS FILE EXISTS. The keys used to be string literals scattered across
 * five modules, and eraseAllData() re-typed three of them a second time. That
 * shape has one failure mode and it is silent: someone adds a sixth key in a
 * new module, nobody thinks about the erase path, and the deletion route the
 * privacy policy promises quietly stops covering everything. Nothing throws,
 * no test goes red, and the gap is only found by reading all five modules at
 * once. So the keys are declared here, every module imports its own key from
 * here, and every key must appear in exactly one of the two lists below.
 * Adding a key without choosing a list fails test/storage-keys.mjs.
 *
 * THE ERASE / KEEP SPLIT IS A PRODUCT DECISION, not an oversight.
 *
 * ERASED — everything that is about the player:
 *   the anonymous id and generated name, their progress, their scores. This
 *   is the data-subject deletion route under UK GDPR (docs/COMPLIANCE.md §4)
 *   and it matches the confirmation text the player is shown, word for word:
 *   "Erase your nickname, progress and scores from this device?"
 *
 * KEPT — deliberately, and each for its own reason:
 *   - the entitlement cache is a copy of Apple's receipt, not a record we own.
 *     Apple's copy is authoritative and survives an app delete. Wiping ours
 *     would show a paying player a paywall on the very next screen, which
 *     reads as "erasing my data took my purchase away" — the opposite of what
 *     the button promises. The purchase itself is untouched either way, so the
 *     only thing clearing it achieves is a scare and a trip through Restore.
 *   - audio preferences are a device setting (music on, sfx on, volume), not
 *     personal data. They are not named in the confirmation text, they say
 *     nothing about who the player is, and silently un-muting the game for
 *     someone who muted it is a bug, not a privacy win.
 *
 * If a key ever holds something a regulator would call personal data, it goes
 * in ERASED. The KEPT list is for device state, and it needs a reason in
 * writing, right here, next to the key.
 */

export const STORAGE = {
  /** Anonymous UUID + generated display name. src/core/identity.js */
  IDENTITY: 'cityrunner2.identity',
  /** Stars, coins, best score, owned characters. src/main.js */
  SAVE: 'cityrunner2',
  /** Local leaderboard entries. src/core/scores.js */
  SCORES: 'cityrunner2.scores',
  /** Cache of owned IAP product ids. src/core/entitlements.js */
  ENTITLEMENTS: 'cityrunner2.ent',
  /** Music/sfx/volume preferences. src/core/audio.js */
  AUDIO: 'cityrunner2.audio',
};

/** Removed by eraseAllData(). See the split rationale above. */
export const ERASED_KEYS = [STORAGE.IDENTITY, STORAGE.SAVE, STORAGE.SCORES];

/** Deliberately survives eraseAllData(). Each entry is justified above. */
export const KEPT_KEYS = [STORAGE.ENTITLEMENTS, STORAGE.AUDIO];

/** Every key, for tests that need to assert the two lists are exhaustive. */
export const ALL_KEYS = [...ERASED_KEYS, ...KEPT_KEYS];
