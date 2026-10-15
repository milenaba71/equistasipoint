# Equistasi Point – materiali per App Store e Google Play

## Dati dell'app
- **Nome**: Equistasi Point
- **Sottotitolo (App Store, max 30)**: Come applicare Equistasi
- **Identificativo**: `com.equistasi.point`
- **Categoria**: Salute e fitness (secondaria: Medicina)
- **Lingua principale**: Italiano
- **Età**: 4+ (App Store) · PEGI 3 / Tutti (Google Play)
- **Prezzo**: gratuita, senza acquisti in-app, senza pubblicità

## Descrizione breve (Google Play, max 80)
La guida ufficiale per applicare il dispositivo Equistasi nel punto giusto.

## Descrizione completa
Equistasi Point è l'app ufficiale per chi utilizza il dispositivo Equistasi.

Tocca sul corpo la zona in cui senti dolore: l'app ti mostra su tavole anatomiche 3D il trigger point dove applicare il dispositivo (la X) e le zone in cui il dolore si irradia (in blu).

COSA TROVI NELL'APP
• Mappa dei trigger point su tavole anatomiche 3D, davanti e dietro, lato destro e sinistro
• Istruzioni passo passo per Equistasi silicone e Equistasi gel
• Promemoria delle 2 ore: ti avvisa quando togliere il dispositivo
• Promemoria giornalieri per ricordarti di applicarlo, dal lunedì al venerdì
• Protocolli dedicati al tuo profilo: dolore, sport, patologie neurologiche
• Video tutorial
• Sezione Sport con test per misurare i tuoi progressi (equilibrio, salto, sprint)

COME SI USA
Per accedere serve il numero di serie stampato sul retro del dispositivo Equistasi.

AVVERTENZE
Le informazioni hanno carattere generale e non sostituiscono il parere del medico, del fisioterapista o del farmacista. I test della sezione Sport sono indicativi, vanno eseguiti accompagnati da un'altra persona e non sostituiscono visite mediche o valutazioni specialistiche. Leggi sempre il foglietto illustrativo del dispositivo.

## Parole chiave (App Store, max 100 caratteri)
equistasi,trigger point,dolore,applicazione,dispositivo,cervicale,schiena,sport,equilibrio,parkinson

## Note per la revisione (App Review / Google)
L'app richiede il numero di serie del dispositivo. **Fornire un numero di serie di prova valido** in Airtable
(es. creare un dispositivo "DEMO" in *Abbinamento Kit*) e indicarlo qui:

> Numero di serie di prova: __________ (inserirlo nella schermata iniziale "Attiva l'app").
> Scegliere un profilo, spuntare "Accetto ed entro". Il promemoria delle 2 ore si trova nella barra in basso.

## Privacy – cosa dichiarare
| Dato | Raccolto? | Note |
|---|---|---|
| Numero di serie del dispositivo | Sì | Inviato per verificare il dispositivo (Make → Airtable) |
| Profilo d'uso, patologia, fascia d'età | Solo con consenso facoltativo | Dati relativi alla salute, collegati al numero di serie; nessun nome, email o telefono |
| Risultati dei test, promemoria | No | Restano solo sul telefono |
| Posizione, contatti, foto | No | |
| Tracciamento / pubblicità | No | |

- **Link privacy policy**: obbligatorio per entrambi gli store → da inserire anche in `js/config.js` (`privacyUrl`).
- **Sensori di movimento**: usati solo durante i test della sezione Sport, nessun dato inviato.
- **Notifiche**: solo locali (promemoria), nessuna notifica push dal server.

## Screenshot richiesti
- iPhone 6,9" (1320×2868) o 6,7" (1290×2796): 3–10 immagini
- Telefono Android: almeno 2 immagini (es. 1080×1920)
- Icona Google Play 512×512 e immagine in evidenza 1024×500

Schermate consigliate: mappa del corpo · scheda di un muscolo con la X · come applicare (gel/silicone) ·
promemoria delle 2 ore · protocolli neurologici · test sport.

## Pubblicazione
- **Android**: l'app si compila da sola su GitHub (Actions → "App Android"): scarica l'APK di prova per testarla.
  Per Google Play servono una chiave di firma e 4 *secrets* nel repository:
  `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
  Con questi, ogni build produce anche l'AAB firmato da caricare su Google Play Console.
- **iOS**: serve un account Apple Developer e un Mac con Xcode (o un servizio di build in cloud). Vedi `README.md`.
