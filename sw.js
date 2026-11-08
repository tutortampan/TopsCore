const CACHE_NAME = 'topscore-cache-option-a-v90';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './admin.html',
  './dashboard.html',
  './test.html',
  './result.html',
  './offline.html',
  './css/style.css?v=20261108_v162',
  './css/admin.css?v=20261108_v162',
  './css/dashboard.css?v=20261108_v162',
  './css/auth.css?v=20261028',
  './css/test.css?v=20261028',
  './css/result.css?v=20261108_v162',
  './css/components/avatars.css?v=20261028',
  './js/app.js?v=20261029',
  './js/api.js?v=20261108_v162',
  './js/auth.js?v=20261108_v162',
  './js/dashboard.js?v=20261108_v162',
  './js/test.js?v=20261028',
  './js/result.js?v=20261108_v162',
  './js/session.js?v=20261108_v162',
  './js/supabase.js?v=20261028',
  './js/grading.js?v=20261028',
  './js/admin/admin-init.js?v=20261029',
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
  // Bypass third-party origins (Google Fonts, CDNs) so browser loads them natively via <link> without Service Worker connect-src CSP restrictions
  if (url.origin !== self.location.origin) return;

  const isDoc = event.request.destination === 'document' || url.pathname.endsWith('.html');
  const isScriptOrDoc = isDoc ||
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css');

  if (isScriptOrDoc) {
    // Network-first for scripts and documents so bug fixes and updates propagate immediately
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic' && event.request.url.startsWith('http')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // If document navigation fails while completely offline, serve offline fallback
        if (isDoc) {
          const offlineResp = await caches.match('./offline.html');
          if (offlineResp) return offlineResp;
        }
        return new Response('', { status: 408, statusText: 'Network Failed or Offline' });
      })
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
      return new Response('', { status: 404, statusText: 'Not Found' });
    })
  );
});
