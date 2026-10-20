/* "Alzati dalla sedia" (profilo Neurologico, funzione in prova): test della forza delle gambe con il telefono
   sul petto o in cintura. Due versioni note in letteratura: quante volte ti alzi in 30 secondi
   (30-second chair stand) e quanto tempo servono 5 alzate (five times sit-to-stand).
   Le alzate si riconoscono dall'accelerazione verticale: usiamo il modulo dell'accelerazione, che non
   cambia quando il busto si inclina, e lo integriamo per avere la velocità di salita e discesa.
   Sempre con una persona accanto; i risultati sono indicativi e restano sul telefono. */
(function () {
  const KEY = 'tp-chair';
  const BETA_KEY = 'tp-beta';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage non disponibile */ } },
  };
  const prefs = Object.assign({ mode: 'trenta', arms: 'incrociate', mount: 'petto', cond: 'senza' }, store.get('tp-chair-prefs', {}));
  const savePrefs = () => store.set('tp-chair-prefs', prefs);
  const LOCALE = window.LANG === 'en' ? 'en-GB' : 'it-IT';
  const fmt = (v, d = 1) => Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  const dateStr = (t) => new Date(t).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  const timeStr = (t) => new Date(t).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const MODE = { trenta: T('30 secondi'), cinque: T('5 alzate') };
  const ARMS = { incrociate: T('Braccia incrociate'), mani: T('Con l’aiuto delle mani') };
  const MOUNT = { petto: T('Sul petto'), cintura: T('In cintura (lombare)') };
  const COND = { senza: T('Senza Equistasi'), con: T('Con Equistasi') };
  const DUR30 = 30000; const MAX5 = 60000;

  // Funzione in prova: visibile solo dopo averla attivata da #/beta
  const enabled = () => store.get(BETA_KEY, false) === true;

  const results = () => store.get(KEY, []);
  function addResult(r) {
    const all = results();
    const rec = Object.assign({ id: Date.now().toString(36), t: Date.now(), cond: prefs.cond, mode: prefs.mode, arms: prefs.arms, mount: prefs.mount }, r);
    all.push(rec);
    store.set(KEY, all.slice(-300));
    return rec;
  }

  /* ───────── Riconoscimento delle alzate ───────── */
  // Ogni alzata e ogni seduta è un movimento separato: il busto ruota (giroscopio) e il corpo sale o scende.
  // 1. Troviamo i tratti di movimento con il giroscopio (o, se manca, con l'accelerazione).
  // 2. In ogni tratto integriamo l'accelerazione verticale partendo da fermi e arrivando fermi:
  //    così la deriva del sensore si annulla anche nei movimenti lenti.
  // 3. Sul percorso verticale ottenuto contiamo una salita o una discesa quando supera DZ metri.
  // L'accelerazione verticale è il modulo dell'accelerazione meno g0: non cambia se il busto si inclina.
  // g0: modulo a telefono fermo, misurato durante il conto alla rovescia.
  // push(t ms, x, y, z, rot °/s o null) → elenco di eventi { e: 'su' | 'giu', end: fine del movimento in ms }.
  function detector(g0, o = {}) {
    const DZ = o.dz || 0.12;        // m: salita o discesa minima per contare
    const GYRO_ON = o.gyro || 12;   // °/s: sopra questa velocità di rotazione il busto si muove
    const ACC_ON = o.acc || 0.12;   // m/s²: soglia di movimento se il telefono non ha il giroscopio
    // ms prima dell'inizio e di quiete per chiudere un tratto: a metà di un'alzata lenta il busto si ferma
    // per un attimo (massima flessione), quindi la quiete deve durare più di quella pausa
    // (senza giroscopio la pausa di accelerazione è più lunga). sd: rumore del sensore a telefono fermo.
    const PRE = 400;
    const ACC = Math.max(ACC_ON, 0.12 + 0.8 * (o.sd || 0));
    let last = null; let aLP = 0; let actLP = 0; let rotLP = 0;
    let ring = []; let ep = null; let quietSince = null; let rotQuiet = null;
    let standing = false;
    // dry: prova senza cambiare lo stato (per capire se si può chiudere il tratto prima)
    function processEpisode(list, end, dry) {
      const ev = []; let up = standing;
      if (list.length < 5) return ev;
      const t0 = list[0].t; const T = list[list.length - 1].t - t0 || 1;
      let v = 0; const vs = [];
      for (let k = 1; k < list.length; k++) { v += list[k].a * (list[k].t - list[k - 1].t) / 1000; vs.push(v); }
      const vEnd = v; let z = 0; let ref = 0;
      for (let k = 1; k < list.length; k++) {
        const vv = vs[k - 1] - vEnd * (list[k].t - t0) / T; // fermo all'inizio e alla fine
        z += vv * (list[k].t - list[k - 1].t) / 1000;
        if (!up) { if (z < ref) ref = z; else if (z - ref > DZ) { up = true; ref = z; ev.push({ e: 'su', end }); } }
        else if (z > ref) ref = z; else if (ref - z > DZ) { up = false; ref = z; ev.push({ e: 'giu', end }); }
      }
      if (!dry) standing = up;
      return ev;
    }
    return {
      get standing() { return standing; },
      push(t, x, y, z, rot) {
        const a0 = Math.hypot(x, y, z) - g0;
        if (last == null) { last = t; aLP = a0; }
        const dt = Math.min(0.1, Math.max(0.001, (t - last) / 1000)); last = t;
        aLP += (a0 - aLP) * dt / (0.04 + dt);              // passa-basso ~4 Hz contro le vibrazioni
        actLP += (Math.abs(aLP) - actLP) * dt / (0.15 + dt);
        let active = actLP > ACC;
        if (rot != null) {
          rotLP += (rot - rotLP) * dt / (0.08 + dt); active = active || rotLP > GYRO_ON;
          rotQuiet = rotLP > GYRO_ON ? null : (rotQuiet == null ? t : rotQuiet);
        }
        const p = { t, a: aLP };
        if (!ep) {
          ring.push(p); while (ring.length && ring[0].t < t - PRE) ring.shift();
          if (active) { ep = ring; ring = []; quietSince = null; }
          return [];
        }
        ep.push(p);
        // con le alzate di seguito le pause sono brevi: appena il busto resta fermo un attimo (giroscopio) e il tratto
        // contiene già un'alzata o una seduta lo chiudiamo, così il numero sullo schermo cresce a ogni movimento
        if (rot != null && rotQuiet != null && t - rotQuiet >= 150 && processEpisode(ep, rotQuiet, true).length) {
          const list = ep; ep = null; ring = [p]; quietSince = null;
          return processEpisode(list, rotQuiet);
        }
        if (active) { quietSince = null; return []; }
        if (quietSince == null) quietSince = t;
        if (t - quietSince < (rot != null ? 700 : 1100) && t - ep[0].t < 15000) return [];
        const list = ep; ep = null; ring = [p];
        return processEpisode(list, quietSince);
      },
    };
  }
  // Su una registrazione già fatta (per le prove automatiche)
  function countStands(samples, g0, o) {
    const d = detector(g0 != null ? g0 : 9.81, o); const ev = [];
    samples.forEach((s) => d.push(s.t, s.x, s.y, s.z, s.rot).forEach((x) => ev.push({ e: x.e, t: s.t, end: x.end })));
    return ev;
  }

  /* ───────── Sensori, suoni e voce ───────── */
  async function motionPermission() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch (e) { return false; }
    }
    return true;
  }
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
      u.lang = window.LANG === 'en' ? 'en-GB' : 'it-IT'; u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch (e) { /* voce non disponibile */ }
  }
  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');
      else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { /* non supportato */ }
  }
  let stop = null; // ferma la prova in corso (cambio pagina o pulsante Stop)

  /* ───────── Interfaccia ───────── */
  const ICON = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13" cy="4" r="2"/><path d="M13 7v6l-4 1v6M13 13l3 7M5 12v8M5 16h6"/></svg>';
  const SAFETY = '<div class="warn"><b>' + T('⚠️ Fai il test solo con una persona accanto', {}) + '</b>, ' + T('pronta a sostenerti se perdi l’equilibrio.') + '<ul class="small" style="margin:6px 0 0;padding-left:18px">' +
    '<li>' + T('Usa una sedia stabile, senza ruote e senza braccioli, appoggiata al muro.') + '</li>' +
    '<li>' + T('Fermati subito se senti dolore, capogiro, affanno o se ti senti insicuro.') + '</li>' +
    '<li>' + T('Prima di iniziare chiedi al tuo neurologo o fisioterapista se il test è adatto a te.') + '</li></ul></div>';
  const NOTE = '<p class="small muted pz-note">' + T('Il risultato è una stima fatta con i sensori del telefono: serve a seguire i cambiamenti nel tempo e <b>non sostituisce la diagnosi o la valutazione del medico</b>. I dati restano solo sul tuo telefono.') + '</p>';

  function cardHtml() {
    if (!enabled()) return '';
    const last = results().pop();
    return '<a class="card vpromo pz-promo" href="#/sedia"><span class="vpromo-ico pz-ico" aria-hidden="true">' + ICON + '</span>' +
      '<span><b>' + T('Alzati dalla sedia') + ' <span class="beta-tag">' + T('in prova') + '</span></b><br><span class="small muted">' +
      (last ? T('Ultima prova: {v} · {d}', { v: valText(last), d: dateStr(last.t) }) : T('Forza delle gambe, con una persona accanto')) + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
  }
  const valText = (r) => r.mode === 'trenta' ? T('{n} alzate in 30 s', { n: r.count }) : (r.done ? T('5 alzate in {s} s', { s: fmt(r.time, 1) }) : T('{n} alzate su 5', { n: r.count }));
  function seg(name, opts, cur, label) {
    return '<div class="seg" role="group" aria-label="' + esc(label) + '">' +
      Object.keys(opts).map((k) => '<button type="button" data-pref="' + name + '" data-val="' + k + '" aria-pressed="' + (cur === k) + '">' + opts[k] + '</button>').join('') + '</div>';
  }
  const head = (title, sub) => '<div class="detail-head"><div class="eyebrow">' + T('Test neurologici') + ' · <span class="beta-tag">' + T('in prova') + '</span></div><h1>' + title + '</h1>' + (sub ? '<p class="small muted" style="margin:6px 0 0">' + sub + '</p>' : '') + '</div>';

  function how() {
    const phone = prefs.mount === 'cintura'
      ? T('<b>Telefono nella cintura</b>, dietro la schiena in zona lombare, schermo verso l’esterno. Dopo Inizia hai <b>10 secondi</b> per metterlo.')
      : T('<b>Telefono sul petto</b>, tenuto fermo con le braccia incrociate sullo sterno.');
    const arms = prefs.arms === 'mani'
      ? T('Puoi spingerti con le mani sulle cosce o sulla seduta: usa sempre lo stesso modo per confrontare le prove.')
      : T('Braccia incrociate sul petto per tutta la prova.');
    const task = prefs.mode === 'trenta'
      ? T('Al «Via» alzati in piedi del tutto e torna seduto, più volte che puoi in <b>30 secondi</b>, in sicurezza.')
      : T('Al «Via» alzati in piedi del tutto e torna seduto <b>5 volte</b>, più veloce che puoi in sicurezza. Il tempo si ferma quando ti risiedi la quinta volta.');
    return [T('Siediti in fondo alla sedia, schiena dritta, piedi appoggiati a terra alla larghezza dei fianchi.'), phone, arms, task];
  }

  function summary() {
    const list = results().filter((r) => r.mode === prefs.mode && r.arms === prefs.arms);
    const better = (a, b) => prefs.mode === 'trenta' ? a.count > b.count : (a.done && (!b.done || a.time < b.time));
    const col = (c) => {
      const l = list.filter((r) => r.cond === c);
      if (!l.length) return '<div class="ts-col"><span class="small muted">' + COND[c] + '</span><b>—</b><span class="small muted">' + T('nessuna prova') + '</span></div>';
      const best = l.reduce((a, b) => (better(b, a) ? b : a));
      return '<div class="ts-col"><span class="small muted">' + COND[c] + '</span><b>' + valText(best) + '</b><span class="small muted">' + T('migliore su {n} prove', { n: l.length }) + '</span></div>';
    };
    return '<div class="ts-sum">' + col('senza') + col('con') + '</div>';
  }
  function history() {
    const list = results().slice(-8).reverse();
    if (!list.length) return '<p class="small muted" style="margin:10px 0 0">' + T('Nessuna prova ancora.') + '</p>';
    return '<h3 style="font-size:15px;margin:16px 0 6px">' + T('Ultime prove') + '</h3><ul class="ts-hist">' + list.map((r) =>
      '<li><span>' + dateStr(r.t) + ' ' + timeStr(r.t) + ' · ' + (r.cond === 'con' ? T('con') : T('senza')) + ' · ' + (r.arms === 'mani' ? T('con le mani') : T('braccia incrociate')) + '</span><b>' + valText(r) + '</b></li>').join('') + '</ul>';
  }

  function renderTest(app) {
    app.innerHTML = head(T('Alzati dalla sedia'), T('Misura la forza delle gambe: ripeti la prova nel tempo, senza e con Equistasi, sempre nelle stesse condizioni.')) +
      '<div class="home-grid"><div><div class="card">' +
      '<div class="toolbar">' + seg('mode', MODE, prefs.mode, T('Tipo di prova')) + '</div>' +
      '<div class="toolbar">' + seg('arms', ARMS, prefs.arms, T('Braccia')) + '</div>' +
      '<div class="toolbar">' + seg('mount', MOUNT, prefs.mount, T('Posizione del telefono')) + '</div>' +
      '<div class="toolbar">' + seg('cond', COND, prefs.cond, T('Condizione')) + '</div>' +
      SAFETY + '<ol class="steps">' + how().map((x) => '<li>' + x + '</li>').join('') + '</ol>' +
      '<label class="ch-ok"><input type="checkbox" id="ch-ok"> ' + T('C’è una persona accanto a me, pronta ad aiutarmi') + '</label>' +
      '<div class="pz-live" id="ch-live" hidden><div class="pz-live-in"><div class="pz-big" id="ch-big"></div><div class="small" id="ch-sub"></div>' +
      '<button class="btn" id="ch-stop" type="button">' + T('Stop') + '</button></div></div>' +
      '<div id="ch-check" hidden></div>' +
      '<p class="gate-msg" id="ch-msg" role="alert"></p>' +
      '<button class="btn primary" id="ch-go" type="button" disabled>' + T('Inizia') + '</button></div></div><div>' +
      '<div class="card"><h3>' + T('I tuoi risultati') + '</h3><p class="small muted" style="margin:0 0 8px">' + MODE[prefs.mode] + ' · ' + ARMS[prefs.arms] + '</p>' + summary() + history() + '</div>' +
      '</div></div>' + NOTE;
    app.querySelectorAll('[data-pref]').forEach((b) => b.addEventListener('click', () => { prefs[b.dataset.pref] = b.dataset.val; savePrefs(); renderTest(app); }));
    const ok = document.getElementById('ch-ok'); const go = document.getElementById('ch-go');
    ok.addEventListener('change', () => { go.disabled = !ok.checked; });
    go.addEventListener('click', () => run(app));
  }

  async function run(app) {
    const go = document.getElementById('ch-go'); const msg = document.getElementById('ch-msg');
    const live = document.getElementById('ch-live'); const big = document.getElementById('ch-big'); const sub = document.getElementById('ch-sub');
    msg.textContent = ''; go.disabled = true; beep(440, 1);
    if (!(await motionPermission())) {
      msg.textContent = T('Serve il permesso ai sensori di movimento. Usa il telefono (non il computer) e consenti l’accesso quando richiesto.');
      go.disabled = false; return;
    }
    live.hidden = false; keepAwake(true);
    let cancelled = false;
    const belt = prefs.mount === 'cintura';
    // durante la preparazione misuriamo il modulo della gravità a telefono fermo
    const mags = [];
    const onPrep = (e) => { const a = e.accelerationIncludingGravity || {}; if (a.x != null) mags.push({ t: performance.now(), m: Math.hypot(a.x, a.y, a.z) }); };
    window.addEventListener('devicemotion', onPrep);
    stop = () => { cancelled = true; };
    document.getElementById('ch-stop').onclick = () => stop && stop();
    say(belt ? T('Metti il telefono nella cintura e siediti.') : T('Siediti con le braccia incrociate e il telefono sul petto.'));
    const prep = belt ? 10 : 5;
    for (let i = prep; i > 0 && !cancelled; i--) {
      big.textContent = i; sub.textContent = belt ? T('Metti il telefono nella cintura e resta seduto') : T('Resta seduto e fermo');
      if (i <= 3) { beep(660, 120); say(String(i)); }
      await wait(1000);
    }
    window.removeEventListener('devicemotion', onPrep);
    if (cancelled) { keepAwake(false); stop = null; renderTest(app); return; }
    const still = mags.filter((p) => p.t > performance.now() - 2000).map((p) => p.m);
    if (still.length < 20) { keepAwake(false); stop = null; live.hidden = true; go.disabled = false; msg.textContent = T('Il sensore di movimento non ha inviato abbastanza dati: riprova dal telefono.'); return; }
    const g0 = still.reduce((a, b) => a + b, 0) / still.length;
    const sd = Math.sqrt(still.reduce((a, b) => a + (b - g0) ** 2, 0) / still.length);

    const five = prefs.mode === 'cinque';
    const d = detector(g0, { sd });
    let count = 0; let tEnd = null; let finished = false; let gyro = false;
    beep(1100, 350); say(T('Via!'));
    const t0 = performance.now();
    const result = await new Promise((resolve) => {
      const end = (why) => { if (finished) return; finished = true; window.removeEventListener('devicemotion', h); clearInterval(iv); clearTimeout(to); resolve(why); };
      const h = (e) => {
        const a = e.accelerationIncludingGravity || {};
        if (a.x == null) return;
        const t = performance.now();
        const r = e.rotationRate;
        const rot = r && r.alpha != null ? Math.hypot(r.alpha || 0, r.beta || 0, r.gamma || 0) : null;
        if (rot != null) gyro = true;
        d.push(t, a.x, a.y, a.z, rot).forEach((ev) => {
          if (ev.e === 'su') { count++; beep(990, 90); }
          if (five && ev.e === 'giu' && count >= 5) { tEnd = ev.end; end('fatto'); }
        });
      };
      window.addEventListener('devicemotion', h);
      const iv = setInterval(() => {
        const el = performance.now() - t0;
        if (five) { big.textContent = count + ' / 5'; sub.textContent = fmt(el / 1000, 1) + ' s · ' + T('lo schermo è per chi ti assiste'); }
        else { big.textContent = count; sub.textContent = T('alzate · mancano {s} s', { s: Math.max(0, Math.ceil((DUR30 - el) / 1000)) }); }
      }, 100);
      const to = setTimeout(() => end('tempo'), five ? MAX5 : DUR30);
      stop = () => end('stop');
    });
    stop = null;
    beep(1100, 400); say(T('Fine. Resta seduto e riposa.')); keepAwake(false);
    live.hidden = true;
    if (result === 'stop' && !count) { renderTest(app); return; }
    const time = five && tEnd ? (tEnd - t0) / 1000 : null;
    confirm(app, { count, time, done: !five || (result === 'fatto'), stopped: result === 'stop', gyro });
  }

  // Chi assiste controlla il conteggio e può correggerlo prima di salvare
  function confirm(app, r) {
    const box = document.getElementById('ch-check'); const go = document.getElementById('ch-go');
    const five = prefs.mode === 'cinque';
    go.hidden = true; box.hidden = false;
    const draw = () => {
      box.innerHTML = '<div class="card ch-confirm"><h3>' + T('Il conteggio è giusto?') + '</h3>' +
        '<p class="small muted" style="margin:0 0 10px">' + T('Chi ti ha assistito può correggere il numero di alzate prima di salvare.') + '</p>' +
        '<div class="ch-count"><button type="button" class="btn" id="ch-minus" aria-label="' + esc(T('Una alzata in meno')) + '">−</button><b>' + r.count + '</b><button type="button" class="btn" id="ch-plus" aria-label="' + esc(T('Una alzata in più')) + '">+</button></div>' +
        (five ? '<p class="small" style="margin:8px 0 0">' + (r.time != null && r.count >= 5 ? T('Tempo: <b>{s} s</b>', { s: fmt(r.time, 1) }) : T('Le 5 alzate non sono state completate: salviamo il numero di alzate fatte.')) + '</p>' : '') +
        (!r.gyro ? '<p class="small" style="margin:8px 0 0">' + T('Questo telefono non ha il giroscopio: con le alzate lente il conteggio può sbagliare, controllalo bene.') + '</p>' : '') +
        (r.stopped && !five ? '<p class="small" style="margin:8px 0 0">' + T('Prova fermata prima dei 30 secondi.') + '</p>' : '') +
        '<div class="crit-btns"><button type="button" class="btn primary" id="ch-save">' + T('Salva') + '</button><button type="button" class="btn" id="ch-discard">' + T('Non salvare') + '</button></div></div>';
      box.querySelector('#ch-minus').onclick = () => { r.count = Math.max(0, r.count - 1); draw(); };
      box.querySelector('#ch-plus').onclick = () => { r.count = Math.min(60, r.count + 1); draw(); };
      box.querySelector('#ch-discard').onclick = () => renderTest(app);
      box.querySelector('#ch-save').onclick = () => {
        // con il conteggio corretto a mano il tempo delle 5 alzate vale solo se sono davvero 5
        const done = five ? r.done && r.count >= 5 && r.time != null : !r.stopped;
        const rec = addResult({ count: r.count, time: five && done ? r.time : null, done });
        renderTest(app);
        const m = document.getElementById('ch-msg');
        m.className = 'ts-done'; m.textContent = T('Risultato salvato: {v}', { v: valText(rec) });
      };
    };
    draw();
  }

  // Pagina per attivare o disattivare le funzioni in prova (#/beta)
  function renderBeta(app) {
    const on = enabled();
    app.innerHTML = '<div class="detail-head"><div class="eyebrow">' + T('Funzioni in prova') + '</div><h1>' + T('Funzioni in prova') + '</h1>' +
      '<p class="small muted" style="margin:6px 0 0">' + T('Funzioni nuove non ancora pubblicate per tutti. Attivale solo su questo telefono per provarle.') + '</p></div>' +
      '<div class="card"><p><b>' + T('Alzati dalla sedia') + '</b><br><span class="small muted">' + T('Test della forza delle gambe per il profilo Neurologico.') + '</span></p>' +
      '<button type="button" class="btn ' + (on ? '' : 'primary') + '" id="beta-tg">' + (on ? T('Disattiva') : T('Attiva')) + '</button>' +
      (on ? ' <a class="btn primary" href="#/sedia">' + T('Apri il test') + '</a>' : '') + '</div>';
    document.getElementById('beta-tg').addEventListener('click', () => { store.set(BETA_KEY, !on); renderBeta(app); });
  }

  function render(app, arg) {
    if (stop) stop();
    if (arg === 'beta') { renderBeta(app); return; }
    if (!enabled()) { renderBeta(app); return; }
    renderTest(app);
  }

  window.EqChair = { render, renderBeta, cardHtml, enabled, _detector: detector, _countStands: countStands };
})();
