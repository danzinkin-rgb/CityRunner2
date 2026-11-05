import UIKit
import Capacitor

// Apps built with the iOS 27 SDK must use the scene life cycle: one built
// without it fails to launch ("UIScene life cycle is required for apps built
// with this SDK", Xcode 27, November 2026). Capacitor 7's template predates
// that, so the window now belongs to this scene, made from Main.storyboard
// (UISceneStoryboardFile in Info.plist), and the URL and user-activity opens
// that used to reach AppDelegate arrive here and go on to Capacitor the same
// way. App-level events (active, background) are still posted as
// UIApplication notifications, which is what Capacitor's App plugin, and so
// the game's pause on leaving, listens for.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        // Launched by opening a URL or a user activity: hand it on as the
        // app delegate's launch path used to.
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
