/* Novità di Equistasi nell'app.
   - Le scrive l'ufficio da app.equistasi.com/admin/ (tabella Supabase «news»); qui si leggono solo quelle pubblicate e non scadute.
   - Si scaricano al massimo una volta ogni ora e restano salvate sul telefono (funziona anche senza rete).
   - Ognuna può essere per tutti o solo per certi tipi di dispositivo (silicon, gel, prof, rent: vedi js/access.js).
   - In Home: riquadro «Nuovo» con l'ultima novità non ancora letta; pagina #/novita con tutte. */
(function () {
  const T = (s, o) => (window.T ? window.T(s, o) : s);
  const raw = (k) => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* storage non disponibile */ } };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const safeUrl = (u) => (/^https:\/\//i.test(u || '') ? u : '');
  const HOUR = 36e5;
  const cfg = () => window.APP_CONFIG || {};

  function cached() { try { return JSON.parse(raw('tp-news') || '[]'); } catch (e) { return []; } }
  function seen() { try { return JSON.parse(raw('tp-news-seen') || '[]'); } catch (e) { return []; } }

  // solo quelle per tutti o per il tipo di dispositivo di questo telefono, non scadute
  function list() {
    const kind = raw('tp-kind');
    const now = Date.now();
    return cached().filter((n) => {
      const a = Array.isArray(n.audience) ? n.audience : ['all'];
      if (!(a.includes('all') || (kind && a.includes(kind)))) return false;
      return !n.expires_at || new Date(n.expires_at).getTime() > now;
    });
  }
  const unseen = () => { const s = seen(); return list().filter((n) => !s.includes(n.id)); };
  function markSeen() { put('tp-news-seen', JSON.stringify(list().map((n) => n.id).concat(seen()).slice(0, 200))); }

  async function refresh(force) {
    const c = cfg();
    if (!(c.supabaseUrl && c.pointKey)) return;
    if (!force && Date.now() - Number(raw('tp-news-at') || 0) < HOUR) return;
    try {
      const r = await fetch(c.supabaseUrl.replace(/\/$/, '') + '/rest/v1/news?select=id,title,body,image_url,link_url,link_label,audience,publish_at,expires_at&order=publish_at.desc&limit=20',
        { headers: { apikey: c.pointKey }, cache: 'no-store' });
      if (!r.ok) return;
      const before = unseen().length;
      const data = await r.json();
      put('tp-news', JSON.stringify(Array.isArray(data) ? data : []));
      put('tp-news-at', String(Date.now()));
      // c'è una novità nuova e si è in Home: ridisegna
      if (unseen().length !== before && /^#?\/?$/.test(location.hash)) window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) { /* senza rete: restano quelle salvate */ }
  }

  const day = (t) => { try { return new Date(t).toLocaleDateString(window.LANG === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };

  // riquadro in Home: solo se c'è qualcosa da leggere
  function bannerHtml() {
    const n = unseen()[0];
    if (!n) return '';
    const more = unseen().length - 1;
    const img = safeUrl(n.image_url);
    return '<a class="card news-banner" href="#/novita">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" />' : '') +
      '<div><span class="news-new">' + T('Nuovo') + '</span><b>' + esc(n.title) + '</b>' +
      '<span class="small muted">' + (more > 0 ? T('e altre {n} novità', { n: more }) + ' · ' : '') + T('Leggi le novità di Equistasi ›') + '</span></div></a>';
  }

  // collegamento fisso (pagina Altro)
  const linkHtml = () => '<div class="card"><h3>' + T('Novità di Equistasi') + '</h3><p class="small">' + T('Notizie, eventi e consigli dal team Equistasi.') +
    '</p><a class="btn" href="#/novita">' + T('Apri le novità') + (unseen().length ? ' <span class="news-new">' + unseen().length + '</span>' : '') + '</a></div>';

  function itemHtml(n, isNew) {
    const img = safeUrl(n.image_url); const link = safeUrl(n.link_url);
    return '<article class="card news-item">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" />' : '') +
      '<div class="small muted">' + (isNew ? '<span class="news-new">' + T('Nuovo') + '</span> ' : '') + esc(day(n.publish_at)) + '</div>' +
      '<h3>' + esc(n.title) + '</h3>' + (n.body ? '<p class="news-body">' + esc(n.body) + '</p>' : '') +
      (link ? '<a class="btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(n.link_label || T('Scopri di più')) + ' ›</a>' : '') + '</article>';
  }

  function render(app) {
    const s = seen(); const items = list();
    app.innerHTML = '<div class="detail-head"><div class="eyebrow">Equistasi</div><h1>' + T('Novità') + '</h1></div>' +
      (items.length ? '<div class="news-list">' + items.map((n) => itemHtml(n, !s.includes(n.id))).join('') + '</div>'
        : '<div class="card"><p class="small" style="margin:0">' + T('Per ora non ci sono novità. Torna a trovarci presto!') + '</p></div>');
    markSeen();
    refresh(true).then(() => { if (location.hash.indexOf('novita') >= 0 && list().length !== items.length) render(app); });
  }

  setTimeout(() => refresh(false), 2500);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(false); });

  window.EqNews = { bannerHtml, linkHtml, render, refresh };
})();
