/*
 * Lingua dell'app: italiano (originale) o inglese.
 * - Si sceglie in automatico dalla lingua del telefono (italiano → it, tutto il resto → en)
 *   e si può cambiare a mano (onboarding e pagina Info): la scelta resta in localStorage "tp-lang".
 * - I testi restano scritti in italiano nel codice: T('testo italiano') restituisce la traduzione
 *   inglese presa da window.I18N_EN (file js/en-*.js), oppure il testo italiano se manca.
 * - I contenuti dei dati (muscoli, protocolli, privacy…) sono tradotti in js/data-en.js.
 */
(function () {
  let saved = null;
  try { saved = localStorage.getItem('tp-lang'); } catch (e) { /* storage non disponibile */ }
  const auto = /^it\b/i.test((navigator.languages && navigator.languages[0]) || navigator.language || 'it') ? 'it' : 'en';
  window.LANG = saved === 'it' || saved === 'en' ? saved : auto;
  document.documentElement.lang = window.LANG;
  window.I18N_EN = window.I18N_EN || {};
  // T('Ciao {nome}', { nome: 'Milena' }) → traduzione con segnaposto
  window.T = function (s, vars) {
    let out = window.LANG === 'en' && Object.prototype.hasOwnProperty.call(window.I18N_EN, s) ? window.I18N_EN[s] : s;
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return out;
  };
  // Testi fissi di index.html: elementi con data-t (contenuto) e attributi aria-label, placeholder, alt, title
  window.translateStatic = function (root) {
    if (window.LANG !== 'en') return;
    (root || document).querySelectorAll('[data-t]').forEach((el) => {
      const key = el.innerHTML.trim().replace(/\s+/g, ' ');
      const tr = window.T(key);
      if (tr !== key) el.innerHTML = tr;
    });
    (root || document).querySelectorAll('[aria-label],[placeholder],[alt],[title]').forEach((el) => {
      ['aria-label', 'placeholder', 'alt', 'title'].forEach((a) => {
        const v = el.getAttribute(a);
        if (v) { const tr = window.T(v); if (tr !== v) el.setAttribute(a, tr); }
      });
    });
    if (document.title) document.title = window.T(document.title);
  };
  document.addEventListener('DOMContentLoaded', () => {
    window.translateStatic();
    document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === window.LANG)));
  });
  // Pulsanti «Italiano / English» (schermate iniziali e pagina Info)
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-lang]');
    if (b && b.dataset.lang !== window.LANG) { ev.preventDefault(); window.setLang(b.dataset.lang); }
  });
  window.setLang = function (lang) {
    try { localStorage.setItem('tp-lang', lang); } catch (e) { /* storage non disponibile */ }
    location.reload();
  };
})();
