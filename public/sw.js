const CACHE_NAME = 'mip-v1';
const STATIC_ASSETS = [
  '/',
  '/css/style.css',
  '/js/app.js',
  '/js/questions.js',
  '/manifest.json',
  '/media/logo/Icon256x256.png',
  '/media/logo/Icon1024x1024.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Never cache API or socket calls
  if (e.request.url.includes('/api/') || e.request.url.includes('/socket.io/')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('/')))
  );
});
