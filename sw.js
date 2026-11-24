const CACHE_NAME = 'topscore-cache-option-a-v227';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './test.html',
  './result.html',
  './offline.html',
  './tutor.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg',
  './css/style.css?v=20261119_v631',
  './css/dashboard.css?v=20261119_v631',
  './css/auth.css?v=20261028',
  './css/test.css?v=20261121_v555',
  './css/result.css?v=20261119_v631',
  './css/tutor.css?v=20261123_v50',
  './css/components/avatars.css?v=20261028',
  './js/app.js?v=20261029',
  './js/api.js?v=20261124_v642',
  './js/auth.js?v=20261108_v162',
  './js/dashboard.js?v=20261124_v672',
  './js/tutor.js?v=20261123_v50',
  './js/test.js?v=20261124_v562',
  './js/result.js?v=20261119_v631',
  './js/session.js?v=20261108_v162',
  './js/supabase.js?v=20261121_v161',
  './js/indonesia-regions.js?v=20261117_v547',
  './js/grading.js?v=20261115_v545',
  './js/vendor/supabase.js',
  './js/vendor/xlsx.full.min.js?v=20261027d',
  './js/vendor/html2pdf.bundle.min.js?v=20261119_v1',
  './js/wake-lock.js?v=20261027d',
  './js/pwa.js?v=20261116_v548'
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
    }).then(() => {
      return self.clients.claim().catch(() => {});
    })
  );
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

  // Bypass Service Worker entirely for Admin & Tutor console to ensure zero-stale cache
  if (url.pathname.includes('admin') || url.pathname.includes('/admin/') || url.pathname.includes('tutor')) return;

  const isDoc = event.request.destination === 'document' || url.pathname.endsWith('.html');
  const isScript = event.request.destination === 'script' || url.pathname.endsWith('.js');
  const isStyle = event.request.destination === 'style' || url.pathname.endsWith('.css');
  const isVersionedStatic = (isScript || isStyle) && url.search.includes('v=');

  if (isVersionedStatic) {
    // Cache-first for versioned JS and CSS assets (?v=...)
    // Versioned assets are immutable for that specific version tag, enabling instant zero-network page hydration
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic' && event.request.url.startsWith('http')) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        });
      }).catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        return new Response('', { status: 408, statusText: 'Network Failed or Offline' });
      })
    );
    return;
  }

  const isScriptOrDoc = isDoc || isScript || isStyle;

  if (isScriptOrDoc) {
    // Network-first for unversioned scripts, unversioned styles, and documents so bug fixes and updates propagate immediately
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
