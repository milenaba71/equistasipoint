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
  const profile = Object.assign({ name: '', sport: '', mass: null, height: null, voice: true, flip: false, welcomed: false }, store.get('elvy-profile', {}));
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

  const IMG = { hi: 'img/mascotte.jpg', ok: 'img/pollice.jpg', point: 'img/punta.jpg', jump: 'img/salta.jpg' };
  const ICON = {
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    nfc: '<svg viewBox="0 0 24 24"><path d="M6 8.5a5 5 0 0 1 0 7M9.5 6a9 9 0 0 1 0 12M13 4a12 12 0 0 1 0 16"/></svg>',
    belt: '<svg viewBox="0 0 40 40"><path d="M6 15c4 2 9 3 14 3s10-1 14-3M6 25c4 2 9 3 14 3s10-1 14-3M6 15v10M34 15v10"/><rect x="13" y="17" width="14" height="9" rx="2"/></svg>',
    hand: '<svg viewBox="0 0 40 40"><rect x="13" y="6" width="14" height="24" rx="3"/><path d="M10 22c0 6 4 12 10 12s10-5 10-10"/></svg>',
    leg: '<svg viewBox="0 0 40 40"><path d="M18 4v16l-2 14h6M18 20h4"/><rect x="21" y="18" width="7" height="11" rx="1.5"/></svg>',
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
  const stat = (l, v, unit, sub, purple) => '<div class="stat"><div class="l">' + l + '</div><div class="v">' + v + (unit ? '<small>' + unit + '</small>' : '') + '</div>' + (sub ? '<div class="s' + (purple ? ' p' : '') + '">' + sub + '</div>' : '') + '</div>';
  const say = (img, text) => '<div class="say"><img src="' + img + '" alt="" /><p>' + text + '</p></div>';
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
      options: [{ key: 'dur', label: 'Durata', values: { 60: '1 min', 180: '3 min', 300: '5 min' } }],
      defaults: { dur: 180 },
      variant: () => '',
      steps: ['Telefono nella <b>cintura Elvy</b> sulla zona lombare, ben aderente.', 'Corri alla tua andatura abituale, possibilmente su un percorso piano e sempre lo stesso.', 'La voce ti avvisa ogni minuto e alla fine. Puoi fermare prima dal pulsante.'],
      metric: { label: 'Cadenza', unit: 'passi/min', d: 0, better: null },
      async run(ctx, o) {
        await ctx.prep(10, 'Preparati', 'Metti il telefono nella cintura e preparati a correre.');
        const cues = []; for (let m = 60; m < o.dur; m += 60) cues.push({ at: m, say: (m / 60) + (m === 60 ? ' minuto' : ' minuti') });
        const s = await ctx.record(+o.dur, { phase: 'Corsa', msg: 'Corri alla tua andatura', go: 'Via!', voice: 'Via! Corri alla tua andatura', cues, clock: true },
          () => SIM.runSignal(171, 0.238, 60, { tcRight: 0.233, tcLeft: 0.243, seed: 31, platformSign: S.platformSign }));
        const r = A.running(s, { flipSides: profile.flip, platformSign: S.platformSign });
        if (!r.ok) throw new Error('Non ho riconosciuto abbastanza passi: il telefono deve stare fermo in cintura mentre corri.');
        return r;
      },
      main: (r) => r.cadence,
      hero: (r) => ({ k: clock(r.duration) + ' · ' + r.steps + ' passi', v: fmt(r.cadence, 0), unit: 'passi al minuto', chart: sparkline(r.series) }),
      render(r) {
        const max = Math.max(r.contactLeft || 0, r.contactRight || 0) * 1.15 || 1;
        return '<div class="grid2">' + stat('Tempo di contatto', r.contact ? fmt(r.contact * 1000, 0) : '—', r.contact ? 'ms' : '', r.contact ? '' : 'nessuna fase di volo') + stat('Oscillazione verticale', fmt(r.oscillation, 1), 'cm') +
          stat('Simmetria del passo', fmt(r.symmetry, 0), '%') + stat('Regolarità', fmt(r.regularity, 2), 'su 1') + '</div>' +
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

    /* ── Reazione e mobilità ── */
    reazione: {
      group: 'Reazione e mobilità', name: 'Tempo di reazione', full: 'Tempo di reazione', sub: 'tocco o movimento', minutes: 1, place: 'hand',
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
      group: 'Reazione e mobilità', name: 'Mobilità', full: 'Mobilità articolare', sub: 'caviglia, anca, spalla', minutes: 2, place: 'segment',
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

  const GROUPS = ['Equilibrio', 'Salti', 'Corsa e core', 'Reazione e mobilità'];
  const ROTATION = ['una-gamba', 'cmj', 'drop', 'corsa', 'hop', 'plank', 'in-piedi', 'mobilita', 'ripetuti', 'reazione'];

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
          return simFn();
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

  async function startTest(id, opts) {
    const test = TESTS[id];
    S.unlockAudio();
    let demo = false;
    if (id !== 'reazione' || opts.mode === 'movimento') {
      const perm = await S.permission();
      const p = perm ? await S.probe(900) : { ok: false };
      if (!p.ok) {
        demo = await askDemo(perm);
        if (!demo) return;
      }
    }
    await S.keepAwake(true);
    const ctx = makeRunner(demo);
    try {
      const res = await test.run(ctx, opts);
      ctx.close();
      const rec = { id: Date.now(), t: Date.now(), test: id, cond: device.on ? 'con' : 'senza', where: device.on ? device.where : null, variant: test.variant(opts), opts, demo, main: test.main(res), res };
      const all = results(); all.push(rec); saveResults(all);
      S.say('Fatto! ' + spoken(test, rec));
      location.hash = '#/r/' + rec.id;
    } catch (e) {
      ctx.close();
      if (e.message !== 'abort') { S.say('Non ci sono riuscito'); renderTest(id, e.message); }
    }
  }
  const spoken = (test, r) => test.metric.label + ' ' + fmt(r.main, test.metric.d).replace('.', '') + ' ' + (test.metric.unit === 'cm²' ? 'centimetri quadrati' : test.metric.unit === 'cm' ? 'centimetri' : test.metric.unit === 'ms' ? 'millisecondi' : test.metric.unit === 's' ? 'secondi' : test.metric.unit === '°' ? 'gradi' : test.metric.unit === '%' ? 'per cento' : '');

  function askDemo(perm) {
    return new Promise((resolve) => {
      openSheet('<h2>Il sensore non risponde</h2><p class="muted" style="margin-top:10px">' + (perm ? 'Non arrivano dati dall\'accelerometro. Usa l\'app dal telefono (non dal computer).' : 'Serve il permesso ai sensori di movimento: consentilo quando il telefono lo chiede.') + '</p>' +
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
  const WHERE = ['Polpaccio', 'Caviglia', 'Ginocchio', 'Coscia', 'Zona lombare', 'Spalla', 'Collo', 'Altro punto'];
  function elvySheet() {
    let pick = device.where || null;
    const draw = () => openSheet('<div class="row" style="gap:14px"><img src="' + IMG.point + '" alt="" style="width:70px;border-radius:14px"><div><h2>Elvy applicato?</h2><p class="muted small" style="margin-top:4px">I test di adesso vengono segnati «con Elvy» o «senza Elvy».</p></div></div>' +
      (device.on ? '<div class="card" style="margin-top:16px;background:var(--teal-d)"><b style="color:var(--teal-l)">Applicato: ' + esc(device.where || '') + '</b><div class="small" style="color:#cfeeed;margin-top:4px">da ' + durText(minsSince(device.since)) + '</div></div>' : '') +
      '<h3 style="margin-top:18px">Dove l\'hai applicato?</h3><div class="chips">' + WHERE.map((w) => '<button type="button" data-w="' + w + '" aria-pressed="' + (pick === w) + '">' + w + '</button>').join('') + '</div>' +
      '<p class="note" style="margin-top:12px">Con il dispositivo NFC il telefono lo riconoscerà da solo avvicinandolo. Per i punti di applicazione segui il protocollo Sport di Equistasi.</p>' +
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
    // consiglio: il test fatto meno di recente
    const lastT = (id) => { const r = lastOf(id); return r ? r.t : 0; };
    const sug = ROTATION.slice().sort((a, b) => lastT(a) - lastT(b))[0];
    const st = TESTS[sug];
    const recent = []; all.slice().reverse().forEach((r) => { if (!recent.find((x) => x.test === r.test) && TESTS[r.test]) recent.push(r); });
    $app.innerHTML = '<div class="top"><div><div class="date">' + cap(dateLong(Date.now())) + '</div><h1>Ciao' + (profile.name ? ', ' + esc(profile.name) : '') + '</h1></div><img class="face" src="' + IMG.hi + '" alt="Elvy" /></div>' +
      '<div class="row" style="margin-bottom:14px">' + elvyPill() + (device.on ? '<span class="small muted">' + esc(device.where) + ' · da ' + durText(minsSince(device.since)) + '</span>' : '') + '</div>' +
      card +
      '<div class="card hero" style="margin-top:14px;padding:0;padding-right:18px"><img src="' + IMG.point + '" alt="" style="width:34%;max-width:150px;border-radius:0;align-self:stretch" /><div style="padding:18px 0 18px 0"><div class="k p">Oggi ti consiglio</div><h3 style="margin-top:8px;font-size:20px;line-height:1.25">' + st.full + ', ' + st.sub + '</h3>' +
      '<a class="btn small" style="margin-top:14px" href="#/test/' + sug + '">Inizia · ' + st.minutes + ' min</a></div></div>' +
      '<div class="row between sec"><h2>Ultimi risultati</h2><a href="#/test" style="font-weight:700">Tutti i test</a></div>' +
      (recent.length ? '<div class="grid3">' + recent.slice(0, 3).map((r) => { const t = TESTS[r.test]; return '<a class="stat" href="#/r/' + r.id + '" style="color:#fff"><div class="l">' + t.name + '</div><div class="v">' + fmt(r.main, t.metric.d) + '</div><div class="s' + (r.cond === 'con' ? '' : ' p') + '">' + (t.metric.unit || t.metric.label) + ' · ' + (r.cond === 'con' ? 'con Elvy' : 'senza') + '</div></a>'; }).join('') + '</div>' :
        say(IMG.hi, 'Ciao! Sono Elvy. Scegli un test: ti spiego cosa fare, conto il tempo e ti dico com\'è andata.'));
    bindCommon();
  }

  function renderWelcome() {
    $app.innerHTML = '<div style="text-align:center;margin-top:10px"><img src="img/wordmark.png" alt="Elvy" style="width:150px" /></div>' +
      '<div class="say" style="margin-top:18px"><img src="' + IMG.hi + '" alt="" style="width:110px" /><p>Ciao! Sono <b>Elvy</b>. Con i sensori del tuo telefono misuriamo equilibrio, salti, corsa, core, riflessi e mobilità. Poi confrontiamo i risultati <b>con e senza Elvy</b>.</p></div>' +
      '<div class="card" style="margin-top:18px"><h3>Come ti chiami?</h3>' +
      '<label class="field"><span>Nome</span><input id="w-name" autocomplete="given-name" maxlength="30" /></label>' +
      '<label class="field"><span>Sport</span><input id="w-sport" placeholder="es. calcio, corsa, tennis" maxlength="40" /></label>' +
      '<label class="field"><span>Peso (kg) · per stimare la potenza</span><input id="w-mass" type="number" inputmode="decimal" min="25" max="200" /></label>' +
      '<label class="check"><input type="checkbox" id="w-ok" /><span>Ho capito: i risultati sono stime per l\'allenamento e non hanno valore medico. Le misure restano sul mio telefono.</span></label>' +
      '<div class="actions"><button class="btn" id="w-go" disabled>Iniziamo</button></div></div>';
    const ok = document.getElementById('w-ok'); const go = document.getElementById('w-go');
    ok.onchange = () => { go.disabled = !ok.checked; };
    go.onclick = () => {
      profile.name = document.getElementById('w-name').value.trim();
      profile.sport = document.getElementById('w-sport').value.trim();
      const m = parseFloat(document.getElementById('w-mass').value); profile.mass = m >= 25 && m <= 200 ? m : null;
      profile.welcomed = true; saveProfile(); renderOggi();
    };
  }

  function renderTests() {
    setTab('test');
    $app.innerHTML = '<div class="top" style="align-items:center"><h1>Test</h1>' + elvyPill() + '</div>' +
      '<p class="muted">' + (device.on ? 'I test di adesso vengono segnati in automatico «con Elvy».' : 'Applica Elvy e tocca il pulsante: i test verranno segnati «con Elvy».') + '</p>' +
      GROUPS.map((g, gi) => '<div class="k' + (gi === 3 ? ' p' : '') + ' sec">' + g + '</div><div class="tiles">' +
        Object.keys(TESTS).filter((k) => TESTS[k].group === g).map((k) => {
          const t = TESTS[k]; const l = lastOf(k);
          return '<a class="tile" href="#/test/' + k + '"><b>' + t.name + '</b><span>' + t.sub + '</span>' + (l ? '<em>' + fmt(l.main, t.metric.d) + ' ' + t.metric.unit + ' · ' + dateShort(l.t) + '</em>' : '') + '</a>';
        }).join('') + '</div>').join('') +
      '<p class="note" style="margin-top:22px">Tutti i test usano l\'accelerometro del telefono. Per equilibrio, salti, corsa e plank il telefono va nella cintura Elvy, vicino al baricentro: le misure sono più ripetibili.</p>';
    bindCommon();
  }

  function renderTest(id, error) {
    const t = TESTS[id];
    if (!t) return renderTests();
    setTab('test');
    const o = Object.assign({}, t.defaults || {}, prefs[id] || {});
    const steps = id === 'mobilita' ? JOINTS[o.joint].steps : t.steps;
    const place = t.place === 'belt' ? placeBox('belt', BELT_TEXT) : t.place === 'hand' ? placeBox('hand', 'Telefono <b>in mano</b>, davanti a te.') :
      placeBox(o.joint === 'tronco' ? 'chest' : o.joint === 'spalla' ? 'hand' : 'leg', JOINTS[o.joint].place.replace(' {lato}', '').replace('{lato}', ''));
    const prev = results().filter((r) => r.test === id);
    $app.innerHTML = '<div class="head">' + backBtn() + '<div><div class="k">' + t.group + '</div><h1>' + t.full + '</h1></div></div>' +
      '<div class="stack">' +
      (t.options.length ? '<div class="card stack">' + t.options.map((op) => '<div><div class="small muted" style="font-weight:700;margin-bottom:6px">' + op.label + '</div><div class="seg">' +
        Object.keys(op.values).map((v) => '<button type="button" data-opt="' + op.key + '" data-val="' + v + '" aria-pressed="' + (String(o[op.key]) === v) + '">' + op.values[v] + '</button>').join('') + '</div></div>').join('') + '</div>' : '') +
      place +
      '<div class="card"><h3 style="margin-bottom:12px">Come si fa</h3><ol class="steps">' + steps.map((s) => '<li>' + s + '</li>').join('') + '</ol>' +
      '<p class="small muted">Dura circa ' + t.minutes + ' min. La voce ti guida: alza il volume.</p></div>' +
      '<div class="row between card tight"><span class="small">' + (device.on ? '<span class="tag con">con Elvy</span> ' + esc(device.where) : '<span class="tag">senza Elvy</span>') + '</span>' + elvyPill() + '</div>' +
      SAFE + '</div>' +
      (error ? '<p class="err" role="alert">' + esc(error) + '</p>' : '') +
      '<div class="actions"><button class="btn" id="go">Inizia</button>' + (prev.length ? '<a class="btn ghost" href="#/progressi/' + id + '">I tuoi risultati (' + prev.length + ')</a>' : '') + '</div>';
    $app.querySelectorAll('[data-opt]').forEach((b) => { b.onclick = () => { prefs[id] = Object.assign({}, prefs[id], { [b.dataset.opt]: b.dataset.val }); savePrefs(); renderTest(id); }; });
    document.getElementById('go').onclick = () => startTest(id, Object.assign({}, t.defaults || {}, prefs[id] || {}));
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
      '<div style="margin-top:18px">' + say(r.test === 'cmj' ? IMG.jump : IMG.ok, t.comment(r.res)) + '</div>' +
      '<div class="actions"><button class="btn" id="again">' + (device.on ? 'Nuova prova con Elvy' : 'Ripeti con Elvy') + '</button><a class="btn ghost" href="#/progressi/' + r.test + '">Vedi i progressi</a></div>';
    document.getElementById('again').onclick = () => { if (device.on) location.hash = '#/test/' + r.test; else elvySheet(); };
    bindCommon();
  }

  function renderProgress() {
    setTab('progressi');
    const all = results();
    const ids = Object.keys(TESTS).filter((k) => all.some((r) => r.test === k));
    $app.innerHTML = '<div class="top"><h1>Progressi</h1></div>' +
      (ids.length ? '<p class="muted" style="margin-bottom:14px">L\'andamento di ogni test nel tempo, con e senza Elvy.</p>' + ids.map((k) => {
        const t = TESTS[k]; const list = all.filter((r) => r.test === k);
        const c = list.filter((r) => r.cond === 'con'); const s = list.filter((r) => r.cond !== 'con');
        return '<a class="card" href="#/progressi/' + k + '" style="display:block;color:#fff;margin-bottom:12px"><div class="row between"><div><div class="k' + (GROUPS.indexOf(t.group) === 3 ? ' p' : '') + '">' + t.group + '</div><h3 style="margin-top:4px">' + t.full + '</h3></div><div style="text-align:right"><div class="big" style="font-size:30px">' + fmt(list[list.length - 1].main, t.metric.d) + '</div><div class="small dim">' + t.metric.unit + '</div></div></div>' +
          '<div class="small muted" style="margin-top:8px">' + list.length + ' prove · senza Elvy ' + (s.length ? fmt(A.mean(s.map((r) => r.main)), t.metric.d) : '—') + ' · con Elvy ' + (c.length ? fmt(A.mean(c.map((r) => r.main)), t.metric.d) : '—') + '</div></a>';
      }).join('') : say(IMG.point, 'Qui vedrai come cambiano i tuoi risultati nel tempo, con e senza Elvy. Fai il primo test!') + '<div class="actions"><a class="btn" href="#/test">Scegli un test</a></div>');
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
    $app.innerHTML = '<div class="head">' + backBtn() + '<div><div class="k">Progressi</div><h1>' + t.full + '</h1></div></div>' +
      (variants.length > 1 ? '<div class="seg" style="margin-bottom:12px">' + variants.map((x) => '<button type="button" data-v="' + esc(x) + '" aria-pressed="' + (x === v) + '">' + esc(x || 'tutti') + '</button>').join('') + '</div>' : '') +
      '<div class="card"><div class="row between"><h3>' + t.metric.label + (t.metric.unit ? ' (' + t.metric.unit + ')' : '') + '</h3><span class="small dim">' + (t.metric.better === 'low' ? 'più basso = meglio' : t.metric.better === 'high' ? 'più alto = meglio' : '') + '</span></div><div style="margin-top:12px">' + trend(list.slice(-30), t.metric) + '</div></div>' +
      '<div class="grid2" style="margin-top:12px">' + col('Senza Elvy', s, false) + col('Con Elvy', c, true) + '</div>' + diff +
      '<h3 class="sec">Tutte le prove</h3><div class="card tight"><ul class="hist">' + list.slice().reverse().map((r) =>
        '<li><a href="#/r/' + r.id + '" style="color:#fff;flex:1"><span class="small muted">' + dateShort(r.t) + ' ' + timeShort(r.t) + '</span><br>' + (r.cond === 'con' ? '<span class="tag con">con Elvy</span>' : '<span class="tag">senza</span>') + (r.demo ? ' <span class="tag demo">prova</span>' : '') + '</a><b>' + fmt(r.main, t.metric.d) + ' ' + t.metric.unit + '</b><button type="button" data-del="' + r.id + '" aria-label="Elimina">✕</button></li>').join('') + '</ul></div>' +
      '<div class="actions"><a class="btn" href="#/test/' + id + '">Nuova prova</a></div>';
    $app.querySelectorAll('[data-v]').forEach((b) => { b.onclick = () => { prefs['pv-' + id] = b.dataset.v; savePrefs(); renderProgressTest(id); }; });
    $app.querySelectorAll('[data-del]').forEach((b) => { b.onclick = () => { if (confirm('Eliminare questa prova?')) { saveResults(results().filter((r) => String(r.id) !== b.dataset.del)); renderProgressTest(id); } }; });
    bindCommon();
  }

  function renderProfile() {
    setTab('profilo');
    const n = results().length;
    $app.innerHTML = '<div class="top" style="align-items:center"><h1>Profilo</h1><img class="face" src="' + IMG.hi + '" alt="" /></div>' +
      '<div class="card"><label class="field" style="margin-top:0"><span>Nome</span><input id="p-name" value="' + esc(profile.name) + '" maxlength="30" /></label>' +
      '<label class="field"><span>Sport</span><input id="p-sport" value="' + esc(profile.sport) + '" maxlength="40" /></label>' +
      '<div class="grid2"><label class="field"><span>Peso (kg)</span><input id="p-mass" type="number" inputmode="decimal" value="' + (profile.mass || '') + '" /></label>' +
      '<label class="field"><span>Altezza (cm)</span><input id="p-height" type="number" inputmode="numeric" value="' + (profile.height || '') + '" /></label></div>' +
      '<label class="check"><input type="checkbox" id="p-voice"' + (profile.voice ? ' checked' : '') + ' /><span>Guida vocale durante i test</span></label>' +
      '<label class="check"><input type="checkbox" id="p-flip"' + (profile.flip ? ' checked' : '') + ' /><span>Corsa: inverti destra e sinistra (se il telefono è girato al contrario in cintura)</span></label>' +
      '<div class="actions"><button class="btn" id="p-save">Salva</button></div><p class="small" id="p-msg" style="color:var(--teal-l);margin-top:8px"></p></div>' +
      '<div class="card" style="margin-top:12px"><h3>Il tuo dispositivo</h3><div style="margin-top:14px">' + window.ElvyGate.deviceHtml(window.ElvyGate.paired()) + '</div>' +
      '<div class="row between" style="margin-top:14px"><span class="small muted">' + (device.on ? 'Applicato: ' + esc(device.where) + ' · da ' + durText(minsSince(device.since)) : 'Non applicato') + '</span>' + elvyPill() + '</div>' +
      '<button class="btn danger small" id="p-unpair" style="margin-top:14px">Scollega il dispositivo</button></div>' +
      '<div class="card" style="margin-top:12px"><h3>I tuoi dati</h3><p class="small muted" style="margin-top:6px">' + n + ' prove salvate solo su questo telefono.</p>' +
      '<div class="actions"><button class="btn ghost" id="p-csv"' + (n ? '' : ' disabled') + '>Esporta in CSV (Excel)</button><button class="btn danger" id="p-del"' + (n ? '' : ' disabled') + '>Cancella tutti i risultati</button></div></div>' +
      '<p class="note" style="margin-top:18px">Elvy · by Equistasi. Le misure sono stime fatte con i sensori dello smartphone, utili per l\'allenamento: non hanno valore clinico e non sostituiscono la valutazione di medici, fisioterapisti o preparatori. L\'eventuale beneficio di Equistasi varia da persona a persona.</p>' +
      '<p class="note" style="margin-top:8px"><a href="../">Equistasi Point</a> · <a href="https://equistasi.com" rel="noopener">equistasi.com</a></p>';
    document.getElementById('p-save').onclick = () => {
      profile.name = document.getElementById('p-name').value.trim();
      profile.sport = document.getElementById('p-sport').value.trim();
      const m = parseFloat(document.getElementById('p-mass').value); profile.mass = m >= 25 && m <= 200 ? m : null;
      const h = parseFloat(document.getElementById('p-height').value); profile.height = h >= 100 && h <= 230 ? h : null;
      profile.voice = document.getElementById('p-voice').checked; profile.flip = document.getElementById('p-flip').checked;
      S.setVoice(profile.voice); saveProfile();
      document.getElementById('p-msg').textContent = 'Salvato.';
    };
    document.getElementById('p-csv').onclick = exportCsv;
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
    window.scrollTo(0, 0);
    switch (parts[0]) {
      case 'test': return parts[1] ? renderTest(parts[1]) : renderTests();
      case 'r': return renderResult(parts[1]);
      case 'progressi': return parts[1] ? renderProgressTest(parts[1]) : renderProgress();
      case 'profilo': return renderProfile();
      default: return renderOggi();
    }
  }
  window.addEventListener('hashchange', route);
  route();

  window.Elvy = { TESTS, results, route };
})();
