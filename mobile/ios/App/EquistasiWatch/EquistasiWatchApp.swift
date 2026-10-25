import SwiftUI
import WatchKit

/// App Equistasi Point per Apple Watch: telecomando dei test che si fanno con il telefono
/// (in cintura o al petto) e cronometro dello sprint sul polso.
@main
struct EquistasiWatchApp: App {
    @StateObject private var session = WatchSession.shared
    var body: some Scene {
        WindowGroup {
            NavigationStack { HomeView() }.environmentObject(session)
        }
    }
}

private let yellow = Color(red: 250 / 255, green: 220 / 255, blue: 0)

struct HomeView: View {
    @EnvironmentObject var session: WatchSession
    @AppStorage("cond") private var cond = "senza"

    var body: some View {
        List {
            Section {
                HStack(spacing: 6) {
                    Circle().fill(session.reachable && session.armed ? Color.green : Color.orange).frame(width: 8, height: 8)
                    Text(session.reachable ? (session.armed ? L.t("connected") : L.t("notArmed")) : L.t("openPhone"))
                        .font(.footnote)
                }
                Picker(L.t("cond"), selection: $cond) {
                    Text(L.t("without")).tag("senza")
                    Text(L.t("with")).tag("con")
                }
            }
            Section {
                NavigationLink { RemoteSetupView(test: "stabilita", title: L.t("stability"), cond: cond) } label: { row(L.t("stability"), L.t("stabilitySub"), "figure.stand") }
                NavigationLink { RemoteSetupView(test: "equilibrio", title: L.t("balance"), cond: cond) } label: { row(L.t("balance"), L.t("phoneChest"), "figure.walk") }
                NavigationLink { RemoteSetupView(test: "ortostasi", title: L.t("standing"), cond: cond) } label: { row(L.t("standing"), L.t("phoneChest"), "figure.stand.line.dotted.figure.stand") }
                NavigationLink { RemoteSetupView(test: "salto", title: L.t("jump"), cond: cond) } label: { row(L.t("jump"), L.t("phoneChest"), "figure.jumprope") }
                NavigationLink { SprintView(cond: cond) } label: { row(L.t("sprint"), L.t("sprintSub"), "figure.run") }
            }
            // test del professionista (il telefono risponde solo con un dispositivo a noleggio professionale)
            Section(L.t("pro")) {
                NavigationLink { RemoteSetupView(test: "tug", title: L.t("tug"), cond: cond) } label: { row(L.t("tug"), L.t("phoneOnPerson"), "chair") }
                NavigationLink { RemoteSetupView(test: "cammino", title: L.t("walk10"), cond: cond) } label: { row(L.t("walk10"), L.t("phoneOnPerson"), "figure.walk") }
            }
            Section { Text(L.t("safety")).font(.footnote).foregroundStyle(.secondary) }
        }
        .navigationTitle(L.t("title"))
        .onAppear { session.hello() }
    }

    private func row(_ title: String, _ sub: String, _ icon: String) -> some View {
        HStack {
            Image(systemName: icon).foregroundStyle(yellow).frame(width: 24)
            VStack(alignment: .leading) {
                Text(title).font(.headline).lineLimit(2)
                Text(sub).font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

/// Opzioni del test e pulsante Avvia: il test parte sul telefono.
struct RemoteSetupView: View {
    @EnvironmentObject var session: WatchSession
    let test: String
    let title: String
    let cond: String
    @AppStorage("eyes") private var eyes = "aperti"
    @AppStorage("leg") private var leg = "dx"
    @State private var running = false

    var body: some View {
        if running {
            RemoteRunView(test: test, title: title, running: $running)
        } else {
            List {
                if !["salto", "tug", "cammino"].contains(test) {
                    Picker(L.t("eyes"), selection: $eyes) {
                        Text(L.t("eyesOpen")).tag("aperti")
                        Text(L.t("eyesClosed")).tag("chiusi")
                    }
                }
                if test == "equilibrio" {
                    Picker(L.t("leg"), selection: $leg) {
                        Text(L.t("right")).tag("dx")
                        Text(L.t("left")).tag("sx")
                    }
                }
                Text(cond == "con" ? L.t("with") : L.t("without")).font(.footnote).foregroundStyle(.secondary)
                Button {
                    session.result = ""; session.phase = "starting"; session.big = ""; session.sub = L.t("waiting")
                    session.send(["cmd": "start", "test": test, "cond": cond, "eyes": eyes, "leg": leg])
                    WKInterfaceDevice.current().play(.click)
                    running = true
                } label: {
                    Label(L.t("start"), systemImage: "play.fill").frame(maxWidth: .infinity)
                }
                .tint(yellow).foregroundStyle(.black)
                if !session.lastError.isEmpty { Text(session.lastError).font(.footnote).foregroundStyle(.orange) }
            }
            .navigationTitle(title)
        }
    }
}

/// Stato del test mandato dal telefono, con Stop / «Ha spostato un piede».
struct RemoteRunView: View {
    @EnvironmentObject var session: WatchSession
    let test: String
    let title: String
    @Binding var running: Bool

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                Text(title).font(.footnote).foregroundStyle(.secondary)
                if session.phase == "done" {
                    Image(systemName: "checkmark.circle.fill").font(.title).foregroundStyle(.green)
                    Text(session.result).font(.headline).multilineTextAlignment(.center)
                    Button(L.t("close")) { running = false }
                } else {
                    Text(session.big.isEmpty ? "…" : session.big)
                        .font(.system(size: 44, weight: .bold, design: .rounded)).minimumScaleFactor(0.5)
                    Text(session.sub).font(.footnote).multilineTextAlignment(.center)
                    if !session.lastError.isEmpty { Text(session.lastError).font(.footnote).foregroundStyle(.orange) }
                    Button(role: .destructive) {
                        session.send(["cmd": "stop"])
                        WKInterfaceDevice.current().play(.stop)
                    } label: {
                        Text(test == "stabilita" || test == "ortostasi" || test == "equilibrio" ? L.t("moved") : L.t("stop")).frame(maxWidth: .infinity)
                    }
                    Button(L.t("close")) { running = false }.font(.footnote)
                }
            }
        }
        .navigationTitle(title)
        .onChange(of: session.phase) { _, p in
            if p == "done" { WKInterfaceDevice.current().play(.success) }
            if p == "go" { WKInterfaceDevice.current().play(.start) }
        }
    }
}

/// Sprint cronometrato sull'orologio: conto alla rovescia con vibrazione, Stop all'arrivo, risultato al telefono.
struct SprintView: View {
    @EnvironmentObject var session: WatchSession
    let cond: String
    @AppStorage("dist") private var dist = 20
    @State private var phase = "ready" // ready, count, run, done
    @State private var count = 3
    @State private var t0 = Date()
    @State private var elapsed: Double = 0
    @State private var saved = false

    var body: some View {
        VStack(spacing: 6) {
            switch phase {
            case "ready":
                Picker(L.t("distance"), selection: $dist) {
                    Text("10 m").tag(10); Text("20 m").tag(20); Text("30 m").tag(30)
                }.frame(height: 50)
                Button { startCountdown() } label: { Label(L.t("start"), systemImage: "play.fill").frame(maxWidth: .infinity) }
                    .tint(yellow).foregroundStyle(.black)
            case "count":
                Text(count > 0 ? "\(count)" : L.t("go")).font(.system(size: 60, weight: .bold, design: .rounded))
            case "run":
                TimelineView(.periodic(from: t0, by: 0.05)) { ctx in
                    Text(String(format: "%.2f s", ctx.date.timeIntervalSince(t0))).font(.system(size: 34, weight: .bold, design: .rounded)).monospacedDigit()
                }
                Button(role: .destructive) { stop() } label: { Text(L.t("stop")).font(.title2).frame(maxWidth: .infinity, minHeight: 60) }
            default:
                Text(String(format: "%.2f s", elapsed)).font(.system(size: 34, weight: .bold, design: .rounded))
                Text(String(format: "%.1f ", Double(dist) / elapsed * 3.6) + L.t("speed")).font(.footnote)
                if saved { Text(L.t("saved")).font(.footnote).foregroundStyle(.green) }
                else {
                    Button(L.t("save")) {
                        session.send(["cmd": "sprint", "time": elapsed, "dist": dist, "cond": cond])
                        saved = session.lastError.isEmpty
                        WKInterfaceDevice.current().play(.success)
                    }.tint(yellow).foregroundStyle(.black)
                }
                if !session.lastError.isEmpty { Text(session.lastError).font(.caption2).foregroundStyle(.orange) }
                Button(L.t("again")) { phase = "ready"; saved = false }.font(.footnote)
            }
        }
        .navigationTitle(L.t("sprint"))
    }

    private func startCountdown() {
        phase = "count"; count = 3
        WKInterfaceDevice.current().play(.click)
        Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { timer in
            count -= 1
            if count > 0 { WKInterfaceDevice.current().play(.click) }
            else {
                timer.invalidate()
                WKInterfaceDevice.current().play(.start)
                t0 = Date(); phase = "run"
            }
        }
    }

    private func stop() {
        elapsed = Date().timeIntervalSince(t0)
        WKInterfaceDevice.current().play(.stop)
        phase = "done"
    }
}
