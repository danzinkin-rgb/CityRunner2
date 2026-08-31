import Capacitor

/// Capacitor 7 only auto-registers plugins that ship as real npm packages
/// (it reads their class names out of a generated capacitor.config.json at
/// launch). GameCenterPlugin deliberately has no package — see the comment
/// in GameCenterPlugin.swift — so it must be registered by hand here, which
/// is Capacitor's own documented pattern for a local, package-less plugin.
class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(GameCenterPlugin())
    }
}
