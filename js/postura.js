/* "Misura la postura": test con i sensori del telefono (stabilità in piedi, tronco, curva della schiena, testa)
   e analisi della postura da foto (punti del corpo trovati sul telefono con MediaPipe, spostabili a mano).
   Tutto resta sul telefono: misure, foto e report non vengono inviati. I valori sono stime indicative. */
(function () {
  const KEY = 'tp-posture';
  const PHOTO_KEY = 'tp-posture-photos';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const prefs = Object.assign({ cond: 'senza', eyes: 'aperti', mount: 'cintura', height: 170, view: 'lato' }, store.get('tp-posture-prefs', {}));
  const savePrefs = () => store.set('tp-posture-prefs', prefs);
  const LOCALE = window.LANG === 'en' ? 'en-GB' : 'it-IT';
  const fmt = (v, d = 1) => Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  const dateStr = (t) => new Date(t).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  const timeStr = (t) => new Date(t).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const deg = (r) => r * 180 / Math.PI;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const COND = { senza: T('Senza Equistasi'), con: T('Con Equistasi') };
  const EYES = { aperti: T('Occhi aperti'), chiusi: T('Occhi chiusi') };
  const MOUNT = { cintura: T('In cintura (lombare)'), petto: T('Sul petto') };

  const records = () => store.get(KEY, []);
  function addRecord(r) {
    const all = records();
    const rec = Object.assign({ id: Date.now().toString(36), t: Date.now(), cond: prefs.cond }, r);
    all.push(rec);
    // le tracce occupano spazio: le teniamo solo per le ultime 40 misure
    all.slice(0, -40).forEach((x) => { delete x.trace; });
    store.set(KEY, all.slice(-300));
    return rec;
  }
  const byId = (id) => records().find((r) => r.id === id);

  const ICON = {
    stabilita: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M12 7v8M12 15l-3 6M12 15l3 6M7 10h10"/></svg>',
    tronco: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 3v18M12 12l6-4M5 21h14"/></svg>',
    schiena: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 3c4 3 4 6 1 9s-3 6 1 9"/><circle cx="10.5" cy="3.5" r="1"/><circle cx="11.5" cy="20.5" r="1"/></svg>',
    testa: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M12 13v8M8 17l4-4 4 4"/></svg>',
    foto: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    confronto: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 4v16M17 4v16M3 8h8M13 16h8"/></svg>',
    progressi: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 19h16M6 15l4-4 3 3 5-6"/></svg>',
  };
  const TESTS = {
    stabilita: { name: T('Stabilità in piedi'), desc: T('Telefono in cintura · occhi aperti e chiusi · 30 s') },
    tronco: { name: T('Inclinazione del tronco'), desc: T('Telefono sullo sterno · 8 s') },
    schiena: { name: T('Curva della schiena'), desc: T('Due appoggi: T1 e T12') },
    testa: { name: T('Testa e collo'), desc: T('Telefono sulla fronte · 8 s') },
  };
  const NOTE = '<p class="small muted pz-note">' + T('Stime ottenute con i sensori e la fotocamera del telefono: servono a seguire i cambiamenti nel tempo, <b>non sono una diagnosi</b>. Misure, foto e report restano solo sul tuo telefono.') + '</p>';
  const SAFETY = '<div class="warn">' + T('<b>⚠️ Fai i test vicino a un muro o con qualcuno accanto</b>, che possa sostenerti se perdi l’equilibrio.') + '</div>';

  /* ───────── Segnali: bip, vibrazione e voce ───────── */
  let actx = null;
  function beep(freq = 880, ms = 160) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(); const g = actx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.3, actx.currentTime);
      o.start(); o.stop(actx.currentTime + ms / 1000);
    } catch (e) { /* audio non disponibile */ }
    if (navigator.vibrate) navigator.vibrate(ms);
  }
  function say(text) {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = window.LANG === 'en' ? 'en-GB' : 'it-IT';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) { /* voce non disponibile */ }
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { /* non supportato */ }
  }

  /* ───────── Sensori ───────── */
  async function motionPermission() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch (e) { return false; }
    }
    return true;
  }
  let stopRec = null;
  function record(ms, onSample) {
    return new Promise((resolve) => {
      const s = []; let done = false;
      const finish = () => { if (done) return; done = true; window.removeEventListener('devicemotion', h); clearTimeout(to); stopRec = null; resolve(s); };
      const h = (e) => {
        const a = e.accelerationIncludingGravity || {};
        if (a.x == null) return;
        const p = { t: performance.now(), x: a.x, y: a.y, z: a.z };
        s.push(p);
        if (onSample) onSample(p, s);
      };
      window.addEventListener('devicemotion', h);
      const to = setTimeout(finish, ms);
      stopRec = finish;
    });
  }

  // Inclinazione dal vettore di gravità, filtrata (passa-basso) e ricampionata a 20 Hz.
  // Il telefono può stare in verticale o in orizzontale (schermo verso l'esterno): l'asse su cui
  // pesa di più la gravità è "l'alto". Se è x, ruotiamo di 90° gli assi; su alcuni telefoni i segni
  // sono invertiti: li correggiamo.
  function axes(samples) {
    const mx = mean(samples.map((p) => p.x)); const my = mean(samples.map((p) => p.y));
    const land = Math.abs(mx) > Math.abs(my);
    const sign = (land ? mx : my) < 0 ? -1 : 1;
    return land
      ? (p) => ({ x: -p.y * sign, y: p.x * sign, z: p.z * sign })
      : (p) => ({ x: p.x * sign, y: p.y * sign, z: p.z * sign });
  }

  function tilt(samples, fc = 1.5) {
    if (samples.length < 10) return null;
    const map = axes(samples);
    const s0 = map(samples[0]);
    let gx = s0.x; let gy = s0.y; let gz = s0.z;
    const out = []; let last = samples[0].t; let nextT = samples[0].t;
    samples.forEach((p) => {
      const dt = Math.max(0.001, (p.t - last) / 1000); last = p.t;
      const k = 1 - Math.exp(-2 * Math.PI * fc * dt);
      const q = map(p);
      gx += k * (q.x - gx); gy += k * (q.y - gy); gz += k * (q.z - gz);
      if (p.t >= nextT) { out.push({ t: p.t, ap: deg(Math.atan2(-gz, gy)), ml: deg(Math.atan2(gx, gy)) }); nextT += 50; }
    });
    return out;
  }

  // Oscillazione: angoli → spostamento (modello a pendolo, altezza del telefono da terra) → ellisse al 95%, percorso e velocità
  function sway(samples, mount, heightCm) {
    const all = tilt(samples);
    if (!all || all.length < 40) return null;
    const a = all.slice(20); // il primo secondo serve al filtro
    const H = heightCm * (mount === 'petto' ? 0.72 : 0.56);
    const map = (v, m) => H * Math.tan((v - m) * Math.PI / 180);
    const mAP = mean(a.map((p) => p.ap)); const mML = mean(a.map((p) => p.ml));
    const pts = a.map((p) => ({ x: map(p.ml, mML), y: map(p.ap, mAP) }));
    const sxx = mean(pts.map((p) => p.x * p.x)); const syy = mean(pts.map((p) => p.y * p.y)); const sxy = mean(pts.map((p) => p.x * p.y));
    const det = Math.max(0, sxx * syy - sxy * sxy);
    const area = Math.PI * 5.991 * Math.sqrt(det);
    let path = 0;
    for (let i = 1; i < pts.length; i++) path += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    const dur = (a[a.length - 1].t - a[0].t) / 1000;
    // assi dell'ellisse per il disegno
    const tr = sxx + syy; const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const l1 = tr / 2 + disc; const l2 = Math.max(0, tr / 2 - disc);
    const ang = deg(0.5 * Math.atan2(2 * sxy, sxx - syy));
    const step = Math.max(1, Math.round(pts.length / 240));
    return {
      area, path, vel: dur > 0 ? path * 10 / dur : 0, dur,
      rx: Math.sqrt(5.991 * l1), ry: Math.sqrt(5.991 * l2), rot: ang,
      trace: pts.filter((p, i) => i % step === 0).map((p) => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100]),
    };
  }
  const index = (area) => Math.round(1000 / (10 + area));

  /* ───────── Disegni ───────── */
  // Tracciato dell'oscillazione con l'ellisse al 95% (cm). dark: versione per sfondo indaco
  const swayR = (m) => (m ? Math.max(m.rx, m.ry, ...m.trace.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1])))) * 1.15 : 2);
  function swaySvg(m, size, dark, label, fixedR) {
    const R = Math.max(1.5, fixedR || swayR(m));
    const s = (size / 2 - 6) / R; const c = size / 2;
    const grid = dark ? '#3B3679' : '#DCD9EC';
    const line = dark ? '#C9C6E6' : '#29235C';
    let path = '';
    if (m && m.trace.length) path = '<polyline fill="none" stroke="' + line + '" stroke-width="1.4" stroke-linejoin="round" points="' + m.trace.map((p) => (c + p[0] * s).toFixed(1) + ',' + (c - p[1] * s).toFixed(1)).join(' ') + '"/>';
    const ell = m ? '<ellipse cx="' + c + '" cy="' + c + '" rx="' + (m.rx * s).toFixed(1) + '" ry="' + (m.ry * s).toFixed(1) + '" transform="rotate(' + (-m.rot).toFixed(1) + ' ' + c + ' ' + c + ')" fill="#FADC00" fill-opacity="' + (dark ? 0.3 : 0.35) + '" stroke="' + (dark ? '#FADC00' : '#C9A800') + '" stroke-width="2"/>' : '';
    return '<svg class="pz-sway" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(label || T('Tracciato dell’oscillazione')) + '">' +
      '<rect x="1" y="1" width="' + (size - 2) + '" height="' + (size - 2) + '" rx="14" fill="' + (dark ? '#241F55' : '#F4F3F9') + '"/>' +
      '<path d="M' + c + ' 8V' + (size - 8) + 'M8 ' + c + 'H' + (size - 8) + '" stroke="' + grid + '" stroke-width="1.2"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + (1 * s).toFixed(1) + '" fill="none" stroke="' + grid + '" stroke-width="1.2"/>' + ell + path + '</svg>';
  }
  function bodySvg(kind) {
    const base = '<circle cx="75" cy="30" r="20" fill="none" stroke="#D9D7EE" stroke-width="3"/><path d="M45 62 Q75 52 105 62 L100 150 L50 150 Z" fill="none" stroke="#D9D7EE" stroke-width="3" stroke-linejoin="round"/><path d="M50 150 L56 262 M100 150 L94 262" stroke="#D9D7EE" stroke-width="3" stroke-linecap="round"/><path d="M40 262 H110" stroke="#5E58A0" stroke-width="3" stroke-linecap="round"/>';
    const phone = (x, y, w = 24, h = 36) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="5" fill="#FADC00" stroke="#1B1840" stroke-width="2"/>';
    let extra = '';
    if (kind === 'cintura') extra = '<path d="M75 60 V140" stroke="#5E58A0" stroke-width="2" stroke-dasharray="4 4"/><path d="M45 66 L36 140 M105 66 L114 140" stroke="#D9D7EE" stroke-width="3" stroke-linecap="round"/><rect x="48" y="122" width="54" height="12" rx="4" fill="#7FB2E5"/>' + phone(63, 110);
    else if (kind === 'petto' || kind === 'tronco') extra = '<path d="M45 66 Q30 92 58 96 M105 66 Q120 92 92 96" fill="none" stroke="#D9D7EE" stroke-width="3" stroke-linecap="round"/>' + phone(63, 74);
    else if (kind === 'testa') extra = '<path d="M45 66 L36 140 M105 66 L114 140" stroke="#D9D7EE" stroke-width="3" stroke-linecap="round"/>' + phone(66, 14, 18, 28);
    else if (kind === 'schiena') extra = '<path d="M75 60 V140" stroke="#5E58A0" stroke-width="2" stroke-dasharray="4 4"/><path d="M45 66 L36 140 M105 66 L114 140" stroke="#D9D7EE" stroke-width="3" stroke-linecap="round"/>' + phone(65, 62, 20, 30) + phone(65, 104, 20, 30).replace('#FADC00', '#7FB2E5') +
      '<text x="96" y="80" font-family="Open Sans, sans-serif" font-size="11" font-weight="800" fill="#FADC00">T1</text><text x="96" y="122" font-family="Open Sans, sans-serif" font-size="11" font-weight="800" fill="#7FB2E5">T12</text>';
    return '<svg viewBox="0 0 150 270" width="120" height="216" role="img" aria-label="' + esc(T('Dove mettere il telefono')) + '">' + base + extra + '</svg>';
  }

  function seg(name, opts, cur, label) {
    return '<div class="seg" role="group" aria-label="' + esc(label || name) + '">' +
      Object.keys(opts).map((k) => '<button type="button" data-pref="' + name + '" data-val="' + k + '" aria-pressed="' + (String(cur) === k) + '">' + opts[k] + '</button>').join('') + '</div>';
  }
  function bindPrefs(app, rerender) {
    app.querySelectorAll('[data-pref]').forEach((b) => b.addEventListener('click', () => {
      prefs[b.dataset.pref] = b.dataset.val; savePrefs(); rerender();
    }));
  }
  const head = (eyebrow, title, sub) => '<div class="detail-head"><div class="eyebrow">' + eyebrow + '</div><h1>' + title + '</h1>' + (sub ? '<p class="small muted" style="margin:6px 0 0">' + sub + '</p>' : '') + '</div>';

  /* ───────── Pagina principale ───────── */
  function cardHtml() {
    const st = records().filter((r) => r.test === 'stabilita').pop();
    return '<a class="card vpromo pz-promo" href="#/postura"><span class="vpromo-ico pz-ico" aria-hidden="true">' + ICON.stabilita + '</span>' +
      '<span><b>' + T('Misura la postura') + '</b><br><span class="small muted">' +
      (st ? T('Ultimo indice di stabilità: {v} · {d}', { v: index(st.m.area), d: dateStr(st.t) }) : T('Con i sensori del telefono e con le foto')) + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  function renderHome(app) {
    const st = records().filter((r) => r.test === 'stabilita');
    const last = st[st.length - 1];
    const prev = last ? st.slice(0, -1).reverse().find((r) => r.eyes === last.eyes && r.mount === last.mount) : null;
    const tile = (k, href, name, desc) => '<a class="pz-tile" href="' + href + '"><span class="pz-ico">' + ICON[k] + '</span><b>' + name + '</b><span class="small muted">' + desc + '</span></a>';
    let hero = '';
    if (last) {
      const v = index(last.m.area); const dash = Math.round(289 * v / 100);
      const diff = prev ? index(last.m.area) - index(prev.m.area) : null;
      hero = '<div class="card pz-hero"><div class="pz-hero-top"><span>' + T('INDICE DI STABILITÀ') + '</span><span>' + dateStr(last.t) + ' · ' + timeStr(last.t) + '</span></div>' +
        '<div class="pz-hero-row"><svg width="104" height="104" viewBox="0 0 112 112" role="img" aria-label="' + esc(T('Indice {v} su 100', { v })) + '"><circle cx="56" cy="56" r="46" fill="none" stroke="#3E3878" stroke-width="12"/>' +
        '<circle cx="56" cy="56" r="46" fill="none" stroke="#FADC00" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + dash + ' 289" transform="rotate(-90 56 56)"/>' +
        '<text x="56" y="62" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">' + v + '</text><text x="56" y="80" text-anchor="middle" font-size="11" fill="#D9D7EE">' + T('su 100') + '</text></svg>' +
        '<div><b>' + EYES[last.eyes] + ' · ' + (last.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + '</b><br><span>' + T('Area {a} cm² · velocità {v} mm/s', { a: fmt(last.m.area, 1), v: fmt(last.m.vel, 1) }) + '</span>' +
        (diff != null ? '<span class="pz-pill">' + (diff >= 0 ? '+' : '') + diff + ' ' + T('rispetto alla misura precedente') + '</span>' : '') + '</div></div></div>';
    }
    app.innerHTML = head(T('Postura'), T('Misura la tua <span class="hl">postura</span>'), T('Test con i sensori del telefono e analisi da foto. Ripetili nel tempo, senza e con Equistasi, e confronta i risultati.')) +
      hero + (window.EqRemote ? window.EqRemote.cardHtml() : '') +
      '<h2 class="sec-title">' + T('Test con i sensori') + '</h2><div class="pz-tiles">' +
      Object.keys(TESTS).map((k) => tile(k, '#/postura/' + k, TESTS[k].name, TESTS[k].desc)).join('') + '</div>' +
      '<h2 class="sec-title">' + T('Analisi da foto') + '</h2><div class="pz-tiles">' +
      tile('foto', '#/postura/foto', T('Foto della postura'), T('Davanti, di lato, da dietro')) +
      tile('confronto', '#/postura/fotoconfronto', T('Foto prima e dopo'), T('Confronta due foto')) + '</div>' +
      '<h2 class="sec-title">' + T('Risultati') + '</h2><div class="pz-tiles">' +
      tile('confronto', '#/postura/confronto', T('Con e senza Equistasi'), T('Stabilità a confronto')) +
      tile('progressi', '#/postura/progressi', T('Progressi e report'), T('Grafico e report per il fisioterapista')) + '</div>' +
      '<div class="card"><h3>' + T('La tua altezza') + '</h3><p class="small muted" style="margin:0 0 8px">' + T('Serve a trasformare le inclinazioni in centimetri di oscillazione.') + '</p>' +
      '<label class="pz-height"><input id="pz-h" type="number" inputmode="numeric" min="100" max="220" value="' + prefs.height + '" aria-label="' + esc(T('Altezza in centimetri')) + '"> cm</label></div>' + NOTE;
    const h = document.getElementById('pz-h');
    h.addEventListener('change', () => { const v = Number(h.value); if (v >= 100 && v <= 220) { prefs.height = v; savePrefs(); } else h.value = prefs.height; });
  }

  /* ───────── Test di stabilità ───────── */
  function renderStability(app) {
    const belt = prefs.mount === 'cintura';
    const how = belt
      ? ['<b>' + T('Telefono nella cintura') + '</b>: ' + T('dietro la schiena, zona lombare, al centro. Telefono in orizzontale o in verticale, schermo verso l’esterno.'),
        T('Tocca <b>Inizia</b> e metti il telefono nella cintura: hai <b>10 secondi</b>.'),
        T('Piedi alla larghezza delle anche, braccia lungo i fianchi. Una voce ti dice quando iniziare e quando finire: resta fermo per <b>30 secondi</b>.')]
      : ['<b>' + T('Telefono sul petto') + '</b>: ' + T('tenuto con due mani all’altezza dello sterno, schermo verso di te.'),
        T('Tocca <b>Inizia</b>: dopo il conto alla rovescia resta fermo per <b>30 secondi</b>.'),
        T('Senza cintura la misura è meno precisa: usa sempre lo stesso modo per confrontare le misure.')];
    app.innerHTML = head(T('Postura'), TESTS.stabilita.name) +
      '<div class="home-grid"><div><div class="card">' +
      '<div class="pz-pose">' + (belt ? '<figure class="pz-photo"><img src="img/cintura-schiena.jpg" width="600" height="796" alt="' + esc(T('Telefono nella cintura dietro la schiena, zona lombare')) + '"><figcaption>' + T('Telefono dietro, al centro') + '</figcaption></figure>' : bodySvg('petto')) + '<ol class="steps">' + how.map((x) => '<li>' + x + '</li>').join('') + '</ol></div>' +
      '<div class="toolbar">' + seg('mount', MOUNT, prefs.mount, T('Posizione del telefono')) + '</div>' +
      '<div class="toolbar">' + seg('eyes', EYES, prefs.eyes, T('Occhi')) + '</div>' +
      '<div class="toolbar">' + seg('cond', COND, prefs.cond, T('Condizione')) + '</div>' + SAFETY + (window.EqRemote ? window.EqRemote.cardHtml() : '') +
      '<div class="pz-live" id="pz-live" hidden><div class="pz-live-in"><div class="pz-big" id="pz-big"></div><div class="small" id="pz-sub"></div><div id="pz-trace"></div>' +
      '<button class="btn" id="pz-moved" type="button">' + T('Ha spostato un piede') + '</button></div></div>' +
      '<p class="gate-msg" id="pz-msg" role="alert"></p>' +
      '<button class="btn primary" id="pz-go" type="button">' + T('Inizia') + '</button></div></div><div>' +
      historyCard('stabilita') + '</div></div>' + NOTE;
    bindPrefs(app, () => renderStability(app));
    document.getElementById('pz-go').addEventListener('click', () => runStability(app));
  }

  async function runStability(app) {
    const go = document.getElementById('pz-go'); const msg = document.getElementById('pz-msg');
    const live = document.getElementById('pz-live'); const big = document.getElementById('pz-big'); const sub = document.getElementById('pz-sub');
    const traceEl = document.getElementById('pz-trace');
    msg.textContent = ''; go.disabled = true; beep(440, 1);
    if (!(await motionPermission())) {
      msg.textContent = T('Serve il permesso ai sensori di movimento. Usa il telefono (non il computer) e consenti l’accesso quando richiesto.');
      go.disabled = false; return;
    }
    const belt = prefs.mount === 'cintura';
    live.hidden = false; keepAwake(true);
    let cancelled = false; let moved = false;
    document.getElementById('pz-moved').onclick = () => { moved = true; if (stopRec) stopRec(); else cancelled = true; };
    const prep = belt ? 10 : 3;
    say(belt ? T('Metti il telefono nella cintura e resta in piedi, con i piedi alla larghezza delle anche.') : T('Tieni il telefono sul petto. Pronti.'));
    for (let i = prep; i > 0 && !cancelled; i--) {
      big.textContent = i; sub.textContent = belt ? T('Metti il telefono nella cintura') : T('Preparati');
      if (i <= 3) { beep(660, 120); if (belt) say(String(i)); }
      await wait(1000);
    }
    if (cancelled) { keepAwake(false); renderStability(app); return; }
    beep(1100, 350); say(prefs.eyes === 'chiusi' ? T('Chiudi gli occhi. Via.') : T('Via. Resta fermo.'));
    const DUR = 30000; const t0 = performance.now(); let lastDraw = 0;
    sub.textContent = T('Resta fermo · lo schermo è per chi ti assiste');
    const iv = setInterval(() => { big.textContent = Math.max(0, Math.ceil((DUR - (performance.now() - t0)) / 1000)) + ' s'; }, 200);
    const samples = await record(DUR, (p, s) => {
      if (p.t - lastDraw > 400 && s.length > 60) {
        lastDraw = p.t;
        const m = sway(s, prefs.mount, prefs.height);
        if (m) traceEl.innerHTML = swaySvg(m, 200, true);
      }
    });
    clearInterval(iv); beep(1100, 400); say(T('Fine. Puoi muoverti.')); keepAwake(false);
    const held = Math.min(DUR, performance.now() - t0) / 1000;
    const m = sway(samples, prefs.mount, prefs.height);
    if (!m) { live.hidden = true; go.disabled = false; msg.textContent = T('Il sensore di movimento non ha inviato abbastanza dati: riprova dal telefono.'); return; }
    const rec = addRecord({ test: 'stabilita', eyes: prefs.eyes, mount: prefs.mount, held, moved, m });
    location.hash = '#/postura/risultato/' + rec.id;
  }

  function rombergFor(rec) {
    const all = records().filter((r) => r.test === 'stabilita' && r.mount === rec.mount && r.cond === rec.cond && r.id !== rec.id && Math.abs(r.t - rec.t) < 3600000);
    const other = all.reverse().find((r) => r.eyes !== rec.eyes);
    if (!other) return null;
    const open = rec.eyes === 'aperti' ? rec : other; const closed = rec.eyes === 'chiusi' ? rec : other;
    return open.m.area > 0 ? closed.m.area / open.m.area : null;
  }

  function renderResult(app, id) {
    const r = byId(id);
    if (!r) { renderHome(app); return; }
    const prev = records().filter((x) => x.test === 'stabilita' && x.eyes === r.eyes && x.mount === r.mount && x.t < r.t).pop();
    const delta = prev && prev.m.area > 0 ? Math.round((r.m.area - prev.m.area) / prev.m.area * 100) : null;
    const rom = rombergFor(r);
    const card = (lab, val, unit) => '<div class="pz-metric"><span class="small muted">' + lab + '</span><b>' + val + ' <small>' + unit + '</small></b></div>';
    app.innerHTML = head(T('Risultato'), TESTS.stabilita.name, EYES[r.eyes] + ' · ' + MOUNT[r.mount] + ' · ' + COND[r.cond] + ' · ' + dateStr(r.t) + ' ' + timeStr(r.t)) +
      '<div class="home-grid"><div><div class="card pz-res">' + swaySvg(r.m, 150, false, T('Ellisse dell’oscillazione, area {a} centimetri quadrati', { a: fmt(r.m.area, 1) })) +
      '<div><span class="small muted pz-cap">' + T('AREA DI OSCILLAZIONE') + '</span><div class="pz-num">' + fmt(r.m.area, 1) + ' <small>cm²</small></div>' +
      (delta != null ? '<span class="pz-delta ' + (delta <= 0 ? 'ok' : 'ko') + '">' + (delta > 0 ? '+' : '') + delta + '% ' + T('dall’ultima volta') + '</span>' : '') +
      '<div class="small muted" style="margin-top:6px">' + T('Indice di stabilità: <b>{v}</b> su 100', { v: index(r.m.area) }) + '</div></div></div>' +
      '<div class="pz-metrics">' + card(T('Velocità media'), fmt(r.m.vel, 1), 'mm/s') + card(T('Percorso totale'), fmt(r.m.path, 0), 'cm') +
      card(T('Durata'), fmt(r.held, 0), 's') + card(T('Indice di Romberg'), rom != null ? fmt(rom, 2) : '—', rom != null ? T('occhi chiusi / aperti') : T('serve l’altra prova')) + '</div>' +
      (r.moved || r.held < 29 ? '<div class="warn">' + T('La prova è stata interrotta prima dei 30 secondi: i valori sono meno confrontabili.') + '</div>' : '') +
      '</div><div><div class="card"><div class="btn-col">' +
      (r.eyes === 'aperti' ? '<a class="btn primary" href="#/postura/stabilita" data-eyes="chiusi">' + T('Ora a occhi chiusi') + '</a>' : '<a class="btn primary" href="#/postura/stabilita">' + T('Ripeti la prova') + '</a>') +
      '<a class="btn" href="#/postura/confronto">' + T('Confronta con e senza Equistasi') + '</a>' +
      '<a class="btn" href="#/postura/progressi">' + T('Vedi i progressi') + '</a></div></div></div></div>' + NOTE;
    const e = app.querySelector('[data-eyes]');
    if (e) e.addEventListener('click', () => { prefs.eyes = 'chiusi'; savePrefs(); });
  }

  /* ───────── Tronco, testa, curva della schiena ───────── */
  const STATIC = {
    tronco: { pose: 'tronco', how: [T('Appoggia il telefono sullo <b>sterno</b>, in verticale, <b>schermo verso l’esterno</b>, tenuto fermo con una mano.'), T('Stai in piedi nella tua posizione abituale, guardando avanti.'), T('Tocca <b>Inizia</b>: dopo il bip resta fermo per 8 secondi.')] },
    testa: { pose: 'testa', how: [T('Appoggia il telefono sulla <b>fronte</b>, in verticale, <b>schermo verso l’esterno</b>, tenuto con una mano.'), T('Seduto o in piedi, testa nella posizione abituale, sguardo avanti.'), T('Tocca <b>Inizia</b>: dopo il bip resta fermo per 8 secondi.')] },
    schiena: { pose: 'schiena', how: [T('Serve un’altra persona. Tu stai in piedi nella posizione abituale.'), T('Chi ti aiuta appoggia il telefono sulla colonna, in verticale, prima all’altezza di <b>T1</b> (alla base del collo) e poi di <b>T12</b> (ultima costola).'), T('A ogni bip il telefono deve restare fermo per 4 secondi.')] },
  };
  function staticResultText(r) {
    if (r.test === 'schiena') return T('Curva dorsale stimata: <b>{k}°</b>', { k: fmt(r.k, 0) });
    const ap = r.ap; const ml = r.ml;
    const fw = Math.abs(ap) < 0.5 ? T('dritto') : (ap > 0 ? T('{v}° in avanti', { v: fmt(Math.abs(ap), 1) }) : T('{v}° indietro', { v: fmt(Math.abs(ap), 1) }));
    const lt = Math.abs(ml) < 0.5 ? T('centrato') : (ml > 0 ? T('{v}° a destra', { v: fmt(Math.abs(ml), 1) }) : T('{v}° a sinistra', { v: fmt(Math.abs(ml), 1) }));
    return T('Avanti/indietro: <b>{a}</b> · Destra/sinistra: <b>{b}</b>', { a: fw, b: lt });
  }
  function renderStatic(app, test) {
    const s = STATIC[test];
    app.innerHTML = head(T('Postura'), TESTS[test].name) +
      '<div class="home-grid"><div><div class="card"><div class="pz-pose">' + bodySvg(s.pose) + '<ol class="steps">' + s.how.map((x) => '<li>' + x + '</li>').join('') + '</ol></div>' +
      '<div class="toolbar">' + seg('cond', COND, prefs.cond, T('Condizione')) + '</div>' +
      '<div class="ts-live" id="pz-live" hidden><div class="ts-big" id="pz-big"></div><div class="small muted" id="pz-sub"></div></div>' +
      '<p class="gate-msg" id="pz-msg" role="alert"></p>' +
      '<button class="btn primary" id="pz-go" type="button">' + T('Inizia') + '</button></div></div><div>' + historyCard(test) + '</div></div>' + NOTE;
    bindPrefs(app, () => renderStatic(app, test));
    document.getElementById('pz-go').addEventListener('click', () => runStatic(app, test));
  }
  async function hold(ms, big, sub, label) {
    sub.textContent = label;
    for (let i = 3; i > 0; i--) { big.textContent = i; beep(660, 120); await wait(1000); }
    beep(1100, 250); big.textContent = T('Fermo');
    const s = await record(ms);
    beep(1300, 250);
    const a = tilt(s, 2);
    if (!a || a.length < 20) return null;
    const b = a.slice(Math.floor(a.length * 0.25));
    const ap = b.map((p) => p.ap); const ml = b.map((p) => p.ml);
    const sd = Math.sqrt(mean(ap.map((v) => (v - mean(ap)) ** 2)));
    return { ap: mean(ap), ml: mean(ml), sd };
  }
  async function runStatic(app, test) {
    const go = document.getElementById('pz-go'); const msg = document.getElementById('pz-msg');
    const live = document.getElementById('pz-live'); const big = document.getElementById('pz-big'); const sub = document.getElementById('pz-sub');
    msg.textContent = ''; go.disabled = true; beep(440, 1);
    if (!(await motionPermission())) { msg.textContent = T('Serve il permesso ai sensori di movimento. Usa il telefono (non il computer) e consenti l’accesso quando richiesto.'); go.disabled = false; return; }
    live.hidden = false; keepAwake(true);
    let rec = null;
    if (test === 'schiena') {
      const a = await hold(4000, big, sub, T('Telefono su T1, alla base del collo'));
      if (!a) return failStatic(msg, go, live);
      say(T('Ora sposta il telefono su T12.'));
      big.textContent = '→'; sub.textContent = T('Sposta il telefono su T12, all’altezza dell’ultima costola'); await wait(4000);
      const b = await hold(4000, big, sub, T('Telefono su T12'));
      if (!b) return failStatic(msg, go, live);
      rec = addRecord({ test, k: Math.abs(b.ap - a.ap), t1: a.ap, t12: b.ap, steady: Math.max(a.sd, b.sd) < 1.5 });
    } else {
      const a = await hold(8000, big, sub, test === 'testa' ? T('Telefono sulla fronte') : T('Telefono sullo sterno'));
      if (!a) return failStatic(msg, go, live);
      rec = addRecord({ test, ap: a.ap, ml: a.ml, steady: a.sd < 1.5 });
    }
    keepAwake(false);
    renderStatic(app, test);
    const m = document.getElementById('pz-msg');
    m.className = 'ts-done';
    m.innerHTML = T('Risultato salvato:') + ' ' + staticResultText(rec) + (rec.steady ? '' : '<br>' + T('Il telefono si è mosso durante la misura: ripeti la prova per un valore più affidabile.'));
  }
  function failStatic(msg, go, live) {
    keepAwake(false); live.hidden = true; go.disabled = false;
    msg.textContent = T('Il sensore di movimento non ha inviato abbastanza dati: riprova dal telefono.');
  }

  function historyCard(test) {
    const list = records().filter((r) => r.test === test).slice(-8).reverse();
    if (!list.length) return '<div class="card"><h3>' + T('Le tue misure') + '</h3><p class="small muted" style="margin:0">' + T('Nessuna misura ancora.') + '</p></div>';
    const val = (r) => r.test === 'stabilita' ? fmt(r.m.area, 1) + ' cm²' : r.test === 'schiena' ? fmt(r.k, 0) + '°' : fmt(r.ap, 1) + '° / ' + fmt(r.ml, 1) + '°';
    const sub = (r) => dateStr(r.t) + ' ' + timeStr(r.t) + ' · ' + (r.cond === 'con' ? T('con') : T('senza')) + (r.test === 'stabilita' ? ' · ' + (r.eyes === 'chiusi' ? T('occhi chiusi') : T('occhi aperti')) : '');
    return '<div class="card"><h3>' + T('Le tue misure') + '</h3><ul class="ts-hist">' + list.map((r) =>
      '<li>' + (r.test === 'stabilita' ? '<a href="#/postura/risultato/' + r.id + '">' + sub(r) + '</a>' : '<span>' + sub(r) + '</span>') + '<b>' + val(r) + '</b></li>').join('') + '</ul>' +
      (test !== 'stabilita' ? '<p class="small muted" style="margin:8px 0 0">' + (test === 'schiena' ? T('Differenza di inclinazione tra T1 e T12.') : T('Inclinazione avanti/indietro e destra/sinistra (positivo = avanti / a destra).')) + '</p>' : '') + '</div>';
  }

  /* ───────── Con e senza Equistasi ───────── */
  function renderCompare(app) {
    const st = records().filter((r) => r.test === 'stabilita' && r.eyes === prefs.eyes && r.mount === prefs.mount);
    const s = st.filter((r) => r.cond === 'senza').pop(); const c = st.filter((r) => r.cond === 'con').pop();
    const R = Math.max(s ? swayR(s.m) : 0, c ? swayR(c.m) : 0); // stessa scala per i due disegni
    const col = (r, lab, dark) => '<div class="pz-cmp' + (dark ? ' dark' : '') + '"><span class="pz-cap">' + lab + '</span>' + (r ? swaySvg(r.m, 140, dark, '', R) + '<b class="pz-num-s">' + fmt(r.m.area, 1) + ' <small>cm²</small></b><span class="small">' + dateStr(r.t) + ' · ' + timeStr(r.t) + '</span>' : '<p class="small">' + T('Nessuna misura') + '</p>') + '</div>';
    const bar = (lab, a, b) => {
      const pct = Math.round((b - a) / a * 100);
      const w = Math.max(4, Math.min(100, Math.round(b / Math.max(a, b) * 100))); const w0 = Math.round(a / Math.max(a, b) * 100);
      return '<div class="pz-bar"><div class="pz-bar-l"><span>' + lab + '</span><b class="' + (pct <= 0 ? 'ok' : 'ko') + '">' + (pct > 0 ? '+' : '') + pct + '%</b></div><i style="width:' + w0 + '%"></i><i class="con" style="width:' + w + '%"></i></div>';
    };
    app.innerHTML = head(T('Postura'), T('Con e senza Equistasi'), T('Ultima prova senza e con il dispositivo, nelle stesse condizioni.')) +
      '<div class="card"><div class="toolbar">' + seg('eyes', EYES, prefs.eyes, T('Occhi')) + '</div><div class="toolbar">' + seg('mount', MOUNT, prefs.mount, T('Posizione del telefono')) + '</div>' +
      '<div class="pz-cmps">' + col(s, T('SENZA'), false) + col(c, T('CON EQUISTASI'), true) + '</div>' +
      (s && c ? '<h3 style="margin-top:14px">' + T('Variazione misurata') + '</h3>' + bar(T('Area di oscillazione'), s.m.area, c.m.area) + bar(T('Velocità media'), s.m.vel, c.m.vel) +
        '<div class="pz-legend"><span><i></i>' + T('Senza') + '</span><span><i class="con"></i>' + T('Con Equistasi') + '</span></div>'
        : '<p class="small muted">' + T('Fai la prova di stabilità una volta «Senza Equistasi» e una volta «Con Equistasi» (per esempio dopo 1 ora di applicazione), con gli stessi occhi e la stessa posizione del telefono.') + '</p>' +
        '<a class="btn primary" href="#/postura/stabilita">' + T('Vai alla prova di stabilità') + '</a>') +
      '</div><p class="small muted pz-note">' + T('La risposta è individuale: confronta misure fatte nelle stesse condizioni (ora del giorno, scarpe, posizione).') + '</p>';
    bindPrefs(app, () => renderCompare(app));
  }

  /* ───────── Progressi e report ───────── */
  function chart(list) {
    if (list.length < 2) return '<p class="small muted">' + T('Servono almeno due prove di stabilità per vedere il grafico.') + '</p>';
    const W = 320; const Hh = 150; const pad = 28;
    const vals = list.map((r) => index(r.m.area));
    const lo = Math.max(0, Math.floor((Math.min(...vals) - 5) / 10) * 10); const hi = Math.min(100, Math.ceil((Math.max(...vals) + 5) / 10) * 10);
    const x = (i) => pad + i * (W - pad - 8) / (list.length - 1);
    const y = (v) => 10 + (hi - v) * (Hh - 20) / Math.max(1, hi - lo);
    let g = '';
    for (let v = lo; v <= hi; v += 10) g += '<path d="M' + pad + ' ' + y(v) + 'H' + W + '" stroke="#ECEAF5"/><text x="' + (pad - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end" font-size="10" fill="#5B5C78">' + v + '</text>';
    const line = '<polyline fill="none" stroke="#29235C" stroke-width="2.4" stroke-linejoin="round" points="' + vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ') + '"/>';
    const dots = list.map((r, i) => '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(vals[i]).toFixed(1) + '" r="' + (r.cond === 'con' ? 5 : 4) + '" fill="' + (r.cond === 'con' ? '#FADC00' : '#fff') + '" stroke="' + (r.cond === 'con' ? '#1B1840' : '#29235C') + '" stroke-width="2"/>').join('');
    return '<svg class="pz-chart" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + esc(T('Andamento dell’indice di stabilità')) + '">' + g + line + dots + '</svg>' +
      '<div class="pz-legend"><span><i class="dot"></i>' + T('Senza') + '</span><span><i class="dot con"></i>' + T('Con Equistasi') + '</span></div>';
  }
  function renderProgress(app) {
    const st = records().filter((r) => r.test === 'stabilita' && r.eyes === prefs.eyes).slice(-20);
    const all = records().slice(-10).reverse();
    const label = (r) => r.test === 'stabilita' ? TESTS.stabilita.name + ' · ' + (r.eyes === 'chiusi' ? T('occhi chiusi') : T('occhi aperti')) : TESTS[r.test].name;
    const val = (r) => r.test === 'stabilita' ? fmt(r.m.area, 1) + ' cm²' : r.test === 'schiena' ? fmt(r.k, 0) + '°' : fmt(r.ap, 1) + '°';
    app.innerHTML = head(T('Postura'), T('Progressi'), T('Indice di stabilità nel tempo (più alto = più stabile).')) +
      '<div class="home-grid"><div><div class="card"><div class="toolbar">' + seg('eyes', EYES, prefs.eyes, T('Occhi')) + '</div>' + chart(st) + '</div>' +
      '<div class="card pz-report-card"><div><b>' + T('Report per il fisioterapista') + '</b><br><span class="small">' + T('Riepilogo delle misure e delle foto') + '</span></div><a class="btn primary" href="#/postura/report">' + T('Apri') + '</a></div></div><div>' +
      '<div class="card"><h3>' + T('Ultime misure') + '</h3>' + (all.length ? '<ul class="ts-hist">' + all.map((r) => '<li><span>' + label(r) + '<br><small class="muted">' + dateStr(r.t) + ' ' + timeStr(r.t) + ' · ' + (r.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + '</small></span><b>' + val(r) + '</b></li>').join('') + '</ul>' : '<p class="small muted">' + T('Nessuna misura ancora.') + '</p>') + '</div></div></div>' + NOTE;
    bindPrefs(app, () => renderProgress(app));
  }
  // Dati del report: stessi valori della pagina e del PDF
  function reportData() {
    const recs = records();
    const pick = (test, cond, f) => recs.filter((r) => r.test === test && r.cond === cond && (!f || f(r)));
    const R = (label, test, f, get, unit, d, better) => {
      const one = (cond) => { const l = pick(test, cond, f); if (!l.length) return null; const raw = mean(l.map(get)); return { raw, v: fmt(raw, d), n: l.length }; };
      return { label, unit, d, better, s: one('senza'), c: one('con') };
    };
    const rows = [
      R(T('Area di oscillazione, occhi aperti'), 'stabilita', (r) => r.eyes === 'aperti', (r) => r.m.area, 'cm²', 1, 'low'),
      R(T('Area di oscillazione, occhi chiusi'), 'stabilita', (r) => r.eyes === 'chiusi', (r) => r.m.area, 'cm²', 1, 'low'),
      R(T('Velocità media, occhi aperti'), 'stabilita', (r) => r.eyes === 'aperti', (r) => r.m.vel, 'mm/s', 1, 'low'),
      R(T('Inclinazione del tronco (avanti)'), 'tronco', null, (r) => r.ap, '°', 1, null),
      R(T('Inclinazione della testa (avanti)'), 'testa', null, (r) => r.ap, '°', 1, null),
      R(T('Curva dorsale stimata'), 'schiena', null, (r) => r.k, '°', 0, null),
    ];
    const st = recs.filter((r) => r.test === 'stabilita');
    const last = st[st.length - 1];
    const prev = last ? st.slice(0, -1).reverse().find((r) => r.eyes === last.eyes && r.mount === last.mount) : null;
    const condTxt = (c) => (c === 'con' ? T('con Equistasi') : T('senza Equistasi'));
    const label = (r) => r.test === 'stabilita' ? TESTS.stabilita.name + ' · ' + (r.eyes === 'chiusi' ? T('occhi chiusi') : T('occhi aperti')) : TESTS[r.test].name;
    const val = (r) => r.test === 'stabilita' ? T('indice {i} · {a} cm²', { i: index(r.m.area), a: fmt(r.m.area, 1) }) : r.test === 'schiena' ? fmt(r.k, 0) + '°' : fmt(r.ap, 1) + '° / ' + fmt(r.ml, 1) + '°';
    const photos = store.get(PHOTO_KEY, []).slice(-6).map((p) => {
      const kind = kindOf(p.view);
      const ref = kind === 'lato' ? p.pts.ank[0] : (p.pts.ankL[0] + p.pts.ankR[0]) / 2;
      const ms = (p.metrics && p.metrics.length ? p.metrics : photoMetrics(kind, p.pts, p.w, p.h)).slice(0, 4);
      const labOf = (m) => m.lab || (photoMetrics(kind, p.pts, p.w, p.h).find((x) => x.k === m.k) || {}).lab || m.k;
      return { thumb: p.thumb, w: p.w, h: p.h, pts: p.pts, lines: LINES[kind], ref, title: VIEWS[p.view] + ' · ' + dateStr(p.t) + ' · ' + condTxt(p.cond),
        metrics: ms.map((m) => ({ lab: labOf(m), val: fmt(m.v, 1) + '°', note: m.note || '' })) };
    });
    let name = ''; try { name = (localStorage.getItem('tp-name') || '').trim(); } catch (e) { /* storage non disponibile */ }
    let chair = [];
    try {
      chair = (JSON.parse(localStorage.getItem('tp-chair') || '[]') || []).slice(-6).reverse().map((r) => ({
        date: dateStr(r.t) + ' ' + timeStr(r.t), cond: condTxt(r.cond),
        val: r.mode === 'trenta' ? T('{n} alzate in 30 s', { n: r.count }) : (r.done ? T('5 alzate in {s} s', { s: fmt(r.time, 1) }) : T('{n} alzate su 5', { n: r.count })) }));
    } catch (e) { chair = []; }
    // test della sezione Progressi (profilo Sport): media senza e con Equistasi
    let tests = [];
    try { tests = JSON.parse(localStorage.getItem('tp-tests') || '[]') || []; } catch (e) { tests = []; }
    const S = (label, type, unit, d, better, f) => {
      const one = (cond) => { const l = tests.filter((r) => r.type === type && r.cond === cond && (!f || f(r))); if (!l.length) return null; const raw = mean(l.map((r) => r.value)); return { raw, v: fmt(raw, d), n: l.length }; };
      return { label, unit, d, better, s: one('senza'), c: one('con') };
    };
    const sport = [
      S(T('Equilibrio su una gamba (oscillazione)'), 'equilibrio', 'm/s²', 2, 'low'),
      S(T('Equilibrio in piedi (oscillazione)'), 'ortostasi', 'm/s²', 2, 'low'),
      S(T('Salto verticale'), 'salto', 'cm', 0, 'high'),
      S(T('Sprint 10 m'), 'sprint', 's', 2, 'low', (r) => /^10 m/.test(r.note || '')),
      S(T('Sprint 20 m'), 'sprint', 's', 2, 'low', (r) => /^20 m/.test(r.note || '')),
      S(T('Sprint 30 m'), 'sprint', 's', 2, 'low', (r) => /^30 m/.test(r.note || '')),
    ].filter((r) => r.s || r.c);
    return {
      sport,
      name, date: dateStr(Date.now()) + ' ' + new Date().getFullYear(),
      stability: last ? { value: index(last.m.area), area: fmt(last.m.area, 1), vel: fmt(last.m.vel, 1), eyes: EYES[last.eyes] + ' · ' + MOUNT[last.mount], cond: condTxt(last.cond),
        date: dateStr(last.t) + ' ' + timeStr(last.t), diff: prev ? index(last.m.area) - index(prev.m.area) : null } : null,
      rows, chart: st.filter((r) => r.eyes === 'aperti').slice(-20).map((r) => ({ v: index(r.m.area), con: r.cond === 'con' })),
      recent: recs.slice(-10).reverse().map((r) => ({ label: label(r), date: dateStr(r.t) + ' ' + timeStr(r.t), cond: condTxt(r.cond), val: val(r) })),
      photos, chair,
    };
  }

  function renderReport(app) {
    const data = reportData();
    const cell = (x, unit) => x ? '<b>' + x.v + ' ' + unit + '</b> <small class="muted">(' + x.n + ')</small>' : '<span class="muted">—</span>';
    const change = (r) => {
      if (!r.s || !r.c || !r.s.raw) return '<span class="muted">—</span>';
      const pct = Math.round((r.c.raw - r.s.raw) / Math.abs(r.s.raw) * 100);
      const good = r.better === 'low' ? pct <= 0 : pct >= 0;
      return '<b class="' + (r.better ? (good ? 'ok' : 'ko') : '') + '">' + (pct > 0 ? '+' : '') + pct + '%</b>';
    };
    const s = data.stability;
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    app.innerHTML = '<div class="pz-report">' + head(T('Report'), T('Report per il fisioterapista'), T('Riepilogo delle misure salvate su questo telefono, creato il {d}.', { d: data.date })) +
      '<div class="card pz-rep-actions"><div><b>' + T('Report in PDF') + '</b><br><span class="small muted">' + T('Un file impaginato con indice di stabilità, confronto senza e con Equistasi, grafico e foto, da inviare al fisioterapista.') + '</span></div>' +
      '<div class="btn-col"><button class="btn primary" type="button" id="pz-pdf">' + (native ? T('Condividi o salva il PDF') : T('Condividi il PDF')) + '</button>' +
      (native ? '' : '<button class="btn" type="button" id="pz-pdf-dl">' + T('Scarica il PDF') + '</button>') + '</div>' +
      '<p class="gate-msg" id="pz-pdf-msg" role="status"></p></div>' +
      (s ? '<div class="card pz-hero"><div class="pz-hero-top"><span>' + T('INDICE DI STABILITÀ') + '</span><span>' + s.date + '</span></div><div class="pz-hero-row"><b class="pz-rep-big">' + s.value + '<small>/100</small></b><div><b>' + s.eyes + ' · ' + s.cond + '</b><br><span>' + T('Area {a} cm² · velocità {v} mm/s', { a: s.area, v: s.vel }) + '</span>' +
        (s.diff != null ? '<span class="pz-pill">' + (s.diff >= 0 ? '+' : '') + s.diff + ' ' + T('rispetto alla misura precedente') + '</span>' : '') + '</div></div></div>' : '') +
      '<div class="card"><h3>' + T('Senza e con Equistasi') + '</h3><div class="pz-table-wrap"><table class="pz-table"><thead><tr><th>' + T('Misura') + '</th><th>' + T('Senza') + '</th><th>' + T('Con') + '</th><th>' + T('Variazione') + '</th></tr></thead><tbody>' +
      data.rows.map((r) => '<tr><th>' + r.label + '</th><td>' + cell(r.s, r.unit) + '</td><td>' + cell(r.c, r.unit) + '</td><td>' + change(r) + '</td></tr>').join('') +
      '</tbody></table></div><p class="small muted" style="margin:8px 0 0">' + T('Media delle prove (numero tra parentesi). Verde: valore migliorato con Equistasi; per l’oscillazione un valore più basso indica più stabilità.') + '</p></div>' +
      (data.sport.length ? '<div class="card"><h3>' + T('Test di progressi (sport)') + '</h3><div class="pz-table-wrap"><table class="pz-table"><thead><tr><th>' + T('Misura') + '</th><th>' + T('Senza') + '</th><th>' + T('Con') + '</th><th>' + T('Variazione') + '</th></tr></thead><tbody>' +
        data.sport.map((r) => '<tr><th>' + r.label + '</th><td>' + cell(r.s, r.unit) + '</td><td>' + cell(r.c, r.unit) + '</td><td>' + change(r) + '</td></tr>').join('') + '</tbody></table></div></div>' : '') +
      (data.photos.length ? '<div class="card"><h3>' + T('Foto della postura') + '</h3><div class="pz-photo-grid">' + store.get(PHOTO_KEY, []).slice(-6).map((p) => photoFigure(p, true)).join('') + '</div></div>' : '') +
      '<p class="small muted">' + T('Valori stimati con i sensori e la fotocamera del telefono, indicativi e non diagnostici. Area: ellisse al 95% dell’oscillazione stimata del corpo; velocità: percorso medio al secondo.') + '</p></div>';
    const msg = document.getElementById('pz-pdf-msg');
    const go = async (dl) => {
      const btns = app.querySelectorAll('#pz-pdf, #pz-pdf-dl'); btns.forEach((b) => { b.disabled = true; });
      msg.className = 'gate-msg'; msg.textContent = T('Preparo il PDF…');
      try {
        const blob = await window.EqReportPdf.make(reportData());
        const name = 'Equistasi-report-' + new Date().toISOString().slice(0, 10) + '.pdf';
        const how = await window.EqReportPdf.deliver(blob, name, dl);
        msg.className = 'ts-done'; msg.textContent = how === 'download' ? T('PDF scaricato: lo trovi nella cartella dei download.') : how === 'share' ? T('PDF pronto.') : '';
      } catch (e) {
        msg.className = 'gate-msg'; msg.textContent = T('Non è stato possibile creare il PDF. Riprova; se il problema continua, aggiorna l’app.');
      }
      btns.forEach((b) => { b.disabled = false; });
    };
    document.getElementById('pz-pdf').addEventListener('click', () => go(false));
    const dl = document.getElementById('pz-pdf-dl'); if (dl) dl.addEventListener('click', () => go(true));
  }

  /* ───────── Analisi da foto ───────── */
  const VIEWS = { davanti: T('Davanti'), lato: T('Di lato'), dietro: T('Da dietro') };
  const PTS = {
    fronte: { earL: 7, earR: 8, shL: 11, shR: 12, hipL: 23, hipR: 24, kneeL: 25, kneeR: 26, ankL: 27, ankR: 28 },
    latoL: { nose: 0, ear: 7, sh: 11, hip: 23, knee: 25, ank: 27 },
    latoR: { nose: 0, ear: 8, sh: 12, hip: 24, knee: 26, ank: 28 },
  };
  const PT_LABEL = { nose: T('Naso'), ear: T('Orecchio'), sh: T('Spalla'), hip: T('Anca'), knee: T('Ginocchio'), ank: T('Caviglia'),
    earL: T('Orecchio sx'), earR: T('Orecchio dx'), shL: T('Spalla sx'), shR: T('Spalla dx'), hipL: T('Anca sx'), hipR: T('Anca dx'), kneeL: T('Ginocchio sx'), kneeR: T('Ginocchio dx'), ankL: T('Caviglia sx'), ankR: T('Caviglia dx') };
  const LINES = {
    fronte: [['earL', 'earR'], ['shL', 'shR'], ['hipL', 'hipR'], ['shL', 'hipL'], ['shR', 'hipR'], ['hipL', 'kneeL'], ['kneeL', 'ankL'], ['hipR', 'kneeR'], ['kneeR', 'ankR']],
    lato: [['ear', 'sh'], ['sh', 'hip'], ['hip', 'knee'], ['knee', 'ank']],
  };
  // posizioni di partenza se il riconoscimento non trova la persona
  const DEFAULT = {
    fronte: { earL: [0.56, 0.1], earR: [0.44, 0.1], shL: [0.62, 0.2], shR: [0.38, 0.2], hipL: [0.58, 0.5], hipR: [0.42, 0.5], kneeL: [0.57, 0.7], kneeR: [0.43, 0.7], ankL: [0.56, 0.9], ankR: [0.44, 0.9] },
    lato: { nose: [0.56, 0.11], ear: [0.5, 0.1], sh: [0.5, 0.2], hip: [0.5, 0.5], knee: [0.51, 0.7], ank: [0.5, 0.9] },
  };

  let poseP = null;
  function loadPose() {
    if (!poseP) {
      poseP = (async () => {
        const base = new URL('js/vendor/mediapipe/', location.href).href;
        const vision = await import(base + 'vision_bundle.mjs');
        const files = await vision.FilesetResolver.forVisionTasks(base + 'wasm');
        return vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: base + 'pose_landmarker_lite.task', delegate: 'CPU' }, runningMode: 'IMAGE', numPoses: 1,
        });
      })();
      poseP.catch(() => { poseP = null; });
    }
    return poseP;
  }

  function photoMetrics(kind, P, w, h) {
    const px = (k) => ({ x: P[k][0] * w, y: P[k][1] * h });
    const tiltLine = (a, b) => { const A = px(a); const B = px(b); return deg(Math.atan2(Math.abs(A.y - B.y), Math.abs(A.x - B.x))); };
    const lowSide = (a, b) => (px(a).y > px(b).y ? T('più bassa a sinistra') : T('più bassa a destra'));
    const out = [];
    if (kind === 'fronte') {
      const mid = (a, b) => { const A = px(a); const B = px(b); return { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }; };
      out.push({ k: 'spalle', lab: T('Linea delle spalle'), v: tiltLine('shL', 'shR'), note: lowSide('shL', 'shR') });
      out.push({ k: 'bacino', lab: T('Linea del bacino'), v: tiltLine('hipL', 'hipR'), note: lowSide('hipL', 'hipR') });
      out.push({ k: 'testa', lab: T('Testa (inclinazione laterale)'), v: tiltLine('earL', 'earR'), note: px('earL').y > px('earR').y ? T('verso sinistra') : T('verso destra') });
      const S = mid('shL', 'shR'); const A = mid('ankL', 'ankR');
      const v = deg(Math.atan2(S.x - A.x, A.y - S.y));
      const towardL = Math.sign(S.x - A.x) === Math.sign(px('shL').x - px('shR').x);
      out.push({ k: 'tronco', lab: T('Tronco (spostamento laterale)'), v: Math.abs(v), note: Math.abs(v) < 0.5 ? T('centrato') : (towardL ? T('verso sinistra') : T('verso destra')) });
    } else {
      const E = px('ear'); const S = px('sh'); const H = px('hip'); const K = px('knee'); const A = px('ank'); const N = px('nose');
      const f = Math.sign(N.x - E.x) || 1; // verso in cui guarda la persona
      out.push({ k: 'testa', lab: T('Angolo testa–spalla'), v: deg(Math.atan2(S.y - E.y, Math.abs(E.x - S.x))), note: T('più alto = testa più allineata') });
      const al = deg(Math.atan2((E.x - A.x) * f, A.y - E.y));
      out.push({ k: 'allineamento', lab: T('Allineamento orecchio–caviglia'), v: Math.abs(al), note: al >= 0 ? T('in avanti') : T('indietro') });
      const tr = deg(Math.atan2((S.x - H.x) * f, H.y - S.y));
      out.push({ k: 'tronco', lab: T('Tronco (spalla–anca)'), v: Math.abs(tr), note: tr >= 0 ? T('in avanti') : T('indietro') });
      const a1 = Math.atan2(H.y - K.y, H.x - K.x); const a2 = Math.atan2(A.y - K.y, A.x - K.x);
      let inner = Math.abs(deg(a1 - a2)); if (inner > 180) inner = 360 - inner;
      const cross = ((H.x - A.x) * (K.y - A.y) - (H.y - A.y) * (K.x - A.x)) * f;
      out.push({ k: 'ginocchio', lab: T('Ginocchio'), v: 180 - inner, note: cross > 0 ? T('in flessione') : T('in estensione') });
    }
    return out;
  }
  const kindOf = (view) => (view === 'lato' ? 'lato' : 'fronte');

  function overlaySvg(p, editable) {
    const kind = kindOf(p.view);
    const w = p.w; const h = p.h; const r = Math.max(5, w / 60);
    const P = p.pts;
    const lines = LINES[kind].map(([a, b]) => '<line data-l="' + a + '-' + b + '" x1="' + P[a][0] * w + '" y1="' + P[a][1] * h + '" x2="' + P[b][0] * w + '" y2="' + P[b][1] * h + '" stroke="#29235C" stroke-width="' + (r / 2.2) + '" stroke-linecap="round"/>').join('');
    let ref = '';
    if (kind === 'lato') ref = '<line data-l="piombo" x1="' + P.ank[0] * w + '" y1="0" x2="' + P.ank[0] * w + '" y2="' + h + '" stroke="#1D71B8" stroke-width="' + (r / 3) + '" stroke-dasharray="' + r + ' ' + r + '"/>';
    else {
      const mx = ((P.ankL[0] + P.ankR[0]) / 2) * w;
      ref = '<line data-l="piombo" x1="' + mx + '" y1="0" x2="' + mx + '" y2="' + h + '" stroke="#1D71B8" stroke-width="' + (r / 3) + '" stroke-dasharray="' + r + ' ' + r + '"/>';
    }
    const dots = Object.keys(P).map((k) => '<circle data-k="' + k + '" cx="' + P[k][0] * w + '" cy="' + P[k][1] * h + '" r="' + (editable ? r * 1.3 : r) + '" fill="#FADC00" stroke="#1B1840" stroke-width="' + (r / 3) + '"' + (editable ? ' tabindex="0" role="button" aria-label="' + esc(T('Sposta il punto {p}', { p: PT_LABEL[k] })) + '"' : '') + '/>').join('');
    return '<svg class="pz-ov' + (editable ? ' edit' : '') + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="' + (editable ? 'false' : 'true') + '">' + ref + lines + dots + '</svg>';
  }
  function photoFigure(p, small) {
    return '<figure class="pz-photo' + (small ? ' small' : '') + '"><div class="pz-photo-box" style="aspect-ratio:' + p.w + '/' + p.h + '"><img src="' + p.thumb + '" alt="' + esc(T('Foto della postura, vista {v}', { v: VIEWS[p.view] })) + '">' + overlaySvg(p, false) + '</div>' +
      '<figcaption><b>' + VIEWS[p.view] + '</b> · ' + dateStr(p.t) + ' · ' + (p.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) +
      (p.level ? '<br><span class="' + (p.level.ok ? 'pz-lv-ok' : 'pz-lv-ko') + '">' + (p.level.ok ? T('✓ telefono dritto') : T('telefono inclinato: {r}° di lato, {p}° avanti/indietro', { r: Math.abs(p.level.roll).toFixed(0), p: Math.abs(p.level.pitch).toFixed(0) })) + '</span>' : '') + '</figcaption></figure>';
  }
  function metricsList(ms) {
    return '<ul class="ts-hist pz-ms">' + ms.map((m) => '<li><span>' + m.lab + '<br><small class="muted">' + m.note + '</small></span><b>' + fmt(m.v, 1) + '°</b></li>').join('') + '</ul>';
  }

  function renderPhoto(app) {
    const saved = store.get(PHOTO_KEY, []).slice().reverse();
    app.innerHTML = head(T('Postura'), T('Analisi da foto'), T('Scatta o carica una foto: troviamo i punti del corpo sul telefono e misuriamo gli angoli. Puoi spostare i punti a mano.')) +
      '<div class="home-grid"><div><div class="card">' +
      '<div class="toolbar">' + seg('view', VIEWS, prefs.view, T('Vista')) + '</div>' +
      '<div class="toolbar">' + seg('cond', COND, prefs.cond, T('Condizione')) + '</div>' +
      '<ol class="steps"><li>' + T('Persona in piedi, ferma, con abiti aderenti, su uno sfondo semplice. Piedi visibili.') + '</li>' +
      '<li>' + T('Telefono dritto, a circa <b>2,5 m</b> e all’altezza della vita. Inquadra tutto il corpo, dalla testa ai piedi.') + '</li>' +
      '<li>' + T('Usa sempre la stessa distanza, altezza e luce per confrontare le foto nel tempo.') + '</li>' +
      (liveCam ? '<li>' + T('Con <b>Scatta con la griglia</b>: scatta quando la griglia è <b>verde</b> (telefono dritto) e la persona sta tra la linea della <b>testa</b> e quella dei <b>piedi</b>, sulla linea centrale.') + '</li>' : '') + '</ol>' +
      '<div class="pz-photo-btns">' + (liveCam ? '<button type="button" class="btn primary" id="pz-live">' + ICON.foto + ' ' + T('Scatta con la griglia') + '</button>' : '<label class="btn primary">' + ICON.foto + ' ' + T('Scatta la foto') + '<input type="file" accept="image/*" capture="environment" id="pz-cam" hidden></label>') +
      '<label class="btn">' + T('Carica dalla galleria') + '<input type="file" accept="image/*" id="pz-gal" hidden></label></div>' +
      '<p class="gate-msg" id="pz-msg" role="alert"></p><div id="pz-work"></div></div></div><div>' +
      '<div class="card"><h3>' + T('Foto salvate') + '</h3>' + (saved.length ? '<div class="pz-photo-grid">' + saved.slice(0, 8).map((p) => photoFigure(p, true)).join('') + '</div><a class="btn" href="#/postura/fotoconfronto" style="margin-top:10px">' + T('Confronta prima e dopo') + '</a>' : '<p class="small muted" style="margin:0">' + T('Nessuna foto salvata.') + '</p>') + '</div>' +
      '</div></div>' + NOTE;
    bindPrefs(app, () => renderPhoto(app));
    ['pz-cam', 'pz-gal'].forEach((id) => { const el = document.getElementById(id); if (el) el.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (f) analyse(app, f); }); });
    const live = document.getElementById('pz-live'); if (live) live.addEventListener('click', () => openCamera(app));
  }

  /* ───────── Fotocamera con griglia e livella ─────────
     Linea di piombo al centro, terzi, linee per testa e piedi (stessa misura della persona in ogni foto)
     e livella con i sensori: verde quando il telefono è dritto (entro 2° di lato e 3° avanti/indietro).
     La foto salva anche l'inclinazione del telefono al momento dello scatto. */
  const liveCam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const LEVEL_ROLL = 2, LEVEL_PITCH = 3;
  async function openCamera(app) {
    // permesso ai sensori (iPhone): va chiesto con il tocco sul pulsante
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') { try { await DeviceMotionEvent.requestPermission(); } catch (e) { /* senza livella */ } }
    const el = document.createElement('div');
    el.className = 'pz-cam'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', T('Fotocamera con griglia'));
    el.innerHTML = '<video playsinline muted autoplay></video>' +
      '<svg class="pz-grid" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<line x1="33.33" y1="0" x2="33.33" y2="100"/><line x1="66.67" y1="0" x2="66.67" y2="100"/><line x1="0" y1="33.33" x2="100" y2="33.33"/><line x1="0" y1="66.67" x2="100" y2="66.67"/>' +
      '<line class="pz-plumb" x1="50" y1="0" x2="50" y2="100"/><line class="pz-head" x1="22" y1="17" x2="78" y2="17"/><line class="pz-feet" x1="22" y1="83" x2="78" y2="83"/></svg>' +
      '<span class="pz-cam-lab pz-cam-head">' + T('Testa') + '</span><span class="pz-cam-lab pz-cam-feet">' + T('Piedi') + '</span>' +
      '<div class="pz-horizon" aria-hidden="true"><i></i></div>' +
      '<div class="pz-cam-top"><b class="pz-level-txt" aria-live="polite">' + T('Livella in attesa dei sensori…') + '</b><span class="small">' + T('Persona tra la linea della testa e quella dei piedi, sulla linea centrale') + '</span></div>' +
      '<div class="pz-cam-count" hidden></div>' +
      '<div class="pz-cam-bar"><button type="button" class="btn pz-cam-x">' + T('Annulla') + '</button>' +
      '<button type="button" class="pz-shutter" aria-label="' + esc(T('Scatta')) + '"></button>' +
      '<button type="button" class="btn pz-cam-timer" aria-pressed="false">' + T('Autoscatto 5 s') + '</button></div>';
    document.body.appendChild(el);
    const video = el.querySelector('video'); const txt = el.querySelector('.pz-level-txt'); const hor = el.querySelector('.pz-horizon');
    let stream = null; let level = null; let timer = false; let busy = false; let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      window.removeEventListener('devicemotion', onMotion);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      el.remove();
    };
    // gravità filtrata → inclinazione di lato (roll) e avanti/indietro (pitch), con il telefono in verticale
    let gx = 0, gy = 0, gz = 0, n = 0;
    function onMotion(e) {
      const a = e.accelerationIncludingGravity || {};
      if (a.x == null) return;
      const k = n++ ? 0.15 : 1; gx += (a.x - gx) * k; gy += (a.y - gy) * k; gz += (a.z - gz) * k;
      const sgn = gy < 0 ? -1 : 1; // su alcuni telefoni i segni sono invertiti
      const x = gx * sgn, y = gy * sgn, z = gz * sgn;
      const roll = Math.atan2(-x, y) * 180 / Math.PI;     // positivo = parte alta verso destra
      const pitch = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI; // positivo = schermo verso l'alto (fotocamera verso il basso)
      level = { roll: Math.round(roll * 10) / 10, pitch: Math.round(pitch * 10) / 10 };
      const ok = Math.abs(roll) <= LEVEL_ROLL && Math.abs(pitch) <= LEVEL_PITCH;
      el.classList.toggle('ok', ok);
      hor.style.transform = 'rotate(' + (-roll).toFixed(1) + 'deg)';
      const parts = [];
      if (Math.abs(roll) > LEVEL_ROLL) parts.push(T('storto di {v}° verso {d}', { v: Math.abs(roll).toFixed(0), d: roll > 0 ? T('destra') : T('sinistra') }));
      if (Math.abs(pitch) > LEVEL_PITCH) parts.push(pitch > 0 ? T('fotocamera verso il basso di {v}°: porta in avanti la parte alta del telefono', { v: Math.abs(pitch).toFixed(0) }) : T('fotocamera verso l’alto di {v}°: porta indietro la parte alta del telefono', { v: Math.abs(pitch).toFixed(0) }));
      txt.textContent = ok ? T('✓ Telefono dritto') : T('Raddrizza il telefono: {p}', { p: parts.join(', ') });
    }
    window.addEventListener('devicemotion', onMotion);
    el.querySelector('.pz-cam-x').addEventListener('click', close);
    const tb = el.querySelector('.pz-cam-timer');
    tb.addEventListener('click', () => { timer = !timer; tb.setAttribute('aria-pressed', String(timer)); tb.classList.toggle('on', timer); });
    el.querySelector('.pz-shutter').addEventListener('click', async () => {
      if (busy || !video.videoWidth) return; busy = true;
      if (timer) {
        const cd = el.querySelector('.pz-cam-count'); cd.hidden = false;
        for (let i = 5; i > 0 && !closed; i--) { cd.textContent = i; beep(660, 100); await wait(1000); }
        cd.hidden = true; if (closed) return;
      }
      beep(1200, 80);
      // ritaglio della parte visibile sullo schermo (video a tutto schermo, object-fit: cover), così la griglia corrisponde alla foto
      const vw = video.videoWidth, vh = video.videoHeight, cw = el.clientWidth, ch = el.clientHeight;
      const sc = Math.max(cw / vw, ch / vh); const sw = cw / sc, sh = ch / sc;
      const c = document.createElement('canvas'); c.width = Math.round(sw); c.height = Math.round(sh);
      c.getContext('2d').drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, c.width, c.height);
      const shot = level ? Object.assign({ ok: Math.abs(level.roll) <= LEVEL_ROLL && Math.abs(level.pitch) <= LEVEL_PITCH }, level) : null;
      c.toBlob((blob) => { close(); if (blob) analyse(app, blob, shot); }, 'image/jpeg', 0.92);
    });
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (closed) { stream.getTracks().forEach((t) => t.stop()); return; }
      video.srcObject = stream; video.play().catch(() => {});
    } catch (e) {
      close();
      const m = document.getElementById('pz-msg'); if (m) { m.className = 'gate-msg'; m.textContent = T('Non riusciamo ad aprire la fotocamera: consenti l’accesso oppure carica una foto dalla galleria.'); }
    }
  }

  function fileToImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }
  function scaled(img, max, q) {
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, url: q ? c.toDataURL('image/jpeg', q) : null };
  }

  async function analyse(app, file, level) {
    const msg = document.getElementById('pz-msg'); const work = document.getElementById('pz-work');
    msg.className = 'gate-msg'; msg.textContent = T('Analisi della foto in corso…');
    let loaded;
    try { loaded = await fileToImage(file); } catch (e) { msg.textContent = T('Non riusciamo ad aprire questa foto. Prova con un’altra.'); return; }
    const view = prefs.view; const kind = kindOf(view);
    const work1 = scaled(loaded.img, 1280);
    const thumb = scaled(loaded.img, 560, 0.72);
    URL.revokeObjectURL(loaded.url);
    let pts = null;
    try {
      const pose = await loadPose();
      const res = pose.detect(work1.canvas);
      const L = res && res.landmarks && res.landmarks[0];
      if (L) {
        let map = PTS.fronte;
        if (kind === 'lato') {
          const vis = (ids) => ids.reduce((a, i) => a + (L[i].visibility || 0), 0);
          map = vis([7, 11, 23, 25, 27]) >= vis([8, 12, 24, 26, 28]) ? PTS.latoL : PTS.latoR;
        }
        pts = {};
        Object.keys(map).forEach((k) => { pts[k] = [Math.min(1, Math.max(0, L[map[k]].x)), Math.min(1, Math.max(0, L[map[k]].y))]; });
      }
    } catch (e) { pts = null; }
    const found = !!pts;
    if (!pts) pts = JSON.parse(JSON.stringify(DEFAULT[kind]));
    const p = { id: Date.now().toString(36), t: Date.now(), view, cond: prefs.cond, w: thumb.canvas.width, h: thumb.canvas.height, thumb: thumb.url, pts };
    if (level) p.level = level;
    msg.className = found ? 'ts-done' : 'gate-msg';
    msg.textContent = (found ? T('Punti trovati. Controllali e, se serve, trascinali nella posizione giusta.') : T('Non abbiamo trovato la persona: trascina i punti a mano sulla foto.')) +
      (level && !level.ok ? ' ' + T('Attenzione: il telefono era inclinato ({r}° di lato, {p}° avanti/indietro), gli angoli possono essere meno precisi.', { r: Math.abs(level.roll).toFixed(0), p: Math.abs(level.pitch).toFixed(0) }) : '');
    editor(app, work, p);
    work.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function editor(app, work, p) {
    const draw = () => {
      work.innerHTML = '<div class="pz-photo-box edit" style="aspect-ratio:' + p.w + '/' + p.h + '"><img src="' + p.thumb + '" alt="">' + overlaySvg(p, true) + '</div>' +
        '<div id="pz-ms">' + metricsList(photoMetrics(kindOf(p.view), p.pts, p.w, p.h)) + '</div>' +
        '<div class="btn-col"><button class="btn primary" type="button" id="pz-save">' + T('Salva la foto e le misure') + '</button><button class="btn" type="button" id="pz-cancel">' + T('Annulla') + '</button></div>';
      bindDrag();
      document.getElementById('pz-save').addEventListener('click', save);
      document.getElementById('pz-cancel').addEventListener('click', () => renderPhoto(app));
    };
    const refresh = () => {
      const svg = work.querySelector('svg.pz-ov');
      Object.keys(p.pts).forEach((k) => { const c = svg.querySelector('[data-k="' + k + '"]'); c.setAttribute('cx', p.pts[k][0] * p.w); c.setAttribute('cy', p.pts[k][1] * p.h); });
      svg.querySelectorAll('line[data-l]').forEach((l) => {
        const [a, b] = l.dataset.l.split('-');
        if (l.dataset.l === 'piombo') { const x = (p.view === 'lato' ? p.pts.ank[0] : (p.pts.ankL[0] + p.pts.ankR[0]) / 2) * p.w; l.setAttribute('x1', x); l.setAttribute('x2', x); return; }
        l.setAttribute('x1', p.pts[a][0] * p.w); l.setAttribute('y1', p.pts[a][1] * p.h); l.setAttribute('x2', p.pts[b][0] * p.w); l.setAttribute('y2', p.pts[b][1] * p.h);
      });
      document.getElementById('pz-ms').innerHTML = metricsList(photoMetrics(kindOf(p.view), p.pts, p.w, p.h));
    };
    const bindDrag = () => {
      const svg = work.querySelector('svg.pz-ov');
      let cur = null;
      const toPt = (ev) => { const r = svg.getBoundingClientRect(); return [Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height))]; };
      svg.addEventListener('pointerdown', (ev) => {
        const c = ev.target.closest('[data-k]'); if (!c) return;
        cur = c.dataset.k; svg.setPointerCapture(ev.pointerId); ev.preventDefault();
      });
      svg.addEventListener('pointermove', (ev) => { if (!cur) return; p.pts[cur] = toPt(ev); refresh(); });
      const end = () => { cur = null; };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
      // da tastiera: frecce per spostare il punto selezionato
      svg.addEventListener('keydown', (ev) => {
        const c = ev.target.closest('[data-k]'); if (!c) return;
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key]; if (!d) return;
        ev.preventDefault(); const k = c.dataset.k;
        p.pts[k] = [Math.min(1, Math.max(0, p.pts[k][0] + d[0] * 0.005)), Math.min(1, Math.max(0, p.pts[k][1] + d[1] * 0.005))]; refresh();
      });
    };
    const save = () => {
      p.metrics = photoMetrics(kindOf(p.view), p.pts, p.w, p.h).map((m) => ({ k: m.k, v: Math.round(m.v * 10) / 10, note: m.note }));
      let all = store.get(PHOTO_KEY, []); all.push(p); all = all.slice(-24);
      while (!store.set(PHOTO_KEY, all) && all.length > 1) all.shift();
      renderPhoto(app);
      const m = document.getElementById('pz-msg'); m.className = 'ts-done'; m.textContent = T('Foto e misure salvate sul telefono.');
    };
    draw();
  }

  function renderPhotoCompare(app, a, b) {
    const photos = store.get(PHOTO_KEY, []);
    const pa = photos.find((p) => p.id === a); const pb = photos.find((p) => p.id === b);
    if (pa && pb) {
      const ma = photoMetrics(kindOf(pa.view), pa.pts, pa.w, pa.h); const mb = photoMetrics(kindOf(pb.view), pb.pts, pb.w, pb.h);
      app.innerHTML = head(T('Postura'), T('Foto prima e dopo'), VIEWS[pa.view]) +
        '<div class="card"><div class="pz-cmps">' + photoFigure(pa) + photoFigure(pb) + '</div>' +
        '<table class="pz-table"><thead><tr><th>' + T('Misura') + '</th><th>' + dateStr(pa.t) + '</th><th>' + dateStr(pb.t) + '</th></tr></thead><tbody>' +
        ma.map((m, i) => '<tr><th>' + m.lab + '</th><td>' + fmt(m.v, 1) + '°</td><td><b>' + fmt(mb[i].v, 1) + '°</b></td></tr>').join('') + '</tbody></table>' +
        '<p class="small muted">' + T('Valori indicativi: dipendono da come è scattata la foto. Usa sempre la stessa distanza, altezza e luce.') + '</p></div>' +
        '<a class="btn" href="#/postura/fotoconfronto">' + T('Scegli altre foto') + '</a>';
      return;
    }
    const groups = Object.keys(VIEWS).map((v) => ({ v, list: photos.filter((p) => p.view === v) })).filter((g) => g.list.length);
    app.innerHTML = head(T('Postura'), T('Foto prima e dopo'), T('Scegli due foto con la stessa vista: la prima è il «prima», la seconda il «dopo».')) +
      (groups.length ? groups.map((g) => '<div class="card"><h3>' + VIEWS[g.v] + '</h3><div class="pz-photo-grid pick">' + g.list.slice().reverse().map((p) =>
        '<button type="button" class="pz-pick" data-id="' + p.id + '" data-v="' + p.view + '" aria-pressed="false">' + photoFigure(p, true) + '</button>').join('') + '</div></div>').join('') +
        '<p class="gate-msg" id="pz-msg" role="alert"></p>'
        : '<div class="card"><p class="small muted">' + T('Servono almeno due foto salvate con la stessa vista.') + '</p><a class="btn primary" href="#/postura/foto">' + T('Vai all’analisi da foto') + '</a></div>');
    let sel = [];
    app.querySelectorAll('.pz-pick').forEach((btn) => btn.addEventListener('click', () => {
      if (sel.length && photos.find((p) => p.id === sel[0]).view !== btn.dataset.v) sel = [];
      sel = sel.includes(btn.dataset.id) ? sel.filter((x) => x !== btn.dataset.id) : sel.concat(btn.dataset.id).slice(-2);
      app.querySelectorAll('.pz-pick').forEach((b) => b.setAttribute('aria-pressed', String(sel.includes(b.dataset.id))));
      if (sel.length === 2) {
        const [x, y] = sel.map((id) => photos.find((p) => p.id === id)).sort((m, n) => m.t - n.t);
        location.hash = '#/postura/fotoconfronto/' + x.id + '/' + y.id;
      } else document.getElementById('pz-msg').textContent = T('Scegli la seconda foto.');
    }));
  }

  function render(app, arg, arg2, arg3) {
    if (stopRec) stopRec();
    if (window.speechSynthesis) try { window.speechSynthesis.cancel(); } catch (e) { /* */ }
    if (arg === 'stabilita') renderStability(app);
    else if (arg === 'tronco' || arg === 'testa' || arg === 'schiena') renderStatic(app, arg);
    else if (arg === 'risultato') renderResult(app, arg2);
    else if (arg === 'confronto') renderCompare(app);
    else if (arg === 'progressi') renderProgress(app);
    else if (arg === 'report') renderReport(app);
    else if (arg === 'foto') renderPhoto(app);
    else if (arg === 'fotoconfronto') renderPhotoCompare(app, arg2, arg3);
    else renderHome(app);
  }

  // usato dal telecomando dell'Apple Watch (js/remote.js)
  const setPrefs = (o) => { Object.assign(prefs, o); savePrefs(); };
  const lastRecord = () => records().slice(-1)[0] || null;
  window.EqPosture = { render, cardHtml, setPrefs, lastRecord, index, _sway: sway, _tilt: tilt, _photoMetrics: photoMetrics, _index: index };
})();
