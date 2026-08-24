// Anonymous, privacy-first player identity.
//
// Compliance posture (see docs/COMPLIANCE.md):
//  - No email, no real name, no third-party analytics, no advertising ID.
//  - The player ID is a random UUID minted on the device. It is not derived
//    from any device fingerprint and identifies a save file, not a person.
//  - Display names are GENERATED from curated word lists and cannot be typed
//    freely. This is deliberate: a free-text name shown to other players is
//    user-generated content, which under the UK Age Appropriate Design Code
//    and Apple's UGC rules would require profanity filtering, a reporting
//    route and moderation. Generated names remove that obligation entirely.

import { STORAGE, ERASED_KEYS } from './storage-keys.js';

const KEY = STORAGE.IDENTITY;

// Word lists are chosen so that ANY adjective+noun combination is safe to
// display to a child. Keep them travel/positive themed; never add words that
// could combine into something crude.
const ADJECTIVES = [
  'Swift', 'Golden', 'Brave', 'Rapid', 'Sunny', 'Clever', 'Nimble', 'Bright',
  'Lucky', 'Bold', 'Merry', 'Turbo', 'Cosmic', 'Rocket', 'Silver', 'Mighty',
  'Jolly', 'Zippy', 'Dashing', 'Breezy', 'Stellar', 'Plucky', 'Wander',
];

const NOUNS = [
  'Falcon', 'Comet', 'Tiger', 'Sprinter', 'Voyager', 'Pigeon', 'Rocket',
  'Panther', 'Dolphin', 'Meteor', 'Explorer', 'Jaguar', 'Swallow', 'Cyclone',
  'Compass', 'Rambler', 'Otter', 'Puffin', 'Nomad', 'Skater', 'Hopper',
];

export function generateName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${a}${n}${num}`;
}

function newId() {
  if (crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // Fallback for older WebViews.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : ((r & 0x3) | 0x8)).toString(16);
  });
}

let cached = null;

export function getIdentity() {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      cached = JSON.parse(raw);
      if (cached && cached.id && cached.name) return cached;
    }
  } catch { /* corrupt or unavailable storage — fall through and re-mint */ }
  cached = { id: newId(), name: generateName(), createdAt: new Date().toISOString() };
  save();
  return cached;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cached)); } catch { /* private mode */ }
}

/** Reroll the display name. Returns the new name. */
export function rerollName() {
  const id = getIdentity();
  id.name = generateName();
  save();
  return id.name;
}

/**
 * Erase all locally held data — identity, progress, scores.
 * Required as a data-subject deletion route (UK GDPR) and surfaced in the UI.
 *
 * WHAT GETS ERASED IS NOT DECIDED HERE. The list lives in storage-keys.js,
 * next to the reason each key is on it, so that adding a key anywhere in the
 * game forces a decision about this function instead of silently bypassing
 * it. Removing keys one at a time, in a loop, also means a key that throws
 * cannot stop the ones after it from being removed — the old shape put all
 * three inside one try block, where a single failure would have left the rest
 * of the player's data on the device while the UI reported success.
 *
 * Erasing storage is only half of it: whatever this module already read is
 * still in memory. `cached` is dropped below so the next getIdentity() mints
 * a fresh anonymous profile rather than handing back the erased one. The
 * caller is responsible for its own in-memory copies (src/main.js resets
 * `save` and re-persists immediately after calling this).
 */
export function eraseAllData() {
  for (const key of ERASED_KEYS) {
    try { localStorage.removeItem(key); } catch { /* keep going: the rest must still go */ }
  }
  cached = null;
}
