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
    devType: store.get('tp-devtype', 'silicone'),
  };

  const SIDE_LABEL = { dx: T('Lato destro'), sx: T('Lato sinistro') };
  const VIEW_LABEL = { front: T('Davanti'), back: T('Dietro'), sole: T('Pianta') };
  const VIEW_ARIA = { front: T('frontale'), back: T('posteriore'), sole: T('plantare') };

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const byId = (id) => MUSCLES.find((m) => m.id === id);
  const area = (id) => AREAS.find((a) => a.id === id);

  /* La metà sinistra del disegno corrisponde al lato destro (vista frontale e pianta del piede)
     o al lato sinistro (vista posteriore) della persona. */
  function isMirrored(view, side) {
    return view === 'back' ? side === 'dx' : side === 'sx';
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
  function bbox(v, mirrored, minW, minH, pad, HH) {
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
    if (h > HH) { y0 = 0; h = HH; }
    x0 = Math.max(0, Math.min(x0, 200 - w));
    y0 = Math.max(0, Math.min(y0, HH - h));
    return [x0, y0, w, h].map((n) => Math.round(n * 10) / 10).join(' ');
  }

  function figure(m, view, opts) {
    const v = m.views[view];
    const mirrored = isMirrored(view, state.side);
    const HH = window.Body.h(view);
    let vb = '0 0 200 ' + HH;
    if (opts.zoom) vb = bbox(v, mirrored, opts.minW || 90, Math.min(opts.minH || 120, HH), opts.pad || 16, HH);
    const scale = opts.zoom ? 1 : 1.25;
    let overlay = '';
    (v.zones || []).slice().sort((a, b) => a.p - b.p).forEach((z) => { overlay += ellipse(z.e, 'zone p' + z.p); });
    (v.x || []).forEach(([x, y]) => { overlay += xMark(x, y, 2.6 * scale, !opts.thumb); });
    return '<svg viewBox="' + vb + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' +
      esc(m.name + T(', vista ') + VIEW_ARIA[view]) + '">' +
      '<g' + (mirrored ? ' transform="' + window.Body.MIRROR + '"' : '') + '>' + window.Body.render(view, m.id) +
      '<g class="ov">' + overlay + '</g></g></svg>';
  }

  /* Vista con la X per prima. */
  function viewsOf(m) {
    return Object.keys(m.views).sort((a, b) => (m.views[b].x ? 1 : 0) - (m.views[a].x ? 1 : 0));
  }

  function sideToggle() {
    return '<div class="seg" role="group" aria-label="' + T('Lato del dolore') + '">' +
      ['dx', 'sx'].map((s) => '<button data-side="' + s + '" aria-pressed="' + (state.side === s) + '">' + SIDE_LABEL[s] + '</button>').join('') +
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
    const badge = p === 1 ? T('<span class="badge p1">Dolore tipico</span>') : p === 0 ? T('<span class="badge p0">Possibile</span>') : '';
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
    // punto pulsante al centro di ogni zona, per far capire che il corpo si può toccare
    const center = (h) => {
      if (h.e) return [h.e[0], h.e[1]];
      const pts = h.p.match(/-?[\d.]+,-?[\d.]+/g).map((q) => q.split(',').map(Number));
      return [pts.reduce((x, q) => x + q[0], 0) / pts.length, pts.reduce((y, q) => y + q[1], 0) / pts.length];
    };
    const dot = (h) => { const [x, y] = center(h); return '<g class="hot" data-area="' + h.a + '" transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><circle class="hot-ring" r="5.5"/><circle class="hot-dot" r="2.6"/></g>'; };
    // tutti i trigger point della vista: puntini piccoli, aprono la scheda del muscolo
    const tps = MUSCLES.map((m) => ((m.views[view] || {}).x || []).map(([x, y]) => '<circle class="tp-dot" data-muscle="' + m.id + '" cx="' + x + '" cy="' + y + '" r="1.9"><title>' + esc(m.name) + '</title></circle>').join('')).join('');
    let a = '', b = '', d = '';
    hits.forEach((h) => { a += shape(h, 'hit'); b += shape(h, 'hit'); d += dot(h); });
    a += tps + d; b += tps + d;
    return '<svg viewBox="0 6 200 404" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Mappa del corpo, tocca dove senti dolore">' +
      window.Body.render(view, null) +
      '<g>' + a + '</g><g transform="' + window.Body.MIRROR + '">' + b + '</g></svg>';
  }

  // Saluto in cima alla home, con il nome scelto nel profilo (resta solo sul telefono)
  const hello = () => {
    const h = new Date().getHours();
    const w = h >= 5 && h < 12 ? T('Buongiorno') : h >= 12 && h < 18 ? T('Buon pomeriggio') : T('Buonasera');
    const n = store.get('tp-name', '');
    return '<p class="hello">' + esc(w) + (n ? ', ' + esc(n) : '') + ' 👋</p>';
  };
  // Profilo attuale + pulsante grande "Cambia profilo"
  const SWAP_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const profileChip = () => T('<div class="profile-bar"><span class="profile-now"><span class="small">Il tuo profilo</span><b>') +
    (window.PROFILES[(getProfile() || {}).type] || {}).icon + ' ' + esc(profileName()) + '</b></span>' +
    '<a class="profile-switch" href="#/profilo">' + SWAP_ICON + T('Cambia profilo</a></div>');
  const EXAMPLE_NOTE = () => '<p class="example-note">' + T('ℹ️ Le mappe, le X e le zone di dolore sono <b>solo esempi indicativi</b> e <b>non sostituiscono il parere del medico</b> o del fisioterapista.') + '</p>';
  const SHOP = (window.APP_CONFIG && window.APP_CONFIG.shopUrl) || 'https://shop.equistasi.com';
  // Il dispositivo abbinato all'app (seriale letto o digitato all'attivazione)
  const deviceCard = () => {
    const sn = store.get('tp-serial', '');
    return '<div class="card dev-card"><div class="dev-mini" aria-hidden="true"><span class="dev-mini-win">✓</span><span class="dev-mini-sn">' + esc(sn || '—') + '</span><span class="dev-mini-ce">CE</span></div>' +
      '<div class="dev-card-txt"><h3>' + T('Il tuo dispositivo') + '</h3>' +
      '<p class="small">' + T('Numero di serie') + ': <b>' + esc(sn || '—') + '</b></p>' +
      (sn ? '<p class="small dev-ok">✓ ' + T('Abbinato all’app') + '</p>' : '') +
      '<button class="btn" onclick="tpLogout()">' + T('Cambia dispositivo') + '</button></div></div>';
  };
  const shopCard = '<a class="card shop-card" href="' + SHOP + '" target="_blank" rel="noopener"><span class="shop-ico" aria-hidden="true">🛒</span>' +
    T('<span class="shop-txt"><b>Shop</b><span class="small">shop.equistasi.com</span></span><span class="chev" aria-hidden="true">›</span></a>');
  const videoPromo = '<a class="card vpromo" href="#/video"><span class="vpromo-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="#fff"/></svg></span>' +
      T('<span><b>Video tutorial</b><br><span class="small muted">Guarda come applicare il dispositivo</span></span><span class="chev" aria-hidden="true">›</span></a>');

  // Come applicare, passo passo: dispositivo, cerotto applicatore, dispositivo sul cerotto, sulla pelle
  function applySteps(onMap) {
    const dev = state.devType === 'gel' ? 'img/gel-kit.jpg' : 'img/dispositivo.jpg';
    const step = (n, src, alt, txt) => '<li><figure><span class="ap-n">' + n + '</span><img src="' + src + '" alt="' + alt + '" loading="lazy" /></figure><p>' + txt + '</p></li>';
    return '<ol class="apply-steps">' +
      step(1, dev, T('Dispositivo Equistasi'), T('Prendi il <b>dispositivo</b> Equistasi')) +
      step(2, 'img/cerotto.jpg', T('Cerotto applicatore Equistasi'), T('Prendi il <b>cerotto applicatore</b>')) +
      step(3, 'img/cerotto-dispositivo.jpg', T('Dispositivo appoggiato al centro del cerotto'), T('Appoggia il dispositivo <b>al centro del cerotto</b>')) +
      step(4, 'img/applicazione.jpg', T('Dispositivo fissato sulla pelle con il cerotto'), (onMap ? T('Applicalo sulla pelle con il <b>centro del dispositivo sulla X</b>') : T('Applicalo sulla pelle <b>nel punto indicato</b>'))) +
      '</ol>';
  }

  // Foto delle custodie usa e getta, mostrate solo per Equistasi gel
  function gelPhotos() {
    if (state.devType !== 'gel') return '';
    return T('<div class="howto gel"><figure><img src="img/gel-custodie.jpg" alt="Dispositivi Equistasi gel inseriti nelle custodie usa e getta" loading="lazy" width="640" height="506" /><figcaption>Inserisci il dispositivo nella custodia usa e getta</figcaption></figure>') +
      T('<figure><img src="img/gel-busta.jpg" alt="Busta da 120 custodie di protezione per dispositivo Equistasi" loading="lazy" width="610" height="640" /><figcaption>Custodie di protezione (busta da 120 pezzi)</figcaption></figure></div>');
  }

  function renderNeuroHome() {
    const p = getProfile();
    const EQ = window.EQUISTASI;
    app.innerHTML =
      '<section class="hero">' + hello() + profileChip() + T('<div class="eyebrow">Il tuo percorso con Equistasi</div>') +
      '<h1><span class="hl">' + esc(profileName(p)) + '</span></h1>' +
      T('<p>Qui trovi i protocolli di applicazione e i video dedicati al tuo profilo. Segui sempre le indicazioni del tuo neurologo o fisioterapista.</p>') +
      '<button type="button" class="hero-cover neuro" id="to-protos" aria-label="Vai ai tuoi protocolli">' +
      '<img src="' + NEURO_IMG.hero + '" alt="" />' +
      T('<span class="hero-cover-cta">👆 Tocca qui: i tuoi protocolli</span></button></section>') +
      window.EqTimer.todayHtml() +
      T('<div class="home-grid"><div><div id="protos-anchor" class="protos-anchor"><h2 class="sec-title">I tuoi protocolli</h2>') + appProtocolCards() + protocolsCard(T('Protocolli in PDF')) + '</div>' + window.EqTimer.cardHtml() + window.EqPosture.cardHtml() + window.EqChair.cardHtml() + videoPromo + '</div><div>' +
      T('<div class="card"><h3>Il tuo percorso</h3><div class="howsteps">') +
      '<figure><img src="' + NEURO_IMG.s1 + T('" alt="" loading="lazy" /><figcaption><b>1</b> Segui il protocollo indicato dal tuo specialista</figcaption></figure>') +
      '<figure><img src="' + NEURO_IMG.s2 + T('" alt="" loading="lazy" /><figcaption><b>2</b> Applica Equistasi e avvia il promemoria</figcaption></figure>') +
      '<figure><img src="' + NEURO_IMG.s3 + T('" alt="" loading="lazy" /><figcaption><b>3</b> Muoviti come nelle tue attività di ogni giorno</figcaption></figure>') +
      '</div></div>' +
      T('<div class="card"><h3>Come applicare il dispositivo</h3>') +
      '<div class="device">' +
      T('<p>Posiziona il dispositivo nei punti indicati dal tuo protocollo.</p></div>') +
      applySteps() +
      T('<div class="toolbar"><span class="small"><b>Il tuo dispositivo è:</b></span><div class="seg" role="group" aria-label="Tipo di dispositivo">') +
      Object.keys(EQ.types).map((t) => '<button data-devtype="' + t + '" aria-pressed="' + (state.devType === t) + '">' + EQ.types[t] + '</button>').join('') +
      '</div></div>' + gelPhotos() + '<ol class="steps">' +
      [EQ.steps.start[0]].concat(EQ.steps[state.devType] || EQ.steps.silicone).map((x) => '<li>' + esc(x.replace(T('centrato esattamente sulla X'), T('nel punto indicato dal protocollo'))) + '</li>').join('') +
      '</ol></div>' +
      T('<div class="card"><h3>Quando rivolgersi al medico</h3><ul class="flags small">') + window.RED_FLAGS.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></div>' +
      shopCard + '</div></div>';
    app.querySelectorAll('[data-devtype]').forEach((b) => b.addEventListener('click', () => {
      state.devType = b.dataset.devtype; store.set('tp-devtype', state.devType); renderNeuroHome();
    }));
    app.querySelector('#to-protos').addEventListener('click', () => {
      const box = document.getElementById('protos-anchor');
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
    });
  }

  // Illustrazioni a fumetti per il profilo Dolore (colori Equistasi)
  const PAIN_IMG = {
    hero: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/e77275bf-76ac-4e4f-b24c-48fc3962e2fd.jpg',
    s1: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/0ab20398-5ee2-4373-8f6b-866450d81668.jpg',
    s2: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/477ccb81-969b-4ff2-b62d-35e87e87a0eb.jpg',
    s3: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/55a029ed-7d82-4865-b10c-d3ba3c6b8f47.jpg',
  };

  // Illustrazioni a fumetti per il profilo Neurologico (colori Equistasi)
  const NEURO_IMG = {
    hero: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/792f6e17-450d-4787-a2fb-29bcc60b5063.jpg',
    s1: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/1f8bc2eb-fc0a-444d-9874-95459881a835.jpg',
    s2: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/d9f1b7bf-5f11-47ea-8357-1b693a4e072c.jpg',
    s3: 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/78d40c3b-5e04-441a-b152-00ec81ad2bba.jpg',
  };

  function renderHome() {
    setBack(false);
    const prof = getProfile() || { type: 'dolore' };
    if (prof.type === 'neuro') return renderNeuroHome();
    const sport = prof.type === 'sport';
    app.innerHTML =
      '<section class="hero">' + hello() + profileChip() + '<div class="eyebrow">' + (sport ? T('Sport e performance') : T('Mappa dei trigger point')) + '</div>' +
      '<h1>' + (sport ? T('Contratture o <span class="hl">dolori muscolari</span>?') : T('Dove senti <span class="hl">dolore</span>?')) + '</h1>' +
      T('<p>Tocca la zona sul corpo o scegli dall’elenco: ti mostriamo dove applicare il dispositivo Equistasi.</p>') +
      '<button type="button" class="hero-cover" id="to-map" aria-label="Entra nella mappa del corpo">' +
      '<img src="' + (sport ? window.EqTests.IMG.hero : PAIN_IMG.hero) + '" alt="" />' +
      T('<span class="hero-cover-cta">👆 Tocca qui ed entra nella mappa</span></button>') + '</section>' +
      window.EqTimer.todayHtml() +
      (sport ? '' : T('<div class="card criteria"><h3>Puoi seguire due criteri</h3><div class="crit"><span class="crit-ico" aria-hidden="true">🎯</span><p><b>Il trigger point</b> è un punto particolarmente sensibile dentro un muscolo. Premendolo si può riprodurre il dolore che conosci, proprio lì oppure in un’altra zona.</p></div><div class="crit"><span class="crit-ico" aria-hidden="true">🦴</span><p><b>Il metamero</b> è come una mappa di collegamenti: alcune aree del corpo comunicano con lo stesso tratto del midollo spinale attraverso i nervi. Il fisioterapista considera questi collegamenti per valutare anche zone diverse da quella dolorosa.</p></div><div class="crit-btns"><button type="button" class="btn primary" id="use-tp">🎯 Usa i trigger point</button><a class="btn" href="#/metameri">🦴 Usa i metameri</a></div></div>')) +
      (sport ? window.EqTests.cardHtml() + window.EqPosture.cardHtml() + protocolsCard(T('I tuoi protocolli per lo sport')) : '') +
      '<div class="home-grid">' +
      '<div class="card map-card">' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Vista">' +
      ['front', 'back'].map((v) => '<button data-view="' + v + '" aria-pressed="' + (state.homeView === v) + '">' + VIEW_LABEL[v] + '</button>').join('') +
      '</div><span class="small muted">' + (state.homeView === 'front' ? T('Vista frontale') : T('Vista posteriore')) + '</span></div>' +
      T('<div class="map-tip" aria-hidden="true"><span class="map-tip-hand">👆</span> Tocca il corpo dove senti dolore</div>') +
      '<div class="map-figure" id="map">' + homeMap() + '</div>' +
      T('<p class="map-hint">Tocca un <b>punto giallo</b> sul lato in cui senti dolore: si aprono i <b>punti di applicazione</b> del dispositivo per quella zona. I <b>puntini piccoli</b> sono i trigger point: toccali per aprire il muscolo.</p>') + EXAMPLE_NOTE() + '</div>' +
      '<div>' + window.EqTimer.cardHtml() +
      T('<div class="card"><h3>Oppure scegli la zona</h3><div class="chips">') +
      AREAS.map((a) => '<a class="chip" href="#/area/' + a.id + '"><span class="ico" aria-hidden="true">' + a.icon + '</span>' + esc(a.name) + '</a>').join('') +
      '</div></div>' +
      T('<div class="card"><h3>Cerca per muscolo o disturbo</h3>') +
      '<input class="search" id="q" type="search" placeholder="es. cefalea, torcicollo, sciatica, tallone…" autocomplete="off" />' +
      '<div class="list" id="results" style="margin-top:10px"></div></div>' +
      appProtocolCards() + (sport ? '' : window.EqMeta.cardHtml() + window.EqPosture.cardHtml()) + videoPromo + (sport ? '' : protocolsCard(T('Protocolli per il dolore'))) +
      T('<div class="card"><h3>Come funziona</h3><div class="howsteps">') +
      '<figure><img src="' + PAIN_IMG.s1 + T('" alt="" loading="lazy" /><figcaption><b>1</b> Indica dove senti dolore</figcaption></figure>') +
      '<figure><img src="' + PAIN_IMG.s2 + T('" alt="" loading="lazy" /><figcaption><b>2</b> Tocca la zona e scegli il muscolo</figcaption></figure>') +
      '<figure><img src="' + PAIN_IMG.s3 + T('" alt="" loading="lazy" /><figcaption><b>3</b> Applica Equistasi sulla <b>X</b></figcaption></figure>') +
      T('</div><p class="small muted" style="margin:10px 0 0">La zona <b style="color:var(--blue)">blu</b> è dove si irradia il dolore: il dispositivo va sulla X.</p></div>') +
      shopCard + '</div></div>';

    app.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
      state.homeView = b.dataset.view; store.set('tp-view', state.homeView); renderHome();
    }));

    const goMap = () => {
      const card = app.querySelector('.map-card');
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
    };
    const useTp = app.querySelector('#use-tp');
    if (useTp) useTp.addEventListener('click', goMap);
    const toMap = app.querySelector('#to-map');
    if (toMap) toMap.addEventListener('click', () => {
      const card = app.querySelector('.map-card');
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash');
    });
    const svg = app.querySelector('#map svg');
    svg.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-muscle]') || ev.target.closest('[data-area]');
      if (!t) return;
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const leftOfDrawing = p.x < 100;
      state.side = state.homeView === 'front' ? (leftOfDrawing ? 'dx' : 'sx') : (leftOfDrawing ? 'sx' : 'dx');
      store.set('tp-side', state.side);
      t.classList.add('on');
      setTimeout(() => { location.hash = t.dataset.muscle ? '#/m/' + t.dataset.muscle : '#/area/' + t.dataset.area; }, 120);
    });

    const q = app.querySelector('#q');
    const res = app.querySelector('#results');
    const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    q.addEventListener('input', () => {
      const s = norm(q.value.trim());
      if (s.length < 2) { res.innerHTML = ''; return; }
      const found = MUSCLES.filter((m) => norm([m.name, m.latin, m.symptom, m.causes].join(' ')).includes(s));
      res.innerHTML = found.length ? found.map((m) => item(m)).join('') : T('<p class="muted small">Nessun risultato. Prova con un’altra parola o scegli la zona.</p>');
    });
  }

  /* ───────── AREA ───────── */
  function renderArea(id) {
    const a = area(id);
    if (!a) return renderHome();
    setBack(true);
    const list = MUSCLES.filter((m) => id in m.areas).sort((x, y) => y.areas[id] - x.areas[id]);
    app.innerHTML =
      T('<div class="detail-head"><div class="eyebrow">Dolore a</div><h1>') + esc(a.name) + '</h1>' +
      T('<p class="muted small" style="margin:4px 0 12px">Questi muscoli possono causare dolore in questa zona. Scegli quello la cui descrizione somiglia di più al tuo disturbo.</p>') + EXAMPLE_NOTE() + '</div>' +
      '<div class="toolbar">' + sideToggle() + '</div>' +
      '<div class="list">' + list.map((m) => item(m, id)).join('') + '</div>' + window.EqMeta.areaLink(id);
    bindSide(() => renderArea(id));
  }

  /* ───────── DETTAGLIO MUSCOLO ───────── */
  function legend() {
    return '<div class="legend">' +
      '<span><svg viewBox="-5 -5 10 10">' + xMark(0, 0, 3, false) + T('</svg>Applica qui Equistasi</span>') +
      T('<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" class="zone p1"/></svg>Dolore principale</span>') +
      T('<span><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.2" class="zone p0"/></svg>Dolore possibile</span>') +
      T('<span><svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" rx="2" fill="#d2433a"/></svg>Muscolo</span>') +
      '</div>';
  }

  function scheduleCard() {
    const sc = window.EQUISTASI.schedule;
    const week = sc.days.map((d, i) => {
      const on = i < sc.onDays;
      return '<div class="day' + (on ? ' on' : '') + '"><b>' + d + '</b><span>' + (on ? '2 + 2 h' : 'riposo') + '</span></div>';
    }).join('');
    return T('<div class="card"><h3>Quanto tempo tenerlo</h3>') +
      '<div class="sessions">' + sc.sessions.map((x) => '<div class="session"><span>' + esc(x.label) + '</span><b>' + esc(x.time) + '</b></div>').join('') + '</div>' +
      '<div class="week" aria-label="Settimana tipo">' + week + '</div>' +
      '<p class="small" style="margin:10px 0 12px">' + esc(sc.summary) + '</p>' +
      T('<div class="warn"><b>Toglilo prima se senti fastidio.</b> ') + esc(sc.removeEarly) + '<br><br>' + esc(sc.reassure) + ' ' + esc(sc.persist) + '</div></div>';
  }

  function renderMuscle(id) {
    const m = byId(id);
    const EQ = window.EQUISTASI;
    if (!m) return renderHome();
    setBack(true);
    const views = viewsOf(m);
    const nX = views.reduce((n, v) => n + ((m.views[v].x || []).length), 0);
    const figs = views.map((v) =>
      '<div class="fig"><span class="fig-label">' + VIEW_LABEL[v] + '</span>' +
      figure(m, v, { zoom: state.zoom }) +
      '<span class="fig-side">' + SIDE_LABEL[state.side] + '</span></div>').join('');

    const areasTxt = Object.keys(m.areas).map((k) => area(k).name).join(' · ');

    app.innerHTML =
      '<div class="detail-head"><div class="eyebrow">' + esc(areasTxt) + '</div><h1>' + esc(m.name) + '</h1>' +
      '<p class="latin">' + esc(m.latin) + '</p></div>' +
      '<div class="detail-grid"><div class="sticky">' +
      '<div class="card" style="padding:12px">' +
      '<div class="toolbar">' + sideToggle() +
      '<div class="seg" role="group" aria-label="Zoom"><button data-zoom="1" aria-pressed="' + state.zoom + T('">Dettaglio</button><button data-zoom="0" aria-pressed="') + !state.zoom + T('">Corpo intero</button></div></div>') +
      '<div class="figures' + (views.length > 1 ? ' two' : '') + '">' + figs + '</div>' + legend() + '</div>' +
      '<div class="card" id="mvideos" hidden></div>' +
      '</div><div>' +
      (m.warning ? T('<div class="card warn"><b>Attenzione.</b> ') + esc(m.warning) + '</div>' : '') +
      T('<div class="card"><h3>Come applicare il dispositivo Equistasi</h3>') +
      '<div class="device">' +
      T('<p>Il <b>centro del dispositivo</b> va posizionato esattamente sulla <b>X</b> della mappa.</p></div>') +
      applySteps(true) +
      T('<div class="toolbar"><span class="small"><b>Il tuo dispositivo è:</b></span><div class="seg" role="group" aria-label="Tipo di dispositivo">') +
      Object.keys(EQ.types).map((t) => '<button data-devtype="' + t + '" aria-pressed="' + (state.devType === t) + '">' + EQ.types[t] + '</button>').join('') +
      '</div></div>' + gelPhotos() + '<ol class="steps">' +
      [].concat(EQ.steps.start, EQ.steps[state.devType] || EQ.steps.silicone, EQ.steps.end).map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
      (nX > 1 ? T('<p class="small" style="margin:0 0 10px">Su questo muscolo ci sono <b>') + nX + T(' punti</b> tipici: scegli quello più dolente alla pressione, che riproduce meglio il tuo dolore.</p>') : '') +
      '<div class="callout">' + esc(window.EQUISTASI.blue) + '</div></div>' +
      window.EqTimer.cardHtml() + scheduleCard() +
      T('<div class="card"><h3>Come trovare il punto esatto</h3><p class="small" style="margin:0">') + esc(window.EQUISTASI.find) + '</p>' +
      (m.tips ? T('<p class="small" style="margin:8px 0 0"><b>Consiglio:</b> ') + esc(m.tips) + '</p>' : '') + '</div>' +
      T('<div class="card"><h3>Il dolore tipico</h3><p class="small" style="margin:0 0 8px">') + esc(m.symptom) + '</p>' +
      T('<h3 style="font-size:15px;margin-top:12px">Cause frequenti</h3><p class="small" style="margin:0">') + esc(m.causes) + '</p></div>' +
      T('<div class="card"><h3>Quando rivolgersi al medico</h3><ul class="flags small">') +
      window.RED_FLAGS.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></div>' +
      T('<p class="ref">Mappa basata su Travell, Simons & Simons, <i>Myofascial Pain and Dysfunction: The Trigger Point Manual</i>. La posizione della X è indicativa.</p>') + EXAMPLE_NOTE() +
      '</div></div>';

    bindSide(() => renderMuscle(id));
    fillMuscleVideos(m);
    app.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => {
      state.zoom = b.dataset.zoom === '1'; renderMuscle(id);
    }));
    app.querySelectorAll('[data-devtype]').forEach((b) => b.addEventListener('click', () => {
      state.devType = b.dataset.devtype; store.set('tp-devtype', state.devType);
      const y = window.scrollY; renderMuscle(id); window.scrollTo(0, y);
    }));
  }


  /* ───────── PROFILO UTENTE ───────── */
  function getProfile() {
    try { return JSON.parse(localStorage.getItem('tp-profile') || 'null'); } catch (e) { return null; }
  }
  function profileTags(p) {
    p = p || getProfile();
    if (!p || !window.PROFILES[p.type]) return null;
    const t = window.PROFILES[p.type].tags.slice();
    const pat = p.type === 'neuro' && window.PATOLOGIE[p.patologia];
    if (pat && pat.tag) t.push(pat.tag);
    return t;
  }
  function profileName(p) {
    p = p || getProfile();
    if (!p) return '';
    if (p.type === 'neuro' && window.PATOLOGIE[p.patologia]) return window.PATOLOGIE[p.patologia].label;
    return window.PROFILES[p.type] ? window.PROFILES[p.type].title : '';
  }
  /* Un contenuto è visibile se il suo campo "Profili app" contiene uno dei tag del profilo.
     Campo vuoto: video "general" e protocolli → tutti; video dei muscoli → dolore e sport. */
  function visibleFor(item, kind) {
    const tags = profileTags();
    if (!tags) return true;
    if (!item.profiles.length) {
      if (kind === 'video' && item.cat !== 'general') return tags.includes('Dolore') || tags.includes('Sport');
      return true;
    }
    return item.profiles.some((x) => tags.includes(x));
  }

  /* ───────── CONTENUTI: video tutorial e protocolli (Airtable via Make) ───────── */
  const CONTENT_KEY = 'tp-content-v4';
  const CONTENT_TTL = 15 * 60 * 1000; // nuovi video subito visibili; i link ai PDF di Airtable scadono dopo poche ore
  let contentPromise = null;

  const sel = (v) => (v && typeof v === 'object' ? v.name : v) || '';
  const list = (v) => (Array.isArray(v) ? v.map(sel) : v ? [sel(v)] : []);
  function normVideo(r) {
    const f = r.fields || {};
    const file = (f['Video File'] || [])[0];
    return {
      id: r.id,
      title: (f.Description || '').trim(),
      cat: sel(f.Category) || 'general',
      url: (f['Video URL'] || '').trim(),
      file: file ? file.url : '',
      thumb: f['Preview Image'] || (file && file.thumbnails && file.thumbnails.large ? file.thumbnails.large.url : ''),
      order: typeof f.Order === 'number' ? f.Order : 999,
      lang: sel(f.Language),
      muscles: String(f.Muscles || ''),
      profiles: list(f['Profili app']),
    };
  }
  function normProtocol(r) {
    const f = r.fields || {};
    const file = (f['PDF File'] || [])[0];
    return {
      id: r.id,
      title: (f.Title || f.ID || '').trim(),
      subtitle: (f.Subtitle || '').trim(),
      url: file ? file.url : '',
      lang: sel(f.Language),
      order: typeof f.Order === 'number' ? f.Order : 999,
      profiles: list(f['Profili app']),
    };
  }
  // «Nascosto» nel campo "Profili app" toglie il contenuto dall'app senza cancellarlo da Airtable
  const hidden = (x) => x.profiles.includes('Nascosto');
  const byOrder = (a, b) => a.order - b.order || a.title.localeCompare(b.title);
  /* Lingua dei contenuti (campo "Language" in Airtable: it / en).
     Video: in inglese si mostra la versione "en" con lo stesso numero "Order" al posto di quella italiana;
     i video senza versione inglese restano in italiano. Protocolli: in inglese quelli "en", se ce ne sono. */
  function forLang(c) {
    if (!c) return c;
    const en = window.LANG === 'en';
    const videos = c.videos.filter((v) => {
      if (v.lang === 'en') return en;
      return !en || !(v.order < 999 && c.videos.some((w) => w.lang === 'en' && w.order === v.order));
    });
    const enPros = c.protocols.filter((x) => x.lang === 'en');
    const protocols = en && enPros.length ? enPros : c.protocols.filter((x) => x.lang !== 'en');
    return { videos, protocols };
  }
  function loadContent() {
    if (contentPromise) return contentPromise;
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(CONTENT_KEY) || 'null'); } catch (e) { /* storage non disponibile */ }
    const url = (window.APP_CONFIG || {}).videosUrl;
    if (cached && Date.now() - cached.t < CONTENT_TTL) return (contentPromise = Promise.resolve(forLang(cached.c)));
    if (!url) return (contentPromise = Promise.resolve(forLang(cached ? cached.c : null)));
    contentPromise = fetch(url, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const vids = (d.videos || d).records || [];
        const pros = (d.protocols || {}).records || [];
        const c = {
          videos: vids.map(normVideo).filter((x) => (x.url || x.file) && !hidden(x)).sort(byOrder),
          protocols: pros.map(normProtocol).filter((x) => x.url && !hidden(x)).sort(byOrder),
        };
        // un elenco vuoto non si salva: alla prossima apertura si riprova
        if (c.videos.length || c.protocols.length) {
          try { localStorage.setItem(CONTENT_KEY, JSON.stringify({ t: Date.now(), c })); } catch (e) { /* storage non disponibile */ }
        }
        return forLang(c);
      })
      .catch(() => forLang(cached ? cached.c : null));
    return contentPromise;
  }
  const loadVideos = () => loadContent().then((c) => (c ? c.videos.filter((v) => visibleFor(v, 'video')) : null));
  // nella scheda di un muscolo (e aprendo un video) servono tutti i video, qualunque sia il profilo
  const loadAllVideos = () => loadContent().then((c) => (c ? c.videos : null));
  const loadProtocols = () => loadContent().then((c) => (c ? c.protocols.filter((x) => visibleFor(x, 'protocol')) : null));

  function protocolsCard(title) {
    setTimeout(() => {
      const box = document.getElementById('protos');
      if (!box) return;
      loadProtocols().then((ps) => {
        if (!document.getElementById('protos')) return;
        if (!ps) { box.innerHTML = T('<p class="muted small" style="margin:0">I protocolli non sono disponibili in questo momento. Controlla la connessione.</p>'); return; }
        if (!ps.length) { box.closest('.card').remove(); return; }
        box.innerHTML = ps.map((x) => '<a class="proto" href="#/pdf" data-pdf="' + esc(x.url) + '" data-title="' + esc(x.title) + T('"><span class="pdf" aria-hidden="true">PDF</span>') +
          '<span><b>' + esc(x.title) + '</b>' + (x.subtitle ? '<span class="small muted">' + esc(x.subtitle) + '</span>' : '') + '</span><span class="chev" aria-hidden="true">›</span></a>').join('');
      });
    }, 0);
    return '<div class="card"><h3>' + esc(title || T('I tuoi protocolli')) + T('</h3><div id="protos"><p class="muted small" style="margin:0">Caricamento…</p></div></div>');
  }

  const baseName = (t) => t.toLowerCase().replace(/^musculus\s+/, '').replace(/\s*\(?\d+\)?\s*$/, '').trim();
  function videosFor(m, list) {
    const keys = (m.videos || []).map((k) => k.toLowerCase());
    return list.filter((v) => keys.includes(baseName(v.title)) || v.muscles.split(/[\s,;]+/).includes(m.id));
  }
  function muscleOf(v) {
    return MUSCLES.find((m) => videosFor(m, [v]).length);
  }
  function embed(v) {
    const u = v.url;
    let m;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/))) {
      return '<iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + T('?rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" title="') + esc(v.title) + '"></iframe>';
    }
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) {
      return '<iframe src="https://player.vimeo.com/video/' + m[1] + T('" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="') + esc(v.title) + '"></iframe>';
    }
    if (/^https:\/\/(iframe|player)\.mediadelivery\.net\//.test(u)) {
      return '<iframe src="' + esc(u) + (u.includes('?') ? '&' : '?') + T('autoplay=false&preload=true&responsive=true" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" title="') + esc(v.title) + '"></iframe>';
    }
    const src = /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(u) ? u : v.file;
    if (src) return '<video src="' + esc(src) + T('" controls playsinline preload="metadata"') + (v.thumb ? ' poster="' + esc(v.thumb) + '"' : '') + '></video>';
    if (/^https:\/\//.test(u)) return '<iframe src="' + esc(u) + T('" allow="fullscreen" allowfullscreen loading="lazy" title="') + esc(v.title) + '"></iframe>';
    return T('<p class="muted small" style="padding:16px">Video non disponibile.</p>');
  }
  function vcard(v, label) {
    return '<a class="vcard" href="#/video/' + v.id + '"><div class="vthumb">' +
      (v.thumb ? '<img src="' + esc(v.thumb) + '" alt="" loading="lazy" onerror="this.remove()" onload="if(this.naturalHeight>this.naturalWidth)this.parentNode.classList.add(\'tall\')" />' : '') +
      '<span class="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5v14l11-7z" fill="#fff"/></svg></span></div>' +
      '<div class="vtitle">' + esc(label || v.title) + '</div></a>';
  }
  const VIDEO_OFF = T('<p class="muted small" style="margin:0">I video non sono disponibili in questo momento. Controlla la connessione e riprova.</p>');

  const tutCard = '<button type="button" class="card vpromo tut-open" data-tut><span class="vpromo-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M8 5v14l11-7z" fill="#fff"/></svg></span>' +
    T('<span><b>Come usare l’app</b><br><span class="small muted">Il video veloce con le cose fondamentali</span></span><span class="chev" aria-hidden="true">›</span>') + '</button>';
  document.addEventListener('click', (ev) => { if (ev.target.closest('[data-tut]') && window.EqTutorial) window.EqTutorial.show(); });
  function renderVideos() {
    setBack(true);
    app.innerHTML = T('<div class="detail-head"><div class="eyebrow">Impara a usare Equistasi</div><h1>Video <span class="hl">tutorial</span></h1>') +
      T('<p class="muted small" style="margin:4px 0 14px">Guarda come applicare il dispositivo e dove posizionarlo sui singoli muscoli.</p></div>') +
      T('<div id="vlist"><p class="muted small">Caricamento dei video…</p></div>');
    loadVideos().then((list) => {
      const box = document.getElementById('vlist');
      if (!box) return;
      if (!list) { box.innerHTML = '<div class="card">' + VIDEO_OFF + '</div>'; return; }
      const general = list.filter((v) => v.cat === 'general');
      const groups = new Map();
      list.filter((v) => v.cat !== 'general').forEach((v) => {
        const m = muscleOf(v);
        const k = m ? m.name : v.title.replace(/\s*\(?\d+\)?\s*$/, '');
        if (!groups.has(k)) groups.set(k, { m, items: [] });
        groups.get(k).items.push(v);
      });
      let h = '';
      h += tutCard;
      if (general.length) h += T('<div class="card"><h3>Guide all’applicazione</h3><div class="vgrid">') + general.map((v) => vcard(v)).join('') + '</div></div>';
      if (groups.size) {
        const keys = [...groups.keys()].sort((a, b) => (groups.get(b).m ? 1 : 0) - (groups.get(a).m ? 1 : 0) || a.localeCompare(b));
        h += T('<div class="card"><h3>Video per muscolo</h3>') + keys.map((k) => {
          const g = groups.get(k);
          return '<h4 class="vgroup">' + esc(k) + (g.m ? ' <a href="#/m/' + g.m.id + T('" class="small">mappa ›</a>') : '') + '</h4>' +
            '<div class="vgrid">' + g.items.map((v, i) => vcard(v, g.items.length > 1 ? 'Video ' + (i + 1) : T('Guarda il video'))).join('') + '</div>';
        }).join('') + '</div>';
      }
      box.innerHTML = h || T('<div class="card"><p class="muted small" style="margin:0">Non ci sono ancora video.</p></div>');
    });
  }

  function renderVideo(id) {
    setBack(true);
    app.innerHTML = T('<p class="muted small">Caricamento…</p>');
    loadAllVideos().then((list) => {
      const v = (list || []).find((x) => x.id === id);
      if (!v) { app.innerHTML = '<div class="card">' + VIDEO_OFF + '</div>'; return; }
      const m = muscleOf(v);
      app.innerHTML = T('<div class="detail-head"><div class="eyebrow">Video tutorial</div><h1>') + esc(m ? m.name : v.title) + '</h1>' +
        (m ? '<p class="latin">' + esc(v.title) + '</p>' : '<div style="height:12px"></div>') + '</div>' +
        '<div class="player portrait" id="player">' + embed(v) + '</div>' +
        (m ? '<a class="btn" style="margin-top:14px" href="#/m/' + m.id + T('">Vedi la mappa del trigger point ›</a>') : '') +
        T(' <a class="btn" style="margin-top:14px" href="#/video">Tutti i video</a>');
      fitPlayer(document.getElementById('player'), v);
    });
  }

  // I tutorial sono verticali: il riquadro parte in 9:16 e passa a 16:9
  // solo se l'anteprima (o il file video) risulta orizzontale.
  function fitPlayer(box, v) {
    if (!box) return;
    const set = (w, h) => { if (w && h) box.classList.toggle('portrait', h >= w); };
    const vid = box.querySelector('video');
    if (vid) vid.addEventListener('loadedmetadata', () => set(vid.videoWidth, vid.videoHeight));
    if (v.thumb) {
      const img = new Image();
      img.onload = () => set(img.naturalWidth, img.naturalHeight);
      img.src = v.thumb;
    }
  }

  function fillMuscleVideos(m) {
    const box = document.getElementById('mvideos');
    if (!box) return;
    loadAllVideos().then((list) => {
      const vs = list ? videosFor(m, list) : [];
      if (!vs.length || !document.getElementById('mvideos')) { box.remove(); return; }
      box.hidden = false;
      box.innerHTML = T('<h3>Video tutorial</h3><div class="vgrid">') + vs.map((v, i) => vcard(v, vs.length > 1 ? 'Video ' + (i + 1) : T('Guarda il video'))).join('') + '</div>';
    });
  }


  /* ───────── PROTOCOLLI ILLUSTRATI (definiti in data.js) ───────── */
  function appProtocols() {
    const t = (getProfile() || { type: 'dolore' }).type;
    return (window.APP_PROTOCOLS || []).filter((x) => x.profiles.includes(t));
  }
  function appProtocolCards() {
    return appProtocols().map((x) => '<a class="card pcard" href="#/protocollo/' + x.id + '">' +
      '<img src="' + esc(x.thumb || x.img) + '" alt="" loading="lazy" />' +
      T('<span><span class="eyebrow">Protocollo</span><b>') + esc(x.title) + '</b><span class="small muted">' + esc(x.subtitle) + '</span></span>' +
      '<span class="chev" aria-hidden="true">›</span></a>').join('');
  }
  function renderAppProtocol(id) {
    const x = (window.APP_PROTOCOLS || []).find((p) => p.id === id);
    if (!x) return renderHome();
    setBack(true);
    app.innerHTML = T('<div class="detail-head"><div class="eyebrow">Protocollo</div><h1>') + esc(x.title) + '</h1><p class="latin">' + esc(x.subtitle) + '</p></div>' +
      '<div class="detail-grid"><div class="sticky"><div class="card" style="padding:8px"><img class="pimg" data-zoom-img src="' + esc(x.img) + '" alt="' + esc(x.title + ': ' + x.subtitle) + '" />' +
      T('<p class="small muted" style="margin:6px 4px 0">Tocca l’immagine per ingrandirla.</p></div></div><div>') +
      T('<div class="card"><h3>Dove applicare</h3><p class="small">') + esc(x.intro) + '</p><ol class="steps">' +
      x.points.map(([h, t]) => '<li><b>' + esc(h) + '.</b> ' + esc(t) + '</li>').join('') + '</ol></div>' +
      T('<div class="card"><h3>Come applicare il dispositivo</h3>') + applySteps() +
      T('<p class="small" style="margin:0">Pulisci e asciuga la pelle, fissa ogni dispositivo con il cerotto in dotazione, a contatto con la pelle, sul punto indicato. Per tempi e frequenza segui il tuo protocollo o le indicazioni del professionista che ti segue.</p></div>') +
      T('<div class="card warn"><b>Toglilo prima se senti fastidio.</b> ') + esc(window.EQUISTASI.schedule.removeEarly) + ' ' + esc(window.EQUISTASI.schedule.reassure) + '</div>' +
      '</div></div>';
  }

  /* ───────── PRIVACY ───────── */
  function privacyHtml() {
    const P = window.PRIVACY;
    const url = (window.APP_CONFIG || {}).privacyUrl;
    return T('<p class="small"><b>Titolare del trattamento:</b> ') + esc(P.titolare) + T('<br><b>Contatto:</b> ') + esc(P.contatto) + '</p>' +
      P.sections.map(([h, t]) => '<h4>' + esc(h) + '</h4><p class="small" style="margin:0">' + esc(t) + '</p>').join('') +
      (url ? '<p class="small" style="margin-top:14px"><a href="' + esc(url) + T('" target="_blank" rel="noopener">Leggi l’informativa privacy completa ›</a></p>') : '') +
      T('<p class="small muted" style="margin-top:14px">Versione ') + esc(P.version) + '</p>';
  }
  function renderPrivacy() {
    setBack(true);
    const p = getProfile();
    app.innerHTML = T('<div class="detail-head"><div class="eyebrow">I tuoi dati</div><h1>Privacy</h1><div style="height:12px"></div></div>') +
      '<div class="cols">' +
      T('<div class="card"><h3>Le tue scelte</h3>') +
      T('<p class="small">Profilo: <b>') + esc(profileName(p) || '—') + T('</b><br>Condivisione dei dati con Equistasi: <b>') + (p && p.consent ? T('consenso dato') : T('non attiva')) + '</b></p>' +
      T('<div class="row-btns"><a class="btn" href="#/profilo">Cambia profilo o consenso</a> ') +
      T('<button class="btn" id="wipe" type="button">Cancella i miei dati da questo telefono</button></div>') +
      T('<p class="small muted" style="margin:10px 0 0">Per cancellare i dati già condivisi con Equistasi scrivi a ') + esc(window.PRIVACY.contatto) + T(' indicando il numero di serie.</p></div>') +
      T('<div class="card privacy-box" style="max-height:none"><h3>Informativa sintetica</h3>') + privacyHtml() + '</div>' +
      '</div>';
    document.getElementById('wipe').addEventListener('click', () => {
      if (!confirm(T('Vuoi cancellare numero di serie, profilo e preferenze da questo telefono?'))) return;
      try { localStorage.clear(); } catch (e) { /* storage non disponibile */ }
      location.hash = '#/'; location.reload();
    });
  }

  /* ───────── INFO ───────── */
  function renderInfo() {
    setBack(true);
    app.innerHTML =
      T('<div class="detail-head"><div class="eyebrow">Informazioni</div><h1>Come leggere la mappa</h1></div>') +
      deviceCard() + shopCard + '<div class="cols">' +
      T('<div class="card"><h3>Cos’è un trigger point</h3><p class="small">Un trigger point miofasciale è un punto molto sensibile all’interno di un muscolo contratto. Spesso il dolore non si sente nel punto stesso, ma <b>a distanza</b>: è il cosiddetto <b>dolore riferito</b>. Per esempio un trigger point nel trapezio può dare mal di testa alla tempia.</p>') +
      T('<p class="small" style="margin:0">Nella mappa la <b>X</b> indica il trigger point, cioè dove applicare il dispositivo Equistasi; le zone <b style="color:var(--blue)">blu</b> indicano dove si irradia il dolore.</p>') + legend() + '</div>' +
      T('<div class="card"><h3>Avvertenze</h3><p class="small">Le informazioni hanno carattere generale e non sostituiscono la visita medica. Non applicare il dispositivo su pelle lesa, irritata o con ferite. Segui sempre il foglietto illustrativo e chiedi consiglio al farmacista, al medico o al fisioterapista.</p>') +
      '<ul class="flags small">' + window.RED_FLAGS.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ul></div>' +
      T('<div class="card"><h3>Fonti scientifiche</h3><ul class="flags small">') +
      T('<li>Simons DG, Travell JG, Simons LS. <i>Travell & Simons’ Myofascial Pain and Dysfunction: The Trigger Point Manual</i>, Vol. 1–2, 2ª ed. Williams & Wilkins, 1999.</li>') +
      T('<li>Donnelly JM et al. <i>Travell, Simons & Simons’ Myofascial Pain and Dysfunction: The Trigger Point Manual</i>, 3ª ed. Wolters Kluwer, 2019.</li>') +
      T('<li>Shah JP et al. Myofascial trigger points then and now: a historical and scientific perspective. <i>PM&R</i>, 2015;7(7):746–761.</li>') +
      '</ul></div>' +
      T('<div class="card"><h3>Tavole anatomiche</h3><p class="small" style="margin:0">Immagini 3D realizzate dal modello Z-Anatomy – The libre 3D atlas of anatomy (CC BY-SA 4.0), basato su BodyParts3D – The Database Center for Life Science (CC BY-SA 2.1 Japan). Le tavole sono distribuite con licenza CC BY-SA 4.0.</p></div>') +
      T('<div class="card"><h3>Il tuo profilo</h3><p class="small">') + (store.get('tp-name', '') ? '<b>' + esc(store.get('tp-name', '')) + '</b> · ' : '') + esc(profileName() || '—') + T('</p><a class="btn" href="#/profilo">Cambia profilo</a> <a class="btn" href="#/privacy">Privacy</a></div>') +
      '<div class="card"><h3>Lingua · Language</h3><div class="lang-switch" role="group" aria-label="Lingua"><button type="button" data-lang="it" aria-pressed="' + (window.LANG === 'it') + '">Italiano</button><button type="button" data-lang="en" aria-pressed="' + (window.LANG === 'en') + '">English</button></div></div>' +
      T('<div class="card"><h3>Installa l’app</h3><p class="small" style="margin:0">Su iPhone: tocca <b>Condividi</b> → <b>Aggiungi alla schermata Home</b>. Su Android: menu ⋮ → <b>Installa app</b>. Funziona anche senza connessione.</p></div>') +
      '</div>';
  }

  function renderTimer() {
    setBack(true);
    app.innerHTML = T('<div class="detail-head"><div class="eyebrow">Promemoria</div><h1>Quanto tempo <span class="hl">tenerlo</span></h1></div>') +
      '<div class="home-grid"><div>' + window.EqTimer.cardHtml() + '</div><div>' + scheduleCard() + '</div></div>';
  }

  /* ───────── Visore PDF dentro l'app (così non si esce dall'app) ───────── */
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('[data-pdf]');
    if (!a) return;
    try { sessionStorage.setItem('tp-pdf', JSON.stringify({ url: a.dataset.pdf, title: a.dataset.title || T('Protocollo') })); } catch (e) { /* storage non disponibile */ }
  });
  let pdfjsPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
    pdfjsPromise = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = base + 'pdf.min.js';
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; resolve(window.pdfjsLib); };
      sc.onerror = () => { pdfjsPromise = null; reject(new Error('pdf.js')); };
      document.head.appendChild(sc);
    });
    return pdfjsPromise;
  }
  function renderPdf() {
    setBack(true);
    let doc = null;
    try { doc = JSON.parse(sessionStorage.getItem('tp-pdf') || 'null'); } catch (e) { doc = null; }
    if (!doc || !doc.url) { location.hash = '#/'; return; }
    app.innerHTML = T('<div class="detail-head"><div class="eyebrow">Protocollo</div><h1>') + esc(doc.title) + '</h1></div>' +
      T('<div class="row-btns" style="margin:0 0 12px"><button class="btn primary pdf-back" type="button" style="width:auto">‹ Torna indietro</button></div>') +
      T('<div class="pdf-pages" id="pdf-pages"><p class="muted small">Caricamento del protocollo…</p></div>') +
      T('<p class="small muted" style="margin-top:12px">Non si vede bene? <a href="') + esc(doc.url) + T('" target="_blank" rel="noopener">Apri il PDF a parte</a> (poi torna all’app).</p>');
    app.querySelector('.pdf-back').addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = '#/'; });
    const box = document.getElementById('pdf-pages');
    loadPdfJs()
      .then((lib) => lib.getDocument({ url: doc.url }).promise)
      .then(async (pdf) => {
        if (!document.getElementById('pdf-pages')) return;
        box.innerHTML = '';
        const width = Math.min(box.clientWidth || 360, 900);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const vp1 = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: (width / vp1.width) * ratio });
          const c = document.createElement('canvas');
          c.width = vp.width; c.height = vp.height; c.className = 'pdf-page';
          box.appendChild(c);
          await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        }
      })
      .catch(() => {
        // se il PDF non si può leggere qui, lo mostriamo nel riquadro del browser
        box.innerHTML = '<iframe class="pdf-frame" src="' + esc(doc.url) + '" title="' + esc(doc.title) + '"></iframe>';
      });
  }

  /* Ingrandimento immagini dentro l'app */
  document.addEventListener('click', (ev) => {
    const img = ev.target.closest('[data-zoom-img]');
    if (!img) return;
    const ov = document.createElement('div');
    ov.className = 'zoom-ov';
    ov.innerHTML = T('<button class="btn primary zoom-close" type="button">✕ Chiudi</button><img src="') + img.getAttribute('src') + '" alt="" />';
    ov.addEventListener('click', (e) => { if (e.target.closest('.zoom-close') || e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  });

  /* ───────── Router ───────── */
  function setBack(on) { btnBack.hidden = !on; }
  btnBack.addEventListener('click', () => { if (history.length > 1) history.back(); else location.hash = '#/'; });

  // Barra in basso: la quarta voce è "Progressi" per lo sport, "Info" per gli altri profili
  const PROGRESS_ICON = '<svg viewBox="0 0 24 24"><path d="M4 19h16M6 15l4-4 3 3 5-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const INFO_ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="7.6" r="1.3" fill="currentColor"/></svg>';
  function updateTabs(page) {
    const extra = document.getElementById('tab-extra');
    if (!extra) return;
    const sport = (getProfile() || {}).type === 'sport';
    extra.href = sport ? '#/test' : '#/info';
    extra.innerHTML = '<span class="tb-ic">' + (sport ? PROGRESS_ICON : INFO_ICON) + '</span>' + (sport ? T('Progressi') : T('Info'));
    const homeTab = document.querySelector('#tabbar [data-tab="home"]');
    if (homeTab) homeTab.lastChild.textContent = (getProfile() || {}).type === 'neuro' ? T('Home') : T('Mappa');
    const cur = { '': 'home', area: 'home', m: 'home', protocollo: 'home', metameri: 'home', postura: 'home', promemoria: 'promemoria', video: 'video', test: 'extra', info: 'extra' }[page || ''];
    document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === cur));
  }

  function route() {
    const ab = document.getElementById('acct-btn');
    if (ab) {
      ab.hidden = !getProfile();
      const sn = store.get('tp-serial', '');
      document.getElementById('acct-sn').textContent = sn ? 'N° ' + sn : T('Abbina dispositivo');
      ab.setAttribute('aria-label', T('Dispositivo abbinato') + (sn ? ' ' + sn : '') + ' · ' + T('Profilo e dispositivo'));
    }
    const h = location.hash.replace(/^#\/?/, '');
    const [page, arg, arg2, arg3] = h.split('/');
    if (page === 'area') renderArea(arg);
    else if (page === 'm') renderMuscle(arg);
    else if (page === 'info') renderInfo();
    else if (page === 'video') { if (arg) renderVideo(arg); else renderVideos(); }
    else if (page === 'privacy') renderPrivacy();
    else if (page === 'protocollo') renderAppProtocol(arg);
    else if (page === 'metameri') { setBack(true); window.EqMeta.render(app, arg); }
    else if (page === 'promemoria') renderTimer();
    else if (page === 'pdf') renderPdf();
    else if (page === 'test') { setBack(true); window.EqTests.render(app, arg); }
    else if (page === 'postura') { setBack(true); window.EqPosture.render(app, arg, arg2, arg3); }
    else if (page === 'sedia' || page === 'beta') { setBack(true); window.EqChair.render(app, page === 'beta' ? 'beta' : arg); }
    else if (page === 'profilo') { showOnboarding(true); return; }
    else renderHome();
    // passaggio animato tra le pagine: avanti (scheda più interna) da destra, indietro da sinistra
    const depth = h.split('/').filter(Boolean).length;
    app.classList.remove('pg-fwd', 'pg-back');
    void app.offsetWidth;
    app.classList.add(depth >= lastDepth ? 'pg-fwd' : 'pg-back');
    lastDepth = depth;
    updateTabs(page);
    window.translateStatic(app); // aria-label e testi alternativi in inglese
    window.scrollTo(0, 0);
  }
  let lastDepth = 0;
  window.addEventListener('hashchange', route);
  // Vibrazione leggera al tocco. Android: navigator.vibrate. iPhone (iOS 18): Safari non ha vibrate,
  // ma toccare un interruttore <input switch> produce un piccolo colpo: ne usiamo uno nascosto.
  function haptic(ms) {
    if (navigator.vibrate) { navigator.vibrate(ms); return; }
    // iPhone: un interruttore creato e "toccato" al momento, poi rimosso (stesso metodo della libreria ios-haptics)
    try {
      const label = document.createElement('label');
      label.ariaHidden = 'true';
      label.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      label.appendChild(input);
      document.head.appendChild(label);
      label.click();
      document.head.removeChild(label);
    } catch (e) { /* nessuna vibrazione disponibile */ }
  }
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('.hot, .tp-dot, [data-area], [data-muscle]')) haptic(15); // punti sul corpo: un po' più deciso
    else if (ev.target.closest('.tabbar a, .m-item, .btn')) haptic(8);
  });

  /* Avviso iniziale */
  const disc = document.getElementById('disclaimer');
  document.getElementById('disc-ok').addEventListener('click', () => { disc.hidden = true; store.set('tp-disclaimer', '1'); });

  function start() {
    if (!getProfile()) { showOnboarding(false); return; }
    route();
    if (store.get('tp-disclaimer', '') !== '1') disc.hidden = false;
  }

  /* ───────── Informativa privacy (finestra) ───────── */
  const pModal = document.getElementById('privacy-modal');
  document.getElementById('pm-close').addEventListener('click', () => { pModal.hidden = true; });
  document.addEventListener('click', (ev) => {
    if (!ev.target.closest('[data-privacy]')) return;
    ev.preventDefault();
    document.getElementById('pm-body').innerHTML = privacyHtml();
    pModal.hidden = false;
  });

  /* ───────── Profilazione ───────── */
  const ob = document.getElementById('onboard');
  const obForm = document.getElementById('ob-form');
  const obMsg = document.getElementById('ob-msg');
  const obNeuro = document.getElementById('ob-neuro');
  const ob$ = { type: null, patologia: null };

  document.getElementById('ob-eta').insertAdjacentHTML('beforeend', window.ETA.map((e) => '<option value="' + esc(e) + '">' + esc((window.ETA_EN && window.ETA_EN[e]) || e) + '</option>').join(''));
  document.getElementById('ob-opts').innerHTML = Object.entries(window.PROFILES).map(([k, p]) =>
    '<button type="button" class="ob-opt" role="radio" aria-checked="false" data-type="' + k + '"><span class="ico" aria-hidden="true">' + p.icon + '</span>' +
    '<span><b>' + esc(p.title) + '</b><span>' + esc(p.desc) + '</span></span></button>').join('');
  document.getElementById('ob-pato').innerHTML = Object.entries(window.PATOLOGIE).map(([k, p]) =>
    '<button type="button" class="ob-pill" role="radio" aria-checked="false" data-pato="' + k + '">' + esc(p.label) + '</button>').join('');
  // il sotto-menu delle patologie si apre subito sotto "Patologia neurologica"
  const neuroBtn = document.querySelector('#ob-opts [data-type="neuro"]');
  if (neuroBtn) {
    neuroBtn.classList.add('has-sub');
    neuroBtn.insertAdjacentHTML('beforeend', '<span class="ob-caret" aria-hidden="true">▾</span>');
    neuroBtn.after(obNeuro);
    obNeuro.classList.add('ob-sub');
  }

  function obSync() {
    obForm.querySelectorAll('[data-type]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.type === ob$.type)));
    obForm.querySelectorAll('[data-pato]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.pato === ob$.patologia)));
    obNeuro.hidden = ob$.type !== 'neuro';
  }
  obForm.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-type]');
    const pt = ev.target.closest('[data-pato]');
    if (t) ob$.type = t.dataset.type;
    if (pt) ob$.patologia = pt.dataset.pato;
    if (t || pt) { obMsg.textContent = ''; obSync(); obAutoEnter(); }
    if (t && t.dataset.type === 'neuro') setTimeout(() => obNeuro.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  });

  function showOnboarding(editing) {
    const p = getProfile();
    ob$.type = p ? p.type : null;
    ob$.patologia = p ? p.patologia || null : null;
    document.getElementById('ob-eta').value = (p && p.eta) || '';
    document.getElementById('ob-name').value = store.get('tp-name', '');
    document.getElementById('ob-read').checked = !!p;
    document.getElementById('ob-consent').checked = !!(p && p.consent);
    document.getElementById('ob-cancel').hidden = !(editing && p);
    obMsg.textContent = '';
    obSync();
    ob.hidden = false;
    ob.scrollTop = 0;
  }

  obForm.addEventListener('change', (ev) => {
    obMsg.textContent = '';
    if (ev.target.id !== 'ob-read' || !ev.target.checked) return;
    if (!ob$.type) { obMsg.textContent = T('Scegli prima per cosa usi Equistasi.'); return; }
    if (ob$.type === 'neuro' && !ob$.patologia) { obMsg.textContent = T('Scegli prima la patologia.'); return; }
    obAutoEnter();
  });
  // con le condizioni accettate e il profilo scelto si entra subito, senza premere "Continua"
  let obTimer = null;
  function obAutoEnter() {
    if (!document.getElementById('ob-read').checked || !ob$.type || (ob$.type === 'neuro' && !ob$.patologia)) return;
    clearTimeout(obTimer);
    obTimer = setTimeout(() => obForm.requestSubmit(), 350);
  }
  document.getElementById('ob-cancel').addEventListener('click', () => {
    ob.hidden = true;
    if (location.hash === '#/profilo') history.length > 1 ? history.back() : (location.hash = '#/');
  });

  function sendProfile(p) {
    const url = (window.APP_CONFIG || {}).profileUrl;
    if (!url || !p.consent) return;
    const pat = p.type === 'neuro' && window.PATOLOGIE[p.patologia];
    const body = new URLSearchParams({
      serial: store.get('tp-serial', ''),
      profilo: { dolore: 'Dolore', neuro: 'Neurologico', sport: 'Sport' }[p.type],
      patologia: pat ? pat.label : '',
      eta: p.eta || '',
      consenso: '1',
      versione: window.PRIVACY.version,
    });
    // richiesta "semplice" senza lettura della risposta: nessun dato torna indietro all'app
    fetch(url, { method: 'POST', mode: 'no-cors', body }).catch(() => {});
  }

  obForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (!ob$.type) { obMsg.textContent = T('Scegli per cosa usi Equistasi.'); return; }
    if (ob$.type === 'neuro' && !ob$.patologia) { obMsg.textContent = T('Indica la patologia.'); return; }
    if (!document.getElementById('ob-read').checked) { obMsg.textContent = T('Conferma di aver letto l’informativa privacy.'); return; }
    const prev = getProfile();
    const p = {
      type: ob$.type,
      patologia: ob$.type === 'neuro' ? ob$.patologia : null,
      eta: document.getElementById('ob-eta').value,
      consent: document.getElementById('ob-consent').checked,
      version: window.PRIVACY.version,
      ts: new Date().toISOString(),
    };
    store.set('tp-profile', JSON.stringify(p));
    store.set('tp-name', document.getElementById('ob-name').value.trim().slice(0, 40));
    const changed = !prev || prev.type !== p.type || prev.patologia !== p.patologia || prev.eta !== p.eta || (!prev.consent && p.consent);
    if (changed) sendProfile(p);
    ob.hidden = true;
    if (location.hash === '#/profilo') location.hash = '#/'; else route();
    if (store.get('tp-disclaimer', '') !== '1') disc.hidden = false;
  });

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

  // Fotocamera dentro il dispositivo disegnato: legge il codice a barre sul retro e attiva l'app senza scrivere il seriale
  const gateScan = document.getElementById('gate-scan');
  const gateDev = gateScan.parentElement;
  const gateSn = document.getElementById('gate-sn');
  const gateScanBar = document.getElementById('gate-scan-bar');
  const gateSnIdle = gateSn.textContent;
  const gateWinLabel = gateScan.querySelector('.gate-idle span');
  // testo nella finestra del dispositivo: in attesa, in abbinamento, abbinato
  const gateWin = (label, cls) => { gateWinLabel.textContent = label; gateDev.classList.remove('read', 'paired'); if (cls) gateDev.classList.add(cls); };
  document.getElementById('gate-cancel').addEventListener('click', () => window.EqScan.stop());
  gateScan.addEventListener('click', async () => {
    if (gateDev.classList.contains('scanning')) return;
    gateMsg.className = 'gate-msg'; gateMsg.textContent = '';
    gateWin(T('Clicca qui e abbina il dispositivo')); gateSn.textContent = gateSnIdle;
    const accept = (t) => /^[A-Z0-9-]{5,24}$/.test(normSerial(t)) && /\d/.test(t);
    // schermata a tutto schermo con particelle, anello e suoni; con «riduci movimento» resta la lettura nel disegno
    if (window.EqPair && !window.EqPair.reduced()) {
      gateDev.classList.add('scanning');
      try {
        const r = await window.EqPair.run({ accept, norm: normSerial, verify: verifySerial });
        if (!r) return;
        if (r.ok) {
          store.set('tp-serial', r.serial);
          gate.hidden = true; showPaired(r.serial);
        } else {
          gateInput.value = r.serial;
          gateMsg.textContent = r.error === 'net'
            ? T('Impossibile verificare ora. Controlla la connessione e riprova.')
            : T('Numero di serie non riconosciuto. Controlla di averlo scritto correttamente.');
        }
      } catch (e) {
        gateMsg.textContent = e.message === 'denied'
          ? T('Per inquadrare il seriale consenti l’uso della fotocamera, oppure scrivilo qui sotto.')
          : T('Non riesco ad aprire la fotocamera. Scrivi il numero di serie qui sotto.');
      } finally {
        gateDev.classList.remove('scanning');
      }
      return;
    }
    gateDev.classList.add('scanning'); gateScanBar.hidden = false;
    try {
      const text = await window.EqScan.open({
        container: gateScan,
        torch: document.getElementById('gate-torch'),
        accept,
      });
      if (!text) return;
      const serial = normSerial(text);
      gateSn.textContent = serial; gateWin(T('Abbinamento in corso…'), 'read');
      gateInput.value = serial;
      if (gateForm.requestSubmit) gateForm.requestSubmit(); else gateForm.dispatchEvent(new Event('submit', { cancelable: true }));
    } catch (e) {
      gateMsg.textContent = e.message === 'denied'
        ? T('Per inquadrare il seriale consenti l’uso della fotocamera, oppure scrivilo qui sotto.')
        : T('Non riesco ad aprire la fotocamera. Scrivi il numero di serie qui sotto.');
    } finally {
      gateDev.classList.remove('scanning'); gateScanBar.hidden = true;
    }
  });

  // Schermata di conferma dopo l'abbinamento: resta finché si tocca Chiudi o la X, poi parte l'app
  const paired = document.getElementById('paired');
  function showPaired(serial) {
    document.getElementById('paired-mini').textContent = serial;
    document.getElementById('paired-sn').textContent = serial;
    paired.hidden = false;
    document.getElementById('paired-ok').focus();
  }
  function closePaired() {
    if (paired.hidden) return;
    paired.hidden = true;
    // video veloce su come usare l'app, poi profilo e tutto il resto
    if (window.EqTutorial) window.EqTutorial.show().then(start); else start();
  }
  document.getElementById('paired-ok').addEventListener('click', closePaired);
  document.getElementById('paired-x').addEventListener('click', closePaired);

  gateForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const serial = normSerial(gateInput.value);
    gateMsg.className = 'gate-msg';
    if (serial.length < 5) { gateMsg.textContent = T('Inserisci il numero di serie completo.'); gateInput.focus(); return; }
    gateBtn.disabled = true; gateBtn.textContent = T('Verifica in corso…'); gateMsg.textContent = '';
    try {
      if (await verifySerial(serial)) {
        store.set('tp-serial', serial);
        gateMsg.className = 'gate-msg ok'; gateMsg.textContent = T('Il dispositivo si è abbinato all’app. Benvenuto!');
        if (gateDev.classList.contains('read')) gateWin('✓ ' + T('Abbinato all’app'), 'paired');
        setTimeout(() => { gate.hidden = true; showPaired(serial); }, 900);
      } else {
        gateMsg.textContent = T('Numero di serie non riconosciuto. Controlla di averlo scritto correttamente.');
        gateWin(T('Clicca qui e abbina il dispositivo'));
      }
    } catch (e) {
      gateMsg.textContent = e.message === 'config'
        ? T('Servizio di verifica non configurato.')
        : T('Impossibile verificare ora. Controlla la connessione e riprova.');
      gateWin(T('Clicca qui e abbina il dispositivo'));
    } finally {
      gateBtn.disabled = false; gateBtn.textContent = T('Accedi');
    }
  });

  /* Pulsante «Profilo» nella barra in alto (tutte le pagine): profilo attuale e dispositivo, con Cambia profilo e Cambia dispositivo */
  const acctBtn = document.getElementById('acct-btn'); const acctSheet = document.getElementById('acct-sheet');
  function openAcct() {
    const p = getProfile(); const sn = store.get('tp-serial', ''); const nm = store.get('tp-name', '');
    acctSheet.querySelector('.acct-panel').innerHTML =
      '<div class="acct-head"><h2 id="acct-title">' + T('Profilo e dispositivo') + '</h2><button type="button" class="icon-btn acct-x" aria-label="' + esc(T('Chiudi')) + '">✕</button></div>' +
      '<div class="acct-row"><span class="acct-ico" aria-hidden="true">' + ((window.PROFILES[(p || {}).type] || {}).icon || '👤') + '</span><span><span class="small muted">' + T('Il tuo profilo') + '</span><br><b>' + (nm ? esc(nm) + ' · ' : '') + esc(profileName() || '—') + '</b></span></div>' +
      '<a class="btn primary" href="#/profilo" data-acct-close>' + SWAP_ICON + ' ' + T('Cambia profilo') + '</a>' +
      '<div class="acct-row"><span class="acct-ico" aria-hidden="true"><span class="dev-mini acct-dev"><span class="dev-mini-win">✓</span></span></span><span><span class="small muted">' + T('Il tuo dispositivo') + '</span><br><b>' + esc(sn || '—') + '</b></span></div>' +
      '<button type="button" class="btn" data-acct-device>' + T('Cambia dispositivo') + '</button>' +
      '<p class="small muted acct-note">' + T('Cambia dispositivo se usi un altro Equistasi: dovrai inquadrare o scrivere il nuovo numero di serie. I tuoi test e le misure restano salvati.') + '</p>';
    acctSheet.hidden = false; requestAnimationFrame(() => acctSheet.classList.add('on'));
    acctSheet.querySelector('.acct-x').focus();
  }
  function closeAcct() { acctSheet.classList.remove('on'); setTimeout(() => { acctSheet.hidden = true; }, 200); }
  if (acctBtn && acctSheet) {
    acctBtn.addEventListener('click', openAcct);
    acctSheet.addEventListener('click', (e) => {
      if (e.target === acctSheet || e.target.closest('.acct-x') || e.target.closest('[data-acct-close]')) closeAcct();
      if (e.target.closest('[data-acct-device]') && window.confirm(T('Vuoi abbinare un altro dispositivo Equistasi?'))) window.tpLogout();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !acctSheet.hidden) closeAcct(); });
    window.addEventListener('hashchange', () => { if (!acctSheet.hidden) closeAcct(); });
  }

  window.tpLogout = function () {
    try { localStorage.removeItem('tp-serial'); } catch (e) { /* storage non disponibile */ }
    location.hash = '#/'; location.reload();
  };

  if (store.get('tp-serial', '')) start();
  else { gate.hidden = false; setTimeout(() => gateInput.focus(), 50); }

  /* Offline */
  // nell'app per iPhone/Android i file sono già nel pacchetto: niente service worker
  const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isNativeApp) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {}));
    // quando si torna sull'app (scheda riaperta o pagina ripresa dalla memoria) controlla subito se c'è una versione nuova
    const checkUpdate = () => navigator.serviceWorker.getRegistration().then((r) => r && r.update()).catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) checkUpdate(); });
    window.addEventListener('pageshow', (e) => { if (e.persisted) checkUpdate(); });
    // quando una nuova versione dell'app prende il controllo, ricarica una volta per mostrarla
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !reloaded) { reloaded = true; location.reload(); }
    });
  }
})();
