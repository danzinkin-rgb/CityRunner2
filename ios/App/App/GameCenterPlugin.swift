import Capacitor
import GameKit

/// Thin wrapper around GameKit. Deliberately not a published Capacitor
/// plugin package — see the comment above registerPlugin('GameCenter') in
/// src/core/native.js for why: no podspec, no Capacitor-version coupling,
/// nothing to keep in sync with a package this project doesn't control.
///
/// Every method fails soft. A signed-out account, a declined sign-in sheet,
/// or a device with no network must leave the game exactly as playable as
/// before — GameKit failures are logged, never surfaced to JS as errors that
/// could interrupt a run.
@objc(GameCenterPlugin)
public class GameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GameCenterPlugin"
    public let jsName = "GameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reportAchievement", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showDashboard", returnType: CAPPluginReturnPromise),
    ]

    @objc func authenticate(_ call: CAPPluginCall) {
        GKLocalPlayer.local.authenticateHandler = { viewController, error in
            if let vc = viewController {
                // Apple's own sign-in sheet. Present it on top of whatever is
                // currently showing; the game underneath is already paused-safe.
                DispatchQueue.main.async {
                    self.bridge?.viewController?.present(vc, animated: true)
                }
                return
            }
            if error != nil {
                call.resolve(["authenticated": false])
                return
            }
            call.resolve(["authenticated": GKLocalPlayer.local.isAuthenticated])
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated,
              let leaderboardId = call.getString("leaderboardId") else {
            call.resolve(["reported": false])
            return
        }
        let value = call.getInt("score") ?? 0
        GKLeaderboard.submitScore(
            value, context: 0,
            player: GKLocalPlayer.local,
            leaderboardIDs: [leaderboardId]
        ) { error in
            call.resolve(["reported": error == nil])
        }
    }

    @objc func reportAchievement(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated,
              let achievementId = call.getString("achievementId") else {
            call.resolve(["reported": false])
            return
        }
        let percent = call.getDouble("percentComplete") ?? 0
        let achievement = GKAchievement(identifier: achievementId)
        achievement.percentComplete = percent
        achievement.showsCompletionBanner = true
        GKAchievement.report([achievement]) { error in
            call.resolve(["reported": error == nil])
        }
    }

    @objc func showDashboard(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else {
            call.resolve(["shown": false])
            return
        }
        let gc = GKGameCenterViewController(state: .dashboard)
        gc.gameCenterDelegate = self
        DispatchQueue.main.async {
            self.bridge?.viewController?.present(gc, animated: true)
        }
        call.resolve(["shown": true])
    }
}

extension GameCenterPlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
