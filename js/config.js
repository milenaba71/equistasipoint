/*
 * Configurazione dell'app.
 *
 * verifyUrl: indirizzo del webhook Make "Equistasi App – Verifica seriale"
 * (vedi make/README.md). L'app chiama  verifyUrl?serial=XXXX  e si aspetta
 * la risposta JSON  {"valid": true}  oppure  {"valid": false}.
 * La chiave di Airtable resta su Make e non è mai presente nell'app.
 */
window.APP_CONFIG = {
  verifyUrl: 'https://hook.eu2.make.com/34myr3nwas3mntlb268fj5q7kz7lnmp1',
  // Webhook Make "Equistasi App – Elenco video tutorial": restituisce i record
  // della tabella Airtable "Videos" (base Equistasi App). Vedi make/README.md.
  videosUrl: 'https://hook.eu2.make.com/mtc48yt0x8t1m1e8tiu5obik0uz519vl',
  // Webhook Make "Equistasi App – Registra profilo utente": salva in Airtable
  // (base Equistasi App → Utenti App) il profilo, SOLO se l'utente dà il consenso.
  profileUrl: 'https://hook.eu2.make.com/2n8ia3fjrqn2f7ych3f5gsb66pmkl6wo',
  // Link all'informativa privacy completa (pagina del vostro sito).
  // Lasciare vuoto finché non è disponibile: il link non viene mostrato.
  privacyUrl: '',
};
