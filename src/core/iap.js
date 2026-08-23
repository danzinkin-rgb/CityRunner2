/**
 * In-app purchase transport.
 *
 * This is the ONLY file that talks to a store. `entitlements.js` decides what
 * being paid up means; this decides how money changes hands. The split exists
 * so the policy is testable on Windows and in a browser, where no store can
 * possibly exist, and so the native work is confined to one file.
 *
 * ---------------------------------------------------------------------------
 * STATUS: the native half is NOT wired up yet, and this file is honest about
 * that rather than pretending. Every function below works correctly today in
 * the sense that it fails safe — on the web, and on an iOS build with no
 * plugin installed, `getOffer()` returns null and the paywall never appears.
 * Nothing is broken; nothing is purchasable.
 *
 * Finishing it requires a Mac (CocoaPods, Xcode, a sandbox tester account) and
 * is written up step by step in docs/FREEMIUM-IAP.md. The work is confined to
 * `loadStore()` and the three calls below it.
 *
 * ---------------------------------------------------------------------------
 * WHICH PLUGIN — and one that must not be used
 *
 * Checked against the npm registry on 2026-08-23, against this repo's
 * Capacitor 7.6.8:
 *
 *   cordova-plugin-purchase@13.18.0  (updated 2026-07-16)  <- the candidate.
 *       Actively maintained, StoreKit 2 on iOS, consumed through Capacitor's
 *       Cordova compatibility layer. Declares no peer dependency on Capacitor,
 *       so nothing forces a version conflict — but that also means the only
 *       real proof it works here is a native build, which is why it is NOT in
 *       package.json yet. Adding a dependency that cannot be built or tested
 *       from this machine would be a guess wearing a lockfile.
 *
 *   @capacitor-community/in-app-purchases  <- DOES NOT EXIST. It is the name
 *       everyone reaches for from memory, including me; the registry returns
 *       404. Do not spend an afternoon on it.
 *
 *   @revenuecat/purchases-capacitor@13.4.1  <- REJECTED, on two independent
 *       grounds. It requires @capacitor/core >= 8 and this repo is on 7.6.8;
 *       and, decisively, it is a third-party SaaS that reports purchase and
 *       device data to RevenueCat's servers. docs/COMPLIANCE.md §4 states "no
 *       third-party SDKs", and the App Store privacy answers in
 *       docs/APPSTORE-SUBMISSION.md are filed as Data Not Collected. Adding
 *       RevenueCat would falsify a submitted privacy label for a 4+ title
 *       likely to be used by children. Convenience does not buy that.
 *
 * Apple's own StoreKit, reached through a bridge, is not a third-party SDK in
 * the sense COMPLIANCE.md means — no data goes anywhere except to Apple, who
 * is already processing the payment. That carve-out is recorded explicitly in
 * docs/COMPLIANCE.md so this file does not quietly contradict it.
 */

import { isNative } from './native.js';
import { PRODUCTS, grant, reconcile } from './entitlements.js';

/**
 * Preference order when deciding what to offer. The store is asked for both
 * and the first one it actually returns as purchasable wins — which is how
 * the three-month founder window closes without an app update or a date
 * constant anywhere in the client. See entitlements.js.
 */
const OFFER_ORDER = [PRODUCTS.FOUNDER, PRODUCTS.UNLOCK];

let store = null;       // resolved plugin handle, or null everywhere else
let ready = null;       // in-flight init promise
let offer = null;       // cached {productId, price, title} once known

/**
 * Load the native store plugin. Returns null on the web and on any native
 * build where the plugin is absent or fails to initialise.
 *
 * MAC TASK: replace the body's `return null` with the real bootstrap. The
 * import must stay dynamic and inside the try — a static import would pull
 * the plugin into the web bundle, which both bloats it and breaks it.
 */
async function loadStore() {
  if (!isNative()) return null;
  try {
    // --- BEGIN MAC TASK (docs/FREEMIUM-IAP.md §4) -------------------------
    // const { store: cdvStore, ProductType, Platform } = window.CdvPurchase ?? {};
    // if (!cdvStore) return null;
    // cdvStore.register(OFFER_ORDER.map((id) => ({
    //   id, type: ProductType.NON_CONSUMABLE, platform: Platform.APPLE_APPSTORE,
    // })));
    // cdvStore.when().approved((tx) => tx.verify()).verified((receipt) => {
    //   receipt.finish();
    //   for (const item of receipt.collection ?? []) grant(item.id);
    // });
    // await cdvStore.initialize([Platform.APPLE_APPSTORE]);
    // return cdvStore;
    // --- END MAC TASK ----------------------------------------------------
    return null;
  } catch {
    // A store failure must never take the game down. The player simply sees
    // no offer, which is strictly better than a crash on launch — and far
    // better than a paywall that cannot be dismissed because its buy button
    // throws.
    return null;
  }
}

/** Prepare the store. Safe to call anywhere, including the web build. */
export function initIAP() {
  if (ready) return ready;
  ready = (async () => {
    store = await loadStore();
    return store;
  })();
  return ready;
}

/**
 * The offer to show, or null if there is nothing to sell right now.
 *
 * Null is a completely normal answer, not an error: it is what the web build
 * returns, what an unfinished native build returns, and what a device with no
 * network returns. Every caller must treat null as "show no paywall".
 */
export async function getOffer() {
  if (offer) return offer;
  await initIAP();
  if (!store) return null;
  try {
    for (const id of OFFER_ORDER) {
      const p = store.get?.(id);
      if (p && p.canPurchase) {
        // Price comes from the store, localised by Apple to the user's own
        // storefront. Never hardcode "£1.99" in the UI — the same product is
        // $1.99 in the US and something else again in Japan, and a wrong
        // price on screen is a refund request at best.
        offer = { productId: id, price: p.pricing?.price ?? '', title: p.title ?? '' };
        return offer;
      }
    }
  } catch { /* treated as no offer */ }
  return null;
}

/**
 * Buy a product. Resolves true only once the store has confirmed.
 *
 * Note that the entitlement is granted by the `verified` handler in
 * loadStore(), not here — that path also fires for purchases completed on
 * another device or interrupted mid-flight, and for a child's purchase
 * approved later through Ask to Buy, which can land minutes or days after
 * this promise has already resolved.
 */
export async function purchase(productId) {
  await initIAP();
  if (!store) return false;
  try {
    const p = store.get?.(productId);
    if (!p) return false;
    await p.getOffer()?.order();
    return true;
  } catch {
    // Includes the ordinary case of the player cancelling the sheet, which is
    // not an error and must not surface as one.
    return false;
  }
}

/**
 * Restore previous purchases.
 *
 * MANDATORY, not optional. Apple rejects apps selling non-consumables with no
 * restore control (docs/PROPOSALS.md §4 records this). It lives in Settings so
 * it is always reachable, not only from a paywall the player may never see
 * again after buying.
 */
export async function restore() {
  await initIAP();
  if (!store) return [];
  try {
    await store.restorePurchases?.();
    const found = OFFER_ORDER.filter((id) => store.get?.(id)?.owned);
    reconcile(found);
    return found;
  } catch {
    return [];
  }
}
