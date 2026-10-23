import Foundation

/// Testi dell'app per l'orologio: italiano se il telefono è in italiano, altrimenti inglese.
enum L {
    static let it = (Locale.preferredLanguages.first ?? "it").hasPrefix("it")

    static func t(_ key: String) -> String {
        let pair = texts[key] ?? (key, key)
        return it ? pair.0 : pair.1
    }

    private static let texts: [String: (String, String)] = [
        "title": ("Equistasi", "Equistasi"),
        "connected": ("Telefono collegato", "Phone connected"),
        "notArmed": ("Sul telefono apri Progressi e tocca «Collega l’orologio»", "On your phone open Progress and tap “Connect the watch”"),
        "openPhone": ("Apri Equistasi Point sul telefono e tienilo sbloccato", "Open Equistasi Point on your phone and keep it unlocked"),
        "cond": ("Condizione", "Condition"),
        "without": ("Senza Equistasi", "Without Equistasi"),
        "with": ("Con Equistasi", "With Equistasi"),
        "stability": ("Stabilità in piedi", "Standing stability"),
        "stabilitySub": ("Telefono in cintura · 30 s", "Phone in belt · 30 s"),
        "balance": ("Equilibrio su una gamba", "Single-leg balance"),
        "standing": ("Equilibrio in piedi", "Standing balance"),
        "jump": ("Salto verticale", "Vertical jump"),
        "phoneChest": ("Telefono al petto", "Phone on the chest"),
        "sprint": ("Sprint", "Sprint"),
        "sprintSub": ("Cronometro sull’orologio", "Timer on the watch"),
        "eyes": ("Occhi", "Eyes"),
        "eyesOpen": ("Aperti", "Open"),
        "eyesClosed": ("Chiusi", "Closed"),
        "leg": ("Gamba", "Leg"),
        "right": ("Destra", "Right"),
        "left": ("Sinistra", "Left"),
        "distance": ("Distanza", "Distance"),
        "start": ("Avvia", "Start"),
        "stop": ("Stop", "Stop"),
        "moved": ("Ha spostato un piede", "Moved a foot"),
        "again": ("Rifai", "Again"),
        "save": ("Salva sul telefono", "Save on phone"),
        "saved": ("Salvato sul telefono", "Saved on phone"),
        "ready": ("Pronto", "Ready"),
        "go": ("Via!", "Go!"),
        "safety": ("Fai i test con una persona accanto", "Do the tests with someone next to you"),
        "waiting": ("Avvio sul telefono…", "Starting on the phone…"),
        "speed": ("km/h di media", "km/h average"),
        "close": ("Chiudi", "Close"),
        "pro": ("Professionista", "Professional"),
        "tug": ("Timed Up and Go", "Timed Up and Go"),
        "walk10": ("Cammino 10 m", "10 m walk"),
        "phoneOnPerson": ("Telefono addosso alla persona", "Phone on the person"),
    ]
}
