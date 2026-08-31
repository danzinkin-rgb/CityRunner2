/**
 * Native bridge.
 *
 * The same code ships to two places: the web build on GitHub Pages, and the
 * Capacitor app on iOS. Everything here must therefore degrade silently when
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
      const GameCenter = registerPlugin('GameCenter');

      native = { Haptics, ImpactStyle, NotificationType, App, GameCenter };

      // Fire-and-forget: a signed-out Game Center account or a player who
      // declines the sign-in sheet must never block or interrupt the game.
      console.log('GameCenter DEBUG JS: calling authenticate()');
      GameCenter.authenticate()
        .then((r) => console.log('GameCenter DEBUG JS: authenticate resolved', r))
        .catch((e) => console.log('GameCenter DEBUG JS: authenticate rejected', e));

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
  if (!native) return;
  fire(() => native.GameCenter.submitScore({ leaderboardId, score: Math.round(score) }));
}

/**
 * Report progress on an achievement, 0-100. Safe to call repeatedly with the
 * same or a lower value — GameKit keeps the highest percent it has ever seen
 * for a given achievement id, so callers never need to track "already sent".
 */
export function gkReportAchievement(achievementId, percentComplete) {
  if (!native) return;
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
