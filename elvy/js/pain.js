/*
 * Elvy · Mappa dei trigger point per il dolore, come in Equistasi Point.
 * Usa gli stessi dati (../js/data.js: MUSCLES, AREAS, AREA_HITS, RED_FLAGS) e le stesse
 * tavole anatomiche (../img/anatomy) di Equistasi Point: un solo archivio per le due app.
 * Coordinate nel sistema di js/body.js (viewBox 0 0 200 432.6, metà sinistra del disegno;
 * vista frontale = lato destro della persona, vista posteriore = lato sinistro).
 */
(function () {
  const MUSCLES = window.MUSCLES || [];
  const AREAS = window.AREAS || [];
  const H = 432.6;
  const MIRROR = 'matrix(-1 0 0 1 200 0)';
  // tavole anatomiche nella cartella img/ accanto a js/ di Equistasi Point (come le librerie in vendor)
  const scanSrc = (document.querySelector('script[src*="scan.js"]') || {}).src || location.href;
  const ANAT = new URL('../img/anatomy/', new URL('./', scanSrc)).href;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } },
  };
  const state = { side: store.get('elvy-pain-side', 'dx'), view: store.get('elvy-pain-view', 'front'), zoom: true };
  const SIDE_LABEL = { dx: 'Lato destro', sx: 'Lato sinistro' };
  const VIEW_LABEL = { front: 'Davanti', back: 'Dietro', sole: 'Pianta' };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = (id) => MUSCLES.find((m) => m.id === id);
  const area = (id) => AREAS.find((a) => a.id === id);
  const hOf = (view) => (view === 'sole' ? 200 : H);
  const isMirrored = (view, side) => (view === 'back' ? side === 'dx' : side === 'sx');

  // sfumature delle zone di dolore (una sola volta nella pagina)
  const DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<pattern id="pn-dots" width="2.4" height="2.4" patternUnits="userSpaceOnUse"><rect width="2.4" height="2.4" fill="#2f7bff" fill-opacity=".28"/><circle cx="1.2" cy="1.2" r=".7" fill="#4a8dff"/></pattern>' +
    '<filter id="pn-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.3"/></filter>' +
    '<filter id="pn-softer" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".6"/></filter>' +
    '<radialGradient id="pn-solid"><stop offset="0" stop-color="#2f7bff" stop-opacity=".95"/><stop offset=".7" stop-color="#2468ff" stop-opacity=".8"/><stop offset="1" stop-color="#1e5bff" stop-opacity=".45"/></radialGradient>' +
    '</defs></svg>';

  const image = (view, id) => '<image href="' + ANAT + (id ? id + '-' + view : 'base-' + view) + '.webp" x="0" y="0" width="200" height="' + hOf(view) + '" preserveAspectRatio="none"/>';
  function ellipse(e, cls, extra) {
    const [cx, cy, rx, ry, rot] = e;
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"' + (rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '') + ' class="' + cls + '"' + (extra || '') + '/>';
  }
  // la X dove va il centro di Elvy
  function xMark(x, y, s, pulse) {
    const d = 'M' + (x - s) + ',' + (y - s) + ' L' + (x + s) + ',' + (y + s) + ' M' + (x + s) + ',' + (y - s) + ' L' + (x - s) + ',' + (y + s);
    return '<g class="pn-x">' + (pulse ? '<circle cx="' + x + '" cy="' + y + '" r="' + (s * 1.5) + '" class="pulse" stroke-width="' + (s * 0.18) + '"/>' : '') +
      '<path d="' + d + '" class="halo" stroke-width="' + (s * 0.95) + '"/><path d="' + d + '" class="mark" stroke-width="' + (s * 0.45) + '"/></g>';
  }
  // riquadro che contiene zone e X (per il dettaglio)
  function bbox(v, mirrored, minW, minH, pad, HH) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y, r) => { const xx = mirrored ? 200 - x : x; x0 = Math.min(x0, xx - r); x1 = Math.max(x1, xx + r); y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r); };
    (v.x || []).forEach(([x, y]) => add(x, y, 4));
    (v.zones || []).forEach((z) => {
      const [cx, cy, rx, ry, rot] = z.e;
      if (rot) add(cx, cy, Math.max(rx, ry)); else { add(cx - rx, cy, 0); add(cx + rx, cy, 0); add(cx, cy - ry, 0); add(cx, cy + ry, 0); }
    });
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0;
    if (w < minW) { x0 -= (minW - w) / 2; w = minW; }
    if (h < minH) { y0 -= (minH - h) / 2; h = minH; }
    if (w > 200) { x0 = 0; w = 200; }
    if (h > HH) { y0 = 0; h = HH; }
    x0 = Math.max(0, Math.min(x0, 200 - w)); y0 = Math.max(0, Math.min(y0, HH - h));
    return [x0, y0, w, h].map((n) => Math.round(n * 10) / 10).join(' ');
  }
  function figure(m, view, o) {
    const v = m.views[view]; const mirrored = isMirrored(view, state.side); const HH = hOf(view);
    const vb = o.zoom ? bbox(v, mirrored, o.minW || 90, Math.min(o.minH || 120, HH), o.pad || 16, HH) : '0 0 200 ' + HH;
    const sc = o.zoom ? 1 : 1.25;
    let ov = '';
    (v.zones || []).slice().sort((a, b) => a.p - b.p).forEach((z) => { ov += ellipse(z.e, 'pn-zone p' + z.p); });
    (v.x || []).forEach(([x, y]) => { ov += xMark(x, y, 2.6 * sc, !o.thumb); });
    return '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(m.name + ', vista ' + VIEW_LABEL[view].toLowerCase()) + '">' +
      '<g' + (mirrored ? ' transform="' + MIRROR + '"' : '') + '>' + image(view, m.id) + '<g>' + ov + '</g></g></svg>';
  }
  const viewsOf = (m) => Object.keys(m.views).sort((a, b) => (m.views[b].x ? 1 : 0) - (m.views[a].x ? 1 : 0));

  const sideToggle = () => '<div class="seg" role="group" aria-label="Lato del dolore">' +
    ['dx', 'sx'].map((s) => '<button type="button" data-side="' + s + '" aria-pressed="' + (state.side === s) + '">' + SIDE_LABEL[s] + '</button>').join('') + '</div>';
  const bindSide = (root, again) => root.querySelectorAll('[data-side]').forEach((b) => { b.onclick = () => { state.side = b.dataset.side; store.set('elvy-pain-side', state.side); again(); }; });

  function item(m, areaId) {
    const p = areaId ? m.areas[areaId] : null;
    const badge = p === 1 ? '<span class="pn-badge p1">Dolore tipico</span>' : p === 0 ? '<span class="pn-badge p0">Possibile</span>' : '';
    return '<a class="pn-item" href="#/dolore/m/' + m.id + '"><div class="pn-thumb">' + figure(m, viewsOf(m)[0], { zoom: true, thumb: true, minW: 70, minH: 86, pad: 8 }) + '</div>' +
      '<div>' + badge + '<b>' + esc(m.name) + '</b><span>' + esc(m.symptom) + '</span></div><span class="chev" aria-hidden="true">›</span></a>';
  }

  const NOTE = '<p class="note" style="margin-top:12px">Le mappe, le X e le zone di dolore sono <b>solo esempi indicativi</b> e non sostituiscono il parere del medico o del fisioterapista.</p>';

  /* ── Mappa del corpo: tocca dove senti dolore ── */
  function homeMap() {
    const view = state.view;
    const hits = (window.AREA_HITS || {})[view] || [];
    const shape = (h) => (h.p ? '<path d="' + h.p + '" class="pn-hit" data-area="' + h.a + '"/>' : ellipse(h.e, 'pn-hit', ' data-area="' + h.a + '"'));
    const center = (h) => {
      if (h.e) return [h.e[0], h.e[1]];
      const pts = h.p.match(/-?[\d.]+,-?[\d.]+/g).map((q) => q.split(',').map(Number));
      return [pts.reduce((x, q) => x + q[0], 0) / pts.length, pts.reduce((y, q) => y + q[1], 0) / pts.length];
    };
    const dot = (h) => { const [x, y] = center(h); return '<g class="pn-hot" data-area="' + h.a + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><circle class="ring" r="5.5"/><circle class="dot" r="2.6"/></g>'; };
    const tps = MUSCLES.map((m) => ((m.views[view] || {}).x || []).map(([x, y]) => '<circle class="pn-tp" data-muscle="' + m.id + '" cx="' + x + '" cy="' + y + '" r="1.9"><title>' + esc(m.name) + '</title></circle>').join('')).join('');
    // zone toccabili, poi i trigger point, poi i punti pulsanti (sopra a tutto); la metà destra è lo specchio
    let a = '';
    hits.forEach((h) => { a += shape(h); });
    a += tps;
    hits.forEach((h) => { a += dot(h); });
    return '<svg viewBox="0 6 200 404" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mappa del corpo, tocca dove senti dolore">' +
      image(view, null) + '<g>' + a + '</g><g transform="' + MIRROR + '">' + a + '</g></svg>';
  }

  function home(c) {
    const { $app } = c;
    c.setTab('guida');
    $app.innerHTML = DEFS + '<div class="head">' + c.backBtn() + '<div><div class="k">Elvy per il dolore</div><h1>Dove senti dolore?</h1></div></div>' +
      c.talk(c.IMG.point, 'Tocca il corpo dove senti dolore, oppure scegli la zona dall\'elenco. Ti mostro i muscoli che possono causarlo e la <b>X</b> dove applicare Elvy.', true) +
      '<div class="card pn-map-card" style="margin-top:14px"><div class="seg" role="group" aria-label="Vista">' +
      ['front', 'back'].map((v) => '<button type="button" data-view="' + v + '" aria-pressed="' + (state.view === v) + '">' + VIEW_LABEL[v] + '</button>').join('') + '</div>' +
      '<div class="pn-map" id="pn-map">' + homeMap() + '</div>' +
      '<p class="small muted">Tocca un <b style="color:var(--teal-l)">punto verde</b> sul lato in cui senti dolore. I <b>puntini piccoli</b> sono i trigger point: toccali per aprire il muscolo.</p>' + NOTE + '</div>' +
      '<h2 class="sec">Oppure scegli la zona</h2><div class="pn-chips">' +
      AREAS.map((x) => '<a class="pn-chip" href="#/dolore/area/' + x.id + '"><span aria-hidden="true">' + x.icon + '</span>' + esc(x.name) + '</a>').join('') + '</div>' +
      '<h2 class="sec">Cerca per muscolo o disturbo</h2><div class="card"><input class="pn-search" id="pn-q" type="search" placeholder="es. cefalea, torcicollo, sciatica, tallone…" autocomplete="off" />' +
      '<div id="pn-res" style="margin-top:10px"></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Trigger point e dolore riferito</h3><p class="small muted" style="margin-top:6px">Il <b style="color:#fff">trigger point</b> è un punto sensibile dentro un muscolo: premendolo puoi sentire il tuo dolore, lì o in un\'altra zona. La <b style="color:#8fb6ff">zona blu</b> è dove senti il dolore, ma spesso nasce altrove: per questo Elvy va sulla <b style="color:#fff">X</b>, non sulla zona blu.</p></div>';
    $app.querySelectorAll('[data-view]').forEach((b) => { b.onclick = () => { state.view = b.dataset.view; store.set('elvy-pain-view', state.view); home(c); }; });
    const svg = $app.querySelector('#pn-map svg');
    svg.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-muscle]') || ev.target.closest('[data-area]');
      if (!t) return;
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const left = p.x < 100;
      state.side = state.view === 'front' ? (left ? 'dx' : 'sx') : (left ? 'sx' : 'dx');
      store.set('elvy-pain-side', state.side);
      t.classList.add('on');
      setTimeout(() => { location.hash = t.dataset.muscle ? '#/dolore/m/' + t.dataset.muscle : '#/dolore/area/' + t.dataset.area; }, 120);
    });
    const q = $app.querySelector('#pn-q'); const res = $app.querySelector('#pn-res');
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    q.oninput = () => {
      const s = norm(q.value.trim());
      if (s.length < 2) { res.innerHTML = ''; return; }
      const found = MUSCLES.filter((m) => norm([m.name, m.latin, m.symptom, m.causes].join(' ')).includes(s));
      res.innerHTML = found.length ? found.map((m) => item(m)).join('') : '<p class="small muted">Nessun risultato. Prova con un\'altra parola o scegli la zona.</p>';
    };
    c.bindCommon();
  }

  /* ── Zona del dolore: elenco dei muscoli ── */
  function areaView(c, id) {
    const a = area(id);
    if (!a) return home(c);
    c.setTab('guida');
    const list = MUSCLES.filter((m) => id in m.areas).sort((x, y) => y.areas[id] - x.areas[id]);
    c.$app.innerHTML = DEFS + '<div class="head">' + c.backBtn() + '<div><div class="k">Dolore a</div><h1>' + esc(a.name) + '</h1></div></div>' +
      '<p class="small muted" style="margin:0 0 12px">Questi muscoli possono causare dolore in questa zona. Scegli quello la cui descrizione somiglia di più al tuo disturbo.</p>' +
      sideToggle() + '<div class="pn-list" style="margin-top:12px">' + list.map((m) => item(m, id)).join('') + '</div>' + NOTE;
    bindSide(c.$app, () => areaView(c, id));
    c.bindCommon();
  }

  /* ── Muscolo: dove applicare Elvy ── */
  const STEPS = [
    'Pulisci e asciuga bene la pelle nel punto indicato (niente creme, oli o sudore).',
    'Trova sul tuo corpo il punto della <b>X</b>: premendo con il polpastrello senti spesso un punto più dolente, a volte un piccolo nodulo, che riproduce il tuo dolore.',
    'Togli la pellicola centrale del cerotto trasparente e appoggia Elvy al centro, sulla parte adesiva.',
    'Applica cerotto ed Elvy sulla pelle, con il dispositivo a contatto della pelle e il <b>centro di Elvy sulla X</b>.',
    'Togli le linguette laterali e premi bene i bordi, senza pieghe.',
  ];
  function muscle(c, id) {
    const m = byId(id);
    if (!m) return home(c);
    c.setTab('guida');
    const views = viewsOf(m);
    const nX = views.reduce((n, v) => n + ((m.views[v].x || []).length), 0);
    const figs = views.map((v) => '<div class="pn-fig"><span class="lbl">' + VIEW_LABEL[v] + '</span>' + figure(m, v, { zoom: state.zoom }) + '<span class="side">' + SIDE_LABEL[state.side] + '</span></div>').join('');
    const areasTxt = Object.keys(m.areas).map((k) => (area(k) || {}).name).filter(Boolean).join(' · ');
    const legend = '<div class="pn-legend"><span><svg viewBox="-5 -5 10 10">' + xMark(0, 0, 3, false) + '</svg>Applica qui Elvy</span>' +
      '<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" class="pn-zone p1"/></svg>Dolore principale</span>' +
      '<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" class="pn-zone p0"/></svg>Dolore possibile</span>' +
      '<span><svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="2" fill="#d2433a"/></svg>Muscolo</span></div>';
    c.$app.innerHTML = DEFS + '<div class="head">' + c.backBtn() + '<div><div class="k">' + esc(areasTxt) + '</div><h1>' + esc(m.name) + '</h1><div class="small muted"><i>' + esc(m.latin) + '</i></div></div></div>' +
      '<div class="card" style="padding:12px"><div class="pn-tools">' + sideToggle() +
      '<div class="seg" role="group" aria-label="Zoom"><button type="button" data-zoom="1" aria-pressed="' + state.zoom + '">Dettaglio</button><button type="button" data-zoom="0" aria-pressed="' + !state.zoom + '">Corpo intero</button></div></div>' +
      '<div class="pn-figs' + (views.length > 1 ? ' two' : '') + '">' + figs + '</div>' + legend + '</div>' +
      (m.warning ? '<div class="warn" style="margin-top:12px"><b>Attenzione.</b> ' + esc(m.warning) + '</div>' : '') +
      '<div style="margin-top:14px">' + c.talk(c.IMG.point, 'Metti il <b>centro di Elvy</b> esattamente sulla <b>X</b>. La zona blu è dove senti il dolore: lì non serve metterlo.', true) + '</div>' +
      '<div class="card" style="margin-top:14px"><h3>Come applicare Elvy</h3><ol class="steps" style="margin-top:12px">' + STEPS.map((s) => '<li>' + s + '</li>').join('') + '</ol>' +
      (nX > 1 ? '<p class="small muted">Su questo muscolo ci sono <b style="color:#fff">' + nX + ' punti</b> tipici: scegli quello più dolente alla pressione, che riproduce meglio il tuo dolore.</p>' : '') +
      '<a class="small" href="#/guida">Guarda le illustrazioni e il video nella Guida ›</a></div>' +
      '<div class="card" style="margin-top:14px"><h3>Quanto tempo tenerlo</h3><p class="small muted" style="margin-top:6px">Al massimo <b style="color:#fff">4 ore al giorno</b>, per <b style="color:#fff">5 giorni</b> di seguito, poi 2 giorni di pausa. Il primo giorno bastano 1–2 ore.</p>' +
      '<div class="warn" style="margin-top:10px"><b>Toglilo prima se senti fastidio</b>, per esempio più dolore, nausea o un leggero mal di testa: vuol dire solo che per il tuo corpo è stato troppo a lungo, e passa in pochi minuti. Se il fastidio non passa, rivolgiti al medico o al farmacista.</div></div>' +
      '<div class="card" style="margin-top:14px"><h3>Come trovare il punto esatto</h3><p class="small muted" style="margin-top:6px">La X indica la posizione tipica del trigger point. Ogni corpo è diverso: esplora con le dita un\'area di 2–3 cm attorno alla X e scegli il punto più sensibile.</p>' +
      (m.tips ? '<p class="small muted" style="margin-top:8px"><b style="color:#fff">Consiglio:</b> ' + esc(m.tips) + '</p>' : '') + '</div>' +
      '<div class="card" style="margin-top:14px"><h3>Il dolore tipico</h3><p class="small muted" style="margin-top:6px">' + esc(m.symptom) + '</p>' +
      '<h3 style="margin-top:12px;font-size:16px">Cause frequenti</h3><p class="small muted" style="margin-top:6px">' + esc(m.causes) + '</p></div>' +
      '<div class="card" style="margin-top:14px"><h3>Quando rivolgersi al medico</h3><ul class="small muted pn-flags">' + (window.RED_FLAGS || []).map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></div>' +
      '<p class="note" style="margin-top:12px">Mappa basata su Travell, Simons &amp; Simons, <i>Myofascial Pain and Dysfunction: The Trigger Point Manual</i>. La posizione della X è indicativa.</p>' + NOTE;
    bindSide(c.$app, () => muscle(c, id));
    c.$app.querySelectorAll('[data-zoom]').forEach((b) => { b.onclick = () => { state.zoom = b.dataset.zoom === '1'; muscle(c, id); }; });
    c.bindCommon();
  }

  window.ElvyPain = { home, area: areaView, muscle, available: () => MUSCLES.length > 0 };
})();
