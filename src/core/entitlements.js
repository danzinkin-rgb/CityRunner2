/**
 * Entitlements — the single source of truth for "may this player play this?"
 *
 * Nothing else in the game should decide what is locked. `buildCitySelect()`
 * asks this module; the paywall asks this module; the run start path asks this
 * module. One answer, one place to change it.
 *
 * ---------------------------------------------------------------------------
 * THE MODEL (decided 2026-08, supersedes docs/PROPOSALS.md §4 and §5)
 *
 * Two locks exist and they are independent. Keeping them separate is the whole
 * point of this file:
 *
 *   PROGRESSION lock — earned. You reach Paris by starring New York. This is
 *                      the game's own pacing and it predates any purchase.
 *   ENTITLEMENT lock — bought. Applies only on iOS, never on the web build.
 *
 * A city is playable when BOTH are open. They are reported separately so the
 * UI can say the true thing: "keep playing to unlock" is a lie on a city that
 * no amount of playing will open, and that lie is exactly the kind of thing
 * the Children's Code treats as a dark pattern.
 *
 * Launch shape:
 *   - 3 cities free forever, 3 monuments each. That is 9 monuments, the daily
 *     challenge, souvenirs and the leaderboard, at no cost — a complete game,
 *     not a teaser. (docs/PROPOSALS.md §4 sets that bar; this meets it.)
 *   - Everything else is paid: the remaining city, all future cities, and any
 *     monument added to a free city beyond its first three.
 *
 * Two products, never on sale at the same time:
 *   FOUNDER — £1.99/$1.99, first ~3 months only. Grants everything, forever,
 *             including cities that do not exist yet. Early adopters who paid
 *             £1.99 are never asked for money again. That promise is the
 *             product; honour it (see GRANTS_EVERYTHING below — FOUNDER is
 *             deliberately not expressed as a list of city ids, because a list
 *             could not cover a city nobody has designed yet).
 *   UNLOCK  — replaces FOUNDER when the window closes, at a higher price.
 *
 * WHY THERE IS NO LAUNCH DATE IN THIS FILE. The obvious implementation of "on
 * sale for three months" is a hardcoded cutoff date. Do not do that. The store
 * is authoritative about what is purchasable, the device clock is not — it is
 * user-settable, it skews, and a date constant would silently start showing an
 * unbuyable product to everyone the moment the window lapsed. Instead the
 * window is closed by removing FOUNDER from sale in App Store Connect, and the
 * client simply offers whichever product the store actually returns. Closing
 * the window as a store action rather than an app update also means it needs
 * no review. See docs/FREEMIUM-IAP.md.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS AND IS NOT A SECURITY BOUNDARY
 *
 * This module is not one. It runs on the player's device, in JavaScript they
 * can read and edit. Anyone determined to unlock Rome for free can do so, and
 * no amount of client-side cleverness changes that. The receipt on file with
 * Apple is the real record; this is a cache of it so the game can answer
 * instantly and offline.
 *
 * That is a deliberate trade, and the right one here: the cost of being wrong
 * is one unpaid city in a £1.99 game, while the cost of getting strict about
 * it is a game that stops working on a plane. Do NOT "harden" this by gating
 * play behind a network check.
 */

import { isNative } from './native.js';
import { STORAGE } from './storage-keys.js';

// --------------------------------------------------------------- the policy

/**
 * The cities that are free forever. THREE ids, and changing this list changes
 * what people have already been given — so it is a promise, not a setting.
 *
 * Order matches src/cities/themes.js. Rome is the paid one: it sits last in
 * the progression chain, so gating it interrupts nobody's first session, and
 * its monuments are the largest puzzles in the game (25 pieces), which makes
 * it the most substantial thing GBP 1.99 can buy.
 */
export const FREE_CITIES = ['nyc', 'paris', 'london'];

/**
 * Free monuments per free city. Cities ship with exactly three today, so this
 * changes nothing now — it exists so that ADDING a fourth monument to New York
 * later makes that monument paid without anyone having to remember to gate it.
 * The rule is written down once, here, rather than rediscovered per city.
 */
export const FREE_LEVELS_PER_CITY = 3;

/**
 * Product identifiers. These must match App Store Connect character for
 * character — a typo here is a product that silently never loads, and the
 * paywall degrades to "store not reachable" with nothing in the logs to say
 * why. They are namespaced under the real bundle id (uk.co.zinkin.cityrunner,
 * from capacitor.config.json) per Apple's convention.
 *
 * Product ids are permanent. Apple does not allow reusing or renaming one
 * after it has been created, so these strings are effectively immutable.
 */
export const PRODUCTS = {
  FOUNDER: 'uk.co.zinkin.cityrunner.founder',
  UNLOCK: 'uk.co.zinkin.cityrunner.unlock.allcities',
};

/**
 * What each product grants. Both currently grant everything; they differ in
 * price and in when they are on sale, not in content. Kept as a set of product
 * ids checked against a predicate rather than as a city list, so that a future
 * city is covered automatically — a list would quietly fail to include it, and
 * a founder would be asked to pay twice.
 */
const GRANTS_EVERYTHING = new Set([PRODUCTS.FOUNDER, PRODUCTS.UNLOCK]);

// -------------------------------------------------------------- the storage

// Deliberately NOT cleared by "erase my data" — see src/core/storage-keys.js
// for why wiping a receipt cache would read as losing a purchase.
const KEY = STORAGE.ENTITLEMENTS;

/** Owned product ids. A cache of Apple's receipt, not the record itself. */
let owned = new Set();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    owned = new Set(Array.isArray(raw) ? raw.filter((s) => typeof s === 'string') : []);
  } catch {
    // Corrupt or unavailable storage must not break launch. An empty set is
    // the safe wrong answer: the player sees the paywall, taps Restore, and
    // gets their purchase back from Apple. The opposite default would hand
    // out paid content on a parse error.
    owned = new Set();
  }
}
load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify([...owned]));
  } catch {
    /* private mode / quota — in-memory for this session is an acceptable fallback */
  }
}

// --------------------------------------------------------------- the answers

/**
 * True when purchases do not apply at all — the web build.
 *
 * The GitHub Pages build stays completely free and completely unlocked, as
 * docs/PROPOSALS.md §4 requires. It has no StoreKit, no way to pay, and
 * gating it would just be a broken game on the open web.
 */
export function isFreeBuild() {
  return !isNative();
}

/** True when the player owns something that grants all content. */
export function hasFullAccess() {
  if (isFreeBuild()) return true;
  for (const id of owned) if (GRANTS_EVERYTHING.has(id)) return true;
  return false;
}

/** True when the player is a founder — used only to thank them, never to gate. */
export function isFounder() {
  return owned.has(PRODUCTS.FOUNDER);
}

/** Does this city need paying for, ignoring whether the player has paid? */
export function isPaidCity(cityId) {
  return !FREE_CITIES.includes(cityId);
}

/** Does this monument need paying for, ignoring whether the player has paid? */
export function isPaidLevel(cityId, level) {
  return isPaidCity(cityId) || level > FREE_LEVELS_PER_CITY;
}

/** May the player enter this city? */
export function isCityEntitled(cityId) {
  return !isPaidCity(cityId) || hasFullAccess();
}

/** May the player play this specific monument? */
export function isLevelEntitled(cityId, level) {
  return !isPaidLevel(cityId, level) || hasFullAccess();
}

/**
 * Record a completed purchase or restore. Called only by src/core/iap.js after
 * the store has confirmed it — never from UI code, and never optimistically
 * from a button handler.
 */
export function grant(productId) {
  if (!productId) return;
  owned.add(productId);
  persist();
}

/**
 * Merge in what the store just reported.
 *
 * Restore is authoritative in the ADD direction only: it will re-grant a
 * purchase the cache lost. It deliberately does not revoke on an empty result,
 * because "the store returned nothing" is far more often a network failure or
 * a signed-out sandbox account than a genuine loss of a non-consumable — and
 * revoking on that would take paid content away from someone on a bad train.
 */
export function reconcile(productIds) {
  if (!Array.isArray(productIds)) return;
  let changed = false;
  for (const id of productIds) {
    if (typeof id === 'string' && !owned.has(id)) {
      owned.add(id);
      changed = true;
    }
  }
  if (changed) persist();
}

/** Test/debug only: wipe the local entitlement cache. Never call from game code. */
export function __resetForTests() {
  owned = new Set();
  persist();
}
