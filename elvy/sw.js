// Elvy: cache per l'uso offline. Aumenta VERSION a ogni rilascio.
const VERSION = 'elvy-v20';
const FILES = [
  './', 'index.html', 'css/elvy.css', 'css/pair.css', 'js/analysis.js', 'js/sim.js', 'js/native.js', 'js/pain.js', '../js/data.js', 'js/sensors.js', 'js/app.js', 'js/gate.js', 'js/video.js', 'js/exercise.js', 'js/report.js', '../js/config.js', '../js/scan.js', '../js/pair.js', 'manifest.webmanifest',
  'img/icon-elvy-192.png', 'img/icon-elvy-512.png', 'img/apple-touch-icon.png', 'img/favicon-32.png', 'img/logo-elvy.png', 'img/logo-equistasi.png', 'img/mascotte.jpg', 'img/pollice.jpg', 'img/punta.jpg', 'img/salta.jpg', 'img/logo-e.png', 'img/mappa-sport.png', 'img/elvy-sul-cerotto.jpg', 'img/elvy-cerotto.jpg', 'img/elvy-premi.jpg', 'img/mascotte-report.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('elvy-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Rete prima, cache come riserva
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { if (r.ok && new URL(e.request.url).origin === location.origin) { const c = r.clone(); caches.open(VERSION).then((x) => x.put(e.request, c)); } return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
