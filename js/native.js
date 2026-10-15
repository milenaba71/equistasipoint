/* Funzioni native dell'app per iPhone/Android (Capacitor). Nella web app non fa nulla. */
(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const P = C.Plugins || {};
  document.documentElement.classList.add('native');

  // Barra di stato chiara, come l'intestazione dell'app
  if (P.StatusBar) {
    P.StatusBar.setStyle({ style: 'LIGHT' }).catch(() => {});
    if (C.getPlatform() === 'android') P.StatusBar.setBackgroundColor({ color: '#FFFFFF' }).catch(() => {});
  }
  // Nasconde la schermata d'avvio quando l'app è pronta
  window.addEventListener('load', () => { if (P.SplashScreen) P.SplashScreen.hide().catch(() => {}); });

  // Tasto indietro di Android: chiude finestre aperte, poi torna indietro, in home esce
  if (P.App) {
    P.App.addListener('backButton', () => {
      const zoom = document.querySelector('.zoom-ov');
      if (zoom) { zoom.remove(); return; }
      const modal = [...document.querySelectorAll('.modal')].find((m) => !m.hidden);
      if (modal) { modal.hidden = true; return; }
      const onboard = document.getElementById('onboard');
      const cancel = document.getElementById('ob-cancel');
      if (onboard && !onboard.hidden && cancel && !cancel.hidden) { cancel.click(); return; }
      const h = location.hash.replace(/^#\/?/, '');
      if (h) history.back(); else P.App.exitApp();
    });
  }

  // Link esterni (privacy, PDF a parte, siti) nel browser interno, senza lasciare l'app
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!/^https?:\/\//i.test(href)) return;
    if (new URL(href).origin === location.origin) return;
    ev.preventDefault();
    if (P.Browser) P.Browser.open({ url: href, toolbarColor: '#29235C' }).catch(() => { window.location.href = href; });
  }, true);
})();
