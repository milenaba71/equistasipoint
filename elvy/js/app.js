/* Elvy · app per lo sport di Equistasi.
   Schermate: Oggi, Test, Progressi, Profilo. I test usano l'accelerometro del telefono
   (js/analysis.js); i risultati restano sul telefono (localStorage). */
(function () {
  const A = window.ElvyAnalysis;
  const S = window.ElvySensors;
  const SIM = window.ElvySim;
  const $app = document.getElementById('app');
  const $sheet = document.getElementById('sheet');

  /* ───────── Dati salvati ───────── */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memoria non disponibile */ } },
  };
  const profile = Object.assign({ name: '', sport: '', mass: null, height: null, voice: true, mascotVoice: true, flip: false, welcomed: false }, store.get('elvy-profile', {}));
  const device = Object.assign({ on: false, since: null, where: null }, store.get('elvy-device', {}));
  const saveProfile = () => store.set('elvy-profile', profile);
  const saveDevice = () => store.set('elvy-device', device);
  const results = () => store.get('elvy-results', []);
  const saveResults = (all) => store.set('elvy-results', all.slice(-500));
  const prefs = store.get('elvy-prefs', {});
  const savePrefs = () => store.set('elvy-prefs', prefs);
  S.setVoice(profile.voice);

  /* ───────── Formattazione ───────── */
  const fmt = (v, d = 1) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dateLong = (t) => new Date(t).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateShort = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  const timeShort = (t) => new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const isToday = (t) => new Date(t).toDateString() === new Date().toDateString();
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const minsSince = (t) => Math.max(0, Math.round((Date.now() - t) / 60000));
  const clock = (sec) => { const t = Math.round(sec); return ((t >= 60 ? Math.floor(t / 60) + ' min ' : '') + (t % 60 || t < 60 ? (t % 60) + ' s' : '')).trim(); };
  const durText = (min) => (min < 60 ? min + ' min' : Math.floor(min / 60) + ' h ' + (min % 60) + ' min');

  // logo Elvy in testa alle schermate principali
  // icone dell'altoparlante per la voce della mascotte
  const SPK_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  const SPK_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
  const voiceBtn = (cls) => '<button type="button" class="' + cls + '" data-voice aria-pressed="' + !profile.mascotVoice + '" aria-label="' + (profile.mascotVoice ? 'Escludi la voce della mascotte' : 'Riattiva la voce della mascotte') + '">' + (profile.mascotVoice ? SPK_ON : SPK_OFF) + '<span>' + (profile.mascotVoice ? 'Voce Elvy' : 'Voce esclusa') + '</span></button>';
  // logo Elvy in testa alle schermate principali, con l'interruttore della voce della mascotte
  const brand = () => '<div class="brandbar"><img class="brand" src="img/logo-elvy.png" alt="Elvy" />' + voiceBtn('voice-tg') + '</div>';
  const paceTxt = (secPerKm) => (secPerKm && isFinite(secPerKm) ? Math.floor(secPerKm / 60) + ':' + String(Math.round(secPerKm % 60)).padStart(2, '0') : '—');
  const readyTxt = (sc) => (sc >= 70 ? 'Pronto per allenarti' : sc >= 45 ? 'Recupero nella media' : 'Oggi vai leggero');
  // GPS acceso per tutta la durata di un test (nei dati simulati no)
  function withGps(ctx, on) {
    const g = on && !ctx.demo ? S.gps() : null;
    if (g) g.start();
    return { points: g ? g.points : [], stop: () => { if (g) g.stop(); } };
  }
  const IMG = { hi: 'img/mascotte.jpg', ok: 'img/pollice.jpg', point: 'img/punta.jpg', jump: 'img/salta.jpg' };
  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    nfc: '<svg viewBox="0 0 24 24"><path d="M6 8.5a5 5 0 0 1 0 7M9.5 6a9 9 0 0 1 0 12M13 4a12 12 0 0 1 0 16"/></svg>',
    belt: '<svg viewBox="0 0 40 40"><path d="M6 15c4 2 9 3 14 3s10-1 14-3M6 25c4 2 9 3 14 3s10-1 14-3M6 15v10M34 15v10"/><rect x="13" y="17" width="14" height="9" rx="2"/></svg>',
    hand: '<svg viewBox="0 0 40 40"><rect x="13" y="6" width="14" height="24" rx="3"/><path d="M10 22c0 6 4 12 10 12s10-5 10-10"/></svg>',
    leg: '<svg viewBox="0 0 40 40"><path d="M18 4v16l-2 14h6M18 20h4"/><rect x="21" y="18" width="7" height="11" rx="1.5"/></svg>',
    finger: '<svg viewBox="0 0 40 40"><rect x="9" y="4" width="22" height="32" rx="4"/><circle cx="16" cy="11" r="3"/><circle cx="24" cy="11" r="1.6"/><path d="M14 30V16c0-2 4-2 4 0v8"/></svg>',
    gps: '<svg viewBox="0 0 40 40"><path d="M20 36s-11-11-11-19a11 11 0 0 1 22 0c0 8-11 19-11 19z"/><circle cx="20" cy="17" r="4"/></svg>',
    watch: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-4h4l1 4M9 18l1 4h4l1-4M10 12h1.5l1-2 1.5 4 1-2h1"/></svg>',
    chest: '<svg viewBox="0 0 40 40"><circle cx="20" cy="8" r="4"/><path d="M12 36V20c0-4 3-6 8-6s8 2 8 6v16"/><rect x="16" y="17" width="8" height="11" rx="1.5"/></svg>',
  };

  /* ───────── Grafica (SVG) ───────── */
  // Traccia dell'oscillazione con ellisse al 95%; "scale" (cm) uguale per i due lati
  function stabilogram(r, color, scale) {
    if (!r || !r.ellipse) return '<div class="dim" style="padding:40px 0;text-align:center">—</div>';
    const R = scale || Math.max(r.ellipse.rx, 0.5) * 1.3;
    const k = 90 / R;
    const pts = (r.path || []).map((p) => (p[0] * k).toFixed(1) + ',' + (-p[1] * k).toFixed(1)).join(' ');
    const deg = (r.ellipse.angle * 180) / Math.PI;
    return '<svg class="chart" viewBox="-110 -110 220 220" role="img" aria-label="Traccia dell\'oscillazione">' +
      '<rect x="-110" y="-110" width="220" height="220" rx="22" fill="#3d3d40"/>' +
      '<path d="M-90 0H90M0 -90V90" stroke="#6a6a70" stroke-width="1.5"/>' +
      '<ellipse cx="0" cy="0" rx="' + (r.ellipse.rx * k).toFixed(1) + '" ry="' + (r.ellipse.ry * k).toFixed(1) + '" transform="rotate(' + (-deg).toFixed(1) + ')" fill="' + color + '" fill-opacity=".28" stroke="' + color + '" stroke-width="3"/>' +
      '<polyline points="' + pts + '" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  // Barre con valore sopra; "hi" = indice evidenziato
  function bars(vals, opts = {}) {
    const n = vals.length; if (!n) return '';
    const W = 320; const H = 150; const gap = n > 12 ? 4 : 12; const bw = (W - gap * (n - 1)) / n;
    const max = Math.max(...vals.map((v) => v || 0)) || 1;
    const lab = opts.fmt || ((v) => fmt(v, 2));
    let s = '<svg class="chart" viewBox="0 -24 ' + W + ' ' + (H + 48) + '" role="img" aria-label="' + esc(opts.label || 'Grafico') + '">';
    vals.forEach((v, i) => {
      const h = Math.max(4, ((v || 0) / max) * (H - 10));
      const x = i * (bw + gap);
      const on = i === opts.hi;
      s += '<rect x="' + x.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(10, bw / 3).toFixed(1) + '" fill="' + (opts.colors ? opts.colors[i] : (on ? '#4BA6A3' : '#5C8F8C')) + '"/>';
      if (n <= 12) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H - h - 8).toFixed(1) + '" text-anchor="middle" style="fill:#fff;font-weight:700">' + lab(v) + '</text>';
      if (n <= 12 || i % 5 === 0) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (H + 18) + '" text-anchor="middle">' + (opts.xl ? opts.xl[i] : i + 1) + '</text>';
    });
    return s + '<path d="M0 ' + H + 'H' + W + '" stroke="#6a6a70"/></svg>';
  }
  function sparkline(vals) {
    if (!vals || vals.length < 2) return '';
    const W = 320; const H = 90; const lo = Math.min(...vals); const hi = Math.max(...vals); const span = Math.max(1, hi - lo);
    const pts = vals.map((v, i) => ((i / (vals.length - 1)) * W).toFixed(1) + ',' + (H - 12 - ((v - lo) / span) * (H - 30)).toFixed(1)).join(' ');
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Andamento"><polyline points="' + pts + '" fill="none" stroke="#7FD6D1" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="M0 ' + (H - 2) + 'H' + W + '" stroke="#6a6a70"/></svg>';
  }
  function gauge(score) {
    const r = 54; const c = 2 * Math.PI * r; const v = Math.max(0, Math.min(100, score));
    return '<svg class="gauge" viewBox="0 0 132 132"><circle cx="66" cy="66" r="' + r + '" fill="none" stroke="#5a5a5f" stroke-width="12"/>' +
      '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke="#4BA6A3" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + (c * v / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 66 66)"/>' +
      '<text x="66" y="72" text-anchor="middle" font-size="38" font-weight="700">' + Math.round(score) + '</text><text x="66" y="96" text-anchor="middle" font-size="13" style="fill:#C9C9CF;font-family:Manrope,sans-serif">su 100</text></svg>';
  }
  // Andamento nel tempo: punti grigi = senza Elvy, verdi = con Elvy
  function trend(list, metric) {
    if (!list.length) return '';
    const W = 320; const H = 160; const vals = list.map((r) => r.main);
    let lo = Math.min(...vals); let hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.15, Math.abs(hi) * 0.1, Math.pow(10, -metric.d));
    lo -= pad; hi += pad;
    const X = (i) => (list.length === 1 ? W / 2 : 14 + (i / (list.length - 1)) * (W - 28));
    const Y = (v) => H - 20 - ((v - lo) / (hi - lo)) * (H - 40);
    const line = list.map((r, i) => X(i).toFixed(1) + ',' + Y(r.main).toFixed(1)).join(' ');
    let s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + (H + 6) + '" role="img" aria-label="Andamento di ' + esc(metric.label) + '">' +
      '<text x="0" y="12">' + fmt(hi - pad, metric.d) + '</text><text x="0" y="' + (H - 4) + '">' + fmt(lo + pad, metric.d) + '</text>' +
      '<polyline points="' + line + '" fill="none" stroke="#6a6a70" stroke-width="2"/>';
    list.forEach((r, i) => { s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(r.main).toFixed(1) + '" r="6" fill="' + (r.cond === 'con' ? '#4BA6A3' : '#A8A8AE') + '" stroke="#424244" stroke-width="2"/>'; });
    return s + '</svg><div class="legend"><span><i style="background:#A8A8AE"></i>Senza Elvy</span><span><i style="background:#4BA6A3"></i>Con Elvy</span></div>';
  }
  // I tre passi del confronto: 0 = nessuno fatto, 1 = senza fatto, 2 = applicato, 3 = finito
  function stepper(done) {
    const st = [['Senza Elvy', 'misura di base'], ['Applica Elvy', 'C7 e polpacci'], ['Con Elvy', 'stesso test']];
    return '<ol class="stepper">' + st.map((x, i) => '<li class="' + (i < done ? 'done' : i === done ? 'now' : '') + '"><i>' + (i < done ? '✓' : i + 1) + '</i><b>' + x[0] + '</b><span>' + x[1] + '</span></li>').join('') + '</ol>';
  }
  // Figura vista da dietro con i 3 punti del protocollo Sport: C7 e i due polpacci
  const BODY_BACK = '<svg class="bodyback" viewBox="0 0 120 230" role="img" aria-label="Punti di applicazione: settima vertebra cervicale e polpacci">' +
    '<g fill="#5b5b61" stroke="#6d6d74" stroke-width="1.5"><circle cx="60" cy="22" r="15"/><path d="M38 44c6-6 38-6 44 0l8 52c1 6-3 9-7 9H37c-4 0-8-3-7-9z"/>' +
    '<path d="M30 50l-12 46c-1 4 5 6 7 2l14-40zM90 50l12 46c1 4-5 6-7 2L81 58z"/><path d="M40 104h19l-2 112c0 5-12 5-12 0zM61 104h19l-5 112c0 5-12 5-12 0z"/></g>' +
    '<g class="dots"><circle cx="60" cy="42" r="6"/><circle cx="51" cy="168" r="6"/><circle cx="69" cy="168" r="6"/></g>' +
    '<g class="lbl"><text x="74" y="38">C7</text><text x="80" y="172">polpacci</text></g></svg>';
  // Barre a coppie: per ogni confronto grigio = senza Elvy, verde = con Elvy
  function pairsChart(list, metric) {
    if (!list.length) return '';
    const W = 320; const H = 130; const n = list.length; const gw = W / n; const bw = Math.min(26, gw * 0.32);
    const max = Math.max(...list.map((x) => Math.max(x.s.main, x.c.main))) || 1;
    let svg = '<svg class="chart" viewBox="0 -30 ' + W + ' ' + (H + 54) + '" role="img" aria-label="Confronti senza e con Elvy">';
    list.forEach((x, i) => {
      const cx = gw * i + gw / 2;
      [[x.s.main, '#8d8d94', -1], [x.c.main, '#4BA6A3', 1]].forEach(([v, col, k]) => {
        const h = Math.max(4, (v / max) * (H - 8)); const xx = cx + (k < 0 ? -bw - 2 : 2);
        svg += '<rect x="' + xx.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="5" fill="' + col + '"/>';
      });
      const top = H - (Math.max(x.s.main, x.c.main) / max) * (H - 8) - 10;
      svg += '<text x="' + cx.toFixed(1) + '" y="' + top.toFixed(1) + '" text-anchor="middle" style="font-weight:800;fill:' + (x.good ? '#7FD6D1' : x.good === false ? '#F5B3AD' : '#C9C9CF') + '">' + pctTxt(x.pct) + '</text>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (H + 18) + '" text-anchor="middle">' + dateShort(x.t) + '</text>';
    });
    return svg + '<path d="M0 ' + H + 'H' + W + '" stroke="#6a6a70"/></svg><div class="legend"><span><i style="background:#8d8d94"></i>Senza Elvy</span><span><i style="background:#4BA6A3"></i>Con Elvy</span></div>';
  }
  const stat = (l, v, unit, sub, purple) => '<div class="stat"><div class="l">' + l + '</div><div class="v">' + v + (unit ? '<small>' + unit + '</small>' : '') + '</div>' + (sub ? '<div class="s' + (purple ? ' p' : '') + '">' + sub + '</div>' : '') + '</div>';
  const say = (img, text) => '<div class="say"><img src="' + img + '" alt="" /><p>' + text + '</p></div>';

  /* ───────── La mascotte parla ───────── */
  // Fumetto con Elvy: il testo compare a poco a poco mentre Elvy lo dice con la voce.
  // auto = parla appena la schermata compare. Toccando Elvy o il fumetto ripete.
  const talk = (img, html, auto) => '<div class="talk' + (auto ? ' auto' : '') + '"><button type="button" class="talk-face" aria-label="Ascolta Elvy"><img src="' + img + '" alt="" />' +
    '<i class="talk-wave" aria-hidden="true"><b></b><b></b><b></b></i></button><p class="talk-bubble"><span class="talk-text">' + html + '</span>' + voiceBtn('talk-mute') + '</p></div>';
  const plain = (html) => String(html).replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  function speak(el) {
    const tx = el.querySelector('.talk-text');
    const html = el.dataset.html || (el.dataset.html = tx.innerHTML);
    const text = plain(html);
    const cps = 16; // caratteri al secondo, circa il ritmo della voce
    clearInterval(el.iv); clearTimeout(el.to);
    el.classList.add('speaking');
    const t0 = performance.now();
    const finish = () => { clearInterval(el.iv); clearTimeout(el.to); tx.innerHTML = html; el.classList.remove('speaking'); };
    el.iv = setInterval(() => {
      const n = Math.floor(((performance.now() - t0) / 1000) * cps);
      if (n >= text.length) { clearInterval(el.iv); tx.innerHTML = html; return; }
      tx.textContent = text.slice(0, n) + '▍';
    }, 40);
    // la mascotte parla solo se la sua voce non è esclusa (la guida vocale dei test è a parte)
    if (profile.mascotVoice && S.voiceOn() && 'speechSynthesis' in window) S.say(text, { pitch: 1.15, onend: finish });
    el.to = setTimeout(finish, (text.length / cps) * 1000 + 600);
  }
  function setMascotVoice(on) {
    profile.mascotVoice = on; saveProfile();
    if (!on) S.stopVoice();
    document.querySelectorAll('[data-voice]').forEach((b) => { b.outerHTML = voiceBtn(b.className); });
    bindVoice(document);
  }
  function bindVoice(root) {
    root.querySelectorAll('[data-voice]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); setMascotVoice(!profile.mascotVoice); }; });
  }
  function bindTalks(root) {
    bindVoice(root);
    root.querySelectorAll('.talk').forEach((el) => { el.onclick = () => speak(el); });
    const a = root.querySelector('.talk.auto');
    if (a) setTimeout(() => { if (a.isConnected) speak(a); }, 350);
  }
  // Frasi che la mascotte dice spiegando ogni test
  const INTRO = {
    'una-gamba': 'Stai su una gamba, prima la sinistra e poi la destra. Io misuro quanto oscilli: meno oscilli, più sei stabile.',
    'in-piedi': 'Resta fermo in piedi: trenta secondi a occhi aperti e trenta a occhi chiusi. Così vediamo quanto ti affidi alla vista.',
    cmj: 'Mani sui fianchi e tre salti, uno a ogni segnale. Dal tempo che passi in aria calcolo quanto salti.',
    drop: 'Scendi dal gradino e rimbalza subito in alto. Misuro quanto resti a terra e quanto salti: è la tua forza reattiva.',
    hop: 'Tre salti sulla gamba sinistra e tre sulla destra. Così vediamo se le gambe sono equilibrate.',
    ripetuti: 'Salta di continuo fino allo stop. Misuro la tua potenza e quanto cali con la fatica.',
    corsa: 'Telefono nella cintura e corri alla tua andatura. Ti dico la cadenza, il contatto a terra e se la corsa è simmetrica.',
    plank: 'Mettiti in plank e tieni più a lungo che puoi. Mi accorgo da solo quando il bacino cede.',
    reazione: 'Quando lo schermo diventa verde, tocca più in fretta che puoi. Dieci prove: vediamo i tuoi riflessi.',
    hrv: 'Appoggia il dito sulla fotocamera e resta fermo un minuto. Dal battito misuro la variabilità del cuore: mi dice quanto hai recuperato.',
    swing: 'Stringi bene il telefono e fai cinque swing, uno a ogni segnale. Col giroscopio misuro quanto veloce ruoti.',
    cooper: 'Corri dodici minuti all\'aperto e fai più strada che puoi. Con il GPS misuro la distanza e stimo il tuo VO2max.',
    mobilita: 'Metti il telefono sul segmento da misurare: parti fermo, poi vai al massimo e tieni. Io misuro l\'angolo.',
  };
  const placeBox = (icon, text) => '<div class="place">' + ICON[icon] + '<span>' + text + '</span></div>';

  /* ───────── I test ───────── */
  const BELT_TEXT = 'Telefono nella <b>cintura Elvy</b>, in orizzontale sulla zona lombare. Senza cintura: tienilo <b>stretto al petto</b> con le due mani.';
  const SAFE = '<div class="warn">Fai i test su un pavimento non scivoloso, con qualcuno vicino se c\'è rischio di cadere. Se senti dolore, fermati. I risultati sono stime per l\'allenamento, non una valutazione medica.</div>';
  const legName = { sx: 'Sinistra', dx: 'Destra' };

  const TESTS = {
    /* ── Equilibrio ── */
    'una-gamba': {
      group: 'Equilibrio', name: 'Una gamba', full: 'Equilibrio su una gamba', sub: 'destra e sinistra', minutes: 2, place: 'belt',
      options: [{ key: 'eyes', label: 'Occhi', values: { aperti: 'Occhi aperti', chiusi: 'Occhi chiusi' } }, { key: 'dur', label: 'Durata', values: { 20: '20 s', 30: '30 s' } }],
      defaults: { eyes: 'aperti', dur: 30 },
      variant: (o) => 'occhi ' + o.eyes,
      steps: ['Metti il telefono in cintura e stai in piedi, a piedi nudi o con le scarpe di sempre.', 'Dopo il conto alla rovescia sollevi il piede <b>destro</b>: resti sulla gamba <b>sinistra</b>, mani sui fianchi.', 'Poi cambi gamba. Se appoggi il piede, l\'app se ne accorge e salva il tempo che hai resistito.'],
      metric: { label: 'Area media', unit: 'cm²', d: 1, better: 'low' },
      async run(ctx, o) {
        const eyes = o.eyes === 'chiusi' ? ' a occhi chiusi' : '';
        const out = {};
        for (const leg of ['sx', 'dx']) {
          if (leg === 'dx') await ctx.pause(8, 'Cambia gamba', 'Riposati un attimo. Ora starai sulla gamba destra.');
          else await ctx.prep(8, 'Preparati', 'Metti il telefono in cintura. Starai sulla gamba sinistra' + eyes + '.');
          const s = await ctx.record(+o.dur, { phase: 'Gamba ' + legName[leg].toLowerCase(), msg: 'Resta in equilibrio' + eyes, go: 'Su!', voice: 'Solleva il piede. Resta in equilibrio' + eyes },
            () => SIM.swaySignal(leg === 'sx' ? 1.25 : 1.05, leg === 'sx' ? 0.95 : 0.85, +o.dur, { seed: leg === 'sx' ? 3 : 4 }));
          out[leg] = A.sway(s);
          if (!out[leg].ok) throw new Error(out[leg].reason === 'short' ? 'Hai appoggiato il piede quasi subito: riprova con calma.' : 'Il sensore non ha inviato abbastanza dati.');
        }
        out.sym = A.symmetry(out.sx.area, out.dx.area);
        out.dur = +o.dur;
        return out;
      },
      main: (r) => (r.sx.area + r.dx.area) / 2,
      render(r) {
        const sc = Math.max(r.sx.ellipse.rx, r.dx.ellipse.rx, 0.5) * 1.25;
        const worse = r.sx.area > r.dx.area ? 'Sinistra' : 'Destra';
        const more = Math.round(100 * (Math.max(r.sx.area, r.dx.area) / Math.min(r.sx.area, r.dx.area) - 1));
        const held = (x) => (x.fell ? fmt(x.held, 0) + ' s' : 'piena');
        return '<div class="grid2">' +
          ['sx', 'dx'].map((l, i) => '<div class="card tight" style="text-align:center"><div class="k' + (i ? ' p' : '') + '" style="margin-bottom:10px">' + legName[l] + '</div>' + stabilogram(r[l], i ? '#C4A6F2' : '#7FD6D1', sc) +
            '<div class="big" style="font-size:30px;margin-top:12px">' + fmt(r[l].area, 1) + '<small style="font-size:15px">cm²</small></div><div class="small dim">tenuta ' + held(r[l]) + '</div></div>').join('') + '</div>' +
          '<div class="card" style="margin-top:12px"><div class="row between"><h3>Simmetria tra le gambe</h3><div class="big" style="font-size:38px;color:var(--teal-l)">' + fmt(r.sym, 0) + '%</div></div>' +
          '<div class="bar" style="margin-top:14px"><i class="t" style="width:' + (100 * r.dx.area / (r.sx.area + r.dx.area)).toFixed(1) + '%"></i><i class="p" style="flex:1"></i></div>' +
          '<div class="row between small muted" style="margin-top:12px"><span>' + (more > 0 ? worse + ' oscilla il ' + more + '% in più' : 'Le due gambe sono uguali') + '</span><span>' + r.dur + ' s</span></div></div>';
      },
      comment(r) {
        if (r.sx.fell || r.dx.fell) return 'Hai appoggiato il piede prima della fine: è normale all\'inizio. Riprova tra qualche giorno, anche con Elvy applicato, e guarda se resisti di più.';
        if (r.sym >= 85) return 'Bravo! Le due gambe sono simili. Ripeti il test tra una settimana e vediamo come cambia, anche con Elvy.';
        const w = r.sx.area > r.dx.area ? 'sinistra' : 'destra';
        return 'La gamba ' + w + ' oscilla di più: ripetiamo il test tra una settimana e vediamo come cambia, anche con Elvy.';
      },
    },
    'in-piedi': {
      group: 'Equilibrio', name: 'In piedi', full: 'Equilibrio in piedi', sub: 'occhi aperti e chiusi', minutes: 2, place: 'belt',
      options: [{ key: 'stance', label: 'Piedi', values: { uniti: 'Piedi uniti', tandem: 'Uno davanti all\'altro' } }],
      defaults: { stance: 'uniti' },
      variant: (o) => (o.stance === 'tandem' ? 'piedi in tandem' : 'piedi uniti'),
      steps: ['Telefono in cintura. In piedi, ' + 'braccia lungo i fianchi, sguardo avanti.', '30 secondi a <b>occhi aperti</b>, poi 30 secondi a <b>occhi chiusi</b>: la voce ti dice quando.', 'Il confronto dice quanto ti affidi alla vista per stare in equilibrio (rapporto di Romberg).'],
      metric: { label: 'Area occhi aperti', unit: 'cm²', d: 1, better: 'low' },
      async run(ctx, o) {
        const out = {};
        await ctx.prep(8, 'Preparati', 'Metti il telefono in cintura e stai fermo in piedi, ' + (o.stance === 'tandem' ? 'un piede davanti all\'altro.' : 'piedi uniti.'));
        let s = await ctx.record(30, { phase: 'Occhi aperti', msg: 'Resta fermo, guarda avanti', voice: 'Resta fermo e guarda avanti' }, () => SIM.swaySignal(0.55, 0.45, 30, { seed: 6 }));
        out.open = A.sway(s);
        await ctx.pause(5, 'Occhi chiusi', 'Ora chiudi gli occhi e resta fermo.');
        s = await ctx.record(30, { phase: 'Occhi chiusi', msg: 'Occhi chiusi, resta fermo', go: 'Chiudi', voice: 'Chiudi gli occhi' }, () => SIM.swaySignal(0.85, 0.7, 30, { seed: 7 }));
        out.closed = A.sway(s);
        if (!out.open.ok || !out.closed.ok) throw new Error('Il sensore non ha inviato abbastanza dati.');
        out.romberg = out.closed.area / out.open.area;
        return out;
      },
      main: (r) => r.open.area,
      render(r) {
        const sc = Math.max(r.open.ellipse.rx, r.closed.ellipse.rx, 0.4) * 1.25;
        return '<div class="grid2">' + [['open', 'Occhi aperti', '#7FD6D1'], ['closed', 'Occhi chiusi', '#C4A6F2']].map(([k, l, c], i) =>
          '<div class="card tight" style="text-align:center"><div class="k' + (i ? ' p' : '') + '" style="margin-bottom:10px">' + l + '</div>' + stabilogram(r[k], c, sc) +
          '<div class="big" style="font-size:30px;margin-top:12px">' + fmt(r[k].area, 1) + '<small style="font-size:15px">cm²</small></div><div class="small dim">' + fmt(r[k].velocity, 1) + ' cm/s</div></div>').join('') + '</div>' +
          '<div class="card" style="margin-top:12px"><div class="row between"><h3>Rapporto di Romberg</h3><div class="big" style="font-size:38px;color:var(--purple-l)">' + fmt(r.romberg, 1) + '</div></div>' +
          '<p class="small muted" style="margin-top:8px">A occhi chiusi oscilli ' + fmt(r.romberg, 1) + ' volte rispetto a occhi aperti. Più è vicino a 1, più il tuo equilibrio si basa sulle sensazioni del corpo (propriocezione) e meno sulla vista.</p></div>';
      },
      comment: (r) => (r.romberg > 2 ? 'A occhi chiusi oscilli molto di più: il tuo equilibrio si appoggia tanto sulla vista. È proprio qui che conviene provare il test con Elvy.' : 'Ottimo controllo anche a occhi chiusi. Ripeti il test nelle settimane e confronta con e senza Elvy.'),
    },

    /* ── Salti ── */
    cmj: {
      group: 'Salti', name: 'Salto verticale', full: 'Salto verticale (CMJ)', sub: 'altezza dal tempo di volo', minutes: 1, place: 'belt',
      options: [],
      variant: () => '',
      steps: ['Telefono in cintura, <b>mani sui fianchi</b> per tutto il test.', 'Al segnale fai un piegamento veloce e salta più in alto che puoi. Tre salti, uno a ogni segnale.', 'Atterra sugli avampiedi con le gambe tese, poi resta fermo fino al segnale successivo.'],
      metric: { label: 'Altezza', unit: 'cm', d: 1, better: 'high' },
      async run(ctx) {
        await ctx.prep(8, 'Preparati', 'Metti il telefono in cintura e le mani sui fianchi. Farai tre salti, uno a ogni segnale.');
        const s = await ctx.record(14, { phase: 'Tre salti', msg: 'Salta a ogni segnale', go: 'Salta!', voice: 'Salta!', cues: [{ at: 4.5, say: 'Salta!', msg: 'Secondo salto' }, { at: 9, say: 'Salta!', msg: 'Terzo salto' }] },
          () => joinSim([0.47, 0.5, 0.485].map((tf, i) => SIM.jumpSequence([{ tf }], { seed: i + 40, after: 2 }))));
        const r = A.jumps(s, { mass: profile.mass });
        if (!r.ok) throw new Error(r.reason === 'nojump' ? 'Non ho riconosciuto i salti: tieni il telefono ben fermo in cintura (o stretto al petto) e salta in alto.' : 'Il sensore non ha inviato abbastanza dati.');
        return r;
      },
      main: (r) => r.best,
      render(r) {
        const best = r.jumps.findIndex((j) => j.h === r.best);
        return '<div class="grid3">' + stat('Volo', fmt(r.tf * 1000, 0), 'ms') + stat('Media', fmt(r.avg, 1), 'cm') + stat('Potenza', r.power ? fmt(r.power, 0) : '—', r.power ? 'W' : '', r.power ? '' : 'serve il peso', true) + '</div>' +
          '<div class="card" style="margin-top:12px"><div class="row between"><h3>I tuoi salti</h3><span class="dim">cm</span></div>' + bars(r.jumps.map((j) => j.h), { hi: best, fmt: (v) => fmt(v, 1), label: 'Altezza dei salti' }) +
          '<p class="note" style="margin-top:8px">Altezza = g × volo² ÷ 8. Potenza di picco stimata con la formula di Sayers dal peso del profilo.</p></div>';
      },
      comment: (r) => (r.jumps.length < 3 ? 'Ho contato ' + r.jumps.length + ' salti su 3: la prossima volta salta a ogni segnale, così il confronto è più preciso.' : 'Tre salti registrati! Ripetilo la mattina: se scendi molto rispetto al solito, oggi le gambe sono stanche.'),
    },
    drop: {
      group: 'Salti', name: 'Drop jump', full: 'Drop jump', sub: 'forza reattiva (RSI)', minutes: 2, place: 'belt',
      options: [{ key: 'box', label: 'Gradino', values: { 20: '20 cm', 30: '30 cm', 40: '40 cm' } }],
      defaults: { box: 30 },
      variant: (o) => 'gradino ' + o.box + ' cm',
      steps: ['Telefono in cintura, mani sui fianchi, in piedi su un gradino stabile.', 'Al segnale <b>scendi</b> (non saltare giù) e appena tocchi terra <b>rimbalza</b> verso l\'alto il più velocemente possibile.', 'Risali sul gradino. Cinque salti, uno a ogni segnale.'],
      metric: { label: 'RSI', unit: '', d: 2, better: 'high' },
      async run(ctx, o) {
        await ctx.prep(8, 'Sul gradino', 'Metti il telefono in cintura e sali sul gradino da ' + o.box + ' centimetri.');
        const cues = []; for (let i = 1; i < 5; i++) { cues.push({ at: i * 7 - 4, say: 'Risali', msg: 'Risali sul gradino' }); cues.push({ at: i * 7, say: 'Giù!', msg: 'Salto ' + (i + 1) + ' di 5', beep: true }); }
        const s = await ctx.record(34, { phase: 'Cinque salti', msg: 'Salto 1 di 5', go: 'Giù!', voice: 'Giù!', cues },
          () => joinSim([0.205, 0.215, 0.198, 0.22, 0.212].map((tc, i) => SIM.jumpSequence([{ tc, tf: 0.42 + [0, 0.012, 0.024, 0.006, -0.004][i] }], { drop: o.box / 100, seed: i + 2, start: 1, after: 3.5 }))));
        const r = A.dropJumps(s);
        if (!r.ok) throw new Error('Non ho riconosciuto i salti: scendi dal gradino e rimbalza subito verso l\'alto, con il telefono ben fermo.');
        r.box = +o.box;
        return r;
      },
      main: (r) => r.best,
      hero: (r) => ({ k: 'Forza reattiva (RSI)', v: fmt(r.best, 2), unit: '', sub: 'migliore dei ' + r.jumps.length + ' salti', img: IMG.jump }),
      render(r) {
        const b = r.bestJump;
        const hi = r.jumps.indexOf(b);
        return '<div class="grid3">' + stat('Contatto', fmt(b.tc * 1000, 0), 'ms') + stat('Volo', fmt(b.tf * 1000, 0), 'ms') + stat('Altezza', fmt(b.h, 0), 'cm') + '</div>' +
          '<div class="card" style="margin-top:12px"><div class="row between"><h3>I ' + r.jumps.length + ' salti</h3><span class="dim">RSI</span></div>' + bars(r.jumps.map((j) => j.rsi), { hi, label: 'RSI dei salti' }) +
          '<p class="small muted" style="margin-top:8px">RSI = altezza del salto ÷ tempo di contatto. Telefono in cintura: misura quando atterri e quando riparti.</p></div>';
      },
      comment: (r) => (r.bestJump.tc > 0.3 ? 'Il contatto a terra è lungo (' + fmt(r.bestJump.tc * 1000, 0) + ' ms): prova a pensare al pavimento come se scottasse, rimbalza subito.' : 'Contatto rapido, ottimo rimbalzo! Confronta l\'RSI con e senza Elvy sullo stesso gradino.'),
    },
    hop: {
      group: 'Salti', name: 'Hop test', full: 'Hop test su una gamba', sub: 'simmetria tra le gambe', minutes: 2, place: 'belt',
      options: [],
      variant: () => '',
      steps: ['Telefono in cintura, mani sui fianchi.', 'Tre salti in alto sulla gamba <b>sinistra</b>, uno a ogni segnale, atterrando sulla stessa gamba.', 'Poi tre salti sulla gamba <b>destra</b>. Confrontiamo le due gambe (indice di simmetria).'],
      metric: { label: 'Simmetria', unit: '%', d: 0, better: 'high' },
      async run(ctx) {
        const out = {};
        for (const leg of ['sx', 'dx']) {
          if (leg === 'dx') await ctx.pause(8, 'Cambia gamba', 'Ora tre salti sulla gamba destra.');
          else await ctx.prep(8, 'Preparati', 'Metti il telefono in cintura. Tre salti sulla gamba sinistra.');
          const s = await ctx.record(13, { phase: 'Gamba ' + legName[leg].toLowerCase(), msg: 'Salta a ogni segnale', go: 'Salta!', voice: 'Salta!', cues: [{ at: 4, say: 'Salta!' }, { at: 8, say: 'Salta!' }] },
            () => joinSim([0, 1, 2].map((i) => SIM.jumpSequence([{ tf: (leg === 'sx' ? 0.33 : 0.355) - i * 0.006 }], { seed: i + (leg === 'sx' ? 12 : 22), after: 2 }))));
          out[leg] = A.jumps(s);
          if (!out[leg].ok) throw new Error('Non ho riconosciuto i salti sulla gamba ' + legName[leg].toLowerCase() + ': salta in alto e tieni il telefono fermo.');
        }
        out.lsi = A.symmetry(out.sx.best, out.dx.best);
        return out;
      },
      main: (r) => r.lsi,
      render(r) {
        const max = Math.max(r.sx.best, r.dx.best);
        return '<div class="card"><div class="row between"><h3>Simmetria tra le gambe</h3><div class="big" style="font-size:38px;color:var(--teal-l)">' + fmt(r.lsi, 0) + '%</div></div>' +
          ['sx', 'dx'].map((l, i) => '<div class="lr"><span style="color:' + (i ? 'var(--purple-l)' : 'var(--teal-l)') + '">' + legName[l] + '</span><div class="bar"><i class="' + (i ? 'p' : 't') + '" style="width:' + (100 * r[l].best / max).toFixed(1) + '%"></i></div><span class="n">' + fmt(r[l].best, 1) + ' cm</span></div>').join('') +
          '<p class="small muted" style="margin-top:12px">Migliore dei salti per ogni gamba. Sotto il 90% c\'è una differenza da tenere d\'occhio, per esempio dopo un infortunio.</p></div>';
      },
      comment: (r) => (r.lsi >= 90 ? 'Gambe equilibrate! Ripeti il test ogni tanto per tenerle d\'occhio.' : 'La gamba ' + (r.sx.best < r.dx.best ? 'sinistra' : 'destra') + ' salta meno. Ripeti il test nelle prossime settimane, anche con Elvy, e guarda se la differenza si riduce.'),
    },
    ripetuti: {
      group: 'Salti', name: 'Salti ripetuti', full: 'Salti ripetuti (Bosco)', sub: 'potenza e calo per la fatica', minutes: 1, place: 'belt',
      options: [{ key: 'dur', label: 'Durata', values: { 15: '15 s', 30: '30 s' } }],
      defaults: { dur: 15 },
      variant: (o) => o.dur + ' s',
      steps: ['Telefono in cintura, mani sui fianchi.', 'Al «Via» salta di continuo più in alto che puoi, con contatti a terra brevi.', 'Non fermarti fino allo «Stop». Misuriamo potenza, rimbalzo e quanto cali per la fatica.'],
      metric: { label: 'Potenza', unit: 'W/kg', d: 1, better: 'high' },
      async run(ctx, o) {
        await ctx.prep(8, 'Preparati', 'Metti il telefono in cintura e le mani sui fianchi. Salterai di continuo per ' + o.dur + ' secondi.');
        const s = await ctx.record(+o.dur, { phase: 'Salti continui', msg: 'Salta, salta, salta!', voice: 'Via! Salta!', cues: [{ at: o.dur / 2, say: 'Metà! Non mollare' }, { at: o.dur - 3, say: 'Ancora tre secondi' }] },
          () => SIM.jumpSequence(Array.from({ length: Math.round(o.dur / 0.72) }, (_, i) => ({ tc: 0.24 + i * 0.002, tf: 0.48 - i * 0.006 })), { seed: 21 }));
        const r = A.repeatedJumps(s);
        if (!r.ok) throw new Error('Ho riconosciuto meno di 3 salti: salta di continuo, con il telefono ben fermo.');
        r.dur = +o.dur;
        return r;
      },
      main: (r) => r.power,
      render(r) {
        const hs = r.jumps.map((j) => j.h);
        return '<div class="grid2">' + stat('Salti', r.n, '', 'in ' + fmt(r.duration, 1) + ' s') + stat('Altezza media', fmt(r.avgHeight, 1), 'cm', 'migliore ' + fmt(r.best, 1) + ' cm') +
          stat('Contatto medio', r.avgContact ? fmt(r.avgContact * 1000, 0) : '—', 'ms', 'RSI medio ' + fmt(r.avgRsi, 2), true) + stat('Calo per fatica', fmt(r.fatigue, 0), '%', 'ultimi salti rispetto ai primi', true) + '</div>' +
          '<div class="card" style="margin-top:12px"><div class="row between"><h3>Altezza di ogni salto</h3><span class="dim">cm</span></div>' + bars(hs, { hi: hs.indexOf(r.best), fmt: (v) => fmt(v, 0), label: 'Altezza dei salti' }) +
          '<p class="note" style="margin-top:8px">Potenza meccanica media con la formula di Bosco: g² × tempo di volo × tempo totale ÷ (4 × salti × tempo di contatto).</p></div>';
      },
      comment: (r) => (r.fatigue > 25 ? 'Negli ultimi salti sei calato del ' + fmt(r.fatigue, 0) + '%: la resistenza alla fatica si allena. Ripeti il test e confronta con e senza Elvy.' : 'Hai tenuto bene fino alla fine! Calo per fatica di solo il ' + fmt(r.fatigue, 0) + '%.'),
    },

    /* ── Corsa e core ── */
    corsa: {
      group: 'Corsa e core', name: 'Analisi della corsa', full: 'Analisi della corsa', sub: 'telefono in cintura', minutes: 5, place: 'belt',
      options: [{ key: 'dur', label: 'Durata', values: { 60: '1 min', 180: '3 min', 300: '5 min' } }, { key: 'gps', label: 'GPS (distanza e passo)', values: { si: 'Sì, all\'aperto', no: 'No' } }],
      defaults: { dur: 180, gps: 'si' },
      variant: () => '',
      steps: ['Telefono nella <b>cintura Elvy</b> sulla zona lombare, ben aderente.', 'Corri alla tua andatura abituale, possibilmente su un percorso piano e sempre lo stesso.', 'La voce ti avvisa ogni minuto e alla fine. Puoi fermare prima dal pulsante.'],
      metric: { label: 'Cadenza', unit: 'passi/min', d: 0, better: null },
      async run(ctx, o) {
        await ctx.prep(10, 'Preparati', 'Metti il telefono nella cintura e preparati a correre.');
        const cues = []; for (let m = 60; m < o.dur; m += 60) cues.push({ at: m, say: (m / 60) + (m === 60 ? ' minuto' : ' minuti') });
        const g = withGps(ctx, o.gps !== 'no');
        let s;
        try {
          s = await ctx.record(+o.dur, { phase: 'Corsa', msg: 'Corri alla tua andatura', go: 'Via!', voice: 'Via! Corri alla tua andatura', cues, clock: true },
            () => SIM.runSignal(171, 0.238, 60, { tcRight: 0.233, tcLeft: 0.243, seed: 31, platformSign: S.platformSign }));
        } finally { g.stop(); }
        const r = A.running(s, { flipSides: profile.flip, platformSign: S.platformSign });
        if (!r.ok) throw new Error('Non ho riconosciuto abbastanza passi: il telefono deve stare fermo in cintura mentre corri.');
        const tr = o.gps !== 'no' ? A.track(ctx.demo ? SIM.gpsTrack(3.4, +o.dur, { seed: 7 }) : g.points) : null;
        if (tr && tr.ok) r.gps = tr;
        return r;
      },
      main: (r) => r.cadence,
      hero: (r) => ({ k: clock(r.duration) + ' · ' + r.steps + ' passi', v: fmt(r.cadence, 0), unit: 'passi al minuto', chart: sparkline(r.series) }),
      render(r) {
        const max = Math.max(r.contactLeft || 0, r.contactRight || 0) * 1.15 || 1;
        return '<div class="grid2">' + stat('Tempo di contatto', r.contact ? fmt(r.contact * 1000, 0) : '—', r.contact ? 'ms' : '', r.contact ? '' : 'nessuna fase di volo') + stat('Oscillazione verticale', fmt(r.oscillation, 1), 'cm') +
          stat('Simmetria del passo', fmt(r.symmetry, 0), '%') + stat('Regolarità', fmt(r.regularity, 2), 'su 1') + '</div>' +
          (r.gps ? '<div class="grid3" style="margin-top:12px">' + stat('Distanza', fmt(r.gps.distance / 1000, 2), 'km', 'GPS') + stat('Passo', paceTxt(r.gps.pace), '/km') + stat('Vel. max', fmt(r.gps.maxSpeed * 3.6, 1), 'km/h', '', true) + '</div>' : '') +
          (r.contactLeft && r.contactRight ? '<div class="card" style="margin-top:12px"><h3>Contatto a terra, sinistra e destra</h3>' +
            [['Sinistra', r.contactLeft, 't', 'var(--teal-l)'], ['Destra', r.contactRight, 'p', 'var(--purple-l)']].map(([l, v, c, col]) => '<div class="lr"><span style="color:' + col + '">' + l + '</span><div class="bar"><i class="' + c + '" style="width:' + (100 * v / max).toFixed(1) + '%"></i></div><span class="n">' + fmt(v * 1000, 0) + ' ms</span></div>').join('') + '</div>' : '') +
          '<p class="note" style="margin-top:14px">Stime dal sensore di movimento in cintura: confronta corse fatte sullo stesso percorso e alla stessa andatura. Se destra e sinistra ti sembrano invertite, cambia l\'impostazione nel Profilo.</p>';
      },
      comment: (r) => (r.cadence < 160 ? 'Cadenza di ' + fmt(r.cadence, 0) + ' passi al minuto: molti corridori trovano utile qualche passo in più al minuto, più corto e leggero.' : 'Bella corsa regolare! Ripetila sullo stesso percorso, con e senza Elvy, e confronta contatto e simmetria.'),
    },
    plank: {
      group: 'Corsa e core', name: 'Plank', full: 'Plank: stabilità del core', sub: 'tenuta e tremore', minutes: 2, place: 'belt',
      options: [{ key: 'max', label: 'Massimo', values: { 60: '60 s', 90: '90 s', 120: '120 s' } }],
      defaults: { max: 60 },
      variant: (o) => 'max ' + o.max + ' s',
      steps: ['Telefono in cintura, sulla zona lombare.', 'Mettiti in plank sugli avambracci, corpo dritto dalla testa ai talloni.', 'Tieni il più a lungo possibile: quando il bacino cede, il test si ferma da solo.'],
      metric: { label: 'Tenuta', unit: 's', d: 0, better: 'high' },
      async run(ctx, o) {
        await ctx.prep(12, 'In posizione', 'Metti il telefono in cintura e mettiti in posizione di plank.');
        const s = await ctx.record(+o.max, { phase: 'Plank', msg: 'Corpo dritto, respira', go: 'Tieni!', voice: 'Tieni! Corpo dritto', cues: [15, 30, 45, 60, 75, 90, 105].filter((x) => x < o.max).map((x) => ({ at: x, say: x + ' secondi' })), stopWhen: plankBroken },
          () => SIM.plankSignal(Math.min(+o.max, 55), { breakAt: Math.min(+o.max, 55) - 4, seed: 4 }));
        const r = A.plank(s);
        if (!r.ok) throw new Error('Il test è durato troppo poco: riprova tenendo la posizione.');
        r.max = +o.max;
        return r;
      },
      main: (r) => r.held,
      hero: (r) => ({ k: 'Tenuta', v: fmt(r.held, 0), unit: 's', sub: r.broke ? 'il bacino ha ceduto' : 'fino alla fine', img: IMG.ok }),
      render: (r) => '<div class="grid2">' + stat('Tremore', fmt(r.shake, 0), 'mm/s²', 'più basso = più stabile') + stat('Inclinazione max', fmt(r.maxTilt, 0), '°', 'rispetto alla partenza', true) + '</div>' +
        '<p class="note" style="margin-top:14px">Il test si ferma quando il bacino si abbassa o si alza di più di 12° per un secondo. Il tremore misura quanto il tronco vibra mentre tieni la posizione.</p>',
      comment: (r) => (r.broke ? 'Hai tenuto ' + fmt(r.held, 0) + ' secondi. Ripeti il test ogni settimana e confronta anche il tremore.' : 'Sei arrivato al massimo! La prossima volta prova un tempo più lungo.'),
    },

    /* ── Recupero ── */
    hrv: {
      group: 'Recupero', name: 'Battito e HRV', full: 'Battito e HRV', sub: 'dito sulla fotocamera', minutes: 1, place: 'finger',
      options: [{ key: 'src', label: 'Misura con', values: { camera: 'Fotocamera', fascia: 'Fascia o orologio' } }],
      defaults: { src: 'camera' },
      variant: (o) => (o.src === 'fascia' ? 'fascia/orologio' : ''),
      steps: ['Meglio appena sveglio, seduto o sdraiato, sempre nella stessa posizione.', 'Appoggia il polpastrello dell\'indice sulla <b>fotocamera posteriore</b> coprendo anche il flash, senza premere.', 'Resta fermo e respira normalmente per un minuto. Su iPhone, dal browser il flash non si accende: mettiti vicino a una luce forte.'],
      metric: { label: 'HRV (RMSSD)', unit: 'ms', d: 0, better: 'high' },
      noMotion: true,
      async run(ctx, o) { return hrvRun(ctx, o); },
      main: (r) => r.rmssd,
      hero: (r) => ({ k: 'Variabilità del battito (RMSSD)', v: fmt(r.rmssd, 0), unit: 'ms', sub: fmt(r.hr, 0) + ' battiti al minuto a riposo', img: IMG.ok }),
      render(r) {
        const rd = r.ready;
        return '<div class="grid3">' + stat('Battito', fmt(r.hr, 0), 'bpm') + stat('SDNN', fmt(r.sdnn, 0), 'ms') + stat('Qualità', fmt(r.quality * 100, 0), '%', r.src === 'fascia' ? 'fascia/orologio' : r.torch ? 'con il flash' : 'senza flash', true) + '</div>' +
          (rd ? '<div class="card" style="margin-top:12px"><div class="row" style="gap:18px">' + gauge(rd.score) + '<div><div class="k">Recupero di oggi</div><h3 style="margin-top:6px">' + readyTxt(rd.score) + '</h3><p class="small muted" style="margin-top:6px">Rispetto alla tua media delle ultime misure.</p></div></div></div>' : '') +
          (r.wave ? '<div class="card" style="margin-top:12px"><h3>Il tuo polso</h3>' + sparkline(r.wave.slice(0, 220)) + '<p class="note" style="margin-top:6px">RMSSD = variabilità tra un battito e l\'altro: più è alta rispetto al tuo solito, più il corpo è recuperato.</p></div>' : '');
      },
      comment: (r) => (r.ready ? (r.ready.score >= 70 ? 'Il tuo corpo è recuperato: oggi puoi allenarti bene.' : r.ready.score >= 45 ? 'Recupero nella media: scalda bene e ascolta le sensazioni.' : 'Recupero basso rispetto al solito: oggi meglio un allenamento leggero.') : 'Misura salvata. Ripetila ogni mattina: dalla quarta misura ti dico come hai recuperato rispetto al solito.'),
    },

    /* ── Reazione e mobilità ── */
    reazione: {
      group: 'Riflessi, mobilità e swing', name: 'Tempo di reazione', full: 'Tempo di reazione', sub: 'tocco o movimento', minutes: 1, place: 'hand',
      options: [{ key: 'mode', label: 'Risposta', values: { tocco: 'Tocco', movimento: 'Movimento' } }],
      defaults: { mode: 'tocco' },
      variant: (o) => o.mode,
      steps: ['Tieni il telefono in mano davanti a te.', 'Quando lo schermo diventa verde e senti il bip, <b>tocca lo schermo</b> (oppure, in modalità Movimento, <b>scatta</b> con il telefono) il più velocemente possibile.', 'Dieci stimoli a intervalli casuali. Se anticipi, la prova si ripete.'],
      metric: { label: 'Mediana', unit: 'ms', d: 0, better: 'low' },
      async run(ctx, o) { return reactionRun(ctx, o.mode); },
      main: (r) => r.median,
      hero: (r) => ({ k: 'Tempo di reazione (mediana)', v: fmt(r.median, 0), unit: 'ms', sub: r.mode === 'movimento' ? 'risposta con il movimento' : 'risposta con il tocco', img: IMG.point }),
      render: (r) => '<div class="grid3">' + stat('Migliore', fmt(r.best, 0), 'ms') + stat('Costanza', '±' + fmt(r.sd, 0), 'ms') + stat('Anticipi', r.falseStarts, '', '', true) + '</div>' +
        '<div class="card" style="margin-top:12px"><div class="row between"><h3>Le ' + r.times.length + ' prove</h3><span class="dim">ms</span></div>' + bars(r.times, { hi: r.times.indexOf(r.best), fmt: (v) => fmt(v, 0), label: 'Tempi di reazione', colors: r.times.map((v) => (v === r.best ? '#4BA6A3' : '#6f6a86')) }) + '</div>' +
        '<p class="note" style="margin-top:14px">Lo schermo e l\'audio del telefono aggiungono qualche decina di millisecondi: confronta sempre prove fatte con lo stesso telefono e la stessa modalità.</p>',
      comment: (r) => (r.falseStarts > 2 ? 'Hai anticipato ' + r.falseStarts + ' volte: aspetta il verde, la velocità arriva con la concentrazione.' : 'Riflessi pronti! Il tempo di reazione cala quando sei stanco: è un buon controllo prima dell\'allenamento.'),
    },
    mobilita: {
      group: 'Riflessi, mobilità e swing', name: 'Mobilità', full: 'Mobilità articolare', sub: 'caviglia, anca, spalla', minutes: 2, place: 'segment',
      options: [{ key: 'joint', label: 'Articolazione', values: { caviglia: 'Caviglia', anca: 'Anca', spalla: 'Spalla', tronco: 'Tronco' } }],
      defaults: { joint: 'caviglia' },
      variant: (o) => o.joint,
      steps: null, // dipendono dall'articolazione (JOINTS)
      metric: { label: 'Angolo', unit: '°', d: 0, better: 'high' },
      async run(ctx, o) {
        const J = JOINTS[o.joint];
        const out = { joint: o.joint };
        const sides = J.sides ? ['sx', 'dx'] : ['c'];
        for (const side of sides) {
          const lato = side === 'c' ? '' : ' ' + legName[side].toLowerCase();
          if (side === 'dx') await ctx.pause(10, 'Cambia lato', 'Ora lato destro. ' + J.place.replace('{lato}', 'destra'));
          else await ctx.prep(10, 'Preparati', J.place.replace('{lato}', side === 'c' ? '' : 'sinistra'));
          const ref = await ctx.record(3, { phase: 'Partenza' + lato, msg: J.start, go: 'Fermo', voice: J.start }, () => SIM.tiltSignal(0, 3, { seed: 1 }).samples);
          const sim = SIM.tiltSignal(J.demo[side === 'dx' ? 1 : 0], 8, { seed: side === 'dx' ? 2 : 3 });
          const s = await ctx.record(8, { phase: 'Al massimo' + lato, msg: J.move + ' e tieni 3 secondi', go: 'Vai', voice: J.move + ' e tieni', cues: [{ at: 5, say: 'Tieni' }] }, () => sim.samples);
          const g0 = ctx.demo ? sim.ref : A.gravity(A.resample(ref.slice(Math.floor(ref.length / 3))));
          const m = A.mobility(s, g0);
          if (!m.ok) throw new Error('Non sei rimasto fermo nella posizione finale: tieni 3 secondi senza muoverti.');
          out[side] = m.angle;
        }
        if (J.sides) out.sym = A.symmetry(out.sx, out.dx);
        return out;
      },
      main: (r) => (r.c != null ? r.c : (r.sx + r.dx) / 2),
      render(r) {
        const J = JOINTS[r.joint];
        const col = (l, v, i) => '<div class="card" style="text-align:center"><div class="k' + (i ? ' p' : '') + '">' + l + '</div><div class="big" style="margin-top:10px">' + fmt(v, 0) + '<small>°</small></div>' +
          '<div class="small ' + (v >= J.ref ? '' : 'dim') + '" style="margin-top:6px;color:' + (v >= J.ref ? 'var(--teal-l)' : '') + '">' + (v >= J.ref ? 'nella norma' : 'sotto il riferimento') + '</div></div>';
        return (r.c != null ? col(J.label, r.c, 0) : '<div class="grid2">' + col('Sinistra', r.sx, 0) + col('Destra', r.dx, 1) + '</div>' +
          '<div class="card" style="margin-top:12px"><div class="row between"><h3>Simmetria</h3><div class="big" style="font-size:34px;color:var(--teal-l)">' + fmt(r.sym, 0) + '%</div></div></div>') +
          '<p class="note" style="margin-top:14px">' + J.label + ': riferimento indicativo ' + J.ref + '° o più. ' + J.note + '</p>';
      },
      comment: (r) => {
        const J = JOINTS[r.joint];
        if (r.c == null && r.sym < 90) return 'C\'è differenza tra destra e sinistra: ripeti la misura dopo il riscaldamento e nelle prossime settimane.';
        return ((r.c != null ? r.c : Math.min(r.sx, r.dx)) >= J.ref ? 'Buona mobilità! ' : 'C\'è margine per migliorare: qualche minuto di mobilità ogni giorno aiuta. ') + 'Ripeti la misura sempre nello stesso modo.';
      },
    },
  };

  // Misure mostrate nel confronto: [etichetta, valore, unità, decimali, meglio]
  const COMPARE = {
    'una-gamba': (r) => [['Area sinistra', r.sx.area, 'cm²', 1, 'low'], ['Area destra', r.dx.area, 'cm²', 1, 'low'], ['Simmetria', r.sym, '%', 0, 'high']],
    'in-piedi': (r) => [['Area occhi aperti', r.open.area, 'cm²', 1, 'low'], ['Area occhi chiusi', r.closed.area, 'cm²', 1, 'low'], ['Romberg', r.romberg, '', 1, 'low']],
    cmj: (r) => [['Salto migliore', r.best, 'cm', 1, 'high'], ['Media dei salti', r.avg, 'cm', 1, 'high'], ['Volo', r.tf * 1000, 'ms', 0, 'high']],
    drop: (r) => [['RSI', r.best, '', 2, 'high'], ['Contatto', r.bestJump.tc * 1000, 'ms', 0, 'low'], ['Altezza', r.bestJump.h, 'cm', 0, 'high']],
    hop: (r) => [['Simmetria', r.lsi, '%', 0, 'high'], ['Sinistra', r.sx.best, 'cm', 1, 'high'], ['Destra', r.dx.best, 'cm', 1, 'high']],
    ripetuti: (r) => [['Potenza', r.power, 'W/kg', 1, 'high'], ['Altezza media', r.avgHeight, 'cm', 1, 'high'], ['Calo per fatica', r.fatigue, '%', 0, 'low']],
    corsa: (r) => [['Cadenza', r.cadence, 'passi/min', 0, null], ['Contatto', r.contact && r.contact * 1000, 'ms', 0, 'low'], ['Oscillazione', r.oscillation, 'cm', 1, 'low'], ['Simmetria', r.symmetry, '%', 0, 'high'], ['Regolarità', r.regularity, '', 2, 'high']],
    plank: (r) => [['Tenuta', r.held, 's', 0, 'high'], ['Tremore', r.shake, 'mm/s²', 0, 'low']],
    reazione: (r) => [['Mediana', r.median, 'ms', 0, 'low'], ['Migliore', r.best, 'ms', 0, 'low'], ['Costanza (±)', r.sd, 'ms', 0, 'low']],
    hrv: (r) => [['RMSSD', r.rmssd, 'ms', 0, 'high'], ['Battito a riposo', r.hr, 'bpm', 0, 'low'], ['SDNN', r.sdnn, 'ms', 0, 'high']],
    swing: (r) => [['Rotazione massima', r.best, '°/s', 0, 'high'], ['Velocità della punta', r.bestKmh, 'km/h', 0, 'high'], ['Media degli swing', r.avg, '°/s', 0, 'high']],
    cooper: (r) => [['Distanza', r.distance, 'm', 0, 'high'], ['VO2max', r.vo2, '', 1, 'high'], ['Velocità media', r.gps.speed * 3.6, 'km/h', 1, 'high']],
    mobilita: (r) => (r.c != null ? [['Angolo', r.c, '°', 0, 'high']] : [['Sinistra', r.sx, '°', 0, 'high'], ['Destra', r.dx, '°', 0, 'high'], ['Simmetria', r.sym, '%', 0, 'high']]),
  };

  const LEVER = { '0.7': 'braccio', '1': 'racchetta', '1.6': 'mazza da golf' };
  Object.assign(TESTS, {
    swing: {
      group: 'Riflessi, mobilità e swing', name: 'Swing', full: 'Velocità dello swing', sub: 'racchetta, mazza, braccio', minutes: 1, place: 'hand',
      options: [{ key: 'lever', label: 'Attrezzo', values: { 0.7: 'Braccio', 1: 'Racchetta', 1.6: 'Mazza da golf' } }],
      defaults: { lever: 1 },
      variant: (o) => LEVER[String(+o.lever)] || '',
      steps: ['Stringi forte il telefono nella mano che colpisce, oppure mettilo in una fascia sul polso. <b>Attenzione a non farlo volare!</b>', 'Spazio libero intorno a te. A ogni segnale fai uno swing completo, veloce come in gara, senza colpire nulla.', 'Cinque swing: col giroscopio misuro la velocità di rotazione e stimo la velocità della punta.'],
      metric: { label: 'Rotazione massima', unit: '°/s', d: 0, better: 'high' },
      async run(ctx, o) {
        await ctx.prep(6, 'Preparati', 'Stringi bene il telefono. Cinque swing, uno a ogni segnale.');
        const s = await ctx.record(15, { phase: 'Cinque swing', msg: 'Swing!', go: 'Vai!', voice: 'Vai!', cues: [3, 6, 9, 12].map((at) => ({ at, say: 'Vai!', beep: true })) },
          () => SIM.swingSignal([1080, 1240, 1170, 1300, 1210], { seed: Date.now() % 50 }));
        const r = A.swings(s, { lever: +o.lever });
        if (!r.ok) throw new Error(r.reason === 'nogyro' ? 'Il tuo telefono non invia i dati del giroscopio: questo test non si può fare.' : 'Non ho visto swing veloci: stringi il telefono e ruota con decisione.');
        r.lever = +o.lever;
        return r;
      },
      main: (r) => r.best,
      hero: (r) => ({ k: 'Rotazione massima', v: fmt(r.best, 0), unit: '°/s', sub: '≈ ' + fmt(r.bestKmh, 0) + ' km/h alla punta (' + (LEVER[String(r.lever)] || '') + ')', img: IMG.point }),
      render: (r) => '<div class="grid3">' + stat('Punta', fmt(r.bestKmh, 0), 'km/h', 'stima') + stat('Media', fmt(r.avg, 0), '°/s') + stat('Swing', r.swings.length, '', '', true) + '</div>' +
        '<div class="card" style="margin-top:12px"><div class="row between"><h3>I tuoi swing</h3><span class="dim">°/s</span></div>' + bars(r.swings.map((x) => x.dps), { hi: r.swings.findIndex((x) => x.dps === r.best), fmt: (v) => fmt(v, 0), label: 'Velocità degli swing' }) + '</div>' +
        '<p class="note" style="margin-top:14px">' + (r.saturated ? 'Lo swing più veloce ha raggiunto il limite del sensore del telefono (circa 2000 °/s): il valore vero può essere più alto. ' : '') + 'La velocità della punta è una stima: rotazione × lunghezza della leva.</p>',
      comment: (r) => 'Il tuo swing più veloce: ' + fmt(r.best, 0) + ' gradi al secondo. Confronta senza e con Elvy: anche la regolarità tra gli swing conta.',
    },
    cooper: {
      group: 'Corsa e core', name: 'Test di Cooper', full: 'Test di Cooper', sub: '12 minuti con il GPS', minutes: 13, place: 'gps',
      options: [], variant: () => '',
      steps: ['All\'aperto, su una pista o un percorso piano con il cielo libero per il GPS.', 'Corri per <b>12 minuti</b> facendo più strada possibile. La voce ti avvisa ogni 3 minuti.', 'Dalla distanza stimo il tuo VO2max (formula di Cooper).'],
      metric: { label: 'Distanza', unit: 'm', d: 0, better: 'high' },
      async run(ctx) {
        await ctx.prep(10, 'Preparati', 'Sei all\'aperto? Attendo il GPS e partiamo.');
        const g = withGps(ctx, true);
        let s;
        try {
          s = await ctx.record(720, { phase: 'Test di Cooper', msg: 'Corri più strada che puoi', go: 'Via!', voice: 'Via! Dodici minuti', clock: true, cues: [180, 360, 540, 660].map((at) => ({ at, say: at === 660 ? 'Ultimo minuto, dai tutto' : (at / 60) + ' minuti' })) },
            () => SIM.runSignal(168, 0.24, 60, { seed: 9, platformSign: S.platformSign }));
        } finally { g.stop(); }
        const tr = A.track(ctx.demo ? SIM.gpsTrack(3.6, 720, { seed: Date.now() % 40 }) : g.points);
        if (!tr.ok) throw new Error('Il GPS non ha registrato il percorso: fai il test all\'aperto, con la posizione attiva per il browser.');
        const run = A.running(s, { platformSign: S.platformSign });
        return { gps: tr, distance: tr.distance, vo2: A.cooperVO2(tr.distance), cadence: run.ok ? run.cadence : null };
      },
      main: (r) => r.distance,
      hero: (r) => ({ k: 'Distanza in 12 minuti', v: fmt(r.distance, 0), unit: 'm', sub: 'VO2max stimato ' + fmt(r.vo2, 1) + ' ml/kg/min', img: IMG.ok }),
      render: (r) => '<div class="grid3">' + stat('Passo', paceTxt(r.gps.pace), '/km') + stat('Velocità', fmt(r.gps.speed * 3.6, 1), 'km/h') + stat('Cadenza', r.cadence ? fmt(r.cadence, 0) : '—', r.cadence ? 'p/min' : '', '', true) + '</div>' +
        (r.gps.splits.length ? '<div class="card" style="margin-top:12px"><div class="row between"><h3>Parziali al km</h3><span class="dim">min</span></div>' + bars(r.gps.splits.map((x) => x / 60), { fmt: (v) => paceTxt(v * 60), label: 'Parziali' }) + '</div>' : '') +
        '<p class="note" style="margin-top:14px">VO2max = (distanza − 504,9) ÷ 44,73. È una stima: dipende anche da percorso, vento e quanto ti sei spinto.</p>',
      comment: (r) => 'Hai percorso ' + fmt(r.distance, 0) + ' metri: VO2max stimato ' + fmt(r.vo2, 1) + '. Rifallo ogni 4-6 settimane sullo stesso percorso.',
    },
  });

  const JOINTS = {
    caviglia: {
      label: 'Caviglia (affondo al muro)', sides: true, ref: 35, demo: [38, 33],
      place: 'Fissa il telefono sulla tibia {lato}, sotto il ginocchio, in verticale, con un elastico o la cintura.',
      start: 'Piede vicino al muro, gamba dritta e ferma', move: 'Porta il ginocchio verso il muro senza staccare il tallone',
      note: 'Misura quanto si inclina la tibia in avanti con il tallone a terra (weight bearing lunge test).',
      steps: ['Fissa il telefono sulla tibia, sotto il ginocchio, in verticale (elastico o cintura Elvy).', 'Partenza: piede davanti a un muro, gamba dritta e ferma per 3 secondi.', 'Al segnale porta il ginocchio in avanti verso il muro <b>senza staccare il tallone</b> e tieni 3 secondi. Poi l\'altra gamba.'],
    },
    anca: {
      label: 'Anca (gamba tesa)', sides: true, ref: 70, demo: [74, 69],
      place: 'Sdraiati a pancia in su e fissa il telefono sulla tibia {lato}.',
      start: 'Gamba distesa a terra, ferma', move: 'Solleva la gamba tesa più in alto che puoi',
      note: 'Elevazione della gamba tesa: dice quanto sono elastici i muscoli posteriori della coscia.',
      steps: ['Sdraiati a pancia in su e fissa il telefono sulla tibia.', 'Partenza: gamba distesa a terra, ferma per 3 secondi.', 'Al segnale solleva la gamba <b>tesa</b> più in alto che puoi e tieni 3 secondi. Poi l\'altra gamba.'],
    },
    spalla: {
      label: 'Spalla (flessione)', sides: true, ref: 160, demo: [168, 171],
      place: 'Prendi il telefono nella mano {lato}, braccio teso lungo il fianco.',
      start: 'Braccio teso lungo il fianco, fermo', move: 'Alza il braccio teso in avanti e in alto più che puoi',
      note: 'Flessione della spalla con il braccio teso: tieni la schiena dritta, senza inarcarla.',
      steps: ['Telefono in mano, con lo schermo verso di te e il braccio teso lungo il fianco.', 'Partenza: fermo per 3 secondi.', 'Al segnale alza il braccio <b>teso</b> in avanti e in alto, più che puoi, e tieni 3 secondi. Poi l\'altro braccio.'],
    },
    tronco: {
      label: 'Tronco (flessione in avanti)', sides: false, ref: 90, demo: [96, 96],
      place: 'Tieni il telefono appoggiato al petto, sullo sterno.',
      start: 'In piedi, dritto e fermo', move: 'Piegati in avanti a gambe tese',
      note: 'Inclinazione del tronco piegandosi in avanti a gambe tese.',
      steps: ['Tieni il telefono appoggiato al petto, sullo sterno.', 'Partenza: in piedi, dritto, fermo per 3 secondi.', 'Al segnale piegati in avanti a <b>gambe tese</b> più che puoi e tieni 3 secondi.'],
    },
  };

  // Prova senza sensore: unisce più tracce simulate una dopo l'altra
  function joinSim(parts) {
    const out = [];
    parts.forEach((p) => { const off = out.length ? out[out.length - 1].t + 10 - p[0].t : 0; p.forEach((q) => out.push({ t: q.t + off, x: q.x, y: q.y, z: q.z })); });
    return out;
  }

  // Plank: il bacino ha ceduto se la gravità dell'ultimo secondo si è spostata di oltre 12°
  function plankBroken(samples) {
    if (samples.length < 120) return false;
    const t1 = samples[samples.length - 1].t;
    const base = samples.filter((s) => s.t - samples[0].t > 1000 && s.t - samples[0].t < 2000);
    const last = samples.filter((s) => t1 - s.t < 1000);
    if (base.length < 10 || last.length < 10) return false;
    const m = (arr) => [A.mean(arr.map((s) => s.x)), A.mean(arr.map((s) => s.y)), A.mean(arr.map((s) => s.z))];
    return A.angleBetween(m(base), m(last)) > 12;
  }

  /* ───────── Confronto senza / con Elvy ───────── */
  // Protocollo Sport di Equistasi: 3 dispositivi, uno su C7 e uno su ogni polpaccio (soleo)
  const PROTO = 'C7 e polpacci';
  const cmpOpen = () => store.get('elvy-cmp', null); // confronto iniziato e non finito
  // Confronti completi di un test (o di tutti): coppie senza / con della stessa sessione
  function sessions(testId) {
    const by = {};
    results().forEach((r) => { if (r.session && (!testId || r.test === testId)) (by[r.session] = by[r.session] || {})[r.cond] = r; });
    return Object.keys(by).map((sid) => ({ sid, s: by[sid].senza, c: by[sid].con })).filter((x) => x.s && x.c)
      .map((x) => Object.assign(x, { t: x.c.t, test: x.c.test }, effect(TESTS[x.c.test], x.s.main, x.c.main))).sort((a, b) => a.t - b.t);
  }
  // Differenza con Elvy rispetto a senza: % e se è un miglioramento
  function effect(t, sv, cv) {
    const pct = sv ? (100 * (cv - sv)) / Math.abs(sv) : 0;
    const good = t.metric.better === 'high' ? pct > 0 : t.metric.better === 'low' ? pct < 0 : null;
    return { pct, good: Math.abs(pct) < 3 ? null : good, same: Math.abs(pct) < 3 };
  }
  const pctTxt = (p) => (p >= 0 ? '+' : '−') + fmt(Math.abs(p), Math.abs(p) < 10 ? 1 : 0) + '%';

  const GROUPS = ['Recupero', 'Equilibrio', 'Salti', 'Corsa e core', 'Riflessi, mobilità e swing'];
  const PURPLE = ['Recupero', 'Riflessi, mobilità e swing']; // gruppi con il titolo viola
  const ROTATION = ['una-gamba', 'cmj', 'drop', 'corsa', 'hop', 'swing', 'plank', 'in-piedi', 'mobilita', 'ripetuti', 'reazione', 'cooper'];

  /* ───────── Esecuzione dei test ───────── */
  function makeRunner(demo) {
    const el = document.createElement('div');
    el.className = 'live';
    el.innerHTML = '<div class="phase"></div><div class="count"></div><div class="msg"></div><div class="meter" hidden><i></i></div><div class="sensor"></div>' +
      '<div class="foot"><button class="btn" type="button" data-stop hidden>Ferma</button><button class="btn danger" type="button" data-abort>Annulla</button></div>';
    document.body.appendChild(el);
    document.body.classList.add('running');
    const $ = (s) => el.querySelector(s);
    let aborted = false; let stopFlag = false;
    $('[data-abort]').onclick = () => { aborted = true; };
    $('[data-stop]').onclick = () => { stopFlag = true; };
    const check = () => { if (aborted) throw new Error('abort'); };
    const set = (phase, count, msg) => {
      if (phase != null) $('.phase').textContent = phase;
      if (count != null) { $('.count').textContent = count; $('.count').classList.toggle('word', isNaN(Number(String(count).replace(':', '')))); }
      if (msg != null) $('.msg').textContent = msg;
    };
    async function wait(ms) { const end = performance.now() + ms; while (performance.now() < end) { check(); await sleep(Math.min(100, end - performance.now())); } check(); }
    async function countdown(sec, phase, msg, voice) {
      set(phase, sec, msg); S.say(voice || msg);
      for (let i = sec; i > 0; i--) { set(null, i); if (i <= 3) S.beep(660, 120); await wait(1000); }
    }
    if (demo) $('.sensor').textContent = 'Dati simulati: prova dell\'app senza sensore';
    return {
      demo, el, set, wait, check,
      prep: countdown,
      pause: countdown,
      // Registra "sec" secondi (o fino a stopWhen / Ferma). In prova restituisce i dati simulati.
      async record(sec, o, simFn) {
        set(o.phase, o.go || 'Via!', o.msg); S.beep(1100, 300); S.say(o.voice || o.go || 'Via');
        const meter = $('.meter'); const bar = meter.querySelector('i'); meter.hidden = false;
        const stopBtn = $('[data-stop]'); stopBtn.hidden = false; stopFlag = false;
        const fired = new Set();
        const show = (left) => set(null, o.clock ? Math.floor(left / 60) + ':' + String(Math.floor(left % 60)).padStart(2, '0') : Math.ceil(left));
        if (demo) {
          const ms = Math.min(sec, 3) * 1000; const t0 = performance.now();
          while (performance.now() - t0 < ms && !stopFlag) { const k = (performance.now() - t0) / ms; bar.style.width = (100 * k).toFixed(1) + '%'; show(sec * (1 - k)); await wait(80); }
          meter.hidden = true; stopBtn.hidden = true; S.beep(1300, 250);
          // dati simulati: piccola variazione casuale (±4% sui tempi) perché due prove non siano mai identiche
          const f = 0.96 + Math.random() * 0.08;
          return simFn().map((q) => Object.assign({}, q, { t: q.t * f }));
        }
        const rec = S.recorder(); rec.start();
        const t0 = performance.now(); let lastCheck = t0;
        await sleep(600); set(null, null, o.msg);
        try {
          for (;;) {
            check();
            const el2 = (performance.now() - t0) / 1000;
            if (el2 >= sec || stopFlag) break;
            show(sec - el2); bar.style.width = (100 * el2 / sec).toFixed(1) + '%';
            for (const c of o.cues || []) if (el2 >= c.at && !fired.has(c)) { fired.add(c); S.beep(c.beep || c.say === 'Salta!' ? 1100 : 880, c.beep ? 300 : 180); if (c.say) S.say(c.say); if (c.msg) set(null, null, c.msg); }
            if (o.stopWhen && performance.now() - lastCheck > 500) { lastCheck = performance.now(); if (o.stopWhen(rec.samples)) break; }
            await sleep(100);
          }
        } finally { rec.stop(); meter.hidden = true; stopBtn.hidden = true; }
        S.beep(1300, 300);
        return rec.samples.slice();
      },
      close() { el.remove(); document.body.classList.remove('running'); S.keepAwake(false); try { speechSynthesis.cancel(); } catch (e) { /* */ } },
    };
  }

  // Tempo di reazione: 10 stimoli a intervalli casuali
  async function reactionRun(ctx, mode) {
    const N = 10; const times = []; let falseStarts = 0;
    await ctx.prep(3, 'Preparati', mode === 'movimento' ? 'Tieni il telefono fermo in mano. Al verde, scatta!' : 'Al verde, tocca lo schermo!');
    const rec = mode === 'movimento' && !ctx.demo ? S.recorder() : null;
    if (rec) rec.start();
    try {
      while (times.length < N) {
        ctx.el.classList.remove('flash');
        ctx.set('Prova ' + (times.length + 1) + ' di ' + N, 'Aspetta…', mode === 'movimento' ? 'Telefono fermo' : 'Non toccare ancora');
        const delay = 1500 + Math.random() * 2500;
        let early = false; let tap = null;
        const onDown = (e) => { if (e.target.closest('[data-abort]')) return; if (!tStim) early = true; else if (tap == null) tap = e.timeStamp > 0 && e.timeStamp <= performance.now() ? e.timeStamp : performance.now(); };
        let tStim = 0;
        ctx.el.addEventListener('pointerdown', onDown);
        const tWait = performance.now();
        try {
          while (performance.now() - tWait < delay && !early) await ctx.wait(20);
          if (rec && A.movedBefore(rec.samples, tWait + 300, performance.now())) early = true;
          if (early) { falseStarts++; ctx.set(null, 'Troppo presto!', 'Aspetta il verde. Ripetiamo.'); S.beep(220, 300); await ctx.wait(1300); continue; }
          ctx.el.classList.add('flash'); tStim = performance.now(); S.beep(1000, 120);
          ctx.set(null, mode === 'movimento' ? 'Scatta!' : 'Tocca!', '');
          let rt = null;
          if (ctx.demo) { await ctx.wait(240 + Math.random() * 80); rt = 220 + Math.random() * 90; } else {
            const tEnd = tStim + 2000;
            while (performance.now() < tEnd) {
              await ctx.wait(10);
              if (mode === 'tocco' && tap != null) { rt = tap - tStim; break; }
              if (rec) { const on = A.motionOnset(rec.samples, tStim); if (on) { rt = on - tStim; break; } }
            }
          }
          ctx.el.classList.remove('flash');
          if (rt == null) { ctx.set(null, 'Troppo lento', 'Ripetiamo.'); await ctx.wait(1000); continue; }
          if (rt < 100) { falseStarts++; ctx.set(null, 'Troppo presto!', 'Ripetiamo.'); await ctx.wait(1000); continue; }
          times.push(rt);
          ctx.set(null, Math.round(rt) + ' ms', ''); await ctx.wait(900);
        } finally { ctx.el.removeEventListener('pointerdown', onDown); }
      }
    } finally { if (rec) rec.stop(); ctx.el.classList.remove('flash'); }
    return { mode, times: times.map((t) => Math.round(t)), median: A.median(times), best: Math.min(...times), sd: A.std(times), falseStarts };
  }

  // ses: { sid, cond } quando il test fa parte di un confronto senza / con Elvy
  async function hrvRun(ctx, o) {
    const DUR = 60;
    const remain = (t0) => Math.max(0, Math.ceil(DUR - (performance.now() - t0) / 1000));
    if (o.src === 'fascia') {
      const rr = []; const off = S.heart.on((x) => { if (x && x.rr) rr.push(...x.rr); });
      try {
        await ctx.prep(3, 'Battito e HRV', 'Resta fermo e respira normalmente per un minuto.');
        const t0 = performance.now();
        while (remain(t0) > 0) { ctx.set(null, remain(t0), S.heart.bpm ? '♥ ' + S.heart.bpm + ' battiti al minuto' : 'In attesa del battito…'); await ctx.wait(250); }
      } finally { off(); }
      const r = A.hrvFromRR(rr);
      if (!r.ok) throw new Error('La fascia o l\'orologio non inviano gli intervalli tra i battiti (RR): per l\'HRV usa la fotocamera.');
      return Object.assign(r, { src: 'fascia' });
    }
    if (ctx.demo) {
      ctx.set('Battito e HRV', '♥', 'Dati simulati'); await ctx.wait(2500);
      const r = A.ppg(SIM.ppgSignal(56 + Math.random() * 12, 35 + Math.random() * 30, 60, { seed: Date.now() % 97 }).frames);
      return Object.assign(r, { src: 'camera', torch: true });
    }
    let cam;
    try { cam = await S.ppgCamera(); } catch (e) { throw new Error(e && e.name === 'NotAllowedError' ? 'Serve il permesso alla fotocamera per misurare il battito.' : 'Non riesco ad aprire la fotocamera.'); }
    const view = document.createElement('div'); view.className = 'ppg-view'; view.appendChild(cam.video);
    ctx.el.insertBefore(view, ctx.el.querySelector('.count'));
    try {
      const tip = cam.torch ? 'Appoggia il polpastrello sulla fotocamera posteriore e sul flash.' : 'Appoggia il dito sulla fotocamera posteriore, vicino a una luce forte.';
      ctx.set('Battito e HRV', '☝', tip); S.say(tip);
      let tw = performance.now();
      while (!cam.finger()) { await ctx.wait(200); if (performance.now() - tw > 30000) throw new Error('Non vedo il dito sulla fotocamera: coprila bene con il polpastrello' + (cam.torch ? ' e anche il flash.' : ', vicino a una luce forte.')); }
      S.beep(880, 150); S.say('Bene. Resta fermo e respira normalmente.');
      let start = cam.frames.length; let t0 = performance.now(); let lostAt = 0; let lastLive = 0;
      while (remain(t0) > 0) {
        await ctx.wait(200);
        if (!cam.finger()) {
          if (!lostAt) lostAt = performance.now();
          ctx.set(null, '☝', 'Rimetti il dito sulla fotocamera');
          if (performance.now() - lostAt > 2500) { // dito tolto: si ricomincia il minuto
            while (!cam.finger()) await ctx.wait(200);
            start = cam.frames.length; t0 = performance.now(); lostAt = 0; S.say('Ricominciamo');
          }
          continue;
        }
        lostAt = 0;
        let live = '';
        if (performance.now() - lastLive > 2000 && cam.frames.length - start > 300) {
          lastLive = performance.now();
          const q = A.ppg(cam.frames.slice(-450), { skip: 0 });
          if (q.ok) live = '♥ ' + Math.round(q.hr) + ' battiti al minuto';
          ctx.el.dataset.live = live || ctx.el.dataset.live || '';
        }
        ctx.set(null, remain(t0), ctx.el.dataset.live || 'Sto leggendo il battito…');
      }
      S.beep(1300, 300);
      const r = A.ppg(cam.frames.slice(start));
      if (!r.ok) throw new Error('Il segnale del battito non è chiaro: tieni il dito fermo, appoggiato senza premere troppo, e riprova.');
      return Object.assign(r, { src: 'camera', torch: cam.torch });
    } finally { cam.stop(); view.remove(); }
  }

  async function startTest(id, opts, ses) {
    const test = TESTS[id];
    S.unlockAudio();
    let demo = false;
    if (test.noMotion) {
      if (opts.src === 'fascia') {
        if (!S.heart.connected()) { renderTest(id, 'Collega prima la fascia cardio o l\'orologio dal Profilo (Orologio e fascia cardio).'); return; }
      } else {
        const cams = navigator.mediaDevices && navigator.mediaDevices.enumerateDevices ? (await navigator.mediaDevices.enumerateDevices().catch(() => [])).filter((d) => d.kind === 'videoinput') : [];
        if (!cams.length) { demo = await askDemo(true, 'Non trovo la fotocamera. Usa l\'app dal telefono.'); if (!demo) return; }
      }
    } else if (id !== 'reazione' || opts.mode === 'movimento') {
      const perm = await S.permission();
      const p = perm ? await S.probe(900) : { ok: false };
      if (!p.ok) {
        demo = await askDemo(perm);
        if (!demo) return;
      }
    }
    await S.keepAwake(true);
    const ctx = makeRunner(demo);
    // battito dalla fascia o dall'orologio Bluetooth durante il test, se collegati
    const hrs = []; const off = S.heart.connected() ? S.heart.on((x) => { if (x) hrs.push(x); }) : null;
    try {
      const res = await test.run(ctx, opts);
      ctx.close();
      if (off) off();
      if (hrs.length > 5 && id !== 'hrv') {
        const b = hrs.map((x) => x.bpm).filter((v) => v > 30);
        res.hrLive = { avg: A.mean(b), max: Math.max(...b), min: Math.min(...b), series: b.filter((_, i) => i % Math.max(1, Math.floor(b.length / 120)) === 0) };
      }
      if (id === 'hrv' && res.lnrmssd) {
        const hist = results().filter((r) => r.test === 'hrv' && r.res && r.res.lnrmssd).slice(-14).map((r) => r.res.lnrmssd);
        res.ready = A.readinessHRV(res.lnrmssd, hist);
      }
      const cond = ses ? ses.cond : device.on ? 'con' : 'senza';
      const rec = { id: Date.now(), t: Date.now(), test: id, cond, where: cond === 'con' ? device.where || PROTO : null, variant: test.variant(opts), opts, demo, main: test.main(res), res, session: ses ? ses.sid : null };
      const all = results(); all.push(rec); saveResults(all);
      if (ses && cond === 'con') store.set('elvy-cmp', null);
      const to = ses ? '#/confronto/' + ses.sid : '#/r/' + rec.id;
      if (location.hash === to) route(); else location.hash = to; // il passo 3 parte dalla stessa pagina del confronto
    } catch (e) {
      ctx.close(); if (off) off();
      if (e.message !== 'abort') { S.say('Non ci sono riuscito'); renderTest(id, e.message); }
    }
  }
  const spoken = (test, r) => test.metric.label + ' ' + fmt(r.main, test.metric.d).replace('.', '') + ' ' + (test.metric.unit === 'cm²' ? 'centimetri quadrati' : test.metric.unit === 'cm' ? 'centimetri' : test.metric.unit === 'ms' ? 'millisecondi' : test.metric.unit === 's' ? 'secondi' : test.metric.unit === '°' ? 'gradi' : test.metric.unit === '%' ? 'per cento' : '');

  function askDemo(perm, why) {
    return new Promise((resolve) => {
      openSheet('<h2>Il sensore non risponde</h2><p class="muted" style="margin-top:10px">' + (why || (perm ? 'Non arrivano dati dall\'accelerometro. Usa l\'app dal telefono (non dal computer).' : 'Serve il permesso ai sensori di movimento: consentilo quando il telefono lo chiede.')) + '</p>' +
        '<p class="muted" style="margin-top:10px">Vuoi vedere come funziona il test con <b>dati simulati</b>? Il risultato viene segnato come prova.</p>' +
        '<div class="actions"><button class="btn" data-demo>Prova con dati simulati</button><button class="btn ghost" data-close>Annulla</button></div>');
      $sheet.querySelector('[data-demo]').onclick = () => { closeSheet(); resolve(true); };
      $sheet.querySelector('[data-close]').onclick = () => { closeSheet(); resolve(false); };
    });
  }

  /* ───────── Foglio dal basso ───────── */
  function openSheet(html) { $sheet.innerHTML = '<div class="sheet" role="dialog" aria-modal="true">' + html + '</div>'; $sheet.hidden = false; }
  function closeSheet() { $sheet.hidden = true; $sheet.innerHTML = ''; }
  $sheet.addEventListener('click', (e) => { if (e.target === $sheet) closeSheet(); });

  // Elvy applicato: dove e da quanto
  const WHERE = [PROTO, 'Polpacci', 'C7 (base del collo)', 'Caviglia', 'Ginocchio', 'Coscia', 'Zona lombare', 'Spalla', 'Altro punto'];
  function elvySheet() {
    let pick = device.where || PROTO;
    const draw = () => openSheet('<div class="row" style="gap:14px"><img src="' + IMG.point + '" alt="" style="width:70px;border-radius:14px"><div><h2>Elvy applicato?</h2><p class="muted small" style="margin-top:4px">I test di adesso vengono segnati «con Elvy» o «senza Elvy».</p></div></div>' +
      (device.on ? '<div class="card" style="margin-top:16px;background:var(--teal-d)"><b style="color:var(--teal-l)">Applicato: ' + esc(device.where || '') + '</b><div class="small" style="color:#cfeeed;margin-top:4px">da ' + durText(minsSince(device.since)) + '</div></div>' : '') +
      '<h3 style="margin-top:18px">Dove l\'hai applicato?</h3><div class="chips">' + WHERE.map((w) => '<button type="button" data-w="' + w + '" aria-pressed="' + (pick === w) + '">' + w + '</button>').join('') + '</div>' +
      '<p class="note" style="margin-top:12px">Protocollo Sport di Equistasi: un dispositivo sulla settima vertebra cervicale (C7) e uno su ogni polpaccio, sopra il tendine d\'Achille. Massimo 4 ore al giorno, 5 giorni a settimana.</p>' +
      '<div class="actions"><button class="btn" data-on' + (pick ? '' : ' disabled') + '>' + (device.on ? 'Aggiorna' : 'Ho applicato Elvy') + '</button>' +
      (device.on ? '<button class="btn ghost" data-off>Ho tolto Elvy</button>' : '<button class="btn ghost" data-close>Chiudi</button>') + '</div>');
    draw();
    const bind = () => {
      $sheet.querySelectorAll('[data-w]').forEach((b) => { b.onclick = () => { pick = b.dataset.w; draw(); bind(); }; });
      const on = $sheet.querySelector('[data-on]'); if (on) on.onclick = () => { if (!device.on) device.since = Date.now(); device.on = true; device.where = pick; saveDevice(); closeSheet(); route(); };
      const off = $sheet.querySelector('[data-off]'); if (off) off.onclick = () => { device.on = false; device.since = null; saveDevice(); closeSheet(); route(); };
      const cl = $sheet.querySelector('[data-close]'); if (cl) cl.onclick = closeSheet;
    };
    bind();
  }
  const elvyPill = () => '<button class="pill' + (device.on ? ' on' : '') + '" type="button" data-elvy>' + ICON.nfc + (device.on ? 'Elvy applicato' : 'Senza Elvy') + '</button>';

  /* ───────── Schermate ───────── */
  function setTab(tab) { document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab)); }
  function bindCommon() {
    $app.querySelectorAll('[data-elvy]').forEach((b) => { b.onclick = elvySheet; });
    $app.querySelectorAll('[data-back]').forEach((b) => { b.onclick = () => (history.length > 1 ? history.back() : (location.hash = '#/test')); });
    bindTalks($app);
  }
  const backBtn = () => '<button class="back" type="button" data-back aria-label="Indietro">' + ICON.back + '</button>';
  const lastOf = (id) => results().filter((r) => r.test === id).slice(-1)[0];

  // Forma di oggi: salto verticale di oggi rispetto alla tua media
  function readiness() {
    const cmj = results().filter((r) => r.test === 'cmj');
    const today = cmj.filter((r) => isToday(r.t)).slice(-1)[0];
    if (!today) return null;
    const before = cmj.filter((r) => !isToday(r.t)).slice(-10).map((r) => r.main);
    if (before.length < 2) return { first: true, rec: today };
    const ratio = today.main / A.mean(before);
    const score = Math.max(0, Math.min(100, 100 - (1 - ratio) * 250));
    return { score, ratio, rec: today, base: A.mean(before) };
  }

  function renderOggi() {
    setTab('oggi');
    if (!profile.welcomed) return renderWelcome();
    const all = results();
    const rd = readiness();
    let card;
    if (rd && !rd.first) {
      const txt = rd.score >= 85 ? 'Pronto per allenarti' : rd.score >= 65 ? 'Nella media: scalda bene' : 'Gambe stanche: oggi vai leggero';
      card = '<div class="card"><div class="row between"><span class="k">Forma di oggi</span><span class="small dim">salto delle ' + timeShort(rd.rec.t) + '</span></div>' +
        '<div class="row" style="margin-top:14px;gap:18px">' + gauge(rd.score) + '<div><h2 style="font-size:21px">' + txt + '</h2><p class="muted" style="margin-top:8px"><b style="color:#fff;font-size:19px">' + fmt(rd.rec.main, 1) + '</b> cm oggi · <b style="color:#fff;font-size:19px">' + fmt(rd.base, 1) + '</b> cm di solito</p></div></div></div>';
    } else {
      card = '<div class="card"><span class="k">Forma di oggi</span><h2 style="margin-top:10px;font-size:21px">' + (rd && rd.first ? 'Prima misura salvata' : 'Come stanno le gambe?') + '</h2>' +
        '<p class="muted" style="margin-top:6px">' + (rd && rd.first ? 'Fai il salto di controllo anche nei prossimi giorni: dal terzo ti dico come sei messo rispetto al solito.' : 'Tre salti appena sveglio o prima dell\'allenamento: confrontati con la tua media e scopri se sei fresco o affaticato.') + '</p>' +
        (rd && rd.first ? '' : '<a class="btn small" style="margin-top:14px" href="#/test/cmj">Salto di controllo · 1 min</a>') + '</div>';
    }
    // recupero di oggi dall'HRV (fotocamera o fascia)
    const hv = all.filter((r) => r.test === 'hrv' && isToday(r.t)).slice(-1)[0];
    const rec = hv ? '<a class="card" href="#/r/' + hv.id + '" style="display:block;color:#fff;margin-bottom:14px"><div class="row between"><span class="k">Recupero di oggi</span><span class="small dim">misura delle ' + timeShort(hv.t) + '</span></div>' +
      '<div class="row" style="margin-top:14px;gap:18px">' + (hv.res.ready ? gauge(hv.res.ready.score) : '') + '<div><h2 style="font-size:21px">' + (hv.res.ready ? readyTxt(hv.res.ready.score) : 'Prima misure salvate') + '</h2><p class="muted" style="margin-top:8px"><b style="color:#fff;font-size:19px">' + fmt(hv.res.rmssd, 0) + '</b> ms HRV · <b style="color:#fff;font-size:19px">' + fmt(hv.res.hr, 0) + '</b> bpm a riposo</p></div></div></a>'
      : '<div class="card" style="margin-bottom:14px"><span class="k">Recupero di oggi</span><h2 style="margin-top:10px;font-size:21px">Come hai recuperato?</h2><p class="muted" style="margin-top:6px">Un minuto con il dito sulla fotocamera, appena sveglio: battito e HRV ti dicono se oggi sei pronto.</p><a class="btn small" style="margin-top:14px" href="#/test/hrv">Misura il recupero · 1 min</a></div>';
    // consiglio: il test fatto meno di recente
    const lastT = (id) => { const r = lastOf(id); return r ? r.t : 0; };
    const sug = ROTATION.slice().sort((a, b) => lastT(a) - lastT(b))[0];
    const st = TESTS[sug];
    const recent = []; all.slice().reverse().forEach((r) => { if (!recent.find((x) => x.test === r.test) && TESTS[r.test]) recent.push(r); });
    // cosa dice Elvy oggi
    const h = new Date().getHours();
    const hi = (h < 12 ? 'Buongiorno' : h < 18 ? 'Ciao' : 'Buonasera') + (profile.name ? ' ' + esc(profile.name) : '') + '! ';
    const open = cmpOpen(); const ot = open && TESTS[open.test];
    const sess = sessions(); const lastS = sess[sess.length - 1];
    const long = device.on && minsSince(device.since) > 240;
    const line = long ? 'Hai Elvy addosso da più di 4 ore: il protocollo dice di toglierlo. Riposati e riprendiamo domani.'
      : ot ? 'Abbiamo un confronto a metà: ' + ot.full.toLowerCase() + '. Applica Elvy e facciamo il test con Elvy.'
      : !sess.length ? 'Facciamo il primo confronto? Lo stesso test prima senza Elvy e poi con Elvy: così vediamo se cambia qualcosa per te.'
      : 'Oggi ti propongo ' + st.full.toLowerCase() + ', senza e con Elvy. Ogni confronto rende più chiara la tua tendenza.';
    const autoSay = store.get('elvy-said', '') !== new Date().toDateString();
    if (autoSay) store.set('elvy-said', new Date().toDateString());
    $app.innerHTML = brand() + '<div class="top"><div><div class="date">' + cap(dateLong(Date.now())) + '</div><h1>Ciao' + (profile.name ? ', ' + esc(profile.name) : '') + '</h1></div></div>' +
      talk(long ? IMG.point : IMG.hi, hi + line, autoSay) +
      '<div class="row" style="margin:14px 0">' + elvyPill() + (device.on ? '<span class="small muted">' + esc(device.where) + ' · da ' + durText(minsSince(device.since)) + '</span>' : '') + '</div>' +
      (ot ? '<a class="card cmp-open" href="#/confronto/' + open.sid + '"><div class="k p">Confronto in corso · passo 2 di 3</div><h3 style="margin-top:6px">' + ot.full + '</h3><p class="small muted" style="margin-top:4px">Fatto senza Elvy. Ora applica Elvy e ripeti il test.</p><span class="btn small" style="margin-top:12px">Continua</span></a>' : '') +
      (lastS ? '<a class="card cmp-last" href="#/confronto/' + lastS.sid + '"><div class="row between"><div><div class="k">Ultimo confronto</div><h3 style="margin-top:6px">' + TESTS[lastS.test].full + '</h3><p class="small muted" style="margin-top:4px">' + fmt(lastS.s.main, TESTS[lastS.test].metric.d) + ' senza · ' + fmt(lastS.c.main, TESTS[lastS.test].metric.d) + ' con Elvy ' + TESTS[lastS.test].metric.unit + '</p></div>' +
        '<span class="delta ' + (lastS.good ? '' : lastS.good === false ? 'neg' : 'neu') + '">' + pctTxt(lastS.pct) + '</span></div></a>' : '') +
      rec + card +
      '<div class="card hero" style="margin-top:14px;padding:0;padding-right:18px"><img src="' + IMG.point + '" alt="" style="width:34%;max-width:150px;border-radius:0;align-self:stretch" /><div style="padding:18px 0 18px 0"><div class="k p">Oggi ti consiglio</div><h3 style="margin-top:8px;font-size:20px;line-height:1.25">' + st.full + ', ' + st.sub + '</h3>' +
      '<a class="btn small" style="margin-top:14px" href="#/test/' + sug + '">Senza e con Elvy · ' + (st.minutes * 2 + 1) + ' min</a></div></div>' +
      '<div class="row between sec"><h2>Ultimi risultati</h2><a href="#/test" style="font-weight:700">Tutti i test</a></div>' +
      (recent.length ? '<div class="grid3">' + recent.slice(0, 3).map((r) => { const t = TESTS[r.test]; return '<a class="stat" href="#/r/' + r.id + '" style="color:#fff"><div class="l">' + t.name + '</div><div class="v">' + fmt(r.main, t.metric.d) + '</div><div class="s' + (r.cond === 'con' ? '' : ' p') + '">' + (t.metric.unit || t.metric.label) + ' · ' + (r.cond === 'con' ? 'con Elvy' : 'senza') + '</div></a>'; }).join('') + '</div>' :
        '<p class="muted">Ancora nessun test. Scegline uno: ti spiego cosa fare, conto il tempo e ti dico com\'è andata.</p>');
    bindCommon();
  }

  function renderWelcome() {
    document.body.classList.add('gated'); // niente barra in basso finché non si è presentati
    $app.innerHTML = '<div style="text-align:center;margin-top:10px"><img src="img/logo-elvy.png" alt="Elvy" style="width:150px" /></div>' +
      '<div style="margin-top:18px">' + talk(IMG.hi, 'Ciao! Sono <b>Elvy</b>, il tuo allenatore. Con i sensori del telefono misuriamo equilibrio, salti, corsa e riflessi. Ogni test lo facciamo <b>prima senza Elvy e poi con Elvy</b>, e nei progressi vediamo come cambi.', true) + '</div>' +
      '<div class="card" style="margin-top:18px"><h3>Come ti chiami?</h3>' +
      '<label class="field"><span>Nome</span><input id="w-name" autocomplete="given-name" maxlength="30" /></label>' +
      '<label class="field"><span>Sport</span><input id="w-sport" placeholder="es. calcio, corsa, tennis" maxlength="40" /></label>' +
      '<label class="field"><span>Peso (kg) · per stimare la potenza</span><input id="w-mass" type="number" inputmode="decimal" min="25" max="200" /></label>' +
      '<label class="check"><input type="checkbox" id="w-ok" /><span>Ho capito: i risultati sono stime per l\'allenamento e non hanno valore medico. Le misure restano sul mio telefono.</span></label>' +
      '<div class="actions"><button class="btn" id="w-go" disabled>Iniziamo</button></div></div>';
    const ok = document.getElementById('w-ok'); const go = document.getElementById('w-go');
    ok.onchange = () => { go.disabled = !ok.checked; };
    bindTalks($app);
    go.onclick = () => {
      profile.name = document.getElementById('w-name').value.trim();
      profile.sport = document.getElementById('w-sport').value.trim();
      const m = parseFloat(document.getElementById('w-mass').value); profile.mass = m >= 25 && m <= 200 ? m : null;
      profile.welcomed = true; saveProfile(); document.body.classList.remove('gated'); renderOggi();
    };
  }

  function renderTests() {
    setTab('test');
    $app.innerHTML = brand() + '<div class="top" style="align-items:center"><h1>Test</h1>' + elvyPill() + '</div>' +
      '<p class="muted">' + (device.on ? 'I test di adesso vengono segnati in automatico «con Elvy».' : 'Applica Elvy e tocca il pulsante: i test verranno segnati «con Elvy».') + '</p>' +
      GROUPS.map((g) => '<div class="k' + (PURPLE.includes(g) ? ' p' : '') + ' sec">' + g + '</div><div class="tiles">' +
        Object.keys(TESTS).filter((k) => TESTS[k].group === g).map((k) => {
          const t = TESTS[k]; const l = lastOf(k);
          return '<a class="tile" href="#/test/' + k + '"><b>' + t.name + '</b><span>' + t.sub + '</span>' + (l ? '<em>' + fmt(l.main, t.metric.d) + ' ' + t.metric.unit + ' · ' + dateShort(l.t) + '</em>' : '') + '</a>';
        }).join('') + '</div>').join('') +
      '<div class="k p sec">Video</div><div class="tiles"><a class="tile" href="#/video"><b>Video analisi</b><span>rallentatore e riconoscimento del corpo</span></a>' +
      '<a class="tile" href="#/profilo"><b>Orologio e fascia</b><span>' + (S.heart.connected() ? '♥ ' + esc(S.heart.name()) + ' collegato' : 'battito durante i test') + '</span></a></div>' +
      '<p class="note" style="margin-top:22px">I test usano accelerometro, giroscopio, fotocamera e GPS del telefono. Per equilibrio, salti, corsa e plank il telefono va nella cintura Elvy, vicino al baricentro: le misure sono più ripetibili.</p>';
    bindCommon();
  }

  function renderTest(id, error) {
    const t = TESTS[id];
    if (!t) return renderTests();
    setTab('test');
    const o = Object.assign({}, t.defaults || {}, prefs[id] || {});
    const steps = id === 'mobilita' ? JOINTS[o.joint].steps : t.steps;
    const place = t.place === 'belt' ? placeBox('belt', BELT_TEXT) : t.place === 'hand' ? placeBox('hand', id === 'swing' ? 'Telefono <b>ben stretto nella mano</b> che colpisce, o in una fascia sul polso.' : 'Telefono <b>in mano</b>, davanti a te.') :
      t.place === 'finger' ? placeBox('finger', o.src === 'fascia' ? 'Fascia cardio o orologio collegati via <b>Bluetooth</b> (dal Profilo).' : 'Polpastrello dell\'indice <b>sulla fotocamera posteriore</b> e sul flash, senza premere.') :
      t.place === 'gps' ? placeBox('gps', '<b>All\'aperto</b>, con il GPS attivo. Telefono in cintura o in mano.') :
      placeBox(o.joint === 'tronco' ? 'chest' : o.joint === 'spalla' ? 'hand' : 'leg', JOINTS[o.joint].place.replace(' {lato}', '').replace('{lato}', ''));
    const prev = results().filter((r) => r.test === id);
    const open = cmpOpen(); const mine = open && open.test === id;
    $app.innerHTML = '<div class="head">' + backBtn() + '<div><div class="k">' + t.group + '</div><h1>' + t.full + '</h1></div></div>' +
      '<div class="stack">' + talk(t.group === 'Salti' ? IMG.jump : IMG.point, INTRO[id] + (mine ? ' Il test senza Elvy l\'hai già fatto: ora applica Elvy e continua.' : ' Facciamolo prima senza Elvy e poi con Elvy.'), true) +
      (mine ? '<a class="card cmp-open" href="#/confronto/' + open.sid + '"><div class="k p">Confronto in corso · passo 2 di 3</div><p class="small muted" style="margin-top:4px">Fatto senza Elvy alle ' + timeShort(open.t) + '.</p><span class="btn small" style="margin-top:12px">Continua il confronto</span></a>' : '') +
      (t.options.length ? '<div class="card stack">' + t.options.map((op) => '<div><div class="small muted" style="font-weight:700;margin-bottom:6px">' + op.label + '</div><div class="seg">' +
        Object.keys(op.values).map((v) => '<button type="button" data-opt="' + op.key + '" data-val="' + v + '" aria-pressed="' + (String(o[op.key]) === v) + '">' + op.values[v] + '</button>').join('') + '</div></div>').join('') + '</div>' : '') +
      place +
      '<div class="card"><h3 style="margin-bottom:12px">Come si fa</h3><ol class="steps">' + steps.map((s) => '<li>' + s + '</li>').join('') + '</ol>' +
      '<p class="small muted">Dura circa ' + t.minutes + ' min. La voce ti guida: alza il volume.</p></div>' +
      '<div class="card"><h3>Il confronto in 3 passi</h3>' + stepper(0) + '<p class="small muted">Stesso test, stesse condizioni: prima senza Elvy, poi applichi i dispositivi e lo ripeti. Alla fine vedi la differenza.</p></div>' +
      SAFE + '</div>' +
      (error ? '<p class="err" role="alert">' + esc(error) + '</p>' : '') +
      '<div class="actions"><button class="btn" id="go-cmp">Inizia il confronto</button>' +
      '<button class="btn ghost" id="go">Solo una prova ' + (device.on ? 'con Elvy' : 'senza Elvy') + '</button>' +
      (prev.length ? '<a class="btn ghost" href="#/progressi/' + id + '">I tuoi progressi (' + prev.length + ')</a>' : '') + '</div>';
    $app.querySelectorAll('[data-opt]').forEach((b) => { b.onclick = () => { prefs[id] = Object.assign({}, prefs[id], { [b.dataset.opt]: b.dataset.val }); savePrefs(); renderTest(id); }; });
    document.getElementById('go').onclick = () => startTest(id, Object.assign({}, t.defaults || {}, prefs[id] || {}));
    document.getElementById('go-cmp').onclick = () => beginCompare(id, Object.assign({}, t.defaults || {}, prefs[id] || {}));
    bindCommon();
  }

  function deltaHtml(t, r) {
    const prev = results().filter((x) => x.test === r.test && x.variant === r.variant && x.id < r.id).slice(-1)[0];
    if (!prev) return '<span class="delta neu">prima misura</span>';
    const d = r.main - prev.main;
    const good = t.metric.better === 'high' ? d > 0 : t.metric.better === 'low' ? d < 0 : null;
    const cls = Math.abs(d) < Math.pow(10, -t.metric.d) ? 'neu' : good == null ? 'neu' : good ? '' : 'neg';
    return '<span class="delta ' + cls + '">' + (d >= 0 ? '+' : '−') + fmt(Math.abs(d), t.metric.d) + (t.metric.unit && t.metric.unit !== '%' ? ' ' + t.metric.unit : t.metric.unit) + ' dall\'ultima volta</span>';
  }

  function renderResult(rid) {
    const r = results().find((x) => String(x.id) === String(rid));
    if (!r || !TESTS[r.test]) return renderTests();
    const t = TESTS[r.test];
    setTab('test');
    const h = t.hero ? t.hero(r.res) : { k: t.metric.label, v: fmt(r.main, t.metric.d), unit: t.metric.unit, sub: '' };
    const img = h.img || (r.test === 'cmj' || r.test === 'ripetuti' ? IMG.jump : IMG.ok);
    const sub = [r.variant, r.cond === 'con' && r.where ? 'Elvy: ' + r.where.toLowerCase() : ''].filter(Boolean).join(' · ');
    const hero = h.chart ?
      '<div class="card"><div class="row between small muted"><span>' + h.k + '</span><span>' + (isToday(r.t) ? 'oggi' : dateShort(r.t)) + ' ' + timeShort(r.t) + '</span></div><div class="big" style="margin-top:12px;font-size:76px">' + h.v + '<small>' + h.unit + '</small></div>' + deltaHtml(t, r) + '<div style="margin-top:14px">' + h.chart + '</div></div>' :
      '<div class="card hero"><div><div class="k" style="color:var(--muted)">' + h.k + '</div><div class="big" style="margin-top:10px;font-size:72px">' + h.v + (h.unit ? '<small>' + h.unit + '</small>' : '') + '</div>' + deltaHtml(t, r) +
      (h.sub ? '<p class="muted" style="margin-top:12px">' + h.sub + '</p>' : '') + '</div><img src="' + img + '" alt="" /></div>';
    $app.innerHTML = '<div class="head">' + backBtn() + '<div><div class="k">' + esc(t.group + (r.variant ? ' · ' + r.variant : '')) + '</div><h1>' + t.full + '</h1></div></div>' +
      '<div class="row" style="gap:8px;margin:-6px 0 12px">' + (r.cond === 'con' ? '<span class="tag con">con Elvy</span>' : '<span class="tag">senza Elvy</span>') + (r.demo ? '<span class="tag demo">dati simulati</span>' : '') + '<span class="small dim">' + esc(sub) + '</span></div>' +
      (['una-gamba', 'in-piedi', 'hop', 'mobilita'].includes(r.test) ? '' : hero + '<div style="height:12px"></div>') +
      t.render(r.res) +
      (r.res.hrLive ? '<div class="card" style="margin-top:12px"><div class="row between"><h3>Battito durante il test</h3><span class="dim">fascia/orologio</span></div><div class="grid3" style="margin-top:10px">' + stat('Media', fmt(r.res.hrLive.avg, 0), 'bpm') + stat('Massimo', fmt(r.res.hrLive.max, 0), 'bpm') + stat('Minimo', fmt(r.res.hrLive.min, 0), 'bpm', '', true) + '</div>' + sparkline(r.res.hrLive.series) + '</div>' : '') +
      '<div style="margin-top:18px">' + talk(r.test === 'cmj' ? IMG.jump : IMG.ok, cap(spoken(t, r).trim()) + '. ' + t.comment(r.res), isToday(r.t) && Date.now() - r.t < 60000) + '</div>' +
      '<div class="actions">' + (r.session ? '<a class="btn" href="#/confronto/' + r.session + '">Torna al confronto</a>' : '<button class="btn" id="again">Confronto senza e con Elvy</button>') +
      '<a class="btn ghost" href="#/progressi/' + r.test + '">Vedi i progressi</a></div>';
    const ag = document.getElementById('again'); if (ag) ag.onclick = () => { location.hash = '#/test/' + r.test; };
    bindCommon();
  }

  // Passo 1: senza Elvy (se l'hai addosso, toglilo)
  function beginCompare(id, opts) {
    const t = TESTS[id];
    openSheet(stepper(0) + talk(IMG.point, 'Passo uno: il test <b>senza Elvy</b>. ' + (device.on ? 'Prima togli i dispositivi Elvy che hai addosso. ' : 'Se hai addosso i dispositivi Elvy, toglili. ') + 'Poi tocca Inizia e segui la mia voce.', true) +
      '<div class="actions"><button class="btn" data-go>Inizia senza Elvy</button><button class="btn ghost" data-close>Annulla</button></div>');
    bindTalks($sheet);
    $sheet.querySelector('[data-close]').onclick = closeSheet;
    $sheet.querySelector('[data-go]').onclick = () => {
      closeSheet();
      if (device.on) { device.on = false; device.since = null; saveDevice(); }
      const sid = 'c' + Date.now();
      store.set('elvy-cmp', { sid, test: id, opts, t: Date.now() });
      startTest(id, opts, { sid, cond: 'senza' });
    };
    void t;
  }

  function renderCompare(sid) {
    const mine = results().filter((r) => r.session === sid);
    const sr = mine.filter((r) => r.cond === 'senza').slice(-1)[0];
    const cr = mine.filter((r) => r.cond === 'con').slice(-1)[0];
    if (!sr) return renderTests();
    const t = TESTS[sr.test]; const m = t.metric;
    const val = (r) => fmt(r.main, m.d) + (m.unit ? ' ' + m.unit : '');
    setTab('test');
    const head = '<div class="head">' + backBtn() + '<div><div class="k">Confronto' + (sr.variant ? ' · ' + esc(sr.variant) : '') + '</div><h1>' + t.full + '</h1></div></div>';

    if (!cr) {
      // Passo 2: applica Elvy secondo il protocollo Sport, poi stesso test
      const open = cmpOpen();
      const opts = open && open.sid === sid ? open.opts : sr.opts;
      $app.innerHTML = head + stepper(1) +
        '<div class="card row between"><div><div class="small muted">Senza Elvy</div><div class="big" style="font-size:34px;margin-top:4px">' + fmt(sr.main, m.d) + '<small>' + m.unit + '</small></div></div><span class="tag">' + m.label + '</span></div>' +
        '<div style="margin-top:14px">' + talk(IMG.point, 'Fatto! Senza Elvy: ' + val(sr) + '. Ora applica i tre dispositivi: uno sulla <b>settima vertebra cervicale</b>, alla base del collo, e uno su <b>ogni polpaccio</b>, sopra il tendine d\'Achille. Poi rifacciamo lo stesso test.', true) + '</div>' +
        '<div class="card apply"><h3>Applica Elvy</h3><div class="apply-row">' + BODY_BACK + '<ol class="steps"><li><b>C7</b>: la vertebra che sporge alla base del collo quando pieghi la testa.</li><li><b>Polpacci</b> (tricipite della sura): parte bassa, sul soleo, sopra il tendine d\'Achille.</li><li>Pelle pulita e asciutta, fissa con il cerotto trasparente.</li></ol></div>' +
        '<p class="note">Il protocollo Sport consiglia di indossare Elvy prima dell\'attività. Per un confronto corretto ripeti il test nelle stesse condizioni: stesso posto, stesse scarpe, stessa posizione del telefono.</p></div>' +
        '<div class="actions"><button class="btn" id="cmp-on">Ho applicato Elvy · passo 3</button><a class="btn ghost" href="#/oggi">Lo faccio più tardi</a><a class="small" href="#/r/' + sr.id + '" style="text-align:center">Dettagli del test senza Elvy</a></div>';
      document.getElementById('cmp-on').onclick = () => {
        device.on = true; device.where = PROTO; device.since = device.since || Date.now(); saveDevice();
        startTest(sr.test, opts, { sid, cond: 'con' });
      };
      return bindCommon();
    }

    // Passo 3 fatto: confronto
    const ef = effect(t, sr.main, cr.main);
    const col = ef.good ? 'good' : ef.good === false ? 'bad' : 'same';
    const max = Math.max(sr.main, cr.main) || 1;
    const rows = (COMPARE[sr.test] ? COMPARE[sr.test](sr.res).map((x, i) => [x, COMPARE[sr.test](cr.res)[i]]) : []).filter(([a, b]) => a[1] != null && b[1] != null && isFinite(a[1]) && isFinite(b[1]));
    const verdict = m.better == null
      ? 'Con Elvy la tua ' + m.label.toLowerCase() + ' è passata da ' + val(sr) + ' a ' + val(cr) + '. Guarda anche contatto a terra e simmetria qui sotto.'
      : ef.same ? 'Risultato quasi uguale: ' + val(sr) + ' senza Elvy e ' + val(cr) + ' con Elvy. La risposta è personale: ripeti il confronto in altri giorni e guarda la tendenza.'
      : ef.good ? 'Con Elvy è andata meglio! ' + m.label + ' da ' + val(sr) + ' a ' + val(cr) + ', ' + pctTxt(ef.pct).replace('−', 'meno ') + '. Ripeti il confronto nei prossimi giorni per confermarlo.'
      : 'Questa volta con Elvy è andata un po\' peggio: da ' + val(sr) + ' a ' + val(cr) + '. Può dipendere dalla stanchezza o dal riscaldamento: ripeti il confronto un altro giorno.';
    $app.innerHTML = head + stepper(3) +
      '<div class="card vs ' + col + '"><div class="vs-cols">' +
      '<div><div class="small muted">Senza Elvy</div><div class="big">' + fmt(sr.main, m.d) + '</div><div class="bar"><i style="width:' + (100 * sr.main / max).toFixed(1) + '%;background:#8d8d94"></i></div></div>' +
      '<div class="vs-mid"><span class="delta ' + (col === 'good' ? '' : col === 'bad' ? 'neg' : 'neu') + '">' + pctTxt(ef.pct) + '</span></div>' +
      '<div><div class="small" style="color:var(--teal-l)">Con Elvy</div><div class="big">' + fmt(cr.main, m.d) + '</div><div class="bar"><i class="t" style="width:' + (100 * cr.main / max).toFixed(1) + '%"></i></div></div>' +
      '</div><p class="small muted" style="margin-top:12px">' + m.label + (m.unit ? ' (' + m.unit + ')' : '') + (m.better === 'low' ? ' · più basso è meglio' : m.better === 'high' ? ' · più alto è meglio' : '') + '</p></div>' +
      '<div style="margin-top:14px">' + talk(ef.good ? IMG.jump : IMG.ok, verdict, Date.now() - cr.t < 120000) + '</div>' +
      (rows.length > 1 ? '<div class="card" style="margin-top:14px"><h3>Nel dettaglio</h3><table class="cmp-table"><thead><tr><th></th><th>Senza</th><th>Con Elvy</th><th></th></tr></thead><tbody>' +
        rows.map(([a, b]) => {
          const e = a[4] ? effect({ metric: { better: a[4] } }, a[1], b[1]) : { pct: a[1] ? (100 * (b[1] - a[1])) / Math.abs(a[1]) : 0, good: null };
          return '<tr><td>' + a[0] + '</td><td>' + fmt(a[1], a[3]) + ' <small>' + a[2] + '</small></td><td>' + fmt(b[1], b[3]) + ' <small>' + b[2] + '</small></td><td class="' + (e.good ? 'up' : e.good === false ? 'down' : '') + '">' + pctTxt(e.pct) + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '') +
      '<p class="note" style="margin-top:14px">Un solo confronto può dipendere da molte cose (stanchezza, riscaldamento, il fatto che il secondo test lo conosci già). Ripetilo in giorni diversi: nei Progressi vedi la tendenza. Sono stime per l\'allenamento, non misure cliniche.</p>' +
      '<div class="actions"><a class="btn" href="#/progressi/' + sr.test + '">Vedi i progressi</a><a class="btn ghost" href="#/report">Condividi il report in PDF</a><a class="btn ghost" href="#/test/' + sr.test + '">Nuovo confronto</a>' +
      '<div class="row" style="justify-content:center;gap:18px"><a class="small" href="#/r/' + sr.id + '">Dettagli senza Elvy</a><a class="small" href="#/r/' + cr.id + '">Dettagli con Elvy</a></div></div>';
    bindCommon();
  }

  function renderProgress() {
    setTab('progressi');
    const all = results();
    const ids = Object.keys(TESTS).filter((k) => all.some((r) => r.test === k));
    const ses = sessions(); const better = ses.filter((x) => x.good).length; const worse = ses.filter((x) => x.good === false).length;
    const sum = !ses.length ? 'Qui vedrai i tuoi progressi e l\'effetto di Elvy. Fai un confronto: lo stesso test senza e con Elvy.'
      : 'Hai fatto ' + (ses.length === 1 ? 'un confronto' : ses.length + ' confronti') + ' senza e con Elvy. ' + (better ? 'Con Elvy sei andato meglio ' + (better === 1 ? 'una volta' : better + ' volte') + (worse ? ', peggio ' + (worse === 1 ? 'una volta' : worse + ' volte') : '') + '.' : 'Per ora nessuna differenza chiara: continua a confrontare.');
    $app.innerHTML = brand() + '<div class="top"><h1>Progressi</h1></div>' + talk(ses.length && better ? IMG.jump : IMG.point, sum, true) +
      '<a class="card rep-link" href="#/report"><span class="rep-ico">PDF</span><span><b>Report da salvare o condividere</b><br><span class="small muted">test, confronti senza e con Elvy, recupero</span></span><span class="chev">›</span></a>' +
      (ses.length ? '<div class="grid3" style="margin-top:14px">' + stat('Confronti', ses.length, '') + stat('Meglio con Elvy', better, '', '', false) + stat('Uguale o peggio', ses.length - better, '', '', true) + '</div>' : '') +
      (ids.length ? '<h3 class="sec">I tuoi test</h3>' + ids.map((k) => {
        const t = TESTS[k]; const list = all.filter((r) => r.test === k);
        const c = list.filter((r) => r.cond === 'con'); const s = list.filter((r) => r.cond !== 'con');
        const ks = sessions(k); const avg = ks.length ? A.mean(ks.map((x) => x.pct)) : null; const ae = avg != null ? effect(t, 100, 100 + avg) : null;
        return '<a class="card" href="#/progressi/' + k + '" style="display:block;color:#fff;margin-bottom:12px"><div class="row between"><div><div class="k' + (PURPLE.includes(t.group) ? ' p' : '') + '">' + t.group + '</div><h3 style="margin-top:4px">' + t.full + '</h3></div><div style="text-align:right"><div class="big" style="font-size:30px">' + fmt(list[list.length - 1].main, t.metric.d) + '</div><div class="small dim">' + t.metric.unit + '</div></div></div>' +
          '<div class="small muted" style="margin-top:8px">' + list.length + ' prove · senza Elvy ' + (s.length ? fmt(A.mean(s.map((r) => r.main)), t.metric.d) : '—') + ' · con Elvy ' + (c.length ? fmt(A.mean(c.map((r) => r.main)), t.metric.d) : '—') + '</div>' +
          (ks.length ? '<div class="row between" style="margin-top:10px"><span class="small">' + ks.length + (ks.length === 1 ? ' confronto' : ' confronti') + ' · effetto medio di Elvy</span><span class="delta ' + (ae.good ? '' : ae.good === false ? 'neg' : 'neu') + '" style="margin-top:0">' + pctTxt(avg) + '</span></div>' : '') + '</a>';
      }).join('') : '<div class="actions"><a class="btn" href="#/test">Scegli un test</a></div>');
    bindCommon();
  }

  function renderProgressTest(id) {
    const t = TESTS[id]; if (!t) return renderProgress();
    setTab('progressi');
    const all = results().filter((r) => r.test === id);
    const variants = [...new Set(all.map((r) => r.variant))];
    let v = prefs['pv-' + id]; if (!variants.includes(v)) v = all.length ? all[all.length - 1].variant : '';
    const list = all.filter((r) => r.variant === v);
    const pick = (c) => list.filter((r) => (c === 'con' ? r.cond === 'con' : r.cond !== 'con')).map((r) => r.main);
    const s = pick('senza'); const c = pick('con');
    let diff = '';
    if (s.length && c.length && t.metric.better) {
      const ms = A.mean(s); const mc = A.mean(c); const pct = ms ? 100 * (mc - ms) / Math.abs(ms) : 0;
      const good = t.metric.better === 'high' ? pct > 0 : pct < 0;
      diff = '<p class="small" style="margin-top:12px;color:' + (good ? 'var(--teal-l)' : 'var(--muted)') + '">Con Elvy la media è ' + (pct >= 0 ? 'più alta' : 'più bassa') + ' del ' + fmt(Math.abs(pct), 0) + '% ' + (good ? '(meglio)' : '') + '. Servono più prove per un confronto affidabile.</p>';
    }
    const col = (lab, arr, on) => '<div class="stat"' + (on ? ' style="box-shadow:inset 0 0 0 2px var(--teal-d)"' : '') + '><div class="l">' + lab + '</div><div class="v">' + (arr.length ? fmt(A.mean(arr), t.metric.d) : '—') + '<small>' + t.metric.unit + '</small></div><div class="s' + (on ? '' : ' p') + '">' + (arr.length ? 'media di ' + arr.length + ' · migliore ' + fmt(t.metric.better === 'low' ? Math.min(...arr) : Math.max(...arr), t.metric.d) : 'nessuna prova') + '</div></div>';
    const ks = sessions(id).filter((x) => x.s.variant === v);
    const avg = ks.length ? A.mean(ks.map((x) => x.pct)) : null; const ae = avg != null ? effect(t, 100, 100 + avg) : null;
    const tl = !ks.length ? 'Ancora nessun confronto per questo test. Fallo prima senza Elvy e poi con Elvy: qui vedrai la differenza ogni volta.'
      : 'In ' + (ks.length === 1 ? 'un confronto' : ks.length + ' confronti') + ' l\'effetto medio di Elvy è ' + pctTxt(avg).replace('+', 'più ').replace('−', 'meno ') + (ae.good ? ': meglio con Elvy.' : ae.good === false ? ': per ora meglio senza.' : ': quasi nessuna differenza.') + (ks.length < 3 ? ' Con almeno tre confronti la tendenza è più affidabile.' : '');
    $app.innerHTML = '<div class="head">' + backBtn() + '<div><div class="k">Progressi</div><h1>' + t.full + '</h1></div></div>' +
      talk(ae && ae.good ? IMG.jump : IMG.point, tl, true) +
      '<div class="card" style="margin-top:14px"><div class="row between"><h3>Senza e con Elvy</h3>' + (ae ? '<span class="delta ' + (ae.good ? '' : ae.good === false ? 'neg' : 'neu') + '" style="margin-top:0">media ' + pctTxt(avg) + '</span>' : '') + '</div>' +
      (ks.length ? '<div style="margin-top:12px">' + pairsChart(ks.slice(-8), t.metric) + '</div>' : '<p class="small muted" style="margin-top:8px">Nessun confronto ancora.</p>') + '</div>' +
      '<div style="height:12px"></div>' +
      (variants.length > 1 ? '<div class="seg" style="margin-bottom:12px">' + variants.map((x) => '<button type="button" data-v="' + esc(x) + '" aria-pressed="' + (x === v) + '">' + esc(x || 'tutti') + '</button>').join('') + '</div>' : '') +
      '<div class="card"><div class="row between"><h3>' + t.metric.label + (t.metric.unit ? ' (' + t.metric.unit + ')' : '') + '</h3><span class="small dim">' + (t.metric.better === 'low' ? 'più basso = meglio' : t.metric.better === 'high' ? 'più alto = meglio' : '') + '</span></div><div style="margin-top:12px">' + trend(list.slice(-30), t.metric) + '</div></div>' +
      '<div class="grid2" style="margin-top:12px">' + col('Senza Elvy', s, false) + col('Con Elvy', c, true) + '</div>' + diff +
      '<h3 class="sec">Tutte le prove</h3><div class="card tight"><ul class="hist">' + list.slice().reverse().map((r) =>
        '<li><a href="#/r/' + r.id + '" style="color:#fff;flex:1"><span class="small muted">' + dateShort(r.t) + ' ' + timeShort(r.t) + '</span><br>' + (r.cond === 'con' ? '<span class="tag con">con Elvy</span>' : '<span class="tag">senza</span>') + (r.demo ? ' <span class="tag demo">prova</span>' : '') + '</a><b>' + fmt(r.main, t.metric.d) + ' ' + t.metric.unit + '</b><button type="button" data-del="' + r.id + '" aria-label="Elimina">✕</button></li>').join('') + '</ul></div>' +
      '<div class="actions"><a class="btn" href="#/test/' + id + '">Nuovo confronto</a></div>';
    $app.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { prefs['pv-' + id] = b.dataset.v; savePrefs(); renderProgressTest(id); }; });
    $app.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { if (confirm('Eliminare questa prova?')) { saveResults(results().filter((r) => String(r.id) !== b.dataset.del)); renderProgressTest(id); } }; });
    bindCommon();
  }

  /* ───────── Guida: video, applicazione, mappatura Sport, protocolli ───────── */
  // Video e protocolli da Airtable (tabelle Videos e PDF_files) tramite il webhook Make di Equistasi Point:
  // in Elvy compaiono quelli con «Elvy» nel campo «Profili app».
  let guideP = null;
  function loadGuide() {
    if (guideP) return guideP;
    const url = (window.APP_CONFIG || {}).videosUrl;
    const sel = (v) => (v && typeof v === 'object' ? v.name : v) || '';
    const tags = (v) => (Array.isArray(v) ? v.map(sel) : v ? [sel(v)] : []);
    const mine = (f) => tags(f['Profili app']).includes('Elvy') && !tags(f['Profili app']).includes('Nascosto');
    const order = (a, b) => a.order - b.order || a.title.localeCompare(b.title);
    let cached = null; try { cached = JSON.parse(localStorage.getItem('elvy-guide') || 'null'); } catch (e) { /* */ }
    if (cached && Date.now() - cached.t < 15 * 60000) return (guideP = Promise.resolve(cached.c));
    if (!url) return (guideP = Promise.resolve(cached ? cached.c : null));
    guideP = fetch(url, { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const vids = ((d.videos || d).records || []).filter((r) => mine(r.fields || {})).map((r) => { const f = r.fields; const file = (f['Video File'] || [])[0];
        return { title: (f.Description || '').trim(), url: (f['Video URL'] || '').trim(), file: file ? file.url : '', thumb: f['Preview Image'] || '', order: typeof f.Order === 'number' ? f.Order : 999 }; }).filter((v) => v.url || v.file).sort(order);
      const pros = ((d.protocols || {}).records || []).filter((r) => mine(r.fields || {})).map((r) => { const f = r.fields; const file = (f['PDF File'] || [])[0];
        return { title: (f.Title || f.ID || '').trim(), subtitle: (f.Subtitle || '').trim(), url: file ? file.url : '', order: typeof f.Order === 'number' ? f.Order : 999 }; }).filter((x) => x.url).sort(order);
      const c = { videos: vids, protocols: pros };
      try { localStorage.setItem('elvy-guide', JSON.stringify({ t: Date.now(), c })); } catch (e) { /* */ }
      return c;
    }).catch(() => (cached ? cached.c : null));
    guideP.then(() => { setTimeout(() => { guideP = null; }, 15 * 60000); });
    return guideP;
  }
  function embedVideo(v) {
    const u = v.url; let m;
    if ((m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/))) return '<iframe src="https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" title="' + esc(v.title) + '"></iframe>';
    if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/))) return '<iframe src="https://player.vimeo.com/video/' + m[1] + '" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy" title="' + esc(v.title) + '"></iframe>';
    if (/^https:\/\/(iframe|player)\.mediadelivery\.net\//.test(u)) return '<iframe src="' + esc(u) + (u.includes('?') ? '&' : '?') + 'autoplay=false&preload=true&responsive=true" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" title="' + esc(v.title) + '"></iframe>';
    const src = /\.(mp4|webm|mov|m3u8)(\?|$)/i.test(u) ? u : v.file;
    return src ? '<video src="' + esc(src) + '" controls playsinline preload="metadata"' + (v.thumb ? ' poster="' + esc(v.thumb) + '"' : '') + '></video>' : '';
  }
  function renderGuide() {
    setTab('guida');
    $app.innerHTML = brand() + '<div class="top"><h1>Guida</h1></div>' +
      talk(IMG.point, 'Qui trovi come si applica Elvy con il cerotto, la mappa dei punti per lo sport e i protocolli. Guarda il video prima del primo confronto!', true) +
      '<h2 class="sec">Video tutorial</h2><div id="gd-videos"><div class="card"><p class="small muted">Caricamento dei video…</p></div></div>' +
      '<h2 class="sec">Come si applica</h2><div class="card guide-steps">' +
      '<p class="small muted">Pelle <b style="color:#fff">pulita e asciutta</b>, senza creme né oli. Poi, per ogni punto:</p>' +
      [['img/elvy-pelle.jpg', 'Appoggia Elvy', 'Metti il dispositivo Elvy sul punto, a contatto con la pelle.'],
        ['img/elvy-cerotto.jpg', 'Copri con il cerotto', 'Togli la pellicola centrale del cerotto trasparente in dotazione e mettilo sopra Elvy.'],
        ['img/elvy-premi.jpg', 'Premi i bordi', 'Togli le linguette laterali e premi bene i bordi, senza pieghe.']]
        .map((x, i) => '<div class="g-step"><div class="g-img"><img src="' + x[0] + '" alt="" loading="lazy" /><i>' + (i + 1) + '</i></div><div><b>' + x[1] + '</b><span>' + x[2] + '</span></div></div>').join('') +
      '<p class="small muted" style="margin-top:12px">Per toglierlo solleva piano un bordo del cerotto, tenendo ferma la pelle.</p></div>' +
      '<h2 class="sec">Mappatura Sport</h2><div class="card map-card"><div class="map-wrap"><img src="img/mappa-sport.png" alt="Punti di applicazione per lo sport: C7 e polpacci" /></div>' +
      '<ol class="map-legend"><li><i>1</i><div><b>C7 · settima vertebra cervicale</b><span>Alla base del collo: è la vertebra che sporge di più quando pieghi la testa in avanti.</span></div></li>' +
      '<li><i>2·3</i><div><b>Tricipite della sura · polpacci</b><span>Uno per gamba, nella parte bassa del polpaccio, sul soleo, sopra il tendine d\'Achille.</span></div></li></ol>' +
      '<div class="grid3" style="margin-top:12px">' + stat('Primo giorno', '1–2', 'ore', 'prima dello sport') + stat('Al giorno', '4', 'ore', 'al massimo', true) + stat('A settimana', '5', 'giorni', '+ 2 di pausa') + '</div>' +
      '<p class="small muted" style="margin-top:10px">Dal secondo giorno usa Elvy durante gli allenamenti e le gare. Se ti alleni più volte al giorno puoi applicarlo più volte, senza superare le 4 ore.</p>' +
      '<div class="warn" style="margin-top:12px">Togli i dispositivi se senti un fastidio qualsiasi. In caso di malessere (nausea, vertigini, mal di testa) toglili subito e riprova il giorno dopo.</div></div>' +
      '<h2 class="sec">Protocolli</h2><div id="gd-protos"><div class="card"><p class="small muted">Caricamento…</p></div></div>' +
      '<p class="note" style="margin-top:16px">Queste informazioni non sostituiscono il parere del medico, del fisioterapista o del preparatore atletico, che possono adattare punti e tempi a te e al tuo sport.</p>';
    bindCommon();
    loadGuide().then((c) => {
      const vb = document.getElementById('gd-videos'); const pb = document.getElementById('gd-protos'); if (!vb) return;
      vb.innerHTML = c && c.videos.length ? c.videos.map((v) => '<div class="card vid-card"><div class="vid-frame">' + embedVideo(v) + '</div><h3 style="margin-top:12px">' + esc(v.title) + '</h3></div>').join('')
        : '<div class="card soon"><span class="soon-tag">In arrivo</span><h3 style="margin-top:8px">Video: come si applica Elvy</h3><p class="small muted" style="margin-top:6px">' + (c ? 'Il video tutorial sarà qui a breve. Intanto segui i passaggi qui sotto.' : 'I video non si caricano ora: controlla la connessione.') + '</p></div>';
      pb.innerHTML = c && c.protocols.length ? c.protocols.map((x) => '<a class="card rep-link" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="rep-ico">PDF</span><span><b>' + esc(x.title) + '</b>' + (x.subtitle ? '<br><span class="small muted">' + esc(x.subtitle) + '</span>' : '') + '</span><span class="chev">›</span></a>').join('')
        : '<div class="card soon"><span class="soon-tag">In preparazione</span><h3 style="margin-top:8px">Protocollo Sport Elvy</h3><p class="small muted" style="margin-top:6px">I protocolli per lo sport (allenamento, gara, recupero) arriveranno qui. Per ora segui la mappatura Sport qui sopra.</p></div>';
    });
  }

  /* ───────── Report in PDF ───────── */
  // Dati del report: prove nel periodo (giorni, 0 = tutto), senza le prove simulate se non richieste
  function reportData(days, withDemo) {
    const from = days ? Date.now() - days * 864e5 : 0;
    const list = results().filter((r) => TESTS[r.test] && r.t >= from && (withDemo || !r.demo));
    const inRange = (x) => x.t >= from && (withDemo || (!x.s.demo && !x.c.demo));
    const ses = sessions().filter(inRange);
    const ids = Object.keys(TESTS).filter((k) => list.some((r) => r.test === k));
    const avgOf = (arr) => (arr.length ? { avg: A.mean(arr.map((r) => r.main)), n: arr.length } : null);
    const hv = list.filter((r) => r.test === 'hrv');
    const lastHv = hv[hv.length - 1];
    const ds = (t) => new Date(t).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
    return {
      name: profile.name, sport: profile.sport, serial: window.ElvyGate.paired(),
      period: list.length ? ds(list[0].t) + ' - ' + ds(list[list.length - 1].t) : 'nessuna prova',
      date: ds(Date.now()),
      kpi: { tests: list.length, comparisons: ses.length, better: ses.filter((x) => x.good).length, recovery: lastHv && lastHv.res.ready ? lastHv.res.ready.score : null },
      effect: ids.map((k) => { const ks = ses.filter((x) => x.test === k); if (!ks.length) return null; const avg = A.mean(ks.map((x) => x.pct)); return { name: TESTS[k].full, n: ks.length, pct: avg, good: effect(TESTS[k], 100, 100 + avg).good }; }).filter(Boolean),
      tests: ids.map((k) => {
        const t = TESTS[k]; const rs = list.filter((r) => r.test === k); const vals = rs.map((r) => r.main);
        return { name: t.full, group: t.group, label: t.metric.label, unit: t.metric.unit, d: t.metric.d, better: t.metric.better, n: rs.length, last: vals[vals.length - 1],
          best: t.metric.better === 'low' ? Math.min(...vals) : Math.max(...vals), s: avgOf(rs.filter((r) => r.cond !== 'con')), c: avgOf(rs.filter((r) => r.cond === 'con')),
          series: rs.slice(-24).map((r) => ({ v: r.main, con: r.cond === 'con' })) };
      }),
      hrv: lastHv ? { rmssd: lastHv.res.rmssd, hr: lastHv.res.hr, score: lastHv.res.ready ? lastHv.res.ready.score : null, series: hv.slice(-20).map((r) => r.res.rmssd) } : null,
    };
  }
  function renderReport() {
    setTab('progressi');
    const o = Object.assign({ days: 30, demo: false }, prefs.report || {});
    const d = reportData(+o.days, o.demo);
    $app.innerHTML = '<div class="head">' + backBtn() + '<div><div class="k">Progressi</div><h1>Report in PDF</h1></div></div>' +
      talk(IMG.point, d.kpi.tests ? 'Ti preparo un report con i tuoi test, i confronti senza e con Elvy e il recupero. Puoi salvarlo o mandarlo al tuo allenatore o fisioterapista.' : 'Nel periodo scelto non ci sono prove. Fai qualche test, poi torna qui.', true) +
      '<div class="card stack" style="margin-top:14px"><div><div class="small muted" style="font-weight:700;margin-bottom:6px">Periodo</div><div class="seg">' +
      [[7, '7 giorni'], [30, '30 giorni'], [90, '3 mesi'], [0, 'Tutto']].map(([v, l]) => '<button type="button" data-days="' + v + '" aria-pressed="' + (+o.days === v) + '">' + l + '</button>').join('') + '</div></div>' +
      '<label class="check" style="margin-top:4px"><input type="checkbox" id="rp-demo"' + (o.demo ? ' checked' : '') + ' /><span>Includi le prove con dati simulati</span></label></div>' +
      '<div class="rep-prev"><div class="rep-top"><img src="img/logo-elvy.png" alt="Elvy" /><div><b>Report di allenamento</b><span>' + esc([profile.name || 'Atleta', profile.sport].filter(Boolean).join(' · ')) + '</span><span>' + esc(d.period) + '</span></div></div>' +
      '<div class="grid3" style="margin-top:12px">' + stat('Test', d.kpi.tests, '') + stat('Confronti', d.kpi.comparisons, '') + stat('Meglio con Elvy', d.kpi.better, '', '', true) + '</div>' +
      '<p class="small muted" style="margin-top:12px">' + d.tests.length + (d.tests.length === 1 ? ' test' : ' test diversi') + (d.hrv ? ' · recupero (HRV)' : '') + ' · piè di pagina con il marchio Equistasi e l\'avviso che i dati non sono diagnostici.</p></div>' +
      '<div class="actions"><button class="btn" id="rp-share"' + (d.kpi.tests ? '' : ' disabled') + '>Condividi il report</button><button class="btn ghost" id="rp-save"' + (d.kpi.tests ? '' : ' disabled') + '>Salva in PDF</button></div><p class="err" id="rp-msg"></p>' +
      '<p class="note" style="margin-top:10px">Il PDF si crea sul telefono: nessun dato viene inviato finché non decidi tu di condividerlo.</p>';
    $app.querySelectorAll('[data-days]').forEach((b) => { b.onclick = () => { prefs.report = Object.assign({}, o, { days: +b.dataset.days }); savePrefs(); renderReport(); }; });
    document.getElementById('rp-demo').onchange = (e) => { prefs.report = Object.assign({}, o, { demo: e.target.checked }); savePrefs(); renderReport(); };
    const go = async (how, btn) => {
      const msg = document.getElementById('rp-msg'); msg.textContent = '';
      const label = btn.textContent; btn.disabled = true; btn.textContent = 'Preparo il PDF…';
      try {
        const blob = await window.ElvyReport.make(reportData(+o.days, o.demo));
        const name = 'Report Elvy ' + (profile.name ? profile.name + ' ' : '') + new Date().toISOString().slice(0, 10) + '.pdf';
        const r = await window.ElvyReport.deliver(blob, name, how);
        if (r === 'download') msg.innerHTML = '<span style="color:var(--teal-l)">PDF salvato: lo trovi nei download del telefono.</span>';
      } catch (e) { msg.textContent = 'Non sono riuscito a creare il PDF: controlla la connessione la prima volta (serve scaricare il generatore) e riprova.'; }
      btn.disabled = false; btn.textContent = label;
    };
    document.getElementById('rp-share').onclick = (e) => go('share', e.currentTarget);
    document.getElementById('rp-save').onclick = (e) => go('save', e.currentTarget);
    bindCommon();
  }

  function renderProfile() {
    setTab('profilo');
    const n = results().length;
    $app.innerHTML = brand() + '<div class="top" style="align-items:center"><h1>Profilo</h1><img class="face" src="' + IMG.hi + '" alt="" /></div>' +
      '<div class="card"><label class="field" style="margin-top:0"><span>Nome</span><input id="p-name" value="' + esc(profile.name) + '" maxlength="30" /></label>' +
      '<label class="field"><span>Sport</span><input id="p-sport" value="' + esc(profile.sport) + '" maxlength="40" /></label>' +
      '<div class="grid2"><label class="field"><span>Peso (kg)</span><input id="p-mass" type="number" inputmode="decimal" value="' + (profile.mass || '') + '" /></label>' +
      '<label class="field"><span>Altezza (cm)</span><input id="p-height" type="number" inputmode="numeric" value="' + (profile.height || '') + '" /></label></div>' +
      '<label class="check"><input type="checkbox" id="p-voice"' + (profile.voice ? ' checked' : '') + ' /><span>Guida vocale durante i test (conto alla rovescia, «salta», «via»)</span></label>' +
      '<label class="check"><input type="checkbox" id="p-mvoice"' + (profile.mascotVoice ? ' checked' : '') + ' /><span>Voce della mascotte (se la togli, Elvy scrive soltanto)</span></label>' +
      '<label class="check"><input type="checkbox" id="p-flip"' + (profile.flip ? ' checked' : '') + ' /><span>Corsa: inverti destra e sinistra (se il telefono è girato al contrario in cintura)</span></label>' +
      '<div class="actions"><button class="btn" id="p-save">Salva</button></div><p class="small" id="p-msg" style="color:var(--teal-l);margin-top:8px"></p></div>' +
      '<div class="card" style="margin-top:12px"><h3>Il tuo dispositivo</h3><div style="margin-top:14px">' + window.ElvyGate.deviceHtml(window.ElvyGate.paired(), 'front') + '</div>' +
      '<div class="row between" style="margin-top:14px"><span class="small muted">' + (device.on ? 'Applicato: ' + esc(device.where) + ' · da ' + durText(minsSince(device.since)) : 'Non applicato') + '</span>' + elvyPill() + '</div>' +
      '<p class="note" style="margin-top:12px">Il dispositivo funziona su un solo telefono o computer alla volta. Se lo abbini altrove, qui si scollega (massimo 3 spostamenti in 30 giorni).</p>' +
      '<button class="btn danger small" id="p-unpair" style="margin-top:14px">Scollega il dispositivo</button></div>' +
      '<div class="card" style="margin-top:12px" id="watch"><div class="row" style="gap:10px"><span class="watch-ico">' + ICON.watch + '</span><h3>Orologio e fascia cardio</h3></div>' +
      (S.heart.supported()
        ? '<p class="small muted" style="margin-top:8px">' + (S.heart.connected() ? '<b style="color:var(--teal-l)">♥ ' + esc(S.heart.name()) + '</b> collegato' + (S.heart.bpm ? ' · <span id="hr-live">' + S.heart.bpm + '</span> bpm' : '') : 'Collega via Bluetooth una fascia cardio (Polar, Garmin, Wahoo…) o un orologio con la «trasmissione del battito» attiva (Garmin, Polar, Coros, Suunto, Amazfit). Durante i test registro il battito.') + '</p>' +
          '<div class="actions"><button class="btn ' + (S.heart.connected() ? 'ghost' : '') + '" id="p-hr">' + (S.heart.connected() ? 'Scollega' : 'Collega via Bluetooth') + '</button></div><p class="err" id="p-hr-msg"></p>'
        : '<p class="small muted" style="margin-top:8px">' + (S.isIOS ? 'Su iPhone il collegamento con <b>Apple Watch</b> (battito, HRV e GPS dell\'orologio da Apple Salute) arriva con l\'app Elvy per App Store.' : 'Per collegare una fascia o un orologio via Bluetooth apri Elvy con <b>Chrome</b>. Il collegamento con Wear OS e Health Connect arriva con l\'app Elvy per Google Play.') + '</p>') +
      '</div>' +
      '<div class="card" style="margin-top:12px"><h3>I tuoi dati</h3><p class="small muted" style="margin-top:6px">' + n + ' prove salvate solo su questo telefono.</p>' +
      '<div class="actions"><a class="btn" href="#/report">Report in PDF</a><button class="btn ghost" id="p-csv"' + (n ? '' : ' disabled') + '>Esporta in CSV (Excel)</button><button class="btn danger" id="p-del"' + (n ? '' : ' disabled') + '>Cancella tutti i risultati</button></div></div>' +
      '<p class="note" style="margin-top:18px">Elvy · by Equistasi. Le misure sono stime fatte con i sensori dello smartphone, utili per l\'allenamento: non hanno valore clinico e non sostituiscono la valutazione di medici, fisioterapisti o preparatori. L\'eventuale beneficio di Equistasi varia da persona a persona.</p>' +
      '<p class="note" style="margin-top:8px"><a href="../">Equistasi Point</a> · <a href="https://equistasi.com" rel="noopener">equistasi.com</a></p>';
    document.getElementById('p-save').onclick = () => {
      profile.name = document.getElementById('p-name').value.trim();
      profile.sport = document.getElementById('p-sport').value.trim();
      const m = parseFloat(document.getElementById('p-mass').value); profile.mass = m >= 25 && m <= 200 ? m : null;
      const h = parseFloat(document.getElementById('p-height').value); profile.height = h >= 100 && h <= 230 ? h : null;
      profile.voice = document.getElementById('p-voice').checked; profile.flip = document.getElementById('p-flip').checked;
      profile.mascotVoice = document.getElementById('p-mvoice').checked;
      S.setVoice(profile.voice); saveProfile();
      document.getElementById('p-msg').textContent = 'Salvato.';
    };
    document.getElementById('p-csv').onclick = exportCsv;
    const hb = document.getElementById('p-hr');
    if (hb) hb.onclick = async () => {
      const msg = document.getElementById('p-hr-msg');
      if (S.heart.connected()) { S.heart.disconnect(); renderProfile(); return; }
      try { await S.heart.connect(); renderProfile(); } catch (e) { msg.textContent = e && e.name === 'NotFoundError' ? '' : 'Collegamento non riuscito: accendi il Bluetooth e la trasmissione del battito sull\'orologio, poi riprova.'; }
    };
    // tocca il dispositivo per girarlo e vedere il retro
    const dv = document.getElementById('dev'); if (dv) dv.onclick = () => dv.classList.toggle('turned');
    document.getElementById('p-unpair').onclick = () => { if (confirm('Scollegare il dispositivo da questa app? Per usarla di nuovo dovrai abbinarlo ancora. I risultati restano salvati.')) { window.ElvyGate.unpair(); route(); } };
    document.getElementById('p-del').onclick = () => { if (confirm('Cancellare tutti i risultati dei test? Non si può annullare.')) { saveResults([]); renderProfile(); } };
    bindCommon();
  }

  function exportCsv() {
    const rows = [['data', 'ora', 'test', 'variante', 'condizione', 'punto Elvy', 'misura', 'valore', 'unita', 'simulato']];
    results().forEach((r) => {
      const t = TESTS[r.test]; if (!t) return;
      rows.push([new Date(r.t).toLocaleDateString('it-IT'), timeShort(r.t), t.full, r.variant, r.cond === 'con' ? 'con Elvy' : 'senza Elvy', r.where || '', t.metric.label, fmt(r.main, t.metric.d), t.metric.unit, r.demo ? 'si' : 'no']);
    });
    const csv = '﻿' + rows.map((row) => row.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'elvy-risultati.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  /* ───────── Navigazione ───────── */
  function route() {
    if (document.body.classList.contains('running')) return;
    // prima di tutto il dispositivo: senza seriale abbinato si vede solo la schermata di attivazione
    if (!window.ElvyGate.paired()) { setTab(''); window.ElvyGate.show($app, () => { location.hash = '#/oggi'; route(); }); return; }
    const parts = (location.hash.replace(/^#\/?/, '') || 'oggi').split('/');
    window.scrollTo(0, 0); S.stopVoice();
    switch (parts[0]) {
      case 'test': return parts[1] ? renderTest(parts[1]) : renderTests();
      case 'r': return renderResult(parts[1]);
      case 'confronto': return renderCompare(parts[1]);
      case 'video': setTab('test'); return window.ElvyVideo ? window.ElvyVideo.render($app, { backBtn, talk, bindCommon, results, saveResults, device, PROTO, fmt }) : renderTests();
      case 'progressi': return parts[1] ? renderProgressTest(parts[1]) : renderProgress();
      case 'profilo': return renderProfile();
      case 'report': return renderReport();
      case 'guida': return renderGuide();
      default: return renderOggi();
    }
  }
  window.addEventListener('hashchange', route);
  route();
  // un dispositivo su un solo telefono: controllo all'avvio e quando si torna nell'app (non durante un test)
  const lostHere = () => { if (!document.body.classList.contains('running')) route(); };
  window.ElvyGate.recheck(lostHere, true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !document.body.classList.contains('running')) window.ElvyGate.recheck(lostHere); });

  window.Elvy = { TESTS, results, route };
})();
