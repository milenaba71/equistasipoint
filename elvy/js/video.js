/* Elvy · video analisi: registra o carica un video (anche slow-motion della fotocamera del telefono),
   rivedilo al rallentatore fotogramma per fotogramma, riconoscimento del corpo (MediaPipe Pose, sul telefono)
   con gli angoli di ginocchia, anche e tronco. Altezza del salto dal tempo di volo contato sui fotogrammi.
   Nessun video viene inviato: resta nella memoria del telefono finché la pagina è aperta. */
(function () {
  const G = 9.81;
  // librerie MediaPipe nella cartella vendor accanto a scan.js (js/vendor/mediapipe)
  const scanSrc = (document.querySelector('script[src*="scan.js"]') || {}).src || location.href;
  const MP = new URL('vendor/mediapipe/', new URL('./', scanSrc)).href;
  const deg = (r) => (r * 180) / Math.PI;
  const fmt = (v, d = 0) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));

  let poseP = null;
  function loadPose() {
    if (!poseP) {
      poseP = (async () => {
        const vision = await import(MP + 'vision_bundle.mjs');
        const files = await vision.FilesetResolver.forVisionTasks(MP + 'wasm');
        return vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MP + 'pose_landmarker_lite.task', delegate: 'CPU' }, runningMode: 'IMAGE', numPoses: 1,
        });
      })();
      poseP.catch(() => { poseP = null; });
    }
    return poseP;
  }

  // Punti del corpo di MediaPipe (indici)
  const P = { shL: 11, shR: 12, hipL: 23, hipR: 24, kneeL: 25, kneeR: 26, ankL: 27, ankR: 28, heelL: 29, heelR: 30, toeL: 31, toeR: 32, nose: 0 };
  const BONES = [[11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32], [11, 13], [13, 15], [12, 14], [14, 16]];

  // Angolo interno in B tra BA e BC (gradi), coordinate in pixel
  function inner(a, b, c) {
    const v1 = [a.x - b.x, a.y - b.y]; const v2 = [c.x - b.x, c.y - b.y];
    const cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2) || 1);
    return deg(Math.acos(Math.max(-1, Math.min(1, cos))));
  }
  // Valgismo nel piano frontale (FPPA): quanto il ginocchio va verso l'interno rispetto alla linea anca–caviglia
  function fppa(hip, knee, ank, side, facing) {
    const a = 180 - inner(hip, knee, ank);
    // da che parte sta il ginocchio rispetto alla retta anca–caviglia
    const cross = (ank.x - hip.x) * (knee.y - hip.y) - (ank.y - hip.y) * (knee.x - hip.x);
    // persona che guarda la fotocamera: la sinistra della persona è a destra nell'immagine
    const medial = (side === 'L' ? 1 : -1) * facing * Math.sign(cross) > 0;
    return medial ? a : -a;
  }
  // Misure da un fotogramma: lm = punti normalizzati, w/h = dimensioni in pixel
  function metrics(lm, w, h) {
    const p = (i) => ({ x: lm[i].x * w, y: lm[i].y * h, v: lm[i].visibility == null ? 1 : lm[i].visibility });
    const k = (side) => {
      const s = side === 'L' ? 'L' : 'R';
      const hip = p(P['hip' + s]); const knee = p(P['knee' + s]); const ank = p(P['ank' + s]); const sh = p(P['sh' + s]);
      return { knee: 180 - inner(hip, knee, ank), hip: 180 - inner(sh, hip, knee), hipPt: hip, kneePt: knee, ankPt: ank, vis: Math.min(hip.v, knee.v, ank.v) };
    };
    const L = k('L'); const R = k('R');
    // di fronte o di lato: spalle larghe nell'immagine = di fronte
    const shW = Math.abs(p(P.shL).x - p(P.shR).x); const torso = Math.abs((p(P.shL).y + p(P.shR).y) / 2 - (p(P.hipL).y + p(P.hipR).y) / 2) || 1;
    const front = shW / torso > 0.45;
    const facing = p(P.shL).x > p(P.shR).x ? 1 : -1; // 1 = guarda la fotocamera
    const midSh = { x: (p(P.shL).x + p(P.shR).x) / 2, y: (p(P.shL).y + p(P.shR).y) / 2 };
    const midHip = { x: (p(P.hipL).x + p(P.hipR).x) / 2, y: (p(P.hipL).y + p(P.hipR).y) / 2 };
    const trunk = Math.abs(deg(Math.atan2(midSh.x - midHip.x, midHip.y - midSh.y)));
    return {
      front, trunk, kneeL: L.knee, kneeR: R.knee, hipL: L.hip, hipR: R.hip,
      valgL: front ? fppa(L.hipPt, L.kneePt, L.ankPt, 'L', facing) : null, valgR: front ? fppa(R.hipPt, R.kneePt, R.ankPt, 'R', facing) : null,
      pts: lm.map((q) => ({ x: q.x * w, y: q.y * h, v: q.visibility == null ? 1 : q.visibility })),
    };
  }

  /* ───────── Schermata ───────── */
  const MODES = {
    salto: { name: 'Altezza del salto', tip: 'Filma tutto il corpo, telefono fermo a terra o su un appoggio, a 2-3 metri. Poi segna il fotogramma dello stacco e quello dell\'atterraggio.' },
    atterraggio: { name: 'Atterraggio e ginocchia', tip: 'Vista di fronte, tutto il corpo. Fai un salto o un drop jump: misuro quanto le ginocchia vanno verso l\'interno (valgismo).' },
    tecnica: { name: 'Angoli e tecnica', tip: 'Vista di lato per squat, corsa o salto: misuro l\'angolo di ginocchio e anca e l\'inclinazione del tronco.' },
  };
  const st = { mode: 'salto', url: null, fps: null, pose: true, marks: {}, valg: null };

  function render($app, H) {
    const m = MODES[st.mode];
    $app.innerHTML = '<div class="head">' + H.backBtn() + '<div><div class="k p">Video</div><h1>Video analisi</h1></div></div>' +
      H.talk('img/punta.jpg', 'Filmiamo il movimento e lo rivediamo al <b>rallentatore</b>, un fotogramma alla volta. Riconosco il tuo corpo e misuro gli angoli. ' + m.tip, true) +
      '<div class="card" style="margin-top:14px"><div class="small muted" style="font-weight:700;margin-bottom:6px">Cosa analizziamo</div><div class="seg" id="v-mode">' +
      Object.keys(MODES).map((k) => '<button type="button" data-m="' + k + '" aria-pressed="' + (st.mode === k) + '">' + MODES[k].name.split(' ')[0] + '</button>').join('') + '</div>' +
      '<p class="small muted" style="margin-top:10px"><b style="color:#fff">' + m.name + '.</b> ' + m.tip + '</p></div>' +
      '<div class="actions"><button class="btn" id="v-rec">Registra un video</button>' +
      '<label class="btn ghost" for="v-file" style="cursor:pointer">Carica un video (anche slow-motion)</label><input type="file" id="v-file" accept="video/*" hidden /></div>' +
      '<p class="note" style="margin-top:12px">Per il <b>vero rallentatore</b> (120–240 fotogrammi al secondo) gira il video con la fotocamera del telefono in modalità <b>Slow-motion</b> e caricalo qui. Registrando dall\'app la velocità dipende dal browser (di solito 30–60 al secondo).</p>' +
      '<div id="v-player"></div>';
    $app.querySelectorAll('[data-m]').forEach((b) => { b.onclick = () => { st.mode = b.dataset.m; st.marks = {}; st.valg = null; render($app, H); }; });
    document.getElementById('v-file').onchange = (e) => { const f = e.target.files[0]; if (f) openVideo($app, H, URL.createObjectURL(f), null); };
    document.getElementById('v-rec').onclick = () => record($app, H);
    H.bindCommon();
    if (st.url) openVideo($app, H, st.url, st.fps);
  }

  /* ───────── Registrazione ───────── */
  async function record($app, H) {
    if (!window.MediaRecorder || !navigator.mediaDevices) { alert('Questo browser non registra video: carica un video girato con la fotocamera.'); return; }
    let stream;
    try {
      // chiede più fotogrammi possibile; se la fotocamera non li supporta, quelli di base
      const gum = (fr) => navigator.mediaDevices.getUserMedia({ audio: false, video: Object.assign({ facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, fr ? { frameRate: { ideal: fr } } : {}) });
      stream = await gum(240).catch(() => gum(60)).catch(() => gum(0));
    } catch (e) { alert(e && e.name === 'NotAllowedError' ? 'Serve il permesso alla fotocamera.' : 'Non riesco ad aprire la fotocamera.'); return; }
    const track = stream.getVideoTracks()[0];
    const fps = Math.round((track.getSettings && track.getSettings().frameRate) || 30);
    const ov = document.createElement('div'); ov.className = 'vid-live';
    ov.innerHTML = '<video playsinline muted autoplay></video><div class="vid-top"><span class="tag">' + fps + ' fotogrammi/s</span></div><div class="vid-count"></div>' +
      '<div class="vid-bar"><button class="btn" id="vr-go">Inizia (3 s)</button><button class="btn ghost" id="vr-x">Annulla</button></div>';
    document.body.appendChild(ov); document.body.classList.add('running');
    const v = ov.querySelector('video'); v.srcObject = stream;
    const close = () => { stream.getTracks().forEach((t) => t.stop()); ov.remove(); document.body.classList.remove('running'); };
    ov.querySelector('#vr-x').onclick = close;
    ov.querySelector('#vr-go').onclick = async () => {
      const go = ov.querySelector('#vr-go'); const cnt = ov.querySelector('.vid-count');
      go.disabled = true;
      for (let i = 3; i > 0; i--) { cnt.textContent = i; if (window.ElvySensors) window.ElvySensors.beep(660, 120); await new Promise((r) => setTimeout(r, 1000)); }
      cnt.textContent = '●'; cnt.classList.add('rec'); if (window.ElvySensors) window.ElvySensors.beep(1100, 250);
      const type = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      const mr = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: 8e6 } : undefined);
      const chunks = []; mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      mr.onstop = () => { close(); openVideo($app, H, URL.createObjectURL(new Blob(chunks, { type: type || 'video/webm' })), fps); };
      mr.start(250);
      go.disabled = false; go.textContent = 'Stop';
      const stop = () => { if (mr.state !== 'inactive') mr.stop(); };
      go.onclick = stop;
      setTimeout(stop, 8000); // al massimo 8 secondi
    };
  }

  /* ───────── Riproduzione al rallentatore con il corpo riconosciuto ───────── */
  function openVideo($app, H, url, fps) {
    st.url = url; st.fps = fps || st.fps;
    const box = $app.querySelector('#v-player'); if (!box) return;
    const salto = st.mode === 'salto'; const att = st.mode === 'atterraggio';
    box.innerHTML = '<div class="vid-wrap"><video id="vp" playsinline muted preload="auto" src="' + url + '"></video><canvas id="vc"></canvas></div>' +
      '<input type="range" id="vs" min="0" max="1000" value="0" class="vid-range" aria-label="Posizione nel video" />' +
      '<div class="vid-ctrl"><button id="vb" aria-label="Fotogramma indietro">◀︎</button><button id="vpl" aria-label="Riproduci">▶︎</button><button id="vf" aria-label="Fotogramma avanti">▶︎|</button>' +
      '<div class="seg" id="vrate">' + [0.1, 0.25, 0.5, 1].map((r) => '<button type="button" data-r="' + r + '" aria-pressed="' + (r === 0.25) + '">' + (r === 1 ? '1×' : fmt(r, r === 0.25 ? 2 : 1) + '×') + '</button>').join('') + '</div></div>' +
      '<div class="row between small muted" style="margin:8px 2px"><span id="vt">0,000 s · fotogramma 0</span><label class="row" style="gap:6px"><input type="checkbox" id="vpose"' + (st.pose ? ' checked' : '') + ' /> corpo</label></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap"><span class="small muted">Fotogrammi al secondo:</span><div class="seg" id="vfps" style="flex:1">' + [30, 60, 120, 240].map((f) => '<button type="button" data-f="' + f + '" aria-pressed="' + (st.fps === f) + '">' + f + '</button>').join('') + '</div></div>' +
      '<div class="card" style="margin-top:12px" id="vm"><p class="small muted">Metti in pausa su un fotogramma: riconosco il corpo e misuro gli angoli.</p></div>' +
      (salto ? '<div class="card" style="margin-top:12px"><h3>Altezza del salto</h3><p class="small muted" style="margin-top:6px">Vai al fotogramma in cui i piedi si staccano e tocca «Stacco», poi a quello in cui toccano terra e tocca «Atterraggio».</p>' +
        '<div class="grid2" style="margin-top:10px"><button class="btn small ghost" id="vk1">Stacco</button><button class="btn small ghost" id="vk2">Atterraggio</button></div><div id="vjump" style="margin-top:12px"></div></div>' : '') +
      (att ? '<div class="card" style="margin-top:12px"><h3>Valgismo delle ginocchia</h3><p class="small muted" style="margin-top:6px">Analizzo tutti i fotogrammi e trovo il momento in cui le ginocchia vanno più verso l\'interno.</p><button class="btn small" id="vall" style="margin-top:10px">Analizza l\'atterraggio</button><div id="vval" style="margin-top:12px"></div></div>' : '');
    const v = box.querySelector('#vp'); const cv = box.querySelector('#vc'); const ctx = cv.getContext('2d');
    const range = box.querySelector('#vs'); const tx = box.querySelector('#vt');
    let rate = 0.25; let busy = false; let last = null;
    const step = () => 1 / (st.fps || 30);
    const frameNo = () => Math.round(v.currentTime / step());

    // velocità vera del video: fotogrammi presentati durante una riproduzione lenta
    function detectFps() {
      if (st.fps || !v.requestVideoFrameCallback) { if (!st.fps) st.fps = 30; mark(); return; }
      const ts = []; const t0 = v.currentTime;
      const cb = (now, meta) => { ts.push(meta.mediaTime); if (ts.length < 25) v.requestVideoFrameCallback(cb); else done(); };
      const done = () => {
        v.pause(); v.currentTime = t0;
        const d = []; for (let i = 1; i < ts.length; i++) if (ts[i] > ts[i - 1]) d.push(ts[i] - ts[i - 1]);
        d.sort((a, b) => a - b); const med = d[d.length >> 1] || 1 / 30;
        const f = 1 / med; st.fps = [30, 60, 120, 240].reduce((a, b) => (Math.abs(b - f) < Math.abs(a - f) ? b : a));
        mark();
      };
      v.playbackRate = 0.1; v.requestVideoFrameCallback(cb); v.play().catch(() => { st.fps = 30; mark(); });
    }
    function mark() { box.querySelectorAll('#vfps [data-f]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.f === st.fps))); show(); }

    function size() { cv.width = v.videoWidth || 640; cv.height = v.videoHeight || 360; }
    function draw(res) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (!res) return;
      const lw = Math.max(2, cv.width / 220);
      ctx.lineWidth = lw; ctx.lineCap = 'round';
      BONES.forEach(([a, b]) => { const A = res.pts[a]; const B = res.pts[b]; if (A.v < 0.3 || B.v < 0.3) return; ctx.strokeStyle = a % 2 ? 'rgba(127,214,209,.95)' : 'rgba(196,166,242,.95)'; ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); });
      res.pts.forEach((q, i) => { if (i < 11 || q.v < 0.3) return; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(q.x, q.y, lw * 1.6, 0, 6.283); ctx.fill(); });
      // angolo del ginocchio scritto accanto
      ctx.font = 'bold ' + Math.round(cv.width / 26) + 'px Manrope, sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = lw * 1.5;
      [[25, res.front ? res.valgL : res.kneeL], [26, res.front ? res.valgR : res.kneeR]].forEach(([i, a]) => {
        const q = res.pts[i]; if (q.v < 0.4 || a == null) return;
        const t = fmt(a, 0) + '°'; ctx.strokeText(t, q.x + lw * 4, q.y); ctx.fillText(t, q.x + lw * 4, q.y);
      });
    }
    async function analyse(target) {
      if (!st.pose) { draw(null); return null; }
      busy = true;
      try {
        const pose = await loadPose();
        const res = pose.detect(target || v);
        const lm = res && res.landmarks && res.landmarks[0];
        last = lm ? metrics(lm, cv.width, cv.height) : null;
        if (!target) { draw(last); panel(); }
        return last;
      } catch (e) {
        box.querySelector('#vm').innerHTML = '<p class="err">Il riconoscimento del corpo non si è caricato: controlla la connessione e riprova.</p>';
        return null;
      } finally { busy = false; }
    }
    function panel() {
      const el = box.querySelector('#vm');
      if (!last) { el.innerHTML = '<p class="small muted">Non vedo una persona in questo fotogramma: inquadra tutto il corpo, ben illuminato.</p>'; return; }
      const s = (l, a, b, u) => '<div class="stat"><div class="l">' + l + '</div><div class="v" style="font-size:20px">' + a + ' · ' + b + '<small>' + u + '</small></div><div class="s">sx · dx</div></div>';
      el.innerHTML = '<div class="row between"><h3>In questo fotogramma</h3><span class="tag">' + (last.front ? 'vista di fronte' : 'vista di lato') + '</span></div><div class="grid2" style="margin-top:10px">' +
        (last.front ? s('Valgismo ginocchio', fmt(last.valgL), fmt(last.valgR), '°') : s('Flessione ginocchio', fmt(last.kneeL), fmt(last.kneeR), '°')) +
        s('Flessione anca', fmt(last.hipL), fmt(last.hipR), '°') + '<div class="stat"><div class="l">Tronco inclinato</div><div class="v" style="font-size:20px">' + fmt(last.trunk) + '<small>°</small></div></div>' +
        (last.front ? s('Flessione ginocchio', fmt(last.kneeL), fmt(last.kneeR), '°') : '') + '</div>';
    }
    function show() {
      tx.textContent = fmt(v.currentTime, 3) + ' s · fotogramma ' + frameNo() + (st.fps ? ' · ' + st.fps + '/s' : '');
      if (v.duration) range.value = Math.round((v.currentTime / v.duration) * 1000);
    }
    v.addEventListener('loadedmetadata', () => { size(); v.currentTime = 0.001; detectFps(); });
    v.addEventListener('seeked', () => { show(); if (v.paused && !busy) analyse(); });
    v.addEventListener('pause', () => { box.querySelector('#vpl').textContent = '▶︎'; if (!busy) analyse(); });
    v.addEventListener('play', () => { box.querySelector('#vpl').textContent = '❚❚'; });
    v.addEventListener('timeupdate', show);
    // durante la riproduzione lenta il corpo si aggiorna fotogramma per fotogramma
    if (v.requestVideoFrameCallback) {
      const loop = () => { if (!v.paused && st.pose && !busy && rate <= 0.5) analyse(); v.requestVideoFrameCallback(loop); };
      v.requestVideoFrameCallback(loop);
    }
    box.querySelector('#vpl').onclick = () => { if (v.paused) { v.playbackRate = rate; v.play(); } else v.pause(); };
    box.querySelector('#vb').onclick = () => { v.pause(); v.currentTime = Math.max(0, v.currentTime - step()); };
    box.querySelector('#vf').onclick = () => { v.pause(); v.currentTime = Math.min(v.duration || 0, v.currentTime + step()); };
    range.oninput = () => { v.pause(); if (v.duration) v.currentTime = (range.value / 1000) * v.duration; };
    box.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { rate = +b.dataset.r; v.playbackRate = rate; box.querySelectorAll('[data-r]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); }; });
    box.querySelectorAll('[data-f]').forEach((b) => { b.onclick = () => { st.fps = +b.dataset.f; mark(); }; });
    box.querySelector('#vpose').onchange = (e) => { st.pose = e.target.checked; if (st.pose) analyse(); else draw(null); };

    if (salto) {
      const out = box.querySelector('#vjump');
      const upd = () => {
        const a = st.marks.off; const b = st.marks.land;
        if (a == null || b == null || b <= a) { out.innerHTML = '<p class="small muted">' + (a != null ? 'Stacco a ' + fmt(a, 3) + ' s. ' : '') + (b != null ? 'Atterraggio a ' + fmt(b, 3) + ' s.' : '') + '</p>'; return; }
        const tf = b - a; const h = (G * tf * tf) / 8 * 100; const err = ((G * tf * step()) / 4) * 100;
        out.innerHTML = '<div class="row between"><div><div class="small muted">Volo ' + fmt(tf * 1000) + ' ms</div><div class="big" style="font-size:44px">' + fmt(h, 1) + '<small>cm</small></div><div class="small dim">precisione ± ' + fmt(err, 1) + ' cm con ' + (st.fps || 30) + ' fotogrammi/s</div></div></div>' +
          '<button class="btn small" id="vsave" style="margin-top:12px">Salva nei progressi (' + (H.device.on ? 'con Elvy' : 'senza Elvy') + ')</button>';
        out.querySelector('#vsave').onclick = () => {
          const all = H.results();
          all.push({ id: Date.now(), t: Date.now(), test: 'cmj', cond: H.device.on ? 'con' : 'senza', where: H.device.on ? H.device.where || H.PROTO : null, variant: 'dal video', opts: {}, demo: false, main: h,
            res: { ok: true, jumps: [{ tf, h }], best: h, tf, avg: h, video: true, fps: st.fps } });
          H.saveResults(all); out.querySelector('#vsave').textContent = 'Salvato ✓'; out.querySelector('#vsave').disabled = true;
        };
      };
      box.querySelector('#vk1').onclick = () => { st.marks.off = v.currentTime; upd(); };
      box.querySelector('#vk2').onclick = () => { st.marks.land = v.currentTime; upd(); };
      upd();
    }
    if (att) {
      box.querySelector('#vall').onclick = async () => {
        const out = box.querySelector('#vval'); const btn = box.querySelector('#vall'); btn.disabled = true;
        v.pause(); const was = st.pose; st.pose = true;
        const n = Math.min(240, Math.floor((v.duration || 0) / step()));
        const every = Math.max(1, Math.ceil(n / 120)); // al massimo 120 fotogrammi analizzati
        const series = [];
        for (let i = 0; i < n; i += every) {
          v.currentTime = i * step();
          await new Promise((r) => v.addEventListener('seeked', r, { once: true }));
          const r = await analyse(v); out.textContent = 'Analisi ' + Math.round((100 * i) / n) + '%';
          if (r && r.front) series.push({ t: v.currentTime, L: r.valgL, R: r.valgR });
        }
        st.pose = was; btn.disabled = false;
        if (!series.length) { out.innerHTML = '<p class="small muted">Non ho trovato una persona vista di fronte: filma di fronte, tutto il corpo.</p>'; return; }
        const mL = series.reduce((a, b) => (b.L > a.L ? b : a)); const mR = series.reduce((a, b) => (b.R > a.R ? b : a));
        const lab = (x) => (x > 10 ? '<span style="color:#F5B3AD">da tenere d\'occhio</span>' : 'nella norma');
        out.innerHTML = '<div class="grid2">' + ['Sinistra', 'Destra'].map((s, i) => { const m = i ? mR : mL; const a = i ? m.R : m.L; return '<div class="stat"><div class="l">' + s + '</div><div class="v">' + fmt(Math.max(0, a)) + '<small>°</small></div><div class="s">' + lab(a) + ' · a ' + fmt(m.t, 2) + ' s</div></div>'; }).join('') + '</div>' +
          '<p class="note" style="margin-top:10px">Valgismo massimo = quanto il ginocchio va verso l\'interno rispetto alla linea anca–caviglia (angolo nel piano frontale). Oltre 10° all\'atterraggio è un segnale da valutare con il preparatore o il fisioterapista.</p>';
        v.currentTime = (mL.L > mR.R ? mL : mR).t;
      };
    }
  }

  window.ElvyVideo = { render, _metrics: metrics, _fppa: fppa, _inner: inner };
})();
