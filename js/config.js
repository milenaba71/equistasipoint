/*
 * Configurazione dell'app.
 *
 * verifyUrl: indirizzo del webhook Make "Equistasi App – Verifica seriale"
 * (vedi make/README.md). L'app chiama  verifyUrl?serial=XXXX  e si aspetta
 * la risposta JSON  {"valid": true}  oppure  {"valid": false}.
 * La chiave di Airtable resta su Make e non è mai presente nell'app.
 */
window.APP_CONFIG = {
  verifyUrl: '',
  // Webhook Make "Equistasi App – Elenco video tutorial": restituisce i record
  // della tabella Airtable "Videos" (base Equistasi App). Vedi make/README.md.
  videosUrl: '',
};
