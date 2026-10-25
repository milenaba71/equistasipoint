# Verifica del seriale (Make + Airtable)

> **Già installato** (14/10/2026) nel team Make "My Team":
> - scenario `Equistasi App – Verifica seriale` (id 9976532) → webhook `https://hook.eu2.make.com/34myr3nwas3mntlb268fj5q7kz7lnmp1`
> - scenario `Equistasi App – Elenco video tutorial` (id 9976535) → webhook `https://hook.eu2.make.com/mtc48yt0x8t1m1e8tiu5obik0uz519vl`
>
> Entrambi usano la connessione Airtable **EQUITUTTO2026**. Le istruzioni qui sotto servono solo per reinstallarli.

Per entrare nell'app l'utente inserisce il seriale del proprio dispositivo Equistasi.
Il seriale è valido se compare tra i dispositivi collegati al campo **abbinamento dispositivi**
della tabella **Abbinamento Kit** nella base Airtable **EQUITUTTO**
(controllo sul campo lookup `Abbinamento seriali (testo)`, corrispondenza esatta, maiuscole/minuscole e spazi ignorati).
Il seriale ricevuto viene sempre trattato come testo (`toString`): i seriali fatti solo di cifre (es. `20240008797`) altrimenti arrivano a Make come numero e non vengono trovati (corretto il 17/10/2026).

```
App  ──GET ?serial=EQX25002587──▶  Webhook Make  ──▶  Airtable (Abbinamento Kit)
App  ◀──────── {"valid": true} ─────────────────────┘
```

La chiave di Airtable resta dentro Make: l'app pubblica non contiene credenziali e
riceve solo `true` / `false`, senza dati di clienti o kit.

## Installazione
1. In Make: **Create a new scenario → ⋯ → Import blueprint** e scegli `verifica-seriale.blueprint.json`.
2. Nel primo modulo (Custom webhook) crea un nuovo webhook e copia l'indirizzo.
3. Nel secondo modulo verifica che la connessione sia **EQUITUTTO2026**.
4. Salva e attiva lo scenario (scheduling: *Immediately*).
5. Incolla l'indirizzo del webhook in `js/config.js` → `verifyUrl`.

Prova: apri `https://hook.eu2.make.com/XXXX?serial=EQX25002587` nel browser → deve rispondere `{"valid": true}`.

Ogni verifica consuma 2 operazioni Make. L'app ricorda il seriale sul telefono, quindi la verifica avviene solo al primo accesso.

---

# Video tutorial (Make + Airtable + Bunny Stream)

I video si gestiscono in autonomia dalla tabella **Videos** della base Airtable **Equistasi App**
(la stessa già usata finora). L'app legge l'elenco tramite il webhook Make
"Equistasi App – Elenco video tutorial" (`elenco-video.blueprint.json`).

## Aggiungere un video
1. Carica il video su **Bunny Stream** (libreria 541313) e copia il link *embed*
   (`https://iframe.mediadelivery.net/embed/541313/…`) e l'URL della miniatura.
   In alternativa va bene anche un link **YouTube** (anche "non in elenco") o **Vimeo**.
2. In Airtable → **Videos** crea una riga:
   | Campo | Cosa scrivere |
   |---|---|
   | Description | titolo del video. Per i video di un muscolo usa il nome inglese (es. `Trapezius`, `Trapezius 2`) |
   | Category | `general` = guide all'applicazione, `muscle` = video di un muscolo |
   | Video URL | link embed Bunny / YouTube / Vimeo |
   | Preview Image | URL della miniatura (facoltativo) |
   | Order | ordine di visualizzazione (facoltativo) |
   | Language | lascia vuoto o `it`; i video `en` non vengono mostrati |
   | Muscles | facoltativo: id del muscolo dell'app (es. `gluteo_medio`) per collegare un video con un nome diverso |
3. Fatto: l'app aggiorna l'elenco entro 6 ore (oppure subito per chi la apre per la prima volta).

## Installazione dello scenario
Come per la verifica del seriale: importa `elenco-video.blueprint.json`, crea il webhook,
scegli una connessione Airtable che abbia accesso alla base **Equistasi App**, attiva lo scenario
e incolla l'indirizzo del webhook in `js/config.js` → `videosUrl`.
L'app tiene in memoria l'elenco per 6 ore: ogni utente consuma al massimo ~4 esecuzioni al giorno.
Limite attuale: 100 video (oltre serve la paginazione).

---

# Profili utente e protocolli

All'avvio l'utente sceglie il profilo: **Dolore**, **Patologia neurologica** (Parkinson,
Sclerosi multipla, Atassia, Altra) oppure **Sport**. Ogni profilo vede solo i suoi contenuti.

## Decidere chi vede cosa
Nelle tabelle Airtable **Videos** e **PDF_files** (base Equistasi App) c'è il campo **Profili app**:
| Valore | Chi lo vede |
|---|---|
| Tutti | tutti i profili |
| Dolore / Sport | il profilo corrispondente |
| Neurologico (tutti) | tutti i pazienti neurologici |
| Parkinson / Sclerosi multipla / Atassia | solo quella patologia |

Campo vuoto: i protocolli e i video "general" li vedono tutti, i video dei muscoli solo Dolore e Sport.
I contenuti con Language = `en` non vengono mostrati.

## Scenari Make
- `Equistasi App – Contenuti (video e protocolli)` (id 9976535): restituisce `{"videos": …, "protocols": …}`.
- `Equistasi App – Registra profilo utente` (id 9976575) → webhook `https://hook.eu2.make.com/2n8ia3fjrqn2f7ych3f5gsb66pmkl6wo`.
  Crea una riga nella tabella **Utenti App** (seriale, profilo, patologia, fascia d'età, versione informativa)
  **solo se l'utente ha dato il consenso** alla condivisione.

# Privacy
Il testo dell'informativa sintetica è in `js/data.js` → `window.PRIVACY` (le parti tra [parentesi] vanno completate
e il testo va verificato dal consulente privacy / DPO). Il link all'informativa completa si inserisce in
`js/config.js` → `privacyUrl`: finché è vuoto il link non compare.

## Dispositivi a noleggio professionale
La verifica del seriale risponde anche `"pro": true` quando il dispositivo, nella tabella
**dispositivi disponibili**, ha tipologia **noleggio prof**. L'app allora mostra gli
«Strumenti per il professionista» (goniometro, scoliometro, dolore e uso del dispositivo).
L'app ricontrolla una volta al giorno: se si cambia la tipologia su Airtable, l'accesso si aggiorna da solo.

## Calibrazione annuale
La verifica risponde anche `"cal": "AAAA-MM-GG"`: la «data prossima calibrazione» dell'ultima riga della tabella
**calibrazioni** che contiene quel numero di serie nelle NOTE. L'app mostra una barra che scorre fino a quella data;
se non c'è nessuna calibrazione registrata, conta un anno dal giorno in cui il dispositivo è stato attivato nell'app.
Per far ripartire la barra dopo una calibrazione basta registrarla in **calibrazioni** con i seriali nelle NOTE.
