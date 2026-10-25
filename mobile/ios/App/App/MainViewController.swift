import UIKit
import Capacitor

/// Vista principale dell'app: registra i componenti nativi scritti per Equistasi Point.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WatchBridgePlugin())
    }
}
