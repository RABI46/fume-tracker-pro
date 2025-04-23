const CACHE_NAME = 'fume-tracker-pro-cache-v2'; // Mise à jour du nom du cache
const urlsToCache = [
  './',
  './index.html',
  './style.css', // Assurez-vous que le chemin vers votre CSS est correct
  './script.js', // Assurez-vous que le chemin vers votre JS est correct
  './manifest.json',
  './icons/icon-192x192.png', // Assurez-vous que les chemins vers vos icônes sont corrects
  './icons/icon-512x512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache ouvert!');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', function(event) {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
