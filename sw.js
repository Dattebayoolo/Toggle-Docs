/* Toggle Docs — offline service worker (only active when served over http/localhost) */
const CACHE = 'toggle-docs-v13';
const ASSETS = [
  './',
  './index.html',
  './landing.html',
  './css/tokens.css',
  './css/base.css',
  './css/dashboard.css',
  './css/editor.css',
  './css/overlays.css',
  './manifest.json',
  './icons/icon.svg',
  './js/db.js',
  './js/urdu.js',
  './js/editor.js',
  './js/state.js',
  './js/documents.js',
  './js/dashboard.js',
  './js/editor-events.js',
  './js/settings.js',
  './js/collab.js',
  './js/app.js',
  './js/command-palette.js',
  './js/find-replace.js',
  './js/tables.js'
];


self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        const copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        return res;
      }).catch(function () {
        return caches.match('./index.html');
      });
    })
  );
});







