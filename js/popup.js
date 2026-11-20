/* Pop-up all'apertura dell'app, gestiti dall'ufficio su app.equistasi.com/admin/ (tabella Supabase «popups»).
   - kind 'popup': messaggio con foto, pulsante (shop, video…) e codice sconto da copiare.
   - kind 'advent': calendario dell'Avvento a 24 caselle; la casella N si apre dal giorno «starts_at» + N-1 (ora italiana).
   - audience: 'none' = solo chi non ha ancora abbinato un dispositivo (anche sulla schermata «Attiva l'app»),
     'device' = chi ha un dispositivo (tutti i tipi), 'all' = tutti.
   - frequency: 'always' = a ogni apertura, 'daily' = una volta al giorno, 'once' = una volta sola.
   - A ogni apertura al massimo un pop-up: prima il calendario dell'Avvento, poi il più recente.
   - Si aspetta che non ci siano altre finestre aperte (abbinamento, tutorial, profilo, avvertenze).
   - Conteggi anonimi: visto / casella aperta / clic sul pulsante (solo il codice casuale del telefono). */
(function () {
  const T = (s, o) => (window.T ? window.T(s, o) : s);
  const raw = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safeUrl = (u) => (/^https:\/\//i.test(u || '') ? u : '');
  const cfg = () => window.APP_CONFIG || {};
  const platform = () => { const C = window.Capacitor; return C && C.getPlatform ? C.getPlatform() : 'web'; };
  const paired = () => !!raw('tp-serial');
  // giorno in Italia, come 'AAAA-MM-GG'
  const romeDay = (t) => { try { return new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }); } catch (e) { return new Date(t).toISOString().slice(0, 10); } };

  function rpc(name, body) {
    const c = cfg(); const ph = raw('eq-phone-id');
    if (!(c.supabaseUrl && c.pointKey) || !ph) return;
    fetch(c.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/' + name, {
      method: 'POST', headers: { apikey: c.pointKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign({ p_phone: ph, p_platform: platform() }, body)), cache: 'no-store', keepalive: true,
    }).catch(() => { /* senza rete: pazienza */ });
  }

  async function load() {
    const c = cfg();
    if (!(c.supabaseUrl && c.pointKey)) return [];
    try {
      const r = await fetch(c.supabaseUrl.replace(/\/$/, '') + '/rest/v1/popups?select=*&order=created_at.desc&limit=20',
        { headers: { apikey: c.pointKey }, cache: 'no-store' });
      if (!r.ok) throw new Error('net');
      const d = await r.json();
      put('tp-popups', JSON.stringify(Array.isArray(d) ? d : []));
      return Array.isArray(d) ? d : [];
    } catch (e) { try { return JSON.parse(raw('tp-popups') || '[]'); } catch (e2) { return []; } }
  }

  function shownLog() { try { return JSON.parse(raw('tp-popup-shown') || '{}'); } catch (e) { return {}; } }
  function eligible(p) {
    const now = Date.now();
    if (new Date(p.starts_at).getTime() > now || (p.ends_at && new Date(p.ends_at).getTime() <= now)) return false;
    if (p.audience === 'none' && paired()) return false;
    if (p.audience === 'device' && !paired()) return false;
    const last = shownLog()[p.id];
    if (p.frequency === 'once' && last) return false;
    if (p.frequency === 'daily' && last && romeDay(last) === romeDay(now)) return false;
    return true;
  }
  function pick(list) {
    const ok = list.filter(eligible);
    return ok.find((p) => p.kind === 'advent') || ok[0] || null;
  }

  // altre finestre aperte: si aspetta che si chiudano
  function busy() {
    if (document.querySelector('.pair, .tut, .scan, .zoom-ov, .pz-cam, .pz-live')) return true;
    const vis = (id) => { const el = document.getElementById(id); return el && !el.hidden; };
    return vis('disclaimer') || vis('onboard') || vis('paired') || vis('acct-sheet') || !!document.getElementById('popup-ov');
  }

  let ov = null; let current = null;
  function close() { if (ov) { ov.remove(); ov = null; document.body.classList.remove('popup-open'); } }

  function couponHtml(code) {
    return code ? '<div class="pop-coupon"><span>' + T('Codice sconto') + '</span><b>' + esc(code) + '</b><button type="button" class="btn" data-pop-copy="' + esc(code) + '">' + T('Copia') + '</button></div>' : '';
  }
  function linkHtml(x, door) {
    const link = safeUrl(x.link_url);
    return link ? '<a class="btn primary pop-btn" href="' + esc(link) + '" target="_blank" rel="noopener" data-pop-click="' + door + '">' + esc(x.link_label || T('Scopri di più')) + ' ›</a>' : '';
  }
  function contentHtml(x, door) {
    const img = safeUrl(x.image_url);
    return (img ? '<img class="pop-img" src="' + esc(img) + '" alt="" />' : '') + '<h2 class="pop-title">' + esc(x.title || '') + '</h2>' +
      (x.body ? '<p class="pop-body">' + esc(x.body) + '</p>' : '') + couponHtml(x.coupon) + linkHtml(x, door);
  }

  // calendario: la casella N si apre dal giorno di inizio + N-1
  function doorDay(p, n) { const d = new Date(romeDay(p.starts_at) + 'T12:00:00'); d.setDate(d.getDate() + n - 1); return romeDay(d.getTime()); }
  function adventGrid(p) {
    const today = romeDay(Date.now()); const opened = (() => { try { return JSON.parse(raw('tp-advent-' + p.id) || '[]'); } catch (e) { return []; } })();
    const doors = Array.isArray(p.doors) ? p.doors : [];
    let cells = '';
    for (let n = 1; n <= 24; n++) {
      const day = doorDay(p, n); const open = day <= today; const isToday = day === today;
      const has = doors[n - 1] && doors[n - 1].title;
      cells += '<button type="button" class="adv-door' + (isToday ? ' today' : '') + (open && has ? '' : ' locked') + (opened.includes(n) ? ' seen' : '') + '"' +
        (open && has ? ' data-adv-door="' + n + '"' : ' disabled') + ' aria-label="' + T('Casella {n}', { n }) + '"><span>' + n + '</span>' + (open ? '' : '<i aria-hidden="true">🔒</i>') + '</button>';
    }
    return '<div class="adv-head"><span aria-hidden="true">🎄</span><h2 class="pop-title">' + esc(p.title) + '</h2>' + (p.body ? '<p class="pop-body">' + esc(p.body) + '</p>' : '') +
      '<p class="small muted">' + T('Tocca la casella di oggi per scoprire la sorpresa.') + '</p></div><div class="adv-grid">' + cells + '</div>';
  }

  function show(p) {
    current = p;
    ov = document.createElement('div'); ov.id = 'popup-ov'; ov.className = 'pop-ov' + (p.kind === 'advent' ? ' advent' : '');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', p.title);
    ov.innerHTML = '<div class="pop-card"><button type="button" class="pop-x" data-pop-close aria-label="' + T('Chiudi') + '">✕</button><div class="pop-inner">' +
      (p.kind === 'advent' ? adventGrid(p) : contentHtml(p, 0)) + '</div></div>';
    document.body.appendChild(ov); document.body.classList.add('popup-open');
    const log = shownLog(); log[p.id] = Date.now(); put('tp-popup-shown', JSON.stringify(log));
    rpc('popup_seen', { p_id: p.id, p_door: 0 });
  }

  document.addEventListener('click', (e) => {
    if (!ov) return;
    const t = e.target;
    if (t.closest('[data-pop-close]') || t === ov) { close(); return; }
    const copy = t.closest('[data-pop-copy]');
    if (copy) {
      const code = copy.getAttribute('data-pop-copy');
      const done = () => { copy.textContent = T('Copiato ✓'); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, done); else done();
      return;
    }
    const link = t.closest('[data-pop-click]');
    if (link && current) { rpc('popup_click', { p_id: current.id, p_door: Number(link.getAttribute('data-pop-click')) || 0 }); return; }
    const door = t.closest('[data-adv-door]');
    if (door && current) {
      const n = Number(door.getAttribute('data-adv-door')); const x = (current.doors || [])[n - 1] || {};
      const key = 'tp-advent-' + current.id; let opened = []; try { opened = JSON.parse(raw(key) || '[]'); } catch (er) { opened = []; }
      if (!opened.includes(n)) { opened.push(n); put(key, JSON.stringify(opened)); }
      rpc('popup_seen', { p_id: current.id, p_door: n });
      ov.querySelector('.pop-inner').innerHTML = '<div class="adv-day">' + T('Giorno {n}', { n }) + '</div>' + contentHtml(x, n) +
        '<button type="button" class="btn pop-back" data-adv-back>‹ ' + T('Torna al calendario') + '</button>';
      return;
    }
    if (t.closest('[data-adv-back]') && current) ov.querySelector('.pop-inner').innerHTML = adventGrid(current);
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ov) close(); });

  // all'apertura: scarica, sceglie, aspetta che lo schermo sia libero (al massimo 2 minuti)
  async function run() {
    const p = pick(await load());
    if (!p) return;
    let tries = 0;
    const tick = () => {
      if (ov) return;
      if (!busy()) { if (eligible(p)) show(p); return; }
      if (++tries < 120) setTimeout(tick, 1000);
    };
    setTimeout(tick, 1500);
  }
  // riaperture dell'app (torna in primo piano dopo almeno 10 minuti)
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 10 * 60e3) { hiddenAt = 0; run(); }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();

  window.EqPopup = { run, close };
})();
