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
      const [{ Haptics, ImpactStyle, NotificationType }, { StatusBar, Style }, { SplashScreen }, { App }] =
        await Promise.all([
          import('@capacitor/haptics'),
          import('@capacitor/status-bar'),
          import('@capacitor/splash-screen'),
          import('@capacitor/app'),
        ]);

      // The game draws its own full-screen scene; the status bar overlays it.
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setOverlaysWebView({ overlay: true });
      } catch { /* iPad and some iOS versions refuse; not fatal */ }

      try { await SplashScreen.hide(); } catch { /* already hidden */ }

      native = { Haptics, ImpactStyle, NotificationType, App };
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
