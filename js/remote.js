/* Telecomando dei test con Apple Watch (solo nell'app iPhone).
   L'app sull'orologio manda i comandi tramite il componente nativo WatchBridge:
   - start { test, cond, eyes, leg }: apre il test e lo avvia come se si toccasse «Inizia»;
   - stop: «Ha spostato un piede» / tocco sullo schermo durante il test;
   - sprint { time, dist, cond }: salva lo sprint cronometrato sull'orologio;
   - hello: l'orologio chiede lo stato.
   Il telefono rimanda all'orologio lo stato del test (conto alla rovescia, secondi, risultato).
   Prima serve un tocco su «Collega l'orologio»: dà il permesso ai sensori e tiene acceso lo schermo. */
(function () {
  const C = window.Capacitor;
  const W = C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.WatchBridge;
  let armed = false;
  let paired = false;
  let poll = null;
  let lastSent = '';

  const send = (o) => { if (W) W.send(Object.assign({ armed }, o)).catch(() => {}); };
  const txt = (sel) => { const el = document.querySelector(sel); return el ? el.textContent.trim() : ''; };

  async function motionPermission() {
    if (typeof DeviceMotionEvent === 'undefined') return false;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch (e) { return false; }
    }
    return true;
  }

  async function arm(on) {
    if (on && !(await motionPermission())) { refreshCards(T('Serve il permesso ai sensori di movimento: consenti l’accesso quando richiesto.')); return; }
    armed = on;
    W.keepAwake({ on }).catch(() => {});
    send({ phase: 'idle', big: '', sub: '', result: '', error: '' });
    refreshCards();
  }

  // Segue lo stato del test sullo schermo e lo manda all'orologio quando cambia
  function follow(kind) {
    clearInterval(poll);
    const t0 = Date.now(); let wentGo = false;
    poll = setInterval(() => {
      let big, sub, done = '', err = '';
      if (kind === 'postura') {
        big = txt('#pz-big'); sub = txt('#pz-sub');
        const m = document.getElementById('pz-msg'); if (m && m.textContent.trim()) err = m.textContent.trim();
        if (/^#\/postura\/risultato\//.test(location.hash)) {
          const r = window.EqPosture.lastRecord();
          if (r && r.m) done = T('Indice di stabilità {i} · area {a} cm²', { i: window.EqPosture.index(r.m.area), a: r.m.area.toFixed(1).replace('.', window.LANG === 'en' ? '.' : ',') });
        }
      } else {
        big = txt('#ts-big'); sub = txt('#ts-sub');
        const m = document.getElementById('ts-msg');
        if (m && m.textContent.trim()) { if (m.classList.contains('ts-done')) done = m.textContent.trim().replace(/^[^:]*:\s*/, ''); else err = m.textContent.trim(); }
      }
      if (done) { clearInterval(poll); send({ phase: 'done', result: done, big: '', sub: '', error: '' }); return; }
      if (err) { clearInterval(poll); send({ phase: 'error', error: err }); return; }
      const go = /^(Via|Go)/i.test(big) || /^\d+ s$/.test(big);
      const phase = go ? 'go' : 'run';
      const key = phase + '|' + big + '|' + sub;
      if (key !== lastSent) { lastSent = key; send({ phase, big, sub, error: '' }); }
      if (go && !wentGo) wentGo = true;
      if (Date.now() - t0 > 120000) clearInterval(poll);
    }, 300);
  }

  function clickWhenReady(sel, cb) {
    let n = 0;
    const iv = setInterval(() => {
      const b = document.querySelector(sel);
      if (b && !b.disabled) { clearInterval(iv); b.click(); cb(); }
      else if (++n > 40) { clearInterval(iv); send({ phase: 'error', error: T('Il test non è partito: apri l’app sul telefono e riprova.') }); }
    }, 100);
  }

  function start(c) {
    const cond = c.cond === 'con' ? 'con' : 'senza';
    const eyes = c.eyes === 'chiusi' ? 'chiusi' : 'aperti';
    lastSent = '';
    if (c.test === 'stabilita') {
      window.EqPosture.setPrefs({ cond, eyes, mount: 'cintura' });
      location.hash = '#/postura/stabilita';
      setTimeout(() => clickWhenReady('#pz-go', () => follow('postura')), 250);
      return;
    }
    if (['equilibrio', 'ortostasi', 'salto'].includes(c.test)) {
      window.EqTests.setPrefs({ cond, eyes, leg: c.leg === 'sx' ? 'sx' : 'dx' });
      location.hash = '#/test/' + c.test;
      setTimeout(() => clickWhenReady('#ts-go', () => follow('tests')), 250);
      return;
    }
    send({ phase: 'error', error: T('Test non disponibile dall’orologio.') });
  }

  function stop() {
    const moved = document.getElementById('pz-moved');
    if (moved && moved.offsetParent) { moved.click(); return; }
    document.dispatchEvent(new Event('pointerdown'));
  }

  function onCommand(c) {
    if (!c || !c.cmd) return;
    if (c.cmd === 'hello') { send({}); return; }
    if (c.cmd === 'sprint') {
      const time = Number(c.time), dist = Number(c.dist) || 20;
      if (time > 0.5 && time < 120) {
        const res = window.EqTests.addSprint(time, dist, c.cond === 'con' ? 'con' : 'senza');
        send({ phase: 'done', result: res });
        if (location.hash === '#/test/sprint' || location.hash === '#/test') window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
      return;
    }
    if (!armed) { send({ phase: 'error', error: T('Sul telefono apri Progressi e tocca «Collega l’orologio».') }); return; }
    if (c.cmd === 'start') start(c);
    else if (c.cmd === 'stop') stop();
  }

  /* Scheda «Apple Watch» (Progressi e Misura la postura): visibile solo nell'app iPhone con un orologio abbinato */
  function cardHtml() {
    if (!W || !paired) return '';
    return '<div class="card watch-card" data-watch-card>' + cardInner() + '</div>';
  }
  function cardInner(msg) {
    return '<div class="watch-row"><span class="watch-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2l1.5 1"/></svg></span>' +
      '<span><b>' + T('Apple Watch') + '</b><br><span class="small muted">' + (armed ? T('Collegato: avvia i test dall’orologio. Lo schermo del telefono resta acceso.') : T('Avvia i test dall’orologio, con il telefono in cintura o al petto.')) + '</span></span></div>' +
      '<button type="button" class="btn ' + (armed ? '' : 'primary') + '" data-watch-arm>' + (armed ? T('Scollega l’orologio') : T('Collega l’orologio')) + '</button>' +
      (msg ? '<p class="gate-msg">' + msg + '</p>' : '');
  }
  function refreshCards(msg) { document.querySelectorAll('[data-watch-card]').forEach((el) => { el.innerHTML = cardInner(msg); }); }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-watch-arm]'); if (b) arm(!armed); });

  if (W) {
    W.addListener('command', onCommand);
    W.status().then((s) => { paired = !!(s && s.paired); if (paired) window.dispatchEvent(new HashChangeEvent('hashchange')); }).catch(() => {});
    // con l'app in background il test non può partire: si scollega
    document.addEventListener('visibilitychange', () => { if (document.hidden && armed) { armed = false; W.keepAwake({ on: false }).catch(() => {}); send({ phase: 'idle' }); } });
  }

  window.EqRemote = { cardHtml, enabled: () => !!W };
})();
