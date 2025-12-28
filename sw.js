const CACHE_NAME = 'liste-courses-v1';
const STATIC_ASSETS = [
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* --- INSTALL --- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* --- ACTIVATE --- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

/* --- FETCH --- */
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
      .catch(() => {
        // fallback pour les pages HTML
        if (event.request.destination === 'document') return caches.match('./index.html');
      })
  );
});

/* --- MESSAGE --- */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
