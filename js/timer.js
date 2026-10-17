/* Promemoria delle 2 ore: avvia un'applicazione, avvisa quando è ora di togliere il dispositivo
   e tiene il conto delle sessioni (2 al giorno, 5 giorni di utilizzo e 2 di riposo).
   Nell'app per iPhone/Android usa le notifiche locali di Capacitor, che arrivano anche ad app chiusa;
   nella web app avvisa con una notifica del browser (se permessa) e con un avviso nella pagina. */
(function () {
  const DURATION = 2 * 60 * 60 * 1000;
  const NOTIF_ID = 2001;
  const KEY = 'tp-session';
  const LOG = 'tp-log';
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage non disponibile */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage non disponibile */ } },
  };
  const native = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;

  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const left = (s) => Math.max(0, s.end - Date.now());
  const fmtLeft = (ms) => { const m = Math.ceil(ms / 60000); return T('{h} h {m} min', { h: Math.floor(m / 60), m: pad(m % 60) }); };

  const TITLE = T('È ora di togliere il dispositivo Equistasi');
  const BODY = T('Sono passate 2 ore dall’applicazione. Togli il dispositivo e lascia riposare la pelle.');

  /* ───────── Notifiche ───────── */
  async function askPermission() {
    const LN = native();
    if (LN) {
      const p = await LN.requestPermissions();
      return p.display === 'granted';
    }
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    return (await Notification.requestPermission()) === 'granted';
  }

  let webTimer = null;
  async function schedule(end) {
    const LN = native();
    if (LN) {
      await LN.schedule({ notifications: [{ id: NOTIF_ID, title: TITLE, body: BODY, schedule: { at: new Date(end), allowWhileIdle: true } }] });
      return;
    }
    clearTimeout(webTimer);
    webTimer = setTimeout(fire, Math.max(0, end - Date.now()));
  }
  async function cancel() {
    const LN = native();
    if (LN) { try { await LN.cancel({ notifications: [{ id: NOTIF_ID }] }); } catch (e) { /* nessuna notifica */ } }
    clearTimeout(webTimer);
  }
  // Solo web app: notifica del browser + avviso nella pagina
  function fire() {
    const s = store.get(KEY, null);
    if (!s || s.notified) return;
    s.notified = true; store.set(KEY, s);
    if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker) {
      navigator.serviceWorker.ready.then((r) => r.showNotification(TITLE, { body: BODY, icon: 'img/icon-192.png', tag: 'tp-timer', vibrate: [200, 100, 200] })).catch(() => {});
    }
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    render();
  }

  /* ───────── Sessioni ───────── */
  async function start(serial) {
    const now = Date.now();
    const s = { start: now, end: now + DURATION };
    if (serial) s.serial = serial;
    store.set(KEY, s);
    const log = store.get(LOG, []);
    log.push(now);
    store.set(LOG, log.filter((t) => now - t < 30 * 864e5));
    render(); // la scheda si aggiorna subito, anche mentre il telefono chiede il permesso per le notifiche
    const ok = await askPermission().catch(() => false);
    await schedule(s.end).catch(() => {});
    render(ok ? '' : T('Le notifiche non sono attive: tieni aperta l’app o controlla l’orario indicato qui sopra.'));
  }
  async function stop() {
    store.del(KEY);
    await cancel();
    render();
  }

  // Giorni consecutivi di utilizzo fino a oggi (o fino a ieri, se oggi non è ancora stato usato)
  function streak() {
    const days = new Set(store.get(LOG, []).map(dayKey));
    let n = 0;
    const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  const todayCount = () => store.get(LOG, []).filter((t) => dayKey(t) === dayKey(Date.now())).length;


  /* ───────── Anello del tempo e scheda "Oggi" ───────── */
  // anello di avanzamento (frac 0–1) con un contenuto al centro
  function ring(frac, size, w, inner) {
    const r = (size - w) / 2; const c = 2 * Math.PI * r; const f = Math.max(0, Math.min(1, frac));
    return '<div class="tm-ringbox" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" aria-hidden="true">' +
      '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="tm-track" stroke-width="' + w + '" fill="none"/>' +
      (f > 0 ? '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" class="tm-prog" stroke-width="' + w + '" fill="none" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>' : '') + '</svg>' +
      '<div class="tm-ringin">' + inner + '</div></div>';
  }
  const since = (t) => { const m = Math.max(0, Math.floor((Date.now() - t) / 60000)); return m < 60 ? T('{m} min', { m }) : T('{h} h {m} min', { h: Math.floor(m / 60), m: pad(m % 60) }); };
  const mini = (sn, ok) => '<span class="dev-mini td-dev" aria-hidden="true"><span class="dev-mini-win' + (ok ? '' : ' idle') + '">' + (ok ? '✓' : '') + '</span><span class="dev-mini-sn">' + (sn || '') + '</span><span class="dev-mini-ce">CE</span></span>';
  function todayHtml() {
    const s = store.get(KEY, null);
    let sn = s && s.serial;
    if (!sn) { try { sn = localStorage.getItem('tp-serial') || ''; } catch (e) { sn = ''; } } // salvato come testo semplice da app.js
    const esc = (x) => String(x).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    let main; let act;
    if (s && left(s) > 0) {
      main = '<div class="td-main">' + ring((Date.now() - s.start) / DURATION, 96, 7, mini(esc(sn), true)) +
        '<div><div class="td-k">' + T('Dispositivo attivo') + '</div><h3>' + T('Applicato da {t}', { t: since(s.start) }) + '</h3>' +
        '<p class="small">' + T('Toglilo alle <b>{end}</b> · ti avvisiamo noi', { end: hhmm(s.end) }) + '</p></div></div>';
      act = '<a class="btn" href="#/promemoria">' + T('Apri il promemoria') + '</a>';
    } else if (s) {
      main = '<div class="td-main">' + ring(1, 96, 7, mini(esc(sn), true)) +
        '<div><div class="td-k">' + T('Sono passate 2 ore') + '</div><h3>' + T('Togli il dispositivo') + '</h3><p class="small">' + T('e lascia riposare la pelle') + '</p></div></div>';
      act = '<button class="btn primary" data-tm="stop" type="button">' + T('Fatto, l’ho tolto') + '</button>';
    } else {
      const n = todayCount();
      main = '<div class="td-main">' + ring(0, 96, 7, mini(esc(sn), false)) +
        '<div><div class="td-k">' + T('Oggi') + '</div><h3>' + (n ? T('Applicato {n} volta su 2', { n: Math.min(n, 2) }) : T('Nessun dispositivo applicato')) + '</h3>' +
        '<p class="small">' + T('Quando applichi il dispositivo tocca il pulsante: dopo <b>2 ore</b> ti ricordiamo di toglierlo.') + '</p></div></div>';
      act = '<button class="btn primary" data-tm="start" type="button">' + T('Ho applicato il dispositivo') + '</button>';
    }
    return '<div class="card today-card" id="today-card">' + main + '<div class="td-act">' + act + '</div><p class="small td-msg" id="today-msg" hidden></p></div>';
  }

  /* ───────── Interfaccia ───────── */
  function cardHtml() {
    const s = store.get(KEY, null);
    const today = todayCount();
    const st = streak();
    const usedToday = today > 0;
    let body;
    if (s && left(s) > 0) {
      body = '<div class="tm-big">' + ring(1 - left(s) / DURATION, 210, 16, '<span class="tm-big-l">' + T('mancano') + '</span><b>' + fmtLeft(left(s)) + '</b><span class="tm-big-l">' + T('toglilo alle {end}', { end: hhmm(s.end) }) + '</span>') + '</div>' +
        '<p class="small" style="margin:0 0 12px">' + T('Applicato alle <b>{start}</b>: toglilo alle <b>{end}</b>. Ti avvisiamo noi.', { start: hhmm(s.start), end: hhmm(s.end) }) + '</p>' +
        '<button class="btn" data-tm="stop" type="button">' + T('L’ho già tolto') + '</button>';
    } else if (s) {
      body = '<div class="warn" style="margin-bottom:12px">' + T('<b>Sono passate 2 ore.</b> Togli il dispositivo Equistasi e lascia riposare la pelle.') + '</div>' +
        '<button class="btn primary" data-tm="stop" type="button">' + T('Fatto, l’ho tolto') + '</button>';
    } else if (st >= 5 && !usedToday) {
      body = '<div class="callout" style="margin-bottom:12px">' + T('Hai usato il dispositivo per <b>5 giorni di seguito</b>: oggi e domani sono di <b>riposo</b>.') + '</div>' +
        '<button class="btn" data-tm="start" type="button">' + T('Applicalo comunque e avvia le 2 ore') + '</button>';
    } else {
      body = '<p class="small" style="margin:0 0 12px">' + T('Quando applichi il dispositivo, tocca il pulsante: dopo <b>2 ore</b> ti ricordiamo di toglierlo.') + '</p>' +
        '<button class="btn primary" data-tm="start" type="button">' + T('Ho applicato il dispositivo') + '</button>';
    }
    const dots = [0, 1].map((i) => '<span class="tm-dot' + (i < today ? ' on' : '') + '"></span>').join('');
    return '<div class="card tm-card" id="tm-card"><h3>' + T('Promemoria delle 2 ore') + '</h3>' + body +
      '<p class="tm-msg small" id="tm-msg" hidden></p>' +
      '<div class="tm-stats small"><span>' + T('Oggi {dots} {n} di 2', { dots, n: Math.min(today, 2) }) + '</span>' +
      '<span>' + T('Giorni di fila: <b>{n}</b> di 5', { n: st }) + '</span></div>' + dailyHtml() + '</div>';
  }

  /* ───────── Promemoria giornalieri (solo app per iPhone/Android) ───────── */
  const DAILY = 'tp-daily';
  const daily = () => store.get(DAILY, { on: false, am: '09:00', pm: '15:00' });
  function dailyHtml() {
    if (!native()) return '';
    const d = daily();
    return '<div class="tm-daily"><label class="ck"><input type="checkbox" id="tm-daily"' + (d.on ? ' checked' : '') + ' />' +
      '<span>' + T('<b>Ricordami di applicarlo</b> dal lunedì al venerdì') + '</span></label>' +
      '<div class="tm-times"><label>' + T('Mattina') + ' <input type="time" class="tm-time" data-k="am" value="' + d.am + '" /></label>' +
      '<label>' + T('Pomeriggio') + ' <input type="time" class="tm-time" data-k="pm" value="' + d.pm + '" /></label></div></div>';
  }
  // id 3002-3006 mattina, 3012-3016 pomeriggio (giorni 2-6 = lunedì-venerdì)
  async function scheduleDaily() {
    const LN = native();
    if (!LN) return;
    const ids = [];
    for (let w = 2; w <= 6; w++) ids.push({ id: 3000 + w }, { id: 3010 + w });
    try { await LN.cancel({ notifications: ids }); } catch (e) { /* nessun promemoria */ }
    const d = daily();
    if (!d.on) return;
    if (!(await askPermission().catch(() => false))) return;
    const list = [];
    [['am', 3000], ['pm', 3010]].forEach(([k, base]) => {
      const [h, m] = (d[k] || '09:00').split(':').map(Number);
      for (let w = 2; w <= 6; w++) {
        list.push({ id: base + w, title: T('È ora di applicare Equistasi'), body: T('Applica il dispositivo e avvia il promemoria delle 2 ore.'), schedule: { on: { weekday: w, hour: h, minute: m }, allowWhileIdle: true } });
      }
    });
    await LN.schedule({ notifications: list });
  }
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.id === 'tm-daily') { const d = daily(); d.on = t.checked; store.set(DAILY, d); scheduleDaily(); }
    if (t.classList && t.classList.contains('tm-time')) { const d = daily(); d[t.dataset.k] = t.value; store.set(DAILY, d); scheduleDaily(); }
  });

  // Ridisegna la scheda (se presente) e la barra in alto
  function render(msg) {
    const old = document.getElementById('tm-card');
    if (old) {
      old.outerHTML = cardHtml();
      if (msg) { const m = document.getElementById('tm-msg'); m.textContent = msg; m.hidden = false; }
    }
    const td = document.getElementById('today-card');
    if (td) {
      td.outerHTML = todayHtml();
      if (msg) { const m = document.getElementById('today-msg'); m.textContent = msg; m.hidden = false; }
    }
    bar();
  }
  function bar() {
    const el = document.getElementById('timerbar');
    if (!el) return;
    const s = store.get(KEY, null);
    if (!s) { el.hidden = true; return; }
    const ms = left(s);
    el.hidden = false;
    el.classList.toggle('done', ms === 0);
    el.innerHTML = ms > 0
      ? '⏱ ' + T('Dispositivo applicato · toglilo alle <b>{end}</b> ({left})', { end: hhmm(s.end), left: fmtLeft(ms) })
      : '⏰ ' + T('<b>Sono passate 2 ore:</b> togli il dispositivo');
  }

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tm]');
    if (!b) return;
    if (b.dataset.tm === 'start') start(); else stop();
  });
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('#timerbar')) { const c = document.getElementById('tm-card'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); else location.hash = '#/promemoria'; }
  });

  // Aggiorna il conto alla rovescia; nella web app riprogramma l'avviso dopo un ricaricamento
  function tick() {
    const s = store.get(KEY, null);
    if (s && !native() && !s.notified) { if (left(s) === 0) fire(); else if (!webTimer) schedule(s.end); }
    render();
  }
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  window.addEventListener('load', tick);

  window.EqTimer = { cardHtml, todayHtml, render, tick, start };
})();
