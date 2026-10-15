/* "Misura i tuoi progressi" (profilo Sport): test di equilibrio, salto verticale e sprint.
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
    salto: IMG_BASE + '30259cbc-db2f-4a4b-b6d4-d07dd242740a.jpg',
    sprint: IMG_BASE + 'b64db264-d94d-491a-885e-6f04875376d8.jpg',
  };
  const TESTS = {
    equilibrio: {
      icon: '🧍', name: 'Equilibrio su una gamba', short: 'Equilibrio',
      desc: 'Il telefono misura quanto oscilla il corpo in 30 secondi su una gamba.',
      unit: 'm/s²', better: 'low', label: 'Oscillazione',
    },
    salto: {
      icon: '⤒', name: 'Salto verticale', short: 'Salto',
      desc: 'L’altezza del salto calcolata dal tempo in volo.',
      unit: 'cm', better: 'high', label: 'Altezza',
    },
    sprint: {
      icon: '⏱', name: 'Sprint', short: 'Sprint',
      desc: 'Cronometro su 10, 20 o 30 metri, con velocità media.',
      unit: 's', better: 'low', label: 'Tempo',
    },
  };
  const COND = { senza: 'Senza Equistasi', con: 'Con Equistasi' };
  const prefs = store.get('tp-test-prefs', { cond: 'senza', leg: 'dx', eyes: 'aperti', dist: 20 });
  const savePrefs = () => store.set('tp-test-prefs', prefs);

  const fmt = (v, d = 1) => Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d });
  const dateStr = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
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
    el.textContent = 'Via!'; beep(1100, 350);
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

  // Salto: il volo è il tratto più lungo in cui il telefono è quasi in caduta libera
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
      '<span><b>Misura i tuoi progressi</b><br><span class="small muted">Equilibrio, salto e sprint' +
      (all.length ? ' · ' + all.length + ' prove salvate' : ' con il tuo telefono') + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  function seg(name, opts, cur) {
    return '<div class="seg" role="group" aria-label="' + name + '">' +
      Object.keys(opts).map((k) => '<button type="button" data-pref="' + name + '" data-val="' + k + '" aria-pressed="' + (String(cur) === k) + '">' + opts[k] + '</button>').join('') + '</div>';
  }

  // Migliore e media per "senza" e "con", per lo stesso tipo di prova
  function summary(type, filter) {
    const T = TESTS[type];
    const list = results().filter((r) => r.type === type && (!filter || filter(r)));
    const pick = (c) => {
      const v = list.filter((r) => r.cond === c).map((r) => r.value);
      if (!v.length) return null;
      const best = T.better === 'low' ? Math.min(...v) : Math.max(...v);
      return { best, avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length };
    };
    const s = pick('senza'); const c = pick('con');
    const d = T.unit === 'cm' ? 0 : 2;
    const col = (lab, x) => '<div class="ts-col"><span class="small muted">' + lab + '</span>' +
      (x ? '<b>' + fmt(x.best, d) + ' ' + T.unit + '</b><span class="small muted">migliore · media ' + fmt(x.avg, d) + ' (' + x.n + ')</span>' : '<b>—</b><span class="small muted">nessuna prova</span>') + '</div>';
    return '<div class="ts-sum">' + col('Senza Equistasi', s) + col('Con Equistasi', c) + '</div>';
  }

  function history(type) {
    const T = TESTS[type];
    const list = results().filter((r) => r.type === type).slice(-8).reverse();
    if (!list.length) return '';
    const d = T.unit === 'cm' ? 0 : 2;
    return '<h3 style="font-size:15px;margin:16px 0 6px">Ultime prove</h3><ul class="ts-hist">' + list.map((r) =>
      '<li><span>' + dateStr(r.t) + ' · ' + (r.cond === 'con' ? 'con' : 'senza') + (r.note ? ' · ' + r.note : '') + '</span><b>' + fmt(r.value, d) + ' ' + T.unit + '</b></li>').join('') + '</ul>';
  }

  function renderList(app) {
    app.innerHTML = '<img class="ts-hero" style="margin-top:16px" src="' + IMG.hero + '" alt="" loading="lazy" />' + '<div class="detail-head" style="padding-top:0"><div class="eyebrow">Sport</div><h1>Misura i tuoi <span class="hl">progressi</span></h1>' +
      '<p class="small muted" style="margin:6px 0 0">Ripeti i test nel tempo, senza e con Equistasi, e confronta i tuoi risultati.</p></div>' +
      '<div class="list">' + Object.keys(TESTS).map((k) => {
        const T = TESTS[k]; const n = results().filter((r) => r.type === k).length;
        return '<a class="m-item" href="#/test/' + k + '"><span class="ts-ico" aria-hidden="true"><img src="' + IMG[k] + '" alt="" loading="lazy" /></span><span><b>' + T.name + '</b><br><span class="small muted">' + T.desc +
          (n ? ' · ' + n + ' prove' : '') + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
      }).join('') + '</div>' +
      '<p class="small muted" style="margin-top:14px">I risultati sono stime fatte con i sensori del telefono e restano salvati solo sul tuo dispositivo. Servono a seguire i tuoi progressi, non sono una valutazione medica.</p>';
  }

  function renderTest(app, type) {
    const T = TESTS[type];
    if (!T) return renderList(app);
    let setup = '';
    let how = '';
    if (type === 'equilibrio') {
      setup = '<div class="toolbar">' + seg('leg', { dx: 'Gamba destra', sx: 'Gamba sinistra' }, prefs.leg) + '</div>' +
        '<div class="toolbar">' + seg('eyes', { aperti: 'Occhi aperti', chiusi: 'Occhi chiusi' }, prefs.eyes) + '</div>';
      how = '<li>Tieni il telefono <b>appoggiato al petto</b> con entrambe le mani.</li><li>Tocca <b>Inizia</b>: dopo il conto alla rovescia sollevi un piede e resti in equilibrio per <b>30 secondi</b>.</li><li>Se appoggi il piede, tocca lo schermo: salviamo il tempo che hai resistito.</li>';
    } else if (type === 'salto') {
      how = '<li>Tieni il telefono <b>stretto al petto</b> con entrambe le mani, gomiti fermi.</li><li>Tocca <b>Inizia</b>: dopo il "Via" hai <b>8 secondi</b> per fare un salto verso l’alto, il più alto possibile.</li><li>Atterra sugli avampiedi, senza piegare troppo le ginocchia in volo.</li>';
    } else {
      setup = '<div class="toolbar">' + seg('dist', { 10: '10 m', 20: '20 m', 30: '30 m' }, prefs.dist) + '</div>';
      how = '<li>Misura la distanza e prepara un compagno con il telefono all’arrivo (oppure tienilo tu).</li><li>Tocca <b>Inizia</b>: al bip del "Via" parti.</li><li>Tocca <b>Stop</b> sul traguardo.</li>';
    }
    app.innerHTML = '<div class="detail-head"><div class="eyebrow">Misura i tuoi progressi</div><h1>' + T.name + '</h1></div>' +
      '<div class="home-grid"><div>' +
      '<div class="card"><img class="ts-hero" src="' + IMG[type] + '" alt="" loading="lazy" />' +
      '<div class="toolbar">' + seg('cond', COND, prefs.cond) + '</div>' + setup +
      '<ol class="steps">' + how + '</ol>' +
      '<div class="ts-live" id="ts-live" hidden><div class="ts-big" id="ts-big"></div><div class="small muted" id="ts-sub"></div></div>' +
      '<p class="gate-msg" id="ts-msg" role="alert"></p>' +
      '<button class="btn primary" id="ts-go" type="button">Inizia</button></div>' +
      '</div><div>' +
      '<div class="card"><h3>I tuoi risultati</h3>' + summary(type) + history(type) + '</div>' +
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
      stopBtn.disabled = false; stopBtn.textContent = 'Stop';
      const iv = setInterval(() => { big.textContent = fmt((performance.now() - t0) / 1000, 2) + ' s'; }, 50);
      stopBtn.onclick = () => {
        clearInterval(iv);
        const t = (performance.now() - t0) / 1000;
        const v = prefs.dist / t;
        addResult({ type, value: t, note: prefs.dist + ' m · ' + fmt(v * 3.6, 1) + ' km/h' });
        renderTest(app, type);
        showDone(prefs.dist + ' m in ' + fmt(t, 2) + ' s · velocità media ' + fmt(v * 3.6, 1) + ' km/h');
      };
      return;
    }

    if (!(await motionPermission())) {
      msg.textContent = 'Serve il permesso ai sensori di movimento. Usa il telefono (non il computer) e consenti l’accesso quando richiesto.';
      go.disabled = false; return;
    }
    live.hidden = false;
    sub.textContent = type === 'equilibrio' ? 'Preparati: telefono al petto' : 'Telefono stretto al petto';
    await countdown(big);

    if (type === 'equilibrio') {
      const DUR = 30000; const t0 = performance.now();
      sub.textContent = 'Resta in equilibrio · tocca lo schermo se appoggi il piede';
      const iv = setInterval(() => { big.textContent = Math.max(0, Math.ceil((DUR - (performance.now() - t0)) / 1000)) + ' s'; }, 200);
      const tap = () => record.stop && record.stop();
      setTimeout(() => document.addEventListener('pointerdown', tap, { once: true }), 300);
      const samples = await record(DUR);
      document.removeEventListener('pointerdown', tap);
      clearInterval(iv); beep(1100, 300);
      const held = Math.min(DUR, performance.now() - t0) / 1000;
      const score = swayScore(samples);
      if (score == null) { msg.textContent = 'Il sensore di movimento non ha inviato dati: prova dal telefono.'; go.disabled = false; live.hidden = true; return; }
      const note = (prefs.leg === 'dx' ? 'gamba dx' : 'gamba sx') + ' · occhi ' + prefs.eyes + (held < 29.5 ? ' · ' + fmt(held, 0) + ' s' : '');
      addResult({ type, value: score, note, held, leg: prefs.leg, eyes: prefs.eyes });
      renderTest(app, type);
      showDone('Oscillazione ' + fmt(score, 2) + ' m/s² (più è bassa, più sei stabile)' + (held < 29.5 ? ' · hai resistito ' + fmt(held, 0) + ' s' : ''));
      return;
    }

    // salto
    sub.textContent = 'Salta ora!';
    const samples = await record(8000);
    beep(1100, 300);
    const t = flightTime(samples);
    if (!samples.length) { msg.textContent = 'Il sensore di movimento non ha inviato dati: prova dal telefono.'; go.disabled = false; live.hidden = true; return; }
    if (t == null) { msg.textContent = 'Non abbiamo riconosciuto il salto: tieni il telefono ben stretto al petto e riprova.'; go.disabled = false; big.textContent = ''; return; }
    const h = heightCm(t);
    addResult({ type, value: h, note: 'volo ' + fmt(t * 1000, 0) + ' ms' });
    renderTest(app, type);
    showDone('Salto di ' + fmt(h, 0) + ' cm (volo ' + fmt(t * 1000, 0) + ' ms)');
  }

  function showDone(text) {
    const m = document.getElementById('ts-msg');
    if (m) { m.className = 'ts-done'; m.textContent = 'Risultato salvato: ' + text; }
  }

  function render(app, arg) {
    if (arg) renderTest(app, arg); else renderList(app);
  }

  window.EqTests = { cardHtml, render, IMG, _flightTime: flightTime, _swayScore: swayScore, _heightCm: heightCm };
})();
