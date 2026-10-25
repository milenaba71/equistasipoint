import Foundation
import Capacitor
import WatchConnectivity

/// Collegamento con l'app per Apple Watch.
/// - L'orologio manda i comandi (avvia test, stop, risultato dello sprint): arrivano alla web app come evento "command".
/// - La web app manda lo stato del test con send(): va all'orologio e resta come risposta ai comandi successivi.
/// - keepAwake tiene acceso lo schermo mentre l'orologio è collegato (con lo schermo spento il test non può partire).
@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "send", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keepAwake", returnType: CAPPluginReturnPromise)
    ]
    private var lastState: [String: Any] = [:]

    override public func load() {
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        guard WCSession.isSupported() else { call.resolve(["supported": false]); return }
        let s = WCSession.default
        call.resolve(["supported": true, "paired": s.isPaired, "installed": s.isWatchAppInstalled, "reachable": s.isReachable])
    }

    @objc func send(_ call: CAPPluginCall) {
        var data: [String: Any] = [:]
        for (k, v) in call.options {
            guard let key = k as? String else { continue }
            if v is String || v is NSNumber { data[key] = v }
        }
        for (k, v) in data { lastState[k] = v }
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else { call.resolve(); return }
        let s = WCSession.default
        if s.isReachable {
            s.sendMessage(data, replyHandler: nil, errorHandler: nil)
        } else if s.isPaired && s.isWatchAppInstalled {
            try? s.updateApplicationContext(lastState)
        }
        call.resolve()
    }

    @objc func keepAwake(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = on }
        call.resolve()
    }

    // MARK: WCSessionDelegate
    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}
    public func sessionDidBecomeInactive(_ session: WCSession) {}
    public func sessionDidDeactivate(_ session: WCSession) { WCSession.default.activate() }
    public func sessionReachabilityDidChange(_ session: WCSession) {
        notifyListeners("reachability", data: ["reachable": session.isReachable])
    }
    public func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        notifyListeners("command", data: message)
    }
    public func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        notifyListeners("command", data: message)
        replyHandler(lastState)
    }
}
