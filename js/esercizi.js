/* Programma di esercizi posturali per il professionista (solo «noleggio prof»), da abbinare a Equistasi.
   Legge le ultime misure della postura salvate sul telefono (foto di lato e di fronte, test con i sensori)
   e propone esercizi per ciò che risulta da migliorare. Il professionista sceglie quali tenere,
   il programma si stampa, si condivide ed entra nel report PDF.
   Stima indicativa, mai un'analisi medica: le soglie servono solo a proporre, decide il professionista. */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage non disponibile */ } },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d) => (window.LANG === 'en' ? v.toFixed(d) : v.toFixed(d).replace('.', ','));
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (t) => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2); };
  const PROG = 'tp-prog'; // { t, ids: [...] } programma scelto dal professionista
  const DISCLAIMER = () => T('Stima indicativa, non è un’analisi medica. Il programma è una proposta: il professionista lo adatta al paziente e lo sospende in caso di dolore.');

  /* Esercizi: come si fa e quanto. area = zona della mappa dove applicare Equistasi durante gli esercizi. */
  const EX = () => ({
    mento: { name: T('Retrazione del mento'), area: 'collo',
      how: T('Seduto o in piedi con la schiena dritta, porta il mento indietro come a fare un «doppio mento», senza abbassare la testa. Tieni e rilassa.'),
      dose: T('10 ripetizioni, tieni 5 secondi · 2 serie') },
    pettorali: { name: T('Allungamento dei pettorali alla porta'), area: 'torace',
      how: T('Avambracci appoggiati ai lati di una porta, gomiti all’altezza delle spalle. Porta il busto in avanti finché senti allungare il petto.'),
      dose: T('Tieni 30 secondi · 3 volte') },
    angeli: { name: T('Angeli al muro'), area: 'schiena_alta',
      how: T('Schiena, testa e glutei appoggiati al muro, braccia a «W». Fai scivolare le braccia in alto e torna giù senza staccarle dal muro.'),
      dose: T('10 ripetizioni lente · 2 serie') },
    toracica: { name: T('Estensione dorsale sull’asciugamano'), area: 'schiena_alta',
      how: T('Sdraiato con un asciugamano arrotolato di traverso sotto le scapole, mani dietro la testa. Lascia andare indietro le spalle e respira.'),
      dose: T('5 respiri lenti · 3 volte, spostando l’asciugamano poco più in basso') },
    scapole: { name: T('Avvicinamento delle scapole'), area: 'schiena_alta',
      how: T('Braccia lungo i fianchi, spalle basse. Avvicina le scapole tra loro e verso il basso, senza alzare le spalle.'),
      dose: T('12 ripetizioni, tieni 3 secondi · 2 serie') },
    collo_lat: { name: T('Allungamento laterale del collo'), area: 'collo',
      how: T('Seduto, una mano sotto la coscia dallo stesso lato. Inclina lentamente l’orecchio opposto verso la spalla, senza ruotare la testa.'),
      dose: T('Tieni 30 secondi per lato, più a lungo dal lato più rigido · 2 volte') },
    tronco_lat: { name: T('Allungamento laterale del tronco'), area: 'lombare',
      how: T('In piedi, piedi alla larghezza delle anche. Porta un braccio sopra la testa e piegati dal lato opposto, senza ruotare il busto.'),
      dose: T('Tieni 20 secondi per lato · 3 volte') },
    birddog: { name: T('Quadrupedia braccio–gamba'), area: 'lombare',
      how: T('Carponi, schiena neutra. Allunga un braccio in avanti e la gamba opposta indietro, tieni senza far ruotare il bacino, torna e cambia.'),
      dose: T('8 per lato, tieni 5 secondi · 2 serie') },
    ponte: { name: T('Ponte glutei'), area: 'anca_gluteo',
      how: T('Sdraiato a pancia in su, ginocchia piegate e piedi a terra. Solleva il bacino stringendo i glutei fino ad allineare spalle, anche e ginocchia.'),
      dose: T('12 ripetizioni, tieni 3 secondi · 2 serie') },
    conchiglia: { name: T('Apertura a conchiglia'), area: 'anca_gluteo',
      how: T('Sdraiato su un fianco, ginocchia piegate e talloni uniti. Apri il ginocchio di sopra senza muovere il bacino, poi chiudi.'),
      dose: T('15 per lato · 2 serie, di più dal lato del bacino più basso') },
    flessori: { name: T('Allungamento dei flessori dell’anca'), area: 'anca_gluteo',
      how: T('In affondo con il ginocchio dietro appoggiato su un cuscino. Spingi in avanti il bacino tenendo il busto dritto.'),
      dose: T('Tieni 30 secondi per lato · 2 volte') },
    ischio: { name: T('Allungamento dei muscoli dietro la coscia'), area: 'coscia',
      how: T('Seduto sul bordo della sedia, una gamba tesa con il tallone a terra. Porta avanti il busto con la schiena dritta finché senti allungare.'),
      dose: T('Tieni 30 secondi per lato · 2 volte') },
    squat_muro: { name: T('Mini squat al muro'), area: 'ginocchio',
      how: T('Schiena al muro, piedi un passo avanti. Piega poco le ginocchia, tieni le ginocchia in linea con i piedi e risali senza bloccarle tese.'),
      dose: T('10 ripetizioni lente · 2 serie') },
    monopodalico: { name: T('Equilibrio su una gamba'), area: 'piede',
      how: T('Vicino a un muro o a una sedia per sicurezza. Stai su una gamba con il ginocchio morbido; quando è facile, prova a occhi chiusi.'),
      dose: T('30 secondi per gamba · 3 volte') },
    tandem: { name: T('Cammino tallone–punta'), area: 'piede',
      how: T('Lungo un corridoio, vicino al muro. Cammina mettendo il tallone di un piede subito davanti alla punta dell’altro, sguardo avanti.'),
      dose: T('10 passi avanti e indietro · 3 volte') },
  });

  /* ───── Lettura delle misure ───── */
  const last = (a) => (a.length ? a[a.length - 1] : null);
  function readings() {
    const recs = store.get('tp-posture', []);
    const photos = store.get('tp-posture-photos', []);
    const pm = window.EqPosture && window.EqPosture._photoMetrics;
    const photo = (side) => last(photos.filter((p) => (side ? p.view === 'lato' : p.view !== 'lato')));
    const metricsOf = (p) => (p && pm ? pm(p.view === 'lato' ? 'lato' : 'fronte', p.pts, p.w, p.h) : []);
    return {
      side: photo(true), front: photo(false),
      sideM: metricsOf(photo(true)), frontM: metricsOf(photo(false)),
      testa: last(recs.filter((r) => r.test === 'testa')),
      tronco: last(recs.filter((r) => r.test === 'tronco')),
      schiena: last(recs.filter((r) => r.test === 'schiena')),
      stab: last(recs.filter((r) => r.test === 'stabilita' && r.m)),
    };
  }

  /* Cosa risulta da migliorare: { k, text, src, ex: [...] }. Soglie prudenti, solo per proporre. */
  function findings(R) {
    const out = [];
    const m = (list, k) => list.find((x) => x.k === k);
    const deg = (v) => fmt(v, 0) + '°';
    // foto di lato
    const sTesta = m(R.sideM, 'testa'); const sAll = m(R.sideM, 'allineamento');
    const sTr = m(R.sideM, 'tronco'); const sGin = m(R.sideM, 'ginocchio');
    const fromSide = R.side ? T('foto di lato del {d}', { d: dateStr(R.side.t) }) : '';
    if (sTesta && sTesta.v < 48) out.push({ k: 'testa_avanti', text: T('Testa in avanti (angolo testa–spalla {v})', { v: deg(sTesta.v) }), src: fromSide, ex: ['mento', 'pettorali', 'scapole'] });
    if (sAll && sAll.v > 4 && sAll.note === T('in avanti')) out.push({ k: 'peso_avanti', text: T('Peso del corpo spostato in avanti ({v})', { v: deg(sAll.v) }), src: fromSide, ex: ['ponte', 'monopodalico'] });
    if (sTr && sTr.v > 5) out.push({ k: 'tronco_ap', text: sTr.note === T('in avanti') ? T('Tronco inclinato in avanti ({v})', { v: deg(sTr.v) }) : T('Tronco inclinato indietro ({v})', { v: deg(sTr.v) }), src: fromSide, ex: sTr.note === T('in avanti') ? ['flessori', 'birddog', 'angeli'] : ['birddog', 'ponte'] });
    if (sGin && sGin.v > 5) out.push({ k: 'ginocchio', text: sGin.note === T('in flessione') ? T('Ginocchia piegate in piedi ({v})', { v: deg(sGin.v) }) : T('Ginocchia in iperestensione ({v})', { v: deg(sGin.v) }), src: fromSide, ex: sGin.note === T('in flessione') ? ['ischio', 'ponte'] : ['squat_muro', 'monopodalico'] });
    // foto di fronte o da dietro
    const fSp = m(R.frontM, 'spalle'); const fBac = m(R.frontM, 'bacino');
    const fTe = m(R.frontM, 'testa'); const fTr = m(R.frontM, 'tronco');
    const fromFront = R.front ? T('foto di fronte del {d}', { d: dateStr(R.front.t) }) : '';
    if (fTe && fTe.v > 3) out.push({ k: 'testa_lat', text: T('Testa inclinata di lato, {n} ({v})', { n: fTe.note, v: deg(fTe.v) }), src: fromFront, ex: ['collo_lat', 'mento'] });
    if (fSp && fSp.v > 2) out.push({ k: 'spalle', text: T('Spalle non allineate, {n} ({v})', { n: fSp.note, v: deg(fSp.v) }), src: fromFront, ex: ['tronco_lat', 'scapole'] });
    if (fBac && fBac.v > 2) out.push({ k: 'bacino', text: T('Bacino non allineato, {n} ({v})', { n: fBac.note, v: deg(fBac.v) }), src: fromFront, ex: ['conchiglia', 'ponte', 'tronco_lat'] });
    if (fTr && fTr.v > 2) out.push({ k: 'tronco_lat', text: T('Tronco spostato di lato, {n} ({v})', { n: fTr.note, v: deg(fTr.v) }), src: fromFront, ex: ['tronco_lat', 'birddog'] });
    // test con i sensori
    if (R.testa && Math.abs(R.testa.ap) > 10) out.push({ k: 'testa_s', text: R.testa.ap > 0 ? T('Testa flessa in avanti ({v}, sensori)', { v: deg(Math.abs(R.testa.ap)) }) : T('Testa estesa indietro ({v}, sensori)', { v: deg(Math.abs(R.testa.ap)) }), src: T('test testa e collo del {d}', { d: dateStr(R.testa.t) }), ex: ['mento', 'collo_lat'] });
    if (R.tronco && (Math.abs(R.tronco.ap) > 5 || Math.abs(R.tronco.ml) > 3)) {
      const parts = [];
      if (Math.abs(R.tronco.ap) > 5) parts.push(R.tronco.ap > 0 ? T('{v} in avanti', { v: deg(Math.abs(R.tronco.ap)) }) : T('{v} indietro', { v: deg(Math.abs(R.tronco.ap)) }));
      if (Math.abs(R.tronco.ml) > 3) parts.push(R.tronco.ml > 0 ? T('{v} a destra', { v: deg(Math.abs(R.tronco.ml)) }) : T('{v} a sinistra', { v: deg(Math.abs(R.tronco.ml)) }));
      out.push({ k: 'tronco_s', text: T('Tronco inclinato: {p} (sensori)', { p: parts.join(', ') }), src: T('test del tronco del {d}', { d: dateStr(R.tronco.t) }), ex: Math.abs(R.tronco.ml) > 3 ? ['tronco_lat', 'birddog'] : ['flessori', 'birddog'] });
    }
    if (R.schiena && R.schiena.k > 45) out.push({ k: 'cifosi', text: T('Curva dorsale accentuata ({v})', { v: deg(R.schiena.k) }), src: T('test della curva della schiena del {d}', { d: dateStr(R.schiena.t) }), ex: ['toracica', 'angeli', 'pettorali', 'scapole'] });
    if (R.stab && window.EqPosture && window.EqPosture.index(R.stab.m.area) < 60) out.push({ k: 'stabilita', text: T('Stabilità in piedi da migliorare (indice {v} su 100)', { v: window.EqPosture.index(R.stab.m.area) }), src: T('test di stabilità del {d}', { d: dateStr(R.stab.t) }), ex: ['monopodalico', 'tandem', 'birddog'] });
    return out;
  }

  // esercizi proposti, senza doppioni, nell'ordine in cui compaiono
  // al massimo 8, per un programma che si riesce a fare ogni giorno: gli altri restano in «Altri esercizi»
  const proposed = (F) => F.reduce((a, f) => a.concat(f.ex.filter((e) => !a.includes(e))), []).slice(0, 8);

  function exHtml(id, ex, checked, why) {
    const a = window.AREAS && window.AREAS.find((x) => x.id === ex.area);
    return '<label class="ex-item"><input type="checkbox" data-ex="' + id + '"' + (checked ? ' checked' : '') + ' class="pz-noprint">' +
      '<span><b>' + ex.name + '</b><br><span class="small">' + ex.how + '</span><br>' +
      '<span class="ex-dose">' + ex.dose + '</span>' +
      (why.length ? '<br><span class="small muted">' + T('Per: {w}', { w: why.join(' · ') }) + '</span>' : '') +
      (a ? '<br><a class="small ex-area pz-noprint" href="#/area/' + a.id + '">' + T('Equistasi: zona {z} sulla mappa', { z: esc(a.name) }) + ' ›</a>' : '') +
      '</span></label>';
  }

  function render(app) {
    const R = readings(); const F = findings(R); const E = EX();
    const saved = store.get(PROG, null);
    const ids = proposed(F);
    const chosen = saved && saved.ids ? saved.ids : ids;
    const whyOf = (id) => F.filter((f) => f.ex.includes(id)).map((f) => f.text);
    const none = !R.side && !R.front && !R.testa && !R.tronco && !R.schiena && !R.stab;
    app.innerHTML = '<div class="detail-head"><div class="eyebrow">' + T('Professionista') + '</div><h1>' + T('Programma di esercizi posturali') + '</h1>' +
      '<p class="small muted" style="margin:6px 0 0">' + T('Proposto dalle ultime misure della postura, da eseguire con Equistasi applicato.') + '</p></div>' +
      '<div class="warn">' + DISCLAIMER() + '</div>' +
      (none
        ? '<div class="card"><p style="margin:0">' + T('Non ci sono ancora misure della postura su questo telefono.') + '</p>' +
          '<p class="small muted">' + T('Fai prima la foto di lato e di fronte, oppure i test con i sensori (testa, tronco, curva della schiena, stabilità).') + '</p>' +
          '<a class="btn primary" href="#/postura">' + T('Misura la postura') + '</a></div>'
        : '<div class="card"><h3>' + T('Cosa risulta dalle misure') + '</h3>' +
          (F.length ? '<ul class="ex-find">' + F.map((f) => '<li>' + f.text + '<br><span class="small muted">' + f.src + '</span></li>').join('') + '</ul>'
            : '<p class="small" style="margin:0">' + T('Le ultime misure non mostrano aspetti da correggere: il programma propone esercizi di mantenimento.') + '</p>') + '</div>' +
          '<div class="card"><h3>' + T('Esercizi') + '</h3><p class="small muted pz-noprint" style="margin-top:0">' + T('Togli o aggiungi gli esercizi: la scelta resta salvata e va nel report PDF.') + '</p>' +
          '<div class="ex-list">' + (ids.length ? ids : ['scapole', 'birddog', 'monopodalico']).map((id) => exHtml(id, E[id], chosen.includes(id) || (!saved && !ids.length), whyOf(id))).join('') + '</div>' +
          '<details class="pz-noprint ex-more"><summary>' + T('Altri esercizi') + '</summary><div class="ex-list">' +
          Object.keys(E).filter((id) => !ids.includes(id) && (ids.length || !['scapole', 'birddog', 'monopodalico'].includes(id))).map((id) => exHtml(id, E[id], chosen.includes(id), [])).join('') + '</div></details></div>' +
          '<div class="card"><h3>' + T('Come abbinarli a Equistasi') + '</h3><ol class="steps">' +
          '<li>' + T('Applica Equistasi come indicato nella mappa per la zona di ogni esercizio, oppure secondo il protocollo che usi con il paziente.') + '</li>' +
          '<li>' + T('Esegui gli esercizi con il dispositivo applicato, <b>1 volta al giorno, 5 giorni a settimana</b>, per 4 settimane.') + '</li>' +
          '<li>' + T('Movimenti lenti e senza dolore. Se compare dolore, interrompi.') + '</li>' +
          '<li>' + T('Dopo 4 settimane <b>ripeti le misure della postura</b> e confronta senza e con Equistasi.') + '</li></ol></div>' +
          '<div class="btn-col pz-noprint"><button class="btn primary" type="button" id="ex-print">' + T('Stampa o salva in PDF') + '</button>' +
          (navigator.share ? '<button class="btn" type="button" id="ex-share">' + T('Condividi con il paziente') + '</button>' : '') +
          '<a class="btn" href="#/postura/report">' + T('Report in PDF completo') + '</a></div>');
    if (none) return;
    app.querySelectorAll('[data-ex]').forEach((c) => c.addEventListener('change', () => {
      const sel = Array.from(app.querySelectorAll('[data-ex]:checked')).map((x) => x.dataset.ex);
      store.set(PROG, { t: Date.now(), ids: sel });
    }));
    // in stampa vanno solo gli esercizi scelti, anche quelli presi da «Altri esercizi»
    document.getElementById('ex-print').addEventListener('click', () => { const d = app.querySelector('.ex-more'); if (d) d.open = true; window.print(); });
    const sh = document.getElementById('ex-share');
    if (sh) sh.addEventListener('click', () => { navigator.share({ title: T('Programma di esercizi posturali'), text: shareText() }).catch(() => {}); });
  }

  // programma in testo semplice (condivisione e report)
  function chosenList() {
    const E = EX(); const saved = store.get(PROG, null);
    const ids = saved && saved.ids ? saved.ids : proposed(findings(readings()));
    return ids.filter((id) => E[id]).map((id) => E[id]);
  }
  function shareText() {
    return T('Programma di esercizi posturali con Equistasi') + '\n\n' +
      chosenList().map((e, i) => (i + 1) + '. ' + e.name + ' — ' + e.dose + '\n' + e.how).join('\n\n') +
      '\n\n' + T('1 volta al giorno, 5 giorni a settimana, per 4 settimane, con Equistasi applicato.') + '\n' + DISCLAIMER();
  }
  // righe per il report PDF del professionista
  function reportGroup() {
    const list = chosenList();
    if (!list.length) return null;
    return { title: T('Programma di esercizi posturali'), rows: list.map((e) => ({ label: e.name, val: e.dose })) };
  }

  window.EqExercises = { render, reportGroup, _findings: findings, _readings: readings };
})();
