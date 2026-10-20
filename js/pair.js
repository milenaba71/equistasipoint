/* Abbinamento a tutto schermo, in stile Apple Watch: cerchio di mira con la fotocamera, nuvola di particelle
   che "legge" il dispositivo, anello che si chiude, seriale che si accende cifra per cifra, poi le particelle
   convergono, lampo, ✓ verde e suono di conferma. Suoni creati al momento con Web Audio (nessun file).
   Uso: EqPair.run({ accept, norm, verify }) → Promise<{ serial, ok }> oppure null se annullato.
   - verify(serial) → Promise<boolean>: controllo del seriale, parte appena il codice è letto. */
(function () {
  const COLS = [[127, 182, 232], [72, 140, 197], [250, 220, 0], [255, 255, 255]];
  const MIN_READ = 900; // dopo la lettura l'anello impiega almeno questo tempo a chiudersi
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const out = (x) => 1 - Math.pow(1 - x, 3);

  /* ───────── Suoni ───────── */
  let ac = null; let master = null;
  function audio() {
    if (!ac) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ac = new A(); master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, at, dur, { type = 'sine', gain = 0.2, attack = 0.005, glide = 0, pan = 0 } = {}) {
    if (!ac) return;
    const o = ac.createOscillator(); const g = ac.createGain(); const p = ac.createStereoPanner ? ac.createStereoPanner() : null;
    o.type = type; o.frequency.setValueAtTime(f, at); if (glide) o.frequency.exponentialRampToValueAtTime(f * glide, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(master); } else g.connect(master);
    o.start(at); o.stop(at + dur + 0.05);
  }
  function noise(at, dur, { gain = 0.15, from = 400, to = 4000, q = 0.8 } = {}) {
    if (!ac) return;
    const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate); const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = q;
    f.frequency.setValueAtTime(from, at); f.frequency.exponentialRampToValueAtTime(to, at + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(gain, at + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(at); s.stop(at + dur + 0.05);
  }
  const SND = {
    open() { const t = ac.currentTime; tone(587, t, 1.2, { gain: 0.07, attack: 0.4 }); tone(880, t + 0.1, 1.0, { gain: 0.05, attack: 0.4 }); noise(t, 0.8, { gain: 0.08, from: 300, to: 2500 }); },
    sparkle() { const t = ac.currentTime; tone(2200 + Math.random() * 3000, t, 0.22, { gain: 0.035, pan: Math.random() * 2 - 1 }); },
    tick(i) { tone(1500 + i * 40, ac.currentTime, 0.07, { gain: 0.06, pan: (i - 5) / 7 }); },
    riser(sec) { const t = ac.currentTime; tone(220, t, sec, { type: 'triangle', gain: 0.08, attack: sec * 0.9, glide: 4.5 }); tone(330, t, sec, { gain: 0.05, attack: sec * 0.9, glide: 4.5 }); noise(t, sec, { gain: 0.1, from: 300, to: 7000 }); },
    success() {
      const t = ac.currentTime;
      tone(55, t, 1.2, { gain: 0.5, attack: 0.005, glide: 0.6 }); noise(t, 0.4, { gain: 0.25, from: 3000, to: 300, q: 0.5 });
      [1174.7, 1480, 1760, 2349.3].forEach((f, i) => tone(f, t + 0.05 + i * 0.06, 1.8, { gain: 0.08, attack: 0.004 }));
      tone(880, t + 0.5, 0.6, { gain: 0.12 }); tone(1318.5, t + 0.65, 0.9, { gain: 0.11 });
    },
    error() { const t = ac.currentTime; tone(330, t, 0.25, { type: 'triangle', gain: 0.15 }); tone(247, t + 0.22, 0.4, { type: 'triangle', gain: 0.15 }); },
  };
  const sfx = (k, ...a) => { try { if (ac) SND[k](...a); } catch (e) { /* audio non disponibile */ } };

  /* ───────── Nuvola di particelle ───────── */
  function makeCloud(n) {
    let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const P = [];
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2; const r = Math.sqrt(1 - y * y); const th = i * 2.399963; const j = 0.85 + rnd() * 0.3;
      P.push({ x: Math.cos(th) * r * j, y: y * j, z: Math.sin(th) * r * j, c: rnd(), s: 0.6 + rnd() * 1.3, ph: rnd() * 6.28, fx: rnd() * 2 - 1, fy: rnd() * 2 - 1, fz: rnd() * 2 - 1 });
    }
    return P;
  }
  function drawCloud(ctx, P, cx, cy, R, t, { alpha = 1, swirl = 0, spin = 1, collapse = 0, burst = 0 }) {
    const a = t * 0.8 * spin; const b = 0.35 + Math.sin(t * 0.45) * 0.25;
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < P.length; i++) {
      const p = P[i]; const w = 1 + 0.08 * Math.sin(p.y * 6 + t * 3 + p.ph) + swirl * 0.16 * Math.sin(p.x * 5 - t * 4);
      let x = p.x * w, y = p.y * w, z = p.z * w;
      if (burst) { x += p.fx * burst; y += p.fy * burst; z += p.fz * burst * 0.3; }
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; const y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      const k = 1 - collapse; const pz = 2.6 + z2;
      const px = cx + x1 * R * k * 2.2 / pz, py = cy + y2 * R * k * 2.2 / pz;
      const dep = cl((1.6 - z2) / 2.4); const c = COLS[p.c < 0.55 ? 0 : p.c < 0.8 ? 1 : p.c < 0.95 ? 2 : 3];
      const al = alpha * (0.3 + 0.7 * dep) * (0.6 + 0.4 * Math.sin(t * 5 + p.ph)) * (burst ? Math.max(0, 1 - burst / 2.4) : 1);
      const sz = p.s * (0.7 + dep * 1.3) * (R / 150);
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (al * 0.2).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, sz * 1.7, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + Math.min(1, al * 1.25).toFixed(3) + ')';
      ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ───────── Schermata ───────── */
  function run(opts) {
    opts = opts || {};
    audio(); // va creato nel tocco dell'utente (iPhone)
    return new Promise((resolve, reject) => {
      const el = document.createElement('div');
      el.className = 'pair'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', T('Abbina il dispositivo'));
      let ticks = '';
      for (let i = 0; i < 120; i++) { const an = (i / 120) * Math.PI * 2; const r1 = 153, r2 = i % 10 === 0 ? 160 : 157; ticks += '<line x1="' + (165 + Math.cos(an) * r1).toFixed(1) + '" y1="' + (165 + Math.sin(an) * r1).toFixed(1) + '" x2="' + (165 + Math.cos(an) * r2).toFixed(1) + '" y2="' + (165 + Math.sin(an) * r2).toFixed(1) + '"/>'; }
      el.innerHTML =
        '<canvas class="pair-bg" aria-hidden="true"></canvas>' +
        '<button type="button" class="pair-x" aria-label="' + T('Annulla') + '">✕</button>' +
        '<div class="pair-head"><h2 class="pair-t">' + T('Abbina il dispositivo') + '</h2><p class="pair-s">' + T('Inquadra il retro del dispositivo nel cerchio') + '</p></div>' +
        '<div class="pair-vf"><div class="pair-feed"></div></div>' +
        '<svg class="pair-ring" viewBox="0 0 330 330" aria-hidden="true"><defs><linearGradient id="pairgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7fb6e8"/><stop offset="1" stop-color="#FADC00"/></linearGradient></defs>' +
        '<g class="pair-ticks">' + ticks + '</g><circle class="pair-track" cx="165" cy="165" r="146"/><circle class="pair-prog" cx="165" cy="165" r="146" transform="rotate(-90 165 165)"/></svg>' +
        '<canvas class="pair-fx" aria-hidden="true"></canvas>' +
        '<svg class="pair-check" viewBox="0 0 300 300" aria-hidden="true"><circle cx="150" cy="150" r="128"/><path d="M90 156l40 40 82-86"/></svg>' +
        '<div class="pair-sn" aria-live="polite"></div><div class="pair-st"></div>' +
        '<div class="pair-done"><b>' + T('Dispositivo abbinato') + '</b><span class="pair-done-sn"></span></div>' +
        '<button type="button" class="btn pair-torch" hidden>' + T('Luce') + '</button>';
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('on'));
      const $ = (s) => el.querySelector(s);
      const bgc = $('.pair-bg'), fxc = $('.pair-fx'), vf = $('.pair-vf');
      const bg = bgc.getContext('2d'), fx = fxc.getContext('2d');
      const prog = $('.pair-prog'); const C = 2 * Math.PI * 146; prog.style.strokeDasharray = C.toFixed(1);
      const P = makeCloud(window.innerWidth < 500 ? 900 : 1300);
      const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.5 + 0.4, p: Math.random() * 6.28 }));
      let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, rad = 140;
      function size() {
        dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
        [bgc, fxc].forEach((c) => { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
        const r = vf.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; rad = r.width / 2;
      }
      size(); window.addEventListener('resize', size);
      const SER = { text: '' };
      let phase = 'scan'; // scan → read → (ok | ko)
      const t0 = performance.now(); let tRead = 0, tEnd = 0; let pRead = 0; let verified = null; let raf = 0; let lastSpark = 0;
      let shownDigits = 0; let finished = false;
      sfx('open');
      function digits(nShown) {
        let h = '';
        for (let i = 0; i < SER.text.length; i++) h += '<span class="' + (i < nShown ? 'on' : '') + '">' + (i < nShown ? SER.text[i] : '•') + '</span>';
        $('.pair-sn').innerHTML = h;
      }
      function frame(now) {
        const t = (now - t0) / 1000;
        // fondo con stelle
        bg.setTransform(dpr, 0, 0, dpr, 0, 0); bg.clearRect(0, 0, W, H);
        stars.forEach((s) => { bg.fillStyle = 'rgba(160,190,255,' + (0.2 + 0.25 * Math.sin(t * 1.5 + s.p)).toFixed(3) + ')'; bg.fillRect(s.x * W, ((s.y * H - t * 10 * s.s) % H + H) % H, s.s, s.s); });
        fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, W, H);
        // avanzamento dell'anello
        let p;
        if (phase === 'scan') p = 0.32 * (1 - Math.exp(-t / 2.2));
        else {
          const q = cl((now - tRead) / MIN_READ);
          p = pRead + (1 - pRead) * ease(q);
          const nd = Math.min(SER.text.length, Math.floor(q * SER.text.length * 1.08));
          if (nd > shownDigits) { for (let i = shownDigits; i < nd; i++) sfx('tick', i); shownDigits = nd; digits(nd); }
          if (q >= 1 && verified !== null && phase === 'read') finish(verified === true, now);
        }
        prog.style.strokeDashoffset = (C * (1 - p)).toFixed(1);
        $('.pair-st').textContent = phase === 'scan' ? T('Ricerca del dispositivo…') : phase === 'read' ? T('Lettura {p}%', { p: Math.floor(p * 100) }) : '';
        // nuvola: dentro il cerchio mentre legge, poi converge e si sparge
        if (phase === 'scan' || phase === 'read' || (phase === 'ok' && now - tEnd < 350)) {
          const col = phase === 'ok' ? ease(cl((now - tEnd) / 300)) : 0;
          fx.save(); fx.beginPath(); fx.arc(cx, cy, rad, 0, Math.PI * 2); fx.clip();
          drawCloud(fx, P, cx, cy, rad * 0.86, t * (phase === 'read' ? 1.6 : 1.2), { alpha: cl(t * 1.5), swirl: phase === 'read' ? 1 : 0.3, spin: phase === 'read' ? 1.8 : 1, collapse: col });
          fx.restore();
        }
        if (phase === 'ok') {
          const k = now - tEnd;
          const fl = cl((k - 300) / 120) * (1 - cl((k - 420) / 500));
          if (fl > 0) { const g = fx.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.6); g.addColorStop(0, 'rgba(255,255,255,' + fl + ')'); g.addColorStop(0.4, 'rgba(200,225,255,' + fl * 0.6 + ')'); g.addColorStop(1, 'rgba(120,170,255,0)'); fx.fillStyle = g; fx.fillRect(0, 0, W, H); }
          const bu = cl((k - 350) / 2200);
          if (bu > 0 && bu < 1) drawCloud(fx, P, cx, cy, rad * 0.86, t, { burst: out(bu) * 2.4 });
          if (k > 350) for (let i = 0; i < 2; i++) { const q = (((k - 350) / 1000) * 0.6 + i * 0.5) % 1; fx.strokeStyle = 'rgba(31,174,91,' + ((1 - q) * 0.7).toFixed(3) + ')'; fx.lineWidth = 4; fx.beginPath(); fx.arc(cx, cy, rad * (0.55 + q * 0.9), 0, Math.PI * 2); fx.stroke(); }
        }
        // scintillii sonori
        if ((phase === 'scan' || phase === 'read') && now - lastSpark > (phase === 'read' ? 70 : 160)) { lastSpark = now; sfx('sparkle'); }
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);

      function finish(ok, now) {
        phase = ok ? 'ok' : 'ko'; tEnd = now;
        el.classList.add(ok ? 'ok' : 'ko');
        if (ok) {
          sfx('success'); setTimeout(() => { if (navigator.vibrate) navigator.vibrate([30, 40, 60]); }, 300);
          $('.pair-t').textContent = T('Abbinamento…'); $('.pair-s').textContent = T('Collegamento all’app');
          $('.pair-done-sn').textContent = SER.text;
          setTimeout(() => { $('.pair-t').textContent = T('Tutto pronto'); $('.pair-s').textContent = T('Il dispositivo si è abbinato all’app'); }, 400);
          setTimeout(() => close({ serial: SER.text, ok: true }), 700);
        } else {
          sfx('error');
          $('.pair-t').textContent = verified === 'err' ? T('Nessuna connessione') : T('Seriale non riconosciuto'); $('.pair-s').textContent = SER.text;
          setTimeout(() => close({ serial: SER.text, ok: false, error: verified === 'err' ? 'net' : 'invalid' }), 1800);
        }
      }
      function close(result, err) {
        if (finished) return; finished = true;
        if (window.EqScan) window.EqScan.stop();
        el.classList.remove('on'); el.classList.add('off');
        setTimeout(() => { cancelAnimationFrame(raf); window.removeEventListener('resize', size); el.remove(); }, 320);
        if (err) reject(err); else resolve(result);
      }
      $('.pair-x').addEventListener('click', () => close(null));

      window.EqScan.open({ container: $('.pair-feed'), fx: false, freeze: true, torch: $('.pair-torch'), accept: opts.accept }).then((text) => {
        if (!text || finished) { if (!finished) close(null); return; }
        SER.text = opts.norm ? opts.norm(text) : text; phase = 'read'; tRead = performance.now(); pRead = 0.32 * (1 - Math.exp(-((tRead - t0) / 1000) / 2.2));
        el.classList.add('read'); digits(0);
        $('.pair-s').textContent = T('Lettura del dispositivo in corso…');
        if (navigator.vibrate) navigator.vibrate(40);
        sfx('riser', MIN_READ / 1000);
        Promise.resolve(opts.verify ? opts.verify(SER.text) : true).then((ok) => { verified = !!ok; }, () => { verified = 'err'; });
      }).catch((e) => close(null, e));
    });
  }
  // se la verifica fallisce per la rete il risultato è { ok: false, error: 'net' }
  window.EqPair = { run, reduced: () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches };
})();
