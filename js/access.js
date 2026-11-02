/* Sezioni aperte in base al tipo di dispositivo (tipologia di Airtable, letta da Supabase all'abbinamento).
   - Noleggio Prof: tutto, anche gli strumenti per il professionista (js/pro.js, tp-pro).
   - Silicon, noleggio privato e gli altri tipi: tutto tranne gli strumenti per il professionista.
   - Gel: Sprint e Postura (con il report PDF) restano visibili con il lucchetto: «riservato ai dispositivi di tipologia superiore».
   Il tipo è in localStorage 'tp-kind' (prof | silicon | gel | rent); vuoto = non ancora noto, tutto aperto. */
(function () {
  const T = window.T || ((s) => s);
  const raw = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const GEL_LOCK = { sprint: 1, postura: 1 };

  // tipologia di Airtable → tipo per l'app
  function kindOf(tipo, pro) {
    const t = String(tipo || '').trim().toUpperCase();
    if (pro || t === 'NOLEGGIO PROF') return 'prof';
    if (t === 'NOLEGGIO PRIVATO') return 'rent';
    if (t.indexOf('GEL') === 0) return 'gel';
    return 'silicon';
  }
  const kind = () => raw('tp-kind');
  const locked = (feature) => kind() === 'gel' && !!GEL_LOCK[feature];
  const LOCK = '<span class="lock-ic" aria-hidden="true">🔒</span>';
  const lockNote = () => T('Riservato ai dispositivi di tipologia superiore: Silicon o altro');
  // pagina mostrata al posto di una sezione chiusa
  function lockedPage(title) {
    return '<div class="card lock-page">' + LOCK + '<h2>' + title + '</h2><p>' + lockNote() +
      '.</p><p class="small muted">' + T('Il tuo dispositivo Equistasi Gel apre la mappa, dermatomeri e metameri, i promemoria, i video, l’equilibrio e il salto.') +
      '</p><a class="btn primary" href="#/">' + T('Torna alla home') + '</a></div>';
  }
  window.EqAccess = { kindOf, kind, locked, lockedPage, lockNote, LOCK };
})();
