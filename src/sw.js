const CACHE_NAME = 'todomemo-v1';
const ASSETS = [
  './',
  './index.html',
  './calendar.html',
  './policy_viewer.html',
  './styles.css',
  './calendar.css',
  './policy_viewer.css',
  './renderer.js',
  './calendar-renderer.js',
  './policy_viewer.js',
  './modules/taskRepository.js',
  './modules/calendarService.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => cachedResponse);
    })
  );
});
