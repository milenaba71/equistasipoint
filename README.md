# Equistasi Trigger Point

Web app (PWA) per chi acquista il dispositivo **Equistasi**: indica dove senti dolore e l'app ti mostra, su un corpo umano stilizzato con i muscoli,

- la **X** = trigger point, cioè il punto dove applicare il dispositivo Equistasi;
- le **zone blu** = dove si irradia il dolore (blu pieno = dolore principale, blu puntinato = dolore possibile).

Mappe basate su Travell, Simons & Simons, *Myofascial Pain and Dysfunction: The Trigger Point Manual*.

## Funzioni
- **Profilazione**: Dolore, Patologia neurologica (Parkinson, Sclerosi multipla, Atassia…) o Sport. Ogni profilo vede solo i propri protocolli (PDF) e video, gestiti da Airtable. Con il consenso dell'utente il profilo viene registrato in Airtable (tabella Utenti App).
- **Privacy**: informativa sintetica, consenso facoltativo ai dati sulla salute, cancellazione dei dati dal telefono, spazio per il link all'informativa completa (`js/config.js` → `privacyUrl`).
- **Accesso con il numero di serie** del dispositivo: il seriale deve essere presente in Airtable (EQUITUTTO → Abbinamento Kit → abbinamento dispositivi). Verifica tramite webhook Make, vedi [`make/README.md`](make/README.md). Configurazione in `js/config.js`.
- Mappa del corpo toccabile (davanti / dietro): il lato toccato imposta automaticamente destro / sinistro.
- 13 zone di dolore, 26 muscoli con trigger point e dolore riferito.
- Scheda muscolo: figura zoomata, lato destro/sinistro, istruzioni di applicazione, come trovare il punto esatto, sintomi, cause, consigli, segnali d'allarme.
- **Video tutorial** gestiti da Airtable (tabella Videos) e Bunny Stream: sezione dedicata e video nella scheda di ogni muscolo. Vedi [`make/README.md`](make/README.md).
- Ricerca per disturbo (es. "cefalea", "sciatica", "tallone").
- Installabile sullo smartphone e utilizzabile offline.

## Elvy (sport)
Nella cartella [`elvy/`](elvy/README.md) c'è **Elvy**, l'app per lo sport: test di equilibrio, salti, corsa, core, reazione e mobilità con l'accelerometro del telefono, con e senza Elvy. Si apre su `/elvy/`.

## Struttura
| File | Contenuto |
|---|---|
| `index.html` | pagina dell'app |
| `js/body.js` | disegno SVG del corpo e dei muscoli (vista frontale e posteriore) |
| `js/data.js` | trigger point, zone di dolore, testi di applicazione Equistasi, segnali d'allarme |
| `js/app.js` | navigazione e interfaccia |
| `js/config.js` | indirizzo del webhook di verifica seriale |
| `make/` | scenario Make da importare per la verifica su Airtable |
| `sw.js`, `manifest.webmanifest` | installazione e uso offline |

### Aggiungere o modificare un muscolo
In `js/data.js` ogni muscolo ha `x` (punti di applicazione) e `zones` (ellissi `[cx, cy, rx, ry, rotazione]`, `p: 1` principale / `p: 0` secondaria) per la vista `front` e/o `back`. Le coordinate stanno sulla metà sinistra del disegno (viewBox 200×440); l'app le specchia per l'altro lato.

I testi di applicazione (`window.EQUISTASI`) vanno allineati al foglietto illustrativo ufficiale.

## Avvio locale
```
python3 -m http.server 8000
```
poi apri http://localhost:8000. Per pubblicarla basta attivare GitHub Pages sul repository.

> Il file `index` contiene il precedente prototipo di viewer 3D (richiede `human_muscles.glb`, non presente).
