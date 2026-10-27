const CACHE_NAME = 'topscore-cache-option-a-v10';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './dashboard.html',
  './test.html',
  './result.html',
  './css/style.css?v=20261027d',
  './css/admin.css?v=20261027d',
  './css/dashboard.css?v=20261027d',
  './css/auth.css?v=20261027d',
  './css/test.css?v=20261027d',
  './css/result.css?v=20261027d',
  './css/components/avatars.css?v=20261027d',
  './js/app.js?v=20261027d',
  './js/api.js?v=20261027d',
  './js/auth.js?v=20261027d',
  './js/dashboard.js?v=20261027d',
  './js/test.js?v=20261027d',
  './js/result.js?v=20261027d',
  './js/session.js?v=20261027d',
  './js/supabase.js?v=20261027d',
  './js/grading.js?v=20261027d',
  './js/vendor/supabase.js',
  './js/vendor/xlsx.full.min.js?v=20261027d',
  './js/wake-lock.js?v=20261027d'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http://') && !event.request.url.startsWith('https://')) {
    return; // Bypass chrome-extension:// and other non-HTTP schemes
  }
  // Skip caching API/Supabase calls
  if (event.request.url.includes('supabase.co')) return;

  const url = new URL(event.request.url);
  const isScriptOrDoc = event.request.destination === 'script' || 
                        event.request.destination === 'document' || 
                        event.request.destination === 'style' ||
                        url.pathname.endsWith('.js') || 
                        url.pathname.endsWith('.css') || 
                        url.pathname.endsWith('.html');

  if (isScriptOrDoc) {
    // Network-first for scripts and documents so bug fixes and updates propagate immediately
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic' && event.request.url.startsWith('http')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for other static assets (images, fonts, static css)
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    }).catch(() => {
      // Fallback
    })
  );
});
