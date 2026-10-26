/* Elvy · Esercizio corretto o scorretto: analisi del movimento dal video.
   Si filma (o si carica) uno squat, un affondo, dei piegamenti o un plank; il riconoscimento del corpo
   (MediaPipe Pose, sul telefono, da js/video.js) segue le articolazioni fotogramma per fotogramma,
   conta le ripetizioni e controlla per ognuna le regole di tecnica dell'esercizio.
   Le soglie sono indicative, per l'allenamento: non è una valutazione clinica. */
(function () {
  const V = () => window.ElvyVideo;
  const deg = (r) => (r * 180) / Math.PI;
  const fmt = (v, d = 0) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (arr, q) => { const a = arr.filter((x) => isFinite(x)).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))] : NaN; };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // indici dei punti di MediaPipe Pose
  const J = { sh: [11, 12], el: [13, 14], wr: [15, 16], hip: [23, 24], knee: [25, 26], ank: [27, 28], heel: [29, 30], toe: [31, 32] };

  /* ───────── Esercizi: come filmare, cosa controllo, disegni corretto / scorretto ───────── */
  const EX = {
    squat: {
      name: 'Squat', view: 'di lato (o di fronte per le ginocchia)', max: 20,
      tip: 'Telefono fermo a terra o su un appoggio, a 2–3 metri, <b>di lato</b>: si vede tutto il corpo, dalla testa ai piedi. Fai 3–5 squat lenti.',
      good: ['Cosce almeno parallele al pavimento', 'Busto inclinato in avanti ma non troppo', 'Talloni sempre a terra', 'Ginocchia in linea con le punte dei piedi'],
      bad: ['Scendi poco', 'Busto che cade in avanti', 'Talloni che si alzano', 'Ginocchia che vanno verso l\'interno'],
      // figure di lato: [testa, spalla, gomito, mano, anca, ginocchio, caviglia, tallone, punta]
      okPose: [[64, 34], [58, 47], [70, 54], [82, 54], [38, 79], [66, 82], [52, 108], [47, 110], [63, 110]],
      koPose: [[84, 44], [76, 52], [84, 62], [92, 70], [44, 70], [66, 80], [54, 103], [49, 104], [64, 110]], koMark: [1, 7],
      okLbl: 'Cosce parallele, busto stabile, talloni giù', koLbl: 'Busto in avanti, talloni sollevati',
    },
    affondo: {
      name: 'Affondo', view: 'di lato', max: 20,
      tip: 'Telefono fermo, a 2–3 metri, <b>di lato</b>, tutto il corpo inquadrato. Fai 3–5 affondi con la stessa gamba avanti.',
      good: ['Ginocchio davanti piegato a circa 90°', 'Busto dritto', 'Ginocchio dietro vicino al pavimento', 'Ginocchio davanti in linea con il piede'],
      bad: ['Scendi poco', 'Busto inclinato in avanti', 'Ginocchio che va verso l\'interno (di fronte)'],
      okPose: [[46, 34], [46, 46], [38, 62], [46, 76], [46, 80], [70, 82], [70, 108], [66, 110], [80, 110]], back: [[42, 104], [22, 109]],
      koPose: [[70, 40], [62, 50], [68, 64], [72, 76], [48, 78], [84, 90], [68, 108], [64, 110], [78, 110]], koBack: [[40, 100], [22, 109]], koMark: [1, 5],
      okLbl: 'Busto dritto, ginocchio a 90° sopra il piede', koLbl: 'Busto in avanti, ginocchio troppo avanti',
    },
    piegamenti: {
      name: 'Piegamenti', view: 'di lato', max: 20,
      tip: 'Telefono a terra, a 2 metri, <b>di lato</b>: si vede tutto il corpo, dalle mani ai piedi. Fai 3–8 piegamenti.',
      good: ['Petto vicino al pavimento', 'Corpo dritto come una tavola, dalle spalle ai piedi', 'Gomiti piegati almeno a 90°'],
      bad: ['Scendi poco', 'Bacino che cade verso il pavimento', 'Bacino troppo alto'],
      okPose: [[22, 86], [34, 90], [26, 100], [36, 108], [64, 97], null, [92, 103], null, [97, 108]],
      koPose: [[22, 86], [34, 90], [26, 100], [36, 108], [64, 107], null, [92, 103], null, [97, 108]], koMark: [4],
      okLbl: 'Corpo in linea, petto vicino a terra', koLbl: 'Bacino che cede verso il basso',
    },
    plank: {
      name: 'Plank', view: 'di lato', max: 30,
      tip: 'Telefono a terra, a 2 metri, <b>di lato</b>. Mettiti in plank sugli avambracci e tieni la posizione per tutto il video.',
      good: ['Corpo dritto dalle spalle alle caviglie', 'Spalle sopra i gomiti', 'Pancia e glutei contratti'],
      bad: ['Bacino che cade verso il pavimento', 'Bacino troppo alto'],
      okPose: [[22, 84], [30, 88], [30, 108], [44, 108], [62, 92], null, [94, 98], null, [98, 108]],
      koPose: [[22, 84], [30, 88], [30, 108], [44, 108], [62, 104], null, [94, 98], null, [98, 108]], koMark: [4],
      okLbl: 'Spalle, bacino e caviglie in linea', koLbl: 'Bacino che cede (schiena inarcata)',
    },
  };

  // figura stilizzata di lato (viewBox 0 0 110 116)
  function stick(pose, back, mark, col) {
    const L = (a, b) => (a && b ? '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>' : '');
    const [head, sh, el, ha, hip, kn, an, he, to] = pose;
    let s = '<line x1="4" y1="111" x2="106" y2="111" class="floor"/><g class="bones" stroke="' + col + '">' +
      L(sh, el) + L(el, ha) + L(sh, hip) + (kn ? L(hip, kn) + L(kn, an) : L(hip, an)) + (he ? L(he, to) + L(an, he) : L(an, to));
    if (back) s += L(hip, back[0]) + L(back[0], back[1]);
    s += '</g><circle cx="' + head[0] + '" cy="' + head[1] + '" r="7" fill="' + col + '"/>';
    (mark || []).forEach((i) => { const p = pose[i]; if (p) s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" class="ko-ring"/>'; });
    return '<svg viewBox="0 0 110 116" aria-hidden="true">' + s + '</svg>';
  }
  function guideCard(e) {
    return '<div class="card ex-guide"><h3>Corretto e scorretto</h3><div class="ex-vs">' +
      '<figure class="ok"><span class="ex-badge">✓ Corretto</span>' + stick(e.okPose, e.back, null, '#7FD6D1') + '<figcaption>' + e.okLbl + '</figcaption></figure>' +
      '<figure class="ko"><span class="ex-badge">✗ Scorretto</span>' + stick(e.koPose, e.koBack || e.back, e.koMark, '#F5B3AD') + '<figcaption>' + e.koLbl + '</figcaption></figure></div>' +
      '<div class="ex-rules"><ul class="ok">' + e.good.map((x) => '<li>' + x + '</li>').join('') + '</ul><ul class="ko">' + e.bad.map((x) => '<li>' + x + '</li>').join('') + '</ul></div></div>';
  }

  /* ───────── Misure di un fotogramma ───────── */
  function frame(pts, front) {
    const vis = (i) => pts[i].v;
    // lato più visibile (di lato uno dei due è coperto)
    const sideVis = (k) => ['sh', 'el', 'wr', 'hip', 'knee', 'ank', 'heel', 'toe'].reduce((n, j) => n + vis(J[j][k]), 0);
    const k = sideVis(0) >= sideVis(1) ? 0 : 1;
    const g = (j, kk = k) => pts[J[j][kk]];
    const inner = V().inner;
    const leg = (dist(g('hip'), g('knee')) + dist(g('knee'), g('ank'))) || 1;
    const sh = g('sh'); const hip = g('hip'); const ank = g('ank');
    // linea del corpo spalla–anca–caviglia: angolo all'anca e da che parte sta l'anca (giù = verso il pavimento)
    const line = inner(sh, hip, ank);
    const tY = sh.y + ((ank.y - sh.y) * (hip.x - sh.x)) / ((ank.x - sh.x) || 1e-6);
    return {
      k, leg, hipY: (pts[23].y + pts[24].y) / 2, shY: (pts[11].y + pts[12].y) / 2,
      knee: [inner(g('hip', 0), g('knee', 0), g('ank', 0)), inner(g('hip', 1), g('knee', 1), g('ank', 1))],
      kneeVis: [Math.min(vis(23), vis(25), vis(27)), Math.min(vis(24), vis(26), vis(28))],
      elbow: inner(g('sh'), g('el'), g('wr')),
      trunk: Math.abs(deg(Math.atan2(sh.x - hip.x, hip.y - sh.y))),
      heel: (g('toe').y - g('heel').y) / leg, // > 0: tallone più alto della punta
      line, sag: hip.y > tY ? 1 : -1, // 1 = bacino sotto la linea (cede), -1 = sopra (troppo alto)
      front,
    };
  }

  /* ───────── Ripetizioni: tratti in cui il segnale scende oltre la soglia ───────── */
  function reps(sig, thr) {
    const base = pct(sig.map((x) => x.v), 0.1);
    const out = []; let cur = null;
    sig.forEach((x, i) => {
      const down = x.v - base > thr;
      if (down && !cur) cur = { a: i, b: i };
      else if (down) cur.b = i;
      else if (cur) { out.push(cur); cur = null; }
    });
    if (cur) out.push(cur);
    return out.filter((r) => r.b - r.a >= 1).map((r) => {
      let m = r.a; for (let i = r.a; i <= r.b; i++) if (sig[i].v > sig[m].v) m = i;
      return { a: r.a, b: r.b, bottom: m };
    });
  }

  /* ───────── Regole di tecnica per ripetizione ───────── */
  const kneeAt = (f) => { const vs = f.kneeVis; return vs[0] > 0.5 && vs[1] > 0.5 ? Math.min(...f.knee) : vs[0] >= vs[1] ? f.knee[0] : f.knee[1]; };
  function check(id, F, r) {
    const span = F.slice(r.a, r.b + 1); const bot = F[r.bottom]; const errs = []; const val = {};
    const front = bot.front;
    if (id === 'squat' || id === 'affondo') {
      if (front) {
        const vg = Math.max(...span.map((f) => Math.max(f.valgL || 0, f.valgR || 0)));
        val.valg = vg; if (vg > 10) errs.push({ k: 'valg', t: 'Ginocchia verso l\'interno', j: [25, 26] });
      } else {
        const kn = Math.min(...span.map(kneeAt)); val.knee = kn;
        if (kn > 100) errs.push({ k: 'depth', t: id === 'squat' ? 'Scendi di più: cosce parallele al pavimento' : 'Scendi di più: ginocchio davanti a 90°', j: [25, 26] });
        val.trunk = bot.trunk;
        if (bot.trunk > (id === 'squat' ? 50 : 25)) errs.push({ k: 'trunk', t: id === 'squat' ? 'Busto troppo inclinato in avanti' : 'Tieni il busto più dritto', j: [11, 12] });
        if (id === 'squat') {
          const hl = Math.max(...span.map((f) => f.heel)) - pct(F.map((f) => f.heel), 0.5); val.heel = hl;
          if (hl > 0.05) errs.push({ k: 'heel', t: 'Talloni che si alzano', j: [29, 30] });
        }
      }
    } else if (id === 'piegamenti') {
      val.elbow = Math.min(...span.map((f) => f.elbow));
      if (val.elbow > 100) errs.push({ k: 'depth', t: 'Scendi di più: petto vicino al pavimento', j: [13, 14] });
      const worst = span.reduce((a, f) => (f.line < a.line ? f : a));
      val.line = worst.line;
      if (worst.line < 160) errs.push(worst.sag > 0 ? { k: 'sag', t: 'Bacino che cade verso il pavimento', j: [23, 24] } : { k: 'pike', t: 'Bacino troppo alto', j: [23, 24] });
    }
    return { errs, val, t: bot.t, front };
  }

  /* ───────── Schermata ───────── */
  const st = { ex: 'squat', url: null, result: null };
  let H = null;

  function render($app, h) {
    H = h; const e = EX[st.ex];
    $app.innerHTML = '<div class="head">' + H.backBtn() + '<div><div class="k p">Video</div><h1>Esercizio corretto?</h1></div></div>' +
      H.talk('img/punta.jpg', 'Filma il tuo esercizio: riconosco il corpo, conto le ripetizioni e per ognuna ti dico se è <b>corretta</b> o cosa <b>correggere</b>.', true) +
      '<div class="card" style="margin-top:14px"><div class="small muted" style="font-weight:700;margin-bottom:6px">Esercizio</div><div class="seg" id="ex-pick">' +
      Object.keys(EX).map((k) => '<button type="button" data-ex="' + k + '" aria-pressed="' + (st.ex === k) + '">' + EX[k].name + '</button>').join('') + '</div>' +
      '<p class="small muted" style="margin-top:10px"><b style="color:#fff">Come filmare.</b> ' + e.tip + '</p></div>' +
      '<div style="margin-top:14px">' + guideCard(e) + '</div>' +
      '<div class="actions"><button class="btn" id="ex-rec">Registra l\'esercizio</button>' +
      '<label class="btn ghost" for="ex-file" style="cursor:pointer">Carica un video</label><input type="file" id="ex-file" accept="video/*" hidden /></div>' +
      '<div id="ex-player"></div>' +
      '<p class="note" style="margin-top:14px">Il video resta sul telefono e non viene inviato. Le soglie sono indicative, per l\'allenamento: per un dolore o un infortunio chiedi al preparatore o al fisioterapista.</p>';
    $app.querySelectorAll('[data-ex]').forEach((b) => { b.onclick = () => { st.ex = b.dataset.ex; st.url = null; st.result = null; render($app, H); }; });
    document.getElementById('ex-file').onchange = (ev) => { const f = ev.target.files[0]; if (f) open($app, URL.createObjectURL(f)); };
    document.getElementById('ex-rec').onclick = () => V().record($app, H, { max: e.max, onVideo: (u) => open($app, u) });
    H.bindCommon();
    if (st.url) open($app, st.url);
  }

  function open($app, url) {
    st.url = url;
    const box = $app.querySelector('#ex-player'); if (!box) return;
    box.innerHTML = '<div class="vid-wrap"><video id="exv" playsinline muted preload="auto" src="' + url + '"></video><canvas id="exc"></canvas></div>' +
      '<div class="vid-ctrl" style="margin-top:10px"><button id="ex-play" aria-label="Riproduci">▶︎</button><input type="range" id="ex-pos" min="0" max="1000" value="0" class="vid-range" style="margin:0" aria-label="Posizione nel video" /></div>' +
      '<div class="actions"><button class="btn" id="ex-go">Analizza l\'esercizio</button></div><div id="ex-out"></div>';
    const v = box.querySelector('#exv'); const cv = box.querySelector('#exc'); const ctx = cv.getContext('2d');
    const pos = box.querySelector('#ex-pos');
    v.addEventListener('loadedmetadata', () => { cv.width = v.videoWidth || 640; cv.height = v.videoHeight || 360; v.currentTime = 0.001; });
    v.addEventListener('timeupdate', () => { if (v.duration) pos.value = Math.round((v.currentTime / v.duration) * 1000); });
    v.addEventListener('play', () => { box.querySelector('#ex-play').textContent = '❚❚'; ctx.clearRect(0, 0, cv.width, cv.height); });
    v.addEventListener('pause', () => { box.querySelector('#ex-play').textContent = '▶︎'; });
    box.querySelector('#ex-play').onclick = () => { if (v.paused) { v.playbackRate = 0.5; v.play(); } else v.pause(); };
    pos.oninput = () => { v.pause(); if (v.duration) v.currentTime = (pos.value / 1000) * v.duration; };
    box.querySelector('#ex-go').onclick = () => analyse(box, v, cv, ctx);
    if (st.result) show(box, v, cv, ctx, st.result);
  }

  const seek = (v, t) => new Promise((r) => { v.addEventListener('seeked', r, { once: true }); v.currentTime = t; });
  async function analyse(box, v, cv, ctx) {
    const out = box.querySelector('#ex-out'); const go = box.querySelector('#ex-go');
    go.disabled = true; v.pause();
    let pose;
    try { pose = await V().loadPose(); } catch (e) { out.innerHTML = '<p class="err">Il riconoscimento del corpo non si è caricato: controlla la connessione e riprova.</p>'; go.disabled = false; return; }
    const dur = v.duration || 0; const dt = Math.max(0.08, dur / 220); // al massimo ~220 fotogrammi
    const F = [];
    for (let t = 0.02; t < dur; t += dt) {
      await seek(v, t);
      const res = pose.detect(v); const lm = res && res.landmarks && res.landmarks[0];
      out.innerHTML = '<p class="small muted">Analisi del movimento… ' + Math.round((100 * t) / dur) + '%</p>';
      if (!lm) continue;
      const m = V().metrics(lm, cv.width, cv.height);
      if (m.pts[23].v < 0.4 && m.pts[24].v < 0.4) continue;
      F.push(Object.assign(frame(m.pts, st.ex === 'squat' || st.ex === 'affondo' ? m.front : false), { t: v.currentTime, pts: m.pts, valgL: m.valgL, valgR: m.valgR }));
    }
    go.disabled = false;
    if (F.length < 5) { out.innerHTML = '<p class="err">Non vedo bene una persona nel video. ' + EX[st.ex].tip.replace(/<[^>]+>/g, '') + '</p>'; return; }
    st.result = evaluate(F);
    show(box, v, cv, ctx, st.result);
  }

  function evaluate(F) {
    const id = st.ex;
    if (id === 'plank') {
      const lines = F.map((f) => f.line); const med = pct(lines, 0.5);
      const sag = pct(F.map((f) => f.sag), 0.5);
      const ok = med >= 165;
      const errs = ok ? [] : [sag > 0 ? { k: 'sag', t: 'Bacino che cede verso il pavimento', j: [23, 24] } : { k: 'pike', t: 'Bacino troppo alto', j: [23, 24] }];
      const worst = F.reduce((a, f) => (f.line < a.line ? f : a));
      return { id, F, plank: true, hold: F[F.length - 1].t - F[0].t, line: med, reps: [{ errs, val: { line: med }, t: (ok ? F[F.length >> 1] : worst).t, i: F.indexOf(ok ? F[F.length >> 1] : worst) }] };
    }
    // segnale delle ripetizioni: abbassamento del bacino (squat, affondo) o piegamento dei gomiti (piegamenti)
    const sig = id === 'piegamenti' ? F.map((f) => ({ v: 180 - f.elbow })) : F.map((f) => ({ v: f.hipY / f.leg }));
    const R = reps(sig, id === 'piegamenti' ? 30 : 0.15);
    return { id, F, reps: R.map((r) => Object.assign(check(id, F, r), { i: r.bottom })) };
  }

  function show(box, v, cv, ctx, res) {
    const out = box.querySelector('#ex-out'); const e = EX[res.id];
    const draw = (rep) => {
      const f = res.F[rep.i]; if (!f) return;
      const bad = new Set(); rep.errs.forEach((x) => x.j.forEach((j) => bad.add(j)));
      ctx.clearRect(0, 0, cv.width, cv.height);
      const lw = Math.max(2, cv.width / 200); ctx.lineWidth = lw; ctx.lineCap = 'round';
      V().BONES.forEach(([a, b]) => { const A = f.pts[a]; const B = f.pts[b]; if (A.v < 0.3 || B.v < 0.3) return; ctx.strokeStyle = bad.has(a) || bad.has(b) ? 'rgba(242,120,110,.95)' : 'rgba(127,214,209,.95)'; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); });
      f.pts.forEach((q, i) => { if (i < 11 || q.v < 0.3) return; ctx.fillStyle = bad.has(i) ? '#F2786E' : '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, lw * (bad.has(i) ? 3 : 1.6), 0, 6.283); ctx.fill(); });
    };
    const goTo = async (rep) => { v.pause(); await seek(v, rep.t); draw(rep); };
    if (!res.reps.length) {
      out.innerHTML = '<div class="card" style="margin-top:14px">' + H.talk('img/punta.jpg', 'Non ho visto ripetizioni complete. Scendi di più e filma tutto il movimento, ' + e.view + '.', true) + '</div>';
      H.bindCommon(); return;
    }
    const okN = res.reps.filter((r) => !r.errs.length).length; const n = res.reps.length;
    const good = okN / n >= 0.8;
    // errori più frequenti
    const count = {}; res.reps.forEach((r) => r.errs.forEach((x) => { count[x.t] = (count[x.t] || 0) + 1; }));
    const top = Object.keys(count).sort((a, b) => count[b] - count[a]);
    const front = res.reps.some((r) => r.front);
    const say = res.plank
      ? (good ? 'Plank corretto! Corpo in linea per ' + fmt(res.hold, 0) + ' secondi.' : 'Da correggere: ' + top[0].toLowerCase() + '. Contrai pancia e glutei e porta spalle, bacino e caviglie in linea.')
      : good ? 'Esecuzione corretta! ' + okN + ' ripetizioni su ' + n + ' fatte bene.' : 'Da correggere: ' + okN + ' ripetizioni su ' + n + ' fatte bene. Soprattutto: ' + top[0].toLowerCase() + '.';
    const val = (r) => {
      const a = [];
      if (r.val.knee != null) a.push('ginocchio ' + fmt(r.val.knee) + '°');
      if (r.val.trunk != null) a.push('busto ' + fmt(r.val.trunk) + '°');
      if (r.val.valg != null) a.push('valgismo ' + fmt(Math.max(0, r.val.valg)) + '°');
      if (r.val.elbow != null) a.push('gomito ' + fmt(r.val.elbow) + '°');
      if (r.val.line != null) a.push('linea del corpo ' + fmt(r.val.line) + '°');
      return a.join(' · ');
    };
    out.innerHTML = '<div class="card ex-verdict ' + (good ? 'ok' : 'ko') + '" style="margin-top:14px"><div class="ex-big">' + (good ? '✓ Corretto' : '✗ Da correggere') + '</div>' +
      '<div class="small" style="margin-top:4px">' + (res.plank ? 'Plank tenuto ' + fmt(res.hold, 0) + ' s' : okN + ' su ' + n + ' ripetizioni corrette') + (front ? ' · vista di fronte' : ' · vista di lato') + '</div></div>' +
      '<div style="margin-top:12px">' + H.talk(good ? 'img/pollice.jpg' : 'img/punta.jpg', say, true) + '</div>' +
      (top.length ? '<div class="card" style="margin-top:12px"><h3>Cosa correggere</h3><ul class="ex-errs">' + top.map((t) => '<li><b>' + esc(t) + '</b>' + (res.plank ? '' : '<span>' + count[t] + ' su ' + n + '</span>') + '</li>').join('') + '</ul></div>' : '') +
      '<div class="card" style="margin-top:12px"><h3>' + (res.plank ? 'Il momento peggiore' : 'Ripetizione per ripetizione') + '</h3><p class="small muted" style="margin-top:4px">Tocca per vedere il fotogramma: in rosso le articolazioni da correggere.</p><div class="ex-reps">' +
      res.reps.map((r, i) => '<button type="button" class="ex-rep ' + (r.errs.length ? 'ko' : 'ok') + '" data-rep="' + i + '"><b>' + (res.plank ? 'Plank' : 'Rip. ' + (i + 1)) + ' ' + (r.errs.length ? '✗' : '✓') + '</b><span>' + esc(r.errs.length ? r.errs.map((x) => x.t).join(', ') : 'corretta') + '</span><em>' + val(r) + '</em></button>').join('') + '</div></div>' +
      (front && res.id !== 'piegamenti' ? '<p class="note" style="margin-top:10px">Di fronte controllo le ginocchia. Per profondità, busto e talloni filma anche <b>di lato</b>.</p>' : '');
    out.querySelectorAll('[data-rep]').forEach((b) => { b.onclick = () => { out.querySelectorAll('[data-rep]').forEach((x) => x.classList.toggle('on', x === b)); goTo(res.reps[+b.dataset.rep]); }; });
    H.bindCommon();
    // mostra subito la ripetizione con più errori
    const worst = res.reps.reduce((a, r) => (r.errs.length > a.errs.length ? r : a), res.reps[0]);
    goTo(worst);
  }

  window.ElvyExercise = { render, EX, _frame: frame, _reps: reps, _check: check, _evaluate: (id, F) => { st.ex = id; return evaluate(F); } };
})();
