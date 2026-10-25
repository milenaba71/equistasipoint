import Foundation
import WatchConnectivity

/// Collegamento con l'app Equistasi Point sull'iPhone.
/// L'orologio manda i comandi (avvia, stop, risultato dello sprint); il telefono risponde con lo stato del test.
final class WatchSession: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSession()

    /// true quando l'app sul telefono è aperta e raggiungibile
    @Published var reachable = false
    /// true quando sul telefono è stato toccato «Collega l'orologio» (permesso ai sensori dato)
    @Published var armed = false
    /// stato del test mandato dal telefono: fase, testo grande, testo piccolo, risultato
    @Published var phase = "idle"
    @Published var big = ""
    @Published var sub = ""
    @Published var result = ""
    @Published var lastError = ""

    private override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    func send(_ message: [String: Any]) {
        let s = WCSession.default
        guard s.activationState == .activated, s.isReachable else {
            DispatchQueue.main.async { self.lastError = L.t("openPhone") }
            return
        }
        lastError = ""
        s.sendMessage(message, replyHandler: { reply in
            DispatchQueue.main.async { self.apply(reply) }
        }, errorHandler: { _ in
            DispatchQueue.main.async { self.lastError = L.t("openPhone") }
        })
    }

    /// Chiede al telefono lo stato attuale (all'apertura dell'app sull'orologio)
    func hello() { send(["cmd": "hello"]) }

    private func apply(_ m: [String: Any]) {
        if let v = m["armed"] as? Bool { armed = v }
        if let v = m["phase"] as? String { phase = v }
        if let v = m["big"] as? String { big = v }
        if let v = m["sub"] as? String { sub = v }
        if let v = m["result"] as? String { result = v }
        if let v = m["error"] as? String { lastError = v }
    }

    // MARK: WCSessionDelegate
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.reachable = session.isReachable
            if session.isReachable { self.hello() }
        }
    }
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.reachable = session.isReachable
            if session.isReachable { self.hello() }
        }
    }
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        DispatchQueue.main.async { self.apply(message) }
    }
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        DispatchQueue.main.async { self.apply(message) }
        replyHandler([:])
    }
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        DispatchQueue.main.async { self.apply(applicationContext) }
    }
}
