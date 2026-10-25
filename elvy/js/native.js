/* Funzioni native dell'app Elvy per iPhone e Android (Capacitor, cartella mobile-elvy).
   Nella web app non fa nulla: window.ElvyNative resta indefinito. */
(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  const P = C.Plugins || {};
  document.documentElement.classList.add('native');

  // Barra di stato con testo chiaro sullo sfondo scuro di Elvy
  if (P.StatusBar) {
    P.StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
    if (C.getPlatform() === 'android') P.StatusBar.setBackgroundColor({ color: '#424244' }).catch(() => {});
  }
  window.addEventListener('load', () => { if (P.SplashScreen) P.SplashScreen.hide().catch(() => {}); });

  // Tasto indietro di Android: chiude il foglio aperto, poi torna indietro; da Oggi esce
  if (P.App) {
    P.App.addListener('backButton', () => {
      const sheet = document.getElementById('sheet');
      if (sheet && !sheet.hidden) { sheet.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
      const h = location.hash.replace(/^#\/?/, '');
      if (h && h !== 'oggi') history.back(); else P.App.exitApp();
    });
  }

  // Link esterni nel browser interno, senza lasciare l'app
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!/^https?:\/\//i.test(href) || new URL(href).origin === location.origin) return;
    ev.preventDefault();
    if (P.Browser) P.Browser.open({ url: href, toolbarColor: '#424244' }).catch(() => { window.location.href = href; });
  }, true);

  // Bluetooth nativo (plugin bluetooth-le): fasce cardio e orologi con il servizio battito standard,
  // anche su iPhone, dove il browser non ha il Bluetooth. Stessa interfaccia usata da ElvySensors.heart.
  const B = P.BluetoothLe;
  const HR = '0000180d-0000-1000-8000-00805f9b34fb';
  const HRM = '00002a37-0000-1000-8000-00805f9b34fb';
  const toView = (v) => {
    if (typeof v !== 'string') return v;
    const b = (v.replace(/[^0-9a-f]/gi, '').match(/../g) || []).map((h) => parseInt(h, 16));
    return new DataView(new Uint8Array(b).buffer);
  };
  const err = (name, message) => { const e = new Error(message); e.name = name; return e; };
  const ble = B && {
    async connect(onValue, onLost) {
      await B.initialize({ androidNeverForLocation: true });
      const en = await B.isEnabled().catch(() => ({ value: true }));
      if (en && en.value === false) throw err('NetworkError', 'Bluetooth spento');
      let dev;
      try { dev = await B.requestDevice({ services: [HR] }); } catch (e) {
        const m = String((e && e.message) || e);
        throw /cancel/i.test(m) ? err('NotFoundError', 'cancelled') : /enabled|powered|off/i.test(m) ? err('NetworkError', 'Bluetooth spento') : e;
      }
      await B.addListener('disconnected|' + dev.deviceId, () => onLost());
      await B.connect({ deviceId: dev.deviceId });
      await B.addListener('notification|' + dev.deviceId + '|' + HR + '|' + HRM, (ev) => { if (ev && ev.value) onValue(toView(ev.value)); });
      await B.startNotifications({ deviceId: dev.deviceId, service: HR, characteristic: HRM });
      return { id: dev.deviceId, name: dev.name };
    },
    disconnect(id) { return B.disconnect({ deviceId: id }).catch(() => {}); },
  };

  // PDF del report: file temporaneo e foglio di condivisione (da lì anche «Salva su File»)
  const toBase64 = (blob) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(blob); });
  async function sharePdf(blob, name) {
    if (!P.Filesystem || !P.Share) return false;
    const w = await P.Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: 'CACHE' });
    await P.Share.share({ title: 'Report Elvy', text: 'Il mio report di allenamento Elvy', url: w.uri, dialogTitle: 'Condividi o salva il report' });
    return true;
  }

  window.ElvyNative = { platform: C.getPlatform(), ble, sharePdf };
})();
