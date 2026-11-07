import Capacitor
import GameKit

/// Thin wrapper around GameKit. Deliberately not a published Capacitor
/// plugin package — see the comment above registerPlugin('GameCenter') in
/// src/core/native.js for why: no podspec, no Capacitor-version coupling,
/// nothing to keep in sync with a package this project doesn't control.
/// Registered by hand in BridgeViewController.swift — Capacitor 7 only
/// auto-registers plugins shipped as real npm packages.
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
        CAPPluginMethod(name: "loadPlayerCount", returnType: CAPPluginReturnPromise),
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

extension GameCenterPlugin {
    /// Tester build only: the usage readout in Settings (src/main.js). How
    /// many players have a score on a board: GameKit's totalPlayerCount, for
    /// this occurrence of a recurring board and the one before it. Only the
    /// count is read, never any player's entry. -1 for anything unavailable.
    @objc func loadPlayerCount(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated,
              let leaderboardId = call.getString("leaderboardId") else {
            call.resolve(["count": -1, "previous": -1])
            return
        }
        let one = NSRange(location: 1, length: 1)
        GKLeaderboard.loadLeaderboards(IDs: [leaderboardId]) { boards, error in
            guard error == nil, let board = boards?.first else {
                call.resolve(["count": -1, "previous": -1])
                return
            }
            board.loadEntries(for: .global, timeScope: .allTime, range: one) { _, _, total, err in
                let count = err == nil ? total : -1
                board.loadPreviousOccurrence { prev, perr in
                    guard perr == nil, let prev = prev else {
                        call.resolve(["count": count, "previous": -1])
                        return
                    }
                    prev.loadEntries(for: .global, timeScope: .allTime, range: one) { _, _, ptotal, pe in
                        call.resolve(["count": count, "previous": pe == nil ? ptotal : -1])
                    }
                }
            }
        }
    }
}

extension GameCenterPlugin: GKGameCenterControllerDelegate {
    public func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
