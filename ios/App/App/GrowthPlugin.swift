import Capacitor
import StoreKit
import UIKit

/// Apple's own share sheet and rating prompt, for the two moments a player
/// might tell someone about the game: finishing a monument, and the end of a
/// daily challenge. Hand-rolled like GameCenterPlugin.swift (no package, no
/// third-party SDK; docs/COMPLIANCE.md §4) and registered by hand in
/// BridgeViewController.swift.
///
/// Nothing here collects or sends anything. The share sheet hands the text
/// to whichever app the player picks; the rating prompt is StoreKit's, which
/// decides itself whether to show (Apple caps it at three times a year).
@objc(GrowthPlugin)
public class GrowthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "GrowthPlugin"
    public let jsName = "Growth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
    ]

    @objc func share(_ call: CAPPluginCall) {
        var items: [Any] = []
        if let text = call.getString("text") { items.append(text) }
        if let link = call.getString("url"), let url = URL(string: link) { items.append(url) }
        guard !items.isEmpty else {
            call.resolve(["shared": false])
            return
        }
        DispatchQueue.main.async {
            guard let presenter = self.bridge?.viewController else {
                call.resolve(["shared": false])
                return
            }
            let sheet = UIActivityViewController(activityItems: items, applicationActivities: nil)
            // On iPad the sheet is a popover and must be anchored, or UIKit
            // raises an exception. Anchor it to the middle of the screen.
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = presenter.view
                pop.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 0, height: 0)
                pop.permittedArrowDirections = []
            }
            sheet.completionWithItemsHandler = { _, completed, _, _ in
                call.resolve(["shared": completed])
            }
            presenter.present(sheet, animated: true)
        }
    }

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let scene = self.bridge?.viewController?.view.window?.windowScene {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve()
        }
    }
}
