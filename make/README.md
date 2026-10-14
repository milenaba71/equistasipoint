# Verifica del seriale (Make + Airtable)

> **Già installato** (14/10/2026) nel team Make "My Team":
> - scenario `Equistasi App – Verifica seriale` (id 9976532) → webhook `https://hook.eu2.make.com/34myr3nwas3mntlb268fj5q7kz7lnmp1`
> - scenario `Equistasi App – Elenco video tutorial` (id 9976535) → webhook `https://hook.eu2.make.com/mtc48yt0x8t1m1e8tiu5obik0uz519vl`
>
> Entrambi usano la connessione Airtable **EQUITUTTO2026**. Le istruzioni qui sotto servono solo per reinstallarli.

Per entrare nell'app l'utente inserisce il seriale del proprio dispositivo Equistasi.
Il seriale è valido se compare tra i dispositivi collegati al campo **abbinamento dispositivi**
della tabella **Abbinamento Kit** nella base Airtable **EQUITUTTO**
(controllo sul campo lookup `Abbinamento seriali (testo)`, corrispondenza esatta, maiuscole/minuscole ignorate).

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
