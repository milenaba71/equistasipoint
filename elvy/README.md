# Elvy · by Equistasi

Web app (PWA) per lo sport: i test che uno sportivo vuole fare, misurati con l'**accelerometro del telefono**, da confrontare **con e senza Elvy** (il dispositivo Equistasi per lo sport). Grafica e testi seguono la presentazione di progetto in [`tools/elvy`](../tools/elvy/presentazione.html).

Online: `https://app.equistasi.com/elvy/` (stesso sito di Equistasi Point).

## Marchi

Il logo **elvy** (e verde, lvy argento, come sulla scatola) è in `img/logo-elvy.png` e compare in testa alla schermata di attivazione, al benvenuto e alle schermate Oggi, Test, Progressi e Profilo. In fondo a ogni schermata c'è «un prodotto» con il piccolo logo **Equistasi** (`img/logo-equistasi.png`), che porta a equistasi.com.

## Accesso con il numero di serie

Alla prima apertura c'è la schermata **Attiva Elvy** con il dispositivo disegnato come l'etichetta reale (logo Elvy a sinistra, codice a barre, seriale e CE a destra).

- Toccando il codice a barre disegnato si apre la fotocamera **dentro il disegno** (`../js/scan.js`, lo stesso lettore di Equistasi Point): legge il codice a barre e, se è rovinato, i **caratteri stampati, lettere e numeri** (es. `EQX25001801`), oltre ai seriali di sole cifre (`20…`, 11 cifre). Un seriale letto vale solo quando esce uguale due volte; gli scambi tipici (O/0, I/1, S/5, B/8) vengono corretti e la sigla `EQX` viene riconosciuta anche con una lettera letta male.
- L'abbinamento si apre **a tutto schermo, in stile Apple Watch** (`../js/pair.js` con i colori Elvy, `css/pair.css`): cerchio con la fotocamera, nuvola di particelle verde acqua e viola, anello che si chiude, seriale che si accende carattere per carattere, lampo, ✓ e suono di conferma. Con «riduci movimento» attivo sul telefono la lettura resta dentro il disegno.
- Il **seriale a mano** non si vede all'inizio: compare solo se la fotocamera non riesce a leggere il codice, cioè fotocamera negata o non disponibile, nessuna lettura entro 25 secondi, oppure codice letto ma non riconosciuto (in quel caso il campo è già compilato da correggere). C'è anche «Riprova con la fotocamera».
- La verifica usa lo stesso webhook Make di Equistasi Point (`../js/config.js` → `verifyUrl`), che cerca il seriale nella tabella Airtable **EQUITUTTO → Abbinamento Kit** (campo *Abbinamento seriali (testo)*). L'app riceve solo `{"valid": true/false}`: nessuna chiave Airtable nel codice.
- Il seriale abbinato resta sul telefono (`elvy-serial`); dal Profilo si vede il dispositivo e lo si può scollegare.

Codice: `js/gate.js`.

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
