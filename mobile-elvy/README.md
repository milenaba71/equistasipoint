# Elvy – app per App Store e Google Play

Questa cartella contiene il progetto **Capacitor** che trasforma la web app Elvy
(cartella `elvy/` del repository, online su app.equistasi.com/elvy/) in un'app per **iPhone** e **Android**.
Il codice è uno solo: si modifica `elvy/` e poi si aggiornano le app con `npm run sync`.

- Nome app: **Elvy**
- Identificativo iOS (bundle ID) e Android (application ID): `com.equistasi.elvy` · versione 1.0.0 (build 1)
- Icona e schermata d'avvio: la mascotte Elvy (`assets/`), sfondo `#26282f`

## Cosa fa in più l'app rispetto al sito

- **Bluetooth nativo** (`@capacitor-community/bluetooth-le`): fasce cardio e orologi con la
  trasmissione del battito si collegano anche su **iPhone**, dove Safari non ha il Bluetooth.
- **Report PDF**: foglio di condivisione del telefono (WhatsApp, Mail, «Salva su File»…).
- Link esterni nel browser interno, tasto indietro di Android, barra di stato scura.
- Il codice nativo è in `elvy/js/native.js`: nella web app non fa nulla.

## Aggiornare l'app dopo una modifica a `elvy/`

```bash
cd mobile-elvy
npm install          # solo la prima volta
npm run sync         # copia elvy/ (più config, lettura seriale e librerie di js/) in www/ e aggiorna iOS e Android
```

## Android (Google Play)

1. Installa **Android Studio**.
2. `npm run android` apre il progetto: *Build → Generate Signed App Bundle* crea il file `.aab`
   (usa una chiave di firma nuova per Elvy e conservala: serve per tutti gli aggiornamenti).
3. In **Google Play Console** (lo stesso account di Equistasi Point) crea una nuova app «Elvy»,
   carica il `.aab` e compila la scheda (vedi `STORE.md`).

## iOS (App Store)

1. Serve un **Mac con Xcode** (oppure un servizio di build in cloud, per esempio Codemagic).
2. `npm run ios` (la prima volta esegue anche `pod install`) apre il progetto in Xcode;
   in *Signing & Capabilities* scegli il team **Apple Developer** di Equistasi.
3. In **App Store Connect** crea una nuova app con bundle ID `com.equistasi.elvy`.
4. *Product → Archive* e invio; prova con TestFlight, poi invio in revisione.

## Permessi richiesti (già configurati)

| Permesso | Perché |
|---|---|
| Fotocamera | lettura del numero di serie, battito con il dito, video al rallentatore |
| Movimento | accelerometro e giroscopio per i test |
| Posizione (durante l'uso) | GPS per corsa e test di Cooper |
| Bluetooth | fascia cardio o orologio |
| Foto | aprire un video dalla libreria per l'analisi |

## Prossimi passi possibili

- **Apple Salute / Apple Watch** (HealthKit) e **Health Connect** su Android per battito, HRV e GPS dell'orologio.
