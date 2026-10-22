/* "Misura i tuoi progressi" (profilo Sport): test di equilibrio (su una gamba e in piedi), salto verticale e sprint.
   Usa i sensori di movimento del telefono (DeviceMotion) e un cronometro; i risultati restano sul telefono.
   Ogni prova si può segnare "senza" o "con Equistasi" per confrontare i propri progressi. */
(function () {
  const KEY = 'tp-tests';
  const G = 9.81;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage non disponibile */ } },
  };
  // Illustrazioni a fumetti (colori Equistasi)
  const IMG_BASE = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3DOukuRyFd7f2J84gGwrmduEdRX/';
  const IMG = {
    hero: IMG_BASE + '4aa1198d-eb50-408e-b547-54bbb3f5bfa4.jpg',
    equilibrio: IMG_BASE + '8a7ee277-f86c-4f47-be50-23cf48c073b0.jpg',
    ortostasi: IMG_BASE + '66f95bf6-6c34-4b1e-924f-3e30cd3222ae.jpg',
    salto: IMG_BASE + '30259cbc-db2f-4a4b-b6d4-d07dd242740a.jpg',
    sprint: IMG_BASE + 'b64db264-d94d-491a-885e-6f04875376d8.jpg',
  };
  const TESTS = {
    equilibrio: {
      icon: '🧍', name: T('Equilibrio su una gamba'), short: T('Equilibrio'),
      desc: T('Il telefono misura quanto oscilla il corpo in 30 secondi su una gamba.'),
      unit: 'm/s²', better: 'low', label: T('Oscillazione'),
    },
    ortostasi: {
      icon: '🧍', name: T('Equilibrio in piedi (ortostasi)'), short: T('Ortostasi'),
      desc: T('In piedi e fermi per 30 secondi: il telefono misura quanto oscilla il corpo.'),
      unit: 'm/s²', better: 'low', label: T('Oscillazione'),
    },
    salto: {
      icon: '⤒', name: T('Salto verticale'), short: T('Salto'),
      desc: T('Media di 3 salti, calcolata dal tempo in volo.'),
      unit: 'cm', better: 'high', label: T('Altezza'),
    },
    sprint: {
      icon: '⏱', name: T('Sprint'), short: T('Sprint'),
      desc: T('Cronometro su 10, 20 o 30 metri, con velocità media.'),
      unit: 's', better: 'low', label: T('Tempo'),
    },
  };
  const SAFETY = '<div class="warn ts-safety">' + T('<b>⚠️ Fai i test sempre accompagnato da un’altra persona</b>, che possa sostenerti se perdi l’equilibrio.') + ' ' +
    T('I risultati sono <b>indicativi</b> e <b>non sostituiscono visite mediche o valutazioni specialistiche</b>.') + '</div>';
  const COND = { senza: T('Senza Equistasi'), con: T('Con Equistasi') };
  const prefs = store.get('tp-test-prefs', { cond: 'senza', leg: 'dx', eyes: 'aperti', dist: 20, stance: 'uniti' });
  const savePrefs = () => store.set('tp-test-prefs', prefs);

  const LOCALE = window.LANG === 'en' ? 'en-GB' : 'it-IT';
  const fmt = (v, d = 1) => Number(v).toLocaleString(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d });
  const dateStr = (t) => new Date(t).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
  const results = () => store.get(KEY, []);
  function addResult(r) {
    const all = results();
    all.push(Object.assign({ t: Date.now(), cond: prefs.cond }, r));
    store.set(KEY, all.slice(-300));
  }

  /* ───────── Segnali: bip, vibrazione, voce del conto alla rovescia ───────── */
  let actx = null;
  function beep(freq = 880, ms = 160) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(); const g = actx.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(0.25, actx.currentTime);
      o.start(); o.stop(actx.currentTime + ms / 1000);
    } catch (e) { /* audio non disponibile */ }
    if (navigator.vibrate) navigator.vibrate(ms);
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function countdown(el, from = 3) {
    for (let i = from; i > 0; i--) { el.textContent = i; beep(660, 120); await wait(1000); }
    el.textContent = T('Via!'); beep(1100, 350);
  }

  /* ───────── Sensori di movimento ───────── */
  async function motionPermission() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch (e) { return false; }
    }
    return true;
  }
  // Registra i campioni per "ms" millisecondi; onSample può fermare prima restituendo true
  function record(ms, onSample) {
    return new Promise((resolve) => {
      const samples = [];
      let done = false;
      const finish = () => { if (done) return; done = true; window.removeEventListener('devicemotion', h); clearTimeout(to); resolve(samples); };
      const h = (e) => {
        const a = e.accelerationIncludingGravity || {};
        const l = e.acceleration || {};
        const s = { t: performance.now(), gx: a.x || 0, gy: a.y || 0, gz: a.z || 0, x: l.x, y: l.y, z: l.z };
        samples.push(s);
        if (onSample && onSample(s, samples)) finish();
      };
      window.addEventListener('devicemotion', h);
      const to = setTimeout(finish, ms);
      record.stop = finish;
    });
  }

  // Equilibrio: oscillazione = valore efficace dell'accelerazione senza la gravità
  function swayScore(samples) {
    if (samples.length < 20) return null;
    const hasLinear = samples.filter((s) => s.x != null).length > samples.length * 0.8;
    let sum = 0; let n = 0;
    if (hasLinear) {
      samples.forEach((s) => { sum += s.x * s.x + s.y * s.y + s.z * s.z; n++; });
    } else {
      // senza "acceleration" togliamo la gravità con una media mobile
      const k = 0.9; let mx = samples[0].gx; let my = samples[0].gy; let mz = samples[0].gz;
      samples.forEach((s) => {
        mx = k * mx + (1 - k) * s.gx; my = k * my + (1 - k) * s.gy; mz = k * mz + (1 - k) * s.gz;
        const x = s.gx - mx; const y = s.gy - my; const z = s.gz - mz;
        sum += x * x + y * y + z * z; n++;
      });
    }
    return Math.sqrt(sum / n);
  }

  // Salti: ogni volo è un tratto in cui il telefono è quasi in caduta libera (sotto 0,35 g, finisce sopra 0,6 g).
  // Restituisce la durata in secondi di ogni volo valido (0,12–1 s), nell'ordine.
  function flights(samples) {
    const out = []; let startT = null;
    samples.forEach((s) => {
      const m = Math.hypot(s.gx, s.gy, s.gz);
      if (startT == null) { if (m < 0.35 * G) startT = s.t; } else if (m > 0.6 * G) {
        const t = (s.t - startT) / 1000; startT = null;
        if (t >= 0.12 && t <= 1.0) out.push(t);
      }
    });
    return out;
  }
  // Salto singolo (volo più lungo), usato dalle prove automatiche
  function flightTime(samples) {
    let best = 0; let startT = null;
    samples.forEach((s) => {
      const m = Math.hypot(s.gx, s.gy, s.gz);
      if (m < 0.35 * G) { if (startT == null) startT = s.t; } else if (startT != null) { best = Math.max(best, s.t - startT); startT = null; }
    });
    const t = best / 1000;
    return t >= 0.12 && t <= 1.0 ? t : null;
  }
  const heightCm = (t) => (G * t * t / 8) * 100;

  /* ───────── Interfaccia ───────── */
  function cardHtml() {
    const all = results();
    return '<a class="card vpromo tests-promo" href="#/test"><span class="vpromo-ico" aria-hidden="true"><img src="' + IMG.sprint + '" alt="" loading="lazy" /></span>' +
      '<span><b>' + T('Misura i tuoi progressi') + '</b><br><span class="small muted">' +
      (all.length ? T('Equilibrio, ortostasi, salto e sprint · {n} prove salvate', { n: all.length }) : T('Equilibrio, ortostasi, salto e sprint con il tuo telefono')) + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  function seg(name, opts, cur, label) {
    return '<div class="seg" role="group" aria-label="' + (label || name) + '">' +
      Object.keys(opts).map((k) => '<button type="button" data-pref="' + name + '" data-val="' + k + '" aria-pressed="' + (String(cur) === k) + '">' + opts[k] + '</button>').join('') + '</div>';
  }

  // Migliore e media per "senza" e "con", per lo stesso tipo di prova
  function summary(type, filter) {
    const tt = TESTS[type];
    const list = results().filter((r) => r.type === type && (!filter || filter(r)));
    const pick = (c) => {
      const v = list.filter((r) => r.cond === c).map((r) => r.value);
      if (!v.length) return null;
      const best = tt.better === 'low' ? Math.min(...v) : Math.max(...v);
      return { best, avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length };
    };
    const s = pick('senza'); const c = pick('con');
    const d = tt.unit === 'cm' ? 0 : 2;
    const col = (lab, x) => '<div class="ts-col"><span class="small muted">' + lab + '</span>' +
      (x ? '<b>' + fmt(x.best, d) + ' ' + tt.unit + '</b><span class="small muted">' + T('migliore · media {avg} ({n})', { avg: fmt(x.avg, d), n: x.n }) + '</span>' : '<b>—</b><span class="small muted">' + T('nessuna prova') + '</span>') + '</div>';
    return '<div class="ts-sum">' + col(COND.senza, s) + col(COND.con, c) + '</div>';
  }

  function history(type) {
    const tt = TESTS[type];
    const list = results().filter((r) => r.type === type).slice(-8).reverse();
    if (!list.length) return '';
    const d = tt.unit === 'cm' ? 0 : 2;
    return '<h3 style="font-size:15px;margin:16px 0 6px">' + T('Ultime prove') + '</h3><ul class="ts-hist">' + list.map((r) =>
      '<li><span>' + dateStr(r.t) + ' · ' + (r.cond === 'con' ? T('con') : T('senza')) + (r.note ? ' · ' + r.note : '') + '</span><b>' + fmt(r.value, d) + ' ' + tt.unit + '</b></li>').join('') + '</ul>';
  }

  function renderList(app) {
    app.innerHTML = '<div class="detail-head"><div class="eyebrow">' + T('Sport') + '</div><h1>' + T('Misura i tuoi <span class="hl">progressi</span>') + '</h1>' +
      '<p class="small muted" style="margin:6px 0 0">' + T('Ripeti i test nel tempo, senza e con Equistasi, e confronta i tuoi risultati.') + '</p></div>' +
      '<img class="ts-hero" src="' + IMG.hero + '" alt="" loading="lazy" />' + SAFETY + (window.EqRemote ? window.EqRemote.cardHtml() : '') + '<div class="list">' + Object.keys(TESTS).map((k) => {
        const tt = TESTS[k]; const n = results().filter((r) => r.type === k).length;
        return '<a class="m-item" href="#/test/' + k + '"><span class="ts-ico" aria-hidden="true"><img src="' + IMG[k] + '" alt="" loading="lazy" /></span><span><b>' + tt.name + '</b><br><span class="small muted">' + tt.desc +
          (n ? ' · ' + T('{n} prove', { n }) : '') + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
      }).join('') + '</div>' +
      '<h2 class="sec-title">' + T('Report') + '</h2>' +
      '<a class="card vpromo ts-report" href="#/postura/report"><span class="vpromo-ico pz-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/></svg></span>' +
      '<span><b>' + T('Report in PDF') + '</b><br><span class="small muted">' + T('Test, postura e foto senza e con Equistasi, da inviare al fisioterapista o all’allenatore') + '</span></span><span class="chev" aria-hidden="true">›</span></a>' +
      '<p class="small muted" style="margin-top:14px">' + T('I risultati sono stime fatte con i sensori del telefono e restano salvati solo sul tuo dispositivo.') + '</p>';
  }

  function renderTest(app, type) {
    const tt = TESTS[type];
    if (!tt) return renderList(app);
    let setup = '';
    let how = '';
    if (type === 'ortostasi') {
      setup = '<div class="toolbar">' + seg('stance', { uniti: T('Piedi uniti'), tandem: T('Un piede davanti all’altro') }, prefs.stance || 'uniti', T('Posizione dei piedi')) + '</div>' +
        '<div class="toolbar">' + seg('eyes', { aperti: T('Occhi aperti'), chiusi: T('Occhi chiusi') }, prefs.eyes, T('Occhi')) + '</div>';
      how = '<li>' + T('Mettiti <b>in piedi, fermo</b>, con le braccia che tengono il telefono <b>appoggiato al petto</b>.') + '</li><li>' + T('Tocca <b>Inizia</b>: dopo il conto alla rovescia resta immobile per <b>30 secondi</b>, guardando avanti (o a occhi chiusi).') + '</li><li>' + T('Se perdi l’equilibrio e devi spostare un piede, tocca lo schermo. Fai il test vicino a un muro o con qualcuno accanto.') + '</li>';
    } else if (type === 'equilibrio') {
      setup = '<div class="toolbar">' + seg('leg', { dx: T('Gamba destra'), sx: T('Gamba sinistra') }, prefs.leg, T('Gamba')) + '</div>' +
        '<div class="toolbar">' + seg('eyes', { aperti: T('Occhi aperti'), chiusi: T('Occhi chiusi') }, prefs.eyes, T('Occhi')) + '</div>';
      how = '<li>' + T('Tieni il telefono <b>appoggiato al petto</b> con entrambe le mani.') + '</li><li>' + T('Tocca <b>Inizia</b>: dopo il conto alla rovescia sollevi un piede e resti in equilibrio per <b>30 secondi</b>.') + '</li><li>' + T('Se appoggi il piede, tocca lo schermo: salviamo il tempo che hai resistito.') + '</li>';
    } else if (type === 'salto') {
      how = '<li>' + T('Metti il telefono nella <b>cintura sul petto</b> (fascia toracica), ben stretto, così hai le mani libere.') + '</li><li>' + T('Tocca <b>Inizia</b>: dopo il "Via" hai <b>15 secondi</b> per fare <b>3 salti</b> verso l’alto, il più alto possibile, con una breve pausa tra un salto e l’altro.') + '</li><li>' + T('Atterra sugli avampiedi, senza piegare troppo le ginocchia in volo. Il risultato è la <b>media dei 3 salti</b>.') + '</li>';
    } else {
      setup = '<div class="toolbar">' + seg('dist', { 10: '10 m', 20: '20 m', 30: '30 m' }, prefs.dist, T('Distanza')) + '</div>';
      how = '<li>' + T('Misura la distanza e prepara un compagno con il telefono all’arrivo (oppure tienilo tu).') + '</li><li>' + T('Tocca <b>Inizia</b>: al bip del "Via" parti.') + '</li><li>' + T('Tocca <b>Stop</b> sul traguardo.') + '</li>';
    }
    app.innerHTML = '<div class="detail-head"><div class="eyebrow">' + T('Misura i tuoi progressi') + '</div><h1>' + tt.name + '</h1></div>' +
      '<div class="home-grid"><div>' +
      '<div class="card"><img class="ts-hero" src="' + IMG[type] + '" alt="" loading="lazy" />' +
      '<div class="toolbar">' + seg('cond', COND, prefs.cond, T('Condizione')) + '</div>' + setup +
      SAFETY + '<ol class="steps">' + how + '</ol>' +
      '<div class="ts-live" id="ts-live" hidden><div class="ts-big" id="ts-big"></div><div class="small muted" id="ts-sub"></div></div>' +
      '<p class="gate-msg" id="ts-msg" role="alert"></p>' +
      '<button class="btn primary" id="ts-go" type="button">' + T('Inizia') + '</button></div>' +
      '</div><div>' +
      '<div class="card"><h3>' + T('I tuoi risultati') + '</h3>' + summary(type) + history(type) + '</div>' +
      '</div></div>';

    app.querySelectorAll('[data-pref]').forEach((b) => b.addEventListener('click', () => {
      prefs[b.dataset.pref] = b.dataset.pref === 'dist' ? Number(b.dataset.val) : b.dataset.val;
      savePrefs(); renderTest(app, type);
    }));
    document.getElementById('ts-go').addEventListener('click', () => run(app, type));
  }

  async function run(app, type) {
    const go = document.getElementById('ts-go');
    const live = document.getElementById('ts-live');
    const big = document.getElementById('ts-big');
    const sub = document.getElementById('ts-sub');
    const msg = document.getElementById('ts-msg');
    msg.textContent = '';
    go.disabled = true;
    beep(440, 1); // sblocca l'audio con il tocco dell'utente

    if (type === 'sprint') {
      live.hidden = false; sub.textContent = '';
      await countdown(big);
      const t0 = performance.now();
      // nuovo pulsante senza il gestore "Inizia"
      const stopBtn = go.cloneNode(true); go.replaceWith(stopBtn);
      stopBtn.disabled = false; stopBtn.textContent = T('Stop');
      const iv = setInterval(() => { big.textContent = fmt((performance.now() - t0) / 1000, 2) + ' s'; }, 50);
      stopBtn.onclick = () => {
        clearInterval(iv);
        const t = (performance.now() - t0) / 1000;
        const v = prefs.dist / t;
        addResult({ type, value: t, note: T('{dist} m · {speed} km/h', { dist: prefs.dist, speed: fmt(v * 3.6, 1) }) });
        renderTest(app, type);
        showDone(T('{dist} m in {time} s · velocità media {speed} km/h', { dist: prefs.dist, time: fmt(t, 2), speed: fmt(v * 3.6, 1) }));
      };
      return;
    }

    if (!(await motionPermission())) {
      msg.textContent = T('Serve il permesso ai sensori di movimento. Usa il telefono (non il computer) e consenti l’accesso quando richiesto.');
      go.disabled = false; return;
    }
    live.hidden = false;
    sub.textContent = type === 'salto' ? T('Telefono nella cintura sul petto') : T('Preparati: telefono al petto');
    await countdown(big);

    if (type === 'equilibrio' || type === 'ortostasi') {
      const DUR = 30000; const t0 = performance.now();
      sub.textContent = type === 'ortostasi' ? T('Resta immobile · tocca lo schermo se sposti un piede') : T('Resta in equilibrio · tocca lo schermo se appoggi il piede');
      const iv = setInterval(() => { big.textContent = Math.max(0, Math.ceil((DUR - (performance.now() - t0)) / 1000)) + ' s'; }, 200);
      const tap = () => record.stop && record.stop();
      setTimeout(() => document.addEventListener('pointerdown', tap, { once: true }), 300);
      const samples = await record(DUR);
      document.removeEventListener('pointerdown', tap);
      clearInterval(iv); beep(1100, 300);
      const held = Math.min(DUR, performance.now() - t0) / 1000;
      const score = swayScore(samples);
      if (score == null) { msg.textContent = T('Il sensore di movimento non ha inviato dati: prova dal telefono.'); go.disabled = false; live.hidden = true; return; }
      const pos = type === 'ortostasi' ? ((prefs.stance || 'uniti') === 'uniti' ? T('piedi uniti') : T('tandem')) : (prefs.leg === 'dx' ? T('gamba dx') : T('gamba sx'));
      const note = pos + ' · ' + (prefs.eyes === 'chiusi' ? T('occhi chiusi') : T('occhi aperti')) + (held < 29.5 ? ' · ' + fmt(held, 0) + ' s' : '');
      addResult({ type, value: score, note, held, leg: prefs.leg, eyes: prefs.eyes, stance: prefs.stance });
      renderTest(app, type);
      showDone(T('Oscillazione {value} m/s² (più è bassa, più sei stabile)', { value: fmt(score, 2) }) + (held < 29.5 ? ' · ' + T('hai resistito {s} s', { s: fmt(held, 0) }) : ''));
      return;
    }

    // salto
    // 3 salti: si conta ogni atterraggio; dopo il terzo si chiude
    big.textContent = '0 / 3'; sub.textContent = T('Salta ora! 3 salti');
    let n = 0; let lastLand = 0;
    const samples = await record(15000, (smp, all) => {
      const k = flights(all.slice(-120)).length; // ultimi ~2 s: basta per vedere un volo appena finito
      if (k && smp.t - lastLand > 500) {
        const tot = flights(all).length;
        if (tot > n) { n = tot; lastLand = smp.t; beep(990, 90); big.textContent = Math.min(n, 3) + ' / 3'; sub.textContent = n < 3 ? T('Bene! Ancora {k}', { k: 3 - n }) : T('Fatto!'); }
      }
      return n >= 3 && smp.t - lastLand > 300;
    });
    beep(1100, 300);
    if (!samples.length) { msg.textContent = T('Il sensore di movimento non ha inviato dati: prova dal telefono.'); go.disabled = false; live.hidden = true; return; }
    const fl = flights(samples).slice(0, 3);
    if (!fl.length) { msg.textContent = T('Non abbiamo riconosciuto i salti: stringi bene la cintura sul petto e riprova.'); go.disabled = false; big.textContent = ''; return; }
    const hs = fl.map(heightCm); const h = hs.reduce((a, b) => a + b, 0) / hs.length;
    const list = hs.map((x) => fmt(x, 0)).join(' · ');
    addResult({ type, value: h, note: fl.length === 3 ? T('media di 3 salti: {l} cm', { l: list }) : T('solo {n} salti su 3: {l} cm', { n: fl.length, l: list }) });
    renderTest(app, type);
    showDone(fl.length === 3 ? T('Media dei 3 salti {cm} cm ({l} cm)', { cm: fmt(h, 0), l: list }) : T('Media di {n} salti {cm} cm ({l} cm): la prossima volta fanne 3', { n: fl.length, cm: fmt(h, 0), l: list }));
  }

  function showDone(text) {
    const m = document.getElementById('ts-msg');
    if (m) { m.className = 'ts-done'; m.textContent = T('Risultato salvato: {text}', { text }); }
  }

  function render(app, arg) {
    if (arg) renderTest(app, arg); else renderList(app);
  }

  // usati dal telecomando dell'Apple Watch (js/remote.js): opzioni dei test e sprint cronometrato sull'orologio
  const setPrefs = (o) => { Object.assign(prefs, o); savePrefs(); };
  function addSprint(time, dist, cond) {
    const v = dist / time;
    const all = results();
    all.push({ t: Date.now(), cond, type: 'sprint', value: time, note: T('{dist} m · {speed} km/h', { dist, speed: fmt(v * 3.6, 1) }), watch: true });
    store.set(KEY, all.slice(-300));
    return T('{dist} m in {time} s · velocità media {speed} km/h', { dist, time: fmt(time, 2), speed: fmt(v * 3.6, 1) });
  }
  window.EqTests = { cardHtml, render, IMG, setPrefs, addSprint, _flightTime: flightTime, _flights: flights, _swayScore: swayScore, _heightCm: heightCm };
})();
