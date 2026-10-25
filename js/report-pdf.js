/* Report della postura in PDF per il fisioterapista (jsPDF, caricato solo quando serve).
   EqReportPdf.make(data) → Promise<Blob>; EqReportPdf.deliver(blob, nome) → 'share' | 'download' | null.
   data: { name, date, stability: { value, area, vel, eyes, cond, date, diff } | null,
           rows: [{ label, unit, d, better, s: { v, n } | null, c: { v, n } | null }],
           chart: [{ v, con }], recent: [{ label, date, cond, val }],
           photos: [{ thumb, w, h, pts, lines, ref, title, metrics: [{ lab, val, note }] }], chair: [{ date, cond, val }] }
   Il PDF si crea sul telefono: nessun dato viene inviato. */
(function () {
  const LIB = 'js/vendor/jspdf/jspdf.umd.min.js';
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

  // Colori Equistasi
  const INDIGO = [41, 35, 92], DEEP = [27, 24, 64], YELLOW = [250, 220, 0], BLUE = [29, 113, 184];
  const INK = [22, 26, 51], MUTED = [93, 100, 128], LINE = [225, 229, 239], SOFT = [243, 245, 250];
  const GREEN = [31, 150, 80], RED = [200, 55, 45];

  async function make(data) {
    const { jsPDF } = await load();
    const logo = await dataUrl('img/logo.png');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 16, CW = W - 2 * M;
    let y = 0;
    const fill = (c) => doc.setFillColor(c[0], c[1], c[2]);
    const draw = (c) => doc.setDrawColor(c[0], c[1], c[2]);
    const ink = (c) => doc.setTextColor(c[0], c[1], c[2]);
    const font = (size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
    const text = (s, x, yy, o) => doc.text(String(s), x, yy, o);

    function header(first) {
      fill([255, 255, 255]); doc.rect(0, 0, W, H, 'F');
      if (logo) doc.addImage(logo, 'PNG', M, 10, 34, 34 * 107 / 471);
      font(9, false); ink(MUTED); text(T('Report Equistasi') + ' · ' + data.date, W - M, 15, { align: 'right' });
      y = 22;
      if (!first) { draw(LINE); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); y += 8; }
    }
    function footer(n, tot) {
      font(7.5, false); ink(MUTED);
      const note = doc.splitTextToSize(T('Valori stimati con i sensori e la fotocamera del telefono: indicativi, non diagnostici e non sostitutivi della valutazione clinica.'), CW - 30);
      text(note, M, H - 12);
      text(n + ' / ' + tot, W - M, H - 12, { align: 'right' });
    }
    function need(h) { if (y + h > H - 22) { doc.addPage(); header(false); } }
    function section(title) {
      need(16);
      fill(YELLOW); doc.roundedRect(M, y - 4.2, 2.2, 6, 1, 1, 'F');
      font(12.5, true); ink(INDIGO); text(title, M + 5, y);
      y += 7;
    }

    header(true);
    // titolo
    fill(INDIGO); doc.roundedRect(M, y, CW, 30, 4, 4, 'F');
    fill(YELLOW); doc.circle(W - M - 16, y + 15, 9, 'F'); fill(INDIGO); doc.circle(W - M - 16, y + 15, 6.5, 'F');
    font(18, true); ink([255, 255, 255]); text(T('Riepilogo delle misure'), M + 8, y + 12);
    font(10, false); ink([217, 215, 238]);
    text(T('Per il fisioterapista') + ' · ' + T('creato il {d}', { d: data.date }), M + 8, y + 19.5);
    if (data.name) text(T('Paziente: {n}', { n: data.name }), M + 8, y + 25.5);
    y += 40;

    // indice di stabilità
    if (data.stability) {
      const s = data.stability;
      section(T('Indice di stabilità'));
      need(36);
      fill(SOFT); doc.roundedRect(M, y, CW, 32, 3, 3, 'F');
      const cx = M + 18, cy = y + 16, r = 11;
      doc.setLineCap('round'); doc.setLineWidth(3.2); draw([223, 221, 240]); doc.circle(cx, cy, r, 'S');
      draw(INDIGO); const steps = Math.max(1, Math.round(60 * s.value / 100));
      for (let i = 0; i < steps; i++) {
        const a0 = -Math.PI / 2 + (i / 60) * 2 * Math.PI, a1 = -Math.PI / 2 + ((i + 1) / 60) * 2 * Math.PI;
        doc.line(cx + r * Math.cos(a0), cy + r * Math.sin(a0), cx + r * Math.cos(a1), cy + r * Math.sin(a1));
      }
      doc.setLineCap('butt'); doc.setLineWidth(0.2);
      font(15, true); ink(INDIGO); text(String(s.value), cx, cy + 1.5, { align: 'center' });
      font(6.5, false); ink(MUTED); text(T('su 100'), cx, cy + 5.5, { align: 'center' });
      font(11, true); ink(INK); text(T('Ultima misura: {d}', { d: s.date }), M + 36, y + 9);
      font(9.5, false); ink(MUTED);
      text(s.eyes + ' · ' + s.cond, M + 36, y + 15);
      text(T('Area di oscillazione {a} cm² · velocità media {v} mm/s', { a: s.area, v: s.vel }), M + 36, y + 21);
      if (s.diff != null) {
        const good = s.diff >= 0; ink(good ? GREEN : RED); font(9.5, true);
        text((s.diff > 0 ? '+' : '') + s.diff + ' ' + T('rispetto alla misura precedente'), M + 36, y + 27);
      }
      y += 40;
    }

    // tabella senza / con
    function table(title, rows, note) {
      if (!rows || !rows.some((r) => r.s || r.c)) return;
      section(title);
      const cols = [M, M + 78, M + 112, M + 146];
      need(12);
      fill(INDIGO); doc.roundedRect(M, y, CW, 8, 2, 2, 'F');
      font(8.5, true); ink([255, 255, 255]);
      text(T('Misura (media, n. prove)'), cols[0] + 3, y + 5.4); text(T('Senza'), cols[1] + 3, y + 5.4); text(T('Con Equistasi'), cols[2] + 3, y + 5.4); text(T('Variazione'), cols[3] + 3, y + 5.4);
      y += 8;
      rows.forEach((r, i) => {
        need(9);
        if (i % 2 === 0) { fill(SOFT); doc.rect(M, y, CW, 8.5, 'F'); }
        font(9, false); ink(INK); text(r.label, cols[0] + 3, y + 5.6);
        const val = (x) => (x ? x.v + ' ' + r.unit : '—');
        font(9, true); text(val(r.s), cols[1] + 3, y + 5.6); text(val(r.c), cols[2] + 3, y + 5.6);
        const ws = doc.getTextWidth(val(r.s)), wc = doc.getTextWidth(val(r.c));
        font(6.5, false); ink(MUTED);
        if (r.s) text('(' + r.s.n + ')', cols[1] + 4 + ws, y + 5.6);
        if (r.c) text('(' + r.c.n + ')', cols[2] + 4 + wc, y + 5.6);
        if (r.s && r.c && r.s.raw) {
          const pct = Math.round((r.c.raw - r.s.raw) / Math.abs(r.s.raw) * 100);
          const good = r.better === 'low' ? pct <= 0 : pct >= 0;
          font(9, true); ink(r.better ? (good ? GREEN : RED) : INK);
          text((pct > 0 ? '+' : '') + pct + '%', cols[3] + 3, y + 5.6);
        } else { font(9, false); ink(MUTED); text('—', cols[3] + 3, y + 5.6); }
        y += 8.5;
      });
      draw(LINE); doc.setLineWidth(0.3); doc.line(M, y, W - M, y);
      font(7.5, false); ink(MUTED);
      text(note, M, y + 5);
      y += 12;
    }
    table(T('Senza e con Equistasi'), data.rows, T('Verde: valore migliorato con Equistasi. Per l’oscillazione un valore più basso indica più stabilità.'));
    table(T('Test di progressi (sport)'), data.sport, T('Verde: valore migliorato con Equistasi (oscillazione e tempo più bassi, salto più alto).'));

    // grafico
    if (data.chart.length >= 2) {
      section(T('Andamento dell’indice di stabilità'));
      const ch = 46; need(ch + 10);
      const x0 = M + 10, x1 = W - M - 2, y0 = y + 2, y1 = y + ch;
      const vals = data.chart.map((p) => p.v);
      const lo = Math.max(0, Math.floor((Math.min(...vals) - 5) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...vals) + 5) / 10) * 10);
      const X = (i) => x0 + i * (x1 - x0) / (vals.length - 1);
      const Y = (v) => y1 - (v - lo) * (y1 - y0) / Math.max(1, hi - lo);
      font(7, false); ink(MUTED); draw(LINE); doc.setLineWidth(0.2);
      for (let v = lo; v <= hi; v += 10) { doc.line(x0, Y(v), x1, Y(v)); text(String(v), x0 - 2, Y(v) + 1, { align: 'right' }); }
      draw(INDIGO); doc.setLineWidth(0.8);
      for (let i = 1; i < vals.length; i++) doc.line(X(i - 1), Y(vals[i - 1]), X(i), Y(vals[i]));
      doc.setLineWidth(0.5);
      data.chart.forEach((p, i) => { fill(p.con ? YELLOW : [255, 255, 255]); draw(p.con ? DEEP : INDIGO); doc.circle(X(i), Y(p.v), p.con ? 1.5 : 1.2, 'FD'); });
      y = y1 + 6;
      fill([255, 255, 255]); draw(INDIGO); doc.circle(M + 12, y - 1, 1.2, 'FD'); font(8, false); ink(MUTED); text(T('Senza Equistasi'), M + 15, y);
      fill(YELLOW); draw(DEEP); doc.circle(M + 52, y - 1, 1.5, 'FD'); text(T('Con Equistasi'), M + 55, y);
      y += 8;
    }

    // ultime misure
    if (data.recent.length) {
      section(T('Ultime misure'));
      data.recent.forEach((r) => {
        need(8);
        font(9, true); ink(INK); text(r.label, M + 2, y + 4);
        font(8, false); ink(MUTED); text(r.date + ' · ' + r.cond, M + 2, y + 8);
        font(10, true); ink(INDIGO); text(r.val, W - M - 2, y + 5.5, { align: 'right' });
        draw(LINE); doc.setLineWidth(0.2); doc.line(M, y + 10.5, W - M, y + 10.5);
        y += 12;
      });
      y += 4;
    }

    // test della sedia (se ci sono prove)
    if (data.chair && data.chair.length) {
      section(T('Alzati dalla sedia'));
      data.chair.forEach((r) => {
        need(8);
        font(9, false); ink(MUTED); text(r.date + ' · ' + r.cond, M + 2, y + 4);
        font(10, true); ink(INDIGO); text(r.val, W - M - 2, y + 4, { align: 'right' });
        draw(LINE); doc.setLineWidth(0.2); doc.line(M, y + 6.5, W - M, y + 6.5);
        y += 8.5;
      });
      y += 4;
    }

    // strumenti per il professionista (noleggio prof): dolore, uso, goniometro, scoliometro
    (data.pro || []).forEach((gr) => {
      section(gr.title);
      gr.rows.forEach((r) => {
        font(9, false); ink(INK);
        const lines = doc.splitTextToSize(r.label, CW - (r.val ? 30 : 4));
        need(lines.length * 4.2 + 5);
        text(lines, M + 2, y + 4);
        if (r.val) { font(10, true); ink(INDIGO); text(r.val, W - M - 2, y + 4, { align: 'right' }); }
        y += lines.length * 4.2 + 2.5;
        draw(LINE); doc.setLineWidth(0.2); doc.line(M, y, W - M, y);
        y += 2.5;
      });
      y += 4;
    });

    // foto con i punti
    if (data.photos.length) {
      section(T('Foto della postura'));
      const gap = 6, colW = (CW - 2 * gap) / 3;
      for (let i = 0; i < data.photos.length; i += 3) {
        const row = data.photos.slice(i, i + 3);
        const hs = row.map((p) => Math.min(colW * p.h / p.w, 78));
        const rowH = Math.max(...hs) + 8 + Math.max(...row.map((p) => p.metrics.length)) * 8.5;
        need(rowH);
        row.forEach((p, j) => {
          const bh = hs[j]; const bw = bh * p.w / p.h; const bx = M + j * (colW + gap) + (colW - bw) / 2; const by = y;
          try { doc.addImage(p.thumb, 'JPEG', bx, by, bw, bh); } catch (e) { fill(SOFT); doc.rect(bx, by, bw, bh, 'F'); }
          const P = (k) => [bx + p.pts[k][0] * bw, by + p.pts[k][1] * bh];
          if (p.ref != null) { draw(BLUE); doc.setLineWidth(0.35); doc.setLineDashPattern([1.2, 1.2], 0); doc.line(bx + p.ref * bw, by, bx + p.ref * bw, by + bh); doc.setLineDashPattern([], 0); }
          draw(INDIGO); doc.setLineWidth(0.6);
          p.lines.forEach(([a, b]) => { const A = P(a), B = P(b); doc.line(A[0], A[1], B[0], B[1]); });
          fill(YELLOW); draw(DEEP); doc.setLineWidth(0.25);
          Object.keys(p.pts).forEach((k) => { const A = P(k); doc.circle(A[0], A[1], 0.9, 'FD'); });
          const tx = M + j * (colW + gap);
          font(8.5, true); ink(INK); text(p.title, tx, by + Math.max(...hs) + 5);
          p.metrics.forEach((m, k) => {
            const yy = by + Math.max(...hs) + 10.5 + k * 8.5;
            font(7.5, false); ink(MUTED); text(doc.splitTextToSize(m.lab, colW - 14)[0], tx, yy);
            font(8.5, true); ink(INDIGO); text(m.val, tx + colW, yy, { align: 'right' });
            font(6.8, false); ink(MUTED); text(m.note, tx, yy + 3.4);
          });
        });
        y += rowH + 4;
      }
    }

    const tot = doc.getNumberOfPages();
    for (let n = 1; n <= tot; n++) { doc.setPage(n); footer(n, tot); }
    return doc.output('blob');
  }

  function blobToBase64(blob) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
  }
  // App iPhone/Android: file nella cache e foglio di condivisione (Salva su File, Mail, WhatsApp…).
  // Web: condivisione del file se il browser la permette, altrimenti download.
  async function deliver(blob, name, preferDownload) {
    const C = window.Capacitor; const P = (C && C.Plugins) || {};
    if (C && C.isNativePlatform && C.isNativePlatform() && P.Filesystem && P.Share) {
      const w = await P.Filesystem.writeFile({ path: name, data: await blobToBase64(blob), directory: 'CACHE' });
      try { await P.Share.share({ title: T('Report postura Equistasi'), files: [w.uri], dialogTitle: T('Condividi il report') }); } catch (e) { /* annullato */ }
      return 'share';
    }
    const file = typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null;
    if (!preferDownload && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: T('Report postura Equistasi') }); return 'share'; } catch (e) { if (e && e.name === 'AbortError') return null; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return 'download';
  }

  window.EqReportPdf = { make, deliver, load };
})();
