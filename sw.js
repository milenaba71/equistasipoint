// Cache per l'uso offline. Aumenta VERSION a ogni rilascio.
const VERSION = 'tp-v72';
const FILES = [
  './', 'index.html', 'css/style.css', 'js/config.js', 'js/i18n.js', 'js/en-app.js', 'js/en-modules.js', 'js/body.js', 'js/data.js', 'js/data-en.js', 'js/app.js', 'js/timer.js', 'js/tests.js', 'js/metameri.js', 'js/postura.js', 'js/en-postura.js', 'js/scan.js', 'js/native.js',
  'img/logo.png', 'img/dispositivo.jpg', 'img/icon-192.png', 'img/icon-512.png', 'manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete prima, cache come riserva: gli aggiornamenti arrivano subito quando si è online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // la verifica del seriale (webhook Make) non va mai in cache
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    // no-cache: chiede sempre al server se il file è cambiato (risposta 304 leggera se non è cambiato)
    fetch(e.request, { cache: 'no-cache' })
      .then((r) => {
        if (r.ok) {
          const copy = r.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
