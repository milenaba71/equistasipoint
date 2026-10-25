/* Elvy · report in PDF da salvare o condividere (jsPDF, caricato solo quando serve).
   ElvyReport.make(data) → Promise<Blob>; ElvyReport.deliver(blob, nome, 'save' | 'share').
   Il PDF si crea sul telefono: nessun dato viene inviato.
   data: { name, sport, serial, period, date,
           kpi: { tests, comparisons, better, recovery },
           effect: [{ name, n, pct, good }],
           tests: [{ name, group, label, unit, d, better, n, last, best, s: { avg, n } | null, c: { avg, n } | null, series: [{ v, con }] }],
           hrv: { rmssd, hr, score, series: [number] } | null } */
(function () {
  // librerie nella cartella vendor accanto a scan.js (js/vendor/jspdf)
  const scanSrc = (document.querySelector('script[src*="scan.js"]') || {}).src || location.href;
  const LIB = new URL('vendor/jspdf/jspdf.umd.min.js', new URL('./', scanSrc)).href;
  let lib = null;
  function load() {
    if (window.jspdf) return Promise.resolve(window.jspdf);
    if (!lib) {
      lib = new Promise((res, rej) => {
        const s = document.createElement('script'); s.src = LIB;
        s.onload = () => (window.jspdf ? res(window.jspdf) : rej(new Error('lib')));
        s.onerror = () => rej(new Error('lib'));
        document.head.appendChild(s);
      });
      lib.catch(() => { lib = null; });
    }
    return lib;
  }
  function dataUrl(src) {
    return fetch(src).then((r) => r.blob()).then((b) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(b); })).catch(() => null);
  }
  // I caratteri standard del PDF non hanno alcuni simboli: li sostituisco
  const clean = (s) => String(s == null ? '' : s).replace(/[−–]/g, '-').replace(/≈/g, '~').replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/[✓♥▍]/g, '');
  const fmt = (v, d = 1) => (v == null || !isFinite(v) ? '-' : Number(v).toLocaleString('it-IT', { minimumFractionDigits: d, maximumFractionDigits: d }));
  const pct = (p) => (p == null || !isFinite(p) ? '-' : (p >= 0 ? '+' : '-') + fmt(Math.abs(p), Math.abs(p) < 10 ? 1 : 0) + '%');

  // Colori Elvy
  const DARK = [36, 38, 45], DARK2 = [56, 56, 62], TEAL = [75, 166, 163], TEAL_L = [127, 214, 209], PURPLE = [125, 78, 183], PURPLE_L = [196, 166, 242];
  const GREEN = [126, 205, 58], INK = [30, 30, 36], MUTED = [112, 112, 122], SOFT = [244, 244, 247], LINE = [226, 226, 232], RED = [214, 92, 82], GREY = [160, 160, 168];

  async function make(data) {
    const { jsPDF } = await load();
    const [logo, logoEq, mascot] = await Promise.all([dataUrl('img/logo-elvy.png'), dataUrl('img/logo-equistasi.png'), dataUrl('img/mascotte-report.jpg')]);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 15, CW = W - 2 * M, FOOT = 26;
    let y = 0;
    const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
    const draw = (c) => doc.setDrawColor(c[0], c[1], c[2]);
    const ink = (c) => doc.setTextColor(c[0], c[1], c[2]);
    const font = (size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
    const text = (s, x, yy, o) => doc.text(Array.isArray(s) ? s.map(clean) : clean(s), x, yy, o);
    const alpha = (a) => { try { doc.setGState(new doc.GState({ opacity: a })); } catch (e) { /* trasparenza non disponibile */ } };
    const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
    const logoW = (w) => [w, w * 268 / 520]; // proporzioni di img/logo-elvy.png

    // Testata: grande sulla prima pagina, sottile sulle altre
    function header(first) {
      fill([255, 255, 255]); doc.rect(0, 0, W, H, 'F');
      const hh = first ? 78 : 20;
      fill(DARK); doc.rect(0, 0, W, hh, 'F');
      // mascotte sotto gli aloni, così i bordi dell'immagine spariscono nella luce
      if (first && mascot) { try { doc.addImage(mascot, 'JPEG', W - M - 66, 4, 66, 66 * 385 / 520); } catch (e) { /* immagine non disponibile */ } }
      // aloni verde acqua e viola, come lo schermo della mascotte
      alpha(0.16); fill(TEAL); doc.circle(W - 38, first ? 30 : 6, first ? 46 : 18, 'F');
      fill(PURPLE); doc.circle(W - 6, first ? 62 : 16, first ? 38 : 16, 'F'); alpha(1);
      fill([255, 255, 255]); doc.rect(0, hh, W, H - hh, 'F'); // gli aloni restano dentro la testata
      // linea di colore sotto la testata
      for (let i = 0; i < 60; i++) { fill(mix(TEAL, PURPLE, i / 59)); doc.rect((W / 60) * i, hh, W / 60 + 0.2, 1.4, 'F'); }
      if (first) {
        if (logo) { const [lw, lh] = logoW(44); doc.addImage(logo, 'PNG', M, 12, lw, lh); }
        font(22, true); ink([255, 255, 255]); text('Report di allenamento', M, 49);
        font(11, false); ink([214, 214, 220]);
        text([data.name || 'Atleta', data.sport].filter(Boolean).join(' · '), M, 57);
        font(9, false); ink([170, 170, 180]);
        text('Periodo: ' + data.period + '   ·   creato il ' + data.date + (data.serial ? '   ·   dispositivo ' + data.serial : ''), M, 64);
        y = hh + 10;
      } else {
        if (logo) { const [lw, lh] = logoW(22); doc.addImage(logo, 'PNG', M, 4.5, lw, lh); }
        font(8.5, false); ink([200, 200, 208]); text('Report di allenamento · ' + (data.name || '') + ' · ' + data.period, W - M, 12, { align: 'right' });
        y = hh + 9;
      }
    }
    // Piè di pagina: Elvy di proprietà di Equistasi, logo Equistasi piccolo, avviso non diagnostico
    function footer(n, tot) {
      const fy = H - FOOT + 3;
      for (let i = 0; i < 60; i++) { fill(mix(TEAL, PURPLE, i / 59)); doc.rect(M + (CW / 60) * i, fy, CW / 60 + 0.1, 0.6, 'F'); }
      if (logoEq) doc.addImage(logoEq, 'PNG', M, fy + 4, 24, 24 * 68 / 300);
      font(7.4, true); ink(INK);
      text('Elvy, l\'app Elvy e il dispositivo Elvy sono prodotti di proprietà di Equistasi S.r.l. · equistasi.com', M + 28, fy + 6.2);
      font(6.6, false); ink(MUTED);
      text(doc.splitTextToSize('Dati stimati con i sensori dello smartphone (accelerometro, giroscopio, fotocamera, GPS) e, se collegati, con fascia o orologio. Sono indicativi, utili per l\'allenamento: non hanno valore diagnostico e non sostituiscono la valutazione di medici, fisioterapisti o preparatori. L\'eventuale beneficio di Equistasi varia da persona a persona.', CW - 44), M + 28, fy + 10);
      font(7.5, true); ink(MUTED); text(n + ' / ' + tot, W - M, fy + 6.2, { align: 'right' });
    }
    function need(h) { if (y + h > H - FOOT - 4) { doc.addPage(); header(false); } }
    function section(title, sub) {
      y += 3;
      need(18);
      fill(TEAL); doc.roundedRect(M, y - 4.2, 2.2, 6.2, 1, 1, 'F');
      font(13.5, true); ink(INK); text(title, M + 5, y + 0.6);
      if (sub) { font(8.5, false); ink(MUTED); text(sub, W - M, y + 0.6, { align: 'right' }); }
      y += 8;
    }
    // pillola colorata con la differenza
    function pill(x, yy, s, good) {
      const col = good ? TEAL : good === false ? RED : GREY;
      font(8.5, true); const w = doc.getTextWidth(clean(s)) + 6;
      fill(col); doc.roundedRect(x - w, yy - 4.2, w, 6, 3, 3, 'F');
      ink([255, 255, 255]); text(s, x - w / 2, yy, { align: 'center' });
    }

    header(true);

    // Riquadri di sintesi
    const k = data.kpi; const kw = (CW - 3 * 5) / 4;
    [['Test fatti', fmt(k.tests, 0), 'nel periodo', TEAL], ['Confronti', fmt(k.comparisons, 0), 'senza / con Elvy', PURPLE], ['Meglio con Elvy', fmt(k.better, 0), k.comparisons ? 'su ' + k.comparisons + ' confronti' : 'nessun confronto', GREEN],
      ['Recupero', k.recovery != null ? fmt(k.recovery, 0) : '-', k.recovery != null ? 'su 100, ultima misura' : 'misura HRV', TEAL_L]].forEach(([l, v, s, c], i) => {
      const x = M + i * (kw + 5);
      fill(SOFT); doc.roundedRect(x, y, kw, 27, 4, 4, 'F');
      fill(c); doc.roundedRect(x, y, kw, 2.2, 1, 1, 'F');
      font(8, true); ink(MUTED); text(l.toUpperCase(), x + 4, y + 8.5);
      font(20, true); ink(INK); text(v, x + 4, y + 19);
      font(7.5, false); ink(MUTED); text(s, x + 4, y + 24);
    });
    y += 35;

    // Avviso ben visibile
    fill([243, 238, 252]); doc.roundedRect(M, y, CW, 15, 3, 3, 'F');
    font(8.4, true); ink(PURPLE); text('Da sapere', M + 5, y + 5.8);
    font(8, false); ink([70, 62, 92]);
    text(doc.splitTextToSize('Le misure sono fatte con i sensori del telefono: sono stime per l\'allenamento, non dati diagnostici. Confronta sempre prove fatte con lo stesso telefono, nella stessa posizione e con lo stesso protocollo.', CW - 32), M + 26, y + 5.8);
    y += 23;

    // Effetto di Elvy per test
    if (data.effect.length) {
      section('Con e senza Elvy', 'media delle differenze nei confronti');
      const maxAbs = Math.max(5, ...data.effect.map((e) => Math.abs(e.pct)));
      data.effect.forEach((e) => {
        need(11);
        font(9.5, true); ink(INK); text(e.name, M, y + 1);
        font(7.5, false); ink(MUTED); text(e.n + (e.n === 1 ? ' confronto' : ' confronti'), M, y + 5);
        // barra centrata sullo zero: verso destra = meglio con Elvy
        const bx = M + 78, bw = 70, mid = bx + bw / 2;
        fill(SOFT); doc.roundedRect(bx, y - 2.2, bw, 4.6, 2.3, 2.3, 'F');
        draw(LINE); doc.setLineWidth(0.3); doc.line(mid, y - 3.4, mid, y + 3.6);
        const len = (Math.abs(e.pct) / maxAbs) * (bw / 2 - 1);
        const dir = e.good === false ? -1 : e.good ? 1 : e.pct >= 0 ? 1 : -1;
        fill(e.good ? TEAL : e.good === false ? RED : GREY);
        if (len > 0.4) doc.roundedRect(dir > 0 ? mid : mid - len, y - 2.2, len, 4.6, 2.3, 2.3, 'F');
        pill(W - M, y + 1.4, pct(e.pct), e.good);
        y += 11;
      });
      font(7.2, false); ink(MUTED); text('Verso destra = meglio con Elvy (secondo il verso di ogni misura). Sotto il 3% la differenza è considerata trascurabile.', M, y); y += 9;
    }

    // Risultati di ogni test
    if (data.tests.length) {
      section('I tuoi test', 'senza Elvy (grigio) · con Elvy (verde acqua)');
      data.tests.forEach((t) => {
        need(44);
        fill(SOFT); doc.roundedRect(M, y, CW, 38, 4, 4, 'F');
        font(7.5, true); ink(t.group === 'Recupero' ? PURPLE : TEAL); text(t.group.toUpperCase(), M + 5, y + 7);
        font(12, true); ink(INK); text(t.name, M + 5, y + 13.5);
        font(8, false); ink(MUTED); text(t.label + (t.unit ? ' (' + t.unit + ')' : '') + (t.better === 'low' ? ' · più basso è meglio' : t.better === 'high' ? ' · più alto è meglio' : '') + ' · ' + t.n + (t.n === 1 ? ' prova' : ' prove'), M + 5, y + 18.5);
        // barre senza / con
        const vals = [t.s && t.s.avg, t.c && t.c.avg].filter((v) => v != null && isFinite(v));
        const mx = Math.max(...vals, 1e-9);
        [['Senza Elvy', t.s, GREY], ['Con Elvy', t.c, TEAL]].forEach(([l, x, c], i) => {
          const yy = y + 25 + i * 6.5;
          font(7.5, false); ink(MUTED); text(l, M + 5, yy + 1.2);
          fill([255, 255, 255]); doc.roundedRect(M + 26, yy - 2, 58, 3.6, 1.8, 1.8, 'F');
          if (x && x.avg != null) { fill(c); doc.roundedRect(M + 26, yy - 2, Math.max(2, (x.avg / mx) * 58), 3.6, 1.8, 1.8, 'F'); }
          font(8.5, true); ink(INK); text(x && x.avg != null ? fmt(x.avg, t.d) + (x.n > 1 ? '  (media di ' + x.n + ')' : '') : '-', M + 87, yy + 1.2);
        });
        // ultima e migliore
        font(7.5, true); ink(MUTED); text('ULTIMA', M + 120, y + 8); text('MIGLIORE', M + 150, y + 8);
        font(15, true); ink(INK); text(fmt(t.last, t.d), M + 120, y + 15.5); ink(TEAL); text(fmt(t.best, t.d), M + 150, y + 15.5);
        // andamento: puntini grigi senza, verde acqua con Elvy
        const sx = M + 120, sw = CW - 125, sy = y + 22, sh = 12;
        const sv = t.series.map((p) => p.v); const lo = Math.min(...sv), hi = Math.max(...sv); const span = hi - lo || 1;
        const X = (i) => (t.series.length === 1 ? sx + sw / 2 : sx + (i / (t.series.length - 1)) * sw);
        const Y = (v) => sy + sh - ((v - lo) / span) * sh;
        draw(GREY); doc.setLineWidth(0.35);
        for (let i = 1; i < t.series.length; i++) doc.line(X(i - 1), Y(t.series[i - 1].v), X(i), Y(t.series[i].v));
        t.series.forEach((p, i) => { fill(p.con ? TEAL : GREY); doc.circle(X(i), Y(p.v), 1.1, 'F'); });
        y += 43;
      });
    }

    // Recupero
    if (data.hrv) {
      section('Recupero (HRV)', 'dito sulla fotocamera o fascia cardio');
      need(30);
      fill([240, 251, 250]); doc.roundedRect(M, y, CW, 26, 4, 4, 'F');
      font(8, true); ink(MUTED); text('HRV (RMSSD)', M + 5, y + 7); text('BATTITO A RIPOSO', M + 48, y + 7); text('RECUPERO', M + 96, y + 7);
      font(16, true); ink(INK); text(fmt(data.hrv.rmssd, 0) + ' ms', M + 5, y + 16); text(fmt(data.hrv.hr, 0) + ' bpm', M + 48, y + 16);
      ink(TEAL); text(data.hrv.score != null ? fmt(data.hrv.score, 0) + ' / 100' : '-', M + 96, y + 16);
      const s = data.hrv.series; if (s.length > 1) {
        const sx = M + 135, sw = CW - 140, sy = y + 6, sh = 14; const lo = Math.min(...s), hi = Math.max(...s); const sp = hi - lo || 1;
        draw(TEAL); doc.setLineWidth(0.6);
        for (let i = 1; i < s.length; i++) doc.line(sx + ((i - 1) / (s.length - 1)) * sw, sy + sh - ((s[i - 1] - lo) / sp) * sh, sx + (i / (s.length - 1)) * sw, sy + sh - ((s[i] - lo) / sp) * sh);
      }
      font(7.2, false); ink(MUTED); text('Più alta rispetto al tuo solito = corpo più recuperato. Misura sempre appena sveglio, nella stessa posizione.', M + 5, y + 22.5);
      y += 32;
    }

    const tot = doc.getNumberOfPages();
    for (let n = 1; n <= tot; n++) { doc.setPage(n); footer(n, tot); }
    return doc.output('blob');
  }

  // Salva (scarica il file) o condividi (WhatsApp, Mail, File… se il telefono lo permette)
  async function deliver(blob, name, how) {
    const file = typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null;
    if (how === 'share' && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Report Elvy', text: 'Il mio report di allenamento Elvy' }); return 'share'; } catch (e) { if (e && e.name === 'AbortError') return null; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
    return 'download';
  }

  window.ElvyReport = { make, deliver };
})();
