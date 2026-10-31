/**
 * Native bridge.
 *
 * The same code ships to three places: the web build on GitHub Pages, and the
 * Capacitor app on iOS and on Android. Everything here must therefore degrade silently when
 * no native runtime exists — the web build must never see an error, and a
 * missing plugin must never break gameplay.
 *
 * Capacitor's plugins are imported lazily so the web bundle does not pay for
 * code it will never call.
 */

let native = null;          // resolved capability set, or null on the web
let ready = null;           // in-flight init promise

export function isNative() {
  return !!(globalThis.Capacitor && globalThis.Capacitor.isNativePlatform
    && globalThis.Capacitor.isNativePlatform());
}

/**
 * 'ios', 'android' or 'web'. A native runtime that cannot say is taken as
 * iOS, the only native platform before Android, so nothing there changes.
 */
export function nativePlatform() {
  return isNative() ? (globalThis.Capacitor.getPlatform?.() || 'ios') : 'web';
}

/**
 * Prepare native integrations. Safe to call on the web, where it resolves to
 * null and every helper below becomes a no-op.
 */
export function initNative() {
  if (ready) return ready;
  ready = (async () => {
    if (!isNative()) return null;
    try {
      const [{ Haptics, ImpactStyle, NotificationType }, { StatusBar, Style }, { SplashScreen }, { App }, { registerPlugin }] =
        await Promise.all([
          import('@capacitor/haptics'),
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
          import('@capacitor/app'),
          import('@capacitor/core'),
        ]);

      // The game draws its own full-screen scene; the status bar overlays it.
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch { /* iPad and some iOS versions refuse; not fatal */ }

      try { await SplashScreen.hide(); } catch { /* already hidden */ }

      // GameCenter has no npm package: it is ~60 lines of Swift dropped
      // straight into ios/App/App/ (see GameCenterPlugin.swift), which
      // registerPlugin() finds by name at runtime. No podspec, no Capacitor
      // version coupling to track — see docs/COMPLIANCE.md §4 on why this
      // project writes its own thin native wrappers instead of taking on a
      // third-party plugin for something Apple's own SDK already does.
      // Game Center is Swift only, so Android gets null and the gk* helpers
      // below return early.
      const GameCenter = nativePlatform() === 'ios' ? registerPlugin('GameCenter') : null;
      // The share sheet and the store's rating prompt, the same way on both:
      // ios/App/App/GrowthPlugin.swift and, on Android,
      // android/app/src/main/java/uk/co/zinkin/cityrunner/GrowthPlugin.java.
      const Growth = registerPlugin('Growth');

      native = { Haptics, ImpactStyle, NotificationType, App, GameCenter, Growth };

      // Fire-and-forget: a signed-out Game Center account or a player who
      // declines the sign-in sheet must never block or interrupt the game.
      if (GameCenter) fire(() => GameCenter.authenticate());

      return native;
    } catch {
      // A plugin failing to load must never take the game down.
      return null;
    }
  })();
  return ready;
}

// ---------------------------------------------------------------------------
// Haptics. Each call is fire-and-forget: a rejected promise here is irrelevant
// to the player and must not surface as an unhandled rejection.
// ---------------------------------------------------------------------------
const fire = (fn) => { try { const p = fn(); if (p && p.catch) p.catch(() => {}); } catch { /* ignore */ } };

/** Light tap — collecting a souvenir, placing a puzzle block. */
export function hapticLight() {
  if (!native) return;
  fire(() => native.Haptics.impact({ style: native.ImpactStyle.Light }));
}

/** Medium tap — changing lane, landing a jump. */
export function hapticMedium() {
  if (!native) return;
  fire(() => native.Haptics.impact({ style: native.ImpactStyle.Medium }));
}

/** Heavy thud — crashing. */
export function hapticHeavy() {
  if (!native) return;
  fire(() => native.Haptics.impact({ style: native.ImpactStyle.Heavy }));
}

/** Success pattern — monument completed. */
export function hapticSuccess() {
  if (!native) return;
  fire(() => native.Haptics.notification({ type: native.NotificationType.Success }));
}

// ---------------------------------------------------------------------------
// Game Center. Every call is best-effort: a player who is signed out, offline,
// or on a device where GameKit refuses for any reason must see exactly the
// same game as a player fully authenticated. src/core/gamecenter.js owns the
// leaderboard/achievement id scheme and decides WHEN to call these; this file
// only wraps the plugin call itself.
// ---------------------------------------------------------------------------

/** Submit a score to one Game Center leaderboard. Fire-and-forget. */
export function gkSubmitScore(leaderboardId, score) {
  if (!native?.GameCenter) return;
  fire(() => native.GameCenter.submitScore({ leaderboardId, score: Math.round(score) }));
}

/**
 * Report progress on an achievement, 0-100. Safe to call repeatedly with the
 * same or a lower value — GameKit keeps the highest percent it has ever seen
 * for a given achievement id, so callers never need to track "already sent".
 */
export function gkReportAchievement(achievementId, percentComplete) {
  if (!native?.GameCenter) return;
  fire(() => native.GameCenter.reportAchievement({
    achievementId,
    percentComplete: Math.max(0, Math.min(100, percentComplete)),
  }));
}

/**
 * Run a callback whenever the app is backgrounded, so the game can pause.
 * On the web the existing `visibilitychange` handler already covers this;
 * this adds the native equivalent, which fires more reliably on iOS.
 */
export function onAppPause(cb) {
  initNative().then((n) => {
    if (!n) return;
    try { n.App.addListener('appStateChange', ({ isActive }) => { if (!isActive) cb(); }); }
    catch { /* listener unavailable */ }
  });
}

// ---------------------------------------------------------------------------
// Sharing and ratings (ios/App/App/GrowthPlugin.swift). Native only: the web
// build has no share button, because the web version is not promoted and the
// link shared is the store's own (storeLink below).
// ---------------------------------------------------------------------------

/**
 * True where the share button should show: once initNative() has resolved
 * with the Growth plugin in place, so a plugin that failed to load never
 * leaves a button that does nothing.
 */
export function canShare() {
  return !!native?.Growth;
}

/**
 * Everything that differs by store, in one place: the name and account the
 * paywall and Settings mention, and the link a share sends. `google` is
 * what iap.js uses to pick the plugin's platform.
 */
const STORES = {
  apple: {
    google: false, name: 'the App Store', account: 'Apple Account',
    link: 'https://apps.apple.com/app/id6806808248',
  },
  google: {
    google: true, name: 'Google Play', account: 'Google Account',
    link: 'https://play.google.com/store/apps/details?id=uk.co.zinkin.cityrunner',
  },
};

/** The store this copy came from. The web build is treated as Apple's. */
export function storeFacts() {
  return nativePlatform() === 'android' ? STORES.google : STORES.apple;
}

/** Open the share sheet with a line of text and a link. Never throws. */
export async function shareText(text, url) {
  if (!native?.Growth) return false;
  try { return !!(await native.Growth.share({ text, url })).shared; } catch { return false; }
}

/**
 * Ask for the store's rating prompt: StoreKit on iOS, Play's in-app review on
 * Android. The store decides whether to show it.
 */
export function requestReview() {
  if (!native?.Growth) return;
  fire(() => native.Growth.requestReview());
}

/**
 * Android's system back button and back gesture. iOS has neither, so this
 * registers nothing there or on the web.
 *
 * `handle` returns true when it did something (closed an overlay, paused a
 * run). When it returns false the player is at the menu, and the app goes to
 * the background, which is what back does at the root of an Android app since
 * Android 12. Once a listener exists Capacitor no longer does that itself.
 */
export function onBackButton(handle) {
  initNative().then((n) => {
    if (!n || nativePlatform() !== 'android') return;
    try {
      n.App.addListener('backButton', () => {
        if (!handle()) fire(() => n.App.minimizeApp());
      });
    } catch { /* listener unavailable */ }
  });
}
