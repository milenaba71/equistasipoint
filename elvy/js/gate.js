/* Elvy · accesso con il numero di serie del dispositivo.
   La schermata iniziale mostra il dispositivo disegnato (fronte con il logo, retro con il codice a barre):
   toccando il codice a barre si apre la fotocamera dentro il disegno e si legge il seriale
   (codice a barre oppure caratteri stampati, anche lettere e numeri, es. EQX25001801).
   Il seriale si verifica sulla tabella Airtable «Abbinamento Kit» con lo stesso webhook Make di
   Equistasi Point (../js/config.js → verifyUrl): l'app riceve solo {"valid": true/false}. */
(function () {
  const KEY = 'elvy-serial';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memoria non disponibile */ } },
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // maiuscole, solo lettere, cifre e trattino
  const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  const looksSerial = (t) => /^[A-Z0-9-]{5,24}$/.test(norm(t)) && /\d/.test(t);
  // particelle nei colori Elvy: verde acqua, viola, verde chiaro, bianco
  const COLORS = [[127, 214, 209], [196, 166, 242], [75, 166, 163], [255, 255, 255]];

  /* ───────── Un dispositivo, un telefono (come Equistasi Point) ───────── */
  // Codice casuale del telefono, creato al primo avvio. Stessa chiave di Equistasi Point:
  // sullo stesso telefono e nello stesso sito le due app contano come un solo telefono.
  const PHONE_KEY = 'eq-phone-id';
  function phoneId() {
    let id = store.get(PHONE_KEY, null);
    if (!id) {
      id = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('-');
      store.set(PHONE_KEY, id);
    }
    return id;
  }
  const lockOn = () => { const c = window.APP_CONFIG || {}; return !!(c.supabaseUrl && c.supabaseKey); };
  // pair_device: { valid, access, status: ok | other_phone | moved | limit }
  async function pairDevice(serial, move) {
    const c = window.APP_CONFIG;
    const h = { apikey: c.supabaseKey, 'Content-Type': 'application/json' };
    if (!c.supabaseKey.startsWith('sb_')) h.Authorization = 'Bearer ' + c.supabaseKey; // chiave anon «legacy»
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(c.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/pair_device', { method: 'POST', headers: h, body: JSON.stringify({ p_serial: serial, p_phone: phoneId(), p_move: !!move }), cache: 'no-store', signal: ctrl.signal });
      if (!r.ok) throw new Error('net');
      return await r.json();
    } finally { clearTimeout(t); }
  }
  let last = null; // esito dell'ultima verifica: { ok, reason }
  // Verifica del seriale: con Supabase anche il telefono attivo; senza, il webhook Make
  async function check(serial) {
    if (lockOn()) {
      const d = await pairDevice(serial, false);
      if (!d || !d.valid) return (last = { ok: false, reason: 'invalid' });
      if (d.access === false) return (last = { ok: false, reason: 'noaccess' });
      if (d.status === 'other_phone') return (last = { ok: false, reason: 'other' });
      return (last = { ok: true });
    }
    return (last = { ok: await verifyMake(serial) });
  }
  const verify = async (serial) => (await check(serial)).ok;

  async function verifyMake(serial) {
    const url = (window.APP_CONFIG || {}).verifyUrl;
    if (!url) throw new Error('config');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'serial=' + encodeURIComponent(serial), { signal: ctrl.signal, cache: 'no-store' });
      const data = await r.json();
      return !!data && (data.valid === true || data.valid === 'true');
    } finally { clearTimeout(t); }
  }

  const BARS = '<svg viewBox="0 0 64 26" aria-hidden="true"><path d="M2 1v24M5 1v24M7 1v24M11 1v24M13 1v24M17 1v24M20 1v24M22 1v24M26 1v24M29 1v24M31 1v24M35 1v24M38 1v24M42 1v24M44 1v24M47 1v24M51 1v24M53 1v24M57 1v24M59 1v24M62 1v24" stroke="currentColor" stroke-width="1.7"/></svg>';
  const IDLE = 'Tocca qui e abbina il dispositivo';
  // dopo questo tempo senza lettura la fotocamera si chiude e compare il seriale da scrivere a mano
  const READ_TIMEOUT = 25000;
  const DOTS = '• • • • • • • • • • •';

  // Il dispositivo in 3D: si vede il retro (codice a barre, seriale, CE); quando è abbinato gira e mostra
  // il fronte con il logo Elvy, con il numero di serie sotto.
  // mode: 'back' = retro da toccare per leggere il codice · 'flip' = retro che gira sul fronte · 'front' = fronte
  function deviceHtml(sn, mode) {
    mode = mode || (sn ? 'front' : 'back');
    const back = '<div class="dev-face dev-back">' +
      (mode === 'back' ? '<button type="button" class="dev-win" id="g-scan" aria-label="Inquadra il codice a barre del dispositivo"><span class="dev-idle">' + BARS + '<span id="g-win">' + IDLE + '</span></span></button>'
        : '<div class="dev-win done">' + BARS + '</div>') +
      '<span class="dev-row"><span class="dev-sn" id="g-sn">' + (sn ? esc(sn) : DOTS) + '</span><span class="dev-ce" aria-hidden="true">CE</span></span></div>';
    const front = '<div class="dev-face dev-front" aria-hidden="true"><div class="dev-logo"><svg class="dev-waves" viewBox="0 0 120 50" aria-hidden="true">' +
      Array.from({ length: 9 }, (_, i) => '<path d="M0 ' + (18 + i * 1.6) + ' C30 ' + (6 + i * 3) + ', 60 ' + (40 - i * 3) + ', 120 ' + (22 + i) + '" />').join('') +
      '</svg><img src="img/logo-e.png" alt="" /><span>Elvy</span></div><i class="dev-shine"></i></div>';
    return '<div class="dev3d is-' + mode + '" id="dev"><div class="dev-card">' + back + front + '</div></div>' +
      (sn ? '<div class="dev-under"><span>Numero di serie</span><b>' + esc(sn) + '</b></div>' : '');
  }
  // Fa girare il dispositivo disegnato (dopo che è comparso, così l'animazione parte)
  function flip(el) { requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('go'))); }

  /* Schermata di attivazione. onDone(serial) quando il dispositivo è abbinato. */
  function show($app, onDone) {
    document.body.classList.add('gated');
    $app.innerHTML = '<form class="gate" id="g-form" novalidate>' +
      '<img class="gate-mark" src="img/logo-elvy.png" alt="Elvy" />' +
      '<h1>Attiva Elvy</h1>' +
      (store.get('elvy-lost', null) ? '<div class="gate-fail" style="margin-top:14px">' + (store.get('elvy-lost') === 'other' ? 'Il tuo Elvy è stato attivato su un altro telefono o computer, quindi qui è stato scollegato. Un dispositivo funziona su un solo telefono alla volta: per usarlo qui abbinalo di nuovo.' : 'Il dispositivo non risulta più valido. Per informazioni scrivi a Equistasi.') + ' I tuoi risultati restano su questo telefono.</div>' : '') +
      '<p class="gate-lead">Prendi il dispositivo e inquadra il <b>retro</b>: il codice a barre o il numero di serie. Elvy si abbina all\'app.</p>' +
      deviceHtml('') +
      '<div class="gate-bar" id="g-bar" hidden><button type="button" class="btn small ghost" id="g-torch" hidden>Luce</button><button type="button" class="btn small ghost" id="g-cancel">Annulla</button></div>' +
      '<div class="actions" id="g-start"><button class="btn" type="button" id="g-pair">Abbina il dispositivo</button></div>' +
      // il seriale a mano compare solo se la fotocamera non riesce a leggere il codice
      '<div id="g-manual" hidden><p class="gate-fail" id="g-fail" role="alert"></p>' +
      '<label class="field" style="margin-top:0"><span>Numero di serie</span><input id="g-serial" inputmode="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="es. EQX25001801" maxlength="30" /></label>' +
      '<p class="err" id="g-msg" role="alert"></p>' +
      '<button class="btn" id="g-btn" type="submit">Accedi</button>' +
      '<button class="btn ghost" id="g-retry" type="button" style="margin-top:12px">Riprova con la fotocamera</button>' +
      '<p class="note" style="text-align:center;margin-top:16px">Il numero di serie è stampato sul retro del dispositivo, sotto il codice a barre. Problemi con il codice? Scrivi a Equistasi.</p></div>' +
      '</form>';

    const form = document.getElementById('g-form');
    const input = document.getElementById('g-serial');
    const msg = document.getElementById('g-msg');
    const btn = document.getElementById('g-btn');
    const dev = document.getElementById('dev');
    const win = document.getElementById('g-scan');
    const winLabel = document.getElementById('g-win');
    const sn = document.getElementById('g-sn');
    const bar = document.getElementById('g-bar');
    const setWin = (label, cls) => { winLabel.textContent = label; dev.classList.remove('read', 'paired'); if (cls) dev.classList.add(cls); };
    document.getElementById('g-cancel').onclick = () => window.EqScan && window.EqScan.stop();
    const manual = document.getElementById('g-manual');
    function showManual(why, value) {
      document.getElementById('g-fail').textContent = why;
      if (value) input.value = value;
      msg.textContent = '';
      manual.hidden = false; document.getElementById('g-start').hidden = true;
      manual.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    const CAM_ERR = (e) => (e && e.message === 'denied'
      ? 'La fotocamera non è consentita. Scrivi il numero di serie stampato sul retro del dispositivo.'
      : 'Non riesco ad aprire la fotocamera. Scrivi il numero di serie stampato sul retro del dispositivo.');
    const NOACCESS = 'Questo dispositivo non si usa con l\'app Elvy. Per informazioni scrivi a Equistasi.';
    // Il dispositivo è attivo su un altro telefono o computer: si può spostare qui (massimo 3 volte in 30 giorni)
    function askMove(serial) {
      const box = document.createElement('div'); box.className = 'move-ov';
      box.innerHTML = '<div class="move-box" role="dialog" aria-modal="true"><img src="img/punta.jpg" alt="" class="move-face" />' +
        '<h2>Elvy è già attivo su un altro telefono</h2><p class="muted" style="margin-top:8px">Il dispositivo <b>' + esc(serial) + '</b> funziona su <b>un solo telefono o computer alla volta</b>. Vuoi spostarlo su questo? L\'altro verrà scollegato. Puoi spostarlo al massimo 3 volte in 30 giorni.</p>' +
        '<p class="err" id="mv-msg"></p><div class="actions"><button class="btn" id="mv-go" type="button">Sposta su questo telefono</button><button class="btn ghost" id="mv-x" type="button">Annulla</button></div></div>';
      document.body.appendChild(box);
      const close = () => box.remove();
      box.querySelector('#mv-x').onclick = () => { close(); setWin(IDLE); sn.textContent = DOTS; };
      box.querySelector('#mv-go').onclick = async () => {
        const b = box.querySelector('#mv-go'); const m = box.querySelector('#mv-msg'); b.disabled = true; b.textContent = 'Sposto Elvy…';
        try {
          const d = await pairDevice(serial, true);
          if (d && d.valid && (d.status === 'moved' || d.status === 'ok')) { close(); store.set(KEY, { serial, at: Date.now() }); store.set('elvy-lost', null); showPaired($app, serial, onDone); return; }
          m.textContent = d && d.status === 'limit' ? 'Hai già spostato questo dispositivo 3 volte negli ultimi 30 giorni. Per sbloccarlo scrivi a Equistasi.' : 'Spostamento non riuscito.';
        } catch (e) { m.textContent = 'Impossibile collegarsi ora. Controlla la connessione e riprova.'; }
        b.disabled = false; b.textContent = 'Sposta su questo telefono';
      };
    }
    const NO_READ = 'Non riesco a leggere il codice. Scrivi il numero di serie stampato sul retro del dispositivo, sotto il codice a barre.';
    document.getElementById('g-pair').onclick = () => win.click();
    document.getElementById('g-retry').onclick = () => win.click();

    win.addEventListener('click', async () => {
      if (dev.classList.contains('scanning') || !window.EqScan) return;
      msg.textContent = ''; setWin(IDLE); sn.textContent = DOTS;
      let timedOut = false;
      const timer = setTimeout(() => { timedOut = true; window.EqScan.stop(); }, READ_TIMEOUT);
      // abbinamento a tutto schermo in stile Apple Watch (con «riduci movimento» resta la lettura nel disegno)
      if (window.EqPair && !window.EqPair.reduced()) {
        dev.classList.add('scanning');
        try {
          const r = await window.EqPair.run({
            accept: looksSerial, norm, verify, theme: 'elvy', colors: COLORS, ring: ['#7FD6D1', '#C4A6F2'], ok: [75, 166, 163], hold: 2600,
            hint: 'Inquadra il codice a barre o il numero di serie sul retro di Elvy', scan: { ocr: 'alnum', prefixes: ['EQX'] },
          });
          if (!r) { if (timedOut) showManual(NO_READ); return; }
          if (r.ok) { store.set(KEY, { serial: r.serial, at: Date.now() }); store.set('elvy-lost', null); showPaired($app, r.serial, onDone); return; }
          if (last && last.reason === 'other') { askMove(r.serial); return; }
          if (last && last.reason === 'noaccess') { showManual(NOACCESS, r.serial); return; }
          showManual(r.error === 'net'
            ? 'Impossibile verificare ora: controlla la connessione. Puoi riprovare o confermare il numero di serie qui sotto.'
            : 'Il codice letto non è stato riconosciuto. Controlla il numero di serie stampato sul retro e correggilo qui sotto.', r.serial);
        } catch (e) {
          showManual(CAM_ERR(e));
        } finally { clearTimeout(timer); dev.classList.remove('scanning'); }
        return;
      }
      dev.classList.add('scanning'); bar.hidden = false;
      try {
        const text = await window.EqScan.open({ container: win, torch: document.getElementById('g-torch'), accept: looksSerial, ocr: 'alnum', prefixes: ['EQX'], colors: COLORS });
        if (!text) { if (timedOut) showManual(NO_READ); return; }
        const serial = norm(text);
        sn.textContent = serial; input.value = serial;
        setWin('Abbinamento in corso…', 'read');
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
      } catch (e) {
        showManual(CAM_ERR(e));
      } finally {
        clearTimeout(timer); dev.classList.remove('scanning'); bar.hidden = true;
      }
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const serial = norm(input.value);
      msg.className = 'err';
      if (serial.length < 5) { msg.textContent = 'Scrivi il numero di serie completo.'; input.focus(); return; }
      btn.disabled = true; btn.textContent = 'Verifica in corso…'; msg.textContent = '';
      try {
        if (await verify(serial)) {
          store.set(KEY, { serial, at: Date.now() }); store.set('elvy-lost', null);
          sn.textContent = serial; setWin('✓ Abbinato', 'paired');
          if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
          setTimeout(() => showPaired($app, serial, onDone), 900);
          return;
        }
        setWin(IDLE); sn.textContent = DOTS;
        if (last && last.reason === 'other') { btn.disabled = false; btn.textContent = 'Accedi'; askMove(serial); return; }
        if (last && last.reason === 'noaccess') { if (manual.hidden) showManual(NOACCESS, serial); else msg.textContent = NOACCESS; btn.disabled = false; btn.textContent = 'Accedi'; return; }
        // letto dalla fotocamera (riquadro manuale ancora nascosto): si apre il riquadro per correggerlo
        if (manual.hidden) showManual('Il codice letto non è stato riconosciuto. Controlla il numero di serie stampato sul retro e correggilo qui sotto.', serial);
        else msg.textContent = 'Numero di serie non riconosciuto. Controlla di averlo scritto bene (lettere e numeri, es. EQX25001801).';
      } catch (e) {
        const t = e.message === 'config' ? 'Servizio di verifica non configurato.' : 'Impossibile verificare ora. Controlla la connessione e riprova.';
        setWin(IDLE);
        if (manual.hidden) showManual(t, serial); else msg.textContent = t;
      }
      btn.disabled = false; btn.textContent = 'Accedi';
    });
  }

  // Nome registrato in Airtable per il kit di questo seriale (webhook nameUrl). Se manca, se la rete
  // è lenta o se il kit è di un'azienda o di un evento, la mascotte saluta senza nome.
  function cleanName(n) {
    n = String(n || '').replace(/[^A-Za-zÀ-ÿ' .-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
    if (n.length < 2) return '';
    // TUTTO MAIUSCOLO o minuscolo → Iniziali Maiuscole
    if (n === n.toUpperCase() || n === n.toLowerCase()) n = n.toLowerCase().replace(/(^|[ '-])(\S)/g, (m, a, b) => a + b.toUpperCase());
    return n;
  }
  async function ownerName(serial) {
    const url = (window.APP_CONFIG || {}).nameUrl;
    const saved = store.get('elvy-owner', null);
    if (saved && saved.serial === serial) return saved.name || '';
    if (!url) return '';
    const ctrl = 'AbortController' in window ? new AbortController() : null;
    const to = setTimeout(() => ctrl && ctrl.abort(), 5000);
    try {
      const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'serial=' + encodeURIComponent(serial), { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined });
      const txt = await r.text();
      let d = {}; try { d = JSON.parse(txt); } catch (e) { /* risposta non JSON */ }
      const name = cleanName(d.nome || d.name);
      store.set('elvy-owner', { serial, name });
      return name;
    } catch (e) { return ''; } finally { clearTimeout(to); }
  }

  function showPaired($app, serial, onDone) {
    $app.innerHTML = '<div class="gate">' +
      '<img class="gate-mark" src="img/logo-elvy.png" alt="Elvy" />' +
      '<h1 style="margin-bottom:22px">Elvy è abbinato!</h1>' + deviceHtml(serial, 'flip') +
      '<div class="say" style="margin-top:22px"><img src="img/pollice.jpg" alt="" /><p id="g-hi">Perfetto! Il tuo dispositivo <b>' + esc(serial) + '</b> è collegato all\'app.</p></div>' +
      '<div class="actions"><button class="btn" id="g-go" type="button">Iniziamo</button></div></div>';
    flip(document.getElementById('dev'));
    if (navigator.vibrate) setTimeout(() => navigator.vibrate(30), 650);
    let gone = false;
    document.getElementById('g-go').onclick = () => { gone = true; if (window.speechSynthesis) speechSynthesis.cancel(); document.body.classList.remove('gated'); onDone(serial); };
    // la mascotte saluta per nome mentre il dispositivo si gira
    const t0 = Date.now();
    ownerName(serial).then((name) => {
      setTimeout(() => {
        const p = document.getElementById('g-hi');
        if (gone || !p) return;
        p.innerHTML = (name ? 'Ciao <b>' + esc(name) + '</b>! ' : 'Perfetto! ') + 'Il tuo dispositivo <b>' + esc(serial) + '</b> è collegato all\'app. Ora ti preparo i test.';
        const prof = store.get('elvy-profile', {}) || {};
        const S = window.ElvySensors;
        if (prof.mascotVoice !== false && S && S.voiceOn()) S.say((name ? 'Ciao ' + name + '! ' : 'Perfetto! ') + 'Il tuo Elvy è collegato. Ora ti preparo i test.', { pitch: 1.15 });
      }, Math.max(0, 1400 - (Date.now() - t0)));
    });
  }

  // Controllo del telefono attivo: all'avvio e quando si torna nell'app (al massimo ogni 5 minuti).
  // Se il dispositivo è passato su un altro telefono, qui viene scollegato. Senza rete si continua.
  let lastCheck = 0;
  async function recheck(onLost, force) {
    const sn = paired();
    if (!sn || !lockOn() || (!force && Date.now() - lastCheck < 5 * 60000)) return;
    lastCheck = Date.now();
    try {
      const d = await pairDevice(sn, false);
      const lost = !d || !d.valid ? 'invalid' : d.access === false ? 'invalid' : d.status === 'other_phone' ? 'other' : null;
      if (lost) { unpair(); store.set('elvy-lost', lost); onLost(lost); }
    } catch (e) { /* senza rete: si riprova più tardi */ }
  }
  const paired = () => { const v = store.get(KEY, null); return v && v.serial ? v.serial : null; };
  function unpair() { try { localStorage.removeItem(KEY); } catch (e) { /* */ } }

  window.ElvyGate = { show, paired, unpair, deviceHtml, flip, recheck, phoneId, owner: () => { const o = store.get('elvy-owner', null); return o && o.serial === paired() ? o.name || '' : ''; }, _norm: norm, _cleanName: cleanName };
})();
