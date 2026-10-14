(function () {
  const app = document.getElementById('app');
  const btnBack = document.getElementById('btn-back');
  const MUSCLES = window.MUSCLES;
  const AREAS = window.AREAS;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } },
  };

  const state = {
    side: store.get('tp-side', 'dx'),          // 'dx' = destro, 'sx' = sinistro (della persona)
    homeView: store.get('tp-view', 'front'),
    zoom: true,
  };

  const SIDE_LABEL = { dx: 'destro', sx: 'sinistro' };
  const VIEW_LABEL = { front: 'Davanti', back: 'Dietro' };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byId = (id) => MUSCLES.find((m) => m.id === id);
  const area = (id) => AREAS.find((a) => a.id === id);

  /* La metà sinistra del disegno corrisponde al lato destro (vista frontale)
     o al lato sinistro (vista posteriore) della persona. */
  function isMirrored(view, side) {
    return view === 'front' ? side === 'sx' : side === 'dx';
  }

  function ellipse(e, cls) {
    const [cx, cy, rx, ry, rot] = e;
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '"' +
      (rot ? ' transform="rotate(' + rot + ' ' + cx + ' ' + cy + ')"' : '') + ' class="' + cls + '"/>';
  }

  function xMark(x, y, s, pulse) {
    return '<g class="tp">' +
      (pulse ? '<circle cx="' + x + '" cy="' + y + '" r="' + (s * 1.5) + '" class="pulse" stroke-width="' + (s * 0.18) + '"/>' : '') +
      '<path d="M' + (x - s) + ',' + (y - s) + ' L' + (x + s) + ',' + (y + s) + ' M' + (x + s) + ',' + (y - s) + ' L' + (x - s) + ',' + (y + s) + '" class="halo" stroke-width="' + (s * 0.95) + '"/>' +
      '<path d="M' + (x - s) + ',' + (y - s) + ' L' + (x + s) + ',' + (y + s) + ' M' + (x + s) + ',' + (y - s) + ' L' + (x - s) + ',' + (y + s) + '" class="mark" stroke-width="' + (s * 0.45) + '"/>' +
      '</g>';
  }

  /* Riquadro che contiene zone e trigger point (per lo zoom). */
  function bbox(v, mirrored, minW, minH, pad) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const add = (x, y, r) => {
      const xx = mirrored ? 200 - x : x;
      x0 = Math.min(x0, xx - r); x1 = Math.max(x1, xx + r);
      y0 = Math.min(y0, y - r); y1 = Math.max(y1, y + r);
    };
    (v.x || []).forEach(([x, y]) => add(x, y, 4));
    (v.zones || []).forEach((z) => {
      const [cx, cy, rx, ry, rot] = z.e;
      if (rot) { const r = Math.max(rx, ry); add(cx, cy, r); }
      else { add(cx - rx, cy, 0); add(cx + rx, cy, 0); add(cx, cy - ry, 0); add(cx, cy + ry, 0); }
    });
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    let w = x1 - x0, h = y1 - y0;
    if (w < minW) { x0 -= (minW - w) / 2; w = minW; }
    if (h < minH) { y0 -= (minH - h) / 2; h = minH; }
    // mantieni il riquadro dentro la figura
    if (w > 200) { x0 = 0; w = 200; }
    if (h > 440) { y0 = 0; h = 440; }
    x0 = Math.max(0, Math.min(x0, 200 - w));
    y0 = Math.max(0, Math.min(y0, 440 - h));
    return [x0, y0, w, h].map((n) => Math.round(n * 10) / 10).join(' ');
  }

  function figure(m, view, opts) {
    const v = m.views[view];
    const mirrored = isMirrored(view, state.side);
    const hasX = v.x && v.x.length;
    let vb = '0 0 200 440';
    if (opts.zoom) vb = bbox(v, mirrored, opts.minW || 90, opts.minH || 120, opts.pad || 16);
    const scale = opts.zoom ? 1 : 1.25;
    let overlay = '';
    (v.zones || []).slice().sort((a, b) => a.p - b.p).forEach((z) => { overlay += ellipse(z.e, 'zone p' + z.p); });
    (v.x || []).forEach(([x, y]) => { overlay += xMark(x, y, 2.6 * scale, !opts.thumb); });
    return '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      esc(m.name + ', vista ' + (view === 'front' ? 'frontale' : 'posteriore')) + '">' +
      window.Body.render(view, hasX ? m.hl : [], mirrored) +
      '<g' + (mirrored ? ' transform="' + window.Body.MIRROR + '"' : '') + '>' + overlay + '</g></svg>';
  }

  /* Vista con la X per prima. */
  function viewsOf(m) {
    return Object.keys(m.views).sort((a, b) => (m.views[b].x ? 1 : 0) - (m.views[a].x ? 1 : 0));
  }

  function sideToggle() {
    return '<div class="seg" role="group" aria-label="Lato del dolore">' +
      ['dx', 'sx'].map((s) => '<button data-side="' + s + '" aria-pressed="' + (state.side === s) + '">Lato ' + SIDE_LABEL[s] + '</button>').join('') +
      '</div>';
  }
  function bindSide(rerender) {
    app.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => {
      state.side = b.dataset.side; store.set('tp-side', state.side); rerender();
    }));
  }

  function item(m, areaId) {
    const v = viewsOf(m)[0];
    const p = areaId ? m.areas[areaId] : null;
    const badge = p === 1 ? '<span class="badge p1">Dolore tipico</span>' : p === 0 ? '<span class="badge p0">Possibile</span>' : '';
    return '<a class="m-item" href="#/m/' + m.id + '">' +
      '<div class="thumb">' + figure(m, v, { zoom: true, thumb: true, minW: 70, minH: 86, pad: 8 }) + '</div>' +
      '<div>' + badge + '<h3>' + esc(m.name) + '</h3><p>' + esc(m.symptom) + '</p></div>' +
      '<span class="chev" aria-hidden="true">›</span></a>';
  }

  /* ───────── HOME ───────── */
  function homeMap() {
    const view = state.homeView;
    const hits = window.AREA_HITS[view];
    const shape = (h, cls) => h.p ? '<path d="' + h.p + '" class="' + cls + '" data-area="' + h.a + '"/>' : ellipse(h.e, cls).replace('/>', ' data-area="' + h.a + '"/>');
    let a = '', b = '';
    hits.forEach((h) => { a += shape(h, 'hit'); b += shape(h, 'hit'); });
    return '<svg viewBox="0 4 200 428" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mappa del corpo, tocca dove senti dolore">' +
      window.Body.render(view, [], false) +
      '<g>' + a + '</g><g transform="' + window.Body.MIRROR + '">' + b + '</g></svg>';
  }

  function renderHome() {
    setBack(false);
    app.innerHTML =
      '<section class="hero"><div class="eyebrow">Mappa dei trigger point</div>' +
      '<h1>Dove senti dolore?</h1>' +
      '<p>Tocca la zona sul corpo o scegli dall’elenco: ti mostriamo dove applicare il dispositivo Equistasi.</p></section>' +
      '<div class="home-grid">' +
      '<div class="card map-card">' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Vista">' +
      ['front', 'back'].map((v) => '<button data-view="' + v + '" aria-pressed="' + (state.homeView === v) + '">' + VIEW_LABEL[v] + '</button>').join('') +
      '</div><span class="small muted">' + (state.homeView === 'front' ? 'Vista frontale' : 'Vista posteriore') + '</span></div>' +
      '<div class="map-figure" id="map">' + homeMap() + '</div>' +
      '<p class="map-hint">Tocca il lato del corpo in cui senti dolore</p></div>' +
      '<div>' +
      '<div class="card"><h3>Oppure scegli la zona</h3><div class="chips">' +
      AREAS.map((a) => '<a class="chip" href="#/area/' + a.id + '"><span class="ico" aria-hidden="true">' + a.icon + '</span>' + esc(a.name) + '</a>').join('') +
      '</div></div>' +
      '<div class="card"><h3>Cerca per muscolo o disturbo</h3>' +
      '<input class="search" id="q" type="search" placeholder="es. cefalea, torcicollo, sciatica, tallone…" autocomplete="off" />' +
      '<div class="list" id="results" style="margin-top:10px"></div></div>' +
      '<div class="card"><h3>Come funziona</h3><ol class="steps">' +
      '<li>Indica dove senti dolore.</li>' +
      '<li>Scegli il muscolo che descrive meglio il tuo disturbo.</li>' +
      '<li>Applica il dispositivo Equistasi sulla <b>X</b>: la zona <b style="color:var(--blue)">blu</b> è dove si irradia il dolore.</li>' +
      '</ol></div>' +
      '</div></div>';

    app.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      state.homeView = b.dataset.view; store.set('tp-view', state.homeView); renderHome();
    }));

    const svg = app.querySelector('#map svg');
    svg.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-area]');
      if (!t) return;
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const leftOfDrawing = p.x < 100;
      state.side = state.homeView === 'front' ? (leftOfDrawing ? 'dx' : 'sx') : (leftOfDrawing ? 'sx' : 'dx');
      store.set('tp-side', state.side);
      t.classList.add('on');
      setTimeout(() => { location.hash = '#/area/' + t.dataset.area; }, 120);
    });

    const q = app.querySelector('#q');
    const res = app.querySelector('#results');
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    q.addEventListener('input', () => {
      const s = norm(q.value.trim());
      if (s.length < 2) { res.innerHTML = ''; return; }
      const found = MUSCLES.filter((m) => norm([m.name, m.latin, m.symptom, m.causes].join(' ')).includes(s));
      res.innerHTML = found.length ? found.map((m) => item(m)).join('') : '<p class="muted small">Nessun risultato. Prova con un’altra parola o scegli la zona.</p>';
    });
  }

  /* ───────── AREA ───────── */
  function renderArea(id) {
    const a = area(id);
    if (!a) return renderHome();
    setBack(true);
    const list = MUSCLES.filter((m) => id in m.areas).sort((x, y) => y.areas[id] - x.areas[id]);
    app.innerHTML =
      '<div class="detail-head"><div class="eyebrow">Dolore a</div><h1>' + esc(a.name) + '</h1>' +
      '<p class="muted small" style="margin:4px 0 12px">Questi muscoli possono causare dolore in questa zona. Scegli quello la cui descrizione somiglia di più al tuo disturbo.</p></div>' +
      '<div class="toolbar">' + sideToggle() + '</div>' +
      '<div class="list">' + list.map((m) => item(m, id)).join('') + '</div>';
    bindSide(() => renderArea(id));
  }

  /* ───────── DETTAGLIO MUSCOLO ───────── */
  function legend() {
    return '<div class="legend">' +
      '<span><svg viewBox="-5 -5 10 10">' + xMark(0, 0, 3, false) + '</svg>Applica qui Equistasi</span>' +
      '<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" class="zone p1"/></svg>Dolore principale</span>' +
      '<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" class="zone p0"/></svg>Dolore possibile</span>' +
      '<span><svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="2" fill="#d2433a"/></svg>Muscolo</span>' +
      '</div>';
  }

  function renderMuscle(id) {
    const m = byId(id);
    if (!m) return renderHome();
    setBack(true);
    const views = viewsOf(m);
    const nX = views.reduce((n, v) => n + ((m.views[v].x || []).length), 0);
    const figs = views.map((v) =>
      '<div class="fig"><span class="fig-label">' + VIEW_LABEL[v] + '</span>' +
      figure(m, v, { zoom: state.zoom }) +
      '<span class="fig-side">Lato ' + SIDE_LABEL[state.side] + '</span></div>').join('');

    const areasTxt = Object.keys(m.areas).map((k) => area(k).name).join(' · ');

    app.innerHTML =
      '<div class="detail-head"><div class="eyebrow">' + esc(areasTxt) + '</div><h1>' + esc(m.name) + '</h1>' +
      '<p class="latin">' + esc(m.latin) + '</p></div>' +
      '<div class="detail-grid"><div class="sticky">' +
      '<div class="card" style="padding:12px">' +
      '<div class="toolbar">' + sideToggle() +
      '<div class="seg" role="group" aria-label="Zoom"><button data-zoom="1" aria-pressed="' + state.zoom + '">Dettaglio</button><button data-zoom="0" aria-pressed="' + !state.zoom + '">Corpo intero</button></div></div>' +
      '<div class="figures' + (views.length > 1 ? ' two' : '') + '">' + figs + '</div>' + legend() + '</div>' +
      '</div><div>' +
      (m.warning ? '<div class="card warn"><b>Attenzione.</b> ' + esc(m.warning) + '</div>' : '') +
      '<div class="card"><h3>Come applicare il dispositivo Equistasi</h3><ol class="steps">' +
      window.EQUISTASI.steps.map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
      (nX > 1 ? '<p class="small" style="margin:0 0 10px">Su questo muscolo ci sono <b>' + nX + ' punti</b> tipici: scegli quello più dolente alla pressione, che riproduce meglio il tuo dolore.</p>' : '') +
      '<div class="callout">' + esc(window.EQUISTASI.blue) + '</div></div>' +
      '<div class="card"><h3>Come trovare il punto esatto</h3><p class="small" style="margin:0">' + esc(window.EQUISTASI.find) + '</p>' +
      (m.tips ? '<p class="small" style="margin:8px 0 0"><b>Consiglio:</b> ' + esc(m.tips) + '</p>' : '') + '</div>' +
      '<div class="card"><h3>Il dolore tipico</h3><p class="small" style="margin:0 0 8px">' + esc(m.symptom) + '</p>' +
      '<h3 style="font-size:15px;margin-top:12px">Cause frequenti</h3><p class="small" style="margin:0">' + esc(m.causes) + '</p></div>' +
      '<div class="card"><h3>Quando rivolgersi al medico</h3><ul class="flags small">' +
      window.RED_FLAGS.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></div>' +
      '<p class="ref">Mappa basata su Travell, Simons & Simons, <i>Myofascial Pain and Dysfunction: The Trigger Point Manual</i>. La posizione della X è indicativa.</p>' +
      '</div></div>';

    bindSide(() => renderMuscle(id));
    app.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      state.zoom = b.dataset.zoom === '1'; renderMuscle(id);
    }));
  }

  /* ───────── INFO ───────── */
  function renderInfo() {
    setBack(true);
    app.innerHTML =
      '<div class="detail-head"><div class="eyebrow">Informazioni</div><h1>Come leggere la mappa</h1></div>' +
      '<div class="cols">' +
      '<div class="card"><h3>Cos’è un trigger point</h3><p class="small">Un trigger point miofasciale è un punto molto sensibile all’interno di un muscolo contratto. Spesso il dolore non si sente nel punto stesso, ma <b>a distanza</b>: è il cosiddetto <b>dolore riferito</b>. Per esempio un trigger point nel trapezio può dare mal di testa alla tempia.</p>' +
      '<p class="small" style="margin:0">Nella mappa la <b>X</b> indica il trigger point, cioè dove applicare il dispositivo Equistasi; le zone <b style="color:var(--blue)">blu</b> indicano dove si irradia il dolore.</p>' + legend() + '</div>' +
      '<div class="card"><h3>Avvertenze</h3><p class="small">Le informazioni hanno carattere generale e non sostituiscono la visita medica. Non applicare il dispositivo su pelle lesa, irritata o con ferite. Segui sempre il foglietto illustrativo e chiedi consiglio al farmacista, al medico o al fisioterapista.</p>' +
      '<ul class="flags small">' + window.RED_FLAGS.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></div>' +
      '<div class="card"><h3>Fonti scientifiche</h3><ul class="flags small">' +
      '<li>Simons DG, Travell JG, Simons LS. <i>Travell & Simons’ Myofascial Pain and Dysfunction: The Trigger Point Manual</i>, Vol. 1–2, 2ª ed. Williams & Wilkins, 1999.</li>' +
      '<li>Donnelly JM et al. <i>Travell, Simons & Simons’ Myofascial Pain and Dysfunction: The Trigger Point Manual</i>, 3ª ed. Wolters Kluwer, 2019.</li>' +
      '<li>Shah JP et al. Myofascial trigger points then and now: a historical and scientific perspective. <i>PM&R</i>, 2015;7(7):746–761.</li>' +
      '</ul></div>' +
      '<div class="card"><h3>Il tuo dispositivo</h3><p class="small">Numero di serie: <b>' + esc(store.get('tp-serial', '—')) + '</b></p>' +
      '<button class="btn" onclick="tpLogout()">Cambia dispositivo</button></div>' +
      '<div class="card"><h3>Installa l’app</h3><p class="small" style="margin:0">Su iPhone: tocca <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>. Su Android: menu ⋮ → <b>Installa app</b>. Funziona anche senza connessione.</p></div>' +
      '</div>';
  }

  /* ───────── Router ───────── */
  function setBack(on) { btnBack.hidden = !on; }
  btnBack.addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = '#/'; });

  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg] = h.split('/');
    if (page === 'area') renderArea(arg);
    else if (page === 'm') renderMuscle(arg);
    else if (page === 'info') renderInfo();
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);

  /* Avviso iniziale */
  const disc = document.getElementById('disclaimer');
  document.getElementById('disc-ok').addEventListener('click', () => { disc.hidden = true; store.set('tp-disclaimer', '1'); });

  function start() {
    route();
    if (store.get('tp-disclaimer', '') !== '1') disc.hidden = false;
  }

  /* ───────── Accesso con il numero di serie ───────── */
  const gate = document.getElementById('gate');
  const gateForm = document.getElementById('gate-form');
  const gateInput = document.getElementById('serial');
  const gateMsg = document.getElementById('gate-msg');
  const gateBtn = document.getElementById('gate-btn');

  const normSerial = (s) => s.toUpperCase().replace(/[^A-Z0-9-]/g, '');

  async function verifySerial(serial) {
    const url = (window.APP_CONFIG || {}).verifyUrl;
    if (!url) throw new Error('config');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'serial=' + encodeURIComponent(serial), { signal: ctrl.signal, cache: 'no-store' });
      const data = await r.json();
      return data && (data.valid === true || data.valid === 'true');
    } finally { clearTimeout(t); }
  }

  gateForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const serial = normSerial(gateInput.value);
    gateMsg.className = 'gate-msg';
    if (serial.length < 5) { gateMsg.textContent = 'Inserisci il numero di serie completo.'; gateInput.focus(); return; }
    gateBtn.disabled = true; gateBtn.textContent = 'Verifica in corso…'; gateMsg.textContent = '';
    try {
      if (await verifySerial(serial)) {
        store.set('tp-serial', serial);
        gateMsg.className = 'gate-msg ok'; gateMsg.textContent = 'Dispositivo riconosciuto. Benvenuto!';
        setTimeout(() => { gate.hidden = true; start(); }, 500);
      } else {
        gateMsg.textContent = 'Numero di serie non riconosciuto. Controlla di averlo scritto correttamente.';
      }
    } catch (e) {
      gateMsg.textContent = e.message === 'config'
        ? 'Servizio di verifica non configurato.'
        : 'Impossibile verificare ora. Controlla la connessione e riprova.';
    } finally {
      gateBtn.disabled = false; gateBtn.textContent = 'Accedi';
    }
  });

  window.tpLogout = function () {
    try { localStorage.removeItem('tp-serial'); } catch (e) { /* storage non disponibile */ }
    location.hash = '#/'; location.reload();
  };

  if (store.get('tp-serial', '')) start();
  else { gate.hidden = false; setTimeout(() => gateInput.focus(), 50); }

  /* Offline */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
