/* Calibrazione annuale del dispositivo: una barra che scorre per un anno.
   - Parte dal giorno in cui il dispositivo viene attivato nell'app (abbinamento del numero di serie).
   - Se su Airtable (tabella calibrazioni) c'è una calibrazione registrata per quel seriale, usa la sua
     «data prossima calibrazione»: dopo ogni nuova calibrazione la barra riparte da sola.
   - A zero: «È ora di mandarlo a calibrare»; con «Calibrato: riparti» la barra ricomincia da oggi.
   - Nell'app per iPhone/Android: notifica 30 giorni prima e il giorno della scadenza. */
(function () {
  const raw = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } };
  const DAY = 864e5;
  const pad = (n) => String(n).padStart(2, '0');
  const dstr = (t) => { const d = new Date(t); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const plusYear = (t) => { const d = new Date(t); d.setFullYear(d.getFullYear() + 1); return d.getTime(); };
  const LN = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() &&
    window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;

  // dopo la verifica del seriale: data di attivazione e data della prossima calibrazione da Airtable
  function update(serial, cal) {
    if (!serial) return;
    if (raw('tp-act-sn') !== serial) { put('tp-act', String(Date.now())); put('tp-act-sn', serial); put('tp-cal-reset', ''); }
    put('tp-cal-next', /^\d{4}-\d{2}-\d{2}$/.test(cal || '') ? cal : '');
    schedule();
  }

  function info() {
    const act = Number(raw('tp-act')) || 0;
    if (!act) return null;
    const reset = Number(raw('tp-cal-reset')) || 0;
    const next = raw('tp-cal-next');
    let end; let from;
    const airEnd = next ? new Date(next + 'T09:00:00').getTime() : 0;
    if (airEnd && (!reset || airEnd > reset + 30 * DAY)) { end = airEnd; from = 'airtable'; }
    else { end = plusYear(reset || act); from = reset ? 'reset' : 'act'; }
    const start = from === 'airtable' ? new Date(end).setFullYear(new Date(end).getFullYear() - 1) : (reset || act);
    const days = Math.ceil((end - Date.now()) / DAY);
    return { start, end, days, frac: Math.min(1, Math.max(0, (Date.now() - start) / (end - start))), from };
  }

  function cardHtml(compact) {
    const i = info();
    if (!i) return '';
    const due = i.days <= 0; const soon = !due && i.days <= 30;
    const cls = due ? ' due' : soon ? ' soon' : '';
    const src = i.from === 'airtable' ? T('Dall’ultima calibrazione registrata da Equistasi') : i.from === 'reset' ? T('Dalla calibrazione del {d}', { d: dstr(i.start) }) : T('Dall’attivazione del dispositivo, il {d}', { d: dstr(i.start) });
    return '<div class="card cal-card' + cls + '"><div class="cal-top"><span class="cal-ico" aria-hidden="true">🛠️</span><div><b>' + T('Calibrazione del dispositivo') + '</b><br>' +
      '<span class="small">' + (due ? T('<b>È ora di mandarlo a calibrare</b>') : T('Mancano <b>{n} giorni</b> · calibrazione entro il {d}', { n: i.days, d: dstr(i.end) })) + '</span></div></div>' +
      '<div class="cal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(i.frac * 100) + '" aria-label="' + T('Anno di utilizzo prima della calibrazione') + '"><i style="width:' + (100 - i.frac * 100).toFixed(1) + '%"></i></div>' +
      (compact ? '' : '<p class="small muted" style="margin:6px 0 0">' + src + '. ' + (due || soon ? T('Contatta Equistasi per organizzare la calibrazione.') : T('Ogni anno il dispositivo va mandato a calibrare.')) + '</p>') +
      (due ? '<button type="button" class="btn" data-cal-reset>' + T('Il dispositivo è stato calibrato: riparti') + '</button>' : '') + '</div>';
  }
  // in Home solo quando mancano 30 giorni o meno
  const bannerHtml = () => { const i = info(); return i && i.days <= 30 ? cardHtml(true) : ''; };

  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-cal-reset]')) return;
    if (!confirm(T('Il dispositivo è tornato dalla calibrazione? La barra riparte da oggi per un anno.'))) return;
    put('tp-cal-reset', String(Date.now())); schedule();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  // notifiche locali: 30 giorni prima e il giorno della scadenza (solo app per iPhone/Android)
  async function schedule() {
    const ln = LN(); const i = info();
    if (!ln) return;
    try { await ln.cancel({ notifications: [{ id: 4001 }, { id: 4002 }] }); } catch (e) { /* nessuna */ }
    if (!i) return;
    const list = [];
    if (i.end - 30 * DAY > Date.now()) list.push({ id: 4002, title: T('Calibrazione tra 30 giorni'), body: T('Tra un mese il dispositivo Equistasi va mandato a calibrare.'), schedule: { at: new Date(i.end - 30 * DAY), allowWhileIdle: true } });
    if (i.end > Date.now()) list.push({ id: 4001, title: T('È ora di mandare il dispositivo a calibrare'), body: T('È passato un anno: manda il dispositivo Equistasi a calibrare.'), schedule: { at: new Date(i.end), allowWhileIdle: true } });
    if (list.length) { try { await ln.schedule({ notifications: list }); } catch (e) { /* permessi mancanti */ } }
  }

  window.EqCalib = { update, info, cardHtml, bannerHtml };
})();
