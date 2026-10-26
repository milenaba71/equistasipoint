# Elvy · by Equistasi

Web app (PWA) per lo sport: i test che uno sportivo vuole fare, misurati con l'**accelerometro del telefono**, da confrontare **con e senza Elvy** (il dispositivo Equistasi per lo sport). Grafica e testi seguono la presentazione di progetto in [`tools/elvy`](../tools/elvy/presentazione.html).

Online: `https://app.equistasi.com/elvy/` (stesso sito di Equistasi Point).

**Esercizio corretto o scorretto** (Test → Video → «Esercizio corretto?», `#/esercizio`, `js/exercise.js`): si filma o si carica uno squat, un affondo, dei piegamenti o un plank; il riconoscimento del corpo (MediaPipe, sul telefono) conta le ripetizioni e per ognuna controlla la tecnica (profondità, busto, talloni, ginocchia verso l'interno di fronte, linea del corpo e bacino). Risultato «Corretto» o «Da correggere», errori più frequenti, fotogramma di ogni ripetizione con le articolazioni da correggere in rosso e disegni dell'esercizio corretto e scorretto. Soglie indicative, per l'allenamento.

**Mappa trigger point per il dolore** (Guida e Test → `#/dolore`), come in Equistasi Point: tocca dove senti dolore, scegli il muscolo e vedi la X dove applicare Elvy con le zone di dolore riferito. Usa gli stessi dati (`../js/data.js`) e le stesse tavole anatomiche (`../img/anatomy`) di Equistasi Point; codice in `js/pain.js`.

App per **App Store e Google Play**: cartella `mobile-elvy/` (Capacitor), costruita da questi stessi file; le funzioni native (Bluetooth anche su iPhone, condivisione del PDF) sono in `js/native.js`. Vedi `mobile-elvy/README.md`.

## Marchi

Il logo **elvy** (e verde, lvy argento, come sulla scatola) è in `img/logo-elvy.png` e compare in testa alla schermata di attivazione, al benvenuto e alle schermate Oggi, Test, Progressi e Profilo. In fondo a ogni schermata c'è «un prodotto» con il piccolo logo **Equistasi** (`img/logo-equistasi.png`), che porta a equistasi.com.

## Accesso con il numero di serie

Alla prima apertura c'è la schermata **Attiva Elvy** con il **retro** del dispositivo disegnato (codice a barre, seriale e CE). Quando il dispositivo è abbinato il disegno **gira in 3D** e mostra il fronte con il logo Elvy, con un riflesso che lo attraversa, e sotto compare il numero di serie. Nel Profilo si vede il fronte: toccandolo gira e mostra il retro.

- Toccando il codice a barre disegnato si apre la fotocamera **dentro il disegno** (`../js/scan.js`, lo stesso lettore di Equistasi Point): legge il codice a barre e, se è rovinato, i **caratteri stampati, lettere e numeri** (es. `EQX25001801`), oltre ai seriali di sole cifre (`20…`, 11 cifre). Un seriale letto vale solo quando esce uguale due volte; gli scambi tipici (O/0, I/1, S/5, B/8) vengono corretti e la sigla `EQX` viene riconosciuta anche con una lettera letta male.
- L'abbinamento si apre **a tutto schermo, in stile Apple Watch** (`../js/pair.js` con i colori Elvy, `css/pair.css`): cerchio con la fotocamera, nuvola di particelle verde acqua e viola, anello che si chiude, seriale che si accende carattere per carattere, lampo, ✓ e suono di conferma. Con «riduci movimento» attivo sul telefono la lettura resta dentro il disegno.
- Il **seriale a mano** non si vede all'inizio: compare solo se la fotocamera non riesce a leggere il codice, cioè fotocamera negata o non disponibile, nessuna lettura entro 25 secondi, oppure codice letto ma non riconosciuto (in quel caso il campo è già compilato da correggere). C'è anche «Riprova con la fotocamera».
- La verifica usa lo stesso webhook Make di Equistasi Point (`../js/config.js` → `verifyUrl`), che cerca il seriale nella tabella Airtable **EQUITUTTO → Abbinamento Kit** (campo *Abbinamento seriali (testo)*). L'app riceve solo `{"valid": true/false}`: nessuna chiave Airtable nel codice.
- Dopo l'abbinamento la mascotte saluta con il nome registrato: il webhook Make **«Elvy – Nome del titolare»** (`nameUrl`) cerca il kit del seriale in *Abbinamento Kit* e il titolare in *Rubrica* (*Codici prodotti venduti* o *kit a noleggio* non reso), solo per persone (Paziente, Sportivo, Medico, fisioterapista, professionista sanitario, preparatore atletico; no aziende o eventi), e risponde `{"nome": "…"}`. Il nome compila anche il campo «Nome» del benvenuto. Se non c'è o la rete è lenta (5 s), il saluto è senza nome.
- Il seriale abbinato resta sul telefono (`elvy-serial`); dal Profilo si vede il dispositivo e lo si può scollegare.

Codice: `js/gate.js`.

## Confronto senza / con Elvy

Ogni test si fa come **confronto in 3 passi** («Inizia il confronto»):
1. **Senza Elvy**: misura di base (se i dispositivi sono applicati, l'app chiede di toglierli).
2. **Applica Elvy** secondo il protocollo Sport di Equistasi: un dispositivo sulla settima vertebra cervicale (C7) e uno su ogni polpaccio (soleo, sopra il tendine d'Achille). La figura mostra i punti.
3. **Con Elvy**: stesso test, stesse opzioni.

Poi la schermata di confronto mostra senza / con Elvy, la differenza in % (verde se migliore, secondo il verso della misura), le misure di dettaglio e il commento di Elvy. Il confronto a metà si può riprendere più tardi da Oggi. Ogni test si può anche ripetere da solo, quante volte si vuole, con i pulsanti «Test senza Elvy» e «Test con Elvy»: se la scelta è diversa da come risulta Elvy in quel momento, la mascotte chiede di toglierlo o applicarlo. Se Elvy è applicato, la mascotte propone il test con Elvy e non chiede di toglierlo; il confronto guidato (che parte senza Elvy) compare quando Elvy non è addosso.

In **Progressi** ci sono il numero di confronti, quante volte è andata meglio con Elvy, l'effetto medio di Elvy per test e un grafico a coppie (grigio senza, verde con Elvy) per ogni confronto, oltre all'andamento nel tempo.

## Elvy parla

La mascotte parla con la voce del telefono e il testo compare a poco a poco nel fumetto mentre lo dice (onde animate e mascotte che si muove). Parla al benvenuto, in Oggi (una volta al giorno), quando spiega un test, nei passi del confronto, sui risultati e nei Progressi; toccandola ripete. La voce si spegne dal Profilo («Guida vocale»).

## I test

| Gruppo | Test | Dove sta il telefono | Cosa misura |
|---|---|---|---|
| Equilibrio | Una gamba (dx e sx, occhi aperti/chiusi) | cintura | area di oscillazione (cm², ellisse al 95%), tenuta, simmetria tra le gambe |
| Equilibrio | In piedi (piedi uniti o in tandem) | cintura | area a occhi aperti e chiusi, rapporto di Romberg |
| Salti | Salto verticale (CMJ) | cintura | altezza dal tempo di volo, potenza di picco (Sayers, serve il peso) |
| Salti | Drop jump (gradino 20/30/40 cm) | cintura | tempo di contatto, volo, altezza, RSI |
| Salti | Hop test su una gamba | cintura | altezza per gamba, indice di simmetria |
| Salti | Salti ripetuti 15/30 s (Bosco) | cintura | potenza W/kg, contatto, RSI medio, calo per fatica |
| Corsa e core | Analisi della corsa (1/3/5 min) | cintura | cadenza, tempo di contatto, oscillazione verticale, regolarità, simmetria e contatto dx/sx |
| Corsa e core | Plank | cintura | tenuta (si ferma da solo quando il bacino cede di oltre 12°), tremore |
| Reazione e mobilità | Tempo di reazione | in mano | risposta con il tocco o con il movimento (accelerometro), anticipi |
| Reazione e mobilità | Mobilità | sul segmento | caviglia (affondo al muro), anca (gamba tesa), spalla (flessione), tronco |

**Oggi** mostra la *forma di oggi* (salto verticale confrontato con la tua media), il test consigliato e gli ultimi risultati. **Progressi** mostra l'andamento di ogni test, con le medie senza e con Elvy. Il pulsante **Elvy applicato** segna i test «con Elvy» e ricorda dove e da quanto è applicato. Una **voce** guida i test (il telefono è in cintura e non si vede lo schermo), lo schermo resta acceso.

Sul computer (niente sensore) ogni test si può provare con **dati simulati**: il risultato viene segnato come prova.

## Un dispositivo, un telefono

Come Equistasi Point, un seriale funziona su **un solo telefono o computer alla volta**. Si usa la funzione `pair_device` del progetto Supabase «equistasi-app» (tabelle e funzione in `equistasipoint/supabase/migrations`, dispositivi copiati ogni notte da Airtable):
- al primo avvio l'app crea un codice casuale del telefono (`eq-phone-id`, la stessa chiave di Equistasi Point);
- all'abbinamento: seriale libero → abbinato; già su questo telefono → ok; su un altro → l'app chiede se **spostarlo qui** (massimo **3 spostamenti in 30 giorni**, poi serve Equistasi);
- all'avvio e ogni volta che si torna nell'app (al massimo ogni 5 minuti) controlla il telefono attivo: se il dispositivo è passato altrove, qui si scollega e la schermata di attivazione spiega perché. I risultati restano sul telefono. Senza rete si continua e si ricontrolla dopo.

**Da fare per attivarlo:** in `../js/config.js` scrivere `supabaseKey` = chiave *publishable* del progetto Supabase (Project Settings → API Keys, inizia con `sb_publishable_`; è pensata per stare nelle app). Finché è vuota, la verifica usa il webhook Make (`verifyUrl`) senza legare il dispositivo a un telefono.

## Guida

Nuova scheda **Guida** nella barra in basso:
- **Video tutorial**: dalla tabella Airtable *Videos* (base Equistasi App), letti con il webhook Make di Equistasi Point (`videosUrl`); compaiono quelli con **«Elvy»** nel campo *Profili app* (va aggiunta l'opzione «Elvy» al campo). YouTube, Vimeo, Bunny Stream o file video.
- **Come si applica** con il cerotto trasparente, in tre illustrazioni con il dispositivo Elvy: prima Elvy sulla parte adesiva del cerotto (`img/elvy-sul-cerotto.jpg`), poi cerotto ed Elvy sulla pelle con il dispositivo a contatto della pelle (`elvy-cerotto.jpg`), infine i bordi premuti (`elvy-premi.jpg`).
- **Mappatura Sport** (`img/mappa-sport.png`): C7 e tricipite della sura (polpacci, sul soleo sopra il tendine d'Achille), con i tempi del protocollo Sport (primo giorno 1–2 ore, massimo 4 ore al giorno, 5 giorni a settimana) e quando togliere i dispositivi.
- **Protocolli**: i PDF della tabella *PDF_files* con «Elvy» in *Profili app*; finché non ci sono, «Protocollo Sport Elvy – in preparazione».

## Report in PDF

Da **Progressi → Report da salvare o condividere** (anche dal Profilo e dalla schermata di confronto): periodo 7 giorni, 30 giorni, 3 mesi o tutto; le prove con dati simulati si possono escludere. Il PDF (A4, creato sul telefono con jsPDF, `js/report.js`) contiene:
- testata scura con il logo elvy, la mascotte, nome, sport, periodo e dispositivo;
- riquadri di sintesi: test fatti, confronti, quante volte meglio con Elvy, recupero;
- «Con e senza Elvy»: effetto medio di Elvy per ogni test;
- una scheda per test: media senza e con Elvy, ultima e migliore misura, andamento;
- recupero (HRV) se misurato;
- in ogni piè di pagina: «Elvy, l'app Elvy e il dispositivo Elvy sono prodotti di proprietà di Equistasi S.r.l.» con il piccolo logo Equistasi e l'avviso che i dati sono stime dei sensori del telefono, non diagnostiche.

**Condividi** apre il foglio di condivisione del telefono (WhatsApp, Mail, File…) dove il browser lo permette; altrimenti il PDF viene salvato nei download.

## Voce della mascotte

Il pulsante **Voce Elvy / Voce esclusa** in alto nelle schermate principali (e l'altoparlante in ogni fumetto) esclude la voce della mascotte: Elvy continua a scrivere nel fumetto. La guida vocale dei test (conto alla rovescia, «salta», «via») è un'impostazione separata nel Profilo.

## Sensori, fotocamera, GPS e orologi

| Funzione | Come | Dove funziona |
|---|---|---|
| **Giroscopio** | velocità di rotazione (°/s) registrata insieme all'accelerometro | tutti i telefoni con giroscopio |
| **Swing** (nuovo test) | picchi di rotazione di 5 swing; velocità della punta = rotazione × leva (braccio 0,7 m, racchetta 1 m, mazza 1,6 m) | tutti; oltre ~2000 °/s il sensore satura (segnalato) |
| **Equilibrio** | in più, la velocità angolare del tronco (°/s) | dove c'è il giroscopio |
| **Battito e HRV** (nuovo test, gruppo Recupero) | dito sulla fotocamera posteriore con il flash: luminosità del rosso → battiti → RMSSD, SDNN, battito a riposo; «Recupero di oggi» 0–100 rispetto alla tua media (dalla 4ª misura) | Android (flash acceso dal browser); su iPhone dal browser il flash non si accende: serve una luce forte, o l'app nativa |
| **GPS del telefono** | nella corsa (distanza, passo, velocità massima) e nel nuovo **Test di Cooper** (12 min → VO2max) | ovunque, all'aperto |
| **Fascia cardio / orologio Bluetooth** | servizio standard Heart Rate: battito durante tutti i test, HRV dagli intervalli RR | Chrome su Android e computer (Web Bluetooth); fasce Polar, Garmin, Wahoo; orologi Garmin, Polar, Coros, Suunto con la trasmissione del battito |
| **Video analisi** | registra o carica un video (anche slow-motion 120–240 fps fatto con la fotocamera del telefono), riproduzione a 0,1× · 0,25× · 0,5×, fotogramma per fotogramma; riconoscimento del corpo (MediaPipe Pose, sul telefono): angoli di ginocchio e anca, tronco, **valgismo delle ginocchia** all'atterraggio; **altezza del salto** segnando stacco e atterraggio (precisione indicata in base ai fotogrammi al secondo) | ovunque; il rallentatore vero viene dai video slow-motion caricati |

### Cosa serve l'app nativa (App Store e Google Play)

Il browser non può leggere Apple Salute, Health Connect né parlare con le app degli orologi. Per **Apple Watch** e **Wear OS** (battito e HRV dall'orologio, GPS dell'orologio, telecomando dei test dal polso) serve l'app nativa di Elvy, come quella di Equistasi Point in `mobile/` (Capacitor, che ha già un'app Apple Watch per il telecomando):

1. **iPhone + Apple Watch**: HealthKit (battito, HRV SDNN, allenamenti con percorso GPS), app watchOS per avviare i test e vedere il battito; lettura NFC del dispositivo Elvy.
2. **Android + Wear OS**: Health Connect (battito, HRV RMSSD, allenamenti ed esercizi con percorso), app Wear OS; Bluetooth nativo per le fasce anche senza Chrome.
3. Lo stesso codice web di Elvy dentro l'app: i test e le schermate restano questi; l'app nativa aggiunge solo i collegamenti.

## Come funzionano le misure

`js/analysis.js` contiene solo funzioni pure, usate dall'app e dai test di Node:

- i campioni vengono ricampionati a 100 Hz; la verticale si ricava dalla gravità, quindi il verso del telefono non conta (anche il segno opposto degli assi su iPhone);
- **volo**: tratti in cui il telefono è quasi in caduta libera (< 0,35 g); altezza = g·t²/8;
- **drop jump**: caduta dal gradino → contatto → volo; RSI = altezza (m) ÷ contatto (s);
- **equilibrio**: accelerazione orizzontale integrata due volte in frequenza (0,15–3 Hz) → spostamento del tronco in cm; area dell'ellisse al 95%; un picco di accelerazione indica il piede appoggiato;
- **corsa**: passi = picchi dell'accelerazione verticale; contatto = forza verticale sopra 0,4 g; oscillazione = spostamento verticale tra due passi; regolarità = autocorrelazione; destra/sinistra dalla spinta laterale durante l'appoggio (con cintura, schermo verso l'esterno; si può invertire nel Profilo);
- **mobilità**: angolo tra la direzione della gravità nella posizione di partenza e quella mantenuta ferma al massimo.

Sono **stime per l'allenamento**, non misure cliniche: vanno confrontate sempre con lo stesso telefono, nella stessa posizione e con lo stesso protocollo.

## File

| File | Contenuto |
|---|---|
| `index.html` | pagina dell'app |
| `css/elvy.css` | stile (colori delle schermate di progetto) |
| `js/analysis.js` | algoritmi sui segnali dell'accelerometro |
| `js/sim.js` | simulatore di segnali (test automatici e modalità prova) |
| `js/sensors.js` | accelerometro, voce, bip, schermo acceso |
| `js/gate.js` | attivazione con il numero di serie e disegno del dispositivo |
| `js/video.js` | video analisi: registrazione, rallentatore, riconoscimento del corpo, angoli, salto |
| `js/app.js` | test, schermate, salvataggio dei risultati (localStorage) |
| `test/analysis.test.js` | test degli algoritmi su segnali simulati |
| `sw.js`, `manifest.webmanifest` | installazione e uso offline |

## Avvio e test

```
python3 -m http.server 8000      # dalla cartella principale, poi http://localhost:8000/elvy/
node --test elvy/test/*.test.js  # test degli algoritmi
```

I sensori di movimento funzionano solo in **https** (o su localhost) e su iPhone chiedono il permesso al primo test.

## Prossimi passi

- lettura NFC del dispositivo Elvy (app nativa con Capacitor, come `mobile/`);
- distinguere in Airtable i dispositivi Elvy dagli altri Equistasi, se l'app deve accettare solo quelli;
- HRV del mattino con il dito sulla fotocamera e postura con foto (già in Equistasi Point);
- smartwatch come telecomando dei test;
- validazione delle misure sul campo (es. pedana di forza, optojump) per tarare soglie e filtri.
