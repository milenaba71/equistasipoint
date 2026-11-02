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

  // Esercizi proposti: prima quelli per ciò che risulta dalle misure, poi gli esercizi di base fino ad almeno 6.
  // Al massimo 8, per un programma che si riesce a fare ogni giorno: gli altri restano in «Altri esercizi».
  const BASE = ['scapole', 'mento', 'birddog', 'ponte', 'angeli', 'monopodalico'];
  function proposed(F) {
    const ids = F.reduce((a, f) => a.concat(f.ex.filter((e) => !a.includes(e))), []).slice(0, 8);
    BASE.forEach((id) => { if (ids.length < 6 && !ids.includes(id)) ids.push(id); });
    return ids;
  }

  /* ───── Disegni degli esercizi (omino stilizzato, 120 × 90) ───── */
  const BODY = '#29235C', PROP = '#B9B5D3', ARROW = '#E08A00';
  const pl = (pts) => '<polyline points="' + pts.map((p) => p.join(',')).join(' ') + '" fill="none" stroke="' + BODY + '" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>';
  const headC = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="6.2" fill="#fff" stroke="' + BODY + '" stroke-width="3.4"/>';
  const prop = (d) => '<path d="' + d + '" fill="none" stroke="' + PROP + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
  const arrow = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1); const h = 5;
    const p1 = [x2 - h * Math.cos(a - 0.5), y2 - h * Math.sin(a - 0.5)]; const p2 = [x2 - h * Math.cos(a + 0.5), y2 - h * Math.sin(a + 0.5)];
    return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 + 'M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + 'L' + x2 + ' ' + y2 + 'L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + '" fill="none" stroke="' + ARROW + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
  };
  const FLOOR = prop('M6 85H114');
  const CHAIR = (x) => prop('M' + x + ' 30V85M' + x + ' 58H' + (x + 24) + 'M' + (x + 22) + ' 58V85');
  const POSES = {
    mento: CHAIR(40) + pl([[60, 31], [57, 57], [80, 58], [80, 84]]) + pl([[59, 36], [66, 48], [74, 54]]) + headC(62, 22) + arrow(80, 24, 71, 24),
    pettorali: prop('M86 6V85') + FLOOR + pl([[74, 84], [66, 57], [57, 84]]) + pl([[66, 57], [76, 28]]) + pl([[75, 32], [86, 32], [86, 20]]) + headC(80, 19) + arrow(54, 36, 64, 36),
    angeli: prop('M20 6H100V85') + FLOOR + pl([[54, 84], [60, 55], [66, 84]]) + pl([[60, 55], [60, 25]]) + pl([[42, 14], [46, 30], [60, 28], [74, 30], [78, 14]]) + headC(60, 16) + arrow(38, 26, 38, 10) + arrow(82, 26, 82, 10),
    toracica: FLOOR + '<circle cx="40" cy="80" r="4.5" fill="' + PROP + '"/>' + pl([[32, 75], [66, 77], [82, 62], [94, 82]]) + pl([[34, 74], [26, 64], [20, 68]]) + headC(24, 74) + arrow(46, 62, 38, 62),
    scapole: FLOOR + pl([[54, 84], [60, 55], [66, 84]]) + pl([[60, 55], [60, 24]]) + pl([[46, 54], [49, 28], [71, 28], [74, 54]]) + headC(60, 15) + arrow(44, 38, 54, 38) + arrow(76, 38, 66, 38),
    collo_lat: CHAIR(36) + pl([[60, 57], [60, 28], [55, 22]]) + pl([[60, 57], [82, 58], [82, 84]]) + pl([[60, 31], [50, 46], [62, 58]]) + headC(51, 17) + '<path d="M40 12q-4 10 4 18" fill="none" stroke="' + ARROW + '" stroke-width="2.6" stroke-linecap="round"/>',
    tronco_lat: FLOOR + pl([[52, 84], [60, 56], [68, 84]]) + pl([[60, 56], [52, 28]]) + pl([[56, 31], [50, 14], [38, 10]]) + pl([[54, 33], [64, 50]]) + headC(48, 21) + '<path d="M78 40q-8-22-26-30" fill="none" stroke="' + ARROW + '" stroke-width="2.6" stroke-linecap="round"/>',
    birddog: FLOOR + pl([[38, 84], [38, 54], [72, 56], [74, 84]]) + pl([[38, 54], [12, 48]]) + pl([[72, 56], [104, 52]]) + headC(29, 48),
    ponte: FLOOR + pl([[26, 78], [56, 60], [76, 58], [82, 84]]) + pl([[28, 80], [48, 82]]) + headC(18, 76) + arrow(56, 82, 56, 66),
    conchiglia: FLOOR + pl([[24, 72], [60, 74], [78, 66], [96, 78]]) + pl([[60, 72], [74, 50], [96, 76]]) + pl([[26, 76], [16, 82]]) + headC(17, 68) + '<path d="M84 64q4-14-8-20" fill="none" stroke="' + ARROW + '" stroke-width="2.6" stroke-linecap="round"/>',
    flessori: FLOOR + prop('M30 84h16') + pl([[84, 84], [80, 60], [57, 60], [40, 81], [20, 84]]) + pl([[57, 60], [59, 31]]) + pl([[58, 36], [64, 52]]) + headC(60, 22) + arrow(48, 70, 60, 70),
    ischio: CHAIR(30) + pl([[54, 58], [70, 33]]) + pl([[54, 58], [98, 82]]) + pl([[54, 58], [70, 60], [70, 84]]) + pl([[66, 39], [84, 62]]) + headC(74, 25) + arrow(56, 24, 66, 30),
    squat_muro: prop('M30 6V85') + FLOOR + pl([[36, 28], [36, 55], [55, 62], [53, 84]]) + pl([[36, 32], [44, 50]]) + headC(37, 19) + arrow(70, 44, 70, 58),
    monopodalico: prop('M96 40V85M96 52H112M110 52V85') + FLOOR + pl([[60, 84], [60, 52], [60, 24]]) + pl([[60, 52], [70, 66], [62, 74]]) + pl([[44, 40], [60, 28], [76, 40]]) + headC(60, 15),
    tandem: FLOOR + prop('M20 88H100') + pl([[52, 84], [58, 54], [66, 84]]) + pl([[58, 54], [60, 24]]) + pl([[48, 42], [60, 28], [72, 42]]) + headC(61, 15) + arrow(78, 70, 98, 70),
  };
  const figSvg = (id) => '<svg class="ex-fig" viewBox="0 0 120 90" aria-hidden="true">' + (POSES[id] || '') + '</svg>';
  // disegno in JPEG per il PDF (più leggero del PNG)
  function figPng(id) {
    return new Promise((res) => {
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 120 90"><rect width="120" height="90" rx="8" fill="#F3F5FA"/>' + (POSES[id] || '') + '</svg>';
      const img = new Image();
      img.onload = () => { try { const c = document.createElement('canvas'); c.width = 480; c.height = 360; c.getContext('2d').drawImage(img, 0, 0); res(c.toDataURL('image/jpeg', 0.85)); } catch (e) { res(null); } };
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }

  function exHtml(id, ex, checked, why) {
    const a = window.AREAS && window.AREAS.find((x) => x.id === ex.area);
    return '<label class="ex-item"><input type="checkbox" data-ex="' + id + '"' + (checked ? ' checked' : '') + ' class="pz-noprint">' + figSvg(id) +
      '<span><b>' + ex.name + '</b><br><span class="small">' + ex.how + '</span><br>' +
      '<span class="ex-dose">' + ex.dose + '</span>' +
      (why.length ? '<br><span class="small muted">' + T('Per: {w}', { w: why.join(' · ') }) + '</span>' : '<br><span class="small muted">' + T('Esercizio di base') + '</span>') +
      (a ? '<br><a class="small ex-area pz-noprint" href="#/area/' + a.id + '">' + T('Dove applicare Equistasi: {z}', { z: esc(a.name) }) + ' ›</a>' : '') +
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
          '<div class="ex-list">' + ids.map((id) => exHtml(id, E[id], chosen.includes(id), whyOf(id))).join('') + '</div>' +
          '<details class="pz-noprint ex-more"><summary>' + T('Altri esercizi') + '</summary><div class="ex-list">' +
          Object.keys(E).filter((id) => !ids.includes(id)).map((id) => exHtml(id, E[id], chosen.includes(id), [])).join('') + '</div></details></div>' +
          '<div class="card"><h3>' + T('Come abbinarli a Equistasi') + '</h3><ol class="steps">' +
          '<li>' + T('Applica Equistasi come indicato nella mappa per la zona di ogni esercizio, oppure secondo il protocollo che usi con il paziente.') + '</li>' +
          '<li>' + T('Esegui gli esercizi con il dispositivo applicato, <b>1 volta al giorno, 5 giorni a settimana</b>, per 4 settimane.') + '</li>' +
          '<li>' + T('Movimenti lenti e senza dolore. Se compare dolore, interrompi.') + '</li>' +
          '<li>' + T('Dopo 4 settimane <b>ripeti le misure della postura</b> e confronta senza e con Equistasi.') + '</li></ol></div>' +
          '<div class="card pz-noprint"><h3>' + T('Scheda per il paziente') + '</h3>' +
          '<label class="gate-label" for="ex-name">' + T('Nome del paziente (facoltativo)') + '</label>' +
          '<input id="ex-name" class="search" autocomplete="off" value="' + esc(store.get('tp-prog-name', '')) + '" placeholder="' + esc(T('Es. Mario Rossi')) + '">' +
          '<p class="gate-msg" id="ex-msg" role="status"></p>' +
          '<div class="btn-col"><button class="btn primary" type="button" id="ex-pdf">' + T('PDF per il paziente: condividi') + '</button>' +
          '<button class="btn" type="button" id="ex-pdf-dl">' + T('Scarica il PDF') + '</button>' +
          '<a class="btn" href="#/postura/report">' + T('Report in PDF completo') + '</a></div></div>');
    if (none) return;
    app.querySelectorAll('[data-ex]').forEach((c) => c.addEventListener('change', () => {
      const sel = Array.from(app.querySelectorAll('[data-ex]:checked')).map((x) => x.dataset.ex);
      store.set(PROG, { t: Date.now(), ids: sel });
    }));
    const nameIn = document.getElementById('ex-name');
    nameIn.addEventListener('change', () => store.set('tp-prog-name', nameIn.value.trim()));
    const msg = document.getElementById('ex-msg');
    const go = async (dl) => {
      const btns = app.querySelectorAll('#ex-pdf, #ex-pdf-dl'); btns.forEach((b) => { b.disabled = true; });
      msg.className = 'gate-msg'; msg.textContent = T('Preparo il PDF…');
      try {
        const blob = await makePdf(nameIn.value.trim());
        const how = await window.EqReportPdf.deliver(blob, 'Equistasi-esercizi-' + new Date().toISOString().slice(0, 10) + '.pdf', dl, T('Programma di esercizi'));
        msg.className = 'ts-done'; msg.textContent = how === 'download' ? T('PDF scaricato: lo trovi nella cartella dei download.') : how === 'share' ? T('PDF pronto.') : '';
      } catch (e) {
        msg.className = 'gate-msg'; msg.textContent = T('Non è stato possibile creare il PDF. Riprova; se il problema continua, aggiorna l’app.');
      }
      btns.forEach((b) => { b.disabled = false; });
    };
    document.getElementById('ex-pdf').addEventListener('click', () => go(false));
    document.getElementById('ex-pdf-dl').addEventListener('click', () => go(true));
  }

  /* ───── Scheda PDF per il paziente: disegno, come si fa, quanto, zona di Equistasi ───── */
  async function makePdf(name) {
    const { jsPDF } = await window.EqReportPdf.load();
    const list = chosenIds();
    const E = EX();
    const figs = await Promise.all(list.map(figPng));
    const logo = await fetch('img/logo.png').then((r) => r.blob()).then((b) => new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ok(null); fr.readAsDataURL(b); })).catch(() => null);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 16, CW = W - 2 * M;
    const rgb = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const font = (size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
    const ink = (c) => doc.setTextColor(...rgb(c));
    const plain = (s) => String(s).replace(/<[^>]+>/g, '').replace(/[–—]/g, '-').replace(/[«»]/g, '"').replace(/’/g, "'");
    const today = dateStr(Date.now());
    let y = 0;
    const head = () => {
      if (logo) doc.addImage(logo, 'PNG', M, 10, 34, 34 * 107 / 471);
      font(9, false); ink('#5D6480'); doc.text(plain(T('Programma di esercizi')) + ' · ' + today, W - M, 15, { align: 'right' });
      y = 24;
    };
    head();
    doc.setFillColor(...rgb('#29235C')); doc.roundedRect(M, y, CW, 30, 4, 4, 'F');
    font(17, true); ink('#FFFFFF'); doc.text(plain(T('Programma di esercizi posturali con Equistasi')), M + 7, y + 11);
    font(10, false); ink('#D9D7EE');
    doc.text(plain(name ? T('Per: {n}', { n: name }) : T('Esercizi da fare a casa')), M + 7, y + 18.5);
    doc.text(plain(T('1 volta al giorno, 5 giorni a settimana, per 4 settimane, con Equistasi applicato.')), M + 7, y + 25);
    y += 38;
    list.forEach((id, i) => {
      const e = E[id];
      const area = window.AREAS && window.AREAS.find((x) => x.id === e.area);
      font(10, false);
      const how = doc.splitTextToSize(plain(e.how), CW - 58);
      const h = Math.max(36, 16 + how.length * 4.6 + (area ? 5 : 0));
      if (y + h > H - 24) { doc.addPage(); head(); }
      doc.setDrawColor(...rgb('#E1E5EF')); doc.setLineWidth(0.3); doc.roundedRect(M, y, CW, h, 3, 3, 'S');
      if (figs[i]) doc.addImage(figs[i], 'JPEG', M + 3, y + 3, 44, 33);
      const x = M + 52;
      font(12, true); ink('#29235C'); doc.text((i + 1) + '. ' + plain(e.name), x, y + 8);
      font(10, true); ink('#B26E00'); doc.text(plain(e.dose), x, y + 14);
      font(10, false); ink('#161A33'); doc.text(how, x, y + 20);
      if (area) { font(9, false); ink('#5D6480'); doc.text(plain(T('Dove applicare Equistasi: {z} (mappa dell’app)', { z: area.name })), x, y + 20 + how.length * 4.6 + 1.5); }
      y += h + 5;
    });
    if (y + 26 > H - 24) { doc.addPage(); head(); }
    font(10, true); ink('#29235C'); doc.text(plain(T('Regole')), M, y + 4);
    font(9.5, false); ink('#161A33');
    const rules = [T('Movimenti lenti e senza dolore. Se compare dolore, interrompi.'), T('Dopo 4 settimane <b>ripeti le misure della postura</b> e confronta senza e con Equistasi.')];
    let ry = y + 10;
    rules.forEach((r) => { const t = doc.splitTextToSize('• ' + plain(r), CW); doc.text(t, M, ry); ry += t.length * 4.4 + 1; });
    const tot = doc.getNumberOfPages();
    for (let n = 1; n <= tot; n++) {
      doc.setPage(n); font(7.5, false); ink('#5D6480');
      doc.text(doc.splitTextToSize(plain(DISCLAIMER()), CW - 20), M, H - 13);
      doc.text(n + ' / ' + tot, W - M, H - 13, { align: 'right' });
    }
    return doc.output('blob');
  }

  // esercizi scelti (o proposti, se il professionista non ha ancora cambiato nulla)
  function chosenIds() {
    const E = EX(); const saved = store.get(PROG, null);
    const ids = saved && saved.ids ? saved.ids : proposed(findings(readings()));
    return ids.filter((id) => E[id]);
  }
  // righe per il report PDF del professionista
  function reportGroup() {
    const E = EX(); const list = chosenIds().map((id) => E[id]);
    if (!list.length) return null;
    return { title: T('Programma di esercizi posturali'), rows: list.map((e) => ({ label: e.name, val: e.dose })) };
  }

  window.EqExercises = { render, reportGroup, makePdf, _findings: findings, _readings: readings, _poses: POSES };
})();
