# Equistasi Point – app per App Store e Google Play

Questa cartella contiene il progetto **Capacitor** che trasforma la web app
(i file nella cartella principale del repository) in un'app per **iPhone** e **Android**.
La web app su GitHub Pages resta com'è: le due versioni usano gli stessi file.

- Nome app: **Equistasi Point**
- Identificativo iOS (bundle ID, app esistente): `com.equistasi.triggerpoint` · versione 1.2.0 (build 21)
- Identificativo Android (application ID): `com.equistasi.point` (da allineare a quello dell’app già su Google Play)
- Funzione nativa: **promemoria delle 2 ore** con notifiche locali
  (`@capacitor/local-notifications`), che arrivano anche ad app chiusa.

## Aggiornare l'app dopo una modifica alla web app

```bash
cd mobile
npm install          # solo la prima volta
npm run sync         # copia la web app in www/ e aggiorna i progetti iOS e Android
```

## Android (Google Play)

1. Installa **Android Studio**.
2. `npm run android` apre il progetto: da lì *Build → Generate Signed App Bundle* crea il file `.aab`.
3. Account **Google Play Console** (25 $ una tantum) intestato a Equistasi: crea l'app, carica il `.aab`,
   compila scheda dello store, classificazione dei contenuti, sicurezza dei dati e il link alla privacy policy.

## iOS (App Store)

1. Serve un **Mac con Xcode** (oppure un servizio di build in cloud, per esempio Ionic Appflow o Codemagic).
2. `npm run ios` apre il progetto in Xcode; in *Signing & Capabilities* scegli il team dell'account
   **Apple Developer** di Equistasi (99 $/anno).
3. *Product → Archive* e invio ad **App Store Connect**; poi TestFlight per i test e invio in revisione.

## Prima di inviare agli store

- Link alla **privacy policy** completa (da inserire anche in `js/config.js` → `privacyUrl`).
- Logo in alta risoluzione per l'icona: ora `assets/` usa l'icona da 512 px ingrandita.
  Per rigenerare icone e splash: sostituisci i file in `assets/` e lancia
  `npx @capacitor/assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff'`.
- Screenshot per le schede degli store (iPhone 6,7" e 6,5", telefono Android).
- Verifica regolatoria (MDR) che l'app resti materiale informativo/istruzioni d'uso del dispositivo.
