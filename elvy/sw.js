// Elvy: cache per l'uso offline. Aumenta VERSION a ogni rilascio.
const VERSION = 'elvy-v2';
const FILES = [
  './', 'index.html', 'css/elvy.css', 'js/analysis.js', 'js/sim.js', 'js/sensors.js', 'js/app.js', 'js/gate.js', '../js/config.js', '../js/scan.js', 'manifest.webmanifest',
  'img/icon-192.png', 'img/icon-512.png', 'img/wordmark.png', 'img/mascotte.jpg', 'img/pollice.jpg', 'img/punta.jpg', 'img/salta.jpg', 'img/logo-e.png',
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
