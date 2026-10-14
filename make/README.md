# Verifica del seriale (Make + Airtable)

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
