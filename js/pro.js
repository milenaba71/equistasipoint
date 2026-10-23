/* Strumenti per il professionista sanitario: solo con un dispositivo a «noleggio prof».
   - Goniometro con il telefono: ginocchio (due letture, coscia e tibia) e spalla (zero a braccio lungo il fianco).
   - Scoliometro: rotazione del tronco nel test di Adams, telefono di traverso sulla schiena.
   - Dolore 0–10 prima dell'applicazione e dopo le 2 ore, e uso del dispositivo preso dal promemoria.
   Il dispositivo è «noleggio prof» se la verifica del seriale (Make + Airtable) risponde pro: true.
   Tutti i dati restano sul telefono. Misure indicative, non diagnostiche. */
(function () {
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage non disponibile */ } },
  };
  const raw = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d) => (window.LANG === 'en' ? v.toFixed(d) : v.toFixed(d).replace('.', ','));
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = (t) => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2); };
  const dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const DAY = 864e5;

  // «noleggio prof» (dalla verifica del seriale); con la beta attiva per le prove interne
  const isPro = () => raw('tp-pro') === '1' || store.get('tp-beta', false) === true;

  const GONIO = 'tp-gonio', SCOLIO = 'tp-scolio', PAIN = 'tp-pain', USE = 'tp-use', LOG = 'tp-log';
  const prefs = store.get('tp-pro-prefs', { joint: 'ginocchio', kmv: 'flessione', smv: 'flessione', side: 'dx', cond: 'senza', reg: 'toracica', hump: 'dx' });
  const savePrefs = () => store.set('tp-pro-prefs', prefs);

  const JOINTS = () => ({ ginocchio: T('Ginocchio'), spalla: T('Spalla') });
  const MOVES = () => ({ flessione: T('Flessione'), estensione: T('Estensione'), abduzione: T('Abduzione') });
  const SIDES = () => ({ dx: T('Destro'), sx: T('Sinistro') });
  const CONDS = () => ({ senza: T('Senza Equistasi'), con: T('Con Equistasi') });
  const REGIONS = () => ({ toracica: T('Toracica'), toracolombare: T('Toraco-lombare'), lombare: T('Lombare') });

  const head = (title, sub, eyebrow) => '<div class="detail-head"><div class="eyebrow">' + (eyebrow || T('Professionista') + ' · <span class="beta-tag">' + T('in prova') + '</span>') + '</div><h1>' + title + '</h1>' +
    (sub ? '<p class="small muted" style="margin:6px 0 0">' + sub + '</p>' : '') + '</div>';
  const NOTE = '<p class="small muted" style="margin-top:14px">' + T('Misure indicative fatte con i sensori del telefono: non diagnostiche e non sostitutive della valutazione clinica.') + '</p>';
  const seg = (name, opts, cur, label) => '<div class="seg" role="group" aria-label="' + esc(label) + '">' +
    Object.keys(opts).map((k) => '<button type="button" data-pp="' + name + '" data-val="' + k + '" aria-pressed="' + (k === cur) + '">' + opts[k] + '</button>').join('') + '</div>';

  /* ───────── Sensori: gravità filtrata dall'accelerometro ───────── */
  let motionOn = null; let g = null;
  function startMotion(cb) {
    stopMotion();
    g = null;
    motionOn = (e) => {
      const a = e.accelerationIncludingGravity || {};
      if (a.x == null) return;
      if (!g) g = { x: a.x, y: a.y, z: a.z }; else { g.x += (a.x - g.x) * 0.2; g.y += (a.y - g.y) * 0.2; g.z += (a.z - g.z) * 0.2; }
      cb(g);
    };
    window.addEventListener('devicemotion', motionOn);
  }
  function stopMotion() { if (motionOn) window.removeEventListener('devicemotion', motionOn); motionOn = null; }
  async function permission() {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try { return (await DeviceMotionEvent.requestPermission()) === 'granted'; } catch (e) { return false; }
    }
    return typeof DeviceMotionEvent !== 'undefined';
  }
  const deg = (r) => r * 180 / Math.PI;
  const wrap = (a) => { let x = a % 360; if (x > 180) x -= 360; if (x < -180) x += 360; return x; };
  // rotazione del telefono nel piano dello schermo (telefono «di taglio», schermo di lato)
  const planeAngle = (v) => deg(Math.atan2(v.x, v.y));
  const planeOk = (v) => Math.hypot(v.x, v.y) / Math.max(0.1, Math.hypot(v.x, v.y, v.z)) > 0.6;

  /* ───────── Goniometro ───────── */
  function renderGonio(app) {
    const knee = prefs.joint === 'ginocchio';
    const mv = knee ? prefs.kmv : prefs.smv;
    const moves = knee ? { flessione: MOVES().flessione, estensione: MOVES().estensione } : { flessione: MOVES().flessione, abduzione: MOVES().abduzione };
    const how = knee
      ? [T('Persona sdraiata o seduta. Appoggia il telefono <b>sul lato esterno della coscia</b>, lungo l’osso, <b>schermo verso l’esterno</b> e parte alta del telefono verso il ginocchio.'),
        T('Tocca <b>Segna coscia</b>. Poi appoggia il telefono <b>sul lato esterno della tibia</b>, sempre schermo verso l’esterno e parte alta verso il piede.'),
        mv === 'flessione' ? T('Fai piegare il ginocchio al massimo e tocca <b>Segna tibia</b>.') : T('Fai distendere il ginocchio al massimo e tocca <b>Segna tibia</b>: 0° = gamba dritta.')]
      : [T('Persona in piedi, braccio lungo il fianco. Appoggia il telefono <b>sul braccio</b>, sopra il gomito, con la parte alta verso la mano.') + ' ' +
        (mv === 'flessione' ? T('Schermo <b>verso l’esterno</b> (di lato).') : T('Schermo <b>in avanti</b> (davanti al braccio).')),
        T('Tocca <b>Zero</b> con il braccio lungo il fianco.'),
        (mv === 'flessione' ? T('Fai alzare il braccio <b>in avanti</b> al massimo, gomito disteso.') : T('Fai alzare il braccio <b>di lato</b> al massimo, gomito disteso.')) + ' ' + T('L’app tiene il valore massimo: tocca <b>Salva</b>.')];
    app.innerHTML = head(T('Goniometro'), T('Gradi di movimento di ginocchio e spalla con il telefono.')) +
      '<div class="card"><div class="toolbar">' + seg('joint', JOINTS(), prefs.joint, T('Articolazione')) + '</div>' +
      '<div class="toolbar">' + seg(knee ? 'kmv' : 'smv', moves, mv, T('Movimento')) + '</div>' +
      '<div class="toolbar">' + seg('side', SIDES(), prefs.side, T('Lato')) + '</div>' +
      '<div class="toolbar">' + seg('cond', CONDS(), prefs.cond, T('Condizione')) + '</div>' +
      '<ol class="steps">' + how.map((x) => '<li>' + x + '</li>').join('') + '</ol>' +
      '<div class="pro-live" id="pro-live"><div class="pro-big" id="pro-big">–</div><div class="small" id="pro-sub">' + T('Tocca «Inizia» per accendere i sensori') + '</div></div>' +
      '<p class="gate-msg" id="pro-msg" role="status"></p>' +
      '<div class="btn-col"><button class="btn primary" type="button" id="pro-go">' + T('Inizia') + '</button>' +
      '<button class="btn" type="button" id="pro-save" hidden>' + T('Salva') + '</button></div></div>' +
      '<div class="card"><h3>' + T('Misure salvate') + '</h3>' + gonioHistory() + '</div>' + NOTE;
    bindSegs(app, () => renderGonio(app));

    const big = document.getElementById('pro-big'); const sub = document.getElementById('pro-sub');
    const go = document.getElementById('pro-go'); const save = document.getElementById('pro-save'); const msg = document.getElementById('pro-msg');
    let step = 0; let ref = null; let value = null; let best = 0; let lastA = null; let unwrapped = 0; let cur = null;
    const show = (v) => { big.textContent = v == null ? '–' : Math.round(v) + '°'; };
    go.addEventListener('click', async () => {
      if (step === 0) {
        if (!(await permission())) { msg.textContent = T('Serve il permesso ai sensori di movimento: consenti l’accesso quando richiesto.'); return; }
        step = 1; go.textContent = knee ? T('Segna coscia') : T('Zero');
        sub.textContent = knee ? T('Telefono sulla coscia, di taglio') : T('Braccio lungo il fianco');
        startMotion((v) => {
          cur = v;
          if (!planeOk(v)) { sub.textContent = T('Tieni il telefono di taglio: lo schermo deve guardare di lato, non verso l’alto'); return; }
          const a = planeAngle(v);
          if (knee) {
            if (step === 2) { value = Math.abs(wrap(ref - a)); show(value); sub.textContent = T('Telefono sulla tibia'); }
          } else if (step === 2) {
            unwrapped += wrap(a - lastA); lastA = a; value = Math.min(180, Math.abs(unwrapped)); best = Math.max(best, value);
            show(value); sub.textContent = T('Massimo: {v}°', { v: Math.round(best) });
          }
        });
        return;
      }
      if (step === 1) {
        if (!cur || !planeOk(cur)) { msg.textContent = T('Tieni il telefono di taglio: lo schermo deve guardare di lato, non verso l’alto'); return; }
        msg.textContent = '';
        ref = planeAngle(cur); lastA = ref; unwrapped = 0; best = 0; step = 2;
        if (knee) { go.textContent = T('Segna tibia'); sub.textContent = T('Ora appoggia il telefono sulla tibia'); show(null); }
        else { go.hidden = true; save.hidden = false; show(0); }
        return;
      }
      if (step === 2 && knee) { if (value == null) return; stopMotion(); go.hidden = true; save.hidden = false; sub.textContent = T('Misura pronta: tocca Salva'); }
    });
    save.addEventListener('click', () => {
      const v = knee ? value : best;
      if (v == null) return;
      stopMotion();
      const all = store.get(GONIO, []); all.push({ t: Date.now(), j: prefs.joint, mv, side: prefs.side, cond: prefs.cond, v: Math.round(v) });
      store.set(GONIO, all.slice(-300));
      renderGonio(app);
      const m = document.getElementById('pro-msg'); m.className = 'ts-done'; m.textContent = T('Salvato: {v}°', { v: Math.round(v) });
    });
  }

  const sideWord = (r) => r.j === 'spalla' ? (r.side === 'dx' ? T('destra') : T('sinistra')) : (r.side === 'dx' ? T('destro') : T('sinistro'));
  const moveLabel = (r) => JOINTS()[r.j] + ' ' + sideWord(r) + ' · ' + MOVES()[r.mv];
  function gonioHistory() {
    const all = store.get(GONIO, []);
    if (!all.length) return '<p class="small muted" style="margin:0">' + T('Nessuna misura salvata.') + '</p>';
    // per ogni articolazione/movimento/lato: prima e ultima misura, e confronto destro/sinistro
    const groups = {};
    all.forEach((r) => { const k = r.j + '|' + r.mv + '|' + r.side; (groups[k] = groups[k] || []).push(r); });
    const rows = Object.keys(groups).map((k) => {
      const l = groups[k]; const first = l[0]; const last = l[l.length - 1];
      const other = groups[last.j + '|' + last.mv + '|' + (last.side === 'dx' ? 'sx' : 'dx')];
      const sym = other ? Math.round(Math.min(last.v, other[other.length - 1].v) / Math.max(1, Math.max(last.v, other[other.length - 1].v)) * 100) : null;
      return '<tr><th>' + moveLabel(last) + '</th><td><b>' + last.v + '°</b> <small class="muted">' + dateStr(last.t) + ' · ' + (last.cond === 'con' ? T('con') : T('senza')) + '</small></td>' +
        '<td>' + (l.length > 1 ? (last.v - first.v >= 0 ? '+' : '') + (last.v - first.v) + '° <small class="muted">' + T('da {d}', { d: dateStr(first.t) }) + '</small>' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (sym != null && last.side === 'dx' ? sym + '%' : '<span class="muted">—</span>') + '</td></tr>';
    });
    return '<div class="pz-table-wrap"><table class="pz-table"><thead><tr><th>' + T('Movimento') + '</th><th>' + T('Ultima') + '</th><th>' + T('Variazione') + '</th><th>' + T('Simmetria dx/sx') + '</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>' +
      '<p class="small muted" style="margin:8px 0 0">' + T('Simmetria: lato con meno movimento in percentuale dell’altro (ultime misure).') + '</p>';
  }

  /* ───────── Scoliometro ───────── */
  function renderScolio(app) {
    const off = store.get('tp-scolio-zero', 0);
    app.innerHTML = head(T('Scoliometro'), T('Rotazione del tronco nel test di Adams, con il telefono di traverso sulla schiena.')) +
      '<div class="card"><div class="toolbar">' + seg('reg', REGIONS(), prefs.reg, T('Zona della schiena')) + '</div>' +
      '<div class="toolbar"><span class="small"><b>' + T('Gibbo più alto a:') + '</b></span>' + seg('hump', { dx: T('Destra'), sx: T('Sinistra') }, prefs.hump, T('Lato del gibbo')) + '</div>' +
      '<ol class="steps"><li>' + T('La persona si piega lentamente in avanti, ginocchia distese, braccia penzoloni e palmi uniti.') + '</li>' +
      '<li>' + T('Appoggia il telefono <b>di traverso sulla schiena</b>, schermo verso l’alto, con il centro del telefono sulla colonna.') + '</li>' +
      '<li>' + T('Tocca <b>Inizia</b> e fai scorrere il telefono lungo la zona scelta mentre la persona si piega: l’app tiene il valore massimo.') + '</li></ol>' +
      '<div class="pro-live"><div class="pro-big" id="pro-big">–</div><div class="small" id="pro-sub">' + T('Tocca «Inizia» per accendere i sensori') + '</div></div>' +
      '<p class="gate-msg" id="pro-msg" role="status"></p>' +
      '<div class="btn-col"><button class="btn primary" type="button" id="pro-go">' + T('Inizia') + '</button>' +
      '<button class="btn" type="button" id="pro-save" hidden>' + T('Salva') + '</button>' +
      '<button class="btn" type="button" id="pro-zero">' + T('Azzera su un tavolo') + (off ? ' (' + fmt(off, 1) + '°)' : '') + '</button></div></div>' +
      '<div class="card"><h3>' + T('Misure salvate') + '</h3>' + scolioHistory() + '</div>' + NOTE;
    bindSegs(app, () => renderScolio(app));
    const big = document.getElementById('pro-big'); const sub = document.getElementById('pro-sub'); const msg = document.getElementById('pro-msg');
    const go = document.getElementById('pro-go'); const save = document.getElementById('pro-save');
    // inclinazione del lato lungo del telefono rispetto all'orizzontale
    const tilt = (v) => deg(Math.asin(Math.max(-1, Math.min(1, v.y / Math.max(0.1, Math.hypot(v.x, v.y, v.z))))));
    let best = 0; let running = false;
    go.addEventListener('click', async () => {
      if (running) { running = false; stopMotion(); go.textContent = T('Ricomincia'); sub.textContent = T('Misura pronta: tocca Salva'); return; }
      if (!(await permission())) { msg.textContent = T('Serve il permesso ai sensori di movimento: consenti l’accesso quando richiesto.'); return; }
      best = 0; running = true; go.textContent = T('Stop'); save.hidden = false; msg.textContent = '';
      startMotion((v) => {
        if (Math.abs(v.z) / Math.max(0.1, Math.hypot(v.x, v.y, v.z)) < 0.7) { sub.textContent = T('Tieni il telefono appoggiato con lo schermo verso l’alto'); return; }
        const a = Math.abs(tilt(v) - off); best = Math.max(best, a);
        big.textContent = fmt(a, 1) + '°'; sub.textContent = T('Massimo: {v}°', { v: fmt(best, 1) });
      });
    });
    save.addEventListener('click', () => {
      stopMotion(); running = false;
      const all = store.get(SCOLIO, []); all.push({ t: Date.now(), reg: prefs.reg, side: prefs.hump, v: Math.round(best * 10) / 10 });
      store.set(SCOLIO, all.slice(-200));
      renderScolio(app);
      const m = document.getElementById('pro-msg'); m.className = 'ts-done'; m.textContent = T('Salvato: {v}°', { v: fmt(best, 1) });
    });
    document.getElementById('pro-zero').addEventListener('click', async () => {
      if (!(await permission())) { msg.textContent = T('Serve il permesso ai sensori di movimento: consenti l’accesso quando richiesto.'); return; }
      msg.className = 'gate-msg'; msg.textContent = T('Telefono fermo su un tavolo, schermo in alto…');
      const vals = [];
      startMotion((v) => {
        vals.push(tilt(v));
        if (vals.length >= 40) {
          stopMotion();
          const z = vals.slice(10).reduce((s, x) => s + x, 0) / (vals.length - 10);
          store.set('tp-scolio-zero', Math.round(z * 10) / 10);
          renderScolio(app);
          const m = document.getElementById('pro-msg'); m.className = 'ts-done'; m.textContent = T('Azzerato: correzione di {v}°', { v: fmt(z, 1) });
        }
      });
    });
  }
  function scolioHistory() {
    const all = store.get(SCOLIO, []);
    if (!all.length) return '<p class="small muted" style="margin:0">' + T('Nessuna misura salvata.') + '</p>';
    return '<div class="pz-table-wrap"><table class="pz-table"><thead><tr><th>' + T('Data') + '</th><th>' + T('Zona') + '</th><th>' + T('Rotazione') + '</th></tr></thead><tbody>' +
      all.slice(-10).reverse().map((r) => '<tr><th>' + dateStr(r.t) + '</th><td>' + REGIONS()[r.reg] + '</td><td><b>' + fmt(r.v, 1) + '°</b> ' + (r.side === 'dx' ? T('gibbo a destra') : T('gibbo a sinistra')) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  /* ───────── Dolore e uso del dispositivo ───────── */
  const avg = (l) => l.reduce((s, x) => s + x, 0) / l.length;
  function painSummary() {
    const p = store.get(PAIN, []);
    const pre = p.filter((x) => x.ph === 'pre'); const out = [];
    if (pre.length >= 2) {
      const t0 = pre[0].t; const t1 = pre[pre.length - 1].t;
      const firstW = pre.filter((x) => x.t < t0 + 7 * DAY).map((x) => x.v); const lastW = pre.filter((x) => x.t > t1 - 7 * DAY).map((x) => x.v);
      const days = Math.max(1, Math.round((t1 - t0) / DAY));
      out.push(T('Dolore prima dell’applicazione: media {a} all’inizio, {b} nell’ultima settimana ({n} valori in {g} giorni)', { a: fmt(avg(firstW), 1), b: fmt(avg(lastW), 1), n: pre.length, g: days }));
    } else if (pre.length === 1) out.push(T('Dolore prima dell’applicazione: {v} (un solo valore)', { v: pre[0].v }));
    const pairs = pre.map((x) => { const post = p.find((y) => y.ph === 'post' && y.s === x.s); return post ? post.v - x.v : null; }).filter((x) => x != null);
    if (pairs.length) out.push(T('Dopo 2 ore: in media {d} punti rispetto a prima ({n} applicazioni)', { d: (avg(pairs) > 0 ? '+' : '') + fmt(avg(pairs), 1), n: pairs.length }));
    return out;
  }
  function useSummary(days) {
    const since = Date.now() - days * DAY;
    const starts = store.get(LOG, []).filter((t) => t >= since);
    const use = store.get(USE, []).filter((u) => u.s >= since);
    if (!starts.length) return null;
    const usedDays = new Set(starts.map(dayKey)).size;
    // ore: durata reale se il dispositivo è stato tolto con il pulsante, altrimenti 2 ore
    const hours = starts.reduce((s, t) => { const u = use.find((x) => x.s === t); return s + (u ? (u.e - u.s) : 2 * 36e5) / 36e5; }, 0);
    return { days: usedDays, n: starts.length, hours };
  }
  function useLines() {
    const w = useSummary(7); const f = useSummary(14); const out = [];
    if (w) out.push(T('Ultimi 7 giorni: uso in {d} giorni su 7, {n} applicazioni', { d: w.days, n: w.n }));
    if (f) out.push(T('Ultimi 14 giorni: {d} giorni, {n} applicazioni, circa {h} ore', { d: f.days, n: f.n, h: Math.round(f.hours) }));
    return out;
  }
  function renderPain(app) {
    const p = store.get(PAIN, []).slice(-12).reverse();
    const lines = painSummary(); const use = useLines();
    app.innerHTML = head(T('Dolore e uso del dispositivo'), T('Dolore da 0 a 10 prima di applicare Equistasi e dopo le 2 ore, e quanto viene usato il dispositivo.'), T('Promemoria')) +
      '<div class="card"><h3>' + T('Riepilogo') + '</h3>' +
      ((lines.length || use.length) ? '<ul class="small pro-sum">' + lines.concat(use).map((x) => '<li>' + x + '</li>').join('') + '</ul>' : '<p class="small muted" style="margin:0">' + T('Ancora nessun dato: quando tocchi «Ho applicato il dispositivo» nel Promemoria, l’app chiede il dolore prima e dopo le 2 ore.') + '</p>') +
      '</div><div class="card"><h3>' + T('Segna il dolore adesso') + '</h3><p class="small muted" style="margin:0 0 8px">' + T('0 = nessun dolore, 10 = il peggiore immaginabile.') + '</p>' + scale('now') + '<p class="gate-msg" id="pro-msg" role="status"></p></div>' +
      (p.length ? '<div class="card"><h3>' + T('Ultimi valori') + '</h3><div class="pz-table-wrap"><table class="pz-table"><tbody>' +
        p.map((x) => '<tr><th>' + dateStr(x.t) + ' ' + pad(new Date(x.t).getHours()) + ':' + pad(new Date(x.t).getMinutes()) + '</th><td>' + ({ pre: T('prima'), post: T('dopo 2 ore'), now: T('libero') }[x.ph]) + '</td><td><b>' + x.v + '</b>/10</td></tr>').join('') +
        '</tbody></table></div></div>' : '') + NOTE;
    app.querySelectorAll('[data-pain]').forEach((b) => b.addEventListener('click', () => {
      addPain('now', Number(b.dataset.pain), null); renderPain(app);
      const m = document.getElementById('pro-msg'); m.className = 'ts-done'; m.textContent = T('Salvato: dolore {v}/10', { v: b.dataset.pain });
    }));
  }
  const scale = () => '<div class="pain-scale">' + Array.from({ length: 11 }, (_, i) => '<button type="button" data-pain="' + i + '" style="--h:' + (120 - i * 12) + '">' + i + '</button>').join('') + '</div>';
  function addPain(ph, v, s) { const all = store.get(PAIN, []); all.push({ t: Date.now(), ph, v, s }); store.set(PAIN, all.slice(-500)); }

  // Finestra «Quanto dolore senti?» quando si applica o si toglie il dispositivo (solo noleggio prof)
  // per tutti: il dolore lo vede e lo segna anche il paziente
  function askPain(ph, s) {
    const el = document.createElement('div');
    el.className = 'acct-sheet on pro-ask'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="acct-panel"><div class="acct-head"><h2>' + (ph === 'pre' ? T('Dolore prima dell’applicazione') : T('Dolore dopo le 2 ore')) + '</h2></div>' +
      '<p class="small muted" style="margin:0">' + T('Quanto dolore senti adesso? 0 = nessun dolore, 10 = il peggiore immaginabile.') + '</p>' + scale() +
      '<button type="button" class="btn" data-skip>' + T('Salta') + '</button></div>';
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pain]');
      if (b) addPain(ph, Number(b.dataset.pain), s);
      if (b || e.target.closest('[data-skip]')) el.remove();
    });
  }
  function onSessionStart(s) { askPain('pre', s.start); }
  function onSessionEnd(s) {
    if (!s) return;
    const all = store.get(USE, []); all.push({ s: s.start, e: Math.min(Date.now(), s.end) });
    store.set(USE, all.filter((u) => u.s > Date.now() - 120 * DAY));
    askPain('post', s.start);
  }


  /* ───────── Test clinici a tempo: Timed Up and Go e cammino su 10 metri ─────────
     Due modi: «telefono addosso» (in cintura o in tasca: fine automatica quando la persona si ferma, passi contati)
     oppure «cronometro» (il professionista tiene il telefono e tocca Stop). */
  const CLIN = 'tp-clin';
  const CMODES = () => ({ addosso: T('Telefono addosso'), mano: T('Cronometro in mano') });
  let actx = null;
  function beep(f, ms) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(); const gn = actx.createGain(); o.frequency.value = f; o.connect(gn); gn.connect(actx.destination);
      gn.gain.setValueAtTime(0.25, actx.currentTime); o.start(); o.stop(actx.currentTime + ms / 1000);
    } catch (e) { /* audio non disponibile */ }
    if (navigator.vibrate) navigator.vibrate(ms);
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let clinStop = null;
  function renderClin(app, test) {
    if (clinStop) clinStop();
    const tug = test === 'tug';
    const mode = prefs.cmode || 'addosso';
    const how = tug
      ? [T('Sedia con schienale e braccioli, segno a terra a <b>3 metri</b>. La persona è seduta con la schiena appoggiata, calzature abituali (ausilio se lo usa).'),
        mode === 'addosso' ? T('Metti il telefono <b>in cintura o in tasca</b> alla persona.') : T('Tieni tu il telefono e stai accanto alla persona.'),
        T('Tocca <b>Inizia</b>: al «Via» la persona si alza, cammina fino al segno a passo normale e sicuro, gira, torna e si siede.'),
        mode === 'addosso' ? T('Il tempo si ferma da solo quando la persona è di nuovo seduta e ferma. Puoi anche toccare <b>Stop</b>.') : T('Tocca <b>Stop</b> quando la schiena torna appoggiata allo schienale.')]
      : [T('Percorso dritto di <b>10 metri</b>, con 2 metri in più prima e dopo per partire e fermarsi.'),
        mode === 'addosso' ? T('Metti il telefono <b>in cintura o in tasca</b> alla persona.') : T('Tieni tu il telefono e cammina accanto alla persona.'),
        mode === 'addosso' ? T('Tocca <b>Inizia</b>: al «Via» la persona cammina a passo normale per i 10 metri e si ferma. Il tempo parte al primo passo e si ferma quando la persona è ferma.')
          : T('Tocca <b>Inizia</b> quando la persona passa la linea di partenza e <b>Stop</b> quando passa quella dei 10 metri.')];
    app.innerHTML = head(tug ? T('Timed Up and Go') : T('Cammino su 10 metri'), tug ? T('Alzarsi, camminare 3 metri, girarsi, tornare e sedersi: il tempo in secondi.') : T('Velocità del cammino a passo normale, in metri al secondo.')) +
      '<div class="card"><div class="toolbar">' + seg('cmode', CMODES(), mode, T('Modo')) + '</div>' +
      '<div class="toolbar">' + seg('cond', CONDS(), prefs.cond, T('Condizione')) + '</div>' +
      '<div class="warn"><b>' + T('⚠️ Resta accanto alla persona per tutto il test') + '</b>, ' + T('pronto a sostenerla se perde l’equilibrio.') + '</div>' +
      '<ol class="steps">' + how.map((x) => '<li>' + x + '</li>').join('') + '</ol>' +
      '<div class="pro-live"><div class="pro-big" id="pro-big">0,0 s</div><div class="small" id="pro-sub">' + T('Pronto') + '</div></div>' +
      '<p class="gate-msg" id="pro-msg" role="status"></p>' +
      '<div class="btn-col"><button class="btn primary" type="button" id="pro-go">' + T('Inizia') + '</button></div></div>' +
      '<div class="card"><h3>' + T('Risultati') + '</h3>' + clinHistory(test) + '</div>' + NOTE;
    bindSegs(app, () => renderClin(app, test));
    const big = document.getElementById('pro-big'); const sub = document.getElementById('pro-sub'); const msg = document.getElementById('pro-msg');
    const go = document.getElementById('pro-go');
    let phase = 'idle'; let t0 = 0; let tick = null; let steps = 0; let moved = 0; let stillSince = 0; let lastPeak = 0; let walkStart = 0;
    const show = () => { big.textContent = fmt((performance.now() - (walkStart || t0)) / 1000, 1) + ' s'; };
    const finish = (endT) => {
      if (phase !== 'run') return;
      phase = 'done'; clearInterval(tick); stopMotion(); beep(1200, 250);
      const start = walkStart || t0; const secs = Math.max(0, (endT - start) / 1000);
      if (secs < (tug ? 3 : 2)) { msg.textContent = T('Tempo troppo breve: riprova.'); go.textContent = T('Inizia'); go.disabled = false; phase = 'idle'; return; }
      const rec = { t: Date.now(), test, v: Math.round(secs * 10) / 10, cond: prefs.cond, mode, steps: mode === 'addosso' ? steps : 0 };
      const all = store.get(CLIN, []); all.push(rec); store.set(CLIN, all.slice(-300));
      renderClin(app, test);
      const m = document.getElementById('pro-msg'); m.className = 'ts-done';
      m.textContent = tug ? T('Timed Up and Go: {s} s', { s: fmt(secs, 1) }) : T('10 metri in {s} s: {v} m/s', { s: fmt(secs, 1), v: fmt(10 / secs, 2) }) + (rec.steps ? ' · ' + T('{n} passi', { n: rec.steps }) : '');
    };
    clinStop = () => { clearInterval(tick); stopMotion(); phase = 'idle'; };
    go.addEventListener('click', async () => {
      if (phase === 'run') { finish(performance.now()); return; }
      if (phase === 'count') return;
      msg.className = 'gate-msg'; msg.textContent = '';
      if (mode === 'addosso' && !(await permission())) { msg.textContent = T('Serve il permesso ai sensori di movimento: consenti l’accesso quando richiesto.'); return; }
      const manualWalk = !tug && mode === 'mano';
      if (!manualWalk) {
        phase = 'count'; go.disabled = true;
        for (const n of [3, 2, 1]) { big.textContent = n; sub.textContent = mode === 'addosso' ? T('Metti il telefono addosso alla persona') : T('Preparati'); beep(660, 120); await wait(1000); if (phase !== 'count') return; }
        beep(1100, 350); big.textContent = T('Via!');
      }
      phase = 'run'; t0 = performance.now(); walkStart = 0; steps = 0; moved = 0; stillSince = 0; lastPeak = 0;
      go.disabled = false; go.textContent = T('Stop');
      sub.textContent = tug ? T('In corso…') : (mode === 'addosso' ? T('In attesa del primo passo…') : T('In corso…'));
      if (manualWalk) walkStart = t0;
      tick = setInterval(() => { if (phase === 'run' && (tug || walkStart)) show(); }, 100);
      if (mode !== 'addosso') return;
      // movimento = accelerazione senza la gravità, media su circa mezzo secondo
      let grav = null; let lvl = 0; let lastT = performance.now(); let lastMove = performance.now();
      stopMotion();
      motionOn = (e) => {
        const a = e.accelerationIncludingGravity || {}; if (a.x == null || phase !== 'run') return;
        const now = performance.now(); const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
        if (!grav) grav = { x: a.x, y: a.y, z: a.z };
        grav.x += (a.x - grav.x) * 0.05; grav.y += (a.y - grav.y) * 0.05; grav.z += (a.z - grav.z) * 0.05;
        const dx = a.x - grav.x, dy = a.y - grav.y, dz = a.z - grav.z;
        const d = Math.hypot(dx, dy, dz);
        // componente verticale (lungo la gravità): un picco per passo
        const gn = Math.max(0.1, Math.hypot(grav.x, grav.y, grav.z));
        const dv = (dx * grav.x + dy * grav.y + dz * grav.z) / gn;
        lvl += (d - lvl) * Math.min(1, dt * 4);
        if (d > 0.8) lastMove = now;
        if (dv > 1.2 && now - lastPeak > 280) { lastPeak = now; if (walkStart || tug) steps++; }
        if (lvl > 0.9) {
          moved += dt; stillSince = 0;
          if (!tug && !walkStart && moved > 0.4) { walkStart = now - 400; steps = 1; sub.textContent = T('In corso…'); }
        } else if (lvl < 0.35) {
          if (!stillSince) stillSince = now;
          const need = tug ? 1200 : 1000;
          // fine = ultimo istante di movimento (la media è in ritardo di qualche decimo)
          if (moved > (tug ? 3 : 2) && now - stillSince > need) finish(Math.min(stillSince, lastMove + 150));
        }
      };
      window.addEventListener('devicemotion', motionOn);
    });
  }
  function clinHistory(test) {
    const l = store.get(CLIN, []).filter((r) => r.test === test);
    if (!l.length) return '<p class="small muted" style="margin:0">' + T('Nessuna misura salvata.') + '</p>';
    const val = (r) => test === 'tug' ? fmt(r.v, 1) + ' s' : fmt(10 / r.v, 2) + ' m/s <small class="muted">(' + fmt(r.v, 1) + ' s)</small>';
    return '<div class="pz-table-wrap"><table class="pz-table"><tbody>' + l.slice(-10).reverse().map((r) => '<tr><th>' + dateStr(r.t) + ' · ' + (r.cond === 'con' ? T('con Equistasi') : T('senza Equistasi')) + '</th><td><b>' + val(r) + '</b>' +
      (r.steps ? '<br><small class="muted">' + T('{n} passi', { n: r.steps }) + (test === 'walk' ? ' · ' + T('cadenza {c} passi/min', { c: Math.round(r.steps / r.v * 60) }) : '') + '</small>' : '') + '</td></tr>').join('') + '</tbody></table></div>';
  }
  function clinGroups() {
    const l = store.get(CLIN, []); if (!l.length) return [];
    const rows = [];
    [['tug', T('Timed Up and Go')], ['walk', T('Cammino su 10 metri')]].forEach(([k, name]) => {
      ['senza', 'con'].forEach((c) => {
        const x = l.filter((r) => r.test === k && r.cond === c); if (!x.length) return;
        const last = x[x.length - 1];
        rows.push({ label: name + ' · ' + (c === 'con' ? T('con Equistasi') : T('senza Equistasi')) + ' · ' + dateStr(last.t) + (x.length > 1 ? ' (' + T('{n} prove', { n: x.length }) + ')' : ''),
          val: k === 'tug' ? fmt(last.v, 1) + ' s' : fmt(10 / last.v, 2) + ' m/s' });
      });
    });
    return [{ title: T('Test clinici a tempo'), rows }];
  }

  /* ───────── Pagina principale e report ───────── */
  function renderHome(app) {
    const tile = (href, title, sub, ico) => '<a class="m-item" href="' + href + '"><span class="ts-ico pro-ico" aria-hidden="true">' + ico + '</span><span><b>' + title + '</b><br><span class="small muted">' + sub + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
    const svg = (d) => '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
    app.innerHTML = head(T('Strumenti per il professionista'), T('Riservati ai dispositivi Equistasi a noleggio professionale.')) +
      '<div class="list">' +
      tile('#/pro/gonio', T('Goniometro'), T('Gradi di movimento di ginocchio e spalla'), svg('<path d="M4 20h16M4 20 16 6"/><path d="M10 20a6 6 0 0 0-2-4.5"/>')) +
      tile('#/pro/scolio', T('Scoliometro'), T('Rotazione del tronco (test di Adams)'), svg('<path d="M12 3c-3 4 3 6 0 9s3 5 0 9"/><path d="M6 12h12"/>')) +
      tile('#/pro/tug', T('Timed Up and Go'), T('Alzarsi, camminare 3 metri, tornare e sedersi'), svg('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>')) +
      tile('#/pro/cammino', T('Cammino su 10 metri'), T('Velocità del cammino, passi e cadenza'), svg('<path d="M4 20 20 4"/><path d="M14 4h6v6"/>')) +
      tile('#/sedia/cinque', T('5 alzate dalla sedia'), T('Tempo per alzarsi e sedersi 5 volte'), svg('<path d="M7 3v9h10v9M7 12v9M17 12V8"/>')) +
      tile('#/pro/dolore', T('Dolore e uso del dispositivo'), T('Dolore 0–10 prima e dopo, giorni e ore di utilizzo'), svg('<path d="M3 12h4l2-6 4 12 2-6h6"/>')) +
      '</div><a class="card vpromo ts-report" href="#/postura/report"><span class="vpromo-ico pz-ico" aria-hidden="true">' + svg('<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>') + '</span><span><b>' + T('Report in PDF') + '</b><br><span class="small muted">' + T('Il report include anche goniometro, scoliometro, test a tempo, dolore e uso del dispositivo') + '</span></span><span class="chev" aria-hidden="true">›</span></a>' + NOTE;
  }
  function renderLocked(app) {
    app.innerHTML = head(T('Strumenti per il professionista')) +
      '<div class="card"><p style="margin:0">' + T('Questi strumenti sono riservati ai <b>dispositivi Equistasi a noleggio professionale</b>.') + '</p>' +
      '<p class="small muted">' + T('Abbina un dispositivo a noleggio professionale dal pulsante «Dispositivo abbinato» in alto. Per informazioni scrivi a Equistasi.') + '</p></div>';
  }
  function bindSegs(app, rerender) {
    app.querySelectorAll('[data-pp]').forEach((b) => b.addEventListener('click', () => { stopMotion(); prefs[b.dataset.pp] = b.dataset.val; savePrefs(); rerender(); }));
  }
  function render(app, arg) {
    stopMotion(); if (clinStop) clinStop();
    if (arg === 'dolore') { renderPain(app); return; } // dolore e uso: per tutti
    if (!isPro()) { renderLocked(app); return; }
    if (arg === 'gonio') renderGonio(app);
    else if (arg === 'tug') renderClin(app, 'tug');
    else if (arg === 'cammino') renderClin(app, 'walk');
    else if (arg === 'scolio') renderScolio(app);
    else if (arg === 'dolore') renderPain(app);
    else renderHome(app);
  }
  window.addEventListener('hashchange', () => { stopMotion(); if (clinStop) clinStop(); });

  // Righe per il report (web e PDF): gruppi con titolo e righe { label, val }
  function reportGroups() {
    const out = [];
    const pain = painSummary().concat(useLines());
    if (pain.length) out.push({ title: T('Dolore e uso del dispositivo'), rows: pain.map((x) => ({ label: x, val: '' })) });
    if (!isPro()) return out; // goniometro e scoliometro: solo noleggio prof
    const gon = store.get(GONIO, []);
    if (gon.length) {
      const last = {}; gon.forEach((r) => { last[r.j + '|' + r.mv + '|' + r.side] = r; });
      out.push({ title: T('Goniometro'), rows: Object.values(last).map((r) => {
        const first = gon.find((x) => x.j === r.j && x.mv === r.mv && x.side === r.side);
        return { label: moveLabel(r) + ' · ' + dateStr(r.t) + (first !== r ? ' (' + T('da {v}° il {d}', { v: first.v, d: dateStr(first.t) }) + ')' : ''), val: r.v + '°' };
      }).concat(Object.values(last).filter((r) => r.side === 'dx' && last[r.j + '|' + r.mv + '|sx']).map((r) => {
        const o = last[r.j + '|' + r.mv + '|sx'];
        return { label: T('Simmetria destra/sinistra') + ' · ' + JOINTS()[r.j] + ' · ' + MOVES()[r.mv], val: Math.round(Math.min(r.v, o.v) / Math.max(1, r.v, o.v) * 100) + '%' };
      })) });
    }
    const sc = store.get(SCOLIO, []);
    out.push(...clinGroups());
    if (sc.length) out.push({ title: T('Scoliometro'), rows: sc.slice(-5).reverse().map((r) => ({ label: REGIONS()[r.reg] + ' · ' + (r.side === 'dx' ? T('gibbo a destra') : T('gibbo a sinistra')) + ' · ' + dateStr(r.t), val: fmt(r.v, 1) + '°' })) });
    return out;
  }

  // Scheda di accesso (Progressi, Info, pannello del dispositivo): solo per noleggio prof
  const cardHtml = () => isPro() ? '<a class="card vpromo pro-card" href="#/pro"><span class="vpromo-ico pz-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6v4H9zM5 7h14v14H5z"/><path d="M12 11v6M9 14h6"/></svg></span>' +
    '<span><b>' + T('Strumenti per il professionista') + '</b><br><span class="small muted">' + T('Goniometro, scoliometro, dolore e uso del dispositivo') + '</span></span><span class="chev" aria-hidden="true">›</span></a>' : '';

  // Scheda nel Promemoria (per tutti): dolore e uso del dispositivo
  function painCardHtml() {
    const l = painSummary().concat(useLines());
    return '<a class="card vpromo pain-card" href="#/pro/dolore"><span class="vpromo-ico pz-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg></span>' +
      '<span><b>' + T('Il tuo dolore e l’uso del dispositivo') + '</b><br><span class="small muted">' + (l.length ? l[0] : T('Segna il dolore da 0 a 10 prima e dopo l’applicazione')) + '</span></span><span class="chev" aria-hidden="true">›</span></a>';
  }

  window.EqPro = { isPro, render, cardHtml, painCardHtml, reportGroups, onSessionStart, onSessionEnd, _wrap: wrap, _painSummary: painSummary, _useSummary: useSummary };
})();
